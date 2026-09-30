/**
 * A synthetic but realistic 24-month history for a mid-size Pakistani private
 * school, used by the engine tests. Amounts are in PAISA.
 *
 * Shape of the year, which is what makes it a useful test rather than a
 * straight line:
 *
 *   - April: session starts, admissions jump, collection is strong
 *   - July: summer vacation. The month the tests care about most —
 *     collection falls to 58% because families travel and defer, while
 *     electricity spikes (air conditioning + summer tariff). This is the
 *     loss month.
 *   - December: exams, then winter break; collection dips again, mildly
 *   - Year 2 runs ~8% above year 1 on strength and fee
 *
 * Every figure is deterministic — no randomness — so a test that fails has
 * found a real change in behaviour, not a reroll.
 */

const CATEGORIES = ['Salaries', 'Electricity', 'Rent', 'Transport', 'Supplies', 'Maintenance'];

/** Collection rate by calendar month (1-12). July is the vacation trough. */
const COLLECTION_BY_MONTH = {
  1: 0.88, 2: 0.90, 3: 0.89, 4: 0.94, 5: 0.91, 6: 0.86,
  7: 0.58, 8: 0.79, 9: 0.92, 10: 0.91, 11: 0.90, 12: 0.83,
};

/** Electricity multiplier — summer air conditioning, winter is cheap. */
const ELECTRICITY_BY_MONTH = {
  1: 0.8, 2: 0.8, 3: 1.0, 4: 1.2, 5: 1.6, 6: 2.0,
  7: 2.4, 8: 2.2, 9: 1.5, 10: 1.1, 11: 0.9, 12: 0.8,
};

/** Students on roll. Grows through the session, dips at session change. */
function strengthFor(index, month) {
  const base = 880 + Math.floor(index * 3.2);          // steady growth
  const sessionBoost = month >= 4 && month <= 9 ? 26 : 0; // post-admission peak
  return base + sessionBoost;
}

/**
 * @param {number} [months=24]
 * @param {number} [startYear=2024]
 * @param {number} [startMonth=1]
 */
function buildHistory(months = 24, startYear = 2024, startMonth = 1) {
  const out = [];
  for (let i = 0; i < months; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const year = startYear + Math.floor((startMonth - 1 + i) / 12);
    const yearIdx = year - startYear;

    const students = strengthFor(i, m);
    // Rs 3,500 base monthly fee, 8% higher in the second year.
    const avgFee = Math.round(350000 * (1 + 0.08 * yearIdx));
    const billed = students * avgFee;
    const collectionRate = COLLECTION_BY_MONTH[m];
    const collected = Math.round(billed * collectionRate);

    /* Cost base is sized against revenue the way a real school's is:
       salaries around half of a good month's collection, rent and utilities
       well below that. Calibrated so a normal month clears a modest surplus
       and July - and only July - falls into loss. */
    const salaries = Math.round(1_450_000_00 * (1 + 0.07 * yearIdx));   // Rs 14.5 lakh
    const expensesByCategory = {
      Salaries: salaries,
      Electricity: Math.round(120_000_00 * ELECTRICITY_BY_MONTH[m]),     // Rs 1.2 lakh base
      Rent: 250_000_00,                                                  // Rs 2.5 lakh
      Transport: Math.round(150_000_00 * (m === 7 ? 0.45 : 1)),          // buses idle in July
      Supplies: Math.round(70_000_00 * (m === 4 || m === 9 ? 1.8 : 1)),  // term starts
      Maintenance: Math.round(45_000_00 * (m === 7 ? 3.1 : 1)),          // vacation repairs
    };

    const expense = Object.values(expensesByCategory).reduce((t, v) => t + v, 0);

    out.push({
      year, month: m, index: i,
      label: `${year}-${String(m).padStart(2, '0')}`,
      students, avgFee, billed, collectionRate, collected,
      expensesByCategory, expense,
      net: collected - expense,
    });
  }
  return out;
}

module.exports = { buildHistory, CATEGORIES, COLLECTION_BY_MONTH };
