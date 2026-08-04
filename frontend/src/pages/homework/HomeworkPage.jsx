import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, BookMarked, Send } from 'lucide-react';

export default function HomeworkPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [viewClass, setViewClass] = useState('');
  const [form, setForm] = useState({ classId:'', subjectId:'', description:'', date:today });

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['homework', date, viewClass],
    queryFn: () => api.get('/homework', {params:{date, classId:viewClass||undefined}}).then(r=>r.data.data),
  });
  const { data:subjects } = useQuery({
    queryKey: ['subjects', form.classId],
    enabled: !!form.classId,
    queryFn: () => api.get('/classes/subjects', {params:{classId:form.classId}}).then(r=>r.data.data),
  });

  const add = useMutation({
    mutationFn: d => api.post('/homework', d),
    onSuccess: () => {
      toast.success('Homework added!');
      qc.invalidateQueries(['homework']);
      setForm({classId:'',subjectId:'',description:'',date:today});
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const className = id => (classes||[]).find(c=>c.id===parseInt(id))?.name || '—';
  const subjectName = id => (subjects||[]).find(s=>s.id===parseInt(id))?.name;

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">Homework Diary</h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Assign and track daily homework for students</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:16}}>
        {/* Add homework */}
        <div className="card">
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            <BookMarked size={15} color="#0D9488"/>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Add Homework</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Class</label>
            <select className="form-select" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value,subjectId:''})}>
              <option value="">Select Class</option>
              {(classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-select" value={form.subjectId} onChange={e=>setForm({...form,subjectId:e.target.value})}>
              <option value="">All Subjects</option>
              {(subjects||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
          </div>

          <div className="form-group">
            <label className="form-label">Homework Description *</label>
            <textarea className="form-input form-textarea" rows={4}
              placeholder="Write homework details, page numbers, exercises..."
              value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          </div>

          <button className="btn btn-teal" style={{width:'100%',justifyContent:'center'}}
            onClick={() => add.mutate({...form, classId:form.classId?parseInt(form.classId):null, subjectId:form.subjectId?parseInt(form.subjectId):null})}
            disabled={!form.description||add.isPending}>
            <Plus size={14}/> {add.isPending?'Adding...':'Add Homework'}
          </button>

          <button className="btn btn-outline" style={{width:'100%',justifyContent:'center',marginTop:8}}
            title="Send to all parents via SMS">
            <Send size={14}/> Send via SMS
          </button>
        </div>

        {/* View homework */}
        <div>
          <div style={{display:'flex', gap:10, marginBottom:12}}>
            <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:160}}/>
            <select className="form-select" value={viewClass} onChange={e=>setViewClass(e.target.value)} style={{width:160}}>
              <option value="">All Classes</option>
              {(classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="card" style={{padding:0, overflow:'hidden'}}>
            <div style={{padding:'12px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:13, fontWeight:700, color:'#1E3A5F'}}>
                Homework for {new Date(date).toLocaleDateString('en-PK', {weekday:'long',day:'numeric',month:'long'})}
              </span>
              <span className="badge badge-teal">{(data||[]).length} entries</span>
            </div>

            {isLoading ? <div className="loading-center"><div className="spinner"/></div> :
            (data||[]).length===0 ? (
              <div className="empty-state" style={{padding:40}}>
                <div className="empty-state-icon">📚</div>
                <div className="empty-state-text">No homework for this date</div>
                <div className="empty-state-sub">Add homework using the form on the left</div>
              </div>
            ) : (
              (data||[]).map(h => (
                <div key={h.id} style={{padding:'14px 18px', borderBottom:'1px solid #F8FAFC'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6}}>
                    <div style={{display:'flex', gap:8}}>
                      <span className="badge badge-navy">{className(h.classId)}</span>
                      {h.subjectId && <span className="badge badge-teal">{subjectName(h.subjectId)||'Subject'}</span>}
                    </div>
                    <span style={{fontSize:11, color:'#94a3b8'}}>{new Date(h.date).toLocaleDateString('en-PK')}</span>
                  </div>
                  <p style={{margin:0, fontSize:13, color:'#374151', lineHeight:1.6}}>{h.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
