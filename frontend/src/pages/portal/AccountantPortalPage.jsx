/**
 * IlmForge — Accountant Portal  (Enterprise Theme)
 * Dark navy #1B2F6E header
 * 6 stat cards: Collection Today (green), Outstanding (red), Paid Invoices (blue),
 *               Defaulters (yellow), Staff Salary (purple), Expenses (orange)
 * Action tile grid: white background with colored icon
 */
import { useMemo, useState, useCallback } from 'react';
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
import { feePeriod, byPeriodDesc } from '../../utils/feeMonth';
import { toPaisa } from '../../utils/currency';

/* ── Enterprise theme tokens ─────────────────────────────── */
const NAVY = '#1B2F6E';
const CYAN = '#00c0ef';

/* ─── helpers ──────────────────────────────────────────────────────────── */
// Every amount on this portal (fees, expenses, salaries) is stored in paisa.
// It was printed straight out, so dues and totals read 100 times too large.
const Rs = (v) => `Rs. ${(Number(v || 0) / 100).toLocaleString('en-PK')}`;
// Pakistan's today (UTC+5 all year), whatever zone the PC clock is set to.
// The UTC date is still yesterday until 5 a.m. here, which showed today's
// sheet as unsettled and offered yesterday in the date pickers.
const todayISO = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
/** YYYY-MM-DD -> DD/MM/YYYY, as dates are written in Pakistan. */
const dmy = (ymd) => String(ymd || '').slice(0, 10).split('-').reverse().join('/');
/** "Monthly Fee Of Jul (July 2026)": the bill and the month it is for. */
const feeLabel = (inv) => {
  const period = feePeriod(inv);
  return `${inv?.feeTitle || 'Fee'}${period ? ` (${period})` : ''}`;
};
/** The server's reason for a refused request, or a check made on this page.
    A bare network error's text ("Request failed with status code 500") is
    no use to an accountant, so that gets the fallback. */
