import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Scan, Search, X, CheckCircle, User, Clock, RefreshCw } from 'lucide-react';

export default function BarcodeScanPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [inputVal, setInputVal] = useState('');
  const [scanning, setScanning] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [studentOpen, setStudentOpen] = useState(true);
  const [entriesOpen, setEntriesOpen] = useState(true);
  const [entries, setEntries] = useState([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';

  const todayDate = new Date().toISOString().split('T')[0];

  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Load today's barcode entries from backend ──────────────────────────────
  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const res = await api.get('/attendance', {
        params: { date: todayDate, method: 'barcode' },
      });
      // Accept both flat array and nested shapes
      const raw =
        res.data?.data?.attendances ||
        res.data?.data?.records ||
        res.data?.data ||
        res.data ||
        [];
      const normalised = Array.isArray(raw)
        ? raw.map((r) => ({
            id: r.id || r._id,
            name:
              r.student?.name || r.studentName || r.name || '—',
            rollNo:
              r.student?.rollNo ||
              r.student?.admissionNo ||
              r.rollNo ||
              r.admissionNo ||
              '—',
            className:
              r.student?.class?.name ||
              r.student?.className ||
              r.className ||
              '—',
            status: r.status || 'Present',
            time: r.time
              ? r.time
              : r.createdAt || r.timestamp
              ? new Date(r.createdAt || r.timestamp).toLocaleTimeString('en-PK', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '—',
          }))
        : [];
      setEntries(normalised);
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to load today\'s entries';
      toast.error(msg);
    } finally {
      setEntriesLoading(false);
    }
  }, [todayDate]);

  // Focus input and load entries on mount
  useEffect(() => {
    inputRef.current?.focus();
    loadEntries();
  }, [loadEntries]);

  // ── Handle barcode scan ────────────────────────────────────────────────────
  async function handleScan() {
    const barcode = inputVal.trim();
    if (!barcode) return;

    setScanning(true);
    try {
      const res = await api.post('/attendance/barcode-scan', {
        barcode,
        date: todayDate,
      });

      const data = res.data?.data || res.data || {};
      const foundStudent = data.student || data;

      setStudent(foundStudent);
      setStudentOpen(true);

      const studentName = foundStudent.name || 'Student';
      const className =
        foundStudent.class?.name ||
        foundStudent.className ||
        (typeof foundStudent.class === 'string' ? foundStudent.class : '') ||
        '';

      toast.success(
        `${studentName}${className ? ' (' + className + ')' : ''} marked Present`,
        { duration: 3000 }
      );

      // Reload entries list to reflect new record
      await loadEntries();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;

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

  function handleCloseAttendance() {
    setShowCloseConfirm(true);
  }

  function confirmClose() {
    setShowCloseConfirm(false);
    navigate('/attendance');
  }

  // ── Spinner component ──────────────────────────────────────────────────────
  function Spinner({ size = 16, color = '#fff' }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="page-content fade-in"
      style={{ padding: 0, background: '#F1F5F9', minHeight: '100vh' }}
    >
      {/* Yellow header banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Scan size={20} color="#78350F" />
          <span
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: '#78350F',
              letterSpacing: 0.3,
            }}
          >
            Digital Attendance System - {schoolName}
          </span>
          <span
            style={{
              background: '#FEF3C7',
              color: '#92400E',
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 600,
              marginLeft: 6,
            }}
          >
            {todayLabel}
          </span>
        </div>
      </div>

      {/* Green LIVE banner */}
      <div
        style={{
          background: 'linear-gradient(90deg, #15803D, #16A34A)',
          padding: '9px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#86EFAC',
              boxShadow: '0 0 6px #86EFAC',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            LIVE&nbsp;-&nbsp;Barcode Machine Attendance
          </span>
        </div>
        <button
          onClick={handleCloseAttendance}
          style={{
            background: '#fff',
            color: '#15803D',
            border: 'none',
            borderRadius: 6,
            padding: '5px 14px',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <CheckCircle size={14} /> Close Attendance
        </button>
      </div>

      <div style={{ padding: '20px 20px 30px', maxWidth: 960, margin: '0 auto' }}>

        {/* Scan area card */}
        <div
          className="card"
          style={{ textAlign: 'center', padding: '28px 24px 20px', marginBottom: 16 }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: '2px solid #CBD5E1',
            }}
          >
            <User size={30} color="#94A3B8" />
          </div>

          {/* Input row */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              maxWidth: 480,
              margin: '0 auto 20px',
            }}
          >
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Waiting for card scanning ...."
              autoFocus
              disabled={scanning}
              style={{
                flex: 1,
                border: '2px solid #CBD5E1',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 15,
                fontWeight: 600,
                outline: 'none',
                letterSpacing: 1,
                color: '#1E3A5F',
                background: scanning ? '#F1F5F9' : '#F8FAFC',
              }}
            />
            <button
              onClick={handleScan}
              disabled={scanning || !inputVal.trim()}
              style={{
                background:
                  scanning
                    ? '#FB923C'
                    : 'linear-gradient(135deg,#F97316,#EA580C)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                cursor:
                  scanning || !inputVal.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: 14,
                opacity: !inputVal.trim() ? 0.6 : 1,
              }}
            >
              {scanning ? (
                <Spinner size={16} color="#fff" />
              ) : (
                <Search size={16} />
              )}
              {scanning ? 'Scanning...' : 'Search'}
            </button>
          </div>

          {/* Barcode illustration */}
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#DC2626,#B91C1C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 6px 24px rgba(220,38,38,0.35)',
            }}
          >
            <Scan size={52} color="#fff" strokeWidth={1.5} />
          </div>

          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#374151',
              letterSpacing: 0.3,
            }}
          >
            Scan Student ID Card Into Barcode Machine...!
          </div>
        </div>

        {/* Student Information section */}
        <div
          className="card"
          style={{ padding: 0, marginBottom: 14, overflow: 'hidden' }}
        >
          <button
            onClick={() => setStudentOpen((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 16px',
              background: '#F8FAFC',
              border: 'none',
              borderBottom: studentOpen ? '1px solid #E2E8F0' : 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                fontSize: 18,
                color: '#0D9488',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {studentOpen ? '⊖' : '⊕'}
            </span>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}>
              Student Information
            </span>
          </button>

          {studentOpen && (
            <div style={{ padding: '14px 18px' }}>
              {student ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))',
                    gap: 12,
                  }}
                >
                  {[
                    { label: 'Name', value: student.name },
                    {
                      label: 'Roll No',
                      value: student.rollNo || student.admissionNo || '—',
                    },
                    {
                      label: 'Parent',
                      value:
                        student.parentName || student.fatherName || '—',
                    },
                    {
                      label: 'Class / Section',
                      value:
                        (
                          (student.class?.name ||
                            student.className ||
                            (typeof student.class === 'string'
                              ? student.class
                              : '')) +
                          (student.section?.name || student.sectionName
                            ? ' / ' +
                              (student.section?.name || student.sectionName)
                            : '')
                        ) || '—',
                    },
                    {
                      label: 'Campus',
                      value: student.campus?.name || student.campusName || '—',
                    },
                    {
                      label: 'Dues',
                      value:
                        student.dues != null ? `Rs. ${student.dues}` : '—',
                      red: true,
                    },
                  ].map(({ label, value, red }) => (
                    <div
                      key={label}
                      style={{
                        background: '#F8FAFC',
                        borderRadius: 8,
                        padding: '10px 12px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94A3B8',
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: red ? '#DC2626' : '#1E3A5F',
                        }}
                      >
                        {value || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: '#94A3B8',
                    fontSize: 13,
                    textAlign: 'center',
                    padding: '12px 0',
                  }}
                >
                  No student scanned yet. Scan a card to see information here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today's Entries section */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F8FAFC',
              borderBottom: entriesOpen ? '1px solid #E2E8F0' : 'none',
            }}
          >
            <button
              onClick={() => setEntriesOpen((v) => !v)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  color: '#0D9488',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {entriesOpen ? '⊖' : '⊕'}
              </span>
              <span
                style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F' }}
              >
                Today's Entries
              </span>
              {entries.length > 0 && (
                <span
                  style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    borderRadius: 20,
                    padding: '2px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  {entries.length} scanned
                </span>
              )}
            </button>

            {/* Refresh button */}
            <button
              onClick={loadEntries}
              disabled={entriesLoading}
              title="Refresh entries"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: entriesLoading ? 'not-allowed' : 'pointer',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#0D9488',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {entriesLoading ? (
                <Spinner size={14} color="#0D9488" />
              ) : (
                <RefreshCw size={14} />
              )}
              Refresh
            </button>
          </div>

          {entriesOpen && (
            entriesLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '24px 0',
                  color: '#64748B',
                  fontSize: 13,
                }}
              >
                <Spinner size={18} color="#0D9488" />
                Loading entries...
              </div>
            ) : entries.length === 0 ? (
              <div
                style={{
                  color: '#94A3B8',
                  fontSize: 13,
                  textAlign: 'center',
                  padding: '20px 0',
                }}
              >
                No entries yet today.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: '#F1F5F9' }}>
                      {['Time', 'Name', 'Roll No', 'Class', 'Status'].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: '9px 14px',
                              textAlign: 'left',
                              fontWeight: 700,
                              color: '#64748B',
                              fontSize: 12,
                              borderBottom: '1px solid #E2E8F0',
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr
                        key={e.id || i}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: i % 2 === 0 ? '#fff' : '#F8FAFC',
                        }}
                      >
                        <td
                          style={{
                            padding: '8px 14px',
                            color: '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Clock size={12} color="#94A3B8" /> {e.time}
                        </td>
                        <td
                          style={{
                            padding: '8px 14px',
                            fontWeight: 600,
                            color: '#1E3A5F',
                          }}
                        >
                          {e.name}
                        </td>
                        <td style={{ padding: '8px 14px', color: '#475569' }}>
                          {e.rollNo}
                        </td>
                        <td style={{ padding: '8px 14px', color: '#475569' }}>
                          {e.className}
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          <span
                            style={{
                              background: '#DCFCE7',
                              color: '#15803D',
                              borderRadius: 20,
                              padding: '2px 10px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <CheckCircle size={11} /> {e.status}
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
        <div
          style={{
            marginTop: 20,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              background: '#1E3A5F',
              color: '#fff',
              borderRadius: 6,
              padding: '6px 18px',
              fontSize: 13,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Running Session: 2025-2026
            <span style={{ fontSize: 11 }}>&#9660;</span>
          </span>
        </div>
      </div>

      {/* Close confirm modal */}
      {showCloseConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '28px 32px',
              maxWidth: 380,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <X size={24} color="#DC2626" />
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#1E3A5F',
                marginBottom: 8,
              }}
            >
              Close Attendance Session?
            </h3>
            <p
              style={{
                fontSize: 13,
                color: '#64748B',
                marginBottom: 22,
                lineHeight: 1.6,
              }}
            >
              Are you sure you want to close the barcode attendance session? All
              scanned entries have been saved to the server.
            </p>
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'center' }}
            >
              <button
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 7,
                  padding: '9px 22px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmClose}
                style={{
                  background: 'linear-gradient(135deg,#DC2626,#B91C1C)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  padding: '9px 22px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Yes, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
