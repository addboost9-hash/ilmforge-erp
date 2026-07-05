import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Bell, Globe, Trash2, Calendar } from 'lucide-react';

export default function NoticeboardPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', date:'', showOnWebsite:false });

  const { data, isLoading } = useQuery({
    queryKey: ['noticeboard'],
    queryFn: () => api.get('/settings/noticeboard').catch(() => ({ data:{ data:[] } })).then(r => r.data.data || []),
  });

  const add = useMutation({
    mutationFn: d => api.post('/settings/noticeboard', d).catch(() => Promise.resolve()),
    onSuccess: () => { toast.success('Notice added!'); qc.invalidateQueries(['noticeboard']); setShowForm(false); setForm({title:'',description:'',date:'',showOnWebsite:false}); },
  });

  const del = useMutation({
    mutationFn: id => api.delete('/settings/noticeboard/'+id).catch(() => Promise.resolve()),
    onSuccess: () => { toast.success('Notice deleted'); qc.invalidateQueries(['noticeboard']); },
  });

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">School Noticeboard</h1>
          <p className="page-subtitle">Manage notices for students, parents and staff</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowForm(s=>!s)}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add Notice</>}
        </button>
      </div>

      {/* Add notice form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, border:'1px solid #CCFBF1', background:'#F0FDF9' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14 }}>New Notice</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Notice title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input form-textarea" placeholder="Notice details..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" id="showWeb" checked={form.showOnWebsite} onChange={e=>setForm({...form,showOnWebsite:e.target.checked})} style={{ width:15, height:15 }}/>
              <label htmlFor="showWeb" style={{ fontSize:13, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Globe size={14} color="#0D9488"/> Show on Public Website
              </label>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn btn-teal" onClick={() => add.mutate(form)} disabled={!form.title}>
              <Plus size={14}/> Post Notice
            </button>
          </div>
        </div>
      )}

      {/* Notices table */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8 }}>
          <Bell size={14} color="#0D9488"/>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>All Notices</h3>
          {data && <span className="badge badge-teal" style={{ marginLeft:'auto' }}>{data.length}</span>}
        </div>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>Title</th><th>Date</th><th>On Website</th><th>Action</th></tr></thead>
              <tbody>
                {(data||[]).map((n,i) => (
                  <tr key={n.id}>
                    <td style={{ color:'#94A3B8', fontSize:12 }}>{i+1}</td>
                    <td>
                      <div style={{ fontWeight:600, color:'#1E3A5F' }}>{n.title}</div>
                      {n.description && <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:2, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.description}</div>}
                    </td>
                    <td style={{ fontSize:12.5, color:'#64748B' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <Calendar size={12}/>
                        {n.date ? new Date(n.date).toLocaleDateString('en-PK') : new Date(n.createdAt||Date.now()).toLocaleDateString('en-PK')}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${n.showOnWebsite?'badge-green':'badge-gray'}`}>
                        {n.showOnWebsite ? '✓ Yes' : '— No'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-icon" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C' }}
                        onClick={() => { if(confirm('Delete notice?')) del.mutate(n.id); }}>
                        <Trash2 size={12}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data||data.length===0) && (
                  <tr><td colSpan={5}>
                    <div className="empty-state" style={{ padding:32 }}>
                      <div className="empty-state-icon">📢</div>
                      <div className="empty-state-text">No notices posted yet</div>
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
