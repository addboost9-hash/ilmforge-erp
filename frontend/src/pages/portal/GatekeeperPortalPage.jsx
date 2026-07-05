/**
 * IlmForge — Gatekeeper Portal  (Enterprise Theme)
 * Dark theme updated to use dark navy #1B2F6E
 * Accent / active states: cyan #00c0ef
 * Input field: white with dark navy border on focus
 * Student found card: dark navy card with white text and cyan accent
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';

/* ── Enterprise theme tokens ─────────────────────────────── */
const NAVY = '#1B2F6E';
const CYAN = '#00c0ef';

/* ── date helpers ────────────────────────────── */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = () =>
  new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const fmtTime = () =>
  new Date().toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');

/* ── Toast component ──────────────────────────────── */
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    type === 'error'   ? '#DC2626' :
    type === 'success' ? '#16A34A' :
    type === 'warning' ? '#D97706' :
    CYAN;

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        background: bg,
        color: '#fff',
        padding: '12px 20px',
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 14,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        maxWidth: 360,
        animation: 'slideIn 0.25s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.25)',
          border: 'none',
          borderRadius: 5,
          color: '#fff',
          cursor: 'pointer',
          padding: '2px 8px',
          fontWeight: 700,
          fontFamily: 'inherit',
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        x
      </button>
    </div>
  );
}

/* ── Direction Toggle ─────────────────────────────── */
function DirectionToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {['IN', 'OUT'].map(dir => (
        <button
          key={dir}
          onClick={() => onChange(dir)}
          style={{
            padding: '7px 18px',
            borderRadius: 8,
            border: value === dir
              ? `2px solid ${CYAN}`
              : '2px solid rgba(0,192,239,0.2)',
            background: value === dir
              ? (dir === 'IN' ? `${CYAN}30` : 'rgba(220,38,38,0.22)')
              : 'rgba(255,255,255,0.04)',
            color: value === dir
              ? (dir === 'IN' ? CYAN : '#F87171')
              : '#64748B',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {dir === 'IN' ? 'IN  ->' : '<-  OUT'}
        </button>
      ))}
    </div>
  );
}

/* ── CollapseHeader ───────────────────────────────── */
function CollapseHeader({ open, onToggle, title, badge, children: badgeChildren }) {
  return (
    <div
      className="gk-collapse"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        userSelect: 'none',
        padding: '11px 15px',
        background: `${CYAN}12`,
        border: `1px solid ${CYAN}30`,
        borderRadius: open ? '10px 10px 0 0' : 10,
        fontWeight: 700,
        fontSize: 13.5,
        color: CYAN,
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 16 }}>{open ? '-' : '+'}</span>
      <span>{title}</span>
      {badge != null && (
        <span style={{ marginLeft: 'auto', color: '#94A3B8', fontSize: 12, fontWeight: 600 }}>
          {badge}
        </span>
      )}
      {badgeChildren && <span style={{ marginLeft: badge != null ? 8 : 'auto' }}>{badgeChildren}</span>}
    </div>
  );
}

