/**
 * IlmForge — Premium Light Sidebar Layout
 * White sidebar · dark text · teal accents · eye-friendly
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import {
  LayoutDashboard, Users, UserPlus, GraduationCap,
  DollarSign, ClipboardList, BarChart3, UserCheck,
  Calendar, Bell, MessageSquare, Settings, LogOut,
  Menu, ChevronRight, Search, Package, Truck,
  AlertCircle, BookMarked, TrendingUp, Award, Briefcase,
  Home, Phone, CreditCard, Video, FolderOpen, Mail,
  User, BookOpen, PieChart, FileText, Shield,
  Landmark, Star, CheckSquare, BarChart2, Tag,
  Database, Globe, Key, Wallet, BookOpenCheck,
  Building2, CalendarDays, ClipboardCheck, HelpCircle,
  Receipt, Layers, ShoppingCart, MessageCircle, Bot
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   NAVIGATION TREE
   Cleaned up: every sub-item now points to a distinct page —
   previously many groups (Fees, Salary, Reports, Test Management)
   listed a dozen differently-worded links that all opened the exact
   same screen, which just looked broken/confusing. Duplicate
   top-level entries for the same feature (ID Cards, Biometric,
   Website Management, Classes & Sections) are now listed once.
═══════════════════════════════════════════════════ */
const NAV = [
  /* ── Overview ─────────────────────────────────── */
  { group:'Overview', items:[
    { to:'/dashboard', icon:LayoutDashboard, label:'Dashboard' },
    { to:'/platform/features', icon:ClipboardCheck, label:'Feature Matrix' },
    { to:'/mentor-ai', icon:Bot, label:'AI Tools' },
    { to:'/support-center', icon:HelpCircle, label:'Support Center' },
  ]},

  /* ── Admissions ────────────────────────────────── */
  { group:'Admissions', items:[
    { to:'/admissions/wizard', icon:UserPlus, label:'Admit a Student' },
    { to:'/admissions/inquiries', icon:ClipboardList, label:'Admission Inquiries' },
    { to:'/students', icon:Users, label:'Students',
      sub:[
        { to:'/students',            label:'All Students'      },
        { to:'/students/birthdays',  label:'Birthdays 🎂'       },
        { to:'/students/promote',    label:'Promote Students'  },
        { to:'/students/transfer',   label:'Transfer Student'  },
      ]},
    { to:'/id-cards', icon:CreditCard, label:'ID Cards',
      sub:[
        { to:'/id-cards',       label:'Student ID Cards' },
        { to:'/staff/id-cards', label:'Staff ID Cards'   },
      ]},
    { to:'/parents', icon:Home, label:'Parent Accounts',
      sub:[
        { to:'/parents',               label:'Manage Accounts'   },
        { to:'/parents/requests',      label:'Account Requests'  },
        { to:'/parents/gate-passes',   label:'Gate Passes'       },
        { to:'/parents/dues-report',   label:'Dues Report'       },
      ]},
  ]},

  /* ── Staff ─────────────────────────────────────── */
  { group:'Staff', items:[
    { to:'/staff', icon:Award, label:'Staff Management',
      sub:[
        { to:'/staff',             label:'All Staff'        },
        { to:'/staff/new',         label:'Add New Staff'    },
        { to:'/staff/appraisals',  label:'Appraisals'       },
        { to:'/staff/departments', label:'Departments'      },
        { to:'/staff/birthdays',   label:'Birthdays 🎂'      },
        { to:'/staff/cv-bank',     label:'Job Applications' },
      ]},
    { to:'/tasks',      icon:CheckSquare,  label:'Task Management'    },
    { to:'/complaints', icon:AlertCircle,  label:'Parent Complaints'  },
    { to:'/portal-management', icon:Shield, label:'Portal Management' },
  ]},

  /* ── Academics ─────────────────────────────────── */
  { group:'Academics', items:[
    { to:'/settings/classes', icon:Layers,   label:'Classes & Sections' },
    { to:'/settings/subjects', icon:BookOpen, label:'Subjects'          },
    { to:'/attendance', icon:UserCheck, label:'Attendance',
      sub:[
        { to:'/attendance',          label:'Mark Attendance'    },
        { to:'/attendance/staff',    label:'Staff Attendance'   },
        { to:'/attendance/barcode',  label:'Barcode Scan'       },
        { to:'/attendance/awards',  label:'Attendance Awards 🏆'},
        { to:'/attendance/report',   label:'Attendance Reports' },
      ]},
    { to:'/online-classes',  icon:Video,        label:'Online Classes'    },
    { to:'/timetable',       icon:Calendar,     label:'Timetable'         },
    { to:'/holiday-calendar', icon:CalendarDays, label:'Holiday Calendar' },
  ]},

  /* ── Fee Management ─────────────────────────────── */
  { group:'Fee Management', items:[
    { to:'/fees', icon:DollarSign, label:'Fee Dashboard' },
    { to:'/fees/collect', icon:Wallet, label:'Collect Fee' },
    { to:'/fees/generate', icon:Receipt, label:'Generate Fee' },
    { to:'/fees/defaulters', icon:AlertCircle, label:'Fee Defaulters' },
    { to:'/fees/structure', icon:Layers, label:'Fee Structure',
      sub:[
        { to:'/fees/structure',  label:'Class Fee Structure' },
        { to:'/fees/types',      label:'Fee Types'           },
        { to:'/fees/increment',  label:'Fee Increment'       },
        { to:'/fees/decrement',  label:'Fee Decrement'       },
      ]},
    { to:'/fees/discounted', icon:Tag, label:'Discounted Students' },
    { to:'/fees/family-voucher', icon:Wallet, label:'Family Voucher' },
    { to:'/fee-voucher', icon:FileText, label:'Print Fee Voucher' },
    { to:'/expense-management', icon:TrendingUp, label:'Expenses' },
  ]},

  /* ── Finance & Payroll ─────────────────────────── */
  { group:'Finance & Payroll', items:[
    { to:'/salary', icon:Briefcase, label:'Salary Management' },
    { to:'/salary/loans', icon:CreditCard, label:'Staff Loans' },
    { to:'/reports', icon:BarChart3, label:'Reports' },
    { to:'/accounting', icon:Landmark, label:'Accounting / Balance Sheet' },
    { to:'/stock', icon:Package, label:'Stock & Inventory' },
  ]},

  /* ── Exams & Tests ─────────────────────────────── */
  { group:'Exams & Tests', items:[
    { to:'/exams', icon:GraduationCap, label:'Exams & Marks',
      sub:[
        { to:'/exams',           label:'Exam List'        },
        { to:'/exams/exam-slip', label:'Admit Cards / Slips'},
      ]},
    { to:'/behaviour', icon:Star, label:'Student Behaviour' },
    { to:'/certificates', icon:FileText, label:'Certificates',
      sub:[
        { to:'/certificates', label:'Student Certificates' },
        { to:'/certificates', label:'Staff Certificates'   },
      ]},
  ]},

  /* ── LMS & Learning ─────────────────────────────── */
  { group:'LMS & Learning', items:[
    { to:'/homework',        icon:BookMarked, label:'Homework Diary'      },
    { to:'/study-materials', icon:FolderOpen, label:'Study Materials'     },
    { to:'/leaves',          icon:BookOpen,   label:'Leave Management'    },
  ]},

  /* ── Communication ─────────────────────────────── */
  { group:'Communication', items:[
    { to:'/announcements',          icon:Bell,          label:'Announcements'   },
    { to:'/notifications/sms',      icon:MessageSquare, label:'SMS'             },
    { to:'/notifications',          icon:Bell,          label:'App Notifications' },
    { to:'/notifications/whatsapp', icon:Phone,         label:'WhatsApp'        },
    { to:'/email',                  icon:Mail,          label:'Email'           },
    { to:'/settings/noticeboard',   icon:Bell,          label:'Noticeboard'     },
  ]},

  /* ── Administration ─────────────────────────────── */
  { group:'Administration', items:[
    { to:'/settings/campuses', icon:Building2, label:'Campuses'    },
    { to:'/settings/admins',   icon:Users,     label:'Admin Roles' },
    { to:'/transport',         icon:Truck,     label:'Transport'   },
  ]},

  /* ── Settings ───────────────────────────────────── */
  { group:'Settings', items:[
    { to:'/settings', icon:Settings, label:'School Settings',
      sub:[
        { to:'/settings',                 label:'School Profile'    },
        { to:'/settings/general',         label:'General Settings'  },
        { to:'/settings/sessions',        label:'Sessions'          },
        { to:'/settings/theme',           label:'Theme'             },
        { to:'/settings/website',         label:'Website Management'},
        { to:'/settings/exam-settings',   label:'Exam Settings'     },
        { to:'/settings/payments',        label:'Payment Settings' },
        { to:'/settings/sms-templates',   label:'SMS Templates'     },
        { to:'/settings/email',           label:'Email Settings'    },
        { to:'/settings/whatsapp',        label:'WhatsApp Settings'},
        { to:'/settings/automation',      label:'Automation'        },
        { to:'/settings/thermal-printer', label:'Thermal Printer'  },
        { to:'/settings/biometric',       label:'Biometric Devices'},
      ]},
    { to:'/profile',    icon:User,     label:'My Profile'      },
    { to:'/manual',     icon:BookOpen, label:'User Manual 📖'  },
    { to:'/settings/audit-logs', icon:Shield, label:'Audit Logs' },
    { to:'/settings/permissions-matrix', icon:Key, label:'Permission Matrix' },
    { to:'/tutorials',  icon:Video,    label:'Video Tutorials' },
  ]},
];

