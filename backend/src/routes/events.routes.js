/**
 * IlmForge — Events & Tournament Routes
 *
 * GET    /api/v1/events                      — list school events
 * POST   /api/v1/events                      — create event
 * PUT    /api/v1/events/:id                  — update event
 * DELETE /api/v1/events/:id                  — delete event
 * POST   /api/v1/events/:id/participants     — register participants / teams
 * GET    /api/v1/events/:id/participants     — list event participants
 * POST   /api/v1/events/:id/results          — record results / winners
 * GET    /api/v1/events/calendar             — events for a month (calendar view)
 */

const express = require('express');
const router  = express.Router();
const prisma  = require('../config/prisma');
const wrap    = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* ─────────────────────────────────────────────────────────────
   GET /api/v1/events
   Query: type, status, month, year, search, page, limit
───────────────────────────────────────────────────────────── */
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { type, status, month, year, search, page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    schoolId,
    ...(type   && { type }),
    ...(status && { status }),
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
  };

  // Month/year filter on the event date
  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end   = new Date(parseInt(year), parseInt(month), 1);
    where.date  = { gte: start, lt: end };
  } else if (year) {
    const start = new Date(parseInt(year), 0, 1);
    const end   = new Date(parseInt(year) + 1, 0, 1);
    where.date  = { gte: start, lt: end };
  }

  const [events, total] = await Promise.all([
    prisma.schoolEvent.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: 'asc' },
      include: {
        _count: { select: { participants: true } },
      },
    }).catch(() => []),   // graceful if model not yet migrated
    prisma.schoolEvent.count({ where }).catch(() => 0),
  ]);

  const data = events.map((e) => ({
    ...e,
    participantCount: e._count?.participants ?? 0,
    _count: undefined,
  }));

  res.json({ success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}));

/* ─────────────────────────────────────────────────────────────
   GET /api/v1/events/calendar
   Query: month (1-12), year
   Returns all events for the given month for calendar rendering
───────────────────────────────────────────────────────────── */
router.get('/calendar', wrap(async (req, res) => {
  const { schoolId } = req;
  const now   = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year  = parseInt(req.query.year)  || now.getFullYear();

  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);

  const events = await prisma.schoolEvent.findMany({
    where: { schoolId, date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  }).catch(() => []);

  res.json({ success: true, data: events, month, year });
}));

/* ─────────────────────────────────────────────────────────────
   POST /api/v1/events
   Body: { title, type, date, endDate, venue, description,
           classIds, status }
───────────────────────────────────────────────────────────── */
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { title, type = 'general', date, endDate, venue, description, status = 'upcoming' } = req.body;

  if (!title) return res.status(400).json({ success: false, message: 'Event title is required.' });
  if (!date)  return res.status(400).json({ success: false, message: 'Event date is required.' });

  let event;
  try {
    event = await prisma.schoolEvent.create({
      data: {
        schoolId,
        title,
        type,
        date:        new Date(date),
        endDate:     endDate ? new Date(endDate) : null,
        venue:       venue       || null,
        description: description || null,
        status,
      },
    });
  } catch (modelErr) {
    return res.status(503).json({ success: false, message: 'SchoolEvent model not yet available. Run prisma migrate dev first.', detail: modelErr.message });
  }

  await prisma.auditLog.create({
    data: {
      schoolId, userId: req.user?.id || null,
      action: 'EVENT_CREATED',
      entity: 'schoolEvent', entityId: event.id,
      details: JSON.stringify({ title, type, date }),
    },
  }).catch(() => null);

  res.status(201).json({ success: true, data: event, message: 'Event created.' });
}));

/* ─────────────────────────────────────────────────────────────
   PUT /api/v1/events/:id
   Body: any subset of event fields
───────────────────────────────────────────────────────────── */
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const eventId = parseInt(req.params.id);

  const existing = await prisma.schoolEvent.findFirst({
    where: { id: eventId, schoolId },
  }).catch(() => null);
  if (!existing) return res.status(404).json({ success: false, message: 'Event not found.' });

  const allowed = ['title', 'type', 'date', 'endDate', 'venue', 'description', 'status'];
  const data    = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  if (data.date)    data.date    = new Date(data.date);
  if (data.endDate) data.endDate = new Date(data.endDate);

  const updated = await prisma.schoolEvent.update({ where: { id: eventId }, data }).catch((e) => {
    throw e;
  });

  res.json({ success: true, data: updated, message: 'Event updated.' });
}));

