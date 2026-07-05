/**
 * IlmForge — Branded School Login Page
 * Opens when user clicks the unique school link from email:
 *   /login?slug=future-foundation-abc
 *   /login?slug=demo-school-xyz&ref=verified
 *
 * Shows: school logo + school name + clean login form
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';

export default function BrandedLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, isLoading } = useAuthStore();

  const slug      = params.get('slug')  || '';
  const ref       = params.get('ref')   || '';   // 'verified' = just finished OTP

  const [school,    setSchool]    = useState(null);
  const [loadingSch,setLoadingSch]= useState(true);
  const [schoolNotFound, setSchoolNotFound] = useState(false);
  const [form,      setForm]      = useState({ email:'', password:'' });
  const [showPw,    setShowPw]    = useState(false);
  const [justVerified, setJustVerified] = useState(ref === 'verified');

  /* Fetch school branding from API */
  useEffect(() => {
    if (!slug) { setLoadingSch(false); setSchoolNotFound(false); return; }
    api.get(`/public/school/${slug}`)
      .then(r => {
        const d = r.data.data;
        setSchool(d);
        setSchoolNotFound(false);
        try {
          if (d?.logoUrl) localStorage.setItem('schoolLogoPreview', d.logoUrl);
          if (d?.name) localStorage.setItem('registeredSchoolName', d.name);
          if (d?.slug) localStorage.setItem('schoolSlug', d.slug);
        } catch {}
        setLoadingSch(false);
      })
      .catch(() => { setLoadingSch(false); setSchoolNotFound(true); setSchool(null); });
  }, [slug]);

  /* Hide "just verified" banner after 5 sec */
  useEffect(() => {
    if (!justVerified) return;
    const t = setTimeout(() => setJustVerified(false), 5000);
    return () => clearTimeout(t);
  }, [justVerified]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    const res = await login({ email: form.email, password: form.password });
    if (res.success) {
      toast.success(`Welcome back! 👋`);
      navigate('/dashboard');
    } else {
      if (res.data?.code === 'PHONE_UNVERIFIED') {
        toast.error('Please verify your email first');
        navigate('/verify-phone', {
          state: {
            userId: res.data.userId,
            email: form.email,
            schoolName: school?.name || '',
          },
        });
      } else {
        toast.error(res.error || 'Invalid email or password');
      }
    }
  };

  /* Brand colors */
  const schoolName  = school?.name || (schoolNotFound ? 'School Not Found' : 'IlmForge School');
  const logoPreview = school?.logoUrl || (!slug ? (typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : null) : null);
  const schoolAddress = school?.address || school?.city || 'Pakistan';

  if (loadingSch) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0FDFA' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:48,height:48,border:'4px solid #CCFBF1',borderTopColor:'#0F766E',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 14px' }}/>
          <p style={{ color:'#0F766E', fontWeight:600, fontSize:14 }}>Loading school portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, #F0FDFA 0%, #ECFDF5 50%, #F0FDFA 100%)',
      padding: '32px 20px',
      fontFamily: "'Inter','Poppins',system-ui,sans-serif",
    }}>

      {/* ── Just Verified Banner ── */}
      {justVerified && (
        <div style={{
          background:'#DCFCE7', border:'1.5px solid #86EFAC',
          borderRadius:12, padding:'12px 20px', marginBottom:20,
          display:'flex', alignItems:'center', gap:10,
          maxWidth:440, width:'100%',
          animation:'fadeUp .3s ease',
        }}>
          <CheckCircle size={18} color="#15803D"/>
          <div>
            <div style={{ fontSize:13.5, fontWeight:700, color:'#15803D' }}>Email Verified Successfully! 🎉</div>
            <div style={{ fontSize:12, color:'#166534' }}>Your school is live. Sign in below to get started.</div>
          </div>
        </div>
      )}

      {/* ── School branding card ── */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(15,118,110,0.12)',
        border: '1px solid #CCFBF1',
        overflow: 'hidden',
      }}>

        {/* School header */}
        <div style={{
          background: 'linear-gradient(145deg, #0F4C45 0%, #0F766E 60%, #0D9488 100%)',
          padding: '32px 32px 24px',
          textAlign: 'center',
        }}>
          {/* School logo */}
          {logoPreview || school?.logoUrl ? (
            <img
              src={logoPreview || school?.logoUrl}
              alt={schoolName}
              style={{ width:80, height:80, borderRadius:18, objectFit:'cover', border:'3px solid rgba(255,255,255,0.3)', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', marginBottom:14 }}
            />
          ) : (
            <div style={{ width:80,height:80,borderRadius:18,background:'rgba(255,255,255,0.15)',border:'3px solid rgba(255,255,255,0.25)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:38,marginBottom:14,boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}>
              🎓
            </div>
          )}

          <h1 style={{ color:'#fff', fontSize:22, fontWeight:900, margin:'0 0 5px', letterSpacing:'-0.3px', lineHeight:1.2 }}>
            {schoolName}
          </h1>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:13, margin:0 }}>
            {schoolAddress} · School Management Portal
          </p>

          {/* IlmForge powered by */}
          <div style={{ marginTop:12, display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:99, padding:'4px 12px' }}>
            <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.55)' }}>Powered by</span>
            <span style={{ fontSize:11, fontWeight:700, color:'#D97706' }}>IlmForge</span>
          </div>
        </div>

        {/* Login form */}
        <div style={{ padding:'28px 32px 28px' }}>
          <h2 style={{ fontSize:19, fontWeight:800, color:'#0F4C45', margin:'0 0 6px' }}>
            Welcome back! 👋
          </h2>
          <p style={{ color:'#6B7280', fontSize:13.5, marginBottom:22 }}>
            Sign in to your school admin panel
          </p>

          {schoolNotFound && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', borderRadius:10, padding:'10px 12px', fontSize:12.5, marginBottom:14 }}>
              This school link is invalid or expired. Please use the latest unique link from registration email/popup.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@yourschool.com"
                value={form.email}
                onChange={e => setForm(f=>({...f, email:e.target.value}))}
                autoFocus
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:14, color:'#111827', background:'#FAFAFA', outline:'none', fontFamily:'inherit', transition:'border-color .14s, box-shadow .14s' }}
                onFocus={e=>{ e.target.style.borderColor='#0F766E'; e.target.style.boxShadow='0 0 0 3px rgba(15,118,110,0.1)'; e.target.style.background='#fff'; }}
                onBlur={e=>{  e.target.style.borderColor='#E5E7EB'; e.target.style.boxShadow='none'; e.target.style.background='#FAFAFA'; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:10, position:'relative' }}>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Password
              </label>
              <input
                type={showPw?'text':'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f=>({...f, password:e.target.value}))}
                style={{ width:'100%', padding:'11px 44px 11px 14px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:14, color:'#111827', background:'#FAFAFA', outline:'none', fontFamily:'inherit', transition:'border-color .14s, box-shadow .14s' }}
                onFocus={e=>{ e.target.style.borderColor='#0F766E'; e.target.style.boxShadow='0 0 0 3px rgba(15,118,110,0.1)'; e.target.style.background='#fff'; }}
                onBlur={e=>{  e.target.style.borderColor='#E5E7EB'; e.target.style.boxShadow='none'; e.target.style.background='#FAFAFA'; }}
              />
              <button type="button" onClick={()=>setShowPw(s=>!s)}
                style={{ position:'absolute', right:12, top:34, background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                {showPw?<EyeOff size={17}/>:<Eye size={17}/>}
              </button>
            </div>

            {/* Forgot */}
            <div style={{ textAlign:'right', marginBottom:20 }}>
              <Link to="/forgot-password" style={{ fontSize:12.5, color:'#0F766E', fontWeight:600, textDecoration:'none' }}>
                Forgot password?
              </Link>
            </div>

            {/* Login btn */}
            <button type="submit" disabled={isLoading}
              style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'linear-gradient(90deg,#0F766E,#0D9488)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', boxShadow:'0 4px 14px rgba(15,118,110,0.3)', transition:'all .14s' }}
              onMouseEnter={e=>{ if(!isLoading){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(15,118,110,0.38)'; }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 14px rgba(15,118,110,0.3)'; }}>
              {isLoading
                ? <><Loader2 size={17} style={{ animation:'spin .8s linear infinite' }}/> Signing in…</>
                : <><ArrowRight size={17}/> Login</>
              }
            </button>
          </form>

          {/* Terms */}
          <p style={{ fontSize:11.5, color:'#9CA3AF', textAlign:'center', marginTop:14, lineHeight:1.65 }}>
            By signing in you agree to{' '}
            <a href="#" style={{ color:'#0F766E', textDecoration:'none', fontWeight:500 }}>Terms of Service</a>
          </p>

          {/* Public access */}
          <div style={{ display:'flex', flexDirection:'column', gap:9, marginTop:18 }}>
            <Link to="/apply-admission"
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'linear-gradient(90deg,#0F4C45,#0F766E)',color:'#fff',padding:'10px 20px',borderRadius:9,textDecoration:'none',fontSize:13,fontWeight:700,transition:'all .14s' }}>
              Apply For Admission →
            </Link>
            <Link to="/fee-voucher"
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'linear-gradient(90deg,#B45309,#D97706)',color:'#fff',padding:'10px 20px',borderRadius:9,textDecoration:'none',fontSize:13,fontWeight:700,transition:'all .14s' }}>
              Download Fee Voucher ⬇
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:'1px solid #F3F4F6', padding:'14px 32px', textAlign:'center', background:'#FAFAFA' }}>
          <p style={{ fontSize:11.5, color:'#9CA3AF', margin:0 }}>
            © 2026 <strong style={{ color:'#0F766E' }}>IlmForge</strong> · Ilm Ko Asaan Banaye
          </p>
        </div>
      </div>

      {/* Back to main login */}
      <p style={{ marginTop:16, fontSize:12.5, color:'#6B7280' }}>
        <Link to="/login" style={{ color:'#0F766E', fontWeight:600, textDecoration:'none' }}>
          ← Back to main login
        </Link>
      </p>
    </div>
  );
}
