/**
 * Roll number slips as a document to print or save as PDF.
 *
 * buildSlipsDocument() makes the whole document: the same one is shown as
 * the live preview in the designer and printed, so what the school sees is
 * what comes out of the printer. Each class starts on a new page, so the
 * slips can be handed out class by class. Two slips fit on an A4 page (or
 * one, larger); a slip is never split across two pages.
 */

import { stampImg, STAMP_CSS } from './schoolStamp';
import { brand, GOLD, SERIF, SANS } from './printKit';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Only pictures: embedded images, web addresses or the app's own files. */
const imgSrc = (v) => {
  const s = String(v || '').trim();
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s) || /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : '';
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
/* The design colour mixed with white: amount 0 (colour) … 1 (white). */
export function tint(hex, amount) {
  const h = HEX_RE.test(hex) ? hex : '#1B2F6E';
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(n(1))},${mix(n(3))},${mix(n(5))})`;
}

export const fmtDay = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
export const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  if (!Number.isFinite(h)) return t;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
/* A time may break between its start and end, never inside one. */
const timeCell = (r) => [fmt12(r.timeFrom), fmt12(r.timeTo)].filter(Boolean).map((t) => `<span class="nw">${esc(t)}</span>`).join(' – ') || '—';

/* "1st Term Exam" + its year, unless the title already has one. */
export function examLabel(exam) {
  const title = exam?.title || 'Examination';
  const year = exam?.dateStart ? new Date(exam.dateStart).getFullYear() : null;
  return year && !/\b(19|20)\d{2}\b/.test(title) ? `${title} ${year}` : title;
}

export function examDates(exam) {
  const f = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const a = f(exam?.dateStart);
  const b = f(exam?.dateEnd);
  return a && b && a !== b ? `${a} – ${b}` : a || b;
}

/* The roll number printed for a student under this design: the student's
   own, or the exam's (class by class, or mixed across the classes). */
export const usesExamNumbers = (design) => design?.rollNumber === 'exam' || design?.rollNumber === 'mixed';
export const slipRollNo = (s, design) => (usesExamNumbers(design) ? s.examRollNo : s.rollNo) || `ID-${s.id}`;

/* The father's name as printed: a stand-in such as "." (a student
   registered from a photo, details to come) is no name, so it is left blank. */
export const fatherOf = (s) => (/\p{L}/u.test(String(s?.fatherName || '')) ? String(s.fatherName).trim() : '');

/* The school's name as printed: the slip's own (Design -> School name on the
   slip), else the name in School Profile. */
export const slipSchoolName = (data, design) => String(design?.schoolName || '').trim() || data?.school?.name || 'School';

const initials = (name) => String(name || 'School').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function slipHTML({ s, g, data, design, issued, stamp }) {
  const show = design.show || {};
  const school = data.school || {};
  const schoolName = slipSchoolName(data, design);
  // "Print the school logo" off: no logo, no initials in its place, no watermark.
  const noLogo = show.logo === false;
  const logo = noLogo ? '' : imgSrc(school.logoUrl);
  const photo = imgSrc(s.photoUrl);
  const sig = imgSrc(design.principalSignature);
  const cls = `${g.className}${g.sectionName ? ` — ${g.sectionName}` : ''}`;
  const cols = [
    { h: '#', w: '5%', v: (r, i) => i + 1, c: 'n' },
    { h: 'Subject', v: (r) => `<span dir="auto">${esc(r.subject)}</span>`, c: 'sub' },
    { h: 'Date', w: '15%', v: (r) => esc(fmtDay(r.date) || '—'), c: 'nw' },
    show.day && { h: 'Day', w: '12%', v: (r) => esc(r.day || '—'), c: 'nw' },
    show.time && { h: 'Time', w: '19%', v: (r) => timeCell(r) },
    show.room && { h: 'Room', w: '9%', v: (r) => esc(r.room || '—') },
    show.maxMarks && { h: 'Marks', w: '8%', v: (r) => esc(r.maxMarks ?? '—'), c: 'n' },
    show.invigilator && { h: 'Invigilator', w: '14%', v: () => '' },
  ].filter(Boolean);
  const papers = g.schedule.length
    ? g.schedule.map((r, i) => `<tr>${cols.map((c) => `<td class="${c.c || ''}">${c.v(r, i)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cols.length}" class="none">The date sheet of this class is not ready yet.</td></tr>`;
  const signs = [
    show.studentSignature && `<div class="sg"><div class="sgimg"></div><div class="ln"></div><div class="sgl">Student's signature</div></div>`,
    show.classTeacherSignature && `<div class="sg"><div class="sgimg"></div><div class="ln"></div><div class="sgl">Class teacher</div></div>`,
    show.principalSignature && `<div class="sg pr">${stampImg(imgSrc(stamp))}<div class="sgimg">${sig ? `<img src="${esc(sig)}" alt="">` : ''}</div><div class="ln"></div><div class="sgl">${esc(design.principalName || design.principalTitle || 'Principal')}</div>${design.principalName ? `<div class="sgt">${esc(design.principalTitle || 'Principal')}</div>` : ''}</div>`,
  ].filter(Boolean).join('');

  const motto = brand().motto;
  const field = (label, value, cls2 = '') => `<div class="f ${cls2}"><span class="fl">${esc(label)}</span><span class="fv" dir="auto">${esc(value || '—')}</span></div>`;
  return `<section class="slip"><div class="slipin">
  ${noLogo ? '' : `<div class="wm" aria-hidden="true">${logo ? `<img src="${esc(logo)}" alt="">` : `<span>${esc(initials(schoolName))}</span>`}</div>`}
  <header class="hd">
    ${noLogo ? '' : logo ? `<img class="logo" src="${esc(logo)}" alt="">` : `<div class="logo mono">${esc(initials(schoolName))}</div>`}
    <div class="sch">
      <div class="nm" dir="auto">${esc(schoolName)}</div>
      ${motto ? `<div class="mt" dir="auto">${esc(motto)}</div>` : ''}
      ${school.address || school.phone ? `<div class="ad" dir="auto">${esc([school.address, school.phone && `Phone ${school.phone}`].filter(Boolean).join(' · '))}</div>` : ''}
    </div>
    <div class="rollbox"><div class="rl">Roll No.</div><div class="rn">${esc(slipRollNo(s, design))}</div></div>
  </header>
  <div class="rule"></div>
  <div class="ttl"><i></i><b>${esc(design.title || 'Roll Number Slip')}</b><i></i></div>
  <div class="exl" dir="auto">${esc(examLabel(data.exam))}</div>
  <div class="who">
    <div class="kv">
      ${field("Candidate's name", s.name, 'wide big')}
      ${show.fatherName ? field("Father's name", fatherOf(s)) : ''}
      ${field('Class', cls)}
      ${field('Exam dates', examDates(data.exam), show.fatherName ? 'wide' : '')}
    </div>
    ${show.photo ? `<div class="photo"><div>${photo ? `<img src="${esc(photo)}" alt="">` : '<span>Paste<br>photo<br>here</span>'}</div></div>` : ''}
  </div>
  <table class="papers">
    <thead><tr>${cols.map((c) => `<th${c.w ? ` style="width:${c.w}"` : ''}>${c.h}</th>`).join('')}</tr></thead>
    <tbody>${papers}</tbody>
  </table>
  ${show.instructions && design.instructions?.length ? `<div class="ins"><div class="insh">Instructions</div><ol>${design.instructions.map((l) => `<li dir="auto">${esc(l)}</li>`).join('')}</ol></div>` : ''}
  ${signs ? `<div class="signs">${signs}</div>` : ''}
  <footer class="ft"><span>${esc(design.footerNote || '')}</span><span class="iss">Issued ${esc(issued)}</span></footer>
</div></section>`;
}

/**
 * The document.
 *   data     { exam, school } from GET /exams/:id/slips
 *   design   the slip design (as saved, or as being edited)
 *   groups   the class-sections to print, each with its students
 *   preview  for the designer: no toolbar, no printing
 *   autoPrint  open the print dialog once pictures have loaded
 */
export function buildSlipsDocument({ data, design, groups, preview = false, autoPrint = false, title = '', stamp = '' }) {
  const color = HEX_RE.test(design?.color) ? design.color : '#1B2F6E';
  const two = Number(design?.perPage) === 2;
  const issued = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const count = groups.reduce((n, g) => n + g.students.length, 0);
  const body = groups.filter((g) => g.students.length).map((g) => `<div class="grp">${g.students.map((s) => slipHTML({ s, g, data, design, issued, stamp })).join(two ? '<div class="cut" aria-hidden="true"></div>' : '')}</div>`).join('');
  const docTitle = title || `Roll Number Slips — ${examLabel(data.exam)}`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: ${SANS}; color: #111827; background: ${preview ? '#fff' : '#E5E7EB'}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: #fff; border-bottom: 1px solid #D1D5DB; padding: 10px 16px; font-size: 13px; }
  .bar b { color: ${color}; }
  .bar button { background: ${color}; color: #fff; border: 0; border-radius: 8px; padding: 9px 18px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
  .bar .hint { color: #6B7280; font-size: 12px; }
  .pages { width: 194mm; margin: ${preview ? '0 auto' : '12px auto 40px'}; }
  .grp + .grp { break-before: page; page-break-before: always; }
  .slip { position: relative; background: #fff; border: 1.4pt solid ${color}; padding: .9mm; break-inside: avoid; page-break-inside: avoid; ${two ? 'min-height: 132mm;' : 'min-height: 270mm;'} ${preview ? '' : 'box-shadow: 0 1px 4px rgba(0,0,0,.12);'} }
  .slipin { position: relative; min-height: ${two ? '130mm' : '268mm'}; border: .6pt solid ${GOLD}; padding: ${two ? '3.2mm 4.5mm 2.4mm' : '6.5mm 7.5mm 4mm'}; display: flex; flex-direction: column; overflow: hidden; }
  .slipin > * { position: relative; z-index: 1; }
  ${two ? '' : '.grp .slip { break-after: page; page-break-after: always; } .grp:last-child .slip:last-child { break-after: auto; page-break-after: auto; } .slip + .slip { margin-top: 10mm; }'}
  .wm { position: absolute !important; inset: 0; z-index: 0 !important; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .wm img { width: ${two ? '42%' : '60%'}; max-height: 70%; object-fit: contain; opacity: .055; filter: grayscale(100%); }
  .wm span { font: 700 ${two ? '90pt' : '150pt'}/1 ${SERIF}; color: ${color}; opacity: .045; }
  .cut { height: 0; border-top: 1px dashed #9CA3AF; margin: ${two ? '3.2mm' : '4mm'} 0; position: relative; }
  .cut::after { content: '✂'; position: absolute; left: -1mm; top: -2.6mm; font-size: 9pt; color: #9CA3AF; background: ${preview ? '#fff' : '#E5E7EB'}; }
  .hd { display: flex; align-items: center; gap: ${two ? '3mm' : '5mm'}; }
  .logo { width: ${two ? '14mm' : '20mm'}; height: ${two ? '14mm' : '20mm'}; object-fit: contain; flex: none; }
  .mono { border-radius: 50%; background: ${color}; color: #fff; display: flex; align-items: center; justify-content: center; font: 700 ${two ? '12pt' : '16pt'} ${SERIF}; box-shadow: inset 0 0 0 .7mm ${color}, inset 0 0 0 1mm ${GOLD}; }
  .sch { flex: 1; min-width: 0; text-align: center; }
  .nm { font: 700 ${two ? '15pt' : '20pt'}/1.08 ${SERIF}; color: ${color}; text-transform: uppercase; letter-spacing: .5pt; }
  .mt { font: italic ${two ? '7.8pt' : '9pt'} ${SERIF}; color: ${GOLD}; margin-top: .5mm; }
  .ad { font-size: ${two ? '7.3pt' : '8.5pt'}; color: #4B5563; margin-top: .6mm; }
  .rollbox { flex: none; border: 1.2pt solid ${color}; border-radius: 1.4mm; text-align: center; padding: .8mm 2.5mm; min-width: ${two ? '25mm' : '31mm'}; background: #fff; box-shadow: inset 0 0 0 .5mm #fff, inset 0 0 0 .8mm ${tint(color, 0.7)}; }
  .rl { font-size: 6.3pt; text-transform: uppercase; letter-spacing: .7pt; color: #6B7280; }
  .rn { font-size: ${two ? '12.5pt' : '15pt'}; font-weight: 800; color: ${color}; font-family: Consolas, 'Courier New', monospace; white-space: nowrap; }
  .rule { height: 2.2pt; background: ${color}; margin-top: ${two ? '1.6mm' : '2.4mm'}; position: relative; }
  .rule::after { content: ''; position: absolute; left: 0; right: 0; top: calc(100% + .9pt); height: .7pt; background: ${GOLD}; }
  .ttl { display: flex; align-items: center; gap: 3.5mm; margin: ${two ? '2.4mm 0 .6mm' : '4mm 0 1mm'}; }
  .ttl i { flex: 1; height: .7pt; background: ${GOLD}; }
  .ttl b { flex: none; background: ${color}; color: #fff; font: 700 ${two ? '9.8pt' : '12pt'} ${SANS}; letter-spacing: 2pt; text-transform: uppercase; padding: ${two ? '1mm 4.5mm' : '1.5mm 6mm'}; border-radius: .8mm; }
  .exl { text-align: center; font: 600 ${two ? '9.2pt' : '11pt'} ${SERIF}; color: ${color}; margin-bottom: ${two ? '2mm' : '3.5mm'}; }
  .who { display: flex; gap: ${two ? '4mm' : '6mm'}; align-items: stretch; }
  .kv { flex: 1; min-width: 0; display: grid; grid-template-columns: 1fr 1fr; gap: ${two ? '1.2mm 5mm' : '2.4mm 7mm'}; align-content: center; }
  .f { display: flex; flex-direction: column; min-width: 0; }
  .f.wide { grid-column: 1 / -1; }
  .fl { font-size: ${two ? '6pt' : '6.8pt'}; text-transform: uppercase; letter-spacing: .7pt; color: #6B7280; font-weight: 600; }
  .fv { font-size: ${two ? '9pt' : '10.5pt'}; font-weight: 700; border-bottom: .7pt dotted #9CA3AF; padding: .3mm 0 .6mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .f.big .fv { font: 700 ${two ? '11pt' : '13pt'} ${SERIF}; color: ${color}; }
  .photo { flex: none; width: ${two ? '24mm' : '30mm'}; height: ${two ? '29mm' : '37mm'}; border: .8pt solid ${color}; padding: .8mm; background: #fff; }
  .photo > div { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7pt; color: #9CA3AF; background: ${tint(color, 0.95)}; overflow: hidden; }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .papers { width: 100%; border-collapse: collapse; margin-top: ${two ? '2.4mm' : '4.5mm'}; font-size: ${two ? '8.3pt' : '10pt'}; }
  .papers th { background: ${color}; color: #fff; font-weight: 700; text-align: left; padding: ${two ? '1.1mm 1.6mm' : '1.9mm 2.4mm'}; border: .6pt solid ${color}; font-size: ${two ? '7.2pt' : '8.4pt'}; text-transform: uppercase; letter-spacing: .4pt; }
  .papers td { padding: ${two ? '1mm 1.6mm' : '2mm 2.4mm'}; border: .6pt solid ${tint(color, 0.72)}; vertical-align: middle; }
  .papers tbody tr:nth-child(even) td { background: ${tint(color, 0.955)}; }
  .papers td.n { text-align: center; }
  .papers td.nw, .papers .nw { white-space: nowrap; }
  .papers td.sub { font-weight: 700; }
  .papers td.none { text-align: center; color: #B45309; padding: 3mm; }
  .ins { margin-top: ${two ? '2mm' : '4mm'}; border: .6pt solid ${tint(color, 0.7)}; border-left: 2.2pt solid ${GOLD}; background: ${tint(color, 0.965)}; padding: ${two ? '1.3mm 3mm' : '2.5mm 4mm'}; }
  .insh { font-weight: 800; font-size: ${two ? '7.4pt' : '9pt'}; color: ${color}; text-transform: uppercase; letter-spacing: .6pt; }
  .ins ol { margin: .6mm 0 0; padding-left: 4.5mm; ${two ? 'columns: 2; column-gap: 6mm;' : ''} font-size: ${two ? '7.1pt' : '9pt'}; color: #374151; line-height: 1.32; }
  .ins li { break-inside: avoid; }
  .signs { display: flex; justify-content: space-between; gap: 8mm; margin-top: auto; padding-top: ${two ? '1.6mm' : '6mm'}; }
  .sg { flex: 1; max-width: 52mm; text-align: center; font-size: ${two ? '7.8pt' : '9.3pt'}; }
  .sgimg { height: ${two ? '8.5mm' : '14mm'}; display: flex; align-items: flex-end; justify-content: center; }
  .sgimg img { max-height: 100%; max-width: 100%; object-fit: contain; }
  .ln { border-top: .8pt solid #111827; margin-top: .5mm; }
  .sgl { font-weight: 700; margin-top: .7mm; }
  .sgt { font-size: ${two ? '6.8pt' : '8pt'}; color: #6B7280; }
  .pr { position: relative; }
  ${STAMP_CSS}
  .ilm-stamp { width: ${two ? '20mm' : '28mm'}; max-height: ${two ? '20mm' : '28mm'}; }
  .ft { display: flex; justify-content: space-between; gap: 4mm; margin-top: ${two ? '1.4mm' : '3mm'}; padding-top: ${two ? '.8mm' : '1.4mm'}; border-top: .5pt solid ${tint(color, 0.7)}; font-size: ${two ? '6.8pt' : '7.8pt'}; color: ${color}; font-weight: 700; }
  .ft .iss { color: #9CA3AF; font-weight: 400; white-space: nowrap; }
  @media print {
    body { background: #fff; }
    .bar { display: none !important; }
    .pages { width: auto; margin: 0; }
    .slip { box-shadow: none; }
    .cut::after { background: #fff; }
  }
</style></head>
<body>
${preview ? '' : `<div class="bar"><div><b>${esc(docTitle)}</b> · ${count} slip${count === 1 ? '' : 's'}<div class="hint">To download, choose <b>Save as PDF</b> as the printer.</div></div><button type="button" onclick="window.print()">Print / Save as PDF</button></div>`}
<main class="pages">${body || '<p style="padding:24px;color:#6B7280">No students to print.</p>'}</main>
${autoPrint ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},350)});<\/script>' : ''}
</body></html>`;
}

/* The number part of an exam roll number ("T1-5012" -> 5012), for ordering. */
const numberOf = (v) => { const m = /(\d+)\D*$/.exec(String(v || '')); return m ? Number(m[1]) : Infinity; };

/**
 * The seating list: every candidate of the exam in roll number order, for
 * the invigilators to seat the hall by. With mixed numbers, neighbours in
 * this list are from different classes.
 */
export function buildSeatingDocument({ data, design, title = '' }) {
  const color = HEX_RE.test(design?.color) ? design.color : '#1B2F6E';
  const rows = (data.groups || [])
    .flatMap((g) => g.students.map((s) => ({ s, cls: `${g.className}${g.sectionName ? ` — ${g.sectionName}` : ''}` })))
    .sort((a, b) => numberOf(a.s.examRollNo) - numberOf(b.s.examRollNo) || String(a.s.examRollNo).localeCompare(String(b.s.examRollNo)));
  const school = slipSchoolName(data, design);
  const docTitle = title || `Seating list — ${examLabel(data.exam)}`;
  const mixed = data.rollNumbers?.mode === 'mixed';
  const withFather = design?.show?.fatherName !== false;
  const body = rows.map(({ s, cls }, i) => `<tr><td class="n">${i + 1}</td><td class="r">${esc(s.examRollNo || '')}</td><td dir="auto"><b>${esc(s.name)}</b></td>${withFather ? `<td dir="auto">${esc(fatherOf(s))}</td>` : ''}<td>${esc(cls)}</td><td></td></tr>`).join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: ${SANS}; color: #111827; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .bar { position: sticky; top: 0; display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: #fff; border-bottom: 1px solid #D1D5DB; padding: 10px 16px; font-size: 13px; }
  .bar button { background: ${color}; color: #fff; border: 0; border-radius: 8px; padding: 9px 18px; font-weight: 700; cursor: pointer; }
  main { max-width: 190mm; margin: 0 auto; padding: 10px 0 30px; }
  h1 { font: 700 17pt ${SERIF}; color: ${color}; text-align: center; margin: 0; text-transform: uppercase; }
  h2 { font: 600 11.5pt ${SERIF}; text-align: center; margin: 2mm 0 1mm; }
  .note { text-align: center; font-size: 9pt; color: #4B5563; margin-bottom: 4mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  thead { display: table-header-group; }
  th { background: ${color}; color: #fff; text-align: left; padding: 1.6mm 2mm; font-size: 8.4pt; text-transform: uppercase; letter-spacing: .4pt; }
  td { border: .6pt solid ${tint(color, 0.7)}; padding: 1.4mm 2mm; }
  tr { break-inside: avoid; }
  tbody tr:nth-child(even) td { background: ${tint(color, 0.955)}; }
  td.n { text-align: center; color: #6B7280; width: 8%; }
  td.r { font-family: Consolas, 'Courier New', monospace; font-weight: 800; color: ${color}; white-space: nowrap; width: 14%; }
  @media print { .bar { display: none; } main { padding: 0; } }
</style></head><body>
<div class="bar"><div><b>${esc(docTitle)}</b> · ${rows.length} candidate${rows.length === 1 ? '' : 's'}</div><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
<main>
  <h1 dir="auto">${esc(school)}</h1>
  <h2 dir="auto">Seating list — ${esc(examLabel(data.exam))}</h2>
  <div class="note">Seat the candidates in roll number order.${mixed ? ' The numbers go round the classes in turn, so no candidate sits beside a classmate.' : ''}</div>
  <table><thead><tr><th>#</th><th>Roll No.</th><th>Candidate's name</th>${withFather ? '<th>Father\'s name</th>' : ''}<th>Class</th><th style="width:14%">Seat / room</th></tr></thead>
  <tbody>${body || `<tr><td colspan="${withFather ? 6 : 5}" style="text-align:center;color:#6B7280">No candidates.</td></tr>`}</tbody></table>
</main>
</body></html>`;
}

/* A window for the slips, opened in the click itself (so it is not blocked)
   and filled once they are ready. Returns a function that fills it; if the
   window was blocked anyway, it prints from a hidden frame instead. */
export function openSlipsWindow(printFallback) {
  const w = window.open('', '_blank');
  if (w && w.document) w.document.write('<p style="font:15px system-ui,sans-serif;padding:32px;color:#475569">Preparing the roll number slips…</p>');
  return {
    fill(html) {
      if (w && !w.closed) { w.document.open(); w.document.write(html); w.document.close(); return; }
      printFallback(html);
    },
    close() { if (w && !w.closed) w.close(); },
  };
}
