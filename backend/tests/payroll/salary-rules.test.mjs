/**
 * Salaries entered for past months by a school that has just joined. A
 * mistake here is quiet but costly: a teacher billed for a month before she
 * joined, a slip whose net does not match its parts, or one click on Pay
 * recording the salary twice under Expenses.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import mod from '../../src/services/salaryPayment.service.js';

const { salaryPeriod, joinedBy, netSalary, salaryEdit, generateMessage, markSalaryPaid } = mod;

// 8 Oct 2026, 01:30 in Pakistan = 7 Oct 2026, 20:30 UTC (server still on the 7th)
const lateNight = new Date(Date.UTC(2026, 9, 7, 20, 30));

describe('the month a salary is for', () => {
  it('accepts months 1-12 sent as numbers or digits', () => {
    expect(salaryPeriod(7, 2026, lateNight)).toEqual({ month: 7, year: 2026 });
    expect(salaryPeriod('12', '2025', lateNight)).toEqual({ month: 12, year: 2025 });
  });

  it('refuses months that do not exist', () => {
    for (const m of [0, 13, '', undefined, null, 'July', 7.5, '7.5', true]) {
      expect(salaryPeriod(m, 2026, lateNight).error).toMatch(/1 to 12/);
    }
  });

  it('allows years from 2000 to next year, by Pakistan time', () => {
    expect(salaryPeriod(1, 2000, lateNight).year).toBe(2000);
    expect(salaryPeriod(1, 2027, lateNight).year).toBe(2027);
    expect(salaryPeriod(1, 1999, lateNight).error).toMatch(/2000 and 2027/);
    expect(salaryPeriod(1, 2028, lateNight).error).toMatch(/2000 and 2027/);
    expect(salaryPeriod(1, 'abc', lateNight).error).toBeTruthy();
    expect(salaryPeriod(1, NaN, lateNight).error).toBeTruthy();
  });
});

describe('only staff who had joined by the end of the month are paid for it', () => {
  it('has no joining date on file: assume they were there', () => {
    expect(joinedBy(null, 7, 2026)).toBe(true);
    expect(joinedBy(undefined, 7, 2026)).toBe(true);
  });

  it('includes someone who joined during the month, up to its last day', () => {
    expect(joinedBy(new Date('2026-07-15'), 7, 2026)).toBe(true);
    expect(joinedBy(new Date('2026-07-31'), 7, 2026)).toBe(true);
    // 31 July, 11:30 p.m. in Pakistan
    expect(joinedBy(new Date(Date.UTC(2026, 6, 31, 18, 30)), 7, 2026)).toBe(true);
  });

  it('leaves out someone who joined after the month', () => {
    expect(joinedBy(new Date('2026-08-01'), 7, 2026)).toBe(false);
    // Midnight on 1 August in Pakistan is still 31 July in UTC
    expect(joinedBy(new Date(Date.UTC(2026, 6, 31, 19, 0)), 7, 2026)).toBe(false);
    expect(joinedBy(new Date('2027-03-01'), 7, 2026)).toBe(false);
  });

  it('rolls December over into the next year', () => {
    expect(joinedBy(new Date('2026-12-31'), 12, 2026)).toBe(true);
    expect(joinedBy(new Date('2027-01-01'), 12, 2026)).toBe(false);
  });
});

describe('net salary', () => {
  it('is earnings minus deductions', () => {
    expect(netSalary({
      basic: 3000000, allowances: 500000, bonus: 200000,
      deductionsAbsent: 100000, deductionsLate: 50000, loanDeduction: 250000,
    })).toBe(3300000);
  });

  it('is never negative', () => {
    expect(netSalary({ basic: 2000000, deductionsAbsent: 2000000, loanDeduction: 500000 })).toBe(0);
  });

  it('treats missing parts as 0', () => {
    expect(netSalary({ basic: 2500000 })).toBe(2500000);
    expect(netSalary()).toBe(0);
  });
});

describe('editing an unpaid salary', () => {
  const rec = { basic: 3000000, allowances: 0, bonus: 0, deductionsAbsent: 0, deductionsLate: 0, loanDeduction: 0, netSalary: 3000000 };

  it('keeps the parts not sent and works the net out again', () => {
    const { data } = salaryEdit(rec, { bonus: 500000, loanDeduction: '200000' });
    expect(data).toEqual({ ...rec, bonus: 500000, loanDeduction: 200000, netSalary: 3300000 });
  });

  it('ignores a net sent by the caller', () => {
    expect(salaryEdit(rec, { netSalary: 1 }).data.netSalary).toBe(3000000);
  });

  it('refuses negative, fractional and non-number amounts', () => {
    expect(salaryEdit(rec, { bonus: -100 }).error).toMatch(/Bonus/);
    expect(salaryEdit(rec, { basic: 2500000.5 }).error).toMatch(/Basic salary/);
    expect(salaryEdit(rec, { allowances: '12.5' }).error).toMatch(/Allowances/);
    expect(salaryEdit(rec, { deductionsLate: 'abc' }).error).toMatch(/Late deduction/);
    expect(salaryEdit(rec, { deductionsAbsent: null }).error).toMatch(/Absence deduction/);
  });

  it('pays nothing rather than a negative salary', () => {
    expect(salaryEdit(rec, { deductionsAbsent: 3000000, loanDeduction: 100000 }).data.netSalary).toBe(0);
  });
});

describe('what Generate reports', () => {
  const rec = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

  it('counts what was made', () => {
    expect(generateMessage({ records: rec(1), alreadyGenerated: 0, notJoinedYet: [] }, 7, 2026))
      .toBe('1 salary generated for July 2026.');
  });

  it('says how many were skipped and why, naming late joiners', () => {
    const msg = generateMessage({
      records: rec(2),
      alreadyGenerated: 1,
      notJoinedYet: [{ name: 'Ali Raza' }],
    }, 7, 2026);
    expect(msg).toBe('2 salaries generated for July 2026. Skipped 2: 1 already generated, 1 joined after July 2026 (Ali Raza).');
  });

  it('names at most three people', () => {
    const notJoinedYet = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ name }));
    expect(generateMessage({ records: [], alreadyGenerated: 0, notJoinedYet }, 3, 2025))
      .toMatch(/5 joined after March 2025 \(A, B, C and 2 more\)/);
  });
});

/* Paying once. The real guard is the database's own conditional update;
   this fake applies the same rule (only a row not yet 'issued' changes), so
   it checks what markSalaryPaid does with the answer. */
