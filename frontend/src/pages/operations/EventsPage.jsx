/**
 * IlmForge — Events & Tournaments Page
 * 4 tabs:
 *   1. Upcoming Events    — card grid with Add Event modal
 *   2. Event Registration — add participants, form teams
 *   3. Results & Winners  — record results, podium display
 *   4. Calendar View      — monthly calendar with colored event blocks
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Calendar, Trophy, Users, Plus, X, Search,
  ChevronLeft, ChevronRight, Medal, Flag,
  Dumbbell, Music, BookOpen, ClipboardList,
  Briefcase, Star,
} from 'lucide-react';
import api from '../../api/client';

/* ─── helpers ─────────────────────────────────────── */
const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

/* Event type category map — used for card badge rendering */
const EVENT_TYPE_MAP = {
  sports:   { color: '#059669', icon: '⚽', bg: '#dcfce7' },
  academic: { color: '#0073b7', icon: '📚', bg: '#dbeafe' },
  cultural: { color: '#7c3aed', icon: '🎭', bg: '#ede9fe' },
  trip:     { color: '#D97706', icon: '🚌', bg: '#fef3c7' },
  meeting:  { color: '#DC2626', icon: '👥', bg: '#fee2e2' },
  exam:     { color: '#dd4b39', icon: '📝', bg: '#f8d7da' },
  holiday:  { color: '#00c0ef', icon: '🌟', bg: '#d1ecf1' },
  general:  { color: '#6c757d', icon: '📌', bg: '#e2e3e5' },
};

const EVENT_TYPES = [
  { value: 'sports',   label: 'Sports',   color: '#059669', bg: '#dcfce7', icon: Dumbbell   },
  { value: 'cultural', label: 'Cultural', color: '#7c3aed', bg: '#ede9fe', icon: Music       },
  { value: 'academic', label: 'Academic', color: '#0073b7', bg: '#dbeafe', icon: BookOpen    },
  { value: 'exam',     label: 'Exam',     color: '#dd4b39', bg: '#f8d7da', icon: ClipboardList},
  { value: 'meeting',  label: 'Meeting',  color: '#DC2626', bg: '#fee2e2', icon: Briefcase   },
  { value: 'trip',     label: 'Trip',     color: '#D97706', bg: '#fef3c7', icon: Star        },
  { value: 'holiday',  label: 'Holiday',  color: '#00c0ef', bg: '#d1ecf1', icon: Star        },
  { value: 'general',  label: 'General',  color: '#6c757d', bg: '#e2e3e5', icon: Flag        },
];

