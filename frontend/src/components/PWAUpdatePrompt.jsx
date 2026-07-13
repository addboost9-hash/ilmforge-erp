/**
 * IlmForge — PWA Update Prompt + Offline Indicator
 * Shows banner when new version available
 * Shows offline indicator when no internet
 */
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, Wifi } from 'lucide-react';

export default function PWAUpdatePrompt() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  /* ── Online/Offline detection ── */
  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  setShowOfflineBanner(false); };
    const onOffline = () => { setIsOnline(false); setShowOfflineBanner(true);  };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  /* ── SW Update detection ── */
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] Service worker registered:', r);
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  return (
    <>
      {/* ── New version available ── */}
      {needRefresh && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #1B2F6E, #0073b7)',
          color: 'white', padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={16} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              🆕 IlmForge ka naya version available hai!
            </span>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            style={{ padding: '6px 16px', background: '#f5c518', border: 'none', borderRadius: 8, color: '#1B2F6E', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            Update Karein ↻
          </button>
        </div>
      )}

      {/* ── Offline indicator ── */}
      {showOfflineBanner && (
        <div style={{
          position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9998, background: '#374151', color: 'white',
          padding: '10px 20px', borderRadius: 99,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          fontSize: 13, fontWeight: 600,
          animation: 'fadeIn .3s ease',
        }}>
          <WifiOff size={14} color="#fca5a5" />
          Internet nahi hai — Cached data dikh raha hai
        </div>
      )}

      {/* ── Back online toast ── */}
      {isOnline && !showOfflineBanner && (
        /* Only render if just came back online */
        null
      )}
    </>
  );
}
