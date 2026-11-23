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
const { pastDate } = require('../utils/pastDate');
const { MONTHS_FULL } = require('../utils/feeMonth');

const genPassword = (len = 8) => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const { randomInt } = require('crypto');
  return Array.from({ length: len }, () => chars[randomInt(chars.length)]).join('');
};
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);

/* ── Roll number ──────────────────────────────────────────────────────────
   Format: <class><section>-<yy>-<seq>, e.g. C5A-26-001, KGA-26-003.

   FIX: the sequence used to be "students in this class + 1". After any
   deletion that number is already taken, so the next admission silently
   duplicated a roll number - and an import of many rows hit it repeatedly.
   The sequence now starts there and steps forward until it is free. */
async function generateRollNo(schoolId, classId, sectionId, client = prisma) {
  // This school's class and section only (another school's id named the prefix).
  const cls = classId ? await client.class.findFirst({ where: { id: parseInt(classId), schoolId } }) : null;
  const sec = sectionId ? await client.section.findFirst({ where: { id: parseInt(sectionId), class: { schoolId } } }) : null;

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

/* What a roll number may be (the same rule as changing one on the Roll
   Numbers page): it is also the student's code on the ID card, at the
   kiosk and the fee scanner, and to sign in. */
const ROLL_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,29}$/;
const ROLL_RULE = 'Use letters, digits and - / _ . (up to 30, no spaces).';

/* A typed roll number nobody else in the school has, whatever the capitals
   (compared here so SQLite and PostgreSQL agree). Admission used to save any
   text, so two students could share one: the kiosk, the fee scanner and the
   roll-number sign-in then picked either of them. */
async function rollNoTaken(schoolId, rollNo, client = prisma) {
  const want = String(rollNo).trim().toLowerCase();
  const rows = await client.student.findMany({
    where: { schoolId, deletedAt: null, rollNo: { not: null } },
    select: { name: true, rollNo: true, status: true, class: { select: { name: true } } },
  });
  return rows.find((r) => String(r.rollNo).trim().toLowerCase() === want) || null;
}

const badRequest = (message) => { const e = new Error(message); e.status = 400; return e; };

/* The class, section, session and class teacher named on the form, checked
   against this school: ids from another school were saved as they came. */
async function checkPlacement(schoolId, { classId, sectionId, sessionId, teacherId }) {
  const cid = classId ? parseInt(classId) : null;
  const [cls, sec, ses, teacher] = await Promise.all([
    cid ? prisma.class.findFirst({ where: { id: cid, schoolId }, select: { id: true } }) : null,
    sectionId ? prisma.section.findFirst({ where: { id: parseInt(sectionId), class: { schoolId } }, select: { id: true, classId: true } }) : null,
    sessionId ? prisma.academicSession.findFirst({ where: { id: parseInt(sessionId), schoolId }, select: { id: true } }) : null,
    teacherId ? prisma.staff.findFirst({ where: { id: parseInt(teacherId), schoolId, deletedAt: null }, select: { id: true } }) : null,
  ]);
  if (cid && !cls) throw badRequest('This class is not in your school.');
  if (sectionId && (!sec || (cid && sec.classId !== cid))) throw badRequest('This section is not in the chosen class.');
  if (sessionId && !ses) throw badRequest('This session is not in your school.');
  if (teacherId && !teacher) throw badRequest('This teacher is not in your school.');
}

/* Admission test marks are optional, but what is typed must be a plain
   number from 0 to 1000: "abc" used to reach the database as NaN and fail
   the whole admission with a 500. Shared with editing a student record.
   Returns { value } (null when left empty) or { error }. */
