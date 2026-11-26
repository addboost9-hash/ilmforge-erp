/**
 * IlmForge — face attendance, /api/v1/face (admin, teacher, gatekeeper).
 *
 * The phone (or computer) at the gate recognises faces itself: it downloads
 * the faces it knows (GET /people), matches what its camera sees, and marks
 * the person (POST /recognize-mark) through the same path as a fingerprint
 * machine, so the attendance lands in the same register.
 *
 * The admin teaches it the faces (POST /learn): from each person's photo on
 * their record, worked out in the admin's browser, and from photos taken
 * with the camera. See services/faceData.service.js for what is kept.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { markPass, personView, STUDENT_SELECT, STAFF_SELECT } = require('../services/attendanceDevice.service');
const face = require('../services/faceData.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const isAdmin = (req) => ['super_admin', 'admin'].includes(req.user?.role);
const adminOnly = (req, res, next) => (isAdmin(req) ? next() : bad(res, 'Only the admin can change the faces the system knows.', 403));
const KINDS = ['student', 'staff'];

/* A person of this school, as the attendance path needs them. */
async function personOf(schoolId, kind, id) {
  if (kind === 'staff') return prisma.staff.findFirst({ where: { id, schoolId, deletedAt: null }, select: STAFF_SELECT });
  return prisma.student.findFirst({ where: { id, schoolId, deletedAt: null }, select: STUDENT_SELECT });
}

// Enrol a face (photo + optional descriptor) — kept for older screens.
router.post('/enroll', wrap(async (req, res) => {
  const { personType = 'student', personId, photoData, descriptor } = req.body;
  if (!personId || !photoData) return bad(res, 'personId and photoData required.');
  const pid = parseInt(personId, 10);
  if (!KINDS.includes(personType) || !(await personOf(req.schoolId, personType, pid))) return bad(res, 'Person not found.', 404);
  const rec = await prisma.faceEnrollment.upsert({
    where: { schoolId_personType_personId: { schoolId: req.schoolId, personType, personId: pid } },
    create: { schoolId: req.schoolId, personType, personId: pid, photoData, descriptor: descriptor ? JSON.stringify(descriptor) : null, enrolledBy: req.user.id },
    update: { photoData, ...(descriptor && { descriptor: JSON.stringify(descriptor) }), enrolledBy: req.user.id },
  });
  res.status(201).json({ success: true, data: { id: rec.id } });
}));

// All enrolments with their photos — kept for the tap-a-photo check-in.
router.get('/enrollments', wrap(async (req, res) => {
  const rows = await prisma.faceEnrollment.findMany({ where: { schoolId: req.schoolId }, select: { personType: true, personId: true, photoData: true } });
  const sids = rows.filter((r) => r.personType === 'student').map((r) => r.personId);
  const students = sids.length ? await prisma.student.findMany({ where: { id: { in: sids }, schoolId: req.schoolId, deletedAt: null }, select: { id: true, name: true, rollNo: true, classId: true } }) : [];
  const smap = Object.fromEntries(students.map((s) => [s.id, s]));
  res.json({ success: true, data: rows.map((r) => ({ ...r, person: smap[r.personId] || null })) });
}));

// GET /people?kind=student|staff|all&classId= — the faces the kiosk matches against
router.get('/people', wrap(async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-cache');
  const kind = KINDS.includes(req.query.kind) ? req.query.kind : 'all';
  const classId = parseInt(req.query.classId, 10) || null;
  const rows = await prisma.faceEnrollment.findMany({
    where: { schoolId: req.schoolId, descriptor: { not: null }, ...(kind !== 'all' && { personType: kind }) },
    select: { personType: true, personId: true, descriptor: true },
  });
  const ids = (k) => rows.filter((r) => r.personType === k).map((r) => r.personId);
  const [students, staff] = await Promise.all([
    ids('student').length ? prisma.student.findMany({
      where: { schoolId: req.schoolId, id: { in: ids('student') }, deletedAt: null, status: 'active', ...(classId && { classId }) },
      select: { id: true, name: true, lastName: true, rollNo: true, class: { select: { name: true } }, section: { select: { name: true } } },
    }) : [],
    ids('staff').length && !classId ? prisma.staff.findMany({
      where: { schoolId: req.schoolId, id: { in: ids('staff') }, deletedAt: null, isActive: true },
      select: { id: true, name: true, empCode: true, designation: true },
    }) : [],
  ]);
  const who = new Map([
    ...students.map((s) => [`student:${s.id}`, { name: [s.name, s.lastName].filter(Boolean).join(' '), label: [s.class?.name, s.section?.name].filter(Boolean).join(' — '), code: s.rollNo || '' }]),
    ...staff.map((s) => [`staff:${s.id}`, { name: s.name, label: s.designation || 'Staff', code: s.empCode || '' }]),
  ]);
  const people = rows.map((r) => {
    const w = who.get(`${r.personType}:${r.personId}`);
    const list = face.parseFaceData(r.descriptor);
    return w && list.length ? { kind: r.personType, id: r.personId, ...w, d: list.map((x) => x.d) } : null;
  }).filter(Boolean);
  res.json({ success: true, data: people });
}));

