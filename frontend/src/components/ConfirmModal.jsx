import { useEffect } from 'react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: '32px 28px 24px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Title */}
        <h2 style={{
          fontSize: 17,
          fontWeight: 700,
          color: '#1E3A5F',
          marginBottom: 10,
          lineHeight: 1.3,
        }}>
          {title}
        </h2>

        {/* Message */}
        {message && (
          <p style={{
            fontSize: 13.5,
            color: '#64748B',
            lineHeight: 1.6,
            marginBottom: 28,
          }}>
            {message}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: '#fff',
              border: '1.5px solid #E2E8F0',
              borderRadius: 8,
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#CBD5E1'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            style={{
              background: danger ? '#DC2626' : '#0D9488',
              border: 'none',
              borderRadius: 8,
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = danger ? '#B91C1C' : '#0F766E';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = danger ? '#DC2626' : '#0D9488';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
