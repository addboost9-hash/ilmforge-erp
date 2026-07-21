import RegistrationSuccessModal from './RegistrationSuccessModal';
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { ArrowRight, Loader2, CheckCircle, Upload, Camera, Mail, Phone, Building2 } from 'lucide-react';
import IlmForgeLogo from '../../components/brand/IlmForgeLogo';

const PLANS = [
  { val:'free',     label:'Free',     desc:'Up to 100 students',  color:'#64748B' },
  { val:'starter',  label:'Starter',  desc:'Up to 300 students',  color:'#2563EB' },
  { val:'standard', label:'Standard', desc:'Up to 800 students',  color:'#0D9488' },
  { val:'premium',  label:'Premium',  desc:'Unlimited students',  color:'#7C3AED' },
];

export default function RegisterPage() {
  const nav = useNavigate();
  const logoRef = useRef();
  const submitLockRef = useRef(false);
  const [form, setForm] = useState({
    schoolName: '', name: '', email: '', phone: '', plan: 'free',
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);
  const [pendingNav, setPendingNav] = useState(null);
  const [emailError, setEmailError] = useState('');

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const linkSlugPreview = (form.schoolName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42);
  const brandedLinkPreview = `${window.location.origin}/login?slug=${linkSlugPreview || 'your-school'}`;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be smaller than 2MB');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
      try { localStorage.setItem('schoolLogoPreview', ev.target.result); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setEmailError('');
    if (!form.schoolName || !form.name || !form.email || !form.phone)
      return toast.error('Please fill in all required fields');
    const email = String(form.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) return toast.error('Please enter a valid email address');

    setLoading(true);
    try {
      const payload = {
        schoolName: form.schoolName,
        name:       form.name,
        email,
        phone:      form.phone,
        plan:       form.plan,
        logoUrl:    logoPreview || undefined,
        // No password — system will generate one and email it
      };

      let data;
      try {
        const res = await api.post('/auth/register', payload, { timeout: 45000 });
        data = res.data;
      } catch (firstErr) {
        // One safe retry for transient dev-time startup/network hiccups.
        if (!firstErr?.response && firstErr?.code !== 'ECONNABORTED') {
          await wait(450);
          const retryRes = await api.post('/auth/register', payload, { timeout: 45000 });
          data = retryRes.data;
        } else {
          throw firstErr;
        }
      }

      // Save registration info to localStorage
      try {
        localStorage.setItem('registeredSchoolEmail', email);
        localStorage.setItem('registeredSchoolName', form.schoolName);
        const slug = data.data?.onboarding?.schoolSlug || form.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        localStorage.setItem('schoolSlug', slug);
        if (data.data?.onboarding?.schoolLogoUrl) localStorage.setItem('schoolLogoPreview', data.data.onboarding.schoolLogoUrl);
      } catch {}

      // Show credentials + unique school link popup (professional onboarding)
      const navState = {
        userId:     data.data.userId,
        phone:      data.data.phoneMasked,
        devOtp:     data.data.devOtp,
        email,
        schoolName: form.schoolName,
      };
      setPendingNav(navState);
      if (data.data.onboarding) {
        setOnboardingData(data.data.onboarding);   // popup with creds + unique link
      } else {
        setTimeout(() => nav('/verify-phone', { state: navState }), 2500);
      }
    } catch (err) {
      const status = err?.response?.status;
      const apiData = err?.response?.data;
      const apiMsg =
        (typeof apiData === 'string' ? apiData : apiData?.message) ||
        err?.message;

      if (status === 409) {
        const msg = apiMsg || 'This email already exists. Use resend credentials or another email.';
        setEmailError(msg);
        toast.error(msg);
      } else if (err?.code === 'ECONNABORTED') {
        const msg = 'Registration is taking longer than expected. The server may still complete signup; wait 30 seconds, then try login or resend credentials.';
        setEmailError(msg);
        toast.error('Request timed out. Please wait a moment and try again.');
      } else if (!err?.response) {
        setEmailError('Could not reach the API endpoint. Check network/CORS and confirm backend is available at http://localhost:5000.');
        toast.error('Network error. Backend may be unreachable from browser context.');
      } else if (status === 400 || status === 422) {
        setEmailError(apiMsg || 'Please check your form values and try again.');
        toast.error(apiMsg || 'Invalid registration request.');
      } else {
        setEmailError('');
        toast.error(apiMsg || `Registration failed (HTTP ${status || 'unknown'}). Please try again.`);
      }
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  // ── Registration Form ─────────────────────────────────────────────────────
  return (
    <>
    <div style={{ minHeight:'100vh', background:'#F0F4F8', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ width:'100%', maxWidth:560, background:'#fff', borderRadius:16, padding:'32px 36px', boxShadow:'0 8px 32px rgba(0,0,0,0.1)' }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <IlmForgeLogo size="md" />
          <div style={{ fontSize:11.5, color:'#64748B', marginTop:6 }}>Create your school account</div>
        </div>

        <h2 style={{ fontSize:21, fontWeight:800, color:'#1E3A5F', marginBottom:4 }}>Register Your School</h2>
        <p style={{ color:'#64748B', fontSize:13, marginBottom:20, lineHeight:1.6 }}>
          Your login password will be <strong>auto-generated</strong> and sent to your email address immediately after registration.
        </p>

        <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'10px 12px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#1D4ED8', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>
            Unique Login Link Preview
          </div>
          <div style={{ fontSize:12, color:'#1E3A8A', fontFamily:"'Consolas',monospace", wordBreak:'break-all' }}>
            {brandedLinkPreview}
          </div>
          <div style={{ fontSize:10.5, color:'#64748B', marginTop:4 }}>
            Final unique link with generated school slug will be shown after registration.
          </div>
        </div>

        {/* Email notification banner */}
        <div style={{ background:'#F0FDF9', border:'1px solid #CCFBF1', borderRadius:9, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:9 }}>
          <Mail size={15} color="#0D9488" style={{ flexShrink:0 }}/>
          <p style={{ fontSize:12.5, color:'#0F766E', margin:0 }}>
            After registration, your <strong>school name, login URL, email and generated password</strong> will be sent to your email.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Logo upload */}
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:8 }}>
              School Logo (optional — shown on login page, portal &amp; vouchers)
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div onClick={() => logoRef.current?.click()}
                style={{ width:66,height:66,borderRadius:16,overflow:'hidden',border:'2px dashed #CBD5E1',cursor:'pointer',background:logoPreview?'transparent':'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                {logoPreview
                  ? <img src={logoPreview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                  : <Camera size={22} color="#94A3B8"/>
                }
              </div>
              <button type="button" onClick={() => logoRef.current?.click()}
                className="btn btn-outline btn-sm">
                <Upload size={13}/> {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
              <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoChange}/>
            </div>
          </div>

          {/* Fields */}
          <div className="form-group">
            <label className="form-label">School Name *</label>
            <input className="form-input" placeholder="e.g. City Grammar School Rawalpindi"
              value={form.schoolName} onChange={e=>setForm({...form,schoolName:e.target.value})}/>
          </div>

          <div className="form-group">
            <label className="form-label">Your Full Name *</label>
            <input className="form-input" placeholder="Muhammad Ali Khan"
              value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" type="email" placeholder="admin@school.com"
                  value={form.email}
                  onChange={e => { setForm({ ...form, email: e.target.value }); if (emailError) setEmailError(''); }}
                  style={{ paddingLeft:32 }}/>
                <Mail size={13} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8' }}/>
              </div>
              <div style={{ fontSize:10.5,color:'#0D9488',fontWeight:600,marginTop:3 }}>
                Your OTP + password will be sent here
              </div>
              {emailError && (
                <div style={{ fontSize:11.5, color:'#B91C1C', marginTop:5, lineHeight:1.45 }}>
                  {emailError}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" placeholder="03XXXXXXXXX"
                  value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{ paddingLeft:32 }}/>
                <Phone size={13} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8' }}/>
              </div>
              <div style={{ fontSize:10.5,color:'#64748B',marginTop:3 }}>Used for account recovery</div>
            </div>
          </div>

          {/* Plan */}
          <div className="form-group">
            <label className="form-label">Select Plan</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {PLANS.map(p => (
                <div key={p.val} onClick={() => setForm({...form,plan:p.val})}
                  style={{ border:`2px solid ${form.plan===p.val?p.color:'#E8EDF3'}`, borderRadius:9, padding:'8px 10px', cursor:'pointer', background:form.plan===p.val?p.color+'10':'#FAFAFA', textAlign:'center', transition:'all 0.12s' }}>
                  {form.plan===p.val && <CheckCircle size={13} color={p.color} style={{ display:'block',margin:'0 auto 3px' }}/>}
                  <div style={{ fontWeight:700, fontSize:12, color:form.plan===p.val?p.color:'#1E3A5F' }}>{p.label}</div>
                  <div style={{ fontSize:10.5, color:'#64748B', marginTop:1 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms */}
          <p style={{ fontSize:12, color:'#94A3B8', marginBottom:14, lineHeight:1.6 }}>
            By registering you agree to our <a href="#" style={{ color:'#0D9488' }}>Terms of Service</a> and <a href="#" style={{ color:'#0D9488' }}>Privacy Policy</a>.
          </p>

          <button type="submit" className="btn btn-teal btn-lg"
            style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
            {loading
              ? <><Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }}/> Creating account…</>
              : <><ArrowRight size={17}/> Create School Account — Get Password by Email</>
            }
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#64748B' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'#0D9488', fontWeight:700, textDecoration:'none' }}>Sign In →</Link>
        </p>
      </div>
    </div>
      {onboardingData && (
        <RegistrationSuccessModal
          onboarding={onboardingData}
          onClose={() => { setOnboardingData(null); nav('/verify-phone', { state: pendingNav }); }}
          onGoToLogin={() => { setOnboardingData(null); nav('/verify-phone', { state: pendingNav }); }}
        />
      )}
    </>
  );
}
