/**
 * IlmForge — ID card assembly: one person and the school's choices in, a
 * card face (or a sheet of cards to print) out. The designs themselves live
 * in cardTemplates.js.
 *
 *   cardCode(p, type)           the code on the barcode and QR: roll number or employee code
 *   buildCard(p, opts, side)    one face, as HTML
 *   qrDataUrlsFor(people, type) real QR codes, { code: dataURL }
 *   buildPrintHTML(people, opts) the print page: each card's front and back side by side
 */
import { templateById, DEFAULT_RULES } from './cardTemplates';

/* ─── QR code ────────────────────────────────────
   Rendered from a pre-generated data-URL map (see qrDataUrlsFor below).
   The previous version drew a fixed decorative pattern — the same image for
   every person, encoding nothing — so the "QR code" on a printed card was
   just art. */
const qrSVG = (val, size = 40, qrMap = null) => {
  const src = qrMap?.[val];
  if (src) {
    return `<img src="${src}" width="${size}" height="${size}" alt="QR ${val}" style="display:block;background:#fff;border-radius:2px;"/>`;
  }
  // No QR available (generation failed) — leave the space blank rather than
  // printing a fake code that scanners will reject.
  return `<div style="width:${size}px;height:${size}px;"></div>`;
};

/* ─── Code 39 barcode ─────────────────────────────
   FIX: the old generator set each bar's width from its *index*
   (i%3===0?3:i%3===1?2:1), so the pattern never depended on the value —
   "ST-001" and "ST-999" rendered byte-identical barcodes that encoded
   nothing and no scanner could read. Cards are meant to work with this same
   app's barcode attendance kiosk (POST /attendance/barcode-scan looks a
   student up by rollNo), so the printed code has to be genuinely scannable.

   Code 39 is used because it needs no checksum, covers A-Z/0-9/'-' (roll
   numbers like ST-001 and NURA-26-001), and every handheld scanner reads it.
   Each character is 9 elements — 5 bars, 4 spaces, alternating, where 1 = wide. */
const CODE39 = {
  '0':'000110100','1':'100100001','2':'001100001','3':'101100000','4':'000110001',
  '5':'100110000','6':'001110000','7':'000100101','8':'100100100','9':'001100100',
  'A':'100001001','B':'001001001','C':'101001000','D':'000011001','E':'100011000',
  'F':'001011000','G':'000001101','H':'100001100','I':'001001100','J':'000011100',
  'K':'100000011','L':'001000011','M':'101000010','N':'000010011','O':'100010010',
  'P':'001010010','Q':'000000111','R':'100000110','S':'001000110','T':'000010110',
  'U':'110000001','V':'011000001','W':'111000000','X':'010010001','Y':'110010000',
  'Z':'011010000','-':'010000101','.':'110000100',' ':'011000100','$':'010101000',
  '/':'010100010','+':'010001010','%':'000101010','*':'010010100',
};

const barcodeSVG = (val, w = 200, h = 30) => {
  const NARROW = 2, WIDE = 5, GAP = 2;   // element widths in viewBox units
  // Code 39 is uppercase-only; anything unencodable is dropped so the symbol
  // stays valid rather than silently producing an unscannable code.
  const text = String(val || '').toUpperCase();
  const chars = ('*' + text.split('').filter(c => CODE39[c]).join('') + '*').split('');

  let x = 0;
  let bars = '';
  for (const ch of chars) {
    const pattern = CODE39[ch];
    for (let i = 0; i < 9; i++) {
      const width = pattern[i] === '1' ? WIDE : NARROW;
      if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${width}" height="${h}" fill="#000"/>`;
      x += width;
    }
    x += GAP;  // inter-character gap
  }

  const vbWidth = Math.max(x, 1);
  // Wrapped in a single block: these are often dropped into flex rows, where
  // two sibling nodes would lay out side by side and put the caption next to
  // the bars instead of beneath them.
  return `<div style="display:block;text-align:center;line-height:0;">
    <svg width="${w}" height="${h}" viewBox="0 0 ${vbWidth} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${vbWidth}" height="${h}" fill="#fff"/>
      <g>${bars}</g>
    </svg>
    <div style="font-family:monospace;font-size:6pt;color:#333;letter-spacing:1.5px;line-height:1.4;">${text}</div>
  </div>`;
};

/* ════════════════════════════════════════════════════
   5 PREMIUM ID CARD TEMPLATES
════════════════════════════════════════════════════ */
/* ─── Card assembly ──────────────────────────────
   Turns a person into the context every template design consumes, then asks
   the chosen template for the requested face. Designs live in
   cardTemplates.js so adding one does not mean touching this page. */
/* The code on a card's barcode and QR: the roll number or employee code, or
   ID-<n> (student) / STF-<n> (staff) when there is none. A staff card used
   to print ID-<n> too, which the scanner reads as the student with that
   number. */
export const cardCode = (p, type) => p.rollNo || p.empCode || (type === 'staff' ? `STF-${p.id}` : `ID-${p.id}`);

