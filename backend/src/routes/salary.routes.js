const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { pastDate } = require('../utils/pastDate');
const {
  markSalaryPaid, generateSalaries, generateMessage, salaryPeriod, wholeNumber,
} = require('../services/salaryPayment.service');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /?month=1-12&year=YYYY — either or both, or neither for every month.
// A filter that is not a number is a 400, not a database error.
router.get('/', wrap(async (req, res) => {
  const { month, year } = req.query;
  const where = { schoolId: req.schoolId };
  if (month !== undefined && month !== '') {
    const m = wholeNumber(month);
    if (m === null || m < 1 || m > 12) return res.status(400).json({ success: false, message: 'Month must be a number from 1 to 12.' });
    where.month = m;
  }
  if (year !== undefined && year !== '') {
    const y = wholeNumber(year);
    if (y === null) return res.status(400).json({ success: false, message: 'Year must be a number like 2026.' });
    where.year = y;
  }
  const records = await prisma.salaryRecord.findMany({
    where,
    include: { staff: { select: { name: true, designation: true, empCode: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: records });
}));

// Same as Payroll Manager's Generate: the month is checked, and staff who
// joined after it are skipped and named in the message.
router.post('/generate', wrap(async (req, res) => {
  const period = salaryPeriod(req.body?.month, req.body?.year);
  if (period.error) return res.status(400).json({ success: false, message: period.error });

  const out = await generateSalaries({ schoolId: req.schoolId, ...period });
  res.json({
    success: true,
    data: out.records,
    summary: {
      generated: out.records.length,
      skipped: out.skipped,
      alreadyGenerated: out.alreadyGenerated,
      notJoinedYet: out.notJoinedYet,
    },
    message: generateMessage(out, period.month, period.year),
  });
}));

// FIX: was updated by id only with no schoolId check — any finance user on
// any school could mark another school's salary record as issued (and post
// an expense against their own school for someone else's salary) by
// guessing the numeric id. Now verifies tenant ownership first.
// Same as Payroll Manager's pay: one expense, on the day it was paid, never twice.
router.post('/:id/issue', wrap(async (req, res) => {
  const when = pastDate(req.body?.paidOn, { label: 'Paid on' });
  if (when.error) return res.status(400).json({ success: false, message: when.error });
  try {
    const out = await markSalaryPaid({ schoolId: req.schoolId, recordId: parseInt(req.params.id), paidOn: when.date, userId: req.user.id });
    if (out.alreadyPaid) return res.status(409).json({ success: false, message: 'This salary is already marked as paid.' });
    res.json({ success: true, data: out.record, message: 'Salary issued and added to expenses.' });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, message: 'Salary record not found.' });
    throw err;
  }
}));

module.exports = router;
