import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

const NAVY = '#1B2F6E';
const LIGHT_BG = '#f0f4ff';
const cardStyle = { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(27,47,110,0.08)', marginBottom: 20 };
const btnStyle = (color = NAVY) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const inputStyle = { padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function printSlip(record, schoolName) {
  const earnings = [
    { label: 'Basic Salary', amount: record.basic || 0 },
    { label: 'Allowances', amount: record.allowances || 0 },
    { label: 'Bonus', amount: record.bonus || 0 },
  ].filter(e => e.amount > 0);

  const deductions = [
    { label: 'Absence Deductions', amount: record.deductionsAbsent || 0 },
    { label: 'Late Deductions', amount: record.deductionsLate || 0 },
    { label: 'Loan Deduction', amount: record.loanDeduction || 0 },
  ].filter(d => d.amount > 0);

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Salary Slip</title>
  <style>
    body{font-family:Arial,sans-serif;margin:30px;color:#1a1a1a}
    h1{color:#1B2F6E;text-align:center;margin-bottom:4px}
    h3{text-align:center;color:#374151;margin-top:4px}
    .header{text-align:center;border-bottom:2px solid #1B2F6E;padding-bottom:12px;margin-bottom:20px}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;background:#f0f4ff;padding:14px;border-radius:8px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
    th,td{border:1px solid #d1d5db;padding:8px 12px}th{background:#1B2F6E;color:#fff}
    .total{font-weight:700;font-size:16px}
    .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
    .sig-box{text-align:center;border-top:1px solid #374151;padding-top:8px;font-size:12px;color:#6b7280}
    @media print{button{display:none}}
  </style></head>
  <body>
    <div class="header">
      <h1>${schoolName || 'School Name'}</h1>
      <h3>Salary Slip — ${FULL_MONTH_NAMES[(record.month || 1) - 1]} ${record.year}</h3>
    </div>
    <div class="info">
      <div><strong>Name:</strong> ${record.staff?.name || record.staff?.user?.name || '-'}</div>
      <div><strong>Designation:</strong> ${record.staff?.designation || '-'}</div>
      <div><strong>Emp Code:</strong> ${record.staff?.empCode || '-'}</div>
      <div><strong>Month/Year:</strong> ${FULL_MONTH_NAMES[(record.month || 1) - 1]} ${record.year}</div>
      <div><strong>Status:</strong> ${record.status === 'issued' ? 'Paid' : 'Pending'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <h4 style="color:#059669">Earnings</h4>
        <table>
          <thead><tr><th>Component</th><th>Amount (Rs)</th></tr></thead>
          <tbody>
            ${earnings.map(e => `<tr><td>${e.label}</td><td style="text-align:right">${e.amount.toLocaleString('en-PK')}</td></tr>`).join('')}
            <tr class="total"><td><strong>Total Earnings</strong></td><td style="text-align:right"><strong>${totalEarnings.toLocaleString('en-PK')}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <h4 style="color:#ef4444">Deductions</h4>
        <table>
          <thead><tr><th>Component</th><th>Amount (Rs)</th></tr></thead>
          <tbody>
            ${deductions.length ? deductions.map(d => `<tr><td>${d.label}</td><td style="text-align:right">${d.amount.toLocaleString('en-PK')}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:#6b7280">No deductions</td></tr>'}
            <tr class="total"><td><strong>Total Deductions</strong></td><td style="text-align:right"><strong>${totalDeductions.toLocaleString('en-PK')}</strong></td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div style="background:#f0f4ff;padding:14px;border-radius:8px;text-align:right;font-size:18px;font-weight:800;color:#1B2F6E">
      Net Salary: Rs ${(record.netSalary || 0).toLocaleString('en-PK')}
    </div>
    <div class="sig">
      <div class="sig-box">Employee Signature</div>
      <div class="sig-box">Principal / Authorized Signatory</div>
    </div>
    <button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#1B2F6E;color:#fff;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600">Print</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

export default function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [selMonth, setSelMonth] = useState(7);
  const [selYear, setSelYear] = useState(2026);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payroll', selMonth, selYear],
    queryFn: () => api.get('/payroll', { params: { month: selMonth, year: selYear } }).then(r => r.data.data || []),
  });

  const { data: summary = {} } = useQuery({
    queryKey: ['payroll-summary', selMonth, selYear],
    queryFn: () => api.get('/payroll/summary', { params: { month: selMonth, year: selYear } }).then(r => r.data.data || {}),
  });

  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/payroll/generate', { month: selMonth, year: selYear }),
    onSuccess: (res) => {
      qc.invalidateQueries(['payroll']);
      qc.invalidateQueries(['payroll-summary']);
      toast.success(`Generated: ${res.data.data?.generated || 0}, Skipped: ${res.data.data?.skipped || 0}`);
    },
    onError: () => toast.error('Failed to generate'),
  });

  const payMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/pay/${id}`),
    onSuccess: () => { qc.invalidateQueries(['payroll']); qc.invalidateQueries(['payroll-summary']); toast.success('Marked as paid!'); },
    onError: () => toast.error('Failed to pay'),
  });

  const payAllMutation = useMutation({
    mutationFn: () => api.post('/payroll/pay-all', { month: selMonth, year: selYear }),
    onSuccess: (res) => {
      qc.invalidateQueries(['payroll']);
      qc.invalidateQueries(['payroll-summary']);
      toast.success(`${res.data.data?.count || 0} records marked as paid!`);
    },
    onError: () => toast.error('Failed to pay all'),
  });

  const years = Array.from({ length: 5 }, (_, i) => 2024 + i);

  const summaryCards = [
    { label: 'Total Staff', val: summary.totalStaff || 0, color: NAVY },
    { label: 'Total Salary', val: `Rs ${(summary.totalSalary || 0).toLocaleString('en-PK')}`, color: '#059669' },
    { label: 'Paid', val: summary.paid || 0, color: '#3b82f6' },
    { label: 'Pending', val: summary.pending || 0, color: '#f59e0b' },
  ];

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>Payroll Management</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Generate and manage monthly salary records</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={inputStyle} value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select style={inputStyle} value={selYear} onChange={e => setSelYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button style={btnStyle('#6366f1')} onClick={() => { if (confirm('Generate payroll?')) generateMutation.mutate(); }} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? 'Generating...' : 'Generate Payroll'}
            </button>
            {records.filter(r => r.status === 'pending').length > 0 && (
              <button style={btnStyle('#059669')} onClick={() => { if (confirm('Pay all pending?')) payAllMutation.mutate(); }} disabled={payAllMutation.isPending}>
                {payAllMutation.isPending ? 'Processing...' : 'Pay All'}
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {summaryCards.map(({ label, val, color }) => (
            <div key={label} style={{ ...cardStyle, marginBottom: 0, textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: NAVY }}>{FULL_MONTH_NAMES[selMonth - 1]} {selYear} — Payroll</h3>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{records.length} records</span>
          </div>
          {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : records.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
              No payroll records for {FULL_MONTH_NAMES[selMonth - 1]} {selYear}.<br />
              <span style={{ fontSize: 13 }}>Click "Generate Payroll" to create records for all active staff.</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: NAVY, color: '#fff' }}>
                    {['Staff', 'Designation', 'Basic', 'Allowances', 'Bonus', 'Deductions', 'Net Salary', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const totalDeductions = (r.deductionsAbsent || 0) + (r.deductionsLate || 0) + (r.loanDeduction || 0);
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.staff?.name || r.staff?.user?.name || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{r.staff?.designation || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>{(r.basic || 0).toLocaleString('en-PK')}</td>
                        <td style={{ padding: '10px 12px' }}>{(r.allowances || 0).toLocaleString('en-PK')}</td>
                        <td style={{ padding: '10px 12px' }}>{(r.bonus || 0).toLocaleString('en-PK')}</td>
                        <td style={{ padding: '10px 12px', color: totalDeductions > 0 ? '#ef4444' : '#6b7280' }}>
                          {totalDeductions > 0 ? `-${totalDeductions.toLocaleString('en-PK')}` : '0'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: NAVY }}>{(r.netSalary || 0).toLocaleString('en-PK')}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            background: r.status === 'issued' ? '#dcfce7' : '#fef9c3',
                            color: r.status === 'issued' ? '#166534' : '#92400e',
                            borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                          }}>
                            {r.status === 'issued' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
                          {r.status === 'pending' && (
                            <button style={{ ...btnStyle('#059669'), padding: '4px 10px', fontSize: 11 }} onClick={() => payMutation.mutate(r.id)} disabled={payMutation.isPending}>Pay</button>
                          )}
                          <button style={{ ...btnStyle('#6366f1'), padding: '4px 10px', fontSize: 11 }} onClick={() => printSlip(r, school?.name)}>Slip</button>
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
    </div>
  );
}
