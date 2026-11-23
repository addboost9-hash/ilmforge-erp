const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { findPerson, markPass, personView, pkClock, STUDENT_SELECT, STAFF_SELECT } = require('../services/attendanceDevice.service');
const { dayStart } = require('../services/attendanceMark.service');
const ExcelJS = require('exceljs');
const { sendAbsentNotification } = require('../services/whatsapp.service');
const { pkDate } = require('../services/messageTemplate');
const { sendSMS } = require('../services/sms.service');
const { requireRole } = require('../middleware/auth.middleware');
const { teacherCanAccessClass } = require('../utils/teacherScope');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// The mount in app.js is being broadened to let student/parent reach this
// router at all (so /summary and /student/:id/history can serve their own
// data) — every whole-class/whole-staff endpoint that has no per-row scoping
// of its own must explicitly re-check the role itself.
const staffOnly = (req, res, next) => {
  if (!['super_admin', 'admin', 'teacher', 'gatekeeper', 'principal'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

/* The ids a request writes for. They came straight from the request body, so
   a teacher allowed one class could overwrite another class's (or another
   school's) attendance and text those parents. Returns null when all are
   this school's (and, with classId, this class's), else a message. */
const STATUSES = ['present', 'absent', 'leave', 'late'];
async function badStudentIds(schoolId, classId, ids) {
  const want = [...new Set(ids.map((x) => parseInt(x)).filter(Number.isInteger))];
  if (!want.length || want.length !== ids.length) return 'Each record needs the student it is for.';
  const found = await prisma.student.findMany({
    where: { id: { in: want }, schoolId, deletedAt: null, ...(classId && { classId: parseInt(classId) }) },
    select: { id: true },
  });
  return found.length === want.length ? null : 'Some of these students are not in this class.';
}
async function badStaffIds(schoolId, ids) {
  const want = [...new Set(ids.map((x) => parseInt(x)).filter(Number.isInteger))];
  if (!want.length || want.length !== ids.length) return 'Each record needs the staff member it is for.';
  const found = await prisma.staff.count({ where: { id: { in: want }, schoolId } });
  return found === want.length ? null : 'Some of these staff are not of this school.';
}
// Pakistan clock time of an instant, "08:05"; and a day's clock time as an instant.
const PKT_MS = 5 * 3600 * 1000;
const pkClockOf = (d) => (d ? new Date(new Date(d).getTime() + PKT_MS).toISOString().slice(11, 16) : null);
const pkInstant = (ymd, hhmm) => {
  if (!ymd || !/^\d{1,2}:\d{2}$/.test(String(hhmm || ''))) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  const [y, mo, d] = String(ymd).slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h, m) - PKT_MS);
  return Number.isNaN(t.getTime()) ? null : t;
};
const ADMIN_ROLES = ['super_admin', 'admin', 'principal'];

// ---------------------------------------------------------------------------
// EXISTING ENDPOINTS
// ---------------------------------------------------------------------------

// GET /api/v1/attendance?classId=&date=&method=
// method (optional): filter to only students with a matching Attendance.method
// (e.g. 'barcode') — used by kiosk pages like BarcodeScanPage's "Recent Scans".
router.get('/', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date, method } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(campusId && { campusId }),
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
    include: { class: { select: { name: true } } },
    orderBy: { rollNo: 'asc' },
  });

  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: targetDate, lt: nextDay },
      ...(classId && { classId: parseInt(classId) }),
      ...(method && { method }),
    },
  });
  const recordMap = {};
  records.forEach(r => { recordMap[r.studentId] = r; });

  let result = students.map(s => ({ ...s, attendance: recordMap[s.id] || null }));
  if (method) result = result.filter(s => s.attendance);
  res.json({ success: true, data: result, date: targetDate.toISOString() });
}));

// POST /api/v1/attendance/save - Save attendance + trigger absent SMS
// FIX: batch all upserts into a single prisma.$transaction; fetch absent-student
// phone numbers in ONE query instead of one-per-student.
router.post('/save', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date, records, notifyAbsent = true } = req.body;
  if (!classId || !records) return res.status(400).json({ success: false, message: 'classId and records required.' });
  if (!(await teacherCanAccessClass(req, classId))) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }
  if (!Array.isArray(records) || !records.length) return res.status(400).json({ success: false, message: 'Nothing to save.' });
  if (records.some((r) => !STATUSES.includes(r?.status))) return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}.` });
  const wrongIds = await badStudentIds(schoolId, classId, records.map((r) => r.studentId));
  if (wrongIds) return res.status(400).json({ success: false, message: wrongIds });

  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0, 0, 0, 0);
  const school = await prisma.school.findUnique({ where: { id: schoolId } });

  // Look up prior state for every record in this save BEFORE upserting, so a
  // student already marked absent+notified today doesn't get re-texted every
  // time the day's attendance is re-saved (e.g. fixing an unrelated typo).
  const existingRecords = await prisma.attendance.findMany({
    where: { studentId: { in: records.map(r => r.studentId) }, date: targetDate },
    select: { studentId: true, status: true, notified: true },
  });
  const existingMap = new Map(existingRecords.map(r => [r.studentId, r]));

  const absentIds = [];
  const ops = records.map(record => {
    const prior = existingMap.get(record.studentId);
    const alreadyNotified = prior?.status === 'absent' && prior?.notified && record.status === 'absent';
    const shouldNotify = record.status === 'absent' && notifyAbsent && !alreadyNotified;
    if (shouldNotify) absentIds.push(record.studentId);

    return prisma.attendance.upsert({
      where: { studentId_date: { studentId: record.studentId, date: targetDate } },
      update: {
        status: record.status, markedBy: req.user.id, method: record.method || 'manual',
        ...(shouldNotify ? { notified: true } : record.status !== 'absent' ? { notified: false } : {}),
      },
      create: {
        schoolId, campusId: campusId || null, studentId: record.studentId,
        classId: parseInt(classId), sectionId: sectionId ? parseInt(sectionId) : null,
        date: targetDate, status: record.status, markedBy: req.user.id, method: record.method || 'manual',
        notified: shouldNotify,
      },
    });
  });

  // Execute all upserts in a single transaction
  await prisma.$transaction(ops);
  const saved = records.length;

  // Fetch all absent students' phone numbers in ONE query — only for those
  // that actually need a fresh notification this save.
  let notified = 0;
  if (absentIds.length > 0) {
    const absentStudents = await prisma.student.findMany({
      where: { id: { in: absentIds } },
      select: { id: true, name: true, emergencyPhone: true, fatherName: true, class: { select: { name: true } } },
    });

    // The alert named the class by its number ("(3)") and gave the date in
    // the server's own format and time zone, where a school day's midnight
    // is still the day before.
    for (const student of absentStudents) {
      if (student.emergencyPhone) {
        sendAbsentNotification({
          schoolId, parentPhone: student.emergencyPhone, parentName: student.fatherName, studentName: student.name,
          className: student.class?.name || '', date: pkDate(targetDate),
          schoolName: school?.name || 'School',
        }).catch(console.error);
        notified++;
      }
    }
  }

  res.json({ success: true, saved, notified, message: `${saved} records saved. ${notified} absent notifications sent.` });
}));

// POST /api/v1/attendance/staff — Save staff attendance records
// Body: { date, records: [{staffId, status, timeIn, timeOut}] }
// GET /api/v1/attendance/staff?date= — was entirely missing; the Staff
// Attendance page calls this to pre-populate the form for the selected date,
// and its .catch(() => []) silently hid the 404, so a re-opened date always
// looked blank even after a successful save.
router.get('/staff', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const records = await prisma.staffAttendance.findMany({
    where: { schoolId, date: targetDate },
  });

  // Pakistan time: the live server's clock is UTC, so 08:05 showed as 03:05.
  const toTimeStr = pkClockOf;

  const data = records.map(r => ({
    staffId: r.staffId,
    status: r.status,
    timeIn: toTimeStr(r.checkIn),
    timeOut: toTimeStr(r.checkOut),
  }));

  res.json({ success: true, data });
}));

router.post('/staff', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { date, records } = req.body;
  // The office marks staff (teachers could mark themselves present).
  if (!ADMIN_ROLES.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Only the office marks staff attendance.' });
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'records array is required.' });
  }
  const wrongStaff = await badStaffIds(schoolId, records.map((r) => r.staffId));
  if (wrongStaff) return res.status(400).json({ success: false, message: wrongStaff });
  if (records.some((r) => r.status && !STATUSES.includes(r.status))) return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}.` });
  const dayYmd = /^\d{4}-\d{2}-\d{2}/.test(String(date || '')) ? String(date).slice(0, 10) : new Date(Date.now() + PKT_MS).toISOString().slice(0, 10);

  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  // FIX: the StaffAttendance model has checkIn/checkOut columns, not
  // timeIn/timeOut — every upsert here previously threw a Prisma unknown-field
  // error on every record (silently swallowed by the per-record .catch and
  // the outer try/catch, which both reported fake success), so staff
  // attendance never actually persisted despite the "saved" message.
  let saved = 0;
  for (const rec of records) {
    // Times typed are Pakistan times of that day. A time left out keeps the
    // one already recorded (a fingerprint check-in is not wiped by a save).
    const toDateTime = (t) => pkInstant(dayYmd, t);
    const checkIn = toDateTime(rec.timeIn);
    const checkOut = toDateTime(rec.timeOut);
    await prisma.staffAttendance.upsert({
      where: { staffId_date: { staffId: parseInt(rec.staffId), date: targetDate } },
      update: {
        status: rec.status || 'present',
        ...(checkIn && { checkIn }),
        ...(checkOut && { checkOut }),
        markedBy: req.user?.id || null,
      },
      create: {
        schoolId,
        staffId: parseInt(rec.staffId),
        date: targetDate,
        status: rec.status || 'present',
        checkIn:  toDateTime(rec.timeIn),
        checkOut: toDateTime(rec.timeOut),
        markedBy: req.user?.id || null,
      },
    });
    saved++;
  }

  res.json({ success: true, message: `${saved} staff attendance records saved.` });
}));

