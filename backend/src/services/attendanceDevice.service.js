/**
 * IlmForge — one way to mark attendance from a card scan, a QR code or a
 * fingerprint machine.
 *
 * Whatever was used, the person is found the same way and the result lands
 * in the same records the register uses: Attendance for a student (one per
 * student per day) and StaffAttendance for staff (check-in and check-out).
 * Every arrival or departure is also kept as a BiometricPunch, which feeds
 * the gate log and the kiosk screen's pop-up.
 *
 *   student: first pass of the day → present (late after the school's time);
 *            again within the gap → "already marked"; later → left school.
 *   staff:   first pass → checked in; later (after the gap) → checked out.
 *
 * Who a code belongs to (in this order):
 *   ID-<n>   a student's ID card when they have no roll number
 *   STF-<n>  a staff ID card when they have no employee code
 *   the roll number or employee code printed on the card (any capitals)
 *   a fingerprint machine's user number: 1<student no.> or 2<staff no.>
 */
const prisma = require('../config/prisma');
const { readSettings } = require('../utils/schoolSettings');
const { dayStart } = require('./attendanceMark.service');
const { cleanShift } = require('./biometricProtocol');

const PK_MS = 5 * 3600 * 1000;
const isClock = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));
const pkMinutes = (d) => { const p = new Date(new Date(d).getTime() + PK_MS); return p.getUTCHours() * 60 + p.getUTCMinutes(); };
const pkClock = (d) => new Date(new Date(d).getTime() + PK_MS).toISOString().slice(11, 16);
const toMinutes = (hhmm) => parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3), 10);

/* The number a person has on a fingerprint machine. Machines take digits
   only; the first digit says student (1) or staff (2). */
const devicePin = (kind, id) => `${kind === 'staff' ? 2 : 1}${id}`;

/* The school's rules for devices and scanners (Settings → Attendance
   devices). Times are Pakistan time, "HH:MM", or null for "never late".
   Staff on a shift are late after the shift's start and grace minutes;
   staff without one after staffLateAfter. */
async function deviceSettings(schoolId) {
  const s = (await readSettings(schoolId)).attendanceDevices || {};
  const gap = parseInt(s.gapMinutes, 10);
  const shifts = (Array.isArray(s.shifts) ? s.shifts : []).map(cleanShift).filter(Boolean);
  const byId = new Map(shifts.map((x) => [x.id, x]));
  const staffShifts = s.staffShifts && typeof s.staffShifts === 'object' && !Array.isArray(s.staffShifts) ? s.staffShifts : {};
  const defaultShift = byId.has(s.defaultShift) ? s.defaultShift : null;
  return {
    lateAfter: isClock(s.lateAfter) ? s.lateAfter : null,
    staffLateAfter: isClock(s.staffLateAfter) ? s.staffLateAfter : null,
    gapMinutes: gap >= 1 && gap <= 600 ? gap : 30,
    shifts,
    staffShifts,
    defaultShift,
    shiftFor: (staffId) => {
      const own = staffShifts[staffId];
      if (own === 'none') return null;
      return byId.get(own) || byId.get(defaultShift) || null;
    },
  };
}

const STUDENT_SELECT = {
  id: true, name: true, rollNo: true, fatherName: true, status: true, photoUrl: true,
  campusId: true, classId: true, sectionId: true,
  class: { select: { name: true } }, section: { select: { name: true } },
};
const STAFF_SELECT = {
  id: true, name: true, empCode: true, designation: true, photoUrl: true, isActive: true,
  department: { select: { name: true } },
};

/* Ids whose code matches, ignoring capitals. Done in SQL with lower() on
   both sides so SQLite (the desktop edition) and PostgreSQL (online) give
   the same answer: Prisma's case-insensitive mode exists only on PostgreSQL. */
async function idsByCode(table, column, schoolId, code) {
  const rows = table === 'Student'
    ? await prisma.$queryRaw`SELECT "id" FROM "Student" WHERE "schoolId" = ${schoolId} AND "deletedAt" IS NULL AND lower("rollNo") = lower(${code}) LIMIT 5`
    : await prisma.$queryRaw`SELECT "id" FROM "Staff" WHERE "schoolId" = ${schoolId} AND "deletedAt" IS NULL AND lower("empCode") = lower(${code}) LIMIT 5`;
  return rows.map((r) => Number(r.id));
}

/**
 * Who a scanned code or machine user number belongs to, in this school.
 * @returns {{ kind: 'student'|'staff', person } | { error, status }}
 */
