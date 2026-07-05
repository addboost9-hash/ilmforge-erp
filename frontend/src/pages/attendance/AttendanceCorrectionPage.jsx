/** Attendance Correction — review and fix mis-marked attendance records */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Edit2, CheckCircle, AlertTriangle, Search } from 'lucide-react';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];
const STATUS_COLORS = { present: 'chip-green', absent: 'chip-red', late: 'chip-yellow', excused: 'chip-blue' };

export default function AttendanceCorrectionPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['att-corrections', date, search],
    queryFn: () => api.get('/attendance/corrections', { params: { date, search, limit: 30 } }).then(r => r.data.data || []).catch(() => []),
  });

  const correct = useMutation({
    mutationFn: () => api.post('/attendance/corrections', { attendanceId: editing.id, status: newStatus, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['att-corrections'] });
      setEditing(null); setNewStatus(''); setReason('');
      toast.success('Attendance corrected');
    },
    onError: err => toast.error(err.response?.data?.message || 'Correction failed'),
  });

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit2 size={20} color="#f59e0b" /> Attendance Corrections
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Review and fix mis-marked attendance records with audit trail</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input type="date" className="form-input" style={{ flex: '0 0 160px' }} value={date} onChange={e => setDate(e.target.value)} />
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #f59e0b' }}>
          <div className="card-header" style={{ background: '#fffbeb' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Correct: {editing.student?.name}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Correct Status</label>
                <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">Select status</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Correction</label>
                <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Marked absent by mistake" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => correct.mutate()} disabled={!newStatus || correct.isPending}>
              {correct.isPending ? 'Saving…' : 'Apply Correction'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : data.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle size={40} /></div>
            <div className="empty-state-text">No records for this date</div>
            <div className="empty-state-sub">Select a date to review attendance records</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>{['Student', 'Roll No', 'Class', 'Marked Status', 'Corrections', 'Action'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.student?.name || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.student?.rollNo || '—'}</td>
                  <td>{r.student?.class?.name || '—'}</td>
                  <td><span className={`chip ${STATUS_COLORS[r.status] || 'chip-gray'}`}>{r.status}</span></td>
                  <td>{r.correctionCount || 0} times</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditing(r); setNewStatus(r.status); }}>
                      <Edit2 size={12} /> Correct
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
