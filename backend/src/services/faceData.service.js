/**
 * Face attendance: what is kept of a face.
 *
 * The browser (on the phone or computer) finds the face and turns it into a
 * "descriptor": 128 numbers that are close together for the same person.
 * Only these numbers are kept, never sent anywhere else; matching is done on
 * the phone. A descriptor travels as base64 of 128 float32s (684 characters).
 *
 * FaceEnrollment.descriptor holds { v: 1, list: [{ d, s, at }] }:
 *   s 'photo'  from the person's photo on their record (one, replaced when
 *              learnt again);
 *   s 'camera' taken at the kiosk or the desk (the latest ones, up to 5 in
 *              all): faces as they look today make recognition surer.
 */
const MAX = 5;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** A descriptor as sent: base64 of 128 float32s, every number sensible. */
function validDescriptor(d) {
  if (typeof d !== 'string' || d.length !== 684 || !B64.test(d)) return false;
  const buf = Buffer.from(d, 'base64');
  if (buf.length !== 512) return false;
  const f = new Float32Array(buf.buffer, buf.byteOffset, 128);
  for (const x of f) if (!Number.isFinite(x) || Math.abs(x) > 2) return false;
  return true;
}

/** The kept descriptors of an enrolment (also the old form: a plain array of 128 numbers). */
function parseFaceData(json) {
  if (!json) return [];
  let v;
  try { v = JSON.parse(json); } catch { return []; }
  if (Array.isArray(v) && v.length === 128 && v.every((x) => typeof x === 'number')) {
    return [{ d: Buffer.from(new Float32Array(v).buffer).toString('base64'), s: 'camera', at: null }];
  }
  return Array.isArray(v?.list) ? v.list.filter((x) => validDescriptor(x?.d)) : [];
}

/**
 * The list after adding one: a photo's replaces the earlier photo's; a
 * camera's is added, the oldest camera ones going first beyond 5 in all.
 */
function addDescriptor(list, { d, s }, at = new Date()) {
  const entry = { d, s: s === 'photo' ? 'photo' : 'camera', at: at.toISOString() };
  let next = entry.s === 'photo' ? [entry, ...list.filter((x) => x.s !== 'photo')] : [...list, entry];
  while (next.length > MAX) {
    const i = next.findIndex((x) => x.s !== 'photo');
    next.splice(i < 0 ? 0 : i, 1);
  }
  next = next.slice(0, MAX);
  return next;
}

const stringify = (list) => JSON.stringify({ v: 1, list });

module.exports = { validDescriptor, parseFaceData, addDescriptor, stringify, MAX };