// GET /api/v1/attendance/period
// Compatibility endpoint for period attendance UI.
// Since schema stores one daily status per student, this returns a single pseudo-period row per student.
router.get('/period', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, date } = req.query;
  if (!classId) return res.status(400).json({ success: false, message: 'classId is required.' });

  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      classId: parseInt(classId),
      date: { gte: targetDate, lt: nextDay },
    },
    select: { studentId: true, status: true },
  });

  const data = records.map(r => ({ studentId: r.studentId, period: 1, status: r.status }));
  res.json({ success: true, data });
}));

// POST /api/v1/attendance/period
// Compatibility endpoint for period attendance UI.
// Reduces period-wise statuses into one daily status and persists in Attendance.
router.post('/period', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date, records } = req.body;

  if (!classId || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'classId and records are required.' });
  }
  // The same rules as the register: who may mark, their own class, its students.
  if (!REGISTER_EDITORS.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Only teachers and the office mark attendance.' });
  if (!(await teacherCanAccessClass(req, classId))) return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  const wrongIds = await badStudentIds(schoolId, classId, [...new Set(records.map((r) => r?.studentId))]);
  if (wrongIds) return res.status(400).json({ success: false, message: wrongIds });

  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const grouped = new Map();
  for (const r of records) {
    if (!r?.studentId) continue;
    if (!grouped.has(r.studentId)) grouped.set(r.studentId, []);
    grouped.get(r.studentId).push(String(r.status || 'present').toLowerCase());
  }

  const reduceStatus = (statuses) => {
    if (statuses.includes('absent')) return 'absent';
    if (statuses.includes('leave')) return 'leave';
    if (statuses.includes('late')) return 'late';
    return 'present';
  };

  let saved = 0;
  for (const [studentId, statuses] of grouped.entries()) {
    const finalStatus = reduceStatus(statuses);
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: parseInt(studentId), date: targetDate } },
      update: { status: finalStatus, markedBy: req.user.id, method: 'manual' },
      create: {
        schoolId,
        campusId: campusId || null,
        studentId: parseInt(studentId),
        classId: parseInt(classId),
        sectionId: sectionId ? parseInt(sectionId) : null,
        date: targetDate,
        status: finalStatus,
        markedBy: req.user.id,
        method: 'manual',
      },
    });
    saved++;
  }

  res.json({ success: true, message: `${saved} period attendance records processed.` });
}));

// GET /api/v1/attendance/period/summary
// Monthly attendance summary per student for the Period Attendance report
// tab. The schema stores one daily status per student (no per-period rows —
// see the /period compatibility endpoints above), so this aggregates the
// existing daily Attendance records for the month rather than true
// per-period data. subjectId is accepted but not filterable (attendance
// isn't stored per-subject) and is echoed back as "All".
router.get('/period/summary', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, sectionId, month, year } = req.query;
  if (!classId) return res.status(400).json({ success: false, message: 'classId is required.' });

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      classId: parseInt(classId),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
    select: { id: true, name: true, rollNo: true },
    orderBy: { rollNo: 'asc' },
  });

  const data = await Promise.all(students.map(async (s) => {
    const records = await prisma.attendance.findMany({
      where: { schoolId, studentId: s.id, date: { gte: startDate, lt: endDate } },
      select: { status: true },
    });
    const present = records.filter(r => r.status === 'present').length;
    const absent  = records.filter(r => r.status === 'absent').length;
    const leave   = records.filter(r => r.status === 'leave').length;
    const late    = records.filter(r => r.status === 'late').length;
    const total   = records.length;
    return {
      studentId: s.id,
      studentName: s.name,
      rollNo: s.rollNo,
      subjectName: 'All',
      total, present, absent, leave, late,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }));

  res.json({ success: true, data, month: m, year: y });
}));

// POST /api/v1/attendance/bulk-import
// Body: { records: [{ date, rollNo?, studentName?, status, remarks? }] }
// CSV-driven bulk attendance import (AttendanceExcelPage). Resolves each row
// to a student by rollNo (preferred) or exact studentName within the school.
router.post('/bulk-import', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { records } = req.body;
  if (!ADMIN_ROLES.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Only the office imports attendance.' });
  if (!Array.isArray(records) || !records.length) {
    return res.status(400).json({ success: false, message: 'records array is required.' });
  }

  const rollNos = [...new Set(records.map(r => r.rollNo).filter(Boolean))];
  const names   = [...new Set(records.map(r => r.studentName).filter(Boolean))];

  const students = await prisma.student.findMany({
    where: {
      schoolId, deletedAt: null, status: 'active',
      OR: [
        ...(rollNos.length ? [{ rollNo: { in: rollNos } }] : []),
        ...(names.length ? [{ name: { in: names } }] : []),
      ],
    },
    select: { id: true, rollNo: true, name: true, classId: true, sectionId: true },
  });
  // A roll number or name two students share is not used: it could be either.
  const unique = (key) => {
    const m = new Map();
    for (const st of students) { const k = st[key]; if (!k) continue; m.set(k, m.has(k) ? 'many' : st); }
    return m;
  };
  const byRoll = unique('rollNo');
  const byName = unique('name');

  let imported = 0;
  const failed = [];
  for (const r of records) {
    const pick = (r.rollNo && byRoll.get(r.rollNo)) || (r.studentName && byName.get(r.studentName));
    if (pick === 'many') { failed.push({ ...r, reason: 'More than one student has this roll number or name' }); continue; }
    const student = pick;
    if (!student) { failed.push({ ...r, reason: 'Student not found' }); continue; }
    if (!STATUSES.includes(r.status)) { failed.push({ ...r, reason: `Status must be one of: ${STATUSES.join(', ')}` }); continue; }
    const targetDate = new Date(r.date); targetDate.setHours(0, 0, 0, 0);
    if (isNaN(targetDate.getTime())) { failed.push({ ...r, reason: 'Invalid date' }); continue; }

    // NOTE: Attendance model has no `remarks` column (see schema.prisma) — including
    // it in the upsert data unconditionally made this throw a Prisma unknown-argument
    // error on every single row, so bulk import always failed.
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: student.id, date: targetDate } },
      update: { status: r.status, markedBy: req.user.id, method: 'import' },
      create: {
        schoolId, campusId: campusId || null,
        studentId: student.id, classId: student.classId, sectionId: student.sectionId,
        date: targetDate, status: r.status,
        markedBy: req.user.id, method: 'import',
      },
    });
    imported++;
  }

  res.json({ success: true, data: { imported, failed: failed.length, failedRows: failed }, message: `${imported} record(s) imported.` });
}));

