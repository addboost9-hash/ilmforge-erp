/**
 * Entering something that happened earlier: a fee received last month, a
 * salary paid before the school joined. The day must land in the right
 * place in every report, and "today" is Pakistan's today even though the
 * live server's clock runs on UTC.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/utils/pastDate.js';

const { pastDate } = mod;
// 8 Oct 2026, 01:30 in Pakistan = 7 Oct 2026, 20:30 UTC (server still on the 7th)
const lateNight = new Date(Date.UTC(2026, 9, 7, 20, 30));

describe('past dates', () => {
  it('empty means now', () => {
    expect(pastDate('', { now: lateNight }).date).toBe(lateNight);
    expect(pastDate(undefined, { now: lateNight }).date).toBe(lateNight);
  });

  it("accepts Pakistan's today even when the UTC server is still on yesterday", () => {
    expect(pastDate('2026-10-08', { now: lateNight }).date).toBe(lateNight);
    expect(pastDate('08/10/2026', { now: lateNight }).date).toBe(lateNight);
  });

  it('refuses tomorrow', () => {
    expect(pastDate('2026-10-09', { now: lateNight }).error).toMatch(/future/);
  });

  it('stores a past day at midday Pakistan time, on that same day everywhere', () => {
    const d = pastDate('14/03/2026', { now: lateNight }).date;
    expect(d.toISOString()).toBe('2026-03-14T07:00:00.000Z');
  });

  it('explains impossible and malformed dates', () => {
    expect(pastDate('31/02/2026', { now: lateNight }).error).toMatch(/does not exist/);
    expect(pastDate('March 5', { now: lateNight }).error).toMatch(/14\/03\/2026/);
    expect(pastDate('01/01/1990', { now: lateNight }).error).toMatch(/too far/);
  });
});
