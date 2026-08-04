const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { sendAbsentNotification } = require('../services/whatsapp.service');
const { sendSMS } = require('../services/sms.service');
const { teacherCanAccessClass } = require('../utils/teacherScope');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// The route mount in app.js was broadened to let student/parent reach this
// router at all (so they can read their OWN summary) — endpoints that mark
// attendance or expose staff/whole-class data must explicitly re-check the
// role themselves rather than relying on the mount-level gate.
const staffOnly = (req, res, next) => {
  if (!['super_admin', 'admin', 'teacher', 'gatekeeper'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

// GET /api/v1/attendance?classId=&date=
router.get('/', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0,0,0,0);
  const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);

  // Students/parents must never see a whole class's daily list — only their
  // own (or their linked children's) row.
  let restrictToStudentIds = null;
  if (req.user?.role === 'student') {
    const self = await prisma.student.findFirst({ where: { schoolId, userId: req.user.id, deletedAt: null }, select: { id: true } });
    restrictToStudentIds = self ? [self.id] : [];
  } else if (req.user?.role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
    const links = parent ? await prisma.parentStudent.findMany({ where: { schoolId, parentId: parent.id }, select: { studentId: true } }) : [];
    restrictToStudentIds = links.map((l) => l.studentId);
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(campusId && { campusId }),
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
      ...(restrictToStudentIds && { id: { in: restrictToStudentIds } }),
    },
    orderBy: { rollNo: 'asc' }
  });

  const records = await prisma.attendance.findMany({
    where: { schoolId, date: { gte: targetDate, lt: nextDay }, ...(classId && { classId: parseInt(classId) }) }
  });
  const recordMap = {};
  records.forEach(r => { recordMap[r.studentId] = r; });

  const result = students.map(s => ({ ...s, attendance: recordMap[s.id] || null }));
  res.json({ success: true, data: result, date: targetDate.toISOString() });
}));

// POST /api/v1/attendance/save - Save attendance + trigger absent SMS
router.post('/save', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date, records, notifyAbsent = true } = req.body;
  if (!classId || !records) return res.status(400).json({ success: false, message: 'classId and records required.' });
  if (!(await teacherCanAccessClass(req, classId))) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }

  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0,0,0,0);
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  let saved = 0, notified = 0;

  for (const record of records) {
    // Look up the prior state BEFORE upserting so we know whether this
    // student was already marked absent+notified today — otherwise every
    // re-save of the same day's attendance (e.g. fixing an unrelated typo)
    // re-fires the absent SMS/WhatsApp for every already-absent student.
    const existing = await prisma.attendance.findUnique({
      where: { studentId_date: { studentId: record.studentId, date: targetDate } },
    });
    const alreadyNotifiedForThisStatus = existing?.status === 'absent' && existing?.notified && record.status === 'absent';

    const shouldNotify = record.status === 'absent' && notifyAbsent && !alreadyNotifiedForThisStatus;

    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: record.studentId, date: targetDate } },
      update: { status: record.status, markedBy: req.user.id, method: record.method || 'manual', ...(shouldNotify ? {} : record.status !== 'absent' ? { notified: false } : {}) },
      create: { schoolId, campusId: campusId || null, studentId: record.studentId, classId: parseInt(classId), sectionId: sectionId ? parseInt(sectionId) : null, date: targetDate, status: record.status, markedBy: req.user.id, method: record.method || 'manual' }
    });
    saved++;

    // Send absent notification — only once per student per day per absence.
    if (shouldNotify) {
      const student = await prisma.student.findUnique({ where: { id: record.studentId } });
      if (student?.emergencyPhone) {
        sendAbsentNotification({ parentPhone: student.emergencyPhone, studentName: student.name, className: String(classId), date: targetDate.toLocaleDateString(), schoolName: school?.name || 'School' }).catch(console.error);
        notified++;
      }
      await prisma.attendance.update({ where: { studentId_date: { studentId: record.studentId, date: targetDate } }, data: { notified: true } });
    }
  }

  res.json({ success: true, message: `${saved} records saved. ${notified} absent notifications sent.` });
}));

// POST /api/v1/attendance/barcode-scan
router.post('/barcode-scan', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { barcode, date } = req.body;
  if (!barcode) return res.status(400).json({ success: false, message: 'barcode required.' });

  const student = await prisma.student.findFirst({
    where: { schoolId, rollNo: barcode, status: 'active', deletedAt: null },
    include: { class: true }
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found with this barcode.' });

  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0,0,0,0);

  await prisma.attendance.upsert({
    where: { studentId_date: { studentId: student.id, date: targetDate } },
    update: { status: 'present', method: 'barcode', markedBy: req.user.id },
    create: { schoolId, campusId: campusId || null, studentId: student.id, classId: student.classId || null, date: targetDate, status: 'present', method: 'barcode', markedBy: req.user.id }
  });

  res.json({ success: true, data: { student, status: 'present' }, message: `${student.name} marked present.` });
}));

// GET /api/v1/attendance/report
router.get('/report', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, month, year } = req.query;

  const startDate = new Date(parseInt(year) || new Date().getFullYear(), (parseInt(month) || new Date().getMonth() + 1) - 1, 1);
  const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);

  const records = await prisma.attendance.findMany({
    where: { schoolId, date: { gte: startDate, lt: endDate }, ...(campusId && { campusId }), ...(classId && { classId: parseInt(classId) }), ...(sectionId && { sectionId: parseInt(sectionId) }) },
    include: { student: { select: { name: true, rollNo: true } } },
    orderBy: [{ student: { name: 'asc' } }, { date: 'asc' }]
  });

  res.json({ success: true, data: records, month: startDate.getMonth() + 1, year: startDate.getFullYear() });
}));

