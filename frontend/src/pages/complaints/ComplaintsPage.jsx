import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { AlertCircle, Plus, X, CheckCircle } from 'lucide-react';

const statusBadge = { open:'badge-red', in_progress:'badge-amber', resolved:'badge-green' };

export default function ComplaintsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject:'', description:'', studentId:'' });
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => api.get('/complaints').then(r => r.data.data),
  });

  const add = useMutation({
    mutationFn: d => api.post('/complaints', d),
    onSuccess: () => { toast.success('Complaint recorded'); qc.invalidateQueries(['complaints']); setShowForm(false); setForm({subject:'',description:'',studentId:''}); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const update = useMutation({
    mutationFn: ({id,...d}) => api.put('/complaints/'+id, d),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['complaints']); },
  });

  const complaints = data || [];
  const open = complaints.filter(c => c.status==='open').length;
  const inProgress = complaints.filter(c => c.status==='in_progress').length;
  const resolved = complaints.filter(c => c.status==='resolved').length;

  const filtered = filter ? complaints.filter(c => c.status===filter) : complaints;

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Parent Complaints</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Track and resolve parent complaints</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowForm(s=>!s)}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Log Complaint</>}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid-3" style={{marginBottom:16}}>
        {[
          {l:'Open', v:open, c:'#B91C1C', bg:'#FEE2E2'},
          {l:'In Progress', v:inProgress, c:'#B45309', bg:'#FEF3C7'},
          {l:'Resolved', v:resolved, c:'#15803D', bg:'#DCFCE7'},
        ].map(item => (
          <div key={item.l} className="card" style={{background:item.bg, border:'none', padding:14, textAlign:'center', cursor:'pointer'}}
            onClick={() => setFilter(f => f===item.l.toLowerCase().replace(' ','_')?'':item.l.toLowerCase().replace(' ','_'))}>
            <div style={{fontSize:22, fontWeight:800, color:item.c}}>{item.v}</div>
            <div style={{fontSize:12, color:'#64748B', fontWeight:600}}>{item.l}</div>
          </div>
        ))}
      </div>

      {/* New complaint form */}
      {showForm && (
        <div className="card" style={{marginBottom:16, border:'1px solid #CCFBF1', background:'#F0FDF9'}}>
          <h3 style={{fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14}}>Log New Complaint</h3>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input className="form-input" placeholder="Complaint subject" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Student ID (optional)</label>
              <input className="form-input" type="number" placeholder="Student ID" value={form.studentId} onChange={e=>setForm({...form,studentId:e.target.value})}/>
            </div>
            <div className="form-group" style={{gridColumn:'span 2'}}>
              <label className="form-label">Description *</label>
              <textarea className="form-input form-textarea" placeholder="Describe the complaint in detail..."
                value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-teal" onClick={() => add.mutate({...form, studentId:form.studentId?parseInt(form.studentId):null})} disabled={!form.subject||!form.description}>
              <AlertCircle size={14}/> Save Complaint
            </button>
          </div>
        </div>
      )}

      {/* Filter buttons */}
      <div style={{display:'flex', gap:8, marginBottom:12}}>
        {['', 'open', 'in_progress', 'resolved'].map(f => (
          <button key={f} className={`btn btn-sm ${filter===f?'btn-teal':'btn-outline'}`}
            onClick={() => setFilter(f)}>
            {f===''?'All':f.replace('_',' ')} {f&&`(${complaints.filter(c=>c.status===f).length})`}
          </button>
        ))}
      </div>

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead><tr><th>#</th><th>Subject</th><th>Description</th><th>Status</th><th>Date</th><th>Update Status</th></tr></thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr key={c.id}>
                    <td style={{color:'#94a3b8', fontSize:12}}>{idx+1}</td>
                    <td style={{fontWeight:600, color:'#1E3A5F'}}>{c.subject}</td>
                    <td style={{maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5, color:'#64748B'}}>{c.description}</td>
                    <td><span className={`badge ${statusBadge[c.status]||'badge-gray'}`}>{c.status?.replace('_',' ')}</span></td>
                    <td style={{fontSize:11.5, color:'#94a3b8'}}>{new Date(c.createdAt).toLocaleDateString('en-PK')}</td>
                    <td>
                      <select className="form-select" style={{padding:'4px 8px', fontSize:12, width:130}} value={c.status}
                        onChange={e => update.mutate({id:c.id, status:e.target.value})}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div style={{fontSize:36}}>🎉</div>
                      <div className="empty-state-text">{complaints.length===0?'No complaints!':'No complaints match this filter'}</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
