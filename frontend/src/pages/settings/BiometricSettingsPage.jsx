/**
 * IlmForge — Biometric Attendance Settings
 * Real ZKTeco integration guide + token management + connection test
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Fingerprint, Copy, RefreshCw, CheckCircle, Download,
  Wifi, WifiOff, Shield, Settings, AlertCircle, ExternalLink, Link
} from 'lucide-react';

/* ── Helpers ── */
const genToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length:32}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/* derive base host from current API base */
const getHostUrl = () => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  return apiBase.replace('/api/v1', '').replace('/api/v1/', '');
};

const DEVICES = [
  { name:'ZKTeco K40',  desc:'Fingerprint & RFID card time attendance terminal', emoji:'🖐', model:'K40'  },
  { name:'ZKTeco MB20', desc:'Fingerprint + optional face recognition',            emoji:'👤', model:'MB20' },
  { name:'ZKTeco IN01', desc:'Fingerprint & RFID card reader',                     emoji:'🔏', model:'IN01' },
  { name:'Any ZKTeco',  desc:'Most ZKTeco models with TCP/IP support',              emoji:'📡', model:'*'   },
];

const INTEGRATION_STEPS = [
  {
    n:1, title:'Download & Install BioSync App',
    body:'The IlmForge BioSync Windows app connects your ZKTeco device to this portal.',
    steps:[
      'Click "Download BioSync App" below',
      'Extract the zip and run BioSync-Setup.exe',
      'Right-click → Run as Administrator if prompted',
    ],
  },
  {
    n:2, title:'Configure BioSync App',
    body:'Enter your server details so the app knows where to upload attendance.',
    steps:[
      'Open BioSync App → Settings',
      'Enter Server URL (your IlmForge backend URL)',
      'Paste the Bio Token from this page',
      'Enter your Campus ID',
      'Click Save & Connect',
    ],
  },
  {
    n:3, title:'Add Your ZKTeco Device',
    body:'Point BioSync to your fingerprint machine over the network.',
    steps:[
      'In BioSync → Device Management → Add Device',
      'Enter device IP (usually 192.168.1.x — check device screen)',
      'Port: 4370 (ZKTeco default)',
      'Click Test Connection → then Add',
    ],
  },
  {
    n:4, title:'Enable Auto-Sync',
    body:'Turn on auto-sync so attendance uploads every 10 minutes automatically.',
    steps:[
      'BioSync → Settings → Auto Sync → Enable',
      'Set interval (recommended: 10 minutes)',
      'App runs in system tray — minimize, do not close',
    ],
  },
];

