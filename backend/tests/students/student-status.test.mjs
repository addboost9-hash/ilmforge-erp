/**
 * Which students a list asks for. The Inactive tab means everyone no longer
 * studying here; the Certificates page asks for students who left without
 * those who passed out, so the server can count them exactly.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/routes/student.routes.js';

const { statusFilter } = mod;

describe('student status filter', () => {
  it('keeps a single status as it is', () => {
    expect(statusFilter('active')).toBe('active');
    expect(statusFilter('passout')).toBe('passout');
  });

  it('reads Inactive as everyone who is not studying here now', () => {
    expect(statusFilter('inactive')).toEqual({ in: ['inactive', 'left', 'withdrawn', 'passout'] });
  });

  it('reads a comma list as exactly those statuses', () => {
    expect(statusFilter('inactive,left,withdrawn')).toEqual({ in: ['inactive', 'left', 'withdrawn'] });
    expect(statusFilter(' left , withdrawn ')).toEqual({ in: ['left', 'withdrawn'] });
    expect(statusFilter(['left', 'withdrawn'])).toEqual({ in: ['left', 'withdrawn'] });
  });

  it('never turns a stray comma into "every status"', () => {
    expect(statusFilter(',')).toBe(',');
    expect(statusFilter('left,')).toBe('left');
  });
});
