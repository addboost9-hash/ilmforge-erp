/**
 * IlmForge — Insights engine: school health score.
 *
 * Pure. Takes already-computed metrics, returns a 0-100 score plus the
 * contribution of every component, so the number is never a black box: the
 * dashboard can show exactly why the school scored what it scored.
 *
 * Design decisions worth knowing:
 *
 *  - Components with no data are DROPPED, not scored as zero. A school that
 *    has not recorded attendance yet is not an unhealthy school; it is a
 *    school we know less about. The remaining weights are renormalised, and
 *    `coverage` reports how much of the picture we actually had.
 *
 *  - Every component is scored against a stated target, and the target is
 *    part of the output, so "72% collection against a 90% target" is
 *    legible rather than an unexplained deduction.
 */

/** Default weights. Admin-adjustable; changes are audit-logged by the route. */
const DEFAULT_WEIGHTS = {
  collectionRate: 30,   // are we actually banking the fees we billed
  attendanceRate: 20,   // are students turning up
  retention: 20,        // are we keeping them
  staffAttendance: 15,  // is the school staffed
  profitability: 15,    // are we solvent
};

/** What "good" looks like for each component. */
const TARGETS = {
  collectionRate: 90,   // %
  attendanceRate: 90,   // %
  retention: 95,        // % of students retained over the period
  staffAttendance: 95,  // %
  profitability: 10,    // net margin %
};

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Scale a measured value against its target onto 0-100.
 * Hitting the target scores 100; the scale is linear below it. Overshooting
 * does not earn more than 100 — a 99% collection rate is excellent, but it
 * should not paper over a staffing collapse.
 */
const scoreAgainst = (value, target) => {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return null;
  return clamp((value / target) * 100);
};

/**
 * @param {object} metrics - any subset of:
 *   collectionRate, attendanceRate, retention, staffAttendance (percentages)
 *   netMargin (percentage, may be negative)
 * @param {object} [weights] - override DEFAULT_WEIGHTS
 */
function healthScore(metrics = {}, weights = DEFAULT_WEIGHTS) {
  const w = { ...DEFAULT_WEIGHTS, ...(weights || {}) };

  const raw = {
    collectionRate: scoreAgainst(metrics.collectionRate, TARGETS.collectionRate),
    attendanceRate: scoreAgainst(metrics.attendanceRate, TARGETS.attendanceRate),
    retention: scoreAgainst(metrics.retention, TARGETS.retention),
    staffAttendance: scoreAgainst(metrics.staffAttendance, TARGETS.staffAttendance),
    // Margin can be negative; a loss floors the component at 0 rather than
    // dragging the whole score below zero.
    profitability: Number.isFinite(metrics.netMargin)
      ? clamp((metrics.netMargin / TARGETS.profitability) * 100)
      : null,
  };

  const present = Object.keys(raw).filter((k) => raw[k] !== null && w[k] > 0);
  const totalWeight = present.reduce((t, k) => t + w[k], 0);

  if (!present.length || totalWeight <= 0) {
    return {
      score: null,
      band: 'unknown',
      coverage: 0,
      components: [],
      missing: Object.keys(raw).filter((k) => raw[k] === null),
      note: 'No health inputs recorded yet.',
    };
  }

  const components = present.map((key) => {
    // Renormalise so the surviving components still sum to 100% of the score.
    const share = w[key] / totalWeight;
    const points = raw[key] * share;
    return {
      key,
      measured: metrics[key === 'profitability' ? 'netMargin' : key],
      target: TARGETS[key],
      subScore: Math.round(raw[key]),
      weight: Math.round(share * 100),
      points: Math.round(points * 10) / 10,
    };
  });

  const score = Math.round(components.reduce((t, c) => t + c.points, 0));

  return {
    score,
    band: score >= 80 ? 'strong' : score >= 60 ? 'steady' : score >= 40 ? 'watch' : 'urgent',
    // How much of the intended picture we had data for. A 90 built from two
    // of five components deserves to be read differently from a full one.
    coverage: Math.round((totalWeight / Object.values(w).reduce((t, x) => t + x, 0)) * 100),
    components: components.sort((a, b) => b.points - a.points),
    missing: Object.keys(raw).filter((k) => raw[k] === null),
  };
}

module.exports = { healthScore, DEFAULT_WEIGHTS, TARGETS };
