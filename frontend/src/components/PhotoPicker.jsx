/**
 * Pick a photo, check it, shrink it, show it.
 *
 * Used where the photo is not yet tied to a saved record (the public online
 * admission form). It never uploads anything itself: it hands the parent a
 * small JPEG data URL through onChange, or null when removed.
 */
import { useRef, useState } from 'react';
import { Camera, Trash2, RefreshCw } from 'lucide-react';
import { compressPhoto, pickProblem, dataUrlKB, PICK_RULES } from '../utils/photo';

export default function PhotoPicker({ value, onChange, label = 'Photo', hint, id = 'photo-picker', error }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again after a removal
    if (!file) return;
    const p = pickProblem(file);
    if (p) { setProblem(p); return; }
    setBusy(true); setProblem('');
    try {
      onChange(await compressPhoto(file));
    } catch (err) {
      setProblem(err.message || 'The photo could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const shown = problem || error;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</label>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-label={value ? 'Change photo' : 'Choose photo'}
          style={{
            width: 96, height: 116, borderRadius: 12, flexShrink: 0, overflow: 'hidden', cursor: 'pointer', padding: 0,
            border: `2px dashed ${shown ? '#DC2626' : value ? '#16A34A' : '#CBD5E1'}`, background: '#F8FAFC',
            display: 'grid', placeItems: 'center', color: '#64748B',
          }}
        >
          {value
            ? <img src={value} alt="Chosen photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ display: 'grid', justifyItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600 }}><Camera size={22} />{busy ? 'Resizing…' : 'Add photo'}</span>}
        </button>
        <div style={{ display: 'grid', gap: 6, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => input.current?.click()} disabled={busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: '1.5px solid #CBD5E1', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#1E293B' }}>
              {value ? <RefreshCw size={14} /> : <Camera size={14} />} {busy ? 'Resizing…' : value ? 'Change photo' : 'Choose photo'}
            </button>
            {value && (
              <button type="button" onClick={() => { onChange(null); setProblem(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: '1.5px solid #FECACA', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#B91C1C' }}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#64748B' }}>{hint || PICK_RULES}</span>
          {value && !shown && <span style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>Photo ready · {dataUrlKB(value)} KB</span>}
          {shown && <span role="alert" style={{ fontSize: 12.5, color: '#B91C1C', fontWeight: 600 }}>{shown}</span>}
        </div>
      </div>
      {/* On phones this offers the camera or the gallery. */}
      <input id={id} ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} style={{ display: 'none' }} />
    </div>
  );
}
