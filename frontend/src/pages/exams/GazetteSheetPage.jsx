/**
 * IlmForge — Gazette Sheet Page
 * نتیجہ نامہ — Class Gazette Sheet
 * Full horizontal tabulation: every student × every subject, with summary columns.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Printer, Download, FileText, BarChart2 } from 'lucide-react';
import api from '../../api/client';

/* ─── Helpers ────────────────────────────────────────── */
const errMsg = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

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
  if (!g || g === '—' || g === 'ABS') return { c: '#94a3b8', bg: '#F1F5F9' };
  if (g === 'A+' || g === 'A') return { c: '#15803D', bg: '#DCFCE7' };
  if (g === 'B+' || g === 'B') return { c: '#1D4ED8', bg: '#DBEAFE' };
  if (g === 'C' || g === 'D') return { c: '#B45309', bg: '#FEF3C7' };
  return { c: '#B91C1C', bg: '#FEE2E2' };
};

const getDivision = (pct, thresholds) => {
  if (pct === null || pct === undefined || isNaN(pct)) return { label: 'Absent', color: '#94a3b8' };
  const { firstDivision = 60, secondDivision = 45, thirdDivision = 33 } = thresholds || {};
  if (pct >= firstDivision) return { label: 'First', color: '#15803D' };
  if (pct >= secondDivision) return { label: 'Second', color: '#1D4ED8' };
  if (pct >= thirdDivision) return { label: 'Third', color: '#B45309' };
  return { label: 'Fail', color: '#B91C1C' };
};

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function GazetteSheetPage() {
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

  /* Gazette data */
  const { data: gazette, isLoading, error } = useQuery({
    queryKey: ['gazette', examId, sectionId],
    queryFn: () =>
      api.get(`/exams/${examId}/gazette`, { params: { sectionId: sectionId || undefined } })
        .then(r => r.data.data),
    enabled: !!examId,
  });

  const selectedClass   = classes.find(c => String(c.id) === String(classId));
  const selectedSection = selectedClass?.sections?.find(s => String(s.id) === String(sectionId));
  const selectedExam    = exams.find(e => String(e.id) === String(examId));

  /* Derived table data */
  const subjects = gazette?.subjects || [];
  const students = gazette?.students || [];
  const thresholds = gazette?.thresholds || {};

  const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';
  const session    = localStorage.getItem('session') || new Date().getFullYear();

  /* Stats */
  const passed = students.filter(s => (s.overallPct ?? 0) >= (thresholds.thirdDivision ?? 33) && !s.isAbsent).length;
  const failed  = students.filter(s => (s.overallPct ?? 0) < (thresholds.thirdDivision ?? 33) && !s.isAbsent).length;
  const absent  = students.filter(s => s.isAbsent).length;

  /* Excel export */
  const handleExcel = async () => {
    if (!examId) return;
    try {
      const resp = await api.get(`/exams/${examId}/results/excel`, {
        params: { sectionId: sectionId || undefined },
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href     = url;
      link.download = `gazette-exam-${examId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  /* Print */
  const handlePrint = () => {
    if (!students.length) { toast.error('No data to print.'); return; }

    const subjectHeaders = subjects.map(sub =>
      `<th colspan="2" style="padding:6px 8px;border:1px solid #0F766E;font-size:9pt;text-align:center;min-width:80px;">${sub.name}</th>`
    ).join('');

    const subjectSubHeaders = subjects.map(() =>
      `<th style="padding:4px 6px;border:1px solid #0F766E;font-size:8pt;">Obt</th>
       <th style="padding:4px 6px;border:1px solid #0F766E;font-size:8pt;">Grade</th>`
    ).join('');

    const bodyRows = students.map((s, i) => {
      const div = getDivision(s.overallPct, thresholds);
      const pass = !s.isAbsent && (s.overallPct ?? 0) >= (thresholds.thirdDivision ?? 33);
      const rowBg = s.isAbsent ? '#FEF3C7' : pass ? '#fff' : '#FEF2F2';
      const subjectCells = subjects.map(sub => {
        const r = s.subjectResults?.[sub.id] || {};
        const obt = s.isAbsent || r.isAbsent ? 'ABS' : (r.obtained ?? '—');
        const gc  = gradeColor(r.grade || '—');
        return `<td style="padding:4px 6px;border:1px solid #E5E7EB;text-align:center;font-weight:700;">${obt}</td>
                <td style="padding:4px 6px;border:1px solid #E5E7EB;text-align:center;font-size:8pt;font-weight:700;color:${gc.c};">${r.grade || '—'}</td>`;
      }).join('');
      return `<tr style="background:${rowBg};">
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;font-family:monospace;">${s.rollNo || String(i+1).padStart(3,'0')}</td>
        <td style="padding:5px 7px;border:1px solid #E5E7EB;font-weight:600;">${s.name}</td>
        ${subjectCells}
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;font-weight:800;color:#0F766E;">${s.isAbsent ? 'ABS' : (s.totalObtained ?? '—')}</td>
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;">${s.isAbsent ? '—' : (s.grandTotal ?? '—')}</td>
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;font-weight:700;">${s.isAbsent ? '—' : (s.overallPct !== undefined ? s.overallPct + '%' : '—')}</td>
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;font-weight:800;">${calcGrade(s.overallPct)}</td>
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;font-weight:700;">${s.isAbsent ? '—' : (s.position ?? '—')}</td>
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;font-weight:700;color:${div.color};">${div.label}</td>
        <td style="padding:5px 7px;border:1px solid #E5E7EB;text-align:center;font-weight:800;color:${pass?'#15803D':'#B91C1C'};">${s.isAbsent ? 'ABS' : (pass ? 'Pass' : 'Fail')}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Gazette Sheet</title>
      <style>* { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Arial,sans-serif; padding:8mm; }
      @media print { @page { size:A3 landscape; margin:6mm; } button { display:none!important; } }
      </style></head><body>
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:18pt;font-weight:900;color:#0F4C45;">${schoolName}</div>
        <div style="font-size:13pt;font-weight:800;margin-top:4px;">نتیجہ نامہ — Class Gazette Sheet</div>
        <div style="font-size:10pt;color:#6B7280;margin-top:3px;">
          Exam: ${selectedExam?.title || '—'} &nbsp;|&nbsp;
          Class: ${selectedClass?.name || '—'}${selectedSection ? ' — ' + selectedSection.name : ''} &nbsp;|&nbsp;
          Session: ${session}
        </div>
      </div>
      <button onclick="window.print()" style="margin-bottom:10px;background:#0F766E;color:#fff;border:none;padding:7px 16px;border-radius:5px;cursor:pointer;font-size:11px;">Print</button>
      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <thead>
          <tr style="background:#0F766E;color:#fff;">
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Roll No</th>
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Student Name</th>
            ${subjectHeaders}
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Total Obt</th>
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Grand Total</th>
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">%</th>
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Grade</th>
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Position</th>
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Division</th>
            <th rowspan="2" style="padding:6px 8px;border:1px solid #0F766E;">Result</th>
          </tr>
          <tr style="background:#134E4A;color:#fff;">
            ${subjectSubHeaders}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
      </div>
      <div style="margin-top:12px;padding:8px 12px;background:#F0FDF4;border-radius:6px;font-size:10pt;">
        <strong>Total Students:</strong> ${students.length} &nbsp;&nbsp;
        <strong style="color:#15803D;">Passed:</strong> ${passed} &nbsp;&nbsp;
        <strong style="color:#B91C1C;">Failed:</strong> ${failed} &nbsp;&nbsp;
        <strong style="color:#B45309;">Absent:</strong> ${absent} &nbsp;&nbsp;
        <strong style="color:#1D4ED8;">Pass %:</strong> ${students.length > 0 ? Math.round((passed/(students.length - absent))*100) : 0}%
      </div>
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
          <FileText size={22} color="#0F766E" />
          Class Gazette Sheet
          <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B', marginLeft: 6 }}>نتیجہ نامہ</span>
        </h1>
        <p className="page-subtitle">Full subject-wise result table for every student in a class</p>
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

          {gazette && students.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <button className="btn btn-teal" style={{ height: 38 }} onClick={handlePrint}>
                <Printer size={14} /> Print Sheet
              </button>
              <button className="btn btn-outline" style={{ height: 38 }} onClick={handleExcel}>
                <Download size={14} /> Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No selection state */}
      {!examId ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon"><BarChart2 size={52} style={{ opacity: 0.15 }} /></div>
            <div className="empty-state-text">Select an exam to generate the gazette sheet</div>
            <div className="empty-state-sub">Choose class and exam from the filters above</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center" style={{ padding: 60 }}><div className="spinner" /></div>
      ) : error ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-text" style={{ color: '#B91C1C' }}>Failed to load gazette data</div>
            <div className="empty-state-sub">{errMsg(error)}</div>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon"><FileText size={44} style={{ opacity: 0.18 }} /></div>
            <div className="empty-state-text">No results found for this exam</div>
            <div className="empty-state-sub">Enter marks for this exam first</div>
          </div>
        </div>
      ) : (
        <>
          {/* School header band */}
          <div className="card" style={{ marginBottom: 14, background: 'linear-gradient(135deg, #0F4C45 0%, #0F766E 100%)', color: '#fff', padding: '16px 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{schoolName}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, opacity: 0.9 }}>
                نتیجہ نامہ — {selectedExam?.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                Class: {selectedClass?.name || '—'}{selectedSection ? ` — ${selectedSection.name}` : ''} &nbsp;|&nbsp; Session: {session}
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="stats-grid-4" style={{ marginBottom: 14 }}>
            {[
              { l: 'Total Students', v: students.length, c: '#1E3A5F', bg: '#EFF6FF' },
              { l: 'Passed', v: passed, c: '#15803D', bg: '#DCFCE7' },
              { l: 'Failed', v: failed, c: '#B91C1C', bg: '#FEE2E2' },
              { l: 'Absent', v: absent, c: '#B45309', bg: '#FEF3C7' },
            ].map(item => (
              <div key={item.l} className="card" style={{ background: item.bg, border: 'none', padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.c }}>{item.v}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.l}</div>
              </div>
            ))}
          </div>

          {/* Gazette table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F4C45' }}>
                {students.length} Students · {subjects.length} Subjects
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={handlePrint}>
                  <Printer size={13} /> Print
                </button>
                <button className="btn btn-outline btn-sm" onClick={handleExcel}>
                  <Download size={13} /> Excel
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#0F766E' }}>
                    <th rowSpan={2} style={{ background: '#0F766E', color: '#fff', whiteSpace: 'nowrap', minWidth: 70 }}>Roll No</th>
                    <th rowSpan={2} style={{ background: '#0F766E', color: '#fff', minWidth: 140 }}>Student Name</th>
                    {subjects.map(sub => (
                      <th key={sub.id} colSpan={2} style={{ background: '#0F766E', color: '#fff', textAlign: 'center', minWidth: 100, borderLeft: '1px solid #0D5E58' }}>
                        {sub.name}
                        <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>/{sub.totalMarks || '—'}</div>
                      </th>
                    ))}
                    <th rowSpan={2} style={{ background: '#134E4A', color: '#fff', textAlign: 'center', whiteSpace: 'nowrap' }}>Total Obt</th>
                    <th rowSpan={2} style={{ background: '#134E4A', color: '#fff', textAlign: 'center', whiteSpace: 'nowrap' }}>Grand Total</th>
                    <th rowSpan={2} style={{ background: '#134E4A', color: '#fff', textAlign: 'center' }}>%</th>
                    <th rowSpan={2} style={{ background: '#134E4A', color: '#fff', textAlign: 'center' }}>Grade</th>
                    <th rowSpan={2} style={{ background: '#134E4A', color: '#fff', textAlign: 'center' }}>Position</th>
                    <th rowSpan={2} style={{ background: '#134E4A', color: '#fff', textAlign: 'center' }}>Division</th>
                    <th rowSpan={2} style={{ background: '#134E4A', color: '#fff', textAlign: 'center' }}>Result</th>
                  </tr>
                  <tr>
                    {subjects.map(sub => (
                      <>
                        <th key={`${sub.id}-obt`} style={{ background: '#1A5E58', color: '#cffafe', fontSize: 10, textAlign: 'center', padding: '3px 6px' }}>Obt</th>
                        <th key={`${sub.id}-gr`}  style={{ background: '#1A5E58', color: '#cffafe', fontSize: 10, textAlign: 'center', padding: '3px 6px' }}>Grd</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => {
                    const div  = getDivision(s.overallPct, thresholds);
                    const pass = !s.isAbsent && (s.overallPct ?? 0) >= (thresholds.thirdDivision ?? 33);
                    const rowBg = s.isAbsent ? '#FEF9C3' : pass ? '#fff' : '#FEF2F2';
                    const gc   = gradeColor(calcGrade(s.overallPct));
                    return (
                      <tr key={s.studentId || s.id} style={{ background: rowBg }}>
                        <td style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700 }}>
                          {s.rollNo || String(idx + 1).padStart(3, '0')}
                        </td>
                        <td style={{ fontWeight: 600, color: '#111827' }}>{s.name}</td>

                        {subjects.map(sub => {
                          const r   = s.subjectResults?.[sub.id] || {};
                          const abs = s.isAbsent || r.isAbsent;
                          const obt = abs ? 'ABS' : (r.obtained !== undefined ? r.obtained : '—');
                          const sgc = gradeColor(r.grade || '—');
                          return (
                            <>
                              <td key={`${s.studentId}-${sub.id}-obt`}
                                style={{ textAlign: 'center', fontWeight: 700, color: abs ? '#94a3b8' : '#0F766E', borderLeft: '1px solid #F3F4F6' }}>
                                {obt}
                              </td>
                              <td key={`${s.studentId}-${sub.id}-gr`} style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: sgc.c, background: sgc.bg, padding: '2px 5px', borderRadius: 3 }}>
                                  {r.grade || '—'}
                                </span>
                              </td>
                            </>
                          );
                        })}

                        <td style={{ textAlign: 'center', fontWeight: 800, color: s.isAbsent ? '#94a3b8' : '#0F766E', borderLeft: '2px solid #E5E7EB' }}>
                          {s.isAbsent ? 'ABS' : (s.totalObtained ?? '—')}
                        </td>
                        <td style={{ textAlign: 'center', color: '#374151' }}>{s.isAbsent ? '—' : (s.grandTotal ?? '—')}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                          {s.isAbsent ? '—' : (s.overallPct !== undefined ? `${s.overallPct}%` : '—')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: 12, color: gc.c, background: gc.bg, padding: '2px 7px', borderRadius: 4 }}>
                            {s.isAbsent ? 'ABS' : calcGrade(s.overallPct)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#7C3AED' }}>
                          {s.isAbsent ? '—' : (s.position ?? '—')}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: div.color, whiteSpace: 'nowrap' }}>
                          {div.label}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${s.isAbsent ? 'badge-gray' : pass ? 'badge-green' : 'badge-red'}`}>
                            {s.isAbsent ? 'Absent' : pass ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom summary */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
              <span><strong style={{ color: '#0F766E' }}>Appeared:</strong> {students.length - absent}</span>
              <span><strong style={{ color: '#15803D' }}>Passed:</strong> {passed}</span>
              <span><strong style={{ color: '#B91C1C' }}>Failed:</strong> {failed}</span>
              <span><strong style={{ color: '#B45309' }}>Absent:</strong> {absent}</span>
              <span><strong style={{ color: '#1D4ED8' }}>Pass %:</strong> {students.length - absent > 0 ? Math.round((passed / (students.length - absent)) * 100) : 0}%</span>
              {gazette?.classAvgPct !== undefined && (
                <span><strong style={{ color: '#7C3AED' }}>Class Avg:</strong> {gazette.classAvgPct}%</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
