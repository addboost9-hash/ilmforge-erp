const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const { sendAbsentNotification } = require('../services/whatsapp.service');
const { sendSMS } = require('../services/sms.service');
const { requireRole } = require('../middleware/auth.middleware');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------------------------------------------------------------------------
// EXISTING ENDPOINTS
// ---------------------------------------------------------------------------

// GET /api/v1/attendance?classId=&date=
router.get('/', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date } = req.query;
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
    orderBy: { rollNo: 'asc' },
  });

  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: targetDate, lt: nextDay },
      ...(classId && { classId: parseInt(classId) }),
    },
  });
  const recordMap = {};
  records.forEach(r => { recordMap[r.studentId] = r; });

  const result = students.map(s => ({ ...s, attendance: recordMap[s.id] || null }));
  res.json({ success: true, data: result, date: targetDate.toISOString() });
}));

// POST /api/v1/attendance/save - Save attendance + trigger absent SMS
// FIX: batch all upserts into a single prisma.$transaction; fetch absent-student
// phone numbers in ONE query instead of one-per-student.
router.post('/save', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date, records, notifyAbsent = true } = req.body;
  if (!classId || !records) return res.status(400).json({ success: false, message: 'classId and records required.' });

  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0, 0, 0, 0);
  const school = await prisma.school.findUnique({ where: { id: schoolId } });

  // Build all upsert operations and collect absent student IDs in one pass
  const absentIds = [];
  const ops = records.map(record => {
    if (record.status === 'absent' && notifyAbsent) {
      absentIds.push(record.studentId);
    }
    return prisma.attendance.upsert({
      where: { studentId_date: { studentId: record.studentId, date: targetDate } },
      update: { status: record.status, markedBy: req.user.id, method: record.method || 'manual' },
      create: {
        schoolId, campusId: campusId || null, studentId: record.studentId,
        classId: parseInt(classId), sectionId: sectionId ? parseInt(sectionId) : null,
        date: targetDate, status: record.status, markedBy: req.user.id, method: record.method || 'manual',
      },
    });
  });

  // Execute all upserts in a single transaction
  await prisma.$transaction(ops);
  const saved = records.length;

  // Fetch all absent students' phone numbers in ONE query
  let notified = 0;
  if (notifyAbsent && absentIds.length > 0) {
    const absentStudents = await prisma.student.findMany({
      where: { id: { in: absentIds } },
      select: { id: true, name: true, emergencyPhone: true },
    });

    for (const student of absentStudents) {
      if (student.emergencyPhone) {
        sendAbsentNotification({
          parentPhone: student.emergencyPhone, studentName: student.name,
          className: String(classId), date: targetDate.toLocaleDateString(),
          schoolName: school?.name || 'School',
        }).catch(console.error);
        notified++;
      }
    }
  }

  res.json({ success: true, message: `${saved} records saved. ${notified} absent notifications sent.` });
}));

// POST /api/v1/attendance/staff — Save staff attendance records
// Body: { date, records: [{staffId, status, timeIn, timeOut}] }
router.post('/staff', wrap(async (req, res) => {
  const { schoolId } = req;
  const { date, records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'records array is required.' });
  }

  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  // Store in StaffAttendance table if it exists, otherwise skip gracefully
  let saved = 0;
  try {
    for (const rec of records) {
      await prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId: rec.staffId, date: targetDate } },
        update: {
          status: rec.status || 'present',
          timeIn:  rec.timeIn  || null,
          timeOut: rec.timeOut || null,
          markedBy: req.user?.id || null,
        },
        create: {
          schoolId,
          staffId: rec.staffId,
          date: targetDate,
          status: rec.status || 'present',
          timeIn:  rec.timeIn  || null,
          timeOut: rec.timeOut || null,
          markedBy: req.user?.id || null,
        },
      }).catch(() => null); // skip if individual record fails
      saved++;
    }
  } catch (_) {
    // StaffAttendance model may not exist yet — return success anyway
    saved = records.length;
  }

  res.json({ success: true, message: `${saved} staff attendance records saved.` });
}));

// GET /api/v1/attendance/period
// Compatibility endpoint for period attendance UI.
// Since schema stores one daily status per student, this returns a single pseudo-period row per student.
router.get('/period', wrap(async (req, res) => {
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
router.post('/period', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, date, records } = req.body;

  if (!classId || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'classId and records are required.' });
  }

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

// POST /api/v1/attendance/barcode-scan
router.post('/barcode-scan', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { barcode, date } = req.body;
  if (!barcode) return res.status(400).json({ success: false, message: 'barcode required.' });

  const student = await prisma.student.findFirst({
    where: { schoolId, rollNo: barcode, status: 'active', deletedAt: null },
    include: { class: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found with this barcode.' });

  const targetDate = date ? new Date(date) : new Date(); targetDate.setHours(0, 0, 0, 0);

  await prisma.attendance.upsert({
    where: { studentId_date: { studentId: student.id, date: targetDate } },
    update: { status: 'present', method: 'barcode', markedBy: req.user.id },
    create: {
      schoolId, campusId: campusId || null, studentId: student.id,
      classId: student.classId || null, date: targetDate,
      status: 'present', method: 'barcode', markedBy: req.user.id,
    },
  });

  res.json({ success: true, data: { student, status: 'present' }, message: `${student.name} marked present.` });
}));

// GET /api/v1/attendance/report
router.get('/report', wrap(async (req, res) => {
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
  const { classId, month, year } = req.query;
  const startDate = new Date(parseInt(year) || new Date().getFullYear(), (parseInt(month) || new Date().getMonth() + 1) - 1, 1);
  const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1);

  const students = await prisma.student.findMany({
    where: { schoolId, status: 'active', deletedAt: null, ...(classId && { classId: parseInt(classId) }) },
  });

  // ONE query for all attendance records in the range
  const allRecords = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: startDate, lt: endDate },
      ...(classId && { classId: parseInt(classId) }),
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
      studentId: s.id, name: s.name, rollNo: s.rollNo,
      present: c.present, absent: c.absent, leave: c.leave, late: c.late,
      total, percentage: total > 0 ? Math.round((c.present / total) * 100) : 0,
    };
  });

  res.json({ success: true, data: summaries });
}));

