/**
 * IlmForge — the school's fingerprint machines, organisation level.
 *
 *   Commands      work for a machine (put people on it, copy fingers, fetch
 *                 punches again…), kept in DeviceCommand until the machine
 *                 collects it and answers. Unanswered work is sent again.
 *   Machine users everyone on the machines by user number (PIN), linked to
 *                 the student or staff member it is (BiometricUser).
 *   Templates     the fingerprints and faces the machines upload, kept as a
 *                 backup and copied to the school's other machines.
 *   Punches       from a PIN nobody is linked to are kept (matched = false)
 *                 and marked as soon as the office links the PIN.
 */
const prisma = require('../config/prisma');
const P = require('./biometricProtocol');
const { findPerson, markPass, devicePin, STUDENT_SELECT, STAFF_SELECT } = require('./attendanceDevice.service');

const listOf = (json) => {
  try { const a = JSON.parse(json || '[]'); return Array.isArray(a) ? [...new Set(a.map(Number).filter((n) => n > 0))] : []; } catch { return []; }
};
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/* ══ Commands ══ */

async function enqueue({ schoolId, deviceId, job, items, createdBy = null }) {
  const rows = items.filter((x) => x && x.cmd).map((x) => ({ schoolId, deviceId, job, cmd: x.cmd, pin: x.pin || null, createdBy }));
  for (const part of chunks(rows, 500)) await prisma.deviceCommand.createMany({ data: part });
  // Old finished work goes after a month.
  await prisma.deviceCommand.deleteMany({ where: { schoolId, status: { in: ['done', 'failed', 'cancelled'] }, createdAt: { lt: new Date(Date.now() - 30 * 864e5) } } }).catch(() => {});
  return rows.length;
}

const RETRY_AFTER_MS = 5 * 60e3;
const MAX_TRIES = 3;
const lastRetryCheck = new Map(); // deviceId -> time

/**
 * The next commands for a machine that asked for work: a few at a time and
 * not too long in all (a face set is several KB).
 */
async function nextFor(deviceId, { maxLines = 40, maxChars = 48000 } = {}) {
  const now = Date.now();
  if (now - (lastRetryCheck.get(deviceId) || 0) > 60e3) {
    lastRetryCheck.set(deviceId, now);
    const stale = new Date(now - RETRY_AFTER_MS);
    await prisma.deviceCommand.updateMany({ where: { deviceId, status: 'sent', sentAt: { lt: stale }, tries: { gte: MAX_TRIES } }, data: { status: 'failed', result: -999, doneAt: new Date() } });
    await prisma.deviceCommand.updateMany({ where: { deviceId, status: 'sent', sentAt: { lt: stale } }, data: { status: 'pending' } });
  }
  const list = await prisma.deviceCommand.findMany({ where: { deviceId, status: 'pending' }, orderBy: { id: 'asc' }, take: maxLines, select: { id: true, cmd: true } });
  const out = [];
  let size = 0;
  for (const c of list) {
    if (out.length && size + c.cmd.length > maxChars) break;
    out.push(c);
    size += c.cmd.length + 12;
  }
  if (out.length) {
    await prisma.deviceCommand.updateMany({ where: { id: { in: out.map((c) => c.id) } }, data: { status: 'sent', sentAt: new Date(), tries: { increment: 1 } } });
  }
  return out;
}

async function setDevices(schoolId, pin, deviceId, on) {
  const u = await prisma.biometricUser.findUnique({ where: { schoolId_pin: { schoolId, pin } }, select: { id: true, onDevices: true } });
  if (!u) return;
  const list = listOf(u.onDevices);
  const next = on ? [...new Set([...list, deviceId])] : list.filter((d) => d !== deviceId);
  if (next.length !== list.length) await prisma.biometricUser.update({ where: { id: u.id }, data: { onDevices: JSON.stringify(next) } });
}

