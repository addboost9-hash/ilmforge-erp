const express = require('express');
const router = express.Router();
const { sendSMS, sendBulkSMS, testSmsCredentials, normalizePKPhone } = require('../services/sms.service');
const { sendWhatsApp, sendBulkWhatsApp, testWhatsAppCredentials } = require('../services/whatsapp.service');
const { sendEmail, sendTeamAlertEmail, verifySmtpConnection } = require('../services/email.service');
const prisma = require('../config/prisma');
const path = require('path');
const fs   = require('fs/promises');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* ─── Channel settings helpers ───────────────────────────────── */
const SETTINGS_PATH = path.join(__dirname, '../../data/school-settings.json');
const readSettings  = async () => { try { return JSON.parse(await fs.readFile(SETTINGS_PATH, 'utf8') || '{}'); } catch { return {}; } };
const getChannelCfg = async (schoolId) => { const s = await readSettings(); return s[String(schoolId)]?.channels || {}; };

router.post('/sms', wrap(async (req, res) => {
  const { phones, message } = req.body;
  if (!phones?.length || !message) return res.status(400).json({ success: false, message: 'phones array and message required.' });
  const cfg = await getChannelCfg(req.schoolId);
  const result = await sendBulkSMS(phones, message, cfg);
  const status = result.sent > 0 ? 'sent' : 'failed';
  await prisma.notificationLog.create({ data: { schoolId: req.schoolId, type: 'sms', title: `Bulk SMS to ${result.sent}/${result.total}`, body: message.substring(0, 200), status, sentAt: new Date() } });
  res.json({ success: true, message: `SMS sent to ${result.sent}/${result.total} numbers.`, data: result });
}));

router.post('/whatsapp', wrap(async (req, res) => {
  const { phones, message } = req.body;
  if (!phones?.length || !message) return res.status(400).json({ success: false, message: 'phones and message required.' });
  const cfg = await getChannelCfg(req.schoolId);
  const result = await sendBulkWhatsApp(phones, message, cfg);
  const status = result.sent > 0 ? 'sent' : 'failed';
  await prisma.notificationLog.create({ data: { schoolId: req.schoolId, type: 'whatsapp', title: `WA Bulk to ${result.sent}/${result.total}`, body: message.substring(0, 200), status, sentAt: new Date() } });
  res.json({ success: true, message: `WhatsApp sent to ${result.sent}/${result.total} numbers.`, data: result });
}));

/* ─── Channel Settings GET/PUT ───────────────────────────────── */
router.get('/channel-settings', wrap(async (req, res) => {
  const cfg = await getChannelCfg(req.schoolId);
  // Mask secrets before returning
  const safe = { ...cfg };
  if (safe.smsAuthToken)  safe.smsAuthToken  = safe.smsAuthToken.slice(0, 6) + '••••••';
  if (safe.waApiKey)      safe.waApiKey      = safe.waApiKey.slice(0, 6) + '••••••';
  if (safe.smtpPass)      safe.smtpPass      = '••••••••';
  res.json({ success: true, data: safe });
}));

router.put('/channel-settings', wrap(async (req, res) => {
  const settings = await readSettings();
  const key = String(req.schoolId);
  const existing = settings[key]?.channels || {};
  // Don't overwrite masked values
  const patch = {};
  const body = req.body || {};
  const unmasked = (v) => v && !String(v).includes('••');
  if (unmasked(body.smsAccountSid))   patch.smsAccountSid  = body.smsAccountSid;
  if (unmasked(body.smsAuthToken))    patch.smsAuthToken   = body.smsAuthToken;
  if (body.smsFromNumber)             patch.smsFromNumber  = body.smsFromNumber;
  if (body.waApiUrl)                  patch.waApiUrl       = body.waApiUrl;
  if (unmasked(body.waApiKey))        patch.waApiKey       = body.waApiKey;
  if (body.waProvider)                patch.waProvider     = body.waProvider;
  if (body.waInstance)                patch.waInstance     = body.waInstance;
  if (body.smtpHost)                  patch.smtpHost       = body.smtpHost;
  if (body.smtpPort)                  patch.smtpPort       = body.smtpPort;
  if (body.smtpUser)                  patch.smtpUser       = body.smtpUser;
  if (unmasked(body.smtpPass))        patch.smtpPass       = body.smtpPass;
  if (body.smtpFrom)                  patch.smtpFrom       = body.smtpFrom;
  if (body.smtpFromName)              patch.smtpFromName   = body.smtpFromName;
  if (body.smtpSecure !== undefined)  patch.smtpSecure     = body.smtpSecure;

  settings[key] = { ...(settings[key] || {}), channels: { ...existing, ...patch }, updatedAt: new Date().toISOString() };
  const dir = path.dirname(SETTINGS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  res.json({ success: true, message: 'Channel settings saved.' });
}));

/* ─── Test Endpoints ─────────────────────────────────────────── */
router.post('/test-sms', wrap(async (req, res) => {
  const { to, accountSid, authToken, fromNumber } = req.body;
  if (!to) return res.status(400).json({ success: false, message: 'to phone number required.' });
  const cfg = await getChannelCfg(req.schoolId);
  const sid  = accountSid  || cfg.smsAccountSid  || process.env.TWILIO_ACCOUNT_SID;
  const tok  = authToken   || cfg.smsAuthToken   || process.env.TWILIO_AUTH_TOKEN;
  const from = fromNumber  || cfg.smsFromNumber  || process.env.TWILIO_PHONE_NUMBER;
  const result = await testSmsCredentials(sid, tok, from, to);
  res.json(result);
}));

router.post('/test-whatsapp', wrap(async (req, res) => {
  const { to, apiUrl, apiKey, provider, instance } = req.body;
  if (!to) return res.status(400).json({ success: false, message: 'to phone number required.' });
  const cfg = await getChannelCfg(req.schoolId);
  const url  = apiUrl   || cfg.waApiUrl  || process.env.WHATSAPP_API_URL;
  const key  = apiKey   || cfg.waApiKey  || process.env.WHATSAPP_API_KEY;
  const prov = provider || cfg.waProvider || 'wasender';
  const inst = instance || cfg.waInstance || '';
  const result = await testWhatsAppCredentials(url, key, prov, to, inst);
  res.json(result);
}));

router.post('/test-email', wrap(async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ success: false, message: 'to email required.' });
  const result = await verifySmtpConnection();
  if (!result.success) return res.status(502).json({ success: false, message: result.error || 'SMTP connection failed.' });
  const sendResult = await sendEmail({
    to,
    subject: 'IlmForge Email Test ✅',
    html: '<p><strong>IlmForge SMTP Test</strong></p><p>Your email settings are working correctly! 🎉</p><p style="color:#64748b;font-size:12px">— IlmForge School Management System</p>',
    text: 'IlmForge SMTP Test — Your email settings are working correctly!',
  });
  res.json(sendResult);
}));

