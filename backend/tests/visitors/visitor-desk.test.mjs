/**
 * The Visitor Desk: CNICs, slips, the kiosk's phone check, Pakistan's day,
 * and what a visit must have.
 */
import { describe, it, expect } from 'vitest';
import vd from '../../src/services/visitorDesk.service.js';

const { isRealCnic, formatCnic, maskCnic, parseSlip, lastFourMatches, pkDayStart, pkDayRange, checkVisit } = vd;

describe('a CNIC', () => {
  it('is 13 digits, however it is written', () => {
    expect(isRealCnic('35202-1234567-1')).toBe(true);
    expect(isRealCnic('3520212345671')).toBe(true);
    expect(formatCnic('3520212345671')).toBe('35202-1234567-1');
    expect(isRealCnic('35202-123456')).toBe(false);
  });
  it('a stand-in is not a CNIC: 11111-1111111-1 from Students from Photos', () => {
    expect(isRealCnic('11111-1111111-1')).toBe(false);
    expect(isRealCnic('1111111111111')).toBe(false);
    expect(isRealCnic('0000000000000')).toBe(false);
    expect(isRealCnic('1234567890123')).toBe(false);
  });
  it('is shown in part on lists and the live feed', () => {
    expect(maskCnic('35202-1234567-1')).toBe('35202-•••••••-1');
    expect(maskCnic('')).toBe('');
  });
});

describe('the slip', () => {
  it('its number typed, or its QR code scanned', () => {
    expect(parseSlip('V-1042')).toEqual({ id: 1042, code: null });
    expect(parseSlip('1042')).toEqual({ id: 1042, code: null });
    expect(parseSlip(' v 1042 ')).toEqual({ id: 1042, code: null });
    expect(parseSlip('IFV-12-AB12CD')).toEqual({ id: 12, code: 'AB12CD' });
    expect(parseSlip('hello')).toBeNull();
    expect(parseSlip('')).toBeNull();
  });
});

describe('the kiosk opens a parent\'s children with the last 4 digits of the mobile', () => {
  it('of a real number on the record, in any form', () => {
    expect(lastFourMatches(['0300 1234567'], '4567')).toBe(true);
    expect(lastFourMatches(['+923001234567', null], '4567')).toBe(true);
    expect(lastFourMatches(['03001234567'], '1234')).toBe(false);
  });
  it('never a stand-in number (111111) or a short guess', () => {
    expect(lastFourMatches(['111111'], '1111')).toBe(false);
    expect(lastFourMatches(['03001234567'], '567')).toBe(false);
    expect(lastFourMatches([], '4567')).toBe(false);
  });
});

describe('a day in Pakistan (UTC+5), whatever the server\'s clock', () => {
  it('starts at 19:00 UTC the day before', () => {
    expect(pkDayStart(new Date('2026-11-26T10:00:00Z')).toISOString()).toBe('2026-11-25T19:00:00.000Z');
    // 1 am in Pakistan on the 27th
    expect(pkDayStart(new Date('2026-11-26T20:00:00Z')).toISOString()).toBe('2026-11-26T19:00:00.000Z');
  });
  it('a chosen date', () => {
    const r = pkDayRange('2026-11-26');
    expect(r.start.toISOString()).toBe('2026-11-25T19:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-11-26T19:00:00.000Z');
    expect(pkDayRange('26/11/2026')).toBeNull();
  });
});

