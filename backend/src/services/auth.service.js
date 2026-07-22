const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { sendSMS } = require('./sms.service');
const { sendEmail, sendWelcomeEmail, sendOTPEmail, sendSchoolReadyEmail } = require('./email.service');

const FRONTEND_URL = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://ilmforge-erp.vercel.app' : 'http://localhost:3000');

const normalizeBaseUrl = (url) => String(url || '').trim().replace(/\/$/, '');

const resolveFrontendUrl = (requestOrigin) => {
  const origin = normalizeBaseUrl(requestOrigin);
  const envBase = normalizeBaseUrl(FRONTEND_URL);
  const isLocalOrigin = /^http:\/\/localhost:\d+$/i.test(origin);

  // In non-production, prefer caller origin so generated onboarding links match the running frontend.
  if (process.env.NODE_ENV !== 'production' && isLocalOrigin) {
    return origin;
  }

  return envBase || 'http://localhost:3000';
};

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Generate a strong random password  e.g.  Sch#7mK9pL
 * Format: "Sch" + 3 random digits + "#" + 4 random alphanumeric
 */
const generatePassword = () => {
  const chars    = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits   = '23456789';
  const specials = '#@!$';
  const rand = (s) => s[Math.floor(Math.random() * s.length)];
  return (
    'Sch' +
    rand(digits) + rand(digits) + rand(digits) +
    rand(specials) +
    rand(chars) + rand(chars) + rand(chars) + rand(chars)
  );
};

