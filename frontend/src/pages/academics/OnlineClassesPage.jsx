import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { Plus, Video, Users, Clock, Link2, X, Play, Calendar } from 'lucide-react';

export default function OnlineClassesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', classId:'', meetingUrl:'', scheduledAt:'', durationMinutes:40 });
  const role = useAuthStore(s => s.user?.role);
  const canManage = ['admin', 'super_admin', 'principal', 'teacher'].includes(role);

  const { data: classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['online-classes'],
    queryFn: () => api.get('/online-classes').catch(()=>({ data:{ data:[] } })).then(r=>r.data.data||[]),
  });

  const add = useMutation({
    mutationFn: d => api.post('/online-classes', { ...d, meetingLink: d.meetingUrl }),
    onSuccess: () => { toast.success('Online class added.'); qc.invalidateQueries({ queryKey: ['online-classes'] }); setShowForm(false); setForm({ title:'',classId:'',meetingUrl:'',scheduledAt:'',durationMinutes:40 }); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to create class'),
  });

  const remove = useMutation({
    mutationFn: id => api.delete(`/online-classes/${id}`),
    onSuccess: () => { toast.success('Online class removed.'); qc.invalidateQueries({ queryKey: ['online-classes'] }); },
    onError: err => toast.error(err.response?.data?.message || 'It could not be removed.'),
  });
  const end = useMutation({
    mutationFn: id => api.put(`/online-classes/${id}/status`, { status: 'completed' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['online-classes'] }),
    onError: err => toast.error(err.response?.data?.message || 'It could not be updated.'),
  });

  /* Live, upcoming or ended from the time and length of the class (the
     record says "scheduled" until a teacher ends it). The page used to
     show three made-up classes when there were none, and stopped on a
     real one because "scheduled" had no style. */
  const now = Date.now();
  const stateOf = (c) => {
    if (c.status === 'cancelled') return 'cancelled';
    if (c.status === 'completed') return 'ended';
    if (!c.scheduledAt) return 'upcoming';
    const start = new Date(c.scheduledAt).getTime();
    const stop = start + (c.durationMinutes || 60) * 60000;
    return now < start ? 'upcoming' : now < stop ? 'live' : 'ended';
  };
  const classes_ = (data || []).map(c => ({ ...c, state: stateOf(c) }))
    .sort((a, b) => ({ live: 0, upcoming: 1, ended: 2, cancelled: 3 }[a.state] - { live: 0, upcoming: 1, ended: 2, cancelled: 3 }[b.state])
      || (a.state === 'upcoming' ? new Date(a.scheduledAt) - new Date(b.scheduledAt) : new Date(b.scheduledAt) - new Date(a.scheduledAt)));

  const statusStyle = { live:{ bg:'#DCFCE7',color:'#15803D',text:'🔴 Live now' }, upcoming:{ bg:'#DBEAFE',color:'#1D4ED8',text:'⏰ Upcoming' }, ended:{ bg:'#F1F5F9',color:'#64748B',text:'✓ Ended' }, cancelled:{ bg:'#FEE2E2',color:'#B91C1C',text:'Cancelled' } };

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Online Classes</h1>
          <p className="page-subtitle">Create and manage virtual classes for students</p>
        </div>
        {canManage && <button className="btn btn-teal" onClick={()=>setShowForm(s=>!s)}>
          {showForm?<><X size={14}/> Cancel</>:<><Plus size={14}/> Create Class</>}
        </button>}
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:16 }}>
        {[
          { label:'Total Classes', v:classes_.length, color:'#1E3A5F', icon:'🎓' },
          { label:'Live Now', v:classes_.filter(c=>c.state==='live').length, color:'#15803D', icon:'🔴' },
          { label:'Upcoming', v:classes_.filter(c=>c.state==='upcoming').length, color:'#2563EB', icon:'⏰' },
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
              <select aria-label="For Class" className="form-select" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})}>
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
              <input aria-label="Scheduled Date & Time" className="form-input" type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Length (minutes)</label>
              <input aria-label="Length (minutes)" className="form-input" type="number" min="10" max="240" value={form.durationMinutes} onChange={e=>setForm({...form,durationMinutes:e.target.value})}/>
            </div>
          </div>
          <button className="btn btn-teal" onClick={()=>add.mutate(form)} disabled={!form.title || add.isPending}>
            <Video size={14}/> Create Online Class
          </button>
        </div>
      )}

      {!isLoading && !classes_.length && (
        <div className="card" style={{ textAlign:'center', padding:'36px 20px', color:'#64748B' }}>
          <Video size={34} style={{ color:'#CBD5E1' }}/>
          <div style={{ fontWeight:700, color:'#334155', marginTop:8 }}>No online classes yet</div>
          <div style={{ fontSize:13, marginTop:4 }}>{canManage ? 'Create one with its Google Meet or Zoom link; students see it here.' : 'Your teachers have not scheduled any online classes yet.'}</div>
        </div>
      )}

      {/* Classes list */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {classes_.map(cls => {
          const st = statusStyle[cls.state];
          const link = cls.meetingUrl || cls.meetingLink;
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
                {(cls.meetingUrl || cls.meetingLink) && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Link2 size={12}/>
                    <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{cls.meetingUrl || cls.meetingLink}</span>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer" className="btn btn-teal btn-sm" style={{ flex:1, justifyContent:'center', textDecoration:'none' }}>
                    <Play size={13}/> {cls.state==='live'?'Join now':'Open link'}
                  </a>
                ) : <span style={{ flex:1, fontSize:12, color:'#94A3B8', alignSelf:'center' }}>No meeting link</span>}
                {canManage && cls.state === 'live' && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={()=>end.mutate(cls.id)} disabled={end.isPending}>End</button>
                )}
                {canManage && (
                  <button type="button" className="btn btn-outline btn-sm" style={{ color:'#B91C1C' }} aria-label={`Remove ${cls.title}`}
                    onClick={()=>{ if (window.confirm(`Remove "${cls.title}"?`)) remove.mutate(cls.id); }}><X size={13}/></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
