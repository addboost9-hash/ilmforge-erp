const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { body, param, validationResult } = require('express-validator');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Middleware: collect express-validator errors and return 400 if any
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed.', errors: errors.array() });
  }
  next();
};

const canManageExams = (role) => ['super_admin', 'admin', 'teacher'].includes(role);

// ---------------------------------------------------------------------------
// Grade calculation helpers
// ---------------------------------------------------------------------------

/**
 * Calculate grade using ExamSettings thresholds if available, otherwise
 * fall back to hard-coded default thresholds.
 *
 * @param {number} obtained
 * @param {number} total
 * @param {Array|null} thresholds  Array of {minPercent, grade} sorted desc by minPercent
 * @returns {string}
 */
const calcGradeFromThresholds = (obtained, total, thresholds) => {
  if (!total || total === 0) return 'F';
  const pct = (obtained / total) * 100;
  if (thresholds && thresholds.length > 0) {
    const sorted = [...thresholds].sort((a, b) => b.minPercent - a.minPercent);
    for (const t of sorted) {
      if (pct >= t.minPercent) return t.grade;
    }
    return 'F';
  }
  // Default thresholds
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

// Legacy helper kept for backward compatibility inside this file
const calcGrade = (obtained, total) => calcGradeFromThresholds(obtained, total, null);

/**
 * Load ExamSettings thresholds for the school, return null if model/row absent.
 */
const loadThresholds = async (schoolId) => {
  try {
    const settings = await prisma.examSettings.findFirst({ where: { schoolId } });
    if (settings && settings.gradeThresholds) return settings.gradeThresholds;
  } catch (_) {
    // ExamSettings model may not exist in older schema versions
  }
  return null;
};

/**
 * Derive division string from percentage.
 */
const calcDivision = (pct) => {
  if (pct >= 60) return 'First';
  if (pct >= 45) return 'Second';
  if (pct >= 33) return 'Third';
  return 'Fail';
};

// ---------------------------------------------------------------------------
// STATIC / COLLECTION routes  (must be declared BEFORE /:id param routes)
// ---------------------------------------------------------------------------

// GET /exams/template/excel — blank marks entry template for a class
router.get('/template/excel', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const { classId, examId } = req.query;
  if (!classId) return res.status(400).json({ success: false, message: 'classId is required.' });

  const students = await prisma.student.findMany({
    where: { schoolId: req.schoolId, classId: parseInt(classId), deletedAt: null, status: 'active' },
    orderBy: { rollNo: 'asc' },
  });

  // Attempt to load subjects for the class
  let subjects = [];
  try {
    subjects = await prisma.subject.findMany({
      where: { schoolId: req.schoolId, classId: parseInt(classId) },
      orderBy: { name: 'asc' },
    });
  } catch (_) {
    // subject model may not have classId — skip
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Marks Template');

  const baseCols = [
    { header: 'Roll No', key: 'rollNo', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
  ];
  const subjectCols = subjects.map((s) => ({
    header: `${s.name} (Obt)`,
    key: `sub_${s.id}_obt`,
    width: 16,
  }));
  const subjectTotalCols = subjects.map((s) => ({
    header: `${s.name} (Total)`,
    key: `sub_${s.id}_total`,
    width: 16,
  }));
  ws.columns = [...baseCols, ...subjectCols, ...subjectTotalCols];

  students.forEach((s) => {
    const row = { rollNo: s.rollNo, name: s.name };
    ws.addRow(row);
  });

  // Bold the header row
  ws.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=marks_template.xlsx');
  await wb.xlsx.write(res);
  res.end();
}));

// GET /exams/cumulative — aggregated totals across all exams in a session per student
router.get('/cumulative', wrap(async (req, res) => {
  const { sessionId, classId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required.' });

  const exams = await prisma.exam.findMany({
    where: {
      schoolId: req.schoolId,
      sessionId: parseInt(sessionId),
      ...(classId && { classId: parseInt(classId) }),
    },
    select: { id: true, title: true },
  });

  const examIds = exams.map((e) => e.id);
  if (examIds.length === 0) return res.json({ success: true, data: [] });

  const allMarks = await prisma.examMark.findMany({
    where: { examId: { in: examIds } },
    include: {
      student: { select: { id: true, name: true, rollNo: true } },
    },
  });

  const studentMap = {};
  for (const m of allMarks) {
    const sid = m.studentId;
    if (!studentMap[sid]) {
      studentMap[sid] = {
        studentId: sid,
        rollNo: m.student?.rollNo,
        name: m.student?.name,
        totalObtained: 0,
        totalMarks: 0,
        examCount: 0,
      };
    }
    studentMap[sid].totalObtained += m.obtainedMarks || 0;
    studentMap[sid].totalMarks += m.totalMarks || 0;
    studentMap[sid].examCount += 1;
  }

  const thresholds = await loadThresholds(req.schoolId);

  const result = Object.values(studentMap).map((s) => {
    const pct = s.totalMarks > 0 ? (s.totalObtained / s.totalMarks) * 100 : 0;
    return {
      ...s,
      percentage: parseFloat(pct.toFixed(2)),
      grade: calcGradeFromThresholds(s.totalObtained, s.totalMarks, thresholds),
      division: calcDivision(pct),
    };
  });

  result.sort((a, b) => b.percentage - a.percentage);
  res.json({ success: true, data: result });
}));

// ---------------------------------------------------------------------------
// DATE SHEET routes  (School Mentor-style: class/section grouped view)
// ---------------------------------------------------------------------------

// GET /exams/:examId/datesheet — list all date sheet entries for an exam, grouped by class+section
router.get('/:examId/datesheet', wrap(async (req, res) => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) return res.status(400).json({ success: false, message: 'Invalid examId.' });

  // Verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  // Get all classes with sections for this school
  const classes = await prisma.class.findMany({
    where: { schoolId: req.schoolId, isActive: true },
    include: { sections: true },
    orderBy: { orderNo: 'asc' },
  });

  // Get all timetable entries for this exam
  let entries = [];
  try {
    entries = await prisma.examTimetable.findMany({
      where: { examId, schoolId: req.schoolId },
      orderBy: { date: 'asc' },
    });
  } catch (_) {
    entries = [];
  }

  // Group entries by classId+sectionId
  const entryMap = {};
  for (const e of entries) {
    const key = `${e.classId || 0}_${e.sectionId || 0}`;
    if (!entryMap[key]) entryMap[key] = [];
    entryMap[key].push({
      id: e.id,
      subject: e.subjectName,
      date: e.date ? e.date.toISOString().slice(0, 10) : '',
      timeFrom: e.startTime || '',
      timeTo: e.endTime || '',
    });
  }

  // Build result rows: one row per class-section pair
  const rows = [];
  for (const cls of classes) {
    if (cls.sections && cls.sections.length > 0) {
      for (const sec of cls.sections) {
        const key = `${cls.id}_${sec.id}`;
        rows.push({
          classId: cls.id,
          className: cls.name,
          sectionId: sec.id,
          sectionName: sec.name,
          entries: entryMap[key] || [],
        });
      }
    } else {
      // Class with no sections
      const key = `${cls.id}_0`;
      rows.push({
        classId: cls.id,
        className: cls.name,
        sectionId: null,
        sectionName: '-',
        entries: entryMap[key] || [],
      });
    }
  }

  res.json({ success: true, data: rows });
}));

