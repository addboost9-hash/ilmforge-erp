const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { validateLicenseKey } = require('../utils/license');

// Find license.json (installed by Setup.ps1)
function getLicensePath() {
  const paths = [
    path.join(process.cwd(), '..', 'license.json'),
    path.join(process.cwd(), '..', '..', 'license.json'),
    path.join(process.cwd(), 'license.json'),
  ];
  return paths.find(p => fs.existsSync(p)) || paths[0];
}

function readLicense() {
  try {
    const p = getLicensePath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

function validateKeyFormat(key) {
  return /^ILM-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{8,}$/.test(key);
}

// GET /api/v1/license/status — returns current license info
router.get('/status', authMiddleware, (req, res) => {
  const lic = readLicense();
  const isOffline = (process.env.DATABASE_URL || '').startsWith('file:');

  if (!isOffline) {
    return res.json({ success: true, data: { mode: 'cloud', message: 'Cloud mode — no local license needed' } });
  }

  if (!lic) {
    return res.json({ success: false, data: { mode: 'offline', valid: false, message: 'License not found' } });
  }

  const expiry = lic.expiry ? new Date(lic.expiry) : null;
  const daysLeft = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : null;

  res.json({
    success: true,
    data: {
      mode: 'offline',
      valid: daysLeft === null || daysLeft > 0,
      key: lic.key ? lic.key.substring(0, 12) + '...' : null,
      expiry: lic.expiry,
      daysLeft,
      installedAt: lic.installedAt,
    }
  });
});

// POST /api/v1/license/renew — school enters new key to renew
// FIX: this only regex-checked the key's FORMAT (ILM-XXXX-XXXX-XXXXXXXX), it
// never verified the key was actually issued by the platform owner for this
// school. Any string matching the pattern was accepted, so a school could
// "renew" indefinitely with a made-up key. Now recomputes the same HMAC the
// platform owner's key generator uses (see utils/license.js) and only
// accepts an exact match, scoped to this school's id and current plan.
router.post('/renew', authMiddleware, requireRole('super_admin', 'admin'), async (req, res) => {
  const { key, expiry } = req.body;

  if (!key || !expiry) {
    return res.status(400).json({ success: false, message: 'Both key and expiry date are required' });
  }

  if (!validateKeyFormat(key)) {
    return res.status(400).json({ success: false, message: 'Invalid license key format. It should be in the format ILM-XXXX-XXXX-XXXXXXXXXXXX' });
  }

  const expiryDate = new Date(expiry);
  if (isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
    return res.status(400).json({ success: false, message: 'Expiry date is invalid or in the past' });
  }

  const schoolId = req.user.schoolId;
  let school;
  try {
    school = await prisma.school.findUnique({ where: { id: schoolId }, select: { plan: true } });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to verify license: ${err.message}` });
  }
  if (!school) {
    return res.status(404).json({ success: false, message: 'School not found.' });
  }
  if (!validateLicenseKey(key, schoolId, school.plan, expiryDate)) {
    return res.status(403).json({ success: false, message: 'License key is invalid or was not issued for this school. Contact IlmForge support.' });
  }

  try {
    const licPath = getLicensePath();
    const existing = readLicense() || {};
    const newLic = {
      ...existing,
      key,
      expiry: expiryDate.toISOString().split('T')[0],
      renewedAt: new Date().toISOString().split('T')[0],
    };
    fs.writeFileSync(licPath, JSON.stringify(newLic, null, 2), 'utf8');

    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      message: `License renewed successfully! Valid for ${daysLeft} days. No need to restart the app.`,
      data: { expiry: newLic.expiry, daysLeft }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to save license: ${err.message}` });
  }
});

module.exports = router;
