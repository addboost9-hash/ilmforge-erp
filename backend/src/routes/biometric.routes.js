/**
 * IlmForge — fingerprint machines: setting up, running and checking them.
 *
 * Machines
 *   GET    /biometric/connection          what to type into the machine (address, port, HTTPS)
 *   GET    /biometric/devices             the school's machines: live status, health, work in progress
 *   POST   /biometric/devices             add one by serial number                       (admin)
 *   PUT    /biometric/devices/:id         rename, move, switch off                        (admin)
 *   DELETE /biometric/devices/:id                                                        (admin)
 *   GET    /biometric/unregistered        machines calling in but not added              (admin, desktop)
 *   POST   /biometric/devices/:id/send-people    names and Device IDs onto the machine   (admin)
 *   POST   /biometric/devices/:id/send-fingers   kept fingerprints and faces onto it     (admin)
 *   POST   /biometric/devices/:id/fetch-punches  punches of chosen days, again           (admin)
 *   POST   /biometric/devices/:id/fetch-users    its users, fingerprints and faces       (admin)
 *   GET    /biometric/devices/:id/left           users on it who left the school         (admin)
 *   POST   /biometric/devices/:id/remove-left    take them off                           (admin)
 *   POST   /biometric/devices/:id/enrol          start enrolling someone's finger on it  (admin)
 *   POST   /biometric/devices/:id/command        info | clock | reboot                   (admin)
 *   POST   /biometric/devices/:id/cancel         stop the work still waiting             (admin)
 *   GET    /biometric/devices/:id/commands       the latest work and the machine's answers
 *   GET    /biometric/devices/:id/log            the latest exchanges with the machine   (admin)
 * People
 *   GET    /biometric/people              students and staff: Device ID, on the machines, fingers kept
 *   GET    /biometric/machine-users       users on the machines, linked or not, with suggestions (admin)
 *   POST   /biometric/machine-users/link | unlink | link-sure                           (admin)
 * Punches
 *   POST   /biometric/simulate            a test punch without a machine                  (admin)
 *   POST   /biometric/punch               a punch from another system (rollNo / code)
 *   GET    /biometric/punches             today's punches with names
 *   GET    /biometric/punch-log           any days, filtered, page by page
 * Rules
 *   GET    /biometric/settings, PUT       late times, gap, time zone, auto-absent, shifts  (PUT: admin)
 *   GET    /biometric/auto-absent         today's state; POST run | undo                  (admin)
 *   GET    /biometric/timesheet           staff month against their shifts; PUT a fix     (admin)
 *
 * The machines themselves talk to /iclock (routes/iclock.routes.js).
 */
const express = require('express');
const os = require('os');
const router = express.Router();
const prisma = require('../config/prisma');
const registry = require('../services/deviceRegistry');
const M = require('../services/biometricMachines.service');
const P = require('../services/biometricProtocol');
const rulesSvc = require('../services/attendanceRules.service');
const {
  findPerson, markPass, devicePin, deviceSettings, isClock, personView, STUDENT_SELECT, STAFF_SELECT,
} = require('../services/attendanceDevice.service');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');
const { dayStart } = require('../services/attendanceMark.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const ADMIN = ['super_admin', 'admin', 'principal'];
const adminOnly = (req, res, next) => (ADMIN.includes(req.user?.role)
  ? next() : bad(res, 'Only the administrator can do this.', 403));
const isDesktop = () => process.env.ILMFORGE_DESKTOP === '1';
const text = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
const ymdOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());

/* This computer's addresses on the school network (desktop edition). */
function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push(a.address);
    }
  }
  const rank = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  return out.sort((x, y) => rank(x) - rank(y));
}

// What the machine's "Cloud Server Setting" needs.
router.get('/connection', wrap(async (req, res) => {
  if (isDesktop()) {
    const lan = process.env.HOST === '0.0.0.0';
    const port = parseInt(process.env.PORT, 10) || 8090;
    return res.json({
      success: true,
      data: {
        edition: 'desktop', lanOn: lan, port, https: false,
        addresses: lan ? lanAddresses() : [],
        note: lan
          ? 'Type one of these addresses and the port into the machine. The machine and this computer must be on the same network.'
          : 'The machine cannot reach this computer yet. Turn on "Other computers and phones in the school" in Settings → This Computer (or the menu School network → "Let other computers and phones in the school use IlmForge"), then open this page again.',
      },
    });
  }
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  const https = req.secure || String(req.get('x-forwarded-proto') || '').includes('https');
  return res.json({
    success: true,
    data: {
      edition: 'online', host: host.replace(/:\d+$/, ''), port: https ? 443 : (parseInt(host.split(':')[1], 10) || 80), https,
      note: 'The machine needs the internet. Turn on HTTPS (or "SSL") in its Cloud Server Setting and enter the address without https://.',
    },
  });
}));

/* ══ Machines ══ */

