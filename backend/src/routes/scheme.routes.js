const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET / - list schemes of study
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId } = req.query;

  // SopDocument has schoolId (nullable), title, category, content, sortOrder
  const where = {
    OR: [{ schoolId }, { schoolId: null }],
    category: 'scheme_of_study',
  };

  const docs = await prisma.sopDocument.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const classes  = await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const subjects = await prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true } });
  const classMap   = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  let result = docs.map(d => {
    let meta = {};
    let months = [];
    try { const parsed = JSON.parse(d.content); meta = parsed.meta || {}; months = parsed.months || []; } catch { meta = {}; months = []; }
    return { ...d, meta, months, className: meta.classId ? classMap[meta.classId] : null, subjectName: meta.subjectId ? subjectMap[meta.subjectId] : null };
  });

  if (classId)   result = result.filter(r => String(r.meta?.classId) === String(classId));
  if (subjectId) result = result.filter(r => String(r.meta?.subjectId) === String(subjectId));

  res.json({ success: true, data: result });
}));

// POST / - create scheme
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId, title, academicYear, months } = req.body;

  if (!title) return res.status(400).json({ success: false, message: 'title required.' });

  const content = JSON.stringify({
    meta: { classId: classId ? parseInt(classId) : null, subjectId: subjectId ? parseInt(subjectId) : null, academicYear },
    months: months || [],
  });

  const doc = await prisma.sopDocument.create({
    data: {
      schoolId,
      title,
      category: 'scheme_of_study',
      content,
    },
  });

  res.status(201).json({ success: true, data: doc });
}));

// GET /:id - single
router.get('/:id', wrap(async (req, res) => {
  const doc = await prisma.sopDocument.findFirst({
    where: { id: parseInt(req.params.id), category: 'scheme_of_study' },
  });
  if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });

  let meta = {};
  let months = [];
  try { const parsed = JSON.parse(doc.content); meta = parsed.meta || {}; months = parsed.months || []; } catch { meta = {}; months = []; }

  res.json({ success: true, data: { ...doc, meta, months } });
}));

// PUT /:id - update
router.put('/:id', wrap(async (req, res) => {
  const existing = await prisma.sopDocument.findFirst({ where: { id: parseInt(req.params.id), category: 'scheme_of_study' } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });

  const { classId, subjectId, title, academicYear, months } = req.body;

  let currentMeta = {};
  try { currentMeta = JSON.parse(existing.content)?.meta || {}; } catch { currentMeta = {}; }

  const content = JSON.stringify({
    meta: {
      classId:     classId    !== undefined ? (classId    ? parseInt(classId)    : null) : currentMeta.classId,
      subjectId:   subjectId  !== undefined ? (subjectId  ? parseInt(subjectId)  : null) : currentMeta.subjectId,
      academicYear: academicYear !== undefined ? academicYear : currentMeta.academicYear,
    },
    months: months || [],
  });

  const updated = await prisma.sopDocument.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(title && { title }),
      content,
    },
  });

  res.json({ success: true, data: updated });
}));

// DELETE /:id
router.delete('/:id', wrap(async (req, res) => {
  const existing = await prisma.sopDocument.findFirst({ where: { id: parseInt(req.params.id), category: 'scheme_of_study' } });
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
  await prisma.sopDocument.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Deleted.' });
}));

module.exports = router;
