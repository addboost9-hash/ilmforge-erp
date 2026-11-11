/**
 * Roll number slips as a document to print or save as PDF.
 *
 * buildSlipsDocument() makes the whole document: the same one is shown as
 * the live preview in the designer and printed, so what the school sees is
 * what comes out of the printer. Each class starts on a new page, so the
 * slips can be handed out class by class. Two slips fit on an A4 page (or
 * one, larger); a slip is never split across two pages.
 */

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

/* The roll number printed for a student under this design. */
export const slipRollNo = (s, design) => (design?.rollNumber === 'exam' ? s.examRollNo : s.rollNo) || `ID-${s.id}`;

const initials = (name) => String(name || 'School').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function slipHTML({ s, g, data, design, issued }) {
  const show = design.show || {};
  const school = data.school || {};
  const logo = imgSrc(school.logoUrl);
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
    show.principalSignature && `<div class="sg"><div class="sgimg">${sig ? `<img src="${esc(sig)}" alt="">` : ''}</div><div class="ln"></div><div class="sgl">${esc(design.principalName || design.principalTitle || 'Principal')}</div>${design.principalName ? `<div class="sgt">${esc(design.principalTitle || 'Principal')}</div>` : ''}</div>`,
  ].filter(Boolean).join('');

  return `<section class="slip">
  <header class="hd">
    ${logo ? `<img class="logo" src="${esc(logo)}" alt="">` : `<div class="logo mono">${esc(initials(school.name))}</div>`}
    <div class="sch">
      <div class="nm" dir="auto">${esc(school.name || 'School')}</div>
      ${school.address || school.phone ? `<div class="ad" dir="auto">${esc([school.address, school.phone && `Phone ${school.phone}`].filter(Boolean).join(' · '))}</div>` : ''}
    </div>
    <div class="rollbox"><div class="rl">Roll No.</div><div class="rn">${esc(slipRollNo(s, design))}</div></div>
  </header>
  <div class="band"><span class="tt">${esc(design.title || 'Roll Number Slip')}</span><span class="ex">${esc(examLabel(data.exam))}</span></div>
  <div class="who">
    <table class="info">
      <tr><th>Name</th><td colspan="3" class="big" dir="auto">${esc(s.name)}</td></tr>
      ${show.fatherName ? `<tr><th>Father's name</th><td colspan="3" dir="auto">${esc(s.fatherName || '—')}</td></tr>` : ''}
      <tr><th>Class</th><td colspan="3" dir="auto">${esc(cls)}</td></tr>
      <tr><th>Exam dates</th><td colspan="3">${esc(examDates(data.exam) || '—')}</td></tr>
    </table>
    ${show.photo ? `<div class="photo">${photo ? `<img src="${esc(photo)}" alt="">` : '<span>Paste<br>photo<br>here</span>'}</div>` : ''}
  </div>
  <table class="papers">
    <thead><tr>${cols.map((c) => `<th${c.w ? ` style="width:${c.w}"` : ''}>${c.h}</th>`).join('')}</tr></thead>
    <tbody>${papers}</tbody>
  </table>
  ${show.instructions && design.instructions?.length ? `<div class="ins"><div class="insh">Instructions</div><ol>${design.instructions.map((l) => `<li dir="auto">${esc(l)}</li>`).join('')}</ol></div>` : ''}
  ${signs ? `<div class="signs">${signs}</div>` : ''}
  <footer class="ft"><span>${esc(design.footerNote || '')}</span><span class="iss">Issued ${esc(issued)}</span></footer>
