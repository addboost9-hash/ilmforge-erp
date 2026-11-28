/**
 * The school's weekly off days (settingsJson.weeklyOff), as weekday numbers:
 * 0 Sunday … 6 Saturday. Most schools close on Sunday only; some on Saturday
 * and Sunday, some on Friday. At least four days of the week stay school days.
 *
 * Used by the attendance register (shaded days), auto-absent (never on an
 * off day) and the staff timesheet (staff without a shift).
 */
const { readSettings } = require('./schoolSettings');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* A clean list, or null when it cannot be one. */
function cleanWeeklyOff(v) {
  if (!Array.isArray(v)) return null;
  const days = [...new Set(v.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b);
  return days.length >= 1 && days.length <= 3 ? days : null;
}

const weeklyOffOf = (settings) => cleanWeeklyOff(settings?.weeklyOff) || [0];
const weeklyOff = async (schoolId) => weeklyOffOf(await readSettings(schoolId));
const schoolDaysOf = (off) => [0, 1, 2, 3, 4, 5, 6].filter((d) => !off.includes(d));
const offWords = (off) => off.map((d) => DAY_NAMES[d]).join(' and ');

module.exports = { cleanWeeklyOff, weeklyOffOf, weeklyOff, schoolDaysOf, offWords, DAY_NAMES };
