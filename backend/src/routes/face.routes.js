const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Enroll a face (photo + optional descriptor from face-api.js)
router.post('/enroll', wrap(async (req, res) => {
  const { personType = 'student', personId, photoData, descriptor } = req.body;
  if (!personId || !photoData) return res.status(400).json({ success: false, message: 'personId and photoData required.' });
  const rec = await prisma.faceEnrollment.upsert({
    where: { schoolId_personType_personId: { schoolId: req.schoolId, personType, personId: parseInt(personId) } },
    create: { schoolId: req.schoolId, personType, personId: parseInt(personId), photoData, descriptor: descriptor ? JSON.stringify(descriptor) : null, enrolledBy: req.user.id },
    update: { photoData, descriptor: descriptor ? JSON.stringify(descriptor) : null, enrolledBy: req.user.id },
  });
  res.status(201).json({ success: true, data: { id: rec.id } });
}));

// All enrollments (descriptors for client-side matching)
router.get('/enrollments', wrap(async (req, res) => {
  const rows = await prisma.faceEnrollment.findMany({ where: { schoolId: req.schoolId }, select: { personType: true, personId: true, descriptor: true, photoData: true } });
  const sids = rows.filter(r => r.personType === 'student').map(r => r.personId);
  const students = sids.length ? await prisma.student.findMany({ where: { id: { in: sids } }, select: { id: true, name: true, rollNo: true, classId: true } }) : [];
  const smap = Object.fromEntries(students.map(s => [s.id, s]));
  res.json({ success: true, data: rows.map(r => ({ ...r, descriptor: r.descriptor ? JSON.parse(r.descriptor) : null, person: smap[r.personId] || null })) });
}));

// Recognize & mark — kiosk confirms person → mark attendance via biometric punch pipeline
router.post('/recognize-mark', wrap(async (req, res) => {
  const { personId, personType = 'student' } = req.body;
  if (!personId) return res.status(400).json({ success: false, message: 'personId required.' });
  const punch = await prisma.biometricPunch.create({
    data: { schoolId: req.schoolId, personType, personId: parseInt(personId), method: 'face', direction: 'in' }
  });
  let attendance = null;
  if (personType === 'student') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const student = await prisma.student.findUnique({ where: { id: parseInt(personId) } });
    if (student) {
      const existing = await prisma.attendance.findFirst({ where: { schoolId: req.schoolId, studentId: student.id, date: { gte: today } } });
      if (!existing) {
        attendance = await prisma.attendance.create({
          data: { schoolId: req.schoolId, campusId: student.campusId, studentId: student.id, classId: student.classId, date: new Date(), status: 'present', method: 'face' }
        }).catch(() => null);
      }
    }
  }
  res.json({ success: true, punch: punch.id, attendanceMarked: !!attendance });
}));

module.exports = router;