/** The machine's answers: done (0 or more) or refused (below 0). */
async function answered(schoolId, deviceId, results) {
  for (const r of results) {
    const c = await prisma.deviceCommand.findFirst({ where: { id: r.id, deviceId }, select: { id: true, status: true, job: true, cmd: true, pin: true } });
    if (!c || c.status === 'done' || c.status === 'cancelled') continue;
    const ok = r.ret >= 0;
    await prisma.deviceCommand.update({ where: { id: c.id }, data: { status: ok ? 'done' : 'failed', result: r.ret, doneAt: new Date() } });
    if (!ok || !c.pin) continue;
    if (/^DATA (UPDATE USERINFO|USER) /.test(c.cmd)) await setDevices(schoolId, c.pin, deviceId, true);
    if (/^DATA DELETE USERINFO /.test(c.cmd)) await setDevices(schoolId, c.pin, deviceId, false);
  }
}

/** Work for one machine in the last day, per job. */
async function progress(deviceId) {
  const rows = await prisma.deviceCommand.groupBy({
    by: ['job', 'status'], where: { deviceId, createdAt: { gte: new Date(Date.now() - 24 * 3600e3) } }, _count: { _all: true },
  }).catch(() => []);
  const jobs = {};
  for (const r of rows) {
    const j = jobs[r.job] || (jobs[r.job] = { total: 0, pending: 0, sent: 0, done: 0, failed: 0, cancelled: 0 });
    j[r.status] = (j[r.status] || 0) + r._count._all;
    j.total += r._count._all;
  }
  return jobs;
}

async function recentCommands(deviceId, take = 40) {
  const rows = await prisma.deviceCommand.findMany({ where: { deviceId }, orderBy: { id: 'desc' }, take });
  return rows.map((c) => ({
    id: c.id, job: c.job, pin: c.pin, status: c.status, tries: c.tries, result: c.result,
    resultText: c.status === 'failed' || c.status === 'done' ? P.resultText(c.result) : '',
    cmd: P.redact(c.cmd, 140), createdAt: c.createdAt, sentAt: c.sentAt, doneAt: c.doneAt,
  }));
}

const cancelPending = (deviceId) => prisma.deviceCommand.updateMany({ where: { deviceId, status: { in: ['pending', 'sent'] } }, data: { status: 'cancelled', doneAt: new Date() } });

/* ══ Who a PIN is ══ */

const personQuery = (kind, schoolId, id) => (kind === 'staff'
  ? prisma.staff.findFirst({ where: { id, schoolId, deletedAt: null }, select: STAFF_SELECT })
  : prisma.student.findFirst({ where: { id, schoolId, deletedAt: null }, select: STUDENT_SELECT }));

/**
 * The person behind a machine's user number: the link the office made (or
 * IlmForge made when it put them on the machine), else the Device ID / roll
 * number / employee code rules, remembered as an automatic link.
 */
async function personForPin(schoolId, pin, { remember = true } = {}) {
  const u = await prisma.biometricUser.findUnique({ where: { schoolId_pin: { schoolId, pin } } });
  if (u?.personType && u.personId) {
    const p = await personQuery(u.personType, schoolId, u.personId);
    if (p) return { kind: u.personType, person: p, user: u };
  }
  if (u && u.linkHow === 'manual' && !u.personId) return { error: 'not linked', user: u }; // the office unlinked it
  const found = await findPerson(schoolId, pin);
  if (found.error) return { error: found.error, user: u };
  if (remember) {
    await prisma.biometricUser.upsert({
      where: { schoolId_pin: { schoolId, pin } },
      update: { personType: found.kind, personId: found.person.id, linkHow: 'auto', linkedAt: new Date() },
      create: { schoolId, pin, personType: found.kind, personId: found.person.id, linkHow: 'auto', linkedAt: new Date() },
    }).catch(() => {});
  }
  return found;
}

/* ══ What the machines upload ══ */

/**
 * Users, fingerprints and faces from a machine (OPERLOG, BIODATA, USERINFO
 * uploads and answers to queries). A machine sends everything again when it
 * restarts, so what is unchanged is not written again: one read for the
 * batch, then only the changes.
 * @returns {{ users: number, templates: number, written: number }}
 */
