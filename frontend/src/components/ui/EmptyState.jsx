import React from 'react';

const ILLUSTRATIONS = {
  students: '👨‍🎓',
  attendance: '📋',
  fees: '💰',
  exams: '📝',
  staff: '👨‍🏫',
  reports: '📊',
  settings: '⚙️',
  default: '📂',
};

export default function EmptyState({
  type = 'default',
  title = 'Nothing here yet',
  description = 'Get started by adding your first item.',
  action,
  actionLabel,
}) {
  return (
    <div className="ilm-animate" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: 72, marginBottom: 20, lineHeight: 1,
        animation: 'ilm-fade-in 0.5s ease-out',
      }}>
        {ILLUSTRATIONS[type] || ILLUSTRATIONS.default}
      </div>
      <h3 style={{
        fontSize: 18, fontWeight: 700, color: '#1e293b',
        margin: '0 0 8px',
      }}>{title}</h3>
      <p style={{
        fontSize: 14, color: '#64748b', margin: '0 0 24px',
        maxWidth: 360, lineHeight: 1.6,
      }}>{description}</p>
      {action && (
        <button onClick={action} className="ilm-btn ilm-btn-primary" style={{fontSize: 14}}>
          + {actionLabel || 'Get Started'}
        </button>
      )}
    </div>
  );
}
