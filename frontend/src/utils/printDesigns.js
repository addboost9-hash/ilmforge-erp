/**
 * IlmForge — Premium Print Designs
 * ═══════════════════════════════════
 * printIDCard(student, school)     — modern gradient ID card with QR-style barcode
 * printFeeVoucher(invoice, student, school) — 3-copy bank-style voucher (Bank/School/Parent)
 * printCredentialsSlip(...)        — portal credentials handout
 * All self-contained: open print window, no dependencies.
 */

import { buildWatermarkCss, buildWatermarkMarkup } from './watermarkPrint';

const esc = (s) => String(s ?? '—').replace(/</g, '&lt;');

/* ═══════════════ PREMIUM ID CARD ═══════════════ */
export function printIDCard(student, school, opts = {}) {
  const name = esc(student.name);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const themeColor = opts.color || school?.themeColor || '#0D9488';
  const wmLogo = (school?.logoUrl || (typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : '') || '').trim();
  const wmSchool = esc(school?.name || 'IlmForge School');
  const watermarkCss = buildWatermarkCss({ mode: 'compact', position: 'absolute', color: '#0F172A', logoSize: '132px', textSize: '11px', textMarginTop: '6px' });
  const watermarkHtml = buildWatermarkMarkup({ logo: wmLogo, text: wmSchool, imgAlt: 'watermark' });
  const w = window.open('', '_blank', 'width=380,height=620');
  w.document.write(`<!DOCTYPE html><html><head><title>ID Card — ${name}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#EEF2F7;padding:20px}
    .card{width:280px;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,.25);background:#fff;position:relative}
    ${watermarkCss}
    /* Top band with gradient + pattern */
    .top{background:linear-gradient(135deg,${themeColor} 0%,${themeColor}dd 60%,${themeColor}bb 100%);padding:22px 20px 54px;position:relative;overflow:hidden}
    .top::before{content:'';position:absolute;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.08);top:-90px;right:-50px}
    .top::after{content:'';position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.06);bottom:-40px;left:-30px}
    .school{color:#fff;font-weight:800;font-size:14px;letter-spacing:.02em;position:relative;z-index:1;text-align:center}
    .sub{color:rgba(255,255,255,.75);font-size:9px;text-transform:uppercase;letter-spacing:.15em;text-align:center;margin-top:3px;position:relative;z-index:1}
    /* Avatar overlapping */
    .avatar-wrap{display:flex;justify-content:center;margin-top:-44px;position:relative;z-index:2}
    .avatar{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#fff,#F0FDFA);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:${themeColor};border:4px solid #fff;box-shadow:0 8px 24px rgba(15,23,42,.18)}
    .body{padding:14px 20px 18px;text-align:center}
    .name{font-size:17px;font-weight:800;color:#0F172A;letter-spacing:-.01em}
    .role-chip{display:inline-block;background:${themeColor}14;color:${themeColor};font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;padding:4px 14px;border-radius:999px;margin-top:6px}
    .info{margin-top:14px;text-align:left;border-top:1px solid #F1F5F9;padding-top:10px}
    .row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed #F1F5F9;font-size:11px}
    .row:last-child{border:none}
    .k{color:#94A3B8;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:.08em}
    .v{color:#0F172A;font-weight:700}
    /* Barcode strip */
    .barcode{margin:12px 20px 0;padding:9px 0;background:#0F172A;border-radius:10px;display:flex;justify-content:center;align-items:flex-end;gap:1.5px;height:44px}
    .bar{background:#fff;width:2px}
    .roll-strip{text-align:center;font-family:'Consolas',monospace;font-size:10px;color:#64748B;letter-spacing:.35em;padding:6px 0 14px}
    /* Bottom band */
    .bottom{background:${themeColor};padding:8px;text-align:center;color:rgba(255,255,255,.85);font-size:8.5px;letter-spacing:.05em}
    @media print{body{background:#fff;padding:0}.card{box-shadow:none;border:1px solid #E2E8F0}}
  </style></head><body>
    <div class="card">
      ${watermarkHtml}
      <div class="top">
        <div class="school">${esc(school?.name || 'IlmForge School')}</div>
        <div class="sub">Student Identity Card · ${esc(opts.session || '2025-26')}</div>
      </div>
      <div class="avatar-wrap"><div class="avatar">${initials}</div></div>
      <div class="body">
        <div class="name">${name}</div>
        <div class="role-chip">${esc(student.class?.name || 'Student')}${student.section ? ' — ' + esc(student.section.name) : ''}</div>
        <div class="info">
          <div class="row"><span class="k">Roll No</span><span class="v">${esc(student.rollNo)}</span></div>
          <div class="row"><span class="k">Father</span><span class="v">${esc(student.fatherName)}</span></div>
          <div class="row"><span class="k">D.O.B</span><span class="v">${student.dob ? new Date(student.dob).toLocaleDateString('en-PK') : '—'}</span></div>
          <div class="row"><span class="k">Emergency</span><span class="v">${esc(student.emergencyPhone)}</span></div>
        </div>
      </div>
      <div class="barcode">${Array.from({length: 42}, () => `<div class="bar" style="height:${10 + Math.floor(Math.random() * 24)}px;width:${Math.random() > 0.7 ? 3 : 2}px"></div>`).join('')}</div>
      <div class="roll-strip">${esc(student.rollNo)}</div>
      <div class="bottom">If found, please return to ${esc(school?.name || 'school')} · ${esc(school?.phone || '')}</div>
    </div>
    <script>setTimeout(()=>window.print(),500)</script>
  </body></html>`);
  w.document.close();
}