const ONLINE_MS = 2 * 60e3;
async function deviceRows(schoolId) {
  const today = dayStart(new Date());
  const [rows, serials] = await Promise.all([
    prisma.biometricDevice.findMany({ where: { schoolId }, orderBy: { createdAt: 'asc' } }),
    registry.serialsOf(schoolId),
  ]);
  const ids = rows.map((r) => r.id);
  const [counts, unknown, linkedOn] = await Promise.all([
    prisma.biometricPunch.groupBy({ by: ['deviceId'], where: { schoolId, punchTime: { gte: today }, deviceId: { in: ids }, matched: true }, _count: { _all: true } }).catch(() => []),
    prisma.biometricPunch.groupBy({ by: ['deviceId'], where: { schoolId, punchTime: { gte: today }, deviceId: { in: ids }, matched: false }, _count: { _all: true } }).catch(() => []),
    prisma.biometricUser.findMany({ where: { schoolId, onDevices: { not: null } }, select: { onDevices: true, personId: true, fingers: true } }),
  ]);
  const C = new Map(counts.map((c) => [c.deviceId, c._count._all]));
  const U = new Map(unknown.map((c) => [c.deviceId, c._count._all]));
  const out = [];
  for (const d of rows) {
    const serial = Object.keys(serials).find((k) => Number(serials[k]) === d.id) || null;
    const st = serial ? registry.statusOf(serial) : null;
    const lastSeen = st?.lastSeen ? new Date(st.lastSeen) : d.lastSyncAt;
    const info = { ...M.deviceInfo(d), ...(st?.info || {}) };
    const mine = linkedOn.filter((u) => M.listOf(u.onDevices).includes(d.id));
    const { infoJson, ...rest } = d;
    out.push({
      ...rest, serialNo: serial, lastSeen,
      online: !!(lastSeen && Date.now() - new Date(lastSeen).getTime() < ONLINE_MS),
      ip: st?.ip || info.ip || null, pushver: st?.pushver || info.pushver || null,
      info: {
        model: info.model || null, firmware: info.firmware || null, users: info.users ?? null, fingers: info.fingers ?? null,
        faces: info.faces ?? null, punches: info.punches ?? null, fpVersion: info.fpVersion || null, faceVersion: info.faceVersion || null,
      },
      clockOffsetSec: st?.clockOffsetSec ?? null,
      lastPunchAt: st?.lastPunchAt ? new Date(st.lastPunchAt) : null,
      punchesToday: C.get(d.id) || 0, notLinkedToday: U.get(d.id) || 0,
      refused: st?.refused || 0,
      known: { users: mine.length, linked: mine.filter((u) => u.personId).length, withFinger: mine.filter((u) => u.fingers > 0).length },
      work: await M.progress(d.id),
    });
  }
  return out;
}

router.get('/devices', wrap(async (req, res) => {
  res.json({ success: true, data: await deviceRows(req.schoolId) });
}));

router.post('/devices', adminOnly, wrap(async (req, res) => {
  const name = text(req.body?.name, 60);
  const serial = registry.cleanSerial(req.body?.serialNo);
  if (!name) return bad(res, 'Give the machine a name, such as "Main gate".');
  if (!serial) return bad(res, 'Enter the machine\'s serial number (on the machine: Menu → System Info → Device Info).');
  const d = await prisma.biometricDevice.create({
    data: {
      schoolId: req.schoolId, name, deviceType: ['thumb', 'face', 'card'].includes(req.body?.deviceType) ? req.body.deviceType : 'thumb',
      ipAddress: text(req.body?.ipAddress, 45) || null, port: parseInt(req.body?.port, 10) || 4370, location: text(req.body?.location, 80) || null,
    },
  });
  const r = await registry.registerSerial(req.schoolId, serial, d.id);
  if (r.error) { await prisma.biometricDevice.delete({ where: { id: d.id } }); return bad(res, r.error, 409); }
  const row = (await deviceRows(req.schoolId)).find((x) => x.id === d.id);
  res.status(201).json({ success: true, data: row, message: `${name} added. Its punches are saved from now on.` });
}));

const ownDevice = (req) => prisma.biometricDevice.findFirst({ where: { id: parseInt(req.params.id, 10) || 0, schoolId: req.schoolId } });

router.put('/devices/:id', adminOnly, wrap(async (req, res) => {
  const existing = await ownDevice(req);
  if (!existing) return bad(res, 'Device not found.', 404);
  const id = existing.id;
  const b = req.body || {};
  if (b.serialNo !== undefined) {
    const serial = registry.cleanSerial(b.serialNo);
    if (!serial) return bad(res, 'Enter the serial number.');
    await registry.unregisterSerial(req.schoolId, id);
    const r = await registry.registerSerial(req.schoolId, serial, id);
    if (r.error) return bad(res, r.error, 409);
  }
  await prisma.biometricDevice.update({
    where: { id },
    data: {
      ...(b.name !== undefined && text(b.name, 60) && { name: text(b.name, 60) }),
      ...(b.location !== undefined && { location: text(b.location, 80) || null }),
      ...(b.ipAddress !== undefined && { ipAddress: text(b.ipAddress, 45) || null }),
      ...(b.isActive !== undefined && { isActive: !!b.isActive }),
    },
  });
  res.json({ success: true, data: (await deviceRows(req.schoolId)).find((x) => x.id === id) });
}));

router.delete('/devices/:id', adminOnly, wrap(async (req, res) => {
  const existing = await ownDevice(req);
  if (!existing) return bad(res, 'Device not found.', 404);
  await registry.unregisterSerial(req.schoolId, existing.id);
  await prisma.deviceCommand.deleteMany({ where: { deviceId: existing.id } });
  await prisma.biometricDevice.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Machine removed. Attendance it marked, and the fingerprints it sent, are kept.' });
}));

// Machines calling in that nobody has added: on the desktop edition (one
// school), so the office can add them with one click.
router.get('/unregistered', adminOnly, wrap(async (req, res) => {
  res.json({ success: true, data: isDesktop() ? await registry.unregisteredSeen() : [] });
}));

