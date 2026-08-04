import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import {
  CheckCircle, ArrowRight, ArrowLeft, Upload, Camera,
  Palette, Building2, BookOpen, Users, Rocket, Plus,
  Play, MessageSquare, Globe, Copy, X
} from 'lucide-react';

/* ── step meta ─────────────────────────── */
const STEPS = [
  { n:1, label:'Branding',    icon:Palette,   desc:'Upload logo & choose colors'   },
  { n:2, label:'School Info', icon:Building2, desc:'Address, contact & motto'       },
  { n:3, label:'Classes',     icon:BookOpen,  desc:'Set up class structure'         },
  { n:4, label:'Fee & Staff', icon:Users,     desc:'Monthly fees & first teacher'   },
  { n:5, label:'All Set!',    icon:Rocket,    desc:'Your school is live 🎉'         },
];

const THEME_COLORS = [
  { name:'Teal',    primary:'#0D9488', sidebar:'#0F172A' },
  { name:'Navy',    primary:'#2563EB', sidebar:'#1E3A5F' },
  { name:'Purple',  primary:'#7C3AED', sidebar:'#2D1B69' },
  { name:'Green',   primary:'#15803D', sidebar:'#14532D' },
  { name:'Red',     primary:'#DC2626', sidebar:'#450A0A' },
  { name:'Orange',  primary:'#EA580C', sidebar:'#431407' },
];

