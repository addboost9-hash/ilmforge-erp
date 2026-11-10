/**
 * Attendance Kiosk — students and staff mark attendance by scanning their
 * ID card (barcode or QR) or by pressing a finger on a fingerprint machine.
 *
 *   USB / Bluetooth barcode or QR scanner: it types the card's code and
 *     presses Enter, like a keyboard. The page catches it wherever focus is.
 *   Webcam or phone camera: "Use camera", then hold the card's QR code up.
 *   Fingerprint machine (ZKTeco, Cloud server mode): its punches reach the
 *     server on their own; this screen shows each one as it arrives.
 *
 * Every mark opens a large pop-up with the person's photo and name and says
 * "Thank you, attendance marked" aloud. The same records the register uses
 * are saved (services/attendanceDevice.service on the server):
 *
 *   student → present (late after the school's time); again soon → "already
 *             marked"; again later in the day → left school
 *   staff   → checked in; again later → checked out
 *
 * With no internet (online edition) scans are kept on this computer and
 * sent when it is back; the desktop edition needs no internet at all.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { postOrQueue, isNetworkError } from '../../utils/offlineQueue';
import { Scan, Camera, CameraOff, Volume2, VolumeX, Maximize2, Clock, ClipboardList, Fingerprint, Settings, X, CheckCircle2, AlertTriangle, LogOut, Info } from 'lucide-react';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const timeOf = (d) => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
const pref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const savePref = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };
const POPUP_MS = 4000;

/* ── Sound ───────────────────────────────────────────────────────────────
   Spoken messages (recorded once, shipped with the app, so they work with
   no internet), and short tones for a scan kept offline. Browsers allow
   sound only after the first click or key press on the page. */
const BASE = import.meta.env.BASE_URL || '/';
const VOICE = {
  marked: 'attendance-marked', in: 'checked-in', out: 'checked-out', already: 'already-marked', error: 'not-recognised',
};
const voices = {};
function playVoice(kind, onBlocked) {
  try {
    const name = VOICE[kind];
    if (!name) return;
    voices[name] = voices[name] || new Audio(`${BASE}sounds/${name}.wav`);
    Object.values(voices).forEach((a) => { if (!a.paused) { a.pause(); a.currentTime = 0; } });
    const a = voices[name];
    a.currentTime = 0;
    a.play().catch((e) => { if (e?.name === 'NotAllowedError') onBlocked?.(); });
  } catch { /* no sound on this device */ }
}
/* After the browser's first click: load every message, silently, so the
   next mark can speak at once. */
function unlockVoices() {
  Object.values(VOICE).forEach((name) => {
    try {
      const a = voices[name] || new Audio(`${BASE}sounds/${name}.wav`);
      voices[name] = a;
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
    } catch { /* no sound on this device */ }
  });
}
let audioCtx = null;
function tone(freqs, type = 'sine', each = 0.12) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    let t = audioCtx.currentTime;
    for (const f of freqs) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + each);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + each);
      t += each + 0.03;
    }
  } catch { /* no sound on this device */ }
}
const voiceFor = (e) => {
  if (e.state === 'error') return 'error';
  if (e.already) return 'already';
  if (e.action === 'out') return 'out';
  if (e.kind === 'staff') return 'in';
  return 'marked';
};

