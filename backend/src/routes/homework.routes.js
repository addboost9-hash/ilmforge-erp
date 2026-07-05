const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { classId, date, from, to } = req.query;

  let dateFilter;

  if (date) {
    // Single-day filter
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    dateFilter = { gte: targetDate, lt: nextDay };
  } else if (from && to) {
    // Explicit range
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter = { gte: fromDate, lte: toDate };
  } else {
    // Default: last 14 days
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    dateFilter = { gte: start, lte: end };
  }

  const homework = await prisma.homeworkDiary.findMany({
    where: {
      schoolId: req.schoolId,
      ...(classId && { classId: parseInt(classId) }),
      date: dateFilter,
    },
    orderBy: { date: 'desc' },
  });

  res.json({ success: true, data: homework });
}));

router.post('/', wrap(async (req, res) => {
  const { classId, sectionId, subjectId, description, date } = req.body;
  if (!description) return res.status(400).json({ success: false, message: 'Description required.' });
  const hw = await prisma.homeworkDiary.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      classId:   classId   ? parseInt(classId)   : null,
      sectionId: sectionId ? parseInt(sectionId) : null,
      subjectId: subjectId ? parseInt(subjectId) : null,
      teacherId: req.user.id,
      description,
      date: date ? new Date(date) : new Date(),
    },
  });
  res.status(201).json({ success: true, data: hw });
}));

module.exports = router;
