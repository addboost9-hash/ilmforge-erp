const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { sendSMS } = require('./sms.service');
const { sendEmail, sendWelcomeEmail, sendOTPEmail, sendSchoolReadyEmail } = require('./email.service');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ilmforge-erp.vercel.app';

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
const register = async ({ schoolName, name, email, phone, password: userPassword, plan = 'free', logoUrl = '' }) => {
  // If user provided a password use it; otherwise generate one
  const plainPassword = userPassword && userPassword.length >= 8
    ? userPassword
    : generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  // Create slug from school name
  const slug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
  const safeLogoUrl = typeof logoUrl === 'string' && logoUrl.length > 10 && logoUrl.length <= 1_500_000
    ? logoUrl
    : null;

  // Create school + main campus + super admin user in one transaction
  const result = await prisma.$transaction(async (tx) => {
    const school = await tx.school.create({
      data: {
        name: schoolName,
        slug: uniqueSlug,
        logoUrl: safeLogoUrl,
        email,
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
        email,
        phone,
        role: 'admin',
        passwordHash,
        mustChangePassword: false,
      }
    });

    return { school, campus, user };
  });

  // Generate OTP and save to DB
  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store only the phone number here — never persist the plaintext generated
  // password to durable storage. It's delivered once via email/SMS below and
  // must not round-trip through the DB.
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
  await sendOTPEmail({
    to: email,
    name,
    otp,
    schoolName,
    password: plainPassword,
    loginUrl: `${FRONTEND_URL}/login`,
  });

  // Also send via SMS as backup if phone provided
  if (phone) {
    await sendSMS(phone, `IlmForge OTP: ${otp}. Valid 10 mins.`);
  }

  // 2. Send branded welcome email with login credentials via Office365
  const loginUrl  = `${FRONTEND_URL}/login`;
  await sendWelcomeEmail({
    to:         email,
    name,
    schoolName,
    email,
    schoolSlug: uniqueSlug,
    password:   plainPassword,  // ← the generated (or user-provided) password
    loginUrl,
  });

  // Log credentials to server console for dev convenience only — never in
  // production, where console/log output can end up in retained platform logs.
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n' + '═'.repeat(50));
    console.log('🎓  NEW SCHOOL REGISTERED');
    console.log('   School:   ', schoolName);
    console.log('   Email:    ', email);
    console.log('   Password: ', plainPassword);
    console.log('   Login:    ', loginUrl);
    console.log('═'.repeat(50) + '\n');
  }

  // Unique branded school link (slug-based)
  const schoolLink = `${FRONTEND_URL}/login?slug=${uniqueSlug}`;

  return {
    userId:      result.user.id,
    schoolId:    result.school.id,
    phoneMasked: phone ? phone.replace(/(\d{4})\d{4}(\d{2})/, '$1****$2') : null,
    message:     'Registration successful! Check your email for login credentials.',
    // ═══ Credentials payload for onboarding success popup ═══
    onboarding: {
      schoolName,
      schoolSlug:  uniqueSlug,
      schoolLink,                    // unique login link for THIS school only
      schoolLogoUrl: safeLogoUrl,
      adminEmail:  email,
      adminPassword: plainPassword,  // shown once in popup — user must save it
      loginUrl,
      emailSentTo: email,
    },
    // Return OTP in development (no real SMS)
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
  };
};

// Verify Phone OTP
const verifyPhone = async ({ userId, otp }) => {
  const otpRecord = await prisma.otpToken.findFirst({
    where: { userId, type: 'phone', isUsed: false },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) throw { status: 400, message: 'OTP not found or expired. Please request a new one.' };
  if (new Date() > otpRecord.expiresAt) throw { status: 400, message: 'OTP has expired. Please request a new one.' };
  if (otpRecord.attempts >= 5) throw { status: 429, message: 'Too many wrong attempts. Please request a new OTP.' };

  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);

  if (!isValid) {
    await prisma.otpToken.update({ where: { id: otpRecord.id }, data: { attempts: { increment: 1 } } });
    const remaining = 4 - otpRecord.attempts;
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
  const uniqueLoginUrl = `${FRONTEND_URL}/login?slug=${schoolSlug}&ref=verified`;

  // The plaintext password is never persisted server-side (see register()),
  // so it can't be recovered here — the email template falls back to
  // pointing the user at their original registration email instead.
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

  // Return devOtp in development
  return {
    message: 'Verification code resent to your email.',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
  };
};

// Login
const login = async ({ email, phone, password }) => {
  const where = email ? { email } : { phone };
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
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { school: true } });
    if (!user || !user.isActive) throw { status: 401, message: 'Invalid token' };
    return generateTokens(user);
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token.' };
  }
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

module.exports = { register, verifyPhone, resendOTP, login, refreshToken, changePassword, forgotPassword, resetPassword, verifyEmail };
