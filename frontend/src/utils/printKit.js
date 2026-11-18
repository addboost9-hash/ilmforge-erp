/**
 * The school's printed documents in one formal style: result cards, the
 * result sheet, the annual result card, date sheets and the rest.
 *
 *   docColor(preferred)          the colour documents print in: the school's chosen
 *                                colour, deepened until it prints dark on paper; navy
 *   kitCss(color)                the styles below, for one colour
 *   letterhead(school, { right, compact })
 *                                logo (or monogram), the name in a formal serif, the
 *                                motto, address and contact lines, a double rule
 *   titleRibbon(title, sub)      the document's title between two gold lines
 *   watermark(school)            the logo, faint, behind the page
 *   fields([[label, value, { wide }]])   form-style details: label over a dotted value
 *   stats([[value, label, cls]]) the figures strip (marks, percentage, grade, position…)
 *   seal(passed)                 PASSED / FAILED, set like a rubber stamp
 *   bar(pct, fail)               a small bar for a percentage
 *   signatures([{ label, name, img, stamp }])   lines to sign on, the stamp on one
 *   footer(left, right)
 *   gradeScale(grades)           [{ grade, from, to }] from { minPercent, grade } bands
 *   docHTML({ title, css, body, size, margin })  the whole document
 *
 * Fonts are the ones every Windows computer has, so the desktop app prints
 * the same without the internet.
 */
