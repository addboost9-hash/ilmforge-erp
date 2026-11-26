/**
 * Students recorded twice: which records are the same child, and which to keep.
 */
import { describe, it, expect } from 'vitest';
import dup from '../../src/services/studentDuplicates.service.js';

const { groupDuplicates, keepOf } = dup;
const s = (id, o) => ({ id, name: 'Ali', lastName: null, fatherName: 'Ahmed Raza', bFormNo: null, dob: null, emergencyPhone: null, classId: 5, ...o });

describe('the same child recorded twice', () => {
  it('the same B-Form, however it was typed', () => {
    const g = groupDuplicates([s(1, { bFormNo: '35202-1234567-1', classId: 5 }), s(2, { name: 'Ali Raza', bFormNo: '3520212345671', classId: 6, fatherName: 'X' })]);
    expect(g).toEqual([{ ids: [1, 2], reasons: ['bform'], sure: true }]);
  });

  it('a stand-in B-Form (all the same digit) joins nobody', () => {
    expect(groupDuplicates([s(1, { bFormNo: '11111-1111111-1', classId: 1 }), s(2, { name: 'Sara', bFormNo: '11111-1111111-1', classId: 2 })])).toEqual([]);
  });

  it('a B-Form the office typed for many children is not one child\'s', () => {
    const many = [1, 2, 3, 4].map((i) => s(i, { name: `Ali ${i}`, fatherName: `F${i}`, bFormNo: '35201-1234567-1', classId: i }));
    expect(groupDuplicates(many)).toEqual([]);
  });

  it('the same B-Form with a different first name is a typing mistake, not the same child', () => {
    expect(groupDuplicates([s(1, { bFormNo: '35202-1234567-1' }), s(2, { name: 'Sara', fatherName: 'Imran', bFormNo: '35202-1234567-1', classId: 6 })])).toEqual([]);
  });

  it('the same name and father: in the same class, or with the same birthday or phone in another', () => {
    expect(groupDuplicates([s(1), s(2)])[0]).toMatchObject({ ids: [1, 2], reasons: ['class'], sure: true });
    const dob = groupDuplicates([s(1, { dob: new Date('2018-03-04T00:00:00Z') }), s(2, { classId: 6, dob: new Date('2018-03-04T05:00:00Z') })]);
    expect(dob[0]).toMatchObject({ ids: [1, 2], reasons: ['dob'] });
    const ph = groupDuplicates([s(1, { emergencyPhone: '03001234567' }), s(2, { classId: 6, emergencyPhone: '+923001234567' })]);
    expect(ph[0]).toMatchObject({ ids: [1, 2], reasons: ['phone'] });
  });

  it('two children of the same name with different fathers are not the same', () => {
    expect(groupDuplicates([s(1), s(2, { fatherName: 'Bilal Khan' })])).toEqual([]);
  });

  it('a photo registration ("." for the father) of a child already in the class: possibly the same', () => {
    const g = groupDuplicates([s(1), s(2, { fatherName: '.' })]);
    expect(g).toEqual([{ ids: [1, 2], reasons: ['noFather'], sure: false }]);
  });

  it('the same name in different classes is not a duplicate', () => {
    expect(groupDuplicates([s(1, { fatherName: '.' }), s(2, { fatherName: '.', classId: 6 })])).toEqual([]);
  });

  it('three records of one child are one group', () => {
    const g = groupDuplicates([s(1), s(2), s(3, { classId: 7, bFormNo: '35202-1234567-1' }), s(4, { classId: 5, bFormNo: '35202-1234567-1', name: 'Ali', fatherName: 'Ahmed Raza' })]);
    expect(g).toHaveLength(1);
    expect(g[0].ids).toEqual([1, 2, 3, 4]);
    expect(g[0].reasons.sort()).toEqual(['bform', 'class']);
  });
});

describe('the record to keep', () => {
  const r = (id, o) => ({ id, payments: 0, marks: 0, attendance: 0, rollNo: '', hasPhoto: false, fatherKnown: true, ...o });
  it('the one with fee payments, whatever else', () => {
    expect(keepOf([r(1, { attendance: 90, marks: 12 }), r(2, { payments: 1 })])).toBe(2);
  });
  it('then marks and attendance, then a roll number, then the older record', () => {
    expect(keepOf([r(1, { attendance: 3 }), r(2, { marks: 1 })])).toBe(2);
    expect(keepOf([r(1), r(2, { rollNo: '5-12' })])).toBe(2);
    expect(keepOf([r(3), r(2)])).toBe(2);
  });
});
