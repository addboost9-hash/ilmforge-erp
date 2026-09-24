/**
 * Central error handler.
 *
 * FIX: this used to return `err.message` verbatim to the client for every
 * error, gated on nothing. Prisma builds its messages by embedding the
 * absolute source path and a snippet of the offending file, so any request
 * that tripped a Prisma error (e.g. GET /students/abc → parseInt → NaN)
 * replied with something like:
 *
 *   Invalid `prisma.student.findFirst()` invocation in
 *   C:\Users\...\backend\src\routes\student.routes.js:842:40
 *     840 router.get('/:id', wrap(async (req, res) => {
 *
 * — leaking the server's filesystem layout and source code to any caller.
 * Deliberate, developer-written messages (anything thrown with a `status`)
 * are still passed through, since those are written to be read by users;
 * everything else is logged server-side and reported generically.
 */

// Prisma error codes that map cleanly onto a user-facing meaning.
const PRISMA_MESSAGES = {
  P2002: { status: 409, message: 'Record already exists (duplicate entry).' },
  P2025: { status: 404, message: 'Record not found.' },
  P2003: { status: 400, message: 'This record is still referenced by other data and cannot be changed or removed.' },
  P2014: { status: 400, message: 'This change would break a required relationship between records.' },
  P2021: { status: 503, message: 'That feature is not available yet on this installation.' },
};

const isPrismaError = (err) =>
  typeof err?.code === 'string' && /^P\d{4}$/.test(err.code) ||
  err?.name === 'PrismaClientValidationError' ||
  err?.name === 'PrismaClientKnownRequestError' ||
  err?.name === 'PrismaClientUnknownRequestError' ||
  err?.name === 'PrismaClientInitializationError';

const errorHandler = (err, req, res, next) => {
  // Always log the real error server-side — the detail stays in the logs.
  console.error(`Error: ${req.method} ${req.originalUrl} —`, err.message);

  const mapped = PRISMA_MESSAGES[err.code];
  if (mapped) {
    return res.status(mapped.status).json({ success: false, message: mapped.message });
  }

  const status = err.status || err.statusCode || 500;

  // A status set by our own code means the message was written for a user.
  // Anything else is an internal failure and must not echo raw detail.
  const isDeliberate = Boolean(err.status || err.statusCode) && status < 500;
  const safeMessage = isDeliberate && !isPrismaError(err)
    ? (err.message || 'Request failed.')
    : status >= 500
      ? 'Something went wrong on our end. Please try again, or contact support if it keeps happening.'
      : 'Request could not be processed.';

  res.status(status).json({
    success: false,
    message: safeMessage,
    ...(err.code && !isPrismaError(err) && { code: err.code }),
    ...(typeof err.userId !== 'undefined' && { userId: err.userId }),
    ...(err.data && { data: err.data }),
    // Full detail only in development, never in production.
    ...(process.env.NODE_ENV === 'development' && { debug: err.message, stack: err.stack }),
  });
};

module.exports = { errorHandler };
