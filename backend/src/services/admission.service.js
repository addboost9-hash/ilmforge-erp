/**
 * IlmForge — student admission.
 *
 * One function admits a student, whether the request came from the admission
 * wizard or from a row in an Excel import. Keeping a single path means an
 * imported student is indistinguishable from a hand-admitted one: same roll
 * number scheme, same student and parent portal accounts, same sibling
 * linking by phone, same audit entry.
 *
 * Moved out of routes/student.routes.js unchanged in behaviour, except for
 * two fixes noted inline (roll number collisions and the existing-parent flag).
 */
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const phoneUtil = require('../utils/phone');
const { checkPhoto } = require('../utils/photo');

const genPassword = (len = 8) => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);

/* ── Roll number ──────────────────────────────────────────────────────────
   Format: <class><section>-<yy>-<seq>, e.g. C5A-26-001, KGA-26-003.

   FIX: the sequence used to be "students in this class + 1". After any
   deletion that number is already taken, so the next admission silently
   duplicated a roll number - and an import of many rows hit it repeatedly.
   The sequence now starts there and steps forward until it is free. */
async function generateRollNo(schoolId, classId, sectionId, client = prisma) {
  const cls = classId ? await client.class.findUnique({ where: { id: parseInt(classId) } }) : null;
  const sec = sectionId ? await client.section.findUnique({ where: { id: parseInt(sectionId) } }) : null;

  let prefix = 'STU';
  if (cls) {
    const n = cls.name.toUpperCase();
    if (n.includes('NURSERY')) prefix = 'NUR';
    else if (n.includes('KG')) prefix = 'KG';
    else if (n.includes('CLASS')) prefix = 'C' + n.replace(/[^0-9]/g, '');
    else prefix = n.replace(/\s+/g, '').slice(0, 3);
  }
  prefix += sec ? sec.name.toUpperCase().charAt(0) : '';

  const yr = new Date().getFullYear().toString().slice(-2);
  const count = await client.student.count({
    where: { schoolId, ...(classId && { classId: parseInt(classId) }), ...(sectionId && { sectionId: parseInt(sectionId) }) },
  });

  for (let seq = count + 1; seq < count + 1000; seq++) {
    const candidate = `${prefix}-${yr}-${String(seq).padStart(3, '0')}`;
    const taken = await client.student.findFirst({ where: { schoolId, rollNo: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  // 1,000 consecutive collisions means something else is wrong; fall back to
  // a unique suffix rather than refusing the admission.
  return `${prefix}-${yr}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

/** First campus of the school, creating "Main Campus" if it has none. */
async function resolveCampus(schoolId, campusId) {
  if (campusId) return parseInt(campusId);
  const existing = await prisma.campus.findFirst({
    where: { schoolId }, orderBy: [{ isMain: 'desc' }, { id: 'asc' }], select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.campus.create({ data: { schoolId, name: 'Main Campus', isMain: true } });
  return created.id;
}

/**
 * Admit one student.
 *
 * @param {object} ctx
 * @param {number} ctx.schoolId
 * @param {number} [ctx.campusId]
 * @param {number} ctx.actorUserId   who performed it, for the audit log
 * @param {object} [ctx.school]      pass when admitting many, to skip a lookup per row
 * @param {string} [ctx.auditAction] defaults to STUDENT_ADMITTED
 * @param {object} input             the same body the wizard posts
 * @returns {{ student, invoice, credentials, parentReused }}
 */
async function admitStudent(ctx, input) {
  const { schoolId, actorUserId } = ctx;
  const {
    name, lastName, fatherName, motherName, gender, dob, classId, sectionId, sessionId,
    rollNo, address, bFormNo, emergencyPhone,
    parentEmail, parentCnic, teacherId,
    createPortalAccounts = true,
    generateFirstInvoice = false,
    monthlyFee,
    familyNo, firstNameUrdu, lastNameUrdu, fatherNameUrdu,
    fatherCnic, fatherQualification, fatherOccupation,
    motherCnic, motherQualification, motherOccupation, motherPhone,
    caste, nationality, religion, province, city, postalAddress, email,
    admissionTestMarks, bloodGroup, foodDietaryReq, allergies, childCondition,
    prevSchoolName, prevSchoolFocalPerson, prevSchoolPhone, prevSchoolAddress,
    prevAdmissionNo, prevGrade, prevTestGrade,
    admissionDate, status, photoUrl,
  } = input;

  if (!name) {
    const e = new Error('Student name is required.');
    e.status = 400;
    throw e;
  }

  // The wizard has always sent the camera photo as photoUrl, but it was never
  // saved: every student admitted with a photo ended up without one.
  const photo = photoUrl !== undefined ? checkPhoto(photoUrl) : { value: null };
  if (photo.error) {
    const e = new Error(photo.error);
    e.status = 400;
    throw e;
  }

  const finalRollNo = rollNo && String(rollNo).trim()
    ? String(rollNo).trim()
    : await generateRollNo(schoolId, classId, sectionId);

  const school = ctx.school || await prisma.school.findUnique({ where: { id: schoolId } });
  const slug = school?.slug || 'school';

  // Parent password: last 5 digits of the phone + 123, memorable for parents.
  const parentPassword = emergencyPhone
    ? String(emergencyPhone).replace(/[^0-9]/g, '').slice(-5) + '123'
    : genPassword();
  const studentPassword = finalRollNo.replace(/[^a-zA-Z0-9]/g, '') + '123';

  const uniq = Date.now().toString(36).slice(-4);
  const studentEmail = `${slugify(name)}.${finalRollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@${slug}.student`;
  const existingStudentEmail = await prisma.user.findFirst({ where: { schoolId, email: studentEmail } });
  const safeStudentEmail = existingStudentEmail
    ? `${slugify(name)}.${finalRollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}.${uniq}@${slug}.student`
    : studentEmail;

  const normalizedPhone = String(emergencyPhone || '').replace(/\D/g, '').slice(-10);
  const finalParentEmail = (parentEmail && String(parentEmail).trim())
    ? String(parentEmail).trim().toLowerCase()
    : normalizedPhone
      ? `${slugify(fatherName || 'parent')}.${normalizedPhone}@${slug}.parent`
      : `${slugify(fatherName || 'parent')}.${finalRollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@${slug}.parent`;

  const existingParentByEmail = finalParentEmail
    ? await prisma.user.findFirst({ where: { schoolId, email: finalParentEmail, role: 'parent', deletedAt: null } })
    : null;

  const resolvedCampusId = await resolveCampus(schoolId, ctx.campusId || input.campusId);

  // bcrypt outside the transaction: ~200ms each, and inside it timed out.
  const [studentPasswordHash, parentPasswordHash] = await Promise.all([
    bcrypt.hash(studentPassword, 10),
    bcrypt.hash(parentPassword, 10),
  ]);

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        schoolId,
        campusId: resolvedCampusId,
        name, lastName: lastName || null,
        fatherName, motherName, gender,
        dob: dob ? new Date(dob) : null,
        classId: classId ? parseInt(classId) : null,
        sectionId: sectionId ? parseInt(sectionId) : null,
        sessionId: sessionId ? parseInt(sessionId) : null,
        rollNo: finalRollNo,
        address, bFormNo, emergencyPhone,
        photoUrl: photo.value,
        // A migrated or back-dated student keeps their real admission date
        // and status; a new admission takes today and "active".
        ...(admissionDate && !Number.isNaN(new Date(admissionDate).getTime())
          ? { admissionDate: new Date(admissionDate) } : {}),
        ...(['active', 'inactive', 'passout'].includes(status) ? { status } : {}),
        familyNo: familyNo || null,
        firstNameUrdu: firstNameUrdu || null,
        lastNameUrdu: lastNameUrdu || null,
        fatherNameUrdu: fatherNameUrdu || null,
        fatherCnic: fatherCnic || null,
        fatherQualification: fatherQualification || null,
        fatherOccupation: fatherOccupation || null,
        motherCnic: motherCnic || null,
        motherQualification: motherQualification || null,
        motherOccupation: motherOccupation || null,
        motherPhone: motherPhone || null,
        caste: caste || null,
        nationality: nationality || null,
        religion: religion || null,
        province: province || null,
        city: city || null,
        postalAddress: postalAddress || null,
        email: email || null,
        admissionTestMarks: admissionTestMarks != null && admissionTestMarks !== '' ? parseFloat(admissionTestMarks) : null,
        bloodGroup: bloodGroup || null,
        foodDietaryReq: foodDietaryReq || null,
        allergies: allergies || null,
        childCondition: childCondition || null,
        prevSchoolName: prevSchoolName || null,
        prevSchoolFocalPerson: prevSchoolFocalPerson || null,
        prevSchoolPhone: prevSchoolPhone || null,
        prevSchoolAddress: prevSchoolAddress || null,
        prevAdmissionNo: prevAdmissionNo || null,
        prevGrade: prevGrade || null,
        prevTestGrade: prevTestGrade || null,
      },
      include: { class: true, section: true },
    });

    let studentUser = null, parentUser = null, parentRec = null;
    // FIX: this used to be computed afterwards as `!parentRec && parentUser`,
    // which is always false because the sibling branch always sets parentRec.
    // A reused parent was then shown a newly generated password that had
    // never been saved. Track the reuse where it happens instead.
    let parentReused = false;

    if (createPortalAccounts) {
      studentUser = await tx.user.create({
        data: {
          schoolId, campusId: student.campusId,
          name, email: safeStudentEmail,
          phone: null,
          role: 'student',
          passwordHash: studentPasswordHash,
          phoneVerifiedAt: new Date(),
          mustChangePassword: false,
        },
      });
      await tx.student.update({ where: { id: student.id }, data: { userId: studentUser.id } });

      const existingParentUser = emergencyPhone
        ? await tx.user.findFirst({
            where: {
              schoolId, role: 'parent', deletedAt: null,
              OR: [
                // Every format this number may already be stored as, so a
                // sibling entered as 0348... finds a parent saved as +92348...
                ...phoneUtil.variants(emergencyPhone).map((v) => ({ phone: v })),
                ...(finalParentEmail ? [{ email: finalParentEmail }] : []),
              ],
            },
          })
        : existingParentByEmail;

      if (existingParentUser) {
        parentReused = true;
        parentUser = existingParentUser;
        parentRec = await tx.parent.findFirst({ where: { schoolId, userId: parentUser.id } });
        if (!parentRec) {
          parentRec = await tx.parent.create({
            data: { schoolId, userId: parentUser.id, cnic: parentCnic || null, address: address || null },
          });
        }
      } else {
        parentUser = await tx.user.create({
          data: {
            schoolId, campusId: student.campusId,
            name: fatherName || `Parent of ${name}`,
            email: finalParentEmail,
            phone: phoneUtil.canonical(emergencyPhone) || emergencyPhone || null,
            role: 'parent',
            passwordHash: parentPasswordHash,
            phoneVerifiedAt: new Date(),
            mustChangePassword: false,
          },
        });
        parentRec = await tx.parent.create({
          data: { schoolId, userId: parentUser.id, cnic: parentCnic || null, address: address || null },
        });
      }

      if (parentRec) {
        await tx.parentStudent.upsert({
          where: { parentId_studentId: { parentId: parentRec.id, studentId: student.id } },
          update: {},
          create: { schoolId, parentId: parentRec.id, studentId: student.id },
        });
      }
    }

    let invoice = null;
    if (generateFirstInvoice) {
      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const amount = parseInt(monthlyFee) || 0;
      if (amount > 0) {
        const vNo = `ADM-${String(student.id).padStart(4, '0')}-${now.getFullYear()}`;
        invoice = await tx.feeInvoice.create({
          data: {
            schoolId, campusId: student.campusId, studentId: student.id,
            classId: student.classId,
            feeTitle: `Monthly Fee Of ${monthName}`,
            month: monthName, year: now.getFullYear(),
            totalAmount: amount, paidAmount: 0, dueAmount: amount,
            status: 'unpaid', voucherNo: vNo,
            dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
          },
        }).catch(() => null);
      }
    }

    if (teacherId && classId) {
      const cls = await tx.class.findUnique({ where: { id: parseInt(classId) }, select: { classTeacherId: true } });
      if (cls && !cls.classTeacherId) {
        await tx.class.update({ where: { id: parseInt(classId) }, data: { classTeacherId: parseInt(teacherId) } }).catch(() => null);
      }
    }

    await tx.auditLog.create({
      data: {
        schoolId, userId: actorUserId,
        action: ctx.auditAction || 'STUDENT_ADMITTED',
        resource: 'student', resourceId: student.id,
        details: JSON.stringify({ name, rollNo: finalRollNo, portalAccounts: createPortalAccounts }),
      },
    }).catch(() => null);

    return { student, parentUser, invoice, parentReused };
  }, { timeout: 30000, maxWait: 35000 });

  /* ── Credentials for the slip / the import results sheet ─────────── */
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const linkFor = (role) => `${FRONTEND_URL}/login?slug=${slug}&role=${role}`;
  const parentLoginPhone = phoneUtil.canonical(emergencyPhone);

  const credentials = createPortalAccounts ? {
    portalLink: `${FRONTEND_URL}/login?slug=${slug}`,
    student: {
      loginId: finalRollNo,
      loginIdLabel: 'Roll number',
      email: safeStudentEmail,
      password: studentPassword,
      portal: 'Student Portal',
      portalLink: linkFor('student'),
      passwordHint: `Roll number + 123 (e.g. ${finalRollNo.replace(/[^a-zA-Z0-9]/g, '')}123)`,
    },
    parent: result.parentReused
      ? {
          loginId: parentLoginPhone || result.parentUser.phone || result.parentUser.email,
          loginIdLabel: parentLoginPhone ? 'Phone number' : 'Email',
          email: result.parentUser.email,
          password: '(existing account — same as sibling)',
          portal: 'Parent Portal',
          portalLink: linkFor('parent'),
          existing: true,
        }
      : {
          loginId: parentLoginPhone || finalParentEmail,
          loginIdLabel: parentLoginPhone ? 'Phone number' : 'Email',
          email: result.parentUser?.email || finalParentEmail,
          password: parentPassword,
          portal: 'Parent Portal',
          portalLink: linkFor('parent'),
          passwordHint: emergencyPhone
            ? `Last 5 digits of phone + 123 (e.g. ${String(emergencyPhone).replace(/[^0-9]/g, '').slice(-5)}123)`
            : null,
        },
  } : null;

  return { student: result.student, invoice: result.invoice, credentials, parentReused: result.parentReused };
}

module.exports = { admitStudent, generateRollNo, resolveCampus, genPassword, slugify };
