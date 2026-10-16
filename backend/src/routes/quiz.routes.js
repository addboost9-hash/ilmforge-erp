const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const canManageQuizzes = (role) => ['super_admin', 'admin', 'principal', 'teacher'].includes(role);
const isStudent = (role) => role === 'student';
const LETTERS = ['A', 'B', 'C', 'D'];

/* A question as the quiz page shows it: the text as `q`, the filled-in
   options as `options`, and for staff the right option as `answer` (its
   position in `options`). Stored as questionText / optionA..D /
   correctOption ('A'..'D'). The page and this API used different shapes,
   so students saw blank questions and every answer scored 0. */
function presentQuestion(q, { withAnswer }) {
  const letters = LETTERS.filter((l) => q[`option${l}`] != null && q[`option${l}`] !== '');
  const out = {
    id: q.id, order: q.order, marks: q.marks || 1,
    q: q.questionText, questionText: q.questionText,
    options: letters.map((l) => q[`option${l}`]),
  };
  if (withAnswer) {
    out.correctOption = q.correctOption;
    out.answer = q.correctOption ? letters.indexOf(q.correctOption) : null;
  }
  return out;
}

/* What the quiz builder posts ({ q, options: [4], answer: index }) or the
   stored shape ({ questionText, optionA..D, correctOption }). */
function toQuestionData(q, idx) {
  const opts = Array.isArray(q.options) ? q.options : [];
  const answerLetter = q.correctOption || (Number.isInteger(q.answer) ? LETTERS[q.answer] : null);
  return {
    questionText: String(q.questionText || q.q || q.question || q.text || '').trim(),
    optionA: q.optionA ?? opts[0] ?? null,
    optionB: q.optionB ?? opts[1] ?? null,
    optionC: q.optionC ?? opts[2] ?? null,
    optionD: q.optionD ?? opts[3] ?? null,
    correctOption: answerLetter,
    marks: q.marks ? Math.max(1, parseInt(q.marks, 10) || 1) : 1,
    order: idx + 1,
  };
}

function checkQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return 'Add at least one question.';
  for (const [i, q] of questions.map(toQuestionData).entries()) {
    if (!q.questionText) return `Question ${i + 1} has no text.`;
    const filled = LETTERS.filter((l) => q[`option${l}`] != null && String(q[`option${l}`]).trim() !== '');
    if (filled.length < 2) return `Question ${i + 1} needs at least two options.`;
    if (!q.correctOption || !filled.includes(q.correctOption)) return `Question ${i + 1}: choose which option is right.`;
  }
  return null;
}

/* The class a quiz is for: an id, or (from the builder) the class name. */
async function resolveClassId(schoolId, body) {
  if (body.classId) return parseInt(body.classId, 10) || null;
  const name = String(body.class || '').trim();
  if (!name) return null;
  if (/^\d+$/.test(name)) return parseInt(name, 10);
  // Compared in code: SQLite's = minds capitals, PostgreSQL's insensitive
  // mode does not, so "class 5" was found online and not on the desktop.
  const want = String(name).trim().replace(/\s+/g, ' ').toLowerCase();
  const cls = (await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } }))
    .find((c) => c.name.trim().replace(/\s+/g, ' ').toLowerCase() === want);
  return cls?.id || null;
}

const ownStudent = (req) => prisma.student.findFirst({
  where: { schoolId: req.schoolId, userId: req.user.id, deletedAt: null },
  select: { id: true, classId: true },
});

