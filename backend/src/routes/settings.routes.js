const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/school', wrap(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.schoolId }, include: { campuses: true } });
  res.json({ success: true, data: school });
}));

router.put('/school', wrap(async (req, res) => {
  const allowed = ['name','address','city','phone','email','logoUrl','subdomain'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  const school = await prisma.school.update({ where: { id: req.schoolId }, data });
  res.json({ success: true, data: school });
}));

router.get('/sessions', wrap(async (req, res) => {
  const sessions = await prisma.academicSession.findMany({ where: { schoolId: req.schoolId }, orderBy: { startDate: 'desc' } });
  res.json({ success: true, data: sessions });
}));

router.post('/sessions', wrap(async (req, res) => {
  const { name, startDate, endDate, isActive } = req.body;
  if (isActive) await prisma.academicSession.updateMany({ where: { schoolId: req.schoolId }, data: { isActive: false } });
  const session = await prisma.academicSession.create({ data: { schoolId: req.schoolId, name, startDate: new Date(startDate), endDate: new Date(endDate), isActive: isActive || false } });
  res.status(201).json({ success: true, data: session });
}));

module.exports = router;