/* What a scanner typed: the QR code and the barcode on an IlmForge ID card
   hold the roll number (staff: employee code). Scanners may add spaces or
   control characters, and the Code 39 barcode reads in capitals. */
const scannedCode = (raw) => String(raw ?? '')
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .trim()
  .slice(0, 80);

// GET /api/v1/attendance/summary-today?date= — how many students are in
// today, for the scanning screen's counter.
router.get('/summary-today', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const targetDate = req.query.date ? new Date(req.query.date) : new Date(); targetDate.setHours(0, 0, 0, 0);
  if (Number.isNaN(targetDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid date.' });
  const [present, late, students, staffIn] = await Promise.all([
    prisma.attendance.count({ where: { schoolId, date: targetDate, status: 'present' } }),
    prisma.attendance.count({ where: { schoolId, date: targetDate, status: 'late' } }),
    prisma.student.count({ where: { schoolId, status: 'active', deletedAt: null } }),
    prisma.staffAttendance.count({ where: { schoolId, date: targetDate, checkIn: { not: null } } }),
  ]);
  res.json({ success: true, data: { present: present + late, late, students, staffIn } });
}));

// POST /api/v1/attendance/barcode-scan — one scan at the gate or classroom.
// Body: { barcode, date?, lateAfter?: "HH:MM" }
//   student card → present (or late after lateAfter); a second scan the
//                  same day says when they were marked instead of re-saving.
//   staff card   → check-in, and a later scan checks them out.
// GET /attendance/gate-log?date=YYYY-MM-DD — students in and out through the
// gate that day, latest first. Scans from before exits were kept show as
// the arrival the register recorded.
router.get('/gate-log', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const day = req.query.date ? new Date(String(req.query.date)) : new Date(); day.setHours(0, 0, 0, 0);
  if (Number.isNaN(day.getTime())) return res.status(400).json({ success: false, message: 'Invalid date.' });
  const next = new Date(day.getTime() + 24 * 3600e3);
  const [punches, scanned] = await Promise.all([
    prisma.biometricPunch.findMany({ where: { schoolId, personType: 'student', direction: { in: ['in', 'out'] }, punchTime: { gte: day, lt: next } }, orderBy: { punchTime: 'desc' }, take: 2000 }),
    prisma.attendance.findMany({ where: { schoolId, date: day, method: { in: ['barcode', 'qr', 'biometric'] } }, select: { id: true, studentId: true, createdAt: true } }),
  ]);
  const cameIn = new Set(punches.filter((p) => p.direction === 'in').map((p) => p.personId));
  const rows = [
    ...punches.map((p) => ({ id: `p${p.id}`, studentId: p.personId, direction: p.direction === 'out' ? 'OUT' : 'IN', method: p.method, createdAt: p.punchTime })),
    ...scanned.filter((a) => !cameIn.has(a.studentId)).map((a) => ({ id: `a${a.id}`, studentId: a.studentId, direction: 'IN', createdAt: a.createdAt })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const ids = [...new Set(rows.map((r) => r.studentId))];
  const [students, marks] = await Promise.all([
    prisma.student.findMany({ where: { schoolId, id: { in: ids } }, select: { id: true, name: true, rollNo: true, class: { select: { name: true } }, section: { select: { name: true } } } }),
    prisma.attendance.findMany({ where: { schoolId, date: day, studentId: { in: ids } }, select: { studentId: true, status: true } }),
  ]);
  const S = new Map(students.map((s) => [s.id, s]));
  const M = new Map(marks.map((m) => [m.studentId, m.status]));
  // Inside now: the latest pass was in.
  const latest = new Map();
  for (const r of rows) if (!latest.has(r.studentId)) latest.set(r.studentId, r.direction);
  res.json({
    success: true,
    data: rows.map((r) => {
      const s = S.get(r.studentId);
      return { ...r, status: M.get(r.studentId) || null, className: s?.class?.name || '', section: s?.section?.name || '', student: { name: s?.name || `Student ${r.studentId}`, rollNo: s?.rollNo || '' } };
    }),
    presentToday: [...new Set(rows.filter((r) => r.direction === 'IN').map((r) => r.studentId))].length,
    insideNow: [...latest.values()].filter((d) => d === 'IN').length,
  });
}));

router.post('/barcode-scan', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const code = scannedCode(req.body.barcode);
  if (!code) return res.status(400).json({ success: false, message: 'Nothing was scanned.' });
  // The scan's own time when it was kept offline and sent later; the same
  // marking as a fingerprint machine (services/attendanceDevice.service).
  const found = await findPerson(schoolId, code);
  if (found.error) {
    return res.status(found.status).json({ success: false, code: found.status === 404 ? 'unknown' : 'conflict', message: found.error });
  }
  const dir = String(req.body.direction || '').toLowerCase();
  const r = await markPass({
    schoolId, kind: found.kind, person: found.person, at: req.body.scannedAt,
    method: req.body.method === 'qr' ? 'qr' : 'barcode', markedBy: req.user.id,
    direction: dir === 'out' ? 'out' : dir === 'in' ? 'in' : undefined,
    lateAfter: req.body.lateAfter,
  });
  if (r.error) return res.status(r.status || 409).json({ success: false, code: 'inactive', message: r.error, data: { person: r.person } });
  const day = dayStart(r.markedAt && r.action !== 'again' ? r.markedAt : new Date());
  const presentToday = await prisma.attendance.count({ where: { schoolId, date: day, status: { in: ['present', 'late'] } } });
  const p = r.person;
  return res.json({
    success: true,
    data: {
      kind: r.kind, status: r.status, already: r.already, action: r.action, markedAt: r.markedAt,
      direction: r.action === 'out' ? 'out' : 'in', checkIn: r.checkIn, checkOut: r.checkOut, presentToday,
      person: p,
      // the same, under the name the gate portal reads
      student: r.kind === 'student' ? { id: p.id, name: p.name, rollNo: p.rollNo, className: p.className, class: p.className } : undefined,
    },
    message: r.message,
  });
}));

