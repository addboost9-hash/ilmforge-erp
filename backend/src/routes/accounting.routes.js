const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /accounting/ledger?limit=N — recent fee payments + expenses combined,
// for AccountingPage's Balance Sheet / Expenses tabs.
router.get('/ledger', wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  const [payments, expenses, categories] = await Promise.all([
    prisma.feePayment.findMany({
      where: { schoolId: req.schoolId },
      include: { invoice: { select: { feeTitle: true, student: { select: { name: true, rollNo: true } } } } },
      orderBy: { paymentDate: 'desc' },
      take: limit,
    }),
    prisma.expense.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { date: 'desc' },
      take: limit,
    }),
    prisma.expenseCategory.findMany({ where: { schoolId: req.schoolId } }),
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
    },
  });
}));

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// GET /accounting/stats?year=YYYY — real monthly income/expense totals.
// AccountsPage's Income/Expense tab previously rendered a hardcoded
// SAMPLE_MONTHLY array, so every school saw the same invented figures
// presented as their own accounts. Income = fee payments received,
// expense = recorded expenses, both bucketed by month in the school's data.
router.get('/stats', wrap(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [payments, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: { schoolId: req.schoolId, paymentDate: { gte: start, lt: end } },
      select: { amountPaid: true, paymentDate: true },
    }),
    prisma.expense.findMany({
      where: { schoolId: req.schoolId, date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    }),
  ]);

  const monthly = MONTH_LABELS.map((month) => ({ month, income: 0, expense: 0 }));
  for (const p of payments) monthly[new Date(p.paymentDate).getMonth()].income += p.amountPaid || 0;
  for (const e of expenses) monthly[new Date(e.date).getMonth()].expense += e.amount || 0;

  const annualIncome = monthly.reduce((s, m) => s + m.income, 0);
  const annualExpense = monthly.reduce((s, m) => s + m.expense, 0);

  // Only compare against a previous month that falls inside the requested year.
  const now = new Date();
  const idx = now.getFullYear() === year ? now.getMonth() : 11;
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
      annual: { income: annualIncome, expense: annualExpense, net: annualIncome - annualExpense },
      hasData: payments.length > 0 || expenses.length > 0,
    },
  });
}));

// POST /accounting/entries — manual ledger entry (currently only 'expense' type,
// matching AccountingPage's "Add Expense" form). Resolves/creates the category
// by name the same way expense.routes.js's POST /expenses does, so entries
// created here show up consistently in both the Accounting and Expenses pages.
router.post('/entries', wrap(async (req, res) => {
  const { type, amount, description, date, category, note } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: 'Amount required.' });
  if (type && type !== 'expense') {
    return res.status(400).json({ success: false, message: 'Only expense entries are supported currently.' });
  }

  let categoryId = null;
  if (category) {
    const existing = await prisma.expenseCategory.findFirst({ where: { schoolId: req.schoolId, name: category } });
    categoryId = existing ? existing.id : (await prisma.expenseCategory.create({ data: { schoolId: req.schoolId, name: category } })).id;
  }

  const expense = await prisma.expense.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      categoryId,
      amount: parseInt(amount),
      description: note ? `${description} — ${note}` : description,
      date: date ? new Date(date) : new Date(),
      addedBy: req.user.id,
    },
  });

  res.status(201).json({ success: true, data: { ...expense, category: category || null } });
}));

module.exports = router;
