/**
 * IlmForge — Announcements Module
 * School-wide + role-targeted announcements
 * Wired to GET/POST/DELETE /api/v1/announcements (backend: title, message, targetRole, channel).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Megaphone, BookOpen, Trash2, Globe } from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { value: 'all',     label: 'All Students & Parents' },
  { value: 'parent',  label: 'Parents Only' },
  { value: 'teacher', label: 'Teachers Only' },
  { value: 'student', label: 'Students Only' },
];

const AUDIENCE_LABEL = Object.fromEntries(AUDIENCE_OPTIONS.map(a => [a.value, a.label]));

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState('');
  const [form, setForm] = useState({ title: '', body: '', targetRole: 'all', sendSMS: false });

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data.data),
  });

  const announcements = data || [];

  const addAnn = useMutation({
    mutationFn: (payload) => api.post('/announcements', payload),
    onSuccess: () => {
      toast.success('Announcement posted!');
      if (form.sendSMS) toast.success('Also queued via SMS channel', { icon: '📱' });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setShowForm(false);
      setForm({ title: '', body: '', targetRole: 'all', sendSMS: false });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to post announcement'),
  });

  const delAnn = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['announcements'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const submit = () => {
    if (!form.title || !form.body) return toast.error('Title and body are required');
    addAnn.mutate({
      title: form.title,
      message: form.body,
      targetRole: form.targetRole,
      channel: form.sendSMS ? 'sms' : 'app',
    });
  };

  const filtered = audienceFilter ? announcements.filter(a => a.targetRole === audienceFilter) : announcements;

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Post school-wide notices and role-targeted announcements</p>
        </div>
        <button className="btn btn-teal" onClick={()=>setShowForm(s=>!s)}>
          {showForm?<><X size={14}/> Cancel</>:<><Plus size={14}/> New Announcement</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:16 }}>
        {[
          { label:'Total Announcements', val:announcements.length, icon:Megaphone, color:'#0F766E', bg:'#F0FDFA' },
          { label:'School-wide',         val:announcements.filter(a=>a.targetRole==='all').length,   icon:Globe,     color:'#2563EB', bg:'#EFF6FF' },
          { label:'Role-targeted',       val:announcements.filter(a=>a.targetRole!=='all').length,   icon:BookOpen,  color:'#D97706', bg:'#FFFBEB' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card" style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:44,height:44,borderRadius:11,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <Icon size={20} color={s.color}/>
              </div>
              <div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:12, color:'#6B7280', fontWeight:500 }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New announcement form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, borderTop:'3px solid #0F766E' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:16 }}>Post New Announcement</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Announcement Title *</label>
              <input className="form-input" placeholder="Enter announcement title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Message Body *</label>
              <textarea className="form-input form-textarea" rows={3} placeholder="Write the full announcement..." value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Audience</label>
              <select className="form-select" value={form.targetRole} onChange={e=>setForm(f=>({...f,targetRole:e.target.value}))}>
                {AUDIENCE_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:4 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#374151' }}>
              <input type="checkbox" checked={form.sendSMS} onChange={e=>setForm(f=>({...f,sendSMS:e.target.checked}))} style={{ width:15,height:15 }}/>
              📱 Mark as SMS channel
            </label>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button className="btn btn-teal" onClick={submit} disabled={addAnn.isPending}>
                <Megaphone size={14}/> {addAnn.isPending ? 'Posting…' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <button className={`btn btn-sm ${audienceFilter===''?'btn-teal':'btn-outline'}`} onClick={()=>setAudienceFilter('')}>All</button>
        {AUDIENCE_OPTIONS.map(a => (
          <button key={a.value} className={`btn btn-sm ${audienceFilter===a.value?'btn-teal':'btn-outline'}`} onClick={()=>setAudienceFilter(a.value)}>{a.label}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:48 }}>
          <div style={{ fontSize:48, marginBottom:12, opacity:.2 }}>📢</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#374151' }}>No announcements yet</div>
          <div style={{ fontSize:13, color:'#9CA3AF', marginTop:4 }}>Click "New Announcement" to post one</div>
        </div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {filtered.map((a,i) => <AnnCard key={a.id} a={a} index={i} onDel={(id)=>delAnn.mutate(id)}/>)}
        </div>
      )}
    </div>
  );
}

function AnnCard({ a, index=0, onDel }) {
  const [expanded, setExpanded] = useState(false);
  const body = a.message || '';

  return (
    <div style={{
      background:'rgba(255,255,255,0.65)', backdropFilter:'blur(16px)',
      borderRadius:14, padding:'16px 20px',
      border:'1px solid rgba(255,255,255,0.45)',
      boxShadow:'0 2px 12px rgba(27,47,110,0.06)',
      animation:`ilm-fade-in 0.3s ease-out ${index*60}ms both`,
      borderLeft:'4px solid #0073b7',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1, minWidth:0, marginRight:12 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#1e3a5f' }}>{a.title}</div>
          <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>
            {expanded ? body : (body.slice(0,100) + (body.length > 100 ? '...' : ''))}
          </div>
          {body.length > 100 && (
            <button onClick={()=>setExpanded(e=>!e)} style={{ fontSize:12, color:'#0F766E', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontWeight:600 }}>
              {expanded?'Show less ↑':'Read more ↓'}
            </button>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
          <span style={{
            fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:999,
            background:'#dbeafe', color:'#0073b7',
          }}>{(AUDIENCE_LABEL[a.targetRole] || a.targetRole || 'All').toUpperCase()}</span>
          <button className="btn btn-sm btn-icon" style={{ background:'#FEF2F2',border:'1px solid #FECACA',color:'#B91C1C' }} onClick={()=>onDel(a.id)}>
            <Trash2 size={12}/>
          </button>
        </div>
      </div>
      <div style={{ marginTop:10, fontSize:11, color:'#94a3b8', display:'flex', gap:16 }}>
        <span>📅 {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-PK') : '—'}</span>
        <span>👥 {a.sentCount ?? 0} recipient{a.sentCount === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