// GET /attendance/kiosk/feed?after=<id> — passes from fingerprint machines
// (and other kiosks) since the last one this screen saw, for its pop-up.
// Without "after" it only says where to start.
router.get('/kiosk/feed', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const after = parseInt(req.query.after, 10);
  const latest = await prisma.biometricPunch.findFirst({ where: { schoolId }, orderBy: { id: 'desc' }, select: { id: true } });
  if (!(after >= 0)) return res.json({ success: true, data: [], latestId: latest?.id || 0 });
  const methods = String(req.query.methods || 'fingerprint,face,card,password').split(',').filter(Boolean);
  const rows = await prisma.biometricPunch.findMany({
    where: { schoolId, id: { gt: after }, method: { in: methods } },
    orderBy: { id: 'asc' }, take: 30,
  });
  const ids = (k) => [...new Set(rows.filter((r) => r.personType === k).map((r) => r.personId))];
  const [students, staff] = await Promise.all([
    prisma.student.findMany({ where: { schoolId, id: { in: ids('student') } }, select: STUDENT_SELECT }),
    prisma.staff.findMany({ where: { schoolId, id: { in: ids('staff') } }, select: STAFF_SELECT }),
  ]);
  const S = new Map(students.map((s) => [s.id, s]));
  const T = new Map(staff.map((s) => [s.id, s]));
  const days = [...new Set(rows.filter((r) => r.personType === 'student').map((r) => dayStart(r.punchTime).getTime()))];
  const marks = days.length ? await prisma.attendance.findMany({
    where: { schoolId, studentId: { in: ids('student') }, date: { in: days.map((d) => new Date(d)) } },
    select: { studentId: true, date: true, status: true },
  }) : [];
  const M = new Map(marks.map((m) => [`${m.studentId}:${new Date(m.date).getTime()}`, m.status]));
  const data = rows.map((r) => {
    const raw = r.personType === 'staff' ? T.get(r.personId) : S.get(r.personId);
    const person = raw ? personView(r.personType, raw) : { id: r.personId, kind: r.personType, name: `Unknown (${r.personType} ${r.personId})` };
    const action = r.direction === 'out' ? 'out' : r.direction === 'again' ? 'again' : 'in';
    const status = r.personType === 'staff'
      ? (action === 'out' ? 'checked out' : 'present')
      : M.get(`${r.personId}:${dayStart(r.punchTime).getTime()}`) || 'present';
    return {
      id: r.id, kind: r.personType, method: r.method, action, already: action === 'again', status, markedAt: r.punchTime, person,
      message: action === 'out' ? `${person.name} ${r.personType === 'staff' ? 'checked out' : 'left'} at ${pkClock(r.punchTime)}.`
        : action === 'again' ? `${person.name} is already marked.` : `${person.name} marked ${status} at ${pkClock(r.punchTime)}.`,
    };
  });
  res.json({ success: true, data, latestId: rows.length ? rows[rows.length - 1].id : Math.max(after, 0) });
}));

// GET /api/v1/attendance/report
router.get('/report', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, month, year } = req.query;

  const startDate = new Date(parseInt(year) || new Date().getFullYear(), (parseInt(month) || new Date().getMonth() + 1) - 1, 1);
  const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);

  const records = await prisma.attendance.findMany({
    where: {
      schoolId, date: { gte: startDate, lt: endDate },
      ...(campusId && { campusId }),
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
    include: { student: { select: { name: true, rollNo: true } } },
    orderBy: [{ student: { name: 'asc' } }, { date: 'asc' }],
  });

  res.json({ success: true, data: records, month: startDate.getMonth() + 1, year: startDate.getFullYear() });
}));

// GET /api/v1/attendance/summary
// FIX: replaced per-student COUNT queries with a single findMany for the entire
// date range, then aggregated in JavaScript keyed by studentId.
router.get('/summary', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, sectionId, month, year, studentId } = req.query;
  const startDate = new Date(parseInt(year) || new Date().getFullYear(), (parseInt(month) || new Date().getMonth() + 1) - 1, 1);
  const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);

  // FIX: this endpoint previously ignored a `studentId` query param entirely
  // (the Student Portal calls it with exactly that param to get its own
  // attendance %), so it always ran unfiltered and returned the WHOLE
  // school's summary array to any caller — the frontend's `.percentage`
  // access on that array was always undefined, and every role could pull
  // every other student's attendance counts. Students/parents are now
  // hard-restricted to their own (or their linked children's) record;
  // an explicit studentId is honored for staff roles.
  let effectiveStudentId = studentId ? parseInt(studentId) : null;
  let familyIds = null;
  if (req.user?.role === 'student') {
    const self = await prisma.student.findFirst({ where: { schoolId, userId: req.user.id, deletedAt: null }, select: { id: true } });
    effectiveStudentId = self?.id || -1;
  } else if (req.user?.role === 'parent') {
    if (effectiveStudentId) {
      const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
      const link = parent ? await prisma.parentStudent.findFirst({ where: { schoolId, parentId: parent.id, studentId: effectiveStudentId } }) : null;
      if (!link) return res.status(403).json({ success: false, message: 'Access denied for this student.' });
    } else {
      const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
      const links = parent ? await prisma.parentStudent.findMany({ where: { schoolId, parentId: parent.id }, select: { studentId: true } }) : [];
      if (links.length === 1) effectiveStudentId = links[0].studentId;
      // With no child, or several, it used to return the whole school.
      else familyIds = links.map((l) => l.studentId);
    }
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
      ...(effectiveStudentId && { id: effectiveStudentId }),
      ...(familyIds && { id: { in: familyIds.length ? familyIds : [-1] } }),
    },
  });

  // ONE query for all attendance records in the range
  const allRecords = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: startDate, lt: endDate },
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
      ...(effectiveStudentId && { studentId: effectiveStudentId }),
    },
    select: { studentId: true, status: true },
  });

  // Aggregate in JavaScript
  const counts = {};
  for (const r of allRecords) {
    if (!counts[r.studentId]) counts[r.studentId] = { present: 0, absent: 0, leave: 0, late: 0 };
    const c = counts[r.studentId];
    if (r.status === 'present') c.present++;
    else if (r.status === 'absent') c.absent++;
    else if (r.status === 'leave') c.leave++;
    else if (r.status === 'late') c.late++;
  }

  const summaries = students.map(s => {
    const c = counts[s.id] || { present: 0, absent: 0, leave: 0, late: 0 };
    const total = c.present + c.absent + c.leave + c.late;
    return {
      studentId: s.id, name: s.name, rollNo: s.rollNo, fatherName: s.fatherName,
      present: c.present, absent: c.absent, leave: c.leave, late: c.late,
      total, percentage: total > 0 ? Math.round((c.present / total) * 100) : 0,
    };
  });

  res.json({ success: true, data: summaries });
}));

// ---------------------------------------------------------------------------
// THE ATTENDANCE REGISTER: a class's month, a row per student and a column
// per day, as the register book is kept. Read live from the attendance
// records, so whatever is marked (the daily register, the kiosk, a
// fingerprint, a correction) shows at once.
//
//   GET /attendance/register?classId=&sectionId=&month=YYYY-MM
//   PUT /attendance/register/mark  { studentId, date: YYYY-MM-DD, status }
//       status: present | absent | leave | late | clear (not marked)
//
// A day is stored as the server's midnight, as /save stores it, so the
// month is read with the server's own calendar too.
// ---------------------------------------------------------------------------
const REGISTER_EDITORS = ['super_admin', 'admin', 'principal', 'teacher'];
const REGISTER_STATUSES = ['present', 'absent', 'leave', 'late'];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pkToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const ymdOf = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const mayOpenClass = async (req, classId) => (['super_admin', 'admin', 'principal', 'gatekeeper'].includes(req.user?.role)
  || (req.user?.role === 'teacher' && await teacherCanAccessClass(req, classId)));

/* The school's holidays touching [start, end), as a lookup by YYYY-MM-DD.
   Holidays are saved from a date picker (midnight UTC): compared as dates. */
async function holidayLookup(schoolId, start, end) {
  const day = 864e5;
  const holidays = await prisma.holidayEvent.findMany({
    where: {
      schoolId, eventType: 'holiday', startDate: { lt: new Date(end.getTime() + day) },
      OR: [{ endDate: { gte: new Date(start.getTime() - day) } }, { endDate: null, startDate: { gte: new Date(start.getTime() - day) } }],
    },
    select: { title: true, startDate: true, endDate: true },
  });
  return (ymd) => holidays.find((h) => {
    const from = new Date(h.startDate).toISOString().slice(0, 10);
    const to = h.endDate ? new Date(h.endDate).toISOString().slice(0, 10) : from;
    return from <= ymd && ymd <= to;
  })?.title || null;
}

