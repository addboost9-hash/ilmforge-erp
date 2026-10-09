/**
 * IlmForge — a school's old records: past fees, salaries and expenses.
 *
 * A school that joins IlmForge part-way through its life brings its history
 * with it, so dashboards, reports, each student's fee record and the payroll
 * are complete from the first day. One Excel workbook, four sheets:
 *
 *   Fee History       one row per student per month: the bill, and what was
 *                     paid against it and when
 *   Previous Balance  or just each student's unpaid total (arrears) on a day
 *   Salary History    one row per staff member per month, paid or not
 *   Expenses          everything else the school spent
 *
 * Every row is filed on the day it really happened (a fee paid on 5 March
 * 2025 counts in March 2025 everywhere), carries the import's id so the whole
 * import can be undone, and is checked against what is already in IlmForge,
 * so importing the same file twice adds nothing the second time. Nothing
 * sends a message to parents or staff, and imported fees are nobody's cash in
 * hand on the daily balance sheet.
 *
 * Students and staff must already be in IlmForge (Import & Export): rows are
 * matched to them by roll number, and by employee code, CNIC or phone.
 *
 * Amounts are typed in rupees and kept in rupees in the checked rows (so a
 * row checked twice is unchanged); they become paisa only when written.
 */
const ExcelJS = require('exceljs');
const prisma = require('../config/prisma');
const phoneUtil = require('../utils/phone');
const { monthNumber, monthKeys, feeKind, MONTHS_SHORT } = require('../utils/feeMonth');
const {
  cellText, parseDate, pickList, norm, mapHeaders, addSheet, sheetColors,
} = require('./records.service');

/* ═══ Columns ═════════════════════════════════════════════════════════ */

const METHODS = ['Cash', 'Bank', 'Online', 'Cheque', 'Card'];
const SALARY_STATUSES = ['Paid', 'Unpaid'];
const ROLL = { key: 'rollNo', header: 'Roll No', required: true, type: 'text', width: 14, example: 'GV-25-0012', aliases: ['rollno', 'roll', 'rollnumber', 'admissionno', 'grno'] };
const REMARKS = { key: 'remarks', header: 'Remarks', width: 26, example: '', aliases: ['remarks', 'note', 'notes', 'comments', 'comment'] };

const FEE_COLUMNS = [
  ROLL,
  { key: 'name', header: 'Student Name', width: 22, example: 'Ayesha Khan', note: 'Checked against the roll number', aliases: ['studentname', 'name', 'student'] },
  { key: 'feeMonth', header: 'Fee Month', required: true, type: 'text', width: 12, example: '07/2025', note: 'MM/YYYY, e.g. 07/2025 or Jul 2025', aliases: ['feemonth', 'month', 'period', 'monthyear', 'formonth', 'feeperiod'] },
  { key: 'feeTitle', header: 'Fee Title', width: 18, example: 'Monthly Fee', note: 'Blank = Monthly Fee. Another title (Exam Fee, Transport Fee) is a separate bill', aliases: ['feetitle', 'feetype', 'feehead', 'title', 'head'] },
  { key: 'feeAmount', header: 'Fee Amount (Rs)', required: true, type: 'number', width: 15, example: 3500, aliases: ['feeamountrs', 'feeamount', 'fee', 'amount', 'total', 'totalamount', 'billed', 'billamount', 'feers'] },
  { key: 'concession', header: 'Concession (Rs)', type: 'number', width: 15, example: 0, aliases: ['concessionrs', 'concession', 'discount', 'discountrs', 'scholarship'] },
  { key: 'fine', header: 'Late Fine (Rs)', type: 'number', width: 13, example: 0, aliases: ['latefiners', 'latefine', 'fine', 'finers', 'latefee', 'latefeers'] },
  { key: 'paid', header: 'Paid (Rs)', type: 'number', width: 11, example: 3500, note: 'What was received for this bill. Blank or 0 = not paid', aliases: ['paidrs', 'paid', 'amountpaid', 'received', 'receivedrs', 'paidamount'] },
  { key: 'paidOn', header: 'Paid On', type: 'date', width: 13, example: '08/07/2025', note: 'DD/MM/YYYY. Blank = the 10th of the fee month', aliases: ['paidon', 'paymentdate', 'datepaid', 'receivedon', 'paiddate', 'date', 'dateofpayment'] },
  { key: 'method', header: 'Method', list: METHODS, width: 10, example: 'Cash', note: 'Blank = Cash', aliases: ['method', 'paymentmethod', 'mode', 'paymentmode'] },
  { key: 'receiptNo', header: 'Receipt No', type: 'text', width: 14, example: '', aliases: ['receiptno', 'receipt', 'receiptnumber', 'challanno', 'challan'] },
  REMARKS,
];

const BALANCE_COLUMNS = [
  ROLL,
  { key: 'name', header: 'Student Name', width: 22, example: 'Ayesha Khan', note: 'Checked against the roll number', aliases: ['studentname', 'name', 'student'] },
  { key: 'balance', header: 'Balance Due (Rs)', required: true, type: 'number', width: 16, example: 7000, aliases: ['balanceduers', 'balancedue', 'balancers', 'balance', 'arrears', 'arrearsrs', 'due', 'dueamount', 'previousbalance', 'outstanding', 'amount'] },
  { key: 'asOf', header: 'As Of', type: 'date', width: 13, example: '30/09/2026', note: 'DD/MM/YYYY: the day this was the balance. Blank = today', aliases: ['asof', 'ason', 'asondate', 'date', 'balancedate'] },
  REMARKS,
];

const SALARY_COLUMNS = [
  { key: 'empCode', header: 'Employee Code', type: 'text', width: 15, example: 'TCH-25-0003', note: 'Or give the CNIC or phone instead', aliases: ['employeecode', 'empcode', 'empid', 'employeeid', 'code', 'staffcode'] },
  { key: 'cnic', header: 'CNIC', type: 'text', width: 17, example: '', aliases: ['cnic', 'nic', 'idcard'] },
  { key: 'phone', header: 'Phone', type: 'phone', width: 14, example: '', aliases: ['phone', 'mobile', 'contact'] },
  { key: 'name', header: 'Name', width: 22, example: 'Farah Siddiqui', note: 'Checked against the employee', aliases: ['name', 'staffname', 'teachername', 'employeename', 'employee', 'fullname'] },
  { key: 'salaryMonth', header: 'Salary Month', required: true, type: 'text', width: 13, example: '07/2025', note: 'MM/YYYY, e.g. 07/2025 or Jul 2025', aliases: ['salarymonth', 'month', 'period', 'monthyear', 'formonth'] },
  { key: 'basic', header: 'Basic Salary (Rs)', required: true, type: 'number', width: 16, example: 45000, aliases: ['basicsalaryrs', 'basicsalary', 'basic', 'salary', 'grosssalary', 'gross', 'basicrs'] },
  { key: 'allowances', header: 'Allowances (Rs)', type: 'number', width: 15, example: 0, aliases: ['allowancesrs', 'allowances', 'allowance'] },
  { key: 'bonus', header: 'Bonus (Rs)', type: 'number', width: 11, example: 0, aliases: ['bonusrs', 'bonus', 'incentive'] },
  { key: 'absentDeduction', header: 'Absent Deduction (Rs)', type: 'number', width: 19, example: 0, aliases: ['absentdeductionrs', 'absentdeduction', 'absent', 'leavededuction', 'deductions', 'deduction', 'deductionsrs', 'deductionrs'] },
  { key: 'lateDeduction', header: 'Late Deduction (Rs)', type: 'number', width: 17, example: 0, aliases: ['latedeductionrs', 'latededuction', 'late'] },
  { key: 'loanDeduction', header: 'Loan Deduction (Rs)', type: 'number', width: 17, example: 0, aliases: ['loandeductionrs', 'loandeduction', 'loan', 'advance', 'advancededuction'] },
  { key: 'net', header: 'Net Salary (Rs)', type: 'number', width: 15, example: 45000, note: 'Optional check: basic + allowances + bonus - deductions', aliases: ['netsalaryrs', 'netsalary', 'net', 'netpay', 'netpaid', 'paidamount', 'netrs'] },
  { key: 'status', header: 'Status', list: SALARY_STATUSES, width: 10, example: 'Paid', note: 'Blank = Paid', aliases: ['status', 'paymentstatus'] },
  { key: 'paidOn', header: 'Paid On', type: 'date', width: 13, example: '31/07/2025', note: 'DD/MM/YYYY. Blank = last day of the salary month', aliases: ['paidon', 'paymentdate', 'datepaid', 'paiddate', 'date'] },
  REMARKS,
];

