/**
 * IlmForge — gate passes: a student leaves school early only with a pass,
 * to the person named on it.
 *
 *   GET  /gatepasses/pickup/:studentId  the student, and who may collect them: the
 *                                        father, mother and parents on the record, and
 *                                        people who collected them before
 *   POST /gatepasses                     issue a pass: { studentId, parentName (who
 *                                        collects), relation, phone, cnic, reason,
 *                                        validDate, parentConfirmed }
 *   GET  /gatepasses                     the latest passes, with the student and the person
 *   POST /gatepasses/verify              the gate: { passCode } → release, and to whom
 *   POST /gatepasses/:id/revoke          cancel a pass not used yet
 *   GET  /gatepasses/audit               who issued, verified and cancelled what
 *
 * Someone who is not on the student's record (an uncle, a driver) is allowed
 * only when the office ticks that the parent agreed by phone; the pass says so,
 * and the gate sees the person's relation, phone and CNIC to check.
 *
 * Mounted with only `protect` in app.js: staff and the gatekeeper only.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { normName } = require('../services/biometricProtocol');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });

router.use((req, res, next) => {
  if (!['admin', 'super_admin', 'principal', 'teacher', 'gatekeeper'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Staff/gatekeeper only.' });
  }
  next();
});

const RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Guardian', 'Driver / van', 'Neighbour', 'Other'];
const text = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
const pkDay = (d) => new Date(new Date(d).getTime() + 5 * 3600e3).toISOString().slice(0, 10);
const digits = (v) => String(v ?? '').replace(/\D/g, '');
/* 03001234567 / +92 300 1234567 → 03001234567; '' when not a phone number. */
function cleanPhone(v) {
  let d = digits(v);
  if (d.startsWith('92') && d.length === 12) d = `0${d.slice(2)}`;
  return d.length >= 10 && d.length <= 13 ? d : '';
}
/* 13 digits → 12345-1234567-1; '' otherwise. */
function cleanCnic(v) {
  const d = digits(v);
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : '';
}
/* The same person's name, however Muhammad is spelt (Urdu names compared as written). */
function sameName(a, b) {
  const x = normName(a);
  const y = normName(b);
  if (x && y) return x === y;
  return text(a, 80).toLowerCase() === text(b, 80).toLowerCase() && !!text(a, 80);
}

const writeGatePassAudit = async (req, action, passId, details = null) => {
  await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId, userId: req.user.id, action, resource: 'gate_pass', resourceId: passId || null,
      details: details ? JSON.stringify(details) : null,
    },
  }).catch(() => null);
};

const STUDENT_SELECT = {
  id: true, name: true, rollNo: true, photoUrl: true, fatherName: true, fatherCnic: true, motherName: true, motherCnic: true, motherPhone: true,
  emergencyPhone: true, status: true, class: { select: { name: true } }, section: { select: { name: true } },
};
const studentView = (s) => s && ({
  id: s.id, name: s.name, rollNo: s.rollNo || '', photoUrl: s.photoUrl || null, fatherName: s.fatherName || '',
  className: s.class?.name || '', sectionName: s.section?.name || '', status: s.status,
});

/* The people on a student's record who may collect them. */
async function recordPeople(schoolId, s) {
  const links = await prisma.parentStudent.findMany({
    where: { schoolId, studentId: s.id },
    select: { parent: { select: { cnic: true, user: { select: { name: true, phone: true } } } } },
  });
  const accounts = links.map((l) => l.parent).filter((p) => p?.user?.name);
  const phoneOf = (name) => cleanPhone(accounts.find((a) => sameName(a.user.name, name))?.user.phone);
  const people = [];
  const add = (p) => { if (p.name && !people.some((x) => sameName(x.name, p.name))) people.push(p); };
  if (s.fatherName) add({ name: s.fatherName, relation: 'Father', phone: phoneOf(s.fatherName) || cleanPhone(s.emergencyPhone), cnic: cleanCnic(s.fatherCnic), source: 'record' });
  if (s.motherName) add({ name: s.motherName, relation: 'Mother', phone: cleanPhone(s.motherPhone) || phoneOf(s.motherName), cnic: cleanCnic(s.motherCnic), source: 'record' });
  for (const a of accounts) add({ name: a.user.name, relation: 'Guardian', phone: cleanPhone(a.user.phone), cnic: cleanCnic(a.cnic), source: 'parent account' });
  return people;
}

