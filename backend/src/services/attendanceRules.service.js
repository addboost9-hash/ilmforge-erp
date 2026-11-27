/**
 * IlmForge — what happens after the punches: students who did not come
 * marked absent at a set time, and the staff timesheet against their shifts.
 *
 * Auto-absent (Settings: attendanceDevices.autoAbsent):
 *   at the set time on a school day (not a holiday), every active student in
 *   the chosen classes with no attendance yet is marked absent (or on leave
 *   when a leave is approved), with the absent message to parents the
 *   register sends. Not when the machines were silent: if far fewer students
 *   arrived by machine than usual, nobody is marked and the office is told
 *   (it is tried again for two hours). The office can undo it for the day.
 *
 * Staff timesheet: each staff member's month, day by day, against their
 * shift: in, out, hours, late and early minutes, half days, overtime, absent
 * days (a working day with no attendance and no leave). A day can be
 * corrected by the office with a reason, kept in the audit log.
 */
const prisma = require('../config/prisma');
const P = require('./biometricProtocol');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');
const { dayStart } = require('./attendanceMark.service');
const { deviceSettings } = require('./attendanceDevice.service');

const PK_MS = 5 * 3600e3;
const DAY = 864e5;
const pkYmd = (d = new Date()) => new Date(new Date(d).getTime() + PK_MS).toISOString().slice(0, 10);
const pkWeekday = (d = new Date()) => new Date(new Date(d).getTime() + PK_MS).getUTCDay();
const two = (n) => String(n).padStart(2, '0');
// A stored attendance day (local midnight, as dayStart makes it) as YYYY-MM-DD.
const dayKey = (d) => { const t = new Date(d); return `${t.getFullYear()}-${two(t.getMonth() + 1)}-${two(t.getDate())}`; };

function cleanAutoAbsent(a = {}) {
  const share = Number(a.minShare);
  return {
    on: !!a.on,
    at: P.isClock(a.at) ? a.at : '09:30',
    classIds: Array.isArray(a.classIds) ? [...new Set(a.classIds.map(Number).filter((n) => n > 0))] : [],
    days: Array.isArray(a.days) && a.days.length ? [...new Set(a.days.map(Number).filter((d) => d >= 0 && d <= 6))].sort() : [1, 2, 3, 4, 5, 6],
    minShare: Number.isFinite(share) && share >= 0 && share <= 1 ? share : 0.3,
    notify: a.notify !== false,
  };
}

/* The school's holidays touching a range, as a lookup by YYYY-MM-DD.
   Holidays are saved from a date picker (midnight UTC): compared as dates. */
async function holidayLookup(schoolId, fromYmd, toYmd) {
  const start = new Date(`${fromYmd}T00:00:00Z`);
  const end = new Date(`${toYmd}T00:00:00Z`);
  const rows = await prisma.holidayEvent.findMany({
    where: {
      schoolId, eventType: 'holiday', startDate: { lt: new Date(end.getTime() + 2 * DAY) },
      OR: [{ endDate: { gte: new Date(start.getTime() - DAY) } }, { endDate: null, startDate: { gte: new Date(start.getTime() - DAY) } }],
    },
    select: { title: true, startDate: true, endDate: true },
  });
  return (ymd) => rows.find((h) => {
    const from = new Date(h.startDate).toISOString().slice(0, 10);
    const to = h.endDate ? new Date(h.endDate).toISOString().slice(0, 10) : from;
    return from <= ymd && ymd <= to;
  })?.title || null;
}

/* Approved leaves touching a day, as a set of applicant ids. */
async function onLeave(schoolId, type, ymd) {
  const day = new Date(`${ymd}T12:00:00Z`);
  const rows = await prisma.leaveApplication.findMany({
    where: { schoolId, applicantType: type, status: 'approved', fromDate: { lte: new Date(day.getTime() + DAY) }, toDate: { gte: new Date(day.getTime() - DAY) } },
    select: { applicantId: true, fromDate: true, toDate: true },
  });
  return new Set(rows.filter((l) => new Date(l.fromDate).toISOString().slice(0, 10) <= ymd && ymd <= new Date(l.toDate).toISOString().slice(0, 10)).map((l) => l.applicantId));
}

