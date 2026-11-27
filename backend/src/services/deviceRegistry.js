/**
 * Fingerprint machines known to IlmForge, by serial number.
 *
 * A machine in "Cloud server / ADMS" mode identifies itself only by its
 * serial number (SN). Each school lists its machines' serial numbers in its
 * settings (settingsJson.biometricSerials = { SN: BiometricDevice id }), so
 * a punch from a machine is saved for the school that added it and for no
 * other. A machine that nobody has added is refused, and its punches stay on
 * the machine until it is added.
 *
 * What changes every few seconds (last contact, the last exchanges, the
 * clock check) is kept in memory, not written to the database. Work waiting
 * for a machine is in the database (DeviceCommand).
 */
const prisma = require('../config/prisma');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');

const SN_RE = /^[A-Za-z0-9_-]{3,40}$/;
const cleanSerial = (v) => String(v ?? '').trim().toUpperCase();

const cache = new Map(); // SN -> { schoolId, deviceId, at }
const status = new Map(); // SN -> { lastSeen, ip, pushver, lastUpload, punches, refused, info, lags, clockOffsetSec }

async function lookupSerial(sn) {
  const key = cleanSerial(sn);
  if (!SN_RE.test(key)) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60e3) return hit.schoolId ? hit : null;
  // Schools whose settings mention this serial, then the exact entry.
  const schools = await prisma.school.findMany({ where: { settingsJson: { contains: `"${key}"` } }, select: { id: true, settingsJson: true } });
  let found = null;
  for (const s of schools) {
    let j = {};
    try { j = JSON.parse(s.settingsJson || '{}') || {}; } catch { j = {}; }
    const deviceId = j.biometricSerials?.[key];
    if (deviceId) { found = { schoolId: s.id, deviceId: Number(deviceId) }; break; }
  }
  if (!cache.has(key)) trim(cache, (v) => v.at || 0);
  cache.set(key, { ...(found || { schoolId: null }), at: Date.now() });
  return found;
}

async function serialsOf(schoolId) {
  return (await readSettings(schoolId)).biometricSerials || {};
}
async function serialOf(schoolId, deviceId) {
  const map = await serialsOf(schoolId);
  return Object.keys(map).find((k) => Number(map[k]) === Number(deviceId)) || null;
}

/* Add a machine's serial number for this school. It cannot belong to two. */
async function registerSerial(schoolId, sn, deviceId) {
  const key = cleanSerial(sn);
  if (!SN_RE.test(key)) return { error: 'The serial number is letters and digits, as on the machine (Menu → System Info → Device Info).' };
  const other = await lookupSerial(key);
  if (other && other.schoolId !== schoolId) return { error: 'This machine is already added to another school.' };
  const map = await serialsOf(schoolId);
  if (map[key] && Number(map[key]) !== Number(deviceId)) return { error: 'This serial number is already added here.' };
  await mergeSettings(schoolId, { biometricSerials: { ...map, [key]: deviceId } });
  cache.delete(key);
  return { serial: key };
}

async function unregisterSerial(schoolId, deviceId) {
  const map = await serialsOf(schoolId);
  const keys = Object.keys(map).filter((k) => Number(map[k]) === Number(deviceId));
  if (!keys.length) return;
  keys.forEach((k) => { delete map[k]; cache.delete(k); logs.delete(k); });
  await mergeSettings(schoolId, { biometricSerials: map });
}

/* The address is open to anyone: made-up serial numbers must not fill the
   memory. Past the limit, the longest-silent entries go. */
const LIMIT = 2000;
function trim(map, stamp) {
  if (map.size <= LIMIT) return;
  const oldest = [...map.entries()].sort((a, b) => stamp(a[1]) - stamp(b[1])).slice(0, map.size - LIMIT);
  oldest.forEach(([k]) => map.delete(k));
}

function touch(sn, req, patch = {}) {
  const key = cleanSerial(sn);
  if (!SN_RE.test(key)) return;
  const s = status.get(key) || { punches: 0 };
  if (!status.has(key)) trim(status, (v) => v.lastSeen || 0);
  status.set(key, { ...s, lastSeen: Date.now(), ip: String(req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '').replace(/^::ffff:/, ''), ...patch });
}
const statusOf = (sn) => status.get(cleanSerial(sn)) || null;
/* Change what is known about a machine without counting it as contact. */
function patch(sn, obj) {
  const key = cleanSerial(sn);
  if (!SN_RE.test(key)) return;
  status.set(key, { punches: 0, ...(status.get(key) || {}), ...obj });
}

/* Machines that called in recently but are not added to any school. */
async function unregisteredSeen(withinMs = 30 * 60e3) {
  const out = [];
  for (const [sn, s] of status) {
    if (Date.now() - s.lastSeen > withinMs) continue;
    if (!(await lookupSerial(sn))) out.push({ serial: sn, lastSeen: new Date(s.lastSeen), ip: s.ip });
  }
  return out;
}

/* The last exchanges with each machine, for the office to see what a
   machine is saying when something does not work (templates cut out). */
const logs = new Map(); // SN -> [{ at, method, path, table, lines, reply, sample }]
function log(sn, entry) {
  const key = cleanSerial(sn);
  if (!SN_RE.test(key)) return;
  const list = logs.get(key) || [];
  if (!logs.has(key)) trim(logs, (v) => v[v.length - 1]?.at || 0);
  list.push({ at: Date.now(), ...entry });
  if (list.length > 60) list.splice(0, list.length - 60);
  logs.set(key, list);
}
const logOf = (sn) => [...(logs.get(cleanSerial(sn)) || [])].reverse();

/* The machine's clock against ours. A punch sent the moment it happens
   (one or two lines) shows the difference; a delayed upload only makes the
   clock look slow, so the smallest of the last few counts. */
function clockSample(sn, lagSec) {
  const key = cleanSerial(sn);
  const s = status.get(key);
  if (!s) return null;
  const lags = [...(s.lags || []), lagSec].slice(-6);
  let offsetSec = null;
  const ahead = lags.filter((l) => l < -120);
  if (ahead.length) offsetSec = Math.max(...ahead); // negative: the machine is fast
  else if (lags.length >= 3 && Math.min(...lags) > 300) offsetSec = Math.min(...lags); // positive: slow
  else if (lags.length >= 3) offsetSec = 0;
  status.set(key, { ...s, lags, ...(offsetSec !== null ? { clockOffsetSec: offsetSec, clockAt: Date.now() } : {}) });
  return offsetSec;
}

/* "Fetch punches again" may bring older punches than the machine's own
   start in IlmForge: allowed for a while after it was asked. */
function allowOld(sn, ms = 30 * 60e3) {
  const key = cleanSerial(sn);
  const s = status.get(key) || { punches: 0 };
  status.set(key, { ...s, oldUntil: Date.now() + ms });
}
const oldAllowed = (sn) => (status.get(cleanSerial(sn))?.oldUntil || 0) > Date.now();

/* "Get users and fingers from the machine": the next settings the machine
   reads say "send everything", once. */
function wantEverything(sn, on = true) {
  const key = cleanSerial(sn);
  const s = status.get(key) || { punches: 0 };
  status.set(key, { ...s, everything: on ? Date.now() + 30 * 60e3 : 0 });
}
const everythingWanted = (sn) => (status.get(cleanSerial(sn))?.everything || 0) > Date.now();

module.exports = {
  cleanSerial, lookupSerial, serialsOf, registerSerial, unregisterSerial, serialOf,
  touch, patch, statusOf, unregisteredSeen, log, logOf, clockSample, allowOld, oldAllowed, wantEverything, everythingWanted,
};
