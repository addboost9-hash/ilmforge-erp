/**
 * IlmForge — the secret link of a machine that is not a ZKTeco in Cloud
 * Server mode: /machine/<key>.
 *
 *   Hikvision face / fingerprint terminals: "HTTP listening" (event push)
 *     pointed at this link. Each recognised face, finger or card is marked.
 *   Any other machine or program: POST (or GET) its punches here, as JSON,
 *     a form, the query string, or text lines (services/punchFormats.js).
 *
 *   GET  /machine/<key>                     "this link is ready" (nothing marked)
 *   GET  /machine/<key>?id=1843&time=…      one punch
 *   POST /machine/<key>                     one or more punches, or a heartbeat
 *
 * The key is made by IlmForge when the machine is added, is shown only to the
 * school's administrator, and can be changed (the old link then stops). It is
 * kept with the ZKTeco serial numbers (deviceRegistry), so last contact and
 * the machine log work the same. No sign-in: a machine cannot sign in.
 * Mounted outside /api, before the JSON parser, with a raw body.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const registry = require('../services/deviceRegistry');
const F = require('../services/punchFormats');
const I = require('../services/punchIntake.service');
const { readSettings } = require('../utils/schoolSettings');
const { dayStart } = require('../services/attendanceMark.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const LINK_KINDS = ['hikvision', 'web'];

async function schoolTz(schoolId) {
  const s = (await readSettings(schoolId)).attendanceDevices || {};
  return /^[+-]\d{2}:\d{2}$/.test(s.timeZone || '') ? s.timeZone : '+05:00';
}

const shorten = (buf, n = 200) => String(Buffer.isBuffer(buf) ? buf.toString('utf8') : buf || '')
  .replace(/[^\x20-\x7E؀-ۿ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

router.all('/:key', wrap(async (req, res) => {
  const key = registry.cleanSerial(req.params.key);
  const found = await registry.lookupSerial(key);
  const dev = found
    ? await prisma.biometricDevice.findFirst({ where: { id: found.deviceId, schoolId: found.schoolId }, select: { id: true, name: true, kind: true, isActive: true, createdAt: true } })
    : null;
  if (!dev || !LINK_KINDS.includes(dev.kind)) {
    return res.status(404).json({ ok: false, message: 'This is not a machine link in IlmForge. Copy the link again from Attendance Tracker → Fingerprint Machines.' });
  }
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const got = F.readPush({ contentType: req.get('content-type') || '', body, query: req.query, method: req.method });

  // Someone opening the link in a browser to check it: nothing to mark.
  if (got.format === 'empty') {
    return res.json({ ok: true, machine: dev.name, message: `This is the link for ${dev.name}. Punches sent here are marked in IlmForge.` });
  }

  registry.touch(key, req);
  const log = (reply, extra) => registry.log(key, {
    method: req.method, path: '/machine', table: got.format, sample: shorten(body.length ? body : new URLSearchParams(req.query).toString()), reply, ...extra,
  });
  if (!dev.isActive) {
    log('switched off', { lines: got.punches.length });
    return res.status(403).json({ ok: false, message: `${dev.name} is switched off in IlmForge.` });
  }
  if (got.heartbeat) {
    log('OK', { note: 'heartbeat: the machine is on' });
    return res.json({ ok: true });
  }
  if (!got.punches.length) {
    const why = [...got.ignored, ...got.bad].slice(0, 3).join('; ') || 'nothing in it';
    log('OK', { lines: 0, note: `nothing marked: ${why}` });
    return res.json({ ok: true, marked: 0, message: `Nothing to mark: ${why}.` });
  }

  const tz = await schoolTz(found.schoolId);
  // As for ZKTeco: punches from before the machine was added (or older than
  // 30 days) are not marked; a log file can be uploaded for older days.
  const since = new Date(Math.max(dayStart(dev.createdAt).getTime(), Date.now() - 30 * 864e5));
  const r = await I.takePunches({ schoolId: found.schoolId, deviceId: dev.id, punches: got.punches, tz, since });

  // A single event sent the moment it happened tells how right the machine's clock is.
  if (got.punches.length === 1 && got.format === 'hikvision' && r.last) registry.clockSample(key, Math.round((Date.now() - r.last.getTime()) / 1000));
  const st = registry.statusOf(key) || {};
  registry.touch(key, req, { lastUpload: Date.now(), punches: (st.punches || 0) + r.marked, ...(r.last ? { lastPunchAt: r.last.getTime() } : {}) });
  if (!st.savedSeen || Date.now() - st.savedSeen > 60e3) {
    registry.touch(key, req, { savedSeen: Date.now() });
    await prisma.biometricDevice.update({ where: { id: dev.id }, data: { lastSyncAt: new Date() } }).catch(() => {});
  }
  const note = `${I.summaryText(r)}${got.ignored.length ? ` · ignored: ${got.ignored.slice(0, 2).join('; ')}` : ''}`;
  log('OK', { lines: got.punches.length, note });
  return res.json({ ok: true, marked: r.marked, already: r.again, notLinked: r.notLinked, message: note });
}));

module.exports = router;
