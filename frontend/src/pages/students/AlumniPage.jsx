/**
 * IlmForge — Alumni Directory Page
 * Displays passout students in a card grid with filters, stats,
 * update-profile modal, and bulk annual-function invite sender.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users, UserCheck, Calendar, Phone, MapPin, Briefcase,
  Search, Mail, Send, X, Linkedin, Award, Filter,
} from 'lucide-react';
import api from '../../api/client';

/* ─── helpers ─────────────────────────────────────── */
const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

const YEAR_COLORS = [
  '#0073b7', '#00a65a', '#605ca8', '#f39c12',
  '#dd4b39', '#00c0ef', '#0d9488', '#e67e22',
];

function yearColor(year) {
  if (!year) return '#0073b7';
  const idx = (parseInt(year) % YEAR_COLORS.length + YEAR_COLORS.length) % YEAR_COLORS.length;
  return YEAR_COLORS[idx];
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - i);

/* ─── Stat Card ───────────────────────────────────── */
function StatCard({ label, value, colorClass, icon: Icon }) {
  return (
    <div className={`stat-card ${colorClass}`} style={{ flex: 1, minWidth: 160 }}>
      <div className="stat-card-body">
        <div className="stat-card-content">
          <div className="stat-card-value">{value ?? '—'}</div>
          <div className="stat-card-label">{label}</div>
        </div>
        {Icon && <Icon className="stat-card-icon" size={72} strokeWidth={1} />}
      </div>
    </div>
  );
}

