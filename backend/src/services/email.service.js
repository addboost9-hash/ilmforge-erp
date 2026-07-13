/**
 * IlmForge — Email Service v2.0
 * Multi-provider: Brevo / Gmail / Office365 / Any SMTP
 * Auto-detects provider from SMTP_HOST and applies correct TLS config
 * OTP emails, welcome emails, fee notifications, reports — all here
 */

const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');

const PLATFORM_NAME = process.env.PLATFORM_NAME || 'IlmForge';
const FROM_EMAIL    = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ilmforge.pk';
const FROM_NAME     = process.env.FROM_NAME  || 'IlmForge School ERP';

/* ── Parse email list ───────────────────────────────────── */
const parseEmailList = (value) =>
  String(value || '').split(/[;,]/).map(v => v.trim().toLowerCase()).filter(Boolean);
const uniq = (arr) => [...new Set((arr || []).filter(Boolean))];

/* ── Detect SMTP provider & apply correct config ─────────── */
const getTransportConfig = () => {
  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  // Brevo / Sendinblue
  if (host.includes('brevo') || host.includes('sendinblue')) {
    return {
      host,
      port,
      secure: false,             // Brevo uses STARTTLS on port 587
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      greetingTimeout:   10000,
    };
  }

  // Gmail
  if (host.includes('gmail') || host === 'smtp.gmail.com') {
    return {
      service: 'gmail',
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    };
  }

  // Office365 / Outlook
  if (host.includes('office365') || host.includes('outlook') || host.includes('hotmail')) {
    return {
      host,
      port,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      greetingTimeout:   10000,
    };
  }

  // Generic SMTP (any other provider)
  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
  };
};

/* ── Create transporter with auto-detect ─────────────────── */
const createTransporter = () => {
  const config = getTransportConfig();
  return nodemailer.createTransport(config);
};

/* ── Is email configured? ───────────────────────────────── */
const isEmailConfigured = () => {
  const pass = process.env.SMTP_PASS;
  const user = process.env.SMTP_USER;
  return !!(pass && user && pass !== 'your-app-password' && pass.length > 6);
};

/* ── Verify SMTP connection ─────────────────────────────── */
const verifySmtpConnection = async () => {
  if (!isEmailConfigured()) {
    return { success: false, error: 'SMTP not configured. Set SMTP_USER and SMTP_PASS in environment.' };
  }
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, host: process.env.SMTP_HOST, user: process.env.SMTP_USER };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/* ══════════════════════════════════════════════════════════
   CORE sendEmail — used by all functions below
══════════════════════════════════════════════════════════ */
const sendEmail = async ({ to, cc, bcc, subject, html, text, attachments = [] }) => {
  // Dev/offline mode — log to console
  if (!isEmailConfigured()) {
    console.log(`\n📧 [EMAIL DEV MODE — Not sent]`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Note:    Set SMTP_USER + SMTP_PASS in .env for real emails\n`);
    return { success: true, dev: true };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      cc,
      bcc,
      subject,
      html: html || `<p>${text || subject}</p>`,
      text: text || subject,
      attachments,
    });
    console.log(`📧 ✅ Email sent → ${Array.isArray(to) ? to.join(', ') : to} | msgId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`📧 ❌ Email FAILED → ${to}: ${err.message}`);
    // Don't throw — email failure should not break core features
    return { success: false, error: err.message };
  }
};

