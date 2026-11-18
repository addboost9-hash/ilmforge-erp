/**
 * IlmForge — ID card designs.
 *
 * Each template supplies a `front` and a `back` that share one visual
 * language, so a printed card reads as a single object rather than two
 * unrelated sides. Previously only fronts existed, and just one of the five
 * carried a QR code.
 *
 * Every builder receives the same context object and returns an HTML string.
 * The card box itself (size, radius, overflow, flex column) comes from
 * `shell()`, so a design only has to describe its own content.
 *
 * Layout rules, learned the hard way — a card is a FIXED size, so:
 *   • headers and footers need flex-shrink:0, or their padding collapses
 *   • the flexible middle needs min-height:0, or it refuses to shrink and
 *     pushes the footer clean off the bottom edge
 */

export const PORTRAIT = { w: '54mm', h: '85.6mm' };
export const LANDSCAPE = { w: '85.6mm', h: '54mm' };

/* Card box. `orient` selects the ISO/CR80 dimensions. */
const shell = (orient, inner) => {
  const { w, h } = orient === 'portrait' ? PORTRAIT : LANDSCAPE;
  return `<div style="width:${w};height:${h};border-radius:3.5mm;overflow:hidden;box-shadow:0 3px 14px rgba(0,0,0,0.18);font-family:'Arial',sans-serif;background:#fff;display:inline-flex;flex-direction:column;box-sizing:border-box;position:relative;">${inner}</div>`;
};

/* A row with nothing to show is omitted entirely, so a card never prints a
   label against a bare em-dash. */
const blank = (v) => v == null || ['', '-', '—'].includes(String(v).trim());

/* Names and values come from the school's records: printed as text. */
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/* A school or person name, printed in full. It used to be cut off on one
   line ("Future Foundation Sch…"); now it wraps to a second line, and a very
   long one gets a little smaller so it still fits. `perLine` is about how
   many letters fit on one line at the design's normal size. */
const fitted = (text, basePt, perLine, style = '', lines = 2) => {
  const t = String(text || '');
  const len = t.length;
  let size = basePt;
  if (len > perLine) size = basePt * 0.9;                                   // more than one line
  if (len > perLine * lines * 0.95) size = Math.max(basePt * 0.62, basePt * 0.9 * ((perLine * lines * 0.95) / len));
  return `<div style="font-size:${size.toFixed(2)}pt;line-height:1.12;white-space:normal;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-line-clamp:${lines};-webkit-box-orient:vertical;overflow:hidden;${style}">${esc(t)}</div>`;
};

/* A labelled detail row. Values are clipped, never wrapped, so a long value
   cannot quietly push the rest of the card out of view. */
const row = (label, value, c) => blank(value) ? '' : `
  <div style="display:flex;margin-bottom:${c.dense ? '0.9mm' : '1.3mm'};font-size:${c.dense ? '5.6pt' : '6pt'};">
    <span style="color:#8A8F98;width:${c.labelW || '17mm'};flex-shrink:0;">${label}</span>
    <span style="color:#1F2430;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(value)}</span>
  </div>`;

/* Same, but ruled — the underlined field style the reference cards use. */
const ruledRow = (label, value, c) => blank(value) ? '' : `
  <div style="display:flex;align-items:baseline;gap:2mm;padding-bottom:1mm;margin-bottom:1.1mm;border-bottom:1px solid ${c.primary}22;font-size:6pt;">
    <span style="color:#8A8F98;width:${c.labelW || '17mm'};flex-shrink:0;">${label}</span>
    <span style="color:#1F2430;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(value)}</span>
  </div>`;

/* The white chip a scanner needs: dark bars on a light ground. */
const codeChip = (svg, pad) =>
  `<div style="background:#fff;border-radius:1mm;padding:${pad || '1mm 1.5mm'};flex-shrink:0;">${svg}</div>`;

const signatureLine = (label, c) => `
  <div style="flex-shrink:0;text-align:center;padding-bottom:1mm;">
    <div style="border-top:1px solid ${c.primary}66;margin:0 4mm 1mm;"></div>
    <div style="font-size:5pt;color:#8A8F98;letter-spacing:0.4px;text-transform:uppercase;">${label}</div>
  </div>`;

const rulesBlock = (c, rules) => `
  <div style="flex:1;min-height:0;overflow:hidden;padding:2.5mm 4mm;">
    <div style="font-size:6pt;font-weight:800;color:${c.primary};margin-bottom:1.5mm;">Rules &amp; Instructions</div>
    <ul style="margin:0;padding-left:3.5mm;font-size:5.4pt;color:#454B55;line-height:1.5;">
      ${rules.map((r) => `<li style="margin-bottom:0.8mm;">${r}</li>`).join('')}
    </ul>
  </div>`;

/* Only rows that actually have a value; an empty contact block collapses
   entirely rather than printing a column of em-dashes. */
const contactBlock = (c) => {
  const rows = [['Phone', c.phone], ['Address', c.address]]
    .filter(([, v]) => v && !['-', '—'].includes(String(v).trim()));
  if (!rows.length) return '';
  return `
  <div style="flex-shrink:0;overflow:hidden;padding:2.5mm 4mm;">
    ${rows.map(([l, v]) => ruledRow(l, v, c)).join('')}
  </div>`;
};

export const DEFAULT_RULES = [
  'This card must be carried at all times on campus.',
  'It is school property and is not transferable.',
  'If found, please return it to the school office.',
  'Report loss or damage immediately.',
];

/* ══════════════════════════════════════════════════════════════════════
   1 — ACADEMIC (portrait): curved colour header, circular photo
   ══════════════════════════════════════════════════════════════════════ */
