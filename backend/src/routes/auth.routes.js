const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authService = require('../services/auth.service');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Stricter rate limiter for sensitive auth endpoints — 10 requests per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
});

// POST /api/v1/auth/register
// password is optional — system auto-generates one if not provided
router.post('/register', wrap(async (req, res) => {
  const { schoolName, name, email, phone, password, plan, logoUrl } = req.body;
  if (!schoolName || !name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'School name, your name, email and phone are required.' });
  }
  // password may be empty — auth service will generate one
  const data = await authService.register({
    schoolName,
    name,
    email,
    phone,
    password: password || '',
    plan,
    logoUrl,
    requestOrigin: req.get('origin') || '',
  });
  res.status(201).json({ success: true, data });
}));

// GET /api/v1/auth/register
// Helpful response for manual browser access; registration endpoint is POST-only.
router.get('/register', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method not allowed. Use POST /api/v1/auth/register to create a school account.',
  });
});

// POST /api/v1/auth/verify-phone  (also handles email OTP)
router.post('/verify-phone', authLimiter, wrap(async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ success: false, message: 'userId and otp are required.' });
  const data = await authService.verifyPhone({ userId, otp, requestOrigin: req.get('origin') || '' });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/verify-email-otp  (dedicated email OTP endpoint)
router.post('/verify-email-otp', wrap(async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ success: false, message: 'userId and otp are required.' });
  // Reuse verifyPhone — OTP stored same way regardless of delivery method
  const data = await authService.verifyPhone({ userId, otp, requestOrigin: req.get('origin') || '' });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/resend-otp
router.post('/resend-otp', wrap(async (req, res) => {
  const { userId } = req.body;
  const data = await authService.resendOTP({ userId, requestOrigin: req.get('origin') || '' });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/resend-credentials
// Compatibility endpoint for onboarding modal button.
router.post('/resend-credentials', authMiddleware, wrap(async (req, res) => {
  const data = await authService.resendCredentialsForUser({ userId: req.user.id, requestOrigin: req.get('origin') || '' });
  res.json({ success: true, ...data });
}));

// POST /api/v1/auth/verify-email
router.post('/verify-email', wrap(async (req, res) => {
  const { userId, token } = req.body;
  const data = await authService.verifyEmail({ userId, token });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/login
router.post('/login', authLimiter, wrap(async (req, res) => {
  const { email, phone, password } = req.body;
  if (!password || (!email && !phone)) {
    return res.status(400).json({ success: false, message: 'Email/phone and password are required.' });
  }
  const data = await authService.login({ email, phone, password });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/refresh
router.post('/refresh', wrap(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required.' });
  const data = await authService.refreshToken({ refreshToken });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', wrap(async (req, res) => {
  const { email } = req.body;
  const data = await authService.forgotPassword({ email });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/reset-password
router.post('/reset-password', wrap(async (req, res) => {
  const { userId, token, newPassword } = req.body;
  const data = await authService.resetPassword({ userId, token, newPassword });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/change-password (requires auth)
router.post('/change-password', authMiddleware, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const data = await authService.changePassword({ userId: req.user.id, currentPassword, newPassword });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/reset-staff-password — admin resets any user's password
//
// Security fixes applied:
//   1. authenticate middleware (authMiddleware) ensures caller is logged in
//   2. requireRole guard restricts access to super_admin and admin only
//   3. schoolId ownership check prevents cross-tenant password resets
//   4. Minimum password length raised from 4 to 8 characters
const resetStaffPasswordHandler = wrap(async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'userId and newPassword (min 8 chars) required.' });
  }
  const bcrypt = require('bcryptjs');
  const prisma = require('../config/prisma');

  // /auth routes are mounted before tenant middleware; use JWT payload scope.
  const callerSchoolId = parseInt(req.user?.schoolId, 10);
  if (!callerSchoolId) {
    return res.status(403).json({ success: false, message: 'School context missing.' });
  }

  // Ownership check: the target user must belong to the same school as the caller.
  const targetUser = await prisma.user.findFirst({
    where: { id: parseInt(userId, 10), schoolId: callerSchoolId },
  });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: targetUser.id }, data: { passwordHash: hashed } });
  res.json({ success: true, message: 'Password reset successfully.' });
});

router.post('/reset-staff-password', authLimiter, authMiddleware, requireRole('super_admin', 'admin'), resetStaffPasswordHandler);
router.put('/reset-staff-password', authLimiter, authMiddleware, requireRole('super_admin', 'admin'), resetStaffPasswordHandler);

// GET /api/v1/auth/me
router.get('/me', authMiddleware, wrap(async (req, res) => {
  const prisma = require('../config/prisma');
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { school: { include: { campuses: true } } }
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  const { passwordHash, ...safe } = user;
  res.json({ success: true, data: safe });
}));

module.exports = router;
