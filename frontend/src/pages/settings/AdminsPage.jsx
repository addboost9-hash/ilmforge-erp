import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Shield, Eye, EyeOff, Trash2, Edit, Lock } from 'lucide-react';

const MODULES = [
  { key:'students',     label:'Students Management' },
  { key:'admissions',   label:'Admissions' },
  { key:'fees',         label:'Fee Management' },
  { key:'attendance',   label:'Attendance' },
  { key:'staff',        label:'Staff Management' },
  { key:'exams',        label:'Exams & Results' },
  { key:'salary',       label:'Salary & HR' },
  { key:'expenses',     label:'Expenses' },
  { key:'stock',        label:'Stock / POS' },
  { key:'reports',      label:'Reports' },
  { key:'sms',          label:'SMS / WhatsApp' },
  { key:'settings',     label:'School Settings' },
];

export default function AdminsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', role:'accountant', permissions:{} });
  const [editingPermissions, setEditingPermissions] = useState(null);

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
                      <button className="btn btn-outline btn-sm btn-icon" title="Edit Permissions">
                        <Lock size={12}/>
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