const academic = {
  id: 'academic',
  label: 'Academic',
  orient: 'portrait',
  desc: 'Curved header, circular photo, ruled fields, QR footer',
  front: (c) => shell('portrait', `
    <div style="flex-shrink:0;position:relative;background:${c.primary};padding:4mm 4mm 9mm;text-align:center;overflow:hidden;">
      <div style="position:absolute;bottom:-11mm;right:-9mm;width:30mm;height:30mm;border-radius:50%;background:${c.secondary}44;"></div>
      <div style="position:absolute;top:-6mm;left:-7mm;width:18mm;height:18mm;border-radius:50%;background:#ffffff14;"></div>
      <div style="position:relative;display:flex;align-items:center;justify-content:center;gap:2mm;">
        <div style="width:8mm;height:8mm;border-radius:2mm;background:#ffffff28;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.logoHtml}</div>
        <div style="text-align:left;min-width:0;flex:0 1 auto;">
          ${fitted(c.schoolName, 7.5, 24, 'font-weight:900;color:#fff;')}
          <div style="font-size:4.6pt;color:#ffffffbb;letter-spacing:0.5px;">${c.typeLabel} IDENTITY CARD</div>
        </div>
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;justify-content:center;margin-top:-6mm;position:relative;z-index:2;">
      <div style="width:19mm;height:19mm;border-radius:50%;overflow:hidden;border:2.5px solid ${c.secondary};box-shadow:0 2px 8px rgba(0,0,0,0.22);">${c.photoBox('100%', '100%', true)}</div>
    </div>
    <div style="flex-shrink:0;text-align:center;padding:1.5mm 3mm 1mm;">
      ${fitted(c.name, 9.5, 26, 'font-weight:900;color:#1F2430;')}
      <div style="font-size:5.8pt;color:${c.primary};font-weight:700;margin-top:0.4mm;">${esc(c.subtitle)}</div>
    </div>
    <div style="flex:1;min-height:0;overflow:hidden;padding:0 4mm;">
      ${c.fields.map(([l, v]) => ruledRow(l, v, c)).join('')}
    </div>
    <div style="flex-shrink:0;background:${c.primary};padding:2mm 3mm;display:flex;align-items:center;gap:2mm;">
      <div style="flex:1;min-width:0;">${codeChip(c.barcode(88, 13), '0.8mm 1.2mm')}</div>
      ${codeChip(c.qr(30), '0.8mm')}
    </div>`),
  back: (c) => shell('portrait', `
    <div style="flex-shrink:0;position:relative;background:${c.primary};padding:3mm 4mm;overflow:hidden;">
      <div style="position:absolute;bottom:-9mm;left:-8mm;width:24mm;height:24mm;border-radius:50%;background:${c.secondary}44;"></div>
      <div style="position:relative;font-size:6.5pt;font-weight:900;color:#fff;letter-spacing:0.4px;">INSTRUCTIONS</div>
    </div>
    ${rulesBlock(c, c.rules)}
    <div style="flex-shrink:0;padding:0 4mm 1.5mm;">
      ${ruledRow('Phone', c.phone, c)}
      ${ruledRow('Address', c.address, c)}
      ${c.validity ? ruledRow('Valid', c.validity, c) : ''}
    </div>
    ${signatureLine('Authorised Signature', c)}
    <div style="flex-shrink:0;background:${c.primary};padding:2mm 3mm;display:flex;align-items:center;gap:2mm;">
      <div style="flex:1;min-width:0;">${codeChip(c.barcode(88, 13), '0.8mm 1.2mm')}</div>
      ${codeChip(c.qr(30), '0.8mm')}
    </div>`),
};

/* ══════════════════════════════════════════════════════════════════════
   2 — CAMPUS ARC (portrait): sweeping arcs, bold two-tone
   ══════════════════════════════════════════════════════════════════════ */
const campusArc = {
  id: 'campus',
  label: 'Campus Arc',
  orient: 'portrait',
  desc: 'Sweeping arcs, large photo, bulleted rules on the reverse',
  front: (c) => shell('portrait', `
    <div style="flex-shrink:0;position:relative;height:26mm;background:${c.dark};overflow:hidden;">
      <div style="position:absolute;top:-16mm;right:-14mm;width:46mm;height:46mm;border-radius:50%;background:${c.primary};"></div>
      <div style="position:absolute;bottom:-22mm;left:-12mm;width:40mm;height:40mm;border-radius:50%;background:${c.primary}55;"></div>
      <div style="position:relative;padding:3.5mm 4mm;display:flex;align-items:center;gap:2mm;">
        <div style="min-width:0;">
          ${fitted(c.schoolName, 8, 23, 'font-weight:900;color:#fff;')}
          <div style="font-size:4.6pt;color:${c.primary};font-weight:700;letter-spacing:0.6px;">${c.typeLabel} CARD</div>
        </div>
        <div style="margin-left:auto;width:8mm;height:8mm;border-radius:50%;background:#ffffff1f;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.logoHtml}</div>
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;justify-content:center;margin-top:-9mm;position:relative;z-index:2;">
      <div style="width:21mm;height:21mm;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.25);">${c.photoBox('100%', '100%', true)}</div>
    </div>
    <div style="flex-shrink:0;text-align:center;padding:1.5mm 3mm 1mm;">
      ${fitted(c.name, 9.5, 26, `font-weight:900;color:${c.dark};`)}
      <div style="font-size:5.8pt;color:${c.primary};font-weight:800;letter-spacing:0.3px;text-transform:uppercase;">${esc(c.subtitle)}</div>
    </div>
    <div style="flex:1;min-height:0;overflow:hidden;padding:0 4mm;">
      ${c.fields.map(([l, v]) => row(l, v, c)).join('')}
    </div>
    <div style="flex-shrink:0;display:flex;align-items:center;gap:2mm;padding:1.5mm 3mm;background:${c.primary}18;">
      <div style="flex:1;min-width:0;">${c.barcode(84, 12)}</div>
      ${c.qr(28)}
    </div>`),
  back: (c) => shell('portrait', `
    <div style="flex-shrink:0;position:relative;height:16mm;background:${c.dark};overflow:hidden;">
      <div style="position:absolute;top:-12mm;left:-10mm;width:34mm;height:34mm;border-radius:50%;background:${c.primary};"></div>
      <div style="position:relative;padding:3mm 4mm;font-size:6.5pt;font-weight:900;color:#fff;letter-spacing:0.5px;">CARD CONDITIONS</div>
    </div>
    ${rulesBlock(c, c.rules.slice(0, 3))}
    ${contactBlock(c)}
    ${signatureLine('Principal / Registrar', c)}
    <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:2mm;padding:1.5mm 3mm;background:${c.primary}18;">
      <div style="font-size:5pt;color:#6B7280;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.validity || c.id_}</div>
      ${c.qr(26)}
    </div>`),
};

/* ══════════════════════════════════════════════════════════════════════
   3 — EXECUTIVE (landscape): photo left, accent header, clean grid
   ══════════════════════════════════════════════════════════════════════ */
