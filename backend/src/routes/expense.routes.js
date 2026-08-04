const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { page = 1, limit = 25, month, year } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  const startDate = month && year ? new Date(parseInt(year), parseInt(month)-1, 1) : undefined;
  const endDate = startDate ? new Date(parseInt(year), parseInt(month), 1) : undefined;
  const where = { schoolId: req.schoolId, ...(startDate && { date: { gte: startDate, lt: endDate } }) };
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, skip, take: parseInt(limit), orderBy: { date: 'desc' } }),
    prisma.expense.count({ where })
  ]);
  res.json({ success: true, data: expenses, total });
}));

router.post('/', wrap(async (req, res) => {
  const { categoryId, amount, description, date } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: 'Amount required.' });
  const expense = await prisma.expense.create({ data: { schoolId: req.schoolId, campusId: req.campusId, categoryId: categoryId ? parseInt(categoryId) : null, amount: parseInt(amount), description, date: date ? new Date(date) : new Date(), addedBy: req.user.id } });
  res.status(201).json({ success: true, data: expense });
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
