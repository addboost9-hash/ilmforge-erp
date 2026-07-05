const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { classId } = req.query;
  const data = await prisma.onlineClass.findMany({
    where: { schoolId: req.schoolId, ...(classId && { classId: parseInt(classId) }) },
    orderBy: { scheduledAt: 'desc' }, take: 50,
  });
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  if (!['admin','super_admin','teacher'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Teachers/admins only.' });
  const { classId, sectionId, subjectId, title, meetingLink, scheduledAt, durationMinutes } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Title required.' });
  const oc = await prisma.onlineClass.create({
    data: {
      schoolId: req.schoolId,
      classId: classId ? parseInt(classId) : null,
      sectionId: sectionId ? parseInt(sectionId) : null,
      subjectId: subjectId ? parseInt(subjectId) : null,
      teacherId: req.user.role === 'teacher' ? req.user.id : null,
      title, meetingLink,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      durationMinutes: parseInt(durationMinutes) || 60,
    }
  });
  res.status(201).json({ success: true, data: oc });
}));

router.put('/:id/status', wrap(async (req, res) => {
  const oc = await prisma.onlineClass.update({ where: { id: parseInt(req.params.id) }, data: { status: req.body.status || 'completed' } });
  res.json({ success: true, data: oc });
}));

module.exports = router;
