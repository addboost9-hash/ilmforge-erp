/**
 * IlmForge — Parent Portal  (Enterprise Theme)
 * Top header: dark navy #1B2F6E, stat-card classes, tab-btn/active pattern
 * Mobile-first max-width 800px layout
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';
import {
  DollarSign, BookOpen, CreditCard, ChevronRight,
  Award, FileText, ChevronLeft, Send, Bell, AlertCircle,
  CheckCircle, Clock, MessageSquare, Calendar, LogOut,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────── */
const Rs       = v  => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtDate  = d  => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtShort = d  => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short' }) : '—';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const statusBadge = s => {
  const m = {
    paid:    { bg:'#DCFCE7', c:'#15803D' },
    unpaid:  { bg:'#FEE2E2', c:'#B91C1C' },
    partial: { bg:'#FEF3C7', c:'#B45309' },
  };
  return m[s] || m.unpaid;
};

const SUBJECT_COLORS = [
  '#0F766E','#2563EB','#7C3AED','#B45309','#BE185D',
  '#0369A1','#4D7C0F','#9D174D','#1D4ED8','#065F46',
];
const subjectColor = name =>
  SUBJECT_COLORS[(name||'').charCodeAt(0) % SUBJECT_COLORS.length];

const gradeLabel = pct => {
  if (pct >= 90) return { g:'A+', c:'#15803D' };
  if (pct >= 80) return { g:'A',  c:'#0D9488' };
  if (pct >= 70) return { g:'B',  c:'#2563EB' };
  if (pct >= 60) return { g:'C',  c:'#D97706' };
  if (pct >= 50) return { g:'D',  c:'#EA580C' };
  return { g:'F', c:'#DC2626' };
};

const complaintStatusStyle = s => ({
  open:        { bg:'#FEF3C7', c:'#B45309',  label:'Open'        },
  in_progress: { bg:'#DBEAFE', c:'#1D4ED8',  label:'In Progress' },
  resolved:    { bg:'#DCFCE7', c:'#15803D',  label:'Resolved'    },
}[s] || { bg:'#F3F4F6', c:'#6B7280', label: s });

/* ── Enterprise theme tokens ──────────────────────────────── */
const NAVY    = '#1B2F6E';
const CYAN    = '#00c0ef';
const ACCENT  = '#0D9488';

/* Stat card presets — AdminLTE-style solid colorful cards */
const STAT_PRESETS = {
  red:    { color:'#fff', bg:'#dd4b39' },
  green:  { color:'#fff', bg:'#00a65a' },
  blue:   { color:'#fff', bg:'#0073b7' },
  yellow: { color:'#fff', bg:'#f39c12' },
  purple: { color:'#fff', bg:'#605ca8' },
  orange: { color:'#fff', bg:'#f56954' },
  teal:   { color:'#fff', bg:'#0097A7' },
};

/* ── Tab strip definition ─────────────────────────────────── */
const TABS = [
  { id:'overview',      label:'Overview',      emoji:'📊' },
  { id:'fees',          label:'Fees',          emoji:'💰' },
  { id:'attend',        label:'Attendance',    emoji:'✅' },
  { id:'results',       label:'Results',       emoji:'🏆' },
  { id:'homework',      label:'Homework',      emoji:'📚' },
  { id:'complaints',    label:'Complaints',    emoji:'📝' },
  { id:'announcements', label:'Announcements', emoji:'📢' },
];

