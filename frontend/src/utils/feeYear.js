/**
 * A student's fees laid out month by month, for the fee calendar (Collect
 * Fee) and the class fee register. Both use this, so they always agree.
 *
 *   monthRange('2026-04', '2027-03') -> ['2026-04', ..., '2027-03']
 *   billMonth(invoice)               -> '2026-09' (the month the bill is for)
 *   feeYear(invoices, months)        -> { cells: [one per month], totals }
 *   periodOptions(sessions)          -> the sessions and calendar years to pick from
 *
 * Amounts stay in paisa, as the server keeps them. Days are Pakistan days.
 */
import { monthNumber } from './feeMonth';

const PKT_MS = 5 * 3600e3;
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The Pakistan day an instant falls on, YYYY-MM-DD. */
export const pkYmd = (d) => new Date(new Date(d).getTime() + PKT_MS).toISOString().slice(0, 10);
export const thisMonth = () => pkYmd(Date.now()).slice(0, 7);
const ymKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

/** 'Sep 2026' / 'September 2026' / 'Sep' for a month key. */
export function monthTitle(key, { short = true, year = true } = {}) {
  const [y, m] = String(key).split('-').map(Number);
  const name = short ? FULL[m - 1].slice(0, 3) : FULL[m - 1];
  return year ? `${name} ${y}` : name;
}

