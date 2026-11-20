/**
 * IlmForge — Admin dashboard API.
 *
 * One call returns everything the admin dashboard renders, so the page makes
 * a single request instead of a dozen and stays inside the 1.5s budget.
 *
 * The numbers here are computed from live records; the judgement about what
 * may be *shown* is delegated to services/insights, which is pure and unit
 * testable. This route's only job is loading rows and shaping the response.
 *
 * Money is stored in paisa throughout. It is returned in paisa and formatted
 * once, on the client, so there is exactly one place that can get it wrong.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { healthScore, DEFAULT_WEIGHTS, TARGETS } = require('../services/insights/healthScore');
const { monthsCovered, capabilities } = require('../services/insights/dataWindow');
const { explain } = require('../services/insights/explain');

const { monthNumber } = require('../utils/feeMonth');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

/* Pakistan days. The live server runs in UTC, so "today" and "this month"
   built from the server clock started at 5 a.m. Pakistan time, and fees
   taken before then fell on the previous day or month.
   - Money (payment and expense instants): the Pakistan day, pkStart().
   - Attendance: saved at the server's local midnight of the day chosen
     (attendance.routes: new Date('YYYY-MM-DD').setHours(0)), so it is looked
     up the same way, attDay(). */
const PKT = 5 * 3600e3;
const pkYmd = (t = Date.now()) => new Date(new Date(t).getTime() + PKT).toISOString().slice(0, 10);
const pkStart = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d) - PKT); };
const addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const addMonths = (ymd, n) => { const [y, m] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10); };
const attDay = (ymd) => { const d = new Date(ymd); d.setHours(0, 0, 0, 0); return d; };
const localYmd = (d) => { const t = new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
/** Pakistan year and month (0-11) of an instant. */
const pkYm = (d) => { const t = new Date(new Date(d).getTime() + PKT); return { year: t.getUTCFullYear(), month: t.getUTCMonth() }; };
// Late is present (in class, just late).
const PRESENT = ['present', 'late'];

const monthLabel = (y, m) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] + ' ' + y;

/**
 * GET /api/v1/dashboard/admin/overview
 * Query: months (how much history to return, default 12, max 36)
 */