function getTypeInfo(type) {
  const found = EVENT_TYPES.find((t) => t.value === type);
  if (found) return found;
  const mapped = EVENT_TYPE_MAP[type];
  if (mapped) return { value: type, label: type, ...mapped, icon: Flag };
  return EVENT_TYPES[EVENT_TYPES.length - 1];
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function fmtDay(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PK', { weekday: 'short' }); }
  catch { return ''; }
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ─── Tab strip ───────────────────────────────────── */
const TABS = [
  { key: 'upcoming',     label: 'Upcoming Events',    icon: Calendar },
  { key: 'registration', label: 'Event Registration', icon: Users    },
  { key: 'results',      label: 'Results & Winners',  icon: Trophy   },
  { key: 'calendar',     label: 'Calendar View',      icon: Calendar },
];

/* ════════════════════════════════════════════════════
   ADD / EDIT EVENT MODAL
════════════════════════════════════════════════════ */
function EventModal({ event, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:       event?.title       || '',
    type:        event?.type        || 'general',
    date:        event?.date        ? event.date.slice(0, 10) : '',
    endDate:     event?.endDate     ? event.endDate.slice(0, 10) : '',
    venue:       event?.venue       || '',
    description: event?.description || '',
    status:      event?.status      || 'upcoming',
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      event
        ? api.put(`/events/${event.id}`, data).then((r) => r.data)
        : api.post('/events', data).then((r) => r.data),
    onSuccess: () => {
      toast.success(event ? 'Event updated.' : 'Event created.');
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{event ? 'Edit Event' : 'Add New Event'}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="grid-2" style={{ gap: 14 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Event Title <span style={{ color: 'red' }}>*</span></label>
              <input className="form-control" value={form.title} onChange={set('title')} placeholder="e.g. Inter-School Cricket Tournament" />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={set('type')}>
                {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={set('status')}>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Start Date <span style={{ color: 'red' }}>*</span></label>
              <input className="form-control" type="date" value={form.date} onChange={set('date')} />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-control" type="date" value={form.endDate} onChange={set('endDate')} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Venue</label>
              <input className="form-control" value={form.venue} onChange={set('venue')} placeholder="e.g. School Ground" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} value={form.description} onChange={set('description')} placeholder="Event details, rules, requirements..." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => { if (!form.title || !form.date) { toast.error('Title and date are required.'); return; } mutation.mutate(form); }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 1 — UPCOMING EVENTS
════════════════════════════════════════════════════ */
function UpcomingEventsTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');

  const { data: eventsRes, isLoading } = useQuery({
    queryKey: ['events', 'list', typeFilter],
    queryFn: () => api.get('/events', { params: { type: typeFilter || undefined, limit: 100 } }).then((r) => r.data),
  });

  const events = useMemo(() => {
    const list = eventsRes?.data || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((e) => e.title?.toLowerCase().includes(q) || e.venue?.toLowerCase().includes(q));
  }, [eventsRes, search]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/events/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Event deleted.'); qc.invalidateQueries({ queryKey: ['events'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 150 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => { setEditEvent(null); setShowModal(true); }}>
          <Plus size={14} /> Add Event
        </button>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Calendar size={48} strokeWidth={1} /></div>
          <div className="empty-state-text">No events found</div>
          <div className="empty-state-sub">Click "Add Event" to schedule your first school event.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {events.map((ev) => {
            const ti = getTypeInfo(ev.type);
            const Icon = ti.icon;
            return (
              <div key={ev.id} className="card card-lift" style={{ padding: 0, marginBottom: 0 }}>
                {/* Type color strip */}
                <div style={{ height: 4, background: ti.color, borderRadius: '6px 6px 0 0' }} />
                <div style={{ padding: '14px 16px' }}>
                  {/* Type badge + status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: ti.bg, color: ti.color,
                      padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    }}>
                      {EVENT_TYPE_MAP[ev.type]?.icon
                        ? <span>{EVENT_TYPE_MAP[ev.type].icon}</span>
                        : <Icon size={11} />}
                      {ti.label}
                    </span>
                    <span className={`badge ${ev.status === 'completed' ? 'badge-success' : ev.status === 'cancelled' ? 'badge-danger' : ev.status === 'ongoing' ? 'badge-warning' : 'badge-info'}`}>
                      {ev.status}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6, color: 'var(--text-900)' }}>{ev.title}</div>

                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div><Calendar size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />{fmtDate(ev.date)}{ev.endDate && ev.endDate !== ev.date ? ` — ${fmtDate(ev.endDate)}` : ''}</div>
                    {ev.venue && <div><Flag size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />{ev.venue}</div>}
                    <div><Users size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />{ev.participantCount ?? 0} participant{(ev.participantCount ?? 0) !== 1 ? 's' : ''}</div>
                  </div>

                  {ev.description && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ev.description}
                    </div>
                  )}
                </div>

                <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, borderTop: '1px solid var(--border-light)' }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => { setEditEvent(ev); setShowModal(true); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Delete this event?')) deleteMutation.mutate(ev.id); }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <EventModal
          event={editEvent}
          onClose={() => setShowModal(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['events'] })}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 2 — EVENT REGISTRATION
════════════════════════════════════════════════════ */
function RegistrationTab() {
  const qc = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [studentSearch,   setStudentSearch]   = useState('');
  const [teamName,        setTeamName]        = useState('');

  const { data: eventsRes } = useQuery({
    queryKey: ['events', 'list', ''],
    queryFn: () => api.get('/events', { params: { limit: 200 } }).then((r) => r.data),
  });

  const { data: studentsRes } = useQuery({
    queryKey: ['students', 'active', studentSearch],
    queryFn: () => api.get('/students', { params: { search: studentSearch || undefined, status: 'active', limit: 20 } }).then((r) => r.data),
    enabled: studentSearch.length > 1,
  });

  const { data: participantsRes, refetch: refetchParticipants } = useQuery({
    queryKey: ['event-participants', selectedEventId],
    queryFn: () => api.get(`/events/${selectedEventId}/participants`).then((r) => r.data),
    enabled: !!selectedEventId,
  });

  const addMutation = useMutation({
    mutationFn: ({ eventId, studentId, teamName }) =>
      api.post(`/events/${eventId}/participants`, { participants: [{ studentId, teamName: teamName || null }] }).then((r) => r.data),
    onSuccess: () => { toast.success('Participant added.'); refetchParticipants(); setStudentSearch(''); setTeamName(''); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const events      = eventsRes?.data || [];
  const students    = studentsRes?.data || [];
  const participants = participantsRes?.data || [];

  // Group participants by team
  const teams = useMemo(() => {
    const groups = {};
    participants.forEach((p) => {
      const key = p.teamName || '__individual__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [participants]);

  return (
    <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
      {/* Left — Event selector + add participant */}
      <div>
        <div className="card" style={{ padding: 20, marginBottom: 0 }}>
          <div className="form-group">
            <label className="form-label">Select Event</label>
            <select className="form-select" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
              <option value="">— Choose an event —</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title} ({fmtDate(e.date)})</option>)}
            </select>
          </div>

          {selectedEventId && (
            <>
              <div className="form-group">
                <label className="form-label">Search Student</label>
                <input
                  className="form-control"
                  placeholder="Type name or roll no..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {students.length > 0 && (
                  <div style={{ border: '1px solid var(--border-light)', borderRadius: 4, marginTop: 4, maxHeight: 180, overflowY: 'auto', background: '#fff' }}>
                    {students.map((s) => (
                      <div
                        key={s.id}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                        onClick={() => {
                          addMutation.mutate({ eventId: parseInt(selectedEventId), studentId: s.id, teamName });
                          setStudentSearch('');
                        }}
                      >
                        <strong>{s.name}</strong> &nbsp;
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.rollNo} · {s.class?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Team Name (optional)</label>
                <input className="form-control" placeholder="e.g. Team Alpha" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right — Participants table */}
      <div>
        {selectedEventId ? (
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header">
              <h3><Users size={15} /> Registered Participants ({participants.length})</h3>
            </div>
            {participants.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-text">No participants yet</div>
                <div className="empty-state-sub">Search and add students using the form.</div>
              </div>
            ) : (
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Student</th><th>Roll No</th><th>Class</th><th>Team</th><th>Position</th><th>Score</th></tr>
                  </thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p.student?.name || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#0073b7' }}>{p.student?.rollNo || '—'}</td>
                        <td>{p.student?.class?.name || '—'}</td>
                        <td>{p.teamName || <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Individual</span>}</td>
                        <td>{p.position ? <span className="badge badge-warning">{p.position === 1 ? '1st' : p.position === 2 ? '2nd' : p.position === 3 ? '3rd' : `${p.position}th`}</span> : '—'}</td>
                        <td>{p.score || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={48} strokeWidth={1} /></div>
            <div className="empty-state-text">Select an event to manage participants</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 3 — RESULTS & WINNERS
════════════════════════════════════════════════════ */
function ResultsTab() {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [results, setResults]                 = useState([{ studentId: '', position: 1, score: '', teamName: '' }]);

  const { data: eventsRes } = useQuery({
    queryKey: ['events', 'list', ''],
    queryFn:  () => api.get('/events', { params: { limit: 200 } }).then((r) => r.data),
  });

  const { data: participantsRes } = useQuery({
    queryKey: ['event-participants', selectedEventId],
    queryFn:  () => api.get(`/events/${selectedEventId}/participants`).then((r) => r.data),
    enabled:  !!selectedEventId,
  });

  const submitMutation = useMutation({
    mutationFn: ({ eventId, results }) =>
      api.post(`/events/${eventId}/results`, { results }).then((r) => r.data),
    onSuccess: () => toast.success('Results recorded successfully!'),
    onError:   (e) => toast.error(errMsg(e)),
  });

  const events       = eventsRes?.data || [];
  const participants = participantsRes?.data || [];

  // Sort participants by position for podium
  const winners = [...participants]
    .filter((p) => p.position && p.position <= 3)
    .sort((a, b) => a.position - b.position);

  const PODIUM_COLORS = { 1: '#F59E0B', 2: '#94A3B8', 3: '#CD7F32' };
  const PODIUM_LABELS = { 1: '1st Place', 2: '2nd Place', 3: '3rd Place' };

  const addResultRow = () => setResults((r) => [...r, { studentId: '', position: r.length + 1, score: '', teamName: '' }]);
  const removeRow    = (i) => setResults((r) => r.filter((_, idx) => idx !== i));
  const updateRow    = (i, k, v) => setResults((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Select Event</label>
          <select className="form-select" value={selectedEventId} onChange={(e) => { setSelectedEventId(e.target.value); setResults([{ studentId: '', position: 1, score: '', teamName: '' }]); }}>
            <option value="">— Choose an event —</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title} ({fmtDate(e.date)})</option>)}
          </select>
        </div>

        {selectedEventId && (
          <>
            <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 13 }}>Enter Results</div>
            {results.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label className="form-label">Participant</label>
                  <select className="form-select" value={row.studentId} onChange={(e) => updateRow(i, 'studentId', e.target.value)}>
                    <option value="">Select...</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.studentId}>{p.student?.name}{p.teamName ? ` (${p.teamName})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                  <label className="form-label">Position</label>
                  <select className="form-select" value={row.position} onChange={(e) => updateRow(i, 'position', parseInt(e.target.value))}>
                    <option value={1}>1st</option>
                    <option value={2}>2nd</option>
                    <option value={3}>3rd</option>
                    {[4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}th</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ width: 120, marginBottom: 0 }}>
                  <label className="form-label">Score / Time</label>
                  <input className="form-control" value={row.score} onChange={(e) => updateRow(i, 'score', e.target.value)} placeholder="e.g. 45 pts" />
                </div>
                <div className="form-group" style={{ width: 130, marginBottom: 0 }}>
                  <label className="form-label">Team</label>
                  <input className="form-control" value={row.teamName} onChange={(e) => updateRow(i, 'teamName', e.target.value)} placeholder="Optional" />
                </div>
                <button className="btn btn-danger btn-sm btn-icon" style={{ marginBottom: 1 }} onClick={() => removeRow(i)} disabled={results.length === 1}>
                  <X size={14} />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn btn-outline btn-sm" onClick={addResultRow}><Plus size={13} /> Add Row</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => submitMutation.mutate({ eventId: parseInt(selectedEventId), results })}
                disabled={submitMutation.isPending}
              >
                <Trophy size={13} /> {submitMutation.isPending ? 'Saving...' : 'Save Results'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Podium display ── */}
      {winners.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={17} style={{ color: '#F59E0B' }} /> Winners Podium
          </div>

          {/* Podium layout — 2nd | 1st | 3rd */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {[winners.find(w => w.position === 2), winners.find(w => w.position === 1), winners.find(w => w.position === 3)]
              .map((w, idx) => {
                if (!w) return <div key={idx} style={{ width: 120 }} />;
                const color   = PODIUM_COLORS[w.position];
                const heights = { 1: 120, 2: 90, 3: 70 };
                const height  = heights[w.position] || 70;
                return (
                  <div key={w.id} style={{ textAlign: 'center', width: 140 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                      {w.student?.name || '—'}
                    </div>
                    {w.score && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>{w.score}</div>}
                    <div style={{
                      height, background: color, borderRadius: '8px 8px 0 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 28, fontWeight: 900,
                      boxShadow: `0 4px 16px ${color}55`,
                    }}>
                      {w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'}
                    </div>
                    <div style={{
                      background: color, color: '#fff', fontSize: 11, fontWeight: 700,
                      padding: '4px 0', borderRadius: '0 0 4px 4px',
                    }}>
                      {PODIUM_LABELS[w.position]}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* All participants ranked */}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Rank</th><th>Participant</th><th>Team</th><th>Score</th><th>Certificate</th></tr>
              </thead>
              <tbody>
                {[...participants].sort((a, b) => (a.position || 999) - (b.position || 999)).map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.position && p.position <= 3
                        ? <span style={{ fontSize: 18 }}>{p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : '🥉'}</span>
                        : p.position
                          ? <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.position}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.student?.name || '—'}</td>
                    <td>{p.teamName || '—'}</td>
                    <td>{p.score || '—'}</td>
                    <td>
                      {p.position && p.position <= 3 && (
                        <a href="/certificates" className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>
                          <Medal size={11} /> Generate Certificate
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEventId && participants.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Medal size={48} strokeWidth={1} /></div>
          <div className="empty-state-text">No participants registered yet</div>
          <div className="empty-state-sub">Go to the Event Registration tab to add participants first.</div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 4 — CALENDAR VIEW
════════════════════════════════════════════════════ */
function CalendarTab() {
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [sideEvent, setSideEvent] = useState(null);

  const { data: calRes, isLoading } = useQuery({
    queryKey: ['events', 'calendar', calYear, calMonth],
    queryFn:  () => api.get('/events/calendar', { params: { year: calYear, month: calMonth } }).then((r) => r.data),
  });

  const events = calRes?.data || [];

  // Build a day-to-events map
  const dayMap = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const d = new Date(ev.date).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [events]);

  // Calendar grid
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth     = new Date(calYear, calMonth, 0).getDate();
  const cells           = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const todayDate = now.getDate();
  const isToday   = (d) => calYear === now.getFullYear() && calMonth === now.getMonth() + 1 && d === todayDate;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Calendar grid */}
      <div className="card" style={{ flex: 1, padding: 0, minWidth: 0 }}>
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{MONTHS[calMonth - 1]} {calYear}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>

        {isLoading ? (
          <div className="loading-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div style={{ padding: '0 12px 12px' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4, marginTop: 10 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, idx) => {
                const evs = day ? (dayMap[day] || []) : [];
                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: 72,
                      borderRadius: 6,
                      border: '1px solid var(--border-light)',
                      background: day ? (isToday(day) ? 'var(--primary-light)' : '#fff') : 'transparent',
                      padding: '4px 5px',
                      cursor: evs.length ? 'pointer' : 'default',
                    }}
                    onClick={() => evs.length && setSideEvent(evs[0])}
                  >
                    {day && (
                      <>
                        <div style={{
                          fontWeight: isToday(day) ? 800 : 500,
                          fontSize: 12.5,
                          color: isToday(day) ? 'var(--primary)' : 'var(--text-primary)',
                          marginBottom: 3,
                        }}>
                          {day}
                        </div>
                        {evs.slice(0, 3).map((ev) => {
                          const ti = getTypeInfo(ev.type);
                          return (
                            <div
                              key={ev.id}
                              title={ev.title}
                              style={{
                                background: ti.color, color: '#fff',
                                fontSize: 10, fontWeight: 600,
                                padding: '1px 5px', borderRadius: 3,
                                marginBottom: 2,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}
                              onClick={(e) => { e.stopPropagation(); setSideEvent(ev); }}
                            >
                              {ev.title}
                            </div>
                          );
                        })}
                        {evs.length > 3 && (
                          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1 }}>+{evs.length - 3} more</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {EVENT_TYPES.slice(0, -1).map((t) => (
            <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} /> {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Side panel — event detail */}
      {sideEvent ? (
        <div className="card" style={{ width: 280, flexShrink: 0, padding: 0 }}>
          <div style={{ background: getTypeInfo(sideEvent.type).color, padding: '14px 16px', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{sideEvent.title}</span>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#fff' }} onClick={() => setSideEvent(null)}><X size={14} /></button>
          </div>
          <div style={{ padding: '14px 16px' }}>
            {[
              { label: 'Type',    value: getTypeInfo(sideEvent.type).label },
              { label: 'Date',    value: fmtDate(sideEvent.date) },
              { label: 'End',     value: sideEvent.endDate ? fmtDate(sideEvent.endDate) : null },
              { label: 'Venue',   value: sideEvent.venue },
              { label: 'Status',  value: sideEvent.status },
            ].map(({ label, value }) => value ? (
              <div className="info-row" key={label}>
                <span className="info-label" style={{ minWidth: 70 }}>{label}</span>
                <span className="info-value">{value}</span>
              </div>
            ) : null)}

            {sideEvent.description && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {sideEvent.description}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ width: 280, flexShrink: 0 }} className="card">
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon"><Calendar size={36} strokeWidth={1} /></div>
            <div className="empty-state-text" style={{ fontSize: 13 }}>Click an event to see details</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
════════════════════════════════════════════════════ */
export default function EventsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');

  return (
    <div className="page-content fade-up">
      {/* Page header */}
      <div style={{ marginBottom: 0 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Trophy size={22} style={{ color: 'var(--primary)' }} /> Events & Tournaments
        </h1>
        <p className="page-subtitle">Manage school events, sports tournaments, and cultural programmes</p>
      </div>

      {/* Tab strip */}
      <div className="tab-strip" style={{ margin: '16px -22px 20px', padding: '0 22px' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'upcoming'     && <UpcomingEventsTab />}
      {activeTab === 'registration' && <RegistrationTab  />}
      {activeTab === 'results'      && <ResultsTab       />}
      {activeTab === 'calendar'     && <CalendarTab      />}
    </div>
  );
}
