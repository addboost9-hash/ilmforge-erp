/**
 * Roll number slips, in three steps:
 *   1  Subjects   each class's papers (its date sheet): what the slip lists
 *   2  Design     how the slip looks, with a live preview of a real slip:
 *                 photo, roll number, the student's and the principal's
 *                 signature, title, colour, instructions…
 *   3  Print      every class at once (each class from a new page), one
 *                 class, one section or one student; print or save as PDF
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BookOpen, Palette, Printer, Download, CheckCircle2, AlertTriangle, Copy, Upload, Trash2, Save, Search, Users, Image as ImageIcon,
  Lock, RotateCcw, ListOrdered,
} from 'lucide-react';
import api from '../../api/client';
import { printHTML } from '../../utils/print';
import { examMatchesTerm } from '../../utils/terms';
import useExamTerms from '../../hooks/useExamTerms';
import { buildSlipsDocument, buildSeatingDocument, openSlipsWindow, examLabel, slipRollNo, usesExamNumbers } from '../../utils/rollSlips';
import { signatureFromFile } from '../../utils/signatureImage';
import { compressLogo } from '../../utils/photo';
import useAuthStore from '../../store/auth.store';
import { useSchoolStamp, stampFor } from '../../utils/schoolStamp';
import SchoolStampCard from '../../components/settings/SchoolStampCard';
import ClassPapersEditor from './ClassPapersEditor';

const NAVY = '#1B2F6E';
const COLORS = ['#1B2F6E', '#0F766E', '#7F1D1D', '#14532D', '#4C1D95', '#111827'];
const SHOW_OPTIONS = [
  ['photo', 'Student photo'],
  ['fatherName', "Father's name"],
  ['day', 'Day of each paper'],
  ['time', 'Time of each paper'],
  ['room', 'Room'],
  ['maxMarks', 'Marks of each paper'],
  ['invigilator', "Invigilator's signature column"],
  ['instructions', 'Instructions'],
  ['studentSignature', "Student's signature"],
  ['classTeacherSignature', "Class teacher's signature"],
  ['principalSignature', "Principal's signature"],
];
const SAMPLE = { id: 0, name: 'Student name', fatherName: "Father's name", rollNo: '101', examRollNo: '1001', photoUrl: '' };
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };

const useTerms = () => useExamTerms();

/* The design as it is sent to the server. */
const designPayload = (d) => ({
  title: d.title, schoolName: d.schoolName || '', color: d.color, perPage: d.perPage, rollNumber: d.rollNumber, rollStart: Number(d.rollStart) || 1,
  rollPrefix: d.rollPrefix, show: d.show, principalName: d.principalName, principalTitle: d.principalTitle,
  principalSignature: d.signatureFromResultCard && !d.signatureChanged ? undefined : d.principalSignature,
  footerNote: d.footerNote, instructions: d.instructions,
});

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/* Whether this exam's numbers are fixed yet, and the button to number it
   afresh (admin or principal, before the slips are handed out). */
