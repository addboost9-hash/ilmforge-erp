/**
 * IlmForge — Unified Examination Page
 * 5 tabs: Exam Setup | Date Sheet | Syllabus | Question Bank | Results
 * URL: /examination
 */
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, X,
  Bell, Save, Check, Edit3, Award, FileText, User, Settings,
  ToggleLeft, ToggleRight,
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
      type: form.term === '1st' ? 'first_term' : 'second_term',
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
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
            <select className="form-select" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
              <option value="1st">1st Term</option>
              <option value="2nd">2nd Term</option>
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
/* ─────────────────────── PRINT: SCHOOL MENTOR PAPER FORMAT ─────────────────────── */
function printSchoolMentorPaper(paper, schoolName, logoUrl, className, sectionName) {
  const school = schoolName || localStorage.getItem('registeredSchoolName') || 'School';
  const logo = logoUrl || localStorage.getItem('schoolLogoPreview') || '';
  const subject = paper.subject || paper.subjectName || 'Subject';
  const cls = className || paper.className || 'Class';
  const sec = sectionName || paper.sectionName || 'A';
  const time = paper.objectiveTime || paper.totalTime || paper.duration || 60;
  const totalMarks = paper.totalMarks || paper.objectiveMarks || 100;
  const title = paper.title || paper.name || 'Question Paper';

  const logoHtml = logo
    ? `<img src="${logo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #ccc"/>`
    : `<div style="width:56px;height:56px;border-radius:50%;border:2px solid #999;display:flex;align-items:center;justify-content:center;font-size:9px;text-align:center;color:#666;font-family:sans-serif">SCHOOL<br>LOGO</div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#000}
  .header{display:flex;align-items:flex-start;gap:14px;margin-bottom:14px}
  .school-name{font-size:15px;font-weight:bold;color:#000}
  .paper-sub{font-size:11.5px;color:#333;margin-top:3px}
  hr{border:none;border-top:1.5px solid #000;margin:12px 0}
  table{width:100%;border-collapse:collapse}
  td,th{border:1px solid #000;padding:7px 9px;font-size:11.5px}
  .student-name-row td{height:28px;vertical-align:bottom}
  .info-row td{padding:5px 9px}
  .section-title{font-size:13px;font-weight:bold;border-left:4px solid #222;padding-left:8px;margin:18px 0 10px}
  .footer-row td{text-align:center;padding:14px 9px}
  .page-num{text-align:center;font-size:10px;color:#888;margin-top:16px}
  @media print{body{padding:12px}@page{margin:.8cm}}
</style>
</head>
<body>
<div class="header">
  <div>${logoHtml}</div>
  <div>
    <div class="school-name">${school}</div>
    <div class="paper-sub">${title} &bull; ${subject} (${sec}) &bull; ${cls}</div>
  </div>
</div>
<hr/>
<table style="margin-bottom:10px">
  <thead><tr>
    <th style="width:40%">Student Name</th>
    <th style="width:20%">Roll No.</th>
    <th style="width:20%">Section</th>
    <th style="width:20%">Date</th>
  </tr></thead>
  <tbody><tr class="student-name-row">
    <td></td><td></td><td></td><td></td>
  </tr></tbody>
</table>
<table style="margin-bottom:16px">
  <tr>
    <td><strong>Subject:</strong> ${subject} (${sec})</td>
    <td><strong>Class:</strong> ${cls}</td>
    <td><strong>Time:</strong> ${time} Minutes</td>
    <td><strong>Total Marks:</strong> ${totalMarks}</td>
    <td><strong>Obtained:</strong>___________ / ${totalMarks}</td>
  </tr>
</table>
<div class="section-title">SECTION A &ndash; OBJECTIVE QUESTIONS</div>
<div style="min-height:64px;border:1px dashed #ccc;padding:8px;color:#bbb;font-size:11px">Objective questions appear here</div>
<div class="section-title">SECTION A &ndash; SUBJECTIVE QUESTIONS</div>
<div style="min-height:64px;border:1px dashed #ccc;padding:8px;color:#bbb;font-size:11px">Subjective questions appear here</div>
<br/>
<table><tr class="footer-row">
  <td style="width:33%"><strong>Examiner:</strong> _____________</td>
  <td style="width:34%"><strong>Checker:</strong> _____________</td>
  <td style="width:33%"><strong>Re-Checker:</strong> __________</td>
</tr></table>
<div class="page-num">Page 1 of 1</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

  const w = window.open('','_blank','width=900,height=750');
  if(w){w.document.write(html);w.document.close();}
}

function exportExamsPDF(exams, activeTerm, schoolName, logoUrl) {
  const school = schoolName || localStorage.getItem('registeredSchoolName') || 'School Name';
  const logo = logoUrl || localStorage.getItem('schoolLogoPreview') || '';
  const now = new Date();
  const dateStr = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

  const logoHtml = logo
    ? `<img src="${logo}" style="width:70px;height:70px;object-fit:contain"/>`
    : `<div style="width:70px;height:70px;border:2px solid #aaa;display:flex;align-items:center;justify-content:center;font-size:9px;color:#666">LOGO</div>`;

  const rows = exams.map((e, i) => {
    const classes = (() => { try { return JSON.parse(e.classIds || '[]'); } catch { return []; } })();
    return classes.length > 0
      ? classes.map((c, ci) => `<tr><td>${ci === 0 ? i+1 : ''}</td><td>${ci === 0 ? (e.name || e.title || 'Exam') : ''}</td><td>${c.className || c}</td><td>${c.sectionName || 'A'}</td><td>${e.startDate ? new Date(e.startDate).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}).replace(/ /g,'-') : (e.dateStart ? new Date(e.dateStart).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}).replace(/ /g,'-') : '—')}</td><td>${e.endDate ? new Date(e.endDate).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}).replace(/ /g,'-') : (e.dateEnd ? new Date(e.dateEnd).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}).replace(/ /g,'-') : '—')}</td></tr>`).join('')
      : `<tr><td>${i+1}</td><td>${e.name || e.title || 'Exam'}</td><td>—</td><td>—</td><td>${(e.startDate||e.dateStart) ? new Date(e.startDate||e.dateStart).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</td><td>${(e.endDate||e.dateEnd) ? new Date(e.endDate||e.dateEnd).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;padding:20px}
  .top-header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:4px}
  .school-name-big{font-size:20px;font-weight:bold;text-align:center;flex:1}
  .gen-info{display:flex;justify-content:space-between;font-size:10px;color:#333;margin:6px 0 14px}
  h2{text-align:center;font-size:16px;font-weight:bold;margin-bottom:14px}
  .term-label{font-size:12px;font-weight:bold;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#e5e7eb;font-weight:bold;padding:7px 8px;border:1px solid #000;text-align:left}
  td{padding:6px 8px;border:1px solid #000}
  .footer{display:flex;justify-content:space-between;margin-top:16px;font-size:10px;color:#555;border-top:1px solid #ccc;padding-top:8px}
  @media print{@page{margin:.8cm}}
</style>
</head><body>
<div class="top-header">
  <div>${logoHtml}</div>
  <div class="school-name-big">${school}</div>
  <div style="width:70px"></div>
</div>
<div class="gen-info">
  <span>Generated Date: ${dateStr}</span>
  <span>Generated Time: ${timeStr}</span>
  <span>Generated By: ${school}</span>
</div>
<h2>Examination Schedule</h2>
<div class="term-label">Term : ${activeTerm === '1st' ? '1st Term' : '2nd Term'}</div>
<table>
  <thead><tr><th>Sr. No</th><th>Exam Name</th><th>Class</th><th>Section</th><th>Date From</th><th>Date To</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <span>Contact : 0346-5146609</span>
  <span>Powered By : IlmForge</span>
  <span>Page 1 of 1</span>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

  const w = window.open('','_blank','width=1000,height=700');
  if(w){w.document.write(html);w.document.close();}
}

function ExamSetupTab() {
  const qc = useQueryClient();
  const [activeTerm, setActiveTerm] = useState('1st');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: allExams = [], isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then(r => r.data.data || []) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  // Filter by term
  const filteredExams = allExams.filter(e => {
    const term = (e.term || '').toLowerCase();
    const type = (e.type || '').toLowerCase();
    if (activeTerm === '1st') {
      return term === '1st' || type.includes('first') || type.includes('mid') || type === 'first_term' || type === 'semester1' || type === 'semester2';
    } else {
      return term === '2nd' || type.includes('second') || type.includes('final') || type === 'second_term' || type === 'semester3' || type === 'semester4' || type === 'annual';
    }
  });

  const exams = filteredExams;

  const add = useMutation({
    mutationFn: d => api.post('/exams', d),
    onSuccess: () => { toast.success('Exam created!'); qc.invalidateQueries(['exams']); setShowAddModal(false); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const editMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/exams/${id}`, d),
    onSuccess: () => { toast.success('Exam updated!'); qc.invalidateQueries(['exams']); setEditExam(null); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/exams/${id}`),
    onSuccess: () => { toast.success('Deleted!'); qc.invalidateQueries(['exams']); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
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
          <button style={termBtnStyle(activeTerm === '1st')} onClick={() => setActiveTerm('1st')}>1st Term</button>
          <button style={termBtnStyle(activeTerm === '2nd')} onClick={() => setActiveTerm('2nd')}>2nd Term</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportExamsPDF(filteredExams, activeTerm, school?.name, school?.logoUrl)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>PDF</button>
          <button style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Word</button>
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
                  <th style={{ width: 1 }}></th>
                  <th style={{ width: 70 }}>Edit</th>
                  <th style={{ width: 60 }}>PDF</th>
                  <th style={{ width: 60 }}>Word</th>
                  <th style={{ width: 60 }}>Delete</th>
                  <th style={{ width: 70 }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e, idx) => {
                  const isExpanded = expandedRow === e.id;
                  const examClasses = getClasses(e);
                  return (
                    <>
                      <tr key={e.id} style={{ background: isExpanded ? '#eff6ff' : undefined }}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{e.title}</td>
                        <td></td>
                        <td>
                          <button
                            style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setEditExam(e)}
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        </td>
                        <td>
                          <button style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>PDF</button>
                        </td>
                        <td>
                          <button style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Word</button>
                        </td>
                        <td>
                          <button
                            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => { if (window.confirm('Delete this exam?')) del.mutate(e.id); }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setExpandedRow(isExpanded ? null : e.id)}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${e.id}-detail`} style={{ background: '#eff6ff' }}>
                          <td colSpan={8} style={{ padding: '14px 20px' }}>
                            <div style={{ border: '1px solid #dbeafe', borderRadius: 8, padding: '14px 18px', background: '#fff' }}>
                              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: '#374151', fontSize: 13 }}>
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
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {exams.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📝</div>
                      <div className="empty-state-text">No exams for {activeTerm} Term</div>
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

function DateSheetTab() {
  const queryClient = useQueryClient();
  const [activeTerm, setActiveTerm] = useState('1st');
  const [examId, setExamId] = useState('');
  const [editRow, setEditRow] = useState(null);

  const { data: allExams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then(r => r.data.data || []) });

  const exams = allExams.filter(e => {
    const term = (e.term || '').toLowerCase();
    const type = (e.type || '').toLowerCase();
    if (activeTerm === '1st') return term === '1st' || type.includes('first') || type === 'first_term';
    return term === '2nd' || type.includes('second') || type === 'second_term' || type.includes('final') || type === 'annual';
  });

  const selectedExam = exams.find(ex => String(ex.id) === String(examId));

  const { data: datesheet = [], isLoading } = useQuery({
    queryKey: ['datesheet', examId],
    queryFn: () => api.get(`/exams/${examId}/datesheet`).then(r => r.data.data),
    enabled: !!examId,
  });

  return (
    <div>
      {/* Term toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <button style={termBtnStyle(activeTerm === '1st')} onClick={() => { setActiveTerm('1st'); setExamId(''); }}>1st Term</button>
          <button style={termBtnStyle(activeTerm === '2nd')} onClick={() => { setActiveTerm('2nd'); setExamId(''); }}>2nd Term</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>PDF</button>
          <button style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Word</button>
        </div>
      </div>

      {/* Exam selector */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={examId}
          onChange={e => setExamId(e.target.value)}
          style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 7, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' }}
        >
          <option value="">— Select Exam —</option>
          {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
        </select>
      </div>

      {/* Empty */}
      {!examId && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: 16, marginBottom: 6 }}>Select an Exam</div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>Choose an exam to manage its date sheet.</div>
        </div>
      )}

      {isLoading && examId && <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Loading…</div>}

      {/* Table */}
      {!isLoading && examId && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>S.No.</th>
                <th>Class Name</th>
                <th>Section Name</th>
                <th style={{ width: 60, textAlign: 'center' }}><Bell size={14} /></th>
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
                  <td>{row.sectionName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><Bell size={14} /></button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setEditRow(row)} style={{ border: `1px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>PDF</button>
                      <button style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Word</button>
                      <button style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                        <Trash2 size={11} />
                      </button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><Bell size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Date Sheet Edit Modal */}
      {editRow && (
        <DateSheetEditModal
          examId={examId}
          examTitle={selectedExam?.title || ''}
          row={editRow}
          onClose={() => setEditRow(null)}
          queryClient={queryClient}
          classId={editRow?.classId}
        />
      )}
    </div>
  );
}

function DateSheetEditModal({ examId, examTitle, row, onClose, queryClient, classId }) {
  const [rows, setRows] = useState(row.entries?.length > 0 ? row.entries.map(e => ({ ...e, _key: e.id })) : []);
  const [saving, setSaving] = useState({});
  const [deleting, setDeleting] = useState({});
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [copying, setCopying] = useState(false);
  const keyRef = useRef(-1);

  const { data: subjectsList = [] } = useQuery({
    queryKey: ['datesheet-subjects', classId],
    queryFn: () => api.get('/subjects', { params: { classId } }).then(r => r.data.data || []),
    enabled: !!classId,
  });

  const invalidate = () => queryClient.invalidateQueries(['datesheet', examId]);

  function addRow() {
    const tmpKey = --keyRef.current;
    setRows(r => [...r, { _key: tmpKey, id: null, subject: '', date: '', timeFrom: '', timeTo: '' }]);
  }

  function updateRow(key, field, val) {
    setRows(r => r.map(x => x._key === key ? { ...x, [field]: val } : x));
  }

  async function saveRow(rowItem) {
    setSaving(s => ({ ...s, [rowItem._key]: true }));
    try {
      if (rowItem.id) {
        const res = await api.put(`/exams/datesheet/${rowItem.id}`, { subject: rowItem.subject, date: rowItem.date, timeFrom: rowItem.timeFrom, timeTo: rowItem.timeTo });
        setRows(r => r.map(x => x._key === rowItem._key ? { ...x, ...res.data.data, _key: rowItem._key } : x));
      } else {
        const res = await api.post(`/exams/${examId}/datesheet`, { classId: row.classId, sectionId: row.sectionId, subject: rowItem.subject, date: rowItem.date, timeFrom: rowItem.timeFrom, timeTo: rowItem.timeTo });
        setRows(r => r.map(x => x._key === rowItem._key ? { ...x, ...res.data.data, _key: rowItem._key } : x));
      }
      toast.success('Entry saved.');
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(s => ({ ...s, [rowItem._key]: false }));
    }
  }

  async function deleteRow(rowItem) {
    if (!rowItem.id) { setRows(r => r.filter(x => x._key !== rowItem._key)); return; }
    setDeleting(d => ({ ...d, [rowItem._key]: true }));
    try {
      await api.delete(`/exams/datesheet/${rowItem.id}`);
      setRows(r => r.filter(x => x._key !== rowItem._key));
      toast.success('Entry deleted.');
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(d => ({ ...d, [rowItem._key]: false }));
    }
  }

  async function copyToAll() {
    setCopying(true);
    try {
      await api.post(`/exams/${examId}/datesheet/copy-to-all`, { fromClassId: row.classId, fromSectionId: row.sectionId });
      toast.success('Date sheet copied to all classes!');
      invalidate();
      setCopyConfirm(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Copy failed.');
    } finally {
      setCopying(false);
    }
  }

  const inp = { border: '1px solid #D1D5DB', borderRadius: 5, padding: '5px 8px', fontSize: 12, width: '100%', outline: 'none', background: '#fff' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: TEAL, color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Upload date sheet</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{row.className} — Section {row.sectionName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9' }}>
                {['Subject', 'Date', 'Time From', 'Time To', '✓', '✕'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 10px', textAlign: i >= 4 ? 'center' : 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', minWidth: i < 4 ? 100 : 60 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#94A3B8', fontSize: 13 }}>No entries yet. Click "+ Add New".</td></tr>
              )}
              {rows.map(r => (
                <tr key={r._key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '6px 8px' }}>
                    {subjectsList.length > 0 ? (
                      <select value={r.subject || ''} onChange={e => updateRow(r._key, 'subject', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #dbeafe', borderRadius: 6, fontSize: 13, background: 'white' }}>
                        <option value="">Select Subject</option>
                        {subjectsList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="Subject" value={r.subject || ''}
                        onChange={e => updateRow(r._key, 'subject', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #dbeafe', borderRadius: 6, fontSize: 13 }} />
                    )}
                  </td>
                  <td style={{ padding: '6px 8px' }}><input type="date" style={inp} value={r.date} onChange={e => updateRow(r._key, 'date', e.target.value)} /></td>
                  <td style={{ padding: '6px 8px' }}><input type="time" style={inp} value={r.timeFrom} onChange={e => updateRow(r._key, 'timeFrom', e.target.value)} /></td>
                  <td style={{ padding: '6px 8px' }}><input type="time" style={inp} value={r.timeTo} onChange={e => updateRow(r._key, 'timeTo', e.target.value)} /></td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button onClick={() => saveRow(r)} disabled={saving[r._key]} style={{ background: saving[r._key] ? '#9CA3AF' : '#16A34A', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>
                      {saving[r._key] ? '…' : '✓'}
                    </button>
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button onClick={() => deleteRow(r)} disabled={deleting[r._key]} style={{ background: deleting[r._key] ? '#9CA3AF' : '#DC2626', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>
                      {deleting[r._key] ? '…' : '✕'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={addRow} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              + Add New
            </button>
            <button onClick={() => setCopyConfirm(true)} style={{ border: `1.5px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Copy to All Classes
            </button>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#F1F5F9', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Close</button>
        </div>
      </div>

      {copyConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 16, marginBottom: 10 }}>Copy to All Classes?</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>This will replace the date sheet of all other classes with entries from <strong>{row.className} – {row.sectionName}</strong>.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setCopyConfirm(false)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={copyToAll} disabled={copying} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {copying ? 'Copying…' : 'Yes, copy to all classes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 3: SYLLABUS
══════════════════════════════════════════════════ */
function SyllabusTab() {
  const navigate = useNavigate();
  const [activeTerm, setActiveTerm] = useState('1st');
  const [examId, setExamId] = useState('');

  const { data: allExams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then(r => r.data.data || []) });
  const exams = allExams.filter(e => {
    const term = (e.term || '').toLowerCase();
    const type = (e.type || '').toLowerCase();
    if (activeTerm === '1st') return term === '1st' || type.includes('first') || type === 'first_term';
    return term === '2nd' || type.includes('second') || type === 'second_term' || type.includes('final') || type === 'annual';
  });

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });

  // Build class-section rows from classes data
  const rows = classes.flatMap(cls =>
    (cls.sections || []).map(sec => ({
      classId: cls.id,
      className: cls.name,
      sectionId: sec.id,
      sectionName: sec.name,
    }))
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <button style={termBtnStyle(activeTerm === '1st')} onClick={() => setActiveTerm('1st')}>1st Term</button>
          <button style={termBtnStyle(activeTerm === '2nd')} onClick={() => setActiveTerm('2nd')}>2nd Term</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>PDF</button>
          <button style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Word</button>
        </div>
      </div>

      {/* Exam selector */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={examId}
          onChange={e => setExamId(e.target.value)}
          style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 7, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' }}
        >
          <option value="">— Select Exam —</option>
          {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>S.No.</th>
              <th>Class</th>
              <th>Section Name</th>
              <th style={{ width: 70 }}>Edit</th>
              <th style={{ width: 60 }}>PDF</th>
              <th style={{ width: 60 }}>Delete</th>
              <th style={{ width: 50, textAlign: 'center' }}><Bell size={14} /></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <div className="empty-state-icon">📚</div>
                  <div className="empty-state-text">No classes configured</div>
                  <div className="empty-state-sub">Add classes and sections in Settings first</div>
                </div>
              </td></tr>
            )}
            {rows.map((row, idx) => (
              <tr key={`${row.classId}_${row.sectionId}`}>
                <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                <td style={{ fontWeight: 700, color: NAVY }}>{row.className}</td>
                <td>{row.sectionName}</td>
                <td>
                  <button
                    style={{ border: `1px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => navigate(`/academics/subject-syllabus/${row.classId}/${row.sectionId}`)}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </td>
                <td>
                  <button style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>PDF</button>
                </td>
                <td>
                  <button style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                    <Trash2 size={11} />
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><Bell size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 4: QUESTION BANK
══════════════════════════════════════════════════ */
const QB_QUESTION_TYPES = [
  'Match Columns', 'True/False', 'Multiple Choice Questions', 'Fill in the Blanks',
  'Comprehension', 'Word Sentences', 'Word Opposite', 'Singular/Plural',
  'Word Synonyms', 'Question & Answer', 'Stories', 'Essays', 'Letters', 'Applications',
];

function QuestionBankTab() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState('customization');
  const [customize, setCustomize] = useState({
    instructions: [''],
    objectiveHeadings: ['OBJECTIVE PART'],
    subjectiveHeadings: ['SUBJECTIVE PART'],
    objectiveReplacements: [''],
    subjectiveReplacements: [''],
  });
  const [customClassId, setCustomClassId] = useState('');
  const [savingCustomize, setSavingCustomize] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showMakeModal, setShowMakeModal] = useState(false);
  const [expandedClass, setExpandedClass] = useState(null);
  const [bankPapers, setBankPapers] = useState([]);

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/classes/subjects').then(r => r.data.data || []).catch(() => []) });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const classesWithSections = classes.map(cls => ({ ...cls, sections: Array.isArray(cls.sections) ? cls.sections : [] }));

  const deletePaper = async (paperId, classId) => {
    if (!window.confirm('Delete this paper?')) return;
    try {
      await api.delete(`/question-papers/${paperId}`);
      toast.success('Paper deleted!');
      setBankPapers(prev => prev.filter(p => p.id !== paperId));
    } catch { toast.error('Failed to delete paper'); }
  };

  const shufflePaper = (paperId) => {
    setBankPapers(prev => prev.map(p => {
      if (p.id !== paperId) return p;
      const meta = p.meta || {};
      const qTypes = [...(meta.questionTypes || [])];
      for (let i = qTypes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qTypes[i], qTypes[j]] = [qTypes[j], qTypes[i]];
      }
      return { ...p, meta: { ...meta, questionTypes: qTypes } };
    }));
    toast.success('Questions shuffled!');
  };

  const fetchBankPapers = async (classId) => {
    try {
      const res = await api.get(`/question-papers/bank/${classId}/all`);
      setBankPapers(res.data.data?.papers || []);
      const cust = res.data.data?.paperCustomization;
      if (cust) {
        setCustomize(c => ({
          instructions: cust.instructions ? [cust.instructions] : c.instructions,
          objectiveHeadings: cust.objectiveHeadings || (cust.objectiveHeading ? [cust.objectiveHeading] : c.objectiveHeadings),
          subjectiveHeadings: cust.subjectiveHeadings || (cust.subjectiveHeading ? [cust.subjectiveHeading] : c.subjectiveHeadings),
          objectiveReplacements: cust.objectiveReplacements || [cust.objectiveReplacement || ''],
          subjectiveReplacements: cust.subjectiveReplacements || [cust.subjectiveReplacement || ''],
        }));
      }
    } catch { /* ignore */ }
  };

  const handleSaveCustomize = async () => {
    if (!customClassId) return toast.error('Select a class first');
    setSavingCustomize(true);
    try {
      await api.post('/question-papers/bank-customize', {
        classId: customClassId,
        instructions: customize.instructions.filter(Boolean).join('\n'),
        objectiveHeading: customize.objectiveHeadings.filter(Boolean)[0] || 'OBJECTIVE PART',
        subjectiveHeading: customize.subjectiveHeadings.filter(Boolean)[0] || 'SUBJECTIVE PART',
        objectiveReplacement: customize.objectiveReplacements.filter(Boolean)[0] || '',
        subjectiveReplacement: customize.subjectiveReplacements.filter(Boolean)[0] || '',
        objectiveHeadings: customize.objectiveHeadings,
        subjectiveHeadings: customize.subjectiveHeadings,
        objectiveReplacements: customize.objectiveReplacements,
        subjectiveReplacements: customize.subjectiveReplacements,
      });
      toast.success('Customization saved!');
    } catch { toast.error('Failed to save'); } finally { setSavingCustomize(false); }
  };

  const handleGenerate = async (payload) => {
    const res = await api.post('/question-papers/generate-bank', payload);
    toast.success('Paper generated!');
    qc.invalidateQueries(['question-papers']);
    setBankPapers(prev => [res.data.data, ...prev]);
  };

  const labelStyle = { fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4, display: 'block' };
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };

  const CUSTOMIZE_FIELDS = [
    { label: 'Paper Instructions', key: 'instructions' },
    { label: 'Main Heading Objective', key: 'objectiveHeadings' },
    { label: 'Main Heading Subjective', key: 'subjectiveHeadings' },
    { label: 'Main Heading Objective Replacement', key: 'objectiveReplacements' },
    { label: 'Main Heading Subjective Replacement', key: 'subjectiveReplacements' },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabBtnStyle(subTab === 'customization')} onClick={() => setSubTab('customization')}>Question Paper Customization</button>
        <button style={tabBtnStyle(subTab === 'generator')} onClick={() => setSubTab('generator')}>Paper Generator</button>
      </div>

      {/* Question Paper Customization */}
      {subTab === 'customization' && (
        <div className="card">
          <h3 style={{ color: NAVY, marginTop: 0 }}>Question Paper Customization</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Apply to Class</label>
            <select style={{ ...inputStyle, maxWidth: 300 }} value={customClassId} onChange={e => setCustomClassId(e.target.value)}>
              <option value="">-- Select Class --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {CUSTOMIZE_FIELDS.map(({ label, key }) => (
            <div key={key} style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{label}</label>
              {customize[key].map((val, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={val}
                    placeholder={`${label} ${i > 0 ? i + 1 : ''}`}
                    onChange={e => {
                      const arr = [...customize[key]];
                      arr[i] = e.target.value;
                      setCustomize(c => ({ ...c, [key]: arr }));
                    }}
                  />
                  {customize[key].length > 1 && (
                    <button onClick={() => setCustomize(c => ({ ...c, [key]: c[key].filter((_, fi) => fi !== i) }))}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>×</button>
                  )}
                  {i === customize[key].length - 1 && (
                    <button onClick={() => setCustomize(c => ({ ...c, [key]: [...c[key], ''] }))}
                      style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSaveCustomize} disabled={savingCustomize}
              style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 6, padding: '9px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {savingCustomize ? 'Saving…' : 'Save Customization'}
            </button>
          </div>
        </div>
      )}

      {/* Paper Generator */}
      {subTab === 'generator' && (
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>S.No.</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th style={{ textAlign: 'center' }}>Generated Paper</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                  <th style={{ width: 70 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {classesWithSections.length === 0 && (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-text">No classes found</div></div></td></tr>
                )}
                {classesWithSections.map((cls, idx) => {
                  const isExpanded = expandedClass === cls.id;
                  return (
                    <>
                      <tr key={cls.id}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: NAVY }}>{cls.name}</td>
                        <td>
                          {cls.sections.length > 0
                            ? cls.sections.map(s => <span key={s.id} style={{ background: '#EEF2FF', color: NAVY, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, marginRight: 4 }}>{s.name}</span>)
                            : <span style={{ color: '#9CA3AF', fontSize: 12 }}>No sections</span>
                          }
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ background: '#dbeafe', color: TEAL, borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{bankPapers.filter(p => p.classId === cls.id).length}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            style={{ border: `1px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 5, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => { setSelectedClass(cls); setSelectedSection(null); setShowMakeModal(true); fetchBankPapers(cls.id); }}
                          >
                            Make Paper
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => { setExpandedClass(isExpanded ? null : cls.id); if (!isExpanded) fetchBankPapers(cls.id); }}>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${cls.id}-detail`} style={{ background: '#F8FAFC' }}>
                          <td colSpan={6} style={{ padding: '12px 20px' }}>
                            {bankPapers.filter(p => String(p.classId) === String(cls.id)).length === 0
                              ? <div style={{ color: '#94A3B8', fontSize: 13, padding: '8px 0' }}>No papers generated yet.</div>
                              : bankPapers.filter(p => String(p.classId) === String(cls.id)).map((p, pi) => {
                                const subject = p.meta?.subject || p.subjectName || p.subject || 'Subject';
                                const dateStr = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '';
                                const timeStr = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                                const paperTitle = p.displayTitle || p.title || 'Question Paper';
                                return (
                                  <div key={pi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', borderRadius: 8, marginBottom: 8, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    {/* Left: green PDF icon + text */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <div style={{ width: 38, height: 44, background: '#16A34A', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>PDF</span>
                                        <span style={{ color: '#bbf7d0', fontSize: 8, marginTop: 1 }}>📄</span>
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{subject}{dateStr ? ` - ${dateStr}` : ''}</div>
                                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{paperTitle}{timeStr ? ` - ${timeStr}` : ''}</div>
                                      </div>
                                    </div>
                                    {/* Right: 5 icon buttons */}
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                      {/* Shuffle */}
                                      <button title="Shuffle" onClick={() => shufflePaper(p.id)}
                                        style={{ background: '#64748B', color: '#fff', border: 'none', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔀</button>
                                      {/* Edit */}
                                      <button title="Edit" onClick={() => { setSelectedClass(cls); setShowMakeModal(true); }}
                                        style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Pencil size={12} />
                                      </button>
                                      {/* View */}
                                      <button title="View / Print" onClick={() => printSchoolMentorPaper(p, school?.name, school?.logoUrl, cls.name, '')}
                                        style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👁</button>
                                      {/* Download */}
                                      <button title="Download / Print" onClick={() => printSchoolMentorPaper(p, school?.name, school?.logoUrl, cls.name, '')}
                                        style={{ background: '#1B2F6E', color: '#fff', border: 'none', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⬇</button>
                                      {/* Delete */}
                                      <button title="Delete" onClick={() => deletePaper(p.id, cls.id)}
                                        style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            }
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showMakeModal && selectedClass && (
            <MakePaperModal
              classItem={selectedClass}
              sectionItem={selectedSection}
              allSubjects={subjects}
              onClose={() => setShowMakeModal(false)}
              onGenerate={handleGenerate}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MakePaperModal({ classItem, sectionItem, allSubjects, onClose, onGenerate }) {
  const subjects = allSubjects.filter(s => !s.classId || String(s.classId) === String(classItem?.id));
  const displaySubjects = subjects.length > 0 ? subjects : allSubjects;

  const [form, setForm] = useState({
    subjectId: '', paperType: 'Both', paperFormat: 'Only Question Paper',
    objectiveTime: 30, objectiveMarks: 20, subjectiveTime: 90, subjectiveMarks: 80,
    title: `${classItem?.name || 'Class'} Question Paper`,
  });
  const [fetched, setFetched] = useState(false);
  const [qTypes, setQTypes] = useState(QB_QUESTION_TYPES.map(t => ({
    type: t, noOfItems: 0, marksPerItem: 1, noOfChoices: 0, totalItems: 0, mainQuestion: '', enabled: false, saved: false,
  })));
  const [generating, setGenerating] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [unitInput, setUnitInput] = useState('');

  const labelStyle = { fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4, display: 'block' };
  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
  const inpSm = { ...inputStyle, padding: '5px 8px' };

  const handleFetch = () => {
    if (!form.subjectId) return toast.error('Select a subject first');
    setFetched(true);
    toast.success('Question types loaded');
  };

  const handleGenerate = async () => {
    if (!form.title) return toast.error('Title required');
    setGenerating(true);
    try {
      await onGenerate({
        classId: classItem?.id, sectionId: sectionItem?.id, subjectId: form.subjectId,
        subject: displaySubjects.find(s => String(s.id) === String(form.subjectId))?.name || '',
        units: selectedUnits, paperType: form.paperType, paperFormat: form.paperFormat,
        objectiveTime: form.objectiveTime, objectiveMarks: form.objectiveMarks,
        subjectiveTime: form.subjectiveTime, subjectiveMarks: form.subjectiveMarks,
        title: form.title,
        questionTypes: qTypes.filter(qt => qt.enabled && qt.noOfItems > 0),
      });
      onClose();
    } catch { toast.error('Failed to generate paper'); } finally { setGenerating(false); }
  };

  const addManualUnit = () => {
    const t = unitInput.trim();
    if (t && !selectedUnits.includes(t)) setSelectedUnits(prev => [...prev, t]);
    setUnitInput('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 0' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 780, margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: NAVY, fontSize: 16 }}>Make paper of {classItem?.name}{sectionItem ? ` (${sectionItem.name})` : ''}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Select Subject</label>
            <select style={inputStyle} value={form.subjectId} onChange={e => { setForm(f => ({ ...f, subjectId: e.target.value })); setSelectedUnits([]); }}>
              <option value="">-- Select Subject --</option>
              {displaySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Select Units</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={unitInput} onChange={e => setUnitInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualUnit(); } }} placeholder="Type unit name + Enter" />
              <button onClick={addManualUnit} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>Add</button>
            </div>
            {selectedUnits.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedUnits.map(u => (
                  <span key={u} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {u}
                    <button onClick={() => setSelectedUnits(prev => prev.filter(x => x !== u))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Select Question Paper Type</label>
            <select style={inputStyle} value={form.paperType} onChange={e => setForm(f => ({ ...f, paperType: e.target.value }))}>
              {['Objective', 'Subjective', 'Both'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Select Question Paper Format</label>
            <select style={inputStyle} value={form.paperFormat} onChange={e => setForm(f => ({ ...f, paperFormat: e.target.value }))}>
              {['Only Question Paper', 'With Answer Sheet'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {(form.paperType === 'Objective' || form.paperType === 'Both') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, background: '#EEF2FF', borderRadius: 8, padding: 14 }}>
            <div>
              <label style={labelStyle}>Total Time For Objective Part (minutes)</label>
              <input type="number" style={inpSm} value={form.objectiveTime} onChange={e => setForm(f => ({ ...f, objectiveTime: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Total Marks For Objective Part</label>
              <input type="number" style={inpSm} value={form.objectiveMarks} onChange={e => setForm(f => ({ ...f, objectiveMarks: e.target.value }))} />
            </div>
          </div>
        )}

        {(form.paperType === 'Subjective' || form.paperType === 'Both') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, background: '#F0FDF4', borderRadius: 8, padding: 14 }}>
            <div>
              <label style={labelStyle}>Total Time For Subjective Part (minutes)</label>
              <input type="number" style={inpSm} value={form.subjectiveTime} onChange={e => setForm(f => ({ ...f, subjectiveTime: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Total Marks For Subjective Part</label>
              <input type="number" style={inpSm} value={form.subjectiveMarks} onChange={e => setForm(f => ({ ...f, subjectiveMarks: e.target.value }))} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Question Paper Title</label>
          <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. First Term Examination 2024" />
        </div>

        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <button onClick={handleFetch} style={{ border: `1.5px solid ${TEAL}`, background: 'transparent', color: TEAL, borderRadius: 7, padding: '8px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Fetch
          </button>
        </div>

        {fetched && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: NAVY, marginBottom: 10, fontSize: 13 }}>Question Types</div>
            {qTypes.map((qt, idx) => (
              <div key={qt.type} style={{ border: `1px solid ${qt.saved ? '#86efac' : '#e5e7eb'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 6, background: qt.saved ? '#f0fdf4' : qt.enabled ? '#EEF2FF' : '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" checked={qt.enabled} onChange={e => setQTypes(prev => prev.map((x, i) => i === idx ? { ...x, enabled: e.target.checked } : x))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: qt.enabled ? NAVY : '#6b7280' }}>{qt.type}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>Total Questions: {qt.totalItems} <ChevronDown size={12} /></span>
                </div>
                {qt.enabled && (
                  <div style={{ marginTop: 10, paddingLeft: 26 }}>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>No. of Items: {qt.noOfItems} | Marks/Item: {qt.marksPerItem}</div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Enter Main Question in paper</label>
                      <input style={inpSm} value={qt.mainQuestion} onChange={e => setQTypes(prev => prev.map((x, i) => i === idx ? { ...x, mainQuestion: e.target.value } : x))} placeholder="e.g. Attempt any FIVE" />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8 }}>
                      {[['Total Items', 'totalItems'], ['No. of Item', 'noOfItems'], ['No. of Choices', 'noOfChoices'], ['Marks/Item', 'marksPerItem']].map(([lbl, field]) => (
                        <div key={field} style={{ flex: 1, minWidth: 70 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 2 }}>{lbl}</label>
                          <input type="number" min="0" style={inpSm} value={qt[field]} onChange={e => setQTypes(prev => prev.map((x, i) => i === idx ? { ...x, [field]: parseInt(e.target.value) || 0 } : x))} />
                        </div>
                      ))}
                      <button onClick={() => { setQTypes(prev => prev.map((x, i) => i === idx ? { ...x, saved: true } : x)); toast.success(`${qt.type} saved`); }}
                        style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          <button onClick={onClose} style={{ background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleGenerate} disabled={generating} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
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
  const [topTab, setTopTab] = useState('setup');    // setup | single | combined | history
  const [setupTab, setSetupTab] = useState('setup'); // setup | options

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
    onSuccess: (res) => { qc.setQueryData(['result-config'], res.data?.data); setLocalConfig(null); toast.success('Result config saved!'); },
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
      {/* Top tabs row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'setup', label: 'Result Setup' },
          { id: 'single', label: 'Single Assessment Result' },
          { id: 'combined', label: 'Combined Assessment Result' },
          { id: 'history', label: 'Result History' },
        ].map(t => (
          <button key={t.id} style={tabBtnStyle(topTab === t.id)} onClick={() => setTopTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {topTab === 'setup' && (
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
                                  <button onClick={() => setEditingGradeIdx(null)}
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
                                  <button onClick={() => handleChange({ grades: config.grades.filter((_, i) => i !== idx) })}
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
                      {['Sr.no', 'Name', 'Designation', 'Signature'].map(h => (
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
                          {sig.signatureUrl ? <img src={sig.signatureUrl} alt="sig" style={{ height: 40 }} /> : <em>No image</em>}
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9' }}>
                      {['Sr.no', 'Total Marks', 'Percentage', 'Remarks'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.finalRemarks.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                        <td style={{ padding: '8px 12px', color: '#94A3B8' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px', color: '#374151', fontWeight: 600 }}>Total Marks</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>
                          {r.minPercent === 0 ? `< ${r.maxPercent + 1}` : `≥ ${r.minPercent}`}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748B' }}>{r.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {topTab === 'single' && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Single Assessment Result</div>
            <div className="empty-state-sub"><Link to="/exams" style={{ color: TEAL }}>Go to Exams</Link> to generate results</div>
          </div>
        </div>
      )}

      {topTab === 'combined' && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <div className="empty-state-text">Combined Assessment Result</div>
            <div className="empty-state-sub">Select multiple exams to combine results</div>
          </div>
        </div>
      )}

      {topTab === 'history' && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🕐</div>
            <div className="empty-state-text">Result History</div>
            <div className="empty-state-sub">Past result publications will appear here</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN EXAMINATION PAGE
══════════════════════════════════════════════════ */
const MAIN_TABS = [
  { id: 'exam-setup',    label: 'Exam Setup' },
  { id: 'date-sheet',   label: 'Date Sheet' },
  { id: 'syllabus',     label: 'Syllabus' },
  { id: 'question-bank',label: 'Question Bank' },
  { id: 'results',      label: 'Results' },
];

export default function ExaminationPage() {
  const [activeTab, setActiveTab] = useState('exam-setup');

  return (
    <div className="page-content fade-in">
      {/* IlmForge Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NAVY }}>Examination</h1>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>ilmفورج</span>
      </div>

      {/* IlmForge underline tab bar */}
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {MAIN_TABS.map(tab => (
          <button
            key={tab.id}
            style={tabBtnStyle(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'exam-setup'    && <ExamSetupTab />}
      {activeTab === 'date-sheet'    && <DateSheetTab />}
      {activeTab === 'syllabus'      && <SyllabusTab />}
      {activeTab === 'question-bank' && <QuestionBankTab />}
      {activeTab === 'results'       && <ResultsTab />}
    </div>
  );
}
