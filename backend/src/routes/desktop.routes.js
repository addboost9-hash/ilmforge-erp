/**
 * Routes only the IlmForge desktop app uses, on its own computer:
 *
 *   GET  /api/v1/desktop/status   is a school set up here yet?
 *   POST /api/v1/desktop/setup    first run: create the school and its admin
 *   POST /api/v1/desktop/import   first run: load a .ilmforge transfer file
 *   POST /api/v1/desktop/backup   copy the live database to a file
 *
 * They answer only when the server runs as the desktop app, only to this
 * computer (never to another device on the school network), and only with
 * the app's own token, which the desktop app hands the server at start.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const router = express.Router();
const prisma = require('../config/prisma');
const slugUtil = require('../utils/slug');
const { importSchool } = require('../services/transfer.service');

const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
router.use((req, res, next) => {
  if (process.env.ILMFORGE_DESKTOP !== '1') return res.status(404).json({ success: false, message: 'Not found.' });
  if (!isLocal(req) || !process.env.DESKTOP_TOKEN || req.get('x-desktop-token') !== process.env.DESKTOP_TOKEN) {
    return res.status(403).json({ success: false, message: 'Only the IlmForge desktop app on this computer can do this.' });
  }
  next();
});
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch((e) => (e.status ? res.status(e.status).json({ success: false, message: e.message }) : next(e)));

router.get('/status', wrap(async (req, res) => {
  const schools = await prisma.school.findMany({ where: { deletedAt: null }, select: { id: true, name: true, slug: true } });
  res.json({ success: true, data: { schools: schools.length, school: schools[0] || null } });
}));

/* First run: the school and its admin, with no emailed code (there may be
   no internet, and this computer is the school's own). */
router.post('/setup', wrap(async (req, res) => {
  if (await prisma.school.count()) return res.status(409).json({ success: false, message: 'A school is already set up on this computer.' });
  const b = req.body || {};
  const schoolName = String(b.schoolName || '').trim();
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').trim();
  const password = String(b.password || '');
  const errors = {};
  if (schoolName.length < 3) errors.schoolName = 'Enter the school\'s full name.';
  if (name.length < 2) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter an email address (it is your sign-in).';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: Object.values(errors)[0], errors });
  const passwordHash = await bcrypt.hash(password, 12);
  const slug = await slugUtil.freeSlug(prisma, schoolName);
  const out = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({ data: { name: schoolName, slug, email, phone: phone || null, plan: String(b.plan || 'standard') } });
    const campus = await tx.campus.create({ data: { schoolId: school.id, name: 'Main Campus', isMain: true } });
    const user = await tx.user.create({
      data: {
        schoolId: school.id, campusId: campus.id, name, email, phone: phone || null, role: 'admin',
        passwordHash, mustChangePassword: false, phoneVerifiedAt: new Date(), emailVerifiedAt: new Date(),
      },
    });
    return { school, user };
  });
  res.status(201).json({ success: true, data: { school: { id: out.school.id, name: out.school.name }, email } });
}));

/* First run: a school brought from the online app (a .ilmforge file). */
router.post('/import', wrap(async (req, res) => {
  const file = String(req.body?.filePath || '');
  if (!file || !fs.existsSync(file)) return res.status(400).json({ success: false, message: 'Choose the .ilmforge file.' });
  const buffer = fs.readFileSync(file);
  const out = await importSchool(buffer);
  // Its users signed in online; on this computer they are already trusted.
  await prisma.user.updateMany({ where: { phoneVerifiedAt: null, role: { in: ['admin', 'super_admin'] } }, data: { phoneVerifiedAt: new Date() } });
  // Online trial or suspension does not carry over: the desktop licence
  // decides here (a trial school could not even sign in).
  await prisma.school.updateMany({ data: { status: 'active', trialEndsAt: null, suspendReason: null } });
  const total = Object.values(out.counts).reduce((a, b) => a + b, 0);
  res.json({ success: true, data: { ...out, total } });
}));

/* A forgotten password, with no internet for an emailed code: reset on the
   school's own computer, from the IlmForge app (Help → Reset a password).
   Whoever can use this computer already holds the school's data file. */
router.get('/admins', wrap(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, role: { in: ['super_admin', 'admin', 'principal', 'accountant'] } },
    select: { id: true, name: true, email: true, role: true, isActive: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  res.json({ success: true, data: users });
}));

router.post('/reset-password', wrap(async (req, res) => {
  const id = parseInt(req.body?.userId, 10);
  const password = String(req.body?.password || '');
  if (!id) return res.status(400).json({ success: false, message: 'Choose whose password to reset.' });
  if (password.length < 8) return res.status(400).json({ success: false, message: 'Use at least 8 characters.' });
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true, email: true, schoolId: true } });
  if (!user) return res.status(404).json({ success: false, message: 'That user was not found.' });
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false, isActive: true } });
  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, userId: id, action: 'PASSWORD_RESET_ON_COMPUTER', resource: 'user', resourceId: id, details: 'Reset in the IlmForge desktop app' },
  }).catch(() => null);
  res.json({ success: true, data: { name: user.name, email: user.email } });
}));

/* A complete copy of the live database (consistent even while in use). */
router.post('/backup', wrap(async (req, res) => {
  const target = String(req.body?.filePath || '');
  if (!target || !path.isAbsolute(target)) return res.status(400).json({ success: false, message: 'filePath must be a full path.' });
  if (fs.existsSync(target)) fs.unlinkSync(target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  res.json({ success: true, data: { filePath: target, size: fs.statSync(target).size } });
}));

module.exports = router;
