import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, Building2, Phone, Mail, MapPin, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { data, isLoading } = useQuery({ queryKey:['school-settings'], queryFn:()=>api.get('/settings/school').then(r=>r.data.data) });
  const [form, setForm] = useState({ name:'', address:'', city:'', phone:'', email:'', subdomain:'' });

  useEffect(() => {
    if (data) setForm({ name:data.name||'', address:data.address||'', city:data.city||'', phone:data.phone||'', email:data.email||'', subdomain:data.subdomain||'' });
  }, [data]);

  const save = useMutation({
    mutationFn: d => api.put('/settings/school', d),
    onSuccess: () => toast.success('Settings saved successfully!'),
    onError: err => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  if (isLoading) return <div className="loading-center"><div className="spinner"/></div>;

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">School Settings</h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Update your school's information and branding</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {/* School info */}
        <div className="card">
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:18}}>
            <Building2 size={16} color="#0D9488"/>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>School Information</h3>
          </div>

          <div className="form-group">
            <label className="form-label">School Name *</label>
            <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Future Foundation School"/>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="admin@school.com"/>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="03001234567"/>
          </div>

          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Rawalpindi"/>
          </div>

          <div className="form-group">
            <label className="form-label">Full Address</label>
            <input className="form-input" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Street, Area, City"/>
          </div>

          <button className="btn btn-teal btn-lg" style={{width:'100%', justifyContent:'center'}} onClick={() => save.mutate(form)} disabled={save.isPending}>
            <Save size={16}/> {save.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Info panel */}
        <div>
          <div className="card" style={{marginBottom:12}}>
            <h3 style={{fontSize:13, fontWeight:700, color:'#1E3A5F', marginBottom:14}}>Current School Info</h3>
            {[
              {icon:Building2, label:'Name', val:data?.name},
              {icon:Mail, label:'Email', val:data?.email},
              {icon:Phone, label:'Phone', val:data?.phone},
              {icon:MapPin, label:'City', val:data?.city},
              {icon:Globe, label:'Plan', val:data?.plan?.toUpperCase()},
            ].map(({icon:Icon, label, val}) => (
              <div key={label} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F1F5F9'}}>
                <Icon size={14} color="#0D9488"/>
                <span style={{fontSize:12.5, color:'#64748B', minWidth:60}}>{label}:</span>
                <span style={{fontSize:12.5, fontWeight:600, color:'#1E3A5F'}}>{val||'—'}</span>
              </div>
            ))}
          </div>

          <div className="alert alert-info">
            <span>💡</span>
            <span style={{fontSize:12.5}}>
              To change WhatsApp, SMS, and email settings, update the <strong>.env</strong> file in the backend directory and restart the server.
            </span>
          </div>

          <div className="card" style={{marginTop:12, background:'#F0FDF9', border:'1px solid #CCFBF1'}}>
            <div style={{fontSize:13, fontWeight:700, color:'#0F766E', marginBottom:8}}>🔗 Quick Links</div>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              {[
                ['Classes & Sections', '/settings/classes'],
                ['Academic Sessions', '/settings/sessions'],
                ['Fee Structure', '/fees/structure'],
              ].map(([label, to]) => (
                <a key={label} href={to} style={{fontSize:12.5, color:'#0D9488', fontWeight:600}}>{label} →</a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