// POST /exams/:examId/datesheet — add a single date sheet entry for a class/section
router.post('/:examId/datesheet', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) return res.status(400).json({ success: false, message: 'Invalid examId.' });

  const { classId, sectionId, subject, date, timeFrom, timeTo } = req.body;
  if (!subject) return res.status(400).json({ success: false, message: 'subject is required.' });

  // Verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  try {
    const entry = await prisma.examTimetable.create({
      data: {
        examId,
        schoolId: req.schoolId,
        classId: classId ? parseInt(classId) : null,
        sectionId: sectionId ? parseInt(sectionId) : null,
        subjectName: subject,
        date: date ? new Date(date) : null,
        startTime: timeFrom || null,
        endTime: timeTo || null,
      },
    });
    res.status(201).json({
      success: true,
      data: {
        id: entry.id,
        subject: entry.subjectName,
        date: entry.date ? entry.date.toISOString().slice(0, 10) : '',
        timeFrom: entry.startTime || '',
        timeTo: entry.endTime || '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create entry.', detail: err.message });
  }
}));

// PUT /exams/datesheet/:entryId — update a date sheet entry
router.put('/datesheet/:entryId', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const entryId = parseInt(req.params.entryId);
  if (isNaN(entryId)) return res.status(400).json({ success: false, message: 'Invalid entryId.' });

  const existing = await prisma.examTimetable.findFirst({ where: { id: entryId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Entry not found.' });

  const { subject, date, timeFrom, timeTo } = req.body;
  try {
    const entry = await prisma.examTimetable.update({
      where: { id: entryId },
      data: {
        ...(subject !== undefined && { subjectName: subject }),
        ...(date !== undefined && { date: date ? new Date(date) : null }),
        ...(timeFrom !== undefined && { startTime: timeFrom || null }),
        ...(timeTo !== undefined && { endTime: timeTo || null }),
      },
    });
    res.json({
      success: true,
      data: {
        id: entry.id,
        subject: entry.subjectName,
        date: entry.date ? entry.date.toISOString().slice(0, 10) : '',
        timeFrom: entry.startTime || '',
        timeTo: entry.endTime || '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update entry.', detail: err.message });
  }
}));

// DELETE /exams/datesheet/:entryId — delete a date sheet entry
router.delete('/datesheet/:entryId', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const entryId = parseInt(req.params.entryId);
  if (isNaN(entryId)) return res.status(400).json({ success: false, message: 'Invalid entryId.' });

  const existing = await prisma.examTimetable.findFirst({ where: { id: entryId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Entry not found.' });

  try {
    await prisma.examTimetable.delete({ where: { id: entryId } });
    res.json({ success: true, message: 'Entry deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete entry.', detail: err.message });
  }
}));

// POST /exams/:examId/datesheet/copy-to-all — copy one class/section date sheet to all other classes/sections
router.post('/:examId/datesheet/copy-to-all', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) return res.status(400).json({ success: false, message: 'Invalid examId.' });

  const { fromClassId, fromSectionId } = req.body;
  if (!fromClassId) return res.status(400).json({ success: false, message: 'fromClassId is required.' });

  // Verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  // Get source entries
  const sourceEntries = await prisma.examTimetable.findMany({
    where: {
      examId,
      schoolId: req.schoolId,
      classId: parseInt(fromClassId),
      sectionId: fromSectionId ? parseInt(fromSectionId) : null,
    },
  });

  if (sourceEntries.length === 0) {
    return res.status(400).json({ success: false, message: 'No date sheet entries found for the source class/section.' });
  }

  // Get all classes with sections
  const classes = await prisma.class.findMany({
    where: { schoolId: req.schoolId, isActive: true },
    include: { sections: true },
    orderBy: { orderNo: 'asc' },
  });

  // Build list of all target class+section combos (excluding the source)
  const targets = [];
  for (const cls of classes) {
    if (cls.sections && cls.sections.length > 0) {
      for (const sec of cls.sections) {
        // Skip the source
        if (cls.id === parseInt(fromClassId) && sec.id === (fromSectionId ? parseInt(fromSectionId) : null)) continue;
        targets.push({ classId: cls.id, sectionId: sec.id });
      }
    } else {
      if (cls.id === parseInt(fromClassId) && !fromSectionId) continue;
      targets.push({ classId: cls.id, sectionId: null });
    }
  }

  // For each target, delete existing entries and copy source entries
  let created = 0;
  for (const target of targets) {
    // Delete existing entries for this target
    await prisma.examTimetable.deleteMany({
      where: {
        examId,
        schoolId: req.schoolId,
        classId: target.classId,
        sectionId: target.sectionId,
      },
    });

    // Copy source entries
    for (const src of sourceEntries) {
      await prisma.examTimetable.create({
        data: {
          examId,
          schoolId: req.schoolId,
          classId: target.classId,
          sectionId: target.sectionId,
          subjectName: src.subjectName,
          date: src.date,
          startTime: src.startTime,
          endTime: src.endTime,
          room: src.room,
        },
      });
      created++;
    }
  }

  res.json({
    success: true,
    message: `Date sheet copied to ${targets.length} class/section(s). ${created} entries created.`,
    targets: targets.length,
    entriesCreated: created,
  });
}));

