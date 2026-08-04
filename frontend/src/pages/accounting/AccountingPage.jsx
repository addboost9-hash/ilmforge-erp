import { useState, useEffect, useRef } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart2, Printer,
  Plus, Trash2, Users, CheckCircle, AlertTriangle
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const today = () => new Date().toISOString().split('T')[0];
const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
};
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

// ─── seed data ───────────────────────────────────────────────────────────────
const SEED_PAYMENTS = [
  { id: 1, roll: '101', student: 'Ali Hassan', feeTitle: 'Monthly Fee', amount: 3500, date: today() },
  { id: 2, roll: '102', student: 'Sara Khan', feeTitle: 'Admission Fee', amount: 5000, date: today() },
  { id: 3, roll: '103', student: 'Usman Raza', feeTitle: 'Monthly Fee', amount: 3500, date: yesterday() },
  { id: 4, roll: '104', student: 'Fatima Bibi', feeTitle: 'Exam Fee', amount: 1200, date: yesterday() },
];

const SEED_EXPENSES = [
  { id: 1, title: 'Electricity Bill', category: 'Utilities', amount: 8000, date: today(), note: 'June bill' },
  { id: 2, title: 'Teacher Salaries', category: 'Staff Salary', amount: 120000, date: today(), note: '' },
  { id: 3, title: 'Stationery Purchase', category: 'Stationery', amount: 2500, date: yesterday(), note: 'Exam paper' },
];

const SEED_ACCOUNTANTS = [
  { id: 1, name: 'Muhammad Tariq', email: 'tariq@school.com', campus: 'Main Campus', role: 'Head Accountant', webLogin: true, mobileLogin: false, permissions: ['balance-sheet', 'expenses', 'reports'] },
  { id: 2, name: 'Ayesha Siddiqui', email: 'ayesha@school.com', campus: 'Branch A', role: 'Accountant', webLogin: true, mobileLogin: true, permissions: ['expenses'] },
];

const SEED_SETTLEMENTS = [];

const EXPENSE_CATEGORIES = ['Staff Salary', 'Rent', 'Utilities', 'Maintenance', 'Transport', 'Stationery', 'Other'];

const MONTHLY_REPORT = [
  { month: 'Jan', income: 185000, expense: 140000 },
  { month: 'Feb', income: 192000, expense: 135000 },
  { month: 'Mar', income: 198000, expense: 150000 },
  { month: 'Apr', income: 175000, expense: 128000 },
  { month: 'May', income: 210000, expense: 160000 },
  { month: 'Jun', income: 205000, expense: 145000 },
];

// ─── storage helpers ──────────────────────────────────────────────────────────
const load = (key, seed) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed;
};
const save = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

// ─── small components ─────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon: Icon, sub }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '16px 20px', position: 'relative', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ position: 'absolute', right: 14, top: 12, opacity: 0.18 }}><Icon size={44} color="#fff" /></div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? '#0D9488' : '#CBD5E1',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 20 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }} />
    </div>
  );
}

