/**
 * IlmForge — Student Portal  (Enterprise Theme)
 * Top header: dark navy #1B2F6E
 * Bottom nav active: #00c0ef (cyan)
 * Stat cards: Attendance (stat-green), Fee Due (stat-red), Exams (stat-blue)
 * Mobile-first design with bottom navigation bar.
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';
import {
  Home, DollarSign, Award, BookOpen,
  User, ChevronRight, Download, Bell,
  FileText, Calendar, Library, ChevronLeft,
  ExternalLink, X, Clock,
} from 'lucide-react';

/* ── Enterprise theme tokens ─────────────────────────────── */
const NAVY = '#1B2F6E';
const CYAN = '#00c0ef';

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');

const fmtDate = d =>
  d
    ? new Date(d).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

const statusBadge = s => {
  const m = {
    paid:    { bg: '#DCFCE7', c: '#15803D' },
    unpaid:  { bg: '#FEE2E2', c: '#B91C1C' },
    partial: { bg: '#FEF3C7', c: '#B45309' },
  };
  return m[s] || m.unpaid;
};

const gradeColor = pct => {
  if (pct >= 90) return { c: '#15803D', bg: '#DCFCE7', label: 'A+' };
  if (pct >= 80) return { c: '#1D4ED8', bg: '#DBEAFE', label: 'A'  };
  if (pct >= 70) return { c: '#0F766E', bg: '#CCFBF1', label: 'B'  };
  if (pct >= 60) return { c: '#B45309', bg: '#FEF3C7', label: 'C'  };
  if (pct >= 40) return { c: '#EA580C', bg: '#FFF7ED', label: 'D'  };
  return            { c: '#B91C1C', bg: '#FEE2E2', label: 'F' };
};

const divisionLabel = pct => {
  if (pct >= 60) return { text: 'First Division',  c: '#15803D', bg: '#DCFCE7' };
  if (pct >= 45) return { text: 'Second Division', c: '#1D4ED8', bg: '#DBEAFE' };
  if (pct >= 33) return { text: 'Third Division',  c: '#B45309', bg: '#FEF3C7' };
  return               { text: 'Fail',             c: '#B91C1C', bg: '#FEE2E2' };
};

const ATTEND_STATUS = {
  P:  { bg: '#DCFCE7', c: '#15803D', dot: '#16A34A', label: 'Present' },
  A:  { bg: '#FEE2E2', c: '#B91C1C', dot: '#DC2626', label: 'Absent'  },
  L:  { bg: '#FEF9C3', c: '#854D0E', dot: '#CA8A04', label: 'Leave'   },
  Lt: { bg: '#FFF7ED', c: '#C2410C', dot: '#EA580C', label: 'Late'    },
};

const MATERIAL_TYPE_BADGE = {
  pdf:   { bg: '#FEE2E2', c: '#B91C1C', icon: '📄', label: 'PDF'   },
  video: { bg: '#DBEAFE', c: '#1D4ED8', icon: '🎬', label: 'Video' },
  link:  { bg: '#F3E8FF', c: '#7C3AED', icon: '🔗', label: 'Link'  },
  doc:   { bg: '#FFF7ED', c: '#C2410C', icon: '📝', label: 'Doc'   },
  image: { bg: '#F0FDF4', c: '#15803D', icon: '🖼', label: 'Image' },
};
const materialTypeBadge = t =>
  MATERIAL_TYPE_BADGE[(t || '').toLowerCase()] || MATERIAL_TYPE_BADGE.link;

const STUDENT_TIPS = [
  'Review your notes within 24 hours of class to retain 80% more.',
  'Break your study sessions into 25-minute focused blocks (Pomodoro technique).',
  'Teaching a concept to someone else is the best way to master it.',
  'Regular sleep improves memory consolidation and exam performance.',
  'Ask questions in class — curiosity is the engine of learning.',
  'Set weekly goals and track your progress every Sunday.',
  'Read ahead before each class so discussions make more sense.',
];

/* ─────────────────────────────────────────────────────────
   BOTTOM NAV ITEMS
───────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'home',       label: 'Home',       Icon: Home       },
  { id: 'fees',       label: 'My Fees',    Icon: DollarSign },
  { id: 'results',    label: 'Results',    Icon: Award      },
  { id: 'homework',   label: 'Homework',   Icon: BookOpen   },
  { id: 'attendance', label: 'Attend.',    Icon: Calendar   },
  { id: 'materials',  label: 'Materials',  Icon: Library    },
];

/* ─────────────────────────────────────────────────────────
   SHARED CARD STYLE
───────────────────────────────────────────────────────── */
const card = {
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #E5E7EB',
  padding: '16px 18px',
  marginBottom: 12,
};

