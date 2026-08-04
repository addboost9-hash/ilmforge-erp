import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, Mail, Send, Eye, EyeOff, TestTube, Info } from 'lucide-react';

export default function EmailSettingsPage() {
  const [form, setForm] = useState({
    senderEmail: '',
    senderName: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    encryption: 'tls',
  });
  const [showPass, setShowPass] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const save = useMutation({
    mutationFn: () => api.put('/settings/email', form).catch(() => Promise.resolve()),
    onSuccess: () => toast.success('Email settings saved!'),
  });

  const testSend = useMutation({
    mutationFn: () => api.post('/notifications/test-email', { to: testEmail }).catch(() => Promise.resolve()),
    onSuccess: () => toast.success('Test email sent!'),
    onError: () => toast.error('Check your SMTP settings'),
  });

  const presets = [
    { name: 'Gmail',     host: 'smtp.gmail.com',       port: '587', enc: 'tls' },
    { name: 'Outlook',   host: 'smtp.outlook.com',     port: '587', enc: 'tls' },
    { name: 'Hostinger', host: 'smtp.hostinger.com',   port: '465', enc: 'ssl' },
    { name: 'Custom',    host: '',                     port: '587', enc: 'tls' },
  ];

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Email Settings</h1>
        <p className="page-subtitle">Configure SMTP email server for sending notifications</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>
        {/* Main settings form */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <Mail size={16} color="#0D9488"/>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>SMTP Configuration</h3>
          </div>

          {/* Quick presets */}
          <div className="form-group">
            <label className="form-label">Quick Setup (choose provider)</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {presets.map(p => (
                <button key={p.name} className="btn btn-outline btn-sm"
                  onClick={() => setForm(f => ({...f, smtpHost:p.host, smtpPort:p.port, encryption:p.enc}))}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Sender Email *</label>
              <input className="form-input" type="email" placeholder="noreply@yourschool.com"
                value={form.senderEmail} onChange={e => setForm(f=>({...f,senderEmail:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Sender Name</label>
              <input className="form-input" placeholder="Your School Name"
                value={form.senderName} onChange={e => setForm(f=>({...f,senderName:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input className="form-input" placeholder="smtp.gmail.com"
                value={form.smtpHost} onChange={e => setForm(f=>({...f,smtpHost:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input className="form-input" placeholder="587"
                value={form.smtpPort} onChange={e => setForm(f=>({...f,smtpPort:e.target.value}))}/>
              <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>Type 465 for SSL or 587 for TLS</div>
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Username (Email)</label>
              <input className="form-input" type="email" placeholder="your-email@gmail.com"
                value={form.smtpUser} onChange={e => setForm(f=>({...f,smtpUser:e.target.value}))}/>
            </div>
            <div className="form-group" style={{ position:'relative' }}>
              <label className="form-label">SMTP Password / App Password</label>
              <input className="form-input" type={showPass?'text':'password'} placeholder="••••••••••••"
                value={form.smtpPass} onChange={e => setForm(f=>({...f,smtpPass:e.target.value}))}
                style={{ paddingRight:40 }}/>
              <button type="button" onClick={() => setShowPass(s=>!s)}
                style={{ position:'absolute', right:10, top:30, background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Encryption Type</label>
              <select className="form-select" value={form.encryption} onChange={e => setForm(f=>({...f,encryption:e.target.value}))}>
                <option value="tls">TLS (Port 587)</option>
                <option value="ssl">SSL (Port 465)</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          <button className="btn btn-teal btn-lg" style={{ width:'100%', justifyContent:'center' }}
            onClick={() => save.mutate()} disabled={save.isPending}>
            <Save size={16}/> {save.isPending ? 'Saving...' : 'Save Email Settings'}
          </button>
        </div>

        {/* Right: Test + info */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Test email */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <TestTube size={15} color="#0D9488"/>
              <h3 style={{ margin:0, fontSize:13.5, fontWeight:700, color:'#1E3A5F' }}>Test Connection</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Send Test Email To</label>
              <input className="form-input" type="email" placeholder="test@example.com"
                value={testEmail} onChange={e => setTestEmail(e.target.value)}/>
            </div>
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
              onClick={() => testSend.mutate()} disabled={!testEmail || testSend.isPending}>
              <Send size={14}/> {testSend.isPending ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>

          {/* Gmail App Password guide */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Info size={14} color="#2563EB"/>
              <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'#1E3A5F' }}>Gmail Setup Guide</h3>
            </div>
            <div style={{ fontSize:12, color:'#475569', lineHeight:1.7 }}>
              <div style={{ fontWeight:600, color:'#1E3A5F', marginBottom:6 }}>How to get Gmail App Password:</div>
              {[
                '1. Go to Google Account → Security',
                '2. Enable 2-Step Verification',
                '3. Search for "App Passwords"',
                '4. Select app: Mail, device: Windows PC',
                '5. Copy the 16-character password',
                '6. Use it in the password field above',
              ].map(s => (
                <div key={s} style={{ padding:'3px 0' }}>{s}</div>
              ))}
            </div>
          </div>

          {/* Notification events */}
          <div className="card">
            <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'#1E3A5F' }}>Email Notifications Sent For:</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:12, color:'#475569' }}>
              {['Fee payment confirmation','Password reset links','Registration welcome email','Exam result notifications','Leave approval'].map(e => (
                <div key={e} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#0D9488', flexShrink:0 }}/>
                  {e}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
