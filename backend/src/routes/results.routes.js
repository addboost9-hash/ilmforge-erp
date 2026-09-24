const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// FIX: the mobile Parent Portal's Results screen calls GET /results/student/:id,
// which doesn't exist anywhere in the backend (the equivalent web endpoint is
// GET /students/:id/exam-results, which returns a flat per-mark list rather
// than the grouped-by-exam shape this screen renders). Reuses the same
// ownership checks as that endpoint, but groups marks by exam.
router.get('/student/:studentId', wrap(async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const { schoolId } = req;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  if (req.user?.role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
    const link = parent
      ? await prisma.parentStudent.findFirst({ where: { schoolId, parentId: parent.id, studentId } })
      : null;
    if (!link) return res.status(403).json({ success: false, message: 'Access denied for this student.' });
  }
  if (req.user?.role === 'student' && student.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied for this student.' });
  }

  const marks = await prisma.examMark.findMany({
    where: { studentId, exam: { schoolId } },
    include: { exam: { select: { id: true, title: true, dateStart: true, term: true } } },
    orderBy: [{ exam: { dateStart: 'desc' } }],
    take: 200,
  });

  const subjectIds = [...new Set(marks.map(m => m.subjectId).filter(Boolean))];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } })
    : [];
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  const examsById = new Map();
  for (const m of marks) {
    const examId = m.examId;
    if (!examsById.has(examId)) {
      examsById.set(examId, {
        id: examId,
        examName: m.exam?.title || '—',
        date: m.exam?.dateStart || null,
        term: m.exam?.term || null,
        subjects: [],
      });
    }
    examsById.get(examId).subjects.push({
      id: m.id,
      subjectName: m.subjectId ? (subjectMap[m.subjectId] || `Subject ${m.subjectId}`) : '—',
      obtainedMarks: m.obtainedMarks,
      totalMarks: m.totalMarks,
      grade: m.grade,
    });
  }

  res.json({ success: true, data: [...examsById.values()] });
}));

module.exports = router;
