const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------------------------------------------------------------------------
// DB-based settings store — uses School.settingsJson column
// Replaces the old file-based store that failed on Render (ephemeral FS)
// ---------------------------------------------------------------------------
const getSchoolSettings = async (schoolId) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { settingsJson: true },
    });
    if (!school?.settingsJson) return {};
    return JSON.parse(school.settingsJson);
  } catch {
    return {};
  }
};

const setSchoolSettings = async (schoolId, patch) => {
  const existing = await getSchoolSettings(schoolId);
  const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  await prisma.school.update({
    where: { id: schoolId },
    data: { settingsJson: JSON.stringify(merged) },
  });
  return merged;
};

// ---------------------------------------------------------------------------
// Generic settings bag — arbitrary keys merged into School.settingsJson.
// Used by pages that store a single named blob (e.g. smsTemplates) that
// doesn't warrant its own dedicated sub-route.
// ---------------------------------------------------------------------------
router.get('/', wrap(async (req, res) => {
  const settings = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: settings });
}));

router.put('/', wrap(async (req, res) => {
  const settings = await setSchoolSettings(req.schoolId, req.body || {});
  res.json({ success: true, data: settings });
}));

router.get('/school', wrap(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.schoolId }, include: { campuses: true } });
  res.json({ success: true, data: school });
}));

