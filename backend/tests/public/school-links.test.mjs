/**
 * A school's public links and its online admission form. Mistakes here are
 * quiet but costly: a parent's application lands in the wrong school, is
 * lost to a typo in the phone number, or a school's printed link stops
 * working.
 */
import { describe, it, expect } from 'vitest';
import slugMod from '../../src/utils/slug.js';
import appMod from '../../src/utils/admissionApplication.js';

const { slugify, validateSlug, candidates } = slugMod;
const { parseApplication, applicationNotes, reference } = appMod;

describe('school web names (slugs)', () => {
  it('turns a school name into a readable web name', () => {
    expect(slugify('Future Foundation School')).toBe('future-foundation-school');
    expect(slugify('  The City School (Lahore) ')).toBe('the-city-school-lahore');
    expect(slugify('Al-Huda   Grammar -- School')).toBe('al-huda-grammar-school');
  });

  it('keeps names short enough to print', () => {
    expect(slugify('a'.repeat(80)).length).toBeLessThanOrEqual(40);
    expect(slugify('Very Long School Name That Goes On And On Forever Public')).not.toMatch(/-$/);
  });

  it('tries the plain name first, then numbered ones', () => {
    const list = candidates('Future Foundation School', 3);
    expect(list).toEqual(['future-foundation-school', 'future-foundation-school-2', 'future-foundation-school-3']);
  });

  it('never offers a reserved word', () => {
    expect(candidates('Login')[0]).toBe('login-school');
    expect(candidates('!!')[0]).toBe('school-school');
  });

  it('accepts a good name and explains a bad one', () => {
    expect(validateSlug('future-foundation')).toBeNull();
    expect(validateSlug('ff')).toMatch(/at least 3/);
    expect(validateSlug('Future Foundation')).toMatch(/small letters/);
    expect(validateSlug('future--foundation')).toMatch(/single dashes/);
    expect(validateSlug('-future')).toMatch(/small letters/);
    expect(validateSlug('admin')).toMatch(/reserved/);
    expect(validateSlug('x'.repeat(41))).toMatch(/at most 40/);
  });
});

describe('online admission application', () => {
  const classes = [{ id: 7, name: 'Class 5' }, { id: 8, name: 'Nursery' }];
  const campuses = [{ id: 3, name: 'Main Campus' }, { id: 4, name: 'Girls Campus' }];
  const today = new Date(2026, 9, 5);
  const ok = {
    studentName: 'Ayesha Khan', fatherName: 'Imran Khan', fatherPhone: '0300-1234567',
    classId: '7', campusId: '4', gender: 'female', dob: '2016-03-14',
    fatherCnic: '3520212345671', fatherEmail: 'Imran@Example.com', address: 'House 12, Lahore',
  };

  it('accepts a complete application and tidies it', () => {
    const { errors, value } = parseApplication(ok, { classes, campuses, today });
    expect(errors).toEqual({});
    expect(value.phone).toBe('03001234567');
    expect(value.classInterested).toBe('Class 5');
    expect(value.campusName).toBe('Girls Campus');
    expect(value.gender).toBe('Female');
    expect(value.dob).toBe('14/03/2016');
    expect(value.cnic).toBe('35202-1234567-1');
    expect(value.email).toBe('imran@example.com');
  });

  it('understands every way a mobile number is written', () => {
    for (const p of ['03001234567', '+923001234567', '923001234567', '0300 1234567']) {
      expect(parseApplication({ ...ok, fatherPhone: p }, { classes, campuses, today }).value.phone).toBe('03001234567');
    }
  });

  it('refuses what the school cannot act on', () => {
    const { errors } = parseApplication({ studentName: 'A', fatherPhone: '12345' }, { classes, campuses, today });
    expect(errors.studentName).toBeTruthy();
    expect(errors.fatherName).toBeTruthy();
    expect(errors.fatherPhone).toMatch(/03001234567/);
    expect(errors.classId).toBeTruthy();
  });

  it("will not take another school's class or campus", () => {
    const { errors } = parseApplication({ ...ok, classId: '99', campusId: '42' }, { classes, campuses, today });
    expect(errors.classId).toMatch(/from the list/);
    expect(errors.campusId).toMatch(/from the list/);
  });

  it('rejects impossible dates and short CNICs', () => {
    expect(parseApplication({ ...ok, dob: '2016-02-30' }, { classes, campuses, today }).errors.dob).toBeTruthy();
    expect(parseApplication({ ...ok, dob: '2030-01-01' }, { classes, campuses, today }).errors.dob).toBeTruthy();
    expect(parseApplication({ ...ok, fatherCnic: '35202-12345' }, { classes, campuses, today }).errors.cnic).toMatch(/13 digits/);
  });

  it('uses the only campus when a school has one', () => {
    const { value } = parseApplication({ ...ok, campusId: '' }, { classes, campuses: [campuses[0]], today });
    expect(value.campusId).toBe(3);
  });

  it('writes notes the office can read at a glance', () => {
    const { value } = parseApplication(ok, { classes, campuses, today });
    const notes = applicationNotes(value);
    expect(notes.split('\n')[0]).toBe('Source: Online admission form');
    expect(notes).toContain('Father / guardian: Imran Khan');
    expect(notes).toContain('Campus: Girls Campus');
    expect(reference(42)).toBe('ADM-00042');
  });
});