/* ══════════════════════════════════════════════════════════
   OTP EMAIL — Registration verification
══════════════════════════════════════════════════════════ */
const sendOTPEmail = async ({ to, otp, name, schoolName, password, loginUrl }) => {
  const subject = `${otp} — IlmForge Email Verification Code`;
  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1B2F6E,#0073b7);padding:28px 32px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🎓</div>
          <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">IlmForge</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">اِلم کو آسان بنائے 🇵🇰</p>
        </div>
        <!-- Content -->
        <div style="padding:32px;">
          <h2 style="color:#1e3a5f;margin:0 0 8px;font-size:20px;">Email Verify Karein</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Assalam-o-Alaikum <strong>${name || 'Admin'}</strong>! 👋<br>
            Aapke school <strong>${schoolName || ''}</strong> ka account bana diya gaya hai.<br>
            Neecha apna verification code hai:
          </p>

          <!-- OTP Box -->
          <div style="background:linear-gradient(135deg,#1B2F6E,#0073b7);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Verification Code</p>
            <div style="font-size:48px;font-weight:900;color:#f5c518;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</div>
            <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:8px 0 0;">10 minute mein expire ho jaayega</p>
          </div>

          <!-- Instructions -->
          <div style="background:#f8f9fa;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="color:#374151;font-size:13px;margin:0;line-height:1.7;">
              1️⃣ App mein waapas jayen<br>
              2️⃣ Yeh 6-digit code enter karein<br>
              3️⃣ "Verify" button dabayein<br>
              4️⃣ School dashboard khul jaayega ✅
            </p>
          </div>

          ${password ? `
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="color:#92400e;font-size:13px;margin:0;font-weight:600;">🔑 Aapka Password (save karein!):</p>
            <p style="color:#1e3a5f;font-size:20px;font-weight:900;font-family:monospace;margin:6px 0 0;">${password}</p>
          </div>
          ` : ''}

          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center;">
            Agar aapne register nahi kiya to is email ko ignore karein.<br>
            Madad ke liye: WhatsApp 0348-5321483
          </p>
        </div>
        <!-- Footer -->
        <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">
            IlmForge — Pakistan's #1 School ERP 🇵🇰<br>
            <a href="https://ilmforge-erp.vercel.app" style="color:#0073b7;">ilmforge-erp.vercel.app</a>
          </p>
        </div>
      </div>
    </body></html>
  `;
  return sendEmail({ to, subject, html, text: `IlmForge Verification Code: ${otp}\n\nValid for 10 minutes.` });
};

/* ══════════════════════════════════════════════════════════
   WELCOME EMAIL — After successful registration
══════════════════════════════════════════════════════════ */
const sendWelcomeEmail = async ({ to, name, schoolName, email, schoolSlug, password, loginUrl }) => {
  const subject = `🎉 ${schoolName} — IlmForge pe Khush Aamdeed!`;
  const schoolLink = `${loginUrl || 'https://ilmforge-erp.vercel.app'}/login?slug=${schoolSlug}`;
  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1B2F6E,#0073b7);padding:32px;text-align:center;">
          <div style="font-size:48px;">🎉</div>
          <h1 style="color:white;margin:8px 0 4px;font-size:24px;font-weight:900;">Mubarak Ho!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:0;font-size:15px;">${schoolName} IlmForge pe register ho gaya!</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#374151;font-size:15px;line-height:1.7;">Assalam-o-Alaikum <strong>${name}</strong>!<br>Aapka school <strong>${schoolName}</strong> tayyar hai. Neechay login details hain:</p>

          <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;">
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#64748b;padding:5px 0;width:120px;">🌐 Login URL:</td><td><a href="${schoolLink}" style="color:#0073b7;font-weight:700;">${schoolLink}</a></td></tr>
              <tr><td style="color:#64748b;padding:5px 0;">📧 Email:</td><td style="font-weight:700;color:#1e3a5f;">${email}</td></tr>
              <tr><td style="color:#64748b;padding:5px 0;">🔑 Password:</td><td style="font-family:monospace;font-size:16px;font-weight:900;color:#dc2626;">${password || '(Email se check karein)'}</td></tr>
            </table>
          </div>

          <div style="background:#fff7ed;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="color:#92400e;font-size:13px;margin:0;font-weight:600;">⚠️ Password save karein!</p>
            <p style="color:#78350f;font-size:12px;margin:6px 0 0;">Pehli baar login ke baad apna password Settings → Profile se zaroor tabdeel karein.</p>
          </div>

          <div style="text-align:center;margin:24px 0;">
            <a href="${schoolLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1B2F6E,#0073b7);color:white;text-decoration:none;border-radius:10px;font-weight:800;font-size:15px;">
              Dashboard Kholein →
            </a>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:16px;margin-top:16px;">
            <p style="color:#374151;font-size:13px;margin:0;font-weight:700;">Agle Steps:</p>
            <ul style="color:#64748b;font-size:13px;margin:8px 0 0;padding-left:20px;line-height:1.8;">
              <li>Classes aur sections banayein</li>
              <li>Students admit karein</li>
              <li>Fee structure set karein</li>
              <li>Staff add karein</li>
            </ul>
          </div>
        </div>
        <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">
            Madad chahiye? WhatsApp: <strong>0348-5321483</strong><br>
            IlmForge — اِلم کو آسان بنائے 🇵🇰
          </p>
        </div>
      </div>
    </body></html>
  `;
  return sendEmail({ to, subject, html });
};

