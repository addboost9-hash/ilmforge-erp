const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const { requireRole } = require('../middleware/auth.middleware');
const { monthNumber, monthKeys, monthLabel } = require('../utils/feeMonth');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ─── helpers ────────────────────────────────────────────────────────────────

const isFinanceRole = (role) => ['super_admin', 'admin', 'accountant'].includes(role);

const requireFinance = (req, res, next) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }
  next();
};

/* Pakistan keeps one clock all year, UTC+5. A day picked in a report is a
   Pakistan day whatever zone the server runs in: on the live server (UTC),
   setHours(0) began the day at 5 a.m. Pakistan time. */
const PKT_MS = 5 * 3600 * 1000;
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
/** Parse a date-only string (YYYY-MM-DD) to the start of that Pakistan day */
const dayStart = (str) => {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - PKT_MS);
};
/** Parse a date-only string (YYYY-MM-DD) to the last millisecond of that Pakistan day */
const dayEnd = (str) => new Date(dayStart(str).getTime() + 864e5 - 1);
/** The Pakistan calendar day an instant falls on, as YYYY-MM-DD. */
const pktDay = (when = new Date()) => new Date(new Date(when).getTime() + PKT_MS).toISOString().slice(0, 10);
/** YYYY-MM-DD -> DD/MM/YYYY, as dates are written in Pakistan. */
const dmy = (ymd) => String(ymd).split('-').reverse().join('/');

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
    where: { voidedAt: null,
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
      where: { voidedAt: null, schoolId: req.schoolId, paymentDate: { gte: targetDate, lt: nextDay } },
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
    // Invoices hold the month as "7" or "July"/"Jul"; match every spelling.
    ...(month && { month: { in: monthKeys(month) } }),
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
      ...(month && { month: { in: monthKeys(month) } }),
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
      where: { voidedAt: null, schoolId: req.schoolId, paymentDate: dateFilter },
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
      where: { voidedAt: null, schoolId: req.schoolId, paymentDate: { lt: periodStart } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { schoolId: req.schoolId, date: { lt: periodStart } },
    }),
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { voidedAt: null, schoolId: req.schoolId, paymentDate: { gte: periodStart, lte: periodEnd } },
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
  const today = pktDay();
  const month = monthNumber(req.query.month) || Number(today.slice(5, 7)); // 1-12
  const year = parseInt(req.query.year) || Number(today.slice(0, 4));

  // The month as Pakistan sees it, whatever zone the server runs in.
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - PKT_MS);
  const monthEnd = new Date(Date.UTC(year, month, 1) - PKT_MS);

  const [collected, expenses, totalStudents, totalDue] = await Promise.all([
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { voidedAt: null, schoolId: req.schoolId, paymentDate: { gte: monthStart, lt: monthEnd } },
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
        // Generate Fees stores "7", admissions and old records "July" or
        // "Jul"; matching only "July" left most of the month's dues out.
        month: { in: monthKeys(month) },
      },
    }),
  ]);

  const totalCollected = collected._sum.amountPaid || 0;
  const totalExpenses = expenses._sum.amount || 0;

  res.json({
    success: true,
    data: {
      month: monthLabel(month),
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
      where: { voidedAt: null, schoolId: req.schoolId, paymentDate: dateFilter },
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

/* ─── Daily balance sheet: whose hand the cash is in ─────────────────────────
   Cash is counted by when it was ENTERED (createdAt), not by the date written
   on it. A fee received last week but keyed in today was never part of last
   week's handover, so it is cash still in this person's hand today; it is
   listed with its own date (datedOn, backdated) so whoever counts the cash
   can see why it is there. A payment with no receiver (fee history imported
   from old books) is a record, not anyone's cash, and is never counted; nor
   is an expense brought in from old records (importBatch set), or a parent's
   "I have paid online" note, which is a Rs 0 row until the school confirms it.
   What was carried into a day is that day's opening cash: everything
   collected since the last handover, less everything spent from it.

   A settlement (an AuditLog row, action 'BALANCESHEET_SETTLED') hands over
   everything entered up to its cut-off: the moment it was made, or the end of
   the day being settled when that day is already past, so settling last
   Tuesday does not also settle the days after it.
   ───────────────────────────────────────────────────────────────────────── */

/** A settlement's cut-off, in ms. Older rows have no `upTo`: they cut off when made. */
const settledUpTo = (log) => {
  try {
    const { upTo } = JSON.parse(log.details || '{}');
    if (upTo && !Number.isNaN(Date.parse(upTo))) return Date.parse(upTo);
  } catch { /* not JSON: fall back to when it was recorded */ }
  return new Date(log.createdAt).getTime();
};

// Shared computation behind daily-balancesheet / balancesheet/:date / balancesheet/latest.
// `date` is a Pakistan day, YYYY-MM-DD.
async function computeDailyBalancesheet(schoolId, accId, date) {
  const targetStart = dayStart(date);
  const targetEnd = dayEnd(date);

  // The comma matters: '"accountantId":1' alone also matched accountant 12.
  const settlements = await prisma.auditLog.findMany({
    where: { schoolId, action: 'BALANCESHEET_SETTLED', details: { contains: `"accountantId":${accId},` } },
    select: { createdAt: true, details: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const cutoffs = settlements.map(settledUpTo);
  const latest = cutoffs.length ? Math.max(...cutoffs) : null;
  const before = cutoffs.filter((c) => c < targetStart.getTime());
  // Cash carried into this day: entered after the last handover before it.
  const carriedFrom = new Date(before.length ? Math.max(...before) : 0);

  const cashIn = { voidedAt: null, schoolId, receivedBy: accId, amountPaid: { gt: 0 } };
  const cashOut = { schoolId, addedBy: accId, importBatch: null };

  const [carried, carriedOut, todayPayments, todayExpenses, categories] = await Promise.all([
    prisma.feePayment.findMany({
      where: { ...cashIn, createdAt: { gt: carriedFrom, lt: targetStart } },
      select: { amountPaid: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { ...cashOut, createdAt: { gt: carriedFrom, lt: targetStart } },
      select: { amount: true, createdAt: true },
    }),
    // Payments this person keyed in on the day, whatever day is written on them.
    prisma.feePayment.findMany({
      where: { ...cashIn, createdAt: { gte: targetStart, lte: targetEnd } },
      include: {
        invoice: {
          select: {
            feeTitle: true,
            month: true,
            year: true,
            student: { select: { name: true, rollNo: true, class: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    // Expenses this person keyed in on the day (paid out of the same cash).
    prisma.expense.findMany({
      where: { ...cashOut, createdAt: { gte: targetStart, lte: targetEnd } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expenseCategory.findMany({ where: { schoolId }, select: { id: true, name: true } }),
  ]);

  // Still to hand over: entered after the latest cut-off, or never handed over.
  const open = (row) => latest === null || new Date(row.createdAt).getTime() > latest;
  const sum = (rows, key) => rows.reduce((t, r) => t + (r[key] || 0), 0);
  const dated = (row, when) => {
    const on = pktDay(when);
    return { ...row, datedOn: on, backdated: on !== date };
  };
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const previousUnsettled = sum(carried, 'amountPaid') - sum(carriedOut, 'amount');
  const todayCollected = sum(todayPayments, 'amountPaid');
  const todayExpensesTotal = sum(todayExpenses, 'amount');
  const cashInHand = sum(carried.filter(open), 'amountPaid')
    - sum(carriedOut.filter(open), 'amount')
    + sum(todayPayments.filter(open), 'amountPaid')
    - sum(todayExpenses.filter(open), 'amount');
  const anyOpen = carried.some(open) || carriedOut.some(open) || todayPayments.some(open) || todayExpenses.some(open);

  const payments = todayPayments.map((p) => dated(p, p.paymentDate));
  const expenses = todayExpenses.map((e) => ({
    ...dated(e, e.date),
    category: e.categoryId ? categoryName.get(e.categoryId) || null : null,
  }));

  return {
    accountantId: accId,
    date,
    // Settled = nothing this person entered up to this day is still in hand.
    status: anyOpen ? 'unsettled' : 'settled',
    lastSettledAt: settlements[0]?.createdAt || null,
    payments,
    expenses,
    cashInHand,
    summary: {
      previousUnsettled,
      todayCollected,
      todayExpenses: todayExpensesTotal,
      handedOver: previousUnsettled + todayCollected - todayExpensesTotal - cashInHand,
      cashInHand,
      backdated: payments.filter((p) => p.backdated).length + expenses.filter((e) => e.backdated).length,
    },
  };
}

// Every person who handled cash on a day (the admin's Daily Balance Sheet):
// what they took in and spent that day, and what is still in their hand.
// Fee history imported that day (no receiver) is reported apart, as a count.
async function dailyBalancesheets(schoolId, date) {
  const targetStart = dayStart(date);
  const targetEnd = dayEnd(date);
  const [receivers, spenders, imported] = await Promise.all([
    prisma.feePayment.groupBy({
      by: ['receivedBy'],
      where: { schoolId, voidedAt: null, receivedBy: { not: null }, amountPaid: { gt: 0 }, createdAt: { lte: targetEnd } },
    }),
    prisma.expense.groupBy({
      by: ['addedBy'],
      where: { schoolId, addedBy: { not: null }, importBatch: null, createdAt: { gte: targetStart, lte: targetEnd } },
    }),
    prisma.feePayment.aggregate({
      where: { schoolId, voidedAt: null, receivedBy: null, createdAt: { gte: targetStart, lte: targetEnd } },
      _sum: { amountPaid: true },
      _count: true,
    }),
  ]);
  const ids = [...new Set([...receivers.map((r) => r.receivedBy), ...spenders.map((e) => e.addedBy)])];
  const [users, sheets] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, role: true } }),
    Promise.all(ids.map((id) => computeDailyBalancesheet(schoolId, id, date))),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));

  return {
    date,
    sheets: sheets
      // Only people with something on this day, or cash carried into it.
      .filter((s) => s.payments.length || s.expenses.length || s.summary.previousUnsettled || s.cashInHand)
      .map((s) => {
        const user = byId.get(s.accountantId);
        return { ...s, name: user?.name || 'Unknown user', email: user?.email || '', role: user?.role || '' };
      })
      .sort((a, b) => b.summary.todayCollected - a.summary.todayCollected),
    imported: { count: imported._count || 0, amount: imported._sum.amountPaid || 0 },
  };
}

// ─── 13. GET /report/accounting/daily-balancesheet ──────────────────────────
// ?date=YYYY-MM-DD&accountantId= — one person's daily balance sheet.
// ?date=YYYY-MM-DD alone — { date, sheets: [...one per person], imported }.
const accountantParam = (raw, fallback) => {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

router.get('/accounting/daily-balancesheet', requireFinance, wrap(async (req, res) => {
  const { date } = req.query;
  if (!isDay(date)) {
    return res.status(400).json({ success: false, message: 'date param required (YYYY-MM-DD).' });
  }
  const accId = accountantParam(req.query.accountantId, undefined);
  if (accId === null) return res.status(400).json({ success: false, message: 'accountantId must be a user id.' });
  const data = accId
    ? await computeDailyBalancesheet(req.schoolId, accId, date)
    : await dailyBalancesheets(req.schoolId, date);
  res.json({ success: true, data });
}));

// ─── GET /report/accounting/balancesheet/latest — Accountant Portal banner ──
// Today's sheet for the calling accountant (or ?accountantId= for admins).
router.get('/accounting/balancesheet/latest', requireFinance, wrap(async (req, res) => {
  const accId = accountantParam(req.query.accountantId, req.user.id);
  if (!accId) return res.status(400).json({ success: false, message: 'accountantId must be a user id.' });
  // Pakistan's today: the UTC server is still on yesterday until 5 a.m.
  const data = await computeDailyBalancesheet(req.schoolId, accId, pktDay());
  res.json({ success: true, data });
}));

// ─── GET /report/accounting/balancesheet/:date — a specific day's sheet for
// the calling accountant (or ?accountantId= for admins).
router.get('/accounting/balancesheet/:date', requireFinance, wrap(async (req, res) => {
  if (!isDay(req.params.date)) {
    return res.status(400).json({ success: false, message: 'Date must be YYYY-MM-DD.' });
  }
  const accId = accountantParam(req.query.accountantId, req.user.id);
  if (!accId) return res.status(400).json({ success: false, message: 'accountantId must be a user id.' });
  const data = await computeDailyBalancesheet(req.schoolId, accId, req.params.date);
  res.json({ success: true, data });
}));

// ─── 14. POST /report/accounting/settle ─────────────────────────────────────
// Mark a daily balancesheet as settled.
// Body: { accountantId, date, notes }
// An accountant may only settle their own sheet (self-service, matches the
// Accountant Portal's "Mark as Settled" button); admins/super_admins can
// settle on behalf of any accountant.
router.post('/accounting/settle', requireFinance, wrap(async (req, res) => {
  const { accountantId, date, notes } = req.body;
  if (!accountantId || !date) {
    return res.status(400).json({ success: false, message: 'accountantId and date required.' });
  }
  if (!isDay(date)) {
    return res.status(400).json({ success: false, message: 'Date must be YYYY-MM-DD.' });
  }
  if (date > pktDay()) {
    return res.status(400).json({ success: false, message: 'A day that has not come yet cannot be settled.' });
  }

  const accId = accountantParam(accountantId, null);
  if (!accId) return res.status(400).json({ success: false, message: 'accountantId must be a user id.' });
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isAdmin && accId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only settle your own balance sheet.' });
  }

  // Verify the person is in this school. Not only active users: the cash of
  // someone who has since left still has to be handed over and settled.
  const accountant = await prisma.user.findFirst({
    where: { id: accId, schoolId: req.schoolId },
    select: { id: true, name: true, role: true },
  });
  if (!accountant) {
    return res.status(404).json({ success: false, message: 'Accountant not found.' });
  }

  // Hands over everything entered up to now, or up to the end of that day
  // when settling a day already past (the days after it stay open). The
  // amount handed over is kept on the record for whoever audits the cash.
  const upTo = new Date(Math.min(Date.now(), dayEnd(date).getTime()));
  const sheet = await computeDailyBalancesheet(req.schoolId, accId, date);

  // Record settlement in audit log. accountantId stays the first key: the
  // sheet finds a person's settlements by the text '"accountantId":<id>,'.
  const log = await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BALANCESHEET_SETTLED',
      resource: 'daily_balancesheet',
      details: JSON.stringify({
        accountantId: accId, date, notes: notes || '', settledBy: req.user.id,
        upTo: upTo.toISOString(), amount: sheet.cashInHand,
      }),
    },
  });

  res.json({
    success: true,
    message: `Balance sheet settled for ${accountant.name} on ${dmy(date)}.`,
    data: { settlementId: log.id, accountantId: accId, date, settledBy: req.user.id, amount: sheet.cashInHand },
  });
}));

module.exports = router;
// Pure helpers, exported for tests/fees/fee-history.test.mjs.
module.exports.helpers = { dayStart, dayEnd, pktDay, settledUpTo };
