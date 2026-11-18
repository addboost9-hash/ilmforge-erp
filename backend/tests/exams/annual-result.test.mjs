/**
 * The annual result card (services/annualResult.service.js): which exams of
 * a session count for a class, and each student's year subject by subject,
 * with totals, grade, pass or fail and position in the class. The page that
 * showed it read data the server never sent, so it was always empty.
 */
import { describe, it, expect } from 'vitest';
import svc from '../../src/services/annualResult.service.js';
import { gradeScale, gradesFromSettings, docColor, NAVY } from '../../../frontend/src/utils/printKit.js';

const { sessionExams, ownerSession, annualRows } = svc;
const S1 = { id: 1, name: '2025-2026', startDate: '2025-04-01T00:00:00Z', endDate: '2026-03-31T00:00:00Z', isActive: false };
const S2 = { id: 2, name: '2026-2027', startDate: '2026-04-01T00:00:00Z', endDate: '2027-03-31T00:00:00Z', isActive: true };
const exam = (id, o) => ({ id, title: `Exam ${id}`, classId: 1, classIds: null, sessionId: null, dateStart: null, createdAt: '2026-01-01T00:00:00Z', ...o });

describe('the exams of a session', () => {
  const exams = [
    exam(1, { dateStart: '2025-10-10T00:00:00Z' }),
    exam(2, { dateStart: '2026-05-01T00:00:00Z' }),
    exam(3, { sessionId: 1, dateStart: '2026-09-01T00:00:00Z' }), // saved with session 1
    exam(4, { classId: null, classIds: JSON.stringify([{ classId: 2 }, { classId: 1 }]), dateStart: '2026-01-15T00:00:00Z' }),
    exam(5, { classId: 2, dateStart: '2025-12-01T00:00:00Z' }), // another class
    exam(6, { dateStart: '2028-01-01T00:00:00Z' }), // after every session: the current one
  ];

  it('an exam saved with a session belongs to it; one without, to the session it was held in', () => {
    expect(sessionExams(exams, S1, 1, [S1, S2]).map((e) => e.id)).toEqual([1, 4, 3]);
    expect(sessionExams(exams, S2, 1, [S1, S2]).map((e) => e.id)).toEqual([2, 6]);
  });

  it('a class among several of an exam counts it; another class does not', () => {
    expect(sessionExams(exams, S1, 2, [S1, S2]).map((e) => e.id)).toEqual([5, 4]);
  });

  it('held outside every session: the current session', () => {
    expect(ownerSession(exams[5], [S1, S2]).id).toBe(2);
    expect(ownerSession(exams[5], [S1]).id).toBe(1);
  });

  it('no session at all: every exam of the class, oldest first', () => {
    expect(sessionExams(exams, null, 1).map((e) => e.id)).toEqual([1, 4, 2, 3, 6]);
  });
});

describe('the year of each student', () => {
  const gradeOf = (o, t) => { const p = t ? (o / t) * 100 : 0; return p >= 80 ? 'A' : p >= 60 ? 'B' : p >= 40 ? 'C' : 'F'; };
  const divisionOf = (p) => (p >= 60 ? 'First' : p >= 45 ? 'Second' : p >= 33 ? 'Third' : 'Fail');
  const st = (id, name, rollNo) => ({ id, name, rollNo, classId: 1, sectionId: 1, class: { name: 'Class 5' }, section: { name: 'A' } });
  const ali = st(1, 'Ali', '1'); const sana = st(2, 'Sana', '2'); const omar = st(3, 'Omar', '3');
  const m = (examId, student, subjectId, name, obtained, total = 50, isAbsent = false) => ({ examId, studentId: student.id, student, subjectId, subject: { name }, obtainedMarks: obtained, totalMarks: total, isAbsent });
  const exams = [{ id: 10 }, { id: 11 }];
  const marks = [
    m(10, ali, 1, 'English', 40), m(11, ali, 1, 'English', 45), m(10, ali, 2, 'Maths', 30), m(11, ali, 2, 'Maths', 35),
    m(10, sana, 1, 'English', 45), m(11, sana, 1, 'English', 40), m(10, sana, 2, 'Maths', 35), m(11, sana, 2, 'Maths', 30),
    m(10, omar, 1, 'English', 20), m(11, omar, 1, 'English', 0, 50, true), m(10, omar, 2, 'Maths', 45), m(11, omar, 2, 'Maths', 48),
    m(99, omar, 2, 'Maths', 50), // an exam of another session: left out
  ];
  const { rows, subjects } = annualRows({ exams, marks, gradeOf, divisionOf });
  const by = Object.fromEntries(rows.map((r) => [r.name, r]));

  it('each subject with its marks in each exam, and the year total', () => {
    expect(subjects.map((s) => s.name)).toEqual(['English', 'Maths']);
    const eng = by.Ali.subjects[0];
    expect(eng.exams[10]).toEqual({ obtained: 40, total: 50, isAbsent: false });
    expect([eng.obtained, eng.total, eng.percentage, eng.grade]).toEqual([85, 100, 85, 'A']);
    expect([by.Ali.totalObtained, by.Ali.totalMarks, by.Ali.percentage]).toEqual([150, 200, 75]);
    expect(by.Ali.exams[11]).toEqual({ obtained: 80, total: 100 });
  });

  it('a missed paper counts its marks, none obtained, and is shown as absent', () => {
    expect(by.Omar.subjects[0].exams[11]).toEqual({ obtained: null, total: 50, isAbsent: true });
    expect([by.Omar.subjects[0].obtained, by.Omar.subjects[0].total, by.Omar.subjects[0].grade]).toEqual([20, 100, 'F']);
  });

  it('a subject failed fails the year, whatever the total', () => {
    expect(by.Omar.percentage).toBe(56.5);
    expect(by.Omar.passed).toBe(false);
    expect(by.Omar.failedSubjects).toEqual(['English']);
    expect(by.Ali.passed).toBe(true);
    expect(by.Ali.division).toBe('First');
  });

  it('position in the class: equal percentages share one, the next skips', () => {
    expect([by.Ali.position, by.Sana.position, by.Omar.position]).toEqual([1, 1, 3]);
    expect(by.Ali.classSize).toBe(3);
  });
});

describe('on the printed card', () => {
  it('the grading scale from the school\'s grades', () => {
    expect(gradeScale(gradesFromSettings({ gradeAPlus: 90, gradeA: 80, gradeB: 65, gradeC: 50, gradeD: 40 }))).toEqual([
      { grade: 'A+', from: 90, to: 100 }, { grade: 'A', from: 80, to: 89 }, { grade: 'B', from: 65, to: 79 },
      { grade: 'C', from: 50, to: 64 }, { grade: 'D', from: 40, to: 49 }, { grade: 'F', from: 0, to: 39 },
    ]);
    expect(gradesFromSettings(null)[0]).toEqual({ grade: 'A+', minPercent: 90 });
  });

  it('prints in a colour dark enough for paper; navy when the school chose none', () => {
    expect(docColor()).toBe(NAVY);
    expect(docColor('#0D9488')).toBe(NAVY); // the app's own teal is not a choice
    expect(docColor('#7C2D12').toLowerCase()).toBe('#7c2d12'); // already dark: as chosen
    const light = docColor('#F59E0B'); // amber: deepened
    expect(light).not.toBe('#f59e0b');
    expect(parseInt(light.slice(1, 3), 16)).toBeLessThan(0xF5);
  });
});