/* ─────────────────────────────────────────────────────────────
   DELETE /api/v1/events/:id
───────────────────────────────────────────────────────────── */
router.delete('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const eventId = parseInt(req.params.id);

  const existing = await prisma.schoolEvent.findFirst({
    where: { id: eventId, schoolId },
  }).catch(() => null);
  if (!existing) return res.status(404).json({ success: false, message: 'Event not found.' });

  await prisma.schoolEvent.delete({ where: { id: eventId } });
  res.json({ success: true, message: 'Event deleted.' });
}));

/* ─────────────────────────────────────────────────────────────
   GET /api/v1/events/:id/participants
───────────────────────────────────────────────────────────── */
router.get('/:id/participants', wrap(async (req, res) => {
  const { schoolId } = req;
  const eventId = parseInt(req.params.id);

  const event = await prisma.schoolEvent.findFirst({ where: { id: eventId, schoolId } }).catch(() => null);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const participants = await prisma.eventParticipant.findMany({
    where: { eventId },
    include: {
      student: { select: { id: true, name: true, rollNo: true, class: { select: { name: true } } } },
    },
    orderBy: [{ teamName: 'asc' }, { position: 'asc' }],
  }).catch(() => []);

  res.json({ success: true, data: participants });
}));

/* ─────────────────────────────────────────────────────────────
   POST /api/v1/events/:id/participants
   Body: { participants: [{ studentId, teamName? }] }
   Adds/upserts participants for the event
───────────────────────────────────────────────────────────── */
router.post('/:id/participants', wrap(async (req, res) => {
  const { schoolId } = req;
  const eventId  = parseInt(req.params.id);
  const { participants = [] } = req.body;

  const event = await prisma.schoolEvent.findFirst({ where: { id: eventId, schoolId } }).catch(() => null);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  if (!Array.isArray(participants) || !participants.length) {
    return res.status(400).json({ success: false, message: 'participants array is required.' });
  }

  const results = [];
  for (const p of participants) {
    const studentId = parseInt(p.studentId);
    if (!studentId) continue;

    // Verify student belongs to this school
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId, deletedAt: null } });
    if (!student) continue;

    try {
      const record = await prisma.eventParticipant.upsert({
        where: { eventId_studentId: { eventId, studentId } },
        update: { teamName: p.teamName || null },
        create: { eventId, studentId, teamName: p.teamName || null },
      });
      results.push(record);
    } catch {
      // Upsert unique constraint may not exist — fallback to create or ignore
      const existing = await prisma.eventParticipant.findFirst({ where: { eventId, studentId } }).catch(() => null);
      if (!existing) {
        const r = await prisma.eventParticipant.create({ data: { eventId, studentId, teamName: p.teamName || null } }).catch(() => null);
        if (r) results.push(r);
      }
    }
  }

  res.json({ success: true, data: results, added: results.length, message: `${results.length} participant(s) registered.` });
}));

/* ─────────────────────────────────────────────────────────────
   POST /api/v1/events/:id/results
   Body: { results: [{ studentId, teamName, position, score }] }
   Records results / winners for the event
───────────────────────────────────────────────────────────── */
router.post('/:id/results', wrap(async (req, res) => {
  const { schoolId } = req;
  const eventId  = parseInt(req.params.id);
  const { results = [] } = req.body;

  const event = await prisma.schoolEvent.findFirst({ where: { id: eventId, schoolId } }).catch(() => null);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  if (!Array.isArray(results) || !results.length) {
    return res.status(400).json({ success: false, message: 'results array is required.' });
  }

  const updated = [];
  for (const r of results) {
    const studentId = parseInt(r.studentId);
    if (!studentId) continue;

    // Ensure participant record exists first
    let participant = await prisma.eventParticipant.findFirst({ where: { eventId, studentId } }).catch(() => null);
    if (!participant) {
      participant = await prisma.eventParticipant.create({ data: { eventId, studentId } }).catch(() => null);
    }
    if (!participant) continue;

    const rec = await prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        position: r.position != null ? parseInt(r.position) : null,
        score:    r.score    != null ? String(r.score)       : null,
        teamName: r.teamName || participant.teamName || null,
      },
    }).catch(() => null);
    if (rec) updated.push(rec);
  }

  // Mark event as completed if results are being recorded
  await prisma.schoolEvent.update({
    where: { id: eventId },
    data:  { status: 'completed' },
  }).catch(() => null);

  await prisma.auditLog.create({
    data: {
      schoolId, userId: req.user?.id || null,
      action: 'EVENT_RESULTS_RECORDED',
      entity: 'schoolEvent', entityId: eventId,
      details: JSON.stringify({ total: updated.length }),
    },
  }).catch(() => null);

  res.json({ success: true, data: updated, message: `Results recorded for ${updated.length} participant(s).` });
}));

module.exports = router;