router.get('/overview', wrap(async (req, res) => {
  const { schoolId } = req;
  const months = Math.min(Math.max(parseInt(req.query.months) || 12, 1), 36);

  const todayYmd = pkYmd();
  const monthYmd = `${todayYmd.slice(0, 8)}01`;
  // Money: Pakistan days.
  const today = pkStart(todayYmd);
  const tomorrow = pkStart(addDays(todayYmd, 1));
  const monthStart = pkStart(monthYmd);
  const windowStart = pkStart(addMonths(monthYmd, -(months - 1)));
  // Attendance: as the register saves it.
  const attToday = attDay(todayYmd);
  const attTomorrow = attDay(addDays(todayYmd, 1));
  const attMonthStart = attDay(monthYmd);

  // Voided payments are corrections, not money taken, so they are excluded
  // everywhere a total is computed - the same rule the fee pages use.
  const livePayment = { schoolId, voidedAt: null };

  const [
    students, staff, campuses,
    invoiceAgg, paidToday, paidMonth,
    paymentsWindow, expensesWindow,
    attendanceMonth, staffAttendanceMonth,
    defaulters, owedAgg, withdrawn,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: 'active', deletedAt: null } }),
    prisma.staff.count({ where: { schoolId, isActive: true, deletedAt: null } }).catch(() => 0),
    prisma.campus.findMany({ where: { schoolId }, select: { id: true, name: true, isMain: true } }),

    // Cancelled bills (a deleted student's) are not money the school asked for.
    prisma.feeInvoice.aggregate({
      where: { schoolId, status: { not: 'cancelled' } },
      _sum: { totalAmount: true, lateFee: true, paidAmount: true, dueAmount: true, discount: true },
      _count: true,
    }),
    prisma.feePayment.aggregate({
      where: { ...livePayment, paymentDate: { gte: today, lt: tomorrow } },
      _sum: { amountPaid: true },
    }),
    prisma.feePayment.aggregate({
      where: { ...livePayment, paymentDate: { gte: monthStart, lt: tomorrow } },
      _sum: { amountPaid: true },
    }),

    prisma.feePayment.findMany({
      where: { ...livePayment, paymentDate: { gte: windowStart } },
      select: { amountPaid: true, discount: true, paymentDate: true, invoice: { select: { campusId: true } } },
    }),
    prisma.expense.findMany({
      where: { schoolId, date: { gte: windowStart } },
      select: { amount: true, date: true, campusId: true, categoryId: true },
    }),

    prisma.attendance.groupBy({
      by: ['status'],
      where: { schoolId, date: { gte: attMonthStart, lt: attTomorrow } },
      _count: { id: true },
    }).catch(() => []),
    prisma.staffAttendance.groupBy({
      by: ['status'],
      where: { schoolId, date: { gte: attMonthStart, lt: attTomorrow } },
      _count: { id: true },
    }).catch(() => []),

    prisma.feeInvoice.count({ where: { schoolId, status: { in: ['unpaid', 'partial', 'overdue'] } } }),
    prisma.feeInvoice.aggregate({ where: { schoolId, dueAmount: { gt: 0 } }, _sum: { dueAmount: true } }),
    prisma.student.count({
      where: { schoolId, deletedAt: null, status: { in: ['left', 'withdrawn', 'inactive'] }, updatedAt: { gte: windowStart } },
    }).catch(() => 0),
  ]);

  // Today's registers, so the dashboard can say what is still left to do.
  const [studentsToday, staffToday] = await Promise.all([
    prisma.attendance.groupBy({
      by: ['status'], where: { schoolId, date: { gte: attToday, lt: attTomorrow } }, _count: { id: true },
    }).catch(() => []),
    prisma.staffAttendance.groupBy({
      by: ['status'], where: { schoolId, date: { gte: attToday, lt: attTomorrow } }, _count: { id: true },
    }).catch(() => []),
  ]);
  const tally = (rows) => rows.reduce((t, r) => {
    t.marked += r._count.id;
    t[r.status] = (t[r.status] || 0) + r._count.id;
    return t;
  }, { marked: 0 });

  // Expense category names, so drivers read "Electricity" not "id 4".
  const categories = await prisma.expenseCategory
    .findMany({ where: { schoolId }, select: { id: true, name: true } })
    .catch(() => []);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  /* ── monthly series: only months that actually hold data ───────────── */
  const bucket = new Map();
  const touch = (d) => {
    const { year, month } = pkYm(d);
    const key = year * 12 + month;
    if (!bucket.has(key)) {
      bucket.set(key, {
        key, year, month,
        label: monthLabel(year, month),
        revenue: 0, expense: 0, net: 0, byCategory: {}, students: 0, billed: 0,
      });
    }
    return bucket.get(key);
  };
  paymentsWindow.forEach((p) => { touch(p.paymentDate).revenue += p.amountPaid || 0; });
  expensesWindow.forEach((e) => {
    const b = touch(e.date);
    b.expense += e.amount || 0;
    // Keep the per-category split: it is what turns "expenses rose" into
    // "electricity rose", which is the difference between a number and an
    // explanation.
    const cat = categoryName.get(e.categoryId) || 'Other';
    b.byCategory[cat] = (b.byCategory[cat] || 0) + (e.amount || 0);
  });
  /* What each month billed, and how many students it billed, from the bills
     of that month: "Why this result?" needs them to tell a lower fee from
     parents paying late. They used to be missing, so every change in income
     was put down to the average fee. */
  const windowBills = await prisma.feeInvoice.findMany({
    where: { schoolId, status: { not: 'cancelled' }, year: { gte: pkYm(windowStart).year } },
    select: { totalAmount: true, lateFee: true, discount: true, month: true, year: true, studentId: true },
  }).catch(() => []);
  const billedStudents = new Map();
  for (const inv of windowBills) {
    const n = monthNumber(inv.month);
    const b = n && inv.year ? bucket.get(inv.year * 12 + n - 1) : null;
    if (!b) continue;
    b.billed += (inv.totalAmount || 0) + (inv.lateFee || 0) - (inv.discount || 0);
    if (!billedStudents.has(b.key)) billedStudents.set(b.key, new Set());
    billedStudents.get(b.key).add(inv.studentId);
  }
  for (const [key, set] of billedStudents) bucket.get(key).students = set.size;

  const series = [...bucket.values()]
    .sort((a, b) => a.key - b.key)
    .map((m) => ({ ...m, net: m.revenue - m.expense }));

  /* ── health inputs ─────────────────────────────────────────────────── */
  // What was asked for: the bill, its late fee, less its discount.
  const billed = (invoiceAgg._sum.totalAmount || 0) + (invoiceAgg._sum.lateFee || 0) - (invoiceAgg._sum.discount || 0);
  const collected = invoiceAgg._sum.paidAmount || 0;
  // Owed: positive balances only (an over-paid bill must not cancel real dues).
  const outstanding = owedAgg._sum.dueAmount || 0;

  const presentCount = attendanceMonth.filter((r) => PRESENT.includes(r.status)).reduce((t, r) => t + r._count.id, 0);
  const attendanceTotal = attendanceMonth.reduce((t, r) => t + r._count.id, 0);
  const staffPresent = staffAttendanceMonth.filter((r) => PRESENT.includes(r.status)).reduce((t, r) => t + r._count.id, 0);
  const staffTotal = staffAttendanceMonth.reduce((t, r) => t + r._count.id, 0);

  const windowRevenue = series.reduce((t, m) => t + m.revenue, 0);
  const windowExpense = series.reduce((t, m) => t + m.expense, 0);

  /* An invoice can show more paid than billed when it was raised with the
     wrong unit (rupees saved as paisa) before that was fixed. Counting such
     money as "collected" produced rates like 3333%, and a perfect health
     score on bad data. Cap the rate and tell the admin which to check. */
  const overpaidInvoices = await prisma.feeInvoice.count({
    where: { schoolId, paidAmount: { gt: prisma.feeInvoice.fields.totalAmount } },
  }).catch(() => 0);

  // Applications from the school's online admission form (and any typed in
  // by the office) that nobody has followed up yet.
  const openAdmissions = await prisma.admissionInquiry.count({ where: { schoolId, status: 'open' } }).catch(() => 0);

  const rawCollection = pct(collected, billed);
  const metrics = {
    collectionRate: rawCollection == null ? null : Math.min(100, rawCollection),
    attendanceRate: pct(presentCount, attendanceTotal),
    retention: students + withdrawn > 0 ? pct(students, students + withdrawn) : null,
    staffAttendance: pct(staffPresent, staffTotal),
    netMargin: windowRevenue > 0
      ? Math.round(((windowRevenue - windowExpense) / windowRevenue) * 1000) / 10
      : null,
  };

  const health = healthScore(metrics);

  const caps = capabilities({
    revenueMonths: monthsCovered(paymentsWindow, 'paymentDate'),
    expenseMonths: monthsCovered(expensesWindow, 'date'),
    operationsMonths: monthsCovered(paymentsWindow, 'paymentDate'),
  });

  /* ── "Why this result?" for the two most recent months ─────────────── */
  let explanation = null;
  /* Both months must actually carry money on both sides. Comparing a month
     that has expenses but no fees against one that has fees but no expenses
     produces arithmetically valid nonsense - "collection rate 0% to 100%" -
     which is worse than admitting we cannot say yet. */
  // ...and bills raised in the month: without them the split into strength,
  // fee and collection would be made up.
  const comparable = series.filter((m) => m.revenue > 0 && m.expense > 0 && m.billed > 0 && m.students > 0);
  if (comparable.length >= 2) {
    const prev = comparable[comparable.length - 2];
    const curr = comparable[comparable.length - 1];
    const asMonth = (m) => ({
      // From the bills of that month (students billed, amount billed).
      students: m.students,
      billed: m.billed,
      collected: m.revenue,
      expensesByCategory: m.byCategory,
    });
    explanation = {
      from: prev.label,
      to: curr.label,
      ...explain(asMonth(prev), asMonth(curr)),
    };
  }

  // Freshly computed every request; a stale dashboard is worse than a slow
  // one, and this is a single round of aggregates.
  res.setHeader('Cache-Control', 'private, no-cache');
  res.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      school: { campuses: campuses.length, multiCampus: campuses.length > 1 },
      kpis: {
        students,
        staff,
        collectedToday: paidToday._sum.amountPaid || 0,
        collectedThisMonth: paidMonth._sum.amountPaid || 0,
        outstanding,
        defaulters,
        invoices: invoiceAgg._count || 0,
        today: { students: tally(studentsToday), staff: tally(staffToday) },
      },
      health: { ...health, weights: DEFAULT_WEIGHTS, targets: TARGETS, metrics },
      finance: {
        windowMonths: months,
        revenue: windowRevenue,
        expense: windowExpense,
        net: windowRevenue - windowExpense,
        series,
      },
      explanation,
      dataQuality: { overpaidInvoices },
      admissions: { open: openAdmissions },
      capabilities: {
        ...caps,
        // Reported against months that have BOTH fees and expenses, which is
        // what a driver comparison actually requires.
        variance: {
          ...caps.variance,
          have: comparable.length,
          available: comparable.length >= 2,
          missing: Math.max(0, 2 - comparable.length),
        },
      },
    },
  });
}));

