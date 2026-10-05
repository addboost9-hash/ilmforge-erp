/**
 * IlmForge — Admission Inquiries
 *
 * Every admission application in one list: those parents send from the
 * school's online form (/s/<slug>/apply) and those the office types in for
 * walk-ins and phone calls. From here the office calls or WhatsApps the
 * parent, records the outcome, and turns an application into an admission
 * with the details already filled in.
 */
import { Fragment, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { schoolLinks } from '../../utils/schoolLinks';
import { Plus, X, Phone, MessageCircle, ChevronDown, ChevronRight, UserPlus, Search, Link2, Globe } from 'lucide-react';

const STATUSES = [
  { key: 'open', label: 'New', badge: 'badge-blue', bg: '#DBEAFE', fg: '#1D4ED8' },
  { key: 'contacted', label: 'Contacted', badge: 'badge-amber', bg: '#FEF3C7', fg: '#B45309' },
  { key: 'admitted', label: 'Admitted', badge: 'badge-green', bg: '#DCFCE7', fg: '#15803D' },
  { key: 'closed', label: 'Closed', badge: 'badge-gray', bg: '#F1F5F9', fg: '#475569' },
];
const statusOf = (k) => STATUSES.find((s) => s.key === k) || STATUSES[3];
const ref = (id) => `ADM-${String(id).padStart(5, '0')}`;

/* Notes from the online form are "Key: value" lines; read them back. */
function details(notes) {
  const out = {};
  const rest = [];
  String(notes || '').split('\n').forEach((line) => {
    const m = /^([A-Za-z /]+):\s*(.*)$/.exec(line.trim());
    if (m) out[m[1].trim()] = m[2].trim(); else if (line.trim()) rest.push(line.trim());
  });
  return { fields: out, rest: rest.join(' '), online: out.Source === 'Online admission form' };
}

const ago = (at) => {
  const d = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  return new Date(at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const waNumber = (phone) => { const c = String(phone || '').replace(/\D/g, '').slice(-10); return c.length === 10 ? `92${c}` : ''; };

/* DD/MM/YYYY (as saved) -> YYYY-MM-DD (as the wizard's date input wants). */
const isoDate = (dmy) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

export default function AdmissionInquiriesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const school = useAuthStore((s) => s.school);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', classInterested: '', notes: '' });
  const [filter, setFilter] = useState('open');
  const [q, setQ] = useState('');
  const [openRow, setOpenRow] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inquiries'],
    queryFn: () => api.get('/admissions/inquiries').then((r) => r.data.data),
  });

  const add = useMutation({
    mutationFn: (d) => api.post('/admissions/inquiries', d),
    onSuccess: () => {
      toast.success('Inquiry recorded');
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
      setShowForm(false); setForm({ name: '', phone: '', classInterested: '', notes: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save the inquiry.'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }) => api.put('/admissions/inquiries/' + id, d),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not update the status.'),
  });

  const inquiries = data || [];
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s.key, inquiries.filter((i) => i.status === s.key).length])), [inquiries]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return inquiries.filter((i) => (filter === 'all' || i.status === filter)
      && (!term || [i.name, i.phone, i.classInterested, ref(i.id), i.notes].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [inquiries, filter, q]);

  const applyLink = school?.slug ? schoolLinks(school.slug).apply : '';
  const shareLink = () => {
    if (!applyLink) return toast.error('Open Settings › Portal Links to see your school’s links.');
    navigator.clipboard.writeText(applyLink)
      .then(() => toast.success('Admission form link copied. Share it on WhatsApp, Facebook or your website.'))
      .catch(() => toast.error('Could not copy. The link is: ' + applyLink));
  };

  const admit = (inq) => {
    const d = details(inq.notes).fields;
    navigate('/admissions/wizard', {
      state: {
        inquiryId: inq.id,
        prefill: {
          name: inq.name,
          fatherName: d['Father / guardian'] || '',
          gender: d.Gender || '',
          dob: isoDate(d['Date of birth']),
          fatherCnic: d['Father CNIC'] || '',
          emergencyPhone: inq.phone || '',
          parentEmail: d.Email || '',
          address: d.Address || '',
          prevSchoolName: d['Previous school'] || '',
          className: inq.classInterested || '',
        },
      },
    });
  };

  const message = (inq) => encodeURIComponent(
    `Assalam-o-Alaikum. This is ${school?.name || 'the school'} about the admission application for ${inq.name} (${ref(inq.id)}).`,
  );

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Admission Inquiries</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            {counts.open ? `${counts.open} new ${counts.open === 1 ? 'application needs' : 'applications need'} a follow-up` : 'No new applications waiting'}
            {' '}· online applications arrive here and in the bell automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={shareLink}><Link2 size={13} /> Copy admission form link</button>
          {applyLink && <a className="btn btn-outline" href={applyLink} target="_blank" rel="noreferrer"><Globe size={13} /> Open form</a>}
          <button className="btn btn-teal" onClick={() => setShowForm((s) => !s)}>
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add inquiry</>}
          </button>
        </div>
      </div>

      {/* Status tabs double as the summary */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }} role="tablist" aria-label="Filter by status">
        {[{ key: 'all', label: 'All', bg: '#fff', fg: '#1E293B' }, ...STATUSES].map((s) => {
          const active = filter === s.key;
          const n = s.key === 'all' ? inquiries.length : counts[s.key];
          return (
            <button key={s.key} role="tab" aria-selected={active} onClick={() => setFilter(s.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700,
                border: active ? `2px solid ${s.fg}` : '1px solid #E2E8F0', background: active ? s.bg : '#fff', color: active ? s.fg : '#475569' }}>
              {s.label}
              <span style={{ minWidth: 20, padding: '0 6px', borderRadius: 999, background: active ? '#fff' : '#F1F5F9', fontSize: 12 }}>{n}</span>
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 220, flex: '0 1 300px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input className="form-input" style={{ paddingLeft: 30 }} placeholder="Search name, phone, class or ADM no." aria-label="Search inquiries" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #CCFBF1', background: '#F0FDF9' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F766E', marginBottom: 14 }}>New inquiry (walk-in or phone call)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="form-group"><label className="form-label" htmlFor="iq-name">Student name *</label><input id="iq-name" className="form-input" placeholder="Ali Khan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label" htmlFor="iq-phone">Parent phone *</label><input id="iq-phone" className="form-input" placeholder="03001234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label className="form-label" htmlFor="iq-class">Class interested</label><input id="iq-class" className="form-input" placeholder="e.g. Class 5" value={form.classInterested} onChange={(e) => setForm({ ...form, classInterested: e.target.value })} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor="iq-notes">Notes</label><input id="iq-notes" className="form-input" placeholder="Father's name, how they heard of the school…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <button className="btn btn-teal" onClick={() => add.mutate(form)} disabled={!form.name.trim() || !form.phone.trim() || add.isPending}>
            {add.isPending ? 'Saving…' : 'Save inquiry'}
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <div className="loading-center"><div className="spinner" /></div> : isError ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <p style={{ marginBottom: 10 }}>Inquiries could not be loaded.</p>
            <button className="btn btn-outline" onClick={() => refetch()}>Try again</button>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead><tr><th aria-label="Details" /><th>Ref</th><th>Student</th><th>Parent phone</th><th>Class</th><th>Received</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {shown.map((inq) => {
                  const d = details(inq.notes);
                  const st = statusOf(inq.status);
                  const expanded = openRow === inq.id;
                  const wa = waNumber(inq.phone);
                  return (
                    <Fragment key={inq.id}>
                      <tr>
                        <td>
                          <button className="btn btn-ghost btn-sm btn-icon" aria-label={expanded ? 'Hide details' : 'Show details'} aria-expanded={expanded}
                            onClick={() => setOpenRow(expanded ? null : inq.id)}>
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{ref(inq.id)}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1E3A5F' }}>{inq.name}</div>
                          <div style={{ fontSize: 11.5, color: '#64748B' }}>
                            {d.fields['Father / guardian'] ? `Father: ${d.fields['Father / guardian']}` : ''}
                            {d.online && <span style={{ marginLeft: d.fields['Father / guardian'] ? 6 : 0, fontSize: 10.5, fontWeight: 700, color: '#0F766E', background: '#CCFBF1', borderRadius: 99, padding: '1px 7px' }}>Online form</span>}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{inq.phone}</td>
                        <td><span className="badge badge-blue">{inq.classInterested || '—'}</span></td>
                        <td style={{ fontSize: 12, color: '#64748B' }} title={new Date(inq.createdAt).toLocaleString('en-PK')}>{ago(inq.createdAt)}</td>
                        <td>
                          <select className="form-select" aria-label={`Status for ${inq.name}`} style={{ padding: '4px 8px', fontSize: 12, width: 126, background: st.bg, color: st.fg, fontWeight: 700 }}
                            value={inq.status} onChange={(e) => update.mutate({ id: inq.id, status: e.target.value })}>
                            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <a className="btn btn-sm btn-outline btn-icon" href={`tel:${inq.phone}`} aria-label={`Call ${inq.phone}`} title="Call"><Phone size={13} /></a>
                            {wa && <a className="btn btn-sm btn-outline btn-icon" href={`https://wa.me/${wa}?text=${message(inq)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp"><MessageCircle size={13} /></a>}
                            {inq.status !== 'admitted' && (
                              <button className="btn btn-sm btn-teal" onClick={() => admit(inq)} title="Open the admission wizard with these details filled in">
                                <UserPlus size={13} /> Admit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td />
                          <td colSpan={7} style={{ background: '#F8FAFC' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 18px', fontSize: 13, padding: '6px 0' }}>
                              {Object.entries(d.fields).filter(([k]) => k !== 'Source').map(([k, v]) => (
                                <div key={k}><span style={{ color: '#64748B' }}>{k}: </span><strong>{v}</strong></div>
                              ))}
                              {d.rest && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748B' }}>Notes: </span>{d.rest}</div>}
                              {!Object.keys(d.fields).length && !d.rest && <div style={{ color: '#64748B' }}>No further details were given.</div>}
                              <div style={{ gridColumn: '1 / -1', color: '#94A3B8', fontSize: 12 }}>
                                Received {new Date(inq.createdAt).toLocaleString('en-PK')} {d.online ? 'from the online admission form' : 'by the office'}.
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {shown.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-text">
                        {inquiries.length === 0
                          ? 'No applications yet. Share your admission form link and new applications will appear here.'
                          : q ? 'No inquiry matches this search.' : `No ${filter === 'all' ? '' : statusOf(filter).label.toLowerCase() + ' '}inquiries.`}
                      </div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
