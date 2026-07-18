/**
 * IlmForge — Exam Marks Entry (v3 Enterprise Theme)
 * Per-subject marks entry with subjectId, subject progress panel,
 * Excel template download, Excel import, sticky save bar.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Save, ArrowLeft, Users, BookOpen,
  Download, Upload, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ── Grade helpers ─────────────────────────────────────────────────── */
const gradeFor = (obtained, total, absent) => {
  if (absent) return 'ABS';
  if (obtained === '' || obtained === null || obtained === undefined || !total) return '—';
  const pct = (parseFloat(obtained) / parseFloat(total)) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

const gradeBadgeClass = g => {
  if (!g || g === '—') return 'badge-secondary';
  if (g === 'ABS') return 'badge-warning';
  if (g === 'A+') return 'badge-success';   // green
  if (g === 'A')  return 'badge-primary';   // blue
  if (g === 'B')  return 'badge-info';      // teal
  if (g === 'C')  return 'badge-warning';   // orange
  if (g === 'D')  return 'badge-secondary'; // grey
  return 'badge-danger';                    // red  (F)
};

const pctFor = (obtained, total, absent) => {
  if (absent || obtained === '' || !total) return null;
  return Math.round((parseFloat(obtained) / parseFloat(total)) * 100);
};

/* ── Subject progress dot color ───────────────────────────────────── */
const dotColor = (filled, total) => {
  if (!total) return 'var(--text-muted)';
  const ratio = filled / total;
  if (ratio === 1) return 'var(--stat-green)';
  if (ratio >= 0.5) return 'var(--stat-yellow)';
  return 'var(--stat-red)';
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function ExamMarksPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  /* marks[subjectId][studentId] = { obtained, total, theory, practical, absent } */
  const [marks, setMarks] = useState({});
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [totalMarksDefault, setTotalMarksDefault] = useState(100);
  const [showTheory, setShowTheory] = useState(false);
  const [showPractical, setShowPractical] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const fileInputRef = useRef(null);

  /* ── Remote data ──────────────────────────────────────────────────── */
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const { data: allExams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data),
  });

  const exam = allExams?.find(e => e.id === parseInt(id));
  const activeClassId = exam?.classId || selectedClass || null;

  const { data: subjects } = useQuery({
    queryKey: ['subjects', activeClassId],
    enabled: !!activeClassId,
    queryFn: () =>
      api.get('/classes/subjects', { params: { classId: activeClassId } })
        .then(r => r.data.data || []),
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-exam', activeClassId],
    enabled: !!activeClassId,
    queryFn: () =>
      api.get('/students', {
        params: { classId: activeClassId, status: 'active', limit: 150 },
      }).then(r => r.data.data),
  });

  const { data: existingMarks, isLoading: existingLoading } = useQuery({
    queryKey: ['exam-marks-existing', id, selectedSubjectId],
    enabled: !!selectedSubjectId,
    queryFn: () =>
      api.get(`/exams/${id}/results`, { params: { subjectId: selectedSubjectId } })
        .then(r => r.data.data || []),
  });

  const { data: allSubjectProgress } = useQuery({
    queryKey: ['exam-subject-progress', id],
    enabled: !!id,
    queryFn: () =>
      api.get(`/exams/${id}/results`).then(r => r.data.data || []),
  });

  /* ── Auto-select first subject ────────────────────────────────────── */
  useEffect(() => {
    if (subjects?.length && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects]);

  /* ── Init marks from existing data ───────────────────────────────── */
  useEffect(() => {
    if (!students?.length || !selectedSubjectId) return;
    setMarks(prev => {
      const subjMarks = { ...(prev[selectedSubjectId] || {}) };
      students.forEach(s => {
        if (!subjMarks[s.id]) {
          const ex = existingMarks?.find(em => em.studentId === s.id);
          subjMarks[s.id] = {
            obtained: ex ? String(ex.obtainedMarks ?? '') : '',
            total: ex ? String(ex.totalMarks ?? totalMarksDefault) : String(totalMarksDefault),
            theory: ex ? String(ex.theoryMarks ?? '') : '',
            practical: ex ? String(ex.practicalMarks ?? '') : '',
            absent: ex ? !!ex.isAbsent : false,
          };
        }
      });
      return { ...prev, [selectedSubjectId]: subjMarks };
    });
  }, [students, existingMarks, selectedSubjectId]);

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const subjMarks = marks[selectedSubjectId] || {};

  const setStudentMark = (studentId, field, value) => {
    setMarks(prev => ({
      ...prev,
      [selectedSubjectId]: {
        ...(prev[selectedSubjectId] || {}),
        [studentId]: {
          ...(prev[selectedSubjectId]?.[studentId] || {}),
          [field]: value,
        },
      },
    }));
  };

  const applyDefaultTotal = () => {
    if (!selectedSubjectId) return;
    setMarks(prev => {
      const subjM = { ...(prev[selectedSubjectId] || {}) };
      Object.keys(subjM).forEach(sid => {
        subjM[sid] = { ...subjM[sid], total: String(totalMarksDefault) };
      });
      return { ...prev, [selectedSubjectId]: subjM };
    });
    toast.success(`Total marks set to ${totalMarksDefault} for all students`);
  };

  const markAllPresent = () => {
    if (!selectedSubjectId) return;
    setMarks(prev => {
      const subjM = { ...(prev[selectedSubjectId] || {}) };
      Object.keys(subjM).forEach(sid => { subjM[sid] = { ...subjM[sid], absent: false }; });
      return { ...prev, [selectedSubjectId]: subjM };
    });
    toast('All marked Present');
  };

  const markAllAbsent = () => {
    if (!selectedSubjectId) return;
    setMarks(prev => {
      const subjM = { ...(prev[selectedSubjectId] || {}) };
      Object.keys(subjM).forEach(sid => { subjM[sid] = { ...subjM[sid], absent: true, obtained: '' }; });
      return { ...prev, [selectedSubjectId]: subjM };
    });
    toast('All marked Absent');
  };

  /* ── Statistics ───────────────────────────────────────────────────── */
  const total = students?.length || 0;
  const filled = Object.values(subjMarks).filter(
    m => m.absent || (m.obtained !== '' && m.obtained !== null)
  ).length;

  /* Subject progress map */
  const progressBySubject = {};
  if (subjects && allSubjectProgress && students) {
    subjects.forEach(sub => {
      const subResults = allSubjectProgress.filter(r => r.subjectId === sub.id);
      progressBySubject[sub.id] = { filled: subResults.length, total: students.length };
    });
    Object.entries(marks).forEach(([sid, studentMap]) => {
      const subId = parseInt(sid);
      const localFilled = Object.values(studentMap).filter(
        m => m.absent || (m.obtained !== '' && m.obtained !== null)
      ).length;
      if (localFilled > (progressBySubject[subId]?.filled || 0)) {
        progressBySubject[subId] = { filled: localFilled, total: students.length };
      }
    });
  }

  /* ── Validation helper ────────────────────────────────────────────── */
  const hasInvalidMarks = () => {
    if (!selectedSubjectId || !students?.length) return false;
    return students.some(s => {
      const m = subjMarks[s.id];
      if (!m || m.absent) return false;
      const obt = m.obtained !== '' ? parseFloat(m.obtained) : null;
      const tot = parseFloat(m.total || totalMarksDefault) || 0;
      return obt !== null && tot > 0 && obt > tot;
    });
  };

  /* ── Save mutation ────────────────────────────────────────────────── */
  const save = useMutation({
    mutationFn: () => {
      if (!selectedSubjectId) throw new Error('No subject selected');
      if (hasInvalidMarks()) {
        throw new Error('Some students have obtained marks exceeding maximum marks. Please fix the highlighted rows first.');
      }
      const payload = (students || []).map(s => {
        const m = subjMarks[s.id] || { obtained: '', total: String(totalMarksDefault), theory: '', practical: '', absent: false };
        return {
          studentId: s.id,
          subjectId: selectedSubjectId,
          obtainedMarks: m.absent ? 0 : (parseFloat(m.obtained) || 0),
          totalMarks: parseFloat(m.total) || totalMarksDefault,
          theoryMarks: m.theory !== '' ? parseFloat(m.theory) : null,
          practicalMarks: m.practical !== '' ? parseFloat(m.practical) : null,
          isAbsent: !!m.absent,
        };
      });
      return api.post(`/exams/${id}/marks`, { marks: payload });
    },
    onSuccess: (res) => {
      const count = res?.data?.data?.length ?? (students?.length ?? 0);
      toast.success(`Marks saved for ${count} students!`);
      qc.invalidateQueries(['exam-marks-existing', id, selectedSubjectId]);
      qc.invalidateQueries(['exam-subject-progress', id]);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save marks'),
  });

  /* ── Excel template download ──────────────────────────────────────── */
  const handleDownloadTemplate = async () => {
    if (!activeClassId) return toast.error('Select a class first');
    try {
      const res = await api.get('/exams/template/excel', {
        params: { examId: id, classId: activeClassId },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${id}_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  /* ── Excel import ─────────────────────────────────────────────────── */
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/exams/${id}/marks/excel-import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Marks imported successfully!');
      qc.invalidateQueries(['exam-marks-existing', id, selectedSubjectId]);
      qc.invalidateQueries(['exam-subject-progress', id]);
      setMarks(prev => {
        const next = { ...prev };
        delete next[selectedSubjectId];
        return next;
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    }
    e.target.value = '';
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="page-content fade-up">

      {/* Page Header Card */}
      <div className="card" style={{ marginBottom: 16, padding: 0 }}>
        <div className="content-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/exams" className="btn btn-outline btn-sm btn-icon">
              <ArrowLeft size={15} />
            </Link>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Marks Entry</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>
                {exam?.title || 'Loading...'}
                {selectedSubjectId && subjects?.find(s => s.id === selectedSubjectId) && (
                  <> &middot; <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    {subjects.find(s => s.id === selectedSubjectId)?.name}
                  </span></>
                )}
                &nbsp;&middot;&nbsp;
                <span style={{ color: filled === total && total > 0 ? 'var(--stat-green)' : 'var(--primary)', fontWeight: 600 }}>
                  {filled}/{total} students filled
                </span>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate} title="Download Excel template">
              <Download size={14} /> Template
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()} title="Import marks from Excel">
              <Upload size={14} /> Import
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImport} />
            <Link to={`/exams/${id}/results`} className="btn btn-outline btn-sm">
              View Results
            </Link>
            <button
              className="btn btn-primary"
              onClick={() => save.mutate()}
              disabled={save.isPending || total === 0 || !selectedSubjectId || hasInvalidMarks()}
              title={hasInvalidMarks() ? 'Fix invalid marks (red rows) before saving' : undefined}
            >
              <Save size={14} /> {save.isPending ? 'Saving...' : 'Save All Marks'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Controls Card */}
      <div className="card" style={{ marginBottom: 14, padding: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Class selector or display */}
          {!exam?.classId && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
              <label className="form-label">
                <Users size={12} style={{ marginRight: 4 }} />Select Class *
              </label>
              <select
                className="form-select"
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setMarks({}); setSelectedSubjectId(null); }}
              >
                <option value="">— Choose a class —</option>
                {(classes || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {exam?.classId && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                <Users size={12} style={{ marginRight: 4 }} />Class
              </label>
              <div
                className="form-control"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, width: 'auto', display: 'inline-block', minWidth: 160 }}
              >
                {(classes || []).find(c => c.id === exam.classId)?.name || `Class ${exam.classId}`}
              </div>
            </div>
          )}

          {/* Total Marks default */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <BookOpen size={12} style={{ marginRight: 4 }} />Total Marks (default)
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                className="form-control"
                style={{ width: 90 }}
                value={totalMarksDefault}
                onChange={e => setTotalMarksDefault(parseInt(e.target.value) || 100)}
              />
              <button className="btn btn-sm btn-outline" onClick={applyDefaultTotal}>Apply All</button>
            </div>
          </div>

          {/* Optional column toggles */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Optional Columns</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${showTheory ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowTheory(v => !v)}
              >
                Theory {showTheory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <button
                className={`btn btn-sm ${showPractical ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowPractical(v => !v)}
              >
                Practical {showPractical ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* Quick actions */}
          {total > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quick Actions</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-outline" onClick={markAllPresent}>All Present</button>
                <button className="btn btn-sm btn-danger" onClick={markAllAbsent}>All Absent</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout: subject panel + marks table */}
      {activeClassId && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Subject Progress Panel */}
          <div className="card" style={{ width: 220, flexShrink: 0, padding: 0, position: 'sticky', top: 16 }}>
            <div className="card-header">
              <h3 style={{ fontSize: 13 }}>Subject Progress</h3>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {(!subjects || subjects.length === 0) && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>No subjects found</div>
              )}
              {(subjects || []).map(sub => {
                const prog = progressBySubject[sub.id] || { filled: 0, total };
                const isSelected = sub.id === selectedSubjectId;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`tab-btn${isSelected ? ' active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left',
                      padding: '7px 10px', marginBottom: 4,
                      borderRadius: 4,
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      background: isSelected ? 'var(--primary-light)' : '#fff',
                      borderBottom: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                    }}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: dotColor(prog.filled, prog.total),
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isSelected ? 700 : 500, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {prog.filled}/{prog.total}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side: subject tabs + progress + table */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Subject Tabs (tab-strip pattern) */}
            {subjects?.length > 0 && (
              <div className="card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
                <div className="tab-strip">
                  {(subjects || []).map(sub => (
                    <button
                      key={sub.id}
                      className={`tab-btn${sub.id === selectedSubjectId ? ' active' : ''}`}
                      onClick={() => setSelectedSubjectId(sub.id)}
                    >
                      {sub.name}
                      {(() => {
                        const prog = progressBySubject[sub.id];
                        if (!prog) return null;
                        const isComplete = prog.filled === prog.total && prog.total > 0;
                        return (
                          <span
                            className={`badge ${isComplete ? 'badge-success' : 'badge-secondary'}`}
                            style={{ fontSize: 10, marginLeft: 4 }}
                          >
                            {prog.filled}/{prog.total}
                          </span>
                        );
                      })()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {total > 0 && selectedSubjectId && (
              <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>Progress: {filled}/{total} students filled</span>
                  <span style={{ fontWeight: 700, color: filled === total ? 'var(--stat-green)' : 'var(--primary)' }}>
                    {total ? Math.round((filled / total) * 100) : 0}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${total ? (filled / total) * 100 : 0}%`,
                      background: filled === total ? 'var(--stat-green)' : 'var(--primary)',
                      transition: 'width .2s',
                    }}
                  />
                </div>
              </div>
            )}

            {/* No subject selected */}
            {!selectedSubjectId && (
              <div className="card">
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-state-icon">📚</div>
                  <div className="empty-state-text">Select a Subject</div>
                  <div className="empty-state-sub">
                    Choose a subject from the left panel or the tabs above to enter marks
                  </div>
                </div>
              </div>
            )}

            {/* Marks Table */}
            {selectedSubjectId && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {studentsLoading || existingLoading ? (
                  <div className="loading-center" style={{ padding: 40 }}>
                    <div className="spinner" />
                  </div>
                ) : (
                  <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}>#</th>
                          <th style={{ width: 80 }}>Roll No</th>
                          <th>Student Name</th>
                          <th style={{ width: 100 }}>Total</th>
                          {showTheory && <th style={{ width: 100 }}>Theory</th>}
                          {showPractical && <th style={{ width: 100 }}>Practical</th>}
                          <th style={{ width: 120 }}>Obtained</th>
                          <th style={{ width: 90 }}>Absent</th>
                          <th style={{ width: 60 }}>Grade</th>
                          <th style={{ width: 64 }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(students || []).map((s, idx) => {
                          const m = subjMarks[s.id] || {
                            obtained: '', total: String(totalMarksDefault),
                            theory: '', practical: '', absent: false,
                          };
                          const grade = gradeFor(m.obtained, m.total, m.absent);
                          const pct = pctFor(m.obtained, m.total, m.absent);
                          const maxAllowed = parseFloat(m.total || totalMarksDefault) || 0;
                          const obtVal     = m.obtained !== '' ? parseFloat(m.obtained) : null;
                          const rowInvalid = !m.absent && obtVal !== null && maxAllowed > 0 && obtVal > maxAllowed;

                          return (
                            <tr key={s.id} style={{ background: rowInvalid ? '#f8d7da' : m.absent ? '#fff3cd' : undefined }}>
                              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>

                              <td>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>
                                  {s.rollNo || '—'}
                                </span>
                              </td>

                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {(() => {
                                    const photo = typeof window !== 'undefined'
                                      ? localStorage.getItem(`photo_student_${s.id}`)
                                      : null;
                                    return photo ? (
                                      <img src={photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                      <div style={{
                                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                        background: s.gender === 'female'
                                          ? 'linear-gradient(135deg,#e91e8c,#c2185b)'
                                          : 'var(--primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 700, fontSize: 11,
                                      }}>
                                        {s.name?.charAt(0)}
                                      </div>
                                    );
                                  })()}
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                                </div>
                              </td>

                              {/* Total marks */}
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  style={{ width: 80, height: 32, padding: '4px 8px', fontSize: 12 }}
                                  value={m.total || totalMarksDefault}
                                  disabled={m.absent}
                                  min="1"
                                  onChange={e => setStudentMark(s.id, 'total', e.target.value)}
                                />
                              </td>

                              {/* Theory (optional) */}
                              {showTheory && (
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: 80, height: 32, padding: '4px 8px', fontSize: 12 }}
                                    value={m.theory}
                                    disabled={m.absent}
                                    placeholder="0"
                                    min="0"
                                    onChange={e => setStudentMark(s.id, 'theory', e.target.value)}
                                  />
                                </td>
                              )}

                              {/* Practical (optional) */}
                              {showPractical && (
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: 80, height: 32, padding: '4px 8px', fontSize: 12 }}
                                    value={m.practical}
                                    disabled={m.absent}
                                    placeholder="0"
                                    min="0"
                                    onChange={e => setStudentMark(s.id, 'practical', e.target.value)}
                                  />
                                </td>
                              )}

                              {/* Obtained marks */}
                              <td>
                                {(() => {
                                  const maxAllowed = parseFloat(m.total || totalMarksDefault) || 0;
                                  const obtVal    = m.obtained !== '' ? parseFloat(m.obtained) : null;
                                  const isInvalid = obtVal !== null && maxAllowed > 0 && obtVal > maxAllowed;
                                  const isGood    = obtVal !== null && !isInvalid;
                                  return (
                                    <input
                                      type="number"
                                      className="form-control"
                                      style={{
                                        width: 100, height: 32, padding: '4px 8px', fontSize: 12,
                                        borderColor: isInvalid ? 'var(--stat-red)' : undefined,
                                        outline:     isInvalid ? '2px solid var(--stat-red)' : undefined,
                                        background:
                                          isInvalid ? '#f8d7da'
                                          : isGood   ? '#d4edda'
                                          : undefined,
                                      }}
                                      title={isInvalid ? `Cannot exceed max marks (${maxAllowed})` : undefined}
                                      value={m.obtained}
                                      disabled={m.absent}
                                      placeholder="0"
                                      min="0"
                                      max={m.total || totalMarksDefault}
                                      onChange={e => setStudentMark(s.id, 'obtained', e.target.value)}
                                    />
                                  );
                                })()}
                              </td>

                              {/* Absent checkbox */}
                              <td>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={m.absent || false}
                                    style={{ width: 16, height: 16, accentColor: 'var(--stat-red)' }}
                                    onChange={e => {
                                      setStudentMark(s.id, 'absent', e.target.checked);
                                      if (e.target.checked) setStudentMark(s.id, 'obtained', '');
                                    }}
                                  />
                                  <span style={{ fontSize: 12, color: m.absent ? 'var(--stat-red)' : 'var(--text-muted)', fontWeight: m.absent ? 700 : 400 }}>
                                    {m.absent ? 'ABS' : 'Present'}
                                  </span>
                                </label>
                              </td>

                              {/* Grade badge */}
                              <td>
                                <span className={`badge ${gradeBadgeClass(grade)}`} style={{ fontSize: 12, fontWeight: 800 }}>
                                  {grade}
                                </span>
                              </td>

                              {/* Percentage */}
                              <td style={{
                                fontSize: 12, fontWeight: 600,
                                color: pct !== null ? (pct >= 50 ? 'var(--stat-green)' : 'var(--stat-red)') : 'var(--text-muted)',
                              }}>
                                {pct !== null ? `${pct}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}

                        {(!students || students.length === 0) && (
                          <tr>
                            <td
                              colSpan={6 + (showTheory ? 1 : 0) + (showPractical ? 1 : 0) + 2}
                              style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}
                            >
                              {activeClassId
                                ? 'No active students in this class'
                                : 'Select a class to load students'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No class selected state */}
      {!activeClassId && (
        <div className="card">
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">Select a Class</div>
            <div className="empty-state-sub">Choose a class above to load subjects and students</div>
          </div>
        </div>
      )}

      {/* Sticky Save Footer Bar */}
      {total > 0 && selectedSubjectId && (
        <div style={{
          position: 'sticky', bottom: 16, marginTop: 14,
          display: 'flex', justifyContent: 'flex-end',
          gap: 12, alignItems: 'center',
        }}>
          <div className="card" style={{
            margin: 0, padding: '8px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>
                {subjects?.find(s => s.id === selectedSubjectId)?.name}
              </strong>
              &nbsp;&mdash;&nbsp;
              <span className={`badge ${filled === total && total > 0 ? 'badge-success' : 'badge-primary'}`}>
                {filled}/{total} filled
              </span>
            </span>
            <button
              className="btn btn-success"
              style={{ padding: '9px 28px', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,166,90,0.35)' }}
              onClick={() => save.mutate()}
              disabled={save.isPending || hasInvalidMarks()}
              title={hasInvalidMarks() ? 'Fix invalid marks (red rows) before saving' : undefined}
            >
              <Save size={15} /> {save.isPending ? 'Saving...' : 'Save All Marks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
