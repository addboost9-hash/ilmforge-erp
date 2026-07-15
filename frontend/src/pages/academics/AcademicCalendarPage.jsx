import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

const NAVY = '#1B2F6E';
const LIGHT_BG = '#f0f4ff';
const cardStyle = { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(27,47,110,0.08)', marginBottom: 20 };
const btnStyle = (color = NAVY) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
const labelStyle = { fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4, display: 'block' };

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS = {
  holiday:  '#ef4444',
  exam:     '#3b82f6',
  event:    '#22c55e',
  meeting:  '#f97316',
  sports:   '#8b5cf6',
  cultural: '#ec4899',
  academic: '#06b6d4',
  general:  '#22c55e',
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function AcademicCalendarPage() {
  const qc = useQueryClient();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMode, setViewMode] = useState('calendar');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('event');
  const [form, setForm] = useState({ title: '', type: 'general', date: '', endDate: '', description: '', eventType: 'holiday', color: '#E24B4A' });

  const from = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const lastDay = getDaysInMonth(viewYear, viewMonth);
  const to = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', viewYear, viewMonth],
    queryFn: () => api.get('/calendar/events', { params: { from, to } }).then(r => r.data.data || []),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => modalType === 'event' ? api.post('/calendar/events', data) : api.post('/calendar/holidays', data),
    onSuccess: () => {
      qc.invalidateQueries(['calendar-events']);
      toast.success('Added!');
      setShowModal(false);
      setForm({ title: '', type: 'general', date: '', endDate: '', description: '', eventType: 'holiday', color: '#E24B4A' });
    },
    onError: () => toast.error('Failed to add'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, source }) => source === 'holiday' ? api.delete(`/calendar/holidays/${id}`) : api.delete(`/calendar/events/${id}`),
    onSuccess: () => { qc.invalidateQueries(['calendar-events']); toast.success('Deleted!'); },
    onError: () => toast.error('Failed to delete'),
  });

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const d = new Date(e.date);
      const key = d.getDate();
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleSubmit = () => {
    if (!form.title) return toast.error('Title required');
    if (modalType === 'event') {
      if (!form.date) return toast.error('Date required');
      createEventMutation.mutate({ title: form.title, type: form.type, date: form.date, endDate: form.endDate || undefined, description: form.description });
    } else {
      if (!form.date) return toast.error('Start date required');
      createEventMutation.mutate({ title: form.title, eventType: form.eventType, startDate: form.date, endDate: form.endDate || undefined, color: form.color });
    }
  };

  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>Academic Calendar</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Manage holidays, exams, and school events</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle(viewMode === 'calendar' ? NAVY : '#6b7280')} onClick={() => setViewMode('calendar')}>Calendar View</button>
            <button style={btnStyle(viewMode === 'list' ? NAVY : '#6b7280')} onClick={() => setViewMode('list')}>List View</button>
            <button style={btnStyle('#22c55e')} onClick={() => { setModalType('event'); setShowModal(true); }}>+ Add Event</button>
            <button style={btnStyle('#ef4444')} onClick={() => { setModalType('holiday'); setShowModal(true); }}>+ Add Holiday</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[{ label: 'Holiday', color: '#ef4444' }, { label: 'Exam', color: '#3b82f6' }, { label: 'Event', color: '#22c55e' }, { label: 'Meeting', color: '#f97316' }, { label: 'Sports', color: '#8b5cf6' }].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: color, display: 'inline-block' }} />
              <span style={{ color: '#374151' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <button style={{ ...btnStyle('#6b7280'), padding: '6px 14px' }} onClick={prevMonth}>◀</button>
          <h2 style={{ margin: 0, color: NAVY, fontSize: 20, fontWeight: 700, minWidth: 220, textAlign: 'center' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          <button style={{ ...btnStyle('#6b7280'), padding: '6px 14px' }} onClick={nextMonth}>▶</button>
          <button style={{ ...btnStyle(), padding: '6px 14px', fontSize: 12 }} onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}>Today</button>
        </div>

        {viewMode === 'calendar' && (
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: NAVY }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>{d}</div>
              ))}
            </div>
            {/* Calendar cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {calendarCells.map((day, idx) => {
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const dayEvents = day ? (eventsByDay[day] || []) : [];
                return (
                  <div key={idx} style={{
                    minHeight: 90, borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb',
                    padding: '6px 4px', background: isToday ? '#eff6ff' : '#fff',
                    opacity: day ? 1 : 0,
                  }}>
                    {day && (
                      <>
                        <div style={{ fontWeight: isToday ? 800 : 600, color: isToday ? NAVY : '#374151', fontSize: 13, marginBottom: 4 }}>
                          {isToday ? <span style={{ background: NAVY, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{day}</span> : day}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {dayEvents.slice(0, 3).map(e => (
                            <div key={e.id} style={{ background: e.color || TYPE_COLORS[e.type] || '#6b7280', color: '#fff', borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.title}>
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && <div style={{ fontSize: 10, color: '#6b7280', paddingLeft: 4 }}>+{dayEvents.length - 3} more</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          <div style={cardStyle}>
            {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : events.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No events for {MONTH_NAMES[viewMonth]} {viewYear}</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: NAVY, color: '#fff' }}>
                    {['Title', 'Date', 'End Date', 'Type', 'Source', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: e.color || TYPE_COLORS[e.type] || '#6b7280', marginRight: 6 }} />
                        {e.title}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{e.date ? new Date(e.date).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '10px 12px' }}>{e.endDate ? new Date(e.endDate).toLocaleDateString() : '-'}</td>
                      <td style={{ padding: '10px 12px' }}><span style={{ background: '#f3f4f6', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{e.type}</span></td>
                      <td style={{ padding: '10px 12px' }}><span style={{ background: e.source === 'holiday' ? '#fee2e2' : '#dcfce7', color: e.source === 'holiday' ? '#b91c1c' : '#166534', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{e.source}</span></td>
                      <td style={{ padding: '10px 12px' }}>
                        <button style={{ ...btnStyle('#ef4444'), padding: '4px 10px', fontSize: 12 }} onClick={() => { if (confirm('Delete?')) deleteMutation.mutate({ id: e.rawId, source: e.source }); }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: NAVY }}>{modalType === 'event' ? 'Add Event' : 'Add Holiday'}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button style={btnStyle(modalType === 'event' ? NAVY : '#6b7280')} onClick={() => setModalType('event')}>Event</button>
                  <button style={btnStyle(modalType === 'holiday' ? '#ef4444' : '#6b7280')} onClick={() => setModalType('holiday')}>Holiday</button>
                  <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowModal(false)}>✕</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{modalType === 'event' ? 'Date *' : 'Start Date *'}</label>
                    <input style={inputStyle} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Date</label>
                    <input style={inputStyle} type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                {modalType === 'event' ? (
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {['general', 'exam', 'meeting', 'sports', 'cultural', 'academic', 'holiday'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Holiday Type</label>
                      <select style={inputStyle} value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}>
                        {['holiday', 'event', 'exam', 'meeting'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Color</label>
                      <input style={inputStyle} type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                    </div>
                  </div>
                )}
                {modalType === 'event' && (
                  <div>
                    <label style={labelStyle}>Description</label>
                    <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button style={btnStyle('#6b7280')} onClick={() => setShowModal(false)}>Cancel</button>
                <button style={btnStyle(modalType === 'holiday' ? '#ef4444' : NAVY)} onClick={handleSubmit} disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
