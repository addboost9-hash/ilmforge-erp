import { useState, useEffect } from 'react';
import { CreditCard, Plus, CheckCircle, X, Printer, DollarSign } from 'lucide-react';

const STORAGE_KEY = 'ilmforge_loans';
const money = v => 'Rs. ' + Number(v || 0).toLocaleString();

const SAMPLE_LOANS = [
  {
    id: 1,
    staffName: 'Ahmed Raza',
    loanAmount: 50000,
    monthlyDeduction: 5000,
    reason: 'Home renovation',
    applyDate: '2026-01-15',
    status: 'Approved',
    remainingBalance: 35000,
    payments: [
      { date: '2026-02-01', amount: 5000 },
      { date: '2026-03-01', amount: 5000 },
      { date: '2026-04-01', amount: 5000 },
    ],
  },
  {
    id: 2,
    staffName: 'Fatima Malik',
    loanAmount: 30000,
    monthlyDeduction: 3000,
    reason: 'Medical emergency',
    applyDate: '2026-02-10',
    status: 'Pending',
    remainingBalance: 30000,
    payments: [],
  },
  {
    id: 3,
    staffName: 'Usman Khan',
    loanAmount: 20000,
    monthlyDeduction: 4000,
    reason: 'Education fees',
    applyDate: '2025-10-05',
    status: 'Paid',
    remainingBalance: 0,
    payments: [
      { date: '2025-11-01', amount: 4000 },
      { date: '2025-12-01', amount: 4000 },
      { date: '2026-01-01', amount: 4000 },
      { date: '2026-02-01', amount: 4000 },
      { date: '2026-03-01', amount: 4000 },
    ],
  },
];

const emptyForm = {
  staffName: '',
  loanAmount: '',
  monthlyDeduction: '',
  reason: '',
  applyDate: new Date().toISOString().slice(0, 10),
};

