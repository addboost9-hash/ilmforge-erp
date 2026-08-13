const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const role = req.user.role;
  const roleFilter = ['admin','super_admin'].includes(role) ? {} : { targetRole: { in: ['all', role] } };
  const data = await prisma.announcement.findMany({
    where: { schoolId: req.schoolId, ...roleFilter },
    orderBy: { createdAt: 'desc' }, take: 50,
  });
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  // Matches the permission-matrix default (config/permissionMatrix.js), which grants
  // teachers canCreate on the announcements module — previously this hardcoded check
  // silently 403'd every teacher post despite the matrix allowing it.
  if (!['admin','super_admin','teacher'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins/teachers only.' });
  const { title, message, targetRole, channel } = req.body;
  if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message required.' });
  // Estimate recipient count
  let sentCount = 0;
  if (targetRole === 'all' || targetRole === 'parent') sentCount += await prisma.user.count({ where: { schoolId: req.schoolId, role: 'parent', isActive: true } });
  if (targetRole === 'all' || targetRole === 'teacher') sentCount += await prisma.user.count({ where: { schoolId: req.schoolId, role: 'teacher', isActive: true } });
  if (targetRole === 'all' || targetRole === 'student') sentCount += await prisma.user.count({ where: { schoolId: req.schoolId, role: 'student', isActive: true } });
  const ann = await prisma.announcement.create({
    data: { schoolId: req.schoolId, title, message, targetRole: targetRole || 'all', channel: channel || 'app', sentCount, createdBy: req.user.id }
  });
  res.status(201).json({ success: true, data: ann, sentCount });
}));

router.delete('/:id', wrap(async (req, res) => {
  if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins only.' });
  const id = parseInt(req.params.id);
  const existing = await prisma.announcement.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Announcement not found.' });
  await prisma.announcement.delete({ where: { id } });
  res.json({ success: true, message: 'Announcement deleted.' });
}));

module.exports = router;