/* How each result looks. */
const LOOK = {
  present: { bg: '#DCFCE7', border: '#22C55E', fg: '#166534', label: 'PRESENT', head: 'Thank you, attendance marked' },
  late: { bg: '#FEF3C7', border: '#F59E0B', fg: '#92400E', label: 'LATE', head: 'Thank you, attendance marked' },
  already: { bg: '#E0F2FE', border: '#38BDF8', fg: '#075985', label: 'ALREADY MARKED', head: 'Your attendance is already marked' },
  in: { bg: '#DCFCE7', border: '#22C55E', fg: '#166534', label: 'CHECKED IN', head: 'Thank you, check-in marked' },
  out: { bg: '#EDE9FE', border: '#8B5CF6', fg: '#5B21B6', label: 'CHECKED OUT', head: 'Thank you, goodbye' },
  left: { bg: '#EDE9FE', border: '#8B5CF6', fg: '#5B21B6', label: 'LEFT SCHOOL', head: 'Thank you, goodbye' },
  queued: { bg: '#F1F5F9', border: '#94A3B8', fg: '#334155', label: 'SAVED OFFLINE', head: 'Saved on this computer' },
  error: { bg: '#FEE2E2', border: '#EF4444', fg: '#991B1B', label: 'NOT MARKED', head: 'Sorry, not recognised' },
  pending: { bg: '#F8FAFC', border: '#CBD5E1', fg: '#475569', label: 'SAVING…', head: 'Saving…' },
};
const lookOf = (e) => {
  if (e.state === 'pending') return LOOK.pending;
  if (e.state === 'queued') return LOOK.queued;
  if (e.state === 'error') return LOOK.error;
  if (e.already) return LOOK.already;
  if (e.kind === 'staff') return e.action === 'out' ? LOOK.out : LOOK.in;
  if (e.action === 'out') return LOOK.left;
  return e.status === 'late' ? LOOK.late : LOOK.present;
};
const detailOf = (e) => {
  if (e.state !== 'done') return e.message || '';
  const how = e.method === 'fingerprint' ? ' (fingerprint)' : e.method === 'face' ? ' (face)' : '';
  if (e.already) return `Already marked at ${timeOf(e.markedAt)}. Nothing changed.`;
  if (e.kind === 'staff') return `${e.action === 'out' ? 'Checked out' : 'Checked in'} at ${timeOf(e.markedAt)}${how}`;
  if (e.action === 'out') return `Left school at ${timeOf(e.markedAt)}${how}`;
  return `Marked ${e.status} at ${timeOf(e.markedAt)}${how}`;
};

/* A box someone is typing in (then the keys are theirs, not the scanner's).
   A ticked checkbox or a clicked button does not count. */
const TEXT_INPUTS = new Set(['text', 'search', 'email', 'tel', 'number', 'password', 'time', 'date', 'url']);
const isTyping = (el) => !!el && !el.dataset?.scanInput
  && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable || (el.tagName === 'INPUT' && TEXT_INPUTS.has(el.type)));

