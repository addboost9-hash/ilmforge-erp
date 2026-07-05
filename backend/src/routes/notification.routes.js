const express = require('express');
const router = express.Router();
const { sendSMS } = require('../services/sms.service');
const { sendWhatsApp } = require('../services/whatsapp.service');
const { sendEmail, sendTeamAlertEmail, verifySmtpConnection } = require('../services/email.service');
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.post('/sms', wrap(async (req, res) => {
  const { phones, message } = req.body;
  if (!phones?.length || !message) return res.status(400).json({ success: false, message: 'phones array and message required.' });
  let sent = 0;
  for (const phone of phones) { await sendSMS(phone, message); sent++; }
  await prisma.notificationLog.create({ data: { schoolId: req.schoolId, type: 'sms', body: message, status: 'sent', sentAt: new Date() } });
  res.json({ success: true, message: `SMS sent to ${sent} numbers.` });
}));

router.post('/whatsapp', wrap(async (req, res) => {
  const { phones, message } = req.body;
  if (!phones?.length || !message) return res.status(400).json({ success: false, message: 'phones and message required.' });
  let sent = 0;
  for (const phone of phones) { await sendWhatsApp(phone, message); sent++; }
  await prisma.notificationLog.create({ data: { schoolId: req.schoolId, type: 'whatsapp', body: message, status: 'sent', sentAt: new Date() } });
  res.json({ success: true, message: `WhatsApp sent to ${sent} numbers.` });
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
