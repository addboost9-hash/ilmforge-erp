/**
 * IlmForge — student and staff photos.
 *
 * A photo is stored once, on the person's record, and every document reads
 * it from there: ID cards, certificates, the admission form, result cards,
 * the portals. So it only ever needs uploading once.
 *
 * Photos are shrunk in the browser before they are sent. A phone camera
 * produces 3-5 MB; a passport photo on an ID card needs about 300 x 380
 * pixels. Shrinking first keeps each record around 15-25 KB, so a class list
 * with photos still loads quickly.
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
