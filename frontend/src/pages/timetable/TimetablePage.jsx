/**
 * IlmForge — Timetable Page
 * Tab 1: Add Timetable (form with class/section/subject/day/time dropdowns)
 * Tab 2: Manage Timetable (filter + table + weekly grid view + print)
 * Backed by the real /timetable API — previously this page only wrote to
 * localStorage, so timetables entered by one admin were invisible to
 * teachers/students/parents on any other device or portal.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Clock, Plus, Trash2, Edit2, Printer, Calendar, Filter, X, Save } from 'lucide-react';
import api from '../../api/client';

/* ─── Constants ─────────────────────────────────── */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const DAY_COLORS = {
  Sunday:    '#7C3AED',
  Monday:    '#1E3A5F',
  Tuesday:   '#0D9488',
  Wednesday: '#2563EB',
  Thursday:  '#D97706',
  Friday:    '#15803D',
  Saturday:  '#B45309',
};

/* ─── Time formatter ─────────────────────────────── */
function fmtTime(h, m, ampm) {
  return `${h}:${m} ${ampm}`;
}

function parseTime(timeStr) {
  if (!timeStr) return { h: '8', m: '00', ap: 'AM' };
  const parts = timeStr.split(' ');
  const ap = parts[1] || 'AM';
  const hm = (parts[0] || '8:00').split(':');
  return { h: hm[0] || '8', m: hm[1] || '00', ap };
}

/* ─── Empty add-form state ───────────────────────── */
const emptyForm = {
  classId: '', sectionId: '', subjectId: '', teacherId: '',
  day: 'Monday',
  startHour: '8', startMin: '00', startAmpm: 'AM',
  endHour: '9', endMin: '00', endAmpm: 'AM',
};

