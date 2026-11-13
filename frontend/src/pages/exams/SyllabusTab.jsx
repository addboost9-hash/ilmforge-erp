/**
 * Exam Vault > Syllabus: what each class prepares for an exam, subject by
 * subject, as chapters with the pages, topics or exercises to prepare.
 *
 * Choose the term and exam; the exam's classes are listed with how many
 * subjects have a syllabus. Open a class: each subject shows the date of its
 * paper (from the date sheet); write its chapters (one by one, or paste a
 * list), or copy them from another exam, the class syllabus or another
 * class. Moving to another subject saves on its own. Print one class or all
 * classes, each on its own page, for parents and students.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Trash2, ArrowUp, ArrowDown, Printer, ClipboardPaste, Copy, Save, CheckCircle2, ChevronRight, X, CalendarDays } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { useExamPick, ExamPickerBar, classesOfExam } from './ExamPicker';
import { printSyllabus, paperDay } from '../../utils/syllabusPrint';
import { parseChapterList } from './syllabusTools';
import { useSchoolStamp, stampFor } from '../../utils/schoolStamp';

const NAVY = '#1B2F6E';
const blankRow = () => ({ title: '', details: '' });
const norm = (s) => String(s || '').trim().toLowerCase();

/** Text of a syllabus written in the old editor (HTML), line by line. */
function htmlLines(html) {
  const marked = String(html || '').replace(/<\s*(br|\/p|\/li|\/div|\/tr|\/h\d)\b[^>]*>/gi, '\n').replace(/<\s*\/t[dh]\s*>/gi, ' - ');
  const text = new DOMParser().parseFromString(`<body>${marked}</body>`, 'text/html').body.textContent || '';
  return text.split('\n').map((l) => l.replace(/\s+-\s*$/, '').replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

const plain = (doc) => (doc?.format === 'chapters'
  ? { chapters: (doc.units || []).map((u) => ({ title: u.title || '', details: u.content || '' })), notes: doc.notes || '' }
  : { chapters: parseChapterList(htmlLines((doc?.units || []).map((u) => u.content).join('\n'))), notes: '' });
const written = (s) => !!s && (s.chapters.some((c) => c.title || c.details) || !!s.notes.trim());

export default function SyllabusTab({ initialExamId = '' }) {
  const qc = useQueryClient();
  const pick = useExamPick(initialExamId);
  const { exam, examId } = pick;
  const school = useAuthStore((s) => s.school);
  const stamp = stampFor(useSchoolStamp(), 'syllabus');
  const { data: allClasses = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects-all'], queryFn: () => api.get('/classes/subjects').then((r) => r.data.data || []).catch(() => []) });
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['syllabus-exam', examId],
    queryFn: () => api.get('/syllabus', { params: { examId } }).then((r) => (r.data.data || []).filter((d) => String(d.examId) === String(examId))),
    enabled: !!examId,
  });
  const { data: datesheet = [] } = useQuery({
    queryKey: ['datesheet', examId],
    queryFn: () => api.get(`/exams/${examId}/datesheet`).then((r) => r.data.data || []).catch(() => []),
    enabled: !!examId,
  });
  const classes = useMemo(() => classesOfExam(exam, allClasses), [exam, allClasses]);
  const [classId, setClassId] = useState('');
  useEffect(() => { setClassId(''); }, [examId]);
  const cls = classes.find((c) => String(c.id) === classId);

  const subjectsOf = useCallback((cid) => subjects.filter((s) => s.classId === cid).sort((a, b) => a.name.localeCompare(b.name)), [subjects]);
  const docOf = useCallback((cid, sid) => docs.find((d) => String(d.classId) === String(cid) && String(d.subjectId) === String(sid)), [docs]);
  const paperOf = useCallback((cid, subjectName) => {
    for (const row of datesheet.filter((r) => r.classId === cid)) {
      const e = row.entries.find((x) => norm(x.subject) === norm(subjectName));
      if (e) return e;
    }
    return null;
  }, [datesheet]);
  const progress = (cid) => { const subs = subjectsOf(cid); return { total: subs.length, done: subs.filter((s) => written(docOf(cid, s.id) && plain(docOf(cid, s.id)))).length }; };

  const printClasses = (list) => {
    const ok = printSyllabus({
      school, exam, stamp,
      classes: list.map((c) => ({
        className: c.name,
        subjects: subjectsOf(c.id).map((s) => ({ name: s.name, paper: paperOf(c.id, s.name), ...plain(docOf(c.id, s.id)) })),
      })),
    });
    if (!ok) toast.error('No syllabus has been written for this yet.');
  };

  return (
    <div>
      <ExamPickerBar pick={pick}>
        {exam && <button type="button" className="btn btn-outline btn-sm" onClick={() => printClasses(classes)} disabled={!docs.length}><Printer size={14} /> Print all classes</button>}
      </ExamPickerBar>

      {!exam ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📖</div><div className="empty-state-text">Choose an exam</div><div className="empty-state-sub">Add the exam in Exam Setup first, with its classes.</div></div></div>
      ) : !cls ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 13, color: '#64748B' }}>
            The syllabus of <b>{exam.title}</b>: what each class prepares, subject by subject. Open a class to write it; parents and students get it printed.
          </div>
          {isLoading && <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, padding: 16 }}>
            {classes.map((c) => {
              const p = progress(c.id);
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={c.id} style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, display: 'grid', gap: 8, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ color: NAVY, fontSize: 15 }}>{c.name}</strong>
                    {p.total > 0 && p.done === p.total && <span style={{ color: '#15803D', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} /> Complete</span>}
                  </div>
                  <div aria-label={`${p.done} of ${p.total} subjects`} style={{ height: 7, borderRadius: 99, background: '#EEF2F7', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16A34A' : '#F59E0B' }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748B' }}>
                    {p.total ? `${p.done} of ${p.total} subjects written` : 'No subjects yet — add them in Settings → Subjects'}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-primary btn-sm" disabled={!p.total} onClick={() => setClassId(String(c.id))}>{p.done ? 'Open' : 'Write'} <ChevronRight size={13} /></button>
                    <button type="button" className="btn btn-outline btn-sm" disabled={!p.done} onClick={() => printClasses([c])}><Printer size={13} /> Print</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ClassSyllabus
          key={`${examId}-${classId}`}
          exam={exam} cls={cls} subjects={subjectsOf(cls.id)} docOf={docOf} paperOf={paperOf}
          allClasses={allClasses} allSubjects={subjects}
          onBack={() => setClassId('')}
          onPrint={() => printClasses([cls])}
          onSaved={(doc, sid) => {
            // The saved syllabus straight into the list, so going back to a subject shows it at once.
            qc.setQueryData(['syllabus-exam', examId], (old = []) => [
              ...old.filter((d) => !(String(d.classId) === String(classId) && String(d.subjectId) === String(sid))),
              ...(doc ? [doc] : []),
            ]);
            qc.invalidateQueries({ queryKey: ['syllabi-all'] });
          }}
        />
      )}
    </div>
  );
}

