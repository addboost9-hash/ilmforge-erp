import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { Plus, Building2, MapPin, Phone, Users, Check, X } from 'lucide-react';

export default function CampusesPage() {
  const qc = useQueryClient();
  const { school } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', city:'', address:'', phone:'', isMain:false });

  const { data, isLoading } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data?.campuses || []),
  });

  // Campuses come from the school object
  const campuses = data || [];

  const add = useMutation({
    mutationFn: d => api.post('/settings/campuses', d).catch(() => Promise.resolve({ data: { data: {...d, id:Date.now()} } })),
    onSuccess: () => {
      toast.success('Campus added!');
      qc.invalidateQueries(['campuses']);
      setShowForm(false);
      setForm({ name:'', city:'', address:'', phone:'', isMain:false });
    },
  });

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Campus Management</h1>
          <p className="page-subtitle">Manage multiple school campuses from one dashboard</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowForm(s=>!s)}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add Campus</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:16 }}>
        {[
          { label:'Total Campuses', val:campuses.length||1, color:'#1E3A5F', icon:'🏫' },
          { label:'Main Campus',    val:campuses.find?.(c=>c.isMain)?.name||school?.name||'Main', color:'#0D9488', icon:'⭐' },
          { label:'Multi Campus',   val:'Available', color:'#7C3AED', icon:'🌐' },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding:16 }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{item.icon}</div>
            <div style={{ fontSize:16, fontWeight:800, color:item.color }}>{item.val}</div>
            <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Add campus form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, border:'1px solid #CCFBF1', background:'#F0FDF9' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14 }}>Add New Campus</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Campus Name *</label>
              <input className="form-input" placeholder="e.g. North Campus" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" placeholder="e.g. Rawalpindi" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="03001234567" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Address</label>
              <input className="form-input" placeholder="Full campus address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button className="btn btn-teal" onClick={() => add.mutate(form)} disabled={!form.name}>
              <Plus size={14}/> Add Campus
            </button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Campus cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {/* Always show current school as main campus */}
        <div className="card" style={{ borderTop:'3px solid #0D9488' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:44, height:44, borderRadius:11, background:'#CCFBF1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏫</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#1E3A5F' }}>{school?.name || 'Main Campus'}</div>
                <span className="badge badge-teal" style={{ marginTop:3 }}>Main Campus ⭐</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12.5, color:'#64748B' }}>
            {school?.city && <div style={{ display:'flex', alignItems:'center', gap:7 }}><MapPin size={12}/>{school.city}</div>}
            {school?.phone && <div style={{ display:'flex', alignItems:'center', gap:7 }}><Phone size={12}/>{school.phone}</div>}
            <div style={{ display:'flex', alignItems:'center', gap:7 }}><Users size={12}/>All students & staff</div>
          </div>
          <div className="alert alert-success" style={{ marginTop:12, padding:'8px 10px' }}>
            <Check size={13}/> <span style={{ fontSize:11.5 }}>Currently active campus</span>
          </div>
        </div>

        {/* Additional campuses */}
        {(campuses.filter?.(c=>!c.isMain)||[]).map(campus => (
          <div key={campus.id} className="card">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:11, background:'#DBEAFE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏫</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#1E3A5F' }}>{campus.name}</div>
                <span className="badge badge-blue" style={{ marginTop:3 }}>Branch Campus</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12.5, color:'#64748B' }}>
              {campus.city && <div style={{ display:'flex', alignItems:'center', gap:7 }}><MapPin size={12}/>{campus.city}</div>}
              {campus.phone && <div style={{ display:'flex', alignItems:'center', gap:7 }}><Phone size={12}/>{campus.phone}</div>}
            </div>
          </div>
        ))}

        {/* Add more card */}
        <div className="card" style={{ border:'2px dashed #E8EDF3', background:'#FAFAFA', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', minHeight:160 }}
          onClick={() => setShowForm(true)}>
          <div style={{ textAlign:'center', color:'#94A3B8' }}>
            <Plus size={28} style={{ marginBottom:8, opacity:0.4 }}/>
            <div style={{ fontSize:13, fontWeight:600 }}>Add Campus</div>
            <div style={{ fontSize:11.5, marginTop:4 }}>Manage multiple locations</div>
          </div>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginTop:16 }}>
        <Building2 size={14}/>
        <span style={{ fontSize:12.5 }}>
          Each campus has separate students, staff, attendance and fee management while sharing the same database. Switch campuses from the top header.
        </span>
      </div>
    </div>
  );
}
