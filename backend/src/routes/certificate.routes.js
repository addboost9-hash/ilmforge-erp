const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const data = await prisma.certificate.findMany({ where: { schoolId: req.schoolId }, orderBy: { issuedAt: 'desc' }, take: 100 });
  res.json({ success: true, data });
}));

// Issue certificate — records serial for verification
router.post('/', wrap(async (req, res) => {
  if (!['admin','super_admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admins only.' });
  const { holderType, holderId, certType } = req.body;
  if (!holderId || !certType) return res.status(400).json({ success: false, message: 'Holder and type required.' });
  const serialNo = `CERT-${req.schoolId}-${Date.now().toString(36).toUpperCase()}`;
  const cert = await prisma.certificate.create({
    data: { schoolId: req.schoolId, holderType: holderType || 'student', holderId: parseInt(holderId), certType, serialNo, issuedBy: req.user.id }
  });
  res.status(201).json({ success: true, data: cert, serialNo });
}));

// ---------------------------------------------------------------------------
// Certificate Registry endpoints
// ---------------------------------------------------------------------------

// GET /certificates/registry?certType=&personType=&search= — list CertificateRegistry records
router.get('/registry', wrap(async (req, res) => {
  const { certType, personType, search } = req.query;
  try {
    const records = await prisma.certificateRegistry.findMany({
      where: {
        schoolId: req.schoolId,
        ...(certType && { certType }),
        ...(personType && { personType }),
        ...(search && {
          personName: { contains: search, mode: 'insensitive' },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: records });
  } catch (err) {
    // CertificateRegistry model may not exist — return empty with warning
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return res.json({ success: true, data: [], warning: 'CertificateRegistry model not available in schema.' });
    }
    throw err;
  }
}));

// POST /certificates/registry — save an issued certificate record
// Body: { serialNumber, certType, personType, personId, personName, notes }
router.post('/registry', wrap(async (req, res) => {
  if (!['admin', 'super_admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admins only.' });
  }
  const { serialNumber, certType, personType, personId, personName, notes } = req.body;
  if (!certType) return res.status(400).json({ success: false, message: 'certType is required.' });
  if (!personName) return res.status(400).json({ success: false, message: 'personName is required.' });

  const generatedSerial = serialNumber || `REG-${req.schoolId}-${Date.now().toString(36).toUpperCase()}`;

  try {
    const record = await prisma.certificateRegistry.create({
      data: {
        schoolId: req.schoolId,
        serialNumber: generatedSerial,
        certType,
        personType: personType || 'student',
        personId: personId ? parseInt(personId) : null,
        personName,
        notes: notes || null,
        issuedBy: req.user?.id || null,
        issuedAt: new Date(),
      },
    });
    res.status(201).json({ success: true, data: record, serialNumber: generatedSerial });
  } catch (err) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return res.status(501).json({ success: false, message: 'CertificateRegistry model not available in schema.', detail: err.message });
    }
    throw err;
  }
}));

// GET /certificates/registry/stats — count by certType for this month vs all time
router.get('/registry/stats', wrap(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // All-time counts grouped by certType
    const allTimeRaw = await prisma.certificateRegistry.groupBy({
      by: ['certType'],
      where: { schoolId: req.schoolId },
      _count: { id: true },
    });

    // This-month counts grouped by certType
    const monthRaw = await prisma.certificateRegistry.groupBy({
      by: ['certType'],
      where: { schoolId: req.schoolId, issuedAt: { gte: monthStart } },
      _count: { id: true },
    });

    const allTimeMap = {};
    for (const row of allTimeRaw) {
      allTimeMap[row.certType] = row._count.id;
    }

    const monthMap = {};
    for (const row of monthRaw) {
      monthMap[row.certType] = row._count.id;
    }

    // Merge into unified stats
    const allTypes = [...new Set([...Object.keys(allTimeMap), ...Object.keys(monthMap)])];
    const stats = allTypes.map((certType) => ({
      certType,
      allTime: allTimeMap[certType] || 0,
      thisMonth: monthMap[certType] || 0,
    }));

    const totalAllTime = stats.reduce((acc, s) => acc + s.allTime, 0);
    const totalThisMonth = stats.reduce((acc, s) => acc + s.thisMonth, 0);

    res.json({
      success: true,
      data: stats,
      summary: { totalAllTime, totalThisMonth, monthStart },
    });
  } catch (err) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return res.json({ success: true, data: [], summary: { totalAllTime: 0, totalThisMonth: 0 }, warning: 'CertificateRegistry model not available in schema.' });
    }
    throw err;
  }
}));

module.exports = router;