// ---------------------------------------------------------------------------
// GET /quizzes?classId=&status= — list quizzes for school. A student sees
// the active quizzes for their class, each with whether they have done it.
// ---------------------------------------------------------------------------
router.get('/', wrap(async (req, res) => {
  const { classId, status } = req.query;
  let me = null;
  if (isStudent(req.user?.role)) {
    me = await ownStudent(req);
    if (!me) return res.json({ success: true, data: [] });
  }
  const quizzes = await prisma.quiz.findMany({
    where: {
      schoolId: req.schoolId,
      ...(me
        ? { status: 'active', OR: [{ classId: me.classId }, { classId: null }] }
        : { ...(classId && { classId: parseInt(classId, 10) }), ...(status && { status }) }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      class: { select: { id: true, name: true } },
      questions: { select: { id: true, marks: true } },
      _count: { select: { attempts: true } },
      ...(me && { attempts: { where: { studentId: me.id }, select: { score: true, percentage: true, submittedAt: true } } }),
    },
  });
  const data = quizzes.map((q) => {
    const mine = me ? q.attempts?.[0] : null;
    return {
      ...q,
      attempts: q._count.attempts,
      attemptCount: q._count.attempts,
      class: q.class?.name || null,
      totalMarks: q.questions.reduce((a, x) => a + (x.marks || 1), 0),
      ...(me && { attempted: !!mine, myScore: mine?.score ?? null, myPercentage: mine?.percentage ?? null }),
    };
  });
  res.json({ success: true, data });
}));

// ---------------------------------------------------------------------------
// POST /quizzes — create quiz with questions
// ---------------------------------------------------------------------------
router.post('/', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can create quizzes.' });
  }
  const { title, subject, duration, dueDate, questions } = req.body;
  if (!String(title || '').trim()) return res.status(400).json({ success: false, message: 'Give the quiz a title.' });
  const problem = checkQuestions(questions);
  if (problem) return res.status(400).json({ success: false, message: problem });
  const classId = await resolveClassId(req.schoolId, req.body);
  if (classId && !(await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId }, select: { id: true } }))) {
    return res.status(400).json({ success: false, message: 'That class was not found.' });
  }

  const quiz = await prisma.quiz.create({
    data: {
      schoolId: req.schoolId,
      title: String(title).trim(),
      subject: subject || null,
      classId,
      duration: duration ? parseInt(duration, 10) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'draft',
      createdBy: req.user?.id || null,
      questions: { create: questions.map(toQuestionData) },
    },
    include: { questions: true },
  });
  res.status(201).json({ success: true, data: quiz });
}));

// ---------------------------------------------------------------------------
// GET /quizzes/student/:studentId — a student's attempts across all quizzes
// (static route must come BEFORE /:id)
// ---------------------------------------------------------------------------
router.get('/student/:studentId', wrap(async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const role = req.user?.role;
  // A student sees their own attempts and a parent their children's; the
  // check used req.user.studentId, which no sign-in carries, so a student
  // was always refused.
  if (isStudent(role)) {
    const me = await ownStudent(req);
    if (!me || me.id !== studentId) return res.status(403).json({ success: false, message: 'Access denied.' });
  } else if (role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId: req.schoolId, userId: req.user.id }, select: { id: true } });
    const link = parent && await prisma.parentStudent.findFirst({ where: { schoolId: req.schoolId, parentId: parent.id, studentId } });
    if (!link) return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId, quiz: { schoolId: req.schoolId } },
    include: {
      quiz: { select: { id: true, title: true, subject: true, status: true, questions: { select: { marks: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });
  const data = attempts.map(({ answers, ...a }) => ({
    ...a,
    totalMarks: a.quiz.questions.reduce((s, q) => s + (q.marks || 1), 0),
    quiz: { id: a.quiz.id, title: a.quiz.title, subject: a.quiz.subject, status: a.quiz.status },
  }));
  res.json({ success: true, data });
}));

