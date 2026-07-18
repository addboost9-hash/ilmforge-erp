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

// ─── Cache-Control headers for static-ish API responses ──────────────────────
app.use('/api/v1/classes', (req, res, next) => {
  if (req.method === 'GET') res.setHeader('Cache-Control', 'private, max-age=300');
  next();
});
app.use('/api/v1/subjects', (req, res, next) => {
  if (req.method === 'GET') res.setHeader('Cache-Control', 'private, max-age=300');
  next();
});
app.use('/api/v1/settings', (req, res, next) => {
  if (req.method === 'GET') res.setHeader('Cache-Control', 'private, max-age=120');
  next();
});

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many auth attempts.' } });
const publicFeeLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { success: false, message: 'Too many requests. Please try again in a minute.' } });
app.use('/api/', limiter);
app.use('/api/v1/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
app.use('/api/v1/auth', require('./routes/auth.routes'));

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
        voucherNo: true, paidAt: true,
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
const PM = (moduleKey) => requireModulePermission(moduleKey);

/* ═══ Route mounts WITH role-based access control ═══
   Read access stays broad (portals need it, routes do row-level scoping);
   write-heavy admin modules get hard role gates. */
app.use('/api/v1/dashboard',       protect, PM('dashboard'), require('./routes/dashboard.routes'));
app.use('/api/v1/students',        protect, PM('students'), require('./routes/student.routes'));          // row-level scoping inside
app.use('/api/v1/admissions',      protect, FINANCE, PM('admissions'), require('./routes/admission.routes'));
app.use('/api/v1/fees',            protect, PM('fees'), require('./routes/fee.routes'));              // parents read own via /student/:id
app.use('/api/v1/attendance',      protect, ATTENDANCE_ROLES, PM('attendance'), require('./routes/attendance.routes'));
app.use('/api/v1/staff',           protect, ADMIN_ONLY, PM('staff'), require('./routes/staff.routes'));
app.use('/api/v1/exams',           protect, PM('exams'), require('./routes/exam.routes'));             // students/parents read results
app.use('/api/v1/settings',        protect, ADMIN_ONLY, PM('settings'), require('./routes/settings.routes'));
app.use('/api/v1/notifications',   protect, FINANCE, PM('notifications'), require('./routes/notification.routes'));
app.use('/api/v1/reports',         protect, FINANCE, PM('reports'), require('./routes/report.routes'));
app.use('/api/v1/classes',         protect, PM('classes'), require('./routes/class.routes'));
app.use('/api/v1/parents',         protect, ADMIN_ONLY, PM('parents'), require('./routes/parent.routes'));
app.use('/api/v1/products',        protect, FINANCE, PM('products'), require('./routes/product.routes'));
app.use('/api/v1/expenses',        protect, FINANCE, PM('expenses'), require('./routes/expense.routes'));
app.use('/api/v1/salary',          protect, FINANCE, PM('salary'), require('./routes/salary.routes'));
app.use('/api/v1/homework',        protect, PM('homework'), require('./routes/homework.routes'));
app.use('/api/v1/transport',       protect, PM('transport'), require('./routes/transport.routes'));
app.use('/api/v1/timetable',       protect, PM('timetable'), require('./routes/timetable.routes'));
app.use('/api/v1/complaints',      protect, PM('complaints'), require('./routes/complaint.routes'));
app.use('/api/v1/pdf',             protect, PM('reports'), require('./routes/pdf.routes'));
/* ═══ v2: previously-missing modules ═══ */
app.use('/api/v1/leaves',          protect, PM('leaves'), require('./routes/leave.routes'));
app.use('/api/v1/noticeboard',     protect, PM('noticeboard'), require('./routes/noticeboard.routes'));
app.use('/api/v1/study-materials', protect, PM('study_materials'), require('./routes/studymaterial.routes'));
app.use('/api/v1/online-classes',  protect, PM('online_classes'), require('./routes/onlineclass.routes'));
app.use('/api/v1/announcements',   protect, PM('announcements'), require('./routes/announcement.routes'));
app.use('/api/v1/tutorials',       protect, PM('tutorials'), require('./routes/tutorial.routes'));
app.use('/api/v1/appraisals',      protect, PM('appraisals'), require('./routes/appraisal.routes'));
app.use('/api/v1/loans',           protect, FINANCE, PM('loans'), require('./routes/loan.routes'));
app.use('/api/v1/certificates',    protect, ADMIN_ONLY, PM('certificates'), require('./routes/certificate.routes'));
app.use('/api/v1/audit',           protect, ADMIN_ONLY, PM('audit'), require('./routes/audit.routes'));
app.use('/api/v1/permissions',     protect, ADMIN_ONLY, PM('permissions'), require('./routes/permission.routes'));
/* ═══ v3.2: biometric / face / gatepass / crm / sop / backup / bulk / robobuddy ═══ */
app.use('/api/v1/biometric',       protect, ATTENDANCE_ROLES, require('./routes/biometric.routes'));
app.use('/api/v1/face',            protect, ATTENDANCE_ROLES, require('./routes/face.routes'));
app.use('/api/v1/gatepasses',      protect, require('./routes/gatepass.routes'));
app.use('/api/v1/crm',             protect, FINANCE, require('./routes/crm.routes'));
app.use('/api/v1/backups',         protect, ADMIN_ONLY, require('./routes/backup.routes'));
app.use('/api/v1/sops',            protect, require('./routes/sop.routes'));
app.use('/api/v1/bulk',            protect, ADMIN_ONLY, require('./routes/bulkimport.routes'));
app.use('/api/v1/robobuddy',       protect, ADMIN_ONLY, require('./routes/robobuddy.routes'));
app.use('/api/v1/chat',            protect, require('./routes/chat.routes'));
/* ═══ v3.3: tests / quizzes / leave-balance ═══ */
app.use('/api/v1/tests',           protect, ACADEMIC, PM('tests'), require('./routes/test.routes'));
app.use('/api/v1/quizzes',         protect, PM('quizzes'), require('./routes/quiz.routes'));
app.use('/api/v1/leave-balance',   protect, PM('leaves'), require('./routes/leavebalance.routes'));
/* ═══ v3.5: payments / library / push ═══ */
app.use('/api/v1/payments',        protect, PM('payments'), require('./routes/payment.routes'));
app.use('/api/v1/library',         protect, PM('library'), require('./routes/library.routes'));
app.use('/api/v1/push',            protect, PM('push'), require('./routes/push.routes'));
/* ═══ v3.4: PTM scheduler ═══ */
app.use('/api/v1/ptm',             protect, require('./routes/ptm.routes'));
/* ═══ v3.5: Alumni management & Events / Tournaments ═══ */
app.use('/api/v1/alumni',          protect, require('./routes/alumni.routes'));
app.use('/api/v1/events',          protect, require('./routes/events.routes'));
/* ═══ v3.6: Notification Automation ═══ */
app.use('/api/v1/automation',      protect, ADMIN_ONLY, require('./routes/automation.routes'));
/* ═══ v3.7: Question Papers / Lesson Plans / Scheme / Calendar / Payroll ═══ */
app.use('/api/v1/question-papers', protect, ACADEMIC,   require('./routes/questionpaper.routes'));
app.use('/api/v1/lesson-plans',    protect, ACADEMIC,   require('./routes/lessonplan.routes'));
app.use('/api/v1/scheme',          protect, ACADEMIC,   require('./routes/scheme.routes'));
app.use('/api/v1/calendar',        protect,             require('./routes/calendar.routes'));
app.use('/api/v1/payroll',         protect, FINANCE,    require('./routes/payroll.routes'));
/* ═══ v3.8: Behaviour / Tasks / Syllabus ═══ */
app.use('/api/v1/behaviour',       protect,             require('./routes/behaviour.routes'));
app.use('/api/v1/tasks',           protect,             require('./routes/tasks.routes'));
app.use('/api/v1/syllabus',        protect, ACADEMIC,   require('./routes/syllabus.routes'));

/* ═══ LICENSE management (offline mode) ═══ */
app.use('/api/v1/license', require('./routes/license.routes'));

/* ═══ PLATFORM OWNER CONTROL PANEL — No school auth needed ══════
   Only accessible with x-platform-key header
   This is YOUR master control over all schools
════════════════════════════════════════════════════════════════ */
app.use('/api/v1/platform', require('./routes/platform.routes'));

app.use(errorHandler);

module.exports = app;
