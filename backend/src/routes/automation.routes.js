/**
 * IlmForge — Automation & Notification Template Routes
 * Templates CRUD + Automation Rules CRUD + Manual Trigger
 */
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/prisma');
const {
  runFeeReminders, runAbsentAlerts,
  runBirthdayWishes, runDailyCollectionReport,
  resolveTemplate, dispatch,
} = require('../services/scheduler.service');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

/* ═══════════════════════════════════════════════════════════
   DEFAULT TEMPLATES (seeded on first access per school)
═══════════════════════════════════════════════════════════ */
const DEFAULT_TEMPLATES = [
  {
    name:     'Fee Reminder — Gentle',
    type:     'sms',
    category: 'fee_reminder',
    body:     'Assalam-o-Alaikum {{parent_name}},\nYour child {{student_name}} (Class {{class}}) has pending fee of Rs. {{amount}} for {{month}}.\nPlease pay at earliest.\nThank you — IlmForge',
    isDefault: true,
  },
  {
    name:     'Fee Reminder — Urgent',
    type:     'sms',
    category: 'fee_reminder',
    body:     'URGENT: Dear {{parent_name}}, Rs. {{amount}} fee for {{student_name}} is OVERDUE for {{month}}. Late fee will apply after {{due_date}}. Please pay immediately.\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Fee Reminder — Final Notice',
    type:     'sms',
    category: 'fee_reminder',
    body:     'FINAL NOTICE: Dear {{parent_name}}, Rs. {{amount}} fee for {{student_name}} is CRITICALLY overdue. Failure to pay may result in removal from class list.\nContact school immediately.\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Absent Alert',
    type:     'sms',
    category: 'absent_alert',
    body:     'Dear {{parent_name}},\n{{student_name}} was ABSENT today ({{date}}).\nPlease ensure regular attendance.\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Late Arrival Alert',
    type:     'sms',
    category: 'absent_alert',
    body:     'Dear {{parent_name}},\n{{student_name}} arrived LATE today ({{date}}) at {{time}}.\nPlease ensure punctuality.\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Result Published',
    type:     'sms',
    category: 'result_published',
    body:     'Congratulations {{parent_name}}!\n{{student_name}} result for {{exam_name}} is now available.\nCheck the parent portal: {{portal_url}}\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Birthday Wish — Student',
    type:     'sms',
    category: 'birthday',
    body:     'Happy Birthday {{name}}! 🎂\nWishing you a wonderful day and a bright future.\nWith love from the IlmForge family!\n— {{school_name}}',
    isDefault: true,
  },
  {
    name:     'Gate Pass Issued',
    type:     'sms',
    category: 'gate_pass',
    body:     'Dear {{parent_name}},\nA gate pass has been issued for {{student_name}} at {{time}} today.\nReason: {{reason}}\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Holiday Announcement',
    type:     'sms',
    category: 'holiday',
    body:     'Dear Parents,\n{{school_name}} will remain CLOSED on {{date}} due to {{reason}}.\nClasses will resume on {{resume_date}}.\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Exam Schedule',
    type:     'sms',
    category: 'custom',
    body:     'Dear {{parent_name}},\n{{student_name}}\'s {{exam_name}} exams begin on {{start_date}}.\nSyllabus: {{syllabus}}\nBest of luck!\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Fee Receipt Confirmation',
    type:     'sms',
    category: 'fee_reminder',
    body:     'Payment Received! ✅\nDear {{parent_name}}, Rs. {{amount}} fee for {{student_name}} has been received.\nReceipt No: {{receipt_no}}\nThank you!\n— IlmForge',
    isDefault: true,
  },
  {
    name:     'Fee Reminder Email',
    type:     'email',
    category: 'fee_reminder',
    subject:  'Fee Reminder — {{student_name}} — Rs. {{amount}}',
    body:     'Dear {{parent_name}},\n\nWe hope this message finds you well.\n\nThis is a friendly reminder that the monthly fee for {{student_name}} (Class {{class}}) amounting to Rs. {{amount}} for {{month}} is pending.\n\nDue Date: {{due_date}}\n\nPlease pay at the school office or via the parent portal.\n\nThank you for your continued support.\n\nWarm regards,\n{{school_name}}',
    isDefault: true,
  },
];