/* Student arrivals (first pass of the day, any machine or scanner) per day. */
async function arrivalsByDay(schoolId, from, to) {
  const rows = await prisma.biometricPunch.findMany({
    where: { schoolId, personType: 'student', direction: 'in', matched: true, punchTime: { gte: from, lt: to } },
    select: { punchTime: true },
  });
  const by = new Map();
  for (const r of rows) { const k = pkYmd(r.punchTime); by.set(k, (by.get(k) || 0) + 1); }
  return by;
}

/**
 * Mark the day's missing students absent, if it is time and safe.
 * @param {object} o
 * @param {Date}   [o.now]
 * @param {boolean}[o.force]   the office pressed "Run now": no time / done checks
 * @param {number} [o.userId]
 * @returns {{ ran, ok, marked, leave, reason, skipped }}
 */
async function runAutoAbsent(schoolId, { now = new Date(), force = false, userId = null } = {}) {
  const settings = await readSettings(schoolId);
  const cfg = cleanAutoAbsent(settings.attendanceDevices?.autoAbsent);
  const ymd = pkYmd(now);
  const last = settings.autoAbsentLast || {};
  const cutoff = P.toMin(cfg.at);
  const nowMin = P.pkMin(now);
  if (!force) {
    if (!cfg.on) return { ran: false, skipped: 'off' };
    if (last.date === ymd && (last.ok || last.gaveUp)) return { ran: false, skipped: 'done' };
    if (nowMin < cutoff) return { ran: false, skipped: 'early' };
    if (last.date === ymd && last.at && now.getTime() - new Date(last.at).getTime() < 10 * 60e3) return { ran: false, skipped: 'wait' };
  }
  const save = async (result) => {
    const gaveUp = !result.ok && nowMin > cutoff + 120;
    await mergeSettings(schoolId, { autoAbsentLast: { date: ymd, at: now.toISOString(), ok: !!result.ok, gaveUp, marked: result.marked || 0, leave: result.leave || 0, reason: result.reason || null, byUser: userId } });
    return { ran: true, ...result, gaveUp };
  };

  if (!cfg.days.includes(pkWeekday(now))) return save({ ok: false, reason: 'Today is not a school day in the auto-absent settings.' });
  const holiday = await (await holidayLookup(schoolId, ymd, ymd))(ymd);
  if (holiday) return save({ ok: false, reason: `Today is a holiday (${holiday}).` });

  const date = dayStart(now);
  const students = await prisma.student.findMany({
    where: { schoolId, deletedAt: null, status: 'active', ...(cfg.classIds.length ? { classId: { in: cfg.classIds } } : {}) },
    select: { id: true, name: true, campusId: true, classId: true, sectionId: true, emergencyPhone: true, fatherName: true, class: { select: { name: true } } },
  });
  const marked = new Set((await prisma.attendance.findMany({ where: { schoolId, date }, select: { studentId: true } })).map((a) => a.studentId));
  const missing = students.filter((s) => !marked.has(s.id));

  const byDay = await arrivalsByDay(schoolId, new Date(now.getTime() - 15 * DAY), new Date(now.getTime() + DAY));
  const today = byDay.get(ymd) || 0;
  const history = [...byDay.entries()].filter(([k]) => k !== ymd).map(([, n]) => n);
  const check = P.autoAbsentCheck({ today, history, inScope: students.length, minShare: cfg.minShare });
  if (!check.ok) return save({ ok: false, reason: check.reason, usual: check.usual, today });
  if (!missing.length) return save({ ok: true, marked: 0, leave: 0, reason: null });

  const leaves = await onLeave(schoolId, 'student', ymd);
  const rows = missing.map((s) => {
    const status = leaves.has(s.id) ? 'leave' : 'absent';
    return {
      schoolId, campusId: s.campusId || null, studentId: s.id, classId: s.classId || null, sectionId: s.sectionId || null,
      date, status, method: 'auto', markedBy: userId, notified: status === 'absent' && cfg.notify && !!s.emergencyPhone,
    };
  });
  let saved = 0;
  try {
    saved = (await prisma.attendance.createMany({ data: rows })).count;
  } catch {
    // Someone marked a student meanwhile: one by one, leaving theirs alone.
    for (const r of rows) { try { await prisma.attendance.create({ data: r }); saved++; } catch (e) { if (e.code !== 'P2002') throw e; } }
  }

  // The absent message the register sends, to the parents of those marked absent.
  let notified = 0;
  if (cfg.notify) {
    const { sendAbsentNotification } = require('./whatsapp.service');
    const { pkDate } = require('./messageTemplate');
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
    for (const s of missing) {
      if (leaves.has(s.id) || !s.emergencyPhone) continue;
      sendAbsentNotification({
        schoolId, parentPhone: s.emergencyPhone, parentName: s.fatherName, studentName: s.name,
        className: s.class?.name || '', date: pkDate(date), schoolName: school?.name || 'School',
      }).catch((e) => console.error('[auto-absent] message', e.message));
      notified++;
    }
  }
  const leave = rows.filter((r) => r.status === 'leave').length;
  return save({ ok: true, marked: saved - leave, leave, notified, today });
}