router.post('/test-smtp-verify', wrap(async (req, res) => {
  const result = await verifySmtpConnection();
  res.json(result);
}));

/* ─── Normalize phone (utility) ──────────────────────────────── */
router.post('/normalize-phone', wrap(async (req, res) => {
  const { phones } = req.body;
  if (!Array.isArray(phones)) return res.status(400).json({ success: false, message: 'phones array required.' });
  const normalized = phones.map(p => ({ original: p, normalized: normalizePKPhone(p), valid: !!normalizePKPhone(p) }));
  res.json({ success: true, data: normalized });
}));

router.post('/attendance-reminder', wrap(async (req, res) => {
  const { studentIds, month, year } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'studentIds array is required.' });
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId: req.schoolId,
      id: { in: studentIds.map(id => parseInt(id)).filter(id => !Number.isNaN(id)) },
      deletedAt: null,
    },
    select: { id: true, name: true, emergencyPhone: true },
  });

  let sent = 0;
  for (const s of students) {
    if (!s.emergencyPhone) continue;
    const msg = `Attendance reminder: ${s.name} has low attendance for ${month || ''}/${year || ''}. Please ensure regular attendance.`.trim();
    await sendSMS(s.emergencyPhone, msg);
    sent++;
  }

  await prisma.notificationLog.create({
    data: {
      schoolId: req.schoolId,
      type: 'sms',
      body: `Attendance reminders sent to ${sent} parent(s).`,
      status: 'sent',
      sentAt: new Date(),
    },
  });

  res.json({ success: true, message: `Attendance reminders sent to ${sent} parent(s).`, sent });
}));

/* Send credentials email — used by Portal Management page */
router.post('/email', wrap(async (req, res) => {
  const { to, subject, html, body } = req.body;
  if (!to || !subject) return res.status(400).json({ success: false, message: 'to and subject are required.' });
  const result = await sendEmail({ to, subject, html: html || `<p>${body || subject}</p>`, text: body || subject });
  if (!result.success) {
    return res.status(502).json({ success: false, message: result.error || 'Email delivery failed.' });
  }
  try {
    await prisma.notificationLog.create({ data: { schoolId: req.schoolId, type: 'email', body: subject, status: 'sent', sentAt: new Date() } });
  } catch (_) { /* log failure is non-critical */ }
  res.json({ success: true, message: `Email sent to ${to}.` });
}));

router.post('/smtp-test', wrap(async (req, res) => {
  const verify = await verifySmtpConnection();
  if (!verify.success) {
    return res.status(502).json({ success: false, message: 'SMTP verify failed.', error: verify.error });
  }

  const to = req.body?.to || process.env.SMTP_TEST_TO || process.env.SMTP_USER;
  if (!to) {
    return res.json({ success: true, message: 'SMTP verify successful. No recipient configured for test email.' });
  }

  const send = await sendEmail({
    to,
    subject: `[${process.env.PLATFORM_NAME || 'IlmForge'}] SMTP Test`,
    html: '<p>SMTP verify successful. OTP emails are ready if mailbox policy allows sending.</p>',
  });

  if (!send.success) {
    return res.status(502).json({ success: false, message: 'SMTP test email failed.', error: send.error });
  }

  res.json({ success: true, message: `SMTP test email sent to ${to}.` });
}));

router.post('/team-alert', wrap(async (req, res) => {
  const { subject, html, practiceCode, to, cc, attachmentPath } = req.body || {};
  if (!subject || !html) {
    return res.status(400).json({ success: false, message: 'subject and html are required.' });
  }

  const result = await sendTeamAlertEmail({ subject, html, practiceCode, to, cc, attachmentPath });
  if (!result.success) {
    return res.status(502).json({ success: false, message: result.error || 'Team alert delivery failed.' });
  }

  try {
    await prisma.notificationLog.create({
      data: {
        schoolId: req.schoolId,
        type: 'email',
        body: `[TEAM ALERT] ${subject}`,
        status: 'sent',
        sentAt: new Date(),
      },
    });
  } catch (_) { /* log failure is non-critical */ }

  res.json({ success: true, message: 'Team alert email sent.' });
}));

router.get('/history', wrap(async (req, res) => {
  const logs = await prisma.notificationLog.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data: logs });
}));

module.exports = router;
