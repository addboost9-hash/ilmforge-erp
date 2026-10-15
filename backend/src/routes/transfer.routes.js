/**
 * GET /api/v1/transfer/export — "Download everything": the whole school as
 * one .ilmforge file, to load into the IlmForge desktop app (or move a
 * desktop school to another computer). Admins only.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { exportSchool } = require('../services/transfer.service');
const pkg = require('../../package.json');

router.get('/export', async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.schoolId }, select: { slug: true, name: true } });
    const day = new Date().toISOString().slice(0, 10);
    const safe = String(school?.slug || 'school').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'school';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}-${day}.ilmforge"`);
    // Already gzipped: the compression middleware must leave it alone.
    res.setHeader('Cache-Control', 'no-store, no-transform');
    const out = await exportSchool(req.schoolId, res, { appVersion: pkg.version });
    await prisma.auditLog.create({
      data: { schoolId: req.schoolId, userId: req.user?.id, action: 'SCHOOL_EXPORTED', resource: 'school', resourceId: req.schoolId, details: JSON.stringify(out.counts) },
    }).catch(() => null);
  } catch (err) {
    if (!res.headersSent) return next(err);
    res.destroy(err);
  }
});

module.exports = router;
