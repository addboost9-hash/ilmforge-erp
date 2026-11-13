/**
 * Making papers and syllabi quickly (frontend/src/pages/exams/paperTools.js
 * and syllabusTools.js, tested here as the frontend has no test runner):
 * patterns that add up to the subject's marks, questions and chapters
 * pasted from Word or WhatsApp; and the server's rule that a draft may
 * hold questions not written yet but a ready paper may not.
 */
import { describe, it, expect } from 'vitest';
import { patternRows, patternTotal, layOut, parseQuestions, sectionMarks } from '../../../frontend/src/pages/exams/paperTools.js';
import { parseChapterList } from '../../../frontend/src/pages/exams/syllabusTools.js';
import paperRoutes from '../../src/routes/paper.routes.js';

const { cleanSections } = paperRoutes;

describe('paper patterns', () => {
  it('every pattern adds up exactly to the subject total, 10 to 200 marks', () => {
    for (const kind of ['board', 'junior', 'subjective']) {
      for (let t = 10; t <= 200; t++) {
        const rows = patternRows(kind, t);
        expect(patternTotal(rows), `${kind} ${t}`).toBe(t);
        expect(rows.every((r) => r.count >= 1 && r.marks >= 1), `${kind} ${t}`).toBe(true);
      }
    }
  });

  it('board style for 100: 20 MCQs, short and long with "attempt any"', () => {
    const rows = patternRows('board', 100);
    expect(rows.map((r) => r.type)).toEqual(['mcq', 'short', 'long']);
    expect(rows[0]).toMatchObject({ count: 20, marks: 1 });
    expect(rows[1].attempt).toBeLessThan(rows[1].count);
  });

  it('junior classes: fill, true/false, MCQs and short questions in balance', () => {
    expect(patternRows('junior', 50).map((r) => [r.type, r.count, r.marks])).toEqual([['fill', 10, 1], ['truefalse', 10, 1], ['mcq', 10, 1], ['short', 10, 2]]);
  });

  it('lays out parts with empty questions to write, keeping "attempt any"', () => {
    const sections = layOut(patternRows('board', 50));
    expect(sections[0].title).toMatch(/^Section A — Multiple choice/);
    expect(sections[0].questions.every((q) => q.type === 'mcq' && q.text === '' && q.options.length === 4)).toBe(true);
    expect(sections.reduce((a, s) => a + sectionMarks(s), 0)).toBe(50);
  });
});

describe('questions pasted from elsewhere', () => {
  const pasted = [
    '1. What is the capital of Pakistan?', 'a) Lahore', 'b) Islamabad *', 'c) Karachi', 'd) Quetta',
    '2. The sun rises in the ______.',
    '3. Water boils at 100 °C. (True/False)',
    '4. Describe the water cycle.', 'Explain with a diagram.',
    '5) Which is a prime number?', 'a) 4  b) 6  c) 7 *  d) 9',
  ].join('\n');
  const qs = parseQuestions(pasted, { type: 'long', marks: 5 });

  it('finds each question and its kind', () => {
    expect(qs.map((q) => q.type)).toEqual(['mcq', 'fill', 'truefalse', 'long', 'mcq']);
  });
  it('options and the starred answer', () => {
    expect(qs[0]).toMatchObject({ text: 'What is the capital of Pakistan?', options: ['Lahore', 'Islamabad', 'Karachi', 'Quetta'], answer: 1, marks: 1 });
    expect(qs[4]).toMatchObject({ options: ['4', '6', '7', '9'], answer: 2 });
  });
  it('a question on two lines stays one question, with the chosen marks', () => {
    expect(qs[3]).toMatchObject({ text: 'Describe the water cycle.\nExplain with a diagram.', marks: 5 });
  });
  it('"(True/False)" is taken off the question', () => {
    expect(qs[2].text).toBe('Water boils at 100 °C.');
  });
  it('Urdu questions too', () => {
    expect(parseQuestions('1. پاکستان کا دارالحکومت کیا ہے؟\n2. سورج ______ سے نکلتا ہے۔').map((q) => q.type)).toEqual(['short', 'fill']);
  });
});

describe('syllabus chapters pasted as a list', () => {
  it('splits what to prepare from the chapter, drops numbers and bullets', () => {
    expect(parseChapterList('1. Numbers 1 to 50 - pages 1-15\n2. Addition\tExercises 2.1, 2.2\n• Shapes\n\n')).toEqual([
      { title: 'Numbers 1 to 50', details: 'pages 1-15' },
      { title: 'Addition', details: 'Exercises 2.1, 2.2' },
      { title: 'Shapes', details: '' },
    ]);
  });
  it('a hyphen inside a word is not a separator', () => {
    expect(parseChapterList('Chapter 4: Self-respect')).toEqual([{ title: 'Chapter 4: Self-respect', details: '' }]);
  });
});

describe('draft and ready papers', () => {
  const blank = [{ title: 'A', questions: [{ type: 'short', text: '', marks: 2 }, { type: 'mcq', text: 'Pick', marks: 1, options: ['', '', '', ''], answer: null }] }];
  it('a draft may hold questions not written yet, counted', () => {
    const r = cleanSections(blank, { allowBlank: true });
    expect(r.error).toBeUndefined();
    expect(r).toMatchObject({ blanks: 2, questions: 2, totalMarks: 3 });
  });
  it('a ready paper may not', () => {
    expect(cleanSections(blank).error).toMatch(/write the question/);
    expect(cleanSections([{ title: 'A', questions: [blank[0].questions[1]] }]).error).toMatch(/fill in every option/);
  });
  it('the type and marks are still checked in a draft', () => {
    expect(cleanSections([{ title: 'A', questions: [{ type: 'essay', text: '', marks: 2 }] }], { allowBlank: true }).error).toMatch(/type/);
    expect(cleanSections([{ title: 'A', questions: [{ type: 'short', text: '', marks: 1.5 }] }], { allowBlank: true }).error).toMatch(/whole number/);
  });
});
