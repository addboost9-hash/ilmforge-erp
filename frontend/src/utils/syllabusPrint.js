/**
 * An exam's syllabus on paper (or saved as PDF), for parents and students:
 * each class on its own page(s) — the school's letterhead, the exam, then
 * every subject with the date of its paper, its chapters and what to
 * prepare in each, and notes; the principal's signature and the stamp.
 */
import { printHTML } from './print';
import { stampImg, STAMP_CSS } from './schoolStamp';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = (v) => esc(v).replace(/\n/g, '<br/>');
const pic = (v) => {
  const s = String(v || '');
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s) || /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : '';
};
export const paperDay = (p) => {
  if (!p?.date) return '';
  const d = new Date(`${String(p.date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const t = (x) => { if (!x) return ''; const [h, m] = x.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  return [d, t(p.timeFrom)].filter(Boolean).join(', ');
};

/**
 * classes: [{ className, subjects: [{ name, paper, chapters: [{ title, details }], notes }] }]
 */
export function printSyllabus({ school, exam, classes, stamp = '' }) {
  const name = school?.name || localStorage.getItem('schoolName') || 'School';
  const logo = pic(school?.logoUrl || school?.logo || localStorage.getItem('schoolLogoPreview'));
  const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const addr = [school?.address, school?.phone && `Phone ${school.phone}`].filter(Boolean).join(' · ');
  const issued = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const pages = classes.map((c) => {
    const written = c.subjects.filter((s) => s.chapters.length || s.notes);
    if (!written.length) return '';
    const subs = written.map((s) => `
      <div class="sub">
        <div class="sh"><span dir="auto">${esc(s.name)}</span>${s.paper ? `<span class="pd">Paper: ${esc(paperDay(s.paper))}</span>` : ''}</div>
        ${s.chapters.length ? `<table><thead><tr><th style="width:6%">#</th><th style="width:38%">Chapter / unit</th><th>To prepare (topics, pages, exercises)</th></tr></thead>
          <tbody>${s.chapters.map((ch, i) => `<tr><td class="n">${i + 1}</td><td dir="auto"><b>${esc(ch.title)}</b></td><td dir="auto">${lines(ch.details)}</td></tr>`).join('')}</tbody></table>` : ''}
        ${s.notes ? `<div class="nt" dir="auto">${lines(s.notes)}</div>` : ''}
      </div>`).join('');
    return `<section class="pg">
      <header class="head">${logo ? `<img src="${esc(logo)}" alt=""/>` : `<div class="mono">${esc(initials)}</div>`}<div class="who"><div class="sch" dir="auto">${esc(name)}</div>${addr ? `<div class="ad" dir="auto">${esc(addr)}</div>` : ''}</div></header>
      <div class="band"><span>Syllabus</span><span>${esc(exam?.title || '')}</span></div>
      <div class="meta">Class: <b dir="auto">${esc(c.className)}</b></div>
      ${subs}
      <div class="tail">
        <div class="signs"><div class="sg"><div class="ln"></div><div class="lb">Class teacher</div></div><div class="sg pr">${stampImg(pic(stamp))}<div class="ln"></div><div class="lb">Principal</div></div></div>
        <footer class="ft"><span dir="auto">${esc(name)}</span><span>Issued ${esc(issued)}</span></footer>
      </div>
    </section>`;
  }).join('');
  if (!pages) return false;
  printHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Syllabus — ${esc(exam?.title || '')}</title><style>
    @page{size:A4 portrait;margin:11mm}
    *{box-sizing:border-box}
    body{font-family:Arial,'Segoe UI','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',sans-serif;margin:0;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .pg{break-after:page;page-break-after:always}.pg:last-child{break-after:auto;page-break-after:auto}
    .head{display:flex;gap:12px;align-items:center;padding-bottom:7px;border-bottom:2px solid #111827}
    .head img{width:52px;height:52px;object-fit:contain}.mono{width:50px;height:50px;border-radius:50%;background:#1B2F6E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex:none}
    .who{flex:1;text-align:center;padding-right:52px}.sch{font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1B2F6E}.ad{font-size:11px;color:#4B5563;margin-top:2px}
    .band{display:flex;justify-content:space-between;gap:12px;background:#1B2F6E;color:#fff;border-radius:4px;padding:6px 12px;margin:10px 0 6px;font-weight:800;font-size:13px}
    .band span:first-child{text-transform:uppercase;letter-spacing:1px}
    .meta{font-size:13px;margin-bottom:6px}
    .sub{margin-top:10px;break-inside:avoid;page-break-inside:avoid}
    .sh{display:flex;justify-content:space-between;gap:10px;align-items:baseline;border-bottom:1.5px solid #1B2F6E;padding:3px 0;font-weight:800;font-size:14px;color:#1B2F6E}
    .pd{font-size:11.5px;font-weight:600;color:#374151}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th,td{border:1px solid #9CA3AF;padding:5px 8px;font-size:12px;text-align:left;vertical-align:top}
    th{background:#E5E9F5;color:#1B2F6E;font-size:11px;text-transform:uppercase}
    td.n{text-align:center}
    .nt{font-size:12px;margin-top:5px;padding:5px 8px;background:#F8FAFC;border-left:3px solid #1B2F6E}
    .tail{break-inside:avoid;page-break-inside:avoid}
    .signs{display:flex;justify-content:space-between;gap:40px;padding-top:30mm}
    .sg{flex:0 1 200px;text-align:center;font-size:12px}.ln{border-top:1.2px solid #111827}.lb{font-weight:700;margin-top:3px}
    .pr{position:relative}
    ${STAMP_CSS}
    .ilm-stamp{width:26mm;max-height:26mm;bottom:2px}
    .ft{display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF;margin-top:10px;border-top:1px solid #E5E7EB;padding-top:5px}
  </style></head><body>${pages}</body></html>`, { title: `Syllabus — ${exam?.title || ''}` });
  return true;
}
