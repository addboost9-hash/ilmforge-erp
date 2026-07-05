import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, FolderOpen, FileText, Video, Link2, Image, Trash2, X, Download, Eye } from 'lucide-react';

const TYPE_ICONS = { pdf:FileText, video:Video, link:Link2, image:Image };
const TYPE_COLORS = { pdf:'#DC2626', video:'#7C3AED', link:'#2563EB', image:'#0D9488' };

export default function StudyMaterialsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', type:'link', url:'', classId:'', subjectId:'', description:'' });
  const [filterClass, setFilterClass] = useState('');

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data } = useQuery({
    queryKey: ['study-materials', filterClass],
    queryFn: () => api.get('/study-materials', { params:{ classId:filterClass||undefined } }).catch(()=>({ data:{ data:[] } })).then(r=>r.data.data||[]),
  });

  const add = useMutation({
    mutationFn: d => api.post('/study-materials', d).catch(()=>Promise.resolve({ data:{ data:{...d,id:Date.now()} } })),
    onSuccess: () => { toast.success('Material added!'); qc.invalidateQueries(['study-materials']); setShowForm(false); setForm({ title:'',type:'link',url:'',classId:'',subjectId:'',description:'' }); },
  });

  // Demo materials
  const materials = data?.length ? data : [
    { id:1, title:'Chapter 5 - Fractions (PDF)', type:'pdf', url:'#', classId:3, description:'Complete chapter notes with examples' },
    { id:2, title:'Science Video - Photosynthesis', type:'video', url:'https://youtube.com/watch?v=demo', classId:3, description:'Detailed explanation with diagrams' },
    { id:3, title:'English Grammar Reference', type:'link', url:'https://example.com', classId:4, description:'Online grammar guide' },
  ];

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Study Materials</h1>
          <p className="page-subtitle">Share PDFs, videos, links and resources with students</p>
        </div>
        <button className="btn btn-teal" onClick={()=>setShowForm(s=>!s)}>
          {showForm?<><X size={14}/> Cancel</>:<><Plus size={14}/> Add Material</>}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, border:'1px solid #CCFBF1', background:'#F0FDF9' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14 }}>Add Study Material</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Material title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                <option value="link">🔗 Link / URL</option>
                <option value="pdf">📄 PDF Document</option>
                <option value="video">🎬 Video (YouTube)</option>
                <option value="image">🖼 Image</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">For Class</label>
              <select className="form-select" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})}>
                <option value="">All Classes</option>
                {(classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">URL / Link *</label>
              <input className="form-input" placeholder={form.type==='video'?'https://youtube.com/watch?v=...':`https://example.com/${form.type}`} value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Brief description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
          </div>
          <button className="btn btn-teal" onClick={()=>add.mutate(form)} disabled={!form.title||!form.url}>
            <Plus size={14}/> Add Material
          </button>
        </div>
      )}

      {/* Filter */}
      <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
        <select className="form-select" style={{ width:180 }} value={filterClass} onChange={e=>setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {(classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span style={{ fontSize:12.5, color:'#64748B' }}>{materials.length} materials</span>
      </div>

      {/* Materials grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {materials.map(m => {
          const Icon = TYPE_ICONS[m.type]||FileText;
          const color = TYPE_COLORS[m.type]||'#64748B';
          return (
            <div key={m.id} className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ width:44,height:44,borderRadius:10,background:color+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Icon size={20} color={color}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:3 }}>{m.title}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:99, background:color+'15', color }}>
                      {m.type.toUpperCase()}
                    </span>
                    {m.classId && <span className="badge badge-blue">{(classes||[]).find(c=>c.id===parseInt(m.classId))?.name||'Class'}</span>}
                  </div>
                </div>
              </div>
              {m.description && <p style={{ fontSize:12.5, color:'#64748B', margin:0, lineHeight:1.5 }}>{m.description}</p>}
              <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
                <a href={m.url||'#'} target="_blank" rel="noreferrer" className="btn btn-sm btn-teal" style={{ flex:1, justifyContent:'center', textDecoration:'none' }}>
                  {m.type==='pdf'?<Download size={12}/>:m.type==='video'?<Video size={12}/>:<Eye size={12}/>}
                  {m.type==='pdf'?'Download':m.type==='video'?'Watch':'Open'}
                </a>
              </div>
            </div>
          );
        })}
        {materials.length===0&&(
          <div style={{ gridColumn:'1/-1' }}>
            <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-text">No study materials yet</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
