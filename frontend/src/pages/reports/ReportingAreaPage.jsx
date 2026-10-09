/**
 * IlmForge — Comprehensive Reporting Area
 * Full print-preview reports for Students, Fees, Finance, Staff
 * All data sourced from real API endpoints — no demo/fallback data.
 */
import { useState } from 'react';
import api from '../../api/client';
import {
  FileText, BarChart2, DollarSign, Users, Award, Printer,
  TrendingUp, TrendingDown, Calendar, X, AlertCircle,
  CreditCard, Briefcase, CheckSquare, Loader2,
} from 'lucide-react';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';
import { feePeriod } from '../../utils/feeMonth';

/* ─── helpers ─────────────────────────────────────────────────────────── */
// Amounts arrive in paisa (Rs 3,500 is 350000); this was printing the
// stored figure straight out, a hundred times too large.
const money   = v  => 'Rs. ' + (Number(v || 0) / 100).toLocaleString('en-PK');
// Pakistan's today (UTC+5 all year): report periods are Pakistan days, and
// the UTC date is still yesterday here until 5 a.m.
const today   = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 7) + '-01';
const fmtD    = d  => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const schoolName = () => localStorage.getItem('schoolName')    || 'IlmForge School';
const schoolAddr = () => localStorage.getItem('schoolAddress') || 'Islamabad, Pakistan';
const logoSrc    = () => localStorage.getItem('schoolLogoPreview') || null;

/* ─── extract rows from various API response shapes ───────────────────── */
const toRows = res => {
  const d = res?.data;
  if (Array.isArray(d))            return d;
  if (Array.isArray(d?.data))      return d.data;
  if (Array.isArray(d?.students))  return d.students;
  if (Array.isArray(d?.invoices))  return d.invoices;
  if (Array.isArray(d?.payments))  return d.payments;
  if (Array.isArray(d?.expenses))  return d.expenses;
  if (Array.isArray(d?.staff))     return d.staff;
  if (Array.isArray(d?.records))   return d.records;
  return [];
};

