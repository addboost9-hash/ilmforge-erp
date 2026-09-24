const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Mounted with only `protect` in app.js (no role gate, no PM check).
// Recording/editing/deleting disciplinary records is a staff-only action.
const staffOnly = (req, res, next) => {
  if (!['admin', 'super_admin', 'principal', 'teacher'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Staff only.' });
  }
  next();
};

// Resolve which studentId a student/parent caller is allowed to see;
// returns { studentId, denied } — mirrors the ownership pattern already
// used in attendance.routes.js (Student.userId / Parent.userId + ParentStudent).
async function resolveViewableStudentId(req, requestedStudentId) {
  const { schoolId } = req;
  const role = req.user?.role;
  if (!['student', 'parent'].includes(role)) {
    return { studentId: requestedStudentId ? parseInt(requestedStudentId) : undefined, denied: false };
  }
  if (role === 'student') {
    const self = await prisma.student.findFirst({ where: { schoolId, userId: req.user.id, deletedAt: null }, select: { id: true } });
    if (!self) return { studentId: -1, denied: false };
    if (requestedStudentId && parseInt(requestedStudentId) !== self.id) return { studentId: null, denied: true };
    return { studentId: self.id, denied: false };
  }
  // parent
  const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id }, select: { id: true } });
  const links = parent ? await prisma.parentStudent.findMany({ where: { schoolId, parentId: parent.id }, select: { studentId: true } }) : [];
  const allowedIds = links.map((l) => l.studentId);
  if (requestedStudentId) {
    const rid = parseInt(requestedStudentId);
    if (!allowedIds.includes(rid)) return { studentId: null, denied: true };
    return { studentId: rid, denied: false };
  }
  return { studentId: allowedIds.length === 1 ? allowedIds[0] : { in: allowedIds.length ? allowedIds : [-1] }, denied: false };
}

// GET /api/v1/behaviour — list BehaviorRecord for schoolId
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId, type, from, to, severity } = req.query;

  const resolved = await resolveViewableStudentId(req, studentId);
  if (resolved.denied) return res.status(403).json({ success: false, message: 'Access denied for this student.' });

  const where = { schoolId };
  if (resolved.studentId !== undefined) where.studentId = resolved.studentId;
  if (type)      where.category = type;
  if (severity)  where.notes = { contains: `severity:${severity}` };

  if (from || to) {
    where.createdAt = {};
    if (from) { const d = new Date(from); d.setHours(0,0,0,0); where.createdAt.gte = d; }
    if (to)   { const d = new Date(to);   d.setHours(23,59,59,999); where.createdAt.lte = d; }
  }

  const records = await prisma.behaviorRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: { id: true, name: true, rollNo: true, class: { select: { name: true } } },
      },
    },
  });

  res.json({ success: true, data: records });
}));

// POST /api/v1/behaviour — create record
router.post('/', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId, type, description, details, severity, action, reportedBy, date } = req.body;
  if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required.' });
  if (!type)      return res.status(400).json({ success: false, message: 'type is required.' });

  // The student must belong to this school — otherwise a staff user could
  // attach a disciplinary record to another tenant's student by id.
  const student = await prisma.student.findFirst({
    where: { id: parseInt(studentId), schoolId, deletedAt: null }, select: { id: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found in this school.' });

  const notesData = JSON.stringify({
    description: description || '',
    details:     details     || '',
    severity:    severity    || 'Low',
    action:      action      || '',
    reportedBy:  reportedBy  || '',
    date:        date        || new Date().toISOString().split('T')[0],
  });

  const record = await prisma.behaviorRecord.create({
    data: {
      schoolId,
      studentId: parseInt(studentId),
      category:  type,
      behavior:  description || type,
      points:    type === 'positive' || type === 'achievement' ? 1 : -1,
      notes:     notesData,
      recordedBy: req.user?.id || null,
    },
    include: {
      student: { select: { id: true, name: true, rollNo: true, class: { select: { name: true } } } },
    },
  });

  res.status(201).json({ success: true, data: record });
}));

// PUT /api/v1/behaviour/:id — update
router.put('/:id', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const { type, description, details, severity, action, reportedBy, date } = req.body;

  const existing = await prisma.behaviorRecord.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Record not found.' });

  const notesData = JSON.stringify({
    description: description || '',
    details:     details     || '',
    severity:    severity    || 'Low',
    action:      action      || '',
    reportedBy:  reportedBy  || '',
    date:        date        || new Date().toISOString().split('T')[0],
  });

  const updated = await prisma.behaviorRecord.update({
    where: { id },
    data: {
      ...(type        && { category: type, behavior: description || type }),
      notes: notesData,
    },
    include: {
      student: { select: { id: true, name: true, rollNo: true, class: { select: { name: true } } } },
    },
  });

  res.json({ success: true, data: updated });
}));

// DELETE /api/v1/behaviour/:id
router.delete('/:id', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);

  const existing = await prisma.behaviorRecord.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Record not found.' });

  await prisma.behaviorRecord.delete({ where: { id } });
  res.json({ success: true, message: 'Record deleted.' });
}));

// GET /api/v1/behaviour/summary/:studentId — behavior summary
router.get('/summary/:studentId', wrap(async (req, res) => {
  const { schoolId } = req;
  const studentId = parseInt(req.params.studentId);

  const resolved = await resolveViewableStudentId(req, studentId);
  if (resolved.denied) return res.status(403).json({ success: false, message: 'Access denied for this student.' });

  const records = await prisma.behaviorRecord.findMany({
    where: { schoolId, studentId },
    select: { category: true, points: true },
  });

  const summary = records.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  const totalPoints = records.reduce((s, r) => s + (r.points || 0), 0);

  res.json({ success: true, data: { summary, totalPoints, total: records.length } });
}));

module.exports = router;
