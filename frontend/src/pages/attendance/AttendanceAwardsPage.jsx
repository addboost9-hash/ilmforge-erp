/**
 * IlmForge — Attendance Awards
 * Podium + ranked table showing best-attendance students for a given month/class/year.
 * All data is fetched from real API endpoints — no hardcoded demo data.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Award, Medal, Printer, Star, Users, Loader2 } from 'lucide-react';
import api from '../../api/client';

/* ── Constants ──────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const AVATAR_COLORS = [
  '#0F766E','#7C3AED','#2563EB','#D97706','#DC2626',
  '#059669','#DB2777','#4F46E5','#0891B2','#65A30D',
];

const pct = (p, t) => t > 0 ? Math.round((p / t) * 100) : 0;

/* ── Award badge helper ──────────────────────────────── */
const getAwardBadge = (rank) => {
  if (rank === 1) return { label: 'Gold Star',   bg: '#FEF3C7', color: '#B45309', borderColor: '#F59E0B' };
  if (rank === 2) return { label: 'Silver',       bg: '#F1F5F9', color: '#475569', borderColor: '#94A3B8' };
  if (rank === 3) return { label: 'Bronze',       bg: '#FEF3C7', color: '#92400E', borderColor: '#D97706' };
  if (rank <= 5)  return { label: 'Honor Roll',   bg: '#EDE9FE', color: '#6D28D9', borderColor: '#8B5CF6' };
  return              { label: 'Merit',           bg: '#D1FAE5', color: '#065F46', borderColor: '#10B981' };
};

/* ── Avatar initials from full name ─────────────────── */
const initials = (name) =>
  (name || 'XX').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ── Deterministic color index from id or name ───────── */
const avatarColorFor = (seed) => {
  const n = typeof seed === 'number' ? seed : (seed || '').charCodeAt(0) || 0;
  return AVATAR_COLORS[Math.abs(n) % AVATAR_COLORS.length];
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
  const avatarColor = avatarColorFor(student.id || student.name);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: '1 1 0',
      maxWidth: 220,
    }}>
      {/* Avatar + medal badge */}
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
          {student.cls}{student.section && student.section !== '—' ? ` — Sec ${student.section}` : ''}
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

