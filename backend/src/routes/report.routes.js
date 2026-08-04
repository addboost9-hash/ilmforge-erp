const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/students/excel', wrap(async (req, res) => {
  const { classId, status = 'active' } = req.query;
  const students = await prisma.student.findMany({
    where: { schoolId: req.schoolId, deletedAt: null, status, ...(classId && { classId: parseInt(classId) }) },
    include: { class: true, section: true }, orderBy: { name: 'asc' }
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  ws.columns = [
    { header: 'Roll No', key: 'rollNo', width: 12 }, { header: 'Name', key: 'name', width: 25 },
    { header: 'Father Name', key: 'fatherName', width: 25 }, { header: 'Class', key: 'class', width: 12 },
    { header: 'Section', key: 'section', width: 10 }, { header: 'Gender', key: 'gender', width: 10 },
    { header: 'DOB', key: 'dob', width: 15 }, { header: 'Status', key: 'status', width: 12 },
    { header: 'Admission Date', key: 'admissionDate', width: 18 },
  ];
  students.forEach(s => ws.addRow({ rollNo: s.rollNo, name: s.name, fatherName: s.fatherName, class: s.class?.name, section: s.section?.name, gender: s.gender, dob: s.dob?.toLocaleDateString(), status: s.status, admissionDate: s.admissionDate?.toLocaleDateString() }));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
  await wb.xlsx.write(res);
  res.end();
}));

router.get('/fees/income', wrap(async (req, res) => {
  const { month, year } = req.query;
  const where = { schoolId: req.schoolId, ...(month && { month }), ...(year && { year: parseInt(year) }) };
  const payments = await prisma.feePayment.findMany({
    where: { schoolId: req.schoolId, ...(year && { paymentDate: { gte: new Date(parseInt(year), (parseInt(month)||1)-1, 1), lt: new Date(parseInt(year), (parseInt(month)||12), 1) } }) },
    include: { invoice: { include: { student: { select: { name: true, rollNo: true } } } } },
    orderBy: { paymentDate: 'desc' }
  });
  res.json({ success: true, data: payments });
}));

router.get('/fees/balance-sheet', wrap(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0,0,0,0);
  const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate()+1);
  const [income, expense] = await Promise.all([
    prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { schoolId: req.schoolId, paymentDate: { gte: targetDate, lt: nextDay } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { schoolId: req.schoolId, date: { gte: targetDate, lt: nextDay } } }),
  ]);
  const incomeVal = income._sum.amountPaid || 0;
  const expenseVal = expense._sum.amount || 0;
  res.json({ success: true, data: { date: targetDate.toISOString(), income: incomeVal, expense: expenseVal, profit: incomeVal - expenseVal } });
}));

module.exports = router;
