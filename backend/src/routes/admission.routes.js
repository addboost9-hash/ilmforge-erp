const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/inquiries', wrap(async (req, res) => {
  const inquiries = await prisma.admissionInquiry.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: inquiries });
}));

router.post('/inquiries', wrap(async (req, res) => {
  const { name, phone, classInterested, notes } = req.body;
  const inquiry = await prisma.admissionInquiry.create({ data: { schoolId: req.schoolId, campusId: req.campusId, name, phone, classInterested, notes } });
  res.status(201).json({ success: true, data: inquiry });
}));

router.put('/inquiries/:id', wrap(async (req, res) => {
  const { status, notes } = req.body;
  const inquiry = await prisma.admissionInquiry.update({ where: { id: parseInt(req.params.id) }, data: { status, notes, updatedAt: new Date() } });
  res.json({ success: true, data: inquiry });
}));

router.get('/stats', wrap(async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [todayCount, monthCount, active, deactivated] = await Promise.all([
    prisma.student.count({ where: { schoolId: req.schoolId, admissionDate: { gte: today, lt: tomorrow } } }),
    prisma.student.count({ where: { schoolId: req.schoolId, admissionDate: { gte: monthStart, lt: tomorrow } } }),
    prisma.student.count({ where: { schoolId: req.schoolId, status: 'active', deletedAt: null } }),
    prisma.student.count({ where: { schoolId: req.schoolId, status: 'inactive' } }),
  ]);
  res.json({ success: true, data: { todayCount, monthCount, active, deactivated } });
}));

module.exports = router;
