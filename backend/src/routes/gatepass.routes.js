const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const writeGatePassAudit = async (req, action, passId, details = null) => {
  await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId,
      userId: req.user.id,
      action,
      resource: 'gate_pass',
      resourceId: passId || null,
      details: details ? JSON.stringify(details) : null,
    },
  }).catch(() => null);
};

router.get('/', wrap(async (req, res) => {
  const passes = await prisma.gatePass.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' }, take: 100 });
  const sids = passes.map(p => p.studentId);
  const students = sids.length ? await prisma.student.findMany({ where: { id: { in: sids } }, select: { id: true, name: true, rollNo: true } }) : [];
  const smap = Object.fromEntries(students.map(s => [s.id, s]));
  res.json({ success: true, data: passes.map(p => ({ ...p, student: smap[p.studentId] })) });
}));

router.post('/', wrap(async (req, res) => {
  const { studentId, parentName, reason, validDate } = req.body;
  if (!studentId || !parentName) return res.status(400).json({ success: false, message: 'Student and parent name required.' });
  const passCode = 'GP-' + req.schoolId + '-' + Date.now().toString(36).toUpperCase();
  const pass = await prisma.gatePass.create({
    data: { schoolId: req.schoolId, studentId: parseInt(studentId), parentName, reason, passCode, validDate: validDate ? new Date(validDate) : new Date(), issuedBy: req.user.id }
  });
  await writeGatePassAudit(req, 'GATEPASS_ISSUED', pass.id, { studentId: pass.studentId, passCode: pass.passCode });
  res.status(201).json({ success: true, data: pass });
}));

// Gatekeeper scans QR → verify
router.post('/verify', wrap(async (req, res) => {
  const { passCode } = req.body;
  const pass = await prisma.gatePass.findFirst({ where: { schoolId: req.schoolId, passCode } });
  if (!pass) return res.status(404).json({ success: false, message: 'Invalid pass code.' });
  if (pass.status === 'used') return res.status(400).json({ success: false, message: 'Pass already used at ' + pass.usedAt, data: pass });
  const student = await prisma.student.findUnique({ where: { id: pass.studentId }, select: { name: true, rollNo: true } });
  const updated = await prisma.gatePass.update({ where: { id: pass.id }, data: { status: 'used', usedAt: new Date() } });
  await writeGatePassAudit(req, 'GATEPASS_VERIFIED', pass.id, { passCode, usedAt: updated.usedAt });
  res.json({ success: true, data: { ...updated, student }, message: 'Pass verified — student release authorized.' });
}));

router.post('/:id/revoke', wrap(async (req, res) => {
  const passId = parseInt(req.params.id);
  const pass = await prisma.gatePass.findFirst({ where: { id: passId, schoolId: req.schoolId } });
  if (!pass) return res.status(404).json({ success: false, message: 'Gate pass not found.' });
  if (pass.status === 'used') return res.status(400).json({ success: false, message: 'Used pass cannot be revoked.' });

  const revoked = await prisma.gatePass.update({ where: { id: pass.id }, data: { status: 'expired' } });
  await writeGatePassAudit(req, 'GATEPASS_REVOKED', pass.id, { reason: req.body?.reason || 'manual' });
  res.json({ success: true, data: revoked, message: 'Gate pass revoked successfully.' });
}));

router.get('/audit', wrap(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { schoolId: req.schoolId, resource: 'gate_pass' },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ success: true, data: logs });
}));

module.exports = router;
