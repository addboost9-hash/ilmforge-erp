/**
 * IlmForge — Annual Result Card
 *
 * Every exam of a class in an academic session, subject by subject: each
 * exam's marks, the year's total, percentage, grade, position in the class,
 * attendance, and pass or fail, from GET /exams/annual with the school's own
 * grading. Prints one framed A4 card per student (or one student), with the
 * signatories and stamp of the result card settings.
 *
 * Exams saved without a session count when they were held in it. This page
 * used to show nothing: it read subjects and exams the server never sent,
 * and only exams saved with a session were looked for.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Search, Award } from 'lucide-react';
import api from '../../api/client';
import { useSchoolStamp, stampFor } from '../../utils/schoolStamp';
import { printAnnualCards, pickSigners, remarkFor } from '../../utils/resultCardPrint';

const NAVY = '#1B2F6E';
const ordinal = (n) => (n ? `${n}${[, 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'}` : '—');
const pct = (n) => `${Math.round(Number(n || 0) * 10) / 10}%`;
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };

export default function AnnualReportCardPage() {
  const q = new URLSearchParams(window.location.search);
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState(q.get('classId') || '');
  const [sectionId, setSectionId] = useState(q.get('sectionId') || '');
  const [search, setSearch] = useState('');
  const stamp = stampFor(useSchoolStamp(), 'resultCards');

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  useEffect(() => { if (!classId && classes.length) setClassId(String(classes[0].id)); }, [classes, classId]);
  const { data: settings } = useQuery({ queryKey: ['exam-settings'], queryFn: () => api.get('/settings/exam').then((r) => r.data.data).catch(() => null), staleTime: 300_000 });
  const { data: resultConfig } = useQuery({ queryKey: ['result-config-print'], queryFn: () => api.get('/exams/result-config').then((r) => r.data.data).catch(() => null), staleTime: 300_000 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['annual-result', classId, sectionId, sessionId],
    queryFn: () => api.get('/exams/annual', { params: { classId, sectionId: sectionId || undefined, sessionId: sessionId || undefined } }).then((r) => r.data.data),
    enabled: !!classId,
  });
  const cls = classes.find((c) => String(c.id) === String(classId));
  const exams = data?.exams || [];
  const students = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (data?.students || []).filter((s) => !t || s.name.toLowerCase().includes(t) || String(s.rollNo).toLowerCase().includes(t));
  }, [data, search]);

  const print = (list) => printAnnualCards({
    data, students: list, settings,
    signers: pickSigners({ config: resultConfig, settings, stamp }),
    remarkFor: (p) => remarkFor(resultConfig, p),
  });

  const passed = (data?.students || []).filter((s) => s.passed).length;

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/examination?tab=results" className="btn btn-outline btn-sm btn-icon" aria-label="Back to the Exam Vault"><ArrowLeft size={15} /></Link>
        <div style={{ flex: '1 1 260px' }}>
          <h1 className="page-title">Annual Result Card</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Every exam of the session, subject by subject, with the year's result and position in the class</p>
        </div>
        <button className="btn btn-teal btn-sm" disabled={!students.length} onClick={() => print(students)}>
          <Printer size={14} /> Print {students.length > 1 ? `all ${students.length} cards` : 'card'}
        </button>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end' }}>
        <label style={lbl}>Session
          <select className="form-select" aria-label="Session" value={sessionId || data?.session?.id || ''} onChange={(e) => setSessionId(e.target.value)}>
            {!(data?.sessions || []).length && <option value="">No session yet</option>}
            {(data?.sessions || []).map((s) => <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (current)' : ''}</option>)}
          </select>
        </label>
        <label style={lbl}>Class
          <select className="form-select" aria-label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={lbl}>Section
          <select className="form-select" aria-label="Section" value={sectionId} disabled={!cls?.sections?.length} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {(cls?.sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label style={lbl}>Find a student
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" aria-label="Find a student" placeholder="Name or roll no." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
          </div>
        </label>
      </div>

      {data && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14, fontSize: 12.5, color: '#475569' }} aria-label="Exams counted">
          <b style={{ color: NAVY }}>{exams.length} exam{exams.length === 1 ? '' : 's'} counted:</b>
          {exams.map((e) => <span key={e.id} style={{ background: '#EEF2FF', color: NAVY, borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>{e.title}</span>)}
          {data.students?.length > 0 && <span style={{ marginLeft: 'auto' }}>{data.students.length} students · {passed} passed · class average {pct(data.classAverage)} · highest {pct(data.classHighest)}</span>}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" aria-label="Annual results">
            <thead>
              <tr>
                <th>Roll</th><th>Name</th>
                {exams.map((e) => <th key={e.id} style={{ textAlign: 'center' }}>{e.title}</th>)}
                <th style={{ textAlign: 'center' }}>Total</th><th style={{ textAlign: 'center' }}>%</th><th style={{ textAlign: 'center' }}>Grade</th><th style={{ textAlign: 'center' }}>Position</th><th>Result</th><th aria-label="Print" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={exams.length + 8} style={{ padding: 20, color: '#94A3B8' }}>Loading…</td></tr>}
              {error && <tr><td colSpan={exams.length + 8} style={{ padding: 20, color: '#B91C1C' }}>{error.response?.data?.message || 'The results could not be loaded.'}</td></tr>}
              {data && !students.length && (
                <tr><td colSpan={exams.length + 8}>
                  <div className="empty-state"><div className="empty-state-icon"><Award size={36} color="#94A3B8" /></div>
                    <div className="empty-state-text">{exams.length ? 'No student found' : 'No marks for this class in this session yet'}</div>
                    <div className="empty-state-sub">Exams count when they were saved with the session, or held between its start and end dates.</div></div>
                </td></tr>
              )}
              {students.map((s) => (
                <tr key={s.studentId}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.rollNo}</td>
                  <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{s.name}<div style={{ fontWeight: 400, fontSize: 11.5, color: '#64748B' }}>{[s.className, s.sectionName].filter(Boolean).join(' – ')}</div></td>
                  {exams.map((e) => { const t = s.exams?.[e.id]; return <td key={e.id} style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{t ? `${t.obtained}/${t.total}` : '—'}</td>; })}
                  <td style={{ textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.totalObtained}/{s.totalMarks}</td>
                  <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{pct(s.percentage)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>{s.grade}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: s.position <= 3 ? '#B45309' : '#475569' }}>{ordinal(s.position)}</td>
                  <td><span style={{ fontWeight: 700, color: s.passed ? '#15803D' : '#B91C1C' }}>{s.passed ? 'Pass' : 'Fail'}</span></td>
                  <td><button type="button" className="btn btn-outline btn-sm btn-icon" title={`Print ${s.name}'s annual result card`} aria-label={`Print ${s.name}'s annual result card`} onClick={() => print([s])}><Printer size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