/** Every month from `from` to `to` (YYYY-MM), at most 24. */
export function monthRange(from, to) {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  const end = to;
  while (out.length < 24) {
    const k = ymKey(y, m);
    if (k > end) break;
    out.push(k);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** The month a bill is for: its month and year, or, for a bill with no
    month (an admission fee), the month it was made. */
export function billMonth(inv) {
  const m = monthNumber(inv?.month);
  if (m) return ymKey(inv.year || Number(pkYmd(inv.dueDate || inv.createdAt).slice(0, 4)), m);
  return pkYmd(inv?.createdAt || inv?.dueDate || Date.now()).slice(0, 7);
}

/**
 * One student's months. Each cell:
 *   state     'paid' | 'partial' | 'unpaid' | 'none' | 'before' | 'upcoming'
 *   late      unpaid or part paid, and its month (or due date) has passed
 *   bills, billed, discount, paid, due, payments [{ day, amountPaid, receiptNo, method, feeTitle }]
 *   lastPaidOn  the day the month's fee was (last) collected
 */
export function feeYear(invoices, months, { today = pkYmd(Date.now()), admissionDate } = {}) {
  const nowMonth = today.slice(0, 7);
  const first = months[0];
  const last = months[months.length - 1];
  const joined = admissionDate ? pkYmd(admissionDate).slice(0, 7) : null;
  const at = new Map(months.map((m, i) => [m, i]));
  const cells = months.map((month) => ({ month, bills: [], billed: 0, discount: 0, paid: 0, due: 0, payments: [] }));
  let earlierDue = 0;
  let laterDue = 0;
  const earlierBills = [];

  for (const inv of invoices || []) {
    const m = billMonth(inv);
    const due = Number(inv.dueAmount || 0);
    if (m < first) { if (due > 0) { earlierDue += due; earlierBills.push(inv); } continue; }
    if (m > last) { laterDue += due; continue; }
    const c = cells[at.get(m)];
    c.bills.push(inv);
    c.billed += Number(inv.totalAmount || 0) + Number(inv.lateFee || 0);
    c.discount += Number(inv.discount || 0);
    c.paid += Number(inv.paidAmount || 0);
    c.due += due;
    for (const p of inv.payments || []) {
      if (p.voidedAt) continue;
      c.payments.push({ ...p, feeTitle: inv.feeTitle, day: pkYmd(p.paymentDate || p.createdAt) });
    }
  }

  for (const c of cells) {
    c.payments.sort((a, b) => a.day.localeCompare(b.day));
    c.lastPaidOn = c.payments.length ? c.payments[c.payments.length - 1].day : null;
    c.current = c.month === nowMonth;
    if (!c.bills.length) {
      c.state = c.month > nowMonth ? 'upcoming' : joined && c.month < joined ? 'before' : 'none';
    } else if (c.due <= 0) {
      c.state = 'paid';
    } else {
      c.state = c.paid > 0 ? 'partial' : 'unpaid';
      c.late = c.month < nowMonth || c.bills.some((b) => Number(b.dueAmount) > 0 && b.dueDate && pkYmd(b.dueDate) < today);
    }
  }

  const pending = cells.filter((c) => c.due > 0);
  const totals = {
    billed: cells.reduce((s, c) => s + c.billed, 0),
    discount: cells.reduce((s, c) => s + c.discount, 0),
    paid: cells.reduce((s, c) => s + c.paid, 0),
    due: pending.reduce((s, c) => s + c.due, 0),
    pendingMonths: pending.length,
    lateMonths: pending.filter((c) => c.late).length,
    pendingList: pending.map((c) => c.month),
    paidMonths: cells.filter((c) => c.state === 'paid').length,
    billedMonths: cells.filter((c) => c.bills.length).length,
    earlierDue,
    earlierBills,
    laterDue,
    lastPaidOn: cells.map((c) => c.lastPaidOn).filter(Boolean).sort().pop() || null,
  };
  totals.balance = totals.earlierDue + totals.due + totals.laterDue;
  return { cells, totals };
}

/**
 * What a year can be: each academic session, and calendar years. The default
 * is the session today falls in, or else this calendar year (a session that
 * has ended is not "this year", even when it is still marked active).
 */
export function periodOptions(sessions = [], today = pkYmd(Date.now())) {
  const opts = [];
  for (const s of sessions || []) {
    if (!s?.startDate || !s?.endDate) continue;
    const from = pkYmd(s.startDate).slice(0, 7);
    let to = pkYmd(s.endDate).slice(0, 7);
    if (to < from) continue;
    const span = monthRange(from, to);
    to = span[span.length - 1];
    opts.push({
      id: `s${s.id}`, from, to, kind: 'session',
      label: `${s.name} session (${monthTitle(from)} – ${monthTitle(to)})`,
      title: `Session ${s.name}`,
      covers: from <= today.slice(0, 7) && today.slice(0, 7) <= to,
    });
  }
  const year = Number(today.slice(0, 4));
  for (const y of [year + 1, year, year - 1, year - 2]) {
    opts.push({ id: `y${y}`, from: `${y}-01`, to: `${y}-12`, kind: 'year', label: `${y} (January – December)`, title: `Year ${y}`, covers: y === year });
  }
  const preferred = opts.find((o) => o.kind === 'session' && o.covers) || opts.find((o) => o.kind === 'year' && o.covers);
  return { options: opts, defaultId: preferred.id };
}

/* Formatting. */
export const rs = (paisa) => Math.round(Number(paisa || 0) / 100).toLocaleString('en-PK');
export const money = (paisa) => `Rs. ${rs(paisa)}`;
export const dmy = (ymd) => (ymd ? ymd.split('-').reverse().join('/') : '');
export const dm = (ymd) => (ymd ? ymd.slice(5).split('-').reverse().join('/') : '');

/** How each state is shown: words and colours (light backgrounds that print). */
export const STATE_LOOK = {
  paid: { label: 'Paid', bg: '#DCFCE7', fg: '#166534', bd: '#86EFAC' },
  partial: { label: 'Part paid', bg: '#FEF3C7', fg: '#92400E', bd: '#FCD34D' },
  unpaid: { label: 'Unpaid', bg: '#FEE2E2', fg: '#991B1B', bd: '#FCA5A5' },
  due: { label: 'Due', bg: '#E0F2FE', fg: '#075985', bd: '#7DD3FC' },
  none: { label: 'Not billed', bg: '#F3F4F6', fg: '#6B7280', bd: '#E5E7EB' },
  before: { label: 'Before admission', bg: '#F9FAFB', fg: '#9CA3AF', bd: '#E5E7EB' },
  upcoming: { label: 'Upcoming', bg: '#FFFFFF', fg: '#9CA3AF', bd: '#E5E7EB' },
};
/** An unpaid month that is not late yet (this month, due date not passed) is "Due". */
export const lookOf = (c) => STATE_LOOK[c.state === 'unpaid' && !c.late ? 'due' : c.state];
