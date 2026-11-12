/**
 * The fee year month by month (frontend/src/utils/feeYear.js), as the fee
 * calendar on Collect Fee and the Fee Register show it: which month a bill
 * belongs to, paid and on which Pakistan day, part paid, unpaid (late or
 * not yet), not billed, earlier dues, and which session or year to open on.
 * The frontend has no test runner of its own, so it is tested here.
 */
import { describe, it, expect } from 'vitest';
import { monthRange, billMonth, feeYear, periodOptions, lookOf } from '../../../frontend/src/utils/feeYear.js';

const RS = 100; // paisa
const bill = (o) => ({ id: Math.random(), feeTitle: 'Monthly Fee', totalAmount: 2500 * RS, discount: 0, lateFee: 0, paidAmount: 0, dueAmount: 2500 * RS, payments: [], createdAt: '2026-01-01T05:00:00.000Z', ...o });
const paid = (o, day) => bill({ paidAmount: 2500 * RS, dueAmount: 0, status: 'paid', payments: [{ id: 1, amountPaid: 2500 * RS, paymentDate: day, receiptNo: 'R-1', method: 'cash' }], ...o });
const YEAR = monthRange('2026-01', '2026-12');
const TODAY = '2026-11-13';

describe('months', () => {
  it('runs from one month to another, across a new year', () => {
    expect(monthRange('2026-04', '2027-03')).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
    expect(monthRange('2026-05', '2026-05')).toEqual(['2026-05']);
    expect(monthRange('2020-01', '2030-12')).toHaveLength(24);
  });

  it('a bill belongs to its month however the month was written', () => {
    expect(billMonth({ month: '7', year: 2026 })).toBe('2026-07');
    expect(billMonth({ month: 'July', year: 2026 })).toBe('2026-07');
    expect(billMonth({ month: 'Jul', year: 2026 })).toBe('2026-07');
    expect(billMonth({ month: '12', year: 2025 })).toBe('2025-12');
  });

  it('a bill with no month (an admission fee) belongs to the Pakistan month it was made', () => {
    // 30 Sep 2026, 20:00 UTC is already 1 October in Pakistan.
    expect(billMonth({ month: null, year: 2026, createdAt: '2026-09-30T20:00:00.000Z' })).toBe('2026-10');
    expect(billMonth({ month: '', year: null, createdAt: '2026-03-15T08:00:00.000Z' })).toBe('2026-03');
  });
});

