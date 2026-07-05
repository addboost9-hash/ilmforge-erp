import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Save, RefreshCw, Users, BookOpen, BarChart2,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const today = new Date().toISOString().split('T')[0];

const STATUS_BTNS = [
  { val: 'present', label: 'P', color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' },
  { val: 'absent',  label: 'A', color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' },
  { val: 'leave',   label: 'L', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
];

function statusStyle(val, current) {
  const s = STATUS_BTNS.find(b => b.val === val);
  if (!s) return {};
  const active = current === val;
  return {
    padding: '4px 10px',
    borderRadius: 5,
    border: `1.5px solid ${active ? s.border : '#E2E8F0'}`,
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    fontSize: 11,
    background: active ? s.bg : '#F8FAFC',
    color: active ? s.color : '#94A3B8',
    transition: 'all 0.1s',
    whiteSpace: 'nowrap',
  };
}

function pctColor(pct) {
  if (pct >= 75) return '#15803D';
  if (pct >= 60) return '#B45309';
  return '#B91C1C';
}

function pctBg(pct) {
  if (pct >= 75) return '#DCFCE7';
  if (pct >= 60) return '#FEF3C7';
  return '#FEE2E2';
}

// ---------------------------------------------------------------------------
// Sub-component: Mark Attendance Tab
// ---------------------------------------------------------------------------
function MarkAttendanceTab({ classes }) {
  const [filters, setFilters] = useState({ classId: '', sectionId: '', date: today });
  // attendance[studentId][periodNo] = 'present'|'absent'|'leave'
  const [attendance, setAttendance] = useState({});

  const cls = (classes || []).find(c => c.id === parseInt(filters.classId));
  const sections = cls?.sections || [];

  // Load students
  const { data: students, isLoading: loadingStudents, refetch: refetchStudents } = useQuery({
    queryKey: ['students-period', filters.classId, filters.sectionId],
    enabled: !!filters.classId,
    queryFn: () =>
      api.get('/attendance', { params: { classId: filters.classId, sectionId: filters.sectionId || undefined, date: filters.date } })
         .then(r => r.data.data),
  });

  // Load timetable periods for selected class + day-of-week
  const dayName = filters.date
    ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(filters.date).getDay()]
    : '';

  const { data: timetable, isLoading: loadingTimetable } = useQuery({
    queryKey: ['timetable-periods', filters.classId, filters.date],
    enabled: !!filters.classId && !!filters.date,
    queryFn: () =>
      api.get('/timetable', { params: { classId: filters.classId, day: dayName } })
         .then(r => {
           const rows = r.data?.data || r.data || [];
           // Sort by periodNo
           return [...rows].sort((a, b) => a.periodNo - b.periodNo);
         })
         .catch(() => []),
  });

  // Load existing period attendance for this class+date
  const { data: existingRecords } = useQuery({
    queryKey: ['period-attendance', filters.classId, filters.date],
    enabled: !!filters.classId && !!filters.date,
    queryFn: () =>
      api.get('/attendance/period', { params: { classId: filters.classId, date: filters.date } })
         .then(r => r.data.data || [])
         .catch(() => []),
  });

  // Build periods list: from timetable or fallback 1-8
  const periods = useMemo(() => {
    if (timetable && timetable.length > 0) return timetable;
    // Fallback: 8 generic periods
    return Array.from({ length: 8 }, (_, i) => ({
      periodNo: i + 1,
      subjectId: null,
      subject: null,
      teacherId: null,
      startTime: null,
      endTime: null,
    }));
  }, [timetable]);

  // Hydrate attendance state from existing records
  useEffect(() => {
    if (!students) return;
    const map = {};
    students.forEach(s => { map[s.id] = {}; });

    if (existingRecords && existingRecords.length > 0) {
      existingRecords.forEach(r => {
        if (!map[r.studentId]) map[r.studentId] = {};
        map[r.studentId][r.period] = r.status;
      });
    } else {
      // Default all to 'present'
      students.forEach(s => {
        periods.forEach(p => { map[s.id][p.periodNo] = 'present'; });
      });
    }
    setAttendance(map);
  }, [students, existingRecords, periods]);

  const mark = (studentId, periodNo, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [periodNo]: status },
    }));
  };

  const markAllForPeriod = (periodNo, status) => {
    setAttendance(prev => {
      const next = { ...prev };
      (students || []).forEach(s => {
        next[s.id] = { ...next[s.id], [periodNo]: status };
      });
      return next;
    });
  };

  const markAllForStudent = (studentId, status) => {
    setAttendance(prev => {
      const next = { ...prev, [studentId]: {} };
      periods.forEach(p => { next[studentId][p.periodNo] = status; });
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => {
      const records = [];
      (students || []).forEach(s => {
        periods.forEach(p => {
          records.push({
            studentId: s.id,
            periodId: p.id || null,
            subjectId: p.subjectId || null,
            period: p.periodNo,
            status: attendance[s.id]?.[p.periodNo] || 'present',
          });
        });
      });
      return api.post('/attendance/period', {
        classId: parseInt(filters.classId),
        sectionId: filters.sectionId ? parseInt(filters.sectionId) : null,
        date: filters.date,
        records,
      });
    },
    onSuccess: r => toast.success(r.data.message || 'Period attendance saved!'),
    onError: err => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const isLoading = loadingStudents || loadingTimetable;
  const totalStudents = students?.length || 0;

  // Stats per period
  const periodStats = (periodNo) => {
    const present = (students || []).filter(s => attendance[s.id]?.[periodNo] === 'present').length;
    const absent  = (students || []).filter(s => attendance[s.id]?.[periodNo] === 'absent').length;
    const leave   = (students || []).filter(s => attendance[s.id]?.[periodNo] === 'leave').length;
    return { present, absent, leave };
  };

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 14, padding: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 160px' }}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={filters.classId}
              onChange={e => setFilters({ ...filters, classId: e.target.value, sectionId: '' })}>
              <option value="">Select Class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 130px' }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={filters.sectionId}
              onChange={e => setFilters({ ...filters, sectionId: e.target.value })}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 150px' }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={filters.date}
              onChange={e => setFilters({ ...filters, date: e.target.value })}
              max={today} />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 1 }}>
            <button className="btn btn-outline btn-sm" onClick={() => { refetchStudents(); }}>
              <RefreshCw size={13} />
            </button>
            <button className="btn btn-teal"
              onClick={() => save.mutate()}
              disabled={save.isPending || !filters.classId || totalStudents === 0}>
              <Save size={14} /> {save.isPending ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>

      {!filters.classId ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📚</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>Select a Class to Start</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Choose class, section and date from the filters above
          </div>
        </div>
      ) : isLoading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      ) : totalStudents === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          No students found for this class/section.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                {/* Period headers row */}
                <tr style={{ background: '#1E3A5F' }}>
                  <th style={{ ...thStyle, minWidth: 36, width: 36, color: '#CBD5E1', fontSize: 11 }}>#</th>
                  <th style={{ ...thStyle, minWidth: 60, color: '#CBD5E1', fontSize: 11 }}>Roll</th>
                  <th style={{ ...thStyle, minWidth: 160, textAlign: 'left', color: '#CBD5E1', fontSize: 11 }}>Student</th>
                  <th style={{ ...thStyle, width: 80, color: '#CBD5E1', fontSize: 11 }}>All</th>
                  {periods.map(p => (
                    <th key={p.periodNo} style={{ ...thStyle, minWidth: 120, color: '#E2E8F0' }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>P-{p.periodNo}</div>
                      {p.subject?.name && (
                        <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginTop: 1 }}>
                          {p.subject.name}
                        </div>
                      )}
                      {(p.startTime || p.endTime) && (
                        <div style={{ fontSize: 9, color: '#64748B', fontWeight: 400 }}>
                          {p.startTime}{p.startTime && p.endTime ? '–' : ''}{p.endTime}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
                {/* Quick-mark all row */}
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                  <td colSpan={4} style={{ padding: '6px 10px', fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                    Quick: All Present
                  </td>
                  {periods.map(p => {
                    const st = periodStats(p.periodNo);
                    return (
                      <td key={p.periodNo} style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            style={{ ...quickBtnStyle, background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
                            title="All Present"
                            onClick={() => markAllForPeriod(p.periodNo, 'present')}>
                            <CheckCircle size={10} /> All P
                          </button>
                          <button
                            style={{ ...quickBtnStyle, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
                            title="All Absent"
                            onClick={() => markAllForPeriod(p.periodNo, 'absent')}>
                            <XCircle size={10} /> All A
                          </button>
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                          {st.present}P {st.absent}A {st.leave}L
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(students || []).map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFE'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...tdStyle, color: '#94A3B8', fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#0D9488', fontFamily: 'monospace', fontSize: 12 }}>
                      {s.rollNo || '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#0D9488,#0F766E)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 10,
                        }}>
                          {s.name?.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</span>
                      </div>
                    </td>
                    {/* All-day quick mark */}
                    <td style={{ ...tdStyle }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <button style={{ ...quickBtnStyle, background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
                          onClick={() => markAllForStudent(s.id, 'present')}>All P</button>
                        <button style={{ ...quickBtnStyle, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
                          onClick={() => markAllForStudent(s.id, 'absent')}>All A</button>
                      </div>
                    </td>
                    {/* Per-period buttons */}
                    {periods.map(p => {
                      const cur = attendance[s.id]?.[p.periodNo] || 'present';
                      return (
                        <td key={p.periodNo} style={{ ...tdStyle }}>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            {STATUS_BTNS.map(btn => (
                              <button key={btn.val}
                                style={statusStyle(btn.val, cur)}
                                onClick={() => mark(s.id, p.periodNo, btn.val)}>
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Period Attendance Report Tab
// ---------------------------------------------------------------------------
function ReportTab({ classes }) {
  const curMonth = new Date().getMonth() + 1;
  const curYear  = new Date().getFullYear();

  const [filters, setFilters] = useState({
    classId: '', sectionId: '', subjectId: '',
    month: String(curMonth), year: String(curYear),
  });

  const cls = (classes || []).find(c => c.id === parseInt(filters.classId));
  const sections = cls?.sections || [];

  const { data: subjects } = useQuery({
    queryKey: ['subjects', filters.classId],
    enabled: !!filters.classId,
    queryFn: () =>
      api.get('/subjects', { params: { classId: filters.classId } })
         .then(r => r.data?.data || r.data || [])
         .catch(() => []),
  });

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['period-summary', filters],
    enabled: !!filters.classId,
    queryFn: () =>
      api.get('/attendance/period/summary', {
        params: {
          classId: filters.classId,
          subjectId: filters.subjectId || undefined,
          month: filters.month,
          year: filters.year,
        },
      }).then(r => r.data.data || [])
        .catch(() => []),
  });

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const years = [curYear - 1, curYear, curYear + 1];

  const belowThreshold = (summary || []).filter(s => s.percentage < 75);

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 14, padding: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 150px' }}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={filters.classId}
              onChange={e => setFilters({ ...filters, classId: e.target.value, sectionId: '', subjectId: '' })}>
              <option value="">Select Class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={filters.sectionId}
              onChange={e => setFilters({ ...filters, sectionId: e.target.value })}>
              <option value="">All</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 160px' }}>
            <label className="form-label">Subject</label>
            <select className="form-select" value={filters.subjectId}
              onChange={e => setFilters({ ...filters, subjectId: e.target.value })}>
              <option value="">All Subjects</option>
              {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 130px' }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={filters.month}
              onChange={e => setFilters({ ...filters, month: e.target.value })}>
              {months.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 90px' }}>
            <label className="form-label">Year</label>
            <select className="form-select" value={filters.year}
              onChange={e => setFilters({ ...filters, year: e.target.value })}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 1 }}>
            <button className="btn btn-outline btn-sm" onClick={() => refetch()}><RefreshCw size={13} /></button>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {belowThreshold.length > 0 && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
          padding: '10px 16px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <AlertTriangle size={16} color="#B91C1C" />
          <span style={{ fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>
            {belowThreshold.length} student{belowThreshold.length > 1 ? 's' : ''} below 75% attendance
          </span>
        </div>
      )}

      {!filters.classId ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>Select a Class to View Report</div>
        </div>
      ) : isLoading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      ) : !summary || summary.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          No period attendance data for this selection.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1E3A5F' }}>
                  <th style={{ ...thStyle, textAlign: 'left', color: '#CBD5E1' }}>#</th>
                  <th style={{ ...thStyle, textAlign: 'left', color: '#CBD5E1' }}>Roll</th>
                  <th style={{ ...thStyle, textAlign: 'left', color: '#CBD5E1' }}>Student Name</th>
                  <th style={{ ...thStyle, color: '#CBD5E1' }}>Subject</th>
                  <th style={{ ...thStyle, color: '#CBD5E1' }}>Total Periods</th>
                  <th style={{ ...thStyle, color: '#CBD5E1' }}>Present</th>
                  <th style={{ ...thStyle, color: '#CBD5E1' }}>Absent</th>
                  <th style={{ ...thStyle, color: '#CBD5E1' }}>Leave</th>
                  <th style={{ ...thStyle, color: '#CBD5E1' }}>Attendance %</th>
                  <th style={{ ...thStyle, color: '#CBD5E1' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(summary || []).map((row, idx) => {
                  const low = row.percentage < 75;
                  return (
                    <tr key={idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: low ? '#FFF7F7' : '',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = low ? '#FEF2F2' : '#FAFBFE'}
                      onMouseLeave={e => e.currentTarget.style.background = low ? '#FFF7F7' : ''}>
                      <td style={{ ...tdStyle, color: '#94A3B8', fontSize: 11 }}>{idx + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#0D9488', fontFamily: 'monospace', fontSize: 12 }}>
                        {row.rollNo || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {low && <AlertTriangle size={12} color="#B91C1C" />}
                          {row.studentName}
                        </div>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                          {row.subjectName || 'All'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{row.total}</td>
                      <td style={{ ...tdStyle }}>
                        <span style={{ color: '#15803D', fontWeight: 700 }}>{row.present}</span>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span style={{ color: '#B91C1C', fontWeight: 700 }}>{row.absent}</span>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span style={{ color: '#B45309', fontWeight: 700 }}>{row.leave}</span>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <div style={{ width: 60, height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(row.percentage, 100)}%`,
                              height: '100%',
                              background: pctColor(row.percentage),
                              borderRadius: 99,
                            }} />
                          </div>
                          <span style={{ fontWeight: 700, color: pctColor(row.percentage), fontSize: 13 }}>
                            {row.percentage}%
                          </span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span style={{
                          background: pctBg(row.percentage),
                          color: pctColor(row.percentage),
                          padding: '2px 10px', borderRadius: 12,
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {row.percentage >= 75 ? 'Good' : row.percentage >= 60 ? 'Low' : 'Critical'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div style={{ borderTop: '1px solid #E2E8F0', padding: '10px 16px', background: '#F8FAFC' }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#64748B' }}>
              <span>Total Students: <strong>{summary.length}</strong></span>
              <span style={{ color: '#15803D' }}>
                Good (&gt;=75%): <strong>{(summary || []).filter(s => s.percentage >= 75).length}</strong>
              </span>
              <span style={{ color: '#B45309' }}>
                Low (60-74%): <strong>{(summary || []).filter(s => s.percentage >= 60 && s.percentage < 75).length}</strong>
              </span>
              <span style={{ color: '#B91C1C' }}>
                Critical (&lt;60%): <strong>{(summary || []).filter(s => s.percentage < 60).length}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table cell styles (shared)
// ---------------------------------------------------------------------------
const thStyle = {
  padding: '9px 8px',
  textAlign: 'center',
  fontSize: 11,
  fontWeight: 700,
  borderBottom: '1px solid #162F4E',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '7px 8px',
  textAlign: 'center',
  fontSize: 12,
  verticalAlign: 'middle',
};

const quickBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 3,
  padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
  fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PeriodAttendancePage() {
  const [activeTab, setActiveTab] = useState('mark'); // 'mark' | 'report'

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const tabs = [
    { id: 'mark',   label: 'Mark Attendance', icon: <CheckCircle size={15} /> },
    { id: 'report', label: 'Period Report',    icon: <BarChart2 size={15} /> },
  ];

  return (
    <div className="page-content fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={22} color="#0D9488" />
            Period / Subject Attendance
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
            Track attendance per period and subject — separate from daily attendance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        borderBottom: '2px solid #E2E8F0', paddingBottom: 0,
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: activeTab === tab.id ? '#0D9488' : '#64748B',
              borderBottom: activeTab === tab.id ? '2.5px solid #0D9488' : '2.5px solid transparent',
              marginBottom: -2,
              borderRadius: 0,
              transition: 'all 0.15s',
            }}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'mark' && <MarkAttendanceTab classes={classes} />}
      {activeTab === 'report' && <ReportTab classes={classes} />}
    </div>
  );
}
