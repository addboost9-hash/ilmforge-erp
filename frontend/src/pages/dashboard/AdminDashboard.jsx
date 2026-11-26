/**
 * IlmForge — Admin / Principal / Owner dashboard.
 *
 * The school at a glance, then the analysis behind it. Two requests:
 *   GET /dashboard/admin/overview   today's registers, KPIs, health, 12 months of money
 *   GET /dashboard/admin/analytics  trends, each class, dues by age, payment methods,
 *                                   admissions, recent payments, absentees, what is coming
 *
 * Top to bottom:
 *   banner            greeting, school, date, the daily buttons
 *   KPI cards         six numbers, each with its trend and the change on last month
 *   attention + today what needs doing now; who is absent
 *   money             revenue against expenses (12 months) · how fees were paid
 *   attendance        30-day trend for students and staff · boys and girls
 *   classes           each class: strength, attendance today, fee collection, dues · dues by age
 *   activity          recent payments · coming up · admissions per month
 *   health + forecast score with reasons; fee income trend
 *   quick actions, all modules
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Printer, Users, UserCheck, Wallet, AlertTriangle, GraduationCap,
  TrendingUp, TrendingDown, ClipboardCheck, UserPlus, LayoutDashboard, RefreshCw,
  ChevronRight, CalendarCheck, Receipt, BookOpen, BarChart3, FileWarning,
  CheckCircle2, Scale, CalendarDays, Cake, PartyPopper, PhoneCall,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ComposedChart, Line, Area, AreaChart, PieChart, Pie, Cell,
} from 'recharts';

import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { moneyShort, fromPaisa } from '../../utils/currency';
import { printSection } from '../../utils/print';
import WidgetShell from '../../components/dashboard/WidgetShell';
import HealthRing from '../../components/dashboard/HealthRing';
import DriverBars from '../../components/dashboard/DriverBars';
import QuickActions from '../../components/dashboard/QuickActions';
import VisitorFeed from '../../components/visitors/VisitorFeed';
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
    { label: 'Bank challans',     to: '/hub/fees?tab=challans' },
    { label: 'Expenses',          to: '/expenses' },
    { label: 'Payroll',           to: '/payroll' },
  ]},
  { group: 'Academics', tone: 'exam', Icon: BookOpen, items: [
    { label: 'Exam Vault',        to: '/examination' },
    { label: 'Timetable',         to: '/timetable' },
    { label: 'Annual result card', to: '/exams/annual-report' },
    { label: 'ID cards',          to: '/id-cards' },
    { label: 'Certificates',      to: '/certificates' },
  ]},
  { group: 'Reports', tone: 'people', Icon: BarChart3, items: [
    { label: 'Reports Hub',       to: '/reports-hub' },
    { label: 'Fee register',      to: '/hub/fees?tab=register' },
    { label: 'Collection report', to: '/fees/collection-report' },
    { label: 'Attendance report', to: '/attendance/report' },
    { label: 'Import & export',   to: '/settings/import-export' },
  ]},
];

const METHOD = { cash: 'Cash', bank: 'Bank deposit', online: 'Online transfer', card: 'Card', cheque: 'Cheque', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', wallet: 'Parent wallet' };
const PALETTE = ['var(--d-primary-2)', 'var(--d-fee)', 'var(--d-accent)', 'var(--d-exam)', 'var(--d-att-2)', 'var(--d-admin-2)', 'var(--d-comm)', '#64748B'];
const AGING_COLORS = ['#94A3B8', 'var(--d-accent)', '#F97316', 'var(--d-admin-2)', 'var(--d-loss)'];

const greet = (name) => {
  const h = Number(new Date(Date.now() + 5 * 3600e3).toISOString().slice(11, 13));
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name || 'there'}`;
};
const pctOf = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const change = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
const axisMoney = (v) => { const a = Math.abs(v); const sign = v < 0 ? '-' : ''; return a >= 10000000 ? `${sign}${(a / 10000000).toFixed(1)}Cr` : a >= 100000 ? `${sign}${(a / 100000).toFixed(1)}L` : a >= 1000 ? `${sign}${Math.round(a / 1000)}k` : v; };
const tipMoney = (v, n) => [`Rs ${Math.round(Number(v)).toLocaleString('en-PK')}`, n];
const shortDay = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const pkTime = (iso) => new Date(iso).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const TIP = { borderRadius: 10, border: '1px solid var(--d-line)', fontSize: 12, boxShadow: '0 6px 20px rgba(15,23,42,.08)' };

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
  return { rows: [...history, ...future], nextMonth: at(last + 1), direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat', monthlyChange: slope };
}

/* A tiny trend line for a KPI card. */
function Spark({ data, dataKey, color }) {
  if (!data || data.filter((d) => d[dataKey] != null).length < 2) return null;
  return (
    <div className="d-spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sp-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.8} fill={`url(#sp-${dataKey})`} connectNulls isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Delta({ value, goodWhenUp = true, suffix = 'vs last month' }) {
  if (value == null) return <span className="d-delta is-flat">no comparison yet</span>;
  const up = value > 0;
  const good = value === 0 ? null : (up === goodWhenUp);
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`d-delta ${good == null ? 'is-flat' : good ? 'is-good' : 'is-bad'}`}>
      {value !== 0 && <Icon size={12} />} {value > 0 ? '+' : ''}{value}% <span className="d-delta-note">{suffix}</span>
    </span>
  );
}

