/**
 * IlmForge — Enter Marks
 * One exam, one class (or section): a sheet of students × subjects.
 *
 *   • each subject is marked out of its own maximum (Settings → Subjects)
 *   • type A for a student who was absent from that paper
 *   • empty a box and save to take a mark out
 *   • Enter or ↓ goes to the next student, ↑ back; Tab goes across
 *   • the total, percentage and grade of every student update as you type,
 *     graded on the school's own exam settings
 *   • only what was changed is saved
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, ArrowLeft, Trophy } from 'lucide-react';

const NAVY = '#1B2F6E';

/* What a box holds: '' (nothing), 'A' (absent) or a whole number. */
const parseCell = (raw, max) => {
  const v = String(raw ?? '').trim();
  if (v === '') return { kind: 'empty' };
  if (/^a(bsent)?$/i.test(v)) return { kind: 'absent' };
  if (!/^\d+$/.test(v)) return { kind: 'bad', why: /^\d+[.,]\d+$/.test(v) ? 'Whole numbers only' : 'A number, or A for absent' };
  const n = Number(v);
  if (n > max) return { kind: 'bad', why: `More than ${max}` };
  return { kind: 'mark', value: n };
};

const examClassIds = (exam) => {
  let ids = [];
  try { ids = JSON.parse(exam?.classIds || '[]').map((c) => Number(c.classId ?? c)); } catch { ids = []; }
  if (!ids.length && exam?.classId) ids = [exam.classId];
  return ids;
};

