import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { Save, User, Lock, Eye, EyeOff, Camera } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({ name:'', email:'', phone:'' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [showPw, setShowPw] = useState({ cur:false, new:false, con:false });

  useEffect(() => {
    if (user) setForm({ name:user.name||'', email:user.email||'', phone:user.phone||'' });
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => api.put('/auth/profile', form).catch(() => Promise.resolve()),
    onSuccess: () => { toast.success('Profile updated!'); updateUser({...user, ...form}); },
  });

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword:pwForm.currentPassword, newPassword:pwForm.newPassword }),
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' }); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleChangePassword = () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Fill all password fields');
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    changePassword.mutate();
  };

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your personal information and security</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>
        {/* Profile card */}
        <div>
          <div className="card" style={{ textAlign:'center' }}>
            <div style={{ position:'relative', display:'inline-block', marginBottom:14 }}>
              <div style={{ width:88, height:88, borderRadius:'50%', background:'linear-gradient(135deg,#0D9488,#0F766E)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', color:'#fff', fontWeight:800, fontSize:32, border:'3px solid #CCFBF1' }}>
                {user?.name?.charAt(0)||'A'}
              </div>
              <button style={{ position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:'50%', background:'#1E3A5F', border:'2px solid #fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Camera size={13} color="#fff"/>
              </button>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'#1E3A5F' }}>{user?.name}</div>
            <div style={{ fontSize:12.5, color:'#64748B', marginTop:3 }}>{user?.email}</div>
            <span className={`badge ${user?.role==='admin'?'badge-teal':user?.role==='teacher'?'badge-blue':'badge-amber'}`} style={{ marginTop:8 }}>
              {user?.role}
            </span>
          </div>

          <div className="card" style={{ marginTop:12 }}>
            <h3 style={{ fontSize:12.5, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Account Info</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:12.5 }}>
              <div className="info-row"><span className="info-label">Role</span><span className="info-value" style={{ textTransform:'capitalize' }}>{user?.role}</span></div>
              <div className="info-row"><span className="info-label">School ID</span><span className="info-value">#{user?.schoolId}</span></div>
              <div className="info-row"><span className="info-label">Campus ID</span><span className="info-value">#{user?.campusId}</span></div>
            </div>
          </div>
        </div>

        {/* Settings forms */}
        <div>
          <div className="tab-list" style={{ marginBottom:16 }}>
            <button className={`tab-btn${activeTab==='profile'?' active':''}`} onClick={() => setActiveTab('profile')}>
              <User size={13} style={{ display:'inline', marginRight:5 }}/>Manage Profile
            </button>
            <button className={`tab-btn${activeTab==='password'?' active':''}`} onClick={() => setActiveTab('password')}>
              <Lock size={13} style={{ display:'inline', marginRight:5 }}/>Change Password
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="card">
              <h3 style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:16 }}>Personal Information</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@example.com"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="03001234567"/>
                </div>
              </div>
              <button className="btn btn-teal btn-lg" style={{ marginTop:8 }} onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                <Save size={15}/> {saveProfile.isPending ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="card">
              <h3 style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:16 }}>Change Password</h3>
              <div style={{ maxWidth:400 }}>
                {[
                  { key:'currentPassword', label:'Current Password', field:'cur' },
                  { key:'newPassword',     label:'New Password',     field:'new' },
                  { key:'confirmPassword', label:'Confirm New Password', field:'con' },
                ].map(f => (
                  <div key={f.key} className="form-group" style={{ position:'relative' }}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type={showPw[f.field]?'text':'password'} placeholder="••••••••"
                      value={pwForm[f.key]} onChange={e=>setPwForm({...pwForm,[f.key]:e.target.value})}
                      style={{ paddingRight:40 }}/>
                    <button type="button" onClick={()=>setShowPw(s=>({...s,[f.field]:!s[f.field]}))}
                      style={{ position:'absolute', right:10, top:30, background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                      {showPw[f.field] ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn btn-navy btn-lg" style={{ marginTop:8 }} onClick={handleChangePassword} disabled={changePassword.isPending}>
                <Lock size={15}/> {changePassword.isPending ? 'Changing...' : 'Change Password'}
              </button>
              <div className="alert alert-warning" style={{ marginTop:14 }}>
                <span>⚠️ After changing password, you will need to log in again on all devices.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
