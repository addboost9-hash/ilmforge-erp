const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET — role-filtered notices
router.get('/', wrap(async (req, res) => {
  const role = req.user.role;
  const roleFilter = role === 'admin' || role === 'super_admin'
    ? {}
    : { targetRole: { in: ['all', role === 'gatekeeper' ? 'staff' : role] } };
  const data = await prisma.noticeboard.findMany({
    where: { schoolId: req.schoolId, ...roleFilter, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }], take: 50,
  });
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins only.' });
  const { title, message, targetRole, isPinned, expiresAt } = req.body;
  if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message required.' });
  const notice = await prisma.noticeboard.create({
    data: { schoolId: req.schoolId, title, message, targetRole: targetRole || 'all', isPinned: !!isPinned, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: req.user.id }
  });
  res.status(201).json({ success: true, data: notice });
}));

router.delete('/:id', wrap(async (req, res) => {
  if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ success: false });
  await prisma.noticeboard.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
}));

module.exports = router;