import useAuthStore from '../store/auth.store';
import { stampImg, STAMP_CSS } from './schoolStamp';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Only pictures: embedded images, web addresses or the app's own files. */
export const pic = (v) => {
  const s = String(v || '').trim();
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s) || /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : '';
};
export const initials = (name) => String(name || 'School').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const ordinal = (n) => (n ? `${n}${[, 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'}` : '—');
/** 17 Nov 2026 (a Date, an ISO string, or YYYY-MM-DD). */
export const longDate = (d) => {
  if (!d) return '';
  const t = /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(`${d}T00:00:00`) : new Date(d);
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const num = (n) => (Number.isInteger(Number(n)) ? String(Number(n)) : String(Math.round(Number(n) * 100) / 100));
export const fmtNum = (n) => (n === null || n === undefined || n === '' ? '—' : num(n));

/* ── Colour ────────────────────────────────────────────────────────────── */
const HEX = /^#[0-9a-f]{6}$/i;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
export const mix = (a, b, amount) => toHex(rgb(a).map((x, i) => x + (rgb(b)[i] - x) * amount));
export const tint = (hex, amount) => mix(HEX.test(hex) ? hex : '#1B2F6E', '#ffffff', amount);
const lum = (h) => { const [r, g, b] = rgb(h).map((x) => { const c = x / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const NAVY = '#1B2F6E';
export const GOLD = '#A8873A';
const APP_DEFAULT = '#0d9488'; // the app's own teal, not a colour the school chose

export function brand() {
  const b = (() => { try { return useAuthStore.getState()?.branding || {}; } catch { return {}; } })();
  const ls = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  return { color: b.primaryColor || ls('brandPrimaryColor'), motto: String(b.motto || ls('brandMotto') || '').trim() };
}

export function docColor(preferred) {
  const chosen = [preferred, brand().color].find((c) => HEX.test(String(c || '')) && String(c).toLowerCase() !== APP_DEFAULT);
  let c = chosen || NAVY;
  for (let i = 0; i < 8 && lum(c) > 0.09; i += 1) c = mix(c, '#000000', 0.16);
  return c;
}

/* ── Styles ────────────────────────────────────────────────────────────── */
export const SERIF = "Cambria, 'Book Antiqua', Georgia, 'Times New Roman', serif";
export const SANS = "'Segoe UI', Calibri, Arial, sans-serif";

export function kitCss(color = NAVY) {
  const c = color;
  return `
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{font-family:${SANS};color:#111827;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .k-page{position:relative;break-after:page;page-break-after:always}
  .k-page:last-child{break-after:auto;page-break-after:auto}
  .k-frame{border:1.3pt solid ${c};padding:1.1mm}
  .k-in{border:.6pt solid ${GOLD};padding:6mm 7mm 4.5mm;position:relative;display:flex;flex-direction:column}
  .k-in > *{position:relative;z-index:1}
  .k-wm{position:absolute !important;inset:0;z-index:0 !important;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:hidden}
  .k-wm img{width:58%;max-height:62%;object-fit:contain;opacity:.055;filter:grayscale(100%)}
  .k-wm span{font:700 150pt/1 ${SERIF};color:${c};opacity:.045;letter-spacing:-4pt}

  .k-lh{display:flex;align-items:center;gap:5mm}
  .k-lh-logo{flex:none;width:21mm;height:21mm;display:flex;align-items:center;justify-content:center}
  .k-lh-logo img{max-width:100%;max-height:100%;object-fit:contain}
  .k-mono{width:19mm;height:19mm;border-radius:50%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font:700 17pt ${SERIF};box-shadow:inset 0 0 0 .8mm ${c},inset 0 0 0 1.1mm ${GOLD}}
  .k-lh-main{flex:1;min-width:0;text-align:center}
  .k-lh-name{font:700 21pt/1.08 ${SERIF};color:${c};text-transform:uppercase;letter-spacing:.6pt}
  .k-lh-motto{font:italic 9.5pt ${SERIF};color:${GOLD};margin-top:.8mm}
  .k-lh-line{font-size:8.3pt;color:#4B5563;margin-top:.6mm;line-height:1.3}
  .k-lh-side{flex:none;min-width:21mm;display:flex;justify-content:flex-end}
  .k-lh.compact .k-lh-logo,.k-lh.compact .k-lh-side{width:15mm;height:15mm}
  .k-lh.compact .k-mono{width:14mm;height:14mm;font-size:12pt}
  .k-lh.compact .k-lh-name{font-size:16pt}
  .k-rule{height:2.4pt;background:${c};margin-top:2.2mm;position:relative}
  .k-rule::after{content:'';position:absolute;left:0;right:0;top:calc(100% + .9pt);height:.7pt;background:${GOLD}}

  .k-title{display:flex;align-items:center;gap:4mm;margin:4.5mm 0 1mm}
  .k-title i{flex:1;height:.7pt;background:${GOLD}}
  .k-title b{flex:none;background:${c};color:#fff;font:700 11.5pt ${SANS};letter-spacing:2.2pt;text-transform:uppercase;padding:1.5mm 6mm;border-radius:.8mm}
  .k-sub{text-align:center;font:600 10.5pt ${SERIF};color:${c};margin-bottom:3.5mm}

  .k-kv{display:grid;grid-template-columns:1fr 1fr;gap:2.2mm 7mm;align-content:start}
  .k-who > .k-kv{flex:1;min-width:0}
  .k-f{display:flex;flex-direction:column;min-width:0}
  .k-f.wide{grid-column:1 / -1}
  .k-l{font-size:6.8pt;text-transform:uppercase;letter-spacing:.7pt;color:#6B7280;font-weight:600}
  .k-v{font-size:10.5pt;font-weight:700;color:#111827;border-bottom:.7pt dotted #9CA3AF;padding:.4mm 0 .8mm;min-height:5.4mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .k-v.big{font:700 13pt ${SERIF};color:${c}}
  .k-who{display:flex;gap:6mm;align-items:stretch}
  .k-photo{flex:none;width:28mm;height:34mm;border:.8pt solid ${c};padding:.8mm;background:#fff}
  .k-photo div{width:100%;height:100%;background:${tint(c, 0.95)};display:flex;align-items:center;justify-content:center;text-align:center;font-size:7pt;color:#9CA3AF;overflow:hidden}
  .k-photo img{width:100%;height:100%;object-fit:cover}
  .k-idbox{border:1.1pt solid ${c};border-radius:1.2mm;text-align:center;padding:1mm 2mm;min-width:25mm;background:#fff}
  .k-idbox small{display:block;font-size:6.3pt;text-transform:uppercase;letter-spacing:.7pt;color:#6B7280}
  .k-idbox b{display:block;font:700 13pt 'Consolas','Courier New',monospace;color:${c};white-space:nowrap}
  .k-idbox b.s{font-size:10.5pt}

  .k-tbl{width:100%;border-collapse:collapse}
  .k-tbl th{background:${c};color:#fff;font:700 7.6pt ${SANS};text-transform:uppercase;letter-spacing:.5pt;padding:1.8mm 2mm;border:.6pt solid ${c};text-align:left}
  .k-tbl td{padding:1.6mm 2mm;border:.6pt solid ${tint(c, 0.72)};font-size:9.6pt;vertical-align:middle}
  .k-tbl tbody tr:nth-child(even) td{background:${tint(c, 0.955)}}
  .k-tbl .c{text-align:center}.k-tbl .r{text-align:right}
  .k-tbl .num{text-align:center;font-variant-numeric:tabular-nums}
  .k-tbl td.sub{font-weight:700}
  .k-tbl tfoot td{background:${tint(c, 0.86)} !important;font-weight:800;color:${c};border-color:${tint(c, 0.6)}}
  .k-tbl .bad{color:#B91C1C;font-weight:800}
  .k-tbl .muted{color:#9CA3AF}
  .k-bar{display:inline-block;width:15mm;height:1.6mm;background:${tint(c, 0.84)};border-radius:1mm;vertical-align:middle;margin-left:1.6mm;overflow:hidden}
  .k-bar i{display:block;height:100%;background:${c};border-radius:1mm}
  .k-bar.bad i{background:#DC2626}

  .k-stats{display:flex;border:.8pt solid ${c};border-radius:1.2mm;overflow:hidden;margin-top:3.5mm}
  .k-stat{flex:1;text-align:center;padding:1.8mm 1mm;border-left:.6pt solid ${tint(c, 0.7)};display:flex;flex-direction:column;justify-content:center;min-width:0}
  .k-stat:first-child{border-left:0}
  .k-sv{font:700 13.5pt/1.1 ${SERIF};color:${c};white-space:nowrap}
  .k-sv small{font-size:8.5pt;color:#6B7280;font-family:${SANS};font-weight:600}
  .k-sl{font-size:6.6pt;text-transform:uppercase;letter-spacing:.7pt;color:#6B7280;margin-top:.8mm}
  .k-stat.gold .k-sv{color:${GOLD}}
  .k-seal{display:inline-block;font:800 11.5pt ${SANS};letter-spacing:2.4pt;padding:.8mm 3.4mm;border:1.7pt solid currentColor;border-radius:1.4mm;transform:rotate(-6deg);box-shadow:inset 0 0 0 .5mm #fff,inset 0 0 0 .8mm currentColor}
  .k-seal.pass{color:#15803D}.k-seal.fail{color:#B91C1C}

  .k-box{border:.7pt solid ${tint(c, 0.6)};border-radius:1.2mm;padding:2.2mm 3mm;background:#fff}
  .k-box h4{margin:0 0 1.2mm;font:700 7.4pt ${SANS};text-transform:uppercase;letter-spacing:.8pt;color:${c}}
  .k-lines div{border-bottom:.7pt dotted #9CA3AF;height:5.6mm}
  .k-scale{width:100%;border-collapse:collapse;font-size:8pt}
  .k-scale td{padding:.5mm 1.2mm;border-bottom:.5pt solid ${tint(c, 0.8)}}
  .k-scale td:first-child{font-weight:800;color:${c};width:9mm}

  .k-signs{display:flex;justify-content:space-between;gap:8mm;margin-top:auto;padding-top:6mm}
  .k-sg{flex:1;max-width:50mm;text-align:center;font-size:8.6pt;position:relative}
  .k-sgimg{height:12mm;display:flex;align-items:flex-end;justify-content:center}
  .k-sgimg img{max-height:100%;max-width:100%;object-fit:contain}
  .k-ln{border-top:.8pt solid #111827;margin-top:.5mm}
  .k-sgl{font-weight:700;margin-top:.8mm}
  .k-sgn{font-size:7.4pt;color:#6B7280}
  ${STAMP_CSS}
  .ilm-stamp{width:27mm;max-height:27mm}

  .k-ft{display:flex;justify-content:space-between;gap:4mm;margin-top:3mm;padding-top:1.4mm;border-top:.5pt solid ${tint(c, 0.7)};font-size:7.2pt;color:#6B7280}
  .k-ft b{color:${c}}
  `;
}

/* ── Parts ─────────────────────────────────────────────────────────────── */
export function letterhead(school = {}, { right = '', compact = false } = {}) {
  const name = school.name || (() => { try { return localStorage.getItem('schoolName') || localStorage.getItem('registeredSchoolName') || 'School'; } catch { return 'School'; } })();
  const logo = pic(school.logoUrl || school.logo || (() => { try { return localStorage.getItem('schoolLogoPreview'); } catch { return ''; } })());
  const { motto } = brand();
  const place = [school.address, school.city && !String(school.address || '').toLowerCase().includes(String(school.city).toLowerCase()) ? school.city : ''].filter(Boolean).join(', ');
  const contact = [school.phone && `Phone ${school.phone}`, school.email, school.website].filter(Boolean).join('  ·  ');
  return `<header class="k-lh${compact ? ' compact' : ''}">
    <div class="k-lh-logo">${logo ? `<img src="${esc(logo)}" alt=""/>` : `<div class="k-mono">${esc(initials(name))}</div>`}</div>
    <div class="k-lh-main">
      <div class="k-lh-name" dir="auto">${esc(name)}</div>
      ${motto ? `<div class="k-lh-motto" dir="auto">${esc(motto)}</div>` : ''}
      ${place ? `<div class="k-lh-line" dir="auto">${esc(place)}</div>` : ''}
      ${contact ? `<div class="k-lh-line">${esc(contact)}</div>` : ''}
    </div>
    <div class="k-lh-side">${right}</div>
  </header><div class="k-rule"></div>`;
}

export const titleRibbon = (title, sub = '') => `<div class="k-title"><i></i><b>${esc(title)}</b><i></i></div>${sub ? `<div class="k-sub" dir="auto">${esc(sub)}</div>` : '<div style="height:3mm"></div>'}`;

export function watermark(school = {}) {
  const logo = pic(school.logoUrl || school.logo || '');
  return `<div class="k-wm" aria-hidden="true">${logo ? `<img src="${esc(logo)}" alt=""/>` : `<span>${esc(initials(school.name))}</span>`}</div>`;
}

export const fields = (list) => `<div class="k-kv">${list.filter(Boolean).map(([label, value, o = {}]) => `<div class="k-f${o.wide ? ' wide' : ''}"><span class="k-l">${esc(label)}</span><span class="k-v${o.big ? ' big' : ''}" dir="auto">${o.html ? value : esc(value ?? '—') || '—'}</span></div>`).join('')}</div>`;

export const stats = (list) => `<div class="k-stats">${list.filter(Boolean).map(([value, label, cls = '']) => `<div class="k-stat ${cls}"><div class="k-sv">${value}</div><div class="k-sl">${esc(label)}</div></div>`).join('')}</div>`;

export const seal = (passed) => `<span class="k-seal ${passed ? 'pass' : 'fail'}">${passed ? 'PASSED' : 'FAILED'}</span>`;

export const bar = (pct, bad = false) => `<span class="k-bar${bad ? ' bad' : ''}"><i style="width:${Math.max(0, Math.min(100, Number(pct) || 0))}%"></i></span>`;

export function signatures(list) {
  return `<div class="k-signs">${list.map((s) => `<div class="k-sg">${s.stamp ? stampImg(pic(s.stamp)) : ''}<div class="k-sgimg">${pic(s.img) ? `<img src="${esc(pic(s.img))}" alt=""/>` : ''}</div><div class="k-ln"></div><div class="k-sgl" dir="auto">${esc(s.label)}</div>${s.name ? `<div class="k-sgn" dir="auto">${esc(s.name)}</div>` : ''}</div>`).join('')}</div>`;
}

export const footer = (left, right) => `<footer class="k-ft"><span>${left}</span><span>${right}</span></footer>`;

/** Grade bands, highest first: [{ grade, from, to }], then F below the lowest. */
export function gradeScale(grades = []) {
  const list = [...grades].filter((g) => g && g.grade && Number.isFinite(Number(g.minPercent))).sort((a, b) => b.minPercent - a.minPercent);
  const out = list.map((g, i) => ({ grade: g.grade, from: Number(g.minPercent), to: i === 0 ? 100 : Number(list[i - 1].minPercent) - 1 }));
  if (list.length) out.push({ grade: 'F', from: 0, to: Number(list[list.length - 1].minPercent) - 1 });
  return out;
}
/** The school's grades from its exam settings (A+ … D); the defaults when none. */
export function gradesFromSettings(s) {
  const v = (k, d) => (Number.isFinite(Number(s?.[k])) ? Number(s[k]) : d);
  return [
    { grade: 'A+', minPercent: v('gradeAPlus', 90) }, { grade: 'A', minPercent: v('gradeA', 80) }, { grade: 'B', minPercent: v('gradeB', 65) },
    { grade: 'C', minPercent: v('gradeC', 50) }, { grade: 'D', minPercent: v('gradeD', 40) },
  ];
}
export const scaleTable = (grades) => `<table class="k-scale">${gradeScale(grades).map((g) => `<tr><td>${esc(g.grade)}</td><td>${g.grade === 'F' ? `Below ${g.to + 1}%` : `${g.from}% – ${g.to}%`}</td></tr>`).join('')}</table>`;

export function docHTML({ title, css, body, size = 'A4 portrait', margin = '9mm' }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:${size};margin:${margin}}${css}</style></head><body>${body}</body></html>`;
}

export const todayLong = () => longDate(new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10));

/**
 * A page printed by the older builders (fee card and register, attendance
 * register, syllabus, challan and receipt, salary letter) in the same formal
 * style, at the same size: the school's name in the serif, a double rule
 * under the letterhead, and the document colour in place of the plain navy.
 */
export function formalize(html, preferred) {
  const c = docColor(preferred);
  const css = `<style>
    .sch{font-family:${SERIF} !important;font-weight:700 !important;letter-spacing:.6px}
    .head{border-bottom:3px double ${c} !important}
    .hd{border-bottom-style:double !important;border-bottom-width:3.5px !important}
    .mono{font-family:${SERIF} !important;font-weight:700 !important;box-shadow:inset 0 0 0 2px ${c},inset 0 0 0 3px ${GOLD}}
  </style>`;
  return String(html).replace(/#1B2F6E/gi, c).replace('</head>', `${css}</head>`);
}