router.put('/school', wrap(async (req, res) => {
  const allowed = ['name','address','city','phone','email','logoUrl','subdomain'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  const school = await prisma.school.update({ where: { id: req.schoolId }, data });
  res.json({ success: true, data: school });
}));

router.get('/sessions', wrap(async (req, res) => {
  const sessions = await prisma.academicSession.findMany({ where: { schoolId: req.schoolId }, orderBy: { startDate: 'desc' } });
  res.json({ success: true, data: sessions });
}));

// GET /settings/admins — administrator accounts for this school.
// The launch checklist counts these; with no such endpoint it always read
// zero, so the "Admin Accounts" setup step could never be satisfied.
// Never returns passwordHash.
router.get('/admins', wrap(async (req, res) => {
  const admins = await prisma.user.findMany({
    where: {
      schoolId: req.schoolId,
      role: { in: ['super_admin', 'admin'] },
      deletedAt: null,
    },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      isActive: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: admins });
}));

router.post('/sessions', wrap(async (req, res) => {
  const { name, startDate, endDate, isActive } = req.body;
  if (isActive) await prisma.academicSession.updateMany({ where: { schoolId: req.schoolId }, data: { isActive: false } });
  const session = await prisma.academicSession.create({ data: { schoolId: req.schoolId, name, startDate: new Date(startDate), endDate: new Date(endDate), isActive: isActive || false } });
  res.status(201).json({ success: true, data: session });
}));

// ---------------------------------------------------------------------------
// Campuses — real Campus rows (schoolId-scoped), used by CampusesPage.
// ---------------------------------------------------------------------------
router.post('/campuses', wrap(async (req, res) => {
  const { name, city, address, phone, isMain } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Campus name is required.' });

  if (isMain) {
    await prisma.campus.updateMany({ where: { schoolId: req.schoolId }, data: { isMain: false } });
  }

  const campus = await prisma.campus.create({
    data: { schoolId: req.schoolId, name, city: city || null, address: address || null, phone: phone || null, isMain: !!isMain },
  });
  res.status(201).json({ success: true, data: campus });
}));

// ---------------------------------------------------------------------------
// Exam settings — grading, division thresholds and marksheet layout options,
// stored per-school on the ExamSettings model.
//
// FIX: this previously read/wrote a fictional field set (passPercentage,
// gradeThresholds, showGradeOnResult, showPositionOnResult, allowGraceMarks,
// maxGraceMarksPerSubject) that exists on NEITHER the ExamSettings Prisma
// model (schema.prisma: passingMarks, gradeAPlus/A/B/C/D, firstDivision/
// secondDivision/thirdDivision, showRankOnMarksheet, showPercentage,
// showGrade, showAttendance, ...) NOR the ExamSettingsPage.jsx form fields
// (passingMarks, gradeAPlus.., firstDivisionPercent, showPercentageOnMarksheet,
// ...). Since the body keys the frontend actually sends never matched
// `passPercentage`/`gradeThresholds`/etc., PUT always silently produced an
// empty update — the admin's "Saved!" toast was a lie, nothing persisted, and
// exam.routes.js's own grade calculator (calcGradeFromThresholds/
// loadThresholds) could never see a school's configured grade boundaries.
// Field names below map 1:1 to the real schema columns; a handful differ
// only in their frontend form-state key spelling (see FIELD_MAP).
// ---------------------------------------------------------------------------

// frontend form field -> ExamSettings column (only where the names differ)
const EXAM_SETTINGS_FIELD_MAP = {
  showPercentageOnMarksheet: 'showPercentage',
  showGradeOnMarksheet: 'showGrade',
  showAttendanceOnMarksheet: 'showAttendance',
  firstDivisionPercent: 'firstDivision',
  secondDivisionPercent: 'secondDivision',
  thirdDivisionPercent: 'thirdDivision',
};
const EXAM_SETTINGS_FIELD_MAP_REVERSE = Object.fromEntries(
  Object.entries(EXAM_SETTINGS_FIELD_MAP).map(([fe, db]) => [db, fe])
);
const EXAM_SETTINGS_INT_FIELDS = new Set([
  'passingMarks', 'gradeAPlus', 'gradeA', 'gradeB', 'gradeC', 'gradeD',
  'firstDivision', 'secondDivision', 'thirdDivision',
]);
const EXAM_SETTINGS_BOOL_FIELDS = new Set([
  'showRankOnMarksheet', 'showPercentage', 'showGrade', 'showAttendance',
  'showTeacherSignature', 'showPrincipalSignature',
]);
const EXAM_SETTINGS_STRING_FIELDS = new Set([
  'admitCardInstructions', 'resultCardHeader', 'failCriteria', 'gradingSystem',
]);

// Default exam settings returned when no record exists — keyed exactly like
// ExamSettingsPage.jsx's own DEFAULTS so the form never sees an unrecognized shape.
const DEFAULT_EXAM_SETTINGS = {
  admitCardInstructions: '',
  failCriteria: 'less_than_passing',
  passingMarks: 40,
  gradingSystem: 'percentage',
  gradeAPlus: 90, gradeA: 80, gradeB: 65, gradeC: 50, gradeD: 40,
  showRankOnMarksheet: true,
  showPercentageOnMarksheet: true,
  showGradeOnMarksheet: true,
  showAttendanceOnMarksheet: false,
  showTeacherSignature: true,
  showPrincipalSignature: true,
  resultCardHeader: '',
  firstDivisionPercent: 60,
  secondDivisionPercent: 45,
  thirdDivisionPercent: 33,
};

// Convert a raw ExamSettings row (DB column names) into the frontend's field-name shape
const toFrontendExamSettings = (settings) => {
  const out = {};
  for (const [dbField, value] of Object.entries(settings)) {
    out[EXAM_SETTINGS_FIELD_MAP_REVERSE[dbField] || dbField] = value;
  }
  return out;
};

// GET /settings/exam — find ExamSettings by schoolId; if not found return defaults
router.get('/exam', wrap(async (req, res) => {
  try {
    const settings = await prisma.examSettings.findFirst({ where: { schoolId: req.schoolId } });
    if (!settings) {
      return res.json({ success: true, data: { ...DEFAULT_EXAM_SETTINGS, schoolId: req.schoolId, isDefault: true } });
    }
    res.json({ success: true, data: toFrontendExamSettings(settings) });
  } catch (err) {
    // ExamSettings model may not exist in this schema version
    res.json({ success: true, data: { ...DEFAULT_EXAM_SETTINGS, schoolId: req.schoolId, isDefault: true }, warning: 'ExamSettings model not available; returning defaults.' });
  }
}));

// PUT /settings/exam — upsert ExamSettings for schoolId
router.put('/exam', wrap(async (req, res) => {
  const data = {};
  for (const [feField, value] of Object.entries(req.body || {})) {
    if (value === undefined) continue;
    const dbField = EXAM_SETTINGS_FIELD_MAP[feField] || feField;
    if (EXAM_SETTINGS_INT_FIELDS.has(dbField)) data[dbField] = parseInt(value) || 0;
    else if (EXAM_SETTINGS_BOOL_FIELDS.has(dbField)) data[dbField] = Boolean(value);
    else if (EXAM_SETTINGS_STRING_FIELDS.has(dbField)) data[dbField] = String(value);
    // Any other key (e.g. isDefault, schoolId) is ignored — not a real column.
  }

  try {
    const existing = await prisma.examSettings.findFirst({ where: { schoolId: req.schoolId } });
    let settings;
    if (existing) {
      settings = await prisma.examSettings.update({ where: { id: existing.id }, data });
    } else {
      settings = await prisma.examSettings.create({ data: { schoolId: req.schoolId, ...data } });
    }
    res.json({ success: true, data: toFrontendExamSettings(settings) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save exam settings.', detail: err.message });
  }
}));

// ---------------------------------------------------------------------------
// Payment settings persisted in backend JSON store (school-scoped)
// ---------------------------------------------------------------------------

const DEFAULT_PAYMENT_SETTINGS = {
  bank: {
    bankName: '',
    branch: '',
    accountTitle: '',
    accountNumber: '',
  },
  voucher: {
    headerText: 'School Fee Voucher',
    footerText: 'Thank you for timely payment. Keep this voucher as your receipt.',
    showLogo: true,
    showBarcode: true,
    copies: '2',
    thermalPrinter: false,
  },
};

router.get('/payment', wrap(async (req, res) => {
  const settings = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: settings.payment || DEFAULT_PAYMENT_SETTINGS });
}));

router.put('/payment', wrap(async (req, res) => {
  const incoming = req.body || {};
  const payment = {
    bank: { ...DEFAULT_PAYMENT_SETTINGS.bank, ...(incoming.bank || {}) },
    voucher: { ...DEFAULT_PAYMENT_SETTINGS.voucher, ...(incoming.voucher || {}) },
  };
  const settings = await setSchoolSettings(req.schoolId, { payment });
  res.json({ success: true, data: settings.payment });
}));

// ---------------------------------------------------------------------------
// Theme settings persisted in backend JSON store (school-scoped)
// ---------------------------------------------------------------------------

const DEFAULT_THEME_SETTINGS = {
  selectedTheme: 'Navy Blue',
  customPrimary: '#1E3A5F',
  customSecondary: '#0D9488',
  applyMode: 'preset',
};

router.get('/theme', wrap(async (req, res) => {
  const settings = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: settings.theme || DEFAULT_THEME_SETTINGS });
}));

