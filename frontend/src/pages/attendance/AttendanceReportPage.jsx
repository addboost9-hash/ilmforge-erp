import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Printer, Search, BarChart2, FileDown, Users, AlertTriangle, List } from 'lucide-react';
import { downloadExcel } from '../../utils/export';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function pctColor(pct) {
  if (pct >= 85) return { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', label: 'badge-green' };
  if (pct >= 75) return { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', label: 'badge-amber' };
  return { color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA', label: 'badge-red' };
}

const REPORT_TYPES = [
  { id:'summary',   label:'Summary',   desc:'Monthly totals per student',      icon:BarChart2,    color:'#0D9488' },
  { id:'detailed',  label:'Detailed',  desc:'Day-by-day attendance breakdown',  icon:List,         color:'#2563EB' },
  { id:'defaulters',label:'Defaulters',desc:'Students below 75% attendance',    icon:AlertTriangle,color:'#DC2626' },
];

export default function AttendanceReportPage() {
  const [reportType, setReportType] = useState('summary');
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    dateFrom: '',
    dateTo: '',
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

  const filtered = (() => {
    let list = summary;
    /* Search filter */
    if (filters.student.trim()) {
      const q = filters.student.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.regNo?.toLowerCase().includes(q) ||
        s.rollNo?.toLowerCase().includes(q)
      );
    }
    /* Defaulters filter */
    if (reportType === 'defaulters') {
      list = list.filter(s => (s.percentage || 0) < 75);
    }
    return list;
  })();

  const avgPct = filtered.length
    ? Math.round(filtered.reduce((s, r) => s + (r.percentage || 0), 0) / filtered.length)
    : 0;
  const totalStudents = filtered.length;

  async function handleExportExcel() {
    if (!filtered.length) return;
    const MONTH_NAMES = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December',
    ];
    const monthLabel = MONTH_NAMES[(activeFilters?.month || filters.month) - 1] || String(filters.month);
    const yearLabel  = activeFilters?.year || filters.year;

    const rows = filtered.map(s => ({
      'Reg No':      s.regNo || s.rollNo || '',
      'Name':        s.name || '',
      'Father Name': s.fatherName || '',
      'Total Days':  s.total || 0,
      'Present':     s.present || 0,
      'Absent':      s.absent || 0,
      'Leave':       s.leave || 0,
      'Percentage':  `${s.percentage || 0}%`,
    }));

    const columns = [
      { header: 'Reg No',      key: 'Reg No',      width: 14 },
      { header: 'Name',        key: 'Name',         width: 24 },
      { header: 'Father Name', key: 'Father Name',  width: 24 },
      { header: 'Total Days',  key: 'Total Days',   width: 12 },
      { header: 'Present',     key: 'Present',      width: 10 },
      { header: 'Absent',      key: 'Absent',       width: 10 },
      { header: 'Leave',       key: 'Leave',        width: 10 },
      { header: 'Percentage',  key: 'Percentage',   width: 12 },
    ];

    await downloadExcel(rows, `attendance-${monthLabel}-${yearLabel}.xlsx`, 'Attendance', columns);
  }

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Attendance Report</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Monthly attendance summary per student</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => {
              if (!filtered.length) return;
              const csv = [
                ['Reg No','Name','Father Name','Total Days','Present','Absent','Leave','Percentage'].join(','),
                ...filtered.map(s => [
                  s.regNo || s.rollNo || '',
                  `"${s.name || ''}"`,
                  `"${s.fatherName || ''}"`,
                  s.total || 0,
                  s.present || 0,
                  s.absent || 0,
                  s.leave || 0,
                  `${s.percentage || 0}%`,
                ].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href = url; a.download = `attendance-${reportType}-report.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!submitted || filtered.length === 0}
          >
            <FileDown size={14} /> Download CSV
          </button>
          <button
            className="btn btn-outline"
            onClick={handleExportExcel}
            disabled={!submitted || filtered.length === 0}
          >
            <FileDown size={14} /> Download Excel
          </button>
          <button
            className="btn btn-outline"
            onClick={() => window.print()}
            disabled={!submitted || filtered.length === 0}
          >
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {REPORT_TYPES.map(rt => {
          const RtIcon = rt.icon;
          const active = reportType === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                borderRadius: 10, border: `2px solid ${active ? rt.color : '#E2E8F0'}`,
                background: active ? rt.color + '12' : '#fff',
                cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 8, background: rt.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RtIcon size={15} color={rt.color} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? rt.color : '#374151' }}>{rt.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{rt.desc}</div>
              </div>
            </button>
          );
        })}
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
          <div>
            <label className="form-label">Date From</label>
            <input
              className="form-input"
              type="date"
              style={{ width: 140 }}
              value={filters.dateFrom}
              onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Date To</label>
            <input
              className="form-input"
              type="date"
              style={{ width: 140 }}
              value={filters.dateTo}
              onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
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
            <BarChart2 size={14} /> {isLoading ? 'Loading...' : `Load ${REPORT_TYPES.find(r => r.id === reportType)?.label || 'Report'}`}
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
        {submitted && filtered.length > 0 && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: 6 }}>
              {(() => { const rt = REPORT_TYPES.find(r => r.id === reportType); const RtIcon = rt?.icon || BarChart2; return <RtIcon size={14} color={rt?.color} />; })()}
              {REPORT_TYPES.find(r => r.id === reportType)?.label} Report
              {reportType === 'defaulters' && (
                <span style={{ marginLeft: 8, fontSize: 11, background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                  {filtered.length} defaulters
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{filtered.length} students</span>
          </div>
        )}
        {!submitted ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Select class &amp; filters, then click "Load Report"</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Choose a report type above to get started</div>
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
