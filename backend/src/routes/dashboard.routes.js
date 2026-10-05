/**
 * IlmForge — Dashboard Routes (Optimized)
 * Fixed: N+1 class-stats loop (60+ queries → 4 queries)
 * Fixed: Monthly chart loop (24 sequential → 2 parallel)
 * All stats fetched in parallel with Promise.all
 */
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/dashboard/stats
router.get('/stats', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const now       = new Date();
  const today     = new Date(now); today.setHours(0,0,0,0);
  const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── 1. Core stats — all in ONE Promise.all ────────────────────────────────
  const [
    totalStudents, maleStudents, femaleStudents, passoutStudents,
    totalStaff, presentStaff, absentStaff,
    unpaidInvoices,
    incomeToday, expenseToday, incomeMonth,
    presentStudentsToday,
    // New admissions this month
    newThisMonth,
    // Recent payments (last 10)
    recentPayments,
    // Recent admissions (last 5)
    recentStudents,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: 'active', deletedAt: null } }),
    prisma.student.count({ where: { schoolId, status: 'active', gender: { in: ['Male','male','M'] }, deletedAt: null } }),
    prisma.student.count({ where: { schoolId, status: 'active', gender: { in: ['Female','female','F'] }, deletedAt: null } }),
    prisma.student.count({ where: { schoolId, status: 'passout', deletedAt: null } }),
    prisma.staff.count({ where: { schoolId, isActive: true, deletedAt: null } }),
    prisma.staffAttendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }),
    prisma.staffAttendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'absent' } }),
    prisma.feeInvoice.count({ where: { schoolId, status: { in: ['unpaid', 'partial', 'overdue'] } } }),
    prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { voidedAt: null, schoolId, paymentDate: { gte: today, lt: tomorrow } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { schoolId, date: { gte: today, lt: tomorrow } } }),
    prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { voidedAt: null, schoolId, paymentDate: { gte: monthStart, lt: tomorrow } } }),
    prisma.attendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }).catch(() => 0),
    prisma.student.count({ where: { schoolId, deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.feePayment.findMany({
      where: { voidedAt: null, schoolId },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      select: {
        id: true, amountPaid: true, paymentDate: true, studentId: true, method: true,
        invoice: { select: { student: { select: { name: true, rollNo: true } } } },
      },
    }).then(payments => payments.map(p => ({
      ...p,
      student: p.invoice?.student || null,
    }))),
    prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, rollNo: true, createdAt: true, class: { select: { name: true } } },
    }),
  ]);

  const incomeTodayVal  = incomeToday._sum.amountPaid || 0;
  const expenseTodayVal = expenseToday._sum.amount    || 0;
  const incomeMonthVal  = incomeMonth._sum.amountPaid  || 0;

  // ── 2. Monthly chart — 2 queries (not 24 sequential) ─────────────────────
  const yearAgo = new Date(now); yearAgo.setMonth(yearAgo.getMonth() - 11); yearAgo.setDate(1); yearAgo.setHours(0,0,0,0);

  const [monthlyPayments, monthlyExpenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: { voidedAt: null, schoolId, paymentDate: { gte: yearAgo } },
      select: { amountPaid: true, paymentDate: true },
    }),
    prisma.expense.findMany({
      where: { schoolId, date: { gte: yearAgo } },
      select: { amount: true, date: true },
    }),
  ]);

  // Group by month in JavaScript (fast, no extra queries)
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthMap = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthMap[key] = { month: MONTHS_SHORT[d.getMonth()], income: 0, expense: 0 };
  }
  monthlyPayments.forEach(p => {
    const d = new Date(p.paymentDate);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[k]) monthMap[k].income += p.amountPaid || 0;
  });
  monthlyExpenses.forEach(e => {
    const d = new Date(e.date);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[k]) monthMap[k].expense += e.amount || 0;
  });
  const monthlyChart = Object.values(monthMap);

  // ── 2b. Fee & attendance trend charts — 2 more queries, grouped in JS ────
  const lastYearStart  = new Date(now.getFullYear() - 1, 0, 1);
  const nextYearStart  = new Date(now.getFullYear() + 1, 0, 1);
  const sixMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [feePaymentsTwoYears, attendanceSixMonths] = await Promise.all([
    prisma.feePayment.findMany({
      where: { voidedAt: null, schoolId, paymentDate: { gte: lastYearStart, lt: nextYearStart } },
      select: { amountPaid: true, paymentDate: true },
    }),
    prisma.attendance.findMany({
      where: { schoolId, date: { gte: sixMonthsAgo, lt: tomorrow } },
      select: { date: true, status: true },
    }).catch(() => []),
  ]);

  const monthlyFeeThisYear = Array(12).fill(0);
  const monthlyFeeLastYear = Array(12).fill(0);
  feePaymentsTwoYears.forEach(p => {
    const d = new Date(p.paymentDate);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (y === now.getFullYear())       monthlyFeeThisYear[m] += p.amountPaid || 0;
    else if (y === now.getFullYear() - 1) monthlyFeeLastYear[m] += p.amountPaid || 0;
  });

  const attMonthMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    attMonthMap[key] = { month: MONTHS_SHORT[d.getMonth()], present: 0, absent: 0 };
  }
  (attendanceSixMonths || []).forEach(a => {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!attMonthMap[key]) return;
    if (a.status === 'present') attMonthMap[key].present += 1;
    else if (a.status === 'absent') attMonthMap[key].absent += 1;
  });
  const attendanceTrend = Object.values(attMonthMap);

  // ── 3. Class-wise stats — 3 queries instead of 3N queries ────────────────
  const [classes, studentsByClass, attendanceByClass, feeByClass] = await Promise.all([
    prisma.class.findMany({ where: { schoolId, isActive: true }, orderBy: { orderNo: 'asc' }, select: { id: true, name: true } }),
    prisma.student.groupBy({ by: ['classId'], _count: { id: true }, where: { schoolId, status: 'active', deletedAt: null } }),
    prisma.attendance.groupBy({ by: ['classId'], _count: { id: true }, where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }).catch(() => []),
    prisma.feeInvoice.groupBy({ by: ['classId'], _sum: { totalAmount: true, paidAmount: true, dueAmount: true }, where: { schoolId } }),
  ]);

  const stuMap  = Object.fromEntries(studentsByClass.map(s => [s.classId, s._count.id]));
  const attMap  = Object.fromEntries((attendanceByClass || []).map(a => [a.classId, a._count.id]));
  const feeMap  = Object.fromEntries(feeByClass.map(f => [f.classId, f._sum]));

  const classStats = classes.map(c => ({
    classId:      c.id,
    className:    c.name,
    strength:     stuMap[c.id]  || 0,
    presentToday: attMap[c.id]  || 0,
    expectedFee:  feeMap[c.id]?.totalAmount || 0,
    paidFee:      feeMap[c.id]?.paidAmount  || 0,
    balanceFee:   feeMap[c.id]?.dueAmount   || 0,
  }));

  // Revalidate: a 30s browser cache meant the dashboard could still show the
  // old totals right after a fee was collected or attendance was marked.
  res.setHeader('Cache-Control', 'private, no-cache');
  res.json({
    success: true,
    data: {
      students: {
        total: totalStudents, male: maleStudents,
        female: femaleStudents, passout: passoutStudents,
        presentToday: presentStudentsToday,
        newThisMonth,
      },
      staff: { total: totalStaff, presentToday: presentStaff, absentToday: absentStaff },
      finance: {
        unpaidInvoices, incomeToday: incomeTodayVal,
        expenseToday: expenseTodayVal,
        profitToday:  incomeTodayVal - expenseTodayVal,
        incomeThisMonth: incomeMonthVal,
      },
      monthlyChart,
      monthlyFeeThisYear,
      monthlyFeeLastYear,
      attendanceTrend,
      classStats,
      recentPayments,
      recentStudents,
    },
  });
}));

