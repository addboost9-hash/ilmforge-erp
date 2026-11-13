const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { teacherCanAccessClass } = require('../utils/teacherScope');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* A syllabus is kept as a SopDocument (sortOrder 999), its ids written into
   the title as [c<class>][s<subject>][y<year>][e<exam>] for filtering, its
   details (class, subject, exam, notes) in category, its units in content.
   A syllabus for one exam (the Exam Vault's Syllabus step) has the exam's
   id and its units are chapters: title = chapter, content = topics/pages. */
const parseUnits = (doc) => {
  try {
    const meta = JSON.parse(doc.category || '{}');
    const units = JSON.parse(doc.content || '[]');
    return {
      ...doc, units, classId: meta.classId, subjectId: meta.subjectId, academicYear: meta.academicYear,
      className: meta.className, subjectName: meta.subjectName, examId: meta.examId || null,
      notes: meta.notes || '', format: meta.format || 'html',
    };
  } catch {
    return { ...doc, units: [] };
  }
};
const clip = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

// GET /api/v1/syllabus — list syllabi
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId, academicYear, examId } = req.query;
  const num = (v) => (/^\d+$/.test(String(v || '')) ? String(v) : null);
  // Each marker its own condition: written as one object they replaced each
  // other, so class and subject together filtered by the subject only.
  const marks = [
    num(classId) && `[c${num(classId)}]`,
    num(subjectId) && `[s${num(subjectId)}]`,
    academicYear && `[y${String(academicYear).slice(0, 20)}]`,
    num(examId) && `[e${num(examId)}]`,
  ].filter(Boolean);

  const docs = await prisma.sopDocument.findMany({
    where: {
      schoolId,
      // Use sortOrder field as a syllabus marker (value 999 = syllabus)
      sortOrder: 999,
      ...(marks.length && { AND: marks.map((m) => ({ title: { contains: m } })) }),
    },
    orderBy: { createdAt: 'desc' },
  });
  // ?general=1: the class syllabus only, not the ones written for an exam.
  const list = docs.map(parseUnits).filter((d) => req.query.general !== '1' || !d.examId);

  res.json({ success: true, data: list });
}));

// POST /api/v1/syllabus — create syllabus
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId, title, academicYear, units, className, subjectName } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'title is required.' });

  const meta = JSON.stringify({ classId, subjectId, academicYear, className, subjectName });
  const unitsData = JSON.stringify(units || []);

  // Embed ids in title for filtering
  const docTitle = `${title} [c${classId || '0'}][s${subjectId || '0'}][y${academicYear || ''}]`;

  const doc = await prisma.sopDocument.create({
    data: {
      schoolId,
      title: docTitle,
      category: meta,
      content: unitsData,
      sortOrder: 999,
    },
  });

  res.status(201).json({ success: true, data: parseUnits(doc) });
}));

