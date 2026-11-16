/**
 * Printed fee challans and receipts.
 *
 *   printChallans({ challans, school, settings })
 *       Each student on one A4 landscape page, the copies side by side to cut
 *       apart: Bank / School / Parent when the school has a bank account (a
 *       bank challan), School / Parent when it has none (a fee slip paid at
 *       the counter). Only the months still owing are listed.
 *   printMonthsReceipt({ school, student, receipt })
 *       A receipt for fee received for several months at once: what each month
 *       received and what it still owes.
 */
import { printHTML } from './print';
import { amountInWords } from './feeChallan';
import { feePeriod } from './feeMonth';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pic = (v) => {
  const s = String(v || '');
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s) || /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : '';
};
const rs = (paisa) => Math.round(Number(paisa || 0) / 100).toLocaleString('en-PK');
const dmy = (ymd) => (ymd ? String(ymd).slice(0, 10).split('-').reverse().join('/') : '');
const todayPk = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const schoolName = (school) => school?.name || localStorage.getItem('schoolName') || localStorage.getItem('registeredSchoolName') || 'School';

const copyNames = (hasBank, copies) => {
  if (!hasBank) return copies <= 1 ? ['Parent copy'] : ['School copy', 'Parent copy'];
  if (copies <= 1) return ['Bank copy'];
  if (copies === 2) return ['Bank copy', 'School copy'];
  return ['Bank copy', 'School copy', 'Parent copy'];
};

/** At most 9 lines: the newest 8 months, and the older ones as one line of earlier dues. */
function challanLines(items) {
  if (items.length <= 9) return items.map((i) => ({ label: i.period || feePeriod(i) || i.feeTitle, title: i.feeTitle, due: i.due }));
  const older = items.slice(0, items.length - 8);
  const first = older[0]; const last = older[older.length - 1];
  return [
    { label: `Earlier dues (${older.length})`, title: `${first.period || feePeriod(first)} – ${last.period || feePeriod(last)}`, due: older.reduce((t, i) => t + i.due, 0) },
    ...items.slice(-8).map((i) => ({ label: i.period || feePeriod(i) || i.feeTitle, title: i.feeTitle, due: i.due })),
  ];
}

const CHALLAN_CSS = `
  @page{size:A4 landscape;margin:7mm}
  *{box-sizing:border-box}
  body{font-family:Arial,'Segoe UI',sans-serif;margin:0;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{display:flex;gap:0;page-break-after:always;break-after:page}
  .page:last-child{page-break-after:auto;break-after:auto}
  .copy{flex:1 1 0;min-width:0;padding:0 4.5mm;border-right:1.2px dashed #9CA3AF;display:flex;flex-direction:column;font-size:10.5px}
  .copy:first-child{padding-left:0}.copy:last-child{border-right:0;padding-right:0}
  .hd{display:flex;align-items:center;gap:7px;border-bottom:2px solid #1B2F6E;padding-bottom:5px}
  .hd img{width:34px;height:34px;object-fit:contain}
  .mono{width:32px;height:32px;border-radius:50%;background:#1B2F6E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none}
  .sch{font-size:13px;font-weight:800;color:#1B2F6E;text-transform:uppercase;line-height:1.15}
  .ad{font-size:8.5px;color:#4B5563;margin-top:1px}
  .cp{margin-left:auto;align-self:flex-start;background:#1B2F6E;color:#fff;font-size:8.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;border-radius:3px;padding:2px 6px;white-space:nowrap}
  .tt{display:flex;justify-content:space-between;align-items:flex-end;margin:6px 0 4px}
  .tt b{font-size:13px;letter-spacing:1px}
  .no{text-align:right}.no span{display:block;font-size:8px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px}
  .no strong{font-family:'Consolas','Courier New',monospace;font-size:15px;letter-spacing:1px}
  .dates{display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px}
  .dates .due{color:#991B1B;font-weight:800}
  .bank{border:1.3px solid #1B2F6E;border-radius:4px;padding:4px 6px;margin-bottom:5px;background:#F5F7FF}
  .bank .bn{font-weight:800;font-size:11px;color:#1B2F6E}
  .bank div{line-height:1.45}
  .bank .ac{font-family:'Consolas','Courier New',monospace;font-weight:700;font-size:11px}
  .who{display:grid;grid-template-columns:1fr auto;gap:1px 8px;margin-bottom:5px;line-height:1.45}
  .who b{font-weight:700}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #9CA3AF;padding:2.5px 4px;text-align:left;font-size:10px;vertical-align:top}
  th{background:#E5E9F5;color:#1B2F6E;font-size:8.5px;text-transform:uppercase}
  td.r,th.r{text-align:right;white-space:nowrap}
  td .t{font-size:8.5px;color:#6B7280}
  tfoot td{font-weight:800;background:#F3F4F6}
  .late td{font-weight:700;background:#fff;color:#991B1B}
  .words{font-size:9.5px;font-style:italic;margin:4px 0 3px}
  .note{font-size:8.5px;color:#374151;line-height:1.35;border-top:1px dotted #9CA3AF;padding-top:3px}
  .grow{flex:1}
  .stampbox{margin-top:8px;height:26mm;border:1px dashed #9CA3AF;border-radius:4px;display:flex;align-items:flex-end;justify-content:center;font-size:8.5px;color:#9CA3AF;padding-bottom:3px}
  .sg{display:flex;justify-content:space-between;gap:10px;padding-top:24px;font-size:9px;text-align:center}
  .sg div{flex:1;border-top:1px solid #111827;padding-top:2px}
`;