/**
 * GET /api/v1/dashboard/alerts
 * What the bell in the admin header shows: things that arrived and still
 * need someone in the office to act. Read state is kept by the browser
 * (last time the bell was opened), so this only reports what is open.
 */
const ALERT_ROLES = ['super_admin', 'admin', 'principal'];
const fmtDay = (d) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

router.get('/alerts', wrap(async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-cache');
  if (!ALERT_ROLES.includes(req.user?.role)) {
    return res.json({ success: true, data: { items: [], counts: { admissions: 0, complaints: 0, leaves: 0 } } });
  }
  const schoolId = req.schoolId;
  const [admissions, admissionCount, complaints, complaintCount, leaves, leaveCount] = await Promise.all([
    prisma.admissionInquiry.findMany({
      where: { schoolId, status: 'open' }, orderBy: { createdAt: 'desc' }, take: 15,
      select: { id: true, name: true, phone: true, classInterested: true, notes: true, createdAt: true },
    }),
    prisma.admissionInquiry.count({ where: { schoolId, status: 'open' } }),
    prisma.parentComplaint.findMany({
      where: { schoolId, status: 'open' }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, subject: true, createdAt: true },
    }).catch(() => []),
    prisma.parentComplaint.count({ where: { schoolId, status: 'open' } }).catch(() => 0),
    prisma.leaveApplication.findMany({
      where: { schoolId, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, applicantType: true, applicantId: true, fromDate: true, toDate: true, createdAt: true },
    }).catch(() => []),
    prisma.leaveApplication.count({ where: { schoolId, status: 'pending' } }).catch(() => 0),
  ]);

  // Names for leave requests (applicantId points at a student or a staff row).
  const ids = (type) => leaves.filter((l) => l.applicantType === type).map((l) => l.applicantId);
  const [students, staff] = await Promise.all([
    ids('student').length ? prisma.student.findMany({ where: { schoolId, id: { in: ids('student') } }, select: { id: true, name: true } }) : [],
    ids('staff').length ? prisma.staff.findMany({ where: { schoolId, id: { in: ids('staff') } }, select: { id: true, name: true } }) : [],
  ]);
  const nameOf = (l) => (l.applicantType === 'staff' ? staff : students).find((p) => p.id === l.applicantId)?.name;

  const items = [
    ...admissions.map((a) => ({
      type: 'admission',
      id: `admission-${a.id}`,
      title: 'New admission application',
      body: [a.name, a.classInterested, a.phone].filter(Boolean).join(' · '),
      online: /^Source: Online admission form/.test(a.notes || ''),
      at: a.createdAt,
      link: '/admissions/inquiries',
    })),
    ...complaints.map((c) => ({
      type: 'complaint', id: `complaint-${c.id}`, title: 'New parent complaint', body: c.subject, at: c.createdAt, link: '/complaints',
    })),
    ...leaves.map((l) => ({
      type: 'leave',
      id: `leave-${l.id}`,
      title: l.applicantType === 'staff' ? 'Staff leave request' : 'Student leave request',
      body: `${nameOf(l) || 'Unknown'} · ${fmtDay(l.fromDate)} – ${fmtDay(l.toDate)}`,
      at: l.createdAt,
      link: '/leaves',
    })),
  ].sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 25);

  res.json({
    success: true,
    data: { items, counts: { admissions: admissionCount, complaints: complaintCount, leaves: leaveCount } },
  });
}));

module.exports = router;
