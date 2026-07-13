/**
 * IlmForge — Split-Layout Login (v3.3 redesign)
 * Left branding panel (40%) + right form panel (60%).
 * Responsive: on mobile the branding panel collapses to a compact top bar.
 * All auth logic (login, demo fill, role redirect, toasts) preserved exactly.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, FileDown, UserPlus,
  Mail, Lock, CheckCircle2, CalendarCheck, Wallet, Users, MessageCircle,
} from 'lucide-react';
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
  const brandColor = typeof window !== 'undefined' ? (localStorage.getItem('brandPrimaryColor') || '#0073b7') : '#0073b7';

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
    { role: 'Admin', email: 'admin@demo.com', pw: 'Admin@123', color: '#1B2F6E' },
    { role: 'Teacher', email: 'teacher1@demo.com', pw: 'teacher', color: '#047857' },
    { role: 'Accountant', email: 'accountant@demo.com', pw: 'accountant', color: '#B45309' },
    { role: 'Parent', email: 'parent1@demo.com', pw: 'parent', color: '#7C3AED' },
  ];

  const features = [
    { icon: CalendarCheck, label: 'Smart Attendance' },
    { icon: Wallet, label: 'Fee Management' },
    { icon: Users, label: 'Parent Portal' },
    { icon: MessageCircle, label: 'WhatsApp Alerts' },
  ];

  const inputWrap = { position: 'relative', marginBottom: 16 };
  const inputCss = {
    width: '100%', minHeight: 48, padding: '13px 16px 13px 44px', borderRadius: 12,
    border: '1.5px solid #E2E8F0', fontSize: 14.5, outline: 'none', background: '#FFFFFF',
    color: '#0F172A', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box',
  };
  const labelCss = {
    display: 'block', fontSize: 11, fontWeight: 800, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7,
  };
  const iconCss = { position: 'absolute', left: 15, top: 41, color: '#94A3B8', pointerEvents: 'none' };

  return (
    <div
      className="ilm-login-shell"
      style={{
        minHeight: '100vh', display: 'flex', width: '100%',
        fontFamily: "'Inter','Poppins',system-ui,sans-serif", background: '#F1F5F9',
      }}
    >
      {/* ============ LEFT BRANDING PANEL (40%) ============ */}
      <div
        className="ilm-login-brand"
        style={{
          flex: '0 0 40%', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 100%)',
          color: '#fff', display: 'flex', flexDirection: 'column',
          padding: '44px 40px', justifyContent: 'space-between',
        }}
      >
        <div className="mesh-blob" style={{ position: 'absolute', width: 460, height: 460, top: -180, left: -140, background: 'radial-gradient(circle, rgba(94,234,212,0.16), transparent 65%)', borderRadius: '50%', filter: 'blur(2px)' }} />
        <div className="mesh-blob-2" style={{ position: 'absolute', width: 400, height: 400, bottom: -160, right: -120, background: 'radial-gradient(circle, rgba(96,165,250,0.22), transparent 65%)', borderRadius: '50%', filter: 'blur(2px)' }} />
        <div className="grid-pattern" style={{ position: 'absolute', inset: 0, opacity: .35 }} />

        {/* Top: logo lockup */}
        <div className="ilm-brand-top" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          {schoolLogo
            ? <img src={schoolLogo} alt="School" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 22px rgba(0,0,0,0.3)' }} />
            : <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 6, display: 'flex' }}><IlmForgeLogo size={40} showText={false} /></div>}
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.01em' }}>IlmForge</span>
        </div>

        {/* Middle: headline + features */}
        <div className="ilm-brand-mid" style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.03em', margin: 0 }}>
            {schoolName || 'IlmForge'}
          </h1>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.82)', marginTop: 10 }}>
            Ilm Ko Asaan Banaye 🇵🇰
          </p>

          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 15 }}>
            {features.map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} color="#5EEAD4" />
                </span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>
                  <CheckCircle2 size={14} style={{ verticalAlign: '-2px', marginRight: 6, color: '#5EEAD4' }} />
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: badge */}
        <div className="ilm-brand-bottom" style={{ position: 'relative' }}>
          <span className="glass-dark" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999,
            padding: '9px 16px', fontSize: 12.5, fontWeight: 800, color: '#fff',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
          }}>
            🇵🇰 Made for Pakistani Schools
          </span>
        </div>
      </div>

      {/* ============ RIGHT FORM PANEL (60%) ============ */}
      <div
        className="ilm-login-form-side"
        style={{
          flex: 1, background: '#ffffff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '40px 24px',
        }}
      >
        <div className="fade-up" style={{
          width: '100%', maxWidth: 440,
          background: '#ffffff', borderRadius: 20, padding: '8px 4px',
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Welcome Back 👋
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>
              Sign in to your school dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={inputWrap}>
              <label style={labelCss}>Email Address</label>
              <Mail size={17} style={iconCss} />
              <input
                type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@school.com" style={inputCss}
                onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 4px ${brandColor}1a`; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={inputWrap}>
              <label style={labelCss}>Password</label>
              <Lock size={17} style={iconCss} />
              <input
                type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" style={{ ...inputCss, paddingRight: 46 }}
                onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 4px ${brandColor}1a`; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 14, top: 40, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <Link to="/forgot-password" style={{ fontSize: 12.5, fontWeight: 700, color: brandColor, textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn-shine"
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 100%)', color: '#fff',
                fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 12px 28px rgba(27,47,110,0.35)', opacity: isLoading ? .7 : 1,
              }}>
              {isLoading ? <Loader2 size={17} className="animate-spin" /> : <><ArrowRight size={17} /> Sign In Securely 🔒</>}
            </button>
          </form>

          {/* Demo separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>Or try a demo account</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {demos.map(d => {
              const active = form.email === d.email;
              return (
                <button key={d.role} type="button" onClick={() => setForm({ email: d.email, password: d.pw })}
                  style={{
                    fontSize: 11.5, fontWeight: 800, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
                    border: `1.5px solid ${active ? d.color : '#E2E8F0'}`,
                    background: active ? `${d.color}12` : '#fff',
                    color: active ? d.color : '#64748B', transition: 'all .12s',
                  }}>
                  {d.role}
                </button>
              );
            })}
          </div>

          {/* Public separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>Public Access</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link to="/apply" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 10, background: '#F0FDFA', border: '1.5px solid #99F6E4', color: '#0F766E', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>
              <UserPlus size={14} /> Apply Admission
            </Link>
            <Link to="/fee-voucher" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 10, background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#B45309', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>
              <FileDown size={14} /> Fee Voucher
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22, fontSize: 10.5, color: '#94A3B8', fontWeight: 700 }}>
            <ShieldCheck size={12} /> Secured by IlmForge · Ilm Ko Asaan Banaye 🇵🇰
          </div>
        </div>
      </div>

      {/* Responsive rules: collapse the left panel into a compact top bar on mobile */}
      <style>{`
        @media (max-width: 860px) {
          .ilm-login-shell { flex-direction: column; }
          .ilm-login-brand {
            flex: none !important;
            padding: 18px 22px !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
          }
          .ilm-brand-mid, .ilm-brand-bottom { display: none !important; }
          .ilm-login-form-side { padding: 30px 18px !important; }
        }
      `}</style>
    </div>
  );
}
