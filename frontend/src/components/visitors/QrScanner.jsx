/**
 * Reads a visitor slip's QR code with the camera (the browser's own reader
 * where there is one, else jsQR, which works with no internet). A USB
 * scanner needs none of this: it types the code into the box like a keyboard.
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function QrScanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stream = null;
    let stopped = false;
    let timer = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) return;
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play().catch(() => {});
        let detector = null;
        let jsQR = null;
        try {
          if ('BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
            detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          }
        } catch { detector = null; }
        if (!detector) jsQR = (await import('jsqr')).default;
        const c = document.createElement('canvas');
        const tick = async () => {
          if (stopped) return;
          let code = null;
          if (v.videoWidth) {
            try {
              if (detector) code = (await detector.detect(v))[0]?.rawValue || null;
              else {
                c.width = v.videoWidth; c.height = v.videoHeight;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(v, 0, 0);
                const img = ctx.getImageData(0, 0, c.width, c.height);
                code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data || null;
              }
            } catch { code = null; }
          }
          if (code && !stopped) { stopped = true; onCode(code); return; }
          timer = setTimeout(tick, 220);
        };
        tick();
      } catch {
        setError('The camera could not be opened. Type the slip number instead.');
      }
    })();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 10, background: '#0F172A' }} />
        <button type="button" onClick={onClose} aria-label="Close the camera" style={{ position: 'absolute', top: 6, right: 6, border: 0, borderRadius: 999, background: 'rgba(15,23,42,.7)', color: '#fff', width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={15} /></button>
      </div>
      <span style={{ fontSize: 12, color: error ? '#B91C1C' : '#64748B' }}>{error || 'Hold the slip\'s QR code in front of the camera.'}</span>
    </div>
  );
}
