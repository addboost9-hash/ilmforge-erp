/**
 * IlmForge — Leave Management (Student Absences)
 * Student leave requests + approval workflow
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

const STATUS_CONFIG = {
  pending:  { badge:'badge-amber',  icon:Clock,       label:'Pending'  },
  approved: { badge:'badge-green',  icon:CheckCircle, label:'Approved' },
  rejected: { badge:'badge-red',    icon:XCircle,     label:'Rejected' },
};

const LEAVE_TYPES = ['Sick Leave','Personal Leave','Family Emergency','Medical','Religious Holiday','Other'];

export default function LeavePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState('all');

  const [form, setForm] = useState({
    studentName:'', rollNo:'', classId:'', fatherPhone:'',
    type:'Sick Leave', from:'', to:'', reason:'',
  });

  // ── data fetching ────────────────────────────────────────────────────────────
  const { data:classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const {
    data: leavesRaw,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => api.get('/leaves').then(r => r.data.data),
  });

  const leaves = leavesRaw || [];

  // ── mutations ────────────────────────────────────────────────────────────────
  const submitLeave = useMutation({
    mutationFn: (payload) => api.post('/leaves', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['leaves']);
      toast.success('Leave application submitted!');
      setShowForm(false);
      setForm({ studentName:'', rollNo:'', classId:'', fatherPhone:'', type:'Sick Leave', from:'', to:'', reason:'' });
    },
    onError: () => toast.error('Failed to submit leave application.'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/leaves/${id}/approve`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['leaves']); toast.success('Leave approved!'); },
    onError: () => toast.error('Failed to approve leave.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.patch(`/leaves/${id}/reject`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['leaves']); toast.success('Leave rejected!'); },
    onError: () => toast.error('Failed to reject leave.'),
  });

  // ── derived counts ───────────────────────────────────────────────────────────
  const counts = {
    all:      leaves.length,
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter);

  // ── submit handler ───────────────────────────────────────────────────────────
  const addLeave = () => {
    if (!form.studentName || !form.from || !form.to) return toast.error('Fill required fields');
    const days = Math.ceil((new Date(form.to) - new Date(form.from)) / (1000 * 60 * 60 * 24)) + 1;
    const selectedClass = (classes || []).find(c => c.id === parseInt(form.classId));
    submitLeave.mutate({
      studentName: form.studentName,
      rollNo: form.rollNo,
      classId: form.classId ? parseInt(form.classId) : undefined,
      className: selectedClass?.name || '',
      fatherPhone: form.fatherPhone,
      type: form.type,
      fromDate: form.from,
      toDate: form.to,
      days,
      reason: form.reason,
      applicantType: 'student',
    });
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Manage student absence requests and approvals</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowForm(s => !s)}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add Leave Application</>}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid-4" style={{ marginBottom:16 }}>
        {[
          { key:'all',      label:'Total Applications', grad:'linear-gradient(135deg,#1E3A5F,#374151)' },
          { key:'pending',  label:'Pending Review',     grad:'linear-gradient(135deg,#D97706,#B45309)' },
          { key:'approved', label:'Approved',           grad:'linear-gradient(135deg,#059669,#047857)' },
          { key:'rejected', label:'Rejected',           grad:'linear-gradient(135deg,#DC2626,#B91C1C)' },
        ].map(s => (
          <div key={s.key} className="kpi-card" style={{ background:s.grad, cursor:'pointer' }} onClick={() => setFilter(s.key)}>
            <div className="kpi-value">{isLoading ? '…' : counts[s.key]}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add Leave Form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, borderTop:'3px solid #0F766E' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:16 }}>New Leave Application</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Student Name *</label>
              <input className="form-input" placeholder="Student full name" value={form.studentName} onChange={e => setForm(f => ({...f, studentName:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Roll No</label>
              <input className="form-input" placeholder="ST-001" value={form.rollNo} onChange={e => setForm(f => ({...f, rollNo:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Class</label>
              <select className="form-select" value={form.classId} onChange={e => setForm(f => ({...f, classId:e.target.value}))}>
                <option value="">Select Class</option>
                {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))}>
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date *</label>
              <input className="form-input" type="date" value={form.from} onChange={e => setForm(f => ({...f, from:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">To Date *</label>
              <input className="form-input" type="date" value={form.to} onChange={e => setForm(f => ({...f, to:e.target.value}))}/>
            </div>
            <div className="form-group" style={{ gridColumn:'span 3' }}>
              <label className="form-label">Reason</label>
              <textarea className="form-input form-textarea" rows={2} placeholder="Reason for leave..." value={form.reason} onChange={e => setForm(f => ({...f, reason:e.target.value}))}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button
              className="btn btn-teal"
              onClick={addLeave}
              disabled={submitLeave.isPending}
            >
              <Plus size={14}/> {submitLeave.isPending ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {['all','pending','approved','rejected'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-teal' : 'btn-outline'}`}
            onClick={() => setFilter(f)} style={{ textTransform:'capitalize' }}>
            {f} ({isLoading ? '…' : counts[f]})
          </button>
        ))}
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div style={{ textAlign:'center', padding:48, color:'#94A3B8', fontSize:14 }}>
          Loading leave applications...
        </div>
      )}

      {isError && (
        <div style={{ textAlign:'center', padding:48, color:'#DC2626', fontSize:14 }}>
          Failed to load leave applications. Please try again.
        </div>
      )}

      {/* Leave Table */}
      {!isLoading && !isError && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((leave, i) => {
                  const status = leave.status || 'pending';
                  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  // Normalize field names — backend may use fromDate/toDate
                  const fromDisplay = leave.from || leave.fromDate?.split('T')[0] || '—';
                  const toDisplay   = leave.to   || leave.toDate?.split('T')[0]   || '—';
                  const days = leave.days
                    || (leave.fromDate && leave.toDate
                        ? Math.ceil((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000*60*60*24)) + 1
                        : '—');
                  return (
                    <tr key={leave.id}>
                      <td style={{ color:'#9CA3AF', fontSize:12 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>
                          {leave.studentName || `User #${leave.applicantId}`}
                        </div>
                        <div style={{ fontSize:11, color:'#9CA3AF' }}>{leave.rollNo || ''}</div>
                      </td>
                      <td><span className="badge badge-blue">{leave.class || leave.className || '—'}</span></td>
                      <td style={{ fontSize:12.5 }}>{leave.type || leave.leaveType || '—'}</td>
                      <td style={{ fontSize:12.5, color:'#374151' }}>{fromDisplay}</td>
                      <td style={{ fontSize:12.5, color:'#374151' }}>{toDisplay}</td>
                      <td style={{ textAlign:'center' }}>
                        <span style={{ fontWeight:700, color: days > 2 ? '#DC2626' : '#374151', fontSize:14 }}>{days}</span>
                      </td>
                      <td style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5, color:'#6B7280' }}>
                        {leave.reason}
                      </td>
                      <td>
                        <span className={`badge ${sc.badge}`}>
                          <Icon size={11}/> {sc.label}
                        </span>
                      </td>
                      <td>
                        {status === 'pending' ? (
                          <div style={{ display:'flex', gap:5 }}>
                            <button
                              className="btn btn-sm btn-green"
                              onClick={() => approveMutation.mutate(leave.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle size={12}/> Approve
                            </button>
                            <button
                              className="btn btn-sm btn-red"
                              onClick={() => rejectMutation.mutate(leave.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle size={12}/> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize:11.5, color:'#9CA3AF' }}>
                            Applied: {leave.appliedOn || leave.createdAt?.split('T')[0] || '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10}>
                    <div className="empty-state" style={{ padding:36 }}>
                      <div className="empty-state-icon"><Calendar size={40} style={{ opacity:.2 }}/></div>
                      <div className="empty-state-text">No leave applications</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
