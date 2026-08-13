const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { status } = req.query;
  const role = req.user?.role;

  if (role === 'parent') {
    // Parents may only see their own complaints — never other parents' records.
    const parentRecord = await prisma.parent.findFirst({
      where: { userId: req.user.id, schoolId: req.schoolId },
    });
    if (!parentRecord) {
      return res.json({ success: true, data: [] });
    }
    const complaints = await prisma.parentComplaint.findMany({
      where: {
        schoolId: req.schoolId,
        parentId: parentRecord.id,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: complaints });
  }

  // admin / teacher / super_admin — see all school complaints
  const complaints = await prisma.parentComplaint.findMany({
    where: { schoolId: req.schoolId, ...(status && { status }) },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: complaints });
}));

router.post('/', wrap(async (req, res) => {
  const { subject, description, parentId, studentId } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ success: false, message: 'subject and description are required.' });
  }

  // FIX: this trusted a body-supplied `parentId` — the Parent Portal actually
  // sends the logged-in user's User.id (req.user.id) in that field, not the
  // Parent table's own id, so every complaint was saved under the wrong (or a
  // non-existent) parentId. GET / self-resolves the caller's Parent row via
  // req.user.id when listing "your complaints", so a complaint created this
  // way never matched and silently vanished from the parent's own list.
  // Self-resolve the same way here for parent callers; only trust an explicit
  // body parentId for staff roles creating a complaint on a parent's behalf.
  let resolvedParentId = null;
  if (req.user?.role === 'parent') {
    const parentRecord = await prisma.parent.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
    resolvedParentId = parentRecord?.id || null;
  } else if (parentId) {
    resolvedParentId = parseInt(parentId);
  }

  const complaint = await prisma.parentComplaint.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      subject,
      description,
      parentId: resolvedParentId,
      studentId: studentId ? parseInt(studentId) : null,
    },
  });
  res.status(201).json({ success: true, data: complaint });
}));

router.put('/:id', wrap(async (req, res) => {
  const { status, adminReply } = req.body;
  const complaintId = parseInt(req.params.id);
  const existing = await prisma.parentComplaint.findFirst({ where: { id: complaintId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Complaint not found.' });

  const complaint = await prisma.parentComplaint.update({
    where: { id: complaintId },
    data: {
      ...(status && { status }),
      ...(status === 'resolved' && { resolvedAt: new Date() }),
      ...(adminReply !== undefined && { adminReply }),
      ...(adminReply !== undefined && { repliedAt: new Date() }),
    },
  });
  res.json({ success: true, data: complaint });
}));

module.exports = router;