/* The machine, its serial number and how it talks, for building its work. */
async function machineFor(req, res) {
  const device = await ownDevice(req);
  if (!device) { bad(res, 'Device not found.', 404); return null; }
  const serial = await registry.serialOf(req.schoolId, device.id);
  if (!serial) { bad(res, 'Add the machine\'s serial number first.'); return null; }
  const st = registry.statusOf(serial);
  const info = { ...M.deviceInfo(device), ...(st?.info || {}) };
  const online = !!(st?.lastSeen && Date.now() - st.lastSeen < ONLINE_MS);
  return { device, serial, pushver: st?.pushver || info.pushver || '2.4', info, online };
}
const whenText = (m, what) => (m.online
  ? `${what} It takes about a minute for every 300 people.`
  : `${what} ${m.device.name} is not connected now: it is sent as soon as it connects.`);

/* Who a choice means: everyone, students, staff, one class. */
async function chosenPeople(schoolId, body) {
  const type = ['students', 'staff'].includes(body?.type) ? body.type : 'all';
  const classId = parseInt(body?.classId, 10) || null;
  const [students, staff] = await Promise.all([
    type === 'staff' ? [] : prisma.student.findMany({ where: { schoolId, deletedAt: null, status: 'active', ...(classId && { classId }) }, select: { id: true, name: true } }),
    type === 'students' || classId ? [] : prisma.staff.findMany({ where: { schoolId, deletedAt: null, isActive: true }, select: { id: true, name: true } }),
  ]);
  return { students, staff, people: [...students.map((s) => ['student', s]), ...staff.map((s) => ['staff', s])] };
}

router.post('/devices/:id/send-people', adminOnly, wrap(async (req, res) => {
  const m = await machineFor(req, res);
  if (!m) return;
  const { students, staff, people } = await chosenPeople(req.schoolId, req.body);
  if (!people.length) return bad(res, 'Nobody to send.');
  const { items, clashes } = await M.peopleCommands({ schoolId: req.schoolId, device: m.device, pushver: m.pushver, people });
  await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: 'people', items, createdBy: req.user?.id });
  res.json({
    success: true,
    data: { queued: items.length, students: students.length, staff: staff.length, clashes: clashes.slice(0, 50), clashCount: clashes.length },
    message: whenText(m, `${items.length} people are being put on ${m.device.name}.${clashes.length ? ` ${clashes.length} not sent: their Device ID is used on the machine by someone else (see People → Users on the machines).` : ''}`),
  });
}));

router.post('/devices/:id/send-fingers', adminOnly, wrap(async (req, res) => {
  const m = await machineFor(req, res);
  if (!m) return;
  const { people } = await chosenPeople(req.schoolId, req.body);
  const r = await M.fingerCommands({ schoolId: req.schoolId, device: m.device, pushver: m.pushver, people, faces: req.body?.faces !== false, restore: !!req.body?.restore, info: m.info });
  if (!r.items.length) {
    return bad(res, r.unfit
      ? `None of the kept fingerprints fit ${m.device.name}: they were made by a different fingerprint version (${m.info.fpVersion ? `this machine: ${m.info.fpVersion}` : 'unknown'}). Enrol on this machine instead.`
      : 'No fingerprints are kept for these people yet. They are kept when a machine sends them: enrol fingers on a machine, or use "Get users and fingers" on a machine that has them.');
  }
  await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: 'fingers', items: r.items, createdBy: req.user?.id });
  res.json({
    success: true, data: { people: r.people, fingers: r.fingers, faces: r.faces, unfit: r.unfit, queued: r.items.length },
    message: whenText(m, `${r.fingers} fingerprints${r.faces ? ` and ${r.faces} faces` : ''} of ${r.people} people are being copied to ${m.device.name}.${r.unfit ? ` ${r.unfit} left out: made by a different version.` : ''}`),
  });
}));

router.post('/devices/:id/fetch-punches', adminOnly, wrap(async (req, res) => {
  const m = await machineFor(req, res);
  if (!m) return;
  const today = rulesSvc.pkYmd();
  const from = ymdOk(req.body?.from) ? req.body.from : today;
  const to = ymdOk(req.body?.to) ? req.body.to : today;
  if (from > to) return bad(res, 'The first day must be before the last.');
  if (new Date(`${from}T00:00:00Z`) < new Date(Date.now() - 30 * 864e5)) return bad(res, 'Punches older than 30 days are not taken in: choose a day in the last 30.');
  registry.allowOld(m.serial, 60 * 60e3);
  await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: 'fetch', items: [{ cmd: P.cmds.fetchPunches(from, to) }], createdBy: req.user?.id });
  res.json({ success: true, message: whenText(m, `${m.device.name} will send its punches from ${from} to ${to} again. Punches already saved are not counted twice.`).replace(/ It takes about a minute for every 300 people\./, '') });
}));

router.post('/devices/:id/fetch-users', adminOnly, wrap(async (req, res) => {
  const m = await machineFor(req, res);
  if (!m) return;
  registry.wantEverything(m.serial, true);
  await M.enqueue({
    schoolId: req.schoolId, deviceId: m.device.id, job: 'users', createdBy: req.user?.id,
    items: [{ cmd: P.cmds.queryUsers() }, { cmd: P.cmds.queryFingers() }, { cmd: P.cmds.check() }],
  });
  res.json({ success: true, message: whenText(m, `${m.device.name} will send everyone on it, with their fingerprints and faces. Then see People → Users on the machines.`).replace(/ It takes about a minute for every 300 people\./, ' This can take a few minutes.') });
}));