async function ingestRecords(schoolId, deviceId, lines, info = {}) {
  const recs = lines.map((l) => P.readRecord(l)).filter(Boolean);
  if (!recs.length) return { users: 0, templates: 0, written: 0 };
  const pins = [...new Set(recs.map((r) => r.pin))];
  const known = new Map();
  for (const part of chunks(pins, 500)) {
    for (const u of await prisma.biometricUser.findMany({ where: { schoolId, pin: { in: part } } })) known.set(u.pin, u);
  }
  const tKey = (pin, kind, slot) => `${pin}|${kind}|${slot}`;
  const kept = new Map();
  const tPins = [...new Set(recs.filter((r) => r.what === 'template').map((r) => r.pin))];
  for (const part of chunks(tPins, 300)) {
    const rows = await prisma.biometricTemplate.findMany({ where: { schoolId, pin: { in: part } }, select: { pin: true, kind: true, slot: true, data: true, deviceId: true } });
    for (const t of rows) kept.set(tKey(t.pin, t.kind, t.slot), t);
  }

  let users = 0;
  let templates = 0;
  let written = 0;
  const touched = new Set();
  const pending = new Map(); // pin -> changes to the user row
  const change = (pin, patch) => pending.set(pin, { ...(pending.get(pin) || {}), ...patch });
  const onDevice = (pin) => {
    const u = known.get(pin);
    const list = listOf(u?.onDevices);
    if (!list.includes(deviceId)) change(pin, { onDevices: JSON.stringify([...list, deviceId]) });
  };

  for (const r of recs) {
    if (r.what === 'user') {
      users++;
      const u = known.get(r.pin);
      if (u) {
        if (r.name && r.name !== u.machineName) change(r.pin, { machineName: r.name });
        if (r.card && r.card !== u.card) change(r.pin, { card: r.card });
        onDevice(r.pin);
        continue;
      }
      if (pending.has(r.pin) && pending.get(r.pin).create) { change(r.pin, { machineName: r.name || null }); continue; }
      // A Device ID IlmForge gives (1<student no.> / 2<staff no.>) is linked at once.
      const m = /^([12])(\d{1,8})$/.exec(r.pin);
      const kind = m ? (m[1] === '1' ? 'student' : 'staff') : null;
      const p = m ? await personQuery(kind, schoolId, parseInt(m[2], 10)) : null;
      const same = p && (!r.name || P.nameScore(r.name, p.name) >= 0.6);
      change(r.pin, {
        create: true, machineName: r.name || null, ...(r.card ? { card: r.card } : {}), onDevices: JSON.stringify([deviceId]),
        ...(same ? { personType: kind, personId: p.id, linkHow: 'auto', linkedAt: new Date() } : {}),
      });
      continue;
    }
    // A fingerprint or face: kept with the version of the machine it came from.
    templates++;
    const majorVer = r.majorVer || (r.kind === 'finger' ? info.fpVersion : r.kind === 'face' ? info.faceVersion : null) || null;
    const before = kept.get(tKey(r.pin, r.kind, r.slot));
    if (!known.has(r.pin) && !pending.has(r.pin)) change(r.pin, { create: true, onDevices: JSON.stringify([deviceId]) });
    else if (known.has(r.pin)) onDevice(r.pin);
    if (before && before.data === r.data) continue; // the same template sent again
    const data = { format: r.format, bioType: r.bioType, majorVer, minorVer: r.minorVer, size: r.size, valid: r.valid, data: r.data, deviceId };
    await prisma.biometricTemplate.upsert({
      where: { schoolId_pin_kind_slot: { schoolId, pin: r.pin, kind: r.kind, slot: r.slot } },
      update: data,
      create: { schoolId, pin: r.pin, kind: r.kind, slot: r.slot, ...data },
    });
    kept.set(tKey(r.pin, r.kind, r.slot), { data: r.data });
    touched.add(r.pin);
    written++;
  }

  for (const [pin, patch] of pending) {
    const { create, ...data } = patch;
    if (create) {
      await prisma.biometricUser.create({ data: { schoolId, pin, ...data } }).catch((e) => { if (e.code !== 'P2002') throw e; });
    } else {
      await prisma.biometricUser.update({ where: { id: known.get(pin).id }, data });
    }
    written++;
  }
  if (touched.size) await recount(schoolId, [...touched]);
  return { users, templates, written };
}

