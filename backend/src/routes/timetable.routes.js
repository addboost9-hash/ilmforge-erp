const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { classId, sectionId, day } = req.query;
  const entries = await prisma.timetableEntry.findMany({
    where: {
      schoolId: req.schoolId,
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
      ...(day && { day })
    },
    orderBy: [{ day: 'asc' }, { periodNo: 'asc' }]
  });
  res.json({ success: true, data: entries });
}));

router.post('/', wrap(async (req, res) => {
  const { classId, sectionId, day, periodNo, subjectId, teacherId, startTime, endTime } = req.body;
  if (!classId || !day || !periodNo) return res.status(400).json({ success: false, message: 'classId, day, periodNo required.' });
  const entry = await prisma.timetableEntry.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      classId: parseInt(classId),
      sectionId: sectionId ? parseInt(sectionId) : null,
      day, periodNo: parseInt(periodNo),
      subjectId: subjectId ? parseInt(subjectId) : null,
      teacherId: teacherId ? parseInt(teacherId) : null,
      startTime, endTime
    }
  });
  res.status(201).json({ success: true, data: entry });
}));

router.delete('/:id', wrap(async (req, res) => {
  await prisma.timetableEntry.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Deleted.' });
}));

module.exports = router;
