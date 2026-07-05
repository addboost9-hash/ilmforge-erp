/**
 * IlmForge — Website CMS Settings
 * Full website management exactly as shown in screenshots
 */
import { useState, useRef } from 'react';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, Globe, Image, MessageSquare, Users, Book, MapPin, Palette, Upload } from 'lucide-react';

const TABS = [
  { id:'general',    label:'General',     icon:Globe },
  { id:'features',   label:'Features',    icon:Users },
  { id:'about',      label:'About',       icon:Book  },
  { id:'gallery',    label:'Gallery',     icon:Image },
  { id:'principal',  label:'Principal',   icon:MessageSquare },
  { id:'design',     label:'Design',      icon:Palette },
];

export default function WebsiteSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const logoRef  = useRef();
  const sliderRef = useRef();

  const [form, setForm] = useState({
    enableWebsite:    'No',
    aboutUs:          'Modern Science School is best described as a neighborhood where everyone looks after each other. We believe every child deserves quality education in a safe and nurturing environment.',
    schoolTiming:     '08:00 AM - 02:00 PM, Mon - Sat',
    welcomeText:      'Welcome to our school management portal. We provide world-class education.',
    schoolEmail:      '',
    twitterLink:      '',
    contactNumber:    '',
    facebookPage:     '',
    sliderTitle:      'For Every Child',
    sliderSubTitle:   'Quality Education',
    sliderDetails:    'Our philosophy is learning through play as we offer a stimulating environment for children.',
    feature1Title:    'Multimedia Classes',   feature1Details:  'Using the very broad definition of multimedia in the classroom.',
    feature2Title:    'Expert Teachers',       feature2Details:  'Expert teachers have deeper representations about teaching and learning.',
    feature3Title:    'Inter School Sports',   feature3Details:  'Martial Arts has numerous benefits, including enriched self-esteem.',
    feature4Title:    'Friendly Environment',  feature4Details:  'Since have been visionary reliable software engineers.',
    aboutSchool:      'Parents choose Modern Sciences because we offer academic, social and personal development for the teaching of students.',
    classesText:      'Our popular classes and their fee structure',
    studentsEnrolled: '1200',
    classesCompleted: '57',
    awardsWon:        '12',
    coursesCompleted: '36',
    facilitiesText:   'We have a well-equipped range of facilities and resources for all students.',
    fac1Title:        'Dedicated Science Laboratories', fac1Text: 'Modern science facilities and labs encourage collaborative work.',
    fac2Title:        'Information and Communication Technology', fac2Text: 'Computer lab provides basic functional computer services for students.',
    fac3Title:        'Libraries', fac3Text: 'A school library is where students access knowledge and resources.',
    galleryText:      'These photographs prove that our students truly are leaders.',
    noticeboardText:  'Notice boards are proven to be a great tool for communicating messages.',
    principalTitle:   'Our teachers work together to build a curriculum',
    principalMessage: 'I am honoured and feel very privileged to function as the Principal of this institution.',
    googleMapEmbed:   '',
    primaryColor:     '#0F766E',
    secondaryColor:   '#D97706',
    logoPreview:      null,
    sliderBg:         null,
  });

  const set = (k, v) => setForm(f => ({...f, [k]:v}));

  const { data: websiteSettings } = useQuery({
    queryKey: ['settings-website'],
    queryFn: () => api.get('/settings/website').then(r => r.data.data),
  });

  useEffect(() => {
    if (!websiteSettings) return;
    setForm(prev => ({ ...prev, ...websiteSettings }));
  }, [websiteSettings]);

  const save = useMutation({
    mutationFn: () => api.put('/settings/website', form),
    onSuccess: () => { setSaved(true); toast.success('Website settings saved!'); setTimeout(()=>setSaved(false),3000); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save website settings'),
  });

  const F = ({ label, k, type='text', ph='', rows, tip }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {rows
        ? <textarea className="form-input form-textarea" rows={rows} placeholder={ph} value={form[k]} onChange={e=>set(k,e.target.value)}/>
        : <input className="form-input" type={type} placeholder={ph} value={form[k]} onChange={e=>set(k,e.target.value)}/>
      }
      {tip && <p style={{ fontSize:11.5, color:'#3B82F6', marginTop:3 }}>{tip}</p>}
    </div>
  );

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Website Settings</h1>
          <p className="page-subtitle">Manage your public school website content and design</p>
        </div>
        <button className="btn btn-teal" onClick={()=>save.mutate()} disabled={save.isPending}>
          <Save size={15}/> {save.isPending?'Saving…':'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-list" style={{ marginBottom:16 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab-btn${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>
              <Icon size={13} style={{ display:'inline', marginRight:5, verticalAlign:'middle' }}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── General Tab ── */}
      {activeTab==='general' && (
        <div className="card">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="form-group">
              <label className="form-label">Enable Website</label>
              <select className="form-select" value={form.enableWebsite} onChange={e=>set('enableWebsite',e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
            <F label="School Timing" k="schoolTiming" ph="08:00 AM - 02:00 PM, Mon - Sat"/>
            <F label="School Email" k="schoolEmail" type="email" ph="school@example.com"/>
            <F label="Contact Number" k="contactNumber" ph="03001234567"/>
            <F label="Twitter Link" k="twitterLink" ph="https://twitter.com/yourschool"/>
            <F label="Facebook Page" k="facebookPage" ph="https://facebook.com/yourschool"/>
            <div style={{ gridColumn:'span 2' }}>
              <F label="About Us" k="aboutUs" rows={4} ph="Describe your school..."/>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <F label="Welcome Text" k="welcomeText" rows={3}/>
            </div>
            <F label="Slider Title" k="sliderTitle" ph="For Every Child"/>
            <F label="Slider Sub Title" k="sliderSubTitle" ph="Quality Education"/>
            <div style={{ gridColumn:'span 2' }}>
              <F label="Slider Details" k="sliderDetails" rows={2}/>
            </div>
          </div>
        </div>
      )}

      {/* ── Features Tab ── */}
      {activeTab==='features' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            {n:1,tK:'feature1Title',dK:'feature1Details'},
            {n:2,tK:'feature2Title',dK:'feature2Details'},
            {n:3,tK:'feature3Title',dK:'feature3Details'},
            {n:4,tK:'feature4Title',dK:'feature4Details'},
          ].map(f => (
            <div key={f.n} className="card">
              <div style={{ fontSize:13, fontWeight:700, color:'#0F766E', marginBottom:12 }}>Welcome Feature {f.n}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <F label="Title" k={f.tK} ph="Feature Title"/>
                <F label="Details" k={f.dK} ph="Feature description..."/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── About Tab ── */}
      {activeTab==='about' && (
        <div className="card">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'span 2' }}><F label="About School" k="aboutSchool" rows={3}/></div>
            <F label="Classes Text" k="classesText" ph="Our popular classes and fees"/>
            <F label="Facilities Text" k="facilitiesText" rows={2}/>
            {[
              {n:1,tK:'fac1Title',dK:'fac1Text',ph:'Science Labs'},
              {n:2,tK:'fac2Title',dK:'fac2Text',ph:'ICT Lab'},
              {n:3,tK:'fac3Title',dK:'fac3Text',ph:'Library'},
            ].map(f=>(
              <div key={f.n} style={{ gridColumn:'span 2', display:'grid', gridTemplateColumns:'1fr 2fr', gap:12, padding:'12px', background:'#F9FAFB', borderRadius:8 }}>
                <div><div style={{ fontSize:11.5,fontWeight:700,color:'#6B7280',marginBottom:6 }}>Facility {f.n}</div><F label="Title" k={f.tK} ph={f.ph}/></div>
                <F label="Details" k={f.dK} rows={3}/>
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, gridColumn:'span 2', padding:'14px', background:'#F0FDFA', borderRadius:9, border:'1px solid #CCFBF1' }}>
              {[['Students Enrolled','studentsEnrolled'],['Classes Completed','classesCompleted'],['Awards Won','awardsWon'],['Courses Completed','coursesCompleted']].map(([l,k])=>(
                <div key={k}>
                  <label className="form-label">{l}</label>
                  <input className="form-input" type="number" value={form[k]} onChange={e=>set(k,e.target.value)}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Tab ── */}
      {activeTab==='gallery' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card">
            <div className="form-group"><F label="Gallery Section Text" k="galleryText" rows={2}/></div>
            <div className="form-group"><F label="Noticeboard Text" k="noticeboardText" rows={2}/></div>
          </div>
          <div className="card">
            <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:14 }}>Upload Slider Background Image</div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:120, height:80, borderRadius:9, background:'#F3F4F6', border:'2px dashed #E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden' }}
                onClick={()=>sliderRef.current?.click()}>
                {form.sliderBg
                  ? <img src={form.sliderBg} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                  : <Upload size={22} color="#9CA3AF"/>
                }
              </div>
              <div>
                <button className="btn btn-teal btn-sm" onClick={()=>sliderRef.current?.click()}>
                  <Upload size={13}/> Upload Image
                </button>
                <p style={{ fontSize:11.5, color:'#9CA3AF', marginTop:5 }}>Recommended: 1920×600px for best results</p>
              </div>
            </div>
            <input ref={sliderRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e=>{ const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onload=ev=>set('sliderBg',ev.target.result); r.readAsDataURL(f); } }}/>
          </div>
          <div className="card">
            <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:12 }}>Picture Gallery Images</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {[...Array(8)].map((_,i) => (
                <div key={i} style={{ aspectRatio:'1',borderRadius:9,background:'#F3F4F6',border:'2px dashed #E5E7EB',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:5 }}>
                  <Image size={20} color="#9CA3AF"/>
                  <span style={{ fontSize:11, color:'#9CA3AF' }}>Select image</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Principal Tab ── */}
      {activeTab==='principal' && (
        <div className="card">
          <F label="Principal Message Title" k="principalTitle" ph="Our teachers work together to build a curriculum"/>
          <F label="Principal Message" k="principalMessage" rows={5}/>
          <F label="Google Map Embed URL" k="googleMapEmbed" ph="https://www.google.com/maps/embed?pb=..."/>
          {form.googleMapEmbed && (
            <div style={{ marginTop:12, borderRadius:9, overflow:'hidden', border:'1px solid #E5E7EB' }}>
              <iframe src={form.googleMapEmbed} width="100%" height="200" style={{ border:0 }} allowFullScreen loading="lazy"/>
            </div>
          )}
        </div>
      )}

      {/* ── Design Tab ── */}
      {activeTab==='design' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:14 }}>Site Colors</div>
            <div className="form-group">
              <label className="form-label">Primary Color</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="color" value={form.primaryColor} onChange={e=>set('primaryColor',e.target.value)}
                  style={{ width:40,height:34,border:'1px solid #E5E7EB',borderRadius:7,cursor:'pointer' }}/>
                <input className="form-input" value={form.primaryColor} onChange={e=>set('primaryColor',e.target.value)} style={{ flex:1,fontFamily:'monospace' }}/>
                <div style={{ width:32,height:32,borderRadius:7,background:form.primaryColor,flexShrink:0 }}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Secondary Color</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="color" value={form.secondaryColor} onChange={e=>set('secondaryColor',e.target.value)}
                  style={{ width:40,height:34,border:'1px solid #E5E7EB',borderRadius:7,cursor:'pointer' }}/>
                <input className="form-input" value={form.secondaryColor} onChange={e=>set('secondaryColor',e.target.value)} style={{ flex:1,fontFamily:'monospace' }}/>
                <div style={{ width:32,height:32,borderRadius:7,background:form.secondaryColor,flexShrink:0 }}/>
              </div>
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:14 }}>Upload School Logo</div>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
              <div style={{ width:80,height:80,borderRadius:16,background:form.logoPreview?'transparent':'#F3F4F6',border:`2px dashed ${form.logoPreview?form.primaryColor:'#E5E7EB'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden' }}
                onClick={()=>logoRef.current?.click()}>
                {form.logoPreview
                  ? <img src={form.logoPreview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                  : <Upload size={24} color="#9CA3AF"/>
                }
              </div>
              <div>
                <button className="btn btn-teal btn-sm" onClick={()=>logoRef.current?.click()}>
                  <Upload size={13}/> {form.logoPreview?'Change Logo':'Upload Logo'}
                </button>
                <p style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>Recommended size: 250×250px</p>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e=>{ const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onload=ev=>{ set('logoPreview',ev.target.result); try{ localStorage.setItem('schoolLogoPreview',ev.target.result); }catch{} }; r.readAsDataURL(f); } }}/>

            <div className="alert alert-teal" style={{ marginTop:10 }}>
              <span>ℹ️</span>
              <span style={{ fontSize:12 }}>Logo appears on login page, sidebar, PDFs, certificates and ID cards.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
