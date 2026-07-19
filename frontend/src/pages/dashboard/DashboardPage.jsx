/**
 * IlmForge — Dashboard (Rebuilt)
 * Colorful stat cards + Recharts + Quick Actions + Recent Activity
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { useTranslation } from '../../hooks/useTranslation';
import {
  Users, Briefcase, DollarSign, AlertTriangle, CheckCircle, Calendar,
  ChevronRight, RefreshCw, ClipboardList, CreditCard, UserPlus,
  FileText, MessageSquare, BarChart2, Cake, Phone
} from 'lucide-react';

/* ── helpers ── */
const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ── Stat Card ── */
const StatCard = React.memo(function StatCard({ value, label, icon, gradient, href }) {
  return (
    <a href={href || '#'} style={{textDecoration:'none'}}>
      <div className="ilm-stat-card ilm-animate" style={{background: gradient}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
          <div>
            <div className="ilm-stat-value">{value ?? 0}</div>
            <div className="ilm-stat-label">{label}</div>
          </div>
          <div style={{fontSize:40, opacity:0.25, lineHeight:1}}>{icon}</div>
        </div>
      </div>
    </a>
  );
});

/* ── Quick Action Tile ── */
const ActionTile = React.memo(function ActionTile({ label, to, Icon, bg, color }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, background: bg, borderRadius: 6, padding: '18px 10px',
        cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)'; }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color="#fff" />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', textAlign: 'center' }}>{label}</span>
      </div>
    </Link>
  );
});

/* ── build placeholder monthly chart data ── */
function buildFeeChartData(stats) {
  const thisYear = stats?.monthlyFeeThisYear || [];
  const lastYear = stats?.monthlyFeeLastYear || [];
  return MONTHS.map((m, i) => ({
    month: m,
    thisYear: thisYear[i] ?? Math.floor(Math.random() * 80000 + 40000),
    lastYear: lastYear[i] ?? Math.floor(Math.random() * 60000 + 30000),
  }));
}

/* ── build placeholder attendance chart data (last 6 months) ── */
function buildAttChartData(stats) {
  const data = stats?.attendanceTrend || [];
  if (data.length) return data;
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const label = d.toLocaleString('en-PK', { month: 'short' });
    return {
      month: label,
      present: Math.floor(Math.random() * 120 + 200),
      absent: Math.floor(Math.random() * 40 + 10),
    };
  });
}

