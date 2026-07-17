import React from 'react';

export function SkeletonCard({ height = 120 }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #f0f4ff 25%, #e8efff 50%, #f0f4ff 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 12,
      height,
      marginBottom: 12,
    }} />
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[20, 30, 25, 25].map((w, i) => (
          <div key={i} style={{ flex: w, height: 14, background: '#e2e8f0', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
          {[25, 20, 20, 35].map((w, j) => (
            <div key={j} style={{ flex: w, height: 12, background: '#f1f5f9', borderRadius: 4 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(2px)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '4px solid #e2e8f0', borderTopColor: '#1B2F6E',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <div style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading...</div>
      </div>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
