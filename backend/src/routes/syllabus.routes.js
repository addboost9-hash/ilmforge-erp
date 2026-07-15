const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Helper: parse units from SopDocument content
const parseUnits = (doc) => {
  try {
    const meta = JSON.parse(doc.category || '{}');
    const units = JSON.parse(doc.content || '[]');
    return { ...doc, units, classId: meta.classId, subjectId: meta.subjectId, academicYear: meta.academicYear, className: meta.className, subjectName: meta.subjectName };
  } catch {
    return { ...doc, units: [] };
  }
};

// GET /api/v1/syllabus — list syllabi
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, subjectId, academicYear } = req.query;

  const docs = await prisma.sopDocument.findMany({
    where: {
      schoolId,
      // Use sortOrder field as a syllabus marker (value 999 = syllabus)
      sortOrder: 999,
      ...(classId      && { title: { contains: `[c${classId}]` } }),
      ...(subjectId    && { title: { contains: `[s${subjectId}]` } }),
      ...(academicYear && { title: { contains: `[y${academicYear}]` } }),
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: docs.map(parseUnits) });
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
