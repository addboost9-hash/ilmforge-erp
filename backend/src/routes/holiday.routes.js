const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/holidays?year=
router.get('/', wrap(async (req, res) => {
  const { year } = req.query;
  const where = { schoolId: req.schoolId };
  if (year) {
    const y = parseInt(year);
    where.startDate = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }
  const data = await prisma.holidayEvent.findMany({ where, orderBy: { startDate: 'asc' } });
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins only.' });
  const { title, eventType, startDate, endDate, color, notes } = req.body;
  if (!title || !startDate) return res.status(400).json({ success: false, message: 'title and startDate required.' });
  const event = await prisma.holidayEvent.create({
    data: {
      schoolId: req.schoolId, title, eventType: eventType || 'holiday',
      startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null,
      color: color || '#E24B4A', notes,
    },
  });
  res.status(201).json({ success: true, data: event });
}));

router.put('/:id', wrap(async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins only.' });
  const existing = await prisma.holidayEvent.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Event not found.' });
  const { title, eventType, startDate, endDate, color, notes } = req.body;
  const event = await prisma.holidayEvent.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined && { title }),
      ...(eventType !== undefined && { eventType }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(color !== undefined && { color }),
      ...(notes !== undefined && { notes }),
    },
  });
  res.json({ success: true, data: event });
}));

router.delete('/:id', wrap(async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins only.' });
  const existing = await prisma.holidayEvent.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Event not found.' });
  await prisma.holidayEvent.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Event deleted.' });
}));

module.exports = router;