/* ─────────────────────────────────────────────────────────
   ATTENDANCE CALENDAR
───────────────────────────────────────────────────────── */
/* ─── Student Leave Tab ──────────────────────────────────── */
function StudentLeaveTab({ student, card, NAVY, CYAN }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], reason:'', leaveType:'Sick Leave' });

  const { data: leaves = [] } = useQuery({
    queryKey: ['student-leaves', student?.id],
    queryFn: () => api.get('/leaves', { params:{ studentId: student?.id, limit:20 } }).then(r => r.data.data || []).catch(() => []),
    enabled: !!student?.id,
  });

  const applyMut = useMutation({
    mutationFn: () => {
      if (new Date(form.toDate) < new Date(form.fromDate)) throw new Error('End date must be after start date');
      if (!form.reason.trim()) throw new Error('Reason is required');
      return api.post('/leaves', { ...form, studentId: student?.id, applicantType:'student', applicantId: student?.id });
    },
    onSuccess: () => { qc.invalidateQueries(['student-leaves']); setForm({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], reason:'', leaveType:'Sick Leave' }); },
    onError: err => alert(err.message || err.response?.data?.message || 'Failed'),
  });

  const STATUS_COLORS = { pending:{ bg:'#FEF3C7', c:'#B45309' }, approved:{ bg:'#DCFCE7', c:'#15803D' }, rejected:{ bg:'#FEE2E2', c:'#B91C1C' } };
  const fmtD = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short' }) : '—';

  return (
    <div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:16, color:NAVY }}>Apply for Leave</div>
        <div style={{ fontSize:12.5, color:'#6B7280' }}>Request absence permission from school</div>
      </div>

      <div style={{ ...card, marginBottom:12 }}>
        <div className="form-group">
          <label style={{ fontSize:12, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Leave Type</label>
          <select style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13 }} value={form.leaveType} onChange={e => setForm({...form,leaveType:e.target.value})}>
            {['Sick Leave','Family Emergency','Personal Work','Religious Holiday','Travel','Other'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>From Date</label>
            <input type="date" style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13 }} value={form.fromDate} onChange={e => setForm({...form,fromDate:e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>To Date</label>
            <input type="date" style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13 }} value={form.toDate} onChange={e => setForm({...form,toDate:e.target.value})} />
          </div>
        </div>
        <div style={{ marginTop:10 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Reason *</label>
          <textarea style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:13, resize:'vertical', minHeight:60 }} placeholder="Explain your reason…" value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} />
        </div>
        <button onClick={() => applyMut.mutate()} disabled={applyMut.isPending}
          style={{ marginTop:12, width:'100%', padding:'11px', background:NAVY, color:'white', border:'none', borderRadius:9, fontWeight:700, fontSize:14, cursor:'pointer' }}>
          {applyMut.isPending ? '⏳ Submitting…' : '📤 Submit Leave Request'}
        </button>
      </div>

      <div style={{ fontWeight:700, fontSize:14, color:NAVY, marginBottom:8 }}>My Leave History</div>
      {leaves.length === 0
        ? <div style={{ ...card, textAlign:'center', color:'#94A3B8', padding:24 }}>No leave applications yet</div>
        : leaves.map(l => {
          const sc = STATUS_COLORS[l.status?.toLowerCase()] || STATUS_COLORS.pending;
          return (
            <div key={l.id} style={{ ...card, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:NAVY }}>{l.leaveType||l.type||'Leave'}</div>
                <div style={{ fontSize:12, color:'#64748B' }}>{fmtD(l.fromDate)} — {fmtD(l.toDate)} · {(l.reason||'').slice(0,50)}</div>
              </div>
              <span style={{ background:sc.bg, color:sc.c, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, flexShrink:0 }}>{l.status||'Pending'}</span>
            </div>
          );
        })
      }
    </div>
  );
}