const EXPENSE_COLUMNS = [
  { key: 'date', header: 'Date', required: true, type: 'date', width: 13, example: '15/07/2025', note: 'DD/MM/YYYY', aliases: ['date', 'expensedate', 'paidon', 'dateofexpense', 'day'] },
  { key: 'category', header: 'Category', required: true, width: 18, example: 'Utilities', note: 'A new category is created if needed', aliases: ['category', 'head', 'expensehead', 'type', 'expensetype', 'accounthead'] },
  { key: 'amount', header: 'Amount (Rs)', required: true, type: 'number', width: 13, example: 12500, aliases: ['amountrs', 'amount', 'total', 'expense', 'paid', 'amountpaid'] },
  { key: 'description', header: 'Description', width: 34, example: 'Electricity bill for July', aliases: ['description', 'details', 'detail', 'particulars', 'narration', 'remarks', 'note'] },
  { key: 'paidTo', header: 'Paid To', width: 20, example: 'LESCO', aliases: ['paidto', 'vendor', 'payee', 'supplier'] },
];

const SHEETS = {
  fees: { name: 'Fee History', columns: FEE_COLUMNS, exampleKey: 'name' },
  balances: { name: 'Previous Balance', columns: BALANCE_COLUMNS, exampleKey: 'name' },
  salaries: { name: 'Salary History', columns: SALARY_COLUMNS, exampleKey: 'name' },
  expenses: { name: 'Expenses', columns: EXPENSE_COLUMNS, exampleKey: 'description' },
};
const SHEET_KEYS = Object.keys(SHEETS);

const ARREARS_TITLE = 'Previous Balance (Arrears)';
const MAX_RUPEES = 20000000; // Rs 2 crore: amounts are stored as 32-bit paisa (max ~Rs 2.14 crore)

/* ═══ Cell values ═════════════════════════════════════════════════════ */

const PKT_MS = 5 * 3600 * 1000;
const pad2 = (n) => String(n).padStart(2, '0');
const pad4 = (n) => String(n).padStart(4, '0');

/** Pakistan's today as a UTC-midnight timestamp, and its month as y*12+m. */
function pkToday(now = new Date()) {
  const p = new Date(now.getTime() + PKT_MS);
  return { day: Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate()), monthIndex: p.getUTCFullYear() * 12 + p.getUTCMonth() };
}

/**
 * A month from a cell: 07/2025, 7-2025, 2025-07, Jul 2025, July-25, an Excel
 * date (any day of the month), or a whole date like 01/07/2025.
 * Returns { month, year } | { error } | { empty: true }.
 */
function parseMonthYear(raw) {
  if (raw === null || raw === undefined || raw === '') return { empty: true };
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return { error: 'not a valid month' };
    return mk(raw.getUTCFullYear(), raw.getUTCMonth() + 1);
  }
  if (typeof raw === 'number') {
    if (raw > 20000 && raw < 80000) {
      const d = new Date(Math.round((raw - 25569) * 86400000));
      return mk(d.getUTCFullYear(), d.getUTCMonth() + 1);
    }
    return bad(String(raw));
  }
  const s = cellText(raw);
  if (!s) return { empty: true };
  let m;
  if ((m = s.match(/^(\d{1,2})\s*[/\-. ]\s*(\d{4})$/))) return mk(+m[2], +m[1]);
  if ((m = s.match(/^(\d{4})\s*[/\-. ]\s*(\d{1,2})$/))) return mk(+m[1], +m[2]);
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return mk(+m[1], +m[2]);
  if ((m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/))) return mk(yy(+m[3]), +m[2]);
  if ((m = s.match(/^([A-Za-z]{3,9})\.?[\s\-/,']+(\d{2}|\d{4})$/))) {
    const n = monthNumber(m[1]);
    return n ? mk(yy(+m[2]), n) : bad(s);
  }
  if ((m = s.match(/^(\d{4})[\s\-/,]+([A-Za-z]{3,9})$/))) {
    const n = monthNumber(m[2]);
    return n ? mk(+m[1], n) : bad(s);
  }
  return bad(s);

  function yy(y) { return y < 100 ? 2000 + y : y; }
  function mk(year, month) {
    if (!(month >= 1 && month <= 12)) return bad(s || String(raw));
    if (year < 2000 || year > 2100) return { error: `${pad2(month)}/${year} is not a year IlmForge can record (2000 onwards)` };
    return { month, year };
  }
  function bad(text) { return { error: `"${text}" is not a month. Write it as MM/YYYY, e.g. 07/2025` }; }
}

/** Rupees from a cell: 3500, "3,500", "Rs 3,500", "3,500/-". */
function parseRupees(raw) {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return { error: `${raw} is not an amount` };
    if (raw > MAX_RUPEES) return { error: `Rs ${raw.toLocaleString('en-PK')} is too large for one entry (up to Rs 2 crore). Split it into parts.` };
    return { value: Math.round(raw * 100) / 100 };
  }
  const text = cellText(raw);
  if (!text) return { value: null };
  const s = text.replace(/\/-$/, '').replace(/^(rs\.?|pkr)\s*/i, '').replace(/\s*(rs\.?|pkr)$/i, '').replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { error: `"${text}" is not an amount in rupees` };
  return parseRupees(Number(s));
}

const toPaisa = (rupees) => Math.round((rupees || 0) * 100);
const rs = (rupees) => 'Rs ' + Number(rupees || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
const dmy = (d) => `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
const monthText = (m, y) => `${MONTHS_SHORT[m - 1]} ${y}`;

/**
 * A day from a cell, as the stored moment: midday in Pakistan (07:00 UTC),
 * which is the same calendar day in every report whatever its time zone.
 * Today is stored as "now" so it is never a few hours ahead.
 * Returns { iso: 'YYYY-MM-DD', at: Date } | { error } | { empty }.
 */
function parseDay(raw, now = new Date()) {
  const d = parseDate(raw);
  if (d.error) return { error: d.error };
  if (!d.date) return { empty: true };
  const y = d.date.getUTCFullYear(), m = d.date.getUTCMonth() + 1, day = d.date.getUTCDate();
  return dayFrom(y, m, day, now);
}

function dayFrom(y, m, day, now = new Date()) {
  const utc = Date.UTC(y, m - 1, day);
  const today = pkToday(now).day;
  if (y < 2000) return { error: `${pad2(day)}/${pad2(m)}/${y} is too far back (2000 onwards)` };
  if (utc > today) return { error: `${pad2(day)}/${pad2(m)}/${y} is in the future` };
  const iso = `${y}-${pad2(m)}-${pad2(day)}`;
  return { iso, at: utc === today ? now : new Date(Date.UTC(y, m - 1, day, 7)) };
}

/** The default day for a month: the given day of it, or today if that is still ahead. */
function defaultDay(y, m, day, now = new Date()) {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const want = Date.UTC(y, m - 1, Math.min(day, last));
  const today = pkToday(now).day;
  const d = new Date(Math.min(want, today));
  return dayFrom(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), now);
}

/* ═══ Matching people ═════════════════════════════════════════════════ */

// Words that say nothing about which person it is.
const FILLER = new Set(['muhammad', 'mohammad', 'muhammed', 'mohammed', 'mohd', 'muhd', 'md', 'm', 'syed', 'sayed', 'syeda', 'sayeda', 'mst', 'mr', 'mrs', 'miss', 'ms', 'hafiz', 'hafiza', 'bibi']);
const nameCore = (s) => String(s || '').toLowerCase().split(/[^a-z]+/).filter((w) => w && !FILLER.has(w)).join('');

function bigrams(s) {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

/**
 * Does the name typed in the sheet belong to the same person?
 *   'same'       identical once spacing and case are ignored
 *   'similar'    a spelling difference or a missing surname: Fatima / Fatimah
 *   'different'  someone else: Ali Raza / Ali Hassan
 */
function compareNames(typed, stored) {
  const a = nameCore(typed), b = nameCore(stored);
  if (!a || !b) return norm(typed) === norm(stored) ? 'same' : 'similar';
  if (a === b) return norm(typed) === norm(stored) ? 'same' : 'similar';
  if (a.length < 2 || b.length < 2) return 'different';
  const ga = bigrams(a), gb = bigrams(b);
  let shared = 0;
  for (const [g, n] of ga) shared += Math.min(n, gb.get(g) || 0);
  const dice = (2 * shared) / (a.length - 1 + b.length - 1);
  return dice >= 0.5 ? 'similar' : 'different';
}

/* ═══ Reading the workbook ════════════════════════════════════════════ */

function readRows(ws, def) {
  if (!ws) return { rows: [], found: false };
  const { headerRow, map } = mapHeaders(ws, def.columns);
  if (!headerRow) return { rows: [], found: true, noHeaders: ws.actualRowCount > 0 };
  const rows = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec = { _row: r };
    let any = false;
    for (const [colNo, key] of Object.entries(map)) {
      const v = row.getCell(Number(colNo)).value;
      if (v !== null && v !== undefined && cellText(v) !== '') any = true;
      rec[key] = v;
    }
    if (!any) continue;
    // The template's grey example row.
    if (/^example\b/i.test(cellText(rec.name)) || /^example\b/i.test(cellText(rec.description))) continue;
    rows.push(rec);
  }
  return { rows, found: true };
}

/** Turn an uploaded .xlsx (base64) into raw rows per sheet. */
async function parseHistoryWorkbook(base64) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(base64, 'base64'));
  } catch {
    const e = new Error('This file could not be read as an Excel workbook (.xlsx). Save it as "Excel Workbook" and try again.');
    e.status = 400;
    throw e;
  }
  const byName = (want) => wb.worksheets.find((w) => norm(w.name) === norm(want));
  const out = {};
  const unreadable = [];
  for (const key of SHEET_KEYS) {
    const r = readRows(byName(SHEETS[key].name), SHEETS[key]);
    out[key] = r.rows;
    if (r.noHeaders) unreadable.push(SHEETS[key].name);
  }
  return { rows: out, unreadable };
}

/* ═══ Checking rows ═══════════════════════════════════════════════════ */

/**
 * Load what the rows will be compared with: the school's students and staff,
 * and the fees, salaries and expenses already recorded for the months and
 * days the rows cover.
 */
async function loadContext(schoolId, raw) {
  const years = new Set();
  for (const r of [...(raw.fees || []), ...(raw.balances || [])]) {
    const p = parseMonthYear(r.feeMonth);
    if (p.year) years.add(p.year);
    const d = parseDate(r.asOf);
    if (d.date) years.add(d.date.getUTCFullYear());
  }
  const salaryYears = new Set();
  for (const r of raw.salaries || []) {
    const p = parseMonthYear(r.salaryMonth);
    if (p.year) salaryYears.add(p.year);
  }
  let minDay = null, maxDay = null;
  for (const r of raw.expenses || []) {
    const d = parseDate(r.date);
    if (!d.date) continue;
    if (!minDay || d.date < minDay) minDay = d.date;
    if (!maxDay || d.date > maxDay) maxDay = d.date;
  }

  const needStudents = (raw.fees || []).length + (raw.balances || []).length > 0;
  const needStaff = (raw.salaries || []).length > 0;
  const DAY = 86400000;

  const [students, staff, invoices, arrears, salaries, expenses, categories] = await Promise.all([
    needStudents ? prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      select: { id: true, name: true, rollNo: true, campusId: true, classId: true },
    }) : [],
    needStaff ? prisma.staff.findMany({
      where: { schoolId, deletedAt: null },
      select: { id: true, name: true, empCode: true, cnic: true, joiningDate: true, user: { select: { phone: true } } },
    }) : [],
    years.size ? prisma.feeInvoice.findMany({
      where: { schoolId, year: { in: [...years] } },
      select: {
        id: true, studentId: true, month: true, year: true, feeTitle: true, totalAmount: true, dueAmount: true,
        payments: { where: { voidedAt: null }, select: { amountPaid: true, paymentDate: true } },
      },
    }) : [],
    (raw.balances || []).length ? prisma.feeInvoice.findMany({
      where: { schoolId, feeTitle: ARREARS_TITLE },
      select: { id: true, studentId: true },
    }) : [],
    salaryYears.size ? prisma.salaryRecord.findMany({
      where: { schoolId, year: { in: [...salaryYears] } },
      select: { staffId: true, month: true, year: true, status: true },
    }) : [],
    minDay ? prisma.expense.findMany({
      where: { schoolId, date: { gte: new Date(minDay.getTime() - DAY), lt: new Date(maxDay.getTime() + 2 * DAY) } },
      select: { date: true, amount: true, categoryId: true, description: true },
    }) : [],
    (raw.expenses || []).length ? prisma.expenseCategory.findMany({ where: { schoolId }, select: { id: true, name: true } }) : [],
  ]);

  const group = (list, keyOf) => {
    const m = new Map();
    for (const x of list) {
      const k = keyOf(x);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    }
    return m;
  };

  const invoicesByStudentPeriod = new Map();
  for (const inv of invoices) {
    const n = monthNumber(inv.month);
    if (!n) continue;
    const k = `${inv.studentId}|${inv.year}|${n}`;
    if (!invoicesByStudentPeriod.has(k)) invoicesByStudentPeriod.set(k, []);
    invoicesByStudentPeriod.get(k).push(inv);
  }

  const catById = new Map(categories.map((c) => [c.id, c]));
  const expenseCount = new Map();
  for (const e of expenses) {
    const k = expenseKey(pkDayIso(e.date), e.amount, catById.get(e.categoryId)?.name || '', e.description || '');
    expenseCount.set(k, (expenseCount.get(k) || 0) + 1);
  }

  return {
    studentsByRoll: group(students, (s) => norm(s.rollNo)),
    staffByCode: group(staff, (s) => norm(s.empCode)),
    staffByCnic: group(staff, (s) => String(s.cnic || '').replace(/\D/g, '') || null),
    staffByPhone: group(staff, (s) => { const c = phoneUtil.core(s.user?.phone || ''); return c.length === 10 ? c : null; }),
    staffByName: group(staff, (s) => norm(s.name)),
    invoicesByStudentPeriod,
    arrearsStudents: new Set(arrears.map((a) => a.studentId)),
    salaryByKey: new Map(salaries.map((s) => [`${s.staffId}|${s.year}|${s.month}`, s])),
    expenseCount,
    categoriesByNorm: new Map(categories.map((c) => [norm(c.name), c])),
  };
}

/** The Pakistan calendar day a stored moment falls on. */
const pkDayIso = (d) => new Date(new Date(d).getTime() + PKT_MS).toISOString().slice(0, 10);
const expenseKey = (dayIso, paisa, category, description) => `${dayIso}|${paisa}|${norm(category)}|${norm(description)}`;

function matchStudent(ctx, r, err, warn) {
  const roll = cellText(r.rollNo);
  if (!roll) { err('Roll No', 'Roll number is required: it is how the row finds the student.'); return null; }
  let found = ctx.studentsByRoll.get(norm(roll)) || [];
  const typed = cellText(r.name);
  if (found.length > 1 && typed) {
    const same = found.filter((s) => compareNames(typed, s.name) === 'same');
    if (same.length === 1) found = same;
  }
  if (!found.length) {
    err('Roll No', `No student has roll number ${roll}. Add the student in Import & Export first (Status = Inactive for students who have left).`);
    return null;
  }
  if (found.length > 1) {
    err('Roll No', `Roll number ${roll} belongs to ${found.length} students (${found.map((s) => s.name).join(', ')}). Give them different roll numbers first, or add the student's exact name.`);
    return null;
  }
  const st = found[0];
  if (typed) {
    const c = compareNames(typed, st.name);
    if (c === 'different') { err('Student Name', `Roll number ${roll} is ${st.name} in IlmForge, not ${typed}. Check the roll number.`); return null; }
    if (c === 'similar') warn('Student Name', `Roll number ${roll} is "${st.name}" in IlmForge (sheet says "${typed}"). It will be recorded for ${st.name}.`);
  }
  return st;
}