/* ─── Update Profile Modal ────────────────────────── */
function UpdateProfileModal({ alumni, onClose, onSaved }) {
  const [form, setForm] = useState({
    currentOccupation: alumni.currentOccupation || '',
    company:           alumni.company           || '',
    city:              alumni.city              || '',
    country:           alumni.country           || '',
    phone:             alumni.phone             || '',
    email:             alumni.email             || '',
    linkedIn:          alumni.linkedIn          || '',
    achievements:      alumni.achievements      || '',
    photoUrl:          alumni.photoUrl          || '',
    passoutYear:       alumni.passoutYear       || '',
  });

  const mutation = useMutation({
    mutationFn: (data) => api.put(`/alumni/${alumni.id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Alumni profile updated.');
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
          <span className="modal-title">Update Alumni Profile — {alumni.name}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="grid-2" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Current Occupation</label>
              <input className="form-control" value={form.currentOccupation} onChange={set('currentOccupation')} placeholder="e.g. Software Engineer" />
            </div>
            <div className="form-group">
              <label className="form-label">Company / Institution</label>
              <input className="form-control" value={form.company} onChange={set('company')} placeholder="e.g. Google" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-control" value={form.city} onChange={set('city')} placeholder="e.g. Karachi" />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-control" value={form.country} onChange={set('country')} placeholder="e.g. Pakistan" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input className="form-control" value={form.linkedIn} onChange={set('linkedIn')} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Passout Year</label>
              <select className="form-select" value={form.passoutYear} onChange={set('passoutYear')}>
                <option value="">Select Year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notable Achievements</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.achievements}
              onChange={set('achievements')}
              placeholder="Awards, publications, notable career milestones..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Photo URL</label>
            <input className="form-control" value={form.photoUrl} onChange={set('photoUrl')} placeholder="https://..." />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Full Profile Modal ──────────────────────────── */
function ProfileModal({ alumni, onClose }) {
  const color = yearColor(alumni.passoutYear);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header" style={{ background: color, color: '#fff' }}>
          <span className="modal-title" style={{ color: '#fff' }}>{alumni.name} — Full Profile</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} style={{ color: '#fff' }}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {/* Avatar + header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800,
            }}>
              {alumni.photoUrl
                ? <img src={alumni.photoUrl} alt={alumni.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : initials(alumni.name)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{alumni.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {alumni.class || '—'} &nbsp;·&nbsp; Passout {alumni.passoutYear || '—'}
              </div>
              {alumni.currentOccupation && (
                <span className="badge badge-primary" style={{ marginTop: 4 }}>
                  <Briefcase size={10} /> {alumni.currentOccupation}
                  {alumni.company && ` @ ${alumni.company}`}
                </span>
              )}
            </div>
          </div>

          {/* Info rows */}
          {[
            { label: 'Roll No',      value: alumni.rollNo },
            { label: 'City',         value: alumni.city },
            { label: 'Country',      value: alumni.country },
            { label: 'Phone',        value: alumni.phone },
            { label: 'Email',        value: alumni.email },
            { label: 'LinkedIn',     value: alumni.linkedIn },
            { label: 'Achievements', value: alumni.achievements },
          ].map(({ label, value }) => value ? (
            <div className="info-row" key={label}>
              <span className="info-label">{label}</span>
              <span className="info-value">{label === 'LinkedIn'
                ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{value}</a>
                : value}</span>
            </div>
          ) : null)}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Invite Modal ────────────────────────────────── */
function InviteModal({ onClose, selectedIds }) {
  const [form, setForm] = useState({
    subject:  'Annual Alumni Function Invitation',
    message:  'Dear Alumni,\n\nYou are cordially invited to our Annual Alumni Function. We look forward to reconnecting with you!\n\nBest regards,\nSchool Administration',
    channel:  'both',
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/alumni/send-invitation', data).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(res.message || 'Invitations sent!');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const handleSend = () => {
    if (!form.message.trim()) return toast.error('Message is required.');
    mutation.mutate({
      ...form,
      studentIds: selectedIds?.length ? selectedIds : undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Send Annual Function Invitation</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {selectedIds?.length > 0 && (
            <div className="alert alert-info" style={{ marginBottom: 14 }}>
              Sending to {selectedIds.length} selected alumni only.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Channel</label>
            <select className="form-select" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
              <option value="both">Email + SMS</option>
              <option value="email">Email only</option>
              <option value="sms">SMS only</option>
            </select>
          </div>

          {(form.channel === 'both' || form.channel === 'email') && (
            <div className="form-group">
              <label className="form-label">Email Subject</label>
              <input className="form-control" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Message Body</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={mutation.isPending}
          >
            <Send size={13} /> {mutation.isPending ? 'Sending...' : 'Send Invitations'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Alumni Compact Row ──────────────────────────── */
function AlumniCompactRow({ alumni, onUpdate, onView }) {
  const color = yearColor(alumni.passoutYear);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(12px)',
      borderRadius: 16,
      padding: '18px 20px',
      border: '1px solid rgba(255,255,255,0.45)',
      display: 'flex', gap: 14, alignItems: 'center',
      boxShadow: '0 2px 12px rgba(27,47,110,0.06)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(27,47,110,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(27,47,110,0.06)'; }}
    >
      <div style={{
        width: 50, height: 50, borderRadius: '50%',
        background: `linear-gradient(135deg, #1B2F6E, #0073b7)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 20, flexShrink: 0, fontWeight: 700,
      }}>
        {alumni.photoUrl
          ? <img src={alumni.photoUrl} alt={alumni.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          : initials(alumni.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alumni.name}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          {alumni.currentOccupation || alumni.profession || '—'} • {alumni.city || '—'}
        </div>
      </div>
      <span style={{ background: '#eff6ff', color: '#1B2F6E', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        Class of {alumni.passoutYear || '—'}
      </span>
    </div>
  );
}

/* ─── Alumni Card ─────────────────────────────────── */
function AlumniCard({ alumni, onUpdate, onView }) {
  const color = yearColor(alumni.passoutYear);
  return (
    <div className="card card-lift" style={{ padding: 0, marginBottom: 0 }}>
      {/* Card header — avatar + name */}
      <div style={{
        background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
        borderBottom: `3px solid ${color}`,
        padding: '18px 16px 14px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: color, color: '#fff', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800,
          border: `3px solid ${color}44`,
        }}>
          {alumni.photoUrl
            ? <img src={alumni.photoUrl} alt={alumni.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : initials(alumni.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {alumni.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            {alumni.class || 'N/A'} &nbsp;·&nbsp;
            <span style={{ color, fontWeight: 700 }}>{alumni.passoutYear || '—'}</span>
          </div>
          <span style={{ background: '#eff6ff', color: '#1B2F6E', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
            Class of {alumni.passoutYear || '—'}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 16px' }}>
        {alumni.currentOccupation ? (
          <div style={{ marginBottom: 8 }}>
            <span className="badge badge-primary" style={{ fontSize: 11 }}>
              <Briefcase size={10} /> {alumni.currentOccupation}
              {alumni.company && ` @ ${alumni.company}`}
            </span>
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <span className="badge badge-secondary" style={{ fontSize: 11 }}>Occupation not updated</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {alumni.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={12} style={{ color, flexShrink: 0 }} />
              {alumni.city}{alumni.country ? `, ${alumni.country}` : ''}
            </div>
          )}
          {alumni.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Phone size={12} style={{ color, flexShrink: 0 }} />
              {alumni.phone}
            </div>
          )}
          {alumni.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mail size={12} style={{ color, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alumni.email}</span>
            </div>
          )}
          {alumni.achievements && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
              <Award size={12} style={{ color, flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {alumni.achievements}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card footer — actions */}
      <div style={{
        padding: '8px 16px 12px',
        display: 'flex', gap: 8, borderTop: '1px solid var(--border-light)',
      }}>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => onUpdate(alumni)}>
          Update Profile
        </button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onView(alumni)}>
          View Profile
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════════ */
export default function AlumniPage() {
  const qc = useQueryClient();

  // Filters
  const [filters, setFilters] = useState({ year: '', classId: '', city: '', search: '' });
  const [page, setPage]       = useState(1);

  // Modals
  const [updateAlumni,  setUpdateAlumni]  = useState(null);
  const [viewAlumni,    setViewAlumni]    = useState(null);
  const [showInvite,    setShowInvite]    = useState(false);

  /* ── Data fetching ── */
  const { data: statsData } = useQuery({
    queryKey: ['alumni-stats'],
    queryFn:  () => api.get('/alumni/stats').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => api.get('/classes').then((r) => r.data.data || []),
    staleTime: 300_000,
  });

  const { data: alumniRes, isLoading } = useQuery({
    queryKey: ['alumni', filters, page],
    queryFn: () =>
      api.get('/alumni', {
        params: {
          year:    filters.year    || undefined,
          classId: filters.classId || undefined,
          city:    filters.city    || undefined,
          search:  filters.search  || undefined,
          page,
          limit: 24,
        },
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const alumni = alumniRes?.data || [];
  const total  = alumniRes?.total || 0;
  const pages  = alumniRes?.pages || 1;

  const stats = statsData || {};

  const setFilter = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['alumni'] });
    qc.invalidateQueries({ queryKey: ['alumni-stats'] });
  };

  return (
    <div className="page-content fade-up">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={22} style={{ color: 'var(--primary)' }} /> Alumni Directory
          </h1>
          <p className="page-subtitle">{total} alumni record{total !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
          <Send size={14} /> Send Annual Function Invite
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total Alumni"    value={stats.total         ?? '—'} colorClass="stat-blue"   icon={Users}      />
        <StatCard label="This Year"       value={stats.thisYear      ?? '—'} colorClass="stat-green"  icon={Calendar}   />
        <StatCard label="Last Year"       value={stats.lastYear      ?? '—'} colorClass="stat-yellow" icon={Calendar}   />
        <StatCard label="Active Contact"  value={stats.activeContact ?? '—'} colorClass="stat-cyan"   icon={UserCheck}  />
      </div>

      {/* ── Filter bar ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />

          <select className="form-select" style={{ width: 140 }} value={filters.year} onChange={setFilter('year')}>
            <option value="">All Years</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select className="form-select" style={{ width: 160 }} value={filters.classId} onChange={setFilter('classId')}>
            <option value="">All Classes</option>
            {(classesData || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input
            className="form-control"
            style={{ width: 140 }}
            placeholder="City..."
            value={filters.city}
            onChange={setFilter('city')}
          />

          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32 }}
              placeholder="Search by name or roll no..."
              value={filters.search}
              onChange={setFilter('search')}
            />
          </div>

          {(filters.year || filters.classId || filters.city || filters.search) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ year: '', classId: '', city: '', search: '' }); setPage(1); }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Alumni Grid ── */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : alumni.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={48} strokeWidth={1} /></div>
          <div className="empty-state-text">No alumni found</div>
          <div className="empty-state-sub">Try adjusting the filters, or promote students to passout status first.</div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            {alumni.map((a) => (
              <AlumniCard
                key={a.id}
                alumni={a}
                onUpdate={setUpdateAlumni}
                onView={setViewAlumni}
              />
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {updateAlumni && (
        <UpdateProfileModal
          alumni={updateAlumni}
          onClose={() => setUpdateAlumni(null)}
          onSaved={handleSaved}
        />
      )}

      {viewAlumni && (
        <ProfileModal
          alumni={viewAlumni}
          onClose={() => setViewAlumni(null)}
        />
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          selectedIds={[]}
        />
      )}
    </div>
  );
}
