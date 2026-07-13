/**
 * IlmForge — Auth Middleware
 * Checks JWT token + school status (active/suspended/expired)
 * Platform owner can suspend any school — users see clear message
 */
const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    /* ── School Status Check ─────────────────────────────────────
       Check if school is still active — cached per request
       Platform owner can suspend any school via /platform/schools/:id/suspend
    ─────────────────────────────────────────────────────────── */
    if (decoded.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: decoded.schoolId },
        select: {
          id: true, name: true, status: true,
          suspendReason: true, trialEndsAt: true,
          plan: true, maxStudents: true,
          licenseKey: true, licenseExpiry: true,
        },
      });

      if (!school) {
        return res.status(403).json({ success: false, message: 'School account not found.', code: 'SCHOOL_NOT_FOUND' });
      }

      // ── SUSPENDED by platform owner ──
      if (school.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'SCHOOL_SUSPENDED',
          message: 'Aapka school account suspend kar diya gaya hai.',
          reason: school.suspendReason || 'Contact IlmForge support.',
          contact: 'WhatsApp: 0348-5321483 | ilmforge-erp.vercel.app',
        });
      }

      // ── INACTIVE ──
      if (school.status === 'inactive') {
        return res.status(403).json({
          success: false,
          code: 'SCHOOL_INACTIVE',
          message: 'School account inactive hai. IlmForge se rabta karein.',
          contact: 'WhatsApp: 0348-5321483',
        });
      }

      // ── TRIAL EXPIRED ──
      if (school.trialEndsAt && new Date(school.trialEndsAt) < new Date() && school.plan === 'free') {
        return res.status(403).json({
          success: false,
          code: 'TRIAL_EXPIRED',
          message: 'Aapka free trial khatam ho gaya hai.',
          detail: `Trial ${new Date(school.trialEndsAt).toLocaleDateString('en-PK')} ko expire hua.`,
          upgrade: 'Plan upgrade karne ke liye: WhatsApp 0348-5321483',
        });
      }

      // ── LICENSE EXPIRED (offline mode) ──
      if (school.licenseKey && school.licenseExpiry && new Date(school.licenseExpiry) < new Date()) {
        return res.status(403).json({
          success: false,
          code: 'LICENSE_EXPIRED',
          message: 'Aapka offline license expire ho gaya hai.',
          expiredOn: school.licenseExpiry,
          renew: 'License renew karne ke liye: WhatsApp 0348-5321483',
        });
      }

      // Attach school info to request
      req.school = school;
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

module.exports = { authMiddleware, requireRole };
