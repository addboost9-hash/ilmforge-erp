/**
 * Question papers in the Exam Vault.
 *
 * Choose the term and exam: every class of the exam is shown with its
 * subjects and where each paper stands (none, draft with questions still
 * to write, ready). A paper is made in a few steps:
 *
 *   1. start from a pattern that adds up to the subject's marks (board
 *      style, junior classes, short and long), which lays out the parts
 *      with empty questions to write in;
 *   2. write the questions: type them, paste a list from Word or WhatsApp,
 *      take questions from earlier papers of the subject, or have AI suggest
 *      some for a chapter of this exam's syllabus;
 *   3. see it as printed (Preview), save as a draft or as ready, and print
 *      it (lines to answer on, larger text) with its answer key; or print
 *      all of a class's papers at once.
 *
 * Papers are saved on the server (/papers), which checks every question.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { printPaper, printPapers, buildPaperHTML } from './paperPrint';
import { useExamPick, ExamPickerBar, classesOfExam } from './ExamPicker';
import { TYPES, typeLabel, newQuestion, sectionMarks, PATTERNS, patternRows, patternTotal, rowMarks, layOut, parseQuestions } from './paperTools';
import { Plus, Printer, Copy, Trash2, Pencil, X, ArrowUp, ArrowDown, Sparkles, Save, KeyRound, FileText, ClipboardPaste, Library, Eye, LayoutTemplate, BookOpen, CheckCircle2 } from 'lucide-react';

const NAVY = '#1B2F6E';
const PRINT_OPTS_KEY = 'ilm-paper-print-options';
const readPrintOpts = () => { try { return { answerLines: false, large: false, ...JSON.parse(localStorage.getItem(PRINT_OPTS_KEY) || '{}') }; } catch { return { answerLines: false, large: false }; } };
const isBlank = (q) => !String(q.text || '').trim() || (q.type === 'mcq' && (q.options || []).some((o) => !String(o || '').trim()));

/* The school's name and logo for the printed paper: what the sign-in gave,
   and the settings page for the admin (teachers may not read settings). */
function useSchoolInfo() {
  const signedIn = useAuthStore((s) => s.school) || {};
  const role = useAuthStore((s) => s.user?.role);
  const { data } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/settings/school').then((r) => r.data.data).catch(() => ({})),
    enabled: ['admin', 'super_admin'].includes(role),
  });
  return { ...signedIn, ...(data || {}) };
}

