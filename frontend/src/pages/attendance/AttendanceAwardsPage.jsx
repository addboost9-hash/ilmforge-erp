/**
 * IlmForge — Attendance Awards
 * Podium + ranked table showing best-attendance students for a given month/campus
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Award, Medal, Printer, Star, Users } from 'lucide-react';
import api from '../../api/client';

/* ── Constants ──────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CAMPUSES = ['All Campuses','Main Campus','North Campus','South Campus','East Campus'];

const CLASSES = ['All Classes','Nursery','KG','Class 1','Class 2','Class 3',
  'Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10'];

const DEMO_STUDENTS = [
  { id:1, name:'Ayesha Fatima',    cls:'Class 8', section:'A', present:26, total:26, campus:'Main Campus',  avatar:'AF' },
  { id:2, name:'Bilal Ahmed',      cls:'Class 9', section:'B', present:25, total:26, campus:'Main Campus',  avatar:'BA' },
  { id:3, name:'Sara Khan',        cls:'Class 7', section:'A', present:25, total:26, campus:'North Campus', avatar:'SK' },
  { id:4, name:'Hamza Qureshi',    cls:'Class 10',section:'C', present:24, total:26, campus:'Main Campus',  avatar:'HQ' },
  { id:5, name:'Zainab Malik',     cls:'Class 6', section:'B', present:24, total:26, campus:'South Campus', avatar:'ZM' },
  { id:6, name:'Usman Tariq',      cls:'Class 8', section:'C', present:23, total:26, campus:'Main Campus',  avatar:'UT' },
  { id:7, name:'Maria Siddiqui',   cls:'Class 5', section:'A', present:23, total:26, campus:'East Campus',  avatar:'MS' },
  { id:8, name:'Asad Butt',        cls:'Class 9', section:'A', present:22, total:26, campus:'North Campus', avatar:'AB' },
];

const AVATAR_COLORS = [
  '#0F766E','#7C3AED','#2563EB','#D97706','#DC2626',
  '#059669','#DB2777','#4F46E5','#0891B2','#65A30D',
];

const pct = (p, t) => t > 0 ? Math.round((p / t) * 100) : 0;

/* ── Award badge helper ──────────────────────────────── */
const getAwardBadge = (rank) => {
  if (rank === 1) return { label: 'Gold Star',   bg: '#FEF3C7', color: '#B45309', borderColor: '#F59E0B' };
  if (rank === 2) return { label: 'Silver Star',  bg: '#F1F5F9', color: '#475569', borderColor: '#94A3B8' };
  if (rank === 3) return { label: 'Bronze Star',  bg: '#FEF3C7', color: '#92400E', borderColor: '#D97706' };
  if (rank <= 5)  return { label: 'Honor Roll',   bg: '#EDE9FE', color: '#6D28D9', borderColor: '#8B5CF6' };
  return              { label: 'Merit',          bg: '#D1FAE5', color: '#065F46', borderColor: '#10B981' };
};

