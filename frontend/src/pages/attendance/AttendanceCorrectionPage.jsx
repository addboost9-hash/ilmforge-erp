/** Attendance Correction — submit correction requests and admin approve/reject */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Edit2, CheckCircle, XCircle, Clock, AlertTriangle, Search } from 'lucide-react';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'leave'];

const STATUS_STYLE = {
  present:  { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  absent:   { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  late:     { bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
  leave:    { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  pending:  { bg: '#FEF9C3', color: '#A16207', border: '#FDE047' },
  approved: { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  rejected: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

export default function AttendanceCorrectionPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  // --- Tabs: submit | admin ---
  const [tab, setTab] = useState('submit');

  // --- Submit correction form state ---
  const [form, setForm] = useState({
    classId: '',
    sectionId: '',
    date: today,
    studentId: '',
    newStatus: '',
    reason: '',
  });
  const [search, setSearch] = useState('');

  // --- Fetch classes ---
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });
  const selectedClass = (classes || []).find(c => String(c.id) === String(form.classId));
  const sections = selectedClass?.sections || [];

  // --- Fetch students for selected class/section ---
  const { data: studentsData } = useQuery({
    queryKey: ['students-for-correction', form.classId, form.sectionId],
    enabled: !!form.classId,
    queryFn: () =>
      api.get('/students', {
        params: { classId: form.classId, sectionId: form.sectionId || undefined, limit: 200 },
      }).then(r => r.data.data || r.data),
  });
  const students = studentsData?.data || studentsData || [];
  const filteredStudents = search.trim()
    ? students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNo?.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  // --- Fetch existing attendance for selected student + date ---
  const { data: existingAtt } = useQuery({
    queryKey: ['att-for-correction', form.studentId, form.date],
    enabled: !!form.studentId && !!form.date,
    queryFn: () =>
      api.get('/attendance/student', { params: { studentId: form.studentId, date: form.date } })
        .then(r => r.data.data)
        .catch(() => null),
  });

  // --- Submit correction request ---
  const submitCorrection = useMutation({
    mutationFn: () =>
      api.post('/attendance/corrections', {
        attendanceId: existingAtt?.id,
        studentId: parseInt(form.studentId),
        date: form.date,
        currentStatus: existingAtt?.status || 'unknown',
        newStatus: form.newStatus,
        reason: form.reason,
      }),
    onSuccess: () => {
      toast.success('Correction request submitted');
      qc.invalidateQueries({ queryKey: ['att-corrections-pending'] });
      setForm(f => ({ ...f, studentId: '', newStatus: '', reason: '' }));
      setSearch('');
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to submit correction'),
  });

  // --- Admin: fetch pending corrections ---
  const { data: pendingList = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['att-corrections-pending'],
    queryFn: () =>
      api.get('/attendance/corrections', { params: { status: 'pending', limit: 50 } })
        .then(r => r.data.data || [])
        .catch(() => []),
  });

  // --- Admin: approve/reject ---
  const decide = useMutation({
    mutationFn: ({ id, decision, adminNote }) =>
      api.patch(`/attendance/corrections/${id}`, { decision, adminNote }),
    onSuccess: (_, vars) => {
      toast.success(`Correction ${vars.decision}`);
      qc.invalidateQueries({ queryKey: ['att-corrections-pending'] });
    },
    onError: err => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const [adminNotes, setAdminNotes] = useState({});

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Edit2 size={20} color="#f59e0b" /> Attendance Corrections
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
          Submit correction requests and admin approval workflow with full audit trail
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #E2E8F0' }}>
        {[
          { key: 'submit', label: 'Submit Correction', icon: <Edit2 size={14} /> },
          {
            key: 'admin',
            label: `Pending Approvals${pendingList.length > 0 ? ` (${pendingList.length})` : ''}`,
            icon: <AlertTriangle size={14} />,
          },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'none',
              color: tab === t.key ? '#0D9488' : '#64748B',
              borderBottom: tab === t.key ? '2px solid #0D9488' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Submit Correction ── */}
      {tab === 'submit' && (
        <>
          {/* Step 1: Select class, section, date */}
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>
              Step 1 — Select Class & Date
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label">Class *</label>
                <select
                  className="form-select"
                  style={{ width: 160 }}
                  value={form.classId}
                  onChange={e => setForm({ ...form, classId: e.target.value, sectionId: '', studentId: '' })}
                >
                  <option value="">Select Class</option>
                  {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Section</label>
                <select
                  className="form-select"
                  style={{ width: 130 }}
                  value={form.sectionId}
                  onChange={e => setForm({ ...form, sectionId: e.target.value, studentId: '' })}
                  disabled={!form.classId || sections.length === 0}
                >
                  <option value="">All Sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 160 }}
                  value={form.date}
                  max={today}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Step 2: Select student */}
          {form.classId && (
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>
                Step 2 — Select Student
              </div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 30, maxWidth: 320 }}
                  placeholder="Search by name or roll no..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No students found</div>
                ) : (
                  filteredStudents.map(s => (
                    <div
                      key={s.id}
                      onClick={() => { setForm({ ...form, studentId: String(s.id) }); setSearch(''); }}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        background: form.studentId === String(s.id) ? '#F0FDF4' : '#fff',
                        borderBottom: '1px solid #F1F5F9',
                        borderLeft: form.studentId === String(s.id) ? '3px solid #0D9488' : '3px solid transparent',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#0D9488,#0F766E)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
                      }}>
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          Roll: {s.rollNo || '—'} {s.fatherName ? `| Father: ${s.fatherName}` : ''}
                        </div>
                      </div>
                      {form.studentId === String(s.id) && (
                        <CheckCircle size={16} color="#0D9488" style={{ marginLeft: 'auto' }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Correction form */}
          {form.studentId && (
            <div className="card" style={{ marginBottom: 16, padding: 16, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>
                Step 3 — Correction Details
              </div>

              {/* Current status */}
              {existingAtt ? (
                <div style={{
                  background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Clock size={14} color="#B45309" />
                  <span style={{ fontSize: 13, color: '#92400E' }}>
                    Current status on {form.date}:
                  </span>
                  <StatusBadge status={existingAtt.status} />
                </div>
              ) : (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#991B1B',
                }}>
                  No attendance record found for this student on {form.date}.
                  A new record will be created.
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label">New Status *</label>
                  <select
                    className="form-select"
                    style={{ width: 180 }}
                    value={form.newStatus}
                    onChange={e => setForm({ ...form, newStatus: e.target.value })}
                  >
                    <option value="">Select correct status</option>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label className="form-label">Reason for Correction * (required)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Student was present but marked absent by mistake"
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    maxLength={300}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => submitCorrection.mutate()}
                  disabled={!form.newStatus || !form.reason.trim() || submitCorrection.isPending}
                >
                  {submitCorrection.isPending ? 'Submitting...' : 'Submit Correction Request'}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setForm(f => ({ ...f, studentId: '', newStatus: '', reason: '' }))}
                >
                  Clear
                </button>
                {!form.reason.trim() && form.newStatus && (
                  <span style={{ fontSize: 12, color: '#DC2626' }}>Reason is required</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: Admin Approval ── */}
      {tab === 'admin' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {pendingLoading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : pendingList.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <div className="empty-state-icon"><CheckCircle size={36} color="#15803D" /></div>
              <div className="empty-state-text">No pending correction requests</div>
              <div className="empty-state-sub">All corrections have been reviewed</div>
            </div>
          ) : (
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th>Class</th>
                    <th>Date</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ minWidth: 260 }}>Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: '#1E3A5F' }}>
                        {r.student?.name || r.studentName || '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#0D9488', fontWeight: 700 }}>
                        {r.student?.rollNo || '—'}
                      </td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>
                        {r.student?.class?.name || r.className || '—'}
                      </td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>{r.date || '—'}</td>
                      <td><StatusBadge status={r.currentStatus || r.fromStatus} /></td>
                      <td><StatusBadge status={r.newStatus || r.toStatus} /></td>
                      <td style={{ maxWidth: 200, fontSize: 12.5, color: '#64748B' }}>
                        <span title={r.reason}>{r.reason?.slice(0, 60)}{r.reason?.length > 60 ? '…' : ''}</span>
                      </td>
                      <td><StatusBadge status={r.status || 'pending'} /></td>
                      <td>
                        {(r.status === 'pending' || !r.status) ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              className="form-input"
                              style={{ width: 120, fontSize: 11, padding: '4px 8px' }}
                              placeholder="Note (optional)"
                              value={adminNotes[r.id] || ''}
                              onChange={e => setAdminNotes({ ...adminNotes, [r.id]: e.target.value })}
                            />
                            <button
                              className="btn btn-sm btn-green"
                              onClick={() => decide.mutate({ id: r.id, decision: 'approved', adminNote: adminNotes[r.id] || '' })}
                              disabled={decide.isPending}
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              className="btn btn-sm btn-red"
                              onClick={() => decide.mutate({ id: r.id, decision: 'rejected', adminNote: adminNotes[r.id] || '' })}
                              disabled={decide.isPending}
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748B' }}>
                            {r.adminNote || 'Reviewed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
