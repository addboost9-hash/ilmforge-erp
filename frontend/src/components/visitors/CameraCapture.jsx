/**
 * An optional photo from the camera (the visitor, or their CNIC card).
 * Without a camera, or if the browser refuses it, a picture can be chosen
 * instead (on a tablet or phone that opens the camera too). The photo is
 * shrunk to about 40 KB before it is kept.
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, ImagePlus } from 'lucide-react';
import { compressPhoto } from '../../utils/photo';

export default function CameraCapture({ value, onChange, label = 'Photo', facing = 'user', text = {} }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');
  const t = { take: 'Take photo', choose: 'Choose picture', capture: 'Capture', cancel: 'Cancel', retake: 'Retake', remove: 'Remove', optional: 'optional', ...text };

  const stop = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setLive(false);
  };
  useEffect(() => stop, []);

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('No camera here: choose a picture instead.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setLive(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } });
    } catch {
      setError('The camera could not be opened (allow it in the browser, or choose a picture).');
    }
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    stop();
    try { onChange(await compressPhoto(c.toDataURL('image/jpeg', 0.9))); } catch (e) { setError(e.message); }
  };

  const pick = async (file) => {
    if (!file) return;
    setError('');
    try { onChange(await compressPhoto(file)); } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label} <span style={{ fontWeight: 400, color: '#94A3B8' }}>({t.optional})</span></span>
      {live ? (
        <div style={{ display: 'grid', gap: 6, maxWidth: 260 }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 10, background: '#0F172A', transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={capture}><Camera size={14} /> {t.capture}</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={stop}>{t.cancel}</button>
          </div>
        </div>
      ) : value ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <img src={value} alt={label} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid #E2E8F0' }} />
          <button type="button" className="btn btn-outline btn-sm" onClick={start}><RefreshCw size={13} /> {t.retake}</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(null)} aria-label={`${t.remove} ${label}`}><X size={13} /> {t.remove}</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={start}><Camera size={14} /> {t.take}</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}><ImagePlus size={14} /> {t.choose}</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture={facing} hidden aria-label={`${label} file`} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      {error && <span role="alert" style={{ fontSize: 12, color: '#B91C1C' }}>{error}</span>}
    </div>
  );
}
