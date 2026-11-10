/**
 * Fingerprint machines (ZKTeco, Cloud server / ADMS mode): reading the
 * punch lines a machine uploads, at the machine's own clock, and the
 * Device IDs people are enrolled under.
 */
import { describe, it, expect } from 'vitest';
import iclock from '../../src/routes/iclock.routes.js';
import device from '../../src/services/attendanceDevice.service.js';

const { parsePunch, deviceTime } = iclock;
const { devicePin, isClock } = device;

describe('punch lines from a machine', () => {
  it('reads the usual tab-separated line', () => {
    expect(parsePunch('11843\t2026-11-10 07:52:10\t0\t1\t0\t0\t0')).toEqual({ pin: '11843', stamp: '2026-11-10 07:52:10', state: '0', verify: '1' });
  });

  it('reads firmware that separates with spaces', () => {
    expect(parsePunch('25 2026-11-10 08:01:00 1 15')).toEqual({ pin: '25', stamp: '2026-11-10 08:01:00', state: '1', verify: '15' });
  });
});

describe("the machine's clock", () => {
  it('is Pakistan time unless the school chose another', () => {
    expect(deviceTime('2026-11-10 07:52:10', '+05:00').toISOString()).toBe('2026-11-10T02:52:10.000Z');
    expect(deviceTime('2026-11-10 07:52:10', '+03:00').toISOString()).toBe('2026-11-10T04:52:10.000Z');
  });

  it('accepts a time without seconds', () => {
    expect(deviceTime('2026-11-10 07:52', '+05:00').toISOString()).toBe('2026-11-10T02:52:00.000Z');
  });

  it('refuses what is not a date', () => {
    expect(deviceTime('', '+05:00')).toBeNull();
    expect(deviceTime('yesterday', '+05:00')).toBeNull();
    expect(deviceTime('2026-13-45 99:99:99', '+05:00')).toBeNull();
  });
});

describe('Device IDs', () => {
  it('start with 1 for a student and 2 for staff', () => {
    expect(devicePin('student', 843)).toBe('1843');
    expect(devicePin('staff', 5)).toBe('25');
  });

  it('late times are HH:MM', () => {
    expect(isClock('08:00')).toBe(true);
    expect(isClock('23:59')).toBe(true);
    expect(isClock('24:00')).toBe(false);
    expect(isClock('8:00')).toBe(false);
    expect(isClock('')).toBe(false);
  });
});
