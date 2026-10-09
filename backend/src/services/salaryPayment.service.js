/**
 * Paying a salary, the same way from every screen.
 *
 * There were two pay buttons with different results: Salary (POST
 * /salary/:id/issue) recorded the payment as an expense, Payroll Manager
 * (POST /payroll/pay/:id and /pay-all) did not, so the dashboard's "Spent"
 * figure depended on which page was used. Both paid "today" even when the
 * salary was paid earlier, and either could pay the same month twice.
 *
 * markSalaryPaid() marks the month paid on the day it was really paid and
 * records it once under the expense category "Salaries", on that day.
 *
 * The two screens also generated a month's salaries in two different ways,
 * and neither looked at the month asked for or at joining dates, so a school
 * entering last year's salaries billed staff who joined this year.
 * generateSalaries() is the one way now. The rules the salary and expense
 * screens share live here as well:
 *
 *   salaryPeriod(m, y)    -> { month, year } | { error }   (1-12, 2000..next year)
 *   joinedBy(date, m, y)  had this person joined by the end of that month?
 *   netSalary(parts)      earnings minus deductions, never below 0
 *   salaryEdit(rec, body) -> { data } | { error }   an edit to an unpaid salary
 *   amountPaisa(v)        -> { value } | { error }  an expense amount
 *   expenseCategory(db, schoolId, name)   one category per name, whatever its case
 *   pkDayRange(from, to)  Pakistan calendar days -> a Prisma date filter
 */
const prisma = require('../config/prisma');
const { equals } = require('../utils/search');
const { monthLabel } = require('../utils/feeMonth');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Money columns are Int: the largest amount one row can hold, in paisa.
const MAX_PAISA = 2147483647;

/* ── Pakistan calendar days ─────────────────────────────────────────────
   Pakistan is UTC+5 all year, so its day D runs from 19:00 UTC on D-1 to
   19:00 UTC on D. The live server's clock is UTC: grouping by the server's
   own days put an expense entered at 1 a.m. into the day before. */
const PKT_OFFSET_MS = 5 * 3600 * 1000;

/** Pakistan's date right now: { year, month (1-12), day }. */
function pkToday(now = new Date()) {
  const pk = new Date(now.getTime() + PKT_OFFSET_MS);
  return { year: pk.getUTCFullYear(), month: pk.getUTCMonth() + 1, day: pk.getUTCDate() };
}

/** The moment a Pakistan day begins. Month 13 or day 32 roll over, as in Date.UTC. */
const pkDayStart = (year, month, day = 1) => new Date(Date.UTC(year, month - 1, day) - PKT_OFFSET_MS);

/** The Pakistan day a stored moment falls on, as "2026-03-14". */
const pkDayKey = (d) => new Date(new Date(d).getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);

/** "2026-03-14" (a date input) or "14/03/2026" (typed) -> { year, month, day }, or null. */
function parseDay(raw) {
  const s = String(raw ?? '').trim();
  let y, m, d;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) { d = +match[1]; m = +match[2]; y = +match[3]; }
  else return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { year: y, month: m, day: d };
}

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * from/to as Pakistan days, both included -> { filter: { gte, lt } } for a
 * date column (empty when neither is given), or { error }.
 */
function pkDayRange(from, to) {
  const filter = {};
  if (!isBlank(from)) {
    const f = parseDay(from);
    if (!f) return { error: 'From must be a date like 14/03/2026.' };
    filter.gte = pkDayStart(f.year, f.month, f.day);
  }
  if (!isBlank(to)) {
    const t = parseDay(to);
    if (!t) return { error: 'To must be a date like 14/03/2026.' };
    filter.lt = pkDayStart(t.year, t.month, t.day + 1);
  }
  if (filter.gte && filter.lt && filter.gte >= filter.lt) return { error: 'From must be on or before To.' };
  return { filter };
}

/* ── Amounts ──────────────────────────────────────────────────────────── */

/** A whole number sent as a number or as digits; anything else (12.5, "", true) is null. */
function wholeNumber(v) {
  if (typeof v === 'number') return Number.isSafeInteger(v) ? v : null;
  if (typeof v === 'string' && /^\s*-?\d{1,15}\s*$/.test(v)) return Number(v);
  return null;
}

/**
 * An expense amount, in paisa: Rs 5,000 arrives as 500000. A fraction, a
 * blank or a figure of 0 or less is a mistake to report, not to round.
 */
