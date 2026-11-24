/**
 * IlmForge — import and export school records as Excel.
 *
 *   GET  /bulk/template   blank workbook to fill in (school's classes pre-filled)
 *   GET  /bulk/export     this school's classes, students and staff
 *   POST /bulk/validate   check an uploaded workbook; writes nothing
 *   POST /bulk/import     import one chunk of validated rows
 *
 * Mounted behind protect + ADMIN_ONLY in app.js. The work itself lives in
 * services/records.service.js.
 *
 * Replaces the earlier CSV-only student import, which ignored the section,
 * created no portal accounts, gave every student a "BLK-..." roll number,
 * and created duplicates when the same file was imported twice.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const records = require('../services/records.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const MAX_ROWS = 5000;      // per file
const MAX_CHUNK = 50;       // per import request

const sendWorkbook = async (res, wb, filename) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  await wb.xlsx.write(res);
  res.end();
};

const fileSlug = (s) => String(s || 'school').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// GET /api/v1/bulk/template
router.get('/template', wrap(async (req, res) => {
  const wb = await records.buildTemplate(req.schoolId);
  await sendWorkbook(res, wb, 'ilmforge-import-template.xlsx');
}));

// GET /api/v1/bulk/export
router.get('/export', wrap(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.schoolId }, select: { name: true } });
  const { wb, counts } = await records.buildExport(req.schoolId);

  // This file holds every student's and staff member's personal details, so
  // who downloaded it is recorded.
  await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId, userId: req.user.id,
      action: 'RECORDS_EXPORTED', resource: 'school',
      details: JSON.stringify(counts),
    },
  }).catch(() => null);

  const date = new Date().toISOString().slice(0, 10);
  await sendWorkbook(res, wb, `${fileSlug(school?.name)}-records-${date}.xlsx`);
}));

// POST /api/v1/bulk/validate   body: { file: <base64 .xlsx> }
router.post('/validate', wrap(async (req, res) => {
  const { file } = req.body || {};
  if (!file || typeof file !== 'string') {
    return res.status(400).json({ success: false, message: 'Choose an Excel file (.xlsx) to check.' });
  }

  let raw;
  try {
    raw = await records.parseWorkbook(file);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ success: false, message: e.message });
    throw e;
  }

  const total = raw.students.length + raw.staff.length + raw.classes.length;
  if (total === 0) {
    return res.status(400).json({
      success: false,
      message: 'No records found. Use the IlmForge template, or make sure the first row holds column headings such as "Student Name" and "Class".',
    });
  }
  if (total > MAX_ROWS) {
    return res.status(400).json({
      success: false,
      message: `This file has ${total} rows. Split it into files of ${MAX_ROWS} rows or fewer.`,
    });
  }

  const result = await records.validate(req.schoolId, raw);
  res.json({ success: true, data: result });
}));

// POST /api/v1/bulk/import   body: { classes?, students?, staff? }  (one chunk)
router.post('/import', wrap(async (req, res) => {
  const { classes = [], students = [], staff = [] } = req.body || {};
  const size = classes.length + students.length + staff.length;
  if (!size) return res.status(400).json({ success: false, message: 'Nothing to import in this request.' });
  if (students.length + staff.length > MAX_CHUNK) {
    return res.status(400).json({ success: false, message: `Send at most ${MAX_CHUNK} people per request.` });
  }

  const results = await records.importChunk(
    { schoolId: req.schoolId, campusId: req.campusId, actorUserId: req.user.id },
    { classes, students, staff },
  );
  res.json({ success: true, data: results });
}));

/* ── Student photos in bulk (services/studentPhotos.service.js) ───────── */
const photos = require('../services/studentPhotos.service');
const MAX_PHOTO_FILES = 5000;  // names checked at once
const MAX_PHOTO_BATCH = 25;    // photos saved per request (each ~40 KB)

// GET /api/v1/bulk/photo-list — every active student and the name to give
// their photo file (the roll number), with who has a photo already.
router.get('/photo-list', wrap(async (req, res) => {
  const { wb } = await photos.buildPhotoList(req.schoolId);
  await sendWorkbook(res, wb, `student-photo-list-${new Date().toISOString().slice(0, 10)}.xlsx`);
}));

// POST /api/v1/bulk/photos/match   body: { files: ['NUR-26-001.jpg', …] }
// Which student each file is for. Writes nothing.
router.post('/photos/match', wrap(async (req, res) => {
  const files = req.body?.files;
  if (!Array.isArray(files) || !files.length) return res.status(400).json({ success: false, message: 'Choose the photos first.' });
  if (files.length > MAX_PHOTO_FILES) return res.status(400).json({ success: false, message: `Choose at most ${MAX_PHOTO_FILES} photos at a time.` });
  res.json({ success: true, data: await photos.matchFiles(req.schoolId, files.map((f) => String(f || '').slice(0, 200))) });
}));

// POST /api/v1/bulk/photos   body: { photos: [{ file, photo }], replace }
router.post('/photos', wrap(async (req, res) => {
  const list = req.body?.photos;
  if (!Array.isArray(list) || !list.length) return res.status(400).json({ success: false, message: 'No photos sent.' });
  if (list.length > MAX_PHOTO_BATCH) return res.status(400).json({ success: false, message: `Send at most ${MAX_PHOTO_BATCH} photos per request.` });
  const data = await photos.savePhotos(req.schoolId, list, { replace: req.body?.replace === true, actorUserId: req.user.id });
  res.json({ success: true, data });
}));

module.exports = router;
