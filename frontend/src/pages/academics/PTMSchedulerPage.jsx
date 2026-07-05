import { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';

/* ────────────────────────────────────────────────────────────
   Utilities
──────────────────────────────────────────────────────────── */
const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ap}`;
};

const statusBadge = (s) => {
  const map = { upcoming: 'badge-info', active: 'badge-success', completed: 'badge-secondary', cancelled: 'badge-danger' };
  return <span className={`badge ${map[s] || 'badge-secondary'}`}>{s}</span>;
};

/* ────────────────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────────────────── */

/* Close button for modals */
function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>
      &times;
    </button>
  );
}

/* ── Create PTM Modal ── */
function CreatePTMModal({ onClose, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    title: '',
    date: '',
    startTime: '08:00',
    endTime: '13:00',
    venue: '',
    slotDurationMinutes: 10,
    classIds: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/classes').then((r) => setClasses(r.data.data || [])).catch(() => {});
  }, []);

  const toggleClass = (id) => {
    setForm((f) => ({
      ...f,
      classIds: f.classIds.includes(id) ? f.classIds.filter((c) => c !== id) : [...f.classIds, id],
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.startTime || !form.endTime) {
      setError('Title, date, start time and end time are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/ptm/create', form);
      onCreated(res.data.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create PTM event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Create PTM Event</span>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-control" placeholder="e.g. Term 1 PTM" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-control" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input type="time" className="form-control" value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input type="time" className="form-control" value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input className="form-control" placeholder="School Hall, Room 4..." value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Slot Duration (minutes)</label>
              <select className="form-select" value={form.slotDurationMinutes}
                onChange={(e) => setForm({ ...form, slotDurationMinutes: parseInt(e.target.value, 10) })}>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Select Classes (leave empty for school-wide)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {classes.map((cls) => (
                <button key={cls.id} type="button"
                  className={`btn btn-sm ${form.classIds.includes(cls.id) ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => toggleClass(cls.id)}>
                  {cls.name}
                </button>
              ))}
              {classes.length === 0 && <span className="text-muted">No classes found</span>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create PTM Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Book Slot Modal (parent) ── */
function BookSlotModal({ slot, eventId, onClose, onBooked }) {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students').then((r) => setStudents(r.data.data || [])).catch(() => {});
  }, []);

  const handleBook = async () => {
    if (!studentId) { setError('Please select a student.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/ptm/events/${eventId}/book`, { slotId: slot.id, studentId: parseInt(studentId, 10), notes });
      onBooked();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Book Slot — {fmtTime(slot.time)}</span>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Select Student *</label>
            <select className="form-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">-- Choose student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.rollNo || 'N/A'})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special message to the teacher..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleBook} disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   TAB 1 — Upcoming PTMs (Admin view)
