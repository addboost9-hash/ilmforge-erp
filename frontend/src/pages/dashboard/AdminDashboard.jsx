/**
 * IlmForge — Admin / Principal / Owner dashboard.
 *
 * Same visual language as the Reports Hub (navy banner, gradient feature
 * cards, category cards with coloured header bands), arranged so an owner
 * can see what needs doing today before anything else.
 *
 * Structure, top to bottom:
 *   banner                      school, greeting, the three daily buttons
 *   today                       student attendance, staff attendance, fees
 *   needs attention             only what is actually wrong right now
 *   quick actions               the daily jobs, chosen by the admin
 *   KPI row                     the school in six numbers
 *   health + money              score with reasons; revenue vs expense
 *   insights + forecast         switch themselves on as history accrues
 *   all modules                 every area, grouped like the Reports Hub
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Printer, Users, UserCheck, Wallet, AlertTriangle, GraduationCap,
  TrendingUp, ClipboardCheck, UserPlus, LayoutDashboard, RefreshCw,
  ChevronRight, CalendarCheck, Receipt, BookOpen, BarChart3, FileWarning,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ComposedChart, Line,
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

/* Every area of the school, grouped the way the Reports Hub groups reports. */
const MODULES = [
  { group: 'Daily work', tone: 'att', Icon: CalendarCheck, items: [
    { label: 'New admission',     to: '/admissions/wizard' },
    { label: 'Collect fee',       to: '/hub/fees?tab=collect' },
    { label: 'Mark attendance',   to: '/attendance' },
    { label: 'Students',          to: '/students' },
    { label: 'Staff',             to: '/staff' },
  ]},
  { group: 'Money', tone: 'fee', Icon: Receipt, items: [
    { label: 'Invoices',          to: '/fees/invoices' },
    { label: 'Defaulters',        to: '/fees/defaulters' },
    { label: 'Expenses',          to: '/expenses' },
    { label: 'Accounts ledger',   to: '/accounts' },
    { label: 'Payroll',           to: '/payroll' },
  ]},
  { group: 'Academics', tone: 'exam', Icon: BookOpen, items: [
    { label: 'Exam Vault',        to: '/examination' },
    { label: 'Timetable',         to: '/timetable' },
    { label: 'Publish results',   to: '/exams/publication' },
    { label: 'ID cards',          to: '/id-cards' },
    { label: 'Certificates',      to: '/certificates' },
  ]},
  { group: 'Reports', tone: 'people', Icon: BarChart3, items: [
    { label: 'Reports Hub',       to: '/reports-hub' },
    { label: 'Insights',          to: '/reports' },
    { label: 'Collection report', to: '/fees/collection-report' },
    { label: 'Attendance report', to: '/attendance/report' },
    { label: 'Import & export',   to: '/settings/import-export' },
  ]},
];

const greet = (name) => `Assalam-o-Alaikum, ${name || 'there'}`;
const pctOf = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* Straight-line trend through the months on record, projected forward.
   Deliberately simple and labelled as such: with a year or less of
   history, anything cleverer would be fitting noise. */
function projectRevenue(series, ahead = 3) {
  const pts = series.filter(m => m.revenue > 0);
  if (pts.length < 3) return null;
  const xs = pts.map((m) => m.year * 12 + m.month);
  const ys = pts.map((m) => m.revenue);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((t, x) => t + (x - mx) ** 2, 0);
  const slope = sxx ? xs.reduce((t, x, i) => t + (x - mx) * (ys[i] - my), 0) / sxx : 0;
  const at = (x) => Math.max(0, my + slope * (x - mx));
  const last = xs[n - 1];
  const name = (x) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x % 12];
  const history = pts.map((m, i) => ({ month: name(xs[i]), Actual: fromPaisa(m.revenue), Trend: fromPaisa(at(xs[i])) }));
  const future = Array.from({ length: ahead }, (_, i) => ({ month: name(last + i + 1), Trend: fromPaisa(at(last + i + 1)) }));
  return {
    rows: [...history, ...future],
    nextMonth: at(last + 1),
    direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
    monthlyChange: slope,
  };
}