/** Take back today's automatic marks that nobody has changed since. */
async function undoAutoAbsent(schoolId, { now = new Date(), userId = null } = {}) {
  const date = dayStart(now);
  const r = await prisma.attendance.deleteMany({ where: { schoolId, date, method: 'auto', status: { in: ['absent', 'leave'] } } });
  const settings = await readSettings(schoolId);
  const last = settings.autoAbsentLast || {};
  // Undone: not run again today by itself.
  await mergeSettings(schoolId, { autoAbsentLast: { ...last, date: pkYmd(now), ok: true, undone: r.count, undoneBy: userId, undoneAt: now.toISOString() } });
  return { removed: r.count };
}

/** Every school with auto-absent on: run if it is time. */
async function runAutoAbsentAll(now = new Date()) {
  const schools = await prisma.school.findMany({ where: { settingsJson: { contains: '"autoAbsent"' } }, select: { id: true } });
  for (const s of schools) {
    try { await runAutoAbsent(s.id, { now }); } catch (e) { console.error(`[auto-absent] school ${s.id}:`, e.message); }
  }
}

/* ══ Staff timesheet ══ */

const STATUS_CODE = { present: 'P', late: 'L', absent: 'A', leave: 'LV' };

/**
 * A month for every active staff member (or one).
 * @returns {{ month, days: [{ ymd, d, weekday, holiday }], staff: [{ id, name, empCode, designation, department, shift, days: [...], totals }] }}
 */
