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

describe('exam roll numbers', () => {
  const { numberingOrder, examNumbers, oneRecordEach } = slips;
  const cls = (name, n) => Array.from({ length: n }, (_, i) => ({ id: `${name}${i + 1}` }));
  const PG = cls('PG', 3); const NUR = cls('NUR', 2); const PREP = cls('PREP', 3);

  it('class by class: all of one class, then the next', () => {
    expect(numberingOrder([PG, NUR], 'exam').map((s) => s.id)).toEqual(['PG1', 'PG2', 'PG3', 'NUR1', 'NUR2']);
  });

  it('mixed: one student of each class in turn, a class that runs out is passed over', () => {
    expect(numberingOrder([PG, NUR, PREP], 'mixed').map((s) => s.id))
      .toEqual(['PG1', 'NUR1', 'PREP1', 'PG2', 'NUR2', 'PREP2', 'PG3', 'PREP3']);
  });

  it('mixed from 5001: Play Group 5001, Nursery 5002, Prep 5003, then the second students', () => {
    const { byStudent, fresh } = examNumbers([PG, NUR, PREP], { mode: 'mixed', start: 5001 });
    expect(byStudent.get('PG1')).toBe('5001');
    expect(byStudent.get('NUR1')).toBe('5002');
    expect(byStudent.get('PREP1')).toBe('5003');
    expect(byStudent.get('PG2')).toBe('5004');
    expect(fresh).toHaveLength(8);
    expect(new Set(fresh.map((f) => f.number)).size).toBe(8); // never twice
  });

  it('a prefix goes in front of every number', () => {
    expect(examNumbers([PG], { mode: 'exam', start: 1, prefix: 'T1-' }).byStudent.get('PG3')).toBe('T1-3');
  });

  it('fixed numbers stay; a student admitted since gets the next number after the highest', () => {
    const saved = [
      { studentId: 'PG1', number: 5001, prefix: '', rollNo: '5001', mode: 'mixed' },
      { studentId: 'NUR1', number: 5002, prefix: '', rollNo: '5002', mode: 'mixed' },
      { studentId: 'PG2', number: 5003, prefix: '', rollNo: '5003', mode: 'mixed' },
    ];
    // A new Nursery student (NUR0) now comes first in the class's roll order.
    const { byStudent, fresh, mode, fixed } = examNumbers([[{ id: 'PG1' }, { id: 'PG2' }], [{ id: 'NUR0' }, { id: 'NUR1' }]], { mode: 'exam', start: 1, saved });
    expect(fixed).toBe(true);
    expect(mode).toBe('mixed'); // the numbering already printed carries on
    expect(byStudent.get('PG1')).toBe('5001');
    expect(byStudent.get('NUR1')).toBe('5002');
    expect(byStudent.get('NUR0')).toBe('5004');
    expect(fresh).toEqual([{ studentId: 'NUR0', number: 5004, prefix: '', rollNo: '5004' }]);
  });

  it('a student recorded twice in a class gets one slip; the record with a roll number is kept', () => {
    const { keep, duplicates } = oneRecordEach([
      { id: 9, classId: 1, name: 'Ali  Raza', fatherName: 'Imran', rollNo: '' },
      { id: 4, classId: 1, name: 'ali raza', fatherName: 'IMRAN.', rollNo: '12' },
      { id: 5, classId: 2, name: 'Ali Raza', fatherName: 'Imran', rollNo: '30' }, // another class: another child
      { id: 6, classId: 1, name: 'Ali Raza', fatherName: 'Kamran', rollNo: '13' }, // another father
      { id: 7, classId: 1, name: 'Sara', fatherName: '', rollNo: '' },
      { id: 8, classId: 1, name: 'Sara', fatherName: '', rollNo: '' }, // no father's name: never merged
    ]);
    expect(keep.map((s) => s.id).sort()).toEqual([4, 5, 6, 7, 8]);
    expect(duplicates).toEqual([{ student: expect.objectContaining({ id: 9 }), keptId: 4 }]);
  });
});

describe('the school name and logo on the slip', () => {
  it('the name can be the slip\'s own, and the logo can be left off', () => {
    const { design } = checkDesign({ schoolName: '  City  Grammar   School ', show: { logo: false } });
    expect(design.schoolName).toBe('City Grammar School');
    expect(design.show.logo).toBe(false);
    expect(checkDesign({}).design.show.logo).toBe(true);
    expect(checkDesign({ rollNumber: 'mixed' }).design.rollNumber).toBe('mixed');
  });
});
