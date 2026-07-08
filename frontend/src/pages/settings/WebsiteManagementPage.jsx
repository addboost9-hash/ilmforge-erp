/**
 * IlmForge — Website Management
 * Manage school website content: system settings, header image,
 * theme color, logo, about text, facilities, gallery
 * Matches competitor's Website Management page
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Save, Globe, Image, Palette, Info, CheckCircle } from 'lucide-react';

const THEME_COLORS = [
  { name:'Navy Blue',   hex:'#1B2F6E' },
  { name:'Dark',        hex:'#1a1a1a' },
  { name:'Dark Blue',   hex:'#0F3460' },
  { name:'Dark Brown',  hex:'#3d1a00' },
  { name:'Forest Green',hex:'#1a4a2e' },
  { name:'Purple',      hex:'#4a0e8f' },
  { name:'Red',         hex:'#8B0000' },
  { name:'Yellow',      hex:'#F5C518' },
  { name:'Teal',        hex:'#0F766E' },
];

const empty = {
  schoolName:'', smsSignature:'', address:'', phone:'', email:'', currency:'PKR', session:'2025-2026',
  aboutText:'', classesText:'', studentsEnrolled:'', classesCompleted:'', awardsWon:'', coursesCompleted:'',
  staffText:'', facilitiesText:'',
  fac1Title:'', fac1Text:'', fac2Title:'', fac2Text:'', fac3Title:'', fac3Text:'',
  themeColor:'#1B2F6E',
};

export default function WebsiteManagementPage() {
  const [form, setForm]     = useState(empty);
  const [activeTab, setTab] = useState('system');
  const [saved, setSaved]   = useState(false);

  const { data } = useQuery({
    queryKey: ['website-settings'],
    queryFn:  () => api.get('/settings/website').then(r => r.data.data || {}).catch(() => ({})),
  });

  const { data: school } = useQuery({
    queryKey: ['school-settings-bise'],
    queryFn:  () => api.get('/settings/school').then(r => r.data.data).catch(() => null),
  });

  useEffect(() => {
    if (data) setForm(f => ({ ...f, ...data }));
    if (school && !data?.schoolName) setForm(f => ({ ...f, schoolName: school.name || '', phone: school.phone || '', email: school.email || '', address: school.address || '' }));
  }, [data, school]);

  const save = useMutation({
    mutationFn: () => api.put('/settings/website', form),
    onSuccess: () => { setSaved(true); toast.success('Website settings saved!'); setTimeout(() => setSaved(false), 2000); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  const TABS = [
    { id:'system',    label:'⚙️ System Settings' },
    { id:'theme',     label:'🎨 Theme & Logo' },
    { id:'about',     label:'ℹ️ About School' },
    { id:'facilities',label:'🏫 Facilities' },
    { id:'gallery',   label:'🖼️ Gallery' },
  ];

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Globe size={20} color="#0073b7"/> Website Management
          </h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:2 }}>Manage your school website content, theme and media</p>
        </div>
        <button className="btn btn-teal" onClick={() => save.mutate()} disabled={save.isPending}>
          {saved ? <><CheckCircle size={14}/> Saved!</> : <><Save size={14}/> {save.isPending ? 'Saving…' : 'Save Changes'}</>}
        </button>
      </div>

      {/* Tab strip */}
      <div style={{ display:'flex', borderBottom:'2px solid #e2e8f0', marginBottom:20, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'10px 16px', fontSize:13, fontWeight: activeTab===t.id ? 700 : 500, color: activeTab===t.id ? '#0073b7' : '#64748b', border:'none', background:'none', cursor:'pointer', borderBottom:`2px solid ${activeTab===t.id ? '#0073b7' : 'transparent'}`, marginBottom:-2, whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* System Settings */}
      {activeTab === 'system' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div className="card-header"><h3>System Settings</h3></div>
            <div className="card-body">
              {[
                ['School Name', 'schoolName', 'Demo School'],
                ['SMS Signature', 'smsSignature', 'Demo School'],
                ['Address', 'address', 'Lahore, Pakistan'],
                ['School Phone', 'phone', '+92000'],
                ['School Email', 'email', 'school@example.com'],
                ['Currency', 'currency', 'PKR'],
              ].map(([label, key, ph]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" placeholder={ph} {...f(key)} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Running Session</label>
                <select className="form-select" {...f('session')}>
                  {['2023-2024','2024-2025','2025-2026','2026-2027'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ fontSize:11.5, color:'#f59e0b', marginTop:3 }}>⚠️ Changing session will affect exam management system only</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Upload Header Image</h3></div>
            <div className="card-body">
              <div style={{ border:'2px dashed #e2e8f0', borderRadius:10, padding:20, textAlign:'center', marginBottom:12 }}>
                <div style={{ background:'#F5C518', padding:'12px 20px', borderRadius:8, display:'inline-block', textAlign:'center', maxWidth:320 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:'#1a1a1a' }}>SCHOOL NAME</div>
                  <div style={{ fontSize:12, color:'#333' }}>Address: ****** &nbsp; Phone: ******</div>
                </div>
              </div>
              <div style={{ fontSize:11.5, color:'#dc2626', marginBottom:10 }}>Recommended Size: width: 800px, height: 150px</div>
              <label style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:'#0073b7', color:'white', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, width:'fit-content' }}>
                <Image size={14}/> Select Header Image
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { if (e.target.files[0]) toast.info('Header image selected (upload to backend for production)'); }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Theme & Logo */}
      {activeTab === 'theme' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div className="card-header"><h3>Theme Settings</h3></div>
            <div className="card-body">
              <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12 }}>Select a Theme Color</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {THEME_COLORS.map(tc => (
                  <div key={tc.hex} onClick={() => setForm(p => ({ ...p, themeColor: tc.hex }))}
                    style={{ height:60, borderRadius:10, background:tc.hex, cursor:'pointer', border: form.themeColor===tc.hex ? '3px solid #0073b7' : '2px solid transparent', position:'relative', transition:'border .15s' }}>
                    {form.themeColor===tc.hex && (
                      <div style={{ position:'absolute', bottom:5, right:5, width:18, height:18, borderRadius:'50%', background:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <CheckCircle size={12} color="#0073b7"/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14 }}>
                <label className="form-label">Custom Color</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="color" value={form.themeColor} onChange={e => setForm(p => ({ ...p, themeColor: e.target.value }))}
                    style={{ width:48, height:38, borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer' }} />
                  <input className="form-input" value={form.themeColor} onChange={e => setForm(p => ({ ...p, themeColor: e.target.value }))} placeholder="#1B2F6E" />
                </div>
              </div>
              <button className="btn btn-outline btn-sm" style={{ marginTop:12 }}>✓ Select A Theme To Make Changes</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Upload School Logo</h3></div>
            <div className="card-body">
              <div style={{ textAlign:'center', marginBottom:12 }}>
                <div style={{ width:100, height:100, borderRadius:12, border:'2px dashed #e2e8f0', margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9fa' }}>
                  {school?.logoUrl ? <img src={school.logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:10 }} /> : <span style={{ fontSize:40 }}>🏫</span>}
                </div>
              </div>
              <div style={{ fontSize:11.5, color:'#dc2626', marginBottom:10 }}>Recommended Size: width: 250px, height: 250px</div>
              <label style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:'#0073b7', color:'white', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, width:'fit-content' }}>
                <Image size={14}/> Upload Logo
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { if (e.target.files[0]) toast.info('Logo selected (upload to backend for production)'); }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* About School */}
      {activeTab === 'about' && (
        <div className="card">
          <div className="card-header"><h3>About School Content</h3></div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Classes / About Text</label>
                <textarea className="form-input" rows={3} placeholder="Here is what you can expect from our school…" {...f('classesText')} />
              </div>
              {[
                ['Students Enrolled', 'studentsEnrolled', '1200'],
                ['Classes Completed', 'classesCompleted', '57'],
                ['Awards Won', 'awardsWon', '12'],
                ['Courses Completed', 'coursesCompleted', '36'],
              ].map(([label, key, ph]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" type="number" placeholder={ph} {...f(key)} />
                </div>
              ))}
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Staff Text</label>
                <textarea className="form-input" rows={2} placeholder="Our teachers work together to build a curriculum…" {...f('staffText')} />
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">School Facilities Text</label>
                <textarea className="form-input" rows={2} placeholder="We have a well-equipped range of facilities…" {...f('facilitiesText')} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facilities */}
      {activeTab === 'facilities' && (
        <div className="card">
          <div className="card-header"><h3>School Facilities</h3></div>
          <div className="card-body">
            {[['1','Dedicated Science Laboratories'],['2','Information & Communication Technology Labs'],['3','Libraries']].map(([n, ph]) => (
              <div key={n} style={{ marginBottom:16, padding:14, border:'1px solid #e2e8f0', borderRadius:8 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#1e3a5f', marginBottom:8 }}>Facility {n}</div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" placeholder={ph} {...f(`fac${n}Title`)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} placeholder="Description of this facility…" {...f(`fac${n}Text`)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {activeTab === 'gallery' && (
        <div className="card">
          <div className="card-header"><h3>Photo Gallery</h3></div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
              {Array.from({length:6}).map((_,i) => (
                <label key={i} style={{ display:'block', cursor:'pointer' }}>
                  <div style={{ height:120, borderRadius:8, border:'2px dashed #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9fa', fontSize:11.5, color:'#94a3b8', flexDirection:'column', gap:4 }}>
                    <Image size={24} color="#cbd5e1"/>
                    Select image
                  </div>
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { if (e.target.files[0]) toast.info('Image selected'); }} />
                </label>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop:14 }}><Image size={13}/> Upload Pictures</button>
          </div>
        </div>
      )}
    </div>
  );
}
