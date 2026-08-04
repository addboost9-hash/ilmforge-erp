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

const emptyForm = { classId:'', studentId:'', type:'Sick Leave', from:'', to:'', reason:'' };

export default function LeavePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState('all');
  const [form, setForm] = useState(emptyForm);

  const { data: classes = [] } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data || []) });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-leave', form.classId],
    queryFn: () => api.get('/students', { params: { classId: form.classId || undefined, limit: 500 } }).then(r => r.data.data || []),
  });

  // The backend LeaveApplication model stores only a generic applicantId —
  // no joined student/class data — so we resolve names/class client-side
  // against the full active student roster.
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students-all-for-leave'],
    queryFn: () => api.get('/students', { params: { limit: 1000 } }).then(r => r.data.data || []),
  });
  const studentMap = Object.fromEntries(allStudents.map((s) => [s.id, s]));

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => api.get('/leaves').then(r => r.data.data || []),
  });

  const studentLeaves = leaves.filter((l) => l.applicantType === 'student');

  const addLeave = useMutation({
    mutationFn: (data) => api.post('/leaves', data),
    onSuccess: () => {
      toast.success('Leave application submitted!');
      qc.invalidateQueries(['leaves']);
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not submit leave'),
  });

  const decide = useMutation({
    mutationFn: ({ id, status }) => api.put(`/leaves/${id}/approve`, { status }),
    onSuccess: (_, { status }) => { toast.success(`Leave ${status}`); qc.invalidateQueries(['leaves']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update leave'),
  });

  const withDisplay = studentLeaves.map((l) => {
    const s = studentMap[l.applicantId];
    const days = Math.ceil((new Date(l.toDate) - new Date(l.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
    return { ...l, studentName: s?.name || `Student #${l.applicantId}`, rollNo: s?.rollNo || '—', className: s?.class?.name || '—', days };
  });

  const counts = {
    all:      withDisplay.length,
    pending:  withDisplay.filter(l=>l.status==='pending').length,
    approved: withDisplay.filter(l=>l.status==='approved').length,
    rejected: withDisplay.filter(l=>l.status==='rejected').length,
  };

  const filtered = filter==='all' ? withDisplay : withDisplay.filter(l=>l.status===filter);

  const handleSubmit = () => {
    if (!form.studentId || !form.from || !form.to || !form.reason.trim()) return toast.error('Fill all required fields');
    if (new Date(form.to) < new Date(form.from)) return toast.error('"To" date cannot be before "From" date');
    addLeave.mutate({
      applicantType: 'student',
      applicantId: parseInt(form.studentId),
      fromDate: form.from,
      toDate: form.to,
      reason: `${form.type}: ${form.reason.trim()}`,
    });
  };

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Manage student absence requests and approvals</p>
        </div>
        <button className="btn btn-teal" onClick={()=>setShowForm(s=>!s)}>
          {showForm?<><X size={14}/> Cancel</>:<><Plus size={14}/> Add Leave Application</>}
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
          <div key={s.key} className="kpi-card" style={{ background:s.grad, cursor:'pointer' }} onClick={()=>setFilter(s.key)}>
            <div className="kpi-value">{counts[s.key]}</div>
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
              <label className="form-label">Class</label>
              <select className="form-select" value={form.classId} onChange={e=>setForm(f=>({...f,classId:e.target.value, studentId:''}))}>
                <option value="">All Classes</option>
                {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Student *</label>
              <select className="form-select" value={form.studentId} onChange={e=>setForm(f=>({...f,studentId:e.target.value}))}>
                <option value="">Select student...</option>
                {students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.rollNo || '—'})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select className="form-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                {LEAVE_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date *</label>
              <input className="form-input" type="date" value={form.from} onChange={e=>setForm(f=>({...f,from:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">To Date *</label>
              <input className="form-input" type="date" value={form.to} onChange={e=>setForm(f=>({...f,to:e.target.value}))}/>
            </div>
            <div className="form-group" style={{ gridColumn:'span 3' }}>
              <label className="form-label">Reason *</label>
              <textarea className="form-input form-textarea" rows={2} placeholder="Reason for leave..." value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button className="btn btn-teal" onClick={handleSubmit} disabled={addLeave.isPending}>
              <Plus size={14}/> Submit Application
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {['all','pending','approved','rejected'].map(f=>(
          <button key={f} className={`btn btn-sm ${filter===f?'btn-teal':'btn-outline'}`}
            onClick={()=>setFilter(f)} style={{ textTransform:'capitalize' }}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Leave Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Class</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:32 }}>Loading…</td></tr>
              )}
              {!isLoading && filtered.map((leave, i) => {
                const sc = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
                const Icon = sc.icon;
                return (
                  <tr key={leave.id}>
                    <td style={{ color:'#9CA3AF', fontSize:12 }}>{i+1}</td>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{leave.studentName}</div>
                      <div style={{ fontSize:11, color:'#9CA3AF' }}>{leave.rollNo}</div>
                    </td>
                    <td><span className="badge badge-blue">{leave.className}</span></td>
                    <td style={{ fontSize:12.5, color:'#374151' }}>{new Date(leave.fromDate).toLocaleDateString('en-PK')}</td>
                    <td style={{ fontSize:12.5, color:'#374151' }}>{new Date(leave.toDate).toLocaleDateString('en-PK')}</td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{ fontWeight:700, color:leave.days>2?'#DC2626':'#374151', fontSize:14 }}>{leave.days}</span>
                    </td>
                    <td style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5, color:'#6B7280' }} title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td>
                      <span className={`badge ${sc.badge}`}>
                        <Icon size={11}/> {sc.label}
                      </span>
                    </td>
                    <td>
                      {leave.status==='pending' ? (
                        <div style={{ display:'flex', gap:5 }}>
                          <button className="btn btn-sm btn-green" onClick={()=>decide.mutate({ id:leave.id, status:'approved' })} disabled={decide.isPending}>
                            <CheckCircle size={12}/> Approve
                          </button>
                          <button className="btn btn-sm btn-red" onClick={()=>decide.mutate({ id:leave.id, status:'rejected' })} disabled={decide.isPending}>
                            <XCircle size={12}/> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize:11.5, color:'#9CA3AF' }}>{leave.approvalCode || '—'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length===0 && (
                <tr><td colSpan={9}>
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
    </div>
  );
}
