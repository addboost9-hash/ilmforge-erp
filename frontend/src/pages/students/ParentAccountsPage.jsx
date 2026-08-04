/**
 * IlmForge — Parent Accounts Management
 * Tabs: Manage Accounts | Account Requests | Print Gate Passes | Print Dues Report
 */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Users, UserCheck, Printer, Phone, CreditCard,
  CheckCircle, X, AlertCircle, Search, Eye, Key,
  Send, RefreshCw, ChevronDown, XCircle
} from 'lucide-react';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

/* ─── Helpers ─────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

/* ─── Demo / fallback data ────────────────────────────── */
const DEMO_PARENTS = [
  { id: 1, name: 'Muhammad Tariq', cnic: '35202-1234567-1', phone: '0300-1234567', appLogin: true,  webLogin: false, status: 'active',
    students: [{ id: 1, name: 'Ali Tariq',   class: 'Class 5 - A', rollNo: '101' },
               { id: 2, name: 'Sara Tariq',  class: 'Class 3 - B', rollNo: '207' }] },
  { id: 2, name: 'Ahmed Khan',      cnic: '35202-7654321-3', phone: '0312-7654321', appLogin: true,  webLogin: true,  status: 'active',
    students: [{ id: 3, name: 'Usman Ahmed', class: 'Class 8 - A', rollNo: '305' }] },
  { id: 3, name: 'Bilal Hussain',   cnic: '35202-1111111-5', phone: '0321-1111111', appLogin: false, webLogin: false, status: 'active',
    students: [{ id: 4, name: 'Hira Bilal',  class: 'Class 6 - B', rollNo: '412' }] },
  { id: 4, name: 'Zafar Iqbal',     cnic: '35202-2222222-7', phone: '0333-2222222', appLogin: false, webLogin: true,  status: 'inactive',
    students: [{ id: 5, name: 'Noman Zafar', class: 'Class 9 - A', rollNo: '501' }] },
  { id: 5, name: 'Shahid Mehmood',  cnic: '35202-3333333-9', phone: '0345-3333333', appLogin: true,  webLogin: false, status: 'active',
    students: [{ id: 6, name: 'Asim Shahid',  class: 'Class 7 - A', rollNo: '608' },
               { id: 7, name: 'Maryam Shahid',class: 'Class 4 - C', rollNo: '703' },
               { id: 8, name: 'Omer Shahid',   class: 'Class 2 - A', rollNo: '805' }] },
];

const DEMO_REQUESTS = [
  { id: 1, name: 'Rashid Ali',    phone: '0300-9876543', email: 'rashid@example.com', requestedAt: '2026-06-25T10:30:00', status: 'pending' },
  { id: 2, name: 'Kamran Baig',   phone: '0312-8765432', email: 'kamran@example.com', requestedAt: '2026-06-26T14:15:00', status: 'pending' },
  { id: 3, name: 'Naila Perveen', phone: '0321-7654321', email: 'naila@example.com',  requestedAt: '2026-06-27T09:00:00', status: 'approved' },
  { id: 4, name: 'Irfan Malik',   phone: '0333-6543210', email: 'irfan@example.com',  requestedAt: '2026-06-28T11:45:00', status: 'rejected' },
  { id: 5, name: 'Saima Naz',     phone: '0345-5432109', email: 'saima@example.com',  requestedAt: '2026-06-29T16:00:00', status: 'pending' },
];