// PUT /api/v1/syllabus/plan — the syllabus of one subject for one exam,
// as chapters: { examId, classId, subjectId, chapters: [{ title, details }], notes }.
// Written over what was there; nothing written means removed.
router.put('/plan', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = (v) => (/^\d+$/.test(String(v ?? '')) ? parseInt(v) : null);
  const examId = id(req.body?.examId);
  const classId = id(req.body?.classId);
  const subjectId = id(req.body?.subjectId);
  if (!examId || !classId || !subjectId) return res.status(400).json({ success: false, message: 'Choose the exam, the class and the subject.' });
  const [exam, cls, sub] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, schoolId }, select: { id: true, title: true } }),
    prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true, name: true } }),
    prisma.subject.findFirst({ where: { id: subjectId, schoolId }, select: { id: true, name: true, classId: true } }),
  ]);
  if (!exam) return res.status(404).json({ success: false, message: 'That exam no longer exists.' });
  if (!cls) return res.status(404).json({ success: false, message: 'Choose a class from the list.' });
  if (!sub || sub.classId !== classId) return res.status(400).json({ success: false, message: 'That subject is not taught in this class.' });
  if (!(await teacherCanAccessClass(req, classId))) return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });

  const raw = Array.isArray(req.body?.chapters) ? req.body.chapters : [];
  if (raw.length > 100) return res.status(400).json({ success: false, message: 'A syllabus can have at most 100 chapters.' });
  const chapters = raw.map((c) => ({ title: clip(c?.title, 200), details: clip(c?.details, 1000) })).filter((c) => c.title || c.details);
  const notes = clip(req.body?.notes, 3000);

  const marker = `[c${classId}][s${subjectId}]`;
  const existing = (await prisma.sopDocument.findMany({ where: { schoolId, sortOrder: 999, title: { contains: marker } } }))
    .find((d) => d.title.includes(`[e${examId}]`));

  if (!chapters.length && !notes) {
    if (existing) await prisma.sopDocument.delete({ where: { id: existing.id } });
    return res.json({ success: true, data: null, message: `${sub.name}: syllabus removed.` });
  }

  // A chapter keeps its "taught" tick when it is still there.
  let before = [];
  try { before = JSON.parse(existing?.content || '[]'); } catch { before = []; }
  const units = chapters.map((c, i) => ({
    unitNo: i + 1, title: c.title, content: c.details,
    completed: !!before.find((u) => u.title === c.title && u.completed),
  }));
  const data = {
    title: `${exam.title} — ${cls.name} — ${sub.name} ${marker}[y][e${examId}]`,
    category: JSON.stringify({ classId, subjectId, examId, className: cls.name, subjectName: sub.name, notes, format: 'chapters' }),
    content: JSON.stringify(units),
  };
  const doc = existing
    ? await prisma.sopDocument.update({ where: { id: existing.id }, data })
    : await prisma.sopDocument.create({ data: { schoolId, sortOrder: 999, ...data } });
  res.json({ success: true, data: parseUnits(doc), message: `${sub.name}: syllabus saved.` });
}));

// GET /api/v1/syllabus/by-class/:classId — all syllabi for a class
router.get('/by-class/:classId', wrap(async (req, res) => {
  const { schoolId } = req;
  const classId = req.params.classId;

  const docs = await prisma.sopDocument.findMany({
    where: {
      schoolId,
      sortOrder: 999,
      title: { contains: `[c${classId}]` },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: docs.map(parseUnits) });
}));

// GET /api/v1/syllabus/:id — single syllabus
router.get('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);

  const doc = await prisma.sopDocument.findFirst({ where: { id, schoolId } });
  if (!doc) return res.status(404).json({ success: false, message: 'Syllabus not found.' });

  res.json({ success: true, data: parseUnits(doc) });
}));

// PUT /api/v1/syllabus/:id — update syllabus
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const { title, academicYear, units, classId, subjectId, className, subjectName } = req.body;

  const existing = await prisma.sopDocument.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Syllabus not found.' });

  const meta = JSON.stringify({ classId, subjectId, academicYear, className, subjectName });
  const unitsData = JSON.stringify(units || []);
  const docTitle = title
    ? `${title} [c${classId || '0'}][s${subjectId || '0'}][y${academicYear || ''}]`
    : existing.title;

  const updated = await prisma.sopDocument.update({
    where: { id },
    data: {
      title:    docTitle,
      category: meta,
      content:  unitsData,
    },
  });

  res.json({ success: true, data: parseUnits(updated) });
}));

// DELETE /api/v1/syllabus/:id
router.delete('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);

  const existing = await prisma.sopDocument.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Syllabus not found.' });

  await prisma.sopDocument.delete({ where: { id } });
  res.json({ success: true, message: 'Syllabus deleted.' });
}));

// PATCH /api/v1/syllabus/:id/unit/:unitNo/complete — toggle unit completion
router.patch('/:id/unit/:unitNo/complete', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const unitNo = parseInt(req.params.unitNo);

  const doc = await prisma.sopDocument.findFirst({ where: { id, schoolId } });
  if (!doc) return res.status(404).json({ success: false, message: 'Syllabus not found.' });

  let units = [];
  try { units = JSON.parse(doc.content || '[]'); } catch { units = []; }

  const idx = units.findIndex(u => u.unitNo === unitNo);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Unit not found.' });

  units[idx].completed = !units[idx].completed;

  const updated = await prisma.sopDocument.update({
    where: { id },
    data: { content: JSON.stringify(units) },
  });

  res.json({ success: true, data: parseUnits(updated) });
}));

module.exports = router;
