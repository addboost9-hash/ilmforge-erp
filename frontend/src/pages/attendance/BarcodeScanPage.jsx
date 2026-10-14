/**
 * Scan Attendance — mark attendance by scanning ID cards, the way a shop
 * till scans products.
 *
 * Plug in any USB or Bluetooth barcode/QR scanner (they type the code and
 * press Enter, like a keyboard) and scan the QR code or barcode printed on
 * the IlmForge ID card. Every scan is sent at once and the next card can be
 * scanned straight away: scans are never held up waiting for the last one,
 * and the page catches the scanner's typing even when nothing is selected.
 * A phone or webcam camera can scan too.
 *
 *   student card → present (or late after the time set here)
 *   staff card   → checked in; scanned again later → checked out
 *   second scan  → "already marked at 7:52", nothing saved twice
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { postOrQueue, isNetworkError } from '../../utils/offlineQueue';
import { Scan, Camera, CameraOff, Volume2, VolumeX, Maximize2, Clock, ClipboardList } from 'lucide-react';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const timeOf = (d) => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
const pref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const savePref = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };

/* Short tones: one AudioContext for the whole page (browsers allow only a
   few), started on the first key press or click. */
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
const SOUNDS = {
  ok: () => tone([1046, 1318], 'sine', 0.09),
  already: () => tone([660, 660], 'sine', 0.08),
  out: () => tone([1318, 1046], 'sine', 0.09),
  error: () => tone([220], 'square', 0.35),
};

/* How each result looks. */
const LOOK = {
  present: { bg: '#DCFCE7', border: '#22C55E', fg: '#166534', label: 'PRESENT' },
  late: { bg: '#FEF3C7', border: '#F59E0B', fg: '#92400E', label: 'LATE' },
  already: { bg: '#E0F2FE', border: '#38BDF8', fg: '#075985', label: 'ALREADY MARKED' },
  in: { bg: '#DCFCE7', border: '#22C55E', fg: '#166534', label: 'STAFF CHECKED IN' },
  out: { bg: '#EDE9FE', border: '#8B5CF6', fg: '#5B21B6', label: 'STAFF CHECKED OUT' },
  queued: { bg: '#F1F5F9', border: '#94A3B8', fg: '#334155', label: 'SAVED OFFLINE' },
  error: { bg: '#FEE2E2', border: '#EF4444', fg: '#991B1B', label: 'NOT MARKED' },
  pending: { bg: '#F8FAFC', border: '#CBD5E1', fg: '#475569', label: 'SAVING…' },
};
const lookOf = (e) => {
  if (e.state === 'pending') return LOOK.pending;
  if (e.state === 'queued') return LOOK.queued;
  if (e.state === 'error') return LOOK.error;
  if (e.kind === 'staff') return e.action === 'out' ? LOOK.out : e.already ? LOOK.already : LOOK.in;
  if (e.already) return LOOK.already;
  return e.status === 'late' ? LOOK.late : LOOK.present;
};

/* A box someone is typing in (then the keys are theirs, not the scanner's).
   A ticked checkbox or a clicked button does not count. */
const TEXT_INPUTS = new Set(['text', 'search', 'email', 'tel', 'number', 'password', 'time', 'date', 'url']);
const isTyping = (el) => !!el && !el.dataset?.scanInput
  && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable || (el.tagName === 'INPUT' && TEXT_INPUTS.has(el.type)));

