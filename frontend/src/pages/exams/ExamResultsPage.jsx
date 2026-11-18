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
import { useSchoolStamp, stampFor } from '../../utils/schoolStamp';
import { printResultCards, printResultSheet, pickSigners, remarkFor } from '../../utils/resultCardPrint';
import { gradesFromSettings } from '../../utils/printKit';
import { ArrowLeft, Printer, PencilLine } from 'lucide-react';

const NAVY = '#1B2F6E';
const ordinal = (n) => (n ? `${n}${[, 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'}` : '—');

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
  const { data: resultConfig } = useQuery({ queryKey: ['result-config-print'], queryFn: () => api.get('/exams/result-config').then((r) => r.data.data).catch(() => null), staleTime: 300_000 });
  const stamp = stampFor(useSchoolStamp(), 'resultCards');
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

  // Position "of how many", and the highest percentage, within each student's own class.
  const classStats = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const k = r.classId || 0;
      const x = m.get(k) || { size: 0, highest: 0 };
      x.size += 1; x.highest = Math.max(x.highest, r.percentage);
      m.set(k, x);
    }
    return m;
  }, [rows]);
  const printCards = (list) => printResultCards({
    cards: list.map((r) => ({ row: r, classSize: classStats.get(r.classId || 0)?.size, classHighest: classStats.get(r.classId || 0)?.highest, remark: remarkFor(resultConfig, r.percentage) })),
    exam, school, settings,
    grading: gradesFromSettings(settings),
    signers: pickSigners({ config: resultConfig, settings, stamp }),
  });
  const byRoll = [...rows].sort((a, b) => String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true }));

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link to="/examination?tab=results" className="btn btn-outline btn-sm btn-icon" aria-label="Back to the Exam Vault"><ArrowLeft size={15} /></Link>
        <div style={{ flex: '1 1 260px' }}>
          <h1 className="page-title">Exam Results</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>{exam?.title}{label ? ` · ${label}` : ''}{exam ? (exam.isPublished ? ' · published to parents' : ' · not published yet') : ''}</p>
        </div>
        <Link to={`/exams/${id}/marks?classId=${classId}${sectionId ? `&sectionId=${sectionId}` : ''}`} className="btn btn-outline btn-sm"><PencilLine size={14} /> Edit marks</Link>
        <button type="button" className="btn btn-outline btn-sm" disabled={!rows.length} onClick={() => printResultSheet({ rows: sorted, subjects, exam, school, label, signers: pickSigners({ config: resultConfig, settings, stamp, parent: false }) })}><Printer size={14} /> Print result sheet</button>
        <button type="button" className="btn btn-teal btn-sm" disabled={!rows.length} onClick={() => printCards(byRoll)}><Printer size={14} /> Print result cards (A4)</button>
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
                <th>Total</th><th>%</th><th>Grade</th><th>Result</th><th aria-label="Result card" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={subjects.length + 8} style={{ padding: 20, color: '#94A3B8' }}>Loading…</td></tr>}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={subjects.length + 8}>
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
                  <td><button type="button" className="btn btn-outline btn-sm btn-icon" title={`Print ${r.name}'s result card`} aria-label={`Print ${r.name}'s result card`} onClick={() => printCards([r])}><Printer size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