/* ── Loading spinner ─────────────────────────────────── */
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
    <Loader2
      size={40}
      color="#0F766E"
      strokeWidth={2}
      style={{ animation: 'spin 1s linear infinite' }}
    />
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function AttendanceAwardsPage() {
  const now = new Date();

  /* Filter state (pending — not yet applied) */
  const [month,   setMonth]   = useState(now.getMonth() + 1);        // 1-12
  const [year,    setYear]    = useState(now.getFullYear());
  const [classId, setClassId] = useState('');                         // '' = All

  /* Applied state — drives the query */
  const [applied, setApplied] = useState({
    month:   now.getMonth() + 1,
    year:    now.getFullYear(),
    classId: '',
  });

  /* ── Fetch class list ── */
  const { data: classesData } = useQuery({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const classes = Array.isArray(classesData?.data)
    ? classesData.data
    : Array.isArray(classesData)
    ? classesData
    : [];

  /* ── Fetch attendance summary ── */
  const {
    data: summaryData,
    isLoading,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['attendance-awards', applied.month, applied.year, applied.classId],
    queryFn: async () => {
      const params = { month: applied.month, year: applied.year };
      if (applied.classId) params.classId = applied.classId;
      const res = await api.get('/attendance/summary', { params });
      return res.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  /* ── Build and rank student list from API response ── */
  const buildRanked = (raw) => {
    const arr = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
      ? raw
      : null;

    if (!arr || arr.length === 0) return [];

    return arr
      .filter(s => s != null)
      .map((s, idx) => ({
        id:      s.id ?? s.studentId ?? s._id ?? idx,
        name:    s.name ?? s.studentName ?? s.fullName ?? 'Unknown',
        cls:     s.class ?? s.className ?? s.grade ?? '—',
        section: s.section ?? '—',
        present: Number(s.presentDays ?? s.present ?? s.daysPresent ?? 0),
        total:   Number(s.totalDays   ?? s.total   ?? s.workingDays ?? s.schoolDays ?? 0),
        avatar:  initials(s.name ?? s.studentName ?? s.fullName),
      }))
      .filter(s => s.total > 0)
      .sort((a, b) => pct(b.present, b.total) - pct(a.present, a.total))
      .slice(0, 10);
  };

  const ranked  = buildRanked(summaryData);
  const top3    = ranked.slice(0, 3);
  const hasData = ranked.length > 0;
  const busy    = isLoading || isFetching;

  /* ── Load Awards button handler ── */
  const handleLoad = () => setApplied({ month, year, classId });

  /* ── Year options ── */
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  /* ── Print handler ── */
  const handlePrint = () => {
    const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';
    const logoSrc    = localStorage.getItem('schoolLogoPreview') || null;
    const monthLabel = MONTHS[applied.month - 1];
    const logoHtml   = logoSrc
      ? `<img src="${logoSrc}" style="width:56px;height:56px;object-fit:contain;border-radius:6px;" alt="Logo"/>`
      : `<div style="width:56px;height:56px;border-radius:50%;background:#0F766E;display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;">&#127942;</div>`;

    const selectedClass = classes.find(c => String(c.id ?? c._id) === String(applied.classId));
    const classLabel    = selectedClass ? (selectedClass.name ?? selectedClass.className ?? 'All Classes') : 'All Classes';

    const rows = ranked.map((s, i) => {
      const p     = pct(s.present, s.total);
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
        <div style="font-size:10pt;color:#6B7280;margin-top:3px;">Class: ${classLabel}</div>
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

  /* ── Selected class label for subtitle ── */
  const selectedClass = classes.find(c => String(c.id ?? c._id) === String(applied.classId));
  const classLabel    = selectedClass
    ? (selectedClass.name ?? selectedClass.className ?? 'All Classes')
    : 'All Classes';

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
          <strong style={{ color: '#0F766E' }}>{MONTHS[applied.month - 1]} {applied.year}</strong>
          &nbsp;|&nbsp;
          <strong style={{ color: '#0F766E' }}>{classLabel}</strong>
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
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Year</label>
            <input
              type="number"
              value={year}
              min={2000}
              max={2100}
              onChange={e => setYear(Number(e.target.value))}
              style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1F2937', outline: 'none', minWidth: 90, width: 90 }}
            />
          </div>

          {/* Class */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Class</label>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#1F2937', outline: 'none', cursor: 'pointer', minWidth: 160 }}
            >
              <option value=''>All Classes</option>
              {classes.map(c => {
                const id  = c.id ?? c._id ?? '';
                const lbl = c.name ?? c.className ?? String(id);
                return <option key={id} value={String(id)}>{lbl}</option>;
              })}
            </select>
          </div>

          {/* Load Awards button */}
          <button
            className="btn btn-teal"
            disabled={busy}
            onClick={handleLoad}
            style={{ height: 36, paddingTop: 0, paddingBottom: 0, alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {busy
              ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }}/>
              : <Trophy size={15}/>
            }
            {busy ? 'Loading...' : 'Load Awards'}
          </button>
        </div>
      </div>

      {/* ── Loading state ── */}
      {busy && (
        <div className="card" style={{ marginBottom: 22 }}>
          <Spinner/>
        </div>
      )}

      {/* ── Error state ── */}
      {isError && !busy && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
            Failed to load attendance data
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>
            Please check your connection and try again.
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!busy && !isError && !hasData && (
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
            No attendance records found for{' '}
            <strong>{MONTHS[applied.month - 1]} {applied.year}</strong>
            {classLabel !== 'All Classes' && <span> &mdash; {classLabel}</span>}.
            {' '}Adjust your filters and click <strong>Load Awards</strong>.
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {!busy && !isError && hasData && (
        <>
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
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>{MONTHS[applied.month - 1]} {applied.year}</div>
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

            {ranked.length === 1 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>
                Only one student matched. Adjust filters for more results.
              </div>
            )}
          </div>

          {/* == TOP 10 TABLE ================================================ */}
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
                style={{ height: 34, paddingTop: 0, paddingBottom: 0, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}
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
                    const p        = pct(s.present, s.total);
                    const badge    = getAwardBadge(i + 1);
                    const avatarC  = avatarColorFor(s.id || s.name);
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
