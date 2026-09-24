const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { classId, subjectId } = req.query;
  const data = await prisma.studyMaterial.findMany({
    where: {
      schoolId: req.schoolId, isActive: true,
      ...(classId && { classId: parseInt(classId) }),
      ...(subjectId && { subjectId: parseInt(subjectId) }),
    },
    orderBy: { createdAt: 'desc' }, take: 100,
  });
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  if (!['admin','super_admin','teacher'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Teachers/admins only.' });
  const { classId, sectionId, subjectId, title, description, fileType, fileUrl } = req.body;
  if (!title || !fileUrl) return res.status(400).json({ success: false, message: 'Title and URL required.' });
  const material = await prisma.studyMaterial.create({
    data: {
      schoolId: req.schoolId,
      classId: classId ? parseInt(classId) : null,
      sectionId: sectionId ? parseInt(sectionId) : null,
      subjectId: subjectId ? parseInt(subjectId) : null,
      teacherId: req.user.role === 'teacher' ? req.user.id : null,
      title, description, fileType: fileType || 'link', fileUrl,
    }
  });
  res.status(201).json({ success: true, data: material });
}));

/* ── PUT /:id — edit study material ──
   Material could be uploaded and removed but never corrected — a wrong link
   or title meant deleting and re-uploading. Same ownership rule as delete:
   admins, or the teacher who uploaded it. */
router.put('/:id', wrap(async (req, res) => {
  if (!['admin','super_admin','teacher'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Teachers/admins only.' });
  const existing = await prisma.studyMaterial.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Material not found.' });

  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  const isOwnerTeacher = req.user.role === 'teacher' && existing.teacherId === req.user.id;
  if (!isAdmin && !isOwnerTeacher) {
    return res.status(403).json({ success: false, message: 'You can only edit your own study material.' });
  }

  const { classId, sectionId, subjectId, title, description, fileType, fileUrl, isActive } = req.body;
  const material = await prisma.studyMaterial.update({
    where: { id: existing.id },
    data: {
      ...(classId !== undefined && { classId: classId ? parseInt(classId) : null }),
      ...(sectionId !== undefined && { sectionId: sectionId ? parseInt(sectionId) : null }),
      ...(subjectId !== undefined && { subjectId: subjectId ? parseInt(subjectId) : null }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(fileType !== undefined && { fileType }),
      ...(fileUrl !== undefined && { fileUrl }),
      ...(isActive !== undefined && { isActive: !!isActive }),
    },
  });
  res.json({ success: true, data: material, message: 'Material updated.' });
}));

// IDOR: update was not scoped by schoolId — cross-tenant deactivation by id.
// No ownership check either — any teacher could deactivate any other
// teacher's material; only admins or the uploading teacher may do so now.
router.delete('/:id', wrap(async (req, res) => {
  if (!['admin','super_admin','teacher'].includes(req.user.role)) return res.status(403).json({ success: false });
  const existing = await prisma.studyMaterial.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Material not found.' });
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  const isOwnerTeacher = req.user.role === 'teacher' && existing.teacherId === req.user.id;
  if (!isAdmin && !isOwnerTeacher) {
    return res.status(403).json({ success: false, message: 'You can only remove your own study material.' });
  }
  await prisma.studyMaterial.update({ where: { id: existing.id }, data: { isActive: false } });
  res.json({ success: true });
}));

module.exports = router;