// ---------------------------------------------------------------------------
// GET /quizzes/:id — quiz with questions (no answers for students; a
// student only gets an active quiz of their class)
// ---------------------------------------------------------------------------
router.get('/:id', wrap(async (req, res) => {
  const quizId = parseInt(req.params.id, 10);
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, schoolId: req.schoolId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
  const student = isStudent(req.user?.role);
  if (student) {
    const me = await ownStudent(req);
    if (!me || quiz.status !== 'active' || (quiz.classId && quiz.classId !== me.classId)) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }
  }
  const questions = quiz.questions.map((q) => presentQuestion(q, { withAnswer: !student && canManageQuizzes(req.user?.role) }));
  res.json({
    success: true,
    data: { ...quiz, class: quiz.class?.name || null, questions, totalMarks: questions.reduce((a, q) => a + q.marks, 0) },
  });
}));

// ---------------------------------------------------------------------------
// PUT /quizzes/:id — update quiz details and replace questions
// ---------------------------------------------------------------------------
router.put('/:id', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can update quizzes.' });
  }
  const quizId = parseInt(req.params.id, 10);
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  const { title, subject, duration, dueDate, questions } = req.body;
  if (Array.isArray(questions)) {
    const problem = checkQuestions(questions);
    if (problem) return res.status(400).json({ success: false, message: problem });
    // Changing the questions after students have answered would make their
    // scores meaningless.
    if (await prisma.quizAttempt.count({ where: { quizId } })) {
      return res.status(409).json({ success: false, message: 'Students have already taken this quiz, so its questions can no longer be changed. Make a new quiz instead.' });
    }
  }
  const classChanged = req.body.classId !== undefined || req.body.class !== undefined;
  const classId = classChanged ? await resolveClassId(req.schoolId, req.body) : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quiz.update({
      where: { id: quizId },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(subject !== undefined && { subject }),
        ...(classChanged && { classId }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration, 10) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
    if (Array.isArray(questions)) {
      await tx.quizQuestion.deleteMany({ where: { quizId } });
      await tx.quizQuestion.createMany({ data: questions.map((q, idx) => ({ quizId, ...toQuestionData(q, idx) })) });
    }
    return tx.quiz.findFirst({ where: { id: quizId }, include: { questions: { orderBy: { order: 'asc' } } } });
  });

  res.json({ success: true, data: updated });
}));

// ---------------------------------------------------------------------------
// DELETE /quizzes/:id — delete quiz with its questions and attempts
// ---------------------------------------------------------------------------
router.delete('/:id', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can delete quizzes.' });
  }
  const quizId = parseInt(req.params.id, 10);
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  await prisma.$transaction([
    prisma.quizAttempt.deleteMany({ where: { quizId } }),
    prisma.quizQuestion.deleteMany({ where: { quizId } }),
    prisma.quiz.delete({ where: { id: quizId } }),
  ]);
  res.json({ success: true, message: 'Quiz deleted.' });
}));

