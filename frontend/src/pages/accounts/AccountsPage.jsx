/**
 * IlmForge — Accounts Module
 * School Mentor style financial accounts overview
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/client';
import {
  Landmark, DollarSign, TrendingUp, TrendingDown,
  FileText, BarChart2, ChevronRight, CreditCard, Receipt,
  ArrowUpCircle, ArrowDownCircle, Scale
} from 'lucide-react';

const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');

const TABS = [
  { id: 'income-expense', label: 'Income / Expense', icon: BarChart2 },
  { id: 'balance-sheet',  label: 'Balance Sheet',    icon: Scale },
  { id: 'transactions',   label: 'Transactions',     icon: CreditCard },
  { id: 'reports',        label: 'Reports',          icon: FileText },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SAMPLE_MONTHLY = MONTHS.map((m, i) => ({
  month: m,
  income:  [185000,190000,178000,210000,195000,220000,200000,215000,188000,205000,230000,245000][i],
  expense: [140000,145000,132000,155000,148000,160000,142000,158000,135000,150000,162000,175000][i],
}));

function StatCard({ label, value, icon: Icon, color, trend }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 12,
        background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1B2F6E', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{label}</div>
        {trend !== undefined && (
          <div style={{ fontSize: 11, color: trend >= 0 ? '#0d9488' : '#ef4444', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLinkCard({ title, desc, to, icon: Icon, color }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '16px 18px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.07)', border: '1px solid #f0f4ff',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', transition: 'transform .12s, box-shadow .12s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.07)'; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13.5 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{desc}</div>
        </div>
        <ChevronRight size={16} color="#94a3b8" />
      </div>
    </Link>
  );
}

/* ── INCOME/EXPENSE TAB ── */
function IncomeExpenseTab({ stats }) {
  const thisMonth = SAMPLE_MONTHLY[new Date().getMonth()];
  const net = thisMonth.income - thisMonth.expense;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Income (This Month)"   value={Rs(thisMonth.income)}  icon={ArrowUpCircle}   color="#0d9488" trend={5.2} />
        <StatCard label="Total Expense (This Month)"  value={Rs(thisMonth.expense)} icon={ArrowDownCircle} color="#ef4444" trend={-2.1} />
        <StatCard label="Net Profit"                  value={Rs(net)}               icon={TrendingUp}      color="#1B2F6E" trend={8.4} />
        <StatCard label="Annual Income"               value={Rs(2400000)}           icon={DollarSign}      color="#6366f1" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Income vs Expense Bar Chart */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '18px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 16px', color: '#1B2F6E', fontSize: 14, fontWeight: 600 }}>Monthly Income vs Expense</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SAMPLE_MONTHLY} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000) + 'k'} />
              <Tooltip formatter={v => Rs(v)} />
              <Legend iconType="rect" />
              <Bar dataKey="income"  name="Income"  fill="#0d9488" radius={[3,3,0,0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net Profit Line Chart */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '18px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 16px', color: '#1B2F6E', fontSize: 14, fontWeight: 600 }}>Net Profit Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={SAMPLE_MONTHLY.map(d => ({ ...d, net: d.income - d.expense }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000) + 'k'} />
              <Tooltip formatter={v => Rs(v)} />
              <Line type="monotone" dataKey="net" name="Net Profit" stroke="#1B2F6E" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, color: '#1B2F6E', fontSize: 14, fontWeight: 600 }}>Monthly Breakdown</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Month', 'Income', 'Expense', 'Net Profit', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMPLE_MONTHLY.map((row, i) => {
              const net = row.income - row.expense;
              return (
                <tr key={row.month} style={{ borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '9px 16px', fontWeight: 600, color: '#1e293b' }}>{row.month}</td>
                  <td style={{ padding: '9px 16px', color: '#0d9488', fontWeight: 600 }}>{Rs(row.income)}</td>
                  <td style={{ padding: '9px 16px', color: '#ef4444' }}>{Rs(row.expense)}</td>
                  <td style={{ padding: '9px 16px', color: net >= 0 ? '#0d9488' : '#ef4444', fontWeight: 600 }}>{Rs(net)}</td>
                  <td style={{ padding: '9px 16px' }}>
                    <span style={{
                      background: net >= 0 ? '#d1fae5' : '#fee2e2',
                      color: net >= 0 ? '#065f46' : '#991b1b',
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    }}>{net >= 0 ? 'Profit' : 'Loss'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── BALANCE SHEET TAB ── */
function BalanceSheetTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Assets"      value={Rs(3500000)}  icon={TrendingUp}   color="#0d9488" />
        <StatCard label="Total Liabilities" value={Rs(800000)}   icon={TrendingDown} color="#ef4444" />
        <StatCard label="Net Worth"         value={Rs(2700000)}  icon={Scale}        color="#1B2F6E" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <QuickLinkCard title="Daily Balance Sheet"   desc="View today's financial balance"  to="/accounting/balancesheet"  icon={Scale}       color="#1B2F6E" />
        <QuickLinkCard title="Accounting Overview"   desc="Income & expense tracking"        to="/accounting"               icon={BarChart2}   color="#0d9488" />
        <QuickLinkCard title="Fee Collection"        desc="Today's fee income"               to="/fees/collect"             icon={DollarSign}  color="#6366f1" />
        <QuickLinkCard title="Expense Management"    desc="Operational expenses"             to="/expense-management"       icon={Receipt}     color="#f59e0b" />
      </div>
    </div>
  );
}

