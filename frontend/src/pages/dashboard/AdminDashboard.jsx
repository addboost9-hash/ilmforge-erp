/**
 * IlmForge — Admin / Principal / Owner dashboard.
 *
 * Replaces the previous dashboard. Same coverage as before — every stat,
 * chart, module shortcut and activity feed the old page had is still here —
 * but arranged so an owner can read the state of the school in one screen
 * instead of scrolling a wall of coloured tiles.
 *
 * Structure, top to bottom:
 *   hero band                   greeting, and what is still left to do today
 *   quick actions               the daily jobs, chosen by the admin
 *   health ring (hero)          the one memorable element, self-explaining
 *   KPI row                     today's operational facts
 *   money                       revenue vs expense over the window
 *   insights                    switches itself on as history accumulates
 *   everything else             modules, reports, class attendance, activity
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Printer, Users, UserCheck, Wallet, AlertTriangle, GraduationCap,
  TrendingUp, ArrowRight, ClipboardCheck, UserPlus,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { moneyShort, fromPaisa } from '../../utils/currency';
import { printSection } from '../../utils/print';
import WidgetShell from '../../components/dashboard/WidgetShell';
import HealthRing from '../../components/dashboard/HealthRing';
import DriverBars from '../../components/dashboard/DriverBars';
import QuickActions from '../../components/dashboard/QuickActions';
import '../../styles/dashboard-tokens.css';

/* Shortcuts. Keeps every destination the old dashboard exposed reachable in
   one click, grouped rather than listed as twenty equal tiles. */
const MODULES = [
  { group: 'Daily', items: [
    { label: 'Admissions',      to: '/admissions/wizard' },
    { label: 'Collect fee',     to: '/fees/collect' },
    { label: 'Attendance',      to: '/attendance-hub' },
    { label: 'Students',        to: '/students' },
    { label: 'Staff',           to: '/staff' },
  ]},
  { group: 'Money', items: [
    { label: 'Invoices',        to: '/fees/invoices' },
    { label: 'Defaulters',      to: '/fees/defaulters' },
    { label: 'Expenses',        to: '/expenses' },
    { label: 'Accounts',        to: '/accounts' },
    { label: 'Payroll',         to: '/payroll' },
  ]},
  { group: 'Academics', items: [
    { label: 'Exam Vault',      to: '/examination' },
    { label: 'Timetable',       to: '/timetable' },
    { label: 'Publish results', to: '/exams/publication' },
    { label: 'ID cards',        to: '/id-cards' },
    { label: 'Certificates',    to: '/certificates' },
  ]},
  { group: 'Reports', items: [
    { label: 'Reports hub',     to: '/reports-hub' },
    { label: 'Insights',        to: '/reports' },
    { label: 'Collection report', to: '/fees/collection-report' },
    { label: 'Attendance report', to: '/attendance/report' },
    { label: 'Portal links',    to: '/settings/portal-links' },
  ]},
];

const greet = (name) => `Assalam-o-Alaikum, ${name || 'there'}`;

