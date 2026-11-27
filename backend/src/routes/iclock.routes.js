/**
 * IlmForge — fingerprint machines in "Cloud server" (ADMS / push) mode.
 *
 * ZKTeco machines (K40, MB20, MB160, F18, uFace, SpeedFace and others with
 * an "ADMS" or "Cloud Server Setting" menu) are pointed at this server's
 * address. They then call these addresses on their own; no software runs
 * on the school's computer:
 *
 *   GET  /iclock/cdata?SN=…&options=all    the machine starts: send it its settings
 *   POST /iclock/cdata?SN=…&table=ATTLOG   punches: "PIN<TAB>2026-10-16 07:52:10<TAB>status<TAB>verify…"
 *   POST /iclock/cdata?SN=…&table=OPERLOG  users, fingerprints and faces enrolled on the machine
 *                                          (USER / FP / FACE lines), and its own log
 *   POST /iclock/cdata?SN=…&table=BIODATA  fingerprints and faces (push 3 machines)
 *   GET  /iclock/getrequest?SN=…&INFO=…    every few seconds: its details, and any work for it?
 *   POST /iclock/devicecmd?SN=…            the answers to that work
 *   POST /iclock/querydata?SN=…            answers to "send me your users" (push 3)
 *
 * The machine's user number (PIN) is linked to a student or staff member
 * (BiometricUser): IlmForge's Device ID (1<student no.> / 2<staff no.>), the
 * roll number / employee code, or a link the office made for a machine
 * that had users before IlmForge. Punches from a PIN nobody is linked to are
 * kept and marked when it is linked. A machine must be added to the school
 * (its serial number) first; until then its punches are refused and stay on
 * the machine to be sent later.
 *
 * Mounted outside /api and without sign-in (a machine cannot sign in), with
 * its own text body parser.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const registry = require('../services/deviceRegistry');
const M = require('../services/biometricMachines.service');
const P = require('../services/biometricProtocol');
const { markPass } = require('../services/attendanceDevice.service');
const { readSettings } = require('../utils/schoolSettings');
const { dayStart } = require('../services/attendanceMark.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const text = (res, body, code = 200) => res.status(code).type('text/plain').send(body);

// Verify modes ZKTeco reports: 1 finger, 15 face, 2/4 card, 0 password.
const METHOD = { 0: 'password', 1: 'fingerprint', 2: 'card', 3: 'password', 4: 'card', 15: 'face', 25: 'face' };

/* "2026-10-16 07:52:10" from the machine is its own clock, set to the
   school's time zone (Pakistan unless the school chose another). */
function deviceTime(stamp, tz) {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/.exec(String(stamp || '').trim());
  if (!m) return null;
  const t = new Date(`${m[1]}T${m[2].length === 5 ? `${m[2]}:00` : m[2]}${tz}`);
  return Number.isNaN(t.getTime()) ? null : t;
}

/* One ATTLOG line: tab separated; some firmware separates with spaces. */
function parsePunch(line) {
  const parts = line.includes('\t') ? line.split('\t') : line.trim().split(/\s+/);
  if (line.includes('\t')) return { pin: parts[0]?.trim(), stamp: parts[1], state: parts[2], verify: parts[3] };
  // PIN DATE TIME STATUS VERIFY …
  return { pin: parts[0], stamp: `${parts[1]} ${parts[2]}`, state: parts[3], verify: parts[4] };
}

/* TimeZone in the machine's settings: hours, or minutes for half hours. */
function tzOption(tz) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(tz || '+05:00') || ['', '+', '05', '00'];
  const mins = (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
  return mins % 60 === 0 ? String(mins / 60) : String(mins);
}

const options = (sn, { tz = '+05:00', everything = false } = {}) => [
  `GET OPTION FROM: ${sn}`,
  'ATTLOGStamp=None',
  // 0 = "send every user and fingerprint you have" (asked for by the office)
  `OPERLOGStamp=${everything ? 0 : 9999}`,
  'ATTPHOTOStamp=None',
  'ErrorDelay=30',
  'Delay=10',
  'TransTimes=00:00;14:05',
  'TransInterval=1',
  // Punches, and users / fingerprints / faces as they are enrolled or changed.
  'TransFlag=TransData AttLog\tOpLog\tEnrollUser\tChgUser\tEnrollFP\tChgFP\tFACE',
  `TimeZone=${tzOption(tz)}`,
  'Realtime=1',
  'Encrypt=None',
  // older firmware reads these names
  'Stamp=None',
  `OpStamp=${everything ? 0 : 9999}`,
  'PhotoStamp=None',
].join('\n');

async function schoolTz(schoolId) {
  const s = (await readSettings(schoolId)).attendanceDevices || {};
  return /^[+-]\d{2}:\d{2}$/.test(s.timeZone || '') ? s.timeZone : '+05:00';
}

/* The machine's details (users, fingers, firmware…) kept on its row, at
   most every five minutes or when they change. */
