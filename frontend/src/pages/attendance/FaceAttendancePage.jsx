/**
 * Face attendance (Attendance Hub → Face Attendance; the gate: Gatekeeper
 * portal → Face Attendance).
 *
 * A phone or tablet on a stand at the gate or a classroom door, with this
 * page open: the camera recognises faces on the device itself (see
 * utils/faceEngine.js) and marks attendance through the same path as a
 * fingerprint machine, in the same register.
 *
 *   Auto     marks as soon as a face is surely recognised (two frames in a
 *            row, clearly nearer than anyone else). For a gate someone watches.
 *   Confirm  shows the name and photo; the person on duty taps ✓ (or ✗).
 *
 * Teach faces (admin): learn every student's and staff member's face from the
 * photo on their record, and add photos from the camera for faces that are
 * not recognised well. Face data can be deleted for anyone.
 *
 * When there is no internet, a mark is kept on the phone and sent later (the
 * attendance offline queue), with the time it was made.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ScanFace, Camera, CheckCircle2, X, Play, Square, Maximize2, RefreshCw, Brain, Trash2, AlertTriangle, Users, SwitchCamera, ArrowLeft,
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { postOrQueue } from '../../utils/offlineQueue';
import { loadFaceEngine, readFace, faceCrop, toB64, makeMatcher, decide, matchWord, STRICTNESS, beep } from '../../utils/faceEngine';

const VIOLET = '#6D28D9';
const SETTINGS_KEY = 'ilm.face.kiosk';
const readSettings = () => { try { return { mode: 'confirm', who: 'all', level: 'normal', cls: '', facing: 'user', ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { mode: 'confirm', who: 'all', level: 'normal', cls: '', facing: 'user' }; } };
const pkTime = (d) => new Date(d).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });
const COOLDOWN_MS = 60_000; // the same person again within a minute: not marked again
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };
const photos = new Map(); // `${kind}:${id}` -> photo (fetched once)

async function photoOf(p) {
  const k = `${p.kind}:${p.id}`;
  if (!photos.has(k)) {
    photos.set(k, api.get(`/face/photo/${p.kind}/${p.id}`, { silent: true }).then((r) => r.data.data.photoUrl || '').catch(() => ''));
  }
  return photos.get(k);
}

/* ═══ The kiosk ════════════════════════════════════════════════════════ */

function Seg({ value, options, onChange, ariaLabel }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 10, overflow: 'hidden' }}>
      {options.map(([k, t]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          style={{ padding: '7px 12px', fontSize: 13, fontWeight: 700, border: 0, cursor: 'pointer', background: value === k ? VIOLET : '#fff', color: value === k ? '#fff' : '#334155' }}>{t}</button>
      ))}
    </div>
  );
}

