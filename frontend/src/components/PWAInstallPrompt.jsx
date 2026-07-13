/**
 * IlmForge — PWA Install Prompt
 * Shows "Install App" banner when browser triggers beforeinstallprompt
 * Works on: Chrome Android/Desktop, Edge, Samsung Browser
 * iOS: Shows manual instructions (Safari → Share → Add to Home Screen)
 */
import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Wifi, Bell, Zap } from 'lucide-react';

const isIOS = () =>
  /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()) &&
  !window.MSStream;

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [showIOSGuide, setShowIOSGuide]     = useState(false);
  const [dismissed, setDismissed]           = useState(() =>
    localStorage.getItem('pwa_dismissed') === 'true'
  );

  useEffect(() => {
    // Already installed — don't show
    if (isInStandaloneMode() || dismissed) return;

    // iOS — show manual instructions
    if (isIOS()) {
      const lastShown = localStorage.getItem('pwa_ios_shown');
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (!lastShown || parseInt(lastShown) < dayAgo) {
        setTimeout(() => setShowIOSGuide(true), 3000);
      }
      return;
    }

    // Chrome/Edge — listen for install event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    setDismissed(true);
    localStorage.setItem('pwa_dismissed', 'true');
    localStorage.setItem('pwa_ios_shown', String(Date.now()));
  };

  /* ── Android / Desktop install banner ── */
  if (showBanner && deferredPrompt) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
        background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 100%)',
        color: 'white', padding: '16px 20px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        animation: 'slideUp .3s ease',
      }}>
        {/* Icon */}
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
          🎓
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>IlmForge App Install Karein!</div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
            Home screen pe add karein — offline bhi kaam karega · No app store needed
          </div>
          {/* Features */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {[
              { icon: '⚡', text: 'Fast' },
              { icon: '📴', text: 'Offline' },
              { icon: '🔔', text: 'Notifications' },
              { icon: '📱', text: 'Native Feel' },
            ].map(f => (
              <span key={f.text} style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                {f.icon} {f.text}
              </span>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={handleInstall}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: '#f5c518', border: 'none', borderRadius: 10, color: '#1B2F6E', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <Download size={16} /> Install App
          </button>
          <button onClick={handleDismiss}
            style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  /* ── iOS manual install guide ── */
  if (showIOSGuide) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
        background: '#1B2F6E', color: 'white',
        padding: '20px', borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        animation: 'slideUp .3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>📱 iPhone pe Install Karein</div>
          <button onClick={handleDismiss} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { step: 1, icon: '1️⃣', text: 'Safari browser mein IlmForge khola raho' },
            { step: 2, icon: '2️⃣', text: 'Neeche Share button dabao (□ with arrow ↑)' },
            { step: 3, icon: '3️⃣', text: '"Add to Home Screen" select karo' },
            { step: 4, icon: '4️⃣', text: '"Add" button dabao — done! 🎉' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 10 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontSize: 13.5 }}>{s.text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, textAlign: 'center' }}>
          IlmForge home screen pe app ki tarah kaam karega — offline bhi ✅
        </div>
      </div>
    );
  }

  return null;
}
