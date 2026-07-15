const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/behaviour — list BehaviorRecord for schoolId
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId, type, from, to, severity } = req.query;

  const where = { schoolId };
  if (studentId) where.studentId = parseInt(studentId);
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
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId, type, description, severity, action, reportedBy, date } = req.body;
  if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required.' });
  if (!type)      return res.status(400).json({ success: false, message: 'type is required.' });

  const notesData = JSON.stringify({
    description: description || '',
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
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const { type, description, severity, action, reportedBy, date } = req.body;

  const existing = await prisma.behaviorRecord.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Record not found.' });

  const notesData = JSON.stringify({
    description: description || '',
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
router.delete('/:id', wrap(async (req, res) => {
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