router.put('/theme', wrap(async (req, res) => {
  const incoming = req.body || {};
  const theme = { ...DEFAULT_THEME_SETTINGS, ...incoming };
  const settings = await setSchoolSettings(req.schoolId, { theme });
  res.json({ success: true, data: settings.theme });
}));

// ---------------------------------------------------------------------------
// Website settings persisted in backend JSON store (school-scoped)
// ---------------------------------------------------------------------------

const DEFAULT_WEBSITE_SETTINGS = {
  enableWebsite: 'No',
  aboutUs: '',
  schoolTiming: '',
  welcomeText: '',
  schoolEmail: '',
  twitterLink: '',
  contactNumber: '',
  facebookPage: '',
  sliderTitle: 'For Every Child',
  sliderSubTitle: 'Quality Education',
  sliderDetails: '',
  feature1Title: '',
  feature1Details: '',
  feature2Title: '',
  feature2Details: '',
  feature3Title: '',
  feature3Details: '',
  feature4Title: '',
  feature4Details: '',
  aboutSchool: '',
  classesText: '',
  studentsEnrolled: '0',
  classesCompleted: '0',
  awardsWon: '0',
  coursesCompleted: '0',
  facilitiesText: '',
  fac1Title: '',
  fac1Text: '',
  fac2Title: '',
  fac2Text: '',
  fac3Title: '',
  fac3Text: '',
  galleryText: '',
  noticeboardText: '',
  principalTitle: '',
  principalMessage: '',
  googleMapEmbed: '',
  primaryColor: '#0F766E',
  secondaryColor: '#D97706',
  logoPreview: null,
  sliderBg: null,
};

router.get('/website', wrap(async (req, res) => {
  const settings = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: settings.website || DEFAULT_WEBSITE_SETTINGS });
}));

router.put('/website', wrap(async (req, res) => {
  // Two different frontend pages (WebsiteSettingsPage + WebsiteManagementPage)
  // both write partial, differently-shaped payloads into this same bag. Merge
  // onto the previously-saved value (not just the defaults) so saving from
  // one page doesn't wipe out fields only the other page knows about.
  const existing = await getSchoolSettings(req.schoolId);
  const website = { ...DEFAULT_WEBSITE_SETTINGS, ...(existing.website || {}), ...(req.body || {}) };
  const settings = await setSchoolSettings(req.schoolId, { website });
  res.json({ success: true, data: settings.website });
}));

