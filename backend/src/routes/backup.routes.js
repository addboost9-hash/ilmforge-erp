const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const safeArray = (v) => (Array.isArray(v) ? v : []);

router.get('/', wrap(async (req, res) => {
  const data = await prisma.dbBackup.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' }, take: 20 });
  res.json({ success: true, data });
}));

// Full school data export as downloadable JSON
router.post('/create', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const [students, staff, classes, feeInvoices, attendance, exams] = await Promise.all([
    prisma.student.findMany({ where: { schoolId } }),
    prisma.staff.findMany({ where: { schoolId } }),
    prisma.class.findMany({ where: { schoolId } }),
    prisma.feeInvoice.findMany({ where: { schoolId }, take: 5000 }),
    prisma.attendance.findMany({ where: { schoolId }, take: 10000, orderBy: { date: 'desc' } }),
    prisma.exam.findMany({ where: { schoolId } }),
  ]);
  const payload = { exportedAt: new Date(), schoolId, students, staff, classes, feeInvoices, attendance, exams };
  const json = JSON.stringify(payload);
  const fileName = `backup-school${schoolId}-${Date.now()}.json`;
  await prisma.dbBackup.create({
    data: { schoolId, fileName, sizeBytes: Buffer.byteLength(json), recordCounts: JSON.stringify({ students: students.length, staff: staff.length, feeInvoices: feeInvoices.length, attendance: attendance.length }), createdBy: req.user.id }
  });
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(json);
}));

// POST /api/v1/backup/restore
// Accepts exported JSON payload and restores selected modules.
router.post('/restore', wrap(async (req, res) => {
  const { backup, modules = ['classes', 'students'], dryRun = true } = req.body;
  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ success: false, message: 'backup payload object is required.' });
  }

  if (backup.schoolId && backup.schoolId !== req.schoolId) {
    return res.status(400).json({ success: false, message: 'Backup schoolId does not match current tenant.' });
  }

  const classesPayload = safeArray(backup.classes);
  const studentsPayload = safeArray(backup.students);
  const result = {
    dryRun: Boolean(dryRun),
    modules,
    classes: { scanned: classesPayload.length, restored: 0, skipped: 0 },
    students: { scanned: studentsPayload.length, restored: 0, skipped: 0 },
  };

  if (dryRun) {
    return res.json({ success: true, message: 'Dry-run completed. No records were written.', data: result });
  }

  await prisma.$transaction(async (tx) => {
    if (modules.includes('classes')) {
      for (const cls of classesPayload) {
        if (!cls?.name) {
          result.classes.skipped++;
          continue;
        }

        const exists = await tx.class.findFirst({ where: { schoolId: req.schoolId, name: cls.name } });
        if (exists) {
          result.classes.skipped++;
          continue;
        }

        await tx.class.create({
          data: {
            schoolId: req.schoolId,
            name: cls.name,
            level: cls.level || null,
          },
        });
        result.classes.restored++;
      }
    }

    if (modules.includes('students')) {
      for (const st of studentsPayload) {
        if (!st?.name || !st?.rollNo) {
          result.students.skipped++;
          continue;
        }

        const exists = await tx.student.findFirst({ where: { schoolId: req.schoolId, rollNo: st.rollNo } });
        if (exists) {
          result.students.skipped++;
          continue;
        }

        await tx.student.create({
          data: {
            schoolId: req.schoolId,
            campusId: req.campusId || st.campusId || 1,
            name: st.name,
            fatherName: st.fatherName || null,
            gender: st.gender || null,
            dob: st.dob ? new Date(st.dob) : null,
            classId: st.classId || null,
            sectionId: st.sectionId || null,
            rollNo: st.rollNo,
            emergencyPhone: st.emergencyPhone || null,
            status: st.status || 'active',
          },
        });
        result.students.restored++;
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'DB_RESTORE',
      resource: 'backup',
    },
  }).catch(() => null);

  res.json({ success: true, message: 'Restore completed successfully.', data: result });
}));

module.exports = router;
