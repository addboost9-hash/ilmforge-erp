/**
 * Face recognition in the browser, for face attendance on a phone.
 *
 * Everything runs on the device: the models (about 7 MB, downloaded once
 * from this site's /models/face and then kept by the browser) find the
 * face, and turn it into 128 numbers (a "descriptor"); the same person's
 * numbers are close together. Matching compares those numbers with the
 * people the school taught it; no picture is sent anywhere to be matched.
 *
 * Two ways to mark:
 *   auto     marks as soon as the same person is recognised surely in two
 *            frames in a row (for a gate where someone is watching);
 *   confirm  shows who it thinks it is; the person on duty taps ✓.
 */
const MODELS = '/models/face';
let engine = null;
let loading = null;

/** The face library and its models, loaded once (the library itself only when needed). */
export function loadFaceEngine() {
  if (engine) return Promise.resolve(engine);
  if (!loading) {
    loading = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS),
      ]);
      engine = faceapi;
      return faceapi;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

const area = (b) => b.width * b.height;
const sizeOf = (input) => ({
  w: input.videoWidth || input.naturalWidth || input.width,
  h: input.videoHeight || input.naturalHeight || input.height,
});

/* A part of the picture around a box, on its own canvas. */
function cropCanvas(input, box, grow, out = null) {
  const { w, h } = sizeOf(input);
  const gx = box.width * grow;
  const gy = box.height * grow;
  const x = Math.max(0, box.x - gx);
  const y = Math.max(0, box.y - gy);
  const cw = Math.min(w - x, box.width + 2 * gx);
  const ch = Math.min(h - y, box.height + 2 * gy);
  const c = document.createElement('canvas');
  c.width = out || Math.round(cw);
  c.height = out || Math.round(ch);
  c.getContext('2d').drawImage(input, x, y, cw, ch, 0, 0, c.width, c.height);
  return c;
}

/**
 * The biggest (nearest) face in a video frame or picture, with its
 * descriptor. A picture (a student's photo) is tried at several sizes.
 * Returns { descriptor: Float32Array, box, score, count } or null.
 */
export async function readFace(input, { photo = false } = {}) {
  const f = await loadFaceEngine();
  const sizes = photo ? [416, 608, 320, 224] : [320];
  for (const inputSize of sizes) {
    const opts = new f.TinyFaceDetectorOptions({ inputSize, scoreThreshold: photo ? 0.3 : 0.5 });
    const found = await f.detectAllFaces(input, opts);
    if (!found.length) continue;
    const big = found.reduce((a, b) => (area(b.box) > area(a.box) ? b : a));
    // The descriptor of that one face only, however many are in view.
    const part = cropCanvas(input, big.box, 0.45);
    const one = await f.detectSingleFace(part, new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })).withFaceLandmarks().withFaceDescriptor();
    if (!one) continue;
    return { descriptor: new Float32Array(one.descriptor), box: big.box, score: big.score, count: found.length };
  }
  return null;
}

/** A small square picture of the face (kept to show who was recognised). */
export function faceCrop(input, box) {
  return cropCanvas(input, box, 0.3, 120).toDataURL('image/jpeg', 0.8);
}

/* ── Descriptors as text ── */

export function toB64(f32) {
  const bytes = new Uint8Array(new Float32Array(f32).buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
export function fromB64(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/* ── Matching ── */

/**
 * people: [{ kind, id, name, label, code, d: [base64...] }].
 * Returns match(descriptor) -> { first, second } (each { p, dist }), the
 * nearest two different people.
 */
export function makeMatcher(people) {
  const items = [];
  for (const p of people) for (const d of p.d || []) { try { items.push({ p, v: fromB64(d) }); } catch { /* skip */ } }
  return (q) => {
    const best = new Map();
    for (const it of items) {
      let s = 0;
      for (let i = 0; i < 128; i++) { const x = it.v[i] - q[i]; s += x * x; }
      const dist = Math.sqrt(s);
      const k = `${it.p.kind}:${it.p.id}`;
      const cur = best.get(k);
      if (!cur || dist < cur.dist) best.set(k, { p: it.p, dist });
    }
    const sorted = [...best.values()].sort((a, b) => a.dist - b.dist);
    return { first: sorted[0] || null, second: sorted[1] || null };
  };
}

/* How close is close enough. Auto marks only on a sure match, clearly
   nearer than anyone else; confirm shows a likely one for a person to check. */
export const STRICTNESS = {
  strict: { label: 'Strict', auto: 0.42, confirm: 0.5, margin: 0.08 },
  normal: { label: 'Normal', auto: 0.47, confirm: 0.56, margin: 0.06 },
  easy: { label: 'Easy', auto: 0.52, confirm: 0.6, margin: 0.05 },
};

/**
 * What to do with a match: { kind: 'match' | 'unsure' | 'unknown' | 'none', person, dist }.
 * 'match' in auto mode means sure enough to mark without asking.
 */
export function decide(match, { mode = 'confirm', level = 'normal' } = {}) {
  const t = STRICTNESS[level] || STRICTNESS.normal;
  if (!match?.first) return { kind: 'none' };
  const { p, dist } = match.first;
  const gap = match.second ? match.second.dist - dist : 1;
  if (mode === 'auto' ? dist <= t.auto && gap >= t.margin : dist <= t.confirm && gap >= 0.02) return { kind: 'match', person: p, dist };
  if (dist <= t.confirm + 0.04) return { kind: 'unsure', person: p, dist };
  return { kind: 'unknown', dist };
}

/** "Strong" / "Good" / "Weak", for the person checking a match. */
export const matchWord = (dist) => (dist <= 0.42 ? 'Strong match' : dist <= 0.52 ? 'Good match' : 'Weak match');

/* A short beep (after a tap has allowed sound on this page). */
let audio = null;
export function beep(ok = true) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = ok ? 880 : 300;
    g.gain.setValueAtTime(0.15, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + (ok ? 0.18 : 0.35));
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + (ok ? 0.2 : 0.4));
  } catch { /* no sound */ }
}