async function seedDefaultTemplates(schoolId) {
  const existing = await prisma.notificationTemplate.count({ where: { schoolId, isDefault: true } });
  if (existing > 0) return;
  await prisma.notificationTemplate.createMany({
    data: DEFAULT_TEMPLATES.map(t => ({ ...t, schoolId })),
    skipDuplicates: true,
  });
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE ROUTES
═══════════════════════════════════════════════════════════ */

// GET /api/v1/automation/templates
router.get('/templates', wrap(async (req, res) => {
  await seedDefaultTemplates(req.schoolId);
  const { category, type } = req.query;
  const where = { schoolId: req.schoolId };
  if (category) where.category = category;
  if (type)     where.type     = type;
  const templates = await prisma.notificationTemplate.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { category: 'asc' }, { name: 'asc' }],
  });
  res.json({ success: true, data: templates });
}));

// POST /api/v1/automation/templates
router.post('/templates', wrap(async (req, res) => {
  const { name, type, category, subject, body } = req.body;
  if (!name || !type || !category || !body) {
    return res.status(400).json({ success: false, message: 'name, type, category, body required.' });
  }
  const tpl = await prisma.notificationTemplate.create({
    data: { schoolId: req.schoolId, name, type, category, subject, body, isDefault: false },
  });
  res.json({ success: true, data: tpl });
}));

// PUT /api/v1/automation/templates/:id
router.put('/templates/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const tpl = await prisma.notificationTemplate.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!tpl) return res.status(404).json({ success: false, message: 'Template not found.' });
  const { name, type, category, subject, body, isActive } = req.body;
  const updated = await prisma.notificationTemplate.update({
    where: { id },
    data: { name, type, category, subject, body, isActive: isActive !== undefined ? isActive : tpl.isActive },
  });
  res.json({ success: true, data: updated });
}));

// DELETE /api/v1/automation/templates/:id
router.delete('/templates/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const tpl = await prisma.notificationTemplate.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!tpl) return res.status(404).json({ success: false, message: 'Template not found.' });
  if (tpl.isDefault) return res.status(400).json({ success: false, message: 'Default templates cannot be deleted.' });
  await prisma.notificationTemplate.delete({ where: { id } });
  res.json({ success: true, message: 'Template deleted.' });
}));

// POST /api/v1/automation/templates/:id/preview — preview with sample data
router.post('/templates/:id/preview', wrap(async (req, res) => {
  const id  = parseInt(req.params.id);
  const tpl = await prisma.notificationTemplate.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!tpl) return res.status(404).json({ success: false, message: 'Template not found.' });
  const sampleVars = {
    parent_name:  'Ahmed Ali',
    student_name: 'Muhammad Ahmed',
    class:        'Class 7-A',
    amount:       '2,500',
    month:        'July 2026',
    due_date:     '10 July 2026',
    receipt_no:   'REC-26-00123',
    date:         new Date().toLocaleDateString('en-PK'),
    time:         '09:30 AM',
    exam_name:    'Mid-Term Exam 2026',
    school_name:  req.school?.name || 'IlmForge School',
    portal_url:   process.env.FRONTEND_URL || 'https://ilmforge-erp.vercel.app',
    reason:       'Eid-ul-Adha',
    resume_date:  '12 July 2026',
    name:         'Muhammad Ahmed',
    syllabus:     'Chapters 1-5',
    start_date:   '15 July 2026',
    ...(req.body || {}),
  };
  const preview = resolveTemplate(tpl.body, sampleVars);
  res.json({ success: true, data: { preview, subject: tpl.subject ? resolveTemplate(tpl.subject, sampleVars) : null } });
}));

/* ═══════════════════════════════════════════════════════════
   AUTOMATION RULE ROUTES
═══════════════════════════════════════════════════════════ */

