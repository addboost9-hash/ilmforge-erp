const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { teacherCanAccessClass } = require('../utils/teacherScope');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const canManageExams = (role) => ['super_admin', 'admin', 'teacher'].includes(role);

router.get('/', wrap(async (req, res) => {
  const { classId } = req.query;
  const exams = await prisma.exam.findMany({
    where: { schoolId: req.schoolId, ...(classId && { classId: parseInt(classId) }) },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: exams });
}));

router.post('/', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can create exams.' });
  }
  const { title, type, classId, sessionId, dateStart, dateEnd } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Title required.' });
  if (!(await teacherCanAccessClass(req, classId))) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }
  const exam = await prisma.exam.create({
    data: {
      schoolId: req.schoolId, campusId: req.campusId, title,
      type: type || 'test',
      classId: classId ? parseInt(classId) : null,
      sessionId: sessionId ? parseInt(sessionId) : null,
      dateStart: dateStart ? new Date(dateStart) : null,
      dateEnd: dateEnd ? new Date(dateEnd) : null,
    }
  });
  res.status(201).json({ success: true, data: exam });
}));

router.post('/:id/marks', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can enter marks.' });
  }
  const { marks } = req.body;
  const examId = parseInt(req.params.id);
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
  if (!(await teacherCanAccessClass(req, exam.classId))) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }

  const results = [];
  for (const m of marks) {
    // Clamp obtained marks into [0, totalMarks] — previously a raw
    // parseInt() was stored with no range check, so out-of-range or negative
    // marks (e.g. 500 on a 100-mark exam) were silently accepted.
    const total = Math.max(1, parseInt(m.totalMarks) || 100);
    const obtainedRaw = parseInt(m.obtainedMarks);
    const obtained = Math.min(total, Math.max(0, Number.isFinite(obtainedRaw) ? obtainedRaw : 0));
    const grade = calcGrade(obtained, total);
    // Check if record exists
    const existing = await prisma.examMark.findFirst({
      where: { examId, studentId: parseInt(m.studentId), subjectId: m.subjectId ? parseInt(m.subjectId) : null }
    });
    let record;
    if (existing) {
      record = await prisma.examMark.update({
        where: { id: existing.id },
        data: { obtainedMarks: obtained, totalMarks: total, grade, isAbsent: m.isAbsent || false }
      });
    } else {
      record = await prisma.examMark.create({
        data: { examId, studentId: parseInt(m.studentId), subjectId: m.subjectId ? parseInt(m.subjectId) : null, obtainedMarks: obtained, totalMarks: total, grade, isAbsent: m.isAbsent || false }
      });
    }
    results.push(record);
  }
  res.json({ success: true, data: results, message: `${results.length} marks saved.` });
}));

router.get('/:id/results', wrap(async (req, res) => {
  if (!canManageExams(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can view detailed exam results.' });
  }
  const marks = await prisma.examMark.findMany({
    where: { examId: parseInt(req.params.id) },
    include: { exam: true }
  });
  res.json({ success: true, data: marks });
}));

// GET /api/v1/exams/:id/my-results — a student/parent's OWN marks for an exam.
// Previously students/parents had no way to see real marks at all: the plain
// exam list has no marks, and /:id/results was admin/teacher-only, so the
// Results tab in the Student/Parent portals always showed blank/failing grades.
router.get('/:id/my-results', wrap(async (req, res) => {
  const examId = parseInt(req.params.id);
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

  let studentId = null;
  if (req.user?.role === 'student') {
    const self = await prisma.student.findFirst({ where: { schoolId: req.schoolId, userId: req.user.id, deletedAt: null } });
    studentId = self?.id || null;
  } else if (req.user?.role === 'parent') {
    const { studentId: requested } = req.query;
    const parent = await prisma.parent.findFirst({ where: { schoolId: req.schoolId, userId: req.user.id } });
    if (parent && requested) {
      const link = await prisma.parentStudent.findFirst({ where: { schoolId: req.schoolId, parentId: parent.id, studentId: parseInt(requested) } });
      studentId = link ? parseInt(requested) : null;
    }
  } else if (canManageExams(req.user?.role)) {
    studentId = req.query.studentId ? parseInt(req.query.studentId) : null;
  }

  if (!studentId) return res.status(403).json({ success: false, message: 'No accessible student specified.' });

  const marks = await prisma.examMark.findMany({ where: { examId, studentId }, orderBy: { id: 'asc' } });
  res.json({ success: true, data: marks });
}));

const calcGrade = (obtained, total) => {
  const pct = (obtained / total) * 100;
  if (pct >= 90) return 'A+'; if (pct >= 80) return 'A'; if (pct >= 70) return 'B';
  if (pct >= 60) return 'C'; if (pct >= 50) return 'D'; return 'F';
};

module.exports = router;
