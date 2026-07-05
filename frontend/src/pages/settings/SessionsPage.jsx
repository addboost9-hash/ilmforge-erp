import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Calendar } from 'lucide-react';

export default function SessionsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name:'', startDate:'', endDate:'', isActive:false });

  const { data, isLoading } = useQuery({ queryKey:['sessions'], queryFn:()=>api.get('/settings/sessions').then(r=>r.data.data) });

  const add = useMutation({
    mutationFn: d => api.post('/settings/sessions', d),
    onSuccess: () => { toast.success('Session added!'); qc.invalidateQueries(['sessions']); setForm({name:'',startDate:'',endDate:'',isActive:false}); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">Academic Sessions</h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Manage academic year sessions</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'300px 1fr', gap:16}}>
        {/* Form */}
        <div className="card">
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            <Calendar size={15} color="#0D9488"/>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Add Session</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Session Name *</label>
            <input className="form-input" placeholder="e.g. 2025-2026" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-input" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-input" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            <input type="checkbox" id="active" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})} style={{width:16,height:16}}/>
            <label htmlFor="active" className="form-label" style={{margin:0, cursor:'pointer', fontWeight:500}}>Set as Active Session</label>
          </div>

          <button className="btn btn-teal" style={{width:'100%', justifyContent:'center'}} onClick={() => add.mutate(form)} disabled={!form.name||add.isPending}>
            <Plus size={15}/> Add Session
          </button>
        </div>

        {/* Sessions list */}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #F1F5F9'}}>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>All Sessions</h3>
          </div>
          {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
              <table className="data-table">
                <thead><tr><th>#</th><th>Session Name</th><th>Start Date</th><th>End Date</th><th>Status</th></tr></thead>
                <tbody>
                  {(data||[]).map((s, i) => (
                    <tr key={s.id}>
                      <td style={{color:'#94a3b8', fontSize:12}}>{i+1}</td>
                      <td style={{fontWeight:700, color:'#1E3A5F'}}>{s.name}</td>
                      <td style={{fontSize:12.5, color:'#64748B'}}>{s.startDate?new Date(s.startDate).toLocaleDateString('en-PK'):'—'}</td>
                      <td style={{fontSize:12.5, color:'#64748B'}}>{s.endDate?new Date(s.endDate).toLocaleDateString('en-PK'):'—'}</td>
                      <td><span className={`badge ${s.isActive?'badge-green':'badge-gray'}`}>{s.isActive?'Active':'Inactive'}</span></td>
                    </tr>
                  ))}
                  {(!data||data.length===0) && <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No sessions yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
