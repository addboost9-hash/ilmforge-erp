const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Devices CRUD
router.get('/devices', wrap(async (req, res) => {
  const data = await prisma.biometricDevice.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.post('/devices', wrap(async (req, res) => {
  const { name, deviceType, ipAddress, port, location } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Device name required.' });
  const d = await prisma.biometricDevice.create({
    data: { schoolId: req.schoolId, name, deviceType: deviceType || 'thumb', ipAddress, port: parseInt(port) || 4370, location }
  });
  res.status(201).json({ success: true, data: d });
}));
router.put('/devices/:id', wrap(async (req, res) => {
  const { isActive, name, ipAddress, port, location } = req.body;
  const d = await prisma.biometricDevice.update({
    where: { id: parseInt(req.params.id) },
    data: { ...(name && { name }), ...(ipAddress !== undefined && { ipAddress }), ...(port && { port: parseInt(port) }), ...(location !== undefined && { location }), ...(isActive !== undefined && { isActive: !!isActive }), lastSyncAt: new Date() }
  });
  res.json({ success: true, data: d });
}));

// Punch webhook — ZKTeco-style devices POST here; also used by kiosk UI
// LINKED: punch → attendance record auto-mark
router.post('/punch', wrap(async (req, res) => {
  const { personType = 'student', personId, rollNo, method = 'thumb', deviceId, direction = 'in' } = req.body;
  let pid = personId ? parseInt(personId) : null;

  // Resolve by rollNo if id not given (devices usually send enroll number = rollNo)
  if (!pid && rollNo) {
    const student = await prisma.student.findFirst({ where: { schoolId: req.schoolId, rollNo: String(rollNo), deletedAt: null } });
    if (student) pid = student.id;
  }
  if (!pid) return res.status(404).json({ success: false, message: 'Person not found for punch.' });

  const punch = await prisma.biometricPunch.create({
    data: { schoolId: req.schoolId, deviceId: deviceId ? parseInt(deviceId) : null, personType, personId: pid, method, direction }
  });

  // 🔗 LINKED: auto attendance mark (student, first IN punch of day = present)
  let attendance = null;
  if (personType === 'student' && direction === 'in') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const student = await prisma.student.findUnique({ where: { id: pid } });
    if (student) {
      const existing = await prisma.attendance.findFirst({ where: { schoolId: req.schoolId, studentId: pid, date: { gte: today } } });
      if (!existing) {
        attendance = await prisma.attendance.create({
          data: { schoolId: req.schoolId, campusId: student.campusId, studentId: pid, classId: student.classId, date: new Date(), status: 'present', method }
        }).catch(() => null);
      }
    }
  }
  res.status(201).json({ success: true, data: punch, attendanceMarked: !!attendance });
}));

// Live punch feed (today)
router.get('/punches', wrap(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const punches = await prisma.biometricPunch.findMany({
    where: { schoolId: req.schoolId, punchTime: { gte: today } },
    orderBy: { punchTime: 'desc' }, take: 100,
  });
  // hydrate names
  const sids = punches.filter(p => p.personType === 'student').map(p => p.personId);
  const students = sids.length ? await prisma.student.findMany({ where: { id: { in: sids } }, select: { id: true, name: true, rollNo: true } }) : [];
  const smap = Object.fromEntries(students.map(s => [s.id, s]));
  res.json({ success: true, data: punches.map(p => ({ ...p, person: smap[p.personId] || null })) });
}));

module.exports = router;