function matchStaff(ctx, r, err, warn) {
  const code = cellText(r.empCode);
  const cnic = cellText(r.cnic).replace(/\D/g, '');
  const phone = phoneUtil.core(cellText(r.phone));
  const typed = cellText(r.name);
  const tries = [
    code && { label: `Employee code ${code}`, list: ctx.staffByCode.get(norm(code)) },
    cnic.length === 13 && { label: `CNIC ${cellText(r.cnic)}`, list: ctx.staffByCnic.get(cnic) },
    phone.length === 10 && { label: `Phone ${cellText(r.phone)}`, list: ctx.staffByPhone.get(phone) },
  ].filter(Boolean);

  let st = null, by = '';
  for (const t of tries) {
    if (t.list?.length === 1) { st = t.list[0]; by = t.label; break; }
    if (t.list?.length > 1) { err('Employee Code', `${t.label} belongs to ${t.list.length} staff members (${t.list.map((s) => s.name).join(', ')}).`); return null; }
  }
  if (!st && typed) {
    const byName = ctx.staffByName.get(norm(typed)) || [];
    if (byName.length === 1) {
      st = byName[0];
      if (tries.length) warn('Employee Code', `${tries.map((t) => t.label).join(' / ')} matched nobody; matched ${st.name} by name instead.`);
      else warn('Name', `Matched ${st.name} by name. Add the employee code to be certain.`);
      return st;
    }
  }
  if (!st) {
    err(tries.length ? 'Employee Code' : 'Name', tries.length || typed
      ? `No staff member matches ${tries.length ? tries.map((t) => t.label).join(' / ') : `"${typed}"`}. Add them in Import & Export first (Status = Left for staff who no longer work here).`
      : 'Give the Employee Code, CNIC or phone so the row finds the staff member.');
    return null;
  }
  if (typed) {
    const c = compareNames(typed, st.name);
    if (c === 'different') { err('Name', `${by} is ${st.name} in IlmForge, not ${typed}.`); return null; }
    if (c === 'similar') warn('Name', `${by} is "${st.name}" in IlmForge (sheet says "${typed}").`);
  }
  return st;
}

function readAmount(r, key, label, err, { required = false, positive = false } = {}) {
  const p = parseRupees(r[key]);
  if (p.error) { err(label, p.error); return { bad: true, value: 0, text: cellText(r[key]) }; }
  if (p.value === null) {
    if (required) { err(label, `${label.replace(' (Rs)', '')} is required.`); return { bad: true, value: 0, text: '' }; }
    return { value: 0 };
  }
  if (positive && !(p.value > 0)) { err(label, `${label.replace(' (Rs)', '')} must be more than 0.`); return { bad: true, value: p.value }; }
  return { value: p.value };
}

