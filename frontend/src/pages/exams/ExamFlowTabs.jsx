/**
 * The last two steps of an exam in the Exam Vault:
 *   Marks Entry — each class of the exam, how many marks are in, and a
 *                 button to enter (or finish) them.
 *   Results     — for a class or section: pass/fail, average, top
 *                 positions, the result sheet and report cards, gazette,
 *                 merit and failed lists, and publishing to parents.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { PencilLine, Trophy, FileSpreadsheet, ListOrdered, AlertTriangle, Send, EyeOff } from 'lucide-react';

const NAVY = '#1B2F6E';
const sel = { padding: '8px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, minWidth: 0 };

/* The newest exam is the one being worked on. */
function useExamChoice(initialExamId = '') {
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then((r) => r.data.data || []) });
  const [examId, setExamId] = useState(initialExamId ? String(initialExamId) : '');
  useEffect(() => { if (!examId && exams.length) setExamId(String(exams[0].id)); }, [exams, examId]);
  return { exams, examId, setExamId, exam: exams.find((e) => String(e.id) === examId) };
}

function ExamPicker({ exams, examId, setExamId }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 240px' }}>
      Exam
      <select aria-label="Exam" style={sel} value={examId} onChange={(e) => setExamId(e.target.value)}>
        {exams.length === 0 && <option value="">No exams yet — add one in Exam Setup</option>}
        {exams.map((e) => <option key={e.id} value={e.id}>{e.title}{e.term ? ` (${e.term} term)` : ''}{e.isPublished ? ' · published' : ''}</option>)}
      </select>
    </label>
  );
}