// GET /photo/:kind/:id — the photo shown when a face is recognised
router.get('/photo/:kind/:id', wrap(async (req, res) => {
  const kind = req.params.kind;
  const id = parseInt(req.params.id, 10);
  if (!KINDS.includes(kind) || !id) return bad(res, 'Not found.', 404);
  const p = await personOf(req.schoolId, kind, id);
  if (!p) return bad(res, 'Not found.', 404);
  let photo = p.photoUrl || '';
  if (!photo) {
    const e = await prisma.faceEnrollment.findFirst({ where: { schoolId: req.schoolId, personType: kind, personId: id }, select: { photoData: true } });
    photo = e?.photoData || '';
  }
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.json({ success: true, data: { photoUrl: photo } });
}));

// GET /summary — how many people the system can recognise (admin)
router.get('/summary', adminOnly, wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const [students, studentsWithPhoto, staff, staffWithPhoto, enrolled] = await Promise.all([
    prisma.student.count({ where: { schoolId, deletedAt: null, status: 'active' } }),
    prisma.student.count({ where: { schoolId, deletedAt: null, status: 'active', AND: [{ photoUrl: { not: null } }, { photoUrl: { not: '' } }] } }),
    prisma.staff.count({ where: { schoolId, deletedAt: null, isActive: true } }),
    prisma.staff.count({ where: { schoolId, deletedAt: null, isActive: true, AND: [{ photoUrl: { not: null } }, { photoUrl: { not: '' } }] } }),
    prisma.faceEnrollment.findMany({ where: { schoolId, descriptor: { not: null } }, select: { personType: true, personId: true, descriptor: true } }),
  ]);
  const known = (k) => enrolled.filter((e) => e.personType === k && face.parseFaceData(e.descriptor).length).map((e) => e.personId);
  const [studentsKnown, staffKnown] = await Promise.all([
    known('student').length ? prisma.student.count({ where: { schoolId, id: { in: known('student') }, deletedAt: null, status: 'active' } }) : 0,
    known('staff').length ? prisma.staff.count({ where: { schoolId, id: { in: known('staff') }, deletedAt: null, isActive: true } }) : 0,
  ]);
  res.json({ success: true, data: { students, studentsWithPhoto, studentsKnown, staff, staffWithPhoto, staffKnown } });
}));

/* Photos to learn from: the photo on the record, else one taken at enrolment. */
// GET /learn-batch?kind=student|staff&after=<id>&redo=0|1 — 20 at a time (admin)
router.get('/learn-batch', adminOnly, wrap(async (req, res) => {
  const kind = req.query.kind === 'staff' ? 'staff' : 'student';
  const after = parseInt(req.query.after, 10) || 0;
  const redo = req.query.redo === '1';
  const take = 20;
  const known = new Set((await prisma.faceEnrollment.findMany({
    where: { schoolId: req.schoolId, personType: kind, descriptor: { not: null } }, select: { personId: true, descriptor: true },
  })).filter((e) => face.parseFaceData(e.descriptor).some((x) => x.s === 'photo')).map((e) => e.personId));
  const enrolPhotos = new Map((await prisma.faceEnrollment.findMany({
    where: { schoolId: req.schoolId, personType: kind }, select: { personId: true, photoData: true },
  })).map((e) => [e.personId, e.photoData]));
  const out = [];
  let cursor = after;
  // Walk in id order until 20 that still need learning (or the end).
  for (let guard = 0; guard < 200 && out.length < take; guard++) {
    const rows = kind === 'staff'
      ? await prisma.staff.findMany({ where: { schoolId: req.schoolId, deletedAt: null, isActive: true, id: { gt: cursor } }, select: { id: true, name: true, designation: true, photoUrl: true }, orderBy: { id: 'asc' }, take: 100 })
      : await prisma.student.findMany({ where: { schoolId: req.schoolId, deletedAt: null, status: 'active', id: { gt: cursor } }, select: { id: true, name: true, lastName: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true } } }, orderBy: { id: 'asc' }, take: 100 });
    if (!rows.length) { cursor = null; break; }
    for (const p of rows) {
      cursor = p.id;
      const photo = p.photoUrl || enrolPhotos.get(p.id) || '';
      if (!photo || (!redo && known.has(p.id))) continue;
      out.push({
        kind, id: p.id,
        name: kind === 'staff' ? p.name : [p.name, p.lastName].filter(Boolean).join(' '),
        label: kind === 'staff' ? (p.designation || 'Staff') : [p.class?.name, p.section?.name].filter(Boolean).join(' — '),
        photoUrl: photo,
      });
      if (out.length >= take) break;
    }
  }
  res.json({ success: true, data: out, next: cursor });
}));

