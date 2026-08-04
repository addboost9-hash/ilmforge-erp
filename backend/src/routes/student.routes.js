const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { teacherCanAccessClass } = require('../utils/teacherScope');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/students
router.get('/', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, status = 'active', search, page = 1, limit = 25 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // ── ROLE-BASED ACCESS CONTROL ─────────────────────────────────────────
  let parentStudentIds = null;

  if (req.user?.role === 'parent') {
    // Parents only see explicitly linked children
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
    if (!parent) return res.json({ success: true, data: [], total: 0, page: 1, pages: 0 });
    const links = await prisma.parentStudent.findMany({ where: { schoolId, parentId: parent.id }, select: { studentId: true } });
    parentStudentIds = links.map((l) => l.studentId);
    if (!parentStudentIds.length) return res.json({ success: true, data: [], total: 0, page: 1, pages: 0 });
  }

  if (req.user?.role === 'student') {
    // Students can only see their own linked record
    const self = await prisma.student.findFirst({
      where: { schoolId, userId: req.user.id, deletedAt: null },
      include: { class: true, section: true },
    });
    if (!self) return res.json({ success: true, data: [], total: 0, page: 1, pages: 0 });
    return res.json({ success: true, data: [self], total: 1, page: 1, pages: 1 });
  }

  if (req.user?.role === 'teacher') {
    // A teacher may only list students for a class they're actually assigned
    // to (via Subject or Timetable) — previously any teacher could view any
    // class in the school just by passing its classId as a query param.
    if (classId) {
      const allowed = await teacherCanAccessClass(req, classId);
      if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
    }
  }

  if (req.user?.role === 'gatekeeper') {
    // Gatekeepers can search students by roll/name for barcode scanning — but cannot list all
    if (!search) return res.json({ success: true, data: [], total: 0, page: 1, pages: 0 });
    // Allow search through (falls through to normal query below)
  }
  // ─────────────────────────────────────────────────────────────────────

  const where = {
    schoolId, deletedAt: null,
    ...(campusId && !parentStudentIds && { campusId }),
    ...(status && { status }),
    ...(classId && { classId: parseInt(classId) }),
    ...(sectionId && { sectionId: parseInt(sectionId) }),
    ...(parentStudentIds && { id: { in: parentStudentIds } }),
    ...(search && (() => {
      // Split into words — each word is searched independently (OR logic)
      const words = search.trim().split(/\s+/).filter(w => w.length > 0);
      const wordConditions = words.flatMap(word => [
        { name:       { contains: word, mode: 'insensitive' } },
        { rollNo:     { contains: word, mode: 'insensitive' } },
        { fatherName: { contains: word, mode: 'insensitive' } },
      ]);
      return { OR: wordConditions };
    })()),
  };
  const [students, total] = await Promise.all([
    prisma.student.findMany({ where, skip, take: parseInt(limit), include: { class: true, section: true }, orderBy: { name: 'asc' } }),
    prisma.student.count({ where })
  ]);
  res.json({ success: true, data: students, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}));

// GET /api/v1/students/:id
router.get('/:id', wrap(async (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: req.schoolId, deletedAt: null },
    include: { class: true, section: true, session: true, feeInvoices: { orderBy: { createdAt: 'desc' }, take: 10 }, attendance: { orderBy: { date: 'desc' }, take: 30 } }
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  if (req.user?.role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId: req.schoolId, userId: req.user.id } });
    if (!parent) {
      return res.status(403).json({ success: false, message: 'Access denied for this student.' });
    }
    const link = await prisma.parentStudent.findFirst({ where: { schoolId: req.schoolId, parentId: parent.id, studentId } });
    if (!link) return res.status(403).json({ success: false, message: 'Access denied for this student.' });
  }

  if (req.user?.role === 'student') {
    if (student.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied for this student.' });
    }
  }

  res.json({ success: true, data: student });
}));

/* ── Auto-generate student roll number ──────────────────── */
async function generateRollNo(schoolId, classId, sectionId) {
  // Get class & section info
  const cls = classId ? await prisma.class.findUnique({ where: { id: parseInt(classId) } }) : null;
  const sec = sectionId ? await prisma.section.findUnique({ where: { id: parseInt(sectionId) } }) : null;

  // Build class prefix: Nursery→NUR, KG→KG, Class 1→C1, Class 10→C10
  let prefix = 'STU';
  if (cls) {
    const n = cls.name.toUpperCase();
    if      (n.includes('NURSERY')) prefix = 'NUR';
    else if (n.includes('KG'))       prefix = 'KG';
    else if (n.includes('CLASS'))    prefix = 'C' + n.replace(/[^0-9]/g, '');
    else                             prefix = n.replace(/\s+/g, '').slice(0, 3);
  }

  // Add section letter
  const secLetter = sec ? sec.name.toUpperCase().charAt(0) : '';
  prefix = prefix + secLetter;   // e.g. C5A, KGA, NURA

  // Get current year suffix (last 2 digits)
  const yr = new Date().getFullYear().toString().slice(-2);

  // Count existing students in same class+section to get next number
  const count = await prisma.student.count({
    where: { schoolId, ...(classId && { classId: parseInt(classId) }), ...(sectionId && { sectionId: parseInt(sectionId) }) }
  });
  const seq = String(count + 1).padStart(3, '0');

  return `${prefix}-${yr}-${seq}`;   // e.g. C5A-26-001, KGA-26-003
}