function amountPaisa(raw, label = 'Amount') {
  const v = wholeNumber(raw);
  if (v === null) return { error: `${label} must be a whole number of paisa (Rs 5,000 is 500000).` };
  if (v <= 0) return { error: `${label} must be more than 0.` };
  if (v > MAX_PAISA) return { error: `${label} is too large for one entry.` };
  return { value: v };
}

/* ── Salaries ─────────────────────────────────────────────────────────── */

/** The month a salary is for: month 1-12, year from 2000 to next year. */
function salaryPeriod(month, year, now = new Date()) {
  const m = wholeNumber(month);
  const y = wholeNumber(year);
  const lastYear = pkToday(now).year + 1;
  if (m === null || m < 1 || m > 12) return { error: 'Month must be a number from 1 to 12.' };
  if (y === null || y < 2000 || y > lastYear) return { error: `Year must be between 2000 and ${lastYear}.` };
  return { month: m, year: y };
}

/**
 * Is a salary due from this person for this month? Only if they had joined
 * by the month's last day, in Pakistan. No joining date on file: assume
 * they were there, as before.
 */
function joinedBy(joiningDate, month, year) {
  if (!joiningDate) return true;
  const joined = new Date(joiningDate).getTime();
  if (Number.isNaN(joined)) return true;
  return joined < pkDayStart(year, month + 1, 1).getTime();
}

/**
 * The month's pay: earnings minus deductions. A month of absences plus a
 * loan instalment can come to more than the salary; then nothing is paid,
 * rather than a negative salary that would show up as income.
 */
function netSalary({ basic = 0, allowances = 0, bonus = 0, deductionsAbsent = 0, deductionsLate = 0, loanDeduction = 0 } = {}) {
  return Math.max(0, (basic || 0) + (allowances || 0) + (bonus || 0)
    - (deductionsAbsent || 0) - (deductionsLate || 0) - (loanDeduction || 0));
}

const SALARY_PARTS = {
  basic: 'Basic salary',
  allowances: 'Allowances',
  bonus: 'Bonus',
  deductionsAbsent: 'Absence deduction',
  deductionsLate: 'Late deduction',
  loanDeduction: 'Loan deduction',
};

/**
 * An edit to an unpaid salary. Amounts sent (paisa, whole, 0 or more)
 * replace the stored ones, the rest are kept, and the net is worked out
 * again from all of them, so it always matches what the slip shows.
 */
function salaryEdit(existing, body = {}) {
  const parts = {};
  for (const [key, label] of Object.entries(SALARY_PARTS)) {
    if (body[key] === undefined) { parts[key] = existing[key] || 0; continue; }
    const v = wholeNumber(body[key]);
    if (v === null || v < 0 || v > MAX_PAISA) return { error: `${label} must be a whole amount of 0 or more.` };
    parts[key] = v;
  }
  const net = netSalary(parts);
  if (net > MAX_PAISA) return { error: 'Net salary is too large.' };
  return { data: { ...parts, netSalary: net } };
}

/**
 * Creates the month's unpaid salary records for active staff, at their basic
 * salary. Staff who already have that month keep their record; staff who
 * joined after the month are left out and listed, so the screen can say why.
 */
async function generateSalaries({ schoolId, month, year }) {
  const [staff, existing] = await Promise.all([
    prisma.staff.findMany({
      where: { schoolId, isActive: true, deletedAt: null },
      select: { id: true, name: true, basicSalary: true, joiningDate: true },
      orderBy: { id: 'asc' },
    }),
    prisma.salaryRecord.findMany({ where: { schoolId, month, year }, select: { staffId: true } }),
  ]);
  const hasRecord = new Set(existing.map((r) => r.staffId));

  const records = [];
  const notJoinedYet = [];
  let alreadyGenerated = 0;
  for (const s of staff) {
    if (hasRecord.has(s.id)) { alreadyGenerated += 1; continue; }
    if (!joinedBy(s.joiningDate, month, year)) {
      notJoinedYet.push({ id: s.id, name: s.name, joiningDate: s.joiningDate });
      continue;
    }
    const basic = s.basicSalary || 0;
    try {
      records.push(await prisma.salaryRecord.create({
        data: {
          schoolId, staffId: s.id, month, year,
          basic, allowances: 0, deductionsAbsent: 0, deductionsLate: 0, loanDeduction: 0, bonus: 0,
          netSalary: netSalary({ basic }),
          status: 'pending',
        },
      }));
    } catch (err) {
      // A second Generate click got there first: one record per person per month.
      if (err.code !== 'P2002') throw err;
      alreadyGenerated += 1;
    }
  }
  return { records, alreadyGenerated, notJoinedYet, skipped: alreadyGenerated + notJoinedYet.length };
}

