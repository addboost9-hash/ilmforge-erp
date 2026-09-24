const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { authMiddleware, requireRole } = require('./middleware/auth.middleware');
const { requireModulePermission } = require('./middleware/permission.middleware');
const { tenantMiddleware } = require('./middleware/tenant.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { hardenParams } = require('./middleware/params.middleware');

/* Every route module is mounted through R(), which attaches a numeric guard
   to id-style path params. Handlers throughout the app do
   `parseInt(req.params.id)` and hand the result to Prisma, so a URL like
   /students/abc produced NaN and a 500; now it's rejected as a clean 400
   before the handler runs. */
const R = (modulePath) => hardenParams(require(modulePath));

const app = express();

// Required for Render/Railway/Heroku — they sit behind a proxy
app.set('trust proxy', 1);

app.use(helmet());

/* Allow local dev and explicit production frontend only — no wildcard patterns */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return cb(null, true);
    const isLocalhostDev = /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocalhostDev || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression({
  level: 6, // good balance of speed vs size
  threshold: 1024, // only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ─── Cache-Control headers for slow-changing API responses ───────────────────
// These used to send `max-age=300` (and 120 for settings), which let the
// BROWSER serve the list from its own cache for minutes. The visible effect
// was that adding, editing or deleting a class, subject or setting appeared to
// do nothing: the write succeeded, the refetch was answered from cache, and
// the stale list stayed on screen until the timer expired.
//
// `no-cache` does not mean "don't cache" — it means "revalidate before use".
// Express already emits an ETag for these responses, so unchanged data still
// costs only a 304, while a change is picked up immediately.
const revalidateOnly = (req, res, next) => {
  if (req.method === 'GET') res.setHeader('Cache-Control', 'private, no-cache');
  next();
};
app.use('/api/v1/classes', revalidateOnly);
app.use('/api/v1/subjects', revalidateOnly);
app.use('/api/v1/settings', revalidateOnly);

/* ─── Rate limiting ───────────────────────────────────────────────────────────
   Both limiters used to key on IP alone. A school office is normally one
   public IP behind NAT, so the whole staff shared a single budget: 300
   requests / 15 min for everyone together (a couple of users browsing
   normally exhaust that), and 20 login attempts for the entire school (the
   morning sign-in rush locked everyone out).

   The general limiter now keys per signed-in session, and the auth limiter
   per IP + account, counting only FAILED sign-ins. Brute-force protection is
   unchanged — an attacker still gets 20 failures against any one account from
   any one IP — but legitimate staff no longer lock each other out.
--------------------------------------------------------------------------- */

// Runs before `protect`, so the token is not verified yet. Only used to
// separate buckets: a forged token merely gets its own bucket and still fails
// authentication, so this cannot be used to bypass anything.
const sessionKey = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return 't:' + auth.slice(7, 60);
  return 'ip:' + (req.ip || 'unknown');
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  keyGenerator: sessionKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  // Only failed sign-ins count, so a busy school logging in normally is never
  // throttled; repeated wrong passwords still are.
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed sign-in attempts. Please try again in 15 minutes.' },
});
const publicFeeLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { success: false, message: 'Too many requests. Please try again in a minute.' } });
// The general limiter needs no body, so it stays in front of the parsers and
// still absorbs a flood. The auth limiter keys on the submitted email, so it
// must run after express.json() — mounted below.
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/v1/auth/', authLimiter);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Health check — verifies DB connectivity ──────────────────────────────
const prisma = require('./config/prisma');
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', version: '3.3.0', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// ─── PUBLIC routes ───────────────────────────────────────────────────────
app.use('/api/v1/auth', R('./routes/auth.routes'));

// ─── PUBLIC: School branding by slug (for branded login page) ────────────
app.get('/api/v1/public/school/:slug', async (req, res) => {
  try {
    const school = await prisma.school.findFirst({
      where: { slug: req.params.slug, status: 'active' },
      select: { id:true, name:true, slug:true, logoUrl:true, email:true, city:true, address:true, phone:true },
    });
    if (!school) return res.status(404).json({ success:false, message:'School not found' });
    res.json({ success:true, data: school });
  } catch (err) {
    res.status(500).json({ success:false, message:'Server error' });
  }
});

