const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const routes = await prisma.transportRoute.findMany({ where: { schoolId: req.schoolId }, orderBy: { name: 'asc' } });
  res.json({ success: true, data: routes });
}));
router.post('/', wrap(async (req, res) => {
  const { name, vehicleNo, driverName, monthlyFee } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Route name required.' });
  const route = await prisma.transportRoute.create({ data: { schoolId: req.schoolId, campusId: req.campusId, name, vehicleNo, driverName, monthlyFee: parseInt(monthlyFee)||0 } });
  res.status(201).json({ success: true, data: route });
}));
router.delete('/:id', wrap(async (req, res) => {
  await prisma.transportRoute.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Route deleted.' });
}));
module.exports = router;
