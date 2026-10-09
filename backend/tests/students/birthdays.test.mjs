/**
 * Birthdays on the dashboard and the Birthdays page. A birthday is a day in
 * Pakistan even though the live server's clock runs on UTC, and a date of
 * birth must give the same day however it was stored.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/routes/student.routes.js';

const { daysUntilBirthday } = mod;
// 8 Oct 2026, 01:30 in Pakistan = 7 Oct 2026, 20:30 UTC (server still on the 7th)
const lateNight = new Date(Date.UTC(2026, 9, 7, 20, 30));
// Midday on that day in Pakistan.
const pkt = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 7));

describe('birthdays', () => {
  it("uses Pakistan's today even when the UTC server is still on yesterday", () => {
    expect(daysUntilBirthday('2016-10-08T00:00:00.000Z', { now: lateNight })).toBe(0);
    expect(daysUntilBirthday('2016-10-07T00:00:00.000Z', { now: lateNight })).toBeNull();
  });

  it('reads a date of birth as the same day however it was stored', () => {
    // UTC midnight (admissions, edits, import), midday Pakistan time, Pakistan midnight (older code)
    for (const stored of ['2016-10-08T00:00:00.000Z', '2016-10-08T07:00:00.000Z', '2016-10-07T19:00:00.000Z']) {
      expect(daysUntilBirthday(stored, { now: lateNight })).toBe(0);
      expect(daysUntilBirthday(new Date(stored), { now: lateNight })).toBe(0);
    }
  });

  it('counts the days to a birthday inside the window only', () => {
    expect(daysUntilBirthday('2015-10-10T00:00:00.000Z', { now: lateNight, days: 7 })).toBe(2);
    expect(daysUntilBirthday('2015-10-15T00:00:00.000Z', { now: lateNight, days: 7 })).toBe(7);
    expect(daysUntilBirthday('2015-10-16T00:00:00.000Z', { now: lateNight, days: 7 })).toBeNull();
    expect(daysUntilBirthday('2015-01-02T00:00:00.000Z', { now: pkt(2026, 12, 30), days: 7 })).toBe(3);
  });

  it('celebrates 29 February on 28 February in other years', () => {
    const leapDay = '2016-02-29T00:00:00.000Z';
    expect(daysUntilBirthday(leapDay, { now: pkt(2027, 2, 28) })).toBe(0);
    expect(daysUntilBirthday(leapDay, { now: pkt(2027, 3, 1) })).toBeNull();
    expect(daysUntilBirthday(leapDay, { now: pkt(2027, 2, 25), days: 7 })).toBe(3);
    // In a leap year it is on the day itself, not the day before.
    expect(daysUntilBirthday(leapDay, { now: pkt(2028, 2, 28) })).toBeNull();
    expect(daysUntilBirthday(leapDay, { now: pkt(2028, 2, 29) })).toBe(0);
    expect(daysUntilBirthday('2015-02-28T00:00:00.000Z', { now: pkt(2028, 2, 29) })).toBeNull();
  });

  it('ignores a missing or broken date of birth', () => {
    expect(daysUntilBirthday(null, { now: lateNight, days: 30 })).toBeNull();
    expect(daysUntilBirthday('not a date', { now: lateNight, days: 30 })).toBeNull();
  });
});
