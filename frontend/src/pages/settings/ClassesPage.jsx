import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, BookOpen, Layers } from 'lucide-react';

export default function ClassesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [secName, setSecName] = useState('');
  const [secClassId, setSecClassId] = useState('');
  const [subName, setSubName] = useState('');
  const [subClassId, setSubClassId] = useState('');
  const [tab, setTab] = useState('classes');

  const { data, isLoading } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data:subjects } = useQuery({ queryKey:['subjects-all'], queryFn:()=>api.get('/classes/subjects').then(r=>r.data.data) });

  const addClass = useMutation({
    mutationFn: () => api.post('/classes', {name, orderNo:(data||[]).length}),
    onSuccess: () => { toast.success('Class added!'); qc.invalidateQueries(['classes']); setName(''); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const addSection = useMutation({
    mutationFn: () => api.post('/classes/'+secClassId+'/sections', {name:secName}),
    onSuccess: () => { toast.success('Section added!'); qc.invalidateQueries(['classes']); setSecName(''); setSecClassId(''); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const addSubject = useMutation({
    mutationFn: () => api.post('/classes/subjects', {classId:parseInt(subClassId), name:subName}),
    onSuccess: () => { toast.success('Subject added!'); qc.invalidateQueries(['subjects-all']); setSubName(''); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">Classes, Sections & Subjects</h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Configure your school's academic structure</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'300px 1fr', gap:16}}>
        {/* Forms */}
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {/* Add class */}
          <div className="card">
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
              <BookOpen size={15} color="#0D9488"/><h3 style={{margin:0,fontSize:13,fontWeight:700,color:'#1E3A5F'}}>Add Class</h3>
            </div>
            <input className="form-input" style={{marginBottom:8}} placeholder="e.g. Class 11, Nursery" value={name} onChange={e=>setName(e.target.value)}/>
            <button className="btn btn-teal" style={{width:'100%',justifyContent:'center'}} onClick={() => addClass.mutate()} disabled={!name||addClass.isPending}>
              <Plus size={14}/> Add Class
            </button>
          </div>

          {/* Add section */}
          <div className="card">
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
              <Layers size={15} color="#2563EB"/><h3 style={{margin:0,fontSize:13,fontWeight:700,color:'#1E3A5F'}}>Add Section</h3>
            </div>
            <select className="form-select" style={{marginBottom:8}} value={secClassId} onChange={e=>setSecClassId(e.target.value)}>
              <option value="">Select Class</option>
              {(data||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="form-input" style={{marginBottom:8}} placeholder="Section name, e.g. C, D" value={secName} onChange={e=>setSecName(e.target.value)}/>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={() => addSection.mutate()} disabled={!secName||!secClassId}>
              <Plus size={14}/> Add Section
            </button>
          </div>

          {/* Add subject */}
          <div className="card">
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
              <BookOpen size={15} color="#7C3AED"/><h3 style={{margin:0,fontSize:13,fontWeight:700,color:'#1E3A5F'}}>Add Subject</h3>
            </div>
            <select className="form-select" style={{marginBottom:8}} value={subClassId} onChange={e=>setSubClassId(e.target.value)}>
              <option value="">Select Class</option>
              {(data||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="form-input" style={{marginBottom:8}} placeholder="Subject name, e.g. Mathematics" value={subName} onChange={e=>setSubName(e.target.value)}/>
            <button className="btn btn-purple" style={{width:'100%',justifyContent:'center'}} onClick={() => addSubject.mutate()} disabled={!subName||!subClassId}>
              <Plus size={14}/> Add Subject
            </button>
          </div>
        </div>

        {/* Classes table */}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div className="tab-list" style={{padding:'0 16px'}}>
            <button className={`tab-btn${tab==='classes'?' active':''}`} onClick={()=>setTab('classes')}>Classes & Sections</button>
            <button className={`tab-btn${tab==='subjects'?' active':''}`} onClick={()=>setTab('subjects')}>Subjects</button>
          </div>

          {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
            tab==='classes' ? (
              <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Class Name</th><th>Sections</th><th>Order</th></tr></thead>
                  <tbody>
                    {(data||[]).map((c, i) => (
                      <tr key={c.id}>
                        <td style={{color:'#94a3b8', fontSize:12}}>{i+1}</td>
                        <td style={{fontWeight:700, color:'#1E3A5F'}}>{c.name}</td>
                        <td>
                          {(c.sections||[]).length > 0
                            ? (c.sections||[]).map(s => <span key={s.id} className="badge badge-teal" style={{marginRight:4}}>{s.name}</span>)
                            : <span style={{fontSize:12, color:'#94a3b8'}}>No sections</span>}
                        </td>
                        <td style={{color:'#64748B', fontSize:12}}>{c.orderNo}</td>
                      </tr>
                    ))}
                    {(!data||data.length===0) && <tr><td colSpan={4} style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No classes yet. Add one on the left.</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Subject</th><th>Class</th><th>Total Marks</th></tr></thead>
                  <tbody>
                    {(subjects||[]).map((s, i) => (
                      <tr key={s.id}>
                        <td style={{color:'#94a3b8', fontSize:12}}>{i+1}</td>
                        <td style={{fontWeight:600}}>{s.name}</td>
                        <td><span className="badge badge-blue">{(data||[]).find(c=>c.id===s.classId)?.name||'—'}</span></td>
                        <td>{s.totalMarks}</td>
                      </tr>
                    ))}
                    {(!subjects||subjects.length===0) && <tr><td colSpan={4} style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No subjects yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
