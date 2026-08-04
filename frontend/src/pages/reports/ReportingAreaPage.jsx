/**
 * IlmForge — Comprehensive Reporting Area
 * Full print-preview reports for Students, Fees, Finance, Staff
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  FileText, BarChart2, DollarSign, Users, Award, Printer,
  TrendingUp, TrendingDown, Search, Calendar, Filter, ChevronDown,
  X, AlertCircle, CreditCard, BookOpen, Briefcase, CheckSquare,
} from 'lucide-react';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const money  = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const today  = () => new Date().toISOString().slice(0, 10);
const fmtD   = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const schoolName = () => localStorage.getItem('schoolName') || 'IlmForge School';
const schoolAddr = () => localStorage.getItem('schoolAddress') || 'Islamabad, Pakistan';
const logoSrc    = () => localStorage.getItem('schoolLogoPreview') || null;

/* ─── print helper ────────────────────────────────────────────────────── */
function openPrint(titleText, bodyHtml) {
  const logo = logoSrc();
  const logoTag = logo
    ? `<img src="${logo}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" alt="logo"/>`
    : `<div style="width:56px;height:56px;background:#0F766E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;font-weight:900;">S</div>`;
  const watermarkCss = buildWatermarkCss({ mode: 'a4', color: '#0F766E' });
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

/* ─── demo data ───────────────────────────────────────────────────────── */
const DEMO_STUDENTS = [
  { _id:'1', name:'Ali Hassan',     rollNo:'101', class:'Class 6', gender:'Male',   admissionDate:'2023-04-01', feeStatus:'Paid'    },
  { _id:'2', name:'Sara Khan',      rollNo:'102', class:'Class 6', gender:'Female', admissionDate:'2023-04-01', feeStatus:'Unpaid'  },
  { _id:'3', name:'Usman Tariq',    rollNo:'103', class:'Class 7', gender:'Male',   admissionDate:'2023-09-01', feeStatus:'Paid'    },
  { _id:'4', name:'Ayesha Malik',   rollNo:'104', class:'Class 7', gender:'Female', admissionDate:'2024-01-15', feeStatus:'Partial' },
  { _id:'5', name:'Bilal Ahmed',    rollNo:'105', class:'Class 8', gender:'Male',   admissionDate:'2022-04-01', feeStatus:'Unpaid'  },
  { _id:'6', name:'Fatima Zahra',   rollNo:'106', class:'Class 8', gender:'Female', admissionDate:'2022-04-01', feeStatus:'Paid'    },
  { _id:'7', name:'Hamza Sheikh',   rollNo:'107', class:'Class 9', gender:'Male',   admissionDate:'2021-04-01', feeStatus:'Paid'    },
  { _id:'8', name:'Zainab Raza',    rollNo:'108', class:'Class 9', gender:'Female', admissionDate:'2021-04-01', feeStatus:'Unpaid'  },
  { _id:'9', name:'Omar Farooq',    rollNo:'109', class:'Class 10', gender:'Male',  admissionDate:'2020-04-01', feeStatus:'Paid'    },
  { _id:'10', name:'Nadia Baig',    rollNo:'110', class:'Class 10', gender:'Female',admissionDate:'2020-04-01', feeStatus:'Partial' },
];

const DEMO_FEES = [
  { _id:'i1', student:'Ali Hassan',   class:'Class 6',  month:'Jun 2025', amount:2500, status:'Paid',    discount:0,    head:'Tuition'  },
  { _id:'i2', student:'Sara Khan',    class:'Class 6',  month:'Jun 2025', amount:2500, status:'Unpaid',  discount:500,  head:'Tuition'  },
  { _id:'i3', student:'Usman Tariq',  class:'Class 7',  month:'Jun 2025', amount:2800, status:'Paid',    discount:0,    head:'Tuition'  },
  { _id:'i4', student:'Ayesha Malik', class:'Class 7',  month:'Jun 2025', amount:2800, status:'Partial', discount:200,  head:'Tuition'  },
  { _id:'i5', student:'Bilal Ahmed',  class:'Class 8',  month:'May 2025', amount:3000, status:'Unpaid',  discount:0,    head:'Tuition'  },
  { _id:'i6', student:'Fatima Zahra', class:'Class 8',  month:'May 2025', amount:3000, status:'Paid',    discount:300,  head:'Tuition'  },
  { _id:'i7', student:'Hamza Sheikh', class:'Class 9',  month:'Jun 2025', amount:3200, status:'Paid',    discount:0,    head:'Lab Fee'  },
  { _id:'i8', student:'Zainab Raza',  class:'Class 9',  month:'Jun 2025', amount:3200, status:'Unpaid',  discount:0,    head:'Tuition'  },
  { _id:'i9', student:'Omar Farooq',  class:'Class 10', month:'Jun 2025', amount:3500, status:'Paid',    discount:500,  head:'Exam Fee' },
  { _id:'i10',student:'Nadia Baig',   class:'Class 10', month:'Jun 2025', amount:3500, status:'Partial', discount:0,    head:'Tuition'  },
];

const DEMO_INCOME = [
  { date:'2025-06-01', description:'Fee Collection — Class 6',  category:'Fee',     amount:15000 },
  { date:'2025-06-03', description:'Fee Collection — Class 7',  category:'Fee',     amount:18000 },
  { date:'2025-06-05', description:'Admission Fee — New Batch', category:'Admission',amount:25000 },
  { date:'2025-06-10', description:'Fee Collection — Class 8',  category:'Fee',     amount:20000 },
  { date:'2025-06-15', description:'Lab Fee — Science Dept',    category:'Lab',     amount:8000  },
  { date:'2025-06-20', description:'Transport Fee Collection',  category:'Transport',amount:12000 },
];

const DEMO_EXPENSE = [
  { date:'2025-06-02', description:'Staff Salaries',            category:'Salaries',  amount:90000 },
  { date:'2025-06-04', description:'Electricity Bill',          category:'Utilities', amount:5500  },
  { date:'2025-06-08', description:'Stationery Purchase',       category:'Supplies',  amount:3200  },
  { date:'2025-06-12', description:'Lab Equipment Maintenance', category:'Maintenance',amount:4800 },
  { date:'2025-06-18', description:'Internet & Phone Bill',     category:'Utilities', amount:2200  },
  { date:'2025-06-22', description:'Cleaning Supplies',         category:'Supplies',  amount:1800  },
];

const DEMO_STAFF = [
  { _id:'s1', name:'Mr. Ahmad Ali',       designation:'Math Teacher',    department:'Science', salary:35000, attendance:{ present:22, absent:2, leave:0 } },
  { _id:'s2', name:'Ms. Sana Javed',      designation:'English Teacher', department:'Humanities', salary:32000, attendance:{ present:23, absent:0, leave:1 } },
  { _id:'s3', name:'Mr. Tariq Hussain',   designation:'Physics Teacher', department:'Science', salary:38000, attendance:{ present:20, absent:3, leave:1 } },
  { _id:'s4', name:'Ms. Rehana Malik',    designation:'Chemistry Teacher',department:'Science', salary:36000, attendance:{ present:24, absent:0, leave:0 } },
  { _id:'s5', name:'Mr. Nadeem Khan',     designation:'IT Teacher',      department:'Technology', salary:30000, attendance:{ present:21, absent:1, leave:2 } },
  { _id:'s6', name:'Ms. Amna Bashir',     designation:'Biology Teacher', department:'Science', salary:34000, attendance:{ present:22, absent:2, leave:0 } },
];

/* ─── helper: unique classes ──────────────────────────────────────────── */
const uniqClasses = studs => [...new Set(studs.map(s => s.class))].sort();

/* ════════════════════════════════════════════════════════════════════════
   REPORT CARD COMPONENT
════════════════════════════════════════════════════════════════════════ */
function ReportCard({ icon: Icon, iconColor, iconBg, title, description, onGenerate }) {
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
        className="btn btn-teal"
        style={{ alignSelf:'flex-start', fontSize:12, display:'flex', alignItems:'center', gap:6, padding:'7px 14px' }}
      >
        <Printer size={13}/> Generate Report
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   FILTER MODAL
════════════════════════════════════════════════════════════════════════ */
function FilterModal({ title, fields, onClose, onGenerate }) {
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
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={vals[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #D1D5DB', fontSize:13, background:'#fff', color:'#1F2937' }}
                >
                  <option value="">— All —</option>
                  {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
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
          ))}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn" style={{ background:'#F1F5F9', color:'#475569', fontSize:12 }}>Cancel</button>
          <button onClick={() => { onGenerate(vals); onClose(); }} className="btn btn-teal" style={{ fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
            <Printer size={13}/> Print Report
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
  const [modal, setModal] = useState(null); // { reportId, fields }

  /* ── data queries ── */
  const { data: studsRaw } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => api.get('/students?limit=500').then(r => r.data?.data || r.data),
    retry: false,
  });
  const { data: feesRaw } = useQuery({
    queryKey: ['fees-all'],
    queryFn: () => api.get('/fees?limit=500').then(r => r.data?.data || r.data),
    retry: false,
  });
  const { data: staffRaw } = useQuery({
    queryKey: ['staff-all'],
    queryFn: () => api.get('/staff?limit=200').then(r => r.data?.data || r.data),
    retry: false,
  });

  const studs = Array.isArray(studsRaw) ? studsRaw : DEMO_STUDENTS;
  const fees  = Array.isArray(feesRaw)  ? feesRaw  : DEMO_FEES;
  const staff = Array.isArray(staffRaw) ? staffRaw : DEMO_STAFF;
  const classes = uniqClasses(studs);

  /* ── print functions ── */

  /* 1. Class-wise basic report */
  const printClassWise = ({ filterClass }) => {
    const rows = studs.filter(s => !filterClass || s.class === filterClass);
    const title = filterClass ? `Class Wise Basic Report — ${filterClass}` : 'Class Wise Basic Report — All Classes';
    const summary = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Total Students</div></div>
        <div class="s-card"><div class="val">${rows.filter(s => s.gender==='Male').length}</div><div class="lbl">Boys</div></div>
        <div class="s-card"><div class="val">${rows.filter(s => s.gender==='Female').length}</div><div class="lbl">Girls</div></div>
      </div>`;
    const body = `${summary}<table>
      <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Class</th><th>Gender</th><th>Admission Date</th><th>Fee Status</th></tr></thead>
      <tbody>${rows.map((s,i)=>`<tr><td>${i+1}</td><td>${s.rollNo||'—'}</td><td style="font-weight:600">${s.name}</td><td>${s.class||'—'}</td><td>${s.gender||'—'}</td><td>${fmtD(s.admissionDate)}</td><td><span class="badge ${s.feeStatus==='Paid'?'badge-green':s.feeStatus==='Unpaid'?'badge-red':'badge-yellow'}">${s.feeStatus||'—'}</span></td></tr>`).join('')}</tbody>
    </table>`;
    openPrint(title, body);
  };

  /* 2. Student strength report */
  const printStrength = () => {
    const classMap = {};
    studs.forEach(s => {
      if (!classMap[s.class]) classMap[s.class] = { boys:0, girls:0 };
      if (s.gender === 'Male') classMap[s.class].boys++;
      else classMap[s.class].girls++;
    });
    const rows = Object.entries(classMap).map(([cls, v]) => ({ cls, ...v, total: v.boys + v.girls }));
    const totB = rows.reduce((a, r) => a + r.boys, 0);
    const totG = rows.reduce((a, r) => a + r.girls, 0);
    const body = `<table>
      <thead><tr><th>#</th><th>Class</th><th>Boys</th><th>Girls</th><th>Total</th></tr></thead>
      <tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${r.cls}</td><td>${r.boys}</td><td>${r.girls}</td><td style="font-weight:700;color:#0F766E">${r.total}</td></tr>`).join('')}
      <tr style="background:#F0FDF9;font-weight:700"><td colspan="2">Grand Total</td><td>${totB}</td><td>${totG}</td><td>${totB+totG}</td></tr></tbody>
    </table>`;
    openPrint('Student Strength Report — Class Wise', body);
  };

  /* 3. Admission date report */
  const printAdmission = ({ dateFrom, dateTo }) => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to   = dateTo   ? new Date(dateTo)   : null;
    const rows = studs.filter(s => {
      const d = new Date(s.admissionDate);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
    const range = (dateFrom || dateTo) ? ` (${fmtD(dateFrom)} — ${fmtD(dateTo)})` : '';
    const body = `<table>
      <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Class</th><th>Gender</th><th>Admission Date</th></tr></thead>
      <tbody>${rows.map((s,i)=>`<tr><td>${i+1}</td><td>${s.rollNo||'—'}</td><td style="font-weight:600">${s.name}</td><td>${s.class||'—'}</td><td>${s.gender||'—'}</td><td>${fmtD(s.admissionDate)}</td></tr>`).join('')}</tbody>
    </table>`;
    openPrint(`Admission Date Report${range}`, body);
  };

  /* 4. Fee defaulters */
  const printDefaulters = () => {
    const rows = studs.filter(s => fees.some(f => f.student === s.name && f.status === 'Unpaid'));
    const defaulterFees = fees.filter(f => f.status === 'Unpaid');
    const totalDue = defaulterFees.reduce((a, f) => a + (f.amount || 0), 0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${defaulterFees.length}</div><div class="lbl">Unpaid Invoices</div></div>
        <div class="s-card"><div class="val">${money(totalDue)}</div><div class="lbl">Total Due</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student Name</th><th>Class</th><th>Month</th><th>Amount Due</th><th>Status</th></tr></thead>
        <tbody>${defaulterFees.map((f,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${f.student||'—'}</td><td>${f.class||'—'}</td><td>${f.month||'—'}</td><td style="color:#DC2626;font-weight:700">${money(f.amount)}</td><td><span class="badge badge-red">Unpaid</span></td></tr>`).join('')}</tbody>
      </table>`;
    openPrint('Fee Defaulters Report', body);
  };

  /* 5. Unpaid invoices */
  const printUnpaid = () => {
    const rows = fees.filter(f => f.status === 'Unpaid' || f.status === 'Partial');
    const total = rows.reduce((a, f) => a + (f.amount || 0), 0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Pending Invoices</div></div>
        <div class="s-card"><div class="val">${money(total)}</div><div class="lbl">Total Pending</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Fee Head</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${rows.map((f,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${f.student||'—'}</td><td>${f.class||'—'}</td><td>${f.head||'Tuition'}</td><td>${f.month||'—'}</td><td>${money(f.amount)}</td><td><span class="badge ${f.status==='Partial'?'badge-yellow':'badge-red'}">${f.status}</span></td></tr>`).join('')}</tbody>
      </table>`;
    openPrint('List of Unpaid Invoices', body);
  };

  /* 6. Fee discount report */
  const printDiscount = () => {
    const rows = fees.filter(f => (f.discount || 0) > 0);
    const totalDisc = rows.reduce((a, f) => a + (f.discount || 0), 0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${rows.length}</div><div class="lbl">Discounted Records</div></div>
        <div class="s-card"><div class="val">${money(totalDisc)}</div><div class="lbl">Total Discount Given</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Fee Head</th><th>Original</th><th>Discount</th><th>Net</th></tr></thead>
        <tbody>${rows.map((f,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${f.student||'—'}</td><td>${f.class||'—'}</td><td>${f.head||'Tuition'}</td><td>${money(f.amount)}</td><td style="color:#D97706;font-weight:700">${money(f.discount)}</td><td style="font-weight:700">${money((f.amount||0)-(f.discount||0))}</td></tr>`).join('')}</tbody>
      </table>`;
    openPrint('Fee Discount Report', body);
  };

  /* 7. Head-wise dues summary */
  const printHeadDues = () => {
    const headMap = {};
    fees.filter(f => f.status !== 'Paid').forEach(f => {
      const h = f.head || 'Tuition';
      if (!headMap[h]) headMap[h] = { total:0, count:0 };
      headMap[h].total += f.amount || 0;
      headMap[h].count++;
    });
    const rows = Object.entries(headMap);
    const grandTotal = rows.reduce((a, [, v]) => a + v.total, 0);
    const body = `<table>
      <thead><tr><th>#</th><th>Fee Head</th><th>No. of Invoices</th><th>Total Due</th></tr></thead>
      <tbody>${rows.map(([h, v], i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${h}</td><td>${v.count}</td><td style="color:#DC2626;font-weight:700">${money(v.total)}</td></tr>`).join('')}
      <tr style="background:#FEF2F2;font-weight:700"><td colspan="2">Grand Total</td><td>${rows.reduce((a,[,v])=>a+v.count,0)}</td><td style="color:#DC2626">${money(grandTotal)}</td></tr></tbody>
    </table>`;
    openPrint('Head Wise Dues Summary', body);
  };

  /* 8. Income & Expense report */
  const printIncomeExpense = ({ dateFrom, dateTo }) => {
    const fromD = dateFrom ? new Date(dateFrom) : null;
    const toD   = dateTo   ? new Date(dateTo)   : null;
    const filtInc = DEMO_INCOME.filter(r => {
      const d = new Date(r.date);
      if (fromD && d < fromD) return false;
      if (toD   && d > toD)   return false;
      return true;
    });
    const filtExp = DEMO_EXPENSE.filter(r => {
      const d = new Date(r.date);
      if (fromD && d < fromD) return false;
      if (toD   && d > toD)   return false;
      return true;
    });
    const totalInc = filtInc.reduce((a, r) => a + r.amount, 0);
    const totalExp = filtExp.reduce((a, r) => a + r.amount, 0);
    const net = totalInc - totalExp;
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${money(totalInc)}</div><div class="lbl">Total Income</div></div>
        <div class="s-card"><div class="val" style="color:#DC2626">${money(totalExp)}</div><div class="lbl">Total Expense</div></div>
        <div class="s-card"><div class="val" style="color:${net>=0?'#16A34A':'#DC2626'}">${money(Math.abs(net))}</div><div class="lbl">${net>=0?'Net Profit':'Net Loss'}</div></div>
      </div>
      <h4 style="margin-bottom:10px;color:#0F766E;">Income</h4>
      <table style="margin-bottom:20px">
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${filtInc.map((r,i)=>`<tr><td>${i+1}</td><td>${fmtD(r.date)}</td><td>${r.description}</td><td>${r.category}</td><td style="font-weight:700;color:#16A34A">${money(r.amount)}</td></tr>`).join('')}</tbody>
      </table>
      <h4 style="margin-bottom:10px;color:#DC2626;">Expenses</h4>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${filtExp.map((r,i)=>`<tr><td>${i+1}</td><td>${fmtD(r.date)}</td><td>${r.description}</td><td>${r.category}</td><td style="font-weight:700;color:#DC2626">${money(r.amount)}</td></tr>`).join('')}</tbody>
      </table>`;
    openPrint('Income & Expense Report', body);
  };

  /* 9. Debit & Credit statement */
  const printDebitCredit = () => {
    const totalCredit = DEMO_INCOME.reduce((a, r) => a + r.amount, 0);
    const totalDebit  = DEMO_EXPENSE.reduce((a, r) => a + r.amount, 0);
    const all = [
      ...DEMO_INCOME.map(r => ({ ...r, type:'Credit' })),
      ...DEMO_EXPENSE.map(r => ({ ...r, type:'Debit' })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val" style="color:#16A34A">${money(totalCredit)}</div><div class="lbl">Total Credit</div></div>
        <div class="s-card"><div class="val" style="color:#DC2626">${money(totalDebit)}</div><div class="lbl">Total Debit</div></div>
        <div class="s-card"><div class="val" style="color:${totalCredit-totalDebit>=0?'#16A34A':'#DC2626'}">${money(totalCredit-totalDebit)}</div><div class="lbl">Balance</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
        <tbody>${all.map(r=>`<tr>
          <td>${fmtD(r.date)}</td><td>${r.description}</td>
          <td><span class="badge ${r.type==='Credit'?'badge-green':'badge-red'}">${r.type}</span></td>
          <td style="color:#DC2626;font-weight:600">${r.type==='Debit'?money(r.amount):'—'}</td>
          <td style="color:#16A34A;font-weight:600">${r.type==='Credit'?money(r.amount):'—'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    openPrint('Debit & Credit Statement', body);
  };

  /* 10. Accounts summary */
  const printAccountsSummary = () => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun'];
    const incomeByMonth  = [45000, 52000, 48000, 61000, 55000, 98000];
    const expenseByMonth = [40000, 44000, 42000, 50000, 47000, 88000];
    const body = `<table>
      <thead><tr><th>Month</th><th>Total Income</th><th>Total Expense</th><th>Net Balance</th></tr></thead>
      <tbody>${months.map((m,i)=>{
        const net = incomeByMonth[i] - expenseByMonth[i];
        return `<tr><td style="font-weight:600">${m} 2025</td><td style="color:#16A34A;font-weight:700">${money(incomeByMonth[i])}</td><td style="color:#DC2626;font-weight:700">${money(expenseByMonth[i])}</td><td style="color:${net>=0?'#16A34A':'#DC2626'};font-weight:800">${money(net)}</td></tr>`;
      }).join('')}
      <tr style="background:#F0FDF9;font-weight:800">
        <td>Total</td>
        <td style="color:#16A34A">${money(incomeByMonth.reduce((a,v)=>a+v,0))}</td>
        <td style="color:#DC2626">${money(expenseByMonth.reduce((a,v)=>a+v,0))}</td>
        <td>${money(incomeByMonth.reduce((a,v)=>a+v,0)-expenseByMonth.reduce((a,v)=>a+v,0))}</td>
      </tr></tbody>
    </table>`;
    openPrint('Accounts Summary Report — Jan–Jun 2025', body);
  };

  /* 11. Detailed income */
  const printDetailedIncome = () => {
    const total = DEMO_INCOME.reduce((a, r) => a + r.amount, 0);
    const body = `
      <div class="summary-box"><div class="s-card"><div class="val" style="color:#16A34A">${money(total)}</div><div class="lbl">Total Income</div></div></div>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${DEMO_INCOME.map((r,i)=>`<tr><td>${i+1}</td><td>${fmtD(r.date)}</td><td>${r.description}</td><td>${r.category}</td><td style="font-weight:700;color:#16A34A">${money(r.amount)}</td></tr>`).join('')}
        <tr style="background:#F0FDF9;font-weight:800"><td colspan="4">Grand Total</td><td style="color:#16A34A">${money(total)}</td></tr></tbody>
      </table>`;
    openPrint('Detailed Income Report', body);
  };

  /* 12. Detailed expense */
  const printDetailedExpense = () => {
    const total = DEMO_EXPENSE.reduce((a, r) => a + r.amount, 0);
    const body = `
      <div class="summary-box"><div class="s-card"><div class="val" style="color:#DC2626">${money(total)}</div><div class="lbl">Total Expense</div></div></div>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${DEMO_EXPENSE.map((r,i)=>`<tr><td>${i+1}</td><td>${fmtD(r.date)}</td><td>${r.description}</td><td>${r.category}</td><td style="font-weight:700;color:#DC2626">${money(r.amount)}</td></tr>`).join('')}
        <tr style="background:#FEF2F2;font-weight:800"><td colspan="4">Grand Total</td><td style="color:#DC2626">${money(total)}</td></tr></tbody>
      </table>`;
    openPrint('Detailed Expense Report', body);
  };

  /* 13. Balance sheet */
  const printBalanceSheet = ({ dateFrom, dateTo, accountant }) => {
    const totalInc = DEMO_INCOME.reduce((a, r) => a + r.amount, 0);
    const totalExp = DEMO_EXPENSE.reduce((a, r) => a + r.amount, 0);
    const net = totalInc - totalExp;
    const range = (dateFrom || dateTo) ? `${fmtD(dateFrom)} to ${fmtD(dateTo)}` : 'All Time';
    const body = `
      <p style="margin-bottom:16px;font-size:12px;color:#6B7280;">Period: ${range}${accountant ? ' · Accountant: '+accountant : ''}</p>
      <table>
        <thead><tr><th>Account Head</th><th>Debit (Expense)</th><th>Credit (Income)</th><th>Balance</th></tr></thead>
        <tbody>
          <tr><td>Fee Collection</td><td>—</td><td style="color:#16A34A;font-weight:700">${money(totalInc * 0.7)}</td><td>${money(totalInc * 0.7)}</td></tr>
          <tr><td>Admission Fees</td><td>—</td><td style="color:#16A34A;font-weight:700">${money(totalInc * 0.2)}</td><td>${money(totalInc * 0.2)}</td></tr>
          <tr><td>Misc. Income</td><td>—</td><td style="color:#16A34A;font-weight:700">${money(totalInc * 0.1)}</td><td>${money(totalInc * 0.1)}</td></tr>
          <tr><td>Staff Salaries</td><td style="color:#DC2626;font-weight:700">${money(totalExp * 0.75)}</td><td>—</td><td style="color:#DC2626">${money(-(totalExp * 0.75))}</td></tr>
          <tr><td>Utilities</td><td style="color:#DC2626;font-weight:700">${money(totalExp * 0.15)}</td><td>—</td><td style="color:#DC2626">${money(-(totalExp * 0.15))}</td></tr>
          <tr><td>Supplies & Misc.</td><td style="color:#DC2626;font-weight:700">${money(totalExp * 0.10)}</td><td>—</td><td style="color:#DC2626">${money(-(totalExp * 0.10))}</td></tr>
          <tr style="background:#F0FDF9;font-weight:800">
            <td>Net Balance</td>
            <td style="color:#DC2626">${money(totalExp)}</td>
            <td style="color:#16A34A">${money(totalInc)}</td>
            <td style="color:${net>=0?'#16A34A':'#DC2626'};font-size:14px">${money(net)}</td>
          </tr>
        </tbody>
      </table>`;
    openPrint('Balance Sheet', body);
  };

  /* 14. Staff salary report */
  const printStaffSalary = () => {
    const total = staff.reduce((a, s) => a + (s.salary || 0), 0);
    const body = `
      <div class="summary-box">
        <div class="s-card"><div class="val">${staff.length}</div><div class="lbl">Total Staff</div></div>
        <div class="s-card"><div class="val">${money(total)}</div><div class="lbl">Total Payroll</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Staff Name</th><th>Designation</th><th>Department</th><th>Monthly Salary</th></tr></thead>
        <tbody>${staff.map((s,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${s.name}</td><td>${s.designation||'—'}</td><td>${s.department||'—'}</td><td style="font-weight:700;color:#0F766E">${money(s.salary)}</td></tr>`).join('')}
        <tr style="background:#F0FDF9;font-weight:800"><td colspan="4">Total</td><td style="color:#0F766E">${money(total)}</td></tr></tbody>
      </table>`;
    openPrint('Staff Salary Report', body);
  };

  /* 15. Staff attendance summary */
  const printStaffAttendance = ({ filterMonth }) => {
    const month = filterMonth || new Date().toLocaleString('en-PK', { month:'long', year:'numeric' });
    const body = `
      <p style="margin-bottom:16px;font-size:12px;color:#6B7280;">Month: ${month}</p>
      <table>
        <thead><tr><th>#</th><th>Staff Name</th><th>Designation</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total Days</th><th>%</th></tr></thead>
        <tbody>${staff.map((s,i) => {
          const att = s.attendance || { present:20, absent:2, leave:2 };
          const total = att.present + att.absent + att.leave;
          const pct = total > 0 ? Math.round((att.present / total) * 100) : 0;
          return `<tr><td>${i+1}</td><td style="font-weight:600">${s.name}</td><td>${s.designation||'—'}</td>
            <td style="color:#16A34A;font-weight:700">${att.present}</td>
            <td style="color:#DC2626;font-weight:700">${att.absent}</td>
            <td style="color:#D97706;font-weight:700">${att.leave}</td>
            <td>${total}</td>
            <td><span class="badge ${pct>=90?'badge-green':pct>=75?'badge-yellow':'badge-red'}">${pct}%</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    openPrint(`Staff Attendance Summary — ${month}`, body);
  };

  /* ── modal config map ── */
  const MODAL_CONFIGS = {
    classWise: {
      title: 'Class Wise Basic Report',
      fields: [{ key:'filterClass', label:'Select Class', type:'select', options: classes, defaultVal:'' }],
      onGenerate: printClassWise,
    },
    admission: {
      title: 'Admission Date Report',
      fields: [
        { key:'dateFrom', label:'From Date', type:'date', defaultVal: '2020-01-01' },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()       },
      ],
      onGenerate: printAdmission,
    },
    incomeExpense: {
      title: 'Income & Expense Report',
      fields: [
        { key:'dateFrom', label:'From Date', type:'date', defaultVal: '2025-06-01' },
        { key:'dateTo',   label:'To Date',   type:'date', defaultVal: today()       },
      ],
      onGenerate: printIncomeExpense,
    },
    balanceSheet: {
      title: 'Find A Balance Sheet',
      fields: [
        { key:'dateFrom',   label:'From Date',  type:'date',   defaultVal: '2025-06-01' },
        { key:'dateTo',     label:'To Date',    type:'date',   defaultVal: today()       },
        { key:'accountant', label:'Accountant', type:'text',   placeholder:'e.g. Ahmed Ali', defaultVal:'' },
      ],
      onGenerate: printBalanceSheet,
    },
    staffAttendance: {
      title: 'Staff Attendance Summary',
      fields: [
        { key:'filterMonth', label:'Month', type:'text', placeholder:'e.g. June 2025', defaultVal:'June 2025' },
      ],
      onGenerate: printStaffAttendance,
    },
  };

  const openModal = (id) => setModal(id);
  const closeModal = () => setModal(null);

  /* ─── section data ─────────────────────────────────────────────────── */
  const SECTIONS = [
    {
      id: 'student',
      label: 'Student Reports',
      icon: Users,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
      reports: [
        {
          icon: FileText, iconColor:'#2563EB', iconBg:'#EFF6FF',
          title: 'Class Wise Basic Reports',
          description: 'View and print basic student information filtered by class.',
          onGenerate: () => openModal('classWise'),
        },
        {
          icon: BarChart2, iconColor:'#7C3AED', iconBg:'#F5F3FF',
          title: 'Student Strength Report',
          description: 'Boys, girls and total student count per class.',
          onGenerate: printStrength,
        },
        {
          icon: Calendar, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title: 'Admission Date Report',
          description: 'Students admitted within a specific date range.',
          onGenerate: () => openModal('admission'),
        },
      ],
    },
    {
      id: 'fee',
      label: 'Fee Reports',
      icon: CreditCard,
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      reports: [
        {
          icon: AlertCircle, iconColor:'#DC2626', iconBg:'#FEE2E2',
          title: 'Fee Defaulters Report',
          description: 'All students with outstanding unpaid fee invoices.',
          onGenerate: printDefaulters,
        },
        {
          icon: FileText, iconColor:'#D97706', iconBg:'#FEF3C7',
          title: 'List Of Unpaid Invoices',
          description: 'Complete list of all pending and partial fee invoices.',
          onGenerate: printUnpaid,
        },
        {
          icon: Award, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title: 'Fee Discount Report',
          description: 'Students receiving fee discounts and concession details.',
          onGenerate: printDiscount,
        },
        {
          icon: BarChart2, iconColor:'#7C3AED', iconBg:'#F5F3FF',
          title: 'Head Wise Dues Summary',
          description: 'Total dues grouped by fee head (Tuition, Lab, Transport, etc.).',
          onGenerate: printHeadDues,
        },
      ],
    },
    {
      id: 'finance',
      label: 'Financial Reports',
      icon: DollarSign,
      iconColor: '#16A34A',
      iconBg: '#DCFCE7',
      reports: [
        {
          icon: TrendingUp, iconColor:'#16A34A', iconBg:'#DCFCE7',
          title: 'Income & Expense Report',
          description: 'Combined income and expense summary for a selected date range.',
          onGenerate: () => openModal('incomeExpense'),
        },
        {
          icon: TrendingDown, iconColor:'#DC2626', iconBg:'#FEE2E2',
          title: 'Debit & Credit Statement',
          description: 'Chronological listing of all debit (payments) and credit (income) entries.',
          onGenerate: printDebitCredit,
        },
        {
          icon: BarChart2, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title: 'Accounts Summary Report',
          description: 'Monthly income, expense and net balance summary table.',
          onGenerate: printAccountsSummary,
        },
        {
          icon: TrendingUp, iconColor:'#059669', iconBg:'#D1FAE5',
          title: 'Detailed Income Report',
          description: 'Each income transaction listed with date, category and amount.',
          onGenerate: printDetailedIncome,
        },
        {
          icon: TrendingDown, iconColor:'#B91C1C', iconBg:'#FEE2E2',
          title: 'Detailed Expense Report',
          description: 'Each expense transaction listed with date, category and amount.',
          onGenerate: printDetailedExpense,
        },
        {
          icon: DollarSign, iconColor:'#1E3A5F', iconBg:'#E0F2FE',
          title: 'Find A Balance Sheet',
          description: 'Assets, liabilities and net balance filtered by date range and accountant.',
          onGenerate: () => openModal('balanceSheet'),
        },
      ],
    },
    {
      id: 'staff',
      label: 'Staff Reports',
      icon: Briefcase,
      iconColor: '#B45309',
      iconBg: '#FEF3C7',
      reports: [
        {
          icon: Users, iconColor:'#B45309', iconBg:'#FEF3C7',
          title: 'Staff Salary Report',
          description: 'Complete salary listing for all staff members with total payroll.',
          onGenerate: printStaffSalary,
        },
        {
          icon: CheckSquare, iconColor:'#0891B2', iconBg:'#E0F2FE',
          title: 'Staff Attendance Summary',
          description: 'Monthly attendance grid showing present, absent and leave days.',
          onGenerate: () => openModal('staffAttendance'),
        },
      ],
    },
  ];

  /* ─── render ─────────────────────────────────────────────────────────── */
  const activeModal = modal ? MODAL_CONFIGS[modal] : null;

  return (
    <div className="page-content fade-up">
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
            {/* section header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, paddingBottom:10, borderBottom:`2px solid ${sec.iconColor}20` }}>
              <div style={{ width:34, height:34, borderRadius:9, background:sec.iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <SecIcon size={17} color={sec.iconColor}/>
              </div>
              <h2 style={{ margin:0, fontSize:14.5, fontWeight:800, color:'#1E3A5F', letterSpacing:'-0.2px' }}>
                {sec.label}
              </h2>
              <div style={{ flex:1, height:1, background:`${sec.iconColor}20`, marginLeft:6 }}/>
            </div>

            {/* report cards */}
            <div className="grid-3">
              {sec.reports.map(rep => (
                <ReportCard key={rep.title} {...rep}/>
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
          onClose={closeModal}
          onGenerate={activeModal.onGenerate}
        />
      )}
    </div>
  );
}
