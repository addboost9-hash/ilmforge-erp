/**
 * IlmForge — Announcements Module
 * School-wide + classroom announcements
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Megaphone, Users, BookOpen, Bell, Trash2, Eye, Globe } from 'lucide-react';

const DEMO_ANNOUNCEMENTS = [
  { id:1, title:'Annual Sports Day – 15th July 2026', body:'All students must report to the ground by 8:00 AM in sports uniform. Parents are warmly invited.', audience:'all', classId:null, createdAt:'2026-06-25', priority:'high', pinned:true },
  { id:2, title:'Class 5 Mathematics Test', body:'There will be a surprise mathematics test on Chapter 7 & 8 on Monday 29th June.', audience:'class', classId:3, createdAt:'2026-06-26', priority:'medium', pinned:false },
  { id:3, title:'Holiday Notice – Eid ul Adha', body:'School will remain closed from 26th June to 1st July for Eid ul Adha holidays. School resumes on 2nd July.', audience:'all', createdAt:'2026-06-20', priority:'high', pinned:true },
  { id:4, title:'Parent Teacher Meeting', body:'PTM will be held on 5th July 2026 from 9 AM to 1 PM. All parents are requested to attend.', audience:'all', createdAt:'2026-06-24', priority:'medium', pinned:false },
  { id:5, title:'Science Project Submission', body:'All Class 6 students must submit their science project by 30th June. No extensions will be granted.', audience:'class', classId:5, createdAt:'2026-06-23', priority:'low', pinned:false },
];

const PRIORITY_CONFIG = {
  high:   { bg:'#FEE2E2', color:'#B91C1C', label:'High'   },
  medium: { bg:'#FEF3C7', color:'#B45309', label:'Medium' },
  low:    { bg:'#F0FDFA', color:'#0F766E', label:'Low'    },
};

export default function AnnouncementsPage() {
  const [showForm,  setShowForm]  = useState(false);
  const [audience,  setAudience]  = useState('all');
  const [announcements, setAnnouncements] = useState(DEMO_ANNOUNCEMENTS);
  const [form, setForm] = useState({ title:'', body:'', audience:'all', classId:'', priority:'medium', sendSMS:false });

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });

  const addAnn = () => {
    if (!form.title||!form.body) return toast.error('Title and body are required');
    setAnnouncements(prev => [{
      ...form, id:Date.now(), createdAt:new Date().toISOString().split('T')[0], pinned:false,
    }, ...prev]);
    toast.success('Announcement posted!');
    if (form.sendSMS) toast.success('SMS sent to parents!', { icon:'📱' });
    setShowForm(false);
    setForm({ title:'', body:'', audience:'all', classId:'', priority:'medium', sendSMS:false });
  };

  const pin  = id => setAnnouncements(prev=>prev.map(a=>a.id===id?{...a,pinned:!a.pinned}:a));
  const del  = id => { setAnnouncements(prev=>prev.filter(a=>a.id!==id)); toast.success('Deleted'); };

  const filtered = audience==='all' ? announcements : announcements.filter(a=>a.audience===audience);
  const pinned   = filtered.filter(a=>a.pinned);
  const regular  = filtered.filter(a=>!a.pinned);

  const className = id => (classes||[]).find(c=>c.id===parseInt(id))?.name||'—';

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Post school-wide notices and class-specific announcements</p>
        </div>
        <button className="btn btn-teal" onClick={()=>setShowForm(s=>!s)}>
          {showForm?<><X size={14}/> Cancel</>:<><Plus size={14}/> New Announcement</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:16 }}>
        {[
          { label:'Total Announcements', val:announcements.length, icon:Megaphone, color:'#0F766E', bg:'#F0FDFA' },
          { label:'School-wide',         val:announcements.filter(a=>a.audience==='all').length,   icon:Globe,     color:'#2563EB', bg:'#EFF6FF' },
          { label:'Class-specific',      val:announcements.filter(a=>a.audience==='class').length, icon:BookOpen,  color:'#D97706', bg:'#FFFBEB' },
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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div className="form-group" style={{ gridColumn:'span 3' }}>
              <label className="form-label">Announcement Title *</label>
              <input className="form-input" placeholder="Enter announcement title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
            </div>
            <div className="form-group" style={{ gridColumn:'span 3' }}>
              <label className="form-label">Message Body *</label>
              <textarea className="form-input form-textarea" rows={3} placeholder="Write the full announcement..." value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Audience</label>
              <select className="form-select" value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))}>
                <option value="all">All Students & Parents</option>
                <option value="class">Specific Class</option>
                <option value="staff">Staff Only</option>
              </select>
            </div>
            {form.audience==='class' && (
              <div className="form-group">
                <label className="form-label">Select Class</label>
                <select className="form-select" value={form.classId} onChange={e=>setForm(f=>({...f,classId:e.target.value}))}>
                  <option value="">Choose class...</option>
                  {(classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:4 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#374151' }}>
              <input type="checkbox" checked={form.sendSMS} onChange={e=>setForm(f=>({...f,sendSMS:e.target.checked}))} style={{ width:15,height:15 }}/>
              📱 Also send via SMS to parents
            </label>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button className="btn btn-teal" onClick={addAnn}><Megaphone size={14}/> Post Announcement</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[['all','All'],['class','Class-specific'],['staff','Staff Only']].map(([v,l])=>(
          <button key={v} className={`btn btn-sm ${audience===v?'btn-teal':'btn-outline'}`} onClick={()=>setAudience(v)}>{l}</button>
        ))}
      </div>

      {/* Pinned */}
      {pinned.length>0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
            📌 Pinned Announcements
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {pinned.map(a => <AnnCard key={a.id} a={a} onPin={pin} onDel={del} className={className}/>)}
          </div>
        </div>
      )}

      {/* Regular */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {regular.length===0&&pinned.length===0 ? (
          <div className="card" style={{ textAlign:'center', padding:48 }}>
            <div style={{ fontSize:48, marginBottom:12, opacity:.2 }}>📢</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#374151' }}>No announcements yet</div>
            <div style={{ fontSize:13, color:'#9CA3AF', marginTop:4 }}>Click "New Announcement" to post one</div>
          </div>
        ) : regular.map(a => <AnnCard key={a.id} a={a} onPin={pin} onDel={del} className={className}/>)}
      </div>
    </div>
  );
}

