const express = require('express');
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

app.use(helmet());

/* Allow both local dev and production Vercel frontend */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return cb(null, true);
    }
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many auth attempts.' } });
app.use('/api/', limiter);
app.use('/api/v1/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }));

// ─── PUBLIC routes ───────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/auth.routes'));

// ─── PUBLIC: School branding by slug (for branded login page) ────────────
const prisma = require('./config/prisma');
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

// ─── PROTECTED routes (JWT + tenant) ─────────────────────────────────────
const protect = [authMiddleware, tenantMiddleware];


/* ═══ RBAC role groups ═══ */
const ADMIN_ONLY  = requireRole('super_admin', 'admin');
const FINANCE     = requireRole('super_admin', 'admin', 'accountant');
const ACADEMIC    = requireRole('super_admin', 'admin', 'teacher');
// Students/parents need read access to their OWN attendance (portal home
// screens, reports) — row-level scoping is enforced inside the route
// handlers, same pattern as students/fees below.
const ATTENDANCE_ROLES = requireRole('super_admin', 'admin', 'teacher', 'gatekeeper', 'student', 'parent');
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
app.use('/api/v1/holidays',        protect, PM('holidays'), require('./routes/holiday.routes'));
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

app.use(errorHandler);

module.exports = app;
