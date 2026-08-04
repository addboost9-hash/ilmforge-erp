/**
 * IlmForge — Student Portal
 * Students log in and see ONLY their own data — no admin access.
 * Mobile-first design with bottom navigation bar and teal theme.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';
import {
  Home, DollarSign, Award, BookOpen, User,
  ChevronRight, Download, Bell, FileText,
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────── */
const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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
  return { c: '#B91C1C', bg: '#FEE2E2', label: 'F' };
};

const STUDENT_TIPS = [
  'Review your notes within 24 hours of class to retain 80% more.',
  'Break your study sessions into 25-minute focused blocks (Pomodoro technique).',
  'Teaching a concept to someone else is the best way to master it.',
  'Regular sleep improves memory consolidation and exam performance.',
  'Ask questions in class — curiosity is the engine of learning.',
  'Set weekly goals and track your progress every Sunday.',
  'Read ahead before each class so discussions make more sense.',
];

/* ── bottom nav items ──────────────────────────────── */
const NAV_ITEMS = [
  { id: 'home',    label: 'Home',     Icon: Home       },
  { id: 'fees',    label: 'My Fees',  Icon: DollarSign },
  { id: 'results', label: 'Results',  Icon: Award      },
  { id: 'homework',label: 'Homework', Icon: BookOpen   },
  { id: 'profile', label: 'Profile',  Icon: User       },
];

