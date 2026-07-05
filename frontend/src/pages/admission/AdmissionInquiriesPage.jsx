import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Phone, Calendar, User } from 'lucide-react';

const statusBadge = { open:'badge-blue', contacted:'badge-amber', admitted:'badge-green', closed:'badge-gray' };

export default function AdmissionInquiriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', classInterested:'', notes:'' });

  const { data, isLoading } = useQuery({ queryKey:['inquiries'], queryFn:()=>api.get('/admissions/inquiries').then(r=>r.data.data) });

  const add = useMutation({
    mutationFn: d => api.post('/admissions/inquiries', d),
    onSuccess: () => { toast.success('Inquiry recorded!'); qc.invalidateQueries(['inquiries']); setShowForm(false); setForm({name:'',phone:'',classInterested:'',notes:''}); },
  });

  const update = useMutation({
    mutationFn: ({id,...d}) => api.put('/admissions/inquiries/'+id, d),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['inquiries']); },
  });

  const inquiries = data || [];
  const open = inquiries.filter(i=>i.status==='open').length;

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Admission Inquiries</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            {open} open inquiries pending follow-up
          </p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowForm(s=>!s)}>
          {showForm ? <><X size={13}/> Cancel</> : <><Plus size={13}/> Add Inquiry</>}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid-4" style={{marginBottom:16}}>
        {['open','contacted','admitted','closed'].map(s => (
          <div key={s} className={`card badge-${s==='open'?'red':s==='contacted'?'amber':s==='admitted'?'green':'gray'}`}
            style={{padding:12, textAlign:'center', border:'none', background:s==='open'?'#FEE2E2':s==='contacted'?'#FEF3C7':s==='admitted'?'#DCFCE7':'#F1F5F9'}}>
            <div style={{fontSize:20, fontWeight:800, color:s==='open'?'#B91C1C':s==='contacted'?'#B45309':s==='admitted'?'#15803D':'#475569'}}>
              {inquiries.filter(i=>i.status===s).length}
            </div>
            <div style={{fontSize:11.5, fontWeight:600, color:'#64748B', textTransform:'capitalize'}}>{s}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{marginBottom:16, border:'1px solid #CCFBF1', background:'#F0FDF9'}}>
          <h3 style={{fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14}}>New Inquiry</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12}}>
            <div className="form-group"><label className="form-label">Parent/Student Name *</label><input className="form-input" placeholder="Ali Khan" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Phone Number *</label><input className="form-input" placeholder="03001234567" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Class Interested</label><input className="form-input" placeholder="e.g. Class 5" value={form.classInterested} onChange={e=>setForm({...form,classInterested:e.target.value})}/></div>
            <div className="form-group" style={{gridColumn:'span 3'}}><label className="form-label">Notes</label><input className="form-input" placeholder="Additional notes..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-teal" onClick={() => add.mutate(form)} disabled={!form.name||!form.phone}>Save Inquiry</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Class Interested</th><th>Date</th><th>Status</th><th>Update</th></tr></thead>
              <tbody>
                {inquiries.map((inq, idx) => (
                  <tr key={inq.id}>
                    <td style={{color:'#94a3b8', fontSize:12}}>{idx+1}</td>
                    <td style={{fontWeight:700, color:'#1E3A5F'}}>{inq.name}</td>
                    <td style={{fontFamily:'monospace', fontSize:12.5}}>{inq.phone}</td>
                    <td><span className="badge badge-blue">{inq.classInterested||'—'}</span></td>
                    <td style={{fontSize:11.5, color:'#94a3b8'}}>{new Date(inq.createdAt).toLocaleDateString('en-PK')}</td>
                    <td><span className={`badge ${statusBadge[inq.status]||'badge-gray'}`}>{inq.status}</span></td>
                    <td>
                      <select className="form-select" style={{padding:'4px 8px',fontSize:12,width:120}} value={inq.status}
                        onChange={e=>update.mutate({id:inq.id, status:e.target.value})}>
                        <option value="open">Open</option>
                        <option value="contacted">Contacted</option>
                        <option value="admitted">Admitted</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {inquiries.length===0 && <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No inquiries yet</div></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