router.get('/pickup/:studentId', wrap(async (req, res) => {
  const s = await prisma.student.findFirst({ where: { id: parseInt(req.params.studentId, 10) || 0, schoolId: req.schoolId, deletedAt: null }, select: STUDENT_SELECT });
  if (!s) return bad(res, 'Student not found.', 404);
  const people = await recordPeople(req.schoolId, s);
  // People who collected the student before and are not on the record.
  const past = await prisma.gatePass.findMany({ where: { schoolId: req.schoolId, studentId: s.id }, orderBy: { createdAt: 'desc' }, take: 30 });
  const before = [];
  for (const p of past) {
    if (people.some((x) => sameName(x.name, p.parentName)) || before.some((x) => sameName(x.name, p.parentName))) continue;
    before.push({ name: p.parentName, relation: p.relation || '', phone: p.pickupPhone || '', cnic: p.pickupCnic || '', source: 'before', lastAt: p.createdAt });
  }
  const today = pkDay(new Date());
  const activeToday = past.filter((p) => p.status === 'active' && pkDay(p.validDate) === today).map((p) => ({ id: p.id, passCode: p.passCode, parentName: p.parentName }));
  res.json({ success: true, data: { student: studentView(s), people, before: before.slice(0, 6), activeToday, relations: RELATIONS } });
}));

router.get('/', wrap(async (req, res) => {
  const passes = await prisma.gatePass.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' }, take: 100 });
  const sids = [...new Set(passes.map((p) => p.studentId))];
  const uids = [...new Set(passes.flatMap((p) => [p.issuedBy, p.usedBy]).filter(Boolean))];
  const [students, users] = await Promise.all([
    sids.length ? prisma.student.findMany({ where: { id: { in: sids }, schoolId: req.schoolId }, select: STUDENT_SELECT }) : [],
    uids.length ? prisma.user.findMany({ where: { id: { in: uids }, schoolId: req.schoolId }, select: { id: true, name: true } }) : [],
  ]);
  const S = new Map(students.map((s) => [s.id, studentView(s)]));
  const U = new Map(users.map((u) => [u.id, u.name]));
  res.json({ success: true, data: passes.map((p) => ({ ...p, student: S.get(p.studentId), issuedByName: U.get(p.issuedBy) || null, usedByName: U.get(p.usedBy) || null })) });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const name = text(b.parentName ?? b.pickupName, 60);
  if (!b.studentId) return bad(res, 'Choose the student.');
  if (name.length < 2) return bad(res, 'Write the name of the person collecting the student.');
  const s = await prisma.student.findFirst({ where: { id: parseInt(b.studentId, 10) || 0, schoolId: req.schoolId, deletedAt: null }, select: STUDENT_SELECT });
  if (!s) return bad(res, 'Student not found.', 404);
  const relation = text(b.relation, 30) || null;
  const phone = b.phone ? cleanPhone(b.phone) : '';
  if (b.phone && !phone) return bad(res, 'The phone number is 11 digits, like 0300 1234567.');
  const cnic = b.cnic ? cleanCnic(b.cnic) : '';
  if (b.cnic && !cnic) return bad(res, 'The CNIC is 13 digits, like 35202-1234567-1.');
  const day = b.validDate ? String(b.validDate).slice(0, 10) : pkDay(new Date());
  const today = pkDay(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < today || day > pkDay(Date.now() + 7 * 864e5)) return bad(res, 'A pass is for today or a day in the next week.');
  const people = await recordPeople(req.schoolId, s);
  const onRecord = people.some((p) => sameName(p.name, name));
  const parentConfirmed = !!b.parentConfirmed;
  if (!onRecord && !parentConfirmed) {
    return bad(res, `${name} is not on ${s.name}'s record (father, mother or a parent account). Call the parent, and tick "The parent agreed by phone" before issuing the pass.`, 409);
  }
  const passCode = `GP-${req.schoolId}-${Date.now().toString(36).toUpperCase()}`;
  const pass = await prisma.gatePass.create({
    data: {
      schoolId: req.schoolId, studentId: s.id, parentName: name, reason: text(b.reason, 120) || null, passCode,
      // The day at noon in Pakistan: the same day whichever way it is read.
      validDate: new Date(`${day}T07:00:00.000Z`), issuedBy: req.user.id,
      relation, pickupPhone: phone || null, pickupCnic: cnic || null, onRecord, parentConfirmed,
    },
  });
  await writeGatePassAudit(req, 'GATEPASS_ISSUED', pass.id, { studentId: s.id, student: s.name, passCode, pickup: name, relation, onRecord, parentConfirmed });
  res.status(201).json({ success: true, data: { ...pass, student: studentView(s) }, message: `Gate pass for ${s.name}: release to ${name}${relation ? ` (${relation})` : ''}.` });
}));

