/**
 * The attendance register on paper (or saved as PDF from the print dialog):
 *
 *   printAttendanceRegister(...)  a class's month on A4 landscape: a row per
 *                                 student, a column per day (Sundays and
 *                                 holidays shaded), each section from a new
 *                                 page, totals, signatures and the stamp.
 *   printAttendanceYear(...)      one student's months as calendars on one
 *                                 A4 page.
 */
import { printHTML } from './print';
import { stampImg, STAMP_CSS } from './schoolStamp';

export const LETTER = { present: 'P', absent: 'A', leave: 'L', late: 'Lt' };
export const LOOK = {
  present: { bg: '#DCFCE7', fg: '#166534', label: 'Present' },
  absent: { bg: '#FEE2E2', fg: '#991B1B', label: 'Absent' },
  leave: { bg: '#FEF3C7', fg: '#92400E', label: 'Leave' },
  late: { bg: '#DBEAFE', fg: '#1E40AF', label: 'Late' },
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pic = (v) => {
  const s = String(v || '');
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s) || /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : '';
};
const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10).split('-').reverse().join('/');

/** A student's month in numbers: present, absent, leave, late, marked, %. */
export function countMonth(marks = {}) {
  const c = { present: 0, absent: 0, leave: 0, late: 0 };
  Object.values(marks).forEach((x) => { if (c[x.status] !== undefined) c[x.status] += 1; });
  c.marked = c.present + c.absent + c.leave + c.late;
  c.pct = c.marked ? Math.round(((c.present + c.late) / c.marked) * 100) : null;
  return c;
}

function letterhead(school) {
  const name = school?.name || 'School';
  const logo = pic(school?.logoUrl || school?.logo);
  const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const line = [school?.address, school?.phone && `Phone ${school.phone}`].filter(Boolean).join(' · ');
  return { name, html: `<header class="head">${logo ? `<img src="${esc(logo)}" alt=""/>` : `<div class="mono">${esc(initials)}</div>`}<div class="who"><div class="sch" dir="auto">${esc(name)}</div>${line ? `<div class="ad" dir="auto">${esc(line)}</div>` : ''}</div></header>` };
}

const CSS = `
  *{box-sizing:border-box}
  body{font-family:Arial,'Segoe UI',sans-serif;margin:0;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .head{display:flex;gap:10px;align-items:center;padding-bottom:5px;border-bottom:2px solid #111827}
  .head img{width:34px;height:34px;object-fit:contain}.mono{width:32px;height:32px;border-radius:50%;background:#1B2F6E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none}
  .who{flex:1;text-align:center;padding-right:34px}.sch{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1B2F6E}.ad{font-size:10px;color:#4B5563}
  .band{display:flex;justify-content:space-between;gap:12px;background:#1B2F6E;color:#fff;border-radius:4px;padding:5px 10px;margin:6px 0;font-weight:800;font-size:12px}
  .band span:first-child{text-transform:uppercase;letter-spacing:1px}
  table{border-collapse:collapse;width:100%}
  .signs{display:flex;justify-content:space-between;gap:40px;padding-top:18px}
  .sg{flex:0 1 190px;text-align:center;font-size:11px}.ln{border-top:1.2px solid #111827}.lb{font-weight:700;margin-top:2px}
  .pr{position:relative}
  ${STAMP_CSS}
  .legend{display:flex;justify-content:space-between;gap:16px;font-size:9px;color:#4B5563;margin-top:4px}.legend .when{white-space:nowrap;color:#9CA3AF}
  .tail{break-inside:avoid;page-break-inside:avoid}
`;

/**
 * groups: [{ title, students: [{ id, name, rollNo, fatherName }] }]
 * data:   the register (days, marks) from GET /attendance/register
 */
