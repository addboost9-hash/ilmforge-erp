/**
 * IlmForge — student and staff photos.
 *
 * A photo is stored once, on the person's record, and every document reads
 * it from there: ID cards, certificates, the admission form, result cards,
 * the portals. So it only ever needs uploading once.
 *
 * Photos are shrunk in the browser before they are sent. A phone camera
 * produces 3-5 MB; a passport photo on an ID card needs about 300 x 380
 * pixels. Shrinking first keeps each photo to about 40 KB (a 300 x 380 JPEG),
 * so a class list with photos still loads quickly.
 */

const MAX_W = 300;
const MAX_H = 380;
const QUALITY = 0.82;
// After shrinking, a photo should never be close to this; it guards the
// server against a raw upload that skipped the shrink.
export const MAX_PHOTO_BYTES = 400 * 1024;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('That file is not a picture we can read. Use a JPG or PNG photo.'));
  img.src = src;
});

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('The photo could not be read.'));
  r.readAsDataURL(file);
});

/**
 * Shrink a photo (a File from an <input type="file">, or a data URL from a
 * camera) to passport size as a JPEG data URL.
 */
export async function compressPhoto(input) {
  if (!input) return null;
  if (input instanceof File && !/^image\//.test(input.type)) {
    throw new Error('Choose a picture file (JPG or PNG).');
  }
  const src = input instanceof File ? await fileToDataUrl(input) : input;
  const img = await loadImage(src);

  const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // White behind transparent PNGs, otherwise they turn black as JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

/* What a person may pick. A phone photo is 3-5 MB; anything up to 5 MB is
   accepted and shrunk here to about 40 KB before it is sent. */
export const PICK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PICK_MAX_BYTES = 5 * 1024 * 1024;
export const PICK_RULES = 'JPG, PNG or WebP · up to 5 MB · it is resized automatically to about 40 KB';

/** A plain-language reason the file cannot be used, or null if it is fine. */
export function pickProblem(file) {
  if (!file) return 'No file was chosen.';
  if (!PICK_TYPES.includes(file.type)) return 'Choose a JPG, PNG or WebP photo.';
  if (file.size > PICK_MAX_BYTES) return `This photo is ${(file.size / 1048576).toFixed(1)} MB. Choose one up to 5 MB.`;
  return null;
}

/** Size of a data URL in KB, for "Ready · 38 KB". */
export const dataUrlKB = (url) => Math.round(((String(url || '').split(',')[1] || '').length * 3) / 4 / 1024);

/**
 * Shrink a school logo for cards, letterheads and the sign-in page. Unlike a
 * photo it is never cropped and keeps a transparent background (PNG); a logo
 * picked straight from a phone used to be saved at full size, a few MB that
 * travelled with every sign-in and could overflow the browser's storage.
 * Returns a data URL of at most about 150 KB.
 */
export async function compressLogo(file) {
  const problem = pickProblem(file);
  if (problem) throw new Error(problem.replace(/photo/g, 'logo'));
  const img = await loadImage(await fileToDataUrl(file));
  const MAX = 320;
  const scale = Math.min(1, MAX / img.width, MAX / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const png = canvas.toDataURL('image/png');
  if (dataUrlKB(png) <= 150) return png;
  // A photographic logo: WebP keeps the transparency at a fraction of the size.
  const webp = canvas.toDataURL('image/webp', 0.9);
  if (webp.startsWith('data:image/webp') && dataUrlKB(webp) <= 150) return webp;
  const flat = document.createElement('canvas');
  flat.width = w;
  flat.height = h;
  const ctx = flat.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return flat.toDataURL('image/jpeg', 0.88);
}
