/**
 * IlmForge — Exam Results for one class or section
 *
 * The result sheet (every student, every subject, total, percentage, grade,
 * position in class, pass or fail) and A4 report cards to print, worked out
 * on the server (GET /exams/:id/gazette) with the school's own grading.
 *
 * Report cards used to print without names, and every subject as "General":
 * the marks came back without the student or subject attached.
 */
import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { printHTML } from '../../utils/print';
import { ArrowLeft, Printer, PencilLine } from 'lucide-react';

const NAVY = '#1B2F6E';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ordinal = (n) => (n ? `${n}${[, 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'}` : '—');

function reportCardsHTML(rows, { exam, school, settings }) {
  const logo = school?.logoUrl || '';
  const show = (k, d = true) => (settings?.[k] ?? d);
  const cards = rows.map((r) => `
  <div class="card">
    <div class="head">
      ${logo ? `<img class="logo" src="${esc(logo)}" alt=""/>` : ''}
      <div><div class="sch">${esc(school?.name || 'School')}</div><div class="sub">${esc(school?.address || '')}</div></div>
      <div class="title">RESULT CARD<br/><span>${esc(exam?.title || '')}</span></div>
    </div>
    <table class="info">
      <tr><td><b>Name:</b> ${esc(r.name)}</td><td><b>Roll No:</b> ${esc(r.rollNo || '—')}</td>${r.photoUrl ? `<td rowspan="2" class="ph"><img src="${esc(r.photoUrl)}" alt=""/></td>` : ''}</tr>
      <tr><td><b>Father's name:</b> ${esc(r.fatherName || '—')}</td><td><b>Class:</b> ${esc([r.className, r.sectionName].filter(Boolean).join(' — '))}</td></tr>
    </table>
    <table class="marks">
      <tr><th>Subject</th><th>Total</th><th>Obtained</th><th>%</th>${show('showGradeOnMarksheet') ? '<th>Grade</th>' : ''}</tr>
      ${r.subjects.map((s) => `<tr><td dir="auto">${esc(s.subjectName)}</td><td>${s.total}</td><td>${s.isAbsent ? 'Absent' : s.obtained}</td><td>${s.isAbsent ? '—' : Math.round((s.obtained / s.total) * 100)}</td>${show('showGradeOnMarksheet') ? `<td>${esc(s.grade)}</td>` : ''}</tr>`).join('')}
      <tr class="tot"><td>Total</td><td>${r.totalMarks}</td><td>${r.totalObtained}</td><td>${r.percentage}</td>${show('showGradeOnMarksheet') ? `<td>${esc(r.grade)}</td>` : ''}</tr>
    </table>
    <table class="sum"><tr>
      ${show('showPercentageOnMarksheet') ? `<td><b>Percentage</b><br/>${r.percentage}%</td>` : ''}
      ${show('showGradeOnMarksheet') ? `<td><b>Grade</b><br/>${esc(r.grade)}</td>` : ''}
      ${show('showRankOnMarksheet') ? `<td><b>Position</b><br/>${ordinal(r.position)}</td>` : ''}
      <td><b>Division</b><br/>${esc(r.division)}</td>
      <td><b>Result</b><br/><span class="${r.passed ? 'pass' : 'fail'}">${r.passed ? 'PASS' : 'FAIL'}</span></td>
    </tr></table>
    <div class="signs">
      ${show('showTeacherSignature') ? '<div>Class Teacher</div>' : ''}
      <div>Parent / Guardian</div>
      ${show('showPrincipalSignature') ? '<div>Principal</div>' : ''}
    </div>
  </div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(exam?.title || 'Results')} — Report cards</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#000}
    .card{width:190mm;min-height:130mm;margin:0 auto 8mm;padding:8mm;border:2px solid #000;page-break-inside:avoid;page-break-after:always}
    .card:last-child{page-break-after:auto}
    .head{display:flex;align-items:center;gap:10px;border-bottom:2px solid #000;padding-bottom:6px}
    .logo{width:54px;height:54px;object-fit:contain}.sch{font-size:18px;font-weight:800}.sub{font-size:11px}
    .title{margin-left:auto;text-align:center;font-weight:800;font-size:14px}.title span{font-size:11px;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border:1px solid #000;padding:5px 7px;font-size:12px;text-align:left}
    th{background:#eee}.marks td:not(:first-child),.marks th:not(:first-child){text-align:center}
    .tot td{font-weight:800;background:#f5f5f5}.sum td{text-align:center}
    .ph{width:28mm;text-align:center}.ph img{width:24mm;height:28mm;object-fit:cover}
    .pass{color:#0a6a2a;font-weight:800}.fail{color:#b00;font-weight:800}
    .signs{display:flex;justify-content:space-between;margin-top:16mm}.signs div{border-top:1px solid #000;padding-top:3px;width:45mm;text-align:center;font-size:11px}
    @page{size:A4;margin:8mm}
  </style></head><body>${cards}</body></html>`;
}

function resultSheetHTML(rows, subjects, { exam, school, label }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(exam?.title)} — ${esc(label)}</title><style>
    body{font-family:Arial,sans-serif;margin:0;padding:6mm;color:#000}
    h2{margin:0}h3{margin:2px 0 8px;font-weight:600}
    table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:4px 5px;font-size:11px;text-align:center}
    td.l,th.l{text-align:left}th{background:#eee}.fail{color:#b00;font-weight:700}
    @page{size:A4 landscape;margin:7mm}
  </style></head><body>
  <h2>${esc(school?.name || 'School')}</h2><h3>${esc(exam?.title)} — Result sheet — ${esc(label)}</h3>
  <table><tr><th>Pos.</th><th>Roll</th><th class="l">Name</th>${subjects.map((s) => `<th>${esc(s.name)}<br/>/${s.total}</th>`).join('')}<th>Total</th><th>%</th><th>Grade</th><th>Result</th></tr>
  ${rows.map((r) => `<tr><td>${r.position}</td><td>${esc(r.rollNo || '')}</td><td class="l">${esc(r.name)}</td>${subjects.map((s) => {
    const m = r.subjects.find((x) => x.subjectId === s.id);
    return `<td${m && m.grade === 'F' ? ' class="fail"' : ''}>${m ? (m.isAbsent ? 'A' : m.obtained) : ''}</td>`;
  }).join('')}<td>${r.totalObtained}/${r.totalMarks}</td><td>${r.percentage}</td><td>${esc(r.grade)}</td><td class="${r.passed ? '' : 'fail'}">${r.passed ? 'Pass' : 'Fail'}</td></tr>`).join('')}
  </table></body></html>`;
}

export default function ExamResultsPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') || '';
  const sectionId = params.get('sectionId') || '';
  const setPick = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then((r) => r.data.data || []) });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then((r) => r.data.data).catch(() => ({})) });
  const { data: settings } = useQuery({ queryKey: ['exam-settings'], queryFn: () => api.get('/settings/exam').then((r) => r.data.data).catch(() => null), staleTime: 300_000 });
  const exam = exams.find((e) => e.id === parseInt(id));
  const forClasses = useMemo(() => {
    let ids = [];
    try { ids = JSON.parse(exam?.classIds || '[]').map((c) => Number(c.classId ?? c)); } catch { ids = []; }
    if (!ids.length && exam?.classId) ids = [exam.classId];
    return ids.length ? classes.filter((c) => ids.includes(c.id)) : classes;
  }, [exam, classes]);
  useEffect(() => { if (!classId && forClasses.length) setPick({ classId: String(forClasses[0].id) }); }, [forClasses]); // eslint-disable-line react-hooks/exhaustive-deps
  const cls = classes.find((c) => String(c.id) === classId);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['exam-results-sheet', id, classId, sectionId],
    queryFn: () => api.get(`/exams/${id}/gazette`, { params: { classId, sectionId: sectionId || undefined, photos: '1' } }).then((r) => r.data.data || []),
    enabled: !!classId,
  });

  const subjects = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => r.subjects.forEach((s) => { if (!m.has(s.subjectId)) m.set(s.subjectId, { id: s.subjectId, name: s.subjectName, total: s.total }); }));
    return [...m.values()];
  }, [rows]);
  const sorted = useMemo(() => [...rows].sort((a, b) => a.position - b.position || String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true })), [rows]);
  const passed = rows.filter((r) => r.passed).length;
  const absentAny = rows.filter((r) => r.subjects.some((s) => s.isAbsent)).length;
  const avg = rows.length ? Math.round((rows.reduce((a, r) => a + r.percentage, 0) / rows.length) * 10) / 10 : 0;
  const label = [cls?.name, cls?.sections?.find((s) => String(s.id) === sectionId)?.name].filter(Boolean).join(' — ');

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link to="/examination?tab=results" className="btn btn-outline btn-sm btn-icon" aria-label="Back to the Exam Vault"><ArrowLeft size={15} /></Link>
        <div style={{ flex: '1 1 260px' }}>
          <h1 className="page-title">Exam Results</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>{exam?.title}{label ? ` · ${label}` : ''}{exam ? (exam.isPublished ? ' · published to parents' : ' · not published yet') : ''}</p>
        </div>
        <Link to={`/exams/${id}/marks?classId=${classId}${sectionId ? `&sectionId=${sectionId}` : ''}`} className="btn btn-outline btn-sm"><PencilLine size={14} /> Edit marks</Link>
        <button type="button" className="btn btn-outline btn-sm" disabled={!rows.length} onClick={() => printHTML(resultSheetHTML(sorted, subjects, { exam, school, label }), { title: 'Result sheet' })}><Printer size={14} /> Print result sheet</button>
        <button type="button" className="btn btn-teal btn-sm" disabled={!rows.length} onClick={() => printHTML(reportCardsHTML([...rows].sort((a, b) => String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true })), { exam, school, settings }), { title: 'Report cards' })}><Printer size={14} /> Print report cards (A4)</button>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 200px' }}>
          Class
          <select className="form-select" aria-label="Class" value={classId} onChange={(e) => setPick({ classId: e.target.value, sectionId: '' })}>
            {forClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 160px' }}>
          Section
          <select className="form-select" aria-label="Section" value={sectionId} disabled={!cls?.sections?.length} onChange={(e) => setPick({ sectionId: e.target.value })}>
            <option value="">All sections</option>
            {(cls?.sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }} aria-label="Summary">
          {[['Students', rows.length, NAVY], ['Passed', passed, '#15803D'], ['Failed', rows.length - passed, '#B91C1C'], ['Absent in a paper', absentAny, '#64748B'], ['Average', `${avg}%`, '#0073b7']].map(([l, v, c]) => (
            <div key={l} style={{ flex: '1 1 120px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" aria-label="Result sheet">
            <thead>
              <tr>
                <th>Pos.</th><th>Roll</th><th>Name</th>
                {subjects.map((s) => <th key={s.id} style={{ textAlign: 'center' }}>{s.name}<div style={{ fontWeight: 500, opacity: 0.7 }}>/{s.total}</div></th>)}
                <th>Total</th><th>%</th><th>Grade</th><th>Result</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={subjects.length + 7} style={{ padding: 20, color: '#94A3B8' }}>Loading…</td></tr>}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={subjects.length + 7}>
                  <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">No marks for this class yet</div>
                    <div className="empty-state-sub"><Link to={`/exams/${id}/marks?classId=${classId}`}>Enter the marks</Link> first.</div></div>
                </td></tr>
              )}
              {sorted.map((r) => (
                <tr key={r.studentId}>
                  <td style={{ fontWeight: 800, color: r.position <= 3 ? '#B45309' : '#475569' }}>{ordinal(r.position)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.rollNo}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  {subjects.map((s) => {
                    const m = r.subjects.find((x) => x.subjectId === s.id);
                    return <td key={s.id} style={{ textAlign: 'center', color: m?.grade === 'F' ? '#B91C1C' : undefined, fontWeight: m?.grade === 'F' ? 700 : 400 }}>{m ? (m.isAbsent ? 'A' : m.obtained) : '—'}</td>;
                  })}
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.totalObtained}/{r.totalMarks}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.percentage}</td>
                  <td style={{ fontWeight: 700 }}>{r.grade}</td>
                  <td><span style={{ fontWeight: 700, color: r.passed ? '#15803D' : '#B91C1C' }}>{r.passed ? 'Pass' : 'Fail'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
