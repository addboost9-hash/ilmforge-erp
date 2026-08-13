const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const canManage = (role) => ['super_admin', 'admin'].includes(role);

// ---------------------------------------------------------------------------
// GET /leave-balance?personType=&classId=&sessionId=&search=&year= — list balances
// FIX: previously returned raw LeaveBalance rows with no staff/student join,
// so LeaveBalancePage.jsx's r.staff?.name / r.staff?.designation always
// rendered blank, and the search/year query params it sends were ignored.
// ---------------------------------------------------------------------------
router.get('/', wrap(async (req, res) => {
  const { personType, classId, sessionId, search, year } = req.query;

  const where = {
    schoolId: req.schoolId,
    ...(personType && { personType }),
    ...(classId && { classId: parseInt(classId) }),
    ...(sessionId && { sessionId: parseInt(sessionId) }),
  };

  if (year && !sessionId) {
    const sessions = await prisma.session.findMany({
      where: { schoolId: req.schoolId, startDate: { gte: new Date(parseInt(year), 0, 1), lt: new Date(parseInt(year) + 1, 0, 1) } },
      select: { id: true },
    });
    where.sessionId = { in: sessions.map(s => s.id) };
  }

  const balances = await prisma.leaveBalance.findMany({ where, orderBy: { createdAt: 'desc' } });

  const staffIds   = balances.filter(b => ['staff', 'teacher'].includes(b.personType)).map(b => b.personId);
  const studentIds = balances.filter(b => b.personType === 'student').map(b => b.personId);

  const [staffRows, studentRows] = await Promise.all([
    staffIds.length ? prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true, designation: true } }) : [],
    studentIds.length ? prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, rollNo: true } }) : [],
  ]);
  const staffMap   = Object.fromEntries(staffRows.map(s => [s.id, s]));
  const studentMap = Object.fromEntries(studentRows.map(s => [s.id, s]));

  let data = balances.map(b => ({
    ...b,
    staff: ['staff', 'teacher'].includes(b.personType) ? staffMap[b.personId] || null : studentMap[b.personId] || null,
  }));

  if (search) {
    const q = search.toLowerCase();
    data = data.filter(b => b.staff?.name?.toLowerCase().includes(q));
  }

  res.json({ success: true, data });
}));

// ---------------------------------------------------------------------------
// GET /leave-balance/:personType/:personId — get one person's balance
// ---------------------------------------------------------------------------
router.get('/:personType/:personId', wrap(async (req, res) => {
  const { personType, personId } = req.params;
  const balance = await prisma.leaveBalance.findFirst({
    where: {
      schoolId: req.schoolId,
      personType,
      personId: parseInt(personId),
    },
  });
  if (!balance) {
    return res.status(404).json({ success: false, message: 'Leave balance record not found.' });
  }
  res.json({ success: true, data: balance });
}));

// ---------------------------------------------------------------------------
// POST /leave-balance/initialize — bulk create balances for a class or department
// Body: { classId?, department?, personType, totalAllowed, sessionId }
// ---------------------------------------------------------------------------
router.post('/initialize', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can initialize leave balances.' });
  }
  const { classId, department, personType, totalAllowed, sessionId } = req.body;
  if (!personType) return res.status(400).json({ success: false, message: 'personType is required.' });
  if (totalAllowed === undefined) return res.status(400).json({ success: false, message: 'totalAllowed is required.' });

  let persons = [];

  if (personType === 'student') {
    if (!classId) return res.status(400).json({ success: false, message: 'classId is required for student personType.' });
    persons = await prisma.student.findMany({
      where: { schoolId: req.schoolId, classId: parseInt(classId), deletedAt: null, status: 'active' },
      select: { id: true },
    });
  } else if (personType === 'staff' || personType === 'teacher') {
    const staffWhere = { schoolId: req.schoolId, deletedAt: null };
    if (department) staffWhere.department = department;
    persons = await prisma.staff.findMany({ where: staffWhere, select: { id: true } });
  } else {
    return res.status(400).json({ success: false, message: 'personType must be student, staff, or teacher.' });
  }

  if (persons.length === 0) {
    return res.status(404).json({ success: false, message: 'No matching persons found to initialize balances.' });
  }

  const created = [];
  const skipped = [];

  for (const person of persons) {
    const existing = await prisma.leaveBalance.findFirst({
      where: {
        schoolId: req.schoolId,
        personType,
        personId: person.id,
        ...(sessionId && { sessionId: parseInt(sessionId) }),
      },
    });
    if (existing) {
      skipped.push(person.id);
      continue;
    }
    const balance = await prisma.leaveBalance.create({
      data: {
        schoolId: req.schoolId,
        personType,
        personId: person.id,
        classId: classId ? parseInt(classId) : null,
        department: department || null,
        totalAllowed: parseInt(totalAllowed),
        consumed: 0,
        remaining: parseInt(totalAllowed),
        sessionId: sessionId ? parseInt(sessionId) : null,
      },
    });
    created.push(balance);
  }

  res.status(201).json({
    success: true,
    message: `${created.length} balances initialized, ${skipped.length} already existed (skipped).`,
    data: created,
    skipped,
  });
}));

// ---------------------------------------------------------------------------
// PUT /leave-balance/:id — update totalAllowed and/or consumed, recalc remaining
// ---------------------------------------------------------------------------
router.put('/:id', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can update leave balances.' });
  }
  const balanceId = parseInt(req.params.id);
  const balance = await prisma.leaveBalance.findFirst({
    where: { id: balanceId, schoolId: req.schoolId },
  });
  if (!balance) return res.status(404).json({ success: false, message: 'Leave balance record not found.' });

  const { totalAllowed, consumed } = req.body;

  const newTotal = totalAllowed !== undefined ? parseInt(totalAllowed) : balance.totalAllowed;
  const newConsumed = consumed !== undefined ? parseInt(consumed) : balance.consumed;
  const newRemaining = newTotal - newConsumed;

  if (newRemaining < 0) {
    return res.status(400).json({ success: false, message: 'consumed cannot exceed totalAllowed.' });
  }

  const updated = await prisma.leaveBalance.update({
    where: { id: balanceId },
    data: {
      totalAllowed: newTotal,
      consumed: newConsumed,
      remaining: newRemaining,
    },
  });
  res.json({ success: true, data: updated });
}));

module.exports = router;
