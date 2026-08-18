/**
 * IlmForge — Email Service v3.0
 * Primary: Brevo HTTP API (HTTPS, never blocked by Render/Vercel/Railway)
 * Fallback: Nodemailer SMTP for Gmail/Office365/generic
 */

const nodemailer = require('nodemailer');
const https      = require('https');

const PLATFORM_NAME = process.env.PLATFORM_NAME || 'IlmForge';
const FROM_EMAIL    = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ilmforge.pk';
const FROM_NAME     = process.env.FROM_NAME  || 'IlmForge School ERP';

/* ── Brevo HTTP API sender (uses HTTPS port 443 — never blocked) ── */
const sendViaBrevoApi = async ({ to, subject, html, text }) => {
  // BREVO_API_KEY takes priority (starts with xkeysib-); fall back to SMTP_PASS
  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS || '';
  if (!apiKey) return { success: false, error: 'No Brevo API key' };

  const toArr = Array.isArray(to) ? to : [to];
  const body = JSON.stringify({
    sender:      { name: FROM_NAME, email: FROM_EMAIL },
    to:          toArr.map(email => ({ email })),
    subject,
    htmlContent: html || `<p>${text || subject}</p>`,
    textContent: text || subject,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers: {
        'api-key':       apiKey,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, messageId: JSON.parse(data || '{}').messageId });
        } else {
          const err = JSON.parse(data || '{}');
          resolve({ success: false, error: err.message || `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', err => resolve({ success: false, error: err.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ success: false, error: 'Brevo API timeout' }); });
    req.write(body);
    req.end();
  });
};

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
const isBrevo = () => (process.env.SMTP_HOST || '').includes('brevo') || (process.env.SMTP_HOST || '').includes('sendinblue');

const isEmailConfigured = () => {
  const pass = process.env.SMTP_PASS || process.env.BREVO_API_KEY;
  const user = process.env.SMTP_USER;
  return !!(pass && user && pass !== 'your-app-password' && pass.length > 6);
};

/* ── Verify email connection ───────────────────────────── */
const verifySmtpConnection = async () => {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email not configured. Set SMTP_USER and SMTP_PASS in environment.' };
  }
  if (isBrevo()) {
    // Test Brevo API with a quick account info request
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.brevo.com', path: '/v3/account', method: 'GET',
        headers: { 'api-key': process.env.BREVO_API_KEY || process.env.SMTP_PASS },
      }, (res) => {
        resolve(res.statusCode === 200
          ? { success: true, host: 'api.brevo.com (HTTP API)', user: process.env.SMTP_USER }
          : { success: false, error: `Brevo API returned ${res.statusCode} — check SMTP_PASS/API key` });
      });
      req.on('error', err => resolve({ success: false, error: err.message }));
      req.setTimeout(10000, () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
      req.end();
    });
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
  if (!isEmailConfigured()) {
    console.log(`📧 [EMAIL DEV MODE] To: ${to} | Subject: ${subject}`);
    return { success: true, dev: true };
  }

  const toStr = Array.isArray(to) ? to.join(', ') : to;

  // Brevo: use HTTP API (HTTPS/443) — avoids SMTP port blocking on Render
  if (isBrevo()) {
    const result = await sendViaBrevoApi({ to, subject, html, text });
    if (result.success) {
      console.log(`📧 ✅ Brevo API → ${toStr}`);
    } else {
      console.error(`📧 ❌ Brevo API FAILED → ${toStr}: ${result.error}`);
    }
    return result;
  }

  // Non-Brevo: fall back to SMTP (Gmail / Office365 / generic)
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to, cc, bcc, subject,
      html: html || `<p>${text || subject}</p>`,
      text: text || subject,
      attachments,
    });
    console.log(`📧 ✅ SMTP → ${toStr} | msgId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`📧 ❌ SMTP FAILED → ${toStr}: ${err.message}`);
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
          <h2 style="color:#1e3a5f;margin:0 0 8px;font-size:20px;">Verify Your Email</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Hello <strong>${name || 'Admin'}</strong>! 👋<br>
            An account has been created for your school, <strong>${schoolName || ''}</strong>.<br>
            Your verification code is below:
          </p>

          <!-- OTP Box -->
          <div style="background:linear-gradient(135deg,#1B2F6E,#0073b7);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Verification Code</p>
            <div style="font-size:48px;font-weight:900;color:#f5c518;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</div>
            <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:8px 0 0;">Expires in 10 minutes</p>
          </div>

          <!-- Instructions -->
          <div style="background:#f8f9fa;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="color:#374151;font-size:13px;margin:0;line-height:1.7;">
              1️⃣ Go back to the app<br>
              2️⃣ Enter this 6-digit code<br>
              3️⃣ Tap the "Verify" button<br>
              4️⃣ Your school dashboard will open ✅
            </p>
          </div>

          ${password ? `
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="color:#92400e;font-size:13px;margin:0;font-weight:600;">🔑 Your Password (please save it!):</p>
            <p style="color:#1e3a5f;font-size:20px;font-weight:900;font-family:monospace;margin:6px 0 0;">${password}</p>
          </div>
          ` : ''}

          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center;">
            If you did not register for this account, please ignore this email.<br>
            For help: WhatsApp 0346-5146609
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
  const subject = `🎉 Welcome to IlmForge, ${schoolName}!`;
  const schoolLink = `${loginUrl || 'https://ilmforge-erp.vercel.app'}/login?slug=${schoolSlug}`;
  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1B2F6E,#0073b7);padding:32px;text-align:center;">
          <div style="font-size:48px;">🎉</div>
          <h1 style="color:white;margin:8px 0 4px;font-size:24px;font-weight:900;">Congratulations!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:0;font-size:15px;">${schoolName} has been registered on IlmForge!</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#374151;font-size:15px;line-height:1.7;">Hello <strong>${name}</strong>!<br>Your school <strong>${schoolName}</strong> is all set up. Your login details are below:</p>

          <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;">
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#64748b;padding:5px 0;width:120px;">🌐 Login URL:</td><td><a href="${schoolLink}" style="color:#0073b7;font-weight:700;">${schoolLink}</a></td></tr>
              <tr><td style="color:#64748b;padding:5px 0;">📧 Email:</td><td style="font-weight:700;color:#1e3a5f;">${email}</td></tr>
              <tr><td style="color:#64748b;padding:5px 0;">🔑 Password:</td><td style="font-family:monospace;font-size:16px;font-weight:900;color:#dc2626;">${password || '(Check your email)'}</td></tr>
            </table>
          </div>

          <div style="background:#fff7ed;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="color:#92400e;font-size:13px;margin:0;font-weight:600;">⚠️ Save your password!</p>
            <p style="color:#78350f;font-size:12px;margin:6px 0 0;">After your first login, be sure to change your password from Settings → Profile.</p>
          </div>

          <div style="text-align:center;margin:24px 0;">
            <a href="${schoolLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1B2F6E,#0073b7);color:white;text-decoration:none;border-radius:10px;font-weight:800;font-size:15px;">
              Open Dashboard →
            </a>
          </div>

          <div style="background:#f8f9fa;border-radius:10px;padding:16px;margin-top:16px;">
            <p style="color:#374151;font-size:13px;margin:0;font-weight:700;">Next Steps:</p>
            <ul style="color:#64748b;font-size:13px;margin:8px 0 0;padding-left:20px;line-height:1.8;">
              <li>Create classes and sections</li>
              <li>Admit students</li>
              <li>Set up fee structure</li>
              <li>Add staff members</li>
            </ul>
          </div>
        </div>
        <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">
            Need help? WhatsApp: <strong>0346-5146609</strong><br>
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
        <p style="color:#374151;">We have received the fee payment for your child <strong>${studentName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          <tr style="background:#f0fdf4;"><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Receipt No.</td><td style="padding:10px;font-weight:700;border:1px solid #e2e8f0;color:#1e3a5f;">${receiptNo || 'Auto-generated'}</td></tr>
          <tr><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Student</td><td style="padding:10px;font-weight:700;border:1px solid #e2e8f0;">${studentName}</td></tr>
          <tr style="background:#f0fdf4;"><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Fee Month</td><td style="padding:10px;border:1px solid #e2e8f0;">${month}</td></tr>
          <tr><td style="padding:10px;color:#64748b;border:1px solid #e2e8f0;">Amount Paid</td><td style="padding:10px;font-size:18px;font-weight:900;color:#15803d;border:1px solid #e2e8f0;">Rs. ${Number(amount).toLocaleString('en-PK')}</td></tr>
        </table>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">Thank you! — ${schoolName}</p>
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
        <p style="color:#374151;line-height:1.7;">Your child <strong>${studentName}</strong> was marked <span style="color:#dc2626;font-weight:800;">ABSENT</span> from school today, <strong>${date}</strong>.</p>
        <p style="color:#374151;">Please ensure regular attendance.</p>
        <div style="background:#fef2f2;border-radius:8px;padding:12px;margin-top:16px;">
          <p style="color:#91180b;font-size:13px;margin:0;">If there is any issue, please be sure to contact the school.</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px;text-align:center;">— ${schoolName}</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text: `${studentName} is absent today (${date}) — ${schoolName}` });
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
        <p style="line-height:1.7;">The fee for <strong>${studentName}</strong> for <strong>${month}</strong> is still pending.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
          <p style="color:#92400e;font-size:13px;margin:0;">Amount Due</p>
          <p style="color:#1e3a5f;font-size:28px;font-weight:900;margin:4px 0;">Rs. ${Number(amount).toLocaleString('en-PK')}</p>
          ${dueDate ? `<p style="color:#dc2626;font-size:13px;margin:0;">Due Date: <strong>${dueDate}</strong></p>` : ''}
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">Please make the payment at your earliest convenience — ${schoolName}</p>
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
          <p style="color:#94a3b8;font-size:12px;margin:0;">For the detailed report: <a href="https://ilmforge-erp.vercel.app/accounting/balancesheet" style="color:#0073b7;">Balance Sheet</a></p>
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
        <p>The result for <strong>${studentName}</strong>'s <strong>${examName}</strong> has been published.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${portalUrl || 'https://ilmforge-erp.vercel.app'}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;text-decoration:none;border-radius:10px;font-weight:800;">
            View Result →
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;">— ${schoolName}</p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, text: `${studentName}'s ${examName} result is ready. View it on the portal.` });
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
