/**
 * Fee records from the past: bills for old months, payments keyed in days
 * or months after the money was received, history imported from old books.
 * The helpers here decide which Pakistan day or month a payment falls in,
 * whether a month is already billed, how reminders add up a family's dues,
 * and whose cash a payment is in the daily balance sheet.
 */
import { describe, it, expect } from 'vitest';
import feeRoutes from '../../src/routes/fee.routes.js';
import reportRoutes from '../../src/routes/report.routes.js';
import scheduler from '../../src/services/scheduler.service.js';
import pastDateMod from '../../src/utils/pastDate.js';

const { pktDayStart, pktDayEnd, pktMonth, pktDay, pktRange, payBy, billedFor } = feeRoutes.helpers;
const { dayStart, dayEnd, settledUpTo } = reportRoutes.helpers;
const { duesByStudent, rupees } = scheduler;
const { pastDate } = pastDateMod;

// 8 Oct 2026, 01:30 in Pakistan = 7 Oct 2026, 20:30 UTC (a UTC server is still on the 7th)
const lateNight = new Date(Date.UTC(2026, 9, 7, 20, 30));

describe('Pakistan days and months', () => {
  it('a day runs from midnight to midnight Pakistan time', () => {
    expect(pktDayStart('2026-10-08').toISOString()).toBe('2026-10-07T19:00:00.000Z');
    expect(pktDayEnd('2026-10-08').toISOString()).toBe('2026-10-08T18:59:59.999Z');
    // the report routes use the same window
    expect(dayStart('2026-10-08').getTime()).toBe(pktDayStart('2026-10-08').getTime());
    expect(dayEnd('2026-10-08').getTime()).toBe(pktDayEnd('2026-10-08').getTime());
  });

  it('a fee month is the whole month in Pakistan, December included', () => {
    const july = pktMonth(7, 2026);
    expect(july.gte.toISOString()).toBe('2026-06-30T19:00:00.000Z');
    expect(july.lt.toISOString()).toBe('2026-07-31T19:00:00.000Z');
    expect(pktMonth(12, 2026).lt.toISOString()).toBe('2026-12-31T19:00:00.000Z');
  });

  it('names the Pakistan day an instant falls on', () => {
    expect(pktDay(lateNight)).toBe('2026-10-08');
    expect(pktDay(new Date('2026-10-08T19:00:00.000Z'))).toBe('2026-10-09');
  });

  it('a backdated payment lands on the day it was dated, in day and month reports', () => {
    const { date } = pastDate('02/10/2026', { now: lateNight });
    const day = pktRange('2026-10-02', '2026-10-02').range;
    expect(date >= day.gte && date <= day.lte).toBe(true);
    const october = pktMonth(10, 2026);
    expect(date >= october.gte && date < october.lt).toBe(true);
    expect(pktDay(date)).toBe('2026-10-02');
  });

  it('a from/to range may be open on either side, and refuses non-dates', () => {
    expect(pktRange('', '').range).toBe(null);
    expect(pktRange('2026-07-01', '').range).toEqual({ gte: pktDayStart('2026-07-01') });
    expect(pktRange('', '2026-07-31').range).toEqual({ lte: pktDayEnd('2026-07-31') });
    expect(pktRange('07/01/2026', '').error).toMatch(/YYYY-MM-DD/);
  });
});

describe('already billed?', () => {
  const sameMonth = [
    { studentId: 1, feeTitle: 'Monthly Fee Of Jul' },     // from Generate Fees
    { studentId: 2, feeTitle: 'Admission Fee' },           // from admission
    { studentId: 3, feeTitle: 'Tuition Fee' },             // entered from old books
    { studentId: 4, feeTitle: 'Transport Fee Of July' },
  ];

  it('the monthly fee is billed once, whatever it was called', () => {
    const billed = billedFor(sameMonth, 'Monthly Fee Of Jul');
    expect([...billed].sort()).toEqual([1, 3]);
  });

  it('an admission or transport fee does not stop the monthly fee, nor the other way round', () => {
    expect(billedFor(sameMonth, 'Monthly Fee Of Jul').has(2)).toBe(false);
    expect(billedFor(sameMonth, 'Monthly Fee Of Jul').has(4)).toBe(false);
    expect([...billedFor(sameMonth, 'Transport Fee Of July')]).toEqual([4]);
    expect([...billedFor(sameMonth, 'Admission Fee')]).toEqual([2]);
  });
});

describe('reminders: one message per student, in rupees', () => {
  const invoices = [
    { studentId: 7, dueAmount: 350000, month: '9', year: 2026, student: { name: 'Ayesha' } },
    { studentId: 7, dueAmount: 350000, month: 'July', year: 2026, student: { name: 'Ayesha' } },
    { studentId: 7, dueAmount: 150000, month: 'Aug', year: 2026, student: { name: 'Ayesha' } },
    { studentId: 9, dueAmount: 0, month: '7', year: 2026, student: { name: 'Bilal' } },       // paid off
    { studentId: 11, dueAmount: 250050, month: '12', year: 2025, student: { name: 'Hamza' } },
  ];

  it('adds up each student\'s dues and lists the months oldest first', () => {
    const dues = duesByStudent(invoices);
    expect(dues.map((d) => d.studentId)).toEqual([7, 11]);
    expect(dues[0].totalDue).toBe(850000);
    expect(dues[0].months).toEqual(['July 2026', 'August 2026', 'September 2026']);
    expect(dues[1].months).toEqual(['December 2025']);
  });

  it('shows rupees, never paisa', () => {
    expect(rupees(850000)).toBe('8,500');
    expect(rupees(250050)).toBe('2,500.5');
    expect(rupees(null)).toBe('0');
  });

  it('asks for payment by the next due date, or today when it is all overdue', () => {
    const now = new Date(Date.UTC(2026, 9, 8, 5)); // 8 Oct, 10:00 in Pakistan
    expect(payBy([{ dueDate: new Date('2026-07-10') }, { dueDate: new Date('2026-10-10') }], now)).toBe('10/10/2026');
    expect(payBy([{ dueDate: new Date('2026-07-10') }], now)).toBe('08/10/2026');
    expect(payBy([{ dueDate: null }], now)).toBe('08/10/2026');
  });
});

describe('balance sheet settlements', () => {
  it('a settlement hands over up to its cut-off; older ones cut off when they were made', () => {
    const made = new Date('2026-10-08T10:00:00.000Z');
    expect(settledUpTo({ createdAt: made, details: JSON.stringify({ accountantId: 3, upTo: '2026-10-05T18:59:59.999Z' }) }))
      .toBe(Date.parse('2026-10-05T18:59:59.999Z'));
    expect(settledUpTo({ createdAt: made, details: JSON.stringify({ accountantId: 3, date: '2026-10-08' }) }))
      .toBe(made.getTime());
    expect(settledUpTo({ createdAt: made, details: 'not json' })).toBe(made.getTime());
  });
});