export default function TimetablePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('add');
  const [form, setForm] = useState(emptyForm);

  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [hasFiltered, setHasFiltered] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/classes/subjects').then(r => r.data.data || []),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-for-timetable'],
    queryFn: () => api.get('/staff').then(r => r.data.data || []),
  });

  const addSelectedClass = classes.find(c => String(c.id) === String(form.classId));
  const addSections = addSelectedClass?.sections || [];
  const manageSelectedClass = classes.find(c => String(c.id) === String(filterClassId));
  const manageSections = manageSelectedClass?.sections || [];

  const { data: timetable = [], isLoading } = useQuery({
    queryKey: ['timetable', filterClassId, filterSectionId],
    queryFn: () => api.get('/timetable', { params: { classId: filterClassId || undefined, sectionId: filterSectionId || undefined } }).then(r => r.data.data || []),
    enabled: hasFiltered && !!filterClassId,
  });

  const className = (id) => classes.find(c => String(c.id) === String(id))?.name || '—';
  const sectionName = (classId, id) => (classes.find(c => String(c.id) === String(classId))?.sections || []).find(s => String(s.id) === String(id))?.name || '';
  const subjectName = (id) => allSubjects.find(s => String(s.id) === String(id))?.name || '—';
  const teacherName = (id) => staff.find(s => String(s.id) === String(id))?.name || '—';

  const invalidate = () => qc.invalidateQueries({ queryKey: ['timetable'] });

  const addMutation = useMutation({
    mutationFn: (data) => api.post('/timetable', data),
    onSuccess: () => { toast.success('Timetable entry added!'); setForm(emptyForm); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not add entry'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/timetable/${id}`, data),
    onSuccess: () => { toast.success('Entry updated!'); setEditId(null); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/timetable/${id}`),
    onSuccess: () => { toast.success('Entry deleted'); invalidate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete entry'),
  });

  const handleAdd = () => {
    if (!form.classId) return toast.error('Please select a class');
    if (!form.sectionId) return toast.error('Please select a section');
    if (!form.subjectId) return toast.error('Please select a subject');
    addMutation.mutate({
      classId: form.classId, sectionId: form.sectionId, subjectId: form.subjectId,
      teacherId: form.teacherId || undefined, day: form.day,
      startTime: fmtTime(form.startHour, form.startMin, form.startAmpm),
      endTime: fmtTime(form.endHour, form.endMin, form.endAmpm),
    });
  };

  const startEdit = (entry) => {
    setEditId(entry.id);
    const st = parseTime(entry.startTime);
    const et = parseTime(entry.endTime);
    setEditForm({
      classId: entry.classId, sectionId: entry.sectionId || '', subjectId: entry.subjectId || '', teacherId: entry.teacherId || '',
      day: entry.day,
      startHour: st.h, startMin: st.m, startAmpm: st.ap,
      endHour: et.h, endMin: et.m, endAmpm: et.ap,
    });
  };

  const saveEdit = () => {
    editMutation.mutate({
      id: editId,
      data: {
        classId: editForm.classId, sectionId: editForm.sectionId || null, subjectId: editForm.subjectId || null, teacherId: editForm.teacherId || null,
        day: editForm.day,
        startTime: fmtTime(editForm.startHour, editForm.startMin, editForm.startAmpm),
        endTime: fmtTime(editForm.endHour, editForm.endMin, editForm.endAmpm),
      },
    });
  };

  const handleFilter = () => {
    if (!filterClassId) return toast.error('Please select a class to filter');
    setHasFiltered(true);
  };

  const handlePrint = () => {
    if (!timetable.length) return toast.error('No data to print');
    const byDay = {};
    DAYS.forEach(d => { byDay[d] = timetable.filter(e => e.day === d); });

    const win = window.open('', '_blank');
    if (!win) { toast.error('Pop-up blocked — please allow pop-ups to print.'); return; }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Timetable</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 12mm; background: #fff; }
    h1 { font-size: 16pt; color: #0F4C45; margin-bottom: 4px; }
    p  { font-size: 10pt; color: #6B7280; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    th { background: #0F766E; color: #fff; padding: 6px 8px; text-align: left; font-weight: 700; border: 1px solid #0F766E; }
    td { padding: 6px 8px; border: 1px solid #D1D5DB; }
    tr:nth-child(even) td { background: #F9FAFB; }
    @media print { @page { size: A4 landscape; margin: 10mm; } }
  </style>
</head>
<body>
  <h1>Class Timetable — ${manageSelectedClass?.name || ''}</h1>
  <p>Printed: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr><th>Day</th><th>Subject</th><th>Start Time</th><th>End Time</th><th>Teacher</th></tr>
    </thead>
    <tbody>
      ${timetable.map(e => `
        <tr>
          <td>${e.day}</td>
          <td><strong>${subjectName(e.subjectId)}</strong></td>
          <td>${e.startTime}</td>
          <td>${e.endTime}</td>
          <td>${e.teacherId ? teacherName(e.teacherId) : '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <script>window.onload=()=>window.print();<\/script>
</body>
</html>`);
    win.document.close();
  };

  const byDay = DAYS.reduce((acc, d) => { acc[d] = timetable.filter(e => e.day === d); return acc; }, {});

  return (
    <div className="page-content fade-up">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={22} color="#0D9488"/> Time Table
          </h1>
          <p className="page-subtitle">Manage class schedules and weekly timetable</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ key: 'add', label: 'Add Timetable' }, { key: 'manage', label: 'Manage Timetable' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.key ? '#0D9488' : 'transparent', color: activeTab === tab.key ? '#fff' : '#64748B', transition: 'all 0.18s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'add' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
            <Calendar size={16} color="#0D9488"/>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F' }}>Add New Timetable Entry</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Class *</label>
            <select className="form-select" value={form.classId}
              onChange={e => setForm({ ...form, classId: e.target.value, sectionId: '' })}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Section *</label>
            <select className="form-select" value={form.sectionId}
              onChange={e => setForm({ ...form, sectionId: e.target.value })} disabled={!form.classId}>
              <option value="">{form.classId ? 'Select Section' : 'Select a class first'}</option>
              {addSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject *</label>
            <select className="form-select" value={form.subjectId}
              onChange={e => setForm({ ...form, subjectId: e.target.value })} disabled={!form.sectionId}>
              <option value="">{form.sectionId ? 'Select Subject' : 'Select a section first'}</option>
              {allSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Day *</label>
            <select className="form-select" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Starting Time *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-select" value={form.startHour} onChange={e => setForm({ ...form, startHour: e.target.value })} style={{ flex: 1 }}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select className="form-select" value={form.startMin} onChange={e => setForm({ ...form, startMin: e.target.value })} style={{ flex: 1 }}>
                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="form-select" value={form.startAmpm} onChange={e => setForm({ ...form, startAmpm: e.target.value })} style={{ flex: 1 }}>
                <option>AM</option><option>PM</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ending Time *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-select" value={form.endHour} onChange={e => setForm({ ...form, endHour: e.target.value })} style={{ flex: 1 }}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select className="form-select" value={form.endMin} onChange={e => setForm({ ...form, endMin: e.target.value })} style={{ flex: 1 }}>
                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="form-select" value={form.endAmpm} onChange={e => setForm({ ...form, endAmpm: e.target.value })} style={{ flex: 1 }}>
                <option>AM</option><option>PM</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Teacher <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
            <select className="form-select" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">No teacher assigned</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <button className="btn btn-teal" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14, fontWeight: 700, marginTop: 4 }}
            onClick={handleAdd} disabled={addMutation.isPending}>
            <Plus size={16}/> {addMutation.isPending ? 'Adding…' : 'Add Timetable'}
          </button>
        </div>
      )}

      {activeTab === 'manage' && (
        <div>
          <div className="card" style={{ marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Class</label>
                <select className="form-select" value={filterClassId}
                  onChange={e => { setFilterClassId(e.target.value); setFilterSectionId(''); setHasFiltered(false); }}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Section</label>
                <select className="form-select" value={filterSectionId}
                  onChange={e => { setFilterSectionId(e.target.value); setHasFiltered(false); }} disabled={!filterClassId}>
                  <option value="">{filterClassId ? 'All Sections' : 'Select Class First'}</option>
                  {manageSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={handleFilter}
                style={{ padding: '9px 22px', borderRadius: 50, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, height: 38, whiteSpace: 'nowrap' }}>
                <Filter size={14}/> Filter Data
              </button>
            </div>
          </div>

          {!hasFiltered ? (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '52px 24px', color: '#94A3B8' }}>
                <Calendar size={48} style={{ opacity: 0.18, marginBottom: 12 }}/>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>Select a class and click Filter Data to view the timetable</div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="loading-center"><div className="spinner"/></div>
          ) : timetable.length === 0 ? (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94A3B8' }}>
                <Calendar size={44} style={{ opacity: 0.18, marginBottom: 10 }}/>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>No timetable entries found</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Try a different class or section, or add entries in the Add Timetable tab</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#374151' }}>
                  <strong style={{ color: '#0D9488' }}>{timetable.length}</strong> entr{timetable.length === 1 ? 'y' : 'ies'} found
                  <span style={{ color: '#6B7280', marginLeft: 8 }}>
                    &middot; {manageSelectedClass?.name}
                    {filterSectionId ? ` — ${sectionName(filterClassId, filterSectionId)}` : ''}
                  </span>
                </div>
                <button className="btn btn-outline btn-sm" onClick={handlePrint}>
                  <Printer size={13}/> Print Timetable
                </button>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Day</th><th>Subject</th><th>Start Time</th><th>End Time</th><th>Teacher</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {timetable.map(entry => (
                        editId === entry.id ? (
                          <tr key={entry.id} style={{ background: '#F0FDF9' }}>
                            <td>
                              <select className="form-select" style={{ minWidth: 110 }} value={editForm.day} onChange={e => setEditForm({ ...editForm, day: e.target.value })}>
                                {DAYS.map(d => <option key={d}>{d}</option>)}
                              </select>
                            </td>
                            <td>
                              <select className="form-select" style={{ minWidth: 130 }} value={editForm.subjectId} onChange={e => setEditForm({ ...editForm, subjectId: e.target.value })}>
                                <option value="">Select Subject</option>
                                {allSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <select className="form-select" style={{ width: 56 }} value={editForm.startHour} onChange={e => setEditForm({ ...editForm, startHour: e.target.value })}>{HOURS.map(h => <option key={h}>{h}</option>)}</select>
                                <select className="form-select" style={{ width: 56 }} value={editForm.startMin} onChange={e => setEditForm({ ...editForm, startMin: e.target.value })}>{MINUTES.map(m => <option key={m}>{m}</option>)}</select>
                                <select className="form-select" style={{ width: 58 }} value={editForm.startAmpm} onChange={e => setEditForm({ ...editForm, startAmpm: e.target.value })}><option>AM</option><option>PM</option></select>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <select className="form-select" style={{ width: 56 }} value={editForm.endHour} onChange={e => setEditForm({ ...editForm, endHour: e.target.value })}>{HOURS.map(h => <option key={h}>{h}</option>)}</select>
                                <select className="form-select" style={{ width: 56 }} value={editForm.endMin} onChange={e => setEditForm({ ...editForm, endMin: e.target.value })}>{MINUTES.map(m => <option key={m}>{m}</option>)}</select>
                                <select className="form-select" style={{ width: 58 }} value={editForm.endAmpm} onChange={e => setEditForm({ ...editForm, endAmpm: e.target.value })}><option>AM</option><option>PM</option></select>
                              </div>
                            </td>
                            <td>
                              <select className="form-select" style={{ minWidth: 120 }} value={editForm.teacherId} onChange={e => setEditForm({ ...editForm, teacherId: e.target.value })}>
                                <option value="">No teacher</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-teal" style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={saveEdit} disabled={editMutation.isPending}>
                                  <Save size={12}/> Save
                                </button>
                                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setEditId(null)}>
                                  <X size={12}/> Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={entry.id}>
                            <td>
                              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 50, background: (DAY_COLORS[entry.day] || '#1E3A5F') + '18', color: DAY_COLORS[entry.day] || '#1E3A5F', fontSize: 11.5, fontWeight: 700 }}>
                                {entry.day}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{subjectName(entry.subjectId)}</td>
                            <td style={{ color: '#0D9488', fontWeight: 600 }}>{entry.startTime}</td>
                            <td style={{ color: '#0D9488', fontWeight: 600 }}>{entry.endTime}</td>
                            <td style={{ color: '#374151' }}>{entry.teacherId ? teacherName(entry.teacherId) : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button title="Edit" onClick={() => startEdit(entry)}
                                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                  <Edit2 size={12}/> Edit
                                </button>
                                <button title="Delete" onClick={() => deleteMutation.mutate(entry.id)}
                                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FCA5A5', background: '#FFF5F5', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                  <Trash2 size={12}/> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} color="#0D9488"/>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Weekly Timetable Grid</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 24 }}>
                {DAYS.map(day => {
                  const periods = byDay[day] || [];
                  const color = DAY_COLORS[day] || '#1E3A5F';
                  return (
                    <div key={day} style={{ border: `1.5px solid ${color}30`, borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ background: color, color: '#fff', fontWeight: 700, fontSize: 12, padding: '7px 10px', textAlign: 'center', letterSpacing: 0.3 }}>{day}</div>
                      <div style={{ padding: '8px 8px', minHeight: 60 }}>
                        {periods.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 11, paddingTop: 10, fontStyle: 'italic' }}>Free</div>
                        ) : periods.map((p, i) => (
                          <div key={p.id} style={{ background: color + '12', border: `1px solid ${color}30`, borderRadius: 6, padding: '5px 7px', marginBottom: i < periods.length - 1 ? 6 : 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 11, color, lineHeight: 1.3 }}>{subjectName(p.subjectId)}</div>
                            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{p.startTime} – {p.endTime}</div>
                            {p.teacherId && <div style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 1 }}>{teacherName(p.teacherId)}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                <button style={{ padding: '10px 32px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#0D9488', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }} onClick={handlePrint}>
                  <Printer size={15}/> Print Timetable
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
