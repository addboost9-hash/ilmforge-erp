const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const ADMIN_ROLES = ['admin', 'super_admin', 'teacher'];

// Ownership: resolve the student User-ids that belong to this parent's own
// children (ParentStudent links Parent -> Student, and Student.userId is the
// login id leave applications are keyed on).
async function getOwnChildUserIds(req) {
  const parent = await prisma.parent.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
  if (!parent) return [];
  const links = await prisma.parentStudent.findMany({
    where: { parentId: parent.id, schoolId: req.schoolId },
    include: { student: { select: { userId: true } } },
  });
  return links.map((l) => l.student?.userId).filter(Boolean);
}

// GET /api/v1/leaves — role-scoped
// No ownership check for the `parent` role — parent has canView on the
// `leaves` module (module-level PM has no concept of "own child"), so a
// parent hitting this with no filter saw every staff and student leave
// application in the school. Scope parents to their own children's leaves.
router.get('/', wrap(async (req, res) => {
  const where = { schoolId: req.schoolId };
  // Teachers/students see only their own applications
  if (req.user.role === 'teacher' || req.user.role === 'student') {
    where.applicantId = req.user.id;
    where.applicantType = req.user.role === 'teacher' ? 'staff' : 'student';
  } else if (req.user.role === 'parent') {
    const childUserIds = await getOwnChildUserIds(req);
    where.applicantType = 'student';
    where.applicantId = { in: childUserIds.length ? childUserIds : [-1] };
  }
  const data = await prisma.leaveApplication.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data });
}));

// POST /api/v1/leaves
// IDOR/impersonation: applicantId was taken straight from the request body
// with no ownership check, so a parent (or teacher/student) could pass any
// other person's id and file a leave application in their name. Non-admin
// callers may now only file for themselves, and parents only for their own
// child (verified via ParentStudent).
router.post('/', wrap(async (req, res) => {
  const { applicantType, applicantId, fromDate, toDate, reason } = req.body;
  if (!fromDate || !toDate || !reason) return res.status(400).json({ success: false, message: 'Dates and reason required.' });

  let finalApplicantId = req.user.id;
  let finalApplicantType = applicantType || (req.user.role === 'teacher' ? 'staff' : 'student');

  if (['admin', 'super_admin'].includes(req.user.role)) {
    // Admins/super admins may file on behalf of any staff/student.
    if (applicantId) finalApplicantId = parseInt(applicantId);
  } else if (req.user.role === 'parent') {
    finalApplicantType = 'student';
    const childUserIds = await getOwnChildUserIds(req);
    const requestedId = applicantId ? parseInt(applicantId) : null;
    if (!requestedId || !childUserIds.includes(requestedId)) {
      return res.status(403).json({ success: false, message: 'You can only file leave for your own child.' });
    }
    finalApplicantId = requestedId;
  }
  // teacher/student roles always file for themselves (finalApplicantId stays req.user.id)

  const leave = await prisma.leaveApplication.create({
    data: {
      schoolId: req.schoolId,
      applicantType: finalApplicantType,
      applicantId: finalApplicantId,
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

  // Auto-deduct leave balance when approved.
  // FIX: this previously checked existing.staffId / existing.days, fields that
  // don't exist on LeaveApplication (it has applicantType/applicantId and
  // fromDate/toDate instead), so the deduction never ran for any approval.
  // applicantId is a User.id, while LeaveBalance.personId is the Staff.id /
  // Student.id, so it must be resolved via the corresponding staff/student row.
  const days = Math.round((new Date(existing.toDate) - new Date(existing.fromDate)) / 86400000) + 1;
  const person = existing.applicantType === 'staff'
    ? await prisma.staff.findFirst({ where: { userId: existing.applicantId, schoolId: req.schoolId }, select: { id: true } })
    : await prisma.student.findFirst({ where: { userId: existing.applicantId, schoolId: req.schoolId }, select: { id: true } });

  if (person && days > 0) {
    await prisma.leaveBalance.updateMany({
      where: {
        schoolId: req.schoolId,
        personId: person.id,
        personType: existing.applicantType === 'staff' ? { in: ['staff', 'teacher'] } : 'student',
      },
      data: { consumed: { increment: days }, remaining: { decrement: days } },
    }).catch(() => {}); // Don't fail approval if no balance record exists yet
  }

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
