const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
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
    // Teachers can see all students in their school (filtered by class if they have one assigned)
    const staffRecord = await prisma.staff.findFirst({ where: { userId: req.user.id, schoolId } });
    // If teacher has a specific classId, could filter here — for now allow all
    // (classId filter handled by query params from frontend)
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
  const takeNum = Math.min(parseInt(limit) || 25, 300); // cap at 300 for safety
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where, skip, take: takeNum,
      select: {
        id: true, name: true, rollNo: true, gender: true, status: true,
        photoUrl: true, dob: true, fatherName: true, emergencyPhone: true,
        admissionDate: true, address: true, bFormNo: true,
        classId: true, sectionId: true, campusId: true, userId: true,
        class:   { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        campus:  { select: { id: true, name: true } },
        parent:  { select: { id: true, name: true, phone: true, email: true, cnic: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.student.count({ where }),
  ]);
  // Short cache for list queries (browser-level)
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json({ success: true, data: students, total, page: parseInt(page), pages: Math.ceil(total / takeNum) });
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

  // Resolve campusId — auto-create Main Campus if school has none
  let resolvedCampusId = campusId || (req.body.campusId ? parseInt(req.body.campusId) : null);
  if (!resolvedCampusId) {
    // Try to find existing campus
    const existingCampus = await prisma.campus.findFirst({
      where: { schoolId },
      orderBy: [{ isMain: 'desc' }, { id: 'asc' }],
      select: { id: true },
    });
    if (existingCampus) {
      resolvedCampusId = existingCampus.id;
    } else {
      // Auto-create Main Campus so admission doesn't fail
      const newCampus = await prisma.campus.create({
        data: { schoolId, name: 'Main Campus', isMain: true },
      });
      resolvedCampusId = newCampus.id;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1) Student record
    const student = await tx.student.create({
      data: {
        schoolId,
        campusId: resolvedCampusId,
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
      const now    = new Date();
      const monthNum  = now.getMonth() + 1;          // 1-12
      const monthName = now.toLocaleString('default', { month: 'long' }); // "July"
      const amount = parseInt(monthlyFee) || 0;
      if (amount > 0) {
        const vNo = `ADM-${String(student.id).padStart(4,'0')}-${now.getFullYear()}`;
        invoice = await tx.feeInvoice.create({
          data: {
            schoolId, campusId: student.campusId, studentId: student.id,
            classId: student.classId,
            feeTitle: `Monthly Fee Of ${monthName}`,
            month: monthNum, year: now.getFullYear(),
            totalAmount: amount, paidAmount: 0, dueAmount: amount, balance: amount,
            status: 'unpaid', voucherNo: vNo,
            dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
          }
        }).catch(() => null);
      }
    }

    // 5) Audit log
    await tx.auditLog.create({
      data: {
        schoolId, userId: req.user.id,
        action: 'STUDENT_ADMITTED',
        entity: 'student', entityId: student.id,
        details: JSON.stringify({ name, rollNo: finalRollNo, portalAccounts: createPortalAccounts }),
      }
    }).catch(() => null);

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

// ─────────────────────────────────────────────────────────────────────────────
// STATIC routes — declared BEFORE any /:id dynamic route handlers to prevent
// path shadowing (e.g. GET /promote being swallowed by GET /:id).
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/students/preview-roll?classId=X&sectionId=Y
router.get('/preview-roll', wrap(async (req, res) => {
  const { classId, sectionId } = req.query;
  const rollNo = await generateRollNo(req.schoolId, classId, sectionId);
  res.json({ success: true, data: { rollNo } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/students/promote  — Bulk End-of-Year Promotion
// Body: { records: [{studentId, action, toClassId, toSectionId, newSessionId}], fromSessionId?, newSessionId? }
// action: 'promote' | 'holdback' | 'passout'
// ─────────────────────────────────────────────────────────────────────────────
router.post('/promote', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { records, fromSessionId, newSessionId } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'records array is required and must not be empty.' });
  }

  let promoted = 0, held = 0, passout = 0;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const rec of records) {
      const { studentId, action, toClassId, toSectionId, newSessionId: recSessionId } = rec;
      const sid = parseInt(studentId);
      const resolvedSession = recSessionId || newSessionId;

      // Fetch student's current state before update (for history log).
      // Ownership check: only process students that belong to this school.
      const existing = await tx.student.findFirst({
        where: { id: sid, schoolId, deletedAt: null },
        select: { id: true, classId: true, sectionId: true, sessionId: true },
      });
      if (!existing) continue; // skip students not belonging to this school

      let updateData = {};

      if (action === 'promote') {
        updateData = {
          classId:   toClassId   ? parseInt(toClassId)   : existing.classId,
          sectionId: toSectionId ? parseInt(toSectionId) : null,
          sessionId: resolvedSession ? parseInt(resolvedSession) : existing.sessionId,
          status: 'active',
        };
        promoted++;
      } else if (action === 'holdback') {
        // Stay in same class; optionally update session only
        updateData = {
          sessionId: resolvedSession ? parseInt(resolvedSession) : existing.sessionId,
          status: 'active',
        };
        held++;
      } else if (action === 'passout') {
        updateData = {
          status: 'passout',
          sessionId: resolvedSession ? parseInt(resolvedSession) : existing.sessionId,
        };
        passout++;
      } else {
        continue; // unknown action — skip
      }

      await tx.student.update({ where: { id: sid }, data: updateData });

      // Write promotion log record
      await tx.promotionLog.create({
        data: {
          schoolId,
          studentId: sid,
          action,
          fromClassId:   existing.classId   || null,
          toClassId:     action === 'promote' ? (toClassId ? parseInt(toClassId) : null) : null,
          fromSectionId: existing.sectionId  || null,
          toSectionId:   action === 'promote' && toSectionId ? parseInt(toSectionId) : null,
          fromSessionId: fromSessionId ? parseInt(fromSessionId) : (existing.sessionId || null),
          newSessionId:  resolvedSession ? parseInt(resolvedSession) : null,
          promotedById:  req.user?.id || null,
          createdAt:     now,
        },
      }).catch(() => null); // graceful: if PromotionLog model doesn't exist yet, skip
    }

    // Audit log entry for the bulk operation
    await tx.auditLog.create({
      data: {
        schoolId,
        userId: req.user?.id || null,
        action: 'BULK_PROMOTION',
        entity: 'student',
        entityId: 0,
        details: JSON.stringify({ promoted, held, passout, total: records.length, fromSessionId, newSessionId }),
      },
    }).catch(() => null);
  });

  res.json({ success: true, promoted, held, passout, total: records.length, message: 'Bulk promotion completed.' });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/students/promotion-history  — History of promotions
// Query: sessionId? (filter by session)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/promotion-history', wrap(async (req, res) => {
  const { schoolId } = req;
  const { sessionId, limit = 200 } = req.query;

  // Try to query PromotionLog; if the table doesn't exist fall back to AuditLog
  try {
    const where = {
      schoolId,
      ...(sessionId && { newSessionId: parseInt(sessionId) }),
    };

    const logs = await prisma.promotionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: {
        student:     { select: { id: true, name: true, rollNo: true } },
        fromClass:   { select: { id: true, name: true } },
        toClass:     { select: { id: true, name: true } },
        newSession:  { select: { id: true, name: true } },
        promotedBy:  { select: { id: true, name: true } },
      },
    });

    return res.json({ success: true, data: logs });
  } catch (_modelErr) {
    // PromotionLog model not yet migrated — fall back to AuditLog
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: { schoolId, action: 'BULK_PROMOTION' },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        include: { user: { select: { id: true, name: true } } },
      });
      const shaped = auditLogs.map(l => {
        let details = {};
        try { details = JSON.parse(l.details || '{}'); } catch { /* ignore */ }
        return {
          id: l.id,
          createdAt: l.createdAt,
          action: 'bulk',
          student: null,
          fromClass: null,
          toClass: null,
          newSession: details.newSessionId ? { id: details.newSessionId, name: `Session #${details.newSessionId}` } : null,
          promotedBy: l.user,
          promoted: details.promoted,
          held: details.held,
          passout: details.passout,
          total: details.total,
        };
      });
      return res.json({ success: true, data: shaped });
    } catch (auditErr) {
      return res.json({ success: true, data: [] });
    }
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/students/promotion-history/:id  — Undo a promotion (within 24h)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/promotion-history/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const logId = parseInt(req.params.id);

  let log;
  try {
    log = await prisma.promotionLog.findFirst({
      where: { id: logId, schoolId },
    });
  } catch {
    return res.status(404).json({ success: false, message: 'Promotion history not available.' });
  }

  if (!log) return res.status(404).json({ success: false, message: 'Promotion log not found.' });

  // Enforce 24-hour window
  const ageMs = Date.now() - new Date(log.createdAt).getTime();
  if (ageMs > 24 * 60 * 60 * 1000) {
    return res.status(400).json({ success: false, message: 'Undo window (24 hours) has expired.' });
  }

  // Revert the student back
  const revertData = {
    classId:   log.fromClassId   || undefined,
    sectionId: log.fromSectionId || null,
    sessionId: log.fromSessionId || undefined,
    status: 'active',
  };

  await prisma.$transaction([
    prisma.student.update({ where: { id: log.studentId }, data: revertData }),
    prisma.promotionLog.delete({ where: { id: logId } }),
  ]);

  res.json({ success: true, message: 'Promotion undone successfully.' });
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

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic /:id routes — declared AFTER all static routes above
// ─────────────────────────────────────────────────────────────────────────────

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
  const studentId = parseInt(req.params.id);

  // Ownership check: verify this student belongs to the requesting school before soft-deleting
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: req.schoolId, deletedAt: null },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  await prisma.student.update({ where: { id: studentId }, data: { deletedAt: new Date(), status: 'inactive' } });
  res.json({ success: true, message: 'Student deactivated.' });
}));

// POST /api/v1/students/:id/promote  (single-student, legacy)
router.post('/:id/promote', wrap(async (req, res) => {
  const { toClassId, toSectionId, toSessionId } = req.body;
  const student = await prisma.student.update({
    where: { id: parseInt(req.params.id) },
    data: { classId: parseInt(toClassId), sectionId: toSectionId ? parseInt(toSectionId) : null, sessionId: toSessionId ? parseInt(toSessionId) : null }
  });
  res.json({ success: true, data: student, message: 'Student promoted successfully.' });
}));

module.exports = router;
