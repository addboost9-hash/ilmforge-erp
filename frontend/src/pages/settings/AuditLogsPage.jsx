import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Search } from 'lucide-react';
import api from '../../api/client';

function fmtDate(v) {
  return v ? new Date(v).toLocaleString('en-PK') : '-';
}

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['audit-summary'],
    queryFn: () => api.get('/audit/summary').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['audit-rows', action, resource],
    queryFn: () => api.get('/audit', { params: { action: action || undefined, resource: resource || undefined, limit: 150 } }).then((r) => r.data.data || []),
    staleTime: 10_000,
  });

  const actions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const resources = useMemo(() => {
    const set = new Set(rows.map((r) => r.resource).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  return (
    <div className="page-content fade-in" style={{ paddingBottom: 24 }}>
      <div style={{
        background: 'linear-gradient(120deg,#111827 0%,#1D4ED8 65%,#0F766E 100%)',
        borderRadius: 16,
        color: '#fff',
        padding: '20px 22px',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} />
          <div style={{ fontSize: 22, fontWeight: 900 }}>Audit Logs and Governance</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
          Full activity visibility for accountability, security review and compliance checks.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>Total Logs</div>
          <div style={{ marginTop: 3, fontSize: 24, fontWeight: 900, color: '#0F172A' }}>{summary?.total ?? 0}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>Last 7 Days</div>
          <div style={{ marginTop: 3, fontSize: 24, fontWeight: 900, color: '#1D4ED8' }}>{summary?.last7Days ?? 0}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>Top Action</div>
          <div style={{ marginTop: 3, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{summary?.byAction?.[0]?.key || '-'}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>Top Resource</div>
          <div style={{ marginTop: 3, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{summary?.byResource?.[0]?.key || '-'}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Search size={15} color="#475569" />
          <div style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>Filter Logs</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748B', marginBottom: 5 }}>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }}>
              <option value="">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748B', marginBottom: 5 }}>Resource</label>
            <select value={resource} onChange={(e) => setResource(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }}>
              <option value="">All resources</option>
              {resources.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', fontWeight: 800, fontSize: 13, color: '#334155' }}>
          Recent Audit Events
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 12, color: '#475569' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 12, color: '#475569' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 12, color: '#475569' }}>Resource</th>
                <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 12, color: '#475569' }}>Resource ID</th>
                <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 12, color: '#475569' }}>User</th>
                <th style={{ textAlign: 'left', padding: '9px 10px', fontSize: 12, color: '#475569' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#475569' }}>{fmtDate(row.createdAt)}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#0F172A', fontWeight: 700 }}>{row.action || '-'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#0F172A' }}>{row.resource || '-'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#475569' }}>{row.resourceId ?? '-'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#475569' }}>{row.userId ?? '-'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12.5, color: '#475569' }}>{row.ipAddress || '-'}</td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 13 }}>No audit entries for selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