/* ─── finance data ────────────────────────────────────────────────────── */
// Names and notes come from the database: keep them as text in the printout.
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// "Monthly Fee Of Jul" and "Monthly Fee Of Aug" are one fee head.
const headOf = (title) => String(title || 'Fee')
  .replace(/\s*\b(of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(\s+\d{4})?\s*$/i, '').trim() || 'Fee';

/** Every unpaid and part-paid bill (the API sends 500 at a time). */
async function allDues() {
  const rows = [];
  for (let offset = 0; offset < 20000; offset += 500) {
    const r = await api.get('/fees/defaulters', { params: { limit: 500, offset } });
    const batch = r.data?.data || [];
    rows.push(...batch);
    if (!batch.length || rows.length >= (r.data?.total || 0)) break;
  }
  return rows;
}

/** Expense category names by id. */
async function categoryNames() {
  const r = await api.get('/expenses/categories').catch(() => null);
  return new Map((r?.data?.data || []).map((c) => [c.id, c.name]));
}

const periodText = (from, to) => (from === to ? fmtD(from) : `${fmtD(from)} — ${fmtD(to)}`);

/* ─── print helper ────────────────────────────────────────────────────── */
function openPrint(titleText, bodyHtml) {
  const logo = logoSrc();
  const logoTag = logo
    ? `<img src="${logo}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" alt="logo"/>`
    : `<div style="width:56px;height:56px;background:#0F766E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;font-weight:900;">S</div>`;
  const watermarkCss  = buildWatermarkCss({ mode: 'a4', color: '#0F766E' });
  const watermarkHtml = buildWatermarkMarkup({ logo, text: schoolName(), imgAlt: 'watermark logo' });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${titleText}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { position:relative; font-family:'Segoe UI',sans-serif; color:#1F2937; background:#fff; padding:32px; font-size:13px; overflow:hidden; }
    ${watermarkCss}
    .header, .report-title, .summary-box, table, .footer { position:relative; z-index:1; }
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
    @media print { body { padding:16px; } }
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
  ${bodyHtml}
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

/* ─── REPORT CARD ─────────────────────────────────────────────────────── */
function ReportCard({ icon: Icon, iconColor, iconBg, title, description, onGenerate, loading }) {
  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:12, border:'1px solid #E5E7EB', borderTop:`3px solid ${iconColor}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={20} color={iconColor}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13.5, color:'#1E3A5F', marginBottom:3 }}>{title}</div>
          <div style={{ fontSize:12, color:'#64748B', lineHeight:1.4 }}>{description}</div>
        </div>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="btn btn-teal"
        style={{ alignSelf:'flex-start', fontSize:12, display:'flex', alignItems:'center', gap:6, padding:'7px 14px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading
          ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> Loading…</>
          : <><Printer size={13}/> Generate Report</>
        }
      </button>
    </div>
  );
}

/* ─── ERROR TOAST ─────────────────────────────────────────────────────── */
function ErrorToast({ message, onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 10000,
      background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10,
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)', maxWidth: 380,
    }}>
      <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }}/>
      <div style={{ flex: 1, fontSize: 13, color: '#991B1B', fontWeight: 500 }}>{message}</div>
      <button aria-label="Close" onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, lineHeight:1 }}>
        <X size={15}/>
      </button>
    </div>
  );
}

/* ─── FILTER MODAL ────────────────────────────────────────────────────── */
function FilterModal({ title, fields, classOptions, onClose, onGenerate, loading }) {
  const [vals, setVals] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f.key] = f.defaultVal || ''; });
    return init;
  });
  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="card" style={{ width:420, maxWidth:'95vw', padding:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontWeight:800, fontSize:15, color:'#1E3A5F' }}>{title}</div>
          <button aria-label="Close" onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}><X size={18}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
          {fields.map(f => {
            const opts = f.key === 'filterClass' ? classOptions : (f.options || []);
            return (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={vals[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #D1D5DB', fontSize:13, background:'#fff', color:'#1F2937' }}
                  >
                    <option value="">— All —</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={vals[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder || ''}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #D1D5DB', fontSize:13, color:'#1F2937' }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn" style={{ background:'#F1F5F9', color:'#475569', fontSize:12 }}>Cancel</button>
          <button
            onClick={() => onGenerate(vals)}
            disabled={loading}
            className="btn btn-teal"
            style={{ fontSize:12, display:'flex', alignItems:'center', gap:6, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> Loading…</>
              : <><Printer size={13}/> Print Report</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════ */
export default function ReportingAreaPage() {
  const [modal,       setModal]      = useState(null);   // active modal id
  const [loading,     setLoading]    = useState(null);   // active report id being fetched
  const [error,       setError]      = useState(null);   // error string
  const [classOptions, setClassOpts] = useState([]);     // populated after first class-wise load

  /* ── shared fetch wrapper ─────────────────────────────────────────── */
  const withLoading = async (id, fn) => {
    setLoading(id);
    setError(null);
    try {
      await fn();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load report data. Please try again.';
      setError(msg);
    } finally {
      setLoading(null);
    }
  };

  /* ── unique class list from student data ─────────────────────────── */
  const fetchClassOptions = async () => {
    if (classOptions.length) return classOptions;
    try {
      const res = await api.get('/students?status=active&limit=1000');
      const rows = toRows(res);
      const classes = [...new Set(rows.map(s => s.class || s.className || s.section).filter(Boolean))].sort();
      setClassOpts(classes);
      return classes;
    } catch {
      return [];
    }
  };

  /* ── 1. Class-wise basic report ──────────────────────────────────── */
  const printClassWise = ({ filterClass }) => withLoading('classWise', async () => {
    const params = new URLSearchParams({ status: 'active', limit: '1000' });
    if (filterClass) params.set('classId', filterClass);
    const res  = await api.get(`/students?${params}`);
    const rows = toRows(res);
    if (!rows.length) { setError('No student records found for the selected class.'); return; }

    const title = filterClass ? `Class Wise Basic Report — ${filterClass}` : 'Class Wise Basic Report — All Classes';
    const summary = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Total Students</div></div>
        <div class="s-card"><div class="val">${rows.filter(s => (s.gender||'').toLowerCase()==='male').length}</div><div class="lbl">Boys</div></div>
        <div class="s-card"><div class="val">${rows.filter(s => (s.gender||'').toLowerCase()==='female').length}</div><div class="lbl">Girls</div></div>
      </div>`;
    const body = `${summary}<table>
      <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Class</th><th>Gender</th><th>Admission Date</th><th>Fee Status</th></tr></thead>
      <tbody>${rows.map((s,i)=>`<tr>
        <td>${i+1}</td>
        <td>${s.rollNo||s.roll||'—'}</td>
        <td style="font-weight:600">${s.name||s.fullName||'—'}</td>
        <td>${s.class||s.className||s.section||'—'}</td>
        <td>${s.gender||'—'}</td>
        <td>${fmtD(s.admissionDate||s.dateOfAdmission)}</td>
        <td><span class="badge ${(s.feeStatus||'').toLowerCase()==='paid'?'badge-green':(s.feeStatus||'').toLowerCase()==='unpaid'?'badge-red':'badge-yellow'}">${s.feeStatus||'—'}</span></td>
      </tr>`).join('')}</tbody>
    </table>`;
    openPrint(title, body);
    setModal(null);
  });

  /* ── 2. Student strength report ──────────────────────────────────── */
  const printStrength = () => withLoading('strength', async () => {
    const res  = await api.get('/students?status=active&limit=1000');
    const rows = toRows(res);
    if (!rows.length) { setError('No active students found.'); return; }

    const classMap = {};
    rows.forEach(s => {
      const cls = s.class || s.className || s.section || 'Unknown';
      if (!classMap[cls]) classMap[cls] = { boys:0, girls:0 };
      if ((s.gender||'').toLowerCase() === 'male') classMap[cls].boys++;
      else classMap[cls].girls++;
    });
    const list  = Object.entries(classMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([cls,v])=>({ cls, ...v, total: v.boys+v.girls }));
    const totB  = list.reduce((a,r)=>a+r.boys,0);
    const totG  = list.reduce((a,r)=>a+r.girls,0);
    const body  = `<table>
      <thead><tr><th>#</th><th>Class</th><th>Boys</th><th>Girls</th><th>Total</th></tr></thead>
      <tbody>${list.map((r,i)=>`<tr>
        <td>${i+1}</td>
        <td style="font-weight:600">${r.cls}</td>
        <td>${r.boys}</td><td>${r.girls}</td>
        <td style="font-weight:700;color:#0F766E">${r.total}</td>
      </tr>`).join('')}
      <tr style="background:#F0FDF9;font-weight:700"><td colspan="2">Grand Total</td><td>${totB}</td><td>${totG}</td><td>${totB+totG}</td></tr>
      </tbody></table>`;
    openPrint('Student Strength Report — Class Wise', body);
  });

  /* ── 3. Admission date report ─────────────────────────────────────── */
  const printAdmission = ({ dateFrom, dateTo }) => withLoading('admission', async () => {
    const params = new URLSearchParams({ limit: '1000' });
    if (dateFrom) params.set('admissionDate_gte', dateFrom);
    if (dateTo)   params.set('admissionDate_lte', dateTo);
    const res  = await api.get(`/students?${params}`);
    const rows = toRows(res);
    if (!rows.length) { setError('No students found in the selected date range.'); return; }

    const range = (dateFrom || dateTo) ? ` (${fmtD(dateFrom)} — ${fmtD(dateTo)})` : '';
    const body  = `<table>
      <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Class</th><th>Gender</th><th>Admission Date</th></tr></thead>
      <tbody>${rows.map((s,i)=>`<tr>
        <td>${i+1}</td>
        <td>${s.rollNo||s.roll||'—'}</td>
        <td style="font-weight:600">${s.name||s.fullName||'—'}</td>
        <td>${s.class||s.className||s.section||'—'}</td>
        <td>${s.gender||'—'}</td>
        <td>${fmtD(s.admissionDate||s.dateOfAdmission)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
    openPrint(`Admission Date Report${range}`, body);
    setModal(null);
  });

  /* ── 4. Fee defaulters: one line per student ─────────────────────── */
  const printDefaulters = () => withLoading('defaulters', async () => {
    const bills = await allDues();
    if (!bills.length) { setError('No defaulters found. All fees may be up to date.'); return; }

    // Everything each student still owes, and for which months.
    const byStudent = new Map();
    for (const b of bills) {
      if (!byStudent.has(b.studentId)) byStudent.set(b.studentId, { student: b.student, due: 0, periods: [] });
      const row = byStudent.get(b.studentId);
      row.due += b.dueAmount || 0;
      row.periods.push(feePeriod(b, true) || b.feeTitle);
    }
    const rows = [...byStudent.values()].sort((a, b) => b.due - a.due);
    const totalDue = rows.reduce((a, r) => a + r.due, 0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Defaulters</div></div>
        <div class="s-card"><div class="val">${bills.length}</div><div class="lbl">Unpaid Bills</div></div>
        <div class="s-card"><div class="val">${money(totalDue)}</div><div class="lbl">Total Due</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Months Due</th><th>Parent Phone</th><th>Amount Due</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td>${i + 1}</td>
          <td style="font-weight:600">${esc(r.student?.name || '—')}<div style="font-size:10px;color:#6B7280">${esc(r.student?.rollNo || '')}</div></td>
          <td>${esc([r.student?.class?.name, r.student?.section?.name].filter(Boolean).join(' ') || '—')}</td>
          <td>${esc(r.periods.join(', '))}</td>
          <td>${esc(r.student?.emergencyPhone || '—')}</td>
          <td style="color:#DC2626;font-weight:700">${money(r.due)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint('Fee Defaulters Report', body);
  });

  /* ── 5. Unpaid invoices ──────────────────────────────────────────── */
  const printUnpaid = () => withLoading('unpaid', async () => {
    const bills = (await allDues()).sort((a, b) =>
      String(a.student?.name || '').localeCompare(String(b.student?.name || '')) || (a.year - b.year) || 0);
    if (!bills.length) { setError('No unpaid invoices found.'); return; }

    const total = bills.reduce((a, r) => a + (r.dueAmount || 0), 0);
    const body  = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${bills.length}</div><div class="lbl">Pending Invoices</div></div>
        <div class="s-card"><div class="val">${money(total)}</div><div class="lbl">Total Pending</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Fee</th><th>Month</th><th>Bill</th><th>Still Due</th><th>Status</th></tr></thead>
        <tbody>${bills.map((r, i) => `<tr>
          <td>${i + 1}</td>
          <td style="font-weight:600">${esc(r.student?.name || '—')}</td>
          <td>${esc(r.student?.class?.name || '—')}</td>
          <td>${esc(r.feeTitle || 'Fee')}</td>
          <td>${esc(feePeriod(r) || '—')}</td>
          <td>${money((r.totalAmount || 0) + (r.lateFee || 0))}</td>
          <td style="font-weight:700;color:#DC2626">${money(r.dueAmount)}</td>
          <td><span class="badge ${r.status === 'partial' ? 'badge-yellow' : 'badge-red'}">${r.status === 'partial' ? 'Part paid' : 'Unpaid'}</span></td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint('List of Unpaid Invoices', body);
  });

  /* ── 6. Fee discount report ──────────────────────────────────────── */
  const printDiscount = () => withLoading('discount', async () => {
    const res  = await api.get('/reports/fees/discount');
    const rows = res.data?.data || [];
    if (!rows.length) { setError('No discount records found.'); return; }

    const totalDisc = rows.reduce((a, r) => a + (r.discountAmount || 0), 0);
    const students  = new Set(rows.map((r) => r.studentId)).size;
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${students}</div><div class="lbl">Students with Discount</div></div>
        <div class="s-card"><div class="val">${money(totalDisc)}</div><div class="lbl">Total Discount Given</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Fee</th><th>Month</th><th>Bill</th><th>Discount</th><th>Still Due</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td>${i + 1}</td>
          <td style="font-weight:600">${esc(r.student || '—')}<div style="font-size:10px;color:#6B7280">${esc(r.rollNo || '')}</div></td>
          <td>${esc([r.class, r.section].filter(Boolean).join(' ') || '—')}</td>
          <td>${esc(r.feeTitle || 'Fee')}</td>
          <td>${esc(feePeriod(r) || '—')}</td>
          <td>${money(r.totalAmount)}</td>
          <td style="color:#D97706;font-weight:700">${money(r.discountAmount)}</td>
          <td>${money(r.dueAmount)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint('Fee Discount Report', body);
  });

  /* ── 7. Head-wise dues summary ───────────────────────────────────── */
  const printHeadDues = () => withLoading('headDues', async () => {
    const res    = await api.get('/reports/fees/head-dues');
    const groups = res.data?.data || [];
    const heads  = new Map();
    for (const g of groups) {
      const h = headOf(g.feeType);
      if (!heads.has(h)) heads.set(h, { billed: 0, paid: 0, discount: 0, due: 0 });
      const t = heads.get(h);
      t.billed += g.totalBilled || 0; t.paid += g.totalPaid || 0; t.discount += g.totalDiscount || 0; t.due += g.balance || 0;
    }
    const list = [...heads.entries()].filter(([, v]) => v.due > 0).sort((a, b) => b[1].due - a[1].due);
    if (!list.length) { setError('No outstanding dues found.'); return; }
    const sum = (k) => list.reduce((a, [, v]) => a + v[k], 0);
    const body = `<table>
      <thead><tr><th>#</th><th>Fee Head</th><th>Billed</th><th>Received</th><th>Discount</th><th>Still Due</th></tr></thead>
      <tbody>${list.map(([h, v], i) => `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:600">${esc(h)}</td>
        <td>${money(v.billed)}</td>
        <td style="color:#16A34A">${money(v.paid)}</td>
        <td>${money(v.discount)}</td>
        <td style="color:#DC2626;font-weight:700">${money(v.due)}</td>
      </tr>`).join('')}
      <tr style="background:#FEF2F2;font-weight:700"><td colspan="2">Grand Total</td><td>${money(sum('billed'))}</td><td>${money(sum('paid'))}</td><td>${money(sum('discount'))}</td><td style="color:#DC2626">${money(sum('due'))}</td></tr>
      </tbody></table>`;
    openPrint('Head Wise Dues Summary', body);
  });

  /* ── 8. Income & Expense report ──────────────────────────────────── */
  const printIncomeExpense = ({ dateFrom, dateTo }) => withLoading('incomeExpense', async () => {
    const from = dateFrom || monthStart();
    const to   = dateTo || today();
    if (from > to) { setError('The From date is after the To date.'); return; }
    const [res, cats] = await Promise.all([
      api.get('/reports/accounting/income-expense', { params: { from, to } }),
      categoryNames(),
    ]);
    const { income = [], expenses = [], totalIncome = 0, totalExpenses = 0, netBalance = 0 } = res.data?.data || {};
    if (!income.length && !expenses.length) { setError('No income or expense records found for the selected period.'); return; }

    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${money(totalIncome)}</div><div class="lbl">Total Income</div></div>
        <div class="s-card"><div class="val" style="color:#DC2626">${money(totalExpenses)}</div><div class="lbl">Total Expense</div></div>
        <div class="s-card"><div class="val" style="color:${netBalance >= 0 ? '#16A34A' : '#DC2626'}">${money(Math.abs(netBalance))}</div><div class="lbl">${netBalance >= 0 ? 'Net Profit' : 'Net Loss'}</div></div>
      </div>
      <h4 style="margin-bottom:10px;color:#0F766E;">Income</h4>
      <table style="margin-bottom:20px">
        <thead><tr><th>#</th><th>Date</th><th>Student</th><th>Fee</th><th>Method</th><th>Amount</th></tr></thead>
        <tbody>${income.map((r, i) => `<tr>
          <td>${i + 1}</td><td>${fmtD(r.paymentDate)}</td>
          <td>${esc(r.invoice?.student?.name || '—')}</td>
          <td>${esc([r.invoice?.feeTitle, feePeriod(r.invoice)].filter(Boolean).join(' — ') || 'Fee')}</td>
          <td>${esc(r.method || '—')}</td>
          <td style="font-weight:700;color:#16A34A">${money(r.amountPaid)}</td>
        </tr>`).join('') || '<tr><td colspan="6">No fees received in this period.</td></tr>'}</tbody>
      </table>
      <h4 style="margin-bottom:10px;color:#DC2626;">Expenses</h4>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${expenses.map((r, i) => `<tr>
          <td>${i + 1}</td><td>${fmtD(r.date)}</td>
          <td>${esc(r.description || '—')}</td>
          <td>${esc(cats.get(r.categoryId) || 'Uncategorised')}</td>
          <td style="font-weight:700;color:#DC2626">${money(r.amount)}</td>
        </tr>`).join('') || '<tr><td colspan="5">No expenses in this period.</td></tr>'}</tbody>
      </table>`;
    openPrint(`Income & Expense Report (${periodText(from, to)})`, body);
    setModal(null);
  });

  /* ── 9. Debit & Credit statement ─────────────────────────────────── */
  const printDebitCredit = ({ dateFrom, dateTo }) => withLoading('debitCredit', async () => {
    const from = dateFrom || monthStart();
    const to   = dateTo || today();
    if (from > to) { setError('The From date is after the To date.'); return; }
    const [stmt, sheet] = await Promise.all([
      api.get('/reports/accounting/debit-credit', { params: { from, to } }),
      api.get('/reports/accounting/balance-sheet', { params: { from, to } }),
    ]);
    const rows    = stmt.data?.data || [];
    const opening = sheet.data?.data?.openingBalance || 0;
    if (!rows.length) { setError('No receipts or expenses in this period.'); return; }

    const totalCredit = rows.reduce((a, r) => a + (r.credit || 0), 0);
    const totalDebit  = rows.reduce((a, r) => a + (r.debit || 0), 0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${money(opening)}</div><div class="lbl">Opening Balance</div></div>
        <div class="s-card"><div class="val" style="color:#16A34A">${money(totalCredit)}</div><div class="lbl">Total Credit</div></div>
        <div class="s-card"><div class="val" style="color:#DC2626">${money(totalDebit)}</div><div class="lbl">Total Debit</div></div>
        <div class="s-card"><div class="val">${money(opening + totalCredit - totalDebit)}</div><div class="lbl">Closing Balance</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Ref</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
        <tbody>
          <tr style="background:#F8FAFC"><td>${fmtD(from)}</td><td>—</td><td style="font-weight:600">Opening balance</td><td>—</td><td>—</td><td style="font-weight:700">${money(opening)}</td></tr>
          ${rows.map((r) => `<tr>
          <td>${fmtD(r.date)}</td>
          <td style="font-size:10px">${esc(r.ref || '')}</td>
          <td>${esc(r.description || '—')}</td>
          <td style="color:#DC2626;font-weight:600">${r.debit ? money(r.debit) : '—'}</td>
          <td style="color:#16A34A;font-weight:600">${r.credit ? money(r.credit) : '—'}</td>
          <td style="font-weight:600">${money(opening + (r.balance || 0))}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint(`Debit & Credit Statement (${periodText(from, to)})`, body);
    setModal(null);
  });

  /* ── 10. Accounts summary: the last twelve months ────────────────── */
  const printAccountsSummary = () => withLoading('accountsSummary', async () => {
    let y = Number(today().slice(0, 4));
    let m = Number(today().slice(5, 7));
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.unshift({ m, y });
      m -= 1; if (!m) { m = 12; y -= 1; }
    }
    const rows = await Promise.all(months.map(({ m: month, y: year }) =>
      api.get('/reports/accounting/summary', { params: { month, year } }).then((r) => r.data?.data || {})));
    if (!rows.some((r) => r.totalCollected || r.totalExpenses)) { setError('No income or expenses recorded in the last twelve months.'); return; }

    const grandInc = rows.reduce((a, r) => a + (r.totalCollected || 0), 0);
    const grandExp = rows.reduce((a, r) => a + (r.totalExpenses || 0), 0);
    const body = `<table>
      <thead><tr><th>Month</th><th>Fees Collected</th><th>Expenses</th><th>Net</th><th>Still Due (bills of the month)</th></tr></thead>
      <tbody>${rows.map((r) => {
        const net = (r.totalCollected || 0) - (r.totalExpenses || 0);
        return `<tr>
          <td style="font-weight:600">${esc(`${r.month || ''} ${r.year || ''}`.trim())}</td>
          <td style="color:#16A34A;font-weight:700">${money(r.totalCollected)}</td>
          <td style="color:#DC2626;font-weight:700">${money(r.totalExpenses)}</td>
          <td style="color:${net >= 0 ? '#16A34A' : '#DC2626'};font-weight:800">${money(net)}</td>
          <td>${money(r.totalOutstanding)}</td>
        </tr>`;
      }).join('')}
      <tr style="background:#F0FDF9;font-weight:800">
        <td>Total</td>
        <td style="color:#16A34A">${money(grandInc)}</td>
        <td style="color:#DC2626">${money(grandExp)}</td>
        <td style="color:${grandInc - grandExp >= 0 ? '#16A34A' : '#DC2626'}">${money(grandInc - grandExp)}</td>
        <td>—</td>
      </tr></tbody></table>`;
    openPrint('Accounts Summary Report — last 12 months', body);
  });

  /* ── 11. Detailed income ─────────────────────────────────────────── */
  const printDetailedIncome = ({ dateFrom, dateTo }) => withLoading('detailedIncome', async () => {
    const from = dateFrom || monthStart();
    const to   = dateTo || today();
    if (from > to) { setError('The From date is after the To date.'); return; }
    const res  = await api.get('/reports/accounting/income-expense', { params: { from, to } });
    const rows = res.data?.data?.income || [];
    if (!rows.length) { setError('No fees received in this period.'); return; }

    const total = rows.reduce((a, r) => a + (r.amountPaid || 0), 0);
    const body  = `
      <div class="summary-box"><div class="s-card"><div class="val" style="color:#16A34A">${money(total)}</div><div class="lbl">Total Income</div></div>
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Receipts</div></div></div>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Receipt</th><th>Student</th><th>Fee</th><th>Method</th><th>Amount</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${fmtD(r.paymentDate)}</td>
          <td style="font-size:10px">${esc(r.receiptNo || '—')}</td>
          <td>${esc(r.invoice?.student?.name || '—')}<div style="font-size:10px;color:#6B7280">${esc(r.invoice?.student?.rollNo || '')}</div></td>
          <td>${esc([r.invoice?.feeTitle, feePeriod(r.invoice)].filter(Boolean).join(' — ') || 'Fee')}</td>
          <td>${esc(r.method || '—')}</td>
          <td style="font-weight:700;color:#16A34A">${money(r.amountPaid)}</td>
        </tr>`).join('')}
        <tr style="background:#F0FDF9;font-weight:800"><td colspan="6">Grand Total</td><td style="color:#16A34A">${money(total)}</td></tr>
        </tbody>
      </table>`;
    openPrint(`Detailed Income Report (${periodText(from, to)})`, body);
    setModal(null);
  });

  /* ── 12. Detailed expense ────────────────────────────────────────── */
  const printDetailedExpense = ({ dateFrom, dateTo }) => withLoading('detailedExpense', async () => {
    const from = dateFrom || monthStart();
    const to   = dateTo || today();
    if (from > to) { setError('The From date is after the To date.'); return; }
    const [res, cats] = await Promise.all([
      api.get('/reports/accounting/income-expense', { params: { from, to } }),
      categoryNames(),
    ]);
    const rows = res.data?.data?.expenses || [];
    if (!rows.length) { setError('No expenses in this period.'); return; }

    const total = rows.reduce((a, r) => a + (r.amount || 0), 0);
    const body  = `
      <div class="summary-box"><div class="s-card"><div class="val" style="color:#DC2626">${money(total)}</div><div class="lbl">Total Expense</div></div>
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Entries</div></div></div>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${fmtD(r.date)}</td>
          <td>${esc(r.description || '—')}</td>
          <td>${esc(cats.get(r.categoryId) || 'Uncategorised')}</td>
          <td style="font-weight:700;color:#DC2626">${money(r.amount)}</td>
        </tr>`).join('')}
        <tr style="background:#FEF2F2;font-weight:800"><td colspan="4">Grand Total</td><td style="color:#DC2626">${money(total)}</td></tr>
        </tbody>
      </table>`;
    openPrint(`Detailed Expense Report (${periodText(from, to)})`, body);
    setModal(null);
  });

  /* ── 13. Balance sheet ───────────────────────────────────────────── */
  const printBalanceSheet = ({ dateFrom, dateTo }) => withLoading('balanceSheet', async () => {
    const from = dateFrom || monthStart();
    const to   = dateTo || today();
    if (from > to) { setError('The From date is after the To date.'); return; }
    const [sheetRes, detailRes, cats] = await Promise.all([
      api.get('/reports/accounting/balance-sheet', { params: { from, to } }),
      api.get('/reports/accounting/income-expense', { params: { from, to } }),
      categoryNames(),
    ]);
    const sheet = sheetRes.data?.data || {};
    const { income = [], expenses = [] } = detailRes.data?.data || {};

    // Income by fee head, expenses by category.
    const group = (list, keyOf, valOf) => [...list.reduce((m, r) => m.set(keyOf(r), (m.get(keyOf(r)) || 0) + valOf(r)), new Map()).entries()].sort((a, b) => b[1] - a[1]);
    const incRows = group(income, (r) => headOf(r.invoice?.feeTitle), (r) => r.amountPaid || 0);
    const expRows = group(expenses, (r) => cats.get(r.categoryId) || 'Uncategorised', (r) => r.amount || 0);

    const body = `
      <p style="margin-bottom:16px;font-size:12px;color:#6B7280;">Period: ${periodText(from, to)}</p>
      <table>
        <thead><tr><th>Account</th><th>Out</th><th>In</th></tr></thead>
        <tbody>
          <tr style="background:#F8FAFC;font-weight:700"><td>Opening balance (${fmtD(from)})</td><td>—</td><td>${money(sheet.openingBalance)}</td></tr>
          ${incRows.map(([k, v]) => `<tr><td>Fees: ${esc(k)}</td><td>—</td><td style="color:#16A34A;font-weight:700">${money(v)}</td></tr>`).join('')}
          ${expRows.map(([k, v]) => `<tr><td>Expense: ${esc(k)}</td><td style="color:#DC2626;font-weight:700">${money(v)}</td><td>—</td></tr>`).join('')}
          <tr style="font-weight:700"><td>Total for the period</td><td style="color:#DC2626">${money(sheet.expenses)}</td><td style="color:#16A34A">${money(sheet.income)}</td></tr>
          <tr style="background:#F0FDF9;font-weight:800">
            <td>Closing balance (${fmtD(to)})</td><td>—</td>
            <td style="color:${(sheet.closingBalance || 0) >= 0 ? '#16A34A' : '#DC2626'};font-size:14px">${money(sheet.closingBalance)}</td>
          </tr>
        </tbody>
      </table>`;
    openPrint('Balance Sheet', body);
    setModal(null);
  });

  /* ── 14. Staff salary report: one month ──────────────────────────── */
  const printStaffSalary = ({ filterMonth }) => withLoading('staffSalary', async () => {
    const [year, month] = String(filterMonth || today().slice(0, 7)).split('-').map(Number);
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const res  = await api.get('/reports/staff/salary', { params: { month, year } });
    const rows = res.data?.data || [];
    if (!rows.length) { setError(`Payroll for ${label} has not been generated yet. Generate it in Payroll Manager first.`); return; }

    const total  = rows.reduce((a, r) => a + (r.netSalary || 0), 0);
    const paid   = rows.filter((r) => r.status === 'issued').reduce((a, r) => a + (r.netSalary || 0), 0);
    const body  = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Staff</div></div>
        <div class="s-card"><div class="val">${money(total)}</div><div class="lbl">Total Payroll</div></div>
        <div class="s-card"><div class="val" style="color:#16A34A">${money(paid)}</div><div class="lbl">Paid</div></div>
        <div class="s-card"><div class="val" style="color:#DC2626">${money(total - paid)}</div><div class="lbl">Unpaid</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Staff Name</th><th>Designation</th><th>Basic</th><th>Allowances + Bonus</th><th>Deductions</th><th>Net Salary</th><th>Status</th></tr></thead>
        <tbody>${rows.map((s, i) => `<tr>
          <td>${i + 1}</td>
          <td style="font-weight:600">${esc(s.name || '—')}<div style="font-size:10px;color:#6B7280">${esc(s.empCode || '')}</div></td>
          <td>${esc(s.designation || '—')}</td>
          <td>${money(s.basic)}</td>
          <td>${money((s.allowances || 0) + (s.bonus || 0))}</td>
          <td>${money(s.deductions)}</td>
          <td style="font-weight:700;color:#0F766E">${money(s.netSalary)}</td>
          <td>${s.status === 'issued' ? `<span class="badge badge-green">Paid ${s.issueDate ? fmtD(s.issueDate) : ''}</span>` : '<span class="badge badge-red">Unpaid</span>'}</td>
        </tr>`).join('')}
        <tr style="background:#F0FDF9;font-weight:800"><td colspan="6">Total</td><td style="color:#0F766E">${money(total)}</td><td></td></tr>
        </tbody>
      </table>`;
    openPrint(`Staff Salary Report — ${label}`, body);
    setModal(null);
  });

  /* ── 15. Staff attendance summary ────────────────────────────────── */
  const printStaffAttendance = ({ filterMonth }) => withLoading('staffAttendance', async () => {
    const params = new URLSearchParams({ limit:'500' });
    if (filterMonth) params.set('month', filterMonth);
    const res  = await api.get(`/attendance/staff/report?${params}`);
    const rows = toRows(res);
    if (!rows.length) { setError('No staff attendance records found for the selected month.'); return; }

    const month = filterMonth || new Date().toLocaleString('en-PK', { month:'long', year:'numeric' });
    const body  = `
      <p style="margin-bottom:16px;font-size:12px;color:#6B7280;">Month: ${month}</p>
      <table>
        <thead><tr><th>#</th><th>Staff Name</th><th>Designation</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total Days</th><th>%</th></tr></thead>
        <tbody>${rows.map((r,i)=>{
          const present = r.present||r.presentDays||0;
          const absent  = r.absent||r.absentDays||0;
          const leave   = r.leave||r.leaveDays||0;
          const total   = present + absent + leave;
          const pct     = total > 0 ? Math.round((present/total)*100) : 0;
          return `<tr>
            <td>${i+1}</td>
            <td style="font-weight:600">${r.name||r.staffName||r.fullName||'—'}</td>
            <td>${r.designation||r.position||'—'}</td>
            <td style="color:#16A34A;font-weight:700">${present}</td>
            <td style="color:#DC2626;font-weight:700">${absent}</td>
            <td style="color:#D97706;font-weight:700">${leave}</td>
            <td>${total}</td>
            <td><span class="badge ${pct>=90?'badge-green':pct>=75?'badge-yellow':'badge-red'}">${pct}%</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    openPrint(`Staff Attendance Summary — ${month}`, body);
    setModal(null);
  });

  /* ─── open modal (fetches class list lazily) ──────────────────────── */
  const openModal = async (id) => {
    if (id === 'classWise') await fetchClassOptions();
    setModal(id);
  };

  /* ─── modal config map ───────────────────────────────────────────── */
  const MODAL_CONFIGS = {
    classWise: {
      title: 'Class Wise Basic Report',
      fields: [{ key:'filterClass', label:'Select Class', type:'select', defaultVal:'' }],
      onGenerate: printClassWise,
    },
    admission: {
      title: 'Admission Date Report',
      fields: [
        { key:'dateFrom', label:'From Date', type:'date', defaultVal:'2020-01-01' },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()     },
      ],
      onGenerate: printAdmission,
    },
    incomeExpense: {
      title: 'Income & Expense Report',
      fields: [
        { key:'dateFrom', label:'From Date', type:'date', defaultVal: monthStart() },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()      },
      ],
      onGenerate: printIncomeExpense,
    },
    balanceSheet: {
      title: 'Find A Balance Sheet',
      fields: [
        { key:'dateFrom',   label:'From Date',  type:'date', defaultVal: monthStart() },
        { key:'dateTo',     label:'To Date',    type:'date', defaultVal: today()      },
      ],
      onGenerate: printBalanceSheet,
    },
    debitCredit: {
      title: 'Debit & Credit Statement',
      fields: [
        { key:'dateFrom', label:'From Date', type:'date', defaultVal: monthStart() },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()      },
      ],
      onGenerate: printDebitCredit,
    },
    detailedIncome: {
      title: 'Detailed Income Report',
      fields: [
        { key:'dateFrom', label:'From Date', type:'date', defaultVal: monthStart() },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()      },
      ],
      onGenerate: printDetailedIncome,
    },
    detailedExpense: {
      title: 'Detailed Expense Report',
      fields: [
        { key:'dateFrom', label:'From Date', type:'date', defaultVal: monthStart() },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()      },
      ],
      onGenerate: printDetailedExpense,
    },
    staffSalary: {
      title: 'Staff Salary Report',
      fields: [
        { key:'filterMonth', label:'Month (YYYY-MM)', type:'month', defaultVal: today().slice(0,7) },
      ],
      onGenerate: printStaffSalary,
    },
    staffAttendance: {
      title: 'Staff Attendance Summary',
      fields: [
        { key:'filterMonth', label:'Month (YYYY-MM)', type:'month', defaultVal: today().slice(0,7) },
      ],
      onGenerate: printStaffAttendance,
    },
  };

  const closeModal = () => setModal(null);
  const activeModal = modal ? MODAL_CONFIGS[modal] : null;

  /* ─── section definitions ─────────────────────────────────────────── */
  const SECTIONS = [
    {
      id:'student', label:'Student Reports', icon:Users, iconColor:'#2563EB', iconBg:'#EFF6FF',
      reports:[
        {
          id:'classWise', icon:FileText, iconColor:'#2563EB', iconBg:'#EFF6FF',
          title:'Class Wise Basic Reports',
          description:'View and print basic student information filtered by class.',
          onGenerate: () => openModal('classWise'),
        },
        {
          id:'strength', icon:BarChart2, iconColor:'#7C3AED', iconBg:'#F5F3FF',
          title:'Student Strength Report',
          description:'Boys, girls and total student count per class.',
          onGenerate: printStrength,
        },
        {
          id:'admission', icon:Calendar, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title:'Admission Date Report',
          description:'Students admitted within a specific date range.',
          onGenerate: () => openModal('admission'),
        },
      ],
    },
    {
      id:'fee', label:'Fee Reports', icon:CreditCard, iconColor:'#D97706', iconBg:'#FEF3C7',
      reports:[
        {
          id:'defaulters', icon:AlertCircle, iconColor:'#DC2626', iconBg:'#FEE2E2',
          title:'Fee Defaulters Report',
          description:'All students with outstanding unpaid fee invoices.',
          onGenerate: printDefaulters,
        },
        {
          id:'unpaid', icon:FileText, iconColor:'#D97706', iconBg:'#FEF3C7',
          title:'List Of Unpaid Invoices',
          description:'Complete list of all pending and partial fee invoices.',
          onGenerate: printUnpaid,
        },
        {
          id:'discount', icon:Award, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title:'Fee Discount Report',
          description:'Students receiving fee discounts and concession details.',
          onGenerate: printDiscount,
        },
        {
          id:'headDues', icon:BarChart2, iconColor:'#7C3AED', iconBg:'#F5F3FF',
          title:'Head Wise Dues Summary',
          description:'Total dues grouped by fee head (Tuition, Lab, Transport, etc.).',
          onGenerate: printHeadDues,
        },
      ],
    },
    {
      id:'finance', label:'Financial Reports', icon:DollarSign, iconColor:'#16A34A', iconBg:'#DCFCE7',
      reports:[
        {
          id:'incomeExpense', icon:TrendingUp, iconColor:'#16A34A', iconBg:'#DCFCE7',
          title:'Income & Expense Report',
          description:'Combined income and expense summary for a selected date range.',
          onGenerate: () => openModal('incomeExpense'),
        },
        {
          id:'debitCredit', icon:TrendingDown, iconColor:'#DC2626', iconBg:'#FEE2E2',
          title:'Debit & Credit Statement',
          description:'Every fee received and expense paid in a period, in date order, with a running balance.',
          onGenerate: () => openModal('debitCredit'),
        },
        {
          id:'accountsSummary', icon:BarChart2, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title:'Accounts Summary Report',
          description:'Fees collected, expenses and net balance for each of the last twelve months.',
          onGenerate: printAccountsSummary,
        },
        {
          id:'detailedIncome', icon:TrendingUp, iconColor:'#059669', iconBg:'#D1FAE5',
          title:'Detailed Income Report',
          description:'Each fee receipt in a period, with date, student, fee and amount.',
          onGenerate: () => openModal('detailedIncome'),
        },
        {
          id:'detailedExpense', icon:TrendingDown, iconColor:'#B91C1C', iconBg:'#FEE2E2',
          title:'Detailed Expense Report',
          description:'Each expense in a period, with date, category and amount.',
          onGenerate: () => openModal('detailedExpense'),
        },
        {
          id:'balanceSheet', icon:DollarSign, iconColor:'#1E3A5F', iconBg:'#E0F2FE',
          title:'Find A Balance Sheet',
          description:'Opening balance, income by fee head, expenses by category and closing balance for a period.',
          onGenerate: () => openModal('balanceSheet'),
        },
      ],
    },
    {
      id:'staff', label:'Staff Reports', icon:Briefcase, iconColor:'#B45309', iconBg:'#FEF3C7',
      reports:[
        {
          id:'staffSalary', icon:Users, iconColor:'#B45309', iconBg:'#FEF3C7',
          title:'Staff Salary Report',
          description:'One month\'s salaries for every staff member: net pay, and whether it was paid.',
          onGenerate: () => openModal('staffSalary'),
        },
        {
          id:'staffAttendance', icon:CheckSquare, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title:'Staff Attendance Summary',
          description:'Monthly attendance grid showing present, absent and leave days.',
          onGenerate: () => openModal('staffAttendance'),
        },
      ],
    },
  ];

  /* ─── render ──────────────────────────────────────────────────────── */
  return (
    <div className="page-content fade-up">
      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* header */}
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Reporting Area</h1>
        <p className="page-subtitle" style={{ fontSize:13, color:'#64748B', marginTop:4 }}>
          Generate and print comprehensive reports for all school modules
        </p>
      </div>

      {/* sections */}
      {SECTIONS.map(sec => {
        const SecIcon = sec.icon;
        return (
          <div key={sec.id} style={{ marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:10, borderBottom:`2px solid ${sec.iconColor}20` }}>
              <div style={{ width:34, height:34, borderRadius:9, background:sec.iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <SecIcon size={17} color={sec.iconColor}/>
              </div>
              <h2 style={{ margin:0, fontSize:14.5, fontWeight:800, color:'#1E3A5F', letterSpacing:'-0.2px' }}>
                {sec.label}
              </h2>
              <div style={{ flex:1, height:1, background:`${sec.iconColor}20`, marginLeft:6 }}/>
            </div>

            <div className="grid-3">
              {sec.reports.map(rep => (
                <ReportCard
                  key={rep.id}
                  icon={rep.icon}
                  iconColor={rep.iconColor}
                  iconBg={rep.iconBg}
                  title={rep.title}
                  description={rep.description}
                  onGenerate={rep.onGenerate}
                  loading={loading === rep.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* filter modal */}
      {activeModal && (
        <FilterModal
          title={activeModal.title}
          fields={activeModal.fields}
          classOptions={classOptions}
          onClose={closeModal}
          onGenerate={activeModal.onGenerate}
          loading={loading !== null}
        />
      )}

      {/* error toast */}
      {error && (
        <ErrorToast message={error} onClose={() => setError(null)}/>
      )}
    </div>
  );
}
