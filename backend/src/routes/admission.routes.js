const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/inquiries', wrap(async (req, res) => {
  // Photos (about 40 KB each) are left out of the list so a long list stays
  // fast; hasPhoto says which have one, and GET /inquiries/:id/photo loads it.
  const [inquiries, withPhoto] = await Promise.all([
    prisma.admissionInquiry.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, schoolId: true, campusId: true, name: true, phone: true, classInterested: true, date: true, status: true, notes: true, createdAt: true, updatedAt: true },
    }),
    prisma.admissionInquiry.findMany({ where: { schoolId: req.schoolId, photoUrl: { not: null } }, select: { id: true } }),
  ]);
  const has = new Set(withPhoto.map((r) => r.id));
  res.json({ success: true, data: inquiries.map((i) => ({ ...i, hasPhoto: has.has(i.id) })) });
}));

// GET /api/v1/admissions/inquiries/:id/photo — the photo sent with one application.
router.get('/inquiries/:id/photo', wrap(async (req, res) => {
  const inquiry = await prisma.admissionInquiry.findFirst({
    where: { id: parseInt(req.params.id), schoolId: req.schoolId },
    select: { photoUrl: true },
  });
  if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found.' });
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.json({ success: true, data: { photoUrl: inquiry.photoUrl || null } });
}));

router.post('/inquiries', wrap(async (req, res) => {
  const { name, phone, classInterested, notes } = req.body;
  const inquiry = await prisma.admissionInquiry.create({ data: { schoolId: req.schoolId, campusId: req.campusId, name, phone, classInterested, notes } });
  res.status(201).json({ success: true, data: inquiry });
}));

router.put('/inquiries/:id', wrap(async (req, res) => {
  const { status, notes } = req.body;
  const id = parseInt(req.params.id);

  // IDOR: lookup was not scoped by schoolId — a user from another school could
  // mutate this record by guessing its id.
  const existing = await prisma.admissionInquiry.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Inquiry not found.' });

  const inquiry = await prisma.admissionInquiry.update({ where: { id }, data: { status, notes, updatedAt: new Date() } });
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