export function printAttendanceRegister({ school, data, groups, stamp = '', note = '' }) {
  const lh = letterhead(school);
  const days = data.days;
  const pages = groups.filter((g) => g.students.length).map((g) => {
    const rows = g.students.map((s, n) => {
      const marks = data.marks[s.id] || {};
      const c = countMonth(marks);
      return `<tr><td class="c">${n + 1}</td><td class="roll">${esc(s.rollNo || '')}</td><td class="nm"><b dir="auto">${esc(s.name)}</b></td>
        ${days.map((d) => { const st = marks[d.day]?.status; const l = LOOK[st]; return `<td class="d${d.sunday || d.holiday ? ' off' : ''}"${l ? ` style="background:${l.bg};color:${l.fg}"` : ''}>${st ? LETTER[st] : d.holiday && !st ? 'H' : ''}</td>`; }).join('')}
        <td class="t">${c.present}</td><td class="t">${c.absent}</td><td class="t">${c.leave}</td><td class="t">${c.late}</td><td class="t${c.pct !== null && c.pct < 75 ? ' bad' : ''}">${c.pct === null ? '' : `${c.pct}%`}</td></tr>`;
    }).join('');
    const perDay = (st) => days.map((d) => { const n = g.students.filter((s) => data.marks[s.id]?.[d.day]?.status === st).length; return `<td class="d">${n || ''}</td>`; }).join('');
    return `<section class="pg">${lh.html}
      <div class="band"><span>Attendance Register</span><span dir="auto">${esc(g.title)}</span><span>${esc(monthName(data.month))}</span></div>
      ${note ? `<div class="note">${esc(note)}</div>` : ''}
      <table>
        <thead><tr><th style="width:18px">#</th><th style="width:58px">Roll No.</th><th class="nm">Student</th>
          ${days.map((d) => `<th class="d${d.sunday || d.holiday ? ' off' : ''}"${d.holiday ? ` title="${esc(d.holiday)}"` : ''}>${d.day}<div class="wd">${d.weekday[0]}</div></th>`).join('')}
          <th class="t">P</th><th class="t">A</th><th class="t">L</th><th class="t">Lt</th><th class="t">%</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3">Present</td>${perDay('present')}<td colspan="5"></td></tr>
          <tr><td colspan="3">Absent</td>${perDay('absent')}<td colspan="5"></td></tr>
        </tfoot>
      </table>
      <div class="tail">
        <div class="legend"><span>P present · A absent · L leave · Lt late · H holiday · shaded: Sunday or holiday · % = days present (late counts as present) of days marked${days.some((d) => d.holiday) ? ` · Holidays: ${esc([...new Set(days.filter((d) => d.holiday).map((d) => `${d.holiday} (${d.day})`))].join(', '))}` : ''}</span></div>
        <div class="signs"><div class="sg"><div class="ln"></div><div class="lb">Class teacher</div></div><div class="when">${g.students.length} student${g.students.length === 1 ? '' : 's'} · Printed ${today()}</div><div class="sg pr">${stampImg(pic(stamp))}<div class="ln"></div><div class="lb">Principal</div></div></div>
      </div>
    </section>`;
  }).join('');
  if (!pages) return false;
  printHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance Register — ${esc(monthName(data.month))}</title><style>
    @page{size:A4 landscape;margin:7mm}
    ${CSS}
    .pg{break-after:page;page-break-after:always}.pg:last-child{break-after:auto;page-break-after:auto}
    .note{font-size:10px;color:#4B5563;margin:0 0 4px}
    th,td{border:1px solid #9CA3AF;padding:2px 3px;font-size:9px;text-align:left;line-height:1.2}
    th{background:#E5E9F5;color:#1B2F6E;text-align:center;font-size:8.5px}
    th.nm{text-align:left}td.nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42mm}
    td.roll{white-space:nowrap;font-size:8.5px}td.c{text-align:center}
    .d{text-align:center;width:5.2mm;padding:2px 0;font-weight:700}.wd{font-weight:400;font-size:7px;color:#6B7280}
    .off{background:#E5E7EB}
    .t{text-align:center;width:7mm;font-weight:700}.bad{color:#991B1B}
    tr{break-inside:avoid;page-break-inside:avoid}thead{display:table-header-group}tfoot{display:table-row-group}
    tfoot td{background:#F3F4F6;font-weight:700}
    .ilm-stamp{width:12mm;max-height:12mm;bottom:0;left:50%;transform:translateX(-50%) rotate(-10deg)}
    .signs{align-items:flex-end}.signs .when{font-size:9px;color:#9CA3AF;white-space:nowrap}
  </style></head><body>${pages}</body></html>`, { title: 'Attendance Register' });
  return true;
}

/** One student's months as calendars, on one A4 page. */
export function printAttendanceYear({ school, year, stamp = '' }) {
  const lh = letterhead(school);
  const s = year.student;
  const t = year.totals;
  const pct = t.marked ? Math.round(((t.present + t.late) / t.marked) * 100) : null;
  const months = year.months.map((mo) => {
    const lead = (new Date(`${mo.days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7; // weeks start on Monday
    const cells = [...Array(lead).fill('<td></td>'), ...mo.days.map((d) => {
      const l = LOOK[d.status];
      return `<td class="${d.sunday || d.holiday ? 'off' : ''}"${l ? ` style="background:${l.bg};color:${l.fg};font-weight:700"` : ''}${d.holiday ? ` title="${esc(d.holiday)}"` : ''}>${d.day}${d.status ? `<i>${LETTER[d.status]}</i>` : d.holiday ? '<i>H</i>' : ''}</td>`;
    })];
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(`<tr>${cells.slice(i, i + 7).join('')}${'<td></td>'.repeat(Math.max(0, 7 - cells.slice(i, i + 7).length))}</tr>`);
    const n = (st) => mo.days.filter((d) => d.status === st).length;
    return `<div class="mo"><div class="mh">${esc(monthName(mo.month))}</div><table><thead><tr>${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${weeks.join('')}</tbody></table>
      <div class="ms">P ${n('present')} · A ${n('absent')} · L ${n('leave')} · Lt ${n('late')}</div></div>`;
  }).join('');
  printHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance — ${esc(s.name)}</title><style>
    @page{size:A4 portrait;margin:10mm}
    ${CSS}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:3px 20px;font-size:12px;margin:4px 0 8px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .mo{border:1px solid #CBD5E1;border-radius:4px;padding:4px}.mh{font-weight:800;font-size:11px;color:#1B2F6E;text-align:center;margin-bottom:2px}
    .mo th,.mo td{border:1px solid #E5E7EB;font-size:8.5px;text-align:center;padding:1px 0;height:16px;width:14.28%}
    .mo th{background:#F1F5F9;color:#475569}.mo td i{display:block;font-style:normal;font-size:7.5px}
    .off{background:#F3F4F6;color:#6B7280}.ms{font-size:8.5px;color:#4B5563;text-align:center;margin-top:2px}
    .tot{display:flex;gap:16px;font-size:12px;margin-top:8px}.tot b{font-size:13px}
    .signs{padding-top:26mm}.ilm-stamp{width:24mm;max-height:24mm;bottom:2px}
  </style></head><body>${lh.html}
    <div class="band"><span>Attendance Record</span><span>${esc(monthName(year.from))} – ${esc(monthName(year.to))}</span></div>
    <div class="info"><div>Student: <b dir="auto">${esc(s.name)}</b></div><div>Roll No.: <b>${esc(s.rollNo || '—')}</b></div>
      <div>Father's name: <b dir="auto">${esc(s.fatherName || '—')}</b></div><div>Class: <b dir="auto">${esc([s.className, s.sectionName].filter(Boolean).join(' — ') || '—')}</b></div></div>
    <div class="grid">${months}</div>
    <div class="tot"><span>Present <b>${t.present}</b></span><span>Absent <b>${t.absent}</b></span><span>Leave <b>${t.leave}</b></span><span>Late <b>${t.late}</b></span><span>Days marked <b>${t.marked}</b></span>${pct !== null ? `<span>Attendance <b>${pct}%</b></span>` : ''}</div>
    <div class="tail"><div class="legend"><span>P present · A absent · L leave · Lt late · H holiday · grey: Sunday or holiday</span><span class="when">Printed ${today()}</span></div>
      <div class="signs"><div class="sg"><div class="ln"></div><div class="lb">Class teacher</div></div><div class="sg pr">${stampImg(pic(stamp))}<div class="ln"></div><div class="lb">Principal</div></div></div></div>
  </body></html>`, { title: `Attendance — ${s.name}` });
}
