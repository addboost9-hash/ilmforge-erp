/**
 * The visitor kiosk (/kiosk): a tablet at reception where visitors fill the
 * form themselves, in Urdu or English, with big buttons.
 *
 * Set up once by opening the link the admin makes (Visitor Desk → Kiosk
 * tablets): /kiosk#k=<key>. The key stays on this tablet; it is not anyone's
 * login and can only add visits for reception to confirm.
 *
 * A parent sees their own children only with the father's CNIC AND the last
 * 4 digits of the mobile number the school has, by first name and class —
 * never photos, never a search by name. After a minute with nobody using it
 * the form clears itself, so the next visitor never sees the last one's details.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, ChevronLeft, Maximize2, Search } from 'lucide-react';
import { typeCnic, typePhone, cnicDigits, isRealCnic, realPhone, reasonStyle, KIOSK_TEXT, KIOSK_REASONS, KIOSK_COMPLAINTS, KIOSK_RELATIONS } from '../../utils/visitorDesk';
import CameraCapture from '../../components/visitors/CameraCapture';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const KEY = 'ilmforge-kiosk-key';
const IDLE_MS = 60_000;
const NAVY = '#1B2F6E';
const readKey = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const EMPTY = { reason: '', detail: '', childName: '', hasChild: null, fatherCnic: '', last4: '', kids: null, chosen: [], relation: '', name: '', cnic: '', phone: '', address: '', city: '', photoUrl: null, remarks: '' };

export default function VisitorKioskPage() {
  const [key, setKey] = useState(readKey);
  const [lang, setLang] = useState('ur');
  const [me, setMe] = useState(null);
  const [state, setState] = useState('loading'); // loading | nokey | removed | ready | offline
  const [step, setStep] = useState(0); // 0 welcome, 1 reason, 2 child/detail, 3 details, 4 done
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState('');
  const [idleNote, setIdleNote] = useState(false);
  const last = useRef(Date.now());
  const t = KIOSK_TEXT[lang];
  const rtl = lang === 'ur';
  const set = (p) => setF((x) => ({ ...x, ...p }));

  const http = useMemo(() => axios.create({ baseURL: `${API_BASE}/kiosk`, timeout: 20000, headers: { 'Content-Type': 'application/json', 'x-kiosk-token': key } }), [key]);

  // The key from the admin's link: kept on this tablet, taken out of the address.
  useEffect(() => {
    const m = /[#&]k=([A-Za-z0-9_-]{20,})/.exec(window.location.hash);
    if (m) {
      try { localStorage.setItem(KEY, m[1]); } catch { /* private window */ }
      setKey(m[1]);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!key) { setState('nokey'); return; }
    http.get('/me').then((r) => { setMe(r.data.data); setState('ready'); }).catch((e) => {
      if (e.response?.status === 401) { try { localStorage.removeItem(KEY); } catch { /* */ } setState('removed'); } else setState('offline');
    });
  }, [http, key]);

  const reset = useCallback(() => { setF(EMPTY); setStep(0); setErr(''); setTicket(''); setBusy(false); }, []);

  // A minute with nobody using it: clear the form for the next visitor.
  useEffect(() => {
    const touch = () => { last.current = Date.now(); setIdleNote(false); };
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    const timer = setInterval(() => {
      if (step === 0) return;
      const idle = Date.now() - last.current;
      if (step === 4 ? idle > 20_000 : idle > IDLE_MS) reset();
      else if (step !== 4 && idle > IDLE_MS - 10_000) setIdleNote(true);
    }, 1000);
    return () => { window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch); clearInterval(timer); };
  }, [step, reset]);

  const childReason = (me?.childReasons || []).includes(f.reason);
  const needsChild = (me?.needsChild || []).includes(f.reason);
  const hasStep2 = childReason || f.reason === 'complaint' || f.reason === 'admission';

  const findKids = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await http.post('/children', { fatherCnic: f.fatherCnic, last4: f.last4 });
      set({ kids: r.data.data, chosen: [] });
      if (!r.data.data.length) setErr(t.noChildren);
    } catch (e) { setErr(e.response?.data?.message || t.noChildren); }
    setBusy(false);
  };

  const step2Ok = () => {
    if (f.reason === 'complaint' && !f.detail) return false;
    if (childReason && (f.hasChild === true || needsChild)) return f.chosen.length > 0 && !!f.relation;
    if (childReason && !needsChild && f.hasChild === null) return false;
    return true;
  };
  const step3Ok = () => f.name.trim().length >= 2 && isRealCnic(f.cnic) && realPhone(f.phone) && (f.reason !== 'complaint' || f.remarks.trim().length > 0);

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await http.post('/visits', {
        visitor: { name: f.name, cnic: f.cnic, phone: f.phone, address: f.address, city: f.city, photoUrl: f.photoUrl },
        reason: f.reason, detail: f.detail, childName: f.childName, relation: f.relation,
        studentIds: f.chosen, fatherCnic: f.fatherCnic, last4: f.last4, remarks: f.remarks,
      });
      setTicket(r.data.data.ticket);
      setStep(4);
    } catch (e) {
      setErr(e.response?.data?.message || (e.response ? 'Please ask at reception.' : 'No connection. Please ask at reception.'));
    }
    setBusy(false);
  };

  /* ── Screens ── */
  const big = { fontSize: 20, padding: '16px 18px', borderRadius: 16, border: '2px solid #CBD5E1', width: '100%', fontFamily: 'inherit' };
  const btn = (primary, disabled) => ({ fontSize: 20, fontWeight: 700, padding: '16px 28px', borderRadius: 16, border: primary ? 0 : '2px solid #CBD5E1', background: primary ? (disabled ? '#94A3B8' : NAVY) : '#fff', color: primary ? '#fff' : '#334155', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit' });
  const lbl = { display: 'grid', gap: 8, fontSize: 18, fontWeight: 700, color: '#1E293B' };
  const tile = (on, color = NAVY) => ({ fontSize: 19, fontWeight: 700, padding: '20px 16px', borderRadius: 18, border: `3px solid ${on ? color : '#E2E8F0'}`, background: on ? `${color}14` : '#fff', color: on ? color : '#1E293B', cursor: 'pointer', textAlign: rtl ? 'right' : 'left', fontFamily: 'inherit', minHeight: 76 });

  const shell = (children) => (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#EEF2FF,#F8FAFC)', fontFamily: rtl ? "'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Segoe UI',Tahoma,sans-serif" : "'Segoe UI',system-ui,sans-serif", color: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {me?.school?.logoUrl && <img src={me.school.logoUrl} alt="" style={{ width: 46, height: 46, objectFit: 'contain' }} />}
          <strong style={{ fontSize: 22, color: NAVY }} dir="auto">{me?.school?.name || 'IlmForge'}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setLang(rtl ? 'en' : 'ur')} style={{ ...btn(false), fontSize: 17, padding: '10px 18px' }}>{t.lang}</button>
          {step === 0 && document.documentElement.requestFullscreen && <button type="button" aria-label="Full screen" onClick={() => document.documentElement.requestFullscreen().catch(() => {})} style={{ ...btn(false), padding: '10px 14px' }}><Maximize2 size={20} /></button>}
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 900, margin: '0 auto', padding: '24px 20px 40px', display: 'grid', gap: 20, alignContent: 'start' }}>{children}</main>
      {idleNote && <div role="status" style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 12, fontSize: 17 }}>{t.idle}</div>}
    </div>
  );

  if (state === 'loading') return shell(<p style={{ fontSize: 20 }}>…</p>);
  if (state !== 'ready') {
    const msg = {
      nokey: 'This tablet is not set up as a kiosk yet. The admin: Visitor Desk → Kiosk tablets → Add a kiosk tablet, then open its link on this tablet.',
      removed: 'This kiosk was removed. The admin can set it up again from Visitor Desk → Kiosk tablets.',
      offline: 'No connection to the school\'s system. Please ask at reception.',
    }[state];
    return shell(<div style={{ fontSize: 20, lineHeight: 1.6, background: '#fff', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0' }} dir="ltr">{msg}{state === 'offline' && <div><button type="button" style={{ ...btn(true), marginTop: 16 }} onClick={() => window.location.reload()}>Try again</button></div>}</div>);
  }

  const back = (to) => <button type="button" onClick={() => { setErr(''); setStep(to); }} style={{ ...btn(false), display: 'inline-flex', alignItems: 'center', gap: 6 }}><ChevronLeft size={22} style={{ transform: rtl ? 'scaleX(-1)' : 'none' }} /> {t.back}</button>;
  const error = err && <div role="alert" style={{ fontSize: 18, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px' }}>{err}</div>;

  if (step === 0) {
    return shell(
      <button type="button" onClick={() => setStep(1)} style={{ border: 0, borderRadius: 28, background: NAVY, color: '#fff', padding: '70px 24px', cursor: 'pointer', fontFamily: 'inherit', display: 'grid', gap: 14, marginTop: 30 }}>
        <span style={{ fontSize: 46, fontWeight: 800 }}>{t.welcome}</span>
        <span style={{ fontSize: 26 }}>{t.start}</span>
        <span style={{ fontSize: 18, opacity: 0.85 }}>{t.startHint}</span>
      </button>,
    );
  }

  if (step === 1) {
    return shell(
      <>
        <h1 style={{ margin: 0, fontSize: 30 }}>{t.whyCame}</h1>
        <div role="radiogroup" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {(me.reasons || []).map((r) => {
            const st = reasonStyle(r);
            return <button key={r} type="button" role="radio" aria-checked={f.reason === r} style={tile(f.reason === r, st.color)} onClick={() => { set({ ...EMPTY, reason: r }); setStep(['admission', 'complaint', ...(me.childReasons || [])].includes(r) ? 2 : 3); }}>{st.icon} {KIOSK_REASONS[lang][r] || r}</button>;
          })}
        </div>
        <div>{back(0)}</div>
      </>,
    );
  }

  if (step === 2) {
    const askChild = childReason && !needsChild;
    const showFinder = childReason && (needsChild || f.hasChild === true);
    return shell(
      <>
        <h1 style={{ margin: 0, fontSize: 28 }}>{reasonStyle(f.reason).icon} {KIOSK_REASONS[lang][f.reason]}</h1>
        {f.reason === 'complaint' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <span style={lbl}>{t.complaintAbout}</span>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {(me.complaintTypes || []).map((c) => <button key={c} type="button" style={tile(f.detail === c, '#DC2626')} onClick={() => set({ detail: c })}>{KIOSK_COMPLAINTS[lang][c]}</button>)}
            </div>
          </div>
        )}
        {f.reason === 'admission' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={lbl}>{t.admissionChild}<input style={big} value={f.childName} maxLength={80} onChange={(e) => set({ childName: e.target.value })} /></label>
            <label style={lbl}>{t.admissionClass}
              <select style={big} value={f.detail} onChange={(e) => set({ detail: e.target.value })}>
                <option value="">—</option>
                {(me.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        )}
        {askChild && (
          <div style={{ display: 'grid', gap: 10 }}>
            <span style={lbl}>{t.childQ}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" style={{ ...tile(f.hasChild === true), flex: 1 }} onClick={() => set({ hasChild: true })}>{t.yes}</button>
              <button type="button" style={{ ...tile(f.hasChild === false), flex: 1 }} onClick={() => set({ hasChild: false, chosen: [], kids: null })}>{t.no}</button>
            </div>
          </div>
        )}
        {showFinder && (
          <div style={{ display: 'grid', gap: 14, background: '#fff', borderRadius: 18, padding: 18, border: '1px solid #E2E8F0' }}>
            <label style={lbl}>{t.fatherCnic}<input style={big} dir="ltr" inputMode="numeric" value={f.fatherCnic} placeholder="35202-1234567-1" onChange={(e) => set({ fatherCnic: typeCnic(e.target.value), kids: null, chosen: [] })} /></label>
            <label style={lbl}>{t.last4}<input style={{ ...big, maxWidth: 200, letterSpacing: 6 }} dir="ltr" inputMode="numeric" maxLength={4} value={f.last4} onChange={(e) => set({ last4: e.target.value.replace(/\D/g, '').slice(0, 4), kids: null, chosen: [] })} /></label>
            <div><button type="button" disabled={busy || cnicDigits(f.fatherCnic).length !== 13 || f.last4.length !== 4} onClick={findKids} style={{ ...btn(true, busy || cnicDigits(f.fatherCnic).length !== 13 || f.last4.length !== 4), display: 'inline-flex', gap: 8, alignItems: 'center' }}><Search size={20} /> {t.findChildren}</button></div>
            {f.kids?.length > 0 && (
              <>
                <span style={lbl}>{t.chooseChild}</span>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  {f.kids.map((k) => {
                    const on = f.chosen.includes(k.id);
                    return <button key={k.id} type="button" aria-pressed={on} style={tile(on)} onClick={() => set({ chosen: on ? f.chosen.filter((x) => x !== k.id) : [...f.chosen, k.id] })}>{on ? '✓ ' : ''}{k.firstName}<div style={{ fontSize: 15, fontWeight: 500, color: '#475569' }}>{k.className}</div></button>;
                  })}
                </div>
                <label style={lbl}>{t.relation}
                  <select style={big} value={f.relation} onChange={(e) => set({ relation: e.target.value })}>
                    <option value="">—</option>
                    {(me.relations || []).map((r) => <option key={r} value={r}>{KIOSK_RELATIONS[lang][r]}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
        )}
        {error}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          {back(1)}
          <button type="button" disabled={!step2Ok()} onClick={() => { setErr(''); setStep(3); }} style={btn(true, !step2Ok())}>{t.next}</button>
        </div>
      </>,
    );
  }

  if (step === 3) {
    const ok = step3Ok();
    return shell(
      <>
        <h1 style={{ margin: 0, fontSize: 28 }}>{t.yourDetails}</h1>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <label style={lbl}>{t.name}<input style={big} value={f.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} /></label>
          <label style={lbl}>{t.cnic}<input style={big} dir="ltr" inputMode="numeric" value={f.cnic} placeholder="35202-1234567-1" onChange={(e) => set({ cnic: typeCnic(e.target.value) })} /></label>
          <label style={lbl}>{t.phone}<input style={big} dir="ltr" inputMode="tel" value={f.phone} placeholder="0300 1234567" onChange={(e) => set({ phone: typePhone(e.target.value) })} /></label>
          <label style={lbl}>{t.city}<input style={big} value={f.city} maxLength={60} onChange={(e) => set({ city: e.target.value })} /></label>
        </div>
        <label style={lbl}>{t.address}<input style={big} value={f.address} maxLength={200} onChange={(e) => set({ address: e.target.value })} /></label>
        <label style={lbl}>{f.reason === 'complaint' ? t.remarksComplaint : t.remarks}<textarea style={{ ...big, minHeight: 110 }} dir="auto" maxLength={1000} value={f.remarks} onChange={(e) => set({ remarks: e.target.value })} /></label>
        <div style={{ fontSize: 17 }}><CameraCapture label={t.photo} value={f.photoUrl} onChange={(p) => set({ photoUrl: p })} text={rtl ? { take: 'تصویر لیں', choose: 'تصویر چنیں', capture: 'تصویر', cancel: 'رہنے دیں', retake: 'دوبارہ', remove: 'ہٹائیں', optional: 'اختیاری' } : {}} /></div>
        {error}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          {back(hasStep2 ? 2 : 1)}
          <button type="button" disabled={!ok || busy} onClick={submit} style={btn(true, !ok || busy)}>{busy ? '…' : t.submit}</button>
        </div>
      </>,
    );
  }

  return shell(
    <div style={{ textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center', marginTop: 30 }} aria-live="polite">
      <CheckCircle2 size={76} color="#16A34A" />
      <div style={{ fontSize: 34, fontWeight: 800 }}>{t.done}</div>
      <div style={{ fontSize: 22 }}>{t.ticket}</div>
      <div style={{ fontSize: 64, fontWeight: 900, color: NAVY, fontFamily: 'Consolas, monospace', letterSpacing: 3 }} dir="ltr">{ticket}</div>
      <div style={{ fontSize: 22 }}>{t.showAtReception}</div>
      <button type="button" onClick={reset} style={{ ...btn(true), marginTop: 10 }}>{t.newVisitor}</button>
    </div>,
  );
}
