import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';

const Rs = (v) => `Rs. ${Number(v || 0).toLocaleString('en-PK')}`;

function StatCard({ title, value, sub, icon: Icon, color, bg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} color={color} />
        <span style={{ color, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
      </div>
      <div style={{ color, fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>{value}</div>
      <div style={{ marginTop: 3, color: '#64748B', fontSize: 12 }}>{sub}</div>
    </div>
  );
}

function ActionTile({ to, title, desc, icon: Icon, color }) {
  return (
    <Link
      to={to}
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '14px 16px',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#1E3A5F', fontWeight: 700, fontSize: 13.5 }}>{title}</div>
        <div style={{ color: '#64748B', fontSize: 12 }}>{desc}</div>
      </div>
      <ArrowRight size={15} color="#94A3B8" />
    </Link>
  );
}

export default function AccountantPortalPage() {
  const { user, logout } = useAuthStore();

  if (!user || user.role !== 'accountant') {
    return <Navigate to="/login" replace />;
  }

  const { data: invoices = [] } = useQuery({
    queryKey: ['accountant-invoices'],
    queryFn: () => api.get('/fees/invoices', { params: { limit: 120 } }).then((r) => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  const { data: defaulters = [] } = useQuery({
    queryKey: ['accountant-defaulters'],
    queryFn: () => api.get('/fees/defaulters').then((r) => r.data.data || []),
    staleTime: 60_000,
    retry: false,
  });

  const summary = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid');
    const partial = invoices.filter((i) => i.status === 'partial');
    const unpaid = invoices.filter((i) => i.status === 'unpaid');
    const totalCollected = paid.reduce((s, i) => s + (i.paidAmount || 0), 0) + partial.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalDue = [...partial, ...unpaid].reduce((s, i) => s + (i.dueAmount || 0), 0);
    return {
      totalCollected,
      totalDue,
      paidCount: paid.length,
      defaulterCount: defaulters.length,
    };
  }, [invoices, defaulters]);

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ background: 'linear-gradient(120deg,#1E3A5F 0%,#0F766E 70%)', color: '#fff', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12.5, opacity: 0.8 }}>Finance Portal</div>
            <h1 style={{ margin: '2px 0 4px', fontSize: 24, fontWeight: 900 }}>Accountant Workspace</h1>
            <div style={{ fontSize: 13, opacity: 0.82 }}>
              Welcome {user.name || 'Accountant'} · {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <button
            onClick={logout}
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 16px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
          <StatCard title="Collected" value={Rs(summary.totalCollected)} sub="Paid + partial receipts" icon={Wallet} color="#15803D" bg="#DCFCE7" />
          <StatCard title="Outstanding" value={Rs(summary.totalDue)} sub="Current dues" icon={AlertTriangle} color="#B91C1C" bg="#FEE2E2" />
          <StatCard title="Paid Invoices" value={summary.paidCount} sub="Fully settled" icon={Receipt} color="#1D4ED8" bg="#DBEAFE" />
          <StatCard title="Defaulters" value={summary.defaulterCount} sub="Need reminders" icon={PiggyBank} color="#B45309" bg="#FEF3C7" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 10, marginBottom: 18 }}>
          <ActionTile to="/fees/collect" title="Collect Fee" desc="Search student and post payment" icon={Wallet} color="#0F766E" />
          <ActionTile to="/fees/defaulters" title="Fee Defaulters" desc="Review unpaid and partial invoices" icon={AlertTriangle} color="#DC2626" />
          <ActionTile to="/expenses" title="Expenses" desc="Track school expense entries" icon={Landmark} color="#2563EB" />
          <ActionTile to="/salary" title="Salary & Payroll" desc="Issue salaries and manage payroll" icon={Receipt} color="#7C3AED" />
          <ActionTile to="/reports" title="Financial Reports" desc="Income, expenses, and summary reports" icon={BarChart3} color="#0891B2" />
          <ActionTile to="/salary/loans" title="Staff Loans" desc="Monitor active loan deductions" icon={Calendar} color="#D97706" />
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 15, color: '#1E3A5F', fontWeight: 800, marginBottom: 10 }}>Recent Defaulter Snapshot</div>
          {defaulters.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: 13 }}>No active defaulters found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Student', 'Roll No', 'Class', 'Due Amount', 'Status'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {defaulters.slice(0, 8).map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', color: '#1E3A5F', fontWeight: 600 }}>{row.student?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{row.student?.rollNo || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{row.student?.class?.name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#B91C1C', fontWeight: 700 }}>{Rs(row.dueAmount)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: row.status === 'partial' ? '#FEF3C7' : '#FEE2E2', color: row.status === 'partial' ? '#B45309' : '#B91C1C', padding: '2px 8px', borderRadius: 999, fontWeight: 700, textTransform: 'capitalize' }}>
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
    </div>
  );
}
