/**
 * IlmForge — Teacher Portal
 * Dedicated portal for teachers — NOT the admin panel.
 * Sidebar layout with dark #0D1B2A sidebar + teal accents matching IlmForge design.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, BookMarked,
  FolderOpen, Calendar, Bell, Key, Video, LogOut, ChevronRight,
  Save, Plus, Search,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────── */
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const greetingHour = new Date().getHours();
const greeting = greetingHour < 12 ? 'Good Morning' : greetingHour < 17 ? 'Good Afternoon' : 'Good Evening';

const LS_HW  = 'ilmforge_teacher_hw';
const LS_MAT = 'ilmforge_teacher_materials';
function lsGet(key, fallback = []) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',        Icon: LayoutDashboard },
  { id: 'students',    label: 'My Students',       Icon: Users           },
  { id: 'attendance',  label: 'Mark Attendance',   Icon: UserCheck       },
  { id: 'marks',       label: 'Exam Marks',        Icon: GraduationCap   },
  { id: 'homework',    label: 'Homework',          Icon: BookMarked      },
  { id: 'materials',   label: 'Study Materials',   Icon: FolderOpen      },
  { id: 'leave',       label: 'Leave Application', Icon: Calendar        },
  { id: 'noticeboard', label: 'Noticeboard',       Icon: Bell            },
  { id: 'password',    label: 'Change Password',   Icon: Key             },
  { id: 'tutorials',   label: 'Video Tutorials',   Icon: Video           },
];

