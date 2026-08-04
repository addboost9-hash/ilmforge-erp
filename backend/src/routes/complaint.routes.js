const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { status } = req.query;
  const complaints = await prisma.parentComplaint.findMany({
    where: { schoolId: req.schoolId, ...(status && { status }) }, orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: complaints });
}));
router.post('/', wrap(async (req, res) => {
  const { subject, description, parentId, studentId } = req.body;
  const complaint = await prisma.parentComplaint.create({ data: { schoolId: req.schoolId, campusId: req.campusId, subject, description, parentId: parentId ? parseInt(parentId) : null, studentId: studentId ? parseInt(studentId) : null } });
  res.status(201).json({ success: true, data: complaint });
}));
router.put('/:id', wrap(async (req, res) => {
  const { status } = req.body;
  const complaint = await prisma.parentComplaint.update({ where: { id: parseInt(req.params.id) }, data: { status, ...(status === 'resolved' && { resolvedAt: new Date() }) } });
  res.json({ success: true, data: complaint });
}));
module.exports = router;