function FaceKiosk() {
  const [s, setS] = useState(readSettings);
  const set = (patch) => setS((x) => { const n = { ...x, ...patch }; try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(n)); } catch { /* */ } return n; });
  const [phase, setPhase] = useState('idle'); // idle | loading | running | error
  const [note, setNote] = useState('');
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState(''); // what the camera sees now
  const [pending, setPending] = useState(null); // confirm: { person, dist, photo }
  const [result, setResult] = useState(null); // the last mark
  const [recent, setRecent] = useState([]);
  const [backend, setBackend] = useState('');
  const [find, setFind] = useState('');
  const videoRef = useRef(null);
  const boxRef = useRef(null);
  const streamRef = useRef(null);
  const runRef = useRef(false);
  const busyRef = useRef(false);
  const pausedRef = useRef(false);
  const streakRef = useRef({ key: '', n: 0 });
  const coolRef = useRef(new Map());
  const wakeRef = useRef(null);
  const sRef = useRef(s);
  sRef.current = s;

  // The people this kiosk matches: who (students/staff) and the class chosen.
  const shown = useMemo(() => people.filter((p) => (s.who === 'all' || p.kind === s.who) && (!s.cls || (p.kind === 'student' && p.label.split(' — ')[0] === s.cls))), [people, s.who, s.cls]);
  const matcherRef = useRef(null);
  useEffect(() => { matcherRef.current = makeMatcher(shown); }, [shown]);
  const classes = useMemo(() => [...new Set(people.filter((p) => p.kind === 'student').map((p) => p.label.split(' — ')[0]).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [people]);

  const draw = (box, color) => {
    const c = boxRef.current;
    const v = videoRef.current;
    if (!c || !v) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    if (!box) return;
    x.strokeStyle = color; x.lineWidth = Math.max(3, c.width / 160);
    x.strokeRect(box.x, box.y, box.width, box.height);
  };

  const mark = useCallback(async (person, dist, how) => {
    const key = `${person.kind}:${person.id}`;
    coolRef.current.set(key, Date.now());
    const at = new Date().toISOString();
    try {
      const r = await postOrQueue('/face/recognize-mark', { personId: person.id, personType: person.kind, at, distance: Number(dist?.toFixed?.(3) || 0), mode: how });
      const d = r.data?.data || {};
      const res = r.queued
        ? { ok: true, person, title: person.name, line: `Saved on this phone at ${pkTime(at)}: sent when the internet is back.`, tone: '#B45309' }
        : {
          ok: true, person, title: person.name,
          line: d.already ? `Already marked ${d.status || ''} at ${pkTime(d.markedAt)}` : d.action === 'out' ? `Left at ${pkTime(at)}` : `${d.status === 'late' ? 'Late' : 'Present'} · ${pkTime(at)}`,
          tone: d.already ? '#2563EB' : d.status === 'late' ? '#B45309' : '#15803D',
        };
      res.photo = await photoOf(person);
      setResult(res);
      setRecent((list) => [{ key: `${key}-${at}`, name: person.name, label: person.label, time: pkTime(at), line: res.line, tone: res.tone }, ...list].slice(0, 12));
      beep(true);
    } catch (e) {
      setResult({ ok: false, person, title: person.name, line: e.response?.data?.message || 'Could not mark.', tone: '#B91C1C', photo: await photoOf(person) });
      beep(false);
    }
  }, []);

  const tick = useCallback(async () => {
    if (!runRef.current) return;
    const v = videoRef.current;
    const st = sRef.current;
    if (!busyRef.current && !pausedRef.current && !document.hidden && v && v.readyState >= 2 && matcherRef.current) {
      busyRef.current = true;
      try {
        const face = await readFace(v);
        if (!runRef.current) return;
        if (!face) { draw(null); setStatus('Look at the camera'); streakRef.current = { key: '', n: 0 }; }
        else {
          const m = matcherRef.current(face.descriptor);
          const dec = decide(m, { mode: st.mode, level: st.level });
          const key = dec.person ? `${dec.person.kind}:${dec.person.id}` : '';
          const cooling = key && Date.now() - (coolRef.current.get(key) || 0) < COOLDOWN_MS;
          draw(face.box, dec.kind === 'match' ? '#22C55E' : dec.kind === 'unsure' ? '#F59E0B' : '#EF4444');
          if (dec.kind === 'match' && cooling) {
            setStatus(`${dec.person.name}: just marked`);
          } else if (dec.kind === 'match' && st.mode === 'auto') {
            const sk = streakRef.current.key === key ? streakRef.current.n + 1 : 1;
            streakRef.current = { key, n: sk };
            setStatus(`${dec.person.name}…`);
            if (sk >= 2) { streakRef.current = { key: '', n: 0 }; await mark(dec.person, dec.dist, 'auto'); }
          } else if (dec.kind === 'match') {
            pausedRef.current = true;
            setPending({ person: dec.person, dist: dec.dist, photo: await photoOf(dec.person) });
            setStatus('');
          } else if (dec.kind === 'unsure') {
            setStatus(`Not sure (${dec.person.name}?). Come closer, or find by name.`);
          } else {
            setStatus('Not recognised. Find by name below.');
          }
        }
      } catch {
        setStatus('');
      } finally {
        busyRef.current = false;
      }
    }
    setTimeout(tick, sRef.current.mode === 'auto' ? 200 : 300);
  }, [mark]);

  const stop = useCallback(() => {
    runRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    wakeRef.current?.release?.().catch?.(() => {});
    wakeRef.current = null;
    setPhase('idle'); setPending(null); setStatus('');
  }, []);
  useEffect(() => stop, [stop]);

  const start = async () => {
    setPhase('loading'); setNote('Loading face recognition (about 7 MB the first time, then kept on this device)…');
    try {
      const f = await loadFaceEngine();
      setBackend(f.tf.getBackend());
      setNote('Loading the faces of the school…');
      const r = await api.get('/face/people');
      setPeople(r.data.data);
      if (!r.data.data.length) { setPhase('error'); setNote('No face has been taught yet. The admin: Face Attendance → Teach faces.'); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: sRef.current.facing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      setPhase('running');
      requestAnimationFrame(async () => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});
        runRef.current = true;
        pausedRef.current = false;
        tick();
      });
      try { wakeRef.current = await navigator.wakeLock?.request('screen'); } catch { /* screen may sleep */ }
      beep(true);
    } catch (e) {
      setPhase('error');
      setNote(e?.name === 'NotAllowedError' ? 'The camera was not allowed. Allow it in the browser, then Start again.' : (e.response?.data?.message || e.message || 'Could not start.'));
    }
  };

  const restartCamera = async (facing) => {
    set({ facing });
    if (phase !== 'running') return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    } catch { toast.error('That camera could not be opened.'); }
  };

  const answer = async (yes) => {
    const p = pending;
    setPending(null);
    if (yes && p) await mark(p.person, p.dist, 'confirm');
    else if (p) coolRef.current.set(`${p.person.kind}:${p.person.id}`, Date.now() - COOLDOWN_MS + 8000); // ask again in 8 s
    pausedRef.current = false;
  };

  // Not recognised: find among the people the system knows.
  const q = find.trim().toLowerCase();
  const hits = q.length < 2 ? [] : shown.filter((p) => p.name.toLowerCase().includes(q) || String(p.code).toLowerCase() === q).slice(0, 8);

  const fullScreen = () => document.documentElement.requestFullscreen?.().catch(() => {});

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={label}>Mode
            <Seg ariaLabel="Mode" value={s.mode} onChange={(mode) => { set({ mode }); setPending(null); pausedRef.current = false; }} options={[['auto', 'Auto'], ['confirm', 'Confirm']]} />
          </div>
          <div style={label}>Who
            <Seg ariaLabel="Who" value={s.who} onChange={(who) => set({ who, cls: who === 'staff' ? '' : s.cls })} options={[['all', 'Everyone'], ['student', 'Students'], ['staff', 'Staff']]} />
          </div>
          {s.who !== 'staff' && classes.length > 0 && (
            <label style={label}>Class
              <select className="form-select" value={s.cls} onChange={(e) => set({ cls: e.target.value })} style={{ minWidth: 140 }}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          <label style={label}>Strictness
            <select className="form-select" value={s.level} onChange={(e) => set({ level: e.target.value })}>
              {Object.entries(STRICTNESS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {phase === 'running'
              ? <button type="button" className="btn btn-outline" onClick={stop}><Square size={15} /> Stop</button>
              : <button type="button" className="btn btn-primary" onClick={start} disabled={phase === 'loading'} style={{ background: VIOLET, borderColor: VIOLET }}><Play size={15} /> {phase === 'loading' ? 'Starting…' : 'Start'}</button>}
            <button type="button" className="btn btn-outline" onClick={() => restartCamera(s.facing === 'user' ? 'environment' : 'user')} aria-label="Switch camera"><SwitchCamera size={15} /></button>
            <button type="button" className="btn btn-outline" onClick={fullScreen} aria-label="Full screen"><Maximize2 size={15} /></button>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: '#64748B' }}>
          {s.mode === 'auto'
            ? <><strong style={{ color: VIOLET }}>Auto:</strong> marks as soon as a face is surely recognised. Keep it where someone on duty can see it: a photo held up to the camera could be taken for the person.</>
            : <><strong style={{ color: VIOLET }}>Confirm:</strong> shows the name and photo; the person on duty taps ✓ to mark (✗ if it is someone else).</>}
          {' '}The same person within a minute is not marked again.
        </div>
      </div>

      {(phase === 'loading' || phase === 'error') && (
        <div role={phase === 'error' ? 'alert' : 'status'} style={{ background: phase === 'error' ? '#FEF2F2' : '#F5F3FF', border: `1px solid ${phase === 'error' ? '#FECACA' : '#DDD6FE'}`, borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: phase === 'error' ? '#B91C1C' : '#5B21B6' }}>{note}</div>
      )}

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ position: 'relative', background: '#0F172A', borderRadius: 16, overflow: 'hidden', minHeight: 220, display: 'grid', placeItems: 'center' }}>
            {phase === 'running' ? (
              <>
                <video ref={videoRef} playsInline muted style={{ width: '100%', height: 'auto', display: 'block', transform: s.facing === 'user' ? 'scaleX(-1)' : 'none' }} />
                <canvas ref={boxRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: s.facing === 'user' ? 'scaleX(-1)' : 'none', pointerEvents: 'none' }} />
              </>
            ) : (
              <div style={{ color: '#94A3B8', textAlign: 'center', padding: 30, fontSize: 13.5 }}><ScanFace size={44} style={{ opacity: 0.5 }} /><div>Press Start. Put the phone on a stand at face height, facing the line.</div></div>
            )}
          </div>
          {phase === 'running' && (
            <div style={{ fontSize: 13, color: '#334155', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span aria-live="polite">{status}</span>
              <span style={{ color: '#94A3B8' }}>{shown.length} face{shown.length === 1 ? '' : 's'} known{backend === 'cpu' ? ' · slow on this device (no graphics chip)' : ''}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {pending && (
            <div role="dialog" aria-label="Is this the person?" style={{ background: '#fff', border: `2px solid ${VIOLET}`, borderRadius: 16, padding: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {pending.photo ? <img src={pending.photo} alt="" style={{ width: 86, height: 104, objectFit: 'cover', borderRadius: 10 }} /> : <div style={{ width: 86, height: 104, borderRadius: 10, background: '#F1F5F9', display: 'grid', placeItems: 'center' }}><Users size={28} color="#94A3B8" /></div>}
                <div style={{ display: 'grid', gap: 3 }}>
                  <strong style={{ fontSize: 20 }} dir="auto">{pending.person.name}</strong>
                  <span style={{ fontSize: 14, color: '#475569' }}>{pending.person.label}{pending.person.code ? ` · ${pending.person.code}` : ''}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: VIOLET }}>{matchWord(pending.dist)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => answer(true)} autoFocus style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 18, fontWeight: 800, padding: '14px 10px', borderRadius: 12, border: 0, background: '#16A34A', color: '#fff', cursor: 'pointer' }}><CheckCircle2 size={20} /> Yes, mark</button>
                <button type="button" onClick={() => answer(false)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 16, fontWeight: 700, padding: '14px 10px', borderRadius: 12, border: '2px solid #CBD5E1', background: '#fff', color: '#334155', cursor: 'pointer' }}><X size={18} /> Not this person</button>
              </div>
            </div>
          )}
          {result && !pending && (
            <div aria-live="polite" style={{ background: '#fff', border: `2px solid ${result.tone}`, borderRadius: 16, padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
              {result.photo ? <img src={result.photo} alt="" style={{ width: 76, height: 92, objectFit: 'cover', borderRadius: 10 }} /> : <div style={{ width: 76, height: 92, borderRadius: 10, background: '#F1F5F9' }} />}
              <div style={{ display: 'grid', gap: 3 }}>
                <strong style={{ fontSize: 19 }} dir="auto">{result.ok ? '✓ ' : '✗ '}{result.title}</strong>
                <span style={{ fontSize: 13.5, color: '#475569' }}>{result.person.label}</span>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: result.tone }}>{result.line}</span>
              </div>
            </div>
          )}
          {phase === 'running' && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 12, display: 'grid', gap: 8 }}>
              <label style={label}>Not recognised? Find by name or roll no.
                <input className="form-input" value={find} onChange={(e) => setFind(e.target.value)} placeholder="e.g. Ali" />
              </label>
              {hits.map((p) => (
                <button key={`${p.kind}-${p.id}`} type="button" className="btn btn-outline btn-sm" style={{ justifyContent: 'space-between' }} onClick={() => { setFind(''); mark(p, 0, 'tap'); }}>
                  <span>{p.name} <span style={{ color: '#64748B', fontWeight: 400 }}>· {p.label}</span></span><span>Mark</span>
                </button>
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 12 }}>
              <strong style={{ fontSize: 13 }}>Marked on this device</strong>
              <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: 4 }}>
                {recent.map((r) => <li key={r.key} style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span><b>{r.name}</b> <span style={{ color: '#64748B' }}>{r.label}</span></span><span style={{ color: r.tone, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.time}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Teach faces (admin) ═════════════════════════════════════════════ */

const loadImage = (src) => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('unreadable')); i.src = src; });

