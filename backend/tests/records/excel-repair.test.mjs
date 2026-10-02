/**
 * Excel damages Pakistani school data in predictable ways. A bug here does
 * not crash anything; it silently gives every student the wrong birthday or
 * every parent a phone number they cannot sign in with. So each repair is
 * pinned down explicitly.
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/services/records.service.js';
const { parseDate, parsePhone, parseCnic, cellText } = mod;

const iso = (r) => (r.date ? r.date.toISOString().slice(0, 10) : null);

describe('parseDate — dates are DAY first in Pakistan', () => {
  it('reads 05/06/2012 as 5 June, not May 6', () => {
    expect(iso(parseDate('05/06/2012'))).toBe('2012-06-05');
  });
  it('reads 14/03/2014 (impossible as month-first)', () => {
    expect(iso(parseDate('14/03/2014'))).toBe('2014-03-14');
  });
  it('accepts dashes and dots', () => {
    expect(iso(parseDate('14-03-2014'))).toBe('2014-03-14');
    expect(iso(parseDate('14.03.2014'))).toBe('2014-03-14');
  });
  it('accepts ISO', () => {
    expect(iso(parseDate('2014-03-14'))).toBe('2014-03-14');
  });
  it('expands two-digit years sensibly', () => {
    expect(iso(parseDate('14/03/14'))).toBe('2014-03-14');
    expect(iso(parseDate('22/08/91'))).toBe('1991-08-22');
  });
  it('reads an Excel serial number', () => {
    // 45000 = 2023-03-15 in Excel's 1900 date system
    expect(iso(parseDate(45000))).toBe('2023-03-15');
  });
  it('passes a real Date through', () => {
    expect(iso(parseDate(new Date(Date.UTC(2014, 2, 14))))).toBe('2014-03-14');
  });
  it('rejects a day that does not exist', () => {
    expect(parseDate('31/02/2014').error).toMatch(/does not exist/);
  });
  it('rejects a month above 12', () => {
    expect(parseDate('10/13/2014').error).toBeDefined();
  });
  it('treats blank as no date, not an error', () => {
    expect(parseDate('')).toEqual({ date: null });
    expect(parseDate(null)).toEqual({ date: null });
  });
  it('explains what format it wanted', () => {
    expect(parseDate('next tuesday').error).toMatch(/DD\/MM\/YYYY/);
  });
});

describe('parsePhone — Excel strips the leading zero', () => {
  it('restores 0 to a number Excel stored as 3001234567', () => {
    expect(parsePhone(3001234567).phone).toBe('03001234567');
  });
  it('keeps a correctly typed local number', () => {
    expect(parsePhone('03001234567').phone).toBe('03001234567');
  });
  it('normalises +92 and 92 forms to the same local number', () => {
    expect(parsePhone('+923001234567').phone).toBe('03001234567');
    expect(parsePhone('923001234567').phone).toBe('03001234567');
  });
  it('tolerates dashes and spaces', () => {
    expect(parsePhone('0300-123 4567').phone).toBe('03001234567');
  });
  it('warns on something that is not a mobile', () => {
    const r = parsePhone('051-1234567');
    expect(r.warning).toBeDefined();
  });
  it('treats blank as no phone', () => {
    expect(parsePhone('').phone).toBeNull();
  });
});

describe('parseCnic — 13 digits that Excel turns into 3.52E+12', () => {
  it('rebuilds a CNIC stored as a number', () => {
    expect(parseCnic(3520212345671).value).toBe('35202-1234567-1');
  });
  it('formats bare digits', () => {
    expect(parseCnic('3520212345671').value).toBe('35202-1234567-1');
  });
  it('keeps an already formatted CNIC', () => {
    expect(parseCnic('35202-1234567-1').value).toBe('35202-1234567-1');
  });
  it('warns when it is not 13 digits', () => {
    expect(parseCnic('12345').warning).toMatch(/13 digits/);
  });
});

describe('cellText — the shapes ExcelJS returns', () => {
  it('never renders a large integer in scientific notation', () => {
    expect(cellText(3520212345671)).toBe('3520212345671');
  });
  it('reads rich text', () => {
    expect(cellText({ richText: [{ text: 'Ayesha ' }, { text: 'Khan' }] })).toBe('Ayesha Khan');
  });
  it('reads a hyperlink cell (emails typed into Excel become links)', () => {
    expect(cellText({ text: 'farah@school.pk', hyperlink: 'mailto:farah@school.pk' })).toBe('farah@school.pk');
  });
  it('reads a formula result', () => {
    expect(cellText({ formula: 'A1&B1', result: 'Class 5' })).toBe('Class 5');
  });
  it('treats an Excel error cell as empty', () => {
    expect(cellText({ error: '#N/A' })).toBe('');
  });
});

describe('choice columns keep their meaning', () => {
  const { pickList, BLOOD_GROUPS, STUDENT_GENDERS } = mod;
  it('does not confuse B+ with B- (the sign is the whole point)', () => {
    expect(pickList('B-', BLOOD_GROUPS).value).toBe('B-');
    expect(pickList('B+', BLOOD_GROUPS).value).toBe('B+');
    expect(pickList('AB-', BLOOD_GROUPS).value).toBe('AB-');
  });
  it('matches regardless of case and spaces', () => {
    expect(pickList('ab +', BLOOD_GROUPS).value).toBe('AB+');
    expect(pickList('female', STUDENT_GENDERS).value).toBe('Female');
  });
  it('accepts M and F for gender', () => {
    expect(pickList('M', STUDENT_GENDERS).value).toBe('Male');
    expect(pickList('f', STUDENT_GENDERS).value).toBe('Female');
  });
  it('flags a value that is not in the list', () => {
    expect(pickList('Z+', BLOOD_GROUPS).unknown).toBe(true);
  });
});
