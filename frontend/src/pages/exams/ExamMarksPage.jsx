/**
 * IlmForge — Exam Marks Entry (standalone, dropdown-based)
 * Select Exam + Class → load students + subjects → enter marks per subject → save
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

function getGrade(obtained, max) {
  if (obtained === '' || obtained === undefined || obtained === null || !max) return null;
  const pct = (Number(obtained) / Number(max)) * 100;
  if (pct >= 90) return { g: 'A+', color: '#059669', bg: '#dcfce7' };
  if (pct >= 80) return { g: 'A',  color: '#0073b7', bg: '#dbeafe' };
  if (pct >= 70) return { g: 'B',  color: '#7c3aed', bg: '#ede9fe' };
  if (pct >= 60) return { g: 'C',  color: '#D97706', bg: '#fef3c7' };
  if (pct >= 50) return { g: 'D',  color: '#ea580c', bg: '#ffedd5' };
  return { g: 'F', color: '#DC2626', bg: '#fee2e2' };
}

export default function ExamMarksPage() {
  const { id: urlExamId } = useParams(); // may be undefined if accessed standalone
  const qc = useQueryClient();
  const [selectedExam, setSelectedExam]   = useState(urlExamId || '');
  const [selectedClass, setSelectedClass] = useState('');
  // marks[studentId][subjectId] = obtainedMarks string
  const [marks, setMarks]   = useState({});
  const [saving, setSaving] = useState(false);

  /* ── Remote data ───────────────────────────────────────────────── */
  const { data: exams = [] } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-for-marks', selectedClass],
    queryFn: () =>
      api.get('/students', { params: { classId: selectedClass, status: 'active', limit: 200 } })
         .then(r => r.data.data || []),
    enabled: !!selectedClass,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-for-class', selectedClass],
    queryFn: () =>
      api.get('/subjects', { params: { classId: selectedClass } })
         .then(r => r.data.data || []),
    enabled: !!selectedClass,
  });

  /* Pre-fill existing marks when exam + class both selected */
  useQuery({
    queryKey: ['exam-marks-prefill', selectedExam, selectedClass],
    queryFn: () =>
      api.get(`/exams/${selectedExam}/results`, { params: { classId: selectedClass } })
         .then(r => r.data.data || []),
    enabled: !!selectedExam && !!selectedClass,
    onSuccess: (data) => {
      const m = {};
      (data || []).forEach(row => {
        const sId = String(row.studentId);
        const subId = String(row.subjectId || 'total');
        if (!m[sId]) m[sId] = {};
        m[sId][subId] = String(row.obtainedMarks ?? '');
      });
      setMarks(m);
    },
  });

  /* ── Helpers ───────────────────────────────────────────────────── */
  const setMark = (studentId, subjectId, value) => {
    setMarks(prev => ({
      ...prev,
      [String(studentId)]: {
        ...(prev[String(studentId)] || {}),
        [String(subjectId)]: value,
      },
    }));
  };

  /* ── Save ──────────────────────────────────────────────────────── */
  const saveMarks = async () => {
    if (!selectedExam || !selectedClass) {
      toast.error('Please select exam and class first');
      return;
    }
    setSaving(true);
    try {
      const exam      = exams.find(e => String(e.id) === String(selectedExam));
      const maxMarks  = exam?.totalMarks || 100;
      const subjectsToUse = subjects.length > 0 ? subjects : [{ id: 'total', name: 'Total' }];

      const marksPayload = [];
      students.forEach(student => {
        const studentMarks = marks[String(student.id)] || {};
        subjectsToUse.forEach(sub => {
          const val = studentMarks[String(sub.id)];
          if (val !== '' && val !== undefined && val !== null) {
            marksPayload.push({
              studentId:     parseInt(student.id),
              subjectId:     sub.id !== 'total' ? parseInt(sub.id) : null,
              obtainedMarks: parseFloat(val) || 0,
              totalMarks:    maxMarks,
              isAbsent:      false,
            });
          }
        });
      });

      if (marksPayload.length === 0) {
        toast.error('No marks entered yet');
        setSaving(false);
        return;
      }

      await api.post(`/exams/${selectedExam}/marks`, { marks: marksPayload });
      toast.success(`Marks saved for ${students.length} students!`);
      qc.invalidateQueries({ queryKey: ['exam-marks-prefill', selectedExam, selectedClass] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  /* ── Sync URL param → state once exams load ────────────────────── */
  useEffect(() => {
    if (urlExamId && exams.length && !selectedExam) {
      setSelectedExam(String(urlExamId));
    }
  }, [urlExamId, exams.length]);

  /* ── Derived ────────────────────────────────────────────────────── */
  const exam     = exams.find(e => String(e.id) === String(selectedExam));
  const maxMarks = exam?.totalMarks || 100;
  const subjectsToShow = subjects.length > 0 ? subjects : (selectedClass ? [{ id: 'total', name: 'Total Marks' }] : []);
  const bothSelected = !!selectedExam && !!selectedClass;

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="page-content fade-in">

      {/* Page Header */}
      <div className="ilm-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="ilm-page-title">✏️ Enter Marks</h1>
          <p className="ilm-page-subtitle">Select exam and class, then enter marks per student</p>
        </div>
        <button
          onClick={saveMarks}
          disabled={saving || !bothSelected}
          style={{
            background: 'linear-gradient(135deg,#059669,#10B981)',
            color: 'white', border: 'none', borderRadius: 999,
            padding: '10px 24px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            opacity: (saving || !bothSelected) ? 0.6 : 1,
          }}
        >
          <Save size={15} /> {saving ? 'Saving...' : 'Save All Marks'}
        </button>
      </div>

      {/* Filters */}
      <div className="ilm-card" style={{ marginBottom: 16 }}>
        <div className="ilm-card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="ilm-label">Select Exam *</label>
            {urlExamId && exam ? (
              <div style={{ padding: '10px 14px', border: '1.5px solid #bfdbfe', borderRadius: 10, fontSize: 13, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>
                {exam.title} ({exam.term || exam.type || ''})
              </div>
            ) : (
              <select
                value={selectedExam}
                onChange={e => { setSelectedExam(e.target.value); setMarks({}); }}
                className="form-select"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}
              >
                <option value="">Choose exam...</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title} ({e.term || e.type || ''})</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="ilm-label">Select Class *</label>
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setMarks({}); }}
              className="form-select"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}
            >
              <option value="">Choose class...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {exam && (
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '8px 16px', border: '1px solid #bfdbfe', fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
                Max Marks: {maxMarks}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marks Table */}
      {!bothSelected ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.45)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <h3 style={{ color: '#1e3a5f', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Select Exam and Class</h3>
          <p style={{ color: '#64748b', fontSize: 13 }}>Choose an exam and class above to start entering marks</p>
        </div>
      ) : loadingStudents ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 16 }}>
          <div style={{ fontSize: 40 }}>👥</div>
          <p style={{ color: '#64748b' }}>No active students in this class</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.45)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(27,47,110,0.06)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#1B2F6E', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '2px solid rgba(27,47,110,0.1)' }}>Student</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#1B2F6E', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '2px solid rgba(27,47,110,0.1)' }}>Roll No</th>
                  {subjectsToShow.map(sub => (
                    <th key={sub.id} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#1B2F6E', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '2px solid rgba(27,47,110,0.1)', minWidth: 130 }}>
                      {sub.name}<br />
                      <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>/{maxMarks}</span>
                    </th>
                  ))}
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#1B2F6E', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '2px solid rgba(27,47,110,0.1)' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => {
                  const studentMarks = marks[String(student.id)] || {};
                  const firstSubId   = subjectsToShow[0]?.id;
                  const firstVal     = firstSubId ? studentMarks[String(firstSubId)] : undefined;
                  const grade        = getGrade(firstVal, maxMarks);

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid rgba(27,47,110,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(27,47,110,0.01)' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b' }}>{student.name}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>{student.rollNo || '—'}</td>

                      {subjectsToShow.map(sub => {
                        const key     = String(sub.id);
                        const val     = studentMarks[key] ?? '';
                        const g       = getGrade(val, maxMarks);
                        const isOver  = val !== '' && Number(val) > Number(maxMarks);
                        const isNeg   = val !== '' && Number(val) < 0;
                        const invalid = isOver || isNeg;

                        return (
                          <td key={sub.id} style={{ padding: '8px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                value={val}
                                onChange={e => setMark(student.id, sub.id, e.target.value)}
                                placeholder="—"
                                style={{
                                  width: 70, textAlign: 'center',
                                  padding: '7px 8px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                                  border: invalid ? '2px solid #DC2626' : '1.5px solid #e2e8f0',
                                  background: invalid ? '#fef2f2' : val !== '' ? '#f0fdf4' : 'white',
                                  outline: 'none', transition: 'all 0.15s',
                                }}
                                onFocus={e => { e.target.style.borderColor = '#1B2F6E'; e.target.style.boxShadow = '0 0 0 3px rgba(27,47,110,0.1)'; }}
                                onBlur={e => { e.target.style.borderColor = invalid ? '#DC2626' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                              />
                              {g && (
                                <span style={{ background: g.bg, color: g.color, padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
                                  {g.g}
                                </span>
                              )}
                            </div>
                            {isOver && <div style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>Max {maxMarks}</div>}
                          </td>
                        );
                      })}

                      {/* Overall grade based on first subject */}
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        {grade ? (
                          <span style={{ background: grade.bg, color: grade.color, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                            {grade.g}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer save bar */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(27,47,110,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(27,47,110,0.02)' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{students.length} students · {subjectsToShow.length} subject{subjectsToShow.length !== 1 ? 's' : ''}</span>
            <button
              onClick={saveMarks}
              disabled={saving}
              style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: 'white', border: 'none', borderRadius: 999, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={13} /> {saving ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
