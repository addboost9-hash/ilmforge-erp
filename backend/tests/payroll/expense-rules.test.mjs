/**
 * Expenses entered with their real dates, by a school that has just joined.
 * Amounts arrive in paisa and must be whole; a day is a Pakistan day even on
 * a server running on UTC; and "Salaries" typed in any case is one category,
 * or the year's salary bill is split across several.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/services/salaryPayment.service.js';

const { amountPaisa, wholeNumber, pkDayRange, pkDayKey, pkToday, categoryName, findExpenseCategory, expenseCategory } = mod;

describe('expense amounts (paisa)', () => {
  it('accepts a whole number of paisa, as a number or digits', () => {
    expect(amountPaisa(500000)).toEqual({ value: 500000 });
    expect(amountPaisa('500000')).toEqual({ value: 500000 });
  });

  it('refuses 0, negative, fractional and blank amounts', () => {
    expect(amountPaisa(0).error).toMatch(/more than 0/);
    expect(amountPaisa(-500).error).toMatch(/more than 0/);
    expect(amountPaisa(5000.5).error).toMatch(/whole number/);
    expect(amountPaisa('5000.50').error).toMatch(/whole number/);
    expect(amountPaisa('').error).toBeTruthy();
    expect(amountPaisa(undefined).error).toBeTruthy();
    expect(amountPaisa(true).error).toBeTruthy();
  });

  it('refuses more than one row can hold', () => {
    expect(amountPaisa(2147483648).error).toMatch(/too large/);
  });

  it('reads only plain whole numbers', () => {
    expect(wholeNumber(' 42 ')).toBe(42);
    expect(wholeNumber('4e2')).toBeNull();
    expect(wholeNumber('')).toBeNull();
    expect(wholeNumber(null)).toBeNull();
  });
});

describe('Pakistan days', () => {
  // 8 Oct 2026, 01:30 in Pakistan = 7 Oct 2026, 20:30 UTC
  const lateNight = new Date(Date.UTC(2026, 9, 7, 20, 30));

  it("knows Pakistan's date while the UTC server is still on yesterday", () => {
    expect(pkDayKey(lateNight)).toBe('2026-10-08');
    expect(pkToday(lateNight)).toEqual({ year: 2026, month: 10, day: 8 });
  });

  it('turns from/to into a range that includes both days, in Pakistan time', () => {
    const { filter } = pkDayRange('2026-07-01', '2026-07-31');
    expect(filter.gte.toISOString()).toBe('2026-06-30T19:00:00.000Z');
    expect(filter.lt.toISOString()).toBe('2026-07-31T19:00:00.000Z');
  });

  it('puts an expense entered at 1:30 a.m. on its Pakistan day', () => {
    const { filter } = pkDayRange('2026-10-08', '2026-10-08');
    expect(lateNight >= filter.gte && lateNight < filter.lt).toBe(true);
    const yesterday = pkDayRange('2026-10-07', '2026-10-07').filter;
    expect(lateNight < yesterday.lt).toBe(false);
  });

  it('accepts DD/MM/YYYY, and one end on its own', () => {
    expect(pkDayRange('14/03/2026', '').filter).toEqual({ gte: new Date('2026-03-13T19:00:00.000Z') });
    expect(pkDayRange(undefined, '2026-03-14').filter).toEqual({ lt: new Date('2026-03-14T19:00:00.000Z') });
    expect(pkDayRange().filter).toEqual({});
  });

  it('explains dates that are wrong', () => {
    expect(pkDayRange('2026-02-30', '').error).toMatch(/From/);
    expect(pkDayRange('', 'July').error).toMatch(/To/);
    expect(pkDayRange('2026-07-31', '2026-07-01').error).toMatch(/on or before/);
  });
});

/* SQLite compares names exactly, so a database that behaves that way is
   faked here: findFirst matches exact names only. */
function fakeDb(names) {
  const rows = names.map((name, i) => ({ id: i + 1, schoolId: 1, name }));
  return {
    rows,
    expenseCategory: {
      findFirst: async ({ where }) => rows.find((r) => r.schoolId === where.schoolId && r.name === where.name.equals) || null,
      findMany: async ({ where }) => rows.filter((r) => r.schoolId === where.schoolId),
      create: async ({ data }) => {
        const row = { id: rows.length + 1, ...data };
        rows.push(row);
        return { id: row.id, name: row.name };
      },
    },
  };
}

describe('expense categories', () => {
  it('tidies a typed name', () => {
    expect(categoryName('  repair   work ')).toBe('repair work');
    expect(categoryName(null)).toBe('');
  });

  it('finds the existing category whatever the case or spacing', async () => {
    const db = fakeDb(['Utilities', 'Salaries ']);
    expect(await findExpenseCategory(db, 1, 'utilities')).toEqual({ id: 1, schoolId: 1, name: 'Utilities' });
    expect((await findExpenseCategory(db, 1, ' SALARIES')).id).toBe(2);
    expect(await findExpenseCategory(db, 1, 'Rent')).toBeNull();
    expect(await findExpenseCategory(db, 2, 'Utilities')).toBeNull();
  });

  it('adds a category only the first time a name is used', async () => {
    const db = fakeDb(['Salaries']);
    expect((await expenseCategory(db, 1, 'salaries')).id).toBe(1);
    const rent = await expenseCategory(db, 1, '  Rent ');
    expect(rent).toEqual({ id: 2, name: 'Rent' });
    expect((await expenseCategory(db, 1, 'RENT')).id).toBe(2);
    expect(db.rows).toHaveLength(2);
    expect(await expenseCategory(db, 1, '   ')).toBeNull();
  });
});
