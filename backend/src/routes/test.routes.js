const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const canManageTests = (role) => ['super_admin', 'admin', 'teacher'].includes(role);

// ---------------------------------------------------------------------------
// Grade helpers — reuse same logic as exam.routes.js
// ---------------------------------------------------------------------------

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
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

const loadThresholds = async (schoolId) => {
  try {
    const settings = await prisma.examSettings.findFirst({ where: { schoolId } });
    if (settings && settings.gradeThresholds) return settings.gradeThresholds;
  } catch (_) {}
  return null;
};

// ---------------------------------------------------------------------------
// GET /tests?classId=&sectionId= — list tests for school with optional filters
// ---------------------------------------------------------------------------
router.get('/', wrap(async (req, res) => {
  const { classId, sectionId } = req.query;
  const tests = await prisma.test.findMany({
    where: {
      schoolId: req.schoolId,
      ...(classId && { classId: parseInt(classId) }),
      ...(sectionId && { sectionId: parseInt(sectionId) }),
    },
    orderBy: { date: 'desc' },
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });
  res.json({ success: true, data: tests });
}));

// ---------------------------------------------------------------------------
// POST /tests — create a new test
// ---------------------------------------------------------------------------
router.post('/', wrap(async (req, res) => {
  if (!canManageTests(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can create tests.' });
  }
  const { title, testType, classId, sectionId, subjectId, date, totalMarks } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'title is required.' });
  if (!totalMarks) return res.status(400).json({ success: false, message: 'totalMarks is required.' });

  const test = await prisma.test.create({
    data: {
      schoolId: req.schoolId,
      title,
      testType: testType || 'written',
      classId: classId ? parseInt(classId) : null,
      sectionId: sectionId ? parseInt(sectionId) : null,
      subjectId: subjectId ? parseInt(subjectId) : null,
      date: date ? new Date(date) : new Date(),
      totalMarks: parseFloat(totalMarks),
    },
  });
  res.status(201).json({ success: true, data: test });
}));