/* ═══ Marks Entry ════════════════════════════════════════════════════ */
export function MarksEntryTab({ initialExamId } = {}) {
  const { exams, examId, setExamId, exam } = useExamChoice(initialExamId);
  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['exam-progress', examId],
    queryFn: () => api.get(`/exams/${examId}/progress`).then((r) => r.data.data || []),
    enabled: !!examId,
  });
  return (
    <div>
      <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <ExamPicker exams={exams} examId={examId} setExamId={setExamId} />
        <div style={{ fontSize: 12.5, color: '#64748B', flex: '2 1 300px' }}>
          Each subject is marked out of its own maximum (set in Settings → Subjects). Type <strong>A</strong> for a student who was absent.
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table" aria-label="Marks entry progress">
            <thead><tr><th>Class</th><th>Students</th><th>Subjects</th><th style={{ minWidth: 220 }}>Marks entered</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{ padding: 20, color: '#94A3B8' }}>Loading…</td></tr>}
              {!isLoading && examId && progress.length === 0 && <tr><td colSpan={6} style={{ padding: 20, color: '#94A3B8' }}>This exam has no classes.</td></tr>}
              {progress.map((p) => {
                const done = p.expected > 0 && p.entered >= p.expected;
                const started = p.entered > 0;
                return (
                  <tr key={p.classId}>
                    <td style={{ fontWeight: 700, color: NAVY }}>{p.className}</td>
                    <td>{p.students}</td>
                    <td>{p.subjects || <span style={{ color: '#B45309', fontSize: 12 }}>none — <Link to="/settings/subjects">add subjects</Link></span>}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${p.percent}%`, height: '100%', background: done ? '#16A34A' : '#0073b7' }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#475569', minWidth: 80, fontVariantNumeric: 'tabular-nums' }}>{p.entered}/{p.expected}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: done ? '#DCFCE7' : started ? '#DBEAFE' : '#F1F5F9', color: done ? '#166534' : started ? '#1E40AF' : '#475569' }}>
                        {done ? 'Complete' : started ? 'In progress' : 'Not started'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link className="btn btn-teal btn-sm" to={`/exams/${examId}/marks?classId=${p.classId}`} aria-label={`Enter marks for ${p.className}`}>
                        <PencilLine size={13} /> {done ? 'Check marks' : started ? 'Continue' : 'Enter marks'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {exam && exam.isPublished && (
        <div role="note" style={{ marginTop: 12, fontSize: 12.5, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px' }}>
          This exam is published: parents see any change to the marks straight away.
        </div>
      )}
    </div>
  );
}

/* ═══ Results ════════════════════════════════════════════════════════ */
export function ResultsOverviewTab({ initialExamId } = {}) {
  const qc = useQueryClient();
  const { exams, examId, setExamId, exam } = useExamChoice(initialExamId);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const { data: progress = [] } = useQuery({
    queryKey: ['exam-progress', examId],
    queryFn: () => api.get(`/exams/${examId}/progress`).then((r) => r.data.data || []),
    enabled: !!examId,
  });
  const firstExam = useRef(examId);
  useEffect(() => {
    if (firstExam.current === examId) return;
    firstExam.current = examId;
    setClassId(''); setSectionId('');
  }, [examId]);
  useEffect(() => { if (!classId && progress.length) setClassId(String(progress[0].classId)); }, [progress, classId]);
  const sections = classes.find((c) => String(c.id) === classId)?.sections || [];

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['gazette', examId, classId, sectionId],
    queryFn: () => api.get(`/exams/${examId}/gazette`, { params: { classId: classId || undefined, sectionId: sectionId || undefined } }).then((r) => r.data.data || []),
    enabled: !!examId && !!classId,
  });

  const stats = useMemo(() => {
    const n = rows.length;
    const passed = rows.filter((r) => r.passed).length;
    const avg = n ? rows.reduce((a, r) => a + r.percentage, 0) / n : 0;
    return { n, passed, failed: n - passed, avg: Math.round(avg * 10) / 10, top: rows.filter((r) => r.position <= 3).slice(0, 5) };
  }, [rows]);

  const publish = useMutation({
    mutationFn: (on) => api.post(`/exams/${examId}/${on ? 'publish' : 'unpublish'}`),
    onSuccess: (r, on) => {
      toast.success(on ? 'Published: parents and students can now see this result in their portal.' : 'Hidden from parents and students again.');
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not change it.'),
  });

  const q = `examId=${examId}&classId=${classId}${sectionId ? `&sectionId=${sectionId}` : ''}`;
  const tile = (label, value, color) => (
    <div style={{ flex: '1 1 130px', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', background: '#fff' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748B' }}>{label}</div>
    </div>
  );

  return (
    <div>
      <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <ExamPicker exams={exams} examId={examId} setExamId={setExamId} />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 160px' }}>
          Class
          <select aria-label="Result class" style={sel} value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
            {progress.map((p) => <option key={p.classId} value={p.classId}>{p.className}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 140px' }}>
          Section
          <select aria-label="Result section" style={sel} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {exam && (
        <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderLeft: `4px solid ${exam.isPublished ? '#16A34A' : '#F59E0B'}` }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontWeight: 700, color: NAVY }}>{exam.isPublished ? 'Published' : 'Not published yet'}</div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              {exam.isPublished
                ? 'Parents and students see this exam\'s result in their portal.'
                : 'Check every class\'s marks first. Publishing shows the result to parents and students in their portal.'}
            </div>
          </div>
          {exam.isPublished
            ? <button type="button" className="btn btn-outline" disabled={publish.isPending} onClick={() => publish.mutate(false)}><EyeOff size={14} /> Hide again</button>
            : <button type="button" className="btn btn-teal" disabled={publish.isPending} onClick={() => { if (window.confirm(`Publish "${exam.title}" to parents and students?`)) publish.mutate(true); }}><Send size={14} /> Publish result</button>}
        </div>
      )}

      {examId && classId && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }} aria-label="Result summary">
            {tile('Students with marks', isLoading ? '…' : stats.n, NAVY)}
            {tile('Passed', isLoading ? '…' : stats.passed, '#15803D')}
            {tile('Failed', isLoading ? '…' : stats.failed, '#B91C1C')}
            {tile('Average', isLoading ? '…' : `${stats.avg}%`, '#0073b7')}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: '1 1 320px', padding: 14 }}>
              <div style={{ fontWeight: 700, color: NAVY, marginBottom: 8 }}>Top positions</div>
              {stats.top.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No marks entered for this class yet.</div> : stats.top.map((r) => (
                <div key={r.studentId} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                  <span style={{ fontWeight: 800, color: '#B45309', width: 30 }}>{r.position}{['st', 'nd', 'rd'][r.position - 1] || 'th'}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.percentage}% · {r.grade}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ flex: '1 1 320px', padding: 14, display: 'grid', gap: 8, alignContent: 'start' }}>
              <div style={{ fontWeight: 700, color: NAVY }}>Print and lists</div>
              <Link className="btn btn-teal" to={`/exams/${examId}/results?classId=${classId}${sectionId ? `&sectionId=${sectionId}` : ''}`}><Trophy size={14} /> Result sheet and report cards</Link>
              <Link className="btn btn-outline" to={`/exams/gazette?${q}`}><FileSpreadsheet size={14} /> Gazette (award list)</Link>
              <Link className="btn btn-outline" to={`/exams/merit-list?${q}`}><ListOrdered size={14} /> Merit list</Link>
              <Link className="btn btn-outline" to={`/exams/failed?${q}`}><AlertTriangle size={14} /> Failed students</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
