import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

/* Subjects are owned by the server (/classes/subjects) — the same store that
   /settings/classes and the academics hub read.

   This page used to keep a parallel localStorage copy seeded with ten sample
   subjects, and fell back to it whenever the API returned an empty list or a
   save failed. The effects were: a school with no subjects yet saw ten
   subjects it had never created, and a failed save reported success while the
   subject existed only in that one browser — invisible to timetables, exams
   and every other user. The fallback is gone; failures now surface. */

function toArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const emptyForm = { name: '', code: '', classId: '', description: '' };

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [filterClass, setFilterClass] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const {
    data: subjectsData,
    isLoading: subjectsLoading,
    isError: subjectsError,
    error: subjectsErrorObj,
  } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/classes/subjects').then((res) => toArrayPayload(res.data)),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      try {
        const res = await api.get('/classes');
        return toArrayPayload(res.data);
      } catch {
        return [];
      }
    },
  });

  // An empty result means this school genuinely has no subjects yet — show
  // that, rather than substituting sample data.
  const subjects = toArrayPayload(subjectsData);
  const classes = toArrayPayload(classesData);

  const getClassName = (classId) => {
    if (!classId) return '-';
    const cls = classes.find((c) => String(c.id) === String(classId));
    return cls ? cls.name : classId;
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['subjects'] });
  const fail = (e) => toast.error(e?.response?.data?.message || 'Could not save subject');

  const addMutation = useMutation({
    mutationFn: (data) => api.post('/classes/subjects', data).then((r) => r.data),
    onSuccess: () => { toast.success('Subject added'); refresh(); setForm(emptyForm); },
    onError: fail,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/classes/subjects/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Subject updated');
      refresh();
      setEditId(null);
      setEditForm(emptyForm);
    },
    onError: fail,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/classes/subjects/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Subject deleted'); refresh(); setDeleteConfirm(null); },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Could not delete subject');
      setDeleteConfirm(null);
    },
  });

  const filtered = subjects.filter((s) =>
    filterClass ? String(s.classId) === String(filterClass) : true
  );

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Subject name is required'); return; }
    // Every subject belongs to a class (Subject.classId is required), so ask
    // for it here rather than letting the save fail server-side.
    if (!form.classId) { toast.error('Select the class this subject belongs to'); return; }
    addMutation.mutate(form);
  };

  const handleEditStart = (subject) => {
    setEditId(subject.id);
    setEditForm({
      name: subject.name || '',
      code: subject.code || '',
      classId: subject.classId || '',
      description: subject.description || '',
    });
  };

  const handleEditSave = (id) => {
    if (!editForm.name.trim()) return;
    editMutation.mutate({ id, data: editForm });
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditForm(emptyForm);
  };

  return (
    <div className="page-content fade-up">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={24} />
            Subjects
            <span className="badge badge-teal" style={{ fontSize: '0.85rem', marginLeft: '0.25rem' }}>
              {filtered.length}
            </span>
          </h1>
          <p className="page-subtitle">Manage school subjects and their details</p>
        </div>
      </div>

      {/* Add Subject Form */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label" htmlFor="subject-name">Subject Name *</label>
              <input
                id="subject-name"
                className="form-input"
                type="text"
                placeholder="e.g. Mathematics"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Code</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. MTH"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                maxLength={5}
              />
            </div>
            <div>
              {/* Required: a subject is always attached to a class. The old
                  "All Classes" default read as optional and the save failed. */}
              <label className="form-label" htmlFor="subject-class">Class *</label>
              <select
                id="subject-class"
                className="form-select"
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
              >
                <option value="">Select class…</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Description</label>
              <input
                className="form-input"
                type="text"
                placeholder="Brief description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div style={{ paddingBottom: '1px' }}>
              <button
                className="btn btn-teal"
                type="submit"
                disabled={addMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={16} />
                Add Subject
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Filter by Class:</label>
          <select
            className="form-select"
            style={{ maxWidth: '220px' }}
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          {filterClass && (
            <button
              className="btn"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}
              onClick={() => setFilterClass('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {subjectsLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading subjects...
          </div>
        ) : subjectsError ? (
          <div className="empty-state">
            <BookOpen size={40} />
            <p>Could not load subjects — {subjectsErrorObj?.response?.data?.message || 'please try again.'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} />
            <p>No subjects found. Add your first subject above.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Subject Name</th>
                <th>Code</th>
                <th>Class</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((subject, index) => (
                <tr key={subject.id}>
                  {editId === subject.id ? (
                    <>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          className="form-input"
                          style={{ minWidth: '140px' }}
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ maxWidth: '80px' }}
                          value={editForm.code}
                          onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                          maxLength={5}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ minWidth: '120px' }}
                          value={editForm.classId}
                          onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                        >
                          <option value="">All Classes</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="form-input"
                          style={{ minWidth: '160px' }}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-teal"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => handleEditSave(subject.id)}
                            disabled={editMutation.isPending}
                          >
                            <Save size={14} />
                            Save
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={handleEditCancel}
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{index + 1}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{subject.name}</span>
                      </td>
                      <td>
                        {subject.code ? (
                          <span className="badge badge-teal">{subject.code}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>{getClassName(subject.classId)}</td>
                      <td style={{ color: subject.description ? 'inherit' : 'var(--text-muted)' }}>
                        {subject.description || '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => handleEditStart(subject)}
                            title="Edit subject"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            className="btn"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: 'var(--danger, #e53e3e)',
                              borderColor: 'var(--danger, #e53e3e)',
                            }}
                            onClick={() => setDeleteConfirm(subject)}
                            title="Delete subject"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} />
                Delete Subject
              </h3>
              <button
                className="btn"
                style={{ padding: '0.25rem 0.5rem' }}
                onClick={() => setDeleteConfirm(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete{' '}
                <strong>{deleteConfirm.name}</strong>
                {deleteConfirm.code ? ` (${deleteConfirm.code})` : ''}? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-teal"
                style={{ background: 'var(--danger, #e53e3e)', borderColor: 'var(--danger, #e53e3e)' }}
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
