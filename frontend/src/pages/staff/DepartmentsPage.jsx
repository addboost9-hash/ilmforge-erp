/**
 * Departments — create, rename and remove the school's staff departments.
 *
 * The Department model has always existed (Staff.departmentId points at it and
 * payroll/attendance reports group by it), but /staff/departments rendered the
 * generic staff list and there was no API to manage them, so the department
 * dropdown on the staff form had nothing to read.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Building2, Trash2, Pencil, Check, X, Users, UserPlus, UserMinus, Search } from 'lucide-react';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [openId, setOpenId] = useState(null); // department whose staff are shown

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/staff/departments').then(r => r.data.data || []),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['departments'] });
    qc.invalidateQueries({ queryKey: ['staff-list'] });
    qc.invalidateQueries({ queryKey: ['staff'] });
  };

  const add = useMutation({
    mutationFn: (d) => api.post('/staff/departments', d),
    onSuccess: () => { toast.success('Department added'); setName(''); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add department'),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }) => api.put(`/staff/departments/${id}`, { name }),
    onSuccess: () => { toast.success('Department renamed'); setEditingId(null); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to rename department'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/staff/departments/${id}`),
    onSuccess: (res, id) => { toast.success(res.data?.message || 'Department deleted'); if (openId === id) setOpenId(null); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete department'),
  });

  const submitNew = () => {
    if (!name.trim()) return toast.error('Enter a department name');
    add.mutate({ name: name.trim() });
  };

  const startEdit = (dept) => { setEditingId(dept.id); setEditName(dept.name); };

  const submitEdit = (id) => {
    if (!editName.trim()) return toast.error('Enter a department name');
    rename.mutate({ id, name: editName.trim() });
  };

  const confirmRemove = (dept) => {
    if (!window.confirm(`Delete the "${dept.name}" department?`)) return;
    remove.mutate(dept.id);
  };

  const totalStaff = departments.reduce((sum, d) => sum + (d.staffCount || 0), 0);

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Departments</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Organise staff into departments — used across payroll, staff attendance and HR reports
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Add form */}
        <div className="card" style={{ flex: '0 1 320px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Building2 size={16} color="#0D9488" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Add Department</h3>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dept-name">Department Name *</label>
            <input
              id="dept-name"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitNew(); }}
              placeholder="e.g. Science, Administration"
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={submitNew}
            disabled={add.isPending}
          >
            <Plus size={15} /> {add.isPending ? 'Adding…' : 'Add Department'}
          </button>

          <div style={{ marginTop: 16, padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: '#64748B' }}>
            {departments.length} department{departments.length === 1 ? '' : 's'} · {totalStaff} staff assigned
          </div>
        </div>

        {/* List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', flex: '1 1 440px', minWidth: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>All Departments</h3>
          </div>

          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Department</th>
                  <th>Staff</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>Loading departments…</td></tr>
                ) : departments.length === 0 ? (
                  <tr><td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🏢</div>
                      <div className="empty-state-text">No departments yet — add your first one to start organising staff</div>
                    </div>
                  </td></tr>
                ) : departments.map((d, i) => (
                  <tr key={d.id}>
                    <td style={{ color: '#94A3B8' }}>{i + 1}</td>
                    <td>
                      {editingId === d.id ? (
                        <input
                          className="form-input"
                          style={{ maxWidth: 260 }}
                          value={editName}
                          autoFocus
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') submitEdit(d.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          aria-label={`Rename ${d.name}`}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: '#1E3A5F' }}>{d.name}</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setOpenId(openId === d.id ? null : d.id)}
                        aria-expanded={openId === d.id} aria-label={`Staff in ${d.name}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5,
                          background: openId === d.id ? '#1B2F6E' : undefined, color: openId === d.id ? '#fff' : '#475569' }}>
                        <Users size={13} /> {d.staffCount || 0} · {openId === d.id ? 'Hide' : 'View / assign'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {editingId === d.id ? (
                        <>
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ marginRight: 6 }}
                            onClick={() => submitEdit(d.id)}
                            disabled={rename.isPending}
                            aria-label="Save name"
                          >
                            <Check size={14} />
                          </button>
                          <button className="btn btn-sm" onClick={() => setEditingId(null)} aria-label="Cancel rename">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => startEdit(d)}
                            aria-label={`Rename ${d.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-red"
                            onClick={() => confirmRemove(d)}
                            disabled={remove.isPending}
                            aria-label={`Delete ${d.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openId && departments.some(d => d.id === openId) && (
        <MembersPanel dept={departments.find(d => d.id === openId)} onChanged={invalidate} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

/* Staff in one department, with add and remove in bulk. Staff used to be
   moved one record at a time from the edit form, so a school setting up its
   departments had to open every teacher. */
function MembersPanel({ dept, onChanged, onClose }) {
  const [picked, setPicked] = useState({});
  const [q, setQ] = useState('');
  const { data: all = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
    select: (d) => d?.data || [],
  });
  const members = all.filter(s => s.departmentId === dept.id);
  const others = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter(s => s.departmentId !== dept.id)
      .filter(s => !t || [s.name, s.designation, s.empCode, s.department?.name].some(v => v && String(v).toLowerCase().includes(t)))
      // people with no department first: they are usually the ones to place
      .sort((a, b) => (a.departmentId ? 1 : 0) - (b.departmentId ? 1 : 0) || a.name.localeCompare(b.name));
  }, [all, dept.id, q]);
  const pickedIds = Object.keys(picked).filter(k => picked[k]).map(Number);

  const move = useMutation({
    mutationFn: (body) => api.put(`/staff/departments/${dept.id}/members`, body),
    onSuccess: (r) => { toast.success(r.data?.message || 'Saved'); setPicked({}); onChanged(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update the department'),
  });

  const heading = { fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 };

  return (
    <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Building2 size={16} color="#0D9488" />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{dept.name}: {members.length} staff</h3>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close department staff"><X size={14} /></button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* In this department */}
        <div style={{ flex: '1 1 320px', minWidth: 0, padding: 16, borderRight: '1px solid #F1F5F9' }}>
          <div style={heading}>In this department</div>
          {isLoading ? <div style={{ color: '#94A3B8', fontSize: 13 }}>Loading…</div>
            : members.length === 0 ? <div style={{ color: '#94A3B8', fontSize: 13 }}>Nobody yet. Tick staff on the right and add them.</div>
            : members.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #F8FAFC' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8' }}>{s.designation || 'Staff'} · {s.empCode || 'S-' + s.id}</div>
                </div>
                <button type="button" className="btn btn-sm btn-outline" style={{ color: '#B91C1C', borderColor: '#FECACA' }}
                  disabled={move.isPending} onClick={() => move.mutate({ remove: [s.id] })} aria-label={`Remove ${s.name} from ${dept.name}`}>
                  <UserMinus size={13} /> Remove
                </button>
              </div>
            ))}
        </div>
        {/* Everyone else */}
        <div style={{ flex: '1 1 320px', minWidth: 0, padding: 16 }}>
          <div style={heading}>Add staff to {dept.name}</div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input className="form-input" style={{ paddingLeft: 30 }} placeholder="Search staff" value={q} onChange={e => setQ(e.target.value)} aria-label="Search staff to add" />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: 8 }}>
            {others.length === 0
              ? <div style={{ padding: 12, color: '#94A3B8', fontSize: 13 }}>{q ? 'No match.' : 'Every staff member is already in this department.'}</div>
              : others.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!picked[s.id]} onChange={e => setPicked(p => ({ ...p, [s.id]: e.target.checked }))} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{s.name}</span>
                    <span style={{ fontSize: 11.5, color: '#94A3B8' }}> · {s.designation || 'Staff'}</span>
                  </span>
                  <span style={{ fontSize: 11, color: s.department ? '#B45309' : '#94A3B8' }}>{s.department ? 'now in ' + s.department.name : 'no department'}</span>
                </label>
              ))}
          </div>
          <button type="button" className="btn btn-teal" style={{ marginTop: 10 }} disabled={!pickedIds.length || move.isPending}
            onClick={() => move.mutate({ add: pickedIds })}>
            <UserPlus size={14} /> {move.isPending ? 'Saving…' : pickedIds.length ? `Add ${pickedIds.length} to ${dept.name}` : `Add to ${dept.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
