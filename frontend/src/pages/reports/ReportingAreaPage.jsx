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

/* ─── helpers ─────────────────────────────────────────────────────────── */
const money   = v  => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const today   = () => new Date().toISOString().slice(0, 10);
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
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, lineHeight:1 }}>
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
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}><X size={18}/></button>
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

  /* ── 4. Fee defaulters ───────────────────────────────────────────── */
  const printDefaulters = () => withLoading('defaulters', async () => {
    const res  = await api.get('/fees/defaulters');
    const rows = toRows(res);
    if (!rows.length) { setError('No defaulters found. All fees may be up to date.'); return; }

    const totalDue = rows.reduce((a,r)=>a+(r.amount||r.totalDue||r.balance||0),0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Defaulters</div></div>
        <div class="s-card"><div class="val">${money(totalDue)}</div><div class="lbl">Total Due</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student Name</th><th>Class</th><th>Month / Period</th><th>Amount Due</th><th>Status</th></tr></thead>
        <tbody>${rows.map((r,i)=>`<tr>
          <td>${i+1}</td>
          <td style="font-weight:600">${r.student||r.studentName||r.name||'—'}</td>
          <td>${r.class||r.className||'—'}</td>
          <td>${r.month||r.period||'—'}</td>
          <td style="color:#DC2626;font-weight:700">${money(r.amount||r.totalDue||r.balance)}</td>
          <td><span class="badge badge-red">Unpaid</span></td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint('Fee Defaulters Report', body);
  });

  /* ── 5. Unpaid invoices ──────────────────────────────────────────── */
  const printUnpaid = () => withLoading('unpaid', async () => {
    const res  = await api.get('/fees/invoices?status=unpaid&limit=1000');
    const rows = toRows(res);
    if (!rows.length) { setError('No unpaid invoices found.'); return; }

    const total = rows.reduce((a,r)=>a+(r.amount||r.total||0),0);
    const body  = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Pending Invoices</div></div>
        <div class="s-card"><div class="val">${money(total)}</div><div class="lbl">Total Pending</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Fee Head</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${rows.map((r,i)=>`<tr>
          <td>${i+1}</td>
          <td style="font-weight:600">${r.student||r.studentName||'—'}</td>
          <td>${r.class||r.className||'—'}</td>
          <td>${r.head||r.feeHead||r.feeType||'Tuition'}</td>
          <td>${r.month||r.period||'—'}</td>
          <td>${money(r.amount||r.total)}</td>
          <td><span class="badge ${(r.status||'').toLowerCase()==='partial'?'badge-yellow':'badge-red'}">${r.status||'Unpaid'}</span></td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint('List of Unpaid Invoices', body);
  });

  /* ── 6. Fee discount report ──────────────────────────────────────── */
  const printDiscount = () => withLoading('discount', async () => {
    const res  = await api.get('/students?status=active&limit=1000');
    const rows = toRows(res).filter(s => (s.discount || s.feeDiscount || s.concession || 0) > 0);
    if (!rows.length) { setError('No discount records found.'); return; }

    const totalDisc = rows.reduce((a,s)=>a+(s.discount||s.feeDiscount||s.concession||0),0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Students with Discount</div></div>
        <div class="s-card"><div class="val">${money(totalDisc)}</div><div class="lbl">Total Discount Given</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Discount Type</th><th>Discount Amount</th><th>Net Fee</th></tr></thead>
        <tbody>${rows.map((s,i)=>{
          const disc = s.discount||s.feeDiscount||s.concession||0;
          const fee  = s.monthlyFee||s.fee||0;
          return `<tr>
            <td>${i+1}</td>
            <td style="font-weight:600">${s.name||s.fullName||'—'}</td>
            <td>${s.class||s.className||'—'}</td>
            <td>${s.discountType||s.concessionType||'Concession'}</td>
            <td style="color:#D97706;font-weight:700">${money(disc)}</td>
            <td style="font-weight:700">${money(fee-disc)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    openPrint('Fee Discount Report', body);
  });

  /* ── 7. Head-wise dues summary ───────────────────────────────────── */
  const printHeadDues = () => withLoading('headDues', async () => {
    const res  = await api.get('/fees/invoices?status=unpaid&limit=2000');
    const rows = toRows(res);
    if (!rows.length) { setError('No outstanding dues found.'); return; }

    const headMap = {};
    rows.forEach(r => {
      const h = r.head||r.feeHead||r.feeType||'Tuition';
      if (!headMap[h]) headMap[h] = { total:0, count:0 };
      headMap[h].total += r.amount||r.total||0;
      headMap[h].count++;
    });
    const list       = Object.entries(headMap);
    const grandTotal = list.reduce((a,[,v])=>a+v.total,0);
    const body = `<table>
      <thead><tr><th>#</th><th>Fee Head</th><th>No. of Invoices</th><th>Total Due</th></tr></thead>
      <tbody>${list.map(([h,v],i)=>`<tr>
        <td>${i+1}</td>
        <td style="font-weight:600">${h}</td>
        <td>${v.count}</td>
        <td style="color:#DC2626;font-weight:700">${money(v.total)}</td>
      </tr>`).join('')}
      <tr style="background:#FEF2F2;font-weight:700"><td colspan="2">Grand Total</td><td>${list.reduce((a,[,v])=>a+v.count,0)}</td><td style="color:#DC2626">${money(grandTotal)}</td></tr>
      </tbody></table>`;
    openPrint('Head Wise Dues Summary', body);
  });

  /* ── 8. Income & Expense report ──────────────────────────────────── */
  const printIncomeExpense = ({ dateFrom, dateTo }) => withLoading('incomeExpense', async () => {
    const qInc = new URLSearchParams({ limit:'2000' });
    const qExp = new URLSearchParams({ limit:'2000' });
    if (dateFrom) { qInc.set('from', dateFrom); qExp.set('from', dateFrom); }
    if (dateTo)   { qInc.set('to',   dateTo);   qExp.set('to',   dateTo);   }

    const [incRes, expRes] = await Promise.all([
      api.get(`/fees/payments?${qInc}`),
      api.get(`/expenses?${qExp}`),
    ]);
    const income   = toRows(incRes);
    const expenses = toRows(expRes);
    if (!income.length && !expenses.length) { setError('No income or expense records found for the selected period.'); return; }

    const totalInc = income.reduce((a,r)=>a+(r.amount||r.total||0),0);
    const totalExp = expenses.reduce((a,r)=>a+(r.amount||r.total||0),0);
    const net      = totalInc - totalExp;
    const range    = (dateFrom || dateTo) ? ` (${fmtD(dateFrom)} — ${fmtD(dateTo)})` : '';

    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${money(totalInc)}</div><div class="lbl">Total Income</div></div>
        <div class="s-card"><div class="val" style="color:#DC2626">${money(totalExp)}</div><div class="lbl">Total Expense</div></div>
        <div class="s-card"><div class="val" style="color:${net>=0?'#16A34A':'#DC2626'}">${money(Math.abs(net))}</div><div class="lbl">${net>=0?'Net Profit':'Net Loss'}</div></div>
      </div>
      <h4 style="margin-bottom:10px;color:#0F766E;">Income</h4>
      <table style="margin-bottom:20px">
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${income.map((r,i)=>`<tr>
          <td>${i+1}</td><td>${fmtD(r.date||r.paidDate||r.createdAt)}</td>
          <td>${r.description||r.remarks||r.student||r.studentName||'—'}</td>
          <td>${r.category||r.feeHead||r.type||'Fee'}</td>
          <td style="font-weight:700;color:#16A34A">${money(r.amount||r.total)}</td>
        </tr>`).join('')}</tbody>
      </table>
      <h4 style="margin-bottom:10px;color:#DC2626;">Expenses</h4>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${expenses.map((r,i)=>`<tr>
          <td>${i+1}</td><td>${fmtD(r.date||r.createdAt)}</td>
          <td>${r.description||r.title||r.remarks||'—'}</td>
          <td>${r.category||r.type||'Expense'}</td>
          <td style="font-weight:700;color:#DC2626">${money(r.amount||r.total)}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint(`Income & Expense Report${range}`, body);
    setModal(null);
  });

  /* ── 9. Debit & Credit statement ─────────────────────────────────── */
  const printDebitCredit = () => withLoading('debitCredit', async () => {
    const [incRes, expRes] = await Promise.all([
      api.get('/fees/payments?limit=2000'),
      api.get('/expenses?limit=2000'),
    ]);
    const income   = toRows(incRes);
    const expenses = toRows(expRes);
    if (!income.length && !expenses.length) { setError('No financial records found.'); return; }

    const totalCredit = income.reduce((a,r)=>a+(r.amount||r.total||0),0);
    const totalDebit  = expenses.reduce((a,r)=>a+(r.amount||r.total||0),0);
    const all = [
      ...income.map(r=>({ ...r, _type:'Credit', _date: r.date||r.paidDate||r.createdAt })),
      ...expenses.map(r=>({ ...r, _type:'Debit', _date: r.date||r.createdAt })),
    ].sort((a,b)=>new Date(a._date)-new Date(b._date));

    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val" style="color:#16A34A">${money(totalCredit)}</div><div class="lbl">Total Credit</div></div>
        <div class="s-card"><div class="val" style="color:#DC2626">${money(totalDebit)}</div><div class="lbl">Total Debit</div></div>
        <div class="s-card"><div class="val" style="color:${totalCredit-totalDebit>=0?'#16A34A':'#DC2626'}">${money(totalCredit-totalDebit)}</div><div class="lbl">Balance</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
        <tbody>${all.map(r=>`<tr>
          <td>${fmtD(r._date)}</td>
          <td>${r.description||r.title||r.remarks||r.student||r.studentName||'—'}</td>
          <td><span class="badge ${r._type==='Credit'?'badge-green':'badge-red'}">${r._type}</span></td>
          <td style="color:#DC2626;font-weight:600">${r._type==='Debit'  ? money(r.amount||r.total) : '—'}</td>
          <td style="color:#16A34A;font-weight:600">${r._type==='Credit' ? money(r.amount||r.total) : '—'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint('Debit & Credit Statement', body);
  });

  /* ── 10. Accounts summary ────────────────────────────────────────── */
  const printAccountsSummary = () => withLoading('accountsSummary', async () => {
    const res  = await api.get('/accounting/summary');
    const data = res?.data?.data || res?.data || {};

    // Normalise: backend may return array of months or a summary object
    const rows = Array.isArray(data) ? data : (data.months || data.monthly || []);
    if (!rows.length) { setError('No accounting summary data available.'); return; }

    const grandInc = rows.reduce((a,r)=>a+(r.income||r.totalIncome||r.credit||0),0);
    const grandExp = rows.reduce((a,r)=>a+(r.expense||r.totalExpense||r.debit||0),0);
    const body = `<table>
      <thead><tr><th>Month</th><th>Total Income</th><th>Total Expense</th><th>Net Balance</th></tr></thead>
      <tbody>${rows.map(r=>{
        const inc = r.income||r.totalIncome||r.credit||0;
        const exp = r.expense||r.totalExpense||r.debit||0;
        const net = inc - exp;
        return `<tr>
          <td style="font-weight:600">${r.month||r.label||r.period||'—'}</td>
          <td style="color:#16A34A;font-weight:700">${money(inc)}</td>
          <td style="color:#DC2626;font-weight:700">${money(exp)}</td>
          <td style="color:${net>=0?'#16A34A':'#DC2626'};font-weight:800">${money(net)}</td>
        </tr>`;
      }).join('')}
      <tr style="background:#F0FDF9;font-weight:800">
        <td>Total</td>
        <td style="color:#16A34A">${money(grandInc)}</td>
        <td style="color:#DC2626">${money(grandExp)}</td>
        <td style="color:${grandInc-grandExp>=0?'#16A34A':'#DC2626'}">${money(grandInc-grandExp)}</td>
      </tr></tbody></table>`;
    openPrint('Accounts Summary Report', body);
  });

  /* ── 11. Detailed income ─────────────────────────────────────────── */
  const printDetailedIncome = () => withLoading('detailedIncome', async () => {
    const res  = await api.get('/fees/payments?limit=2000');
    const rows = toRows(res);
    if (!rows.length) { setError('No payment records found.'); return; }

    const total = rows.reduce((a,r)=>a+(r.amount||r.total||0),0);
    const body  = `
      <div class="summary-box"><div class="s-card"><div class="val" style="color:#16A34A">${money(total)}</div><div class="lbl">Total Income</div></div></div>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Student / Description</th><th>Category</th><th>Method</th><th>Amount</th></tr></thead>
        <tbody>${rows.map((r,i)=>`<tr>
          <td>${i+1}</td>
          <td>${fmtD(r.date||r.paidDate||r.createdAt)}</td>
          <td>${r.student||r.studentName||r.description||r.remarks||'—'}</td>
          <td>${r.category||r.feeHead||r.type||'Fee'}</td>
          <td>${r.method||r.paymentMethod||'—'}</td>
          <td style="font-weight:700;color:#16A34A">${money(r.amount||r.total)}</td>
        </tr>`).join('')}
        <tr style="background:#F0FDF9;font-weight:800"><td colspan="5">Grand Total</td><td style="color:#16A34A">${money(total)}</td></tr>
        </tbody>
      </table>`;
    openPrint('Detailed Income Report', body);
  });

  /* ── 12. Detailed expense ────────────────────────────────────────── */
  const printDetailedExpense = () => withLoading('detailedExpense', async () => {
    const res  = await api.get('/expenses?limit=2000');
    const rows = toRows(res);
    if (!rows.length) { setError('No expense records found.'); return; }

    const total = rows.reduce((a,r)=>a+(r.amount||r.total||0),0);
    const body  = `
      <div class="summary-box"><div class="s-card"><div class="val" style="color:#DC2626">${money(total)}</div><div class="lbl">Total Expense</div></div></div>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Paid To</th><th>Amount</th></tr></thead>
        <tbody>${rows.map((r,i)=>`<tr>
          <td>${i+1}</td>
          <td>${fmtD(r.date||r.createdAt)}</td>
          <td>${r.description||r.title||r.remarks||'—'}</td>
          <td>${r.category||r.type||'Expense'}</td>
          <td>${r.paidTo||r.vendor||r.party||'—'}</td>
          <td style="font-weight:700;color:#DC2626">${money(r.amount||r.total)}</td>
        </tr>`).join('')}
        <tr style="background:#FEF2F2;font-weight:800"><td colspan="5">Grand Total</td><td style="color:#DC2626">${money(total)}</td></tr>
        </tbody>
      </table>`;
    openPrint('Detailed Expense Report', body);
  });

  /* ── 13. Balance sheet ───────────────────────────────────────────── */
  const printBalanceSheet = ({ dateFrom, dateTo, accountant }) => withLoading('balanceSheet', async () => {
    const qInc = new URLSearchParams({ limit:'2000' });
    const qExp = new URLSearchParams({ limit:'2000' });
    if (dateFrom) { qInc.set('from', dateFrom); qExp.set('from', dateFrom); }
    if (dateTo)   { qInc.set('to',   dateTo);   qExp.set('to',   dateTo);   }

    const [incRes, expRes] = await Promise.all([
      api.get(`/fees/payments?${qInc}`),
      api.get(`/expenses?${qExp}`),
    ]);
    const income   = toRows(incRes);
    const expenses = toRows(expRes);

    // Group income by category
    const incMap = {};
    income.forEach(r => {
      const k = r.category||r.feeHead||r.type||'Fee Collection';
      if (!incMap[k]) incMap[k] = 0;
      incMap[k] += r.amount||r.total||0;
    });
    // Group expense by category
    const expMap = {};
    expenses.forEach(r => {
      const k = r.category||r.type||'Miscellaneous';
      if (!expMap[k]) expMap[k] = 0;
      expMap[k] += r.amount||r.total||0;
    });

    const totalInc = Object.values(incMap).reduce((a,v)=>a+v,0);
    const totalExp = Object.values(expMap).reduce((a,v)=>a+v,0);
    const net      = totalInc - totalExp;
    const range    = (dateFrom || dateTo) ? `${fmtD(dateFrom)} to ${fmtD(dateTo)}` : 'All Time';

    const incRows = Object.entries(incMap).map(([k,v])=>
      `<tr><td>${k}</td><td>—</td><td style="color:#16A34A;font-weight:700">${money(v)}</td><td>${money(v)}</td></tr>`
    ).join('');
    const expRows = Object.entries(expMap).map(([k,v])=>
      `<tr><td>${k}</td><td style="color:#DC2626;font-weight:700">${money(v)}</td><td>—</td><td style="color:#DC2626">${money(-v)}</td></tr>`
    ).join('');

    const body = `
      <p style="margin-bottom:16px;font-size:12px;color:#6B7280;">Period: ${range}${accountant ? ' · Accountant: '+accountant : ''}</p>
      <table>
        <thead><tr><th>Account Head</th><th>Debit (Expense)</th><th>Credit (Income)</th><th>Balance</th></tr></thead>
        <tbody>
          ${incRows}
          ${expRows}
          <tr style="background:#F0FDF9;font-weight:800">
            <td>Net Balance</td>
            <td style="color:#DC2626">${money(totalExp)}</td>
            <td style="color:#16A34A">${money(totalInc)}</td>
            <td style="color:${net>=0?'#16A34A':'#DC2626'};font-size:14px">${money(net)}</td>
          </tr>
        </tbody>
      </table>`;
    openPrint('Balance Sheet', body);
    setModal(null);
  });

  /* ── 14. Staff salary report ─────────────────────────────────────── */
  const printStaffSalary = () => withLoading('staffSalary', async () => {
    const res  = await api.get('/salary?limit=500');
    const rows = toRows(res);
    if (!rows.length) { setError('No salary records found.'); return; }

    const total = rows.reduce((a,r)=>a+(r.salary||r.amount||r.netSalary||r.gross||0),0);
    const body  = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Total Staff</div></div>
        <div class="s-card"><div class="val">${money(total)}</div><div class="lbl">Total Payroll</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Staff Name</th><th>Designation</th><th>Department</th><th>Monthly Salary</th></tr></thead>
        <tbody>${rows.map((s,i)=>`<tr>
          <td>${i+1}</td>
          <td style="font-weight:600">${s.name||s.staffName||s.fullName||'—'}</td>
          <td>${s.designation||s.position||'—'}</td>
          <td>${s.department||'—'}</td>
          <td style="font-weight:700;color:#0F766E">${money(s.salary||s.amount||s.netSalary||s.gross)}</td>
        </tr>`).join('')}
        <tr style="background:#F0FDF9;font-weight:800"><td colspan="4">Total</td><td style="color:#0F766E">${money(total)}</td></tr>
        </tbody>
      </table>`;
    openPrint('Staff Salary Report', body);
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
        { key:'dateFrom', label:'From Date', type:'date', defaultVal: today().slice(0,7)+'-01' },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()                  },
      ],
      onGenerate: printIncomeExpense,
    },
    balanceSheet: {
      title: 'Find A Balance Sheet',
      fields: [
        { key:'dateFrom',   label:'From Date',  type:'date', defaultVal: today().slice(0,7)+'-01' },
        { key:'dateTo',     label:'To Date',    type:'date', defaultVal: today()                  },
        { key:'accountant', label:'Accountant', type:'text', placeholder:'e.g. Ahmed Ali', defaultVal:'' },
      ],
      onGenerate: printBalanceSheet,
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
          description:'Chronological listing of all debit (payments) and credit (income) entries.',
          onGenerate: printDebitCredit,
        },
        {
          id:'accountsSummary', icon:BarChart2, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title:'Accounts Summary Report',
          description:'Monthly income, expense and net balance summary table.',
          onGenerate: printAccountsSummary,
        },
        {
          id:'detailedIncome', icon:TrendingUp, iconColor:'#059669', iconBg:'#D1FAE5',
          title:'Detailed Income Report',
          description:'Each income transaction listed with date, category and amount.',
          onGenerate: printDetailedIncome,
        },
        {
          id:'detailedExpense', icon:TrendingDown, iconColor:'#B91C1C', iconBg:'#FEE2E2',
          title:'Detailed Expense Report',
          description:'Each expense transaction listed with date, category and amount.',
          onGenerate: printDetailedExpense,
        },
        {
          id:'balanceSheet', icon:DollarSign, iconColor:'#1E3A5F', iconBg:'#E0F2FE',
          title:'Find A Balance Sheet',
          description:'Assets, liabilities and net balance filtered by date range and accountant.',
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
          description:'Complete salary listing for all staff members with total payroll.',
          onGenerate: printStaffSalary,
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