/**
 * GET /api/v1/dashboard/admin/analytics — the dashboard's charts and lists:
 *   attendance trend (30 days, students and staff), each class (strength,
 *   boys/girls, attendance today, fees billed / collected / outstanding),
 *   dues by age, this month's collections by method, admissions per month,
 *   this month against the same point of last month, the latest payments,
 *   today's absentees, birthdays this week, upcoming events and exams.
 * Money in paisa; days are Pakistan days.
 */
router.get('/analytics', wrap(async (req, res) => {
  const { schoolId } = req;
  const todayYmd = pkYmd();
  const monthYmd = `${todayYmd.slice(0, 8)}01`;
  const dayOfMonth = Number(todayYmd.slice(8, 10));
  const lastMonthYmd = addMonths(monthYmd, -1);
  // The same point of last month: up to the same day (or its last day).
  const lastMonthDays = new Date(Date.UTC(Number(lastMonthYmd.slice(0, 4)), Number(lastMonthYmd.slice(5, 7)), 0)).getUTCDate();
  const lastSameDay = addDays(lastMonthYmd, Math.min(dayOfMonth, lastMonthDays));
  const trendFrom = addDays(todayYmd, -29);
  const admissionsFrom = addMonths(monthYmd, -11);
  const live = { schoolId, voidedAt: null };

  const [
    classes, strength, attTodayByClass, staffActive,
    invoicesByClass, dues, methods,
    mtd, lastMtd, expMtd, expLastMtd,
    stuTrend, staffTrend, admitted,
    recent, absent, absentCount,
    stuBirth, staffBirth, events, exams,
  ] = await Promise.all([
    prisma.class.findMany({ where: { schoolId, isActive: true }, select: { id: true, name: true, orderNo: true }, orderBy: [{ orderNo: 'asc' }, { name: 'asc' }] }),
    prisma.student.groupBy({ by: ['classId', 'gender'], where: { schoolId, status: 'active', deletedAt: null }, _count: { _all: true } }),
    prisma.attendance.groupBy({ by: ['classId', 'status'], where: { schoolId, date: { gte: attDay(todayYmd), lt: attDay(addDays(todayYmd, 1)) } }, _count: { _all: true } }).catch(() => []),
    prisma.staff.count({ where: { schoolId, isActive: true, deletedAt: null } }).catch(() => 0),
    prisma.feeInvoice.groupBy({ by: ['classId'], where: { schoolId }, _sum: { totalAmount: true, lateFee: true, discount: true, paidAmount: true, dueAmount: true } }),
    prisma.feeInvoice.findMany({ where: { schoolId, dueAmount: { gt: 0 } }, select: { dueAmount: true, dueDate: true, createdAt: true, studentId: true, classId: true } }),
    prisma.feePayment.groupBy({ by: ['method'], where: { ...live, paymentDate: { gte: pkStart(monthYmd), lt: pkStart(addDays(todayYmd, 1)) } }, _sum: { amountPaid: true }, _count: { _all: true } }),
    prisma.feePayment.aggregate({ where: { ...live, paymentDate: { gte: pkStart(monthYmd), lt: pkStart(addDays(todayYmd, 1)) } }, _sum: { amountPaid: true } }),
    prisma.feePayment.aggregate({ where: { ...live, paymentDate: { gte: pkStart(lastMonthYmd), lt: pkStart(lastSameDay) } }, _sum: { amountPaid: true } }),
    prisma.expense.aggregate({ where: { schoolId, date: { gte: pkStart(monthYmd), lt: pkStart(addDays(todayYmd, 1)) } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { schoolId, date: { gte: pkStart(lastMonthYmd), lt: pkStart(lastSameDay) } }, _sum: { amount: true } }),
    prisma.attendance.groupBy({ by: ['date', 'status'], where: { schoolId, date: { gte: attDay(trendFrom), lt: attDay(addDays(todayYmd, 1)) } }, _count: { _all: true } }).catch(() => []),
    prisma.staffAttendance.groupBy({ by: ['date', 'status'], where: { schoolId, date: { gte: attDay(trendFrom), lt: attDay(addDays(todayYmd, 1)) } }, _count: { _all: true } }).catch(() => []),
    prisma.student.findMany({ where: { schoolId, deletedAt: null, admissionDate: { gte: pkStart(admissionsFrom) } }, select: { admissionDate: true } }),
    prisma.feePayment.findMany({
      where: live, orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }], take: 8,
      select: { id: true, amountPaid: true, method: true, paymentDate: true, receiptNo: true, invoice: { select: { feeTitle: true, month: true, year: true, student: { select: { id: true, name: true, rollNo: true, class: { select: { name: true } } } } } } },
    }),
    prisma.attendance.findMany({
      where: { schoolId, status: 'absent', date: { gte: attDay(todayYmd), lt: attDay(addDays(todayYmd, 1)) }, student: { deletedAt: null } },
      take: 12, orderBy: { id: 'asc' },
      select: { student: { select: { id: true, name: true, rollNo: true, emergencyPhone: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
    }).catch(() => []),
    prisma.attendance.count({ where: { schoolId, status: 'absent', date: { gte: attDay(todayYmd), lt: attDay(addDays(todayYmd, 1)) } } }).catch(() => 0),
    prisma.student.findMany({ where: { schoolId, status: 'active', deletedAt: null, dob: { not: null } }, select: { id: true, name: true, dob: true, class: { select: { name: true } } } }),
    prisma.staff.findMany({ where: { schoolId, isActive: true, deletedAt: null, dob: { not: null } }, select: { id: true, name: true, dob: true, designation: true } }).catch(() => []),
    prisma.schoolEvent.findMany({ where: { schoolId, date: { gte: pkStart(todayYmd), lt: pkStart(addDays(todayYmd, 31)) }, status: { not: 'cancelled' } }, orderBy: { date: 'asc' }, take: 5, select: { id: true, title: true, type: true, date: true } }).catch(() => []),
    prisma.exam.findMany({ where: { schoolId, OR: [{ dateEnd: { gte: pkStart(todayYmd) } }, { dateStart: { gte: pkStart(todayYmd) } }] }, orderBy: { dateStart: 'asc' }, take: 5, select: { id: true, title: true, dateStart: true, dateEnd: true, isPublished: true } }).catch(() => []),
  ]);

  /* Each class: strength, boys and girls, attendance today, fees. */
  const perClass = new Map(classes.map((c) => [c.id, {
    classId: c.id, name: c.name, students: 0, boys: 0, girls: 0,
    markedToday: 0, presentToday: 0, billed: 0, collected: 0, outstanding: 0, owing: 0,
  }]));
  const row = (id) => perClass.get(id);
  const gender = { boys: 0, girls: 0, other: 0 };
  for (const g of strength) {
    const n = g._count._all;
    const sex = /^f/i.test(String(g.gender || '')) ? 'girls' : /^m/i.test(String(g.gender || '')) ? 'boys' : 'other';
    gender[sex] += n;
    const r = row(g.classId);
    if (r) { r.students += n; if (sex !== 'other') r[sex] += n; }
  }
  for (const a of attTodayByClass) {
    const r = row(a.classId);
    if (!r) continue;
    r.markedToday += a._count._all;
    if (PRESENT.includes(a.status)) r.presentToday += a._count._all;
  }
  for (const f of invoicesByClass) {
    const r = row(f.classId);
    if (!r) continue;
    r.billed += (f._sum.totalAmount || 0) + (f._sum.lateFee || 0) - (f._sum.discount || 0);
    r.collected += f._sum.paidAmount || 0;
  }
  // What is owed: positive balances only. A bill showing more paid than billed
  // (a data mistake the dashboard flags) must not cancel another's dues.
  for (const d of dues) { const r = row(d.classId); if (r) r.outstanding += d.dueAmount; }
  const owingStudents = new Map();
  for (const d of dues) if (d.classId) owingStudents.set(d.classId, (owingStudents.get(d.classId) || new Set()).add(d.studentId));
  for (const [id, set] of owingStudents) { const r = row(id); if (r) r.owing = set.size; }
  const classRows = [...perClass.values()].filter((r) => r.students || r.billed);

  /* Dues by how long they are past their due date. */
  const todayStart = pkStart(todayYmd).getTime();
  const buckets = [
    { key: 'current', label: 'Not due yet', amount: 0, count: 0 },
    { key: '0-30', label: '1–30 days late', amount: 0, count: 0 },
    { key: '31-60', label: '31–60 days', amount: 0, count: 0 },
    { key: '61-90', label: '61–90 days', amount: 0, count: 0 },
    { key: '90+', label: 'Over 90 days', amount: 0, count: 0 },
  ];
  for (const d of dues) {
    const due = new Date(d.dueDate || d.createdAt).getTime();
    const late = Math.floor((todayStart - due) / 864e5);
    const b = late < 0 ? buckets[0] : late <= 30 ? buckets[1] : late <= 60 ? buckets[2] : late <= 90 ? buckets[3] : buckets[4];
    b.amount += d.dueAmount; b.count += 1;
  }

  /* Attendance day by day: share present (late counts) of those marked. */
  const days = new Map();
  for (let i = 0; i < 30; i += 1) { const ymd = addDays(trendFrom, i); days.set(ymd, { day: ymd, sMarked: 0, sPresent: 0, tMarked: 0, tPresent: 0 }); }
  for (const a of stuTrend) { const r = days.get(localYmd(a.date)); if (r) { r.sMarked += a._count._all; if (PRESENT.includes(a.status)) r.sPresent += a._count._all; } }
  for (const a of staffTrend) { const r = days.get(localYmd(a.date)); if (r) { r.tMarked += a._count._all; if (PRESENT.includes(a.status)) r.tPresent += a._count._all; } }
  const attendanceTrend = [...days.values()].map((r) => ({
    day: r.day, students: pct(r.sPresent, r.sMarked), staff: pct(r.tPresent, r.tMarked), marked: r.sMarked,
  }));

  /* Admissions per month, the last 12. */
  const adm = new Map();
  for (let i = 0; i < 12; i += 1) { const ymd = addMonths(admissionsFrom, i); adm.set(ymd.slice(0, 7), 0); }
  for (const s of admitted) { const { year, month } = pkYm(s.admissionDate); const k = `${year}-${String(month + 1).padStart(2, '0')}`; if (adm.has(k)) adm.set(k, adm.get(k) + 1); }
  const admissionsMonthly = [...adm.entries()].map(([k, n]) => ({ ym: k, label: monthLabel(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1), count: n }));

  /* Birthdays in the next 7 days (today first). */
  const md = (d) => pkYmd(d).slice(5);
  const upcomingDays = Array.from({ length: 7 }, (_, i) => addDays(todayYmd, i).slice(5));
  const birthdays = [
    ...stuBirth.map((s) => ({ kind: 'student', id: s.id, name: s.name, about: s.class?.name || '', md: md(s.dob) })),
    ...staffBirth.map((s) => ({ kind: 'staff', id: s.id, name: s.name, about: s.designation || 'Staff', md: md(s.dob) })),
  ].filter((b) => upcomingDays.includes(b.md))
    .map((b) => ({ ...b, inDays: upcomingDays.indexOf(b.md) }))
    .sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name))
    .slice(0, 10);

  res.setHeader('Cache-Control', 'private, no-cache');
  res.json({
    success: true,
    data: {
      today: todayYmd,
      gender,
      staff: staffActive,
      classes: classRows,
      aging: buckets,
      methods: methods.map((m) => ({ method: m.method || 'cash', amount: m._sum.amountPaid || 0, count: m._count._all })).sort((a, b) => b.amount - a.amount),
      month: {
        collected: mtd._sum.amountPaid || 0,
        collectedLast: lastMtd._sum.amountPaid || 0,
        expense: expMtd._sum.amount || 0,
        expenseLast: expLastMtd._sum.amount || 0,
        day: dayOfMonth,
      },
      attendanceTrend,
      admissionsMonthly,
      recentPayments: recent.map((p) => ({
        id: p.id, amount: p.amountPaid, method: p.method, at: p.paymentDate, receiptNo: p.receiptNo,
        student: p.invoice?.student ? { id: p.invoice.student.id, name: p.invoice.student.name, rollNo: p.invoice.student.rollNo, className: p.invoice.student.class?.name || '' } : null,
        fee: p.invoice?.feeTitle || '',
      })),
      absentToday: { count: absentCount, list: absent.map((a) => a.student).filter(Boolean).map((s) => ({ id: s.id, name: s.name, rollNo: s.rollNo, phone: s.emergencyPhone || '', className: [s.class?.name, s.section?.name].filter(Boolean).join(' – ') })) },
      birthdays,
      events: events.map((e) => ({ id: e.id, title: e.title, type: e.type, date: pkYmd(e.date) })),
      exams: exams.map((e) => ({ id: e.id, title: e.title, from: e.dateStart ? pkYmd(e.dateStart) : null, to: e.dateEnd ? pkYmd(e.dateEnd) : null, published: e.isPublished })),
    },
  });
}));

module.exports = router;
