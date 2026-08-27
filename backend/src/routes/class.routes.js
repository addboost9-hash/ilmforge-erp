const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const classes = await prisma.class.findMany({
    where: { schoolId: req.schoolId, isActive: true },
    select: {
      id: true, name: true, orderNo: true, isActive: true,
      sections: { select: { id: true, name: true } },
    },
    orderBy: { orderNo: 'asc' },
  });
  res.setHeader('Cache-Control', 'private, max-age=300'); // 5 min cache
  res.json({ success: true, data: classes });
}));

router.post('/', wrap(async (req, res) => {
  const { name, orderNo } = req.body;
  const cls = await prisma.class.create({ data: { schoolId: req.schoolId, name, orderNo: orderNo ? parseInt(orderNo) : 0 } });
  res.status(201).json({ success: true, data: cls });
}));

router.post('/:classId/sections', wrap(async (req, res) => {
  const { name } = req.body;
  const classId = parseInt(req.params.classId);

  // IDOR: classId was not verified to belong to this school — a user could
  // attach a new section to another school's class by guessing its id.
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const section = await prisma.section.create({ data: { schoolId: req.schoolId, classId, name } });
  res.status(201).json({ success: true, data: section });
}));

router.get('/subjects', wrap(async (req, res) => {
  const { classId } = req.query;
  const where = { schoolId: req.schoolId, ...(classId && { classId: parseInt(classId) }) };
  const subjects = await prisma.subject.findMany({ where, orderBy: { name: 'asc' } });
  res.json({ success: true, data: subjects });
}));

// GET /:classId/subjects — subjects for a specific class
router.get('/:classId/subjects', wrap(async (req, res) => {
  const classId = parseInt(req.params.classId);
  if (isNaN(classId)) return res.status(400).json({ success: false, message: 'Invalid classId.' });
  const subjects = await prisma.subject.findMany({
    where: { schoolId: req.schoolId, classId },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: subjects });
}));

router.post('/subjects', wrap(async (req, res) => {
  const { classId, name, code, totalMarks, teacherId } = req.body;
  const parsedClassId = parseInt(classId);

  // IDOR: classId was not verified to belong to this school — a user could
  // attach a new subject to another school's class by guessing its id.
  const cls = await prisma.class.findFirst({ where: { id: parsedClassId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  const subject = await prisma.subject.create({ data: { schoolId: req.schoolId, classId: parsedClassId, name, code, totalMarks: totalMarks ? parseInt(totalMarks) : 100, teacherId: teacherId ? parseInt(teacherId) : null } });
  res.status(201).json({ success: true, data: subject });
}));

router.put('/subjects/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.subject.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Subject not found.' });

  const { classId, name, code, totalMarks, teacherId } = req.body;

  // IDOR: classId was not verified to belong to this school — a user could
  // re-parent this subject onto another school's class by guessing its id.
  if (classId !== undefined) {
    const cls = await prisma.class.findFirst({ where: { id: parseInt(classId), schoolId: req.schoolId } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(classId !== undefined && { classId: parseInt(classId) }),
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(totalMarks !== undefined && { totalMarks: parseInt(totalMarks) }),
      ...(teacherId !== undefined && { teacherId: teacherId ? parseInt(teacherId) : null }),
    },
  });
  res.json({ success: true, data: subject });
}));

router.delete('/subjects/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.subject.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Subject not found.' });
  await prisma.subject.delete({ where: { id } });
  res.json({ success: true, message: 'Subject deleted.' });
}));

module.exports = router;
