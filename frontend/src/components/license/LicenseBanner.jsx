import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { useState } from 'react';
import { X, Key, AlertTriangle } from 'lucide-react';

export default function LicenseBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ['license-status'],
    queryFn: () => api.get('/license/status').then(r => r.data.data),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: false,
  });

  if (!data || data.mode === 'cloud' || dismissed) return null;
  if (!data.expiry) return null;

  const daysLeft = data.daysLeft;
  if (daysLeft === null || daysLeft > 30) return null;

  const isExpired  = daysLeft <= 0;
  const isCritical = daysLeft <= 7;
  const isWarning  = daysLeft <= 30;

  const bg      = isExpired ? '#fef2f2' : isCritical ? '#fff7ed' : '#fefce8';
  const border  = isExpired ? '#fecaca' : isCritical ? '#fed7aa' : '#fde68a';
  const color   = isExpired ? '#dc2626' : isCritical ? '#c2410c' : '#92400e';
  const icon    = isExpired ? '❌' : isCritical ? '🔴' : '⚠️';
  const msg     = isExpired
    ? 'License expire ho gayi! App kaam nahi karega. IlmForge se rabta karein.'
    : `License ${daysLeft} din mein expire ho rahi hai (${data.expiry})`;

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 8,
      padding: '10px 16px', margin: '8px 16px 0',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, color,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontWeight: 600 }}>{msg}</span>
      <a
        href="https://wa.me/923465146609?text=IlmForge+license+renew+karni+hai"
        target="_blank" rel="noreferrer"
        style={{
          background: color, color: 'white', padding: '5px 12px',
          borderRadius: 6, fontSize: 12, fontWeight: 700,
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          whiteSpace: 'nowrap',
        }}
      >
        <Key size={12} /> Renew Now
      </a>
      {!isExpired && (
        <button onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 2 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
