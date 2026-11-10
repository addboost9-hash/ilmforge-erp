/**
 * IlmForge — fingerprint machines and scanners: setting up and testing.
 *
 *   GET    /biometric/connection        what to type into the machine (address, port, HTTPS)
 *   GET    /biometric/devices           the school's machines, with live status
 *   POST   /biometric/devices           add one by serial number            (admin)
 *   PUT    /biometric/devices/:id       rename, move, switch off             (admin)
 *   DELETE /biometric/devices/:id                                           (admin)
 *   GET    /biometric/unregistered      machines calling in but not added   (admin, desktop)
 *   GET    /biometric/people            students and staff with their Device IDs
 *   POST   /biometric/devices/:id/send-people   put names and Device IDs on the machine (admin)
 *   POST   /biometric/simulate          a test punch without a machine       (admin)
 *   GET    /biometric/settings, PUT     late times and the check-out gap      (PUT: admin)
 *   POST   /biometric/punch             a punch from another system (rollNo / code)
 *   GET    /biometric/punches           today's punches with names
 *
 * The machines themselves talk to /iclock (routes/iclock.routes.js).
 */
const express = require('express');
const os = require('os');
const router = express.Router();
const prisma = require('../config/prisma');
const registry = require('../services/deviceRegistry');
const {
  findPerson, markPass, devicePin, deviceSettings, isClock, personView, STUDENT_SELECT, STAFF_SELECT,
} = require('../services/attendanceDevice.service');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const adminOnly = (req, res, next) => (['super_admin', 'admin', 'principal'].includes(req.user?.role)
  ? next() : bad(res, 'Only the administrator can change fingerprint machines.', 403));
const isDesktop = () => process.env.ILMFORGE_DESKTOP === '1';
const text = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);

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

async function deviceRows(schoolId) {
  const [rows, serials, today] = await Promise.all([
    prisma.biometricDevice.findMany({ where: { schoolId }, orderBy: { createdAt: 'asc' } }),
    registry.serialsOf(schoolId),
    (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(),
  ]);
  const counts = await prisma.biometricPunch.groupBy({
    by: ['deviceId'], where: { schoolId, punchTime: { gte: today }, deviceId: { in: rows.map((r) => r.id) } }, _count: { _all: true },
  }).catch(() => []);
  const C = new Map(counts.map((c) => [c.deviceId, c._count._all]));
  return rows.map((d) => {
    const serial = Object.keys(serials).find((k) => Number(serials[k]) === d.id) || null;
    const st = serial ? registry.statusOf(serial) : null;
    const lastSeen = st?.lastSeen ? new Date(st.lastSeen) : d.lastSyncAt;
    return {
      ...d, serialNo: serial, lastSeen,
      online: !!(lastSeen && Date.now() - new Date(lastSeen).getTime() < 2 * 60e3),
      ip: st?.ip || null, firmwarePush: st?.pushver || null, punchesToday: C.get(d.id) || 0,
      refused: st?.refused || 0, pending: serial ? registry.pendingOf(serial) : 0, sending: serial ? registry.resultsOf(serial) : null,
    };
  });
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

router.put('/devices/:id', adminOnly, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  // Only this school's machine (it was once updated by id alone).
  const existing = await prisma.biometricDevice.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return bad(res, 'Device not found.', 404);
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
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.biometricDevice.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return bad(res, 'Device not found.', 404);
  await registry.unregisterSerial(req.schoolId, id);
  await prisma.biometricDevice.delete({ where: { id } });
  res.json({ success: true, message: 'Machine removed. Attendance it marked is kept.' });
}));

// Machines calling in that nobody has added: on the desktop edition (one
// school), so the office can add them with one click.
router.get('/unregistered', adminOnly, wrap(async (req, res) => {
  res.json({ success: true, data: isDesktop() ? await registry.unregisteredSeen() : [] });
}));

// Everyone with their Device ID (the user number to enrol on the machine).
router.get('/people', wrap(async (req, res) => {
  const type = req.query.type === 'staff' ? 'staff' : req.query.type === 'students' ? 'students' : 'all';
  const q = text(req.query.search, 60).toLowerCase();
  const classId = parseInt(req.query.classId, 10) || null;
  const [students, staff] = await Promise.all([
    type === 'staff' ? [] : prisma.student.findMany({
      where: { schoolId: req.schoolId, deletedAt: null, status: 'active', ...(classId && { classId }) },
      select: STUDENT_SELECT, orderBy: [{ classId: 'asc' }, { rollNo: 'asc' }, { name: 'asc' }],
    }),
    type === 'students' || classId ? [] : prisma.staff.findMany({
      where: { schoolId: req.schoolId, deletedAt: null, isActive: true }, select: STAFF_SELECT, orderBy: { name: 'asc' },
    }),
  ]);
  const all = [...students.map((s) => personView('student', s)), ...staff.map((s) => personView('staff', s))]
    .map(({ photoUrl, ...p }) => ({ ...p, hasPhoto: !!photoUrl }))
    .filter((p) => !q || [p.name, p.rollNo, p.devicePin, p.className].some((v) => String(v || '').toLowerCase().includes(q)));
  res.json({ success: true, data: all, total: all.length });
}));

