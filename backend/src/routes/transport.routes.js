const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const routes = await prisma.transportRoute.findMany({ where: { schoolId: req.schoolId }, orderBy: { name: 'asc' } });
  res.json({ success: true, data: routes });
}));
router.post('/', wrap(async (req, res) => {
  const { name, vehicleNo, driverName, driverPhone, monthlyFee } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Route name required.' });
  const route = await prisma.transportRoute.create({ data: { schoolId: req.schoolId, campusId: req.campusId, name, vehicleNo, driverName, driverPhone, monthlyFee: parseInt(monthlyFee)||0 } });
  res.status(201).json({ success: true, data: route });
}));
/* ── PUT /:id — edit a transport route ──
   Routes could only be created or deleted, so changing a vehicle, driver or
   the monthly fee meant deleting the route and losing its student links. */
router.put('/:id', wrap(async (req, res) => {
  const routeId = parseInt(req.params.id);
  const existing = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Route not found.' });

  const { name, vehicleNo, driverName, driverPhone, monthlyFee } = req.body;
  const route = await prisma.transportRoute.update({
    where: { id: routeId },
    data: {
      ...(name !== undefined && { name }),
      ...(vehicleNo !== undefined && { vehicleNo: vehicleNo || null }),
      ...(driverName !== undefined && { driverName: driverName || null }),
      ...(driverPhone !== undefined && { driverPhone: driverPhone || null }),
      ...(monthlyFee !== undefined && { monthlyFee: parseInt(monthlyFee) || 0 }),
    },
  });
  res.json({ success: true, data: route, message: 'Route updated.' });
}));

router.delete('/:id', wrap(async (req, res) => {
  const routeId = parseInt(req.params.id);
  const existing = await prisma.transportRoute.findFirst({ where: { id: routeId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Route not found.' });
  await prisma.transportRoute.delete({ where: { id: routeId } });
  res.json({ success: true, message: 'Route deleted.' });
}));
module.exports = router;
