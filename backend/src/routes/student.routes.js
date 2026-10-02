const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { contains: ciContains, equals: ciEquals } = require('../utils/search');
const phoneUtil = require('../utils/phone');
const { checkPhoto } = require('../utils/photo');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/students
router.get('/', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, status = 'active', search, page = 1, limit = 25 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // ── ROLE-BASED ACCESS CONTROL ─────────────────────────────────────────
  let parentStudentIds = null;

  if (req.user?.role === 'parent') {
    // Primary: look up by userId link
    let parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });

    // Fallback: link Parent record by phone if userId match is missing
    if (!parent && req.user.phone) {
      parent = await prisma.parent.findFirst({ where: { schoolId, user: { phone: req.user.phone } } });
      if (parent) {
        // Fix the broken link for future requests
        await prisma.parent.update({ where: { id: parent.id }, data: { userId: req.user.id } }).catch(() => {});
      }
    }

    // Second fallback: find by parent email in student emergency contact
    if (!parent) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true, phone: true } });
      if (user) {
        parent = await prisma.parent.findFirst({ where: { schoolId, OR: [
          ...(user.phone ? [{ user: { phone: user.phone } }] : []),
        ] } });
        if (parent && !parent.userId) {
          await prisma.parent.update({ where: { id: parent.id }, data: { userId: req.user.id } }).catch(() => {});
        }
      }
    }

    // Third fallback: find student by emergencyPhone matching user's phone, then create parent link
    if (!parent && req.user.phone) {
      const userPhone = req.user.phone.replace(/\D/g, '');
      const studentWithParent = await prisma.student.findFirst({
        where: {
          schoolId,
          deletedAt: null,
          OR: [
            { emergencyPhone: req.user.phone },
            { emergencyPhone: userPhone },
          ],
        },
      });
      if (studentWithParent) {
        // Create parent record and link to this user
        parent = await prisma.parent.create({
          data: { schoolId, userId: req.user.id },
        }).catch(() => null);
        if (parent) {
          await prisma.parentStudent.upsert({
            where: { parentId_studentId: { parentId: parent.id, studentId: studentWithParent.id } },
            update: {},
            create: { schoolId, parentId: parent.id, studentId: studentWithParent.id },
          }).catch(() => {});
        }
      }
    }

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
        { name:       ciContains(word) },
        { rollNo:     ciContains(word) },
        { fatherName: ciContains(word) },
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
        admissionDate: true,
        classId: true, sectionId: true, campusId: true, userId: true,
        class:   { select: { id: true, name: true, classTeacherId: true } },
        section: { select: { id: true, name: true } },
        campus:  { select: { id: true, name: true } },
        user:    { select: { id: true, email: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.student.count({ where }),
  ]);
  // Revalidate rather than serve stale: with max-age + stale-while-revalidate
  // a newly admitted, edited or removed student could be missing from this
  // list for up to five minutes. The ETag keeps unchanged responses cheap.
  res.setHeader('Cache-Control', 'private, no-cache');
  res.json({ success: true, data: students, total, page: parseInt(page), pages: Math.ceil(total / takeNum) });
}));

// Roll number generation and the admission itself live in
// services/admission.service.js, shared with the Excel import.
const { admitStudent, generateRollNo } = require('../services/admission.service');

// POST /api/v1/students
/* ═══════════════════════════════════════════════════════════════════
   POST /api/v1/students — FULL LINKED ADMISSION FLOW
   Creates: Student record + Student portal User + Parent record +
   Parent portal User + auto-generated credentials for BOTH.
   Optionally: assigns first month fee invoice + transport.
   Returns credentials so frontend can show/print them.
   ═══════════════════════════════════════════════════════════════════ */