router.get('/devices/:id/left', adminOnly, wrap(async (req, res) => {
  const device = await ownDevice(req);
  if (!device) return bad(res, 'Device not found.', 404);
  res.json({ success: true, data: await M.leftOnMachine(req.schoolId, device.id) });
}));

router.post('/devices/:id/remove-left', adminOnly, wrap(async (req, res) => {
  const m = await machineFor(req, res);
  if (!m) return;
  const left = await M.leftOnMachine(req.schoolId, m.device.id);
  if (!left.length) return bad(res, 'Nobody who left the school is on this machine.');
  await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: 'remove', items: left.map((u) => ({ pin: u.pin, cmd: P.cmds.removeUser(u.pin) })), createdBy: req.user?.id });
  res.json({ success: true, data: { queued: left.length }, message: whenText(m, `${left.length} people who left are being taken off ${m.device.name}, with their fingerprints. Their attendance is kept.`) });
}));

router.post('/devices/:id/enrol', adminOnly, wrap(async (req, res) => {
  const m = await machineFor(req, res);
  if (!m) return;
  if (!m.online) return bad(res, `${m.device.name} is not connected. Enrolling from here needs the machine online; or enrol on the machine itself (Menu → User Mgt.).`);
  const kind = req.body?.kind === 'staff' ? 'staff' : 'student';
  const person = await M.personQuery(kind, req.schoolId, parseInt(req.body?.personId, 10) || 0);
  if (!person) return bad(res, 'Choose the person.', 404);
  const finger = parseInt(req.body?.finger, 10);
  if (!(finger >= 0 && finger <= 9)) return bad(res, 'Choose the finger.');
  // Their own link if they have one (an old machine's number), else the Device ID.
  const link = await prisma.biometricUser.findFirst({ where: { schoolId: req.schoolId, personType: kind, personId: person.id }, orderBy: { linkedAt: 'desc' } });
  const pin = link?.pin || devicePin(kind, person.id);
  if (!link) {
    const { items, clashes } = await M.peopleCommands({ schoolId: req.schoolId, device: m.device, pushver: m.pushver, people: [[kind, person]] });
    if (clashes.length) return bad(res, `Device ID ${pin} is used on the machine by someone else. Link or remove that user first (People → Users on the machines).`, 409);
    await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: 'people', items, createdBy: req.user?.id });
  } else {
    await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: 'people', items: [{ pin, cmd: P.userCmd(m.pushver, pin, person.name, link.card) }], createdBy: req.user?.id });
  }
  await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: 'enrol', items: [{ pin, cmd: P.cmds.enrolFinger(pin, finger) }], createdBy: req.user?.id });
  res.json({ success: true, data: { pin }, message: `In a few seconds ${m.device.name} asks for ${person.name}'s finger: press it three times. If the machine does not ask, enrol on the machine itself (some models cannot be started from here).` });
}));

router.post('/devices/:id/command', adminOnly, wrap(async (req, res) => {
  const m = await machineFor(req, res);
  if (!m) return;
  const action = String(req.body?.action || '');
  const tz = ((await readSettings(req.schoolId)).attendanceDevices || {}).timeZone || '+05:00';
  const cmd = { info: P.cmds.info(), reboot: P.cmds.reboot(), clock: P.cmds.setClock(new Date(), tz) }[action];
  if (!cmd) return bad(res, 'Unknown action.');
  await M.enqueue({ schoolId: req.schoolId, deviceId: m.device.id, job: action, items: [{ cmd }], createdBy: req.user?.id });
  const what = { info: 'will send its details (users, fingers, punches kept).', reboot: 'will restart. It is back in about a minute.', clock: 'will set its clock to the right time.' }[action];
  res.json({ success: true, message: `${m.device.name} ${what}${m.online ? '' : ' It is not connected now: it happens as soon as it connects.'}` });
}));

router.post('/devices/:id/cancel', adminOnly, wrap(async (req, res) => {
  const device = await ownDevice(req);
  if (!device) return bad(res, 'Device not found.', 404);
  const r = await M.cancelPending(device.id);
  res.json({ success: true, data: { cancelled: r.count }, message: r.count ? `${r.count} waiting jobs stopped.` : 'Nothing was waiting.' });
}));

router.get('/devices/:id/commands', wrap(async (req, res) => {
  const device = await ownDevice(req);
  if (!device) return bad(res, 'Device not found.', 404);
  res.json({ success: true, data: { work: await M.progress(device.id), recent: await M.recentCommands(device.id, 40) } });
}));

router.get('/devices/:id/log', adminOnly, wrap(async (req, res) => {
  const device = await ownDevice(req);
  if (!device) return bad(res, 'Device not found.', 404);
  const serial = await registry.serialOf(req.schoolId, device.id);
  res.json({ success: true, data: serial ? registry.logOf(serial) : [] });
}));

/* ══ People ══ */