const METHOD_WORDS = [
  [/bank|transfer|ibft|deposit/, 'bank'], [/online|easypaisa|jazz|wallet|raast/, 'online'],
  [/cheque|check/, 'cheque'], [/card|debit|credit|pos/, 'card'], [/cash/, 'cash'],
];
function pickMethod(raw) {
  const s = cellText(raw).toLowerCase();
  if (!s) return 'cash';
  const hit = METHOD_WORDS.find(([re]) => re.test(s));
  return hit ? hit[1] : s.slice(0, 20);
}

/**
 * Check every row of every sheet without writing anything. The result drives
 * the preview, and its rows are what the import step sends back.
 */
async function validateHistory(schoolId, raw, { now = new Date() } = {}) {
  const ctx = await loadContext(schoolId, raw);
  const issues = [];
  const add = (sheet, row, level, field, message) => issues.push({ sheet, row, level, field, message });
  const thisMonth = pkToday(now).monthIndex;

  /* ── Fee History ── */
  const fees = [];
  const seenFee = new Map();
  const unpaidFeeStudents = new Map(); // studentId -> first row with something unpaid
  const undated = { fees: [], salaries: [] }; // paid rows with no Paid On: one note, not one per row
  for (const r of raw.fees || []) {
    const row = r._row;
    let bad = false;
    const err = (f, m) => { add('Fee History', row, 'error', f, m); bad = true; };
    const warn = (f, m) => add('Fee History', row, 'warning', f, m);
    const note = (f, m) => add('Fee History', row, 'info', f, m);
    const out = {
      _row: row, rollNo: cellText(r.rollNo), name: cellText(r.name), feeTitle: cellText(r.feeTitle),
      receiptNo: cellText(r.receiptNo) || null, remarks: cellText(r.remarks) || null,
    };

    const st = matchStudent(ctx, r, err, warn);
    const per = parseMonthYear(r.feeMonth);
    if (per.empty) err('Fee Month', 'Fee month is required, e.g. 07/2025.');
    else if (per.error) err('Fee Month', per.error);
    else if (per.year * 12 + per.month - 1 > thisMonth) err('Fee Month', `${monthText(per.month, per.year)} has not come yet. Use Generate Fees for coming months.`);
    out.feeMonth = per.month ? `${pad2(per.month)}/${per.year}` : cellText(r.feeMonth);

    const fee = readAmount(r, 'feeAmount', 'Fee Amount (Rs)', err, { required: true, positive: true });
    const conc = readAmount(r, 'concession', 'Concession (Rs)', err);
    const fine = readAmount(r, 'fine', 'Late Fine (Rs)', err);
    const paid = readAmount(r, 'paid', 'Paid (Rs)', err);
    Object.assign(out, {
      feeAmount: fee.bad ? fee.text ?? r.feeAmount : fee.value,
      concession: conc.bad ? conc.text : conc.value,
      fine: fine.bad ? fine.text : fine.value,
      paid: paid.bad ? paid.text : paid.value,
    });
    const billed = fee.value + fine.value - conc.value;
    if (!fee.bad && !conc.bad && !fine.bad && billed < 0) err('Concession (Rs)', `Concession ${rs(conc.value)} is more than the bill (${rs(fee.value + fine.value)}).`);
    if (!fee.bad && !conc.bad && !fine.bad && !paid.bad && paid.value > Math.max(0, billed)) {
      err('Paid (Rs)', `Paid ${rs(paid.value)} is more than the bill after concession (${rs(Math.max(0, billed))}).`);
    }

    out.method = pickMethod(r.method);
    out.paidOn = null;
    const day = parseDay(r.paidOn, now);
    if (day.error) { err('Paid On', day.error); out.paidOn = cellText(r.paidOn); }
    else if (paid.value > 0 && day.iso) out.paidOn = day.iso;
    else if (paid.value > 0 && per.month) { if (!bad) undated.fees.push(row); }
    else if (!paid.value && day.iso) warn('Paid On', 'Paid On is ignored because nothing was paid.');

    out.action = bad ? 'error' : 'create';
    if (!bad && st && per.month) {
      const kind = feeKind(out.feeTitle);
      const dupKey = `${st.id}|${per.year}|${per.month}|${kind}`;
      if (seenFee.has(dupKey)) {
        err('Fee Month', `${st.name}'s ${monthText(per.month, per.year)} ${kind === 'monthly' ? 'monthly fee' : `"${out.feeTitle}"`} is also on row ${seenFee.get(dupKey)}. One row per bill: put the total paid on one row.`);
        out.action = 'error';
      } else {
        seenFee.set(dupKey, row);
        const existing = (ctx.invoicesByStudentPeriod.get(`${st.id}|${per.year}|${per.month}`) || []).find((i) => feeKind(i.feeTitle) === kind);
        if (existing) {
          const paidP = toPaisa(paid.value), concP = toPaisa(conc.value);
          const dayIso = out.paidOn || (per.month ? defaultDay(per.year, per.month, 10, now).iso : null);
          const sameDone = existing.payments.some((p) => p.amountPaid === paidP && pkDayIso(p.paymentDate) === dayIso);
          if (!paidP || sameDone) {
            out.action = 'skip-exists';
            note('Fee Month', `${st.name}'s ${monthText(per.month, per.year)} bill is already in IlmForge${sameDone ? ' with this payment' : ''}. Skipped.`);
          } else if (existing.dueAmount <= 0) {
            out.action = 'skip-exists';
            note('Paid (Rs)', `${st.name}'s ${monthText(per.month, per.year)} bill is already paid in IlmForge. Skipped.`);
          } else if (paidP + concP > existing.dueAmount) {
            err('Paid (Rs)', `${st.name}'s ${monthText(per.month, per.year)} bill is already in IlmForge with ${rs(existing.dueAmount / 100)} still due, but this row says ${rs(paid.value)} was paid. Record the difference in Fee Collection instead, or correct the row.`);
            out.action = 'error';
          } else {
            out.action = 'add-payment';
            note('Paid (Rs)', `${st.name}'s ${monthText(per.month, per.year)} bill is already in IlmForge: this payment of ${rs(paid.value)} is added to it.`);
            if (existing.totalAmount !== toPaisa(fee.value)) warn('Fee Amount (Rs)', `IlmForge bills ${rs(existing.totalAmount / 100)} for this month; the sheet says ${rs(fee.value)}. The IlmForge bill is kept.`);
          }
        }
        if (out.action === 'create' && billed - paid.value > 0 && !unpaidFeeStudents.has(st.id)) unpaidFeeStudents.set(st.id, row);
      }
    }
    if (st) { out.studentName = st.name; out._student = { id: st.id, campusId: st.campusId, classId: st.classId }; }
    fees.push(out);
  }

  /* ── Previous Balance ── */
  const balances = [];
  const seenBal = new Map();
  for (const r of raw.balances || []) {
    const row = r._row;
    let bad = false;
    const err = (f, m) => { add('Previous Balance', row, 'error', f, m); bad = true; };
    const warn = (f, m) => add('Previous Balance', row, 'warning', f, m);
    const note = (f, m) => add('Previous Balance', row, 'info', f, m);
    const out = { _row: row, rollNo: cellText(r.rollNo), name: cellText(r.name), remarks: cellText(r.remarks) || null };

    const st = matchStudent(ctx, r, err, warn);
    const bal = readAmount(r, 'balance', 'Balance Due (Rs)', err, { required: true });
    out.balance = bal.bad ? bal.text : bal.value;
    const day = parseDay(r.asOf, now);
    if (day.error) { err('As Of', day.error); out.asOf = cellText(r.asOf); }
    else out.asOf = day.iso || null;

    out.action = bad ? 'error' : 'create';
    if (!bad && bal.value === 0) {
      out.action = 'skip-zero';
      note('Balance Due (Rs)', 'Nothing due. Skipped.');
    }
    if (out.action === 'create' && st) {
      if (seenBal.has(st.id)) { err('Roll No', `${st.name} also has a balance on row ${seenBal.get(st.id)}. One balance per student.`); out.action = 'error'; }
      else {
        seenBal.set(st.id, row);
        if (ctx.arrearsStudents.has(st.id)) {
          out.action = 'skip-exists';
          note('Balance Due (Rs)', `${st.name} already has a previous balance in IlmForge. Skipped.`);
        } else if (unpaidFeeStudents.has(st.id)) {
          warn('Balance Due (Rs)', `${st.name} also has unpaid months on the Fee History sheet (row ${unpaidFeeStudents.get(st.id)}). Make sure this balance does not include them, or they are counted twice.`);
        }
      }
    }
    if (st) { out.studentName = st.name; out._student = { id: st.id, campusId: st.campusId, classId: st.classId }; }
    balances.push(out);
  }

  /* ── Salary History ── */
  const salaries = [];
  const seenSal = new Map();
  for (const r of raw.salaries || []) {
    const row = r._row;
    let bad = false;
    const err = (f, m) => { add('Salary History', row, 'error', f, m); bad = true; };
    const warn = (f, m) => add('Salary History', row, 'warning', f, m);
    const note = (f, m) => add('Salary History', row, 'info', f, m);
    const out = {
      _row: row, empCode: cellText(r.empCode), cnic: cellText(r.cnic), phone: cellText(r.phone), name: cellText(r.name),
      remarks: cellText(r.remarks) || null,
    };

    const sf = matchStaff(ctx, r, err, warn);
    const per = parseMonthYear(r.salaryMonth);
    if (per.empty) err('Salary Month', 'Salary month is required, e.g. 07/2025.');
    else if (per.error) err('Salary Month', per.error);
    else if (per.year * 12 + per.month - 1 > thisMonth) err('Salary Month', `${monthText(per.month, per.year)} has not come yet.`);
    out.salaryMonth = per.month ? `${pad2(per.month)}/${per.year}` : cellText(r.salaryMonth);

    const amounts = {};
    for (const [key, label, opt] of [
      ['basic', 'Basic Salary (Rs)', { required: true, positive: true }], ['allowances', 'Allowances (Rs)'], ['bonus', 'Bonus (Rs)'],
      ['absentDeduction', 'Absent Deduction (Rs)'], ['lateDeduction', 'Late Deduction (Rs)'], ['loanDeduction', 'Loan Deduction (Rs)'],
    ]) {
      const a = readAmount(r, key, label, err, opt || {});
      amounts[key] = a.value;
      out[key] = a.bad ? a.text : a.value;
    }
    const net = Math.round((amounts.basic + amounts.allowances + amounts.bonus - amounts.absentDeduction - amounts.lateDeduction - amounts.loanDeduction) * 100) / 100;
    const givenNet = readAmount(r, 'net', 'Net Salary (Rs)', err);
    out.net = givenNet.bad ? givenNet.text : (cellText(r.net) ? givenNet.value : null);
    if (!bad && net < 0) err('Net Salary (Rs)', `Deductions are more than the salary (net would be ${rs(net)}).`);
    else if (!bad && cellText(r.net) && Math.abs(givenNet.value - net) > 0.5) {
      err('Net Salary (Rs)', `Net salary ${rs(givenNet.value)} does not add up: basic + allowances + bonus - deductions = ${rs(net)}. Put the difference in a deduction or allowance column.`);
    }
    out.netSalary = net;

    const stTxt = cellText(r.status).toLowerCase();
    const paid = !stTxt || /^(paid|issued|yes|y|done|cleared)$/.test(stTxt);
    if (stTxt && !paid && !/^(unpaid|pending|due|no|n|not paid)$/.test(stTxt)) err('Status', `"${cellText(r.status)}" must be Paid or Unpaid.`);
    out.status = paid ? 'Paid' : 'Unpaid';

    out.paidOn = null;
    const day = parseDay(r.paidOn, now);
    if (day.error) { err('Paid On', day.error); out.paidOn = cellText(r.paidOn); }
    else if (paid && day.iso) out.paidOn = day.iso;
    else if (paid && per.month) { if (!bad) undated.salaries.push(row); }
    else if (!paid && day.iso) warn('Paid On', 'Paid On is ignored because the salary is marked Unpaid.');

    out.action = bad ? 'error' : 'create';
    if (!bad && sf && per.month) {
      const k = `${sf.id}|${per.year}|${per.month}`;
      if (seenSal.has(k)) { err('Salary Month', `${sf.name}'s ${monthText(per.month, per.year)} salary is also on row ${seenSal.get(k)}.`); out.action = 'error'; }
      else {
        seenSal.set(k, row);
        const existing = ctx.salaryByKey.get(k);
        if (existing) {
          out.action = 'skip-exists';
          note('Salary Month', `${sf.name}'s ${monthText(per.month, per.year)} salary is already in Payroll (${existing.status === 'issued' ? 'paid' : 'unpaid'}). Skipped${existing.status !== 'issued' && paid ? ': mark it paid in Payroll with its date' : ''}.`);
        } else if (sf.joiningDate) {
          const j = new Date(sf.joiningDate);
          if (per.year * 12 + per.month - 1 < j.getUTCFullYear() * 12 + j.getUTCMonth()) warn('Salary Month', `${sf.name} joined on ${dmy(j)}, after this month.`);
        }
      }
    }
    if (sf) { out.staffName = sf.name; out._staff = { id: sf.id }; }
    salaries.push(out);
  }

  const rowsText = (list) => (list.length <= 6 ? `Row${list.length > 1 ? 's' : ''} ${list.join(', ')}` : `Rows ${list.slice(0, 5).join(', ')} and ${list.length - 5} more`);
  if (undated.fees.length) add('Fee History', undated.fees[0], 'info', 'Paid On', `${rowsText(undated.fees)}: paid with no Paid On date, so counted as paid on the 10th of the fee month (today, for this month).`);
  if (undated.salaries.length) add('Salary History', undated.salaries[0], 'info', 'Paid On', `${rowsText(undated.salaries)}: paid with no Paid On date, so counted as paid on the last day of the salary month (today, for this month).`);

  /* ── Expenses ── */
  const expenses = [];
  const occ = new Map();
  const newCategories = new Set();
  for (const r of raw.expenses || []) {
    const row = r._row;
    let bad = false;
    const err = (f, m) => { add('Expenses', row, 'error', f, m); bad = true; };
    const warn = (f, m) => add('Expenses', row, 'warning', f, m);
    const note = (f, m) => add('Expenses', row, 'info', f, m);
    const out = { _row: row, description: cellText(r.description), paidTo: cellText(r.paidTo) };

    const day = parseDay(r.date, now);
    if (day.empty) err('Date', 'Date is required.');
    else if (day.error) err('Date', day.error);
    out.date = day.iso || cellText(r.date);

    out.category = cellText(r.category).replace(/\s+/g, ' ');
    if (!out.category) err('Category', 'Category is required, e.g. Utilities, Rent, Stationery.');
    const amt = readAmount(r, 'amount', 'Amount (Rs)', err, { required: true, positive: true });
    out.amount = amt.bad ? amt.text : amt.value;

    out.action = bad ? 'error' : 'create';
    if (!bad) {
      const known = ctx.categoriesByNorm.get(norm(out.category));
      if (known) out.category = known.name;
      else if (!newCategories.has(norm(out.category))) {
        newCategories.add(norm(out.category));
        note('Category', `New category "${out.category}" will be created.`);
      }
      if (/salar/i.test(out.category)) warn('Category', 'Salaries on the Salary History sheet are already counted as expenses. List a salary here only if it is not on that sheet.');

      // Identical entries (same day, amount, category, description) may be
      // genuine, so they are counted: the file's 2nd copy is skipped only
      // when IlmForge already has 2. _occ is this row's place among them.
      const k = expenseKey(out.date, toPaisa(amt.value), out.category, fullDescription(out));
      const n = (occ.get(k) || 0) + 1;
      occ.set(k, n);
      out._occ = r._occ && Number(r._occ) >= n ? Number(r._occ) : n;
      if (out._occ <= (ctx.expenseCount.get(k) || 0)) {
        out.action = 'skip-exists';
        note('Amount (Rs)', 'The same expense is already recorded on this day. Skipped.');
      }
    }
    expenses.push(out);
  }

  const tally = (list, amountOf) => ({
    create: list.filter((x) => x.action === 'create' || x.action === 'add-payment').length,
    skip: list.filter((x) => x.action === 'skip-exists' || x.action === 'skip-zero').length,
    error: list.filter((x) => x.action === 'error').length,
    total: list.length,
    ...amountOf(list.filter((x) => x.action === 'create' || x.action === 'add-payment')),
  });
  const sum = (list, f) => Math.round(list.reduce((t, x) => t + (Number(f(x)) || 0), 0) * 100) / 100;

  return {
    rows: { fees, balances, salaries, expenses },
    issues,
    summary: {
      fees: tally(fees, (l) => ({
        billed: sum(l.filter((x) => x.action === 'create'), (x) => x.feeAmount + x.fine - x.concession),
        paid: sum(l, (x) => x.paid),
        addPayments: l.filter((x) => x.action === 'add-payment').length,
      })),
      balances: tally(balances, (l) => ({ amount: sum(l, (x) => x.balance) })),
      salaries: tally(salaries, (l) => ({ paid: sum(l.filter((x) => x.status === 'Paid'), (x) => x.netSalary), unpaid: sum(l.filter((x) => x.status !== 'Paid'), (x) => x.netSalary) })),
      expenses: tally(expenses, (l) => ({ amount: sum(l, (x) => x.amount), newCategories: newCategories.size })),
      errors: issues.filter((i) => i.level === 'error').length,
      warnings: issues.filter((i) => i.level === 'warning').length,
    },
  };
}

