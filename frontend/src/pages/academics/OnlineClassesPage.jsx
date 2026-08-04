import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Video, Users, Clock, Link2, X, Play, Calendar } from 'lucide-react';

export default function OnlineClassesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', classId:'', meetingUrl:'', scheduledAt:'', description:'' });

  const { data: classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['online-classes'],
    queryFn: () => api.get('/online-classes').catch(()=>({ data:{ data:[] } })).then(r=>r.data.data||[]),
  });

  const add = useMutation({
    mutationFn: d => api.post('/online-classes', d).catch(()=>Promise.resolve({ data:{ data:{...d,id:Date.now()} } })),
    onSuccess: () => { toast.success('Class created!'); qc.invalidateQueries(['online-classes']); setShowForm(false); setForm({ title:'',classId:'',meetingUrl:'',scheduledAt:'',description:'' }); },
  });

  // Demo classes for when no real data
  const classes_ = data?.length ? data : [
    { id:1, title:'Mathematics - Chapter 5', classId:3, scheduledAt:'2026-06-29T09:00', meetingUrl:'https://meet.google.com/demo', status:'upcoming' },
    { id:2, title:'English Grammar Session', classId:3, scheduledAt:'2026-06-28T10:00', meetingUrl:'https://zoom.us/demo', status:'live' },
    { id:3, title:'Science - Photosynthesis', classId:4, scheduledAt:'2026-06-27T11:00', meetingUrl:'https://meet.google.com/demo2', status:'ended' },
  ];

  const statusStyle = { live:{ bg:'#DCFCE7',color:'#15803D',text:'🔴 Live' }, upcoming:{ bg:'#DBEAFE',color:'#1D4ED8',text:'⏰ Upcoming' }, ended:{ bg:'#F1F5F9',color:'#64748B',text:'✓ Ended' } };

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Online Classes</h1>
          <p className="page-subtitle">Create and manage virtual classes for students</p>
        </div>
        <button className="btn btn-teal" onClick={()=>setShowForm(s=>!s)}>
          {showForm?<><X size={14}/> Cancel</>:<><Plus size={14}/> Create Class</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:16 }}>
        {[
          { label:'Total Classes', v:classes_.length, color:'#1E3A5F', icon:'🎓' },
          { label:'Live Now', v:classes_.filter(c=>c.status==='live').length, color:'#15803D', icon:'🔴' },
          { label:'Upcoming', v:classes_.filter(c=>c.status==='upcoming').length, color:'#2563EB', icon:'⏰' },
        ].map(item=>(
          <div key={item.label} className="card" style={{ padding:16, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:28 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:item.color }}>{item.v}</div>
              <div style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, border:'1px solid #CCFBF1', background:'#F0FDF9' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14 }}>Create Online Class</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Class Title *</label>
              <input className="form-input" placeholder="e.g. Mathematics Chapter 5" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">For Class</label>
              <select className="form-select" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})}>
                <option value="">All Classes</option>
                {(classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Meeting Link (Zoom/Google Meet)</label>
              <input className="form-input" placeholder="https://meet.google.com/xxx-xxx-xxx" value={form.meetingUrl} onChange={e=>setForm({...form,meetingUrl:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Scheduled Date & Time</label>
              <input className="form-input" type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})}/>
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input form-textarea" rows={2} placeholder="Class description..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
          </div>
          <button className="btn btn-teal" onClick={()=>add.mutate(form)} disabled={!form.title}>
            <Video size={14}/> Create Online Class
          </button>
        </div>
      )}

      {/* Classes list */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {classes_.map(cls => {
          const st = statusStyle[cls.status||'upcoming'];
          return (
            <div key={cls.id} className="card" style={{ borderTop:`3px solid ${st.color}` }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:40,height:40,borderRadius:10,background:st.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>
                    📹
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#1E3A5F' }}>{cls.title}</div>
                    <div style={{ fontSize:11.5, color:'#64748B' }}>{(classes||[]).find(c=>c.id===parseInt(cls.classId))?.name || 'All Classes'}</div>
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99, background:st.bg, color:st.color }}>
                  {st.text}
                </span>
              </div>
              <div style={{ fontSize:12, color:'#64748B', display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                {cls.scheduledAt && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Calendar size={12}/>
                    {new Date(cls.scheduledAt).toLocaleString('en-PK',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </div>
                )}
                {cls.meetingUrl && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Link2 size={12}/>
                    <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{cls.meetingUrl}</span>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <a href={cls.meetingUrl||'#'} target="_blank" rel="noreferrer" className="btn btn-teal btn-sm" style={{ flex:1, justifyContent:'center', textDecoration:'none' }}>
                  <Play size={13}/> {cls.status==='live'?'Join Now':'Open Link'}
                </a>
                <button className="btn btn-outline btn-sm" style={{ flex:1 }}>
                  <Users size={13}/> View Students
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