function AnnCard({ a, onPin, onDel, className }) {
  const [expanded, setExpanded] = useState(false);
  const pc = PRIORITY_CONFIG[a.priority]||PRIORITY_CONFIG.medium;
  return (
    <div className="card" style={{ padding:'16px 20px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ width:40,height:40,borderRadius:10,background:a.audience==='all'?'#EFF6FF':a.audience==='class'?'#FFFBEB':'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18 }}>
          {a.audience==='all'?'📢':a.audience==='class'?'📚':'👥'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{a.title}</span>
            {a.pinned && <span style={{ fontSize:10, background:'#DBEAFE', color:'#1D4ED8', padding:'1px 7px', borderRadius:99, fontWeight:700 }}>📌 PINNED</span>}
            <span style={{ fontSize:11, padding:'1px 8px', borderRadius:99, background:pc.bg, color:pc.color, fontWeight:700 }}>{pc.label}</span>
            {a.audience==='class' && a.classId && <span className="badge badge-gold">{className(a.classId)}</span>}
          </div>
          <p style={{ fontSize:13, color:expanded?'#374151':'#6B7280', lineHeight:1.6, margin:0, overflow:expanded?'visible':'hidden', maxHeight:expanded?'none':'44px', textOverflow:expanded?'clip':'ellipsis', display:expanded?'block':'-webkit-box', WebkitLineClamp:expanded?undefined:2, WebkitBoxOrient:'vertical' }}>
            {a.body}
          </p>
          {a.body.length > 100 && (
            <button onClick={()=>setExpanded(e=>!e)} style={{ fontSize:12, color:'#0F766E', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontWeight:600 }}>
              {expanded?'Show less ↑':'Read more ↓'}
            </button>
          )}
          <div style={{ fontSize:11.5, color:'#9CA3AF', marginTop:5 }}>Posted on {a.createdAt}</div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" title={a.pinned?'Unpin':'Pin'} onClick={()=>onPin(a.id)}>
            <span style={{ fontSize:14 }}>{a.pinned?'📌':'📍'}</span>
          </button>
          <button className="btn btn-sm btn-icon" style={{ background:'#FEF2F2',border:'1px solid #FECACA',color:'#B91C1C' }} onClick={()=>onDel(a.id)}>
            <Trash2 size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}
