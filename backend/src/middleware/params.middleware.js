/**
 * Numeric path-param guard.
 *
 * Route handlers across the app do `parseInt(req.params.id)` and pass the
 * result straight into Prisma. For a non-numeric URL segment that's `NaN`,
 * which Prisma rejects with a validation error — so `GET /students/abc`
 * answered 500 (and, before the error-handler fix, echoed the server's
 * source path back to the caller) where it should simply be a 400.
 *
 * Rather than patching ~117 call sites, this registers an Express `param`
 * guard on a router so a bad id is rejected before any handler runs.
 *
 * Only names that are numeric in *every* route are listed. Deliberately
 * excluded: `date` (YYYY-MM-DD), `personType`, `role`, `module` — all of
 * which are legitimately non-numeric.
 */
const NUMERIC_PARAMS = [
  'id',
  'studentId',
  'staffId',
  'examId',
  'classId',
  'sectionId',
  'subjectId',
  'homeworkId',
  'entryId',
  'adjustmentId',
  'personId',
  'invoiceId',
  'quizId',
  'testId',
  'parentId',
  'teacherId',
  'productId',
  'balanceId',
  'conversationId',
];

// Postgres/SQLite 32-bit signed int ceiling — anything larger overflows the
// column and Prisma rejects it the same way a non-numeric value would.
const MAX_INT = 2147483647;

function hardenParams(router) {
  for (const name of NUMERIC_PARAMS) {
    router.param(name, (req, res, next, value) => {
      if (!/^\d+$/.test(value)) {
        return res.status(400).json({ success: false, message: `Invalid ${name}: must be a number.` });
      }
      if (Number(value) > MAX_INT) {
        return res.status(400).json({ success: false, message: `Invalid ${name}: out of range.` });
      }
      next();
    });
  }
  return router;
}

module.exports = { hardenParams, NUMERIC_PARAMS };