export default function LoanManagementPage() {
  const [loans, setLoans] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return SAMPLE_LOANS;
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [filter, setFilter] = useState('All');
  const [expandedPayments, setExpandedPayments] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
  }, [loans]);

  const persist = updated => setLoans(updated);

  /* ---- Stats ---- */
  const activeLoans = loans.filter(l => l.status === 'Approved');
  const paidLoans = loans.filter(l => l.status === 'Paid');
  const pendingLoans = loans.filter(l => l.status === 'Pending');
  const activeAmount = activeLoans.reduce((s, l) => s + (l.remainingBalance || 0), 0);

  /* ---- Filtered list ---- */
  const filtered = filter === 'All' ? loans : loans.filter(l => l.status === filter);

  /* ---- Form validation ---- */
  const validate = () => {
    const errs = {};
    if (!form.staffName.trim()) errs.staffName = 'Required';
    if (!form.loanAmount || isNaN(form.loanAmount) || Number(form.loanAmount) <= 0) errs.loanAmount = 'Enter valid amount';
    if (!form.monthlyDeduction || isNaN(form.monthlyDeduction) || Number(form.monthlyDeduction) <= 0) errs.monthlyDeduction = 'Enter valid amount';
    if (Number(form.monthlyDeduction) > Number(form.loanAmount)) errs.monthlyDeduction = 'Cannot exceed loan amount';
    if (!form.reason.trim()) errs.reason = 'Required';
    if (!form.applyDate) errs.applyDate = 'Required';
    return errs;
  };

  const handleAdd = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const newLoan = {
      id: Date.now(),
      staffName: form.staffName.trim(),
      loanAmount: Number(form.loanAmount),
      monthlyDeduction: Number(form.monthlyDeduction),
      reason: form.reason.trim(),
      applyDate: form.applyDate,
      status: 'Pending',
      remainingBalance: Number(form.loanAmount),
      payments: [],
    };
    persist([...loans, newLoan]);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const handleApprove = id => {
    persist(loans.map(l => l.id === id ? { ...l, status: 'Approved' } : l));
  };

  const handleMarkPayment = id => {
    persist(loans.map(l => {
      if (l.id !== id) return l;
      const newRemaining = Math.max(0, l.remainingBalance - l.monthlyDeduction);
      const payment = { date: new Date().toISOString().slice(0, 10), amount: Math.min(l.monthlyDeduction, l.remainingBalance) };
      return {
        ...l,
        remainingBalance: newRemaining,
        status: newRemaining === 0 ? 'Paid' : 'Approved',
        payments: [...l.payments, payment],
      };
    }));
  };

  const handleDelete = id => {
    if (!window.confirm('Delete this loan record?')) return;
    persist(loans.filter(l => l.id !== id));
    if (expandedPayments === id) setExpandedPayments(null);
  };

  const handlePrint = () => {
    const rows = filtered.map(l =>
      `<tr>
        <td>${l.staffName}</td>
        <td>${money(l.loanAmount)}</td>
        <td>${money(l.monthlyDeduction)}</td>
        <td>${l.reason}</td>
        <td>${l.applyDate}</td>
        <td>${l.status}</td>
        <td>${money(l.remainingBalance)}</td>
      </tr>`
    ).join('');
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Loans Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px}
        h2{color:#1E3A5F;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        th{background:#1E3A5F;color:#fff;padding:8px 12px;text-align:left;font-size:13px}
        td{padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px}
        tr:nth-child(even) td{background:#F8FAFC}
        .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600}
      </style>
      </head><body>
      <h2>IlmForge — Staff Loans Report</h2>
      <p style="color:#64748B;font-size:13px">Filter: <strong>${filter}</strong> &nbsp;|&nbsp; Printed: ${new Date().toLocaleString()}</p>
      <table><thead><tr>
        <th>Staff Name</th><th>Loan Amount</th><th>Monthly Deduction</th>
        <th>Reason</th><th>Applied Date</th><th>Status</th><th>Remaining</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    w.document.close();
    w.print();
  };

  /* ---- Status badge style ---- */
  const badgeStyle = status => {
    if (status === 'Approved') return { background: '#DCFCE7', color: '#15803D' };
    if (status === 'Paid') return { background: '#E0F2FE', color: '#0369A1' };
    return { background: '#FEF9C3', color: '#854D0E' };
  };

  const tabs = ['All', 'Pending', 'Approved', 'Paid'];

  return (
    <div className="page-content fade-in">

      {/* ---- Header ---- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={22} color="#1E3A5F" /> Loan Management
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Manage staff loan applications, approvals and monthly deductions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={handlePrint}>
            <Printer size={15} /> Print Report
          </button>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormErrors({}); setForm(emptyForm); }}>
            <Plus size={15} /> Add Loan
          </button>
        </div>
      </div>

      {/* ---- Stats ---- */}
      <div className="stats-grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #1E3A5F' }}>
          <div className="stat-icon" style={{ background: '#EFF6FF' }}>
            <CreditCard size={20} color="#1E3A5F" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Active Loans</div>
            <div className="stat-value" style={{ color: '#1E3A5F' }}>{activeLoans.length}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Outstanding: {money(activeAmount)}</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #15803D' }}>
          <div className="stat-icon" style={{ background: '#DCFCE7' }}>
            <CheckCircle size={20} color="#15803D" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Paid Loans</div>
            <div className="stat-value" style={{ color: '#15803D' }}>{paidLoans.length}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Fully cleared</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div className="stat-icon" style={{ background: '#FEF9C3' }}>
            <DollarSign size={20} color="#D97706" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending Applications</div>
            <div className="stat-value" style={{ color: '#D97706' }}>{pendingLoans.length}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Awaiting approval</div>
          </div>
        </div>
      </div>

      {/* ---- Add Loan Form ---- */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #CBD5E1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#1E3A5F', fontWeight: 600 }}>
              <Plus size={16} style={{ marginRight: 6 }} />New Loan Application
            </h3>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="card-body">
            <div className="form-grid-3" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Staff Name *</label>
                <input
                  className={`form-input${formErrors.staffName ? ' input-error' : ''}`}
                  placeholder="Full name"
                  value={form.staffName}
                  onChange={e => setForm({ ...form, staffName: e.target.value })}
                />
                {formErrors.staffName && <span className="form-error">{formErrors.staffName}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Loan Amount (Rs.) *</label>
                <input
                  className={`form-input${formErrors.loanAmount ? ' input-error' : ''}`}
                  type="number"
                  min="1"
                  placeholder="e.g. 50000"
                  value={form.loanAmount}
                  onChange={e => setForm({ ...form, loanAmount: e.target.value })}
                />
                {formErrors.loanAmount && <span className="form-error">{formErrors.loanAmount}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Deduction (Rs.) *</label>
                <input
                  className={`form-input${formErrors.monthlyDeduction ? ' input-error' : ''}`}
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={form.monthlyDeduction}
                  onChange={e => setForm({ ...form, monthlyDeduction: e.target.value })}
                />
                {formErrors.monthlyDeduction && <span className="form-error">{formErrors.monthlyDeduction}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Reason *</label>
                <input
                  className={`form-input${formErrors.reason ? ' input-error' : ''}`}
                  placeholder="Reason for loan"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                />
                {formErrors.reason && <span className="form-error">{formErrors.reason}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Apply Date *</label>
                <input
                  className={`form-input${formErrors.applyDate ? ' input-error' : ''}`}
                  type="date"
                  value={form.applyDate}
                  onChange={e => setForm({ ...form, applyDate: e.target.value })}
                />
                {formErrors.applyDate && <span className="form-error">{formErrors.applyDate}</span>}
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAdd}>
                <Plus size={15} /> Submit Application
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Filter Tabs ---- */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: '6px 18px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: filter === t ? 600 : 400,
              background: filter === t ? '#1E3A5F' : '#F1F5F9',
              color: filter === t ? '#fff' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            {t}
            {t !== 'All' && (
              <span style={{
                marginLeft: 6,
                background: filter === t ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
                color: filter === t ? '#fff' : '#475569',
                borderRadius: 9999,
                padding: '1px 7px',
                fontSize: 11,
              }}>
                {loans.filter(l => l.status === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Table ---- */}
      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Loan Amount</th>
                <th>Monthly Deduction</th>
                <th>Reason</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th>Remaining Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 14 }}>
                    No loan records found.
                  </td>
                </tr>
              )}
              {filtered.map(loan => (
                <>
                  <tr key={loan.id}>
                    <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{loan.staffName}</td>
                    <td>{money(loan.loanAmount)}</td>
                    <td>{money(loan.monthlyDeduction)}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={loan.reason}>{loan.reason}</td>
                    <td>{loan.applyDate}</td>
                    <td>
                      <span style={{
                        ...badgeStyle(loan.status),
                        padding: '3px 10px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        {loan.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: loan.remainingBalance === 0 ? '#15803D' : '#DC2626', fontWeight: 600 }}>
                        {money(loan.remainingBalance)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {loan.status === 'Pending' && (
                          <button
                            className="btn btn-success"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handleApprove(loan.id)}
                            title="Approve Loan"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        )}
                        {loan.status === 'Approved' && (
                          <button
                            className="btn btn-teal"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handleMarkPayment(loan.id)}
                            title="Mark Monthly Payment"
                          >
                            <DollarSign size={13} /> Payment
                          </button>
                        )}
                        {loan.payments.length > 0 && (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setExpandedPayments(expandedPayments === loan.id ? null : loan.id)}
                            title="View Payment History"
                          >
                            {expandedPayments === loan.id ? 'Hide' : 'History'}
                          </button>
                        )}
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(loan.id)}
                          title="Delete Loan"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedPayments === loan.id && (
                    <tr key={`hist-${loan.id}`}>
                      <td colSpan={8} style={{ background: '#F8FAFC', padding: '0 16px 12px 16px' }}>
                        <div style={{ padding: '10px 0 4px', fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>
                          Payment History — {loan.staffName}
                        </div>
                        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#64748B', fontWeight: 600 }}>#</th>
                              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#64748B', fontWeight: 600 }}>Date</th>
                              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#64748B', fontWeight: 600 }}>Amount Paid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loan.payments.map((p, i) => (
                              <tr key={i} style={{ borderTop: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '4px 8px', color: '#94A3B8' }}>{i + 1}</td>
                                <td style={{ padding: '4px 8px' }}>{p.date}</td>
                                <td style={{ padding: '4px 8px', color: '#15803D', fontWeight: 600 }}>{money(p.amount)}</td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid #CBD5E1' }}>
                              <td colSpan={2} style={{ padding: '6px 8px', fontWeight: 600, color: '#1E3A5F' }}>Total Paid</td>
                              <td style={{ padding: '6px 8px', fontWeight: 700, color: '#1E3A5F' }}>
                                {money(loan.payments.reduce((s, p) => s + p.amount, 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing {filtered.length} of {loans.length} records</span>
          <span>
            Total Outstanding:{' '}
            <strong style={{ color: '#1E3A5F' }}>
              {money(filtered.reduce((s, l) => s + (l.remainingBalance || 0), 0))}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
