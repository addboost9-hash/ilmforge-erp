/**
 * What every student row offers, wherever students are listed (search by
 * class or name, the imported-students list): see what is missing, add or
 * change the photo, edit the record, open the profile, delete a wrong entry.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Eye, AlertTriangle, Zap } from 'lucide-react';
import api from '../api/client';
import EditStudentModal from './EditStudentModal';

/** The details a school usually needs on every record. */
export function missingInfo(s) {
  const out = [];
  if (!s.photoUrl) out.push('photo');
  if (!s.dob) out.push('date of birth');
  if (!s.emergencyPhone) out.push('parent phone');
  if (s.bFormNo !== undefined && !s.bFormNo) out.push('B-Form');
  if (!s.fatherName) out.push("father's name");
  return out;
}

export function MissingBadge({ student }) {
  const m = missingInfo(student);
  if (!m.length) return <span style={{ fontSize: 11.5, color: '#15803D', fontWeight: 700 }}>Complete</span>;
  return (
    <span title={`Missing: ${m.join(', ')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#B45309', fontWeight: 700, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 99, padding: '1px 8px', whiteSpace: 'nowrap' }}>
      <AlertTriangle size={11} /> Missing: {m.slice(0, 2).join(', ')}{m.length > 2 ? ` +${m.length - 2}` : ''}
    </span>
  );
}

function DeleteDialog({ student, onClose, onDeleted }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.delete(`/students/${student.id}`),
    onSuccess: (r) => {
      toast.success(r.data?.message || 'Student removed.');
      qc.invalidateQueries({ predicate: (q) => /student|class-sections|idcard|card/i.test(String(q.queryKey?.[0] || '')) });
      onDeleted && onDeleted(student);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'The student could not be removed.', { duration: 8000 }),
  });
  const markLeft = useMutation({
    mutationFn: () => api.put(`/students/${student.id}`, { status: 'inactive' }),
    onSuccess: () => {
      toast.success(`${student.name} is marked as left school.`);
      qc.invalidateQueries({ predicate: (q) => /student|class-sections/i.test(String(q.queryKey?.[0] || '')) });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not update the status.'),
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'grid', placeItems: 'center', padding: 16 }} onClick={onClose}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, padding: 22, width: '100%', maxWidth: 440, boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <h3 id="del-title" style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>Remove {student.name}?</h3>
        <p id="del-desc" style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>
          <strong>Delete</strong> is for a record entered by mistake (a wrong or duplicate import). It disappears from every list and the student's sign-in stops.
          If the student has <strong>left the school</strong>, mark them as left instead: their fee and attendance history stays.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          {student.status !== 'inactive' && (
            <button type="button" className="btn btn-outline" disabled={markLeft.isPending} onClick={() => markLeft.mutate()}>
              {markLeft.isPending ? 'Saving…' : 'Mark as left school'}
            </button>
          )}
          <button type="button" className="btn" disabled={del.isPending} onClick={() => del.mutate()}
            style={{ background: '#DC2626', color: '#fff', border: 0 }}>
            <Trash2 size={14} /> {del.isPending ? 'Deleting…' : 'Delete record'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentRowActions({ student, onChanged, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: compact ? '4px 8px' : '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer', fontWeight: 600, textDecoration: 'none' };
  return (
    <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
      <Link to={`/students/${student.id}`} style={{ ...btn, border: '1px solid #CBD5E1', color: '#334155', background: '#fff' }} aria-label={`View ${student.name}`}>
        <Eye size={13} />{!compact && ' View'}
      </Link>
      {/* Edit opens the full admission form with the record filled in;
          Quick edit is the short pop-up form for a small fix. */}
      <Link to={`/students/${student.id}/edit`} style={{ ...btn, border: '1px solid #0D9488', color: '#0F766E', background: '#F0FDFA' }} aria-label={`Edit ${student.name}`} title="Edit in the admission form">
        <Pencil size={13} />{!compact && ' Edit'}
      </Link>
      <button type="button" onClick={() => setEditing(true)} style={{ ...btn, border: '1px solid #CBD5E1', color: '#334155', background: '#fff' }} aria-label={`Quick edit ${student.name}`} title="Quick edit">
        <Zap size={13} />
      </button>
      <button type="button" onClick={() => setDeleting(true)} style={{ ...btn, border: '1px solid #FECACA', color: '#B91C1C', background: '#fff' }} aria-label={`Delete ${student.name}`}>
        <Trash2 size={13} />
      </button>
      {editing && <EditStudentModal student={student} onClose={() => setEditing(false)} onSaved={onChanged} />}
      {deleting && <DeleteDialog student={student} onClose={() => setDeleting(false)} onDeleted={onChanged} />}
    </span>
  );
}
