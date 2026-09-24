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
  // Revalidate rather than serve from the browser cache: a 5-minute max-age
  // here meant a newly added or deleted class did not show up until it expired.
  res.setHeader('Cache-Control', 'private, no-cache');
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

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Subject name is required.' });
  }

  // Subject.classId is required by the schema. Without this guard an omitted
  // or blank classId became parseInt(undefined) = NaN and Prisma threw,
  // surfacing as a 500 instead of telling the user to pick a class.
  const parsedClassId = parseInt(classId);
  if (!Number.isInteger(parsedClassId)) {
    return res.status(400).json({ success: false, message: 'Please select the class this subject belongs to.' });
  }

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
  // An empty-string classId from a form select parsed to NaN here and threw.
  const reparent = classId !== undefined && classId !== null && classId !== '';
  if (reparent) {
    const parsed = parseInt(classId);
    if (!Number.isInteger(parsed)) {
      return res.status(400).json({ success: false, message: 'Invalid class selected.' });
    }
    const cls = await prisma.class.findFirst({ where: { id: parsed, schoolId: req.schoolId } });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(reparent && { classId: parseInt(classId) }),
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