// GET /api/v1/automation/rules
router.get('/rules', wrap(async (req, res) => {
  const rules = await prisma.automationRule.findMany({
    where: { schoolId: req.schoolId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: rules });
}));

// POST /api/v1/automation/rules
router.post('/rules', wrap(async (req, res) => {
  const { name, trigger, channel, templateId, runDays, runTime, config } = req.body;
  if (!name || !trigger || !channel) {
    return res.status(400).json({ success: false, message: 'name, trigger, channel required.' });
  }
  const rule = await prisma.automationRule.create({
    data: {
      schoolId:   req.schoolId,
      name,
      trigger,
      channel,
      templateId: templateId ? parseInt(templateId) : null,
      runDays:    runDays ? JSON.stringify(runDays) : null,
      runTime:    runTime || '09:00',
      config:     config ? JSON.stringify(config) : null,
    },
  });
  res.json({ success: true, data: rule });
}));

// PUT /api/v1/automation/rules/:id
router.put('/rules/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const rule = await prisma.automationRule.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });
  const { name, trigger, channel, templateId, runDays, runTime, isActive, config } = req.body;
  const updated = await prisma.automationRule.update({
    where: { id },
    data: {
      name:       name       ?? rule.name,
      trigger:    trigger    ?? rule.trigger,
      channel:    channel    ?? rule.channel,
      templateId: templateId !== undefined ? (templateId ? parseInt(templateId) : null) : rule.templateId,
      runDays:    runDays    !== undefined ? JSON.stringify(runDays) : rule.runDays,
      runTime:    runTime    ?? rule.runTime,
      isActive:   isActive   !== undefined ? isActive : rule.isActive,
      config:     config     !== undefined ? JSON.stringify(config) : rule.config,
    },
  });
  res.json({ success: true, data: updated });
}));

// DELETE /api/v1/automation/rules/:id
router.delete('/rules/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const rule = await prisma.automationRule.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });
  await prisma.automationRule.delete({ where: { id } });
  res.json({ success: true, message: 'Rule deleted.' });
}));

// POST /api/v1/automation/rules/:id/trigger — manual trigger
router.post('/rules/:id/trigger', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const rule = await prisma.automationRule.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });

  let message = 'Triggered successfully.';
  try {
    switch (rule.trigger) {
      case 'fee_reminder':      await runFeeReminders();          break;
      case 'absent_alert':      await runAbsentAlerts();          break;
      case 'birthday_wish':     await runBirthdayWishes();        break;
      case 'daily_collection':  await runDailyCollectionReport(); break;
      default: message = `Unknown trigger: ${rule.trigger}`;
    }
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}));

/* ═══════════════════════════════════════════════════════════
   QUICK SEND — send notification right now using a template
═══════════════════════════════════════════════════════════ */

// POST /api/v1/automation/send
router.post('/send', wrap(async (req, res) => {
  const { templateId, targets, overrideVars } = req.body;
  // targets: [{ phone, email, vars: {} }]
  if (!templateId || !Array.isArray(targets) || !targets.length) {
    return res.status(400).json({ success: false, message: 'templateId and targets array required.' });
  }

  const tpl = await prisma.notificationTemplate.findFirst({
    where: { id: parseInt(templateId), schoolId: req.schoolId },
  });
  if (!tpl) return res.status(404).json({ success: false, message: 'Template not found.' });

  let sent = 0;
  for (const t of targets) {
    const vars = { ...overrideVars, ...t.vars };
    const msg  = resolveTemplate(tpl.body, vars);
    const subj = tpl.subject ? resolveTemplate(tpl.subject, vars) : undefined;
    await dispatch({ channel: tpl.type, phone: t.phone, email: t.email, subject: subj, message: msg });
    sent++;
  }

  await prisma.notificationTemplate.update({
    where: { id: parseInt(templateId) },
    data: { usageCount: { increment: sent } },
  });

  await prisma.notificationLog.create({
    data: {
      schoolId: req.schoolId,
      type:     tpl.type,
      title:    tpl.name,
      body:     `Sent to ${sent} recipients`,
      status:   'sent',
      sentAt:   new Date(),
    },
  });

  res.json({ success: true, data: { sent }, message: `Sent to ${sent} recipient(s).` });
}));

/* GET /api/v1/automation/stats */
router.get('/stats', wrap(async (req, res) => {
  const [templates, rules, logs] = await Promise.all([
    prisma.notificationTemplate.count({ where: { schoolId: req.schoolId } }),
    prisma.automationRule.count({ where: { schoolId: req.schoolId } }),
    prisma.notificationLog.findMany({
      where: { schoolId: req.schoolId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);
  const byType = logs.reduce((acc, l) => { acc[l.type] = (acc[l.type] || 0) + 1; return acc; }, {});
  res.json({ success: true, data: { templates, rules, logs: logs.slice(0, 20), byType } });
}));

module.exports = router;
