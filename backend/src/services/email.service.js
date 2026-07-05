/**
 * Email Service — Office365 SMTP
 * Uses smtp.office365.com:587 with TLS
 * Mirrors the C# MailSendTeam pattern
 */
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const PLATFORM_NAME = process.env.PLATFORM_NAME || 'IlmForge';

const parseEmailList = (value) => String(value || '')
  .split(/[;,]/)
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

const uniq = (arr) => [...new Set((arr || []).filter(Boolean))];

const normalizeBaseUrl = (url) => String(url || '').replace(/\/+$/, '');
const buildSchoolLoginUrl = ({ loginUrl, schoolSlug }) => {
  const base = normalizeBaseUrl(loginUrl);
  if (!base) return schoolSlug ? `https://${schoolSlug}.ilmforge.cloud/login` : '#';
  return schoolSlug ? `${base}/login?slug=${encodeURIComponent(schoolSlug)}` : `${base}/login`;
};

/* ── Build transporter (Office365) ─────────────────────── */
const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.office365.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    requireTLS: true,
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
    auth: {
      user: process.env.SMTP_USER || 'interface_alerts@carecloud.com',
      pass: process.env.SMTP_PASS || '',
    },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
  });

const verifySmtpConnection = async () => {
  const transporter = createTransporter();
  try {
    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/* ── sendEmail ──────────────────────────────────────────── */
const sendEmail = async ({ to, cc, bcc, subject, html, text, attachments = [] }) => {
  // Fallback — log to console when SMTP password not configured
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'your-app-password') {
    console.log(`\n📧 [EMAIL — no SMTP configured]\nTo:      ${to}\nSubject: ${subject}\nNote: Set SMTP_PASS in .env to send real emails\n`);
    return { success: true, dev: true };
  }

  try {
    const transporter = createTransporter();
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'interface_alerts@carecloud.com';
    const platformName = process.env.PLATFORM_NAME || PLATFORM_NAME;
    const fromName = process.env.FROM_NAME || `${platformName} Platform`;
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      cc,
      bcc,
      subject,
      html,
      text: text || subject,
      attachments,
    });
    console.log(`📧 Email sent → ${to} | msgId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`📧 Email ERROR → ${to}:`, err.message);
    // Don't throw — email failure should never break registration
    return { success: false, error: err.message };
  }
};

const getTeamRecipients = ({ practiceCode, to, cc }) => {
  let rules = {};
  try {
    rules = JSON.parse(process.env.TEAM_ALERT_RULES_JSON || '{}');
  } catch {
    rules = {};
  }

  const defaultsTo = parseEmailList(process.env.TEAM_ALERT_TO_DEFAULT || '');
  const defaultsCc = parseEmailList(process.env.TEAM_ALERT_CC_DEFAULT || '');
  const dynamicRule = rules[String(practiceCode || '')] || {};

  const toList = uniq([
    ...defaultsTo,
    ...parseEmailList(dynamicRule.to || ''),
    ...parseEmailList(to || ''),
  ]);

  const ccList = uniq([
    ...defaultsCc,
    ...parseEmailList(dynamicRule.cc || ''),
    ...parseEmailList(cc || ''),
  ]).filter((mail) => !toList.includes(mail));

  const allowed = parseEmailList(process.env.TEAM_ALERT_ALLOWED_RECIPIENTS || '');
  if (!allowed.length) {
    return { toList, ccList };
  }

  return {
    toList: toList.filter((mail) => allowed.includes(mail)),
    ccList: ccList.filter((mail) => allowed.includes(mail)),
  };
};

const resolveAttachment = (attachmentPath) => {
  if (!attachmentPath) return [];

  const root = path.resolve(process.env.MAIL_ATTACHMENT_ROOT || process.cwd());
  const candidate = path.resolve(String(attachmentPath));
  if (!candidate.startsWith(root)) {
    throw { status: 400, message: 'Attachment path is outside allowed root.' };
  }
  if (!fs.existsSync(candidate)) {
    throw { status: 400, message: 'Attachment file not found.' };
  }

  const maxMb = Number(process.env.MAIL_MAX_ATTACHMENT_MB || 10);
  const maxBytes = Number.isFinite(maxMb) ? maxMb * 1024 * 1024 : 10 * 1024 * 1024;
  const stat = fs.statSync(candidate);
  if (stat.size > maxBytes) {
    throw { status: 400, message: `Attachment exceeds ${maxMb}MB limit.` };
  }

  return [{ filename: path.basename(candidate), path: candidate }];
};

const sendTeamAlertEmail = async ({ subject, html, practiceCode, to, cc, attachmentPath }) => {
  const { toList, ccList } = getTeamRecipients({ practiceCode, to, cc });
  if (!toList.length && !ccList.length) {
    return { success: false, error: 'No allowed recipients configured for team alert.' };
  }

  const attachments = resolveAttachment(attachmentPath);
  return sendEmail({
    to: toList.join(','),
    cc: ccList.join(','),
    subject,
    html,
    attachments,
  });
};

/* ── Welcome / Registration email template ─────────────── */
const sendWelcomeEmail = async ({ to, name, schoolName, email, password, loginUrl, schoolSlug }) => {
  const platform    = PLATFORM_NAME;
  const tagline     = 'Ilm Ko Asaan Banaye';
  // School-specific login link
  const schoolLogin = buildSchoolLoginUrl({ loginUrl, schoolSlug });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${platform} — School Registration</title>
</head>
<body style="margin:0;padding:0;background:#F0FDFA;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDFA;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- ══ HEADER ══ -->
        <tr><td style="background:linear-gradient(145deg,#0F4C45 0%,#0F766E 55%,#0D9488 100%);border-radius:16px 16px 0 0;padding:36px 40px 32px;text-align:center;">
          <!-- Logo mark -->
          <div style="display:inline-block;width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:16px;font-size:32px;line-height:64px;margin-bottom:12px;border:2px solid rgba(255,255,255,0.2);">🎓</div>
          <h1 style="color:#ffffff;margin:0 0 4px;font-size:26px;font-weight:900;letter-spacing:-0.5px;">${platform}</h1>
          <p style="color:rgba(255,255,255,0.65);margin:0;font-size:13px;font-weight:500;letter-spacing:0.3px;">${tagline}</p>
        </td></tr>

        <!-- ══ BODY ══ -->
        <tr><td style="background:#ffffff;padding:36px 40px;">

          <!-- Greeting -->
          <h2 style="color:#0F4C45;font-size:21px;font-weight:800;margin:0 0 10px;letter-spacing:-0.2px;">
            🎉 Your School is Live!
          </h2>
          <p style="color:#374151;font-size:14.5px;line-height:1.75;margin:0 0 28px;">
            Assalam-o-Alaikum <strong style="color:#0F4C45;">${name}</strong>,<br/>
            Congratulations! <strong style="color:#0F766E;">${schoolName}</strong> has been successfully registered on <strong>${platform}</strong>.
            Your admin account is created and your portal is ready.
          </p>

          <!-- ── Credentials Card ── -->
          <div style="background:#F0FDFA;border:1.5px solid #CCFBF1;border-radius:12px;padding:22px 26px;margin-bottom:24px;">
            <h3 style="color:#0F4C45;font-size:12px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;">
              🔑 Your Login Credentials
            </h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#6B7280;font-size:13px;width:115px;vertical-align:top;">🏫 School</td>
                <td style="padding:8px 0;color:#0F4C45;font-size:13.5px;font-weight:700;">${schoolName}</td>
              </tr>
              <tr style="border-top:1px solid #CCFBF1;">
                <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:top;">🌐 Your Login URL</td>
                <td style="padding:8px 0;">
                  <a href="${schoolLogin}" style="color:#0F766E;font-weight:700;font-size:13px;text-decoration:none;word-break:break-all;">${schoolLogin}</a>
                </td>
              </tr>
              <tr style="border-top:1px solid #CCFBF1;">
                <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:top;">📧 Email</td>
                <td style="padding:8px 0;color:#1F2937;font-size:13px;font-weight:600;">${email}</td>
              </tr>
              <tr style="border-top:1px solid #CCFBF1;">
                <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:top;">🔒 Password</td>
                <td style="padding:8px 0;">
                  <span style="display:inline-block;background:#0F4C45;color:#ffffff;font-family:'Courier New',monospace;font-size:15px;font-weight:700;padding:6px 16px;border-radius:8px;letter-spacing:2px;">${password}</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- ── Warning ── -->
          <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:12px 16px;margin-bottom:24px;">
            <p style="color:#78350F;font-size:13px;margin:0;line-height:1.6;">
              ⚠️ <strong>Change your password</strong> after first login:<br/>
              Settings → My Profile → Change Password
            </p>
          </div>

          <!-- ── CTA Button ── -->
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${schoolLogin}"
               style="display:inline-block;background:linear-gradient(90deg,#0F766E,#0D9488);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:800;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(15,118,110,0.35);">
              → Login to ${schoolName} Portal
            </a>
          </div>

          <!-- ── Trial info ── -->
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:9px;padding:12px 16px;margin-bottom:24px;">
            <p style="color:#1D4ED8;font-size:13px;margin:0;line-height:1.6;">
              ⏰ <strong>3-day free trial</strong> started — upgrade anytime to unlock all features &amp; remove limits.
            </p>
          </div>

          <!-- ── Getting Started ── -->
          <div style="border-top:1.5px solid #F3F4F6;padding-top:20px;">
            <h3 style="color:#0F4C45;font-size:13px;font-weight:700;margin:0 0 12px;">📋 Quick Start Guide</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ['1', 'Complete Setup Wizard', 'Configure classes, fee structure and first staff'],
                ['2', 'Admit First Student',   'Go to Admissions → Admit Student'],
                ['3', 'Generate Fee',           'Finance → Fee Management → Generate Fee'],
                ['4', 'Mark Attendance',        'Attendance → Mark Attendance (daily)'],
              ].map(([num, title, desc]) => `
              <tr>
                <td style="padding:7px 0;vertical-align:top;">
                  <span style="display:inline-block;width:22px;height:22px;background:#0F766E;border-radius:50%;color:#fff;font-size:11px;font-weight:800;text-align:center;line-height:22px;">${num}</span>
                </td>
                <td style="padding:7px 0 7px 10px;">
                  <div style="color:#0F4C45;font-size:13px;font-weight:700;">${title}</div>
                  <div style="color:#6B7280;font-size:12px;">${desc}</div>
                </td>
              </tr>`).join('')}
            </table>
          </div>

        </td></tr>

        <!-- ══ FOOTER ══ -->
        <tr><td style="background:#F8FAFC;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <!-- IlmForge brand -->
          <div style="margin-bottom:10px;">
            <span style="font-size:18px;">🎓</span>
            <span style="font-size:14px;font-weight:900;color:#0F4C45;margin-left:6px;">${platform}</span>
            <span style="font-size:11px;color:#D97706;margin-left:6px;font-weight:600;">${tagline}</span>
          </div>
          <p style="color:#9CA3AF;font-size:11.5px;margin:0;line-height:1.7;">
            © ${new Date().getFullYear()} ${platform} · Islamabad, Pakistan<br/>
            This email was sent to <strong>${email}</strong> because you registered on ${platform}.<br/>
            Support: <a href="tel:+923001234567" style="color:#0F766E;text-decoration:none;">+92 300 1234567</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to:      email,
    subject: `${platform} | ${schoolName} Admin Credentials & Login Link`,
    html,
  });
};

/* ── OTP Email ──────────────────────────────────────────── */
const sendOTPEmail = async ({ to, otp, name, schoolName, password, loginUrl }) => {
  const platform = PLATFORM_NAME;
  const year     = new Date().getFullYear();

  // loginUrl may be undefined when called from contexts that don't supply it
  const displayUrl = loginUrl || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Verify Your Email — ${platform}</title></head>
<body style="margin:0;padding:0;background:#F0FDFA;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#F0FDFA;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

      <!-- ── Header ── -->
      <tr><td style="background:linear-gradient(145deg,#0F4C45 0%,#0F766E 55%,#0D9488 100%);border-radius:16px 16px 0 0;padding:30px 36px;text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;font-size:28px;line-height:56px;margin-bottom:10px;border:2px solid rgba(255,255,255,0.2);">🎓</div>
        <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 4px;letter-spacing:-0.3px;">${platform}</h1>
        <p style="color:rgba(255,255,255,0.6);font-size:12.5px;margin:0;">${schoolName}</p>
      </td></tr>

      <!-- ── Body ── -->
      <tr><td style="background:#ffffff;padding:34px 36px 28px;">

        <h2 style="color:#0F4C45;font-size:19px;font-weight:800;margin:0 0 10px;">Verify Your Email Address</h2>
        <p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 26px;">
          Assalam-o-Alaikum <strong style="color:#0F4C45;">${name}</strong>!<br/>
          Use the verification code below to complete your <strong style="color:#0F766E;">${schoolName}</strong> registration on <strong>${platform}</strong>.
        </p>

        <!-- ── OTP Box ── -->
        <div style="background:linear-gradient(135deg,#F0FDFA,#ECFDF5);border:2px solid #0D9488;border-radius:14px;padding:26px 20px;text-align:center;margin-bottom:26px;">
          <p style="color:#0F4C45;font-size:11px;font-weight:700;margin:0 0 14px;text-transform:uppercase;letter-spacing:1.5px;">Your Verification Code</p>
          <div style="display:inline-block;background:#0F4C45;border-radius:12px;padding:16px 40px;margin-bottom:14px;">
            <span style="font-family:'Courier New',monospace;font-size:40px;font-weight:900;color:#ffffff;letter-spacing:16px;">${otp}</span>
          </div>
          <p style="color:#6B7280;font-size:12.5px;margin:0;line-height:1.6;">
            This OTP expires in <strong style="color:#0F4C45;">10 minutes</strong>. Do not share it with anyone.
          </p>
        </div>

        <!-- ── Credentials (password + login URL) ── -->
        ${(password || displayUrl) ? `
        <div style="background:#F8FAFC;border:1.5px solid #E5E7EB;border-radius:12px;padding:20px 24px;margin-bottom:22px;">
          <h3 style="color:#0F4C45;font-size:11px;font-weight:700;margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">
            🔑 Your Login Credentials
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${displayUrl ? `
            <tr>
              <td style="padding:8px 0;color:#6B7280;font-size:13px;width:115px;vertical-align:middle;">🔗 Login URL</td>
              <td style="padding:8px 0;">
                <div style="background:#fff;border:1px solid #CCFBF1;border-radius:7px;padding:7px 12px;display:inline-block;word-break:break-all;">
                  <a href="${displayUrl}" style="color:#0F766E;font-size:13px;font-weight:700;text-decoration:none;">${displayUrl}</a>
                </div>
              </td>
            </tr>` : ''}
            ${displayUrl && password ? `<tr><td colspan="2" style="padding:0;"><div style="height:1px;background:#F3F4F6;margin:2px 0;"></div></td></tr>` : ''}
            <tr>
              <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:middle;">📧 Email</td>
              <td style="padding:8px 0;color:#1F2937;font-size:13px;font-weight:600;">${to}</td>
            </tr>
            ${password ? `
            <tr><td colspan="2" style="padding:0;"><div style="height:1px;background:#F3F4F6;margin:2px 0;"></div></td></tr>
            <tr>
              <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:middle;">🔑 Password</td>
              <td style="padding:8px 0;">
                <span style="display:inline-block;background:#0F4C45;color:#ffffff;font-family:'Courier New',monospace;font-size:14px;font-weight:700;padding:6px 14px;border-radius:7px;letter-spacing:2px;">${password}</span>
              </td>
            </tr>
            <tr><td colspan="2" style="padding:0;"><div style="height:1px;background:#F3F4F6;margin:2px 0;"></div></td></tr>
            <tr>
              <td style="padding:8px 0;color:#6B7280;font-size:13px;vertical-align:middle;">👤 Role</td>
              <td style="padding:8px 0;">
                <span style="display:inline-block;background:#DCFCE7;color:#166534;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">Super Admin</span>
              </td>
            </tr>` : ''}
          </table>
        </div>` : ''}

        <!-- ── Login CTA ── -->
        ${displayUrl ? `
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${displayUrl}"
            style="display:inline-block;background:linear-gradient(90deg,#0F766E,#0D9488);color:#ffffff;text-decoration:none;padding:13px 36px;border-radius:10px;font-size:14.5px;font-weight:800;box-shadow:0 4px 14px rgba(15,118,110,0.3);">
            Login Now →
          </a>
        </div>` : ''}

        <!-- ── Warning ── -->
        <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:9px;padding:12px 16px;margin-bottom:20px;">
          <p style="color:#78350F;font-size:13px;margin:0;line-height:1.6;">
            ⚠️ If you did not register on <strong>${platform}</strong>, please ignore this email.
          </p>
        </div>

        <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
          This is an automated email from <strong>${platform}</strong>. Please do not reply.
        </p>

      </td></tr>

      <!-- ── Footer ── -->
      <tr><td style="background:#F8FAFC;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 36px;text-align:center;">
        <div style="margin-bottom:6px;">
          <span style="font-size:15px;">🎓</span>
          <strong style="font-size:13px;color:#0F4C45;margin-left:5px;">${platform}</strong>
          <span style="font-size:11px;color:#D97706;margin-left:5px;font-weight:600;">Ilm Ko Asaan Banaye</span>
        </div>
        <p style="color:#9CA3AF;font-size:11.5px;margin:0;">
          © ${year} ${platform} · Islamabad, Pakistan
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `${platform} | OTP Verification Code (${schoolName})`,
    html,
  });
};

/* ── School Ready Email — sent after OTP verified ───────── */
const sendSchoolReadyEmail = async ({ name, email, password, schoolName, loginUrl, schoolSlug }) => {
  const platform = PLATFORM_NAME;
  const year     = new Date().getFullYear();

  // Resolve final login URL: prefer explicit loginUrl, fall back to slug-based
  const finalUrl = buildSchoolLoginUrl({ loginUrl, schoolSlug });

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Your School is Ready — ${platform}</title></head>
<body style="margin:0;padding:0;background:#F0FDFA;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#F0FDFA;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- ── Header ── -->
      <tr><td style="background:linear-gradient(145deg,#0F4C45 0%,#0F766E 55%,#0D9488 100%);border-radius:16px 16px 0 0;padding:36px 40px 30px;text-align:center;">
        <div style="display:inline-block;width:68px;height:68px;background:rgba(255,255,255,0.15);border-radius:18px;font-size:34px;line-height:68px;margin-bottom:12px;border:2px solid rgba(255,255,255,0.25);">🎓</div>
        <h1 style="color:#fff;font-size:26px;font-weight:900;margin:0 0 5px;letter-spacing:-0.4px;">${platform}</h1>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;font-weight:500;">Ilm Ko Asaan Banaye</p>
      </td></tr>

      <!-- ── Body ── -->
      <tr><td style="background:#ffffff;padding:36px 40px 30px;">

        <!-- Heading -->
        <h2 style="color:#0F4C45;font-size:22px;font-weight:900;margin:0 0 10px;letter-spacing:-0.3px;">
          🎉 Your School is Ready!
        </h2>
        <p style="color:#374151;font-size:14.5px;line-height:1.8;margin:0 0 28px;">
          Assalam-o-Alaikum <strong style="color:#0F4C45;">${name}</strong>,<br/>
          Mubarak ho! 🎊 <strong style="color:#0F766E;">${schoolName}</strong> has been successfully set up on <strong>${platform}</strong>.
          Your school portal is live and your Super Admin account is ready to use.
        </p>

        <!-- ── Credentials Box ── -->
        <div style="background:linear-gradient(135deg,#F0FDFA 0%,#ECFDF5 100%);border:2px solid #0D9488;border-radius:14px;padding:24px 28px;margin-bottom:26px;">
          <h3 style="color:#0F4C45;font-size:11px;font-weight:700;margin:0 0 18px;text-transform:uppercase;letter-spacing:1.5px;">
            🔑 Your Login Credentials
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

            <!-- Login URL -->
            <tr>
              <td style="padding:10px 0 10px;color:#6B7280;font-size:13px;width:130px;vertical-align:top;white-space:nowrap;">🔗 Your Login URL</td>
              <td style="padding:10px 0 10px;">
                <div style="background:#fff;border:1.5px solid #CCFBF1;border-radius:8px;padding:8px 14px;display:inline-block;max-width:100%;word-break:break-all;">
                  <a href="${finalUrl}" style="color:#0F766E;font-size:13px;font-weight:700;text-decoration:none;">${finalUrl}</a>
                </div>
              </td>
            </tr>

            <tr><td colspan="2" style="padding:0;"><div style="height:1px;background:rgba(15,118,110,0.15);"></div></td></tr>

            <!-- Email -->
            <tr>
              <td style="padding:10px 0;color:#6B7280;font-size:13px;vertical-align:middle;">📧 Email</td>
              <td style="padding:10px 0;color:#1F2937;font-size:13.5px;font-weight:600;">${email}</td>
            </tr>

            <tr><td colspan="2" style="padding:0;"><div style="height:1px;background:rgba(15,118,110,0.15);"></div></td></tr>

            <!-- Password -->
            <tr>
              <td style="padding:10px 0;color:#6B7280;font-size:13px;vertical-align:middle;">🔑 Password</td>
              <td style="padding:10px 0;">
                <span style="display:inline-block;background:#0F4C45;color:#ffffff;font-family:'Courier New',monospace;font-size:16px;font-weight:900;padding:7px 18px;border-radius:8px;letter-spacing:3px;">${password}</span>
              </td>
            </tr>

            <tr><td colspan="2" style="padding:0;"><div style="height:1px;background:rgba(15,118,110,0.15);"></div></td></tr>

            <!-- Role -->
            <tr>
              <td style="padding:10px 0;color:#6B7280;font-size:13px;vertical-align:middle;">👤 Role</td>
              <td style="padding:10px 0;">
                <span style="display:inline-block;background:#DCFCE7;color:#166534;font-size:12.5px;font-weight:700;padding:4px 14px;border-radius:20px;border:1px solid #BBF7D0;">Super Admin</span>
              </td>
            </tr>

          </table>
        </div>

        <!-- ── CTA Button ── -->
        <div style="text-align:center;margin-bottom:26px;">
          <a href="${finalUrl}"
            style="display:inline-block;background:linear-gradient(90deg,#0F766E 0%,#0D9488 100%);color:#ffffff;text-decoration:none;padding:15px 44px;border-radius:11px;font-size:15.5px;font-weight:800;letter-spacing:0.3px;box-shadow:0 5px 18px rgba(15,118,110,0.38);">
            Login Now →
          </a>
        </div>

        <!-- ── Security Note ── -->
        <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:13px 16px;margin-bottom:20px;">
          <p style="color:#78350F;font-size:13px;margin:0;line-height:1.7;">
            🔒 <strong>Security Note:</strong> Please change your password after first login.<br/>
            <span style="color:#92400E;font-size:12px;">Settings → My Profile → Change Password</span>
          </p>
        </div>

        <!-- ── Did You Know ── -->
        <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;padding:13px 16px;margin-bottom:10px;">
          <p style="color:#1D4ED8;font-size:13px;margin:0;line-height:1.7;">
            💡 <strong>Did You Know?</strong> You can invite teachers and parents from <strong>Portal Management</strong>.
          </p>
        </div>

      </td></tr>

      <!-- ── Footer ── -->
      <tr><td style="background:#F8FAFC;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
        <div style="margin-bottom:8px;">
          <span style="font-size:16px;">🎓</span>
          <strong style="font-size:14px;color:#0F4C45;margin-left:5px;">${platform}</strong>
          <span style="font-size:11px;color:#D97706;margin-left:5px;font-weight:600;">Ilm Ko Asaan Banaye</span>
        </div>
        <p style="color:#9CA3AF;font-size:11.5px;margin:0;line-height:1.7;">
          © ${year} ${platform} · Islamabad, Pakistan<br/>
          This email was sent to <strong>${email}</strong> because you registered on ${platform}.<br/>
          Support: <a href="tel:+923001234567" style="color:#0F766E;text-decoration:none;">+92 300 1234567</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return sendEmail({
    to:      email,
    subject: `${platform} | ${schoolName} Portal Ready - Admin Credentials`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendSchoolReadyEmail,
  sendTeamAlertEmail,
  verifySmtpConnection,
};