/** Fingers and faces kept for these PINs. */
async function recount(schoolId, pins) {
  for (const part of chunks(pins, 200)) {
    const rows = await prisma.biometricTemplate.groupBy({ by: ['pin', 'kind'], where: { schoolId, pin: { in: part } }, _count: { _all: true } });
    for (const pin of part) {
      const fingers = rows.find((r) => r.pin === pin && r.kind === 'finger')?._count._all || 0;
      const faces = rows.some((r) => r.pin === pin && r.kind === 'face') ? 1 : 0;
      await prisma.biometricUser.updateMany({ where: { schoolId, pin }, data: { fingers, faces } });
    }
  }
}

/** A punch from a PIN nobody is linked to: kept until the office links it. */
async function keepUnmatched({ schoolId, deviceId, pin, at, method, name }) {
  const dup = await prisma.biometricPunch.findFirst({ where: { schoolId, pin, punchTime: at, matched: false }, select: { id: true } });
  if (dup) return false;
  await prisma.biometricPunch.create({ data: { schoolId, deviceId, personType: 'unknown', personId: 0, method, direction: 'in', punchTime: at, matched: false, pin } });
  // Some makes (Hikvision, files with a name column) send the name on the
  // machine with each punch: kept, so the office is shown who it probably is.
  const machineName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 40) : null;
  await prisma.biometricUser.upsert({
    where: { schoolId_pin: { schoolId, pin } },
    update: { waiting: { increment: 1 }, lastPunchAt: at, ...(machineName && { machineName }) },
    create: { schoolId, pin, waiting: 1, lastPunchAt: at, onDevices: deviceId ? JSON.stringify([deviceId]) : null, ...(machineName && { machineName }) },
  });
  return true;
}

/**
 * Link a machine user to a student or staff member, and mark the punches
 * kept for it (the last 30 days) at their own times.
 */
async function linkPin({ schoolId, pin, kind, personId, userId }) {
  const u = await prisma.biometricUser.findUnique({ where: { schoolId_pin: { schoolId, pin } } });
  if (!u) return { error: 'That user number is not on any machine.', status: 404 };
  if (!['student', 'staff'].includes(kind)) return { error: 'Choose a student or a staff member.' };
  const person = await personQuery(kind, schoolId, personId);
  if (!person) return { error: 'That person was not found.', status: 404 };
  await prisma.biometricUser.update({ where: { id: u.id }, data: { personType: kind, personId: person.id, linkHow: 'manual', linkedBy: userId || null, linkedAt: new Date(), waiting: 0 } });
  const since = new Date(Date.now() - 30 * 864e5);
  const waiting = await prisma.biometricPunch.findMany({ where: { schoolId, pin, matched: false, personType: 'unknown' }, orderBy: { punchTime: 'asc' } });
  let marked = 0;
  for (const w of waiting) {
    if (w.punchTime >= since) {
      const r = await markPass({ schoolId, kind, person, at: w.punchTime, method: w.method, deviceId: w.deviceId });
      if (!r.error && !r.duplicate) marked++;
    }
    await prisma.biometricPunch.delete({ where: { id: w.id } }).catch(() => {});
  }
  return { person, marked, kept: waiting.length };
}

async function unlinkPin({ schoolId, pin, userId }) {
  const u = await prisma.biometricUser.findUnique({ where: { schoolId_pin: { schoolId, pin } } });
  if (!u) return { error: 'That user number is not on any machine.', status: 404 };
  await prisma.biometricUser.update({ where: { id: u.id }, data: { personType: null, personId: null, linkHow: 'manual', linkedBy: userId || null, linkedAt: new Date() } });
  return { ok: true };
}

/* ══ People for the office: names, links, suggestions ══ */

