/**
 * IlmForge — Merit List Page
 * Class-level ranked list by total percentage across all subjects.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trophy, Printer, BarChart2, TrendingUp } from 'lucide-react';
import api from '../../api/client';

/* ─── Helpers ────────────────────────────────────────── */
const errMsg = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

const calcGrade = (pct) => {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const gradeColor = (g) => {
  if (!g || g === '—') return '#6B7280';
  if (g === 'A+') return '#059669';
  if (g === 'A')  return '#10B981';
  if (g === 'B+') return '#3B82F6';
  if (g === 'B')  return '#6366F1';
  if (g === 'C')  return '#F59E0B';
  if (g === 'D')  return '#F97316';
  return '#EF4444';
};

const getDivision = (pct) => {
  if (pct === null || pct === undefined || isNaN(pct)) return { label: 'N/A', color: '#94a3b8' };
  if (pct >= 60) return { label: 'First', color: '#15803D' };
  if (pct >= 45) return { label: 'Second', color: '#1D4ED8' };
  if (pct >= 33) return { label: 'Third', color: '#B45309' };
  return { label: 'Fail', color: '#B91C1C' };
};

const medalEmoji = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
const medalColor = (rank) => rank === 1 ? '#F59E0B' : rank === 2 ? '#94A3B8' : '#CD7F32';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const printDateTime = () =>
  new Date().toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function MeritListPage() {
  const [classId,   setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [examId,    setExamId]    = useState('');

  /* Master data */
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
  });

  /* Merit list */
  const { data: meritData, isLoading, error } = useQuery({
    queryKey: ['merit-list', examId, sectionId],
    queryFn: () =>
      api.get(`/exams/${examId}/merit-list`, { params: { sectionId: sectionId || undefined } })
        .then(r => r.data.data),
    enabled: !!examId,
  });

  const selectedClass   = classes.find(c => String(c.id) === String(classId));
  const selectedSection = selectedClass?.sections?.find(s => String(s.id) === String(sectionId));
  const selectedExam    = exams.find(e => String(e.id) === String(examId));

  const students  = meritData?.students || meritData || [];
  const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';

  /* Computed stats */
  const present     = students.filter(s => !s.isAbsent);
  const passed      = present.filter(s => (s.overallPct ?? 0) >= 33);
  const highestPct  = present.length ? Math.max(...present.map(s => s.overallPct ?? 0)) : 0;
  const avgPct      = present.length
    ? (present.reduce((acc, s) => acc + (s.overallPct ?? 0), 0) / present.length).toFixed(1)
    : '0.0';
  const passPct     = present.length ? Math.round((passed.length / present.length) * 100) : 0;

  const top3 = students.slice(0, 3);

  /* Print handler */
  const handlePrint = () => {
    if (!students.length) { toast.error('No data to print.'); return; }

    const bodyRows = students.map((s, i) => {
      const rank = i + 1;
      const div  = getDivision(s.overallPct);
      const mc   = rank <= 3 ? medalColor(rank) : '#374151';
      return `<tr style="background:${rank === 1 ? '#FFFBEB' : rank === 2 ? '#F8FAFC' : rank === 3 ? '#FFF7ED' : (i%2===0?'#fff':'#F9FAFB')};">
        <td style="padding:7px 10px;border:1px solid #E5E7EB;text-align:center;font-weight:900;font-size:13pt;color:${mc};">${rank <= 3 ? medalEmoji(rank) : '#' + rank}</td>
        <td style="padding:7px 10px;border:1px solid #E5E7EB;font-family:monospace;color:#0F766E;font-weight:700;">${s.rollNo || '—'}</td>
        <td style="padding:7px 10px;border:1px solid #E5E7EB;font-weight:700;">${s.name}</td>
        <td style="padding:7px 10px;border:1px solid #E5E7EB;text-align:center;font-weight:800;color:${mc};">${s.isAbsent ? 'ABS' : (s.totalObtained ?? '—')}</td>
        <td style="padding:7px 10px;border:1px solid #E5E7EB;text-align:center;">${s.isAbsent ? '—' : (s.grandTotal ?? '—')}</td>
        <td style="padding:7px 10px;border:1px solid #E5E7EB;text-align:center;font-weight:700;">${s.isAbsent ? '—' : (s.overallPct ?? '—') + '%'}</td>
        <td style="padding:7px 10px;border:1px solid #E5E7EB;text-align:center;font-weight:800;color:${gradeColor(s.grade || calcGrade(s.overallPct))};">${s.grade || calcGrade(s.overallPct)}</td>
        <td style="padding:7px 10px;border:1px solid #E5E7EB;text-align:center;font-weight:700;color:${div.color};">${div.label}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Merit List</title>
      <style>* { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Arial,sans-serif; padding:12mm; }
      @media print { @page { size:A4 portrait; margin:8mm; } button { display:none!important; } }
      </style></head><body>
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:19pt;font-weight:900;color:#0F4C45;">${schoolName}</div>
        <div style="font-size:14pt;font-weight:800;margin-top:5px;">Merit List — ${selectedExam?.title || '—'}</div>
        <div style="font-size:10.5pt;color:#6B7280;margin-top:3px;">
          Class: ${selectedClass?.name || '—'}${selectedSection ? ' — ' + selectedSection.name : ''} &nbsp;|&nbsp;
          Printed: ${printDateTime()}
        </div>
      </div>
      <div style="display:flex;gap:24px;margin-bottom:12px;padding:8px 12px;background:#F0FDF4;border-radius:6px;font-size:10pt;">
        <span><strong>Students:</strong> ${students.length}</span>
        <span><strong>Highest:</strong> ${highestPct}%</span>
        <span><strong>Average:</strong> ${avgPct}%</span>
        <span><strong>Pass %:</strong> ${passPct}%</span>
      </div>
      <button onclick="window.print()" style="margin-bottom:10px;background:#0F766E;color:#fff;border:none;padding:7px 16px;border-radius:5px;cursor:pointer;font-size:11px;">Print</button>
      <table style="width:100%;border-collapse:collapse;font-size:10pt;">
        <thead>
          <tr style="background:#0F766E;color:#fff;">
            <th style="padding:8px;border:1px solid #0F766E;text-align:center;">Rank</th>
            <th style="padding:8px;border:1px solid #0F766E;">Roll No</th>
            <th style="padding:8px;border:1px solid #0F766E;">Student Name</th>
            <th style="padding:8px;border:1px solid #0F766E;text-align:center;">Total Obt</th>
            <th style="padding:8px;border:1px solid #0F766E;text-align:center;">Grand Total</th>
            <th style="padding:8px;border:1px solid #0F766E;text-align:center;">%</th>
            <th style="padding:8px;border:1px solid #0F766E;text-align:center;">Grade</th>
            <th style="padding:8px;border:1px solid #0F766E;text-align:center;">Division</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
      </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  /* ─── Render ─────────────────────────────────────── */
  return (
    <div className="page-content fade-in">

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Trophy size={22} color="#F59E0B" />
          Merit List
        </h1>
        <p className="page-subtitle">Ranked list of students by overall exam performance</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class *</label>
            <select
              className="form-select"
              value={classId}
              onChange={e => { setClassId(e.target.value); setSectionId(''); }}
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Section</label>
            <select
              className="form-select"
              value={sectionId}
              onChange={e => setSectionId(e.target.value)}
              disabled={!selectedClass?.sections?.length}
            >
              <option value="">All Sections</option>
              {(selectedClass?.sections || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Exam *</label>
            <select
              className="form-select"
              value={examId}
              onChange={e => setExamId(e.target.value)}
            >
              <option value="">Select Exam</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          {students.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-teal" style={{ height: 38 }} onClick={handlePrint}>
                <Printer size={14} /> Print Merit List
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No selection */}
      {!examId ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon"><Trophy size={52} style={{ opacity: 0.15 }} /></div>
            <div className="empty-state-text">Select an exam to view the merit list</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center" style={{ padding: 60 }}><div className="spinner" /></div>
      ) : error ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-text" style={{ color: '#B91C1C' }}>Failed to load merit list</div>
            <div className="empty-state-sub">{errMsg(error)}</div>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon"><BarChart2 size={44} style={{ opacity: 0.18 }} /></div>
            <div className="empty-state-text">No results found for this exam</div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="stats-grid-4" style={{ marginBottom: 18 }}>
            {[
              { l: 'Highest %', v: `${highestPct}%`, c: '#15803D', bg: '#DCFCE7' },
              { l: 'Class Average', v: `${avgPct}%`, c: '#1D4ED8', bg: '#DBEAFE' },
              { l: 'Pass %', v: `${passPct}%`, c: '#0F766E', bg: '#CCFBF1' },
              { l: 'Total Students', v: students.length, c: '#1E3A5F', bg: '#EFF6FF' },
            ].map(item => (
              <div key={item.l} className="card" style={{ background: item.bg, border: 'none', padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.c }}>{item.v}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.l}</div>
              </div>
            ))}
          </div>

          {/* Top 3 Podium */}
          {top3.length >= 2 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              {[1, 0, 2].map(idx => {
                const s = top3[idx];
                if (!s) return null;
                const rank  = idx + 1;
                const medal = medalColor(rank);
                const podiumH = rank === 1 ? 110 : rank === 2 ? 88 : 72;
                return (
                  <div
                    key={s.studentId || s.id}
                    style={{
                      textAlign: 'center', width: 170,
                      background: '#fff', borderRadius: 14, padding: '20px 14px',
                      border: `2px solid ${medal}50`,
                      boxShadow: `0 6px 24px ${medal}20`,
                      order: rank === 1 ? 2 : rank === 2 ? 1 : 3,
                      marginTop: rank === 1 ? 0 : rank === 2 ? 20 : 28,
                    }}
                  >
                    <div style={{ fontSize: 38, marginBottom: 8 }}>{medalEmoji(rank)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: medal, letterSpacing: 0.5, marginBottom: 4 }}>
                      {rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 3, lineHeight: 1.3 }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, fontFamily: 'monospace' }}>
                      {s.rollNo || ''}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: medal }}>
                      {s.overallPct}%
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                      {s.totalObtained}/{s.grandTotal}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                        fontSize: 12, fontWeight: 800, background: '#F0FDF4',
                        color: gradeColor(s.grade || calcGrade(s.overallPct)),
                      }}>
                        {s.grade || calcGrade(s.overallPct)}
                      </span>
                    </div>
                    {/* Podium bar visual */}
                    <div style={{
                      marginTop: 14, height: podiumH / 4, background: `${medal}25`,
                      borderRadius: 6, border: `1px solid ${medal}40`,
                    }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Full ranked table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F4C45' }}>
                <TrendingUp size={15} style={{ marginRight: 6, verticalAlign: 'middle', color: '#0F766E' }} />
                Full Merit List — {students.length} Students
              </span>
              <button className="btn btn-outline btn-sm" onClick={handlePrint}>
                <Printer size={13} /> Print
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Rank</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th style={{ textAlign: 'center' }}>Total Obtained</th>
                    <th style={{ textAlign: 'center' }}>Grand Total</th>
                    <th style={{ textAlign: 'center' }}>%</th>
                    <th style={{ textAlign: 'center' }}>Grade</th>
                    <th style={{ textAlign: 'center' }}>Division</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const rank  = i + 1;
                    const medal = rank <= 3 ? medalColor(rank) : null;
                    const div   = getDivision(s.overallPct);
                    const grade = s.grade || calcGrade(s.overallPct);
                    const rowBg = rank === 1 ? '#FFFBEB' : rank === 2 ? '#F8FAFC' : rank === 3 ? '#FFF7ED' : '#fff';
                    return (
                      <tr key={s.studentId || s.id} style={{ background: rowBg }}>
                        <td style={{ textAlign: 'center' }}>
                          {rank <= 3 ? (
                            <span style={{ fontSize: 18 }}>{medalEmoji(rank)}</span>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>#{rank}</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700 }}>
                          {s.rollNo || '—'}
                        </td>
                        <td style={{ fontWeight: rank <= 3 ? 800 : 600, color: '#111827' }}>
                          {s.name}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: medal || '#0F766E', fontSize: rank <= 3 ? 14 : 13 }}>
                          {s.isAbsent ? 'ABS' : (s.totalObtained ?? '—')}
                          {!s.isAbsent && s.grandTotal && (
                            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginLeft: 3 }}>/ {s.grandTotal}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: '#374151' }}>
                          {s.isAbsent ? '—' : (s.grandTotal ?? '—')}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: medal || '#374151', fontSize: rank <= 3 ? 14 : 13 }}>
                          {s.isAbsent ? '—' : `${s.overallPct ?? '—'}%`}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                            fontSize: 12, fontWeight: 800,
                            background: '#F0FDF4', color: gradeColor(grade),
                          }}>
                            {s.isAbsent ? 'ABS' : grade}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: div.color }}>
                          {s.isAbsent ? 'Absent' : div.label}
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
