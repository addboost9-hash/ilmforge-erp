const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const normalizeText = (v) => String(v || '').trim();

const validateRows = (rows, classes, fallbackClassId) => {
  const classNameMap = new Map(classes.map(c => [normalizeText(c.name).toLowerCase(), c]));
  const errors = [];
  const warnings = [];

  rows.forEach((r, idx) => {
    const rowNo = idx + 1;
    const name = normalizeText(r.name);
    const className = normalizeText(r.className);

    if (!name) errors.push({ row: rowNo, field: 'name', message: 'Name is required.' });

    if (className) {
      const cls = classNameMap.get(className.toLowerCase());
      if (!cls) {
        errors.push({ row: rowNo, field: 'className', message: `Class '${className}' not found.` });
      }
    } else if (!fallbackClassId) {
      warnings.push({ row: rowNo, field: 'className', message: 'Class not provided; student will be imported without class.' });
    }

    if (r.phone && !/^[0-9+\-\s]{7,20}$/.test(String(r.phone))) {
      warnings.push({ row: rowNo, field: 'phone', message: 'Phone format looks invalid.' });
    }

    if (r.dob && Number.isNaN(new Date(r.dob).getTime())) {
      errors.push({ row: rowNo, field: 'dob', message: 'Invalid date of birth.' });
    }
  });

  return { errors, warnings };
};

// POST /api/v1/bulk/students/validate
router.post('/students/validate', wrap(async (req, res) => {
  const { rows = [], classId } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ success: false, message: 'rows array required.' });

  const classes = await prisma.class.findMany({ where: { schoolId: req.schoolId }, include: { sections: true } });
  const { errors, warnings } = validateRows(rows, classes, classId);

  res.json({
    success: true,
    data: {
      totalRows: rows.length,
      validRows: Math.max(0, rows.length - errors.length),
      invalidRows: errors.length,
      errors,
      warnings,
    },
  });
}));

// POST /api/v1/bulk/students — rows: [{name, fatherName, gender, dob, className, section, phone}]
router.post('/students', wrap(async (req, res) => {
  const { rows, classId, createPortalAccounts = false } = req.body;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ success: false, message: 'rows array required.' });
  if (rows.length > 500) return res.status(400).json({ success: false, message: 'Max 500 rows per import.' });

  const classes = await prisma.class.findMany({ where: { schoolId: req.schoolId }, include: { sections: true } });
  const findClass = (nm) => classes.find(c => c.name.toLowerCase().trim() === String(nm || '').toLowerCase().trim());

  const { errors } = validateRows(rows, classes, classId);
  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed for one or more rows.',
      errors,
    });
  }

  let imported = 0, failed = [];
  const report = {
    importedRows: [],
    failedRows: [],
  };
  for (const [i, r] of rows.entries()) {
    try {
      if (!r.name) throw new Error('name missing');
      const cls = r.className ? findClass(r.className) : (classId ? classes.find(c => c.id === parseInt(classId)) : null);
      const count = await prisma.student.count({ where: { schoolId: req.schoolId } });
      const student = await prisma.student.create({
        data: {
          schoolId: req.schoolId, campusId: req.campusId || 1,
          name: r.name.trim(), fatherName: r.fatherName || null, gender: r.gender || null,
          dob: r.dob ? new Date(r.dob) : null,
          classId: cls?.id || null,
          rollNo: `BLK-${Date.now().toString(36)}-${count + 1}`,
          emergencyPhone: r.phone || null,
        }
      });
      imported++;
      report.importedRows.push({ row: i + 1, studentId: student.id, name: student.name, classId: student.classId });
    } catch (e) { failed.push({ row: i + 1, name: r.name, error: e.message }); }
  }
  report.failedRows = failed;

  await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'BULK_IMPORT_STUDENTS',
      resource: 'student',
    }
  }).catch(() => null);

  res.json({ success: true, imported, failed, report, createPortalAccounts });
}));

// GET /api/v1/bulk/students/template
router.get('/students/template', (req, res) => {
  const template = [
    ['name', 'fatherName', 'gender', 'dob', 'className', 'section', 'phone'],
    ['Ali Khan', 'Ahmed Khan', 'male', '2012-05-20', 'Class 5', 'A', '03001234567'],
  ];
  const csv = template.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student_bulk_template.csv"');
  res.send(csv);
});

module.exports = router;
