/**
 * Face attendance: what is kept of a face (128 numbers, never the matching).
 */
import { describe, it, expect } from 'vitest';
import face from '../../src/services/faceData.service.js';

const { validDescriptor, parseFaceData, addDescriptor, stringify, MAX } = face;
const desc = (seed) => Buffer.from(new Float32Array(Array.from({ length: 128 }, (_, i) => Math.sin(seed + i) * 0.2)).buffer).toString('base64');

describe('a face descriptor', () => {
  it('is 128 float32s in base64', () => {
    expect(desc(1)).toHaveLength(684);
    expect(validDescriptor(desc(1))).toBe(true);
  });
  it('anything else is refused', () => {
    expect(validDescriptor('')).toBe(false);
    expect(validDescriptor('abc')).toBe(false);
    expect(validDescriptor(desc(1).slice(0, 680))).toBe(false);
    const huge = Buffer.from(new Float32Array(128).fill(1e9).buffer).toString('base64');
    expect(validDescriptor(huge)).toBe(false);
    const nan = Buffer.from(new Float32Array(128).fill(NaN).buffer).toString('base64');
    expect(validDescriptor(nan)).toBe(false);
  });
});

describe('the faces kept for a person', () => {
  it('nothing, or the old form (a plain array of 128 numbers)', () => {
    expect(parseFaceData(null)).toEqual([]);
    expect(parseFaceData('not json')).toEqual([]);
    const old = parseFaceData(JSON.stringify(Array.from({ length: 128 }, () => 0.1)));
    expect(old).toHaveLength(1);
    expect(validDescriptor(old[0].d)).toBe(true);
  });
  it('the photo\'s face is replaced when learnt again; camera ones are added', () => {
    let list = addDescriptor([], { d: desc(1), s: 'photo' });
    list = addDescriptor(list, { d: desc(2), s: 'camera' });
    list = addDescriptor(list, { d: desc(3), s: 'photo' });
    expect(list.map((x) => x.s)).toEqual(['photo', 'camera']);
    expect(list[0].d).toBe(desc(3));
  });
  it('at most 5: the oldest camera face goes, the photo\'s stays', () => {
    let list = addDescriptor([], { d: desc(0), s: 'photo' });
    for (let i = 1; i <= 6; i++) list = addDescriptor(list, { d: desc(i), s: 'camera' });
    expect(list).toHaveLength(MAX);
    expect(list[0].s).toBe('photo');
    expect(list.slice(1).map((x) => x.d)).toEqual([desc(3), desc(4), desc(5), desc(6)]);
  });
  it('round trip', () => {
    const list = addDescriptor([], { d: desc(9), s: 'camera' });
    expect(parseFaceData(stringify(list))).toEqual(list);
  });
});
