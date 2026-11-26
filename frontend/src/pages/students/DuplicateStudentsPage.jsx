/**
 * Duplicate students (/students/duplicates): children recorded twice, side
 * by side, to delete the extra record.
 *
 * Each group shows what every record holds (fee payments, bills, attendance,
 * marks, photo, roll number) and suggests the one to keep. Deleting is the
 * usual delete of a student: the record leaves the lists, its unpaid bills are
 * cancelled and its login stops; a record with fee payments cannot be deleted
 * (it is the one to keep). "Delete all the extra records" does this for every
 * group that is surely the same child.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Trash2, CheckCircle2, AlertTriangle, Users, ExternalLink } from 'lucide-react';
import api from '../../api/client';

const NAVY = '#1B2F6E';
const KEY = ['student-duplicates'];
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' }) : '—');

function Record({ s, keep, onDeleted }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const del = async () => {
    setBusy(true);
    try {
      const r = await api.delete(`/students/${s.id}`);
      toast.success(r.data.message || 'Deleted.');
      onDeleted();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not delete it.');
      setAsking(false);
    }
    setBusy(false);
  };
  const fact = (label, value, strong) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5 }}>
      <span style={{ color: '#64748B' }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500, color: '#0F172A', textAlign: 'right', overflowWrap: 'anywhere' }}>{value || '—'}</span>
    </div>
  );
  return (
    <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 12, border: `1.5px solid ${keep ? '#86EFAC' : '#E2E8F0'}`, background: keep ? '#F0FDF4' : '#fff', alignContent: 'start' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {s.photoUrl ? <img src={s.photoUrl} alt="" style={{ width: 44, height: 54, objectFit: 'cover', borderRadius: 6, flex: 'none' }} /> : <div style={{ width: 44, height: 54, borderRadius: 6, background: '#F1F5F9', display: 'grid', placeItems: 'center', color: '#94A3B8', flex: 'none' }}><Users size={18} /></div>}
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: 14 }} dir="auto">{s.name}</strong>
          <div style={{ fontSize: 12, color: '#475569' }}>{s.className || 'No class'}{s.rollNo ? ` · Roll ${s.rollNo}` : ''}</div>
          {keep && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#15803D' }}><CheckCircle2 size={12} /> KEEP THIS ONE</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 3 }}>
        {fact("Father's name", s.fatherName)}
        {fact('B-Form', s.bFormNo)}
        {fact('Date of birth', s.dob ? fmt(s.dob) : '')}
        {fact('Parent phone', s.phone)}
        {fact('Admitted', fmt(s.admissionDate))}
        {fact('Fee payments', s.payments, s.payments > 0)}
        {fact('Fee bills', s.invoices)}
        {fact('Attendance days', s.attendance, s.attendance > 0)}
        {fact('Exam marks', s.marks, s.marks > 0)}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        <Link to={`/students/${s.id}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><ExternalLink size={13} /> Open</Link>
        {s.payments > 0 ? (
          <span style={{ fontSize: 11.5, color: '#64748B', alignSelf: 'center' }}>Has fee payments: keep this one.</span>
        ) : asking ? (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C' }}>Delete this record?</span>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={del} style={{ background: '#DC2626', color: '#fff', border: 0 }}>{busy ? 'Deleting…' : 'Yes, delete'}</button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setAsking(false)}>No</button>
          </span>
        ) : (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setAsking(true)} style={{ color: '#B91C1C', borderColor: '#FCA5A5' }} aria-label={`Delete the record of ${s.name}${s.rollNo ? `, roll ${s.rollNo}` : ''}`}><Trash2 size={13} /> Delete</button>
        )}
      </div>
    </div>
  );
}

export default function DuplicateStudentsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: () => api.get('/students/duplicates').then((r) => r.data) });
  const [bulk, setBulk] = useState(null); // null | 'ask' | { done, total }
  const groups = data?.data || [];
  const refresh = () => { qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: ['students'] }); };

  // The extra records of the groups that are surely one child, without fee payments.
  const extras = groups.filter((g) => g.sure).flatMap((g) => g.students.filter((s) => s.id !== g.keepId && !s.payments));
  const deleteAll = async () => {
    let done = 0;
    const failed = [];
    setBulk({ done, total: extras.length });
    for (const s of extras) {
      try { await api.delete(`/students/${s.id}`, { silent: true }); done += 1; } catch (e) { failed.push(`${s.name}: ${e.response?.data?.message || 'not deleted'}`); }
      setBulk({ done, total: extras.length });
    }
    setBulk(null);
    if (done) toast.success(`${done} extra record${done === 1 ? '' : 's'} deleted.`);
    if (failed.length) toast.error(failed.slice(0, 3).join(' · '), { duration: 8000 });
    refresh();
  };

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link to="/students" className="btn btn-outline btn-sm btn-icon" aria-label="Back to Students"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Copy size={20} color={NAVY} /> Duplicate Students</h1>
          <p className="page-subtitle">Children recorded twice. Keep one record and delete the extra, so fee bills, attendance and roll number slips are not doubled.</p>
        </div>
      </div>

      {isLoading && <div className="card" style={{ padding: 18 }}>Looking for duplicates…</div>}
      {isError && <div className="card" style={{ padding: 18, color: '#B91C1C' }}>Could not look for duplicates. Only the admin can see this page.</div>}
      {!isLoading && !isError && !groups.length && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22, display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
          <CheckCircle2 size={22} color="#15803D" /> No student is recorded twice.
        </div>
      )}

      {groups.length > 0 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5 }}>
              <strong>{data.total}</strong> {data.total === 1 ? 'child is' : 'children are'} recorded more than once ({data.records} extra record{data.records === 1 ? '' : 's'}).
              {data.total > groups.length && ` The first ${groups.length} are shown; delete these and open the page again for the rest.`}
              <span style={{ display: 'block', fontSize: 12, color: '#64748B' }}>Deleting takes the record off the lists, cancels its unpaid bills and stops its login. A record with fee payments cannot be deleted.</span>
            </span>
            {extras.length > 0 && (bulk === null ? (
              <button type="button" className="btn btn-outline" style={{ color: '#B91C1C', borderColor: '#FCA5A5' }} onClick={() => setBulk('ask')}><Trash2 size={15} /> Delete all the extra records ({extras.length})</button>
            ) : bulk === 'ask' ? (
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>Delete {extras.length} record{extras.length === 1 ? '' : 's'}, keeping the one marked in each group?</span>
                <button type="button" className="btn btn-sm" style={{ background: '#DC2626', color: '#fff', border: 0 }} onClick={deleteAll}>Yes, delete them</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setBulk(null)}>No</button>
              </span>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700 }}>Deleting… {bulk.done} of {bulk.total}</span>
            ))}
          </div>
          {extras.length > 0 && <span style={{ fontSize: 12, color: '#64748B', marginTop: -6 }}>"Delete all" only takes groups that are surely one child (same B-Form, or same name and father). "Possibly the same child" groups are for you to check one by one.</span>}

          {groups.map((g) => (
            <section key={g.students.map((s) => s.id).join('-')} aria-label={`Recorded twice: ${g.students[0]?.name}`} style={{ background: '#fff', border: `1px solid ${g.sure ? '#FDE68A' : '#E2E8F0'}`, borderRadius: 14, padding: 14, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <AlertTriangle size={16} color={g.sure ? '#D97706' : '#64748B'} />
                <strong style={{ fontSize: 14 }}>{g.sure ? 'The same child' : 'Possibly the same child'}</strong>
                <span style={{ fontSize: 12.5, color: '#64748B' }}>{g.reasons.join(' · ')}</span>
              </div>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {g.students.map((s) => <Record key={s.id} s={s} keep={s.id === g.keepId} onDeleted={refresh} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
