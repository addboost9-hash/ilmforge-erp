const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const { requireRole } = require('../middleware/auth.middleware');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ─── helpers ────────────────────────────────────────────────────────────────

const isFinanceRole = (role) => ['super_admin', 'admin', 'accountant'].includes(role);

const requireFinance = (req, res, next) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

/** Parse a date-only string (YYYY-MM-DD) to start-of-day Date */
const dayStart = (str) => { const d = new Date(str); d.setHours(0, 0, 0, 0); return d; };
/** Parse a date-only string (YYYY-MM-DD) to exclusive next-day Date */
const dayEnd = (str) => { const d = new Date(str); d.setHours(23, 59, 59, 999); return d; };

// ─── 1. GET /report/students/excel ──────────────────────────────────────────
router.get('/students/excel', wrap(async (req, res) => {
  const { classId, status = 'active' } = req.query;
  const students = await prisma.student.findMany({
    where: {
      schoolId: req.schoolId,
      deletedAt: null,
      status,
      ...(classId && { classId: parseInt(classId) }),
    },
    include: { class: true, section: true },
    orderBy: { name: 'asc' },
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  ws.columns = [
    { header: 'Roll No', key: 'rollNo', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Father Name', key: 'fatherName', width: 25 },
    { header: 'Class', key: 'class', width: 12 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'DOB', key: 'dob', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Admission Date', key: 'admissionDate', width: 18 },
  ];
  students.forEach((s) =>
    ws.addRow({
      rollNo: s.rollNo,
      name: s.name,
      fatherName: s.fatherName,
      class: s.class?.name,
      section: s.section?.name,
      gender: s.gender,
      dob: s.dob?.toLocaleDateString(),
      status: s.status,
      admissionDate: s.admissionDate?.toLocaleDateString(),
    })
  );
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
  await wb.xlsx.write(res);
  res.end();
}));

// ─── 2. GET /report/fees/income ─────────────────────────────────────────────
router.get('/fees/income', wrap(async (req, res) => {
  const { month, year } = req.query;
  const payments = await prisma.feePayment.findMany({
    where: {
      schoolId: req.schoolId,
      ...(year && {
        paymentDate: {
          gte: new Date(parseInt(year), (parseInt(month) || 1) - 1, 1),
          lt: new Date(parseInt(year), (parseInt(month) || 12), 1),
        },
      }),
    },
    include: {
      invoice: {
        include: { student: { select: { name: true, rollNo: true } } },
      },
    },
    orderBy: { paymentDate: 'desc' },
  });
  res.json({ success: true, data: payments });
}));

// ─── 3. GET /report/fees/balance-sheet ──────────────────────────────────────
router.get('/fees/balance-sheet', wrap(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const [income, expense] = await Promise.all([
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { schoolId: req.schoolId, paymentDate: { gte: targetDate, lt: nextDay } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { schoolId: req.schoolId, date: { gte: targetDate, lt: nextDay } },
    }),
  ]);
  const incomeVal = income._sum.amountPaid || 0;
  const expenseVal = expense._sum.amount || 0;
  res.json({
    success: true,
    data: {
      date: targetDate.toISOString(),
      income: incomeVal,
      expense: expenseVal,
      profit: incomeVal - expenseVal,
    },
  });
}));

// ─── 4. GET /report/students/strength ───────────────────────────────────────
// Returns student count grouped by class and section
router.get('/students/strength', wrap(async (req, res) => {
  const { status = 'active' } = req.query;

  // Fetch all active classes for this school (with sections)
  const classes = await prisma.class.findMany({
    where: { schoolId: req.schoolId, isActive: true },
    include: { sections: true },
    orderBy: { orderNo: 'asc' },
  });

  // Fetch counts grouped by classId + sectionId
  const students = await prisma.student.findMany({
    where: { schoolId: req.schoolId, deletedAt: null, status },
    select: { classId: true, sectionId: true },
  });

  // Build count map: { classId: { sectionId: count, null: count } }
  const countMap = {};
  for (const s of students) {
    const cKey = s.classId ?? 0;
    if (!countMap[cKey]) countMap[cKey] = {};
    const sKey = s.sectionId ?? 0;
    countMap[cKey][sKey] = (countMap[cKey][sKey] || 0) + 1;
  }

  const result = classes.map((cls) => {
    const classMap = countMap[cls.id] || {};
    const sections = cls.sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      count: classMap[sec.id] || 0,
    }));
    // Students in this class but no section
    const noSectionCount = classMap[0] || 0;
    if (noSectionCount > 0) {
      sections.push({ id: null, name: 'No Section', count: noSectionCount });
    }
    const total = sections.reduce((sum, s) => sum + s.count, 0);
    return { classId: cls.id, className: cls.name, sections, total };
  });

  const grandTotal = result.reduce((sum, c) => sum + c.total, 0);
  res.json({ success: true, data: result, grandTotal });
}));