function NumbersStatus({ examId, info, design, onChanged }) {
  const role = useAuthStore((s) => s.user?.role);
  const [busy, setBusy] = useState(false);
  if (!info || !usesExamNumbers(design)) return null;
  const canRenumber = ['admin', 'super_admin', 'principal'].includes(role);
  const renumber = async () => {
    if (!window.confirm(`Number this exam afresh? Slips already printed (${info.from} – ${info.to}) will no longer match: print every class again and take back the old slips.`)) return;
    setBusy(true);
    try {
      const { data } = await api.delete(`/exams/${examId}/roll-numbers`);
      toast.success(data.message || 'Done.');
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not renumber the exam.');
    } finally {
      setBusy(false);
    }
  };
  if (!info.fixed) {
    return (
      <div style={{ fontSize: 12.5, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Lock size={14} style={{ flex: 'none', marginTop: 2 }} />
        <span>This exam's numbers are fixed the first time its slips are printed, so a slip printed later never repeats a number. Until then they follow the setting above.</span>
      </div>
    );
  }
  const differs = info.mode !== design.rollNumber;
  return (
    <div style={{ fontSize: 12.5, color: '#14532D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 10px', display: 'grid', gap: 6 }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Lock size={14} style={{ flex: 'none', marginTop: 2 }} />
        <span>
          <strong>Fixed for this exam{info.fixedAt ? ` on ${fmtDate(info.fixedAt)}` : ''}: {info.from} – {info.to}</strong>, {info.mode === 'mixed' ? 'mixed across the classes' : 'class by class'} ({info.count} students).
          {' '}A student admitted since gets the next number{info.notFixed ? ` (${info.notFixed} waiting for one)` : ''}.
          {differs && ' The setting above is used for exams whose slips are not printed yet.'}
        </span>
      </span>
      {canRenumber && (
        <span>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={renumber}><RotateCcw size={13} /> {busy ? 'Clearing…' : 'Number this exam afresh'}</button>
        </span>
      )}
    </div>
  );
}

/* The classes of the exam from its date sheet rows (one row per section). */
function classesOf(datesheet) {
  const out = [];
  for (const r of datesheet) {
    let c = out.find((x) => x.id === r.classId);
    if (!c) { c = { id: r.classId, name: r.className, sections: [], rows: [] }; out.push(c); }
    if (r.sectionId) c.sections.push({ id: r.sectionId, name: r.sectionName });
    c.rows.push(r);
  }
  return out.map((c) => ({ ...c, papers: Math.max(0, ...c.rows.map((r) => r.entries.length)) }));
}

/* ═══ 1. Subjects ════════════════════════════════════════════════════ */
function SubjectsStep({ examId, exam, datesheet, onSaved }) {
  const classes = useMemo(() => classesOf(datesheet), [datesheet]);
  const [classId, setClassId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [copying, setCopying] = useState(false);
  useEffect(() => { if (!classes.some((c) => c.id === classId) && classes.length) setClassId(classes[0].id); }, [classes, classId]);
  const cls = classes.find((c) => c.id === classId);
  const entriesOf = useCallback((sectionId) => (cls?.rows.find((r) => (r.sectionId || null) === (sectionId || null))?.entries) || [], [cls]);
  const ready = classes.filter((c) => c.papers > 0).length;

  const pick = (id) => {
    if (id === classId) return;
    if (dirty && !window.confirm('Your changes to these papers are not saved. Open another class anyway?')) return;
    setDirty(false);
    setClassId(id);
  };
  const copyToAll = async () => {
    if (!cls?.papers) return;
    if (!window.confirm(`Give every class of this exam the same papers as ${cls.name}? Their own papers are replaced.`)) return;
    const from = cls.rows.find((r) => r.entries.length);
    setCopying(true);
    try {
      const { data } = await api.post(`/exams/${examId}/datesheet/copy-to-all`, { fromClassId: cls.id, fromSectionId: from?.sectionId || null });
      toast.success(data.message || 'Copied.');
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not copy the papers.');
    } finally {
      setCopying(false);
    }
  };

  if (!classes.length) {
    return <div className="card"><div className="empty-state"><div className="empty-state-text">This exam has no classes</div><div className="empty-state-sub">Edit the exam in Exam Setup and choose its classes.</div></div></div>;
  }
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: '1 1 220px', maxWidth: 300, padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', padding: '4px 6px 8px' }}>{ready} of {classes.length} classes ready</div>
        <div role="listbox" aria-label="Classes of the exam" style={{ display: 'grid', gap: 4 }}>
          {classes.map((c) => (
            <button key={c.id} type="button" role="option" aria-selected={c.id === classId} onClick={() => pick(c.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: `1px solid ${c.id === classId ? NAVY : '#E2E8F0'}`, background: c.id === classId ? '#EEF2FF' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
              <span>{c.name}{c.sections.length > 1 && <span style={{ fontWeight: 400, color: '#94A3B8' }}> · {c.sections.length} sections</span>}</span>
              {c.papers
                ? <span style={{ fontSize: 11.5, color: '#15803D', display: 'inline-flex', gap: 4, alignItems: 'center' }}><CheckCircle2 size={13} /> {c.papers}</span>
                : <span style={{ fontSize: 11.5, color: '#B45309' }}>Not planned</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ flex: '3 1 520px', minWidth: 0, padding: 18 }}>
        {cls && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, color: NAVY, fontSize: 16 }}>{cls.name}: papers on the slip</div>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>These subjects, dates and times are printed on the slip and on the date sheet.</div>
              </div>
              {classes.length > 1 && (
                <button type="button" className="btn btn-outline btn-sm" disabled={!cls.papers || copying || dirty} onClick={copyToAll} title={dirty ? 'Save first' : ''}>
                  <Copy size={14} /> {copying ? 'Copying…' : 'Same papers for every class'}
                </button>
              )}
            </div>
            <ClassPapersEditor key={`${examId}-${cls.id}-${cls.papers}`} examId={examId} exam={exam} cls={cls} entriesOf={entriesOf} onSaved={onSaved} onDirtyChange={setDirty} />
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ 2. Design ══════════════════════════════════════════════════════ */
function SlipPreview({ html }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1, (el.clientWidth - 2) / 760));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} style={{ width: '100%', overflow: 'hidden', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', height: Math.round(1080 * scale) }}>
      <iframe title="Slip preview" srcDoc={html} style={{ width: 760, height: 1080, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0', display: 'block' }} />
    </div>
  );
}

function DesignStep({ examId, summary, draft, setDraft, saved, onSaved, onNumbersChanged, numbering }) {
  const qc = useQueryClient();
  const stamp = useSchoolStamp();
  const role = useAuthStore((s) => s.user?.role);
  const school = useAuthStore((s) => s.school);
  const updateSchool = useAuthStore((s) => s.updateSchool);
  const updateBranding = useAuthStore((s) => s.updateBranding);
  const isAdmin = ['admin', 'super_admin'].includes(role);
  const logoUrl = summary?.school?.logoUrl || '';
  const logoRef = useRef(null);
  const [logoBusy, setLogoBusy] = useState(false);
  // The school's logo (School Profile): the same one on every card and report.
  const uploadLogo = async (file) => {
    if (!file) return;
    setLogoBusy(true);
    try {
      const small = await compressLogo(file);
      await api.put('/settings/school', { logoUrl: small });
      updateSchool({ ...(school || {}), logoUrl: small });
      updateBranding({ logo: small });
      if (draft.show?.logo === false) setDraft((d) => ({ ...d, show: { ...d.show, logo: true } }));
      qc.invalidateQueries({ queryKey: ['exam-slips', examId] });
      qc.invalidateQueries({ queryKey: ['school-profile'] });
      toast.success('Logo saved. It is the school\'s logo everywhere.');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Could not save the logo.');
    } finally {
      setLogoBusy(false);
    }
  };
  // The classes in the school's order, for the example of mixed numbers.
  const classNames = [...new Set((summary?.groups || []).filter((g) => g.students.length).map((g) => g.className))];
  const start = Number(draft.rollStart) || 1;
  const mixedExample = classNames.length > 1
    ? `${classNames.slice(0, 3).map((c, i) => `${c} ${draft.rollPrefix || ''}${start + i}`).join(', ')}${classNames.length > 3 ? ' …' : ''}, then the second student of each class, and so on.`
    : 'The first student of each class, then the second student of each class, and so on.';
  const groups = (summary?.groups || []).filter((g) => g.students.length);
  const [previewKey, setPreviewKey] = useState('');
  useEffect(() => { if (!previewKey && groups.length) setPreviewKey(`${groups[0].classId}_${groups[0].sectionId || ''}`); }, [groups, previewKey]);
  const [pc, ps] = previewKey.split('_');
  const { data: previewData } = useQuery({
    queryKey: ['exam-slips', examId, 'preview', previewKey, numbering],
    queryFn: () => api.get(`/exams/${examId}/slips`, { params: { classId: pc, sectionId: ps || undefined, ...numbering } }).then((r) => r.data.data),
    enabled: !!examId && !!pc,
    placeholderData: (prev) => prev,
  });
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setShow = (k, v) => setDraft((d) => ({ ...d, show: { ...d.show, [k]: v } }));
  const dirty = JSON.stringify(designPayload(draft)) !== JSON.stringify(designPayload(saved));

  const save = useMutation({
    mutationFn: () => api.put('/exams/slip-design', designPayload(draft)),
    onSuccess: (r) => {
      qc.setQueryData(['slip-design'], r.data.data);
      onSaved(r.data.data);
      toast.success('Slip design saved.');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save the design.'),
  });

  const fileRef = useRef(null);
  const upload = async (file) => {
    if (!file) return;
    try { set({ principalSignature: await signatureFromFile(file), signatureChanged: true, signatureFromResultCard: false }); } catch (e) { toast.error(e.message); }
  };

  const data = previewData || summary;
  const g = (previewData?.groups || [])[0] || groups[0];
  const students = g?.students?.length ? g.students.slice(0, Number(draft.perPage) === 2 ? 2 : 1) : [SAMPLE];
  const html = data ? buildSlipsDocument({
    data,
    design: { ...draft, instructions: draft.instructions },
    groups: [{ ...(g || { className: 'Class', sectionName: '', schedule: [] }), students }],
    preview: true,
    stamp: stampFor(stamp, 'rollSlips'),
  }) : '';

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: '1 1 320px', maxWidth: 440, display: 'grid', gap: 16, padding: 18 }}>
        <section style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>School name and logo</h3>
          <label style={label}>School name on the slip
            <input className="form-input" value={draft.schoolName || ''} maxLength={150} placeholder={summary?.school?.name || 'The name in School Profile'} onChange={(e) => set({ schoolName: e.target.value })} />
            <span style={{ fontWeight: 400, color: '#64748B' }}>Leave it empty to print the name saved in School Profile.</span>
          </label>
          <div style={label}>Logo
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 56, height: 56, flex: 'none', border: '1px dashed #CBD5E1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', overflow: 'hidden', opacity: draft.show?.logo === false ? 0.4 : 1 }}>
                {logoUrl ? <img src={logoUrl} alt="School logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 400 }}>No logo</span>}
              </div>
              <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13, fontWeight: 400 }}>
                <input type="checkbox" checked={draft.show?.logo !== false} onChange={(e) => setShow('logo', e.target.checked)} /> Print the logo on the slip
              </label>
              {isAdmin && (
                <>
                  <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }} />
                  <button type="button" className="btn btn-outline btn-sm" disabled={logoBusy} onClick={() => logoRef.current?.click()}><Upload size={13} /> {logoBusy ? 'Saving…' : logoUrl ? 'Change logo' : 'Add logo'}</button>
                </>
              )}
            </div>
            <span style={{ fontWeight: 400, color: '#64748B' }}>
              {isAdmin
                ? 'This is the school\'s logo (School Profile): changing it here changes it on ID cards, result cards and vouchers too. To print the slips without it, untick the box.'
                : 'The logo is the school\'s own, set by the admin in School Profile. To print the slips without it, untick the box.'}
            </span>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>Title and look</h3>
          <label style={label}>Title on the slip
            <input className="form-input" value={draft.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <div style={label}>Colour
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={draft.color === c} onClick={() => set({ color: c })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: draft.color === c ? '3px solid #F59E0B' : '2px solid #fff', boxShadow: '0 0 0 1px #CBD5E1', cursor: 'pointer' }} />
              ))}
              <input type="color" aria-label="Another colour" value={draft.color} onChange={(e) => set({ color: e.target.value })} style={{ width: 34, height: 30, border: 0, background: 'none', padding: 0 }} />
            </div>
          </div>
          <div style={label}>Slips on one A4 page
            <div style={{ display: 'flex', gap: 6 }}>
              {[[2, 'Two (saves paper)'], [1, 'One, larger']].map(([n, t]) => (
                <button key={n} type="button" aria-pressed={Number(draft.perPage) === n} onClick={() => set({ perPage: n })}
                  className={Number(draft.perPage) === n ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'} style={Number(draft.perPage) === n ? { background: NAVY } : undefined}>{t}</button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>Roll number</h3>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
            <input type="radio" name="rollnumber" checked={draft.rollNumber === 'student'} onChange={() => set({ rollNumber: 'student' })} />
            <span><strong>The student's roll number</strong><br /><span style={{ color: '#64748B' }}>As in the student's record.</span></span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
            <input type="radio" name="rollnumber" checked={draft.rollNumber === 'exam'} onChange={() => set({ rollNumber: 'exam' })} />
            <span><strong>Exam roll numbers, class by class</strong><br /><span style={{ color: '#64748B' }}>Numbered for this exam: every student of the first class, then the next class, in roll number order.</span></span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
            <input type="radio" name="rollnumber" checked={draft.rollNumber === 'mixed'}
              onChange={() => set({ rollNumber: 'mixed', ...(Number(draft.rollStart) === 1001 ? { rollStart: 5001 } : {}) })} />
            <span><strong>Mixed exam roll numbers, to stop copying</strong><br />
              <span style={{ color: '#64748B' }}>Numbered across the classes in turn: {mixedExample} Seated in number order, no student sits beside a classmate. Classes follow the order set in School Settings → Classes.</span>
            </span>
          </label>
          {usesExamNumbers(draft) && (
            <div style={{ display: 'flex', gap: 10, paddingLeft: 24 }}>
              <label style={{ ...label, flex: 1 }}>Prefix
                <input className="form-input" value={draft.rollPrefix} maxLength={12} placeholder="e.g. T1-" onChange={(e) => set({ rollPrefix: e.target.value })} />
              </label>
              <label style={{ ...label, flex: 1 }}>First number
                <input className="form-input" type="number" min={1} value={draft.rollStart} onChange={(e) => set({ rollStart: e.target.value })} />
              </label>
            </div>
          )}
          <NumbersStatus examId={examId} info={summary?.rollNumbers} design={draft} onChanged={onNumbersChanged} />
          <div style={{ fontSize: 12.5, color: '#64748B' }}>
            All three follow each class's roll number order. To rearrange a class or give its students other roll numbers, use <a href="/students/roll-numbers" target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>Roll Numbers</a>.
          </div>
        </section>

        <section style={{ display: 'grid', gap: 6 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>On the slip</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '4px 12px' }}>
            {SHOW_OPTIONS.map(([k, t]) => (
              <label key={k} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                <input type="checkbox" checked={!!draft.show[k]} onChange={(e) => setShow(k, e.target.checked)} /> {t}
              </label>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>Principal</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ ...label, flex: 1 }}>Name
              <input className="form-input" value={draft.principalName} maxLength={80} placeholder="Optional" onChange={(e) => set({ principalName: e.target.value })} />
            </label>
            <label style={{ ...label, flex: 1 }}>Title
              <input className="form-input" value={draft.principalTitle} maxLength={60} onChange={(e) => set({ principalTitle: e.target.value })} />
            </label>
          </div>
          <div style={label}>Signature
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 150, height: 56, border: '1px dashed #CBD5E1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
                {draft.principalSignature ? <img src={draft.principalSignature} alt="Principal's signature" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span style={{ fontSize: 11.5, color: '#94A3B8' }}>Signed by hand</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}><Upload size={13} /> {draft.principalSignature ? 'Change' : 'Add a picture'}</button>
              {draft.principalSignature && <button type="button" className="btn btn-outline btn-sm" style={{ color: '#DC2626' }} onClick={() => set({ principalSignature: '', signatureChanged: true, signatureFromResultCard: false })}><Trash2 size={13} /> Remove</button>}
            </div>
            <span style={{ fontWeight: 400, color: '#64748B' }}>
              {draft.signatureFromResultCard && !draft.signatureChanged
                ? 'This is the signature from the result card settings.'
                : 'Sign on white paper and take a clear photo; the paper\'s white is removed. Leave it empty to sign each slip by hand.'}
            </span>
          </div>
        </section>

        <SchoolStampCard compact only={['rollSlips', 'resultCards', 'dateSheets', 'syllabus']} />

        <section style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>Instructions and footer</h3>
          <label style={label}>Instructions, one per line
            <textarea className="form-input" rows={5} value={draft.instructions.join('\n')} onChange={(e) => set({ instructions: e.target.value.split('\n').slice(0, 12) })} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </label>
          <label style={label}>Footer line
            <input className="form-input" value={draft.footerNote} maxLength={160} onChange={(e) => set({ footerNote: e.target.value })} />
          </label>
        </section>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#fff', paddingTop: 8 }}>
          <span style={{ fontSize: 12.5, color: dirty ? '#B45309' : '#64748B' }}>{dirty ? 'Not saved yet' : 'Saved'}</span>
          <button type="button" className="btn btn-teal" style={{ background: NAVY }} disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save size={14} /> {save.isPending ? 'Saving…' : 'Save design'}
          </button>
        </div>
      </div>

      <div style={{ flex: '2 1 420px', minWidth: 0, position: 'sticky', top: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, color: NAVY }}>Preview <span style={{ fontWeight: 400, color: '#64748B', fontSize: 12.5 }}>· exactly as printed</span></div>
          {groups.length > 0 && (
            <select aria-label="Preview class" className="form-select" style={{ maxWidth: 240 }} value={previewKey} onChange={(e) => setPreviewKey(e.target.value)}>
              {groups.map((x) => <option key={`${x.classId}_${x.sectionId || ''}`} value={`${x.classId}_${x.sectionId || ''}`}>{x.className}{x.sectionName ? ` — ${x.sectionName}` : ''}</option>)}
            </select>
          )}
        </div>
        {html ? <SlipPreview html={html} /> : <div className="card" style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>}
      </div>
    </div>
  );
}

/* ═══ 3. Print ═══════════════════════════════════════════════════════ */
function PrintStep({ examId, exam, summary, design, designDirty, onDesign, onNumbersChanged }) {
  const stamp = useSchoolStamp();
  const dups = summary?.duplicates || [];
  /* Exam numbers are fixed as they are printed (the first print fixes
     everyone's; later prints add students admitted since). */
  const fixNumbers = async () => {
    if (!usesExamNumbers(design)) return;
    const { data } = await api.post(`/exams/${examId}/roll-numbers`, { mode: design.rollNumber, start: Number(design.rollStart) || 1, prefix: design.rollPrefix || '' });
    if (data.added) onNumbersChanged?.();
  };
  const printSeating = async () => {
    const title = `Seating List — ${examLabel(exam)}`;
    const win = openSlipsWindow((html) => printHTML(html, { title }));
    setBusy('seating');
    try {
      await fixNumbers();
      const { data } = await api.get(`/exams/${examId}/slips`, { params: { photos: 0 } });
      win.fill(buildSeatingDocument({ data: data.data, design, title }));
    } catch (e) {
      win.close();
      toast.error(e.response?.data?.message || 'Could not prepare the seating list.');
    } finally {
      setBusy('');
    }
  };
  const [busy, setBusy] = useState('');
  const [find, setFind] = useState('');
  const groups = summary?.groups || [];
  const classes = useMemo(() => {
    const out = [];
    for (const g of groups) {
      let c = out.find((x) => x.id === g.classId);
      if (!c) { c = { id: g.classId, name: g.className, groups: [] }; out.push(c); }
      c.groups.push(g);
    }
    return out;
  }, [groups]);
  const total = groups.reduce((n, g) => n + g.students.length, 0);
  const noPapers = groups.filter((g) => g.students.length && !g.schedule.length);
  const issues = (list) => {
    const students = list.flatMap((g) => g.students);
    const out = [];
    if (list.some((g) => g.students.length && !g.schedule.length)) out.push('no date sheet');
    const noRoll = design.rollNumber === 'student' ? students.filter((s) => !s.rollNo).length : 0;
    if (noRoll) out.push(`${noRoll} without a roll number`);
    const noPhoto = design.show?.photo ? students.filter((s) => !s.hasPhoto).length : 0;
    if (noPhoto) out.push(`${noPhoto} without a photo`);
    return out;
  };

  const print = async ({ classId, sectionId, studentId, what }) => {
    const title = `Roll Number Slips — ${examLabel(exam)} — ${what}`;
    const win = openSlipsWindow((html) => printHTML(html, { title }));
    setBusy(what);
    try {
      await fixNumbers();
      const { data } = await api.get(`/exams/${examId}/slips`, { params: { classId, sectionId } });
      let list = data.data.groups;
      if (studentId) list = list.map((g) => ({ ...g, students: g.students.filter((s) => s.id === studentId) })).filter((g) => g.students.length);
      if (!list.some((g) => g.students.length)) { win.close(); toast.error('There are no students to print.'); return; }
      win.fill(buildSlipsDocument({ data: data.data, design: { ...design, instructions: design.instructions }, groups: list, autoPrint: true, title, stamp: stampFor(stamp, 'rollSlips') }));
    } catch (e) {
      win.close();
      toast.error(e.response?.data?.message || 'Could not prepare the slips.');
    } finally {
      setBusy('');
    }
  };

  const q = find.trim().toLowerCase();
  const found = q.length < 2 ? [] : groups.flatMap((g) => g.students.map((s) => ({ s, g })))
    .filter(({ s }) => s.name.toLowerCase().includes(q) || String(s.rollNo).toLowerCase() === q || String(s.examRollNo).toLowerCase() === q)
    .slice(0, 8);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {designDirty && (
        <div role="note" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 12px' }}>
          <AlertTriangle size={15} /> The slips print with your design changes, which are not saved yet.
          <button type="button" className="btn btn-outline btn-sm" onClick={onDesign}>Go to the design</button>
        </div>
      )}
      {dups.length > 0 && (
        <div role="note" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px' }}>
          <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
          <div style={{ minWidth: 0 }}>
            <strong>{dups.length === 1 ? 'One student is' : `${dups.length} students are`} recorded twice: each gets one slip.</strong>
            <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
              {dups.slice(0, 8).map((d) => (
                <li key={d.id}>
                  {d.name}{d.fatherName ? ` s/o ${d.fatherName}` : ''}, {d.className}: the record {d.rollNo ? `with roll no. ${d.rollNo}` : 'without a roll number'} is the same child as roll no. {d.keptRollNo || '—'}.{' '}
                  <a href={`/students/${d.id}`} target="_blank" rel="noreferrer" style={{ color: NAVY, fontWeight: 700 }}>Open the extra record</a>
                </li>
              ))}
              {dups.length > 8 && <li>… and {dups.length - 8} more.</li>}
            </ul>
            Remove the extra records in Students, so fee bills and attendance are not doubled either.
          </div>
        </div>
      )}
      <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderLeft: `4px solid ${NAVY}`, padding: 18, marginBottom: 0 }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontWeight: 800, color: NAVY, fontSize: 16 }}>All classes: {total} slip{total === 1 ? '' : 's'}</div>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>
            Class by class, each class from a new page, {Number(design.perPage) === 2 ? 'two slips on each A4 page' : 'one slip on each A4 page'}. To download, choose <strong>Save as PDF</strong> as the printer.
          </div>
          {noPapers.length > 0 && <div style={{ fontSize: 12.5, color: '#B45309', marginTop: 4 }}>No date sheet yet for {[...new Set(noPapers.map((g) => g.className))].join(', ')}: their slips list no papers.</div>}
          {usesExamNumbers(design) && (
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
              Roll numbers: <strong>{(summary?.rollNumbers?.fixed ? summary.rollNumbers.mode : design.rollNumber) === 'mixed' ? 'mixed across the classes' : 'class by class'}</strong>
              {summary?.rollNumbers?.fixed ? `, fixed: ${summary.rollNumbers.from} – ${summary.rollNumbers.to}.` : ', fixed when you print.'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {usesExamNumbers(design) && (
            <button type="button" className="btn btn-outline" disabled={!total || !!busy} onClick={printSeating} title="Every candidate in roll number order, to seat the hall by">
              <ListOrdered size={16} /> {busy === 'seating' ? 'Preparing…' : 'Seating list'}
            </button>
          )}
          <button type="button" className="btn btn-teal" style={{ background: NAVY, padding: '11px 20px' }} disabled={!total || !!busy} onClick={() => print({ what: 'All classes' })}>
            <Download size={16} /> {busy === 'All classes' ? 'Preparing…' : 'Download all classes (PDF)'}
          </button>
        </div>
      </div>
      <NumbersStatus examId={examId} info={summary?.rollNumbers} design={design} onChanged={onNumbersChanged} />

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table" aria-label="Slips by class">
            <thead><tr><th>Class</th><th>Students</th><th>Papers</th><th>Check</th><th style={{ textAlign: 'right' }}>Print / download</th></tr></thead>
            <tbody>
              {classes.length === 0 && <tr><td colSpan={5} style={{ padding: 22, color: '#94A3B8' }}>No active students in the classes of this exam.</td></tr>}
              {classes.map((c) => {
                const n = c.groups.reduce((a, g) => a + g.students.length, 0);
                const papers = Math.max(0, ...c.groups.map((g) => g.schedule.length));
                const warn = issues(c.groups);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: NAVY }}>{c.name}{c.groups.some((g) => g.sectionName) && <div style={{ fontWeight: 400, fontSize: 12, color: '#64748B' }}>{c.groups.map((g) => `${g.sectionName || 'No section'} (${g.students.length})`).join(' · ')}</div>}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{papers || <span style={{ color: '#B45309' }}>—</span>}</td>
                    <td style={{ fontSize: 12.5 }}>{warn.length ? <span style={{ color: '#B45309' }}>{warn.join(' · ')}</span> : <span style={{ color: '#15803D', display: 'inline-flex', gap: 4, alignItems: 'center' }}><CheckCircle2 size={13} /> Ready</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {c.groups.length > 1 && c.groups.map((g) => (
                          <button key={g.sectionId || 'none'} type="button" className="btn btn-outline btn-sm" disabled={!g.students.length || !!busy}
                            onClick={() => print({ classId: c.id, sectionId: g.sectionId || undefined, what: `${c.name}${g.sectionName ? ` — ${g.sectionName}` : ''}` })}>
                            {g.sectionName || 'No section'}
                          </button>
                        ))}
                        <button type="button" className="btn btn-teal btn-sm" style={{ background: NAVY }} disabled={!n || !!busy} onClick={() => print({ classId: c.id, what: c.name })}>
                          <Printer size={13} /> {busy === c.name ? 'Preparing…' : c.groups.length > 1 ? 'Whole class' : 'Print'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 0 }}>
        <div style={{ fontWeight: 700, color: NAVY, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}><Users size={15} /> One student's slip</div>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94A3B8' }} />
          <input className="form-input" style={{ paddingLeft: 30 }} aria-label="Find a student" placeholder="Name or roll number" value={find} onChange={(e) => setFind(e.target.value)} />
        </div>
        {found.length > 0 && (
          <div style={{ display: 'grid', gap: 4, marginTop: 8, maxWidth: 620 }}>
            {found.map(({ s, g }) => (
              <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
                <span><strong>{s.name}</strong> <span style={{ color: '#64748B' }}>· {g.className}{g.sectionName ? ` — ${g.sectionName}` : ''} · Roll no. {slipRollNo(s, design)}</span></span>
                <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => print({ classId: g.classId, sectionId: g.sectionId || undefined, studentId: s.id, what: s.name })}><Printer size={13} /> Print</button>
              </div>
            ))}
          </div>
        )}
        {q.length >= 2 && !found.length && <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 8 }}>No student of this exam matches.</div>}
      </div>
    </div>
  );
}

