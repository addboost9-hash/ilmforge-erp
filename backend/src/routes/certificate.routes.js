const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const data = await prisma.certificate.findMany({ where: { schoolId: req.schoolId }, orderBy: { issuedAt: 'desc' }, take: 100 });
  res.json({ success: true, data });
}));

// Look up the most recent certificate already issued for a holder+type —
// used by the print flow to decide "first issue" vs. "reprint" so a reprint
// always reuses the ORIGINAL serial number instead of minting a new one.
router.get('/lookup', wrap(async (req, res) => {
  const { holderType, holderId, certType } = req.query;
  if (!holderId || !certType) return res.status(400).json({ success: false, message: 'holderId and certType required.' });
  const cert = await prisma.certificate.findFirst({
    where: { schoolId: req.schoolId, holderType: holderType || 'student', holderId: parseInt(holderId), certType },
    orderBy: { issuedAt: 'asc' }, // the ORIGINAL issuance, not the latest reprint record
  });
  res.json({ success: true, data: cert || null });
}));

// Issue certificate — records serial for verification
router.post('/', wrap(async (req, res) => {
  if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins only.' });
  const { holderType, holderId, certType } = req.body;
  if (!holderId || !certType) return res.status(400).json({ success: false, message: 'Holder and type required.' });
  const serialNo = `CERT-${req.schoolId}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*1000)}`;
  const cert = await prisma.certificate.create({
    data: { schoolId: req.schoolId, holderType: holderType || 'student', holderId: parseInt(holderId), certType, serialNo, issuedBy: req.user.id }
  });
  res.status(201).json({ success: true, data: cert, serialNo });
}));

module.exports = router;