export default function AdminDashboard() {
  const { user, school } = useAuthStore();

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dash-admin-overview'],
    queryFn: () => api.get('/dashboard/admin/overview', { params: { months: 12 } }).then(r => r.data.data),
    staleTime: 60_000,
    refetchInterval: 120_000,   // the office leaves this open all day
    refetchOnWindowFocus: true,
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
    })),
    [fin.series],
  );
  const forecast = useMemo(() => projectRevenue(fin.series || []), [fin.series]);

  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const updated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
    : null;

  /* ── Today ─────────────────────────────────────────────────────── */
  const tStu = k.today?.students || { marked: 0 };
  const tStaff = k.today?.staff || { marked: 0 };
  const stuLeft = Math.max(0, (k.students || 0) - tStu.marked);
  const staffLeft = Math.max(0, (k.staff || 0) - tStaff.marked);

  const TODAY = [
    {
      tone: 'att', Icon: ClipboardCheck, to: '/attendance',
      title: 'Student attendance',
      value: isLoading ? '…' : `${tStu.marked} / ${k.students ?? 0}`,
      sub: isLoading ? 'Loading…' : stuLeft > 0 ? `${plural(stuLeft, 'student', 'students')} not marked yet` : 'Every student is marked',
      pills: isLoading ? [] : [`${tStu.present || 0} present`, `${tStu.absent || 0} absent`, `${tStu.leave || 0} leave`],
      pct: pctOf(tStu.marked, k.students),
      badge: !isLoading && stuLeft > 0 ? { text: 'TO DO', cls: 'is-todo' } : { text: 'LIVE', cls: 'is-live' },
    },
    {
      tone: 'people', Icon: UserCheck, to: '/attendance/staff',
      title: 'Staff attendance',
      value: isLoading ? '…' : `${tStaff.marked} / ${k.staff ?? 0}`,
      sub: isLoading ? 'Loading…' : staffLeft > 0 ? `${plural(staffLeft, 'staff member', 'staff')} not marked yet` : 'All staff are marked',
      pills: isLoading ? [] : [`${tStaff.present || 0} present`, `${tStaff.absent || 0} absent`],
      pct: pctOf(tStaff.marked, k.staff),
      badge: !isLoading && staffLeft > 0 ? { text: 'TO DO', cls: 'is-todo' } : { text: 'LIVE', cls: 'is-live' },
    },
    {
      tone: 'exam', Icon: Wallet, to: '/hub/fees?tab=collect',
      title: 'Fee collected today',
      value: isLoading ? '…' : moneyShort(k.collectedToday),
      sub: 'Click to collect a fee and print the receipt',
      pills: isLoading ? [] : [`${moneyShort(k.collectedThisMonth)} this month`, `${moneyShort(k.outstanding)} outstanding`],
      badge: { text: 'TODAY', cls: '' },
    },
  ];

  /* ── Needs attention: only real problems, each with where to fix it ── */
  const alerts = [];
  if (!isLoading && !error) {
    const overpaid = d.dataQuality?.overpaidInvoices || 0;
    if (overpaid > 0) {
      alerts.push({
        tone: 'admin', Icon: FileWarning, to: '/fees/invoices',
        text: <><strong>{plural(overpaid, 'invoice shows', 'invoices show')} more paid than billed.</strong> Usually an amount typed in the wrong unit; open and correct the invoice total.</>,
        go: 'Check invoices',
      });
    }
    if (stuLeft > 0 && k.students > 0) {
      alerts.push({
        tone: 'att', Icon: ClipboardCheck, to: '/attendance',
        text: <><strong>{plural(stuLeft, 'student has', 'students have')} no attendance today.</strong> Mark the register or scan ID cards at the gate.</>,
        go: 'Mark now',
      });
    }
    if ((k.defaulters || 0) > 0) {
      alerts.push({
        tone: 'fee', Icon: AlertTriangle, to: '/fees/defaulters',
        text: <><strong>{plural(k.defaulters, 'invoice is', 'invoices are')} unpaid</strong>, {moneyShort(k.outstanding)} outstanding in total.</>,
        go: 'Follow up',
      });
    }
  }

  const KPIS = [
    { label: 'Students',        value: k.students ?? '—',                 to: '/students',               Icon: Users,         tone: 'people' },
    { label: 'Staff',           value: k.staff ?? '—',                    to: '/staff',                  Icon: GraduationCap, tone: 'people' },
    { label: 'Collected today', value: moneyShort(k.collectedToday),      to: '/hub/fees?tab=collect',   Icon: Wallet,        tone: 'fee' },
    { label: 'This month',      value: moneyShort(k.collectedThisMonth),  to: '/fees/collection-report', Icon: TrendingUp,    tone: 'fee' },
    { label: 'Outstanding',     value: moneyShort(k.outstanding),         to: '/fees/defaulters',        Icon: AlertTriangle, tone: 'admin', warn: k.outstanding > 0 },
    { label: 'Unpaid invoices', value: k.defaulters ?? '—',               to: '/fees/invoices',          Icon: Receipt,       tone: 'comm' },
  ];

  const net = fin.net ?? 0;
  const schoolName = school?.name || 'Your school';

  return (
    <div className="ilm-dash" id="admin-dashboard" style={{ padding: 18 }}>

      {/* ── Banner ───────────────────────────────────────────────── */}
      <header className="d-hero d-enter" style={{ marginBottom: 14 }}>
        <div className="d-hero-id">
          <span className="d-hero-mark" aria-hidden="true"><LayoutDashboard size={24} /></span>
          <div style={{ minWidth: 0 }}>
            <h1>{greet(user?.name?.split(' ')[0])}</h1>
            <div className="d-hero-sub">
              {schoolName} · {today}
              {updated && (
                <span className="d-updated d-no-print" style={{ marginLeft: 10 }}>
                  · updated {updated}
                  <button
                    type="button" onClick={() => refetch()} aria-label="Refresh dashboard"
                    style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                  >
                    <RefreshCw size={13} className={isFetching ? 'd-spin' : ''} />
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
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
      </header>

      {/* ── Today ────────────────────────────────────────────────── */}
      <section className="d-cols-3 d-enter" aria-label="Today" style={{ marginBottom: 14 }}>
        {TODAY.map(t => (
          <Link key={t.title} to={t.to} className={`d-feature d-tone-${t.tone}`}>
            <div className="d-feature-top">
              <span className="d-feature-icon"><t.Icon size={20} /></span>
              <span className={`d-badge ${t.badge.cls}`}>{t.badge.text}</span>
            </div>
            <div className="d-feature-title">{t.title}</div>
            <div className="d-feature-value">{t.value}</div>
            {t.pct !== undefined && <div className="d-bar" aria-hidden="true"><span style={{ width: `${t.pct}%` }} /></div>}
            <div className="d-feature-sub">{t.sub}</div>
            {t.pills.length > 0 && (
              <div className="d-pills">{t.pills.map(p => <span key={p} className="d-pill">{p}</span>)}</div>
            )}
            <ChevronRight size={18} className="d-feature-go" aria-hidden="true" />
          </Link>
        ))}
      </section>

      {/* ── Needs attention ──────────────────────────────────────── */}
      {alerts.length > 0 && (
        <section className="d-panel d-enter d-no-print" aria-labelledby="att-title" style={{ marginBottom: 14 }}>
          <div className="d-panel-head">
            <div>
              <h2 id="att-title" className="d-panel-title">Needs attention</h2>
              <div className="d-panel-sub">Only what is actually outstanding right now</div>
            </div>
          </div>
          <div className="d-alerts">
            {alerts.map((a, i) => (
              <Link key={i} to={a.to} className={`d-alert d-tone-${a.tone}`}>
                <span className="d-alert-dot"><a.Icon size={16} /></span>
                <span className="d-alert-text">{a.text}</span>
                <span className="d-alert-go">{a.go} →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {!isLoading && !error && alerts.length === 0 && (
        <div className="d-panel d-enter d-no-print" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} style={{ color: 'var(--d-profit)' }} />
          <span style={{ fontSize: 13.5 }}><strong>All clear.</strong> Attendance is marked and no invoice needs checking.</span>
        </div>
      )}

      {/* ── Quick actions ────────────────────────────────────────── */}
      <QuickActions userId={user?.id} />

      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div className="d-grid" style={{ marginBottom: 14 }}>
        {KPIS.map(({ label, value, to, Icon, warn, tone }) => (
          <Link key={label} to={to} className={`d-panel d-kpi d-tone-${tone}`}>
            <span className="d-kpi-icon"><Icon size={18} /></span>
            {isLoading ? (
              <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                <div className="d-skel" style={{ height: 20, width: '60%' }} />
                <div className="d-skel" style={{ height: 10, width: '40%' }} />
              </div>
            ) : (
              <div className="d-kpi-body">
                <div className="d-metric" style={warn ? { color: 'var(--d-loss)' } : undefined}>{value}</div>
                <div className="d-metric-label">{label}</div>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* ── Health + money ───────────────────────────────────────── */}
      <div className="d-cols-2" style={{ marginBottom: 14 }}>
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

        <WidgetShell
          title="Revenue and expenses"
          subtitle={`Last ${fin.windowMonths || 12} months`}
          loading={isLoading}
          error={error ? 'Financial figures are unavailable right now.' : null}
          onRetry={refetch}
          empty={!isLoading && !error && chart.length === 0}
          emptyTitle="No money recorded yet"
          emptyHint="Collect a fee or record an expense and this chart starts building."
          emptyAction={<Link className="d-btn d-btn-primary" to="/hub/fees?tab=collect">Collect a fee</Link>}
        >
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-line)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip
                  formatter={(v, n) => [`Rs ${Number(v).toLocaleString('en-PK')}`, n]}
                  contentStyle={{ borderRadius: 10, border: '1px solid var(--d-line)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenue" fill="var(--d-primary-2)" radius={[6, 6, 0, 0]} maxBarSize={44} />
                <Bar dataKey="Expense" fill="var(--d-accent)" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 22, marginTop: 10, flexWrap: 'wrap' }}>
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
      </div>

      {/* ── Insights + forecast ──────────────────────────────────── */}
      <div className="d-cols-2" style={{ marginBottom: 14 }}>
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

        <WidgetShell
          title="Fee income forecast"
          subtitle="Straight-line trend of the months on record, three months ahead"
          loading={isLoading}
          error={error ? 'The forecast could not be produced.' : null}
          onRetry={refetch}
          needsData={!forecast ? {
            available: false,
            missing: Math.max(1, 3 - (fin.series || []).filter(m => m.revenue > 0).length),
            need: 3,
            have: (fin.series || []).filter(m => m.revenue > 0).length,
            what: 'A trend needs fee income in at least three different months.',
          } : null}
        >
          {forecast && (
            <>
              <div style={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast.rows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--d-line)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
                    <Tooltip formatter={(v, n) => [`Rs ${Math.round(Number(v)).toLocaleString('en-PK')}`, n]}
                      contentStyle={{ borderRadius: 10, border: '1px solid var(--d-line)', fontSize: 12 }} />
                    <Bar dataKey="Actual" fill="var(--d-primary-2)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Line dataKey="Trend" stroke="var(--d-exam)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontSize: 13, margin: '10px 0 0', color: 'var(--d-muted)' }}>
                Next month on this trend: <strong style={{ color: 'var(--d-ink)' }}>{moneyShort(forecast.nextMonth)}</strong>
                {forecast.direction !== 'flat' && (
                  <> — income is moving <strong style={{ color: forecast.direction === 'up' ? 'var(--d-profit)' : 'var(--d-loss)' }}>
                    {forecast.direction} about {moneyShort(Math.abs(forecast.monthlyChange))} a month</strong></>
                )}. A guide, not a promise: admissions and fee changes move it.
              </p>
            </>
          )}
        </WidgetShell>
      </div>

      {/* ── All modules, grouped like the Reports Hub ────────────── */}
      <section aria-labelledby="mods-title">
        <h2 id="mods-title" className="d-panel-title" style={{ margin: '4px 2px 10px' }}>All modules</h2>
        <div className="d-cats">
          {MODULES.map(({ group, tone, Icon, items }) => (
            <div key={group} className={`d-cat d-tone-${tone}`}>
              <div className="d-cat-head">
                <span className="d-cat-head-icon"><Icon size={17} /></span>
                {group}
              </div>
              <ul className="d-cat-list">
                {items.map(it => (
                  <li key={it.to}><Link to={it.to}>{it.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