// GET /exams/timetable — fetch ExamTimetable entries for an exam
router.get('/timetable', wrap(async (req, res) => {
  const { examId } = req.query;
  if (!examId) return res.status(400).json({ success: false, message: 'examId is required.' });
  try {
    const rows = await prisma.examTimetable.findMany({
      where: { examId: parseInt(examId), schoolId: req.schoolId },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    // ExamTimetable model may not exist
    res.status(501).json({ success: false, message: 'ExamTimetable model not available.', detail: err.message });
  }
}));

// POST /exams/timetable — create a timetable entry
router.post('/timetable', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const { examId, subjectName, date, startTime, endTime, room } = req.body;
  if (!examId || !subjectName || !date) {
    return res.status(400).json({ success: false, message: 'examId, subjectName, and date are required.' });
  }
  try {
    const entry = await prisma.examTimetable.create({
      data: {
        examId: parseInt(examId),
        schoolId: req.schoolId,
        subjectName,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        room: room || null,
      },
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(501).json({ success: false, message: 'ExamTimetable model not available.', detail: err.message });
  }
}));

// PUT /exams/timetable/:id — update a timetable entry
router.put('/timetable/:id', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const timetableId = parseInt(req.params.id);
  const { subjectName, date, startTime, endTime, room } = req.body;
  try {
    // Ownership check: verify this timetable entry belongs to the requesting school
    const existing = await prisma.examTimetable.findFirst({
      where: { id: timetableId, schoolId: req.schoolId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timetable entry not found.' });
    }
    const entry = await prisma.examTimetable.update({
      where: { id: timetableId },
      data: {
        ...(subjectName && { subjectName }),
        ...(date && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(room !== undefined && { room }),
      },
    });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(501).json({ success: false, message: 'ExamTimetable model not available or entry not found.', detail: err.message });
  }
}));

// DELETE /exams/timetable/:id — delete a timetable entry
router.delete('/timetable/:id', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const timetableId = parseInt(req.params.id);
  try {
    // Ownership check: verify this timetable entry belongs to the requesting school
    const existing = await prisma.examTimetable.findFirst({
      where: { id: timetableId, schoolId: req.schoolId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timetable entry not found.' });
    }
    await prisma.examTimetable.delete({ where: { id: timetableId } });
    res.json({ success: true, message: 'Timetable entry deleted.' });
  } catch (err) {
    res.status(501).json({ success: false, message: 'ExamTimetable model not available or entry not found.', detail: err.message });
  }
}));

// GET /exams/result-config — fetch grade config, signatures, card options
router.get('/result-config', wrap(async (req, res) => {
  const config = await getResultConfig(req.schoolId);
  res.json({ success: true, data: config });
}));

// PUT /exams/result-config — save result config
router.put('/result-config', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const { grades, signatures, finalRemarks, cardOptions, signatureOptions } = req.body;

  if (grades !== undefined && !Array.isArray(grades)) {
    return res.status(400).json({ success: false, message: 'grades must be an array.' });
  }

  const existing = await getResultConfig(req.schoolId);
  const updated = {
    grades:           grades           ?? existing.grades,
    signatures:       signatures       ?? existing.signatures,
    finalRemarks:     finalRemarks     ?? existing.finalRemarks,
    cardOptions:      cardOptions      ? { ...existing.cardOptions, ...cardOptions }     : existing.cardOptions,
    signatureOptions: signatureOptions ? { ...existing.signatureOptions, ...signatureOptions } : existing.signatureOptions,
  };

  const saved = await setResultConfig(req.schoolId, updated);
  res.json({ success: true, data: saved, message: 'Result config saved.' });
}));

// ---------------------------------------------------------------------------
// Collection routes
// ---------------------------------------------------------------------------

// GET /exams — list exams for school
router.get('/', wrap(async (req, res) => {
  const { classId } = req.query;
  const exams = await prisma.exam.findMany({
    where: { schoolId: req.schoolId, ...(classId && { classId: parseInt(classId) }) },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: exams });
}));

// POST /exams — create exam
router.post(
  '/',
  [
    body('title')
      .isString().withMessage('title must be a string.')
      .trim()
      .notEmpty().withMessage('title is required.')
      .isLength({ max: 200 }).withMessage('title must be under 200 characters.'),
    body('type')
      .optional()
      .isString().withMessage('type must be a string.'),
    body('classId')
      .optional({ nullable: true })
      .isInt().withMessage('classId must be an integer.'),
  ],
  validate,
  wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can create exams.' });
  }
  const { title, type, classId, classIds, sessionId, dateStart, dateEnd, term } = req.body;
  // Try with classIds first; fall back without it if column doesn't exist yet
  let exam;
  try {
    exam = await prisma.exam.create({
      data: {
        schoolId: req.schoolId,
        campusId: req.campusId,
        title,
        type: type || 'test',
        term: term || null,
        classId: classId ? parseInt(classId) : null,
        classIds: classIds || null,
        sessionId: sessionId ? parseInt(sessionId) : null,
        dateStart: dateStart ? new Date(dateStart) : null,
        dateEnd: dateEnd ? new Date(dateEnd) : null,
      },
    });
  } catch (e) {
    // classIds or term column may not exist if migration hasn't run yet — retry without it
    if (e.code === 'P2009' || e.message?.includes('classIds') || e.message?.includes('term') || e.code === 'P2025') {
      exam = await prisma.exam.create({
        data: {
          schoolId: req.schoolId,
          campusId: req.campusId,
          title,
          type: type || 'test',
          classId: classId ? parseInt(classId) : null,
          sessionId: sessionId ? parseInt(sessionId) : null,
          dateStart: dateStart ? new Date(dateStart) : null,
          dateEnd: dateEnd ? new Date(dateEnd) : null,
        },
      });
      // Attach classIds and term to response for frontend to use
      exam = { ...exam, classIds: classIds || null, term: term || null };
    } else {
      throw e;
    }
  }
  res.status(201).json({ success: true, data: exam });
}));