const pickupOf = (p) => ({ name: p.parentName, relation: p.relation || '', phone: p.pickupPhone || '', cnic: p.pickupCnic || '', onRecord: p.onRecord, parentConfirmed: p.parentConfirmed });

// The gate scans the pass (or types its code): release, and to whom.
router.post('/verify', wrap(async (req, res) => {
  const passCode = String(req.body?.passCode || '').trim().toUpperCase();
  if (!passCode) return bad(res, 'Scan or type the pass code.');
  const pass = await prisma.gatePass.findFirst({ where: { schoolId: req.schoolId, passCode } });
  if (!pass) return bad(res, 'Invalid pass code. Do not release the student.', 404);
  const s = await prisma.student.findFirst({ where: { id: pass.studentId, schoolId: req.schoolId }, select: STUDENT_SELECT });
  const context = { ...pass, student: studentView(s), pickup: pickupOf(pass) };
  if (pass.status === 'used') return res.status(400).json({ success: false, message: `This pass was already used at ${new Date(pass.usedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' })}. Do not release the student again.`, data: context });
  // A cancelled pass, or one for another day, does not release the child.
  if (pass.status !== 'active') return res.status(400).json({ success: false, message: 'This pass was cancelled. Do not release the student.', data: context });
  if (pkDay(pass.validDate) !== pkDay(new Date())) return res.status(400).json({ success: false, message: `This pass is for ${pkDay(pass.validDate).split('-').reverse().join('/')}, not today. Do not release the student.`, data: context });
  // Only while still active: two scans at once release the child once.
  const { count } = await prisma.gatePass.updateMany({ where: { id: pass.id, status: 'active' }, data: { status: 'used', usedAt: new Date(), usedBy: req.user.id } });
  if (count !== 1) return bad(res, 'This pass was just used.');
  const updated = await prisma.gatePass.findUnique({ where: { id: pass.id } });
  await writeGatePassAudit(req, 'GATEPASS_VERIFIED', pass.id, { passCode, student: s?.name, pickup: pass.parentName, usedAt: updated.usedAt });
  res.json({
    success: true,
    data: { ...updated, student: studentView(s), pickup: pickupOf(updated) },
    message: `Release ${s?.name || 'the student'} to ${pass.parentName}${pass.relation ? ` (${pass.relation})` : ''}.`,
  });
}));

router.post('/:id/revoke', wrap(async (req, res) => {
  const passId = parseInt(req.params.id, 10);
  const pass = await prisma.gatePass.findFirst({ where: { id: passId, schoolId: req.schoolId } });
  if (!pass) return bad(res, 'Gate pass not found.', 404);
  if (pass.status === 'used') return bad(res, 'Used pass cannot be revoked.');
  const revoked = await prisma.gatePass.update({ where: { id: pass.id }, data: { status: 'expired' } });
  await writeGatePassAudit(req, 'GATEPASS_REVOKED', pass.id, { passCode: pass.passCode, pickup: pass.parentName, reason: req.body?.reason || 'manual' });
  res.json({ success: true, data: revoked, message: 'Gate pass cancelled.' });
}));

router.get('/audit', wrap(async (req, res) => {
  const logs = await prisma.auditLog.findMany({ where: { schoolId: req.schoolId, resource: 'gate_pass' }, orderBy: { createdAt: 'desc' }, take: 200 });
  const uids = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
  const users = uids.length ? await prisma.user.findMany({ where: { id: { in: uids }, schoolId: req.schoolId }, select: { id: true, name: true } }) : [];
  const U = new Map(users.map((u) => [u.id, u.name]));
  const LABEL = { GATEPASS_ISSUED: 'Issued', GATEPASS_VERIFIED: 'Released at the gate', GATEPASS_REVOKED: 'Cancelled' };
  res.json({
    success: true,
    data: logs.map((l) => {
      let d = {};
      try { d = JSON.parse(l.details || '{}') || {}; } catch { d = {}; }
      return { ...l, label: LABEL[l.action] || l.action, byName: U.get(l.userId) || null, passCode: d.passCode || null, studentName: d.student || null, pickup: d.pickup || null };
    }),
  });
}));

module.exports = router;
module.exports.cleanPhone = cleanPhone;
module.exports.cleanCnic = cleanCnic;
module.exports.sameName = sameName;
