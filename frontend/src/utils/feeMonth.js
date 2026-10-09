/**
 * Fee months, whatever form they were stored in.
 *
 * An invoice's month is "7" when it came from Generate Fees and "July" (or
 * "Jul") when it came from an admission, a custom invoice or older data.
 * Showing it raw printed "7 2026" on receipts and portals.
 *
 *   monthLabel('7')            -> 'July'     monthLabel('Jul') -> 'July'
 *   monthLabel('7', true)      -> 'Jul'
 *   feePeriod({ month, year }) -> 'July 2026'
 */
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
  const s = String(v).trim().toLowerCase();
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 12 ? n : null;
  }
  const t = s.replace(/\.$/, '');
  if (t.length < 3) return null;
  const i = FULL.findIndex((m) => m.toLowerCase().startsWith(t));
  return i >= 0 ? i + 1 : null;
}

export function monthLabel(v, short = false) {
  const n = monthNumber(v);
  if (!n) return v === null || v === undefined ? '' : String(v);
  return short ? FULL[n - 1].slice(0, 3) : FULL[n - 1];
}

/** "July 2026" for an invoice, or '' when it has no month. */
export const feePeriod = (inv, short = false) =>
  inv?.month ? `${monthLabel(inv.month, short)} ${inv.year || ''}`.trim() : '';

/** Newest month first; text order put "9" after "12". */
export const byPeriodDesc = (a, b) =>
  ((b.year || 0) - (a.year || 0)) || ((monthNumber(b.month) || 0) - (monthNumber(a.month) || 0));
