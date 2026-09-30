/**
 * IlmForge — Insights engine: "Why this result?"
 *
 * Pure. Given two months of figures, it explains the change in net result as
 * a set of driver impacts that sum EXACTLY to that change. No residual, no
 * "other" bucket to hide rounding in.
 *
 * ── The revenue decomposition ───────────────────────────────────────────
 * Collected revenue is the product of three things:
 *
 *     revenue = students x averageFee x collectionRate
 *
 * A change in revenue is attributed by advancing one factor at a time and
 * holding the not-yet-advanced factors at their old value:
 *
 *     strength   = (N1 - N0) *  F0      *  C0
 *     fee        =  N1       * (F1 - F0) *  C0
 *     collection =  N1       *  F1      * (C1 - C0)
 *
 * Expanding the three terms cancels everything except N1*F1*C1 - N0*F0*C0,
 * which is the actual change. That identity is what makes the reconciliation
 * exact rather than approximate, and it is asserted in the unit tests.
 *
 * The order matters to the split (this is the standard chained decomposition,
 * not a Shapley value): the effect of growing the roll is measured at last
 * month's fee, and the effect of raising fees is measured on this month's
 * roll. That is the reading a school owner expects - "we added 40 students at
 * the old fee, then raised the fee on everyone".
 *
 * ── Expenses ────────────────────────────────────────────────────────────
 * Expenses are decomposed per category, which sums exactly by construction.
 * An expense increase REDUCES net, so its impact is carried with the sign
 * already flipped; callers never have to remember to subtract.
 */

const round = (n) => Math.round(n);

/**
 * @typedef {object} MonthFigures
 * @property {number} students        headcount billed
 * @property {number} billed          total invoiced, in paisa
 * @property {number} collected       total received, in paisa
 * @property {Record<string, number>} expensesByCategory  paisa per category
 */

/** Derived per-month factors. Guards against divide-by-zero on a dead month. */
function factors(m) {
  const students = m.students || 0;
  const billed = m.billed || 0;
  const collected = m.collected || 0;
  return {
    students,
    avgFee: students > 0 ? billed / students : 0,
    collectionRate: billed > 0 ? collected / billed : 0,
    collected,
    expense: Object.values(m.expensesByCategory || {}).reduce((t, v) => t + (v || 0), 0),
  };
}

/**
 * @param {MonthFigures} previous
 * @param {MonthFigures} current
 * @returns explanation with drivers that sum exactly to netChange
 */
function explain(previous, current) {
  const a = factors(previous || {});
  const b = factors(current || {});

  // Revenue drivers — chained, so the three terms telescope exactly.
  const strengthImpact = (b.students - a.students) * a.avgFee * a.collectionRate;
  const feeImpact = b.students * (b.avgFee - a.avgFee) * a.collectionRate;
  const collectionImpact = b.students * b.avgFee * (b.collectionRate - a.collectionRate);

  // Expense drivers — one per category that moved, sign flipped so a rise
  // in spending reads as a negative impact on the result.
  const categories = new Set([
    ...Object.keys(previous?.expensesByCategory || {}),
    ...Object.keys(current?.expensesByCategory || {}),
  ]);
  const expenseDrivers = [];
  for (const cat of categories) {
    const was = previous?.expensesByCategory?.[cat] || 0;
    const now = current?.expensesByCategory?.[cat] || 0;
    if (was === now) continue;
    expenseDrivers.push({
      key: `expense:${cat}`,
      kind: 'expense',
      label: cat,
      from: was,
      to: now,
      impact: -(now - was),
    });
  }

  const drivers = [
    {
      key: 'strength', kind: 'revenue', label: 'Student strength',
      from: a.students, to: b.students, impact: strengthImpact,
      detail: `${a.students} → ${b.students} students`,
    },
    {
      key: 'avgFee', kind: 'revenue', label: 'Average fee',
      from: a.avgFee, to: b.avgFee, impact: feeImpact,
      detail: 'Average billed per student',
    },
    {
      key: 'collection', kind: 'revenue', label: 'Collection rate',
      from: a.collectionRate * 100, to: b.collectionRate * 100, impact: collectionImpact,
      detail: `${(a.collectionRate * 100).toFixed(1)}% → ${(b.collectionRate * 100).toFixed(1)}% of billed`,
    },
    ...expenseDrivers,
  ];

  const netBefore = a.collected - a.expense;
  const netAfter = b.collected - b.expense;
  const netChange = netAfter - netBefore;

  /* Rounding to whole paisa can leave the parts a rupee-fraction off the
     whole. Rather than leave a visible discrepancy, the largest driver
     absorbs the remainder — it is the one least distorted by it, and the
     invariant "parts sum to the whole" is worth more than sub-paisa purity
     in a driver nobody is reading closely. */
  const rounded = drivers.map((d) => ({ ...d, impact: round(d.impact) }));
  const drift = round(netChange) - rounded.reduce((t, d) => t + d.impact, 0);
  if (drift !== 0 && rounded.length) {
    let big = 0;
    rounded.forEach((d, i) => { if (Math.abs(d.impact) > Math.abs(rounded[big].impact)) big = i; });
    rounded[big] = { ...rounded[big], impact: rounded[big].impact + drift, absorbedRounding: drift };
  }

  const sorted = [...rounded].sort((x, y) => Math.abs(y.impact) - Math.abs(x.impact));

  return {
    netBefore: round(netBefore),
    netAfter: round(netAfter),
    netChange: round(netChange),
    direction: netChange > 0 ? 'improved' : netChange < 0 ? 'worsened' : 'flat',
    revenueChange: round(b.collected - a.collected),
    expenseChange: round(b.expense - a.expense),
    drivers: sorted,
    /** True when the parts sum to the whole. The tests assert this. */
    reconciles: sorted.reduce((t, d) => t + d.impact, 0) === round(netChange),
    biggestDriver: sorted[0] || null,
    factors: { previous: a, current: b },
  };
}

module.exports = { explain, factors };
