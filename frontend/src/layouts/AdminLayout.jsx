/**
 * IlmForge — Dark Navy Sidebar Layout
 * Matches reference screenshot: #1B2F6E sidebar, white header, #ecf0f5 content
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
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
} from 'lucide-react';

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
      { to: '/analytics/students', icon: BarChart2,       label: 'Student Analytics',    roles: ['super_admin', 'admin'] },
    ],
  },
  {
    group: 'STUDENTS & STAFF',
    items: [
      { to: '/hub/students',         icon: GraduationCap, label: 'Students Hub' },
      { to: '/students/bulk-import',  icon: FileText,      label: 'Bulk Import',         roles: ['super_admin', 'admin'] },
      { to: '/students/info-reports', icon: BarChart2,     label: 'Student Info Reports', roles: ['super_admin', 'admin'] },
      { to: '/hub/staff',            icon: Briefcase,     label: 'Staff & Teachers Hub' },
      { to: '/hub/parents',          icon: Users,         label: 'Parents & Portals Hub' },
      { to: '/gate-passes',          icon: QrCode,        label: 'Gate Passes',         roles: ['super_admin', 'admin', 'gatekeeper'] },
    ],
  },
  {
    group: 'ACADEMICS',
    items: [
      { to: '/hub/academics',       icon: BookOpen,    label: 'Academics Hub' },
      { to: '/hub/attendance',      icon: CheckSquare, label: 'Attendance Hub' },
      { to: '/hub/exams',           icon: Award,       label: 'Exams & Tests Hub' },
      { to: '/exams/timetable',      icon: Calendar,      label: 'Exam Timetable',      roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/merit-list',     icon: Award,         label: 'Merit List',          roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/gazette',        icon: FileText,      label: 'Gazette Sheet',       roles: ['super_admin', 'admin'] },
      { to: '/exams/annual-report',  icon: ClipboardList, label: 'Annual Report Cards', roles: ['super_admin', 'admin', 'teacher'] },
      { to: '/exams/bise-result-card',icon: FileText,     label: 'BISE Result Card',    roles: ['super_admin', 'admin', 'teacher'] },
    ],
  },
  {
    group: 'FINANCE',
    items: [
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

  /* Sidebar state */
  const [isPinnedOpen, setIsPinnedOpen]     = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [isDesktop, setIsDesktop]           = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  /* ── Debounced search ── */
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery.length < 2) {
      setShowResults(false);
      setSearchResults({ students: [], staff: [] });
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const [studentsRes, staffRes] = await Promise.allSettled([
          api.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=5`),
          api.get(`/staff?search=${encodeURIComponent(searchQuery)}&limit=3`),
        ]);
        setSearchResults({
          students: studentsRes.status === 'fulfilled'
            ? (studentsRes.value.data?.data || studentsRes.value.data || [])
            : [],
          staff: staffRes.status === 'fulfilled'
            ? (staffRes.value.data?.data || staffRes.value.data || [])
            : [],
        });
        setShowResults(true);
      } catch {
        setSearchResults({ students: [], staff: [] });
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

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

  /* ── Escape → close search ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setShowResults(false); setSearchQuery(''); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSearchResultClick = (path) => {
    setShowResults(false);
    setSearchQuery('');
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

  const hasResults = searchResults.students.length > 0 || searchResults.staff.length > 0;

  /* ── Breadcrumb page label ── */
  const pageMap = {
    '/dashboard': 'Dashboard', '/students': 'Students', '/admissions': 'Admissions',
    '/fees': 'Fee Management', '/attendance': 'Attendance', '/staff': 'Staff',
    '/exams': 'Exams', '/salary': 'Salary', '/expenses': 'Expenses',
    '/reports': 'Reports', '/settings': 'Settings', '/profile': 'My Profile',
    '/library': 'Library',
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
        className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
        onMouseEnter={() => { if (isDesktop && !isPinnedOpen) setIsHoverExpanded(true); }}
        onMouseLeave={() => { if (isDesktop && !isPinnedOpen) setIsHoverExpanded(false); }}
        style={{
          width: SW,
          background: '#1B2F6E',
          boxShadow: '3px 0 16px rgba(5,20,60,0.35)',
        }}
      >
        {/* ── Brand area ── */}
        <div className="sb-logo" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {logo ? (
            <img
              src={logo}
              alt="School Logo"
              style={{
                width: 34, height: 34, borderRadius: 8,
                objectFit: 'cover', flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.25)',
              }}
            />
          ) : (
            /* Fallback initials circle */
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,#00c0ef,#0073b7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 15, color: '#fff',
              letterSpacing: -0.5,
            }}>
              {(school?.name || 'I')[0].toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div className="sb-logo-name">
                {school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge'}
              </div>
              <div className="sb-logo-tag" style={{ color: '#f39c12' }}>v3.3 — School ERP</div>
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

        {/* ── Footer: user profile chip + logout ── */}
        <div className="sb-footer">
          {!collapsed && (
            <Link to="/profile" style={{ textDecoration: 'none', display: 'block' }}>
              <div className="sb-user">
                {/* Avatar circle */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#0073b7,#00c0ef)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 11,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-user-name">{user?.name || 'Admin'}</div>
                  <div className="sb-user-role" style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                    {user?.role || 'admin'}
                  </div>
                </div>
              </div>
            </Link>
          )}
          <button
            aria-label="Log out"
            className="sb-logout"
            onClick={() => setShowLogoutConfirm(true)}
            title={collapsed ? 'Logout' : undefined}
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              width: '100%', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
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
              aria-label="Toggle sidebar"
              onClick={() => isDesktop ? setIsPinnedOpen(v => !v) : setMobileOpen(o => !o)}
              style={{
                width: 36, height: 36, borderRadius: 6,
                border: '1px solid #dee2e6',
                background: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#666', transition: 'all .12s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0073b7'; e.currentTarget.style.color = '#0073b7'; e.currentTarget.style.background = '#e8f4fd'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.color = '#666'; e.currentTarget.style.background = '#fff'; }}
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
            style={{ position: 'relative', flex: '0 0 300px' }}
          >
            <Search size={14} className="hdr-search-icon" />
            <input
              placeholder="Search students, staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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

            {/* Search dropdown */}
            {showResults && (
              <div
                role="listbox"
                aria-label="Search results"
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  background: '#fff', border: '1px solid #dee2e6',
                  borderRadius: 6, boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
                  zIndex: 500, overflow: 'hidden', maxHeight: 380, overflowY: 'auto',
                }}
              >
                {!hasResults ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#999', fontSize: 13 }}>
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <>
                    {searchResults.students.length > 0 && (
                      <div>
                        <div style={{
                          padding: '8px 14px 4px',
                          fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
                          color: '#999', textTransform: 'uppercase',
                          borderBottom: '1px solid #f1f3f5', background: '#f8f9fa',
                        }}>
                          Students
                        </div>
                        {searchResults.students.map(student => (
                          <button
                            key={student._id || student.id}
                            role="option"
                            onClick={() => handleSearchResultClick(`/students/${student._id || student.id}`)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '9px 14px',
                              background: 'none', border: 'none',
                              cursor: 'pointer', textAlign: 'left',
                              borderBottom: '1px solid #f9fafb',
                              transition: 'background .1s', fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#e8f4fd'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'linear-gradient(135deg,#0073b7,#00c0ef)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0,
                            }}>
                              {(student.name || student.fullName || 'S')[0].toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {student.name || student.fullName || 'Unknown'}
                              </div>
                              <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                                {student.rollNo ? `Roll: ${student.rollNo}` : ''}
                                {student.rollNo && student.class ? ' · ' : ''}
                                {student.class
                                  ? (typeof student.class === 'object' ? student.class.name : student.class)
                                  : ''}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.staff.length > 0 && (
                      <div>
                        <div style={{
                          padding: '8px 14px 4px',
                          fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
                          color: '#999', textTransform: 'uppercase',
                          borderBottom: '1px solid #f1f3f5', background: '#f8f9fa',
                        }}>
                          Staff
                        </div>
                        {searchResults.staff.map(member => (
                          <button
                            key={member._id || member.id}
                            role="option"
                            onClick={() => handleSearchResultClick(`/staff/${member._id || member.id}`)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '9px 14px',
                              background: 'none', border: 'none',
                              cursor: 'pointer', textAlign: 'left',
                              borderBottom: '1px solid #f9fafb',
                              transition: 'background .1s', fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fff3cd'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'linear-gradient(135deg,#f39c12,#d68910)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0,
                            }}>
                              {(member.name || member.fullName || 'T')[0].toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {member.name || member.fullName || 'Unknown'}
                              </div>
                              <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                                {member.designation || member.role || 'Staff'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: notification bell + session badge + user avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

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
          <Outlet />
        </main>
      </div>

      {/* ════════ LOGOUT CONFIRM MODAL ════════ */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal modal-sm caution-popup" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} />
                Confirm Logout
              </h3>
            </div>
            <div className="modal-body">
              <p className="validation-caption">Validation check: active session will end on logout.</p>
              <p style={{ marginTop: 10, fontSize: 13, color: '#4B5563' }}>
                Are you sure you want to sign out?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-red"
                onClick={() => { setShowLogoutConfirm(false); logout(); navigate('/login'); }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
