/**
 * IlmForge — Platform Owner Control Panel
 *
 * ONLY accessible with PLATFORM_OWNER_KEY from .env
 * This gives you (Ghulam Mujtaba) full control over ALL schools
 *
 * Endpoints:
 *   GET  /platform/schools          — list all schools
 *   GET  /platform/schools/:id      — school details
 *   POST /platform/schools/:id/activate    — activate school
 *   POST /platform/schools/:id/suspend     — suspend school access
 *   POST /platform/schools/:id/license     — generate offline license key
 *   DELETE /platform/schools/:id/license   — revoke offline license
 *   POST /platform/schools/:id/plan        — change plan
 *   GET  /platform/stats            — platform-wide stats
 */

const express   = require('express');
const router    = express.Router();
const prisma    = require('../config/prisma');
const crypto    = require('crypto');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

/* ── Platform Owner Authentication ──────────────────────────────
   Use a secret key from .env — NOT a school admin account
   Header: x-platform-key: YOUR_SECRET_KEY
────────────────────────────────────────────────────────────── */
const platformAuth = (req, res, next) => {
  const key = req.headers['x-platform-key'];
  const validKey = process.env.PLATFORM_OWNER_KEY;

  if (!validKey) {
    return res.status(503).json({ success: false, message: 'Platform control not configured. Set PLATFORM_OWNER_KEY in .env' });
  }
  if (!key || key !== validKey) {
    return res.status(403).json({ success: false, message: 'Invalid platform key. Access denied.' });
  }
  next();
};

/* ── License Key Generator ───────────────────────────────────── */
function generateLicenseKey(schoolId, plan, expiryDate) {
  const data = `ILMFORGE-${schoolId}-${plan}-${expiryDate.toISOString().split('T')[0]}`;
  const signature = crypto
    .createHmac('sha256', process.env.LICENSE_SECRET || 'IlmForgeLicenseSecret2026')
    .update(data)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase();
  return `ILM-${String(schoolId).padStart(4,'0')}-${plan.toUpperCase().substring(0,4)}-${signature}`;
}

/* ── Validate License Key ────────────────────────────────────── */
function validateLicenseKey(key, schoolId, plan, expiryDate) {
  const expected = generateLicenseKey(schoolId, plan, expiryDate);
  return key === expected;
}

/* ═══ APPLY PLATFORM AUTH TO ALL ROUTES ════════════════════════ */
router.use(platformAuth);

/* ── GET /platform/stats ─────────────────────────────────────── */
router.get('/stats', wrap(async (req, res) => {
  const [totalSchools, activeSchools, suspendedSchools, freeSchools, paidSchools, totalStudents] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { status: 'active' } }),
    prisma.school.count({ where: { status: { in: ['suspended', 'inactive'] } } }),
    prisma.school.count({ where: { plan: 'free' } }),
    prisma.school.count({ where: { plan: { not: 'free' } } }),
    prisma.student.count({ where: { status: 'active', deletedAt: null } }),
  ]);

  res.json({
    success: true,
    data: {
      totalSchools, activeSchools, suspendedSchools,
      freeSchools, paidSchools, totalStudents,
      revenue: { monthly: paidSchools * 2500, note: 'Estimated at Rs.2500 avg/school' },
    }
  });
}));

/* ── GET /platform/schools ───────────────────────────────────── */
router.get('/schools', wrap(async (req, res) => {
  const { status, plan, search, page = 1, limit = 25 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(status && { status }),
    ...(plan && { plan }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }),
  };

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      skip,
      take: parseInt(limit),
      select: {
        id: true, name: true, slug: true, email: true, phone: true,
        city: true, plan: true, status: true, trialEndsAt: true,
        licenseKey: true, licenseExpiry: true,
        suspendedAt: true, suspendReason: true, maxStudents: true,
        activatedAt: true, lastSeenAt: true, createdAt: true,
        _count: { select: { users: true, campuses: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.school.count({ where }),
  ]);

  res.json({ success: true, data: schools, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}));

/* ── GET /platform/schools/:id ───────────────────────────────── */
router.get('/schools/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      campuses: true,
      _count: { select: { users: true } },
    },
  });
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });

  const studentCount = await prisma.student.count({ where: { schoolId: id, status: 'active', deletedAt: null } });
  res.json({ success: true, data: { ...school, studentCount } });
}));

