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
 * What changes every few seconds (last contact, commands waiting for the
 * machine) is kept in memory, not written to the database.
 */
const prisma = require('../config/prisma');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');

const SN_RE = /^[A-Za-z0-9_-]{3,40}$/;
const cleanSerial = (v) => String(v ?? '').trim().toUpperCase();

const cache = new Map(); // SN -> { schoolId, deviceId, at }
const status = new Map(); // SN -> { lastSeen, ip, pushver, lastUpload, punches, refused }
const queues = new Map(); // SN -> [{ id, cmd }]
const results = new Map(); // SN -> { sent, ok, failed, total, lastError }
let cmdSeq = 1;

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
  keys.forEach((k) => { delete map[k]; cache.delete(k); queues.delete(k); });
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

/* Machines that called in recently but are not added to any school. */
async function unregisteredSeen(withinMs = 30 * 60e3) {
  const out = [];
  for (const [sn, s] of status) {
    if (Date.now() - s.lastSeen > withinMs) continue;
    if (!(await lookupSerial(sn))) out.push({ serial: sn, lastSeen: new Date(s.lastSeen), ip: s.ip });
  }
  return out;
}

function queue(sn, cmds) {
  const key = cleanSerial(sn);
  const list = queues.get(key) || [];
  for (const cmd of cmds) list.push({ id: cmdSeq++, cmd });
  queues.set(key, list);
  const r = results.get(key) || { sent: 0, ok: 0, failed: 0, total: 0 };
  results.set(key, { ...r, total: r.total + cmds.length });
  return list.length;
}
function take(sn, max = 40) {
  const key = cleanSerial(sn);
  const list = queues.get(key) || [];
  const out = list.splice(0, max);
  if (out.length) {
    const r = results.get(key) || { sent: 0, ok: 0, failed: 0, total: 0 };
    results.set(key, { ...r, sent: r.sent + out.length });
  }
  return out;
}
function answered(sn, ok, error) {
  const key = cleanSerial(sn);
  const r = results.get(key) || { sent: 0, ok: 0, failed: 0, total: 0 };
  results.set(key, { ...r, ok: r.ok + (ok ? 1 : 0), failed: r.failed + (ok ? 0 : 1), ...(error ? { lastError: error } : {}) });
}
const pendingOf = (sn) => (queues.get(cleanSerial(sn)) || []).length;
const resultsOf = (sn) => results.get(cleanSerial(sn)) || null;
function resetResults(sn) { results.delete(cleanSerial(sn)); }

module.exports = {
  cleanSerial, lookupSerial, serialsOf, registerSerial, unregisterSerial,
  touch, statusOf, unregisteredSeen, queue, take, answered, pendingOf, resultsOf, resetResults,
};