function AttendanceCalendar({ history = [] }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const byDate = {};
  history.forEach(r => {
    const key = r.date?.split('T')[0];
    if (key) byDate[key] = r;
  });

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month + 1, 0).getDate();
  const cells     = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMo; d++) cells.push(d);

  const mPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthRecs = history.filter(r => (r.date || '').startsWith(mPrefix));
  const tally = { P: 0, A: 0, L: 0, Lt: 0 };
  monthRecs.forEach(r => { if (tally[r.status] !== undefined) tally[r.status]++; });
  const total = tally.P + tally.A + tally.L + tally.Lt;
  const pct   = total ? Math.round((tally.P / total) * 100) : null;

  const sortedDates = history
    .filter(r => r.status === 'P')
    .map(r => r.date?.split('T')[0])
    .filter(Boolean)
    .sort()
    .reverse();

  let streak = 0;
  let cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  for (const ds of sortedDates) {
    const d = new Date(ds + 'T00:00:00');
    if (d.getTime() === cursor.getTime()) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d < cursor) {
      break;
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleString('en-PK', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={16} color={NAVY} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={16} color={NAVY} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`blank-${idx}`} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const rec = byDate[key];
          const st  = rec ? ATTEND_STATUS[rec.status] : null;
          const isToday = key === today.toISOString().split('T')[0];

          return (
            <div key={key} style={{
              aspectRatio: '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              background: st ? st.bg : '#F8FAFC',
              border: isToday ? `2px solid ${NAVY}` : '1px solid transparent',
              position: 'relative',
            }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: st ? st.c : '#CBD5E1' }}>{day}</span>
              {st && (
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot, marginTop: 2 }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
        {Object.entries(ATTEND_STATUS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.dot }} />
            <span style={{ color: '#6B7280' }}>{v.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#CBD5E1' }} />
          <span style={{ color: '#6B7280' }}>No Record</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 14 }}>
        {[
          { key: 'P',  label: 'Present' },
          { key: 'A',  label: 'Absent'  },
          { key: 'L',  label: 'Leave'   },
          { key: 'Lt', label: 'Late'    },
        ].map(({ key, label }) => {
          const st = ATTEND_STATUS[key];
          return (
            <div key={key} style={{ background: st.bg, borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: st.c }}>{tally[key]}</div>
              <div style={{ fontSize: 10.5, color: st.c, fontWeight: 600 }}>{label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {pct !== null && (
          <div style={{ flex: 1, background: pct >= 70 ? '#DCFCE7' : '#FEE2E2', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: pct >= 70 ? '#15803D' : '#B91C1C' }}>This Month</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: pct >= 70 ? '#15803D' : '#B91C1C' }}>{pct}%</span>
          </div>
        )}
        {streak > 0 && (
          <div style={{ flex: 1, background: '#FFF7ED', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#C2410C' }}>Streak</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#C2410C' }}>🔥{streak}d</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PROFILE SLIDE-OUT PANEL
───────────────────────────────────────────────────────── */
function ProfilePanel({ open, onClose, student, rollNo, schoolName, studentPhoto }) {
  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(360px, 92vw)',
        background: '#F0F4F8',
        zIndex: 201,
        overflowY: 'auto',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
      }}>
        {/* Panel header — dark navy */}
        <div style={{ background: NAVY, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>My Profile</span>
          <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.15)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        <div style={{ padding: '16px 14px' }}>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px', marginBottom: 12 }}>
            {studentPhoto
              ? <img src={studentPhoto} alt="" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${NAVY}`, marginBottom: 14 }} />
              : (
                <div style={{ width: 90, height: 90, borderRadius: '50%', background: student?.gender === 'female' ? 'linear-gradient(135deg,#F472B6,#EC4899)' : `linear-gradient(135deg,${NAVY},#2563EB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 36, border: '4px solid #E5E7EB', marginBottom: 14 }}>
                  {student?.name?.charAt(0) || '?'}
                </div>
              )
            }
            <div style={{ fontWeight: 800, fontSize: 19, color: NAVY }}>{student?.name || '—'}</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
              {student?.class?.name}{student?.section?.name ? ` · Sec ${student.section.name}` : ''}
            </div>
            <div style={{ fontSize: 12.5, color: CYAN, fontWeight: 700, marginTop: 3 }}>
              Roll No: {student?.rollNo || rollNo || '—'}
            </div>
          </div>

          {student && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {[
                { label: 'Full Name',     value: student.name },
                { label: 'Roll Number',   value: student.rollNo || rollNo },
                { label: 'Father Name',   value: student.fatherName },
                { label: 'Class',         value: student.class?.name },
                { label: 'Section',       value: student.section?.name },
                { label: 'Gender',        value: student.gender?.charAt(0).toUpperCase() + student.gender?.slice(1) },
                { label: 'Date of Birth', value: fmtDate(student.dob || student.dateOfBirth) },
                { label: 'Address',       value: student.address },
                { label: 'Phone',         value: student.phone || student.contactPhone },
                { label: 'Blood Group',   value: student.bloodGroup },
              ].filter(f => f.value).map((field, i, arr) => (
                <div key={field.label} style={{
                  padding: '12px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 108, fontSize: 12, fontWeight: 600, color: '#94A3B8', flexShrink: 0 }}>{field.label}</div>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: NAVY }}>{field.value}</div>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/profile"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
              padding: '14px 16px', marginTop: 4, textDecoration: 'none', color: NAVY,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={16} color={NAVY} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Change Password</span>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </Link>

          <div style={{ textAlign: 'center', marginTop: 18, color: '#94A3B8', fontSize: 11.5 }}>
            {schoolName} · Powered by IlmForge
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export default function StudentPortalPage() {
  const { user } = useAuthStore();
  const [activeTab,    setActiveTab]    = useState('home');
  const [tipIndex,     setTipIndex]     = useState(0);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [matSubFilter, setMatSubFilter] = useState('all');

  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % STUDENT_TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const logo       = localStorage.getItem('schoolLogoPreview');
  const rollNo = user?.rollNo || user?.username || '';

  // Backend auto-filters by userId for student role — no search param needed
  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['portal-student', user?.id],
    queryFn:  () =>
      api.get('/students', { params: { limit: 1 } })
         .then(r => (r.data.data || [])[0] || null),
    enabled:   !!user?.id,
    staleTime: 120_000,
  });

  const student   = studentData;
  const studentId = student?.id;
  const classId   = student?.classId || student?.class?.id;
  const sectionId = student?.sectionId || student?.section?.id;
  const studentPhoto = student?.photo || student?.photoUrl || student?.profilePhoto || null;

  const { data: feeData } = useQuery({
    queryKey: ['portal-fees', studentId],
    queryFn:  () => api.get('/fees/student/' + studentId).then(r => r.data.data),
    enabled:   !!studentId,
    staleTime: 60_000,
  });
  const invoices  = feeData?.invoices || [];
  const totalDue  = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.dueAmount || 0), 0);
  const unpaidCnt = invoices.filter(i => i.status !== 'paid').length;

  const { data: examsRaw = [] } = useQuery({
    queryKey: ['portal-exams'],
    queryFn:  () => api.get('/exams').then(r => r.data.data || []),
    staleTime: 120_000,
  });
  // Show exams that are published OR have marks already entered (status=completed)
  const exams = examsRaw.filter(e => e.isPublished === true || e.status === 'completed' || e.status === 'results_published');

  const { data: hwRaw = [] } = useQuery({
    queryKey: ['portal-homework', classId],
    queryFn:  () =>
      api.get('/homework', { params: { classId, limit: 30 } }).then(r => r.data.data || []),
    enabled:   !!classId,
    staleTime: 60_000,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['portal-announcements'],
    queryFn:  () => api.get('/announcements').then(r => r.data.data || []).catch(() => []),
    staleTime: 120_000,
  });

  const { data: attendSummary } = useQuery({
    queryKey: ['portal-attend-summary', studentId],
    queryFn:  () => api.get('/attendance/summary', { params: { studentId } }).then(r => r.data.data),
    enabled:   !!studentId,
    staleTime: 60_000,
  });
  const attendPct = attendSummary?.percentage ?? attendSummary?.attendancePercent ?? student?.attendancePercent ?? null;

  const STATUS_MAP = { present: 'P', absent: 'A', leave: 'L', late: 'Lt' };
  const { data: attendHistory = [], isLoading: attendLoading } = useQuery({
    queryKey: ['portal-attend-history', studentId],
    queryFn:  () =>
      api.get(`/attendance/student/${studentId}/history`).then(r => {
        const raw = r.data.records || r.data.data || [];
        return raw.map(rec => ({
          ...rec,
          status: STATUS_MAP[rec.status] || rec.status,
        }));
      }),
    enabled:   !!studentId,
    staleTime: 60_000,
  });

  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const { data: timetableRaw = [] } = useQuery({
    queryKey: ['portal-timetable', classId, sectionId],
    queryFn:  () =>
      api.get('/timetable', { params: { classId, sectionId } })
         .then(r => r.data.data || []).catch(() => []),
    enabled:   !!classId,
    staleTime: 300_000,
  });
  const todaySlots = timetableRaw
    .filter(s => !s.day || s.day?.toLowerCase() === todayDayName.toLowerCase())
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  // Weekly timetable grouped by day
  const weeklyTimetable = WEEK_DAYS.reduce((acc, day) => {
    acc[day] = timetableRaw.filter(s => s.day?.toLowerCase() === day.toLowerCase()).sort((a,b) => (a.startTime||'').localeCompare(b.startTime||''));
    return acc;
  }, {});

  const { data: materialsRaw = [], isLoading: matsLoading } = useQuery({
    queryKey: ['portal-materials', classId, sectionId],
    queryFn:  () =>
      api.get('/study-materials', { params: { classId, sectionId } })
         .then(r => r.data.data || []),
    enabled:   !!classId,
    staleTime: 120_000,
  });

  const hwByDate = hwRaw.reduce((acc, h) => {
    const d = h.date?.split('T')[0] || fmtDate(h.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(h);
    return acc;
  }, {});
  const hwDates = Object.keys(hwByDate).sort((a, b) => b.localeCompare(a));

  const matSubjects = ['all', ...new Set(
    materialsRaw
      .map(m => m.subject?.name || m.subjectName || '')
      .filter(Boolean)
  )];

  const filteredMats = matSubFilter === 'all'
    ? materialsRaw
    : materialsRaw.filter(m => (m.subject?.name || m.subjectName || '') === matSubFilter);

  const matsBySubject = filteredMats.reduce((acc, m) => {
    const sub = m.subject?.name || m.subjectName || 'General';
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(m);
    return acc;
  }, {});

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0F4F8',
      fontFamily: "'Inter', system-ui, sans-serif",
      paddingBottom: 72,
    }}>
      {/* Messenger FAB */}
      <a
        href="/chat"
        style={{
          position: 'fixed', bottom: 80, right: 18, zIndex: 60,
          width: 50, height: 50, borderRadius: '50%',
          background: CYAN, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px ${CYAN}55`,
          textDecoration: 'none', fontSize: 20,
        }}
        title="Messages"
      >
        💬
      </a>

      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        student={student}
        rollNo={rollNo}
        schoolName={schoolName}
        studentPhoto={studentPhoto}
      />

      {/* ─── TOP HEADER (dark navy) ─── */}
      <div style={{
        background: NAVY,
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}>
        {logo
          ? <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎓</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5 }}>
            Student Portal
            {student && <> &nbsp;·&nbsp; <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{student.name}</strong></>}
          </div>
        </div>

        {/* Avatar */}
        <button
          onClick={() => setProfileOpen(true)}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          title="View Profile"
        >
          {studentPhoto
            ? <img src={studentPhoto} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }} />
            : (
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: student?.gender === 'female'
                  ? 'linear-gradient(135deg,#F472B6,#EC4899)'
                  : `linear-gradient(135deg,${NAVY},#2563EB)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 16,
                border: '2px solid rgba(255,255,255,0.4)',
              }}>
                {student?.name?.charAt(0) || <User size={18} color="#fff" />}
              </div>
            )
          }
        </button>

        {/* Class/roll badge */}
        {student && (
          <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '5px 10px', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{student.class?.name || '—'}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10.5 }}>Roll #{student.rollNo || rollNo || '—'}</div>
          </div>
        )}
      </div>

      {/* ─── MAIN SCROLL AREA ─── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 14px 0' }}>

        {studentLoading && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#6B7280' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>Loading your portal…</div>
          </div>
        )}

        {!studentLoading && !student && (
          <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: NAVY, marginBottom: 8 }}>Student Record Not Found</div>
            <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.6 }}>
              We could not find a student record linked to your login ({rollNo || 'no roll number'}).<br />
              Please contact your school admin.
            </p>
          </div>
        )}

        {/* ══ TAB: HOME ══ */}
        {activeTab === 'home' && student && (
          <div>
            {/* Welcome banner */}
            <div style={{
              background: `linear-gradient(135deg,${NAVY} 0%,#0073b7 100%)`,
              borderRadius: 16, padding: '20px 22px', marginBottom: 12,
              color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: -30, right: 30, width: 70, height: 70, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
              <div style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 4 }}>
                {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 2 }}>
                Welcome back, {student.name?.split(' ')[0]}! 👋
              </div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                {student.class?.name}{student.section?.name ? ` — ${student.section.name}` : ''} &nbsp;·&nbsp; Roll #{student.rollNo || rollNo}
              </div>
            </div>

            {/* Student info card */}
            <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'center' }}>
              {studentPhoto
                ? <img src={studentPhoto} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${NAVY}`, flexShrink: 0 }} />
                : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: student.gender === 'female' ? 'linear-gradient(135deg,#F472B6,#EC4899)' : `linear-gradient(135deg,${NAVY},#2563EB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, border: '3px solid #E5E7EB', flexShrink: 0 }}>
                    {student.name?.charAt(0)}
                  </div>
                )
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: NAVY, marginBottom: 3 }}>{student.name}</div>
                <div style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.7 }}>
                  <span>Roll No: <strong style={{ color: CYAN }}>{student.rollNo || rollNo || '—'}</strong></span>
                  {' · '}
                  <span>Class: <strong style={{ color: NAVY }}>{student.class?.name || '—'}</strong></span>
                  {student.section?.name && <span>{' · '}<strong>Sec {student.section.name}</strong></span>}
                </div>
                {student.fatherName && (
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Father: {student.fatherName}</div>
                )}
              </div>
            </div>

            {/* Quick stats — AdminLTE-style solid colorful cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                {
                  label: 'Attendance',
                  value: attendPct != null ? `${attendPct}%` : '—',
                  color: '#fff',
                  bg:    '#00a65a',
                  icon:  '✅',
                  preset: 'stat-green',
                  onClick: () => setActiveTab('attendance'),
                },
                {
                  label: 'Fee Due',
                  value: totalDue > 0 ? Rs(totalDue) : 'Nil',
                  color: '#fff',
                  bg:    '#dd4b39',
                  icon:  totalDue > 0 ? '⚠️' : '✔️',
                  preset: 'stat-red',
                  onClick: () => setActiveTab('fees'),
                },
                {
                  label: 'Exams',
                  value: exams.length,
                  color: '#fff',
                  bg:    '#0073b7',
                  icon:  '📝',
                  preset: 'stat-blue',
                  onClick: () => setActiveTab('results'),
                },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={s.onClick}
                  className={`stat-card ${s.preset}`}
                  style={{
                    background: s.bg, borderRadius: 12, padding: '12px 10px',
                    textAlign: 'center', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 3, opacity: 0.85 }}>{s.label}</div>
                </button>
              ))}
            </div>

            {/* Today's timetable + weekly view toggle */}
            {timetableRaw.length > 0 && (
              <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={15} color={NAVY} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Today's Classes</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{todayDayName}</span>
                </div>
                {todaySlots.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No classes today 🎉</div>
                ) : todaySlots.map((slot, i) => (
                  <div key={slot.id || i} style={{ padding: '10px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${NAVY}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>📚</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{slot.subject?.name || slot.subjectName || 'Subject'}</div>
                      <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>
                        {slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : ''}
                        {slot.teacher?.name || slot.teacherName ? ` · ${slot.teacher?.name || slot.teacherName}` : ''}
                        {slot.room ? ` · Room ${slot.room}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Weekly timetable strip */}
                <div style={{ padding: '10px 12px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, overflowX: 'auto' }}>
                  {WEEK_DAYS.map(day => {
                    const slots = weeklyTimetable[day] || [];
                    const isToday = day.toLowerCase() === todayDayName.toLowerCase();
                    return (
                      <div key={day} style={{ flex: '0 0 auto', minWidth: 70, background: isToday ? NAVY : 'white', border: `1px solid ${isToday ? NAVY : '#e2e8f0'}`, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? '#93c5fd' : '#94a3b8', textTransform: 'uppercase' }}>{day.slice(0, 3)}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: isToday ? 'white' : '#1e3a5f', margin: '2px 0' }}>{slots.length}</div>
                        <div style={{ fontSize: 9.5, color: isToday ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>class{slots.length !== 1 ? 'es' : ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rotating tip */}
            <div style={{ background: `${NAVY}0D`, border: `1px solid ${NAVY}20`, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Did You Know?</div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{STUDENT_TIPS[tipIndex]}</div>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} color={NAVY} />
                <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Announcements</span>
              </div>
              {announcements.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: '#94A3B8' }}>
                  <Bell size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13 }}>No announcements yet</div>
                </div>
              ) : (
                announcements.slice(0, 5).map((ann, i) => (
                  <div key={ann.id || i} style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: ann.priority === 'high' ? '#FEE2E2' : `${NAVY}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bell size={15} color={ann.priority === 'high' ? '#B91C1C' : NAVY} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 2 }}>{ann.title}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ann.body}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{fmtDate(ann.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: MY FEES ══ */}
        {activeTab === 'fees' && student && (
          <div>
            <div style={{
              background: totalDue > 0 ? 'linear-gradient(135deg,#B91C1C,#DC2626)' : 'linear-gradient(135deg,#15803D,#16A34A)',
              borderRadius: 14, padding: '18px 20px', marginBottom: 12,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 12.5, opacity: 0.8, marginBottom: 3 }}>{totalDue > 0 ? 'Total Amount Due' : 'All Fees Paid'}</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{totalDue > 0 ? Rs(totalDue) : '✔ Clear'}</div>
                {unpaidCnt > 0 && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>{unpaidCnt} unpaid invoice{unpaidCnt !== 1 ? 's' : ''}</div>}
              </div>
              <DollarSign size={40} style={{ opacity: 0.3 }} />
            </div>

            <a
              href={`/fee-voucher?roll=${encodeURIComponent(student.rollNo || rollNo || '')}`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: NAVY, color: '#fff', borderRadius: 10,
                padding: '11px 18px', fontWeight: 700, fontSize: 14,
                textDecoration: 'none', marginBottom: 12,
              }}
            >
              <Download size={15} /> Download Fee Voucher
            </a>

            {invoices.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#94A3B8' }}>
                <FileText size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No fee records found</div>
                <div style={{ fontSize: 12 }}>Your invoices will appear here once generated by admin.</div>
              </div>
            ) : (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Fee Invoices</span>
                  <span style={{ marginLeft: 8, background: '#F1F5F9', color: '#6B7280', borderRadius: 99, padding: '2px 9px', fontSize: 11.5, fontWeight: 600 }}>{invoices.length}</span>
                </div>
                {invoices.map((inv, i) => {
                  const bd = statusBadge(inv.status);
                  return (
                    <div key={inv.id || i} style={{ padding: '13px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: bd.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <DollarSign size={17} color={bd.c} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY }}>{inv.feeTitle || 'Monthly Fee'}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                          {inv.month && inv.year ? `${inv.month}/${inv.year}` : fmtDate(inv.createdAt)}
                          {' · '}Total: <strong style={{ color: NAVY }}>{Rs(inv.totalAmount)}</strong>
                          {inv.dueAmount > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}> · Due: {Rs(inv.dueAmount)}</span>}
                        </div>
                      </div>
                      <span style={{ background: bd.bg, color: bd.c, padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }}>
                        {inv.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
              <p style={{ margin: 0, color: '#1D4ED8', fontSize: 12.5, lineHeight: 1.6 }}>
                ℹ️ To pay fees, please visit the school office or contact them directly.
              </p>
            </div>
          </div>
        )}

        {/* ══ TAB: RESULTS ══ */}
        {activeTab === 'results' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>Exam Results</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>Published results only</div>
            </div>

            {exams.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#94A3B8' }}>
                <Award size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No results yet</div>
                <div style={{ fontSize: 12 }}>Your exam results will appear here once published by your teacher.</div>
              </div>
            ) : (
              exams.map((exam, i) => {
                const marksArr = exam.marks || exam.subjectMarks || [];
                const hasBreakdown = Array.isArray(marksArr) && marksArr.length > 0;

                const obtained = exam.obtainedMarks ?? exam.marks ?? null;
                const total    = exam.totalMarks   ?? exam.total ?? 100;
                const obtainedNum = hasBreakdown
                  ? marksArr.reduce((s, m) => s + (m.obtainedMarks ?? m.obtained ?? 0), 0)
                  : (typeof obtained === 'number' ? obtained : null);
                const totalNum = hasBreakdown
                  ? marksArr.reduce((s, m) => s + (m.totalMarks ?? m.total ?? 0), 0)
                  : (typeof total === 'number' ? total : 100);

                const pct  = obtainedNum != null && totalNum > 0
                  ? Math.round((obtainedNum / totalNum) * 100)
                  : null;
                const gc   = pct != null ? gradeColor(pct) : { c: '#94A3B8', bg: '#F1F5F9', label: '—' };
                const div  = pct != null ? divisionLabel(pct) : null;
                const passed = pct != null ? pct >= 33 : null;

                return (
                  <div key={exam.id || i} style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: hasBreakdown ? '1px solid #F1F5F9' : 'none' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: gc.bg, color: gc.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17, flexShrink: 0, border: `2px solid ${gc.c}30` }}>
                        {gc.label}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, marginBottom: 2 }}>
                          {exam.title || exam.examTitle || 'Exam'}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {exam.subject?.name || exam.subjectName || 'All Subjects'}
                          {' · '}{fmtDate(exam.date || exam.examDate || exam.createdAt)}
                        </div>
                        {obtainedNum != null && (
                          <div style={{ fontSize: 12.5, marginTop: 3, fontWeight: 700 }}>
                            <span style={{ color: gc.c }}>{obtainedNum}</span>
                            <span style={{ color: '#94A3B8' }}>/{totalNum} &nbsp;({pct}%)</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        {passed != null && (
                          <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: passed ? '#DCFCE7' : '#FEE2E2', color: passed ? '#15803D' : '#B91C1C' }}>
                            {passed ? 'Pass' : 'Fail'}
                          </span>
                        )}
                        {div && (
                          <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: div.bg, color: div.c }}>
                            {div.text}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasBreakdown && (
                      <div style={{ background: '#F8FAFC' }}>
                        {marksArr.map((m, j) => {
                          const subObt   = m.obtainedMarks ?? m.obtained ?? null;
                          const subTotal = m.totalMarks    ?? m.total    ?? 100;
                          const subPct   = subObt != null ? Math.round((subObt / subTotal) * 100) : null;
                          const subGc    = subPct != null ? gradeColor(subPct) : { c: '#94A3B8', bg: '#F1F5F9', label: '—' };

                          return (
                            <div key={m.id || j} style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                                  {m.subject?.name || m.subjectName || `Subject ${j + 1}`}
                                </div>
                              </div>
                              <div style={{ fontSize: 12.5, color: NAVY, fontWeight: 700 }}>
                                <span style={{ color: subGc.c }}>{subObt ?? '—'}</span>
                                <span style={{ color: '#94A3B8', fontWeight: 400 }}>/{subTotal}</span>
                              </div>
                              <span style={{ background: subGc.bg, color: subGc.c, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                                {subGc.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ TAB: HOMEWORK ══ */}
        {activeTab === 'homework' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>Homework Diary</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>
                {student ? `Homework for ${student.class?.name || 'your class'}` : 'Your daily assignments'}
              </div>
            </div>

            {hwDates.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#94A3B8' }}>
                <BookOpen size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No homework found</div>
                <div style={{ fontSize: 12 }}>Your teacher's homework assignments will appear here.</div>
              </div>
            ) : (
              hwDates.map(date => (
                <div key={date} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, paddingLeft: 4 }}>
                    {new Date(date).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    {hwByDate[date].map((hw, j) => (
                      <div key={hw.id || j} style={{ padding: '13px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${NAVY}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BookOpen size={15} color={NAVY} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {hw.subject?.name && (
                            <span style={{ display: 'inline-block', background: `${CYAN}22`, color: CYAN, borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 700, marginBottom: 5, border: `1px solid ${CYAN}44` }}>
                              {hw.subject.name}
                            </span>
                          )}
                          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{hw.description}</div>
                          {hw.addedBy && <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>Added by: {hw.addedBy}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══ TAB: LEAVE (accessed from FAB or link) ══ */}
        {activeTab === 'leave' && student && (
          <StudentLeaveTab student={student} card={card} NAVY={NAVY} CYAN={CYAN} />
        )}

        {/* ══ TAB: ATTENDANCE ══ */}
        {activeTab === 'attendance' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>Attendance</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>Monthly calendar and history</div>
            </div>

            {attendPct != null && (
              <div style={{
                background: attendPct >= 70
                  ? 'linear-gradient(135deg,#15803D,#16A34A)'
                  : 'linear-gradient(135deg,#B91C1C,#DC2626)',
                borderRadius: 14, padding: '16px 20px', marginBottom: 12,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>Overall Attendance</div>
                  <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{attendPct}%</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {attendPct >= 70 ? 'Good standing' : 'Below required 75% — attend more classes'}
                  </div>
                </div>
                <Calendar size={48} style={{ opacity: 0.25 }} />
              </div>
            )}

            {attendLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading attendance…</div>
            ) : (
              <div style={{ ...card }}>
                <AttendanceCalendar history={attendHistory} />
              </div>
            )}

            {attendHistory.length > 0 && (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Recent Records</span>
                </div>
                {[...attendHistory]
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .slice(0, 20)
                  .map((rec, i) => {
                    const st = ATTEND_STATUS[rec.status] || { bg: '#F1F5F9', c: '#6B7280', label: rec.status };
                    return (
                      <div key={rec.id || i} style={{ padding: '11px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: st.c }}>{rec.status}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>
                            {fmtDate(rec.date)}
                          </div>
                          {rec.remarks && <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>{rec.remarks}</div>}
                        </div>
                        <span style={{ background: st.bg, color: st.c, padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700 }}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {!attendLoading && attendHistory.length === 0 && (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#94A3B8' }}>
                <Calendar size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No attendance records</div>
                <div style={{ fontSize: 12 }}>Your daily attendance will appear here once recorded.</div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: STUDY MATERIALS ══ */}
        {activeTab === 'materials' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>Study Materials</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>Resources shared by your teachers</div>
            </div>

            {matSubjects.length > 1 && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }}>
                {matSubjects.map(sub => (
                  <button
                    key={sub}
                    onClick={() => setMatSubFilter(sub)}
                    style={{
                      border: 'none', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
                      padding: '6px 14px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
                      background: matSubFilter === sub ? NAVY : '#E5E7EB',
                      color:      matSubFilter === sub ? '#fff' : '#374151',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {sub === 'all' ? 'All Subjects' : sub}
                  </button>
                ))}
              </div>
            )}

            {matsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading materials…</div>
            ) : Object.keys(matsBySubject).length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#94A3B8' }}>
                <Library size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No study materials yet</div>
                <div style={{ fontSize: 12 }}>Your teachers will upload PDFs, videos, and links here.</div>
              </div>
            ) : (
              Object.entries(matsBySubject).map(([subject, mats]) => (
                <div key={subject} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, paddingLeft: 4 }}>
                    {subject}
                    <span style={{ marginLeft: 6, background: `${CYAN}22`, color: CYAN, borderRadius: 99, padding: '1px 8px', fontSize: 10.5, border: `1px solid ${CYAN}44` }}>{mats.length}</span>
                  </div>
                  <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    {mats.map((mat, j) => {
                      const tb   = materialTypeBadge(mat.type || mat.fileType || mat.materialType);
                      const url  = mat.url || mat.fileUrl || mat.link || '#';
                      const teacherName = mat.teacher?.name || mat.teacherName || mat.uploadedBy || '';

                      return (
                        <div key={mat.id || j} style={{ padding: '13px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: tb.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                            {tb.icon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ background: tb.bg, color: tb.c, borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700 }}>
                                {tb.label}
                              </span>
                              {mat.subject?.name || mat.subjectName ? (
                                <span style={{ background: `${NAVY}10`, color: NAVY, borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 600 }}>
                                  {mat.subject?.name || mat.subjectName}
                                </span>
                              ) : null}
                            </div>

                            <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY, marginBottom: 2 }}>
                              {mat.title || mat.name || 'Untitled Material'}
                            </div>

                            {mat.description && (
                              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {mat.description}
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                                {teacherName && <span>By {teacherName}</span>}
                                {mat.createdAt && <span>{teacherName ? ' · ' : ''}{fmtDate(mat.createdAt)}</span>}
                              </div>

                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  background: NAVY, color: '#fff',
                                  borderRadius: 8, padding: '5px 12px',
                                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                                  flexShrink: 0,
                                }}
                              >
                                {mat.type?.toLowerCase() === 'pdf' || mat.fileType?.toLowerCase() === 'pdf'
                                  ? <><Download size={12} /> Download</>
                                  : <><ExternalLink size={12} /> Open</>
                                }
                              </a>
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

      </div>

      {/* ─── BOTTOM NAVIGATION — cyan active ─── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #E5E7EB',
        display: 'flex', zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '9px 2px 7px',
                border: 'none', background: 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                position: 'relative', transition: 'all 0.15s',
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: 5,
                  width: 4, height: 4, borderRadius: '50%',
                  background: CYAN,
                }} />
              )}
              <Icon size={20} color={active ? CYAN : '#94A3B8'} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{
                fontSize: 9.5, fontWeight: active ? 700 : 500,
                color: active ? CYAN : '#94A3B8',
                marginTop: 3, lineHeight: 1,
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