function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, padding: '0 8px' }}>
      {data.map(d => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', justifyContent: 'center' }}>
            <div
              title={`Income: ${fmt(d.income)}`}
              style={{
                flex: 1, background: 'linear-gradient(180deg,#0D9488,#0F766E)',
                borderRadius: '4px 4px 0 0',
                height: `${(d.income / maxVal) * 150}px`,
                minHeight: 4, cursor: 'pointer', transition: 'opacity 0.15s'
              }}
            />
            <div
              title={`Expense: ${fmt(d.expense)}`}
              style={{
                flex: 1, background: 'linear-gradient(180deg,#DC2626,#B91C1C)',
                borderRadius: '4px 4px 0 0',
                height: `${(d.expense / maxVal) * 150}px`,
                minHeight: 4, cursor: 'pointer', transition: 'opacity 0.15s'
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('balance');
  const [dateFilter, setDateFilter] = useState('today');

  // Balance sheet data
  const [payments] = useState(() => load('acc_payments', SEED_PAYMENTS));
  const [settlements, setSettlements] = useState(() => load('acc_settlements', SEED_SETTLEMENTS));

  // Expenses
  const [expenses, setExpenses] = useState(() => load('acc_expenses', SEED_EXPENSES));
  const [expForm, setExpForm] = useState({ title: '', category: '', amount: '', date: today(), note: '' });

  // Accountants
  const [accountants, setAccountants] = useState(() => load('acc_accountants', SEED_ACCOUNTANTS));
  const [accForm, setAccForm] = useState({ name: '', email: '', campus: '', password: '' });

  // persist
  useEffect(() => { save('acc_expenses', expenses); }, [expenses]);
  useEffect(() => { save('acc_settlements', settlements); }, [settlements]);
  useEffect(() => { save('acc_accountants', accountants); }, [accountants]);

  // ── date filter logic ────────────────────────────────────────────────────────
  const filterDate = (items) => {
    if (!items) return [];
    return items.filter(item => {
      const d = item.date;
      if (dateFilter === 'today') return d === today();
      if (dateFilter === 'yesterday') return d === yesterday();
      if (dateFilter === 'week') return d >= weekStart() && d <= today();
      if (dateFilter === 'month') return d >= monthStart() && d <= today();
      return true;
    });
  };

  const filteredPayments = filterDate(payments);
  const filteredExpenses = filterDate(expenses);

  const totalIncome = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const settlementKey = `${dateFilter}_${today()}`;
  const isSettled = settlements.includes(settlementKey);

  const handleSettle = () => {
    if (!isSettled) {
      const updated = [...settlements, settlementKey];
      setSettlements(updated);
    }
  };

  // ── expense actions ──────────────────────────────────────────────────────────
  const addExpense = () => {
    if (!expForm.title || !expForm.amount || !expForm.category) return;
    const newExp = { ...expForm, id: Date.now(), amount: parseFloat(expForm.amount) };
    setExpenses(prev => [...prev, newExp]);
    setExpForm({ title: '', category: '', amount: '', date: today(), note: '' });
  };

  const deleteExpense = (id) => setExpenses(prev => prev.filter(e => e.id !== id));

  // expense stats
  const expToday = expenses.filter(e => e.date === today()).reduce((s, e) => s + e.amount, 0);
  const expMonth = expenses.filter(e => e.date >= monthStart()).reduce((s, e) => s + e.amount, 0);
  const expYear = expenses.filter(e => e.date >= `${new Date().getFullYear()}-01-01`).reduce((s, e) => s + e.amount, 0);

  // ── accountant actions ───────────────────────────────────────────────────────
  const addAccountant = () => {
    if (!accForm.name || !accForm.email) return;
    const newAcc = {
      ...accForm,
      id: Date.now(),
      role: 'Accountant',
      webLogin: true,
      mobileLogin: false,
      permissions: ['expenses']
    };
    setAccountants(prev => [...prev, newAcc]);
    setAccForm({ name: '', email: '', campus: '', password: '' });
  };

  const deleteAccountant = (id) => setAccountants(prev => prev.filter(a => a.id !== id));

  const toggleAccountantProp = (id, prop) => {
    setAccountants(prev => prev.map(a => a.id === id ? { ...a, [prop]: !a[prop] } : a));
  };

  const handlePrint = () => window.print();

  const TABS = [
    { id: 'balance', label: 'Balance Sheet', icon: DollarSign },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'accountants', label: 'Accountants', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  const DATE_FILTERS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ];

  return (
    <div className="page-content fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Accounting</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Balance sheet, expenses, and financial reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                background: active ? '#fff' : 'transparent',
                color: active ? '#0D9488' : '#64748B',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── BALANCE SHEET TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'balance' && (
        <div>
          {/* Date filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {DATE_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                  borderColor: dateFilter === f.id ? '#0D9488' : '#E2E8F0',
                  background: dateFilter === f.id ? '#0D9488' : '#fff',
                  color: dateFilter === f.id ? '#fff' : '#64748B',
                  fontWeight: 600, fontSize: 12.5, cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard label="Total Income" value={fmt(totalIncome)} bg="linear-gradient(135deg,#15803D,#166534)" icon={TrendingUp} sub="Payments received" />
            <StatCard label="Total Expenses" value={fmt(totalExpenses)} bg="linear-gradient(135deg,#DC2626,#B91C1C)" icon={TrendingDown} sub="Outflows" />
            <StatCard label="Cash in Hand" value={fmt(Math.max(0, balance))} bg="linear-gradient(135deg,#0D9488,#0F766E)" icon={DollarSign} sub="Net balance" />
            <StatCard
              label="Unsettled Amount"
              value={isSettled ? fmt(0) : fmt(Math.abs(balance))}
              bg="linear-gradient(135deg,#D97706,#B45309)"
              icon={AlertTriangle}
              sub={isSettled ? 'Already settled' : 'Pending settlement'}
            />
          </div>

          {/* Tables row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Payments table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1E3A5F' }}>Fee Payments</h3>
                <span style={{ fontSize: 12, color: '#15803D', fontWeight: 700 }}>{fmt(totalIncome)}</span>
              </div>
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student</th>
                      <th>Fee Title</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr><td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-state-icon">💰</div>
                          <div className="empty-state-text">No payments for selected period</div>
                        </div>
                      </td></tr>
                    ) : filteredPayments.map(p => (
                      <tr key={p.id}>
                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488', fontSize: 12 }}>{p.roll}</span></td>
                        <td style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{p.student}</td>
                        <td style={{ fontSize: 12, color: '#475569' }}>{p.feeTitle}</td>
                        <td><span style={{ fontWeight: 800, color: '#15803D', fontSize: 13 }}>{fmt(p.amount)}</span></td>
                        <td style={{ fontSize: 12, color: '#64748B' }}>{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1E3A5F' }}>Expenses</h3>
                <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 700 }}>{fmt(totalExpenses)}</span>
              </div>
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length === 0 ? (
                      <tr><td colSpan={4}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📊</div>
                          <div className="empty-state-text">No expenses for selected period</div>
                        </div>
                      </td></tr>
                    ) : filteredExpenses.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{e.title}</td>
                        <td><span className="badge badge-amber" style={{ fontSize: 11 }}>{e.category}</span></td>
                        <td><span style={{ fontWeight: 800, color: '#DC2626', fontSize: 13 }}>{fmt(e.amount)}</span></td>
                        <td style={{ fontSize: 12, color: '#64748B' }}>{e.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary row */}
          <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#F8FAFC,#F1F5F9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 32 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Payments</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#15803D' }}>{fmt(totalIncome)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Expenses</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>{fmt(totalExpenses)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Balance</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: balance >= 0 ? '#0D9488' : '#DC2626' }}>{fmt(Math.abs(balance))}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: isSettled ? '#DCFCE7' : '#FEF3C7',
                  color: isSettled ? '#15803D' : '#D97706'
                }}>
                  {isSettled ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  {isSettled ? 'Settled' : 'Unsettled'}
                </span>
                <button
                  onClick={handleSettle}
                  disabled={isSettled}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: isSettled ? 'not-allowed' : 'pointer',
                    background: isSettled ? '#E2E8F0' : 'linear-gradient(135deg,#D97706,#B45309)',
                    color: isSettled ? '#94A3B8' : '#fff',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.15s'
                  }}
                >
                  <CheckCircle size={15} />
                  {isSettled ? 'Already Settled' : 'Make Settlement'}
                </button>
                <button
                  onClick={handlePrint}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 16px', borderRadius: 8, border: '1.5px solid #0D9488',
                    background: '#fff', color: '#0D9488',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer'
                  }}
                >
                  <Printer size={15} />
                  Print Balance Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPENSES TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard label="Expenses Today" value={fmt(expToday)} bg="linear-gradient(135deg,#DC2626,#B91C1C)" icon={TrendingDown} />
            <StatCard label="Expenses This Month" value={fmt(expMonth)} bg="linear-gradient(135deg,#D97706,#B45309)" icon={TrendingDown} />
            <StatCard label="Expenses This Year" value={fmt(expYear)} bg="linear-gradient(135deg,#7C3AED,#6D28D9)" icon={TrendingDown} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
            {/* Add expense form */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TrendingDown size={16} color="#DC2626" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Add Expense</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="e.g. Electricity Bill" value={expForm.title} onChange={e => setExpForm({ ...expForm, title: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (Rs.) *</label>
                <input className="form-input" type="number" placeholder="e.g. 5000" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Note</label>
                <input className="form-input" placeholder="Optional note" value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })} />
              </div>

              <button
                className="btn btn-red"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={addExpense}
                disabled={!expForm.title || !expForm.amount || !expForm.category}
              >
                <Plus size={15} /> Add Expense
              </button>
            </div>

            {/* Expenses list */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>All Expenses</h3>
                <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 700 }}>Total: {fmt(expYear)}</span>
              </div>
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Note</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr><td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📊</div>
                          <div className="empty-state-text">No expenses recorded</div>
                        </div>
                      </td></tr>
                    ) : expenses.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{e.title}</td>
                        <td><span className="badge badge-amber" style={{ fontSize: 11 }}>{e.category}</span></td>
                        <td><span style={{ fontWeight: 800, color: '#DC2626', fontSize: 13 }}>{fmt(e.amount)}</span></td>
                        <td style={{ fontSize: 12, color: '#64748B' }}>{e.date}</td>
                        <td style={{ fontSize: 12, color: '#94A3B8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.note || '—'}</td>
                        <td>
                          <button
                            onClick={() => deleteExpense(e.id)}
                            style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOUNTANTS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'accountants' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
            {/* Add accountant form */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Users size={16} color="#0D9488" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Add Accountant</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Muhammad Ali" value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" placeholder="accountant@school.com" value={accForm.email} onChange={e => setAccForm({ ...accForm, email: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Campus</label>
                <input className="form-input" placeholder="Main Campus" value={accForm.campus} onChange={e => setAccForm({ ...accForm, campus: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={accForm.password} onChange={e => setAccForm({ ...accForm, password: e.target.value })} />
              </div>

              <button
                className="btn btn-teal"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={addAccountant}
                disabled={!accForm.name || !accForm.email}
              >
                <Plus size={15} /> Add Accountant
              </button>
            </div>

            {/* Accountants table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Accountants ({accountants.length})</h3>
              </div>
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Web Login</th>
                      <th>Mobile Login</th>
                      <th>Permissions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountants.length === 0 ? (
                      <tr><td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-state-icon">👥</div>
                          <div className="empty-state-text">No accountants added</div>
                        </div>
                      </td></tr>
                    ) : accountants.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                              {a.name?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{a.name}</div>
                              <div style={{ fontSize: 11, color: '#94A3B8' }}>{a.campus || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5, color: '#475569' }}>{a.email}</td>
                        <td><span className="badge badge-teal" style={{ fontSize: 11 }}>{a.role}</span></td>
                        <td>
                          <Toggle value={a.webLogin} onChange={() => toggleAccountantProp(a.id, 'webLogin')} />
                        </td>
                        <td>
                          <Toggle value={a.mobileLogin} onChange={() => toggleAccountantProp(a.id, 'mobileLogin')} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(a.permissions || []).map(p => (
                              <span key={p} style={{ background: '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => deleteAccountant(a.id)}
                            style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
            {/* Chart card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F' }}>Income vs Expense</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>Monthly comparison — {new Date().getFullYear()}</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0D9488', display: 'inline-block' }} />
                    Income
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#DC2626', display: 'inline-block' }} />
                    Expense
                  </span>
                </div>
              </div>

              <BarChart data={MONTHLY_REPORT} />

              {/* Monthly breakdown table */}
              <div style={{ marginTop: 20 }}>
                <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Income</th>
                        <th>Expense</th>
                        <th>Surplus/Deficit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHLY_REPORT.map(d => {
                        const diff = d.income - d.expense;
                        return (
                          <tr key={d.month}>
                            <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{d.month} {new Date().getFullYear()}</td>
                            <td style={{ color: '#15803D', fontWeight: 700 }}>{fmt(d.income)}</td>
                            <td style={{ color: '#DC2626', fontWeight: 700 }}>{fmt(d.expense)}</td>
                            <td>
                              <span style={{ fontWeight: 800, color: diff >= 0 ? '#0D9488' : '#DC2626', fontSize: 13 }}>
                                {diff >= 0 ? '+' : ''}{fmt(diff)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Print actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Summary stats */}
              <div className="card" style={{ background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: '1.5px solid #BBF7D0' }}>
                <div style={{ fontSize: 11, color: '#15803D', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Year-to-date</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>Total Income</span>
                  <span style={{ fontWeight: 800, color: '#15803D', fontSize: 13 }}>{fmt(MONTHLY_REPORT.reduce((s, d) => s + d.income, 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>Total Expense</span>
                  <span style={{ fontWeight: 800, color: '#DC2626', fontSize: 13 }}>{fmt(MONTHLY_REPORT.reduce((s, d) => s + d.expense, 0))}</span>
                </div>
                <div style={{ borderTop: '1.5px solid #BBF7D0', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Net Surplus</span>
                  <span style={{ fontWeight: 900, color: '#0D9488', fontSize: 14 }}>
                    {fmt(MONTHLY_REPORT.reduce((s, d) => s + d.income - d.expense, 0))}
                  </span>
                </div>
              </div>

              {/* Print buttons */}
              <div className="card">
                <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>Print Reports</h4>

                <button
                  onClick={handlePrint}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#0D9488,#0F766E)', color: '#fff',
                    fontWeight: 700, fontSize: 13, marginBottom: 10, transition: 'opacity 0.15s'
                  }}
                >
                  <Printer size={15} />
                  Print Income &amp; Expense Report
                </button>

                <button
                  onClick={handlePrint}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8, border: '1.5px solid #7C3AED', cursor: 'pointer',
                    background: '#fff', color: '#7C3AED',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.15s'
                  }}
                >
                  <Printer size={15} />
                  Print Head-Wise Dues Summary
                </button>
              </div>

              {/* Quick stats cards */}
              <div className="card" style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '1.5px solid #BFDBFE' }}>
                <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Best Month</div>
                {(() => {
                  const best = MONTHLY_REPORT.reduce((b, d) => (d.income - d.expense) > (b.income - b.expense) ? d : b);
                  return (
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A5F' }}>{best.month} {new Date().getFullYear()}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Surplus: <strong style={{ color: '#0D9488' }}>{fmt(best.income - best.expense)}</strong></div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
