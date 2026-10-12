/**
 * Pages of a filled paper form (phone photos, scans, a PDF) made ready to be
 * read. Photos are kept large enough for handwriting (2000 px on the long
 * side) but shrunk from the 3-8 MB a phone camera produces; a PDF is sent
 * as it is.
 */

const LONG_EDGE = 2000;
const QUALITY = 0.85;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error(`${file.name || 'The file'} could not be read.`));
  r.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('That picture could not be opened. Send it as a JPG or PNG (iPhone photos: Settings → Camera → Formats → Most Compatible).'));
  img.src = src;
});

/** A File -> { name, kind: 'image'|'pdf', dataUrl, preview } */
export async function prepareScan(file) {
  const type = (file.type || '').toLowerCase();
  if (type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
    if (file.size > MAX_PDF_BYTES) throw new Error('That PDF is over 8 MB. Scan at a lower resolution, or send photos of the pages.');
    const dataUrl = await fileToDataUrl(file);
    return { name: file.name || 'scan.pdf', kind: 'pdf', dataUrl: dataUrl.replace(/^data:[^;]*;/, 'data:application/pdf;') };
  }
  if (!type.startsWith('image/') && !/\.(jpe?g|png|webp|heic)$/i.test(file.name || '')) {
    throw new Error(`${file.name || 'That file'} is not a photo or a PDF.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, LONG_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
    return { name: file.name || 'photo.jpg', kind: 'image', dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Class written on the form ("5th", "Class Five", "KG-II") -> a class id, or ''. */
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
const classKey = (s) => {
  let t = String(s || '').toLowerCase().replace(/\b(class|grade|std|standard)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1');
  t = t.split(' ').map((w) => (WORDS[w] ? String(WORDS[w]) : w)).join(' ');
  if (ROMAN[t]) t = String(ROMAN[t]);
  return t.replace(/\s+/g, '');
};
export function matchClass(classes, written) {
  const want = classKey(written);
  if (!want) return '';
  const hit = classes.find((c) => classKey(c.name) === want);
  return hit ? String(hit.id) : '';
}