const fullDescription = (row) => {
  const d = String(row.description || '').trim();
  const to = String(row.paidTo || '').trim();
  return to ? `${d}${d ? ' ' : ''}(paid to ${to})` : d;
};

/* ═══ Importing ═══════════════════════════════════════════════════════ */

// One import at a time per school: each chunk is checked against the
// database and then written, and two imports interleaving between those two
// steps could both add the same month.
const running = new Map();
async function withSchoolLock(schoolId, fn) {
  const before = running.get(schoolId) || Promise.resolve();
  let release;
  const mine = new Promise((r) => { release = r; });
  const chain = before.then(() => mine);
  running.set(schoolId, chain);
  await before.catch(() => null);
  try {
    return await fn();
  } finally {
    release();
    if (running.get(schoolId) === chain) running.delete(schoolId);
  }
}

const BATCH_RE = /^PR-\d{8}-[a-z0-9]{6}$/;
function newBatchId(now = new Date()) {
  const d = new Date(now.getTime() + PKT_MS).toISOString().slice(0, 10).replace(/-/g, '');
  return `PR-${d}-${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
}

/** Due and status of an invoice from its payments, as fee.routes recomputes it. */
function settle(totalAmount, lateFee, paid, discount) {
  const due = Math.max(0, totalAmount + lateFee - paid - discount);
  return { due, status: due === 0 ? 'paid' : (paid + discount > 0 ? 'partial' : 'unpaid') };
}

/**
 * Import one sheet's chunk of checked rows. The browser sends rows in
 * chunks so a long history never becomes one five-minute request; each chunk
 * is checked again here (the browser is never trusted) and written in one
 * transaction, so a chunk is either in completely or not at all.
 */
async function importHistoryChunk(ctx, { batchId, sheet, rows }, { now = new Date() } = {}) {
  const { schoolId, actorUserId, campusId } = ctx;
  if (!BATCH_RE.test(String(batchId || ''))) throw Object.assign(new Error('This import has no valid id. Check the file again and press Import.'), { status: 400 });
  if (!SHEET_KEYS.includes(sheet)) throw Object.assign(new Error('Unknown sheet.'), { status: 400 });

  return withSchoolLock(schoolId, async () => {
    const check = await validateHistory(schoolId, { [sheet]: rows }, { now });
    const checked = check.rows[sheet];
    const errorsByRow = new Map();
    for (const i of check.issues) if (i.level === 'error' && !errorsByRow.has(i.row)) errorsByRow.set(i.row, i.message);

    const results = [];
    const todo = [];
    for (const r of checked) {
      const label = labelOf(sheet, r);
      if (r.action === 'create' || r.action === 'add-payment') todo.push(r);
      else if (r.action === 'error') results.push({ row: r._row, label, status: 'not imported', error: errorsByRow.get(r._row) || 'Has a problem.' });
      else results.push({ row: r._row, label, status: 'skipped' });
    }

    let totalPaisa = 0;
    if (todo.length) {
      try {
        totalPaisa = await prisma.$transaction(
          (tx) => WRITERS[sheet]({ tx, schoolId, campusId, actorUserId, batchId, rows: todo, now }),
          { timeout: 60000, maxWait: 15000 },
        );
        for (const r of todo) results.push({ row: r._row, label: labelOf(sheet, r), status: r.action === 'add-payment' ? 'payment added' : 'imported' });
      } catch (e) {
        const msg = e.status === 400 ? e.message : 'Could not be saved. Nothing from this part was written; try the import again.';
        if (e.status !== 400) console.error('[history import]', e);
        for (const r of todo) results.push({ row: r._row, label: labelOf(sheet, r), status: 'failed', error: msg });
      }
    }
    results.sort((a, b) => a.row - b.row);

    const imported = results.filter((x) => x.status === 'imported' || x.status === 'payment added').length;
    if (imported) {
      await prisma.auditLog.create({
        data: {
          schoolId, userId: actorUserId, action: 'HISTORY_IMPORTED', resource: 'history',
          details: JSON.stringify({ batchId, sheet, imported, skipped: results.filter((x) => x.status === 'skipped').length, totalPaisa }),
        },
      }).catch(() => null);
    }
    return { sheet, results, imported, totalPaisa };
  });
}

function labelOf(sheet, r) {
  if (sheet === 'fees') return `${r.studentName || r.name || r.rollNo} · ${r.feeMonth}${r.feeTitle ? ` · ${r.feeTitle}` : ''}`;
  if (sheet === 'balances') return `${r.studentName || r.name || r.rollNo} · balance`;
  if (sheet === 'salaries') return `${r.staffName || r.name || r.empCode} · ${r.salaryMonth}`;
  return `${r.date} · ${r.category}`;
}

const splitMonth = (mmYYYY) => { const [m, y] = String(mmYYYY).split('/').map(Number); return { m, y }; };

const WRITERS = {
  /* Each month's bill, and the payment against it on the day it was made. */
  async fees({ tx, schoolId, batchId, rows, now }) {
    let total = 0;
    const creates = [];
    for (const r of rows.filter((x) => x.action === 'create')) {
      const st = r._student;
      const { m, y } = splitMonth(r.feeMonth);
      const fee = toPaisa(r.feeAmount), conc = toPaisa(r.concession), fine = toPaisa(r.fine), paid = toPaisa(r.paid);
      const kind = feeKind(r.feeTitle);
      // A concession rides on the payment it was given with; with no payment
      // it comes off the bill, so recomputing the invoice later cannot lose it.
      const totalAmount = paid > 0 ? fee : fee - conc;
      const discount = paid > 0 ? conc : 0;
      const { due, status } = settle(totalAmount, fine, paid, discount);
      creates.push({
        row: r, st, m, y, paid, discount,
        data: {
          schoolId, campusId: st.campusId, studentId: st.id, classId: st.classId,
          feeTitle: r.feeTitle || `Monthly Fee Of ${MONTHS_SHORT[m - 1]}`,
          totalAmount, discount, lateFee: fine, paidAmount: paid, dueAmount: due, status,
          month: String(m), year: y,
          dueDate: new Date(Date.UTC(y, m - 1, 10, 7)),
          voucherNo: `HIS-${MONTHS_SHORT[m - 1].toUpperCase()}-${pad4(st.id)}-${y}`,
          isCustomFee: kind !== 'monthly',
          remarks: [r.remarks, paid === 0 && conc > 0 ? `Concession ${rs(conc / 100)} on a fee of ${rs(fee / 100)}` : null].filter(Boolean).join(' · ') || null,
          importBatch: batchId,
          createdAt: new Date(Date.UTC(y, m - 1, 1, 7)),
        },
      });
      total += paid;
    }

    const made = creates.length ? await tx.feeInvoice.createManyAndReturn({ data: creates.map((c) => c.data), select: { id: true, studentId: true, month: true, year: true, feeTitle: true } }) : [];
    const idOf = new Map(made.map((i) => [`${i.studentId}|${i.year}|${i.month}|${i.feeTitle}`, i.id]));

    const payments = [];
    for (const c of creates) {
      if (c.paid <= 0) continue;
      const invoiceId = idOf.get(`${c.st.id}|${c.y}|${c.m}|${c.data.feeTitle}`);
      const when = c.row.paidOn ? dayFrom(...c.row.paidOn.split('-').map(Number), now) : defaultDay(c.y, c.m, 10, now);
      payments.push({
        schoolId, invoiceId, studentId: c.st.id, amountPaid: c.paid, discount: c.discount,
        method: c.row.method || 'cash', paymentDate: when.at, receivedBy: null, notifiedVia: 'history_import',
        receiptNo: c.row.receiptNo || `HIS-RCP-${invoiceId}`, remarks: 'From old records',
        importBatch: batchId, createdAt: when.at,
      });
    }

    // Payments for bills already in IlmForge (generated here, paid by hand).
    for (const r of rows.filter((x) => x.action === 'add-payment')) {
      const st = { ...r._student, name: r.studentName };
      const { m, y } = splitMonth(r.feeMonth);
      const inv = (await tx.feeInvoice.findMany({
        where: { schoolId, studentId: st.id, year: y, month: { in: monthKeys(m) } },
        select: { id: true, feeTitle: true, totalAmount: true, lateFee: true, dueAmount: true },
      })).find((i) => feeKind(i.feeTitle) === feeKind(r.feeTitle));
      const paid = toPaisa(r.paid), disc = toPaisa(r.concession);
      if (!inv || paid + disc > inv.dueAmount) throw Object.assign(new Error(`${st.name}'s ${monthText(m, y)} bill changed while importing. Check the file again.`), { status: 400 });
      const when = r.paidOn ? dayFrom(...r.paidOn.split('-').map(Number), now) : defaultDay(y, m, 10, now);
      await tx.feePayment.create({
        data: {
          schoolId, invoiceId: inv.id, studentId: st.id, amountPaid: paid, discount: disc,
          method: r.method || 'cash', paymentDate: when.at, receivedBy: null, notifiedVia: 'history_import',
          receiptNo: r.receiptNo || `HIS-RCP-${inv.id}`, remarks: 'From old records', importBatch: batchId, createdAt: when.at,
        },
      });
      const live = await tx.feePayment.findMany({ where: { invoiceId: inv.id, voidedAt: null }, select: { amountPaid: true, discount: true } });
      const sumPaid = live.reduce((t, p) => t + p.amountPaid, 0);
      const sumDisc = live.reduce((t, p) => t + p.discount, 0);
      const { due, status } = settle(inv.totalAmount, inv.lateFee, sumPaid, sumDisc);
      await tx.feeInvoice.update({ where: { id: inv.id }, data: { paidAmount: sumPaid, discount: sumDisc, dueAmount: due, status } });
      total += paid;
    }

    if (payments.length) await tx.feePayment.createMany({ data: payments });
    return total;
  },

  /* One unpaid bill per student for what they owed on the day. */
  async balances({ tx, schoolId, batchId, rows, now }) {
    let total = 0;
    const data = rows.map((r) => {
      const st = r._student;
      const when = r.asOf ? dayFrom(...r.asOf.split('-').map(Number), now) : { at: now };
      const day = new Date(when.at.getTime() + PKT_MS);
      const amount = toPaisa(r.balance);
      total += amount;
      return {
        schoolId, campusId: st.campusId, studentId: st.id, classId: st.classId,
        feeTitle: ARREARS_TITLE, totalAmount: amount, discount: 0, lateFee: 0, paidAmount: 0, dueAmount: amount, status: 'unpaid',
        month: String(day.getUTCMonth() + 1), year: day.getUTCFullYear(), dueDate: when.at,
        voucherNo: `OB-${pad4(st.id)}`, isCustomFee: true,
        remarks: ['Balance brought forward from old records', r.remarks].filter(Boolean).join(' · '),
        importBatch: batchId, createdAt: when.at,
      };
    });
    await tx.feeInvoice.createMany({ data });
    return total;
  },

  /* A month's salary, and for a paid one the "Salaries" expense on the day it was paid. */
  async salaries({ tx, schoolId, batchId, rows, now, actorUserId }) {
    const records = rows.map((r) => {
      const sf = { id: r._staff.id, name: r.staffName };
      const { m, y } = splitMonth(r.salaryMonth);
      const paid = r.status === 'Paid';
      const when = paid ? (r.paidOn ? dayFrom(...r.paidOn.split('-').map(Number), now) : defaultDay(y, m, 31, now)) : null;
      return {
        sf, m, y, paid, when,
        data: {
          schoolId, staffId: sf.id, month: m, year: y,
          basic: toPaisa(r.basic), allowances: toPaisa(r.allowances), bonus: toPaisa(r.bonus),
          deductionsAbsent: toPaisa(r.absentDeduction), deductionsLate: toPaisa(r.lateDeduction), loanDeduction: toPaisa(r.loanDeduction),
          netSalary: toPaisa(r.netSalary),
          status: paid ? 'issued' : 'pending',
          // Left empty on purpose: a salary later paid in Payroll gets the
          // payer here, which is how Undo knows not to remove it.
          issuedBy: null,
          issueDate: paid ? when.at : null,
          importBatch: batchId,
          createdAt: new Date(Date.UTC(y, m - 1, 1, 7)),
        },
      };
    });
    await tx.salaryRecord.createMany({ data: records.map((x) => x.data) });

    const paidOnes = records.filter((x) => x.paid && x.data.netSalary > 0);
    let total = 0;
    if (paidOnes.length) {
      const cats = await tx.expenseCategory.findMany({ where: { schoolId }, select: { id: true, name: true } });
      let cat = cats.find((c) => norm(c.name) === 'salaries');
      if (!cat) cat = await tx.expenseCategory.create({ data: { schoolId, name: 'Salaries' } });
      await tx.expense.createMany({
        data: paidOnes.map((x) => {
          total += x.data.netSalary;
          return {
            schoolId, categoryId: cat.id, amount: x.data.netSalary,
            description: `Salary — ${x.sf.name} — ${monthText(x.m, x.y)}`,
            date: x.when.at, addedBy: actorUserId || null, importBatch: batchId, createdAt: x.when.at,
          };
        }),
      });
    }
    return total;
  },

  /* Everything else the school spent, on its day. */
  async expenses({ tx, schoolId, campusId, batchId, rows, now, actorUserId }) {
    const cats = await tx.expenseCategory.findMany({ where: { schoolId }, select: { id: true, name: true } });
    const byNorm = new Map(cats.map((c) => [norm(c.name), c]));
    let total = 0;
    const data = [];
    for (const r of rows) {
      let cat = byNorm.get(norm(r.category));
      if (!cat) {
        cat = await tx.expenseCategory.create({ data: { schoolId, name: r.category } });
        byNorm.set(norm(r.category), cat);
      }
      const when = dayFrom(...r.date.split('-').map(Number), now);
      const amount = toPaisa(r.amount);
      total += amount;
      data.push({
        schoolId, campusId: campusId || null, categoryId: cat.id, amount,
        description: fullDescription(r) || null, date: when.at, addedBy: actorUserId || null,
        importBatch: batchId, createdAt: when.at,
      });
    }
    await tx.expense.createMany({ data });
    return total;
  },
};