export default function ExamMarksPage() {
  const { id: examId } = useParams();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const classId = params.get('classId') || '';
  const sectionId = params.get('sectionId') || '';
  const setPick = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const [cells, setCells] = useState({}); // "studentId:subjectId" -> text
  const [saved, setSaved] = useState({}); // what the server has
  const [saving, setSaving] = useState(false);
  const inputs = useRef({});

  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then((r) => r.data.data || []) });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const { data: settings } = useQuery({ queryKey: ['exam-settings'], queryFn: () => api.get('/settings/exam').then((r) => r.data.data).catch(() => null), staleTime: 300_000 });
  const exam = exams.find((e) => String(e.id) === String(examId));
  const forClasses = useMemo(() => {
    const ids = examClassIds(exam);
    return ids.length ? classes.filter((c) => ids.includes(c.id)) : classes;
  }, [exam, classes]);
  // One class of the exam: open it straight away.
  useEffect(() => { if (!classId && forClasses.length === 1) setPick({ classId: String(forClasses[0].id) }); }, [forClasses]); // eslint-disable-line react-hooks/exhaustive-deps
  const cls = classes.find((c) => String(c.id) === classId);

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: () => api.get('/classes/subjects', { params: { classId } }).then((r) => r.data.data || []),
    enabled: !!classId,
  });
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['marks-students', classId, sectionId],
    queryFn: () => api.get('/students', { params: { classId, sectionId: sectionId || undefined, status: 'active', limit: 500 } }).then((r) => r.data.data || []),
    enabled: !!classId,
  });
  const { data: marks } = useQuery({
    queryKey: ['exam-marks', examId, classId],
    queryFn: () => api.get(`/exams/${examId}/marks`, { params: { classId } }).then((r) => r.data.data || []),
    enabled: !!classId && !!examId,
  });

  // What is saved, as box text.
  useEffect(() => {
    if (!marks) return;
    const m = {};
    marks.forEach((x) => { m[`${x.studentId}:${x.subjectId ?? ''}`] = x.isAbsent ? 'A' : String(x.obtainedMarks - (x.graceMarks || 0)); });
    setSaved(m);
    setCells(m);
  }, [marks]);

  const sorted = useMemo(() => [...students].sort((a, b) => String(a.rollNo || '').localeCompare(String(b.rollNo || ''), undefined, { numeric: true }) || a.name.localeCompare(b.name)), [students]);
  const changed = Object.keys({ ...cells, ...saved }).filter((k) => (cells[k] ?? '').trim().toUpperCase() !== (saved[k] ?? '').trim().toUpperCase());
  const problems = useMemo(() => {
    const out = {};
    for (const s of sorted) for (const sub of subjects) {
      const k = `${s.id}:${sub.id}`;
      const p = parseCell(cells[k], sub.totalMarks);
      if (p.kind === 'bad') out[k] = p.why;
    }
    return out;
  }, [cells, sorted, subjects]);

  // Leaving with marks not saved.
  useEffect(() => {
    if (!changed.length) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const thresholds = useMemo(() => {
    const st = settings || {};
    return [['A+', st.gradeAPlus ?? 90], ['A', st.gradeA ?? 80], ['B', st.gradeB ?? 65], ['C', st.gradeC ?? 50], ['D', st.gradeD ?? 40]];
  }, [settings]);
  const gradeOf = (pct) => (thresholds.find(([, min]) => pct >= min) || ['F'])[0];

  const rowTotal = (s) => {
    let got = 0; let out = 0; let any = false; let failed = false;
    for (const sub of subjects) {
      const p = parseCell(cells[`${s.id}:${sub.id}`], sub.totalMarks);
      if (p.kind === 'mark') { got += p.value; out += sub.totalMarks; any = true; if (gradeOf((p.value / sub.totalMarks) * 100) === 'F') failed = true; }
      if (p.kind === 'absent') { out += sub.totalMarks; any = true; failed = true; }
    }
    if (!any) return null;
    const pct = out ? (got / out) * 100 : 0;
    return { got, out, pct: Math.round(pct * 10) / 10, grade: gradeOf(pct), failed: failed || gradeOf(pct) === 'F' };
  };

  const move = (rowIdx, colIdx, d) => {
    const s = sorted[rowIdx + d];
    if (s) inputs.current[`${s.id}:${subjects[colIdx].id}`]?.focus();
  };

  const save = async () => {
    if (Object.keys(problems).length) { toast.error('Fix the marks shown in red first.'); return; }
    if (!changed.length) { toast('Nothing has changed.', { icon: 'ℹ️' }); return; }
    const payload = changed.map((k) => {
      const [studentId, subjectId] = k.split(':').map((x) => (x === '' ? null : Number(x)));
      const sub = subjects.find((x) => x.id === subjectId);
      const p = parseCell(cells[k], sub?.totalMarks ?? 100);
      if (p.kind === 'empty') return { studentId, subjectId, remove: true, obtainedMarks: null };
      if (p.kind === 'absent') return { studentId, subjectId, isAbsent: true, obtainedMarks: 0 };
      return { studentId, subjectId, obtainedMarks: p.value, isAbsent: false };
    });
    setSaving(true);
    try {
      const r = await api.post(`/exams/${examId}/marks`, { marks: payload });
      toast.success(r.data?.message || 'Marks saved.');
      await qc.invalidateQueries({ queryKey: ['exam-marks', examId, classId] });
      qc.invalidateQueries({ queryKey: ['exam-progress', String(examId)] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'The marks could not be saved.', { duration: 7000 });
    } finally {
      setSaving(false);
    }
  };

  const entered = sorted.reduce((n, s) => n + subjects.filter((sub) => (saved[`${s.id}:${sub.id}`] ?? '') !== '').length, 0);
  const sections = cls?.sections || [];
  const th = { padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: NAVY, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid rgba(27,47,110,0.12)', background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 1 };

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link to="/examination?tab=marks" className="btn btn-outline btn-sm btn-icon" aria-label="Back to the Exam Vault"><ArrowLeft size={15} /></Link>
        <div style={{ flex: '1 1 300px' }}>
          <h1 className="page-title">✏️ Enter Marks{exam ? ` — ${exam.title}` : ''}</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Type <strong>A</strong> for absent · empty a box to take a mark out · Enter goes to the next student</p>
        </div>
        {classId && <Link to={`/exams/${examId}/results?classId=${classId}${sectionId ? `&sectionId=${sectionId}` : ''}`} className="btn btn-outline btn-sm"><Trophy size={14} /> Results</Link>}
        <button type="button" className="btn btn-teal" onClick={save} disabled={saving || !classId}>
          <Save size={15} /> {saving ? 'Saving…' : changed.length ? `Save ${changed.length} change${changed.length === 1 ? '' : 's'}` : 'Saved'}
        </button>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 200px' }}>
          Class
          <select className="form-select" aria-label="Class" value={classId} onChange={(e) => {
            if (changed.length && !window.confirm('Leave this class without saving the changes?')) return;
            setPick({ classId: e.target.value, sectionId: '' });
          }}>
            <option value="">Choose class…</option>
            {forClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 160px' }}>
          Section
          <select className="form-select" aria-label="Section" value={sectionId} disabled={!sections.length} onChange={(e) => setPick({ sectionId: e.target.value })}>
            <option value="">{sections.length ? 'All sections' : '—'}</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {classId && subjects.length > 0 && (
          <div style={{ fontSize: 12.5, color: '#475569', flex: '2 1 260px' }}>
            {sorted.length} students · {subjects.length} subjects · <strong>{entered}</strong> of {sorted.length * subjects.length} marks saved
            {exam?.isPublished && <div style={{ color: '#B45309' }}>Published: parents see changes straight away.</div>}
          </div>
        )}
      </div>

      {!classId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Choose the class to enter its marks.</div>
      ) : loadingSubjects || loadingStudents ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: NAVY }}>{cls?.name} has no subjects yet</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>Add them in <Link to="/settings/subjects">Settings → Subjects</Link>, with the marks each one is out of.</div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: '#64748B' }}>No active students in this class{sectionId ? ' and section' : ''}.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto', maxHeight: '70vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} aria-label="Marks sheet">
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'left', left: 0, zIndex: 2 }}>Student</th>
                  {subjects.map((sub) => <th key={sub.id} style={th}>{sub.name}<div style={{ fontWeight: 500, opacity: 0.75, textTransform: 'none' }}>out of {sub.totalMarks}</div></th>)}
                  <th style={th}>Total</th>
                  <th style={th}>%</th>
                  <th style={th}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, ri) => {
                  const t = rowTotal(s);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 10px', position: 'sticky', left: 0, background: '#fff', minWidth: 170 }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{s.rollNo || '—'}</div>
                      </td>
                      {subjects.map((sub, ci) => {
                        const k = `${s.id}:${sub.id}`;
                        const val = cells[k] ?? '';
                        const bad = problems[k];
                        const isChanged = (val || '').trim().toUpperCase() !== (saved[k] || '').trim().toUpperCase();
                        const absent = /^a/i.test(val.trim());
                        return (
                          <td key={sub.id} style={{ padding: '5px 6px', textAlign: 'center' }}>
                            <input
                              ref={(el) => { inputs.current[k] = el; }}
                              value={val}
                              inputMode="numeric"
                              aria-label={`${s.name}, ${sub.name}, out of ${sub.totalMarks}`}
                              aria-invalid={bad ? 'true' : undefined}
                              title={bad || (absent ? 'Absent' : '')}
                              onChange={(e) => setCells((c) => ({ ...c, [k]: e.target.value.slice(0, 6) }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); move(ri, ci, 1); }
                                if (e.key === 'ArrowUp') { e.preventDefault(); move(ri, ci, -1); }
                              }}
                              onFocus={(e) => e.target.select()}
                              style={{
                                width: 62, textAlign: 'center', padding: '6px 4px', borderRadius: 7, fontSize: 14, fontWeight: 700,
                                border: bad ? '2px solid #DC2626' : isChanged ? '2px solid #F59E0B' : '1.5px solid #E2E8F0',
                                background: bad ? '#FEF2F2' : absent ? '#F1F5F9' : val !== '' ? '#F0FDF4' : '#fff',
                                color: absent ? '#64748B' : '#0F172A',
                              }}
                            />
                            {bad && <div style={{ fontSize: 10, color: '#B91C1C', marginTop: 2 }}>{bad}</div>}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{t ? `${t.got}/${t.out}` : '—'}</td>
                      <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{t ? t.pct : '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {t && <span style={{ fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: t.failed ? '#FEE2E2' : '#DCFCE7', color: t.failed ? '#B91C1C' : '#166534' }}>{t.grade}{t.failed && t.grade !== 'F' ? '*' : ''}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 14px', fontSize: 11.5, color: '#64748B', borderTop: '1px solid #F1F5F9' }}>
            Orange box: changed, not saved yet. Red: needs fixing. * failed in a subject (or absent from one). Grades follow the school's exam settings.
          </div>
        </div>
      )}
    </div>
  );
}