const executive = {
  id: 'executive',
  label: 'Executive',
  orient: 'landscape',
  desc: 'Landscape, photo left, contact details and QR on the reverse',
  front: (c) => shell('landscape', `
    <div style="flex-shrink:0;display:flex;align-items:center;gap:2mm;background:${c.primary};padding:2mm 3mm;">
      <div style="width:6.5mm;height:6.5mm;border-radius:1.5mm;background:#ffffff28;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.logoHtml}</div>
      <div style="min-width:0;">
        ${fitted(c.schoolName, 7, 52, 'font-weight:900;color:#fff;')}
        <div style="font-size:4.4pt;color:#ffffffb0;letter-spacing:0.5px;">${c.typeLabel} IDENTITY CARD</div>
      </div>
    </div>
    <div style="flex:1;min-height:0;display:flex;">
      <div style="width:23mm;flex-shrink:0;background:${c.primary}12;display:flex;align-items:center;justify-content:center;padding:2mm;">
        <div style="width:16mm;height:19mm;border-radius:1.5mm;overflow:hidden;border:1.5px solid ${c.primary}55;flex-shrink:0;">${c.photoBox('100%', '100%')}</div>
      </div>
      <div style="flex:1;min-width:0;overflow:hidden;padding:2mm 3mm;">
        ${fitted(c.name, 8.5, 34, 'font-weight:900;color:#1F2430;margin-bottom:0.5mm;')}
        <div style="display:inline-block;font-size:5pt;font-weight:800;color:#fff;background:${c.secondary};padding:0.6mm 2mm;border-radius:99px;margin-bottom:1.5mm;">${esc(c.subtitle)}</div>
        ${c.fields.slice(0, 4).map(([l, v]) => row(l, v, { ...c, dense: true, labelW: '14mm' })).join('')}
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;align-items:center;gap:2mm;padding:1.2mm 3mm;border-top:1px solid ${c.primary}22;">
      <div style="flex:1;min-width:0;">${c.barcode(100, 11)}</div>
      ${c.qr(24)}
    </div>`),
  back: (c) => shell('landscape', `
    <div style="flex-shrink:0;background:${c.primary};padding:2mm 3mm;font-size:6.5pt;font-weight:900;color:#fff;letter-spacing:0.4px;">TERMS OF USE</div>
    <div style="flex:1;min-height:0;display:flex;">
      ${rulesBlock({ ...c, dense: true }, c.rules.slice(0, 3))}
      <div style="width:26mm;flex-shrink:0;border-left:1px solid ${c.primary}22;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;padding:2mm;">
        ${c.qr(30)}
        <div style="font-size:4.4pt;color:#8A8F98;text-align:center;">Scan to verify</div>
      </div>
    </div>
    <div style="flex-shrink:0;padding:0 3mm 1mm;">
      ${ruledRow('Phone', c.phone, { ...c, labelW: '14mm' })}
      ${ruledRow('Address', c.address, { ...c, labelW: '14mm' })}
    </div>
    ${signatureLine('Authorised Signature', c)}`),
};

/* ══════════════════════════════════════════════════════════════════════
   4 — MINIMAL (landscape): restrained, colour spine, generous white
   ══════════════════════════════════════════════════════════════════════ */
const minimal = {
  id: 'minimal',
  label: 'Minimal',
  orient: 'landscape',
  desc: 'Quiet layout, colour spine, wide margins, QR on both faces',
  front: (c) => shell('landscape', `
    <div style="flex:1;min-height:0;display:flex;">
      <div style="width:4mm;flex-shrink:0;background:${c.primary};"></div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;padding:2.5mm 3mm;">
        <div style="flex-shrink:0;display:flex;align-items:center;gap:1.5mm;margin-bottom:1.5mm;">
          <div style="width:5.5mm;height:5.5mm;border-radius:50%;background:${c.primary};display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.logoHtml}</div>
          <div style="min-width:0;">${fitted(c.schoolName, 6.5, 54, `font-weight:800;color:${c.primary};`)}</div>
        </div>
        <div style="flex:1;min-height:0;display:flex;gap:2.5mm;">
          <div style="flex:1;min-width:0;overflow:hidden;">
            ${fitted(c.name, 9, 28, 'font-weight:900;color:#1F2430;')}
            <div style="font-size:5.4pt;color:#8A8F98;margin-bottom:1.5mm;">${esc(c.subtitle)}</div>
            ${c.fields.slice(0, 3).map(([l, v]) => row(l, v, { ...c, dense: true, labelW: '13mm' })).join('')}
          </div>
          <div style="width:16mm;height:20mm;border-radius:1.5mm;overflow:hidden;border:1px solid #E3E7ED;flex-shrink:0;">${c.photoBox('100%', '100%')}</div>
        </div>
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;align-items:center;gap:2mm;padding:1.2mm 3mm;background:#F7F8FA;border-top:1px solid #E3E7ED;">
      <div style="flex:1;min-width:0;">${c.barcode(100, 11)}</div>
      ${c.qr(24)}
    </div>`),
  back: (c) => shell('landscape', `
    <div style="flex:1;min-height:0;display:flex;">
      <div style="width:4mm;flex-shrink:0;background:${c.primary};"></div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;padding:2.5mm 3mm;">
        <div style="flex-shrink:0;font-size:6pt;font-weight:800;color:${c.primary};margin-bottom:1.5mm;">IF FOUND</div>
        <div style="flex:1;min-height:0;overflow:hidden;font-size:5.4pt;color:#454B55;line-height:1.55;">
          Please return this card to ${esc(c.schoolName)}. ${c.rules[1] || ''}
        </div>
        <div style="flex-shrink:0;">
          ${ruledRow('Phone', c.phone, { ...c, labelW: '13mm' })}
          ${ruledRow('Address', c.address, { ...c, labelW: '13mm' })}
        </div>
      </div>
      <div style="width:24mm;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;padding:2mm;border-left:1px solid #E3E7ED;">
        ${c.qr(30)}
        <div style="font-size:4.4pt;color:#8A8F98;">${c.id_}</div>
      </div>
    </div>
    ${signatureLine('Authorised Signature', c)}`),
};

/* ══════════════════════════════════════════════════════════════════════
   5 — BOLD BAND (portrait): strong colour band, oversized name
   ══════════════════════════════════════════════════════════════════════ */
const boldBand = {
  id: 'bold',
  label: 'Bold Band',
  orient: 'portrait',
  desc: 'Strong colour band, oversized name, large verification QR',
  front: (c) => shell('portrait', `
    <div style="flex-shrink:0;background:${c.primary};padding:3mm 4mm 2.5mm;display:flex;align-items:center;gap:2mm;">
      <div style="width:7mm;height:7mm;border-radius:1.5mm;background:#ffffff28;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.logoHtml}</div>
      <div style="min-width:0;">
        ${fitted(c.schoolName, 7, 27, 'font-weight:900;color:#fff;')}
        <div style="font-size:4.4pt;color:#ffffffb0;letter-spacing:0.6px;">${c.typeLabel}</div>
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;justify-content:center;padding:3mm 0 1.5mm;">
      <div style="width:24mm;height:28mm;border-radius:2mm;overflow:hidden;border:2px solid ${c.primary};flex-shrink:0;">${c.photoBox('100%', '100%')}</div>
    </div>
    <div style="flex-shrink:0;text-align:center;padding:0 3mm 1.5mm;">
      ${fitted(c.name, 10, 24, 'font-weight:900;color:#1F2430;')}
      <div style="display:inline-block;margin-top:1mm;font-size:5pt;font-weight:800;color:#fff;background:${c.secondary};padding:0.7mm 2.5mm;border-radius:99px;">${esc(c.subtitle)}</div>
    </div>
    <div style="flex:1;min-height:0;overflow:hidden;padding:0 4mm;">
      ${c.fields.slice(0, 4).map(([l, v]) => row(l, v, c)).join('')}
    </div>
    <div style="flex-shrink:0;display:flex;align-items:center;gap:2mm;padding:1.5mm 3mm;border-top:2px solid ${c.primary};">
      <div style="flex:1;min-width:0;">${c.barcode(84, 12)}</div>
      ${c.qr(26)}
    </div>`),
  back: (c) => shell('portrait', `
    <div style="flex-shrink:0;background:${c.primary};padding:3mm 4mm;font-size:6.5pt;font-weight:900;color:#fff;letter-spacing:0.5px;">CARD HOLDER TERMS</div>
    ${rulesBlock(c, c.rules.slice(0, 3))}
    <div style="flex-shrink:0;display:flex;justify-content:center;padding:1mm 0 1.5mm;">
      <div style="text-align:center;">
        ${c.qr(40)}
        <div style="font-size:4.4pt;color:#8A8F98;margin-top:0.8mm;">Scan to verify · ${c.id_}</div>
      </div>
    </div>
    <div style="flex-shrink:0;padding:0 4mm 1mm;">
      ${ruledRow('Phone', c.phone, c)}
      ${ruledRow('Address', c.address, c)}
    </div>
    ${signatureLine('Authorised Signature', c)}
    <div style="flex-shrink:0;height:3mm;background:${c.primary};"></div>`),
};

