import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/auth.store';
import ConfirmModal from '../../components/ConfirmModal';
import { money, amount, toPaisa, rupeesInput } from '../../utils/currency';
import { printHTML, printDocumentShell } from '../../utils/print';

const NAVY = '#1B2F6E';
const LIGHT_BG = '#f0f4ff';
const cardStyle = { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(27,47,110,0.08)', marginBottom: 20 };
const btnStyle = (color = NAVY) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const inputStyle = { padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Pakistan is UTC+5 all year. Today and the current month are Pakistan's,
// whatever zone this computer's clock is set to.
const PK_OFFSET_MS = 5 * 3600e3;
const pkToday = () => new Date(Date.now() + PK_OFFSET_MS).toISOString().slice(0, 10);
// A stored moment as the Pakistan day it fell on: "03/08/2026".
const pkDate = (d) => (d ? new Date(new Date(d).getTime() + PK_OFFSET_MS).toISOString().slice(0, 10).split('-').reverse().join('/') : '');
const ymdToDmy = (s) => (s ? s.split('-').reverse().join('/') : '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Screens whose figures a salary payment changes. They keep data for five
// minutes and do not reload on opening, so they are refreshed now. The
// expenses-today / bs-expenses lists are the Accountant Portal's.
const PAY_KEYS = ['payroll', 'payroll-summary', 'salary', 'expenses', 'expenses-today', 'expenses-all-today', 'bs-expenses', 'accounting-ledger', 'accounting-stats', 'dashboard', 'dash-admin-overview'];
const refreshAfterPay = (qc) => PAY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k], refetchType: 'all' }));
// 409: someone else paid this salary meanwhile. The rows on screen are out of date.
const paidElsewhere = (err) => err.response?.status === 409;

/* One month's salary slip. Payroll Manager and Salary both print this one.
   Amounts are stored in paisa and shown in rupees. */
