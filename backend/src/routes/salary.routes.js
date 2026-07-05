const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { month, year } = req.query;
  const records = await prisma.salaryRecord.findMany({
    where: { schoolId: req.schoolId, ...(month && { month: parseInt(month) }), ...(year && { year: parseInt(year) }) },
    include: { staff: { select: { name: true, designation: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: records });
}));

router.post('/generate', wrap(async (req, res) => {
  const { month, year } = req.body;
  const staff = await prisma.staff.findMany({ where: { schoolId: req.schoolId, isActive: true, deletedAt: null } });
  const results = [];
  for (const s of staff) {
    const existing = await prisma.salaryRecord.findFirst({ where: { schoolId: req.schoolId, staffId: s.id, month: parseInt(month), year: parseInt(year) } });
    if (existing) continue;
    const record = await prisma.salaryRecord.create({ data: { schoolId: req.schoolId, staffId: s.id, month: parseInt(month), year: parseInt(year), basic: s.basicSalary, netSalary: s.basicSalary, status: 'pending' } });
    results.push(record);
  }
  res.json({ success: true, data: results, message: `${results.length} salary records generated.` });
}));

router.post('/:id/issue', wrap(async (req, res) => {
  const record = await prisma.salaryRecord.update({ where: { id: parseInt(req.params.id) }, data: { status: 'issued', issuedBy: req.user.id, issueDate: new Date() } });
  await prisma.expense.create({ data: { schoolId: req.schoolId, amount: record.netSalary, description: `Staff Salary - ${record.month}/${record.year}`, date: new Date(), addedBy: req.user.id } });
  res.json({ success: true, data: record, message: 'Salary issued and added to expenses.' });
}));

module.exports = router;
