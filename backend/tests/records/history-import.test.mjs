/**
 * A school's old records typed in Excel the way Pakistani offices write
 * them: months as 07/2025 or "Jul 2025", rupees as "3,500/-", names spelt
 * slightly differently from the register, and every day filed on the day it
 * really happened in Pakistan.
 */
import { describe, it, expect } from 'vitest';
import history from '../../src/services/history.service.js';
import feeMonth from '../../src/utils/feeMonth.js';

const { parseMonthYear, parseRupees, compareNames, pickMethod, settle, dayFrom, defaultDay } = history;
const { monthNumber, monthKeys, monthLabel, feeKind, byPeriodDesc } = feeMonth;

// 8 Oct 2026, 01:30 in Pakistan = 7 Oct 2026, 20:30 UTC
const lateNight = new Date(Date.UTC(2026, 9, 7, 20, 30));

describe('fee months', () => {
  it('reads every way a month is written', () => {
    for (const v of ['07/2025', '7/2025', '7-2025', '2025-07', 'Jul 2025', 'July 2025', 'July-25', 'July, 2025', '2025 July', '01/07/2025']) {
      expect(parseMonthYear(v), v).toEqual({ month: 7, year: 2025 });
    }
    expect(parseMonthYear(new Date(Date.UTC(2025, 6, 1)))).toEqual({ month: 7, year: 2025 });
    expect(parseMonthYear(45839)).toEqual({ month: 7, year: 2025 }); // Excel serial for 1 Jul 2025
  });

  it('explains what it cannot read', () => {
    expect(parseMonthYear('13/2025').error).toMatch(/MM\/YYYY/);
    expect(parseMonthYear('Juxt 2025').error).toMatch(/not a month/);
    expect(parseMonthYear('07/1999').error).toMatch(/2000 onwards/);
    expect(parseMonthYear('')).toEqual({ empty: true });
  });

  it('matches both stored spellings of a month', () => {
    expect(monthNumber('7')).toBe(7);
    expect(monthNumber('July')).toBe(7);
    expect(monthNumber('Sept')).toBe(9);
    expect(monthNumber('Ju')).toBe(null);
    expect(monthKeys(7)).toEqual(expect.arrayContaining(['7', '07', 'July', 'Jul']));
    expect(monthLabel('10')).toBe('October');
    expect(monthLabel('bogus')).toBe('bogus');
  });

  it('sorts newest month first, not in text order', () => {
    const list = [{ year: 2025, month: '9' }, { year: 2025, month: '12' }, { year: 2026, month: 'January' }, { year: 2025, month: 'October' }];
    expect(list.sort(byPeriodDesc).map((x) => x.month)).toEqual(['January', '12', 'October', '9']);
  });

  it('treats every monthly-fee title as one kind of bill', () => {
    expect(feeKind('Monthly Fee Of Jul')).toBe('monthly');
    expect(feeKind('Tuition Fee')).toBe('monthly');
    expect(feeKind('')).toBe('monthly');
    expect(feeKind('Admission Fee')).toBe('admissionfee');
    expect(feeKind('Previous Balance (Arrears)')).not.toBe('monthly');
  });

  it('ignores the month and year in a title: the same kind of bill', () => {
    expect(feeKind('Transport Fee Of July')).toBe(feeKind('Transport Fee'));
    expect(feeKind('Transport Fee Of Jul 2026')).toBe('transportfee');
    expect(feeKind('Exam Fee 2025')).toBe(feeKind('Exam Fee'));
    expect(feeKind('Monthly Fee Of Jul')).toBe('monthly');
  });
});

describe('rupees', () => {
  it('reads amounts as offices write them', () => {
    for (const [v, want] of [['3500', 3500], ['3,500', 3500], ['Rs 3,500', 3500], ['Rs. 3,500', 3500], ['3,500/-', 3500], ['PKR 1200.50', 1200.5], [3500.555, 3500.56]]) {
      expect(parseRupees(v).value, String(v)).toBe(want);
    }
    expect(parseRupees(null).value).toBe(null);
  });

  it('refuses what is not an amount, and what cannot be stored', () => {
    expect(parseRupees('-5').error).toBeTruthy();
    expect(parseRupees('abc').error).toBeTruthy();
    expect(parseRupees(25000000).error).toMatch(/2 crore/);
  });
});

describe('names', () => {
  it('accepts spelling differences and a missing surname', () => {
    expect(compareNames('Ayesha Khan', 'ayesha  khan')).toBe('same');
    expect(compareNames('Fatima', 'Fatimah')).toBe('similar');
    expect(compareNames('Ayesha Khan', 'Aisha Khan')).toBe('similar');
    expect(compareNames('Hamza', 'Hamza Ahmed')).toBe('similar');
    expect(compareNames('M. Ali', 'Muhammad Ali')).toBe('similar');
  });

  it('catches a different person (a wrong roll number)', () => {
    expect(compareNames('Ali Raza', 'Ali Hassan')).toBe('different');
    expect(compareNames('Muhammad Bilal', 'Muhammad Usman')).toBe('different');
    expect(compareNames('Ayesha Khan', 'Imran Khan')).toBe('different');
  });
});

describe('payment methods', () => {
  it('maps the words people use', () => {
    expect(pickMethod('')).toBe('cash');
    expect(pickMethod('Bank transfer')).toBe('bank');
    expect(pickMethod('EasyPaisa')).toBe('online');
    expect(pickMethod('Cheque')).toBe('cheque');
  });
});

describe('an invoice settled from its payments', () => {
  it('matches how Fee Collection recomputes it', () => {
    expect(settle(350000, 0, 350000, 0)).toEqual({ due: 0, status: 'paid' });
    expect(settle(350000, 20000, 100000, 50000)).toEqual({ due: 220000, status: 'partial' });
    expect(settle(350000, 0, 0, 0)).toEqual({ due: 350000, status: 'unpaid' });
  });
});

describe('days', () => {
  it('files a past day at midday in Pakistan', () => {
    expect(dayFrom(2025, 3, 14, lateNight).at.toISOString()).toBe('2025-03-14T07:00:00.000Z');
  });

  it("uses Pakistan's today even while the UTC server is still on yesterday", () => {
    const today = dayFrom(2026, 10, 8, lateNight);
    expect(today.at).toBe(lateNight);
    expect(dayFrom(2026, 10, 9, lateNight).error).toMatch(/future/);
  });

  it('defaults to a day of the month, never one still ahead', () => {
    expect(defaultDay(2025, 2, 31, lateNight).iso).toBe('2025-02-28');
    expect(defaultDay(2026, 10, 10, lateNight).iso).toBe('2026-10-08');
  });
});
