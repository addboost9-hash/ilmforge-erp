const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const { teacherCanAccessClass } = require('../utils/teacherScope');

// Who decides leave: the school's management for anyone; a teacher only for
// students of the classes they teach (never staff leave, so never their own).
const MANAGERS = ['admin', 'super_admin', 'principal'];
const DECIDERS = [...MANAGERS, 'teacher'];
const DAY = 86400000;
const leaveDays = (l) => Math.round((new Date(l.toDate) - new Date(l.fromDate)) / DAY) + 1;

// The applicant's staff or student record (applications are keyed on the
// sign-in id; balances on the staff/student id).
async function applicantRecord(schoolId, leave) {
  return leave.applicantType === 'staff'
    ? prisma.staff.findFirst({ where: { userId: leave.applicantId, schoolId }, select: { id: true } })
    : prisma.student.findFirst({ where: { userId: leave.applicantId, schoolId }, select: { id: true, classId: true } });
}

async function mayDecide(req, leave) {
  if (MANAGERS.includes(req.user.role)) return true;
  if (req.user.role !== 'teacher' || leave.applicantType !== 'student') return false;
  const st = await applicantRecord(req.schoolId, leave);
  return !!(st?.classId && await teacherCanAccessClass(req, st.classId));
}

/* The one balance a leave counts against: the person's balance for the
   session the leave starts in, else one kept for no session, else the
   latest. Approval used to take the days off every balance the person had
   (each session's), and approving the same leave twice took them twice. */
