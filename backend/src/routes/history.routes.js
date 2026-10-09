/**
 * IlmForge — a school's old records (fees, salaries, expenses) from Excel.
 *
 *   GET    /history/template          workbook to fill in, with the school's
 *                                     students and staff listed for reference
 *   POST   /history/validate          check an uploaded workbook; writes nothing
 *   POST   /history/import            import one chunk of one sheet
 *   GET    /history/batches           earlier imports, with what is still in
 *   DELETE /history/batches/:batchId  undo one import
 *
 * Mounted behind protect + ADMIN_ONLY in app.js. The work itself lives in
 * services/history.service.js.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const history = require('../services/history.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const MAX_ROWS = 20000;   // per file: 300 students x 5 years of months fits
const MAX_CHUNK = 200;    // rows per import request

const fileSlug = (s) => String(s || 'school').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const fail = (res, e) => res.status(e.status).json({ success: false, message: e.message });

// GET /api/v1/history/template
router.get('/template', wrap(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.schoolId }, select: { name: true } });
  const wb = await history.buildHistoryTemplate(req.schoolId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileSlug(school?.name)}-past-records.xlsx"`);
  res.setHeader('Cache-Control', 'no-store');
  await wb.xlsx.write(res);
  res.end();
}));

// POST /api/v1/history/validate   body: { file: <base64 .xlsx> }
router.post('/validate', wrap(async (req, res) => {
  const { file } = req.body || {};
  if (!file || typeof file !== 'string') {
    return res.status(400).json({ success: false, message: 'Choose an Excel file (.xlsx) to check.' });
  }
  let parsed;
  try {
    parsed = await history.parseHistoryWorkbook(file);
  } catch (e) {
    if (e.status === 400) return fail(res, e);
    throw e;
  }
  const total = history.SHEET_KEYS.reduce((t, k) => t + parsed.rows[k].length, 0);
  if (total === 0) {
    return res.status(400).json({
      success: false,
      message: parsed.unreadable.length
        ? `The sheet${parsed.unreadable.length > 1 ? 's' : ''} ${parsed.unreadable.join(', ')} ${parsed.unreadable.length > 1 ? 'have' : 'has'} no recognised column headings. Use the Past Records template.`
        : 'No records found. Use the Past Records template: its sheets are Fee History, Previous Balance, Salary History and Expenses.',
    });
  }
  if (total > MAX_ROWS) {
    return res.status(400).json({ success: false, message: `This file has ${total} rows. Split it into files of ${MAX_ROWS} rows or fewer (for example one file per year).` });
  }
  const result = await history.validateHistory(req.schoolId, parsed.rows);
  res.json({ success: true, data: { ...result, batchId: history.newBatchId() } });
}));

// POST /api/v1/history/import   body: { batchId, sheet, rows }  (one chunk)
router.post('/import', wrap(async (req, res) => {
  const { batchId, sheet, rows } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ success: false, message: 'Nothing to import in this request.' });
  if (rows.length > MAX_CHUNK) return res.status(400).json({ success: false, message: `Send at most ${MAX_CHUNK} rows per request.` });
  try {
    const out = await history.importHistoryChunk(
      { schoolId: req.schoolId, campusId: req.campusId, actorUserId: req.user.id },
      { batchId, sheet, rows },
    );
    res.json({ success: true, data: out });
  } catch (e) {
    if (e.status === 400) return fail(res, e);
    throw e;
  }
}));

// GET /api/v1/history/batches
router.get('/batches', wrap(async (req, res) => {
  res.json({ success: true, data: await history.listBatches(req.schoolId) });
}));

// DELETE /api/v1/history/batches/:batchId   undo one import
router.delete('/batches/:batchId', wrap(async (req, res) => {
  try {
    const counts = await history.undoBatch({ schoolId: req.schoolId, actorUserId: req.user.id, batchId: req.params.batchId });
    const total = counts.bills + counts.salaries + counts.expenses;
    if (!total && !counts.payments) return res.status(404).json({ success: false, message: 'Nothing from this import is left to undo.' });
    res.json({ success: true, data: counts, message: 'Import undone.' });
  } catch (e) {
    if (e.status === 404 || e.status === 409) return fail(res, e);
    throw e;
  }
}));

module.exports = router;