/* ── step indicator ─────────────────────── */
function StepBar({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, padding:'24px 32px' }}>
      {STEPS.map((s, i) => {
        const done   = current > s.n;
        const active = current === s.n;
        const Icon   = s.icon;
        return (
          <div key={s.n} style={{ display:'flex', alignItems:'center' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{
                width:38, height:38, borderRadius:'50%',
                background: done ? '#22C55E' : active ? '#F0FDF9' : 'rgba(255,255,255,0.08)',
                border: active ? '2px solid #0D9488' : done ? '2px solid #22C55E' : '2px solid rgba(255,255,255,0.15)',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.2s',
              }}>
                {done
                  ? <CheckCircle size={18} color="#fff"/>
                  : <Icon size={16} color={active?'#0D9488':'rgba(255,255,255,0.35)'}/>
                }
              </div>
              <span style={{ fontSize:10, fontWeight: active?700:400, color: active?'#fff':done?'#4ADE80':'rgba(255,255,255,0.35)', whiteSpace:'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ width:40, height:2, background: done?'#22C55E':'rgba(255,255,255,0.1)', margin:'0 4px', marginBottom:14, transition:'background 0.3s', flexShrink:0 }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── credentials popup ──────────────────── */
function CredentialsModal({ onGoToDashboard, logoPreview, primaryColor }) {
  const nav = useNavigate();
  const [sending, setSending] = useState(false);
  const [copied,  setCopied]  = useState({});

  const slug        = (() => { try { return localStorage.getItem('schoolSlug') || ''; } catch { return ''; } })();
  const adminEmail  = (() => { try { return localStorage.getItem('registeredSchoolEmail') || ''; } catch { return ''; } })();
  const adminPass   = (() => { try { return localStorage.getItem('registrationPassword') || ''; } catch { return ''; } })();
  const schoolName  = (() => { try { return localStorage.getItem('registeredSchoolName') || 'Your School'; } catch { return 'Your School'; } })();

  const loginUrl = slug
    ? `https://ilmforge-erp.vercel.app/login?slug=${slug}`
    : 'https://ilmforge-erp.vercel.app/login';

  const copyField = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(prev => ({ ...prev, [key]: true }));
      toast.success('Copied!');
      setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
    });
  };

  const handleResend = async () => {
    setSending(true);
    try {
      await api.post('/auth/resend-credentials');
      toast.success('Credentials sent to your email!');
    } catch {
      toast.error('Could not resend. Please check your email inbox.');
    } finally {
      setSending(false);
    }
  };

  const goToDash = () => {
    if (onGoToDashboard) onGoToDashboard();
    else nav('/dashboard');
  };

  const credRow = (emoji, label, value, key, masked) => (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'10px 14px',
      background:'rgba(255,255,255,0.06)',
      borderRadius:8,
      marginBottom:8,
    }}>
      <span style={{ fontSize:16, flexShrink:0 }}>{emoji}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10.5, fontWeight:600, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:1 }}>{label}</div>
        <div style={{ fontSize:12.5, color:'#E2E8F0', fontFamily: key==='url'||key==='pass' ? 'monospace' : 'inherit', wordBreak:'break-all', whiteSpace: key==='url' ? 'normal' : 'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {masked ? '••••••••' : (value || <span style={{ color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>Not available</span>)}
        </div>
      </div>
      {value && (
        <button
          onClick={() => copyField(value, key)}
          style={{
            flexShrink:0,
            background: copied[key] ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
            border: `1px solid ${copied[key] ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius:6,
            padding:'5px 9px',
            cursor:'pointer',
            display:'flex', alignItems:'center', gap:4,
            color: copied[key] ? '#4ADE80' : '#94A3B8',
            fontSize:11,
            fontWeight:600,
            fontFamily:'inherit',
            transition:'all 0.15s',
          }}>
          {copied[key] ? <CheckCircle size={11}/> : <Copy size={11}/>}
          {copied[key] ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );

  return (
    /* overlay */
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,0.72)',
      backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20,
      fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      {/* card */}
      <div style={{
        width:'100%', maxWidth:520,
        background:'#0F172A',
        borderRadius:20,
        border:'1px solid rgba(255,255,255,0.1)',
        boxShadow:'0 32px 80px rgba(0,0,0,0.7)',
        overflow:'hidden',
        position:'relative',
        animation:'fadeInScale 0.25s ease',
      }}>
        <style>{`
          @keyframes fadeInScale {
            from { opacity:0; transform:scale(0.94) translateY(12px); }
            to   { opacity:1; transform:scale(1)    translateY(0);    }
          }
        `}</style>

        {/* close button */}
        <button
          onClick={goToDash}
          style={{
            position:'absolute', top:14, right:14, zIndex:2,
            background:'rgba(255,255,255,0.08)',
            border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:'50%', width:30, height:30,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#94A3B8',
            transition:'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          title="Close and go to dashboard"
        >
          <X size={15}/>
        </button>

        {/* header banner */}
        <div style={{
          background:'linear-gradient(135deg, #0D9488 0%, #0369A1 100%)',
          padding:'24px 28px 20px',
          textAlign:'center',
          position:'relative',
          overflow:'hidden',
        }}>
          {/* subtle decorative circles */}
          <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
          <div style={{ position:'absolute', bottom:-30, left:-10, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>

          {/* school logo or fallback */}
          <div style={{
            width:64, height:64, borderRadius:16,
            background: logoPreview ? 'transparent' : 'rgba(255,255,255,0.15)',
            border:'3px solid rgba(255,255,255,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 12px',
            overflow:'hidden',
            boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {logoPreview
              ? <img src={logoPreview} alt="School Logo" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <span style={{ fontSize:30 }}>🎓</span>
            }
          </div>

          <div style={{ fontSize:22, marginBottom:4 }}>🎉</div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#fff', margin:'0 0 4px', lineHeight:1.3 }}>
            Setup Complete! Your School is Live
          </h2>
          <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.8)', margin:0 }}>
            {schoolName}
          </p>
        </div>

        {/* body */}
        <div style={{ padding:'20px 24px 24px' }}>

          <p style={{ fontSize:13, color:'#64748B', textAlign:'center', marginBottom:16 }}>
            Save these credentials — you'll need them to login
          </p>

          {/* credentials box */}
          <div style={{
            background:'linear-gradient(135deg, rgba(13,148,136,0.18) 0%, rgba(13,148,136,0.08) 100%)',
            border:'1.5px solid rgba(13,148,136,0.35)',
            borderRadius:12,
            padding:'14px 14px 6px',
            marginBottom:14,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#5EEAD4', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
              Your Login Credentials
            </div>

            {credRow('🔗', 'Login URL', loginUrl, 'url')}
            {credRow('📧', 'Email', adminEmail, 'email')}
            {adminPass
              ? credRow('🔑', 'Password', adminPass, 'pass')
              : (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(255,255,255,0.06)', borderRadius:8, marginBottom:8 }}>
                  <span style={{ fontSize:16 }}>🔑</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10.5, fontWeight:600, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:1 }}>Password</div>
                    <div style={{ fontSize:12.5, color:'#FCD34D', fontStyle:'italic' }}>Sent to your email</div>
                  </div>
                </div>
              )
            }
            {credRow('👤', 'Role', 'Super Admin', 'role')}
          </div>

          {/* teacher/parent section */}
          <div style={{
            background:'rgba(37,99,235,0.1)',
            border:'1px solid rgba(37,99,235,0.25)',
            borderRadius:10,
            padding:'10px 14px',
            marginBottom:16,
            fontSize:12.5,
            color:'#93C5FD',
            lineHeight:1.6,
          }}>
            <strong style={{ color:'#BFDBFE', display:'block', marginBottom:2 }}>Giving portal access to teachers & parents?</strong>
            Go to <strong style={{ color:'#fff' }}>Portal Management</strong> &rarr; <strong style={{ color:'#fff' }}>Send Credentials</strong> to invite them.
          </div>

          {/* important notice */}
          <div style={{
            background:'rgba(239,68,68,0.08)',
            border:'1px solid rgba(239,68,68,0.25)',
            borderRadius:8,
            padding:'8px 12px',
            marginBottom:16,
            fontSize:11.5,
            color:'#FCA5A5',
            display:'flex', alignItems:'flex-start', gap:7,
          }}>
            <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>⚠️</span>
            <span>Important: This popup will not appear again. Save these details now or send them to your email.</span>
          </div>

          {/* action buttons */}
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={handleResend}
              disabled={sending}
              style={{
                flex:1,
                padding:'11px 14px',
                borderRadius:9,
                border:'1.5px solid rgba(255,255,255,0.12)',
                background:'rgba(255,255,255,0.05)',
                color:'#94A3B8',
                fontSize:13,
                fontWeight:600,
                cursor: sending ? 'not-allowed' : 'pointer',
                fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                transition:'background 0.15s',
                opacity: sending ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!sending) e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
            >
              {sending ? '⏳ Sending…' : '📧 Send to Email Again'}
            </button>

            <button
              onClick={goToDash}
              style={{
                flex:1,
                padding:'11px 14px',
                borderRadius:9,
                border:'none',
                background:'linear-gradient(90deg, #0D9488, #0369A1)',
                color:'#fff',
                fontSize:13,
                fontWeight:700,
                cursor:'pointer',
                fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                boxShadow:'0 4px 16px rgba(13,148,136,0.4)',
                transition:'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}
            >
              🚀 Go to Dashboard &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN ONBOARDING
══════════════════════════════════════════ */
export default function OnboardingPage() {
  const nav = useNavigate();
  const { school: authSchool, user } = useAuthStore();
  const logoRef = useRef();

  const [step,              setStep]              = useState(1);
  const [loading,           setLoading]           = useState(false);
  const [showCredentials,   setShowCredentials]   = useState(false);

  /* Step 1 — Branding */
  const [logo,         setLogo]         = useState(null);
  const [logoPreview,  setLogoPreview]  = useState(null);
  const [themeColor,   setThemeColor]   = useState(THEME_COLORS[0]);
  const [customColor,  setCustomColor]  = useState('#0D9488');

  /* Step 2 — School Info */
  const [info, setInfo] = useState({
    address:'', city:'Islamabad', phone:'', email:'',
    motto:'Educating for a Better Tomorrow',
    tagline:'Quality Education for Every Child',
  });

  /* Step 3 — Classes */
  const [classes, setClasses] = useState([
    'Nursery','KG','Class 1','Class 2','Class 3','Class 4','Class 5',
    'Class 6','Class 7','Class 8','Class 9','Class 10',
  ]);

  /* Step 4 — Fees & Teacher */
  const [fees, setFees] = useState({});
  const [teacher, setTeacher] = useState({ name:'', email:'', phone:'' });

  /* Step 5 — whatsapp msg */
  const slug = authSchool?.slug || 'your-school';
  const schoolUrl = `https://${slug}.eduforgeapp.cloud`;

  /* helper to advance to step 5 and show credentials popup */
  const goToStep5 = () => {
    setStep(5);
    setShowCredentials(true);
  };

  /* ── Handlers ─────────────────────────── */
  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image');
    if (file.size > 2*1024*1024) return toast.error('Max 2MB');
    setLogo(file);
    const r = new FileReader();
    r.onload = ev => {
      setLogoPreview(ev.target.result);
      try { localStorage.setItem('schoolLogoPreview', ev.target.result); } catch {}
    };
    r.readAsDataURL(file);
  };

  const applyBranding = () => {
    const color = themeColor?.primary || customColor;
    try {
      localStorage.setItem('brandPrimaryColor', color);
      localStorage.setItem('brandThemeName', themeColor?.name || 'Custom');
      document.documentElement.style.setProperty('--teal', color);
    } catch {}
  };

  const saveSchoolInfo = async () => {
    setLoading(true);
    try {
      await api.put('/settings/school', {
        name: authSchool?.name,
        address: info.address,
        city: info.city,
        phone: info.phone,
        email: info.email,
      });
      try { localStorage.setItem('registeredSchoolName', authSchool?.name||''); } catch {}
      setStep(3);
    } catch { setStep(3); }
    finally { setLoading(false); }
  };

  const saveClasses = async () => {
    setLoading(true);
    try {
      for (const name of classes.filter(c=>c.trim())) {
        const r = await api.post('/classes', { name:name.trim(), orderNo:classes.indexOf(name) });
        await api.post('/classes/'+r.data.data.id+'/sections', { name:'A' });
        await api.post('/classes/'+r.data.data.id+'/sections', { name:'B' });
      }
      setStep(4);
    } catch { setStep(4); }
    finally { setLoading(false); }
  };

  const saveFeeAndTeacher = async () => {
    setLoading(true);
    try {
      if (teacher.name && teacher.email) await api.post('/staff', { ...teacher, designation:'Teacher', salaryType:'monthly', basicSalary:0 });
      goToStep5();
    } catch { goToStep5(); }
    finally { setLoading(false); }
  };

  const primaryColor = themeColor?.primary || customColor;

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(145deg, #0D1117 0%, #0F2027 50%, #203A43 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:20, fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      {/* Credentials popup modal */}
      {showCredentials && (
        <CredentialsModal
          logoPreview={logoPreview}
          primaryColor={primaryColor}
          onGoToDashboard={() => {
            setShowCredentials(false);
            nav('/dashboard');
          }}
        />
      )}

      {/* Decorative background dots */}
      <div style={{ position:'fixed',inset:0,background:'radial-gradient(circle at 20% 50%,rgba(13,148,136,0.06) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(37,99,235,0.06) 0%,transparent 60%)',pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:660, background:'rgba(255,255,255,0.03)', backdropFilter:'blur(20px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 32px 80px rgba(0,0,0,0.5)', overflow:'hidden', position:'relative' }}>

        {/* ── Header ─── */}
        <div style={{ padding:'20px 32px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#0D9488,#0369A1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>🎓</div>
            <span style={{ fontWeight:700, fontSize:15, color:'#F1F5F9' }}>EduForge Pro</span>
            <span style={{ marginLeft:'auto', fontSize:12, color:'rgba(255,255,255,0.3)' }}>Setup Wizard</span>
          </div>
          <StepBar current={step}/>
        </div>

        {/* ── Content ─── */}
        <div style={{ padding:'28px 36px 32px' }}>

          {/* ─── STEP 1: Branding ─────────────────── */}
          {step===1 && (
            <div>
              <h2 style={{ fontSize:22, fontWeight:800, color:'#F1F5F9', marginBottom:5 }}>Brand Your School</h2>
              <p style={{ color:'#94A3B8', fontSize:13.5, marginBottom:24 }}>
                Your logo and colors appear on the login page, portals, vouchers, certificates and all reports.
              </p>

              {/* Logo upload */}
              <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:24 }}>
                <div onClick={()=>logoRef.current?.click()}
                  style={{ width:100,height:100,borderRadius:20,background: logoPreview?'transparent':'rgba(255,255,255,0.06)',border:`2px dashed ${logoPreview?primaryColor:'rgba(255,255,255,0.15)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',flexShrink:0,transition:'all 0.15s',position:'relative' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=primaryColor}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=logoPreview?primaryColor:'rgba(255,255,255,0.15)'}>
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                    : <div style={{ textAlign:'center',color:'rgba(255,255,255,0.4)' }}>
                        <Camera size={28} style={{ marginBottom:6,display:'block',margin:'0 auto 6px' }}/>
                        <div style={{ fontSize:10 }}>Upload Logo</div>
                      </div>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <button type="button" onClick={()=>logoRef.current?.click()}
                    style={{ display:'flex',alignItems:'center',gap:8,background:`${primaryColor}20`,border:`1.5px solid ${primaryColor}50`,color:primaryColor,padding:'9px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',marginBottom:10 }}>
                    <Upload size={14}/> {logoPreview?'Change Logo':'Upload School Logo'}
                  </button>
                  <p style={{ fontSize:11.5,color:'#64748B',lineHeight:1.6 }}>
                    Recommended: 250×250px, PNG with transparent background.<br/>
                    Max 2MB. Shows on login, sidebar, vouchers & certificates.
                  </p>
                </div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogo}/>
              </div>

              {/* Theme colors */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12.5, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10, display:'block' }}>
                  Choose Brand Color
                </label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {THEME_COLORS.map(tc=>(
                    <div key={tc.name}
                      onClick={()=>{ setThemeColor(tc); document.documentElement.style.setProperty('--teal',tc.primary); }}
                      style={{
                        display:'flex', alignItems:'center', gap:7,
                        padding:'7px 12px', borderRadius:9, cursor:'pointer',
                        border:`2px solid ${themeColor.name===tc.name?tc.primary:'rgba(255,255,255,0.1)'}`,
                        background: themeColor.name===tc.name ? `${tc.primary}20` : 'rgba(255,255,255,0.04)',
                        transition:'all 0.12s',
                      }}>
                      <div style={{ width:14,height:14,borderRadius:'50%',background:tc.primary,flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:themeColor.name===tc.name?'#F1F5F9':'#6B7280', fontWeight:themeColor.name===tc.name?600:400 }}>{tc.name}</span>
                      {themeColor.name===tc.name && <CheckCircle size={12} color={tc.primary}/>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom color */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, padding:'10px 14px', background:'rgba(255,255,255,0.04)', borderRadius:9, border:'1px solid rgba(255,255,255,0.08)' }}>
                <label style={{ fontSize:12.5, color:'#94A3B8', whiteSpace:'nowrap' }}>Custom Color:</label>
                <input type="color" value={customColor} onChange={e=>{ setCustomColor(e.target.value); setThemeColor(null); document.documentElement.style.setProperty('--teal',e.target.value); }}
                  style={{ width:36,height:32,borderRadius:6,border:'none',cursor:'pointer',background:'none' }}/>
                <input className="form-input" value={customColor} onChange={e=>setCustomColor(e.target.value)}
                  style={{ flex:1, fontFamily:'monospace', fontSize:13, height:34, background:'transparent', color:'#F1F5F9', borderColor:'rgba(255,255,255,0.1)' }}/>
              </div>

              <button onClick={()=>{ applyBranding(); setStep(2); }}
                style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:`linear-gradient(90deg,${primaryColor},${primaryColor}CC)`, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:`0 4px 16px ${primaryColor}40` }}>
                Continue — School Info <ArrowRight size={17}/>
              </button>
            </div>
          )}

          {/* ─── STEP 2: School Info ──────────────── */}
          {step===2 && (
            <div>
              <h2 style={{ fontSize:22, fontWeight:800, color:'#F1F5F9', marginBottom:5 }}>School Information</h2>
              <p style={{ color:'#94A3B8', fontSize:13.5, marginBottom:24 }}>This appears on reports, certificates, vouchers and the login page.</p>

              {/* Preview of current school name */}
              <div style={{ background:`${primaryColor}15`, border:`1px solid ${primaryColor}30`, borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
                {logoPreview
                  ? <img src={logoPreview} alt="" style={{ width:40,height:40,borderRadius:10,objectFit:'cover',flexShrink:0 }}/>
                  : <div style={{ width:40,height:40,borderRadius:10,background:primaryColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>🎓</div>
                }
                <div>
                  <div style={{ fontSize:14,fontWeight:800,color:'#F1F5F9' }}>{authSchool?.name}</div>
                  <div style={{ fontSize:11.5,color:'#64748B' }}>Your school is registered ✓</div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { label:'Tagline / Slogan', key:'tagline',  ph:'Quality Education for Every Child',  col:2 },
                  { label:'School Motto',     key:'motto',    ph:'Educating for a Better Tomorrow',   col:2 },
                  { label:'City',             key:'city',     ph:'Islamabad',                          col:1 },
                  { label:'Phone',            key:'phone',    ph:'051-1234567',                        col:1 },
                  { label:'Address',          key:'address',  ph:'F-8 Markaz, Blue Area',              col:2 },
                  { label:'Email',            key:'email',    ph:'info@yourschool.com',                col:2, type:'email' },
                ].map(f=>(
                  <div key={f.key} style={{ gridColumn:`span ${f.col}` }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6B7280', marginBottom:5 }}>{f.label}</label>
                    <input
                      className="form-input"
                      type={f.type||'text'}
                      placeholder={f.ph}
                      value={info[f.key]||''}
                      onChange={e=>setInfo({...info,[f.key]:e.target.value})}
                      style={{ background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', color:'#F1F5F9' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:10, marginTop:24 }}>
                <button onClick={()=>setStep(1)} style={{ padding:'10px 18px',borderRadius:9,border:'1.5px solid rgba(255,255,255,0.1)',background:'transparent',color:'#94A3B8',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,fontSize:13 }}>
                  <ArrowLeft size={14}/> Back
                </button>
                <button onClick={saveSchoolInfo} disabled={loading}
                  style={{ flex:1,padding:'13px',borderRadius:10,border:'none',background:`linear-gradient(90deg,${primaryColor},${primaryColor}CC)`,color:'#fff',fontSize:14.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 4px 16px ${primaryColor}40` }}>
                  {loading?'Saving…':'Continue — Add Classes'} <ArrowRight size={17}/>
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Classes ──────────────────── */}
          {step===3 && (
            <div>
              <h2 style={{ fontSize:22, fontWeight:800, color:'#F1F5F9', marginBottom:5 }}>Classes & Sections</h2>
              <p style={{ color:'#94A3B8', fontSize:13.5, marginBottom:20 }}>Each class gets Section A & B automatically. Add or remove as needed.</p>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
                {classes.map((c,i)=>(
                  <div key={i} style={{ position:'relative' }}>
                    <input
                      className="form-input"
                      value={c}
                      onChange={e=>{ const n=[...classes]; n[i]=e.target.value; setClasses(n); }}
                      style={{ background:'rgba(255,255,255,0.06)',border:`1.5px solid ${c?primaryColor+'40':'rgba(255,255,255,0.1)'}`,color:'#F1F5F9',paddingRight:28,textAlign:'center',fontSize:12.5 }}
                    />
                    <button onClick={()=>setClasses(classes.filter((_,j)=>j!==i))}
                      style={{ position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#374151',cursor:'pointer',fontSize:14,padding:2 }}>×</button>
                  </div>
                ))}
                <button onClick={()=>setClasses([...classes,''])}
                  style={{ height:36,borderRadius:7,border:`1.5px dashed rgba(255,255,255,0.15)`,background:'transparent',color:'#6B7280',cursor:'pointer',fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}>
                  <Plus size={12}/> Add
                </button>
              </div>

              <div style={{ background:'rgba(13,148,136,0.1)', border:'1px solid rgba(13,148,136,0.2)', borderRadius:9, padding:'10px 14px', fontSize:12.5, color:'#94A3B8', marginBottom:20 }}>
                💡 Each class will automatically get Section <strong style={{ color:'#5EEAD4' }}>A</strong> and <strong style={{ color:'#5EEAD4' }}>B</strong>. You can add more sections later.
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setStep(2)} style={{ padding:'10px 18px',borderRadius:9,border:'1.5px solid rgba(255,255,255,0.1)',background:'transparent',color:'#94A3B8',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,fontSize:13 }}>
                  <ArrowLeft size={14}/> Back
                </button>
                <button onClick={saveClasses} disabled={loading}
                  style={{ flex:1,padding:'13px',borderRadius:10,border:'none',background:`linear-gradient(90deg,${primaryColor},${primaryColor}CC)`,color:'#fff',fontSize:14.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 4px 16px ${primaryColor}40` }}>
                  {loading?'Creating…':'Continue — Fees & Staff'} <ArrowRight size={17}/>
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Fees & Teacher ───────────── */}
          {step===4 && (
            <div>
              <h2 style={{ fontSize:22, fontWeight:800, color:'#F1F5F9', marginBottom:5 }}>Fee Structure & Staff</h2>
              <p style={{ color:'#94A3B8', fontSize:13.5, marginBottom:20 }}>Set monthly fees per class and optionally add your first teacher.</p>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {classes.filter(c=>c.trim()).slice(0,8).map((c,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12,fontWeight:600,color:'#6B7280',minWidth:68,textAlign:'right' }}>{c}</span>
                    <div style={{ position:'relative', flex:1 }}>
                      <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#6B7280',fontSize:12 }}>Rs.</span>
                      <input className="form-input" type="number" placeholder="3000"
                        value={fees[c]||''}
                        onChange={e=>setFees({...fees,[c]:e.target.value})}
                        style={{ paddingLeft:32, background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', color:'#F1F5F9', fontSize:13 }}/>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:16, marginBottom:16 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:'#6B7280', marginBottom:10 }}>FIRST TEACHER (optional)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[['Full Name','name','text','Ali Khan'],['Email','email','email','teacher@school.com'],['Phone','phone','text','03001234567']].map(([l,k,t,ph])=>(
                    <div key={k}>
                      <label style={{ display:'block', fontSize:11.5, color:'#6B7280', marginBottom:4 }}>{l}</label>
                      <input className="form-input" type={t} placeholder={ph} value={teacher[k]||''}
                        onChange={e=>setTeacher({...teacher,[k]:e.target.value})}
                        style={{ background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.1)',color:'#F1F5F9',fontSize:12.5 }}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setStep(3)} style={{ padding:'10px 18px',borderRadius:9,border:'1.5px solid rgba(255,255,255,0.1)',background:'transparent',color:'#94A3B8',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,fontSize:13 }}>
                  <ArrowLeft size={14}/> Back
                </button>
                <button onClick={goToStep5} style={{ padding:'10px 18px',borderRadius:9,border:'1.5px solid rgba(255,255,255,0.1)',background:'transparent',color:'#94A3B8',cursor:'pointer',fontFamily:'inherit',fontSize:13 }}>
                  Skip
                </button>
                <button onClick={saveFeeAndTeacher} disabled={loading}
                  style={{ flex:1,padding:'13px',borderRadius:10,border:'none',background:`linear-gradient(90deg,${primaryColor},${primaryColor}CC)`,color:'#fff',fontSize:14.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 4px 16px ${primaryColor}40` }}>
                  {loading?'Saving…':'Finish Setup 🎉'} <ArrowRight size={17}/>
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 5: ALL SET ──────────────────── */}
          {step===5 && (
            <div style={{ textAlign:'center' }}>
              {/* Confetti-style success */}
              <div style={{ fontSize:60, marginBottom:12 }}>🎉</div>
              <h2 style={{ fontSize:26, fontWeight:800, color:'#F1F5F9', marginBottom:8 }}>Your School is Live!</h2>
              <p style={{ color:'#94A3B8', fontSize:14, marginBottom:24, lineHeight:1.7 }}>
                <strong style={{ color:'#F1F5F9' }}>{authSchool?.name}</strong> is fully set up and ready.<br/>
                Your branded portal is ready for students, parents and staff.
              </p>

              {/* Email confirmation card */}
              <div style={{ background:'#1A2633', borderRadius:14, padding:'16px 18px', marginBottom:24, textAlign:'left', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:34,height:34,borderRadius:'50%',background:'#0D9488',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>📧</div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:'#5EEAD4' }}>Email Sent to: {user?.email}</div>
                    <div style={{ fontSize:10.5,color:'#4B5563' }}>EduForge Pro — Credentials Delivery</div>
                  </div>
                </div>
                <div style={{ background:'rgba(13,148,136,0.08)', border:'1px solid rgba(13,148,136,0.2)', borderRadius:'4px 12px 12px 12px', padding:'12px 14px', fontSize:12.5, color:'#D1FAE5', lineHeight:1.9 }}>
                  <strong>Subject:</strong> 🎉 Your School "{authSchool?.name}" is Ready on EduForge Pro!<br/><br/>
                  🏫 <strong>School:</strong> {authSchool?.name}<br/>
                  🌐 <strong>Login URL:</strong> <span style={{ color:'#5EEAD4' }}>{schoolUrl}/login</span><br/>
                  📧 <strong>Email:</strong> {user?.email}<br/>
                  🔑 <strong>Password:</strong> <span style={{ fontFamily:'monospace', background:'rgba(255,255,255,0.1)', padding:'2px 8px', borderRadius:4 }}>Auto-generated (check your email)</span><br/><br/>
                  ⏰ 3-day free trial — upgrade anytime<br/>
                  💬 <strong>Support:</strong> +92 300 1234567
                </div>
                <div style={{ fontSize:10.5, color:'#374151', marginTop:6, textAlign:'right' }}>✉️ Sent via EduForge Pro</div>
              </div>

              {/* Your school URL */}
              <div style={{ background:`${primaryColor}15`, border:`1px solid ${primaryColor}30`, borderRadius:10, padding:'12px 16px', marginBottom:24, display:'flex', alignItems:'center', gap:10 }}>
                <Globe size={16} color={primaryColor}/>
                <span style={{ flex:1, fontSize:13, color:'#F1F5F9', fontFamily:'monospace' }}>{schoolUrl}</span>
                <button onClick={()=>{ navigator.clipboard.writeText(schoolUrl); toast.success('URL copied!'); }}
                  style={{ background:'none',border:'none',cursor:'pointer',color:primaryColor }}><Copy size={14}/></button>
              </div>

              {/* Quick action grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:24 }}>
                {[
                  { label:'Admit First Student', to:'/admissions',   emoji:'🎓' },
                  { label:'Collect Fee',          to:'/fees/collect', emoji:'💰' },
                  { label:'Mark Attendance',      to:'/attendance',   emoji:'✅' },
                  { label:'Add Staff',            to:'/staff/new',    emoji:'👨‍🏫' },
                ].map(a=>(
                  <button key={a.to} onClick={()=>nav(a.to)}
                    style={{ padding:'12px 14px',borderRadius:9,border:'1.5px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'#F1F5F9',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8,transition:'background 0.12s' }}
                    onMouseEnter={e=>e.currentTarget.style.background=`${primaryColor}20`}
                    onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                    <span style={{ fontSize:18 }}>{a.emoji}</span>{a.label}
                  </button>
                ))}
              </div>

              {/* Getting started video */}
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:40,height:40,borderRadius:9,background:'rgba(239,68,68,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Play size={18} color="#EF4444" fill="#EF4444"/>
                </div>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:13,fontWeight:600,color:'#F1F5F9' }}>Watch Getting Started Guide</div>
                  <div style={{ fontSize:11.5,color:'#6B7280' }}>5 minutes — cover all major features</div>
                </div>
                <a href="https://youtube.com" target="_blank" rel="noreferrer"
                  style={{ fontSize:12,color:primaryColor,fontWeight:600,textDecoration:'none' }}>Watch →</a>
              </div>

              <button onClick={()=>setShowCredentials(true)}
                style={{ width:'100%',padding:'14px',borderRadius:10,border:'none',background:`linear-gradient(90deg,${primaryColor},${primaryColor}AA)`,color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 6px 24px ${primaryColor}40` }}>
                <Rocket size={18}/> Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step number indicator */}
      <div style={{ marginTop:16, color:'rgba(255,255,255,0.3)', fontSize:12 }}>
        Step {step} of {STEPS.length}
      </div>

      {/* Credentials popup — shows on step 5 completion */}
      {showCredentials && (
        <CredentialsModal
          onGoToDashboard={()=>nav('/dashboard')}
          logoPreview={logoPreview}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
}