// POST /api/v1/students
/* ═══════════════════════════════════════════════════════════════════
   POST /api/v1/students — FULL LINKED ADMISSION FLOW
   Creates: Student record + Student portal User + Parent record +
   Parent portal User + auto-generated credentials for BOTH.
   Optionally: assigns first month fee invoice + transport.
   Returns credentials so frontend can show/print them.
   ═══════════════════════════════════════════════════════════════════ */
const bcrypt = require('bcryptjs');
const genPassword = (len = 8) => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);

router.post('/', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const {
    name, fatherName, motherName, gender, dob, classId, sectionId, sessionId,
    rollNo, phone, address, bFormNo, emergencyPhone,
    parentEmail, parentCnic,
    createPortalAccounts = true,       // ← auto-create student + parent portal users
    generateFirstInvoice  = false,     // ← optionally generate this month's fee invoice
    monthlyFee,
  } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Student name is required.' });

  const finalRollNo = rollNo && rollNo.trim() ? rollNo.trim()
    : await generateRollNo(schoolId, classId, sectionId);

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const slug = school?.slug || 'school';

  // Generate credentials up-front
  const studentPassword = genPassword();
  const parentPassword  = genPassword();
  const studentEmail    = `${slugify(name)}.${finalRollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@${slug}.student`;
  const finalParentEmail = (parentEmail && parentEmail.trim())
    ? parentEmail.trim().toLowerCase()
    : `${slugify(fatherName || 'parent')}.${finalRollNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@${slug}.parent`;

  const result = await prisma.$transaction(async (tx) => {
    // 1) Student record
    const student = await tx.student.create({
      data: {
        schoolId,
        campusId: campusId || parseInt(req.body.campusId) || 1,
        name, fatherName, motherName, gender,
        dob: dob ? new Date(dob) : null,
        classId:   classId   ? parseInt(classId)   : null,
        sectionId: sectionId ? parseInt(sectionId) : null,
        sessionId: sessionId ? parseInt(sessionId) : null,
        rollNo: finalRollNo,
        address, bFormNo, emergencyPhone,
      },
      include: { class: true, section: true }
    });

    let studentUser = null, parentUser = null, parentRec = null;

    if (createPortalAccounts) {
      // 2) Student portal User
      studentUser = await tx.user.create({
        data: {
          schoolId, campusId: student.campusId,
          name, email: studentEmail,
          phone: emergencyPhone || null,
          role: 'student',
          passwordHash: await bcrypt.hash(studentPassword, 10),
          phoneVerifiedAt: new Date(),
          mustChangePassword: false,
        }
      });

      await tx.student.update({
        where: { id: student.id },
        data: { userId: studentUser.id },
      });

      // 3) Parent portal User — reuse existing parent user if same phone already registered
      const existingParentUser = emergencyPhone
        ? await tx.user.findFirst({ where: { schoolId, role: 'parent', phone: emergencyPhone, deletedAt: null } })
        : null;

      if (existingParentUser) {
        parentUser = existingParentUser; // sibling case — same parent account
        parentRec = await tx.parent.findFirst({ where: { schoolId, userId: parentUser.id } });
        if (!parentRec) {
          parentRec = await tx.parent.create({
            data: { schoolId, userId: parentUser.id, cnic: parentCnic || null, address: address || null }
          });
        }
      } else {
        parentUser = await tx.user.create({
          data: {
            schoolId, campusId: student.campusId,
            name: fatherName || `Parent of ${name}`,
            email: finalParentEmail,
            phone: emergencyPhone || null,
            role: 'parent',
            passwordHash: await bcrypt.hash(parentPassword, 10),
            phoneVerifiedAt: new Date(),
            mustChangePassword: false,
          }
        });
        parentRec = await tx.parent.create({
          data: { schoolId, userId: parentUser.id, cnic: parentCnic || null, address: address || null }
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

    // 4) Optional: first fee invoice (linked flow)
    let invoice = null;
    if (generateFirstInvoice) {
      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const amount = parseInt(monthlyFee) || 0;
      if (amount > 0) {
        // Field names must match the FeeInvoice model exactly (dueAmount, not
        // balance; feeTitle is required) — previously this threw on every call
        // and was silently swallowed, so admission-time invoicing never worked.
        invoice = await tx.feeInvoice.create({
          data: {
            schoolId, campusId: student.campusId, studentId: student.id, classId: student.classId,
            feeTitle: 'Monthly Fee', month: monthName, year: now.getFullYear(),
            totalAmount: amount, paidAmount: 0, dueAmount: amount,
            status: 'unpaid', dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
          }
        });
      }
    }

    // 5) Audit log
    // NOTE: AuditLog has no entity/entityId/details columns (only
    // action/resource/resourceId) — the previous version referenced
    // nonexistent fields, threw on every call, and was silently swallowed by
    // `.catch(() => null)`, so admissions were never actually being audited.
    await tx.auditLog.create({
      data: {
        schoolId, userId: req.user.id,
        action: 'STUDENT_ADMITTED',
        resource: 'student', resourceId: student.id,
      }
    });

    return { student, studentUser, parentUser, parentRec, invoice, parentIsExisting: !!(!parentRec && parentUser) };
  });

  // Build credentials payload for frontend popup / print
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const portalLink = `${FRONTEND_URL}/login?slug=${slug}`;
  const credentials = createPortalAccounts ? {
    portalLink,
    student: { email: studentEmail, password: studentPassword, portal: 'Student Portal' },
    parent: result.parentIsExisting
      ? { email: result.parentUser.email, password: '(existing account — same as sibling)', portal: 'Parent Portal', existing: true }
      : { email: result.parentUser?.email || finalParentEmail, password: parentPassword, portal: 'Parent Portal' },
  } : null;

  res.status(201).json({ success: true, data: result.student, credentials, invoice: result.invoice });
}));

// GET /api/v1/students/preview-roll?classId=X&sectionId=Y
router.get('/preview-roll', wrap(async (req, res) => {
  const { classId, sectionId } = req.query;
  const rollNo = await generateRollNo(req.schoolId, classId, sectionId);
  res.json({ success: true, data: { rollNo } });
}));

// PUT /api/v1/students/:id
router.put('/:id', wrap(async (req, res) => {
  const student = await prisma.student.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId, deletedAt: null } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  const allowed = ['name','fatherName','motherName','gender','dob','classId','sectionId','rollNo','address','bFormNo','emergencyPhone','status','photoUrl'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  if (data.dob) data.dob = new Date(data.dob);
  if (data.classId) data.classId = parseInt(data.classId);
  if (data.sectionId) data.sectionId = parseInt(data.sectionId);
  const updated = await prisma.student.update({ where: { id: parseInt(req.params.id) }, data });
  res.json({ success: true, data: updated });
}));

// DELETE /api/v1/students/:id (soft delete)
router.delete('/:id', wrap(async (req, res) => {
  const student = await prisma.student.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  await prisma.$transaction([
    prisma.student.update({ where: { id: student.id }, data: { deletedAt: new Date(), status: 'inactive' } }),
    // Deactivating a student must also lock their portal login — otherwise a
    // "deactivated" student can still authenticate.
    ...(student.userId ? [prisma.user.update({ where: { id: student.userId }, data: { isActive: false } })] : []),
  ]);
  res.json({ success: true, message: 'Student deactivated.' });
}));

// POST /api/v1/students/:id/promote
router.post('/:id/promote', wrap(async (req, res) => {
  const student = await prisma.student.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId, deletedAt: null } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  const { toClassId, toSectionId, toSessionId } = req.body;
  if (!toClassId) return res.status(400).json({ success: false, message: 'toClassId is required.' });
  const updated = await prisma.student.update({
    where: { id: student.id },
    data: { classId: parseInt(toClassId), sectionId: toSectionId ? parseInt(toSectionId) : null, sessionId: toSessionId ? parseInt(toSessionId) : null }
  });
  res.json({ success: true, data: updated, message: 'Student promoted successfully.' });
}));

// GET /api/v1/students/birthdays/today
router.get('/birthdays/today', wrap(async (req, res) => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const students = await prisma.$queryRaw`
    SELECT id, name, rollNo, classId, dob, photoUrl FROM Student
    WHERE schoolId = ${req.schoolId} AND deletedAt IS NULL AND status = 'active'
    AND CAST(strftime('%m', dob) AS INTEGER) = ${month} AND CAST(strftime('%d', dob) AS INTEGER) = ${day}
  `;
  res.json({ success: true, data: students });
}));

module.exports = router;
