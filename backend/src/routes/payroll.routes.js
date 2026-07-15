const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

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

// POST /generate - generate payroll for month/year
router.post('/generate', wrap(async (req, res) => {
  const { schoolId } = req;
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required.' });

  const monthInt = parseInt(month);
  const yearInt  = parseInt(year);

  const allStaff = await prisma.staff.findMany({
    where: { schoolId, isActive: true, deletedAt: null },
  });

  let generated = 0;
  let skipped   = 0;
  const results = [];

  for (const staff of allStaff) {
    // Check if record already exists
    const existing = await prisma.salaryRecord.findFirst({
      where: { schoolId, staffId: staff.id, month: monthInt, year: yearInt },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const basic      = staff.basicSalary || 0;
    const allowances = 0;
    const deductions = 0;
    const netSalary  = basic + allowances - deductions;

    const record = await prisma.salaryRecord.create({
      data: {
        schoolId,
        staffId:          staff.id,
        month:            monthInt,
        year:             yearInt,
        basic,
        allowances,
        deductionsAbsent: 0,
        deductionsLate:   0,
        loanDeduction:    0,
        bonus:            0,
        netSalary,
        status:           'pending',
      },
    });

    generated++;
    results.push(record);
  }

  res.json({ success: true, data: { generated, skipped, records: results } });
}));

// PUT /:id - update salary record
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.salaryRecord.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });

  const { basic, allowances, deductionsAbsent, deductionsLate, loanDeduction, bonus, status } = req.body;

  const newBasic          = basic          !== undefined ? parseInt(basic)          : existing.basic;
  const newAllowances     = allowances     !== undefined ? parseInt(allowances)     : existing.allowances;
  const newDeductAbsent   = deductionsAbsent !== undefined ? parseInt(deductionsAbsent) : existing.deductionsAbsent;
  const newDeductLate     = deductionsLate !== undefined ? parseInt(deductionsLate) : existing.deductionsLate;
  const newLoanDeduction  = loanDeduction  !== undefined ? parseInt(loanDeduction)  : existing.loanDeduction;
  const newBonus          = bonus          !== undefined ? parseInt(bonus)          : existing.bonus;
  const netSalary         = newBasic + newAllowances + newBonus - newDeductAbsent - newDeductLate - newLoanDeduction;

  const updated = await prisma.salaryRecord.update({
    where: { id: parseInt(req.params.id) },
    data: {
      basic:            newBasic,
      allowances:       newAllowances,
      deductionsAbsent: newDeductAbsent,
      deductionsLate:   newDeductLate,
      loanDeduction:    newLoanDeduction,
      bonus:            newBonus,
      netSalary,
      ...(status && { status }),
    },
  });
  res.json({ success: true, data: updated });
}));

// POST /pay/:id - mark one record as paid
router.post('/pay/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.salaryRecord.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });

  const updated = await prisma.salaryRecord.update({
    where: { id: parseInt(req.params.id) },
    data: {
      status:    'issued',
      issuedBy:  req.user?.id || null,
      issueDate: new Date(),
    },
  });
  res.json({ success: true, data: updated });
}));

// POST /pay-all - mark all pending for month/year as paid
router.post('/pay-all', wrap(async (req, res) => {
  const { schoolId } = req;
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required.' });

  const result = await prisma.salaryRecord.updateMany({
    where: { schoolId, month: parseInt(month), year: parseInt(year), status: 'pending' },
    data: {
      status:    'issued',
      issuedBy:  req.user?.id || null,
      issueDate: new Date(),
    },
  });

  res.json({ success: true, data: { count: result.count }, message: `${result.count} records marked as paid.` });
}));

// GET /summary - stats for month/year
router.get('/summary', wrap(async (req, res) => {
  const { schoolId } = req;
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required.' });

  const where = { schoolId, month: parseInt(month), year: parseInt(year) };

  const [total, paid, pending, agg] = await Promise.all([
    prisma.salaryRecord.count({ where }),
    prisma.salaryRecord.count({ where: { ...where, status: 'issued' } }),
    prisma.salaryRecord.count({ where: { ...where, status: 'pending' } }),
    prisma.salaryRecord.aggregate({ where, _sum: { netSalary: true, basic: true, allowances: true } }),
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
      totalBasic:    agg._sum.basic     || 0,
      totalAllowances: agg._sum.allowances || 0,
      month:  parseInt(month),
      year:   parseInt(year),
    },
  });
}));

module.exports = router;