/* ── Main Component ───────────────────────────────── */
export default function GatekeeperPortalPage() {
  const navigate = useNavigate();
  const { user, branding } = useAuthStore();

  const schoolName =
    branding?.schoolName ||
    localStorage.getItem('registeredSchoolName') ||
    'IlmForge School';
  const logo = branding?.logo || localStorage.getItem('schoolLogoPreview');

  const [activeTab, setActiveTab] = useState('barcode');

  /* barcode scan state */
  const [scanValue, setScanValue]       = useState('');
  const [direction, setDirection]       = useState('IN');
  const [scanning, setScanning]         = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showEntries, setShowEntries]   = useState(true);
  const [entries, setEntries]           = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [presentCount, setPresentCount] = useState(0);

  /* QR gate pass state */
  const [qrValue, setQrValue]           = useState('');
  const [verifying, setVerifying]       = useState(false);
  const [gatePass, setGatePass]         = useState(null);
  const [releasing, setReleasing]       = useState(false);

  /* shared */
  const [toast, setToast]               = useState(null);
  const [currentTime, setCurrentTime]   = useState(fmtTime());

  const barcodeInputRef = useRef(null);
  const qrInputRef      = useRef(null);

  const showToast = useCallback((msg, type = 'info') => setToast({ msg, type }), []);

  /* fetch today's entries */
  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const res = await api.get('/attendance', {
        params: { date: todayISO(), method: 'barcode' },
      });
      const list = res.data?.data || res.data?.attendance || [];
      setEntries(list);
      const presentList = list.filter(e =>
        e.status === 'Present' || e.status === 'present' || e.direction === 'IN'
      );
      setPresentCount(presentList.length);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load today\'s entries';
      showToast(msg, 'error');
    } finally {
      setEntriesLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(fmtTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'barcode' && !scanning) {
      const t = setTimeout(() => barcodeInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [scanning, foundStudent, activeTab]);

  useEffect(() => {
    if (activeTab === 'qr' && !verifying) {
      const t = setTimeout(() => qrInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [verifying, activeTab]);

  useEffect(() => {
    if (activeTab === 'barcode') {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } else {
      setTimeout(() => qrInputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  /* ═══ BARCODE SCAN HANDLER ═══ */
  const handleBarcodeScan = async () => {
    const val = scanValue.trim();
    if (!val) return;

    setScanning(true);
    setFoundStudent(null);

    try {
      const res = await api.post('/attendance/barcode-scan', {
        barcode: val,
        date: todayISO(),
        direction,
      });

      const data = res.data?.data || res.data || {};
      const student = data.student || data;

      setFoundStudent(student);
      setShowStudentInfo(true);
      setShowEntries(true);

      const dirLabel = direction === 'IN' ? 'Entry' : 'Exit';
      showToast(
        `${student.name || 'Student'} marked Present (${dirLabel}) - ${student.class || student.className || ''}`,
        'success'
      );

      await loadEntries();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 404) {
        showToast('Student not found — card not recognized', 'error');
      } else if (status === 409) {
        showToast(msg || 'Already marked for this session', 'warning');
      } else {
        showToast(msg || 'Network error — please try again', 'error');
      }
    } finally {
      setScanning(false);
      setScanValue('');
    }
  };

  const handleBarcodeKeyDown = e => {
    if (e.key === 'Enter') handleBarcodeScan();
  };

  /* ═══ QR GATE PASS HANDLER ═══ */
  const handleQrScan = async () => {
    const val = qrValue.trim();
    if (!val) return;

    setVerifying(true);
    setGatePass(null);

    try {
      const res = await api.get('/gatepass/verify', { params: { qr: val } });
      const pass = res.data?.data || res.data || {};
      setGatePass(pass);
      showToast(`Gate pass verified: ${pass.studentName || 'Student'}`, 'success');
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 404) {
        showToast('Invalid or expired gate pass', 'error');
      } else {
        showToast(msg || 'Failed to verify gate pass', 'error');
      }
    } finally {
      setVerifying(false);
      setQrValue('');
    }
  };

  const handleQrKeyDown = e => {
    if (e.key === 'Enter') handleQrScan();
  };

  const handleRelease = async () => {
    if (!gatePass) return;
    const passId = gatePass._id || gatePass.id;
    if (!passId) {
      showToast('Gate pass ID missing', 'error');
      return;
    }
    setReleasing(true);
    try {
      await api.post(`/gatepass/${passId}/release`);
      showToast(`${gatePass.studentName || 'Student'} released successfully`, 'success');
      setGatePass(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to release gate pass';
      showToast(msg, 'error');
    } finally {
      setReleasing(false);
    }
  };

  const handleClose = () => {
    const ok = window.confirm(
      'Close Attendance Session?\n\nAll recorded entries for today are saved in the database. You will be redirected to the login page.'
    );
    if (ok) navigate('/login');
  };

  const getDues = student => student?.totalDue || student?.pendingFees || student?.dueAmount || 0;

  const entryTime = e => {
    if (e.time) return e.time;
    if (e.scanTime) return new Date(e.scanTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    if (e.createdAt) return new Date(e.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    return '—';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        /* Dark navy background instead of dark green */
        background: `linear-gradient(160deg,${NAVY} 0%,#14204e 40%,${NAVY} 100%)`,
        fontFamily: "'Inter',system-ui,sans-serif",
        color: '#E2E8F0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── global keyframes ── */}
      <style>{`
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn  { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .gk-input::placeholder { color:rgba(148,163,184,0.55); }
        .gk-input:focus { border-color:${CYAN} !important; box-shadow:0 0 0 3px ${CYAN}22; }
        .gk-scan-btn:hover  { opacity:0.88; }
        .gk-close-btn:hover { background:${NAVY} !important; }
        .gk-collapse:hover  { background:${CYAN}1A !important; }
        .gk-tab             { transition: all 0.15s; }
        .gk-tab:hover       { background:${CYAN}18 !important; }
        .gk-refresh:hover   { opacity:0.82; }
        .gk-release:hover   { opacity:0.85; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ══ TOP HEADER ══ */}
      <div
        style={{
          /* Dark navy header */
          background: `linear-gradient(90deg,${NAVY},#243e8f)`,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: `1px solid ${CYAN}30`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0, overflow: 'hidden',
          }}
        >
          {logo
            ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🎓'}
        </div>

        {/* School info */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{schoolName}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
            Digital Attendance System
          </div>
        </div>

        {/* Date + clock */}
        <div style={{ color: CYAN, fontSize: 11.5, fontWeight: 600, textAlign: 'right', lineHeight: 1.6 }}>
          <div>{new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 12.5 }}>{currentTime}</div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div
        style={{
          flex: 1,
          padding: '14px 14px 0',
          maxWidth: 660,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >

        {/* ── Info banner (dark navy with cyan accent) ── */}
        <div
          style={{
            background: `linear-gradient(90deg,${NAVY},#243e8f)`,
            border: `1px solid ${CYAN}30`,
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 10,
            color: '#E2E8F0',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: `0 2px 8px ${NAVY}60`,
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>Digital Attendance System &mdash; {schoolName}</span>
          <span style={{ fontWeight: 500, fontSize: 12, color: CYAN }}>
            {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* ── LIVE banner ── */}
        <div
          style={{
            background: `rgba(27,47,110,0.6)`,
            border: `1px solid ${CYAN}40`,
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            boxShadow: `0 2px 8px ${NAVY}40`,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ color: CYAN, fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 9, height: 9,
                  borderRadius: '50%',
                  background: CYAN,
                  marginRight: 7,
                  boxShadow: `0 0 7px ${CYAN}`,
                  animation: 'pulse 1.6s infinite',
                  flexShrink: 0,
                }}
              />
              LIVE &mdash; Attendance Active
            </div>
            {/* Present count badge */}
            <div
              style={{
                background: `${CYAN}18`,
                border: `1px solid ${CYAN}40`,
                borderRadius: 20,
                padding: '3px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: CYAN,
                whiteSpace: 'nowrap',
              }}
            >
              {presentCount} Present Today
            </div>
          </div>
          <button
            className="gk-close-btn"
            onClick={handleClose}
            style={{
              background: CYAN,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12.5,
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
          >
            Close Attendance
          </button>
        </div>

        {/* ══ TABS ══ */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 14,
            border: `1px solid ${CYAN}30`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {[
            { key: 'barcode', label: 'Barcode Attendance' },
            { key: 'qr',      label: 'QR Gate Pass' },
          ].map((tab, i, arr) => (
            <button
              key={tab.key}
              className="gk-tab"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '11px 0',
                background: activeTab === tab.key
                  ? `${CYAN}22`
                  : 'rgba(255,255,255,0.02)',
                border: 'none',
                borderRight: i < arr.length - 1 ? `1px solid ${CYAN}25` : 'none',
                color: activeTab === tab.key ? CYAN : '#64748B',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: 0.2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: BARCODE ATTENDANCE ══ */}
        {activeTab === 'barcode' && (
          <>
            {/* Scan Area Card */}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${CYAN}25`,
                borderRadius: 14,
                padding: '20px 18px',
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              {/* Avatar placeholder */}
              <div
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  /* dark navy card with cyan accent when student found */
                  background: foundStudent
                    ? `linear-gradient(135deg,${NAVY},#243e8f)`
                    : 'rgba(255,255,255,0.07)',
                  border: `2px dashed ${CYAN}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: foundStudent ? 22 : 26,
                  fontWeight: 800,
                  color: CYAN,
                  margin: '0 auto 14px',
                }}
              >
                {foundStudent
                  ? (foundStudent.name || '?').charAt(0).toUpperCase()
                  : '👤'}
              </div>

              {/* Direction toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <DirectionToggle value={direction} onChange={setDirection} />
              </div>

              {/* Input + button — white input with dark navy border on focus */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  ref={barcodeInputRef}
                  className="gk-input"
                  style={{
                    flex: 1,
                    background: '#fff',
                    border: `2px solid ${NAVY}40`,
                    borderRadius: 10,
                    padding: '13px 16px',
                    color: NAVY,
                    fontSize: 15,
                    fontFamily: 'inherit',
                    outline: 'none',
                    caretColor: CYAN,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  type="text"
                  value={scanValue}
                  onChange={e => setScanValue(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Waiting for card scanning ...."
                  autoComplete="off"
                  spellCheck={false}
                  disabled={scanning}
                />
                <button
                  className="gk-scan-btn"
                  onClick={handleBarcodeScan}
                  disabled={scanning}
                  title="Scan / Search"
                  style={{
                    background: `linear-gradient(135deg,${NAVY},#243e8f)`,
                    color: '#fff',
                    border: `2px solid ${CYAN}50`,
                    borderRadius: 10,
                    padding: '0 18px',
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: 20,
                    fontFamily: 'inherit',
                    opacity: scanning ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                    flexShrink: 0,
                    minWidth: 52,
                  }}
                >
                  {scanning ? '⌛' : '🔍'}
                </button>
              </div>

              {/* Illustration */}
              <div
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: `radial-gradient(circle,${NAVY} 0%,#0a1540 70%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 10px',
                  boxShadow: `0 4px 22px ${NAVY}80`,
                  border: `2px solid ${CYAN}40`,
                }}
              >
                <span style={{ fontSize: 42, lineHeight: 1 }}>📱</span>
              </div>

              {/* Prompt */}
              <div
                style={{
                  color: scanning ? CYAN : '#94A3B8',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                {scanning
                  ? 'Saving to database...'
                  : 'Scan Student ID Card Into Barcode Machine...!'}
              </div>
            </div>

            {/* ── Student Information (collapsible) — dark navy card with white text and cyan accent ── */}
            <div style={{ marginBottom: 12 }}>
              <CollapseHeader
                open={showStudentInfo}
                onToggle={() => setShowStudentInfo(v => !v)}
                title="Student Information"
              >
                {foundStudent && (
                  <span style={{ color: CYAN, fontSize: 12, fontWeight: 600 }}>
                    ● {foundStudent.name}
                  </span>
                )}
              </CollapseHeader>

              {showStudentInfo && (
                <div
                  style={{
                    background: `linear-gradient(135deg,${NAVY}dd,#14204edd)`,
                    border: `1px solid ${CYAN}20`,
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    padding: '14px 15px',
                  }}
                >
                  {!foundStudent ? (
                    <div style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
                      No student scanned yet. Scan a card to see details here.
                    </div>
                  ) : (
                    <>
                      {[
                        ['Student',         foundStudent.name       || '—'],
                        ['Roll No',         foundStudent.rollNo     || '—'],
                        ['Parent / Father', foundStudent.fatherName || foundStudent.parentName || '—'],
                        ['Class / Section', `${foundStudent.class || foundStudent.className || '—'} / ${foundStudent.section || '—'}`],
                        ['Campus',          foundStudent.campus?.name || foundStudent.campusName || '—'],
                        ['Direction',       <span style={{ color: direction === 'IN' ? CYAN : '#F87171', fontWeight: 700 }}>{direction}</span>],
                        ['Dues',            <span style={{ color: '#F87171', fontWeight: 700 }}>{Rs(getDues(foundStudent))}</span>],
                      ].map(([label, val], i, arr) => (
                        <div
                          key={label}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '7px 0',
                            borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                            fontSize: 13,
                            gap: 10,
                          }}
                        >
                          <span style={{ color: '#94A3B8', fontWeight: 500, flexShrink: 0 }}>{label}</span>
                          <span style={{ color: '#F0FDF4', fontWeight: 600, textAlign: 'right' }}>{val}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Today's Entries (collapsible) ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                <div style={{ flex: 1 }}>
                  <CollapseHeader
                    open={showEntries}
                    onToggle={() => setShowEntries(v => !v)}
                    title="Today's Entries"
                    badge={`${entries.length} scan${entries.length !== 1 ? 's' : ''} · ${presentCount} present`}
                  />
                </div>
                <button
                  className="gk-refresh"
                  onClick={loadEntries}
                  disabled={entriesLoading}
                  title="Refresh from server"
                  style={{
                    background: `${CYAN}15`,
                    border: `1px solid ${CYAN}25`,
                    borderLeft: 'none',
                    borderRadius: showEntries ? '0 10px 0 0' : '0 10px 10px 0',
                    color: CYAN,
                    cursor: entriesLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '0 14px',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s',
                    opacity: entriesLoading ? 0.5 : 1,
                  }}
                >
                  {entriesLoading ? '...' : 'Refresh'}
                </button>
              </div>

              {showEntries && (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${CYAN}18`,
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    overflow: 'hidden',
                  }}
                >
                  {entriesLoading ? (
                    <div style={{ color: CYAN, fontSize: 13, textAlign: 'center', padding: '18px' }}>
                      Loading entries...
                    </div>
                  ) : entries.length === 0 ? (
                    <div style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: '18px' }}>
                      No entries yet. Scan a student card to record attendance.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr>
                            {['Time', 'Name', 'Roll', 'Class', 'Dir', 'Status'].map(h => (
                              <th
                                key={h}
                                style={{
                                  background: `${CYAN}15`,
                                  color: CYAN,
                                  fontWeight: 700,
                                  padding: '8px 10px',
                                  textAlign: 'left',
                                  fontSize: 11,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e, i) => {
                            const eName    = e.studentName || e.name || e.student?.name || '—';
                            const eRoll    = e.rollNo || e.student?.rollNo || '—';
                            const eClass   = e.class || e.className || e.student?.class || e.student?.className || '—';
                            const eSection = e.section || e.student?.section || '';
                            const eDir     = e.direction || 'IN';
                            const eStatus  = e.status || 'Present';

                            return (
                              <tr
                                key={e._id || e.id || i}
                                style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                              >
                                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: CYAN, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  {entryTime(e)}
                                </td>
                                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: 600, color: '#F0FDF4', whiteSpace: 'nowrap' }}>
                                  {eName}
                                </td>
                                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#94A3B8' }}>
                                  {eRoll}
                                </td>
                                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                                  {eClass}{eSection && eSection !== '—' ? ` / ${eSection}` : ''}
                                </td>
                                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}>
                                  <span style={{ color: eDir === 'IN' ? CYAN : '#F87171', fontWeight: 700, fontSize: 11 }}>
                                    {eDir}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <span
                                    style={{
                                      background: `${CYAN}20`,
                                      color: CYAN,
                                      border: `1px solid ${CYAN}50`,
                                      borderRadius: 6,
                                      padding: '2px 8px',
                                      fontWeight: 700,
                                      fontSize: 11.5,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {eStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ TAB: QR GATE PASS ══ */}
        {activeTab === 'qr' && (
          <div style={{ marginBottom: 20 }}>
            {/* QR Scan Card */}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${CYAN}25`,
                borderRadius: 14,
                padding: '20px 18px',
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 70, height: 70, borderRadius: '50%',
                  background: `radial-gradient(circle,${NAVY} 0%,#14204e 70%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: `0 4px 22px ${NAVY}80`,
                  border: `2px solid ${CYAN}50`,
                }}
              >
                <span style={{ fontSize: 38, lineHeight: 1 }}>🎫</span>
              </div>

              <div style={{ color: CYAN, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                QR Gate Pass Verification
              </div>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>
                Scan student QR gate pass to verify and release
              </div>

              {/* Input + button — white input with dark navy border on focus */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={qrInputRef}
                  className="gk-input"
                  style={{
                    flex: 1,
                    background: '#fff',
                    border: `2px solid ${NAVY}40`,
                    borderRadius: 10,
                    padding: '13px 16px',
                    color: NAVY,
                    fontSize: 15,
                    fontFamily: 'inherit',
                    outline: 'none',
                    caretColor: CYAN,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  type="text"
                  value={qrValue}
                  onChange={e => setQrValue(e.target.value)}
                  onKeyDown={handleQrKeyDown}
                  placeholder="Scan QR code from gate pass..."
                  autoComplete="off"
                  spellCheck={false}
                  disabled={verifying}
                />
                <button
                  className="gk-scan-btn"
                  onClick={handleQrScan}
                  disabled={verifying}
                  style={{
                    background: `linear-gradient(135deg,${NAVY},#243e8f)`,
                    color: '#fff',
                    border: `2px solid ${CYAN}50`,
                    borderRadius: 10,
                    padding: '0 18px',
                    cursor: verifying ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: 20,
                    fontFamily: 'inherit',
                    opacity: verifying ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                    flexShrink: 0,
                    minWidth: 52,
                  }}
                >
                  {verifying ? '⌛' : '🔍'}
                </button>
              </div>
            </div>

            {/* Gate Pass Info — dark navy card with white text and cyan accent */}
            {gatePass && (
              <div
                style={{
                  background: `linear-gradient(135deg,${NAVY}ee,#14204eee)`,
                  border: `1px solid ${CYAN}40`,
                  borderRadius: 14,
                  padding: '18px 16px',
                  marginBottom: 14,
                }}
              >
                <div style={{ color: CYAN, fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8, height: 8, borderRadius: '50%',
                      background: CYAN,
                      boxShadow: `0 0 6px ${CYAN}`,
                      animation: 'pulse 1.6s infinite',
                    }}
                  />
                  Gate Pass Verified
                </div>

                {[
                  ['Student',       gatePass.studentName || gatePass.student?.name || '—'],
                  ['Roll No',       gatePass.rollNo || gatePass.student?.rollNo || '—'],
                  ['Class',         gatePass.class || gatePass.student?.class || '—'],
                  ['Authorized By', gatePass.authorizedBy || gatePass.issuedBy || '—'],
                  ['Reason',        gatePass.reason || gatePass.purpose || '—'],
                  ['Valid Until',   gatePass.validUntil
                    ? new Date(gatePass.validUntil).toLocaleString('en-PK')
                    : gatePass.expiresAt
                      ? new Date(gatePass.expiresAt).toLocaleString('en-PK')
                      : '—'],
                  ['Status',        <span style={{ color: gatePass.status === 'used' ? '#F87171' : CYAN, fontWeight: 700 }}>
                    {gatePass.status || 'Active'}
                  </span>],
                ].map(([label, val], i, arr) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: i < arr.length - 1 ? `1px solid ${CYAN}15` : 'none',
                      fontSize: 13,
                      gap: 10,
                    }}
                  >
                    <span style={{ color: '#94A3B8', fontWeight: 500, flexShrink: 0 }}>{label}</span>
                    <span style={{ color: '#F0FDF4', fontWeight: 600, textAlign: 'right' }}>{val}</span>
                  </div>
                ))}

                {/* Release button */}
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button
                    className="gk-release"
                    onClick={handleRelease}
                    disabled={releasing || gatePass.status === 'used'}
                    style={{
                      flex: 1,
                      background: releasing || gatePass.status === 'used'
                        ? `${CYAN}40`
                        : `linear-gradient(135deg,${CYAN},#0099c7)`,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 0',
                      cursor: releasing || gatePass.status === 'used' ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {releasing
                      ? 'Releasing...'
                      : gatePass.status === 'used'
                        ? 'Already Released'
                        : 'Release Student'}
                  </button>
                  <button
                    onClick={() => setGatePass(null)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      color: '#94A3B8',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      fontFamily: 'inherit',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {!gatePass && !verifying && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px dashed ${CYAN}25`,
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#475569',
                  fontSize: 13,
                }}
              >
                Scan a student's QR gate pass to verify and release them
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <div
        style={{
          background: `rgba(0,0,0,0.4)`,
          borderTop: `1px solid ${CYAN}18`,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748B',
          gap: 10,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <div style={{ color: CYAN, fontWeight: 700, fontSize: 12.5 }}>
          Running Session: 2025-2026
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="#"
            onClick={e => e.preventDefault()}
            style={{ color: CYAN, fontWeight: 600, textDecoration: 'none', fontSize: 12 }}
          >
            Website
          </a>
          <span style={{ color: '#334155' }}>·</span>
          <span style={{ color: '#94A3B8' }}>{user?.name || 'Gatekeeper'}</span>
          <span style={{ color: '#334155' }}>·</span>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#F87171',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
