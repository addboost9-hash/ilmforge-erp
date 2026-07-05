const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const DEFAULT_SOPS = [
  { title: 'Morning Assembly SOP', category: 'Daily Operations', content: '1. Gate opens 7:15 AM\n2. Assembly 7:45 sharp — line-wise class order\n3. Tilawat → National Anthem → announcements\n4. Class dismissal grade-wise' },
  { title: 'Fee Collection SOP', category: 'Finance', content: '1. Sirf receipt ke against cash lein\n2. Har payment turant ERP mein enter karein\n3. Din ke end pe cash count + ERP total match karein\n4. Discrepancy usi din report karein' },
  { title: 'Student Late Arrival SOP', category: 'Discipline', content: '1. 8:00 ke baad gate entry register mein likhein\n2. 3 late = parent ko SMS\n3. 5 late = principal meeting' },
  { title: 'Exam Conduct SOP', category: 'Academics', content: '1. Paper seal exam se 15 min pehle open\n2. Seating plan roll-number-wise\n3. Invigilator mobile off\n4. Marks entry 48 ghante ke andar ERP mein' },
  { title: 'Parent Complaint Handling SOP', category: 'Relations', content: '1. Complaint ERP mein log karein\n2. 24h ke andar first response\n3. Resolution 3 din mein\n4. Parent ko written response' },
];

router.get('/', wrap(async (req, res) => {
  let data = await prisma.sopDocument.findMany({ where: { OR: [{ schoolId: null }, { schoolId: req.schoolId }] }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  if (!data.length) {
    await prisma.sopDocument.createMany({ data: DEFAULT_SOPS.map((s, i) => ({ ...s, schoolId: req.schoolId, sortOrder: i })) });
    data = await prisma.sopDocument.findMany({ where: { schoolId: req.schoolId } });
  }
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content required.' });
  const sop = await prisma.sopDocument.create({ data: { schoolId: req.schoolId, title, category: category || 'General', content } });
  res.status(201).json({ success: true, data: sop });
}));

module.exports = router;
