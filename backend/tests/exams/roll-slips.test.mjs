/**
 * Roll number slips: the design a school saves, the papers of a class (its
 * date sheet), the order students are numbered in, and the instructions.
 */
import { describe, it, expect } from 'vitest';
import slips from '../../src/services/rollSlips.service.js';

const { checkDesign, checkSchedule, instructionLines, byRoll, DEFAULT_SLIP_DESIGN, DEFAULT_INSTRUCTIONS, examClassIds } = slips;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mNkYGD4z8DAwMDAxMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==';

describe('the slip design', () => {
  it('keeps what is not sent', () => {
    const { design } = checkDesign({ title: 'Admit Card' }, { ...DEFAULT_SLIP_DESIGN, perPage: 1, show: { room: true } });
    expect(design.title).toBe('Admit Card');
    expect(design.perPage).toBe(1);
    expect(design.show.room).toBe(true);
    expect(design.show.photo).toBe(true); // a default the old save lacked
  });

  it('refuses what cannot be printed', () => {
    expect(checkDesign({ color: 'red' }).error).toMatch(/colour/);
    expect(checkDesign({ perPage: 3 }).error).toMatch(/1 or 2/);
    expect(checkDesign({ rollNumber: 'x' }).error).toBeTruthy();
    expect(checkDesign({ rollStart: 0 }).error).toBeTruthy();
    expect(checkDesign({ rollStart: 1.5 }).error).toBeTruthy();
    expect(checkDesign({ rollPrefix: '<b>' }).error).toBeTruthy();
    expect(checkDesign({ title: '  ' }).error).toBeTruthy();
  });

  it('takes only a small picture as the signature', () => {
    expect(checkDesign({ principalSignature: PNG }).design.principalSignature).toBe(PNG);
    expect(checkDesign({ principalSignature: 'javascript:alert(1)' }).error).toMatch(/PNG or JPG/);
    expect(checkDesign({ principalSignature: 'https://example.com/sig.png' }).error).toBeTruthy();
    expect(checkDesign({ principalSignature: `data:image/png;base64,${'A'.repeat(420 * 1024)}` }).error).toBeTruthy();
  });

  it('remembers a signature that was removed on purpose', () => {
    expect(checkDesign({ title: 'X' }).design.signatureSet).toBe(false);
    const { design } = checkDesign({ principalSignature: '' });
    expect(design.signatureSet).toBe(true);
    expect(design.principalSignature).toBe('');
  });

  it('cuts long text to fit the slip', () => {
    const { design } = checkDesign({ principalName: 'A'.repeat(200), footerNote: 'B'.repeat(400) });
    expect(design.principalName).toHaveLength(80);
    expect(design.footerNote).toHaveLength(160);
  });
});

describe('the papers of a class', () => {
  it('reads a date sheet', () => {
    const { rows } = checkSchedule([
      { subject: ' English ', date: '2026-12-01', timeFrom: '09:00', timeTo: '12:00', room: 'Hall A' },
      { subject: 'اردو' },
    ]);
    expect(rows[0]).toMatchObject({ subjectName: 'English', startTime: '09:00', endTime: '12:00', room: 'Hall A' });
    expect(rows[0].date.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(rows[1]).toMatchObject({ subjectName: 'اردو', date: null, startTime: null, room: null });
  });

  it('refuses a paper twice, backwards times and dates that do not exist', () => {
    expect(checkSchedule([{ subject: 'Maths' }, { subject: 'maths' }]).error).toMatch(/twice/);
    expect(checkSchedule([{ subject: 'Maths', timeFrom: '12:00', timeTo: '09:00' }]).error).toMatch(/end after/);
    expect(checkSchedule([{ subject: 'Maths', timeFrom: '25:00' }]).error).toMatch(/start time/);
    expect(checkSchedule([{ subject: 'Maths', date: '01/12/2026' }]).error).toMatch(/date/);
    expect(checkSchedule([{ subject: '' }]).error).toMatch(/subject/);
    expect(checkSchedule('English').error).toBeTruthy();
    expect(checkSchedule(Array.from({ length: 41 }, (_, i) => ({ subject: `S${i}` }))).error).toMatch(/40/);
  });

  it('an empty list removes the papers', () => {
    expect(checkSchedule([])).toEqual({ rows: [] });
  });
});

describe('the order of the slips', () => {
  it('roll numbers in natural order, students without one last', () => {
    const list = [{ rollNo: '10', name: 'B' }, { rollNo: '', name: 'A' }, { rollNo: '2', name: 'C' }, { rollNo: 'A-10', name: 'D' }, { rollNo: 'A-9', name: 'E' }];
    expect(list.sort(byRoll).map((s) => s.name)).toEqual(['C', 'B', 'E', 'D', 'A']);
  });

  it('an exam is for its own classes', () => {
    expect(examClassIds({ classIds: JSON.stringify([{ classId: 4, className: 'Class 1' }, { classId: '7' }]) })).toEqual([4, 7]);
    expect(examClassIds({ classIds: null, classId: 3 })).toEqual([3]);
    expect(examClassIds({ classIds: 'not json', classId: null })).toEqual([]);
  });
});

describe('instructions', () => {
  it('one per line, numbering removed', () => {
    expect(instructionLines('1. Come on time.\n2) Bring your slip.\n\n  ')).toEqual(['Come on time.', 'Bring your slip.']);
  });

  it('the defaults when the school has none', () => {
    expect(instructionLines('')).toEqual(DEFAULT_INSTRUCTIONS);
    expect(instructionLines(null)).toEqual(DEFAULT_INSTRUCTIONS);
  });
});
