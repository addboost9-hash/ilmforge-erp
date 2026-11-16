/**
 * Fee received for several months at once, and the bank challans parents
 * deposit.
 *
 *   oldestFirst(a, b)                 invoices in the order they are paid: the
 *                                     month they bill, oldest first
 *   planAllocation(invoices, amount)  pure: how much of `amount` goes to each
 *                                     invoice, in the order given -> { lines, left }
 *   applyPayments(tx, {...})          writes one payment per invoice touched and
 *                                     the invoices' new balances
 *   challanPrefix(when)               '2611': the year and month a challan is issued
 *   challanNumber(prefix, studentId, seq)  '261100012301'
 *   cleanChallanNo(text)              the digits of a typed or scanned number
 *   bankFor(payment, campusId)        the account a campus's fees are deposited in
 *   pkDayOf(date)                     the Pakistan day of an instant, YYYY-MM-DD
 *   dueDay(ymd)                       a due date as stored: midday, Pakistan
 */
const { monthNumber, monthLabel } = require('../utils/feeMonth');

const PKT_MS = 5 * 3600 * 1000;
const pkDayOf = (when = new Date()) => new Date(new Date(when).getTime() + PKT_MS).toISOString().slice(0, 10);
/** A day as stored for a due date: 12:00 in Pakistan (07:00 UTC), that day in every zone. */
const dueDay = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 7, 0, 0));
};

const periodKey = (inv) => (Number(inv.year) || 0) * 100 + (monthNumber(inv.month) || 0);
const timeOf = (v) => (v ? new Date(v).getTime() : 0);
/** Oldest month first; bills without a month (admission, custom) by their due date. */
const oldestFirst = (a, b) =>
  (periodKey(a) - periodKey(b)) || (timeOf(a.dueDate || a.createdAt) - timeOf(b.dueDate || b.createdAt)) || ((a.id || 0) - (b.id || 0));

/** "July 2026", or the fee's title when it bills no month. */
const periodText = (inv) => {
  const m = monthLabel(inv.month);
  return m ? `${m}${inv.year ? ` ${inv.year}` : ''}` : (inv.feeTitle || '');
};

/**
 * Splits `amount` over the invoices in the order given: each is paid in
 * full before the next gets anything, so the last one reached may be part
 * paid and the rest keep their balance.
 */
function planAllocation(invoices, amount) {
  let left = Math.max(0, Math.round(Number(amount) || 0));
  const lines = invoices.map((inv) => {
    const due = Math.max(0, Math.round(Number(inv.dueAmount) || 0));
    const pay = Math.min(due, left);
    left -= pay;
    return { invoiceId: inv.id, due, pay, balance: due - pay };
  });
  return { lines, left };
}

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const rs = (paisa) => 'Rs ' + Math.round((paisa || 0) / 100).toLocaleString('en-PK');

/**
 * Pays `amount` over `invoices` (fresh rows, in the order to pay them) and
 * returns what each received. A bill whose balance changed since it was read
 * (another payment at the same moment) stops the whole payment, so no
 * collection is ever counted twice.
 */
async function applyPayments(tx, { schoolId, studentId, invoices, amount, payment }) {
  const plan = planAllocation(invoices, amount);
  if (plan.left > 0) throw bad(`${rs(amount)} is more than these bills owe (${rs(amount - plan.left)}).`);
  const lines = [];
  for (const [i, l] of plan.lines.entries()) {
    const inv = invoices[i];
    if (l.pay > 0) {
      const status = l.balance === 0 ? 'paid' : 'partial';
      const { count } = await tx.feeInvoice.updateMany({
        where: { id: inv.id, schoolId, dueAmount: l.due },
        data: { paidAmount: { increment: l.pay }, dueAmount: l.balance, status },
      });
      if (count !== 1) throw bad('A bill of this student changed while this was being saved. Open the student again and retry.', 409);
      await tx.feePayment.create({
        data: { schoolId, invoiceId: inv.id, studentId, amountPaid: l.pay, discount: 0, ...payment },
      });
    }
    lines.push({
      invoiceId: inv.id, feeTitle: inv.feeTitle, month: inv.month, year: inv.year,
      period: periodText(inv), due: l.due, paid: l.pay, balance: l.balance,
      status: l.balance === 0 ? 'paid' : (l.pay > 0 || inv.status === 'partial' ? 'partial' : 'unpaid'),
    });
  }
  return lines;
}

/* ── Challan numbers ──────────────────────────────────────────────────────
   Digits only, so a parent can write it in any bank's reference box:
   the year and month issued (4), the student (6 or more), and which
   challan of the month it is for that student (2). 2611 000123 01. */
const challanPrefix = (when = new Date()) => pkDayOf(when).slice(2, 7).replace('-', '');
const challanNumber = (prefix, studentId, seq) =>
  `${prefix}${String(studentId).padStart(6, '0')}${String(seq).padStart(2, '0')}`;
const cleanChallanNo = (text) => String(text || '').replace(/[\s-]/g, '').trim();

/* ── The school's bank accounts ───────────────────────────────────────────
   payment.bank is the school's account; payment.campusBanks[campusId] is a
   campus's own. A campus without one of its own uses the school's. */
const hasAccount = (b) => !!(b && String(b.accountNumber || '').trim() && String(b.bankName || '').trim());
const cleanBank = (b = {}) => ({
  bankName: String(b.bankName || '').trim().slice(0, 80),
  branch: String(b.branch || '').trim().slice(0, 120),
  branchCode: String(b.branchCode || '').trim().slice(0, 20),
  accountTitle: String(b.accountTitle || '').trim().slice(0, 120),
  accountNumber: String(b.accountNumber || '').trim().slice(0, 40),
});
function bankFor(payment, campusId) {
  const own = payment?.campusBanks?.[String(campusId)];
  if (hasAccount(own)) return cleanBank(own);
  return hasAccount(payment?.bank) ? cleanBank(payment.bank) : null;
}

const CHALLAN_DEFAULTS = { dueDay: 10, lateFee: 0, note: '' };
const challanSettings = (payment) => {
  const c = { ...CHALLAN_DEFAULTS, ...(payment?.challan || {}) };
  const day = parseInt(c.dueDay, 10);
  const late = parseInt(c.lateFee, 10);
  return {
    dueDay: day >= 1 && day <= 28 ? day : CHALLAN_DEFAULTS.dueDay,
    lateFee: late > 0 ? late : 0,
    note: String(c.note || '').slice(0, 300),
  };
};

module.exports = {
  oldestFirst, periodText, planAllocation, applyPayments,
  challanPrefix, challanNumber, cleanChallanNo,
  bankFor, hasAccount, cleanBank, challanSettings, CHALLAN_DEFAULTS,
  pkDayOf, dueDay, rs, bad,
};
