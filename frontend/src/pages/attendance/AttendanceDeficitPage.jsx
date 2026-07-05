import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { AlertTriangle, MessageSquare, Download, Users, CheckSquare, Square } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function PctBadge({ pct }) {
  if (pct < 60) return <span style={{ fontWeight: 700, color: '#DC2626' }}>{pct}%</span>;
  if (pct < 75) return <span style={{ fontWeight: 700, color: '#D97706' }}>{pct}%</span>;
  return <span style={{ fontWeight: 700, color: '#15803D' }}>{pct}%</span>;
}

export default function AttendanceDeficitPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [filters, setFilters] = useState({
    classId: '',
    minPct: 75,
    month: currentMonth,
    year: currentYear,
  });
  const [selected, setSelected] = useState(new Set());
  const [smsSending, setSmsSending] = useState(false);
  const [smsRowId, setSmsRowId] = useState(null);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['att-deficit', filters],
    queryFn: () =>
      api.get('/attendance/deficit', {
        params: {
          classId: filters.classId || undefined,
          minPct: filters.minPct,
          month: filters.month,
          year: filters.year,
        },
      }).then(r => r.data.data),
  });

  const rows = data || [];

  const stats = useMemo(() => {
    const belowThreshold = rows.filter(r => (r.percentage || 0) < filters.minPct);
    const critical = rows.filter(r => (r.percentage || 0) < 60);
    const perfect = rows.filter(r => (r.percentage || 0) === 100);
    return { total: rows.length, belowThreshold: belowThreshold.length, critical: critical.length, perfect: perfect.length };
  }, [rows, filters.minPct]);

  const belowRows = rows.filter(r => (r.percentage || 0) < filters.minPct);

  function daysNeeded(row) {
    const { present = 0, total = 0 } = row;
    const threshold = filters.minPct / 100;
    // Let d = additional days needed, all present
    // (present + d) / (total + d) >= threshold
    // present + d >= threshold * (total + d)
    // present + d >= threshold*total + threshold*d
    // d(1 - threshold) >= threshold*total - present
    const num = threshold * total - present;
    if (num <= 0) return 0;
    const denom = 1 - threshold;
    if (denom <= 0) return 0;
    return Math.ceil(num / denom);
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === belowRows.length && belowRows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(belowRows.map(r => r.studentId)));
    }
  }

  async function sendSMS(studentIds, isBulk = false) {
    if (isBulk) {
      setSmsSending(true);
    } else {
      setSmsRowId(studentIds[0]);
    }
    try {
      await api.post('/notifications/attendance-reminder', { studentIds, month: filters.month, year: filters.year });
      alert(`SMS reminder sent to ${studentIds.length} student(s).`);
      if (isBulk) setSelected(new Set());
    } catch {
      alert('Failed to send SMS. Please try again.');
    } finally {
      setSmsSending(false);
      setSmsRowId(null);
    }
  }

  function handleExportExcel() {
    const rows_to_export = belowRows.filter(r => selected.size === 0 || selected.has(r.studentId));
    const headers = ['Roll No', 'Name', 'Class', 'Parent Phone', 'Present', 'Total', '%', 'Days Needed'];
    const csvRows = rows_to_export.map(r => [
      r.rollNo || '',
      r.name || '',
      r.className || '',
      r.parentPhone || '',
      r.present || 0,
      r.total || 0,
      `${r.percentage || 0}%`,
      daysNeeded(r),
    ]);
    const csv = [headers, ...csvRows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `attendance_deficit_${MONTHS[filters.month - 1]}_${filters.year}.csv`);
  }

  const allBelowSelected = belowRows.length > 0 && selected.size === belowRows.length;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Attendance Shortage Alert</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Identify students below minimum attendance threshold
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={handleExportExcel}
            disabled={belowRows.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} /> Export Excel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => sendSMS(Array.from(selected), true)}
            disabled={selected.size === 0 || smsSending}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <MessageSquare size={14} />
            {smsSending ? 'Sending...' : `Bulk SMS (${selected.size})`}
          </button>
        </div>
      </div>

      {/* Settings / Filter Bar */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Class</label>
            <select
              className="form-select"
              style={{ width: 160 }}
              value={filters.classId}
              onChange={e => setFilters({ ...filters, classId: e.target.value })}
            >
              <option value="">All Classes</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <div style={{ minWidth: 220 }}>
            <label className="form-label">
              Min Threshold: <strong style={{ color: '#DC2626' }}>{filters.minPct}%</strong>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>50%</span>
              <input
                type="range"
                min={50}
                max={90}
                step={5}
                value={filters.minPct}
                onChange={e => setFilters({ ...filters, minPct: parseInt(e.target.value) })}
                style={{ flex: 1, accentColor: '#DC2626' }}
              />
              <span style={{ fontSize: 11, color: '#94A3B8' }}>90%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid-4" style={{ marginBottom: 16 }}>
        {[
          { l: 'Total Students', v: stats.total, c: '#2563EB', bg: '#EFF6FF', icon: <Users size={16} color="#2563EB" /> },
          { l: 'Below Threshold', v: stats.belowThreshold, c: '#D97706', bg: '#FEF3C7', icon: <AlertTriangle size={16} color="#D97706" /> },
          { l: 'Critical (<60%)', v: stats.critical, c: '#B91C1C', bg: '#FEE2E2', icon: <AlertTriangle size={16} color="#B91C1C" /> },
          { l: 'Perfect (100%)', v: stats.perfect, c: '#15803D', bg: '#DCFCE7', icon: <Users size={16} color="#15803D" /> },
        ].map(item => (
          <div key={item.l} className="card" style={{ background: item.bg, border: 'none', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: item.c }}>{item.v}</div>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>{item.l}</div>
              </div>
              <div style={{ background: 'white', borderRadius: 8, padding: 6 }}>{item.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#2563EB', fontWeight: 600 }}>
            {selected.size} student(s) selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => sendSMS(Array.from(selected), true)}
              disabled={smsSending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <MessageSquare size={12} />
              {smsSending ? 'Sending...' : 'Send SMS Reminder'}
            </button>
            <button className="btn btn-outline" onClick={() => setSelected(new Set())} style={{ fontSize: 12 }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon"><AlertTriangle size={36} color="#94A3B8" /></div>
            <div className="empty-state-text">No deficit records found for the selected period</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                      {allBelowSelected ? <CheckSquare size={16} color="#2563EB" /> : <Square size={16} color="#94A3B8" />}
                    </button>
                  </th>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Parent Phone</th>
                  <th>Present</th>
                  <th>Total Days</th>
                  <th>%</th>
                  <th>Days Needed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const pct = r.percentage || 0;
                  const belowThreshold = pct < filters.minPct;
                  const needed = daysNeeded(r);
                  return (
                    <tr key={r.studentId} style={{ background: belowThreshold ? (pct < 60 ? '#FFF5F5' : '#FFFBEB') : 'white' }}>
                      <td>
                        {belowThreshold && (
                          <button
                            onClick={() => toggleSelect(r.studentId)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          >
                            {selected.has(r.studentId)
                              ? <CheckSquare size={16} color="#2563EB" />
                              : <Square size={16} color="#94A3B8" />}
                          </button>
                        )}
                      </td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488', fontSize: 12 }}>{r.rollNo || '—'}</span></td>
                      <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{r.name}</td>
                      <td style={{ color: '#64748B' }}>{r.className || '—'}</td>
                      <td style={{ color: '#64748B', fontFamily: 'monospace' }}>{r.parentPhone || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#15803D' }}>{r.present || 0}</td>
                      <td style={{ color: '#64748B' }}>{r.total || 0}</td>
                      <td><PctBadge pct={pct} /></td>
                      <td>
                        {needed > 0 ? (
                          <span style={{ fontWeight: 700, color: '#DC2626', fontSize: 13 }}>+{needed}</span>
                        ) : (
                          <span style={{ color: '#15803D', fontSize: 12 }}>On Track</span>
                        )}
                      </td>
                      <td>
                        {belowThreshold && (
                          <button
                            className="btn btn-outline"
                            onClick={() => sendSMS([r.studentId])}
                            disabled={smsRowId === r.studentId}
                            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <MessageSquare size={11} />
                            {smsRowId === r.studentId ? '...' : 'SMS'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
