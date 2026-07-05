const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/audit?limit=100&action=...&resource=...
router.get('/', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 300);
  const action = req.query.action ? String(req.query.action) : null;
  const resource = req.query.resource ? String(req.query.resource) : null;

  const where = {
    schoolId,
    ...(action && { action }),
    ...(resource && { resource }),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json({ success: true, data: rows });
}));

// GET /api/v1/audit/summary
router.get('/summary', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const [total, last7Days, byActionRaw, byResourceRaw] = await Promise.all([
    prisma.auditLog.count({ where: { schoolId } }),
    prisma.auditLog.count({ where: { schoolId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: { schoolId },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 8,
    }),
    prisma.auditLog.groupBy({
      by: ['resource'],
      where: { schoolId, resource: { not: null } },
      _count: { resource: true },
      orderBy: { _count: { resource: 'desc' } },
      take: 8,
    }),
  ]);

  const byAction = byActionRaw.map((x) => ({ key: x.action || 'unknown', count: x._count.action }));
  const byResource = byResourceRaw.map((x) => ({ key: x.resource || 'unknown', count: x._count.resource }));

  res.json({
    success: true,
    data: {
      total,
      last7Days,
      byAction,
      byResource,
      generatedAt: new Date().toISOString(),
    },
  });
}));

module.exports = router;
