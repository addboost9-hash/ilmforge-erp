const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// FIX: the mobile Parent Portal's entire home/attendance/fees/results screens
// call GET /parent/children and GET /parent/fees, but the only /parent(s)
// mount in the backend is /api/v1/parents (ADMIN_ONLY, admin's parent list —
// see parent.routes.js) — there was no self-service "my children" endpoint
// for an actual parent to call. Every one of these calls 404'd.

const STATUS_CODE = { present: 'P', absent: 'A', leave: 'L', late: 'Lt' };

async function resolveParent(req) {
  return prisma.parent.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId }, select: { id: true } });
}

// GET /parent/children — this parent's own children, with today's attendance.
router.get('/children', wrap(async (req, res) => {
  const parent = await resolveParent(req);
  if (!parent) return res.json({ success: true, data: [] });

  const links = await prisma.parentStudent.findMany({
    where: { schoolId: req.schoolId, parentId: parent.id },
    select: {
      student: {
        select: { id: true, name: true, rollNo: true, class: { select: { name: true } } },
      },
    },
  });
  const students = links.map(l => l.student).filter(Boolean);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const todayRecords = students.length
    ? await prisma.attendance.findMany({
        where: { schoolId: req.schoolId, studentId: { in: students.map(s => s.id) }, date: { gte: todayStart, lt: todayEnd } },
        select: { studentId: true, status: true },
      })
    : [];
  const attendanceMap = Object.fromEntries(todayRecords.map(r => [r.studentId, STATUS_CODE[r.status] || null]));

  const data = students.map(s => ({
    id: s.id,
    name: s.name,
    rollNo: s.rollNo,
    class: s.class ? { name: s.class.name } : null,
    todayAttendance: attendanceMap[s.id] || null,
  }));

  res.json({ success: true, data });
}));

// GET /parent/fees — this parent's children's fee invoices, grouped by child.
router.get('/fees', wrap(async (req, res) => {
  const parent = await resolveParent(req);
  if (!parent) return res.json({ success: true, data: [] });

  const links = await prisma.parentStudent.findMany({
    where: { schoolId: req.schoolId, parentId: parent.id },
    select: { student: { select: { id: true, name: true } } },
  });
  const students = links.map(l => l.student).filter(Boolean);

  const data = await Promise.all(students.map(async (s) => {
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId: req.schoolId, studentId: s.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 24,
      select: { id: true, feeTitle: true, month: true, year: true, totalAmount: true, dueAmount: true, status: true, dueDate: true },
    });
    return {
      id: s.id,
      name: s.name,
      invoices: invoices.map(inv => ({
        id: inv.id,
        month: `${inv.month || ''} ${inv.year || ''}`.trim() || inv.feeTitle,
        amount: inv.totalAmount,
        status: inv.status === 'paid' ? 'paid' : 'pending',
        dueDate: inv.dueDate,
      })),
    };
  }));

  res.json({ success: true, data });
}));

module.exports = router;