// Everyone with their Device ID, whether they are on a machine and how many
// fingers IlmForge keeps for them.
router.get('/people', wrap(async (req, res) => {
  const type = req.query.type === 'staff' ? 'staff' : req.query.type === 'students' ? 'students' : 'all';
  const q = text(req.query.search, 60).toLowerCase();
  const classId = parseInt(req.query.classId, 10) || null;
  const [students, staff, links, devices] = await Promise.all([
    type === 'staff' ? [] : prisma.student.findMany({
      where: { schoolId: req.schoolId, deletedAt: null, status: 'active', ...(classId && { classId }) },
      select: STUDENT_SELECT, orderBy: [{ classId: 'asc' }, { rollNo: 'asc' }, { name: 'asc' }],
    }),
    type === 'students' || classId ? [] : prisma.staff.findMany({
      where: { schoolId: req.schoolId, deletedAt: null, isActive: true }, select: STAFF_SELECT, orderBy: { name: 'asc' },
    }),
    prisma.biometricUser.findMany({ where: { schoolId: req.schoolId, personId: { not: null } }, select: { pin: true, personType: true, personId: true, fingers: true, faces: true, onDevices: true } }),
    prisma.biometricDevice.findMany({ where: { schoolId: req.schoolId }, select: { id: true, name: true } }),
  ]);
  const D = new Map(devices.map((d) => [d.id, d.name]));
  const L = new Map();
  for (const l of links) { const k = `${l.personType}-${l.personId}`; L.set(k, [...(L.get(k) || []), l]); }
  const all = [...students.map((s) => personView('student', s)), ...staff.map((s) => personView('staff', s))]
    .map(({ photoUrl, ...p }) => {
      const mine = L.get(`${p.kind}-${p.id}`) || [];
      const on = [...new Set(mine.flatMap((l) => M.listOf(l.onDevices)))].filter((id) => D.has(id));
      return {
        ...p, hasPhoto: !!photoUrl, pins: mine.map((l) => l.pin),
        fingers: mine.reduce((n, l) => n + l.fingers, 0), face: mine.some((l) => l.faces > 0), machines: on.map((id) => D.get(id)),
      };
    })
    .filter((p) => !q || [p.name, p.rollNo, p.devicePin, p.className, ...p.pins].some((v) => String(v || '').toLowerCase().includes(q)));
  const summary = {
    total: all.length, onMachine: all.filter((p) => p.machines.length).length,
    withFinger: all.filter((p) => p.fingers > 0).length, withFace: all.filter((p) => p.face).length,
  };
  res.json({ success: true, data: all, total: all.length, summary });
}));

// Users on the machines: linked to someone or not, with who they probably are.
router.get('/machine-users', adminOnly, wrap(async (req, res) => {
  const show = ['linked', 'all'].includes(req.query.show) ? req.query.show : 'unlinked';
  const q = text(req.query.search, 60).toLowerCase();
  const users = await prisma.biometricUser.findMany({
    where: { schoolId: req.schoolId, ...(show === 'unlinked' ? { personId: null } : show === 'linked' ? { personId: { not: null } } : {}) },
    orderBy: [{ waiting: 'desc' }, { pin: 'asc' }], take: 3000,
  });
  const devices = new Map((await prisma.biometricDevice.findMany({ where: { schoolId: req.schoolId }, select: { id: true, name: true } })).map((d) => [d.id, d.name]));
  const people = await M.activePeople(req.schoolId);
  const P2 = new Map(people.map((p) => [`${p.kind}-${p.id}`, p]));
  // Linked to someone who has left: still shown with their name.
  const missing = users.filter((u) => u.personId && !P2.has(`${u.personType}-${u.personId}`));
  if (missing.length) {
    const [st, sf] = await Promise.all([
      prisma.student.findMany({ where: { schoolId: req.schoolId, id: { in: missing.filter((u) => u.personType === 'student').map((u) => u.personId) } }, select: { id: true, name: true, status: true } }),
      prisma.staff.findMany({ where: { schoolId: req.schoolId, id: { in: missing.filter((u) => u.personType === 'staff').map((u) => u.personId) } }, select: { id: true, name: true } }),
    ]);
    st.forEach((s) => P2.set(`student-${s.id}`, { kind: 'student', id: s.id, name: s.name, label: `left (${s.status})`, left: true }));
    sf.forEach((s) => P2.set(`staff-${s.id}`, { kind: 'staff', id: s.id, name: s.name, label: 'left', left: true }));
  }
  let list = users.map((u) => ({
    pin: u.pin, machineName: u.machineName || '', card: u.card || '', fingers: u.fingers, faces: u.faces, waiting: u.waiting,
    lastPunchAt: u.lastPunchAt, linkHow: u.linkHow, linkedAt: u.linkedAt,
    person: u.personId ? (P2.get(`${u.personType}-${u.personId}`) || { kind: u.personType, id: u.personId, name: '(record not found)', left: true }) : null,
    machines: M.listOf(u.onDevices).map((id) => devices.get(id)).filter(Boolean),
  }));
  if (q) list = list.filter((u) => [u.pin, u.machineName, u.person?.name].some((v) => String(v || '').toLowerCase().includes(q)));
  const unlinked = list.filter((u) => !u.person);
  const sugg = new Map(M.suggest(unlinked.slice(0, 400), people).map((s) => [s.pin, s]));
  list = list.map((u) => (u.person ? u : { ...u, suggestions: sugg.get(u.pin)?.suggestions || [], sure: !!sugg.get(u.pin)?.sure }));
  const counts = {
    unlinked: await prisma.biometricUser.count({ where: { schoolId: req.schoolId, personId: null } }),
    linked: await prisma.biometricUser.count({ where: { schoolId: req.schoolId, personId: { not: null } } }),
    waiting: (await prisma.biometricUser.aggregate({ where: { schoolId: req.schoolId, personId: null }, _sum: { waiting: true } }))._sum.waiting || 0,
  };
  res.json({ success: true, data: list.slice(0, 600), total: list.length, counts });
}));