/* ══════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const nav = useNavigate();
  const { user, school: authSchool } = useAuthStore();
  const { t } = useTranslation();

  /* ── Upcoming birthdays (next 7 days) ── */
  const { data: upcomingBirthdays = [] } = useQuery({
    queryKey: ['upcoming-birthdays-dashboard'],
    queryFn: () =>
      api.get('/students/birthdays/upcoming', { params: { days: 7 } })
        .then(r => r.data.data || [])
        .catch(() => []),
    staleTime: 10 * 60_000,
  });

  /* ── Main dashboard stats ── */
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data || r.data),
    staleTime: 30_000,
    retry: 1,
  });

  /* ── Recent fee payments ── */
  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => api.get('/fees/payments', { params: { limit: 10 } }).then(r => r.data.data || r.data || []),
    staleTime: 60_000,
    retry: 1,
  });

  /* ── Recent admissions ── */
  const { data: recentStudents } = useQuery({
    queryKey: ['recent-students'],
    queryFn: () => api.get('/students', { params: { limit: 5, sort: 'newest' } }).then(r => r.data.data || r.data || []),
    staleTime: 60_000,
    retry: 1,
  });

  const s = stats || {};

  /* ── Stat values ── */
  // API returns nested structure: { students: { total, presentToday }, staff: { total }, finance: { ... } }
  const totalStudents = s.students?.total     ?? s.totalStudents ?? s.stats?.totalStudents ?? 0;
  const totalStaff    = s.staff?.total        ?? s.totalStaff    ?? s.stats?.totalStaff    ?? 0;
  const feeToday      = s.finance?.incomeToday ?? s.incomeToday  ?? s.stats?.incomeToday   ?? s.feeCollectedToday ?? 0;
  const feeDefaulters = s.finance?.unpaidInvoices ?? s.unpaidInvoices ?? s.stats?.unpaidInvoices ?? s.feeDefaulters ?? 0;
  const presentToday  = s.students?.presentToday ?? s.presentToday ?? s.stats?.presentToday ?? 0;
  const pendingLeaves = s.pendingLeaves ?? s.stats?.pendingLeaves ?? 0;

  const feeChartData = useMemo(() => buildFeeChartData(s), [s.monthlyChart]);
  const attChartData = useMemo(() => buildAttChartData(s), [s.attendanceTrend]);

  const admissions = Array.isArray(recentStudents) ? recentStudents
    : (Array.isArray(s.recentStudents) ? s.recentStudents : []);

  const payments = Array.isArray(recentPayments) ? recentPayments
    : (Array.isArray(s.recentPayments) ? s.recentPayments : []);

  const activity = payments.length ? payments : admissions;

  const STAT_CARDS = [
    { label:'TOTAL STUDENTS', value:totalStudents, icon:'👥', gradient:'var(--ilm-gradient-primary)', href:'/students' },
    { label:'PRESENT TODAY', value:presentToday, icon:'✅', gradient:'var(--ilm-gradient-success)', href:'/attendance-hub' },
    { label:'TOTAL STAFF', value:totalStaff, icon:'👨‍🏫', gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)', href:'/staff' },
    { label:'FEE TODAY', value:`Rs.${Number(feeToday).toLocaleString()}`, icon:'💰', gradient:'var(--ilm-gradient-gold)', href:'/fee-management' },
    { label:'PENDING FEES', value:feeDefaulters, icon:'📋', gradient:'var(--ilm-gradient-danger)', href:'/fees/defaulters' },
  ];

  return (
    <div className="page-content fade-in" style={{ padding: '20px 22px 40px' }}>

      {/* ══ GRADIENT PAGE HEADER ══ */}
      <div className="ilm-page-header ilm-animate">
        <div>
          <h1 className="ilm-page-title">Dashboard</h1>
          <p className="ilm-page-subtitle">School overview and quick statistics</p>
        </div>
        <button className="ilm-btn ilm-btn-sm"
          style={{background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.3)'}}
          onClick={() => refetch()}>
          🔄 Refresh
        </button>
      </div>

      {/* ══ SMART WORKFLOW HUB BANNER ══ */}
      <Link to="/workflow" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
        <div style={{
          background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 60%, #00a0d2 100%)',
          borderRadius: 10, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 16px rgba(0,115,183,0.28)',
          transition: 'transform .15s, box-shadow .15s',
          cursor: 'pointer',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,115,183,0.36)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,115,183,0.28)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 30 }}>🔄</div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>Smart Workflow Hub</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                New admission → Daily ops → Exams → Promotion → Leaving — ek jagah, poora cycle
              </div>
            </div>
            <div style={{ marginLeft: 8, display: 'flex', gap: 6 }}>
              {['📋 Admission', '📅 Daily', '📝 Exams', '⬆️ Promotion', '🎓 Leaving'].map(tag => (
                <span key={tag} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99 }}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            Open Hub <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      {/* ══ GRADIENT STAT CARDS ══ */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:20}}>
        {STAT_CARDS.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* ══ TWO CHARTS SIDE BY SIDE ══ */}
      <div className="grid-2" style={{ marginBottom: 20 }}>

        {/* Left — Monthly Fee Collection (Line Chart) */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3>Monthly Fee Collection</h3>
            <button className="btn btn-primary btn-sm">Apply Date Filter</button>
          </div>
          <div className="card-body" style={{ padding: '16px 12px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={feeChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#666' }} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={v => (v / 1000) + 'k'} />
                <Tooltip formatter={(v, name) => [Rs(v), name === 'thisYear' ? 'This Year' : 'Last Year']} />
                <Legend formatter={v => v === 'thisYear' ? 'This Year' : 'Last Year'} iconType="line" />
                <Line type="monotone" dataKey="thisYear" stroke="#0073b7" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="lastYear" stroke="#adb5bd" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right — Student Attendance Trend (Bar Chart) */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3>Student Attendance Trend</h3>
            <Link to="/hub/attendance" style={{ fontSize: 12, color: '#0073b7', textDecoration: 'none', fontWeight: 600 }}>
              View Report
            </Link>
          </div>
          <div className="card-body" style={{ padding: '16px 12px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#666' }} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                <Tooltip />
                <Legend iconType="rect" />
                <Bar dataKey="present" name="Present" fill="#0073b7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent"  name="Absent"  fill="#adb5bd" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ══ QUICK ACTIONS ══ */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid-4" style={{ gap: 12 }}>
            <ActionTile label="Mark Attendance"    to="/attendance-hub"            Icon={ClipboardList} bg="#f0fdf4" color="#00a65a" />
            <ActionTile label="Collect Fee"        to="/fee-management"            Icon={CreditCard}    bg="#eff6ff" color="#0073b7" />
            <ActionTile label="Add Student"        to="/admissions/wizard"         Icon={UserPlus}      bg="#ecfeff" color="#00c0ef" />
            <ActionTile label="Generate Report"    to="/reports-hub"               Icon={BarChart2}     bg="#f5f3ff" color="#605ca8" />
            <ActionTile label="Add Exam"           to="/exams"                     Icon={FileText}      bg="#fef2f2" color="#dd4b39" />
            <ActionTile label="Academic Calendar"  to="/academic-calendar"         Icon={FileText}      bg="#fff7ed" color="#d97706" />
            <ActionTile label="Send SMS"           to="/hub/communication?tab=sms" Icon={MessageSquare} bg="#fffbeb" color="#f39c12" />
            <ActionTile label={t('dashboard','defaulters')}     to="/fees/defaulters"           Icon={ClipboardList} bg="#fef9c3" color="#b45309" />
          </div>
        </div>
      </div>

      {/* ══ UPCOMING BIRTHDAYS (next 7 days) ══ */}
      {upcomingBirthdays.length > 0 && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #fce7f3', background: 'linear-gradient(135deg,#fdf4ff 0%,#fce7f3 100%)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(90deg,#7e22ce,#db2777)', borderRadius: '6px 6px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cake size={15} color="#f0abfc" />
              <h3 style={{ color: '#fff', margin: 0 }}>Upcoming Birthdays</h3>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99 }}>
                Next 7 Days — {upcomingBirthdays.length}
              </span>
            </div>
            <Link to="/hub/students?tab=birthdays" style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontWeight: 600 }}>
              View All →
            </Link>
          </div>
          <div className="card-body" style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
              {upcomingBirthdays.slice(0, 8).map((s, i) => {
                const dob = s.dob ? new Date(s.dob).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) : '—';
                const isToday = (s._daysUntil || 0) === 0;
                const daysLabel = isToday ? 'Today!' : `In ${s._daysUntil} day${s._daysUntil === 1 ? '' : 's'}`;
                const phone = s.emergencyPhone || s.phone || '';
                const COLORS = ['#F472B6','#818CF8','#34D399','#60A5FA','#FBBF24','#F87171','#A78BFA','#38BDF8'];
                const color = COLORS[i % COLORS.length];
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: i < upcomingBirthdays.slice(0,8).length - 1 ? '1px solid #fce7f3' : 'none', width: '50%', boxSizing: 'border-box', minWidth: 280 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: color + '22', border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color, flexShrink: 0 }}>
                      {(s.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 6 }}>
                        <span>{s.class?.name || s.className || '—'}</span>
                        <span style={{ color: '#cbd5e1' }}>·</span>
                        <span style={{ fontFamily: 'monospace' }}>{s.rollNo || '—'}</span>
                        <span style={{ color: '#cbd5e1' }}>·</span>
                        <span>{dob}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: isToday ? 18 : 14 }}>{isToday ? '🎂' : '🎁'}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? '#db2777' : '#7e22ce', whiteSpace: 'nowrap' }}>{daysLabel}</div>
                    </div>
                    {phone && (
                      <a
                        href={`https://wa.me/92${String(phone).replace(/^0/, '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Happy Birthday ${s.name}! 🎂 Wishing you a wonderful day from our school!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Wish via WhatsApp"
                        style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 7, background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                      >
                        <Phone size={12} color="#15803d" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            {upcomingBirthdays.length > 8 && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: 12, color: '#7e22ce', fontWeight: 600 }}>
                +{upcomingBirthdays.length - 8} more birthdays this week →{' '}
                <Link to="/hub/students?tab=birthdays" style={{ color: '#db2777', textDecoration: 'none' }}>View All</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ RECENT ACTIVITY TABLE ══ */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <h3>Recent Activity</h3>
          <Link to="/hub/fees" style={{ fontSize: 12, color: '#0073b7', textDecoration: 'none', fontWeight: 600 }}>
            View All
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['#', 'Student Name', 'Class', 'Action', 'Date', 'Status'].map(col => (
                  <th key={col} style={{
                    background: '#f4f6f9', color: '#666', fontWeight: 600,
                    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px',
                    padding: '10px 14px', borderBottom: '2px solid #dee2e6',
                    textAlign: 'left', whiteSpace: 'nowrap',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: 13 }}>
                    {isLoading ? 'Loading…' : 'No recent activity'}
                  </td>
                </tr>
              ) : activity.slice(0, 10).map((item, i) => {
                const isPay = !!item.amount;
                const name   = item.student?.name || item.name || '—';
                const cls    = item.student?.class?.name || item.class?.name || item.className || '—';
                const action = isPay ? `Fee – ${Rs(item.amount)}` : 'New Admission';
                const date   = fmtDate(item.paidAt || item.createdAt || item.admissionDate);
                const status = isPay ? 'Paid' : 'Active';
                const statusColor = isPay ? { bg: '#d4edda', color: '#155724' } : { bg: '#cce5ff', color: '#004085' };
                return (
                  <tr key={item.id || i} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={{ padding: '10px 14px', color: '#999' }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#333' }}>{name}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{cls}</td>
                    <td style={{ padding: '10px 14px', color: '#333' }}>{action}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{date}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 10,
                        fontSize: 11, fontWeight: 600,
                        background: statusColor.bg, color: statusColor.color,
                      }}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
