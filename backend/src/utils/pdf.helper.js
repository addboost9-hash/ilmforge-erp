/**
 * PDF / HTML Generator
 * All documents embed school logo, colors and branding.
 * In dev: returns HTML string (open in browser → Print → PDF)
 * In prod: pass through puppeteer for PDF generation
 */

/* ── helpers ─────────────────────────────────────────── */
const money  = v => 'Rs. ' + Math.round(v / 100).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/** Base CSS used across all documents */
const baseCss = (primary = '#1E3A5F', accent = '#0D9488') => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-after: always; }
  }
  /* Brand variables */
  :root { --primary: ${primary}; --accent: ${accent}; }
`;

/** School header block (used in all documents) */
const schoolHeader = (school, logoBase64 = '') => {
  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="Logo" style="width:64px;height:64px;object-fit:cover;border-radius:12px;"/>`
    : `<div style="width:64px;height:64px;background:${school.primaryColor||'#1E3A5F'};border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:900;">${school.name?.charAt(0)||'S'}</div>`;

  return `
  <div style="display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid ${school.primaryColor||'#1E3A5F'};margin-bottom:14px;">
    ${logoHtml}
    <div>
      <h1 style="font-size:20px;font-weight:900;color:${school.primaryColor||'#1E3A5F'};margin:0 0 3px;">${school.name}</h1>
      ${school.address ? `<p style="margin:0;color:#555;font-size:11px;">${school.address}${school.city?' — '+school.city:''}</p>` : ''}
      ${school.phone || school.email ? `<p style="margin:1px 0;color:#555;font-size:11px;">${[school.phone, school.email].filter(Boolean).join('  |  ')}</p>` : ''}
    </div>
  </div>`;
};

