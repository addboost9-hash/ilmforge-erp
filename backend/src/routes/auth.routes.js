const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /api/v1/auth/register
// password is optional — system auto-generates one if not provided
router.post('/register', wrap(async (req, res) => {
  const { schoolName, name, email, phone, password, plan, logoUrl } = req.body;
  if (!schoolName || !name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'School name, your name, email and phone are required.' });
  }
  // password may be empty — auth service will generate one
  const data = await authService.register({ schoolName, name, email, phone, password: password || '', plan, logoUrl });
  res.status(201).json({ success: true, data });
}));

// POST /api/v1/auth/verify-phone  (also handles email OTP)
router.post('/verify-phone', wrap(async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ success: false, message: 'userId and otp are required.' });
  const data = await authService.verifyPhone({ userId, otp });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/verify-email-otp  (dedicated email OTP endpoint)
router.post('/verify-email-otp', wrap(async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ success: false, message: 'userId and otp are required.' });
  // Reuse verifyPhone — OTP stored same way regardless of delivery method
  const data = await authService.verifyPhone({ userId, otp });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/resend-otp
router.post('/resend-otp', wrap(async (req, res) => {
  const { userId } = req.body;
  const data = await authService.resendOTP({ userId });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/verify-email
router.post('/verify-email', wrap(async (req, res) => {
  const { userId, token } = req.body;
  const data = await authService.verifyEmail({ userId, token });
  res.json({ success: true, data });
}));

// POST /api/v1/auth/login
router.post('/login', wrap(async (req, res) => {
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

// POST /api/v1/auth/reset-staff-password — admin resets a user's password
// (must be same-school and admin-only — previously any authenticated user
// could reset ANY user's password school-wide, or even cross-school, by
// guessing/enumerating a userId)
router.post('/reset-staff-password', authMiddleware, requireRole('super_admin', 'admin'), wrap(async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'userId and newPassword (min 8 chars) required.' });
  }
  const bcrypt = require('bcryptjs');
  const prisma = require('../config/prisma');
  const target = await prisma.user.findFirst({ where: { id: parseInt(userId), schoolId: req.user.schoolId } });
  if (!target) return res.status(404).json({ success: false, message: 'User not found in your school.' });
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash: hashed, mustChangePassword: true } });
  await prisma.auditLog.create({
    data: { schoolId: req.user.schoolId, userId: req.user.id, action: 'STAFF_PASSWORD_RESET', resource: 'user', resourceId: target.id }
  });
  res.json({ success: true, message: 'Password reset successfully.' });
}));

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
