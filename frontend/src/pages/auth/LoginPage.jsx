/**
 * IlmForge — School-Branded Login Page
 * Left: school logo + features on teal gradient
 * Right: clean white login form with school branding
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2, Shield, Zap, BarChart3, Smartphone, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form,   setForm]   = useState({ email:'admin@demo.com', password:'Admin@123' });
  const [showPw, setShowPw] = useState(false);

  /* School branding from localStorage (set during registration / onboarding) */
  const schoolLogo  = typeof window!=='undefined' ? localStorage.getItem('schoolLogoPreview')    : null;
  const schoolName  = typeof window!=='undefined' ? localStorage.getItem('registeredSchoolName') : null;
  const brandColor  = typeof window!=='undefined' ? (localStorage.getItem('brandPrimaryColor') || '#0F766E') : '#0F766E';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    const res = await login({ email:form.email, password:form.password });
    if (res.success) {
      const role = res.data.user?.role;
      const name = res.data.user?.name?.split(' ')[0] || 'User';
      toast.success(`Welcome, ${name}! 👋`);
      // Role-based portal routing
      const portals = {
        parent:     '/parent-portal',
        student:    '/student-portal',
        teacher:    '/teacher-portal',
        gatekeeper: '/gatekeeper-portal',
        accountant: '/fees/collect',     // accountant uses admin panel, starts at fees
      };
      navigate(portals[role] || '/dashboard');
    } else {
      if (res.data?.code === 'PHONE_UNVERIFIED') {
        toast.error('Verify your phone first');
        navigate('/verify-phone', { state:{ userId:res.data.userId } });
      } else {
        toast.error(res.error || 'Invalid email or password');
      }
    }
  };

  const demos = [
    { role:'Admin',      email:'admin@demo.com',      pw:'Admin@123'  },
    { role:'Teacher',    email:'teacher1@demo.com',   pw:'teacher'    },
    { role:'Accountant', email:'accountant@demo.com', pw:'accountant' },
    { role:'Parent',     email:'parent1@demo.com',    pw:'parent'     },
  ];

  const features = [
    'Complete School ERP System',
    'Free Mobile App for Parents',
    'WhatsApp & SMS Alerts',
    '50+ Printable Reports',
    'Multi-Campus Management',
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Inter','Poppins',system-ui,sans-serif",
      background: '#F8FAFC',
    }}>

      {/* ═══ LEFT — Brand / School Info Panel ═══ */}
      <div style={{
        width: '45%', minWidth: 340,
        background: `linear-gradient(150deg, ${brandColor}F0 0%, ${brandColor} 50%, ${brandColor}D0 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '48px 40px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background patterns */}
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.07) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(217,119,6,0.08) 0%, transparent 50%)',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',width:300,height:300,top:-100,right:-100,border:'1px solid rgba(255,255,255,0.08)',borderRadius:'50%',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',width:200,height:200,bottom:-60,left:-60,border:'1px solid rgba(255,255,255,0.06)',borderRadius:'50%',pointerEvents:'none' }}/>

        {/* Brand section */}
        <div style={{ position:'relative', width:'100%', maxWidth:340, textAlign:'center' }}>

          {/* Logo — shows school logo if available, else IlmForge icon */}
          <div style={{ marginBottom:22 }}>
            {schoolLogo ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <img src={schoolLogo} alt="School Logo"
                  style={{ width:88,height:88,borderRadius:20,objectFit:'cover',border:'3px solid rgba(255,255,255,0.3)',boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}/>
                <div style={{ color:'#fff',fontWeight:900,fontSize:22,letterSpacing:'-0.3px',lineHeight:1.1 }}>
                  {schoolName || 'IlmForge'}
                </div>
                <div style={{ color:'rgba(255,255,255,0.6)',fontSize:13 }}>School Management Portal</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
                {/* IlmForge logo */}
                <div style={{ width:90,height:90,borderRadius:22,background:'rgba(255,255,255,0.15)',border:'2px solid rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
                  🎓
                </div>
                <div>
                  <div style={{ color:'#fff',fontWeight:900,fontSize:26,letterSpacing:'-0.4px',lineHeight:1.1 }}>IlmForge</div>
                  <div style={{ color:'rgba(255,255,255,0.65)',fontSize:13,fontWeight:500,marginTop:4 }}>Ilm Ko Asaan Banaye</div>
                </div>
              </div>
            )}
          </div>

          {/* Feature list */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:32, textAlign:'left' }}>
            {features.map(f => (
              <div key={f} style={{
                display:'flex', alignItems:'center', gap:11,
                background:'rgba(255,255,255,0.1)',
                border:'1px solid rgba(255,255,255,0.13)',
                borderRadius:10, padding:'9px 13px',
              }}>
                <CheckCircle size={14} color="#D97706" style={{ flexShrink:0 }}/>
                <span style={{ color:'rgba(255,255,255,0.88)', fontSize:13, fontWeight:500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* App download */}
        <div style={{ position:'relative', width:'100%', maxWidth:340 }}>
          <div style={{ display:'flex', gap:10, marginBottom:12 }}>
            {['Android App 📱','iOS App 📱'].map(label => (
              <a key={label} href="#"
                style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'9px 10px',borderRadius:9,textDecoration:'none',fontSize:12,fontWeight:600,transition:'background .12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.18)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
                <Smartphone size={13}/>{label}
              </a>
            ))}
          </div>
          <p style={{ textAlign:'center',fontSize:10.5,color:'rgba(255,255,255,0.35)' }}>
            Free app for parents, teachers & students
          </p>
        </div>
      </div>

      {/* ═══ RIGHT — Login Form ═══ */}
      <div style={{
        flex: 1, background: '#FFFFFF',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 52px',
        minWidth: 340, overflowY: 'auto',
      }}>
        <div style={{ width:'100%', maxWidth:390 }}>

          {/* Heading */}
          <div style={{ marginBottom:30 }}>
            <h2 style={{ fontSize:26, fontWeight:900, color:'#111827', margin:'0 0 7px', letterSpacing:'-0.3px' }}>
              Welcome back! 👋
            </h2>
            <p style={{ color:'#6B7280', fontSize:14 }}>
              Sign in to {schoolName || 'your school'} management panel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6 }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@yourschool.com"
                value={form.email}
                onChange={e => setForm(f => ({...f, email:e.target.value}))}
                autoFocus
                style={{
                  width:'100%',padding:'11px 14px',
                  border:'1.5px solid #E5E7EB',borderRadius:10,
                  fontSize:14,color:'#111827',background:'#FAFAFA',
                  outline:'none',fontFamily:'inherit',
                  transition:'border-color .14s,box-shadow .14s',
                }}
                onFocus={e=>{e.target.style.borderColor=brandColor;e.target.style.boxShadow=`0 0 0 3px ${brandColor}18`;e.target.style.background='#fff';}}
                onBlur={e=>{e.target.style.borderColor='#E5E7EB';e.target.style.boxShadow='none';e.target.style.background='#FAFAFA';}}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:10, position:'relative' }}>
              <label style={{ display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:6 }}>
                Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({...f, password:e.target.value}))}
                style={{
                  width:'100%',padding:'11px 44px 11px 14px',
                  border:'1.5px solid #E5E7EB',borderRadius:10,
                  fontSize:14,color:'#111827',background:'#FAFAFA',
                  outline:'none',fontFamily:'inherit',
                  transition:'border-color .14s,box-shadow .14s',
                }}
                onFocus={e=>{e.target.style.borderColor=brandColor;e.target.style.boxShadow=`0 0 0 3px ${brandColor}18`;e.target.style.background='#fff';}}
                onBlur={e=>{e.target.style.borderColor='#E5E7EB';e.target.style.boxShadow='none';e.target.style.background='#FAFAFA';}}
              />
              <button type="button" onClick={() => setShowPw(s=>!s)}
                style={{ position:'absolute',right:13,top:35,background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:4 }}>
                {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
              </button>
            </div>

            {/* Forgot */}
            <div style={{ textAlign:'right', marginBottom:22 }}>
              <Link to="/forgot-password" style={{ fontSize:13,color:brandColor,fontWeight:600,textDecoration:'none' }}>
                Forgot password?
              </Link>
            </div>

            {/* Login button */}
            <button type="submit" disabled={isLoading}
              style={{
                width:'100%',padding:'13px',borderRadius:10,border:'none',
                background:isLoading?`${brandColor}88`:`linear-gradient(90deg,${brandColor},${brandColor}DD)`,
                color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                fontFamily:'inherit',
                boxShadow:isLoading?'none':`0 4px 14px ${brandColor}30`,
                transition:'all .14s',
              }}
              onMouseEnter={e=>{if(!isLoading){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 6px 20px ${brandColor}40`;}}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=isLoading?'none':`0 4px 14px ${brandColor}30`;}}>
              {isLoading
                ? <><Loader2 size={17} style={{ animation:'spin .8s linear infinite' }}/> Signing in…</>
                : <><ArrowRight size={17}/> Login</>
              }
            </button>
          </form>

          {/* Terms */}
          <p style={{ fontSize:11.5,color:'#9CA3AF',textAlign:'center',marginTop:14,lineHeight:1.65 }}>
            By signing in you agree to our{' '}
            <a href="#" style={{ color:brandColor,textDecoration:'none',fontWeight:500 }}>Privacy Policy</a>{' '}
            and{' '}
            <a href="#" style={{ color:brandColor,textDecoration:'none',fontWeight:500 }}>Terms of Service</a>.
          </p>

          {/* ── Public access ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:22 }}>
            <Link to="/apply-admission"
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:`linear-gradient(90deg,${brandColor},${brandColor}CC)`,color:'#fff',padding:'11px 20px',borderRadius:10,textDecoration:'none',fontSize:13.5,fontWeight:700,boxShadow:`0 3px 10px ${brandColor}22`,transition:'all .14s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';}}>
              Apply For Admission →
            </Link>
            <Link to="/fee-voucher"
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'linear-gradient(90deg,#B45309,#D97706)',color:'#fff',padding:'11px 20px',borderRadius:10,textDecoration:'none',fontSize:13.5,fontWeight:700,boxShadow:'0 3px 10px rgba(217,119,6,0.2)',transition:'all .14s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';}}>
              Download Fee Voucher ⬇
            </Link>
          </div>

          {/* ── Demo credentials ── */}
          <div style={{ marginTop:22, background:'#F9FAFB', border:'1.5px solid #F3F4F6', borderRadius:12, padding:16 }}>
            <div style={{ fontSize:10.5,fontWeight:700,color:'#9CA3AF',marginBottom:10,textTransform:'uppercase',letterSpacing:.6 }}>
              Demo Credentials
            </div>
            {demos.map(c => (
              <div key={c.role} style={{ display:'flex',alignItems:'center',gap:8,padding:'4px 0',fontSize:12 }}>
                <span style={{ color:brandColor,fontWeight:700,minWidth:72 }}>{c.role}</span>
                <span style={{ color:'#374151',flex:1,fontSize:11 }}>{c.email}</span>
                <button type="button" onClick={() => setForm({ email:c.email, password:c.pw })}
                  style={{ background:`${brandColor}14`,color:brandColor,border:`1px solid ${brandColor}25`,padding:'2px 10px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'background .12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=`${brandColor}25`}
                  onMouseLeave={e=>e.currentTarget.style.background=`${brandColor}14`}>
                  Use
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop:18,textAlign:'center' }}>
            <span style={{ fontSize:12.5,color:'#9CA3AF' }}>New school? </span>
            <Link to="/register" style={{ color:brandColor,fontWeight:700,textDecoration:'none',fontSize:12.5 }}>
              Register for free →
            </Link>
          </div>

          <p style={{ textAlign:'center',marginTop:14,fontSize:11,color:'#D1D5DB' }}>
            © 2026 <strong style={{ color:'#9CA3AF' }}>IlmForge</strong> · Ilm Ko Asaan Banaye
          </p>
        </div>
      </div>
    </div>
  );
}