/* ═══ Earlier imports, and undoing one ════════════════════════════════ */

async function listBatches(schoolId) {
  const logs = await prisma.auditLog.findMany({
    where: { schoolId, action: { in: ['HISTORY_IMPORTED', 'HISTORY_UNDONE'] } },
    orderBy: { createdAt: 'asc' },
    select: { action: true, details: true, createdAt: true, userId: true },
    take: 5000,
  });
  const batches = new Map();
  for (const l of logs) {
    let d = {};
    try { d = JSON.parse(l.details || '{}'); } catch { /* ignore */ }
    if (!d.batchId) continue;
    if (!batches.has(d.batchId)) batches.set(d.batchId, { batchId: d.batchId, startedAt: l.createdAt, finishedAt: l.createdAt, userId: l.userId, sheets: {}, totalPaisa: 0, undoneAt: null });
    const b = batches.get(d.batchId);
    if (l.action === 'HISTORY_UNDONE') { b.undoneAt = l.createdAt; continue; }
    b.finishedAt = l.createdAt;
    b.sheets[d.sheet] = (b.sheets[d.sheet] || 0) + (d.imported || 0);
    b.totalPaisa += d.totalPaisa || 0;
  }
  const list = [...batches.values()].sort((a, b) => b.startedAt - a.startedAt);
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(list.map((b) => b.userId).filter(Boolean))] } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  const count = (model) => prisma[model].groupBy({ by: ['importBatch'], where: { schoolId, importBatch: { not: null } }, _count: { _all: true } });
  const [inv, pay, sal, exp] = await Promise.all([count('feeInvoice'), count('feePayment'), count('salaryRecord'), count('expense')]);
  const live = (rows) => new Map(rows.map((r) => [r.importBatch, r._count._all]));
  const [mi, mp, ms, me] = [live(inv), live(pay), live(sal), live(exp)];

  return list.map((b) => ({
    ...b,
    by: nameOf.get(b.userId) || null,
    stillIn: { bills: mi.get(b.batchId) || 0, payments: mp.get(b.batchId) || 0, salaries: ms.get(b.batchId) || 0, expenses: me.get(b.batchId) || 0 },
  }));
}