async function activePeople(schoolId) {
  const [students, staff] = await Promise.all([
    prisma.student.findMany({ where: { schoolId, deletedAt: null, status: 'active' }, select: { id: true, name: true, rollNo: true, fatherName: true, classId: true, class: { select: { name: true } }, section: { select: { name: true } } } }),
    prisma.staff.findMany({ where: { schoolId, deletedAt: null, isActive: true }, select: { id: true, name: true, empCode: true, designation: true } }),
  ]);
  return [
    ...students.map((s) => ({ kind: 'student', id: s.id, name: s.name, code: s.rollNo || '', label: [s.class?.name, s.section?.name].filter(Boolean).join(' — '), fatherName: s.fatherName || '', classId: s.classId })),
    ...staff.map((s) => ({ kind: 'staff', id: s.id, name: s.name, code: s.empCode || '', label: s.designation || 'Staff' })),
  ];
}

/**
 * Who each machine user probably is: by the name on the machine, and by the
 * number (Device ID, roll number, employee code). sure = one clear answer.
 */
function suggest(users, people) {
  const byCode = new Map();
  for (const p of people) {
    if (p.code) { const k = p.code.toLowerCase(); byCode.set(k, [...(byCode.get(k) || []), p]); }
  }
  const byKey = new Map(people.map((p) => [`${p.kind}-${p.id}`, p]));
  return users.map((u) => {
    const out = [];
    const m = /^([12])(\d{1,8})$/.exec(u.pin);
    const dev = m && byKey.get(`${m[1] === '1' ? 'student' : 'staff'}-${m[2]}`);
    if (dev) out.push({ ...dev, score: u.machineName ? Math.max(0.6, P.nameScore(u.machineName, dev.name)) : 0.6, why: 'Device ID' });
    const code = byCode.get(u.pin.toLowerCase()) || [];
    if (code.length === 1) out.push({ ...code[0], score: u.machineName ? Math.max(0.55, P.nameScore(u.machineName, code[0].name)) : 0.55, why: code[0].kind === 'staff' ? 'employee code' : 'roll number' });
    if (u.machineName) {
      for (const p of people) {
        const score = P.nameScore(u.machineName, p.name);
        if (score >= 0.5) out.push({ ...p, score, why: 'name' });
      }
    }
    const best = new Map();
    for (const s of out.sort((a, b) => b.score - a.score)) { const k = `${s.kind}-${s.id}`; if (!best.has(k)) best.set(k, s); }
    const list = [...best.values()].slice(0, 4);
    const sure = list.length > 0 && list[0].score >= 0.95 && !(list[1] && list[1].score >= 0.95);
    return { pin: u.pin, suggestions: list.map(({ fatherName, classId, ...s }) => ({ ...s, fatherName })), sure };
  });
}

/* ══ Building work for a machine ══ */

const deviceInfo = (device) => { try { return JSON.parse(device.infoJson || '{}') || {}; } catch { return {}; } };

/**
 * Put people on a machine. A Device ID the machine already uses for someone
 * else (an old machine's user) is not overwritten: that is reported instead.
 */
async function peopleCommands({ schoolId, device, pushver, people }) {
  const pins = people.map(([kind, p]) => devicePin(kind, p.id));
  const known = new Map((await prisma.biometricUser.findMany({ where: { schoolId, pin: { in: pins } } })).map((u) => [u.pin, u]));
  const items = [];
  const clashes = [];
  const create = [];
  for (const [kind, p] of people) {
    const pin = devicePin(kind, p.id);
    const u = known.get(pin);
    if (u && u.personId && !(u.personType === kind && u.personId === p.id)) { clashes.push({ pin, name: p.name }); continue; }
    if (u && !u.personId && u.machineName && P.nameScore(u.machineName, p.name) < 0.6) { clashes.push({ pin, name: p.name, onMachine: u.machineName }); continue; }
    if (!u) create.push({ schoolId, pin, personType: kind, personId: p.id, linkHow: 'sent', linkedAt: new Date(), machineName: P.machineName(p.name) });
    else if (!u.personId) await prisma.biometricUser.update({ where: { id: u.id }, data: { personType: kind, personId: p.id, linkHow: 'sent', linkedAt: new Date() } });
    items.push({ pin, cmd: P.userCmd(pushver, pin, p.name, u?.card) });
  }
  for (const part of chunks(create, 500)) await prisma.biometricUser.createMany({ data: part }).catch(async () => {
    for (const row of part) await prisma.biometricUser.create({ data: row }).catch(() => {});
  });
  return { items, clashes };
}