router.post('/machine-users/link', adminOnly, wrap(async (req, res) => {
  const pin = P.cleanPin(req.body?.pin);
  if (!pin) return bad(res, 'Which user number?');
  const r = await M.linkPin({ schoolId: req.schoolId, pin, kind: req.body?.kind, personId: parseInt(req.body?.personId, 10) || 0, userId: req.user?.id });
  if (r.error) return bad(res, r.error, r.status || 400);
  res.json({ success: true, data: { marked: r.marked }, message: `User ${pin} is ${r.person.name} now.${r.marked ? ` ${r.marked} kept punch${r.marked === 1 ? '' : 'es'} marked.` : ''}` });
}));

router.post('/machine-users/unlink', adminOnly, wrap(async (req, res) => {
  const pin = P.cleanPin(req.body?.pin);
  const r = await M.unlinkPin({ schoolId: req.schoolId, pin, userId: req.user?.id });
  if (r.error) return bad(res, r.error, r.status || 400);
  res.json({ success: true, message: `User ${pin} is not linked to anyone now. Attendance already marked is kept.` });
}));

// Link every machine user whose name matches exactly one person.
router.post('/machine-users/link-sure', adminOnly, wrap(async (req, res) => {
  const users = await prisma.biometricUser.findMany({ where: { schoolId: req.schoolId, personId: null, machineName: { not: null } }, take: 3000 });
  const people = await M.activePeople(req.schoolId);
  // A person may also have IlmForge's Device ID: their fingers on an old
  // machine are under the old number, so that is linked too. Two machine
  // users with the same name are not both linked to one person.
  const taken = new Set();
  let linked = 0;
  let marked = 0;
  for (const s of M.suggest(users, people)) {
    if (!s.sure) continue;
    const best = s.suggestions[0];
    if (taken.has(`${best.kind}-${best.id}`)) continue;
    const r = await M.linkPin({ schoolId: req.schoolId, pin: s.pin, kind: best.kind, personId: best.id, userId: req.user?.id });
    if (!r.error) { linked++; marked += r.marked; taken.add(`${best.kind}-${best.id}`); }
  }
  res.json({ success: true, data: { linked, marked }, message: linked ? `${linked} linked by their names.${marked ? ` ${marked} kept punches marked.` : ''} Check the rest one by one.` : 'No clear matches by name: link them one by one.' });
}));

/* ══ Punches ══ */

// A punch as if from a machine: to try everything before a machine arrives.
router.post('/simulate', adminOnly, wrap(async (req, res) => {
  const code = String(req.body?.code || '').trim();
  const pin = P.cleanPin(code);
  const found = pin ? await M.personForPin(req.schoolId, pin, { remember: false }) : await findPerson(req.schoolId, code);
  if (found.error) return bad(res, found.error === 'not linked' ? `User ${pin} is on a machine but not linked to anyone.` : found.error, found.status || 404);
  let deviceId = parseInt(req.body?.deviceId, 10) || null;
  if (deviceId && !(await prisma.biometricDevice.findFirst({ where: { id: deviceId, schoolId: req.schoolId }, select: { id: true } }))) deviceId = null;
  const dir = String(req.body?.direction || '').toLowerCase();
  const r = await markPass({
    schoolId: req.schoolId, kind: found.kind, person: found.person, method: 'fingerprint', deviceId,
    direction: dir === 'out' ? 'out' : dir === 'in' ? 'in' : undefined,
  });
  if (r.error) return bad(res, r.error, r.status || 409);
  res.json({ success: true, data: r, message: r.message });
}));

// A punch from another system or the old manual punch box: { rollNo | code }.
router.post('/punch', wrap(async (req, res) => {
  const code = req.body?.code || req.body?.rollNo || (req.body?.personId ? `${req.body.personType === 'staff' ? 'STF' : 'ID'}-${parseInt(req.body.personId, 10)}` : '');
  const found = await findPerson(req.schoolId, code);
  if (found.error) return bad(res, found.error === 'Nothing was scanned.' ? 'Person not found for punch.' : found.error, found.status);
  let deviceId = parseInt(req.body?.deviceId, 10) || null;
  if (deviceId && !(await prisma.biometricDevice.findFirst({ where: { id: deviceId, schoolId: req.schoolId }, select: { id: true } }))) deviceId = null;
  const method = ({ thumb: 'fingerprint', face: 'face', card: 'card' })[req.body?.method] || 'fingerprint';
  const dir = String(req.body?.direction || '').toLowerCase();
  const r = await markPass({
    schoolId: req.schoolId, kind: found.kind, person: found.person, method, deviceId, markedBy: req.user?.id,
    direction: dir === 'out' ? 'out' : undefined,
  });
  if (r.error) return bad(res, r.error, r.status || 409);
  res.status(201).json({ success: true, data: r, attendanceMarked: r.action === 'in', message: r.message });
}));