// GET /api/v1/attendance/summary
router.get('/summary', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, month, year } = req.query;
  const startDate = new Date(parseInt(year) || new Date().getFullYear(), (parseInt(month) || new Date().getMonth() + 1) - 1, 1);
  const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);

  // Students/parents may only ever see their own (or their linked
  // children's) summary — never the whole class's — even though they can
  // now reach this endpoint at all (previously blocked outright).
  let restrictToStudentIds = null;
  if (req.user?.role === 'student') {
    const self = await prisma.student.findFirst({ where: { schoolId, userId: req.user.id, deletedAt: null }, select: { id: true } });
    restrictToStudentIds = self ? [self.id] : [];
  } else if (req.user?.role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
    const links = parent ? await prisma.parentStudent.findMany({ where: { schoolId, parentId: parent.id }, select: { studentId: true } }) : [];
    restrictToStudentIds = links.map((l) => l.studentId);
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(classId && { classId: parseInt(classId) }),
      ...(restrictToStudentIds && { id: { in: restrictToStudentIds } }),
    },
  });

  const summaries = await Promise.all(students.map(async (s) => {
    const [present, absent, leave, late] = await Promise.all([
      prisma.attendance.count({ where: { schoolId, studentId: s.id, date: { gte: startDate, lt: endDate }, status: 'present' } }),
      prisma.attendance.count({ where: { schoolId, studentId: s.id, date: { gte: startDate, lt: endDate }, status: 'absent' } }),
      prisma.attendance.count({ where: { schoolId, studentId: s.id, date: { gte: startDate, lt: endDate }, status: 'leave' } }),
      prisma.attendance.count({ where: { schoolId, studentId: s.id, date: { gte: startDate, lt: endDate }, status: 'late' } }),
    ]);
    // "late" still counts as attended for the total/percentage — previously
    // it was dropped entirely, understating both total days taken and %.
    const total = present + absent + leave + late;
    const presentDays = present + late;
    return { studentId: s.id, name: s.name, rollNo: s.rollNo, present, absent, leave, late, presentDays, total, percentage: total > 0 ? Math.round((presentDays/total)*100) : 0 };
  }));

  res.json({ success: true, data: summaries });
}));

// ═══ Staff Attendance — the StaffAttendance model already existed in the
// schema but had no backend routes at all, so the Staff Attendance page's
// "Save" button had nothing to call and did nothing. ═══

// GET /api/v1/attendance/staff?date=
router.get('/staff', staffOnly, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0,0,0,0);
  const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);

  const staff = await prisma.staff.findMany({
    where: { schoolId, isActive: true, deletedAt: null, ...(campusId && { campusId }) },
    orderBy: { name: 'asc' },
  });
  const records = await prisma.staffAttendance.findMany({
    where: { schoolId, date: { gte: targetDate, lt: nextDay } },
  });
  const recordMap = {};
  records.forEach((r) => { recordMap[r.staffId] = r; });

  const result = staff.map((s) => ({ ...s, attendance: recordMap[s.id] || null }));
  res.json({ success: true, data: result, date: targetDate.toISOString() });
}));

// POST /api/v1/attendance/staff/save
router.post('/staff/save', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { date, records } = req.body;
  if (!records || !Array.isArray(records)) return res.status(400).json({ success: false, message: 'records array required.' });

  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0,0,0,0);
  let saved = 0;
  for (const record of records) {
    if (!record.staffId || !record.status) continue;
    await prisma.staffAttendance.upsert({
      where: { staffId_date: { staffId: parseInt(record.staffId), date: targetDate } },
      update: { status: record.status, markedBy: req.user.id, method: record.method || 'manual' },
      create: { schoolId, staffId: parseInt(record.staffId), date: targetDate, status: record.status, markedBy: req.user.id, method: record.method || 'manual' },
    });
    saved++;
  }
  res.json({ success: true, message: `${saved} staff attendance records saved.` });
}));

// GET /api/v1/attendance/staff/report?month=&year=
router.get('/staff/report', staffOnly, wrap(async (req, res) => {
  const { schoolId } = req;
  const { month, year } = req.query;
  const startDate = new Date(parseInt(year) || new Date().getFullYear(), (parseInt(month) || new Date().getMonth() + 1) - 1, 1);
  const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);

  const staff = await prisma.staff.findMany({ where: { schoolId, isActive: true, deletedAt: null } });
  const summaries = await Promise.all(staff.map(async (s) => {
    const [present, absent, leave, late] = await Promise.all([
      prisma.staffAttendance.count({ where: { schoolId, staffId: s.id, date: { gte: startDate, lt: endDate }, status: 'present' } }),
      prisma.staffAttendance.count({ where: { schoolId, staffId: s.id, date: { gte: startDate, lt: endDate }, status: 'absent' } }),
      prisma.staffAttendance.count({ where: { schoolId, staffId: s.id, date: { gte: startDate, lt: endDate }, status: 'leave' } }),
      prisma.staffAttendance.count({ where: { schoolId, staffId: s.id, date: { gte: startDate, lt: endDate }, status: 'late' } }),
    ]);
    const total = present + absent + leave + late;
    return { staffId: s.id, name: s.name, designation: s.designation, present, absent, leave, late, total, percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0 };
  }));
  res.json({ success: true, data: summaries });
}));

module.exports = router;
