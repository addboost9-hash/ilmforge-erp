import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { money, toPaisa } from '../../utils/currency';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart2, Printer,
  Plus, Users, AlertTriangle, ServerCrash, ChevronLeft, ChevronRight
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
// Amounts are stored in paisa; this shows them in rupees.
const fmt = money;
// A surplus or a deficit: "+Rs. 5,000", "-Rs. 5,000".
const signed = (v) => (v > 0 ? '+' : v < 0 ? '-' : '') + fmt(Math.abs(v));

// Days are Pakistan's (UTC+5, all year), whatever zone this computer's clock
// is set to: between midnight and 5 a.m. the UTC date is still yesterday.
const PK_OFFSET_MS = 5 * 3600e3;
const pkNow = () => new Date(Date.now() + PK_OFFSET_MS); // read with getUTC*()
const ymd = (d) => d.toISOString().slice(0, 10);
const today = () => ymd(pkNow());
const yesterday = () => ymd(new Date(pkNow().getTime() - 86400e3));
const weekStart = () => {
  const d = pkNow();
  return ymd(new Date(d.getTime() - d.getUTCDay() * 86400e3));
};
const monthStart = () => `${today().slice(0, 7)}-01`;
// The Pakistan day a stored moment falls on, as "2026-10-08".
const pkDay = (d) => (d ? ymd(new Date(new Date(d).getTime() + PK_OFFSET_MS)) : '');
// "2026-10-08" -> "08/10/2026", as dates are written in Pakistan.
const dmy = (day) => (day ? day.split('-').reverse().join('/') : '');

// The days a Balance Sheet period covers, both included, as the ledger takes
// them. A blank end leaves that side open.
function periodRange(id, custom) {
  if (id === 'today') return { from: today(), to: today() };
  if (id === 'yesterday') return { from: yesterday(), to: yesterday() };
  if (id === 'week') return { from: weekStart(), to: today() };
  if (id === 'month') return { from: monthStart(), to: today() };
  return custom;
}
function periodLabel({ from, to }) {
  if (from && to) return from === to ? dmy(from) : `${dmy(from)} to ${dmy(to)}`;
  if (from) return `From ${dmy(from)}`;
  if (to) return `Up to ${dmy(to)}`;
  return 'All dates';
}

// This year and the nine before it: schools enter records from past years.
const recentYears = () => {
  const y = pkNow().getUTCFullYear();
  return Array.from({ length: 10 }, (_, i) => y - i);
};

// "super_admin" -> "Super Admin".
const roleName = (r) => (r ? r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

// "Salaries" is the category Payroll records paid salaries under; using the
// same name here keeps a hand-entered salary in the same total.
const EXPENSE_CATEGORIES = ['Salaries', 'Rent', 'Utilities', 'Maintenance', 'Transport', 'Stationery', 'Other'];

// The server files a name under the school's category of that name whatever
// its case or spacing: "utilities" goes under "Utilities".
const catKey = (name) => String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

// The usual categories plus those the school added in Expense Management,
// each once and in the school's own spelling, with "Other" last.
function categoryOptions(cats) {
  const own = new Map((cats || []).map((c) => [catKey(c.name), c.name]));
  const seen = new Set();
  return [...EXPENSE_CATEGORIES.filter((n) => n !== 'Other'), ...own.values(), 'Other']
    .map((n) => own.get(catKey(n)) || n)
    .filter((n) => {
      const key = catKey(n);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// Screens whose figures a new expense changes. They keep data for five
// minutes and do not reload on opening, so they are refreshed now.
const EXPENSE_KEYS = [
  'accounting-ledger', 'accounting-stats', 'accounting-recent-expenses', 'accounting-cash', 'exp-cats',
  'expenses', 'expenses-today', 'expenses-all-today', 'bs-expenses', 'sheet-status', 'last-balancesheet', 'prev-sheet',
  'dashboard', 'dash-admin-overview',
];

// The Balance Sheet lists at most this many payments and expenses; its
// totals always cover the whole period.
const LEDGER_LIMIT = 500;
const EXPENSE_PAGE_SIZE = 25;

const blankExpense = (date = today(), category = '') => ({ title: '', category, amount: '', date, note: '' });

const linkStyle = { color: '#0D9488', fontWeight: 600, textDecoration: 'none' };

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
  // At least 1: a year with nothing entered would divide by 0.
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
  // A month with nothing entered gets no bar, not a sliver that looks like money.
  const barHeight = (v) => (v > 0 ? `${Math.max(3, (v / maxVal) * 150)}px` : 0);
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
                height: barHeight(d.income),
                cursor: 'pointer', transition: 'opacity 0.15s'
              }}
            />
            <div
              title={`Expense: ${fmt(d.expense)}`}
              style={{
                flex: 1, background: 'linear-gradient(180deg,#DC2626,#B91C1C)',
                borderRadius: '4px 4px 0 0',
                height: barHeight(d.expense),
                cursor: 'pointer', transition: 'opacity 0.15s'
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
}

// ─── a section whose figures could not be loaded ─────────────────────────────
// Says so, rather than showing zeroes that would read as "no money moved".
function LoadError({ error, onRetry }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', borderRadius: 12, border: '2px dashed #CBD5E1',
      background: '#F8FAFC', gap: 14, textAlign: 'center'
    }}>
      <ServerCrash size={40} color="#94A3B8" />
      <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>
        Could not load these figures
      </div>
      <div style={{ fontSize: 13, color: '#94A3B8', maxWidth: 400 }}>
        {error?.response?.data?.message || 'Check your internet connection, then try again.'}
      </div>
      <button className="btn btn-outline btn-sm" onClick={() => onRetry()}>Try again</button>
    </div>
  );
}