/* ═══ The tab ═══════════════════════════════════════════════════════ */
export default function QuestionPapersTab({ initialExamId = '' }) {
  const qc = useQueryClient();
  const pick = useExamPick(initialExamId);
  const { exam, examId } = pick;
  const [editing, setEditing] = useState(null); // { id } | { preset }
  const [view, setView] = useState('papers'); // papers | setup
  const [copying, setCopying] = useState(null);
  const [printing, setPrinting] = useState(null); // { papers, title }
  const [loose, setLoose] = useState(false); // papers with no exam

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects-all'], queryFn: () => api.get('/classes/subjects').then((r) => r.data.data || []).catch(() => []) });
  const { data: allPapers = [], isLoading } = useQuery({ queryKey: ['papers'], queryFn: () => api.get('/papers').then((r) => r.data.data || []) });
  const exams = pick.allExams;
  const school = useSchoolInfo();
  const examClasses = useMemo(() => classesOfExam(exam, classes), [exam, classes]);
  const papers = loose ? allPapers.filter((p) => !p.examId) : allPapers.filter((p) => String(p.examId) === examId);
  const looseCount = allPapers.filter((p) => !p.examId).length;

  const del = useMutation({
    mutationFn: (id) => api.delete(`/papers/${id}`),
    onSuccess: () => { toast.success('Question paper deleted.'); qc.invalidateQueries({ queryKey: ['papers'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not delete.'),
  });

  const fetchPapers = async (list) => Promise.all(list.map((p) => api.get(`/papers/${p.id}`).then((r) => r.data.data)));
  const printList = async (list, answerKey, title) => {
    if (!list.length) return toast.error('There is no paper to print.');
    try {
      const full = await fetchPapers(list);
      if (answerKey) printPapers(full, school, { answerKey: true });
      else setPrinting({ papers: full, title });
    } catch (e) { toast.error(e.response?.data?.message || 'Could not open the papers.'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
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
          <ExamPickerBar pick={pick}>
            <button type="button" className="btn btn-teal" disabled={!exam} onClick={() => setEditing({ preset: { examId } })}><Plus size={15} /> Make a question paper</button>
          </ExamPickerBar>

          {/* Every class of the exam, its subjects and where each paper stands */}
          {exam && !loose && (
            <div className="card" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }} aria-label="Papers by class">
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #EEF2F7', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5, color: '#64748B' }}>
                <strong style={{ color: NAVY, fontSize: 14 }}>{exam.title}: papers by class</strong>
                <span><Dot c="#CBD5E1" /> no paper</span><span><Dot c="#F59E0B" /> draft</span><span><Dot c="#16A34A" /> ready</span>
                <span>Click a subject to make or open its paper.</span>
              </div>
              {examClasses.map((c) => {
                const subs = subjects.filter((s) => s.classId === c.id).sort((a, b) => a.name.localeCompare(b.name));
                const mine = papers.filter((p) => p.classId === c.id);
                const ready = mine.filter((p) => p.status === 'ready');
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ width: 130, flex: 'none' }}>
                      <div style={{ fontWeight: 800, color: NAVY }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{ready.length} of {subs.length || '—'} ready</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                      {!subs.length && <span style={{ fontSize: 12.5, color: '#B45309' }}>No subjects yet — add them in Settings → Subjects.</span>}
                      {subs.map((s) => {
                        const p = mine.find((x) => x.subjectId === s.id);
                        const tone = !p ? { bd: '#E2E8F0', bg: '#fff', fg: '#475569' } : p.status === 'ready' ? { bd: '#86EFAC', bg: '#F0FDF4', fg: '#166534' } : { bd: '#FCD34D', bg: '#FFFBEB', fg: '#92400E' };
                        return (
                          <button key={s.id} type="button" data-paper-state={!p ? 'none' : p.status}
                            onClick={() => setEditing(p ? { id: p.id } : { preset: { examId, classId: String(c.id), subjectId: String(s.id) } })}
                            title={p ? `${p.questions} questions · ${p.totalMarks}/${s.totalMarks} marks${p.blanks ? ` · ${p.blanks} still to write` : ''}` : `Make the ${s.name} paper (out of ${s.totalMarks})`}
                            style={{ border: `1px solid ${tone.bd}`, background: tone.bg, color: tone.fg, borderRadius: 99, padding: '4px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {p?.status === 'ready' ? <CheckCircle2 size={13} /> : p ? <Pencil size={12} /> : <Plus size={12} />}
                            <span dir="auto">{s.name}</span>
                            {p && p.status !== 'ready' && p.blanks > 0 && <span style={{ fontSize: 11, opacity: 0.85 }}>· {p.blanks} to write</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-outline btn-sm" disabled={!mine.length} onClick={() => printList(ready.length ? ready : mine, false, `${exam.title} — ${c.name}`)} title={ready.length ? 'Every ready paper of this class' : 'Every paper of this class'}><Printer size={13} /> Print all</button>
                      <button type="button" className="btn btn-outline btn-sm" disabled={!mine.length} onClick={() => printList(ready.length ? ready : mine, true)} title="Answer keys of these papers"><KeyRound size={13} /> Keys</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #EEF2F7' }}>
              <strong style={{ color: NAVY }}>{loose ? 'Papers not linked to an exam' : `All papers of ${exam?.title || 'this exam'}`}</strong>
              {(looseCount > 0 || loose) && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setLoose((x) => !x)}>{loose ? '← Back to the exam' : `Papers not linked to an exam (${looseCount})`}</button>
              )}
            </div>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead><tr><th>Paper</th><th>Class</th><th>Subject</th><th>Questions</th><th>Marks</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {isLoading && <tr><td colSpan={7} style={{ padding: 20, color: '#94A3B8' }}>Loading…</td></tr>}
                  {!isLoading && papers.length === 0 && (
                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-text">No question papers yet</div><div className="empty-state-sub">Click a subject above to make its paper.</div></div></td></tr>
                  )}
                  {papers.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{p.title}</td>
                      <td style={{ fontSize: 12.5 }}>{[p.className, p.sectionName].filter(Boolean).join(' — ') || '—'}</td>
                      <td style={{ fontSize: 12.5 }} dir="auto">{p.subjectName || '—'}</td>
                      <td>{p.questions}{p.blanks > 0 && <span style={{ color: '#B45309', fontSize: 11.5 }}> ({p.blanks} to write)</span>}</td>
                      <td style={{ fontWeight: 700 }}>{p.totalMarks}</td>
                      <td><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: p.status === 'ready' ? '#DCFCE7' : '#FEF3C7', color: p.status === 'ready' ? '#166534' : '#92400E' }}>{p.status === 'ready' ? 'Ready' : 'Draft'}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-outline btn-sm" title="Edit" aria-label={`Edit ${p.title}`} onClick={() => setEditing({ id: p.id })}><Pencil size={13} /></button>{' '}
                        <button type="button" className="btn btn-outline btn-sm" title="Print paper" aria-label={`Print ${p.title}`} onClick={() => printList([p], false, p.title)}><Printer size={13} /></button>{' '}
                        <button type="button" className="btn btn-outline btn-sm" title="Print answer key" aria-label={`Answer key for ${p.title}`} onClick={() => printList([p], true)}><KeyRound size={13} /></button>{' '}
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
      {printing && <PrintDialog title={printing.title} count={printing.papers.length} onClose={() => setPrinting(null)} onPrint={(opts) => { printPapers(printing.papers, school, opts); setPrinting(null); }} />}
    </div>
  );
}

const Dot = ({ c }) => <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 99, background: c, verticalAlign: 'middle', marginRight: 2 }} />;

/* ═══ Print options: lines to answer on, larger text (remembered) ═══ */
function PrintDialog({ title, count = 1, onClose, onPrint }) {
  const [opts, setOpts] = useState(readPrintOpts);
  const go = () => { try { localStorage.setItem(PRINT_OPTS_KEY, JSON.stringify(opts)); } catch { /* private window */ } onPrint(opts); };
  return (
    <Modal title={count > 1 ? `Print ${count} papers — ${title}` : `Print — ${title}`} onClose={onClose} width={480}>
      <div style={{ padding: 18, display: 'grid', gap: 12 }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5 }}>
          <input type="checkbox" checked={opts.answerLines} onChange={(e) => setOpts({ ...opts, answerLines: e.target.checked })} style={{ marginTop: 3 }} />
          <span><b>Lines to write the answers on</b><br /><span style={{ color: '#64748B' }}>Under short and long questions, for classes that answer on the question paper.</span></span>
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5 }}>
          <input type="checkbox" checked={opts.large} onChange={(e) => setOpts({ ...opts, large: e.target.checked })} style={{ marginTop: 3 }} />
          <span><b>Larger text</b><br /><span style={{ color: '#64748B' }}>Easier to read for junior classes.</span></span>
        </label>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>{count > 1 ? 'Each paper starts on a new page. ' : ''}To keep a copy, choose “Save as PDF” as the printer.</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-teal" onClick={go}><Printer size={14} /> Print / Save as PDF</button>
        </div>
      </div>
    </Modal>
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
function Modal({ title, onClose, children, width = 1100, z = 1200, icon = true }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: z, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 12px', overflowY: 'auto' }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: width, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #E5E7EB' }}>
          {icon && <FileText size={18} color={NAVY} />}
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

/* ═══ Start from a pattern ═══════════════════════════════════════════ */
function PatternPanel({ total, onUse, onSkip }) {
  const [kind, setKind] = useState('board');
  const [rows, setRows] = useState(() => patternRows('board', total || 100));
  useEffect(() => { setRows(patternRows(kind, total || 100)); }, [kind, total]);
  const sum = patternTotal(rows);
  const setRow = (i, patch) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const num = (v, max) => Math.max(0, Math.min(max, parseInt(v, 10) || 0));
  return (
    <div aria-label="Paper pattern" style={{ border: '1.5px dashed #A5B4FC', background: '#F8FAFF', borderRadius: 12, padding: 14, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LayoutTemplate size={17} color={NAVY} />
        <strong style={{ color: NAVY }}>Start from a pattern</strong>
        <span style={{ fontSize: 12.5, color: '#64748B' }}>The parts are laid out with empty questions to write in{total ? `, adding up to ${total} marks` : ''}.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
        {PATTERNS.map((p) => (
          <button key={p.id} type="button" aria-pressed={kind === p.id} onClick={() => setKind(p.id)}
            style={{ textAlign: 'left', borderRadius: 10, padding: '9px 11px', cursor: 'pointer', border: `1.5px solid ${kind === p.id ? NAVY : '#E2E8F0'}`, background: kind === p.id ? '#EEF2FF' : '#fff' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{p.label}</div>
            <div style={{ fontSize: 11.5, color: '#64748B' }}>{p.hint}</div>
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
          <thead><tr style={{ color: '#475569', textAlign: 'left' }}><th style={pth}>Part</th><th style={pth}>Questions</th><th style={pth}>Attempt any</th><th style={pth}>Marks each</th><th style={{ ...pth, textAlign: 'right' }}>Part marks</th><th style={pth} /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #E2E8F0' }}>
                <td style={ptd}><b>{r.title}</b><div style={{ fontSize: 11.5, color: '#64748B' }}>{typeLabel(r.type)}</div></td>
                <td style={ptd}><input className="form-input" type="number" min="0" max="100" aria-label={`${r.title}: questions`} style={{ width: 74 }} value={r.count} onChange={(e) => setRow(i, { count: num(e.target.value, 100) })} /></td>
                <td style={ptd}><input className="form-input" type="number" min="0" max="100" aria-label={`${r.title}: attempt any`} style={{ width: 74 }} value={r.attempt ?? ''} placeholder="all" onChange={(e) => setRow(i, { attempt: e.target.value === '' ? null : num(e.target.value, 100) || null })} /></td>
                <td style={ptd}><input className="form-input" type="number" min="0" max="100" aria-label={`${r.title}: marks each`} style={{ width: 74 }} value={r.marks} onChange={(e) => setRow(i, { marks: num(e.target.value, 100) })} /></td>
                <td style={{ ...ptd, textAlign: 'right', fontWeight: 800 }}>{rowMarks(r)}</td>
                <td style={ptd}><button type="button" aria-label={`Remove ${r.title}`} onClick={() => setRows((x) => x.filter((_, k) => k !== i))} style={{ background: 'none', border: 0, color: '#B91C1C', cursor: 'pointer' }}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="form-select" aria-label="Add a part" style={{ width: 'auto' }} value="" onChange={(e) => { if (e.target.value) setRows((r) => [...r, patternRows('board', 100).find((x) => x.type === e.target.value) || { type: e.target.value, title: typeLabel(e.target.value), note: '', count: 5, marks: TYPES.find((t) => t.v === e.target.value).marks, attempt: null }]); }}>
          <option value="">+ Add a part…</option>
          {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <span style={{ fontWeight: 800, color: total && sum !== total ? '#B45309' : '#166534' }}>
          Total {sum}{total ? ` of ${total}` : ''} marks{total && sum !== total ? ' — change a count or marks to match' : ' ✓'}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-outline btn-sm" onClick={onSkip}>Start empty instead</button>
        <button type="button" className="btn btn-teal" disabled={!rows.some((r) => r.count > 0)} onClick={() => onUse(layOut(rows))}><LayoutTemplate size={14} /> Lay out the paper</button>
      </div>
    </div>
  );
}
const pth = { padding: '6px 8px', fontSize: 12, fontWeight: 700 };
const ptd = { padding: '6px 8px', verticalAlign: 'middle' };

/* ═══ The paper editor ═══════════════════════════════════════════════ */
function PaperEditor({ paperId, preset = {}, exams, classes, school, onClose, onSaved }) {
  const [paper, setPaper] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState(null); // { kind: 'suggest'|'paste'|'bank', si, topic }
  const [preview, setPreview] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [patternDone, setPatternDone] = useState(!!paperId);

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
  // This exam's syllabus of the subject: the chapters the paper is set from.
  const { data: syllabus } = useQuery({
    queryKey: ['paper-syllabus', paper?.examId, paper?.classId, paper?.subjectId],
    queryFn: () => api.get('/syllabus', { params: { examId: paper.examId, classId: paper.classId, subjectId: paper.subjectId } })
      .then((r) => (r.data.data || []).find((d) => String(d.examId) === String(paper.examId)) || null).catch(() => null),
    enabled: !!(paper?.examId && paper?.classId && paper?.subjectId),
  });

  const save = useCallback(async (status) => {
    if (!paper) return null;
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
  }, [paper, onSaved]);

  // Ctrl+S saves the draft.
  useEffect(() => {
    const key = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (paper && !saving) save(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [paper, saving, save]);

  if (!paper) {
    return <Modal title="Question paper" onClose={onClose}><div style={{ padding: 30, textAlign: 'center', color: '#64748B' }}>Opening…</div></Modal>;
  }

  const change = (patch) => { setPaper((p) => ({ ...p, ...patch })); setDirty(true); };
  const setSection = (si, patch) => change({ sections: paper.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const setQuestion = (si, qi, patch) => setSection(si, { questions: paper.sections[si].questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) });
  const addQuestions = (si, qs) => setSection(si, { questions: [...paper.sections[si].questions, ...qs] });
  const moveQuestion = (si, qi, d) => {
    const qs = [...paper.sections[si].questions];
    const j = qi + d;
    if (j < 0 || j >= qs.length) return;
    [qs[qi], qs[j]] = [qs[j], qs[qi]];
    setSection(si, { questions: qs });
  };
  const total = paper.sections.reduce((a, s) => a + sectionMarks(s), 0);
  const questionCount = paper.sections.reduce((a, s) => a + s.questions.length, 0);
  const blanks = paper.sections.reduce((a, s) => a + s.questions.filter(isBlank).length, 0);
  const exam = exams.find((e) => e.id === paper.examId);
  const chapters = (syllabus?.units || []).filter((u) => u.title || u.content);
  const showPattern = !patternDone && questionCount === 0;
  let number = 0;

  // The paper as it prints, with the names and totals worked out here.
  const asPrinted = () => ({
    ...paper,
    title: paper.title || [exam?.title, subject?.name || paper.subjectName, cls?.name].filter(Boolean).join(' — ') || 'Question paper',
    examTitle: exam?.title || paper.examTitle, className: cls?.name || paper.className,
    sectionName: cls?.sections?.find((s) => s.id === paper.sectionId)?.name || paper.sectionName,
    subjectName: subject?.name || paper.subjectName, totalMarks: total,
    sections: paper.sections.map((s) => ({ ...s, marks: sectionMarks(s) })),
  });
  const printNow = async (answerKey, opts = {}) => {
    const saved = dirty || !paper.id ? await save() : paper;
    if (saved) printPaper(saved, school || {}, { ...opts, answerKey });
  };
  const close = () => { if (!dirty || window.confirm('Close without saving the changes?')) onClose(); };
  const field = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };

  return (
    <Modal title={paper.title || (subject ? `${exam?.title || 'Question paper'} — ${subject.name}${cls ? ` — ${cls.name}` : ''}` : 'New question paper')} onClose={close}>
      {/* Details */}
      <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, borderBottom: '1px solid #F1F5F9' }}>
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

      {/* The syllabus this paper is set from */}
      {paper.examId && paper.subjectId && (
        <div aria-label="Syllabus of this exam" style={{ padding: '9px 18px', borderBottom: '1px solid #F1F5F9', background: '#FBFDFF', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
          <BookOpen size={14} color={NAVY} /><b style={{ color: NAVY }}>Syllabus:</b>
          {chapters.length ? chapters.map((u, i) => (
            <button key={i} type="button" title={u.content ? `${u.title} — ${u.content}. Click for AI questions on it.` : 'Click for AI questions on this chapter.'}
              onClick={() => setTool({ kind: 'suggest', si: Math.max(0, paper.sections.length - 1), topic: [u.title, u.content].filter(Boolean).join(': ') })}
              style={{ border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3', borderRadius: 99, padding: '2px 9px', fontSize: 12, cursor: 'pointer' }} dir="auto">
              {u.title || u.content}
            </button>
          )) : <span style={{ color: '#94A3B8' }}>Not written for this subject yet — <a href={`/examination?tab=syllabus&exam=${paper.examId}`} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 600 }}>write it in the Syllabus step</a>.</span>}
        </div>
      )}

      {/* Marks check */}
      <div style={{ padding: '8px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: '#F8FAFC', fontSize: 13 }} aria-label="Paper total">
        <strong style={{ color: NAVY }}>Total: {total} marks</strong>
        <span style={{ color: '#64748B' }}>{questionCount} questions</span>
        {blanks > 0 && <span style={{ color: '#B45309', fontWeight: 600 }}>{blanks} still to write</span>}
        {subject && total !== subject.totalMarks && questionCount > 0 && (
          <span style={{ color: '#B45309', fontWeight: 600 }}>{subject.name} is marked out of {subject.totalMarks}; this paper adds up to {total}.</span>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className={preview ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'} aria-pressed={preview} onClick={() => setPreview((v) => !v)}>
          {preview ? <><Pencil size={13} /> Back to writing</> : <><Eye size={13} /> Preview as printed</>}
        </button>
      </div>

      {preview ? (
        <div style={{ padding: 18, background: '#E5E7EB' }}>
          <iframe title="Paper preview" srcDoc={buildPaperHTML(asPrinted(), school || {}, readPrintOpts())} style={{ width: '100%', maxWidth: 820, height: '70vh', border: 0, background: '#fff', display: 'block', margin: '0 auto', boxShadow: '0 2px 10px rgba(0,0,0,.15)' }} />
        </div>
      ) : (
        <div style={{ padding: 18, display: 'grid', gap: 14 }}>
          {showPattern && (
            <PatternPanel total={subject?.totalMarks}
              onSkip={() => setPatternDone(true)}
              onUse={(sections) => { change({ sections }); setPatternDone(true); toast.success('The paper is laid out. Now write each question.'); }} />
          )}

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
                const blank = isBlank(q);
                return (
                  <div key={qi} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'flex-start', background: blank ? '#FFFBEB' : '#fff' }} aria-label={`Question ${number}`} data-blank={blank ? 'yes' : undefined}>
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
                        placeholder={q.type === 'fill' ? 'e.g. The capital of Pakistan is ________.' : q.type === 'truefalse' ? 'e.g. The sun rises in the west.' : 'Write the question'} onChange={(e) => setQuestion(si, qi, { text: e.target.value })} />
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

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Add:</span>
                {TYPES.map((t) => (
                  <button key={t.v} type="button" className="btn btn-outline btn-sm" onClick={() => addQuestions(si, [newQuestion(t.v)])}>
                    <Plus size={12} /> {t.l}
                  </button>
                ))}
                <span style={{ width: 1, alignSelf: 'stretch', background: '#E2E8F0', margin: '0 2px' }} />
                <button type="button" className="btn btn-sm" style={toolBtn} onClick={() => setTool({ kind: 'paste', si })}><ClipboardPaste size={13} /> Paste questions</button>
                <button type="button" className="btn btn-sm" style={toolBtn} onClick={() => setTool({ kind: 'bank', si })} disabled={!paper.subjectId && !paper.subjectName}><Library size={13} /> From earlier papers</button>
                <button type="button" className="btn btn-sm" style={{ ...toolBtn, background: '#EEF2FF', color: '#3730A3', borderColor: '#C7D2FE' }} onClick={() => setTool({ kind: 'suggest', si })}>
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
      )}

      {/* Actions */}
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #E5E7EB', padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderRadius: '0 0 14px 14px' }}>
        <span style={{ fontSize: 12.5, color: dirty ? '#B45309' : '#15803D', marginRight: 'auto' }}>
          {dirty ? 'Not saved yet (Ctrl+S saves)' : paper.id ? (paper.status === 'ready' ? 'Saved · ready' : 'Saved · draft') : ''}
        </span>
        <button type="button" className="btn btn-outline" onClick={() => printNow(true)} disabled={saving}><KeyRound size={14} /> Answer key</button>
        <button type="button" className="btn btn-outline" onClick={() => setPrintOpen(true)} disabled={saving}><Printer size={14} /> Print paper</button>
        <button type="button" className="btn btn-outline" onClick={() => save('draft')} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save draft'}</button>
        <button type="button" className="btn btn-teal" onClick={() => (blanks ? toast.error(`${blanks} question${blanks === 1 ? ' is' : 's are'} not written yet (shaded yellow). Write ${blanks === 1 ? 'it' : 'them'} or delete ${blanks === 1 ? 'it' : 'them'} first.`, { duration: 6000 }) : save('ready'))} disabled={saving}>Save · ready to print</button>
      </div>

      {tool?.kind === 'suggest' && (
        <SuggestDialog
          subject={subject?.name || paper.subjectName}
          className={cls?.name}
          topic={tool.topic}
          chapters={chapters}
          onClose={() => setTool(null)}
          onAdd={(qs) => { addQuestions(tool.si, qs); setTool(null); toast.success(`${qs.length} question(s) added. Read them through before printing.`); }}
        />
      )}
      {tool?.kind === 'paste' && (
        <PasteQuestions onClose={() => setTool(null)}
          onAdd={(qs) => { addQuestions(tool.si, qs); setTool(null); toast.success(`${qs.length} question(s) added.`); }} />
      )}
      {tool?.kind === 'bank' && (
        <QuestionBank subjectId={paper.subjectId} subjectName={subject?.name || paper.subjectName} exclude={paper.id}
          have={new Set(paper.sections.flatMap((s) => s.questions.map((q) => String(q.text || '').trim().toLowerCase())))}
          onClose={() => setTool(null)}
          onAdd={(qs) => { addQuestions(tool.si, qs); setTool(null); toast.success(`${qs.length} question(s) added from earlier papers.`); }} />
      )}
      {printOpen && <PrintDialog title={asPrinted().title} onClose={() => setPrintOpen(false)} onPrint={(opts) => { setPrintOpen(false); printNow(false, opts); }} />}
    </Modal>
  );
}
const toolBtn = { background: '#fff', border: '1px solid #CBD5E1', color: '#334155' };

/* ═══ Paste questions typed elsewhere ═══════════════════════════════ */
function PasteQuestions({ onClose, onAdd }) {
  const [text, setText] = useState('');
  const [fallback, setFallback] = useState({ type: 'short', marks: 2 });
  const found = parseQuestions(text, fallback);
  return (
    <Modal title="Paste questions" onClose={onClose} width={760} z={1300} icon={false}>
      <div style={{ padding: 18, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
          Paste or type the questions, numbered (<code>1.</code> <code>2.</code> …). Options on their own lines (<code>a)</code> <code>b)</code> …) make a multiple-choice question; put <code>*</code> after the right option.
          A blank <code>______</code> makes a fill in the blank, and <code>(True/False)</code> at the end a true or false question.
        </div>
        <textarea className="form-input" autoFocus dir="auto" rows={9} aria-label="Questions to paste" value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'inherit' }}
          placeholder={'1. What is the capital of Pakistan?\na) Lahore\nb) Islamabad *\nc) Karachi\nd) Quetta\n2. The sun rises in the ______.\n3. Water boils at 100 °C. (True/False)\n4. Describe the water cycle.'} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
          Other questions are
          <select className="form-select" aria-label="Other questions are" style={{ width: 170 }} value={fallback.type} onChange={(e) => setFallback({ type: e.target.value, marks: TYPES.find((t) => t.v === e.target.value).marks })}>
            {TYPES.filter((t) => ['short', 'long'].includes(t.v)).map((t) => <option key={t.v} value={t.v}>{t.l}s</option>)}
          </select>
          of
          <input className="form-input" type="number" min="0" max="100" aria-label="Marks each" style={{ width: 70 }} value={fallback.marks} onChange={(e) => setFallback({ ...fallback, marks: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) })} />
          marks each
        </div>
        {found.length > 0 && (
          <div aria-label="Questions found" style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            {found.map((q, i) => (
              <div key={i} style={{ padding: '6px 10px', borderTop: i ? '1px solid #F1F5F9' : 0, fontSize: 12.5, display: 'flex', gap: 8 }}>
                <b style={{ width: 22 }}>{i + 1}.</b>
                <span style={{ flex: 1 }} dir="auto">{q.text}{q.options && <span style={{ display: 'block', color: '#64748B' }}>{q.options.map((o, k) => `(${'abcdef'[k]}) ${o}${q.answer === k ? ' ✓' : ''}`).join('   ')}</span>}</span>
                <span style={{ color: '#64748B', whiteSpace: 'nowrap' }}>{typeLabel(q.type)} · {q.marks}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-teal" disabled={!found.length} onClick={() => onAdd(found)}>Add {found.length || ''} question{found.length === 1 ? '' : 's'}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══ Questions from earlier papers of the subject ═══════════════════ */
function QuestionBank({ subjectId, subjectName, exclude, have, onClose, onAdd }) {
  const { data: papers = [], isLoading, isError } = useQuery({
    queryKey: ['paper-bank', subjectId, subjectName, exclude],
    queryFn: () => api.get('/papers/bank', { params: { subjectId: subjectId || undefined, subjectName: subjectId ? undefined : subjectName, exclude: exclude || undefined } }).then((r) => r.data.data || []),
  });
  const [type, setType] = useState('');
  const [find, setFind] = useState('');
  const [picked, setPicked] = useState({});
  const needle = find.trim().toLowerCase();
  const list = papers.map((p) => ({
    ...p,
    qs: p.sections.flatMap((s, si) => s.questions.map((q, qi) => ({ ...q, key: `${p.id}-${si}-${qi}` })))
      .filter((q) => q.text && (!type || q.type === type) && (!needle || q.text.toLowerCase().includes(needle))),
  })).filter((p) => p.qs.length);
  const all = list.flatMap((p) => p.qs);
  const chosen = all.filter((q) => picked[q.key]);
  return (
    <Modal title={`Questions from earlier ${subjectName || ''} papers`} onClose={onClose} width={820} z={1300} icon={false}>
      <div style={{ padding: 18, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="form-input" aria-label="Find a question" placeholder="Find a question…" style={{ flex: '1 1 220px' }} value={find} onChange={(e) => setFind(e.target.value)} />
          <select className="form-select" aria-label="Question type" style={{ width: 190 }} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All kinds of question</option>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        {isLoading && <div style={{ color: '#94A3B8' }}>Loading…</div>}
        {isError && <div style={{ color: '#B91C1C' }}>The earlier papers could not be loaded.</div>}
        {!isLoading && !list.length && <div style={{ fontSize: 13, color: '#64748B' }}>No earlier {subjectName} paper has {needle || type ? 'such ' : ''}questions yet. Papers you make are kept here for next time.</div>}
        <div style={{ maxHeight: 420, overflowY: 'auto', display: 'grid', gap: 10 }}>
          {list.map((p) => (
            <div key={p.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10 }}>
              <div style={{ padding: '7px 10px', background: '#F8FAFC', fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center', borderRadius: '10px 10px 0 0' }}>
                <b style={{ color: NAVY, flex: 1 }}>{[p.examTitle, p.className].filter(Boolean).join(' — ') || p.title}</b>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setPicked((x) => ({ ...x, ...Object.fromEntries(p.qs.filter((q) => !have.has(q.text.trim().toLowerCase())).map((q) => [q.key, true])) }))}>Tick all</button>
              </div>
              {p.qs.map((q) => {
                const dup = have.has(q.text.trim().toLowerCase());
                return (
                  <label key={q.key} style={{ display: 'flex', gap: 8, padding: '7px 10px', borderTop: '1px solid #F1F5F9', fontSize: 13, opacity: dup ? 0.55 : 1 }}>
                    <input type="checkbox" checked={!!picked[q.key]} disabled={dup} onChange={(e) => setPicked({ ...picked, [q.key]: e.target.checked })} />
                    <span style={{ flex: 1 }} dir="auto">{q.text}{q.options && <span style={{ display: 'block', color: '#64748B', fontSize: 12 }}>{q.options.map((o, k) => `(${'abcdef'[k]}) ${o}${q.answer === k ? ' ✓' : ''}`).join('   ')}</span>}{dup && <span style={{ display: 'block', fontSize: 11.5, color: '#64748B' }}>Already in this paper</span>}</span>
                    <span style={{ fontSize: 11.5, color: '#64748B', whiteSpace: 'nowrap' }}>{typeLabel(q.type)} · {q.marks}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: '#64748B', marginRight: 'auto' }}>{chosen.length} ticked</span>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-teal" disabled={!chosen.length} onClick={() => onAdd(chosen.map(({ key, ...q }) => ({ ...q, options: q.options ? [...q.options] : undefined })))}>Add {chosen.length || ''} question{chosen.length === 1 ? '' : 's'}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══ AI-suggested questions to review and add ═══════════════════════ */
function SuggestDialog({ subject, className, topic = '', chapters = [], onClose, onAdd }) {
  const [form, setForm] = useState({ topic, type: 'mcq', count: 5, marks: 1, language: 'en' });
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
        {chapters.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ color: '#64748B' }}>From the syllabus:</span>
            {chapters.map((u, i) => (
              <button key={i} type="button" onClick={() => setForm({ ...form, topic: [u.title, u.content].filter(Boolean).join(': ') })}
                style={{ border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3', borderRadius: 99, padding: '2px 9px', cursor: 'pointer' }} dir="auto">{u.title || u.content}</button>
            ))}
          </div>
        )}
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
