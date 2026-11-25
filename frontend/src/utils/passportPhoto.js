/**
 * Passport-size student photos: 35 × 45 mm (7 : 9), head and shoulders.
 *
 * A school's photos are usually the student standing against a plain wall,
 * the head in the top part and half the body showing. suggestCrop() finds the
 * head on that plain background and frames it as a passport photo is framed:
 * a little space above the hair, the head about half the height, the
 * shoulders below. Where it cannot tell, it takes the top middle of the
 * picture. The office can move and zoom each frame before anything is saved.
 *
 * A crop is { x, y, w, h } as fractions of the picture's width and height.
 */

export const PASSPORT = { w: 350, h: 450 }; // pixels saved: 35 × 45 mm
export const RATIO = PASSPORT.w / PASSPORT.h;
const QUALITY = 0.86;

export const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('This file is not a picture that can be read. Use a JPG or PNG photo.'));
  img.src = src;
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* The longest run of "person" pixels in a row, allowing gaps of a few
   pixels (a shirt's stripe, a strand of hair). */
function longestRun(isFg, y, x0, x1, gap) {
  let best = { l: -1, r: -1, n: 0 };
  let l = -1; let last = -1;
  for (let x = x0; x < x1; x++) {
    if (!isFg(x, y)) continue;
    if (l < 0 || x - last > gap) l = x;
    last = x;
    if (x - l + 1 > best.n) best = { l, r: x, n: x - l + 1 };
  }
  return best;
}

/** The fallback frame: the top middle of the picture. */
export function centreCrop(W, H) {
  let cw = W * 0.62;
  let ch = cw / RATIO;
  if (ch > H * 0.9) { ch = H * 0.9; cw = ch * RATIO; }
  return { x: (W - cw) / 2 / W, y: (H * 0.04) / H, w: cw / W, h: ch / H, auto: false };
}

/**
 * A passport frame for a picture (ImageData of a small copy of it).
 * Returns a crop, with auto: true when the head was found.
 */
export function suggestCrop({ data, width: W, height: H }) {
  const at = (x, y) => (y * W + x) * 4;
  // The wall: the colour of the two top corners.
  const box = Math.max(2, Math.round(W * 0.06));
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = 0; y < box; y++) {
    for (const x of [...Array(box).keys(), ...Array.from({ length: box }, (_, i) => W - 1 - i)]) {
      const i = at(x, y);
      sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2]; n++;
    }
  }
  const bg = sum.map((v) => v / n);
  const isFg = (x, y) => {
    const i = at(x, y);
    return Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 75;
  };
  const x0 = Math.round(W * 0.03);
  const x1 = W - x0;
  const gap = Math.max(2, Math.round(W * 0.01));
  const minRun = Math.max(4, Math.round(W * 0.06)); // more than a nail hole in the wall

  // The top of the head: the first of three rows with a wide enough run.
  let top = -1;
  for (let y = Math.round(H * 0.01); y < H * 0.7; y++) {
    if ([0, 1, 2].every((k) => longestRun(isFg, y + k, x0, x1, gap).n >= minRun)) { top = y; break; }
  }
  if (top < 0) return centreCrop(W, H);

  // The head's width and middle: the forehead and face, below the hair.
  const widths = [];
  const mids = [];
  for (let y = Math.round(top + H * 0.035); y <= Math.min(H - 1, Math.round(top + H * 0.09)); y++) {
    const r = longestRun(isFg, y, x0, x1, gap);
    if (r.n) { widths.push(r.n); mids.push((r.l + r.r) / 2); }
  }
  if (!widths.length) return centreCrop(W, H);
  const median = (a) => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)];
  const headW = median(widths);
  const mid = median(mids);
  if (headW < W * 0.07 || headW > W * 0.6) return centreCrop(W, H);

  // Hair to chin is about 1.3 times the head's width; the head is about
  // 55% of a passport photo's height, with 10% space above it.
  let ch = (headW * 1.3) / 0.55;
  let cw = ch * RATIO;
  if (cw > W) { cw = W; ch = cw / RATIO; }
  if (ch > H) { ch = H; cw = ch * RATIO; }
  const cx = clamp(mid - cw / 2, 0, W - cw);
  const cy = clamp(top - ch * 0.1, 0, H - ch);
  return { x: cx / W, y: cy / H, w: cw / W, h: ch / H, auto: true };
}

/**
 * A small copy of the picture for the screen, and the suggested frame.
 * Returns { src, width, height, crop } (width/height of the full picture).
 */
export async function previewOf(file, max = 520) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s));
    const h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let crop;
    try { crop = suggestCrop(ctx.getImageData(0, 0, w, h)); } catch { crop = centreCrop(w, h); }
    return { src: c.toDataURL('image/jpeg', 0.8), width: img.naturalWidth, height: img.naturalHeight, crop };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The passport photo itself, from the full picture: a JPEG data URL. */
export async function passportFromFile(file, crop) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = PASSPORT.w; c.height = PASSPORT.h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PASSPORT.w, PASSPORT.h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, crop.x * W, crop.y * H, crop.w * W, crop.h * H, 0, 0, PASSPORT.w, PASSPORT.h);
    return c.toDataURL('image/jpeg', QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* The frame drawn as a CSS background: the cropped part fills a box of
   width bw (its height follows the passport ratio). */
export function cropStyle(src, crop, bw) {
  const bh = bw / RATIO;
  return {
    width: bw, height: bh,
    backgroundImage: `url("${src}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${bw / crop.w}px ${bh / crop.h}px`,
    backgroundPosition: `${-(crop.x * bw) / crop.w}px ${-(crop.y * bh) / crop.h}px`,
  };
}

/* A photo's file name without its folder, extension, " (1)" or "copy",
   with _ . - as spaces: "9th_ zaria-khan (1).JPG" -> "9th zaria khan". */
export function fileBase(fileName) {
  return String(fileName || '').split(/[\\/]/).pop().replace(/\.[A-Za-z0-9]{2,5}$/, '')
    .replace(/\s*\(\d+\)\s*$/, '').replace(/\s*-?\s*copy$/i, '')
    .replace(/[_.]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * The student's name from a photo's file name: "ali raza.jpg" -> "Ali Raza".
 * A camera's name ("IMG_2041", "WhatsApp Image 2026-11-05") is not a name.
 * Returns { name } or { name: '', problem }.
 */
export function nameFromFile(fileName) {
  let base = String(fileName || '').split(/[\\/]/).pop().replace(/\.[A-Za-z0-9]{2,5}$/, '');
  base = base.replace(/\s*\(\d+\)\s*$/, '').replace(/\s*-?\s*copy$/i, '');
  base = base.replace(/[_.]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return { name: '', problem: 'The file has no name: type the student\'s name.' };
  if (/\d/.test(base) || /^(img|image|photo|whatsapp|screenshot|dsc|pxl)\b/i.test(base)) {
    return { name: '', problem: `"${base}" is a camera's name, not the student's: type the name.` };
  }
  if (!/\p{L}/u.test(base)) return { name: '', problem: 'The file name has no letters: type the student\'s name.' };
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  base = base.split(' ').map((w) => (w === w.toLowerCase() || w === w.toUpperCase() ? cap(w.toLowerCase()) : w)).join(' ');
  return { name: base.slice(0, 60) };
}
