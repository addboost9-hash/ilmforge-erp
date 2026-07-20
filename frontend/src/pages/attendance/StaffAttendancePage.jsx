import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { UserCheck, UserX, Save, X, Clock } from 'lucide-react';

const STATUS_OPTIONS = [
  { val: 'present', label: 'Present', short: 'P', color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' },
  { val: 'absent',  label: 'Absent',  short: 'A', color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' },
  { val: 'leave',   label: 'Leave',   short: 'L', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  { val: 'late',    label: 'Late',    short: 'Lt', color: '#1D4ED8', bg: '#DBEAFE', border: '#BFDBFE' },
];

export default function StaffAttendancePage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [attendance, setAttendance] = useState({});
  const [timeIn, setTimeIn] = useState({});
  const [timeOut, setTimeOut] = useState({});
  const [showModal, setShowModal] = useState(false);

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  });

  // Load today's already-saved attendance for selected date
  const { data: savedData } = useQuery({
    queryKey: ['staff-attendance-date', date],
    queryFn: () =>
      api.get('/attendance/staff', { params: { date } })
        .then(r => r.data.data || [])
        .catch(() => []),
  });

  const staff = staffData?.data || [];

  // Populate form from saved records when date changes
  useEffect(() => {
    if (savedData && savedData.length > 0) {
      const attMap = {}, inMap = {}, outMap = {};
      savedData.forEach(r => {
        attMap[r.staffId] = r.status;
        inMap[r.staffId]  = r.timeIn  || '';
        outMap[r.staffId] = r.timeOut || '';
      });
      setAttendance(attMap);
      setTimeIn(inMap);
      setTimeOut(outMap);
    } else {
      setAttendance({});
      setTimeIn({});
      setTimeOut({});
    }
  }, [savedData, date]);

  const save = useMutation({
    mutationFn: () =>
      api.post('/attendance/staff', {
        date,
        records: staff
          .filter(s => attendance[s.id])
          .map(s => ({
            staffId: s.id,
            status:  attendance[s.id],
            timeIn:  timeIn[s.id]  || null,
            timeOut: timeOut[s.id] || null,
          })),
      }),
    onSuccess: () => {
      toast.success('Staff attendance saved!');
      qc.invalidateQueries({ queryKey: ['staff-attendance-date', date] });
      setShowModal(false);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save attendance'),
  });

  function markAll(status) {
    const m = {};
    staff.forEach(s => { m[s.id] = status; });
    setAttendance(m);
  }

  const present = Object.values(attendance).filter(v => v === 'present').length;
  const absent  = Object.values(attendance).filter(v => v === 'absent').length;
  const late    = Object.values(attendance).filter(v => v === 'late').length;
  const leave   = Object.values(attendance).filter(v => v === 'leave').length;
  const marked  = Object.keys(attendance).length;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Staff Attendance</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Mark daily attendance for all staff members</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={today}
            style={{ width: 150 }}
          />
          <button className="btn btn-teal" onClick={() => setShowModal(true)} disabled={isLoading || staff.length === 0}>
            <UserCheck size={15} /> Mark Attendance
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-3" style={{ marginBottom: 16 }}>
        {[
          { l: 'Total Staff', v: staff.length, c: '#1E3A5F', bg: '#EFF6FF' },
          { l: 'Present',     v: present,       c: '#15803D', bg: '#DCFCE7' },
          { l: 'Absent',      v: absent,         c: '#DC2626', bg: '#FEE2E2' },
        ].map(item => (
          <div key={item.l} className="card" style={{ background: item.bg, border: 'none', padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: item.c }}>{item.v}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>{item.l}</div>
          </div>
        ))}
      </div>

      {/* Today's attendance table (read-only view) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Father Name</th>
                  <th>Designation</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Time In</th>
                  <th style={{ textAlign: 'center' }}>Time Out</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s, idx) => {
                  const st = attendance[s.id];
                  const so = STATUS_OPTIONS.find(o => o.val === st);
                  return (
                    <tr key={s.id}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488' }}>
                          {s.empCode || ('S-' + s.id)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: so ? `linear-gradient(135deg,${so.color},${so.border})` : 'linear-gradient(135deg,#94a3b8,#64748B)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 11,
                          }}>
                            {s.name?.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>{s.fatherName || '—'}</td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>{s.designation || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {so ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 700,
                            background: so.bg, color: so.color, border: `1px solid ${so.border}`,
                          }}>
                            {so.label}
                          </span>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12.5, color: '#64748B' }}>
                        {timeIn[s.id] || '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12.5, color: '#64748B' }}>
                        {timeOut[s.id] || '—'}
                      </td>
                    </tr>
                  );
                })}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No staff found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Attendance Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 1000, padding: '24px 16px', overflowY: 'auto',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid #E2E8F0',
              background: 'linear-gradient(135deg,#0D9488,#0F766E)',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  Mark Staff Attendance
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  {date} — {staff.length} staff members
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <X size={20} />
              </button>
            </div>

            {/* Bulk actions bar */}
            <div style={{
              padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
              display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Mark All:</span>
              {STATUS_OPTIONS.map(o => (
                <button key={o.val} onClick={() => markAll(o.val)} style={{
                  padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: o.bg, color: o.color, border: `1px solid ${o.border}`,
                }}>
                  {o.label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748B' }}>
                {marked}/{staff.length} marked
              </span>
            </div>

            {/* Staff list */}
            <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Staff ID</th>
                    <th>Name</th>
                    <th>Father Name</th>
                    <th>Designation</th>
                    <th style={{ minWidth: 240 }}>Status</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488', fontSize: 12 }}>
                          {s.empCode || ('S-' + s.id)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: 'linear-gradient(135deg,#0D9488,#0F766E)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 10, flexShrink: 0,
                          }}>
                            {s.name?.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>{s.fatherName || '—'}</td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>{s.designation || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {STATUS_OPTIONS.map(o => (
                            <button
                              key={o.val}
                              onClick={() => setAttendance({ ...attendance, [s.id]: o.val })}
                              style={{
                                padding: '4px 9px', borderRadius: 5, cursor: 'pointer', fontSize: 12,
                                fontWeight: attendance[s.id] === o.val ? 700 : 400,
                                background: attendance[s.id] === o.val ? o.bg : '#F8FAFC',
                                color: attendance[s.id] === o.val ? o.color : '#94a3b8',
                                border: `1px solid ${attendance[s.id] === o.val ? o.border : '#E8EDF3'}`,
                              }}
                            >
                              {o.short}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <input
                          type="time"
                          className="form-input"
                          style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
                          value={timeIn[s.id] || ''}
                          onChange={e => setTimeIn({ ...timeIn, [s.id]: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="form-input"
                          style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
                          value={timeOut[s.id] || ''}
                          onChange={e => setTimeOut({ ...timeOut, [s.id]: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid #E2E8F0',
              display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#F8FAFC',
            }}>
              <div style={{ marginRight: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                {[
                  { l: 'Present', v: present, c: '#15803D' },
                  { l: 'Absent',  v: absent,  c: '#DC2626' },
                  { l: 'Late',    v: late,    c: '#1D4ED8' },
                  { l: 'Leave',   v: leave,   c: '#B45309' },
                ].map(item => (
                  <span key={item.l} style={{ fontSize: 12, color: item.c, fontWeight: 700 }}>
                    {item.l}: {item.v}
                  </span>
                ))}
              </div>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-teal"
                onClick={() => save.mutate()}
                disabled={save.isPending || marked === 0}
              >
                <Save size={14} /> {save.isPending ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
