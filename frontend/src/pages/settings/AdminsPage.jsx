import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Shield, Eye, EyeOff, Trash2, Edit, Lock, CheckCircle, XCircle, Save } from 'lucide-react';

const MODULES = [
  { key:'students',        label:'Student Management',      icon:'👨‍🎓' },
  { key:'admissions',      label:'Admission Management',    icon:'📋' },
  { key:'parents',         label:'Parent Accounts',         icon:'👪' },
  { key:'staff',           label:'Staff Management',        icon:'👨‍🏫' },
  { key:'id_cards',        label:'ID Card Printing',        icon:'🪪' },
  { key:'fees',            label:'Fee Payment',             icon:'💰' },
  { key:'accounting',      label:'Accounting',              icon:'📊' },
  { key:'expenses',        label:'Expense Management',      icon:'💸' },
  { key:'salary',          label:'Salary & Loan',           icon:'💼' },
  { key:'reports',         label:'Reporting Area',          icon:'📈' },
  { key:'stock',           label:'Stock & Inventory',       icon:'📦' },
  { key:'attendance',      label:'Manage Attendance',       icon:'✅' },
  { key:'exams',           label:'Exam Management',         icon:'📝' },
  { key:'timetable',       label:'Timetable Management',    icon:'📅' },
  { key:'online_classes',  label:'Online Classes',          icon:'🖥️' },
  { key:'certification',   label:'Certification',           icon:'🎓' },
  { key:'homework',        label:'Daily Homework Diary',    icon:'📚' },
  { key:'study_materials', label:'Study Materials - LMS',   icon:'📂' },
  { key:'leave',           label:'Leave Management',        icon:'🗓️' },
  { key:'sms',             label:'SMS Management',          icon:'📱' },
  { key:'whatsapp',        label:'WhatsApp Notifications',  icon:'💬' },
  { key:'noticeboard',     label:'School Noticeboard',      icon:'📌' },
  { key:'transport',       label:'Transport',               icon:'🚌' },
  { key:'biometric',       label:'Biometric Devices',       icon:'🔏' },
  { key:'website',         label:'Website Management',      icon:'🌐' },
  { key:'settings',        label:'Settings',                icon:'⚙️' },
];