export const buildCard = (p, opts, side = 'front') => {
  const { primary, secondary, schoolName, address, phone, email, type, template,
          photoMap, logoSrc, qrMap, validity, rules, website } = opts;
  const tpl = templateById(template);
  const id  = cardCode(p, type);
  const classInfo = p.class?.name ? `${p.class.name}${p.section?.name ? ' - ' + p.section.name : ''}` : '—';
  const photo = photoMap?.[p.id] || p.photoUrl || null;
  const dob   = p.dob ? new Date(p.dob).toLocaleDateString('en-PK') : '—';
  const day   = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const cnic  = p.bFormNo || p.cnic || '';
  const isStaff = type === 'staff';

  const logoHtml = logoSrc
    ? `<img src="${String(logoSrc).replace(/"/g, '&quot;')}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:3px;"/>`
    : `<span style="font-size:13px;">🎓</span>`;

  /* Photo, or a neutral silhouette when none has been uploaded. */
  const photoBox = (w, h, round = false) => {
    const r = round ? '50%' : '4px';
    return photo
      ? `<img src="${photo}" style="width:${w};height:${h};object-fit:cover;border-radius:${r};display:block;"/>`
      : `<div style="width:${w};height:${h};border-radius:${r};overflow:hidden;background:${primary}18;display:flex;align-items:flex-end;justify-content:center;">
           <div style="width:52%;aspect-ratio:1;border-radius:50%;background:${primary}4d;margin-bottom:6%;flex-shrink:0;"></div>
         </div>`;
  };

  /* Field list differs for staff and students — a teacher has no father's
     name or class, and printing blank rows looks like broken data. */
  const fields = isStaff
    ? [
        ['Employee ID', id],
        ['Designation', p.designation],
        ['Department',  p.department?.name],
        ['Date of Birth', dob],
        ...(cnic ? [['CNIC', cnic]] : []),
      ]
    : [
        ['Student ID', id],
        ['Father Name', p.fatherName],
        ['Class', classInfo],
        ['Date of Birth', dob],
        ...(cnic ? [['B-Form', cnic]] : []),
      ];

  // "Teacher ID Card" for teaching staff, "Staff ID Card" for the rest.
  const teaches = isStaff && /teach|lectur|instructor|tutor/i.test(String(p.designation || ''));
  const ctx = {
    p, id_: id, name: p.name,
    subtitle: isStaff ? (p.designation || 'Staff') : classInfo,
    typeLabel: isStaff ? (teaches ? 'TEACHER' : 'STAFF') : 'STUDENT',
    cardTitle: isStaff ? (teaches ? 'Teacher ID Card' : 'Staff ID Card') : 'Student ID Card',
    joined: day(isStaff ? p.joiningDate : p.admissionDate),
    personPhone: isStaff ? (p.user?.phone || p.phone || '') : (p.emergencyPhone || p.motherPhone || ''),
    blood: p.bloodGroup || '',
    website: website || '',
    // Drop rows the record has no value for, so a card never prints a
    // column of em-dashes. Templates that slice(0, n) then get n real rows.
    fields: fields.filter(([, v]) => v != null && !['', '-', '—'].includes(String(v).trim())),
    photoBox, logoHtml,
    primary, secondary,
    dark: '#1B2430',
    schoolName, address, phone, email,
    validity, rules: rules && rules.length ? rules : DEFAULT_RULES,
    qr: (size) => qrSVG(id, size, qrMap),
    barcode: (w, h) => barcodeSVG(id, w, h),
  };

  return side === 'back' ? tpl.back(ctx) : tpl.front(ctx);
};

/* ─── Real QR codes ───────────────────────────────
   Generates a { idValue -> dataURL } map with the `qrcode` package (already a
   dependency). Encodes the roll/employee number, which is exactly what this
   app's own barcode attendance kiosk looks a person up by, so a scanned card
   resolves to the right person instead of decoding to nothing. */
export const qrDataUrlsFor = async (people, type) => {
  const map = {};
  try {
    const QR = (await import('qrcode')).default;
    await Promise.all(people.map(async (p) => {
      const val = cardCode(p, type);
      try {
        map[val] = await QR.toDataURL(val, { margin: 0, width: 160, errorCorrectionLevel: 'M' });
      } catch { /* skip this one; the card renders without a QR */ }
    }));
  } catch {
    // qrcode unavailable — cards still print, just without QR codes.
  }
  return map;
};

/* ─── Print HTML ─────────────────────────────────── */
export const buildPrintHTML = (people, opts) => {
  const isPortrait = templateById(opts.template).orient === 'portrait';
  // Front and back are emitted as a pair per person and kept together, so a
  // duplex print lines the two faces of one card up on the same sheet.
  const cards = people.map((p) => `
    <div class="pair">
      <div class="face">${buildCard(p, opts, 'front')}<div class="face-tag">FRONT</div></div>
      <div class="face">${buildCard(p, opts, 'back')}<div class="face-tag">BACK</div></div>
    </div>`).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>ID Cards — ${opts.schoolName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  /* The designs are coloured: without this the browser prints them white
     unless "Background graphics" is ticked in the print dialog. */
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{background:#f0f0f0;font-family:Arial,sans-serif;padding:10mm;}
  .wrap{display:flex;flex-wrap:wrap;gap:6mm;}
  /* One person = one pair. keeping the pair unbreakable means the two faces
     of a card never land on different sheets. */
  .pair{display:flex;gap:3mm;break-inside:avoid;page-break-inside:avoid;}
  .face{position:relative;}
  .face-tag{position:absolute;top:-4mm;left:0;font-size:7px;letter-spacing:1px;color:#94a3b8;font-family:Arial,sans-serif;}
  @media print{
    body{background:#fff;padding:4mm;}
    .no-print{display:none!important;}
    .wrap{gap:4mm;}
    .pair{gap:2mm;}
    .face-tag{display:none;}   /* guides for the screen only */
    @page{margin:6mm;}
  }
</style></head><body>
  <div class="no-print" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div>
      <h2 style="font-size:15px;font-weight:700;color:#0F4C45;margin:0 0 2px;">${opts.schoolName} — ID Cards</h2>
      <p style="font-size:12px;color:#9CA3AF;margin:0;">${people.length} card(s) · ${new Date().toLocaleDateString('en-PK')}</p>
    </div>
    <button onclick="window.print()" style="background:#0F766E;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">🖨 Print ID Cards</button>
  </div>
  <div class="wrap">${cards}</div>
</body></html>`;
};