// ---------------------------------------------------------------------------
// PUT /quizzes/:id/status — {status: active|closed|draft}
// ---------------------------------------------------------------------------
router.put('/:id/status', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can change quiz status.' });
  }
  const quizId = parseInt(req.params.id, 10);
  const { status } = req.body;
  const validStatuses = ['active', 'closed', 'draft'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}.` });
  }

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

  const updated = await prisma.quiz.update({ where: { id: quizId }, data: { status } });
  res.json({ success: true, data: updated });
}));

// ---------------------------------------------------------------------------
// POST /quizzes/:id/attempt — submit an attempt and score it
// Body: { answers } as either
//   [{ questionIndex | questionId, selectedOption: index }]   (the quiz page)
//   { [questionId]: 'A'..'D' }
// ---------------------------------------------------------------------------
router.post('/:id/attempt', wrap(async (req, res) => {
  const quizId = parseInt(req.params.id, 10);
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, schoolId: req.schoolId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
  if (quiz.status !== 'active') {
    return res.status(400).json({ success: false, message: 'This quiz is not open.' });
  }
  if (quiz.dueDate && new Date(quiz.dueDate).getTime() + 24 * 3600 * 1000 < Date.now()) {
    return res.status(400).json({ success: false, message: 'This quiz has closed.' });
  }

  const { answers } = req.body;
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ success: false, message: 'No answers were sent.' });
  }

  // A student answers for themselves (found from their sign-in); only staff
  // may record an attempt for a named student of this school.
  let studentId;
  if (isStudent(req.user?.role)) {
    const own = await ownStudent(req);
    if (!own) return res.status(403).json({ success: false, message: 'No student record linked to this account.' });
    if (quiz.classId && quiz.classId !== own.classId) return res.status(403).json({ success: false, message: 'This quiz is for another class.' });
    studentId = own.id;
  } else if (canManageQuizzes(req.user?.role)) {
    studentId = req.body.studentId ? parseInt(req.body.studentId, 10) : null;
  } else {
    return res.status(403).json({ success: false, message: 'Only students may submit quiz attempts.' });
  }
  if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required.' });
  const targetStudent = await prisma.student.findFirst({ where: { id: studentId, schoolId: req.schoolId, deletedAt: null } });
  if (!targetStudent) return res.status(404).json({ success: false, message: 'Student not found.' });

  if (await prisma.quizAttempt.findFirst({ where: { quizId, studentId } })) {
    return res.status(409).json({ success: false, message: 'This quiz has already been submitted.' });
  }

  // The chosen letter for each question, whichever shape was sent.
  const chosenFor = new Map();
  if (Array.isArray(answers)) {
    for (const a of answers) {
      const q = a.questionId != null ? quiz.questions.find((x) => x.id === parseInt(a.questionId, 10)) : quiz.questions[a.questionIndex];
      if (!q || a.selectedOption == null) continue;
      const letters = LETTERS.filter((l) => q[`option${l}`] != null && q[`option${l}`] !== '');
      const letter = typeof a.selectedOption === 'string' && LETTERS.includes(a.selectedOption) ? a.selectedOption : letters[a.selectedOption];
      if (letter) chosenFor.set(q.id, letter);
    }
  } else {
    for (const [qid, letter] of Object.entries(answers)) if (LETTERS.includes(letter)) chosenFor.set(parseInt(qid, 10), letter);
  }

  let score = 0;
  let totalMarks = 0;
  const graded = quiz.questions.map((q) => {
    const chosen = chosenFor.get(q.id) || null;
    const isCorrect = !!chosen && chosen === q.correctOption;
    const marks = q.marks || 1;
    totalMarks += marks;
    if (isCorrect) score += marks;
    return { questionId: q.id, chosenOption: chosen, correctOption: q.correctOption, isCorrect, marksAwarded: isCorrect ? marks : 0 };
  });
  const percentage = totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(2)) : 0;

  // answers is a text column: the chosen and graded answers are kept as JSON.
  const attempt = await prisma.quizAttempt.create({
    data: { quizId, studentId, answers: JSON.stringify(graded), score, percentage, submittedAt: new Date() },
  });

  res.status(201).json({
    success: true,
    data: { ...attempt, answers: graded, totalMarks },
    message: `Quiz submitted. Score: ${score}/${totalMarks} (${percentage}%)`,
  });
}));

// ---------------------------------------------------------------------------
// GET /quizzes/:id/attempts — all attempts with student info (admin/teacher)
// ---------------------------------------------------------------------------
router.get('/:id/attempts', wrap(async (req, res) => {
  if (!canManageQuizzes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin/teacher can view all attempts.' });
  }
  const quizId = parseInt(req.params.id, 10);
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, schoolId: req.schoolId }, include: { questions: { select: { marks: true } } } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
  const totalMarks = quiz.questions.reduce((a, q) => a + (q.marks || 1), 0);

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    include: { student: { select: { id: true, name: true, rollNo: true } } },
    orderBy: { score: 'desc' },
  });
  res.json({ success: true, data: attempts.map(({ answers, ...a }) => ({ ...a, totalMarks })), quiz: { ...quiz, questions: undefined, totalMarks } });
}));

module.exports = router;
