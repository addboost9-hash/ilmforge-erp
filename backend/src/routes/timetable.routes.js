const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { classId, sectionId } = req.query;
  const entries = await prisma.timetableEntry.findMany({
    where: {
      schoolId: req.schoolId,
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) })
    },
    orderBy: [{ day: 'asc' }, { periodNo: 'asc' }]
  });
  res.json({ success: true, data: entries });
}));

router.post('/', wrap(async (req, res) => {
  const { classId, sectionId, day, subjectId, teacherId, startTime, endTime } = req.body;
  let { periodNo } = req.body;
  if (!classId || !day) return res.status(400).json({ success: false, message: 'classId and day required.' });

  // periodNo is auto-assigned (next available slot for this class/section/day)
  // rather than requiring the caller to track period numbers manually.
  if (!periodNo) {
    const count = await prisma.timetableEntry.count({
      where: { schoolId: req.schoolId, classId: parseInt(classId), sectionId: sectionId ? parseInt(sectionId) : null, day },
    });
    periodNo = count + 1;
  }

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

router.put('/:id', wrap(async (req, res) => {
  const existing = await prisma.timetableEntry.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });
  const { classId, sectionId, day, subjectId, teacherId, startTime, endTime } = req.body;
  const entry = await prisma.timetableEntry.update({
    where: { id: existing.id },
    data: {
      ...(classId !== undefined && { classId: parseInt(classId) }),
      ...(sectionId !== undefined && { sectionId: sectionId ? parseInt(sectionId) : null }),
      ...(day !== undefined && { day }),
      ...(subjectId !== undefined && { subjectId: subjectId ? parseInt(subjectId) : null }),
      ...(teacherId !== undefined && { teacherId: teacherId ? parseInt(teacherId) : null }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
    },
  });
  res.json({ success: true, data: entry });
}));

router.delete('/:id', wrap(async (req, res) => {
  const existing = await prisma.timetableEntry.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });
  await prisma.timetableEntry.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Deleted.' });
}));

module.exports = router;