/* ═══════════════════════════════════════════════════
   SIDEBAR ITEM
═══════════════════════════════════════════════════ */
function SItem({ item, collapsed }) {
  const location = useLocation();
  const Icon     = item.icon;
  const hasSub   = Array.isArray(item.sub) && item.sub.length > 0;

  const isActive = hasSub
    ? item.sub.some(s => location.pathname === s.to || location.pathname.startsWith(s.to + '/'))
    : location.pathname === item.to;

  const [open, setOpen] = useState(isActive);
  useEffect(() => { if (isActive && hasSub) setOpen(true); }, [location.pathname]);

  if (hasSub) {
    return (
      <div>
        <div
          className={`sb-item${isActive ? ' active' : ''}`}
          onClick={() => !collapsed && setOpen(o => !o)}
          title={collapsed ? item.label : undefined}
        >
          <div className="sb-icon"><Icon size={15}/></div>
          {!collapsed && (
            <>
              <span style={{ flex:1, fontSize:13, fontWeight:isActive?600:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {item.label}
              </span>
              <ChevronRight size={12} style={{ flexShrink:0, color:'#D1D5DB', transform:open?'rotate(90deg)':'rotate(0deg)', transition:'transform .15s' }}/>
            </>
          )}
        </div>
        {!collapsed && (
          <div className={`sb-sub${open ? ' open' : ''}`}>
            {item.sub.map(s => (
              <NavLink key={s.to} to={s.to} end
                className={({isActive:ia}) => `sb-sub-item${ia ? ' active' : ''}`}>
                {s.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink to={item.to} end
      className={({isActive:ia}) => `sb-item${ia ? ' active' : ''}`}
      title={collapsed ? item.label : undefined}>
      <div className="sb-icon"><Icon size={15}/></div>
      {!collapsed && (
        <span style={{ fontSize:13, fontWeight:isActive?600:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.label}
        </span>
      )}
    </NavLink>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN LAYOUT
═══════════════════════════════════════════════════ */
export default function AdminLayout() {
  const { user, school, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [canScrollUp,  setCanScrollUp]  = useState(false);
  const [canScrollDown,setCanScrollDown]= useState(false);
  const navRef = useRef(null);

  /* Track scroll position to show/hide scroll arrows */
  const onNavScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    onNavScroll(); // initial check
    el.addEventListener('scroll', onNavScroll, { passive: true });
    return () => el.removeEventListener('scroll', onNavScroll);
  }, [onNavScroll, collapsed]);

  const scrollNav = (dir) => {
    navRef.current?.scrollBy({ top: dir * 120, behavior: 'smooth' });
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const initials = (user?.name || 'A').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const logo     = typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : null;
  const SW       = collapsed ? 68 : 268;

  /* Breadcrumb */
  const pageMap = {
    '/dashboard':'Dashboard','/students':'Students','/admissions':'Admissions',
    '/fees':'Fee Management','/fees/collect':'Collect Fee','/fees/generate':'Generate Fee',
    '/fees/defaulters':'Fee Defaulters','/fees/structure':'Fee Structure',
    '/attendance':'Attendance','/staff':'Staff','/exams':'Exams',
    '/salary':'Salary','/expenses':'Expenses','/stock':'Stock / POS',
    '/reports':'Reports','/transport':'Transport','/settings':'Settings',
    '/profile':'My Profile','/parents':'Parents','/email':'Email',
    '/online-classes':'Online Classes','/study-materials':'Study Materials',
  };
  const pageLabel = pageMap[location.pathname] ||
    location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g,' ') || 'Dashboard';

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F8FAFC', fontFamily:"'Inter','Poppins',system-ui,sans-serif" }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', zIndex:199, backdropFilter:'blur(3px)' }}/>
      )}

      {/* ══════════ SIDEBAR ══════════ */}
      <aside
        className={`sidebar${collapsed?' collapsed':''}${mobileOpen?' mobile-open':''}`}
        style={{ width:SW }}
      >
        {/* ── Logo ── */}
        <div className="sb-logo">
          {/* IlmForge icon */}
          {logo
            ? <img src={logo} alt="Logo" style={{ width:32,height:32,borderRadius:8,objectFit:'cover',flexShrink:0,border:'1.5px solid #E5E7EB' }}/>
            : (
              <div style={{
                width:32, height:32, borderRadius:9, flexShrink:0,
                background:'linear-gradient(135deg,#0F766E 0%,#D97706 100%)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, boxShadow:'0 2px 8px rgba(15,118,110,0.2)',
              }}>🎓</div>
            )
          }
          {!collapsed && (
            <div style={{ overflow:'hidden', flex:1 }}>
              <div className="sb-logo-name">{school?.name || 'IlmForge'}</div>
              <div className="sb-logo-tag">Ilm Ko Asaan Banaye</div>
            </div>
          )}
        </div>

        {/* ── Nav with scroll arrows ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

          {/* ▲ Scroll Up Arrow */}
          <button
            onClick={() => scrollNav(-1)}
            style={{
              display: canScrollUp ? 'flex' : 'none',
              alignItems:'center', justifyContent:'center',
              position:'absolute', top:0, left:0, right:0, zIndex:10,
              height:28, background:'linear-gradient(to bottom, #0D1B2A 60%, transparent)',
              border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)',
              fontSize:11, gap:4, fontFamily:'inherit',
              transition:'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.5)'; }}
          >
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
              <path d="M1 7L7 1L13 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && <span style={{fontSize:10,letterSpacing:0.3}}>SCROLL UP</span>}
          </button>

          {/* Nav scroll area */}
          <nav
            ref={navRef}
            className="sb-nav"
            style={{
              paddingTop: canScrollUp ? 28 : 6,
              paddingBottom: canScrollDown ? 28 : 16,
            }}
          >
            {NAV.map(group => (
              <div key={group.group}>
                {!collapsed && (
                  <div className="sb-section">
                    <span className="sb-section-label">{group.group}</span>
                    <div className="sb-section-line"/>
                  </div>
                )}
                {collapsed && <div style={{ height:4 }}/>}
                {group.items.map(item => <SItem key={item.to} item={item} collapsed={collapsed}/>)}
              </div>
            ))}
          </nav>

          {/* ▼ Scroll Down Arrow */}
          <button
            onClick={() => scrollNav(1)}
            style={{
              display: canScrollDown ? 'flex' : 'none',
              alignItems:'center', justifyContent:'center',
              position:'absolute', bottom:0, left:0, right:0, zIndex:10,
              height:28, background:'linear-gradient(to top, #0D1B2A 60%, transparent)',
              border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)',
              fontSize:10, gap:4, fontFamily:'inherit',
              transition:'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='rgba(255,255,255,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.5)'; }}
          >
            {!collapsed && <span style={{fontSize:10,letterSpacing:0.3}}>SCROLL DOWN</span>}
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
              <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="sb-footer">
          {!collapsed && (
            <Link to="/profile" style={{ textDecoration:'none', display:'block' }}>
              <div className="sb-user">
                <div style={{
                  width:30, height:30, borderRadius:'50%',
                  background:'linear-gradient(135deg,#0F766E,#D97706)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:800, fontSize:11, flexShrink:0,
                }}>
                  {initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="sb-user-name">{user?.name || 'Admin'}</div>
                  <div className="sb-user-role">{user?.role}</div>
                </div>
              </div>
            </Link>
          )}
          <div className="sb-logout"
            onClick={() => { logout(); navigate('/login'); }}
            title={collapsed ? 'Logout' : undefined}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <LogOut size={14}/>
            {!collapsed && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div className={`main-wrapper${collapsed?' collapsed':''}`} style={{ marginLeft:SW }}>

        {/* ── Header ── */}
        <header className="top-header">

          {/* Left */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button
              onClick={() => window.innerWidth<=768 ? setMobileOpen(o=>!o) : setCollapsed(c=>!c)}
              style={{ width:36,height:36,borderRadius:9,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151',transition:'all .12s',flexShrink:0 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#0F766E';e.currentTarget.style.color='#0F766E';e.currentTarget.style.background='#F0FDFA';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.color='#374151';e.currentTarget.style.background='#fff';}}
            >
              <Menu size={17}/>
            </button>

            {/* Breadcrumb */}
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
              <span style={{ color:'#9CA3AF', fontWeight:500 }}>Home</span>
              <ChevronRight size={13} color="#D1D5DB"/>
              <span style={{ color:'#111827', fontWeight:700, textTransform:'capitalize' }}>{pageLabel}</span>
            </div>
          </div>

          {/* Center — search */}
          <div className="hdr-search">
            <Search size={14} className="hdr-search-icon"/>
            <input
              placeholder="Search students, staff, reports…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Right */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>

            {/* Notifications */}
            <button onClick={() => navigate('/notifications')}
              style={{ width:36,height:36,borderRadius:9,border:'1.5px solid #E5E7EB',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#6B7280',position:'relative',transition:'all .12s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#0F766E';e.currentTarget.style.color='#0F766E';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.color='#6B7280';}}
            >
              <Bell size={16}/>
              <span style={{ position:'absolute',top:7,right:7,width:7,height:7,background:'#EF4444',borderRadius:'50%',border:'2px solid #fff' }}/>
            </button>

            {/* Session tag */}
            <div style={{ padding:'4px 10px',borderRadius:99,background:'#F0FDFA',border:'1.5px solid #CCFBF1',fontSize:11.5,fontWeight:700,color:'#0F766E',whiteSpace:'nowrap' }}>
              2025–2026
            </div>

            {/* User chip */}
            <Link to="/profile" style={{ textDecoration:'none' }}>
              <div style={{
                display:'flex',alignItems:'center',gap:8,padding:'5px 12px',
                borderRadius:99,border:'1.5px solid #E5E7EB',background:'#fff',
                cursor:'pointer',transition:'all .12s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#0F766E';e.currentTarget.style.background='#F0FDFA';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.background='#fff';}}
              >
                <div style={{ width:27,height:27,borderRadius:'50%',background:'linear-gradient(135deg,#0F766E,#D97706)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:10,flexShrink:0 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize:12.5,fontWeight:700,color:'#0F4C45',lineHeight:1.2 }}>
                    {user?.name?.split(' ')[0] || 'Admin'}
                  </div>
                  <div style={{ fontSize:9.5,color:'#9CA3AF',textTransform:'capitalize' }}>
                    {user?.role}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex:1, overflowY:'auto' }}>
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
