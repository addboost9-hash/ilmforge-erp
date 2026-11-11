/**
 * IlmForge — the Exam Vault: an exam from start to finish.
 * Exam Setup | Date Sheet | Syllabus | Roll No. Slips | Question Papers |
 * Marks Entry | Results
 * URL: /examination?tab=
 */
import { useState, useRef, useCallback } from 'react';
import { signatureFromFile } from '../../utils/signatureImage';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { printHTML } from '../../utils/print';
import { buildTerms, examMatchesTerm } from '../../utils/terms';
import QuestionPapersTab from './QuestionPapersTab';
import RollNoSlipsTab from './RollNoSlipsTab';
import ClassPapersEditor from './ClassPapersEditor';
import { MarksEntryTab, ResultsOverviewTab } from './ExamFlowTabs';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, X,
  Save, Check, Edit3, Award, FileText, User, Upload,
} from 'lucide-react';

const NAVY = '#1B2F6E';
const BLUE = '#0073b7';
// Legacy alias — all teal references now use navy
const TEAL = NAVY;

/* ─────────────────────── SHARED STYLES ─────────────────────── */
// IlmForge underline tab style (professional, unique)
const tabBtnStyle = (active) => ({
  padding: '10px 20px',
  border: 'none',
  borderBottom: active ? `3px solid ${NAVY}` : '3px solid transparent',
  background: 'none',
  color: active ? NAVY : '#64748b',
  fontWeight: active ? 700 : 500,
  fontSize: 14,
  cursor: 'pointer',
  transition: 'all 0.15s',
});

const termBtnStyle = (active) => ({
  padding: '7px 18px',
  fontWeight: 700,
  fontSize: 13,
  borderRadius: 6,
  border: `1.5px solid ${NAVY}`,
  background: active ? NAVY : 'transparent',
  color: active ? '#fff' : NAVY,
  cursor: 'pointer',
  transition: 'all .15s',
  marginRight: 6,
});

