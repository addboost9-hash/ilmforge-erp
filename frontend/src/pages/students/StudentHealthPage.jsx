/** Student Health Records — medical info, blood group, allergies, incidents */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Heart, Search, Plus, AlertTriangle } from 'lucide-react';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const empty = { studentId: '', bloodGroup: '', allergies: '', medicalConditions: '', emergencyContact: '', emergencyPhone: '', notes: '' };

export default function StudentHealthPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: students = [] } = useQuery({
    queryKey: ['health-students', search],
    queryFn: () => api.get('/students', { params: { search, limit: 10 } }).then(r => r.data.data || []),
    enabled: search.length >= 2,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['health-records'],
    queryFn: () => api.get('/students/health').then(r => r.data.data || []).catch(() => []),
  });

  const save = useMutation({
    mutationFn: () => api.post('/students/health', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health-records'] }); setShow(false); setForm(empty); toast.success('Health record saved'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={20} color="#ef4444" /> Student Health Records
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Blood groups, allergies, medical conditions, and emergency contacts</p>
        </div>
        <button className="btn btn-teal btn-sm" onClick={() => setShow(true)}><Plus size={14} /> Add Record</button>
      </div>

      {show && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #ef4444' }}>
          <div className="card-header" style={{ background: '#fef2f2' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>New Health Record</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShow(false); setForm(empty); }}>Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Search Student</label>
              <input className="form-input" placeholder="Type name or roll no…" value={search} onChange={e => setSearch(e.target.value)} />
              {students.length > 0 && (
                <div style={{ border: '1px solid #dee2e6', borderRadius: 6, marginTop: 4, background: 'white', maxHeight: 160, overflowY: 'auto' }}>
                  {students.map(s => (
                    <div key={s.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}
                      onClick={() => { setForm({ ...form, studentId: s.id }); setSearch(s.name); }}
                    >
                      <strong>{s.name}</strong> — {s.class?.name} | Roll: {s.rollNo}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact Name</label>
                <input className="form-input" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Phone</label>
                <input className="form-input" value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Allergies</label>
                <input className="form-input" placeholder="e.g. Peanuts, Dust" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Medical Conditions</label>
                <input className="form-input" placeholder="e.g. Asthma, Diabetes" value={form.medicalConditions} onChange={e => setForm({ ...form, medicalConditions: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={() => save.mutate()} disabled={!form.studentId || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Heart size={40} /></div>
            <div className="empty-state-text">No health records yet</div>
            <div className="empty-state-sub">Add medical information for students to assist in emergencies</div>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }} className="card">
          <table className="table-modern">
            <thead>
              <tr>{['Student', 'Class', 'Blood Group', 'Allergies', 'Medical Conditions', 'Emergency Contact'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.student?.name || '—'}</td>
                  <td>{r.student?.class?.name || '—'}</td>
                  <td>{r.bloodGroup ? <span className="chip chip-red">{r.bloodGroup}</span> : '—'}</td>
                  <td>{r.allergies ? <span style={{ color: '#b91c1c', fontSize: 12 }}><AlertTriangle size={11} style={{ marginRight: 3 }} />{r.allergies}</span> : '—'}</td>
                  <td>{r.medicalConditions || '—'}</td>
                  <td>{r.emergencyContact ? `${r.emergencyContact} — ${r.emergencyPhone}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