function FaceLearn() {
  const qc = useQueryClient();
  const { data: sum, refetch } = useQuery({ queryKey: ['face-summary'], queryFn: () => api.get('/face/summary').then((r) => r.data.data) });
  const [who, setWho] = useState('student');
  const [redo, setRedo] = useState(false);
  const [run, setRun] = useState(null); // { done, learnt, failed: [] , running }
  const stopRef = useRef(false);

  const learnAll = async () => {
    stopRef.current = false;
    const failed = [];
    let done = 0;
    let learnt = 0;
    setRun({ done, learnt, failed, running: true, note: 'Loading face recognition…' });
    try { await loadFaceEngine(); } catch { setRun({ done, learnt, failed, running: false, note: 'Face recognition could not be loaded. Check the internet and try again.' }); return; }
    for (const kind of who === 'all' ? ['student', 'staff'] : [who]) {
      let after = 0;
      while (after !== null && !stopRef.current) {
        const r = await api.get('/face/learn-batch', { params: { kind, after, redo: redo ? 1 : 0 } });
        const items = r.data.data;
        after = r.data.next;
        const out = [];
        for (const it of items) {
          if (stopRef.current) break;
          try {
            const img = await loadImage(it.photoUrl);
            const f = await readFace(img, { photo: true });
            if (f) out.push({ kind: it.kind, id: it.id, descriptor: toB64(f.descriptor), source: 'photo', crop: faceCrop(img, f.box) });
            else failed.push({ ...it, why: 'No face found in the photo' });
          } catch { failed.push({ ...it, why: 'The photo could not be read' }); }
          done += 1;
          setRun({ done, learnt, failed: [...failed], running: true, note: `${kind === 'staff' ? 'Staff' : 'Students'}: ${it.name}` });
          await new Promise((res) => setTimeout(res, 0));
        }
        if (out.length) {
          const s = await api.post('/face/learn', { items: out });
          learnt += s.data.data.saved;
        }
        if (!items.length) break;
      }
    }
    setRun({ done, learnt, failed, running: false, note: stopRef.current ? 'Stopped.' : 'Done.' });
    refetch();
    qc.invalidateQueries({ queryKey: ['face-summary'] });
  };

  const stat = (known, withPhoto, total, t) => (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, minWidth: 180 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: VIOLET }}>{known ?? '…'}<span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}> / {total ?? '…'}</span></div>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t} the system knows</div>
      <div style={{ fontSize: 11.5, color: '#64748B' }}>{withPhoto ?? '…'} have a photo on their record</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {stat(sum?.studentsKnown, sum?.studentsWithPhoto, sum?.students, 'Students')}
        {stat(sum?.staffKnown, sum?.staffWithPhoto, sum?.staff, 'Staff')}
      </div>

      <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'grid', gap: 10 }}>
        <strong style={{ fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 6 }}><Brain size={17} color={VIOLET} /> Learn faces from the photos on the records</strong>
        <span style={{ fontSize: 12.5, color: '#64748B', maxWidth: 720 }}>Each person's photo (Student Registry, Staff) is read on this computer and only its 128 face numbers are saved. Clear, front-facing photos work best. Run it again after changing photos.</span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Seg ariaLabel="Whose faces" value={who} onChange={setWho} options={[['student', 'Students'], ['staff', 'Staff'], ['all', 'Both']]} />
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={redo} onChange={(e) => setRedo(e.target.checked)} /> Again for everyone (after changing photos)</label>
          {run?.running
            ? <button type="button" className="btn btn-outline" onClick={() => { stopRef.current = true; }}><Square size={14} /> Stop</button>
            : <button type="button" className="btn btn-primary" style={{ background: VIOLET, borderColor: VIOLET }} onClick={learnAll}><Brain size={15} /> Learn faces</button>}
        </div>
        {run && (
          <div role="status" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 13.5 }}><strong>{run.learnt}</strong> learnt · {run.done} photos read · {run.failed.length} without a face{run.note ? ` · ${run.note}` : ''}</div>
            {run.failed.length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 10, display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> No face found in these photos: change the photo, or take one with the camera below.</span>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, maxHeight: 220, overflowY: 'auto' }}>
                  {run.failed.map((f) => <li key={`${f.kind}-${f.id}`}>{f.name} <span style={{ color: '#64748B' }}>({f.label})</span> — {f.why}{f.kind === 'student' && <> · <Link to={`/students/${f.id}`} target="_blank" rel="noreferrer">open</Link></>}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <CameraTeach onSaved={() => refetch()} />
    </div>
  );
}

