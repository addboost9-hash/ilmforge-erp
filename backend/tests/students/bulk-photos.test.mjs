/**
 * Student photos in bulk: which student a photo file is for, by its name.
 */
import { describe, it, expect } from 'vitest';
import photos from '../../src/services/studentPhotos.service.js';

const { fileKey, matchKey } = photos;

/* The index studentIndex() builds, for a few students. */
function indexOf(students) {
  const low = (v) => String(v || '').trim().toLowerCase();
  const pname = (v) => String(v || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  const ix = { byRoll: new Map(), byBform: new Map(), byName: new Map() };
  for (const s of students) {
    if (s.rollNo) { push(ix.byRoll, low(s.rollNo), s); if (s.rollNo.includes('/')) push(ix.byRoll, low(s.rollNo).replace(/\//g, '-'), s); }
    if (s.bFormNo) push(ix.byBform, s.bFormNo.replace(/\D/g, ''), s);
    push(ix.byName, pname(s.name), s);
  }
  return ix;
}
const ayesha = { id: 1, name: 'Ayesha Khan', rollNo: 'NUR-26-001', bFormNo: '35202-1234567-1', status: 'active' };
const ali1 = { id: 2, name: 'Ali Raza', rollNo: '5/12', status: 'active' };
const ali2 = { id: 3, name: 'Ali Raza', rollNo: 'C2-26-004', status: 'active' };
const ix = indexOf([ayesha, ali1, ali2]);

describe('the name of a photo file', () => {
  it('without its folder and extension', () => {
    expect(fileKey('Class 5/NUR-26-001.JPG')).toBe('NUR-26-001');
    expect(fileKey('C:\\photos\\Ayesha Khan.jpeg')).toBe('Ayesha Khan');
  });
});

describe('which student a photo is for', () => {
  it('by roll number, whatever the capitals', () => {
    expect(matchKey(ix, 'nur-26-001')).toMatchObject({ student: { id: 1 }, by: 'roll number' });
  });
  it('a "/" in a roll number is written "-" in a file name', () => {
    expect(matchKey(ix, '5-12')).toMatchObject({ student: { id: 2 } });
  });
  it('by B-Form number, with or without dashes', () => {
    expect(matchKey(ix, '3520212345671')).toMatchObject({ student: { id: 1 }, by: 'B-Form number' });
    expect(matchKey(ix, '35202-1234567-1')).toMatchObject({ student: { id: 1 } });
  });
  it('by full name only when one student has it', () => {
    expect(matchKey(ix, 'ayesha  khan')).toMatchObject({ student: { id: 1 }, by: 'name' });
    expect(matchKey(ix, 'Ali Raza').error).toMatch(/2 students are called/);
  });
  it('nobody: says so', () => {
    expect(matchKey(ix, 'IMG_2041').error).toMatch(/No student has/);
  });
});
