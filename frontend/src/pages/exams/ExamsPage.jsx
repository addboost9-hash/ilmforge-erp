import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, ClipboardList, BarChart2, GraduationCap, X } from 'lucide-react';

const typeBadge = { test:'badge-blue', midterm:'badge-amber', final:'badge-red' };

export default function ExamsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', type:'test', classId:'', dateStart:'', dateEnd:'' });

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({ queryKey:['exams'], queryFn:()=>api.get('/exams').then(r=>r.data.data) });

  const add = useMutation({
    mutationFn: d => api.post('/exams', d),
    onSuccess: () => { toast.success('Exam created!'); qc.invalidateQueries(['exams']); setShowForm(false); setForm({title:'',type:'test',classId:'',dateStart:'',dateEnd:''}); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Exams & Tests</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Create exams, enter marks, print marksheets</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowForm(s=>!s)}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Create Exam</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{marginBottom:16, background:'#F0FDF9', border:'1px solid #CCFBF1'}}>
          <h3 style={{fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14}}>New Exam / Test</h3>
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:12, alignItems:'end'}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Mid-Term Exam 2025" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="test">Test</option>
                <option value="midterm">Mid-Term</option>
                <option value="final">Final Exam</option>
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Class</label>
              <select className="form-select" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})}>
                <option value="">All Classes</option>
                {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.dateStart} onChange={e=>setForm({...form,dateStart:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={form.dateEnd} onChange={e=>setForm({...form,dateEnd:e.target.value})}/>
            </div>
          </div>
          <div style={{marginTop:12, display:'flex', gap:8}}>
            <button className="btn btn-teal" onClick={() => add.mutate(form)} disabled={add.isPending || !form.title}>
              {add.isPending ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </div>
      )}

      {/* Exams table */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Class</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data||[]).map((e, idx) => (
                  <tr key={e.id}>
                    <td style={{color:'#94a3b8', fontSize:12}}>{idx+1}</td>
                    <td style={{fontWeight:700, color:'#1E3A5F'}}>{e.title}</td>
                    <td><span className={`badge ${typeBadge[e.type]||'badge-gray'}`}>{e.type}</span></td>
                    <td>{e.classId ? <span className="badge badge-teal">Class {e.classId}</span> : <span className="badge badge-gray">All Classes</span>}</td>
                    <td style={{fontSize:12.5,color:'#64748B'}}>{e.dateStart ? new Date(e.dateStart).toLocaleDateString('en-PK') : '—'}</td>
                    <td style={{fontSize:12.5,color:'#64748B'}}>{e.dateEnd ? new Date(e.dateEnd).toLocaleDateString('en-PK') : '—'}</td>
                    <td>
                      <div style={{display:'flex', gap:6}}>
                        <Link to={'/exams/'+e.id+'/marks'} className="btn btn-outline btn-sm"><ClipboardList size={12}/> Marks</Link>
                        <Link to={'/exams/'+e.id+'/results'} className="btn btn-sm" style={{background:'#CCFBF1',color:'#0F766E',border:'1px solid #BBF7D0'}}><BarChart2 size={12}/> Results</Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data||data.length===0) && (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📝</div>
                      <div className="empty-state-text">No exams yet</div>
                      <div className="empty-state-sub">Click "Create Exam" to add your first exam or test</div>
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
