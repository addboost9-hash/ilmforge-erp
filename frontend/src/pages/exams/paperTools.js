/**
 * Helpers for making question papers quickly (no React, so they are tested
 * in backend/tests/exams/paper-tools.test.mjs):
 *
 *   PATTERNS / patternRows(kind, total)  a paper's parts laid out for a
 *        subject's total marks: board style (MCQs, short, long), junior
 *        classes (fill, true/false, MCQs, short), short and long only
 *   patternTotal(rows)                   marks the rows add up to
 *   layOut(rows)                         the paper's sections, with empty
 *                                        questions to write in
 *   parseQuestions(text, fallback)       questions pasted from Word or
 *                                        WhatsApp, one after another
 *   sectionMarks(section)                a part's marks ("attempt any 3":
 *                                        its 3 highest-marked questions)
 */

export const TYPES = [
  { v: 'mcq', l: 'Multiple choice', marks: 1 },
  { v: 'truefalse', l: 'True / False', marks: 1 },
  { v: 'fill', l: 'Fill in the blank', marks: 1 },
  { v: 'short', l: 'Short question', marks: 2 },
  { v: 'long', l: 'Long question', marks: 5 },
];
export const typeLabel = (v) => TYPES.find((t) => t.v === v)?.l || v;

const HEADINGS = {
  mcq: ['Multiple choice questions', 'Choose the correct answer.'],
  truefalse: ['True or false', 'Write True or False.'],
  fill: ['Fill in the blanks', 'Fill in the blanks.'],
  short: ['Short questions', 'Answer briefly.'],
  long: ['Long questions', 'Answer in detail.'],
};

export const newQuestion = (type, marks) => ({
  type, text: '', marks: marks ?? TYPES.find((t) => t.v === type)?.marks ?? 1,
  ...(type === 'mcq' ? { options: ['', '', '', ''], answer: null } : { answer: type === 'truefalse' ? null : '' }),
});

export const sectionMarks = (sec) => {
  const m = (sec.questions || []).map((q) => Number(q.marks) || 0).sort((a, b) => b - a);
  const att = Number(sec.attempt);
  return (Number.isInteger(att) && att >= 1 && att < m.length ? m.slice(0, att) : m).reduce((a, b) => a + b, 0);
};

export const PATTERNS = [
  { id: 'board', label: 'Objective and subjective (board style)', hint: 'MCQs, then short questions and long questions with "attempt any"' },
  { id: 'junior', label: 'Junior classes', hint: 'Fill in the blanks, true or false, MCQs and short questions' },
  { id: 'subjective', label: 'Short and long questions', hint: 'No objective part' },
];

/* "Attempt a, m marks each" adding up to exactly `marks`, each question worth
   between lo and hi: the attempt nearest to marks/aim that divides evenly,
   or null when none does. */
function exact(marks, aim, lo, hi) {
  if (marks <= 0) return null;
  const start = Math.max(1, Math.round(marks / aim));
  for (let d = 0; d <= marks; d++) {
    for (const a of [start + d, start - d]) {
      if (a >= 1 && marks % a === 0 && marks / a >= lo && marks / a <= hi) return { attempt: a, each: marks / a };
    }
  }
  return null;
}
/* The long part nearest `target` marks that splits evenly (and leaves `ok(rest)` true). */
function longPart(target, T, aim, ok = () => true) {
  for (let d = 0; d < T; d++) {
    for (const L of [target - d, target + d]) {
      const l = L > 0 && L < T ? exact(L, aim, 4, 15) : null;
      if (l && ok(T - L)) return { L, ...l };
    }
  }
  return null;
}

const row = (type, count, marks, attempt = null) => ({ type, title: HEADINGS[type][0], note: HEADINGS[type][1], count, marks, attempt });

/** The parts of a pattern for a subject out of `total` marks; each row: { type, title, note, count, marks, attempt }. */
export function patternRows(kind, total = 100) {
  const T = Math.max(10, Math.min(500, Math.round(Number(total) || 100)));
  if (kind === 'junior') {
    // About three fifths objective (fill, true/false, MCQs alike), the rest short questions of 2 marks.
    let k = Math.max(2, Math.round(T * 0.2));
    while (k > 1 && T - 3 * k < 2) k -= 1;
    const rest = T - 3 * k;
    const shortN = Math.floor(rest / 2);
    return [row('fill', k + (rest - shortN * 2), 1), row('truefalse', k, 1), row('mcq', k, 1), row('short', shortN, 2)];
  }
  const aim = T >= 60 ? 8 : 5;
  if (kind === 'subjective') {
    // Half long; the short part, the rest, at 2 (or 3) marks each.
    const l = longPart(Math.round(T / 2), T, aim, (rest) => !!exact(rest, 2, 2, 3));
    if (l) {
      const s = exact(T - l.L, 2, 2, 3);
      return [row('short', s.attempt + 2, s.each, s.attempt), row('long', l.attempt + 1, l.each, l.attempt)];
    }
  }
  // Board style: two fifths short, about two fifths long, the rest MCQs at
  // 1 mark each (which takes up whatever is left, so the total is exact).
  const shortAttempt = Math.max(1, Math.round((T * 0.4) / 2));
  const room = T - shortAttempt * 2;
  const l = longPart(room - Math.max(5, Math.round(T * 0.2)), T, aim, (rest) => rest - shortAttempt * 2 >= Math.min(5, room));
  const mcq = room - (l ? l.L : 0);
  return [
    row('mcq', mcq, 1),
    row('short', shortAttempt + (shortAttempt >= 5 ? 3 : 1), 2, shortAttempt),
    ...(l ? [row('long', l.attempt + 1, l.each, l.attempt)] : []),
  ];
}