// ---------------------------------------------------------------------------
// SMTP Test — send a test email to verify configuration
// ---------------------------------------------------------------------------
router.post('/smtp-test', wrap(async (req, res) => {
  const { sendEmail, verifySmtpConnection, isEmailConfigured } = require('../services/email.service');
  const { testEmail } = req.body;

  if (!isEmailConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'SMTP not configured. Set SMTP_USER and SMTP_PASS in environment variables.',
      configured: false,
    });
  }

  // First verify connection
  const verify = await verifySmtpConnection();
  if (!verify.success) {
    return res.status(502).json({ success: false, message: `SMTP connection failed: ${verify.error}`, configured: true, connected: false });
  }

  // Send test email
  const to = testEmail || req.user?.email || 'test@example.com';
  const result = await sendEmail({
    to,
    subject: '✅ IlmForge SMTP Test — Email Working!',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#1B2F6E,#0073b7);color:white;padding:24px;text-align:center;">
          <div style="font-size:36px;">✅</div>
          <h2 style="margin:6px 0 0;">Email Test Successful!</h2>
        </div>
        <div style="padding:24px;">
          <p>Congratulations! Your IlmForge email system is working perfectly.</p>
          <p><strong>Provider:</strong> ${process.env.SMTP_HOST}</p>
          <p><strong>From:</strong> ${process.env.FROM_EMAIL || process.env.SMTP_USER}</p>
          <p style="color:#94a3b8;font-size:12px;">— IlmForge Team</p>
        </div>
      </div>
    `,
    text: 'IlmForge SMTP test successful!',
  });

  res.json({
    success: result.success,
    message: result.success ? `Test email sent to ${to}` : `Email send failed: ${result.error}`,
    configured: true,
    connected: true,
    sentTo: to,
    provider: process.env.SMTP_HOST,
  });
}));

// ---------------------------------------------------------------------------
// Notification preferences persisted in backend JSON store (school-scoped)
// ---------------------------------------------------------------------------

const DEFAULT_NOTIFICATION_PREFS = {
  attendanceAlerts: true,
  feeAlerts: true,
  examAlerts: true,
  complaintAlerts: true,
  channelApp: true,
  channelSms: false,
  channelEmail: true,
  channelWhatsapp: false,
};

router.get('/notifications', wrap(async (req, res) => {
  const settings = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: settings.notificationPrefs || DEFAULT_NOTIFICATION_PREFS });
}));

router.put('/notifications', wrap(async (req, res) => {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(req.body || {}) };
  const settings = await setSchoolSettings(req.schoolId, { notificationPrefs: prefs });
  res.json({ success: true, data: settings.notificationPrefs });
}));

// ---------------------------------------------------------------------------
// WhatsApp integration settings persisted in backend JSON store (school-scoped)
// FIX: WhatsAppSettingsPage's Save button called PUT /settings/whatsapp, which
// didn't exist — the call 404'd but was swallowed by a blanket .catch(), so
// the page always showed "saved!" without ever persisting anything.
// ---------------------------------------------------------------------------
const DEFAULT_WHATSAPP_SETTINGS = {
  apiToken: '',
  connectionMethod: 'qr',
  pairingCode: '',
  apiProvider: 'wasender',
  apiUrl: 'https://api.wasender.app/api',
};

router.get('/whatsapp', wrap(async (req, res) => {
  const settings = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: settings.whatsapp || DEFAULT_WHATSAPP_SETTINGS });
}));

router.put('/whatsapp', wrap(async (req, res) => {
  const whatsapp = { ...DEFAULT_WHATSAPP_SETTINGS, ...(req.body || {}) };
  const settings = await setSchoolSettings(req.schoolId, { whatsapp });
  res.json({ success: true, data: settings.whatsapp });
}));

// ---------------------------------------------------------------------------
// General settings alias (same as /school for backwards compat)
// ---------------------------------------------------------------------------
router.get('/general', wrap(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
  const extra = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: { ...school, ...extra.general } });
}));

router.put('/general', wrap(async (req, res) => {
  const {
    name, address, city, phone, email,
    currency, session, runningSession, smsSignature,
    timezone, institutionType, rollIdSequence, barcodeAttMsg, showClassOnDash,
  } = req.body;
  const schoolData = {};
  if (name)    schoolData.name    = name;
  if (address) schoolData.address = address;
  if (city)    schoolData.city    = city;
  if (phone)   schoolData.phone   = phone;
  if (email)   schoolData.email   = email;
  if (Object.keys(schoolData).length) {
    await prisma.school.update({ where: { id: req.schoolId }, data: schoolData });
  }

  const existing = await getSchoolSettings(req.schoolId);
  const general = {
    ...existing.general,
    ...(currency !== undefined && { currency }),
    ...((session !== undefined || runningSession !== undefined) && { session: runningSession ?? session }),
    ...(smsSignature !== undefined && { smsSignature }),
    ...(timezone !== undefined && { timezone }),
    ...(institutionType !== undefined && { institutionType }),
    ...(rollIdSequence !== undefined && { rollIdSequence }),
    ...(barcodeAttMsg !== undefined && { barcodeAttMsg }),
    ...(showClassOnDash !== undefined && { showClassOnDash }),
  };
  await setSchoolSettings(req.schoolId, { general });

  res.json({ success: true, message: 'General settings saved.' });
}));

module.exports = router;