/* The days of a month, each with its weekday, Sunday and holiday. */
function monthDays(y, m, holidayOn) {
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const date = ymdOf(y, m, i + 1);
    const wd = new Date(Date.UTC(y, m - 1, i + 1)).getUTCDay();
    return { day: i + 1, date, weekday: WEEKDAY[wd], sunday: wd === 0, holiday: holidayOn(date) };
  });
}

router.get('/register', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const classId = parseInt(req.query.classId);
  const sectionId = parseInt(req.query.sectionId) || null;
  const mm = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || ''));
  if (!classId) return res.status(400).json({ success: false, message: 'Choose a class.' });
  if (!mm || Number(mm[2]) < 1 || Number(mm[2]) > 12) return res.status(400).json({ success: false, message: 'month is written YYYY-MM.' });
  if (!(await mayOpenClass(req, classId))) return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  const y = Number(mm[1]);
  const m = Number(mm[2]);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const [cls, students] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true, name: true, sections: { select: { id: true, name: true } } } }),
    prisma.student.findMany({
      where: { schoolId, classId, status: 'active', deletedAt: null, ...(sectionId && { sectionId }), ...(campusId && { campusId }) },
      select: { id: true, name: true, rollNo: true, fatherName: true, gender: true, sectionId: true, admissionDate: true, section: { select: { name: true } } },
    }),
  ]);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
  students.sort((a, b) => String(a.section?.name || '').localeCompare(String(b.section?.name || ''), 'en', { numeric: true })
    || String(a.rollNo || '￿').localeCompare(String(b.rollNo || '￿'), 'en', { numeric: true, sensitivity: 'base' })
    || a.name.localeCompare(b.name));

  const [records, holidayOn] = await Promise.all([
    students.length ? prisma.attendance.findMany({
      where: { schoolId, studentId: { in: students.map((s) => s.id) }, date: { gte: start, lt: end } },
      select: { id: true, studentId: true, date: true, status: true, method: true, markedBy: true },
    }) : [],
    holidayLookup(schoolId, start, end),
  ]);

  const marks = {};
  for (const r of records) {
    const d = new Date(r.date).getDate();
    (marks[r.studentId] ||= {})[d] = { id: r.id, status: r.status, method: r.method, markedBy: r.markedBy };
  }
  const markerIds = [...new Set(records.map((r) => r.markedBy).filter(Boolean))];
  const markers = markerIds.length
    ? Object.fromEntries((await prisma.user.findMany({ where: { id: { in: markerIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]))
    : {};

  const days = monthDays(y, m, holidayOn);

  res.json({
    success: true,
    data: {
      class: { id: cls.id, name: cls.name },
      section: sectionId ? cls.sections.find((s) => s.id === sectionId) || null : null,
      month: mm[0], today: pkToday(), days,
      students: students.map(({ section, ...s }) => ({ ...s, sectionName: section?.name || '' })),
      marks, markers,
      canEdit: REGISTER_EDITORS.includes(req.user?.role),
    },
  });
}));

// GET /attendance/register/student/:studentId?from=YYYY-MM&to=YYYY-MM
// One student's months as calendars (up to 12), read the same way as the
// register, with the school's sessions to choose from. Without from/to: the
// session today falls in, or this calendar year.
router.get('/register/student/:studentId', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const studentId = parseInt(req.params.studentId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, deletedAt: null },
    select: { id: true, name: true, rollNo: true, fatherName: true, classId: true, admissionDate: true, class: { select: { name: true } }, section: { select: { name: true } } },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  if (!(await mayOpenClass(req, student.classId))) return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });

  const sessions = await prisma.academicSession.findMany({ where: { schoolId }, select: { id: true, name: true, startDate: true, endDate: true }, orderBy: { startDate: 'desc' } });
  const ym = (v) => { const x = /^(\d{4})-(\d{2})$/.exec(String(v || '')); return x && Number(x[2]) >= 1 && Number(x[2]) <= 12 ? { y: Number(x[1]), m: Number(x[2]) } : null; };
  let from = ym(req.query.from);
  let to = ym(req.query.to);
  if (!from || !to) {
    const today = pkToday();
    const now = sessions.find((s) => new Date(s.startDate).toISOString().slice(0, 10) <= today && today <= new Date(s.endDate).toISOString().slice(0, 10));
    const y = Number(today.slice(0, 4));
    from = now ? ym(new Date(now.startDate).toISOString().slice(0, 7)) : { y, m: 1 };
    to = now ? ym(new Date(now.endDate).toISOString().slice(0, 7)) : { y, m: 12 };
  }
  const span = (to.y - from.y) * 12 + (to.m - from.m) + 1;
  if (span < 1 || span > 12) return res.status(400).json({ success: false, message: 'Choose up to 12 months, the first before the last.' });

  const start = new Date(from.y, from.m - 1, 1);
  const end = new Date(to.y, to.m, 1);
  const [records, holidayOn] = await Promise.all([
    prisma.attendance.findMany({ where: { schoolId, studentId, date: { gte: start, lt: end } }, select: { date: true, status: true, method: true } }),
    holidayLookup(schoolId, start, end),
  ]);
  const byDay = new Map(records.map((r) => { const d = new Date(r.date); return [ymdOf(d.getFullYear(), d.getMonth() + 1, d.getDate()), r]; }));
  const months = [];
  for (let i = 0; i < span; i++) {
    const y = from.y + Math.floor((from.m - 1 + i) / 12);
    const m = ((from.m - 1 + i) % 12) + 1;
    months.push({
      month: `${y}-${String(m).padStart(2, '0')}`,
      days: monthDays(y, m, holidayOn).map((d) => ({ ...d, status: byDay.get(d.date)?.status || null, method: byDay.get(d.date)?.method || null })),
    });
  }
  const count = (st) => records.filter((r) => r.status === st).length;
  res.json({
    success: true,
    data: {
      student: { id: student.id, name: student.name, rollNo: student.rollNo, fatherName: student.fatherName, className: student.class?.name || '', sectionName: student.section?.name || '', admissionDate: student.admissionDate },
      from: `${from.y}-${String(from.m).padStart(2, '0')}`, to: `${to.y}-${String(to.m).padStart(2, '0')}`, today: pkToday(),
      sessions, months,
      totals: { present: count('present'), absent: count('absent'), leave: count('leave'), late: count('late'), marked: records.length },
    },
  });
}));