router.post('/', wrap(async (req, res) => {
  try {
    const out = await admitStudent(
      { schoolId: req.schoolId, campusId: req.campusId, actorUserId: req.user.id },
      req.body,
    );
    res.status(201).json({ success: true, data: out.student, credentials: out.credentials, invoice: out.invoice });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    throw err;
  }
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

// GET /api/v1/students/class-sections
// Returns [{classId, className, sectionId, sectionName, studentCount}]
// for all active students grouped by class+section — used by Students page
router.get('/class-sections', wrap(async (req, res) => {
  const { schoolId } = req;

  // Get all active students with class+section
  const students = await prisma.student.findMany({
    where: { schoolId, status: 'active', deletedAt: null },
    select: {
      classId: true, sectionId: true,
      class:   { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  });

  // Group by classId + sectionId
  const map = new Map();
  for (const s of students) {
    if (!s.classId) continue;
    const key = `${s.classId}-${s.sectionId || 0}`;
    if (!map.has(key)) {
      map.set(key, {
        classId:     s.classId,
        className:   s.class?.name   || '',
        sectionId:   s.sectionId     || null,
        sectionName: s.section?.name || '',
        studentCount: 0,
      });
    }
    map.get(key).studentCount++;
  }

  const data = Array.from(map.values()).sort((a, b) => {
    if (a.className < b.className) return -1;
    if (a.className > b.className) return  1;
    if (a.sectionName < b.sectionName) return -1;
    return 1;
  });

  res.json({ success: true, data });
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
  const skipped = [];
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
      if (!existing) { skipped.push({ studentId: sid, reason: 'student not found in this school' }); continue; }

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
        skipped.push({ studentId: sid, reason: `unknown action "${action}"` });
        continue;
      }

      await tx.student.update({ where: { id: sid }, data: updateData });

      // Part of the same transaction: a promotion without its log cannot be
      // undone, so the two must succeed or fail together.
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
      });
    }

    // Audit log entry for the bulk operation
    await tx.auditLog.create({
      data: {
        schoolId,
        userId: req.user?.id || null,
        action: 'BULK_PROMOTION',
        resource: 'student',
        resourceId: 0,
        details: JSON.stringify({ promoted, held, passout, total: records.length, fromSessionId, newSessionId }),
      },
    }).catch(() => null);
  });

  // Report skips explicitly — silently returning "completed" for records that
  // were never applied hides mistakes until the next academic year.
  res.json({
    success: true, promoted, held, passout, total: records.length,
    skipped: skipped.length, skippedDetails: skipped,
    message: skipped.length
      ? `Promotion completed for ${records.length - skipped.length} of ${records.length} student(s); ${skipped.length} skipped.`
      : 'Bulk promotion completed.',
  });
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
    });

    // PromotionLog carries scalar FKs only, so resolve the display names in
    // one batched query per entity rather than N includes.
    const ids = (key) => [...new Set(logs.map((l) => l[key]).filter(Boolean))];
    const classIds = [...new Set([...ids('fromClassId'), ...ids('toClassId')])];
    const [students, classes, sessions, users] = await Promise.all([
      ids('studentId').length
        ? prisma.student.findMany({ where: { id: { in: ids('studentId') } }, select: { id: true, name: true, rollNo: true } })
        : [],
      classIds.length
        ? prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
        : [],
      ids('newSessionId').length
        ? prisma.academicSession.findMany({ where: { id: { in: ids('newSessionId') } }, select: { id: true, name: true } })
        : [],
      ids('promotedById').length
        ? prisma.user.findMany({ where: { id: { in: ids('promotedById') } }, select: { id: true, name: true } })
        : [],
    ]);
    const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
    const sMap = byId(students), cMap = byId(classes), seMap = byId(sessions), uMap = byId(users);

    return res.json({
      success: true,
      data: logs.map((l) => ({
        ...l,
        student:    sMap[l.studentId]     || null,
        fromClass:  cMap[l.fromClassId]   || null,
        toClass:    cMap[l.toClassId]     || null,
        newSession: seMap[l.newSessionId] || null,
        promotedBy: uMap[l.promotedById]  || null,
      })),
    });
  } catch (_modelErr) {
    // PromotionLog model not yet migrated — fall back to AuditLog
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: { schoolId, action: 'BULK_PROMOTION' },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
      });
      const userIds = [...new Set(auditLogs.map(l => l.userId).filter(Boolean))];
      const users = userIds.length
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
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
          promotedBy: userMap[l.userId] || null,
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

