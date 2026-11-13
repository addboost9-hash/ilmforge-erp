/**
 * A photo of a signature, ready to print: made small (at most 600 × 220)
 * and with the paper's white made clear, so it sits on any slip or card.
 * Resolves to a PNG data URL; rejects with a message to show.
 */
export function signatureFromFile(file) {
  return paperPicture(file, { maxW: 600, maxH: 220, what: 'the signature' });
}

/** The school's stamp, the same way: at most 420 × 420, the paper made clear. */
export function stampFromFile(file) {
  return paperPicture(file, { maxW: 420, maxH: 420, what: 'the stamp' });
}

function paperPicture(file, { maxW, maxH, what }) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/.test(file.type)) { reject(new Error(`Choose a PNG or JPG picture of ${what}.`)); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The picture could not be read.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The picture could not be read.'));
      img.onload = () => {
        const k = Math.min(1, maxW / img.width, maxH / img.height);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const px = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < px.data.length; i += 4) {
          if (px.data[i] > 200 && px.data[i + 1] > 200 && px.data[i + 2] > 200) px.data[i + 3] = 0;
        }
        ctx.putImageData(px, 0, 0);
        const out = c.toDataURL('image/png');
        if (out.length > 400 * 1024) reject(new Error(`The picture is too large: crop it to ${what} and try again.`));
        else resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
