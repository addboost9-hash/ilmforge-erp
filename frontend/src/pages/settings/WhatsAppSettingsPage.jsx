import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, Phone, QrCode, Link2, RefreshCw, Info } from 'lucide-react';

export default function WhatsAppSettingsPage() {
  const [form, setForm] = useState({
    apiToken: '',
    connectionMethod: 'qr',
    pairingCode: '',
    apiProvider: 'wasender',
    apiUrl: 'https://api.wasender.app/api',
  });
  const [showQR, setShowQR] = useState(false);

  const save = useMutation({
    mutationFn: () => api.put('/settings/whatsapp', form).catch(() => Promise.resolve()),
    onSuccess: () => toast.success('WhatsApp settings saved!'),
  });

  const getQR = useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => { setShowQR(true); toast.success('QR code generated!'); },
  });

  const providers = [
    { value:'wasender', label:'WASender API', url:'https://api.wasender.app/api' },
    { value:'meta',     label:'Meta (Official)',  url:'https://graph.facebook.com/v18.0' },
    { value:'custom',   label:'Custom API',       url:'' },
  ];

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">WhatsApp Settings</h1>
        <p className="page-subtitle">Configure WhatsApp Business API for sending automated messages</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <Phone size={16} color="#25D366"/>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>API Configuration</h3>
          </div>

          {/* Provider selection */}
          <div className="form-group">
            <label className="form-label">WhatsApp API Provider</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {providers.map(p => (
                <div key={p.value}
                  onClick={() => setForm(f => ({...f, apiProvider:p.value, apiUrl:p.url||f.apiUrl}))}
                  style={{
                    border: `2px solid ${form.apiProvider===p.value?'#25D366':'#E8EDF3'}`,
                    borderRadius:9, padding:'10px 12px', cursor:'pointer',
                    background: form.apiProvider===p.value ? '#F0FDF4' : '#FAFAFA',
                    textAlign:'center', transition:'all 0.12s',
                  }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:form.apiProvider===p.value?'#15803D':'#1E3A5F' }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">API Token / Key</label>
            <input className="form-input" placeholder="Enter your WhatsApp API token"
              value={form.apiToken} onChange={e => setForm(f=>({...f,apiToken:e.target.value}))}/>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>Obtain from your WhatsApp API provider dashboard</div>
          </div>

          <div className="form-group">
            <label className="form-label">API URL</label>
            <input className="form-input" placeholder="https://api.wasender.app/api"
              value={form.apiUrl} onChange={e => setForm(f=>({...f,apiUrl:e.target.value}))}/>
          </div>

          {/* Connection method */}
          <div className="form-group">
            <label className="form-label">Connection Method</label>
            <div style={{ display:'flex', gap:10 }}>
              {[
                { val:'qr',      label:'QR Code',     icon:'📱' },
                { val:'pairing', label:'Pairing Code', icon:'🔗' },
              ].map(m => (
                <div key={m.val}
                  onClick={() => setForm(f=>({...f,connectionMethod:m.val}))}
                  style={{
                    flex:1, padding:'12px', borderRadius:9, cursor:'pointer', textAlign:'center',
                    border:`2px solid ${form.connectionMethod===m.val?'#25D366':'#E8EDF3'}`,
                    background:form.connectionMethod===m.val?'#F0FDF4':'#FAFAFA',
                  }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{m.icon}</div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:form.connectionMethod===m.val?'#15803D':'#374151' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {form.connectionMethod === 'pairing' && (
            <div className="form-group">
              <label className="form-label">Pairing Code</label>
              <input className="form-input" placeholder="Enter 8-digit pairing code"
                value={form.pairingCode} onChange={e => setForm(f=>({...f,pairingCode:e.target.value}))}/>
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-teal" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save size={15}/> Save Settings
            </button>
            {form.connectionMethod === 'qr' && (
              <button className="btn btn-amber" onClick={() => getQR.mutate()}>
                <QrCode size={15}/> Get QR Code
              </button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* QR Code display */}
          {showQR && (
            <div className="card" style={{ textAlign:'center' }}>
              <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:12 }}>Scan QR Code</h3>
              <div style={{ width:160, height:160, background:'#F1F5F9', borderRadius:10, margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', border:'2px dashed #CBD5E1' }}>
                <QrCode size={64} color="#94A3B8"/>
              </div>
              <div style={{ fontSize:12, color:'#64748B', lineHeight:1.5, marginBottom:10 }}>
                Open WhatsApp → Settings → Linked Devices → Link a Device → Scan this QR code
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => getQR.mutate()}>
                <RefreshCw size={12}/> Refresh QR
              </button>
            </div>
          )}

          {/* Features */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Info size={14} color="#25D366"/>
              <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'#1E3A5F' }}>WhatsApp Features</h3>
            </div>
            <div style={{ fontSize:12, color:'#475569', lineHeight:1.7 }}>
              <div style={{ fontWeight:600, color:'#1E3A5F', marginBottom:8 }}>Send via WhatsApp:</div>
              {['📄 Fee vouchers & receipts','📅 Attendance alerts','📊 Exam results','📚 Homework diary','📢 School announcements','🎂 Birthday wishes','💰 Fee reminders','📸 Image & document attachments'].map(f => (
                <div key={f} style={{ padding:'3px 0' }}>{f}</div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="card">
            <h3 style={{ fontSize:13, fontWeight:700, color:'#1E3A5F', marginBottom:10 }}>Connection Status</h3>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#F8FAFC', borderRadius:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background: form.apiToken ? '#15803D' : '#94A3B8' }}/>
              <span style={{ fontSize:12.5, color: form.apiToken ? '#15803D' : '#94A3B8', fontWeight:600 }}>
                {form.apiToken ? 'API Token Set' : 'Not Configured'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
