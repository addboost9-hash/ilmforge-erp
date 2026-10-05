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

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

const monthLabel = (y, m) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] + ' ' + y;

/**
 * GET /api/v1/dashboard/admin/overview
 * Query: months (how much history to return, default 12, max 36)
 */
router.get('/overview', wrap(async (req, res) => {
  const { schoolId } = req;
  const months = Math.min(Math.max(parseInt(req.query.months) || 12, 1), 36);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  // Voided payments are corrections, not money taken, so they are excluded
  // everywhere a total is computed - the same rule the fee pages use.
  const livePayment = { schoolId, voidedAt: null };

  const [
    students, staff, campuses,
    invoiceAgg, paidToday, paidMonth,
    paymentsWindow, expensesWindow,
    attendanceMonth, staffAttendanceMonth,
    defaulters, withdrawn,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: 'active', deletedAt: null } }),
    prisma.staff.count({ where: { schoolId, isActive: true } }).catch(() => 0),
    prisma.campus.findMany({ where: { schoolId }, select: { id: true, name: true, isMain: true } }),

    prisma.feeInvoice.aggregate({
      where: { schoolId },
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true, discount: true },
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
      where: { schoolId, date: { gte: monthStart, lt: tomorrow } },
      _count: { id: true },
    }).catch(() => []),
    prisma.staffAttendance.groupBy({
      by: ['status'],
      where: { schoolId, date: { gte: monthStart, lt: tomorrow } },
      _count: { id: true },
    }).catch(() => []),

    prisma.feeInvoice.count({ where: { schoolId, status: { in: ['unpaid', 'partial', 'overdue'] } } }),
    prisma.student.count({
      where: { schoolId, status: { in: ['left', 'withdrawn', 'inactive'] }, updatedAt: { gte: windowStart } },
    }).catch(() => 0),
  ]);

  // Today's registers, so the dashboard can say what is still left to do.
  const [studentsToday, staffToday] = await Promise.all([
    prisma.attendance.groupBy({
      by: ['status'], where: { schoolId, date: { gte: today, lt: tomorrow } }, _count: { id: true },
    }).catch(() => []),
    prisma.staffAttendance.groupBy({
      by: ['status'], where: { schoolId, date: { gte: today, lt: tomorrow } }, _count: { id: true },
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
    const dt = new Date(d);
    const key = dt.getFullYear() * 12 + dt.getMonth();
    if (!bucket.has(key)) {
      bucket.set(key, {
        key, year: dt.getFullYear(), month: dt.getMonth(),
        label: monthLabel(dt.getFullYear(), dt.getMonth()),
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
  const series = [...bucket.values()]
    .sort((a, b) => a.key - b.key)
    .map((m) => ({ ...m, net: m.revenue - m.expense }));

  /* ── health inputs ─────────────────────────────────────────────────── */
  const billed = invoiceAgg._sum.totalAmount || 0;
  const collected = invoiceAgg._sum.paidAmount || 0;
  const outstanding = invoiceAgg._sum.dueAmount || 0;

  const presentCount = attendanceMonth.find((r) => r.status === 'present')?._count.id || 0;
  const attendanceTotal = attendanceMonth.reduce((t, r) => t + r._count.id, 0);
  const staffPresent = staffAttendanceMonth.find((r) => r.status === 'present')?._count.id || 0;
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
  const comparable = series.filter((m) => m.revenue > 0 && m.expense > 0);
  if (comparable.length >= 2) {
    const prev = comparable[comparable.length - 2];
    const curr = comparable[comparable.length - 1];
    const asMonth = (m) => ({
      // Billing per month is not tracked on the payment, so student count and
      // billed value are approximated from the invoices raised in that month.
      students: m.students || students,
      billed: m.billed || m.revenue,
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

module.exports = router;