/* ── POST /platform/schools/:id/activate ────────────────────── */
router.post('/schools/:id/activate', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const { plan, trialDays, maxStudents } = req.body;

  const trialEndsAt = trialDays
    ? new Date(Date.now() + parseInt(trialDays) * 24 * 60 * 60 * 1000)
    : null;

  const PLAN_LIMITS = { free: 100, starter: 300, standard: 800, premium: 999999 };

  const school = await prisma.school.update({
    where: { id },
    data: {
      status: 'active',
      plan: plan || 'free',
      trialEndsAt,
      activatedAt: new Date(),
      suspendedAt: null,
      suspendReason: null,
      maxStudents: maxStudents || PLAN_LIMITS[plan || 'free'] || 100,
    },
  });

  res.json({ success: true, message: `School "${school.name}" activated on ${plan || 'free'} plan.`, data: school });
}));

/* ── POST /platform/schools/:id/suspend ─────────────────────── */
router.post('/schools/:id/suspend', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const { reason = 'Suspended by platform admin' } = req.body;

  const school = await prisma.school.update({
    where: { id },
    data: {
      status: 'suspended',
      suspendedAt: new Date(),
      suspendReason: reason,
    },
  });

  res.json({
    success: true,
    message: `School "${school.name}" suspended.`,
    note: 'All users will see "Account Suspended" on next login.',
    data: { id: school.id, name: school.name, status: school.status, reason },
  });
}));

/* ── POST /platform/schools/:id/reactivate ──────────────────── */
router.post('/schools/:id/reactivate', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const school = await prisma.school.update({
    where: { id },
    data: { status: 'active', suspendedAt: null, suspendReason: null },
  });
  res.json({ success: true, message: `School "${school.name}" reactivated.`, data: school });
}));

/* ── POST /platform/schools/:id/license ─────────────────────── */
router.post('/schools/:id/license', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const { days = 365, plan = 'standard' } = req.body;

  const school = await prisma.school.findUnique({ where: { id }, select: { id: true, name: true, plan: true } });
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });

  const expiryDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);
  const licenseKey = generateLicenseKey(id, plan, expiryDate);

  await prisma.school.update({
    where: { id },
    data: {
      licenseKey,
      licenseExpiry: expiryDate,
      plan,
      status: 'active',
    },
  });

  res.json({
    success: true,
    message: `Offline license generated for "${school.name}"`,
    data: {
      licenseKey,
      expiryDate: expiryDate.toLocaleDateString('en-PK'),
      daysValid: days,
      plan,
      instructions: `School admin ko yeh key dain. App → Settings → License mein enter karein.`,
    }
  });
}));

/* ── DELETE /platform/schools/:id/license ───────────────────── */
router.delete('/schools/:id/license', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const school = await prisma.school.findUnique({ where: { id }, select: { name: true } });

  await prisma.school.update({
    where: { id },
    data: { licenseKey: null, licenseExpiry: null, status: 'suspended', suspendReason: 'License revoked by platform admin' },
  });

  res.json({ success: true, message: `License revoked for "${school?.name}". Offline access disabled.` });
}));

/* ── POST /platform/schools/:id/plan ────────────────────────── */
router.post('/schools/:id/plan', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const { plan, maxStudents } = req.body;
  const PLAN_LIMITS = { free: 100, starter: 300, standard: 800, premium: 999999 };

  const school = await prisma.school.update({
    where: { id },
    data: {
      plan,
      maxStudents: maxStudents || PLAN_LIMITS[plan] || 100,
    },
  });

  res.json({ success: true, message: `Plan updated to ${plan} for "${school.name}"`, data: school });
}));

