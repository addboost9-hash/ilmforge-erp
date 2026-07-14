const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const LICENSE_SECRET = process.env.LICENSE_SECRET || 'IlmForgeLicense@Secret#2026!OfflineKey';

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
router.post('/renew', authMiddleware, requireRole('admin'), (req, res) => {
  const { key, expiry } = req.body;

  if (!key || !expiry) {
    return res.status(400).json({ success: false, message: 'key aur expiry date dono zaruri hain' });
  }

  if (!validateKeyFormat(key)) {
    return res.status(400).json({ success: false, message: 'Invalid license key format. ILM-XXXX-XXXX-XXXXXXXXXXXX hona chahiye' });
  }

  const expiryDate = new Date(expiry);
  if (isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
    return res.status(400).json({ success: false, message: 'Expiry date invalid ya past mein hai' });
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
      message: `License renew ho gayi! ${daysLeft} din ki validity. App restart karne ki zarurat nahi.`,
      data: { expiry: newLic.expiry, daysLeft }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `License save nahi hui: ${err.message}` });
  }
});

module.exports = router;