describe('a student\'s year', () => {
  it('a paid month shows the Pakistan day it was collected and the receipt', () => {
    // 4 Jan 2026, 21:00 UTC is 5 January in Pakistan.
    const { cells } = feeYear([paid({ month: '1', year: 2026 }, '2026-01-04T21:00:00.000Z')], YEAR, { today: TODAY });
    expect(cells[0]).toMatchObject({ state: 'paid', paid: 250000, due: 0, lastPaidOn: '2026-01-05' });
    expect(cells[0].payments[0]).toMatchObject({ receiptNo: 'R-1', day: '2026-01-05' });
  });

  it('part paid, unpaid and late, due but not late, not billed, upcoming', () => {
    const { cells, totals } = feeYear([
      bill({ month: '8', year: 2026, paidAmount: 100000, dueAmount: 150000, payments: [{ id: 2, amountPaid: 100000, paymentDate: '2026-08-10T05:00:00.000Z' }] }),
      bill({ month: '9', year: 2026 }),
      bill({ month: '11', year: 2026, dueDate: '2026-11-20T00:00:00.000Z' }),
    ], YEAR, { today: TODAY });
    const at = (m) => cells.find((c) => c.month === m);
    expect(at('2026-08')).toMatchObject({ state: 'partial', due: 150000, late: true });
    expect(at('2026-09')).toMatchObject({ state: 'unpaid', late: true });
    expect(lookOf(at('2026-09')).label).toBe('Unpaid');
    expect(at('2026-10').state).toBe('none');
    expect(at('2026-11')).toMatchObject({ state: 'unpaid', late: false, current: true });
    expect(lookOf(at('2026-11')).label).toBe('Due');
    expect(at('2026-12').state).toBe('upcoming');
    expect(totals).toMatchObject({ pendingMonths: 3, lateMonths: 2, due: 150000 + 250000 + 250000, pendingList: ['2026-08', '2026-09', '2026-11'] });
  });

  it('a due date that has passed makes this month late', () => {
    const { cells } = feeYear([bill({ month: '11', year: 2026, dueDate: '2026-11-10T00:00:00.000Z' })], YEAR, { today: TODAY });
    expect(cells[10]).toMatchObject({ state: 'unpaid', late: true });
  });

  it('months before admission are not "not billed"', () => {
    const { cells } = feeYear([], YEAR, { today: TODAY, admissionDate: '2026-04-15T00:00:00.000Z' });
    expect(cells.slice(0, 3).every((c) => c.state === 'before')).toBe(true);
    expect(cells[3].state).toBe('none');
  });

  it('two bills in one month add up, and the month is pending while either is owed', () => {
    const { cells } = feeYear([
      paid({ month: '9', year: 2026 }, '2026-09-06T05:00:00.000Z'),
      bill({ month: 'Sep', year: 2026, feeTitle: 'Transport Fee Of Sep', totalAmount: 100000, dueAmount: 100000 }),
    ], YEAR, { today: TODAY });
    expect(cells[8]).toMatchObject({ state: 'partial', billed: 350000, paid: 250000, due: 100000 });
    expect(cells[8].bills).toHaveLength(2);
  });

  it('a voided payment is not a collection', () => {
    const b = bill({ month: '3', year: 2026, payments: [{ id: 9, amountPaid: 250000, paymentDate: '2026-03-05T05:00:00.000Z', voidedAt: '2026-03-06T05:00:00.000Z' }] });
    const { cells } = feeYear([b], YEAR, { today: TODAY });
    expect(cells[2]).toMatchObject({ state: 'unpaid', payments: [], lastPaidOn: null });
  });

  it('dues from before the year are earlier dues, and count in the balance', () => {
    const { totals } = feeYear([
      bill({ month: '12', year: 2025 }),
      paid({ month: '11', year: 2025 }, '2025-11-05T05:00:00.000Z'),
      bill({ month: '10', year: 2026 }),
    ], YEAR, { today: TODAY });
    expect(totals).toMatchObject({ earlierDue: 250000, due: 250000, balance: 500000, pendingMonths: 1 });
    expect(totals.earlierBills).toHaveLength(1);
  });

  it('a fully waived month is cleared, not owing', () => {
    const { cells, totals } = feeYear([bill({ month: '2', year: 2026, discount: 250000, dueAmount: 0 })], YEAR, { today: TODAY });
    expect(cells[1].state).toBe('paid');
    expect(totals.pendingMonths).toBe(0);
  });
});

describe('which year to open on', () => {
  const sessions = [
    { id: 2, name: '2026-2027', startDate: '2026-04-01T00:00:00.000Z', endDate: '2027-03-31T00:00:00.000Z', isActive: false },
    { id: 1, name: '2025-2026', startDate: '2025-04-01T00:00:00.000Z', endDate: '2026-03-31T00:00:00.000Z', isActive: true },
  ];

  it('the session today falls in, even when an older one is still marked active', () => {
    const { options, defaultId } = periodOptions(sessions, TODAY);
    expect(defaultId).toBe('s2');
    expect(options.find((o) => o.id === 's2')).toMatchObject({ from: '2026-04', to: '2027-03', label: '2026-2027 session (Apr 2026 – Mar 2027)' });
  });

  it('this calendar year when no session covers today', () => {
    const { options, defaultId } = periodOptions([sessions[1]], TODAY);
    expect(defaultId).toBe('y2026');
    expect(options.map((o) => o.id)).toEqual(['s1', 'y2027', 'y2026', 'y2025', 'y2024']);
  });

  it('works with no sessions at all', () => {
    expect(periodOptions([], TODAY).defaultId).toBe('y2026');
    expect(periodOptions(undefined, TODAY).defaultId).toBe('y2026');
  });
});