/* ── main component ────────────────────────────────── */
export default function StudentPortalPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('home');
  const [tipIndex, setTipIndex] = useState(0);

  /* rotate tips every 6 s */
  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % STUDENT_TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const logo = localStorage.getItem('schoolLogoPreview');

  /* The sanitized user object has no rollNo/username field — GET /students
     already self-resolves the logged-in student's own record server-side
     (role==='student' returns exactly one record: the one linked to
     req.user.id) regardless of query params. Gating this query on a
     rollNo/username that never exists on the user object meant it NEVER
     fired, so the entire Student Portal (fees, results, attendance,
     profile) permanently showed no data for every student. */
  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['portal-student', user?.id],
    queryFn: () =>
      api.get('/students', { params: { limit: 1 } })
        .then(r => (r.data.data || [])[0] || null),
    enabled: !!user?.id,
    staleTime: 120_000,
  });

  const student = studentData;
  const studentId = student?.id;

  /* student photo from localStorage */
  const photoKey = studentId ? `photo_student_${studentId}` : null;
  const studentPhoto = photoKey ? localStorage.getItem(photoKey) : null;

  /* fees */
  const { data: feeData } = useQuery({
    queryKey: ['portal-fees', studentId],
    queryFn: () => api.get('/fees/student/' + studentId).then(r => r.data.data),
    enabled: !!studentId,
    staleTime: 60_000,
  });
  const invoices  = feeData?.invoices || [];
  const totalDue  = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.dueAmount || 0), 0);
  const unpaidCnt = invoices.filter(i => i.status !== 'paid').length;

  /* exams / results */
  const { data: exams = [] } = useQuery({
    queryKey: ['portal-exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
    staleTime: 120_000,
  });

  // The plain exam list has no marks on it — real per-student marks come
  // from /exams/:id/my-results, one call per exam, aggregated across subjects.
  const examIds = exams.map((e) => e.id).join(',');
  const { data: examResultsMap = {} } = useQuery({
    queryKey: ['portal-exam-results', examIds],
    queryFn: async () => {
      const entries = await Promise.all(exams.map(async (e) => {
        try {
          const r = await api.get(`/exams/${e.id}/my-results`);
          const marks = r.data.data || [];
          if (!marks.length) return [e.id, null];
          const obtainedMarks = marks.reduce((s, m) => s + (m.obtainedMarks || 0), 0);
          const totalMarks = marks.reduce((s, m) => s + (m.totalMarks || 0), 0);
          return [e.id, { obtainedMarks, totalMarks }];
        } catch {
          return [e.id, null];
        }
      }));
      return Object.fromEntries(entries);
    },
    enabled: exams.length > 0,
    staleTime: 120_000,
  });

  /* homework for student's class */
  const classId = student?.classId || student?.class?.id;
  const { data: hwRaw = [] } = useQuery({
    queryKey: ['portal-homework', classId],
    queryFn: () =>
      api.get('/homework', { params: { classId, limit: 30 } }).then(r => r.data.data || []),
    enabled: !!classId,
    staleTime: 60_000,
  });

  /* announcements */
  const { data: announcements = [] } = useQuery({
    queryKey: ['portal-announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data.data || []).catch(() => []),
    staleTime: 120_000,
  });

  /* group homework by date */
  const hwByDate = hwRaw.reduce((acc, h) => {
    const d = h.date?.split('T')[0] || fmtDate(h.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(h);
    return acc;
  }, {});
  const hwDates = Object.keys(hwByDate).sort((a, b) => b.localeCompare(a));

  /* Attendance % — Student has no attendancePercent/attendance field at all
     (that was always reading undefined), so pull the real figure from
     /attendance/summary for the student's class and this calendar month. */
  const now = new Date();
  const { data: attendanceSummary } = useQuery({
    queryKey: ['portal-attendance-summary', student?.classId, now.getMonth() + 1, now.getFullYear()],
    queryFn: () => api.get('/attendance/summary', { params: { classId: student.classId, month: now.getMonth() + 1, year: now.getFullYear() } }).then(r => r.data.data || []),
    enabled: !!student?.classId,
    staleTime: 120_000,
  });
  const attendPct = (attendanceSummary || []).find(s => s.studentId === studentId)?.percentage ?? null;

  /* ── shared inline styles ── */
  const card = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #E5E7EB',
    padding: '16px 18px',
    marginBottom: 12,
  };

  /* ── render ── */
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0F4F8',
      fontFamily: "'Inter', system-ui, sans-serif",
      paddingBottom: 72, /* space for bottom nav */
    }}>

      {/* ─── TOP HEADER ─── */}
      <div style={{
        background: 'linear-gradient(90deg, #0F4C45, #0F766E)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      }}>
        {logo
          ? <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎓</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{schoolName}</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5 }}>
            Student Portal
            {student && <> &nbsp;·&nbsp; <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{student.name}</strong></>}
          </div>
        </div>
        {/* student class+roll badge */}
        {student && (
          <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '5px 10px', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{student.class?.name || '—'}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10.5 }}>Roll # {student.rollNo || rollNo || '—'}</div>
          </div>
        )}
      </div>

      {/* ─── MAIN SCROLL AREA ─── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 14px 0' }}>

        {/* Loading skeleton */}
        {studentLoading && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#6B7280' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>Loading your portal…</div>
          </div>
        )}

        {/* Student not found */}
        {!studentLoading && !student && (
          <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#1E3A5F', marginBottom: 8 }}>Student Record Not Found</div>
            <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.6 }}>
              We could not find a student record linked to your login ({rollNo || 'no roll number'}).<br />
              Please contact your school admin.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: HOME
        ══════════════════════════════════════════ */}
        {activeTab === 'home' && student && (
          <div>
            {/* Welcome gradient card */}
            <div style={{
              background: 'linear-gradient(135deg, #1E3A5F 0%, #0F766E 100%)',
              borderRadius: 16,
              padding: '20px 22px',
              marginBottom: 12,
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
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
                ? <img src={studentPhoto} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0F766E', flexShrink: 0 }} />
                : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: student.gender === 'female' ? 'linear-gradient(135deg,#F472B6,#EC4899)' : 'linear-gradient(135deg,#0F766E,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, border: '3px solid #E5E7EB', flexShrink: 0 }}>
                    {student.name?.charAt(0)}
                  </div>
                )
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A5F', marginBottom: 3 }}>{student.name}</div>
                <div style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.7 }}>
                  <span>Roll No: <strong style={{ color: '#0F766E' }}>{student.rollNo || rollNo || '—'}</strong></span>
                  {' · '}
                  <span>Class: <strong style={{ color: '#1E3A5F' }}>{student.class?.name || '—'}</strong></span>
                  {student.section?.name && <span>{' · '}<strong>Sec {student.section.name}</strong></span>}
                </div>
                {student.fatherName && (
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Father: {student.fatherName}</div>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                {
                  label: 'Attendance',
                  value: attendPct != null ? `${attendPct}%` : '—',
                  color: '#15803D',
                  bg: '#DCFCE7',
                  icon: '✅',
                },
                {
                  label: 'Fee Due',
                  value: totalDue > 0 ? Rs(totalDue) : 'Nil',
                  color: totalDue > 0 ? '#B91C1C' : '#15803D',
                  bg:    totalDue > 0 ? '#FEE2E2' : '#DCFCE7',
                  icon:  totalDue > 0 ? '⚠️' : '✔️',
                },
                {
                  label: 'Exams',
                  value: exams.length,
                  color: '#1D4ED8',
                  bg: '#DBEAFE',
                  icon: '📝',
                },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 10px', textAlign: 'center', border: `1px solid ${s.color}20` }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 3, opacity: 0.8 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Rotating tip */}
            <div style={{ background: 'linear-gradient(135deg, #F0FDF9, #CCFBF1)', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F766E', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Did You Know?</div>
                  <div style={{ fontSize: 13, color: '#065F46', lineHeight: 1.6 }}>{STUDENT_TIPS[tipIndex]}</div>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} color="#0F766E" />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Announcements</span>
              </div>
              {announcements.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: '#94A3B8' }}>
                  <Bell size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13 }}>No announcements yet</div>
                </div>
              ) : (
                announcements.slice(0, 5).map((ann, i) => (
                  <div key={ann.id || i} style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: ann.priority === 'high' ? '#FEE2E2' : '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bell size={15} color={ann.priority === 'high' ? '#B91C1C' : '#0F766E'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F', marginBottom: 2 }}>{ann.title}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ann.body}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{fmtDate(ann.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: MY FEES
        ══════════════════════════════════════════ */}
        {activeTab === 'fees' && student && (
          <div>
            {/* Total due banner */}
            <div style={{
              background: totalDue > 0 ? 'linear-gradient(135deg,#B91C1C,#DC2626)' : 'linear-gradient(135deg,#15803D,#16A34A)',
              borderRadius: 14,
              padding: '18px 20px',
              marginBottom: 12,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 12.5, opacity: 0.8, marginBottom: 3 }}>{totalDue > 0 ? 'Total Amount Due' : 'All Fees Paid'}</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{totalDue > 0 ? Rs(totalDue) : '✔ Clear'}</div>
                {unpaidCnt > 0 && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>{unpaidCnt} unpaid invoice{unpaidCnt !== 1 ? 's' : ''}</div>}
              </div>
              <DollarSign size={40} style={{ opacity: 0.3 }} />
            </div>

            {/* Download voucher button */}
            <a
              href={`/fee-voucher?roll=${encodeURIComponent(student.rollNo || rollNo || '')}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#0F766E',
                color: '#fff',
                borderRadius: 10,
                padding: '11px 18px',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                marginBottom: 12,
              }}
            >
              <Download size={15} /> Download Fee Voucher
            </a>

            {/* Invoices list */}
            {invoices.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#94A3B8' }}>
                <FileText size={36} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No fee records found</div>
                <div style={{ fontSize: 12 }}>Your invoices will appear here once generated by admin.</div>
              </div>
            ) : (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Fee Invoices</span>
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
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>
                          {inv.feeTitle || 'Monthly Fee'}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                          {inv.month && inv.year ? `${inv.month}/${inv.year}` : fmtDate(inv.createdAt)}
                          {' · '}Total: <strong style={{ color: '#1E3A5F' }}>{Rs(inv.totalAmount)}</strong>
                          {inv.dueAmount > 0 && (
                            <span style={{ color: '#DC2626', fontWeight: 700 }}> · Due: {Rs(inv.dueAmount)}</span>
                          )}
                        </div>
                      </div>
                      <span style={{
                        background: bd.bg, color: bd.c,
                        padding: '4px 10px', borderRadius: 99,
                        fontSize: 11.5, fontWeight: 700,
                        textTransform: 'capitalize', flexShrink: 0,
                      }}>
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

        {/* ══════════════════════════════════════════
            TAB: RESULTS
        ══════════════════════════════════════════ */}
        {activeTab === 'results' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1E3A5F' }}>Exam Results</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>Your exam performance overview</div>
            </div>

            {exams.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#94A3B8' }}>
                <Award size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No results yet</div>
                <div style={{ fontSize: 12 }}>Your exam results will appear here once entered by your teacher.</div>
              </div>
            ) : (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                {exams.map((exam, i) => {
                  const result   = examResultsMap[exam.id];
                  const obtained = result?.obtainedMarks ?? null;
                  const total    = result?.totalMarks || 100;
                  const pct      = obtained != null ? Math.round((obtained / total) * 100) : null;
                  const gc       = pct != null ? gradeColor(pct) : { c: '#94A3B8', bg: '#F1F5F9', label: '—' };
                  const passed   = pct != null ? pct >= 40 : null;

                  return (
                    <div key={exam.id || i} style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      {/* grade badge */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 11,
                        background: gc.bg, color: gc.c,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 15, flexShrink: 0,
                        border: `2px solid ${gc.c}30`,
                      }}>
                        {gc.label}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F', marginBottom: 2 }}>
                          {exam.title || exam.examTitle || 'Exam'}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {exam.subject?.name || exam.subjectName || 'All Subjects'}
                          {' · '}
                          {fmtDate(exam.date || exam.examDate || exam.createdAt)}
                        </div>
                        {obtained != null && (
                          <div style={{ fontSize: 12, marginTop: 2 }}>
                            <span style={{ color: gc.c, fontWeight: 700 }}>{obtained}</span>
                            <span style={{ color: '#94A3B8' }}>/{total} &nbsp;({pct}%)</span>
                          </div>
                        )}
                      </div>
                      {passed != null && (
                        <span style={{
                          padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, flexShrink: 0,
                          background: passed ? '#DCFCE7' : '#FEE2E2',
                          color:      passed ? '#15803D' : '#B91C1C',
                        }}>
                          {passed ? 'Pass' : 'Fail'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: HOMEWORK
        ══════════════════════════════════════════ */}
        {activeTab === 'homework' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1E3A5F' }}>Homework Diary</div>
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
                  {/* date header */}
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: '#0F766E',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    marginBottom: 6, paddingLeft: 4,
                  }}>
                    {new Date(date).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    {hwByDate[date].map((hw, j) => (
                      <div key={hw.id || j} style={{ padding: '13px 16px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BookOpen size={15} color="#0F766E" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {hw.subject?.name && (
                            <span style={{ display: 'inline-block', background: '#CCFBF1', color: '#0F766E', borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
                              {hw.subject.name}
                            </span>
                          )}
                          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{hw.description}</div>
                          {hw.addedBy && (
                            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>Added by: {hw.addedBy}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: PROFILE
        ══════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div>
            {/* Photo + name */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px', marginBottom: 12 }}>
              {studentPhoto
                ? <img src={studentPhoto} alt="" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '4px solid #0F766E', marginBottom: 14 }} />
                : (
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: student?.gender === 'female' ? 'linear-gradient(135deg,#F472B6,#EC4899)' : 'linear-gradient(135deg,#0F766E,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 36, border: '4px solid #E5E7EB', marginBottom: 14 }}>
                    {student?.name?.charAt(0) || '?'}
                  </div>
                )
              }
              <div style={{ fontWeight: 800, fontSize: 19, color: '#1E3A5F' }}>{student?.name || '—'}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
                {student?.class?.name} {student?.section?.name ? `· Sec ${student.section.name}` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: '#0F766E', fontWeight: 700, marginTop: 3 }}>
                Roll No: {student?.rollNo || rollNo || '—'}
              </div>
            </div>

            {/* Profile fields */}
            {student && (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                {[
                  { label: 'Full Name',    value: student.name },
                  { label: 'Roll Number',  value: student.rollNo || rollNo },
                  { label: 'Father Name',  value: student.fatherName },
                  { label: 'Class',        value: student.class?.name },
                  { label: 'Section',      value: student.section?.name },
                  { label: 'Gender',       value: student.gender?.charAt(0).toUpperCase() + student.gender?.slice(1) },
                  { label: 'Date of Birth', value: fmtDate(student.dob || student.dateOfBirth) },
                  { label: 'Address',      value: student.address },
                  { label: 'Phone',        value: student.phone || student.contactPhone },
                  { label: 'Blood Group',  value: student.bloodGroup },
                ].filter(f => f.value).map((field, i, arr) => (
                  <div key={field.label} style={{
                    padding: '12px 16px',
                    borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div style={{ width: 100, fontSize: 12, fontWeight: 600, color: '#94A3B8', flexShrink: 0 }}>{field.label}</div>
                    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1E3A5F' }}>{field.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Change password link — /profile is admin-only and would just
                bounce a student back to their own portal; the forced-change
                screen doubles as a general-purpose self-service change form. */}
            <Link
              to="/change-password-required"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '14px 16px',
                marginTop: 10,
                textDecoration: 'none',
                color: '#1E3A5F',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <User size={16} color="#0F766E" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Change Password</span>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </Link>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 20, padding: '0 0 8px', color: '#94A3B8', fontSize: 11.5 }}>
              {schoolName} &nbsp;·&nbsp; Powered by IlmForge
            </div>
          </div>
        )}
      </div>

      {/* ─── BOTTOM NAVIGATION ─── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        zIndex: 100,
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 4px 8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                position: 'relative',
                transition: 'all 0.15s',
              }}
            >
              {/* active indicator dot */}
              {active && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#0F766E',
                }} />
              )}
              <Icon
                size={22}
                color={active ? '#0F766E' : '#94A3B8'}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span style={{
                fontSize: 10.5,
                fontWeight: active ? 700 : 500,
                color: active ? '#0F766E' : '#94A3B8',
                marginTop: 3,
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
