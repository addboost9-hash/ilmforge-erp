const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { classId, date } = req.query;
  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0,0,0,0);
  const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate()+1);
  const homework = await prisma.homeworkDiary.findMany({
    where: { schoolId: req.schoolId, ...(classId && { classId: parseInt(classId) }), date: { gte: targetDate, lt: nextDay } }
  });
  res.json({ success: true, data: homework });
}));

router.post('/', wrap(async (req, res) => {
  const { classId, sectionId, subjectId, description, date } = req.body;
  if (!description) return res.status(400).json({ success: false, message: 'Description required.' });
  const hw = await prisma.homeworkDiary.create({ data: { schoolId: req.schoolId, campusId: req.campusId, classId: classId ? parseInt(classId) : null, sectionId: sectionId ? parseInt(sectionId) : null, subjectId: subjectId ? parseInt(subjectId) : null, teacherId: req.user.id, description, date: date ? new Date(date) : new Date() } });
  res.status(201).json({ success: true, data: hw });
}));

module.exports = router;