/* ── POST /platform/validate-license (public — for offline check) ── */
// Remove platform auth for this one endpoint
router.post('/validate-license', (req, res, next) => next(), wrap(async (req, res) => {
  const { licenseKey, schoolId } = req.body;
  if (!licenseKey || !schoolId) {
    return res.status(400).json({ success: false, message: 'licenseKey and schoolId required' });
  }

  const school = await prisma.school.findFirst({
    where: { id: parseInt(schoolId), licenseKey },
    select: { id: true, name: true, plan: true, licenseKey: true, licenseExpiry: true, status: true },
  });

  if (!school) {
    return res.status(403).json({ success: false, valid: false, message: 'Invalid license key' });
  }

  if (school.status === 'suspended') {
    return res.status(403).json({ success: false, valid: false, message: 'School account suspended' });
  }

  const now = new Date();
  if (school.licenseExpiry && new Date(school.licenseExpiry) < now) {
    return res.status(403).json({ success: false, valid: false, message: 'License expired', expiredOn: school.licenseExpiry });
  }

  const daysLeft = school.licenseExpiry
    ? Math.ceil((new Date(school.licenseExpiry) - now) / (1000 * 60 * 60 * 24))
    : null;

  res.json({
    success: true,
    valid: true,
    data: {
      schoolName: school.name,
      plan: school.plan,
      daysLeft,
      expiryDate: school.licenseExpiry,
      message: daysLeft !== null ? `License valid — ${daysLeft} days remaining` : 'License valid (no expiry)',
    }
  });
}));

/* ── DELETE /platform/schools/cleanup-email ─────────────────
   Testing only — archive a school by email so you can re-register
   Body: { email: "test@example.com" }
─────────────────────────────────────────────────────────── */
router.delete('/cleanup-email', wrap(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'email required' });

  const prisma = require('../config/prisma');

  // Find all schools/users with this email
  const schools = await prisma.school.findMany({ where: { email: email.toLowerCase() } });
  const users   = await prisma.user.findMany({ where: { email: email.toLowerCase() } });

  if (schools.length === 0 && users.length === 0) {
    return res.json({ success: true, message: `No records found for ${email} — you can register fresh!` });
  }

  // Archive (soft-delete) schools
  const archivedSchools = [];
  for (const school of schools) {
    const archived = `archived-${school.id}-${Date.now()}@deleted.local`;
    await prisma.school.update({
      where: { id: school.id },
      data: { email: archived, status: 'inactive', deletedAt: new Date() },
    });
    archivedSchools.push({ id: school.id, name: school.name, archivedEmail: archived });
  }

  // Archive users with this email
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: `archived-${user.id}-${Date.now()}@deleted.local`, deletedAt: new Date(), isActive: false },
    });
  }

  res.json({
    success: true,
    message: `✅ Email "${email}" cleared! Aap ab is email se nayi school register kar saktay hain.`,
    archived: { schools: archivedSchools.length, users: users.length },
    details: archivedSchools,
  });
}));

/* ── POST /platform/test-email ──────────────────────────────
   Test email sending from platform panel
─────────────────────────────────────────────────────────── */
router.post('/test-email', wrap(async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ success: false, message: 'to email required' });

  const { sendEmail, isEmailConfigured, verifySmtpConnection } = require('../services/email.service');

  if (!isEmailConfigured()) {
    return res.json({ success: false, message: 'SMTP not configured. Add SMTP_USER + SMTP_PASS to Render env vars.' });
  }

  const verify = await verifySmtpConnection();
  if (!verify.success) {
    return res.json({ success: false, message: `SMTP connect fail: ${verify.error}`, host: process.env.SMTP_HOST });
  }

  const result = await sendEmail({
    to,
    subject: '✅ IlmForge Platform Email Test',
    html: `<h2>✅ Email Working!</h2><p>IlmForge platform email test successful.</p><p>SMTP: ${process.env.SMTP_HOST}</p>`,
    text: 'IlmForge email test OK',
  });

  res.json({
    success: result.success,
    message: result.success ? `Test email sent to ${to}` : `Failed: ${result.error}`,
    smtp: { host: process.env.SMTP_HOST, user: process.env.SMTP_USER },
  });
}));

module.exports = router;
