/** Leave Balance — staff leave entitlements and remaining balances */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Calendar, Search, TrendingDown } from 'lucide-react';

export default function LeaveBalancePage() {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const { data = [], isLoading } = useQuery({
    queryKey: ['leave-balances', search, year],
    queryFn: () => api.get('/leave-balance', { params: { search, year, limit: 50 } }).then(r => r.data.data || []).catch(() => []),
  });

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const getBar = (used, total) => {
    if (!total) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  };

  const getColor = (pct) => {
    if (pct >= 90) return '#ef4444';
    if (pct >= 60) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="#0073b7" /> Leave Balance
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Staff leave entitlements and remaining balance for {year}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ flex: '0 0 120px' }} value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : data.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><TrendingDown size={40} /></div>
            <div className="empty-state-text">No leave balance data found</div>
            <div className="empty-state-sub">Leave balances are auto-created when staff apply for leaves</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>{['Staff Member', 'Designation', 'Leave Type', 'Entitled', 'Used', 'Remaining', 'Usage'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map(r => {
                const pct = getBar(r.usedDays || 0, r.entitledDays || 0);
                const color = getColor(pct);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.staff?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{r.staff?.designation || '—'}</td>
                    <td><span className="chip chip-blue">{r.leaveType || 'Annual'}</span></td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.entitledDays || 0}</td>
                    <td style={{ textAlign: 'center', color: r.usedDays > 0 ? '#ef4444' : '#64748b' }}>{r.usedDays || 0}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                      {Math.max(0, (r.entitledDays || 0) - (r.usedDays || 0))}
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 30 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