// ─── 5. GET /report/students/admission?from=&to= ────────────────────────────
// Students admitted between date range
router.get('/students/admission', wrap(async (req, res) => {
  const { from, to, classId, status } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'from and to date params required (YYYY-MM-DD).' });
  }
  const students = await prisma.student.findMany({
    where: {
      schoolId: req.schoolId,
      deletedAt: null,
      admissionDate: { gte: dayStart(from), lte: dayEnd(to) },
      ...(classId && { classId: parseInt(classId) }),
      ...(status && { status }),
    },
    include: { class: true, section: true },
    orderBy: { admissionDate: 'asc' },
  });
  res.json({ success: true, data: students, total: students.length });
}));

// ─── 6. GET /report/fees/head-dues ──────────────────────────────────────────
// Fee dues grouped by fee type / head (feeTitle)
router.get('/fees/head-dues', requireFinance, wrap(async (req, res) => {
  const { month, year } = req.query;
  const where = {
    schoolId: req.schoolId,
    ...(month && { month }),
    ...(year && { year: parseInt(year) }),
  };

  // Group by feeTitle
  const invoices = await prisma.feeInvoice.findMany({
    where,
    select: { feeTitle: true, totalAmount: true, paidAmount: true, dueAmount: true, discount: true },
  });

  const groups = {};
  for (const inv of invoices) {
    const key = inv.feeTitle || 'Unknown';
    if (!groups[key]) {
      groups[key] = { feeType: key, totalBilled: 0, totalPaid: 0, totalDiscount: 0, balance: 0 };
    }
    groups[key].totalBilled += inv.totalAmount;
    groups[key].totalPaid += inv.paidAmount;
    groups[key].totalDiscount += inv.discount || 0;
    groups[key].balance += inv.dueAmount;
  }

  const data = Object.values(groups).sort((a, b) => b.balance - a.balance);
  res.json({ success: true, data });
}));

// ─── 7. GET /report/fees/discount ───────────────────────────────────────────
// Students with active discounts on their invoices
router.get('/fees/discount', requireFinance, wrap(async (req, res) => {
  const { month, year } = req.query;
  const invoices = await prisma.feeInvoice.findMany({
    where: {
      schoolId: req.schoolId,
      discount: { gt: 0 },
      ...(month && { month }),
      ...(year && { year: parseInt(year) }),
    },
    include: {
      student: {
        select: { id: true, name: true, rollNo: true, classId: true, class: { select: { name: true } }, section: { select: { name: true } } },
      },
    },
    orderBy: { discount: 'desc' },
  });

  const data = invoices.map((inv) => ({
    invoiceId: inv.id,
    voucherNo: inv.voucherNo,
    studentId: inv.student?.id,
    student: inv.student?.name,
    rollNo: inv.student?.rollNo,
    class: inv.student?.class?.name,
    section: inv.student?.section?.name,
    feeTitle: inv.feeTitle,
    month: inv.month,
    year: inv.year,
    totalAmount: inv.totalAmount,
    discountAmount: inv.discount,
    discountType: 'manual', // schema has no separate discountType field
    paidAmount: inv.paidAmount,
    dueAmount: inv.dueAmount,
  }));

  res.json({ success: true, data, total: data.length });
}));

// ─── 8. GET /report/accounting/income-expense?from=&to= ─────────────────────
// Combined income (fee payments) and expense records in a date range
router.get('/accounting/income-expense', requireFinance, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'from and to date params required (YYYY-MM-DD).' });
  }
  const dateFilter = { gte: dayStart(from), lte: dayEnd(to) };

  const [payments, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: { schoolId: req.schoolId, paymentDate: dateFilter },
      include: {
        invoice: {
          select: { feeTitle: true, month: true, year: true, student: { select: { name: true, rollNo: true } } },
        },
      },
      orderBy: { paymentDate: 'asc' },
    }),
    prisma.expense.findMany({
      where: { schoolId: req.schoolId, date: dateFilter },
      orderBy: { date: 'asc' },
    }),
  ]);

  const totalIncome = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  res.json({
    success: true,
    data: {
      income: payments,
      expenses,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
    },
  });
}));

