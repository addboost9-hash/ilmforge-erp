const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { pastDate } = require('../utils/pastDate');
const {
  markSalaryPaid, generateSalaries, generateMessage, salaryPeriod, salaryEdit, pkDayKey,
} = require('../services/salaryPayment.service');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// "14/03/2026": the day, in Pakistan, as people there write it.
const pkDate = (d) => pkDayKey(d).split('-').reverse().join('/');
const paidMessage = (rec) =>
  `This salary was already paid${rec.issueDate ? ` on ${pkDate(rec.issueDate)}` : ''}, so it can no longer be edited.`;

// GET / - list salary records
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { month, year, status, staffId } = req.query;
  const where = { schoolId };
  if (month)   where.month   = parseInt(month);
  if (year)    where.year    = parseInt(year);
  if (status)  where.status  = status;
  if (staffId) where.staffId = parseInt(staffId);

  const records = await prisma.salaryRecord.findMany({
    where,
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          designation: true,
          empCode: true,
          basicSalary: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { staffId: 'asc' }],
  });

  res.json({ success: true, data: records });
}));

// POST /generate - create the month's salary records for active staff
// Body: { month: 1-12, year }. Staff who joined after that month are skipped
// and named in the reply, so a school entering past months does not bill
// people who were not there yet.
router.post('/generate', wrap(async (req, res) => {
  const period = salaryPeriod(req.body?.month, req.body?.year);
  if (period.error) return res.status(400).json({ success: false, message: period.error });

  const out = await generateSalaries({ schoolId: req.schoolId, ...period });
  res.json({
    success: true,
    data: {
      generated:        out.records.length,
      skipped:          out.skipped,
      alreadyGenerated: out.alreadyGenerated,
      notJoinedYet:     out.notJoinedYet,
      records:          out.records,
    },
    message: generateMessage(out, period.month, period.year),
  });
}));

// PUT /:id - correct an unpaid salary's amounts (paisa, whole, 0 or more)
// The net is always worked out again from the parts. A paid salary is not
// edited: its amount is already recorded under Expenses and on the slip.
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const existing = await prisma.salaryRecord.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
  if (existing.status === 'issued') return res.status(409).json({ success: false, message: paidMessage(existing) });

  // Paying goes through Pay, which also records the expense on the day paid.
  const { status } = req.body || {};
  if (status !== undefined && status !== 'pending') {
    return res.status(400).json({ success: false, message: 'To mark a salary as paid, use Pay. It also records the payment under Expenses.' });
  }

  const edit = salaryEdit(existing, req.body || {});
  if (edit.error) return res.status(400).json({ success: false, message: edit.error });

  // Only while still unpaid: if Pay lands between the check above and this
  // write, the amount paid and the expense recorded for it must not change.
  const { count } = await prisma.salaryRecord.updateMany({
    where: { id, schoolId, status: { not: 'issued' } },
    data: edit.data,
  });
  if (count === 0) {
    const now = await prisma.salaryRecord.findFirst({ where: { id, schoolId } });
    return res.status(409).json({ success: false, message: paidMessage(now || existing) });
  }

  const updated = await prisma.salaryRecord.findFirst({
    where: { id, schoolId },
    include: { staff: { select: { id: true, name: true, designation: true, empCode: true, basicSalary: true, user: { select: { name: true } } } } },
  });
  res.json({ success: true, data: updated, message: 'Salary updated.' });
}));

// POST /pay/:id - mark one record as paid
// Body (optional): { paidOn: 'YYYY-MM-DD' } — the day it was really paid.
router.post('/pay/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const when = pastDate(req.body?.paidOn, { label: 'Paid on' });
  if (when.error) return res.status(400).json({ success: false, message: when.error });
  try {
    const out = await markSalaryPaid({ schoolId, recordId: parseInt(req.params.id), paidOn: when.date, userId: req.user?.id || null });
    if (out.alreadyPaid) return res.status(409).json({ success: false, message: 'This salary is already marked as paid.' });
    res.json({ success: true, data: out.record, message: 'Salary paid and recorded under Expenses › Salaries.' });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, message: err.message });
    throw err;
  }
}));

// POST /pay-all - mark all pending for month/year as paid
router.post('/pay-all', wrap(async (req, res) => {
  const { schoolId } = req;
  const period = salaryPeriod(req.body?.month, req.body?.year);
  if (period.error) return res.status(400).json({ success: false, message: period.error });

  const when = pastDate(req.body?.paidOn, { label: 'Paid on' });
  if (when.error) return res.status(400).json({ success: false, message: when.error });

  // One by one, so each salary is also recorded once under Expenses.
  const pendingRecords = await prisma.salaryRecord.findMany({
    where: { schoolId, month: period.month, year: period.year, status: 'pending' },
    select: { id: true },
  });
  let count = 0;
  for (const r of pendingRecords) {
    const out = await markSalaryPaid({ schoolId, recordId: r.id, paidOn: when.date, userId: req.user?.id || null });
    if (!out.alreadyPaid) count += 1;
  }

  res.json({ success: true, data: { count }, message: `${count} salaries marked as paid and recorded under Expenses › Salaries.` });
}));

// GET /summary - stats for month/year
router.get('/summary', wrap(async (req, res) => {
  const { schoolId } = req;
  const period = salaryPeriod(req.query.month, req.query.year);
  if (period.error) return res.status(400).json({ success: false, message: period.error });
  const { month, year } = period;

  const where = { schoolId, month, year };

  const [total, paid, pending, agg, paidAgg] = await Promise.all([
    prisma.salaryRecord.count({ where }),
    prisma.salaryRecord.count({ where: { ...where, status: 'issued' } }),
    prisma.salaryRecord.count({ where: { ...where, status: 'pending' } }),
    prisma.salaryRecord.aggregate({ where, _sum: { netSalary: true, basic: true, allowances: true } }),
    prisma.salaryRecord.aggregate({ where: { ...where, status: 'issued' }, _sum: { netSalary: true } }),
  ]);

  const totalStaff = await prisma.staff.count({ where: { schoolId, isActive: true, deletedAt: null } });

  res.json({
    success: true,
    data: {
      totalStaff,
      totalRecords:  total,
      paid,
      pending,
      totalSalary:   agg._sum.netSalary || 0,
      paidAmount:    paidAgg._sum.netSalary || 0,
      totalBasic:    agg._sum.basic     || 0,
      totalAllowances: agg._sum.allowances || 0,
      month,
      year,
    },
  });
}));

module.exports = router;