/** "2 salaries generated for July 2026. Skipped 2: 1 already generated, 1 joined after July 2026 (Ali Raza)." */
function generateMessage({ records, alreadyGenerated, notJoinedYet }, month, year) {
  const period = `${monthLabel(month)} ${year}`;
  const n = records.length;
  let message = `${n} ${n === 1 ? 'salary' : 'salaries'} generated for ${period}.`;
  const why = [];
  if (alreadyGenerated) why.push(`${alreadyGenerated} already generated`);
  if (notJoinedYet.length) {
    const names = notJoinedYet.slice(0, 3).map((s) => s.name).join(', ');
    const more = notJoinedYet.length > 3 ? ` and ${notJoinedYet.length - 3} more` : '';
    why.push(`${notJoinedYet.length} joined after ${period} (${names}${more})`);
  }
  if (why.length) message += ` Skipped ${alreadyGenerated + notJoinedYet.length}: ${why.join(', ')}.`;
  return message;
}

/* ── Expense categories ───────────────────────────────────────────────── */

/** "  repair   work " -> "repair work". */
const categoryName = (raw) => String(raw ?? '').trim().replace(/\s+/g, ' ');

/**
 * The school's expense category with this name, whatever its case or
 * spacing: "Salaries", "salaries" and "SALARIES " are one category, or a
 * month's salary bill ends up split across three. equals() ignores case on
 * PostgreSQL only (SQLite compares exactly), so the school's few category
 * names are also compared here. The oldest wins if near-duplicates exist.
 */
async function findExpenseCategory(db, schoolId, raw) {
  const name = categoryName(raw);
  if (!name) return null;
  const hit = await db.expenseCategory.findFirst({
    where: { schoolId, name: equals(name) }, orderBy: { id: 'asc' }, select: { id: true, name: true },
  });
  if (hit) return hit;
  const key = name.toLowerCase();
  const all = await db.expenseCategory.findMany({ where: { schoolId }, orderBy: { id: 'asc' }, select: { id: true, name: true } });
  return all.find((c) => categoryName(c.name).toLowerCase() === key) || null;
}

/** Same, adding the category the first time a name is used. null for a blank name. */
async function expenseCategory(db, schoolId, raw) {
  const found = await findExpenseCategory(db, schoolId, raw);
  if (found) return found;
  const name = categoryName(raw);
  if (!name) return null;
  return db.expenseCategory.create({ data: { schoolId, name }, select: { id: true, name: true } });
}

async function salaryCategoryId(tx, schoolId) {
  return (await expenseCategory(tx, schoolId, 'Salaries')).id;
}

/* ── Paying ───────────────────────────────────────────────────────────── */

/**
 * @returns {Promise<{ record, expense } | { alreadyPaid: true, record }>}
 */
async function markSalaryPaid({ schoolId, recordId, paidOn = new Date(), userId = null, note = '' }) {
  return prisma.$transaction(async (tx) => {
    // Marks it paid only if it is not paid yet, in one statement. Of two
    // clicks that arrive together exactly one changes the row; the other
    // changes nothing, so it records no second expense.
    const { count } = await tx.salaryRecord.updateMany({
      where: { id: recordId, schoolId, status: { not: 'issued' } },
      data: { status: 'issued', issuedBy: userId, issueDate: paidOn },
    });
    // Read after marking it paid: an edit can no longer change the amount,
    // so this is the amount that was paid.
    const record = await tx.salaryRecord.findFirst({
      where: { id: recordId, schoolId },
      include: { staff: { select: { name: true } } },
    });
    if (!record) throw Object.assign(new Error('Salary record not found.'), { status: 404 });
    if (count === 0) return { alreadyPaid: true, record };

    const expense = record.netSalary > 0
      ? await tx.expense.create({
        data: {
          schoolId,
          categoryId: await salaryCategoryId(tx, schoolId),
          amount: record.netSalary,
          description: `Salary — ${record.staff?.name || 'Staff'} — ${MONTHS[record.month - 1] || record.month} ${record.year}${note ? ` (${note})` : ''}`,
          date: paidOn,
          addedBy: userId,
        },
      })
      : null;
    return { record, expense };
  });
}

module.exports = {
  markSalaryPaid,
  salaryCategoryId,
  generateSalaries,
  generateMessage,
  salaryPeriod,
  joinedBy,
  netSalary,
  salaryEdit,
  wholeNumber,
  amountPaisa,
  categoryName,
  findExpenseCategory,
  expenseCategory,
  pkToday,
  pkDayStart,
  pkDayKey,
  pkDayRange,
  PKT_OFFSET_MS,
  MAX_PAISA,
};