/* ══════════════════════════════════════════════════════════════════════
   Helpers for the designs below (6 — 11): they lay the card out with
   absolutely placed parts, on a fixed CR80 card.
   ══════════════════════════════════════════════════════════════════════ */
const HEX6 = /^#[0-9a-f]{6}$/i;
const mixHex = (a, b, t) => {
  const A = HEX6.test(a) ? a : '#1E3A5F';
  const p = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(p(A, i) + (p(b, i) - p(A, i)) * t).toString(16).padStart(2, '0')).join('')}`;
};
const darker = (h, t = 0.35) => mixHex(h, '#000000', t);
const lighter = (h, t = 0.35) => mixHex(h, '#ffffff', t);
const solid = (h) => (HEX6.test(h) ? h : '#1E3A5F');
const at = (style, inner = '') => `<div style="position:absolute;${style}">${inner}</div>`;

/* A faceted (low-poly) sheen over a colour: rows of triangles, each a little
   lighter or darker, the same on every card. */
const facets = (w, h, cols, rows, seed = 7) => {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const cw = w / cols; const rh = h / rows;
  let out = '';
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const x0 = (x * cw).toFixed(2); const y0 = (y * rh).toFixed(2); const x1 = ((x + 1) * cw).toFixed(2); const y1 = ((y + 1) * rh).toFixed(2);
      const flip = (x + y) % 2;
      const t1 = flip ? `${x0},${y0} ${x1},${y0} ${x0},${y1}` : `${x0},${y0} ${x1},${y0} ${x1},${y1}`;
      const t2 = flip ? `${x1},${y0} ${x1},${y1} ${x0},${y1}` : `${x0},${y0} ${x1},${y1} ${x0},${y1}`;
      out += `<polygon points="${t1}" fill="#fff" fill-opacity="${(0.03 + rnd() * 0.14).toFixed(3)}"/><polygon points="${t2}" fill="#000" fill-opacity="${(rnd() * 0.09).toFixed(3)}"/>`;
    }
  }
  return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="position:absolute;inset:0;display:block;">${out}</svg>`;
};

/* "Label  :  value", as on many school cards. */
const colonRow = (label, value, o = {}) => blank(value) ? '' : `
  <div style="display:flex;font-size:${o.size || '6pt'};line-height:1.55;color:${o.ink || '#4B5160'};">
    <span style="width:${o.labelW || '15mm'};flex-shrink:0;">${label}</span><span style="padding-right:1mm;">:</span>
    <span style="flex:1;min-width:0;color:${o.value || '#1F2430'};font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(value)}</span>
  </div>`;

/* LABEL in the card colour over an underlined value. */
const stackField = (label, value, c) => blank(value) ? '' : `
  <div style="margin-bottom:1.3mm;">
    <div style="font-size:5.3pt;font-weight:900;color:${c.primary};letter-spacing:0.4px;text-transform:uppercase;line-height:1.2;">${label}:</div>
    <div style="font-size:6pt;color:#1F2430;font-weight:600;border-bottom:0.25mm solid #9CA3AF;padding-bottom:0.4mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;">${esc(value)}</div>
  </div>`;

/* A photo, cut to a shape. */
const framedPhoto = (c, w, h, radius, ring = '', extra = '') =>
  `<div style="width:${w};height:${h};border-radius:${radius};overflow:hidden;${ring}${extra}">${c.photoBox('100%', '100%', radius === '50%')}</div>`;

/* The QR on a coloured tile, as on corporate cards. */
const qrTile = (c, sizeMm, bg) => `
  <div style="width:${sizeMm}mm;height:${sizeMm}mm;border-radius:2mm;background:${bg};display:flex;align-items:center;justify-content:center;box-shadow:0 0.6mm 1.6mm rgba(0,0,0,0.18);">
    <div style="background:#fff;border-radius:1mm;padding:0.6mm;line-height:0;">${c.qr(Math.round((sizeMm - 3.4) * 3.78))}</div>
  </div>`;

const logoBadge = (c, mm, bg = '#ffffff', pad = '0.6mm') =>
  `<div style="width:${mm}mm;height:${mm}mm;border-radius:50%;background:${bg};padding:${pad};flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">${c.logoHtml}</div>`;

/* Up to n detail rows: the record's own fields, then joining date, phone and blood group. */
const detailRows = (c, n) => [
  ...c.fields,
  ['Joined', c.joined],
  ['Phone', c.personPhone],
  ['Blood group', c.blood],
].filter(([, v]) => !blank(v)).slice(0, n);

const ifFound = (c) => c.rules.find((r) => /found|return/i.test(r)) || `If found, please return this card to ${c.schoolName}.`;

/* ══════════════════════════════════════════════════════════════════════
   6 — GEOMETRIC (landscape): faceted colour band, round photo, barcode
   ══════════════════════════════════════════════════════════════════════ */
