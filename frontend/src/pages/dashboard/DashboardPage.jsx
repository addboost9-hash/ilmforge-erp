/**
 * IlmForge — Dashboard (Rebuilt)
 * Colorful stat cards + Recharts + Quick Actions + Recent Activity
 */
import { useState, useEffect } from 'react';
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
  FileText, MessageSquare, BarChart2
} from 'lucide-react';

/* ── helpers ── */
const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ── Stat Card ── */
function StatCard({ value, label, Icon, color, href }) {
  return (
    <div style={{
      background: color,
      borderRadius: 6,
      overflow: 'hidden',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      marginBottom: 0,
    }}>
      {/* Top body */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 90,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'white', lineHeight: 1 }}>
            {value ?? 0}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            {label}
          </div>
        </div>
        <div style={{
          position: 'absolute',
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 72,
          opacity: 0.2,
          color: 'white',
        }}>
          <Icon size={72} />
        </div>
      </div>

      {/* Footer strip */}
      <div style={{
        padding: '8px 20px',
        background: 'rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <a
          href={href}
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.85)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          More info <span>&#8250;</span>
        </a>
      </div>
    </div>
  );
}

/* ── Quick Action Tile ── */
function ActionTile({ label, to, Icon, bg, color }) {
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
}

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

  const feeChartData = buildFeeChartData(s);
  const attChartData = buildAttChartData(s);

  const admissions = Array.isArray(recentStudents) ? recentStudents
    : (Array.isArray(s.recentStudents) ? s.recentStudents : []);

  const payments = Array.isArray(recentPayments) ? recentPayments
    : (Array.isArray(s.recentPayments) ? s.recentPayments : []);

  const activity = payments.length ? payments : admissions;

  return (
    <div className="page-content fade-in" style={{ padding: '20px 22px 40px' }}>

      {/* ══ HEADER BAR ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
        background: '#fff', borderRadius: 6, padding: '12px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>
            Dashboard
          </div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            {authSchool?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School'} &nbsp;·&nbsp;
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => refetch()} disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin .8s linear infinite' : undefined }} />
            Refresh
          </button>
        </div>
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

      {/* ══ 6 STAT CARDS (3-column grid) ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
        <StatCard
          value={isLoading ? '…' : totalStudents}
          label={t('dashboard','totalStudents')}
          Icon={Users}
          color="#00a65a"
          href="/hub/students"
        />
        <StatCard
          value={isLoading ? '…' : totalStaff}
          label={t('dashboard','totalStaff')}
          Icon={Briefcase}
          color="#0073b7"
          href="/hub/staff"
        />
        <StatCard
          value={isLoading ? '…' : Rs(feeToday)}
          label={t('dashboard','feeToday')}
          Icon={DollarSign}
          color="#00c0ef"
          href="/fees"
        />
        <StatCard
          value={isLoading ? '…' : feeDefaulters}
          label={t('dashboard','defaulters')}
          Icon={AlertTriangle}
          color="#dd4b39"
          href="/fees/defaulters"
        />
        <StatCard
          value={isLoading ? '…' : presentToday}
          label={t('dashboard','presentToday')}
          Icon={CheckCircle}
          color="#605ca8"
          href="/hub/attendance"
        />
        <StatCard
          value={isLoading ? '…' : pendingLeaves}
          label={t('dashboard','pendingLeaves')}
          Icon={Calendar}
          color="#f39c12"
          href="/leaves"
        />
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
            <ActionTile label="Mark Attendance"    to="/hub/attendance?tab=flow"   Icon={ClipboardList} bg="#f0fdf4" color="#00a65a" />
            <ActionTile label="Collect Fee"        to="/hub/fees?tab=collect"      Icon={CreditCard}    bg="#eff6ff" color="#0073b7" />
            <ActionTile label="Add Student"        to="/hub/students?tab=admit"    Icon={UserPlus}      bg="#ecfeff" color="#00c0ef" />
            <ActionTile label="Reports Hub (110+)" to="/reports-hub"               Icon={BarChart2}     bg="#f5f3ff" color="#605ca8" />
            <ActionTile label="Academic Calendar"  to="/academic-calendar"         Icon={FileText}      bg="#fff7ed" color="#d97706" />
            <ActionTile label="Send SMS"           to="/hub/communication?tab=sms" Icon={MessageSquare} bg="#fffbeb" color="#f39c12" />
            <ActionTile label="Exam Results"       to="/hub/exams"                 Icon={FileText}      bg="#fef2f2" color="#dd4b39" />
            <ActionTile label={t('dashboard','defaulters')}     to="/fees/defaulters"           Icon={ClipboardList} bg="#fef9c3" color="#b45309" />
          </div>
        </div>
      </div>

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
