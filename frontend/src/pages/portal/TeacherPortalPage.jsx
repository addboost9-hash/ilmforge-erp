/**
 * IlmForge — Teacher Portal  (Enterprise Theme)
 * Dark navy #1B2F6E sidebar + stat cards with enterprise color presets
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, BookMarked,
  FolderOpen, Calendar, Bell, Key, Video, LogOut, ChevronRight,
  Save, Plus, Search, MessageSquare, Trash2, Printer, Download,
  CheckCircle2, XCircle, Clock, BarChart2, FileText, TrendingUp,
  Send, Eye, RefreshCw,
} from 'lucide-react';
import { printAttendanceSheet, printMarksSheet, exportToCSV } from '../../components/PortalUtils';

/* ── Helpers ─────────────────────────────────────────────── */
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const greetingHour = new Date().getHours();
const greeting = greetingHour < 12 ? 'Good Morning' : greetingHour < 17 ? 'Good Afternoon' : 'Good Evening';

const LS_HW = 'ilmforge_teacher_hw';
function lsGet(key, fallback = []) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ── Enterprise theme tokens ─────────────────────────────── */
const NAVY   = '#1B2F6E';
const CYAN   = '#00c0ef';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'students',     label: 'My Students',         Icon: Users           },
  { id: 'attendance',   label: 'Mark Attendance',     Icon: UserCheck       },
  { id: 'marks',        label: 'Exam Marks',          Icon: GraduationCap   },
  { id: 'results',      label: 'Publish Results 📢',  Icon: GraduationCap   },
  { id: 'homework',     label: 'Homework',            Icon: BookMarked      },
  { id: 'lessonplans',  label: 'Lesson Plans',        Icon: FileText        },
  { id: 'classreport',  label: 'Class Performance',   Icon: TrendingUp      },
  { id: 'materials',    label: 'Study Materials',     Icon: FolderOpen      },
  { id: 'leave',        label: 'Leave Application',   Icon: Calendar        },
  { id: 'noticeboard',  label: 'Noticeboard',         Icon: Bell            },
  { id: 'password',     label: 'Change Password',     Icon: Key             },
  { id: 'tutorials',    label: 'Video Tutorials',     Icon: Video           },
  { id: 'messenger',    label: 'Messages 💬',         Icon: MessageSquare   },
];

/* ── Stat card presets ───────────────────────────────────── */
const STAT_PRESETS = {
  blue:   { color:'#1D4ED8', bg:'#DBEAFE' },
  green:  { color:'#15803D', bg:'#DCFCE7' },
  yellow: { color:'#B45309', bg:'#FEF3C7' },
  purple: { color:'#7C3AED', bg:'#F5F3FF' },
  red:    { color:'#DC2626', bg:'#FEE2E2' },
  teal:   { color:'#0F766E', bg:'#CCFBF1' },
};