/* A face from the camera, for someone not recognised well (or with no photo). */
function CameraTeach({ onSaved }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [person, setPerson] = useState(null);
  const [live, setLive] = useState(false);
  const [shot, setShot] = useState(null); // { descriptor, crop }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setHits([]); return; }
      const [st, sf] = await Promise.all([
        api.get('/students', { params: { search: q, limit: 6, status: 'active' }, silent: true }).then((r) => r.data.data || []).catch(() => []),
        api.get('/staff', { params: { search: q, limit: 4 }, silent: true }).then((r) => r.data.data || []).catch(() => []),
      ]);
      setHits([
        ...st.map((s) => ({ kind: 'student', id: s.id, name: [s.name, s.lastName].filter(Boolean).join(' '), label: [s.class?.name, s.section?.name].filter(Boolean).join(' — ') || s.className || '' })),
        ...sf.map((s) => ({ kind: 'staff', id: s.id, name: s.name, label: s.designation || 'Staff' })),
      ]);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const stopCam = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setLive(false); };
  useEffect(() => stopCam, []);
  const startCam = async () => {
    setMsg('');
    try {
      await loadFaceEngine();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      setLive(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } });
    } catch { setMsg('The camera could not be opened.'); }
  };
  const capture = async () => {
    setBusy(true); setMsg('');
    try {
      const f = await readFace(videoRef.current);
      if (!f) setMsg('No face in view. Look straight at the camera, in good light.');
      else setShot({ descriptor: toB64(f.descriptor), crop: faceCrop(videoRef.current, f.box) });
    } catch { setMsg('Could not read the face.'); }
    setBusy(false);
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/face/learn', { items: [{ kind: person.kind, id: person.id, descriptor: shot.descriptor, source: 'camera', crop: shot.crop }] });
      toast.success(`${person.name}: face saved. Take one or two more for a surer match.`);
      setShot(null); onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };
  const forget = async () => {
    try {
      const r = await api.delete(`/face/enrollments/${person.kind}/${person.id}`);
      toast.success(r.data.message); onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not delete.'); }
  };

  return (
    <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'grid', gap: 10 }}>
      <strong style={{ fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={17} color={VIOLET} /> Add a face with the camera</strong>
      <span style={{ fontSize: 12.5, color: '#64748B' }}>For someone not recognised well, or with no photo: 2–3 photos, looking at the camera, in the light of the place where the kiosk stands.</span>
      {!person ? (
        <>
          <label style={{ ...label, maxWidth: 420 }}>Student or staff member
            <input className="form-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or roll no." />
          </label>
          <div style={{ display: 'grid', gap: 6, maxWidth: 520 }}>
            {hits.map((h) => (
              <button key={`${h.kind}-${h.id}`} type="button" className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { setPerson(h); setQ(''); setHits([]); }}>
                {h.name} <span style={{ color: '#64748B', fontWeight: 400 }}>· {h.kind === 'staff' ? 'Staff, ' : ''}{h.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{person.name}</strong> <span style={{ color: '#64748B', fontSize: 13 }}>{person.label}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setPerson(null); setShot(null); stopCam(); }}>Choose someone else</button>
            <button type="button" className="btn btn-outline btn-sm" style={{ color: '#B91C1C', borderColor: '#FCA5A5' }} onClick={forget}><Trash2 size={13} /> Delete their face data</button>
          </div>
          {!live ? <div><button type="button" className="btn btn-primary" style={{ background: VIOLET, borderColor: VIOLET }} onClick={startCam}><Camera size={15} /> Open the camera</button></div> : (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <video ref={videoRef} playsInline muted style={{ width: 320, maxWidth: '100%', borderRadius: 12, background: '#0F172A', transform: 'scaleX(-1)' }} />
              <div style={{ display: 'grid', gap: 8 }}>
                {shot && <img src={shot.crop} alt="Face taken" style={{ width: 120, height: 120, borderRadius: 10 }} />}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-outline" disabled={busy} onClick={capture}><Camera size={14} /> {shot ? 'Take again' : 'Take photo'}</button>
                  {shot && <button type="button" className="btn btn-primary" disabled={busy} onClick={save} style={{ background: VIOLET, borderColor: VIOLET }}><CheckCircle2 size={14} /> Save</button>}
                  <button type="button" className="btn btn-outline" onClick={stopCam}>Close the camera</button>
                </div>
                {msg && <span role="alert" style={{ fontSize: 12.5, color: '#B91C1C' }}>{msg}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ═══ The page ═════════════════════════════════════════════════════════ */

export default function FaceAttendancePage({ standalone = false }) {
  const role = useAuthStore((st) => st.user?.role);
  const isAdmin = ['admin', 'super_admin'].includes(role);
  const [tab, setTab] = useState('kiosk');
  const body = (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {standalone && <Link to="/gatekeeper-portal" className="btn btn-outline btn-sm btn-icon" aria-label="Back to the gate"><ArrowLeft size={15} /></Link>}
        <ScanFace size={22} color={VIOLET} />
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Face Attendance</h2>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>A phone or tablet on a stand recognises faces and marks attendance, in the same register as the fingerprint machine.</div>
        </div>
        {isAdmin && (
          <div style={{ marginLeft: 'auto' }}>
            <Seg ariaLabel="Face attendance" value={tab} onChange={setTab} options={[['kiosk', 'Kiosk'], ['learn', 'Teach faces']]} />
          </div>
        )}
      </div>
      {tab === 'learn' && isAdmin ? <FaceLearn /> : <FaceKiosk />}
      <div style={{ fontSize: 11.5, color: '#94A3B8', display: 'flex', gap: 6, alignItems: 'center' }}><RefreshCw size={11} /> Faces are recognised on this device; only 128 numbers per face are kept, never sent elsewhere. Search finds only people whose faces were taught.</div>
    </div>
  );
  if (standalone) return <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: 16 }}><div style={{ maxWidth: 1200, margin: '0 auto' }}>{body}</div></div>;
  return body;
}
