/**
 * Printed fee records, from the month-by-month view in utils/feeYear.js:
 *
 *   printFeeCard(...)      one student's year on one A4 page: each month's
 *                          fee, paid, balance, the day collected, receipt.
 *   printFeeRegister(...)  a class's register on A4 landscape: a row per
 *                          student, a column per month, each class from a
 *                          new page. "Save as PDF" in the print dialog
 *                          downloads it.
 */
import { printHTML } from './print';
import { monthTitle, money, rs, dmy, dm, lookOf, pkYmd } from './feeYear';
import { stampImg, STAMP_CSS } from './schoolStamp';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Only pictures from the school itself (a data URL or its own address).
const pic = (v) => {
  const s = String(v || '');
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s) || /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : '';
};

function letterhead(school) {
  const name = school?.name || localStorage.getItem('schoolName') || localStorage.getItem('registeredSchoolName') || 'School';
  const logo = pic(school?.logoUrl || localStorage.getItem('schoolLogoPreview'));
  const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const line = [school?.address, school?.phone && `Phone ${school.phone}`].filter(Boolean).join(' · ');
  return {
    name,
    html: `<header class="head">
      ${logo ? `<img src="${esc(logo)}" alt=""/>` : `<div class="mono">${esc(initials)}</div>`}
      <div class="who"><div class="sch" dir="auto">${esc(name)}</div>${line ? `<div class="ad" dir="auto">${esc(line)}</div>` : ''}</div>
    </header>`,
  };
}

const BASE_CSS = `
  *{box-sizing:border-box}
  body{font-family:Arial,'Segoe UI',sans-serif;margin:0;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .head{display:flex;gap:12px;align-items:center;padding-bottom:8px;border-bottom:2px solid #111827}
  .head img{width:52px;height:52px;object-fit:contain}
  .mono{width:50px;height:50px;border-radius:50%;background:#1B2F6E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex:none}
  .who{flex:1;text-align:center;padding-right:52px}
  .sch{font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1B2F6E}
  .ad{font-size:11px;color:#4B5563;margin-top:2px}
  .band{display:flex;justify-content:space-between;gap:12px;background:#1B2F6E;color:#fff;border-radius:4px;padding:6px 12px;margin:10px 0 8px;font-weight:800;font-size:13px}
  .band span:first-child{text-transform:uppercase;letter-spacing:1px}
  table{width:100%;border-collapse:collapse}
  .signs{display:flex;justify-content:space-between;gap:40px;padding-top:34px}
  .sg{flex:0 1 200px;text-align:center;font-size:12px}
  .ln{border-top:1.2px solid #111827}
  .lb{font-weight:700;margin-top:4px}
  .ft{display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF;margin-top:10px;border-top:1px solid #E5E7EB;padding-top:5px}
  .pr{position:relative}
  ${STAMP_CSS}
`;