async function keepInfo(sn, device, patch) {
  const st = registry.statusOf(sn) || {};
  const info = { ...(st.info || {}), ...patch };
  const old = st.info || {};
  const changed = JSON.stringify(info) !== JSON.stringify(old);
  // What says how to talk to it (versions, firmware) is saved at once; its
  // counts change with every punch and are saved at most once a minute.
  const key = ['pushver', 'fpVersion', 'faceVersion', 'firmware', 'model'].some((k) => info[k] !== undefined && info[k] !== old[k]);
  registry.patch(sn, { info });
  const since = Date.now() - (st.infoSavedAt || 0);
  if (!device || (!key && (since < 60e3 || (!changed && since < 5 * 60e3)))) return;
  registry.patch(sn, { infoSavedAt: Date.now() });
  const row = await prisma.biometricDevice.findUnique({ where: { id: device.deviceId }, select: { infoJson: true } }).catch(() => null);
  const saved = M.deviceInfo(row || {});
  await prisma.biometricDevice.update({ where: { id: device.deviceId }, data: { infoJson: JSON.stringify({ ...saved, ...info }), infoAt: new Date() } }).catch(() => {});
}

const logIt = (sn, req, reply, extra = {}) => registry.log(sn, {
  method: req.method, path: req.path, table: req.query.table || req.query.tablename || '', ...extra, reply: P.redact(reply, 120),
});

router.get('/cdata', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  if (!sn) return text(res, 'ERROR: no SN', 400);
  registry.touch(sn, req, req.query.pushver ? { pushver: String(req.query.pushver) } : {});
  if (String(req.query.type || '').toLowerCase() === 'time') return text(res, `Time=${new Date().toISOString()}`);
  const device = await registry.lookupSerial(sn);
  const everything = registry.everythingWanted(sn);
  const body = options(sn, { tz: device ? await schoolTz(device.schoolId) : '+05:00', everything });
  if (everything) registry.wantEverything(sn, false);
  if (device && req.query.pushver) await keepInfo(sn, device, { pushver: String(req.query.pushver).slice(0, 12) });
  logIt(sn, req, body.split('\n')[0], { note: everything ? 'settings: send everything' : 'settings' });
  return text(res, body);
}));

/* Users, fingerprints and faces: kept for a machine that is added and on. */
async function ingest(req, res, sn, lines) {
  const device = await registry.lookupSerial(sn);
  if (!device) { logIt(sn, req, `OK: ${lines.length}`, { lines: lines.length, note: 'not added: ignored' }); return text(res, `OK: ${lines.length}`); }
  const dev = await prisma.biometricDevice.findFirst({ where: { id: device.deviceId, schoolId: device.schoolId }, select: { id: true, isActive: true, infoJson: true } });
  if (!dev || !dev.isActive) return text(res, `OK: ${lines.length}`);
  const info = { ...M.deviceInfo(dev), ...(registry.statusOf(sn)?.info || {}) };
  const r = await M.ingestRecords(device.schoolId, device.deviceId, lines, info);
  logIt(sn, req, `OK: ${lines.length}`, { lines: lines.length, sample: P.redact(lines[0], 200), note: `${r.users} users, ${r.templates} fingers/faces` });
  return text(res, `OK: ${lines.length}`);
}