/* ── TRANSACTIONS TAB ── */
function TransactionsTab() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['recent-payments-accounts'],
    queryFn: () => api.get('/fees/payments', { params: { limit: 20 } }).then(r => r.data?.data || r.data || []),
    staleTime: 60_000,
  });
  const list = Array.isArray(payments) ? payments : [];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Today's Transactions"  value={list.filter(p => {
          const d = new Date(p.createdAt || p.date);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).length || '—'}  icon={CreditCard}     color="#1B2F6E" />
        <StatCard label="Total Collected"       value={Rs(list.reduce((s, p) => s + (p.amount || 0), 0))}  icon={DollarSign}    color="#0d9488" />
        <StatCard label="Pending Payments"      value="—"  icon={Receipt}       color="#f59e0b" />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#1B2F6E', fontSize: 14, fontWeight: 600 }}>Recent Transactions</h3>
          <Link to="/payments/transactions" style={{ color: '#1B2F6E', fontSize: 12, fontWeight: 600 }}>View All</Link>
        </div>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading transactions...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No transactions found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Student / Description', 'Amount', 'Type', 'Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 15).map((t, i) => (
                <tr key={t._id || i} style={{ borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '9px 16px', color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ padding: '9px 16px', color: '#1e293b', fontWeight: 500 }}>
                    {t.studentName || t.description || 'Fee Payment'}
                  </td>
                  <td style={{ padding: '9px 16px', color: '#0d9488', fontWeight: 600 }}>{Rs(t.amount)}</td>
                  <td style={{ padding: '9px 16px', color: '#64748b' }}>{t.type || 'Fee'}</td>
                  <td style={{ padding: '9px 16px', color: '#64748b' }}>
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '9px 16px' }}>
                    <span style={{
                      background: '#d1fae5', color: '#065f46',
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    }}>Paid</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── REPORTS TAB ── */
function ReportsTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Income Reports"   value="12"  icon={TrendingUp}   color="#0d9488" />
        <StatCard label="Expense Reports"  value="8"   icon={TrendingDown} color="#ef4444" />
        <StatCard label="Balance Reports"  value="4"   icon={Scale}        color="#1B2F6E" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <QuickLinkCard title="Income Report"       desc="Detailed fee income breakdown"      to="/accounting"              icon={ArrowUpCircle}   color="#0d9488" />
        <QuickLinkCard title="Expense Report"      desc="Operational expense analysis"       to="/accounting"              icon={ArrowDownCircle} color="#ef4444" />
        <QuickLinkCard title="Balance Sheet"       desc="Daily financial balance"            to="/accounting/balancesheet" icon={Scale}           color="#1B2F6E" />
        <QuickLinkCard title="Reports Hub"         desc="Access 110+ comprehensive reports" to="/reports-hub"             icon={BarChart2}       color="#6366f1" />
        <QuickLinkCard title="Fee Defaulters"      desc="Students with unpaid fees"         to="/fees/defaulters"         icon={FileText}        color="#f59e0b" />
        <QuickLinkCard title="Payment Transactions" desc="All payment records"              to="/payments/transactions"   icon={CreditCard}      color="#64748b" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState('income-expense');

  const { data: accStats } = useQuery({
    queryKey: ['accounting-stats'],
    queryFn: () => api.get('/accounting/stats').then(r => r.data?.data || r.data).catch(() => null),
    staleTime: 5 * 60_000,
    retry: 0,
  });

  return (
    <div className="page-content page-animate" style={{ padding: '20px 22px 40px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1B2F6E 0%, #2d4a8a 100%)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Accounts</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '3px 0 0' }}>
              Financial overview — income, expenses, balance sheet & reports
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/accounting/balancesheet" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '8px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            Balance Sheet
          </Link>
          <Link to="/hub/fees" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff', color: '#1B2F6E', padding: '8px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}>
            Finance Hub <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, background: '#fff', padding: 6, borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 20, overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? '#1B2F6E' : 'transparent',
                color: active ? '#fff' : '#64748b',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'income-expense' && <IncomeExpenseTab stats={accStats} />}
        {activeTab === 'balance-sheet'  && <BalanceSheetTab />}
        {activeTab === 'transactions'   && <TransactionsTab />}
        {activeTab === 'reports'        && <ReportsTab />}
      </div>
    </div>
  );
}