// ---------------------------------------------------------------------------
// Single-exam routes  /:id/...
// ---------------------------------------------------------------------------

// DELETE /exams/:id — delete exam and cascade ExamMarks
router.delete('/:id', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can delete exams.' });
  }
  const examId = parseInt(req.params.id);

  // Verify ownership
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  // Cascade delete marks first (Prisma may not enforce cascade without schema onDelete)
  await prisma.examMark.deleteMany({ where: { examId } });

  // Delete timetable entries if model exists
  try {
    await prisma.examTimetable.deleteMany({ where: { examId } });
  } catch (_) {}

  await prisma.exam.delete({ where: { id: examId } });
  res.json({ success: true, message: 'Exam and associated marks deleted.' });
}));

// PUT /exams/:id — update exam fields
router.put('/:id', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can update exams.' });
  }
  const examId = parseInt(req.params.id);
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const { title, type, dateStart, dateEnd, classId, classIds, term } = req.body;
  let updated;
  try {
    updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(term !== undefined && { term: term || undefined }),
        ...(dateStart !== undefined && { dateStart: dateStart ? new Date(dateStart) : null }),
        ...(dateEnd !== undefined && { dateEnd: dateEnd ? new Date(dateEnd) : null }),
        ...(classId !== undefined && { classId: classId ? parseInt(classId) : null }),
        ...(classIds !== undefined && { classIds: classIds || null }),
      },
    });
  } catch (e) {
    // classIds or term column may not exist if migration hasn't run yet — retry without it
    if (e.code === 'P2009' || e.message?.includes('classIds') || e.message?.includes('term')) {
      updated = await prisma.exam.update({
        where: { id: examId },
        data: {
          ...(title !== undefined && { title }),
          ...(type !== undefined && { type }),
          ...(dateStart !== undefined && { dateStart: dateStart ? new Date(dateStart) : null }),
          ...(dateEnd !== undefined && { dateEnd: dateEnd ? new Date(dateEnd) : null }),
          ...(classId !== undefined && { classId: classId ? parseInt(classId) : null }),
        },
      });
      updated = { ...updated, classIds: classIds || null, term: term || null };
    } else {
      throw e;
    }
  }
  res.json({ success: true, data: updated });
}));

// GET /exams/:id/marks — fetch saved marks for an exam, optionally filtered by classId
router.get('/:id/marks', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can view exam marks.' });
  }
  const examId = parseInt(req.params.id);
  const { classId } = req.query;

  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const where = { examId };
  if (classId) {
    where.student = { classId: parseInt(classId) };
  }

  const marks = await prisma.examMark.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, rollNo: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { studentId: 'asc' },
  });

  res.json({ success: true, data: marks });
}));

