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

router.delete('/:id', wrap(async (req, res) => {
  if (!['admin','super_admin','teacher'].includes(req.user.role)) return res.status(403).json({ success: false });
  await prisma.studyMaterial.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
  res.json({ success: true });
}));

module.exports = router;
