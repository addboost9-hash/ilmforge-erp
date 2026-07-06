/**
 * IlmForge — Channel Settings
 * Configure SMS (Twilio), WhatsApp (WaSender/UltraMsg), Email (SMTP)
 * per-school with test buttons.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  MessageSquare, Phone, Mail, Save, TestTube2, Eye, EyeOff,
  CheckCircle, XCircle, RefreshCw, ExternalLink, Info, AlertTriangle,
  Wifi, WifiOff,
} from 'lucide-react';

/* ─── Status badge ─────────────────────────────────────────────── */
function StatusBadge({ status }) {
  if (status === 'testing') return <span className="chip chip-yellow" style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}><RefreshCw size={10} /> Testing…</span>;
  if (status === 'ok')      return <span className="chip chip-green" style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}><CheckCircle size={10} /> Connected</span>;
  if (status === 'fail')    return <span className="chip chip-red" style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}><XCircle size={10} /> Failed</span>;
  return <span className="chip chip-gray">Not tested</span>;
}

/* ─── Section wrapper ──────────────────────────────────────────── */
function ChannelSection({ icon, title, subtitle, color, children, status }) {
  const Icon = icon;
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="card-header" style={{ background: color + '08' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} color={color} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#1e3a5f' }}>{title}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

/* ─── Password field ───────────────────────────────────────────── */
function SecretField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input className="form-input" type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} style={{ paddingRight: 40 }} />
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════ */
export default function ChannelSettingsPage() {
  const [smsStatus,  setSmsStatus]  = useState('');
  const [waStatus,   setWaStatus]   = useState('');
  const [mailStatus, setMailStatus] = useState('');

  const [sms, setSms] = useState({ smsAccountSid: '', smsAuthToken: '', smsFromNumber: '' });
  const [wa,  setWa]  = useState({ waApiUrl: '', waApiKey: '', waProvider: 'wasender', waInstance: '' });
  const [mail, setMail] = useState({ smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpFrom: '', smtpFromName: 'IlmForge', smtpSecure: false });

  const [testSmsPhone,  setTestSmsPhone]  = useState('');
  const [testWaPhone,   setTestWaPhone]   = useState('');
  const [testMailEmail, setTestMailEmail] = useState('');

  const { data: saved } = useQuery({
    queryKey: ['channel-settings'],
    queryFn:  () => api.get('/notifications/channel-settings').then(r => r.data.data || {}),
  });

  useEffect(() => {
    if (!saved) return;
    setSms({
      smsAccountSid: saved.smsAccountSid || '',
      smsAuthToken:  saved.smsAuthToken  || '',
      smsFromNumber: saved.smsFromNumber || '',
    });
    setWa({
      waApiUrl:  saved.waApiUrl  || '',
      waApiKey:  saved.waApiKey  || '',
      waProvider:saved.waProvider|| 'wasender',
      waInstance:saved.waInstance|| '',
    });
    setMail({
      smtpHost:    saved.smtpHost    || '',
      smtpPort:    saved.smtpPort    || '587',
      smtpUser:    saved.smtpUser    || '',
      smtpPass:    saved.smtpPass    || '',
      smtpFrom:    saved.smtpFrom    || '',
      smtpFromName:saved.smtpFromName|| 'IlmForge',
      smtpSecure:  saved.smtpSecure  || false,
    });
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/notifications/channel-settings', data),
    onSuccess: () => toast.success('Settings saved!'),
    onError: err => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const handleSaveAll = () => saveMutation.mutate({ ...sms, ...wa, ...mail });

  /* ── Test functions ────────────────────────────────────────── */
  const handleTestSms = async () => {
    if (!testSmsPhone) { toast.error('Enter a test phone number'); return; }
    setSmsStatus('testing');
    try {
      const r = await api.post('/notifications/test-sms', { to: testSmsPhone, ...sms });
      if (r.data.success) { setSmsStatus('ok'); toast.success(`SMS sent! SID: ${r.data.sid || 'OK'}`); }
      else { setSmsStatus('fail'); toast.error(r.data.error || 'Failed'); }
    } catch (e) { setSmsStatus('fail'); toast.error(e.response?.data?.error || 'Test failed'); }
  };

  const handleTestWa = async () => {
    if (!testWaPhone) { toast.error('Enter a test phone number'); return; }
    setWaStatus('testing');
    try {
      const r = await api.post('/notifications/test-whatsapp', { to: testWaPhone, ...wa });
      if (r.data.success) { setWaStatus('ok'); toast.success('WhatsApp test sent!'); }
      else { setWaStatus('fail'); toast.error(r.data.error || 'Failed'); }
    } catch (e) { setWaStatus('fail'); toast.error(e.response?.data?.error || 'Test failed'); }
  };

  const handleTestMail = async () => {
    if (!testMailEmail) { toast.error('Enter a test email address'); return; }
    setMailStatus('testing');
    try {
      const r = await api.post('/notifications/test-email', { to: testMailEmail });
      if (r.data.success) { setMailStatus('ok'); toast.success('Test email sent!'); }
      else { setMailStatus('fail'); toast.error(r.data.error || 'SMTP failed'); }
    } catch (e) { setMailStatus('fail'); toast.error(e.response?.data?.message || 'Test failed'); }
  };

  const handleSmtpVerify = async () => {
    setMailStatus('testing');
    try {
      const r = await api.post('/notifications/test-smtp-verify');
      if (r.data.success) { setMailStatus('ok'); toast.success('SMTP connection verified!'); }
      else { setMailStatus('fail'); toast.error(r.data.error || 'SMTP failed'); }
    } catch (e) { setMailStatus('fail'); toast.error('SMTP verification failed'); }
  };

  /* ── WA Provider presets ─────────────────────────────────────── */
  const WA_PRESETS = [
    { id: 'wasender',  label: 'WaSender',  url: 'https://api.wasender.app/api', hint: 'wasender.app — Pakistan popular' },
    { id: 'ultramsg',  label: 'UltraMsg',  url: 'https://api.ultramsg.com',    hint: 'ultramsg.com — instance based' },
    { id: 'twilio_wa', label: 'Twilio WA', url: 'https://api.twilio.com',      hint: 'Twilio WhatsApp Business' },
    { id: 'custom',    label: 'Custom API',url: '',                             hint: 'Any REST WhatsApp API' },
  ];

  const SMTP_PRESETS = [
    { label: 'Gmail',          host: 'smtp.gmail.com',     port: '587', secure: false, hint: 'Use App Password (2FA required)' },
    { label: 'Office 365',     host: 'smtp.office365.com', port: '587', secure: false, hint: 'Works with M365 accounts' },
    { label: 'Outlook.com',    host: 'smtp.outlook.com',   port: '587', secure: false, hint: 'Personal Outlook accounts' },
    { label: 'Hostinger',      host: 'smtp.hostinger.com', port: '465', secure: true,  hint: 'Hostinger hosting email' },
    { label: 'PTCL/Nayatel',   host: 'mail.ptcl.net.pk',  port: '587', secure: false, hint: 'Pakistan ISP email' },
  ];

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title">Channel Settings</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Configure SMS, WhatsApp, and Email — credentials store per school, not shared globally
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSaveAll} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <><RefreshCw size={14} /> Saving…</> : <><Save size={14} /> Save All Settings</>}
        </button>
      </div>

      {/* Info */}
      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Info size={14} />
        <span>Credentials are stored securely per school. After saving, use the <strong>Test</strong> buttons to verify each channel works before sending bulk messages.</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── SMS / Twilio ─────────────────────────────────────── */}
        <ChannelSection icon={MessageSquare} title="SMS — Twilio" color="#1d4ed8"
          subtitle="Send text messages to Pakistan numbers (03XXXXXXXXX auto-formatted)" status={smsStatus}>

          <div className="alert" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 16 }}>
            <Info size={13} color="#2563eb" />
            <span style={{ fontSize: 12.5, color: '#1d4ed8' }}>
              Get credentials at <a href="https://console.twilio.com" target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>console.twilio.com <ExternalLink size={10} /></a>.
              Trial account works — get a free number. Pakistan numbers need <strong>+92XXXXXXXXXX</strong> format (auto-converted).
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Account SID</label>
              <input className="form-input" value={sms.smsAccountSid} onChange={e => setSms({ ...sms, smsAccountSid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </div>
            <SecretField label="Auth Token" value={sms.smsAuthToken} onChange={e => setSms({ ...sms, smsAuthToken: e.target.value })}
              placeholder="your_auth_token_here" />
            <div className="form-group">
              <label className="form-label">From Number</label>
              <input className="form-input" value={sms.smsFromNumber} onChange={e => setSms({ ...sms, smsFromNumber: e.target.value })}
                placeholder="+12015550100" style={{ fontFamily: 'monospace' }} />
              <div className="form-hint">Twilio number in E.164 format</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <input className="form-input" style={{ flex: '1 1 180px', maxWidth: 220 }} value={testSmsPhone}
              onChange={e => setTestSmsPhone(e.target.value)} placeholder="03001234567 (test number)" />
            <button className="btn btn-outline btn-sm" onClick={handleTestSms} disabled={smsStatus === 'testing'}>
              {smsStatus === 'testing' ? <><RefreshCw size={13} /> Testing…</> : <><TestTube2 size={13} /> Send Test SMS</>}
            </button>
            <StatusBadge status={smsStatus} />
          </div>
        </ChannelSection>

        {/* ── WhatsApp ──────────────────────────────────────────── */}
        <ChannelSection icon={Phone} title="WhatsApp Business API" color="#25D366"
          subtitle="WaSender, UltraMsg, or any REST WhatsApp API" status={waStatus}>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {WA_PRESETS.map(p => (
              <button key={p.id} onClick={() => setWa({ ...wa, waProvider: p.id, waApiUrl: p.url })}
                style={{ padding: '6px 14px', borderRadius: 8, border: `2px solid ${wa.waProvider === p.id ? '#25D366' : '#e2e8f0'}`, background: wa.waProvider === p.id ? '#f0fdf4' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: wa.waProvider === p.id ? 700 : 500, color: wa.waProvider === p.id ? '#15803d' : '#64748b' }}>
                {p.label}
              </button>
            ))}
          </div>
          {WA_PRESETS.find(p => p.id === wa.waProvider)?.hint && (
            <div className="alert" style={{ background: '#f0fdf4', border: '1px solid #86efac', marginBottom: 14 }}>
              <Info size={12} color="#15803d" />
              <span style={{ fontSize: 12, color: '#15803d' }}>{WA_PRESETS.find(p => p.id === wa.waProvider).hint}</span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">API URL</label>
              <input className="form-input" value={wa.waApiUrl} onChange={e => setWa({ ...wa, waApiUrl: e.target.value })}
                placeholder="https://api.wasender.app/api" style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </div>
            <SecretField label="API Key / Token" value={wa.waApiKey} onChange={e => setWa({ ...wa, waApiKey: e.target.value })}
              placeholder="your_api_key_here" />
            {wa.waProvider === 'ultramsg' && (
              <div className="form-group">
                <label className="form-label">Instance ID</label>
                <input className="form-input" value={wa.waInstance} onChange={e => setWa({ ...wa, waInstance: e.target.value })}
                  placeholder="instance123" />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <input className="form-input" style={{ flex: '1 1 180px', maxWidth: 220 }} value={testWaPhone}
              onChange={e => setTestWaPhone(e.target.value)} placeholder="03001234567 (test number)" />
            <button className="btn btn-outline btn-sm" onClick={handleTestWa} disabled={waStatus === 'testing'}
              style={{ borderColor: '#86efac', color: '#15803d' }}>
              {waStatus === 'testing' ? <><RefreshCw size={13} /> Testing…</> : <><TestTube2 size={13} /> Send Test WA</>}
            </button>
            <StatusBadge status={waStatus} />
          </div>
        </ChannelSection>

        {/* ── Email / SMTP ───────────────────────────────────────── */}
        <ChannelSection icon={Mail} title="Email — SMTP" color="#d97706"
          subtitle="Gmail, Office 365, Outlook, Hostinger, or custom SMTP" status={mailStatus}>

          {/* Provider presets */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {SMTP_PRESETS.map(p => (
              <button key={p.label} onClick={() => setMail({ ...mail, smtpHost: p.host, smtpPort: p.port, smtpSecure: p.secure })}
                style={{ padding: '6px 14px', borderRadius: 8, border: `2px solid ${mail.smtpHost === p.host ? '#d97706' : '#e2e8f0'}`, background: mail.smtpHost === p.host ? '#fffbeb' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: mail.smtpHost === p.host ? 700 : 500, color: mail.smtpHost === p.host ? '#92400e' : '#64748b', position: 'relative' }}>
                {p.label}
                {mail.smtpHost === p.host && p.hint && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: 'white', fontSize: 10, padding: '4px 8px', borderRadius: 5, whiteSpace: 'nowrap', marginBottom: 4, zIndex: 10 }}>
                    {p.hint}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input className="form-input" value={mail.smtpHost} onChange={e => setMail({ ...mail, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com" style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Port</label>
              <select className="form-select" value={mail.smtpPort} onChange={e => setMail({ ...mail, smtpPort: e.target.value })}>
                <option value="587">587 (TLS/STARTTLS)</option>
                <option value="465">465 (SSL)</option>
                <option value="25">25 (Plain)</option>
                <option value="2525">2525 (Alt TLS)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Encryption</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {[{ v: false, l: 'STARTTLS' }, { v: true, l: 'SSL/TLS' }].map(o => (
                  <label key={String(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" checked={mail.smtpSecure === o.v} onChange={() => setMail({ ...mail, smtpSecure: o.v })} />
                    {o.l}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">SMTP Username (Email)</label>
              <input className="form-input" type="email" value={mail.smtpUser} onChange={e => setMail({ ...mail, smtpUser: e.target.value })}
                placeholder="youremail@gmail.com" />
            </div>
            <SecretField label="SMTP Password / App Password" value={mail.smtpPass}
              onChange={e => setMail({ ...mail, smtpPass: e.target.value })} placeholder="App password or SMTP password" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From Email</label>
              <input className="form-input" type="email" value={mail.smtpFrom} onChange={e => setMail({ ...mail, smtpFrom: e.target.value })}
                placeholder="notifications@yourschool.com" />
            </div>
            <div className="form-group">
              <label className="form-label">From Name</label>
              <input className="form-input" value={mail.smtpFromName} onChange={e => setMail({ ...mail, smtpFromName: e.target.value })}
                placeholder="IlmForge School" />
            </div>
          </div>

          {mail.smtpHost === 'smtp.gmail.com' && (
            <div className="alert alert-warning" style={{ marginTop: 8, marginBottom: 12 }}>
              <AlertTriangle size={13} />
              <span style={{ fontSize: 12 }}>
                Gmail requires an <strong>App Password</strong>, not your regular password.
                Enable 2FA → Google Account → Security → App Passwords → Generate for "Mail".
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ marginLeft: 6, fontWeight: 700 }}>Open App Passwords <ExternalLink size={10} /></a>
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={handleSmtpVerify} disabled={mailStatus === 'testing'}
              style={{ borderColor: '#fde68a', color: '#92400e' }}>
              {mailStatus === 'testing' ? <><RefreshCw size={13} /> Verifying…</> : <><Wifi size={13} /> Verify SMTP</>}
            </button>
            <input className="form-input" style={{ flex: '1 1 180px', maxWidth: 240 }} type="email" value={testMailEmail}
              onChange={e => setTestMailEmail(e.target.value)} placeholder="test@example.com" />
            <button className="btn btn-outline btn-sm" onClick={handleTestMail} disabled={mailStatus === 'testing'}
              style={{ borderColor: '#fde68a', color: '#92400e' }}>
              {mailStatus === 'testing' ? <><RefreshCw size={13} /> Sending…</> : <><TestTube2 size={13} /> Send Test Email</>}
            </button>
            <StatusBadge status={mailStatus} />
          </div>
        </ChannelSection>
      </div>

      {/* Save button bottom */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn btn-primary btn-lg" onClick={handleSaveAll} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <><RefreshCw size={14} /> Saving…</> : <><Save size={14} /> Save All Channel Settings</>}
        </button>
      </div>
    </div>
  );
}
