const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const data = await prisma.videoTutorial.findMany({
    where: { OR: [{ schoolId: null }, { schoolId: req.schoolId }] },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ success: false });
  const { title, category, videoUrl, duration } = req.body;
  if (!title || !videoUrl) return res.status(400).json({ success: false, message: 'Title and URL required.' });
  const t = await prisma.videoTutorial.create({ data: { schoolId: req.schoolId, title, category: category || 'General', videoUrl, duration } });
  res.status(201).json({ success: true, data: t });
}));

module.exports = router;
