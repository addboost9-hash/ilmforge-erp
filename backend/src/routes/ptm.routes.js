const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* ──────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────── */

/** Generate HH:MM time slots between startTime and endTime with slotDurationMinutes gaps */
function generateSlots(startTime, endTime, slotDurationMinutes) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current + slotDurationMinutes <= end) {
    const hh = String(Math.floor(current / 60)).padStart(2, '0');
    const mm = String(current % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    current += slotDurationMinutes;
  }
  return slots;
}

/* ──────────────────────────────────────────────────────────────
   POST /ptm/create  — Admin creates a PTM event
   Body: { title, date, startTime, endTime, venue,
           slotDurationMinutes, classIds }
────────────────────────────────────────────────────────────── */
router.post('/create', wrap(async (req, res) => {
  const { title, date, startTime, endTime, venue, slotDurationMinutes = 10, classIds = [] } = req.body;

  if (!title || !date || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'title, date, startTime and endTime are required.' });
  }

  const duration = parseInt(slotDurationMinutes, 10);
  if (isNaN(duration) || duration < 5) {
    return res.status(400).json({ success: false, message: 'slotDurationMinutes must be >= 5.' });
  }

  const times = generateSlots(startTime, endTime, duration);
  if (times.length === 0) {
    return res.status(400).json({ success: false, message: 'No slots can be generated with the given times and duration.' });
  }

  /* Build slot rows: one row per (time × classId) if classIds supplied, else one per time */
  const slotRows = [];
  if (classIds.length > 0) {
    for (const classId of classIds) {
      for (const time of times) {
        slotRows.push({ time, classId: parseInt(classId, 10) });
      }
    }
  } else {
    for (const time of times) {
      slotRows.push({ time });
    }
  }

  const event = await prisma.pTMEvent.create({
    data: {
      schoolId: req.schoolId,
      title,
      date: new Date(date),
      startTime,
      endTime,
      venue: venue || null,
      slotDurationMinutes: duration,
      status: 'upcoming',
      slots: { create: slotRows },
    },
    include: { slots: true },
  });

  res.status(201).json({ success: true, data: event });
}));

/* ──────────────────────────────────────────────────────────────
   GET /ptm/events  — List all PTM events (upcoming first)
────────────────────────────────────────────────────────────── */
router.get('/events', wrap(async (req, res) => {
  const { status } = req.query;

  const events = await prisma.pTMEvent.findMany({
    where: {
      schoolId: req.schoolId,
      ...(status && { status }),
    },
    include: {
      slots: {
        include: { bookings: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  /* Augment each event with booking summary */
  const enriched = events.map((e) => ({
    ...e,
    totalSlots: e.slots.length,
    bookedSlots: e.slots.filter((s) => s.isBooked).length,
    classIds: [...new Set(e.slots.map((s) => s.classId).filter(Boolean))],
  }));

  res.json({ success: true, data: enriched });
}));

/* ──────────────────────────────────────────────────────────────
   GET /ptm/events/:id/slots  — Time slots for a PTM event
────────────────────────────────────────────────────────────── */
router.get('/events/:id/slots', wrap(async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  const event = await prisma.pTMEvent.findFirst({
    where: { id: eventId, schoolId: req.schoolId },
  });
  if (!event) return res.status(404).json({ success: false, message: 'PTM event not found.' });

  const slots = await prisma.pTMSlot.findMany({
    where: { eventId },
    include: {
      bookings: {
        include: {
          slot: false,
        },
      },
    },
    orderBy: [{ classId: 'asc' }, { time: 'asc' }],
  });

  res.json({ success: true, data: slots });
}));

/* ──────────────────────────────────────────────────────────────
   POST /ptm/events/:id/book  — Parent books a slot
   Body: { slotId, studentId }
────────────────────────────────────────────────────────────── */
router.post('/events/:id/book', wrap(async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const { slotId, studentId, notes } = req.body;

  if (!slotId || !studentId) {
    return res.status(400).json({ success: false, message: 'slotId and studentId are required.' });
  }

  const slot = await prisma.pTMSlot.findFirst({
    where: { id: parseInt(slotId, 10), eventId },
  });
  if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });
  if (slot.isBooked) return res.status(409).json({ success: false, message: 'Slot is already booked.' });

  /* Determine parentId from the requesting user (if role is parent) */
  const parentId = req.user?.role === 'parent' ? req.user.id : null;

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.pTMBooking.create({
      data: {
        schoolId: req.schoolId,
        slotId: parseInt(slotId, 10),
        studentId: parseInt(studentId, 10),
        parentId,
        notes: notes || null,
      },
    });
    await tx.pTMSlot.update({
      where: { id: parseInt(slotId, 10) },
      data: { isBooked: true },
    });
    return b;
  });

  res.status(201).json({ success: true, data: booking });
}));

/* ──────────────────────────────────────────────────────────────
   GET /ptm/events/:id/bookings  — All bookings for an event
────────────────────────────────────────────────────────────── */
router.get('/events/:id/bookings', wrap(async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  const event = await prisma.pTMEvent.findFirst({
    where: { id: eventId, schoolId: req.schoolId },
  });
  if (!event) return res.status(404).json({ success: false, message: 'PTM event not found.' });

  const bookings = await prisma.pTMBooking.findMany({
    where: { schoolId: req.schoolId, slot: { eventId } },
    include: {
      slot: true,
    },
    orderBy: { bookedAt: 'asc' },
  });

  res.json({ success: true, data: bookings });
}));

/* ──────────────────────────────────────────────────────────────
   DELETE /ptm/bookings/:id  — Cancel a booking
────────────────────────────────────────────────────────────── */
router.delete('/bookings/:id', wrap(async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);

  const booking = await prisma.pTMBooking.findFirst({
    where: { id: bookingId, schoolId: req.schoolId },
  });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  await prisma.$transaction(async (tx) => {
    await tx.pTMBooking.delete({ where: { id: bookingId } });
    await tx.pTMSlot.update({
      where: { id: booking.slotId },
      data: { isBooked: false },
    });
  });

  res.json({ success: true, message: 'Booking cancelled.' });
}));

/* ──────────────────────────────────────────────────────────────
   PATCH /ptm/events/:id  — Update event status (admin)
────────────────────────────────────────────────────────────── */
router.patch('/events/:id', wrap(async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const { status } = req.body;

  const event = await prisma.pTMEvent.findFirst({
    where: { id: eventId, schoolId: req.schoolId },
  });
  if (!event) return res.status(404).json({ success: false, message: 'PTM event not found.' });

  const updated = await prisma.pTMEvent.update({
    where: { id: eventId },
    data: { ...(status && { status }) },
  });

  res.json({ success: true, data: updated });
}));

module.exports = router;
