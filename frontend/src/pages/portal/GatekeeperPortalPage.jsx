/**
 * IlmForge — Gatekeeper Portal
 * Gatekeepers mark attendance ONLY via barcode scanning
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';

/* ── helpers ──────────────────────────────────────── */
const todayKey = () => {
  const d = new Date();
  return `gk_entries_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    type === 'error' ? '#DC2626' :
    type === 'success' ? '#16A34A' :
    '#D97706';

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
        maxWidth: 340,
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
        ✕
      </button>
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

  /* ── state ── */
  const [scanValue, setScanValue]       = useState('');
  const [searching, setSearching]       = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showEntries, setShowEntries]   = useState(true);
  const [toast, setToast]               = useState(null);
  const [currentTime, setCurrentTime]   = useState(fmtTime());

  /* ── latest entries persisted per day ── */
  const loadEntries = () => {
    try {
      const raw = localStorage.getItem(todayKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const [entries, setEntries] = useState(loadEntries);

  /* ── refs ── */
  const inputRef = useRef(null);

  /* ── auto-focus on mount ── */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ── live clock ── */
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(fmtTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  /* ── re-focus after each scan result ── */
  useEffect(() => {
    if (!searching) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [searching, foundStudent]);

  const showToast = (msg, type = 'info') => setToast({ msg, type });

  /* ── scan / search handler ── */
  const handleScan = async () => {
    const val = scanValue.trim();
    if (!val) return;

    setSearching(true);
    setFoundStudent(null);

    try {
      const res  = await api.get('/students', { params: { search: val, limit: 20 } });
      const list = res.data?.data || [];

      /* prefer exact rollNo match, then name contains, then first result */
      const matched =
        list.find(s => s.rollNo && s.rollNo.toLowerCase() === val.toLowerCase()) ||
        list.find(s => s.name && s.name.toLowerCase().includes(val.toLowerCase())) ||
        list[0] ||
        null;

      if (matched) {
        setFoundStudent(matched);
        setShowStudentInfo(true);

        const entry = {
          id:      Date.now(),
          time:    fmtTime(),
          name:    matched.name    || '—',
          rollNo:  matched.rollNo  || '—',
          class:   matched.class   || matched.className || '—',
          section: matched.section || '—',
          status:  'Present',
        };

        const updated = [entry, ...entries].slice(0, 50);
        setEntries(updated);
        localStorage.setItem(todayKey(), JSON.stringify(updated));

        showToast(`✓ ${matched.name} marked Present`, 'success');
        setShowEntries(true);
      } else {
        showToast('Student not found — card not recognized', 'error');
      }
    } catch {
      showToast('Network error — please try again', 'error');
    } finally {
      setSearching(false);
      setScanValue('');
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') handleScan();
  };

  /* ── close attendance ── */
  const handleClose = () => {
    const ok = window.confirm(
      'Close Attendance Session?\n\nAll recorded entries for today are saved. You will be redirected to the login page.'
    );
    if (ok) navigate('/login');
  };

  /* ── due amount helper ── */
  const getDues = student => student?.totalDue || student?.pendingFees || student?.dueAmount || 0;

  /* ────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#0A1F1C 0%,#0D2B26 40%,#0A1F1C 100%)',
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
        .gk-input::placeholder { color:rgba(148,163,184,0.55); }
        .gk-input:focus { border-color:rgba(74,222,128,0.75) !important; box-shadow:0 0 0 3px rgba(74,222,128,0.12); }
        .gk-scan-btn:hover { opacity:0.88; }
        .gk-close-btn:hover { background:#15803D !important; }
        .gk-collapse:hover { background:rgba(16,185,129,0.13) !important; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ══════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════ */}
      <div
        style={{
          background: 'linear-gradient(90deg,#064E3B,#065F46)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(16,185,129,0.22)',
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
          <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 11, marginTop: 2 }}>
            Digital Attendance System
          </div>
        </div>

        {/* Date + clock */}
        <div style={{ color: '#34D399', fontSize: 11.5, fontWeight: 600, textAlign: 'right', lineHeight: 1.6 }}>
          <div>{new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div style={{ color: '#6EE7B7', fontWeight: 700, fontSize: 12.5 }}>{currentTime}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          padding: '14px 14px 0',
          maxWidth: 640,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >

        {/* ── Yellow info banner ── */}
        <div
          style={{
            background: 'linear-gradient(90deg,#92400E,#B45309)',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 10,
            color: '#FEF3C7',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(180,83,9,0.35)',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>📋 Digital Attendance System &mdash; {schoolName}</span>
          <span style={{ fontWeight: 500, fontSize: 12, color: '#FDE68A' }}>
            {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* ── Green LIVE banner ── */}
        <div
          style={{
            background: 'linear-gradient(90deg,#064E3B,#065F46)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            boxShadow: '0 2px 8px rgba(4,120,87,0.3)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: '#4ADE80', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: 9, height: 9,
                borderRadius: '50%',
                background: '#4ADE80',
                marginRight: 7,
                boxShadow: '0 0 7px #4ADE80',
                animation: 'pulse 1.6s infinite',
                flexShrink: 0,
              }}
            />
            LIVE &mdash; Barcode Machine Attendance
          </div>
          <button
            className="gk-close-btn"
            onClick={handleClose}
            style={{
              background: '#16A34A',
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
            Close Attendance ✓
          </button>
        </div>

        {/* ── Scan Area Card ── */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(16,185,129,0.18)',
            borderRadius: 14,
            padding: '22px 18px',
            marginBottom: 14,
            textAlign: 'center',
          }}
        >
          {/* Avatar placeholder */}
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: foundStudent
                ? 'linear-gradient(135deg,#065F46,#0D9488)'
                : 'rgba(255,255,255,0.07)',
              border: '2px dashed rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: foundStudent ? 22 : 26,
              fontWeight: 800,
              color: '#4ADE80',
              margin: '0 auto 16px',
            }}
          >
            {foundStudent
              ? (foundStudent.name || '?').charAt(0).toUpperCase()
              : '👤'}
          </div>

          {/* Input + button */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              ref={inputRef}
              className="gk-input"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '2px solid rgba(16,185,129,0.35)',
                borderRadius: 10,
                padding: '13px 16px',
                color: '#F0FDF4',
                fontSize: 15,
                fontFamily: 'inherit',
                outline: 'none',
                caretColor: '#4ADE80',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              type="text"
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Waiting for card scanning ...."
              autoComplete="off"
              spellCheck={false}
              disabled={searching}
            />
            <button
              className="gk-scan-btn"
              onClick={handleScan}
              disabled={searching}
              title="Scan / Search"
              style={{
                background: 'linear-gradient(135deg,#EA580C,#F97316)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '0 18px',
                cursor: searching ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 20,
                fontFamily: 'inherit',
                opacity: searching ? 0.6 : 1,
                transition: 'opacity 0.15s',
                flexShrink: 0,
                minWidth: 52,
              }}
            >
              {searching ? '⏳' : '🔍'}
            </button>
          </div>

          {/* Large illustration */}
          <div
            style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'radial-gradient(circle,#DC2626 0%,#991B1B 70%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 4px 22px rgba(220,38,38,0.45)',
            }}
          >
            <span style={{ fontSize: 48, lineHeight: 1 }}>📱</span>
          </div>

          {/* Prompt text */}
          <div
            style={{
              color: searching ? '#4ADE80' : '#94A3B8',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {searching
              ? 'Searching student record...'
              : 'Scan Student ID Card Into Barcode Machine...!'}
          </div>
        </div>

        {/* ══════════════════════════════════════
            STUDENT INFORMATION (collapsible)
        ══════════════════════════════════════ */}
        <div style={{ marginBottom: 12 }}>
          <div
            className="gk-collapse"
            onClick={() => setShowStudentInfo(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '11px 15px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: showStudentInfo ? '10px 10px 0 0' : 10,
              fontWeight: 700,
              fontSize: 13.5,
              color: '#34D399',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{showStudentInfo ? '⊖' : '⊕'}</span>
            <span>Student Information</span>
            {foundStudent && (
              <span style={{ marginLeft: 'auto', color: '#4ADE80', fontSize: 12, fontWeight: 600 }}>
                ● {foundStudent.name}
              </span>
            )}
          </div>

          {showStudentInfo && (
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(16,185,129,0.15)',
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
                    ['Student',        foundStudent.name       || '—'],
                    ['Roll No',        foundStudent.rollNo     || '—'],
                    ['Parent / Father',foundStudent.fatherName || foundStudent.parentName || '—'],
                    ['Class / Section',`${foundStudent.class || foundStudent.className || '—'} / ${foundStudent.section || '—'}`],
                    ['Campus',         foundStudent.campus?.name || foundStudent.campusName || '—'],
                    ['Dues',           <span style={{ color: '#F87171', fontWeight: 700 }}>{Rs(getDues(foundStudent))}</span>],
                  ].map(([label, val], i, arr) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
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

        {/* ══════════════════════════════════════
            LATEST ENTRIES (collapsible)
        ══════════════════════════════════════ */}
        <div style={{ marginBottom: 20 }}>
          <div
            className="gk-collapse"
            onClick={() => setShowEntries(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '11px 15px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: showEntries ? '10px 10px 0 0' : 10,
              fontWeight: 700,
              fontSize: 13.5,
              color: '#34D399',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{showEntries ? '⊖' : '⊕'}</span>
            <span>Latest Entries</span>
            <span style={{ marginLeft: 'auto', color: '#94A3B8', fontSize: 12, fontWeight: 600 }}>
              {entries.length} scan{entries.length !== 1 ? 's' : ''} today
            </span>
          </div>

          {showEntries && (
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                overflow: 'hidden',
              }}
            >
              {entries.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: '18px' }}>
                  No entries yet. Scan a student card to record attendance.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        {['Time', 'Name', 'Roll', 'Class', 'Status'].map(h => (
                          <th
                            key={h}
                            style={{
                              background: 'rgba(16,185,129,0.12)',
                              color: '#4ADE80',
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
                      {entries.map((e, i) => (
                        <tr
                          key={e.id}
                          style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                        >
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#6EE7B7', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {e.time}
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, color: '#F0FDF4', whiteSpace: 'nowrap' }}>
                            {e.name}
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94A3B8' }}>
                            {e.rollNo}
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                            {e.class}{e.section && e.section !== '—' ? ` / ${e.section}` : ''}
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span
                              style={{
                                background: 'rgba(22,163,74,0.2)',
                                color: '#4ADE80',
                                border: '1px solid rgba(74,222,128,0.35)',
                                borderRadius: 6,
                                padding: '2px 8px',
                                fontWeight: 700,
                                fontSize: 11.5,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Present ✓
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <div
        style={{
          background: 'rgba(0,0,0,0.35)',
          borderTop: '1px solid rgba(16,185,129,0.12)',
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
        <div style={{ color: '#34D399', fontWeight: 700, fontSize: 12.5 }}>
          Running Session: 2025-2026 &#9660;
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="#"
            onClick={e => e.preventDefault()}
            style={{ color: '#4ADE80', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}
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