// POST /learn { items: [{ kind, id, descriptor, source: 'photo'|'camera', crop }] } (admin)
router.post('/learn', adminOnly, wrap(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  if (!items.length) return bad(res, 'Nothing to save.');
  let saved = 0;
  const refused = [];
  for (const it of items) {
    const kind = it?.kind === 'staff' ? 'staff' : 'student';
    const id = parseInt(it?.id, 10);
    if (!id || !face.validDescriptor(it.descriptor)) { refused.push({ kind, id, reason: 'The face could not be read.' }); continue; }
    if (!(await personOf(req.schoolId, kind, id))) { refused.push({ kind, id, reason: 'Not found.' }); continue; }
    const crop = typeof it.crop === 'string' && /^data:image\/jpeg;base64,/.test(it.crop) && it.crop.length < 60000 ? it.crop : null;
    const where = { schoolId_personType_personId: { schoolId: req.schoolId, personType: kind, personId: id } };
    const cur = await prisma.faceEnrollment.findUnique({ where });
    const list = face.addDescriptor(face.parseFaceData(cur?.descriptor), { d: it.descriptor, s: it.source });
    await prisma.faceEnrollment.upsert({
      where,
      create: { schoolId: req.schoolId, personType: kind, personId: id, photoData: crop || '', descriptor: face.stringify(list), enrolledBy: req.user.id },
      update: { descriptor: face.stringify(list), ...(crop && (!cur?.photoData || it.source === 'camera') && { photoData: crop }), enrolledBy: req.user.id },
    });
    saved += 1;
  }
  res.json({ success: true, data: { saved, refused } });
}));

// DELETE /enrollments/:kind/:id — forget a person's face (admin)
router.delete('/enrollments/:kind/:id', adminOnly, wrap(async (req, res) => {
  const kind = req.params.kind === 'staff' ? 'staff' : 'student';
  const { count } = await prisma.faceEnrollment.deleteMany({ where: { schoolId: req.schoolId, personType: kind, personId: parseInt(req.params.id, 10) } });
  await prisma.auditLog.create({
    data: { schoolId: req.schoolId, userId: req.user.id, action: 'FACE_DATA_DELETED', resource: kind, resourceId: parseInt(req.params.id, 10) || null },
  }).catch(() => null);
  res.json({ success: true, message: count ? 'Face data deleted.' : 'There was no face data.' });
}));

// POST /recognize-mark { personId, personType, at, distance, mode }
// The face was recognised (or tapped): marked like a fingerprint punch.
router.post('/recognize-mark', wrap(async (req, res) => {
  const { personId, personType = 'student' } = req.body;
  if (!personId) return bad(res, 'personId required.');
  const kind = personType === 'staff' ? 'staff' : 'student';
  const person = await personOf(req.schoolId, kind, parseInt(personId, 10));
  if (!person) return bad(res, 'Person not found.', 404);
  const r = await markPass({ schoolId: req.schoolId, kind, person, method: 'face', markedBy: req.user?.id || null, at: req.body.at });
  if (r.error) return res.status(r.status || 400).json({ success: false, message: r.error, data: { person: r.person || personView(kind, person) } });
  res.json({
    success: true,
    data: r,
    message: r.message,
    attendanceMarked: r.action === 'in' && !r.already, // (older screens)
  });
}));

module.exports = router;
