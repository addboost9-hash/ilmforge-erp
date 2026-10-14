/**
 * Question papers in the Exam Vault: choose the exam and class, see which
 * subjects already have a paper, and write each paper with its questions —
 * multiple choice, true/false, fill in the blank, short and long questions,
 * "attempt any N" parts — then print it and its answer key.
 *
 * Papers are saved on the server (/papers). The old generator stored empty
 * templates that printed "Objective questions appear here".
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { printPaper } from './paperPrint';
import { Plus, Printer, Copy, Trash2, Pencil, X, ArrowUp, ArrowDown, Sparkles, Save, KeyRound, FileText } from 'lucide-react';

const NAVY = '#1B2F6E';
const TYPES = [
  { v: 'mcq', l: 'Multiple choice', marks: 1 },
  { v: 'truefalse', l: 'True / False', marks: 1 },
  { v: 'fill', l: 'Fill in the blank', marks: 1 },
  { v: 'short', l: 'Short question', marks: 2 },
  { v: 'long', l: 'Long question', marks: 5 },
];
const typeLabel = (v) => TYPES.find((t) => t.v === v)?.l || v;
const newQuestion = (type) => ({
  type, text: '', marks: TYPES.find((t) => t.v === type)?.marks ?? 1,
  ...(type === 'mcq' ? { options: ['', '', '', ''], answer: null } : { answer: type === 'truefalse' ? null : '' }),
});
const sectionMarks = (sec) => {
  const m = (sec.questions || []).map((q) => Number(q.marks) || 0).sort((a, b) => b - a);
  const att = Number(sec.attempt);
  return (Number.isInteger(att) && att >= 1 && att < m.length ? m.slice(0, att) : m).reduce((a, b) => a + b, 0);
};

/* ═══ The tab ═══════════════════════════════════════════════════════ */
export default function QuestionPapersTab({ initialExamId = '' }) {
  const qc = useQueryClient();
  const [examId, setExamId] = useState(initialExamId ? String(initialExamId) : '');
  const [classId, setClassId] = useState('');
  const [editing, setEditing] = useState(null); // { id } | { preset }
  const [view, setView] = useState('papers'); // papers | setup

  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then((r) => r.data.data || []) });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then((r) => r.data.data).catch(() => ({})) });
  const exam = exams.find((e) => String(e.id) === examId);

  // The classes the chosen exam is for.
  const examClasses = useMemo(() => {
    if (!exam) return classes;
    let ids = [];
    try { ids = JSON.parse(exam.classIds || '[]').map((c) => c.classId ?? c); } catch { ids = []; }
    if (!ids.length && exam.classId) ids = [exam.classId];
    return ids.length ? classes.filter((c) => ids.map(Number).includes(c.id)) : classes;
  }, [exam, classes]);
  useEffect(() => {
    if (classId && !examClasses.some((c) => String(c.id) === classId)) setClassId('');
  }, [examClasses]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['papers', examId, classId],
    queryFn: () => api.get('/papers', { params: { examId: examId || undefined, classId: classId || undefined } }).then((r) => r.data.data || []),
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: () => api.get('/classes/subjects', { params: { classId } }).then((r) => r.data.data || []),
    enabled: !!classId,
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/papers/${id}`),
    onSuccess: () => { toast.success('Question paper deleted.'); qc.invalidateQueries({ queryKey: ['papers'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not delete.'),
  });

  const print = async (id, answerKey) => {
    try {
      const { data } = await api.get(`/papers/${id}`);
      printPaper(data.data, school || {}, { answerKey });
    } catch (e) { toast.error(e.response?.data?.message || 'Could not open the paper.'); }
  };

  const [copying, setCopying] = useState(null);

  const select = { padding: '8px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, minWidth: 0 };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['papers', 'Question papers'], ['setup', 'Paper setup (defaults)']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setView(v)}
            style={{ padding: '8px 14px', border: 'none', borderBottom: `3px solid ${view === v ? NAVY : 'transparent'}`, background: 'none', color: view === v ? NAVY : '#64748b', fontWeight: view === v ? 700 : 500, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {view === 'setup' && <PaperSetup classes={classes} />}

      {view === 'papers' && (
        <>
          <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 220px' }}>
              Exam
              <select aria-label="Exam" style={select} value={examId} onChange={(e) => setExamId(e.target.value)}>
                <option value="">All exams</option>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.title}{e.term ? ` (${e.term} term)` : ''}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 180px' }}>
              Class
              <select aria-label="Class" style={select} value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">All classes</option>
                {examClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-teal" onClick={() => setEditing({ preset: { examId, classId } })}>
              <Plus size={15} /> Make a question paper
            </button>
          </div>

          {/* Which subjects of this exam and class have a paper */}
          {examId && classId && (
            <div className="card" style={{ padding: 14, marginBottom: 14 }} aria-label="Subjects and their papers">
              <div style={{ fontWeight: 700, color: NAVY, marginBottom: 8, fontSize: 14 }}>
                {exam?.title} · {examClasses.find((c) => String(c.id) === classId)?.name}: papers by subject
              </div>
              {subjects.length === 0 ? (
                <div style={{ fontSize: 13, color: '#64748B' }}>This class has no subjects yet. Add them in Settings → Subjects, with each subject's maximum marks.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                  {subjects.map((s) => {
                    const p = papers.find((x) => x.subjectId === s.id);
                    return (
                      <div key={s.id} style={{ border: `1px solid ${p ? '#BBF7D0' : '#E2E8F0'}`, background: p ? '#F0FDF4' : '#fff', borderRadius: 10, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontSize: 11.5, color: '#64748B' }}>
                            {p ? `${p.questions} questions · ${p.totalMarks}/${s.totalMarks} marks · ${p.status === 'ready' ? 'ready' : 'draft'}` : `No paper yet · out of ${s.totalMarks}`}
                          </div>
                        </div>
                        {p
                          ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing({ id: p.id })} aria-label={`Open ${s.name} paper`}><Pencil size={13} /></button>
                          : <button type="button" className="btn btn-teal btn-sm" onClick={() => setEditing({ preset: { examId, classId, subjectId: String(s.id) } })} aria-label={`Make ${s.name} paper`}>Make</button>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead><tr><th>Paper</th><th>Exam</th><th>Class</th><th>Subject</th><th>Questions</th><th>Marks</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {isLoading && <tr><td colSpan={8} style={{ padding: 20, color: '#94A3B8' }}>Loading…</td></tr>}
                  {!isLoading && papers.length === 0 && (
                    <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-text">No question papers yet</div><div className="empty-state-sub">Choose the exam and class, then make a paper for each subject.</div></div></td></tr>
                  )}
                  {papers.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{p.title}</td>
                      <td style={{ fontSize: 12.5 }}>{p.examTitle || '—'}</td>
                      <td style={{ fontSize: 12.5 }}>{[p.className, p.sectionName].filter(Boolean).join(' — ') || '—'}</td>
                      <td style={{ fontSize: 12.5 }} dir="auto">{p.subjectName || '—'}</td>
                      <td>{p.questions}</td>
                      <td style={{ fontWeight: 700 }}>{p.totalMarks}</td>
                      <td><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: p.status === 'ready' ? '#DCFCE7' : '#F1F5F9', color: p.status === 'ready' ? '#166534' : '#475569' }}>{p.status === 'ready' ? 'Ready' : 'Draft'}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-outline btn-sm" title="Edit" aria-label={`Edit ${p.title}`} onClick={() => setEditing({ id: p.id })}><Pencil size={13} /></button>{' '}
                        <button type="button" className="btn btn-outline btn-sm" title="Print paper" aria-label={`Print ${p.title}`} onClick={() => print(p.id, false)}><Printer size={13} /></button>{' '}
                        <button type="button" className="btn btn-outline btn-sm" title="Print answer key" aria-label={`Answer key for ${p.title}`} onClick={() => print(p.id, true)}><KeyRound size={13} /></button>{' '}
                        <button type="button" className="btn btn-outline btn-sm" title="Copy to another class or exam" aria-label={`Copy ${p.title}`} onClick={() => setCopying(p)}><Copy size={13} /></button>{' '}
                        <button type="button" className="btn btn-outline btn-sm" style={{ color: '#B91C1C' }} title="Delete" aria-label={`Delete ${p.title}`}
                          onClick={() => { if (window.confirm(`Delete "${p.title}"?`)) del.mutate(p.id); }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editing && (
        <PaperEditor
          paperId={editing.id}
          preset={editing.preset}
          exams={exams}
          classes={classes}
          school={school}
          onClose={() => setEditing(null)}
          onSaved={(p) => { qc.invalidateQueries({ queryKey: ['papers'] }); setEditing({ id: p.id }); }}
        />
      )}
      {copying && <CopyDialog paper={copying} exams={exams} classes={classes} onClose={() => setCopying(null)} onDone={() => { setCopying(null); qc.invalidateQueries({ queryKey: ['papers'] }); }} />}
    </div>
  );
}

/* ═══ Copy a paper to another class / section / exam ═══════════════ */
function CopyDialog({ paper, exams, classes, onClose, onDone }) {
  const [examId, setExamId] = useState(paper.examId ? String(paper.examId) : '');
  const [classId, setClassId] = useState(paper.classId ? String(paper.classId) : '');
  const [sectionId, setSectionId] = useState('');
  const sections = classes.find((c) => String(c.id) === classId)?.sections || [];
  const copy = useMutation({
    mutationFn: () => api.post(`/papers/${paper.id}/copy`, { examId: examId || null, classId: classId || null, sectionId: sectionId || null }),
    onSuccess: (r) => { toast.success(r.data?.message || 'Copied.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not copy.'),
  });
  return (
    <Modal title={`Copy "${paper.title}"`} onClose={onClose} width={460}>
      <div style={{ display: 'grid', gap: 10, padding: 18 }}>
        <label className="form-label">Exam
          <select className="form-select" value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">No exam</option>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </label>
        <label className="form-label">Class
          <select className="form-select" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
            <option value="">No class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="form-label">Section
          <select className="form-select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div style={{ fontSize: 12, color: '#64748B' }}>The copy is a draft: open it to change what differs.</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-teal" disabled={copy.isPending} onClick={() => copy.mutate()}><Copy size={14} /> {copy.isPending ? 'Copying…' : 'Make the copy'}</button>
        </div>
      </div>
    </Modal>
  );
}

/* Rendered on the page body, so no parent box can clip it. */
function Modal({ title, onClose, children, width = 980 }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 12px', overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: width, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #E5E7EB' }}>
          <FileText size={18} color={NAVY} />
          <div style={{ fontWeight: 800, color: NAVY, fontSize: 15, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{title}</div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ═══ Paper defaults per class (instructions, part headings) ═══════ */
function PaperSetup({ classes }) {
  const [classId, setClassId] = useState('');
  const [form, setForm] = useState({ instructions: '', objectiveHeading: 'Section A — Objective', subjectiveHeading: 'Section B — Subjective' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!classId) return;
    api.get(`/question-papers/bank/${classId}/all`).then((r) => {
      const c = r.data.data?.paperCustomization || {};
      setForm({
        instructions: c.instructions || '',
        objectiveHeading: c.objectiveHeading && c.objectiveHeading !== 'OBJECTIVE PART' ? c.objectiveHeading : 'Section A — Objective',
        subjectiveHeading: c.subjectiveHeading && c.subjectiveHeading !== 'SUBJECTIVE PART' ? c.subjectiveHeading : 'Section B — Subjective',
      });
    }).catch(() => {});
  }, [classId]);
  const save = async () => {
    if (!classId) return toast.error('Choose a class first.');
    setSaving(true);
    try {
      await api.post('/question-papers/bank-customize', { classId, ...form });
      toast.success('Saved. New papers for this class start with these.');
    } catch { toast.error('Could not save.'); } finally { setSaving(false); }
  };
  return (
    <div className="card" style={{ padding: 18, display: 'grid', gap: 12, maxWidth: 720 }}>
      <div style={{ fontSize: 13, color: '#64748B' }}>What every new question paper for a class starts with. Each paper can still be changed.</div>
      <label className="form-label">Class
        <select className="form-select" aria-label="Setup class" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Choose a class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="form-label">Instructions printed on the paper
        <textarea className="form-input" rows={4} dir="auto" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          placeholder={'e.g. Attempt all questions. Write neatly. Use of mobile phones is not allowed.'} />
      </label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label className="form-label" style={{ flex: '1 1 240px' }}>First part heading
          <input className="form-input" dir="auto" value={form.objectiveHeading} onChange={(e) => setForm({ ...form, objectiveHeading: e.target.value })} />
        </label>
        <label className="form-label" style={{ flex: '1 1 240px' }}>Second part heading
          <input className="form-input" dir="auto" value={form.subjectiveHeading} onChange={(e) => setForm({ ...form, subjectiveHeading: e.target.value })} />
        </label>
      </div>
      <div><button type="button" className="btn btn-teal" disabled={saving} onClick={save}><Save size={14} /> {saving ? 'Saving…' : 'Save defaults'}</button></div>
    </div>
  );
}

/* ═══ The paper editor ═══════════════════════════════════════════════ */
function PaperEditor({ paperId, preset = {}, exams, classes, school, onClose, onSaved }) {
  const [paper, setPaper] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestFor, setSuggestFor] = useState(null); // section index

  // Load the paper, or start a new one from the class defaults.
  useEffect(() => {
    let off = false;
    (async () => {
      if (paperId) {
        const { data } = await api.get(`/papers/${paperId}`);
        if (!off) setPaper(data.data);
        return;
      }
      let custom = {};
      if (preset.classId) {
        custom = await api.get(`/question-papers/bank/${preset.classId}/all`).then((r) => r.data.data?.paperCustomization || {}).catch(() => ({}));
      }
      const head = (v, d) => (v && !/^(OBJECTIVE|SUBJECTIVE) PART$/.test(v) ? v : d);
      if (!off) {
        setPaper({
          examId: preset.examId ? Number(preset.examId) : null,
          classId: preset.classId ? Number(preset.classId) : null,
          sectionId: null,
          subjectId: preset.subjectId ? Number(preset.subjectId) : null,
          subjectName: '', title: '', durationMin: 120, status: 'draft',
          instructions: custom.instructions || '',
          sections: [
            { title: head(custom.objectiveHeading, 'Section A — Objective'), note: 'Choose the correct answer.', attempt: null, questions: [] },
            { title: head(custom.subjectiveHeading, 'Section B — Subjective'), note: '', attempt: null, questions: [] },
          ],
        });
      }
    })().catch((e) => toast.error(e.response?.data?.message || 'Could not open the paper.'));
    return () => { off = true; };
  }, [paperId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cls = classes.find((c) => c.id === paper?.classId);
  const { data: subjects = [] } = useQuery({
    queryKey: ['class-subjects', String(paper?.classId || '')],
    queryFn: () => api.get('/classes/subjects', { params: { classId: paper.classId } }).then((r) => r.data.data || []),
    enabled: !!paper?.classId,
  });
  const subject = subjects.find((s) => s.id === paper?.subjectId);

  if (!paper) {
    return <Modal title="Question paper" onClose={onClose}><div style={{ padding: 30, textAlign: 'center', color: '#64748B' }}>Opening…</div></Modal>;
  }

  const change = (patch) => { setPaper((p) => ({ ...p, ...patch })); setDirty(true); };
  const setSection = (si, patch) => change({ sections: paper.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const setQuestion = (si, qi, patch) => setSection(si, { questions: paper.sections[si].questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) });
  const moveQuestion = (si, qi, d) => {
    const qs = [...paper.sections[si].questions];
    const j = qi + d;
    if (j < 0 || j >= qs.length) return;
    [qs[qi], qs[j]] = [qs[j], qs[qi]];
    setSection(si, { questions: qs });
  };
  const total = paper.sections.reduce((a, s) => a + sectionMarks(s), 0);
  const questionCount = paper.sections.reduce((a, s) => a + s.questions.length, 0);
  const exam = exams.find((e) => e.id === paper.examId);
  let number = 0;

  const save = async (status) => {
    setSaving(true);
    try {
      const body = {
        examId: paper.examId, classId: paper.classId, sectionId: paper.sectionId, subjectId: paper.subjectId,
        subjectName: paper.subjectId ? undefined : paper.subjectName,
        title: paper.title, durationMin: paper.durationMin, instructions: paper.instructions,
        status: status || paper.status, sections: paper.sections,
      };
      const r = paper.id ? await api.put(`/papers/${paper.id}`, body) : await api.post('/papers', body);
      setPaper(r.data.data);
      setDirty(false);
      toast.success(status === 'ready' ? 'Saved and marked ready.' : 'Question paper saved.');
      onSaved?.(r.data.data);
      return r.data.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the paper.', { duration: 6000 });
      return null;
    } finally {
      setSaving(false);
    }
  };
  const printNow = async (answerKey) => {
    const saved = dirty || !paper.id ? await save() : paper;
    if (saved) printPaper(saved, school || {}, { answerKey });
  };
  const close = () => { if (!dirty || window.confirm('Close without saving the changes?')) onClose(); };

  const field = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };

  return (
    <Modal title={paper.title || (subject ? `${exam?.title || 'Question paper'} — ${subject.name}` : 'New question paper')} onClose={close}>
      {/* Details */}
      <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, borderBottom: '1px solid #F1F5F9' }}>
        <label style={field}>Exam
          <select className="form-select" aria-label="Paper exam" value={paper.examId || ''} onChange={(e) => change({ examId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">No exam</option>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </label>
        <label style={field}>Class
          <select className="form-select" aria-label="Paper class" value={paper.classId || ''} onChange={(e) => change({ classId: e.target.value ? Number(e.target.value) : null, sectionId: null, subjectId: null })}>
            <option value="">Choose class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={field}>Section
          <select className="form-select" aria-label="Paper section" value={paper.sectionId || ''} onChange={(e) => change({ sectionId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">All sections</option>
            {(cls?.sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label style={field}>Subject
          {subjects.length ? (
            <select className="form-select" aria-label="Paper subject" value={paper.subjectId || ''} onChange={(e) => change({ subjectId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Choose subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} (out of {s.totalMarks})</option>)}
            </select>
          ) : (
            <input className="form-input" aria-label="Paper subject" dir="auto" placeholder="Subject" value={paper.subjectName || ''} onChange={(e) => change({ subjectName: e.target.value })} />
          )}
        </label>
        <label style={field}>Time (minutes)
          <input className="form-input" type="number" min="1" max="600" aria-label="Time in minutes" value={paper.durationMin ?? ''} onChange={(e) => change({ durationMin: e.target.value === '' ? null : Number(e.target.value) })} />
        </label>
        <label style={{ ...field, gridColumn: '1 / -1' }}>Paper title (printed at the top; left empty it is made from the exam, subject and class)
          <input className="form-input" dir="auto" aria-label="Paper title" value={paper.title || ''} onChange={(e) => change({ title: e.target.value })} placeholder={[exam?.title, subject?.name || paper.subjectName, cls?.name].filter(Boolean).join(' — ')} />
        </label>
        <label style={{ ...field, gridColumn: '1 / -1' }}>Instructions
          <textarea className="form-input" rows={2} dir="auto" aria-label="Instructions" value={paper.instructions || ''} onChange={(e) => change({ instructions: e.target.value })} placeholder="e.g. Attempt all questions." />
        </label>
      </div>

      {/* Marks check */}
      <div style={{ padding: '8px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: '#F8FAFC', fontSize: 13 }} aria-label="Paper total">
        <strong style={{ color: NAVY }}>Total: {total} marks</strong>
        <span style={{ color: '#64748B' }}>{questionCount} questions</span>
        {subject && total !== subject.totalMarks && (
          <span style={{ color: '#B45309', fontWeight: 600 }}>{subject.name} is marked out of {subject.totalMarks}; this paper adds up to {total}.</span>
        )}
      </div>

      {/* Parts and questions */}
      <div style={{ padding: 18, display: 'grid', gap: 14 }}>
        {paper.sections.map((sec, si) => (
          <div key={si} style={{ border: '1px solid #E2E8F0', borderRadius: 12 }} aria-label={`Part ${si + 1}`}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '10px 12px', background: '#F1F5F9', borderRadius: '12px 12px 0 0' }}>
              <input className="form-input" dir="auto" aria-label={`Part ${si + 1} heading`} style={{ flex: '2 1 240px', fontWeight: 700 }} value={sec.title} onChange={(e) => setSection(si, { title: e.target.value })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                Attempt any
                <input className="form-input" type="number" min="1" aria-label={`Part ${si + 1} attempt any`} style={{ width: 70 }} value={sec.attempt ?? ''} placeholder="all"
                  onChange={(e) => setSection(si, { attempt: e.target.value === '' ? null : Number(e.target.value) })} />
                of {sec.questions.length}
              </label>
              <strong style={{ fontSize: 13, color: NAVY }}>{sectionMarks(sec)} marks</strong>
              <button type="button" className="btn btn-outline btn-sm" style={{ color: '#B91C1C' }} aria-label={`Remove part ${si + 1}`}
                onClick={() => { if (!sec.questions.length || window.confirm(`Remove "${sec.title}" and its ${sec.questions.length} questions?`)) change({ sections: paper.sections.filter((_, i) => i !== si) }); }}><Trash2 size={13} /></button>
            </div>
            <div style={{ padding: '8px 12px' }}>
              <input className="form-input" dir="auto" aria-label={`Part ${si + 1} note`} placeholder="Note for this part, e.g. Choose the correct answer." value={sec.note || ''} onChange={(e) => setSection(si, { note: e.target.value })} />
            </div>

            {sec.questions.map((q, qi) => {
              number += 1;
              return (
                <div key={qi} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'flex-start' }} aria-label={`Question ${number}`}>
                  <div style={{ fontWeight: 800, color: NAVY, width: 26, paddingTop: 8 }}>{number}.</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <select className="form-select" aria-label={`Question ${number} type`} style={{ width: 170 }} value={q.type}
                        onChange={(e) => setQuestion(si, qi, { ...newQuestion(e.target.value), text: q.text, marks: q.marks })}>
                        {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>Marks
                        <input className="form-input" type="number" min="0" max="100" aria-label={`Question ${number} marks`} style={{ width: 70 }} value={q.marks}
                          onChange={(e) => setQuestion(si, qi, { marks: e.target.value === '' ? '' : Number(e.target.value) })} />
                      </label>
                    </div>
                    <textarea className="form-input" dir="auto" rows={q.type === 'long' ? 3 : 2} aria-label={`Question ${number} text`} value={q.text}
                      placeholder={q.type === 'fill' ? 'e.g. The capital of Pakistan is ________.' : 'Write the question'} onChange={(e) => setQuestion(si, qi, { text: e.target.value })} />
                    {q.type === 'mcq' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 6 }}>
                        {q.options.map((o, oi) => (
                          <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input type="radio" name={`ans-${si}-${qi}`} aria-label={`Question ${number} option ${oi + 1} is correct`} checked={q.answer === oi} onChange={() => setQuestion(si, qi, { answer: oi })} />
                            <span style={{ fontSize: 12, fontWeight: 700, width: 16 }}>{'abcdef'[oi]})</span>
                            <input className="form-input" dir="auto" aria-label={`Question ${number} option ${oi + 1}`} value={o}
                              onChange={(e) => setQuestion(si, qi, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
                          </label>
                        ))}
                        <div style={{ fontSize: 11.5, color: q.answer === null ? '#B45309' : '#64748B' }}>{q.answer === null ? 'Tick the correct option for the answer key.' : `Correct: (${'abcdef'[q.answer]})`}</div>
                      </div>
                    )}
                    {q.type === 'truefalse' && (
                      <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
                        Answer:
                        {[true, false].map((v) => (
                          <label key={String(v)} style={{ display: 'flex', gap: 4 }}><input type="radio" name={`tf-${si}-${qi}`} checked={q.answer === v} onChange={() => setQuestion(si, qi, { answer: v })} /> {v ? 'True' : 'False'}</label>
                        ))}
                      </div>
                    )}
                    {['fill', 'short', 'long'].includes(q.type) && (
                      <input className="form-input" dir="auto" aria-label={`Question ${number} answer`} value={q.answer || ''} placeholder="Answer for the answer key (optional)"
                        onChange={(e) => setQuestion(si, qi, { answer: e.target.value })} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button type="button" className="btn btn-outline btn-sm" aria-label={`Move question ${number} up`} onClick={() => moveQuestion(si, qi, -1)} disabled={qi === 0}><ArrowUp size={12} /></button>
                    <button type="button" className="btn btn-outline btn-sm" aria-label={`Move question ${number} down`} onClick={() => moveQuestion(si, qi, 1)} disabled={qi === sec.questions.length - 1}><ArrowDown size={12} /></button>
                    <button type="button" className="btn btn-outline btn-sm" aria-label={`Copy question ${number}`} onClick={() => setSection(si, { questions: [...sec.questions.slice(0, qi + 1), { ...q, options: q.options ? [...q.options] : undefined }, ...sec.questions.slice(qi + 1)] })}><Copy size={12} /></button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ color: '#B91C1C' }} aria-label={`Delete question ${number}`} onClick={() => setSection(si, { questions: sec.questions.filter((_, i) => i !== qi) })}><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 12px', borderTop: '1px solid #F1F5F9' }}>
              {TYPES.map((t) => (
                <button key={t.v} type="button" className="btn btn-outline btn-sm" onClick={() => setSection(si, { questions: [...sec.questions, newQuestion(t.v)] })}>
                  <Plus size={12} /> {t.l}
                </button>
              ))}
              <button type="button" className="btn btn-sm" style={{ background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }} onClick={() => setSuggestFor(si)}>
                <Sparkles size={13} /> Suggest with AI
              </button>
            </div>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-outline" onClick={() => change({ sections: [...paper.sections, { title: `Section ${String.fromCharCode(65 + paper.sections.length)}`, note: '', attempt: null, questions: [] }] })}>
            <Plus size={14} /> Add a part
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #E5E7EB', padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderRadius: '0 0 14px 14px' }}>
        <span style={{ fontSize: 12.5, color: dirty ? '#B45309' : '#15803D', marginRight: 'auto' }}>{dirty ? 'Not saved yet' : paper.id ? (paper.status === 'ready' ? 'Saved · ready' : 'Saved · draft') : ''}</span>
        <button type="button" className="btn btn-outline" onClick={() => printNow(true)} disabled={saving}><KeyRound size={14} /> Answer key</button>
        <button type="button" className="btn btn-outline" onClick={() => printNow(false)} disabled={saving}><Printer size={14} /> Print paper</button>
        <button type="button" className="btn btn-outline" onClick={() => save('draft')} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save draft'}</button>
        <button type="button" className="btn btn-teal" onClick={() => save('ready')} disabled={saving}>Save · ready to print</button>
      </div>

      {suggestFor !== null && (
        <SuggestDialog
          subject={subject?.name || paper.subjectName}
          className={cls?.name}
          onClose={() => setSuggestFor(null)}
          onAdd={(qs) => { setSection(suggestFor, { questions: [...paper.sections[suggestFor].questions, ...qs] }); setSuggestFor(null); toast.success(`${qs.length} question(s) added. Read them through before printing.`); }}
        />
      )}
    </Modal>
  );
}

/* ═══ AI-suggested questions to review and add ═══════════════════════ */
function SuggestDialog({ subject, className, onClose, onAdd }) {
  const [form, setForm] = useState({ topic: '', type: 'mcq', count: 5, marks: 1, language: 'en' });
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState(null);
  const [picked, setPicked] = useState({});
  const ask = async () => {
    if (!form.topic.trim()) return toast.error('Write the chapter or topic.');
    setBusy(true);
    try {
      const r = await api.post('/papers/suggest', { subject, className, ...form }, { timeout: 120000 });
      setFound(r.data.data);
      setPicked(Object.fromEntries(r.data.data.map((_, i) => [i, true])));
    } catch (e) { toast.error(e.response?.data?.message || 'No suggestions.', { duration: 7000 }); } finally { setBusy(false); }
  };
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 12px', overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" aria-label="Suggest questions" style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 640, padding: 18, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#4F46E5" /><strong style={{ flex: 1 }}>Suggest questions{subject ? ` — ${subject}` : ''}{className ? `, ${className}` : ''}</strong>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <input className="form-input" dir="auto" aria-label="Topic" placeholder="Chapter or topic, e.g. Photosynthesis" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="form-select" aria-label="Suggestion type" style={{ flex: '1 1 160px' }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, marks: TYPES.find((t) => t.v === e.target.value)?.marks ?? 1 })}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>How many <input className="form-input" type="number" min="1" max="20" style={{ width: 70 }} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>Marks each <input className="form-input" type="number" min="0" max="100" style={{ width: 70 }} value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} /></label>
          <select className="form-select" aria-label="Language" style={{ width: 120 }} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            <option value="en">English</option><option value="ur">Urdu</option>
          </select>
        </div>
        <div><button type="button" className="btn btn-teal" onClick={ask} disabled={busy}><Sparkles size={14} /> {busy ? 'Thinking… (up to a minute)' : 'Suggest'}</button></div>
        {found && (
          <>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>Check every question and answer before adding: AI can make mistakes.</div>
            <div style={{ maxHeight: 340, overflowY: 'auto', display: 'grid', gap: 6 }}>
              {found.map((q, i) => (
                <label key={i} style={{ display: 'flex', gap: 8, border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={!!picked[i]} onChange={(e) => setPicked({ ...picked, [i]: e.target.checked })} />
                  <span dir="auto" style={{ flex: 1 }}>
                    {q.text}
                    {q.options && <span style={{ display: 'block', color: '#475569', fontSize: 12 }}>{q.options.map((o, k) => `(${'abcdef'[k]}) ${o}${q.answer === k ? ' ✓' : ''}`).join('   ')}</span>}
                    {q.type === 'truefalse' && q.answer !== null && <span style={{ display: 'block', color: '#475569', fontSize: 12 }}>Answer: {q.answer ? 'True' : 'False'}</span>}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#64748B' }}>{typeLabel(q.type)} · {q.marks}</span>
                </label>
              ))}
            </div>
            <div><button type="button" className="btn btn-teal" onClick={() => onAdd(found.filter((_, i) => picked[i]))} disabled={!Object.values(picked).some(Boolean)}>Add the ticked questions</button></div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
