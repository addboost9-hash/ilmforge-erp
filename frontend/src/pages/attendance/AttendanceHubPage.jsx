import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { X, ChevronDown, ChevronUp, Download } from 'lucide-react';

/* ─── design tokens ─────────────────────────────────────────── */
const TEAL = '#0D9488';
const TEAL_LIGHT = '#F0FDFA';

const btnTeal = {
  background: TEAL,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
const btnOutline = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  padding: '7px 14px',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const STATUS_CYCLE = ['Not Marked', 'Present', 'Absent', 'Leave'];
const STATUS_COLORS = {
  Present:    { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  Absent:     { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  Leave:      { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  'Not Marked': { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
};

const today = () => new Date().toISOString().split('T')[0];

/* ─── StatusBadge ───────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS['Not Marked'];
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-block',
      }}
    >
      {status}
    </span>
  );
}

/* ─── Mark Attendance Modal ──────────────────────────────────── */
function MarkAttendanceModal({ row, date, onClose, onSaved }) {
  const [statuses, setStatuses] = useState({});

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-attend', row.classId, row.sectionId, date],
    queryFn: () =>
      api
        .get('/students', {
          params: {
            classId: row.classId,
            sectionId: row.sectionId || undefined,
            status: 'active',
            limit: 300,
          },
        })
        .then((r) => r.data.data || []),
    staleTime: 0,
  });

  // Pre-fill existing attendance if available
  const { data: existing = [] } = useQuery({
    queryKey: ['attendance-day', row.classId, row.sectionId, date],
    queryFn: () =>
      api.get('/attendance', { params: { classId: row.classId, sectionId: row.sectionId, date } })
        .then((r) => r.data.data || []),
    staleTime: 0,
  });

  useEffect(() => {
    if (existing.length) {
      const m = {};
      existing.forEach((s) => {
        if (s.attendance?.status) {
          const st = s.attendance.status;
          m[s.id] = st.charAt(0).toUpperCase() + st.slice(1);
        } else {
          m[s.id] = 'Not Marked';
        }
      });
      setStatuses(m);
    }
  }, [existing]);

  const cycleStatus = (id) => {
    setStatuses((prev) => {
      const cur = prev[id] || 'Not Marked';
      const idx = STATUS_CYCLE.indexOf(cur);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...prev, [id]: next };
    });
  };

  const present = Object.values(statuses).filter((v) => v === 'Present').length;
  const absent  = Object.values(statuses).filter((v) => v === 'Absent').length;
  const leave   = Object.values(statuses).filter((v) => v === 'Leave').length;
  const total   = students.length;

  const save = useMutation({
    mutationFn: () =>
      api.post('/attendance/save', {
        classId: row.classId,
        sectionId: row.sectionId || null,
        date,
        records: students.map((s) => ({
          studentId: s.id,
          status: (statuses[s.id] || 'present').toLowerCase().replace('not marked', 'absent'),
        })),
      }),
    onSuccess: () => {
      toast.success('Attendance saved!');
      onSaved && onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          width: '100%',
          maxWidth: 800,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: TEAL,
            color: '#fff',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {row.className}{row.sectionName ? ` - ${row.sectionName}` : ''}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 20px',
            borderBottom: '1px solid #E5E7EB',
            flexWrap: 'wrap',
            fontSize: 13,
          }}
        >
          {[
            { label: 'Total Students', val: total, color: '#1D4ED8', bg: '#EFF6FF' },
            { label: 'Present Students', val: present, color: '#15803D', bg: '#DCFCE7' },
            { label: 'Absent Students', val: absent, color: '#B91C1C', bg: '#FEE2E2' },
            { label: 'On Leave', val: leave, color: '#B45309', bg: '#FEF3C7' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: item.bg,
                borderRadius: 7,
                padding: '7px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 18, color: item.color }}>{item.val}</span>
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 12, color: '#6B7280' }}>
            <div>Platform: -</div>
            <div>Created By/On: -</div>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700 }}>Reg No</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700 }}>Name</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700 }}>F Name</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const status = statuses[s.id] || 'Not Marked';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>
                        {s.rollNo || '—'}
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '9px 14px', color: '#6B7280' }}>{s.fatherName || '—'}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <button
                          onClick={() => cycleStatus(s.id)}
                          style={{
                            background: STATUS_COLORS[status]?.bg || '#F3F4F6',
                            color: STATUS_COLORS[status]?.color || '#6B7280',
                            border: `1px solid ${STATUS_COLORS[status]?.border || '#E5E7EB'}`,
                            borderRadius: 12,
                            padding: '3px 12px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {status}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button style={btnOutline} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...btnTeal, opacity: save.isPending ? 0.7 : 1 }}
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Student Attendance Tab ──────────────────────────────────── */
function StudentAttendanceTab() {
  const [date, setDate] = useState(today());
  const [markModal, setMarkModal] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const qc = useQueryClient();

  const { data: classSections = [], isLoading, refetch } = useQuery({
    queryKey: ['class-sections-attend'],
    queryFn: () => api.get('/students/class-sections').then((r) => r.data.data || []),
    staleTime: 120_000,
  });

  // Track which class-sections have attendance marked on selected date
  const { data: markedSections = [] } = useQuery({
    queryKey: ['attendance-marked-check', date],
    queryFn: async () => {
      // For each class-section, check if attendance exists
      // We use a lightweight approach: get all attendance for the date grouped
      const results = await Promise.all(
        classSections.map(async (row) => {
          try {
            const r = await api.get('/attendance', {
              params: { classId: row.classId, sectionId: row.sectionId, date },
            });
            const students = r.data.data || [];
            const hasRecord = students.some((s) => s.attendance !== null);
            return { key: `${row.classId}-${row.sectionId}`, marked: hasRecord };
          } catch {
            return { key: `${row.classId}-${row.sectionId}`, marked: false };
          }
        })
      );
      return results;
    },
    enabled: classSections.length > 0,
    staleTime: 0,
  });

  const markedSet = new Set(markedSections.filter((m) => m.marked).map((m) => m.key));

  // Expanded inline students
  const { data: expandedStudents = [], isLoading: loadingExpanded } = useQuery({
    queryKey: ['attend-expanded', expandedRow, date],
    enabled: !!expandedRow,
    queryFn: () => {
      const [classId, sectionId] = (expandedRow || '').split('-');
      return api
        .get('/attendance', { params: { classId, sectionId: sectionId !== 'null' ? sectionId : undefined, date } })
        .then((r) => r.data.data || []);
    },
    staleTime: 0,
  });

  return (
    <div>
      {/* Sub-tab label + date picker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 20px',
          borderBottom: '1px solid #E5E7EB',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: TEAL,
            borderBottom: `2px solid ${TEAL}`,
            paddingBottom: 2,
          }}
        >
          Class Wise Attendance
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => { setDate(e.target.value); setExpandedRow(null); }}
            style={{
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
            }}
          />
          <button style={btnTeal} onClick={() => refetch()}>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Loading…</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: TEAL }}>
              <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>S.No.</th>
              <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Class</th>
              <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Section</th>
              <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Actions</th>
              <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {classSections.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  No class data found
                </td>
              </tr>
            )}
            {classSections.map((row, idx) => {
              const rowKey = `${row.classId}-${row.sectionId}`;
              const isMarked = markedSet.has(rowKey);
              const isExpanded = expandedRow === rowKey;
              return (
                <>
                  <tr
                    key={rowKey}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      background: isExpanded ? TEAL_LIGHT : idx % 2 === 0 ? '#fff' : '#FAFAFA',
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#9CA3AF' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.className}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{row.sectionName || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        style={{
                          ...btnTeal,
                          background: isMarked ? '#059669' : TEAL,
                          fontSize: 12,
                          padding: '5px 14px',
                        }}
                        onClick={() => setMarkModal(row)}
                      >
                        {isMarked ? 'Attendance Marked' : 'Attendance Not Marked'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        style={{
                          background: 'none',
                          border: '1px solid #D1D5DB',
                          borderRadius: 6,
                          padding: '5px 12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 13,
                          color: '#374151',
                        }}
                        onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${rowKey}-detail`}>
                      <td colSpan={5} style={{ padding: 0, background: TEAL_LIGHT }}>
                        {loadingExpanded ? (
                          <div style={{ textAlign: 'center', padding: 16, color: '#9CA3AF' }}>Loading…</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#CCFBF1' }}>
                                <th style={{ padding: '7px 14px', color: '#0F766E', fontWeight: 700, textAlign: 'left' }}>#</th>
                                <th style={{ padding: '7px 14px', color: '#0F766E', fontWeight: 700, textAlign: 'left' }}>Reg No</th>
                                <th style={{ padding: '7px 14px', color: '#0F766E', fontWeight: 700, textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '7px 14px', color: '#0F766E', fontWeight: 700, textAlign: 'left' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedStudents.map((s, i) => {
                                const st = s.attendance?.status;
                                const label = st
                                  ? st.charAt(0).toUpperCase() + st.slice(1)
                                  : 'Not Marked';
                                return (
                                  <tr key={s.id} style={{ borderBottom: '1px solid #D1FAE5' }}>
                                    <td style={{ padding: '7px 14px', color: '#9CA3AF' }}>{i + 1}</td>
                                    <td style={{ padding: '7px 14px', fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>
                                      {s.rollNo || '—'}
                                    </td>
                                    <td style={{ padding: '7px 14px', fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ padding: '7px 14px' }}>
                                      <StatusBadge status={label} />
                                    </td>
                                  </tr>
                                );
                              })}
                              {expandedStudents.length === 0 && (
                                <tr>
                                  <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>
                                    No records
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}

      {markModal && (
        <MarkAttendanceModal
          row={markModal}
          date={date}
          onClose={() => setMarkModal(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['attendance-marked-check'] });
            qc.invalidateQueries({ queryKey: ['attend-expanded'] });
          }}
        />
      )}
    </div>
  );
}

/* ─── Staff Attendance Tab ───────────────────────────────────── */
function StaffAttendanceTab() {
  const [date, setDate] = useState(today());
  const [staffStatus, setStaffStatus] = useState({});
  const [timeIn, setTimeIn] = useState({});
  const [timeOut, setTimeOut] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState({});

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff').then((r) => r.data.data || []),
    staleTime: 300_000,
  });

  const toggleAll = (v) => {
    setSelectAll(v);
    const m = {};
    staff.forEach((s) => (m[s.id] = v));
    setSelectedStaff(m);
  };

  const save = useMutation({
    mutationFn: () =>
      api.post('/attendance/staff', {
        date,
        records: staff.map((s) => ({
          staffId: s.id,
          status: staffStatus[s.id] || 'present',
          timeIn: timeIn[s.id] || null,
          timeOut: timeOut[s.id] || null,
        })),
      }),
    onSuccess: () => toast.success('Staff attendance saved!'),
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });

  return (
    <div>
      {/* Date picker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid #E5E7EB',
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Date:</label>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
        />
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading staff…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: TEAL }}>
                <th style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => toggleAll(e.target.checked)}
                    style={{ accentColor: '#fff' }}
                  />
                </th>
                <th style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Staff ID</th>
                <th style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Father Name</th>
                <th style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Time In</th>
                <th style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Time Out</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, idx) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedStaff[s.id]}
                      onChange={(e) => setSelectedStaff((p) => ({ ...p, [s.id]: e.target.checked }))}
                      style={{ accentColor: TEAL }}
                    />
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>
                    {s.empCode || `STF-${s.id}`}
                  </td>
                  <td style={{ padding: '9px 12px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '9px 12px', color: '#6B7280' }}>{s.fatherName || '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <select
                      value={staffStatus[s.id] || 'present'}
                      onChange={(e) => setStaffStatus((p) => ({ ...p, [s.id]: e.target.value }))}
                      style={{
                        border: '1px solid #D1D5DB',
                        borderRadius: 6,
                        padding: '5px 8px',
                        fontSize: 13,
                        background:
                          (staffStatus[s.id] || 'present') === 'present'
                            ? '#DCFCE7'
                            : '#FEE2E2',
                        color:
                          (staffStatus[s.id] || 'present') === 'present'
                            ? '#15803D'
                            : '#B91C1C',
                        fontWeight: 600,
                      }}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                      <option value="late">Late</option>
                    </select>
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <input
                      type="time"
                      value={timeIn[s.id] || ''}
                      onChange={(e) => setTimeIn((p) => ({ ...p, [s.id]: e.target.value }))}
                      style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '5px 8px', fontSize: 13 }}
                    />
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <input
                      type="time"
                      value={timeOut[s.id] || ''}
                      onChange={(e) => setTimeOut((p) => ({ ...p, [s.id]: e.target.value }))}
                      style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '5px 8px', fontSize: 13 }}
                    />
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                    No staff found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {staff.length > 0 && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            style={btnOutline}
            onClick={() => {
              setStaffStatus({});
              setTimeIn({});
              setTimeOut({});
            }}
          >
            Cancel
          </button>
          <button
            style={{ ...btnTeal, opacity: save.isPending ? 0.7 : 1 }}
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Reports Tab ─────────────────────────────────────────────── */
function ReportsTab() {
  const [reportType, setReportType] = useState('student');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(today());
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data.data || []),
  });

  const selectedClass = classes.find((c) => c.id === parseInt(classId));
  const sections = selectedClass?.sections || [];

  const loadReport = async () => {
    setIsLoadingReport(true);
    try {
      if (reportType === 'student') {
        const r = await api.get('/attendance', {
          params: { classId: classId || undefined, sectionId: sectionId || undefined, date },
        });
        setReportData(r.data.data || []);
      } else {
        const r = await api.get('/staff');
        setReportData(r.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load report');
      setReportData([]);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const subTabStyle = (t) => ({
    padding: '8px 18px',
    border: 'none',
    borderBottom: reportType === t ? `3px solid ${TEAL}` : '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: reportType === t ? 700 : 500,
    color: reportType === t ? TEAL : '#6B7280',
    fontSize: 13,
  });

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', padding: '0 12px' }}>
        <button style={subTabStyle('student')} onClick={() => { setReportType('student'); setReportData(null); }}>
          Student
        </button>
        <button style={subTabStyle('staff')} onClick={() => { setReportType('staff'); setReportData(null); }}>
          Staff
        </button>
      </div>

      {/* Filters */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {reportType === 'student' && (
          <>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Grade</label>
              <select
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '7px 10px', fontSize: 13, minWidth: 140 }}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '7px 10px', fontSize: 13, minWidth: 120 }}
              >
                <option value="">All</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Select Date</label>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}
          />
        </div>
        <button style={{ ...btnTeal, alignSelf: 'flex-end' }} onClick={loadReport} disabled={isLoadingReport}>
          {isLoadingReport ? 'Loading…' : 'Load Report'}
        </button>
        <button
          style={{ ...btnOutline, alignSelf: 'flex-end' }}
          onClick={() => {
            const p = new URLSearchParams({ classId: classId || '', sectionId: sectionId || '', date });
            window.open(`/api/v1/reports/attendance/excel?${p}`, '_blank');
          }}
        >
          <Download size={14} />
          Download
        </button>
      </div>

      {/* Report table */}
      {reportData !== null && (
        <div style={{ overflow: 'auto' }}>
          {isLoadingReport ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading…</div>
          ) : reportType === 'student' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: TEAL }}>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Reg No</th>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>F Name</th>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((s, idx) => {
                  const st = s.attendance?.status;
                  const label = st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Not Marked';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>{s.rollNo || '—'}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '9px 14px', color: '#6B7280' }}>{s.fatherName || '—'}</td>
                      <td style={{ padding: '9px 14px' }}><StatusBadge status={label} /></td>
                    </tr>
                  );
                })}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>No data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: TEAL }}>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Staff ID</th>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Designation</th>
                  <th style={{ padding: '10px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>{s.empCode || `STF-${s.id}`}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '9px 14px', color: '#6B7280' }}>{s.designation || '—'}</td>
                    <td style={{ padding: '9px 14px' }}><StatusBadge status="Present" /></td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>No data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Hub Page ───────────────────────────────────────────── */
export default function AttendanceHubPage() {
  const [mainTab, setMainTab] = useState('student');

  const mainTabStyle = (tab) => ({
    padding: '12px 24px',
    border: 'none',
    borderBottom: mainTab === tab ? `3px solid ${TEAL}` : '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: mainTab === tab ? 700 : 500,
    color: mainTab === tab ? TEAL : '#6B7280',
    fontSize: 14,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: 20, background: '#F9FAFB', minHeight: '100vh' }}>
      {/* Page header */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '14px 20px',
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Attendance</h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>
          Manage student and staff attendance
        </p>
      </div>

      {/* Main tab panel */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        {/* Main tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
          <button style={mainTabStyle('student')} onClick={() => setMainTab('student')}>
            Student Attendance
          </button>
          <button style={mainTabStyle('staff')} onClick={() => setMainTab('staff')}>
            Staff Attendance
          </button>
          <button style={mainTabStyle('reports')} onClick={() => setMainTab('reports')}>
            Reports
          </button>
        </div>

        {/* Tab content */}
        {mainTab === 'student'  && <StudentAttendanceTab />}
        {mainTab === 'staff'    && <StaffAttendanceTab />}
        {mainTab === 'reports'  && <ReportsTab />}
      </div>
    </div>
  );
}