// Register new school — password is auto-generated and sent via email
const register = async ({ schoolName, name, email, phone, password: userPassword, plan = 'free', logoUrl = '', requestOrigin = '' }) => {
  const frontendBase = resolveFrontendUrl(requestOrigin);
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const [existingSchools, existingUsers] = await Promise.all([
    prisma.school.findMany({ where: { email: normalizedEmail, deletedAt: null } }),
    prisma.user.findMany({ where: { email: normalizedEmail, deletedAt: null } }),
  ]);

  if (existingSchools.length || existingUsers.length) {
    if (process.env.NODE_ENV !== 'production') {
      // Local/dev convenience: allow re-registering with same test email by archiving old active rows.
      for (const u of existingUsers) {
        await prisma.user.update({
          where: { id: u.id },
          data: {
            email: `archived+${u.id}+${Date.now()}@example.local`,
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }
      for (const s of existingSchools) {
        await prisma.school.update({
          where: { id: s.id },
          data: {
            email: `archived-school+${s.id}+${Date.now()}@example.local`,
            status: 'inactive',
            deletedAt: new Date(),
          },
        });
      }
    } else {
    throw {
      status: 409,
      message: 'This email is already registered. Use another email or ask admin to resend credentials.',
      code: 'EMAIL_ALREADY_EXISTS',
    };
    }
  }

  // If user provided a password use it; otherwise generate one
  const plainPassword = userPassword && userPassword.length >= 8
    ? userPassword
    : generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  // Build collision-resistant slug candidates for registration attempts
  const baseSlug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'school';
  const buildUniqueSlug = () => `${baseSlug}-${Date.now().toString(36)}-${uuidv4().slice(0, 6)}`;
  const safeLogoUrl = typeof logoUrl === 'string' && logoUrl.length > 10 && logoUrl.length <= 1_500_000
    ? logoUrl
    : null;

  // Create school + campus + admin user; in dev retry once if a race caused unique conflict.
  const createSchoolGraph = async () => {
    const uniqueSlug = buildUniqueSlug();
    return prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          slug: uniqueSlug,
          logoUrl: safeLogoUrl,
          email: normalizedEmail,
          plan,
          trialEndsAt: plan !== 'free' ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
        }
      });

      const campus = await tx.campus.create({
        data: { schoolId: school.id, name: 'Main Campus', isMain: true }
      });

      const user = await tx.user.create({
        data: {
          schoolId: school.id,
          campusId: campus.id,
          name,
          email: normalizedEmail,
          phone,
          role: 'admin',
          passwordHash,
          mustChangePassword: false,
        }
      });

      return { school, campus, user };
    });
  };

  let result;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      result = await createSchoolGraph();
      break;
    } catch (err) {
      const canRetry = process.env.NODE_ENV !== 'production' && err?.code === 'P2002' && attempt === 0;
      if (!canRetry) throw err;

      const retryUsers = await prisma.user.findMany({ where: { email: normalizedEmail, deletedAt: null } });
      const retrySchools = await prisma.school.findMany({ where: { email: normalizedEmail, deletedAt: null } });
      for (const u of retryUsers) {
        await prisma.user.update({
          where: { id: u.id },
          data: {
            email: `archived+${u.id}+${Date.now()}@example.local`,
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }
      for (const s of retrySchools) {
        await prisma.school.update({
          where: { id: s.id },
          data: {
            email: `archived-school+${s.id}+${Date.now()}@example.local`,
            status: 'inactive',
            deletedAt: new Date(),
          },
        });
      }
    }
  }

  if (!result) throw { status: 500, message: 'Registration could not be completed. Please retry.' };

  // Generate OTP and save to DB
  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpToken.create({
    data: {
      userId: result.user.id,
      phone,
      otpHash,
      type: 'phone',
      expiresAt,
    }
  });

  // 1. Send OTP via EMAIL (Office365) — primary verification method
  const otpEmailResult = await sendOTPEmail({
    to: email,
    name,
    otp,
    schoolName,
    password: plainPassword,
    loginUrl: `${frontendBase}/login`,
  });

  // Also send via SMS as backup if phone provided
  if (phone) {
    await sendSMS(phone, `IlmForge OTP: ${otp}. Valid 10 mins.`);
  }

  // 2. Send branded welcome email with login credentials via Office365
  const loginUrl  = frontendBase;
  const welcomeEmailResult = await sendWelcomeEmail({
    to:         email,
    name,
    schoolName,
    email,
    schoolSlug: result.school.slug,
    password:   plainPassword,  // ← the generated (or user-provided) password
    loginUrl,
  });

  console.log(`School registered: ${schoolName} (${email})`);
  // Always log OTP to server console (visible in Render logs) for support purposes
  console.log(`[OTP] Registration OTP for ${email} (userId=${result.user.id}): ${otp} — valid 10 mins`);
  if (!otpEmailResult?.success) {
    console.error(`[OTP] Email delivery FAILED for ${email}. Error: ${otpEmailResult?.error}`);
  }

  // Unique branded school link (slug-based)
  const schoolLink = `${frontendBase}/login?slug=${result.school.slug}`;
  const emailDelivery = {
    otpEmailSent: Boolean(otpEmailResult?.success),
    welcomeEmailSent: Boolean(welcomeEmailResult?.success),
  };

  return {
    userId:      result.user.id,
    schoolId:    result.school.id,
    phoneMasked: phone ? phone.replace(/(\d{4})\d{4}(\d{2})/, '$1****$2') : null,
    message:     emailDelivery.otpEmailSent || emailDelivery.welcomeEmailSent
      ? 'Registration successful! Check your email for login credentials.'
      : 'Registration successful, but email delivery failed. Please use resend credentials.',
    // ═══ Credentials payload for onboarding success popup ═══
    onboarding: {
      schoolName,
      schoolSlug:  result.school.slug,
      schoolLink,                    // unique login link for THIS school only
      schoolLogoUrl: safeLogoUrl,
      adminEmail:  email,
      adminPassword: plainPassword,  // shown once in popup — user must save it
      loginUrl,
      emailSentTo: email,
      emailDelivery,
    },
    // Return devOtp when email delivery fails so user can proceed
    // This is safe because the OTP is short-lived (10 min) and tied to userId
    devOtp: !otpEmailResult?.success ? otp : undefined,
    emailFailed: !otpEmailResult?.success,
  };
};

const resendCredentialsForUser = async ({ userId, requestOrigin = '' }) => {
  const frontendBase = resolveFrontendUrl(requestOrigin);
  const user = await prisma.user.findUnique({ where: { id: parseInt(userId) }, include: { school: true } });
  if (!user) throw { status: 404, message: 'User not found.' };

  const tempPassword = generatePassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: true } });

  const loginUrl = frontendBase;
  const mail = await sendSchoolReadyEmail({
    to: user.email,
    name: user.name,
    schoolName: user.school?.name || 'Your School',
    schoolSlug: user.school?.slug || '',
    loginUrl,
    email: user.email,
    password: tempPassword,
  });

  // DEV-ONLY: log temp password to server console — never expose in API response.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV-ONLY] Temp password for userId=${user.id}: ${tempPassword}`);
  }

  return {
    message: mail?.success ? 'Credentials email sent.' : 'Could not send email. Check SMTP settings.',
    emailSent: Boolean(mail?.success),
    // tempPassword intentionally omitted from response — logged server-side above.
  };
};