router.put('/register/mark', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  if (!REGISTER_EDITORS.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only the class teacher or the admin can change the register.' });
  }
  const studentId = parseInt(req.body?.studentId);
  const date = String(req.body?.date || '');
  const status = String(req.body?.status || '');
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!studentId || !dm) return res.status(400).json({ success: false, message: 'studentId and date (YYYY-MM-DD) are required.' });
  if (![...REGISTER_STATUSES, 'clear'].includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${REGISTER_STATUSES.join(', ')}, clear.` });
  }
  const [y, m, d] = dm.slice(1).map(Number);
  const target = new Date(y, m - 1, d);
  if (target.getFullYear() !== y || target.getMonth() !== m - 1 || target.getDate() !== d) {
    return res.status(400).json({ success: false, message: `${date} is not a date.` });
  }
  if (date > pkToday()) return res.status(400).json({ success: false, message: 'Attendance cannot be marked for a day still to come.' });

  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId, deletedAt: null }, select: { id: true, name: true, classId: true, sectionId: true, campusId: true } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  if (req.user.role === 'teacher' && !(await teacherCanAccessClass(req, student.classId))) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }

  // The day's record whatever time it carries (older punches kept the time).
  const existing = await prisma.attendance.findFirst({
    where: { schoolId, studentId, date: { gte: target, lt: new Date(y, m - 1, d + 1) } },
  });
  let saved = null;
  if (status === 'clear') {
    if (existing) await prisma.attendance.delete({ where: { id: existing.id } });
  } else if (existing) {
    saved = await prisma.attendance.update({
      where: { id: existing.id },
      data: { status, markedBy: req.user.id, ...(existing.status !== status && { method: 'correction' }) },
    });
  } else {
    saved = await prisma.attendance.create({
      data: {
        schoolId, campusId: student.campusId || null, studentId, classId: student.classId, sectionId: student.sectionId,
        date: target, status, method: 'manual', markedBy: req.user.id,
      },
    });
  }
  if ((existing?.status || 'clear') !== status) {
    await prisma.auditLog.create({
      data: {
        schoolId, userId: req.user.id, action: 'ATTENDANCE_REGISTER_EDIT', resource: 'Attendance', resourceId: saved?.id || existing?.id || null,
        details: JSON.stringify({ studentId, date, from: existing?.status || null, to: status === 'clear' ? null : status }), ipAddress: req.ip || null,
      },
    }).catch(() => {});
  }
  res.json({
    success: true,
    data: saved ? { day: d, id: saved.id, status: saved.status, method: saved.method, markedBy: saved.markedBy } : { day: d, status: null },
    message: status === 'clear' ? `${student.name}: ${date} is now not marked.` : `${student.name}: ${status} on ${date}.`,
  });
}));

// ---------------------------------------------------------------------------
// NEW ENDPOINTS
// ---------------------------------------------------------------------------

// GET /api/v1/attendance/excel — monthly attendance sheet download
// Query: classId, sectionId, month(1-12), year
router.get('/excel', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, month, year } = req.query;

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);
  const daysInMonth = new Date(y, m, 0).getDate();

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(campusId && { campusId }),
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
    orderBy: { rollNo: 'asc' },
  });

  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: startDate, lt: endDate },
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
  });

  // Map: studentId -> day -> status
  const attendanceMap = {};
  records.forEach(r => {
    const day = new Date(r.date).getDate();
    if (!attendanceMap[r.studentId]) attendanceMap[r.studentId] = {};
    attendanceMap[r.studentId][day] = r.status;
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  const ws = wb.addWorksheet('Attendance');

  // Build column definitions
  const columns = [
    { header: 'Roll No', key: 'rollNo', width: 10 },
    { header: 'Name', key: 'name', width: 28 },
  ];
  for (let d = 1; d <= 31; d++) {
    columns.push({ header: String(d), key: `day${d}`, width: d <= daysInMonth ? 5 : 4 });
  }
  columns.push(
    { header: 'Total P', key: 'totalP', width: 9 },
    { header: 'Total A', key: 'totalA', width: 9 },
    { header: 'Total L', key: 'totalL', width: 9 },
    { header: 'Total Lt', key: 'totalLt', width: 9 },
    { header: '%', key: 'pct', width: 7 },
  );
  ws.columns = columns;

  // Header row styling
  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4057' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  headerRow.height = 20;

  // Data rows
  students.forEach(s => {
    const dayMap = attendanceMap[s.id] || {};
    const row = { rollNo: s.rollNo, name: s.name };
    let totalP = 0, totalA = 0, totalL = 0, totalLt = 0;

    for (let d = 1; d <= 31; d++) {
      if (d <= daysInMonth) {
        const st = dayMap[d];
        row[`day${d}`] = st ? st.charAt(0).toUpperCase() : '';
        if (st === 'present') totalP++;
        else if (st === 'absent') totalA++;
        else if (st === 'leave') totalL++;
        else if (st === 'late') totalLt++;
      } else {
        row[`day${d}`] = '';
      }
    }

    const worked = totalP + totalA + totalL + totalLt;
    row.totalP = totalP;
    row.totalA = totalA;
    row.totalL = totalL;
    row.totalLt = totalLt;
    row.pct = worked > 0 ? Math.round((totalP / worked) * 100) : 0;

    const addedRow = ws.addRow(row);
    addedRow.eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    // Left-align name
    addedRow.getCell('name').alignment = { horizontal: 'left', vertical: 'middle' };
  });

  const monthName = startDate.toLocaleString('default', { month: 'long' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_${monthName}_${y}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
}));

// GET /api/v1/attendance/date-range — attendance grouped by student for a date range
// Query: classId, sectionId, from(ISO date), to(ISO date)
router.get('/date-range', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, from, to } = req.query;

  if (!from || !to) return res.status(400).json({ success: false, message: 'from and to dates are required.' });

  const fromDate = new Date(from); fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to); toDate.setHours(23, 59, 59, 999);

  if (isNaN(fromDate) || isNaN(toDate)) return res.status(400).json({ success: false, message: 'Invalid date format.' });
  if (fromDate > toDate) return res.status(400).json({ success: false, message: 'from must be before or equal to to.' });

  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: fromDate, lte: toDate },
      ...(campusId && { campusId }),
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
    include: { student: { select: { id: true, name: true, rollNo: true } } },
    orderBy: [{ student: { rollNo: 'asc' } }, { date: 'asc' }],
  });

  // Group by student
  const grouped = {};
  records.forEach(r => {
    const sid = r.studentId;
    if (!grouped[sid]) {
      grouped[sid] = { student: r.student, records: [], present: 0, absent: 0, leave: 0, late: 0 };
    }
    grouped[sid].records.push({ date: r.date, status: r.status, method: r.method });
    if (r.status === 'present') grouped[sid].present++;
    else if (r.status === 'absent') grouped[sid].absent++;
    else if (r.status === 'leave') grouped[sid].leave++;
    else if (r.status === 'late') grouped[sid].late++;
  });

  const data = Object.values(grouped).map(g => {
    const total = g.present + g.absent + g.leave + g.late;
    return { ...g, total, percentage: total > 0 ? Math.round((g.present / total) * 100) : 0 };
  });

  res.json({ success: true, data, from: fromDate.toISOString(), to: toDate.toISOString(), count: data.length });
}));

// GET /api/v1/attendance/deficit — students below attendance threshold
// Query: classId, minPct(default 75), month, year
// FIX: replaced per-student COUNT queries with a single findMany, then
// aggregated per-student in JavaScript.
router.get('/deficit', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, month, year } = req.query;
  const minPct = parseFloat(req.query.minPct) || 75;

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(campusId && { campusId }),
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
  });

  // ONE query for all attendance records in the range
  const allRecords = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: startDate, lt: endDate },
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
    select: { studentId: true, status: true },
  });

  // Aggregate counts per student in JavaScript
  const counts = {};
  for (const r of allRecords) {
    if (!counts[r.studentId]) counts[r.studentId] = { present: 0, absent: 0, leave: 0, late: 0 };
    const c = counts[r.studentId];
    if (r.status === 'present') c.present++;
    else if (r.status === 'absent') c.absent++;
    else if (r.status === 'leave') c.leave++;
    else if (r.status === 'late') c.late++;
  }

  const deficitStudents = [];

  for (const s of students) {
    const c = counts[s.id] || { present: 0, absent: 0, leave: 0, late: 0 };
    const total = c.present + c.absent + c.leave + c.late;
    const pct = total > 0 ? (c.present / total) * 100 : 0;

    if (pct < minPct) {
      const daysNeeded = total > 0 ? Math.ceil((minPct / 100) * total) - c.present : 0;
      deficitStudents.push({
        studentId: s.id, name: s.name, rollNo: s.rollNo,
        present: c.present, absent: c.absent, leave: c.leave, late: c.late, total,
        percentage: Math.round(pct * 10) / 10,
        daysNeeded: Math.max(0, daysNeeded),
      });
    }
  }

  deficitStudents.sort((a, b) => a.percentage - b.percentage);

  res.json({ success: true, data: deficitStudents, minPct, month: m, year: y, count: deficitStudents.length });
}));

// GET /api/v1/attendance/student/:studentId/history — full year attendance for one student
// Query: sessionId(optional)
// Access: student (own data only), parent (children only), admin/teacher (all)
router.get('/student/:studentId/history', requireRole('student', 'parent', 'teacher', 'admin', 'super_admin', 'principal', 'accountant'), wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId } = req.params;
  const { sessionId } = req.query;
  const requestedId = parseInt(studentId);

  const student = await prisma.student.findFirst({
    where: { id: requestedId, schoolId, deletedAt: null },
    select: { id: true, name: true, rollNo: true, classId: true, sectionId: true, emergencyPhone: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  /* -- Ownership check --
     FIX: this previously read req.user.studentId / req.user.rollNo /
     req.user.phone / req.user.contactPhone — NONE of which exist on the JWT
     payload ({id, schoolId, campusId, role, email}), so isOwn/isChild were
     always false and every real student/parent got a 403 trying to view
     their own (or their child's) attendance history. Also
     prisma.parentStudentLink doesn't exist — the actual model is
     ParentStudent. Resolved via the same Student.userId / Parent.userId +
     ParentStudent join used elsewhere in the app. */
  const role = req.user?.role;

  if (role === 'student') {
    const self = await prisma.student.findFirst({ where: { schoolId, userId: req.user.id, deletedAt: null }, select: { id: true } });
    if (!self || self.id !== requestedId) {
      return res.status(403).json({ success: false, message: 'Access denied. Students can only view their own attendance.' });
    }
  }

  if (role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id }, select: { id: true } });
    const link = parent ? await prisma.parentStudent.findFirst({ where: { schoolId, parentId: parent.id, studentId: requestedId } }) : null;
    if (!link) {
      return res.status(403).json({ success: false, message: 'Access denied. Parents can only view their children\'s attendance.' });
    }
  }

  // Determine date range: the session asked for, else the school's current
  // session, else the academic year July–June.
  let startDate, endDate, sessionName = null;
  const current = !sessionId
    ? await prisma.academicSession.findFirst({ where: { schoolId: req.schoolId, isActive: true }, orderBy: { startDate: 'desc' } })
    : null;
  if (current) {
    // A school that has not started the new session yet still sees this
    // year's days: the current session runs on until it is replaced.
    startDate = current.startDate;
    endDate = new Date(Math.max(new Date(current.endDate).getTime(), Date.now()));
    sessionName = current.name;
  } else if (sessionId) {
    // findFirst + schoolId, not findUnique by id: the id arrives from the
    // client, so an unscoped lookup would resolve another school's session.
    const session = await prisma.academicSession.findFirst({
      where: { id: parseInt(sessionId), schoolId: req.schoolId },
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    startDate = session.startDate;
    endDate = session.endDate;
    sessionName = session.name;
  } else {
    const now = new Date();
    const yearStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    startDate = new Date(yearStart, 6, 1);       // July 1
    endDate = new Date(yearStart + 1, 5, 30, 23, 59, 59); // June 30
  }

  const rawRecords = await prisma.attendance.findMany({
    where: { schoolId, studentId: requestedId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' },
  });

  // Normalize records: always expose date (ISO string), status (full word), method
  const records = rawRecords.map(r => ({
    id:     r.id,
    date:   r.date instanceof Date ? r.date.toISOString() : r.date,
    status: r.status,   // 'present' | 'absent' | 'leave' | 'late'
    method: r.method || 'manual',
    remarks: r.remarks || null,
  }));

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const leave   = records.filter(r => r.status === 'leave').length;
  const late    = records.filter(r => r.status === 'late').length;
  const total   = records.length;
  // A student who came late was at school: late counts as attended.
  const attended = present + late;
  const sessions = await prisma.academicSession.findMany({
    where: { schoolId: req.schoolId },
    select: { id: true, name: true, isActive: true },
    orderBy: { startDate: 'desc' },
  });

  res.json({
    success: true,
    student,
    summary: { present, absent, leave, late, total, attended, percentage: total > 0 ? Math.round((attended / total) * 100) : 0 },
    range: { from: startDate, to: endDate, sessionName },
    sessions,
    records,
  });
}));

// PUT /api/v1/attendance/:id — update a single attendance record (status change)
router.put('/:id', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { id } = req.params;
  const { status, remarks } = req.body;

  const validStatuses = ['present', 'absent', 'leave', 'late'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const existing = await prisma.attendance.findFirst({ where: { id: parseInt(id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Attendance record not found.' });

  const updated = await prisma.attendance.update({
    where: { id: parseInt(id) },
    data: { status, markedBy: req.user.id },
  });

  // FIX: AuditLog has resource/resourceId/ipAddress columns, not
  // entity/entityId/oldValue/newValue/ip — this call previously threw an
  // unknown-field error on every single edit, silently swallowed by the
  // catch, so attendance corrections were never actually audit-logged.
  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user.id,
      action: 'UPDATE_ATTENDANCE',
      resource: 'Attendance',
      resourceId: updated.id,
      ipAddress: req.ip || null,
    },
  }).catch(() => {});

  res.json({ success: true, data: updated, message: 'Attendance record updated.' });
}));

// ---------------------------------------------------------------------------
// CORRECTION REQUESTS
// ---------------------------------------------------------------------------

// POST /api/v1/attendance/correction-request
router.post('/correction-request', wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId, date, currentStatus, requestedStatus, reason } = req.body;

  if (!studentId || !date || !requestedStatus) {
    return res.status(400).json({ success: false, message: 'studentId, date, and requestedStatus are required.' });
  }
  if (!STATUSES.includes(requestedStatus)) return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}.` });
  const ofSchool = await prisma.student.findFirst({ where: { id: parseInt(studentId), schoolId, deletedAt: null }, select: { classId: true } });
  if (!ofSchool) return res.status(404).json({ success: false, message: 'Student not found.' });
  if (ofSchool.classId && !(await teacherCanAccessClass(req, ofSchool.classId))) return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });

  const correction = await prisma.attendanceCorrection.create({
    data: {
      schoolId,
      studentId: parseInt(studentId),
      date: new Date(date),
      currentStatus: currentStatus || null,
      requestedStatus,
      reason: reason || null,
      requestedBy: req.user.id,
      status: 'pending',
    },
  });

  res.status(201).json({ success: true, data: correction, message: 'Correction request submitted.' });
}));

