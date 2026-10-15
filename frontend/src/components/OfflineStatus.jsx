/**
 * IlmForge — offline status.
 *
 * Replaces PWAUpdatePrompt, whose offline banner was never shown because the
 * component was never added to the app. This one is mounted once in App:
 *
 *   offline        "You're offline": saved pages still open; attendance
 *                  marked now is kept on this device
 *   waiting saves  "2 attendance saves waiting", sent automatically when the
 *                  connection is back (and every minute while any wait)
 *   back online    a short "Back online" and fresh data for open pages
 *
 * It starts in the right state when the app is opened without internet.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { WifiOff, Wifi, UploadCloud, RefreshCw } from 'lucide-react';
import { flush, pending, onQueueChange } from '../utils/offlineQueue';
import useAuthStore from '../store/auth.store';
import { isDesktop, localServer } from '../utils/desktop';

/* What "connected" means: the internet for the online app; the school's
   own IlmForge computer for the desktop edition used across the school
   network. In the desktop app itself the server is on the same computer,
   so it never goes offline. */
const WORDS = localServer
  ? { offline: 'This device is not connected to the school network.', later: 'when it is connected again', back: 'Connected again' }
  : { offline: 'You\'re offline. Pages you opened earlier still show their saved data.', later: 'when you\'re back online', back: 'Back online' };

const pill = (bg) => ({
  position: 'fixed', left: '50%', transform: 'translateX(-50%)',
  bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', zIndex: 9998,
  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
  maxWidth: 'min(640px, calc(100vw - 24px))', padding: '10px 16px', borderRadius: 14,
  background: bg, color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.4,
  boxShadow: '0 10px 28px rgba(0,0,0,.28)', textAlign: 'center',
});

export default function OfflineStatus() {
  const qc = useQueryClient();
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const [online, setOnline] = useState(() => (isDesktop || typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const [justBack, setJustBack] = useState(false);
  const [waiting, setWaiting] = useState(() => pending().length);
  const [sending, setSending] = useState(false);
  const backTimer = useRef(null);

  const send = useCallback(async ({ quiet = false } = {}) => {
    if (!pending().length) return;
    setSending(true);
    try {
      const r = await flush();
      if (r.sent) {
        toast.success(`${r.sent} attendance ${r.sent === 1 ? 'save' : 'saves'} sent to the school's records.`, { id: 'offline-sent' });
        qc.invalidateQueries();
      }
      r.failed.forEach((f) => toast.error(`Could not send ${f.label || 'a saved register'}: ${f.message}`, { duration: 8000 }));
      if (!quiet && !r.sent && !r.failed.length && r.remaining) toast('Still no connection. They will be sent automatically.', { icon: '⏳', id: 'offline-sent' });
    } finally {
      setSending(false);
      setWaiting(pending().length);
    }
  }, [qc]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setJustBack(true);
      clearTimeout(backTimer.current);
      backTimer.current = setTimeout(() => setJustBack(false), 3500);
      qc.invalidateQueries({ refetchType: 'active' }); // offline data may be old
      send({ quiet: true });
    };
    const goOffline = () => { if (isDesktop) return; setOnline(false); setJustBack(false); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const off = onQueueChange((items) => setWaiting(items.length));
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      off();
      clearTimeout(backTimer.current);
    };
  }, [qc, send]);

  // Send anything left from an earlier visit, then keep trying while saves wait.
  useEffect(() => {
    if (!signedIn) return undefined;
    setWaiting(pending().length);
    if (online) send({ quiet: true });
    const t = setInterval(() => { if ((isDesktop || navigator.onLine !== false) && pending().length) send({ quiet: true }); }, 60_000);
    return () => clearInterval(t);
  }, [signedIn, online, send]);

  if (!online) {
    return (
      <div role="status" aria-live="polite" style={pill('#1F2937')}>
        <WifiOff size={16} color="#FCA5A5" aria-hidden="true" />
        <span>
          {WORDS.offline}
          {' '}{waiting > 0
            ? `${waiting} attendance ${waiting === 1 ? 'save is' : 'saves are'} kept on this device and will be sent ${WORDS.later}.`
            : `Attendance you mark now is kept on this device and sent ${WORDS.later}.`}
        </span>
      </div>
    );
  }

  if (signedIn && waiting > 0) {
    return (
      <div role="status" aria-live="polite" style={pill('#B45309')}>
        <UploadCloud size={16} aria-hidden="true" />
        <span>{waiting} attendance {waiting === 1 ? 'save is' : 'saves are'} waiting to be sent.</span>
        <button
          type="button"
          onClick={() => send()}
          disabled={sending}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#92400E', border: 0, borderRadius: 8, padding: '5px 11px', fontWeight: 700, fontSize: 12.5, cursor: sending ? 'wait' : 'pointer' }}
        >
          <RefreshCw size={13} aria-hidden="true" /> {sending ? 'Sending…' : 'Send now'}
        </button>
      </div>
    );
  }

  if (justBack) {
    return (
      <div role="status" aria-live="polite" style={pill('#15803D')}>
        <Wifi size={16} aria-hidden="true" /> {WORDS.back}
      </div>
    );
  }

  return null;
}
