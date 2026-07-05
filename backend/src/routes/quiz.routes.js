const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const canManageQuizzes = (role) => ['super_admin', 'admin', 'teacher'].includes(role);
const isStudent = (role) => role === 'student';

// ---------------------------------------------------------------------------
// GET /quizzes?classId=&status= — list quizzes for school
// ---------------------------------------------------------------------------
router.get('/', wrap(async (req, res) => {
  const { classId, status } = req.query;
  const quizzes = await prisma.quiz.findMany({
    where: {
      schoolId: req.schoolId,
      ...(classId && { classId: parseInt(classId) }),
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      class: { select: { id: true, name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });
  res.json({ success: true, data: quizzes });
}));

// ---------------------------------------------------------------------------
// POST /quizzes — create quiz with questions
// Body: { title, subject, classId, duration, dueDate, questions:[{questionText, optionA, optionB, optionC, optionD, correctOption, marks}] }
// ---------------------------------------------------------------------------
router.post('/', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can create quizzes.' });
  }
  const { title, subject, classId, duration, dueDate, questions } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'title is required.' });
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, message: 'questions[] array is required.' });
  }

  const quiz = await prisma.quiz.create({
    data: {
      schoolId: req.schoolId,
      title,
      subject: subject || null,
      classId: classId ? parseInt(classId) : null,
      duration: duration ? parseInt(duration) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'draft',
      createdBy: req.user?.id || null,
      questions: {
        create: questions.map((q, idx) => ({
          questionText: q.questionText,
          optionA: q.optionA || null,
          optionB: q.optionB || null,
          optionC: q.optionC || null,
          optionD: q.optionD || null,
          correctOption: q.correctOption || null,
          marks: q.marks ? parseFloat(q.marks) : 1,
          order: idx + 1,
        })),
      },
    },
    include: { questions: true },
  });
  res.status(201).json({ success: true, data: quiz });
}));

// ---------------------------------------------------------------------------
// GET /quizzes/student/:studentId — student's attempts across all quizzes
// (static route must come BEFORE /:id)
// ---------------------------------------------------------------------------
router.get('/student/:studentId', wrap(async (req, res) => {
  const studentId = parseInt(req.params.studentId);

  // Students can only see their own attempts; admin/teacher can see any
  if (isStudent(req.user?.role) && req.user?.studentId !== studentId) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId, quiz: { schoolId: req.schoolId } },
    include: {
      quiz: { select: { id: true, title: true, subject: true, status: true, totalMarks: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });
  res.json({ success: true, data: attempts });
}));

// ---------------------------------------------------------------------------
// GET /quizzes/:id — quiz with questions (hide correctOption for students)
// ---------------------------------------------------------------------------
router.get('/:id', wrap(async (req, res) => {
  const quizId = parseInt(req.params.id);
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, schoolId: req.schoolId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  // Hide correct answers from students
  if (isStudent(req.user?.role)) {
    quiz.questions = quiz.questions.map((q) => {
      const { correctOption, ...safeQ } = q;
      return safeQ;
    });
  }

  res.json({ success: true, data: quiz });
}));