/* ── Podium card ────────────────────────────────────── */
const PodiumCard = ({ student, rank, height }) => {
  const p = pct(student.present, student.total);
  const medal = rank === 1
    ? { icon: Trophy, color: '#F59E0B', bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '#F59E0B', label: '1st Place' }
    : rank === 2
    ? { icon: Medal,  color: '#94A3B8', bg: 'linear-gradient(135deg,#F1F5F9,#E2E8F0)', border: '#94A3B8', label: '2nd Place' }
    : { icon: Award,  color: '#D97706', bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '#B45309', label: '3rd Place' };

  const MIcon = medal.icon;
  const avatarColor = AVATAR_COLORS[(student.id - 1) % AVATAR_COLORS.length];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: '1 1 0',
      maxWidth: 220,
    }}>
      {/* Avatar + medal */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <div style={{
          width: rank === 1 ? 80 : 68,
          height: rank === 1 ? 80 : 68,
          borderRadius: '50%',
          background: avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          fontSize: rank === 1 ? 26 : 22,
          fontWeight: 800,
          boxShadow: `0 4px 16px ${avatarColor}44`,
          border: `3px solid ${medal.border}`,
        }}>
          {student.avatar}
        </div>
        <div style={{
          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
          width: 26, height: 26, borderRadius: '50%',
          background: medal.bg, border: `2px solid ${medal.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>
          <MIcon size={13} color={medal.color} strokeWidth={2.5}/>
        </div>
      </div>

      {/* Info box */}
      <div style={{
        background: medal.bg,
        border: `2px solid ${medal.border}`,
        borderRadius: 14,
        padding: '14px 18px',
        textAlign: 'center',
        width: '100%',
        boxShadow: `0 4px 16px ${medal.color}22`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: medal.color,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
        }}>
          {medal.label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 2 }}>
          {student.name}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          {student.cls} &mdash; Sec {student.section}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 900, color: medal.color, lineHeight: 1,
        }}>
          {p}%
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
          {student.present}/{student.total} days
        </div>
      </div>

      {/* Podium base */}
      <div style={{
        width: '85%',
        height: height,
        marginTop: 0,
        background: `linear-gradient(180deg, ${medal.border}88, ${medal.border}44)`,
        borderRadius: '0 0 8px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${medal.border}66`,
        borderTop: 'none',
      }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: medal.color, opacity: 0.7 }}>
          {rank}
        </span>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function AttendanceAwardsPage() {
  const now = new Date();
  const [month, setMonth]   = useState(now.getMonth());
  const [year, setYear]     = useState(now.getFullYear());
  const [campus, setCampus] = useState('All Campuses');
  const [cls, setCls]       = useState('All Classes');
  const [applied, setApplied] = useState({ month: now.getMonth(), year: now.getFullYear(), campus: 'All Campuses', cls: 'All Classes' });

  /* ── API fetch ── */
  const { data: apiData, isLoading, isFetching } = useQuery({
    queryKey: ['attendance-awards', applied.month + 1, applied.year, applied.campus, applied.cls],
    queryFn: async () => {
      const params = { month: applied.month + 1, year: applied.year };
      if (applied.campus !== 'All Campuses') params.campus = applied.campus;
      if (applied.cls    !== 'All Classes')  params.class  = applied.cls;
      const res = await api.get('/attendance/report', { params });
      return res.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  /* ── Build ranked list ── */
  const buildStudents = (raw) => {
    if (!Array.isArray(raw)) return null;
    const mapped = raw
      .filter(s => s.presentDays != null || s.present != null)
      .map(s => ({
        id:      s.id || s.studentId || Math.random(),
        name:    s.name || s.studentName || 'Unknown',
        cls:     s.class || s.className || '—',
        section: s.section || '—',
        present: Number(s.presentDays ?? s.present ?? 0),
        total:   Number(s.totalDays   ?? s.total   ?? s.workingDays ?? 26),
        campus:  s.campus || s.branch || 'Main Campus',
        avatar:  (s.name || s.studentName || 'XX').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(),
      }))
      .sort((a, b) => pct(b.present, b.total) - pct(a.present, a.total));
    return mapped.length > 0 ? mapped : null;
  };

  const students  = buildStudents(apiData) || DEMO_STUDENTS;
  const usingDemo = !buildStudents(apiData);

  /* ── Filter demo by campus/class ── */
  const filtered = usingDemo
    ? DEMO_STUDENTS.filter(s =>
        (applied.campus === 'All Campuses' || s.campus === applied.campus) &&
        (applied.cls    === 'All Classes'  || s.cls    === applied.cls)
      )
    : students;

  const ranked = filtered.length > 0 ? filtered : [];
  const top3   = ranked.slice(0, 3);
  const hasData = ranked.length > 0;

  /* ── Print handler ── */
  const handlePrint = () => {
    const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';
    const logoSrc    = localStorage.getItem('schoolLogoPreview') || null;
    const monthLabel = MONTHS[applied.month];
    const logoHtml   = logoSrc
      ? `<img src="${logoSrc}" style="width:56px;height:56px;object-fit:contain;border-radius:6px;" alt="Logo"/>`
      : `<div style="width:56px;height:56px;border-radius:50%;background:#0F766E;display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;">&#127942;</div>`;

    const rows = ranked.map((s, i) => {
      const p = pct(s.present, s.total);
      const badge = getAwardBadge(i + 1);
      const medal = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : '';
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#F9FAFB'};">
        <td style="padding:8px 10px;text-align:center;font-weight:700;color:#374151;">${i + 1}</td>
        <td style="padding:8px 10px;font-weight:700;color:#111827;">${medal} ${s.name}</td>
        <td style="padding:8px 10px;color:#6B7280;">${s.cls}</td>
        <td style="padding:8px 10px;color:#6B7280;text-align:center;">${s.section}</td>
        <td style="padding:8px 10px;text-align:center;">${s.present}</td>
        <td style="padding:8px 10px;text-align:center;">${s.total}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:800;color:#0F766E;">${p}%</td>
        <td style="padding:8px 10px;text-align:center;">
          <span style="background:${badge.bg};color:${badge.color};border:1px solid ${badge.borderColor};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">${badge.label}</span>
        </td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Attendance Awards — ${monthLabel} ${applied.year}</title>
    <style>
      body{font-family:'Arial',sans-serif;margin:0;padding:20mm 18mm;color:#111827;}
      @media print{@page{margin:15mm 14mm;}}
      h1{font-size:22pt;font-weight:900;color:#0F4C45;margin:0 0 2px;}
      h3{font-size:13pt;color:#D97706;margin:0;}
      table{width:100%;border-collapse:collapse;font-size:10pt;}
      thead tr{background:linear-gradient(90deg,#0F4C45,#0F766E);}
      th{padding:9px 10px;text-align:left;color:#fff;font-size:9.5pt;font-weight:600;}
      tr:last-child td{border-bottom:none;}
      td{border-bottom:1px solid #E5E7EB;}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:14px;border-bottom:3px solid #D97706;padding-bottom:12px;margin-bottom:18px;">
      ${logoHtml}
      <div>
        <h1>${schoolName}</h1>
        <h3>Attendance Awards — ${monthLabel} ${applied.year}</h3>
        <div style="font-size:10pt;color:#6B7280;margin-top:3px;">Campus: ${applied.campus} &nbsp;|&nbsp; Class: ${applied.cls}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th style="width:45px">Rank</th>
        <th>Student Name</th><th>Class</th><th style="text-align:center">Sec</th>
        <th style="text-align:center">Present</th><th style="text-align:center">Total</th>
        <th style="text-align:center">%</th><th style="text-align:center">Award</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:28px;font-size:9pt;color:#9CA3AF;text-align:right;">
      Printed: ${new Date().toLocaleString('en-PK')}
    </div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  /* ── Year options ── */
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  /* ═══════════════════════════════════════════════════════ RENDER */
  return (
    <div className="page-content" style={{ maxWidth: 1100 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: 28,
          fontWeight: 900,
          color: '#D97706',
          letterSpacing: '-0.5px',
          marginBottom: 4,
          textShadow: '0 2px 8px rgba(217,119,6,0.18)',
        }}>
          Attendance Awards
        </h1>
        <p className="page-subtitle" style={{ fontSize: 14 }}>
          Best Attendance &mdash;&nbsp;
          <strong style={{ color: '#0F766E' }}>{MONTHS[applied.month]} {applied.year}</strong>
          &nbsp;|&nbsp;
          <strong style={{ color: '#0F766E' }}>{applied.campus}</strong>
        </p>
      </div>

      {/* ── Filters row ── */}
      <div className="card" style={{ marginBottom: 22, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

          {/* Month */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1F2937', outline: 'none', cursor: 'pointer', minWidth: 130 }}
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>

          {/* Year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1F2937', outline: 'none', cursor: 'pointer', minWidth: 90 }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Campus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Campus</label>
            <select
              value={campus}
              onChange={e => setCampus(e.target.value)}
              style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1F2937', outline: 'none', cursor: 'pointer', minWidth: 150 }}
            >
              {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Class */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Class</label>
            <select
              value={cls}
              onChange={e => setCls(e.target.value)}
              style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1F2937', outline: 'none', cursor: 'pointer', minWidth: 130 }}
            >
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* View button */}
          <button
            className="btn btn-teal"
            disabled={isLoading || isFetching}
            onClick={() => setApplied({ month, year, campus, cls })}
            style={{ height: 36, paddingTop: 0, paddingBottom: 0, alignSelf: 'flex-end' }}
          >
            <Trophy size={15}/>
            {isLoading || isFetching ? 'Loading...' : 'View Awards'}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!hasData && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 4px 20px rgba(217,119,6,0.2)',
          }}>
            <Trophy size={40} color="#D97706" strokeWidth={1.8}/>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#374151', marginBottom: 6 }}>
            No Award Data
          </div>
          <div style={{ fontSize: 13.5, color: '#9CA3AF' }}>
            No attendance records found for <strong>{MONTHS[applied.month]} {applied.year}</strong>
            {applied.campus !== 'All Campuses' && <span> &mdash; {applied.campus}</span>}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {hasData && (
        <>
          {/* Demo notice */}
          {usingDemo && (
            <div style={{
              background: '#FEF3C7', border: '1px solid #FDE68A',
              borderRadius: 10, padding: '9px 16px', marginBottom: 18,
              display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5,
              color: '#92400E',
            }}>
              <Star size={14} color="#D97706" strokeWidth={2}/>
              Showing demo data &mdash; connect your attendance API at&nbsp;
              <code style={{ background: '#FDE68A55', padding: '1px 6px', borderRadius: 4 }}>/attendance/report</code>
              &nbsp;to see real results.
            </div>
          )}

          {/* == TOP 3 PODIUM ================================================ */}
          <div className="card" style={{ marginBottom: 22, padding: '28px 24px 0', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(217,119,6,0.25)',
              }}>
                <Trophy size={18} color="#D97706" strokeWidth={2}/>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Top 3 Podium</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{MONTHS[applied.month]} {applied.year}</div>
              </div>
            </div>

            {top3.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 16,
                paddingBottom: 0,
              }}>
                {/* Classic podium order: 2nd left, 1st center, 3rd right */}
                {[
                  top3[1] ? { student: top3[1], rank: 2, height: 60 } : null,
                  top3[0] ? { student: top3[0], rank: 1, height: 80 } : null,
                  top3[2] ? { student: top3[2], rank: 3, height: 44 } : null,
                ].filter(Boolean).map(({ student, rank, height }) => (
                  <PodiumCard key={rank} student={student} rank={rank} height={height}/>
                ))}
              </div>
            )}

            {top3.length === 1 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>
                Only one student matched. Adjust filters for more results.
              </div>
            )}
          </div>

          {/* == TOP STUDENTS TABLE ========================================== */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #F3F4F6',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'linear-gradient(135deg,#0F766E,#0D9488)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={16} color="#fff" strokeWidth={2}/>
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: '#111827' }}>Top Students</div>
                  <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{ranked.length} students ranked</div>
                </div>
              </div>

              <button
                className="btn btn-gold"
                onClick={handlePrint}
                style={{ height: 34, paddingTop: 0, paddingBottom: 0, fontSize: 12.5 }}
              >
                <Printer size={14}/>
                Print Awards
              </button>
            </div>

            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 52, textAlign: 'center' }}>Rank</th>
                    <th>Student</th>
                    <th>Class</th>
                    <th style={{ textAlign: 'center' }}>Section</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Total Days</th>
                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                    <th style={{ textAlign: 'center' }}>Award</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((s, i) => {
                    const p       = pct(s.present, s.total);
                    const badge   = getAwardBadge(i + 1);
                    const avatarC = AVATAR_COLORS[(s.id - 1) % AVATAR_COLORS.length] || '#0F766E';
                    const rankIcon = i === 0
                      ? <Trophy size={16} color="#F59E0B" strokeWidth={2.5}/>
                      : i === 1
                      ? <Medal  size={16} color="#94A3B8" strokeWidth={2.5}/>
                      : i === 2
                      ? <Award  size={16} color="#D97706" strokeWidth={2.5}/>
                      : null;

                    return (
                      <tr key={s.id}>
                        {/* Rank */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {rankIcon}
                            <span style={{ fontWeight: 700, color: i < 3 ? '#D97706' : '#374151', fontSize: 13 }}>
                              {i + 1}
                            </span>
                          </div>
                        </td>

                        {/* Student */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: avatarC,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0,
                              boxShadow: `0 2px 8px ${avatarC}44`,
                            }}>
                              {s.avatar}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.campus}</div>
                            </div>
                          </div>
                        </td>

                        {/* Class */}
                        <td style={{ color: '#374151', fontWeight: 600 }}>{s.cls}</td>

                        {/* Section */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-teal" style={{ minWidth: 28 }}>{s.section}</span>
                        </td>

                        {/* Present */}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>{s.present}</td>

                        {/* Total */}
                        <td style={{ textAlign: 'center', color: '#6B7280' }}>{s.total}</td>

                        {/* Attendance % with bar */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <div style={{
                              width: 52, height: 6, borderRadius: 99,
                              background: '#E5E7EB', overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${p}%`, height: '100%',
                                background: p >= 95 ? '#10B981' : p >= 85 ? '#D97706' : '#EF4444',
                                borderRadius: 99,
                              }}/>
                            </div>
                            <span style={{
                              fontWeight: 800, fontSize: 13,
                              color: p >= 95 ? '#059669' : p >= 85 ? '#D97706' : '#EF4444',
                            }}>
                              {p}%
                            </span>
                          </div>
                        </td>

                        {/* Award badge */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: badge.bg,
                            color: badge.color,
                            border: `1.5px solid ${badge.borderColor}`,
                            padding: '3px 10px', borderRadius: 99,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            <Star size={10} color={badge.color} strokeWidth={2.5}/>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