const errorText = (err, fallback) =>
  err?.response?.data?.message || (err && !err.isAxiosError && err.message) || fallback;

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

  // Today's sheet for this accountant. "Collection Today" is read from it so
  // the card and the Daily Balancesheet tab agree: cash keyed in today,
  // including a fee entered today for an earlier day. (The card summed a
  // field the payments list does not have, so it always read Rs 0.)
  const { data: lastSheet } = useQuery({
    queryKey: ['last-balancesheet'],
    queryFn: () =>
      api.get('/reports/accounting/balancesheet/latest').then((r) => r.data.data || null),
    staleTime: 60_000,
    retry: false,
  });
  const todayPayments = lastSheet?.payments || [];

  // The server's total of every expense dated today; adding up the rows
  // counted only the first page of 25.
  const { data: expensesToday } = useQuery({
    queryKey: ['expenses-all-today'],
    queryFn: () =>
      api.get('/expenses', { params: { date: todayISO(), limit: 1 } }).then((r) => r.data),
    staleTime: 60_000,
    retry: false,
  });

  /* Staff salary — current month total */
  // FIX: GET /salary returns a plain array of SalaryRecord rows under `data`
  // — there is no `.summary` field. This previously fell back to that raw
  // array and then read `.totalAmount`/`.total`/`.count` on it (none of
  // which exist on an array), so the "Staff Salary" stat card always showed
  // Rs. 0 with a blank staff count even when salary records existed.
  const { data: salaryData } = useQuery({
    queryKey: ['salary-this-month'],
    queryFn: () => {
      const now = new Date();
      return api.get('/salary', { params: { month: now.getMonth() + 1, year: now.getFullYear() } })
        .then(r => {
          const records = r.data?.data || [];
          return { totalAmount: records.reduce((s, rec) => s + (rec.netSalary || 0), 0), count: records.length };
        }).catch(() => null);
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
    const todayTotal = lastSheet?.summary?.todayCollected || 0;
    const totalExpenses = expensesToday?.totalAmount || 0;
    return {
      totalCollected,
      totalDue,
      paidCount: paid.length,
      defaulterCount: defaulters.length,
      todayTotal,
      totalExpenses,
    };
  }, [invoices, defaulters, lastSheet, expensesToday]);

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

  // The server works the sheet out. Cash is counted by the day it was
  // ENTERED, so a fee keyed in today for an earlier day is in today's hand
  // (listed with its own date), and what a settlement handed over is taken
  // off. Adding it up here by payment date put late entries on days already
  // handed over, counted today's cash twice as "previous", and read fields
  // the payments list does not have, so every total read Rs 0.
  const { data: sheet, isLoading } = useQuery({
    queryKey: ['bs-sheet', date, user?.id],
    queryFn: () =>
      api.get(`/reports/accounting/balancesheet/${date}`).then((r) => r.data.data || null),
    staleTime: 30_000,
    retry: false,
  });

  const settleMutation = useMutation({
    mutationFn: () => api.post('/reports/accounting/settle', { accountantId: user?.id, date }),
    onSuccess: () => {
      // Settling a day also changes what later days carry in.
      queryClient.invalidateQueries({ queryKey: ['bs-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['last-balancesheet'] });
    },
  });

  const payments = sheet?.payments || [];
  const expenses = sheet?.expenses || [];
  const totalPayments = sheet?.summary?.todayCollected || 0;
  const totalExpenses = sheet?.summary?.todayExpenses || 0;
  const prevUnsettled = sheet?.summary?.previousUnsettled || 0;
  const handedOver = sheet?.summary?.handedOver || 0;
  const cashInHand = sheet?.cashInHand || 0;
  const lateEntries = sheet?.summary?.backdated || 0;
  const isSettled = sheet?.status === 'settled';
  const [confirming, setConfirming] = useState(false);
  const settleError = settleMutation.error ? errorText(settleMutation.error, 'The sheet could not be settled. Try again.') : '';

  const handlePrint = () => {
    // Names and notes come from the database; keep them as text in the printout.
    const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html><head><title>Daily Balancesheet — ${dmy(date)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; padding: 24px; }
        h1 { font-size: 22px; font-weight: 900; color: ${NAVY}; }
        h2 { font-size: 14px; color: #64748B; font-weight: 500; margin-bottom: 18px; }
        h3 { font-size: 13px; color: ${NAVY}; margin: 6px 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
        th { background: #F1F5F9; padding: 7px 10px; text-align: left; border-bottom: 2px solid #CBD5E1; font-weight: 700; color: #334155; }
        td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
        .late { color: #B45309; font-size: 11px; }
        .summary-box { border: 2px solid ${NAVY}; border-radius: 10px; padding: 14px 18px; margin-top: 10px; width: 320px; margin-left: auto; }
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
          <h2>Date: ${dmy(date)} &nbsp;|&nbsp; Accountant: ${esc(user?.name || 'N/A')}</h2>
        </div>
        <span class="status-badge ${isSettled ? 'settled' : 'unsettled'}">${isSettled ? 'SETTLED' : 'UNSETTLED'}</span>
      </div>
      <h3>Fees received</h3>
      <table>
        <thead><tr><th>Receipt</th><th>Roll No</th><th>Student</th><th>Class</th><th>Fee</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${payments.length ? payments.map((p) => `<tr>
            <td>${esc(p.receiptNo || '—')}</td>
            <td>${esc(p.invoice?.student?.rollNo || '—')}</td>
            <td>${esc(p.invoice?.student?.name || '—')}${p.backdated ? `<div class="late">Dated ${dmy(p.datedOn)}</div>` : ''}</td>
            <td>${esc(p.invoice?.student?.class?.name || '—')}</td>
            <td>${esc(feeLabel(p.invoice))}</td>
            <td style="text-align:right;font-weight:700">${Rs(p.amountPaid)}</td></tr>`).join('') : '<tr><td colspan="6">No fees entered on this day.</td></tr>'}
        </tbody>
      </table>
      ${expenses.length ? `<h3>Paid out</h3>
      <table>
        <thead><tr><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${expenses.map((e) => `<tr><td>${esc(e.category || '—')}</td><td>${esc(e.description || '—')}${e.backdated ? `<div class="late">Dated ${dmy(e.datedOn)}</div>` : ''}</td><td style="text-align:right;font-weight:700">${Rs(e.amount)}</td></tr>`).join('')}</tbody>
      </table>` : ''}
      <div class="summary-box">
        <div class="summary-row"><span>Carried in (not yet handed over)</span><span><b>${Rs(prevUnsettled)}</b></span></div>
        <div class="summary-row"><span>Fees received</span><span><b>${Rs(totalPayments)}</b></span></div>
        <div class="summary-row"><span>Paid out</span><span style="color:#B91C1C"><b>- ${Rs(totalExpenses)}</b></span></div>
        ${handedOver ? `<div class="summary-row"><span>Handed over</span><span><b>- ${Rs(handedOver)}</b></span></div>` : ''}
        <div class="summary-row total"><span>Cash in hand</span><span>${Rs(cashInHand)}</span></div>
      </div>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  };

  const cell = { padding: '8px 10px' };
  const head = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 };
  const lateTag = (row) => row.backdated && (
    <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>Dated {dmy(row.datedOn)}</div>
  );

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
            onChange={(e) => { setDate(e.target.value || todayISO()); setConfirming(false); settleMutation.reset(); }}
            aria-label="Day of the balance sheet"
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handlePrint}
            disabled={isLoading}
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
          {!isSettled && !isLoading && (user?.role === 'admin' || user?.role === 'accountant') && (
            confirming ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' }}>
                Hand over {Rs(cashInHand)} for {dmy(date)}?
                <button
                  onClick={() => settleMutation.mutate(undefined, { onSuccess: () => setConfirming(false) })}
                  disabled={settleMutation.isPending}
                  style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  {settleMutation.isPending ? 'Settling…' : 'Yes, settle'}
                </button>
                <button
                  onClick={() => { setConfirming(false); settleMutation.reset(); }}
                  disabled={settleMutation.isPending}
                  style={{ background: '#fff', color: '#334155', border: '1px solid #CBD5E1', borderRadius: 8, padding: '7px 12px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#059669',
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
                <CheckCircle2 size={14} /> Mark as Settled
              </button>
            )
          )}
        </div>
      </div>
      {settleError && (
        <div role="alert" style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{settleError}</div>
      )}
      {lateEntries > 0 && (
        <div style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
          {lateEntries === 1 ? '1 entry made on this day carries' : `${lateEntries} entries made on this day carry`} an earlier date. It is counted
          in this day's cash because the money was entered, and is still in hand, on this day.
        </div>
      )}

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
          Fees received — {fmtDate(date)}
          <span style={{ marginLeft: 8, fontSize: 12, color: '#64748B', fontWeight: 500 }}>
            ({payments.length} {payments.length === 1 ? 'receipt' : 'receipts'})
          </span>
        </div>
        {isLoading ? (
          <div style={{ color: '#64748B', fontSize: 13, padding: '20px 0' }}>Loading…</div>
        ) : payments.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>No fees entered on this day.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Receipt', 'Roll No', 'Student Name', 'Class', 'Fee', 'Amount Paid'].map((h) => (
                    <th key={h} style={head}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ ...cell, color: '#64748B', fontFamily: 'monospace', fontSize: 11.5 }}>{p.receiptNo || '—'}</td>
                    <td style={{ ...cell, color: '#64748B' }}>{p.invoice?.student?.rollNo || '—'}</td>
                    <td style={{ ...cell, color: NAVY, fontWeight: 600 }}>{p.invoice?.student?.name || '—'}{lateTag(p)}</td>
                    <td style={{ ...cell, color: '#64748B' }}>{p.invoice?.student?.class?.name || '—'}</td>
                    <td style={{ ...cell, color: '#64748B' }}>{feeLabel(p.invoice)}</td>
                    <td style={{ ...cell, color: '#059669', fontWeight: 700 }}>{Rs(p.amountPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenses paid out of the same cash */}
      {expenses.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 10 }}>
            Paid out — {fmtDate(date)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Category', 'Description', 'Amount'].map((h) => <th key={h} style={head}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ ...cell, color: '#64748B' }}>{e.category || '—'}</td>
                    <td style={{ ...cell, color: NAVY }}>{e.description || '—'}{lateTag(e)}</td>
                    <td style={{ ...cell, color: '#B91C1C', fontWeight: 700 }}>{Rs(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          { label: 'Carried in (not yet handed over)', value: Rs(prevUnsettled), color: '#D97706' },
          { label: 'Fees received', value: Rs(totalPayments), color: '#059669' },
          { label: 'Paid out', value: `− ${Rs(totalExpenses)}`, color: '#B91C1C' },
          ...(handedOver ? [{ label: 'Handed over', value: `− ${Rs(handedOver)}`, color: '#475569' }] : []),
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
  const [payDate, setPayDate] = useState(todayISO());
  const [payingId, setPayingId] = useState(null);
  const queryClient = useQueryClient();
  const backdated = payDate && payDate !== todayISO();

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
      api.get('/fees/invoices', { params: { studentId: selectedStudent.id, limit: 50 } }).then((r) => r.data.data || []),
    enabled: !!selectedStudent?.id,
    staleTime: 30_000,
    retry: false,
  });

  const payMutation = useMutation({
    // FIX: POST /fees/invoices/:id/pay does not exist on the backend — the
    // real endpoint is POST /fees/payments with { invoiceId, amountPaid,
    // ... } (see fee.routes.js). Every "Confirm Payment" click here 404'd,
    // making the Accountant Portal's core "Collect Fee" feature a dead end.
    mutationFn: ({ invoiceId, amount, note }) => {
      // `amount` is what the accountant typed, in rupees; `amountPaisa` is the
      // full due when they left the box empty. The typed figure used to be
      // sent as paisa, so a Rs 3,500 payment was recorded as Rs 35.
      const paisa = amount.paisa != null
        ? amount.paisa
        : Math.round(Number(amount.rupees) * 100);
      if (!paisa || paisa <= 0) throw new Error('Enter a valid payment amount');
      if (paisa > 1000000 * 100) throw new Error('Amount seems too high — please verify');
      return api.post('/fees/payments', {
        invoiceId, amountPaid: paisa, method: 'cash', remarks: note || undefined,
        // Money received on an earlier day is filed on that day; the parent is
        // not sent a "received today" message for it.
        paymentDate: payDate,
        ...(backdated && { notifyVia: 'none' }),
      });
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['student-invoices', selectedStudent?.id] });
      queryClient.invalidateQueries({ queryKey: ['bs-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['last-balancesheet'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      // Auto-print receipt
      const inv = invoices.find(i => i.id === vars.invoiceId);
      if (inv && selectedStudent) {
        // The receipt states what is actually left to pay. It used to say
        // "paid, nothing due" even after a part payment, and named the
        // school "IlmForge School".
        const result = res?.data?.data || {};
        const { school: authSchool } = useAuthStore.getState();
        printFeeVoucher({
          student: selectedStudent,
          invoice: {
            ...inv,
            status: result.newStatus || inv.status,
            dueAmount: result.newDue != null ? result.newDue : inv.dueAmount,
          },
          school: { name: authSchool?.name || localStorage.getItem('registeredSchoolName') || 'School' },
        });
      }
      setPayAmount('');
      setPayNote('');
      setPayDate(todayISO());
      setPayingId(null);
    },
  });

  // Newest month first: text order put "9" after "12".
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid').sort(byPeriodDesc);

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
            <button aria-label="Close"
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
                      <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{feeLabel(inv)}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        Due: {Rs(inv.dueAmount || 0)} · Status:{' '}
                        <span style={{ fontWeight: 700, color: inv.status === 'partial' ? '#D97706' : '#B91C1C', textTransform: 'capitalize' }}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setPayingId(payingId === inv.id ? null : inv.id); setPayDate(todayISO()); payMutation.reset(); }}
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
                          placeholder={String((inv.dueAmount || 0) / 100)}
                          style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ flex: '0 1 150px' }}>
                        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Payment date</div>
                        <input
                          type="date"
                          value={payDate}
                          max={todayISO()}
                          onChange={(e) => setPayDate(e.target.value || todayISO())}
                          aria-label="Payment date"
                          style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '6px 8px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }}
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
                        onClick={() => payMutation.mutate({
                          invoiceId: inv.id,
                          amount: payAmount ? { rupees: payAmount } : { paisa: inv.dueAmount },
                          note: payNote,
                        })}
                        disabled={payMutation.isPending}
                        style={{ background: payMutation.isPending ? '#94A3B8' : '#059669', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: payMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                      >
                        {payMutation.isPending ? 'Posting…' : 'Confirm Payment'}
                      </button>
                      {backdated && (
                        <div style={{ flexBasis: '100%', fontSize: 12, color: '#92400E' }}>
                          Filed on {dmy(payDate)}, the day the money was received. The parent is not sent a message for an earlier date.
                        </div>
                      )}
                      {payMutation.isError && (
                        <div role="alert" style={{ flexBasis: '100%', fontSize: 12, color: '#B91C1C' }}>
                          {errorText(payMutation.error, 'The payment could not be saved. Try again.')}
                        </div>
                      )}
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
  // The day the money was spent: today, or an earlier day entered late.
  const [date, setDate] = useState(todayISO());
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const queryClient = useQueryClient();
  // Each expense comes out of this person's cash on the day it is entered.
  const refreshCash = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses-today'] });
    queryClient.invalidateQueries({ queryKey: ['expenses-all-today'] });
    queryClient.invalidateQueries({ queryKey: ['bs-sheet'] });
    queryClient.invalidateQueries({ queryKey: ['last-balancesheet'] });
  };

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses-today', date, user?.id],
    queryFn: () =>
      api.get('/expenses', { params: { date, by: user?.id } }).then((r) => r.data.data || []),
    staleTime: 30_000,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      // Rupees typed -> paisa stored, as the main Expenses page does.
      api.post('/expenses', { category, amount: toPaisa(amount), description, date }),
    onSuccess: () => {
      refreshCash();
      setAmount('');
      setDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { refreshCash(); setConfirmingDelete(null); },
  });

  const totalToday = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 12 }}>Log New Expense</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 1 150px' }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>Date</div>
            <input type="date" value={date} max={todayISO()} aria-label="Date of the expense"
              onChange={(e) => setDate(e.target.value || todayISO())}
              style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 8px', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
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
        {addMutation.isError && <div role="alert" style={{ color: '#B91C1C', fontSize: 12, marginTop: 8 }}>{errorText(addMutation.error, 'The expense could not be saved. Try again.')}</div>}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: NAVY }}>{date === todayISO() ? "Today's Expenses" : 'Expenses dated'} — {fmtDate(date)}</div>
          <div style={{ fontWeight: 700, color: '#B91C1C', fontSize: 13 }}>Total: {Rs(totalToday)}</div>
        </div>

        {isLoading ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading…</div>
        ) : expenses.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>No expenses logged for this day.</div>
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
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {confirmingDelete === exp.id ? (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                          Delete {Rs(exp.amount)}?
                          <button onClick={() => deleteMutation.mutate(exp.id)} disabled={deleteMutation.isPending}
                            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                          </button>
                          <button onClick={() => setConfirmingDelete(null)} disabled={deleteMutation.isPending}
                            style={{ background: '#fff', color: '#334155', border: '1px solid #CBD5E1', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Keep
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmingDelete(exp.id)} disabled={deleteMutation.isPending}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }} title="Delete" aria-label={`Delete expense of ${Rs(exp.amount)}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
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
    // FIX: backend expects `from`/`to`, not `fromDate`/`toDate` — the date
    // range filter here was a complete no-op, so changing the From/To pickers
    // never actually narrowed the results.
    queryFn: () =>
      api.get('/fees/payments', {
        params: { accountant: user?.id, from: fromDate || undefined, to: toDate || undefined, limit: 200 },
      }).then((r) => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  // Each row is a receipt; the student and the bill are on its invoice.
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((p) => {
      const st = p.invoice?.student;
      return !q || st?.name?.toLowerCase().includes(q) || st?.rollNo?.toLowerCase().includes(q)
        || p.invoice?.feeTitle?.toLowerCase().includes(q) || p.receiptNo?.toLowerCase().includes(q);
    });
  }, [payments, search]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExcel = () => {
    // Properly escape CSV values to handle commas/quotes
    const esc = (v) => { const s = String(v ?? '').replace(/"/g, '""'); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s; };
    const rows = [
      ['Date', 'Receipt No', 'Roll No', 'Student', 'Class', 'Fee', 'Amount (Rs.)', 'Method', 'Received By', 'Entered On', 'Status'],
      ...filtered.map((p) => [
        fmtDate(p.paymentDate || p.createdAt),
        p.receiptNo || p.id || '—',
        p.invoice?.student?.rollNo || '—',
        p.invoice?.student?.name || '—',
        p.invoice?.student?.class?.name || '—',
        feeLabel(p.invoice),
        (p.amountPaid || 0) / 100,
        p.method || 'cash',
        p.receivedByUser?.name || '—',
        p.createdAt ? fmtDate(p.createdAt) : '—',
        p.voidedAt ? 'Voided' : 'Paid',
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

  // A voided receipt stays listed (it is part of the record) but is not money.
  const totalAmount = filtered.filter((p) => !p.voidedAt).reduce((s, p) => s + (p.amountPaid || 0), 0);

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
                    {['Date', 'Receipt', 'Roll No', 'Student', 'Class', 'Fee', 'Amount'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', opacity: p.voidedAt ? 0.55 : 1 }}>
                      <td style={{ padding: '8px 10px', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(p.paymentDate || p.createdAt)}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B', fontFamily: 'monospace', fontSize: 11.5 }}>{p.receiptNo || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.invoice?.student?.rollNo || '—'}</td>
                      <td style={{ padding: '8px 10px', color: NAVY, fontWeight: 600 }}>{p.invoice?.student?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.invoice?.student?.class?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{feeLabel(p.invoice)}</td>
                      <td style={{ padding: '8px 10px', color: p.voidedAt ? '#94A3B8' : '#059669', fontWeight: 700, textDecoration: p.voidedAt ? 'line-through' : 'none' }}>
                        {Rs(p.amountPaid)}{p.voidedAt ? <span style={{ marginLeft: 6, fontSize: 11, textDecoration: 'none' }}>Voided</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button aria-label="Previous" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ background: 'none', border: '1px solid #CBD5E1', borderRadius: 6, padding: '5px 8px', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? '#CBD5E1' : '#475569' }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 12, color: '#64748B' }}>Page {page + 1} of {totalPages}</span>
                <button aria-label="Next" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
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