/* Names for punch rows. */
async function punchViews(schoolId, punches) {
  const ids = (k) => [...new Set(punches.filter((p) => p.personType === k).map((p) => p.personId))];
  const pins = [...new Set(punches.filter((p) => !p.matched && p.pin).map((p) => p.pin))];
  const [students, staff, devices, users] = await Promise.all([
    prisma.student.findMany({ where: { schoolId, id: { in: ids('student') } }, select: STUDENT_SELECT }),
    prisma.staff.findMany({ where: { schoolId, id: { in: ids('staff') } }, select: STAFF_SELECT }),
    prisma.biometricDevice.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    pins.length ? prisma.biometricUser.findMany({ where: { schoolId, pin: { in: pins } }, select: { pin: true, machineName: true } }) : [],
  ]);
  const S = new Map(students.map((s) => [s.id, s]));
  const T = new Map(staff.map((s) => [s.id, s]));
  const D = new Map(devices.map((d) => [d.id, d.name]));
  const U = new Map(users.map((u) => [u.pin, u.machineName]));
  return punches.map((p) => {
    if (!p.matched) return { ...p, person: { name: U.get(p.pin) ? `${U.get(p.pin)} (not linked)` : `User ${p.pin} (not linked)`, className: '' }, deviceName: p.deviceId ? D.get(p.deviceId) || null : null };
    const raw = p.personType === 'staff' ? T.get(p.personId) : S.get(p.personId);
    const { photoUrl, ...person } = raw ? personView(p.personType, raw) : { name: `${p.personType} ${p.personId}` };
    return { ...p, person, deviceName: p.deviceId ? D.get(p.deviceId) || null : null };
  });
}

// Today's punches, newest first, with names.
router.get('/punches', wrap(async (req, res) => {
  const punches = await prisma.biometricPunch.findMany({
    where: { schoolId: req.schoolId, punchTime: { gte: dayStart(new Date()) } },
    orderBy: { punchTime: 'desc' }, take: 200,
  });
  res.json({ success: true, data: await punchViews(req.schoolId, punches) });
}));

// Any days: GET /punch-log?from&to&deviceId&who=student|staff|unknown&method&search&page&size
router.get('/punch-log', wrap(async (req, res) => {
  const today = rulesSvc.pkYmd();
  const from = ymdOk(req.query.from) ? req.query.from : today;
  const to = ymdOk(req.query.to) ? req.query.to : from;
  const start = new Date(`${from}T00:00:00+05:00`);
  const end = new Date(new Date(`${to}T00:00:00+05:00`).getTime() + 864e5);
  if (end - start > 62 * 864e5) return bad(res, 'Choose two months or less.');
  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 100, 10), 5000);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const where = {
    schoolId: req.schoolId, punchTime: { gte: start, lt: end },
    ...(parseInt(req.query.deviceId, 10) ? { deviceId: parseInt(req.query.deviceId, 10) } : req.query.deviceId === 'none' ? { deviceId: null } : {}),
    ...(['student', 'staff', 'unknown'].includes(req.query.who) ? { personType: req.query.who } : {}),
    ...(['fingerprint', 'face', 'card', 'password', 'barcode', 'qr'].includes(req.query.method) ? { method: req.query.method } : {}),
  };
  const q = text(req.query.search, 60).toLowerCase();
  if (q) {
    // Matched here, not in SQL: capitals compare the same on SQLite and PostgreSQL.
    const has = (...v) => v.some((x) => String(x || '').toLowerCase().includes(q));
    const [st, sf, us] = await Promise.all([
      prisma.student.findMany({ where: { schoolId: req.schoolId, deletedAt: null }, select: { id: true, name: true, rollNo: true } }),
      prisma.staff.findMany({ where: { schoolId: req.schoolId, deletedAt: null }, select: { id: true, name: true, empCode: true } }),
      prisma.biometricUser.findMany({ where: { schoolId: req.schoolId }, select: { pin: true, machineName: true } }),
    ]);
    where.OR = [
      { personType: 'student', personId: { in: st.filter((s) => has(s.name, s.rollNo)).slice(0, 500).map((s) => s.id) } },
      { personType: 'staff', personId: { in: sf.filter((s) => has(s.name, s.empCode)).slice(0, 200).map((s) => s.id) } },
      { pin: { in: us.filter((u) => u.pin.toLowerCase() === q || has(u.machineName)).slice(0, 200).map((u) => u.pin) } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.biometricPunch.count({ where }),
    prisma.biometricPunch.findMany({ where, orderBy: { punchTime: 'desc' }, skip: (page - 1) * size, take: size }),
  ]);
  res.json({ success: true, data: await punchViews(req.schoolId, rows), total, page, size, from, to });
}));

/* ══ Rules ══ */

router.get('/settings', wrap(async (req, res) => {
  const s = await deviceSettings(req.schoolId);
  const raw = (await readSettings(req.schoolId)).attendanceDevices || {};
  res.json({
    success: true,
    data: {
      lateAfter: s.lateAfter, staffLateAfter: s.staffLateAfter, gapMinutes: s.gapMinutes, timeZone: raw.timeZone || '+05:00',
      shifts: s.shifts, staffShifts: s.staffShifts, defaultShift: s.defaultShift,
      autoAbsent: rulesSvc.cleanAutoAbsent(raw.autoAbsent), lateRule: rulesSvc.cleanLateRule(raw.lateRule),
    },
  });
}));

