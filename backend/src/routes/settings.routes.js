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

router.post('/sessions', wrap(async (req, res) => {
  const { name, startDate, endDate, isActive } = req.body;
  if (isActive) await prisma.academicSession.updateMany({ where: { schoolId: req.schoolId }, data: { isActive: false } });
  const session = await prisma.academicSession.create({ data: { schoolId: req.schoolId, name, startDate: new Date(startDate), endDate: new Date(endDate), isActive: isActive || false } });
  res.status(201).json({ success: true, data: session });
}));

// ---------------------------------------------------------------------------
// Exam settings — grade thresholds and pass percentage stored per school
// ---------------------------------------------------------------------------

// Default exam settings returned when no record exists
const DEFAULT_EXAM_SETTINGS = {
  passPercentage: 40,
  gradeThresholds: [
    { minPercent: 90, grade: 'A+' },
    { minPercent: 80, grade: 'A' },
    { minPercent: 70, grade: 'B' },
    { minPercent: 60, grade: 'C' },
    { minPercent: 50, grade: 'D' },
    { minPercent: 0,  grade: 'F' },
  ],
  showGradeOnResult: true,
  showPositionOnResult: true,
  allowGraceMarks: false,
  maxGraceMarksPerSubject: 0,
};

// GET /settings/exam — find ExamSettings by schoolId; if not found return defaults
router.get('/exam', wrap(async (req, res) => {
  try {
    const settings = await prisma.examSettings.findFirst({ where: { schoolId: req.schoolId } });
    if (!settings) {
      return res.json({ success: true, data: { ...DEFAULT_EXAM_SETTINGS, schoolId: req.schoolId, isDefault: true } });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    // ExamSettings model may not exist in this schema version
    res.json({ success: true, data: { ...DEFAULT_EXAM_SETTINGS, schoolId: req.schoolId, isDefault: true }, warning: 'ExamSettings model not available; returning defaults.' });
  }
}));

// PUT /settings/exam — upsert ExamSettings for schoolId
router.put('/exam', wrap(async (req, res) => {
  const {
    passPercentage,
    gradeThresholds,
    showGradeOnResult,
    showPositionOnResult,
    allowGraceMarks,
    maxGraceMarksPerSubject,
  } = req.body;

  const data = {
    ...(passPercentage !== undefined && { passPercentage: parseFloat(passPercentage) }),
    ...(gradeThresholds !== undefined && { gradeThresholds }),
    ...(showGradeOnResult !== undefined && { showGradeOnResult: Boolean(showGradeOnResult) }),
    ...(showPositionOnResult !== undefined && { showPositionOnResult: Boolean(showPositionOnResult) }),
    ...(allowGraceMarks !== undefined && { allowGraceMarks: Boolean(allowGraceMarks) }),
    ...(maxGraceMarksPerSubject !== undefined && { maxGraceMarksPerSubject: parseInt(maxGraceMarksPerSubject) }),
  };

  try {
    const existing = await prisma.examSettings.findFirst({ where: { schoolId: req.schoolId } });
    let settings;
    if (existing) {
      settings = await prisma.examSettings.update({ where: { id: existing.id }, data });
    } else {
      settings = await prisma.examSettings.create({ data: { schoolId: req.schoolId, ...data } });
    }
    res.json({ success: true, data: settings });
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
  const website = { ...DEFAULT_WEBSITE_SETTINGS, ...(req.body || {}) };
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
          <p>Mubarak! IlmForge ka email system bilkul sahi kaam kar raha hai.</p>
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
// General settings alias (same as /school for backwards compat)
// ---------------------------------------------------------------------------
router.get('/general', wrap(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
  const extra = await getSchoolSettings(req.schoolId);
  res.json({ success: true, data: { ...school, ...extra.general } });
}));

router.put('/general', wrap(async (req, res) => {
  const { name, address, city, phone, email, currency, session, smsSignature } = req.body;
  const schoolData = {};
  if (name)    schoolData.name    = name;
  if (address) schoolData.address = address;
  if (city)    schoolData.city    = city;
  if (phone)   schoolData.phone   = phone;
  if (email)   schoolData.email   = email;
  if (Object.keys(schoolData).length) {
    await prisma.school.update({ where: { id: req.schoolId }, data: schoolData });
  }
  if (currency || session || smsSignature) {
    await setSchoolSettings(req.schoolId, { general: { currency, session, smsSignature } });
  }
  res.json({ success: true, message: 'General settings saved.' });
}));

module.exports = router;