/* ═══ The tab ════════════════════════════════════════════════════════ */
export default function RollNoSlipsTab({ initialExamId = '' }) {
  const qc = useQueryClient();
  const terms = useTerms();
  const { data: allExams = [], isLoading: loadingExams } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then((r) => r.data.data || []) });
  const [term, setTerm] = useState('');
  const [examId, setExamId] = useState(initialExamId ? String(initialExamId) : '');
  const [step, setStep] = useState('subjects');

  // The term of the chosen exam (or of the newest one), then its exams.
  useEffect(() => {
    if (term || !allExams.length) return;
    const start = allExams.find((e) => String(e.id) === examId) || allExams[0];
    setTerm((terms.find((t) => examMatchesTerm(start, t.key)) || terms[0]).key);
  }, [allExams, term, examId, terms]);
  const exams = allExams.filter((e) => !term || examMatchesTerm(e, term));
  useEffect(() => { if (exams.length && !exams.some((e) => String(e.id) === examId)) setExamId(String(exams[0].id)); }, [exams, examId]);
  const exam = exams.find((e) => String(e.id) === examId);

  const { data: datesheet = [] } = useQuery({
    queryKey: ['datesheet', examId],
    queryFn: () => api.get(`/exams/${examId}/datesheet`).then((r) => r.data.data || []),
    enabled: !!exam,
  });
  const { data: savedDesign } = useQuery({ queryKey: ['slip-design'], queryFn: () => api.get('/exams/slip-design').then((r) => r.data.data) });
  const [draft, setDraft] = useState(null);
  useEffect(() => { if (savedDesign && !draft) setDraft(savedDesign); }, [savedDesign, draft]);
  const design = draft || savedDesign;
  const designDirty = !!(draft && savedDesign && JSON.stringify(designPayload(draft)) !== JSON.stringify(designPayload(savedDesign)));
  // The numbering on the design page (saved or not), so the summary and the
  // preview show the numbers that will print. Asked for once typing stops.
  const numberingNow = design ? { mode: design.rollNumber, start: Number(design.rollStart) || 1, prefix: design.rollPrefix || '' } : null;
  const [numbering, setNumbering] = useState(null);
  const numberingKey = JSON.stringify(numberingNow);
  useEffect(() => {
    const t = setTimeout(() => setNumbering(numberingNow), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numberingKey]);
  const { data: summary } = useQuery({
    queryKey: ['exam-slips', examId, 'summary', numbering],
    queryFn: () => api.get(`/exams/${examId}/slips`, { params: { photos: 0, ...(numbering || {}) } }).then((r) => r.data.data),
    enabled: !!exam && !!numbering,
    placeholderData: (prev) => prev,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['datesheet', examId] });
    qc.invalidateQueries({ queryKey: ['exam-slips', examId] });
    qc.invalidateQueries({ queryKey: ['exams-overview'] });
  };
  const classes = classesOf(datesheet);
  const ready = classes.filter((c) => c.papers > 0).length;
  const total = (summary?.groups || []).reduce((n, g) => n + g.students.length, 0);

  const steps = [
    { id: 'subjects', n: 1, label: 'Subjects and date sheet', Icon: BookOpen, note: classes.length ? `${ready} of ${classes.length} classes ready` : '—', ok: classes.length > 0 && ready === classes.length },
    { id: 'design', n: 2, label: 'Design the slip', Icon: Palette, note: designDirty ? 'Not saved' : 'Saved', ok: !designDirty },
    { id: 'print', n: 3, label: 'Print and download', Icon: Printer, note: `${total} slip${total === 1 ? '' : 's'}`, ok: total > 0 },
  ];

  return (
    <div>
      <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={label}>Term
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {terms.map((t) => (
              <button key={t.key} type="button" aria-pressed={term === t.key} onClick={() => { setTerm(t.key); setExamId(''); }}
                className={term === t.key ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'} style={term === t.key ? { background: NAVY } : undefined}>{t.label}</button>
            ))}
          </div>
        </div>
        <label style={{ ...label, flex: '1 1 260px' }}>Exam
          <select aria-label="Exam" className="form-select" value={examId} onChange={(e) => setExamId(e.target.value)} disabled={!exams.length}>
            {!exams.length && <option value="">{loadingExams ? 'Loading…' : 'No exam in this term yet: add one in Exam Setup'}</option>}
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </label>
      </div>

      {!exam ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><ImageIcon size={40} style={{ opacity: 0.25 }} /></div><div className="empty-state-text">Choose an exam</div><div className="empty-state-sub">Add the exam in Exam Setup first, with its classes.</div></div></div>
      ) : (
        <>
          <nav aria-label="Roll number slip steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
            {steps.map((s) => (
              <button key={s.id} type="button" aria-current={step === s.id ? 'step' : undefined} onClick={() => setStep(s.id)}
                style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: '11px 14px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${step === s.id ? NAVY : '#E2E8F0'}`, background: step === s.id ? '#EEF2FF' : '#fff' }}>
                <span style={{ width: 30, height: 30, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', background: s.ok ? '#16A34A' : NAVY }}>{s.ok ? <CheckCircle2 size={16} /> : s.n}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, color: '#1E293B', fontSize: 13.5 }}><s.Icon size={14} /> {s.label}</span>
                  <span style={{ fontSize: 12, color: s.ok ? '#15803D' : '#B45309' }}>{s.note}</span>
                </span>
              </button>
            ))}
          </nav>

          {step === 'subjects' && <SubjectsStep examId={examId} exam={exam} datesheet={datesheet} onSaved={refresh} />}
          {step === 'design' && design && <DesignStep examId={examId} summary={summary} draft={design} setDraft={(f) => setDraft((d) => (typeof f === 'function' ? f(d || savedDesign) : f))} saved={savedDesign} onSaved={(d) => { setDraft(d); qc.invalidateQueries({ queryKey: ['exam-slips', examId] }); }} onNumbersChanged={() => qc.invalidateQueries({ queryKey: ['exam-slips', examId] })} numbering={numbering} />}
          {step === 'print' && design && <PrintStep examId={examId} exam={exam} summary={summary} design={design} designDirty={designDirty} onDesign={() => setStep('design')} onNumbersChanged={() => qc.invalidateQueries({ queryKey: ['exam-slips', examId] })} />}
        </>
      )}
    </div>
  );
}