const DEMO_STUDENTS_GP = [
  { id: 1,  name: 'Ali Tariq',    class: 'Class 5', section: 'A', rollNo: '101', fatherName: 'Muhammad Tariq', cnic: '35202-1234567-1', campus: 'Main Campus' },
  { id: 2,  name: 'Sara Tariq',   class: 'Class 3', section: 'B', rollNo: '207', fatherName: 'Muhammad Tariq', cnic: '35202-1234567-1', campus: 'Main Campus' },
  { id: 3,  name: 'Usman Ahmed',  class: 'Class 8', section: 'A', rollNo: '305', fatherName: 'Ahmed Khan',     cnic: '35202-7654321-3', campus: 'Branch 1' },
  { id: 4,  name: 'Hira Bilal',   class: 'Class 6', section: 'B', rollNo: '412', fatherName: 'Bilal Hussain',  cnic: '35202-1111111-5', campus: 'Main Campus' },
  { id: 5,  name: 'Noman Zafar',  class: 'Class 9', section: 'A', rollNo: '501', fatherName: 'Zafar Iqbal',    cnic: '35202-2222222-7', campus: 'Main Campus' },
  { id: 6,  name: 'Asim Shahid',  class: 'Class 7', section: 'A', rollNo: '608', fatherName: 'Shahid Mehmood', cnic: '35202-3333333-9', campus: 'Branch 2' },
  { id: 7,  name: 'Maryam Shahid',class: 'Class 4', section: 'C', rollNo: '703', fatherName: 'Shahid Mehmood', cnic: '35202-3333333-9', campus: 'Branch 2' },
  { id: 8,  name: 'Omer Shahid',  class: 'Class 2', section: 'A', rollNo: '805', fatherName: 'Shahid Mehmood', cnic: '35202-3333333-9', campus: 'Branch 2' },
];

const DEMO_DUES = [
  { id: 1,  name: 'Ali Tariq',    class: 'Class 5-A', fatherName: 'Muhammad Tariq', phone: '0300-1234567', dueAmount: 4500, status: 'overdue' },
  { id: 2,  name: 'Hira Bilal',   class: 'Class 6-B', fatherName: 'Bilal Hussain',  phone: '0321-1111111', dueAmount: 3200, status: 'due' },
  { id: 3,  name: 'Noman Zafar',  class: 'Class 9-A', fatherName: 'Zafar Iqbal',    phone: '0333-2222222', dueAmount: 7800, status: 'overdue' },
  { id: 4,  name: 'Asim Shahid',  class: 'Class 7-A', fatherName: 'Shahid Mehmood', phone: '0345-3333333', dueAmount: 2100, status: 'due' },
  { id: 5,  name: 'Usman Ahmed',  class: 'Class 8-A', fatherName: 'Ahmed Khan',     phone: '0312-7654321', dueAmount: 5500, status: 'due' },
];