function challanCopy(c, name, { school, settings, hasBank, lh }) {
  const lines = challanLines(c.items || []);
  const lateAmount = c.amount + (c.lateFee || 0);
  const b = c.bank;
  const bankBox = hasBank && b ? `<div class="bank">
      <div class="bn" dir="auto">${esc(b.bankName)}${b.branch ? ` — ${esc(b.branch)}` : ''}${b.branchCode ? ` (${esc(b.branchCode)})` : ''}</div>
      <div>Account title: <b dir="auto">${esc(b.accountTitle || schoolName(school))}</b></div>
      <div>Account / IBAN: <span class="ac">${esc(b.accountNumber)}</span></div>
    </div>` : '';
  const cls = [c.student?.className, c.student?.sectionName].filter(Boolean).join(' – ');
  const signs = name === 'Parent copy'
    ? '<div>Depositor</div><div>Received by</div>'
    : hasBank ? '<div>Depositor</div><div>Bank officer &amp; stamp</div>' : '<div>Depositor</div><div>Cashier &amp; stamp</div>';
  const note = settings?.note || (hasBank
    ? 'Deposit at any branch of the bank above. Paying online: transfer to the account above and write the challan number as the reference.'
    : 'Pay at the school office. Keep the parent copy as your receipt.');
  return `<section class="copy">
    <div class="hd">${lh.logo}<div><div class="sch" dir="auto">${esc(lh.name)}</div>${c.campusName || lh.line ? `<div class="ad" dir="auto">${esc([c.campusName, lh.line].filter(Boolean).join(' · '))}</div>` : ''}</div><div class="cp">${esc(name)}</div></div>
    <div class="tt"><b>${hasBank ? 'FEE CHALLAN' : 'FEE SLIP'}</b><div class="no"><span>${hasBank ? 'Challan No.' : 'Slip No.'}</span><strong>${esc(c.challanNo)}</strong></div></div>
    <div class="dates"><span>Issued: <b>${esc(dmy(c.issuedOn))}</b></span><span class="due">Due date: ${esc(dmy(c.dueDate))}</span></div>
    ${bankBox}
    <div class="who">
      <div>Student: <b dir="auto">${esc(c.student?.name)}</b></div><div>Roll No.: <b>${esc(c.student?.rollNo || '—')}</b></div>
      <div>Father: <b dir="auto">${esc(c.student?.fatherName || '—')}</b></div><div>Class: <b dir="auto">${esc(cls || '—')}</b></div>
    </div>
    <table>
      <thead><tr><th>Month</th><th class="r">Rs</th></tr></thead>
      <tbody>${lines.map((l) => `<tr><td><b>${esc(l.label)}</b>${l.title && l.title !== l.label ? `<div class="t" dir="auto">${esc(l.title)}</div>` : ''}</td><td class="r">${rs(l.due)}</td></tr>`).join('')}</tbody>
      <tfoot>
        <tr><td>Payable by ${esc(dmy(c.dueDate))}</td><td class="r">${rs(c.amount)}</td></tr>
        ${c.lateFee ? `<tr class="late"><td>After the due date (late fee ${rs(c.lateFee)})</td><td class="r">${rs(lateAmount)}</td></tr>` : ''}
      </tfoot>
    </table>
    <div class="words">${esc(amountInWords(c.amount))}</div>
    <div class="note" dir="auto">${esc(note)}</div>
    <div class="grow"></div>
    <div class="stampbox">${hasBank ? 'Bank stamp &amp; date received' : 'School stamp &amp; date received'}</div>
    <div class="sg">${signs}</div>
  </section>`;
}

