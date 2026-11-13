/**
 * The school's stamp: a picture of its round or rectangular office stamp,
 * printed beside the principal's signature on roll number slips, result
 * cards, date sheets, fee cards and registers, and the attendance register.
 *
 *   GET /api/v1/stamp   the picture and where it is printed (any staff member
 *                       who prints these: admin, principal, teacher,
 *                       accountant). Not parents or students: a copy of the
 *                       stamp in every family's hands would let anyone
 *                       stamp a paper of their own.
 *   PUT /api/v1/stamp   change it (admin or principal).
 *
 * Kept in School.settingsJson.stamp; no database change.
 */
const express = require('express');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const READERS = ['super_admin', 'admin', 'principal', 'teacher', 'accountant'];
const WRITERS = ['super_admin', 'admin', 'principal'];
const PLACES = ['rollSlips', 'resultCards', 'dateSheets', 'syllabus', 'feeRecords', 'attendanceRegister'];
const DEFAULT_PLACES = Object.fromEntries(PLACES.map((p) => [p, true]));
const PICTURE = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_BYTES = 400 * 1024;

const view = (s) => ({
  image: s?.image || '',
  places: { ...DEFAULT_PLACES, ...(s?.places || {}) },
  updatedAt: s?.updatedAt || null,
});

/** Checks a change; returns { stamp } or { error }. */
function checkStamp(body, current = {}) {
  const next = view(current);
  if (body.image !== undefined) {
    const image = String(body.image || '');
    if (image && !PICTURE.test(image)) return { error: 'The stamp must be a PNG or JPG picture.' };
    if (image.length > MAX_BYTES) return { error: 'The stamp picture is too large: crop it to the stamp and try again.' };
    next.image = image;
  }
  if (body.places !== undefined) {
    if (!body.places || typeof body.places !== 'object' || Array.isArray(body.places)) return { error: 'places must say where the stamp is printed.' };
    for (const [k, v] of Object.entries(body.places)) {
      if (!PLACES.includes(k)) return { error: `Unknown place for the stamp: ${k}.` };
      next.places[k] = !!v;
    }
  }
  return { stamp: next };
}

router.get('/', wrap(async (req, res) => {
  if (!READERS.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Access denied.' });
  const settings = await readSettings(req.schoolId);
  res.json({ success: true, data: view(settings.stamp) });
}));

router.put('/', wrap(async (req, res) => {
  if (!WRITERS.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Only the admin or the principal can change the school stamp.' });
  const settings = await readSettings(req.schoolId);
  const { stamp, error } = checkStamp(req.body || {}, settings.stamp);
  if (error) return res.status(400).json({ success: false, message: error });
  stamp.updatedAt = new Date().toISOString();
  await mergeSettings(req.schoolId, { stamp });
  res.json({ success: true, data: view(stamp), message: stamp.image ? 'School stamp saved.' : 'School stamp removed.' });
}));

router.helpers = { checkStamp, PLACES };
module.exports = router;
