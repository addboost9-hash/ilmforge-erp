/**
 * IlmForge — Branded School Login Page
 * /login?slug=future-foundation-abc
 * Shows school logo + name with IlmForge navy branding
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle, GraduationCap, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';

export default function BrandedLoginPage() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const { login, isLoading } = useAuthStore();

  const slug = params.get('slug') || '';
  const ref  = params.get('ref')  || '';

  const [school,       setSchool]       = useState(null);
  const [loadingSch,   setLoadingSch]   = useState(true);
  const [schoolError,  setSchoolError]  = useState(false);
  const [form,         setForm]         = useState({ email: '', password: '' });
  const [showPw,       setShowPw]       = useState(false);
  const [justVerified, setJustVerified] = useState(ref === 'verified');

  useEffect(() => {
    if (!slug) { setLoadingSch(false); return; }
    api.get(`/public/school/${slug}`)
      .then(r => {
        const d = r.data.data;
        setSchool(d);
        try {
          if (d?.logoUrl) localStorage.setItem('schoolLogoPreview', d.logoUrl);
          if (d?.name)    localStorage.setItem('registeredSchoolName', d.name);
          if (d?.slug)    localStorage.setItem('schoolSlug', d.slug);
        } catch {}
        setLoadingSch(false);
      })
      .catch(() => { setLoadingSch(false); setSchoolError(true); });
  }, [slug]);

  useEffect(() => {
    if (!justVerified) return;
    const t = setTimeout(() => setJustVerified(false), 6000);
    return () => clearTimeout(t);
  }, [justVerified]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Email aur password darj karein');
    const res = await login({ email: form.email, password: form.password });
    if (res.success) {
      navigate('/dashboard');
    } else {
      if (res.data?.code === 'PHONE_UNVERIFIED') {
        navigate('/verify-phone', { state: { userId: res.data.userId, email: form.email, schoolName: school?.name || '' } });
      } else {
        toast.error(res.error || 'Invalid email ya password');
      }
    }
  };

  const schoolName = school?.name || (schoolError ? 'School Not Found' : 'IlmForge School');
  const schoolCity = school?.city || school?.address || 'Pakistan';
  const logo       = school?.logoUrl || (localStorage.getItem('schoolLogoPreview') || null);

  /* Loading */
  if (loadingSch) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1B2F6E,#0073b7)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:52,height:52,border:'4px solid rgba(255,255,255,0.2)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 16px' }}/>
        <p style={{ color:'rgba(255,255,255,0.8)', fontWeight:600, fontSize:14 }}>School portal load ho raha hai…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(145deg, #0f1e4a 0%, #1B2F6E 40%, #0073b7 100%)',
      fontFamily: "'Segoe UI','Inter',system-ui,sans-serif",
    }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        .inp:focus { border-color:#0073b7 !important; box-shadow:0 0 0 3px rgba(0,115,183,0.15) !important; background:#fff !important; }
        .login-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(0,115,183,0.45) !important; }
        .link-btn:hover { transform:translateY(-1px); opacity:.9; }
      `}</style>

      {/* ── Left Panel — Branding ── */}
      <div style={{
        flex: '0 0 42%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background circles */}
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,0.03)', top:-100, left:-100, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-80, right:-80, pointerEvents:'none' }}/>

        {/* IlmForge brand */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <GraduationCap size={28} color="#D97706"/>
            <span style={{ fontSize:28, fontWeight:900, color:'white', letterSpacing:'-0.5px' }}>
              ilm<span style={{ color:'#D97706', fontFamily:"'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',serif" }}>فورج</span>
            </span>
          </div>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:0, letterSpacing:2, textTransform:'uppercase' }}>
            School Management System
          </p>
        </div>

        {/* School Logo + Name */}
        <div style={{ textAlign:'center', animation:'fadeUp .4s ease' }}>
          {logo ? (
            <img src={logo} alt={schoolName}
              style={{ width:110, height:110, borderRadius:22, objectFit:'cover', border:'4px solid rgba(255,255,255,0.2)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', marginBottom:20 }}
            />
          ) : (
            <div style={{ width:110,height:110,borderRadius:22,background:'rgba(255,255,255,0.1)',border:'4px solid rgba(255,255,255,0.15)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:20,boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize:52 }}>🎓</span>
            </div>
          )}

          <h1 style={{ color:'white', fontSize:24, fontWeight:900, margin:'0 0 8px', letterSpacing:'-0.3px', lineHeight:1.2 }}>
            {schoolName}
          </h1>
          <p style={{ color:'rgba(255,255,255,0.55)', fontSize:13.5, margin:'0 0 24px' }}>
            {schoolCity} · Pakistan
          </p>

          {/* Stats strip */}
          <div style={{ display:'flex', gap:20, justifyContent:'center' }}>
            {[
              { icon:'👨‍🎓', label:'Students' },
              { icon:'📚', label:'Courses' },
              { icon:'🏆', label:'Results' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'10px 16px', textAlign:'center' }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:3, fontWeight:600, letterSpacing:1 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Powered by footer */}
        <div style={{ position:'absolute', bottom:24, display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.3)', fontSize:11 }}>
          <BookOpen size={12}/>
          <span>Powered by <strong style={{ color:'#D97706' }}>IlmForge</strong> · اِلم کو آسان بنائے</span>
        </div>
      </div>

      {/* ── Right Panel — Login Form ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'white', borderRadius: '24px 0 0 24px', padding: '40px',
        boxShadow: '-8px 0 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Verified banner */}
          {justVerified && (
            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'12px 16px', marginBottom:24, display:'flex', alignItems:'center', gap:10, animation:'fadeUp .3s ease' }}>
              <CheckCircle size={18} color="#16a34a"/>
              <div>
                <div style={{ fontSize:13.5, fontWeight:700, color:'#15803d' }}>Email Verified! 🎉</div>
                <div style={{ fontSize:12, color:'#166534' }}>Account ready. Neeche sign in karein.</div>
              </div>
            </div>
          )}

          {/* Heading */}
          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:26, fontWeight:900, color:'#1e3a5f', margin:'0 0 6px' }}>
              Khush Aamdeed! 👋
            </h2>
            <p style={{ color:'#64748b', fontSize:14, margin:0 }}>
              <strong style={{ color:'#1B2F6E' }}>{schoolName}</strong> portal mein sign in karein
            </p>
          </div>

          {/* Error */}
          {schoolError && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:18 }}>
              ⚠️ School link invalid hai. Registration email se naya link use karein.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:7, letterSpacing:'0.3px' }}>
                EMAIL ADDRESS
              </label>
              <input className="inp"
                type="email" placeholder="admin@school.com"
                value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                autoFocus autoComplete="email"
                style={{ width:'100%', padding:'12px 14px', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#1e293b', background:'#f8fafc', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'all .15s' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:10, position:'relative' }}>
              <label style={{ display:'block', fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:7, letterSpacing:'0.3px' }}>
                PASSWORD
              </label>
              <input className="inp"
                type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                autoComplete="current-password"
                style={{ width:'100%', padding:'12px 46px 12px 14px', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#1e293b', background:'#f8fafc', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'all .15s' }}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position:'absolute', right:14, top:36, background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {/* Forgot */}
            <div style={{ textAlign:'right', marginBottom:22 }}>
              <Link to="/forgot-password" style={{ fontSize:12.5, color:'#1B2F6E', fontWeight:600, textDecoration:'none' }}>
                Password bhool gaye?
              </Link>
            </div>

            {/* Login button */}
            <button type="submit" className="login-btn" disabled={isLoading}
              style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#1B2F6E,#0073b7)', color:'white', fontSize:15, fontWeight:700, cursor: isLoading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', boxShadow:'0 4px 16px rgba(27,47,110,0.3)', transition:'all .15s', opacity: isLoading ? 0.8 : 1 }}>
              {isLoading
                ? <><Loader2 size={17} style={{ animation:'spin .8s linear infinite' }}/> Logging in…</>
                : <><ArrowRight size={17}/> Login Karein</>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
            <div style={{ flex:1, height:1, background:'#f1f5f9' }}/>
            <span style={{ fontSize:11.5, color:'#94a3b8', fontWeight:600 }}>YA</span>
            <div style={{ flex:1, height:1, background:'#f1f5f9' }}/>
          </div>

          {/* Quick links */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Link to="/apply-admission" className="link-btn"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#f0f4ff', color:'#1B2F6E', padding:'11px 20px', borderRadius:10, textDecoration:'none', fontSize:13.5, fontWeight:700, transition:'all .15s', border:'1px solid #dbeafe' }}>
              🎓 Admission Apply Karein
            </Link>
            <Link to="/fee-voucher" className="link-btn"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#fffbeb', color:'#92400e', padding:'11px 20px', borderRadius:10, textDecoration:'none', fontSize:13.5, fontWeight:700, transition:'all .15s', border:'1px solid #fde68a' }}>
              📄 Fee Voucher Download
            </Link>
          </div>

          {/* Footer */}
          <p style={{ fontSize:11.5, color:'#cbd5e1', textAlign:'center', marginTop:24, marginBottom:0 }}>
            © 2026 IlmForge School Management System
          </p>
        </div>
      </div>
    </div>
  );
}
