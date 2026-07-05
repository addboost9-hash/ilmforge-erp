/**
 * IlmForge — Modern Full-Page Login (v3.3 redesign)
 * Full immersive design: animated teal mesh + grid, centered glass card,
 * circular emblem overlapping top, demo chips, role-based redirect.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, FileDown, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/auth.store';
import { IlmForgeLogo } from '../../components/brand/Brand';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: 'admin@demo.com', password: 'Admin@123' });
  const [showPw, setShowPw] = useState(false);

  const schoolLogo = typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : null;
  const schoolName = typeof window !== 'undefined' ? localStorage.getItem('registeredSchoolName') : null;
  const brandColor = typeof window !== 'undefined' ? (localStorage.getItem('brandPrimaryColor') || '#0F766E') : '#0F766E';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    const res = await login({ email: form.email, password: form.password });
    if (res.success) {
      const role = res.data.user?.role;
      const name = res.data.user?.name?.split(' ')[0] || 'User';
      toast.success(`Welcome, ${name}! 👋`);
      const portals = {
        parent: '/parent-portal', student: '/student-portal', teacher: '/teacher-portal',
        gatekeeper: '/gatekeeper-portal', accountant: '/fees/collect',
      };
      navigate(portals[role] || '/dashboard');
    } else {
      if (res.data?.code === 'PHONE_UNVERIFIED') {
        toast.error('Verify your phone first');
        navigate('/verify-phone', { state: { userId: res.data.userId } });
      } else toast.error(res.error || 'Invalid email or password');
    }
  };

  const demos = [
    { role: 'Admin', email: 'admin@demo.com', pw: 'Admin@123' },
    { role: 'Teacher', email: 'teacher1@demo.com', pw: 'teacher' },
    { role: 'Accountant', email: 'accountant@demo.com', pw: 'accountant' },
    { role: 'Parent', email: 'parent1@demo.com', pw: 'parent' },
  ];

  const inputWrap = { position: 'relative', marginBottom: 14 };
  const inputCss = {
    width: '100%', padding: '13px 16px', borderRadius: 14, border: '1.5px solid #E2E8F0',
    fontSize: 14.5, outline: 'none', background: '#FFFFFF', color: '#0F172A',
    transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box',
  };
  const labelCss = { display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 };

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 40px',
      background: `linear-gradient(150deg, #06342F 0%, ${brandColor} 45%, #0B5B52 100%)`,
      fontFamily: "'Inter','Poppins',system-ui,sans-serif",
    }}>
      <div className="mesh-blob" style={{ position: 'absolute', width: 560, height: 560, top: -220, left: -160, background: 'radial-gradient(circle, rgba(94,234,212,0.16), transparent 65%)', borderRadius: '50%', filter: 'blur(2px)' }} />
      <div className="mesh-blob-2" style={{ position: 'absolute', width: 480, height: 480, bottom: -180, right: -140, background: 'radial-gradient(circle, rgba(217,119,6,0.2), transparent 65%)', borderRadius: '50%', filter: 'blur(2px)' }} />
      <div className="grid-pattern" style={{ position: 'absolute', inset: 0, opacity: .5 }} />
      <div className="float-slow glass-dark" style={{ position: 'absolute', top: '13%', left: '7%', borderRadius: 14, padding: '10px 16px', color: '#fff', fontSize: 12, fontWeight: 800 }}>🎓 13 Hubs · 135+ Features</div>
      <div className="float-slower glass-dark" style={{ position: 'absolute', bottom: '11%', right: '7%', borderRadius: 14, padding: '10px 16px', color: '#fff', fontSize: 12, fontWeight: 800 }}>🇵🇰 Made for Pakistani Schools</div>

      <div className="fade-up" style={{
        position: 'relative', width: '100%', maxWidth: 440,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px) saturate(1.3)',
        borderRadius: 28, padding: '80px 34px 28px',
        boxShadow: '0 40px 90px rgba(2,44,40,0.45), 0 0 0 1px rgba(255,255,255,0.5)',
      }}>
        <div style={{ position: 'absolute', top: -52, left: '50%', transform: 'translateX(-50%)' }}>
          {schoolLogo
            ? <img src={schoolLogo} alt="School" style={{ width: 104, height: 104, borderRadius: '50%', objectFit: 'cover', border: '5px solid #fff', boxShadow: '0 14px 34px rgba(2,44,40,0.35)' }} />
            : <div style={{ background: '#fff', borderRadius: '50%', padding: 5, boxShadow: '0 14px 34px rgba(2,44,40,0.35)', display: 'flex' }}><IlmForgeLogo size={94} showText={false} /></div>}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>
            {schoolName || 'Welcome to IlmForge'} 👋
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 5 }}>
            {schoolName ? 'School Management Portal' : 'Ilm Ko Asaan Banaye — sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={inputWrap}>
            <label style={labelCss}>Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@school.com" style={inputCss}
              onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 4px ${brandColor}1a`; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div style={inputWrap}>
            <label style={labelCss}>Password</label>
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••" style={{ ...inputCss, paddingRight: 46 }}
              onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 4px ${brandColor}1a`; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
            <button type="button" onClick={() => setShowPw(s => !s)}
              style={{ position: 'absolute', right: 14, bottom: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <Link to="/forgot-password" style={{ fontSize: 12.5, fontWeight: 700, color: brandColor, textDecoration: 'none' }}>Forgot password?</Link>
          </div>

          <button type="submit" disabled={isLoading} className="btn-shine"
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${brandColor}, #0D9488)`, color: '#fff',
              fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 12px 28px ${brandColor}55`, opacity: isLoading ? .7 : 1,
            }}>
            {isLoading ? <Loader2 size={17} className="animate-spin" /> : <><ArrowRight size={17} /> Sign In Securely</>}
          </button>
        </form>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', textAlign: 'center', marginBottom: 8 }}>Demo Accounts — tap to fill</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {demos.map(d => (
              <button key={d.role} type="button" onClick={() => setForm({ email: d.email, password: d.pw })}
                style={{ fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 99, border: `1.5px solid ${form.email === d.email ? brandColor : '#E2E8F0'}`, background: form.email === d.email ? `${brandColor}12` : '#fff', color: form.email === d.email ? brandColor : '#64748B', cursor: 'pointer', transition: 'all .12s' }}>
                {d.role}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#94A3B8' }}>PUBLIC</span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Link to="/apply" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 12, background: '#F0FDFA', border: '1.5px solid #CCFBF1', color: '#0F766E', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>
            <UserPlus size={14} /> Apply Admission
          </Link>
          <Link to="/fee-voucher" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 12, background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#B45309', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>
            <FileDown size={14} /> Fee Voucher
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, fontSize: 10.5, color: '#94A3B8', fontWeight: 700 }}>
          <ShieldCheck size={12} /> Secured by IlmForge · Ilm Ko Asaan Banaye 🇵🇰
        </div>
      </div>
    </div>
  );
}
