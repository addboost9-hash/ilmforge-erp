/**
 * The register's percentage of school days (not only the days a student was
 * marked), the school's weekly off days, and the gate pass helpers.
 */
import { describe, it, expect } from 'vitest';
import W from '../../src/utils/weeklyOff.js';
import GP from '../../src/routes/gatepass.routes.js';
import { countMonth, joinedFrom, registerCounter } from '../../../frontend/src/utils/attendanceRegisterPrint.js';

const P = (status = 'present') => ({ status });

describe('the register percentage', () => {
  it('counts a day the class was marked but the student was not', () => {
    // The class was marked on the 4th, 6th and 28th; this student only on the 28th.
    const c = countMonth({ 28: P() }, { schoolDays: new Set([4, 6, 28]), from: 1 });
    expect(c).toMatchObject({ present: 1, days: 3, notMarked: 2, pct: 33 });
    expect([...c.missing]).toEqual([4, 6]);
  });

  it('counts from the day the student joined', () => {
    expect(countMonth({ 28: P() }, { schoolDays: new Set([4, 6, 28]), from: 20 })).toMatchObject({ days: 1, notMarked: 0, pct: 100 });
    // A mark before the joining date on record still counts.
    expect(countMonth({ 4: P(), 28: P() }, { schoolDays: new Set([4, 6, 28]), from: 20 })).toMatchObject({ days: 2, pct: 100 });
    expect(countMonth({}, { schoolDays: new Set([4, 6]), from: 32 })).toMatchObject({ days: 0, pct: null });
  });

  it('late counts as present; absent and leave do not', () => {
    expect(countMonth({ 1: P('late'), 2: P('absent'), 3: P('leave'), 4: P() }, { schoolDays: new Set([1, 2, 3, 4]) })).toMatchObject({ pct: 50, days: 4 });
  });

  it('without school days, as before (the student\'s own marks)', () => {
    expect(countMonth({ 1: P(), 2: P('absent') })).toMatchObject({ days: 2, pct: 50, notMarked: 0 });
  });

  it('reads the joining day from the admission date (Pakistan time)', () => {
    expect(joinedFrom('2026-11-19T20:00:00.000Z', '2026-11')).toBe(20); // 01:00 on the 20th in Pakistan
    expect(joinedFrom('2026-10-02T00:00:00.000Z', '2026-11')).toBe(1);
    expect(joinedFrom('2026-12-02T00:00:00.000Z', '2026-11')).toBe(32);
    expect(joinedFrom(null, '2026-11')).toBe(1);
  });

  it('gives each section its own school days, up to today', () => {
    const data = {
      month: '2026-11', today: '2026-11-28',
      students: [{ id: 1, sectionId: 10 }, { id: 2, sectionId: 10 }, { id: 3, sectionId: 11 }],
      marks: { 1: { 4: P(), 6: P(), 28: P() }, 2: { 28: P() }, 3: { 5: P() } },
    };
    const countOf = registerCounter(data);
    expect(countOf(data.students[0])).toMatchObject({ days: 3, pct: 100 });
    expect(countOf(data.students[1])).toMatchObject({ days: 3, pct: 33, notMarked: 2 });
    // Section 11 was marked on the 5th only: the other section's days do not count.
    expect(countOf(data.students[2])).toMatchObject({ days: 1, pct: 100 });
  });
});

describe('weekly off days', () => {
  it('keeps one to three days, Sunday by default', () => {
    expect(W.cleanWeeklyOff([6, 0])).toEqual([0, 6]);
    expect(W.cleanWeeklyOff(['5'])).toEqual([5]);
    expect(W.cleanWeeklyOff([])).toBeNull();
    expect(W.cleanWeeklyOff([0, 1, 2, 3])).toBeNull();
    expect(W.cleanWeeklyOff([9])).toBeNull();
    expect(W.weeklyOffOf({})).toEqual([0]);
    expect(W.weeklyOffOf({ weeklyOff: [0, 6] })).toEqual([0, 6]);
    expect(W.schoolDaysOf([0, 6])).toEqual([1, 2, 3, 4, 5]);
    expect(W.offWords([0, 6])).toBe('Sunday and Saturday');
  });
});

describe('gate pass details', () => {
  it('cleans phones and CNICs', () => {
    expect(GP.cleanPhone('0300 1234567')).toBe('03001234567');
    expect(GP.cleanPhone('+92 300 1234567')).toBe('03001234567');
    expect(GP.cleanPhone('12345')).toBe('');
    expect(GP.cleanCnic('3520212345671')).toBe('35202-1234567-1');
    expect(GP.cleanCnic('35202-1234567-1')).toBe('35202-1234567-1');
    expect(GP.cleanCnic('35202-123')).toBe('');
  });

  it('knows the same person however Muhammad is spelt', () => {
    expect(GP.sameName('Muhammad Ali', 'mohammad  ali')).toBe(true);
    expect(GP.sameName('M. Ali', 'Muhammad Ali')).toBe(true); // "M." is how Muhammad is often shortened
    expect(GP.sameName('Ahmed Ali', 'Muhammad Ali')).toBe(false);
    expect(GP.sameName('علی رضا', 'علی رضا')).toBe(true);
    expect(GP.sameName('', '')).toBe(false);
  });
});
