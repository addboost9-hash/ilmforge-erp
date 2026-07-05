import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [form, setForm] = useState({ password:'', confirm:'' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Min 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { userId: params.get('userId'), token: params.get('token'), newPassword: form.password });
      toast.success('Password reset! Please login.');
      nav('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed'); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400, background:'#fff', borderRadius:16, padding:40, boxShadow:'0 4px 30px rgba(0,0,0,0.08)', textAlign:'center' }}>
        <div style={{ width:64, height:64, background:'#DBEAFE', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <KeyRound size={28} color="#2563EB" />
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#1E3A5F', margin:'0 0 24px' }}>Set New Password</h2>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14, textAlign:'left' }}>
          <div>
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => setForm({...form,password:e.target.value})} />
          </div>
          <div>
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" placeholder="Repeat new password" value={form.confirm} onChange={e => setForm({...form,confirm:e.target.value})} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <p style={{ marginTop:20, fontSize:13 }}><Link to="/login" style={{ color:'#2563EB' }}>← Back to Login</Link></p>
      </div>
    </div>
  );
}