/* ══════════════════════════════════════════════════════════
   FEE PAYMENT NOTIFICATION
══════════════════════════════════════════════════════════ */
const sendFeeReceiptEmail = async ({ to, parentName, studentName, amount, month, receiptNo, schoolName, dueDate }) => {
  const subject = `✅ Fee Receipt — ${studentName} (${month})`;
  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#15803d;color:white;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <div style="font-size:36px;">✅</div>
        <h2 style="margin:8px 0 4px;">Fee Payment Received!</h2>
        <p style="margin:0;opacity:0.85;">${schoolName}</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
        <p style="color:#374151;">Dear <strong>${parentName}</strong>,</p>
        <p style="color:#374151;">Aapke bachay <strong>${studentName}</strong> ki fee payment receive ho gayi hai.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          <tr style="background:#f0fdf4;"><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Receipt No.</td><td style="padding:10px;font-weight:700;border:1px solid #e2e8f0;color:#1e3a5f;">${receiptNo || 'Auto-generated'}</td></tr>
          <tr><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Student</td><td style="padding:10px;font-weight:700;border:1px solid #e2e8f0;">${studentName}</td></tr>
          <tr style="background:#f0fdf4;"><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Fee Month</td><td style="padding:10px;border:1px solid #e2e8f0;">${month}</td></tr>
          <tr><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Amount Paid</td><td style="padding:10px;font-size:18px;font-weight:900;color:#15803d;border:1px solid #e2e8f0;">Rs. ${Number(amount).toLocaleString('en-PK')}</td></tr>
        </table>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">Shukriya! — ${schoolName}</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text: `Fee receipt: ${studentName} — Rs. ${amount} — ${month}` });
};

/* ══════════════════════════════════════════════════════════
   ABSENT ALERT EMAIL to Parents
══════════════════════════════════════════════════════════ */
const sendAbsentAlertEmail = async ({ to, parentName, studentName, date, schoolName }) => {
  const subject = `⚠️ Attendance Alert — ${studentName} Absent`;
  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:Arial,sans-serif;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#dc2626;color:white;padding:20px;text-align:center;">
        <div style="font-size:32px;">⚠️</div>
        <h2 style="margin:6px 0 0;">Attendance Alert</h2>
      </div>
      <div style="padding:24px;">
        <p style="color:#374151;">Dear <strong>${parentName}</strong>,</p>
        <p style="color:#374151;line-height:1.7;">Aapka bacha <strong>${studentName}</strong> aaj <strong>${date}</strong> ko school se <span style="color:#dc2626;font-weight:800;">ABSENT</span> raha.</p>
        <p style="color:#374151;">Baraaye meherbani regular attendance ensure karein.</p>
        <div style="background:#fef2f2;border-radius:8px;padding:12px;margin-top:16px;">
          <p style="color:#91180b;font-size:13px;margin:0;">Koi masla ho to school se rabta zaroor karein.</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px;text-align:center;">— ${schoolName}</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text: `${studentName} aaj absent hai (${date}) — ${schoolName}` });
};

