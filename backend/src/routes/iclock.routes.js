/**
 * IlmForge — fingerprint machines in "Cloud server" (ADMS / push) mode.
 *
 * ZKTeco machines (K40, MB20, MB160, F18, uFace, SpeedFace and others with
 * an "ADMS" or "Cloud Server Setting" menu) are pointed at this server's
 * address. They then call these addresses on their own; no software runs
 * on the school's computer:
 *
 *   GET  /iclock/cdata?SN=…&options=all   the machine starts: send it its settings
 *   POST /iclock/cdata?SN=…&table=ATTLOG  punches: "PIN<TAB>2026-10-16 07:52:10<TAB>status<TAB>verify…"
 *   POST /iclock/cdata?SN=…&table=OPERLOG the machine's own log (users enrolled…): acknowledged
 *   GET  /iclock/getrequest?SN=…          every few seconds: any commands? (sending users)
 *   POST /iclock/devicecmd?SN=…           results of those commands
 *
 * The machine's user number (PIN) is the person's Device ID in IlmForge
 * (1<student no.> / 2<staff no.>) or their roll number / employee code.
 * The machine must be added to the school (its serial number) first; until
 * then its punches are refused and stay on the machine to be sent later.
 *
 * Mounted outside /api and without sign-in (a machine cannot sign in), with
 * its own text body parser.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const registry = require('../services/deviceRegistry');
const { findPerson, markPass } = require('../services/attendanceDevice.service');
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

const options = (sn) => [
  `GET OPTION FROM: ${sn}`,
  'ATTLOGStamp=None',
  'OPERLOGStamp=9999',
  'ATTPHOTOStamp=None',
  'ErrorDelay=30',
  'Delay=10',
  'TransTimes=00:00;14:05',
  'TransInterval=1',
  'TransFlag=TransData AttLog\tOpLog\tEnrollUser\tChgUser',
  'TimeZone=5',
  'Realtime=1',
  'Encrypt=None',
  // older firmware reads these names
  'Stamp=None',
  'OpStamp=9999',
  'PhotoStamp=None',
].join('\n');

router.get('/cdata', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  if (!sn) return text(res, 'ERROR: no SN', 400);
  registry.touch(sn, req, req.query.pushver ? { pushver: String(req.query.pushver) } : {});
  if (String(req.query.type || '').toLowerCase() === 'time') return text(res, `Time=${new Date().toISOString()}`);
  return text(res, options(sn));
}));

router.post('/cdata', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  if (!sn) return text(res, 'ERROR: no SN', 400);
  registry.touch(sn, req);
  const body = typeof req.body === 'string' ? req.body : '';
  const table = String(req.query.table || '').toUpperCase();
  const lines = body.split(/\r?\n/).map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  if (table !== 'ATTLOG') return text(res, `OK: ${lines.length}`);

  const device = await registry.lookupSerial(sn);
  if (!device) {
    registry.touch(sn, req, { refused: (registry.statusOf(sn)?.refused || 0) + lines.length });
    // Not OK: the machine keeps these punches and sends them again later.
    return text(res, 'ERROR: this machine is not added in IlmForge (Attendance → Fingerprint machines)', 403);
  }
  const s = (await readSettings(device.schoolId)).attendanceDevices || {};
  const tz = /^[+-]\d{2}:\d{2}$/.test(s.timeZone || '') ? s.timeZone : '+05:00';
  const dev = await prisma.biometricDevice.findFirst({ where: { id: device.deviceId, schoolId: device.schoolId }, select: { id: true, isActive: true, createdAt: true } });
  if (!dev || !dev.isActive) return text(res, 'ERROR: this machine is switched off in IlmForge', 403);

  const since = new Date(Math.max(dayStart(dev.createdAt).getTime(), Date.now() - 31 * 864e5));
  let saved = 0;
  for (const line of lines) {
    const p = parsePunch(line);
    const at = deviceTime(p.stamp, tz);
    // A line that cannot be read, or from before the machine was added to
    // IlmForge (its old records would fill in past days nobody asked for).
    if (!p.pin || !at || at < since) continue;
    const found = await findPerson(device.schoolId, p.pin);
    if (found.error) continue; // a user on the machine who is not in IlmForge
    const r = await markPass({
      schoolId: device.schoolId, kind: found.kind, person: found.person, at,
      method: METHOD[parseInt(p.verify, 10)] || 'fingerprint', deviceId: device.deviceId,
    });
    if (!r.error && !r.duplicate) saved++;
  }
  const st = registry.statusOf(sn) || {};
  registry.touch(sn, req, { lastUpload: Date.now(), punches: (st.punches || 0) + saved });
  // Last contact on the device's row, at most once a minute.
  if (!st.savedSeen || Date.now() - st.savedSeen > 60e3) {
    registry.touch(sn, req, { savedSeen: Date.now() });
    await prisma.biometricDevice.update({ where: { id: device.deviceId }, data: { lastSyncAt: new Date() } }).catch(() => {});
  }
  return text(res, `OK: ${lines.length}`);
}));

// The machine asks for work: the people to put on it, a few at a time.
router.get('/getrequest', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  if (!sn) return text(res, 'OK');
  registry.touch(sn, req);
  const st = registry.statusOf(sn) || {};
  if (!st.savedSeen || Date.now() - st.savedSeen > 60e3) {
    registry.touch(sn, req, { savedSeen: Date.now() });
    const device = await registry.lookupSerial(sn);
    if (device) await prisma.biometricDevice.update({ where: { id: device.deviceId }, data: { lastSyncAt: new Date() } }).catch(() => {});
  }
  const cmds = registry.take(sn, 40);
  if (!cmds.length) return text(res, 'OK');
  return text(res, cmds.map((c) => `C:${c.id}:${c.cmd}`).join('\n'));
}));

// "ID=12&Return=0&CMD=DATA" per line: 0 or more is done, below 0 failed.
router.post('/devicecmd', wrap(async (req, res) => {
  const sn = registry.cleanSerial(req.query.SN);
  const body = typeof req.body === 'string' ? req.body : '';
  for (const line of body.split(/\r?\n/).filter(Boolean)) {
    const ret = /Return=(-?\d+)/.exec(line);
    if (ret) registry.answered(sn, parseInt(ret[1], 10) >= 0, parseInt(ret[1], 10) < 0 ? `code ${ret[1]}` : null);
  }
  return text(res, 'OK');
}));

// Anything else a machine may call (ping, registry, push…): acknowledged.
router.all(/.*/, (req, res) => {
  if (req.query.SN) registry.touch(req.query.SN, req);
  return text(res, 'OK');
});

module.exports = router;
module.exports.parsePunch = parsePunch;
module.exports.deviceTime = deviceTime;