/* A name the machine can show: plain letters, at most 24. */
const machineName = (n) => String(n || '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/[\t=]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Person';

router.post('/devices/:id/send-people', adminOnly, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const device = await prisma.biometricDevice.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!device) return bad(res, 'Device not found.', 404);
  const serials = await registry.serialsOf(req.schoolId);
  const serial = Object.keys(serials).find((k) => Number(serials[k]) === id);
  if (!serial) return bad(res, 'Add the machine\'s serial number first.');
  const type = ['students', 'staff'].includes(req.body?.type) ? req.body.type : 'all';
  const classId = parseInt(req.body?.classId, 10) || null;
  const [students, staff] = await Promise.all([
    type === 'staff' ? [] : prisma.student.findMany({ where: { schoolId: req.schoolId, deletedAt: null, status: 'active', ...(classId && { classId }) }, select: { id: true, name: true } }),
    type === 'students' || classId ? [] : prisma.staff.findMany({ where: { schoolId: req.schoolId, deletedAt: null, isActive: true }, select: { id: true, name: true } }),
  ]);
  const people = [...students.map((s) => ['student', s]), ...staff.map((s) => ['staff', s])];
  if (!people.length) return bad(res, 'Nobody to send.');
  const push = registry.statusOf(serial)?.pushver || '2.4';
  const modern = parseFloat(push) >= 2;
  const cmds = people.map(([kind, p]) => (modern
    ? `DATA UPDATE USERINFO PIN=${devicePin(kind, p.id)}\tName=${machineName(p.name)}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\tVerify=0`
    : `DATA USER PIN=${devicePin(kind, p.id)}\tName=${machineName(p.name)}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=`));
  registry.resetResults(serial);
  registry.queue(serial, cmds);
  const online = registry.statusOf(serial)?.lastSeen && Date.now() - registry.statusOf(serial).lastSeen < 2 * 60e3;
  res.json({
    success: true,
    data: { queued: cmds.length, students: students.length, staff: staff.length },
    message: online
      ? `${cmds.length} people are being put on ${device.name}. This takes about a minute for every 300 people.`
      : `${cmds.length} people will be put on ${device.name} as soon as it connects. Check that it is switched on and connected.`,
  });
}));

// A punch as if from a machine: to try everything before a machine arrives.
router.post('/simulate', adminOnly, wrap(async (req, res) => {
  const found = await findPerson(req.schoolId, req.body?.code);
  if (found.error) return bad(res, found.error, found.status);
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

router.get('/settings', wrap(async (req, res) => {
  const s = await deviceSettings(req.schoolId);
  const raw = (await readSettings(req.schoolId)).attendanceDevices || {};
  res.json({ success: true, data: { ...s, timeZone: raw.timeZone || '+05:00' } });
}));

router.put('/settings', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const time = (v) => (v === null || v === '' ? null : isClock(v) ? v : undefined);
  const lateAfter = time(b.lateAfter);
  const staffLateAfter = time(b.staffLateAfter);
  const gapMinutes = parseInt(b.gapMinutes, 10);
  if (lateAfter === undefined || staffLateAfter === undefined) return bad(res, 'Times are HH:MM, such as 08:00, or empty for "never late".');
  if (!(gapMinutes >= 5 && gapMinutes <= 600)) return bad(res, 'The gap before a check-out counts is 5 to 600 minutes.');
  const timeZone = /^[+-]\d{2}:\d{2}$/.test(b.timeZone || '') ? b.timeZone : '+05:00';
  await mergeSettings(req.schoolId, { attendanceDevices: { lateAfter, staffLateAfter, gapMinutes, timeZone } });
  res.json({ success: true, data: { lateAfter, staffLateAfter, gapMinutes, timeZone }, message: 'Saved.' });
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

// Today's punches, newest first, with names.
router.get('/punches', wrap(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const punches = await prisma.biometricPunch.findMany({
    where: { schoolId: req.schoolId, punchTime: { gte: today } },
    orderBy: { punchTime: 'desc' }, take: 200,
  });
  const ids = (k) => [...new Set(punches.filter((p) => p.personType === k).map((p) => p.personId))];
  const [students, staff, devices] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: req.schoolId, id: { in: ids('student') } }, select: STUDENT_SELECT }),
    prisma.staff.findMany({ where: { schoolId: req.schoolId, id: { in: ids('staff') } }, select: STAFF_SELECT }),
    prisma.biometricDevice.findMany({ where: { schoolId: req.schoolId }, select: { id: true, name: true } }),
  ]);
  const S = new Map(students.map((s) => [s.id, s]));
  const T = new Map(staff.map((s) => [s.id, s]));
  const D = new Map(devices.map((d) => [d.id, d.name]));
  res.json({
    success: true,
    data: punches.map((p) => {
      const raw = p.personType === 'staff' ? T.get(p.personId) : S.get(p.personId);
      const { photoUrl, ...person } = raw ? personView(p.personType, raw) : { name: `${p.personType} ${p.personId}` };
      return { ...p, person, deviceName: p.deviceId ? D.get(p.deviceId) || null : null };
    }),
  });
}));

module.exports = router;