/* ── Inline styles (shared) ────────────────────────────────── */
const cardStyle = {
  background:'#fff',
  borderRadius:14,
  border:'1px solid #E5E7EB',
  overflow:'hidden',
  marginBottom:14,
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function ParentPortalPage() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();

  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab,     setActiveTab]     = useState('overview');

  const now = new Date();
  const [attendMonth, setAttendMonth] = useState(now.getMonth());
  const [attendYear,  setAttendYear]  = useState(now.getFullYear());

  const [cSubject, setCSubject] = useState('');
  const [cDesc,    setCDesc]    = useState('');

  /* ── Load parent's children ── */
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn:  () => api.get('/students', { params:{ limit:20 } }).then(r => r.data.data || []),
    staleTime: 60_000,
  });

  const child = selectedChild || children[0] || null;

  /* ── Fee data ── */
  const { data: feeData } = useQuery({
    queryKey: ['parent-fees', child?.id],
    queryFn:  () => api.get('/fees/student/' + child.id).then(r => r.data.data),
    enabled:  !!child,
    staleTime: 60_000,
  });

  const invoices    = feeData?.invoices || [];
  const unpaidCount = invoices.filter(i => i.status !== 'paid').length;
  const totalDue    = invoices.filter(i => i.status !== 'paid').reduce((s,i) => s + (i.dueAmount||0), 0);

  /* ── Attendance summary ── */
  const { data: attendSummaryData, isLoading: attendSummaryLoading } = useQuery({
    queryKey: ['parent-attendance-summary', child?.id, attendMonth, attendYear],
    queryFn:  () =>
      api.get('/attendance/summary', {
        params: { classId: child.classId, month: attendMonth + 1, year: attendYear },
      }).then(r => r.data.data || r.data),
    enabled:  !!child?.classId && activeTab === 'attend',
    staleTime: 30_000,
  });

  const myAttendance = useMemo(() => {
    if (!attendSummaryData) return null;
    const list = Array.isArray(attendSummaryData)
      ? attendSummaryData
      : (attendSummaryData.students || attendSummaryData.records || []);
    return list.find(r => r.studentId === child?.id || r.student?.id === child?.id) || null;
  }, [attendSummaryData, child]);

  const STATUS_MAP_PARENT = { present: 'P', absent: 'A', leave: 'L', late: 'Lt' };
  const { data: attendHistoryData = [], isLoading: attendHistoryLoading } = useQuery({
    queryKey: ['parent-attendance-history', child?.id, attendMonth, attendYear],
    queryFn:  () =>
      api.get(`/attendance/student/${child.id}/history`).then(r => {
        const raw = r.data.records || r.data.data || [];
        return raw.map(rec => ({
          ...rec,
          status: STATUS_MAP_PARENT[rec.status] || rec.status,
        }));
      }),
    enabled:  !!child?.id && activeTab === 'attend',
    staleTime: 30_000,
  });

  const attendLoading = attendSummaryLoading || attendHistoryLoading;

  const dayMap = useMemo(() => {
    const m = {};
    const monthPrefix = `${attendYear}-${String(attendMonth + 1).padStart(2, '0')}`;
    attendHistoryData.forEach(r => {
      const key = r.date?.slice(0, 10);
      if (key && key.startsWith(monthPrefix)) m[key] = r.status;
    });
    return m;
  }, [attendHistoryData, attendMonth, attendYear]);

  /* ── Exams / Results ── */
  const { data: examsRaw = [], isLoading: examsLoading } = useQuery({
    queryKey: ['parent-exams', child?.classId],
    queryFn:  () =>
      api.get('/exams', { params:{ classId: child.classId } }).then(r => r.data.data || []),
    enabled:  !!child?.classId && activeTab === 'results',
    staleTime: 60_000,
  });

  const publishedExams = examsRaw.filter(e => e.isPublished);

  const { data: allExamsForOverview = [] } = useQuery({
    queryKey: ['parent-exams-overview', child?.classId],
    queryFn:  () =>
      api.get('/exams', { params:{ classId: child.classId } }).then(r => r.data.data || []),
    enabled:  !!child?.classId && activeTab === 'overview',
    staleTime: 60_000,
  });
  const upcomingExams = allExamsForOverview.filter(e => !e.isPublished);

  /* ── Homework ── */
  const { data: hwRaw = [], isLoading: hwLoading } = useQuery({
    queryKey: ['parent-homework', child?.classId],
    queryFn:  () =>
      api.get('/homework', { params:{ classId: child.classId, limit:30 } }).then(r => r.data.data || []),
    enabled:  !!child?.classId && (activeTab === 'homework' || activeTab === 'overview'),
    staleTime: 60_000,
  });

  const hwGrouped = useMemo(() => {
    const g = {};
    [...hwRaw].sort((a,b) => new Date(b.date||b.createdAt) - new Date(a.date||a.createdAt)).forEach(h => {
      const key = (h.date||h.createdAt||'').slice(0,10);
      if (!g[key]) g[key] = [];
      g[key].push(h);
    });
    return g;
  }, [hwRaw]);

  /* ── Complaints ── */
  const { data: complaintsRaw = [], isLoading: compLoading } = useQuery({
    queryKey: ['parent-complaints', user?.id],
    queryFn:  () =>
      api.get('/complaints', { params:{ parentId: user?.id } }).then(r => r.data.data || []),
    enabled:  !!user?.id && activeTab === 'complaints',
    staleTime: 30_000,
  });

  const submitComplaint = useMutation({
    mutationFn: () =>
      api.post('/complaints', { subject: cSubject, description: cDesc, parentId: user?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-complaints'] });
      setCSubject(''); setCDesc('');
    },
  });

  /* ── Announcements ── */
  const { data: announcements = [], isLoading: annLoading } = useQuery({
    queryKey: ['parent-announcements'],
    queryFn:  () =>
      api.get('/announcements', { params:{ role:'parent', limit:20 } }).then(r => r.data.data || []),
    enabled:  activeTab === 'announcements',
    staleTime: 120_000,
  });

  const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const logo       = localStorage.getItem('schoolLogoPreview');

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight:'100vh', background:'#F0F4F8', fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* Messenger FAB */}
      <a href="/chat"
        style={{
          position:'fixed', bottom:22, right:22, zIndex:60,
          width:52, height:52, borderRadius:'50%',
          background:CYAN, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 10px 26px ${CYAN}55`,
          textDecoration:'none', fontSize:22,
        }}
        title="Messages">💬</a>

      {/* ── Top Header (dark navy) ── */}
      <div style={{ background:NAVY, padding:'12px 20px', display:'flex', alignItems:'center', gap:14 }}>
        {logo
          ? <img src={logo} alt="" style={{ width:40, height:40, borderRadius:9, objectFit:'cover', flexShrink:0 }}/>
          : <div style={{ width:40, height:40, borderRadius:9, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎓</div>
        }
        <div style={{ flex:1 }}>
          <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{schoolName}</div>
          <div style={{ color:'rgba(255,255,255,0.55)', fontSize:11.5 }}>Parent Portal — Welcome, {user?.name || 'Parent'}</div>
        </div>
        {totalDue > 0 && (
          <div style={{ background:'rgba(220,38,38,0.25)', border:'1px solid rgba(220,38,38,0.4)', borderRadius:8, padding:'5px 12px', color:'#FCA5A5', fontSize:12.5, fontWeight:700 }}>
            Due: {Rs(totalDue)}
          </div>
        )}
        <button onClick={logout}
          style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:8, padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          <LogOut size={13}/> Logout
        </button>
      </div>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'20px 16px' }}>

        {/* ── Loading / no-children states ── */}
        {isLoading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#6B7280' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>Loading your children's data…
          </div>
        ) : children.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:16, padding:'40px 24px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>👨‍👩‍👦</div>
            <div style={{ fontWeight:700, fontSize:18, color:NAVY, marginBottom:8 }}>No Children Found</div>
            <p style={{ color:'#6B7280', fontSize:14, lineHeight:1.6 }}>
              Your children don't appear to be enrolled yet, or your phone number doesn't
              match the emergency contact in the admission form.<br/><br/>
              Please contact the school admin to link your account.
            </p>
          </div>
        ) : (
          <>
            {/* ── Child Selector ── */}
            {children.length > 1 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:'#6B7280', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Select a Child</div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {children.map(c => (
                    <button key={c.id}
                      onClick={() => { setSelectedChild(c); setActiveTab('overview'); }}
                      style={{
                        padding:'8px 16px', borderRadius:99, border:'2px solid', fontFamily:'inherit',
                        borderColor: (selectedChild||children[0])?.id===c.id ? CYAN : '#E5E7EB',
                        background:  (selectedChild||children[0])?.id===c.id ? `${CYAN}18` : '#fff',
                        color:       (selectedChild||children[0])?.id===c.id ? NAVY : '#374151',
                        cursor:'pointer', fontWeight:600, fontSize:13,
                        display:'flex', alignItems:'center', gap:8,
                      }}>
                      <div style={{
                        width:26, height:26, borderRadius:'50%',
                        background: c.gender==='female'
                          ? 'linear-gradient(135deg,#F472B6,#EC4899)'
                          : `linear-gradient(135deg,${NAVY},#2563EB)`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'#fff', fontWeight:700, fontSize:11,
                      }}>
                        {c.name?.charAt(0)}
                      </div>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Student Profile Card ── */}
            {child && (
              <div style={{ background:`linear-gradient(135deg,${NAVY},#243e8f)`, borderRadius:16, padding:'20px 24px', marginBottom:16, color:'#fff' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, border:'3px solid rgba(255,255,255,0.3)', flexShrink:0 }}>
                    {child.name?.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:18, fontWeight:800 }}>{child.name}</div>
                    <div style={{ fontSize:12.5, opacity:0.75, marginTop:3 }}>
                      Roll No: <strong>{child.rollNo||'—'}</strong>&nbsp;·&nbsp;
                      Class: <strong>{child.class?.name||'—'}</strong>&nbsp;·&nbsp;
                      Section: <strong>{child.section?.name||'—'}</strong>
                    </div>
                    {child.fatherName && (
                      <div style={{ fontSize:12, opacity:0.6, marginTop:2 }}>Father: {child.fatherName}</div>
                    )}
                  </div>
                  {unpaidCount > 0 && (
                    <div style={{ background:'rgba(220,38,38,0.3)', borderRadius:10, padding:'8px 14px', textAlign:'center', flexShrink:0 }}>
                      <div style={{ fontSize:20, fontWeight:900, color:'#FCA5A5' }}>{unpaidCount}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>Unpaid</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab Strip ── */}
            <div style={{ overflowX:'auto', marginBottom:16, WebkitOverflowScrolling:'touch' }}>
              <div style={{ display:'flex', gap:0, background:'#fff', borderRadius:12, padding:4, border:'1px solid #E5E7EB', minWidth:'max-content' }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`tab-btn${activeTab===t.id ? ' active' : ''}`}
                    style={{
                      padding:'8px 14px', border:'none', borderRadius:9,
                      cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:12.5,
                      background: activeTab===t.id ? NAVY : 'transparent',
                      color:      activeTab===t.id ? '#fff' : '#6B7280',
                      transition:'all .13s', whiteSpace:'nowrap',
                    }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ════════════════════════════════
                TAB: OVERVIEW
            ════════════════════════════════ */}
            {activeTab==='overview' && child && (
              <div>
                {/* Stat cards — stat-red / stat-green / stat-blue / stat-purple */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
                  {[
                    { label:'Due Amount',    value: Rs(totalDue),                                 preset:'red',    Icon:DollarSign },
                    { label:'Paid Invoices', value: invoices.filter(i=>i.status==='paid').length, preset:'green',  Icon:CreditCard  },
                    { label:'Class',         value: child.class?.name||'—',                       preset:'blue',   Icon:BookOpen    },
                    { label:'Roll No',       value: child.rollNo||'—',                            preset:'purple', Icon:Award       },
                  ].map(({ label, value, preset, Icon }) => {
                    const p = STAT_PRESETS[preset];
                    return (
                      <div key={label} className={`stat-card stat-${preset}`} style={{ background:p.bg, borderRadius:12, padding:'14px 16px', border:'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <Icon size={16} color={p.color}/>
                          <span style={{ fontSize:11.5, fontWeight:600, color:p.color, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</span>
                        </div>
                        <div style={{ fontSize:20, fontWeight:800, color:p.color }}>{value}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Upcoming exams */}
                {upcomingExams.length > 0 && (
                  <div className="card" style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:12, marginBottom:16 }}>
                    <div className="card-header" style={{ padding:'14px 18px 0' }}>
                      <div style={{ fontWeight:700, fontSize:13.5, color:'#C2410C', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                        <Calendar size={15}/> Upcoming Exams
                      </div>
                    </div>
                    <div className="card-body" style={{ padding:'0 18px 14px' }}>
                      {upcomingExams.slice(0,3).map(e => (
                        <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #FED7AA' }}>
                          <span style={{ fontSize:13, color:'#1C1917', fontWeight:600 }}>{e.title||e.name}</span>
                          <span style={{ fontSize:12, color:'#EA580C' }}>{fmtDate(e.date||e.startDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent homework */}
                {hwRaw.length > 0 && (
                  <div className="card" style={{ background:'#F0FDF9', border:'1px solid #99F6E4', borderRadius:12, marginBottom:16 }}>
                    <div className="card-header" style={{ padding:'14px 18px 0' }}>
                      <div style={{ fontWeight:700, fontSize:13.5, color:'#0F766E', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                        <BookOpen size={15}/> Recent Homework
                      </div>
                    </div>
                    <div className="card-body" style={{ padding:'0 18px 14px' }}>
                      {hwRaw.slice(0,3).map(h => {
                        const subj = h.subject?.name || h.subjectName || 'General';
                        const sc   = subjectColor(subj);
                        return (
                          <div key={h.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'7px 0', borderBottom:'1px solid #CCFBF1' }}>
                            <span style={{ background:sc+'22', color:sc, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, flexShrink:0, marginTop:2 }}>{subj}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12.5, color:NAVY, fontWeight:600 }}>{h.description||h.title||'—'}</div>
                              <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{fmtShort(h.date||h.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={() => setActiveTab('homework')}
                        style={{ marginTop:10, background:'none', border:'none', color:'#0F766E', fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
                        View all homework →
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick links */}
                <div className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden' }}>
                  {[
                    { label:'View Fee Vouchers',    onClick:()=>setActiveTab('fees'),          icon:'💰', desc:'See all invoices and due amounts'        },
                    { label:'Attendance Report',     onClick:()=>setActiveTab('attend'),        icon:'✅', desc:'Check daily attendance record'           },
                    { label:'Exam Results',          onClick:()=>setActiveTab('results'),       icon:'🏆', desc:'Published results and grade cards'       },
                    { label:'Homework',              onClick:()=>setActiveTab('homework'),      icon:'📚', desc:'Assigned homework and tasks'             },
                    { label:'Announcements',         onClick:()=>setActiveTab('announcements'), icon:'📢', desc:'Latest school announcements'             },
                    { label:'Download Fee Voucher',  onClick:()=>window.open('/fee-voucher','_blank'), icon:'📄', desc:'Enter roll number to download voucher' },
                  ].map((item, i, arr) => (
                    <div key={i} onClick={item.onClick}
                      style={{ padding:'14px 18px', borderBottom: i<arr.length-1 ? '1px solid #F1F5F9' : 'none', display:'flex', alignItems:'center', gap:12, cursor:'pointer', background:'#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background='#EFF6FF'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      <span style={{ fontSize:22 }}>{item.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13.5, color:NAVY }}>{item.label}</div>
                        <div style={{ fontSize:12, color:'#6B7280' }}>{item.desc}</div>
                      </div>
                      <ChevronRight size={15} color="#94A3B8"/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ════════════════════════════════
                TAB: FEES
            ════════════════════════════════ */}
            {activeTab==='fees' && (
              <div>
                {invoices.length===0 ? (
                  <div className="card" style={{ background:'#fff', borderRadius:12, padding:'36px', textAlign:'center', color:'#94A3B8', border:'1px solid #E5E7EB' }}>
                    <FileText size={36} style={{ opacity:0.3, marginBottom:8 }}/>
                    <div>No fee invoices found</div>
                  </div>
                ) : (
                  <div className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden' }}>
                    {/* Gray table header */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', padding:'10px 18px', background:'#F3F4F6', borderBottom:'1px solid #E5E7EB' }}>
                      <span style={{ fontSize:11.5, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.04em' }}>Invoice</span>
                      <span style={{ fontSize:11.5, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.04em', textAlign:'right', paddingRight:16 }}>Amount</span>
                      <span style={{ fontSize:11.5, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.04em', textAlign:'right', minWidth:70 }}>Status</span>
                    </div>
                    {invoices.map((inv, i) => {
                      const bd = statusBadge(inv.status);
                      return (
                        <div key={inv.id} style={{ padding:'14px 18px', borderBottom: i<invoices.length-1 ? '1px solid #F8FAFC' : 'none', display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:42, height:42, borderRadius:10, background:bd.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <DollarSign size={18} color={bd.c}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:13.5, color:NAVY }}>{inv.feeTitle||'Monthly Fee'}</div>
                            <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
                              {inv.month&&inv.year ? `${inv.month}/${inv.year}` : fmtDate(inv.createdAt)}
                              &nbsp;·&nbsp;Total: {Rs(inv.totalAmount)}
                              {inv.dueAmount > 0 && <span style={{ color:'#DC2626', fontWeight:700 }}> · Due: {Rs(inv.dueAmount)}</span>}
                            </div>
                          </div>
                          <span style={{ background:bd.bg, color:bd.c, padding:'4px 10px', borderRadius:99, fontSize:11.5, fontWeight:700, textTransform:'capitalize', flexShrink:0 }}>
                            {inv.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop:14, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'12px 16px' }}>
                  <p style={{ margin:0, color:'#1D4ED8', fontSize:12.5, lineHeight:1.6 }}>
                    ℹ️ To pay fees, visit the school office or contact them on WhatsApp.<br/>
                    Download a printable voucher:&nbsp;
                    <a href="/fee-voucher" target="_blank" rel="noreferrer" style={{ color:NAVY, fontWeight:700 }}>Click Here →</a>
                  </p>
                </div>
              </div>
            )}

            {/* ════════════════════════════════
                TAB: ATTENDANCE
            ════════════════════════════════ */}
            {activeTab==='attend' && child && (
              <AttendanceTab
                attendLoading={attendLoading}
                myAttendance={myAttendance}
                dayMap={dayMap}
                attendMonth={attendMonth}
                attendYear={attendYear}
                onPrevMonth={() => {
                  if (attendMonth === 0) { setAttendMonth(11); setAttendYear(y => y-1); }
                  else setAttendMonth(m => m-1);
                }}
                onNextMonth={() => {
                  if (attendMonth === 11) { setAttendMonth(0); setAttendYear(y => y+1); }
                  else setAttendMonth(m => m+1);
                }}
              />
            )}

            {/* ════════════════════════════════
                TAB: RESULTS
            ════════════════════════════════ */}
            {activeTab==='results' && child && (
              <div>
                {examsLoading ? (
                  <LoadingCard msg="Loading results…"/>
                ) : publishedExams.length === 0 ? (
                  <EmptyCard icon="🏆" title="Results Not Announced Yet"
                    desc="Published exam results will appear here once the school releases them." />
                ) : (
                  publishedExams.map(exam => <ExamCard key={exam.id} exam={exam} studentId={child.id}/>)
                )}
              </div>
            )}

            {/* ════════════════════════════════
                TAB: HOMEWORK
            ════════════════════════════════ */}
            {activeTab==='homework' && child && (
              <div>
                {hwLoading ? (
                  <LoadingCard msg="Loading homework…"/>
                ) : hwRaw.length === 0 ? (
                  <EmptyCard icon="📚" title="No Homework Yet" desc="Assigned homework will appear here."/>
                ) : (
                  Object.entries(hwGrouped).map(([dateKey, items]) => (
                    <div key={dateKey} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', marginBottom:8, letterSpacing:.5 }}>
                        {fmtDate(dateKey)}
                      </div>
                      <div className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden' }}>
                        {items.map((h, i) => {
                          const subj = h.subject?.name || h.subjectName || 'General';
                          const sc   = subjectColor(subj);
                          const teacher = h.teacher?.name || h.postedBy || h.createdBy || '—';
                          return (
                            <div key={h.id} style={{ padding:'14px 18px', borderBottom: i<items.length-1 ? '1px solid #F1F5F9' : 'none', display:'flex', alignItems:'flex-start', gap:12 }}>
                              <span style={{ background:sc+'18', color:sc, fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:99, flexShrink:0, marginTop:3 }}>
                                {subj}
                              </span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13.5, fontWeight:600, color:NAVY, lineHeight:1.5 }}>
                                  {h.description || h.title || '—'}
                                </div>
                                <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:4 }}>
                                  Posted by {teacher}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ════════════════════════════════
                TAB: COMPLAINTS
            ════════════════════════════════ */}
            {activeTab==='complaints' && (
              <div>
                <div className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'18px 20px', marginBottom:16 }}>
                  <div className="card-header" style={{ fontWeight:700, fontSize:14, color:NAVY, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <MessageSquare size={16}/> Submit a Complaint
                  </div>
                  <div className="card-body">
                    <input
                      placeholder="Subject (e.g. Bullying, Transport issue…)"
                      value={cSubject}
                      onChange={e => setCSubject(e.target.value)}
                      style={{ width:'100%', border:`1.5px solid #E5E7EB`, borderRadius:9, padding:'10px 14px', fontSize:13.5, fontFamily:'inherit', marginBottom:10, boxSizing:'border-box', outline:'none' }}
                      onFocus={e => e.target.style.borderColor=NAVY}
                      onBlur={e => e.target.style.borderColor='#E5E7EB'}
                    />
                    <textarea
                      placeholder="Describe the issue in detail…"
                      value={cDesc}
                      onChange={e => setCDesc(e.target.value)}
                      rows={4}
                      style={{ width:'100%', border:'1.5px solid #E5E7EB', borderRadius:9, padding:'10px 14px', fontSize:13.5, fontFamily:'inherit', resize:'vertical', marginBottom:12, boxSizing:'border-box', outline:'none' }}
                      onFocus={e => e.target.style.borderColor=NAVY}
                      onBlur={e => e.target.style.borderColor='#E5E7EB'}
                    />
                    <button
                      onClick={() => { if (cSubject && cDesc) submitComplaint.mutate(); }}
                      disabled={!cSubject || !cDesc || submitComplaint.isPending}
                      style={{
                        background: (!cSubject || !cDesc) ? '#94A3B8' : NAVY,
                        color:'#fff', border:'none', borderRadius:9,
                        padding:'10px 20px', fontFamily:'inherit', fontWeight:700,
                        fontSize:13.5, cursor: (!cSubject||!cDesc) ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', gap:8,
                      }}>
                      <Send size={15}/>
                      {submitComplaint.isPending ? 'Submitting…' : 'Submit Complaint'}
                    </button>
                    {submitComplaint.isSuccess && (
                      <div style={{ marginTop:10, color:'#15803D', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                        <CheckCircle size={14}/> Complaint submitted successfully.
                      </div>
                    )}
                    {submitComplaint.isError && (
                      <div style={{ marginTop:10, color:'#DC2626', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                        <AlertCircle size={14}/> Failed to submit. Please try again.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize:12.5, fontWeight:700, color:'#6B7280', marginBottom:8, letterSpacing:.5, textTransform:'uppercase' }}>Your Complaints</div>
                {compLoading ? (
                  <LoadingCard msg="Loading complaints…"/>
                ) : complaintsRaw.length === 0 ? (
                  <EmptyCard icon="📝" title="No Complaints" desc="You haven't submitted any complaints yet."/>
                ) : (
                  <div className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden' }}>
                    {complaintsRaw.map((c, i) => {
                      const st = complaintStatusStyle(c.status);
                      return (
                        <div key={c.id} style={{ padding:'14px 18px', borderBottom: i<complaintsRaw.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:13.5, color:NAVY }}>{c.subject||'—'}</div>
                              <div style={{ fontSize:12.5, color:'#4B5563', marginTop:4, lineHeight:1.5 }}>{c.description||c.message||'—'}</div>
                              <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:6 }}>{fmtDate(c.createdAt)}</div>
                            </div>
                            <span style={{ background:st.bg, color:st.c, padding:'4px 10px', borderRadius:99, fontSize:11.5, fontWeight:700, flexShrink:0 }}>
                              {st.label}
                            </span>
                          </div>
                          {c.adminReply && (
                            <div style={{ marginTop:10, background:`${NAVY}0D`, border:`1px solid ${NAVY}25`, borderRadius:8, padding:'10px 14px', fontSize:12.5, color:NAVY }}>
                              <strong>Admin Reply:</strong> {c.adminReply}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════
                TAB: ANNOUNCEMENTS
            ════════════════════════════════ */}
            {activeTab==='announcements' && (
              <div>
                {annLoading ? (
                  <LoadingCard msg="Loading announcements…"/>
                ) : announcements.length === 0 ? (
                  <EmptyCard icon="📢" title="No Announcements" desc="School announcements will appear here."/>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {announcements.map(a => (
                      <div key={a.id} className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'16px 18px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:12, flex:1 }}>
                            <div style={{ width:38, height:38, borderRadius:10, background:`${NAVY}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <Bell size={18} color={NAVY}/>
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:14, color:NAVY, lineHeight:1.4 }}>{a.title||'Announcement'}</div>
                              <div style={{ fontSize:13, color:'#4B5563', marginTop:6, lineHeight:1.6 }}>{a.message||a.content||a.body||'—'}</div>
                              <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:8 }}>{fmtDate(a.createdAt||a.date)}</div>
                            </div>
                          </div>
                          {!a.isRead && (
                            <span style={{ background:`${CYAN}22`, color:CYAN, fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:99, flexShrink:0, border:`1px solid ${CYAN}44` }}>
                              NEW
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:24, padding:'16px', color:'#94A3B8', fontSize:12 }}>
          {schoolName} · Powered by IlmForge · Ilm Ko Asaan Banaye
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════════════════════ */

function LoadingCard({ msg }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'36px', textAlign:'center', color:'#6B7280' }}>
      <div style={{ fontSize:28, marginBottom:8 }}>⏳</div>
      <div style={{ fontSize:13 }}>{msg}</div>
    </div>
  );
}

function EmptyCard({ icon, title, desc }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'36px 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:10 }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize:15, color:'#1B2F6E', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6 }}>{desc}</div>
    </div>
  );
}

/* ── Attendance Tab ─────────────────────────────────────── */
const ATT_COLORS = {
  P:  { bg:'#DCFCE7', c:'#15803D', label:'P' },
  A:  { bg:'#FEE2E2', c:'#DC2626', label:'A' },
  L:  { bg:'#FEF3C7', c:'#B45309', label:'L' },
  Lt: { bg:'#DBEAFE', c:'#1D4ED8', label:'Lt' },
};

function AttendanceTab({ attendLoading, myAttendance, dayMap, attendMonth, attendYear, onPrevMonth, onNextMonth }) {
  const firstDay = new Date(attendYear, attendMonth, 1).getDay();
  const daysInMonth = new Date(attendYear, attendMonth + 1, 0).getDate();

  const summary = useMemo(() => {
    const s = { P:0, A:0, L:0, Lt:0 };
    Object.values(dayMap).forEach(v => { if (s[v] !== undefined) s[v]++; });
    const total = s.P + s.A + s.L + s.Lt;
    const pct   = total > 0 ? Math.round((s.P / total) * 100) : null;
    return { ...s, total, pct };
  }, [dayMap]);

  return (
    <div>
      <div className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'16px 20px', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <button onClick={onPrevMonth} style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={18} color="#374151"/>
          </button>
          <div style={{ fontWeight:700, fontSize:15, color:'#1B2F6E' }}>{MONTHS[attendMonth]} {attendYear}</div>
          <button onClick={onNextMonth} style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronRight size={18} color="#374151"/>
          </button>
        </div>

        {attendLoading ? (
          <div style={{ textAlign:'center', padding:'24px', color:'#6B7280', fontSize:13 }}>⏳ Loading…</div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'#6B7280', paddingBottom:4 }}>{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={'e'+i}/>)}
              {Array.from({ length: daysInMonth }, (_, i) => i+1).map(day => {
                const dateKey = `${attendYear}-${String(attendMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const status  = dayMap[dateKey];
                const style   = status ? ATT_COLORS[status] : null;
                const isToday = new Date().toISOString().slice(0,10) === dateKey;
                return (
                  <div key={day} style={{
                    textAlign:'center', padding:'5px 2px', borderRadius:7, fontSize:12.5, fontWeight:600,
                    background: style ? style.bg : (isToday ? '#EFF6FF' : 'transparent'),
                    color:      style ? style.c  : (isToday ? '#1B2F6E' : '#374151'),
                    border:     isToday ? `1.5px solid #1B2F6E` : '1.5px solid transparent',
                  }}>
                    <div>{day}</div>
                    {status && <div style={{ fontSize:9.5, fontWeight:800, marginTop:1 }}>{ATT_COLORS[status]?.label||status}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:14, justifyContent:'center' }}>
              {[['P','Present','#DCFCE7','#15803D'],['A','Absent','#FEE2E2','#DC2626'],['L','Leave','#FEF3C7','#B45309'],['Lt','Late','#DBEAFE','#1D4ED8']].map(([k,label,bg,c])=>(
                <div key={k} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:16, height:16, borderRadius:4, background:bg, border:`1.5px solid ${c}40` }}/>
                  <span style={{ fontSize:11.5, color:c, fontWeight:600 }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!attendLoading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:12 }}>
          {[
            { label:'Present', value:summary.P,  bg:'#DCFCE7', c:'#15803D', Icon:CheckCircle  },
            { label:'Absent',  value:summary.A,  bg:'#FEE2E2', c:'#DC2626', Icon:AlertCircle  },
            { label:'Leave',   value:summary.L,  bg:'#FEF3C7', c:'#B45309', Icon:Calendar      },
            { label:'Late',    value:summary.Lt, bg:'#DBEAFE', c:'#1D4ED8', Icon:Clock         },
          ].map(({ label, value, bg, c, Icon }) => (
            <div key={label} style={{ background:bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${c}20`, display:'flex', alignItems:'center', gap:12 }}>
              <Icon size={22} color={c}/>
              <div>
                <div style={{ fontSize:22, fontWeight:800, color:c }}>{value}</div>
                <div style={{ fontSize:12, fontWeight:600, color:c }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!attendLoading && summary.pct !== null && (
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, fontSize:14, color:'#1B2F6E' }}>Attendance Percentage</span>
          <span style={{ fontWeight:800, fontSize:22, color: summary.pct >= 75 ? '#15803D' : '#DC2626' }}>
            {summary.pct}%
          </span>
        </div>
      )}

      {!attendLoading && !myAttendance && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:10, padding:'12px 16px', marginTop:12, color:'#B45309', fontSize:13 }}>
          No attendance data found for this month.
        </div>
      )}
    </div>
  );
}

/* ── Exam Result Card ───────────────────────────────────── */
function ExamCard({ exam, studentId }) {
  const subjects = exam.subjects || exam.results || [];

  const studentMarks = useMemo(() => {
    return subjects.map(subj => {
      const marks = subj.marks || subj.studentMarks || [];
      const found = marks.find(m => m.studentId === studentId || m.student?.id === studentId);
      return {
        subject:   subj.subject?.name || subj.subjectName || subj.name || '—',
        obtained:  found?.obtained ?? found?.marksObtained ?? found?.marks ?? null,
        total:     subj.totalMarks || subj.total || 100,
        passing:   subj.passingMarks || subj.passing || 40,
      };
    });
  }, [subjects, studentId]);

  const overallObtained = studentMarks.reduce((s,m) => s + (m.obtained ?? 0), 0);
  const overallTotal    = studentMarks.reduce((s,m) => s + m.total, 0);
  const overallPct      = overallTotal > 0 ? Math.round((overallObtained / overallTotal) * 100) : null;
  const grade           = overallPct !== null ? gradeLabel(overallPct) : null;
  const passed          = studentMarks.every(m => m.obtained === null || m.obtained >= m.passing);

  return (
    <div className="card" style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden', marginBottom:14 }}>
      <div className="card-header" style={{ background:`linear-gradient(90deg,${NAVY},#243e8f)`, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:15 }}>{exam.title||exam.name||'Exam'}</div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:12, marginTop:2 }}>{fmtDate(exam.date||exam.startDate||exam.examDate)}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          {grade && (
            <div style={{ fontSize:28, fontWeight:900, color:'#fff' }}>{grade.g}</div>
          )}
          {overallPct !== null && (
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>{overallPct}%</div>
          )}
        </div>
      </div>

      {overallPct !== null && (
        <div style={{ background: passed ? '#DCFCE7' : '#FEE2E2', padding:'8px 18px', display:'flex', alignItems:'center', gap:8 }}>
          {passed
            ? <CheckCircle size={15} color="#15803D"/>
            : <AlertCircle size={15} color="#DC2626"/>
          }
          <span style={{ fontSize:13, fontWeight:700, color: passed ? '#15803D' : '#DC2626' }}>
            {passed ? 'PASSED' : 'FAILED'}
          </span>
          <span style={{ fontSize:12, color:'#6B7280', marginLeft:'auto' }}>
            {overallObtained} / {overallTotal} marks
          </span>
        </div>
      )}

      {studentMarks.length > 0 && (
        <div className="card-body" style={{ padding:'0 0 8px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', padding:'8px 18px', background:'#F8FAFC', fontSize:11.5, fontWeight:700, color:'#6B7280', letterSpacing:.3 }}>
            <span>SUBJECT</span><span style={{ textAlign:'right' }}>MARKS</span><span style={{ textAlign:'right', paddingLeft:16 }}>TOTAL</span><span style={{ textAlign:'right', paddingLeft:16 }}>%</span>
          </div>
          {studentMarks.map((s, i) => {
            const pct  = s.obtained !== null && s.total > 0 ? Math.round((s.obtained/s.total)*100) : null;
            const fail = s.obtained !== null && s.obtained < s.passing;
            return (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', padding:'10px 18px', borderBottom:'1px solid #F1F5F9', alignItems:'center' }}>
                <span style={{ fontSize:13, color:NAVY, fontWeight:600 }}>{s.subject}</span>
                <span style={{ fontSize:13, fontWeight:700, color: fail ? '#DC2626' : '#15803D', textAlign:'right' }}>
                  {s.obtained !== null ? s.obtained : '—'}
                </span>
                <span style={{ fontSize:12, color:'#6B7280', textAlign:'right', paddingLeft:16 }}>{s.total}</span>
                <span style={{ fontSize:12, color: fail ? '#DC2626' : '#0F766E', fontWeight:700, textAlign:'right', paddingLeft:16 }}>
                  {pct !== null ? pct+'%' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {studentMarks.length === 0 && (
        <div style={{ padding:'20px 18px', color:'#94A3B8', fontSize:13, textAlign:'center' }}>
          Marks not entered yet.
        </div>
      )}
    </div>
  );
}