──────────────────────────────────────────────────────────── */
function UpcomingPTMsTab({ role }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/ptm/events')
      .then((r) => setEvents(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAdmin = ['admin', 'super_admin'].includes(role);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-content fade-up">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="page-title">PTM Events</div>
          <div className="page-subtitle">All scheduled parent-teacher meetings</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create PTM
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid-4 mb-5">
        {[
          { label: 'Total Events', value: events.length, color: 'stat-blue' },
          { label: 'Upcoming', value: events.filter((e) => e.status === 'upcoming').length, color: 'stat-cyan' },
          { label: 'Completed', value: events.filter((e) => e.status === 'completed').length, color: 'stat-green' },
          { label: 'Total Bookings', value: events.reduce((s, e) => s + (e.bookedSlots || 0), 0), color: 'stat-purple' },
        ].map((k) => (
          <div key={k.label} className={`stat-card ${k.color}`}>
            <div className="stat-card-body">
              <div className="stat-card-content">
                <div className="stat-card-value">{k.value}</div>
                <div className="stat-card-label">{k.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Event cards */}
      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">No PTM events scheduled</div>
          <div className="empty-state-sub">{isAdmin ? 'Click "Create PTM" to schedule a meeting.' : 'No meetings have been scheduled yet.'}</div>
        </div>
      ) : (
        <div className="grid-3">
          {events.map((ev) => {
            const pct = ev.totalSlots > 0 ? Math.round((ev.bookedSlots / ev.totalSlots) * 100) : 0;
            return (
              <div key={ev.id} className="card card-lift">
                <div className="card-header">
                  <div>
                    <div className="card-title" style={{ marginBottom: 4 }}>{ev.title}</div>
                    <div className="flex items-center gap-2">
                      {statusBadge(ev.status)}
                      {ev.classIds?.length > 0 && (
                        <span className="badge badge-primary">{ev.classIds.length} Classes</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
                  <div className="info-row">
                    <span className="info-label">Date</span>
                    <span className="info-value">{fmt(ev.date)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Time</span>
                    <span className="info-value">{fmtTime(ev.startTime)} — {fmtTime(ev.endTime)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Venue</span>
                    <span className="info-value">{ev.venue || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Slot Duration</span>
                    <span className="info-value">{ev.slotDurationMinutes} min</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bookings</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{ev.bookedSlots}/{ev.totalSlots}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreatePTMModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   TAB 2 — Slot Management (Admin / Teacher)
──────────────────────────────────────────────────────────── */
function SlotManagementTab({ role }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [slots, setSlots] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [evLoading, setEvLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/ptm/events').then((r) => {
      const d = r.data.data || [];
      setEvents(d);
      if (d.length > 0) setSelectedEventId(String(d[0].id));
    }).catch(() => {}).finally(() => setEvLoading(false));
  }, []);

  const loadSlots = useCallback((evId) => {
    if (!evId) return;
    setLoading(true);
    api.get(`/ptm/events/${evId}/slots`)
      .then((r) => setSlots(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSlots(selectedEventId); }, [selectedEventId, loadSlots]);

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(bookingId);
    try {
      await api.delete(`/ptm/bookings/${bookingId}`);
      setMsg('Booking cancelled.');
      loadSlots(selectedEventId);
    } catch {
      setMsg('Failed to cancel booking.');
    } finally {
      setCancelling(null);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleSendSMS = () => {
    alert('SMS feature: This would integrate with your SMS gateway to notify all booked parents of their slot times.');
  };

  const handlePrint = () => { window.print(); };

  /* Unique class IDs in current event slots */
  const classIds = [...new Set(slots.map((s) => s.classId).filter(Boolean))];

  const filteredSlots = classFilter
    ? slots.filter((s) => String(s.classId) === classFilter)
    : slots;

  const selectedEvent = events.find((e) => String(e.id) === selectedEventId);

  if (evLoading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-content fade-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="page-title">Slot Management</div>
          <div className="page-subtitle">View and manage PTM time slots</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-warning" onClick={handleSendSMS}>
            Send SMS to Parents
          </button>
          <button className="btn btn-secondary no-print" onClick={handlePrint}>
            Print Schedule
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-info mb-4">{msg}</div>}

      {/* Filters */}
      <div className="card mb-5">
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select PTM Event</label>
              <select className="form-select" value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}>
                <option value="">-- Select event --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title} ({fmt(ev.date)})</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Filter by Class</label>
              <select className="form-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">All Classes</option>
                {classIds.map((cid) => (
                  <option key={cid} value={cid}>Class ID {cid}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="alert alert-teal mb-4" style={{ fontSize: 13 }}>
          <strong>{selectedEvent.title}</strong> — {fmt(selectedEvent.date)} &nbsp;|&nbsp;
          {fmtTime(selectedEvent.startTime)} to {fmtTime(selectedEvent.endTime)} &nbsp;|&nbsp;
          {selectedEvent.venue || 'Venue TBD'} &nbsp;|&nbsp;
          {selectedEvent.slotDurationMinutes} min/slot
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filteredSlots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗓️</div>
          <div className="empty-state-text">No slots found</div>
          <div className="empty-state-sub">Select an event or adjust the class filter.</div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3>Time Slots ({filteredSlots.length})</h3>
            <div>
              <span className="badge badge-success" style={{ marginRight: 8 }}>
                {filteredSlots.filter((s) => s.isBooked).length} Booked
              </span>
              <span className="badge badge-secondary">
                {filteredSlots.filter((s) => !s.isBooked).length} Available
              </span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th>Student / Booking</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map((slot) => {
                  const booking = slot.bookings?.[0];
                  return (
                    <tr key={slot.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{fmtTime(slot.time)}</td>
                      <td>{slot.classId ? `Class #${slot.classId}` : <span className="text-muted">—</span>}</td>
                      <td>{slot.teacherId ? `Teacher #${slot.teacherId}` : <span className="text-muted">—</span>}</td>
                      <td>
                        {slot.isBooked
                          ? <span className="badge badge-success">Booked</span>
                          : <span className="badge badge-secondary">Available</span>}
                      </td>
                      <td>
                        {booking ? (
                          <span>Student #{booking.studentId}
                            {booking.notes && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> · {booking.notes}</span>}
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {booking && (
                          <button className="btn btn-sm btn-danger"
                            disabled={cancelling === booking.id}
                            onClick={() => cancelBooking(booking.id)}>
                            {cancelling === booking.id ? '...' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   TAB 3 — My Bookings (Parent view)
──────────────────────────────────────────────────────────── */
function MyBookingsTab({ role }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [evLoading, setEvLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookModal, setBookModal] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/ptm/events?status=upcoming')
      .then((r) => {
        const d = r.data.data || [];
        setEvents(d);
        if (d.length > 0) setSelectedEventId(String(d[0].id));
      })
      .catch(() => {})
      .finally(() => setEvLoading(false));
  }, []);

  const loadSlots = useCallback((evId) => {
    if (!evId) return;
    setSlotsLoading(true);
    Promise.all([
      api.get(`/ptm/events/${evId}/slots`),
      api.get(`/ptm/events/${evId}/bookings`),
    ]).then(([sr, br]) => {
      setSlots(sr.data.data || []);
      setMyBookings(br.data.data || []);
    }).catch(() => {}).finally(() => setSlotsLoading(false));
  }, []);

  useEffect(() => { loadSlots(selectedEventId); }, [selectedEventId, loadSlots]);

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel your booking for this slot?')) return;
    setCancelling(bookingId);
    try {
      await api.delete(`/ptm/bookings/${bookingId}`);
      setMsg('Your booking has been cancelled.');
      loadSlots(selectedEventId);
    } catch {
      setMsg('Could not cancel booking. Please try again.');
    } finally {
      setCancelling(null);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const selectedEvent = events.find((e) => String(e.id) === selectedEventId);

  const getBookingForSlot = (slotId) => myBookings.find((b) => b.slotId === slotId);

  if (evLoading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-content fade-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="page-title">My PTM Bookings</div>
          <div className="page-subtitle">View available slots and manage your bookings</div>
        </div>
      </div>

      {msg && <div className="alert alert-info mb-4">{msg}</div>}

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📆</div>
          <div className="empty-state-text">No upcoming PTM events</div>
          <div className="empty-state-sub">Check back later for scheduled parent-teacher meetings.</div>
        </div>
      ) : (
        <>
          {/* Event selector */}
          <div className="card mb-5">
            <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0, maxWidth: 400 }}>
                <label className="form-label">Select PTM Event</label>
                <select className="form-select" value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title} — {fmt(ev.date)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedEvent && (
            <div className="alert alert-teal mb-4" style={{ fontSize: 13 }}>
              <div>
                <strong>{selectedEvent.title}</strong>
                <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>
                  {fmt(selectedEvent.date)} &nbsp;|&nbsp; {fmtTime(selectedEvent.startTime)} – {fmtTime(selectedEvent.endTime)}
                  {selectedEvent.venue && <> &nbsp;|&nbsp; {selectedEvent.venue}</>}
                </span>
              </div>
            </div>
          )}

          {slotsLoading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : slots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🕐</div>
              <div className="empty-state-text">No time slots available</div>
            </div>
          ) : (
            <>
              {/* My confirmed booking highlight */}
              {myBookings.length > 0 && (
                <div className="card mb-5" style={{ borderLeft: '4px solid var(--stat-green)' }}>
                  <div className="card-header" style={{ background: '#f0fff4' }}>
                    <h3 style={{ color: 'var(--stat-green)' }}>Your Confirmed Booking(s)</h3>
                  </div>
                  <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
                    {myBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between"
                        style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
                            {fmtTime(b.slot?.time)}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>
                            Student #{b.studentId}
                            {selectedEvent?.venue && <> — {selectedEvent.venue}</>}
                            {b.notes && <> · {b.notes}</>}
                          </span>
                        </div>
                        <button className="btn btn-sm btn-danger"
                          disabled={cancelling === b.id}
                          onClick={() => cancelBooking(b.id)}>
                          {cancelling === b.id ? '...' : 'Cancel'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slot grid */}
              <div className="card">
                <div className="card-header">
                  <h3>Available Time Slots</h3>
                  <div>
                    <span className="badge badge-success" style={{ marginRight: 8 }}>
                      {slots.filter((s) => !s.isBooked).length} Available
                    </span>
                    <span className="badge badge-danger">
                      {slots.filter((s) => s.isBooked).length} Booked
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {slots.map((slot) => {
                      const booking = getBookingForSlot(slot.id);
                      const isMyBooking = !!booking;
                      const isBooked = slot.isBooked;

                      return (
                        <div key={slot.id}
                          style={{
                            border: `2px solid ${isMyBooking ? 'var(--stat-green)' : isBooked ? 'var(--border-light)' : 'var(--primary)'}`,
                            borderRadius: 8,
                            padding: '14px 12px',
                            textAlign: 'center',
                            background: isMyBooking ? '#f0fff4' : isBooked ? '#f8f9fa' : 'white',
                            opacity: isBooked && !isMyBooking ? 0.6 : 1,
                            transition: 'all 0.15s',
                          }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: isMyBooking ? 'var(--stat-green)' : isBooked ? 'var(--text-muted)' : 'var(--primary)', marginBottom: 6 }}>
                            {fmtTime(slot.time)}
                          </div>
                          {slot.classId && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                              Class #{slot.classId}
                            </div>
                          )}
                          {isMyBooking ? (
                            <span className="badge badge-success">Your Booking</span>
                          ) : isBooked ? (
                            <span className="badge badge-secondary">Booked</span>
                          ) : (
                            <button className="btn btn-primary btn-sm"
                              style={{ marginTop: 4, width: '100%' }}
                              onClick={() => setBookModal(slot)}>
                              Book Slot
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {bookModal && (
        <BookSlotModal
          slot={bookModal}
          eventId={selectedEventId}
          onClose={() => setBookModal(null)}
          onBooked={() => { setBookModal(null); loadSlots(selectedEventId); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Page
──────────────────────────────────────────────────────────── */
export default function PTMSchedulerPage() {
  const [activeTab, setActiveTab] = useState(0);

  /* Read role from localStorage (consistent with the rest of IlmForge) */
  let role = 'parent';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    role = u.role || 'parent';
  } catch {
    // default to parent
  }

  const isAdmin = ['admin', 'super_admin'].includes(role);
  const isTeacher = role === 'teacher';
  const isParent = role === 'parent';

  /* Build tab list based on role */
  const tabs = [
    { label: 'Upcoming PTMs', icon: '📅', show: true },
    { label: 'Slot Management', icon: '🗂️', show: isAdmin || isTeacher },
    { label: 'My Bookings', icon: '🎫', show: isParent || isAdmin },
  ].filter((t) => t.show);

  return (
    <div className="hub-shell">
      {/* Page header */}
      <div className="hub-header">
        <div>
          <div className="hub-title">
            <span>Parent-Teacher Meeting (PTM)</span>
          </div>
          <div className="hub-subtitle">Schedule, manage, and track parent-teacher meetings</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && <span className="badge badge-navy">Admin</span>}
          {isTeacher && <span className="badge badge-info">Teacher</span>}
          {isParent && <span className="badge badge-success">Parent</span>}
        </div>
      </div>

      {/* Tab strip */}
      <div className="tab-strip">
        {tabs.map((tab, i) => (
          <button key={tab.label} className={`tab-btn ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}>
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="hub-content">
        {tabs[activeTab]?.label === 'Upcoming PTMs' && <UpcomingPTMsTab role={role} />}
        {tabs[activeTab]?.label === 'Slot Management' && <SlotManagementTab role={role} />}
        {tabs[activeTab]?.label === 'My Bookings' && <MyBookingsTab role={role} />}
      </div>
    </div>
  );
}
