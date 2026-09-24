const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Gate staff and school management keep the visitor register.
const canManage = (role) => ['super_admin', 'admin', 'gatekeeper'].includes(role);
const gateOnly = (req, res, next) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Gate or admin access required.' });
  }
  next();
};

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

// GET /visitors?scope=today|inside|all&limit=
router.get('/', gateOnly, wrap(async (req, res) => {
  const { scope = 'today' } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);

  const where = { schoolId: req.schoolId };
  if (scope === 'today')  where.checkinAt = { gte: startOfToday() };
  if (scope === 'inside') where.checkoutAt = null;

  const visitors = await prisma.visitorLog.findMany({
    where,
    orderBy: { checkinAt: 'desc' },
    take: limit,
  });

  const insideCount = await prisma.visitorLog.count({
    where: { schoolId: req.schoolId, checkoutAt: null },
  });

  res.json({ success: true, data: visitors, insideCount });
}));

// POST /visitors — check a visitor in
router.post('/', gateOnly, wrap(async (req, res) => {
  const { visitorName, phone, purpose, hostName, vehicleNo } = req.body;
  if (!visitorName || !String(visitorName).trim()) {
    return res.status(400).json({ success: false, message: 'Visitor name is required.' });
  }

  const visitor = await prisma.visitorLog.create({
    data: {
      schoolId:   req.schoolId,
      campusId:   req.campusId || null,
      visitorName: String(visitorName).trim(),
      phone:      phone     || null,
      purpose:    purpose   || 'Meeting',
      hostName:   hostName  || null,
      vehicleNo:  vehicleNo || null,
      recordedBy: req.user?.id || null,
    },
  });

  res.status(201).json({ success: true, data: visitor });
}));

// PUT /visitors/:id/checkout — record departure.
// Conditional update so two gate devices checking the same visitor out at once
// cannot overwrite the first, earlier, departure time.
router.put('/:id/checkout', gateOnly, wrap(async (req, res) => {
  const id = parseInt(req.params.id);

  const { count } = await prisma.visitorLog.updateMany({
    where: { id, schoolId: req.schoolId, checkoutAt: null },
    data: { checkoutAt: new Date() },
  });

  if (count === 0) {
    const existing = await prisma.visitorLog.findFirst({ where: { id, schoolId: req.schoolId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Visitor entry not found.' });
    return res.status(409).json({ success: false, message: 'This visitor has already been checked out.' });
  }

  const visitor = await prisma.visitorLog.findFirst({ where: { id, schoolId: req.schoolId } });
  res.json({ success: true, data: visitor, message: 'Visitor checked out.' });
}));

module.exports = router;