router.put('/settings', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const cur = (await readSettings(req.schoolId)).attendanceDevices || {};
  const next = { ...cur };
  const time = (v) => (v === null || v === '' ? null : isClock(v) ? v : undefined);
  if (b.lateAfter !== undefined || b.staffLateAfter !== undefined || b.gapMinutes !== undefined || b.timeZone !== undefined) {
    const lateAfter = time(b.lateAfter ?? cur.lateAfter ?? null);
    const staffLateAfter = time(b.staffLateAfter ?? cur.staffLateAfter ?? null);
    const gapMinutes = parseInt(b.gapMinutes ?? cur.gapMinutes ?? 30, 10);
    if (lateAfter === undefined || staffLateAfter === undefined) return bad(res, 'Times are HH:MM, such as 08:00, or empty for "never late".');
    if (!(gapMinutes >= 5 && gapMinutes <= 600)) return bad(res, 'The gap before a check-out counts is 5 to 600 minutes.');
    Object.assign(next, { lateAfter, staffLateAfter, gapMinutes, timeZone: /^[+-]\d{2}:\d{2}$/.test(b.timeZone || '') ? b.timeZone : (cur.timeZone || '+05:00') });
  }
  if (b.autoAbsent !== undefined) {
    const a = rulesSvc.cleanAutoAbsent(b.autoAbsent);
    if (b.autoAbsent?.at && !isClock(b.autoAbsent.at)) return bad(res, 'The auto-absent time is HH:MM, such as 09:30.');
    next.autoAbsent = a;
  }
  if (b.shifts !== undefined) {
    if (!Array.isArray(b.shifts) || b.shifts.length > 20) return bad(res, 'Up to 20 shifts.');
    const shifts = b.shifts.map(P.cleanShift);
    const badAt = shifts.findIndex((x) => !x);
    if (badAt >= 0) return bad(res, `Shift ${badAt + 1}: the start and end are HH:MM and the end is after the start (a shift past midnight is not supported).`);
    if (new Set(shifts.map((x) => x.id)).size !== shifts.length) return bad(res, 'Two shifts have the same id.');
    next.shifts = shifts;
    const ids = new Set(shifts.map((x) => x.id));
    if (next.defaultShift && !ids.has(next.defaultShift)) next.defaultShift = null;
  }
  if (b.defaultShift !== undefined) next.defaultShift = b.defaultShift && (next.shifts || []).some((x) => x.id === b.defaultShift) ? b.defaultShift : null;
  if (b.staffShifts !== undefined) {
    if (!b.staffShifts || typeof b.staffShifts !== 'object' || Array.isArray(b.staffShifts)) return bad(res, 'Staff shifts are a list by staff member.');
    const ids = new Set((next.shifts || []).map((x) => x.id));
    const map = { ...(cur.staffShifts || {}) };
    for (const [k, v] of Object.entries(b.staffShifts)) {
      if (!/^\d{1,9}$/.test(k)) continue;
      if (v === '' || v === null) delete map[k];
      else if (v === 'none' || ids.has(v)) map[k] = v;
    }
    next.staffShifts = map;
  }
  if (b.lateRule !== undefined) next.lateRule = rulesSvc.cleanLateRule(b.lateRule);
  await mergeSettings(req.schoolId, { attendanceDevices: next });
  res.json({ success: true, message: 'Saved.' });
}));

router.get('/auto-absent', adminOnly, wrap(async (req, res) => {
  const all = await readSettings(req.schoolId);
  const cfg = rulesSvc.cleanAutoAbsent(all.attendanceDevices?.autoAbsent);
  const last = all.autoAbsentLast || null;
  const today = rulesSvc.pkYmd();
  const date = dayStart(new Date());
  const autoToday = await prisma.attendance.count({ where: { schoolId: req.schoolId, date, method: 'auto' } });
  res.json({ success: true, data: { config: cfg, last: last?.date === today ? last : null, previous: last?.date !== today ? last : null, autoToday } });
}));

router.post('/auto-absent/run', adminOnly, wrap(async (req, res) => {
  const r = await rulesSvc.runAutoAbsent(req.schoolId, { force: true, userId: req.user?.id });
  if (!r.ok) return bad(res, r.reason || 'Nobody was marked.', 409);
  res.json({ success: true, data: r, message: r.marked || r.leave ? `${r.marked} marked absent${r.leave ? `, ${r.leave} on leave` : ''}.${r.notified ? ` Message sent to ${r.notified} parents.` : ''}` : 'Every student already has attendance today.' });
}));

router.post('/auto-absent/undo', adminOnly, wrap(async (req, res) => {
  const r = await rulesSvc.undoAutoAbsent(req.schoolId, { userId: req.user?.id });
  res.json({ success: true, data: r, message: r.removed ? `${r.removed} automatic marks taken back. Messages already sent to parents cannot be taken back.` : 'No automatic marks today.' });
}));

router.get('/timesheet', adminOnly, wrap(async (req, res) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || ''));
  const now = new Date(Date.now() + 5 * 3600e3);
  const year = m ? parseInt(m[1], 10) : now.getUTCFullYear();
  const month = m ? parseInt(m[2], 10) : now.getUTCMonth() + 1;
  if (!(month >= 1 && month <= 12) || year < 2000 || year > 2100) return bad(res, 'Choose a month.');
  const data = await rulesSvc.staffTimesheet(req.schoolId, {
    year, month, staffId: parseInt(req.query.staffId, 10) || null, departmentId: parseInt(req.query.departmentId, 10) || null,
  });
  res.json({ success: true, data });
}));

router.put('/timesheet', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const r = await rulesSvc.fixStaffDay(req.schoolId, {
    staffId: parseInt(b.staffId, 10) || 0, ymd: b.ymd, checkIn: b.checkIn, checkOut: b.checkOut,
    status: b.status || undefined, reason: b.reason, userId: req.user?.id,
  });
  if (r.error) return bad(res, r.error, r.status || 400);
  res.json({ success: true, message: `${r.name}, ${b.ymd}: saved.` });
}));

module.exports = router;
