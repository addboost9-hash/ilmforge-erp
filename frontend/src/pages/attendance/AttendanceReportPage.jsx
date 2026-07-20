import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Printer, Search, BarChart2 } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function pctColor(pct) {
  if (pct >= 85) return { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', label: 'badge-green' };
  if (pct >= 75) return { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', label: 'badge-amber' };
  return { color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA', label: 'badge-red' };
}

export default function AttendanceReportPage() {
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    student: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const selectedClass = (classes || []).find(c => String(c.id) === String(filters.classId));
  const sections = selectedClass?.sections || [];

  const { data, isLoading } = useQuery({
    queryKey: ['att-report', activeFilters],
    enabled: !!activeFilters,
    queryFn: () =>
      api.get('/attendance/report', { params: activeFilters })
        .then(r => r.data.data)
        .catch(() =>
          api.get('/attendance/summary', { params: activeFilters }).then(r => r.data.data)
        ),
  });

  function handleLoad() {
    if (!filters.classId) return;
    setActiveFilters({ ...filters });
    setSubmitted(true);
  }

  const summary = data || [];

  const filtered = filters.student.trim()
    ? summary.filter(s =>
        s.name?.toLowerCase().includes(filters.student.toLowerCase()) ||
        s.regNo?.toLowerCase().includes(filters.student.toLowerCase()) ||
        s.rollNo?.toLowerCase().includes(filters.student.toLowerCase())
      )
    : summary;

  const avgPct = filtered.length
    ? Math.round(filtered.reduce((s, r) => s + (r.percentage || 0), 0) / filtered.length)
    : 0;
  const totalStudents = filtered.length;

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Attendance Report</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Monthly attendance summary per student</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => window.print()}
          disabled={!submitted || filtered.length === 0}
        >
          <Printer size={14} /> Print / PDF
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Class *</label>
            <select
              className="form-select"
              style={{ width: 160 }}
              value={filters.classId}
              onChange={e => setFilters({ ...filters, classId: e.target.value, sectionId: '' })}
            >
              <option value="">Select Class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Section</label>
            <select
              className="form-select"
              style={{ width: 130 }}
              value={filters.sectionId}
              onChange={e => setFilters({ ...filters, sectionId: e.target.value })}
              disabled={!filters.classId || sections.length === 0}
            >
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              style={{ width: 140 }}
              value={filters.month}
              onChange={e => setFilters({ ...filters, month: parseInt(e.target.value) })}
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Year</label>
            <input
              className="form-input"
              type="number"
              style={{ width: 100 }}
              value={filters.year}
              onChange={e => setFilters({ ...filters, year: parseInt(e.target.value) })}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
            <label className="form-label">Student Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 30 }}
                placeholder="Name or Reg No..."
                value={filters.student}
                onChange={e => setFilters({ ...filters, student: e.target.value })}
              />
            </div>
          </div>
          <button
            className="btn btn-teal"
            onClick={handleLoad}
            disabled={!filters.classId || isLoading}
            style={{ alignSelf: 'flex-end' }}
          >
            <BarChart2 size={14} /> {isLoading ? 'Loading...' : 'Load Report'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {submitted && filtered.length > 0 && (
        <div className="stats-grid-3" style={{ marginBottom: 14 }}>
          {[
            { l: 'Total Students', v: totalStudents, c: '#1E3A5F', bg: '#EFF6FF' },
            { l: 'Avg Attendance', v: avgPct + '%', c: pctColor(avgPct).color, bg: pctColor(avgPct).bg },
            { l: 'Below 75%', v: filtered.filter(s => (s.percentage || 0) < 75).length, c: '#B91C1C', bg: '#FEE2E2' },
          ].map(item => (
            <div key={item.l} className="card" style={{ background: item.bg, border: 'none', padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: item.c }}>{item.v}</div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{item.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {!submitted ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Select filters and click "Load Report"</div>
          </div>
        ) : isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Name</th>
                  <th>Father Name</th>
                  <th style={{ textAlign: 'center' }}>Total Days</th>
                  <th style={{ textAlign: 'center' }}>Present</th>
                  <th style={{ textAlign: 'center' }}>Absent</th>
                  <th style={{ textAlign: 'center' }}>Leave</th>
                  <th style={{ minWidth: 140 }}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const pct = s.percentage || 0;
                  const pc = pctColor(pct);
                  return (
                    <tr key={s.studentId || s.id} style={{ borderLeft: `3px solid ${pc.border}` }}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488', fontSize: 12 }}>
                          {s.regNo || s.rollNo || '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{s.name}</td>
                      <td style={{ color: '#64748B', fontSize: 12.5 }}>{s.fatherName || '—'}</td>
                      <td style={{ textAlign: 'center', color: '#64748B' }}>{s.total || 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#15803D' }}>{s.present || 0}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#DC2626' }}>{s.absent || 0}</span>
                      </td>
                      <td style={{ textAlign: 'center', color: '#B45309' }}>{s.leave || 0}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 60 }}>
                            <div
                              className="progress-fill"
                              style={{ width: `${pct}%`, background: pc.color }}
                            />
                          </div>
                          <span
                            className={`badge ${pc.label}`}
                            style={{ minWidth: 46, textAlign: 'center', fontWeight: 700 }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                      No attendance data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
