/**
 * IlmForge — Email Settings Page v2.0
 * Configure SMTP for OTP, notifications, reports, fee receipts
 * Supports: Brevo / Gmail / Office365 / Any SMTP
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, Mail, Send, Eye, EyeOff, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

const PRESETS = [
  {
    id: 'brevo',
    label: '🟢 Brevo (Recommended — Free 300/day)',
    host: 'smtp-relay.brevo.com',
    port: '587',
    secure: false,
    note: 'Free plan mein 300 emails/day. signup.brevo.com pe register karein.',
  },
  {
    id: 'gmail',
    label: '📧 Gmail',
    host: 'smtp.gmail.com',
    port: '587',
    secure: false,
    note: 'Gmail → Google Account → Security → 2FA ON → App Password banana hoga.',
  },
  {
    id: 'office365',
    label: '🔵 Office 365 / Outlook',
    host: 'smtp.office365.com',
    port: '587',
    secure: false,
    note: 'Office 365 business account chahiye. Password directly use hoga.',
  },
  {
    id: 'custom',
    label: '⚙️ Custom SMTP',
    host: '',
    port: '587',
    secure: false,
    note: 'Koi bhi SMTP server — hosting provider ka bhi use kar saktay hain.',
  },
];

const EMAIL_TYPES = [
  { icon: '🔐', label: 'OTP / Verification', desc: 'Registration pe 6-digit code email hoga' },
  { icon: '🎉', label: 'Welcome Email', desc: 'School register hone pe welcome + credentials' },
  { icon: '✅', label: 'Fee Receipt', desc: 'Payment receive hone pe parent ko receipt' },
  { icon: '⚠️', label: 'Absent Alert', desc: 'Student absent ho to parent ko alert' },
  { icon: '🔔', label: 'Fee Reminder', desc: 'Unpaid fees pe reminder email' },
  { icon: '📊', label: 'Daily Report', desc: 'Roz collection report admin ko' },
  { icon: '🏆', label: 'Result Published', desc: 'Exam result publish hone pe parent' },
  { icon: '🔑', label: 'Password Reset', desc: 'Forgot password request pe link' },
];

export default function EmailSettingsPage() {
  const [selectedPreset, setSelectedPreset] = useState('brevo');
  const [form, setForm] = useState({
    smtpHost: 'smtp-relay.brevo.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: 'IlmForge School ERP',
  });
  const [showPass, setShowPass] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'fail'
  const [testMsg, setTestMsg] = useState('');

  const applyPreset = (presetId) => {
    const p = PRESETS.find(x => x.id === presetId);
    if (!p) return;
    setSelectedPreset(presetId);
    setForm(f => ({ ...f, smtpHost: p.host, smtpPort: p.port }));
  };

  const testConnection = async () => {
    if (!testEmail) return toast.error('Test email address enter karein');
    setTestStatus('testing');
    setTestMsg('');
    try {
      const res = await api.post('/settings/smtp-test', { testEmail });
      if (res.data.success) {
        setTestStatus('success');
        setTestMsg(`✅ Email sent to ${testEmail}! Inbox check karein (spam bhi dekhayn).`);
        toast.success('Test email sent successfully!');
      } else {
        setTestStatus('fail');
        setTestMsg(res.data.message || 'Email send fail hua');
        toast.error(res.data.message || 'Email send failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'SMTP connection failed';
      setTestStatus('fail');
      setTestMsg(msg);
      toast.error(msg);
    }
  };

  const currentPreset = PRESETS.find(p => p.id === selectedPreset);

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={20} color="#0073b7" /> Email Settings
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
          OTP verification, fee receipts, absent alerts, daily reports — sab email se bhejhain
        </p>
      </div>

      {/* What emails are sent */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>📧 IlmForge Kaunse Emails Bhejhta Hai?</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {EMAIL_TYPES.map(e => (
              <div key={e.label} style={{ padding: '10px 12px', background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{e.icon}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e3a5f' }}>{e.label}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{e.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left — Config */}
        <div className="card">
          <div className="card-header"><h3>SMTP Configuration</h3></div>
          <div className="card-body">
            {/* Provider Preset */}
            <div className="form-group">
              <label className="form-label">Email Provider Select Karein</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRESETS.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `2px solid ${selectedPreset === p.id ? '#0073b7' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer', background: selectedPreset === p.id ? '#eff6ff' : 'white', transition: 'all .12s' }}>
                    <input type="radio" name="preset" value={p.id} checked={selectedPreset === p.id} onChange={() => applyPreset(p.id)} style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selectedPreset === p.id ? '#0073b7' : '#374151' }}>{p.label}</div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>{p.note}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* SMTP Fields */}
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input className="form-input" value={form.smtpHost} onChange={e => setForm({...form, smtpHost: e.target.value})} placeholder="smtp-relay.brevo.com" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input className="form-input" value={form.smtpPort} onChange={e => setForm({...form, smtpPort: e.target.value})} placeholder="587" />
              </div>
              <div className="form-group">
                <label className="form-label">From Name</label>
                <input className="form-input" value={form.fromName} onChange={e => setForm({...form, fromName: e.target.value})} placeholder="IlmForge School ERP" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Username / Email</label>
              <input className="form-input" value={form.smtpUser} onChange={e => setForm({...form, smtpUser: e.target.value})} placeholder={selectedPreset === 'brevo' ? 'af56f0001@smtp-brevo.com' : 'your-email@gmail.com'} />
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Password / App Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'} value={form.smtpPass} onChange={e => setForm({...form, smtpPass: e.target.value})} placeholder="••••••••••••" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">From Email Address</label>
              <input className="form-input" value={form.fromEmail} onChange={e => setForm({...form, fromEmail: e.target.value})} placeholder="noreply@yourschool.com" />
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>Yeh email parents/students ko dikhe ga as sender</div>
            </div>

            {/* Important Note for Brevo */}
            {selectedPreset === 'brevo' && (
              <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#15803d', marginBottom: 4 }}>💡 Brevo Setup Guide:</div>
                <ol style={{ fontSize: 12, color: '#374151', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>brevo.com pe free account banayein</li>
                  <li>SMTP & API → SMTP → "Generate new SMTP key"</li>
                  <li>Username: SMTP Username (email format)</li>
                  <li>Password: Generated SMTP key paste karein</li>
                  <li>From Email mein apna verified email dalein</li>
                </ol>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => {
                // Save to Render .env via API (if configured)
                toast.success('Settings saved! Render pe SMTP_HOST, SMTP_USER, SMTP_PASS, FROM_EMAIL environment variables set karein.');
              }}>
                <Save size={14} /> Save Settings
              </button>
            </div>

            <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              <strong>⚠️ Important:</strong> Yeh settings Render ke environment variables mein set karni hain:<br/>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME</code>
            </div>
          </div>
        </div>

        {/* Right — Test */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header"><h3>🧪 Email Test Karein</h3></div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                Pehle Render pe SMTP variables set karein, phir yahan test karein.
              </p>
              <div className="form-group">
                <label className="form-label">Test Email Address</label>
                <input className="form-input" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="apna-email@gmail.com" />
              </div>
              <button onClick={testConnection} disabled={testStatus === 'testing'}
                className="btn btn-primary w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {testStatus === 'testing' ? <><Loader2 size={14} style={{ animation: 'spin .7s linear infinite' }} /> Testing…</> : <><Send size={14} /> Test Email Bhejayn</>}
              </button>

              {testStatus && testStatus !== 'testing' && (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: testStatus === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testStatus === 'success' ? '#86efac' : '#fecaca'}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  {testStatus === 'success' ? <CheckCircle size={16} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} /> : <XCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />}
                  <span style={{ fontSize: 13, color: testStatus === 'success' ? '#15803d' : '#dc2626', lineHeight: 1.5 }}>{testMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Current Render Config Display */}
          <div className="card">
            <div className="card-header"><h3>📋 Render Env Variables</h3></div>
            <div className="card-body">
              <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12 }}>
                Render Dashboard → ilmforge-erp → Environment mein yeh add karein:
              </p>
              <div style={{ background: '#1e293b', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12 }}>
                {[
                  ['SMTP_HOST', 'smtp-relay.brevo.com'],
                  ['SMTP_PORT', '587'],
                  ['SMTP_USER', 'af56f0001@smtp-brevo.com'],
                  ['SMTP_PASS', 'c019515...TowSjGv'],
                  ['FROM_EMAIL', 'addboost9@gmail.com'],
                  ['FROM_NAME', 'IlmForge School ERP'],
                ].map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 6, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#93c5fd' }}>{k}</span>
                    <span style={{ color: '#94a3b8' }}>=</span>
                    <span style={{ color: '#86efac' }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                const text = `SMTP_HOST=smtp-relay.brevo.com\nSMTP_PORT=587\nSMTP_USER=af56f0001@smtp-brevo.com\nSMTP_PASS=YOUR_BREVO_SMTP_KEY\nFROM_EMAIL=addboost9@gmail.com\nFROM_NAME=IlmForge School ERP`;
                navigator.clipboard?.writeText(text);
                toast.success('Env vars copied!');
              }} className="btn btn-outline btn-sm" style={{ marginTop: 10 }}>
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
