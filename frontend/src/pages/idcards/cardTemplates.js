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

/* A labelled detail row. Values are clipped, never wrapped, so a long name
   cannot quietly push the rest of the card out of view. */
const row = (label, value, c) => blank(value) ? '' : `
  <div style="display:flex;margin-bottom:${c.dense ? '0.9mm' : '1.3mm'};font-size:${c.dense ? '5.6pt' : '6pt'};">
    <span style="color:#8A8F98;width:${c.labelW || '17mm'};flex-shrink:0;">${label}</span>
    <span style="color:#1F2430;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${value}</span>
  </div>`;

/* Same, but ruled — the underlined field style the reference cards use. */
const ruledRow = (label, value, c) => blank(value) ? '' : `
  <div style="display:flex;align-items:baseline;gap:2mm;padding-bottom:1mm;margin-bottom:1.1mm;border-bottom:1px solid ${c.primary}22;font-size:6pt;">
    <span style="color:#8A8F98;width:${c.labelW || '17mm'};flex-shrink:0;">${label}</span>
    <span style="color:#1F2430;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${value}</span>
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
        <div style="text-align:left;min-width:0;">
          <div style="font-size:7.5pt;font-weight:900;color:#fff;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.schoolName}</div>
          <div style="font-size:4.6pt;color:#ffffffbb;letter-spacing:0.5px;">${c.typeLabel} IDENTITY CARD</div>
        </div>
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;justify-content:center;margin-top:-6mm;position:relative;z-index:2;">
      <div style="width:19mm;height:19mm;border-radius:50%;overflow:hidden;border:2.5px solid ${c.secondary};box-shadow:0 2px 8px rgba(0,0,0,0.22);">${c.photoBox('100%', '100%', true)}</div>
    </div>
    <div style="flex-shrink:0;text-align:center;padding:1.5mm 3mm 1mm;">
      <div style="font-size:9.5pt;font-weight:900;color:#1F2430;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</div>
      <div style="font-size:5.8pt;color:${c.primary};font-weight:700;margin-top:0.4mm;">${c.subtitle}</div>
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
          <div style="font-size:8pt;font-weight:900;color:#fff;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.schoolName}</div>
          <div style="font-size:4.6pt;color:${c.primary};font-weight:700;letter-spacing:0.6px;">${c.typeLabel} CARD</div>
        </div>
        <div style="margin-left:auto;width:8mm;height:8mm;border-radius:50%;background:#ffffff1f;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${c.logoHtml}</div>
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;justify-content:center;margin-top:-9mm;position:relative;z-index:2;">
      <div style="width:21mm;height:21mm;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.25);">${c.photoBox('100%', '100%', true)}</div>
    </div>
    <div style="flex-shrink:0;text-align:center;padding:1.5mm 3mm 1mm;">
      <div style="font-size:9.5pt;font-weight:900;color:${c.dark};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</div>
      <div style="font-size:5.8pt;color:${c.primary};font-weight:800;letter-spacing:0.3px;text-transform:uppercase;">${c.subtitle}</div>
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
        <div style="font-size:7pt;font-weight:900;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.schoolName}</div>
        <div style="font-size:4.4pt;color:#ffffffb0;letter-spacing:0.5px;">${c.typeLabel} IDENTITY CARD</div>
      </div>
    </div>
    <div style="flex:1;min-height:0;display:flex;">
      <div style="width:23mm;flex-shrink:0;background:${c.primary}12;display:flex;align-items:center;justify-content:center;padding:2mm;">
        <div style="width:16mm;height:19mm;border-radius:1.5mm;overflow:hidden;border:1.5px solid ${c.primary}55;flex-shrink:0;">${c.photoBox('100%', '100%')}</div>
      </div>
      <div style="flex:1;min-width:0;overflow:hidden;padding:2mm 3mm;">
        <div style="font-size:8.5pt;font-weight:900;color:#1F2430;margin-bottom:0.5mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</div>
        <div style="display:inline-block;font-size:5pt;font-weight:800;color:#fff;background:${c.secondary};padding:0.6mm 2mm;border-radius:99px;margin-bottom:1.5mm;">${c.subtitle}</div>
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
          <div style="font-size:6.5pt;font-weight:800;color:${c.primary};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.schoolName}</div>
        </div>
        <div style="flex:1;min-height:0;display:flex;gap:2.5mm;">
          <div style="flex:1;min-width:0;overflow:hidden;">
            <div style="font-size:9pt;font-weight:900;color:#1F2430;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</div>
            <div style="font-size:5.4pt;color:#8A8F98;margin-bottom:1.5mm;">${c.subtitle}</div>
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
          Please return this card to ${c.schoolName}. ${c.rules[1] || ''}
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
        <div style="font-size:7pt;font-weight:900;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.schoolName}</div>
        <div style="font-size:4.4pt;color:#ffffffb0;letter-spacing:0.6px;">${c.typeLabel}</div>
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;justify-content:center;padding:3mm 0 1.5mm;">
      <div style="width:24mm;height:28mm;border-radius:2mm;overflow:hidden;border:2px solid ${c.primary};flex-shrink:0;">${c.photoBox('100%', '100%')}</div>
    </div>
    <div style="flex-shrink:0;text-align:center;padding:0 3mm 1.5mm;">
      <div style="font-size:10pt;font-weight:900;color:#1F2430;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.name}</div>
      <div style="display:inline-block;margin-top:1mm;font-size:5pt;font-weight:800;color:#fff;background:${c.secondary};padding:0.7mm 2.5mm;border-radius:99px;">${c.subtitle}</div>
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

export const TEMPLATES = [academic, campusArc, executive, minimal, boldBand];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
