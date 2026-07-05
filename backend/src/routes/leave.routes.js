const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const ADMIN_ROLES = ['admin', 'super_admin', 'teacher'];

// GET /api/v1/leaves — role-scoped
router.get('/', wrap(async (req, res) => {
  const where = { schoolId: req.schoolId };
  // Teachers/students see only their own applications
  if (req.user.role === 'teacher' || req.user.role === 'student') {
    where.applicantId = req.user.id;
    where.applicantType = req.user.role === 'teacher' ? 'staff' : 'student';
  }
  const data = await prisma.leaveApplication.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data });
}));

// POST /api/v1/leaves
router.post('/', wrap(async (req, res) => {
  const { applicantType, applicantId, fromDate, toDate, reason } = req.body;
  if (!fromDate || !toDate || !reason) return res.status(400).json({ success: false, message: 'Dates and reason required.' });
  const leave = await prisma.leaveApplication.create({
    data: {
      schoolId: req.schoolId,
      applicantType: applicantType || (req.user.role === 'teacher' ? 'staff' : 'student'),
      applicantId: parseInt(applicantId) || req.user.id,
      fromDate: new Date(fromDate), toDate: new Date(toDate), reason,
    }
  });
  res.status(201).json({ success: true, data: leave });
}));

// PATCH /api/v1/leaves/:id/approve — admin/super_admin/teacher only
router.patch('/:id/approve', wrap(async (req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only admins or teachers can approve leaves.' });
  }
  const id = parseInt(req.params.id);
  // Ensure the leave belongs to this school before updating
  const existing = await prisma.leaveApplication.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Leave not found.' });
  const leave = await prisma.leaveApplication.update({
    where: { id },
    data: { status: 'approved', approvedBy: req.user.id },
  });
  res.json({ success: true, data: leave });
}));

// PATCH /api/v1/leaves/:id/reject — admin/super_admin/teacher only
router.patch('/:id/reject', wrap(async (req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only admins or teachers can reject leaves.' });
  }
  const id = parseInt(req.params.id);
  // Ensure the leave belongs to this school before updating
  const existing = await prisma.leaveApplication.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Leave not found.' });
  const leave = await prisma.leaveApplication.update({
    where: { id },
    data: { status: 'rejected', approvedBy: req.user.id },
  });
  res.json({ success: true, data: leave });
}));

// PUT /api/v1/leaves/:id/approve — kept for backwards compatibility
router.put('/:id/approve', wrap(async (req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only admins or teachers can approve leaves.' });
  }
  const id = parseInt(req.params.id);
  const existing = await prisma.leaveApplication.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Leave not found.' });
  const approvalCode = 'APR' + Date.now().toString(36).toUpperCase();
  const leave = await prisma.leaveApplication.update({
    where: { id },
    data: { status: req.body.status || 'approved', approvedBy: req.user.id, approvalCode },
  });
  res.json({ success: true, data: leave, approvalCode });
}));

module.exports = router;