/* ══════════════════════════════════════════════════════════
   FEE REMINDER EMAIL
══════════════════════════════════════════════════════════ */
const sendFeeReminderEmail = async ({ to, parentName, studentName, amount, month, dueDate, schoolName }) => {
  const subject = `🔔 Fee Reminder — ${studentName} (${month})`;
  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:Arial,sans-serif;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#d97706,#f59e0b);color:white;padding:20px;text-align:center;">
        <div style="font-size:32px;">🔔</div>
        <h2 style="margin:6px 0 0;">Fee Reminder</h2>
      </div>
      <div style="padding:24px;">
        <p>Dear <strong>${parentName}</strong>,</p>
        <p style="line-height:1.7;">Aapke bachay <strong>${studentName}</strong> ki <strong>${month}</strong> ki fee pending hai.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
          <p style="color:#92400e;font-size:13px;margin:0;">Amount Due</p>
          <p style="color:#1e3a5f;font-size:28px;font-weight:900;margin:4px 0;">Rs. ${Number(amount).toLocaleString('en-PK')}</p>
          ${dueDate ? `<p style="color:#dc2626;font-size:13px;margin:0;">Due Date: <strong>${dueDate}</strong></p>` : ''}
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">Baraaye meherbani jald payment karein — ${schoolName}</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text: `Fee reminder: ${studentName} — Rs. ${amount} due for ${month}` });
};

/* ══════════════════════════════════════════════════════════
   DAILY COLLECTION REPORT EMAIL to Admin
══════════════════════════════════════════════════════════ */
const sendDailyCollectionEmail = async ({ to, schoolName, date, totalAmount, paymentCount }) => {
  const subject = `📊 Daily Collection Report — ${date}`;
  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:Arial,sans-serif;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#1B2F6E,#0073b7);color:white;padding:24px;text-align:center;">
        <div style="font-size:32px;">📊</div>
        <h2 style="margin:6px 0 4px;">Daily Collection Report</h2>
        <p style="margin:0;opacity:0.85;">${schoolName} — ${date}</p>
      </div>
      <div style="padding:24px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
          <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
            <p style="color:#64748b;font-size:12px;margin:0;">Total Collected</p>
            <p style="color:#15803d;font-size:24px;font-weight:900;margin:4px 0;">Rs. ${Number(totalAmount).toLocaleString('en-PK')}</p>
          </div>
          <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center;">
            <p style="color:#64748b;font-size:12px;margin:0;">Payments Received</p>
            <p style="color:#0073b7;font-size:24px;font-weight:900;margin:4px 0;">${paymentCount}</p>
          </div>
        </div>
        <div style="background:#f8f9fa;border-radius:8px;padding:12px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">Detailed report ke liye: <a href="https://ilmforge-erp.vercel.app/accounting/balancesheet" style="color:#0073b7;">Balance Sheet</a></p>
        </div>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html });
};

/* ══════════════════════════════════════════════════════════
   RESULT PUBLISHED EMAIL
══════════════════════════════════════════════════════════ */
const sendResultPublishedEmail = async ({ to, parentName, studentName, examName, schoolName, portalUrl }) => {
  const subject = `🏆 Result Published — ${studentName} | ${examName}`;
  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:Arial,sans-serif;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:24px;text-align:center;">
        <div style="font-size:36px;">🏆</div>
        <h2 style="margin:6px 0 0;">Result Published!</h2>
      </div>
      <div style="padding:24px;">
        <p>Dear <strong>${parentName}</strong>,</p>
        <p><strong>${studentName}</strong> ka <strong>${examName}</strong> ka result publish ho gaya hai.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${portalUrl || 'https://ilmforge-erp.vercel.app'}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;text-decoration:none;border-radius:10px;font-weight:800;">
            Result Dekhein →
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">— ${schoolName}</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text: `${studentName} ka ${examName} result ready hai. Portal pe dekhayn.` });
};

/* ══════════════════════════════════════════════════════════
   LEGACY ALIASES (backward compat)
══════════════════════════════════════════════════════════ */
const sendTeamAlertEmail = async ({ to, subject, html, text }) =>
  sendEmail({ to, subject, html, text });

const sendSchoolReadyEmail = sendWelcomeEmail;

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendSchoolReadyEmail,
  sendTeamAlertEmail,
  sendFeeReceiptEmail,
  sendAbsentAlertEmail,
  sendFeeReminderEmail,
  sendDailyCollectionEmail,
  sendResultPublishedEmail,
  verifySmtpConnection,
  isEmailConfigured,
};