async function balanceFor(schoolId, leave, person) {
  const balances = await prisma.leaveBalance.findMany({
    where: {
      schoolId, personId: person.id,
      personType: leave.applicantType === 'staff' ? { in: ['staff', 'teacher'] } : 'student',
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!balances.length) return null;
  const from = new Date(leave.fromDate);
  const sessionIds = [...new Set(balances.map((b) => b.sessionId).filter(Boolean))];
  const sessions = sessionIds.length
    ? await prisma.academicSession.findMany({ where: { id: { in: sessionIds }, schoolId }, select: { id: true, startDate: true, endDate: true } })
    : [];
  const current = sessions.find((x) => new Date(x.startDate) <= from && from <= new Date(x.endDate));
  return (current && balances.find((b) => b.sessionId === current.id))
    || balances.find((b) => !b.sessionId)
    || balances[0];
}

// Takes the leave's days off (sign -1 puts them back, when an approved leave
// is turned down after all).
async function applyToBalance(schoolId, leave, sign) {
  const days = leaveDays(leave);
  if (!(days > 0)) return;
  const person = await applicantRecord(schoolId, leave);
  if (!person) return;
  const bal = await balanceFor(schoolId, leave, person);
  if (!bal) return; // no balance kept for this person yet
  await prisma.leaveBalance.update({
    where: { id: bal.id },
    data: { consumed: { increment: sign * days }, remaining: { decrement: sign * days } },
  });
}

/* Approve or reject, once: the status changes only from another status
   (checked in the same write, so two clicks cannot both count), and the
   balance moves only when the leave becomes or stops being approved. */
async function decide(req, res, status) {
  const id = parseInt(req.params.id);
  const existing = await prisma.leaveApplication.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Leave not found.' });
  if (!(await mayDecide(req, existing))) {
    return res.status(403).json({ success: false, message: req.user.role === 'teacher' ? 'Teachers decide leave only for students of their own classes.' : 'Only the admin or principal can decide leave.' });
  }
  if (existing.status === status) {
    return res.status(409).json({ success: false, message: `This leave is already ${status}.` });
  }
  const approvalCode = status === 'approved' ? (existing.approvalCode || 'APR' + Date.now().toString(36).toUpperCase()) : existing.approvalCode;
  const { count } = await prisma.leaveApplication.updateMany({
    where: { id, schoolId: req.schoolId, status: existing.status },
    data: { status, approvedBy: req.user.id, approvalCode },
  });
  if (!count) return res.status(409).json({ success: false, message: 'Someone else has just decided this leave. Refresh the list.' });
  if (status === 'approved') await applyToBalance(req.schoolId, existing, 1);
  else if (existing.status === 'approved') await applyToBalance(req.schoolId, existing, -1);
  const leave = await prisma.leaveApplication.findUnique({ where: { id } });
  return res.json({ success: true, data: leave, approvalCode });
}

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
  const rows = await prisma.leaveApplication.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  const ids = (type) => [...new Set(rows.filter((r) => (type === 'staff') === (r.applicantType === 'staff')).map((r) => r.applicantId))];
  const [students, staff] = await Promise.all([
    ids('student').length ? prisma.student.findMany({ where: { schoolId: req.schoolId, userId: { in: ids('student') } }, select: { userId: true, name: true, rollNo: true, class: { select: { name: true } }, section: { select: { name: true } } } }) : [],
    ids('staff').length ? prisma.staff.findMany({ where: { schoolId: req.schoolId, userId: { in: ids('staff') } }, select: { userId: true, name: true, designation: true } }) : [],
  ]);
  const st = new Map(students.map((x) => [x.userId, x]));
  const sf = new Map(staff.map((x) => [x.userId, x]));
  const kind = (reason) => (/^\[([^\]]+)\]/.exec(String(reason || '')) || [])[1] || null;
  const data = rows.map((r) => {
    const who = r.applicantType === 'staff' ? sf.get(r.applicantId) : st.get(r.applicantId);
    return {
      ...r,
      days: leaveDays(r),
      leaveType: kind(r.reason),
      applicantName: who?.name || null,
      studentName: r.applicantType === 'staff' ? undefined : who?.name,
      rollNo: who?.rollNo || null,
      className: who?.class ? [who.class.name, who.section?.name].filter(Boolean).join(' ') : (who?.designation || null),
    };
  });
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

  if (MANAGERS.includes(req.user.role)) {
    // The student (by id or roll number) or the staff member it is for.
    const staffId = parseInt(req.body.staffId, 10);
    const studentId = parseInt(req.body.studentId, 10);
    const roll = String(req.body.rollNo || '').trim().toLowerCase();
    let who = null;
    if (staffId) {
      finalApplicantType = 'staff';
      who = await prisma.staff.findFirst({ where: { id: staffId, schoolId: req.schoolId, deletedAt: null }, select: { name: true, userId: true } });
    } else if (studentId || roll) {
      finalApplicantType = 'student';
      if (studentId) who = await prisma.student.findFirst({ where: { id: studentId, schoolId: req.schoolId, deletedAt: null }, select: { name: true, userId: true } });
      else {
        const hits = (await prisma.student.findMany({ where: { schoolId: req.schoolId, deletedAt: null, rollNo: { not: null } }, select: { name: true, userId: true, rollNo: true } }))
          .filter((x) => String(x.rollNo).trim().toLowerCase() === roll);
        if (hits.length > 1) return res.status(400).json({ success: false, message: `Roll number ${req.body.rollNo} belongs to more than one student.` });
        who = hits[0] || null;
      }
    } else if (applicantId) {
      // A sign-in id of this school (as before).
      who = await prisma.user.findFirst({ where: { id: parseInt(applicantId), schoolId: req.schoolId }, select: { name: true, id: true } });
      if (who) who.userId = who.id;
    }
    if (!who) return res.status(400).json({ success: false, message: 'Choose the student (roll number) or staff member this leave is for.' });
    if (!who.userId) return res.status(400).json({ success: false, message: `${who.name} has no portal account, so leave cannot be kept for them yet. Create their login first.` });
    finalApplicantId = who.userId;
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

// PATCH /api/v1/leaves/:id/approve | /reject
router.patch('/:id/approve', wrap(async (req, res) => {
  if (!DECIDERS.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Only the admin, principal or class teacher can approve leave.' });
  return decide(req, res, 'approved');
}));

router.patch('/:id/reject', wrap(async (req, res) => {
  if (!DECIDERS.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Only the admin, principal or class teacher can reject leave.' });
  return decide(req, res, 'rejected');
}));

// PUT /api/v1/leaves/:id/approve — kept for older apps; { status } may only
// be approved or rejected (any text used to be saved, with no balance change).
router.put('/:id/approve', wrap(async (req, res) => {
  if (!DECIDERS.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Only the admin, principal or class teacher can approve leave.' });
  const status = req.body?.status || 'approved';
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
  return decide(req, res, status);
}));

module.exports = router;
