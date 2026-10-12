/**
 * Reading a filled paper admission form. Whatever the AI model returns is
 * cleaned before it reaches the admission wizard: values are put in the
 * forms the app stores, and a value that cannot be right is left for the
 * office to fill in (and named, so they know where to look).
 */
import { describe, it, expect } from 'vitest';
import mod from '../../src/services/formReader.service.js';

const { cleanFields, parseFiles } = mod;

describe('cleaning what was read from the form', () => {
  it('keeps the admission form fields and drops anything else', () => {
    const r = cleanFields({ name: '  Ayesha  Khan ', fatherName: 'Tariq Mehmood', salary: '90000', unclear: ['fatherName', 'nonsense'] });
    expect(r.fields).toEqual({ name: 'Ayesha Khan', fatherName: 'Tariq Mehmood' });
    expect(r.unclear).toEqual(['fatherName']);
  });

  it('reads dates day first, as written in Pakistan', () => {
    expect(cleanFields({ dob: '04/05/2017' }).fields.dob).toBe('2017-05-04');
    expect(cleanFields({ dob: '4-5-17' }).fields.dob).toBe('2017-05-04');
    expect(cleanFields({ dob: '2017-05-04' }).fields.dob).toBe('2017-05-04');
    const bad = cleanFields({ dob: '31/02/2017' });
    expect(bad.fields.dob).toBeUndefined();
    expect(bad.unclear).toContain('dob');
    expect(cleanFields({ admissionDate: '01/01/2099' }).unclear).toContain('admissionDate');
  });

  it('formats CNICs and phones, and flags ones with digits missing', () => {
    const r = cleanFields({ fatherCnic: '35202 1234567 1', bFormNo: '3520212345', emergencyPhone: '+92 300 1234567', motherPhone: '0300-12345' });
    expect(r.fields.fatherCnic).toBe('35202-1234567-1');
    expect(r.fields.emergencyPhone).toBe('03001234567');
    expect(r.fields.bFormNo).toBeUndefined();
    expect(r.fields.motherPhone).toBeUndefined();
    expect(r.unclear).toEqual(expect.arrayContaining(['bFormNo', 'motherPhone']));
  });

  it('understands gender and blood group as people write them', () => {
    expect(cleanFields({ gender: 'girl' }).fields.gender).toBe('Female');
    expect(cleanFields({ gender: 'M' }).fields.gender).toBe('Male');
    expect(cleanFields({ bloodGroup: 'B positive' }).fields.bloodGroup).toBe('B+');
    expect(cleanFields({ bloodGroup: 'unknown' }).unclear).toContain('bloodGroup');
  });

  it('treats N/A and dashes as empty', () => {
    expect(cleanFields({ allergies: 'N/A', caste: '—', motherOccupation: 'nil' }).fields).toEqual({});
  });
});

describe('pages sent to the reader', () => {
  const png = 'data:image/png;base64,' + Buffer.from('x'.repeat(100)).toString('base64');
  it('accepts photos and PDFs', () => {
    expect(parseFiles([png, { data: png.replace('image/png', 'application/pdf') }]).map((p) => p.kind)).toEqual(['image', 'pdf']);
  });
  it('refuses other files and too many pages', () => {
    expect(() => parseFiles(['data:text/html;base64,PGI+'])).toThrow(/not a photo/);
    expect(() => parseFiles(Array(7).fill(png))).toThrow(/at most/);
  });
});