export default function BarcodeScanPage() {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const bufferRef = useRef('');
  const recentRef = useRef(new Map()); // code -> time, to ignore a double read
  const seqRef = useRef(0);

  const [manual, setManual] = useState('');
  const [entries, setEntries] = useState([]); // newest first
  const [presentToday, setPresentToday] = useState(null);
  const [lateOn, setLateOn] = useState(pref('scan_late_on', '0') === '1');
  const [lateAfter, setLateAfter] = useState(pref('scan_late_after', '08:00'));
  const [sound, setSound] = useState(pref('scan_sound', '1') === '1');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [focused, setFocused] = useState(true);

  const schoolName = pref('schoolName', '') || pref('registeredSchoolName', '');
  const today = localDate();
  const todayLabel = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const settingsRef = useRef({ lateOn, lateAfter, sound });
  settingsRef.current = { lateOn, lateAfter, sound };

  /* ── One scan: show it at once, save it in the background ─────────── */
  const submit = useCallback((raw) => {
    const code = String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!code) return;
    const now = Date.now();
    // A scanner can read one card twice in a blink; count it once.
    const last = recentRef.current.get(code.toUpperCase());
    if (last && now - last < 2500) return;
    recentRef.current.set(code.toUpperCase(), now);

    const id = ++seqRef.current;
    setEntries((list) => [{ id, code, state: 'pending', at: now }, ...list].slice(0, 60));
    const { lateOn: lo, lateAfter: la, sound: snd } = settingsRef.current;
    const update = (patch) => setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

    postOrQueue('/attendance/barcode-scan', { barcode: code, date: today, ...(lo && la && { lateAfter: la }) }, { label: `Scan ${code}` })
      .then((res) => {
        if (res?.queued) {
          update({ state: 'queued', message: 'No internet: saved on this computer, sent when back online.' });
          if (snd) SOUNDS.already();
          return;
        }
        const d = res.data?.data || {};
        update({
          state: 'done', kind: d.kind, status: d.status, already: !!d.already, action: d.action,
          markedAt: d.markedAt, person: d.person || null, message: res.data?.message,
        });
        if (typeof d.presentToday === 'number') setPresentToday(d.presentToday);
        if (snd) (d.already ? SOUNDS.already : d.action === 'out' ? SOUNDS.out : SOUNDS.ok)();
      })
      .catch((err) => {
        const msg = err.response?.data?.message || (isNetworkError(err) ? 'No connection to the server.' : 'Could not mark this card.');
        update({ state: 'error', message: msg });
        if (settingsRef.current.sound) SOUNDS.error();
        // A wrong read can be scanned again at once.
        recentRef.current.delete(code.toUpperCase());
      });
  }, [today]);

  /* ── The scanner types into the page: catch it wherever focus is ─── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTyping(e.target)) return; // a settings box being typed in
      if (e.target?.dataset?.scanInput) return; // the scan box handles itself
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

  // Today's count when the page opens.
  useEffect(() => {
    api.get('/attendance/summary-today', { params: { date: today }, silent: true })
      .then((r) => setPresentToday(r.data?.data?.present ?? null))
      .catch(() => {});
  }, [today]);

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
        if (code) { try { navigator.vibrate?.(50); } catch { /* none */ } submit(code); }
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

  return (
    <div className="page-content fade-in" style={{ maxWidth: 1100, margin: '0 auto' }} onClick={() => { if (!isTyping(document.activeElement)) inputRef.current?.focus(); }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 260px' }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Scan size={22} color="#0D9488" /> Scan Attendance</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>{schoolName ? `${schoolName} · ` : ''}{todayLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat label="Present today" value={presentToday ?? '—'} color="#15803D" />
          <Stat label="Scanned here" value={sessionCount} color="#1B2F6E" />
          {pendingCount > 0 && <Stat label="Saving" value={pendingCount} color="#B45309" />}
        </div>
      </div>

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
                placeholder="Scan an ID card — or type a roll number and press Enter"
                aria-label="Scanned code"
                autoComplete="off"
                spellCheck={false}
                style={{ flex: 1, fontSize: 16, fontFamily: 'monospace', letterSpacing: 1 }}
              />
              <button type="submit" className="btn btn-teal">Mark</button>
            </form>
            <div style={{ marginTop: 8, fontSize: 12, color: focused ? '#15803D' : '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: focused ? '#22C55E' : '#94A3B8', display: 'inline-block' }} />
              {focused ? 'Ready: scan the next card.' : 'Ready: the scanner still works while you look at another part of the page.'}
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
                <div style={{ fontSize: 18, fontWeight: 700, color: '#334155' }}>Scan the first ID card</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Hold the card's QR code or barcode under the scanner.</div>
              </div>
            ) : (
              <>
                <div style={{ width: 110, height: 130, borderRadius: 12, overflow: 'hidden', background: '#fff', border: '2px solid rgba(0,0,0,.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, color: '#94A3B8' }}>
                  {current.person?.photoUrl ? <img src={current.person.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (current.person?.name || '?').charAt(0)}
                </div>
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
                  <div style={{ fontSize: 14, color: look.fg, marginTop: 8, fontWeight: 600 }}>
                    {current.state === 'done'
                      ? (current.already
                        ? `Already marked ${current.kind === 'staff' ? 'in' : current.status} at ${timeOf(current.markedAt)}. Nothing changed.`
                        : current.kind === 'staff'
                          ? `${current.action === 'out' ? 'Out' : 'In'} at ${timeOf(current.markedAt)}`
                          : `Marked ${current.status} at ${timeOf(current.markedAt)}`)
                      : current.message || (current.state === 'pending' ? 'Saving…' : '')}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={lateOn} onChange={(e) => { setLateOn(e.target.checked); savePref('scan_late_on', e.target.checked ? '1' : '0'); }} />
              <Clock size={14} /> Mark late after
            </label>
            <input type="time" className="form-input" aria-label="Late after" value={lateAfter} disabled={!lateOn}
              onChange={(e) => { setLateAfter(e.target.value); savePref('scan_late_after', e.target.value); }}
              style={{ width: 120, padding: '4px 8px' }} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { const v = !sound; setSound(v); savePref('scan_sound', v ? '1' : '0'); if (v) SOUNDS.ok(); }}>
              {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} {sound ? 'Sound on' : 'Sound off'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={cameraOn ? stopCamera : startCamera}>
              {cameraOn ? <CameraOff size={14} /> : <Camera size={14} />} {cameraOn ? 'Stop camera' : 'Use camera'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={fullScreen}><Maximize2 size={14} /> Full screen</button>
            <Link to="/attendance" className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}><ClipboardList size={14} /> Today's register</Link>
          </div>
          {cameraError && <div style={{ fontSize: 13, color: '#B91C1C' }}>{cameraError}</div>}
          {cameraOn && (
            <div className="card" style={{ padding: 8 }}>
              <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 320, borderRadius: 10, background: '#000', objectFit: 'cover' }} />
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Hold the card's QR code in front of the camera.</div>
            </div>
          )}
        </div>

        {/* Right: this session's scans */}
        <div className="card" style={{ flex: '1 1 300px', minWidth: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#1E3A5F', fontSize: 14 }}>
            Scanned on this computer ({entries.length})
          </div>
          <div style={{ maxHeight: 560, overflowY: 'auto' }} aria-label="Recent scans">
            {entries.length === 0 && <div style={{ padding: 16, color: '#94A3B8', fontSize: 13 }}>Scans appear here, newest first.</div>}
            {entries.map((e) => {
              const l = lookOf(e);
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.border, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.person?.name || e.code}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      {e.person ? [e.person.className, e.person.sectionName].filter(Boolean).join(' — ') : (e.state === 'error' ? e.message : '')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: l.fg }}>{l.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{timeOf(e.at)}</div>
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

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 14px', minWidth: 110 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#64748B' }}>{label}</div>
    </div>
  );
}
