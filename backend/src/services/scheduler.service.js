/**
 * IlmForge — Notification Scheduler Service
 * Cron-based automated notifications: fee reminders, absent alerts,
 * birthday wishes, daily collection reports.
 *
 * Uses node-cron (if available) or a simple setInterval fallback.
 */

const prisma = require('../config/prisma');
const { sendSMS } = require('./sms.service');
const { sendWhatsApp } = require('./whatsapp.service');
const { sendEmail } = require('./email.service');

/* ─── Template tag resolver ───────────────────────────────────────── */
function resolveTemplate(body, vars = {}) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

/* ─── Dispatcher: send via configured channel ─────────────────────── */
async function dispatch({ channel, phone, email, subject, message }) {
  const results = [];
  if ((channel === 'sms' || channel === 'all') && phone) {
    results.push(await sendSMS(phone, message));
  }
  if ((channel === 'whatsapp' || channel === 'all') && phone) {
    results.push(await sendWhatsApp(phone, message));
  }
  if ((channel === 'email' || channel === 'all') && email) {
    results.push(await sendEmail({ to: email, subject: subject || 'IlmForge Notification', text: message, html: `<p>${message.replace(/\n/g, '<br/>')}</p>` }));
  }
  return results;
}

/* ─── Log automation run ──────────────────────────────────────────── */
async function logRun(schoolId, ruleId, status, details) {
  try {
    await prisma.notificationLog.create({
      data: {
        schoolId,
        type: 'automation',
        title: `Automation Rule #${ruleId}`,
        body: details,
        status,
        sentAt: new Date(),
      },
    });
    await prisma.automationRule.update({
      where: { id: ruleId },
      data: { lastRunAt: new Date(), lastRunStatus: status, totalRuns: { increment: 1 } },
    });
  } catch (_) {}
}