// POST /exams/:id/marks — upsert marks with full field support + grade from ExamSettings
router.post(
  '/:id/marks',
  [
    param('id')
      .isInt().withMessage('Exam id param must be an integer.'),
    body('marks')
      .isArray({ min: 1 }).withMessage('marks must be a non-empty array.'),
    body('marks.*.studentId')
      .isInt().withMessage('Each mark must have an integer studentId.'),
    body('marks.*.obtainedMarks')
      .isNumeric().withMessage('Each mark must have a numeric obtainedMarks.'),
  ],
  validate,
  wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can enter marks.' });
  }
  const { marks } = req.body;
  if (!Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({ success: false, message: 'marks[] array is required.' });
  }
  const examId = parseInt(req.params.id);

  // Ownership check: verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const thresholds = await loadThresholds(req.schoolId);
  const results = [];

  // Pre-validate all marks before saving any
  const validationErrors = [];
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const obtained = parseFloat(m.obtainedMarks);
    const total    = parseFloat(m.totalMarks) || 100;
    const isAbsent = m.isAbsent === true || m.isAbsent === 'true';
    if (!isAbsent && !isNaN(obtained) && obtained > total) {
      validationErrors.push(
        `Student ${m.studentId}: obtained marks (${obtained}) exceed total marks (${total}).`
      );
    }
    if (!isAbsent && !isNaN(obtained) && obtained < 0) {
      validationErrors.push(
        `Student ${m.studentId}: obtained marks cannot be negative.`
      );
    }
  }
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Marks validation failed.',
      errors: validationErrors,
    });
  }

  for (const m of marks) {
    const studentId = parseInt(m.studentId);
    const subjectId = m.subjectId ? parseInt(m.subjectId) : null;
    const obtainedMarks = parseFloat(m.obtainedMarks) || 0;
    const totalMarks = parseFloat(m.totalMarks) || 100;
    const theoryMarks = m.theoryMarks !== undefined ? parseFloat(m.theoryMarks) : null;
    const practicalMarks = m.practicalMarks !== undefined ? parseFloat(m.practicalMarks) : null;
    const graceMarks = m.graceMarks !== undefined ? parseFloat(m.graceMarks) : 0;
    const isAbsent = m.isAbsent === true || m.isAbsent === 'true';
    const effectiveObtained = isAbsent ? 0 : obtainedMarks + (graceMarks || 0);
    const grade = isAbsent ? 'F' : calcGradeFromThresholds(effectiveObtained, totalMarks, thresholds);

    const existing = await prisma.examMark.findFirst({
      where: { examId, studentId, subjectId },
    });

    const payload = {
      obtainedMarks: effectiveObtained,
      totalMarks,
      grade,
      isAbsent,
      ...(theoryMarks !== null && { theoryMarks }),
      ...(practicalMarks !== null && { practicalMarks }),
      ...(graceMarks && { graceMarks }),
    };

    let record;
    if (existing) {
      record = await prisma.examMark.update({ where: { id: existing.id }, data: payload });
    } else {
      record = await prisma.examMark.create({
        data: { examId, studentId, subjectId, ...payload },
      });
    }
    results.push(record);
  }

  res.json({ success: true, data: results, message: `Marks saved for ${results.length} students.` });
}));

// POST /exams/:id/marks/excel-import — parse Excel and bulk upsert marks
router.post('/:id/marks/excel-import', upload.single('file'), wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.id);
  // Ownership check: verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  if (!req.file) return res.status(400).json({ success: false, message: 'Excel file is required (field: file).' });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(req.file.buffer);
  const ws = wb.worksheets[0];
  if (!ws) return res.status(400).json({ success: false, message: 'No worksheet found in uploaded file.' });

  // Build header map from first row
  const headerRow = ws.getRow(1).values; // index 1-based
  const headerMap = {};
  headerRow.forEach((h, idx) => {
    if (h) headerMap[String(h).trim()] = idx;
  });

  // Load students for the school to match by rollNo
  const students = await prisma.student.findMany({
    where: { schoolId: req.schoolId, deletedAt: null },
    select: { id: true, rollNo: true },
  });
  const rollNoToStudent = {};
  students.forEach((s) => { rollNoToStudent[String(s.rollNo).trim()] = s; });

  // Load subjects
  let subjectNameToId = {};
  try {
    const subjects = await prisma.subject.findMany({ where: { schoolId: req.schoolId } });
    subjects.forEach((s) => { subjectNameToId[s.name.trim()] = s.id; });
  } catch (_) {}

  const thresholds = await loadThresholds(req.schoolId);
  const marks = [];
  const errors = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    const rollNoIdx = headerMap['Roll No'] || headerMap['RollNo'] || headerMap['roll_no'];
    const obtIdx = headerMap['Obtained'] || headerMap['Obt'] || headerMap['obtainedMarks'];
    const totalIdx = headerMap['Total'] || headerMap['totalMarks'];

    const rollNo = rollNoIdx ? String(row.getCell(rollNoIdx).value || '').trim() : null;
    if (!rollNo) return;

    const student = rollNoToStudent[rollNo];
    if (!student) { errors.push(`Row ${rowNum}: Roll No ${rollNo} not found.`); return; }

    const obtained = parseFloat(row.getCell(obtIdx)?.value) || 0;
    const total = parseFloat(row.getCell(totalIdx)?.value) || 100;

    marks.push({
      studentId: student.id,
      subjectId: null,
      obtainedMarks: obtained,
      totalMarks: total,
      grade: calcGradeFromThresholds(obtained, total, thresholds),
      isAbsent: false,
    });
  });

  const results = [];
  for (const m of marks) {
    const existing = await prisma.examMark.findFirst({
      where: { examId, studentId: m.studentId, subjectId: m.subjectId },
    });
    let record;
    if (existing) {
      record = await prisma.examMark.update({ where: { id: existing.id }, data: { obtainedMarks: m.obtainedMarks, totalMarks: m.totalMarks, grade: m.grade, isAbsent: m.isAbsent } });
    } else {
      record = await prisma.examMark.create({ data: { examId, ...m } });
    }
    results.push(record);
  }

  res.json({ success: true, data: results, errors, message: `${results.length} marks imported, ${errors.length} errors.` });
}));

// GET /exams/:id/results — existing endpoint (kept)
router.get('/:id/results', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can view detailed exam results.' });
  }
  const examId = parseInt(req.params.id);

  // Ownership check: verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const marks = await prisma.examMark.findMany({
    where: { examId },
    include: { exam: true },
  });
  res.json({ success: true, data: marks });
}));

