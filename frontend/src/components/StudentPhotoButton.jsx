/**
 * Add or change a student's photo, right where you are.
 *
 * The photo is saved on the student's record (PUT /students/:id), which is
 * where every document reads it from: ID card, certificates, the admission
 * form, result cards and the portals. Used on the student list, ID cards,
 * certificates, the printed admission form and after an Excel import.
 */
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, User } from 'lucide-react';
import api from '../api/client';
import { compressPhoto, pickProblem, PICK_RULES } from '../utils/photo';

export default function StudentPhotoButton({ student, size = 44, onSaved, showLabel = true }) {
  const qc = useQueryClient();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(null); // shows the new photo at once
  const photo = local ?? student?.photoUrl ?? null;

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !student?.id) return;
    const p = pickProblem(file);
    if (p) { toast.error(p); return; }
    setBusy(true);
    try {
      const small = await compressPhoto(file);
      await api.put(`/students/${student.id}`, { photoUrl: small });
      setLocal(small);
      toast.success(`Photo saved for ${student.name || 'the student'}. It now appears on every document.`);
      // Every list and document that shows this student.
      qc.invalidateQueries({ predicate: (q) => /student|idcard|card|certificate|inquir/i.test(String(q.queryKey?.[0] || '')) });
      onSaved && onSaved(small);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'The photo could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const label = photo ? 'Change photo' : 'Add photo';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={`${label} for ${student?.name || 'student'}`}
        title={`${label} — ${PICK_RULES}`}
        style={{
          width: size, height: Math.round(size * 1.2), borderRadius: 8, padding: 0, flexShrink: 0, overflow: 'hidden', position: 'relative',
          border: photo ? '1px solid #E2E8F0' : '2px dashed #F59E0B', background: photo ? '#fff' : '#FFFBEB',
          cursor: busy ? 'wait' : 'pointer', display: 'grid', placeItems: 'center', color: '#B45309',
        }}
      >
        {photo
          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: busy ? 0.4 : 1 }} />
          : <User size={Math.round(size * 0.45)} style={{ opacity: busy ? 0.4 : 0.9 }} />}
        <span style={{ position: 'absolute', right: 2, bottom: 2, width: 16, height: 16, borderRadius: '50%', background: '#1B2F6E', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <Camera size={9} />
        </span>
      </button>
      {showLabel && (
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: photo ? '#0073b7' : '#B45309', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {busy ? 'Saving…' : label}
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
    </span>
  );
}