/* ═══════════════════════════════════════════════════════════════════
   JOB 1 — Fee Reminders
   Runs daily. Checks if today matches any school's configured reminder
   days. Sends to all parents with unpaid invoices.
═══════════════════════════════════════════════════════════════════ */
async function runFeeReminders() {
  const today = new Date().getDate();
  console.log(`[Scheduler] Fee reminder check — day ${today}`);

  try {
    const rules = await prisma.automationRule.findMany({
      where: { trigger: 'fee_reminder', isActive: true },
    });

    for (const rule of rules) {
      const runDays = JSON.parse(rule.runDays || '[]');
      if (!runDays.includes(today)) continue;

      // Get template
      const tpl = rule.templateId
        ? await prisma.notificationTemplate.findUnique({ where: { id: rule.templateId } })
        : null;

      const defaultBody =
        'Assalam-o-Alaikum {{parent_name}},\nYour child {{student_name}} (Class {{class}}) has pending fee of Rs. {{amount}} for {{month}}.\nPlease pay at earliest to avoid late fee.\n\nThank you — IlmForge';

      const bodyTemplate = tpl?.body || defaultBody;

      // Find unpaid invoices
      const unpaid = await prisma.feeInvoice.findMany({
        where: {
          schoolId: rule.schoolId,
          status: { in: ['unpaid', 'partial', 'overdue'] },
          dueAmount: { gt: 0 },
        },
        select: {
          id: true, dueAmount: true, month: true, year: true,
          student: {
            select: {
              name: true,
              class: { select: { name: true } },
              parent: { select: { name: true, phone: true, email: true } },
            },
          },
        },
        take: 500,
      });

      let sent = 0;
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      for (const inv of unpaid) {
        const parent = inv.student?.parent;
        const phone  = parent?.phone;
        const email  = parent?.email;
        if (!phone && !email) continue;

        const msg = resolveTemplate(bodyTemplate, {
          parent_name:  parent?.name || 'Parent',
          student_name: inv.student?.name || 'Student',
          class:        inv.student?.class?.name || '',
          amount:       Number(inv.dueAmount).toLocaleString('en-PK'),
          month:        monthNames[(inv.month || 1) - 1] + ' ' + (inv.year || ''),
        });

        await dispatch({ channel: rule.channel, phone, email, subject: 'Fee Reminder — IlmForge', message: msg });
        sent++;
      }

      await logRun(rule.schoolId, rule.id, 'success', `Fee reminders sent to ${sent} parent(s)`);
      console.log(`[Scheduler] Fee reminders sent: ${sent} for school ${rule.schoolId}`);
    }
  } catch (err) {
    console.error('[Scheduler] Fee reminder error:', err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   JOB 2 — Daily Absent Alerts
   Runs Mon–Sat at configured time. Finds today's absent students
   and notifies their parents.
═══════════════════════════════════════════════════════════════════ */
async function runAbsentAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log('[Scheduler] Absent alerts running');

  try {
    const rules = await prisma.automationRule.findMany({
      where: { trigger: 'absent_alert', isActive: true },
    });

    for (const rule of rules) {
      const tpl = rule.templateId
        ? await prisma.notificationTemplate.findUnique({ where: { id: rule.templateId } })
        : null;

      const defaultBody =
        'Dear {{parent_name}},\n{{student_name}} was marked ABSENT today ({{date}}).\nPlease ensure regular attendance.\n\n— IlmForge';

      const bodyTemplate = tpl?.body || defaultBody;

      const absentRecords = await prisma.attendanceRecord.findMany({
        where: {
          schoolId: rule.schoolId,
          status: 'absent',
          date: { gte: today, lt: tomorrow },
        },
        select: {
          student: {
            select: {
              name: true,
              parent: { select: { name: true, phone: true, email: true } },
            },
          },
        },
        take: 300,
      });

      const dateStr = today.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
      let sent = 0;

      for (const rec of absentRecords) {
        const parent = rec.student?.parent;
        const phone  = parent?.phone;
        const email  = parent?.email;
        if (!phone && !email) continue;

        const msg = resolveTemplate(bodyTemplate, {
          parent_name:  parent?.name || 'Parent',
          student_name: rec.student?.name || 'Student',
          date:         dateStr,
        });

        await dispatch({ channel: rule.channel, phone, email, subject: 'Absent Alert — IlmForge', message: msg });
        sent++;
      }

      await logRun(rule.schoolId, rule.id, 'success', `Absent alerts sent to ${sent} parent(s)`);
    }
  } catch (err) {
    console.error('[Scheduler] Absent alert error:', err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   JOB 3 — Birthday Wishes
   Runs daily. Finds students/staff with birthday today and sends wishes.
═══════════════════════════════════════════════════════════════════ */
async function runBirthdayWishes() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  console.log('[Scheduler] Birthday wishes running');

  try {
    const rules = await prisma.automationRule.findMany({
      where: { trigger: 'birthday_wish', isActive: true },
    });

    for (const rule of rules) {
      const tpl = rule.templateId
        ? await prisma.notificationTemplate.findUnique({ where: { id: rule.templateId } })
        : null;

      const defaultBody =
        'Happy Birthday {{name}}! 🎂\nWishing you a wonderful birthday from the entire IlmForge family.\nMay you achieve great success!\n\n— IlmForge';

      const bodyTemplate = tpl?.body || defaultBody;

      // Find students born today
      const students = await prisma.student.findMany({
        where: {
          schoolId: rule.schoolId,
          deletedAt: null,
          dob: { not: null },
        },
        select: {
          name: true,
          dob: true,
          parent: { select: { phone: true, email: true } },
        },
      });

      const birthdayStudents = students.filter(s => {
        if (!s.dob) return false;
        const d = new Date(s.dob);
        return d.getMonth() + 1 === month && d.getDate() === day;
      });

      let sent = 0;
      for (const s of birthdayStudents) {
        const phone = s.parent?.phone;
        const email = s.parent?.email;
        if (!phone && !email) continue;
        const msg = resolveTemplate(bodyTemplate, { name: s.name });
        await dispatch({ channel: rule.channel, phone, email, subject: `Happy Birthday ${s.name}! 🎂`, message: msg });
        sent++;
      }

      await logRun(rule.schoolId, rule.id, 'success', `Birthday wishes sent to ${sent} student(s)`);
    }
  } catch (err) {
    console.error('[Scheduler] Birthday wish error:', err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   JOB 4 — Daily Collection Report to Admin
   Runs daily. Sends today's fee collection summary to admin email.
═══════════════════════════════════════════════════════════════════ */
async function runDailyCollectionReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log('[Scheduler] Daily collection report running');

  try {
    const rules = await prisma.automationRule.findMany({
      where: { trigger: 'daily_collection', isActive: true },
    });

    for (const rule of rules) {
      const payments = await prisma.feePayment.findMany({
        where: {
          schoolId: rule.schoolId,
          paidAt: { gte: today, lt: tomorrow },
        },
        select: { amount: true },
      });

      const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const count = payments.length;

      const school = await prisma.school.findUnique({
        where: { id: rule.schoolId },
        select: { name: true, email: true },
      });

      // Find admin emails
      const admins = await prisma.user.findMany({
        where: { schoolId: rule.schoolId, role: { in: ['super_admin', 'admin'] }, isActive: true },
        select: { email: true, name: true },
      });

      const dateStr = today.toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1B2F6E;color:white;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">📊 Daily Collection Report</h2>
            <p style="margin:5px 0 0;opacity:0.8">${school?.name} — ${dateStr}</p>
          </div>
          <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0">
            <div style="display:flex;gap:16px;margin-bottom:20px">
              <div style="flex:1;background:white;padding:16px;border-radius:8px;border-left:4px solid #00a65a;text-align:center">
                <div style="font-size:28px;font-weight:800;color:#00a65a">Rs. ${total.toLocaleString('en-PK')}</div>
                <div style="color:#666;font-size:13px">Total Collected Today</div>
              </div>
              <div style="flex:1;background:white;padding:16px;border-radius:8px;border-left:4px solid #0073b7;text-align:center">
                <div style="font-size:28px;font-weight:800;color:#0073b7">${count}</div>
                <div style="color:#666;font-size:13px">Payments Received</div>
              </div>
            </div>
            <p style="color:#475569;font-size:13px">Login to view full reports: <a href="${process.env.FRONTEND_URL}/accounting/balancesheet">Daily Balance Sheet</a></p>
          </div>
          <div style="padding:12px 20px;background:#1B2F6E;color:rgba(255,255,255,0.6);font-size:11px;text-align:center;border-radius:0 0 8px 8px">
            IlmForge — Ilm Ko Asaan Banaye | Automated Report
          </div>
        </div>`;

      for (const admin of admins) {
        await sendEmail({
          to:      admin.email,
          subject: `📊 Daily Collection: Rs. ${total.toLocaleString('en-PK')} — ${dateStr}`,
          html,
          text:    `Daily Collection for ${dateStr}: Rs. ${total.toLocaleString('en-PK')} (${count} payments)`,
        });
      }

      await logRun(rule.schoolId, rule.id, 'success', `Collection report sent to ${admins.length} admin(s). Total: Rs. ${total.toLocaleString('en-PK')}`);
    }
  } catch (err) {
    console.error('[Scheduler] Collection report error:', err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SCHEDULER INIT
   Uses node-cron if available. Falls back to setInterval for
   environments where node-cron is not installed.
═══════════════════════════════════════════════════════════════════ */
function initScheduler() {
  if (process.env.NODE_ENV === 'test') return;

  let cron;
  try {
    cron = require('node-cron');
  } catch (_) {
    console.log('[Scheduler] node-cron not found — using interval fallback');
    cron = null;
  }

  if (cron) {
    // Fee reminders — daily at 9:00 AM
    cron.schedule('0 9 * * *', runFeeReminders, { timezone: 'Asia/Karachi' });

    // Absent alerts — Mon–Sat at 8:00 AM
    cron.schedule('0 8 * * 1-6', runAbsentAlerts, { timezone: 'Asia/Karachi' });

    // Birthday wishes — daily at 7:00 AM
    cron.schedule('0 7 * * *', runBirthdayWishes, { timezone: 'Asia/Karachi' });

    // Daily collection report — Mon–Sat at 6:00 PM
    cron.schedule('0 18 * * 1-6', runDailyCollectionReport, { timezone: 'Asia/Karachi' });

    console.log('[Scheduler] Cron jobs initialized (PKT Asia/Karachi):');
    console.log('  • Fee Reminders    → daily 09:00');
    console.log('  • Absent Alerts    → Mon-Sat 08:00');
    console.log('  • Birthday Wishes  → daily 07:00');
    console.log('  • Collection Report→ Mon-Sat 18:00');
  } else {
    // Fallback: run every hour, jobs do their own day-of-month checks
    setInterval(() => {
      const h = new Date().getHours();
      if (h === 9)  runFeeReminders();
      if (h === 8)  runAbsentAlerts();
      if (h === 7)  runBirthdayWishes();
      if (h === 18) runDailyCollectionReport();
    }, 60 * 60 * 1000);
    console.log('[Scheduler] Hourly interval fallback active');
  }
}

module.exports = {
  initScheduler,
  runFeeReminders,
  runAbsentAlerts,
  runBirthdayWishes,
  runDailyCollectionReport,
  resolveTemplate,
  dispatch,
};
