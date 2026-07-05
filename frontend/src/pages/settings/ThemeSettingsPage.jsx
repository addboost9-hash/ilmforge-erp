import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import { Save, Check, Palette } from 'lucide-react';

const THEMES = [
  { name:'Navy Blue',  primary:'#1E3A5F', secondary:'#0D9488', preview:['#1E3A5F','#0D9488','#2563EB'] },
  { name:'Dark',       primary:'#111827', secondary:'#374151', preview:['#111827','#374151','#6B7280'] },
  { name:'Purple',     primary:'#4C1D95', secondary:'#7C3AED', preview:['#4C1D95','#7C3AED','#A78BFA'] },
  { name:'Green',      primary:'#14532D', secondary:'#15803D', preview:['#14532D','#15803D','#22C55E'] },
  { name:'Red',        primary:'#7F1D1D', secondary:'#DC2626', preview:['#7F1D1D','#DC2626','#F87171'] },
  { name:'Blue',       primary:'#1E3A8A', secondary:'#2563EB', preview:['#1E3A8A','#2563EB','#60A5FA'] },
  { name:'Orange',     primary:'#78350F', secondary:'#D97706', preview:['#78350F','#D97706','#FCD34D'] },
  { name:'Teal',       primary:'#134E4A', secondary:'#0F766E', preview:['#134E4A','#0F766E','#2DD4BF'] },
];

export default function ThemeSettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState('Navy Blue');
  const [customPrimary, setCustomPrimary] = useState('#1E3A5F');
  const [customSecondary, setCustomSecondary] = useState('#0D9488');

  const { data: themeSettings } = useQuery({
    queryKey: ['settings-theme'],
    queryFn: () => api.get('/settings/theme').then(r => r.data.data),
  });

  useEffect(() => {
    if (!themeSettings) return;
    if (themeSettings.selectedTheme) setSelectedTheme(themeSettings.selectedTheme);
    if (themeSettings.customPrimary) setCustomPrimary(themeSettings.customPrimary);
    if (themeSettings.customSecondary) setCustomSecondary(themeSettings.customSecondary);
  }, [themeSettings]);

  const saveTheme = useMutation({
    mutationFn: (payload) => api.put('/settings/theme', payload),
    onError: err => toast.error(err.response?.data?.message || 'Failed to save theme settings'),
  });

  const applyTheme = () => {
    const theme = THEMES.find(t=>t.name===selectedTheme);
    if (theme) {
      document.documentElement.style.setProperty('--navy', theme.primary);
      document.documentElement.style.setProperty('--teal', theme.secondary);
      saveTheme.mutate({
        selectedTheme: theme.name,
        customPrimary,
        customSecondary,
        applyMode: 'preset',
      });
      toast.success(`${theme.name} theme applied!`);
    }
  };

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Theme Settings</h1>
          <p className="page-subtitle">Customize the color theme of your EduForge Pro portal</p>
        </div>
        <button className="btn btn-teal" onClick={applyTheme}>
          <Save size={15}/> Apply Theme
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
        {/* Preset themes */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Palette size={15} color="#0D9488"/>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Preset Themes</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
            {THEMES.map(theme=>(
              <div key={theme.name}
                onClick={()=>setSelectedTheme(theme.name)}
                style={{
                  border:`2px solid ${selectedTheme===theme.name?theme.primary:'#E8EDF3'}`,
                  borderRadius:11, padding:14, cursor:'pointer',
                  background: selectedTheme===theme.name ? `${theme.primary}08` : '#FAFAFA',
                  transition:'all 0.12s',
                  position:'relative',
                }}>
                {selectedTheme===theme.name && (
                  <div style={{ position:'absolute', top:8, right:8, width:20,height:20,borderRadius:'50%',background:theme.primary,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Check size={12} color="#fff"/>
                  </div>
                )}
                {/* Color swatches */}
                <div style={{ display:'flex', gap:4, marginBottom:10 }}>
                  {theme.preview.map((c,i)=>(
                    <div key={i} style={{ flex:1, height:24, borderRadius:5, background:c }}/>
                  ))}
                </div>
                <div style={{ fontSize:12.5, fontWeight:700, color: selectedTheme===theme.name ? theme.primary : '#1E3A5F' }}>
                  {theme.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom colors + preview */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Custom */}
          <div className="card">
            <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:14 }}>Custom Colors</h3>
            <div className="form-group">
              <label className="form-label">Primary Color (Sidebar / Header)</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={customPrimary} onChange={e=>setCustomPrimary(e.target.value)}
                  style={{ width:40,height:34,borderRadius:6,border:'1px solid #E8EDF3',padding:2,cursor:'pointer' }}/>
                <input className="form-input" value={customPrimary} onChange={e=>setCustomPrimary(e.target.value)}
                  style={{ flex:1, fontFamily:'monospace' }}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Accent Color (Buttons / Active)</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={customSecondary} onChange={e=>setCustomSecondary(e.target.value)}
                  style={{ width:40,height:34,borderRadius:6,border:'1px solid #E8EDF3',padding:2,cursor:'pointer' }}/>
                <input className="form-input" value={customSecondary} onChange={e=>setCustomSecondary(e.target.value)}
                  style={{ flex:1, fontFamily:'monospace' }}/>
              </div>
            </div>
            <button className="btn btn-outline" style={{ width:'100%', justifyContent:'center' }}
              onClick={()=>{
                document.documentElement.style.setProperty('--navy',customPrimary);
                document.documentElement.style.setProperty('--teal',customSecondary);
                saveTheme.mutate({
                  selectedTheme,
                  customPrimary,
                  customSecondary,
                  applyMode: 'custom',
                });
                toast.success('Custom theme applied!');
              }}>
              <Palette size={14}/> Apply Custom
            </button>
          </div>

          {/* Preview */}
          <div className="card">
            <h3 style={{ fontSize:13, fontWeight:700, color:'#1E3A5F', marginBottom:10 }}>Preview</h3>
            <div style={{ borderRadius:8, overflow:'hidden', border:'1px solid #E8EDF3' }}>
              {/* Sidebar strip */}
              <div style={{ background: THEMES.find(t=>t.name===selectedTheme)?.primary||customPrimary, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:20,height:20,borderRadius:5,background:'rgba(255,255,255,0.2)' }}/>
                <div style={{ color:'#fff', fontSize:11.5, fontWeight:600 }}>EduForge Pro</div>
              </div>
              {/* Content strip */}
              <div style={{ padding:'10px 12px', background:'#F8FAFC' }}>
                <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                  <div style={{ flex:1, height:24, borderRadius:6, background: THEMES.find(t=>t.name===selectedTheme)?.secondary||customSecondary, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#fff', fontSize:10, fontWeight:600 }}>Button</span>
                  </div>
                  <div style={{ width:60, height:24, borderRadius:6, background:'#E8EDF3' }}/>
                </div>
                <div style={{ height:8, borderRadius:3, background:'#E8EDF3', marginBottom:5 }}/>
                <div style={{ height:8, borderRadius:3, background:'#E8EDF3', width:'80%' }}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
