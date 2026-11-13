/**
 * The school stamp: upload a picture of the office stamp (the paper's white
 * is made clear), choose the papers it is printed on, see how it sits on the
 * principal's signature. Shown in School Settings, the roll number slip
 * design and the result card settings; the admin or principal can change it.
 */
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Stamp, Upload, Trash2 } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { stampFromFile } from '../../utils/signatureImage';
import { useSchoolStamp, STAMP_PLACES } from '../../utils/schoolStamp';

export default function SchoolStampCard({ compact = false, only }) {
  const qc = useQueryClient();
  const stamp = useSchoolStamp();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = ['super_admin', 'admin', 'principal'].includes(role);
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const save = useMutation({
    mutationFn: (patch) => api.put('/stamp', patch).then((r) => r.data),
    onSuccess: (r) => { qc.setQueryData(['school-stamp'], r.data); toast.success(r.message || 'Saved.'); },
    onError: (e) => toast.error(e.response?.data?.message || 'The stamp could not be saved.'),
  });

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try { save.mutate({ image: await stampFromFile(file) }); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const places = only ? STAMP_PLACES.filter((p) => only.includes(p.key)) : STAMP_PLACES;
  const image = stamp?.image || '';

  return (
    <section aria-label="School stamp" style={{ border: '1px solid var(--border-light, #E5E7EB)', borderRadius: 12, padding: compact ? 12 : 16, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Stamp size={16} style={{ color: '#1B2F6E' }} />
        <strong style={{ fontSize: 14, color: '#1B2F6E' }}>School stamp</strong>
      </div>
      <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 10px', lineHeight: 1.5 }}>
        A picture of the school's stamp, printed beside the principal's signature. Stamp it on white paper, take a clear photo from above and upload it; the white is removed.
      </p>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* How it lands on a signature */}
        <div aria-label="How the stamp prints" style={{ position: 'relative', width: 190, height: 110, border: '1px dashed #CBD5E1', borderRadius: 8, background: '#FAFAF9', flex: 'none' }}>
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 28, borderTop: '1.2px solid #111827' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, textAlign: 'center', fontSize: 11, fontWeight: 700 }}>Principal</div>
          {image
            ? <img src={image} alt="School stamp" style={{ position: 'absolute', left: '50%', bottom: 18, width: 84, maxHeight: 84, objectFit: 'contain', transform: 'translateX(-95%) rotate(-10deg)', opacity: 0.88, mixBlendMode: 'multiply' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, color: '#94A3B8', paddingBottom: 30 }}>No stamp yet</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flex: '1 1 200px' }}>
          {canEdit ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Stamp picture"
                onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" className="btn btn-outline btn-sm" disabled={busy || save.isPending} onClick={() => input.current?.click()}>
                <Upload size={13} /> {image ? 'Change the stamp' : 'Upload the stamp'}
              </button>
              {image && (
                <button type="button" className="btn btn-outline btn-sm" style={{ color: '#B91C1C' }} disabled={save.isPending} onClick={() => save.mutate({ image: '' })}>
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#64748B' }}>Only the admin or the principal can change the stamp.</div>
          )}
          <fieldset disabled={!canEdit || save.isPending} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <legend style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Print it on</legend>
            {places.map((p) => (
              <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                <input type="checkbox" checked={stamp?.places?.[p.key] !== false}
                  onChange={(e) => save.mutate({ places: { [p.key]: e.target.checked } })} />
                {p.label}
              </label>
            ))}
          </fieldset>
        </div>
      </div>
    </section>
  );
}
