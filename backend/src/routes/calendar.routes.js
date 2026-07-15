const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /events - combined events + holidays in date range
router.get('/events', wrap(async (req, res) => {
  const { schoolId } = req;
  const { from, to } = req.query;

  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to)   dateFilter.lte = new Date(to);

  const [holidays, events] = await Promise.all([
    prisma.holidayEvent.findMany({
      where: {
        schoolId,
        ...(Object.keys(dateFilter).length > 0 && { startDate: dateFilter }),
      },
      orderBy: { startDate: 'asc' },
    }),
    prisma.schoolEvent.findMany({
      where: {
        schoolId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  const colorMap = {
    holiday:  '#E24B4A',
    exam:     '#3B82F6',
    event:    '#22C55E',
    meeting:  '#F97316',
    sports:   '#8B5CF6',
    cultural: '#EC4899',
    academic: '#06B6D4',
    general:  '#22C55E',
  };

  const holidayItems = holidays.map(h => ({
    id:          `h-${h.id}`,
    rawId:       h.id,
    title:       h.title,
    date:        h.startDate,
    endDate:     h.endDate,
    type:        h.eventType || 'holiday',
    color:       h.color || colorMap[h.eventType] || colorMap.holiday,
    description: h.notes,
    source:      'holiday',
  }));

  const eventItems = events.map(e => ({
    id:          `e-${e.id}`,
    rawId:       e.id,
    title:       e.title,
    date:        e.date,
    endDate:     e.endDate,
    type:        e.type || 'event',
    color:       colorMap[e.type] || colorMap.general,
    description: e.description,
    source:      'event',
  }));

  const combined = [...holidayItems, ...eventItems].sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json({ success: true, data: combined });
}));

// POST /events - create SchoolEvent
router.post('/events', wrap(async (req, res) => {
  const { schoolId } = req;
  const { title, type, date, endDate, venue, description, status } = req.body;
  if (!title || !date) return res.status(400).json({ success: false, message: 'title and date required.' });

  const event = await prisma.schoolEvent.create({
    data: {
      schoolId,
      title,
      type:        type || 'general',
      date:        new Date(date),
      endDate:     endDate ? new Date(endDate) : null,
      venue:       venue || null,
      description: description || null,
      status:      status || 'upcoming',
    },
  });
  res.status(201).json({ success: true, data: event });
}));

// POST /holidays - create HolidayEvent
router.post('/holidays', wrap(async (req, res) => {
  const { schoolId } = req;
  const { title, eventType, startDate, endDate, color, notes } = req.body;
  if (!title || !startDate) return res.status(400).json({ success: false, message: 'title and startDate required.' });

  const holiday = await prisma.holidayEvent.create({
    data: {
      schoolId,
      title,
      eventType:  eventType || 'holiday',
      startDate:  new Date(startDate),
      endDate:    endDate ? new Date(endDate) : null,
      color:      color || '#E24B4A',
      notes:      notes || null,
    },
  });
  res.status(201).json({ success: true, data: holiday });
}));

// PUT /events/:id - update SchoolEvent
router.put('/events/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.schoolEvent.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Event not found.' });

  const { title, type, date, endDate, venue, description, status } = req.body;
  const updated = await prisma.schoolEvent.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(title       && { title }),
      ...(type        && { type }),
      ...(date        && { date: new Date(date) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(venue   !== undefined && { venue }),
      ...(description !== undefined && { description }),
      ...(status      && { status }),
    },
  });
  res.json({ success: true, data: updated });
}));

// PUT /holidays/:id - update HolidayEvent
router.put('/holidays/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.holidayEvent.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Holiday not found.' });

  const { title, eventType, startDate, endDate, color, notes } = req.body;
  const updated = await prisma.holidayEvent.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(title      && { title }),
      ...(eventType  && { eventType }),
      ...(startDate  && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(color      && { color }),
      ...(notes  !== undefined && { notes }),
    },
  });
  res.json({ success: true, data: updated });
}));

// DELETE /events/:id
router.delete('/events/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.schoolEvent.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Event not found.' });
  await prisma.schoolEvent.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Deleted.' });
}));

// DELETE /holidays/:id
router.delete('/holidays/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const existing = await prisma.holidayEvent.findFirst({ where: { id: parseInt(req.params.id), schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Holiday not found.' });
  await prisma.holidayEvent.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true, message: 'Deleted.' });
}));

module.exports = router;