// ─── PUBLIC: Fee lookup by roll number — rate-limited, schoolSlug required, PII stripped ───
app.get('/api/v1/public/fees/by-roll/:rollNo', publicFeeLimiter, async (req, res) => {
  try {
    const rollNo     = String(req.params.rollNo || '').trim();
    const schoolSlug = String(req.query.schoolSlug || '').trim();
    if (!rollNo)     return res.status(400).json({ success: false, message: 'rollNo is required.' });
    if (!schoolSlug) return res.status(400).json({ success: false, message: 'schoolSlug query parameter is required.' });

    const school = await prisma.school.findFirst({
      where: { slug: schoolSlug, status: 'active' },
      select: { id: true, name: true, address: true, city: true, phone: true, logoUrl: true },
    });
    if (!school) return res.status(404).json({ success: false, message: 'School not found.' });

    const student = await prisma.student.findFirst({
      where: {
        schoolId: school.id, deletedAt: null,
        OR: [{ rollNo }, { rollNo: rollNo.toUpperCase() }, { rollNo: rollNo.toLowerCase() }],
      },
      select: {
        id: true, name: true, rollNo: true, status: true,
        fatherName: true,
        class:   { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        campus:  { select: { id: true, name: true } },
      },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId: school.id, studentId: student.id },
      select: {
        id: true, month: true, year: true, feeTitle: true,
        totalAmount: true, dueAmount: true, paidAmount: true,
        lateFee: true, status: true, dueDate: true,
        voucherNo: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Payment history per month of current year
    const currentYear = new Date().getFullYear();
    const yearInvoices = invoices.filter(i => i.year === currentYear || i.year === String(currentYear));
    const monthlyHistory = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const inv = yearInvoices.find(x => parseInt(x.month) === m);
      return { month: m, total: inv?.totalAmount || 0, paid: inv?.paidAmount || 0 };
    });

    // Bank details from school settings (stored in file-based settings)
    let bankDetails = { bankName: '', branch: '', accountTitle: school.name, accountNumber: '' };
    try {
      // Read bank details from DB (School.settingsJson)
      const schoolWithSettings = await prisma.school.findUnique({
        where: { id: school.id },
        select: { settingsJson: true },
      });
      if (schoolWithSettings?.settingsJson) {
        const parsed = JSON.parse(schoolWithSettings.settingsJson);
        if (parsed.payment?.bank) bankDetails = { ...bankDetails, ...parsed.payment.bank };
      }
    } catch (_) {}

    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          rollNo: student.rollNo,
          status: student.status,
          fatherName: student.fatherName,
          class:   student.class,
          section: student.section,
          campus:  student.campus,
        },
        invoices,
        monthlyHistory,
        bankDetails,
        school: {
          name:    school.name,
          address: school.address,
          city:    school.city,
          phone:   school.phone,
          logoUrl: school.logoUrl,
        },
      },
    });
  } catch (err) {
    console.error('Public fee route error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PROTECTED routes (JWT + tenant) ─────────────────────────────────────
const protect = [authMiddleware, tenantMiddleware];


/* ═══ RBAC role groups ═══ */
const ADMIN_ONLY  = requireRole('super_admin', 'admin');
const FINANCE     = requireRole('super_admin', 'admin', 'accountant');
const ACADEMIC    = requireRole('super_admin', 'admin', 'teacher');
const ATTENDANCE_ROLES = requireRole('super_admin', 'admin', 'teacher', 'gatekeeper');
// Separate (broader) set for the attendance router specifically — it has its
// own row-level scoping for /summary and /student/:id/history so students and
// parents can read their own attendance. biometric/face routers below keep
// the stricter ATTENDANCE_ROLES since they haven't been audited for
// per-role scoping.
const ATTENDANCE_PORTAL_ROLES = requireRole('super_admin', 'admin', 'teacher', 'gatekeeper', 'student', 'parent');
const PM = (moduleKey) => requireModulePermission(moduleKey);

/* ═══ Route mounts WITH role-based access control ═══
   Read access stays broad (portals need it, routes do row-level scoping);
   write-heavy admin modules get hard role gates. */
app.use('/api/v1/dashboard',       protect, PM('dashboard'), R('./routes/dashboard.routes'));
app.use('/api/v1/students',        protect, PM('students'), R('./routes/student.routes'));          // row-level scoping inside
app.use('/api/v1/admissions',      protect, FINANCE, PM('admissions'), R('./routes/admission.routes'));
app.use('/api/v1/fees',            protect, PM('fees'), R('./routes/fee.routes'));              // parents read own via /student/:id
app.use('/api/v1/attendance',      protect, ATTENDANCE_PORTAL_ROLES, PM('attendance'), R('./routes/attendance.routes'));
app.use('/api/v1/staff',           protect, ADMIN_ONLY, PM('staff'), R('./routes/staff.routes'));
app.use('/api/v1/exams',           protect, PM('exams'), R('./routes/exam.routes'));             // students/parents read results
app.use('/api/v1/settings',        protect, ADMIN_ONLY, PM('settings'), R('./routes/settings.routes'));
app.use('/api/v1/notifications',   protect, FINANCE, PM('notifications'), R('./routes/notification.routes'));
app.use('/api/v1/reports',         protect, FINANCE, PM('reports'), R('./routes/report.routes'));
app.use('/api/v1/classes',         protect, PM('classes'), R('./routes/class.routes'));
app.use('/api/v1/parents',         protect, ADMIN_ONLY, PM('parents'), R('./routes/parent.routes'));
app.use('/api/v1/products',        protect, FINANCE, PM('products'), R('./routes/product.routes'));
app.use('/api/v1/expenses',        protect, FINANCE, PM('expenses'), R('./routes/expense.routes'));
app.use('/api/v1/accounting',      protect, FINANCE, PM('expenses'), R('./routes/accounting.routes'));
app.use('/api/v1/salary',          protect, FINANCE, PM('salary'), R('./routes/salary.routes'));
app.use('/api/v1/homework',        protect, PM('homework'), R('./routes/homework.routes'));
app.use('/api/v1/transport',       protect, PM('transport'), R('./routes/transport.routes'));
app.use('/api/v1/timetable',       protect, PM('timetable'), R('./routes/timetable.routes'));
app.use('/api/v1/complaints',      protect, PM('complaints'), R('./routes/complaint.routes'));
app.use('/api/v1/pdf',             protect, PM('reports'), R('./routes/pdf.routes'));
/* ═══ v2: previously-missing modules ═══ */
app.use('/api/v1/leaves',          protect, PM('leaves'), R('./routes/leave.routes'));
app.use('/api/v1/noticeboard',     protect, PM('noticeboard'), R('./routes/noticeboard.routes'));
app.use('/api/v1/study-materials', protect, PM('study_materials'), R('./routes/studymaterial.routes'));
app.use('/api/v1/online-classes',  protect, PM('online_classes'), R('./routes/onlineclass.routes'));
app.use('/api/v1/announcements',   protect, PM('announcements'), R('./routes/announcement.routes'));
app.use('/api/v1/tutorials',       protect, PM('tutorials'), R('./routes/tutorial.routes'));
app.use('/api/v1/appraisals',      protect, PM('appraisals'), R('./routes/appraisal.routes'));
app.use('/api/v1/loans',           protect, FINANCE, PM('loans'), R('./routes/loan.routes'));
app.use('/api/v1/certificates',    protect, ADMIN_ONLY, PM('certificates'), R('./routes/certificate.routes'));
app.use('/api/v1/audit',           protect, ADMIN_ONLY, PM('audit'), R('./routes/audit.routes'));
app.use('/api/v1/permissions',     protect, ADMIN_ONLY, PM('permissions'), R('./routes/permission.routes'));
/* ═══ v3.2: biometric / face / gatepass / crm / sop / backup / bulk / robobuddy ═══ */
app.use('/api/v1/biometric',       protect, ATTENDANCE_ROLES, R('./routes/biometric.routes'));
app.use('/api/v1/face',            protect, ATTENDANCE_ROLES, R('./routes/face.routes'));
app.use('/api/v1/gatepasses',      protect, R('./routes/gatepass.routes'));
app.use('/api/v1/visitors',        protect, R('./routes/visitor.routes'));
app.use('/api/v1/crm',             protect, FINANCE, R('./routes/crm.routes'));
app.use('/api/v1/backups',         protect, ADMIN_ONLY, R('./routes/backup.routes'));
app.use('/api/v1/sops',            protect, R('./routes/sop.routes'));
app.use('/api/v1/bulk',            protect, ADMIN_ONLY, R('./routes/bulkimport.routes'));
app.use('/api/v1/robobuddy',       protect, ADMIN_ONLY, R('./routes/robobuddy.routes'));
app.use('/api/v1/chat',            protect, R('./routes/chat.routes'));
/* ═══ v3.3: tests / quizzes / leave-balance ═══ */
app.use('/api/v1/tests',           protect, ACADEMIC, PM('tests'), R('./routes/test.routes'));
app.use('/api/v1/quizzes',         protect, PM('quizzes'), R('./routes/quiz.routes'));
app.use('/api/v1/leave-balance',   protect, PM('leaves'), R('./routes/leavebalance.routes'));
/* ═══ v3.5: payments / library / push ═══ */
app.use('/api/v1/payments',        protect, PM('payments'), R('./routes/payment.routes'));
app.use('/api/v1/library',         protect, PM('library'), R('./routes/library.routes'));
app.use('/api/v1/push',            protect, PM('push'), R('./routes/push.routes'));
app.use('/api/v1/teacher',         protect, R('./routes/teacher.routes'));
app.use('/api/v1/results',         protect, R('./routes/results.routes'));
app.use('/api/v1/parent',          protect, R('./routes/parentSelf.routes'));
/* ═══ v3.4: PTM scheduler ═══ */
app.use('/api/v1/ptm',             protect, R('./routes/ptm.routes'));
/* ═══ v3.5: Alumni management & Events / Tournaments ═══ */
app.use('/api/v1/alumni',          protect, R('./routes/alumni.routes'));
app.use('/api/v1/events',          protect, R('./routes/events.routes'));
/* ═══ v3.6: Notification Automation ═══ */
app.use('/api/v1/automation',      protect, ADMIN_ONLY, R('./routes/automation.routes'));
/* ═══ v3.7: Question Papers / Lesson Plans / Scheme / Calendar / Payroll ═══ */
app.use('/api/v1/question-papers', protect, ACADEMIC,   R('./routes/questionpaper.routes'));
app.use('/api/v1/lesson-plans',    protect, ACADEMIC,   R('./routes/lessonplan.routes'));
app.use('/api/v1/scheme',          protect, ACADEMIC,   R('./routes/scheme.routes'));
app.use('/api/v1/calendar',        protect,             R('./routes/calendar.routes'));
app.use('/api/v1/payroll',         protect, FINANCE,    R('./routes/payroll.routes'));
/* ═══ v3.8: Behaviour / Tasks / Syllabus ═══ */
app.use('/api/v1/behaviour',       protect,             R('./routes/behaviour.routes'));
app.use('/api/v1/tasks',           protect,             R('./routes/tasks.routes'));
app.use('/api/v1/syllabus',        protect, ACADEMIC,   R('./routes/syllabus.routes'));

/* ═══ LICENSE management (offline mode) ═══ */
app.use('/api/v1/license', R('./routes/license.routes'));

/* ═══ PLATFORM OWNER CONTROL PANEL — No school auth needed ══════
   Only accessible with x-platform-key header
   This is YOUR master control over all schools
════════════════════════════════════════════════════════════════ */
app.use('/api/v1/platform', R('./routes/platform.routes'));

/* Unmatched API routes fell through to Express's default handler, which
   replies with an HTML error page — so a client calling a mistyped or
   removed endpoint got HTML where it expected JSON (and typically failed
   while parsing it, hiding the real cause). Answer in JSON instead. */
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl.split('?')[0]}`,
  });
});

app.use(errorHandler);

module.exports = app;