async function findPerson(schoolId, rawCode) {
  // eslint-disable-next-line no-control-regex
  const code = String(rawCode ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  if (!code) return { error: 'Nothing was scanned.', status: 400 };
  const student = (id) => prisma.student.findFirst({ where: { id, schoolId, deletedAt: null }, select: STUDENT_SELECT });
  const staff = (id) => prisma.staff.findFirst({ where: { id, schoolId, deletedAt: null }, select: STAFF_SELECT });

  let m = /^ID-(\d{1,9})$/i.exec(code);
  if (m) { const p = await student(parseInt(m[1], 10)); if (p) return { kind: 'student', person: p }; }
  m = /^STF-(\d{1,9})$/i.exec(code);
  if (m) { const p = await staff(parseInt(m[1], 10)); if (p) return { kind: 'staff', person: p }; }

  const sIds = await idsByCode('Student', 'rollNo', schoolId, code);
  if (sIds.length) {
    const list = await prisma.student.findMany({ where: { id: { in: sIds } }, select: STUDENT_SELECT });
    const active = list.filter((s) => s.status === 'active');
    if (active.length > 1) return { error: `${active.length} students have roll number ${code}. Give each a different roll number.`, status: 409 };
    return { kind: 'student', person: active[0] || list[0] };
  }
  const tIds = await idsByCode('Staff', 'empCode', schoolId, code);
  if (tIds.length) {
    const list = await prisma.staff.findMany({ where: { id: { in: tIds } }, select: STAFF_SELECT });
    const active = list.filter((s) => s.isActive);
    if (active.length > 1) return { error: `${active.length} staff have employee code ${code}. Give each a different code.`, status: 409 };
    return { kind: 'staff', person: active[0] || list[0] };
  }

  // A fingerprint machine's user number.
  m = /^([12])(\d{1,8})$/.exec(code);
  if (m) {
    const id = parseInt(m[2], 10);
    const p = m[1] === '1' ? await student(id) : await staff(id);
    if (p) return { kind: m[1] === '1' ? 'student' : 'staff', person: p };
  }
  return { error: `No student or staff member has the code "${code}".`, status: 404 };
}

const personView = (kind, p) => (kind === 'student'
  ? {
    id: p.id, kind, name: p.name, rollNo: p.rollNo || '', fatherName: p.fatherName || '',
    className: p.class?.name || '', sectionName: p.section?.name || '', photoUrl: p.photoUrl || null,
    devicePin: devicePin('student', p.id),
  }
  : {
    id: p.id, kind, name: p.name, rollNo: p.empCode || '', className: p.designation || 'Staff',
    sectionName: p.department?.name || '', photoUrl: p.photoUrl || null, devicePin: devicePin('staff', p.id),
  });

/* The time of a pass: what the device or the offline queue says, when it is
   believable (the last 31 days, not ahead of now), else now. */
function passTime(at) {
  const now = Date.now();
  const t = at ? new Date(at).getTime() : NaN;
  if (Number.isNaN(t) || t > now + 5 * 60e3 || t < now - 31 * 864e5) return new Date(now);
  return new Date(t);
}

/**
 * Mark one pass.
 * @param {object} o
 * @param {number} o.schoolId
 * @param {'student'|'staff'} o.kind
 * @param {object} o.person          from findPerson
 * @param {Date}   [o.at]            when (device time, offline queue time)
 * @param {string} o.method          barcode | qr | fingerprint | face | card | password
 * @param {number} [o.deviceId]      BiometricDevice id
 * @param {number} [o.markedBy]      user id of whoever scanned
 * @param {'in'|'out'} [o.direction] the gate's explicit choice; else decided by time
 * @param {string} [o.lateAfter]     a scanner screen's own late time (else the school's)
 * @returns result: { kind, action: 'in'|'out'|'again', already, status, markedAt, person, message, duplicate? }
 */
async function markPass(o) {
  const { schoolId, kind, person, method, deviceId = null, markedBy = null } = o;
  const at = passTime(o.at);
  const rules = await deviceSettings(schoolId);
  const gapMs = rules.gapMinutes * 60e3;
  const date = dayStart(at);
  const next = new Date(date.getTime() + 24 * 3600e3);
  const view = personView(kind, person);

  // The same punch sent twice (a machine retrying its upload): once only.
  const dup = await prisma.biometricPunch.findFirst({
    where: { schoolId, personType: kind, personId: person.id, punchTime: at },
    select: { id: true },
  });
  if (dup) return { kind, action: 'again', already: true, duplicate: true, status: null, markedAt: at, person: view, message: `${person.name}: already received.` };

  const firstIn = async () => (await prisma.biometricPunch.findFirst({
    where: { schoolId, personType: kind, personId: person.id, punchTime: { gte: date, lt: next }, direction: 'in' },
    orderBy: { punchTime: 'asc' }, select: { punchTime: true },
  }))?.punchTime;

  let action = 'in';
  let status;
  let markedAt = at;
  const record = (direction) => prisma.biometricPunch.create({
    data: { schoolId, deviceId: deviceId || null, personType: kind, personId: person.id, method, direction, punchTime: at },
  });

  if (kind === 'student') {
    if (person.status && person.status !== 'active') {
      return { error: `${person.name} has left the school (status: ${person.status}).`, status: 409, person: view };
    }
    const lateAt = isClock(o.lateAfter) ? o.lateAfter : rules.lateAfter;
    const late = !!lateAt && pkMinutes(at) > toMinutes(lateAt);
    const existing = await prisma.attendance.findUnique({ where: { studentId_date: { studentId: person.id, date } } });
    const attMethod = method === 'fingerprint' || method === 'face' || method === 'card' ? 'biometric' : method === 'qr' ? 'qr' : 'barcode';
    if (existing && ['present', 'late'].includes(existing.status)) {
      status = existing.status;
      const first = (await firstIn()) || existing.createdAt;
      if (o.direction === 'out' || (o.direction !== 'in' && at - new Date(first) >= gapMs)) action = 'out';
      else { action = 'again'; markedAt = first; }
    } else {
      status = late && o.direction !== 'out' ? 'late' : 'present';
      try {
        if (existing) {
          // Marked absent or on leave earlier, but here now.
          await prisma.attendance.update({ where: { id: existing.id }, data: { status, method: attMethod, markedBy } });
        } else {
          await prisma.attendance.create({
            data: {
              schoolId, campusId: person.campusId || null, studentId: person.id, classId: person.classId || null,
              sectionId: person.sectionId || null, date, status, method: attMethod, markedBy,
            },
          });
        }
      } catch (err) {
        if (err.code !== 'P2002') throw err; // two passes at once: the other one saved it
      }
      if (o.direction === 'out') action = 'out';
    }
    await record(action);
    const message = action === 'out'
      ? `${person.name} left at ${pkClock(at)}.`
      : action === 'again'
        ? `${person.name} was already marked ${status} at ${pkClock(markedAt)}.`
        : `${person.name} marked ${status} at ${pkClock(at)}.`;
    return { kind, action, already: action === 'again', status, markedAt, person: view, message };
  }

  // Staff
  if (person.isActive === false) return { error: `${person.name} is not an active staff member.`, status: 409, person: view };
  const shift = rules.shiftFor(person.id);
  const staffLate = shift
    ? pkMinutes(at) > toMinutes(shift.start) + shift.graceIn
    : !!rules.staffLateAfter && pkMinutes(at) > toMinutes(rules.staffLateAfter);
  const existing = await prisma.staffAttendance.findUnique({ where: { staffId_date: { staffId: person.id, date } } });
  const staffMethod = ['fingerprint', 'face', 'card'].includes(method) ? 'biometric' : method === 'qr' ? 'qr' : 'barcode';
  let checkIn = existing?.checkIn || null;
  let checkOut = existing?.checkOut || null;
  try {
    if (!existing) {
      if (o.direction === 'out') {
        await prisma.staffAttendance.create({ data: { schoolId, staffId: person.id, date, status: 'present', checkOut: at, method: staffMethod, markedBy } });
        action = 'out'; checkOut = at; status = 'present';
      } else {
        status = staffLate ? 'late' : 'present';
        await prisma.staffAttendance.create({ data: { schoolId, staffId: person.id, date, status, checkIn: at, method: staffMethod, markedBy } });
        checkIn = at;
      }
    } else if (!existing.checkIn && o.direction !== 'out') {
      status = staffLate ? 'late' : 'present';
      await prisma.staffAttendance.update({ where: { id: existing.id }, data: { status, checkIn: at, method: staffMethod } });
      checkIn = at;
    } else if (existing.checkIn && at < existing.checkIn && o.direction !== 'out') {
      // An earlier punch uploaded late by the machine: the arrival moves back.
      status = existing.status;
      await prisma.staffAttendance.update({ where: { id: existing.id }, data: { checkIn: at } });
      checkIn = at;
    } else if (o.direction !== 'out' && existing.checkIn && at - existing.checkIn < gapMs) {
      action = 'again'; status = existing.status; markedAt = existing.checkIn;
    } else {
      action = 'out';
      status = ['absent', 'leave'].includes(existing.status) ? 'present' : existing.status;
      if (!existing.checkOut || at > existing.checkOut) {
        await prisma.staffAttendance.update({ where: { id: existing.id }, data: { checkOut: at, status } });
        checkOut = at;
      }
    }
  } catch (err) {
    if (err.code !== 'P2002') throw err;
    action = 'again'; status = 'present';
  }
  await record(action);
  const message = action === 'out'
    ? `${person.name} checked out at ${pkClock(at)}.`
    : action === 'again'
      ? `${person.name} is already checked in (${pkClock(markedAt)}).`
      : `${person.name} checked in at ${pkClock(at)}${status === 'late' ? ' (late)' : ''}.`;
  return { kind, action, already: action === 'again', status: action === 'out' ? 'checked out' : status, markedAt, checkIn, checkOut, person: view, message };
}

module.exports = { findPerson, markPass, devicePin, deviceSettings, personView, pkClock, isClock, STUDENT_SELECT, STAFF_SELECT };