/* ─────────────────────── CLASS MULTI-SELECT ─────────────────────── */
function ClassMultiSelect({ classes = [], selectedClasses, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) &&
    !selectedClasses.find(s => s.classId === c.id)
  );

  const addClass = (cls) => {
    onChange([...selectedClasses, { classId: cls.id, className: cls.name }]);
    setSearch('');
  };

  const removeClass = (classId) => {
    onChange(selectedClasses.filter(s => s.classId !== classId));
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: 38, border: '1px solid #D1D5DB', borderRadius: 6,
          padding: '4px 8px', cursor: 'pointer', display: 'flex',
          flexWrap: 'wrap', gap: 4, alignItems: 'center', background: '#fff',
        }}
      >
        {selectedClasses.length === 0 && (
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>Select classes...</span>
        )}
        {selectedClasses.map(sc => (
          <span key={sc.classId} style={{
            background: '#dbeafe', color: '#0073b7', borderRadius: 99,
            padding: '2px 8px', fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {sc.className}
            <button
              onMouseDown={e => { e.stopPropagation(); removeClass(sc.classId); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0073b7', padding: 0, fontSize: 13, lineHeight: 1 }}
            >×</button>
          </span>
        ))}
        <ChevronDown size={14} style={{ marginLeft: 'auto', color: '#6B7280' }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search class..."
              style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 5, padding: '5px 10px', fontSize: 13, boxSizing: 'border-box' }}
              onMouseDown={e => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: 13 }}>
                {classes.length === 0 ? 'No classes available' : 'All classes selected'}
              </div>
            )}
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => addClass(c)}
                style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#111827', borderBottom: '1px solid #F9FAFB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {c.name}
              </div>
            ))}
          </div>
          <div style={{ padding: '6px 10px', borderTop: '1px solid #F3F4F6', textAlign: 'right' }}>
            <button onClick={() => setOpen(false)} style={{ fontSize: 12, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── EXAM MODAL ─────────────────────── */
function ExamModal({ classes = [], initial = null, onClose, onSubmit, isSubmitting }) {
  const terms = useTerms();
  const [form, setForm] = useState(() => {
    if (!initial) return { title: '', term: '1st', selectedClasses: [], dateStart: '', dateEnd: '' };
    let selectedClasses = [];
    try { selectedClasses = initial.classIds ? JSON.parse(initial.classIds) : []; } catch { selectedClasses = []; }
    if (selectedClasses.length === 0 && initial.classId) {
      const cls = classes.find(c => c.id === initial.classId);
      if (cls) selectedClasses = [{ classId: cls.id, className: cls.name }];
    }
    return {
      title: initial.title || '',
      term: initial.term || '1st',
      selectedClasses,
      dateStart: initial.dateStart ? initial.dateStart.slice(0, 10) : '',
      dateEnd: initial.dateEnd ? initial.dateEnd.slice(0, 10) : '',
    };
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error('Exam name is required');
    onSubmit({
      title: form.title.trim(),
      term: form.term,
      // Terms 1 and 2 keep their historic type values so older exams and
      // reports still match; later terms use a predictable term_N form.
      type: (terms.find(t => t.key === form.term) || {}).type || 'first_term',
      classId: form.selectedClasses[0]?.classId || null,
      classIds: JSON.stringify(form.selectedClasses),
      dateStart: form.dateStart || null,
      dateEnd: form.dateEnd || null,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 580, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: NAVY }}>{initial ? 'Edit Exam' : 'Add Exam'}</h2>
          <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Select Classes</label>
            <ClassMultiSelect classes={classes} selectedClasses={form.selectedClasses} onChange={sc => setForm(f => ({ ...f, selectedClasses: sc }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Exam Name *</label>
            <input
              className="form-input"
              placeholder="e.g. 1st Term Exam 2025"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Term</label>
            <select className="form-select" aria-label="Term" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
              {terms.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>From</label>
            <input className="form-input" type="date" value={form.dateStart} onChange={e => setForm(f => ({ ...f, dateStart: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>To</label>
          <input className="form-input" type="date" value={form.dateEnd} onChange={e => setForm(f => ({ ...f, dateEnd: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-teal" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 1: EXAM SETUP
══════════════════════════════════════════════════ */
/* The exam list as a Word document (an HTML table Word opens). */
function exportExamsWord(exams, termLabel, schoolName) {
  const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const rows = exams.map((e, i) => {
    let cls = [];
    try { cls = JSON.parse(e.classIds || '[]'); } catch { cls = []; }
    return `<tr><td>${i + 1}</td><td>${esc(e.title)}</td><td>${esc(cls.map((c) => c.className || c).join(', ') || 'All classes')}</td><td>${day(e.dateStart)}</td><td>${day(e.dateEnd)}</td></tr>`;
  }).join('');
  const html = `<html><head><meta charset="utf-8"><title>Exams</title></head><body style="font-family:Arial">
<h2>${esc(schoolName || localStorage.getItem('schoolName') || 'School')}</h2><h3>${esc(termLabel)} — Exams</h3>
<table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>#</th><th>Exam</th><th>Classes</th><th>From</th><th>To</th></tr>${rows}</table></body></html>`;
  const url = URL.createObjectURL(new Blob(['\ufeff', html], { type: 'application/msword' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${termLabel.replace(/[^a-z0-9]+/gi, '-')}-exams.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* The term's exams as a page to print or save as PDF. */
function exportExamsPDF(exams, termLabel, school) {
  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const name = school?.name || localStorage.getItem('schoolName') || 'School';
  const logo = school?.logoUrl || localStorage.getItem('schoolLogoPreview') || '';
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const rows = exams.map((e, i) => {
    let cls = [];
    try { cls = JSON.parse(e.classIds || '[]'); } catch { cls = []; }
    return `<tr><td>${i + 1}</td><td><b>${esc(e.title)}</b></td><td>${esc(cls.map((c) => c.className || c).join(', ') || 'All classes')}</td><td>${day(e.dateStart)}</td><td>${day(e.dateEnd)}</td><td>${e.isPublished ? 'Published' : '—'}</td></tr>`;
  }).join('');
  if (!rows) { toast.error(`No exams in the ${termLabel} yet.`); return; }
  printHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(termLabel)} — Exams</title><style>
    body{font-family:Arial,sans-serif;margin:0;padding:12mm;color:#000;font-size:12px}
    .head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #000;padding-bottom:8px}.head img{width:56px;height:56px;object-fit:contain}
    .sch{font-size:19px;font-weight:800}.sub{font-size:13px;margin-top:2px;color:#333}
    h2{font-size:15px;margin:14px 0 8px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:6px 8px;text-align:left}th{background:#eee}
    .foot{display:flex;justify-content:space-between;margin-top:14px;font-size:10.5px;color:#555}
  </style></head><body>
  <div class="head">${logo ? `<img src="${esc(logo)}" alt=""/>` : ''}<div><div class="sch">${esc(name)}</div><div class="sub">${esc([school?.address, school?.phone && `Phone ${school.phone}`].filter(Boolean).join(' · '))}</div></div></div>
  <h2>Examinations — ${esc(termLabel)}</h2>
  <table><thead><tr><th>#</th><th>Exam</th><th>Classes</th><th>From</th><th>To</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="foot"><span>Printed ${day(new Date())}</span><span>${esc(name)}</span></div>
  </body></html>`, { title: `${termLabel} — Exams` });
}

/* How far an exam has got: date sheets, marks, published. */
function ExamProgress({ p }) {
  if (!p) return <span style={{ color: '#CBD5E1' }}>…</span>;
  const bar = (pct, color) => (
    <span style={{ display: 'inline-block', width: 60, height: 6, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden', verticalAlign: 'middle', marginRight: 6 }}>
      <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: color }} />
    </span>
  );
  const sheetPct = p.sheetsTotal ? Math.round((p.sheetsPlanned / p.sheetsTotal) * 100) : 0;
  return (
    <div style={{ display: 'grid', gap: 3, fontSize: 11.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
      <span title="Class-sections with a date sheet">{bar(sheetPct, sheetPct === 100 ? '#16A34A' : '#F59E0B')}Date sheet {p.sheetsPlanned}/{p.sheetsTotal}</span>
      <span title="Marks entered of all expected">{bar(p.marksPercent, p.marksPercent === 100 ? '#16A34A' : '#0073b7')}Marks {p.marksPercent}%</span>
      <span style={{ fontWeight: 700, color: p.isPublished ? '#15803D' : '#94A3B8' }}>{p.isPublished ? 'Result published' : 'Not published'}</span>
    </div>
  );
}

/* How many exam terms this school runs. Two by default, up to six, set in
   School Settings -> Exam Settings. Cached, because all four tabs ask for it. */
function useTerms() {
  const { data } = useQuery({
    queryKey: ['exam-settings'],
    queryFn: () => api.get('/settings/exam').then(r => r.data.data).catch(() => null),
    staleTime: 300_000,
  });
  return buildTerms(data?.termsCount ?? 2);
}

function ExamSetupTab({ onGo }) {
  const qc = useQueryClient();
  const [activeTerm, setActiveTerm] = useState('1st');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: allExams = [], isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then(r => r.data.data || []) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const terms = useTerms();
  const filteredExams = allExams.filter(e => examMatchesTerm(e, activeTerm));
  const { data: overview = [] } = useQuery({
    queryKey: ['exams-overview'],
    queryFn: () => api.get('/exams/overview').then(r => r.data.data || []).catch(() => []),
  });
  const progressOf = (id) => overview.find(o => o.examId === id);

  const exams = filteredExams;

  const refresh = () => { qc.invalidateQueries({ queryKey: ['exams'] }); qc.invalidateQueries({ queryKey: ['exams-overview'] }); };
  const add = useMutation({
    mutationFn: d => api.post('/exams', d),
    onSuccess: () => { toast.success('Exam added. Next: its date sheet.'); refresh(); setShowAddModal(false); },
    onError: err => toast.error(err.response?.data?.message || 'Could not add the exam.'),
  });

  const editMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/exams/${id}`, d),
    onSuccess: () => { toast.success('Exam saved.'); refresh(); setEditExam(null); },
    onError: err => toast.error(err.response?.data?.message || 'Could not save the exam.'),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/exams/${id}`),
    onSuccess: () => { toast.success('Exam deleted.'); refresh(); },
    onError: err => toast.error(err.response?.data?.message || 'Could not delete the exam.'),
  });

  const getClasses = (exam) => {
    try { const arr = exam.classIds ? JSON.parse(exam.classIds) : []; if (arr.length > 0) return arr; } catch { /* ignore */ }
    if (exam.classId) { const cls = classes.find(c => c.id === exam.classId); if (cls) return [{ classId: cls.id, className: cls.name }]; }
    return [];
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK') : '—';

  return (
    <div>
      {/* Term toggle + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {terms.map(t => (
            <button key={t.key} style={termBtnStyle(activeTerm === t.key)} onClick={() => setActiveTerm(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportExamsPDF(filteredExams, (terms.find(t => t.key === activeTerm) || {}).label || activeTerm, school)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>PDF</button>
          <button onClick={() => exportExamsWord(filteredExams, (terms.find(t => t.key === activeTerm) || {}).label || activeTerm, school?.name)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Word</button>
        </div>
      </div>

      {/* Add button */}
      <div style={{ marginBottom: 14, textAlign: 'center' }}>
        <button
          style={{ border: `1.5px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 7, padding: '8px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={14} /> Add Exam
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div> : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>S.No.</th>
                  <th>Exam Name</th>
                  <th>Classes · dates</th>
                  <th style={{ minWidth: 190 }}>Progress</th>
                  <th>Steps</th>
                  <th style={{ width: 70 }}>Edit</th>
                  <th style={{ width: 60 }}>Delete</th>
                  <th style={{ width: 70 }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e, idx) => {
                  const isExpanded = expandedRow === e.id;
                  const examClasses = getClasses(e);
                  return (
                    <React.Fragment key={e.id}>
                      <tr style={{ background: isExpanded ? '#eff6ff' : undefined }}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{e.title}{e.isPublished && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: '#166534', background: '#DCFCE7', borderRadius: 99, padding: '1px 7px' }}>Published</span>}</td>
                        <td style={{ fontSize: 12, color: '#475569' }}>
                          {examClasses.length ? examClasses.map(sc => sc.className).join(', ') : 'All classes'}
                          <div style={{ color: '#94A3B8' }}>{fmtDate(e.dateStart)} – {fmtDate(e.dateEnd)}</div>
                        </td>
                        <td><ExamProgress p={progressOf(e.id)} /></td>
                        <td>
                          {/* Each step of this exam, in order. */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="btn btn-outline btn-sm" style={{ fontSize: 11.5 }} onClick={() => onGo?.('date-sheet', e.id)}>Date sheet</button>
                            <button className="btn btn-outline btn-sm" style={{ fontSize: 11.5 }} onClick={() => onGo?.('roll-slips', e.id)}>Roll no. slips</button>
                            <button className="btn btn-outline btn-sm" style={{ fontSize: 11.5 }} onClick={() => onGo?.('question-papers', e.id)}>Papers</button>
                            <button className="btn btn-teal btn-sm" style={{ fontSize: 11.5 }} onClick={() => onGo?.('marks', e.id)}>Marks</button>
                            <button className="btn btn-outline btn-sm" style={{ fontSize: 11.5 }} onClick={() => onGo?.('results', e.id)}>Results</button>
                          </div>
                        </td>
                        <td>
                          <button
                            style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setEditExam(e)}
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        </td>
                        <td>
                          <button aria-label="Delete"
                            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => { if (window.confirm('Delete this exam?')) del.mutate(e.id); }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                        <td>
                          <button aria-label="Show more"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setExpandedRow(isExpanded ? null : e.id)}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: '#eff6ff' }}>
                          <td colSpan={8} style={{ padding: '14px 20px' }}>
                            <div style={{ border: '1px solid #dbeafe', borderRadius: 8, padding: '14px 18px', background: '#fff' }}>
                              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: '#374151', fontSize: 13, alignItems: 'center' }}>
                                <span><strong>Exam Name:</strong> {e.title}</span>
                                <span>
                                  <strong>Classes:</strong>{' '}
                                  {examClasses.length > 0
                                    ? examClasses.map(sc => (
                                      <span key={sc.classId} style={{ background: '#dbeafe', color: '#0073b7', borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 600, marginRight: 4 }}>{sc.className}</span>
                                    ))
                                    : <span style={{ color: '#9CA3AF' }}>All Classes</span>
                                  }
                                </span>
                                <span><strong>From:</strong> {fmtDate(e.dateStart)}</span>
                                <span><strong>To:</strong> {fmtDate(e.dateEnd)}</span>
                                <Link
                                  to={`/exams/${e.id}/marks`}
                                  style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#059669,#10B981)', color: 'white', textDecoration: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                >
                                  ✏️ Enter Marks
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {exams.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📝</div>
                      <div className="empty-state-text">No exams for the {(terms.find(t => t.key === activeTerm) || {}).label || activeTerm}</div>
                      <div className="empty-state-sub">Click "+ Add Exam" to create one</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <ExamModal classes={classes} onClose={() => setShowAddModal(false)} onSubmit={d => add.mutate(d)} isSubmitting={add.isPending} />
      )}
      {editExam && (
        <ExamModal classes={classes} initial={editExam} onClose={() => setEditExam(null)} onSubmit={d => editMut.mutate({ id: editExam.id, ...d })} isSubmitting={editMut.isPending} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 2: DATE SHEET
══════════════════════════════════════════════════ */
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* A date sheet as a page to print (one class-section, or every one). */
function printDateSheets(rows, examTitle, school) {
  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const sheets = rows.filter((r) => r.entries.length).map((r) => `
    <div class="sheet">
      <div class="head">${school?.logoUrl ? `<img src="${esc(school.logoUrl)}" alt=""/>` : ''}<div><div class="sch">${esc(school?.name || localStorage.getItem('schoolName') || 'School')}</div><div class="sub">${esc(examTitle)} — Date Sheet</div></div></div>
      <div class="cls">Class: <b>${esc(r.className)}${r.sectionName ? ` — ${esc(r.sectionName)}` : ''}</b></div>
      <table><tr><th>#</th><th>Date</th><th>Subject</th><th>Time</th>${r.entries.some((e) => e.room) ? '<th>Room</th>' : ''}</tr>
      ${[...r.entries].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((e, i) => `<tr><td>${i + 1}</td><td>${day(e.date)}</td><td dir="auto">${esc(e.subject)}</td><td>${esc([fmt12(e.timeFrom), fmt12(e.timeTo)].filter(Boolean).join(' – ') || '—')}</td>${r.entries.some((x) => x.room) ? `<td>${esc(e.room || '—')}</td>` : ''}</tr>`).join('')}
      </table>
    </div>`).join('');
  if (!sheets) return toast.error('No papers are scheduled yet. Use Edit to add the subjects and dates.');
  printHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(examTitle)} — Date Sheet</title><style>
    body{font-family:Arial,sans-serif;margin:0;padding:10mm;color:#000}
    .sheet{page-break-after:always;margin-bottom:10mm}.sheet:last-child{page-break-after:auto}
    .head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #000;padding-bottom:8px}.head img{width:56px;height:56px;object-fit:contain}
    .sch{font-size:19px;font-weight:800}.sub{font-size:14px;font-weight:600;margin-top:2px}
    .cls{margin:10px 0;font-size:14px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:7px 9px;font-size:13px;text-align:left}th{background:#eee}
  </style></head><body>${sheets}</body></html>`, { title: `${examTitle} — Date Sheet` });
}

function DateSheetTab({ initialExamId = '' }) {
  const queryClient = useQueryClient();
  const [activeTerm, setActiveTerm] = useState('');
  const [examId, setExamId] = useState(initialExamId ? String(initialExamId) : '');
  const [editRow, setEditRow] = useState(null);

  const { data: allExams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then(r => r.data.data || []) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const terms = useTerms();
  // Open on the term of the exam it was opened for (or of the newest exam).
  React.useEffect(() => {
    if (activeTerm || !allExams.length) return;
    const start = allExams.find(e => String(e.id) === examId) || allExams[0];
    setActiveTerm((terms.find(t => examMatchesTerm(start, t.key)) || terms[0]).key);
  }, [allExams, activeTerm, examId, terms]);
  const exams = allExams.filter(e => examMatchesTerm(e, activeTerm || '1st'));
  // The newest exam of the term is the one being planned.
  React.useEffect(() => { if (!examId && exams.length) setExamId(String(exams[0].id)); }, [exams, examId]);

  const selectedExam = exams.find(ex => String(ex.id) === String(examId));

  const { data: datesheet = [], isLoading } = useQuery({
    queryKey: ['datesheet', examId],
    queryFn: () => api.get(`/exams/${examId}/datesheet`).then(r => r.data.data),
    enabled: !!examId,
  });

  const clearRow = async (row) => {
    if (!row.entries.length) return;
    if (!window.confirm(`Remove all ${row.entries.length} scheduled paper(s) of ${row.className}${row.sectionName ? ' — ' + row.sectionName : ''}?`)) return;
    try {
      for (const e of row.entries) await api.delete(`/exams/datesheet/${e.id}`);
      toast.success('Date sheet cleared.');
      queryClient.invalidateQueries({ queryKey: ['datesheet', examId] });
    } catch (err) { toast.error(err.response?.data?.message || 'Could not clear it.'); }
  };
  const range = (row) => {
    const ds = row.entries.map(e => e.date).filter(Boolean).sort();
    if (!ds.length) return '';
    const f = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return ds.length > 1 ? `${f(ds[0])} – ${f(ds[ds.length - 1])}` : f(ds[0]);
  };

  return (
    <div>
      {/* Term toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          {terms.map(t => (
            <button key={t.key} style={termBtnStyle(activeTerm === t.key)}
              onClick={() => { setActiveTerm(t.key); setExamId(''); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!examId} onClick={() => printDateSheets(datesheet, selectedExam?.title || 'Exam', school)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Print all date sheets</button>
        </div>
      </div>

      {/* Exam selector */}
      <div style={{ marginBottom: 16 }}>
        <select
          aria-label="Date sheet exam"
          value={examId}
          onChange={e => setExamId(e.target.value)}
          style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 7, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' }}
        >
          <option value="">— Select Exam —</option>
          {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
        </select>
      </div>

      {!examId && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: 16, marginBottom: 6 }}>Select an Exam</div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>{exams.length ? 'Choose an exam to plan its date sheet.' : 'No exam for this term yet: add it in Exam Setup.'}</div>
        </div>
      )}

      {isLoading && examId && <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Loading…</div>}

      {!isLoading && examId && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>S.No.</th>
                <th>Class Name</th>
                <th>Section Name</th>
                <th>Papers scheduled</th>
                <th style={{ width: 280, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datesheet.length === 0 && (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">No classes found</div>
                  </div>
                </td></tr>
              )}
              {datesheet.map((row, idx) => (
                <tr key={`${row.classId}_${row.sectionId}`}>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: NAVY }}>{row.className}</td>
                  <td>{row.sectionName || '—'}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {row.entries.length
                      ? <><strong>{row.entries.length}</strong> <span style={{ color: '#64748B' }}>· {range(row)}</span></>
                      : <span style={{ color: '#B45309' }}>Not planned yet</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setEditRow(row)} aria-label={`Edit date sheet of ${row.className} ${row.sectionName || ''}`} style={{ border: `1px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => printDateSheets([row], selectedExam?.title || 'Exam', school)} disabled={!row.entries.length} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', opacity: row.entries.length ? 1 : 0.5 }}>Print</button>
                      <button aria-label={`Clear date sheet of ${row.className} ${row.sectionName || ''}`} onClick={() => clearRow(row)} disabled={!row.entries.length} style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer', opacity: row.entries.length ? 1 : 0.5 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editRow && (
        <DateSheetEditModal
          examId={examId}
          exam={selectedExam}
          datesheet={datesheet}
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ['datesheet', examId] }); queryClient.invalidateQueries({ queryKey: ['exam-slips', examId] }); queryClient.invalidateQueries({ queryKey: ['exams-overview'] }); }}
        />
      )}
    </div>
  );
}

/* A class's papers, edited in a window over the date sheet list. */
function DateSheetEditModal({ examId, exam, datesheet, row, onClose, onSaved }) {
  const [dirty, setDirty] = useState(false);
  const rows = datesheet.filter(r => r.classId === row.classId);
  const cls = { id: row.classId, name: row.className, sections: rows.filter(r => r.sectionId).map(r => ({ id: r.sectionId, name: r.sectionName })) };
  const entriesOf = useCallback((sid) => rows.find(r => (r.sectionId || null) === (sid || null))?.entries || [], [rows]);
  const close = () => { if (!dirty || window.confirm('Your changes to these papers are not saved. Close anyway?')) onClose(); };
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div role="dialog" aria-modal="true" aria-label={`Date sheet of ${row.className}`} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 920, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: NAVY, color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Date sheet — {row.className}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{exam?.title || ''} · these papers are also printed on the roll number slips</div>
          </div>
          <button type="button" aria-label="Close" onClick={close} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          <ClassPapersEditor examId={examId} exam={exam} cls={cls} entriesOf={entriesOf} startSection={row.sectionId} onSaved={onSaved} onDirtyChange={setDirty} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 3: SYLLABUS
══════════════════════════════════════════════════ */
/* A class's syllabus, every subject, as a page to print. Editor HTML is
   cleaned of scripts and event attributes first. */
function printSyllabus(cls, subjects, syllabi, school) {
  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clean = (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, '');
  const parts = subjects.map((s) => {
    const doc = syllabi.find((x) => String(x.subjectId) === String(s.id));
    const html = (doc?.units || []).map((u) => clean(u.content || '')).join('');
    return html ? `<div class="sub"><h3 dir="auto">${esc(s.name)}</h3><div dir="auto">${html}</div></div>` : '';
  }).join('');
  if (!parts) return toast.error('No syllabus has been written for this class yet.');
  printHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(cls.name)} — Syllabus</title><style>
    body{font-family:Arial,sans-serif;margin:0;padding:10mm;color:#000}
    .head{border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}.sch{font-size:19px;font-weight:800}
    .sub{margin:12px 0;page-break-inside:avoid}h3{background:#eee;border:1px solid #000;padding:5px 9px;font-size:14px}
  </style></head><body><div class="head"><div class="sch">${esc(school?.name || localStorage.getItem('schoolName') || 'School')}</div><div>Syllabus — ${esc(cls.name)}</div></div>${parts}</body></html>`, { title: `${cls.name} — Syllabus` });
}

function SyllabusTab() {
  const navigate = useNavigate();
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: allSubjects = [] } = useQuery({ queryKey: ['subjects-all'], queryFn: () => api.get('/classes/subjects').then(r => r.data.data || []).catch(() => []) });
  const { data: syllabi = [] } = useQuery({ queryKey: ['syllabi-all'], queryFn: () => api.get('/syllabus').then(r => r.data.data || []).catch(() => []) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const written = (classId) => {
    const subs = allSubjects.filter(s => s.classId === classId);
    const done = subs.filter(s => syllabi.some(x => String(x.classId) === String(classId) && String(x.subjectId) === String(s.id) && (x.units || []).some(u => String(u.content || '').replace(/<[^>]*>/g, '').trim())));
    return { subs, done };
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
        The syllabus is written once for each class, subject by subject, and printed for parents and students before the exam.
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>S.No.</th>
              <th>Class</th>
              <th>Subjects with a syllabus</th>
              <th style={{ width: 220, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 && (
              <tr><td colSpan={4}>
                <div className="empty-state">
                  <div className="empty-state-icon">📚</div>
                  <div className="empty-state-text">No classes configured</div>
                  <div className="empty-state-sub">Add classes and sections in Settings first</div>
                </div>
              </td></tr>
            )}
            {classes.map((cls, idx) => {
              const { subs, done } = written(cls.id);
              return (
                <tr key={cls.id}>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: NAVY }}>{cls.name}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {subs.length
                      ? <><strong>{done.length}</strong> of {subs.length}{done.length < subs.length && <span style={{ color: '#B45309' }}> · missing: {subs.filter(s => !done.includes(s)).map(s => s.name).join(', ')}</span>}</>
                      : <span style={{ color: '#B45309' }}>No subjects — add them in Settings → Subjects</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        aria-label={`Edit syllabus of ${cls.name}`}
                        style={{ border: `1px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => navigate(`/academics/subject-syllabus/${cls.id}/${cls.sections?.[0]?.id || 0}`)}
                      >
                        <Pencil size={11} /> Write / edit
                      </button>
                      <button disabled={!done.length} onClick={() => printSyllabus(cls, subs, syllabi.filter(x => String(x.classId) === String(cls.id)), school)}
                        style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', opacity: done.length ? 1 : 0.5 }}>Print</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 5: RESULTS
══════════════════════════════════════════════════ */
const DEFAULT_CONFIG = {
  grades: [
    { grade: 'A+', minPercent: 90, comment: 'Outstanding Performance.' },
    { grade: 'A',  minPercent: 80, comment: 'Remarkable Performance' },
    { grade: 'B',  minPercent: 70, comment: 'Great Effort. Keep it up!' },
    { grade: 'C',  minPercent: 60, comment: 'Need more Effort!' },
    { grade: 'D',  minPercent: 50, comment: 'Kindly Put More Effort!!' },
    { grade: 'F',  minPercent: 0,  comment: 'Fail' },
  ],
  signatures: [{ name: 'Principal', designation: 'Principal', signatureUrl: '' }],
  finalRemarks: [
    { minPercent: 90, maxPercent: 100, remark: 'Excellent work! Outstanding performance. Keep it up!' },
    { minPercent: 80, maxPercent: 89,  remark: 'Very good! Great effort and strong results. Well done!' },
    { minPercent: 70, maxPercent: 79,  remark: 'Good work! Solid performance. Keep pushing forward!' },
    { minPercent: 60, maxPercent: 69,  remark: 'Average performance. More effort needed to improve!' },
    { minPercent: 50, maxPercent: 59,  remark: 'Below average. Please study harder and seek help!' },
    { minPercent: 0,  maxPercent: 49,  remark: 'Unsatisfactory. Urgent improvement needed. Do not give up!' },
  ],
  cardOptions: { includeComments: true, includeFinalRemarks: true, includeOverallGrade: true, includeOverallPercent: true, includeSectionRanking: true },
  signatureOptions: { principal: true },
};

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ width: 42, height: 24, borderRadius: 12, background: checked ? TEAL : '#CBD5E1', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.22s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.22)', transition: 'left 0.22s' }} />
    </button>
  );
}

function ResultsTab() {
  const qc = useQueryClient();
  const [setupTab, setSetupTab] = useState('setup'); // setup | options
  const sigInput = useRef(null);
  const [sigFor, setSigFor] = useState(null);
  const pickSignature = (idx) => { setSigFor(idx); sigInput.current?.click(); };
  const onSignatureFile = async (file) => {
    if (!file || sigFor === null) return;
    try {
      const url = await signatureFromFile(file);
      handleChange({ signatures: config.signatures.map((s, i) => (i === sigFor ? { ...s, signatureUrl: url } : s)) });
    } catch (e) { toast.error(e.message); }
  };

  const { data: serverConfig, isLoading } = useQuery({
    queryKey: ['result-config'],
    queryFn: async () => { const { data } = await api.get('/exams/result-config'); return data?.data ?? DEFAULT_CONFIG; },
    placeholderData: DEFAULT_CONFIG,
  });

  const [localConfig, setLocalConfig] = useState(null);
  const config = localConfig ?? serverConfig ?? DEFAULT_CONFIG;

  const handleChange = useCallback((patch) => {
    setLocalConfig(prev => ({ ...(prev ?? serverConfig ?? DEFAULT_CONFIG), ...patch }));
  }, [serverConfig]);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/exams/result-config', payload),
    onSuccess: (res) => {
      qc.setQueryData(['result-config'], res.data?.data);
      setLocalConfig(null);
      // This only saves how result cards look; it used to announce
      // "Results published! SMS sent to parents." when nothing was sent.
      toast.success('Result settings saved.');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save'),
  });

  const gradeColor = (g) => {
    const map = { 'A+': '#15803D', A: '#1B2F6E', B: '#2563EB', C: '#D97706', D: '#EA580C', F: '#DC2626' };
    return map[g] || '#6366F1';
  };

  const [editingGradeIdx, setEditingGradeIdx] = useState(null);
  const [editingGrade, setEditingGrade] = useState({});

  const GENERAL_OPTIONS = [
    { key: 'includeComments', label: 'Include Comments' },
    { key: 'includeFinalRemarks', label: 'Include Final Remarks' },
    { key: 'includeOverallGrade', label: 'Include Overall Grade' },
    { key: 'includeOverallPercent', label: 'Include Overall Percentage' },
    { key: 'includeSectionRanking', label: 'Include Section Ranking' },
  ];

  return (
    <div>
      <input ref={sigInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { onSignatureFile(e.target.files?.[0]); e.target.value = ''; }} />
      {(
        <div>
          {/* Setup sub-tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', marginBottom: 20 }}>
            {[{ id: 'setup', label: 'Result Setup' }, { id: 'options', label: 'Result Card Options' }].map(t => (
              <button key={t.id} onClick={() => setSetupTab(t.id)}
                style={{ padding: '10px 22px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: setupTab === t.id ? 700 : 500, color: setupTab === t.id ? TEAL : '#64748B', borderBottom: setupTab === t.id ? `2.5px solid ${TEAL}` : '2.5px solid transparent', marginBottom: -2, fontFamily: 'inherit' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Result Setup sub-tab */}
          {setupTab === 'setup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Grades */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={16} color={TEAL} />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Grade Configuration</h3>
                  </div>
                  <button onClick={() => handleChange({ grades: [...config.grades, { grade: 'NEW', minPercent: 0, comment: '' }] })}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${TEAL}`, background: 'transparent', color: TEAL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    <Plus size={13} /> Add Grade
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9' }}>
                        {['Sr.no', 'Grade', 'Percentage', 'Comment', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {config.grades.map((g, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                          <td style={{ padding: '8px 12px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                          {editingGradeIdx === idx ? (
                            <>
                              <td style={{ padding: '6px 8px' }}>
                                <input value={editingGrade.grade} onChange={e => setEditingGrade(p => ({ ...p, grade: e.target.value }))} className="form-input" style={{ width: 60, padding: '4px 8px', fontSize: 13 }} />
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                <input type="number" min="0" max="100" value={editingGrade.minPercent} onChange={e => setEditingGrade(p => ({ ...p, minPercent: e.target.value }))} className="form-input" style={{ width: 70, padding: '4px 8px', fontSize: 13 }} />
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                <input value={editingGrade.comment} onChange={e => setEditingGrade(p => ({ ...p, comment: e.target.value }))} className="form-input" style={{ width: '100%', minWidth: 180, padding: '4px 8px', fontSize: 13 }} />
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => { handleChange({ grades: config.grades.map((x, i) => i === idx ? { ...editingGrade, minPercent: Number(editingGrade.minPercent) } : x) }); setEditingGradeIdx(null); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${TEAL}`, background: 'transparent', cursor: 'pointer', color: TEAL }}>
                                    <Check size={13} />
                                  </button>
                                  <button aria-label="Close" onClick={() => setEditingGradeIdx(null)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1.5px solid #EF4444', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ fontWeight: 700, color: gradeColor(g.grade), fontSize: 14, background: gradeColor(g.grade) + '15', padding: '2px 10px', borderRadius: 99 }}>{g.grade}</span>
                              </td>
                              <td style={{ padding: '8px 12px', color: '#374151' }}>
                                {g.minPercent === 0 && g.grade === 'F' ? '< 50' : `≥ ${g.minPercent}`}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#64748B' }}>{g.comment}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => { setEditingGradeIdx(idx); setEditingGrade({ ...g }); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1.5px solid #0073b7', background: 'transparent', cursor: 'pointer', color: '#0073b7' }}>
                                    <Edit3 size={12} />
                                  </button>
                                  <button aria-label="Delete" onClick={() => handleChange({ grades: config.grades.filter((_, i) => i !== idx) })}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1.5px solid #EF4444', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <User size={16} color={TEAL} />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Signature</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9' }}>
                      {['Sr.no', 'Name', 'Designation', 'Signature', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.signatures.map((sig, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 12px', color: '#94A3B8' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <input value={sig.name} onChange={e => handleChange({ signatures: config.signatures.map((s, i) => i === idx ? { ...s, name: e.target.value } : s) })} className="form-input" style={{ width: '100%', padding: '4px 8px', fontSize: 13 }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input value={sig.designation} onChange={e => handleChange({ signatures: config.signatures.map((s, i) => i === idx ? { ...s, designation: e.target.value } : s) })} className="form-input" style={{ width: '100%', padding: '4px 8px', fontSize: 13 }} />
                        </td>
                        <td style={{ padding: '8px 12px', color: '#94A3B8', fontSize: 12 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {sig.signatureUrl ? <img src={sig.signatureUrl} alt={`Signature of ${sig.name || 'signatory'}`} style={{ height: 40, maxWidth: 140, objectFit: 'contain' }} /> : <em>Signed by hand</em>}
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => pickSignature(idx)}><Upload size={12} /> {sig.signatureUrl ? 'Change' : 'Add picture'}</button>
                            {sig.signatureUrl && <button type="button" className="btn btn-outline btn-sm" aria-label="Remove the signature picture" onClick={() => handleChange({ signatures: config.signatures.map((s, i) => (i === idx ? { ...s, signatureUrl: '' } : s)) })}><X size={12} /></button>}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <button type="button" aria-label={`Remove ${sig.name || 'signatory'}`} disabled={config.signatures.length <= 1}
                            onClick={() => handleChange({ signatures: config.signatures.filter((_, i) => i !== idx) })}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1.5px solid #EF4444', background: 'transparent', cursor: 'pointer', color: '#EF4444', opacity: config.signatures.length <= 1 ? 0.4 : 1 }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => handleChange({ signatures: [...config.signatures, { name: '', designation: '', signatureUrl: '' }] })}
                  style={{ marginTop: 12, border: `1.5px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={13} /> Add Signatory
                </button>
              </div>

              {/* Final Remarks */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <FileText size={16} color={TEAL} />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Final Remarks</h3>
                </div>
                <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 10px' }}>The remark printed on the result card for a percentage in each range.</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9' }}>
                      {['Sr.no', 'From %', 'To %', 'Remark', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.finalRemarks.map((r, idx) => {
                      const setR = (patch) => handleChange({ finalRemarks: config.finalRemarks.map((x, i) => (i === idx ? { ...x, ...patch } : x)) });
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                          <td style={{ padding: '8px 12px', color: '#94A3B8' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 8px' }}><input aria-label={`Remark ${idx + 1} from percent`} type="number" min="0" max="100" className="form-input" style={{ width: 72, padding: '4px 8px', fontSize: 13 }} value={r.minPercent} onChange={e => setR({ minPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></td>
                          <td style={{ padding: '6px 8px' }}><input aria-label={`Remark ${idx + 1} to percent`} type="number" min="0" max="100" className="form-input" style={{ width: 72, padding: '4px 8px', fontSize: 13 }} value={r.maxPercent} onChange={e => setR({ maxPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></td>
                          <td style={{ padding: '6px 8px' }}><input aria-label={`Remark ${idx + 1}`} className="form-input" style={{ width: '100%', minWidth: 200, padding: '4px 8px', fontSize: 13 }} value={r.remark} maxLength={160} onChange={e => setR({ remark: e.target.value })} /></td>
                          <td style={{ padding: '6px 8px' }}>
                            <button type="button" aria-label={`Remove remark ${idx + 1}`} onClick={() => handleChange({ finalRemarks: config.finalRemarks.filter((_, i) => i !== idx) })}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1.5px solid #EF4444', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {config.finalRemarks.some(r => Number(r.maxPercent) < Number(r.minPercent)) && (
                  <div style={{ fontSize: 12.5, color: '#B91C1C', marginTop: 8 }}>A range ends before it starts: check "From %" and "To %".</div>
                )}
                <button type="button" onClick={() => handleChange({ finalRemarks: [...config.finalRemarks, { minPercent: 0, maxPercent: 0, remark: '' }] })}
                  style={{ marginTop: 12, border: `1.5px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={13} /> Add a remark
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => saveMutation.mutate(config)} disabled={saveMutation.isPending}
                  style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Result Card Options sub-tab */}
          {setupTab === 'options' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: NAVY }}>Result Card Options</h3>
                <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 20px' }}>Choose what appears on the generated result card for parents and students.</p>

                <div style={{ fontWeight: 700, fontSize: 11, color: '#64748B', letterSpacing: 1, marginBottom: 10 }}>GENERAL</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #F1F5F9', marginBottom: 20 }}>
                  {GENERAL_OPTIONS.map((opt, i) => (
                    <div key={opt.key} onClick={() => handleChange({ cardOptions: { ...config.cardOptions, [opt.key]: !config.cardOptions[opt.key] } })}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < GENERAL_OPTIONS.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', background: config.cardOptions[opt.key] ? '#eff6ff' : '#FAFBFF', transition: 'background 0.15s' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1E293B' }}>{opt.label}</span>
                      <Toggle checked={!!config.cardOptions[opt.key]} onChange={() => handleChange({ cardOptions: { ...config.cardOptions, [opt.key]: !config.cardOptions[opt.key] } })} />
                    </div>
                  ))}
                </div>

                <div style={{ fontWeight: 700, fontSize: 11, color: '#64748B', letterSpacing: 1, marginBottom: 10 }}>SIGNATURES</div>
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #F1F5F9', marginBottom: 20 }}>
                  {config.signatures.map((sig, i) => {
                    const sigKey = (sig.name || `sig_${i}`).toLowerCase().replace(/\s+/g, '_');
                    const checked = config.signatureOptions[sigKey] !== false;
                    return (
                      <div key={sigKey} onClick={() => handleChange({ signatureOptions: { ...config.signatureOptions, [sigKey]: !checked } })}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < config.signatures.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', background: checked ? '#eff6ff' : '#FAFBFF' }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1E293B' }}>Signature — {sig.name || 'Unnamed'}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{sig.designation || '—'}</div>
                        </div>
                        <Toggle checked={checked} onChange={() => handleChange({ signatureOptions: { ...config.signatureOptions, [sigKey]: !checked } })} />
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => saveMutation.mutate(config)} disabled={saveMutation.isPending}
                  style={{ width: '100%', background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '12px', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Save size={15} /> {saveMutation.isPending ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EXAM STEP PROGRESS BAR
══════════════════════════════════════════════════ */
function ExamStepProgress({ activeTab }) {
  const steps = EXAM_STEPS;
  const currentIndex = steps.findIndex(s => s.id === activeTab);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
      borderRadius: 16, padding: '16px 24px', marginBottom: 20,
      border: '1px solid rgba(27,47,110,0.1)',
      boxShadow: '0 2px 12px rgba(27,47,110,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Progress line behind */}
        <div style={{
          position: 'absolute', top: 19, left: 24, right: 24,
          height: 3, background: '#e2e8f0', borderRadius: 2, zIndex: 0,
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg,#1B2F6E,#0073b7)',
            width: `${(currentIndex / (steps.length - 1)) * 100}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.id} style={{
              flex: 1, textAlign: 'center', position: 'relative', zIndex: 1,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px',
                background: done
                  ? 'linear-gradient(135deg,#059669,#10B981)'
                  : active
                    ? 'linear-gradient(135deg,#1B2F6E,#0073b7)'
                    : 'white',
                border: done || active ? 'none' : '2px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 16 : 18,
                boxShadow: active ? '0 4px 12px rgba(27,47,110,0.3)' : 'none',
                transition: 'all 0.4s ease',
                transform: active ? 'scale(1.15)' : 'scale(1)',
              }}>
                {done ? '✓' : step.icon}
              </div>
              <div style={{
                fontSize: 11, fontWeight: active ? 700 : 500,
                color: active ? '#1B2F6E' : done ? '#059669' : '#94a3b8',
                transition: 'color 0.3s',
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EXAMINATION PAGE
══════════════════════════════════════════════════ */
/* An exam from start to finish, in the order a school works. */
const EXAM_STEPS = [
  { id: 'exam-setup',      label: 'Exam Setup',      icon: '📋' },
  { id: 'date-sheet',      label: 'Date Sheet',      icon: '📅' },
  { id: 'syllabus',        label: 'Syllabus',        icon: '📖' },
  { id: 'roll-slips',      label: 'Roll No. Slips',  icon: '🎫' },
  { id: 'question-papers', label: 'Question Papers', icon: '📝' },
  { id: 'marks',           label: 'Marks Entry',     icon: '✏️' },
  { id: 'results',         label: 'Results',         icon: '🏆' },
];

/* Results: the exam's results, and how result cards are set up. */
function ResultsHub({ initialExamId }) {
  const [view, setView] = useState('overview');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={tabBtnStyle(view === 'overview')} onClick={() => setView('overview')}>Results</button>
        <button style={tabBtnStyle(view === 'settings')} onClick={() => setView('settings')}>Result card settings</button>
      </div>
      {view === 'overview' ? <ResultsOverviewTab initialExamId={initialExamId} /> : <ResultsTab />}
    </div>
  );
}

export default function ExaminationPage() {
  const [activeTab, setActiveTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return EXAM_STEPS.some(s => s.id === t) ? t : 'exam-setup';
  });
  const [tabVisible, setTabVisible] = useState(true);
  const [tabExamId, setTabExamId] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem('examination_visited')
  );

  const switchTab = (newTab, examId) => {
    if (examId) setTabExamId(String(examId));
    setTabVisible(false);
    setTimeout(() => {
      setActiveTab(newTab);
      setTabVisible(true);
    }, 180);
  };


  return (
    <div className="page-content fade-in">

      {/* ── ONBOARDING MODAL (first visit only) ── */}
      {showOnboarding && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
          backdropFilter: 'blur(10px)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)',
            borderRadius: 24, padding: '40px 36px', maxWidth: 560, width: '100%',
            textAlign: 'center', boxShadow: '0 25px 80px rgba(27,47,110,0.25)',
            animation: 'scaleIn 0.3s ease-out',
          }}>
            <div style={{ fontSize: 72, marginBottom: 16, lineHeight: 1 }}>📝</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1B2F6E', margin: '0 0 8px' }}>
              Examination Module
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 28px' }}>
              Complete exam management — from setup to results. Follow the steps for each exam.
            </p>

            {/* 5-Step Process Visual */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
              {EXAM_STEPS.map((x, i) => ({ step: i + 1, label: x.label, icon: x.icon })).map((s, i) => (
                <React.Fragment key={s.step}>
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', margin: '0 auto 6px',
                      background: 'linear-gradient(135deg,#1B2F6E,#0073b7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, boxShadow: '0 4px 12px rgba(27,47,110,0.3)',
                      animation: `ilm-fade-in 0.3s ease-out ${i * 80}ms both`,
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1B2F6E', lineHeight: 1.2 }}>
                      Step {s.step}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                  </div>
                  {i < EXAM_STEPS.length - 1 && (
                    <div style={{
                      flex: 1, height: 2, background: 'linear-gradient(90deg,#1B2F6E,#0073b7)',
                      margin: '0 4px', marginTop: -20, maxWidth: 40,
                      animation: `ilm-fade-in 0.3s ease-out ${i * 80 + 60}ms both`,
                    }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <button
              onClick={() => {
                localStorage.setItem('examination_visited', '1');
                setShowOnboarding(false);
              }}
              style={{
                background: 'linear-gradient(135deg,#1B2F6E,#0073b7)',
                color: 'white', border: 'none', borderRadius: 999,
                padding: '13px 36px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(27,47,110,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(27,47,110,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,47,110,0.35)'; }}
            >
              Begin Examination Management →
            </button>
          </div>
        </div>
      )}

      {/* IlmForge Gradient Page Header */}
      <div className="ilm-page-header">
        <div>
          <h1 className="ilm-page-title">🗄️ Exam Vault</h1>
          <p className="ilm-page-subtitle">Exam · Date sheet · Syllabus · Roll number slips · Question papers · Marks · Results and report cards</p>
        </div>
      </div>

      {/* ── 5-STEP PROGRESS BAR ── */}
      <ExamStepProgress activeTab={activeTab} />

      {/* IlmForge Pill Navigation */}
      <div className="ilm-pill-nav">
        {EXAM_STEPS.map((tab, i) => (
          <button key={tab.id}
            className={`ilm-pill-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => switchTab(tab.id)}>
            {i + 1}. {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content with fade+slide animation */}
      <div style={{
        opacity: tabVisible ? 1 : 0,
        // 'none' once shown: any transform (even translateY(0)) traps the
        // tabs' pop-up forms (position: fixed) inside this box.
        transform: tabVisible ? 'none' : 'translateY(10px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        {activeTab === 'exam-setup'    && <ExamSetupTab onGo={switchTab} />}
        {activeTab === 'date-sheet'    && <DateSheetTab key={tabExamId} initialExamId={tabExamId} />}
        {activeTab === 'syllabus'      && <SyllabusTab />}
        {activeTab === 'roll-slips'    && <RollNoSlipsTab key={tabExamId} initialExamId={tabExamId} />}
        {activeTab === 'question-papers' && <QuestionPapersTab key={tabExamId} initialExamId={tabExamId} />}
        {activeTab === 'marks'         && <MarksEntryTab key={tabExamId} initialExamId={tabExamId} />}
        {activeTab === 'results'       && <ResultsHub key={tabExamId} initialExamId={tabExamId} />}
      </div>
    </div>
  );
}
