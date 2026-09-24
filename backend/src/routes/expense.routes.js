const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// FIX: the Accountant Portal (ExpenseLogTab / BalancesheetTab) calls this with
// a single-day `date` param and a `by` (addedBy) param to scope "today's
// expenses" per accountant, but this handler only ever understood `month`/
// `year` — both params were silently ignored, so the accountant always saw
// every expense ever recorded for the school instead of just today's/theirs.
// Also attaches a resolved `category` name onto each row: Expense.categoryId
// has no Prisma relation to ExpenseCategory, so it can't be `include`d — the
// frontend expects `expense.category` to render a label.
router.get('/', wrap(async (req, res) => {
  const { page = 1, limit = 25, month, year, date, by, addedBy } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  let dateFilter;
  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    dateFilter = { gte: start, lt: end };
  } else if (month && year) {
    dateFilter = { gte: new Date(parseInt(year), parseInt(month)-1, 1), lt: new Date(parseInt(year), parseInt(month), 1) };
  }
  const byId = by || addedBy;
  const where = {
    schoolId: req.schoolId,
    ...(dateFilter && { date: dateFilter }),
    ...(byId && { addedBy: parseInt(byId) }),
  };
  const [expenses, total, categories] = await Promise.all([
    prisma.expense.findMany({ where, skip, take: parseInt(limit), orderBy: { date: 'desc' } }),
    prisma.expense.count({ where }),
    prisma.expenseCategory.findMany({ where: { schoolId: req.schoolId } }),
  ]);
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const data = expenses.map(e => ({ ...e, category: e.categoryId ? catMap[e.categoryId] || null : null }));
  res.json({ success: true, data, total });
}));

// FIX: accepts either a numeric `categoryId` or a plain `category` name string
// (the Accountant Portal's expense form sends a category name from a fixed
// dropdown, not an id) — resolves/creates the matching ExpenseCategory for
// the school so the amount is actually tagged instead of silently dropped.
router.post('/', wrap(async (req, res) => {
  const { categoryId, category, amount, description, date } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: 'Amount required.' });

  let resolvedCategoryId = categoryId ? parseInt(categoryId) : null;
  if (!resolvedCategoryId && category) {
    const existing = await prisma.expenseCategory.findFirst({ where: { schoolId: req.schoolId, name: category } });
    resolvedCategoryId = existing ? existing.id : (await prisma.expenseCategory.create({ data: { schoolId: req.schoolId, name: category } })).id;
  }

  const expense = await prisma.expense.create({ data: { schoolId: req.schoolId, campusId: req.campusId, categoryId: resolvedCategoryId, amount: parseInt(amount), description, date: date ? new Date(date) : new Date(), addedBy: req.user.id } });
  res.status(201).json({ success: true, data: { ...expense, category: category || null } });
}));

/* ── PUT /:id — correct a logged expense ──
   Expenses could be logged and deleted but never edited, so fixing a wrong
   amount, date or category meant deleting the entry and re-creating it —
   which loses the original addedBy/created trail. Accepts a category name
   the same way POST does. */
router.put('/:id', wrap(async (req, res) => {
  const existing = await prisma.expense.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Expense not found.' });

  const { categoryId, category, amount, description, date } = req.body;

  let resolvedCategoryId = existing.categoryId;
  if (categoryId !== undefined) {
    resolvedCategoryId = categoryId ? parseInt(categoryId) : null;
  } else if (category !== undefined) {
    if (!category) {
      resolvedCategoryId = null;
    } else {
      const found = await prisma.expenseCategory.findFirst({ where: { schoolId: req.schoolId, name: category } });
      resolvedCategoryId = found ? found.id : (await prisma.expenseCategory.create({ data: { schoolId: req.schoolId, name: category } })).id;
    }
  }

  const expense = await prisma.expense.update({
    where: { id: existing.id },
    data: {
      categoryId: resolvedCategoryId,
      ...(amount !== undefined && { amount: parseInt(amount) }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date: date ? new Date(date) : existing.date }),
    },
  });

  const cat = resolvedCategoryId
    ? await prisma.expenseCategory.findUnique({ where: { id: resolvedCategoryId }, select: { name: true } })
    : null;
  res.json({ success: true, data: { ...expense, category: cat?.name || null }, message: 'Expense updated.' });
}));

// DELETE /:id — was entirely missing; the Accountant Portal's expense log
// "delete" button called this and always got a 404.
router.delete('/:id', wrap(async (req, res) => {
  const existing = await prisma.expense.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Expense not found.' });
  await prisma.expense.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Expense deleted.' });
}));

router.get('/categories', wrap(async (req, res) => {
  const cats = await prisma.expenseCategory.findMany({ where: { schoolId: req.schoolId } });
  res.json({ success: true, data: cats });
}));

router.post('/categories', wrap(async (req, res) => {
  const { name } = req.body;
  const cat = await prisma.expenseCategory.create({ data: { schoolId: req.schoolId, name } });
  res.status(201).json({ success: true, data: cat });
}));

module.exports = router;
