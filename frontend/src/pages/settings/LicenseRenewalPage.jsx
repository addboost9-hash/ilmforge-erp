import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Key, CheckCircle, RefreshCw, Shield } from 'lucide-react';

export default function LicenseRenewalPage() {
  const qc = useQueryClient();
  const [key, setKey]    = useState('ILM-');
  const [expiry, setExpiry] = useState('');

  const { data: status } = useQuery({
    queryKey: ['license-status'],
    queryFn: () => api.get('/license/status').then(r => r.data.data),
    staleTime: 30_000,
  });

  const renewMut = useMutation({
    mutationFn: () => api.post('/license/renew', { key: key.trim().toUpperCase(), expiry }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['license-status']);
      setKey('ILM-');
      setExpiry('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Renewal fail hui'),
  });

  const isOffline = status?.mode === 'offline';

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Shield size={28} color="#1B2F6E" />
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e3a5f' }}>License Management</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Offline license status aur renewal</p>
        </div>
      </div>

      {/* Current Status */}
      {status && (
        <div style={{
          background: status.valid ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${status.valid ? '#86efac' : '#fecaca'}`,
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <CheckCircle size={18} color={status.valid ? '#16a34a' : '#dc2626'} />
            <span style={{ fontWeight: 700, color: status.valid ? '#15803d' : '#dc2626', fontSize: 15 }}>
              {status.mode === 'cloud' ? 'Cloud Mode — License Required Nahi' :
               status.valid ? 'License Active' : 'License Expired/Invalid'}
            </span>
          </div>
          {status.mode === 'offline' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><span style={{ color: '#64748b' }}>Expiry Date:</span><br /><strong>{status.expiry || '—'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Days Remaining:</span><br />
                <strong style={{ color: status.daysLeft <= 7 ? '#dc2626' : status.daysLeft <= 30 ? '#d97706' : '#16a34a' }}>
                  {status.daysLeft !== null ? `${status.daysLeft} din` : '—'}
                </strong>
              </div>
              <div><span style={{ color: '#64748b' }}>License Key:</span><br /><code style={{ fontSize: 12 }}>{status.key || '—'}</code></div>
              <div><span style={{ color: '#64748b' }}>Installed:</span><br /><strong>{status.installedAt || '—'}</strong></div>
            </div>
          )}
        </div>
      )}

      {/* Renewal Form (offline only) */}
      {isOffline && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>
            License Renew Karein
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
            IlmForge support se nayi license key aur expiry date mangwayein:<br />
            <strong>WhatsApp: 0346-5146609</strong>
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nayi License Key
            </label>
            <input
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase())}
              placeholder="ILM-XXXX-XXXX-XXXXXXXXXXXX"
              style={{
                width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0',
                borderRadius: 8, fontSize: 14, fontFamily: 'monospace',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nayi Expiry Date
            </label>
            <input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0',
                borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <button
            onClick={() => renewMut.mutate()}
            disabled={renewMut.isPending || key.length < 15 || !expiry}
            style={{
              width: '100%', padding: '12px', background: '#1B2F6E', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: renewMut.isPending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: renewMut.isPending ? 0.7 : 1,
            }}
          >
            {renewMut.isPending ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Renewing...</> : <><Key size={16} /> License Renew Karo</>}
          </button>
        </div>
      )}

      {/* Contact box */}
      <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          License ke liye IlmForge support se rabta karein
        </p>
        <a href="https://wa.me/923465146609" target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 8, padding: '8px 20px', background: '#25d366', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          WhatsApp: 0346-5146609
        </a>
      </div>
    </div>
  );
}
