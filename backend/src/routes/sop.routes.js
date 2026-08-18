const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Mounted with only `protect` in app.js (no role gate, no PM check).
// SOPs are internal staff procedure documents — no student/parent use case.
const staffOnly = (req, res, next) => {
  if (!['admin', 'super_admin', 'principal', 'teacher'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Staff only.' });
  }
  next();
};
const adminOnly = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admins only.' });
  }
  next();
};

const DEFAULT_SOPS = [
  { title: 'Morning Assembly SOP', category: 'Daily Operations', content: '1. Gate opens 7:15 AM\n2. Assembly 7:45 sharp — line-wise class order\n3. Tilawat → National Anthem → announcements\n4. Class dismissal grade-wise' },
  { title: 'Fee Collection SOP', category: 'Finance', content: '1. Only accept cash against a receipt\n2. Enter every payment into the ERP immediately\n3. Match the cash count with the ERP total at the end of the day\n4. Report any discrepancy the same day' },
  { title: 'Student Late Arrival SOP', category: 'Discipline', content: '1. Record gate entry in the register for arrivals after 8:00 AM\n2. 3 late arrivals = SMS sent to parent\n3. 5 late arrivals = meeting with the principal' },
  { title: 'Exam Conduct SOP', category: 'Academics', content: '1. Open the sealed paper 15 minutes before the exam\n2. Seating plan arranged by roll number\n3. Invigilators must switch off mobile phones\n4. Enter marks into the ERP within 48 hours' },
  { title: 'Parent Complaint Handling SOP', category: 'Relations', content: '1. Log the complaint in the ERP\n2. Provide a first response within 24 hours\n3. Resolve within 3 days\n4. Send the parent a written response' },
];

router.get('/', staffOnly, wrap(async (req, res) => {
  let data = await prisma.sopDocument.findMany({ where: { OR: [{ schoolId: null }, { schoolId: req.schoolId }] }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  if (!data.length) {
    await prisma.sopDocument.createMany({ data: DEFAULT_SOPS.map((s, i) => ({ ...s, schoolId: req.schoolId, sortOrder: i })) });
    data = await prisma.sopDocument.findMany({ where: { schoolId: req.schoolId } });
  }
  res.json({ success: true, data });
}));

router.post('/', adminOnly, wrap(async (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content required.' });
  const sop = await prisma.sopDocument.create({ data: { schoolId: req.schoolId, title, category: category || 'General', content } });
  res.status(201).json({ success: true, data: sop });
}));

module.exports = router;
