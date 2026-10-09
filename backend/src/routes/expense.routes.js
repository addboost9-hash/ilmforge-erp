const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { pastDate } = require('../utils/pastDate');
const {
  amountPaisa, wholeNumber, categoryName, findExpenseCategory, expenseCategory, pkDayRange, pkDayStart, pkDayKey,
} = require('../services/salaryPayment.service');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Printed reports ask for a whole period at once (up to 2000 rows).
const MAX_LIMIT = 2000;

const bad = (res, message) => res.status(400).json({ success: false, message });

// Blank descriptions are stored as nothing rather than as spaces.
const cleanText = (v) => {
  const s = String(v ?? '').trim();
  return s || null;
};

/* The category an expense is filed under: an id picked from the dropdown, or
   a name (the Accountant Portal sends names from a fixed list). A name is
   matched to the school's categories whatever its case or spacing, and added
   the first time it is used. -> { id, name } (both null for none) | { error } */
async function resolveCategory(schoolId, { categoryId, category }) {
  if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
    const id = wholeNumber(categoryId);
    const found = id && await prisma.expenseCategory.findFirst({ where: { id, schoolId }, select: { id: true, name: true } });
    return found || { error: 'That expense category does not exist.' };
  }
  if (categoryName(category)) return expenseCategory(prisma, schoolId, category);
  return { id: null, name: null };
}

/* ── GET / — the school's expenses, newest first ──
   ?from=YYYY-MM-DD&to=YYYY-MM-DD  Pakistan calendar days, both included
   ?categoryId=  ?page=  ?limit= (25 by default, up to 2000)
   Older callers still work: ?date= (one day, the Accountant Portal),
   ?month=&year=, and ?by= / ?addedBy= (who entered it).
   -> { data, total, page, pages, totalAmount }. totalAmount is the sum, in
   paisa, of every matching expense, not only this page's.
   Also attaches a resolved `category` name onto each row: Expense.categoryId
   has no Prisma relation to ExpenseCategory, so it can't be `include`d. */
router.get('/', wrap(async (req, res) => {
  const { from, to, date, month, year, categoryId, by, addedBy } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 25), MAX_LIMIT);

  let range = null;
  if (from || to) range = pkDayRange(from, to);
  else if (date) range = pkDayRange(date, date);
  else if (month && year) {
    const m = wholeNumber(month);
    const y = wholeNumber(year);
    if (m === null || m < 1 || m > 12 || y === null) return bad(res, 'Month must be 1 to 12 and year a number like 2026.');
    range = { filter: { gte: pkDayStart(y, m, 1), lt: pkDayStart(y, m + 1, 1) } };
  }
  if (range?.error) return bad(res, range.error);

  const where = { schoolId: req.schoolId };
  if (range && (range.filter.gte || range.filter.lt)) where.date = range.filter;
  if (categoryId !== undefined && categoryId !== '') {
    const id = wholeNumber(categoryId);
    if (id === null) return bad(res, 'categoryId must be a number.');
    where.categoryId = id;
  }
  const byId = by || addedBy;
  if (byId) {
    const userId = wholeNumber(byId);
    if (userId === null) return bad(res, 'by must be a user id.');
    where.addedBy = userId;
  }

  const [expenses, total, sum, categories] = await Promise.all([
    prisma.expense.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ date: 'desc' }, { id: 'desc' }] }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expenseCategory.findMany({ where: { schoolId: req.schoolId }, select: { id: true, name: true } }),
  ]);
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const data = expenses.map(e => ({ ...e, category: e.categoryId ? catMap[e.categoryId] || null : null }));
  res.json({ success: true, data, total, page, pages: Math.ceil(total / limit), totalAmount: sum._sum.amount || 0 });
}));

/* ── POST / — record an expense ──
   { categoryId | category (a name), amount (paisa), description, date }
   date is the day the money was really spent: YYYY-MM-DD or DD/MM/YYYY,
   blank for today, never in the future. A school that has just joined
   enters last year's bills with their real dates. */
router.post('/', wrap(async (req, res) => {
  const { categoryId, category, amount, description, date } = req.body || {};
  const paisa = amountPaisa(amount);
  if (paisa.error) return bad(res, paisa.error);
  const when = pastDate(date, { label: 'Date' });
  if (when.error) return bad(res, when.error);
  const cat = await resolveCategory(req.schoolId, { categoryId, category });
  if (cat.error) return bad(res, cat.error);

  const expense = await prisma.expense.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      categoryId: cat.id,
      amount: paisa.value,
      description: cleanText(description),
      date: when.date,
      addedBy: req.user.id,
    },
  });
  res.status(201).json({ success: true, data: { ...expense, category: cat.name } });
}));

/* ── PUT /:id — correct a logged expense ──
   Expenses could be logged and deleted but never edited, so fixing a wrong
   amount, date or category meant deleting the entry and re-creating it —
   which loses the original addedBy/created trail. Accepts the same fields
   and rules as POST; only the fields sent are changed. */
router.put('/:id', wrap(async (req, res) => {
  const existing = await prisma.expense.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Expense not found.' });

  const { categoryId, category, amount, description, date } = req.body || {};
  const data = {};
  if (amount !== undefined) {
    const paisa = amountPaisa(amount);
    if (paisa.error) return bad(res, paisa.error);
    data.amount = paisa.value;
  }
  if (description !== undefined) data.description = cleanText(description);
  if (date !== undefined && date !== null && String(date).trim() !== '') {
    const when = pastDate(date, { label: 'Date' });
    if (when.error) return bad(res, when.error);
    // Saving the same day again keeps the time it was first recorded at.
    if (pkDayKey(when.date) !== pkDayKey(existing.date)) data.date = when.date;
  }
  if (categoryId !== undefined || category !== undefined) {
    const cat = await resolveCategory(req.schoolId, { categoryId, category });
    if (cat.error) return bad(res, cat.error);
    data.categoryId = cat.id;
  }

  const expense = await prisma.expense.update({ where: { id: existing.id }, data });
  const cat = expense.categoryId
    ? await prisma.expenseCategory.findUnique({ where: { id: expense.categoryId }, select: { name: true } })
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
  const cats = await prisma.expenseCategory.findMany({ where: { schoolId: req.schoolId }, orderBy: { name: 'asc' } });
  res.json({ success: true, data: cats });
}));

// Adding "utilities" when "Utilities" exists returns the existing category
// instead of a near-duplicate that would split the school's totals.
router.post('/categories', wrap(async (req, res) => {
  const name = categoryName(req.body?.name);
  if (!name) return bad(res, 'Category name is required.');
  const existing = await findExpenseCategory(prisma, req.schoolId, name);
  if (existing) {
    return res.json({ success: true, data: existing, existed: true, message: `"${existing.name}" is already a category.` });
  }
  const cat = await prisma.expenseCategory.create({ data: { schoolId: req.schoolId, name } });
  res.status(201).json({ success: true, data: cat, message: 'Category added.' });
}));

module.exports = router;