export default function BarcodeScanPage() {
  const role = useAuthStore((s) => s.user?.role);
  const school = useAuthStore((s) => s.school);
  const isAdmin = ['admin', 'super_admin', 'principal'].includes(role);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const bufferRef = useRef('');
  const recentRef = useRef(new Map()); // code -> time, to ignore a double read
  const seqRef = useRef(0);
  const popupTimer = useRef(null);

  const [manual, setManual] = useState('');
  const [entries, setEntries] = useState([]); // newest first
  const [presentToday, setPresentToday] = useState(null);
  const [staffIn, setStaffIn] = useState(null);
  const [sound, setSound] = useState(pref('scan_sound', '1') === '1');
  const [showDevice, setShowDevice] = useState(pref('kiosk_device_popups', '1') === '1');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [focused, setFocused] = useState(true);
  const [popup, setPopup] = useState(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [feedOk, setFeedOk] = useState(true);

  const schoolName = school?.name || pref('registeredSchoolName', '');
  const today = localDate();
  const todayLabel = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // The school's rules (late time, check-out gap): the same for every
  // scanner and machine. They used to be set on each computer separately.
  const { data: rules } = useQuery({
    queryKey: ['attendance-device-settings'],
    queryFn: () => api.get('/biometric/settings', { silent: true }).then((r) => r.data.data),
    staleTime: 5 * 60e3,
  });

  const settingsRef = useRef({ sound, showDevice });
  settingsRef.current = { sound, showDevice };

  const refreshCounts = useCallback(() => {
    api.get('/attendance/summary-today', { params: { date: today }, silent: true })
      .then((r) => { setPresentToday(r.data?.data?.present ?? null); setStaffIn(r.data?.data?.staffIn ?? null); })
      .catch(() => {});
  }, [today]);

  /* The pop-up: the newest mark, over everything, for a few seconds. */
  const announce = useCallback((entry) => {
    if (entry.state === 'pending') return;
    setPopup(entry);
    clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopup(null), POPUP_MS);
    if (!settingsRef.current.sound) return;
    if (entry.state === 'queued') tone([660, 880], 'sine', 0.1);
    else playVoice(voiceFor(entry), () => setSoundBlocked(true));
  }, []);
  useEffect(() => () => clearTimeout(popupTimer.current), []);

  /* ── One scan: show it at once, save it in the background ─────────── */
  const submit = useCallback((raw, method = 'barcode') => {
    // eslint-disable-next-line no-control-regex
    const code = String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!code) return;
    const now = Date.now();
    // A scanner can read one card twice in a blink; count it once.
    const last = recentRef.current.get(code.toUpperCase());
    if (last && now - last < 2500) return;
    recentRef.current.set(code.toUpperCase(), now);

    const id = ++seqRef.current;
    setEntries((list) => [{ id, code, state: 'pending', at: now }, ...list].slice(0, 80));
    const update = (patch) => setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

    // scannedAt: the scan's own time, kept if it waits offline.
    postOrQueue('/attendance/barcode-scan', { barcode: code, date: today, method, scannedAt: new Date(now).toISOString() }, { label: `Scan ${code}` })
      .then((res) => {
        if (res?.queued) {
          const e = { id, code, state: 'queued', at: now, message: 'No internet: saved on this computer, sent when back online.' };
          update(e); announce(e);
          return;
        }
        const d = res.data?.data || {};
        const e = {
          id, code, at: now, state: 'done', kind: d.kind, status: d.status, already: !!d.already, action: d.action,
          markedAt: d.markedAt, person: d.person || null, message: res.data?.message, method,
        };
        update(e); announce(e);
        if (typeof d.presentToday === 'number') setPresentToday(d.presentToday);
        if (d.kind === 'staff') refreshCounts();
      })
      .catch((err) => {
        const msg = err.response?.data?.message || (isNetworkError(err) ? 'No connection to the server.' : 'Could not mark this card.');
        const e = { id, code, at: now, state: 'error', message: msg, person: err.response?.data?.data?.person || null };
        update(e); announce(e);
        // A wrong read can be scanned again at once.
        recentRef.current.delete(code.toUpperCase());
      });
  }, [today, announce, refreshCounts]);

  /* ── The scanner types into the page: catch it wherever focus is ─── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTyping(e.target)) return; // a settings box being typed in
      if (e.target?.dataset?.scanInput) return; // the scan box handles itself
      if (e.key === 'Escape') { setPopup(null); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (bufferRef.current) {
          e.preventDefault();
          submit(bufferRef.current);
          bufferRef.current = '';
        }
        return;
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [submit]);

  // Keep the scan box ready: back into it whenever nothing else is in use.
  useEffect(() => {
    const t = setInterval(() => {
      const el = document.activeElement;
      if (!el || el === document.body) inputRef.current?.focus();
    }, 800);
    inputRef.current?.focus();
    return () => clearInterval(t);
  }, []);

  // Today's counts when the page opens, and every minute.
  useEffect(() => {
    refreshCounts();
    const t = setInterval(refreshCounts, 60e3);
    return () => clearInterval(t);
  }, [refreshCounts]);

  /* ── Fingerprint machines: their punches reach the server on their own;
        show each one here as it arrives (checked every 2 seconds). ── */
  useEffect(() => {
    let stopped = false;
    let after = null;
    let timer = null;
    const poll = async () => {
      if (stopped) return;
      if (document.visibilityState === 'visible') {
        try {
          const r = await api.get('/attendance/kiosk/feed', { params: after === null ? {} : { after }, silent: true });
          setFeedOk(true);
          const items = r.data?.data || [];
          if (after !== null && items.length) {
            const fresh = items.map((d) => ({
              id: ++seqRef.current, code: d.person?.devicePin || '', at: Date.now(), state: 'done', kind: d.kind, status: d.status,
              already: !!d.already, action: d.action, markedAt: d.markedAt, person: d.person, message: d.message, method: d.method,
            }));
            setEntries((list) => [...fresh.slice().reverse(), ...list].slice(0, 80));
            if (settingsRef.current.showDevice) announce(fresh[fresh.length - 1]);
            refreshCounts();
          }
          after = r.data?.latestId ?? after ?? 0;
        } catch {
          setFeedOk(false);
        }
      }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [announce, refreshCounts]);

  /* ── Camera: phone or webcam ─────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);
  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 0);
    } catch (err) {
      setCameraError(err.name === 'NotAllowedError' ? 'Camera permission was refused.' : err.name === 'NotFoundError' ? 'No camera found.' : 'The camera could not start.');
    }
  }, []);
  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!cameraOn) return undefined;
    let stopped = false;
    let timer = null;
    let detector = null;
    let jsQR = null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const setup = async () => {
      try {
        if ('BarcodeDetector' in window) {
          const formats = await window.BarcodeDetector.getSupportedFormats();
          const want = ['qr_code', 'code_39', 'code_128'].filter((f) => formats.includes(f));
          if (want.length) detector = new window.BarcodeDetector({ formats: want });
        }
      } catch { detector = null; }
      // jsQR ships with the app: QR codes read with no internet, on Windows too.
      if (!detector) jsQR = (await import('jsqr')).default;
    };
    const tick = async () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        let code = null;
        try {
          if (detector) code = (await detector.detect(v))[0]?.rawValue || null;
          else if (jsQR) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data || null;
          }
        } catch { code = null; }
        if (code) { try { navigator.vibrate?.(50); } catch { /* none */ } submit(code, 'qr'); }
      }
      timer = setTimeout(tick, 200);
    };
    setup().then(tick);
    return () => { stopped = true; clearTimeout(timer); };
  }, [cameraOn, submit]);

  const current = entries.find((e) => e.state !== 'pending') || entries[0] || null;
  const look = current ? lookOf(current) : null;
  const pendingCount = entries.filter((e) => e.state === 'pending').length;
  const sessionCount = entries.filter((e) => e.state === 'done' && !e.already).length;

  const fullScreen = () => { document.documentElement.requestFullscreen?.().catch(() => {}); };
  const testSound = () => { setSoundBlocked(false); playVoice('marked', () => setSoundBlocked(true)); };

  return (
    <div className="page-content fade-in" style={{ maxWidth: 1160, margin: '0 auto' }}
      onClick={() => { if (soundBlocked) { setSoundBlocked(false); unlockVoices(); } if (!isTyping(document.activeElement)) inputRef.current?.focus(); }}>
      {popup && <MarkPopup entry={popup} onClose={() => setPopup(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 260px' }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Scan size={22} color="#0D9488" /> Attendance Kiosk</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>{schoolName ? `${schoolName} · ` : ''}{todayLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat label="Students present" value={presentToday ?? '—'} color="#15803D" />
          <Stat label="Staff checked in" value={staffIn ?? '—'} color="#7C3AED" />
          <Stat label="Marked here" value={sessionCount} color="#1B2F6E" />
          {pendingCount > 0 && <Stat label="Saving" value={pendingCount} color="#B45309" />}
        </div>
      </div>

      {soundBlocked && sound && (
        <div className="alert alert-warning" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Volume2 size={16} /> Click anywhere on this page once to turn on the spoken messages (the browser asks for one click).
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left: scan box and the last result */}
        <div style={{ flex: '2 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <form onSubmit={(e) => { e.preventDefault(); submit(manual); setManual(''); }} style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                data-scan-input="1"
                className="form-input"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Scan an ID card — or type a roll number / employee code and press Enter"
                aria-label="Scanned code"
                autoComplete="off"
                spellCheck={false}
                style={{ flex: 1, fontSize: 16, fontFamily: 'monospace', letterSpacing: 1 }}
              />
              <button type="submit" className="btn btn-teal">Mark</button>
            </form>
            <div style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ color: focused ? '#15803D' : '#64748B', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: focused ? '#22C55E' : '#94A3B8', display: 'inline-block' }} />
                {focused ? 'Scanner ready: scan the next card.' : 'Scanner ready (it still works while you look elsewhere on the page).'}
              </span>
              <span style={{ color: feedOk ? '#15803D' : '#B91C1C', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Fingerprint size={13} /> {feedOk ? 'Fingerprint machines: listening' : 'Fingerprint machines: no connection to the server'}
              </span>
            </div>
          </div>

          <div role="status" aria-live="polite" aria-label="Last scan"
            style={{
              borderRadius: 16, padding: 18, minHeight: 190, transition: 'background .2s',
              background: look ? look.bg : '#F8FAFC', border: `3px solid ${look ? look.border : '#E2E8F0'}`,
              display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap',
            }}>
            {!current ? (
              <div style={{ textAlign: 'center', width: '100%', color: '#64748B' }}>
                <Scan size={44} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: '#334155' }}>Scan an ID card or press a finger on the machine</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Each mark shows here with the person's photo.</div>
              </div>
            ) : (
              <>
                <Photo person={current.person} size={110} />
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 800, letterSpacing: 1, color: '#fff', background: look.border, borderRadius: 999, padding: '4px 12px' }}>
                    {look.label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 8, lineHeight: 1.15, overflowWrap: 'anywhere' }}>
                    {current.person?.name || current.code}
                  </div>
                  {current.person && (
                    <div style={{ fontSize: 15, color: '#334155', marginTop: 4 }}>
                      {[current.person.className, current.person.sectionName].filter(Boolean).join(' — ')}
                      {current.person.rollNo && <span style={{ fontFamily: 'monospace', marginLeft: 8, color: '#64748B' }}>{current.person.rollNo}</span>}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: look.fg, marginTop: 8, fontWeight: 600 }}>{detailOf(current)}</div>
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#334155' }} title="The school's setting, the same on every scanner and machine">
              <Clock size={14} /> Late after: <strong>{rules?.lateAfter || 'not set'}</strong>
              {rules?.staffLateAfter && <> · staff <strong>{rules.staffLateAfter}</strong></>}
            </span>
            <button type="button" className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); const v = !sound; setSound(v); savePref('scan_sound', v ? '1' : '0'); if (v) testSound(); }}>
              {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} {sound ? 'Voice on' : 'Voice off'}
            </button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={showDevice} onChange={(e) => { setShowDevice(e.target.checked); savePref('kiosk_device_popups', e.target.checked ? '1' : '0'); }} />
              <Fingerprint size={14} /> Pop-ups for fingerprint punches
            </label>
            <button type="button" className="btn btn-outline btn-sm" onClick={cameraOn ? stopCamera : startCamera}>
              {cameraOn ? <CameraOff size={14} /> : <Camera size={14} />} {cameraOn ? 'Stop camera' : 'Use camera'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={fullScreen}><Maximize2 size={14} /> Full screen</button>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
              {isAdmin && <Link to="/settings/biometric" className="btn btn-outline btn-sm"><Settings size={14} /> Machines &amp; rules</Link>}
              <Link to="/attendance" className="btn btn-outline btn-sm"><ClipboardList size={14} /> Today's register</Link>
            </span>
          </div>
          {cameraError && <div style={{ fontSize: 13, color: '#B91C1C' }}>{cameraError}</div>}
          {cameraOn && (
            <div className="card" style={{ padding: 8 }}>
              <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 320, borderRadius: 10, background: '#000', objectFit: 'cover' }} />
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Hold the card's QR code in front of the camera.</div>
            </div>
          )}
        </div>

        {/* Right: this session's marks */}
        <div className="card" style={{ flex: '1 1 300px', minWidth: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#1E3A5F', fontSize: 14 }}>
            Marked while this screen is open ({entries.length})
          </div>
          <div style={{ maxHeight: 560, overflowY: 'auto' }} aria-label="Recent marks">
            {entries.length === 0 && <div style={{ padding: 16, color: '#94A3B8', fontSize: 13 }}>Scans and fingerprint punches appear here, newest first.</div>}
            {entries.map((e) => {
              const l = lookOf(e);
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.border, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {e.method === 'fingerprint' && <Fingerprint size={12} color="#7C3AED" />}
                      {e.person?.name || e.code}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      {e.person ? [e.person.className, e.person.sectionName].filter(Boolean).join(' — ') : (e.state === 'error' ? e.message : '')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: l.fg }}>{l.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{timeOf(e.markedAt && !e.already ? e.markedAt : e.at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Photo({ person, size }) {
  const h = Math.round(size * 1.18);
  return (
    <div style={{ width: size, height: h, borderRadius: 14, overflow: 'hidden', background: '#fff', border: '3px solid rgba(255,255,255,.9)', boxShadow: '0 4px 14px rgba(15,23,42,.18)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#94A3B8' }}>
      {person?.photoUrl
        ? <img src={person.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (person?.name || '?').trim().charAt(0).toUpperCase()}
    </div>
  );
}

/* The big pop-up: who, their photo, what was saved, and the thank-you. */
function MarkPopup({ entry, onClose }) {
  const look = lookOf(entry);
  const Icon = entry.state === 'error' ? AlertTriangle : entry.action === 'out' && !entry.already ? LogOut : entry.already || entry.state === 'queued' ? Info : CheckCircle2;
  return (
    <div role="alertdialog" aria-label={look.head} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'ilm-fade-in .15s ease-out' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(620px, 100%)', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.35)', position: 'relative' }}>
        <div style={{ background: look.border, color: '#fff', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={30} />
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, flex: 1 }}>{look.head}</div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 999, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 22, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap', background: look.bg }}>
          <Photo person={entry.person} size={150} />
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', lineHeight: 1.15, overflowWrap: 'anywhere' }}>
              {entry.person?.name || entry.code || 'Unknown card'}
            </div>
            {entry.person && (
              <div style={{ fontSize: 16, color: '#334155', marginTop: 6 }}>
                {[entry.person.className, entry.person.sectionName].filter(Boolean).join(' — ')}
                {entry.person.rollNo && <div style={{ fontFamily: 'monospace', color: '#64748B', marginTop: 2 }}>{entry.person.rollNo}</div>}
              </div>
            )}
            <div style={{ display: 'inline-block', marginTop: 12, fontSize: 14, fontWeight: 800, letterSpacing: 1, color: '#fff', background: look.border, borderRadius: 999, padding: '5px 14px' }}>
              {look.label}
            </div>
            <div style={{ fontSize: 15, color: look.fg, marginTop: 10, fontWeight: 600 }}>{detailOf(entry)}</div>
          </div>
        </div>
        <div style={{ height: 5, background: look.border, transformOrigin: 'left', animation: `ilm-popup-timer ${POPUP_MS}ms linear forwards` }} />
        <style>{'@keyframes ilm-popup-timer { from { transform: scaleX(1) } to { transform: scaleX(0) } }'}</style>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 14px', minWidth: 110 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#64748B' }}>{label}</div>
    </div>
  );
}
