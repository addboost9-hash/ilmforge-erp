const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/dashboard/stats
router.get('/stats', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalStudents, maleStudents, femaleStudents, passoutStudents,
    totalStaff, presentStaff, absentStaff,
    unpaidInvoices,
    incomeToday, expenseToday, incomeMonth
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, ...(campusId && { campusId }), status: 'active', deletedAt: null } }),
    prisma.student.count({ where: { schoolId, ...(campusId && { campusId }), status: 'active', gender: 'male', deletedAt: null } }),
    prisma.student.count({ where: { schoolId, ...(campusId && { campusId }), status: 'active', gender: 'female', deletedAt: null } }),
    prisma.student.count({ where: { schoolId, ...(campusId && { campusId }), status: 'passout', deletedAt: null } }),
    prisma.staff.count({ where: { schoolId, ...(campusId && { campusId }), isActive: true, deletedAt: null } }),
    prisma.staffAttendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }),
    prisma.staffAttendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'absent' } }),
    prisma.feeInvoice.count({ where: { schoolId, status: { in: ['unpaid', 'partial'] } } }),
    prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { schoolId, paymentDate: { gte: today, lt: tomorrow } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { schoolId, date: { gte: today, lt: tomorrow } } }),
    prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { schoolId, paymentDate: { gte: monthStart, lt: tomorrow } } }),
  ]);

  const incomeTodayVal = incomeToday._sum.amountPaid || 0;
  const expenseTodayVal = expenseToday._sum.amount || 0;
  const incomeMonthVal = incomeMonth._sum.amountPaid || 0;

  // Monthly income chart (last 12 months)
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0,0,0,0);
    const end = new Date(d); end.setMonth(end.getMonth() + 1);
    const inc = await prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { schoolId, paymentDate: { gte: d, lt: end } } });
    const exp = await prisma.expense.aggregate({ _sum: { amount: true }, where: { schoolId, date: { gte: d, lt: end } } });
    months.push({ month: d.toLocaleString('en', { month: 'short' }), income: inc._sum.amountPaid || 0, expense: exp._sum.amount || 0 });
  }

  // Class-wise summary
  const classes = await prisma.class.findMany({ where: { schoolId, isActive: true }, orderBy: { orderNo: 'asc' } });
  const classStats = await Promise.all(classes.map(async (c) => {
    const strength = await prisma.student.count({ where: { schoolId, classId: c.id, status: 'active', deletedAt: null } });
    const presentToday = await prisma.attendance.count({ where: { schoolId, classId: c.id, date: { gte: today, lt: tomorrow }, status: 'present' } });
    const invoiceStats = await prisma.feeInvoice.aggregate({
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
      where: { schoolId, classId: c.id }
    });
    return {
      classId: c.id, className: c.name, strength, presentToday,
      expectedFee: invoiceStats._sum.totalAmount || 0,
      paidFee: invoiceStats._sum.paidAmount || 0,
      balanceFee: invoiceStats._sum.dueAmount || 0,
    };
  }));

  res.json({
    success: true, data: {
      students: { total: totalStudents, male: maleStudents, female: femaleStudents, passout: passoutStudents },
      staff: { total: totalStaff, presentToday: presentStaff, absentToday: absentStaff },
      finance: {
        unpaidInvoices, incomeToday: incomeTodayVal, expenseToday: expenseTodayVal,
        profitToday: incomeTodayVal - expenseTodayVal, incomeThisMonth: incomeMonthVal,
      },
      monthlyChart: months,
      classStats,
    }
  });
}));

module.exports = router;