const CAMPUSES  = ['All Campuses', 'Main Campus', 'Branch 1', 'Branch 2'];
const CLASSES   = ['All Classes', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
const SECTIONS  = ['All Sections', 'A', 'B', 'C', 'D'];
const MONTHS    = ['All Months', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SCHOOL_NAME    = localStorage.getItem('schoolName')    || 'IlmForge Academy';
const SCHOOL_ADDRESS = localStorage.getItem('schoolAddress') || 'Lahore, Pakistan';
const SCHOOL_LOGO    = localStorage.getItem('schoolLogoPreview') || '';

/* ─── Gate Pass Print ─────────────────────────────────── */
const buildGatePassHTML = (student, printDate) => {
  const watermarkCss = buildWatermarkCss({
    mode: 'a4',
    position: 'absolute',
    color: '#1E3A5F',
    logoSize: '118px',
    fallbackFontSize: '62px',
  });
  const watermarkHtml = buildWatermarkMarkup({ logo: SCHOOL_LOGO, text: SCHOOL_NAME, textClass: 'wm-text', imgAlt: 'School watermark' });

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Gate Pass — ${student.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; padding: 20mm; background:#fff; }
  .pass { width:160mm; border:2.5px solid #1E3A5F; border-radius:8px; padding:10mm; margin:0 auto; position:relative; overflow:hidden; }
  ${watermarkCss}
  .header, .info-grid, .footer { position:relative; z-index:1; }
  .header { text-align:center; border-bottom:2px solid #1E3A5F; padding-bottom:8px; margin-bottom:12px; }
  .school-name { font-size:16pt; font-weight:900; color:#1E3A5F; }
  .school-addr { font-size:9pt; color:#64748B; margin-top:2px; }
  .pass-title { font-size:12pt; font-weight:800; color:#1E3A5F; margin-top:6px; letter-spacing:1.5px; text-transform:uppercase; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
  .info-row { display:flex; flex-direction:column; gap:2px; }
  .info-label { font-size:8.5pt; color:#64748B; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
  .info-value { font-size:10.5pt; font-weight:700; color:#0F172A; }
  .footer { display:flex; justify-content:space-between; align-items:flex-end; border-top:1.5px solid #CBD5E1; padding-top:10px; margin-top:10px; }
  .sig-line { width:50mm; border-bottom:1.5px solid #0F172A; margin-bottom:4px; }
  .sig-label { font-size:8.5pt; color:#64748B; text-align:center; }
  .date-box { font-size:9pt; color:#374151; }
  @media print { body { padding:0; } }
</style>
</head>
<body>
<div class="pass">
  ${watermarkHtml}
  <div class="header">
    <div class="school-name">${SCHOOL_NAME}</div>
    <div class="school-addr">${SCHOOL_ADDRESS}</div>
    <div class="pass-title">Student Gate Pass</div>
  </div>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Student Name</span><span class="info-value">${student.name}</span></div>
    <div class="info-row"><span class="info-label">Roll No.</span><span class="info-value">${student.rollNo}</span></div>
    <div class="info-row"><span class="info-label">Class / Section</span><span class="info-value">${student.class} — ${student.section}</span></div>
    <div class="info-row"><span class="info-label">Campus</span><span class="info-value">${student.campus}</span></div>
    <div class="info-row"><span class="info-label">Father's Name</span><span class="info-value">${student.fatherName}</span></div>
    <div class="info-row"><span class="info-label">CNIC</span><span class="info-value">${student.cnic}</span></div>
  </div>
  <div class="footer">
    <div class="date-box">Date: <strong>${printDate}</strong></div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>
    </div>
  </div>
</div>
</body>
</html>`;
};

const printGatePass = (students) => {
  const printDate = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  if (students.length === 1) {
    const w = window.open('', '_blank');
    w.document.write(buildGatePassHTML(students[0], printDate));
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
    return;
  }
  // Multiple passes — combine into one page
  const combined = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Gate Passes</title>
  <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family:Arial,sans-serif; background:#fff; padding:10mm; }
  .pass-wrapper { page-break-after:always; padding:10mm 0; } .pass-wrapper:last-child { page-break-after:avoid; }
  ${students.map(() => '').join('')}</style></head><body>
  ${students.map(s => `<div class="pass-wrapper">${buildGatePassHTML(s, printDate).replace('<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Gate Pass — ' + s.name + '</title><style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: Arial, sans-serif; padding: 20mm; background:#fff; }', '<style>').replace('</style></head><body>', '</style>').replace('</body></html>', '')}</div>`).join('')}
  </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(combined);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
};

/* ─── Dues Report Print ───────────────────────────────── */
const printDuesReport = (rows, month) => {
  const printDate = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const total = rows.reduce((s, r) => s + (r.dueAmount || 0), 0);
  const watermarkCss = buildWatermarkCss({ mode: 'a4', color: '#1E3A5F', textClass: 'wm-text' });
  const watermarkHtml = buildWatermarkMarkup({ logo: SCHOOL_LOGO, text: SCHOOL_NAME, textClass: 'wm-text', imgAlt: 'School watermark' });
  const rowsHTML = rows.map((r, i) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #E2E8F0;text-align:center;">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #E2E8F0;font-weight:600;">${r.name}</td>
      <td style="padding:6px 8px;border:1px solid #E2E8F0;">${r.class}</td>
      <td style="padding:6px 8px;border:1px solid #E2E8F0;">${r.fatherName}</td>
      <td style="padding:6px 8px;border:1px solid #E2E8F0;">${r.phone}</td>
      <td style="padding:6px 8px;border:1px solid #E2E8F0;text-align:right;font-weight:700;color:${r.status === 'overdue' ? '#DC2626' : '#D97706'};">Rs. ${(r.dueAmount || 0).toLocaleString()}</td>
      <td style="padding:6px 8px;border:1px solid #E2E8F0;text-align:center;">
        <span style="padding:2px 8px;border-radius:4px;font-size:9.5pt;font-weight:600;background:${r.status === 'overdue' ? '#FEE2E2' : '#FEF9C3'};color:${r.status === 'overdue' ? '#DC2626' : '#D97706'};">${r.status === 'overdue' ? 'Overdue' : 'Due'}</span>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Dues Report</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; padding:15mm; background:#fff; font-size:10pt; position:relative; overflow:hidden; }
    ${watermarkCss}
    .header, .meta, table, .footer { position:relative; z-index:1; }
    .header { text-align:center; border-bottom:2.5px solid #1E3A5F; padding-bottom:10px; margin-bottom:14px; }
    .school-name { font-size:16pt; font-weight:900; color:#1E3A5F; }
    .school-addr { font-size:9pt; color:#64748B; margin-top:3px; }
    .report-title { font-size:12pt; font-weight:800; color:#1E3A5F; margin-top:6px; }
    .meta { display:flex; justify-content:space-between; margin-bottom:12px; font-size:9.5pt; color:#374151; }
    table { width:100%; border-collapse:collapse; margin-bottom:14px; }
    thead tr { background:#1E3A5F; color:#fff; }
    thead th { padding:7px 8px; text-align:left; font-size:9.5pt; }
    tbody tr:nth-child(even) { background:#F8FAFC; }
    .total-row { background:#EFF6FF; font-weight:700; }
    .footer { text-align:right; font-size:9pt; color:#64748B; border-top:1px solid #E2E8F0; padding-top:8px; }
    @media print { body { padding:0; } }
  </style>
  </head><body>
  ${watermarkHtml}
  <div class="header">
    <div class="school-name">${SCHOOL_NAME}</div>
    <div class="school-addr">${SCHOOL_ADDRESS}</div>
    <div class="report-title">Student Dues Report${month && month !== 'All Months' ? ' — ' + month : ''}</div>
  </div>
  <div class="meta">
    <span>Total Records: <strong>${rows.length}</strong></span>
    <span>Print Date: <strong>${printDate}</strong></span>
    <span>Total Dues: <strong>Rs. ${total.toLocaleString()}</strong></span>
  </div>
  <table>
    <thead><tr><th>#</th><th>Student Name</th><th>Class</th><th>Father Name</th><th>Phone</th><th style="text-align:right;">Due Amount</th><th style="text-align:center;">Status</th></tr></thead>
    <tbody>
      ${rowsHTML}
      <tr class="total-row">
        <td colspan="5" style="padding:7px 8px;border:1px solid #E2E8F0;text-align:right;">Total Dues:</td>
        <td style="padding:7px 8px;border:1px solid #E2E8F0;text-align:right;color:#DC2626;">Rs. ${total.toLocaleString()}</td>
        <td style="border:1px solid #E2E8F0;"></td>
      </tr>
    </tbody>
  </table>
  <div class="footer">Generated by ${SCHOOL_NAME} — ${printDate}</div>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function ParentAccountsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('manage');
  const [search, setSearch]       = useState('');
  const [studentsModal, setStudentsModal] = useState(null); // parent object

  /* Gate Pass filters */
  const [gpCampus,  setGpCampus]  = useState('All Campuses');
  const [gpClass,   setGpClass]   = useState('All Classes');
  const [gpSection, setGpSection] = useState('All Sections');

  /* Dues filters */
  const [duesClass, setDuesClass] = useState('All Classes');
  const [duesMonth, setDuesMonth] = useState('All Months');

  /* Requests local state */
  const [requests, setRequests]   = useState(DEMO_REQUESTS);

  /* ── API Queries ────────────────────────────────────── */
  const { data: parentsData, isLoading: parentsLoading } = useQuery({
    queryKey: ['parents'],
    queryFn: () => api.get('/parents').then(r => r.data),
    retry: false,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students', { status: 'active' }],
    queryFn: () => api.get('/students', { params: { status: 'active', limit: 200 } }).then(r => r.data),
    retry: false,
  });

  /* ── Derived data ───────────────────────────────────── */
  const rawParents  = parentsData?.data || DEMO_PARENTS;
  const rawStudents = studentsData?.data || DEMO_STUDENTS_GP;

  const parents = rawParents.map(p => ({
    ...p,
    appLogin: p.appLogin ?? Math.random() > 0.5,
    webLogin: p.webLogin ?? Math.random() > 0.6,
    students: p.students || [],
  }));

  const filteredParents = parents.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.cnic || '').includes(q);
  });

  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  /* Gate pass students */
  const gpStudents = DEMO_STUDENTS_GP.filter(s => {
    if (gpCampus  !== 'All Campuses' && s.campus  !== gpCampus)  return false;
    if (gpClass   !== 'All Classes'  && s.class   !== gpClass)   return false;
    if (gpSection !== 'All Sections' && s.section !== gpSection) return false;
    return true;
  });

  /* Dues students */
  const duesStudents = DEMO_DUES.filter(s => {
    if (duesClass !== 'All Classes' && s.class.split('-')[0].trim() !== duesClass) return false;
    return true;
  });

  /* ── Actions ────────────────────────────────────────── */
  const handleSendCredentials = (parent) => {
    toast.success(`Credentials sent to ${parent.name}`);
  };

  const handleResetPassword = (parent) => {
    toast.success(`Password reset for ${parent.name}`);
  };

  const handleApproveRequest = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    toast.success('Request approved');
  };

  const handleRejectRequest = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    toast.error('Request rejected');
  };

  /* ── Stats ──────────────────────────────────────────── */
  const totalParents  = parents.length;
  const activeParents = parents.filter(p => (p.status || p.isActive) === true || p.status === 'active').length;

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="page-content fade-in">

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Parent Accounts</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Manage parent portal access, account requests and print utilities
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar" style={{ marginBottom: 20 }}>
        {[
          { key: 'manage',    label: 'Manage Accounts',    icon: Users },
          { key: 'requests',  label: 'Account Requests',   icon: UserCheck,  badge: pendingRequests },
          { key: 'gatepasses',label: 'Print Gate Passes',  icon: Printer },
          { key: 'dues',      label: 'Print Dues Report',  icon: CreditCard },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={14} />
              {t.label}
              {t.badge > 0 && (
                <span style={{
                  background: '#EF4444', color: '#fff', borderRadius: 999,
                  fontSize: 10, fontWeight: 700, padding: '1px 6px',
                  minWidth: 18, textAlign: 'center', lineHeight: '16px'
                }}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB: Manage Accounts ──────────────────────────── */}
      {activeTab === 'manage' && (
        <>
          {/* Stats */}
          <div className="stats-grid-3" style={{ marginBottom: 16 }}>
            {[
              { label: 'Total Parents',    value: totalParents,    color: '#1E3A5F', bg: '#EFF6FF',  icon: Users },
              { label: 'Active',           value: activeParents,   color: '#15803D', bg: '#DCFCE7',  icon: UserCheck },
              { label: 'Pending Requests', value: pendingRequests, color: '#D97706', bg: '#FEF9C3',  icon: AlertCircle },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="card" style={{ background: item.bg, border: 'none', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={item.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>{item.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div className="card" style={{ padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Search size={15} color="#94A3B8" />
            <input
              className="input"
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, padding: 0, background: 'transparent' }}
              placeholder="Search by parent name or CNIC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }} onClick={() => setSearch('')}><X size={14} /></button>}
          </div>

          {/* Parents Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {parentsLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Parent Name</th>
                      <th>CNIC</th>
                      <th>Phone</th>
                      <th>Connected Students</th>
                      <th style={{ textAlign: 'center' }}>App Login</th>
                      <th style={{ textAlign: 'center' }}>Web Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParents.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{p.name || `Parent #${p.id}`}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{p.cnic || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>
                          {p.phone ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Phone size={12} color="#64748B" />
                              {p.phone}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11.5, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => setStudentsModal(p)}
                          >
                            <Eye size={12} />
                            {(p.students || []).length} Student{(p.students || []).length !== 1 ? 's' : ''}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {p.appLogin
                            ? <span className="badge badge-green" style={{ fontSize: 10.5 }}>Active</span>
                            : <span className="badge badge-red"   style={{ fontSize: 10.5 }}>None</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {p.webLogin
                            ? <span className="badge badge-teal" style={{ fontSize: 10.5 }}>Active</span>
                            : <span className="badge badge-gray" style={{ fontSize: 10.5 }}>None</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Send Credentials"
                              onClick={() => handleSendCredentials(p)}
                            >
                              <Send size={11} /> Credentials
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, color: '#D97706', borderColor: '#D97706' }}
                              title="Reset Password"
                              onClick={() => handleResetPassword(p)}
                            >
                              <Key size={11} /> Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredParents.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className="empty-state">
                            <div className="empty-state-icon"><Users size={32} color="#CBD5E1" /></div>
                            <div className="empty-state-text">No parent accounts found</div>
                            <div className="empty-state-sub">{search ? 'Try a different search term' : 'Parent accounts appear here once students are admitted'}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: Account Requests ─────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 14 }}>Account Requests</div>
            {pendingRequests > 0 && (
              <span style={{ background: '#FEF9C3', color: '#D97706', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '3px 10px', border: '1px solid #FDE68A' }}>
                {pendingRequests} pending
              </span>
            )}
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Requested At</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{r.name}</td>
                    <td style={{ fontSize: 12.5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Phone size={12} color="#64748B" />{r.phone}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#475569' }}>{r.email}</td>
                    <td style={{ fontSize: 12, color: '#64748B' }}>{fmtDateTime(r.requestedAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.status === 'pending'  && <span className="badge badge-yellow" style={{ fontSize: 10.5 }}>Pending</span>}
                      {r.status === 'approved' && <span className="badge badge-green"  style={{ fontSize: 10.5 }}>Approved</span>}
                      {r.status === 'rejected' && <span className="badge badge-red"    style={{ fontSize: 10.5 }}>Rejected</span>}
                    </td>
                    <td>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleApproveRequest(r.id)}
                          >
                            <CheckCircle size={11} /> Approve
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleRejectRequest(r.id)}
                          >
                            <X size={11} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><UserCheck size={32} color="#CBD5E1" /></div>
                        <div className="empty-state-text">No account requests</div>
                        <div className="empty-state-sub">New parent account requests will appear here</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Print Gate Passes ────────────────────────── */}
      {activeTab === 'gatepasses' && (
        <>
          {/* Filters */}
          <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 160, fontSize: 13 }} value={gpCampus} onChange={e => setGpCampus(e.target.value)}>
              {CAMPUSES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: 150, fontSize: 13 }} value={gpClass} onChange={e => setGpClass(e.target.value)}>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: 140, fontSize: 13 }} value={gpSection} onChange={e => setGpSection(e.target.value)}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <button
              className="btn btn-teal"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={gpStudents.length === 0}
              onClick={() => printGatePass(gpStudents)}
            >
              <Printer size={14} /> Print All ({gpStudents.length})
            </button>
          </div>

          {/* Students Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Class / Section</th>
                    <th>Roll No.</th>
                    <th>Father Name</th>
                    <th>CNIC</th>
                    <th>Campus</th>
                    <th style={{ textAlign: 'center' }}>Gate Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {gpStudents.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{s.name}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{s.class} — {s.section}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{s.rollNo}</td>
                      <td style={{ fontSize: 12.5 }}>{s.fatherName}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#475569' }}>{s.cnic}</td>
                      <td style={{ fontSize: 12 }}>{s.campus}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => printGatePass([s])}
                        >
                          <Printer size={11} /> Print
                        </button>
                      </td>
                    </tr>
                  ))}
                  {gpStudents.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><Printer size={32} color="#CBD5E1" /></div>
                          <div className="empty-state-text">No students found</div>
                          <div className="empty-state-sub">Adjust campus, class or section filters</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Print Dues Report ────────────────────────── */}
      {activeTab === 'dues' && (
        <>
          {/* Filters */}
          <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 160, fontSize: 13 }} value={duesClass} onChange={e => setDuesClass(e.target.value)}>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: 160, fontSize: 13 }} value={duesMonth} onChange={e => setDuesMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
            <button
              className="btn btn-teal"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={duesStudents.length === 0}
              onClick={() => printDuesReport(duesStudents, duesMonth)}
            >
              <Printer size={14} /> Print Dues Report
            </button>
          </div>

          {/* Summary */}
          {duesStudents.length > 0 && (
            <div className="card" style={{ padding: '10px 16px', marginBottom: 12, background: '#FEF9C3', border: '1px solid #FDE68A', display: 'flex', gap: 20, alignItems: 'center' }}>
              <AlertCircle size={16} color="#D97706" />
              <span style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                {duesStudents.length} student{duesStudents.length !== 1 ? 's' : ''} with dues
              </span>
              <span style={{ fontSize: 13, color: '#92400E' }}>
                Total: <strong>Rs. {duesStudents.reduce((s, r) => s + (r.dueAmount || 0), 0).toLocaleString()}</strong>
              </span>
            </div>
          )}

          {/* Dues Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Father Name</th>
                    <th>Phone</th>
                    <th style={{ textAlign: 'right' }}>Due Amount</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {duesStudents.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{s.name}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{s.class}</span></td>
                      <td style={{ fontSize: 12.5 }}>{s.fatherName}</td>
                      <td style={{ fontSize: 12.5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Phone size={12} color="#64748B" />{s.phone}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: s.status === 'overdue' ? '#DC2626' : '#D97706', fontFamily: 'monospace' }}>
                        Rs. {(s.dueAmount || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {s.status === 'overdue'
                          ? <span className="badge badge-red"    style={{ fontSize: 10.5 }}>Overdue</span>
                          : <span className="badge badge-yellow" style={{ fontSize: 10.5 }}>Due</span>}
                      </td>
                    </tr>
                  ))}
                  {duesStudents.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><CreditCard size={32} color="#CBD5E1" /></div>
                          <div className="empty-state-text">No dues found</div>
                          <div className="empty-state-sub">All fees are cleared for the selected filters</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Connected Students ─────────────────────── */}
      {studentsModal && (
        <div className="modal-overlay" onClick={() => setStudentsModal(null)}>
          <div className="modal-content" style={{ maxWidth: 480, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1E3A5F' }}>Connected Students</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{studentsModal.name}</div>
              </div>
              <button className="modal-close" onClick={() => setStudentsModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              {(studentsModal.students || []).length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <div className="empty-state-icon"><Users size={28} color="#CBD5E1" /></div>
                  <div className="empty-state-text">No connected students</div>
                </div>
              ) : (
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Class / Section</th>
                      <th>Roll No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(studentsModal.students || []).map((s, idx) => (
                      <tr key={s.id || idx}>
                        <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{s.name}</td>
                        <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{s.class}</span></td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{s.rollNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setStudentsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
