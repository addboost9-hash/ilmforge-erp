import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import {
  ArrowLeft, Plus, Printer, Edit2, Trash2, Clock, CalendarDays,
  MapPin, BookOpen, ChevronDown, AlertCircle, Save, X, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

const emptyForm = {
  subjectName: '',
  date: '',
  startTime: '',
  endTime: '',
  room: '',
};

function TimetableForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.subjectName || !form.date || !form.startTime || !form.endTime) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#F0FDF9', border: '1px solid #0D9488', borderRadius: 10,
      padding: 18, marginBottom: 16
    }}>
      <div style={{ fontWeight: 700, color: '#0D9488', fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        {initial?.id ? <Edit2 size={14} /> : <Plus size={14} />}
        {initial?.id ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
            Subject Name <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. Mathematics"
            value={form.subjectName}
            onChange={e => set('subjectName', e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
            Date <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="date"
            className="form-input"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
            Start Time <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="time"
            className="form-input"
            value={form.startTime}
            onChange={e => set('startTime', e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
            End Time <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="time"
            className="form-input"
            value={form.endTime}
            onChange={e => set('endTime', e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Room / Hall</label>
          <input
            className="form-input"
            placeholder="e.g. Hall A, Room 12"
            value={form.room}
            onChange={e => set('room', e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="submit" className="btn btn-teal btn-sm" disabled={loading}>
          <Save size={14} /> {loading ? 'Saving…' : 'Save Entry'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  );
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const disp = hour % 12 || 12;
  return `${disp}:${m} ${ampm}`;
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ExamTimetablePage() {
  const queryClient = useQueryClient();
  const [examId, setExamId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data),
  });

  const selectedExam = exams.find(e => String(e.id) === String(examId));

  const { data: timetable = [], isLoading } = useQuery({
    queryKey: ['timetable', examId],
    queryFn: () => api.get(`/exams/timetable?examId=${examId}`).then(r => r.data.data),
    enabled: !!examId,
  });

  const addMutation = useMutation({
    mutationFn: form => api.post('/exams/timetable', { ...form, examId: parseInt(examId) }),
    onSuccess: () => { queryClient.invalidateQueries(['timetable', examId]); setShowForm(false); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, form }) => api.put(`/exams/timetable/${id}`, form),
    onSuccess: () => { queryClient.invalidateQueries(['timetable', examId]); setEditEntry(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/exams/timetable/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['timetable', examId]); setDeleteConfirm(null); },
  });

  const handlePrint = () => window.print();

  // Group by date for better display
  const grouped = timetable.reduce((acc, entry) => {
    const key = entry.date || 'No Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="page-content fade-in">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body { background: #fff; }
          .card { box-shadow: none !important; border: 1px solid #E2E8F0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/exams" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15} /></Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Exam Timetable</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Schedule exam dates, times, and venues</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {timetable.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>
              <Printer size={14} /> Print Timetable
            </button>
          )}
          {examId && !showForm && !editEntry && (
            <button className="btn btn-teal btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add Entry
            </button>
          )}
        </div>
      </div>

      {/* Exam Selector */}
      <div className="card no-print" style={{ padding: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Select Exam
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <select className="form-select" value={examId} onChange={e => { setExamId(e.target.value); setShowForm(false); setEditEntry(null); }}>
              <option value="">— Choose an exam —</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title}
                  {e.className ? ` — ${e.className}` : ''}
                  {e.type ? ` (${e.type})` : ''}
                  {e.startDate ? ` | ${new Date(e.startDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
          </div>
          {selectedExam && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedExam.type && (
                <span style={{ fontSize: 11, background: '#DBEAFE', color: '#1D4ED8', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                  {selectedExam.type}
                </span>
              )}
              {selectedExam.className && (
                <span style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                  {selectedExam.className}
                </span>
              )}
              {(selectedExam.startDate || selectedExam.endDate) && (
                <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '4px 10px', borderRadius: 20 }}>
                  <CalendarDays size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {selectedExam.startDate ? new Date(selectedExam.startDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }) : ''}
                  {selectedExam.endDate ? ` — ${new Date(selectedExam.endDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}` : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      {examId && (
        <div className="no-print" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 8, marginBottom: 16
        }}>
          <Info size={15} color="#A16207" />
          <span style={{ fontSize: 12, color: '#A16207', fontWeight: 500 }}>
            This timetable appears on student admit cards. Ensure dates and times are accurate before issuing cards.
          </span>
        </div>
      )}

      {/* No exam selected */}
      {!examId && (
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>
          <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 16, marginBottom: 6 }}>Select an Exam</div>
          <div style={{ color: '#64748B', fontSize: 13 }}>Choose an exam from the dropdown above to manage its timetable.</div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && !editEntry && (
        <div className="no-print">
          <TimetableForm
            onSave={form => addMutation.mutate(form)}
            onCancel={() => setShowForm(false)}
            loading={addMutation.isPending}
          />
        </div>
      )}
      {editEntry && (
        <div className="no-print">
          <TimetableForm
            initial={editEntry}
            onSave={form => editMutation.mutate({ id: editEntry.id, form })}
            onCancel={() => setEditEntry(null)}
            loading={editMutation.isPending}
          />
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="no-print" style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
          padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12
        }}>
          <AlertCircle size={18} color="#EF4444" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#B91C1C', fontSize: 13 }}>Delete this entry?</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              <strong>{deleteConfirm.subjectName}</strong> on {formatDate(deleteConfirm.date)} — this cannot be undone.
            </div>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: '#EF4444', color: '#fff', border: 'none' }}
            onClick={() => deleteMutation.mutate(deleteConfirm.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && examId && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {/* Empty state (exam selected but no entries) */}
      {!isLoading && examId && timetable.length === 0 && !showForm && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 16, marginBottom: 6 }}>No Timetable Entries</div>
          <div style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
            No schedule has been added for this exam yet.
          </div>
          <button className="btn btn-teal btn-sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add First Entry
          </button>
        </div>
      )}

      {/* Timetable — grouped by date */}
      {!isLoading && timetable.length > 0 && (
        <div className="print-area">
          {/* Print header */}
          <div style={{ display: 'none' }} className="print-only">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1E3A5F' }}>Exam Timetable</div>
              {selectedExam && (
                <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                  {selectedExam.title} {selectedExam.className ? `— ${selectedExam.className}` : ''}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CalendarDays size={16} color="#0D9488" />
            <span style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 14 }}>
              Schedule — {timetable.length} {timetable.length === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={13} /> Day / Date
                      </div>
                    </th>
                    <th style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BookOpen size={13} /> Subject
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} /> Start Time
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} /> End Time
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={13} /> Room / Hall
                      </div>
                    </th>
                    <th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.map(date => {
                    const entries = grouped[date];
                    return entries.map((entry, entryIdx) => {
                      const dateStr = formatDate(date);
                      return (
                        <tr key={entry.id}>
                          {entryIdx === 0 ? (
                            <td rowSpan={entries.length} style={{
                              verticalAlign: 'top', borderRight: '2px solid #E2E8F0',
                              background: '#F8FAFC'
                            }}>
                              <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 13 }}>
                                {new Date(date).toLocaleDateString('en-PK', { weekday: 'long' })}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                {new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            </td>
                          ) : null}
                          <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{entry.subjectName}</td>
                          <td>
                            <span style={{
                              background: '#ECFDF5', color: '#0D9488',
                              padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600
                            }}>
                              {formatTime(entry.startTime)}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              background: '#EFF6FF', color: '#1D4ED8',
                              padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600
                            }}>
                              {formatTime(entry.endTime)}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: '#64748B' }}>
                            {entry.room
                              ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} color="#94a3b8" />{entry.room}</span>
                              : <span style={{ color: '#CBD5E1' }}>—</span>
                            }
                          </td>
                          <td className="no-print">
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-outline btn-sm btn-icon"
                                title="Edit"
                                onClick={() => { setEditEntry(entry); setShowForm(false); }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="btn btn-sm btn-icon"
                                style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
                                title="Delete"
                                onClick={() => setDeleteConfirm(entry)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print footer */}
          <div style={{
            marginTop: 24, padding: '12px 16px',
            background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Info size={14} color="#0D9488" />
            <span style={{ fontSize: 12, color: '#64748B' }}>
              This timetable is used on student admit cards. Total: {timetable.length} paper{timetable.length !== 1 ? 's' : ''} scheduled.
            </span>
            {!showForm && !editEntry && (
              <button className="btn btn-outline btn-sm no-print" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}>
                <Plus size={13} /> Add Entry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
