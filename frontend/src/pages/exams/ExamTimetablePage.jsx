import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Print / PDF ──────────────────────────────────────────────────────────────

function printDateSheet({ examTitle, className, sectionName, entries }) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Date Sheet – ${className} ${sectionName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
  .header { text-align: center; padding: 18px 24px 12px; border-bottom: 3px solid #1B2F6E; }
  .header h1 { font-size: 20px; font-weight: 800; color: #1B2F6E; letter-spacing: 1px; }
  .header h2 { font-size: 14px; color: #444; margin-top: 4px; }
  .meta { display: flex; justify-content: space-between; padding: 10px 24px; background: #f0f4ff; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #1B2F6E; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  tr:nth-child(even) td { background: #f8faff; }
  .footer { text-align: center; padding: 14px; border-top: 2px solid #1B2F6E; font-size: 11px; color: #666; margin-top: 24px; }
  .sign-row { display: flex; justify-content: space-between; padding: 32px 48px 8px; }
  .sign-box { text-align: center; min-width: 160px; }
  .sign-line { border-top: 1px solid #333; padding-top: 4px; font-size: 11px; }
</style>
</head>
<body>
<div class="header">
  <h1>Examination Date Sheet</h1>
  <h2>${examTitle}</h2>
</div>
<div class="meta">
  <span><strong>Class:</strong> ${className}</span>
  <span><strong>Section:</strong> ${sectionName}</span>
  <span><strong>Printed:</strong> ${new Date().toLocaleDateString('en-PK')}</span>
</div>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Subject</th>
      <th>Date</th>
      <th>Time From</th>
      <th>Time To</th>
    </tr>
  </thead>
  <tbody>
    ${entries.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e.subject || '—'}</td>
      <td>${fmtDate(e.date) || '—'}</td>
      <td>${fmt12(e.timeFrom) || '—'}</td>
      <td>${fmt12(e.timeTo) || '—'}</td>
    </tr>`).join('')}
    ${entries.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:#999">No entries</td></tr>' : ''}
  </tbody>
</table>
<div class="sign-row">
  <div class="sign-box"><div class="sign-line">Class Teacher</div></div>
  <div class="sign-box"><div class="sign-line">Principal / Head</div></div>
</div>
<div class="footer">IlmForge School Management System &mdash; Confidential</div>
</body>
</html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ─── Edit Date Sheet Modal ─────────────────────────────────────────────────────

function EditModal({ examId, examTitle, row, onClose, queryClient }) {
  const [rows, setRows] = useState(
    row.entries.length > 0
      ? row.entries.map(e => ({ ...e, _key: e.id }))
      : []
  );
  const [saving, setSaving] = useState({}); // { [key]: bool }
  const [deleting, setDeleting] = useState({});
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [copying, setCopying] = useState(false);
  const keyRef = useRef(-1); // temp keys for new rows

  const invalidate = () => queryClient.invalidateQueries(['datesheet', examId]);

  function addRow() {
    const tmpKey = --keyRef.current;
    setRows(r => [...r, { _key: tmpKey, id: null, subject: '', date: '', timeFrom: '', timeTo: '' }]);
  }

  function updateRow(key, field, val) {
    setRows(r => r.map(x => x._key === key ? { ...x, [field]: val } : x));
  }

  async function saveRow(rowItem) {
    setSaving(s => ({ ...s, [rowItem._key]: true }));
    try {
      if (rowItem.id) {
        // Update existing
        const res = await api.put(`/exams/datesheet/${rowItem.id}`, {
          subject: rowItem.subject,
          date: rowItem.date,
          timeFrom: rowItem.timeFrom,
          timeTo: rowItem.timeTo,
        });
        const updated = res.data.data;
        setRows(r => r.map(x => x._key === rowItem._key ? { ...x, ...updated, _key: rowItem._key } : x));
        toast.success('Entry saved.');
      } else {
        // Create new
        const res = await api.post(`/exams/${examId}/datesheet`, {
          classId: row.classId,
          sectionId: row.sectionId,
          subject: rowItem.subject,
          date: rowItem.date,
          timeFrom: rowItem.timeFrom,
          timeTo: rowItem.timeTo,
        });
        const created = res.data.data;
        setRows(r => r.map(x => x._key === rowItem._key ? { ...x, ...created, _key: rowItem._key } : x));
        toast.success('Entry added.');
      }
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(s => ({ ...s, [rowItem._key]: false }));
    }
  }

  async function deleteRow(rowItem) {
    if (!rowItem.id) {
      // just remove from local state if not yet saved
      setRows(r => r.filter(x => x._key !== rowItem._key));
      return;
    }
    setDeleting(d => ({ ...d, [rowItem._key]: true }));
    try {
      await api.delete(`/exams/datesheet/${rowItem.id}`);
      setRows(r => r.filter(x => x._key !== rowItem._key));
      toast.success('Entry deleted.');
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(d => ({ ...d, [rowItem._key]: false }));
    }
  }

  async function copyToAll() {
    setCopying(true);
    try {
      const res = await api.post(`/exams/${examId}/datesheet/copy-to-all`, {
        fromClassId: row.classId,
        fromSectionId: row.sectionId,
      });
      toast.success(res.data.message || 'Copied to all classes.');
      invalidate();
      setCopyConfirm(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Copy failed.');
    } finally {
      setCopying(false);
    }
  }

  const inputStyle = {
    border: '1px solid #D1D5DB',
    borderRadius: 5,
    padding: '5px 8px',
    fontSize: 12,
    width: '100%',
    outline: 'none',
    background: '#fff',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '90%', maxWidth: 780, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          background: '#1B2F6E', color: '#fff', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Upload date sheet</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              {row.className} &mdash; Section {row.sectionName}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>&#x2715;</button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {/* Table of entries */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', minWidth: 160 }}>Subject</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', minWidth: 130 }}>Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', minWidth: 110 }}>Time From</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', minWidth: 110 }}>Time To</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', width: 80 }}>Save</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', width: 70 }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#94A3B8', fontSize: 13 }}>
                      No entries yet. Click "+ Add New" to add subjects.
                    </td>
                  </tr>
                )}
                {rows.map(r => (
                  <tr key={r._key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        style={inputStyle}
                        placeholder="Subject name"
                        value={r.subject}
                        onChange={e => updateRow(r._key, 'subject', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="date"
                        style={inputStyle}
                        value={r.date}
                        onChange={e => updateRow(r._key, 'date', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="time"
                        style={inputStyle}
                        value={r.timeFrom}
                        onChange={e => updateRow(r._key, 'timeFrom', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="time"
                        style={inputStyle}
                        value={r.timeTo}
                        onChange={e => updateRow(r._key, 'timeTo', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => saveRow(r)}
                        disabled={saving[r._key]}
                        title="Save"
                        style={{
                          background: saving[r._key] ? '#9CA3AF' : '#16A34A',
                          color: '#fff', border: 'none', borderRadius: 5,
                          width: 32, height: 30, cursor: 'pointer', fontSize: 15,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {saving[r._key] ? '…' : '✓'}
                      </button>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => deleteRow(r)}
                        disabled={deleting[r._key]}
                        title="Delete"
                        style={{
                          background: deleting[r._key] ? '#9CA3AF' : '#DC2626',
                          color: '#fff', border: 'none', borderRadius: 5,
                          width: 32, height: 30, cursor: 'pointer', fontSize: 14,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {deleting[r._key] ? '…' : '✕'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New + Copy to All buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              onClick={addRow}
              style={{
                background: '#0D9488', color: '#fff', border: 'none',
                borderRadius: 6, padding: '7px 16px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add New
            </button>
            <button
              onClick={() => setCopyConfirm(true)}
              style={{
                background: '#1B2F6E', color: '#fff', border: 'none',
                borderRadius: 6, padding: '7px 16px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
              }}
            >
              Copy to All Classes
            </button>
            <button
              onClick={() => printDateSheet({
                examTitle,
                className: row.className,
                sectionName: row.sectionName,
                entries: rows,
              })}
              style={{
                background: '#DC2626', color: '#fff', border: 'none',
                borderRadius: 6, padding: '7px 16px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
              }}
            >
              PDF
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: '#F1F5F9', color: '#374151', border: '1px solid #D1D5DB',
            borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          }}>Close</button>
        </div>
      </div>

      {/* Copy Confirm Dialog */}
      {copyConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: 28, maxWidth: 380, width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontWeight: 700, color: '#1B2F6E', fontSize: 16, marginBottom: 10 }}>
              Copy to All Classes?
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
              This will replace the date sheet of <strong>all other classes</strong> with the entries from{' '}
              <strong>{row.className} – {row.sectionName}</strong>. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCopyConfirm(false)}
                disabled={copying}
                style={{
                  background: '#F1F5F9', color: '#374151', border: '1px solid #D1D5DB',
                  borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={copyToAll}
                disabled={copying}
                style={{
                  background: '#1B2F6E', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}
              >
                {copying ? 'Copying…' : 'Yes, Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delete Row Confirm ────────────────────────────────────────────────────────

function DeleteAllConfirm({ row, examId, onClose, queryClient }) {
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      // Delete all entries for this class/section by calling delete for each
      for (const e of row.entries) {
        if (e.id) await api.delete(`/exams/datesheet/${e.id}`);
      }
      toast.success('Date sheet cleared.');
      queryClient.invalidateQueries(['datesheet', examId]);
      onClose();
    } catch (err) {
      toast.error('Delete failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: 28, maxWidth: 380, width: '90%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
      }}>
        <div style={{ fontWeight: 700, color: '#B91C1C', fontSize: 16, marginBottom: 10 }}>
          Delete Date Sheet?
        </div>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
          Delete all {row.entries.length} date sheet entries for{' '}
          <strong>{row.className} – {row.sectionName}</strong>? This cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: '#F1F5F9', color: '#374151', border: '1px solid #D1D5DB',
              borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            style={{
              background: '#DC2626', color: '#fff', border: 'none',
              borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}
          >
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ExamTimetablePage() {
  const queryClient = useQueryClient();
  const [examId, setExamId] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // Fetch exams
  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data),
  });

  const selectedExam = exams.find(e => String(e.id) === String(examId));

  // Fetch date sheet for selected exam
  const { data: datesheet = [], isLoading } = useQuery({
    queryKey: ['datesheet', examId],
    queryFn: () => api.get(`/exams/${examId}/datesheet`).then(r => r.data.data),
    enabled: !!examId,
  });

  function downloadAll() {
    if (!selectedExam) return;
    datesheet.forEach(row => {
      setTimeout(() => {
        printDateSheet({
          examTitle: selectedExam.title,
          className: row.className,
          sectionName: row.sectionName,
          entries: row.entries,
        });
      }, 100);
    });
  }

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: '#F8FAFC' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1B2F6E', margin: 0 }}>Date Sheet</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
            Manage examination date sheets per class and section
          </p>
        </div>
        {examId && datesheet.length > 0 && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={downloadAll}
              style={{
                background: '#DC2626', color: '#fff', border: 'none',
                borderRadius: 7, padding: '8px 18px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
              }}
            >
              PDF All
            </button>
          </div>
        )}
      </div>

      {/* Exam Selector */}
      <div style={{
        background: '#fff', borderRadius: 10, padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20,
        border: '1px solid #E2E8F0',
      }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Select Exam
        </label>
        <select
          value={examId}
          onChange={e => { setExamId(e.target.value); setEditRow(null); }}
          style={{
            border: '1px solid #D1D5DB', borderRadius: 7, padding: '8px 12px',
            fontSize: 13, minWidth: 300, outline: 'none', background: '#fff',
          }}
        >
          <option value="">— Choose an exam —</option>
          {exams.map(ex => (
            <option key={ex.id} value={ex.id}>
              {ex.title}
              {ex.type ? ` (${ex.type})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* No exam selected */}
      {!examId && (
        <div style={{
          background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 700, color: '#1B2F6E', fontSize: 16, marginBottom: 6 }}>
            Select an Exam
          </div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>
            Choose an exam from the dropdown above to manage its date sheet.
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && examId && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #E2E8F0',
            borderTopColor: '#1B2F6E', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', display: 'inline-block',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Date Sheet Table */}
      {!isLoading && examId && datesheet.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1B2F6E' }}>
                  <th style={{ padding: '11px 14px', textAlign: 'left', color: '#fff', fontWeight: 600, fontSize: 12 }}>S.No.</th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', color: '#fff', fontWeight: 600, fontSize: 12 }}>Class Name</th>
                  <th style={{ padding: '11px 14px', textAlign: 'left', color: '#fff', fontWeight: 600, fontSize: 12 }}>Section Name</th>
                  <th style={{ padding: '11px 14px', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 12 }}>Entries</th>
                  <th style={{ padding: '11px 14px', textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: 12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {datesheet.map((row, idx) => (
                  <tr
                    key={`${row.classId}_${row.sectionId}`}
                    style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}
                  >
                    <td style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1B2F6E' }}>{row.className}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{row.sectionName}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {row.entries.length > 0 ? (
                        <span style={{
                          background: '#DCFCE7', color: '#15803D',
                          borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                        }}>
                          {row.entries.length} subject{row.entries.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ color: '#CBD5E1', fontSize: 12 }}>No entries</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Edit */}
                        <button
                          onClick={() => setEditRow(row)}
                          title="Edit date sheet"
                          style={{
                            background: '#0D9488', color: '#fff', border: 'none',
                            borderRadius: 5, padding: '5px 12px', cursor: 'pointer',
                            fontWeight: 600, fontSize: 12,
                          }}
                        >
                          Edit
                        </button>
                        {/* PDF */}
                        <button
                          onClick={() => printDateSheet({
                            examTitle: selectedExam?.title || '',
                            className: row.className,
                            sectionName: row.sectionName,
                            entries: row.entries,
                          })}
                          title="Download PDF"
                          style={{
                            background: '#DC2626', color: '#fff', border: 'none',
                            borderRadius: 5, padding: '5px 12px', cursor: 'pointer',
                            fontWeight: 600, fontSize: 12,
                          }}
                        >
                          PDF
                        </button>
                        {/* Delete */}
                        {row.entries.length > 0 && (
                          <button
                            onClick={() => setDeleteRow(row)}
                            title="Delete date sheet"
                            style={{
                              background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA',
                              borderRadius: 5, padding: '5px 12px', cursor: 'pointer',
                              fontWeight: 600, fontSize: 12,
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state: exam selected but no classes */}
      {!isLoading && examId && datesheet.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, color: '#1B2F6E', fontSize: 16, marginBottom: 6 }}>
            No Classes Found
          </div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>
            Add classes and sections in the Classes module first.
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRow && (
        <EditModal
          examId={examId}
          examTitle={selectedExam?.title || ''}
          row={editRow}
          onClose={() => setEditRow(null)}
          queryClient={queryClient}
        />
      )}

      {/* Delete All Confirm */}
      {deleteRow && (
        <DeleteAllConfirm
          row={deleteRow}
          examId={examId}
          onClose={() => setDeleteRow(null)}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}