async function staffTimesheet(schoolId, { year, month, staffId = null, departmentId = null, now = new Date() }) {
  const rules = await deviceSettings(schoolId);
  const count = new Date(year, month, 0).getDate();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const firstYmd = `${year}-${two(month)}-01`;
  const lastYmd = `${year}-${two(month)}-${two(count)}`;
  const holidayOn = await holidayLookup(schoolId, firstYmd, lastYmd);
  const todayKey = dayKey(dayStart(now));

  const staff = await prisma.staff.findMany({
    where: { schoolId, deletedAt: null, isActive: true, ...(staffId ? { id: staffId } : {}), ...(departmentId ? { departmentId } : {}) },
    select: { id: true, name: true, empCode: true, designation: true, joiningDate: true, createdAt: true, department: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  const ids = staff.map((s) => s.id);
  // Days before the school kept any staff attendance in IlmForge, or before
  // someone joined (or was added), are not absences.
  const firstEver = await prisma.staffAttendance.findFirst({ where: { schoolId }, orderBy: { date: 'asc' }, select: { date: true } });
  const trackFrom = firstEver ? dayKey(firstEver.date) : '9999-12-31';
  const startOf = (s) => [trackFrom, dayKey(s.createdAt), s.joiningDate ? new Date(s.joiningDate).toISOString().slice(0, 10) : ''].sort().pop();
  const [records, leaves, fixes] = await Promise.all([
    ids.length ? prisma.staffAttendance.findMany({ where: { schoolId, staffId: { in: ids }, date: { gte: start, lt: end } } }) : [],
    ids.length ? prisma.leaveApplication.findMany({
      where: { schoolId, applicantType: 'staff', applicantId: { in: ids }, status: 'approved', fromDate: { lt: new Date(end.getTime() + DAY) }, toDate: { gte: new Date(start.getTime() - DAY) } },
      select: { applicantId: true, fromDate: true, toDate: true },
    }) : [],
    prisma.auditLog.findMany({ where: { schoolId, action: 'staff_attendance_fix', createdAt: { gte: new Date(start.getTime() - 40 * DAY) } }, select: { resourceId: true, details: true, createdAt: true }, orderBy: { createdAt: 'desc' } }).catch(() => []),
  ]);
  const rec = new Map(records.map((r) => [`${r.staffId}|${dayKey(r.date)}`, r]));
  const fixOf = new Map();
  for (const f of fixes) if (f.resourceId && !fixOf.has(f.resourceId)) { try { fixOf.set(f.resourceId, JSON.parse(f.details || '{}').reason || ''); } catch { fixOf.set(f.resourceId, ''); } }
  const leaveOn = (id, ymd) => leaves.some((l) => l.applicantId === id && new Date(l.fromDate).toISOString().slice(0, 10) <= ymd && ymd <= new Date(l.toDate).toISOString().slice(0, 10));

  const days = Array.from({ length: count }, (_, i) => {
    const ymd = `${year}-${two(month)}-${two(i + 1)}`;
    return { ymd, d: i + 1, weekday: new Date(year, month - 1, i + 1).getDay(), holiday: holidayOn(ymd) };
  });

  const out = staff.map((s) => {
    const shift = rules.shiftFor(s.id);
    const from = startOf(s);
    const workDays = shift?.days || [1, 2, 3, 4, 5, 6];
    const totals = { present: 0, late: 0, halfDay: 0, absent: 0, leave: 0, off: 0, holiday: 0, lateMin: 0, earlyMin: 0, earlyDays: 0, workedMin: 0, overtimeMin: 0, missingOut: 0 };
    const list = days.map((day) => {
      const r = rec.get(`${s.id}|${day.ymd}`);
      const row = { ymd: day.ymd, code: '', in: null, out: null };
      if (r) {
        const ev = P.evalStaffDay(r, shift);
        Object.assign(row, {
          id: r.id, status: r.status, in: r.checkIn, out: r.checkOut, ...ev,
          fixed: r.method === 'corrected', reason: r.method === 'corrected' ? fixOf.get(r.id) || '' : undefined,
        });
        if (r.status === 'absent') { row.code = 'A'; totals.absent++; } else if (r.status === 'leave') { row.code = 'LV'; totals.leave++; } else {
          row.code = ev.halfDay ? 'HD' : STATUS_CODE[r.status] || 'P';
          if (ev.halfDay) totals.halfDay++; else totals.present++;
          if (r.status === 'late' || ev.lateMin > 0) totals.late++;
          totals.lateMin += ev.lateMin;
          totals.earlyMin += ev.earlyMin;
          if (ev.earlyMin > 0) totals.earlyDays++;
          totals.workedMin += ev.workedMin;
          totals.overtimeMin += ev.overtimeMin;
          if (ev.missingOut && day.ymd < todayKey) totals.missingOut++;
        }
      } else if (day.ymd < from) { row.code = ''; row.before = true; } else if (day.holiday) { row.code = 'H'; totals.holiday++; } else if (!workDays.includes(day.weekday)) { row.code = 'O'; totals.off++; } else if (leaveOn(s.id, day.ymd)) { row.code = 'LV'; totals.leave++; } else if (day.ymd < todayKey) { row.code = 'A'; totals.absent++; } else row.code = '';
      return row;
    });
    return {
      id: s.id, name: s.name, empCode: s.empCode || '', designation: s.designation || '', department: s.department?.name || '',
      shift: shift ? { id: shift.id, name: shift.name, start: shift.start, end: shift.end } : null, days: list, totals, countsFrom: from,
    };
  });
  return {
    month: `${year}-${two(month)}`, days, staff: out,
    lateRule: cleanLateRule((await readSettings(schoolId)).attendanceDevices?.lateRule),
  };
}

/* "Every 3 lates count as 1 day": shown on the timesheet, not applied to salaries. */
function cleanLateRule(r = {}) {
  const lates = parseInt(r?.lates, 10);
  const days = Number(r?.days);
  return lates >= 1 && lates <= 31 && days > 0 && days <= 5 ? { lates, days } : null;
}

/**
 * Correct one staff day: arrival, departure or the day's status, with the
 * reason kept in the audit log.
 */
async function fixStaffDay(schoolId, { staffId, ymd, checkIn, checkOut, status, reason, userId }) {
  const staff = await prisma.staff.findFirst({ where: { id: staffId, schoolId, deletedAt: null }, select: { id: true, name: true } });
  if (!staff) return { error: 'Staff member not found.', status: 404 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || '')) return { error: 'Choose the day.' };
  const why = String(reason || '').trim().slice(0, 200);
  if (why.length < 3) return { error: 'Write the reason for the change (it is kept in the audit log).' };
  const at = (hhmm) => (hhmm === null || hhmm === '' ? null : P.isClock(hhmm) ? new Date(`${ymd}T${hhmm}:00+05:00`) : undefined);
  const inAt = at(checkIn);
  const outAt = at(checkOut);
  if (inAt === undefined || outAt === undefined) return { error: 'Times are HH:MM, such as 08:05.' };
  if (inAt && outAt && outAt <= inAt) return { error: 'The departure must be after the arrival.' };
  if (status !== undefined && !['present', 'late', 'absent', 'leave'].includes(status)) return { error: 'Status is present, late, absent or leave.' };
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getTime() > dayStart(new Date()).getTime()) return { error: 'A day still to come cannot be corrected.' };

  const rules = await deviceSettings(schoolId);
  const shift = rules.shiftFor(staffId);
  let next = status;
  if (!next) {
    if (!inAt && !outAt) next = 'absent';
    else if (inAt && shift) next = P.pkMin(inAt) > P.toMin(shift.start) + shift.graceIn ? 'late' : 'present';
    else if (inAt && rules.staffLateAfter) next = P.pkMin(inAt) > P.toMin(rules.staffLateAfter) ? 'late' : 'present';
    else next = 'present';
  }
  const before = await prisma.staffAttendance.findUnique({ where: { staffId_date: { staffId, date } } });
  const data = { status: next, checkIn: ['absent', 'leave'].includes(next) ? null : inAt, checkOut: ['absent', 'leave'].includes(next) ? null : outAt, method: 'corrected', markedBy: userId || null };
  const row = before
    ? await prisma.staffAttendance.update({ where: { id: before.id }, data })
    : await prisma.staffAttendance.create({ data: { schoolId, staffId, date, ...data } });
  const view = (r) => (r ? { status: r.status, checkIn: r.checkIn, checkOut: r.checkOut } : null);
  await prisma.auditLog.create({
    data: {
      schoolId, userId: userId || null, action: 'staff_attendance_fix', resource: 'StaffAttendance', resourceId: row.id,
      details: JSON.stringify({ staffId, name: staff.name, date: ymd, before: view(before), after: view(row), reason: why }),
    },
  }).catch(() => {});
  return { row, name: staff.name };
}

module.exports = {
  cleanAutoAbsent, runAutoAbsent, undoAutoAbsent, runAutoAbsentAll, staffTimesheet, fixStaffDay, cleanLateRule, pkYmd, holidayLookup,
};