const Loading = () => (
  <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8', fontSize: 14 }}>Loading accounting data...</div>
);

// ─── main component ───────────────────────────────────────────────────────────
export default function AccountingPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const thisYear = pkNow().getUTCFullYear();
  const [activeTab, setActiveTab] = useState('balance');
  const [dateFilter, setDateFilter] = useState('today');
  const [custom, setCustom] = useState(() => ({ from: monthStart(), to: today() }));
  const [expForm, setExpForm] = useState(() => blankExpense());
  const [expPage, setExpPage] = useState(1);
  const [reportYear, setReportYear] = useState(thisYear);
  const [cashDate, setCashDate] = useState(today);

  // ── Balance Sheet: fee payments and expenses dated in the period ────────────
  // The server picks the period's rows and adds up all of them: filtering the
  // latest 50 rows here left most of a busy month out of "This Month".
  const range = periodRange(dateFilter, custom);
  const rangeOk = !(range.from && range.to && range.from > range.to);
  const {
    data: ledger, error: ledgerError, isFetching: ledgerFetching, refetch: refetchLedger,
  } = useQuery({
    queryKey: ['accounting-ledger', range.from, range.to],
    queryFn: () => api.get('/accounting/ledger', {
      params: { from: range.from || undefined, to: range.to || undefined, limit: LEDGER_LIMIT },
    }).then(r => r.data.data),
    enabled: activeTab === 'balance' && rangeOk,
    placeholderData: keepPreviousData,
  });

  const payments = ledger?.payments || [];
  const expenses = ledger?.expenses || [];
  const totalIncome = ledger?.totals?.income || 0;
  const totalExpenses = ledger?.totals?.expense || 0;
  const balance = totalIncome - totalExpenses;

  // ── monthly figures: this year's for the Expenses tab, any year's for Reports
  const statsQuery = (year) => ({
    queryKey: ['accounting-stats', year],
    queryFn: () => api.get('/accounting/stats', { params: { year } }).then(r => r.data.data),
  });
  const { data: statsNow } = useQuery({ ...statsQuery(thisYear), enabled: activeTab === 'expenses' });
  const {
    data: report, error: reportError, isFetching: reportFetching, refetch: refetchReport,
  } = useQuery({ ...statsQuery(reportYear), enabled: activeTab === 'reports', placeholderData: keepPreviousData });

  // "—" until loaded: a 0 would read as "nothing spent".
  const statValue = (v) => (v === undefined ? '—' : fmt(v));
  const monthly = report?.monthly || [];
  // The month with the best surplus, among months with anything entered.
  const best = monthly
    .filter(d => d.income || d.expense)
    .reduce((b, d) => (!b || d.income - d.expense > b.income - b.expense ? d : b), null);

  // ── Expenses tab: the school's categories and its expenses, newest first ────
  const { data: cats } = useQuery({
    queryKey: ['exp-cats'],
    queryFn: () => api.get('/expenses/categories').then(r => r.data.data),
    enabled: activeTab === 'expenses',
  });
  const {
    data: expList, error: expListError, isFetching: expListFetching, refetch: refetchExpList,
  } = useQuery({
    queryKey: ['accounting-recent-expenses', expPage],
    queryFn: () => api.get('/expenses', { params: { page: expPage, limit: EXPENSE_PAGE_SIZE } }).then(r => r.data),
    enabled: activeTab === 'expenses',
    placeholderData: keepPreviousData,
  });
  const expRows = expList?.data || [];
  const expPages = Math.max(1, expList?.pages || 1);

  // ── Accountants tab: what each person took in and paid out on a day ─────────
  const {
    data: cash, error: cashError, isFetching: cashFetching, refetch: refetchCash,
  } = useQuery({
    queryKey: ['accounting-cash', cashDate],
    queryFn: () => api.get('/reports/accounting/daily-balancesheet', { params: { date: cashDate } }).then(r => r.data.data),
    enabled: activeTab === 'accountants' && !!cashDate,
    placeholderData: keepPreviousData,
  });
  const sheets = cash?.sheets || [];

  const refresh = () => EXPENSE_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k], refetchType: 'all' }));

  // ── create entry mutation ────────────────────────────────────────────────────
  const createEntry = useMutation({
    mutationFn: (payload) => api.post('/accounting/entries', payload).then(r => r.data.data),
    // Not tried again on failure: when the reply is lost on a weak connection
    // the expense is usually saved already, and a second try would add it twice.
    retry: false,
    onSuccess: (saved) => {
      toast.success(`${fmt(saved.amount)} expense added for ${dmy(pkDay(saved.date))}`);
      refresh();
      // Keep the day and category: past bills are usually entered several at a time.
      setExpForm(f => blankExpense(f.date, f.category));
      setExpPage(1);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not add the expense.'),
  });

  const addExpense = () => {
    const paisa = toPaisa(expForm.amount);
    if (!expForm.title.trim() || !expForm.category) { toast.error('Enter a title and choose a category.'); return; }
    if (!(Number(expForm.amount) > 0) || paisa <= 0) { toast.error('Enter an amount more than 0.'); return; }
    if (!expForm.date) { toast.error('Enter the date of the expense.'); return; }
    if (expForm.date > today()) { toast.error('The date cannot be in the future.'); return; }
    createEntry.mutate({
      type: 'expense',
      amount: paisa,
      description: expForm.title.trim(),
      date: expForm.date,
      category: expForm.category,
      note: expForm.note.trim(),
    });
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
    { id: 'custom', label: 'Choose Dates' },
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
      <div className="no-print" style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
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
          <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
            {dateFilter === 'custom' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
                <input aria-label="From" className="form-input" type="date" max={today()} style={{ width: 150 }}
                  value={custom.from} onChange={e => setCustom({ ...custom, from: e.target.value })} />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>to</span>
                <input aria-label="To" className="form-input" type="date" max={today()} style={{ width: 150 }}
                  value={custom.to} onChange={e => setCustom({ ...custom, to: e.target.value })} />
              </div>
            )}
          </div>

          {!rangeOk ? (
            <div style={{ fontSize: 13, color: '#B91C1C', marginBottom: 16 }}>The first date must be on or before the second.</div>
          ) : (
            <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>
              Period: <strong style={{ color: '#1E3A5F' }}>{periodLabel(range)}</strong>
              <span className="no-print"> · Each entry counts on the date written on it, so old records show under the day they happened.</span>
            </div>
          )}

          {!rangeOk ? null : ledgerError ? (
            <LoadError error={ledgerError} onRetry={refetchLedger} />
          ) : !ledger ? (
            <Loading />
          ) : (
            <div style={{ opacity: ledgerFetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
                <StatCard label="Total Income" value={fmt(totalIncome)} bg="linear-gradient(135deg,#15803D,#166534)" icon={TrendingUp} sub="Payments received" />
                <StatCard label="Total Expenses" value={fmt(totalExpenses)} bg="linear-gradient(135deg,#DC2626,#B91C1C)" icon={TrendingDown} sub="Outflows" />
                <StatCard
                  label="Balance"
                  value={signed(balance)}
                  bg={balance >= 0 ? 'linear-gradient(135deg,#0D9488,#0F766E)' : 'linear-gradient(135deg,#D97706,#B45309)'}
                  icon={balance >= 0 ? DollarSign : AlertTriangle}
                  sub={balance >= 0 ? 'Surplus' : 'Deficit'}
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
                        {payments.length === 0 ? (
                          <tr><td colSpan={5}>
                            <div className="empty-state">
                              <div className="empty-state-icon">💰</div>
                              <div className="empty-state-text">No payments for selected period</div>
                            </div>
                          </td></tr>
                        ) : payments.map(p => (
                          <tr key={p.id}>
                            <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488', fontSize: 12 }}>{p.roll}</span></td>
                            <td style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{p.student}</td>
                            <td style={{ fontSize: 12, color: '#475569' }}>{p.feeTitle}</td>
                            <td><span style={{ fontWeight: 800, color: '#15803D', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(p.amount)}</span></td>
                            <td style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{dmy(pkDay(p.date))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {payments.length >= LEDGER_LIMIT && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #F1F5F9', fontSize: 11.5, color: '#94A3B8' }}>
                      The latest {LEDGER_LIMIT} are listed. The total includes every payment in the period.
                    </div>
                  )}
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
                        {expenses.length === 0 ? (
                          <tr><td colSpan={4}>
                            <div className="empty-state">
                              <div className="empty-state-icon">📊</div>
                              <div className="empty-state-text">No expenses for selected period</div>
                            </div>
                          </td></tr>
                        ) : expenses.map(e => (
                          <tr key={e.id}>
                            <td style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{e.title || '—'}</td>
                            <td>{e.category ? <span className="badge badge-amber" style={{ fontSize: 11 }}>{e.category}</span> : '—'}</td>
                            <td><span style={{ fontWeight: 800, color: '#DC2626', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(e.amount)}</span></td>
                            <td style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{dmy(pkDay(e.date))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {expenses.length >= LEDGER_LIMIT && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #F1F5F9', fontSize: 11.5, color: '#94A3B8' }}>
                      The latest {LEDGER_LIMIT} are listed. The total includes every expense in the period.
                    </div>
                  )}
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
                      <div style={{ fontSize: 18, fontWeight: 800, color: balance >= 0 ? '#0D9488' : '#DC2626' }}>{signed(balance)}</div>
                    </div>
                  </div>
                  <button
                    className="no-print"
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
          )}
        </div>
      )}

      {/* ── EXPENSES TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div>
          {/* Stats: each expense counts on the day it was spent */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard label="Expenses Today" value={statValue(statsNow?.today?.expense)} bg="linear-gradient(135deg,#DC2626,#B91C1C)" icon={TrendingDown} />
            <StatCard label="Expenses This Month" value={statValue(statsNow?.thisMonth?.expense)} bg="linear-gradient(135deg,#D97706,#B45309)" icon={TrendingDown} />
            <StatCard label="Expenses This Year" value={statValue(statsNow?.annual?.expense)} bg="linear-gradient(135deg,#7C3AED,#6D28D9)" icon={TrendingDown} />
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
                <select aria-label="Category" className="form-select" value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                  <option value="">Select Category</option>
                  {categoryOptions(cats).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (Rs.) *</label>
                <input className="form-input" type="number" min="0" step="any" inputMode="decimal" placeholder="e.g. 5000" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input aria-label="Date" className="form-input" type="date" max={today()} value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>The day the money was spent. Past dates are fine.</div>
              </div>

              <div className="form-group">
                <label className="form-label">Note</label>
                <input className="form-input" placeholder="Optional note" value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })} />
              </div>

              <button
                className="btn btn-red"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={addExpense}
                disabled={!expForm.title.trim() || !expForm.amount || !expForm.category || createEntry.isPending}
              >
                <Plus size={15} /> {createEntry.isPending ? 'Adding...' : 'Add Expense'}
              </button>
            </div>

            {/* Expenses list */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>All Expenses</h3>
                {expList && (
                  <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 700 }}>
                    {expList.total} {expList.total === 1 ? 'expense' : 'expenses'} · {fmt(expList.totalAmount)}
                  </span>
                )}
              </div>
              {expListError ? (
                <div style={{ padding: 16 }}><LoadError error={expListError} onRetry={refetchExpList} /></div>
              ) : !expList ? (
                <Loading />
              ) : (
                <div className="table-wrap" style={{ borderRadius: 0, border: 'none', opacity: expListFetching ? 0.6 : 1 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expRows.length === 0 ? (
                        <tr><td colSpan={4}>
                          <div className="empty-state">
                            <div className="empty-state-icon">📊</div>
                            <div className="empty-state-text">No expenses recorded</div>
                          </div>
                        </td></tr>
                      ) : expRows.map(e => (
                        <tr key={e.id}>
                          <td style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{dmy(pkDay(e.date))}</td>
                          <td style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{e.description || '—'}</td>
                          <td>{e.category ? <span className="badge badge-amber" style={{ fontSize: 11 }}>{e.category}</span> : '—'}</td>
                          <td><span style={{ fontWeight: 800, color: '#DC2626', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(e.amount)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 16px', borderTop: '1px solid #F1F5F9', fontSize: 12.5, color: '#64748B' }}>
                <span>To edit or delete an expense, open <Link to="/expenses" style={linkStyle}>Expense Management</Link>.</span>
                {expPages > 1 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>Page {expPage} of {expPages}</span>
                    <button className="btn btn-sm btn-outline" onClick={() => setExpPage(p => Math.max(1, p - 1))} disabled={expPage <= 1}><ChevronLeft size={13} /> Previous</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setExpPage(p => Math.min(expPages, p + 1))} disabled={expPage >= expPages}>Next <ChevronRight size={13} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOUNTANTS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'accountants' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Cash With Each Person</h3>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Fee payments and expenses each person entered on the day, and the cash still with them.
              </div>
            </div>
            <input aria-label="Day" className="form-input no-print" type="date" max={today()} style={{ width: 160 }}
              value={cashDate} onChange={e => setCashDate(e.target.value)} />
          </div>

          {!cashDate ? (
            <div style={{ padding: 24, fontSize: 13, color: '#64748B', textAlign: 'center' }}>Choose a day.</div>
          ) : cashError ? (
            <div style={{ padding: 16 }}><LoadError error={cashError} onRetry={refetchCash} /></div>
          ) : !cash ? (
            <Loading />
          ) : (
            <div style={{ opacity: cashFetching ? 0.6 : 1 }}>
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Collected</th>
                      <th>Spent</th>
                      <th>Cash in Hand</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheets.length === 0 ? (
                      <tr><td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-state-icon">👥</div>
                          <div className="empty-state-text">Nothing entered on {dmy(cash.date)}, and no cash held from earlier days</div>
                        </div>
                      </td></tr>
                    ) : sheets.map(s => (
                      <tr key={s.accountantId}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{s.name}</div>
                          <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                            {[roleName(s.role), s.summary.backdated ? `${s.summary.backdated} dated another day` : ''].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 700, color: '#15803D', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(s.summary.todayCollected)}</span></td>
                        <td><span style={{ fontWeight: 700, color: '#DC2626', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(s.summary.todayExpenses)}</span></td>
                        <td><span style={{ fontWeight: 800, color: '#1E3A5F', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(s.cashInHand)}</span></td>
                        <td>
                          <span className={`badge ${s.status === 'settled' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 11 }}>
                            {s.status === 'settled' ? 'Settled' : 'Not settled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cash.imported?.count > 0 && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#64748B' }}>
                  {cash.imported.count} past fee {cash.imported.count === 1 ? 'payment' : 'payments'} ({fmt(cash.imported.amount)}) came in from the Past Records import on this day. They are not anyone's cash.
                </div>
              )}
            </div>
          )}

          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 16px', borderTop: '1px solid #F1F5F9', fontSize: 12.5, color: '#64748B' }}>
            <Link to="/accounting/balancesheet" style={linkStyle}>See each payment on the Daily Balance Sheet →</Link>
            {(role === 'admin' || role === 'super_admin') && (
              <span>Accountant logins are added in <Link to="/settings/admins" style={linkStyle}>Settings → Admin Accounts</Link>.</span>
            )}
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <label htmlFor="report-year" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Year</label>
            <select id="report-year" className="form-select" style={{ width: 120 }} value={reportYear} onChange={e => setReportYear(Number(e.target.value))}>
              {recentYears().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {reportError ? (
            <LoadError error={reportError} onRetry={refetchReport} />
          ) : !report ? (
            <Loading />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, opacity: reportFetching ? 0.6 : 1 }}>
              {/* Chart card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F' }}>Income vs Expense</h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748B' }}>Monthly comparison — {report.year}</p>
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

                {!report.hasData && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                    No fee payments or expenses recorded for {report.year}.
                  </div>
                )}

                <BarChart data={monthly} />

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
                        {monthly.map(d => {
                          const diff = d.income - d.expense;
                          // A month with nothing entered is not a month that broke even.
                          const empty = !d.income && !d.expense;
                          return (
                            <tr key={d.month}>
                              <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{d.month} {report.year}</td>
                              <td style={{ color: '#15803D', fontWeight: 700 }}>{fmt(d.income)}</td>
                              <td style={{ color: '#DC2626', fontWeight: 700 }}>{fmt(d.expense)}</td>
                              <td>
                                {empty ? <span style={{ color: '#94A3B8' }}>—</span> : (
                                  <span style={{ fontWeight: 800, color: diff >= 0 ? '#0D9488' : '#DC2626', fontSize: 13 }}>
                                    {signed(diff)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: '#F8FAFC' }}>
                          <td style={{ fontWeight: 800, color: '#1E3A5F' }}>Total {report.year}</td>
                          <td style={{ color: '#15803D', fontWeight: 800 }}>{fmt(report.annual.income)}</td>
                          <td style={{ color: '#DC2626', fontWeight: 800 }}>{fmt(report.annual.expense)}</td>
                          <td>
                            <span style={{ fontWeight: 900, color: report.annual.net >= 0 ? '#0D9488' : '#DC2626', fontSize: 13 }}>
                              {signed(report.annual.net)}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Print actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Summary stats */}
                <div className="card" style={{ background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: '1.5px solid #BBF7D0' }}>
                  <div style={{ fontSize: 11, color: '#15803D', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    {report.year === thisYear ? 'Year-to-date' : `Year ${report.year}`}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>Total Income</span>
                    <span style={{ fontWeight: 800, color: '#15803D', fontSize: 13 }}>{fmt(report.annual.income)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>Total Expense</span>
                    <span style={{ fontWeight: 800, color: '#DC2626', fontSize: 13 }}>{fmt(report.annual.expense)}</span>
                  </div>
                  <div style={{ borderTop: '1.5px solid #BBF7D0', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>{report.annual.net >= 0 ? 'Net Surplus' : 'Net Deficit'}</span>
                    <span style={{ fontWeight: 900, color: report.annual.net >= 0 ? '#0D9488' : '#DC2626', fontSize: 14 }}>
                      {signed(report.annual.net)}
                    </span>
                  </div>
                </div>

                {/* Print buttons */}
                <div className="card no-print">
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

                  {/* The printable dues reports live in the Reporting Area; this
                      button used to print this page under that name. */}
                  <Link
                    to="/reporting-area"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 8, border: '1.5px solid #7C3AED',
                      background: '#fff', color: '#7C3AED', boxSizing: 'border-box', textDecoration: 'none',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.15s'
                    }}
                  >
                    <BarChart2 size={15} />
                    Head-Wise Dues &amp; Other Reports
                  </Link>
                </div>

                {/* Quick stats cards */}
                <div className="card" style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '1.5px solid #BFDBFE' }}>
                  <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Best Month</div>
                  {best ? (
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A5F' }}>{best.month} {report.year}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                        {best.income - best.expense >= 0 ? 'Surplus' : 'Deficit'}: <strong style={{ color: best.income - best.expense >= 0 ? '#0D9488' : '#DC2626' }}>{signed(best.income - best.expense)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#64748B' }}>Nothing entered for {report.year} yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