// GET /api/v1/students/birthdays/upcoming?days=7
// Returns students with birthdays in the next N days (default 7)
router.get('/birthdays/upcoming', wrap(async (req, res) => {
  const { schoolId } = req;
  const days = Math.min(parseInt(req.query.days) || 7, 30);
  const now = new Date();

  // Collect (month, day) pairs for the next `days` days
  const pairs = [];
  for (let d = 0; d <= days; d++) {
    const dt = new Date(now);
    dt.setDate(now.getDate() + d);
    pairs.push({ month: dt.getMonth() + 1, day: dt.getDate(), daysUntil: d });
  }

  // Use raw query for SQLite date comparison
  // We fetch candidates from all active students and filter in JS for simplicity
  const students = await prisma.student.findMany({
    where: { schoolId, status: 'active', deletedAt: null, dob: { not: null } },
    select: {
      id: true, name: true, rollNo: true, dob: true, emergencyPhone: true, photoUrl: true,
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  });

  const results = [];
  for (const s of students) {
    if (!s.dob) continue;
    try {
      const dob = new Date(s.dob);
      for (const p of pairs) {
        if (dob.getMonth() + 1 === p.month && dob.getDate() === p.day) {
          results.push({ ...s, _daysUntil: p.daysUntil });
          break;
        }
      }
    } catch { /* ignore invalid dob */ }
  }

  results.sort((a, b) => a._daysUntil - b._daysUntil);
  res.json({ success: true, data: results });
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

// GET /api/v1/students/:id/exam-results — fetch exam results for a specific student
router.get('/:id/exam-results', wrap(async (req, res) => {
  const studentId = parseInt(req.params.id);
  const { schoolId } = req;

  // Verify student belongs to this school
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  // No ownership check — any authenticated parent/student (both viewOnly on the
  // 'students' module) could read another child's exam results by guessing the id.
  if (req.user?.role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
    const link = parent
      ? await prisma.parentStudent.findFirst({ where: { schoolId, parentId: parent.id, studentId } })
      : null;
    if (!link) return res.status(403).json({ success: false, message: 'Access denied for this student.' });
  }
  if (req.user?.role === 'student' && student.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied for this student.' });
  }

  // Fetch marks for this student across all exams
  // FIX: Exam has no `name`/`date` columns (it's `title`/`dateStart`) — this
  // threw a Prisma validation error on every call, so exam results could
  // never actually be viewed for any student.
  const marks = await prisma.examMark.findMany({
    where: { studentId, exam: { schoolId } },
    include: {
      exam: { select: { id: true, title: true, dateStart: true } },
    },
    orderBy: [{ exam: { dateStart: 'desc' } }],
    take: 50,
  });

  // Fetch subject names separately for any subjectIds found
  const subjectIds = [...new Set(marks.map(m => m.subjectId).filter(Boolean))];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } })
    : [];
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  const data = marks.map(m => ({
    id:            m.id,
    examName:      m.exam?.title || '—',
    subjectName:   m.subjectId ? (subjectMap[m.subjectId] || `Subject ${m.subjectId}`) : '—',
    totalMarks:    m.totalMarks,
    obtainedMarks: m.obtainedMarks,
    grade:         m.grade,
    date:          m.exam?.dateStart,
  }));

  res.json({ success: true, data });
}));

// GET /api/v1/students/stats
// FIX: this endpoint never existed — StudentsHub.jsx's KPI cards called it,
// silently caught the failure, and always showed "—" placeholders. Must be
// registered before the /:id route below, or "stats" gets parsed as an id.
router.get('/stats', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalStudents, activeStudents, newThisMonth] = await Promise.all([
    prisma.student.count({ where: { schoolId, deletedAt: null, ...(campusId && { campusId }) } }),
    prisma.student.count({ where: { schoolId, deletedAt: null, status: 'active', ...(campusId && { campusId }) } }),
    prisma.student.count({ where: { schoolId, deletedAt: null, admissionDate: { gte: monthStart }, ...(campusId && { campusId }) } }),
  ]);

  res.json({ success: true, data: { totalStudents, activeStudents, newThisMonth } });
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

  // The gate portal never needs a student's full record (it verifies gate
  // passes and scans ID cards), and this record carries fees, medical notes
  // and family CNICs.
  if (req.user?.role === 'gatekeeper') {
    return res.status(403).json({ success: false, message: 'Access denied for this student.' });
  }

  // Teachers may see the student, but not their fees: /fees/student/:id
  // already refuses teachers, and this record was handing them the same
  // invoices anyway.
  if (req.user?.role === 'teacher') {
    delete student.feeInvoices;
  }

  res.json({ success: true, data: student });
}));

// PUT /api/v1/students/:id
router.put('/:id', wrap(async (req, res) => {
  const student = await prisma.student.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId, deletedAt: null } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  const allowed = [
    'name','lastName','fatherName','motherName','gender','dob','classId','sectionId',
    'rollNo','address','bFormNo','emergencyPhone','status','photoUrl',
    'familyNo','firstNameUrdu','lastNameUrdu','fatherNameUrdu',
    'fatherCnic','fatherQualification','fatherOccupation',
    'motherCnic','motherQualification','motherOccupation','motherPhone',
    'caste','nationality','religion','province','city','postalAddress','email',
    'admissionTestMarks','bloodGroup','foodDietaryReq','allergies','childCondition',
    'prevSchoolName','prevSchoolFocalPerson','prevSchoolPhone','prevSchoolAddress',
    'prevAdmissionNo','prevGrade','prevTestGrade',
  ];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  if (data.photoUrl !== undefined) {
    const photo = checkPhoto(data.photoUrl);
    if (photo.error) return res.status(400).json({ success: false, message: photo.error });
    data.photoUrl = photo.value;
  }
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
  const studentId = parseInt(req.params.id);

  // IDOR: update was not scoped by schoolId — a user from another school could
  // promote/mutate this record by guessing its id. Verify ownership first.
  const existing = await prisma.student.findFirst({ where: { id: studentId, schoolId: req.schoolId, deletedAt: null }, select: { id: true } });
  if (!existing) return res.status(404).json({ success: false, message: 'Student not found.' });

  const student = await prisma.student.update({
    where: { id: studentId },
    data: { classId: parseInt(toClassId), sectionId: toSectionId ? parseInt(toSectionId) : null, sessionId: toSessionId ? parseInt(toSessionId) : null }
  });
  res.json({ success: true, data: student, message: 'Student promoted successfully.' });
}));

module.exports = router;