router.post('/cdata', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  if (!sn) return text(res, 'ERROR: no SN', 400);
  registry.touch(sn, req);
  const body = typeof req.body === 'string' ? req.body : '';
  const table = String(req.query.table || '').toUpperCase();
  const lines = body.split(/\r?\n/).map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  if (['OPERLOG', 'BIODATA', 'USERINFO', 'FINGERTMP', 'FACE', 'USER'].includes(table)) return ingest(req, res, sn, lines);
  if (table !== 'ATTLOG') { logIt(sn, req, `OK: ${lines.length}`, { lines: lines.length }); return text(res, `OK: ${lines.length}`); }

  const device = await registry.lookupSerial(sn);
  if (!device) {
    registry.touch(sn, req, { refused: (registry.statusOf(sn)?.refused || 0) + lines.length });
    // Not OK: the machine keeps these punches and sends them again later.
    const reply = 'ERROR: this machine is not added in IlmForge (Attendance → Fingerprint machines)';
    logIt(sn, req, reply, { lines: lines.length, sample: lines[0] });
    return text(res, reply, 403);
  }
  const tz = await schoolTz(device.schoolId);
  const dev = await prisma.biometricDevice.findFirst({ where: { id: device.deviceId, schoolId: device.schoolId }, select: { id: true, isActive: true, createdAt: true } });
  if (!dev || !dev.isActive) { logIt(sn, req, 'switched off', { lines: lines.length }); return text(res, 'ERROR: this machine is switched off in IlmForge', 403); }

  // Older punches than the machine's start in IlmForge would fill in past
  // days nobody asked for, unless the office asked to fetch them again.
  const monthAgo = Date.now() - 30 * 864e5;
  const since = new Date(registry.oldAllowed(sn) ? monthAgo : Math.max(dayStart(dev.createdAt).getTime(), monthAgo));
  let saved = 0;
  let unknown = 0;
  let newest = null;
  for (const line of lines) {
    const p = parsePunch(line);
    const at = deviceTime(p.stamp, tz);
    const pin = P.cleanPin(p.pin);
    if (!pin || !at || at < since) continue;
    if (!newest || at > newest) newest = at;
    const method = METHOD[parseInt(p.verify, 10)] || 'fingerprint';
    const found = await M.personForPin(device.schoolId, pin);
    if (found.error) {
      // Someone on the machine who is not linked to anyone yet: kept.
      if (await M.keepUnmatched({ schoolId: device.schoolId, deviceId: device.deviceId, pin, at, method })) unknown++;
      continue;
    }
    const r = await markPass({ schoolId: device.schoolId, kind: found.kind, person: found.person, at, method, deviceId: device.deviceId });
    if (!r.error && !r.duplicate) saved++;
  }
  // A punch sent the moment it happened tells how right the machine's clock is.
  if (newest && lines.length <= 2) registry.clockSample(sn, Math.round((Date.now() - newest.getTime()) / 1000));
  const st = registry.statusOf(sn) || {};
  registry.touch(sn, req, { lastUpload: Date.now(), punches: (st.punches || 0) + saved, ...(newest ? { lastPunchAt: newest.getTime() } : {}) });
  // Last contact on the device's row, at most once a minute.
  if (!st.savedSeen || Date.now() - st.savedSeen > 60e3) {
    registry.touch(sn, req, { savedSeen: Date.now() });
    await prisma.biometricDevice.update({ where: { id: device.deviceId }, data: { lastSyncAt: new Date() } }).catch(() => {});
  }
  logIt(sn, req, `OK: ${lines.length}`, { lines: lines.length, sample: lines[0], note: `${saved} marked${unknown ? `, ${unknown} not linked` : ''}` });
  return text(res, `OK: ${lines.length}`);
}));

// The machine asks for work, and says how it is (INFO).
router.get('/getrequest', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  if (!sn) return text(res, 'OK');
  registry.touch(sn, req);
  const device = await registry.lookupSerial(sn);
  const info = P.parseInfo(req.query.INFO);
  if (info) await keepInfo(sn, device, info);
  if (!device) return text(res, 'OK');
  const st = registry.statusOf(sn) || {};
  if (!st.savedSeen || Date.now() - st.savedSeen > 60e3) {
    registry.touch(sn, req, { savedSeen: Date.now() });
    await prisma.biometricDevice.update({ where: { id: device.deviceId }, data: { lastSyncAt: new Date() } }).catch(() => {});
  }
  const dev = await prisma.biometricDevice.findFirst({ where: { id: device.deviceId, schoolId: device.schoolId }, select: { isActive: true } });
  if (!dev?.isActive) return text(res, 'OK');
  const cmds = await M.nextFor(device.deviceId);
  if (!cmds.length) return text(res, 'OK');
  const reply = cmds.map((c) => `C:${c.id}:${c.cmd}`).join('\n');
  logIt(sn, req, `${cmds.length} command${cmds.length === 1 ? '' : 's'}`, { sample: P.redact(cmds[0].cmd, 160) });
  return text(res, reply);
}));

// "ID=12&Return=0&CMD=DATA" per line: 0 or more is done, below 0 failed.
router.post('/devicecmd', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  const body = typeof req.body === 'string' ? req.body : '';
  if (sn) registry.touch(sn, req);
  const device = sn ? await registry.lookupSerial(sn) : null;
  const { results, info } = P.parseCmdResults(body);
  if (device && results.length) await M.answered(device.schoolId, device.deviceId, results);
  if (info && sn) await keepInfo(sn, device, info);
  if (sn) logIt(sn, req, 'OK', { lines: results.length, note: results.map((r) => `#${r.id} ${r.ret >= 0 ? 'done' : `refused ${r.ret}`}`).slice(0, 6).join(', ') });
  return text(res, 'OK');
}));

// Push 3 machines answer "send me your users / fingerprints" here.
router.post('/querydata', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  if (!sn) return text(res, 'OK');
  registry.touch(sn, req);
  const body = typeof req.body === 'string' ? req.body : '';
  const lines = body.split(/\r?\n/).filter((l) => l.trim());
  return ingest(req, res, sn, lines);
}));

// Anything else a machine may call (ping, registry, push…): acknowledged.
router.all(/.*/, (req, res) => {
  if (req.query.SN) { registry.touch(req.query.SN, req); logIt(req.query.SN, req, 'OK'); }
  return text(res, 'OK');
});

module.exports = router;
module.exports.parsePunch = parsePunch;
module.exports.deviceTime = deviceTime;
module.exports.tzOption = tzOption;
