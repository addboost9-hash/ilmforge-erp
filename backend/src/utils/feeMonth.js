/**
 * Fee months, whatever form they were stored in.
 *
 * FeeInvoice.month is a text column holding two forms: "7" from Generate
 * Fees, "July" (or "Jul") from admissions, custom invoices and older data.
 * Code that reads it must accept both, and code that looks an invoice up by
 * month must match both, or July is billed twice.
 *
 *   monthNumber('July') -> 7     monthNumber('07') -> 7     monthNumber('x') -> null
 *   monthKeys(7)        -> every stored spelling of July, for `month: { in: ... }`
 *   monthLabel('7')     -> 'July'                           monthLabel('x') -> 'x'
 *   byPeriodDesc        -> sort invoices newest month first (text order put
 *                          "9" after "12" and "September" after "October")
 */
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = FULL.map((m) => m.slice(0, 3));

function monthNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
  const s = String(v).trim().toLowerCase();
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 12 ? n : null;
  }
  // "Jul", "July", "Sept", "Sep." — the start of a month's name, 3 letters or more.
  const t = s.replace(/\.$/, '');
  if (t.length < 3) return null;
  const i = FULL.findIndex((m) => m.toLowerCase().startsWith(t));
  return i >= 0 ? i + 1 : null;
}

function monthKeys(v) {
  const n = monthNumber(v);
  if (!n) return [String(v)];
  const full = FULL[n - 1];
  const short = SHORT[n - 1];
  return [...new Set([String(n), String(n).padStart(2, '0'), full, short, full.toLowerCase(), short.toLowerCase(), full.toUpperCase(), short.toUpperCase()])];
}

function monthLabel(v, { short = false } = {}) {
  const n = monthNumber(v);
  if (!n) return v === null || v === undefined ? '' : String(v);
  return short ? SHORT[n - 1] : FULL[n - 1];
}

const byPeriodDesc = (a, b) => ((b.year || 0) - (a.year || 0)) || ((monthNumber(b.month) || 0) - (monthNumber(a.month) || 0));

/**
 * What kind of bill a fee title is, for "is this month already billed?".
 * Every spelling of the regular monthly fee ("Monthly Fee Of Jul",
 * "Tuition Fee", "Monthly Tuition") is one kind, so a month entered from old
 * records is not billed again by Generate Fees; any other title (Admission
 * Fee, Transport Fee, Exam Fee) is its own kind and does not block it.
 */
// Month names and years say WHEN, not WHAT: "Transport Fee Of July 2026" and
// "Transport Fee" are the same kind of bill.
const PERIOD_WORDS = /\b(of\s+)?(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?|(19|20)\d\d)\b\.?/gi;
const feeKind = (title) => {
  const t = String(title || '').toLowerCase().replace(PERIOD_WORDS, ' ');
  if (!t.trim() || /monthly|tuition/.test(t)) return 'monthly';
  const kind = t.replace(/[^a-z0-9]/g, '');
  // "July Fee" with the month taken out is just "fee": the monthly fee.
  return !kind || kind === 'fee' || kind === 'fees' ? 'monthly' : kind;
};

module.exports = { monthNumber, monthKeys, monthLabel, byPeriodDesc, feeKind, MONTHS_FULL: FULL, MONTHS_SHORT: SHORT };
