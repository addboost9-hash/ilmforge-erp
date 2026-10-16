const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const ADMIN_ROLES = ['admin', 'super_admin', 'teacher'];

// Ownership: resolve the student User-ids that belong to this parent's own
// children (ParentStudent links Parent -> Student, and Student.userId is the
// login id leave applications are keyed on).
async function getOwnChildren(req) {
  const parent = await prisma.parent.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
  if (!parent) return [];
  const links = await prisma.parentStudent.findMany({
    where: { parentId: parent.id, schoolId: req.schoolId },
    include: { student: { select: { id: true, name: true, userId: true } } },
  });
  return links.map((l) => l.student).filter(Boolean);
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
    // One child (?studentId=, the portal's child switcher) or all of them.
    const kids = await getOwnChildren(req);
    const one = req.query.studentId ? kids.find((k) => k.id === parseInt(req.query.studentId, 10)) : null;
    const childUserIds = (one ? [one] : kids).map((k) => k.userId).filter(Boolean);
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
  const { applicantType, applicantId, fromDate, toDate } = req.body;
  if (!fromDate || !toDate || !String(req.body.reason || '').trim()) return res.status(400).json({ success: false, message: 'Dates and reason required.' });
  if (new Date(toDate) < new Date(fromDate)) return res.status(400).json({ success: false, message: 'The leave cannot end before it starts.' });
  // The kind of leave (Sick, Casual…) has no column of its own: it leads the
  // reason, so whoever approves it sees it. It used to be dropped.
  const kind = String(req.body.leaveType || req.body.type || '').trim();
  const text = String(req.body.reason).trim();
  const reason = kind && !text.startsWith('[') ? `[${kind}] ${text}` : text;

  let finalApplicantId = req.user.id;
  let finalApplicantType = applicantType || (req.user.role === 'teacher' ? 'staff' : 'student');

  if (['admin', 'super_admin'].includes(req.user.role)) {
    // Admins/super admins may file on behalf of any staff/student.
    if (applicantId) finalApplicantId = parseInt(applicantId);
  } else if (req.user.role === 'parent') {
    finalApplicantType = 'student';
    // The portal sends the child's student id; applications are kept under
    // the child's sign-in id. Comparing the two meant a parent's leave
    // application was always refused.
    const kids = await getOwnChildren(req);
    const wanted = parseInt(req.body.studentId ?? applicantId, 10);
    const child = kids.find((k) => k.id === wanted) || kids.find((k) => k.userId === wanted);
    if (!child) return res.status(403).json({ success: false, message: 'You can only file leave for your own child.' });
    if (!child.userId) return res.status(400).json({ success: false, message: `${child.name} has no student portal account yet, so the school must record this leave.` });
    finalApplicantId = child.userId;
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