/* ══════════════════════════════════════════════════════
   FEE VOUCHER
══════════════════════════════════════════════════════ */
const generateFeeVoucherHTML = ({ school, student, invoice, payments = [] }) => {
  const primary = school.primaryColor || '#1E3A5F';
  const accent  = school.accentColor  || '#0D9488';

  const copies = ['Bank Copy', 'School Copy', 'Parent Copy'];

  const copyHtml = copies.map((copyName, ci) => `
  <div class="voucher" style="border:1px solid #CBD5E1;border-radius:10px;padding:18px;max-width:680px;margin:0 auto ${ci < 2 ? '0' : '0'};">
    ${schoolHeader(school)}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span style="background:${primary};color:#fff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:99px;">FEE VOUCHER</span>
        <span style="margin-left:8px;font-size:11px;color:#64748B;">Voucher #: <strong>${invoice.voucherNo||invoice.id||'N/A'}</strong></span>
      </div>
      <span style="background:${accent};color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:4px;">${copyName}</span>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <tr style="background:#F8FAFC;">
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11px;color:#64748B;">Student Name</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11.5px;font-weight:700;color:${primary};">${student.name}</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11px;color:#64748B;">Roll No</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11.5px;font-weight:700;">${student.rollNo||'—'}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11px;color:#64748B;">Father's Name</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11.5px;">${student.fatherName||'—'}</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11px;color:#64748B;">Class / Section</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11.5px;">${student.class?.name||'—'} — ${student.section?.name||'—'}</td>
      </tr>
      <tr style="background:#F8FAFC;">
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11px;color:#64748B;">Month / Year</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11.5px;font-weight:600;">${invoice.month||'—'} ${invoice.year||''}</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11px;color:#64748B;">Due Date</td>
        <td style="padding:6px 10px;border:1px solid #E2E8F0;font-size:11.5px;color:#DC2626;">${fmtDate(invoice.dueDate)}</td>
      </tr>
    </table>

    <!-- Fee breakdown -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <thead>
        <tr style="background:${primary};">
          <th style="padding:8px 10px;text-align:left;color:#fff;font-size:11px;">Fee Description</th>
          <th style="padding:8px 10px;text-align:right;color:#fff;font-size:11px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 10px;border:1px solid #E2E8F0;">${invoice.feeTitle}</td><td style="padding:6px 10px;border:1px solid #E2E8F0;text-align:right;">${money(invoice.totalAmount)}</td></tr>
        ${invoice.discount > 0 ? `<tr><td style="padding:6px 10px;border:1px solid #E2E8F0;color:#0D9488;">Discount</td><td style="padding:6px 10px;border:1px solid #E2E8F0;text-align:right;color:#0D9488;">− ${money(invoice.discount)}</td></tr>` : ''}
        ${invoice.lateFee > 0 ? `<tr><td style="padding:6px 10px;border:1px solid #E2E8F0;color:#DC2626;">Late Fee</td><td style="padding:6px 10px;border:1px solid #E2E8F0;text-align:right;color:#DC2626;">+ ${money(invoice.lateFee)}</td></tr>` : ''}
        <tr style="background:#DBEAFE;"><td style="padding:8px 10px;font-weight:700;color:${primary};">Total Amount</td><td style="padding:8px 10px;text-align:right;font-weight:800;font-size:14px;color:${primary};">${money(invoice.totalAmount)}</td></tr>
        ${invoice.paidAmount > 0 ? `<tr><td style="padding:6px 10px;color:#15803D;">Amount Paid</td><td style="padding:6px 10px;text-align:right;color:#15803D;font-weight:700;">− ${money(invoice.paidAmount)}</td></tr>` : ''}
        <tr style="background:${invoice.dueAmount > 0 ? '#FEE2E2' : '#DCFCE7'};"><td style="padding:8px 10px;font-weight:700;color:${invoice.dueAmount>0?'#B91C1C':'#15803D'};">Amount Due</td><td style="padding:8px 10px;text-align:right;font-weight:800;font-size:15px;color:${invoice.dueAmount>0?'#B91C1C':'#15803D'};">${money(invoice.dueAmount)}</td></tr>
      </tbody>
    </table>

    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px dashed #CBD5E1;">
      <p style="font-size:10px;color:#94A3B8;margin:0;">Computer generated voucher. Valid without signature.</p>
      <div style="text-align:right;">
        <p style="font-size:10px;color:#64748B;margin:0;">Authorized Signature</p>
        <div style="border-bottom:1px solid #374151;width:100px;margin:20px 0 3px;"></div>
        <p style="font-size:10px;color:#64748B;margin:0;">Principal / School</p>
      </div>
    </div>
  </div>`).join(`<div style="margin:10px 0;border-bottom:2px dashed #CBD5E1;"></div>`);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Voucher — ${school.name}</title>
  <style>${baseCss(primary, accent)}</style>
  </head><body style="padding:16px;">
    <div class="no-print" style="text-align:right;margin-bottom:12px;">
      <button onclick="window.print()" style="background:${primary};color:#fff;border:none;padding:8px 20px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Print Voucher</button>
    </div>
    ${copyHtml}
  </body></html>`;
};

/* ══════════════════════════════════════════════════════
   MARKSHEET / RESULT CARD
══════════════════════════════════════════════════════ */
const generateMarksheetHTML = ({ school, student, exam, marks = [] }) => {
  const primary = school.primaryColor || '#1E3A5F';
  const accent  = school.accentColor  || '#0D9488';

  const totalObtained = marks.filter(m=>!m.isAbsent).reduce((s,m)=>s+m.obtainedMarks,0);
  const totalMax      = marks.reduce((s,m)=>s+m.totalMarks,0);
  const pct           = totalMax > 0 ? ((totalObtained/totalMax)*100).toFixed(1) : '0.0';
  const grade         = pct>=90?'A+':pct>=80?'A':pct>=70?'B':pct>=60?'C':pct>=50?'D':pct>=40?'E':'F';
  const pass          = parseFloat(pct) >= 40;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Result Card — ${student.name}</title>
  <style>${baseCss(primary, accent)}</style>
  </head><body style="padding:20px;max-width:800px;margin:0 auto;">
    <div class="no-print" style="text-align:right;margin-bottom:12px;">
      <button onclick="window.print()" style="background:${primary};color:#fff;border:none;padding:8px 20px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;">🖨 Print Marksheet</button>
    </div>

    ${schoolHeader(school)}

    <div style="background:${primary};color:#fff;text-align:center;padding:9px;font-size:14px;font-weight:800;border-radius:7px;margin-bottom:16px;letter-spacing:1px;">
      RESULT CARD — ${exam.title?.toUpperCase()}
    </div>

    <!-- Student info -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;">
      ${[['Name',exam.student?.name||student.name],['Roll No',student.rollNo||'—'],["Father's Name",student.fatherName||'—'],['Class',student.class?.name||'—'],['Exam',exam.title],['Date',fmtDate(exam.dateEnd||exam.dateStart)]].map(([l,v])=>`<div style="font-size:12px;"><span style="color:#64748B;">${l}: </span><strong style="color:${primary};">${v}</strong></div>`).join('')}
    </div>

    <!-- Marks table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="background:${primary};">
          <th style="padding:9px 12px;text-align:left;color:#fff;font-size:11px;">Subject</th>
          <th style="padding:9px 12px;text-align:center;color:#fff;font-size:11px;">Total Marks</th>
          <th style="padding:9px 12px;text-align:center;color:#fff;font-size:11px;">Obtained</th>
          <th style="padding:9px 12px;text-align:center;color:#fff;font-size:11px;">Percentage</th>
          <th style="padding:9px 12px;text-align:center;color:#fff;font-size:11px;">Grade</th>
          <th style="padding:9px 12px;text-align:center;color:#fff;font-size:11px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${marks.map((m,i)=>{
          const mp  = m.isAbsent ? 0 : ((m.obtainedMarks/m.totalMarks)*100).toFixed(1);
          const mpass = !m.isAbsent && m.obtainedMarks/m.totalMarks >= 0.4;
          return `<tr style="background:${i%2===0?'#F8FAFC':'#fff'};">
            <td style="padding:7px 12px;border:1px solid #E2E8F0;font-weight:500;">${m.subject?.name||'Subject '+(i+1)}</td>
            <td style="padding:7px 12px;border:1px solid #E2E8F0;text-align:center;">${m.totalMarks}</td>
            <td style="padding:7px 12px;border:1px solid #E2E8F0;text-align:center;font-weight:700;color:${m.isAbsent?'#94A3B8':mpass?'#15803D':'#DC2626'};">${m.isAbsent?'ABS':m.obtainedMarks}</td>
            <td style="padding:7px 12px;border:1px solid #E2E8F0;text-align:center;">${m.isAbsent?'—':mp+'%'}</td>
            <td style="padding:7px 12px;border:1px solid #E2E8F0;text-align:center;font-weight:800;color:${primary};">${m.grade||'—'}</td>
            <td style="padding:7px 12px;border:1px solid #E2E8F0;text-align:center;"><span style="background:${mpass?'#DCFCE7':m.isAbsent?'#F1F5F9':'#FEE2E2'};color:${mpass?'#15803D':m.isAbsent?'#64748B':'#DC2626'};padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;">${m.isAbsent?'Absent':mpass?'Pass':'Fail'}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr style="background:${primary};color:#fff;">
          <td style="padding:9px 12px;font-weight:700;">TOTAL</td>
          <td style="padding:9px 12px;text-align:center;font-weight:700;">${totalMax}</td>
          <td style="padding:9px 12px;text-align:center;font-weight:800;font-size:14px;">${totalObtained}</td>
          <td style="padding:9px 12px;text-align:center;font-weight:800;">${pct}%</td>
          <td style="padding:9px 12px;text-align:center;font-weight:800;">${grade}</td>
          <td style="padding:9px 12px;text-align:center;"><span style="background:${pass?'#DCFCE7':'#FEE2E2'};color:${pass?'#15803D':'#DC2626'};padding:3px 12px;border-radius:99px;font-weight:700;font-size:12px;">${pass?'PASS':'FAIL'}</span></td>
        </tr>
      </tfoot>
    </table>

    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
      ${[['Total Marks',`${totalObtained}/${totalMax}`],['Percentage',pct+'%'],['Grade',grade],['Result',pass?'PASS':'FAIL']].map(([l,v],i)=>`
      <div style="text-align:center;padding:12px;border-radius:8px;border:1px solid #E2E8F0;background:${i===3?(pass?'#DCFCE7':'#FEE2E2'):'#F8FAFC'};">
        <div style="font-size:20px;font-weight:900;color:${i===3?(pass?'#15803D':'#DC2626'):primary};">${v}</div>
        <div style="font-size:11px;color:#64748B;margin-top:4px;">${l}</div>
      </div>`).join('')}
    </div>

    <!-- Signatures -->
    <div style="display:flex;justify-content:space-around;padding-top:16px;border-top:1px dashed #CBD5E1;">
      ${['Class Teacher','Principal','School Stamp'].map(s=>`
      <div style="text-align:center;">
        <div style="border-bottom:1px solid #374151;width:140px;margin:0 auto 4px;padding-top:30px;"></div>
        <p style="font-size:11px;color:#64748B;">${s}</p>
      </div>`).join('')}
    </div>

    <p style="font-size:10px;color:#94A3B8;text-align:center;margin-top:12px;">
      Generated by ${school.name} | ${fmtDate(new Date())} | Powered by EduForge Pro
    </p>
  </body></html>`;
};

module.exports = { generateFeeVoucherHTML, generateMarksheetHTML };
