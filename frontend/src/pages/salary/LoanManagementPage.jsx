import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CreditCard, Plus, CheckCircle, X, Printer, DollarSign } from 'lucide-react';
import api from '../../api/client';

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString();

const emptyForm = { staffId: '', loanAmount: '', installments: '1', notes: '' };

export default function LoanManagementPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [filter, setFilter] = useState('All');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-for-loans'],
    queryFn: () => api.get('/staff').then((r) => r.data.data || []),
  });

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => api.get('/loans').then((r) => r.data.data || []),
  });

  const staffName = (staffId) => staff.find((s) => s.id === staffId)?.name || `Staff #${staffId}`;

  const createLoan = useMutation({
    mutationFn: (data) => api.post('/loans', data),
    onSuccess: () => {
      toast.success('Loan recorded');
      qc.invalidateQueries(['loans']);
      setForm(emptyForm);
      setFormErrors({});
      setShowForm(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save loan'),
  });

  const payInstallment = useMutation({
    mutationFn: (id) => api.post(`/loans/${id}/pay-installment`),
    onSuccess: () => { toast.success('Installment recorded'); qc.invalidateQueries(['loans']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not record installment'),
  });

  const activeLoans = loans.filter((l) => l.status === 'active');
  const completedLoans = loans.filter((l) => l.status === 'completed');
  const activeAmount = activeLoans.reduce((s, l) => s + (l.remaining || 0), 0);

  const STATUS_TABS = ['All', 'active', 'completed', 'cancelled'];
  const filtered = filter === 'All' ? loans : loans.filter((l) => l.status === filter);

  const validate = () => {
    const errs = {};
    if (!form.staffId) errs.staffId = 'Select a staff member';
    if (!form.loanAmount || isNaN(form.loanAmount) || Number(form.loanAmount) <= 0) errs.loanAmount = 'Enter a valid amount';
    if (!form.installments || isNaN(form.installments) || Number(form.installments) < 1) errs.installments = 'Enter at least 1';
    return errs;
  };

  const handleAdd = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    createLoan.mutate({
      staffId: parseInt(form.staffId),
      loanAmount: parseInt(form.loanAmount),
      installments: parseInt(form.installments),
      notes: form.notes.trim() || undefined,
    });
  };

  const handlePrint = () => {
    const rows = filtered.map((l) => `<tr>
        <td>${staffName(l.staffId)}</td>
        <td>${money(l.loanAmount)}</td>
        <td>${money(l.monthlyInstallment)}</td>
        <td>${l.paidInstallments}/${l.installments}</td>
        <td>${new Date(l.loanDate).toLocaleDateString('en-PK')}</td>
        <td>${l.status}</td>
        <td>${money(l.remaining)}</td>
      </tr>`).join('');
    const w = window.open('', '_blank');
    if (!w) { toast.error('Pop-up blocked — please allow pop-ups to print.'); return; }
    w.document.write(`
      <html><head><title>Loans Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px}
        h2{color:#1E3A5F;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        th{background:#1E3A5F;color:#fff;padding:8px 12px;text-align:left;font-size:13px}
        td{padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px}
        tr:nth-child(even) td{background:#F8FAFC}
      </style>
      </head><body>
      <h2>IlmForge — Staff Loans Report</h2>
      <p style="color:#64748B;font-size:13px">Filter: <strong>${filter}</strong> &nbsp;|&nbsp; Printed: ${new Date().toLocaleString()}</p>
      <table><thead><tr>
        <th>Staff Name</th><th>Loan Amount</th><th>Monthly Installment</th>
        <th>Installments Paid</th><th>Loan Date</th><th>Status</th><th>Remaining</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    w.document.close();
    w.print();
  };

  const badgeStyle = (status) => {
    if (status === 'active') return { background: '#DCFCE7', color: '#15803D' };
    if (status === 'completed') return { background: '#E0F2FE', color: '#0369A1' };
    return { background: '#FEE2E2', color: '#B91C1C' };
  };

  return (
    <div className="page-content fade-in">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={22} color="#1E3A5F" /> Loan Management
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Manage staff loans and monthly installment deductions
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

      <div className="stats-grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #1E3A5F' }}>
          <div className="stat-icon" style={{ background: '#EFF6FF' }}><CreditCard size={20} color="#1E3A5F" /></div>
          <div className="stat-content">
            <div className="stat-label">Active Loans</div>
            <div className="stat-value" style={{ color: '#1E3A5F' }}>{activeLoans.length}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Outstanding: {money(activeAmount)}</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #15803D' }}>
          <div className="stat-icon" style={{ background: '#DCFCE7' }}><CheckCircle size={20} color="#15803D" /></div>
          <div className="stat-content">
            <div className="stat-label">Completed Loans</div>
            <div className="stat-value" style={{ color: '#15803D' }}>{completedLoans.length}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Fully cleared</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div className="stat-icon" style={{ background: '#FEF9C3' }}><DollarSign size={20} color="#D97706" /></div>
          <div className="stat-content">
            <div className="stat-label">Total Loans</div>
            <div className="stat-value" style={{ color: '#D97706' }}>{loans.length}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>All-time records</div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #CBD5E1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#1E3A5F', fontWeight: 600 }}>
              <Plus size={16} style={{ marginRight: 6 }} />New Loan
            </h3>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <div className="card-body">
            <div className="form-grid-3" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Staff Member *</label>
                <select className={`form-select${formErrors.staffId ? ' input-error' : ''}`}
                  value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                  <option value="">Select staff...</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {formErrors.staffId && <span className="form-error">{formErrors.staffId}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Loan Amount (Rs.) *</label>
                <input className={`form-input${formErrors.loanAmount ? ' input-error' : ''}`} type="number" min="1"
                  placeholder="e.g. 50000" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })} />
                {formErrors.loanAmount && <span className="form-error">{formErrors.loanAmount}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Number of Installments *</label>
                <input className={`form-input${formErrors.installments ? ' input-error' : ''}`} type="number" min="1"
                  placeholder="e.g. 10" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} />
                {formErrors.installments && <span className="form-error">{formErrors.installments}</span>}
                {form.loanAmount > 0 && form.installments > 0 && (
                  <span style={{ fontSize: 11.5, color: '#64748B' }}>
                    ≈ {money(Math.ceil(form.loanAmount / form.installments))} / month
                  </span>
                )}
              </div>
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="Reason for loan"
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={createLoan.isPending}>
                <Plus size={15} /> Save Loan
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {STATUS_TABS.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            style={{
              padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: filter === t ? 600 : 400,
              background: filter === t ? '#1E3A5F' : '#F1F5F9',
              color: filter === t ? '#fff' : '#475569', textTransform: 'capitalize',
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Name</th><th>Loan Amount</th><th>Monthly Installment</th>
                <th>Progress</th><th>Loan Date</th><th>Status</th><th>Remaining</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0' }}>Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 14 }}>No loan records found.</td></tr>
              )}
              {filtered.map((loan) => (
                <tr key={loan.id}>
                  <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{staffName(loan.staffId)}</td>
                  <td>{money(loan.loanAmount)}</td>
                  <td>{money(loan.monthlyInstallment)}</td>
                  <td>{loan.paidInstallments}/{loan.installments}</td>
                  <td>{new Date(loan.loanDate).toLocaleDateString('en-PK')}</td>
                  <td>
                    <span style={{ ...badgeStyle(loan.status), padding: '3px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600, display: 'inline-block', textTransform: 'capitalize' }}>
                      {loan.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: loan.remaining === 0 ? '#15803D' : '#DC2626', fontWeight: 600 }}>{money(loan.remaining)}</span>
                  </td>
                  <td>
                    {loan.status === 'active' && (
                      <button className="btn btn-teal" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => payInstallment.mutate(loan.id)} disabled={payInstallment.isPending}
                        title="Record this month's installment payment">
                        <DollarSign size={13} /> Record Installment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing {filtered.length} of {loans.length} records</span>
          <span>Total Outstanding: <strong style={{ color: '#1E3A5F' }}>{money(filtered.reduce((s, l) => s + (l.remaining || 0), 0))}</strong></span>
        </div>
      </div>
    </div>
  );
}
