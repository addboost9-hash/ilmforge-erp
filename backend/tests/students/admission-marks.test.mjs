/**
 * Admission test marks are optional, but a typed value must be a number.
 * "abc" used to reach the database as NaN and fail the admission with a 500;
 * it is now refused with a message the office can act on. These cases are
 * refused before anything is read or written, so no database is needed.
 * Editing a record (PUT /students/:id) uses the same rule.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/services/admission.service.js';

const { admitStudent, testMarksValue } = mod;
const ctx = { schoolId: 1, actorUserId: 1 };

describe('admission test marks', () => {
  it('refuses marks that are not a number', async () => {
    for (const marks of ['abc', '85%', 'NaN', true]) {
      await expect(admitStudent(ctx, { name: 'Test Pupil', admissionTestMarks: marks }))
        .rejects.toMatchObject({ status: 400, message: expect.stringMatching(/0 to 1000/) });
    }
  });

  it('refuses marks outside 0 to 1000', async () => {
    for (const marks of [-1, '1000.5', 5000]) {
      await expect(admitStudent(ctx, { name: 'Test Pupil', admissionTestMarks: marks }))
        .rejects.toMatchObject({ status: 400 });
    }
  });

  it('keeps a typed number, and empty as no marks', () => {
    expect(testMarksValue('85')).toEqual({ value: 85 });
    expect(testMarksValue(' 72.5 ')).toEqual({ value: 72.5 });
    expect(testMarksValue(0)).toEqual({ value: 0 });
    expect(testMarksValue('1000')).toEqual({ value: 1000 });
    for (const empty of ['', '  ', null, undefined]) expect(testMarksValue(empty)).toEqual({ value: null });
  });

  it('refuses what only looks like a number to JavaScript', () => {
    for (const marks of ['0x10', '1e2', 'Infinity', '+5', '7,5', '1 000']) {
      expect(testMarksValue(marks).error).toMatch(/0 to 1000/);
    }
  });
});