/**
 * Remove everything one import added. Refused when something done in
 * IlmForge since then depends on it: a fee collected against an imported
 * bill, or an imported unpaid salary paid in Payroll since.
 */
async function undoBatch({ schoolId, actorUserId, batchId }) {
  if (!BATCH_RE.test(String(batchId || ''))) throw Object.assign(new Error('Unknown import.'), { status: 404 });
  return withSchoolLock(schoolId, () => prisma.$transaction(async (tx) => {
    const notOurs = { schoolId, invoice: { importBatch: batchId }, OR: [{ importBatch: null }, { importBatch: { not: batchId } }] };
    const collected = await tx.feePayment.findMany({
      where: { ...notOurs, voidedAt: null },
      select: { studentId: true, invoice: { select: { month: true, year: true } } },
      take: 5,
    });
    if (collected.length) {
      const names = await tx.student.findMany({ where: { id: { in: collected.map((c) => c.studentId) } }, select: { id: true, name: true } });
      const n = new Map(names.map((s) => [s.id, s.name]));
      throw Object.assign(new Error(`Fees have been collected in IlmForge against bills from this import (${collected.map((c) => `${n.get(c.studentId) || 'a student'}, ${monthText(monthNumber(c.invoice.month) || 1, c.invoice.year)}`).join('; ')}). Undo is blocked so those receipts stay correct.`), { status: 409 });
    }
    const paidLater = await tx.salaryRecord.findMany({
      where: { schoolId, importBatch: batchId, status: 'issued', issuedBy: { not: null } },
      select: { month: true, year: true, staff: { select: { name: true } } },
      take: 5,
    });
    if (paidLater.length) {
      throw Object.assign(new Error(`Salaries from this import have since been paid in Payroll (${paidLater.map((s) => `${s.staff.name}, ${monthText(s.month, s.year)}`).join('; ')}). Undo is blocked so those payments stay recorded.`), { status: 409 });
    }

    // Payments this import added to bills that were already in IlmForge:
    // those bills must be recomputed once the payments are gone.
    const touched = await tx.feePayment.findMany({
      where: { schoolId, importBatch: batchId, invoice: { OR: [{ importBatch: null }, { importBatch: { not: batchId } }] } },
      select: { invoiceId: true },
    });

    // Voided receipts on these bills changed nothing, but they cannot outlive
    // their bill; their details are kept in the audit log instead.
    const voided = await tx.feePayment.findMany({
      where: notOurs,
      select: { id: true, receiptNo: true, amountPaid: true, paymentDate: true, voidedAt: true, voidReason: true, studentId: true },
    });
    if (voided.length) await tx.feePayment.deleteMany({ where: { id: { in: voided.map((v) => v.id) } } });

    const payments = await tx.feePayment.deleteMany({ where: { schoolId, importBatch: batchId } });
    const bills = await tx.feeInvoice.deleteMany({ where: { schoolId, importBatch: batchId } });
    const expenses = await tx.expense.deleteMany({ where: { schoolId, importBatch: batchId } });
    const salaries = await tx.salaryRecord.deleteMany({ where: { schoolId, importBatch: batchId } });

    for (const invoiceId of new Set(touched.map((t) => t.invoiceId))) {
      const inv = await tx.feeInvoice.findUnique({ where: { id: invoiceId }, select: { totalAmount: true, lateFee: true } });
      if (!inv) continue;
      const live = await tx.feePayment.findMany({ where: { invoiceId, voidedAt: null }, select: { amountPaid: true, discount: true } });
      const paid = live.reduce((t, p) => t + p.amountPaid, 0);
      const disc = live.reduce((t, p) => t + p.discount, 0);
      const { due, status } = settle(inv.totalAmount, inv.lateFee, paid, disc);
      await tx.feeInvoice.update({ where: { id: invoiceId }, data: { paidAmount: paid, discount: disc, dueAmount: due, status } });
    }

    const counts = { bills: bills.count, payments: payments.count, salaries: salaries.count, expenses: expenses.count };
    await tx.auditLog.create({
      data: {
        schoolId, userId: actorUserId, action: 'HISTORY_UNDONE', resource: 'history',
        details: JSON.stringify({ batchId, ...counts, ...(voided.length && { removedVoidedReceipts: voided }) }),
      },
    });
    return counts;
  }, { timeout: 60000, maxWait: 15000 }));
}