</section>`;
}

/**
 * The document.
 *   data     { exam, school } from GET /exams/:id/slips
 *   design   the slip design (as saved, or as being edited)
 *   groups   the class-sections to print, each with its students
 *   preview  for the designer: no toolbar, no printing
 *   autoPrint  open the print dialog once pictures have loaded
 */
export function buildSlipsDocument({ data, design, groups, preview = false, autoPrint = false, title = '' }) {
  const color = HEX_RE.test(design?.color) ? design.color : '#1B2F6E';
  const two = Number(design?.perPage) === 2;
  const issued = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const count = groups.reduce((n, g) => n + g.students.length, 0);
  const body = groups.filter((g) => g.students.length).map((g) => `<div class="grp">${g.students.map((s) => slipHTML({ s, g, data, design, issued })).join(two ? '<div class="cut" aria-hidden="true"></div>' : '')}</div>`).join('');
  const docTitle = title || `Roll Number Slips — ${examLabel(data.exam)}`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, 'Segoe UI', Helvetica, sans-serif; color: #111827; background: ${preview ? '#fff' : '#E5E7EB'}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: #fff; border-bottom: 1px solid #D1D5DB; padding: 10px 16px; font-size: 13px; }
  .bar b { color: ${color}; }
  .bar button { background: ${color}; color: #fff; border: 0; border-radius: 8px; padding: 9px 18px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
  .bar .hint { color: #6B7280; font-size: 12px; }
  .pages { width: 194mm; margin: ${preview ? '0 auto' : '12px auto 40px'}; }
  .grp + .grp { break-before: page; page-break-before: always; }
  .slip { position: relative; background: #fff; border: 1.6pt solid ${color}; border-radius: 3mm; padding: ${two ? '4mm 5mm' : '7mm 8mm'}; break-inside: avoid; page-break-inside: avoid; display: flex; flex-direction: column; ${two ? 'min-height: 132mm;' : 'min-height: 270mm;'} ${preview ? '' : 'box-shadow: 0 1px 4px rgba(0,0,0,.12);'} }
  ${two ? '' : '.grp .slip { break-after: page; page-break-after: always; } .grp:last-child .slip:last-child { break-after: auto; page-break-after: auto; } .slip + .slip { margin-top: 10mm; }'}
  .cut { height: 0; border-top: 1px dashed #9CA3AF; margin: 4mm 0; position: relative; }
  .cut::after { content: '✂'; position: absolute; left: -1mm; top: -2.6mm; font-size: 9pt; color: #9CA3AF; background: ${preview ? '#fff' : '#E5E7EB'}; }
  .hd { display: flex; align-items: center; gap: ${two ? '3mm' : '5mm'}; padding-bottom: ${two ? '2mm' : '3mm'}; border-bottom: 1.2pt solid ${color}; }
  .logo { width: ${two ? '13mm' : '19mm'}; height: ${two ? '13mm' : '19mm'}; object-fit: contain; flex: none; }
  .mono { border-radius: 50%; background: ${color}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: ${two ? '12pt' : '16pt'}; }
  .sch { flex: 1; min-width: 0; text-align: center; }
  .nm { font-size: ${two ? '14pt' : '19pt'}; font-weight: 800; color: ${color}; line-height: 1.15; text-transform: uppercase; letter-spacing: .3pt; }
  .ad { font-size: ${two ? '7.5pt' : '9pt'}; color: #4B5563; margin-top: 1mm; }
  .rollbox { flex: none; border: 1.2pt solid ${color}; border-radius: 2mm; text-align: center; padding: 1mm 2.5mm; min-width: ${two ? '24mm' : '30mm'}; }
  .rl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .6pt; color: #6B7280; }
  .rn { font-size: ${two ? '12pt' : '15pt'}; font-weight: 800; color: ${color}; font-family: 'Courier New', monospace; }
  .band { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; background: ${color}; color: #fff; border-radius: 1.5mm; padding: ${two ? '1.4mm 3mm' : '2mm 4mm'}; margin: ${two ? '2mm 0' : '3mm 0'}; }
  .tt { font-size: ${two ? '10.5pt' : '13pt'}; font-weight: 800; text-transform: uppercase; letter-spacing: 1pt; }
  .ex { font-size: ${two ? '9pt' : '11pt'}; font-weight: 600; text-align: right; }
  .who { display: flex; gap: ${two ? '3mm' : '5mm'}; align-items: stretch; }
  .info { flex: 1; border-collapse: collapse; font-size: ${two ? '8.8pt' : '10.5pt'}; align-self: center; }
  .info th { text-align: left; color: #4B5563; font-weight: 600; padding: ${two ? '1mm 2mm 1mm 0' : '1.6mm 3mm 1.6mm 0'}; white-space: nowrap; width: 1%; }
  .info td { padding: ${two ? '1mm 3mm 1mm 0' : '1.6mm 4mm 1.6mm 0'}; border-bottom: .6pt solid ${tint(color, 0.75)}; font-weight: 600; }
  .info td.big { font-size: ${two ? '10.5pt' : '12.5pt'}; font-weight: 800; }
  .photo { flex: none; width: ${two ? '24mm' : '30mm'}; height: ${two ? '29mm' : '37mm'}; border: 1pt solid ${tint(color, 0.4)}; border-radius: 1.5mm; overflow: hidden; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7pt; color: #9CA3AF; background: ${tint(color, 0.95)}; }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .papers { width: 100%; border-collapse: collapse; margin-top: ${two ? '2.5mm' : '4mm'}; font-size: ${two ? '8.4pt' : '10pt'}; }
  .papers th { background: ${tint(color, 0.88)}; color: ${color}; font-weight: 800; text-align: left; padding: ${two ? '1.1mm 1.6mm' : '1.8mm 2.4mm'}; border: .6pt solid ${tint(color, 0.6)}; font-size: ${two ? '7.8pt' : '9pt'}; text-transform: uppercase; letter-spacing: 0; }
  .papers td { padding: ${two ? '1.05mm 1.6mm' : '2mm 2.4mm'}; border: .6pt solid #D1D5DB; vertical-align: middle; }
  .papers td.n { text-align: center; }
  .papers td.nw, .papers .nw { white-space: nowrap; }
  .papers td.sub { font-weight: 700; }
  .papers td.none { text-align: center; color: #B45309; padding: 3mm; }
  .ins { margin-top: ${two ? '2mm' : '4mm'}; border: .6pt solid ${tint(color, 0.7)}; background: ${tint(color, 0.96)}; border-radius: 1.5mm; padding: ${two ? '1.4mm 3mm' : '2.5mm 4mm'}; }
  .insh { font-weight: 800; font-size: ${two ? '7.8pt' : '9.5pt'}; color: ${color}; text-transform: uppercase; letter-spacing: .4pt; }
  .ins ol { margin: .6mm 0 0; padding-left: 4.5mm; ${two ? 'columns: 2; column-gap: 6mm;' : ''} font-size: ${two ? '7.3pt' : '9pt'}; color: #374151; line-height: 1.32; }
  .ins li { break-inside: avoid; }
  .signs { display: flex; justify-content: space-between; gap: 8mm; margin-top: auto; padding-top: ${two ? '2mm' : '6mm'}; }
  .sg { flex: 1; max-width: 55mm; text-align: center; font-size: ${two ? '8pt' : '9.5pt'}; }
  .sgimg { height: ${two ? '9mm' : '14mm'}; display: flex; align-items: flex-end; justify-content: center; }
  .sgimg img { max-height: 100%; max-width: 100%; object-fit: contain; }
  .ln { border-top: .9pt solid #111827; margin-top: .5mm; }
  .sgl { font-weight: 700; margin-top: .8mm; }
  .sgt { font-size: ${two ? '7pt' : '8pt'}; color: #6B7280; }
  .ft { display: flex; justify-content: space-between; gap: 4mm; margin-top: ${two ? '1.6mm' : '3mm'}; font-size: ${two ? '7pt' : '8pt'}; color: ${color}; font-weight: 700; }
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
