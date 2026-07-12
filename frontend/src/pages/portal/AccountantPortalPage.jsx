/**
 * IlmForge — Accountant Portal  (Enterprise Theme)
 * Dark navy #1B2F6E header
 * 6 stat cards: Collection Today (green), Outstanding (red), Paid Invoices (blue),
 *               Defaulters (yellow), Staff Salary (purple), Expenses (orange)
 * Action tile grid: white background with colored icon
 */
import { useMemo, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import {
  Wallet,
  Receipt,
  AlertTriangle,
  BarChart3,
  Landmark,
  PiggyBank,
  ArrowRight,
  Calendar,
  ClipboardList,
  History,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  LayoutDashboard,
  BookOpen,
  TrendingDown,
  Users,
  DollarSign,
} from 'lucide-react';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';
import { printFeeVoucher } from '../../components/PortalUtils';

/* ── Enterprise theme tokens ─────────────────────────────── */
const NAVY = '#1B2F6E';
const CYAN = '#00c0ef';

/* ─── helpers ──────────────────────────────────────────────────────────── */
const Rs = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK')}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

/* ── Stat card presets ───────────────────────────────────── */
const STAT_PRESETS = {
  green:  { color: '#15803D', bg: '#DCFCE7' },
  red:    { color: '#B91C1C', bg: '#FEE2E2' },
  blue:   { color: '#1D4ED8', bg: '#DBEAFE' },
  yellow: { color: '#B45309', bg: '#FEF3C7' },
  purple: { color: '#7C3AED', bg: '#F5F3FF' },
  orange: { color: '#EA580C', bg: '#FFF7ED' },
  teal:   { color: '#0F766E', bg: '#CCFBF1' },
};

/* ─── small reusable atoms ──────────────────────────────────────────────── */
function StatCard({ title, value, sub, icon: Icon, preset, badge }) {
  const p = STAT_PRESETS[preset] || STAT_PRESETS.blue;
  return (
    <div
      className={`stat-card stat-${preset}`}
      style={{
        background: p.bg,
        border: `1px solid ${p.color}30`,
        borderRadius: 14,
        padding: '16px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: '#DC2626',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 999,
            letterSpacing: '0.04em',
          }}
        >
          {badge}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} color={p.color} />
        <span
          style={{
            color: p.color,
            fontWeight: 700,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ color: p.color, fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>{value}</div>
      <div style={{ marginTop: 3, color: '#64748B', fontSize: 12 }}>{sub}</div>
    </div>
  );
}

/* Action tile — white card with colored icon */
function ActionTile({ to, onClick, title, desc, icon: Icon, color }) {
  const inner = (
    <>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={17} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: NAVY, fontWeight: 700, fontSize: 13.5 }}>{title}</div>
        <div style={{ color: '#64748B', fontSize: 12 }}>{desc}</div>
      </div>
      <ArrowRight size={15} color="#94A3B8" />
    </>
  );

  const tileStyle = {
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: '14px 16px',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'box-shadow 0.15s',
  };

  if (to) {
    return (
      <Link to={to} style={tileStyle}
        onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 12px ${NAVY}18`}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} style={tileStyle}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 12px ${NAVY}18`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      {inner}
    </button>
  );
}

/* ─── Tab navigation ────────────────────────────────────────────────────── */
const TABS = [
  { id: 'dashboard',    label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'balancesheet', label: 'Daily Balancesheet', icon: BookOpen        },
  { id: 'collection',   label: 'Fee Collection',     icon: Wallet          },
  { id: 'expenses',     label: 'Expense Log',        icon: TrendingDown    },
  { id: 'history',      label: 'Payment History',    icon: History         },
  { id: 'discounts',    label: '🎓 Scholarships',    icon: Receipt         },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function DashboardTab({ user, setActiveTab }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['accountant-invoices'],
    queryFn: () =>
      api.get('/fees/invoices', { params: { limit: 120 } }).then((r) => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  const { data: defaulters = [] } = useQuery({
    queryKey: ['accountant-defaulters'],
    queryFn: () => api.get('/fees/defaulters').then((r) => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  const { data: todayPayments = [] } = useQuery({
    queryKey: ['today-payments', user?.id],
    queryFn: () =>
      api
        .get('/fees/payments', { params: { accountant: user?.id, date: todayISO(), limit: 200 } })
        .then((r) => r.data.data || []),
    staleTime: 30_000,
    retry: false,
  });

  const { data: lastSheet } = useQuery({
    queryKey: ['last-balancesheet'],
    queryFn: () =>
      api.get('/accounting/balancesheet/latest').then((r) => r.data.data || null),
    staleTime: 60_000,
    retry: false,
  });

  const { data: expensesAll = [] } = useQuery({
    queryKey: ['expenses-all-today'],
    queryFn: () =>
      api.get('/expenses', { params: { date: todayISO() } }).then((r) => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  /* Staff salary — current month total */
  const { data: salaryData } = useQuery({
    queryKey: ['salary-this-month'],
    queryFn: () => {
      const now = new Date();
      return api.get('/salary', { params: { month: now.getMonth() + 1, year: now.getFullYear(), limit: 1 } })
        .then(r => r.data?.summary || r.data?.data || null).catch(() => null);
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const summary = useMemo(() => {
    const paid    = invoices.filter((i) => i.status === 'paid');
    const partial = invoices.filter((i) => i.status === 'partial');
    const unpaid  = invoices.filter((i) => i.status === 'unpaid');
    const totalCollected =
      paid.reduce((s, i) => s + (i.paidAmount || 0), 0) +
      partial.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalDue = [...partial, ...unpaid].reduce((s, i) => s + (i.dueAmount || 0), 0);
    const todayTotal = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalExpenses = expensesAll.reduce((s, e) => s + (e.amount || 0), 0);
    return {
      totalCollected,
      totalDue,
      paidCount: paid.length,
      defaulterCount: defaulters.length,
      todayTotal,
      totalExpenses,
    };
  }, [invoices, defaulters, todayPayments, expensesAll]);

  const isUnsettled =
    !lastSheet || lastSheet.status !== 'settled' || lastSheet.date !== todayISO();

  return (
    <div>
      {/* Balancesheet CTA */}
      <div style={{ marginBottom: 18 }}>
        <button
          onClick={() => setActiveTab('balancesheet')}
          style={{
            width: '100%',
            background: isUnsettled
              ? 'linear-gradient(90deg,#B91C1C,#DC2626)'
              : 'linear-gradient(90deg,#065F46,#059669)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={20} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Today's Balancesheet</div>
              <div style={{ fontSize: 12, opacity: 0.88 }}>
                {isUnsettled
                  ? 'UNSETTLED — tap to settle with principal'
                  : "Settled — view today's record"}
              </div>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.22)',
              padding: '4px 10px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {isUnsettled ? 'PENDING' : 'DONE'}
          </div>
        </button>
      </div>

      {/* 6 Stat Cards: green, red, blue, yellow, purple, orange */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatCard
          title="Collection Today"
          value={Rs(summary.todayTotal)}
          sub={`${todayPayments.length} transaction${todayPayments.length !== 1 ? 's' : ''} today`}
          icon={Calendar}
          preset="green"
          badge={isUnsettled ? 'UNSETTLED' : null}
        />
        <StatCard
          title="Outstanding"
          value={Rs(summary.totalDue)}
          sub="Current dues"
          icon={AlertTriangle}
          preset="red"
        />
        <StatCard
          title="Paid Invoices"
          value={summary.paidCount}
          sub="Fully settled"
          icon={Receipt}
          preset="blue"
        />
        <StatCard
          title="Defaulters"
          value={summary.defaulterCount}
          sub="Need reminders"
          icon={PiggyBank}
          preset="yellow"
        />
        <StatCard
          title="Staff Salary"
          value={salaryData ? Rs(salaryData.totalAmount || salaryData.total || 0) : '—'}
          sub={salaryData ? `${salaryData.count || ''} staff this month` : 'View payroll'}
          icon={Users}
          preset="purple"
        />
        <StatCard
          title="Expenses"
          value={Rs(summary.totalExpenses)}
          sub="Today's logged expenses"
          icon={TrendingDown}
          preset="orange"
        />
      </div>

      {/* Action tile grid — white cards with colored icons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <ActionTile
          onClick={() => setActiveTab('collection')}
          title="Collect Fee"
          desc="Search student and post payment"
          icon={Wallet}
          color={NAVY}
        />
        <ActionTile
          to="/fees/defaulters"
          title="Fee Defaulters"
          desc="Review unpaid and partial invoices"
          icon={AlertTriangle}
          color="#DC2626"
        />
        <ActionTile
          onClick={() => setActiveTab('expenses')}
          title="Expenses"
          desc="Log today's school expenses"
          icon={Landmark}
          color="#2563EB"
        />
        <ActionTile
          to="/salary"
          title="Salary & Payroll"
          desc="Issue salaries and manage payroll"
          icon={Receipt}
          color="#7C3AED"
        />
        <ActionTile
          to="/reports"
          title="Financial Reports"
          desc="Income, expenses, and summary reports"
          icon={BarChart3}
          color="#0891B2"
        />
        <ActionTile
          to="/salary/loans"
          title="Staff Loans"
          desc="Monitor active loan deductions"
          icon={Calendar}
          color="#D97706"
        />
      </div>

      {/* Defaulters snapshot */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: '16px 18px',
        }}
      >
        <div style={{ fontSize: 15, color: NAVY, fontWeight: 800, marginBottom: 10 }}>
          Recent Defaulter Snapshot
        </div>
        {defaulters.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>No active defaulters found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Student', 'Roll No', 'Class', 'Due Amount', 'Status'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderBottom: '1px solid #E2E8F0',
                        color: '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {defaulters.slice(0, 8).map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', color: NAVY, fontWeight: 600 }}>
                      {row.student?.name || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>
                      {row.student?.rollNo || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>
                      {row.student?.class?.name || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#B91C1C', fontWeight: 700 }}>
                      {Rs(row.dueAmount)}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        style={{
                          background: row.status === 'partial' ? '#FEF3C7' : '#FEE2E2',
                          color:      row.status === 'partial' ? '#B45309' : '#B91C1C',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DAILY BALANCESHEET TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function BalancesheetTab({ user }) {
  const [date, setDate] = useState(todayISO());
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['bs-payments', date, user?.id],
    queryFn: () =>
      api
        .get('/fees/payments', { params: { accountant: user?.id, date, limit: 500 } })
        .then((r) => r.data.data || []),
    staleTime: 30_000,
    retry: false,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['bs-expenses', date, user?.id],
    queryFn: () =>
      api
        .get('/expenses', { params: { date, by: user?.id } })
        .then((r) => r.data.data || []),
    staleTime: 30_000,
    retry: false,
  });

  const { data: sheetStatus } = useQuery({
    queryKey: ['sheet-status', date],
    queryFn: () =>
      api.get(`/accounting/balancesheet/${date}`).then((r) => r.data.data || null),
    staleTime: 30_000,
    retry: false,
  });

  const { data: prevSheet } = useQuery({
    queryKey: ['prev-sheet'],
    queryFn: () =>
      api.get('/accounting/balancesheet/latest').then((r) => r.data.data || null),
    staleTime: 60_000,
    retry: false,
  });

  const settleMutation = useMutation({
    mutationFn: () => api.post(`/accounting/settle/${date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet-status', date] });
      queryClient.invalidateQueries({ queryKey: ['last-balancesheet'] });
      queryClient.invalidateQueries({ queryKey: ['prev-sheet'] });
    },
  });

  const totalPayments = useMemo(
    () => payments.reduce((s, p) => s + (p.amount || 0), 0),
    [payments]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + (e.amount || 0), 0),
    [expenses]
  );
  const prevUnsettled =
    prevSheet && prevSheet.status !== 'settled' ? prevSheet.cashInHand || 0 : 0;
  const cashInHand = totalPayments - totalExpenses + prevUnsettled;
  const isSettled = sheetStatus?.status === 'settled';
  const printRef = useRef(null);

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <html><head><title>Daily Balancesheet — ${date}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; padding: 24px; }
        h1 { font-size: 22px; font-weight: 900; color: ${NAVY}; }
        h2 { font-size: 14px; color: #64748B; font-weight: 500; margin-bottom: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
        th { background: #F1F5F9; padding: 7px 10px; text-align: left; border-bottom: 2px solid #CBD5E1; font-weight: 700; color: #334155; }
        td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
        .summary-box { border: 2px solid ${NAVY}; border-radius: 10px; padding: 14px 18px; margin-top: 10px; width: 300px; margin-left: auto; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
        .summary-row.total { font-weight: 900; font-size: 15px; border-top: 1px solid #CBD5E1; padding-top: 8px; margin-top: 4px; color: ${NAVY}; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 90px; font-weight: 900; color: rgba(185,28,28,0.09); pointer-events: none; white-space: nowrap; z-index: 0; }
        .school-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${NAVY}; padding-bottom: 10px; margin-bottom: 16px; }
        .status-badge { padding: 3px 12px; border-radius: 99px; font-weight: 800; font-size: 12px; }
        .settled { background: #D1FAE5; color: #065F46; }
        .unsettled { background: #FEE2E2; color: #B91C1C; }
        @media print { .watermark { position: fixed; } }
      </style>
      </head><body>
      ${!isSettled ? '<div class="watermark">UNSETTLED</div>' : ''}
      <div class="school-header">
        <div>
          <h1>Daily Balancesheet</h1>
          <h2>Date: ${fmtDate(date)} &nbsp;|&nbsp; Accountant: ${user?.name || 'N/A'}</h2>
        </div>
        <span class="status-badge ${isSettled ? 'settled' : 'unsettled'}">${isSettled ? 'SETTLED' : 'UNSETTLED'}</span>
      </div>
      <table>
        <thead><tr><th>Roll No</th><th>Student Name</th><th>Class</th><th>Fee Title</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${payments
            .map(
              (p) =>
                `<tr><td>${p.student?.rollNo || '—'}</td><td>${p.student?.name || '—'}</td><td>${p.student?.class?.name || '—'}</td><td>${p.feeTitle || p.invoice?.feeType || '—'}</td><td style="text-align:right;font-weight:700">${Rs(p.amount)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="summary-box">
        <div class="summary-row"><span>Total Payments</span><span><b>${Rs(totalPayments)}</b></span></div>
        <div class="summary-row"><span>Total Expenses</span><span style="color:#B91C1C"><b>- ${Rs(totalExpenses)}</b></span></div>
        <div class="summary-row"><span>Prev. Unsettled</span><span><b>${Rs(prevUnsettled)}</b></span></div>
        <div class="summary-row total"><span>Cash in Hand</span><span>${Rs(cashInHand)}</span></div>
      </div>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            style={{
              border: `1.5px solid ${NAVY}40`,
              borderRadius: 8,
              padding: '7px 10px',
              fontFamily: 'inherit',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 12,
              background: isSettled ? '#D1FAE5' : '#FEE2E2',
              color: isSettled ? '#065F46' : '#B91C1C',
            }}
          >
            {isSettled ? '✓ SETTLED' : '⚠ UNSETTLED'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: NAVY,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <Printer size={14} /> Print
          </button>
          {!isSettled && (user?.role === 'admin' || user?.role === 'accountant') && (
            <button
              onClick={() => settleMutation.mutate()}
              disabled={settleMutation.isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: settleMutation.isPending ? '#94A3B8' : '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: settleMutation.isPending ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <CheckCircle2 size={14} />
              {settleMutation.isPending ? 'Settling…' : 'Mark as Settled'}
            </button>
          )}
        </div>
      </div>

      {/* Payments table */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!isSettled && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: 'rgba(185,28,28,0.07)',
                transform: 'rotate(-30deg)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              UNSETTLED
            </span>
          </div>
        )}
        <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 10 }}>
          Fee Collections — {fmtDate(date)}
          <span style={{ marginLeft: 8, fontSize: 12, color: '#64748B', fontWeight: 500 }}>
            ({payments.length} records)
          </span>
        </div>
        {loadingPayments ? (
          <div style={{ color: '#64748B', fontSize: 13, padding: '20px 0' }}>Loading…</div>
        ) : payments.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>No payments recorded for this date.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Roll No', 'Student Name', 'Class', 'Fee Title', 'Amount Paid'].map(
                    (h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>{h}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.student?.rollNo || '—'}</td>
                    <td style={{ padding: '8px 10px', color: NAVY, fontWeight: 600 }}>{p.student?.name || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.student?.class?.name || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.feeTitle || p.invoice?.feeType || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#059669', fontWeight: 700 }}>{Rs(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary box */}
      <div
        style={{
          background: '#fff',
          border: `2px solid ${NAVY}`,
          borderRadius: 14,
          padding: '16px 20px',
          maxWidth: 380,
          marginLeft: 'auto',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 12 }}>Daily Summary</div>
        {[
          { label: 'Total Payments',       value: Rs(totalPayments),   color: '#059669' },
          { label: 'Total Expenses',       value: `− ${Rs(totalExpenses)}`, color: '#B91C1C' },
          { label: 'Prev. Unsettled Amount', value: Rs(prevUnsettled), color: '#D97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7, color: '#475569' }}>
            <span>{label}</span>
            <span style={{ fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
        <div
          style={{
            borderTop: '1px solid #CBD5E1',
            paddingTop: 10,
            marginTop: 4,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 16,
            fontWeight: 900,
            color: NAVY,
          }}
        >
          <span>Cash in Hand</span>
          <span>{Rs(cashInHand)}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEE COLLECTION TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function FeeCollectionTab({ user }) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payingId, setPayingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: students = [], isFetching } = useQuery({
    queryKey: ['student-search', search],
    queryFn: () =>
      search.trim().length >= 2
        ? api.get('/students', { params: { search: search.trim(), limit: 20 } }).then((r) => r.data.data || [])
        : Promise.resolve([]),
    staleTime: 30_000,
    retry: false,
    enabled: search.trim().length >= 2,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['student-invoices', selectedStudent?.id],
    queryFn: () =>
      api.get('/fees/invoices', { params: { student: selectedStudent.id, limit: 50 } }).then((r) => r.data.data || []),
    enabled: !!selectedStudent?.id,
    staleTime: 30_000,
    retry: false,
  });

  const payMutation = useMutation({
    mutationFn: ({ invoiceId, amount, note }) => {
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) throw new Error('Enter a valid payment amount');
      if (numAmount > 1000000) throw new Error('Amount seems too high — please verify');
      return api.post(`/fees/invoices/${invoiceId}/pay`, { amount: numAmount, note });
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['student-invoices', selectedStudent?.id] });
      queryClient.invalidateQueries({ queryKey: ['today-payments'] });
      queryClient.invalidateQueries({ queryKey: ['bs-payments'] });
      // Auto-print receipt
      const inv = invoices.find(i => i.id === vars.invoiceId);
      if (inv && selectedStudent) {
        printFeeVoucher({ student: selectedStudent, invoice: { ...inv, status: 'paid', dueAmount: 0 }, school: { name: 'IlmForge School' } });
      }
      setPayAmount('');
      setPayNote('');
      setPayingId(null);
    },
  });

  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid');

  return (
    <div>
      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 10 }}>Student Search</div>
        <div style={{ position: 'relative' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedStudent(null); }}
            placeholder="Type name, roll no, or ID (min 2 chars)…"
            style={{ width: '100%', border: `1.5px solid ${NAVY}40`, borderRadius: 8, padding: '9px 10px 9px 32px', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {isFetching && <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>Searching…</div>}

        {students.length > 0 && !selectedStudent && (
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, marginTop: 6, overflow: 'hidden' }}>
            {students.map((s) => (
              <div
                key={s.id}
                onClick={() => { setSelectedStudent(s); setSearch(s.name); }}
                style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <div>
                  <span style={{ fontWeight: 700, color: NAVY }}>{s.name}</span>
                  <span style={{ color: '#64748B', marginLeft: 8 }}>Roll: {s.rollNo}</span>
                </div>
                <span style={{ color: CYAN, fontSize: 12 }}>{s.class?.name || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      {selectedStudent && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: NAVY }}>{selectedStudent.name}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Roll {selectedStudent.rollNo} · {selectedStudent.class?.name}</div>
            </div>
            <button
              onClick={() => { setSelectedStudent(null); setSearch(''); setPayingId(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
            >
              <X size={18} />
            </button>
          </div>

          {loadingInvoices ? (
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading invoices…</div>
          ) : unpaidInvoices.length === 0 ? (
            <div style={{ background: '#DCFCE7', color: '#065F46', borderRadius: 8, padding: '12px 14px', fontSize: 13, fontWeight: 700 }}>
              All invoices cleared — no dues outstanding.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {unpaidInvoices.map((inv) => (
                <div key={inv.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: payingId === inv.id ? 12 : 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{inv.feeType || inv.title || 'Fee Invoice'}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        Due: {Rs(inv.dueAmount || 0)} · Status:{' '}
                        <span style={{ fontWeight: 700, color: inv.status === 'partial' ? '#D97706' : '#B91C1C', textTransform: 'capitalize' }}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setPayingId(payingId === inv.id ? null : inv.id)}
                      style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                    >
                      {payingId === inv.id ? 'Cancel' : 'Pay Now'}
                    </button>
                  </div>

                  {payingId === inv.id && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 120px' }}>
                        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Amount (Rs.)</div>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder={String(inv.dueAmount || '')}
                          style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ flex: '2 1 160px' }}>
                        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Note (optional)</div>
                        <input
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          placeholder="Partial, advance, etc."
                          style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                      <button
                        onClick={() => payMutation.mutate({ invoiceId: inv.id, amount: payAmount || inv.dueAmount, note: payNote })}
                        disabled={payMutation.isPending}
                        style={{ background: payMutation.isPending ? '#94A3B8' : '#059669', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: payMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                      >
                        {payMutation.isPending ? 'Posting…' : 'Confirm Payment'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPENSE LOG TAB
   ═══════════════════════════════════════════════════════════════════════════ */
const EXPENSE_CATEGORIES = [
  'Utilities', 'Stationery', 'Maintenance', 'Salary Advance', 'Transport', 'Rent', 'Miscellaneous',
];

function ExpenseLogTab({ user }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date] = useState(todayISO());
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses-today', date, user?.id],
    queryFn: () =>
      api.get('/expenses', { params: { date, by: user?.id } }).then((r) => r.data.data || []),
    staleTime: 30_000,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api.post('/expenses', { category, amount: Number(amount), description, date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-today'] });
      queryClient.invalidateQueries({ queryKey: ['bs-expenses'] });
      setAmount('');
      setDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-today'] });
      queryClient.invalidateQueries({ queryKey: ['bs-expenses'] });
    },
  });

  const totalToday = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 12 }}>Log New Expense</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 140px' }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, background: '#fff' }}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 1 130px' }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Amount (Rs.)</div>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: '2 1 200px' }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Description</div>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description…"
              style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => addMutation.mutate()} disabled={!amount || addMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: !amount || addMutation.isPending ? '#94A3B8' : NAVY, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: !amount || addMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <Plus size={14} />
            {addMutation.isPending ? 'Saving…' : 'Add'}
          </button>
        </div>
        {addMutation.isError && <div style={{ color: '#B91C1C', fontSize: 12, marginTop: 8 }}>Failed to save expense. Please try again.</div>}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: NAVY }}>Today's Expenses — {fmtDate(date)}</div>
          <div style={{ fontWeight: 700, color: '#B91C1C', fontSize: 13 }}>Total: {Rs(totalToday)}</div>
        </div>

        {isLoading ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading…</div>
        ) : expenses.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>No expenses logged today.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Category', 'Description', 'Amount', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: `${NAVY}12`, color: NAVY, padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>{exp.category}</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{exp.description || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#B91C1C', fontWeight: 700 }}>{Rs(exp.amount)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => { if (window.confirm(`Delete expense of ${Rs(exp.amount)}? This cannot be undone.`)) deleteMutation.mutate(exp.id); }} disabled={deleteMutation.isPending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAYMENT HISTORY TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function PaymentHistoryTab({ user }) {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(todayISO());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payment-history', user?.id, fromDate, toDate],
    queryFn: () =>
      api.get('/fees/payments', {
        params: { accountant: user?.id, fromDate: fromDate || undefined, toDate: toDate || undefined, limit: 200 },
      }).then((r) => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(
      (p) => !q || p.student?.name?.toLowerCase().includes(q) || p.student?.rollNo?.toLowerCase().includes(q) || p.feeTitle?.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExcel = () => {
    // Properly escape CSV values to handle commas/quotes
    const esc = (v) => { const s = String(v ?? '').replace(/"/g, '""'); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s; };
    const rows = [
      ['Date', 'Receipt No', 'Roll No', 'Student', 'Class', 'Fee Title', 'Amount (Rs.)', 'Method', 'Received By'],
      ...filtered.map((p) => [
        p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-PK') : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-PK') : '—'),
        p.receiptNo || p.id || '—',
        p.student?.rollNo || '—',
        p.student?.name || '—',
        p.student?.class?.name || '—',
        p.feeTitle || p.invoice?.feeType || 'Monthly Fee',
        p.amountPaid || p.amount || 0,
        p.method || 'cash',
        p.receivedBy || '—',
      ].map(esc)),
    ];
    const csv = '﻿' + rows.map((r) => r.join(',')).join('\n'); // BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_payments_${fromDate || 'all'}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalAmount = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 180px' }}>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Search</div>
          <div style={{ position: 'relative' }}>
            <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Name, roll no, fee title…"
              style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 10px 7px 26px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>From</div>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
            style={{ border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>To</div>
          <input type="date" value={toDate} max={todayISO()} onChange={(e) => { setToDate(e.target.value); setPage(0); }}
            style={{ border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13 }} />
        </div>
        <button onClick={handleExcel}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16A34A', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: NAVY }}>
            Payment Records
            <span style={{ marginLeft: 8, fontSize: 12, color: '#64748B', fontWeight: 500 }}>({filtered.length} records)</span>
          </div>
          <div style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>Total: {Rs(totalAmount)}</div>
        </div>

        {isLoading ? (
          <div style={{ color: '#64748B', fontSize: 13, padding: '20px 0' }}>Loading…</div>
        ) : pageData.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>No records found.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Date', 'Roll No', 'Student', 'Class', 'Fee Title', 'Amount'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.createdAt ? fmtDate(p.createdAt) : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.student?.rollNo || '—'}</td>
                      <td style={{ padding: '8px 10px', color: NAVY, fontWeight: 600 }}>{p.student?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.student?.class?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.feeTitle || p.invoice?.feeType || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#059669', fontWeight: 700 }}>{Rs(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ background: 'none', border: '1px solid #CBD5E1', borderRadius: 6, padding: '5px 8px', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? '#CBD5E1' : '#475569' }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 12, color: '#64748B' }}>Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{ background: 'none', border: '1px solid #CBD5E1', borderRadius: 6, padding: '5px 8px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', color: page === totalPages - 1 ? '#CBD5E1' : '#475569' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCHOLARSHIP / DISCOUNT TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function ScholarshipTab() {
  const { data: discounted = [], isLoading } = useQuery({
    queryKey: ['discounted-students'],
    queryFn: () => api.get('/fees/discounts').then(r => r.data.data || []).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const totalDiscount = discounted.reduce((s, d) => s + Number(d.discountAmount || d.discount || 0), 0);

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:800, color:NAVY }}>🎓 Scholarships & Discounts</div>
        <div style={{ color:'#64748B', fontSize:13, marginTop:3 }}>Students with fee concessions and scholarship allocations</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Discounted', v:discounted.length, color:'#7c3aed', bg:'#f5f3ff', icon:'🎓' },
          { label:'Total Discount Given', v:`Rs. ${totalDiscount.toLocaleString('en-PK')}`, color:'#15803d', bg:'#f0fdf4', icon:'💰' },
          { label:'Scholarship Types', v:'Merit + Need-based', color:'#0073b7', bg:'#eff6ff', icon:'📋' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.color}22`, borderRadius:10, padding:16, textAlign:'center' }}>
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div style={{ fontSize:s.v.toString().length>8?16:22, fontWeight:800, color:s.color, marginTop:4, lineHeight:1.2 }}>{s.v}</div>
            <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign:'center', padding:32, color:'#94A3B8' }}>Loading discounted students…</div>
      ) : discounted.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'48px', textAlign:'center', color:'#94A3B8' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🎓</div>
          <div style={{ fontWeight:600 }}>No Scholarship Records</div>
          <div style={{ fontSize:13, marginTop:4 }}>Go to Fees → Discounts to add scholarship concessions</div>
        </div>
      ) : (
        <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8f9fa' }}>
                {['Student','Roll No','Class','Discount Type','Amount','Month/Year'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#374151', borderBottom:'2px solid #e2e8f0', fontSize:12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discounted.map((d, i) => (
                <tr key={d.id || i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'10px 14px', fontWeight:600, color:NAVY }}>{d.student?.name || d.studentName || '—'}</td>
                  <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:12, color:'#0D9488' }}>{d.student?.rollNo || '—'}</td>
                  <td style={{ padding:'10px 14px' }}>{d.student?.class?.name || d.className || '—'}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ background:'#f5f3ff', color:'#7c3aed', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                      {d.discountType || d.reason || 'Scholarship'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', fontWeight:700, color:'#15803d' }}>Rs. {Number(d.discountAmount || d.discount || 0).toLocaleString('en-PK')}</td>
                  <td style={{ padding:'10px 14px', color:'#64748b' }}>{d.month ? `${d.month}/${d.year}` : 'All months'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AccountantPortalPage() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user || user.role !== 'accountant') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F1F5F9',
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      {/* ── Header (dark navy) ── */}
      <div
        style={{
          background: NAVY,
          color: '#fff',
          padding: '20px 24px 0',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.65 }}>Finance Portal</div>
              <h1 style={{ margin: '2px 0 4px', fontSize: 24, fontWeight: 900 }}>
                Accountant Workspace
              </h1>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Welcome {user.name || 'Accountant'} ·{' '}
                {new Date().toLocaleDateString('en-PK', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                borderRadius: 9,
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: 700,
                fontFamily: 'inherit',
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: active ? '#fff' : 'transparent',
                    color: active ? NAVY : 'rgba(255,255,255,0.75)',
                    border: 'none',
                    borderRadius: '8px 8px 0 0',
                    padding: '9px 16px',
                    fontWeight: active ? 800 : 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 16px 40px' }}>
        {activeTab === 'dashboard' && <DashboardTab user={user} setActiveTab={setActiveTab} />}
        {activeTab === 'balancesheet' && <BalancesheetTab user={user} />}
        {activeTab === 'collection' && <FeeCollectionTab user={user} />}
        {activeTab === 'expenses' && <ExpenseLogTab user={user} />}
        {activeTab === 'history' && <PaymentHistoryTab user={user} />}
        {activeTab === 'discounts' && <ScholarshipTab />}
      </div>
    </div>
  );
}
