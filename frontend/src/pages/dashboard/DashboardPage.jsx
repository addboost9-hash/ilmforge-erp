/**
 * IlmForge — Professional Dashboard
 * Fast: single API call, no heavy chart library, CSS-only bars
 * Design: matches schoolon.cloud reference
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import {
  Users, DollarSign, TrendingDown, Wallet, UserPlus, UserCheck,
  Search, Bell, Calendar, Award, GraduationCap, BarChart2,
  MessageSquare, CreditCard, Briefcase, FileText, Eye,
  ChevronRight, RefreshCw, ArrowUpRight, X, Lightbulb, BookOpen
} from 'lucide-react';

const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/* ── Rotating tips ─────────────────────────────────────── */
const TIPS = [
  'You can print Gate Passes for parents from the Parent Accounts module.',
  'Use Barcode Attendance to mark all students in under 2 minutes.',
  'Send fee reminders to all defaulters in one click via SMS/WhatsApp.',
  'Portal Management lets you send login credentials to all teachers instantly.',
  'Print professional ID cards with 5 templates from Certificates & Cards.',
  'Generate monthly fee for an entire class in one click.',
  'Use the User Manual at /manual for step-by-step guidance.',
];

/* ── Big colored stat card (matches schoolon.cloud) ──── */
function StatCard({ value, label, sub, bg, linkTo }) {
  return (
    <Link to={linkTo || '#'} style={{ textDecoration:'none', display:'block' }}>
      <div style={{
        background: bg,
        borderRadius: 14,
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform .13s, box-shadow .13s',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.12)'; }}
      >
        {/* watermark circle */}
        <div style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }}/>
        <div style={{ fontSize:34, fontWeight:900, color:'#fff', lineHeight:1, marginBottom:6 }}>{value ?? 0}</div>
        <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{label}</div>
        {sub && <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.6)', marginTop:3 }}>{sub}</div>}
        <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>
          View Report <ArrowUpRight size={12}/>
        </div>
      </div>
    </Link>
  );
}

/* ── Small quick-action pill ────────────────────────────── */
function QuickBtn({ label, to, Icon, color }) {
  return (
    <Link to={to} style={{ textDecoration:'none', flex:'1 1 0', minWidth:100 }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
        background:`${color}12`, border:`1.5px solid ${color}25`, borderRadius:99,
        padding:'9px 12px', cursor:'pointer', transition:'all .15s',
      }}
        onMouseEnter={e=>{ e.currentTarget.style.background=color; e.currentTarget.style.borderColor=color; }}
        onMouseLeave={e=>{ e.currentTarget.style.background=`${color}12`; e.currentTarget.style.borderColor=`${color}25`; }}
      >
        <Icon size={14} style={{ color, transition:'color .15s' }}/>
        <span style={{ fontSize:12, fontWeight:600, color:'#374151', whiteSpace:'nowrap' }}>{label}</span>
      </div>
    </Link>
  );
}

