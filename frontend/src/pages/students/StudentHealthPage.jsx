/** Student Health Records — blood group, allergies, dietary needs, condition, emergency contact */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Heart, Search, Plus, Edit2, X, AlertTriangle, CheckCircle } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyForm = {
  bloodGroup: '',
  foodDietaryReq: '',
  allergies: '',
  childCondition: '',
  emergencyPhone: '',
};

/* ── health badge helper ─────────────────────────────────────── */
function HealthBadge({ student }) {
  const hasCondition = student.childCondition && student.childCondition.trim() !== '';
  const hasAllergies = student.allergies && student.allergies.trim() !== '';
  const flagged = hasCondition || hasAllergies;
  return flagged ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
      borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>
      <AlertTriangle size={11} /> Has Condition
    </span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
      borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>
      <CheckCircle size={11} /> Healthy
    </span>
  );
}

/* ── Edit / Add modal ────────────────────────────────────────── */
function HealthModal({ student, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    bloodGroup:     student.bloodGroup     || '',
    foodDietaryReq: student.foodDietaryReq || '',
    allergies:      student.allergies      || '',
    childCondition: student.childCondition || '',
    emergencyPhone: student.emergencyPhone || '',
  });

  const save = useMutation({
    mutationFn: () => api.put(`/students/${student.id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-students-list'] });
      toast.success('Health record saved');
      onClose();
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Health Record — {student.name}</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {student.class?.name}{student.section ? ` · ${student.section.name}` : ''} · Roll {student.rollNo || '—'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Blood Group */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Blood Group</label>
            <select
              className="form-select"
              value={form.bloodGroup}
              onChange={e => set('bloodGroup', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">— Select —</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Food & Dietary Requirements */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Food & Dietary Requirements</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Vegetarian, No nuts, Halal only…"
              value={form.foodDietaryReq}
              onChange={e => set('foodDietaryReq', e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Allergies / Major Illness */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Allergies / Major Illness</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Peanut allergy, Asthma, Epilepsy…"
              value={form.allergies}
              onChange={e => set('allergies', e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Condition of Child */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Condition of Child</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Any ongoing medical condition or special needs…"
              value={form.childCondition}
              onChange={e => set('childCondition', e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Emergency Contact Phone</label>
            <input
              className="form-input"
              type="tel"
              placeholder="e.g. 0300-1234567"
              value={form.emergencyPhone}
              onChange={e => set('emergencyPhone', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-teal btn-sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────── */
export default function StudentHealthPage() {
  const [search, setSearch]           = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterBG, setFilterBG]       = useState('');
  const [editing, setEditing]         = useState(null); // student object

  /* classes for filter dropdown */
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });

  /* students list with health fields */
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['health-students-list', filterClass],
    queryFn: () =>
      api.get('/students', {
        params: {
          classId: filterClass || undefined,
          status: 'active',
          limit: 500,
        },
      }).then(r => r.data.data || []),
  });

  /* local filter: search + blood group */
  const visible = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.rollNo?.toString().includes(q);
    const matchBG = !filterBG || s.bloodGroup === filterBG;
    return matchSearch && matchBG;
  });

  return (
    <div className="page-content fade-in">
      {/* header band */}
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={20} color="#ef4444" /> Student Health Records
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Blood groups, dietary needs, allergies, conditions and emergency contacts
          </p>
        </div>
      </div>

      {/* filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* search */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Search Student</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 30 }}
                placeholder="Name or roll no…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* class filter */}
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Filter by Class</label>
            <select className="form-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* blood group filter */}
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Filter by Blood Group</label>
            <select className="form-select" value={filterBG} onChange={e => setFilterBG(e.target.value)}>
              <option value="">All Blood Groups</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* table */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Heart size={40} /></div>
            <div className="empty-state-text">No students found</div>
            <div className="empty-state-sub">Adjust filters or add students first</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Blood Group</th>
                <th>Dietary Requirements</th>
                <th>Allergies / Illness</th>
                <th>Condition</th>
                <th>Emergency Phone</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.class?.name || '—'}</td>
                  <td>
                    {s.bloodGroup
                      ? <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{s.bloodGroup}</span>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13, color: s.foodDietaryReq ? '#1e293b' : '#94a3b8', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.foodDietaryReq || '—'}
                  </td>
                  <td style={{ fontSize: 13, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.allergies
                      ? <span style={{ color: '#b91c1c' }}><AlertTriangle size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />{s.allergies}</span>
                      : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 13, color: s.childCondition ? '#92400e' : '#94a3b8', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.childCondition || '—'}
                  </td>
                  <td style={{ fontSize: 13, color: s.emergencyPhone ? '#1e293b' : '#94a3b8' }}>
                    {s.emergencyPhone || '—'}
                  </td>
                  <td><HealthBadge student={s} /></td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setEditing(s)}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', fontSize: 12, color: '#64748b', borderTop: '1px solid #f1f5f9' }}>
            Showing {visible.length} student{visible.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* edit modal */}
      {editing && <HealthModal student={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
