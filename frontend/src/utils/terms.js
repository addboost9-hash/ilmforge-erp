/**
 * IlmForge — exam terms.
 *
 * Most schools run two exam terms, but some run up to six, so the number is a
 * per-school setting (School Settings → Exam Settings) rather than a fixed
 * pair of tabs.
 *
 * Backward compatibility matters here. Exams recorded before this setting
 * existed carry a `type` of `first_term`, `midterm`, `final`, `annual` and so
 * on, with `term` sometimes empty. Those exams must keep appearing under the
 * right tab, so term matching keeps the old aliases for terms 1 and 2 and
 * uses the plain label for terms 3 to 6.
 */

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

export const MAX_TERMS = 6;
export const MIN_TERMS = 1;

/** Clamp whatever the settings return into something renderable. */
export const clampTerms = (n) => {
  const v = parseInt(n);
  return Math.min(MAX_TERMS, Math.max(MIN_TERMS, Number.isFinite(v) ? v : 2));
};

/**
 * The terms a school runs.
 * @param {number} count 1-6
 * @returns [{ key: '1st', label: '1st Term', type: 'first_term', index: 1 }, ...]
 */
export function buildTerms(count) {
  const n = clampTerms(count);
  return ORDINALS.slice(0, n).map((key, i) => ({
    key,
    index: i + 1,
    label: `${key} Term`,
    // Terms 1 and 2 keep their historic type values so existing exams,
    // reports and result cards continue to match. Later terms use a
    // predictable term_N form.
    type: i === 0 ? 'first_term' : i === 1 ? 'second_term' : `term_${i + 1}`,
  }));
}

/**
 * Does this exam belong to the given term?
 * Handles records created before terms were configurable.
 */
export function examMatchesTerm(exam, termKey) {
  const term = String(exam?.term || '').toLowerCase();
  const type = String(exam?.type || '').toLowerCase();
  const key = String(termKey || '').toLowerCase();

  if (term === key) return true;

  // Legacy aliases, only for the first two terms — everything older in this
  // system was one or the other.
  if (key === '1st') {
    return !term && (
      type.includes('first') || type.includes('mid') ||
      type === 'semester1' || type === 'semester2'
    );
  }
  if (key === '2nd') {
    return !term && (
      type.includes('second') || type.includes('final') || type === 'annual' ||
      type === 'semester3' || type === 'semester4'
    );
  }
  // Terms 3-6 are new, so they only ever match an explicit label or type.
  return type === `term_${ORDINALS.indexOf(key) + 1}`;
}

/** Exams with no recognisable term at all, so nothing silently disappears. */
export function examsWithoutTerm(exams, terms) {
  return (exams || []).filter(e => !terms.some(t => examMatchesTerm(e, t.key)));
}