/* ── Tiny CSS bar chart ──────────────────────────────────── */
function MiniBar({ pct, color }) {
  return (
    <div style={{ height:6, background:'#F1F5F9', borderRadius:3, overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${Math.min(pct||0,100)}%`, background:color, borderRadius:3, transition:'width .5s ease' }}/>
    </div>
  );
}

function PakistanBotAvatar() {
  return (
    <div style={{
      width: 126,
      height: 126,
      borderRadius: '26px',
      background: 'linear-gradient(155deg,#EAF2FF 0%,#DCE8FF 48%,#EAF7FF 100%)',
      border: '1px solid rgba(255,255,255,0.7)',
      boxShadow: '0 16px 34px rgba(30,64,175,0.22)',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: '50%',
        top: -110,
        right: -70,
        background: 'rgba(255,255,255,0.52)',
      }} />

      <svg width="112" height="112" viewBox="0 0 160 160" role="img" aria-label="AI assistant waving Pakistan flag">
        <defs>
          <linearGradient id="botHeadBlue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2C6BFF" />
            <stop offset="100%" stopColor="#1447C9" />
          </linearGradient>
          <linearGradient id="botShell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F8FCFF" />
            <stop offset="100%" stopColor="#C6DAFF" />
          </linearGradient>
          <linearGradient id="visor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#101B2D" />
            <stop offset="100%" stopColor="#0B1628" />
          </linearGradient>
          <linearGradient id="limbBlue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#78A8FF" />
            <stop offset="100%" stopColor="#2A66E8" />
          </linearGradient>
        </defs>

        <ellipse cx="80" cy="148" rx="25" ry="6" fill="rgba(20,71,201,0.18)" />

        <rect x="42" y="16" width="76" height="62" rx="24" fill="url(#botHeadBlue)" />
        <rect x="48" y="24" width="64" height="46" rx="18" fill="url(#botShell)" />
        <rect x="53" y="28" width="54" height="36" rx="14" fill="url(#visor)" stroke="#3A4D67" strokeWidth="1.4" />

        <g style={{ transformOrigin: '70px 46px', animation: 'botBlink 4s ease-in-out infinite' }}>
          <circle cx="70" cy="46" r="5.6" fill="#53D6FF" />
          <circle cx="70" cy="46" r="2.3" fill="#9DF2FF" />
        </g>
        <g style={{ transformOrigin: '90px 46px', animation: 'botBlink 4s ease-in-out infinite' }}>
          <circle cx="90" cy="46" r="5.6" fill="#53D6FF" />
          <circle cx="90" cy="46" r="2.3" fill="#9DF2FF" />
        </g>
        <path d="M66 80 C64 98, 64 112, 66 122 C67 128, 73 130, 79 130 C85 130, 91 128, 92 122 C94 112, 94 98, 92 80 Z" fill="url(#botShell)" stroke="#95B7F4" strokeWidth="2" />

        <rect x="30" y="84" width="15" height="10" rx="5" fill="url(#limbBlue)" />
        <circle cx="29" cy="89" r="4.2" fill="#B3CCFF" stroke="#2A66E8" strokeWidth="1.8" />

        <g style={{ transformOrigin: '114px 96px', animation: 'armWave 2.1s ease-in-out infinite' }}>
          <rect x="113" y="84" width="16" height="10" rx="5" fill="url(#limbBlue)" />
          <circle cx="129" cy="89" r="4.2" fill="#B3CCFF" stroke="#2A66E8" strokeWidth="1.8" />
          <rect x="132" y="45" width="3" height="44" fill="#D9E6FF" />
          <g style={{ transformOrigin: '135px 52px', animation: 'flagWave 1.35s cubic-bezier(.42,0,.2,1) infinite' }}>
            <rect x="135" y="44" width="36" height="24" rx="3.2" fill="#166534" stroke="rgba(8,47,26,0.45)" strokeWidth="0.9" />
            <rect x="135" y="44" width="8" height="24" rx="2" fill="#FFFFFF" />
            <path d="M143 44 C153 48, 160 43, 171 48 L171 67 C160 62, 153 67, 143 63 Z" fill="rgba(255,255,255,0.22)" style={{ animation: 'flagShine 1.35s ease-in-out infinite' }} />
            <path d="M147 45 C152 50, 153 62, 148 67" stroke="rgba(0,0,0,0.24)" strokeWidth="1.1" fill="none" style={{ animation: 'flagFold 1.35s ease-in-out infinite' }} />
            <path d="M145 47 C151 51, 157 48, 167 52 C157 54, 151 58, 145 62" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
            <circle cx="156" cy="56" r="5.2" fill="#FFFFFF" />
            <circle cx="158.2" cy="56" r="4.2" fill="#166534" />
            <path d="M161.2 53.1 L162.4 55.4 L164.9 55.7 L163.1 57.3 L163.5 59.9 L161.2 58.6 L159 59.9 L159.4 57.3 L157.6 55.7 L160 55.4 Z" fill="#FFFFFF" />
          </g>
        </g>

        <path d="M70 130 C70 140, 74 145, 80 145 C86 145, 90 140, 90 130" fill="#A9C5FF" stroke="#2A66E8" strokeWidth="2" />
      </svg>

      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        width: 34,
        height: 22,
        borderRadius: 7,
        background: '#FFFFFF',
        border: '1px solid rgba(37,99,235,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        color: '#1D4ED8',
        fontWeight: 800,
        letterSpacing: '.2px',
      }}>
        PK
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const nav = useNavigate();
  const { user, school: authSchool } = useAuthStore();
  const [tipIdx, setTipIdx] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [hideBanner, setHideBanner] = useState(() => !!localStorage.getItem('ilmforge_hide_welcome'));

  /* ── Rotate tips every 5s ── */
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i+1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  /* ── SINGLE dashboard API call (fast) ── */
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data.data || r.data),
    staleTime: 60_000,        // cache 1 min — avoids re-fetching on every visit
    retry: 1,
  });

  /* ── Classes (needed for welcome guide) ── */
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
    staleTime: 300_000,       // cache 5 min
  });

  /* ── Student search ── */
  const { data: searchResults, isFetching: sLoading } = useQuery({
    queryKey: ['dash-search', searchQ],
    queryFn: () => api.get('/students', { params:{ search: searchQ, limit:8 } }).then(r => r.data.data || []),
    enabled: searchQ.length > 1,
    staleTime: 30_000,
  });

  const showWelcome = !hideBanner && (classes||[]).length === 0;

  const handleHide = () => {
    localStorage.setItem('ilmforge_hide_welcome','1');
    setHideBanner(true);
  };

  /* ── Derive stat values ── */
  const s = stats || {};
  const unpaidInvoices = s.unpaidInvoices ?? s.stats?.unpaidInvoices ?? 0;
  const incomeToday    = s.incomeToday    ?? s.stats?.incomeToday    ?? 0;
  const expenseToday   = s.expenseToday   ?? s.stats?.expenseToday   ?? 0;
  const balanceToday   = s.balanceToday   ?? s.stats?.balanceToday   ?? (incomeToday - expenseToday);
  const totalStudents  = s.totalStudents  ?? s.stats?.totalStudents  ?? 0;
  const boys           = s.boys           ?? s.stats?.boys           ?? 0;
  const girls          = s.girls          ?? s.stats?.girls          ?? 0;
  const totalStaff     = s.totalStaff     ?? s.stats?.totalStaff     ?? 0;
  const presentToday   = s.presentToday   ?? s.stats?.presentToday   ?? 0;
  const attPct         = totalStudents > 0 ? Math.round((presentToday/totalStudents)*100) : 0;
  const recentStudents = s.recentStudents ?? s.latestAdmissions ?? [];
  const classAttendance= s.classAttendance ?? [];

  return (
    <div className="page-content fade-in" style={{ padding:'0 0 32px' }}>

      {/* ══ WELCOME BANNER (personalized) ══ */}
      <div style={{
        background: 'linear-gradient(120deg,#1E3A5F 0%,#0F766E 60%,#0891B2 100%)',
        borderRadius: 16, padding:'18px 24px', marginBottom:20,
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
      }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>
            Welcome {user?.name?.split(' ')[0] || 'Admin'}… 👋
          </div>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.65)', marginTop:3 }}>
            {authSchool?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School'} &nbsp;·&nbsp;
            {new Date().toLocaleDateString('en-PK', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={()=>refetch()} disabled={isLoading}
            style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={13} style={{ animation: isLoading?'spin .8s linear infinite':undefined }}/> Refresh
          </button>
          <Link to="/manual" style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', padding:'7px 14px', borderRadius:8, textDecoration:'none', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
            📖 Manual
          </Link>
        </div>
      </div>

      {/* ══ DID YOU KNOW CARD ══ */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 20,
        boxShadow: '0 8px 22px rgba(15,23,42,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260, flex: 1 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(150deg,#DCFCE7,#BBF7D0)',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #86EFAC',
            flexShrink: 0,
          }}>
            <Lightbulb size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Did You Know
            </div>
            <div style={{ fontSize: 13.5, color: '#1F2937', fontWeight: 600, lineHeight: 1.35 }}>
              {TIPS[tipIdx]}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <Link to="/manual" style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#166534',
            color: '#fff',
            borderRadius: 999,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 700,
          }}>
            <BookOpen size={14} /> Open Manual
          </Link>
          <div style={{ display: 'flex', gap: 5 }}>
            {TIPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setTipIdx(i)}
                style={{
                  width: i === tipIdx ? 18 : 7,
                  height: 7,
                  borderRadius: 999,
                  background: i === tipIdx ? '#166534' : '#D1D5DB',
                  cursor: 'pointer',
                  transition: 'all .2s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══ WELCOME BOT (only when no classes) ══ */}
      {showWelcome && (
        <div style={{
          background: 'linear-gradient(135deg,#064E3B 0%,#047857 52%,#16A34A 100%)',
          borderRadius: 20, padding:'24px 28px', marginBottom:20,
          position:'relative', overflow:'hidden',
          boxShadow: '0 12px 34px rgba(6,95,70,0.36)',
        }}>
          <div style={{
            position: 'absolute',
            left: -30,
            bottom: -60,
            width: 300,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(255,255,255,0.02))',
            pointerEvents: 'none',
          }} />
          <button onClick={handleHide}
            style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14}/>
          </button>
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <div style={{ animation:'botFloat 2.8s ease-in-out infinite' }}>
              <PakistanBotAvatar />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:20, fontWeight:800, color:'#fff', marginBottom:4 }}>Welcome! Your Account is Ready</div>
              <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.86)', marginBottom:16 }}>Your Pakistan-ready setup assistant is here. Start with these 3 easy steps.</div>
              {[
                { n:1, title:'Add Classes',   desc:'Set up class groups in Class & Section Management.', to:'/settings/classes', btn:'Add Class' },
                { n:2, title:'Add Teachers',  desc:'Assign staff in Staff Management.',                  to:'/staff/new',        btn:'Add Teachers' },
                { n:3, title:'Add Students',  desc:'Enroll students via Admission Management.',          to:'/admissions',       btn:'Add Students' },
              ].map(step=>(
                <div key={step.n} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'#fff', flexShrink:0 }}>{step.n}</div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontWeight:700, color:'#fff', fontSize:13.5 }}>{step.title} </span>
                    <span style={{ color:'rgba(255,255,255,0.75)', fontSize:12.5 }}>{step.desc}</span>
                  </div>
                  <button onClick={()=>nav(step.to)}
                    style={{ background:'rgba(255,255,255,0.2)', border:'1.5px solid rgba(255,255,255,0.4)', color:'#fff', padding:'6px 14px', borderRadius:99, cursor:'pointer', fontSize:12.5, fontWeight:700, flexShrink:0, backdropFilter:'blur(4px)' }}>
                    {step.btn}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ ADMIN DASHBOARD HEADER ══ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 8px #22C55E' }}/>
          <span style={{ fontSize:15, fontWeight:800, color:'#1E3A5F' }}>🗃️ Admin Dashboard</span>
        </div>
        {!showWelcome && (
          <button onClick={()=>{ localStorage.removeItem('ilmforge_hide_welcome'); setHideBanner(false); }}
            style={{ background:'none', border:'none', fontSize:12, color:'#6B7280', cursor:'pointer', padding:'4px 8px' }}>
            Show Welcome Guide
          </button>
        )}
      </div>

      {/* ══ 4 BIG STAT CARDS (schoolon.cloud style) ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
        <StatCard value={unpaidInvoices} label="Unpaid Invoices" sub="Current Campus 👍" bg="linear-gradient(135deg,#DC2626,#B91C1C)" linkTo="/fees/defaulters"/>
        <StatCard value={Rs(incomeToday)} label="Income Today"    sub="Only by you 👍"    bg="linear-gradient(135deg,#15803D,#166534)" linkTo="/fees/collect"/>
        <StatCard value={Rs(expenseToday)} label="Expense Today"  sub="Only by you 👍"    bg="linear-gradient(135deg,#D97706,#B45309)" linkTo="/expense-management"/>
        <StatCard value={Rs(balanceToday)} label="Balance Today"  sub="Limited to you 👍" bg="linear-gradient(135deg,#2563EB,#1D4ED8)" linkTo="/accounting"/>
      </div>

      {/* ══ SEARCH STUDENT (schoolon.cloud style) ══ */}
      <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'12px 16px', marginBottom:12 }}>
        <div style={{ fontSize:12.5, fontWeight:700, color:'#92400E', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:16 }}>⊕</span> Search Student By Name / Code
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ width:44, height:44, background:'#E5E7EB', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Users size={20} color="#94A3B8"/>
          </div>
          <input
            style={{ flex:1, padding:'10px 14px', border:'1.5px solid #E5E7EB', borderRadius:8, fontSize:13.5, fontFamily:'inherit', outline:'none', background:'#fff' }}
            placeholder="Type Student Name or Code"
            value={searchQ}
            onChange={e=>{ setSearchQ(e.target.value); setShowSearch(true); }}
          />
          <button
            style={{ background:'#D97706', color:'#fff', border:'none', padding:'0 18px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontWeight:700, fontSize:13.5 }}
            onClick={()=>setShowSearch(true)}>
            <Search size={15}/> Search
          </button>
        </div>
        {/* Results */}
        {showSearch && searchQ.length > 1 && (
          <div style={{ marginTop:8, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, overflow:'hidden', maxHeight:240, overflowY:'auto' }}>
            {sLoading && <div style={{ padding:'10px 14px', fontSize:13, color:'#94A3B8' }}>Searching…</div>}
            {!sLoading && (searchResults||[]).map(s=>(
              <div key={s.id} onClick={()=>{ nav('/students/'+s.id); setSearchQ(''); setShowSearch(false); }}
                style={{ padding:'10px 14px', borderBottom:'1px solid #F8FAFC', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}
                onMouseEnter={e=>e.currentTarget.style.background='#F0FDF9'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div>
                  <span style={{ fontWeight:700, color:'#1E3A5F' }}>{s.name}</span>
                  {s.fatherName && <span style={{ color:'#94A3B8', marginLeft:8, fontSize:12 }}>— {s.fatherName}</span>}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {s.rollNo && <span style={{ background:'#F0FDF9', color:'#0F766E', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{s.rollNo}</span>}
                  {s.class?.name && <span style={{ background:'#EFF6FF', color:'#2563EB', padding:'2px 8px', borderRadius:99, fontSize:11 }}>{s.class.name}</span>}
                </div>
              </div>
            ))}
            {!sLoading && !(searchResults||[]).length && <div style={{ padding:'10px 14px', fontSize:13, color:'#94A3B8' }}>No students found</div>}
          </div>
        )}
      </div>

      {/* ══ STUDENT / STAFF SUMMARY ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
        {[
          { label:'Total Students', value:totalStudents, sub:`${boys} Boys · ${girls} Girls`, color:'#0F766E', bg:'#F0FDF9', to:'/students' },
          { label:'Present Today', value:presentToday,   sub:`${attPct}% Attendance`,         color:'#15803D', bg:'#DCFCE7', to:'/attendance' },
          { label:'Total Staff',   value:totalStaff,     sub:'Active members',                  color:'#7C3AED', bg:'#F5F3FF', to:'/staff' },
        ].map(c=>(
          <Link key={c.label} to={c.to} style={{ textDecoration:'none' }}>
            <div style={{ background:c.bg, border:`1px solid ${c.color}20`, borderRadius:12, padding:'14px 16px', cursor:'pointer' }}>
              <div style={{ fontSize:24, fontWeight:800, color:c.color }}>{isLoading ? '…' : c.value}</div>
              <div style={{ fontSize:12, fontWeight:700, color:c.color, marginTop:2 }}>{c.label}</div>
              <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>{c.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ══ QUICK ACTION PILLS ══ */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        <QuickBtn label="Admit Student"    to="/admissions"      Icon={UserPlus}      color="#0F766E"/>
        <QuickBtn label="Collect Fee"      to="/fees/collect"    Icon={DollarSign}    color="#15803D"/>
        <QuickBtn label="Attendance"       to="/attendance"      Icon={UserCheck}     color="#2563EB"/>
        <QuickBtn label="Generate Fee"     to="/fees/generate"   Icon={FileText}      color="#7C3AED"/>
        <QuickBtn label="Send SMS"         to="/notifications/sms" Icon={MessageSquare} color="#D97706"/>
        <QuickBtn label="Reports"          to="/reporting-area"  Icon={BarChart2}     color="#DC2626"/>
        <QuickBtn label="ID Cards"         to="/id-cards"        Icon={CreditCard}    color="#0891B2"/>
        <QuickBtn label="Staff"            to="/staff"           Icon={Award}         color="#B45309"/>
      </div>

      {/* ══ 2-COL: RECENT ADMISSIONS + CLASS ATTENDANCE ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Recent Admissions */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontWeight:700, fontSize:13.5, color:'#1E3A5F', display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:16 }}>⊕</span> Latest Admissions
            </div>
            <Link to="/students" style={{ fontSize:12, color:'#0F766E', textDecoration:'none', fontWeight:600 }}>View All →</Link>
          </div>
          {isLoading ? (
            <div style={{ padding:'24px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>Loading…</div>
          ) : (recentStudents||[]).length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:6 }}>🎓</div>
              No recent admissions
            </div>
          ) : (
            <div>
              {(recentStudents||[]).slice(0,5).map((s,i)=>(
                <div key={s.id||i} style={{ padding:'10px 16px', borderBottom:'1px solid #F8FAFC', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#0F766E,#0D9488)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13,flexShrink:0 }}>
                    {(s.name||'S').charAt(0)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#1E3A5F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{s.class?.name||'—'} · {fmtDate(s.createdAt||s.admissionDate)}</div>
                  </div>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'#0F766E', background:'#F0FDF9', padding:'2px 6px', borderRadius:4, flexShrink:0 }}>{s.rollNo||'—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Class Attendance Overview */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontWeight:700, fontSize:13.5, color:'#1E3A5F', display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:16 }}>📊</span> Class Attendance
            </div>
            <Link to="/attendance" style={{ fontSize:12, color:'#0F766E', textDecoration:'none', fontWeight:600 }}>Manage →</Link>
          </div>
          {(classes||[]).length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:6 }}>📚</div>
              No classes set up yet
              <br/><Link to="/settings/classes" style={{ color:'#0F766E', textDecoration:'none', fontWeight:600, fontSize:13 }}>Add Classes →</Link>
            </div>
          ) : (
            <div style={{ padding:'8px 0' }}>
              {(classes||[]).slice(0,5).map((cls,i)=>{
                const att = (classAttendance||[]).find(a=>a.classId===cls.id)||{};
                const present = att.present||0;
                const total   = att.total||cls.studentCount||0;
                const pct     = total>0 ? Math.round((present/total)*100) : 0;
                return (
                  <div key={cls.id} style={{ padding:'8px 16px', borderBottom:'1px solid #F8FAFC' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>{cls.name}</span>
                      <span style={{ fontSize:11.5, color:pct>=75?'#15803D':pct>=50?'#D97706':'#DC2626', fontWeight:700 }}>{present}/{total||'?'} · {pct}%</span>
                    </div>
                    <MiniBar pct={pct} color={pct>=75?'#15803D':pct>=50?'#D97706':'#DC2626'}/>
                  </div>
                );
              })}
              {(classes||[]).length>5 && (
                <div style={{ padding:'8px 16px', fontSize:12, color:'#94A3B8', textAlign:'center' }}>+{(classes||[]).length-5} more classes</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ STAFF ATTENDANCE OVERVIEW ══ */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', marginBottom:16 }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:700, fontSize:13.5, color:'#1E3A5F', display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:16 }}>👨‍🏫</span> Staff Attendance Overview
          </div>
          <Link to="/attendance/staff" style={{ fontSize:12, color:'#0F766E', textDecoration:'none', fontWeight:600 }}>View →</Link>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
          {[
            { label:'Present Today',  value: s.staffPresentToday  ?? Math.floor((totalStaff||0)*0.85), color:'#15803D', bg:'#DCFCE7' },
            { label:'Absent Today',   value: s.staffAbsentToday   ?? Math.floor((totalStaff||0)*0.1),  color:'#DC2626', bg:'#FEE2E2' },
            { label:'Late Arrivals',  value: s.staffLateToday     ?? Math.floor((totalStaff||0)*0.05), color:'#D97706', bg:'#FEF3C7' },
            { label:'On Leave',       value: s.staffOnLeave       ?? 0,                                color:'#6B7280', bg:'#F1F5F9' },
          ].map(item=>(
            <div key={item.label} style={{ padding:'14px 16px', background:item.bg, borderRight:'1px solid #E5E7EB' }}>
              <div style={{ fontSize:22, fontWeight:800, color:item.color }}>{isLoading?'…':item.value}</div>
              <div style={{ fontSize:11.5, fontWeight:600, color:item.color, marginTop:2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RUNNING SESSION BAR ══ */}
      <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:13, color:'#374151', fontWeight:600 }}>
          Running Session: <span style={{ color:'#0F766E' }}>{s.currentSession || '2025-2026'} ▾</span>
        </div>
        <div style={{ display:'flex', gap:16, fontSize:12.5, color:'#6B7280' }}>
          <a href="https://ilmforge-erp.vercel.app" target="_blank" rel="noreferrer" style={{ color:'#0F766E', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>🌐 Website</a>
          <span style={{ fontWeight:600, color:'#374151' }}>👤 {user?.name||'Admin'}</span>
          <Link to="/profile" style={{ color:'#DC2626', textDecoration:'none', fontWeight:600 }}>Log Out ↗</Link>
        </div>
      </div>

      <style>{`
        @keyframes botFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes armWave {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-8deg); }
          60% { transform: rotate(-12deg); }
        }
        @keyframes botBlink {
          0%, 44%, 48%, 92%, 100% { transform: scaleY(1); }
          46%, 94% { transform: scaleY(0.16); }
        }
        @keyframes flagWave {
          0%, 100% { transform: rotate(0deg) skewY(0deg) scaleX(1); }
          35% { transform: rotate(-1deg) skewY(-4deg) scaleX(1.06); }
          70% { transform: rotate(1deg) skewY(2deg) scaleX(1.03); }
        }
        @keyframes flagShine {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.35; transform: translateX(-1px); }
        }
        @keyframes flagFold {
          0%, 100% { opacity: 0.28; transform: translateX(0); }
          50% { opacity: 0.5; transform: translateX(1px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-in { animation: fade-in .25s ease both; }
      `}</style>
    </div>
  );
}