/* ═══ The template ════════════════════════════════════════════════════ */

const { INK, GREEN, MUTED } = sheetColors;

function addHistoryReadMe(wb, { schoolName, categories }) {
  const ws = wb.addWorksheet('Read me', { properties: { tabColor: { argb: GREEN } } });
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 100;
  const line = (text, opts = {}) => {
    const r = ws.addRow(['', text]);
    r.getCell(2).font = { name: 'Calibri', size: opts.size || 11, bold: !!opts.bold, color: { argb: opts.color || INK } };
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    if (opts.height) r.height = opts.height;
  };
  ws.addRow([]);
  line(`IlmForge — past records${schoolName ? ` for ${schoolName}` : ''}`, { size: 16, bold: true, color: GREEN, height: 26 });
  line('Fees, salaries and expenses from before the school used IlmForge. Fill only the sheets you need, then import the file from Settings › Past Records.', { color: MUTED, height: 30 });
  ws.addRow([]);
  line('Before you start', { bold: true, size: 12 });
  [
    'Students and staff must already be in IlmForge (Settings › Import & Export). Add students who have left with Status = Inactive, and staff who have left with Status = Left.',
    'Rows find their student by Roll No, and their staff member by Employee Code (or CNIC or phone). The sheets "Students (reference)" and "Staff (reference)" list them for you to copy from.',
  ].forEach((t) => line(t, { height: 32 }));
  ws.addRow([]);
  line('The four sheets', { bold: true, size: 12 });
  [
    'Fee History: one row per student per month. Fee Amount is the bill; Paid is what was received for it and Paid On the day it was received. A month paid in two parts: one row with the total and the last date. Whatever is left unpaid becomes a real due: parents see it, and it appears in defaulters and fee reminders. Enter an amount the school has written off as Concession.',
    'Previous Balance: instead of month-by-month fees, just what each student still owed on a day (arrears). It becomes one unpaid bill per student that can be collected in Fee Collection. Use Fee History OR Previous Balance for the same months, not both, or the dues are counted twice.',
    'Salary History: one row per staff member per month. Status Paid (with the day it was paid) or Unpaid. Paid salaries are also counted under the expense category "Salaries", so do not list them again on the Expenses sheet.',
    `Expenses: everything else the school spent, with the day and a category.${categories.length ? ` Your categories: ${categories.join(', ')}.` : ''} A new category is created when needed.`,
  ].forEach((t) => line(t, { height: 46 }));
  ws.addRow([]);
  line('How to type it', { bold: true, size: 12 });
  [
    'Months as MM/YYYY: 07/2025 is July 2025 (Jul 2025 also works). Dates are DAY first: 08/07/2025 is 8 July 2025.',
    'Amounts in rupees, without "Rs": 3500 or 3,500.',
    'The grey "Example" row in each sheet is ignored. You can delete it.',
  ].forEach((t) => line(t, { height: 30 }));
  ws.addRow([]);
  line('What happens when you import', { bold: true, size: 12 });
  [
    'Nothing is saved until you check the preview and press Import. Each row is filed on its real date, so reports, the dashboard and each student\'s fee record show the right months.',
    'No message is sent to parents or staff, and imported fees are not counted as any accountant\'s cash in hand.',
    'Months already in IlmForge are skipped, so importing the same file twice adds nothing. A bill generated in IlmForge but paid by hand gets the payment added to it.',
    'Every import can be undone from Settings › Past Records, as long as nothing has been collected or paid against it since.',
  ].forEach((t) => line(t, { height: 32 }));
  return ws;
}

function addDataSheet(wb, def) {
  const ws = addSheet(wb, def, [], { withExample: false });
  const ex = {};
  def.columns.forEach((c) => { ex[c.key] = c.example; });
  ex[def.exampleKey] = `Example: ${ex[def.exampleKey]}`;
  const r = ws.addRow(ex);
  r.font = { italic: true, color: { argb: MUTED } };
  return ws;
}

function addReferenceSheet(wb, name, columns, records) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }], properties: { tabColor: { argb: 'FFB8C2BE' } } });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width, style: { numFmt: '@' } }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MUTED } };
  for (const rec of records) ws.addRow(rec);
  return ws;
}

async function buildHistoryTemplate(schoolId) {
  const [school, students, staff, categories] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      select: { rollNo: true, name: true, fatherName: true, status: true, class: { select: { name: true } }, section: { select: { name: true } } },
      orderBy: [{ classId: 'asc' }, { rollNo: 'asc' }],
    }),
    prisma.staff.findMany({
      where: { schoolId, deletedAt: null },
      select: { empCode: true, name: true, designation: true, cnic: true, isActive: true, basicSalary: true, user: { select: { phone: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.expenseCategory.findMany({ where: { schoolId }, select: { name: true }, orderBy: { name: 'asc' } }),
  ]);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  addHistoryReadMe(wb, { schoolName: school?.name, categories: [...new Set(categories.map((c) => c.name))] });
  for (const key of SHEET_KEYS) addDataSheet(wb, SHEETS[key]);
  addReferenceSheet(wb, 'Students (reference)', [
    { key: 'rollNo', header: 'Roll No', width: 16 }, { key: 'name', header: 'Student Name', width: 24 },
    { key: 'fatherName', header: 'Father Name', width: 22 }, { key: 'cls', header: 'Class', width: 16 }, { key: 'status', header: 'Status', width: 10 },
  ], students.map((s) => ({
    rollNo: s.rollNo, name: s.name, fatherName: s.fatherName,
    cls: [s.class?.name, s.section?.name].filter(Boolean).join(' '),
    status: s.status === 'active' ? 'Active' : 'Left / inactive',
  })));
  addReferenceSheet(wb, 'Staff (reference)', [
    { key: 'empCode', header: 'Employee Code', width: 16 }, { key: 'name', header: 'Name', width: 24 },
    { key: 'designation', header: 'Designation', width: 18 }, { key: 'cnic', header: 'CNIC', width: 18 },
    { key: 'phone', header: 'Phone', width: 15 }, { key: 'salary', header: 'Salary now (Rs)', width: 15 }, { key: 'status', header: 'Status', width: 10 },
  ], staff.map((s) => ({
    empCode: s.empCode, name: s.name, designation: s.designation, cnic: s.cnic, phone: s.user?.phone || '',
    salary: s.basicSalary ? String(Math.round(s.basicSalary / 100)) : '', status: s.isActive ? 'Active' : 'Left',
  })));
  return wb;
}

module.exports = {
  parseHistoryWorkbook, validateHistory, importHistoryChunk, buildHistoryTemplate, listBatches, undoBatch, newBatchId,
  SHEETS, SHEET_KEYS,
  // exported for tests
  parseMonthYear, parseRupees, compareNames, pickMethod, settle, dayFrom, defaultDay, pkToday,
};