/* ═══════════════ 3-COPY BANK-STYLE FEE VOUCHER ═══════════════ */
export function printFeeVoucher(invoice, student, school) {
  const themeColor = school?.themeColor || '#0D9488';
  const copies = ['BANK COPY', 'SCHOOL COPY', 'PARENT COPY'];
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-PK') : '—';
  const issueDate = new Date().toLocaleDateString('en-PK');
  const voucherNo = `V-${invoice.id || Date.now().toString().slice(-6)}`;
  const total = invoice.totalAmount ?? invoice.amount ?? 0;
  const paid = invoice.paidAmount ?? 0;
  const balance = invoice.balance ?? (total - paid);
  const lateFee = invoice.lateFee ?? 0;
  const wmLogo = school?.logoUrl || (typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : '') || '';
  const wmSchool = esc(school?.name || 'IlmForge School');
  const watermarkCss = buildWatermarkCss({ mode: 'compact', position: 'absolute', color: '#0F172A', containerClass: 'v-wm', logoClass: 'v-wm-img', fallbackClass: 'v-wm-fallback', textClass: 'v-wm-text', logoSize: '102px', textSize: '11px', textMarginTop: '6px' });

  const copyBlock = (label) => `
    <div class="voucher">
      ${buildWatermarkMarkup({ logo: wmLogo, text: wmSchool, containerClass: 'v-wm', logoClass: 'v-wm-img', fallbackClass: 'v-wm-fallback', textClass: 'v-wm-text', imgAlt: 'watermark' })}
      <div class="v-copy">${label}</div>
      <div class="v-hd">
        <div class="v-school">
          <div class="v-logo">${esc((school?.name || 'IF')[0])}</div>
          <div>
            <div class="v-sname">${esc(school?.name || 'IlmForge School')}</div>
            <div class="v-saddr">${esc(school?.address || '')}</div>
          </div>
        </div>
        <div class="v-meta">
          <div><span>Voucher #</span><b>${voucherNo}</b></div>
          <div><span>Issue Date</span><b>${issueDate}</b></div>
          <div><span>Due Date</span><b class="due">${dueDate}</b></div>
        </div>
      </div>
      <div class="v-student">
        <div><span>Student</span><b>${esc(student?.name)}</b></div>
        <div><span>Roll No</span><b>${esc(student?.rollNo)}</b></div>
        <div><span>Class</span><b>${esc(student?.class?.name)}${student?.section ? ' — ' + esc(student.section.name) : ''}</b></div>
        <div><span>Father</span><b>${esc(student?.fatherName)}</b></div>
      </div>
      <table class="v-table">
        <thead><tr><th>Description</th><th style="text-align:right">Amount (Rs)</th></tr></thead>
        <tbody>
          <tr><td>Tuition Fee — ${esc(invoice.month)} ${esc(invoice.year)}</td><td style="text-align:right">${Number(total).toLocaleString()}</td></tr>
          ${lateFee > 0 ? `<tr><td>Late Fee (after due date)</td><td style="text-align:right">${Number(lateFee).toLocaleString()}</td></tr>` : ''}
          ${paid > 0 ? `<tr><td>Already Paid</td><td style="text-align:right">− ${Number(paid).toLocaleString()}</td></tr>` : ''}
        </tbody>
        <tfoot><tr><td>PAYABLE AMOUNT</td><td style="text-align:right">Rs ${Number(balance + lateFee).toLocaleString()}</td></tr></tfoot>
      </table>
      <div class="v-ft">
        <div class="v-sig">Depositor Signature</div>
        <div class="v-sig">Bank / Cashier Stamp</div>
      </div>
    </div>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><title>Fee Voucher — ${esc(student?.name)}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#F1F5F9;padding:16px;font-size:11px;color:#0F172A}
    .sheet{display:flex;gap:10px;max-width:1050px;margin:0 auto}
    .voucher{flex:1;background:#fff;border:1.5px solid #CBD5E1;border-radius:12px;padding:14px;position:relative;overflow:hidden}
    ${watermarkCss}
    .voucher::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:${themeColor}}
    .v-copy{position:absolute;top:10px;right:-26px;background:${themeColor};color:#fff;font-size:8px;font-weight:800;letter-spacing:.1em;padding:3px 30px;transform:rotate(38deg);z-index:2}
    .v-hd{margin-bottom:10px;position:relative;z-index:1}
    .v-school{display:flex;gap:8px;align-items:center;margin-bottom:8px}
    .v-logo{width:34px;height:34px;border-radius:9px;background:${themeColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px}
    .v-sname{font-weight:800;font-size:12px}
    .v-saddr{font-size:8.5px;color:#64748B}
    .v-meta{display:flex;gap:10px;flex-wrap:wrap;background:#F8FAFC;border-radius:8px;padding:7px 9px}
    .v-meta div{flex:1;min-width:70px}
    .v-meta span{display:block;font-size:7.5px;color:#94A3B8;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
    .v-meta b{font-size:10px}
    .v-meta .due{color:#DC2626}
    .v-student{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;padding:8px 0;border-top:1px dashed #E2E8F0;border-bottom:1px dashed #E2E8F0;margin-bottom:8px;position:relative;z-index:1}
    .v-student span{display:block;font-size:7.5px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.05em}
    .v-student b{font-size:10.5px}
    .v-table{width:100%;border-collapse:collapse;margin-bottom:10px;position:relative;z-index:1}
    .v-table th{background:${themeColor}0f;color:${themeColor};font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;padding:6px 8px;text-align:left}
    .v-table td{padding:6px 8px;border-bottom:1px solid #F1F5F9;font-size:10.5px}
    .v-table tfoot td{background:#0F172A;color:#fff;font-weight:800;font-size:11.5px;border:none}
    .v-table tfoot td:first-child{border-radius:8px 0 0 8px}
    .v-table tfoot td:last-child{border-radius:0 8px 8px 0}
    .v-ft{display:flex;gap:14px;margin-top:22px;position:relative;z-index:1}
    .v-sig{flex:1;border-top:1px solid #94A3B8;padding-top:4px;font-size:8px;color:#64748B;text-align:center}
    @media print{body{background:#fff;padding:6px}.sheet{gap:6px}}
  </style></head><body>
    <div class="sheet">${copies.map(copyBlock).join('')}</div>
    <script>setTimeout(()=>window.print(),500)</script>
  </body></html>`);
  w.document.close();
}

/* ═══════════════ STAFF ID CARD ═══════════════ */
export function printStaffIDCard(staff, school) {
  printIDCard(
    {
      name: staff.name,
      rollNo: staff.employeeCode || `EMP-${staff.id}`,
      fatherName: staff.designation || 'Staff',
      dob: staff.joiningDate,
      emergencyPhone: staff.phone,
      class: { name: staff.designation || 'Staff Member' },
    },
    school,
    { color: '#7C3AED', session: 'Staff Card' }
  );
}
