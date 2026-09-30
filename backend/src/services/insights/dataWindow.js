/**
 * IlmForge — Insights engine: data availability.
 *
 * Pure. No database, no Prisma, no I/O — it takes arrays of already-loaded
 * rows and answers one question: what is this school's data actually good
 * enough to say?
 *
 * This exists because a school that started using IlmForge last week cannot
 * be given a forecast, and pretending otherwise is worse than saying nothing.
 * Every widget asks this module what it is allowed to show, so the answer is
 * consistent across the dashboard instead of each chart deciding for itself.
 */

/** Minimum months of history each capability needs to be honest. */
const REQUIREMENTS = {
  variance: 2,    // compare a month against the one before it
  signals: 8,     // a correlation below this is noise
  forecastLinear: 6,
  forecastSeasonal: 24, // a full cycle twice, so seasonality is real
};

const monthKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.getUTCFullYear() * 12 + dt.getUTCMonth();
};

/**
 * How many distinct calendar months the supplied rows span, and which.
 * Counts months that actually contain data, not the gap between first and
 * last row: a school with one month in 2024 and one in 2026 has two months
 * of data, not twenty-five.
 */
function monthsCovered(rows, dateField = 'date') {
  const keys = new Set();
  for (const r of rows || []) {
    const v = r?.[dateField];
    if (!v) continue;
    const k = monthKey(v);
    if (Number.isFinite(k)) keys.add(k);
  }
  return keys.size;
}

/**
 * What the dashboard may render, given the history available.
 * `missing` is how many more months are needed — the number the empty state
 * shows the user, so "we need 4 more months" is a real figure.
 */
function capabilities({ revenueMonths = 0, expenseMonths = 0, operationsMonths = 0 } = {}) {
  // A profit figure needs both sides of the ledger, so the binding
  // constraint is whichever of the two is shorter.
  const financeMonths = Math.min(revenueMonths, expenseMonths);

  const gate = (have, need) => ({
    available: have >= need,
    have,
    need,
    missing: Math.max(0, need - have),
  });

  return {
    financeMonths,
    variance: gate(financeMonths, REQUIREMENTS.variance),
    signals: gate(operationsMonths, REQUIREMENTS.signals),
    forecast: {
      ...gate(financeMonths, REQUIREMENTS.forecastLinear),
      // Which model the forecast would use, so the UI can say so plainly.
      model:
        financeMonths >= REQUIREMENTS.forecastSeasonal ? 'linear+seasonal'
          : financeMonths >= REQUIREMENTS.forecastLinear ? 'linear'
            : 'none',
      seasonalAt: REQUIREMENTS.forecastSeasonal,
    },
  };
}

module.exports = { REQUIREMENTS, monthsCovered, capabilities };
