import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Scan, Search, X, CheckCircle, User, Clock, RefreshCw, Camera, CameraOff } from 'lucide-react';

// ── Success beep via Web Audio API ──────────────────────────────────────────
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {
    // Audio not supported — silently ignore
  }
}

export default function BarcodeScanPage() {
  const navigate   = useNavigate();
  const inputRef   = useRef(null);
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);

  const [inputVal, setInputVal]       = useState('');
  const [scanning, setScanning]       = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [student, setStudent]         = useState(null);
  const [studentOpen, setStudentOpen] = useState(true);
  const [entriesOpen, setEntriesOpen] = useState(true);
  const [entries, setEntries]         = useState([]);   // last 10 scans (local list)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);

  // Camera states
  const [cameraOn, setCameraOn]       = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);

  const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';

  const todayDate = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  // ── Camera helpers ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access and try again.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not start camera: ' + err.message;
      setCameraError(msg);
      setCameraOn(false);
    } finally {
      setCameraLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setCameraError('');
  }, []);

  // Stop camera when component unmounts
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Load today's barcode entries from backend ─────────────────────────────
  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const res = await api.get('/attendance', {
        params: { date: todayDate, method: 'barcode' },
      });
      const raw =
        res.data?.data?.attendances ||
        res.data?.data?.records ||
        res.data?.data ||
        res.data ||
        [];
      const normalised = Array.isArray(raw)
        ? raw
            .slice(-10)           // keep only last 10
            .reverse()            // newest first
            .map((r) => ({
              id:        r.id || r._id,
              name:      r.student?.name || r.studentName || r.name || '—',
              rollNo:    r.student?.rollNo || r.student?.admissionNo || r.rollNo || r.admissionNo || '—',
              className: r.student?.class?.name || r.student?.className || r.className || '—',
              photo:     r.student?.photo || r.student?.photoUrl || r.photoUrl || null,
              status:    r.status || 'Present',
              time:      r.time
                ? r.time
                : r.createdAt || r.timestamp
                ? new Date(r.createdAt || r.timestamp).toLocaleTimeString('en-PK', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })
                : '—',
            }))
        : [];
      setEntries(normalised);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load today's entries");
    } finally {
      setEntriesLoading(false);
    }
  }, [todayDate]);

  // Focus input and load entries on mount
  useEffect(() => {
    inputRef.current?.focus();
    loadEntries();
  }, [loadEntries]);

  // ── Trigger success flash animation ───────────────────────────────────────
  function triggerSuccessFlash() {
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 900);
  }

  // ── Handle barcode scan ────────────────────────────────────────────────────
  async function handleScan() {
    const barcode = inputVal.trim();
    if (!barcode) return;

    setScanning(true);
    try {
      // Step 1 – look up student by roll/barcode
      let foundStudent = null;
      try {
        const lookup = await api.get('/attendance/student-by-barcode', {
          params: { roll: barcode },
        });
        foundStudent = lookup.data?.data || lookup.data || null;
      } catch (_) {
        // endpoint may not exist; fall through and let barcode-scan provide student info
      }

      // Step 2 – mark attendance
      const res = await api.post('/attendance/barcode-scan', {
        barcode,
        date: todayDate,
      });

      const data = res.data?.data || res.data || {};
      const scannedStudent = foundStudent || data.student || data;
      setStudent(scannedStudent);
      setStudentOpen(true);

      const studentName = scannedStudent.name || 'Student';
      const className   =
        scannedStudent.class?.name ||
        scannedStudent.className ||
        (typeof scannedStudent.class === 'string' ? scannedStudent.class : '') ||
        '';

      playSuccessSound();
      triggerSuccessFlash();
      toast.success(
        `${studentName}${className ? ' (' + className + ')' : ''} marked Present`,
        { duration: 3000 }
      );

      // Prepend to local recent-scans list (keep max 10)
      const newEntry = {
        id:        scannedStudent.id || scannedStudent._id || Date.now(),
        name:      studentName,
        rollNo:    scannedStudent.rollNo || scannedStudent.admissionNo || barcode,
        className: className || '—',
        photo:     scannedStudent.photo || scannedStudent.photoUrl || null,
        status:    'Present',
        time:      new Date().toLocaleTimeString('en-PK', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
      };
      setEntries((prev) => [newEntry, ...prev].slice(0, 10));
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 404) {
        toast.error('Student not found for this barcode');
      } else if (status === 409) {
        toast.error(msg || 'Attendance already marked for this student today');
      } else {
        toast.error(msg || 'Error recording attendance');
      }
      setStudent(null);
    } finally {
      setScanning(false);
      setInputVal('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleScan();
  }

  function handleCloseAttendance() { setShowCloseConfirm(true); }
  function confirmClose() {
    stopCamera();
    setShowCloseConfirm(false);
    navigate('/attendance');
  }

  // ── Spinner ────────────────────────────────────────────────────────────────
  function Spinner({ size = 16, color = '#fff' }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={2.5} strokeLinecap="round"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-content fade-in"
      style={{ padding: 0, background: '#F1F5F9', minHeight: '100vh' }}
    >
      {/* Success flash overlay */}
      {flashSuccess && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999,
          background: 'rgba(21,128,61,0.18)',
          animation: 'flashFadeOut 0.9s ease forwards',
        }}>
          <style>{`@keyframes flashFadeOut { 0%{opacity:1} 100%{opacity:0} }`}</style>
        </div>
      )}

      {/* Yellow header banner */}
      <div style={{
        background: 'linear-gradient(90deg,#F59E0B,#FBBF24)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Scan size={20} color="#78350F" />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#78350F', letterSpacing: 0.3 }}>
            Digital Attendance System - {schoolName}
          </span>
          <span style={{
            background: '#FEF3C7', color: '#92400E', borderRadius: 6,
            padding: '2px 10px', fontSize: 12, fontWeight: 600, marginLeft: 6,
          }}>
            {todayLabel}
          </span>
        </div>
      </div>

      {/* Green LIVE banner */}
      <div style={{
        background: 'linear-gradient(90deg,#15803D,#16A34A)',
        padding: '9px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: '#86EFAC',
            boxShadow: '0 0 6px #86EFAC', display: 'inline-block',
          }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            LIVE&nbsp;-&nbsp;Barcode Machine Attendance
          </span>
        </div>
        <button onClick={handleCloseAttendance} style={{
          background: '#fff', color: '#15803D', border: 'none', borderRadius: 6,
          padding: '5px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <CheckCircle size={14} /> Close Attendance
        </button>
      </div>

      <div style={{ padding: '20px 20px 30px', maxWidth: 960, margin: '0 auto' }}>

        {/* ── Scan area card ──────────────────────────────────────────────── */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>

          {/* Camera toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Camera size={16} color="#0D9488" /> Camera Feed
            </span>
            <button
              onClick={cameraOn ? stopCamera : startCamera}
              disabled={cameraLoading}
              style={{
                background: cameraOn ? '#FEE2E2' : '#DCFCE7',
                color: cameraOn ? '#B91C1C' : '#15803D',
                border: 'none', borderRadius: 6, padding: '5px 14px',
                fontWeight: 700, fontSize: 12, cursor: cameraLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {cameraLoading ? <Spinner size={13} color="#15803D" /> : cameraOn ? <CameraOff size={13} /> : <Camera size={13} />}
              {cameraLoading ? 'Starting...' : cameraOn ? 'Stop Camera' : 'Start Camera'}
            </button>
          </div>

          {/* Camera viewport */}
          <div style={{
            background: '#0F172A', borderRadius: 10, overflow: 'hidden',
            position: 'relative', marginBottom: 16,
            height: cameraOn ? 240 : 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'height 0.3s ease',
          }}>
            <video
              ref={videoRef}
              muted playsInline autoPlay
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: cameraOn ? 'block' : 'none',
              }}
            />
            {!cameraOn && !cameraError && (
              <div style={{ textAlign: 'center', color: '#64748B' }}>
                <CameraOff size={28} style={{ marginBottom: 6, opacity: 0.4 }} />
                <div style={{ fontSize: 12, opacity: 0.6 }}>Camera is off</div>
              </div>
            )}
            {cameraError && (
              <div style={{ textAlign: 'center', color: '#EF4444', padding: '0 16px' }}>
                <CameraOff size={24} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 12 }}>{cameraError}</div>
              </div>
            )}
            {/* Scan-line overlay when camera active */}
            {cameraOn && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(transparent 45%, rgba(21,128,61,0.18) 50%, transparent 55%)',
                animation: 'scanLine 2s ease-in-out infinite',
              }}>
                <style>{`@keyframes scanLine { 0%,100%{background-position:0 0} 50%{background-position:0 100%} }`}</style>
              </div>
            )}
          </div>

          {/* Input row */}
          <div style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto 8px' }}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Scan barcode or type roll number manually..."
              autoFocus
              disabled={scanning}
              style={{
                flex: 1, border: `2px solid ${flashSuccess ? '#15803D' : '#CBD5E1'}`,
                borderRadius: 8, padding: '10px 14px', fontSize: 15,
                fontWeight: 600, outline: 'none', letterSpacing: 1,
                color: '#1E3A5F', background: scanning ? '#F1F5F9' : '#F8FAFC',
                transition: 'border-color 0.3s',
              }}
            />
            <button
              onClick={handleScan}
              disabled={scanning || !inputVal.trim()}
              style={{
                background: scanning ? '#FB923C' : 'linear-gradient(135deg,#F97316,#EA580C)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 18px', cursor: scanning || !inputVal.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontWeight: 700, fontSize: 14, opacity: !inputVal.trim() ? 0.6 : 1,
              }}
            >
              {scanning ? <Spinner size={16} color="#fff" /> : <Search size={16} />}
              {scanning ? 'Scanning...' : 'Search'}
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
            Point a barcode at the camera or type/paste a roll number above and press Enter
          </div>
        </div>

        {/* ── Student Information section ─────────────────────────────────── */}
        <div className="card" style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}>
          <button
            onClick={() => setStudentOpen((v) => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 16px', background: '#F8FAFC', border: 'none',
              borderBottom: studentOpen ? '1px solid #E2E8F0' : 'none',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18, color: '#0D9488', fontWeight: 700, lineHeight: 1 }}>
              {studentOpen ? '⊖' : '⊕'}
            </span>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>
              Student Information
            </span>
            {student && (
              <span style={{
                marginLeft: 8, background: '#DCFCE7', color: '#15803D',
                borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <CheckCircle size={10} /> Marked Present
              </span>
            )}
          </button>

          {studentOpen && (
            <div style={{ padding: '14px 18px' }}>
              {student ? (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Student photo */}
                  <div style={{
                    width: 80, height: 80, borderRadius: 10, overflow: 'hidden',
                    background: '#E2E8F0', border: '2px solid #CBD5E1', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {student.photo || student.photoUrl ? (
                      <img
                        src={student.photo || student.photoUrl}
                        alt={student.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div style={{
                      width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <User size={36} color="#94A3B8" />
                    </div>
                  </div>

                  {/* Info grid */}
                  <div style={{
                    flex: 1, display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10,
                  }}>
                    {[
                      { label: 'Name',           value: student.name },
                      { label: 'Roll No',         value: student.rollNo || student.admissionNo || '—' },
                      { label: 'Parent',          value: student.parentName || student.fatherName || '—' },
                      {
                        label: 'Class / Section',
                        value: (
                          (student.class?.name || student.className || (typeof student.class === 'string' ? student.class : '')) +
                          (student.section?.name || student.sectionName ? ' / ' + (student.section?.name || student.sectionName) : '')
                        ) || '—',
                      },
                      { label: 'Campus', value: student.campus?.name || student.campusName || '—' },
                      { label: 'Dues',   value: student.dues != null ? `Rs. ${student.dues}` : '—', red: true },
                    ].map(({ label, value, red }) => (
                      <div key={label} style={{
                        background: '#F8FAFC', borderRadius: 8,
                        padding: '8px 12px', border: '1px solid #E2E8F0',
                      }}>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: red ? '#DC2626' : '#1E3A5F' }}>
                          {value || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                  No student scanned yet. Scan a card to see information here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Recent Scans (last 10) ─────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', background: '#F8FAFC',
            borderBottom: entriesOpen ? '1px solid #E2E8F0' : 'none',
          }}>
            <button
              onClick={() => setEntriesOpen((v) => !v)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 16px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18, color: '#0D9488', fontWeight: 700, lineHeight: 1 }}>
                {entriesOpen ? '⊖' : '⊕'}
              </span>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>
                Recent Scans
              </span>
              {entries.length > 0 && (
                <span style={{
                  background: '#DCFCE7', color: '#15803D', borderRadius: 20,
                  padding: '2px 10px', fontSize: 11.5, fontWeight: 700,
                }}>
                  {entries.length} / 10
                </span>
              )}
            </button>

            <button
              onClick={loadEntries}
              disabled={entriesLoading}
              title="Refresh from server"
              style={{
                background: 'transparent', border: 'none',
                cursor: entriesLoading ? 'not-allowed' : 'pointer',
                padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5,
                color: '#0D9488', fontWeight: 600, fontSize: 12,
              }}
            >
              {entriesLoading ? <Spinner size={14} color="#0D9488" /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>

          {entriesOpen && (
            entriesLoading ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '24px 0', color: '#64748B', fontSize: 13,
              }}>
                <Spinner size={18} color="#0D9488" /> Loading entries...
              </div>
            ) : entries.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No scans yet today. Entries will appear here after scanning.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9' }}>
                      {['#', 'Photo', 'Time', 'Name', 'Roll No', 'Class', 'Status'].map((h) => (
                        <th key={h} style={{
                          padding: '9px 12px', textAlign: 'left', fontWeight: 700,
                          color: '#64748B', fontSize: 11.5, borderBottom: '1px solid #E2E8F0',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={e.id || i} style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: i === 0 ? '#F0FDF4' : i % 2 === 0 ? '#fff' : '#F8FAFC',
                        transition: 'background 0.3s',
                      }}>
                        <td style={{ padding: '7px 12px', color: '#94A3B8', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                            background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1.5px solid #CBD5E1',
                          }}>
                            {e.photo ? (
                              <img src={e.photo} alt={e.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(ev) => { ev.target.style.display = 'none'; }}
                              />
                            ) : (
                              <User size={16} color="#94A3B8" />
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '7px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} color="#94A3B8" /> {e.time}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', fontWeight: 600, color: '#1E3A5F' }}>{e.name}</td>
                        <td style={{ padding: '7px 12px', color: '#475569', fontFamily: 'monospace' }}>{e.rollNo}</td>
                        <td style={{ padding: '7px 12px', color: '#475569' }}>{e.className}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{
                            background: '#DCFCE7', color: '#15803D', borderRadius: 20,
                            padding: '2px 10px', fontSize: 11, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            <CheckCircle size={10} /> {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{
            background: '#1E3A5F', color: '#fff', borderRadius: 6,
            padding: '6px 18px', fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            Running Session: 2025-2026
            <span style={{ fontSize: 11 }}>&#9660;</span>
          </span>
        </div>
      </div>

      {/* Close confirm modal */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '28px 32px',
            maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <X size={24} color="#DC2626" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1E3A5F', marginBottom: 8 }}>
              Close Attendance Session?
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 22, lineHeight: 1.6 }}>
              Are you sure you want to close the barcode attendance session? All scanned entries have been saved to the server.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowCloseConfirm(false)} style={{
                background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 7,
                padding: '9px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={confirmClose} style={{
                background: 'linear-gradient(135deg,#DC2626,#B91C1C)', color: '#fff',
                border: 'none', borderRadius: 7, padding: '9px 22px',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                Yes, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