const geometric = {
  id: 'geometric',
  label: 'Geometric',
  orient: 'landscape',
  for: 'both',
  desc: 'Faceted colour band, round photo on a white ring, barcode under the photo',
  front: (c) => {
    const band = `linear-gradient(115deg, ${lighter(c.primary, 0.22)} 0%, ${solid(c.primary)} 55%, ${darker(c.primary, 0.32)} 100%)`;
    return shell('landscape', `
    ${at(`left:0;top:0;right:0;height:23mm;background:${band};overflow:hidden;`, facets(86, 23, 9, 3, 11))}
    ${at(`left:0;right:0;bottom:0;height:4.2mm;background:linear-gradient(90deg, ${solid(c.secondary)}, ${lighter(c.secondary, 0.3)});overflow:hidden;`, facets(86, 4, 16, 1, 5))}
    ${at('left:36mm;right:4mm;top:3mm;display:flex;align-items:center;gap:1.6mm;', `
      <div style="width:6.5mm;height:6.5mm;flex-shrink:0;background:#ffffff26;border-radius:1.4mm;padding:0.5mm;">${c.logoHtml}</div>
      <div style="min-width:0;flex:1;">${fitted(c.schoolName, 6.6, 30, 'font-weight:700;color:#fff;')}</div>`)}
    ${at('left:36mm;right:2mm;top:12.5mm;font-size:12.5pt;font-weight:900;color:#fff;letter-spacing:0.2px;line-height:1;white-space:nowrap;', esc(c.cardTitle))}
    ${at('left:4.5mm;top:4.5mm;width:27mm;height:27mm;border-radius:50%;background:#fff;padding:1.1mm;box-shadow:0 1.2mm 3mm rgba(0,0,0,0.2);', framedPhoto(c, '100%', '100%', '50%'))}
    ${at('left:3.5mm;top:34mm;width:30mm;', c.barcode(110, 20))}
    ${at('left:36mm;right:3.5mm;top:25.2mm;bottom:5.5mm;overflow:hidden;', `
      ${fitted(c.name, 9, 26, 'font-weight:800;color:#1F2430;margin-bottom:1mm;')}
      ${detailRows(c, 4).map(([l, v]) => colonRow(l, v)).join('')}`)}`);
  },
  back: (c) => {
    const band = `linear-gradient(115deg, ${lighter(c.primary, 0.22)} 0%, ${solid(c.primary)} 55%, ${darker(c.primary, 0.32)} 100%)`;
    return shell('landscape', `
    ${at(`left:0;top:0;right:0;height:11mm;background:${band};overflow:hidden;`, `${facets(86, 11, 12, 2, 3)}
      <div style="position:absolute;left:4mm;right:4mm;top:0;bottom:0;display:flex;align-items:center;gap:2mm;">
        <div style="width:6mm;height:6mm;flex-shrink:0;background:#ffffff26;border-radius:1.3mm;padding:0.5mm;">${c.logoHtml}</div>
        <div style="flex:1;min-width:0;">${fitted(c.schoolName, 7, 44, 'font-weight:800;color:#fff;')}</div>
        <div style="flex-shrink:0;font-size:4.6pt;font-weight:800;color:#fff;border:0.25mm solid #ffffffaa;border-radius:99px;padding:0.5mm 1.8mm;letter-spacing:0.5px;">${c.typeLabel} CARD</div>
      </div>`)}
    ${at('left:4mm;top:13.5mm;width:52mm;bottom:8mm;overflow:hidden;', `
      <div style="font-size:6.4pt;font-weight:800;color:${c.primary};margin-bottom:1mm;">Rules &amp; Instructions</div>
      <ul style="margin:0 0 1.4mm;padding-left:3.2mm;font-size:5.3pt;color:#454B55;line-height:1.5;">${c.rules.slice(0, 4).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      ${colonRow('Phone', c.phone, { size: '5.6pt', labelW: '11mm' })}
      ${colonRow('Address', c.address, { size: '5.6pt', labelW: '11mm' })}`)}
    ${at('right:4.5mm;top:13.5mm;width:24mm;text-align:center;', `${codeChip(c.qr(72), '0.8mm')}<div style="font-size:4.6pt;color:#8A8F98;margin-top:0.6mm;">Scan to verify · ${esc(c.id_)}</div>`)}
    ${at('right:4mm;width:25mm;bottom:6mm;text-align:center;', `<div style="border-top:0.25mm solid ${c.primary}88;margin-bottom:0.6mm;"></div><div style="font-size:4.8pt;color:#8A8F98;text-transform:uppercase;letter-spacing:0.4px;">Principal</div>`)}
    ${c.validity ? at('left:4mm;bottom:5.6mm;font-size:5pt;color:#4B5160;', `Valid until <b style="color:#1F2430;">${esc(c.validity)}</b>`) : ''}
    ${at(`left:0;right:0;bottom:0;height:4.2mm;background:linear-gradient(90deg, ${solid(c.secondary)}, ${lighter(c.secondary, 0.3)});overflow:hidden;`, facets(86, 4, 16, 1, 9))}`);
  },
};

/* ══════════════════════════════════════════════════════════════════════
   7 — RIBBON (landscape): bold title, hanging ribbon with the logo
   ══════════════════════════════════════════════════════════════════════ */
const ribbon = {
  id: 'ribbon',
  label: 'Ribbon',
  orient: 'landscape',
  for: 'both',
  desc: 'Bold title, hanging ribbon with the logo, ringed photo, underlined fields',
  front: (c) => shell('landscape', `
    ${at('inset:0;background:linear-gradient(160deg,#ffffff 0%,#EEF1F5 100%);')}
    ${at(`left:-7mm;bottom:-9mm;width:36mm;height:22mm;background:${lighter(c.secondary, 0.45)};transform:rotate(16deg);border-radius:4mm;`)}
    ${at(`left:13mm;bottom:-14mm;width:19mm;height:19mm;background:${solid(c.primary)};transform:rotate(45deg);border-radius:2mm;`)}
    ${at(`right:3mm;bottom:3.5mm;width:6.5mm;height:6.5mm;border-radius:50%;border:0.45mm solid ${c.primary};opacity:0.55;`)}
    ${at(`right:6mm;bottom:3.5mm;width:6.5mm;height:6.5mm;border-radius:50%;border:0.45mm solid ${c.secondary};opacity:0.75;`)}
    ${at(`left:4.5mm;top:3.6mm;right:30mm;font-size:11.5pt;font-weight:900;color:${c.primary};letter-spacing:0.3px;line-height:1.05;text-transform:uppercase;font-family:'Arial Black',Arial,sans-serif;`, esc(c.cardTitle))}
    ${at(`right:4mm;top:0;width:23mm;height:21mm;background:${solid(c.primary)};clip-path:polygon(0 0,100% 0,100% 100%,50% 84%,0 100%);display:flex;flex-direction:column;align-items:center;padding:1.8mm 1.5mm 0;text-align:center;`, `
      ${logoBadge(c, 7.5)}
      <div style="margin-top:0.7mm;width:100%;">${fitted(c.schoolName.toUpperCase(), 4.6, 17, 'font-weight:800;color:#fff;letter-spacing:0.1px;', 3)}</div>`)}
    ${at(`left:4.5mm;top:14.5mm;width:25mm;height:25mm;border-radius:50%;background:#fff;padding:0.8mm;border:0.9mm solid ${c.primary};`, framedPhoto(c, '100%', '100%', '50%'))}
    ${at('left:33mm;right:4mm;top:21.5mm;overflow:hidden;height:20mm;', `
      ${stackField('Name', c.name, c)}
      ${stackField(c.fields[0]?.[0] || 'ID', c.id_, c)}
      ${stackField(c.typeLabel === 'STUDENT' ? 'Class' : 'Designation', c.subtitle, c)}`)}
    ${at('left:33mm;width:30mm;bottom:2.2mm;', c.barcode(110, 14))}
    ${c.validity ? at('left:4mm;bottom:3mm;font-size:4.8pt;color:#1F2430;line-height:1.3;', `<b style="letter-spacing:0.4px;">VALID UNTIL</b><br>${esc(c.validity)}`) : ''}`),
  back: (c) => shell('landscape', `
    ${at('inset:0;background:linear-gradient(160deg,#ffffff 0%,#EEF1F5 100%);')}
    ${at(`left:4mm;top:0;width:21mm;height:24mm;background:${solid(c.primary)};clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%);display:flex;flex-direction:column;align-items:center;padding:2mm 1.4mm 0;text-align:center;`, `
      ${logoBadge(c, 8)}
      <div style="margin-top:0.7mm;width:100%;">${fitted(c.schoolName.toUpperCase(), 4.5, 15, 'font-weight:800;color:#fff;', 3)}</div>`)}
    ${at('left:29mm;right:28mm;top:4mm;bottom:9mm;overflow:hidden;', `
      <div style="font-size:6.6pt;font-weight:900;color:${c.primary};letter-spacing:0.4px;margin-bottom:1.2mm;">INSTRUCTIONS</div>
      <ul style="margin:0;padding-left:3mm;font-size:5.2pt;color:#454B55;line-height:1.5;">${c.rules.slice(0, 4).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`)}
    ${at('right:4mm;top:4.5mm;width:22mm;text-align:center;', `${codeChip(c.qr(68), '0.8mm')}<div style="font-size:4.5pt;color:#8A8F98;margin-top:0.5mm;">${esc(c.id_)}</div>`)}
    ${at('left:4mm;right:4mm;bottom:3mm;display:flex;gap:4mm;align-items:flex-end;', `
      <div style="flex:1;min-width:0;">${colonRow('Phone', c.phone, { size: '5.4pt', labelW: '10mm' })}${colonRow('Address', c.address, { size: '5.4pt', labelW: '10mm' })}</div>
      <div style="width:24mm;flex-shrink:0;text-align:center;"><div style="border-top:0.25mm solid ${c.primary}88;margin-bottom:0.5mm;"></div><div style="font-size:4.6pt;color:#8A8F98;text-transform:uppercase;letter-spacing:0.4px;">Principal</div></div>`)}`),
};

/* ══════════════════════════════════════════════════════════════════════
   8 — PLAYFUL (portrait): shapes and stars, big ringed photo — juniors
   ══════════════════════════════════════════════════════════════════════ */
const playDecor = (c, flip = false) => {
  const side = (l) => (flip ? `right:${l}` : `left:${l}`);
  const other = (l) => (flip ? `left:${l}` : `right:${l}`);
  return [
    at(`${other('-7mm')};top:-7mm;width:19mm;height:19mm;border-radius:50%;background:${lighter(c.secondary, 0.55)};`),
    at(`${side('-9mm')};bottom:${flip ? '13mm' : '-4mm'};width:17mm;height:17mm;border-radius:50%;background:${lighter(c.primary, 0.84)};`),
    at(`${other('-6.5mm')};top:${flip ? '47mm' : '31mm'};width:12mm;height:12mm;border-radius:50%;border:1.5mm solid #1F2937;`),
    ...[0, 1, 2].map((i) => at(`${side(`${-3 + i * 2.6}mm`)};top:${1 + i * 2.6}mm;width:12mm;height:0.55mm;background:#1F2937;transform:rotate(-45deg);transform-origin:left center;`)),
    at(`${side('4mm')};top:38mm;font-size:9pt;font-weight:900;color:${lighter(c.primary, 0.35)};line-height:1;`, '✕'),
    at(`${other('5mm')};bottom:20mm;font-size:8pt;font-weight:900;color:${lighter(c.primary, 0.35)};line-height:1;`, '✕'),
    at(`${other('9mm')};top:13mm;font-size:6pt;color:${c.secondary};line-height:1;`, '★'),
    at(`${side('7mm')};bottom:6mm;font-size:5pt;color:${c.secondary};line-height:1;`, '★'),
    at(`${side('3mm')};bottom:11mm;width:7mm;height:5mm;background-image:radial-gradient(${c.primary} 0.32mm, transparent 0.38mm);background-size:1.5mm 1.5mm;opacity:0.6;`),
  ].join('');
};
const playful = {
  id: 'playful',
  label: 'Playful',
  orient: 'portrait',
  for: 'students',
  desc: 'Bright shapes and stars, big ringed photo, name band; terms and large QR on the back',
  front: (c) => shell('portrait', `
    ${playDecor(c)}
    ${at('left:4mm;right:8mm;top:4mm;display:flex;align-items:center;gap:1.4mm;', `
      <div style="width:6mm;height:6mm;flex-shrink:0;">${c.logoHtml}</div>
      <div style="min-width:0;flex:1;">${fitted(c.schoolName, 5.6, 26, `font-weight:800;color:${darker(c.primary, 0.3)};`)}</div>`)}
    ${at(`left:50%;top:12mm;transform:translateX(-50%);width:30mm;height:30mm;border-radius:50%;background:${solid(c.secondary)};padding:1.3mm;`, framedPhoto(c, '100%', '100%', '50%', 'border:0.7mm solid #fff;box-sizing:border-box;'))}
    ${at('left:0;right:0;top:45mm;bottom:2mm;display:flex;flex-direction:column;align-items:center;', `
      <div style="width:100%;background:${lighter(c.primary, 0.84)};padding:1.3mm 3mm;text-align:center;">
        ${fitted(c.name.toUpperCase(), 11, 17, `font-family:'Arial Narrow','Roboto Condensed',Arial,sans-serif;font-weight:900;color:${darker(c.primary, 0.45)};letter-spacing:0.3px;`)}
      </div>
      <div style="font-size:7pt;color:${c.primary};font-weight:700;margin-top:0.8mm;">${esc(c.typeLabel === 'STUDENT' ? 'Student' : c.subtitle)}</div>
      <div style="width:100%;box-sizing:border-box;padding:1mm 6mm 0;">
        ${[[c.fields[0]?.[0] || 'ID', c.id_], [c.typeLabel === 'STUDENT' ? 'Class' : 'Department', c.typeLabel === 'STUDENT' ? c.subtitle : (c.fields.find(([l]) => l === 'Department') || [])[1]], ['Joined', c.joined]]
          .map(([l, v]) => colonRow(l, v, { size: '5.6pt', labelW: '13mm' })).join('')}
      </div>
      <div style="flex:1;"></div>
      <div style="width:36mm;">${c.barcode(136, 15)}</div>`)}`),
  back: (c) => shell('portrait', `
    ${playDecor(c, true)}
    ${at('left:4mm;right:4mm;top:6mm;display:flex;flex-direction:column;align-items:center;text-align:center;', `
      <div style="width:9mm;height:9mm;">${c.logoHtml}</div>
      <div style="width:100%;margin-top:0.8mm;">${fitted(c.schoolName, 6, 26, `font-weight:800;color:${darker(c.primary, 0.3)};`)}</div>
      <div style="font-size:7.5pt;font-weight:900;color:#1F2430;margin-top:2.4mm;">Terms &amp; Conditions</div>
      <div style="font-size:5.2pt;color:#4B5160;line-height:1.5;margin-top:1mm;padding:0 2.5mm;">${c.rules.slice(0, 4).map(esc).join(' ')}</div>
      <div style="margin-top:2.6mm;">${codeChip(c.qr(86), '1mm')}</div>
      <div style="font-size:5pt;color:#8A8F98;margin-top:0.6mm;">${esc(c.id_)}</div>
      <div style="font-size:5.4pt;color:#1F2430;font-weight:700;margin-top:2mm;">${esc([c.phone, c.email].filter(Boolean).join('  ·  '))}</div>
      <div style="font-size:5pt;color:#4B5160;margin-top:0.5mm;">${esc(c.website || c.address || '')}</div>`)}`),
};

/* ══════════════════════════════════════════════════════════════════════
   9 — DIAGONAL (portrait): angled colour bands, QR tile — staff cards
   ══════════════════════════════════════════════════════════════════════ */
const diagonalShapes = (c, flip = false) => {
  const poly = (pts) => (flip ? pts.map(([x, y]) => [100 - x, y]) : pts).map(([x, y]) => `${x}% ${y}%`).join(',');
  return at(`inset:0;background:${lighter(c.secondary, 0.1)};clip-path:polygon(${poly([[0, 14], [38, 34], [38, 54], [0, 78]])});`)
    + at(`inset:0;background:${darker(c.primary, 0.35)};clip-path:polygon(${poly([[0, 6], [28, 22], [28, 84], [0, 100]])});`);
};
const diagonal = {
  id: 'diagonal',
  label: 'Diagonal',
  orient: 'portrait',
  for: 'staff',
  desc: 'Angled colour bands, framed photo, QR tile; contact details on the back',
  front: (c) => shell('portrait', `
    ${diagonalShapes(c)}
    ${at('left:17mm;right:3mm;top:3mm;display:flex;align-items:center;gap:1.3mm;', `
      <div style="width:6mm;height:6mm;flex-shrink:0;">${c.logoHtml}</div>
      <div style="min-width:0;flex:1;">${fitted(c.schoolName, 5.4, 22, `font-weight:800;color:${darker(c.primary, 0.3)};`)}</div>`)}
    ${at('left:21mm;top:12mm;width:28mm;height:34mm;border-radius:2.5mm;background:#fff;padding:0.8mm;box-shadow:0 1mm 3mm rgba(0,0,0,0.18);', framedPhoto(c, '100%', '100%', '2mm'))}
    ${at('left:17mm;right:3mm;top:49mm;', `
      ${fitted(c.name.toUpperCase(), 8.2, 18, `font-weight:900;color:${darker(c.primary, 0.4)};letter-spacing:0.2px;`, 3)}
      <div style="font-size:6pt;font-weight:700;color:${darker(c.secondary, 0.15)};margin-top:0.4mm;">${esc(c.subtitle)}</div>
      <div style="font-size:5.6pt;color:#4B5160;margin-top:0.8mm;line-height:1.5;">${esc(c.id_)}${c.personPhone ? `<br>${esc(c.personPhone)}` : ''}</div>`)}
    ${at('left:3.5mm;bottom:3.5mm;', qrTile(c, 14, '#ffffff'))}
    ${at('left:20mm;right:3mm;bottom:2.4mm;', c.barcode(110, 13))}`),
  back: (c) => shell('portrait', `
    ${diagonalShapes(c, true)}
    ${at('right:4mm;top:4mm;width:8mm;height:8mm;', c.logoHtml)}
    ${at('left:4mm;right:21mm;top:13mm;', `
      <div style="font-size:6.2pt;font-weight:900;color:${darker(c.primary, 0.3)};letter-spacing:0.4px;margin-bottom:1.4mm;">${c.typeLabel} DETAILS</div>
      ${[...detailRows(c, 5), ['Email', c.email], ['Address', c.address]].filter(([, v]) => !blank(v)).slice(0, 7)
        .map(([l, v]) => colonRow(l, v, { size: '5.4pt', labelW: '12mm' })).join('')}
      <div style="font-size:5pt;color:#6B7280;line-height:1.45;margin-top:1.6mm;">${esc(ifFound(c))}</div>`)}
    ${at('left:4mm;right:17mm;bottom:5mm;', `
      ${fitted(c.schoolName.toUpperCase(), 7.6, 20, `font-weight:900;color:${darker(c.primary, 0.4)};letter-spacing:0.2px;`, 3)}
      <div style="font-size:5.4pt;font-weight:700;color:${darker(c.secondary, 0.15)};margin-top:0.4mm;letter-spacing:0.4px;">${c.typeLabel} IDENTITY CARD</div>`)}`),
};

/* ══════════════════════════════════════════════════════════════════════
   10 — NIGHT CURVE (portrait): dark card, white curved photo panel
   ══════════════════════════════════════════════════════════════════════ */
const night = {
  id: 'night',
  label: 'Night Curve',
  orient: 'portrait',
  for: 'staff',
  desc: 'Dark card, white curved panel with the photo, accent curve, QR tile',
  front: (c) => shell('portrait', `
    ${at(`inset:0;background:linear-gradient(170deg, ${darker(c.primary, 0.45)} 0%, ${darker(c.primary, 0.62)} 100%);`)}
    ${at(`right:0;top:8.5mm;width:31.5mm;bottom:9mm;background:${solid(c.secondary)};border-radius:60% 0 0 60% / 50% 0 0 50%;`)}
    ${at('right:0;top:9.5mm;width:30mm;bottom:10mm;background:#fff;border-radius:60% 0 0 60% / 50% 0 0 50%;overflow:hidden;', at('right:1.8mm;top:12mm;width:25mm;height:40mm;border-radius:12.5mm 12.5mm 2mm 2mm;overflow:hidden;', c.photoBox('100%', '100%')))}
    ${at('left:3.5mm;right:3.5mm;top:3mm;display:flex;align-items:center;gap:1.3mm;', `
      <div style="width:5.5mm;height:5.5mm;flex-shrink:0;background:#ffffff1f;border-radius:1.2mm;padding:0.4mm;">${c.logoHtml}</div>
      <div style="min-width:0;flex:1;">${fitted(c.schoolName, 5.2, 28, 'font-weight:700;color:#fff;')}</div>`)}
    ${at('left:3.5mm;width:21mm;top:17mm;', `
      ${fitted(c.name.toUpperCase(), 7.4, 11, 'font-weight:900;color:#fff;letter-spacing:0.1px;', 4)}
      <div style="font-size:5.6pt;font-weight:700;color:${lighter(c.secondary, 0.25)};margin-top:0.8mm;line-height:1.25;">${esc(c.subtitle)}</div>
      <div style="font-size:5.2pt;color:#ffffffcc;margin-top:1.4mm;line-height:1.5;">${esc(c.id_)}${c.personPhone ? `<br>${esc(c.personPhone)}` : ''}${c.blood ? `<br>Blood ${esc(c.blood)}` : ''}</div>`)}
    ${at('left:3.5mm;bottom:3.2mm;', qrTile(c, 13.5, '#ffffff'))}
    ${at('right:3.5mm;bottom:3.4mm;text-align:right;font-size:5pt;color:#ffffffb3;letter-spacing:0.6px;font-weight:700;', `${c.typeLabel}<br>IDENTITY CARD`)}`),
  back: (c) => shell('portrait', `
    ${at(`inset:0;background:linear-gradient(170deg, ${darker(c.primary, 0.45)} 0%, ${darker(c.primary, 0.62)} 100%);`)}
    ${at(`right:0;top:6mm;width:17.5mm;bottom:22mm;background:${solid(c.secondary)};border-radius:60% 0 0 60% / 50% 0 0 50%;`)}
    ${at(`right:0;top:7mm;width:16.5mm;bottom:23mm;border-radius:60% 0 0 60% / 50% 0 0 50%;background-color:${darker(c.primary, 0.25)};background-image:repeating-conic-gradient(#ffffff26 0 25%, transparent 0 50%);background-size:3mm 3mm;`)}
    ${at('left:3.5mm;right:20mm;top:4mm;', `
      <div style="width:7mm;height:7mm;background:#ffffff1f;border-radius:1.4mm;padding:0.5mm;">${c.logoHtml}</div>
      <div style="font-size:6.2pt;font-weight:900;color:#fff;letter-spacing:0.5px;margin:2mm 0 1mm;">INSTRUCTIONS</div>
      <ul style="margin:0;padding-left:2.8mm;font-size:5pt;color:#ffffffd9;line-height:1.5;">${c.rules.slice(0, 4).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      ${colonRow('Phone', c.phone, { size: '5pt', labelW: '9mm', ink: '#ffffffb3', value: '#fff' })}`)}
    ${at('left:3.5mm;right:3.5mm;bottom:12mm;', `
      ${fitted(c.schoolName.toUpperCase(), 7.6, 24, 'font-weight:900;color:#fff;letter-spacing:0.3px;')}
      <div style="font-size:5.2pt;color:${lighter(c.secondary, 0.25)};font-weight:700;margin-top:0.4mm;letter-spacing:0.4px;">${esc(c.address || `${c.typeLabel} IDENTITY CARD`)}</div>`)}
    ${at('left:3.5mm;right:3.5mm;bottom:2.5mm;', codeChip(c.barcode(160, 13), '0.6mm 1mm'))}`),
};

/* ══════════════════════════════════════════════════════════════════════
   11 — ARCH (portrait): large rounded D shape, accent arch, QR tile
   ══════════════════════════════════════════════════════════════════════ */
const arch = {
  id: 'arch',
  label: 'Arch',
  orient: 'portrait',
  for: 'both',
  desc: 'Large rounded colour arch behind the photo, accent shape, QR tile',
  front: (c) => shell('portrait', `
    ${at(`right:0;top:8mm;width:39mm;height:50mm;background:${darker(c.primary, 0.2)};border-radius:25mm 0 0 25mm;`)}
    ${at(`left:0;top:30mm;width:20mm;height:25mm;background:${solid(c.secondary)};border-radius:0 12.5mm 12.5mm 0;`)}
    ${at('left:3.5mm;right:3.5mm;top:2.4mm;display:flex;align-items:center;gap:1.3mm;', `
      <div style="width:5.5mm;height:5.5mm;flex-shrink:0;">${c.logoHtml}</div>
      <div style="min-width:0;flex:1;">${fitted(c.schoolName, 5.4, 28, `font-weight:800;color:${darker(c.primary, 0.3)};`)}</div>`)}
    ${at('left:12.5mm;top:13mm;width:29mm;height:36mm;border-radius:14.5mm 14.5mm 2.5mm 2.5mm;background:#fff;padding:0.9mm;box-shadow:0 1.2mm 3mm rgba(0,0,0,0.22);', framedPhoto(c, '100%', '100%', '13.6mm 13.6mm 1.8mm 1.8mm'))}
    ${at('right:3.5mm;top:51mm;font-size:5pt;color:#ffffffcc;font-weight:800;letter-spacing:0.6px;text-align:right;', c.typeLabel)}
    ${at('left:4mm;right:20mm;top:60mm;', `
      ${fitted(c.name.toUpperCase(), 8.2, 16, `font-weight:900;color:${darker(c.primary, 0.4)};letter-spacing:0.2px;`, 3)}
      <div style="font-size:6pt;font-weight:700;color:${darker(c.secondary, 0.25)};margin-top:0.5mm;">${esc(c.subtitle)}</div>
      <div style="font-size:5.4pt;color:#4B5160;margin-top:0.8mm;">${esc(c.id_)}</div>`)}
    ${at('right:3.5mm;bottom:3.5mm;', qrTile(c, 14, darker(c.primary, 0.2)))}`),
  back: (c) => shell('portrait', `
    ${at(`left:0;top:6mm;width:40mm;height:44mm;background:${darker(c.primary, 0.2)};border-radius:0 22mm 22mm 0;display:flex;flex-direction:column;justify-content:center;padding:0 9mm 0 4mm;`, `
      ${logoBadge(c, 9)}
      <div style="margin-top:1.4mm;">${fitted(c.schoolName.toUpperCase(), 7, 18, 'font-weight:900;color:#fff;letter-spacing:0.2px;')}</div>
      <div style="font-size:5pt;color:${lighter(c.secondary, 0.2)};font-weight:700;margin-top:0.6mm;letter-spacing:0.5px;">${c.typeLabel} IDENTITY CARD</div>`)}
    ${at(`right:0;top:30mm;width:14mm;height:24mm;background:${solid(c.secondary)};border-radius:12mm 0 0 12mm;`)}
    ${at('left:4mm;right:4mm;top:53mm;', `
      ${detailRows(c, 4).map(([l, v]) => colonRow(l, v, { size: '5.4pt', labelW: '13mm' })).join('')}
      <div style="font-size:4.8pt;color:#6B7280;line-height:1.4;margin-top:1mm;">${esc(ifFound(c))}${c.phone ? ` Phone <span style="white-space:nowrap;">${esc(c.phone)}</span>.` : ''}</div>`)}
    ${at('left:4mm;right:4mm;bottom:2.4mm;', c.barcode(150, 12))}`),
};

/* for: who a design suits best (both, students, staff); any can be printed for either. */
export const TEMPLATES = [academic, campusArc, executive, minimal, boldBand, geometric, ribbon, playful, diagonal, night, arch].map((t) => ({ for: 'both', ...t }));

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