export function printSalarySlip(record, school) {
  const staffName = record.staff?.name || record.staff?.user?.name || '-';
  const period = `${FULL_MONTH_NAMES[(record.month || 1) - 1]} ${record.year}`;
  const earnings = [
    ['Basic Salary', record.basic],
    ['Allowances', record.allowances],
    ['Bonus', record.bonus],
  ].filter(([, v]) => v > 0);
  const deductions = [
    ['Absence Deductions', record.deductionsAbsent],
    ['Late Deductions', record.deductionsLate],
    ['Loan Deduction', record.loanDeduction],
  ].filter(([, v]) => v > 0);
  const totalEarnings = earnings.reduce((s, [, v]) => s + v, 0);
  const totalDeductions = deductions.reduce((s, [, v]) => s + v, 0);
  const rows = (list, empty) => (list.length
    ? list.map(([label, v]) => `<tr><td>${label}</td><td class="num">${amount(v)}</td></tr>`).join('')
    : `<tr><td colspan="2" class="muted">${empty}</td></tr>`);
  const paid = record.status === 'issued';
  const contact = [school?.address, school?.city, school?.phone].filter(Boolean).join(' · ');

  const body = `
  <style>
    .slip{max-width:760px;margin:0 auto;padding:8px 4px;font-size:13px}
    .head{text-align:center;border-bottom:2px solid ${NAVY};padding-bottom:10px;margin-bottom:16px}
    .head h1{color:${NAVY};margin:0;font-size:22px}
    .head .contact{color:#6b7280;font-size:11.5px;margin-top:3px}
    .head h2{color:#374151;margin:8px 0 0;font-size:15px;font-weight:600}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;background:${LIGHT_BG};padding:12px 14px;border-radius:8px;margin-bottom:16px}
    .info span{color:#6b7280;margin-right:6px}
    .cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    h3{font-size:13px;margin:0 0 6px}
    .earn{color:#059669}.ded{color:#dc2626}
    table{margin-bottom:12px}
    th,td{border:1px solid #d1d5db;padding:7px 10px;text-align:left}
    th{background:${NAVY};color:#fff;font-weight:600}
    .num{text-align:right}
    .muted{text-align:center;color:#6b7280}
    .total td{font-weight:700}
    .net{background:${LIGHT_BG};padding:12px 14px;border-radius:8px;text-align:right;font-size:17px;font-weight:800;color:${NAVY};margin-top:4px}
    .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:56px}
    .sig div{text-align:center;border-top:1px solid #374151;padding-top:6px;font-size:11.5px;color:#6b7280}
  </style>
  <div class="slip">
    <div class="head">
      <h1>${esc(school?.name || 'School')}</h1>
      ${contact ? `<div class="contact">${esc(contact)}</div>` : ''}
      <h2>Salary Slip — ${period}</h2>
    </div>
    <div class="info">
      <div><span>Name:</span><b>${esc(staffName)}</b></div>
      <div><span>Designation:</span><b>${esc(record.staff?.designation || '-')}</b></div>
      <div><span>Employee Code:</span><b>${esc(record.staff?.empCode || '-')}</b></div>
      <div><span>Month:</span><b>${period}</b></div>
      <div><span>Status:</span><b>${paid ? `Paid${record.issueDate ? ` on ${pkDate(record.issueDate)}` : ''}` : 'Not paid yet'}</b></div>
    </div>
    <div class="cols">
      <div>
        <h3 class="earn">Earnings</h3>
        <table>
          <thead><tr><th>Component</th><th class="num">Amount (Rs)</th></tr></thead>
          <tbody>
            ${rows(earnings, 'No earnings')}
            <tr class="total"><td>Total Earnings</td><td class="num">${amount(totalEarnings)}</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <h3 class="ded">Deductions</h3>
        <table>
          <thead><tr><th>Component</th><th class="num">Amount (Rs)</th></tr></thead>
          <tbody>
            ${rows(deductions, 'No deductions')}
            <tr class="total"><td>Total Deductions</td><td class="num">${amount(totalDeductions)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="net">Net Salary: ${money(record.netSalary)}</div>
    <div class="sig"><div>Employee Signature</div><div>Principal / Authorized Signatory</div></div>
  </div>`;

  printHTML(
    printDocumentShell({ title: esc(`Salary Slip - ${staffName} - ${period}`), body }),
    { title: 'Salary Slip' },
  );
}

// The amounts an unpaid salary is made of, as typed in rupees.
const EDIT_FIELDS = [
  ['basic', 'Basic salary'],
  ['allowances', 'Allowances'],
  ['bonus', 'Bonus'],
  ['deductionsAbsent', 'Absence deduction'],
  ['deductionsLate', 'Late deduction'],
  ['loanDeduction', 'Loan deduction'],
];
const EARNINGS = ['basic', 'allowances', 'bonus'];

