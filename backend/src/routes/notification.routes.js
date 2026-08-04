const express = require('express');
const router = express.Router();
const { sendSMS } = require('../services/sms.service');
const { sendWhatsApp } = require('../services/whatsapp.service');
const { sendEmail } = require('../services/email.service');
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

/* Send credentials email — used by Portal Management page */
router.post('/email', wrap(async (req, res) => {
  const { to, subject, html, body } = req.body;
  if (!to || !subject) return res.status(400).json({ success: false, message: 'to and subject are required.' });
  await sendEmail({ to, subject, html: html || `<p>${body || subject}</p>`, text: body || subject });
  try {
    await prisma.notificationLog.create({ data: { schoolId: req.schoolId, type: 'email', body: subject, status: 'sent', sentAt: new Date() } });
  } catch (_) { /* log failure is non-critical */ }
  res.json({ success: true, message: `Email sent to ${to}.` });
}));

router.get('/history', wrap(async (req, res) => {
  const logs = await prisma.notificationLog.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data: logs });
}));

module.exports = router;