// Verify Phone OTP
const verifyPhone = async ({ userId, otp, requestOrigin = '' }) => {
  const frontendBase = resolveFrontendUrl(requestOrigin);
  const otpRecord = await prisma.otpToken.findFirst({
    where: { userId, type: 'phone', isUsed: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) throw { status: 400, message: 'OTP not found or expired. Please request a new one.' };
  if (new Date() > otpRecord.expiresAt) throw { status: 400, message: 'OTP has expired. Please request a new one.' };

  // Check limit BEFORE comparing so the 5th bad guess locks the record — prevents 6-guess window.
  if (otpRecord.attempts >= 5) {
    await prisma.otpToken.update({ where: { id: otpRecord.id }, data: { isUsed: true } });
    throw { status: 429, message: 'Too many wrong attempts. Please request a new OTP.' };
  }

  // Increment attempt counter BEFORE comparing to close the off-by-one window.
  const updated = await prisma.otpToken.update({
    where: { id: otpRecord.id },
    data: { attempts: { increment: 1 } },
  });

  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);

  if (!isValid) {
    const remaining = 5 - updated.attempts;
    throw { status: 400, message: `Invalid OTP. ${remaining} attempt(s) remaining.` };
  }

  // Mark OTP as used and verify email
  await prisma.$transaction([
    prisma.otpToken.update({ where: { id: otpRecord.id }, data: { isUsed: true } }),
    prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } }),
  ]);

  // Issue tokens
  const user  = await prisma.user.findUnique({ where: { id: userId }, include: { school: true } });
  const tokens = generateTokens(user);

  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, userId: user.id, action: 'EMAIL_VERIFIED', resource: 'user', resourceId: user.id }
  });

  // ── Send "School is Ready" email with unique branded login link ──────
  const schoolSlug  = user.school?.slug || '';
  // Unique link: /login?slug=future-foundation-abc&ref=verified
  const uniqueLoginUrl = `${frontendBase}/login?slug=${schoolSlug}&ref=verified`;

  await sendSchoolReadyEmail({
    to:         user.email,
    name:       user.name,
    schoolName: user.school?.name || 'Your School',
    schoolSlug,
    loginUrl:   uniqueLoginUrl,
    email:      user.email,
    password:   '',
  });

  return { ...tokens, user: sanitizeUser(user), school: user.school };
};

// Resend OTP — now sends via email (Office365) + SMS backup
const resendOTP = async ({ userId }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: 'User not found.' };

  // Invalidate existing OTPs
  await prisma.otpToken.updateMany({ where: { userId, type: 'phone', isUsed: false }, data: { isUsed: true } });

  const otp     = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.otpToken.create({
    data: { userId, phone: user.phone, otpHash, type: 'phone', expiresAt: new Date(Date.now() + 10 * 60 * 1000) }
  });

  // Send new OTP via email
  if (user.email) {
    await sendOTPEmail({ to: user.email, name: user.name, otp, schoolName: 'IlmForge' });
  }

  // Backup: also send via SMS
  if (user.phone) {
    await sendSMS(user.phone, `IlmForge OTP: ${otp}. Valid 10 mins.`);
  }

  // Always log OTP (visible in Render logs for admin support)
  console.log(`[OTP] Resend OTP for ${user.email} (userId=${userId}): ${otp}`);

  return {
    message: 'Verification code resent to your email.',
    // Return devOtp so frontend can show it when email delivery fails
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    // In production, hint to check Render logs
    hint: process.env.NODE_ENV === 'production' ? 'Check your email inbox and spam folder. If not received, contact support.' : undefined,
  };
};

// Login
const login = async ({ email, phone, password }) => {
  // Build OR conditions: support login by email (case-insensitive) or phone number
  const identifier = email || phone;
  const normalizedEmail = identifier ? identifier.trim().toLowerCase() : null;
  const normalizedPhone = identifier ? identifier.trim().replace(/[^0-9+]/g, '') : null;
  const orConditions = [];
  if (normalizedEmail) orConditions.push({ email: normalizedEmail });
  if (normalizedPhone && normalizedPhone.length >= 10) {
    orConditions.push({ phone: normalizedPhone });
    // Also try with leading zero variants
    if (normalizedPhone.startsWith('92') && normalizedPhone.length === 12) {
      orConditions.push({ phone: '0' + normalizedPhone.slice(2) });
    } else if (normalizedPhone.startsWith('0') && normalizedPhone.length === 11) {
      orConditions.push({ phone: '92' + normalizedPhone.slice(1) });
    }
  }
  const where = orConditions.length > 1 ? { OR: orConditions } : (orConditions[0] || { email: '' });
  const user = await prisma.user.findFirst({ where: { ...where, deletedAt: null }, include: { school: true } });

  if (!user) throw { status: 401, message: 'Invalid credentials.' };
  if (!user.isActive) throw { status: 403, message: 'Account is deactivated. Contact your admin.' };
  if (!user.school || user.school.status !== 'active') throw { status: 403, message: 'School account is inactive.' };

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    await prisma.auditLog.create({
      data: { schoolId: user.schoolId, userId: user.id, action: 'LOGIN_FAILED', resource: 'user', resourceId: user.id }
    });
    throw { status: 401, message: 'Invalid credentials.' };
  }

  if (!user.phoneVerifiedAt) throw { status: 403, message: 'Phone not verified. Please verify your phone number.', code: 'PHONE_UNVERIFIED', userId: user.id };

  // Update last login
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = generateTokens(user);

  await prisma.auditLog.create({
    data: { schoolId: user.schoolId, userId: user.id, action: 'LOGIN_SUCCESS', resource: 'user', resourceId: user.id }
  });

  return { ...tokens, user: sanitizeUser(user), school: user.school, mustChangePassword: user.mustChangePassword };
};