// ─── 9. GET /report/accounting/balance-sheet?from=&to= ──────────────────────
// Full balance sheet: opening balance, income, expenses, closing balance
router.get('/accounting/balance-sheet', requireFinance, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'from and to date params required (YYYY-MM-DD).' });
  }

  const periodStart = dayStart(from);
  const periodEnd = dayEnd(to);

  // Opening balance = all income before periodStart minus all expenses before periodStart
  const [openingIncome, openingExpense, periodPayments, periodExpenses] = await Promise.all([
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { schoolId: req.schoolId, paymentDate: { lt: periodStart } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { schoolId: req.schoolId, date: { lt: periodStart } },
    }),
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { schoolId: req.schoolId, paymentDate: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { schoolId: req.schoolId, date: { gte: periodStart, lte: periodEnd } },
    }),
  ]);

  const openingBalance = (openingIncome._sum.amountPaid || 0) - (openingExpense._sum.amount || 0);
  const periodIncome = periodPayments._sum.amountPaid || 0;
  const periodExpense = periodExpenses._sum.amount || 0;
  const closingBalance = openingBalance + periodIncome - periodExpense;

  res.json({
    success: true,
    data: {
      period: { from, to },
      openingBalance,
      income: periodIncome,
      expenses: periodExpense,
      netChange: periodIncome - periodExpense,
      closingBalance,
    },
  });
}));

// ─── 10. GET /report/accounting/summary ─────────────────────────────────────
// Monthly summary cards: totalCollected, totalExpenses, netBalance for current/given month
router.get('/accounting/summary', requireFinance, wrap(async (req, res) => {
  const now = new Date();
  const month = req.query.month ? parseInt(req.query.month) - 1 : now.getMonth(); // 0-indexed
  const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const [collected, expenses, totalStudents, totalDue] = await Promise.all([
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { schoolId: req.schoolId, paymentDate: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { schoolId: req.schoolId, date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.student.count({
      where: { schoolId: req.schoolId, deletedAt: null, status: 'active' },
    }),
    prisma.feeInvoice.aggregate({
      _sum: { dueAmount: true },
      where: {
        schoolId: req.schoolId,
        status: { in: ['unpaid', 'partial'] },
        year,
        month: monthStart.toLocaleString('default', { month: 'long' }),
      },
    }),
  ]);

  const totalCollected = collected._sum.amountPaid || 0;
  const totalExpenses = expenses._sum.amount || 0;

  res.json({
    success: true,
    data: {
      month: monthStart.toLocaleString('default', { month: 'long' }),
      year,
      totalCollected,
      totalExpenses,
      netBalance: totalCollected - totalExpenses,
      totalStudents,
      totalOutstanding: totalDue._sum.dueAmount || 0,
    },
  });
}));

// ─── 11. GET /report/accounting/debit-credit?from=&to= ──────────────────────
// Debit (expenses) and Credit (income) statement with running balance
router.get('/accounting/debit-credit', requireFinance, wrap(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'from and to date params required (YYYY-MM-DD).' });
  }

  const dateFilter = { gte: dayStart(from), lte: dayEnd(to) };

  const [payments, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: { schoolId: req.schoolId, paymentDate: dateFilter },
      include: {
        invoice: { select: { feeTitle: true, student: { select: { name: true, rollNo: true } } } },
      },
      orderBy: { paymentDate: 'asc' },
    }),
    prisma.expense.findMany({
      where: { schoolId: req.schoolId, date: dateFilter },
      orderBy: { date: 'asc' },
    }),
  ]);

  // Merge into a single sorted ledger
  const ledger = [];
  for (const p of payments) {
    ledger.push({
      date: p.paymentDate,
      description: `Fee Received — ${p.invoice?.student?.name || ''} (${p.invoice?.feeTitle || ''})`,
      debit: 0,
      credit: p.amountPaid,
      ref: p.receiptNo || `PAY-${p.id}`,
    });
  }
  for (const e of expenses) {
    ledger.push({
      date: e.date,
      description: e.description || 'Expense',
      debit: e.amount,
      credit: 0,
      ref: `EXP-${e.id}`,
    });
  }

  // Sort by date ascending
  ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Add running balance
  let balance = 0;
  const statement = ledger.map((row) => {
    balance += row.credit - row.debit;
    return { ...row, balance };
  });

  res.json({ success: true, data: statement, total: statement.length });
}));