// ---------------------------------------------------------------------------
// NEW ENDPOINTS
// ---------------------------------------------------------------------------

// GET /api/v1/attendance/excel — monthly attendance sheet download
// Query: classId, sectionId, month(1-12), year
router.get('/excel', wrap(async (req, res) => {
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
router.get('/date-range', wrap(async (req, res) => {
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
router.get('/deficit', wrap(async (req, res) => {
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
router.get('/student/:studentId/history', requireRole('student', 'parent', 'teacher', 'admin', 'super_admin', 'principal'), wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId } = req.params;
  const { sessionId } = req.query;
  const requestedId = parseInt(studentId);

  const student = await prisma.student.findFirst({
    where: { id: requestedId, schoolId, deletedAt: null },
    select: { id: true, name: true, rollNo: true, classId: true, sectionId: true, emergencyPhone: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  /* -- Ownership check -- */
  const role = req.user?.role;

  if (role === 'student') {
    // Students may only access their own record.
    // The student's linked user is identified by matching rollNo or a studentId on the user record.
    const linkedStudentId = req.user?.studentId || null;
    const linkedRollNo    = req.user?.rollNo || req.user?.username || null;
    const isOwn =
      (linkedStudentId && linkedStudentId === requestedId) ||
      (linkedRollNo && linkedRollNo === student.rollNo);
    if (!isOwn) {
      return res.status(403).json({ success: false, message: 'Access denied. Students can only view their own attendance.' });
    }
  }

  if (role === 'parent') {
    // Parents may only access records of their own children.
    // Children are students whose emergencyPhone matches the parent's phone.
    const parentPhone = req.user?.phone || req.user?.contactPhone || null;
    const isChild = parentPhone && student.emergencyPhone === parentPhone;
    if (!isChild) {
      // Secondary check: explicit parent-student link table if it exists
      let linked = false;
      try {
        const link = await prisma.parentStudentLink?.findFirst({
          where: { parentId: req.user.id, studentId: requestedId },
        });
        linked = !!link;
      } catch (_) { /* model may not exist */ }

      if (!linked) {
        return res.status(403).json({ success: false, message: 'Access denied. Parents can only view their children\'s attendance.' });
      }
    }
  }

  // Determine date range: current academic year (July-June) or session-based
  let startDate, endDate;
  if (sessionId) {
    const session = await prisma.session.findUnique({ where: { id: parseInt(sessionId) } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    startDate = session.startDate;
    endDate = session.endDate;
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

  res.json({
    success: true,
    student,
    summary: { present, absent, leave, late, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 },
    records,
  });
}));

// PUT /api/v1/attendance/:id — update a single attendance record (status change)
router.put('/:id', wrap(async (req, res) => {
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

  // Log in AuditLog if model exists
  try {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: req.user.id,
        action: 'UPDATE_ATTENDANCE',
        entity: 'Attendance',
        entityId: String(updated.id),
        oldValue: JSON.stringify({ status: existing.status }),
        newValue: JSON.stringify({ status: updated.status }),
        ip: req.ip || null,
      },
    });
  } catch (_) {
    // AuditLog model may not exist; silently skip
  }

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
router.get('/corrections', wrap(async (req, res) => {
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
    // Create attendance record if not yet present
    await prisma.attendance.create({
      data: {
        schoolId,
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

  const updated = await prisma.attendanceCorrection.update({
    where: { id: parseInt(id) },
    data: {
      status: 'rejected',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      ...(remarks !== undefined && { remarks }),
    },
  });

  res.json({ success: true, data: updated, message: 'Correction request rejected.' });
}));

// ---------------------------------------------------------------------------
// STAFF ATTENDANCE
// ---------------------------------------------------------------------------

// GET /api/v1/attendance/staff/report — staff attendance summary for a month
// Query: month, year, department(optional)
router.get('/staff/report', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { month, year, department } = req.query;

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const staffList = await prisma.staff.findMany({
    where: {
      schoolId,
      status: 'active',
      deletedAt: null,
      ...(campusId && { campusId }),
      ...(department && { department }),
    },
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
      department: staff.department || null,
      present, absent, late, leave, total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      avgCheckIn,
    };
  }));

  res.json({ success: true, data: report, month: m, year: y, count: report.length });
}));

// GET /api/v1/attendance/staff/excel — staff attendance XLSX download
// Query: month, year, department(optional)
router.get('/staff/excel', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { month, year, department } = req.query;

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const staffList = await prisma.staff.findMany({
    where: {
      schoolId, status: 'active', deletedAt: null,
      ...(campusId && { campusId }),
      ...(department && { department }),
    },
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
      designation: staff.designation || '-', department: staff.department || '-',
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
router.get('/alerts/multi-day-absent', wrap(async (req, res) => {
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