// GET /api/v1/attendance/corrections — list correction requests
// Admin sees all for school; teacher sees own requests; filter by status
router.get('/corrections', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { status } = req.query;
  const isAdmin = ['admin', 'super_admin', 'principal'].includes(req.user?.role);

  const where = {
    schoolId,
    ...(status && { status }),
    ...(!isAdmin && { requestedBy: req.user.id }),
  };

  const corrections = await prisma.attendanceCorrection.findMany({
    where,
    include: {
      student: { select: { name: true, rollNo: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: corrections, count: corrections.length });
}));

// PUT /api/v1/attendance/corrections/:id/approve — approve a correction request
router.put('/corrections/:id/approve', requireRole('admin', 'super_admin', 'principal'), wrap(async (req, res) => {
  const { schoolId } = req;
  const { id } = req.params;

  const correction = await prisma.attendanceCorrection.findFirst({ where: { id: parseInt(id), schoolId } });
  if (!correction) return res.status(404).json({ success: false, message: 'Correction request not found.' });
  if (correction.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending corrections can be approved.' });

  const now = new Date();

  const updated = await prisma.attendanceCorrection.update({
    where: { id: parseInt(id) },
    data: { status: 'approved', reviewedBy: req.user.id, reviewedAt: now },
  });

  // Update actual Attendance record to requestedStatus
  const targetDate = new Date(correction.date); targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);

  const existing = await prisma.attendance.findFirst({
    where: { schoolId, studentId: correction.studentId, date: { gte: targetDate, lt: nextDay } },
  });

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { status: correction.requestedStatus, markedBy: req.user.id },
    });
  } else {
    // Create attendance record if not yet present, in the student's class:
    // without it the day vanished from every class report.
    const st = await prisma.student.findFirst({ where: { id: correction.studentId, schoolId }, select: { classId: true, sectionId: true, campusId: true } });
    await prisma.attendance.create({
      data: {
        schoolId,
        classId: st?.classId ?? null, sectionId: st?.sectionId ?? null, campusId: st?.campusId ?? null,
        studentId: correction.studentId,
        date: targetDate,
        status: correction.requestedStatus,
        markedBy: req.user.id,
        method: 'correction',
      },
    });
  }

  res.json({ success: true, data: updated, message: 'Correction approved and attendance updated.' });
}));