describe('what a visit must have', () => {
  const base = { visitor: { name: 'Ahmed Raza', cnic: '35202-1234567-1', phone: '0300 1234567' }, reason: 'meet_principal' };

  it('a name, a CNIC (or "No CNIC" and a mobile) and why they came', () => {
    expect(checkVisit(base).errors).toEqual({});
    expect(checkVisit({ ...base, visitor: { ...base.visitor, name: '' } }).errors.name).toBeTruthy();
    expect(checkVisit({ ...base, visitor: { name: 'Ahmed' } }).errors.cnic).toMatch(/No CNIC/);
    expect(checkVisit({ ...base, visitor: { name: 'Ahmed' }, noCnic: true }).errors.phone).toMatch(/Without a CNIC/);
    expect(checkVisit({ ...base, visitor: { name: 'Ahmed', phone: '03001234567' }, noCnic: true }).errors).toEqual({});
    expect(checkVisit({ ...base, reason: 'shopping' }).errors.reason).toBeTruthy();
  });

  it('the CNIC and mobile are tidied', () => {
    const { data } = checkVisit({ ...base, visitor: { ...base.visitor, cnic: '3520212345671', phone: '0300-1234567' } });
    expect(data.cnic).toBe('35202-1234567-1');
    expect(data.phone).toBe('+923001234567');
  });

  it('a stand-in CNIC is refused', () => {
    expect(checkVisit({ ...base, visitor: { ...base.visitor, cnic: '11111-1111111-1' } }).errors.cnic).toBeTruthy();
  });

  it('a complaint says what it is about', () => {
    expect(checkVisit({ ...base, reason: 'complaint' }).errors.detail).toBeTruthy();
    const ok = checkVisit({ ...base, reason: 'complaint', detail: 'transport', remarks: 'Van roz late aati hai' });
    expect(ok.errors).toEqual({});
    expect(ok.data.remarks).toBe('Van roz late aati hai');
  });

  it('the fee, a result or taking a child early need the child, and how the visitor is related', () => {
    expect(checkVisit({ ...base, reason: 'fee' }).errors.studentIds).toBeTruthy();
    expect(checkVisit({ ...base, reason: 'fee', studentIds: [7] }).errors.relation).toBeTruthy();
    expect(checkVisit({ ...base, reason: 'fee', studentIds: [7, 7, 'x'], relation: 'mother' }).data.studentIds).toEqual([7]);
  });

  it('children are kept only for visits about a child', () => {
    expect(checkVisit({ ...base, reason: 'interview', studentIds: [7], relation: 'father' }).data.studentIds).toEqual([]);
  });

  it('admission needs a mobile to call back', () => {
    const v = { visitor: { name: 'Farhan Ali', cnic: '35202-7654321-9' }, reason: 'admission', childName: 'Ali', detail: 'Class 3' };
    expect(checkVisit(v).errors.phone).toMatch(/admission/);
    const ok = checkVisit({ ...v, visitor: { ...v.visitor, phone: '03211234567' } });
    expect(ok.errors).toEqual({});
    expect(ok.data).toMatchObject({ childName: 'Ali', detail: 'Class 3' });
  });

  it('the kiosk needs the CNIC and mobile, and has no office notes or record updates', () => {
    const k = checkVisit({ visitor: { name: 'Ahmed' }, reason: 'meet_teacher', staffNotes: 'x', noCnic: true }, { kiosk: true });
    expect(k.errors.cnic).toBeTruthy();
    expect(k.errors.phone).toBeTruthy();
    expect(k.data.staffNotes).toBe('');
    const r = checkVisit({ ...base, reason: 'fee', studentIds: [7], relation: 'father', recordUpdates: [{ studentId: 7, fatherCnic: '35202-1234567-1' }] }, { kiosk: true });
    expect(r.data.recordUpdates).toEqual([]);
  });

  it('a parent\'s details for the record: only for the children chosen, and real ones', () => {
    const v = { ...base, reason: 'fee', studentIds: [7], relation: 'father' };
    const { data } = checkVisit({ ...v, recordUpdates: [{ studentId: 7, fatherName: 'Ahmed Raza', fatherCnic: '3520212345671', phone: '03001234567' }, { studentId: 9, fatherName: 'X' }] });
    expect(data.recordUpdates).toEqual([{ studentId: 7, fatherName: 'Ahmed Raza', fatherCnic: '35202-1234567-1', phone: '+923001234567' }]);
    expect(checkVisit({ ...v, recordUpdates: [{ studentId: 7, fatherCnic: '11111-1111111-1' }] }).errors['recordUpdates.7']).toBeTruthy();
  });

  it('written later from the paper register, the CNIC is not required', () => {
    expect(checkVisit({ visitor: { name: 'Ahmed' }, reason: 'other' }, { late: true }).errors).toEqual({});
  });
});
