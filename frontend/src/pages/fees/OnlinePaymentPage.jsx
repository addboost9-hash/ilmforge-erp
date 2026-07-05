/** Online Payment — JazzCash / EasyPaisa fee collection portal link */
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Globe, CreditCard, Smartphone, ExternalLink, CheckCircle } from 'lucide-react';

const GATEWAYS = [
  { id: 'jazzcash',  label: 'JazzCash',  color: '#ef4444', icon: Smartphone, desc: 'Pakistan\'s leading mobile wallet. Students/parents can pay via JazzCash app or mobile account.' },
  { id: 'easypaisa', label: 'EasyPaisa', color: '#10b981', icon: Smartphone, desc: 'Telenor EasyPaisa mobile payments. Widely used across Pakistan for bill and fee payment.' },
  { id: 'card',      label: 'Debit/Credit Card', color: '#6366f1', icon: CreditCard, desc: 'Visa and Mastercard payments via secure online gateway.' },
];

export default function OnlinePaymentPage() {
  const { data: settings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: () => api.get('/settings/payment').then(r => r.data.data || {}).catch(() => ({})),
  });

  const { data: txns = [] } = useQuery({
    queryKey: ['recent-payments-online'],
    queryFn: () => api.get('/payments?method=online&limit=10').then(r => r.data.data || []).catch(() => []),
  });

  const enabledGateways = (settings?.enabledGateways || []);

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={20} color="#0073b7" /> Online Payment Gateway
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            JazzCash, EasyPaisa, and card payments. Configure in Settings → Payments.
          </p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {GATEWAYS.map(gw => {
          const Icon = gw.icon;
          const active = enabledGateways.includes(gw.id);
          return (
            <div key={gw.id} className="ribbon-card" style={{ borderLeftColor: gw.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: gw.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={gw.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 14 }}>{gw.label}</div>
                  <span className={`chip ${active ? 'chip-green' : 'chip-gray'}`}>
                    {active ? '✓ Enabled' : 'Not configured'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{gw.desc}</p>
              {!active && (
                <a href="/settings/payments" className="btn btn-outline btn-sm" style={{ marginTop: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={12} /> Configure
                </a>
              )}
              {active && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, color: '#15803d', fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle size={13} /> Ready to accept payments
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent Online Payments</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>
                {['Date', 'Student', 'Amount', 'Provider', 'Ref #', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>No online payments yet</td></tr>
              ) : txns.map(t => (
                <tr key={t.id}>
                  <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-PK') : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{t.student?.name || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#0073b7' }}>Rs. {Number(t.amount || 0).toLocaleString('en-PK')}</td>
                  <td><span className="chip chip-blue">{t.provider || t.method}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.providerRef || t.transactionNo || '—'}</td>
                  <td><span className={`chip ${t.status === 'completed' ? 'chip-green' : t.status === 'failed' ? 'chip-red' : 'chip-yellow'}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
