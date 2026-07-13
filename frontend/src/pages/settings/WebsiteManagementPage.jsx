/**
 * IlmForge — Advanced Website Management v2.0
 * Layout customization: sidebar position, header style, color theme,
 * logo/favicon, dashboard presets with live preview
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/auth.store';
import { Save, Globe, Palette, Layout, Image, Monitor, CheckCircle, Eye, Smartphone } from 'lucide-react';

/* ─── Color Presets ─────────────────────────────────── */
const COLOR_THEMES = [
  { name: 'Navy Blue (Default)', primary: '#1B2F6E', accent: '#0073b7', preview: 'linear-gradient(135deg,#1B2F6E,#0073b7)' },
  { name: 'Forest Green',        primary: '#14532d', accent: '#15803d', preview: 'linear-gradient(135deg,#14532d,#15803d)' },
  { name: 'Royal Purple',        primary: '#4c1d95', accent: '#7c3aed', preview: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
  { name: 'Crimson Red',         primary: '#7f1d1d', accent: '#dc2626', preview: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
  { name: 'Teal Ocean',          primary: '#134e4a', accent: '#0f766e', preview: 'linear-gradient(135deg,#134e4a,#0f766e)' },
  { name: 'Amber Gold',          primary: '#78350f', accent: '#d97706', preview: 'linear-gradient(135deg,#78350f,#d97706)' },
  { name: 'Slate Gray',          primary: '#1e293b', accent: '#475569', preview: 'linear-gradient(135deg,#1e293b,#475569)' },
  { name: 'Deep Rose',           primary: '#881337', accent: '#e11d48', preview: 'linear-gradient(135deg,#881337,#e11d48)' },
  { name: 'Sky Blue',            primary: '#075985', accent: '#0284c7', preview: 'linear-gradient(135deg,#075985,#0284c7)' },
];

/* ─── Dashboard Layout Presets ───────────────────────── */
const DASHBOARD_PRESETS = [
  {
    id: 'classic',
    name: 'Classic',
    desc: '6 stat cards + 2 charts + quick actions',
    icon: '📊',
    preview: [
      { type: 'grid4', h: 28, color: '#dbeafe' },
      { type: 'grid2', h: 80, color: '#f0fdf4' },
      { type: 'grid4', h: 44, color: '#fffbeb' },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: '4 KPI cards + 1 chart + recent activity',
    icon: '✨',
    preview: [
      { type: 'grid2', h: 36, color: '#f5f3ff' },
      { type: 'full',  h: 80, color: '#f0fdf4' },
      { type: 'full',  h: 50, color: '#fffbeb' },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    desc: 'Charts-first with detailed trend graphs',
    icon: '📈',
    preview: [
      { type: 'full',  h: 100, color: '#eff6ff' },
      { type: 'grid3', h: 28,  color: '#fdf4ff' },
      { type: 'grid2', h: 60,  color: '#f0fdf4' },
    ],
  },
  {
    id: 'management',
    name: 'Management',
    desc: 'Staff-focused with attendance & payroll summary',
    icon: '👨‍💼',
    preview: [
      { type: 'grid3', h: 36, color: '#fff7ed' },
      { type: 'grid2', h: 70, color: '#fef2f2' },
      { type: 'full',  h: 40, color: '#f0fdf4' },
    ],
  },
];

/* ─── Sidebar Position Options ───────────────────────── */
const SIDEBAR_POSITIONS = [
  { id: 'left',      label: 'Left Sidebar',    icon: '⬛⬜', desc: 'Classic sidebar (default)' },
  { id: 'collapsed', label: 'Icon-only',       icon: '▪️⬜', desc: 'Compact icon sidebar' },
  { id: 'top',       label: 'Top Navigation',  icon: '🟦', desc: 'Horizontal top nav bar' },
];

/* ─── Header Style Options ───────────────────────────── */
const HEADER_STYLES = [
  { id: 'white',     label: 'Clean White',   color: '#ffffff', border: '#dee2e6' },
  { id: 'primary',   label: 'Primary Brand', color: '#1B2F6E', border: '#1B2F6E' },
  { id: 'glass',     label: 'Frosted Glass', color: 'rgba(255,255,255,0.85)', border: 'rgba(255,255,255,0.5)' },
];

const empty = {
  schoolName:'', smsSignature:'', address:'', phone:'', email:'', currency:'PKR', session:'2025-2026',
  aboutText:'', classesText:'', studentsEnrolled:'', classesCompleted:'', awardsWon:'', coursesCompleted:'',
  staffText:'', facilitiesText:'',
  fac1Title:'', fac1Text:'', fac2Title:'', fac2Text:'', fac3Title:'', fac3Text:'',
  themeColor:'#1B2F6E',
  accentColor:'#0073b7',
  headerStyle:'white',
  sidebarPosition:'left',
  dashboardPreset:'classic',
  logoText:'IlmForge',
};

export default function WebsiteManagementPage() {
  const { updateBranding } = useAuthStore();
  const [form, setForm]       = useState(empty);
  const [activeTab, setTab]   = useState('system');
  const [saved, setSaved]     = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop | tablet | mobile
  const [showPreview, setShowPreview] = useState(false);

  const { data } = useQuery({
    queryKey: ['website-settings'],
    queryFn: () => api.get('/settings/website').then(r => r.data.data || {}).catch(() => ({})),
    staleTime: 5 * 60_000,
  });

  const { data: school } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => null),
  });

  useEffect(() => {
    if (data) setForm(f => ({ ...f, ...data }));
    if (school && !data?.schoolName) setForm(f => ({ ...f, schoolName: school.name || '', phone: school.phone || '', email: school.email || '', address: school.address || '' }));
  }, [data, school]);

  const save = useMutation({
    mutationFn: () => api.put('/settings/website', form),
    onSuccess: () => {
      setSaved(true);
      toast.success('Website settings saved and applied!');
      // Apply theme immediately
      document.documentElement.style.setProperty('--primary', form.themeColor);
      document.documentElement.style.setProperty('--teal', form.themeColor);
      document.documentElement.style.setProperty('--brand-600', form.themeColor);
      if (form.themeColor) {
        updateBranding({ primaryColor: form.themeColor });
        localStorage.setItem('brandPrimaryColor', form.themeColor);
        localStorage.setItem('brandAccentColor', form.accentColor);
        localStorage.setItem('sidebarPosition', form.sidebarPosition);
        localStorage.setItem('headerStyle', form.headerStyle);
        localStorage.setItem('dashboardPreset', form.dashboardPreset);
      }
      setTimeout(() => setSaved(false), 3000);
    },
    onError: err => toast.error(err?.response?.data?.message || 'Failed to save'),
  });

  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  const TABS = [
    { id:'system',    label:'⚙️ School Info' },
    { id:'theme',     label:'🎨 Colors & Theme' },
    { id:'layout',    label:'🖼️ Layout' },
    { id:'about',     label:'ℹ️ About Content' },
    { id:'facilities',label:'🏫 Facilities' },
    { id:'gallery',   label:'🖼️ Gallery' },
  ];

  // Live preview dimensions
  const previewDimensions = {
    desktop: { width: '100%', height: 280 },
    tablet:  { width: 600, height: 280 },
    mobile:  { width: 320, height: 280 },
  };

  const currentTheme = COLOR_THEMES.find(t => t.primary === form.themeColor) || COLOR_THEMES[0];
  const currentPreset = DASHBOARD_PRESETS.find(p => p.id === form.dashboardPreset) || DASHBOARD_PRESETS[0];

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Globe size={20} color="#0073b7"/> Website & Platform Management
          </h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:2 }}>
            Customize layout, colors, sidebar, content — see live preview instantly
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowPreview(p => !p)}
            className="btn btn-outline btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Eye size={13}/> {showPreview ? 'Hide Preview' : 'Live Preview'}
          </button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="btn btn-teal">
            {saved ? <><CheckCircle size={14}/> Applied!</> : <><Save size={14}/> {save.isPending ? 'Saving…' : 'Save & Apply'}</>}
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      {showPreview && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header">
            <h3 style={{ display:'flex', alignItems:'center', gap:8 }}><Monitor size={15}/> Live Preview</h3>
            <div style={{ display:'flex', gap:6 }}>
              {[
                { id:'desktop', icon:'🖥️', label:'Desktop' },
                { id:'tablet',  icon:'📱', label:'Tablet' },
                { id:'mobile',  icon:'📲', label:'Mobile' },
              ].map(p => (
                <button key={p.id} onClick={() => setPreviewMode(p.id)}
                  className={`btn btn-sm ${previewMode===p.id?'btn-primary':'btn-outline'}`}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ background:'#f1f5f9', overflow:'auto' }}>
            <div style={{ margin:'0 auto', transition:'all .3s', ...(previewMode==='desktop' ? { width:'100%' } : previewMode==='tablet' ? { width:600 } : { width:320 }) }}>
              {/* Preview frame */}
              <div style={{ background:'white', borderRadius:10, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', border:'1px solid #e2e8f0' }}>
                {/* Header preview */}
                <div style={{ height:44, background: form.headerStyle==='primary' ? form.themeColor : 'white', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', padding:'0 16px', gap:10 }}>
                  <div style={{ width:24, height:24, borderRadius:5, background:form.themeColor, opacity:0.9 }}/>
                  <div style={{ fontSize:11, fontWeight:800, color: form.headerStyle==='primary' ? 'white' : form.themeColor }}>{form.schoolName || 'School Name'}</div>
                  <div style={{ flex:1, height:18, background: form.headerStyle==='primary' ? 'rgba(255,255,255,0.15)' : '#f1f5f9', borderRadius:99, marginLeft:8 }}/>
                </div>

                <div style={{ display:'flex', height:220 }}>
                  {/* Sidebar preview */}
                  {form.sidebarPosition === 'left' && (
                    <div style={{ width:previewMode==='mobile'?40:80, background:form.themeColor, padding:8, display:'flex', flexDirection:'column', gap:4 }}>
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} style={{ height:8, borderRadius:4, background:i===1?form.accentColor:'rgba(255,255,255,0.2)' }}/>
                      ))}
                    </div>
                  )}

                  {/* Content preview */}
                  <div style={{ flex:1, padding:10, background:'#f8f9fa', overflow:'hidden' }}>
                    {currentPreset.preview.map((block, i) => (
                      <div key={i} style={{ display:'flex', gap:4, marginBottom:4 }}>
                        {block.type === 'grid4' && [1,2,3,4].map(j => <div key={j} style={{ flex:1, height:block.h/3, borderRadius:4, background:block.color, border:'1px solid rgba(0,0,0,0.05)' }}/>)}
                        {block.type === 'grid3' && [1,2,3].map(j => <div key={j} style={{ flex:1, height:block.h/3, borderRadius:4, background:block.color, border:'1px solid rgba(0,0,0,0.05)' }}/>)}
                        {block.type === 'grid2' && [1,2].map(j => <div key={j} style={{ flex:1, height:block.h/3, borderRadius:4, background:block.color, border:'1px solid rgba(0,0,0,0.05)' }}/>)}
                        {block.type === 'full' && <div style={{ flex:1, height:block.h/3, borderRadius:4, background:block.color, border:'1px solid rgba(0,0,0,0.05)' }}/>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ textAlign:'center', marginTop:8, fontSize:11, color:'#94a3b8' }}>
                {form.sidebarPosition==='left'?'Left Sidebar':'Icon Mode'} · {currentPreset.name} Layout · {currentTheme.name}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>
        {/* Tab sidebar */}
        <div className="card" style={{ padding:8, alignSelf:'flex-start', position:'sticky', top:80 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 12px', border:'none', borderRadius:8, cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .1s', marginBottom:2, background: activeTab===t.id ? '#eff6ff' : 'transparent', borderLeft: activeTab===t.id ? '3px solid #0073b7' : '3px solid transparent', color: activeTab===t.id ? '#0073b7' : '#374151', fontWeight: activeTab===t.id ? 700 : 500, fontSize:13 }}
              onMouseEnter={e => { if(activeTab!==t.id) e.currentTarget.style.background='#f8f9fa'; }}
              onMouseLeave={e => { if(activeTab!==t.id) e.currentTarget.style.background='transparent'; }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* System Settings */}
          {activeTab==='system' && (
            <div className="card">
              <div className="card-header"><h3>School Information</h3></div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[
                    ['School Name *', 'schoolName', 'Demo School'],
                    ['SMS Signature', 'smsSignature', 'Demo School'],
                    ['School Phone', 'phone', '+92300-0000000'],
                    ['School Email', 'email', 'school@example.com'],
                    ['Currency', 'currency', 'PKR'],
                    ['Address', 'address', 'Lahore, Pakistan'],
                  ].map(([label, key, ph]) => (
                    <div key={key} className="form-group" style={key==='address'?{gridColumn:'1/-1'}:{}}>
                      <label className="form-label">{label}</label>
                      <input className="form-input" placeholder={ph} {...f(key)} />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label">Academic Session</label>
                    <select className="form-select" {...f('session')}>
                      {['2023-2024','2024-2025','2025-2026','2026-2027'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Color & Theme */}
          {activeTab==='theme' && (
            <div>
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header"><h3><Palette size={15}/> Color Themes</h3></div>
                <div className="card-body">
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                    {COLOR_THEMES.map(theme => (
                      <div key={theme.primary} onClick={() => setForm(f => ({ ...f, themeColor: theme.primary, accentColor: theme.accent }))}
                        style={{ borderRadius:10, overflow:'hidden', border:`2px solid ${form.themeColor===theme.primary?theme.primary:'#e2e8f0'}`, cursor:'pointer', transition:'all .15s', boxShadow: form.themeColor===theme.primary?`0 0 0 3px ${theme.primary}30`:'' }}>
                        <div style={{ height:40, background:theme.preview }}/>
                        <div style={{ padding:'6px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:11.5, fontWeight:600, color:'#374151' }}>{theme.name}</span>
                          {form.themeColor===theme.primary && <span style={{ color:theme.primary, fontSize:14 }}>✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom color */}
                  <div style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', background:'#f8f9fa', borderRadius:8 }}>
                    <div>
                      <label className="form-label">Custom Primary Color</label>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
                        <input type="color" value={form.themeColor} onChange={e => setForm(f => ({ ...f, themeColor: e.target.value }))}
                          style={{ width:44, height:36, borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', padding:2 }}/>
                        <input className="form-input" value={form.themeColor} onChange={e => setForm(f => ({ ...f, themeColor: e.target.value }))}
                          placeholder="#1B2F6E" style={{ width:110 }}/>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Accent Color</label>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
                        <input type="color" value={form.accentColor || form.themeColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                          style={{ width:44, height:36, borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', padding:2 }}/>
                        <input className="form-input" value={form.accentColor || ''} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                          placeholder="#0073b7" style={{ width:110 }}/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3>Header Style</h3></div>
                <div className="card-body">
                  <div style={{ display:'flex', gap:10 }}>
                    {HEADER_STYLES.map(hs => (
                      <div key={hs.id} onClick={() => setForm(f => ({ ...f, headerStyle: hs.id }))}
                        style={{ flex:1, border:`2px solid ${form.headerStyle===hs.id?form.themeColor:'#e2e8f0'}`, borderRadius:10, overflow:'hidden', cursor:'pointer', transition:'all .15s' }}>
                        <div style={{ height:28, background:hs.color, borderBottom:`1px solid ${hs.border}` }}/>
                        <div style={{ padding:'6px 10px', fontSize:12, fontWeight:600, color:'#374151', textAlign:'center' }}>{hs.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layout Settings */}
          {activeTab==='layout' && (
            <div>
              {/* Sidebar Position */}
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header"><h3><Layout size={15}/> Sidebar Position</h3></div>
                <div className="card-body">
                  <div style={{ display:'flex', gap:12 }}>
                    {SIDEBAR_POSITIONS.map(sp => (
                      <div key={sp.id} onClick={() => setForm(f => ({ ...f, sidebarPosition: sp.id }))}
                        style={{ flex:1, padding:'14px 12px', border:`2px solid ${form.sidebarPosition===sp.id?form.themeColor:'#e2e8f0'}`, borderRadius:10, cursor:'pointer', textAlign:'center', transition:'all .15s', background: form.sidebarPosition===sp.id ? form.themeColor+'08' : 'white' }}>
                        <div style={{ fontSize:28, marginBottom:6 }}>{sp.icon}</div>
                        <div style={{ fontSize:13, fontWeight:700, color: form.sidebarPosition===sp.id ? form.themeColor : '#374151' }}>{sp.label}</div>
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{sp.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dashboard Layout Presets */}
              <div className="card">
                <div className="card-header"><h3>Dashboard Layout Preset</h3></div>
                <div className="card-body">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {DASHBOARD_PRESETS.map(preset => (
                      <div key={preset.id} onClick={() => setForm(f => ({ ...f, dashboardPreset: preset.id }))}
                        style={{ border:`2px solid ${form.dashboardPreset===preset.id?form.themeColor:'#e2e8f0'}`, borderRadius:10, overflow:'hidden', cursor:'pointer', transition:'all .15s', background: form.dashboardPreset===preset.id ? form.themeColor+'08' : 'white' }}>
                        {/* Mini preview */}
                        <div style={{ padding:8, background:'#f8f9fa', height:72, display:'flex', flexDirection:'column', gap:4 }}>
                          {preset.preview.map((block, i) => (
                            <div key={i} style={{ display:'flex', gap:3, flex:1 }}>
                              {(block.type==='grid4'?[1,2,3,4]:block.type==='grid3'?[1,2,3]:block.type==='grid2'?[1,2]:[1]).map(j => (
                                <div key={j} style={{ flex:1, borderRadius:3, background:block.color, border:'1px solid rgba(0,0,0,0.06)' }}/>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:18 }}>{preset.icon}</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color: form.dashboardPreset===preset.id ? form.themeColor : '#374151' }}>{preset.name}</div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{preset.desc}</div>
                          </div>
                          {form.dashboardPreset===preset.id && <span style={{ marginLeft:'auto', color:form.themeColor, fontSize:16 }}>✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Content */}
          {activeTab==='about' && (
            <div className="card">
              <div className="card-header"><h3>About School Content</h3></div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">Classes/About Text</label>
                    <textarea className="form-input" rows={3} placeholder="Describe your school…" {...f('classesText')} />
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
                    <label className="form-label">Staff Description</label>
                    <textarea className="form-input" rows={2} {...f('staffText')} />
                  </div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">School Facilities Description</label>
                    <textarea className="form-input" rows={2} {...f('facilitiesText')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Facilities */}
          {activeTab==='facilities' && (
            <div className="card">
              <div className="card-header"><h3>School Facilities</h3></div>
              <div className="card-body">
                {[['1','Science Labs'],['2','Computer Labs'],['3','Library']].map(([n, ph]) => (
                  <div key={n} style={{ marginBottom:16, padding:'14px', border:'1px solid #e2e8f0', borderRadius:8 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1e3a5f', marginBottom:8 }}>Facility {n}</div>
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input className="form-input" placeholder={ph} {...f(`fac${n}Title`)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="form-input" rows={2} {...f(`fac${n}Text`)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {activeTab==='gallery' && (
            <div className="card">
              <div className="card-header">
                <h3>Photo Gallery</h3>
                <span style={{ fontSize:12, color:'#94a3b8' }}>Click to add photos</span>
              </div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                  {Array.from({length:6}).map((_,i) => (
                    <label key={i} style={{ display:'block', cursor:'pointer' }}>
                      <div style={{ height:120, borderRadius:8, border:'2px dashed #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9fa', fontSize:11.5, color:'#94a3b8', flexDirection:'column', gap:4, transition:'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = form.themeColor; e.currentTarget.style.background = form.themeColor+'08'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8f9fa'; }}>
                        <Image size={24} color="#cbd5e1"/>
                        Click to select
                      </div>
                      <input type="file" accept="image/*" style={{ display:'none' }} onChange={() => toast.info('Photo selected — save to apply')} />
                    </label>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop:14 }}><Image size={13}/> Upload All Photos</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
