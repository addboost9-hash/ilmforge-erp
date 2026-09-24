const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// FIX: the Teacher Portal's "My Homework" list calls this with `createdBy`
// to see only the homework it posted, but that param was silently ignored —
// every teacher saw every teacher's homework merged together with no way to
// tell whose was whose.
router.get('/', wrap(async (req, res) => {
  const { classId, date, from, to, createdBy } = req.query;

  let dateFilter;

  if (date) {
    // Single-day filter
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    dateFilter = { gte: targetDate, lt: nextDay };
  } else if (from && to) {
    // Explicit range
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter = { gte: fromDate, lte: toDate };
  } else {
    // Default: last 14 days
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    dateFilter = { gte: start, lte: end };
  }

  const homework = await prisma.homeworkDiary.findMany({
    where: {
      schoolId: req.schoolId,
      ...(classId && { classId: parseInt(classId) }),
      ...(createdBy && { teacherId: parseInt(createdBy) }),
      date: dateFilter,
    },
    orderBy: { date: 'desc' },
  });

  res.json({ success: true, data: homework });
}));

router.post('/', wrap(async (req, res) => {
  const { classId, sectionId, subjectId, description, date } = req.body;
  if (!description) return res.status(400).json({ success: false, message: 'Description required.' });
  const hw = await prisma.homeworkDiary.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      classId:   classId   ? parseInt(classId)   : null,
      sectionId: sectionId ? parseInt(sectionId) : null,
      subjectId: subjectId ? parseInt(subjectId) : null,
      teacherId: req.user.id,
      description,
      date: date ? new Date(date) : new Date(),
    },
  });
  res.status(201).json({ success: true, data: hw });
}));

/* ── PUT /api/v1/homework/:id — edit posted homework ──
   Homework could be posted and deleted but never corrected, so fixing a typo
   or changing the due date meant deleting the entry (and any student
   submissions attached to it) and re-posting. Same ownership rule as delete. */
router.put('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.homeworkDiary.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Homework not found.' });

  const isOwner = existing.teacherId === req.user.id;
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'You can only edit homework you posted.' });
  }

  const { classId, sectionId, subjectId, description, date } = req.body;
  const hw = await prisma.homeworkDiary.update({
    where: { id },
    data: {
      ...(classId !== undefined && { classId: classId ? parseInt(classId) : null }),
      ...(sectionId !== undefined && { sectionId: sectionId ? parseInt(sectionId) : null }),
      ...(subjectId !== undefined && { subjectId: subjectId ? parseInt(subjectId) : null }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date: date ? new Date(date) : existing.date }),
    },
  });
  res.json({ success: true, data: hw, message: 'Homework updated.' });
}));

// DELETE /api/v1/homework/:id — the delete button in AcademicsPage/HomeworkDiaryPage
// called this but no such route existed, so removing a homework entry always 404'd.
router.delete('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.homeworkDiary.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Homework not found.' });
  const isOwner = existing.teacherId === req.user.id;
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'You can only delete homework you posted.' });
  }
  await prisma.homeworkDiary.delete({ where: { id } });
  res.json({ success: true, message: 'Homework deleted.' });
}));

// POST /api/v1/homework/:homeworkId/submit — student submits homework
router.post('/:homeworkId/submit', wrap(async (req, res) => {
  const { homeworkId } = req.params;
  const { content, fileUrl } = req.body;
  const userId = req.user?.id;
  const { schoolId } = req;

  // Verify the homework exists
  const hw = await prisma.homeworkDiary.findFirst({
    where: { id: parseInt(homeworkId), schoolId },
  });
  if (!hw) return res.status(404).json({ success: false, message: 'Homework not found.' });

  // Log the submission as a NotificationLog entry
  await prisma.notificationLog.create({
    data: {
      schoolId,
      type: 'homework_submission',
      recipientType: 'teacher',
      title: `Homework Submission: ${hw.description?.substring(0, 60) || 'Homework'}`,
      body: JSON.stringify({
        homeworkId: parseInt(homeworkId),
        studentUserId: userId,
        content: content || '',
        fileUrl: fileUrl || '',
        submittedAt: new Date().toISOString(),
      }),
      status: 'sent',
      sentAt: new Date(),
    },
  });

  res.json({ success: true, message: 'Homework submitted!' });
}));

// GET /api/v1/homework/:homeworkId/submissions — teacher sees all submissions
// No ownership check — GET is gated by PM canView, and parents/students also
// have canView on the homework module, so any student could view every other
// student's submission content/fileUrl for a homework item, and any teacher
// (not just the one who assigned it) could see submissions for classes they
// don't teach. Restrict to staff, and to the assigned teacher unless admin.
router.get('/:homeworkId/submissions', wrap(async (req, res) => {
  const { homeworkId } = req.params;
  const { schoolId } = req;

  const hw = await prisma.homeworkDiary.findFirst({
    where: { id: parseInt(homeworkId), schoolId },
  });
  if (!hw) return res.status(404).json({ success: false, message: 'Homework not found.' });

  const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
  const isOwnerTeacher = req.user?.role === 'teacher' && hw.teacherId === req.user.id;
  if (!isAdmin && !isOwnerTeacher) {
    return res.status(403).json({ success: false, message: 'You can only view submissions for homework you assigned.' });
  }

  const submissions = await prisma.notificationLog.findMany({
    where: {
      schoolId,
      type: 'homework_submission',
      title: { contains: 'Homework Submission' },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter to those matching this homeworkId
  const filtered = submissions.filter(s => {
    try {
      const parsed = JSON.parse(s.body || '{}');
      return parsed.homeworkId === parseInt(homeworkId);
    } catch { return false; }
  }).map(s => {
    try {
      return { ...s, submission: JSON.parse(s.body || '{}') };
    } catch { return s; }
  });

  res.json({ success: true, data: filtered });
}));

module.exports = router;