// ─── 12. GET /report/staff/salary?month=&year= ──────────────────────────────
// Staff salary records for a given month/year
router.get('/staff/salary', requireFinance, wrap(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year params required.' });
  }

  const records = await prisma.salaryRecord.findMany({
    where: {
      schoolId: req.schoolId,
      month: parseInt(month),
      year: parseInt(year),
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          empCode: true,
          designation: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { staff: { name: 'asc' } },
  });

  const data = records.map((r) => ({
    recordId: r.id,
    staffId: r.staffId,
    name: r.staff?.name,
    empCode: r.staff?.empCode,
    designation: r.staff?.designation,
    department: r.staff?.department?.name,
    month: r.month,
    year: r.year,
    basic: r.basic,
    allowances: r.allowances,
    deductions: r.deductionsAbsent + r.deductionsLate + r.loanDeduction,
    deductionsAbsent: r.deductionsAbsent,
    deductionsLate: r.deductionsLate,
    loanDeduction: r.loanDeduction,
    bonus: r.bonus,
    netSalary: r.netSalary,
    status: r.status,
    issueDate: r.issueDate,
  }));

  const totalNet = data.reduce((sum, r) => sum + r.netSalary, 0);
  res.json({ success: true, data, total: data.length, totalNet });
}));

// ─── 13. GET /report/accounting/daily-balancesheet ──────────────────────────
// Individual accountant's daily balance sheet
// ?accountantId=&date=
router.get('/accounting/daily-balancesheet', requireFinance, wrap(async (req, res) => {
  const { accountantId, date } = req.query;
  if (!accountantId || !date) {
    return res.status(400).json({ success: false, message: 'accountantId and date params required.' });
  }

  const accId = parseInt(accountantId);
  const targetStart = dayStart(date);
  const targetEnd = dayEnd(date);

  // Previous days: unsettled payments collected by this accountant (before today)
  // Settlement is tracked in AuditLog with action 'BALANCESHEET_SETTLED'
  const lastSettlement = await prisma.auditLog.findFirst({
    where: {
      schoolId: req.schoolId,
      action: 'BALANCESHEET_SETTLED',
      details: { contains: `"accountantId":${accId}` },
    },
    orderBy: { createdAt: 'desc' },
  });

  const unsettledSince = lastSettlement
    ? new Date(lastSettlement.createdAt)
    : new Date(0); // beginning of time if never settled

  // Payments received by this accountant today
  const todayPayments = await prisma.feePayment.findMany({
    where: {
      schoolId: req.schoolId,
      receivedBy: accId,
      paymentDate: { gte: targetStart, lte: targetEnd },
    },
    include: {
      invoice: {
        select: {
          feeTitle: true,
          month: true,
          year: true,
          student: { select: { name: true, rollNo: true } },
        },
      },
    },
    orderBy: { paymentDate: 'asc' },
  });

  // Expenses added by this accountant today
  const todayExpenses = await prisma.expense.findMany({
    where: {
      schoolId: req.schoolId,
      addedBy: accId,
      date: { gte: targetStart, lte: targetEnd },
    },
    orderBy: { date: 'asc' },
  });

  // Previous unsettled payments (between lastSettlement and today start)
  const previousPayments = await prisma.feePayment.findMany({
    where: {
      schoolId: req.schoolId,
      receivedBy: accId,
      paymentDate: { gte: unsettledSince, lt: targetStart },
    },
    select: { amountPaid: true },
  });

  const todayCollected = todayPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const previousUnsettled = previousPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const cashInHand = previousUnsettled + todayCollected - todayExpensesTotal;

  res.json({
    success: true,
    data: {
      accountantId: accId,
      date,
      lastSettledAt: lastSettlement?.createdAt || null,
      payments: todayPayments,
      expenses: todayExpenses,
      summary: {
        previousUnsettled,
        todayCollected,
        todayExpenses: todayExpensesTotal,
        cashInHand,
      },
    },
  });
}));

// ─── 14. POST /report/accounting/settle ─────────────────────────────────────
// Mark a daily balancesheet as settled (admin only)
// Body: { accountantId, date, notes }
router.post('/accounting/settle', requireAdmin, wrap(async (req, res) => {
  const { accountantId, date, notes } = req.body;
  if (!accountantId || !date) {
    return res.status(400).json({ success: false, message: 'accountantId and date required.' });
  }

  const accId = parseInt(accountantId);

  // Verify accountant exists in this school
  const accountant = await prisma.user.findFirst({
    where: { id: accId, schoolId: req.schoolId, isActive: true },
    select: { id: true, name: true, role: true },
  });
  if (!accountant) {
    return res.status(404).json({ success: false, message: 'Accountant not found.' });
  }

  // Record settlement in audit log
  const log = await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BALANCESHEET_SETTLED',
      resource: 'daily_balancesheet',
      details: JSON.stringify({ accountantId: accId, date, notes: notes || '', settledBy: req.user.id }),
    },
  });

  res.json({
    success: true,
    message: `Balance sheet settled for ${accountant.name} on ${date}.`,
    data: { settlementId: log.id, accountantId: accId, date, settledBy: req.user.id },
  });
}));

module.exports = router;
