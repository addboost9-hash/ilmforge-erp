/**
 * Paying salaries through the bank.
 *
 *   printSalaryBankLetter({ school, bank, period, rows, date, chequeNo })
 *       The letter to the school's bank, on the letterhead: debit our account
 *       with the total and credit each person's account; the list, the total in
 *       figures and words, and lines for the authorised signatories.
 *   salaryBankCsv({ rows, period })   the same list as a CSV sheet, for the
 *                                     bank's bulk upload (internet banking)
 *   downloadText(name, text, type)    saves it from the browser
 */
import { printHTML } from './print';
import { amountInWords } from './feeChallan';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pic = (v) => {
  const s = String(v || '');
  return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s) || /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s) ? s : '';
};
const rs = (paisa) => Math.round(Number(paisa || 0) / 100).toLocaleString('en-PK');
const dmy = (ymd) => (ymd ? String(ymd).split('-').reverse().join('/') : '');

export function printSalaryBankLetter({ school, bank, period, rows, date, chequeNo }) {
  const name = school?.name || localStorage.getItem('schoolName') || 'School';
  const logo = pic(school?.logoUrl);
  const total = rows.reduce((t, r) => t + (r.netSalary || 0), 0);
  const body = rows.map((r, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td><b dir="auto">${esc(r.name)}</b>${r.empCode ? `<div class="s">${esc(r.empCode)}${r.designation ? ` · ${esc(r.designation)}` : ''}</div>` : ''}</td>
      <td>${esc(r.cnic || '')}</td>
      <td dir="auto">${esc(r.bankName)}</td>
      <td dir="auto">${esc(r.bankAccountTitle || r.name)}</td>
      <td class="m">${esc(r.bankAccountNo)}</td>
      <td class="r">${rs(r.netSalary)}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Salary transfer — ${esc(period)}</title><style>
    @page{size:A4 portrait;margin:14mm}
    *{box-sizing:border-box}
    body{font-family:Arial,'Segoe UI',sans-serif;margin:0;color:#111827;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .head{display:flex;gap:12px;align-items:center;padding-bottom:8px;border-bottom:2px solid #111827}
    .head img{width:52px;height:52px;object-fit:contain}
    .who{flex:1;text-align:center}
    .sch{font-size:19px;font-weight:800;text-transform:uppercase;color:#1B2F6E}
    .ad{font-size:11px;color:#4B5563}
    .meta{display:flex;justify-content:space-between;margin:14px 0 10px}
    p{line-height:1.6;margin:6px 0}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #9CA3AF;padding:4px 6px;text-align:left;font-size:10.5px;vertical-align:top}
    th{background:#E5E9F5;color:#1B2F6E;font-size:9.5px;text-transform:uppercase}
    td.r,th.r{text-align:right;white-space:nowrap}td.c{text-align:center}
    td.m{font-family:'Consolas','Courier New',monospace;white-space:nowrap}
    .s{font-size:9px;color:#6B7280}
    tfoot td{font-weight:800;background:#F3F4F6}
    thead{display:table-header-group}tr{break-inside:avoid}
    .signs{display:flex;justify-content:space-between;gap:40px;padding-top:46px}
    .signs div{flex:0 1 210px;border-top:1.2px solid #111827;text-align:center;padding-top:3px;font-weight:700}
  </style></head><body>
    <header class="head">${logo ? `<img src="${esc(logo)}" alt=""/>` : ''}<div class="who"><div class="sch" dir="auto">${esc(name)}</div>${school?.address || school?.phone ? `<div class="ad" dir="auto">${esc([school?.address, school?.phone && `Phone ${school.phone}`].filter(Boolean).join(' · '))}</div>` : ''}</div></header>
    <div class="meta"><span>Ref: Salaries ${esc(period)}</span><span>Date: <b>${esc(dmy(date))}</b></span></div>
    <p>The Branch Manager,<br/><b dir="auto">${esc(bank?.bankName || '')}</b>${bank?.branch ? `, <span dir="auto">${esc(bank.branch)}</span>` : ''}${bank?.branchCode ? ` (branch code ${esc(bank.branchCode)})` : ''}</p>
    <p><b>Subject: Transfer of staff salaries for ${esc(period)}</b></p>
    <p>Dear Sir / Madam,</p>
    <p>Please debit our account No. <b>${esc(bank?.accountNumber || '')}</b>, titled <b dir="auto">${esc(bank?.accountTitle || name)}</b>, with
      <b>Rs ${rs(total)}</b> (${esc(amountInWords(total))})${chequeNo ? `, against cheque No. <b>${esc(chequeNo)}</b>,` : ''}
      and credit the salaries of our ${rows.length} staff member${rows.length === 1 ? '' : 's'} listed below to their accounts.</p>
    <table>
      <thead><tr><th style="width:4%">#</th><th>Name</th><th>CNIC</th><th>Bank</th><th>Account title</th><th>Account no. / IBAN</th><th class="r">Amount (Rs)</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td></td><td colspan="5">Total (${rows.length})</td><td class="r">${rs(total)}</td></tr></tfoot>
    </table>
    <p style="margin-top:12px">Thank you.</p>
    <div class="signs"><div>Authorised signatory</div><div>Authorised signatory</div></div>
  </body></html>`;
  printHTML(html, { title: `Salary transfer ${period}` });
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function salaryBankCsv({ rows, period }) {
  const head = ['Sr', 'Employee Code', 'Name', 'CNIC', 'Bank', 'Account Title', 'Account No / IBAN', 'Amount (Rs)', 'Narration'];
  const lines = rows.map((r, i) => [i + 1, r.empCode, r.name, r.cnic, r.bankName, r.bankAccountTitle || r.name, r.bankAccountNo, Math.round((r.netSalary || 0) / 100), `Salary ${period}`]);
  return [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\r\n');
}

export function downloadText(fileName, text, type = 'text/csv') {
  const href = URL.createObjectURL(new Blob(['﻿', text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = href; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