export default function BiometricSettingsPage() {
  const STORAGE_KEY = 'ilmforge_bio_settings';
  const [token,     setToken]     = useState('');
  const [campusId,  setCampusId]  = useState('1');
  const [connStatus,setConnStatus] = useState('idle'); // idle|testing|ok|fail
  const [syncLogs,  setSyncLogs]   = useState([]);

  /* Load saved settings from localStorage */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { token:t, campusId:c } = JSON.parse(saved);
      if (t) setToken(t); else setToken(genToken());
      if (c) setCampusId(c);
    } else {
      setToken(genToken());
    }

    /* Load recent sync logs */
    const logs = localStorage.getItem('ilmforge_bio_logs');
    if (logs) setSyncLogs(JSON.parse(logs).slice(0, 5));
  }, []);

  const hostUrl = getHostUrl();

  /* Copy to clipboard */
  const copy = (text, label='') => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label||'Text'} copied!`));
  };

  /* Regenerate token */
  const regenToken = () => {
    const newToken = genToken();
    setToken(newToken);
    saveSettings(newToken, campusId);
    toast.success('New Bio Token generated!');
  };

  /* Save settings */
  const saveSettings = (t = token, c = campusId) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, campusId: c }));
  };

  const handleSave = () => {
    saveSettings();
    toast.success('Biometric settings saved!');
  };

  /* Test connection to backend */
  const testConnection = async () => {
    setConnStatus('testing');
    try {
      const res = await api.get('/health').catch(() => api.get('/auth/me'));
      setConnStatus('ok');
      toast.success('Backend connection successful! ✅');
    } catch {
      setConnStatus('fail');
      toast.error('Cannot reach backend. Check your internet or backend URL.');
    }
  };

  /* Simulate a test sync (in real app, this would come from ZKTeco device) */
  const testSync = () => {
    const log = {
      time: new Date().toLocaleTimeString('en-PK'),
      device: 'ZKTeco Test',
      records: 0,
      status: 'connected',
    };
    toast('Test sync initiated. In production, attendance uploads automatically.', { icon:'📡' });
  };

  const connIcon = { idle:<Wifi size={14}/>, testing:<RefreshCw size={14} style={{animation:'spin .8s linear infinite'}}/>, ok:<CheckCircle size={14}/>, fail:<WifiOff size={14}/> };
  const connColor = { idle:'#6B7280', testing:'#D97706', ok:'#15803D', fail:'#B91C1C' };
  const connLabel = { idle:'Test Connection', testing:'Testing…', ok:'Connected ✓', fail:'Connection Failed' };

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Biometric Attendance</h1>
        <p className="page-subtitle">Connect ZKTeco fingerprint devices to IlmForge for automatic attendance</p>
      </div>

      {/* Connection status bar */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <div className="card" style={{ flex:1, minWidth:200, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background: connStatus==='ok'?'#22C55E':connStatus==='fail'?'#EF4444':'#94A3B8', boxShadow: connStatus==='ok'?'0 0 8px #22C55E':undefined }}/>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151' }}>Backend Server</div>
            <div style={{ fontSize:11.5, color:'#6B7280', wordBreak:'break-all' }}>{hostUrl}</div>
          </div>
          <button className="btn btn-sm btn-outline" style={{ marginLeft:'auto', gap:4, color:connColor[connStatus] }}
            onClick={testConnection} disabled={connStatus==='testing'}>
            {connIcon[connStatus]} {connLabel[connStatus]}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* ── LEFT: Token & App Setup ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Token card */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <Shield size={15} color="#0D9488"/>
              <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>API Credentials</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Bio Token <span style={{color:'#94A3B8',fontWeight:400,fontSize:11}}>(keep secret)</span></label>
              <div style={{ display:'flex', gap:6 }}>
                <input className="form-input" value={token} readOnly
                  style={{ flex:1, fontFamily:'monospace', fontSize:11.5, letterSpacing:0.5 }}/>
                <button className="btn btn-outline btn-sm btn-icon" onClick={()=>copy(token,'Token')} title="Copy">
                  <Copy size={13}/>
                </button>
                <button className="btn btn-sm" style={{ background:'#0F766E', color:'#fff', gap:4 }}
                  onClick={regenToken} title="Generate new token">
                  <RefreshCw size={12}/> New
                </button>
              </div>
              <div style={{ fontSize:11.5, color:'#64748B', marginTop:4 }}>Paste this token in BioSync app settings</div>
            </div>

            <div className="form-group">
              <label className="form-label">Campus ID</label>
              <input className="form-input" type="number" value={campusId} style={{ width:110 }}
                onChange={e=>setCampusId(e.target.value)}/>
              <div style={{ fontSize:11.5, color:'#64748B', marginTop:4 }}>Match this with Campus ID in BioSync app</div>
            </div>

            <button className="btn btn-teal" style={{ width:'100%', justifyContent:'center' }} onClick={handleSave}>
              <CheckCircle size={13}/> Save Settings
            </button>
          </div>

          {/* Setup config box */}
          <div className="card" style={{ background:'#F0FDF9', border:'1px solid #CCFBF1' }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:'#0F766E', marginBottom:10 }}>📋 BioSync App Configuration</div>
            <div style={{ fontSize:12, color:'#065F46', lineHeight:2 }}>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ color:'#94A3B8', width:90, flexShrink:0 }}>Server URL:</span>
                <span style={{ fontFamily:'monospace', fontWeight:700, wordBreak:'break-all' }}>{hostUrl}</span>
                <button style={{ background:'none',border:'none',cursor:'pointer',color:'#0D9488',padding:0,flexShrink:0 }}
                  onClick={()=>copy(hostUrl,'Server URL')}><Copy size={10}/></button>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ color:'#94A3B8', width:90, flexShrink:0 }}>Campus ID:</span>
                <span style={{ fontFamily:'monospace', fontWeight:700 }}>{campusId}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ color:'#94A3B8', width:90, flexShrink:0 }}>Bio Token:</span>
                <span style={{ fontFamily:'monospace', fontSize:10.5, wordBreak:'break-all' }}>{token.slice(0,16)}…</span>
                <button style={{ background:'none',border:'none',cursor:'pointer',color:'#0D9488',padding:0,flexShrink:0 }}
                  onClick={()=>copy(token,'Token')}><Copy size={10}/></button>
              </div>
            </div>
          </div>

          {/* Download button */}
          <div className="card" style={{ background:'linear-gradient(135deg,#0F4C45,#0F766E)', color:'#fff', textAlign:'center' }}>
            <Fingerprint size={32} color="rgba(255,255,255,0.7)" style={{ marginBottom:8 }}/>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:5 }}>BioSync Windows App</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:14, lineHeight:1.5 }}>
              Connects your ZKTeco device to IlmForge.<br/>Windows 7/8/10/11 · 64-bit
            </div>
            <a
              href="https://github.com/addboost9-hash/ilmforge-biosync/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)', justifyContent:'center', width:'100%', gap:6 }}>
              <Download size={14}/> Download BioSync App (Windows)
            </a>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:8 }}>
              Free · Open Source · Auto-updates
            </div>
          </div>
        </div>

        {/* ── RIGHT: Devices + Steps ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Supported devices */}
          <div className="card">
            <h3 style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:12 }}>Supported ZKTeco Devices</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {DEVICES.map(d => (
                <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#F8FAFC', borderRadius:8, border:'1px solid #E8EDF3' }}>
                  <span style={{ fontSize:22 }}>{d.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1E3A5F' }}>{d.name}</div>
                    <div style={{ fontSize:11.5, color:'#64748B' }}>{d.desc}</div>
                  </div>
                  <span className="badge badge-teal" style={{ fontSize:10 }}>{d.model}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10, padding:'8px 12px', background:'#DCFCE7', border:'1px solid #BBF7D0', borderRadius:8 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#15803D', marginBottom:3 }}>✅ Auto-Sync</div>
              <p style={{ fontSize:12, color:'#166534', margin:0, lineHeight:1.5 }}>
                BioSync uploads attendance every 10 min automatically. App runs in system tray — no manual intervention needed.
              </p>
            </div>
          </div>

          {/* Integration steps */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #F3F4F6' }}>
              <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Setup Steps</h3>
            </div>
            <div style={{ padding:'12px 16px' }}>
              {INTEGRATION_STEPS.map(step => (
                <div key={step.n} style={{ display:'flex', gap:10, marginBottom:14, paddingBottom:14, borderBottom:'1px solid #F3F4F6' }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'#0D9488', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>
                    {step.n}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1E3A5F', marginBottom:3 }}>{step.title}</div>
                    <div style={{ fontSize:12, color:'#64748B', marginBottom:5, lineHeight:1.5 }}>{step.body}</div>
                    {step.steps?.map((s,i) => (
                      <div key={i} style={{ display:'flex', gap:6, fontSize:12, color:'#374151', marginBottom:3 }}>
                        <CheckCircle size={12} color="#0D9488" style={{ flexShrink:0, marginTop:1 }}/>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Test sync button */}
              <button className="btn btn-outline" style={{ width:'100%', justifyContent:'center', gap:6 }}
                onClick={testSync}>
                <Wifi size={13}/> Test Sync (Simulate)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Network guide */}
      <div className="card" style={{ marginTop:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <AlertCircle size={14} color="#D97706"/>
          <h3 style={{ margin:0, fontSize:13.5, fontWeight:700, color:'#1E3A5F' }}>Network Requirements</h3>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
          {[
            { icon:'🌐', title:'Same Network', body:'ZKTeco device and the Windows PC running BioSync must be on the same LAN/WiFi.' },
            { icon:'🔌', title:'Device IP', body:'Find device IP on ZKTeco screen: Menu → Info → Network → IP. Default port: 4370.' },
            { icon:'🔒', title:'Firewall', body:'Allow port 4370 in Windows Firewall for ZKTeco communication. BioSync handles the rest.' },
            { icon:'☁️', title:'Cloud Sync', body:'Attendance data is uploaded to IlmForge cloud over HTTPS — works from any network once configured.' },
          ].map(n => (
            <div key={n.title} style={{ padding:'10px 12px', background:'#F8FAFC', borderRadius:8, border:'1px solid #E8EDF3' }}>
              <div style={{ fontSize:20, marginBottom:5 }}>{n.icon}</div>
              <div style={{ fontSize:12.5, fontWeight:700, color:'#1E3A5F', marginBottom:3 }}>{n.title}</div>
              <div style={{ fontSize:12, color:'#6B7280', lineHeight:1.5 }}>{n.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
