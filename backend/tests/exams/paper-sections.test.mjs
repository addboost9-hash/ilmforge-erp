/**
 * Question papers: every question is checked before it is saved, and the
 * paper's total marks are worked out from the questions (with "attempt any
 * N" counted), so the total printed on a paper always matches it.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/routes/paper.routes.js';

const { cleanSections } = mod;
const mcq = (over = {}) => ({ type: 'mcq', text: 'Capital of Pakistan?', marks: 1, options: ['Lahore', 'Islamabad', 'Karachi', 'Quetta'], answer: 1, ...over });
const shortQ = (marks = 5) => ({ type: 'short', text: 'Define photosynthesis.', marks });

describe('question paper sections', () => {
  it('adds up the marks of every question', () => {
    const r = cleanSections([
      { title: 'Section A — Objective', questions: [mcq(), mcq(), mcq()] },
      { title: 'Section B — Subjective', questions: [shortQ(5), shortQ(5)] },
    ]);
    expect(r.error).toBeUndefined();
    expect(r.totalMarks).toBe(13);
    expect(r.questions).toBe(5);
    expect(r.sections.map((s) => s.marks)).toEqual([3, 10]);
  });

  it('counts only the questions to attempt in "attempt any N"', () => {
    const r = cleanSections([{ title: 'Long questions', attempt: 2, questions: [shortQ(10), shortQ(10), shortQ(10)] }]);
    expect(r.totalMarks).toBe(20);
    expect(r.sections[0].attempt).toBe(2);
    // attempting all of them is no choice at all
    expect(cleanSections([{ attempt: 3, questions: [shortQ(), shortQ(), shortQ()] }]).sections[0].attempt).toBeNull();
  });

  it('explains what is wrong with a question', () => {
    expect(cleanSections([{ title: 'A', questions: [{ type: 'mcq', text: '', marks: 1 }] }]).error).toMatch(/A, question 1: write the question/);
    expect(cleanSections([{ questions: [mcq({ options: ['only one'] })] }]).error).toMatch(/2 to 6 options/);
    expect(cleanSections([{ questions: [mcq({ options: ['a', ''] })] }]).error).toMatch(/every option/);
    expect(cleanSections([{ questions: [mcq({ answer: 7 })] }]).error).toMatch(/not one of the options/);
    expect(cleanSections([{ questions: [shortQ(2.5)] }]).error).toMatch(/whole number/);
    expect(cleanSections([{ questions: [{ type: 'essay', text: 'x', marks: 1 }] }]).error).toMatch(/question type/);
    expect(cleanSections('not json').error).toBeTruthy();
  });

  it('keeps answers in a form the answer key can print', () => {
    const r = cleanSections([{ questions: [
      mcq({ answer: '2' }),
      { type: 'truefalse', text: 'The sun rises in the east.', marks: 1, answer: 'true' },
      { type: 'fill', text: 'Water boils at ____ °C.', marks: 1, answer: ' 100 ' },
      mcq({ answer: '' }),
    ] }]);
    const qs = r.sections[0].questions;
    expect(qs[0].answer).toBe(2);
    expect(qs[1].answer).toBe(true);
    expect(qs[2].answer).toBe('100');
    expect(qs[3].answer).toBeNull();
  });

  it('names untitled parts A, B, C', () => {
    const r = cleanSections([{ questions: [] }, { questions: [] }]);
    expect(r.sections.map((s) => s.title)).toEqual(['Section A', 'Section B']);
  });
});
