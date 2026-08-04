/**
 * IlmForge — Student Behaviour Report
 * Track incidents, rewards, counseling sessions per student
 * Shown in App Store "What's New": Child Behaviour Reporting
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Award, AlertTriangle, MessageSquare, Printer, Search } from 'lucide-react';

const TYPES = [
  { value:'positive',   label:'✅ Positive',     color:'#15803D', bg:'#DCFCE7', icon:'⭐' },
  { value:'incident',   label:'⚠️ Incident',     color:'#B45309', bg:'#FEF3C7', icon:'⚠️' },
  { value:'misconduct', label:'❌ Misconduct',   color:'#B91C1C', bg:'#FEE2E2', icon:'❌' },
  { value:'counseling', label:'💬 Counseling',   color:'#7C3AED', bg:'#EDE9FE', icon:'💬' },
  { value:'attendance', label:'📅 Attendance',   color:'#2563EB', bg:'#DBEAFE', icon:'📅' },
  { value:'academic',   label:'📚 Academic',     color:'#0F766E', bg:'#CCFBF1', icon:'📚' },
];
const typeInfo = t => TYPES.find(x => x.value === t) || TYPES[0];

const SEED = [
  { id:1, studentId:1, studentName:'Ahmed Ali',    class:'Class 5', type:'positive',   title:'Outstanding Performance', desc:'Top in math exam with 98%', date:'2025-06-10', reporter:'Mr. Khan' },
  { id:2, studentId:2, studentName:'Sara Fatima',  class:'Class 4', type:'incident',   title:'Late Arrival',           desc:'Arrived 30 mins late without notice', date:'2025-06-12', reporter:'Class Teacher' },
  { id:3, studentId:3, studentName:'Usman Tariq',  class:'Class 6', type:'misconduct', title:'Classroom Disruption',   desc:'Disturbing other students during class', date:'2025-06-14', reporter:'Mr. Ali' },
  { id:4, studentId:2, studentName:'Sara Fatima',  class:'Class 4', type:'counseling', title:'Parent Meeting',          desc:'Discussed attendance issues with parents', date:'2025-06-15', reporter:'Principal' },
];

const STORAGE_KEY = 'ilmforge_behaviour';

export default function BehaviourPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ studentName:'', class:'', type:'positive', title:'', desc:'', reporter:'' });

  const { data: records = SEED } = useQuery({
    queryKey: ['behaviour'],
    queryFn: () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : SEED;
    },
    staleTime: 0,
  });

  const save = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    qc.invalidateQueries(['behaviour']);
  };

  const addRecord = useMutation({
    mutationFn: async (data) => {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(SEED));
      const newRec = { ...data, id: Date.now(), date: new Date().toISOString().split('T')[0] };
      save([...existing, newRec]);
      return newRec;
    },
    onSuccess: () => { toast.success('Behaviour record added!'); setShowForm(false); setForm({ studentName:'', class:'', type:'positive', title:'', desc:'', reporter:'' }); },
  });

  const deleteRecord = useMutation({
    mutationFn: async (id) => {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(SEED));
      save(existing.filter(r => r.id !== id));
    },
    onSuccess: () => toast.success('Record deleted'),
  });

  const filtered = (records || [])
    .filter(r => !typeFilter || r.type === typeFilter)
    .filter(r => !search || r.studentName?.toLowerCase().includes(search.toLowerCase()) || r.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const counts = TYPES.reduce((acc, t) => ({ ...acc, [t.value]: (records||[]).filter(r=>r.type===t.value).length }), {});

  const printReport = () => {
    const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
    const logo = localStorage.getItem('schoolLogoPreview') || '';
    const rows = filtered.map(r => {
      const ti = typeInfo(r.type);
      return `<tr><td>${r.date}</td><td>${r.studentName}</td><td>${r.class||'—'}</td><td style="color:${ti.color}">${ti.label}</td><td>${r.title}</td><td>${r.desc||'—'}</td><td>${r.reporter||'—'}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Behaviour Report</title><style>
      body{font-family:Arial;padding:20px;position:relative}
      table{width:100%;border-collapse:collapse;position:relative;z-index:1;background:#fff}
      th,td{border:1px solid #ddd;padding:6px;font-size:11px}
      th{background:#0F4C45;color:#fff}
      h2{position:relative;z-index:1}
      .wm{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:0}
      .wm img{width:170px;height:170px;object-fit:cover;border-radius:20px;opacity:.07}
      .wm span{margin-top:10px;font-size:30px;letter-spacing:1px;font-weight:900;color:#111827;text-transform:uppercase;opacity:.055}
    </style></head><body>
      <div class="wm">${logo ? `<img src="${logo}" alt="watermark"/>` : ''}<span>${schoolName}</span></div>
      <h2>${schoolName} — Student Behaviour Report</h2>
      <table><tr><th>Date</th><th>Student</th><th>Class</th><th>Type</th><th>Title</th><th>Details</th><th>Reported By</th></tr>${rows}</table><script>window.print()<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Student Behaviour Report</h1>
          <p className="page-subtitle">Track incidents, rewards, counseling and academic behaviour</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline btn-sm" onClick={printReport}><Printer size={13}/> Print</button>
          <button className="btn btn-teal" onClick={() => setShowForm(s=>!s)}>
            {showForm ? <><X size={13}/> Cancel</> : <><Plus size={13}/> Add Record</>}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
        {TYPES.map(t => (
          <div key={t.value} className="card" style={{ padding:'12px 14px', borderLeft:`3px solid ${t.color}`, cursor:'pointer', opacity: typeFilter && typeFilter!==t.value ? 0.5 : 1 }}
            onClick={() => setTypeFilter(f => f===t.value?'':t.value)}>
            <div style={{ fontSize:20, marginBottom:4 }}>{t.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:t.color }}>{counts[t.value]||0}</div>
            <div style={{ fontSize:11.5, color:'#6B7280' }}>{t.label.replace(/^[^\s]+\s/,'')}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, background:'#F0FDF9', border:'1px solid #CCFBF1' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14 }}>New Behaviour Record</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Student Name *</label>
              <input className="form-input" placeholder="Student Name" value={form.studentName}
                onChange={e=>setForm({...form,studentName:e.target.value})}/>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Class</label>
              <input className="form-input" placeholder="e.g. Class 5" value={form.class}
                onChange={e=>setForm({...form,class:e.target.value})}/>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                {TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Reported By</label>
              <input className="form-input" placeholder="Teacher name" value={form.reporter}
                onChange={e=>setForm({...form,reporter:e.target.value})}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12, marginTop:10 }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Title / Subject *</label>
              <input className="form-input" placeholder="Brief title" value={form.title}
                onChange={e=>setForm({...form,title:e.target.value})}/>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Details / Description</label>
              <input className="form-input" placeholder="More details..." value={form.desc}
                onChange={e=>setForm({...form,desc:e.target.value})}/>
            </div>
          </div>
          <div style={{ marginTop:12 }}>
            <button className="btn btn-teal" disabled={!form.studentName || !form.title || addRecord.isPending}
              onClick={() => addRecord.mutate(form)}>
              <Plus size={13}/> {addRecord.isPending ? 'Saving…' : 'Add Record'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}/>
          <input className="form-input" style={{ paddingLeft:32 }} placeholder="Search student or title..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="form-select" style={{ width:180 }} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Records table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Student</th><th>Class</th><th>Type</th><th>Title</th><th>Details</th><th>Reported By</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const ti = typeInfo(r.type);
              return (
                <tr key={r.id}>
                  <td style={{ fontSize:12, color:'#6B7280', whiteSpace:'nowrap' }}>
                    {new Date(r.date).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'2-digit' })}
                  </td>
                  <td style={{ fontWeight:700, fontSize:13 }}>{r.studentName}</td>
                  <td style={{ fontSize:12 }}>{r.class||'—'}</td>
                  <td>
                    <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 8px', borderRadius:99, background:ti.bg, color:ti.color }}>
                      {ti.icon} {ti.label.replace(/^[^\s]+\s/,'')}
                    </span>
                  </td>
                  <td style={{ fontWeight:600, fontSize:12.5 }}>{r.title}</td>
                  <td style={{ fontSize:12, color:'#6B7280', maxWidth:220 }}>{r.desc||'—'}</td>
                  <td style={{ fontSize:12, color:'#6B7280' }}>{r.reporter||'—'}</td>
                  <td>
                    <button className="btn btn-sm btn-icon" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C' }}
                      onClick={() => { if (confirm('Delete this record?')) deleteRecord.mutate(r.id); }}>
                      <X size={12}/>
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={8}><div className="empty-state" style={{ padding:28 }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">No behaviour records found</div>
                <div className="empty-state-sub">Click "Add Record" to log a behaviour entry</div>
              </div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