describe('a salary is recorded under Expenses once', () => {
  const require = createRequire(import.meta.url);
  const prisma = require('../../src/config/prisma.js');
  const original = prisma.$transaction;
  afterEach(() => { prisma.$transaction = original; });

  function fakeDb(record) {
    const expenses = [];
    const categories = [];
    const tx = {
      salaryRecord: {
        updateMany: async ({ where, data }) => {
          const hit = where.id === record.id && where.schoolId === record.schoolId && record.status !== where.status.not;
          if (hit) Object.assign(record, data);
          return { count: hit ? 1 : 0 };
        },
        findFirst: async ({ where }) => (where.id === record.id && where.schoolId === record.schoolId
          ? { ...record, staff: { name: 'Ayesha Khan' } } : null),
      },
      expenseCategory: {
        findFirst: async ({ where }) => categories.find((c) => c.name === (where.name.equals ?? where.name)) || null,
        findMany: async () => categories,
        create: async ({ data }) => { const c = { id: categories.length + 1, ...data }; categories.push(c); return c; },
      },
      expense: { create: async ({ data }) => { expenses.push(data); return { id: expenses.length, ...data }; } },
    };
    prisma.$transaction = async (fn) => fn(tx);
    return { expenses, categories };
  }

  it('two clicks together: one payment, one expense, on the day paid', async () => {
    const record = { id: 900000005, schoolId: 900001, status: 'pending', month: 7, year: 2026, netSalary: 3000000 };
    const { expenses } = fakeDb(record);
    const paidOn = new Date(Date.UTC(2026, 7, 3, 7));

    const [a, b] = await Promise.all([
      markSalaryPaid({ schoolId: 900001, recordId: 900000005, paidOn, userId: 9 }),
      markSalaryPaid({ schoolId: 900001, recordId: 900000005, paidOn, userId: 9 }),
    ]);

    expect([a.alreadyPaid, b.alreadyPaid].filter(Boolean)).toHaveLength(1);
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({ amount: 3000000, date: paidOn, schoolId: 900001 });
    expect(expenses[0].description).toBe('Salary — Ayesha Khan — Jul 2026');
    expect(record).toMatchObject({ status: 'issued', issueDate: paidOn, issuedBy: 9 });
  });

  it('another school cannot pay this record', async () => {
    fakeDb({ id: 900000005, schoolId: 900001, status: 'pending', month: 7, year: 2026, netSalary: 100 });
    await expect(markSalaryPaid({ schoolId: 900002, recordId: 900000005 })).rejects.toMatchObject({ status: 404 });
  });

  it('a salary of 0 is marked paid with no expense', async () => {
    const record = { id: 900000006, schoolId: 900001, status: 'pending', month: 7, year: 2026, netSalary: 0 };
    const { expenses } = fakeDb(record);
    const out = await markSalaryPaid({ schoolId: 900001, recordId: 900000006 });
    expect(out.expense).toBeNull();
    expect(expenses).toHaveLength(0);
    expect(record.status).toBe('issued');
  });
});