/**
 * Copy kept fingerprints (and faces) to a machine, with each person's name
 * first. Templates made by another algorithm version are left out.
 */
async function fingerCommands({ schoolId, device, pushver, people, faces = true, restore = false, info: live = null }) {
  // What the machine says now (its fingerprint version), else what was saved.
  const info = { ...deviceInfo(device), ...(live || {}) };
  const names = new Map(people.map(([kind, p]) => [`${kind}-${p.id}`, p.name]));
  const users = (await prisma.biometricUser.findMany({
    where: { schoolId, personId: { not: null }, OR: [{ fingers: { gt: 0 } }, { faces: { gt: 0 } }] },
  })).filter((u) => names.has(`${u.personType}-${u.personId}`));
  const templates = users.length ? await prisma.biometricTemplate.findMany({
    where: { schoolId, pin: { in: users.map((u) => u.pin) }, kind: { in: faces ? ['finger', 'face'] : ['finger'] } },
    orderBy: [{ pin: 'asc' }, { slot: 'asc' }],
  }) : [];
  const byPin = new Map();
  for (const t of templates) byPin.set(t.pin, [...(byPin.get(t.pin) || []), t]);
  const items = [];
  let fingers = 0;
  let faceSets = 0;
  let unfit = 0;
  for (const u of users) {
    const list = (byPin.get(u.pin) || []).filter((t) => {
      const fits = P.versionFits(t, info);
      if (!fits) unfit++;
      // What this machine itself uploaded is on it already, unless it was
      // reset or replaced (restore).
      return fits && (restore || t.deviceId !== device.id);
    });
    if (!list.length) continue;
    items.push({ pin: u.pin, cmd: P.userCmd(pushver, u.pin, names.get(`${u.personType}-${u.personId}`) || u.machineName, u.card) });
    for (const t of list) {
      const cmd = P.templateCmd(pushver, t, info);
      if (!cmd) continue;
      items.push({ pin: u.pin, cmd });
      if (t.kind === 'finger') fingers++;
    }
    if (list.some((t) => t.kind === 'face')) faceSets++;
  }
  return { items, people: new Set(items.map((i) => i.pin)).size, fingers, faces: faceSets, unfit };
}

/** Machine users who belong to someone no longer at the school. */
async function leftOnMachine(schoolId, deviceId) {
  const users = await prisma.biometricUser.findMany({ where: { schoolId, personId: { not: null } } });
  const onThis = users.filter((u) => listOf(u.onDevices).includes(deviceId));
  const ids = (k) => onThis.filter((u) => u.personType === k).map((u) => u.personId);
  const [students, staff] = await Promise.all([
    prisma.student.findMany({ where: { schoolId, id: { in: ids('student') } }, select: { id: true, name: true, status: true, deletedAt: true } }),
    prisma.staff.findMany({ where: { schoolId, id: { in: ids('staff') } }, select: { id: true, name: true, isActive: true, deletedAt: true } }),
  ]);
  const gone = new Set([
    ...students.filter((s) => s.deletedAt || s.status !== 'active').map((s) => `student-${s.id}`),
    ...staff.filter((s) => s.deletedAt || !s.isActive).map((s) => `staff-${s.id}`),
  ]);
  // Linked to a record that no longer exists at all.
  const exists = new Set([...students.map((s) => `student-${s.id}`), ...staff.map((s) => `staff-${s.id}`)]);
  const N = new Map([...students.map((s) => [`student-${s.id}`, s.name]), ...staff.map((s) => [`staff-${s.id}`, s.name])]);
  return onThis.filter((u) => gone.has(`${u.personType}-${u.personId}`) || !exists.has(`${u.personType}-${u.personId}`))
    .map((u) => ({ pin: u.pin, name: N.get(`${u.personType}-${u.personId}`) || u.machineName || '' }));
}

module.exports = {
  listOf, enqueue, nextFor, answered, progress, recentCommands, cancelPending,
  personForPin, personQuery, ingestRecords, recount, keepUnmatched, linkPin, unlinkPin,
  activePeople, suggest, deviceInfo, peopleCommands, fingerCommands, leftOnMachine,
};
