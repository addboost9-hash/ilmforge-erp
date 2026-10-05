/**
 * IlmForge — public routes for a school's own pages (no sign-in).
 *
 * Every lookup is by the school's slug, the part of its links that names it
 * (ilmforge-erp.vercel.app/s/<slug>). So a school's admission form only ever
 * shows that school's name, logo, campuses and classes, and an application
 * sent from it is saved to that school and nowhere else.
 *
 *   GET  /api/v1/public/school/:slug       branding + campuses + classes
 *   POST /api/v1/public/admissions/:slug   the online admission form
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../config/prisma');
const { sendEmail } = require('../services/email.service');
const { parseApplication, applicationNotes, reference } = require('../utils/admissionApplication');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* Same presets as Settings › Theme (frontend/src/pages/settings/ThemeSettingsPage.jsx). */
const THEME_PRESETS = {
  'Navy Blue': ['#1E3A5F', '#0D9488'],
  Dark: ['#111827', '#374151'],
  Purple: ['#4C1D95', '#7C3AED'],
  Green: ['#14532D', '#15803D'],
  Red: ['#7F1D1D', '#DC2626'],
  Blue: ['#1E3A8A', '#2563EB'],
  Orange: ['#78350F', '#D97706'],
  Teal: ['#134E4A', '#0F766E'],
};
const HEX = /^#[0-9a-f]{6}$/i;

function brandOf(settingsJson) {
  let theme = {};
  try { theme = JSON.parse(settingsJson || '{}').theme || {}; } catch { /* default brand */ }
  const preset = THEME_PRESETS[theme.selectedTheme] || THEME_PRESETS['Navy Blue'];
  const custom = theme.applyMode === 'custom';
  return {
    primary: custom && HEX.test(theme.customPrimary || '') ? theme.customPrimary : preset[0],
    secondary: custom && HEX.test(theme.customSecondary || '') ? theme.customSecondary : preset[1],
  };
}

const findSchool = (slug, select) => prisma.school.findFirst({
  where: { slug: String(slug || '').trim().toLowerCase(), status: 'active', deletedAt: null },
  select,
});

const schoolLists = (schoolId) => Promise.all([
  prisma.campus.findMany({ where: { schoolId }, select: { id: true, name: true, isMain: true }, orderBy: [{ isMain: 'desc' }, { name: 'asc' }] }),
  prisma.class.findMany({ where: { schoolId, isActive: true }, select: { id: true, name: true }, orderBy: [{ orderNo: 'asc' }, { name: 'asc' }] }),
]);

// GET /api/v1/public/school/:slug
router.get('/school/:slug', wrap(async (req, res) => {
  const school = await findSchool(req.params.slug, {
    id: true, name: true, slug: true, logoUrl: true, email: true, city: true, address: true, phone: true, settingsJson: true,
  });
  if (!school) return res.status(404).json({ success: false, message: 'School not found. Please check the link your school shared.' });
  const [campuses, classes] = await schoolLists(school.id);
  const { settingsJson, ...pub } = school;
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    success: true,
    data: { ...pub, brand: brandOf(settingsJson), campuses: campuses.map(({ isMain, ...c }) => c), classes },
  });
}));

/* A real family applies once or twice; a script tries hundreds. Set with
   room to spare: if a proxy ever made many parents look like one address,
   a busy admissions week must still get through. Duplicates and bots are
   stopped separately below. */
const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.params.slug || '').toLowerCase()}`,
  message: { success: false, message: 'Too many applications from this connection. Please try again in 15 minutes.' },
});

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// POST /api/v1/public/admissions/:slug
router.post('/admissions/:slug', applyLimiter, wrap(async (req, res) => {
  const school = await findSchool(req.params.slug, { id: true, name: true, email: true, phone: true });
  if (!school) return res.status(404).json({ success: false, message: 'School not found. Please check the link your school shared.' });

  // Hidden field a person never fills in; form-filling bots usually do.
  // Answer as if it worked so the bot learns nothing.
  if (String(req.body?.website || '').trim()) {
    return res.status(201).json({ success: true, data: { reference: 'ADM-00000', schoolName: school.name, schoolPhone: school.phone || '' } });
  }

  const [campuses, classes] = await schoolLists(school.id);
  const { errors, value } = parseApplication(req.body, { classes, campuses });
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: Object.values(errors)[0], errors });
  }

  // A double-click or a second try a few minutes later is the same application.
  const recent = await prisma.admissionInquiry.findMany({
    where: { schoolId: school.id, phone: value.phone, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
    select: { id: true, name: true },
  });
  const dup = recent.find((r) => r.name.trim().toLowerCase() === value.studentName.toLowerCase());
  if (dup) {
    return res.json({
      success: true,
      data: { reference: reference(dup.id), schoolName: school.name, schoolPhone: school.phone || '', duplicate: true },
    });
  }

  const inquiry = await prisma.admissionInquiry.create({
    data: {
      schoolId: school.id,
      campusId: value.campusId || null,
      name: value.studentName,
      phone: value.phone,
      classInterested: value.classInterested,
      notes: applicationNotes(value),
      status: 'open',
    },
  });
  const ref = reference(inquiry.id);

  // Tell the office straight away. Best effort: the application is already
  // saved and shows in the admin bell even if email is not set up.
  if (school.email) {
    const rows = [
      ['Reference', ref], ['Student', value.studentName], ['Class', value.classInterested],
      ['Father / guardian', value.fatherName], ['Phone', value.phone], ['Campus', value.campusName],
      ['Date of birth', value.dob], ['Email', value.email], ['Address', value.address],
    ].filter(([, v]) => v);
    sendEmail({
      to: school.email,
      subject: `New admission application: ${value.studentName} (${value.classInterested}) — ${ref}`,
      html: `<p>A new admission application was submitted on <strong>${esc(school.name)}</strong>'s online form.</p>
        <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
        ${rows.map(([k, v]) => `<tr><td style="color:#64748B">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}
        </table><p>Open IlmForge › Admissions › Admission Inquiries to follow it up.</p>`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    }).catch(() => { /* logged by the email service */ });
  }

  res.status(201).json({ success: true, data: { reference: ref, schoolName: school.name, schoolPhone: school.phone || '' } });
}));

module.exports = router;
module.exports.brandOf = brandOf;
