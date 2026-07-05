const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const { search, page = 1, limit = 25 } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  const parents = await prisma.parent.findMany({ where: { schoolId: req.schoolId }, skip, take: parseInt(limit) });
  const total = await prisma.parent.count({ where: { schoolId: req.schoolId } });
  res.json({ success: true, data: parents, total });
}));

router.get('/stats', wrap(async (req, res) => {
  const total = await prisma.parent.count({ where: { schoolId: req.schoolId } });
  res.json({ success: true, data: { total } });
}));

module.exports = router;