/* ── Permissions Modal ─────────────────────────────────────── */
function PermissionsModal({ admin, onClose }) {
  const [perms, setPerms] = useState(() => {
    const existing = admin.permissions || {};
    const obj = {};
    MODULES.forEach(m => { obj[m.key] = existing[m.key] !== false; }); // default ON
    return obj;
  });
  const [saving, setSaving] = useState(false);

  const toggleAll = (val) => {
    const obj = {};
    MODULES.forEach(m => { obj[m.key] = val; });
    setPerms(obj);
  };

  const savePerms = async () => {
    setSaving(true);
    try {
      await api.put(`/staff/${admin.id}/permissions`, { permissions: perms });
      toast.success(`Permissions updated for ${admin.name}`);
      onClose(perms);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save permissions');
    } finally { setSaving(false); }
  };

  const enabled = Object.values(perms).filter(Boolean).length;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose(null)}>
      <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:680, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1B2F6E,#0073b7)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ color:'white', fontWeight:800, fontSize:15 }}>Module Permissions</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:12, marginTop:2 }}>{admin.name} — {enabled}/{MODULES.length} modules enabled</div>
          </div>
          <button onClick={() => onClose(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Progress bar */}
        <div style={{ height:4, background:'#e2e8f0' }}>
          <div style={{ height:'100%', width:`${(enabled/MODULES.length)*100}%`, background:'#0073b7', transition:'width .3s' }} />
        </div>

        {/* Quick actions */}
        <div style={{ padding:'10px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:8 }}>
          <button className="btn btn-sm btn-outline" style={{ fontSize:11 }} onClick={() => toggleAll(true)}>
            <CheckCircle size={12} color="#15803d"/> Enable All
          </button>
          <button className="btn btn-sm btn-outline" style={{ fontSize:11 }} onClick={() => toggleAll(false)}>
            <XCircle size={12} color="#dc2626"/> Disable All
          </button>
          <span style={{ fontSize:12, color:'#64748b', marginLeft:'auto', alignSelf:'center' }}>
            {enabled} of {MODULES.length} enabled
          </span>
        </div>

        {/* Module grid */}
        <div style={{ padding:16, overflowY:'auto', flex:1 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))', gap:8 }}>
            {MODULES.map(m => (
              <div key={m.key}
                onClick={() => setPerms(p => ({ ...p, [m.key]: !p[m.key] }))}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                  borderRadius:8, cursor:'pointer', transition:'all .15s',
                  background: perms[m.key] ? '#eff6ff' : '#f8f9fa',
                  border: `1px solid ${perms[m.key] ? '#0073b7' : '#e2e8f0'}`,
                }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{m.icon}</span>
                <span style={{ fontSize:12.5, fontWeight:600, color: perms[m.key] ? '#1e3a5f' : '#94a3b8', flex:1 }}>{m.label}</span>
                {/* Toggle pill */}
                <div style={{
                  width:36, height:20, borderRadius:10, flexShrink:0,
                  background: perms[m.key] ? '#0073b7' : '#cbd5e1',
                  position:'relative', transition:'background .15s',
                }}>
                  <div style={{
                    position:'absolute', top:2,
                    left: perms[m.key] ? 18 : 2,
                    width:16, height:16, borderRadius:'50%', background:'white',
                    transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button className="btn btn-outline" onClick={() => onClose(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={savePerms} disabled={saving}>
            <Save size={14}/> {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', role:'accountant', permissions:{} });
  const [permAdmin, setPermAdmin] = useState(null); // admin object for permissions modal

  const { data } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/staff').then(r => r.data.data || []).catch(() => []),
  });

  const add = useMutation({
    mutationFn: d => api.post('/staff', d),
    onSuccess: () => { toast.success('Admin account created!'); qc.invalidateQueries(['admin-users']); setShowForm(false); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const roleOptions = [
    { val:'admin',      label:'Admin (Full Access)' },
    { val:'accountant', label:'Accountant (Finance Only)' },
    { val:'teacher',    label:'Teacher Portal' },
    { val:'gatekeeper', label:'Gatekeeper (Attendance Only)' },
  ];

  const roleColor = { admin:'badge-navy', accountant:'badge-green', teacher:'badge-blue', gatekeeper:'badge-amber' };

  return (
    <div className="page-content fade-up">
      {permAdmin && <PermissionsModal admin={permAdmin} onClose={(saved) => { if (saved) qc.invalidateQueries(['admin-users']); setPermAdmin(null); }} />}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Admin Accounts & Roles</h1>
          <p className="page-subtitle">Manage admin users and their module permissions</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowForm(s=>!s)}>
          {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Add Admin</>}
        </button>
      </div>

      {/* Add admin form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, border:'1px solid #CCFBF1', background:'#F0FDF9' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14 }}>
            <Shield size={15} style={{ display:'inline', marginRight:6 }}/>Create Admin Account
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Muhammad Ali" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="admin@school.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" placeholder="03001234567" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
            </div>
            <div className="form-group" style={{ position:'relative' }}>
              <label className="form-label">Password *</label>
              <input className="form-input" type={showPw?'text':'password'} placeholder="Min 8 characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={{ paddingRight:38 }}/>
              <button type="button" onClick={()=>setShowPw(s=>!s)} style={{ position:'absolute', right:10, top:30, background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                {showPw?<EyeOff size={14}/>:<Eye size={14}/>}
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Role / Portal</label>
              <select className="form-select" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                {roleOptions.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Module permissions */}
          <div style={{ marginTop:14 }}>
            <div className="form-label" style={{ marginBottom:8 }}>Module Permissions</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
              {MODULES.map(m => (
                <label key={m.key} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12.5, color:'#374151', padding:'6px 10px', borderRadius:6, background:form.permissions[m.key]?'#F0FDF9':'#F8FAFC', border:`1px solid ${form.permissions[m.key]?'#CCFBF1':'#E8EDF3'}` }}>
                  <input type="checkbox" checked={!!form.permissions[m.key]} onChange={e=>setForm({...form,permissions:{...form.permissions,[m.key]:e.target.checked}})} style={{ width:14, height:14 }}/>
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button className="btn btn-teal" onClick={()=>add.mutate({...form,designation:'Admin',salaryType:'monthly',basicSalary:0})} disabled={!form.name||!form.email}>
              <Plus size={14}/> Create Account
            </button>
          </div>
        </div>
      )}

      {/* Admins table */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8 }}>
          <Shield size={15} color="#0D9488"/>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Admin Accounts</h3>
        </div>
        <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
          <table className="data-table">
            <thead><tr>
              <th>#</th><th>Photo</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {(data||[]).map((u,i) => (
                <tr key={u.id}>
                  <td style={{ color:'#94A3B8', fontSize:12 }}>{i+1}</td>
                  <td>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#0D9488,#0F766E)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
                      {u.name?.charAt(0)}
                    </div>
                  </td>
                  <td style={{ fontWeight:600, color:'#1E3A5F' }}>{u.name}</td>
                  <td style={{ fontSize:12.5, color:'#64748B' }}>{u.user?.email || '—'}</td>
                  <td><span className={`badge ${roleColor[u.user?.role]||'badge-gray'}`}>{u.user?.role||'staff'}</span></td>
                  <td><span className={`badge ${u.isActive?'badge-green':'badge-red'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-sm" style={{ background:'#fef3c7', border:'1px solid #fde68a', color:'#92400e', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}
                        onClick={() => setPermAdmin({ id: u.id, name: u.name, permissions: u.permissions || {} })}
                        title="Edit Permissions">
                        <Lock size={12}/> Permissions
                      </button>
                      <button className="btn btn-sm btn-icon" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C' }} title="Delete">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data||data.length===0) && (
                <tr><td colSpan={7}>
                  <div className="empty-state" style={{ padding:32 }}>
                    <div className="empty-state-icon">👤</div>
                    <div className="empty-state-text">No admin accounts yet</div>
                    <div className="empty-state-sub">Create your first admin account above</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