/* ═══ One class: its subjects, and the syllabus of the one open ═══ */
function ClassSyllabus({ exam, cls, subjects, docOf, paperOf, allClasses, allSubjects, onBack, onPrint, onSaved }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || null);
  const subject = subjects.find((s) => s.id === subjectId);
  const [form, setForm] = useState({ chapters: [blankRow()], notes: '' });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [copying, setCopying] = useState(false);
  const loadedFor = useRef(null);

  // Load the open subject's syllabus (once per subject: saving must not reset what is being typed).
  useEffect(() => {
    if (!subject || loadedFor.current === subject.id) return;
    loadedFor.current = subject.id;
    const doc = docOf(cls.id, subject.id);
    const p = doc ? plain(doc) : { chapters: [], notes: '' };
    setForm({ chapters: p.chapters.length ? p.chapters : [blankRow()], notes: p.notes });
    setDirty(false);
  }, [subject, cls.id, docOf]);

  const change = (patch) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const setRow = (i, patch) => change({ chapters: form.chapters.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= form.chapters.length) return; const list = [...form.chapters]; [list[i], list[j]] = [list[j], list[i]]; change({ chapters: list }); };

  const save = useCallback(async ({ quiet = false } = {}) => {
    if (!subject) return true;
    setSaving(true);
    try {
      const r = await api.put('/syllabus/plan', { examId: exam.id, classId: cls.id, subjectId: subject.id, chapters: form.chapters, notes: form.notes });
      setDirty(false);
      onSaved(r.data.data, subject.id);
      if (!quiet) toast.success(r.data.message);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'The syllabus could not be saved.');
      return false;
    } finally { setSaving(false); }
  }, [subject, exam.id, cls.id, form, onSaved]);

  // Ctrl+S saves.
  useEffect(() => {
    const key = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty) save(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [dirty, save]);

  // Going to another subject (or back) saves what was written first.
  const go = async (to) => {
    if (dirty && !(await save({ quiet: true }))) return;
    if (dirty) toast.success(`${subject.name}: saved.`);
    if (to === 'back') onBack(); else setSubjectId(to);
  };
  const nextSubject = subjects[subjects.findIndex((s) => s.id === subjectId) + 1];
  const paper = subject ? paperOf(cls.id, subject.name) : null;
  const filled = form.chapters.filter((c) => c.title || c.details).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 250px) minmax(0, 1fr)', gap: 14, alignItems: 'start' }} className="syl-grid">
      <style>{'@media (max-width: 760px){.syl-grid{grid-template-columns:minmax(0,1fr)!important}}'}</style>
      {/* Subjects */}
      <div className="card" style={{ padding: 10, display: 'grid', gap: 4 }} aria-label="Subjects">
        <button type="button" className="btn btn-outline btn-sm" style={{ justifySelf: 'start', marginBottom: 6 }} onClick={() => go('back')}>← All classes</button>
        <div style={{ fontWeight: 800, color: NAVY, padding: '0 6px 4px' }}>{cls.name}</div>
        {subjects.map((s) => {
          const has = written(docOf(cls.id, s.id) && plain(docOf(cls.id, s.id)));
          const active = s.id === subjectId;
          return (
            <button key={s.id} type="button" aria-current={active ? 'true' : undefined} onClick={() => !active && go(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 0, cursor: 'pointer', background: active ? '#EEF2FF' : 'transparent', color: '#1E293B', fontWeight: active ? 700 : 500, fontSize: 13 }}>
              <span style={{ width: 18, flex: 'none', color: has ? '#16A34A' : '#CBD5E1' }}>{has ? <CheckCircle2 size={16} /> : '○'}</span>
              <span style={{ flex: 1, minWidth: 0 }} dir="auto">{s.name}</span>
            </button>
          );
        })}
        <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={async () => { if (dirty) await save({ quiet: true }); onPrint(); }}><Printer size={13} /> Print {cls.name}</button>
      </div>

      {/* The open subject */}
      {subject && (
        <div className="card" style={{ padding: 16, display: 'grid', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={17} /> <span dir="auto">{subject.name}</span></h3>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                <CalendarDays size={13} /> {paper?.date ? `Paper on ${paperDay(paper)}` : 'No date for this paper in the date sheet yet'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPasting(true)}><ClipboardPaste size={13} /> Paste a list</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setCopying(true)}><Copy size={13} /> Copy from…</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table aria-label="Chapters" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', color: '#334155', textAlign: 'left' }}>
                  <th style={{ padding: '7px 8px', width: 34 }}>#</th>
                  <th style={{ padding: '7px 8px', width: '38%' }}>Chapter / unit</th>
                  <th style={{ padding: '7px 8px' }}>To prepare (topics, pages, exercises)</th>
                  <th style={{ padding: '7px 8px', width: 96 }} aria-label="Move or remove" />
                </tr>
              </thead>
              <tbody>
                {form.chapters.map((c, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #EEF2F7' }}>
                    <td style={{ padding: '6px 8px', color: '#94A3B8', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input className="form-input" dir="auto" aria-label={`Chapter ${i + 1}`} value={c.title} maxLength={200} placeholder="e.g. Chapter 3: Fractions"
                        onChange={(e) => setRow(i, { title: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); change({ chapters: [...form.chapters.slice(0, i + 1), blankRow(), ...form.chapters.slice(i + 1)] }); setTimeout(() => document.querySelector(`[aria-label="Chapter ${i + 2}"]`)?.focus(), 0); } }} />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input className="form-input" dir="auto" aria-label={`To prepare for chapter ${i + 1}`} value={c.details} maxLength={1000} placeholder="e.g. Pages 30–45, exercises 3.1 to 3.4"
                        onChange={(e) => setRow(i, { details: e.target.value })} />
                    </td>
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <button type="button" style={iconBtn} aria-label={`Move chapter ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={13} /></button>
                      <button type="button" style={iconBtn} aria-label={`Move chapter ${i + 1} down`} disabled={i === form.chapters.length - 1} onClick={() => move(i, 1)}><ArrowDown size={13} /></button>
                      <button type="button" style={{ ...iconBtn, color: '#B91C1C' }} aria-label={`Remove chapter ${i + 1}`} onClick={() => change({ chapters: form.chapters.length > 1 ? form.chapters.filter((_, k) => k !== i) : [blankRow()] })}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => change({ chapters: [...form.chapters, blankRow()] })} disabled={form.chapters.length >= 100}><Plus size={13} /> Add a chapter</button>
            <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 10 }}>Tip: press Enter in a chapter to add the next one.</span>
          </div>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' }}>Notes for parents and students (optional)
            <textarea className="form-input" dir="auto" rows={2} maxLength={3000} value={form.notes} placeholder="e.g. All exercises of these chapters. Revise the spellings list."
              onChange={(e) => change({ notes: e.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </label>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #EEF2F7', paddingTop: 12, paddingRight: 56 }}>
            <span style={{ fontSize: 12.5, color: dirty ? '#B45309' : '#15803D', marginRight: 'auto' }}>
              {dirty ? 'Not saved yet (Ctrl+S saves)' : `Saved · ${filled} chapter${filled === 1 ? '' : 's'}`}
            </span>
            <button type="button" className="btn btn-outline" disabled={!dirty || saving} onClick={() => save()}><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
            {nextSubject
              ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => go(nextSubject.id)}>Save and next: {nextSubject.name} <ChevronRight size={14} /></button>
              : <button type="button" className="btn btn-primary" disabled={saving} onClick={() => go('back')}>Save and finish</button>}
          </div>
        </div>
      )}

      {pasting && (
        <PasteDialog onClose={() => setPasting(false)} onAdd={(rows) => {
          const kept = form.chapters.filter((c) => c.title || c.details);
          change({ chapters: [...kept, ...rows].slice(0, 100) });
          setPasting(false);
          toast.success(`${rows.length} chapter${rows.length === 1 ? '' : 's'} added.`);
        }} />
      )}
      {copying && (
        <CopyFrom exam={exam} cls={cls} subject={subject} allClasses={allClasses} allSubjects={allSubjects}
          onClose={() => setCopying(false)}
          onPick={(p) => { change({ chapters: p.chapters.length ? p.chapters : [blankRow()], notes: p.notes || form.notes }); setCopying(false); toast.success('Copied. Change what differs, then save.'); }} />
      )}
    </div>
  );
}

/* ═══ Paste a list of chapters ═══ */
function PasteDialog({ onClose, onAdd }) {
  const [text, setText] = useState('');
  const rows = parseChapterList(text);
  return (
    <Dialog title="Paste a list of chapters" onClose={onClose}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
        One chapter on each line, from Word, WhatsApp or anywhere. What to prepare can follow a dash or a tab:
        <br /><code style={{ fontSize: 12 }}>Chapter 1: Numbers - pages 1 to 20</code>
      </p>
      <textarea className="form-input" autoFocus dir="auto" rows={8} aria-label="Chapters list" value={text} onChange={(e) => setText(e.target.value)}
        placeholder={'Chapter 1: Numbers - pages 1 to 20\nChapter 2: Addition - exercises 2.1, 2.2\nChapter 3: Shapes'} style={{ fontFamily: 'inherit' }} />
      {rows.length > 0 && (
        <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 12.5, border: '1px solid #E2E8F0', borderRadius: 8 }}>
          {rows.map((r, i) => <div key={i} style={{ padding: '4px 8px', borderTop: i ? '1px solid #F1F5F9' : 0 }}><b dir="auto">{r.title}</b>{r.details && <span style={{ color: '#64748B' }} dir="auto"> — {r.details}</span>}</div>)}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={!rows.length} onClick={() => onAdd(rows)}>Add {rows.length || ''} chapter{rows.length === 1 ? '' : 's'}</button>
      </div>
    </Dialog>
  );
}

/* ═══ Copy from another exam, the class syllabus, or another class ═══ */
function CopyFrom({ exam, cls, subject, allClasses, allSubjects, onClose, onPick }) {
  const { data: all = [], isLoading } = useQuery({ queryKey: ['syllabi-all'], queryFn: () => api.get('/syllabus').then((r) => r.data.data || []) });
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then((r) => r.data.data || []) });
  const sameName = new Set(allSubjects.filter((s) => norm(s.name) === norm(subject.name)).map((s) => s.id));
  const className = (id) => allClasses.find((c) => c.id === Number(id))?.name || 'Class';
  const examTitle = (id) => exams.find((e) => e.id === Number(id))?.title || 'Another exam';
  const sources = all
    .filter((d) => sameName.has(Number(d.subjectId)) && !(String(d.examId) === String(exam.id) && String(d.classId) === String(cls.id)))
    .map((d) => {
      const p = plain(d);
      const where = !d.examId
        ? `${className(d.classId)} — class syllabus (whole year)`
        : String(d.classId) === String(cls.id) ? `${examTitle(d.examId)}` : `${className(d.classId)} — ${examTitle(d.examId)}`;
      return { id: d.id, where, ...p, mine: String(d.classId) === String(cls.id) };
    })
    .filter((s) => written(s))
    .sort((a, b) => Number(b.mine) - Number(a.mine));
  return (
    <Dialog title={`Copy the ${subject.name} syllabus from…`} onClose={onClose}>
      {isLoading && <div style={{ color: '#94A3B8' }}>Loading…</div>}
      {!isLoading && !sources.length && <div style={{ fontSize: 13, color: '#64748B' }}>No other {subject.name} syllabus has been written yet, in this class or another.</div>}
      <div style={{ display: 'grid', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
        {sources.map((s) => (
          <button key={s.id} type="button" onClick={() => onPick(s)}
            style={{ textAlign: 'left', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', background: '#fff', cursor: 'pointer', display: 'grid', gap: 3 }}>
            <strong style={{ color: NAVY, fontSize: 13.5 }}>{s.where}</strong>
            <span style={{ fontSize: 12, color: '#64748B' }} dir="auto">{s.chapters.slice(0, 4).map((c) => c.title).filter(Boolean).join(' · ')}{s.chapters.length > 4 ? ` … (${s.chapters.length} chapters)` : ''}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8' }}>What you copy replaces what is in the editor now; nothing is saved until you save.</div>
    </Dialog>
  );
}

function Dialog({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, padding: 18, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ flex: 1, color: NAVY, fontSize: 15 }}>{title}</strong>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const iconBtn = { display: 'inline-flex', background: 'none', border: '1px solid #E2E8F0', borderRadius: 5, padding: '3px 5px', margin: '0 2px', cursor: 'pointer', color: '#475569' };