export default function PayrollPage() {
  const qc = useQueryClient();
  const school = useAuthStore((s) => s.school);
  const pkNow = new Date(Date.now() + PK_OFFSET_MS);
  const thisYear = pkNow.getUTCFullYear();
  const [selMonth, setSelMonth] = useState(pkNow.getUTCMonth() + 1);
  const [selYear, setSelYear] = useState(thisYear);
  // The day the money was really handed over. Pay and Pay All use it.
  const [paidOn, setPaidOn] = useState(pkToday);
  const [editing, setEditing] = useState(null); // { record, form: { basic: '25000', ... } }
  const [confirming, setConfirming] = useState(null); // 'generate' | 'payAll', waiting for a yes
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('payroll_visited'));
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const genTimerRef = useRef(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payroll', selMonth, selYear],
    queryFn: () => api.get('/payroll', { params: { month: selMonth, year: selYear } }).then(r => r.data.data || []),
  });

  const { data: summary = {} } = useQuery({
    queryKey: ['payroll-summary', selMonth, selYear],
    queryFn: () => api.get('/payroll/summary', { params: { month: selMonth, year: selYear } }).then(r => r.data.data || {}),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/payroll/generate', { month: selMonth, year: selYear }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
      qc.invalidateQueries({ queryKey: ['payroll-summary'] });
      qc.invalidateQueries({ queryKey: ['salary'], refetchType: 'all' });
      toast.success(res.data.message || `Generated: ${res.data.data?.generated || 0}`, { duration: 7000 });
      clearInterval(genTimerRef.current);
      setGenProgress(100);
      setTimeout(() => { setGenerating(false); setGenProgress(0); }, 600);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate');
      clearInterval(genTimerRef.current);
      setGenerating(false);
      setGenProgress(0);
    },
  });

  // Runs once the in-page confirmation says yes.
  const handleGenerate = () => {
    setGenerating(true);
    setGenProgress(0);
    let p = 0;
    genTimerRef.current = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 90) { p = 90; clearInterval(genTimerRef.current); }
      setGenProgress(Math.round(p));
    }, 200);
    generateMutation.mutate();
  };

  // A pay day in the future is refused by the server too; saying so here is quicker.
  const paidOnOk = () => {
    if (paidOn && paidOn > pkToday()) { toast.error('Paid on cannot be in the future.'); return false; }
    return true;
  };

  const payMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/pay/${id}`, { paidOn: paidOn || undefined }),
    onSuccess: () => { refreshAfterPay(qc); toast.success(`Marked as paid on ${ymdToDmy(paidOn || pkToday())}.`); },
    onError: (err) => {
      if (paidElsewhere(err)) refreshAfterPay(qc);
      toast.error(err.response?.data?.message || 'Failed to pay');
    },
  });

  const payAllMutation = useMutation({
    mutationFn: () => api.post('/payroll/pay-all', { month: selMonth, year: selYear, paidOn: paidOn || undefined }),
    onSuccess: (res) => {
      refreshAfterPay(qc);
      toast.success(`${res.data.data?.count || 0} salaries marked as paid on ${ymdToDmy(paidOn || pkToday())}.`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to pay all'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }) => api.put(`/payroll/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
      qc.invalidateQueries({ queryKey: ['payroll-summary'] });
      qc.invalidateQueries({ queryKey: ['salary'], refetchType: 'all' });
      toast.success('Salary updated.');
      setEditing(null);
    },
    onError: (err) => {
      // Paid meanwhile: it can no longer be edited, so close the form and show it as paid.
      if (paidElsewhere(err)) { refreshAfterPay(qc); setEditing(null); }
      toast.error(err.response?.data?.message || 'Failed to update');
    },
  });

  const openEdit = (r) => setEditing({
    record: r,
    form: Object.fromEntries(EDIT_FIELDS.map(([key]) => [key, rupeesInput(r[key])])),
  });

  // Typed rupees -> paisa; a blank box counts as 0.
  const editPaisa = editing
    ? Object.fromEntries(EDIT_FIELDS.map(([key]) => [key, toPaisa(editing.form[key])]))
    : {};
  const editBad = editing
    ? EDIT_FIELDS.some(([key]) => {
      const v = String(editing.form[key] ?? '').trim();
      return v !== '' && !(Number(v) >= 0);
    })
    : false;
  const editNet = Math.max(0, Object.entries(editPaisa).reduce((s, [k, v]) => s + (EARNINGS.includes(k) ? v : -v), 0));

  const saveEdit = () => {
    if (editBad) { toast.error('Amounts must be numbers of 0 or more.'); return; }
    editMutation.mutate({ id: editing.record.id, body: editPaisa });
  };

  const years = Array.from({ length: 7 }, (_, i) => thisYear - 5 + i);
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const periodLabel = `${FULL_MONTH_NAMES[selMonth - 1]} ${selYear}`;

  const summaryCards = [
    { label: 'Total Staff', val: summary.totalStaff || 0, color: NAVY },
    { label: 'Total Salary', val: money(summary.totalSalary), color: '#059669' },
    { label: 'Paid', val: summary.paid || 0, sub: money(summary.paidAmount), color: '#3b82f6' },
    { label: 'Pending', val: summary.pending || 0, sub: money((summary.totalSalary || 0) - (summary.paidAmount || 0)), color: '#f59e0b' },
  ];

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: 24 }}>

      {/* ── Payroll Onboarding Modal ── */}
      {showOnboarding && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',backdropFilter:'blur(8px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'rgba(255,255,255,0.97)',borderRadius:24,padding:36,maxWidth:440,width:'100%',textAlign:'center',animation:'scaleIn 0.3s ease-out',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
            <div style={{fontSize:64,marginBottom:12}}>💼</div>
            <h2 style={{fontSize:22,fontWeight:800,color:NAVY,margin:'0 0 8px'}}>Payroll Management</h2>
            <p style={{color:'#64748b',fontSize:13,lineHeight:1.7,margin:'0 0 20px'}}>Generate, review, and pay monthly salaries — all with one click.</p>
            <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:20,flexWrap:'wrap'}}>
              {['📊 Generate','👁 Review','💸 Pay','🧾 Slips'].map((step, i) => (
                <div key={step} style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{background:'#f0f4ff',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:600,color:NAVY}}>{step}</div>
                  {i < 3 && <span style={{color:'#94a3b8',fontSize:14}}>→</span>}
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:24}}>
              {[['Auto Calculate','Based on salary + attendance'],['Deductions','Late & absent cuts'],['Payslips','Print-ready slips']].map(([t,d]) => (
                <div key={t} style={{background:'#f8fafc',borderRadius:10,padding:'10px 8px',border:'1px solid #e2e8f0'}}>
                  <div style={{fontWeight:700,fontSize:12,color:NAVY,marginBottom:2}}>{t}</div>
                  <div style={{fontSize:10.5,color:'#64748b'}}>{d}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { localStorage.setItem('payroll_visited','1'); setShowOnboarding(false); }}
              style={{background:`linear-gradient(135deg,${NAVY},#0073b7)`,color:'white',border:'none',borderRadius:999,padding:'11px 32px',fontSize:14,fontWeight:700,cursor:'pointer',width:'100%'}}>
              Get Started →
            </button>
          </div>
        </div>
      )}

      {/* ── Edit an unpaid salary ── */}
      {editing && (
        <div onClick={() => !editMutation.isPending && setEditing(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Edit salary"
            style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Edit salary</h3>
            <p style={{ margin: '4px 0 16px', color: '#6b7280', fontSize: 13 }}>
              {editing.record.staff?.name || editing.record.staff?.user?.name || '-'} · {periodLabel}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {EDIT_FIELDS.map(([key, label]) => (
                <label key={key} style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  {label} (Rs)
                  <input type="number" min="0" step="any" inputMode="decimal" style={{ ...inputStyle, width: '100%', marginTop: 4 }}
                    value={editing.form[key]}
                    onChange={e => setEditing(ed => ({ ...ed, form: { ...ed.form, [key]: e.target.value } }))} />
                </label>
              ))}
            </div>
            <div style={{ marginTop: 16, background: LIGHT_BG, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: NAVY }}>
              <span>Net salary</span>
              <span>{editBad ? '—' : money(editNet)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button style={{ ...btnStyle('#fff'), color: '#374151', border: '1px solid #d1d5db' }} onClick={() => setEditing(null)} disabled={editMutation.isPending}>Cancel</button>
              <button style={btnStyle()} onClick={saveEdit} disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>💼 Payroll Manager</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Generate payroll · Review · Approve · Pay staff</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select aria-label="Month" style={inputStyle} value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select aria-label="Year" style={inputStyle} value={selYear} onChange={e => setSelYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button style={btnStyle('#6366f1')} onClick={() => setConfirming('generate')} disabled={generating || generateMutation.isPending}>
              {generating ? 'Generating...' : 'Generate Payroll'}
            </button>
            {pendingCount > 0 && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  Paid on
                  <input type="date" style={inputStyle} value={paidOn} max={pkToday()}
                    onChange={e => setPaidOn(e.target.value)} title="The day the salaries were actually paid" />
                </label>
                <button style={btnStyle('#059669')} disabled={payAllMutation.isPending}
                  onClick={() => { if (paidOnOk()) setConfirming('payAll'); }}>
                  {payAllMutation.isPending ? 'Processing...' : 'Pay All'}
                </button>
              </>
            )}
          </div>
        </div>

        {pendingCount > 0 && (
          <p style={{ margin: '-14px 0 18px', fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
            Pay and Pay All record each salary as paid on the "Paid on" day, and add it to Expenses on that day.
          </p>
        )}

        {/* Generate Progress Bar */}
        {generating && (
          <div style={{background:'#fff',borderRadius:10,padding:'14px 20px',marginBottom:16,boxShadow:'0 2px 8px rgba(27,47,110,0.08)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13,fontWeight:600,color:NAVY}}>
              <span>Generating payroll records...</span>
              <span>{genProgress}%</span>
            </div>
            <div style={{height:8,background:'#e2e8f0',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#6366f1,#0073b7)',borderRadius:4,width:`${genProgress}%`,transition:'width 0.3s ease'}} />
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {summaryCards.map(({ label, val, sub, color }) => (
            <div key={label} style={{ ...cardStyle, marginBottom: 0, textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
              {sub && <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: NAVY }}>{periodLabel} — Payroll</h3>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{records.length} records</span>
          </div>
          {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : records.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
              No payroll records for {periodLabel}.<br />
              <span style={{ fontSize: 13 }}>Click "Generate Payroll" to create records for staff who had joined by then.</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: NAVY, color: '#fff' }}>
                    {['Staff', 'Designation', 'Basic (Rs)', 'Allowances (Rs)', 'Bonus (Rs)', 'Deductions (Rs)', 'Net Salary (Rs)', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const totalDeductions = (r.deductionsAbsent || 0) + (r.deductionsLate || 0) + (r.loanDeduction || 0);
                    const paid = r.status === 'issued';
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.staff?.name || r.staff?.user?.name || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{r.staff?.designation || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>{amount(r.basic)}</td>
                        <td style={{ padding: '10px 12px' }}>{amount(r.allowances)}</td>
                        <td style={{ padding: '10px 12px' }}>{amount(r.bonus)}</td>
                        <td style={{ padding: '10px 12px', color: totalDeductions > 0 ? '#ef4444' : '#6b7280' }}>
                          {totalDeductions > 0 ? `-${amount(totalDeductions)}` : '0'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: NAVY }}>{amount(r.netSalary)}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            background: paid ? '#dcfce7' : '#fef9c3',
                            color: paid ? '#166534' : '#92400e',
                            borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                          }}>
                            {paid ? 'Paid' : 'Pending'}
                          </span>
                          {paid && r.issueDate && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>on {pkDate(r.issueDate)}</div>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {r.status === 'pending' && (
                              <>
                                <button style={{ ...btnStyle('#059669'), padding: '4px 10px', fontSize: 11 }}
                                  onClick={() => { if (paidOnOk()) payMutation.mutate(r.id); }} disabled={payMutation.isPending}
                                  title={`Paid on ${ymdToDmy(paidOn || pkToday())}`}>Pay</button>
                                <button style={{ ...btnStyle('#0ea5e9'), padding: '4px 10px', fontSize: 11 }} onClick={() => openEdit(r)}>Edit</button>
                              </>
                            )}
                            <button style={{ ...btnStyle('#6366f1'), padding: '4px 10px', fontSize: 11 }} onClick={() => printSalarySlip(r, school)}>Slip</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirming}
        title={confirming === 'payAll' ? `Pay all ${pendingCount} pending salaries?` : `Generate payroll for ${periodLabel}?`}
        message={confirming === 'payAll'
          ? `${periodLabel}, paid on ${ymdToDmy(paidOn || pkToday())}. Each salary is marked paid and added to Expenses on that day.`
          : 'A salary record is made for each active staff member who had joined by then. Records already made for this month stay as they are.'}
        confirmLabel={confirming === 'payAll' ? 'Pay All' : 'Generate'}
        onConfirm={() => {
          const what = confirming;
          setConfirming(null);
          if (what === 'payAll') payAllMutation.mutate(); else handleGenerate();
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
