/**
 * IlmForge — Reports Center
 * Wires up every report item: Excel downloads hit real API endpoints,
 * Print-type items open a formatted print-preview window,
 * Link-type items navigate to the relevant module page.
 */
import { Link } from 'react-router-dom';
import {
  FileText, Users, CreditCard, ClipboardCheck, GraduationCap, Award,
  Package, BarChart3, Download, Printer, Loader2, AlertCircle, X,
} from 'lucide-react';
import { useState } from 'react';
import api from '../../api/client';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const schoolName = () => localStorage.getItem('schoolName')    || 'IlmForge School';
const schoolAddr = () => localStorage.getItem('schoolAddress') || 'Islamabad, Pakistan';
const logoSrc    = () => localStorage.getItem('schoolLogoPreview') || null;
const money      = v  => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtD       = d  => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const API_BASE   = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/* ─── extract rows from various API response shapes ───────────────────── */
const toRows = res => {
  const d = res?.data;
  if (Array.isArray(d))       return d;
  if (Array.isArray(d?.data)) return d.data;
  for (const key of ['students','invoices','payments','expenses','staff','records','items']) {
    if (Array.isArray(d?.[key])) return d[key];
  }
  return [];
};

/* ─── open a formatted print-preview window ──────────────────────────── */
function openPrint(titleText, bodyHtml) {
  const logo = logoSrc();
  const logoTag = logo
    ? `<img src="${logo}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" alt="logo"/>`
    : `<div style="width:56px;height:56px;background:#0F766E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;font-weight:900;">S</div>`;
  const watermarkCss  = buildWatermarkCss({ mode:'a4', color:'#0F766E' });
  const watermarkHtml = buildWatermarkMarkup({ logo, text: schoolName(), imgAlt:'watermark logo' });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${titleText}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { position:relative; font-family:'Segoe UI',sans-serif; color:#1F2937; background:#fff; padding:32px; font-size:13px; }
    ${watermarkCss}
    .header, .body-content, .footer { position:relative; z-index:1; }
    .header { display:flex; align-items:center; gap:16px; padding-bottom:14px; border-bottom:3px solid #0F766E; margin-bottom:20px; }
    .school-name { font-size:18px; font-weight:900; color:#111827; }
    .school-addr { font-size:11px; color:#6B7280; margin-top:3px; }
    .report-title { font-size:15px; font-weight:700; color:#0F766E; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { background:#F0FDF9; color:#0F766E; font-weight:700; padding:9px 10px; text-align:left; border:1px solid #D1FAE5; font-size:11px; text-transform:uppercase; letter-spacing:.4px; }
    td { padding:8px 10px; border:1px solid #E5E7EB; vertical-align:middle; }
    tr:nth-child(even) td { background:#F9FAFB; }
    .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }
    .badge-green  { background:#DCFCE7; color:#16A34A; }
    .badge-red    { background:#FEE2E2; color:#DC2626; }
    .badge-yellow { background:#FEF3C7; color:#D97706; }
    .summary-box { display:flex; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
    .s-card { background:#F0FDF9; border:1px solid #A7F3D0; border-radius:8px; padding:12px 18px; min-width:140px; }
    .s-card .val { font-size:20px; font-weight:900; color:#0F766E; }
    .s-card .lbl { font-size:11px; color:#6B7280; margin-top:2px; }
    .footer { margin-top:32px; padding-top:14px; border-top:1px dashed #CBD5E1; display:flex; justify-content:space-between; font-size:11px; color:#9CA3AF; }
    .sig { text-align:center; }
    .sig-line { border-bottom:1px solid #374151; width:130px; margin:0 auto 5px; }
    /* Certificate-specific */
    .cert-box { border:2px solid #0F766E; border-radius:12px; padding:32px; margin:16px 0; }
    .cert-title { font-size:20px; font-weight:900; text-align:center; color:#0F766E; margin-bottom:24px; letter-spacing:1px; }
    .cert-body { font-size:13px; line-height:2; color:#1F2937; }
    .cert-highlight { font-weight:800; color:#1E3A5F; }
    /* ID card */
    .id-card { display:inline-block; width:240px; border:2px solid #0F766E; border-radius:10px; overflow:hidden; margin:8px; vertical-align:top; }
    .id-card-header { background:#0F766E; color:#fff; padding:8px 12px; font-weight:700; font-size:11px; }
    .id-card-body { padding:12px; font-size:11px; }
    .id-card-body .row { display:flex; gap:6px; margin-bottom:4px; }
    .id-card-body .label { color:#6B7280; min-width:60px; }
    .id-card-body .value { font-weight:600; color:#111827; }
    @media print { body { padding:16px; } .id-card { break-inside:avoid; } }
  </style>
</head>
<body>
  ${watermarkHtml}
  <div class="header">
    ${logoTag}
    <div>
      <div class="school-name">${schoolName()}</div>
      <div class="school-addr">${schoolAddr()}</div>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <div style="font-size:11px;color:#6B7280;">Printed: ${new Date().toLocaleString('en-PK')}</div>
    </div>
  </div>
  <div class="report-title">${titleText}</div>
  <div class="body-content">${bodyHtml}</div>
  <div class="footer">
    <div class="sig"><div class="sig-line"></div>Prepared By</div>
    <div style="font-size:10px;color:#CBD5E1;">IlmForge School Management System</div>
    <div class="sig"><div class="sig-line"></div>Principal / Head</div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/* ─── trigger a real Excel download from the backend ─────────────────── */
function downloadExcel(path) {
  const token = localStorage.getItem('accessToken') || '';
  const campus = localStorage.getItem('campusId') || '';
  // Build URL with auth token as query param (fallback for anchor downloads)
  const sep = path.includes('?') ? '&' : '?';
  const url = `${API_BASE}${path}${sep}token=${encodeURIComponent(token)}&campusId=${encodeURIComponent(campus)}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ─── ERROR TOAST ─────────────────────────────────────────────────────── */
function ErrorToast({ message, onClose }) {
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:10000,
      background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10,
      padding:'14px 18px', display:'flex', alignItems:'center', gap:10,
      boxShadow:'0 4px 20px rgba(0,0,0,0.12)', maxWidth:380,
    }}>
      <AlertCircle size={18} color="#DC2626" style={{ flexShrink:0 }}/>
      <div style={{ flex:1, fontSize:13, color:'#991B1B', fontWeight:500 }}>{message}</div>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0 }}>
        <X size={15}/>
      </button>
    </div>
  );
}

/* ─── PRINT HANDLERS (fetches real data then calls openPrint) ─────────── */

// School Leaving Certificate
async function printSLC() {
  try {
    const name = window.prompt('Enter Student Name:');
    if (!name) return;
    const res  = await api.get(`/students?name=${encodeURIComponent(name)}&limit=1`);
    const rows = toRows(res);
    const s    = rows[0] || {};
    const date = new Date().toLocaleDateString('en-PK',{ day:'2-digit', month:'long', year:'numeric' });
    const body = `
      <div class="cert-box">
        <div class="cert-title">SCHOOL LEAVING CERTIFICATE</div>
        <div class="cert-body">
          <p>This is to certify that <span class="cert-highlight">${s.name||name}</span>,
          ${s.gender?`son/daughter of <span class="cert-highlight">${s.fatherName||'—'}</span>,`:''}
          Roll No. <span class="cert-highlight">${s.rollNo||'—'}</span>,
          was a regular student of <span class="cert-highlight">${schoolName()}</span>
          in <span class="cert-highlight">${s.class||s.className||'—'}</span>.</p>
          <br/>
          <p>The student has passed all examinations satisfactorily and has been granted this
          School Leaving Certificate with good conduct.</p>
          <br/>
          <p>Date of Admission: <span class="cert-highlight">${fmtD(s.admissionDate||s.dateOfAdmission)}</span></p>
          <p>Date of Leaving: <span class="cert-highlight">${date}</span></p>
          <p>Date of Birth: <span class="cert-highlight">${fmtD(s.dob||s.dateOfBirth)}</span></p>
        </div>
      </div>`;
    openPrint('School Leaving Certificate', body);
  } catch {
    openPrint('School Leaving Certificate', '<div class="cert-box"><div class="cert-title">SCHOOL LEAVING CERTIFICATE</div><div class="cert-body"><p>This is to certify that the student named above was a bonafide student of this institution and has left the school with good conduct.</p></div></div>');
  }
}

// Character Certificate
async function printCharacterCert() {
  const name = window.prompt('Enter Student / Staff Name:');
  if (!name) return;
  const date = new Date().toLocaleDateString('en-PK',{ day:'2-digit', month:'long', year:'numeric' });
  const body = `
    <div class="cert-box">
      <div class="cert-title">CHARACTER CERTIFICATE</div>
      <div class="cert-body">
        <p>This is to certify that <span class="cert-highlight">${name}</span> has been associated with
        <span class="cert-highlight">${schoolName()}</span> and has maintained an excellent character
        throughout the period of association.</p>
        <br/>
        <p>We wish them the very best in their future endeavors.</p>
        <br/>
        <p>Date: <span class="cert-highlight">${date}</span></p>
      </div>
    </div>`;
  openPrint('Character Certificate', body);
}

// Date of Birth Certificate
async function printDOBCert() {
  try {
    const name = window.prompt('Enter Student Name:');
    if (!name) return;
    const res  = await api.get(`/students?name=${encodeURIComponent(name)}&limit=1`);
    const rows = toRows(res);
    const s    = rows[0] || {};
    const date = new Date().toLocaleDateString('en-PK',{ day:'2-digit', month:'long', year:'numeric' });
    const body = `
      <div class="cert-box">
        <div class="cert-title">DATE OF BIRTH CERTIFICATE</div>
        <div class="cert-body">
          <p>This is to certify that <span class="cert-highlight">${s.name||name}</span>,
          ${s.fatherName?`son/daughter of <span class="cert-highlight">${s.fatherName}</span>,`:''}
          Roll No. <span class="cert-highlight">${s.rollNo||'—'}</span>,
          was born on <span class="cert-highlight">${fmtD(s.dob||s.dateOfBirth)||'—'}</span>
          as per the records of <span class="cert-highlight">${schoolName()}</span>.</p>
          <br/>
          <p>This certificate is issued on the request of the student/parent.</p>
          <br/>
          <p>Date of Issue: <span class="cert-highlight">${date}</span></p>
        </div>
      </div>`;
    openPrint('Date of Birth Certificate', body);
  } catch {
    openPrint('Date of Birth Certificate', '<div class="cert-box"><div class="cert-title">DATE OF BIRTH CERTIFICATE</div><div class="cert-body"><p>This certifies the date of birth as per school records.</p></div></div>');
  }
}

// Experience Certificate
async function printExperienceCert() {
  const name = window.prompt('Enter Staff Name:');
  if (!name) return;
  try {
    const res   = await api.get(`/staff?name=${encodeURIComponent(name)}&limit=1`);
    const rows  = toRows(res);
    const s     = rows[0] || {};
    const date  = new Date().toLocaleDateString('en-PK',{ day:'2-digit', month:'long', year:'numeric' });
    const body  = `
      <div class="cert-box">
        <div class="cert-title">EXPERIENCE CERTIFICATE</div>
        <div class="cert-body">
          <p>This is to certify that <span class="cert-highlight">${s.name||name}</span>
          worked as <span class="cert-highlight">${s.designation||s.position||'Staff Member'}</span>
          in the <span class="cert-highlight">${s.department||'Academic'}</span> department
          at <span class="cert-highlight">${schoolName()}</span>.</p>
          <br/>
          <p>During their tenure, they demonstrated excellent professional conduct,
          strong work ethic, and commitment to their responsibilities.</p>
          <br/>
          <p>Joining Date: <span class="cert-highlight">${fmtD(s.joiningDate||s.dateOfJoining)||'—'}</span></p>
          <p>Date of Issue: <span class="cert-highlight">${date}</span></p>
        </div>
      </div>`;
    openPrint('Experience Certificate', body);
  } catch {
    const date = new Date().toLocaleDateString('en-PK',{ day:'2-digit', month:'long', year:'numeric' });
    openPrint('Experience Certificate', `<div class="cert-box"><div class="cert-title">EXPERIENCE CERTIFICATE</div><div class="cert-body"><p>This is to certify that <span class="cert-highlight">${name}</span> worked at <span class="cert-highlight">${schoolName()}</span> and served with distinction.</p><br/><p>Date: <span class="cert-highlight">${date}</span></p></div></div>`);
  }
}

// Student ID Cards
async function printStudentIDs() {
  try {
    const res  = await api.get('/students?status=active&limit=500');
    const rows = toRows(res);
    if (!rows.length) { alert('No active students found.'); return; }
    const cards = rows.map(s => `
      <div class="id-card">
        <div class="id-card-header">${schoolName()}</div>
        <div class="id-card-body">
          <div class="row"><span class="label">Name</span><span class="value">${s.name||s.fullName||'—'}</span></div>
          <div class="row"><span class="label">Roll No</span><span class="value">${s.rollNo||s.roll||'—'}</span></div>
          <div class="row"><span class="label">Class</span><span class="value">${s.class||s.className||'—'}</span></div>
          <div class="row"><span class="label">Father</span><span class="value">${s.fatherName||'—'}</span></div>
          <div class="row"><span class="label">Contact</span><span class="value">${s.phone||s.contact||s.mobile||'—'}</span></div>
        </div>
      </div>`).join('');
    openPrint('Student ID Cards', `<div style="display:flex;flex-wrap:wrap;">${cards}</div>`);
  } catch (e) {
    alert('Failed to load students: ' + (e?.message || 'Unknown error'));
  }
}

// Staff ID Cards
async function printStaffIDs() {
  try {
    const res  = await api.get('/staff?limit=200');
    const rows = toRows(res);
    if (!rows.length) { alert('No staff records found.'); return; }
    const cards = rows.map(s => `
      <div class="id-card">
        <div class="id-card-header">${schoolName()} — Staff</div>
        <div class="id-card-body">
          <div class="row"><span class="label">Name</span><span class="value">${s.name||s.fullName||'—'}</span></div>
          <div class="row"><span class="label">Position</span><span class="value">${s.designation||s.position||'—'}</span></div>
          <div class="row"><span class="label">Dept</span><span class="value">${s.department||'—'}</span></div>
          <div class="row"><span class="label">Contact</span><span class="value">${s.phone||s.contact||s.mobile||'—'}</span></div>
        </div>
      </div>`).join('');
    openPrint('Staff ID Cards', `<div style="display:flex;flex-wrap:wrap;">${cards}</div>`);
  } catch (e) {
    alert('Failed to load staff: ' + (e?.message || 'Unknown error'));
  }
}

// Student-wise Fee Voucher
async function printStudentVoucher() {
  try {
    const name = window.prompt('Enter Student Name (or leave blank for all pending):');
    const params = new URLSearchParams({ status:'unpaid', limit:'200' });
    if (name) params.set('studentName', name);
    const res  = await api.get(`/fees/invoices?${params}`);
    const rows = toRows(res);
    if (!rows.length) { alert('No unpaid invoices found.'); return; }
    const vouchers = rows.map((r, i) => `
      <div style="border:1px solid #0F766E;border-radius:8px;padding:16px;margin-bottom:16px;break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <strong style="font-size:14px;">Fee Voucher #${r.invoiceNo||r._id?.slice(-6)||i+1}</strong>
          <span style="font-size:11px;color:#6B7280;">Due: ${fmtD(r.dueDate||r.month)}</span>
        </div>
        <div style="font-size:12px;margin-bottom:6px;"><b>Student:</b> ${r.student||r.studentName||'—'} &nbsp;|&nbsp; <b>Class:</b> ${r.class||r.className||'—'}</div>
        <div style="font-size:12px;margin-bottom:6px;"><b>Fee Head:</b> ${r.head||r.feeHead||r.feeType||'Tuition'} &nbsp;|&nbsp; <b>Month:</b> ${r.month||r.period||'—'}</div>
        <div style="font-size:14px;font-weight:800;color:#0F766E;margin-top:8px;">Amount Due: ${money(r.amount||r.total)}</div>
      </div>`).join('');
    openPrint('Student Fee Vouchers', vouchers);
  } catch (e) {
    alert('Failed to load vouchers: ' + (e?.message || 'Unknown error'));
  }
}

// Family Fee Voucher
async function printFamilyVoucher() {
  try {
    const res  = await api.get('/fees/invoices?status=unpaid&limit=500');
    const rows = toRows(res);
    if (!rows.length) { alert('No unpaid invoices found.'); return; }
    // Group by fatherName or guardianName
    const families = {};
    rows.forEach(r => {
      const key = r.fatherName||r.guardianName||r.parent||r.student||'Unknown';
      if (!families[key]) families[key] = [];
      families[key].push(r);
    });
    const vouchers = Object.entries(families).map(([parent, invs]) => {
      const total = invs.reduce((a,r)=>a+(r.amount||r.total||0),0);
      const childRows = invs.map(r=>`<tr><td>${r.student||r.studentName||'—'}</td><td>${r.class||r.className||'—'}</td><td>${r.month||'—'}</td><td style="font-weight:700">${money(r.amount||r.total)}</td></tr>`).join('');
      return `
        <div style="border:1px solid #0F766E;border-radius:8px;padding:16px;margin-bottom:16px;break-inside:avoid;">
          <div style="font-weight:800;font-size:13px;margin-bottom:10px;">Family Voucher — ${parent}</div>
          <table><thead><tr><th>Student</th><th>Class</th><th>Month</th><th>Amount</th></tr></thead>
          <tbody>${childRows}</tbody></table>
          <div style="text-align:right;font-size:14px;font-weight:900;color:#0F766E;margin-top:10px;">Total: ${money(total)}</div>
        </div>`;
    }).join('');
    openPrint('Family Fee Vouchers', vouchers);
  } catch (e) {
    alert('Failed to load family vouchers: ' + (e?.message || 'Unknown error'));
  }
}

// Thermal Voucher (80mm style)
async function printThermalVoucher() {
  try {
    const name = window.prompt('Enter Student Name:');
    if (!name) return;
    const res  = await api.get(`/fees/invoices?studentName=${encodeURIComponent(name)}&status=unpaid&limit=10`);
    const rows = toRows(res);
    if (!rows.length) { alert('No unpaid invoices found for this student.'); return; }
    const r = rows[0];
    const body = `
      <div style="width:72mm;margin:0 auto;font-family:monospace;font-size:11px;">
        <div style="text-align:center;font-weight:900;font-size:13px;margin-bottom:4px;">${schoolName()}</div>
        <div style="text-align:center;font-size:10px;color:#6B7280;margin-bottom:8px;">${schoolAddr()}</div>
        <hr/>
        <div>Student: <b>${r.student||r.studentName||name}</b></div>
        <div>Class  : <b>${r.class||r.className||'—'}</b></div>
        <div>Month  : <b>${r.month||r.period||'—'}</b></div>
        <div>Fee    : <b>${r.head||r.feeHead||'Tuition'}</b></div>
        <hr/>
        <div style="font-size:14px;font-weight:900;text-align:center;">AMOUNT: ${money(r.amount||r.total)}</div>
        <hr/>
        <div style="text-align:center;font-size:10px;">Due: ${fmtD(r.dueDate||r.month)}</div>
        <div style="text-align:center;font-size:9px;margin-top:6px;">Thank you!</div>
      </div>`;
    openPrint('Fee Receipt', body);
  } catch (e) {
    alert('Failed to generate receipt: ' + (e?.message || 'Unknown error'));
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   REPORT CATEGORY DATA
═══════════════════════════════════════════════════════════════════════ */
const buildCategories = (setLoading, setError) => [
  {
    cat: 'Students', icon: Users, color: '#2563EB',
    items: [
      {
        label: 'All Active Students', type: 'excel',
        action: () => downloadExcel('/reports/students/excel?status=active'),
      },
      {
        label: 'All Inactive Students', type: 'excel',
        action: () => downloadExcel('/reports/students/excel?status=inactive'),
      },
      {
        label: 'Pass-out Students', type: 'excel',
        action: () => downloadExcel('/reports/students/excel?status=passout'),
      },
      {
        label: 'Gender-wise Report', type: 'excel',
        action: async () => {
          setLoading('gender-excel');
          try {
            const res  = await api.get('/students?status=active&limit=1000');
            const rows = toRows(res);
            const male   = rows.filter(s=>(s.gender||'').toLowerCase()==='male');
            const female = rows.filter(s=>(s.gender||'').toLowerCase()==='female');
            const body = `
              <div style="display:flex;gap:14px;margin-bottom:20px;">
                <div class="s-card"><div class="val">${male.length}</div><div class="lbl">Male Students</div></div>
                <div class="s-card"><div class="val">${female.length}</div><div class="lbl">Female Students</div></div>
                <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Total</div></div>
              </div>
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Class</th><th>Gender</th><th>Roll No</th></tr></thead>
                <tbody>${rows.map((s,i)=>`<tr>
                  <td>${i+1}</td>
                  <td style="font-weight:600">${s.name||s.fullName||'—'}</td>
                  <td>${s.class||s.className||'—'}</td>
                  <td>${s.gender||'—'}</td>
                  <td>${s.rollNo||s.roll||'—'}</td>
                </tr>`).join('')}</tbody>
              </table>`;
            openPrint('Gender-wise Student Report', body);
          } catch (e) {
            setError('Failed to generate gender report: ' + (e?.message||'Unknown error'));
          } finally { setLoading(null); }
        },
      },
      { label: 'Class-wise Student List',    to: '/students',         type: 'link' },
      { label: 'Student Attendance Summary', to: '/attendance/report', type: 'link' },
      { label: "Today's Birthdays",          to: '/students/birthdays', type: 'link' },
    ],
  },
  {
    cat: 'Finance', icon: CreditCard, color: '#15803D',
    items: [
      {
        label: 'Daily Balance Sheet', type: 'excel',
        action: () => downloadExcel('/reports/fees/balance-sheet'),
      },
      {
        label: 'Monthly Income Report', type: 'excel',
        action: () => downloadExcel('/reports/fees/income'),
      },
      {
        label: 'Fee Defaulters List', type: 'print',
        desc: 'Print list of all fee defaulters',
        action: async () => {
          setLoading('defaulters-print');
          try {
            const res  = await api.get('/fees/defaulters');
            const rows = toRows(res);
            if (!rows.length) { setError('No defaulters found.'); setLoading(null); return; }
            const total = rows.reduce((a,r)=>a+(r.amount||r.totalDue||r.balance||0),0);
            const body  = `
              <div class="summary-box">
                <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Defaulters</div></div>
                <div class="s-card"><div class="val">${money(total)}</div><div class="lbl">Total Due</div></div>
              </div>
              <table>
                <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Month</th><th>Amount Due</th></tr></thead>
                <tbody>${rows.map((r,i)=>`<tr>
                  <td>${i+1}</td>
                  <td style="font-weight:600">${r.student||r.studentName||r.name||'—'}</td>
                  <td>${r.class||r.className||'—'}</td>
                  <td>${r.month||r.period||'—'}</td>
                  <td style="color:#DC2626;font-weight:700">${money(r.amount||r.totalDue||r.balance)}</td>
                </tr>`).join('')}</tbody>
              </table>`;
            openPrint('Fee Defaulters Report', body);
          } catch (e) {
            setError('Failed to load defaulters: ' + (e?.message||'Unknown error'));
          } finally { setLoading(null); }
        },
      },
      { label: 'Fee Structure',   to: '/fees/structure', type: 'link' },
      { label: 'Expense Report',  to: '/expenses',       type: 'link' },
      { label: 'Salary Report',   to: '/salary',         type: 'link' },
    ],
  },
  {
    cat: 'Attendance', icon: ClipboardCheck, color: '#DC2626',
    items: [
      { label: 'Student Attendance Sheet', to: '/attendance/report',  type: 'link' },
      { label: 'Staff Attendance Report',  to: '/attendance/staff',   type: 'link' },
      { label: 'Barcode Scan Log',         to: '/attendance/barcode', type: 'link' },
    ],
  },
  {
    cat: 'Exams & Results', icon: GraduationCap, color: '#7C3AED',
    items: [
      { label: 'All Exams & Tests',   to: '/exams', type: 'link' },
      { label: 'Student Marksheets',  to: '/exams', type: 'link' },
      { label: 'Position Holders',    to: '/exams', type: 'link' },
    ],
  },
  {
    cat: 'Staff & HR', icon: Award, color: '#B45309',
    items: [
      { label: 'All Staff List',            to: '/staff',             type: 'link' },
      { label: 'Salary Records',            to: '/salary',            type: 'link' },
      { label: 'Staff Attendance Summary',  to: '/attendance/staff',  type: 'link' },
    ],
  },
  {
    cat: 'Certificates & ID Cards', icon: FileText, color: '#0891B2',
    items: [
      { label: 'School Leaving Certificate',  type: 'print', desc: 'SLC for passing students',    action: printSLC               },
      { label: 'Character Certificate',        type: 'print', desc: 'Good character letter',       action: printCharacterCert     },
      { label: 'Date of Birth Certificate',    type: 'print', desc: 'Official DOB certificate',    action: printDOBCert           },
      { label: 'Experience Certificate',       type: 'print', desc: 'For outgoing staff',           action: printExperienceCert    },
      { label: 'Student ID Cards',             type: 'print', desc: 'Print class-wise ID cards',   action: printStudentIDs        },
      { label: 'Staff ID Cards',               type: 'print', desc: 'Print staff ID cards',        action: printStaffIDs          },
    ],
  },
  {
    cat: 'Fee Vouchers', icon: CreditCard, color: '#0D9488',
    items: [
      { label: 'Student-wise Fee Voucher',  type: 'print', desc: 'Individual voucher per student', action: printStudentVoucher  },
      { label: 'Family Fee Voucher',        type: 'print', desc: 'All children on one voucher',    action: printFamilyVoucher   },
      { label: 'Thermal Printer Voucher',   type: 'print', desc: '80mm thermal receipt',           action: printThermalVoucher  },
      { label: 'Fee Voucher (Current Month)', to: '/fees/generate', type: 'link' },
    ],
  },
  {
    cat: 'Inventory', icon: Package, color: '#475569',
    items: [
      { label: 'Product Stock Report',  to: '/stock',     type: 'link' },
      { label: 'Out-of-Stock Report',   to: '/stock',     type: 'link' },
      { label: 'Monthly Sales Report',  to: '/stock',     type: 'link' },
      { label: 'Transport Routes',      to: '/transport', type: 'link' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState(null);

  const REPORT_CATEGORIES = buildCategories(setLoading, setError);

  const handlePrintItem = (item) => {
    if (item.action) item.action();
  };

  return (
    <div className="page-content fade-up">
      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Reports Center</h1>
        <p className="page-subtitle">Generate, download and print reports for all modules</p>
      </div>

      {/* Quick download bar */}
      <div className="card" style={{ marginBottom:20, background:'linear-gradient(135deg,#1E3A5F,#253d63)', padding:'18px 20px' }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:'#fff', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <BarChart3 size={16} color="#5EEAD4"/>
          Quick Downloads
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { label:'Active Students Excel', path:'/reports/students/excel?status=active'  },
            { label:'Daily Balance Sheet',   path:'/reports/fees/balance-sheet'             },
            { label:'Monthly Income',        path:'/reports/fees/income'                    },
          ].map(r => (
            <button
              key={r.label}
              onClick={() => downloadExcel(r.path)}
              style={{ background:'rgba(255,255,255,0.12)', color:'#fff', padding:'7px 14px', borderRadius:7, fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:6, border:'1px solid rgba(255,255,255,0.18)', cursor:'pointer' }}
            >
              <Download size={13}/>{r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report categories grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:14 }}>
        {REPORT_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          return (
            <div key={cat.cat} className="card" style={{ borderTop:`3px solid ${cat.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:cat.color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CatIcon size={17} color={cat.color}/>
                </div>
                <h3 style={{ margin:0, fontSize:13.5, fontWeight:700, color:'#1E3A5F' }}>{cat.cat}</h3>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {cat.items.map(item => {
                  if (item.type === 'excel') return (
                    <button
                      key={item.label}
                      onClick={() => item.action ? item.action() : downloadExcel(item.href || '')}
                      disabled={loading === item.label}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'#F8FAFC', borderRadius:7, border:'1px solid #E8EDF3', cursor:'pointer', width:'100%', textAlign:'left', transition:'all 0.12s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#F0FDF9';e.currentTarget.style.borderColor='#CCFBF1';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E8EDF3';}}
                    >
                      <span style={{ fontSize:12.5, color:'#374151' }}>{item.label}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#15803D', fontWeight:700 }}>
                        {loading === item.label
                          ? <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }}/>
                          : <Download size={12}/>
                        }
                        Excel
                      </span>
                    </button>
                  );

                  if (item.type === 'print') return (
                    <button
                      key={item.label}
                      onClick={() => handlePrintItem(item)}
                      disabled={loading === item.label}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'#F8FAFC', borderRadius:7, border:'1px solid #E8EDF3', cursor:'pointer', width:'100%', textAlign:'left', transition:'all 0.12s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#FFF7ED';e.currentTarget.style.borderColor='#FED7AA';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E8EDF3';}}
                    >
                      <div>
                        <span style={{ fontSize:12.5, color:'#374151' }}>{item.label}</span>
                        {item.desc && <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>{item.desc}</div>}
                      </div>
                      <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#B45309', fontWeight:700, flexShrink:0 }}>
                        {loading === item.label
                          ? <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }}/>
                          : <Printer size={12}/>
                        }
                        Print
                      </span>
                    </button>
                  );

                  return (
                    <Link key={item.label} to={item.to}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'#F8FAFC', borderRadius:7, border:'1px solid #E8EDF3', textDecoration:'none', transition:'all 0.12s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.borderColor='#BFDBFE';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E8EDF3';}}>
                      <span style={{ fontSize:12.5, color:'#374151' }}>{item.label}</span>
                      <FileText size={13} color="#64748B"/>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* error toast */}
      {error && <ErrorToast message={error} onClose={() => setError(null)}/>}
    </div>
  );
}