// PUT /api/v1/attendance/corrections/:id/reject — reject a correction request
router.put('/corrections/:id/reject', requireRole('admin', 'super_admin', 'principal'), wrap(async (req, res) => {
  const { schoolId } = req;
  const { id } = req.params;
  const { remarks } = req.body;

  const correction = await prisma.attendanceCorrection.findFirst({ where: { id: parseInt(id), schoolId } });
  if (!correction) return res.status(404).json({ success: false, message: 'Correction request not found.' });
  if (correction.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending corrections can be rejected.' });

  // NOTE: AttendanceCorrection has no `remarks` column (only `reason`, which holds
  // the original requester's reason) — passing the admin's rejection note through
  // as `remarks` made this throw a Prisma unknown-argument error on every reject,
  // since the frontend (AttendanceCorrectionPage) always sends { remarks: adminNote }.
  const updated = await prisma.attendanceCorrection.update({
    where: { id: parseInt(id) },
    data: {
      status: 'rejected',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });

  res.json({ success: true, data: updated, message: 'Correction request rejected.' });
}));

// ---------------------------------------------------------------------------
// STAFF ATTENDANCE
// ---------------------------------------------------------------------------

// GET /api/v1/attendance/staff/report — staff attendance summary for a month
// Query: month, year, department(optional)
router.get('/staff/report', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { month, year, departmentId } = req.query;

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const staffList = await prisma.staff.findMany({
    where: {
      schoolId,
      isActive: true,
      deletedAt: null,
      ...(campusId && { campusId }),
      ...(departmentId && { departmentId: parseInt(departmentId) }),
    },
    include: { department: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const report = await Promise.all(staffList.map(async (staff) => {
    const records = await prisma.staffAttendance.findMany({
      where: { schoolId, staffId: staff.id, date: { gte: startDate, lt: endDate } },
      select: { status: true, checkIn: true },
    });

    let present = 0, absent = 0, late = 0, leave = 0;
    const checkInTimes = [];

    records.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'leave') leave++;
      if (r.checkIn) checkInTimes.push(new Date(r.checkIn).getTime());
    });

    const total = present + absent + late + leave;
    const avgCheckInMs = checkInTimes.length > 0 ? checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length : null;
    const avgCheckIn = avgCheckInMs ? new Date(avgCheckInMs).toTimeString().slice(0, 5) : null;

    return {
      staffId: staff.id,
      name: staff.name,
      empCode: staff.empCode || null,
      designation: staff.designation || null,
      department: staff.department?.name || null,
      present, absent, late, leave, total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      avgCheckIn,
    };
  }));

  res.json({ success: true, data: report, month: m, year: y, count: report.length });
}));

// GET /api/v1/attendance/staff/excel — staff attendance XLSX download
// Query: month, year, departmentId(optional)
router.get('/staff/excel', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { month, year, departmentId } = req.query;

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const staffList = await prisma.staff.findMany({
    where: {
      schoolId, isActive: true, deletedAt: null,
      ...(campusId && { campusId }),
      ...(departmentId && { departmentId: parseInt(departmentId) }),
    },
    include: { department: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const rows = await Promise.all(staffList.map(async (staff) => {
    const records = await prisma.staffAttendance.findMany({
      where: { schoolId, staffId: staff.id, date: { gte: startDate, lt: endDate } },
      select: { status: true, checkIn: true },
    });

    let present = 0, absent = 0, late = 0, leave = 0;
    const checkInTimes = [];

    records.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'leave') leave++;
      if (r.checkIn) checkInTimes.push(new Date(r.checkIn).getTime());
    });

    const total = present + absent + late + leave;
    const avgCheckInMs = checkInTimes.length > 0 ? checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length : null;
    const avgCheckIn = avgCheckInMs ? new Date(avgCheckInMs).toTimeString().slice(0, 5) : '-';

    return {
      name: staff.name, empCode: staff.empCode || '-',
      designation: staff.designation || '-', department: staff.department?.name || '-',
      present, absent, late, leave, total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      avgCheckIn,
    };
  }));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  const ws = wb.addWorksheet('Staff Attendance');
  ws.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Emp Code', key: 'empCode', width: 14 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Present', key: 'present', width: 10 },
    { header: 'Absent', key: 'absent', width: 10 },
    { header: 'Late', key: 'late', width: 10 },
    { header: 'Leave', key: 'leave', width: 10 },
    { header: 'Total Days', key: 'total', width: 12 },
    { header: 'Percentage', key: 'percentage', width: 12 },
    { header: 'Avg Check-In', key: 'avgCheckIn', width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3C5E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  headerRow.height = 20;

  rows.forEach(row => {
    const addedRow = ws.addRow(row);
    addedRow.eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    addedRow.getCell('name').alignment = { horizontal: 'left', vertical: 'middle' };
  });

  const monthName = startDate.toLocaleString('default', { month: 'long' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=staff_attendance_${monthName}_${y}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
}));

// ---------------------------------------------------------------------------
// ALERTS
// ---------------------------------------------------------------------------

// GET /api/v1/attendance/alerts/multi-day-absent — students with N+ consecutive absences
// Query: days(default 3)
// FIX: replaced per-student prisma.attendance.findMany calls with a single batch
// query for all students, then grouped and processed in JavaScript.
router.get('/alerts/multi-day-absent', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const days = parseInt(req.query.days) || 3;

  if (days < 1) return res.status(400).json({ success: false, message: 'days must be >= 1.' });

  const today = new Date(); today.setHours(23, 59, 59, 999);
  const lookbackStart = new Date(today);
  lookbackStart.setDate(lookbackStart.getDate() - (days * 4)); // generous lookback
  lookbackStart.setHours(0, 0, 0, 0);

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(campusId && { campusId }),
    },
    select: {
      id: true, name: true, rollNo: true, emergencyPhone: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
  });

  // ONE batch query for all students in the lookback window
  const allRecords = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: lookbackStart, lte: today },
      ...(campusId && { campusId }),
    },
    orderBy: { date: 'desc' },
    select: { studentId: true, date: true, status: true },
  });

  // Group records by studentId
  const recordsByStudent = {};
  for (const r of allRecords) {
    if (!recordsByStudent[r.studentId]) recordsByStudent[r.studentId] = [];
    recordsByStudent[r.studentId].push(r);
  }

  const alerts = [];

  for (const s of students) {
    const records = recordsByStudent[s.id] || [];

    // Count consecutive absences from today backward (records already ordered desc)
    let consecutive = 0;
    let toDate = null;
    let fromDate = null;

    for (const r of records) {
      if (r.status === 'absent') {
        consecutive++;
        if (!toDate) toDate = r.date;
        fromDate = r.date;
      } else {
        break; // streak broken
      }
    }

    if (consecutive >= days) {
      alerts.push({
        studentId: s.id,
        name: s.name,
        rollNo: s.rollNo,
        class: s.class?.name || null,
        section: s.section?.name || null,
        phone: s.emergencyPhone || null,
        consecutiveDays: consecutive,
        fromDate,
        toDate,
      });
    }
  }

  alerts.sort((a, b) => b.consecutiveDays - a.consecutiveDays);

  res.json({ success: true, data: alerts, days, count: alerts.length });
}));

module.exports = router;
// Pure helpers, exported for tests/attendance/register.test.mjs.
module.exports.helpers = { monthDays, ymdOf };
