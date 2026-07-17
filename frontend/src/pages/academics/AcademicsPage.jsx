/**
 * IlmForge — Unified Academics Hub (School Mentor Style)
 * Tabs: Homework | Study Materials | Online Classes | Academic Calendar | Lesson Plans | Scheme
 * URL: /academics-hub
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Trash2, X, ExternalLink, Download, Eye, FileText, Video, Link2, BookOpen } from 'lucide-react';
import LessonPlanPage from './LessonPlanPage';
import SchemeOfStudiesPage from './SchemeOfStudiesPage';
import AcademicCalendarPage from './AcademicCalendarPage';

const TEAL = '#0D9488';
const NAVY = '#1B2F6E';

const tabBtnStyle = (active) => ({
  padding: '9px 18px',
  fontWeight: 700,
  fontSize: 13,
  borderRadius: 7,
  border: `1.5px solid ${TEAL}`,
  background: active ? TEAL : 'transparent',
  color: active ? '#fff' : TEAL,
  cursor: 'pointer',
  transition: 'all .15s',
  whiteSpace: 'nowrap',
});

const inp = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #D1D5DB',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
  background: '#fff',
};

/* ═══════════════════════════════════
   HOMEWORK TAB
═══════════════════════════════════ */
function HomeworkTab() {
  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    classId: '', subjectId: '', title: '', description: '', dueDate: '',
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });

  const subjectsForClass = classes.find(c => String(c.id) === String(form.classId))?.subjects || [];

  const { data: homeworks = [], isLoading } = useQuery({
    queryKey: ['homeworks', filterClassId, filterDate],
    queryFn: async () => {
      const params = {};
      if (filterClassId) params.classId = filterClassId;
      if (filterDate) params.date = filterDate;
      const res = await api.get('/homework', { params }).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const addMut = useMutation({
    mutationFn: d => api.post('/homework', d),
    onSuccess: () => {
      toast.success('Homework assigned!');
      qc.invalidateQueries(['homeworks']);
      setShowModal(false);
      setForm({ classId: '', subjectId: '', title: '', description: '', dueDate: '' });
    },
    onError: err => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const delMut = useMutation({
    mutationFn: id => api.delete(`/homework/${id}`),
    onSuccess: () => { toast.success('Deleted!'); qc.invalidateQueries(['homeworks']); },
    onError: err => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || '—';

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Date</label>
          <input type="date" style={{ ...inp, width: 160 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Class</label>
          <select style={{ ...inp, width: 160 }} value={filterClassId} onChange={e => setFilterClassId(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ marginLeft: 'auto', background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> Assign Homework
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>S.No.</th>
                <th>Subject</th>
                <th>Title</th>
                <th>Due Date</th>
                <th>Class</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {homeworks.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <div className="empty-state-text">No homework assigned</div>
                    <div className="empty-state-sub">Click "+ Assign Homework" to add one</div>
                  </div>
                </td></tr>
              )}
              {homeworks.map((hw, idx) => (
                <tr key={hw.id}>
                  <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, color: NAVY }}>{hw.subjectName || hw.subject || '—'}</td>
                  <td>{hw.title || hw.description || '—'}</td>
                  <td>{hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-PK') : (hw.date ? new Date(hw.date).toLocaleDateString('en-PK') : '—')}</td>
                  <td>{getClassName(hw.classId)}</td>
                  <td>
                    <button
                      onClick={() => { if (window.confirm('Delete this homework?')) delMut.mutate(hw.id); }}
                      style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>Assign Homework</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Class *</label>
                <select style={inp} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, subjectId: '' }))}>
                  <option value="">— Select Class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Subject</label>
                <select style={inp} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">— Select Subject —</option>
                  {subjectsForClass.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Title *</label>
                <input style={inp} placeholder="Homework title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Description</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 70 }} placeholder="Details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Due Date</label>
                <input type="date" style={inp} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-teal"
                onClick={() => {
                  if (!form.title.trim()) return toast.error('Title is required');
                  if (!form.classId) return toast.error('Class is required');
                  addMut.mutate({
                    classId: parseInt(form.classId),
                    subjectId: form.subjectId ? parseInt(form.subjectId) : null,
                    description: form.title.trim() + (form.description ? '\n' + form.description : ''),
                    date: form.dueDate || new Date().toISOString().slice(0, 10),
                  });
                }}
                disabled={addMut.isPending}
              >
                {addMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   STUDY MATERIALS TAB
═══════════════════════════════════ */
const MATERIAL_TYPES = ['All', 'PDF', 'Video', 'Link', 'Document'];
const TYPE_ICONS = {
  pdf: <FileText size={20} color="#DC2626" />,
  video: <Video size={20} color="#7C3AED" />,
  link: <Link2 size={20} color="#2563EB" />,
  doc: <BookOpen size={20} color="#0D9488" />,
  document: <BookOpen size={20} color="#0D9488" />,
};

function StudyMaterialsTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', fileType: 'link', fileUrl: '', classId: '', subjectId: '', description: '' });

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['study-materials'],
    queryFn: () => api.get('/study-materials').then(r => r.data?.data || []).catch(() => []),
  });

  const addMut = useMutation({
    mutationFn: d => api.post('/study-materials', d),
    onSuccess: () => { toast.success('Material added!'); qc.invalidateQueries(['study-materials']); setShowModal(false); setForm({ title: '', fileType: 'link', fileUrl: '', classId: '', subjectId: '', description: '' }); },
    onError: err => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const delMut = useMutation({
    mutationFn: id => api.delete(`/study-materials/${id}`),
    onSuccess: () => { toast.success('Deleted!'); qc.invalidateQueries(['study-materials']); },
    onError: err => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const filtered = typeFilter === 'All' ? materials : materials.filter(m => (m.fileType || '').toLowerCase() === typeFilter.toLowerCase());
  const getClassName = (cId) => classes.find(c => c.id === cId)?.name || '—';

  return (
    <div>
      {/* Filters + Upload btn */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {MATERIAL_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            style={{ padding: '6px 14px', borderRadius: 6, border: `1.5px solid ${TEAL}`, background: typeFilter === t ? TEAL : 'transparent', color: typeFilter === t ? '#fff' : TEAL, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
            {t}
          </button>
        ))}
        <button
          onClick={() => setShowModal(true)}
          style={{ marginLeft: 'auto', background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> Upload Material
        </button>
      </div>

      {/* Cards grid */}
      {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div> : (
        filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 16, marginBottom: 6 }}>No study materials found</div>
            <div style={{ color: '#94A3B8', fontSize: 13 }}>Click "+ Upload Material" to add one</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map(m => (
              <div key={m.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {TYPE_ICONS[(m.fileType || 'link').toLowerCase()] || <Link2 size={20} color="#6B7280" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>
                      {getClassName(m.classId)} · {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-PK') : '—'}
                    </div>
                  </div>
                </div>
                {m.description && <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>{m.description}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={m.fileUrl} target="_blank" rel="noreferrer"
                    style={{ flex: 1, background: TEAL, color: '#fff', border: 'none', borderRadius: 5, padding: '6px 10px', cursor: 'pointer', fontWeight: 600, fontSize: 12, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Eye size={12} /> View
                  </a>
                  <a href={m.fileUrl} download
                    style={{ background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: 5, padding: '6px 10px', cursor: 'pointer', fontWeight: 600, fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Download size={12} />
                  </a>
                  <button onClick={() => { if (window.confirm('Delete?')) delMut.mutate(m.id); }}
                    style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 5, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Upload Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>Upload Study Material</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Title *</label>
                <input style={inp} placeholder="Material title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Type</label>
                  <select style={inp} value={form.fileType} onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))}>
                    {['link', 'pdf', 'video', 'doc'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Class</label>
                  <select style={inp} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>URL / Link *</label>
                <input style={inp} placeholder="https://..." value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Description</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} placeholder="Optional description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-teal"
                onClick={() => {
                  if (!form.title.trim()) return toast.error('Title is required');
                  if (!form.fileUrl.trim()) return toast.error('URL is required');
                  addMut.mutate({
                    title: form.title.trim(),
                    fileType: form.fileType,
                    fileUrl: form.fileUrl.trim(),
                    classId: form.classId ? parseInt(form.classId) : null,
                    description: form.description || null,
                  });
                }}
                disabled={addMut.isPending}
              >
                {addMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   ONLINE CLASSES TAB
═══════════════════════════════════ */
function OnlineClassesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', classId: '', subjectId: '', meetingLink: '', scheduledAt: '', durationMinutes: 60 });

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });

  const { data: onlineClasses = [], isLoading } = useQuery({
    queryKey: ['online-classes'],
    queryFn: () => api.get('/online-classes').then(r => r.data?.data || []).catch(() => []),
  });

  const addMut = useMutation({
    mutationFn: d => api.post('/online-classes', d),
    onSuccess: () => { toast.success('Class link added!'); qc.invalidateQueries(['online-classes']); setShowModal(false); setForm({ title: '', classId: '', subjectId: '', meetingLink: '', scheduledAt: '', durationMinutes: 60 }); },
    onError: err => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const delMut = useMutation({
    mutationFn: id => api.delete(`/online-classes/${id}`),
    onSuccess: () => { toast.success('Deleted!'); qc.invalidateQueries(['online-classes']); },
    onError: err => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const getClassName = (cId) => classes.find(c => c.id === cId)?.name || '—';
  const subjectsForClass = classes.find(c => String(c.id) === String(form.classId))?.subjects || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> Add Class Link
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>S.No.</th>
                <th>Title</th>
                <th>Class</th>
                <th>Date/Time</th>
                <th>Duration</th>
                <th>Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {onlineClasses.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🖥️</div>
                    <div className="empty-state-text">No online classes scheduled</div>
                    <div className="empty-state-sub">Click "+ Add Class Link" to schedule one</div>
                  </div>
                </td></tr>
              )}
              {onlineClasses.map((oc, idx) => (
                <tr key={oc.id}>
                  <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: NAVY }}>{oc.title}</td>
                  <td>{getClassName(oc.classId)}</td>
                  <td>{oc.scheduledAt ? new Date(oc.scheduledAt).toLocaleString('en-PK') : '—'}</td>
                  <td>{oc.durationMinutes ? `${oc.durationMinutes} min` : '—'}</td>
                  <td>
                    {oc.meetingLink ? (
                      <a href={oc.meetingLink} target="_blank" rel="noreferrer"
                        style={{ background: TEAL, color: '#fff', borderRadius: 5, padding: '4px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ExternalLink size={11} /> Join
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    <button onClick={() => { if (window.confirm('Delete?')) delMut.mutate(oc.id); }}
                      style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>Add Online Class Link</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Title *</label>
                <input style={inp} placeholder="e.g. Mathematics Live Class" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Class</label>
                  <select style={inp} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, subjectId: '' }))}>
                    <option value="">— Select Class —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Subject</label>
                  <select style={inp} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                    <option value="">— Select Subject —</option>
                    {subjectsForClass.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Meeting Link *</label>
                <input style={inp} placeholder="https://meet.google.com/..." value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Date & Time</label>
                  <input type="datetime-local" style={inp} value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Duration (min)</label>
                  <input type="number" style={inp} value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-teal"
                onClick={() => {
                  if (!form.title.trim()) return toast.error('Title is required');
                  if (!form.meetingLink.trim()) return toast.error('Meeting link is required');
                  addMut.mutate({
                    title: form.title.trim(),
                    classId: form.classId ? parseInt(form.classId) : null,
                    subjectId: form.subjectId ? parseInt(form.subjectId) : null,
                    meetingLink: form.meetingLink.trim(),
                    scheduledAt: form.scheduledAt || null,
                    durationMinutes: parseInt(form.durationMinutes) || 60,
                  });
                }}
                disabled={addMut.isPending}
              >
                {addMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN ACADEMICS PAGE
═══════════════════════════════════ */
const TABS = [
  { id: 'homework',        label: 'Homework' },
  { id: 'study-materials', label: 'Study Materials' },
  { id: 'online-classes',  label: 'Online Classes' },
  { id: 'calendar',        label: 'Academic Calendar' },
  { id: 'lesson-plans',    label: 'Lesson Plans' },
  { id: 'scheme',          label: 'Scheme of Studies' },
];

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState('homework');

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: NAVY }}>📚 Academics</h1>
        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>Manage homework, study materials, online classes and more</p>
      </div>

      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button key={tab.id} style={tabBtnStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'homework'        && <HomeworkTab />}
      {activeTab === 'study-materials' && <StudyMaterialsTab />}
      {activeTab === 'online-classes'  && <OnlineClassesTab />}
      {activeTab === 'calendar'        && <AcademicCalendarPage />}
      {activeTab === 'lesson-plans'    && <LessonPlanPage />}
      {activeTab === 'scheme'          && <SchemeOfStudiesPage />}
    </div>
  );
}
