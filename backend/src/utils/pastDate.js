/**
 * The date something really happened, when it is entered later: a fee paid
 * last month, a salary paid before the school joined IlmForge.
 *
 *   pastDate(raw, { label, now }) -> { date } | { error }
 *
 * Accepts YYYY-MM-DD (from a date input) or DD/MM/YYYY (as typed in
 * Pakistan). Empty means "now".
 *
 * "Today" is Pakistan's today (UTC+5, no daylight saving), whatever the
 * server's clock zone: the live server runs on UTC, where it is still
 * yesterday until 5 a.m. in Pakistan, and a payment dated today must not be
 * refused as "in the future". A past day is stored at midday Pakistan time
 * (07:00 UTC), which falls on that same day in every zone a report uses.
 */
const PKT_OFFSET_MS = 5 * 3600 * 1000;

function pastDate(raw, { label = 'Date', now = new Date() } = {}) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { date: now };
  const s = String(raw).trim();
  let y, m, d;
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) { d = +match[1]; m = +match[2]; y = +match[3]; }
  else return { error: `${label} must be a date like 14/03/2026.` };

  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return { error: `${label} ${s} does not exist (check the day and month).` };
  }
  const pk = new Date(now.getTime() + PKT_OFFSET_MS);
  const today = Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate());
  const asked = check.getTime();
  if (asked === today) return { date: now };
  if (asked > today) return { error: `${label} cannot be in the future.` };
  if (y < 2000) return { error: `${label} is too far in the past.` };
  return { date: new Date(Date.UTC(y, m - 1, d, 7, 0, 0)) };
}

module.exports = { pastDate };