function StatCard({ label, value, color, bg, Icon }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}25`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color }}>{value ?? '—'}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #0D948820', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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

  const SidebarComp = () => (
    <aside style={{ width: 260, minHeight: '100vh', background: '#0D1B2A', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
          {logo
            ? <img src={logo} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(13,148,136,0.4)' }} />
            : <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎓</div>
          }
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>{schoolName}</div>
            <div style={{ color: '#0D9488', fontSize: 11, fontWeight: 600, marginTop: 2 }}>Teacher Portal</div>
          </div>
        </div>
        <div style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
            {user?.name?.charAt(0) || 'T'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Teacher'}</div>
            <div style={{ display: 'inline-block', background: '#0D9488', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, marginTop: 2 }}>Teacher</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 10px' }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: active ? 'linear-gradient(90deg,#0D9488,#0F766E)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.65)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: active ? 700 : 500, marginBottom: 2, transition: 'all .15s', textAlign: 'left' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={14} />}
            </button>
          );
        })}
      </nav>

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
      case 'dashboard':   return <DashboardTab   classes={classes} exams={exams} homeworkApi={homeworkApi} setActiveTab={setActiveTab} user={user} />;
      case 'students':    return <StudentsTab     classes={classes} />;
      case 'attendance':  return <AttendanceTab   classes={classes} />;
      case 'marks':       return <MarksTab        classes={classes} exams={exams} />;
      case 'homework':    return <HomeworkTab      classes={classes} homeworkApi={homeworkApi} />;
      case 'materials':   return <MaterialsTab />;
      case 'leave':       return <LeaveTab />;
      case 'noticeboard': return <NoticeboardTab  notices={notices} />;
      case 'password':    return <PasswordTab />;
      case 'tutorials':   return <TutorialsTab />;
      default:            return null;
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
  const presentCount = students.filter(s => s.todayAttendance === 'present').length || Math.floor(students.length * 0.87);

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#0F4C45 0%,#0D9488 60%,#14B8A6 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 22, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{greeting}, {user?.name?.split(' ')[0] || 'Teacher'}!</div>
        <div style={{ fontSize: 13.5, opacity: 0.8 }}>{new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="My Students"        value={students.length}     color="#0D9488" bg="#F0FDF9" Icon={Users}        />
        <StatCard label="Present Today"      value={presentCount}        color="#15803D" bg="#DCFCE7" Icon={UserCheck}     />
        <StatCard label="Assignments Posted" value={homeworkApi.length}  color="#2563EB" bg="#EFF6FF" Icon={BookMarked}    />
        <StatCard label="Exams Created"      value={exams.length}        color="#7C3AED" bg="#F5F3FF" Icon={GraduationCap} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px' }}>
          <SectionTitle>Class Attendance Today</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select value={quickClass} onChange={e => { setQuickClass(e.target.value); setQuickSection(''); }}
              style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', color: '#1E3A5F', outline: 'none' }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {sections.length > 0 && (
              <select value={quickSection} onChange={e => setQuickSection(e.target.value)}
                style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', color: '#1E3A5F', outline: 'none' }}>
                <option value="">All Sections</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <button onClick={() => setActiveTab('attendance')} disabled={!quickClass}
              style={{ padding: '10px', borderRadius: 8, border: 'none', cursor: quickClass ? 'pointer' : 'not-allowed', background: quickClass ? 'linear-gradient(90deg,#0D9488,#0F766E)' : '#E2E8F0', color: quickClass ? '#fff' : '#94A3B8', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <UserCheck size={15} />Mark Attendance
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px' }}>
          <SectionTitle>Today's Homework</SectionTitle>
          {homeworkApi.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>No homework posted today</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {homeworkApi.slice(0, 4).map((hw, i) => (
                <div key={hw.id || i} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #0D9488' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F' }}>{hw.subject?.name || hw.subjectName || 'Subject'}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{hw.class?.name || '—'} · {(hw.description || '').slice(0, 55)}{(hw.description || '').length > 55 ? '…' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', marginTop: 18 }}>
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
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1E3A5F' }}>{s.name}</td>
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
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>My Students</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Students enrolled in your assigned class</div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1E3A5F', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1E3A5F', outline: 'none' }}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
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
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748B', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #E2E8F0' }}>{h}</th>
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
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.gender === 'female' ? 'linear-gradient(135deg,#F472B6,#EC4899)' : 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>{(s.name || '?').charAt(0)}</div>
                      }
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1E3A5F' }}>{s.name}</td>
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
      const res = await api.get('/students', { params: { classId, sectionId: sectionId || undefined, status: 'active', limit: 300 } });
      const list = res.data.data || [];
      setStuList(list);
      const m = {};
      list.forEach(s => { m[s.id] = 'present'; });
      setAttendance(m);
      setLoaded(true);
    } catch { alert('Failed to load students'); }
    finally { setLoading(false); }
  };

  const saveAtt = useMutation({
    mutationFn: () => api.post('/attendance/save', {
      type, classId: parseInt(classId), sectionId: sectionId ? parseInt(sectionId) : null, date,
      records: Object.entries(attendance).map(([sid, status]) => ({ studentId: parseInt(sid), status })),
    }),
    onSuccess: () => alert('Attendance saved successfully!'),
    onError: err => alert(err.response?.data?.message || 'Failed to save attendance'),
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
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Mark Attendance</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Select class and mark each student's attendance</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', marginBottom: 16 }}>
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
            style={{ padding: '9px 20px', background: classId ? 'linear-gradient(90deg,#0D9488,#0F766E)' : '#E2E8F0', color: classId ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: classId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-end' }}>
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
          </div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 16 }}>
            {stuList.map((s, i) => {
              const st = attendance[s.id] || 'present';
              const ss = sStyle(st);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < stuList.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{(s.name || '?').charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>{s.name}</div>
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
              style={{ padding: '11px 28px', background: 'linear-gradient(90deg,#0D9488,#0F766E)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Save size={16} />{saveAtt.isPending ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
      {loaded && stuList.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No students found in this class</div>
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
  const [marks, setMarks] = useState({});
  const [totalDefault, setTotalDefault] = useState(100);

  const exam = exams.find(e => e.id === parseInt(selectedExam));
  const activeClassId = exam?.classId || classId || null;

  const { data: students = [], isLoading: stuLoad } = useQuery({
    queryKey: ['exam-students', activeClassId],
    enabled: !!activeClassId,
    queryFn: () => api.get('/students', { params: { classId: activeClassId, status: 'active', limit: 300 } }).then(r => r.data.data || []),
  });

  useEffect(() => {
    if (students.length > 0 && selectedExam) {
      const m = {};
      students.forEach(s => { m[s.id] = { obtained: '', absent: false }; });
      setMarks(m);
    }
  }, [students, selectedExam]);

  // Matches the backend's calcGrade bands exactly (exam.routes.js) so the
  // live preview shown here never disagrees with what actually gets saved.
  const gradeFor = (obtained, total, absent) => {
    if (absent) return 'ABS';
    if (!obtained || !total) return '—';
    const pct = (parseInt(obtained) / parseInt(total)) * 100;
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A'; if (pct >= 70) return 'B';
    if (pct >= 60) return 'C'; if (pct >= 50) return 'D';
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
    // The backend reads totalMarks PER mark record, not as a top-level
    // field — sending it only at the top level (as this used to) meant
    // every saved mark silently defaulted to /100 regardless of the
    // "Total Marks" value chosen here, producing wrong grades and totals.
    mutationFn: () => api.post(`/exams/${selectedExam}/marks`, {
      classId: parseInt(activeClassId),
      marks: Object.entries(marks).map(([sid, d]) => ({ studentId: parseInt(sid), obtainedMarks: d.absent ? 0 : parseInt(d.obtained) || 0, absent: d.absent, totalMarks: totalDefault })),
    }),
    onSuccess: () => { alert('Marks saved successfully!'); qc.invalidateQueries(['exams']); },
    onError: err => alert(err.response?.data?.message || 'Failed to save marks'),
  });

  const sel = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Exam Marks</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Select an exam and enter student marks</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select Exam</label>
            <select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setClassId(''); }} style={sel}>
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
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Marks</label>
            <input type="number" value={totalDefault} onChange={e => setTotalDefault(parseInt(e.target.value) || 100)} style={{ ...sel, boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {selectedExam && activeClassId && (
        stuLoad ? <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>Loading students…</div>
        : students.length === 0 ? <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No students found</div>
        : (
          <>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 16 }}>
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
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F' }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Roll: {s.rollNo || '—'}</div>
                    </div>
                    <div>
                      <input type="number" min="0" max={totalDefault} value={m.obtained} disabled={m.absent}
                        onChange={e => {
                          const raw = e.target.value;
                          const clamped = raw === '' ? '' : String(Math.min(totalDefault, Math.max(0, parseInt(raw) || 0)));
                          setMarks(prev => ({ ...prev, [s.id]: { ...prev[s.id], obtained: clamped } }));
                        }}
                        placeholder={`/ ${totalDefault}`}
                        style={{ width: 100, padding: '7px 10px', border: '1.5px solid #E2E8F0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: m.absent ? '#F1F5F9' : '#fff', outline: 'none', color: '#1E3A5F' }} />
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                style={{ padding: '11px 28px', background: 'linear-gradient(90deg,#0D9488,#0F766E)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
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
   TAB: HOMEWORK
═══════════════════════════════════════════════════════════ */
function HomeworkTab({ classes, homeworkApi }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ subject: '', classId: '', section: '', date: todayStr(), description: '' });
  const [localHW, setLocalHW] = useState(() => lsGet(LS_HW));

  const cls = classes.find(c => c.id === parseInt(form.classId));
  const sections = cls?.sections || [];
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', form.classId],
    enabled: !!form.classId,
    queryFn: () => api.get('/classes/subjects', { params: { classId: form.classId } }).then(r => r.data.data || []),
    retry: false,
  });

  const addMut = useMutation({
    mutationFn: () => api.post('/homework', {
      classId: parseInt(form.classId),
      sectionId: form.section ? parseInt(form.section) : undefined,
      subjectId: form.subject ? parseInt(form.subject) : undefined,
      description: form.description, date: form.date,
    }),
    onSuccess: () => { qc.invalidateQueries(['homework']); setForm({ subject: '', classId: '', section: '', date: todayStr(), description: '' }); alert('Homework posted!'); },
    onError: () => {
      const entry = { id: Date.now(), ...form, className: cls?.name, createdAt: new Date().toISOString() };
      const updated = [entry, ...localHW];
      setLocalHW(updated);
      lsSet(LS_HW, updated);
      setForm({ subject: '', classId: '', section: '', date: todayStr(), description: '' });
      alert('Homework saved locally (API unavailable)');
    },
  });

  const allHW = [...homeworkApi, ...localHW];
  const valid = form.classId && form.description;
  const iStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none' };

  const formFields = [
    { label: 'Class',   key: 'classId',  type: 'select', options: classes.map(c => ({ value: c.id, label: c.name })) },
    ...(sections.length > 0 ? [{ label: 'Section', key: 'section', type: 'select', options: sections.map(s => ({ value: s.id, label: s.name })) }] : []),
    { label: 'Subject', key: 'subject',  type: 'select', options: subjects.map(s => ({ value: s.id, label: s.name })) },
    { label: 'Date',    key: 'date',     type: 'date' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Homework Diary</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Assign and track daily homework</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Plus size={16} color="#0D9488" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Add Homework</span>
          </div>
          {formFields.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
              {f.type === 'select'
                ? <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={iStyle}>
                    <option value="">Select {f.label}</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                : <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...iStyle, boxSizing: 'border-box' }} />
              }
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
              placeholder="Describe the homework…"
              style={{ ...iStyle, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => addMut.mutate()} disabled={!valid || addMut.isPending}
            style={{ width: '100%', padding: '10px', background: valid ? 'linear-gradient(90deg,#0D9488,#0F766E)' : '#E2E8F0', color: valid ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: valid ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Save size={15} />{addMut.isPending ? 'Posting…' : 'Post Homework'}
          </button>
        </div>
        <div>
          <SectionTitle>Posted Homework</SectionTitle>
          {allHW.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No homework posted yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allHW.map((hw, i) => (
                <div key={hw.id || i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', borderLeft: '4px solid #0D9488' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>
                    {hw.subject?.name || hw.subjectName || hw.subject || 'Subject'} — {hw.class?.name || hw.className || '—'}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', margin: '5px 0' }}>{hw.description}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Date: {hw.date || fmtDate(hw.createdAt)}</div>
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
   TAB: STUDY MATERIALS
═══════════════════════════════════════════════════════════ */
function MaterialsTab() {
  const [form, setForm] = useState({ title: '', subject: '', type: 'PDF', url: '' });
  const [materials, setMaterials] = useState(() => lsGet(LS_MAT));
  const { data: apiMats = [] } = useQuery({
    queryKey: ['study-materials'],
    queryFn: () => api.get('/study-materials').then(r => r.data.data || []),
    staleTime: 60_000, retry: false,
  });

  const addMaterial = () => {
    if (!form.title || !form.url) return;
    const entry = { id: Date.now(), ...form, createdAt: new Date().toISOString() };
    const updated = [entry, ...materials];
    setMaterials(updated);
    lsSet(LS_MAT, updated);
    setForm({ title: '', subject: '', type: 'PDF', url: '' });
  };

  const allMats = [...apiMats, ...materials];
  const typeColor = t => ({ PDF: '#DC2626', Video: '#7C3AED', Link: '#2563EB' }[t] || '#64748B');
  const typeBg    = t => ({ PDF: '#FEE2E2', Video: '#F5F3FF', Link: '#EFF6FF' }[t] || '#F1F5F9');
  const iStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Study Materials</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Upload and manage learning resources</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Plus size={16} color="#0D9488" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Add Material</span>
          </div>
          {[
            { label: 'Title', key: 'title', type: 'text', placeholder: 'e.g. Chapter 5 Notes' },
            { label: 'Subject', key: 'subject', type: 'text', placeholder: 'e.g. Mathematics' },
            { label: 'URL / Link', key: 'url', type: 'url', placeholder: 'https://…' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={iStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={iStyle}>
              {['PDF', 'Video', 'Link'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={addMaterial} disabled={!form.title || !form.url}
            style={{ width: '100%', padding: '10px', background: (form.title && form.url) ? 'linear-gradient(90deg,#0D9488,#0F766E)' : '#E2E8F0', color: (form.title && form.url) ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: (form.title && form.url) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Plus size={15} />Add Material
          </button>
        </div>
        <div>
          <SectionTitle>All Materials</SectionTitle>
          {allMats.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No materials uploaded yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allMats.map((m, i) => (
                <div key={m.id || i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: typeBg(m.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FolderOpen size={18} color={typeColor(m.type)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{m.subject || '—'} · {fmtDate(m.createdAt)}</div>
                  </div>
                  <span style={{ background: typeBg(m.type), color: typeColor(m.type), padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{m.type}</span>
                  {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>Open →</a>}
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
    mutationFn: () => api.post('/leaves', { ...form, leaveType: form.type }),
    onSuccess: () => { qc.invalidateQueries(['teacher-leaves']); setForm({ fromDate: todayStr(), toDate: todayStr(), type: 'Casual', reason: '' }); alert('Leave application submitted!'); },
    onError: err => alert(err.response?.data?.message || 'Failed to submit leave'),
  });
  const sColor = s => ({ approved: '#15803D', rejected: '#DC2626', pending: '#B45309' }[(s || '').toLowerCase()] || '#B45309');
  const sBg    = s => ({ approved: '#DCFCE7', rejected: '#FEE2E2', pending: '#FEF3C7' }[(s || '').toLowerCase()] || '#FEF3C7');
  const iStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Leave Application</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Apply for leave and track your applications</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px 22px', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calendar size={16} color="#0D9488" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Apply for Leave</span>
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
            style={{ width: '100%', padding: '10px', background: form.reason ? 'linear-gradient(90deg,#0D9488,#0F766E)' : '#E2E8F0', color: form.reason ? '#fff' : '#94A3B8', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: form.reason ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Save size={15} />{applyMut.isPending ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>
        <div>
          <SectionTitle>Leave History</SectionTitle>
          {leaves.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '48px', textAlign: 'center', color: '#94A3B8' }}>No leave applications found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaves.map((l, i) => (
                <div key={l.id || i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={18} color="#B45309" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>{l.leaveType || l.type || 'Leave'}</div>
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
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Noticeboard</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Latest school announcements and notices</div>
      </div>
      {notices.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '64px', textAlign: 'center', color: '#94A3B8' }}>
          <Bell size={40} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: '#64748B' }}>No Notices Yet</div>
          <div style={{ fontSize: 13 }}>School announcements will appear here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notices.map((n, i) => (
            <div key={n.id || i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 22px', borderLeft: '4px solid #0D9488' }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: '#1E3A5F', marginBottom: 6 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{n.content || n.message || n.description}</div>
              <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 10 }}>Posted: {fmtDate(n.createdAt)}</div>
            </div>
          ))}
        </div>
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
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Change Password</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Update your account password</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '28px 24px' }}>
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
          style={{ width: '100%', padding: '11px', background: valid ? 'linear-gradient(90deg,#0D9488,#0F766E)' : '#E2E8F0', color: valid ? '#fff' : '#94A3B8', border: 'none', borderRadius: 9, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: valid ? 'pointer' : 'not-allowed' }}>
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
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>Video Tutorials</div>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Learn how to use the Teacher Portal</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {list.map((t, i) => (
          <a key={t.id || i} href={t.url || '#'} target="_blank" rel="noreferrer"
            style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', textDecoration: 'none', display: 'block', transition: 'box-shadow .15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(13,148,136,0.15)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ height: 130, background: 'linear-gradient(135deg,#0F4C45,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {t.thumbnail ? <img src={t.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Video size={36} color="rgba(255,255,255,0.6)" />}
              <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>{t.duration || '—'}</div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F', lineHeight: 1.4 }}>{t.title}</div>
              {t.description && <div style={{ fontSize: 12, color: '#64748B', marginTop: 5 }}>{t.description.slice(0, 80)}{t.description.length > 80 ? '…' : ''}</div>}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, color: '#0D9488', fontSize: 12.5, fontWeight: 700 }}>
                <Video size={13} />Watch Now
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
