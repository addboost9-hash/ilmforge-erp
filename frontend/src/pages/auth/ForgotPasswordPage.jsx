import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Email required');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email!');
    } catch { toast.error('Something went wrong'); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400, background:'#fff', borderRadius:16, padding:40, boxShadow:'0 4px 30px rgba(0,0,0,0.08)', textAlign:'center' }}>
        <div style={{ width:64, height:64, background:'#DBEAFE', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Mail size={28} color="#2563EB" />
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#1E3A5F', margin:'0 0 8px' }}>Forgot Password?</h2>
        <p style={{ color:'#64748B', marginBottom:28, fontSize:14 }}>Enter your email and we'll send a reset link.</p>
        {sent ? (
          <div style={{ padding:16, background:'#dcfce7', borderRadius:10, color:'#15803d', fontSize:14 }}>
            ✅ Reset link sent! Check your inbox.
          </div>
        ) : (
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ textAlign:'left' }}>
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="admin@school.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <p style={{ marginTop:20, fontSize:13, color:'#64748B' }}>
          <Link to="/login" style={{ color:'#2563EB' }}>← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