function StatCard({ label, value, preset, Icon }) {
  const p = STAT_PRESETS[preset] || STAT_PRESETS.blue;
  return (
    <div className={`stat-card stat-${preset}`} style={{ background: p.bg, border: `1px solid ${p.color}25`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={p.color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: p.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: p.color }}>{value ?? '—'}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${NAVY}20`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function TeacherPortalPage() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const logo = localStorage.getItem('schoolLogoPreview');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
    staleTime: 300_000,
  });
  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
    staleTime: 120_000,
  });
  const { data: notices = [] } = useQuery({
    queryKey: ['noticeboard'],
    queryFn: () => api.get('/noticeboard').then(r => r.data.data || []),
    staleTime: 120_000,
    retry: false,
  });
  const { data: homeworkApi = [] } = useQuery({
    queryKey: ['homework', todayStr()],
    queryFn: () => api.get('/homework', { params: { date: todayStr() } }).then(r => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  const handleNavClick = (id) => {
    if (id === 'messenger') {
      navigate('/chat');
    } else {
      setActiveTab(id);
    }
  };

  const SidebarComp = () => (
    <aside style={{ width: 260, minHeight: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      {/* School branding */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
          {logo
            ? <img src={logo} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: `2px solid ${CYAN}60` }} />
            : <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎓</div>
          }
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>{schoolName}</div>
            <div style={{ color: CYAN, fontSize: 11, fontWeight: 600, marginTop: 2 }}>Teacher Portal</div>
          </div>
        </div>
        {/* User card */}
        <div style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${CYAN}30`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${NAVY},#243e8f)`, border: `2px solid ${CYAN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
            {user?.name?.charAt(0) || 'T'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Teacher'}</div>
            <div style={{ display: 'inline-block', background: CYAN, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, marginTop: 2 }}>Teacher</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 10px' }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => handleNavClick(id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: active ? CYAN : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.65)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: active ? 700 : 500, marginBottom: 2, transition: 'all .15s', textAlign: 'left' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={14} />}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={logout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#F87171', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}>
          <LogOut size={16} />Logout
        </button>
      </div>
    </aside>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':    return <DashboardTab    classes={classes} exams={exams} homeworkApi={homeworkApi} setActiveTab={setActiveTab} user={user} />;
      case 'students':     return <StudentsTab      classes={classes} />;
      case 'attendance':   return <AttendanceTab    classes={classes} />;
      case 'marks':        return <MarksTab         classes={classes} exams={exams} />;
      case 'homework':     return <HomeworkTab       classes={classes} homeworkApi={homeworkApi} user={user} />;
      case 'lessonplans':  return <LessonPlansTab    classes={classes} user={user} />;
      case 'classreport':  return <ClassReportTab    classes={classes} exams={exams} user={user} />;
      case 'materials':    return <MaterialsTab     classes={classes} />;
      case 'results':      return <ResultPublishTab  classes={classes} exams={exams} />;
      case 'leave':        return <LeaveTab />;
      case 'noticeboard':  return <NoticeboardTab   notices={notices} />;
      case 'password':     return <PasswordTab />;
      case 'tutorials':    return <TutorialsTab />;
      default:             return null;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <SidebarComp />
      <main style={{ flex: 1, padding: '28px 28px', overflowY: 'auto', maxHeight: '100vh' }}>
        {renderContent()}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: DASHBOARD
═══════════════════════════════════════════════════════════ */
function DashboardTab({ classes, exams, homeworkApi, setActiveTab, user }) {
  const [quickClass, setQuickClass] = useState('');
  const { data: students = [] } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => api.get('/students', { params: { status: 'active', limit: 500 } }).then(r => r.data.data || []),
    staleTime: 120_000,
  });
  const { data: recentAdmissions = [] } = useQuery({
    queryKey: ['admissions-recent'],
    queryFn: () => api.get('/students', { params: { limit: 8, sort: '-createdAt' } }).then(r => r.data.data || []),
    staleTime: 120_000,
  });

  const cls = classes.find(c => c.id === parseInt(quickClass));
  const sections = cls?.sections || [];
  const [quickSection, setQuickSection] = useState('');

  const presentCount = students.filter(s => s.todayAttendance === 'present').length;

  return (
    <div>
      {/* Welcome banner — dark navy gradient */}
      <div style={{ background: `linear-gradient(135deg,${NAVY} 0%,#243e8f 60%,#2563EB 100%)`, borderRadius: 16, padding: '24px 28px', marginBottom: 22, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{greeting}, {user?.name?.split(' ')[0] || 'Teacher'}!</div>
        <div style={{ fontSize: 13.5, opacity: 0.8 }}>{new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      {/* Stat cards — My Students (blue), Present Today (green), Homework (yellow), Exams (purple) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="My Students"        value={students.length}     preset="blue"   Icon={Users}        />
        <StatCard label="Present Today"      value={presentCount}        preset="green"  Icon={UserCheck}    />
        <StatCard label="Homework Posted"    value={homeworkApi.length}  preset="yellow" Icon={BookMarked}   />
        <StatCard label="Exams Created"      value={exams.length}        preset="purple" Icon={GraduationCap}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px' }}>
          <SectionTitle>Class Attendance Today</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select value={quickClass} onChange={e => { setQuickClass(e.target.value); setQuickSection(''); }}
              style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', color: NAVY, outline: 'none' }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {sections.length > 0 && (
              <select value={quickSection} onChange={e => setQuickSection(e.target.value)}
                style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', color: NAVY, outline: 'none' }}>
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <button onClick={() => setActiveTab('attendance')} disabled={!quickClass}
              style={{ padding: '10px', borderRadius: 8, border: 'none', cursor: quickClass ? 'pointer' : 'not-allowed', background: quickClass ? NAVY : '#E2E8F0', color: quickClass ? '#fff' : '#94A3B8', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <UserCheck size={15} />Mark Attendance
            </button>
          </div>
        </div>

        <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px' }}>
          <SectionTitle>Today's Homework</SectionTitle>
          {homeworkApi.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>No homework posted today</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {homeworkApi.slice(0, 4).map((hw, i) => (
                <div key={hw.id || i} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${NAVY}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{hw.subject?.name || hw.subjectName || 'Subject'}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{hw.class?.name || '—'} · {(hw.description || '').slice(0, 55)}{(hw.description || '').length > 55 ? '…' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', marginTop: 18 }}>
        <SectionTitle>Recent Admissions in My Class</SectionTitle>
        {recentAdmissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>No recent admissions</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Roll No', 'Name', 'Class', 'Section', 'Admitted'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#64748B', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentAdmissions.map((s, i) => (
                  <tr key={s.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 12px', color: '#64748B' }}>{s.rollNo || '—'}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: NAVY }}>{s.name}</td>
                    <td style={{ padding: '9px 12px', color: '#64748B' }}>{s.class?.name || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#64748B' }}>{s.section?.name || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#64748B' }}>{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: MY STUDENTS
═══════════════════════════════════════════════════════════ */
function StudentsTab({ classes }) {
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', filterClass, 'active'],
    queryFn: () => api.get('/students', { params: { classId: filterClass || undefined, status: 'active', limit: 500 } }).then(r => r.data.data || []),
    staleTime: 60_000,
  });

  const filtered = students.filter(s => !search || (s.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>My Students</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Students enrolled in your assigned class</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: NAVY, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: NAVY, outline: 'none' }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>Loading students…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>No students found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Roll No', 'Avatar', 'Name', 'Father', 'Section', 'Gender', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748B', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `2px solid #E2E8F0` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>{s.rollNo || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {s.photo
                        ? <img src={s.photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.gender === 'female' ? 'linear-gradient(135deg,#F472B6,#EC4899)' : `linear-gradient(135deg,${NAVY},#2563EB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>{(s.name || '?').charAt(0)}</div>
                      }
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: NAVY }}>{s.name}</td>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>{s.fatherName || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>{s.section?.name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: s.gender === 'female' ? '#FDF2F8' : '#EFF6FF', color: s.gender === 'female' ? '#9D174D' : '#1D4ED8', padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }}>{s.gender || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: s.status === 'active' ? '#DCFCE7' : '#FEE2E2', color: s.status === 'active' ? '#15803D' : '#DC2626', padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }}>{s.status || 'active'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Showing {filtered.length} of {students.length} students</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: MARK ATTENDANCE
═══════════════════════════════════════════════════════════ */
function AttendanceTab({ classes }) {
  const [type, setType] = useState('student');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [attendance, setAttendance] = useState({});
  const [stuList, setStuList] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const cls = classes.find(c => c.id === parseInt(classId));
  const sections = cls?.sections || [];

  const loadStudents = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await api.get('/students', { params: { classId, sectionId: sectionId || undefined, status: 'active', limit: 150 } });
      const list = res.data.data || [];
      setStuList(list);
      const m = {};
      list.forEach(s => { m[s.id] = 'present'; });
      setAttendance(m);
      setLoaded(true);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const saveAtt = useMutation({
    mutationFn: () => api.post('/attendance/save', {
      type, classId: parseInt(classId), sectionId: sectionId ? parseInt(sectionId) : null, date,
      records: Object.entries(attendance).map(([sid, status]) => ({ studentId: parseInt(sid), status })),
    }),
    onSuccess: () => toast.success('Attendance saved successfully!'),
    onError: err => toast.error(err.response?.data?.message || 'Failed to save attendance'),
  });

  const toggleStatus = sid => {
    setAttendance(prev => {
      const cur = prev[sid] || 'present';
      return { ...prev, [sid]: { present: 'absent', absent: 'leave', leave: 'present' }[cur] };
    });
  };
  const markAll = status => { const m = {}; stuList.forEach(s => { m[s.id] = status; }); setAttendance(m); };

  const present = Object.values(attendance).filter(v => v === 'present').length;
  const absent  = Object.values(attendance).filter(v => v === 'absent').length;
  const leave   = Object.values(attendance).filter(v => v === 'leave').length;
  const sStyle  = s => ({ present: { bg: '#DCFCE7', color: '#15803D' }, absent: { bg: '#FEE2E2', color: '#DC2626' }, leave: { bg: '#FEF3C7', color: '#B45309' } }[s] || { bg: '#DCFCE7', color: '#15803D' });

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Mark Attendance</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Select class and mark each student's attendance</div>
      </div>
      <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Type', content: <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}><option value="student">Student</option><option value="staff">Staff</option></select> },
            { label: 'Class', content: <select value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setLoaded(false); setStuList([]); }} style={inputStyle}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select> },
            ...(sections.length > 0 ? [{ label: 'Section', content: <select value={sectionId} onChange={e => { setSectionId(e.target.value); setLoaded(false); }} style={inputStyle}><option value="">All</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select> }] : []),
            { label: 'Date', content: <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, boxSizing: 'border-box' }} /> },
          ].map(({ label, content }) => (
            <div key={label} style={{ flex: '0 0 150px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
              {content}
            </div>
          ))}
          <button onClick={loadStudents} disabled={!classId || loading}
            style={{ padding: '9px 20px', background: classId ? NAVY : '#E2E8F0', color: classId ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: classId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-end' }}>
            <Users size={15} />{loading ? 'Loading…' : 'Load Students'}
          </button>
        </div>
      </div>

      {loaded && stuList.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            {[['Present', present, '#15803D', '#DCFCE7'], ['Absent', absent, '#DC2626', '#FEE2E2'], ['Leave', leave, '#B45309', '#FEF3C7']].map(([l, v, c, bg]) => (
              <div key={l} style={{ background: bg, borderRadius: 9, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: c }}>{v}</span>
                <span style={{ fontSize: 12, color: c, fontWeight: 600 }}>{l}</span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Mark All:</span>
            {['present', 'absent', 'leave'].map(s => (
              <button key={s} onClick={() => markAll(s)} style={{ background: sStyle(s).bg, color: sStyle(s).color, border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <button onClick={() => printAttendanceSheet({ className: classes.find(c=>c.id===parseInt(classId))?.name || 'Class', date, students: stuList.map(s=>({...s, status: attendance[s.id]})) })}
              style={{ padding:'5px 12px', border:'1px solid #e2e8f0', borderRadius:6, background:'white', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5, color:'#374151' }}>
              <Printer size={12}/> Print Sheet
            </button>
            <button onClick={() => exportToCSV(`attendance-${date}`, ['Roll No','Name','Status'], stuList.map(s=>[s.rollNo||'',s.name||'', attendance[s.id]||'present']))}
              style={{ padding:'5px 12px', border:'1px solid #e2e8f0', borderRadius:6, background:'white', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5, color:'#374151' }}>
              <Download size={12}/> Export CSV
            </button>
          </div>
          <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 16 }}>
            {stuList.map((s, i) => {
              const st = attendance[s.id] || 'present';
              const ss = sStyle(st);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < stuList.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${NAVY},#2563EB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{(s.name || '?').charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>Roll: {s.rollNo || '—'} · {s.section?.name || ''}</div>
                  </div>
                  <button onClick={() => toggleStatus(s.id)} style={{ width: 80, padding: '7px 0', background: ss.bg, color: ss.color, border: `2px solid ${ss.color}30`, borderRadius: 8, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => saveAtt.mutate()} disabled={saveAtt.isPending}
              style={{ padding: '11px 28px', background: NAVY, color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Save size={16} />{saveAtt.isPending ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
      {loaded && stuList.length === 0 && (
        <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No students found in this class</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: EXAM MARKS
═══════════════════════════════════════════════════════════ */
function MarksTab({ classes, exams }) {
  const qc = useQueryClient();
  const [selectedExam, setSelectedExam] = useState('');
  const [classId, setClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [marks, setMarks] = useState({});
  const [totalDefault, setTotalDefault] = useState(100);

  const exam = exams.find(e => e.id === parseInt(selectedExam));
  const activeClassId = exam?.classId || classId || null;

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-for-exam', activeClassId],
    enabled: !!activeClassId,
    queryFn: () => api.get('/classes/subjects', { params: { classId: activeClassId } }).then(r => r.data.data || []),
    retry: false,
  });

  const { data: students = [], isLoading: stuLoad } = useQuery({
    queryKey: ['exam-students', activeClassId],
    enabled: !!activeClassId,
    queryFn: () => api.get('/students', { params: { classId: activeClassId, status: 'active', limit: 150 } }).then(r => r.data.data || []),
  });

  useEffect(() => {
    if (students.length > 0 && selectedExam) {
      const m = {};
      students.forEach(s => { m[s.id] = { obtained: '', absent: false }; });
      setMarks(m);
    }
  }, [students, selectedExam]);

  useEffect(() => { setSelectedSubject(''); }, [selectedExam]);

  const gradeFor = (obtained, total, absent) => {
    if (absent) return 'ABS';
    if (!obtained || !total) return '—';
    const pct = (parseInt(obtained) / parseInt(total)) * 100;
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A'; if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';  if (pct >= 50) return 'D'; if (pct >= 40) return 'E';
    return 'F';
  };
  const gradeColor = g => {
    if (!g || g === '—' || g === 'ABS') return '#94a3b8';
    if (g === 'A+' || g === 'A') return '#15803D';
    if (g === 'B' || g === 'C') return '#1D4ED8';
    if (g === 'D' || g === 'E') return '#B45309';
    return '#B91C1C';
  };

  const saveMut = useMutation({
    mutationFn: () => api.post(`/exams/${selectedExam}/marks`, {
      classId: parseInt(activeClassId),
      subjectId: parseInt(selectedSubject),
      totalMarks: totalDefault,
      marks: Object.entries(marks).map(([sid, d]) => ({
        studentId: parseInt(sid),
        subjectId: parseInt(selectedSubject),
        obtainedMarks: d.absent ? null : parseInt(d.obtained) || 0,
        absent: d.absent,
      })),
    }),
    onSuccess: () => { toast.success('Marks saved successfully!'); qc.invalidateQueries(['exams']); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save marks'),
  });

  const sel = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none' };
  const canShowTable = selectedExam && activeClassId && selectedSubject;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Exam Marks</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Select an exam and subject, then enter student marks</div>
      </div>
      <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select Exam</label>
            <select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setClassId(''); setSelectedSubject(''); }} style={sel}>
              <option value="">-- Select Exam --</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name || e.title}{e.class?.name ? ` (${e.class.name})` : ''}</option>)}
            </select>
          </div>
          {selectedExam && !exam?.classId && (
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class</label>
              <select value={classId} onChange={e => setClassId(e.target.value)} style={sel}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {activeClassId && (
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={sel}>
                <option value="">-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Marks</label>
            <input type="number" value={totalDefault} onChange={e => setTotalDefault(parseInt(e.target.value) || 100)} style={{ ...sel, boxSizing: 'border-box' }} />
          </div>
        </div>
        {selectedExam && activeClassId && !selectedSubject && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 13, color: '#B45309', fontWeight: 600 }}>
            Please select a subject to view and enter marks.
          </div>
        )}
      </div>

      {canShowTable && (
        stuLoad ? <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>Loading students…</div>
        : students.length === 0 ? <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No students found</div>
        : (
          <>
            <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 60px', padding: '10px 18px', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Student', 'Obtained Marks', 'Grade', 'Absent'].map(h => (
                  <div key={h} style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                ))}
              </div>
              {students.map((s, i) => {
                const m = marks[s.id] || { obtained: '', absent: false };
                const grade = gradeFor(m.obtained, totalDefault, m.absent);
                return (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 60px', padding: '11px 18px', borderBottom: i < students.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Roll: {s.rollNo || '—'}</div>
                    </div>
                    <div>
                      <input type="number" min="0" max={totalDefault} value={m.obtained} disabled={m.absent}
                        onChange={e => setMarks(prev => ({ ...prev, [s.id]: { ...prev[s.id], obtained: e.target.value } }))}
                        placeholder={`/ ${totalDefault}`}
                        style={{ width: 100, padding: '7px 10px', border: '1.5px solid #E2E8F0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: m.absent ? '#F1F5F9' : '#fff', outline: 'none', color: NAVY }} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: gradeColor(grade) }}>{grade}</div>
                    <div>
                      <input type="checkbox" checked={m.absent}
                        onChange={e => setMarks(prev => ({ ...prev, [s.id]: { obtained: '', absent: e.target.checked } }))}
                        style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#DC2626' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => printMarksSheet({ examTitle: exam?.name || exam?.title || 'Exam', className: classes.find(c=>c.id===parseInt(activeClassId))?.name||'Class', students: students.map(s=>({...s, obtainedMarks: marks[s.id]?.obtained, totalMarks: totalDefault, grade: gradeFor(marks[s.id]?.obtained, totalDefault, marks[s.id]?.absent)})) })}
                style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7, color:'#374151', fontFamily:'inherit' }}>
                <Printer size={14}/> Print Marksheet
              </button>
              <button onClick={() => exportToCSV(`marks-${exam?.name||'exam'}`, ['Roll No','Name','Obtained','Total','Grade'], students.map(s=>[s.rollNo||'',s.name||'',marks[s.id]?.absent?'ABS':(marks[s.id]?.obtained||''),totalDefault,gradeFor(marks[s.id]?.obtained,totalDefault,marks[s.id]?.absent)]))}
                style={{ padding:'10px 20px', border:'1px solid #e2e8f0', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7, color:'#374151', fontFamily:'inherit' }}>
                <Download size={14}/> Export CSV
              </button>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                style={{ padding: '11px 28px', background: NAVY, color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Save size={16} />{saveMut.isPending ? 'Saving…' : 'Save Marks'}
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: HOMEWORK  (Enhanced)
═══════════════════════════════════════════════════════════ */
function HomeworkTab({ classes, homeworkApi, user }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ subject: '', classId: '', section: '', dueDate: todayStr(), description: '' });
  const [localHW, setLocalHW] = useState(() => lsGet(LS_HW));
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'submissions'
  const [selectedHW, setSelectedHW] = useState(null);

  const cls = classes.find(c => c.id === parseInt(form.classId));
  const sections = cls?.sections || [];
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', form.classId],
    enabled: !!form.classId,
    queryFn: () => api.get('/classes/subjects', { params: { classId: form.classId } }).then(r => r.data.data || []),
    retry: false,
  });

  /* Load all homework assigned by this teacher */
  const { data: myHomework = [], isLoading: hwLoading, refetch: refetchHW } = useQuery({
    queryKey: ['my-homework', user?.id],
    queryFn: () => api.get('/homework', { params: { createdBy: user?.id, limit: 100 } }).then(r => r.data.data || []).catch(() => []),
    staleTime: 60_000,
    retry: false,
  });

  /* Load submissions for selected homework */
  const { data: submissions = [], isLoading: subLoading } = useQuery({
    queryKey: ['hw-submissions', selectedHW?.id],
    queryFn: () => api.get(`/homework/${selectedHW?.id}/submissions`).then(r => r.data.data || []).catch(() => []),
    enabled: !!selectedHW?.id,
    staleTime: 30_000,
    retry: false,
  });

  const addMut = useMutation({
    mutationFn: () => api.post('/homework', {
      classId: parseInt(form.classId),
      sectionId: form.section ? parseInt(form.section) : undefined,
      subjectId: form.subject ? parseInt(form.subject) : undefined,
      description: form.description,
      date: form.dueDate,
      dueDate: form.dueDate,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['homework']);
      qc.invalidateQueries(['my-homework', user?.id]);
      setForm({ subject: '', classId: '', section: '', dueDate: todayStr(), description: '' });
      toast.success('Homework posted successfully!');
    },
    onError: () => {
      const entry = { id: Date.now(), ...form, className: cls?.name, createdAt: new Date().toISOString() };
      const updated = [entry, ...localHW];
      setLocalHW(updated);
      lsSet(LS_HW, updated);
      setForm({ subject: '', classId: '', section: '', dueDate: todayStr(), description: '' });
      toast.error('Homework saved locally (API unavailable)');
    },
  });

  const allHW = [...myHomework, ...localHW.filter(lh => !myHomework.find(mh => mh.id === lh.id))];
  const valid = form.classId && form.description;
  const iStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none' };

  const submitted = submissions.filter(s => s.status === 'submitted' || s.submittedAt);
  const pending   = submissions.filter(s => !s.status || s.status === 'pending' || !s.submittedAt);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Homework Diary</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Assign homework and track student submissions</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
        {/* LEFT: Add Homework Form */}
        <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Plus size={16} color={NAVY} />
            <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Assign Homework</span>
          </div>

          {/* Class */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class *</label>
            <select value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value, section: '', subject: '' }))} style={iStyle}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Section */}
          {sections.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Section</label>
              <select value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} style={iStyle}>
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Subject */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
            <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} style={iStyle} disabled={!form.classId}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Due Date *</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} style={{ ...iStyle, boxSizing: 'border-box' }} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Homework Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4}
              placeholder="Describe the homework task in detail…"
              style={{ ...iStyle, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <button onClick={() => addMut.mutate()} disabled={!valid || addMut.isPending}
            style={{ width: '100%', padding: '10px', background: valid ? NAVY : '#E2E8F0', color: valid ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: valid ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Save size={15} />{addMut.isPending ? 'Posting…' : 'Post Homework'}
          </button>
        </div>

        {/* RIGHT: List or Submissions */}
        <div>
          {!selectedHW ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Posted Homework ({allHW.length})</SectionTitle>
                <button onClick={() => refetchHW()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 7, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              {hwLoading ? (
                <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Loading homework…</div>
              ) : allHW.length === 0 ? (
                <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No homework posted yet. Use the form to assign homework.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allHW.map((hw, i) => {
                    const duePast = hw.dueDate && new Date(hw.dueDate) < new Date();
                    return (
                      <div key={hw.id || i} className="card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', borderLeft: `4px solid ${duePast ? '#DC2626' : NAVY}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY }}>
                              {hw.subject?.name || hw.subjectName || hw.subject || 'General'} — {hw.class?.name || hw.className || '—'}
                            </div>
                            <div style={{ fontSize: 13, color: '#374151', margin: '5px 0', lineHeight: 1.5 }}>{hw.description}</div>
                            <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                              Due: {hw.dueDate ? fmtDate(hw.dueDate) : fmtDate(hw.date || hw.createdAt)}
                              {hw.section?.name && <span> · Section {hw.section.name}</span>}
                              {duePast && <span style={{ marginLeft: 8, color: '#DC2626', fontWeight: 700 }}>OVERDUE</span>}
                            </div>
                          </div>
                          {hw.id && !hw.id.toString().startsWith(Date.now().toString().slice(0,5)) && (
                            <button onClick={() => setSelectedHW(hw)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#EFF6FF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#2563EB', cursor: 'pointer', flexShrink: 0 }}>
                              <Eye size={13} /> Submissions
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Submissions View */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <button onClick={() => setSelectedHW(null)} style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 7, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>
                  Back
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{selectedHW.subject?.name || 'Homework'} Submissions</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{selectedHW.class?.name || selectedHW.className} · Due: {fmtDate(selectedHW.dueDate || selectedHW.date)}</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Submitted', value: submitted.length, color: '#15803D', bg: '#DCFCE7' },
                  { label: 'Pending',   value: pending.length,   color: '#B45309', bg: '#FEF3C7' },
                  { label: 'Total',     value: submissions.length, color: NAVY,   bg: '#EFF6FF' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 9, padding: '8px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11.5, color: s.color, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {subLoading ? (
                <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading submissions…</div>
              ) : submissions.length === 0 ? (
                <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No submissions recorded yet.</div>
              ) : (
                <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding: '10px 18px', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    {['Student', 'Status', 'Submitted At'].map(h => (
                      <div key={h} style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                    ))}
                  </div>
                  {submissions.map((sub, i) => {
                    const isSubmitted = sub.status === 'submitted' || !!sub.submittedAt;
                    return (
                      <div key={sub.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding: '11px 18px', borderBottom: i < submissions.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{sub.student?.name || sub.studentName || 'Student'}</div>
                          <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Roll: {sub.student?.rollNo || '—'}</div>
                        </div>
                        <div>
                          <span style={{ background: isSubmitted ? '#DCFCE7' : '#FEF3C7', color: isSubmitted ? '#15803D' : '#B45309', padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700 }}>
                            {isSubmitted ? 'Submitted' : 'Pending'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>{sub.submittedAt ? fmtDate(sub.submittedAt) : '—'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: LESSON PLANS
═══════════════════════════════════════════════════════════ */
const LP_STATUS_META = {
  draft:     { label: 'Draft',     color: '#64748B', bg: '#F1F5F9' },
  submitted: { label: 'Submitted', color: '#2563EB', bg: '#EFF6FF' },
  approved:  { label: 'Approved',  color: '#15803D', bg: '#DCFCE7' },
  rejected:  { label: 'Rejected',  color: '#DC2626', bg: '#FEE2E2' },
};

function LessonPlansTab({ classes, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [viewPlan, setViewPlan] = useState(null);
  const [form, setForm] = useState({ classId: '', subject: '', unit: '', week: '', objectives: '', content: '', activities: '', assessment: '' });

  const { data: plans = [], isLoading, refetch } = useQuery({
    queryKey: ['lesson-plans', user?.id],
    queryFn: () => api.get('/lesson-plans', { params: { createdBy: user?.id, limit: 100 } }).then(r => r.data.data || []).catch(() => []),
    staleTime: 60_000,
    retry: false,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['lp-subjects', form.classId],
    enabled: !!form.classId,
    queryFn: () => api.get('/classes/subjects', { params: { classId: form.classId } }).then(r => r.data.data || []),
    retry: false,
  });

  const createMut = useMutation({
    mutationFn: (status) => api.post('/lesson-plans', {
      classId: parseInt(form.classId),
      subjectId: form.subject ? parseInt(form.subject) : undefined,
      unit: form.unit,
      week: form.week,
      objectives: form.objectives,
      content: form.content,
      activities: form.activities,
      assessment: form.assessment,
      status: status || 'draft',
    }),
    onSuccess: (_, status) => {
      qc.invalidateQueries(['lesson-plans', user?.id]);
      setShowForm(false);
      setForm({ classId: '', subject: '', unit: '', week: '', objectives: '', content: '', activities: '', assessment: '' });
      toast.success(status === 'submitted' ? 'Lesson plan submitted for approval!' : 'Lesson plan saved as draft!');
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save lesson plan'),
  });

  const submitMut = useMutation({
    mutationFn: (id) => api.put(`/lesson-plans/${id}`, { status: 'submitted' }),
    onSuccess: () => { qc.invalidateQueries(['lesson-plans', user?.id]); toast.success('Lesson plan submitted for approval!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to submit lesson plan'),
  });

  const iStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' };
  const formValid = form.classId && form.unit;

  if (viewPlan) {
    const meta = LP_STATUS_META[viewPlan.status] || LP_STATUS_META.draft;
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setViewPlan(null)} style={{ padding: '7px 14px', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{viewPlan.unit || 'Lesson Plan'}</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>{viewPlan.class?.name || '—'} · {viewPlan.subject?.name || '—'}{viewPlan.week ? ` · Week ${viewPlan.week}` : ''}</div>
          </div>
          <span style={{ background: meta.bg, color: meta.color, padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{meta.label}</span>
        </div>
        <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 28px' }}>
          {[
            { label: 'Learning Objectives', value: viewPlan.objectives },
            { label: 'Content / Topics',    value: viewPlan.content    },
            { label: 'Activities',          value: viewPlan.activities },
            { label: 'Assessment',          value: viewPlan.assessment },
          ].filter(f => f.value).map(f => (
            <div key={f.label} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{f.label}</div>
              <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>{f.value}</div>
            </div>
          ))}
          {viewPlan.adminNotes && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: viewPlan.status === 'rejected' ? '#FEE2E2' : '#DCFCE7', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: viewPlan.status === 'rejected' ? '#DC2626' : '#15803D', marginBottom: 4, textTransform: 'uppercase' }}>Admin Feedback</div>
              <div style={{ fontSize: 13, color: '#374151' }}>{viewPlan.adminNotes}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Lesson Plans</div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Create and submit lesson plans for admin approval</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => setShowForm(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: NAVY, color: 'white', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Plus size={14} /> New Plan
          </button>
        </div>
      </div>

      {/* Summary counts */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        {Object.entries(LP_STATUS_META).map(([key, meta]) => {
          const count = plans.filter(p => (p.status || 'draft') === key).length;
          return (
            <div key={key} style={{ background: meta.bg, borderRadius: 10, padding: '8px 18px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>{count}</div>
              <div style={{ fontSize: 11.5, color: meta.color, fontWeight: 600 }}>{meta.label}</div>
            </div>
          );
        })}
      </div>

      {/* New Plan Form */}
      {showForm && (
        <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '22px 24px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 16 }}>Create New Lesson Plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class *</label>
              <select value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value, subject: '' }))} style={iStyle}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
              <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} style={iStyle} disabled={!form.classId}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Week</label>
              <input type="text" value={form.week} onChange={e => setForm(p => ({ ...p, week: e.target.value }))} placeholder="e.g. Week 3 / Oct 7–11" style={iStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unit / Topic Title *</label>
            <input type="text" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. Chapter 4 – Photosynthesis" style={iStyle} />
          </div>
          {[
            { key: 'objectives', label: 'Learning Objectives', placeholder: 'What students will learn by the end of the lesson…' },
            { key: 'content',    label: 'Content / Topics',    placeholder: 'Topics to be covered…' },
            { key: 'activities', label: 'Activities',          placeholder: 'Classroom activities, group work, experiments…' },
            { key: 'assessment', label: 'Assessment',          placeholder: 'How will learning be assessed…' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
              <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2} placeholder={f.placeholder} style={{ ...iStyle, resize: 'vertical' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '9px 18px', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
            <button onClick={() => createMut.mutate('draft')} disabled={!formValid || createMut.isPending}
              style={{ padding: '9px 18px', border: `1px solid ${NAVY}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 700, cursor: formValid ? 'pointer' : 'not-allowed', color: NAVY, opacity: formValid ? 1 : 0.5 }}>
              <Save size={13} style={{ display: 'inline', marginRight: 5 }} />Save as Draft
            </button>
            <button onClick={() => createMut.mutate('submitted')} disabled={!formValid || createMut.isPending}
              style={{ padding: '9px 18px', background: formValid ? NAVY : '#E2E8F0', color: formValid ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: formValid ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={13} />{createMut.isPending ? 'Submitting…' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Loading lesson plans…</div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '64px', textAlign: 'center', color: '#94A3B8' }}>
          <FileText size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: 15, color: '#64748B', marginBottom: 6 }}>No Lesson Plans Yet</div>
          <div style={{ fontSize: 13 }}>Click "New Plan" to create your first lesson plan.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plans.map((plan, i) => {
            const meta = LP_STATUS_META[plan.status || 'draft'] || LP_STATUS_META.draft;
            return (
              <div key={plan.id || i} className="card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY }}>{plan.unit || 'Untitled Plan'}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                    {plan.class?.name || '—'} · {plan.subject?.name || '—'}
                    {plan.week && <span> · {plan.week}</span>}
                    <span style={{ marginLeft: 8 }}>{fmtDate(plan.createdAt)}</span>
                  </div>
                </div>
                <span style={{ background: meta.bg, color: meta.color, padding: '4px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{meta.label}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setViewPlan(plan)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#EFF6FF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}>
                    <Eye size={13} /> View
                  </button>
                  {(plan.status === 'draft' || plan.status === 'rejected') && (
                    <button onClick={() => submitMut.mutate(plan.id)} disabled={submitMut.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: NAVY, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                      <Send size={13} /> Submit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: CLASS PERFORMANCE REPORT
═══════════════════════════════════════════════════════════ */
function ClassReportTab({ classes, exams, user }) {
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const cls = classes.find(c => c.id === parseInt(classId));
  const sections = cls?.sections || [];

  /* Today's attendance for the selected class */
  const { data: attToday = [], isLoading: attLoading } = useQuery({
    queryKey: ['class-att-today', classId, sectionId],
    queryFn: () => api.get('/attendance', { params: { classId, sectionId: sectionId || undefined, date: todayStr() } }).then(r => r.data.data || []).catch(() => []),
    enabled: !!classId,
    staleTime: 60_000,
    retry: false,
  });

  /* Recent exam marks for this class */
  const { data: recentMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['class-recent-marks', classId],
    queryFn: () => api.get('/marks', { params: { classId, limit: 50, sort: '-createdAt' } }).then(r => r.data.data || []).catch(() => []),
    enabled: !!classId,
    staleTime: 120_000,
    retry: false,
  });

  /* Pending homework for this class */
  const { data: hwList = [], isLoading: hwLoading } = useQuery({
    queryKey: ['class-hw', classId],
    queryFn: () => api.get('/homework', { params: { classId, limit: 50, sort: '-createdAt' } }).then(r => r.data.data || []).catch(() => []),
    enabled: !!classId,
    staleTime: 60_000,
    retry: false,
  });

  const presentCount = attToday.filter(a => a.status === 'present').length;
  const absentCount  = attToday.filter(a => a.status === 'absent').length;
  const leaveCount   = attToday.filter(a => a.status === 'leave').length;
  const totalAtt     = attToday.length;
  const attPct       = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : null;

  const pendingHW = hwList.filter(hw => {
    const due = hw.dueDate || hw.date;
    return due && new Date(due) >= new Date(todayStr());
  });

  const iStyle = { padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Class Performance</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Attendance, exam marks, and homework overview for your class</div>
      </div>

      {/* Class / Section selector */}
      <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 22px', marginBottom: 20, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '0 0 200px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class</label>
          <select value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); }} style={iStyle}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {sections.length > 0 && (
          <div style={{ flex: '0 0 160px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Section</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} style={iStyle}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {!classId && <div style={{ fontSize: 13, color: '#94A3B8', alignSelf: 'center' }}>Select a class to view performance data</div>}
      </div>

      {classId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Section 1: Today's Attendance */}
          <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <SectionTitle>Today's Attendance — {cls?.name}{sectionId ? ` (${sections.find(s=>s.id===parseInt(sectionId))?.name})` : ''}</SectionTitle>
            {attLoading ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>Loading attendance…</div>
            ) : attToday.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>No attendance marked yet for today in this class.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Present', value: presentCount, color: '#15803D', bg: '#DCFCE7' },
                    { label: 'Absent',  value: absentCount,  color: '#DC2626', bg: '#FEE2E2' },
                    { label: 'Leave',   value: leaveCount,   color: '#B45309', bg: '#FEF3C7' },
                    { label: 'Total',   value: totalAtt,     color: NAVY,      bg: '#EFF6FF' },
                    ...(attPct !== null ? [{ label: 'Attendance %', value: `${attPct}%`, color: attPct >= 75 ? '#15803D' : '#DC2626', bg: attPct >= 75 ? '#DCFCE7' : '#FEE2E2' }] : []),
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 18px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11.5, color: s.color, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Roll No', 'Student Name', 'Status'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: '#64748B', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attToday.map((a, i) => {
                        const statusColors = { present: { bg: '#DCFCE7', color: '#15803D' }, absent: { bg: '#FEE2E2', color: '#DC2626' }, leave: { bg: '#FEF3C7', color: '#B45309' } };
                        const sc = statusColors[a.status] || { bg: '#F1F5F9', color: '#64748B' };
                        return (
                          <tr key={a.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '9px 14px', color: '#64748B' }}>{a.student?.rollNo || a.rollNo || '—'}</td>
                            <td style={{ padding: '9px 14px', fontWeight: 600, color: NAVY }}>{a.student?.name || a.studentName || '—'}</td>
                            <td style={{ padding: '9px 14px' }}>
                              <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }}>{a.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Section 2: Recent Exam Marks */}
          <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <SectionTitle>Recent Exam Marks</SectionTitle>
            {marksLoading ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>Loading marks…</div>
            ) : recentMarks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>No exam marks found for this class.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Student', 'Exam', 'Subject', 'Obtained', 'Total', 'Grade'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: '#64748B', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentMarks.slice(0, 20).map((m, i) => {
                      const pct = m.totalMarks > 0 ? Math.round((m.obtainedMarks / m.totalMarks) * 100) : 0;
                      const grade = m.isAbsent ? 'ABS' : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : pct >= 40 ? 'E' : 'F';
                      const gradeColor = { 'A+': '#15803D', A: '#15803D', B: '#1D4ED8', C: '#1D4ED8', D: '#B45309', E: '#B45309', F: '#DC2626', ABS: '#94A3B8' }[grade] || '#94A3B8';
                      return (
                        <tr key={m.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '9px 14px', fontWeight: 600, color: NAVY }}>{m.student?.name || '—'}</td>
                          <td style={{ padding: '9px 14px', color: '#64748B' }}>{m.exam?.name || m.exam?.title || '—'}</td>
                          <td style={{ padding: '9px 14px', color: '#64748B' }}>{m.subject?.name || '—'}</td>
                          <td style={{ padding: '9px 14px', fontWeight: 700, color: NAVY }}>{m.isAbsent ? 'ABS' : (m.obtainedMarks ?? '—')}</td>
                          <td style={{ padding: '9px 14px', color: '#64748B' }}>{m.totalMarks ?? '—'}</td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: gradeColor }}>{grade}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {recentMarks.length > 20 && <div style={{ textAlign: 'right', fontSize: 12, color: '#94A3B8', padding: '8px 14px' }}>Showing 20 of {recentMarks.length} entries</div>}
              </div>
            )}
          </div>

          {/* Section 3: Pending Homework */}
          <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 24px' }}>
            <SectionTitle>Pending / Upcoming Homework ({pendingHW.length})</SectionTitle>
            {hwLoading ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>Loading homework…</div>
            ) : pendingHW.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>No pending homework for this class.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingHW.map((hw, i) => (
                  <div key={hw.id || i} style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 16px', borderLeft: `3px solid ${NAVY}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{hw.subject?.name || 'General'}</div>
                      <div style={{ fontSize: 12.5, color: '#374151', marginTop: 3 }}>{(hw.description || '').slice(0, 100)}{(hw.description || '').length > 100 ? '…' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>Due</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY }}>{fmtDate(hw.dueDate || hw.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: STUDY MATERIALS
═══════════════════════════════════════════════════════════ */
function MaterialsTab({ classes }) {
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [form, setForm] = useState({ title: '', subjectId: '', fileType: 'PDF', fileUrl: '' });

  const { data: subjects = [] } = useQuery({
    queryKey: ['mat-subjects', selectedClass],
    enabled: !!selectedClass,
    queryFn: () => api.get('/classes/subjects', { params: { classId: selectedClass } }).then(r => r.data.data || []),
    retry: false,
  });

  const { data: materials = [], isLoading: matsLoading } = useQuery({
    queryKey: ['study-materials', selectedClass],
    queryFn: () => api.get('/study-materials', {
      params: selectedClass ? { classId: selectedClass } : {},
    }).then(r => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  const addMut = useMutation({
    mutationFn: () => {
      if (!form.title || !form.fileUrl) throw new Error('Title and URL are required');
      return api.post('/study-materials', {
        title: form.title,
        fileUrl: form.fileUrl,
        fileType: form.fileType,
        classId: selectedClass ? parseInt(selectedClass) : undefined,
        subjectId: form.subjectId ? parseInt(form.subjectId) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['study-materials']);
      setForm({ title: '', subjectId: '', fileType: 'PDF', fileUrl: '' });
      toast.success('Material added successfully!');
    },
    onError: err => toast.error(err.response?.data?.message || err.message || 'Failed to add material'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/study-materials/${id}`),
    onSuccess: () => { qc.invalidateQueries(['study-materials']); toast.success('Material deleted.'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to delete material'),
  });

  const handleDelete = (mat) => {
    if (!window.confirm(`Delete "${mat.title}"? This cannot be undone.`)) return;
    deleteMut.mutate(mat.id);
  };

  const typeColor = t => ({ PDF: '#DC2626', Video: '#7C3AED', Link: '#2563EB' }[(t || '').toUpperCase()] || '#64748B');
  const typeBg    = t => ({ PDF: '#FEE2E2', Video: '#F5F3FF', Link: '#EFF6FF' }[(t || '').toUpperCase()] || '#F1F5F9');
  const iStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' };
  const formValid = form.title && form.fileUrl;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Study Materials</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Upload and manage learning resources</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
        <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Plus size={16} color={NAVY} />
            <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Add Material</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class</label>
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setForm(p => ({ ...p, subjectId: '' })); }} style={iStyle}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {selectedClass && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
              <select value={form.subjectId} onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))} style={iStyle}>
                <option value="">Select Subject (optional)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {[
            { label: 'Title', key: 'title', type: 'text', placeholder: 'e.g. Chapter 5 Notes' },
            { label: 'File URL / Link', key: 'fileUrl', type: 'url', placeholder: 'https://…' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={iStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>File Type</label>
            <select value={form.fileType} onChange={e => setForm(p => ({ ...p, fileType: e.target.value }))} style={iStyle}>
              {['PDF', 'Video', 'Link'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={() => addMut.mutate()} disabled={!formValid || addMut.isPending}
            style={{ width: '100%', padding: '10px', background: formValid ? NAVY : '#E2E8F0', color: formValid ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: formValid ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Plus size={15} />{addMut.isPending ? 'Adding…' : 'Add Material'}
          </button>
        </div>
        <div>
          <SectionTitle>All Materials</SectionTitle>
          {matsLoading ? (
            <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>Loading materials…</div>
          ) : materials.length === 0 ? (
            <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No materials uploaded yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {materials.map((m, i) => {
                const typeKey = (m.fileType || m.type || '').toUpperCase();
                const url = m.fileUrl || m.url || m.link || '#';
                return (
                  <div key={m.id || i} className="card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: typeBg(typeKey), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FolderOpen size={18} color={typeColor(typeKey)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                        {m.subject?.name || m.subjectName || '—'} · {fmtDate(m.createdAt)}
                        {m.class?.name && <span> · {m.class.name}</span>}
                      </div>
                    </div>
                    <span style={{ background: typeBg(typeKey), color: typeColor(typeKey), padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{typeKey || 'File'}</span>
                    {url && url !== '#' && (
                      <a href={url} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>Open →</a>
                    )}
                    <button onClick={() => handleDelete(m)} disabled={deleteMut.isPending}
                      style={{ background: '#FEE2E2', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      title="Delete material">
                      <Trash2 size={14} color="#DC2626" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: LEAVE APPLICATION
═══════════════════════════════════════════════════════════ */
function LeaveTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fromDate: todayStr(), toDate: todayStr(), type: 'Casual', reason: '' });
  const { data: leaves = [] } = useQuery({
    queryKey: ['teacher-leaves'],
    queryFn: () => api.get('/leaves').then(r => r.data.data || []),
    staleTime: 60_000, retry: false,
  });
  const applyMut = useMutation({
    mutationFn: () => {
      if (new Date(form.toDate) < new Date(form.fromDate)) {
        throw new Error('To Date cannot be before From Date');
      }
      return api.post('/leaves', { ...form, type: form.type, leaveType: form.type });
    },
    onSuccess: () => { qc.invalidateQueries(['teacher-leaves']); setForm({ fromDate: todayStr(), toDate: todayStr(), type: 'Casual', reason: '' }); toast.success('Leave application submitted!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to submit leave'),
  });
  const sColor = s => ({ approved: '#15803D', rejected: '#DC2626', pending: '#B45309' }[(s || '').toLowerCase()] || '#B45309');
  const sBg    = s => ({ approved: '#DCFCE7', rejected: '#FEE2E2', pending: '#FEF3C7' }[(s || '').toLowerCase()] || '#FEF3C7');
  const iStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Leave Application</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Apply for leave and track your applications</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
        <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calendar size={16} color={NAVY} />
            <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Apply for Leave</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leave Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={iStyle}>
              {['Sick', 'Casual', 'Annual', 'Emergency', 'Maternity', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {[{ label: 'From Date', key: 'fromDate' }, { label: 'To Date', key: 'toDate' }].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
              <input type="date" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={iStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason</label>
            <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={4}
              placeholder="Briefly describe the reason for leave…" style={{ ...iStyle, resize: 'vertical' }} />
          </div>
          <button onClick={() => applyMut.mutate()} disabled={!form.reason || applyMut.isPending}
            style={{ width: '100%', padding: '10px', background: form.reason ? NAVY : '#E2E8F0', color: form.reason ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: form.reason ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Save size={15} />{applyMut.isPending ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>
        <div>
          <SectionTitle>Leave History</SectionTitle>
          {leaves.length === 0 ? (
            <div className="card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No leave applications found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaves.map((l, i) => (
                <div key={l.id || i} className="card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={18} color="#B45309" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY }}>{l.leaveType || l.type || 'Leave'}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{fmtDate(l.fromDate)} — {fmtDate(l.toDate)}{l.reason && <span style={{ marginLeft: 8 }}>· {l.reason.slice(0, 60)}{l.reason.length > 60 ? '…' : ''}</span>}</div>
                  </div>
                  <span style={{ background: sBg(l.status), color: sColor(l.status), padding: '4px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }}>{l.status || 'Pending'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: NOTICEBOARD
═══════════════════════════════════════════════════════════ */
function NoticeboardTab({ notices }) {
  const qc = useQueryClient();
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ title:'', message:'', priority:'normal' });

  const postMut = useMutation({
    mutationFn: () => api.post('/announcements', { ...form, targetRoles:['teacher','student','parent'] }),
    onSuccess: () => { qc.invalidateQueries(['noticeboard']); setShowPost(false); setForm({ title:'', message:'', priority:'normal' }); toast.success('Notice posted!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to post notice'),
  });

  const PRIORITY_COLORS = { normal:'#0073b7', high:'#d97706', urgent:'#dc2626' };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:NAVY }}>Noticeboard</div>
          <div style={{ color:'#64748B', fontSize:13, marginTop:3 }}>School announcements and notices</div>
        </div>
        <button onClick={() => setShowPost(s=>!s)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:NAVY, color:'white', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <Plus size={14}/> Post Notice
        </button>
      </div>

      {/* Post Notice Form */}
      {showPost && (
        <div className="card" style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 22px', marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:NAVY, marginBottom:12 }}>Post New Notice</div>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Notice title…" />
          </div>
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-input" rows={3} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Notice details…" />
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
            <label className="form-label" style={{ margin:0 }}>Priority:</label>
            {['normal','high','urgent'].map(p => (
              <button key={p} onClick={() => setForm({...form,priority:p})}
                style={{ padding:'5px 12px', borderRadius:6, border:`2px solid ${form.priority===p?PRIORITY_COLORS[p]:'#e2e8f0'}`, background:form.priority===p?PRIORITY_COLORS[p]+'12':'white', color:form.priority===p?PRIORITY_COLORS[p]:'#64748b', fontWeight:600, fontSize:12, cursor:'pointer', textTransform:'capitalize' }}>
                {p}
              </button>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowPost(false)}>Cancel</button>
              <button className="btn btn-teal btn-sm" onClick={() => postMut.mutate()} disabled={!form.title||!form.message||postMut.isPending}>
                {postMut.isPending?'Posting…':'Post Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notices.length === 0 ? (
        <div className="card" style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'64px', textAlign:'center', color:'#94A3B8' }}>
          <Bell size={40} style={{ opacity:0.3, marginBottom:12, display:'block', margin:'0 auto 12px' }} />
          <div style={{ fontWeight:700, fontSize:15, marginBottom:6, color:'#64748B' }}>No Notices Yet</div>
          <div style={{ fontSize:13 }}>Post a notice for students and parents</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {notices.map((n, i) => {
            const priority = n.priority || 'normal';
            const borderColor = PRIORITY_COLORS[priority] || NAVY;
            return (
              <div key={n.id || i} className="card" style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 22px', borderLeft:`4px solid ${borderColor}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                  <div style={{ fontWeight:700, fontSize:14.5, color:NAVY, marginBottom:6 }}>{n.title}</div>
                  {priority !== 'normal' && <span style={{ background:borderColor+'18', color:borderColor, fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:99, textTransform:'uppercase', flexShrink:0 }}>{priority}</span>}
                </div>
                <div style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{n.content || n.message || n.description}</div>
                <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:10 }}>Posted: {fmtDate(n.createdAt)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: PUBLISH RESULTS
═══════════════════════════════════════════════════════════ */
function ResultPublishTab({ classes, exams }) {
  const qc = useQueryClient();
  const [selectedExam, setSelectedExam] = useState('');

  const exam = exams?.find(e => e.id === parseInt(selectedExam));

  const { data: results = [] } = useQuery({
    queryKey: ['teacher-exam-results', selectedExam],
    queryFn: () => api.get(`/exams/${selectedExam}/results`).then(r => r.data.data || []).catch(() => []),
    enabled: !!selectedExam,
    staleTime: 60_000,
  });

  const publishMut = useMutation({
    mutationFn: () => api.put(`/exams/${selectedExam}`, { isPublished: true, status: 'results_published' }),
    onSuccess: () => { qc.invalidateQueries(['exams']); toast.success('Results published! Students and parents can now view them.'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to publish'),
  });

  const total   = results.length;
  const passed  = results.filter(r => !r.isAbsent && r.obtainedMarks >= (r.totalMarks * 0.4)).length;
  const absent  = results.filter(r => r.isAbsent).length;
  const failed  = total - passed - absent;

  const isPublished = exam?.isPublished || exam?.status === 'results_published';

  const inputStyle = { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13, fontFamily:'inherit', background:'#F8FAFC', outline:'none' };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, color:NAVY }}>Publish Results 📢</div>
        <div style={{ color:'#64748B', fontSize:13, marginTop:3 }}>Review and publish exam results — students and parents will be notified</div>
      </div>

      {/* Exam selector */}
      <div className="card" style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px 22px', marginBottom:16 }}>
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>Select Exam to Publish</label>
        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} style={inputStyle}>
          <option value="">-- Select an Exam --</option>
          {(exams||[]).map(e => (
            <option key={e.id} value={e.id}>{e.name || e.title} {e.isPublished ? '✅ Published' : '⏳ Not Published'}</option>
          ))}
        </select>
      </div>

      {selectedExam && (
        <>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Total', v:total, color:'#1B2F6E', bg:'#EFF6FF' },
              { label:'Passed', v:passed, color:'#15803D', bg:'#DCFCE7' },
              { label:'Failed', v:failed, color:'#DC2626', bg:'#FEE2E2' },
              { label:'Absent', v:absent, color:'#B45309', bg:'#FEF3C7' },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.v}</div>
                <div style={{ fontSize:12, color:s.color, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Publish action */}
          <div className="card" style={{ background: isPublished ? '#F0FDF9' : '#FFF', borderRadius:14, border:`1px solid ${isPublished?'#A7F3D0':'#E2E8F0'}`, padding:'20px 22px' }}>
            {isPublished ? (
              <div style={{ display:'flex', alignItems:'center', gap:12, color:'#15803D' }}>
                <div style={{ fontSize:32 }}>✅</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>Results Already Published!</div>
                  <div style={{ fontSize:13, marginTop:3 }}>Students and parents can view these results in their portals</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:NAVY, marginBottom:6 }}>Ready to Publish?</div>
                <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
                  Publishing will make results visible to ALL students and parents in their portals. This action cannot be undone easily.
                </div>
                <div style={{ background:'#FEF9C3', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12.5, color:'#92400E' }}>
                  ⚠️ Make sure ALL marks are entered before publishing. Once published, students can see their results.
                </div>
                <button onClick={() => publishMut.mutate()} disabled={total === 0 || publishMut.isPending}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 28px', background:NAVY, color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor: total===0 ? 'not-allowed' : 'pointer', opacity: total===0 ? 0.5 : 1 }}>
                  {publishMut.isPending ? '⏳ Publishing…' : '📢 Publish Results Now'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: CHANGE PASSWORD
═══════════════════════════════════════════════════════════ */
function PasswordTab() {
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const changeMut = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.password }),
    onSuccess: () => { setMsg({ type: 'success', text: 'Password changed successfully!' }); setForm({ current: '', password: '', confirm: '' }); },
    onError: err => setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password' }),
  });
  const valid = form.current && form.password && form.password === form.confirm && form.password.length >= 6;
  const iStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 440 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Change Password</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Update your account password</div>
      </div>
      <div className="card card-body" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '28px 24px' }}>
        {msg && (
          <div style={{ background: msg.type === 'success' ? '#DCFCE7' : '#FEE2E2', color: msg.type === 'success' ? '#15803D' : '#DC2626', padding: '12px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, marginBottom: 16 }}>{msg.text}</div>
        )}
        {[{ label: 'Current Password', key: 'current' }, { label: 'New Password', key: 'password' }, { label: 'Confirm Password', key: 'confirm' }].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
            <input type="password" value={form[f.key]} onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setMsg(null); }}
              placeholder={`Enter ${f.label.toLowerCase()}`} style={iStyle} />
          </div>
        ))}
        {form.password && form.confirm && form.password !== form.confirm && <div style={{ color: '#DC2626', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Passwords do not match</div>}
        {form.password && form.password.length > 0 && form.password.length < 6 && <div style={{ color: '#B45309', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Password must be at least 6 characters</div>}
        <button onClick={() => changeMut.mutate()} disabled={!valid || changeMut.isPending}
          style={{ width: '100%', padding: '11px', background: valid ? NAVY : '#E2E8F0', color: valid ? '#fff' : '#94A3B8', border: 'none', borderRadius: 9, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: valid ? 'pointer' : 'not-allowed' }}>
          {changeMut.isPending ? 'Changing…' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: VIDEO TUTORIALS
═══════════════════════════════════════════════════════════ */
function TutorialsTab() {
  const { data: tutorials = [] } = useQuery({
    queryKey: ['video-tutorials'],
    queryFn: () => api.get('/tutorials').then(r => r.data.data || []),
    staleTime: 300_000, retry: false,
  });
  const fallback = [
    { id: 1, title: 'How to Mark Attendance',   duration: '3:24', url: '#' },
    { id: 2, title: 'Entering Exam Marks',       duration: '4:10', url: '#' },
    { id: 3, title: 'Posting Homework Diary',    duration: '2:55', url: '#' },
    { id: 4, title: 'Uploading Study Materials', duration: '3:40', url: '#' },
    { id: 5, title: 'Applying for Leave',        duration: '2:15', url: '#' },
    { id: 6, title: 'Navigating the Portal',     duration: '5:00', url: '#' },
  ];
  const list = tutorials.length > 0 ? tutorials : fallback;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Video Tutorials</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Learn how to use the Teacher Portal</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {list.map((t, i) => (
          <a key={t.id || i} href={t.url || '#'} target="_blank" rel="noreferrer"
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', textDecoration: 'none', display: 'block', transition: 'box-shadow .15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px ${NAVY}25`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ height: 130, background: `linear-gradient(135deg,${NAVY},#2563EB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {t.thumbnail ? <img src={t.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Video size={36} color="rgba(255,255,255,0.6)" />}
              <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>{t.duration || '—'}</div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY, lineHeight: 1.4 }}>{t.title}</div>
              {t.description && <div style={{ fontSize: 12, color: '#64748B', marginTop: 5 }}>{t.description.slice(0, 80)}{t.description.length > 80 ? '…' : ''}</div>}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, color: CYAN, fontSize: 12.5, fontWeight: 700 }}>
                <Video size={13} />Watch Now
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