const TEST_MARKS_ERROR = 'Admission test marks must be a number from 0 to 1000, or left empty.';
function testMarksValue(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { value: null };
  const text = String(raw).trim();
  // Digits with an optional decimal part only: Number() alone also takes
  // "0x10", "1e2" and "Infinity".
  if (!/^\d+(\.\d+)?$/.test(text) || Number(text) > 1000) return { error: TEST_MARKS_ERROR };
  return { value: Number(text) };
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
    admissionDate, status, photoUrl, isFreeStudent,
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

  // The admission date on the form: today means now, an earlier day is kept
  // on that day (midday Pakistan time), a future one is refused.
  let admittedOn = null;
  if (admissionDate instanceof Date) admittedOn = Number.isNaN(admissionDate.getTime()) ? null : admissionDate;
  else if (admissionDate && String(admissionDate).trim()) {
    const r = pastDate(admissionDate, { label: 'Admission date' });
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(admissionDate));
    if (!r.error) admittedOn = r.date;
    // Records of long-standing students (before 2000) from an import.
    else if (/too far/.test(r.error) && m) admittedOn = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 7));
    else { const e = new Error(r.error); e.status = 400; throw e; }
  }

  const testMarks = testMarksValue(admissionTestMarks);
  if (testMarks.error) {
    const e = new Error(testMarks.error);
    e.status = 400;
    throw e;
  }

  await checkPlacement(schoolId, { classId, sectionId, sessionId, teacherId });

  const typedRoll = rollNo && String(rollNo).trim() ? String(rollNo).trim() : '';
  if (typedRoll) {
    if (!ROLL_RE.test(typedRoll)) throw badRequest(`"${typedRoll}" cannot be a roll number. ${ROLL_RULE}`);
    const other = await rollNoTaken(schoolId, typedRoll);
    if (other) {
      const where = [other.class?.name, other.status !== 'active' && other.status].filter(Boolean).join(', ');
      throw badRequest(`Roll number ${typedRoll} already belongs to ${other.name}${where ? ` (${where})` : ''}.`);
    }
  }
  const finalRollNo = typedRoll || await generateRollNo(schoolId, classId, sectionId);

  const school = ctx.school || await prisma.school.findUnique({ where: { id: schoolId } });
  const slug = school?.slug || 'school';

  /* Random first passwords, shown once on the admission slip and changed at
     the first sign-in. They used to be "roll number + 123" and "last 5
     digits of the phone + 123": anyone who knew (or guessed, in order) a
     roll number could sign in as that student. */
  const parentPassword = genPassword();
  const studentPassword = genPassword();

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
        ...(admittedOn ? { admissionDate: admittedOn } : {}),
        ...(['active', 'inactive', 'passout'].includes(status) ? { status } : {}),
        // "Free student" was ticked on the admission form but never kept.
        isFreeStudent: isFreeStudent === true || isFreeStudent === 'true',
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
        admissionTestMarks: testMarks.value,
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
          mustChangePassword: true,
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
            mustChangePassword: true,
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
      // This month in Pakistan (the server's clock is UTC: for the first
      // five hours of a month it still said last month), its name in English
      // whatever the server's language.
      const pk = new Date(Date.now() + 5 * 3600e3);
      const mIdx = pk.getUTCMonth();
      const yr = pk.getUTCFullYear();
      const monthName = MONTHS_FULL[mIdx];
      const amount = parseInt(monthlyFee) || 0;
      if (amount > 0) {
        const vNo = `ADM-${String(student.id).padStart(4, '0')}-${yr}`;
        invoice = await tx.feeInvoice.create({
          data: {
            schoolId, campusId: student.campusId, studentId: student.id,
            classId: student.classId,
            feeTitle: `Monthly Fee Of ${monthName}`,
            month: String(mIdx + 1), year: yr,
            totalAmount: amount, paidAmount: 0, dueAmount: amount,
            status: 'unpaid', voucherNo: vNo,
            // The 10th, at midday in Pakistan (a day, wherever it is read).
            dueDate: new Date(Date.UTC(yr, mIdx, 10, 7)),
          },
        }).catch(() => null);
      }
    }

    if (teacherId && classId) {
      const cls = await tx.class.findFirst({ where: { id: parseInt(classId), schoolId }, select: { classTeacherId: true } });
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
      passwordHint: 'A new password is chosen at the first sign-in',
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
          passwordHint: 'A new password is chosen at the first sign-in',
        },
  } : null;

  return { student: result.student, invoice: result.invoice, credentials, parentReused: result.parentReused };
}

module.exports = { admitStudent, generateRollNo, resolveCampus, genPassword, slugify, testMarksValue, ROLL_RE, ROLL_RULE };
