import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { UserPlus, Search, Download, Eye, Trash2, FileText, RefreshCw, Printer, ArrowRightLeft, X, CheckCircle, Users, UserCheck, UserX, GraduationCap } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

const statusBadge = { active: 'badge-success', inactive: 'badge-danger', passout: 'badge-secondary' };

export default function StudentsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: 'active', search: '', classId: '' });
  const [page, setPage] = useState(1);

  const [confirmDialog, setConfirmDialog] = useState({ open: false, studentId: null, studentName: '' });
  const [promoteModal, setPromoteModal] = useState(null);
  const [promoteForm, setPromoteForm] = useState({ classId: '', sectionId: '', status: 'active' });
  const [promoteSections, setPromoteSections] = useState([]);

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data) });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', filters, page],
    queryFn: () => api.get('/students', { params: { ...filters, page, limit: 25 } }).then(r => r.data),
  });

  const deactivate = useMutation({
    mutationFn: id => api.delete('/students/' + id),
    onSuccess: () => { toast.success('Student deactivated'); qc.invalidateQueries(['students']); },
  });

  const promote = useMutation({
    mutationFn: ({ id, data }) => api.put('/students/' + id, data),
    onSuccess: () => {
      const st = promoteModal;
      toast.success(`${st?.name} promoted successfully!`);
      qc.invalidateQueries(['students']);
      setPromoteModal(null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Promote failed'),
  });

  const openPromote = (student) => {
    setPromoteModal(student);
    setPromoteForm({ classId: student.classId || '', sectionId: student.sectionId || '', status: student.status || 'active' });
    const cls = (classes || []).find(c => c.id === student.classId);
    setPromoteSections(cls?.sections || []);
  };

  const onPromoteClassChange = (e) => {
    const cls = (classes || []).find(c => c.id === parseInt(e.target.value));
    setPromoteForm(f => ({ ...f, classId: e.target.value, sectionId: '' }));
    setPromoteSections(cls?.sections || []);
  };

  const downloadExcel = () => {
    const p = new URLSearchParams({ ...filters, classId: filters.classId || '' });
    window.open('/api/v1/reports/students/excel?' + p, '_blank');
  };

  const total = data?.total ?? 0;
  const activeCount = filters.status === 'active' ? total : '—';

  return (
    <div className="page-content fade-in">

      {/* Page Header Card */}
      <div className="card" style={{ marginBottom: 16, padding: 0 }}>
        <div className="content-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Students</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>
              Total: <strong>{total}</strong> students
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={downloadExcel}><Download size={14} /> Excel</button>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Printer size={14} /> Print</button>
            <button className="btn btn-primary" onClick={() => nav('/admissions')}>
              <UserPlus size={14} /> Add Student
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {/* Total */}
        <div className="stat-card stat-blue" style={{ cursor: 'default' }}>
          <div className="stat-card-body">
            <div className="stat-card-content">
              <div className="stat-card-value">{data?.total ?? 0}</div>
              <div className="stat-card-label">Total Students</div>
            </div>
            <div className="stat-card-icon"><Users size={60} /></div>
          </div>
          <div className="stat-card-footer">
            <span>All enrolled</span>
          </div>
        </div>

        {/* Active */}
        <div className="stat-card stat-green" style={{ cursor: 'pointer' }}
          onClick={() => { setFilters(f => ({ ...f, status: 'active' })); setPage(1); }}>
          <div className="stat-card-body">
            <div className="stat-card-content">
              <div className="stat-card-value">—</div>
              <div className="stat-card-label">Active</div>
            </div>
            <div className="stat-card-icon"><UserCheck size={60} /></div>
          </div>
          <div className="stat-card-footer">
            <span>View active</span>
          </div>
        </div>

        {/* Inactive */}
        <div className="stat-card stat-yellow" style={{ cursor: 'pointer' }}
          onClick={() => { setFilters(f => ({ ...f, status: 'inactive' })); setPage(1); }}>
          <div className="stat-card-body">
            <div className="stat-card-content">
              <div className="stat-card-value">—</div>
              <div className="stat-card-label">Inactive</div>
            </div>
            <div className="stat-card-icon"><UserX size={60} /></div>
          </div>
          <div className="stat-card-footer">
            <span>View inactive</span>
          </div>
        </div>

        {/* Passout */}
        <div className="stat-card stat-red" style={{ cursor: 'pointer' }}
          onClick={() => { setFilters(f => ({ ...f, status: 'passout' })); setPage(1); }}>
          <div className="stat-card-body">
            <div className="stat-card-content">
              <div className="stat-card-value">—</div>
              <div className="stat-card-label">Passout</div>
            </div>
            <div className="stat-card-icon"><GraduationCap size={60} /></div>
          </div>
          <div className="stat-card-footer">
            <span>View passout</span>
          </div>
        </div>
      </div>

      {/* Filter Row Card */}
      <div className="card" style={{ marginBottom: 14, padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32 }}
              placeholder="Search name, roll no, father name..."
              value={filters.search}
              onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            />
          </div>

          {/* Class filter */}
          <select
            className="form-select"
            style={{ width: 160 }}
            value={filters.classId}
            onChange={e => { setFilters({ ...filters, classId: e.target.value }); setPage(1); }}
          >
            <option value="">All Classes</option>
            {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Status filter */}
          <select
            className="form-select"
            style={{ width: 140 }}
            value={filters.status}
            onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="passout">Pass-out</option>
          </select>

          <button className="btn btn-outline btn-sm" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Students Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No</th>
                    <th>Student</th>
                    <th>Father Name</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data || []).map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * 25 + idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 12 }}>
                          {s.rollNo || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          {/* Avatar: photo from localStorage or initials circle */}
                          {(() => {
                            const photo = typeof window !== 'undefined' ? localStorage.getItem(`photo_student_${s.id}`) : null;
                            return photo ? (
                              <img src={photo} alt={s.name}
                                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border-light)' }} />
                            ) : (
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: s.gender === 'female'
                                  ? 'linear-gradient(135deg,#e91e8c,#c2185b)'
                                  : 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                              }}>
                                {s.name?.charAt(0)}
                              </div>
                            );
                          })()}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{s.name}</div>
                            {s.dob && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(s.dob).toLocaleDateString('en-PK')}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.fatherName || '—'}</td>
                      <td><span className="badge badge-primary">{s.class?.name || '—'}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.section?.name || '—'}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: 12, color: 'var(--text-secondary)' }}>{s.gender || '—'}</td>
                      <td><span className={`badge ${statusBadge[s.status] || 'badge-secondary'}`}>{s.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <Link to={'/students/' + s.id} className="btn btn-sm btn-primary btn-icon" title="View Profile">
                            <Eye size={13} />
                          </Link>
                          <button
                            className="btn btn-sm btn-icon"
                            style={{ background: 'var(--primary-light)', border: '1px solid var(--border-light)', color: 'var(--primary)' }}
                            title="Promote / Transfer"
                            onClick={() => openPromote(s)}>
                            <ArrowRightLeft size={13} />
                          </button>
                          <a href={'/api/v1/pdf/voucher/' + s.id} target="_blank" rel="noreferrer"
                            className="btn btn-sm btn-icon"
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}
                            title="Fee Voucher">
                            <FileText size={13} />
                          </a>
                          <button
                            className="btn btn-sm btn-danger btn-icon"
                            title="Deactivate"
                            onClick={() => setConfirmDialog({ open: true, studentId: s.id, studentName: s.name })}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data?.data || data.data.length === 0) && (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state">
                          <div className="empty-state-icon">👨‍🎓</div>
                          <div className="empty-state-text">No students found</div>
                          <div className="empty-state-sub">
                            <Link to="/admissions" style={{ color: 'var(--primary)' }}>Admit your first student →</Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                {Array.from({ length: data.pages }, (_, i) => (
                  <button key={i + 1} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Deactivate Confirm Modal */}
      <ConfirmModal
        isOpen={confirmDialog.open}
        title="Deactivate Student"
        message={`Are you sure you want to deactivate ${confirmDialog.studentName}? This will mark the student as inactive and they will no longer appear in active student lists.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        danger={true}
        onConfirm={() => {
          deactivate.mutate(confirmDialog.studentId);
          setConfirmDialog({ open: false, studentId: null, studentName: '' });
        }}
        onCancel={() => setConfirmDialog({ open: false, studentId: null, studentName: '' })}
      />

      {/* Promote / Transfer Modal */}
      {promoteModal && (
        <div className="modal-overlay" onClick={() => setPromoteModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ padding: 0 }}>

            <div className="card-header" style={{ borderRadius: '8px 8px 0 0' }}>
              <div>
                <div className="modal-title">Promote / Transfer Student</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                  Move <strong>{promoteModal.name}</strong> to a different class
                </div>
              </div>
              <button onClick={() => setPromoteModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div className="card-body">
              {/* Current info banner */}
              <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 13 }}>
                <span>Current: </span>
                <strong>{promoteModal.class?.name || 'No class'}</strong>
                {promoteModal.section?.name && <> — Section <strong>{promoteModal.section.name}</strong></>}
                <span className={`badge ${statusBadge[promoteModal.status] || 'badge-secondary'}`} style={{ marginLeft: 8 }}>{promoteModal.status}</span>
              </div>

              <div className="form-group">
                <label className="form-label">New Class *</label>
                <select className="form-select" value={promoteForm.classId} onChange={onPromoteClassChange}>
                  <option value="">Select New Class</option>
                  {(classes || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.id === promoteModal.classId ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">New Section</label>
                <select className="form-select" value={promoteForm.sectionId} onChange={e => setPromoteForm(f => ({ ...f, sectionId: e.target.value }))}>
                  <option value="">Select Section</option>
                  {promoteSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Student Status</label>
                <select className="form-select" value={promoteForm.status} onChange={e => setPromoteForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="passout">Pass-out (Graduated)</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPromoteModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!promoteForm.classId || promote.isPending}
                onClick={() => promote.mutate({
                  id: promoteModal.id,
                  data: {
                    classId: promoteForm.classId ? parseInt(promoteForm.classId) : undefined,
                    sectionId: promoteForm.sectionId ? parseInt(promoteForm.sectionId) : undefined,
                    status: promoteForm.status,
                  }
                })}>
                {promote.isPending ? 'Saving...' : <><CheckCircle size={15} /> Promote Student</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