// ---------------------------------------------------------------------------
// PUT /quizzes/:id — update quiz metadata + replace questions
// ---------------------------------------------------------------------------
router.put('/:id', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can update quizzes.' });
  }
  const quizId = parseInt(req.params.id);
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  const { title, subject, classId, duration, dueDate, questions } = req.body;

  // Use a transaction so metadata + question replacement are atomic
  const updated = await prisma.$transaction(async (tx) => {
    const updatedQuiz = await tx.quiz.update({
      where: { id: quizId },
      data: {
        ...(title !== undefined && { title }),
        ...(subject !== undefined && { subject }),
        ...(classId !== undefined && { classId: classId ? parseInt(classId) : null }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });

    if (Array.isArray(questions)) {
      // Replace all questions
      await tx.quizQuestion.deleteMany({ where: { quizId } });
      await tx.quizQuestion.createMany({
        data: questions.map((q, idx) => ({
          quizId,
          questionText: q.questionText,
          optionA: q.optionA || null,
          optionB: q.optionB || null,
          optionC: q.optionC || null,
          optionD: q.optionD || null,
          correctOption: q.correctOption || null,
          marks: q.marks ? parseFloat(q.marks) : 1,
          order: idx + 1,
        })),
      });
    }

    return tx.quiz.findFirst({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  });

  res.json({ success: true, data: updated });
}));

// ---------------------------------------------------------------------------
// DELETE /quizzes/:id — delete quiz (cascades to questions and attempts via schema)
// ---------------------------------------------------------------------------
router.delete('/:id', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can delete quizzes.' });
  }
  const quizId = parseInt(req.params.id);
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  // Explicit cascade in case schema onDelete is not configured
  await prisma.quizAttempt.deleteMany({ where: { quizId } });
  await prisma.quizQuestion.deleteMany({ where: { quizId } });
  await prisma.quiz.delete({ where: { id: quizId } });

  res.json({ success: true, message: 'Quiz deleted.' });
}));

// ---------------------------------------------------------------------------
// PUT /quizzes/:id/status — {status: active|closed|draft}
// ---------------------------------------------------------------------------
router.put('/:id/status', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can change quiz status.' });
  }
  const quizId = parseInt(req.params.id);
  const { status } = req.body;
  const validStatuses = ['active', 'closed', 'draft'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}.` });
  }

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: { status },
  });
  res.json({ success: true, data: updated });
}));

// ---------------------------------------------------------------------------
// POST /quizzes/:id/attempt — submit quiz attempt, calculate score
// Body: { answers: { questionId: chosenOption } }
// ---------------------------------------------------------------------------
router.post('/:id/attempt', wrap(async (req, res) => {
  const quizId = parseInt(req.params.id);
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, schoolId: req.schoolId },
    include: { questions: true },
  });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
  if (quiz.status !== 'active') {
    return res.status(400).json({ success: false, message: 'This quiz is not currently active.' });
  }

  const { answers } = req.body;
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ success: false, message: 'answers object is required. Format: { questionId: chosenOption }' });
  }

  // Determine student — from JWT (student portal) or explicit body field
  const studentId = req.user?.studentId || (req.body.studentId ? parseInt(req.body.studentId) : null);
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'studentId is required.' });
  }

  // Prevent duplicate attempt
  const existing = await prisma.quizAttempt.findFirst({ where: { quizId, studentId } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Student has already attempted this quiz.' });
  }

  // Calculate score
  let score = 0;
  let totalMarks = 0;
  const gradedAnswers = [];

  for (const q of quiz.questions) {
    const chosen = answers[String(q.id)] || null;
    const isCorrect = chosen !== null && chosen === q.correctOption;
    const marksAwarded = isCorrect ? (q.marks || 1) : 0;
    score += marksAwarded;
    totalMarks += q.marks || 1;
    gradedAnswers.push({
      questionId: q.id,
      chosenOption: chosen,
      correctOption: q.correctOption,
      isCorrect,
      marksAwarded,
    });
  }

  const percentage = totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(2)) : 0;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId,
      answers: answers,
      gradedAnswers: gradedAnswers,
      score,
      totalMarks,
      percentage,
      submittedAt: new Date(),
    },
  });

  res.status(201).json({
    success: true,
    data: attempt,
    message: `Quiz submitted. Score: ${score}/${totalMarks} (${percentage}%)`,
  });
}));

// ---------------------------------------------------------------------------
// GET /quizzes/:id/attempts — all attempts with student info (admin/teacher only)
// ---------------------------------------------------------------------------
router.get('/:id/attempts', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can view all attempts.' });
  }
  const quizId = parseInt(req.params.id);
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    include: {
      student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
    },
    orderBy: { score: 'desc' },
  });
  res.json({ success: true, data: attempts, quiz });
}));

module.exports = router;
