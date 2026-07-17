/**
 * IlmForge — Syllabus Management
 * Create, view, and track syllabus completion per class and subject
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Trash2, Edit2, Printer, ChevronRight, Check, Clock, X, Smartphone, Edit } from 'lucide-react';
import api from '../../api/client';

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

const emptyUnit = (unitNo) => ({
  unitNo,
  title: '',
  topics: '',
  estimatedHours: '',
  completed: false,
});

const emptyForm = () => ({
  classId: '',
  subjectId: '',
  title: '',
  academicYear: '2025-2026',
  units: [emptyUnit(1)],
});

export default function SyllabusPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' | 'create' | 'detail'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [filters, setFilters] = useState({ classId: '', subjectId: '', academicYear: '' });

  const { data: syllabi = [], isLoading } = useQuery({
    queryKey: ['syllabus', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.classId)      params.append('classId', filters.classId);
      if (filters.subjectId)    params.append('subjectId', filters.subjectId);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      return api.get(`/syllabus?${params}`).then(r => r.data.data || []);
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
    staleTime: 10 * 60 * 1000,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', form.classId || filters.classId],
    queryFn: () => {
      const cId = form.classId || filters.classId;
      return api.get(`/classes/${cId}/subjects`).then(r => r.data.data || []).catch(() => []);
    },
    enabled: !!(form.classId || filters.classId),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/syllabus', data).then(r => r.data),
    onSuccess: () => { toast.success('Syllabus saved!'); qc.invalidateQueries(['syllabus']); setView('list'); setForm(emptyForm()); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/syllabus/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['syllabus']); if (view === 'detail') setView('list'); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const toggleUnitMutation = useMutation({
    mutationFn: ({ id, unitNo }) => api.patch(`/syllabus/${id}/unit/${unitNo}/complete`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries(['syllabus']);
      if (selected) setSelected(data.data);
      toast.success('Unit status updated');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  // Form helpers
  const addUnit = () => setForm(f => ({ ...f, units: [...f.units, emptyUnit(f.units.length + 1)] }));
  const removeUnit = (idx) => setForm(f => ({ ...f, units: f.units.filter((_, i) => i !== idx) }));
  const updateUnit = (idx, field, val) => setForm(f => ({
    ...f,
    units: f.units.map((u, i) => i === idx ? { ...u, [field]: val } : u),
  }));

  const handleSubmit = () => {
    if (!form.title.trim())     { toast.error('Title required'); return; }
    if (!form.classId)          { toast.error('Class required'); return; }
    if (!form.academicYear)     { toast.error('Academic year required'); return; }

    const cls = classes.find(c => String(c.id) === String(form.classId));
    const sub = subjects.find(s => String(s.id) === String(form.subjectId));
    const units = form.units.map((u, i) => ({
      unitNo: i + 1,
      title: u.title,
      topics: u.topics.split('\n').map(t => t.trim()).filter(Boolean),
      estimatedHours: parseInt(u.estimatedHours) || 0,
      completed: u.completed || false,
    }));

    createMutation.mutate({
      classId:     parseInt(form.classId),
      subjectId:   form.subjectId ? parseInt(form.subjectId) : null,
      title:       form.title,
      academicYear: form.academicYear,
      units,
      className:   cls?.name || '',
      subjectName: sub?.name || '',
    });
  };

  const printSyllabus = (syl) => {
    const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
    const logo = localStorage.getItem('schoolLogoPreview') || '';
    const units = syl.units || [];
    const completedCount = units.filter(u => u.completed).length;

    const unitRows = units.map(u => {
      const topicsHtml = Array.isArray(u.topics) ? u.topics.map(t => `<li>${t}</li>`).join('') : u.topics || '';
      return `<tr>
        <td style="text-align:center;font-weight:700">${u.unitNo}</td>
        <td style="font-weight:600">${u.title || '—'}</td>
        <td><ul style="margin:0;padding-left:16px;font-size:11px">${topicsHtml}</ul></td>
        <td style="text-align:center">${u.estimatedHours || '—'}</td>
        <td style="text-align:center"><span style="font-weight:700;color:${u.completed ? '#059669' : '#D97706'}">${u.completed ? 'Completed' : 'Pending'}</span></td>
      </tr>`;
    }).join('');

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Syllabus — ${syl.title || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
    .header { text-align: center; border-bottom: 3px solid #1B2F6E; padding-bottom: 12px; margin-bottom: 16px; }
    .school { font-size: 20px; font-weight: 900; color: #1B2F6E; }
    .sub-title { font-size: 14px; font-weight: 700; color: #555; margin: 4px 0; }
    .meta { display: flex; justify-content: center; gap: 24px; font-size: 12px; margin-top: 8px; }
    .progress-bar { height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin: 8px 0; }
    .progress-fill { height: 100%; background: #059669; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { background: #1B2F6E; color: #fff; padding: 8px 10px; text-align: left; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f8f9fa; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" alt="" style="height:50px;object-fit:contain;margin-bottom:6px"/>` : ''}
    <div class="school">${schoolName}</div>
    <div class="sub-title">${syl.title || 'Syllabus'}</div>
    <div class="meta">
      <span>Class: <strong>${syl.className || '—'}</strong></span>
      <span>Subject: <strong>${syl.subjectName || '—'}</strong></span>
      <span>Year: <strong>${syl.academicYear || '—'}</strong></span>
      <span>Progress: <strong>${completedCount}/${units.length} units completed</strong></span>
    </div>
    <div style="margin-top:8px;max-width:400px;margin-left:auto;margin-right:auto">
      <div class="progress-bar"><div class="progress-fill" style="width:${units.length ? Math.round((completedCount/units.length)*100) : 0}%"></div></div>
      <div style="font-size:11px;color:#555;text-align:center">${units.length ? Math.round((completedCount/units.length)*100) : 0}% Complete</div>
    </div>
  </div>
  <table>
    <thead>
      <tr><th style="width:50px">Unit</th><th>Title</th><th>Topics</th><th style="width:70px">Hours</th><th style="width:90px">Status</th></tr>
    </thead>
    <tbody>${unitRows}</tbody>
  </table>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    w.document.close();
  };

  const getCompletionPct = (syl) => {
    const units = syl.units || [];
    if (!units.length) return 0;
    return Math.round((units.filter(u => u.completed).length / units.length) * 100);
  };

  /* ── DETAIL VIEW ── */
  if (view === 'detail' && selected) {
    const units = selected.units || [];
    const pct = getCompletionPct(selected);
    const completedCount = units.filter(u => u.completed).length;

    return (
      <div className="page-content fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setView('list')}>
            Back
          </button>
          <ChevronRight size={14} color="#9CA3AF" />
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1B2F6E', margin: 0 }}>{selected.title?.replace(/\s*\[.*?\]/g, '')}</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => toast.success('Feature available in mobile app')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            >
              <Smartphone size={12} /> Export to Mobile App
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => printSyllabus(selected)}>
              <Printer size={13} /> Print
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
              onClick={() => { if (window.confirm('Delete syllabus?')) deleteMutation.mutate(selected.id); }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1B2F6E' }}>{selected.className} — {selected.subjectName || '—'}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Academic Year: {selected.academicYear} &nbsp;|&nbsp; {completedCount}/{units.length} units completed</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: pct === 100 ? '#059669' : '#1B2F6E' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Complete</div>
            </div>
          </div>
          <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#059669' : '#1B2F6E', borderRadius: 5, transition: 'width .4s ease' }} />
          </div>
        </div>

        {/* Units list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {units.map(unit => (
            <div
              key={unit.unitNo}
              className="card"
              style={{ padding: 16, borderLeft: `4px solid ${unit.completed ? '#059669' : '#E5E7EB'}`, transition: 'border-color .2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <button
                  onClick={() => toggleUnitMutation.mutate({ id: selected.id, unitNo: unit.unitNo })}
                  disabled={toggleUnitMutation.isPending}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: unit.completed ? '#059669' : '#fff',
                    border: `2px solid ${unit.completed ? '#059669' : '#D1D5DB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                  title={unit.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {unit.completed && <Check size={14} color="#fff" />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#1B2F6E', padding: '1px 8px', borderRadius: 4 }}>Unit {unit.unitNo}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: unit.completed ? '#059669' : '#1F2937' }}>{unit.title || '(Untitled Unit)'}</span>
                    {unit.estimatedHours ? (
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {unit.estimatedHours}h
                      </span>
                    ) : null}
                  </div>
                  {unit.topics && unit.topics.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(Array.isArray(unit.topics) ? unit.topics : [unit.topics]).map((t, i) => (
                        <span key={i} style={{ fontSize: 11.5, background: '#f8f9fa', border: '1px solid #e5e7eb', padding: '2px 8px', borderRadius: 99, color: '#374151' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, flexShrink: 0,
                  background: unit.completed ? '#D1FAE5' : '#FEF3C7',
                  color: unit.completed ? '#065F46' : '#92400E',
                }}>
                  {unit.completed ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>
          ))}

          {units.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <BookOpen size={40} color="#D1D5DB" style={{ marginBottom: 8 }} />
              <p style={{ color: '#6B7280', fontSize: 14 }}>No units defined for this syllabus</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── CREATE FORM ── */
  if (view === 'create') {
    return (
      <div className="page-content fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setView('list')}>Back</button>
          <ChevronRight size={14} color="#9CA3AF" />
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1B2F6E', margin: 0 }}>Create Syllabus</h2>
        </div>

        <div className="card" style={{ padding: 24, maxWidth: 800 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Class *</label>
              <select className="form-select" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, subjectId: '' }))}>
                <option value="">-- Select Class --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Subject</label>
              <select className="form-select" value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                <option value="">-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Syllabus Title *</label>
              <input className="form-input" placeholder="e.g. Mathematics Syllabus Term 1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Academic Year</label>
              <select className="form-select" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Units */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1B2F6E', margin: 0 }}>Units</h3>
              <button className="btn btn-outline btn-sm" onClick={addUnit}>
                <Plus size={12} /> Add Unit
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.units.map((unit, idx) => (
                <div key={idx} style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, background: '#1B2F6E', color: '#fff', padding: '2px 9px', borderRadius: 4 }}>Unit {idx + 1}</span>
                    {form.units.length > 1 && (
                      <button
                        onClick={() => removeUnit(idx)}
                        style={{ marginLeft: 'auto', background: '#FEE2E2', border: 'none', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', color: '#DC2626' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Unit Title</label>
                      <input className="form-input" style={{ fontSize: 13 }} placeholder="e.g. Introduction to Algebra" value={unit.title} onChange={e => updateUnit(idx, 'title', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Estimated Hours</label>
                      <input className="form-input" style={{ fontSize: 13 }} type="number" min="0" placeholder="e.g. 8" value={unit.estimatedHours} onChange={e => updateUnit(idx, 'estimatedHours', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Topics (one per line)</label>
                    <textarea
                      className="form-input"
                      style={{ fontSize: 13, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
                      placeholder="Variables and expressions&#10;Linear equations&#10;Graphing"
                      value={unit.topics}
                      onChange={e => updateUnit(idx, 'topics', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setView('list')} disabled={createMutation.isPending}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={createMutation.isPending}
              style={{ background: '#1B2F6E', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {createMutation.isPending ? 'Saving...' : 'Save Syllabus'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── LIST VIEW ── */
  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1B2F6E,#0073b7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Syllabus Management</h1>
            <p className="page-subtitle">Manage and track curriculum coverage by class and subject</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => toast.success('Feature available in mobile app')}
            style={{ background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Smartphone size={14} /> Export to Mobile App
          </button>
          <button
            onClick={() => { setForm(emptyForm()); setView('create'); }}
            style={{ background: '#1B2F6E', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Add Syllabus
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 180 }} value={filters.classId} onChange={e => setFilters(f => ({ ...f, classId: e.target.value }))}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 200 }} value={filters.academicYear} onChange={e => setFilters(f => ({ ...f, academicYear: e.target.value }))}>
          <option value="">All Years</option>
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Loading syllabi...</div>
      ) : syllabi.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <BookOpen size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#6B7280' }}>No syllabi found</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Click "Add Syllabus" to create the first one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {syllabi.map(syl => {
            const pct = getCompletionPct(syl);
            const units = syl.units || [];
            const displayTitle = (syl.title || '').replace(/\s*\[.*?\]/g, '');

            return (
              <div key={syl.id} className="card" style={{ padding: 18, cursor: 'pointer', transition: 'box-shadow .2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(27,47,110,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                onClick={() => { setSelected(syl); setView('detail'); }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1B2F6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                      {syl.className || '—'} {syl.subjectName ? `· ${syl.subjectName}` : ''} {syl.academicYear ? `· ${syl.academicYear}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: pct === 100 ? '#D1FAE5' : pct >= 50 ? '#DBEAFE' : '#FEF3C7', color: pct === 100 ? '#065F46' : pct >= 50 ? '#1E3A8A' : '#92400E', flexShrink: 0, marginLeft: 8 }}>
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ height: 7, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#059669' : '#1B2F6E', borderRadius: 4, transition: 'width .4s' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    {units.filter(u => u.completed).length}/{units.length} units done
                  </span>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button
                      style={{ background: '#e0f2fe', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', color: '#0369a1', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => navigate(`/academics/subject-syllabus/${syl.classId || syl.class_id || ''}/all`)}
                      title="Open Syllabus Editor"
                    >
                      <Edit size={11} /> Edit
                    </button>
                    <button
                      style={{ background: '#eff6ff', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', color: '#1B2F6E', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => printSyllabus(syl)}
                    >
                      <Printer size={11} /> Print
                    </button>
                    <button
                      style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer', color: '#DC2626' }}
                      onClick={() => { if (window.confirm('Delete this syllabus?')) deleteMutation.mutate(syl.id); }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
