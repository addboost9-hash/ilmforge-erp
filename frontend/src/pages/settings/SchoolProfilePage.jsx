/**
 * School Profile — Logo, colors, contact info, branding preview.
 * Accessible from Settings → School Info.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { useBranding } from '../../hooks/useBranding';
import { Save, Upload, Camera, Palette, Building2, Globe, Phone, Mail, MapPin, CheckCircle, BookOpen, Clock } from 'lucide-react';

const THEME_PRESETS = [
  { name:'Teal',   p:'#0D9488', s:'#0369A1' },
  { name:'Navy',   p:'#2563EB', s:'#1E3A5F' },
  { name:'Purple', p:'#7C3AED', s:'#4C1D95' },
  { name:'Green',  p:'#15803D', s:'#14532D' },
  { name:'Red',    p:'#DC2626', s:'#7F1D1D' },
  { name:'Orange', p:'#EA580C', s:'#431407' },
  { name:'Pink',   p:'#DB2777', s:'#831843' },
  { name:'Indigo', p:'#4F46E5', s:'#312E81' },
];

export default function SchoolProfilePage() {
  const { school, updateBranding, updateSchool } = useAuthStore();
  const { logo, primaryColor, schoolName, tagline, motto } = useBranding();
  const logoRef = useRef();

  const [form, setForm] = useState({
    name:     school?.name     || '',
    address:  school?.address  || '',
    city:     school?.city     || '',
    phone:    school?.phone    || '',
    email:    school?.email    || '',
    website:  school?.website  || '',
    tagline:  tagline          || '',
    motto:    motto            || '',
    session:  school?.session  || '',
    timezone: school?.timezone || 'Asia/Karachi',
    language: school?.language || 'English',
  });

  const [logoPreview,    setLogoPreview]    = useState(logo || '');
  const [selectedColor,  setSelectedColor]  = useState(primaryColor || '#0D9488');
  const [selectedPreset, setSelectedPreset] = useState(null);

  useEffect(() => {
    if (school) {
      setForm(f => ({
        ...f,
        name:     school.name     || f.name,
        address:  school.address  || f.address,
        city:     school.city     || f.city,
        phone:    school.phone    || f.phone,
        email:    school.email    || f.email,
        website:  school.website  || f.website,
        session:  school.session  || f.session,
        timezone: school.timezone || f.timezone,
        language: school.language || f.language,
      }));
    }
  }, [school]);

  /* Logo upload */
  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be smaller than 2MB');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
      updateBranding({ logo: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  /* Save */
  const save = useMutation({
    mutationFn: async () => {
      await api.put('/settings/school', {
        name:    form.name,
        address: form.address,
        city:    form.city,
        phone:   form.phone,
        email:   form.email,
      });
    },
    onSuccess: () => {
      updateBranding({
        primaryColor: selectedColor,
        schoolName:   form.name,
        tagline:      form.tagline,
        motto:        form.motto,
        ...(logoPreview && { logo: logoPreview }),
      });
      updateSchool({ ...school, name:form.name, address:form.address, city:form.city, phone:form.phone, email:form.email });
      /* Apply CSS var immediately */
      document.documentElement.style.setProperty('--teal', selectedColor);
      toast.success('School profile saved! 🎉');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save — check your connection'),
  });

  return (
    <div className="page-content fade-up">

      {/* ── School Identity page header ── */}
      <div className="ilm-page-header" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:60, height:60, borderRadius:14, background:'linear-gradient(135deg,#1B2F6E,#0073b7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, boxShadow:'0 4px 14px rgba(27,47,110,0.3)', flexShrink:0 }}>
              🏫
            </div>
            <div>
              <h1 className="ilm-page-title" style={{ margin:0, fontSize:22, fontWeight:800, color:'#1B2F6E' }}>School Profile</h1>
              <p className="ilm-page-subtitle" style={{ margin:'3px 0 0', fontSize:13.5, color:'#64748b' }}>Your school's identity and branding settings</p>
            </div>
          </div>
          <button className="btn btn-teal" onClick={() => save.mutate()} disabled={save.isPending}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, fontSize:13.5, fontWeight:700, flexShrink:0 }}>
            <Save size={15}/> {save.isPending ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>

        {/* ── Left — Form ─────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* ══ Section 1: School Identity ══ */}
          <div className="card" style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(10px)', border:'1px solid rgba(27,47,110,0.1)', borderRadius:14, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:12, borderBottom:'1px solid rgba(27,47,110,0.07)' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#1B2F6E18,#0073b718)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Building2 size={15} color="#1B2F6E"/>
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:13.5, fontWeight:800, color:'#1B2F6E', letterSpacing:'-0.01em' }}>School Identity</h3>
                <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>Name, logo, tagline and brand colors</p>
              </div>
            </div>

            {/* Logo upload */}
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:18 }}>
              <div onClick={() => logoRef.current?.click()}
                style={{ width:100, height:100, borderRadius:20, overflow:'hidden', border:`2px dashed ${selectedColor}60`, cursor:'pointer', background:logoPreview?'transparent':'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'border-color 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=selectedColor}
                onMouseLeave={e=>e.currentTarget.style.borderColor=`${selectedColor}60`}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                  : <div style={{ textAlign:'center',color:'#94A3B8' }}><Camera size={28} style={{ display:'block',margin:'0 auto 5px' }}/><div style={{ fontSize:11 }}>Click to upload</div></div>
                }
              </div>
              <div>
                <button type="button" onClick={()=>logoRef.current?.click()}
                  className="btn btn-teal btn-sm" style={{ marginBottom:8, display:'inline-flex', alignItems:'center', gap:6 }}>
                  <Upload size={13}/> {logoPreview?'Change Logo':'Upload Logo'}
                </button>
                <p style={{ fontSize:11.5,color:'#64748B',lineHeight:1.6,margin:0 }}>
                  PNG or JPG, max 2MB.<br/>
                  Recommended: 250×250px with transparent bg.<br/>
                  Used on login page, sidebar, PDFs & ID cards.
                </p>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogo}/>
            </div>

            {/* School name + tagline + motto */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
              {[
                { label:'School Name *',    key:'name',    span:2, ph:'City Grammar School' },
                { label:'Tagline / Slogan', key:'tagline', span:2, ph:'Quality Education for Every Child' },
                { label:'School Motto',     key:'motto',   span:2, ph:'Educating for a Better Tomorrow' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn:`span ${f.span}` }}>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:5 }}>{f.label}</label>
                  <input className="form-input" type="text" placeholder={f.ph}
                    value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>
                </div>
              ))}
            </div>

            {/* Brand color */}
            <div style={{ borderTop:'1px solid rgba(27,47,110,0.07)', paddingTop:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                <Palette size={13} color="#1B2F6E"/>
                <span style={{ fontSize:12.5, fontWeight:700, color:'#1B2F6E' }}>Brand Color</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                {THEME_PRESETS.map(t => (
                  <div key={t.name} onClick={()=>{ setSelectedColor(t.p); setSelectedPreset(t.name); document.documentElement.style.setProperty('--teal',t.p); }}
                    style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:8,cursor:'pointer',border:`2px solid ${selectedPreset===t.name?t.p:'#E8EDF3'}`,background:selectedPreset===t.name?`${t.p}12`:'#FAFAFA',transition:'all 0.12s' }}>
                    <div style={{ width:12,height:12,borderRadius:'50%',background:t.p }}/>
                    <span style={{ fontSize:11.5,fontWeight:selectedPreset===t.name?600:400,color:selectedPreset===t.name?t.p:'#64748B' }}>{t.name}</span>
                    {selectedPreset===t.name&&<CheckCircle size={10} color={t.p}/>}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <label style={{ fontSize:12.5,color:'#64748B',whiteSpace:'nowrap' }}>Custom:</label>
                <input type="color" value={selectedColor} onChange={e=>{ setSelectedColor(e.target.value); setSelectedPreset(null); document.documentElement.style.setProperty('--teal',e.target.value); }}
                  style={{ width:36,height:32,borderRadius:6,border:'1px solid #E8EDF3',cursor:'pointer' }}/>
                <input className="form-input" value={selectedColor} onChange={e=>setSelectedColor(e.target.value)}
                  style={{ flex:1,fontFamily:'monospace',fontSize:13 }}/>
                <div style={{ width:32,height:32,borderRadius:7,background:selectedColor,flexShrink:0 }}/>
              </div>
            </div>
          </div>

          {/* ══ Section 2: Contact Details ══ */}
          <div className="card" style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(10px)', border:'1px solid rgba(27,47,110,0.1)', borderRadius:14, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:12, borderBottom:'1px solid rgba(27,47,110,0.07)' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#0d948818,#0073b718)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Phone size={15} color="#0d9488"/>
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:13.5, fontWeight:800, color:'#1B2F6E', letterSpacing:'-0.01em' }}>Contact Details</h3>
                <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>Address, phone, email and website</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { label:'City',        key:'city',    span:1, ph:'Islamabad',              icon:<MapPin size={12}/> },
                { label:'Phone',       key:'phone',   span:1, ph:'051-1234567',            icon:<Phone size={12}/> },
                { label:'Address',     key:'address', span:2, ph:'F-8 Markaz, Islamabad',  icon:<MapPin size={12}/> },
                { label:'Email',       key:'email',   span:1, ph:'info@school.com', type:'email', icon:<Mail size={12}/> },
                { label:'Website',     key:'website', span:1, ph:'www.school.edu.pk',      icon:<Globe size={12}/> },
              ].map(f => (
                <div key={f.key} style={{ gridColumn:`span ${f.span}` }}>
                  <label style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'#374151',marginBottom:5 }}>
                    <span style={{ color:'#0d9488' }}>{f.icon}</span>{f.label}
                  </label>
                  <input className="form-input" type={f.type||'text'} placeholder={f.ph}
                    value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/>
                </div>
              ))}
            </div>
          </div>

          {/* ══ Section 3: Academic Setup ══ */}
          <div className="card" style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(10px)', border:'1px solid rgba(27,47,110,0.1)', borderRadius:14, padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:12, borderBottom:'1px solid rgba(27,47,110,0.07)' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#6366f118,#4f46e518)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BookOpen size={15} color="#6366f1"/>
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:13.5, fontWeight:800, color:'#1B2F6E', letterSpacing:'-0.01em' }}>Academic Setup</h3>
                <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>Current session, timezone and language</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div>
                <label style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'#374151',marginBottom:5 }}>
                  <BookOpen size={12} color="#6366f1"/> Current Session
                </label>
                <input className="form-input" type="text" placeholder="2025-2026"
                  value={form.session||''} onChange={e=>setForm({...form,session:e.target.value})}/>
              </div>
              <div>
                <label style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'#374151',marginBottom:5 }}>
                  <Clock size={12} color="#6366f1"/> Timezone
                </label>
                <select className="form-input" value={form.timezone||'Asia/Karachi'} onChange={e=>setForm({...form,timezone:e.target.value})}
                  style={{ width:'100%' }}>
                  {['Asia/Karachi','Asia/Lahore','Asia/Dubai','Asia/Kolkata','UTC'].map(tz=>(
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'#374151',marginBottom:5 }}>
                  <Globe size={12} color="#6366f1"/> Language
                </label>
                <select className="form-input" value={form.language||'English'} onChange={e=>setForm({...form,language:e.target.value})}
                  style={{ width:'100%' }}>
                  {['English','Urdu','Arabic','Pashto'].map(lang=>(
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right — Live Preview ─────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Login page preview */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:'#F8FAFC', borderBottom:'1px solid #E8EDF3', fontSize:12, fontWeight:700, color:'#1E3A5F' }}>
              Login Page Preview
            </div>
            {/* Mini login preview */}
            <div style={{ display:'flex', height:220 }}>
              {/* Left panel */}
              <div style={{ flex:'0 0 45%', background:`linear-gradient(145deg,${selectedColor}E0,${selectedColor}AA)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:12 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:logoPreview?'transparent':'rgba(255,255,255,0.2)',border:'2px solid rgba(255,255,255,0.3)',overflow:'hidden',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>
                  {logoPreview?<img src={logoPreview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:'🎓'}
                </div>
                <div style={{ color:'#fff',fontWeight:700,fontSize:11,textAlign:'center',lineHeight:1.3,marginBottom:4 }}>
                  {form.name||'School Name'}
                </div>
                <div style={{ color:'rgba(255,255,255,0.65)',fontSize:9,textAlign:'center' }}>
                  {form.tagline||'Sign in to start'}
                </div>
              </div>
              {/* Right panel */}
              <div style={{ flex:1, background:'#fff', padding:14, display:'flex', flexDirection:'column', justifyContent:'center', gap:8 }}>
                <div style={{ fontSize:12,fontWeight:800,color:'#1E3A5F' }}>Welcome back! 👋</div>
                <div style={{ height:22,background:'#F1F5F9',borderRadius:5,border:'1px solid #E8EDF3' }}/>
                <div style={{ height:22,background:'#F1F5F9',borderRadius:5,border:'1px solid #E8EDF3' }}/>
                <div style={{ height:28,borderRadius:7,background:selectedColor,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ color:'#fff',fontSize:10,fontWeight:700 }}>→ Login</span>
                </div>
                <div style={{ height:22,borderRadius:7,background:`${selectedColor}CC`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ color:'#fff',fontSize:9,fontWeight:600 }}>Apply For Admission →</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar preview */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:'#F8FAFC', borderBottom:'1px solid #E8EDF3', fontSize:12, fontWeight:700, color:'#1E3A5F' }}>
              Sidebar Preview
            </div>
            <div style={{ background:'#0D1117', padding:'12px 10px', height:180 }}>
              {/* Logo row */}
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width:26,height:26,borderRadius:7,background:logoPreview?'transparent':`${selectedColor}60`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0 }}>
                  {logoPreview?<img src={logoPreview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:'🎓'}
                </div>
                <div>
                  <div style={{ color:'#F1F5F9',fontWeight:700,fontSize:10,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:120 }}>{form.name||'School Name'}</div>
                  <div style={{ color:'#4B5563',fontSize:8 }}>Admin Portal</div>
                </div>
              </div>
              {/* Nav items */}
              {['Dashboard','Students','Fee Management','Attendance','Exams'].map((item,i)=>(
                <div key={item} style={{ display:'flex',alignItems:'center',gap:7,padding:'5px 8px',margin:'2px 0',borderRadius:5,background:i===0?`${selectedColor}20`:'transparent',borderLeft:i===0?`2px solid ${selectedColor}`:'2px solid transparent' }}>
                  <div style={{ width:14,height:14,borderRadius:3,background:i===0?`${selectedColor}30`:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:i===0?selectedColor:'#374151' }}/>
                  </div>
                  <span style={{ fontSize:9,color:i===0?'#F1F5F9':'#64748B',fontWeight:i===0?600:400 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Color info */}
          <div className="card" style={{ background:`${selectedColor}08`, border:`1px solid ${selectedColor}20` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:36,height:36,borderRadius:9,background:selectedColor,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <Palette size={17} color="#fff"/>
              </div>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:'#1E3A5F' }}>Current Brand Color</div>
                <div style={{ fontSize:11.5,color:'#64748B',fontFamily:'monospace' }}>{selectedColor}</div>
              </div>
            </div>
            <p style={{ fontSize:12,color:'#64748B',lineHeight:1.6,margin:0 }}>
              This color is applied to: login button, sidebar active items, form focus, badges, charts, and all branded elements throughout the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