// ---------------------------------------------------------------------------
// PUT /tests/:id — update test
// ---------------------------------------------------------------------------
router.put('/:id', wrap(async (req, res) => {
  if (!canManageTests(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can update tests.' });
  }
  const testId = parseInt(req.params.id);
  const test = await prisma.test.findFirst({ where: { id: testId, schoolId: req.schoolId } });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

  const { title, testType, classId, sectionId, subjectId, date, totalMarks } = req.body;
  const updated = await prisma.test.update({
    where: { id: testId },
    data: {
      ...(title !== undefined && { title }),
      ...(testType !== undefined && { testType }),
      ...(classId !== undefined && { classId: classId ? parseInt(classId) : null }),
      ...(sectionId !== undefined && { sectionId: sectionId ? parseInt(sectionId) : null }),
      ...(subjectId !== undefined && { subjectId: subjectId ? parseInt(subjectId) : null }),
      ...(date !== undefined && { date: date ? new Date(date) : null }),
      ...(totalMarks !== undefined && { totalMarks: parseFloat(totalMarks) }),
    },
  });
  res.json({ success: true, data: updated });
}));

// ---------------------------------------------------------------------------
// DELETE /tests/:id — delete test and cascade TestMark
// ---------------------------------------------------------------------------
router.delete('/:id', wrap(async (req, res) => {
  if (!canManageTests(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can delete tests.' });
  }
  const testId = parseInt(req.params.id);
  const test = await prisma.test.findFirst({ where: { id: testId, schoolId: req.schoolId } });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

  // Cascade delete marks first
  await prisma.testMark.deleteMany({ where: { testId } });
  await prisma.test.delete({ where: { id: testId } });
  res.json({ success: true, message: 'Test and associated marks deleted.' });
}));

// ---------------------------------------------------------------------------
// POST /tests/:id/marks — bulk save TestMark with grade calculation
// Body: { marks: [{studentId, obtainedMarks, isAbsent}] }
// ---------------------------------------------------------------------------
router.post('/:id/marks', wrap(async (req, res) => {
  if (!canManageTests(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can enter marks.' });
  }
  const { marks } = req.body;
  if (!Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({ success: false, message: 'marks[] array is required.' });
  }
  const testId = parseInt(req.params.id);

  const test = await prisma.test.findFirst({ where: { id: testId, schoolId: req.schoolId } });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

  const thresholds = await loadThresholds(req.schoolId);
  const results = [];

  for (const m of marks) {
    const studentId = parseInt(m.studentId);
    const isAbsent = m.isAbsent === true || m.isAbsent === 'true';
    const obtainedMarks = isAbsent ? 0 : (parseFloat(m.obtainedMarks) || 0);
    const totalMarks = test.totalMarks;
    const grade = isAbsent ? 'F' : calcGradeFromThresholds(obtainedMarks, totalMarks, thresholds);

    const existing = await prisma.testMark.findFirst({ where: { testId, studentId } });
    const payload = { obtainedMarks, totalMarks, grade, isAbsent };

    let record;
    if (existing) {
      record = await prisma.testMark.update({ where: { id: existing.id }, data: payload });
    } else {
      record = await prisma.testMark.create({ data: { testId, studentId, ...payload } });
    }
    results.push(record);
  }

  res.json({ success: true, data: results, message: `${results.length} marks saved.` });
}));

// ---------------------------------------------------------------------------
// GET /tests/:id/marks — return TestMark[] with student info
// ---------------------------------------------------------------------------
router.get('/:id/marks', wrap(async (req, res) => {
  const testId = parseInt(req.params.id);
  const test = await prisma.test.findFirst({ where: { id: testId, schoolId: req.schoolId } });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

  const marks = await prisma.testMark.findMany({
    where: { testId },
    include: {
      student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
    },
    orderBy: { student: { rollNo: 'asc' } },
  });
  res.json({ success: true, data: marks, test });
}));

// ---------------------------------------------------------------------------
// GET /tests/:id/tabulation — students with marks, percentage, grade, position
// ---------------------------------------------------------------------------
router.get('/:id/tabulation', wrap(async (req, res) => {
  const testId = parseInt(req.params.id);
  const test = await prisma.test.findFirst({ where: { id: testId, schoolId: req.schoolId } });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

  const marks = await prisma.testMark.findMany({
    where: { testId },
    include: {
      student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
    },
  });

  const thresholds = await loadThresholds(req.schoolId);

  const rows = marks.map((m) => {
    const pct = m.totalMarks > 0 ? (m.obtainedMarks / m.totalMarks) * 100 : 0;
    return {
      studentId: m.studentId,
      rollNo: m.student?.rollNo,
      name: m.student?.name,
      admissionNo: m.student?.admissionNo,
      obtainedMarks: m.obtainedMarks,
      totalMarks: m.totalMarks,
      percentage: parseFloat(pct.toFixed(2)),
      grade: m.grade || calcGradeFromThresholds(m.obtainedMarks, m.totalMarks, thresholds),
      isAbsent: m.isAbsent,
    };
  });

  // Sort by obtainedMarks desc for ranking
  rows.sort((a, b) => b.obtainedMarks - a.obtainedMarks);

  // Assign position handling ties
  let rank = 0;
  let prevObt = null;
  let skipped = 0;
  for (const row of rows) {
    if (row.isAbsent) {
      row.position = null;
      continue;
    }
    if (row.obtainedMarks !== prevObt) {
      rank += 1 + skipped;
      skipped = 0;
    } else {
      skipped += 1;
    }
    row.position = rank;
    prevObt = row.obtainedMarks;
  }

  res.json({ success: true, data: rows, test });
}));

// ---------------------------------------------------------------------------
// GET /tests/:id/position-holders — top 10 by marks with rank
// ---------------------------------------------------------------------------
router.get('/:id/position-holders', wrap(async (req, res) => {
  const testId = parseInt(req.params.id);
  const test = await prisma.test.findFirst({ where: { id: testId, schoolId: req.schoolId } });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

  const marks = await prisma.testMark.findMany({
    where: { testId, isAbsent: false },
    include: {
      student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
    },
    orderBy: { obtainedMarks: 'desc' },
    take: 10,
  });

  const thresholds = await loadThresholds(req.schoolId);

  const rows = marks.map((m, index) => {
    const pct = m.totalMarks > 0 ? (m.obtainedMarks / m.totalMarks) * 100 : 0;
    return {
      rank: index + 1,
      studentId: m.studentId,
      rollNo: m.student?.rollNo,
      name: m.student?.name,
      admissionNo: m.student?.admissionNo,
      obtainedMarks: m.obtainedMarks,
      totalMarks: m.totalMarks,
      percentage: parseFloat(pct.toFixed(2)),
      grade: m.grade || calcGradeFromThresholds(m.obtainedMarks, m.totalMarks, thresholds),
    };
  });

  res.json({ success: true, data: rows, test });
}));

// ---------------------------------------------------------------------------
// GET /tests/:id/excel — ExcelJS tabulation sheet download
// ---------------------------------------------------------------------------
router.get('/:id/excel', wrap(async (req, res) => {
  if (!canManageTests(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const testId = parseInt(req.params.id);
  const test = await prisma.test.findFirst({
    where: { id: testId, schoolId: req.schoolId },
    include: {
      class: { select: { name: true } },
      section: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });

  const marks = await prisma.testMark.findMany({
    where: { testId },
    include: {
      student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
    },
    orderBy: { student: { rollNo: 'asc' } },
  });

  const thresholds = await loadThresholds(req.schoolId);

  // Build tabulation data with positions
  const rows = marks.map((m) => {
    const pct = m.totalMarks > 0 ? (m.obtainedMarks / m.totalMarks) * 100 : 0;
    return {
      rollNo: m.student?.rollNo,
      admissionNo: m.student?.admissionNo,
      name: m.student?.name,
      obtainedMarks: m.isAbsent ? 'ABS' : m.obtainedMarks,
      totalMarks: m.totalMarks,
      percentage: m.isAbsent ? 'ABS' : parseFloat(pct.toFixed(2)),
      grade: m.isAbsent ? 'ABS' : (m.grade || calcGradeFromThresholds(m.obtainedMarks, m.totalMarks, thresholds)),
      isAbsent: m.isAbsent ? 'Yes' : 'No',
    };
  });

  // Sort and assign ranks for non-absent
  const nonAbsent = rows.filter((r) => r.isAbsent === 'No').sort((a, b) => b.obtainedMarks - a.obtainedMarks);
  let rank = 0;
  let prevObt = null;
  let skip = 0;
  for (const row of nonAbsent) {
    if (row.obtainedMarks !== prevObt) { rank += 1 + skip; skip = 0; } else { skip += 1; }
    row.position = rank;
    prevObt = row.obtainedMarks;
  }
  rows.filter((r) => r.isAbsent === 'Yes').forEach((r) => { r.position = ''; });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tabulation');

  // Title rows
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = `${test.title} — Tabulation Sheet`;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  const subtitle = [
    test.class?.name && `Class: ${test.class.name}`,
    test.section?.name && `Section: ${test.section.name}`,
    test.subject?.name && `Subject: ${test.subject.name}`,
    test.date && `Date: ${new Date(test.date).toLocaleDateString()}`,
    `Total Marks: ${test.totalMarks}`,
  ].filter(Boolean).join('  |  ');
  ws.getCell('A2').value = subtitle;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.addRow([]);

  ws.columns = [
    { header: 'Roll No', key: 'rollNo', width: 12 },
    { header: 'Admission No', key: 'admissionNo', width: 16 },
    { header: 'Student Name', key: 'name', width: 28 },
    { header: 'Marks Obtained', key: 'obtainedMarks', width: 16 },
    { header: 'Total Marks', key: 'totalMarks', width: 14 },
    { header: 'Percentage (%)', key: 'percentage', width: 16 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Absent', key: 'isAbsent', width: 10 },
    { header: 'Position', key: 'position', width: 12 },
  ];

  const headerRow = ws.getRow(4);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

  for (const row of rows) {
    ws.addRow(row);
  }

  // Auto-border all data rows
  const lastRow = ws.rowCount;
  for (let r = 4; r <= lastRow; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
  }

  const safeTitle = (test.title || 'test').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${safeTitle}_tabulation.xlsx`);
  await wb.xlsx.write(res);
  res.end();
}));

module.exports = router;
