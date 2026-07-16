const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET / — list timetable entries (filter by classId, sectionId, day)
router.get('/', wrap(async (req, res) => {
  const { classId, sectionId, day } = req.query;
  const entries = await prisma.timetableEntry.findMany({
    where: {
      schoolId: req.schoolId,
      ...(classId   && { classId:   parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
      ...(day       && { day }),
    },
    orderBy: [{ day: 'asc' }, { periodNo: 'asc' }],
  });
  res.json({ success: true, data: entries });
}));

// POST / — create entry
router.post('/', wrap(async (req, res) => {
  const {
    classId, sectionId, day, periodNo,
    subjectId, teacherId,
    subject, teacherName,
    startTime, endTime,
  } = req.body;

  if (!classId || !day) {
    return res.status(400).json({ success: false, message: 'classId and day are required.' });
  }

  const entry = await prisma.timetableEntry.create({
    data: {
      schoolId:    req.schoolId,
      campusId:    req.campusId || null,
      classId:     parseInt(classId),
      sectionId:   sectionId   ? parseInt(sectionId)   : null,
      day,
      periodNo:    periodNo    ? parseInt(periodNo)     : 1,
      subjectId:   subjectId   ? parseInt(subjectId)   : null,
      teacherId:   teacherId   ? parseInt(teacherId)   : null,
      subject:     subject     || null,
      teacherName: teacherName || null,
      startTime:   startTime   || null,
      endTime:     endTime     || null,
    },
  });
  res.status(201).json({ success: true, data: entry });
}));

// PUT /:id — update entry
router.put('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    classId, sectionId, day, periodNo,
    subjectId, teacherId,
    subject, teacherName,
    startTime, endTime,
  } = req.body;

  const existing = await prisma.timetableEntry.findFirst({
    where: { id, schoolId: req.schoolId },
  });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Entry not found.' });
  }

  const entry = await prisma.timetableEntry.update({
    where: { id },
    data: {
      ...(classId     !== undefined && { classId:     parseInt(classId) }),
      ...(sectionId   !== undefined && { sectionId:   sectionId ? parseInt(sectionId) : null }),
      ...(day         !== undefined && { day }),
      ...(periodNo    !== undefined && { periodNo:    parseInt(periodNo) }),
      ...(subjectId   !== undefined && { subjectId:   subjectId ? parseInt(subjectId) : null }),
      ...(teacherId   !== undefined && { teacherId:   teacherId ? parseInt(teacherId) : null }),
      ...(subject     !== undefined && { subject:     subject || null }),
      ...(teacherName !== undefined && { teacherName: teacherName || null }),
      ...(startTime   !== undefined && { startTime:   startTime || null }),
      ...(endTime     !== undefined && { endTime:     endTime || null }),
    },
  });
  res.json({ success: true, data: entry });
}));

// DELETE /:id — delete entry
router.delete('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.timetableEntry.findFirst({
    where: { id, schoolId: req.schoolId },
  });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Entry not found.' });
  }
  await prisma.timetableEntry.delete({ where: { id } });
  res.json({ success: true, message: 'Deleted.' });
}));

module.exports = router;