/** One student's fee card for a session or year. */
export function printFeeCard({ student, school, period, cells, totals, stamp = '' }) {
  const lh = letterhead(school);
  const today = pkYmd(Date.now());
  const cls = [student?.class?.name || student?.className, student?.section?.name || student?.sectionName].filter(Boolean).join(' — ');
  const rows = cells.map((c, i) => {
    const look = lookOf(c);
    const receipts = c.payments.map((p) => p.receiptNo).filter(Boolean).join(', ');
    const days = c.payments.map((p) => dmy(p.day)).join(', ');
    const blank = !c.bills.length;
    return `<tr${blank ? ' class="blank"' : ''}>
      <td class="c">${i + 1}</td>
      <td><b>${esc(monthTitle(c.month, { short: false }))}</b>${c.bills.length > 1 ? `<div class="sub">${esc(c.bills.map((b) => b.feeTitle).join(' + '))}</div>` : ''}</td>
      <td class="r">${blank ? '' : rs(c.billed)}</td>
      <td class="r">${c.discount ? rs(c.discount) : ''}</td>
      <td class="r">${c.paid ? rs(c.paid) : ''}</td>
      <td class="r">${c.due ? `<b>${rs(c.due)}</b>` : ''}</td>
      <td>${esc(days)}</td>
      <td>${esc(receipts)}</td>
      <td><span class="st" style="background:${look.bg};color:${look.fg};border-color:${look.bd}">${esc(look.label)}</span></td>
    </tr>`;
  }).join('');
  const pending = totals.pendingList.map((m) => monthTitle(m)).join(', ');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fee Card — ${esc(student?.name)} — ${esc(period.title)}</title><style>
    @page{size:A4 portrait;margin:12mm}
    ${BASE_CSS}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:13px;margin:4px 0 10px}
    .info b{font-weight:700}
    th,td{border:1px solid #9CA3AF;padding:5px 7px;font-size:11.5px;text-align:left;vertical-align:top}
    th{background:#E5E9F5;color:#1B2F6E;font-size:10.5px;text-transform:uppercase}
    td.r,th.r{text-align:right;white-space:nowrap}td.c{text-align:center}
    tr.blank td{color:#9CA3AF}
    .sub{font-size:10px;color:#6B7280}
    .st{display:inline-block;border:1px solid;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;white-space:nowrap}
    tfoot td{font-weight:800;background:#F3F4F6}
    .sum{margin-top:10px;font-size:12.5px;line-height:1.6}
    .sum .bad{color:#991B1B;font-weight:700}
    .signs{padding-top:30mm}
  </style></head><body>
    ${lh.html}
    <div class="band"><span>Student Fee Card</span><span>${esc(period.title)} · ${esc(monthTitle(period.from))} – ${esc(monthTitle(period.to))}</span></div>
    <div class="info">
      <div>Student: <b dir="auto">${esc(student?.name)}</b></div>
      <div>Roll No.: <b>${esc(student?.rollNo || '—')}</b></div>
      <div>Father's name: <b dir="auto">${esc(student?.fatherName || '—')}</b></div>
      <div>Class: <b dir="auto">${esc(cls || '—')}</b></div>
    </div>
    <table>
      <thead><tr><th style="width:4%">#</th><th>Month</th><th class="r">Fee</th><th class="r">Discount</th><th class="r">Paid</th><th class="r">Balance</th><th>Collected on</th><th>Receipt No.</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td></td><td>Total</td><td class="r">${rs(totals.billed)}</td><td class="r">${totals.discount ? rs(totals.discount) : ''}</td><td class="r">${rs(totals.paid)}</td><td class="r">${rs(totals.due)}</td><td colspan="3"></td></tr></tfoot>
    </table>
    <div class="sum">
      ${totals.pendingMonths ? `<div class="bad">Pending: ${totals.pendingMonths} month${totals.pendingMonths === 1 ? '' : 's'} (${esc(pending)}) — ${esc(money(totals.due))}</div>` : `<div>No month of this period is pending.</div>`}
      ${totals.earlierDue ? `<div class="bad">Earlier dues (before ${esc(monthTitle(period.from))}): ${esc(money(totals.earlierDue))}</div>` : ''}
      ${totals.balance ? `<div><b>Total balance: ${esc(money(totals.balance))}</b></div>` : ''}
    </div>
    <div class="signs">
      <div class="sg"><div class="ln"></div><div class="lb">Accountant</div></div>
      <div class="sg pr">${stampImg(pic(stamp))}<div class="ln"></div><div class="lb">Principal</div></div>
    </div>
    <footer class="ft"><span dir="auto">${esc(lh.name)}</span><span>Printed ${esc(dmy(today))}</span></footer>
  </body></html>`;
  printHTML(html, { title: `Fee Card — ${student?.name || ''}` });
}

/** How a month reads in one small register cell. */
export function cellText(c) {
  switch (c.state) {
    case 'paid': return c.lastPaidOn ? `✓ ${dm(c.lastPaidOn)}` : '✓';
    case 'partial': return `P ${rs(c.due)}`;
    case 'unpaid': return rs(c.due);
    case 'none': return '—';
    case 'before': return '·';
    default: return '';
  }
}

/**
 * The class fee register on A4 landscape.
 * groups: [{ title, rows: [{ student, cells, totals }] }]; each group from a new page.
 */
export function printFeeRegister({ school, period, months, groups, note, stamp = '' }) {
  const lh = letterhead(school);
  const today = pkYmd(Date.now());
  const pages = groups.filter((g) => g.rows.length).map((g) => {
    const col = (i) => g.rows.reduce((s, r) => s + r.cells[i].paid, 0);
    const colDue = (i) => g.rows.reduce((s, r) => s + r.cells[i].due, 0);
    const paidCount = (i) => g.rows.filter((r) => r.cells[i].state === 'paid').length;
    const billedCount = (i) => g.rows.filter((r) => r.cells[i].bills.length).length;
    const body = g.rows.map((r, n) => `<tr>
      <td class="c">${n + 1}</td>
      <td class="roll">${esc(r.student.rollNo || '')}</td>
      <td class="nm"><b dir="auto">${esc(r.student.name)}</b>${r.student.fatherName ? `<div class="fa" dir="auto">${esc(r.student.fatherName)}</div>` : ''}</td>
      ${r.cells.map((c) => { const l = lookOf(c); return `<td class="m" style="background:${l.bg};color:${l.fg}">${esc(cellText(c))}</td>`; }).join('')}
      <td class="c${r.totals.pendingMonths ? ' bad' : ''}">${r.totals.pendingMonths || ''}</td>
      <td class="r${r.totals.balance ? ' bad' : ''}">${r.totals.balance ? rs(r.totals.balance) : '0'}</td>
    </tr>`).join('');
    const sum = (f) => g.rows.reduce((s, r) => s + f(r), 0);
    return `<section class="pg">
      ${lh.html}
      <div class="band"><span>Fee Register</span><span dir="auto">${esc(g.title)}</span><span>${esc(period.title)} · ${esc(monthTitle(period.from))} – ${esc(monthTitle(period.to))}</span></div>
      ${note ? `<div class="note">${esc(note)}</div>` : ''}
      <table>
        <thead><tr><th style="width:24px">#</th><th style="width:62px">Roll No.</th><th class="nm">Student / Father</th>
          ${months.map((m) => `<th class="m">${esc(monthTitle(m, { year: false }))}<div class="yr">${m.slice(0, 4)}</div></th>`).join('')}
          <th style="width:42px">Months pending</th><th style="width:62px" class="r">Balance (Rs.)</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr><td colspan="3">Collected (Rs.)</td>${months.map((m, i) => `<td class="m">${col(i) ? rs(col(i)) : ''}</td>`).join('')}<td></td><td class="r">${rs(sum((r) => r.totals.paid))}</td></tr>
          <tr><td colspan="3">Balance (Rs.)</td>${months.map((m, i) => `<td class="m bad">${colDue(i) ? rs(colDue(i)) : ''}</td>`).join('')}<td></td><td class="r bad">${rs(sum((r) => r.totals.balance))}</td></tr>
          <tr><td colspan="3">Students paid / billed</td>${months.map((m, i) => `<td class="m">${billedCount(i) ? `${paidCount(i)}/${billedCount(i)}` : ''}</td>`).join('')}<td></td><td></td></tr>
        </tfoot>
      </table>
      <div class="tail">
        <div class="legend"><span>✓ 05/09 = paid, with the day it was collected · P 1,500 = part paid, balance shown · red amount = unpaid · blue amount = due, not late yet · — = not billed · Balance includes dues from before ${esc(monthTitle(period.from))}.</span></div>
        <div class="signs"><div class="sg"><div class="ln"></div><div class="lb">Accountant</div></div><div class="when">${g.rows.length} student${g.rows.length === 1 ? '' : 's'} · Printed ${esc(dmy(today))}</div><div class="sg pr">${stampImg(pic(stamp))}<div class="ln"></div><div class="lb">Principal</div></div></div>
      </div>
    </section>`;
  }).join('');
  if (!pages) return false;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fee Register — ${esc(period.title)}</title><style>
    @page{size:A4 landscape;margin:8mm}
    ${BASE_CSS}
    .head{padding-bottom:5px}.head img{width:32px;height:32px}.mono{width:30px;height:30px;font-size:12px}.who{padding-right:32px}.sch{font-size:15px}.ad{font-size:10px}
    .band{margin:6px 0;font-size:12px;padding:5px 10px}
    .pg{break-after:page;page-break-after:always}
    .pg:last-child{break-after:auto;page-break-after:auto}
    .note{font-size:11px;color:#4B5563;margin:0 0 5px}
    th,td{border:1px solid #9CA3AF;padding:2px 4px;font-size:9.5px;text-align:left;line-height:1.25}
    th{background:#E5E9F5;color:#1B2F6E;font-size:9px;text-align:center}
    th.nm{text-align:left}
    .yr{font-weight:400;font-size:8px;color:#6B7280}
    td.m,th.m{text-align:center;white-space:nowrap;width:52px}
    td.c{text-align:center}td.r,th.r{text-align:right;white-space:nowrap}
    td.roll{white-space:nowrap}
    td.nm{min-width:120px}.fa{font-size:8.5px;color:#6B7280}
    .bad{color:#991B1B;font-weight:700}
    tr{break-inside:avoid;page-break-inside:avoid}
    thead{display:table-header-group}tfoot{display:table-row-group}
    tfoot td{font-weight:700;background:#F3F4F6;color:#111827}
    tfoot td.bad{color:#991B1B}
    .legend{display:flex;justify-content:space-between;gap:16px;font-size:9px;color:#4B5563;margin-top:4px}
    .legend .when{white-space:nowrap;color:#9CA3AF}
    .tail{break-inside:avoid;page-break-inside:avoid}.signs{padding-top:18px}.signs .lb{margin-top:2px}
    .ilm-stamp{width:12mm;max-height:12mm;bottom:0;left:50%;transform:translateX(-50%) rotate(-10deg)}
    .signs{align-items:flex-end}.signs .when{font-size:9px;color:#9CA3AF;white-space:nowrap;align-self:flex-end}
  </style></head><body>${pages}</body></html>`;
  printHTML(html, { title: `Fee Register — ${period.title}` });
  return true;
}