export const rowMarks = (r) => (Math.min(Number(r.attempt) || Number(r.count) || 0, Number(r.count) || 0)) * (Number(r.marks) || 0);
export const patternTotal = (rows) => rows.reduce((a, r) => a + rowMarks(r), 0);

/** The paper's sections for the rows: headings, notes, "attempt any", and empty questions to write. */
export function layOut(rows) {
  return rows.filter((r) => Number(r.count) > 0).map((r, i) => ({
    title: `Section ${String.fromCharCode(65 + i)} — ${r.title}`,
    note: r.note,
    attempt: r.attempt && Number(r.attempt) < Number(r.count) ? Number(r.attempt) : null,
    questions: Array.from({ length: Math.min(100, Number(r.count)) }, () => newQuestion(r.type, Number(r.marks))),
  }));
}

/**
 * Questions typed or pasted one after another, as from Word or WhatsApp:
 *
 *   1. What is the capital of Pakistan?
 *   a) Lahore   b) Islamabad *   (options on their own lines or one line; * marks the answer)
 *   2. The sun rises in the ______.
 *   3. Water boils at 100 °C. (True/False)
 *   4. Describe the water cycle.
 *
 * Options make a multiple-choice question; "____" a fill in the blank;
 * "(True/False)" or "(T/F)" a true or false; anything else is `fallback.type`.
 */
export function parseQuestions(text, fallback = { type: 'short', marks: 2 }) {
  const OPTION = /^\(?([a-fA-F])[).:]\s*(.+)$/;
  const START = /^(?:Q(?:uestion)?\.?\s*)?\d{1,3}\s*[.):-]\s*(.*)$/i;
  const blocks = [];
  let cur = null;
  const push = () => { if (cur && (cur.text.trim() || cur.options.length)) blocks.push(cur); cur = null; };
  for (const raw of String(text || '').split(/\r?\n/)) {
    const lineText = raw.trim();
    if (!lineText) { if (cur && !cur.options.length) push(); continue; }
    // Several options on one line: "a) one   b) two   c) three"
    const inline = lineText.split(/\s{2,}|\t+|(?=\s\(?[b-fB-F][).]\s)/).map((x) => x.trim()).filter(Boolean);
    if (cur && inline.length > 1 && inline.every((x) => OPTION.test(x))) { inline.forEach((x) => cur.options.push(OPTION.exec(x)[2])); continue; }
    const opt = OPTION.exec(lineText);
    if (cur && opt && !START.test(lineText)) { cur.options.push(opt[2]); continue; }
    const start = START.exec(lineText);
    if (start || !cur || cur.options.length) { push(); cur = { text: start ? start[1] : lineText, options: [] }; continue; }
    cur.text += `\n${lineText}`;
  }
  push();
  return blocks.slice(0, 100).map((b) => {
    let qText = b.text.trim();
    if (b.options.length >= 2) {
      let answer = null;
      const options = b.options.slice(0, 6).map((o, i) => {
        const m = /\s*(\*|✓|✔|\(correct\))\s*$/i.exec(o);
        if (m) { answer = i; return o.slice(0, m.index).trim(); }
        return o.trim();
      });
      return { type: 'mcq', text: qText, marks: fallback.type === 'mcq' ? fallback.marks : 1, options, answer };
    }
    const tf = /\s*\(?\s*(true\s*\/\s*false|t\s*\/\s*f)\s*\)?\s*\.?$/i;
    if (tf.test(qText)) {
      qText = qText.replace(tf, '').trim();
      return { type: 'truefalse', text: qText, marks: fallback.type === 'truefalse' ? fallback.marks : 1, answer: null };
    }
    if (/_{3,}/.test(qText)) return { type: 'fill', text: qText, marks: fallback.type === 'fill' ? fallback.marks : 1, answer: '' };
    const type = ['short', 'long', 'fill', 'mcq', 'truefalse'].includes(fallback.type) && !['mcq', 'truefalse'].includes(fallback.type) ? fallback.type : 'short';
    return { type, text: qText, marks: fallback.marks ?? 2, answer: '' };
  }).filter((q) => q.text);
}