// Refresh token
const refreshToken = async ({ refreshToken: token }) => {
  // Step 1: Verify JWT signature — real token errors
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token.' };
  }

  // Step 2: Load user — DB errors are NOT token errors (retry once on connection drop)
  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { school: true } });
  } catch (dbErr) {
    // Neon connection dropped (happens on Render spin-up) — wait and retry once
    await new Promise(r => setTimeout(r, 2500));
    try {
      user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { school: true } });
    } catch {
      throw { status: 503, message: 'Server restarting — please try again in a moment.' };
    }
  }

  if (!user || !user.isActive) throw { status: 401, message: 'Account not found or deactivated.' };
  return generateTokens(user);
};

// Change password
const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: 'User not found.' };

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw { status: 400, message: 'Current password is incorrect.' };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });

  return { message: 'Password changed successfully.' };
};

// Forgot password - send reset link
const forgotPassword = async ({ email }) => {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) return { message: 'If that email exists, you will receive a reset link.' };

  const resetToken = uuidv4();
  const tokenHash = await bcrypt.hash(resetToken, 10);

  await prisma.otpToken.create({
    data: { userId: user.id, email, otpHash: tokenHash, type: 'reset', expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&userId=${user.id}`;
  await sendEmail({
    to: email,
    subject: '🔑 Reset your EduManage Pro password',
    html: `<p>Hello ${user.name},</p><p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}" style="background:#2563EB;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a></p><p>If you did not request this, ignore this email.</p>`
  });

  return { message: 'If that email exists, you will receive a reset link.' };
};

// Reset password with token
const resetPassword = async ({ userId, token, newPassword }) => {
  const record = await prisma.otpToken.findFirst({
    where: { userId, type: 'reset', isUsed: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!record || new Date() > record.expiresAt) throw { status: 400, message: 'Reset link is invalid or expired.' };

  const isValid = await bcrypt.compare(token, record.otpHash);
  if (!isValid) throw { status: 400, message: 'Invalid reset token.' };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.otpToken.update({ where: { id: record.id }, data: { isUsed: true } }),
  ]);

  return { message: 'Password reset successfully. You can now log in.' };
};

// Verify email
const verifyEmail = async ({ userId, token }) => {
  const record = await prisma.otpToken.findFirst({
    where: { userId, type: 'email', isUsed: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!record || new Date() > record.expiresAt) throw { status: 400, message: 'Verification link expired.' };

  const isValid = await bcrypt.compare(token, record.otpHash);
  if (!isValid) throw { status: 400, message: 'Invalid verification link.' };

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.otpToken.update({ where: { id: record.id }, data: { isUsed: true } }),
  ]);

  return { message: 'Email verified successfully.' };
};

// Helper: generate JWT tokens
const generateTokens = (user) => {
  const payload = { id: user.id, schoolId: user.schoolId, campusId: user.campusId, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, photoUrl: user.photoUrl, schoolId: user.schoolId, campusId: user.campusId });

const getWelcomeEmailHtml = ({ name, schoolName, verifyUrl }) => `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  <div style="background:#1E3A5F;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:28px">EduManage Pro</h1>
    <p style="color:#93C5FD;margin:8px 0 0">School Management Platform</p>
  </div>
  <div style="padding:40px">
    <h2 style="color:#1E3A5F">Assalam O Alaikum, ${name}! 🎉</h2>
    <p style="color:#475569;font-size:16px">Your school <strong>${schoolName}</strong> has been successfully registered on EduManage Pro.</p>
    <p style="color:#475569">Please verify your email address to secure your account:</p>
    <div style="text-align:center;margin:32px 0">
      <a href="${verifyUrl}" style="background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">✅ Verify My Email Address</a>
    </div>
    <p style="color:#64748B;font-size:14px">This link expires in 24 hours. If you didn't register, please ignore this email.</p>
  </div>
  <div style="background:#F1F5F9;padding:20px;text-align:center">
    <p style="color:#94A3B8;font-size:13px;margin:0">© 2026 EduManage Pro • Islamabad, Pakistan</p>
  </div>
</div></body></html>`;

module.exports = { register, verifyPhone, resendOTP, login, refreshToken, changePassword, forgotPassword, resetPassword, verifyEmail, resendCredentialsForUser };
