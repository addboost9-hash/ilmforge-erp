/**
 * IlmForge — Student Annual Attendance Calendar
 * Full-year calendar with P/A/H/L per day — printable report like BISE format
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Search, Printer, ChevronRight } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_SYMBOLS = { present: 'P', absent: 'A', leave: 'L', holiday: 'H', late: 'P*' };
const STATUS_COLORS  = { present: '#15803d', absent: '#dc2626', leave: '#d97706', holiday: '#6366f1', late: '#0073b7' };

function daysInMonth(month, year) { return new Date(year, month, 0).getDate(); }

export default function StudentAttendanceCalendarPage() {
  const [search,    setSearch]    = useState('');
  const [studentId, setStudentId] = useState(null);
  const [student,   setStudent]   = useState(null);
  const [year,      setYear]      = useState(new Date().getFullYear());

  const { data: students = [] } = useQuery({
    queryKey: ['att-cal-search', search],
    queryFn:  () => api.get('/students', { params: { search, limit: 8 } }).then(r => r.data.data || []).catch(() => []),
    enabled:  search.length >= 2,
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['att-history', studentId, year],
    queryFn:  () => api.get(`/attendance/student/${studentId}/history`, { params: { year } }).then(r => r.data.data || []).catch(() => []),
    enabled:  !!studentId,
  });

  // Build a lookup: "YYYY-MM-DD" → status
  const dayMap = {};
  history.forEach(r => {
    if (r.date) {
      const key = r.date.split('T')[0];
      dayMap[key] = r.status?.toLowerCase() || 'present';
    }
  });

  const totalPresent = Object.values(dayMap).filter(s => s === 'present' || s === 'late').length;
  const totalAbsent  = Object.values(dayMap).filter(s => s === 'absent').length;
  const totalLeave   = Object.values(dayMap).filter(s => s === 'leave').length;

  const handleSelect = (s) => {
    setStudentId(s.id);
    setStudent(s);
    setSearch(s.name);
    // clear suggestions
    setTimeout(() => setSearch(''), 100);
  };

  const handlePrint = () => window.print();

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title">Student Attendance Calendar</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Annual attendance history — day-wise P/A/H report</p>
        </div>
        {student && (
          <button className="btn btn-outline btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Print Calendar
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search student by name or roll no…"
              value={search} onChange={e => { setSearch(e.target.value); setStudentId(null); setStudent(null); }} />
            {students.length > 0 && !studentId && search.length >= 2 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                {students.map(s => (
                  <div key={s.id} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => handleSelect(s)}>
                    <ChevronRight size={12} color="#94a3b8" />
                    <strong>{s.name}</strong>
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>{s.class?.name} | Roll: {s.rollNo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select className="form-select" style={{ flex: '0 0 120px' }} value={year} onChange={e => setYear(+e.target.value)}>
            {[new Date().getFullYear(), new Date().getFullYear()-1, new Date().getFullYear()-2].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!studentId ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-text">Search a student to view attendance</div>
            <div className="empty-state-sub">Type student name above to load annual attendance calendar</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div id="attendance-calendar-print">
          {/* Print header */}
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>
                  Student Attendance History | {student?.name} | {year}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>Class/Sec: <strong>{student?.class?.name}-{student?.section?.name}</strong></span>
                  <span>Roll/Gr.No: <strong>{student?.rollNo}</strong></span>
                  <span>Father: <strong>{student?.fatherName || '—'}</strong></span>
                </div>
              </div>
              {/* Summary stats */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Present', v: totalPresent, color: '#15803d', bg: '#dcfce7' },
                  { label: 'Absent',  v: totalAbsent,  color: '#dc2626', bg: '#fee2e2' },
                  { label: 'Leave',   v: totalLeave,   color: '#d97706', bg: '#fef9c3' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 70 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Annual calendar grid */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#1e3a5f', color: 'white' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, minWidth: 90 }}>Month</th>
                  {Array.from({ length: 31 }, (_, i) => (
                    <th key={i} style={{ padding: '6px 4px', textAlign: 'center', width: 24, fontWeight: 700 }}>{i + 1}</th>
                  ))}
                  <th style={{ padding: '6px 8px', textAlign: 'center', minWidth: 60 }}>Present</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', minWidth: 60 }}>Absent</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((month, mi) => {
                  const days = daysInMonth(mi + 1, year);
                  let mPresent = 0, mAbsent = 0;
                  return (
                    <tr key={mi} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap' }}>{month}</td>
                      {Array.from({ length: 31 }, (_, di) => {
                        const day = di + 1;
                        if (day > days) {
                          return <td key={di} style={{ background: '#f8f9fa' }} />;
                        }
                        const dateStr = `${year}-${String(mi + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const dow = new Date(dateStr).getDay(); // 0=Sun, 5=Fri, 6=Sat
                        const isWeekend = dow === 0 || dow === 5 || dow === 6;
                        const status = dayMap[dateStr];
                        if (status === 'present' || status === 'late') mPresent++;
                        if (status === 'absent') mAbsent++;
                        const sym    = status ? STATUS_SYMBOLS[status] || status.charAt(0).toUpperCase() : (isWeekend ? 'H' : '—');
                        const color  = status ? (STATUS_COLORS[status] || '#374151') : (isWeekend ? '#6366f1' : '#cbd5e1');
                        return (
                          <td key={di} style={{ padding: '4px 2px', textAlign: 'center', color, fontWeight: status ? 700 : 400, fontSize: 10 }}>
                            {sym}
                          </td>
                        );
                      })}
                      {/* Running totals — set after map */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#15803d' }}>
                        {mPresent || 0}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                        {mAbsent || 0}
                      </td>
                    </tr>
                  );
                })}
                {/* Year totals row */}
                <tr style={{ background: '#f0f4ff', fontWeight: 800 }}>
                  <td style={{ padding: '8px 10px', color: '#1e3a5f' }}>TOTAL</td>
                  {Array.from({ length: 31 }, (_, i) => <td key={i} />)}
                  <td style={{ padding: '8px', textAlign: 'center', color: '#15803d' }}>{totalPresent}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#dc2626' }}>{totalAbsent}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '12px 0', flexWrap: 'wrap', fontSize: 12 }}>
            {[['P', '#15803d', '#dcfce7', 'Present'], ['A', '#dc2626', '#fee2e2', 'Absent'], ['L', '#d97706', '#fef9c3', 'Leave'], ['H', '#6366f1', '#ede9fe', 'Holiday/Weekend']].map(([sym, color, bg, label]) => (
              <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: 4, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{sym}</span>
                <span style={{ color: '#64748b' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 12 }}>
            {['CLASS TEACHER', 'INCHARGE', 'PRINCIPAL'].map(title => (
              <div key={title} style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #374151', width: 120, paddingTop: 4, fontSize: 12, fontWeight: 600, color: '#374151' }}>{title}:</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .page-content > *:not(#attendance-calendar-print) { display: none !important; }
          #attendance-calendar-print { display: block !important; }
          .sidebar, .top-header, .app-header, .btn, .form-input { display: none !important; }
          .main-wrapper { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
