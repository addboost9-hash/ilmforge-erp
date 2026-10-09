const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { pastDate } = require('../utils/pastDate');
const {
  amountPaisa, expenseCategory, pkDayRange, pkDayStart, pkDayKey, pkToday, PKT_OFFSET_MS,
} = require('../services/salaryPayment.service');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /accounting/ledger?limit=N&from=YYYY-MM-DD&to=YYYY-MM-DD — fee payments
// + expenses combined, newest first, for AccountingPage's Balance Sheet tab.
// Both use the day the money really moved (paymentDate, date), which is the
// day entered for past records, not the day they were typed in.
// from/to are Pakistan calendar days, both included, and optional. `totals`
// adds up the whole range, not only the rows returned, so a busy month's
// income is not cut short by the limit.
router.get('/ledger', wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
  const range = pkDayRange(req.query.from, req.query.to);
  if (range.error) return res.status(400).json({ success: false, message: range.error });
  const inRange = range.filter.gte || range.filter.lt ? range.filter : null;

  const paymentWhere = { voidedAt: null, schoolId: req.schoolId, ...(inRange && { paymentDate: inRange }) };
  const expenseWhere = { schoolId: req.schoolId, ...(inRange && { date: inRange }) };

  const [payments, expenses, categories, paid, spent] = await Promise.all([
    prisma.feePayment.findMany({
      where: paymentWhere,
      include: { invoice: { select: { feeTitle: true, student: { select: { name: true, rollNo: true } } } } },
      orderBy: { paymentDate: 'desc' },
      take: limit,
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { date: 'desc' },
      take: limit,
    }),
    prisma.expenseCategory.findMany({ where: { schoolId: req.schoolId } }),
    prisma.feePayment.aggregate({ where: paymentWhere, _sum: { amountPaid: true } }),
    prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
  ]);

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  res.json({
    success: true,
    data: {
      payments: payments.map(p => ({
        id: p.id,
        roll: p.invoice?.student?.rollNo || '',
        student: p.invoice?.student?.name || '',
        feeTitle: p.invoice?.feeTitle || '',
        amount: p.amountPaid,
        date: p.paymentDate,
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        title: e.description,
        category: e.categoryId ? catMap[e.categoryId] || null : null,
        amount: e.amount,
        date: e.date,
      })),
      totals: { income: paid._sum.amountPaid || 0, expense: spent._sum.amount || 0 },
    },
  });
}));

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// GET /accounting/stats?year=YYYY — real monthly income/expense totals.
// AccountsPage's Income/Expense tab previously rendered a hardcoded
// SAMPLE_MONTHLY array, so every school saw the same invented figures
// presented as their own accounts. Income = fee payments received,
// expense = recorded expenses, both bucketed by the Pakistan calendar month
// of the day the money moved: on the live server (UTC) a fee taken at 1 a.m.
// on the 1st used to land in the month before.
router.get('/stats', wrap(async (req, res) => {
  const today = pkToday();
  const year = parseInt(req.query.year) || today.year;
  const start = pkDayStart(year, 1, 1);
  const end = pkDayStart(year + 1, 1, 1);

  const [payments, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: { voidedAt: null, schoolId: req.schoolId, paymentDate: { gte: start, lt: end } },
      select: { amountPaid: true, paymentDate: true },
    }),
    prisma.expense.findMany({
      where: { schoolId: req.schoolId, date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    }),
  ]);

  const pkMonth = (d) => new Date(new Date(d).getTime() + PKT_OFFSET_MS).getUTCMonth();
  const monthly = MONTH_LABELS.map((month) => ({ month, income: 0, expense: 0 }));
  for (const p of payments) monthly[pkMonth(p.paymentDate)].income += p.amountPaid || 0;
  for (const e of expenses) monthly[pkMonth(e.date)].expense += e.amount || 0;

  const annualIncome = monthly.reduce((s, m) => s + m.income, 0);
  const annualExpense = monthly.reduce((s, m) => s + m.expense, 0);

  // Today's figures, when the year asked for is this year.
  const todayKey = pkDayKey(new Date());
  const todayTotals = {
    income: payments.filter((p) => pkDayKey(p.paymentDate) === todayKey).reduce((s, p) => s + (p.amountPaid || 0), 0),
    expense: expenses.filter((e) => pkDayKey(e.date) === todayKey).reduce((s, e) => s + (e.amount || 0), 0),
  };

  // Only compare against a previous month that falls inside the requested year.
  const idx = today.year === year ? today.month - 1 : 11;
  const cur = monthly[idx];
  const prev = idx > 0 ? monthly[idx - 1] : null;
  const pctChange = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);

  res.json({
    success: true,
    data: {
      year,
      monthly,
      thisMonth: {
        month: MONTH_LABELS[idx],
        income: cur.income,
        expense: cur.expense,
        net: cur.income - cur.expense,
        incomeTrend: prev ? pctChange(cur.income, prev.income) : null,
        expenseTrend: prev ? pctChange(cur.expense, prev.expense) : null,
        netTrend: prev ? pctChange(cur.income - cur.expense, prev.income - prev.expense) : null,
      },
      today: todayTotals,
      annual: { income: annualIncome, expense: annualExpense, net: annualIncome - annualExpense },
      hasData: payments.length > 0 || expenses.length > 0,
    },
  });
}));

// POST /accounting/entries — manual ledger entry (currently only 'expense' type,
// matching AccountingPage's "Add Expense" form). Same rules as POST /expenses:
// amount in paisa, date the day it was really spent (never the future), and
// the category matched to the school's own whatever its case, so entries
// created here show up consistently in both the Accounting and Expenses pages.
router.post('/entries', wrap(async (req, res) => {
  const { type, amount, description, date, category, note } = req.body || {};
  const paisa = amountPaisa(amount);
  if (paisa.error) return res.status(400).json({ success: false, message: paisa.error });
  if (type && type !== 'expense') {
    return res.status(400).json({ success: false, message: 'Only expense entries are supported currently.' });
  }
  const when = pastDate(date, { label: 'Date' });
  if (when.error) return res.status(400).json({ success: false, message: when.error });

  const cat = await expenseCategory(prisma, req.schoolId, category);

  const expense = await prisma.expense.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      categoryId: cat?.id || null,
      amount: paisa.value,
      description: [description, note].map(s => String(s ?? '').trim()).filter(Boolean).join(' — ') || null,
      date: when.date,
      addedBy: req.user.id,
    },
  });

  res.status(201).json({ success: true, data: { ...expense, category: cat?.name || null } });
}));

module.exports = router;
