/**
 * Syllabus helpers (no React, so they are tested in
 * backend/tests/exams/paper-tools.test.mjs).
 *
 *   parseChapterList(text)  chapters typed or pasted one per line, as
 *                           { title, details }: what to prepare may follow a
 *                           tab, " - " or " – "; numbers and bullets go.
 */
/** "Chapter 3: Fractions - pages 30-45" → { title: 'Chapter 3: Fractions', details: 'pages 30-45' }.
    A tab, " – " or " - " separates the chapter from what to prepare; numbers and bullets go. */
export function parseChapterList(text) {
  return String(text || '').split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•▪◦]|\d{1,3}[.)])\s+/, '').trim()).filter(Boolean).slice(0, 100).map((l) => {
    const m = l.split('\t');
    if (m.length > 1) return { title: m[0].trim(), details: m.slice(1).join(' ').trim() };
    const d = /^(.+?)\s+[–—-]\s+(.+)$/.exec(l);
    return d ? { title: d[1].trim(), details: d[2].trim() } : { title: l, details: '' };
  });
}