function Kpi({ to, Icon, tone, label, value, sub, delta, spark, loading, ring }) {
  return (
    <Link to={to} className={`d-kpi2 d-tone-${tone}`}>
      <div className="d-kpi2-top">
        <span className="d-kpi2-icon"><Icon size={18} /></span>
        <span className="d-kpi2-label">{label}</span>
        {ring != null && <span className="d-kpi2-ring" style={{ '--p': ring }} aria-label={`${ring}%`}><b>{ring}%</b></span>}
      </div>
      {loading ? <div className="d-skel" style={{ height: 26, width: '62%', marginTop: 6 }} /> : <div className="d-kpi2-value">{value}</div>}
      <div className="d-kpi2-sub">{loading ? <span className="d-skel" style={{ display: 'inline-block', height: 10, width: '70%' }} /> : sub}</div>
      {!loading && delta}
      {!loading && spark}
    </Link>
  );
}

function Donut({ data, total, centre, height = 180 }) {
  return (
    <div style={{ position: 'relative', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
            {data.map((d, i) => <Cell key={d.name} fill={d.color || PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={TIP} formatter={(v, n) => [d3(v, total), n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="d-donut-centre">{centre}</div>
    </div>
  );
}
const d3 = (v, total) => (total ? `${v.toLocaleString('en-PK')} (${Math.round((v / total) * 100)}%)` : v);

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
  const { data: an, isLoading: anLoading, error: anError, refetch: anRefetch } = useQuery({
    queryKey: ['dash-admin-analytics'],
    queryFn: () => api.get('/dashboard/admin/analytics').then(r => r.data.data),
    staleTime: 60_000,
    refetchInterval: 300_000,
    retry: 1,
  });

  const d = data || {};
  const k = d.kpis || {};
  const fin = d.finance || {};
  const caps = d.capabilities || {};
  const a = an || {};

  const money12 = useMemo(() => (fin.series || []).map(m => ({
    month: m.label.split(' ')[0],
    Revenue: fromPaisa(m.revenue),
    Expense: fromPaisa(m.expense),
    Net: fromPaisa(m.revenue - m.expense),
  })), [fin.series]);
  const forecast = useMemo(() => projectRevenue(fin.series || []), [fin.series]);
  const attTrend = useMemo(() => (a.attendanceTrend || []).map((t) => ({ ...t, label: shortDay(t.day) })), [a.attendanceTrend]);
  const attMarkedDays = attTrend.filter((t) => t.students != null);
  const attAvg = attMarkedDays.length ? Math.round((attMarkedDays.reduce((s, t) => s + t.students, 0) / attMarkedDays.length) * 10) / 10 : null;
  const methods = (a.methods || []).map((m, i) => ({ name: METHOD[m.method] || m.method, value: fromPaisa(m.amount), count: m.count, color: PALETTE[i % PALETTE.length] }));
  const methodsTotal = methods.reduce((s, m) => s + m.value, 0);
  const gender = a.gender || {};
  const genderData = [
    { name: 'Boys', value: gender.boys || 0, color: 'var(--d-primary-2)' },
    { name: 'Girls', value: gender.girls || 0, color: '#EC4899' },
    ...(gender.other ? [{ name: 'Not recorded', value: gender.other, color: '#CBD5E1' }] : []),
  ].filter((g) => g.value > 0);
  const genderTotal = genderData.reduce((s, g) => s + g.value, 0);
  const aging = (a.aging || []).map((b, i) => ({ ...b, rs: fromPaisa(b.amount), color: AGING_COLORS[i] }));
  const overdue90 = aging.find((b) => b.key === '90+');
  const classes = a.classes || [];
  const admissions = (a.admissionsMonthly || []).map((m) => ({ month: m.label.split(' ')[0], Admissions: m.count }));
  const admittedThisMonth = admissions.length ? admissions[admissions.length - 1].Admissions : 0;
  const owingStudents = classes.reduce((s, c) => s + (c.owing || 0), 0);
  const mon = a.month || {};

  const todayLong = new Date().toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const updated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : null;

  /* ── Today ─────────────────────────────────────────────────────── */
  const tStu = k.today?.students || { marked: 0 };
  const tStaff = k.today?.staff || { marked: 0 };
  const stuPresent = (tStu.present || 0) + (tStu.late || 0);
  const staffPresent = (tStaff.present || 0) + (tStaff.late || 0);
  const stuLeft = Math.max(0, (k.students || 0) - tStu.marked);
  const staffLeft = Math.max(0, (k.staff || 0) - tStaff.marked);
  const stuRate = tStu.marked ? pctOf(stuPresent, tStu.marked) : null;

  /* ── Needs attention: only real problems, each with where to fix it ── */
  const alerts = [];
  if (!isLoading && !error) {
    const overpaid = d.dataQuality?.overpaidInvoices || 0;
    if (overpaid > 0) alerts.push({ tone: 'admin', Icon: FileWarning, to: '/fees/invoices', text: <><strong>{plural(overpaid, 'invoice shows', 'invoices show')} more paid than billed.</strong> Usually an amount typed in the wrong unit; open and correct the invoice total.</>, go: 'Check invoices' });
    const newApplications = d.admissions?.open || 0;
    if (newApplications > 0) alerts.push({ tone: 'people', Icon: UserPlus, to: '/admissions/inquiries', text: <><strong>{plural(newApplications, 'admission application', 'admission applications')}</strong> waiting for a call back.</>, go: 'Review' });
    if (stuLeft > 0 && k.students > 0) alerts.push({ tone: 'att', Icon: ClipboardCheck, to: '/attendance', text: <><strong>{plural(stuLeft, 'student has', 'students have')} no attendance today.</strong> Mark the register or scan ID cards at the gate.</>, go: 'Mark now' });
    if (staffLeft > 0 && k.staff > 0) alerts.push({ tone: 'people', Icon: UserCheck, to: '/attendance/staff', text: <><strong>{plural(staffLeft, 'staff member is', 'staff are')} not marked today.</strong></>, go: 'Mark staff' });
    if (overdue90?.count > 0) alerts.push({ tone: 'admin', Icon: AlertTriangle, to: '/fees/defaulters', text: <><strong>{plural(overdue90.count, 'bill is', 'bills are')} over 90 days late</strong> ({moneyShort(overdue90.amount)}). Call these parents first.</>, go: 'Defaulters' });
    else if ((k.defaulters || 0) > 0) alerts.push({ tone: 'fee', Icon: AlertTriangle, to: '/fees/defaulters', text: <><strong>{plural(k.defaulters, 'bill is', 'bills are')} unpaid</strong>, {moneyShort(k.outstanding)} outstanding in total.</>, go: 'Follow up' });
  }

  const net = fin.net ?? 0;
  const monthNet = (mon.collected || 0) - (mon.expense || 0);
  const monthNetLast = (mon.collectedLast || 0) - (mon.expenseLast || 0);
  const schoolName = school?.name || 'Your school';
  const moneySpark = (fin.series || []).map((m) => ({ v: fromPaisa(m.revenue) }));
  const loadingAll = isLoading || anLoading;

  return (
    <div className="ilm-dash" id="admin-dashboard" style={{ padding: 18 }}>

      {/* ── Banner ───────────────────────────────────────────────── */}
      <header className="d-hero d-enter" style={{ marginBottom: 14 }}>
        <div className="d-hero-id">
          <span className="d-hero-mark" aria-hidden="true"><LayoutDashboard size={24} /></span>
          <div style={{ minWidth: 0 }}>
            <h1>{greet(user?.name?.split(' ')[0])}</h1>
            <div className="d-hero-sub">
              {schoolName} · {todayLong}
              {updated && (
                <span className="d-updated d-no-print" style={{ marginLeft: 10 }}>
                  · updated {updated}
                  <button type="button" onClick={() => { refetch(); anRefetch(); }} aria-label="Refresh dashboard"
                    style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', marginLeft: 4 }}>
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
          <button className="d-btn" onClick={() => printSection(document.getElementById('admin-dashboard'), { title: `Dashboard — ${new Date().toLocaleDateString('en-PK')}` })}>
            <Printer size={15} /> Export PDF
          </button>
        </div>
      </header>

      {error && (
        <div className="d-panel" role="alert" style={{ marginBottom: 14, color: 'var(--d-loss)' }}>
          The dashboard could not be loaded. Check that the server is running. <button className="d-btn d-btn-primary" onClick={() => refetch()} style={{ marginLeft: 8 }}>Try again</button>
        </div>
      )}

      {/* ── KPI cards ────────────────────────────────────────────── */}
      <section className="d-kpis d-enter" aria-label="Key figures">
        <Kpi to="/students" Icon={Users} tone="people" label="Students" loading={loadingAll}
          value={(k.students ?? 0).toLocaleString('en-PK')}
          sub={<>{plural(admittedThisMonth, 'new admission', 'new admissions')} this month{genderTotal ? ` · ${gender.boys || 0} boys, ${gender.girls || 0} girls` : ''}</>}
          spark={<Spark data={admissions} dataKey="Admissions" color="var(--d-primary-2)" />} />
        <Kpi to="/attendance" Icon={ClipboardCheck} tone="att" label="Attendance today" loading={isLoading}
          ring={stuRate}
          value={tStu.marked ? `${stuPresent} / ${tStu.marked}` : 'Not marked'}
          sub={tStu.marked ? `${tStu.absent || 0} absent · ${tStu.leave || 0} on leave${stuLeft ? ` · ${stuLeft} not marked` : ''}` : `${k.students || 0} students to mark`}
          delta={attAvg != null ? <span className="d-delta is-flat">30-day average {attAvg}%</span> : null}
          spark={<Spark data={attTrend} dataKey="students" color="var(--d-att-2)" />} />
        <Kpi to="/fees/collection-report" Icon={Wallet} tone="fee" label="Collected this month" loading={loadingAll}
          value={moneyShort(mon.collected ?? k.collectedThisMonth)}
          sub={<>{moneyShort(k.collectedToday)} today</>}
          delta={<Delta value={change(mon.collected || 0, mon.collectedLast || 0)} suffix={`vs 1–${mon.day || ''} last month`} />}
          spark={<Spark data={moneySpark} dataKey="v" color="var(--d-fee)" />} />
        <Kpi to="/fees/defaulters" Icon={AlertTriangle} tone="admin" label="Outstanding fees" loading={loadingAll}
          value={moneyShort(k.outstanding)}
          sub={<>{plural(owingStudents, 'student owes', 'students owe')} · {plural(k.defaulters || 0, 'bill', 'bills')}</>}
          delta={overdue90?.amount ? <span className="d-delta is-bad">{moneyShort(overdue90.amount)} over 90 days</span> : null} />
        <Kpi to="/attendance/staff" Icon={UserCheck} tone="exam" label="Staff present" loading={isLoading}
          ring={tStaff.marked ? pctOf(staffPresent, tStaff.marked) : null}
          value={tStaff.marked ? `${staffPresent} / ${k.staff ?? 0}` : 'Not marked'}
          sub={tStaff.marked ? `${tStaff.absent || 0} absent · ${tStaff.leave || 0} on leave` : `${k.staff || 0} staff to mark`}
          spark={<Spark data={attTrend} dataKey="staff" color="var(--d-exam)" />} />
        <Kpi to="/accounts" Icon={Scale} tone="comm" label="Net this month" loading={anLoading}
          value={<span className={monthNet >= 0 ? 'd-profit' : 'd-loss'}>{moneyShort(monthNet)}</span>}
          sub={<>{moneyShort(mon.collected)} in · {moneyShort(mon.expense)} out</>}
          delta={mon.collectedLast || mon.expenseLast ? (
            <span className={`d-delta ${monthNet >= monthNetLast ? 'is-good' : 'is-bad'}`}>
              {monthNet >= monthNetLast ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {monthNet >= monthNetLast ? '+' : '-'}{moneyShort(Math.abs(monthNet - monthNetLast))} <span className="d-delta-note">vs same point last month</span>
            </span>
          ) : <span className="d-delta is-flat">no comparison yet</span>} />
      </section>

      {/* ── Needs attention + absent today ───────────────────────── */}
      <div className="d-row">
        <section className="d-panel d-span-7 d-no-print" aria-labelledby="att-title">
          <div className="d-panel-head">
            <div><h2 id="att-title" className="d-panel-title">Needs attention</h2><div className="d-panel-sub">Only what is outstanding right now</div></div>
          </div>
          {!isLoading && !error && alerts.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
              <CheckCircle2 size={18} style={{ color: 'var(--d-profit)' }} />
              <span><strong>All clear.</strong> Attendance is marked, no application is waiting and nothing is long overdue.</span>
            </div>
          )}
          {isLoading && <div className="d-skel" style={{ height: 70 }} />}
          <div className="d-alerts">
            {alerts.map((al, i) => (
              <Link key={i} to={al.to} className={`d-alert d-tone-${al.tone}`}>
                <span className="d-alert-dot"><al.Icon size={16} /></span>
                <span className="d-alert-text">{al.text}</span>
                <span className="d-alert-go">{al.go} →</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="d-panel d-span-5" aria-labelledby="abs-title">
          <div className="d-panel-head">
            <div><h2 id="abs-title" className="d-panel-title">Absent today</h2><div className="d-panel-sub">{a.absentToday?.count ? `${a.absentToday.count} student${a.absentToday.count === 1 ? '' : 's'}` : 'Students marked absent'}</div></div>
            <Link to="/attendance/register" className="d-link">Register →</Link>
          </div>
          {anLoading ? <div className="d-skel" style={{ height: 90 }} /> : !a.absentToday?.list?.length ? (
            <div className="d-empty-line">{tStu.marked ? 'Nobody is absent today.' : 'Attendance is not marked yet today.'}</div>
          ) : (
            <ul className="d-list">
              {a.absentToday.list.map((s) => (
                <li key={s.id}>
                  <span className="d-avatar">{(s.name || '?').charAt(0)}</span>
                  <span className="d-list-main"><b>{s.name}</b><small>{s.className}{s.rollNo ? ` · ${s.rollNo}` : ''}</small></span>
                  {s.phone && <a className="d-list-act" href={`tel:${s.phone}`} title={`Call ${s.phone}`} aria-label={`Call the parent of ${s.name}`}><PhoneCall size={14} /></a>}
                </li>
              ))}
              {a.absentToday.count > a.absentToday.list.length && <li className="d-list-more">and {a.absentToday.count - a.absentToday.list.length} more</li>}
            </ul>
          )}
        </section>
      </div>

      {/* ── Visitor Desk: who is at the school now ────────────────── */}
      <div className="d-row d-no-print">
        <section className="d-panel" style={{ gridColumn: '1 / -1' }} aria-label="Visitor Desk live feed">
          <VisitorFeed compact />
        </section>
      </div>

      {/* ── Money ────────────────────────────────────────────────── */}
      <div className="d-row">
        <WidgetShell className="d-span-8" title="Revenue and expenses" subtitle={`Fees collected and money spent, last ${fin.windowMonths || 12} months`}
          loading={isLoading} error={error ? 'Financial figures are unavailable right now.' : null} onRetry={refetch}
          empty={!isLoading && !error && money12.length === 0} emptyTitle="No money recorded yet"
          emptyHint="Collect a fee or record an expense and this chart starts building."
          emptyAction={<Link className="d-btn d-btn-primary" to="/hub/fees?tab=collect">Collect a fee</Link>}>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={money12} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barCategoryGap="26%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-line)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} tickFormatter={axisMoney} />
                <Tooltip formatter={tipMoney} contentStyle={TIP} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenue" fill="var(--d-primary-2)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Expense" fill="var(--d-accent)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line dataKey="Net" stroke="var(--d-profit)" strokeWidth={2.2} dot={{ r: 2.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="d-figures">
            <div><div className="d-metric">{moneyShort(fin.revenue)}</div><div className="d-metric-label">Collected</div></div>
            <div><div className="d-metric">{moneyShort(fin.expense)}</div><div className="d-metric-label">Spent</div></div>
            <div><div className={`d-metric ${net >= 0 ? 'd-profit' : 'd-loss'}`}>{moneyShort(net)}</div><div className="d-metric-label">{net >= 0 ? 'Net surplus' : 'Net loss'}</div></div>
            {fin.revenue > 0 && <div><div className="d-metric">{Math.round(((fin.revenue - fin.expense) / fin.revenue) * 100)}%</div><div className="d-metric-label">Margin</div></div>}
          </div>
        </WidgetShell>
        <WidgetShell className="d-span-4" title="How fees were paid" subtitle="This month, by method"
          loading={anLoading} error={anError ? 'Unavailable right now.' : null} onRetry={anRefetch}
          empty={!anLoading && !anError && methods.length === 0} emptyTitle="No fee collected this month yet">
          <Donut data={methods} total={methodsTotal} centre={<><b>{moneyShort((mon.collected || 0))}</b><small>this month</small></>} />
          <ul className="d-legend">
            {methods.map((m) => (
              <li key={m.name}><i style={{ background: m.color }} />{m.name}<span>{methodsTotal ? Math.round((m.value / methodsTotal) * 100) : 0}% · {m.count}</span></li>
            ))}
          </ul>
        </WidgetShell>
      </div>

      {/* ── Attendance + students ────────────────────────────────── */}
      <div className="d-row">
        <WidgetShell className="d-span-8" title="Attendance, last 30 days" subtitle="Share present of those marked (late counts as present)"
          loading={anLoading} error={anError ? 'Unavailable right now.' : null} onRetry={anRefetch}
          empty={!anLoading && !anError && attMarkedDays.length === 0} emptyTitle="No attendance marked in the last 30 days"
          emptyAction={<Link className="d-btn d-btn-primary" to="/attendance">Mark attendance</Link>}>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attTrend} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-stu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--d-att-2)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--d-att-2)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g-stf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--d-exam)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--d-exam)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={TIP} formatter={(v, n) => [v == null ? 'not marked' : `${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {/* Days not marked stay empty: a line across them would look like data. */}
                <Area type="monotone" name="Students" dataKey="students" stroke="var(--d-att-2)" strokeWidth={2.2} fill="url(#g-stu)" dot={{ r: 2.5, strokeWidth: 0, fill: 'var(--d-att-2)' }} />
                <Area type="monotone" name="Staff" dataKey="staff" stroke="var(--d-exam)" strokeWidth={2} fill="url(#g-stf)" dot={{ r: 2.5, strokeWidth: 0, fill: 'var(--d-exam)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>
        <WidgetShell className="d-span-4" title="Students" subtitle={`${(k.students || 0).toLocaleString('en-PK')} studying now`}
          loading={anLoading} error={anError ? 'Unavailable right now.' : null} onRetry={anRefetch}
          empty={!anLoading && !anError && genderTotal === 0} emptyTitle="No students yet"
          emptyAction={<Link className="d-btn d-btn-primary" to="/admissions/wizard">Add a student</Link>}>
          <Donut data={genderData} total={genderTotal} centre={<><b>{genderTotal}</b><small>students</small></>} />
          <ul className="d-legend">
            {genderData.map((g) => <li key={g.name}><i style={{ background: g.color }} />{g.name}<span>{g.value} · {Math.round((g.value / genderTotal) * 100)}%</span></li>)}
          </ul>
        </WidgetShell>
      </div>

      {/* ── Classes + dues by age ────────────────────────────────── */}
      <div className="d-row">
        <WidgetShell className="d-span-8" title="Classes at a glance" subtitle="Strength, attendance today, fee collection and dues"
          loading={anLoading} error={anError ? 'Unavailable right now.' : null} onRetry={anRefetch}
          empty={!anLoading && !anError && classes.length === 0} emptyTitle="No classes yet">
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th>Class</th><th className="r">Students</th><th>Attendance today</th><th>Fees collected</th><th className="r">Outstanding</th><th className="r">Owe</th></tr></thead>
              <tbody>
                {classes.map((c) => {
                  const att = c.markedToday ? pctOf(c.presentToday, c.markedToday) : null;
                  const col = c.billed > 0 ? pctOf(c.collected, c.billed) : null;
                  return (
                    <tr key={c.classId}>
                      <td><Link to={`/hub/fees?tab=register&classId=${c.classId}`} className="d-strong-link">{c.name}</Link><small>{c.boys} boys · {c.girls} girls</small></td>
                      <td className="r">{c.students}</td>
                      <td>{att == null ? <span className="d-muted">not marked</span> : <span className="d-meter"><span className="d-meter-bar"><i style={{ width: `${att}%`, background: att >= 85 ? 'var(--d-profit)' : att >= 70 ? 'var(--d-accent)' : 'var(--d-loss)' }} /></span>{att}%</span>}</td>
                      <td>{col == null ? <span className="d-muted">no bills</span> : <span className="d-meter"><span className="d-meter-bar"><i style={{ width: `${col}%`, background: col >= 90 ? 'var(--d-profit)' : col >= 70 ? 'var(--d-primary-2)' : 'var(--d-loss)' }} /></span>{col}%</span>}</td>
                      <td className="r" style={{ color: c.outstanding ? 'var(--d-loss)' : undefined, fontWeight: 700 }}>{moneyShort(c.outstanding)}</td>
                      <td className="r">{c.owing || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </WidgetShell>
        <WidgetShell className="d-span-4" title="Dues by age" subtitle="Unpaid bills by how late they are"
          loading={anLoading} error={anError ? 'Unavailable right now.' : null} onRetry={anRefetch}
          empty={!anLoading && !anError && !aging.some((b) => b.count)} emptyTitle="Nothing is owed" emptyHint="Every bill is paid.">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={96} tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TIP} formatter={(v, n, p) => [`Rs ${Number(v).toLocaleString('en-PK')} · ${p.payload.count} bill${p.payload.count === 1 ? '' : 's'}`, 'Owed']} />
                <Bar dataKey="rs" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {aging.map((b) => <Cell key={b.key} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Link to="/fees/defaulters" className="d-link">Follow up the defaulters →</Link>
        </WidgetShell>
      </div>

      {/* ── Activity ─────────────────────────────────────────────── */}
      <div className="d-row">
        <section className="d-panel d-span-4" aria-labelledby="pay-title">
          <div className="d-panel-head"><div><h2 id="pay-title" className="d-panel-title">Latest payments</h2><div className="d-panel-sub">Fees received, newest first</div></div><Link to="/fees/collection-report" className="d-link">All →</Link></div>
          {anLoading ? <div className="d-skel" style={{ height: 120 }} /> : !a.recentPayments?.length ? <div className="d-empty-line">No payment yet.</div> : (
            <ul className="d-list">
              {a.recentPayments.map((p) => (
                <li key={p.id}>
                  <span className="d-avatar is-fee"><Wallet size={14} /></span>
                  <span className="d-list-main"><b>{p.student?.name || 'Student'}</b><small>{[p.student?.className, METHOD[p.method] || p.method, pkTime(p.at)].filter(Boolean).join(' · ')}</small></span>
                  <span className="d-list-amt">{moneyShort(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="d-panel d-span-4" aria-labelledby="up-title">
          <div className="d-panel-head"><div><h2 id="up-title" className="d-panel-title">Coming up</h2><div className="d-panel-sub">Exams, events and birthdays</div></div></div>
          {anLoading ? <div className="d-skel" style={{ height: 120 }} /> : (
            (a.exams?.length || a.events?.length || a.birthdays?.length) ? (
              <ul className="d-list">
                {(a.exams || []).map((e) => (
                  <li key={`e${e.id}`}><span className="d-avatar is-exam"><BookOpen size={14} /></span>
                    <span className="d-list-main"><b>{e.title}</b><small>{e.from ? `${shortDay(e.from)}${e.to && e.to !== e.from ? ` – ${shortDay(e.to)}` : ''}` : 'Dates not set'}{e.published ? ' · result published' : ''}</small></span>
                    <Link className="d-list-act" to={`/examination?exam=${e.id}`} aria-label={`Open ${e.title}`}><ChevronRight size={15} /></Link></li>
                ))}
                {(a.events || []).map((e) => (
                  <li key={`v${e.id}`}><span className="d-avatar is-comm"><PartyPopper size={14} /></span>
                    <span className="d-list-main"><b>{e.title}</b><small>{shortDay(e.date)} · {e.type}</small></span></li>
                ))}
                {(a.birthdays || []).map((b) => (
                  <li key={`b${b.kind}${b.id}`}><span className="d-avatar is-people"><Cake size={14} /></span>
                    <span className="d-list-main"><b>{b.name}</b><small>{b.inDays === 0 ? 'Birthday today' : b.inDays === 1 ? 'Birthday tomorrow' : `Birthday in ${b.inDays} days`} · {b.about}</small></span></li>
                ))}
              </ul>
            ) : <div className="d-empty-line">Nothing scheduled in the coming weeks.</div>
          )}
        </section>
        <WidgetShell className="d-span-4" title="Admissions" subtitle="New students per month, last 12 months"
          loading={anLoading} error={anError ? 'Unavailable right now.' : null} onRetry={anRefetch}
          empty={!anLoading && !anError && !admissions.some((m) => m.Admissions)} emptyTitle="No admissions in the last 12 months">
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={admissions} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-line)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10.5, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="Admissions" fill="var(--d-people-2)" radius={[5, 5, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>
      </div>

      {/* ── Health + forecast ────────────────────────────────────── */}
      <div className="d-row">
        <WidgetShell className="d-span-4" title="School health" subtitle="Collection, attendance, retention, staffing and margin"
          loading={isLoading} error={error ? 'Unavailable right now.' : null} onRetry={refetch} skeletonRows={4}>
          <HealthRing health={d.health} />
        </WidgetShell>
        <WidgetShell className="d-span-4" title="Why this result?" subtitle="Month-on-month drivers"
          loading={isLoading} error={error ? 'Driver analysis is unavailable right now.' : null} onRetry={refetch}
          needsData={caps.variance && !d.explanation ? { ...caps.variance, what: 'Comparing one month with the last needs two complete months of both fees and expenses.' } : null}>
          <DriverBars explanation={d.explanation} />
        </WidgetShell>
        <WidgetShell className="d-span-4" title="Fee income forecast" subtitle="Trend of the months on record, three months ahead"
          loading={isLoading} error={error ? 'The forecast could not be produced.' : null} onRetry={refetch}
          needsData={!forecast ? {
            available: false, missing: Math.max(1, 3 - (fin.series || []).filter(m => m.revenue > 0).length), need: 3,
            have: (fin.series || []).filter(m => m.revenue > 0).length, what: 'A trend needs fee income in at least three different months.',
          } : null}>
          {forecast && (
            <>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast.rows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--d-line)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--d-muted)' }} tickLine={false} axisLine={false} tickFormatter={axisMoney} />
                    <Tooltip formatter={tipMoney} contentStyle={TIP} />
                    <Bar dataKey="Actual" fill="var(--d-primary-2)" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Line dataKey="Trend" stroke="var(--d-exam)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontSize: 12.5, margin: '8px 0 0', color: 'var(--d-muted)' }}>
                Next month on this trend: <strong style={{ color: 'var(--d-ink)' }}>{moneyShort(forecast.nextMonth)}</strong>
                {forecast.direction !== 'flat' && <> — moving <strong style={{ color: forecast.direction === 'up' ? 'var(--d-profit)' : 'var(--d-loss)' }}>{forecast.direction} about {moneyShort(Math.abs(forecast.monthlyChange))} a month</strong></>}. A guide, not a promise.
              </p>
            </>
          )}
        </WidgetShell>
      </div>

      {/* ── Quick actions + all modules ──────────────────────────── */}
      <QuickActions userId={user?.id} />
      <section aria-labelledby="mods-title">
        <h2 id="mods-title" className="d-panel-title" style={{ margin: '4px 2px 10px' }}>All modules</h2>
        <div className="d-cats">
          {MODULES.map(({ group, tone, Icon, items }) => (
            <div key={group} className={`d-cat d-tone-${tone}`}>
              <div className="d-cat-head"><span className="d-cat-head-icon"><Icon size={17} /></span>{group}</div>
              <ul className="d-cat-list">{items.map(it => <li key={it.to}><Link to={it.to}>{it.label}</Link></li>)}</ul>
            </div>
          ))}
        </div>
      </section>
      <div className="d-no-print" style={{ fontSize: 11.5, color: 'var(--d-muted)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <GraduationCap size={13} /> Figures are live from the school's records; days follow Pakistan time.
        <CalendarDays size={13} style={{ marginLeft: 8 }} /> {todayLong}
      </div>
    </div>
  );
}
