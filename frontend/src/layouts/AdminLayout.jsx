/**
 * IlmForge — Dark Navy Sidebar Layout
 * Matches reference screenshot: #1B2F6E sidebar, white header, #ecf0f5 content
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import useLanguageStore from '../store/language.store';
import { LANGUAGES, t as i18nT } from '../i18n/translations';
import api from '../api/client';
import {
  LayoutDashboard, Users, GraduationCap,
  DollarSign, UserCheck,
  Bell, MessageSquare, Settings, LogOut,
  Menu, ChevronRight, Search,
  AlertCircle, Award, Briefcase,
  BookOpen, CheckSquare,
  Wallet, BookOpenCheck,
  Package, Receipt, Landmark,
  Bot, X, Calendar, QrCode, FileText,
  ShieldCheck, BarChart2, Database, ClipboardList,
  Workflow, ShoppingCart, Globe, BookMarked,
  CalendarDays, Brain,
} from 'lucide-react';
import LicenseBanner from '../components/license/LicenseBanner';

/* ═══════════════════════════════════════════════════
   NAVIGATION TREE
═══════════════════════════════════════════════════ */
const NAV = [
  {
    group: 'MAIN NAVIGATION',
    items: [
      { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/workflow',           icon: Workflow,        label: '🔄 Smart Workflow Hub', badge: 'NEW' },
      { to: '/mentor-ai',          icon: Bot,             label: 'Mentor AI Tools' },
      { to: '/robobuddy',          icon: Bot,             label: 'RoboBuddy AI',         roles: ['super_admin', 'admin'] },
      { to: '/analytics/students',  icon: BarChart2,      label: 'Student Analytics',     roles: ['super_admin', 'admin'] },
      { to: '/reports-hub',         icon: BarChart2,      label: '📊 Reports Hub (110+)',  roles: ['super_admin', 'admin'], badge: 'NEW' },
      { to: '/academic-calendar',   icon: Calendar,       label: '📅 Academic Calendar',   roles: ['super_admin', 'admin'], badge: 'NEW' },
    ],
  },
  {
    group: 'STUDENTS & STAFF',
    items: [
      { to: '/hub/students',          icon: GraduationCap, label: 'Students Hub' },
      { to: '/students/bulk-import',  icon: FileText,      label: 'Bulk Import',          roles: ['super_admin', 'admin'] },
      { to: '/students/info-reports', icon: BarChart2,     label: 'Student Info Reports', roles: ['super_admin', 'admin'] },
      { to: '/hub/staff',             icon: Briefcase,     label: 'Staff & Teachers Hub' },
      { to: '/staff/appraisals-new',  icon: Award,         label: 'Appraisals',           roles: ['super_admin', 'admin'] },
      { to: '/payroll',               icon: Wallet,        label: 'Payroll',              roles: ['super_admin', 'admin', 'accountant'] },
      { to: '/hub/parents',           icon: Users,         label: 'Parents & Portals Hub' },
      { to: '/gate-passes',           icon: QrCode,        label: 'Gate Passes',          roles: ['super_admin', 'admin', 'gatekeeper'] },
    ],
  },
  {
    group: 'ACADEMICS',
    items: [
      { to: '/hub/academics',           icon: BookOpen,     label: 'Academics Hub' },
      { to: '/attendance-hub',           icon: CheckSquare,  label: '📋 Attendance (SM Style)', badge: 'NEW' },
      { to: '/hub/attendance',          icon: CheckSquare,  label: 'Attendance Hub' },
      { to: '/academics/lesson-plans',  icon: ClipboardList, label: 'Lesson Plans',        roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/academics/scheme',        icon: BookOpen,      label: 'Scheme of Studies',   roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/academics/calendar',      icon: CalendarDays,  label: 'Academic Calendar',   roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/academics/syllabus',      icon: BookOpenCheck, label: 'Syllabus',             roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/academics/worksheets',    icon: Brain,         label: 'Worksheets AI',        roles: ['super_admin', 'admin', 'teacher'] },
    ],
  },
  {
    group: 'EXAMS',
    items: [
      { to: '/hub/exams',              icon: Award,         label: 'Exams & Tests Hub' },
      { to: '/exams/question-papers',  icon: FileText,      label: 'Question Papers',     roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/mcq-generator',    icon: Brain,         label: 'MCQ Generator',        roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/timetable',        icon: Calendar,      label: 'Exam Timetable',      roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/merit-list',       icon: Award,         label: 'Merit List',          roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/gazette',          icon: FileText,      label: 'Gazette Sheet',       roles: ['super_admin', 'admin'] },
      { to: '/exams/annual-report',    icon: ClipboardList, label: 'Annual Report Cards', roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/bise-result-card', icon: FileText,      label: 'BISE Result Card',    roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/result-config',    icon: Settings,      label: 'Result Settings',      roles: ['super_admin', 'admin'] },
    ],
  },
  {
    group: 'FINANCE',
    items: [
      { to: '/fee-management',        icon: DollarSign,   label: '💳 Fee Module (SM Style)', badge: 'NEW' },
      { to: '/hub/fees',              icon: Wallet,       label: 'Fees & Accounts Hub' },
      { to: '/fees/invoices',         icon: FileText,     label: 'Fee Invoices',        roles: ['super_admin', 'admin', 'accountant'] },
      { to: '/fees/parent-wallet',    icon: Wallet,       label: 'Parent Wallet',        roles: ['super_admin', 'admin', 'accountant'] },
      { to: '/hub/payroll',           icon: Landmark,     label: 'Salary & Expenses Hub' },
      { to: '/payments/transactions', icon: Receipt,      label: 'Payment Transactions', roles: ['super_admin', 'admin', 'accountant'] },
      { to: '/library',               icon: BookOpenCheck, label: 'Library Management',  roles: ['super_admin', 'admin', 'accountant', 'teacher'] },
      { to: '/admissions/crm',        icon: Users,        label: 'Admissions CRM',       roles: ['super_admin', 'admin', 'accountant'] },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      { to: '/hub/communication', icon: MessageSquare, label: 'Communication Hub' },
      { to: '/hub/operations',    icon: Package,       label: 'Operations Hub' },
      { to: '/push',                icon: Bell,          label: 'Push Notifications',   roles: ['super_admin', 'admin', 'accountant'] },
      { to: '/sops',                        icon: ShieldCheck,   label: 'Standard Procedures',    roles: ['super_admin', 'admin'] },
      { to: '/homework/diary',              icon: BookMarked,    label: 'Homework Diary',          roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/stock/pos',                   icon: ShoppingCart,  label: 'Point of Sale (POS)',     roles: ['super_admin', 'admin', 'accountant'] },
      { to: '/settings/channels',           icon: Settings,      label: '📡 Channel Settings',     roles: ['super_admin', 'admin'], badge: 'SMS·WA·Email' },
      { to: '/hub/settings',                icon: Settings,      label: 'Settings Hub' },
      { to: '/settings/backup',             icon: Database,      label: 'Backup & Restore',        roles: ['super_admin', 'admin'] },
      { to: '/settings/website-management', icon: Globe,         label: 'Website Management',      roles: ['super_admin', 'admin'] },
    ],
  },
];

const canAccessItem = (item, role) => {
  if (!Array.isArray(item.roles) || item.roles.length === 0) return true;
  return item.roles.includes(role);
};

/* ═══════════════════════════════════════════════════
   LANGUAGE TOGGLE COMPONENT
═══════════════════════════════════════════════════ */
function LanguageToggle() {
  const { lang, setLang } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Change Language / زبان تبدیل کریں"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 6,
          border: '1px solid #dee2e6', background: open ? '#e8f4fd' : '#fff',
          cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
          color: '#374151', transition: 'all .12s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='#0073b7'; e.currentTarget.style.background='#e8f4fd'; }}
        onMouseLeave={e => { if(!open){ e.currentTarget.style.borderColor='#dee2e6'; e.currentTarget.style.background='#fff'; }}}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        <span>{current.nativeLabel}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>▼</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div style={{
            position: 'absolute', top: '110%', right: 0, zIndex: 1000,
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', borderBottom: '1px solid #f1f5f9' }}>
              Language / زبان
            </div>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px', border: 'none',
                  background: lang === l.code ? '#eff6ff' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'background .12s',
                  borderLeft: lang === l.code ? '3px solid #0073b7' : '3px solid transparent',
                }}
                onMouseEnter={e => { if(lang !== l.code) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if(lang !== l.code) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 20 }}>{l.flag}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: lang === l.code ? 700 : 600, color: lang === l.code ? '#0073b7' : '#374151' }}>
                    {l.nativeLabel}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{l.label}</div>
                </div>
                {lang === l.code && <span style={{ marginLeft: 'auto', color: '#0073b7', fontSize: 14 }}>✓</span>}
              </button>
            ))}
            <div style={{ padding: '8px 12px', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
              RTL automatically enabled for اردو
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   NAV ITEM COMPONENT
═══════════════════════════════════════════════════ */
function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const Icon = item.icon;

  const isActive =
    location.pathname === item.to ||
    (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));

  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      onClick={onNavigate}
      className={({ isActive: ia }) => `sb-item${ia ? ' active' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <div className="sb-icon">
        <Icon size={15} />
      </div>
      {!collapsed && (
        <>
          <span style={{
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.label}
          </span>
          {item.badge && (
            <span style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: '.4px',
              background: '#f59e0b', color: '#fff',
              padding: '2px 6px', borderRadius: 99,
              flexShrink: 0, textTransform: 'uppercase',
            }}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN LAYOUT
═══════════════════════════════════════════════════ */
export default function AdminLayout() {
  const { user, school, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  /* Sidebar state — load user preference from localStorage */
  const [isPinnedOpen, setIsPinnedOpen] = useState(() => {
    const saved = localStorage.getItem('sb_pinned');
    return saved === null ? true : saved === 'true'; // default: expanded
  });
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  /* Auto-collapse refs */
  const inactivityTimerRef = useRef(null);
  const sidebarRef         = useRef(null);
  const isMouseInSidebar   = useRef(false);

  /* Save pin preference */
  const togglePin = useCallback(() => {
    setIsPinnedOpen(v => {
      const next = !v;
      localStorage.setItem('sb_pinned', String(next));
      return next;
    });
  }, []);

  /* 5-second inactivity auto-collapse — only when pinned open */
  const resetInactivityTimer = useCallback(() => {
    if (!isDesktop) return;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      // Auto-collapse only if mouse is NOT inside sidebar
      if (!isMouseInSidebar.current) {
        setIsPinnedOpen(prev => {
          if (prev) {
            localStorage.setItem('sb_pinned', 'false');
            return false;
          }
          return prev;
        });
      }
    }, 5000);
  }, [isDesktop]);

  /* Track global mouse movement for inactivity */
  useEffect(() => {
    if (!isDesktop) return;
    const onMove = () => resetInactivityTimer();
    document.addEventListener('mousemove', onMove, { passive: true });
    resetInactivityTimer(); // start timer on mount
    return () => {
      document.removeEventListener('mousemove', onMove);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isDesktop, resetInactivityTimer]);

  /* Search state */
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState({ students: [], staff: [] });
  const [showResults,   setShowResults]   = useState(false);
  const [searching,     setSearching]     = useState(false);
  const searchContainerRef = useRef(null);
  const searchDebounceRef  = useRef(null);

  /* Nav scroll arrows */
  const [canScrollUp,   setCanScrollUp]   = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const navRef = useRef(null);

  /* ── Computed sidebar dimensions ── */
  const SIDEBAR_WIDTH     = 260;
  const SIDEBAR_COLLAPSED = 68;
  const collapsed = isDesktop && !isPinnedOpen && !isHoverExpanded;
  const SW = isDesktop ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH) : SIDEBAR_WIDTH;

  const role = user?.role || '';
  const { lang } = useLanguageStore();

  const navForRole = useMemo(() =>
    NAV
      .map(g => ({ ...g, items: g.items.filter(i => canAccessItem(i, role)) }))
      .filter(g => g.items.length > 0),
    [role]
  );

  const initials = (user?.name || 'A')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const logo = typeof window !== 'undefined'
    ? localStorage.getItem('schoolLogoPreview')
    : null;

  /* ── Module index for smart search ── */
  const MODULE_INDEX = useMemo(() => [
    // Students
    { label: 'All Students', desc: 'View student roster', path: '/hub/students', icon: '👨‍🎓', group: 'Students' },
    { label: 'Admit New Student', desc: 'Admission wizard', path: '/hub/students?tab=admit', icon: '📋', group: 'Students' },
    { label: 'Bulk Import Students', desc: 'Import from Excel/CSV', path: '/students/bulk-import', icon: '📁', group: 'Students' },
    { label: 'Admissions CRM', desc: 'Lead pipeline', path: '/admissions/crm', icon: '🎯', group: 'Students' },
    { label: 'Student Promotion', desc: 'Promote to next class', path: '/students/promote', icon: '⬆️', group: 'Students' },
    { label: 'Student Health Records', desc: 'Medical info', path: '/student-health', icon: '🏥', group: 'Students' },
    { label: 'Gate Passes', desc: 'Student exit management', path: '/gate-passes', icon: '🔲', group: 'Students' },
    // Fees
    { label: 'Collect Fee', desc: 'Receive fee payment', path: '/hub/fees?tab=collect', icon: '💰', group: 'Fees' },
    { label: 'Generate Monthly Fee', desc: 'Create invoices', path: '/hub/fees?tab=generate', icon: '📄', group: 'Fees' },
    { label: 'Fee Defaulters', desc: 'Unpaid fees list', path: '/fees/defaulters', icon: '⚠️', group: 'Fees' },
    { label: 'Fee Structure', desc: 'Set fee per class', path: '/fees/structure', icon: '🗂️', group: 'Fees' },
    { label: 'Fee Voucher Download', desc: 'Public fee slip', path: '/fee-voucher', icon: '🎫', group: 'Fees' },
    { label: 'Parent Wallet', desc: 'Advance credit system', path: '/fees/parent-wallet', icon: '💳', group: 'Fees' },
    { label: 'EMI Plans', desc: 'Instalment schedules', path: '/fees/emi', icon: '📅', group: 'Fees' },
    // Attendance
    { label: 'Mark Attendance', desc: 'Daily class attendance', path: '/attendance', icon: '✅', group: 'Attendance' },
    { label: 'Barcode Attendance', desc: 'Scan ID cards', path: '/attendance/barcode', icon: '📷', group: 'Attendance' },
    { label: 'Attendance Report', desc: 'View reports', path: '/attendance/report', icon: '📊', group: 'Attendance' },
    { label: 'Annual Attendance Calendar', desc: 'P/A/H full year', path: '/reports/attendance-calendar', icon: '🗓️', group: 'Attendance' },
    // Exams
    { label: 'Exams & Tests', desc: 'Create and manage exams', path: '/hub/exams', icon: '📝', group: 'Exams' },
    { label: 'Enter Marks', desc: 'Subject-wise marks', path: '/exams', icon: '✏️', group: 'Exams' },
    { label: 'Merit List', desc: 'Rank list', path: '/exams/merit-list', icon: '🏆', group: 'Exams' },
    { label: 'BISE Result Card', desc: 'Pakistani board format', path: '/exams/bise-result-card', icon: '🎓', group: 'Exams' },
    { label: 'Result Settings', desc: 'Grade config, signatures, card options', path: '/exams/result-config', icon: '⚙️', group: 'Exams' },
    { label: 'Exam Timetable', desc: 'Date sheet', path: '/exams/timetable', icon: '📅', group: 'Exams' },
    // Staff
    { label: 'All Staff', desc: 'Teaching & non-teaching', path: '/staff', icon: '👨‍🏫', group: 'Staff' },
    { label: 'Add New Staff', desc: 'Register staff member', path: '/staff/new', icon: '➕', group: 'Staff' },
    { label: 'Generate Salary', desc: 'Monthly payroll', path: '/salary', icon: '💵', group: 'Staff' },
    { label: 'Staff Attendance', desc: 'Daily staff attendance', path: '/attendance/staff', icon: '✅', group: 'Staff' },
    // Reports
    { label: 'Reports Hub (110+)', desc: 'All reports', path: '/reports-hub', icon: '📊', group: 'Reports' },
    { label: 'Daily Balance Sheet', desc: 'Finance summary', path: '/accounting/balancesheet', icon: '📒', group: 'Reports' },
    { label: 'Student Info Reports', desc: 'Printable lists', path: '/students/info-reports', icon: '📋', group: 'Reports' },
    { label: 'Academic Calendar', desc: 'Events & holidays', path: '/academic-calendar', icon: '📅', group: 'Reports' },
    // Settings
    { label: 'School Profile', desc: 'Logo & basic info', path: '/settings', icon: '🏫', group: 'Settings' },
    { label: 'Classes & Sections', desc: 'Grade management', path: '/settings/classes', icon: '🏛️', group: 'Settings' },
    { label: 'SMS Templates', desc: '15+ auto templates', path: '/settings/sms-templates', icon: '📱', group: 'Settings' },
    { label: 'Admin Accounts', desc: 'Manage admins', path: '/settings/admins', icon: '👤', group: 'Settings' },
    { label: 'Backup & Restore', desc: 'Database export', path: '/settings/backup', icon: '💾', group: 'Settings' },
    // Notifications
    { label: 'Send SMS', desc: 'Bulk SMS to parents', path: '/notifications/sms', icon: '💬', group: 'Communication' },
    { label: 'WhatsApp Notifications', desc: 'Bulk WhatsApp', path: '/notifications/whatsapp', icon: '📲', group: 'Communication' },
    { label: 'Push Notifications', desc: 'FCM push alerts', path: '/push', icon: '🔔', group: 'Communication' },
    { label: 'Announcements', desc: 'School-wide notices', path: '/announcements', icon: '📢', group: 'Communication' },
    // Portals
    { label: 'Parent Portal Setup', desc: 'Send credentials', path: '/portal-management', icon: '👪', group: 'Portals' },
    { label: 'Homework Diary', desc: 'Daily homework', path: '/homework/diary', icon: '📚', group: 'Academics' },
    { label: 'Timetable', desc: 'Class schedule', path: '/timetable', icon: '🕐', group: 'Academics' },
    { label: 'Library', desc: 'Book management', path: '/library', icon: '📖', group: 'Academics' },
    { label: 'Transport', desc: 'Bus routes', path: '/transport', icon: '🚌', group: 'Operations' },
    { label: 'Smart Workflow Hub', desc: 'Admission to leaving cycle', path: '/workflow', icon: '🔄', group: 'Navigation' },
    // Certificates & ID Cards
    { label: 'Certificates', desc: 'Leaving, character, merit certificates', path: '/certificates', icon: '🎓', group: 'Certificates' },
    { label: 'Leaving Certificate', desc: 'Print leaving certificate', path: '/certificates', icon: '📜', group: 'Certificates' },
    { label: 'Character Certificate', desc: 'Print character certificate', path: '/certificates', icon: '📜', group: 'Certificates' },
    { label: 'Merit Certificate', desc: 'Print merit certificate', path: '/certificates', icon: '🏅', group: 'Certificates' },
    { label: 'Certificate Registry', desc: 'All issued certificates log', path: '/certificates/registry', icon: '📋', group: 'Certificates' },
    { label: 'Student ID Cards', desc: 'Print student ID cards', path: '/students/id-cards', icon: '🪪', group: 'Certificates' },
    { label: 'Staff ID Cards', desc: 'Print staff ID cards', path: '/staff/id-cards', icon: '🪪', group: 'Certificates' },
    { label: 'Admission Form Print', desc: 'Print admission form', path: '/admissions/form-print', icon: '📄', group: 'Certificates' },
    // Academics
    { label: 'Online Classes', desc: 'Virtual classroom links', path: '/online-classes', icon: '🖥️', group: 'Academics' },
    { label: 'Study Materials', desc: 'Upload PDFs, videos, links', path: '/study-materials', icon: '📂', group: 'Academics' },
    { label: 'Quizzes', desc: 'Quick assessments', path: '/quiz', icon: '📝', group: 'Academics' },
    { label: 'PTM Scheduler', desc: 'Parent-teacher meetings', path: '/ptm', icon: '👨‍👩‍👧', group: 'Academics' },
    // Operations
    { label: 'Behaviour Tracking', desc: 'Student discipline records', path: '/behaviour', icon: '⚡', group: 'Operations' },
    { label: 'Task Management', desc: 'Staff task assignments', path: '/tasks', icon: '✅', group: 'Operations' },
    { label: 'Events Calendar', desc: 'School events', path: '/events', icon: '🎉', group: 'Operations' },
    { label: 'Alumni Management', desc: 'Passout students', path: '/alumni', icon: '🎓', group: 'Operations' },
    { label: 'Complaints', desc: 'Parent complaints', path: '/complaints', icon: '📢', group: 'Operations' },
    { label: 'Point of Sale', desc: 'Canteen / school shop', path: '/stock/pos', icon: '🛒', group: 'Operations' },
    // Payroll
    { label: 'Staff Salary', desc: 'Generate monthly salaries', path: '/salary', icon: '💵', group: 'Payroll' },
    { label: 'Loan Management', desc: 'Staff loans & advances', path: '/salary/loans', icon: '🏦', group: 'Payroll' },
    { label: 'Expense Management', desc: 'Track school expenses', path: '/expense-management', icon: '💸', group: 'Payroll' },
    { label: 'Accounting', desc: 'Income & expense tracking', path: '/accounting', icon: '📒', group: 'Payroll' },
  ], []);

  /* Recent actions — stored in localStorage */
  const getRecentActions = useCallback(() => {
    try { return JSON.parse(localStorage.getItem('ilm_recent_search') || '[]').slice(0, 4); } catch { return []; }
  }, []);

  const saveRecentAction = useCallback((item) => {
    try {
      const existing = JSON.parse(localStorage.getItem('ilm_recent_search') || '[]');
      const updated = [item, ...existing.filter(e => e.path !== item.path)].slice(0, 8);
      localStorage.setItem('ilm_recent_search', JSON.stringify(updated));
    } catch {}
  }, []);

  /* ── Debounced search (students/staff + module suggestions) ── */
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery.length < 1) {
      setShowResults(false);
      setSearchResults({ students: [], staff: [], modules: [], recent: getRecentActions() });
      return;
    }

    if (searchQuery.length < 2) {
      // Show recent + top module matches immediately
      const q = searchQuery.toLowerCase();
      const modules = MODULE_INDEX.filter(m =>
        m.label.toLowerCase().includes(q) || m.group.toLowerCase().includes(q)
      ).slice(0, 5);
      setSearchResults({ students: [], staff: [], modules, recent: getRecentActions() });
      setShowResults(true);
      return;
    }

    // Module search is instant (client-side)
    const q = searchQuery.toLowerCase();
    const modules = MODULE_INDEX.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.group.toLowerCase().includes(q)
    ).slice(0, 6);
    setSearchResults(prev => ({ ...prev, modules }));
    setShowResults(true);

    // API search for students/staff (debounced)
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const [studentsRes, staffRes] = await Promise.allSettled([
          api.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=5`),
          api.get(`/staff?search=${encodeURIComponent(searchQuery)}&limit=3`),
        ]);
        setSearchResults({
          students: studentsRes.status === 'fulfilled'
            ? (studentsRes.value.data?.data || []) : [],
          staff: staffRes.status === 'fulfilled'
            ? (staffRes.value.data?.data || []) : [],
          modules,
          recent: [],
        });
        setShowResults(true);
      } catch {
        setSearchResults(prev => ({ ...prev, students: [], staff: [] }));
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, MODULE_INDEX, getRecentActions]);

  /* ── Click outside → close search ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Keyboard: Escape close + Ctrl+K focus search ── */
  const searchInputRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setShowResults(false); setSearchQuery(''); searchInputRef.current?.blur(); }
      // Ctrl+K or Cmd+K — focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowResults(true);
        setSearchResults(prev => ({ ...prev, recent: getRecentActions() }));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [getRecentActions]);

  const handleSearchResultClick = (path, item) => {
    setShowResults(false);
    setSearchQuery('');
    if (item) saveRecentAction(item);
    navigate(path);
  };

  /* ── Nav scroll shadow indicators ── */
  const onNavScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    onNavScroll();
    el.addEventListener('scroll', onNavScroll, { passive: true });
    return () => el.removeEventListener('scroll', onNavScroll);
  }, [onNavScroll, collapsed, mobileOpen]);

  const scrollNav = (dir) => navRef.current?.scrollBy({ top: dir * 120, behavior: 'smooth' });

  /* ── Close mobile sidebar on route change ── */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* ── Resize listener ── */
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleNavItemClick = useCallback(() => {
    if (mobileOpen) setMobileOpen(false);
  }, [mobileOpen]);

  const hasResults = searchResults.students?.length > 0 || searchResults.staff?.length > 0
    || searchResults.modules?.length > 0 || searchResults.recent?.length > 0;

  /* ── Breadcrumb page label — translatable ── */
  const pageMap = {
    '/dashboard':  i18nT('dashboard','title',lang),
    '/students':   i18nT('students','title',lang),
    '/admissions': i18nT('students','admitStudent',lang),
    '/fees':       i18nT('fees','title',lang),
    '/attendance': i18nT('attendance','title',lang),
    '/staff':      i18nT('staff','title',lang),
    '/exams':      i18nT('exams','title',lang),
    '/salary':     i18nT('staff','salary',lang),
    '/expenses':   i18nT('common','total',lang),
    '/reports':    i18nT('nav','reports',lang),
    '/settings':   i18nT('settings','title',lang),
    '/profile':    i18nT('common','profile',lang),
    '/library':    i18nT('nav','library',lang),
  };
  const pageLabel = pageMap[location.pathname]
    || location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ')
    || 'Dashboard';

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#ecf0f5',
      fontFamily: "'Source Sans Pro','Inter',system-ui,sans-serif",
    }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 199,
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* ════════ SIDEBAR ════════ */}
      <aside
        ref={sidebarRef}
        className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
        onMouseEnter={() => {
          isMouseInSidebar.current = true;
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
          if (isDesktop && !isPinnedOpen) setIsHoverExpanded(true);
        }}
        onMouseLeave={() => {
          isMouseInSidebar.current = false;
          if (isDesktop && !isPinnedOpen) setIsHoverExpanded(false);
          resetInactivityTimer(); // restart timer when mouse leaves sidebar
        }}
        style={{
          width: SW,
          background: '#1B2F6E',
          boxShadow: '3px 0 16px rgba(5,20,60,0.35)',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ── Brand area ── */}
        <div className="sb-logo" style={{ background: 'rgba(0,0,0,0.22)', borderBottom: '1px solid rgba(255,255,255,0.09)', padding: '10px 14px' }}>
          {/* School logo or IlmForge icon */}
          {logo ? (
            <img src={logo} alt="School Logo"
              style={{ width:36, height:36, borderRadius:9, objectFit:'cover', flexShrink:0, border:'2px solid rgba(255,255,255,0.28)' }} />
          ) : (
            <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, background:'linear-gradient(135deg,#1B2F6E,#0073b7)', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(255,255,255,0.2)', fontSize:20 }}>
              🎓
            </div>
          )}
          {!collapsed && (
            <div style={{ overflow:'hidden', flex:1, minWidth:0 }}>
              {/* School name OR IlmForge */}
              <div style={{ fontFamily:"'Poppins','Inter',sans-serif", fontWeight:800, fontSize:14.5, color:'white', letterSpacing:'-0.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>
                {school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge'}
              </div>
              <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.55)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600, marginTop:2, fontFamily:"'Inter',sans-serif" }}>
                School Management System
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation area with scroll arrows ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* Scroll Up Arrow */}
          {canScrollUp && (
            <button
              aria-label="Scroll navigation up"
              onClick={() => scrollNav(-1)}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(to bottom, #1B2F6E 55%, transparent)',
                border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.55)', fontSize: 10, gap: 4,
                fontFamily: 'inherit', transition: 'color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                <path d="M1 7L7 1L13 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {!collapsed && <span style={{ fontSize: 9, letterSpacing: 0.5 }}>SCROLL UP</span>}
            </button>
          )}

          {/* Nav scroll area */}
          <nav
            ref={navRef}
            className="sb-nav"
            style={{
              paddingTop: canScrollUp ? 28 : 8,
              paddingBottom: canScrollDown ? 28 : 12,
            }}
          >
            {navForRole.map(group => (
              <div key={group.group}>
                {/* Section label */}
                {!collapsed && (
                  <div className="sb-section">
                    <span className="sb-section-label" style={{ fontSize: 10, letterSpacing: 1.1, color: 'rgba(196,220,248,0.75)' }}>
                      {group.group}
                    </span>
                    <div className="sb-section-line" />
                  </div>
                )}
                {collapsed && <div style={{ height: 6 }} />}

                {group.items.map(item => (
                  <NavItem
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    onNavigate={handleNavItemClick}
                  />
                ))}
              </div>
            ))}
          </nav>

          {/* Scroll Down Arrow */}
          {canScrollDown && (
            <button
              aria-label="Scroll navigation down"
              onClick={() => scrollNav(1)}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
                height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(to top, #1B2F6E 55%, transparent)',
                border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.55)', fontSize: 10, gap: 4,
                fontFamily: 'inherit', transition: 'color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              {!collapsed && <span style={{ fontSize: 9, letterSpacing: 0.5 }}>SCROLL DOWN</span>}
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Footer: user profile + WhatsApp support + logout ── */}
        <div className="sb-footer">
          {/* WhatsApp Support link */}
          {!collapsed && (
            <a
              href="https://wa.me/923465146609"
              target="_blank"
              rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', textDecoration:'none', borderTop:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.55)', fontSize:11, transition:'color .12s' }}
              onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.9)'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.55)'}
            >
              <span style={{ fontSize:13 }}>💬</span>
              <span style={{ fontWeight:600, letterSpacing:'0.02em' }}>0346-5146609 Support</span>
            </a>
          )}
          {!collapsed && (
            <Link to="/profile" style={{ textDecoration: 'none', display: 'block' }}>
              <div className="sb-user">
                <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#0073b7,#00c0ef)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:11 }}>
                  {initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="sb-user-name">{user?.name || 'Admin'}</div>
                  <div className="sb-user-role" style={{ color:'rgba(255,255,255,0.5)', textTransform:'capitalize' }}>
                    {user?.role || 'admin'}
                  </div>
                </div>
              </div>
            </Link>
          )}
          <button aria-label="Log out" className="sb-logout" onClick={() => setShowLogoutConfirm(true)}
            title={collapsed ? 'Logout' : undefined}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', width:'100%', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            <LogOut size={14} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ════════ MAIN CONTENT AREA ════════ */}
      <div
        className={`main-wrapper${collapsed ? ' collapsed' : ''}`}
        style={{ marginLeft: SW }}
      >

        {/* ── Header (white bar) ── */}
        <header className="top-header" style={{ background: '#fff', borderBottom: '1px solid #dee2e6' }}>

          {/* Left: hamburger + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              aria-label={isPinnedOpen ? 'Collapse sidebar (auto-collapses after 5s inactivity)' : 'Pin sidebar open'}
              title={isPinnedOpen ? '📌 Pinned — click to unpin (auto-collapses in 5s)' : '📌 Click to pin sidebar'}
              onClick={() => isDesktop ? togglePin() : setMobileOpen(o => !o)}
              style={{
                width: 36, height: 36, borderRadius: 6,
                border: `1px solid ${isPinnedOpen && isDesktop ? '#0073b7' : '#dee2e6'}`,
                background: isPinnedOpen && isDesktop ? '#e8f4fd' : '#fff',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isPinnedOpen && isDesktop ? '#0073b7' : '#666',
                transition: 'all .12s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0073b7'; e.currentTarget.style.color = '#0073b7'; e.currentTarget.style.background = '#e8f4fd'; }}
              onMouseLeave={e => {
                if (!(isPinnedOpen && isDesktop)) {
                  e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#666'; e.currentTarget.style.background = '#fff';
                }
              }}
            >
              <Menu size={17} />
            </button>

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ color: '#999', fontWeight: 500 }}>Home</span>
              <ChevronRight size={13} color="#ccc" />
              <span style={{ color: '#333', fontWeight: 700, textTransform: 'capitalize' }}>
                {pageLabel}
              </span>
            </div>
          </div>

          {/* Center: search bar */}
          <div
            className="hdr-search"
            ref={searchContainerRef}
            style={{ position: 'relative', flex: '1 1 300px', maxWidth: 440 }}
          >
            <Search size={14} className="hdr-search-icon" />
            <input
              ref={searchInputRef}
              placeholder="Search students, certificates, fees, reports... (Ctrl+K)"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (e.target.value.length < 1) { setShowResults(false); } }}
              onFocus={() => { setShowResults(true); if (!searchQuery) setSearchResults(prev => ({ ...prev, recent: getRecentActions() })); }}
              aria-label="Global search"
              aria-autocomplete="list"
              aria-expanded={showResults}
              role="combobox"
              style={{ borderRadius: 20 }}
            />
            {searching && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <div style={{
                  width: 12, height: 12,
                  border: '2px solid #dee2e6',
                  borderTopColor: '#0073b7',
                  borderRadius: '50%',
                  animation: 'spin .6s linear infinite',
                }} />
              </div>
            )}
            {searchQuery.length > 0 && !searching && (
              <button
                aria-label="Clear search"
                onClick={() => { setSearchQuery(''); setShowResults(false); }}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#999', padding: 2, display: 'flex',
                }}
              >
                <X size={13} />
              </button>
            )}

            {/* ══ INTELLIGENT SEARCH DROPDOWN ══ */}
            {showResults && (
              <div
                role="listbox"
                aria-label="Search results"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
                  zIndex: 500, overflow: 'hidden', maxHeight: 480, overflowY: 'auto',
                  minWidth: 380,
                }}
              >
                {/* ── Search header ── */}
                {searchQuery && (
                  <div style={{ padding:'8px 14px 6px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #f1f5f9', background:'#fafbff' }}>
                    <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>
                      {searching ? '🔍 Searching…' : `Results for "${searchQuery}"`}
                    </span>
                    <span style={{ fontSize:10, color:'#cbd5e1' }}>ESC to close</span>
                  </div>
                )}

                {/* ── Recent actions (shown when no query) ── */}
                {!searchQuery && searchResults.recent?.length > 0 && (
                  <div>
                    <div style={{ padding:'8px 14px 5px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', background:'#fafbff', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:6 }}>
                      🕐 Recent
                    </div>
                    {searchResults.recent.map((item, i) => (
                      <button key={i} role="option"
                        onClick={() => handleSearchResultClick(item.path, item)}
                        style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid #f8fafc', fontFamily:'inherit', transition:'background .1s' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#f8faff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='none'; }}>
                        <span style={{ fontSize:18, flexShrink:0 }}>{item.icon || '📄'}</span>
                        <div>
                          <div style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>{item.label}</div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>{item.group}</div>
                        </div>
                        <ChevronRight size={12} color="#cbd5e1" style={{ marginLeft:'auto' }}/>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Module suggestions ── */}
                {searchResults.modules?.length > 0 && (
                  <div>
                    <div style={{ padding:'8px 14px 5px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', background:'#fafbff', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:6 }}>
                      ⚡ Features & Modules
                    </div>
                    {searchResults.modules.map((m, i) => (
                      <button key={i} role="option"
                        onClick={() => handleSearchResultClick(m.path, m)}
                        style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid #f8fafc', fontFamily:'inherit', transition:'background .1s' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#eff6ff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='none'; }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                          {m.icon}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#1e3a5f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.label}</div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>{m.desc} · <span style={{ color:'#bfdbfe' }}>{m.group}</span></div>
                        </div>
                        <ChevronRight size={12} color="#bfdbfe" style={{ flexShrink:0 }}/>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Students ── */}
                {searchResults.students?.length > 0 && (
                  <div>
                    <div style={{ padding:'8px 14px 5px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', background:'#fafbff', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:6 }}>
                      👨‍🎓 Students
                    </div>
                    {searchResults.students.map(student => {
                      const sItem = { label: student.name || 'Student', icon:'👨‍🎓', group:'Students', path:`/students/${student.id}` };
                      return (
                        <button key={student._id || student.id} role="option"
                          onClick={() => handleSearchResultClick(`/students/${student._id || student.id}`, sItem)}
                          style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid #f8fafc', fontFamily:'inherit', transition:'background .1s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='#e8f4fd'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='none'; }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1B2F6E,#0073b7)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13, flexShrink:0 }}>
                            {(student.name || 'S')[0].toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#333', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{student.name}</div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>
                              {student.rollNo ? `Roll: ${student.rollNo}` : ''}
                              {student.rollNo && student.class ? ' · ' : ''}
                              {student.class ? (typeof student.class === 'object' ? student.class.name : student.class) : ''}
                            </div>
                          </div>
                          <span style={{ fontSize:11, background:'#dbeafe', color:'#1d4ed8', padding:'2px 7px', borderRadius:99, fontWeight:600, flexShrink:0 }}>Student</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── Staff ── */}
                {searchResults.staff?.length > 0 && (
                  <div>
                    <div style={{ padding:'8px 14px 5px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px', background:'#fafbff', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:6 }}>
                      👨‍🏫 Staff & Teachers
                    </div>
                    {searchResults.staff.map(member => {
                      const sItem = { label: member.name || 'Staff', icon:'👨‍🏫', group:'Staff', path:`/staff` };
                      return (
                        <button key={member._id || member.id} role="option"
                          onClick={() => handleSearchResultClick(`/staff`, sItem)}
                          style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid #f8fafc', fontFamily:'inherit', transition:'background .1s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='#fffbeb'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='none'; }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#d97706,#f59e0b)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13, flexShrink:0 }}>
                            {(member.name || 'T')[0].toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#333', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.name}</div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{member.designation || member.role || 'Staff'}</div>
                          </div>
                          <span style={{ fontSize:11, background:'#fef3c7', color:'#92400e', padding:'2px 7px', borderRadius:99, fontWeight:600, flexShrink:0 }}>Staff</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── No results ── */}
                {searchQuery.length >= 2 && !hasResults && !searching && (
                  <div style={{ padding:'28px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                    <div style={{ fontWeight:600, color:'#374151', marginBottom:4 }}>No results for "{searchQuery}"</div>
                    <div style={{ fontSize:12, color:'#94a3b8' }}>Try different keywords or check spelling</div>
                  </div>
                )}

                {/* ── Footer ── */}
                <div style={{ padding:'7px 14px', background:'#f8f9fa', borderTop:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10.5, color:'#94a3b8' }}>↑↓ navigate · Enter select · Esc close</span>
                  <span style={{ fontSize:10.5, color:'#94a3b8' }}>Ctrl+K to open</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: language toggle + notification bell + session badge + user avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* Language Toggle */}
            <LanguageToggle />

            {/* Notification bell with red dot */}
            <button
              aria-label="Notifications"
              onClick={() => navigate('/notifications')}
              style={{
                width: 36, height: 36, borderRadius: 6,
                border: '1px solid #dee2e6', background: '#fff',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#666', position: 'relative', transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0073b7'; e.currentTarget.style.color = '#0073b7'; e.currentTarget.style.background = '#e8f4fd'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#666'; e.currentTarget.style.background = '#fff'; }}
            >
              <Bell size={16} />
              <span style={{
                position: 'absolute', top: 7, right: 7,
                width: 7, height: 7,
                background: '#dd4b39',
                borderRadius: '50%', border: '2px solid #fff',
              }} />
            </button>

            {/* Academic session badge */}
            <div
              title="Academic Session 2025-2026"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 4,
                border: '1px solid #dee2e6', background: '#f4f6f9',
                color: '#555', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <Calendar size={13} style={{ color: '#0073b7', flexShrink: 0 }} />
              <span>2025-2026</span>
            </div>

            {/* User avatar chip */}
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px 4px 6px', borderRadius: 4,
                border: '1px solid #dee2e6', background: '#fff',
                cursor: 'pointer', transition: 'all .12s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0073b7'; e.currentTarget.style.background = '#e8f4fd'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.background = '#fff'; }}
                title={`${user?.name || 'Admin'} (${user?.role || 'admin'})`}
              >
                {/* Avatar circle with initials */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1B2F6E,#0073b7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#333', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Admin'}
                  </div>
                  <div style={{ fontSize: 10, color: '#999', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                    {user?.role || 'admin'}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <LicenseBanner />
          <Outlet />
        </main>
      </div>

      {/* ════════ LOGOUT CONFIRM MODAL ════════ */}
      {/* ═══ PROFESSIONAL LOGOUT MODAL ═══ */}
      {showLogoutConfirm && (
        <div
          onClick={() => setShowLogoutConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn .18s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              width: '100%', maxWidth: 400,
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              animation: 'fadeUp .2s ease',
            }}
          >
            {/* School branding header */}
            <div style={{ background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 100%)', padding: '20px 24px', textAlign: 'center' }}>
              {logo
                ? <img src={logo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', marginBottom: 8 }} />
                : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 22 }}>🎓</div>
              }
              <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>{school?.name || 'IlmForge School'}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>Ilm Ko Asaan Banaye 🇵🇰</div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px 28px' }}>
              {/* Icon */}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>
                🚪
              </div>
              <h3 style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, color: '#1e3a5f', margin: '0 0 8px' }}>
                Sign Out?
              </h3>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 6px' }}>
                You're signed in as <strong style={{ color: '#1e3a5f' }}>{user?.name || 'Admin'}</strong>
              </p>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                Your session will end and you'll need to sign in again to access the system.
              </p>
            </div>

            {/* Actions */}
            <div style={{ padding: '0 28px 24px', display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8f9fa', color: '#374151', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8f9fa'; }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); navigate('/login'); }}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.35)', transition: 'all .12s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(220,38,38,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.35)'; }}
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