const pctOf = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dash-admin-overview'],
    queryFn: () => api.get('/dashboard/admin/overview', { params: { months: 12 } }).then(r => r.data.data),
    staleTime: 60_000,
    retry: 1,
  });

  const d = data || {};
  const k = d.kpis || {};
  const fin = d.finance || {};
  const caps = d.capabilities || {};

  const chart = useMemo(
    () => (fin.series || []).map(m => ({
      month: m.label.split(' ')[0],
      Revenue: fromPaisa(m.revenue),
      Expense: fromPaisa(m.expense),
      Net: fromPaisa(m.net),
    })),
    [fin.series],
  );

  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const KPIS = [
    { label: 'Students',        value: k.students ?? '—',                 to: '/students',         Icon: Users,         tone: 'people' },
    { label: 'Staff',           value: k.staff ?? '—',                    to: '/staff',            Icon: GraduationCap, tone: 'people' },
    { label: 'Collected today', value: moneyShort(k.collectedToday),      to: '/hub/fees?tab=collect', Icon: Wallet,    tone: 'fee' },
    { label: 'This month',      value: moneyShort(k.collectedThisMonth),  to: '/fees/collection-report', Icon: TrendingUp, tone: 'fee' },
    { label: 'Outstanding',     value: moneyShort(k.outstanding),         to: '/fees/defaulters',  Icon: AlertTriangle, tone: 'fee', warn: k.outstanding > 0 },
    { label: 'Unpaid invoices', value: k.defaulters ?? '—',               to: '/fees/invoices',    Icon: UserCheck,     tone: 'fee' },
  ];

  /* What is still left to do today. */
  const tStu = k.today?.students || { marked: 0 };
  const tStaff = k.today?.staff || { marked: 0 };
  const stuLeft = Math.max(0, (k.students || 0) - tStu.marked);
  const staffLeft = Math.max(0, (k.staff || 0) - tStaff.marked);
  const TODAY = [
    {
      label: 'Student attendance',
      value: isLoading ? '…' : `${tStu.marked} / ${k.students ?? 0}`,
      note: isLoading ? '' : stuLeft > 0 ? `${stuLeft} not marked yet` : `${tStu.present || 0} present · ${tStu.absent || 0} absent`,
      todo: !isLoading && stuLeft > 0,
      pct: pctOf(tStu.marked, k.students),
      to: '/attendance',
    },
    {
      label: 'Staff attendance',
      value: isLoading ? '…' : `${tStaff.marked} / ${k.staff ?? 0}`,
      note: isLoading ? '' : staffLeft > 0 ? `${staffLeft} not marked yet` : `${tStaff.present || 0} present`,
      todo: !isLoading && staffLeft > 0,
      pct: pctOf(tStaff.marked, k.staff),
      to: '/attendance/staff',
    },
    {
      label: 'Fee collected today',
      value: isLoading ? '…' : moneyShort(k.collectedToday),
      note: isLoading ? '' : `${moneyShort(k.collectedThisMonth)} this month`,
      to: '/hub/fees?tab=collect',
    },
  ];

  const net = fin.net ?? 0;

  return (
    <div className="ilm-dash" id="admin-dashboard" style={{ padding: 18 }}>

      {/* ── Hero: greeting + today ──────────────────────────────── */}
      <header className="d-hero d-enter" style={{ marginBottom: 14 }}>
        <div>
          <h1>{greet(user?.name?.split(' ')[0])}</h1>
          <div className="d-hero-sub">{today}</div>
          <div className="d-hero-actions d-no-print">
            <Link className="d-btn d-btn-accent" to="/attendance"><ClipboardCheck size={15} /> Mark attendance</Link>
            <Link className="d-btn" to="/hub/fees?tab=collect"><Wallet size={15} /> Collect fee</Link>
            <Link className="d-btn" to="/admissions/wizard"><UserPlus size={15} /> Admission</Link>
            <button
              className="d-btn"
              onClick={() => printSection(document.getElementById('admin-dashboard'), {
                title: `Dashboard — ${new Date().toLocaleDateString('en-PK')}`,
              })}
            >
              <Printer size={15} /> Export PDF
            </button>
          </div>
        </div>
        <div className="d-today" aria-label="Today">
          {TODAY.map(t => (
            <Link key={t.label} to={t.to} className="d-today-item">
              <span className="d-today-label">{t.label}</span>
              <span className="d-today-value">{t.value}</span>
              {t.pct !== undefined && <span className="d-bar" aria-hidden="true"><span style={{ width: `${t.pct}%` }} /></span>}
              <span className={`d-today-note ${t.todo ? 'is-todo' : ''}`}>{t.note}</span>
            </Link>
          ))}
        </div>
      </header>

      {/* ── Quick actions ────────────────────────────────────────── */}
      <QuickActions userId={user?.id} />

      {/* ── Hero: health ─────────────────────────────────────────── */}
      <div className="d-enter" style={{ marginBottom: 14 }}>
        <WidgetShell
          title="School health"
          subtitle="Weighted from collection, attendance, retention, staffing and margin"
          loading={isLoading}
          error={error ? 'The dashboard summary could not be loaded. Check that the server is running, then try again.' : null}
          onRetry={refetch}
          skeletonRows={4}
        >
          <HealthRing health={d.health} />
        </WidgetShell>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div className="d-grid" style={{ marginBottom: 14 }}>
        {KPIS.map(({ label, value, to, Icon, warn, tone }) => (
          <Link key={label} to={to} className={`d-panel d-tone-${tone}`} style={{ textDecoration: 'none', display: 'block' }}>
            {isLoading ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div className="d-skel" style={{ height: 22, width: '60%' }} />
                <div className="d-skel" style={{ height: 10, width: '40%' }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="d-metric" style={warn ? { color: 'var(--d-loss)' } : undefined}>{value}</div>
                  <span className="d-kpi-icon"><Icon size={15} /></span>
                </div>
                <div className="d-metric-label">{label}</div>
              </>
            )}
          </Link>
        ))}
      </div>

      {/* ── Money ────────────────────────────────────────────────── */}
      <div className="d-cols-2" style={{ marginBottom: 14 }}>
        <WidgetShell
          title="Revenue and expenses"
          subtitle={`Last ${fin.windowMonths || 12} months`}
          loading={isLoading}
          error={error ? 'Financial figures are unavailable right now.' : null}
          onRetry={refetch}
          empty={!isLoading && !error && chart.length === 0}
          emptyTitle="No money recorded yet"
          emptyHint="Collect a fee or record an expense and this chart starts building."
          emptyAction={<Link className="d-btn d-btn-primary" to="/fees/collect">Collect a fee</Link>}
        >
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-line)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip
                  formatter={(v, n) => [`Rs ${Number(v).toLocaleString('en-PK')}`, n]}
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--d-line)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenue" fill="var(--d-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="var(--d-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
            <div>
              <div className="d-metric" style={{ fontSize: 19 }}>{moneyShort(fin.revenue)}</div>
              <div className="d-metric-label">Collected</div>
            </div>
            <div>
              <div className="d-metric" style={{ fontSize: 19 }}>{moneyShort(fin.expense)}</div>
              <div className="d-metric-label">Spent</div>
            </div>
            <div>
              <div className={`d-metric ${net >= 0 ? 'd-profit' : 'd-loss'}`} style={{ fontSize: 19 }}>
                {moneyShort(net)}
              </div>
              <div className="d-metric-label">{net >= 0 ? 'Net surplus' : 'Net loss'}</div>
            </div>
          </div>
        </WidgetShell>

        {/* Insights switch themselves on as history accrues. */}
        <WidgetShell
          title="Why this result?"
          subtitle="Month-on-month drivers"
          loading={isLoading}
          error={error ? 'Driver analysis is unavailable right now.' : null}
          onRetry={refetch}
          needsData={caps.variance && !d.explanation ? {
            ...caps.variance,
            what: 'Comparing one month against the last needs two complete months of both fees and expenses.',
          } : null}
        >
          <DriverBars explanation={d.explanation} />
        </WidgetShell>
      </div>

      {/* ── Forecast ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <WidgetShell
          title="Forecast"
          subtitle={caps.forecast?.model === 'linear+seasonal'
            ? 'Trend with Pakistani school seasonality'
            : caps.forecast?.model === 'linear' ? 'Trend only — seasonality needs 24 months' : undefined}
          loading={isLoading}
          error={error ? 'The forecast could not be produced.' : null}
          onRetry={refetch}
          needsData={caps.forecast && {
            ...caps.forecast,
            what: 'A forecast needs enough history to separate a trend from a single unusual month.',
          }}
        >
          <div className="d-state-hint">Projection arrives in the next phase.</div>
        </WidgetShell>
      </div>

      {/* ── Everything else, still one click away ────────────────── */}
      <WidgetShell title="All modules and reports" subtitle="Everything the school runs on">
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          {MODULES.map(({ group, items }) => (
            <div key={group}>
              <div style={{
                fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase',
                color: 'var(--d-muted)', marginBottom: 8, fontWeight: 600,
              }}>{group}</div>
              <div style={{ display: 'grid', gap: 2 }}>
                {items.map(it => (
                  <Link key={it.to} to={it.to}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 9px', borderRadius: 'var(--d-r-sm)', fontSize: 13,
                      color: 'var(--d-ink)', textDecoration: 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--d-primary-soft)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {it.label}
                    <ArrowRight size={13} style={{ color: 'var(--d-muted)' }} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </WidgetShell>
    </div>
  );
}
