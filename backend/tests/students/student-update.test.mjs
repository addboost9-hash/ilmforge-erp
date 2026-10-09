/**
 * Editing a student record from the list, the profile or after an import.
 * A wrong value must be explained, not stored: a bad date used to crash the
 * save, and phone numbers in mixed formats stopped parents signing in.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/utils/studentUpdate.js';

const { normalizeStudentUpdate } = mod;
const today = new Date(2026, 9, 8);
const norm = (body) => normalizeStudentUpdate(body, { today });

describe('student edit checks', () => {
  it('only touches fields that were sent', () => {
    expect(norm({ name: 'Ayesha Khan' }).data).toEqual({ name: 'Ayesha Khan' });
    expect(norm({}).data).toEqual({});
  });

  it('stores gender the way admissions do', () => {
    expect(norm({ gender: 'male' }).data.gender).toBe('Male');
    expect(norm({ gender: 'Female' }).data.gender).toBe('Female');
    expect(norm({ gender: '' }).data.gender).toBeNull();
    expect(norm({ gender: 'x' }).errors.gender).toBeTruthy();
  });

  it('refuses impossible dates instead of crashing', () => {
    expect(norm({ dob: '2016-03-14' }).data.dob.getFullYear()).toBe(2016);
    expect(norm({ dob: 'garbage' }).errors.dob).toMatch(/real date/);
    expect(norm({ dob: '2030-01-01' }).errors.dob).toBeTruthy();
    expect(norm({ dob: '' }).data.dob).toBeNull();
  });

  it('keeps one format for the parent phone', () => {
    for (const p of ['03001234567', '+923001234567', '0300-1234567']) {
      expect(norm({ emergencyPhone: p }).data.emergencyPhone).toBe('03001234567');
    }
    expect(norm({ emergencyPhone: '12345' }).errors.emergencyPhone).toMatch(/03001234567/);
    expect(norm({ emergencyPhone: '' }).data.emergencyPhone).toBeNull();
  });

  it('formats B-Form and CNIC numbers', () => {
    expect(norm({ bFormNo: '3520212345671' }).data.bFormNo).toBe('35202-1234567-1');
    expect(norm({ bFormNo: '35202-12345' }).errors.bFormNo).toMatch(/13 digits/);
    expect(norm({ fatherCnic: '35202 1234567 1' }).data.fatherCnic).toBe('35202-1234567-1');
  });

  it('accepts only known statuses', () => {
    expect(norm({ status: 'Left' }).data.status).toBe('left');
    expect(norm({ status: 'expelled' }).errors.status).toBeTruthy();
  });

  it('never blanks a roll number or a name', () => {
    expect(norm({ rollNo: '  ' }).errors.rollNo).toBeTruthy();
    expect(norm({ rollNo: ' C5A-26-001 ' }).data.rollNo).toBe('C5A-26-001');
    expect(norm({ name: ' ' }).errors.name).toBeTruthy();
  });
});
