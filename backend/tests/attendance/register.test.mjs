/**
 * The attendance register's month, and the school stamp's checks: the days
 * of a month with weekdays, Sundays and holidays; which pictures and places
 * the stamp accepts.
 */
import { describe, it, expect } from 'vitest';
import attendanceRoutes from '../../src/routes/attendance.routes.js';
import stampRoutes from '../../src/routes/stamp.routes.js';

const { monthDays, ymdOf } = attendanceRoutes.helpers;
const { checkStamp, PLACES } = stampRoutes.helpers;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mNkYGD4z8DAwMDAxMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==';

describe("the register's month", () => {
  it('every day, with its weekday', () => {
    const days = monthDays(2026, 11, () => null);
    expect(days).toHaveLength(30);
    expect(days[0]).toMatchObject({ day: 1, date: '2026-11-01', weekday: 'Sun', sunday: true, holiday: null });
    expect(days[1]).toMatchObject({ day: 2, weekday: 'Mon', sunday: false });
    expect(days.filter((d) => d.sunday).map((d) => d.day)).toEqual([1, 8, 15, 22, 29]);
  });

  it('February in a leap year and not', () => {
    expect(monthDays(2028, 2, () => null)).toHaveLength(29);
    expect(monthDays(2026, 2, () => null)).toHaveLength(28);
  });

  it('a holiday is named on its day', () => {
    const days = monthDays(2026, 11, (ymd) => (ymd === '2026-11-09' ? 'Iqbal Day' : null));
    expect(days[8]).toMatchObject({ date: '2026-11-09', holiday: 'Iqbal Day' });
    expect(days.filter((d) => d.holiday)).toHaveLength(1);
  });

  it('dates are written YYYY-MM-DD', () => {
    expect(ymdOf(2026, 3, 7)).toBe('2026-03-07');
  });
});

describe('the school stamp', () => {
  it('takes a PNG and keeps every place on unless told', () => {
    const { stamp } = checkStamp({ image: PNG });
    expect(stamp.image).toBe(PNG);
    expect(Object.keys(stamp.places).sort()).toEqual([...PLACES].sort());
    expect(Object.values(stamp.places).every(Boolean)).toBe(true);
  });

  it('switches one place off and keeps the picture', () => {
    const { stamp } = checkStamp({ places: { feeRecords: false } }, { image: PNG });
    expect(stamp.image).toBe(PNG);
    expect(stamp.places.feeRecords).toBe(false);
    expect(stamp.places.resultCards).toBe(true);
  });

  it('can be removed', () => {
    expect(checkStamp({ image: '' }, { image: PNG }).stamp.image).toBe('');
  });

  it('refuses what is not a small PNG, JPG or WebP picture', () => {
    expect(checkStamp({ image: 'javascript:alert(1)' }).error).toBeTruthy();
    expect(checkStamp({ image: 'data:image/svg+xml;base64,PHN2Zy8+' }).error).toBeTruthy();
    expect(checkStamp({ image: 'https://example.com/stamp.png' }).error).toBeTruthy();
    expect(checkStamp({ image: `data:image/png;base64,${'A'.repeat(420 * 1024)}` }).error).toMatch(/too large/);
  });

  it('refuses places it does not know', () => {
    expect(checkStamp({ places: { idCards: true } }).error).toMatch(/idCards/);
    expect(checkStamp({ places: ['rollSlips'] }).error).toBeTruthy();
  });
});
