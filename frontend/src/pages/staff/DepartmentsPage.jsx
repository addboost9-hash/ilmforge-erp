/**
 * Departments — create, rename and remove the school's staff departments.
 *
 * The Department model has always existed (Staff.departmentId points at it and
 * payroll/attendance reports group by it), but /staff/departments rendered the
 * generic staff list and there was no API to manage them, so the department
 * dropdown on the staff form had nothing to read.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Building2, Trash2, Pencil, Check, X, Users } from 'lucide-react';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/staff/departments').then(r => r.data.data || []),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['departments'] });
    qc.invalidateQueries({ queryKey: ['staff-list'] });
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
    onSuccess: (res) => { toast.success(res.data?.message || 'Department deleted'); invalidate(); },
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

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Add form */}
        <div className="card">
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#475569' }}>
                        <Users size={13} color="#94A3B8" /> {d.staffCount || 0}
                      </span>
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
    </div>
  );
}
