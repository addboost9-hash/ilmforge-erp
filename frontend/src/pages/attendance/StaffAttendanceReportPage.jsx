/** Staff Attendance Report — monthly summary for all teaching and non-teaching staff */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Printer, BarChart2 } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function StaffAttendanceReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const { data = [], isLoading } = useQuery({
    queryKey: ['staff-att-report', month, year],
    queryFn: () => api.get('/attendance/staff-report', { params: { month, year } }).then(r => r.data.data || []).catch(() => []),
  });

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const getPct = r => {
    const total = (r.presentDays || 0) + (r.absentDays || 0) + (r.lateDays || 0);
    if (!total) return 0;
    return Math.round(((r.presentDays || 0) / total) * 100);
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={20} color="#0073b7" /> Staff Attendance Report
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Monthly attendance summary for all staff members</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Printer size={14} /> Print</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select className="form-select" style={{ flex: '0 0 160px' }} value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
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
            <div className="empty-state-icon"><BarChart2 size={40} /></div>
            <div className="empty-state-text">No staff attendance data for {MONTHS[month - 1]} {year}</div>
            <div className="empty-state-sub">Mark staff attendance daily to generate monthly reports</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <h3>{MONTHS[month - 1]} {year} — Staff Attendance</h3>
            <span style={{ fontSize: 13, color: '#64748b' }}>{data.length} staff members</span>
          </div>
          <table className="table-modern">
            <thead>
              <tr>{['Staff Name', 'Designation', 'Present', 'Absent', 'Late', 'Leave', 'Attendance %', 'Remarks'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                const pct = getPct(r);
                const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
                return (
                  <tr key={r.id || i}>
                    <td style={{ fontWeight: 600 }}>{r.staff?.name || r.name || '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{r.staff?.designation || r.designation || '—'}</td>
                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{r.presentDays || 0}</td>
                    <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{r.absentDays || 0}</td>
                    <td style={{ textAlign: 'center', color: '#f59e0b' }}>{r.lateDays || 0}</td>
                    <td style={{ textAlign: 'center' }}>{r.leaveDays || 0}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>{r.remarks || (pct >= 90 ? 'Excellent' : pct >= 75 ? 'Good' : 'Needs Improvement')}</td>
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