export function printChallans({ challans, school, settings }) {
  const name = schoolName(school);
  const logo = pic(school?.logoUrl || localStorage.getItem('schoolLogoPreview'));
  const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const lh = {
    name,
    logo: logo ? `<img src="${esc(logo)}" alt=""/>` : `<div class="mono">${esc(initials)}</div>`,
    line: [school?.phone && `Phone ${school.phone}`].filter(Boolean).join(' · '),
  };
  const copies = Number(settings?.copies) || 3;
  const pages = challans.map((c) => {
    const hasBank = !!c.bank;
    return `<div class="page">${copyNames(hasBank, copies).map((n) => challanCopy(c, n, { school, settings, hasBank, lh })).join('')}</div>`;
  }).join('');
  const title = challans.length === 1 ? `Fee Challan ${challans[0].challanNo} — ${challans[0].student?.name || ''}` : `Fee Challans (${challans.length})`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CHALLAN_CSS}</style></head><body>${pages}</body></html>`;
  printHTML(html, { title });
}

/** A receipt for fee received for several months at once. */
export function printMonthsReceipt({ school, student, receipt, cashier }) {
  const name = schoolName(school);
  const cls = [student?.class?.name || student?.className, student?.section?.name || student?.sectionName].filter(Boolean).join(' – ');
  const rows = receipt.lines.map((l) => `<tr>
      <td><b>${esc(l.period || l.feeTitle)}</b>${l.period && l.feeTitle ? `<div class="t" dir="auto">${esc(l.feeTitle)}</div>` : ''}</td>
      <td class="r">${rs(l.due)}</td><td class="r"><b>${l.paid ? rs(l.paid) : '—'}</b></td><td class="r">${l.balance ? rs(l.balance) : '0'}</td>
      <td>${l.balance === 0 ? 'Paid' : l.paid ? 'Part paid' : 'Not paid'}</td></tr>`).join('');
  const METHOD = { cash: 'Cash', bank: 'Bank deposit', online: 'Online transfer', card: 'Card', cheque: 'Cheque', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash' };
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${esc(receipt.receiptNo)}</title><style>
    @page{size:A5 portrait;margin:9mm}
    *{box-sizing:border-box}
    body{font-family:Arial,'Segoe UI',sans-serif;margin:0;color:#111827;font-size:11.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .hd{text-align:center;border-bottom:2px solid #1B2F6E;padding-bottom:6px}
    .sch{font-size:16px;font-weight:800;color:#1B2F6E;text-transform:uppercase}
    .ad{font-size:9.5px;color:#4B5563}
    .tt{display:flex;justify-content:space-between;align-items:center;margin:8px 0}
    .tt b{font-size:13px;letter-spacing:1px;color:#15803D}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;margin-bottom:8px;line-height:1.5}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #9CA3AF;padding:3px 5px;text-align:left;font-size:10.5px;vertical-align:top}
    th{background:#E5E9F5;color:#1B2F6E;font-size:9px;text-transform:uppercase}
    td.r,th.r{text-align:right;white-space:nowrap}
    .t{font-size:9px;color:#6B7280}
    tfoot td{font-weight:800;background:#F3F4F6}
    .sum{margin-top:8px;line-height:1.6}
    .bal{font-weight:800;color:#991B1B}
    .sg{display:flex;justify-content:space-between;gap:30px;padding-top:30px;text-align:center;font-size:10px}
    .sg div{flex:0 1 150px;border-top:1px solid #111827;padding-top:2px}
    .ft{font-size:8.5px;color:#9CA3AF;text-align:center;margin-top:10px}
  </style></head><body>
    <div class="hd"><div class="sch" dir="auto">${esc(name)}</div>${school?.address || school?.phone ? `<div class="ad" dir="auto">${esc([school?.address, school?.phone && `Phone ${school.phone}`].filter(Boolean).join(' · '))}</div>` : ''}</div>
    <div class="tt"><b>FEE RECEIPT</b><span>No. <b style="color:#111827;letter-spacing:0">${esc(receipt.receiptNo)}</b></span></div>
    <div class="grid">
      <div>Student: <b dir="auto">${esc(student?.name)}</b></div><div>Roll No.: <b>${esc(student?.rollNo || '—')}</b></div>
      <div>Father: <b dir="auto">${esc(student?.fatherName || '—')}</b></div><div>Class: <b dir="auto">${esc(cls || '—')}</b></div>
      <div>Received on: <b>${esc(dmy(receipt.paymentDate))}</b></div><div>Paid by: <b>${esc(METHOD[receipt.method] || receipt.method || 'Cash')}</b></div>
    </div>
    <table>
      <thead><tr><th>Month</th><th class="r">Owed</th><th class="r">Paid now</th><th class="r">Balance</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td>Total</td><td class="r">${rs(receipt.lines.reduce((t, l) => t + l.due, 0))}</td><td class="r">${rs(receipt.amountPaid)}</td><td class="r">${rs(receipt.lines.reduce((t, l) => t + l.balance, 0))}</td><td></td></tr></tfoot>
    </table>
    <div class="sum">
      <div>Received: <b>Rs ${rs(receipt.amountPaid)}</b> — <i>${esc(amountInWords(receipt.amountPaid))}</i></div>
      ${receipt.balance ? `<div class="bal">Still to pay (all months): Rs ${rs(receipt.balance)}</div>` : '<div><b>Nothing more is owed.</b></div>'}
      ${receipt.note ? `<div>Note: ${esc(receipt.note)}</div>` : ''}
    </div>
    <div class="sg"><div>${esc(cashier || 'Cashier')}</div><div>Parent</div></div>
    <div class="ft">Printed ${esc(dmy(todayPk()))}</div>
  </body></html>`;
  printHTML(html, { title: `Receipt ${receipt.receiptNo}` });
}
