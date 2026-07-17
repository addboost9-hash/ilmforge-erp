import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, ClipboardList, BarChart2, GraduationCap, X, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';

const TEAL = '#0D9488';
const typeBadge = { test:'badge-blue', midterm:'badge-amber', final:'badge-red' };

/* ── Multi-class chip selector ── */
function ClassMultiSelect({ classes = [], selectedClasses, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) &&
    !selectedClasses.find(s => s.classId === c.id)
  );

  const addClass = (cls) => {
    onChange([...selectedClasses, { classId: cls.id, className: cls.name }]);
    setSearch('');
  };

  const removeClass = (classId) => {
    onChange(selectedClasses.filter(s => s.classId !== classId));
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Tag display + trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: 38, border: '1px solid #D1D5DB', borderRadius: 6,
          padding: '4px 8px', cursor: 'pointer', display: 'flex',
          flexWrap: 'wrap', gap: 4, alignItems: 'center', background: '#fff',
        }}
      >
        {selectedClasses.length === 0 && (
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>Select classes...</span>
        )}
        {selectedClasses.map(sc => (
          <span key={sc.classId} style={{
            background: '#CCFBF1', color: '#0F766E', borderRadius: 99,
            padding: '2px 8px', fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {sc.className}
            <button
              onMouseDown={e => { e.stopPropagation(); removeClass(sc.classId); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F766E', padding: 0, fontSize: 13, lineHeight: 1 }}
            >×</button>
          </span>
        ))}
        <ChevronDown size={14} style={{ marginLeft: 'auto', color: '#6B7280' }} />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search class..."
              style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 5, padding: '5px 10px', fontSize: 13, boxSizing: 'border-box' }}
              onMouseDown={e => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: 13 }}>
                {classes.length === 0 ? 'No classes available' : 'All classes selected'}
              </div>
            )}
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => addClass(c)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#111827',
                  borderBottom: '1px solid #F9FAFB',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FDF9'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {c.name}
              </div>
            ))}
          </div>
          {/* Close button */}
          <div style={{ padding: '6px 10px', borderTop: '1px solid #F3F4F6', textAlign: 'right' }}>
            <button
              onClick={() => setOpen(false)}
              style={{ fontSize: 12, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Add/Edit Exam Modal ── */
function ExamModal({ classes = [], initial = null, onClose, onSubmit, isSubmitting }) {
  const emptyForm = { title: '', type: 'test', selectedClasses: [], dateStart: '', dateEnd: '' };
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm;
    // Parse selectedClasses from classIds or classId
    let selectedClasses = [];
    try { selectedClasses = initial.classIds ? JSON.parse(initial.classIds) : []; } catch { selectedClasses = []; }
    if (selectedClasses.length === 0 && initial.classId) {
      const cls = classes.find(c => c.id === initial.classId);
      if (cls) selectedClasses = [{ classId: cls.id, className: cls.name }];
    }
    return {
      title: initial.title || '',
      type: initial.type || 'test',
      selectedClasses,
      dateStart: initial.dateStart ? initial.dateStart.slice(0, 10) : '',
      dateEnd: initial.dateEnd ? initial.dateEnd.slice(0, 10) : '',
    };
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error('Exam name is required');
    const payload = {
      title: form.title.trim(),
      type: form.type,
      classId: form.selectedClasses[0]?.classId || null,
      classIds: JSON.stringify(form.selectedClasses),
      dateStart: form.dateStart || null,
      dateEnd: form.dateEnd || null,
    };
    onSubmit(payload);
  };

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };
  const modal = {
    background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1E3A5F' }}>
            {initial ? 'Edit Exam' : '+ Add Exam'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 20 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Classes</label>
            <ClassMultiSelect
              classes={classes}
              selectedClasses={form.selectedClasses}
              onChange={sc => setForm(f => ({ ...f, selectedClasses: sc }))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Exam Name *</label>
            <input
              className="form-input"
              placeholder="e.g. 1st Term Exam 2025"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="test">Class Test</option>
              <option value="weekly">Weekly Test</option>
              <option value="monthly">Monthly Test</option>
              <option value="midterm">Mid-Term Exam</option>
              <option value="final">Final Exam</option>
              <option value="semester1">1st Semester</option>
              <option value="semester2">2nd Semester</option>
              <option value="semester3">3rd Semester</option>
              <option value="semester4">4th Semester</option>
              <option value="annual">Annual Exam</option>
              <option value="mock">Mock / Practice</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input className="form-input" type="date" value={form.dateStart} onChange={e => setForm(f => ({ ...f, dateStart: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input className="form-input" type="date" value={form.dateEnd} onChange={e => setForm(f => ({ ...f, dateEnd: e.target.value }))} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-teal" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExamsPage() {
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
  });

  const add = useMutation({
    mutationFn: d => api.post('/exams', d),
    onSuccess: () => {
      toast.success('Exam created!');
      qc.invalidateQueries(['exams']);
      setShowAddModal(false);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const edit = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/exams/${id}`, d),
    onSuccess: () => {
      toast.success('Exam updated!');
      qc.invalidateQueries(['exams']);
      setEditExam(null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const del = useMutation({
    mutationFn: id => api.delete(`/exams/${id}`),
    onSuccess: () => { toast.success('Deleted!'); qc.invalidateQueries(['exams']); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  /* Parse selectedClasses from exam.classIds */
  const getClasses = (exam) => {
    try {
      const arr = exam.classIds ? JSON.parse(exam.classIds) : [];
      if (arr.length > 0) return arr;
    } catch { /* ignore */ }
    if (exam.classId) {
      const cls = classes.find(c => c.id === exam.classId);
      if (cls) return [{ classId: cls.id, className: cls.name }];
    }
    return [];
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK') : '—';

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Exams &amp; Tests</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Create exams, enter marks, print marksheets</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" style={{ color: '#DC2626', borderColor: '#DC2626' }}>
            PDF
          </button>
          <button className="btn btn-sm" style={{ background: '#0D9488', color: '#fff', border: 'none' }}>
            Word
          </button>
          <button className="btn btn-teal" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Exam
          </button>
        </div>
      </div>

      {/* Exams table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>S.No.</th>
                  <th>Exam Name</th>
                  <th style={{ width: 80 }}>Edit</th>
                  <th style={{ width: 70 }}>PDF</th>
                  <th style={{ width: 70 }}>Word</th>
                  <th style={{ width: 70 }}>Delete</th>
                  <th style={{ width: 80 }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((e, idx) => {
                  const isExpanded = expandedRow === e.id;
                  const examClasses = getClasses(e);
                  return (
                    <>
                      <tr key={e.id} style={{ background: isExpanded ? '#F0FDF9' : undefined }}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#1E3A5F' }}>
                          {e.title}
                          <span className={`badge ${typeBadge[e.type] || 'badge-gray'}`} style={{ marginLeft: 8 }}>{e.type}</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ background: TEAL, color: '#fff', border: 'none', padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setEditExam(e)}
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-sm" style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 12 }}>
                            PDF
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-sm" style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 12 }}>
                            Word
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 12 }}
                            onClick={() => { if (window.confirm('Delete this exam?')) del.mutate(e.id); }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setExpandedRow(isExpanded ? null : e.id)}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${e.id}-detail`} style={{ background: '#F0FDF9' }}>
                          <td colSpan={7} style={{ padding: '10px 20px', fontSize: 13 }}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: '#374151' }}>
                              <span>
                                <strong>Exam Name:</strong> {e.title}
                              </span>
                              <span>
                                <strong>Classes:</strong>{' '}
                                {examClasses.length > 0
                                  ? examClasses.map(sc => (
                                    <span key={sc.classId} style={{
                                      background: '#CCFBF1', color: '#0F766E',
                                      borderRadius: 99, padding: '1px 8px', fontSize: 11,
                                      fontWeight: 600, marginRight: 4,
                                    }}>
                                      {sc.className}
                                    </span>
                                  ))
                                  : <span style={{ color: '#9CA3AF' }}>All Classes</span>
                                }
                              </span>
                              <span><strong>From:</strong> {fmtDate(e.dateStart)}</span>
                              <span><strong>To:</strong> {fmtDate(e.dateEnd)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <Link to={'/exams/' + e.id + '/marks'} className="btn btn-outline btn-sm">
                                <ClipboardList size={12} /> Marks
                              </Link>
                              <Link to={'/exams/' + e.id + '/results'} className="btn btn-sm" style={{ background: '#CCFBF1', color: '#0F766E', border: '1px solid #BBF7D0' }}>
                                <BarChart2 size={12} /> Results
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {(!data || data.length === 0) && (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📝</div>
                      <div className="empty-state-text">No exams yet</div>
                      <div className="empty-state-sub">Click "+ Add Exam" to add your first exam</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Exam Modal */}
      {showAddModal && (
        <ExamModal
          classes={classes}
          onClose={() => setShowAddModal(false)}
          onSubmit={d => add.mutate(d)}
          isSubmitting={add.isPending}
        />
      )}

      {/* Edit Exam Modal */}
      {editExam && (
        <ExamModal
          classes={classes}
          initial={editExam}
          onClose={() => setEditExam(null)}
          onSubmit={d => edit.mutate({ id: editExam.id, ...d })}
          isSubmitting={edit.isPending}
        />
      )}
    </div>
  );
}