// ---------------------------------------------------------------------------
// Shared gazette builder — used by gazette, merit-list, failed, excel export
// ---------------------------------------------------------------------------
const buildGazette = async (examId, schoolId) => {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: { class: true },
  });
  if (!exam) return null;

  const marks = await prisma.examMark.findMany({
    where: { examId },
    include: {
      student: { select: { id: true, name: true, rollNo: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  const thresholds = await loadThresholds(schoolId);

  // Group by student
  const studentMap = {};
  for (const m of marks) {
    const sid = m.studentId;
    if (!studentMap[sid]) {
      studentMap[sid] = {
        studentId: sid,
        rollNo: m.student?.rollNo,
        name: m.student?.name,
        subjects: [],
        totalObtained: 0,
        totalMarks: 0,
      };
    }
    const subEntry = {
      subjectId: m.subjectId,
      subjectName: m.subject?.name || 'Unknown',
      obtained: m.obtainedMarks,
      total: m.totalMarks,
      theoryMarks: m.theoryMarks,
      practicalMarks: m.practicalMarks,
      grade: m.grade || calcGradeFromThresholds(m.obtainedMarks, m.totalMarks, thresholds),
      isAbsent: m.isAbsent,
    };
    studentMap[sid].subjects.push(subEntry);
    if (!m.isAbsent) {
      studentMap[sid].totalObtained += m.obtainedMarks || 0;
      studentMap[sid].totalMarks += m.totalMarks || 0;
    } else {
      studentMap[sid].totalMarks += m.totalMarks || 0;
    }
  }

  // Calculate aggregates and sort by percentage desc
  const rows = Object.values(studentMap).map((s) => {
    const pct = s.totalMarks > 0 ? (s.totalObtained / s.totalMarks) * 100 : 0;
    const overallGrade = calcGradeFromThresholds(s.totalObtained, s.totalMarks, thresholds);
    const passed = overallGrade !== 'F' && !s.subjects.some((sub) => sub.grade === 'F');
    return {
      ...s,
      percentage: parseFloat(pct.toFixed(2)),
      grade: overallGrade,
      division: calcDivision(pct),
      passed,
    };
  });

  rows.sort((a, b) => b.percentage - a.percentage);

  // Assign position (rank) handling ties
  let rank = 0;
  let prevPct = null;
  let skipped = 0;
  for (const row of rows) {
    if (row.percentage !== prevPct) {
      rank += 1 + skipped;
      skipped = 0;
    } else {
      skipped += 1;
    }
    row.position = rank;
    prevPct = row.percentage;
  }

  return { exam, rows };
};

// GET /exams/:id/gazette
router.get('/:id/gazette', wrap(async (req, res) => {
  const examId = parseInt(req.params.id);
  // Ownership check is enforced inside buildGazette via findFirst({where:{id,schoolId}})
  const result = await buildGazette(examId, req.schoolId);
  if (!result) return res.status(404).json({ success: false, message: 'Exam not found.' });
  res.json({ success: true, data: result.rows, exam: result.exam });
}));

// GET /exams/:id/merit-list — sorted by percentage desc with rank
router.get('/:id/merit-list', wrap(async (req, res) => {
  const examId = parseInt(req.params.id);
  // Ownership check is enforced inside buildGazette via findFirst({where:{id,schoolId}})
  const result = await buildGazette(examId, req.schoolId);
  if (!result) return res.status(404).json({ success: false, message: 'Exam not found.' });
  // Already sorted; expose rank as alias of position
  const data = result.rows.map((r) => ({ ...r, rank: r.position }));
  res.json({ success: true, data, exam: result.exam });
}));

// GET /exams/:id/failed — students with any F grade subject or absent (when failCriteria=absent)
router.get('/:id/failed', wrap(async (req, res) => {
  const examId = parseInt(req.params.id);
  const { failCriteria } = req.query; // 'absent' | undefined
  // Ownership check is enforced inside buildGazette via findFirst({where:{id,schoolId}})
  const result = await buildGazette(examId, req.schoolId);
  if (!result) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const failed = result.rows.filter((s) => {
    const hasFailSubject = s.subjects.some((sub) => sub.grade === 'F');
    const hasAbsent = failCriteria === 'absent' && s.subjects.some((sub) => sub.isAbsent);
    return hasFailSubject || hasAbsent;
  });

  res.json({ success: true, data: failed, exam: result.exam, total: failed.length });
}));

// GET /exams/:id/results/excel — ExcelJS workbook download
router.get('/:id/results/excel', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.id);
  // Ownership check is enforced inside buildGazette via findFirst({where:{id,schoolId}})
  const result = await buildGazette(examId, req.schoolId);
  if (!result) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const { exam, rows } = result;

  // Collect all unique subjects in column order
  const subjectSet = new Map();
  for (const row of rows) {
    for (const sub of row.subjects) {
      if (!subjectSet.has(sub.subjectId)) subjectSet.set(sub.subjectId, sub.subjectName);
    }
  }
  const subjectList = [...subjectSet.entries()]; // [[id, name], ...]

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Results');

  // Build columns
  const fixedCols = [
    { header: 'Roll No', key: 'rollNo', width: 12 },
    { header: 'Name', key: 'name', width: 25 },
  ];
  const subjectCols = [];
  for (const [sid, sname] of subjectList) {
    subjectCols.push({ header: `${sname} Obt`, key: `sub_${sid}_obt`, width: 14 });
    subjectCols.push({ header: `${sname} Total`, key: `sub_${sid}_total`, width: 14 });
  }
  const trailingCols = [
    { header: 'Total Obt', key: 'totalObtained', width: 12 },
    { header: 'Total Marks', key: 'totalMarks', width: 12 },
    { header: '%', key: 'percentage', width: 8 },
    { header: 'Grade', key: 'grade', width: 8 },
    { header: 'Position', key: 'position', width: 10 },
    { header: 'Division', key: 'division', width: 12 },
    { header: 'Pass', key: 'passed', width: 8 },
  ];

  ws.columns = [...fixedCols, ...subjectCols, ...trailingCols];
  ws.getRow(1).font = { bold: true };

  for (const row of rows) {
    const rowData = {
      rollNo: row.rollNo,
      name: row.name,
      totalObtained: row.totalObtained,
      totalMarks: row.totalMarks,
      percentage: row.percentage,
      grade: row.grade,
      position: row.position,
      division: row.division,
      passed: row.passed ? 'Yes' : 'No',
    };
    for (const [sid] of subjectList) {
      const sub = row.subjects.find((s) => s.subjectId === sid);
      rowData[`sub_${sid}_obt`] = sub ? (sub.isAbsent ? 'ABS' : sub.obtained) : '';
      rowData[`sub_${sid}_total`] = sub ? sub.total : '';
    }
    ws.addRow(rowData);
  }

  const safeTitle = (exam.title || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${safeTitle}_results.xlsx`);
  await wb.xlsx.write(res);
  res.end();
}));

// GET /exams/:id/subject-analysis — per-subject statistics
router.get('/:id/subject-analysis', wrap(async (req, res) => {
  const examId = parseInt(req.params.id);
  // Ownership check: verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const marks = await prisma.examMark.findMany({
    where: { examId },
    include: { subject: { select: { id: true, name: true } } },
  });

  const subjectMap = {};
  for (const m of marks) {
    const sid = m.subjectId || 'no_subject';
    const sname = m.subject?.name || 'General';
    if (!subjectMap[sid]) {
      subjectMap[sid] = { subjectId: m.subjectId, subjectName: sname, appeared: 0, passed: 0, failed: 0, totalObtained: 0, marks: [] };
    }
    const sm = subjectMap[sid];
    sm.appeared += 1;
    if (!m.isAbsent) {
      sm.totalObtained += m.obtainedMarks || 0;
      sm.marks.push(m.obtainedMarks || 0);
      if (m.grade === 'F') sm.failed += 1;
      else sm.passed += 1;
    } else {
      sm.failed += 1;
    }
  }

  const analysis = Object.values(subjectMap).map((sm) => {
    const sortedMarks = [...sm.marks].sort((a, b) => a - b);
    return {
      subjectId: sm.subjectId,
      subjectName: sm.subjectName,
      appeared: sm.appeared,
      passed: sm.passed,
      failed: sm.failed,
      passPercent: sm.appeared > 0 ? parseFloat(((sm.passed / sm.appeared) * 100).toFixed(2)) : 0,
      avgMarks: sm.marks.length > 0 ? parseFloat((sm.totalObtained / sm.marks.length).toFixed(2)) : 0,
      highest: sortedMarks.length > 0 ? sortedMarks[sortedMarks.length - 1] : 0,
      lowest: sortedMarks.length > 0 ? sortedMarks[0] : 0,
    };
  });

  res.json({ success: true, data: analysis });
}));

// ---------------------------------------------------------------------------
// Result Config — grade table, signatures, card options  (school-scoped)
// Stored in School.settingsJson under key 'resultConfig'
// ---------------------------------------------------------------------------

const DEFAULT_RESULT_CONFIG = {
  grades: [
    { grade: 'A+', minPercent: 90, comment: 'Outstanding Performance' },
    { grade: 'A',  minPercent: 80, comment: 'Remarkable Performance' },
    { grade: 'B',  minPercent: 70, comment: 'Great Effort. Keep it up!' },
    { grade: 'C',  minPercent: 60, comment: 'Need more Effort!' },
    { grade: 'D',  minPercent: 50, comment: 'Kindly Put More Effort!!' },
    { grade: 'F',  minPercent: 0,  comment: 'Fail' },
  ],
  signatures: [
    { name: 'Principal', designation: 'Principal', signatureUrl: '' },
  ],
  finalRemarks: [
    { minPercent: 90, maxPercent: 100, remark: 'Excellent — Outstanding Student' },
    { minPercent: 80, maxPercent: 89,  remark: 'Very Good — Remarkable Effort' },
    { minPercent: 70, maxPercent: 79,  remark: 'Good — Keep it up!' },
    { minPercent: 60, maxPercent: 69,  remark: 'Satisfactory — Need Improvement' },
    { minPercent: 50, maxPercent: 59,  remark: 'Below Average — Work Harder' },
    { minPercent: 0,  maxPercent: 49,  remark: 'Fail — Serious Improvement Needed' },
  ],
  cardOptions: {
    includeComments:        true,
    includeFinalRemarks:    true,
    includeOverallGrade:    true,
    includeOverallPercent:  true,
    includeSectionRanking:  true,
  },
  signatureOptions: {
    // key: signature name (lowercase, spaces replaced with _), value: bool
    principal: true,
  },
};

const getResultConfig = async (schoolId) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { settingsJson: true },
    });
    const settings = school?.settingsJson ? JSON.parse(school.settingsJson) : {};
    return settings.resultConfig || DEFAULT_RESULT_CONFIG;
  } catch {
    return DEFAULT_RESULT_CONFIG;
  }
};

const setResultConfig = async (schoolId, config) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { settingsJson: true },
  });
  const existing = school?.settingsJson ? JSON.parse(school.settingsJson) : {};
  const merged = { ...existing, resultConfig: config, updatedAt: new Date().toISOString() };
  await prisma.school.update({
    where: { id: schoolId },
    data: { settingsJson: JSON.stringify(merged) },
  });
  return config;
};

// POST /exams/:id/publish
router.post('/:id/publish', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.id);
  // Ownership check: verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { isPublished: true, publishedAt: new Date() },
  });
  res.json({ success: true, data: updated, message: 'Exam published.' });
}));

// POST /exams/:id/unpublish
router.post('/:id/unpublish', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.id);
  // Ownership check: verify exam belongs to this school
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { isPublished: false, publishedAt: null },
  });
  res.json({ success: true, data: updated, message: 'Exam unpublished.' });
}));

// GET /exams/:id/results/sms-blast — send SMS to parents with result summary via Twilio (legacy)
router.get('/:id/results/sms-blast', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.id);
  // Ownership check is enforced inside buildGazette via findFirst({where:{id,schoolId}})
  const result = await buildGazette(examId, req.schoolId);
  if (!result) return res.status(404).json({ success: false, message: 'Exam not found.' });

  // Twilio credentials must be set in env
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(503).json({
      success: false,
      message: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in environment.',
    });
  }

  // Load Twilio lazily so the rest of the routes work even without twilio installed
  let twilioClient;
  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
  } catch (err) {
    return res.status(503).json({ success: false, message: 'Twilio npm package not installed on server.', detail: err.message });
  }

  // Load students with parent phone numbers
  const studentIds = result.rows.map((r) => r.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true, parentPhone: true, fatherPhone: true, motherPhone: true },
  });
  const studentPhoneMap = {};
  students.forEach((s) => {
    studentPhoneMap[s.id] = s.parentPhone || s.fatherPhone || s.motherPhone || null;
  });

  const sent = [];
  const failed = [];

  for (const row of result.rows) {
    const phone = studentPhoneMap[row.studentId];
    if (!phone) { failed.push({ studentId: row.studentId, name: row.name, reason: 'No phone number' }); continue; }

    const message =
      `IlmForge Result: ${row.name} | Exam: ${result.exam.title} | ` +
      `Total: ${row.totalObtained}/${row.totalMarks} | ` +
      `%: ${row.percentage}% | Grade: ${row.grade} | ` +
      `Position: ${row.position} | ${row.passed ? 'PASS' : 'FAIL'}`;

    try {
      await twilioClient.messages.create({ body: message, from: fromNumber, to: phone });
      sent.push({ studentId: row.studentId, name: row.name, phone });
    } catch (err) {
      failed.push({ studentId: row.studentId, name: row.name, phone, reason: err.message });
    }
  }

  res.json({
    success: true,
    message: `SMS blast complete. Sent: ${sent.length}, Failed: ${failed.length}.`,
    sent,
    failed,
    data: { sent: sent.length, failed: failed.length },
  });
}));

// ---------------------------------------------------------------------------
// POST /exams/:id/results/sms-blast — parent-friendly notification SMS on result publish
// Uses the school's notification SMS service (POST /notifications/sms internally)
// Body: { portalLink?: string }
// ---------------------------------------------------------------------------
router.post('/:id/results/sms-blast', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const examId = parseInt(req.params.id);
  const portalLink = req.body?.portalLink || process.env.PARENT_PORTAL_URL || 'https://portal.ilmforge.com';

  // Load exam and result rows
  const result = await buildGazette(examId, req.schoolId);
  if (!result) return res.status(404).json({ success: false, message: 'Exam not found.' });

  const { exam, rows } = result;

  // Load students with parent phone numbers
  const studentIds = rows.map((r) => r.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true, parentPhone: true, fatherPhone: true, motherPhone: true },
  });

  const studentMap = {};
  students.forEach((s) => {
    studentMap[s.id] = {
      name: s.name,
      phone: s.parentPhone || s.fatherPhone || s.motherPhone || null,
    };
  });

  // Try to use the school's notification SMS service
  let sendBulkSMS;
  try {
    ({ sendBulkSMS } = require('../services/sms.service'));
  } catch (_) {
    sendBulkSMS = null;
  }

  // Load channel config for this school
  let channelCfg = {};
  try {
    const path = require('path');
    const fs = require('fs');
    const settingsPath = path.join(__dirname, '../../data/school-settings.json');
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      const all = JSON.parse(raw || '{}');
      channelCfg = all[String(req.schoolId)]?.channels || {};
    }
  } catch (_) {}

  const sent = [];
  const failed = [];

  for (const row of rows) {
    const info = studentMap[row.studentId];
    if (!info?.phone) {
      failed.push({ studentId: row.studentId, name: row.name, reason: 'No parent phone' });
      continue;
    }

    // Parent-friendly message as specified
    const message =
      `Dear Parent, ${row.name} result for ${exam.title} has been published. ` +
      `Login to parent portal to view: ${portalLink}`;

    try {
      if (sendBulkSMS) {
        await sendBulkSMS([info.phone], message, channelCfg);
      } else {
        // Fallback: Twilio direct
        const accountSid = process.env.TWILIO_ACCOUNT_SID || channelCfg.smsAccountSid;
        const authToken  = process.env.TWILIO_AUTH_TOKEN  || channelCfg.smsAuthToken;
        const fromNumber = process.env.TWILIO_FROM_NUMBER || channelCfg.smsFromNumber;
        if (!accountSid || !authToken || !fromNumber) throw new Error('SMS credentials not configured.');
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        await client.messages.create({ body: message, from: fromNumber, to: info.phone });
      }
      sent.push({ studentId: row.studentId, name: row.name, phone: info.phone });
    } catch (err) {
      failed.push({ studentId: row.studentId, name: row.name, phone: info.phone, reason: err.message });
    }
  }

  // Log the notification
  try {
    await prisma.notificationLog.create({
      data: {
        schoolId: req.schoolId,
        type: 'sms',
        title: `Result publish notification — ${exam.title}`,
        body: `Result published SMS sent to ${sent.length}/${rows.length} parents.`,
        status: sent.length > 0 ? 'sent' : 'failed',
        sentAt: new Date(),
      },
    });
  } catch (_) { /* non-critical */ }

  res.json({
    success: true,
    message: `Results published! SMS sent to ${sent.length} parent${sent.length !== 1 ? 's' : ''}.`,
    data: { sent: sent.length, failed: failed.length },
    sent,
    failed,
  });
}));

module.exports = router;
