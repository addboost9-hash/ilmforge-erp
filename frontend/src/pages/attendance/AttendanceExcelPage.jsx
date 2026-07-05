import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { FileSpreadsheet, Download, Calendar, Users, ChevronDown } from 'lucide-react';

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

export default function AttendanceExcelPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Section A — Monthly Student Attendance
  const [studentFilters, setStudentFilters] = useState({
    classId: '',
    sectionId: '',
    month: currentMonth,
    year: currentYear,
  });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loadingStudentExcel, setLoadingStudentExcel] = useState(false);
  const [loadingDateRange, setLoadingDateRange] = useState(false);

  // Section B — Staff Attendance
  const [staffFilters, setStaffFilters] = useState({ month: currentMonth, year: currentYear });
  const [loadingStaffExcel, setLoadingStaffExcel] = useState(false);

  // Section C — Attendance Summary
  const [summaryFilters, setSummaryFilters] = useState({
    classId: '',
    month: currentMonth,
    year: currentYear,
  });
  const [loadingSummaryCSV, setLoadingSummaryCSV] = useState(false);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const selectedClass = (classes || []).find(c => String(c.id) === String(studentFilters.classId));
  const sections = selectedClass?.sections || [];

  // Summary preview data
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['att-summary-preview', summaryFilters],
    enabled: !!summaryFilters.classId,
    queryFn: () => api.get('/attendance/summary', { params: summaryFilters }).then(r => r.data.data),
  });

  // Student count for selected class
  const { data: classStudentsData } = useQuery({
    queryKey: ['class-students-count', studentFilters.classId],
    enabled: !!studentFilters.classId,
    queryFn: () => api.get('/students', { params: { classId: studentFilters.classId, limit: 1 } }).then(r => r.data),
  });

  async function handleStudentExcelDownload() {
    if (!studentFilters.classId) return;
    setLoadingStudentExcel(true);
    try {
      const response = await api.get('/attendance/excel', {
        params: {
          classId: studentFilters.classId,
          sectionId: studentFilters.sectionId || undefined,
          month: studentFilters.month,
          year: studentFilters.year,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `attendance_${MONTHS[studentFilters.month - 1]}_${studentFilters.year}.xlsx`;
      downloadBlob(blob, filename);
    } catch (err) {
      alert('Failed to download Excel file. Please try again.');
    } finally {
      setLoadingStudentExcel(false);
    }
  }

  async function handleDateRangeDownload() {
    if (!dateRange.from || !dateRange.to) return;
    setLoadingDateRange(true);
    try {
      const response = await api.get('/attendance/date-range', {
        params: {
          classId: studentFilters.classId || undefined,
          from: dateRange.from,
          to: dateRange.to,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, `attendance_${dateRange.from}_to_${dateRange.to}.xlsx`);
    } catch (err) {
      alert('Failed to download date range Excel. Please try again.');
    } finally {
      setLoadingDateRange(false);
    }
  }

  async function handleStaffExcelDownload() {
    setLoadingStaffExcel(true);
    try {
      const response = await api.get('/attendance/staff/excel', {
        params: { month: staffFilters.month, year: staffFilters.year },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, `staff_attendance_${MONTHS[staffFilters.month - 1]}_${staffFilters.year}.xlsx`);
    } catch (err) {
      alert('Failed to download staff Excel. Please try again.');
    } finally {
      setLoadingStaffExcel(false);
    }
  }

  function handleSummaryCSVDownload() {
    if (!summaryData || summaryData.length === 0) return;
    setLoadingSummaryCSV(true);
    try {
      const headers = ['Roll No', 'Name', 'Present', 'Absent', 'Leave', 'Total', 'Percentage'];
      const rows = summaryData.map(s => [
        s.rollNo || '',
        s.name || '',
        s.present || 0,
        s.absent || 0,
        s.leave || 0,
        s.total || 0,
        `${s.percentage || 0}%`,
      ]);
      const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `attendance_summary_${MONTHS[summaryFilters.month - 1]}_${summaryFilters.year}.csv`);
    } finally {
      setLoadingSummaryCSV(false);
    }
  }

  const summaryList = summaryData || [];
  const totalPresent = summaryList.reduce((s, r) => s + (r.present || 0), 0);
  const totalAbsent = summaryList.reduce((s, r) => s + (r.absent || 0), 0);

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Attendance Register Export</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Export attendance data as Excel or CSV files
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 14px' }}>
          <FileSpreadsheet size={16} color="#2563EB" />
          <span style={{ fontSize: 13, color: '#2563EB', fontWeight: 600 }}>Export Tools</span>
        </div>
      </div>

      {/* ── Section A: Monthly Student Attendance ── */}
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#DCFCE7', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
            <Users size={16} color="#15803D" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Section A — Monthly Student Attendance</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Generates month-wise attendance register in Excel format</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <label className="form-label">Class *</label>
            <select
              className="form-select"
              style={{ width: 160 }}
              value={studentFilters.classId}
              onChange={e => setStudentFilters({ ...studentFilters, classId: e.target.value, sectionId: '' })}
            >
              <option value="">Select Class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Section</label>
            <select
              className="form-select"
              style={{ width: 140 }}
              value={studentFilters.sectionId}
              onChange={e => setStudentFilters({ ...studentFilters, sectionId: e.target.value })}
              disabled={!studentFilters.classId || sections.length === 0}
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
              value={studentFilters.month}
              onChange={e => setStudentFilters({ ...studentFilters, month: parseInt(e.target.value) })}
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
              value={studentFilters.year}
              onChange={e => setStudentFilters({ ...studentFilters, year: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Student count preview */}
        {studentFilters.classId && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} color="#15803D" />
            <span style={{ fontSize: 13, color: '#15803D', fontWeight: 600 }}>
              {classStudentsData?.total != null ? `${classStudentsData.total} students in selected class` : 'Loading student count...'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleStudentExcelDownload}
            disabled={!studentFilters.classId || loadingStudentExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            {loadingStudentExcel ? 'Downloading...' : 'Download Monthly Excel'}
          </button>
        </div>

        {/* Date Range Export */}
        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 18, paddingTop: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Export by Date Range</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label">From Date</label>
              <input
                className="form-input"
                type="date"
                style={{ width: 160 }}
                value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">To Date</label>
              <input
                className="form-input"
                type="date"
                style={{ width: 160 }}
                value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <button
              className="btn btn-outline"
              onClick={handleDateRangeDownload}
              disabled={!dateRange.from || !dateRange.to || loadingDateRange}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} />
              {loadingDateRange ? 'Downloading...' : 'Export Date Range'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Section B: Staff Attendance ── */}
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
            <FileSpreadsheet size={16} color="#2563EB" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Section B — Staff Attendance</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Download monthly staff attendance register</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              style={{ width: 140 }}
              value={staffFilters.month}
              onChange={e => setStaffFilters({ ...staffFilters, month: parseInt(e.target.value) })}
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
              value={staffFilters.year}
              onChange={e => setStaffFilters({ ...staffFilters, year: parseInt(e.target.value) })}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleStaffExcelDownload}
            disabled={loadingStaffExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            {loadingStaffExcel ? 'Downloading...' : 'Download Staff Excel'}
          </button>
        </div>
      </div>

      {/* ── Section C: Attendance Summary ── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} color="#D97706" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Section C — Attendance Summary</h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Preview and export summary as CSV</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <label className="form-label">Class *</label>
            <select
              className="form-select"
              style={{ width: 160 }}
              value={summaryFilters.classId}
              onChange={e => setSummaryFilters({ ...summaryFilters, classId: e.target.value })}
            >
              <option value="">Select Class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              style={{ width: 140 }}
              value={summaryFilters.month}
              onChange={e => setSummaryFilters({ ...summaryFilters, month: parseInt(e.target.value) })}
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
              value={summaryFilters.year}
              onChange={e => setSummaryFilters({ ...summaryFilters, year: parseInt(e.target.value) })}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSummaryCSVDownload}
            disabled={!summaryFilters.classId || !summaryData || summaryData.length === 0 || loadingSummaryCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            {loadingSummaryCSV ? 'Generating...' : 'Export CSV'}
          </button>
        </div>

        {/* Preview table */}
        {!summaryFilters.classId ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon"><ChevronDown size={28} color="#94A3B8" /></div>
            <div className="empty-state-text">Select a class to preview summary data</div>
          </div>
        ) : summaryLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : summaryList.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-text">No data found for this period</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              {[
                { l: 'Students', v: summaryList.length, c: '#2563EB', bg: '#EFF6FF' },
                { l: 'Total Present', v: totalPresent, c: '#15803D', bg: '#DCFCE7' },
                { l: 'Total Absent', v: totalAbsent, c: '#B91C1C', bg: '#FEE2E2' },
              ].map(item => (
                <div key={item.l} style={{ flex: 1, background: item.bg, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.c }}>{item.v}</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{item.l}</div>
                </div>
              ))}
            </div>
            <div className="table-wrap" style={{ borderRadius: 8, maxHeight: 280, overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Leave</th>
                    <th>Total</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryList.map(s => (
                    <tr key={s.studentId}>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488', fontSize: 12 }}>{s.rollNo || '—'}</span></td>
                      <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{s.name}</td>
                      <td><span style={{ fontWeight: 700, color: '#15803D' }}>{s.present || 0}</span></td>
                      <td><span style={{ fontWeight: 700, color: '#DC2626' }}>{s.absent || 0}</span></td>
                      <td style={{ color: '#B45309' }}>{s.leave || 0}</td>
                      <td style={{ color: '#64748B' }}>{s.total || 0}</td>
                      <td>
                        <span className={`badge ${(s.percentage || 0) >= 75 ? 'badge-green' : (s.percentage || 0) >= 50 ? 'badge-amber' : 'badge-red'}`}>
                          {s.percentage || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
