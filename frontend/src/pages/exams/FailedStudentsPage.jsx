/**
 * IlmForge — Failed Students Report Page
 * Shows students who failed the exam, their failed subjects, and SMS tools.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { XCircle, MessageSquare, Download, AlertTriangle, Send } from 'lucide-react';
import api from '../../api/client';

/* ─── Helpers ────────────────────────────────────────── */
const errMsg = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function FailedStudentsPage() {
  const [classId,   setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [examId,    setExamId]    = useState('');
  const [smsBlasting, setSmsBlasting] = useState(false);
  const [smsRowIds,   setSmsRowIds]   = useState({});

  /* Master data */
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
  });

  /* Failed students */
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['failed-students', examId, sectionId],
    queryFn: () =>
      api.get(`/exams/${examId}/failed`, { params: { sectionId: sectionId || undefined } })
        .then(r => r.data.data),
    enabled: !!examId,
  });

  const selectedClass   = classes.find(c => String(c.id) === String(classId));
  const selectedExam    = exams.find(e => String(e.id) === String(examId));

  const students    = reportData?.students || reportData || [];
  const stats       = reportData?.stats || {};
  const totalAppeared  = stats.totalAppeared  ?? (students.length + (stats.totalPassed ?? 0));
  const totalFailed    = stats.totalFailed    ?? students.length;
  const totalAbsent    = stats.totalAbsent    ?? 0;
  const passPct        = stats.passPct        ?? (totalAppeared > 0 ? Math.round(((totalAppeared - totalFailed) / totalAppeared) * 100) : 0);

  /* SMS Blast — all failed parents */
  const handleSmsBlast = async () => {
    if (!examId) return;
    if (!window.confirm(`Send SMS to parents of all ${students.length} failed student(s)? This cannot be undone.`)) return;
    setSmsBlasting(true);
    try {
      const res = await api.post(`/exams/${examId}/results/sms-blast`, { sectionId: sectionId || undefined });
      const sent = res.data?.data?.sent ?? res.data?.sent ?? students.length;
      toast.success(`SMS sent to ${sent} parent(s) successfully.`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSmsBlasting(false);
    }
  };

  /* Per-row SMS */
  const handleRowSms = async (student) => {
    setSmsRowIds(prev => ({ ...prev, [student.studentId || student.id]: true }));
    try {
      await api.post(`/exams/${examId}/results/sms-blast`, {
        studentIds: [student.studentId || student.id],
      });
      toast.success(`SMS sent to parent of ${student.name}.`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSmsRowIds(prev => ({ ...prev, [student.studentId || student.id]: false }));
    }
  };

  /* Excel export */
  const handleExcel = async () => {
    if (!examId) return;
    try {
      const resp = await api.get(`/exams/${examId}/results/excel`, {
        params: { sectionId: sectionId || undefined, filter: 'failed' },
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href     = url;
      link.download = `failed-students-exam-${examId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  /* ─── Render ─────────────────────────────────────── */
  return (
    <div className="page-content fade-in">

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <XCircle size={22} color="#B91C1C" />
          Failed Students Report
        </h1>
        <p className="page-subtitle">View failed students, their weak subjects, and notify parents via SMS</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class *</label>
            <select
              className="form-select"
              value={classId}
              onChange={e => { setClassId(e.target.value); setSectionId(''); }}
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Section</label>
            <select
              className="form-select"
              value={sectionId}
              onChange={e => setSectionId(e.target.value)}
              disabled={!selectedClass?.sections?.length}
            >
              <option value="">All Sections</option>
              {(selectedClass?.sections || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Exam *</label>
            <select
              className="form-select"
              value={examId}
              onChange={e => setExamId(e.target.value)}
            >
              <option value="">Select Exam</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          {students.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm"
                style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA', height: 38 }}
                onClick={handleSmsBlast}
                disabled={smsBlasting}
              >
                <MessageSquare size={14} />
                {smsBlasting ? 'Sending…' : `SMS All (${students.length})`}
              </button>
              <button className="btn btn-outline" style={{ height: 38 }} onClick={handleExcel}>
                <Download size={14} /> Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No selection */}
      {!examId ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon"><AlertTriangle size={52} style={{ opacity: 0.15 }} /></div>
            <div className="empty-state-text">Select an exam to view the failed students report</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center" style={{ padding: 60 }}><div className="spinner" /></div>
      ) : error ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-text" style={{ color: '#B91C1C' }}>Failed to load report</div>
            <div className="empty-state-sub">{errMsg(error)}</div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="stats-grid-4" style={{ marginBottom: 16 }}>
            {[
              { l: 'Total Appeared', v: totalAppeared, c: '#1E3A5F', bg: '#EFF6FF' },
              { l: 'Total Failed',   v: totalFailed,   c: '#B91C1C', bg: '#FEE2E2' },
              { l: 'Pass %',         v: `${passPct}%`, c: '#15803D', bg: '#DCFCE7' },
              { l: 'Total Absent',   v: totalAbsent,   c: '#B45309', bg: '#FEF3C7' },
            ].map(item => (
              <div key={item.l} className="card" style={{ background: item.bg, border: 'none', padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.c }}>{item.v}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.l}</div>
              </div>
            ))}
          </div>

          {/* SMS banner */}
          {students.length > 0 && (
            <div style={{
              marginBottom: 14, padding: '10px 16px',
              background: '#FFF7ED', border: '1px solid #FED7AA',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertTriangle size={16} color="#F97316" />
              <span style={{ fontSize: 13, color: '#7C2D12', flex: 1 }}>
                <strong>{students.length}</strong> student(s) failed this exam.
                You can notify their parents individually or send a bulk SMS.
              </span>
              <button
                className="btn btn-sm"
                style={{ background: '#F97316', color: '#fff', border: 'none' }}
                onClick={handleSmsBlast}
                disabled={smsBlasting}
              >
                <Send size={13} /> {smsBlasting ? 'Sending…' : 'Notify All Parents'}
              </button>
            </div>
          )}

          {/* Table */}
          {students.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 48 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                <div className="empty-state-text" style={{ color: '#15803D' }}>No failed students!</div>
                <div className="empty-state-sub">All students passed this exam. Excellent!</div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#B91C1C' }}>
                  <XCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {students.length} Failed Student{students.length !== 1 ? 's' : ''} — {selectedExam?.title}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
                    onClick={handleSmsBlast}
                    disabled={smsBlasting}
                  >
                    <MessageSquare size={13} /> {smsBlasting ? 'Sending…' : 'SMS All Parents'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={handleExcel}>
                    <Download size={13} /> Excel
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Failed Subjects</th>
                      <th style={{ textAlign: 'center' }}>% Obtained</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Notify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const failedSubjects = s.failedSubjects || [];
                      const isSending     = smsRowIds[s.studentId || s.id];
                      const pct           = s.overallPct ?? s.percentage;
                      return (
                        <tr key={s.studentId || s.id} style={{ background: '#FEF2F2' }}>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                          <td style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700 }}>
                            {s.rollNo || `ST-${String(s.studentId || s.id).padStart(4, '0')}`}
                          </td>
                          <td style={{ fontWeight: 700, color: '#111827' }}>{s.name}</td>
                          <td style={{ color: '#374151', fontSize: 13 }}>
                            {s.className || selectedClass?.name || '—'}
                            {s.sectionName && (
                              <span style={{ color: '#94a3b8', marginLeft: 4 }}>{s.sectionName}</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {failedSubjects.length === 0 ? (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>Overall fail</span>
                              ) : (
                                failedSubjects.map((sub, si) => (
                                  <span
                                    key={si}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 3,
                                      padding: '3px 8px', borderRadius: 99,
                                      background: '#FEE2E2', color: '#B91C1C',
                                      fontSize: 11.5, fontWeight: 700,
                                      border: '1px solid #FECACA',
                                    }}
                                  >
                                    {sub.name}
                                    <span style={{ opacity: 0.75 }}>
                                      ({sub.obtained}/{sub.total})
                                    </span>
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: '#B91C1C' }}>
                            {s.isAbsent ? 'ABS' : (pct !== undefined && pct !== null ? `${pct}%` : '—')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {s.isAbsent ? (
                              <span className="badge badge-gray">Absent</span>
                            ) : (
                              <span className="badge badge-red">Fail</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              title="Send SMS to parent"
                              onClick={() => handleRowSms(s)}
                              disabled={isSending}
                              style={{
                                background: isSending ? '#F3F4F6' : '#FFF7ED',
                                color: isSending ? '#9CA3AF' : '#F97316',
                                border: '1px solid #FED7AA',
                                borderRadius: 6,
                                padding: '5px 9px',
                                cursor: isSending ? 'not-allowed' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 12, fontWeight: 600,
                              }}
                            >
                              <MessageSquare size={12} />
                              {isSending ? '…' : 'SMS'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer note */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #E5E7EB', background: '#FFF9F9' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Failing criteria: overall percentage below passing threshold, or failed in one or more subjects.
                  SMS is sent to the parent/guardian contact on file.
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
