/**
 * IlmForge — Timetable Page (School Mentor Style)
 * Day tabs: Mon | Tue | Wed | Thu | Fri | Sat
 * Table per day: S.No., Class, Section, Actions (Print, Download, Update)
 * Update modal: inline period editor per class/section/day
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Printer, Download, Clock, Plus, Trash2, X, Copy, RefreshCw } from 'lucide-react';
import api from '../../api/client';

/* ─── Constants ─────────────────────────────────── */
const DAYS = [
  { key: 'Monday',    short: 'Mon' },
  { key: 'Tuesday',   short: 'Tue' },
  { key: 'Wednesday', short: 'Wed' },
  { key: 'Thursday',  short: 'Thu' },
  { key: 'Friday',    short: 'Fri' },
  { key: 'Saturday',  short: 'Sat' },
];

const NAVY   = '#1B2F6E';
const NAVY_L = '#2A4080';
const NAVY_BG = '#EEF1F9';

/* ─── Helpers ───────────────────────────────────── */
function emptyPeriod() {
  return { _tempId: Math.random().toString(36).slice(2), startTime: '', endTime: '', subject: '', teacherName: '' };
}

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function TimetablePage() {
  const qc = useQueryClient();

  /* Day tab state */
  const [activeDay, setActiveDay] = useState('Monday');

  /* Modal state: null | { classId, sectionId, className, sectionName } */
  const [modal, setModal] = useState(null);

  /* Periods being edited inside the modal (local state) */
  const [periods, setPeriods] = useState([]);

  /* Track which db ids are being deleted (to show spinner) */
  const [deletingIds, setDeletingIds] = useState(new Set());

  /* ── Fetch classes (with sections) ── */
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });

  /* Build flat list of class+section rows */
  const classRows = [];
  (classes || []).forEach(cls => {
    if (!cls.sections || cls.sections.length === 0) {
      classRows.push({ classId: cls.id, className: cls.name, sectionId: null, sectionName: '—' });
    } else {
      cls.sections.forEach(sec => {
        classRows.push({ classId: cls.id, className: cls.name, sectionId: sec.id, sectionName: sec.name });
      });
    }
  });

  /* ── Fetch all timetable entries for current day ── */
  const { data: dayEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['timetable', activeDay],
    queryFn: () => api.get('/timetable', { params: { day: activeDay } }).then(r => r.data.data || []),
    staleTime: 0,
  });

  /* ── Fetch entries for the modal class/section (all days, for Copy from Mon) ── */
  const { data: modalAllEntries = [] } = useQuery({
    queryKey: ['timetable-modal', modal?.classId, modal?.sectionId],
    queryFn: () => {
      const params = { classId: modal.classId };
      if (modal.sectionId) params.sectionId = modal.sectionId;
      return api.get('/timetable', { params }).then(r => r.data.data || []);
    },
    enabled: !!modal,
    staleTime: 0,
  });

  /* ── Save mutation: POST ── */
  const saveMutation = useMutation({
    mutationFn: (data) => api.post('/timetable', data),
    onError: () => toast.error('Failed to save entry'),
  });

  /* ── Delete mutation: DELETE ── */
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/timetable/${id}`),
    onError: () => toast.error('Failed to delete entry'),
  });

  /* ── Open modal ── */
  const openModal = useCallback((row) => {
    setModal(row);
    // Load existing entries for this class/section/day into local state
    const existing = (dayEntries || []).filter(e =>
      e.classId === row.classId &&
      (row.sectionId == null ? !e.sectionId : e.sectionId === row.sectionId)
    );
    if (existing.length > 0) {
      setPeriods(existing.map(e => ({
        id: e.id,
        startTime: e.startTime || '',
        endTime:   e.endTime   || '',
        subject:   e.subject   || '',
        teacherName: e.teacherName || '',
      })));
    } else {
      setPeriods([emptyPeriod()]);
    }
  }, [dayEntries]);

  /* ── Close modal — saves automatically ── */
  const closeModal = useCallback(async () => {
    if (!modal) return;

    const { classId, sectionId } = modal;

    // Find which db entries currently exist for this class/section/day
    const existingDbEntries = (dayEntries || []).filter(e =>
      e.classId === classId &&
      (sectionId == null ? !e.sectionId : e.sectionId === sectionId)
    );

    // Determine ids to delete (ones in db but not in current periods)
    const currentIds = new Set(periods.filter(p => p.id).map(p => p.id));
    const toDelete = existingDbEntries.filter(e => !currentIds.has(e.id));

    // Delete removed entries
    const deletePromises = toDelete.map(e => deleteMutation.mutateAsync(e.id));

    // Save new/updated periods
    const savePromises = periods.map((p, idx) => {
      const payload = {
        classId,
        sectionId: sectionId || undefined,
        day: activeDay,
        periodNo: idx + 1,
        subject: p.subject,
        teacherName: p.teacherName,
        startTime: p.startTime,
        endTime: p.endTime,
      };
      if (p.id) {
        // Update existing via PUT
        return api.put(`/timetable/${p.id}`, payload);
      } else {
        return saveMutation.mutateAsync(payload);
      }
    });

    try {
      await Promise.all([...deletePromises, ...savePromises]);
      toast.success('Timetable saved');
    } catch {
      toast.error('Some entries failed to save');
    }

    // Invalidate queries
    qc.invalidateQueries({ queryKey: ['timetable', activeDay] });
    qc.invalidateQueries({ queryKey: ['timetable-modal', classId, sectionId] });

    setModal(null);
    setPeriods([]);
  }, [modal, activeDay, periods, dayEntries, deleteMutation, saveMutation, qc]);

  /* ── Add period row ── */
  const addPeriod = () => setPeriods(prev => [...prev, emptyPeriod()]);

  /* ── Delete period row ── */
  const deletePeriodRow = async (idx) => {
    const p = periods[idx];
    if (p.id) {
      setDeletingIds(prev => new Set(prev).add(p.id));
      try {
        await deleteMutation.mutateAsync(p.id);
        qc.invalidateQueries({ queryKey: ['timetable', activeDay] });
      } finally {
        setDeletingIds(prev => { const s = new Set(prev); s.delete(p.id); return s; });
      }
    }
    setPeriods(prev => prev.filter((_, i) => i !== idx));
  };

  /* ── Update period field ── */
  const updatePeriod = (idx, field, value) => {
    setPeriods(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  /* ── Determine previous day ── */
  const getPreviousDay = useCallback((dayKey) => {
    const idx = DAYS.findIndex(d => d.key === dayKey);
    if (idx <= 0) return null;
    return DAYS[idx - 1];
  }, []);

  /* ── Copy from previous day ── */
  const copyFromPreviousDay = useCallback(() => {
    const prevDay = getPreviousDay(activeDay);
    if (!prevDay) return;

    const prevEntries = (modalAllEntries || []).filter(e =>
      e.day === prevDay.key &&
      e.classId === modal?.classId &&
      (modal?.sectionId == null ? !e.sectionId : e.sectionId === modal?.sectionId)
    );
    if (!prevEntries.length) {
      toast.error(`No ${prevDay.key} entries to copy`);
      return;
    }
    setPeriods(prevEntries.map(e => ({
      _tempId: Math.random().toString(36).slice(2),
      startTime: e.startTime || '',
      endTime:   e.endTime   || '',
      subject:   e.subject   || '',
      teacherName: e.teacherName || '',
    })));
    toast.success(`Copied from ${prevDay.key}`);
  }, [activeDay, modal, modalAllEntries, getPreviousDay]);

  /* ── Print all classes ── */
  const printAll = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = classRows;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Timetable — ${activeDay}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 12mm; background: #fff; }
    h1 { font-size: 16pt; color: #1B2F6E; margin-bottom: 4px; }
    p  { font-size: 10pt; color: #6B7280; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 18px; }
    th { background: #1B2F6E; color: #fff; padding: 6px 8px; text-align: left; }
    td { padding: 6px 8px; border: 1px solid #D1D5DB; }
    tr:nth-child(even) td { background: #F9FAFB; }
    h2 { font-size: 12pt; color: #1B2F6E; margin-bottom: 6px; border-left: 4px solid #1B2F6E; padding-left: 8px; }
    @media print { @page { size: A4 landscape; margin: 10mm; } }
  </style>
</head>
<body>
  <h1>Class Timetable — ${activeDay}</h1>
  <p>Printed: ${new Date().toLocaleString()}</p>
  ${rows.map(row => {
    const entries = (dayEntries || []).filter(e =>
      e.classId === row.classId &&
      (row.sectionId == null ? !e.sectionId : e.sectionId === row.sectionId)
    ).sort((a, b) => a.periodNo - b.periodNo);
    return `<h2>${row.className} — Section ${row.sectionName}</h2>
    <table>
      <thead><tr><th>S.No.</th><th>Start Time</th><th>End Time</th><th>Subject</th><th>Teacher</th></tr></thead>
      <tbody>${entries.length
        ? entries.map((e, i) => `<tr><td>${i+1}</td><td>${e.startTime||'—'}</td><td>${e.endTime||'—'}</td><td>${e.subject||'—'}</td><td>${e.teacherName||'—'}</td></tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:#9CA3AF">No entries</td></tr>'
      }</tbody>
    </table>`;
  }).join('')}
  <script>window.onload=()=>window.print();<\/script>
</body>
</html>`);
    win.document.close();
  };

  /* ── Print single class ── */
  const printSingle = (row) => {
    const entries = (dayEntries || []).filter(e =>
      e.classId === row.classId &&
      (row.sectionId == null ? !e.sectionId : e.sectionId === row.sectionId)
    ).sort((a, b) => a.periodNo - b.periodNo);

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Timetable — ${row.className} ${row.sectionName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 12mm; }
    h1 { font-size: 16pt; color: #1B2F6E; margin-bottom: 4px; }
    p  { font-size: 10pt; color: #6B7280; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #1B2F6E; color: #fff; padding: 7px 10px; text-align: left; }
    td { padding: 7px 10px; border: 1px solid #D1D5DB; }
    tr:nth-child(even) td { background: #F9FAFB; }
    @media print { @page { size: A4; margin: 12mm; } }
  </style>
</head>
<body>
  <h1>Time Table for Class ${row.className} Section ${row.sectionName}</h1>
  <p>${activeDay} &nbsp;|&nbsp; Printed: ${new Date().toLocaleString()}</p>
  <table>
    <thead><tr><th>S.No.</th><th>Start Time</th><th>End Time</th><th>Subject</th><th>Teacher</th></tr></thead>
    <tbody>${entries.length
      ? entries.map((e, i) => `<tr><td>${i+1}</td><td>${e.startTime||'—'}</td><td>${e.endTime||'—'}</td><td>${e.subject||'—'}</td><td>${e.teacherName||'—'}</td></tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#9CA3AF">No entries for this day</td></tr>'
    }</tbody>
  </table>
  <script>window.onload=()=>window.print();<\/script>
</body>
</html>`);
    win.document.close();
  };

  /* ── Download single class as CSV ── */
  const downloadCSV = (row) => {
    const entries = (dayEntries || []).filter(e =>
      e.classId === row.classId &&
      (row.sectionId == null ? !e.sectionId : e.sectionId === row.sectionId)
    ).sort((a, b) => a.periodNo - b.periodNo);

    const lines = [
      `Time Table — ${row.className} Section ${row.sectionName} — ${activeDay}`,
      'S.No.,Start Time,End Time,Subject,Teacher',
      ...entries.map((e, i) =>
        `${i+1},"${e.startTime||''}","${e.endTime||''}","${e.subject||''}","${e.teacherName||''}"`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `timetable_${row.className}_${row.sectionName}_${activeDay}.csv`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Entry count for a row ── */
  const entryCount = (row) =>
    (dayEntries || []).filter(e =>
      e.classId === row.classId &&
      (row.sectionId == null ? !e.sectionId : e.sectionId === row.sectionId)
    ).length;

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className="page-content fade-up">

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={22} color={NAVY} />
            Time Table
          </h1>
          <p className="page-subtitle">Manage class schedules — day-wise</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['timetable'] });
              toast.success('Timetable refreshed');
            }}
            title="Refresh timetable"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px',
              background: '#fff', color: NAVY,
              border: `1.5px solid ${NAVY}`,
              borderRadius: 8, cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
            }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={printAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 20px',
              background: NAVY, color: '#fff',
              border: 'none', borderRadius: 8,
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}
          >
            <Printer size={15} /> Print All Classes
          </button>
        </div>
      </div>

      {/* ── Day Tabs ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: '#F1F5F9', borderRadius: 10, padding: 4,
        width: 'fit-content',
      }}>
        {DAYS.map(d => (
          <button
            key={d.key}
            onClick={() => setActiveDay(d.key)}
            style={{
              padding: '8px 20px', borderRadius: 7,
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: activeDay === d.key ? NAVY : 'transparent',
              color:      activeDay === d.key ? '#fff' : '#64748B',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 2,
            }}
          >
            {d.short}
            {d.key === 'Friday' && (
              <span style={{ color: '#EF4444', fontSize: 15, lineHeight: 1, fontWeight: 900, marginLeft: 1 }}>*</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Classes Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {classesLoading || entriesLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading...</div>
        ) : classRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
            No classes found. Please add classes and sections first.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: NAVY }}>
                  {['S.No.', 'Class', 'Section', 'Periods', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', color: '#fff',
                      fontWeight: 700, fontSize: 13,
                      textAlign: 'left', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classRows.map((row, idx) => {
                  const count = entryCount(row);
                  return (
                    <tr
                      key={`${row.classId}-${row.sectionId}`}
                      style={{ background: idx % 2 === 0 ? '#fff' : NAVY_BG, transition: 'background 0.1s' }}
                    >
                      {/* S.No. */}
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#64748B', fontSize: 13 }}>
                        {idx + 1}
                      </td>
                      {/* Class */}
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: NAVY, fontSize: 13 }}>
                        {row.className}
                      </td>
                      {/* Section */}
                      <td style={{ padding: '10px 16px', color: '#374151', fontSize: 13 }}>
                        {row.sectionName}
                      </td>
                      {/* Periods count */}
                      <td style={{ padding: '10px 16px', fontSize: 13 }}>
                        {count > 0 ? (
                          <span style={{
                            background: NAVY + '18', color: NAVY,
                            padding: '3px 10px', borderRadius: 50,
                            fontWeight: 700, fontSize: 12,
                          }}>
                            {count} period{count !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {/* Print */}
                          <button
                            title="Print"
                            onClick={() => printSingle(row)}
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: `1px solid ${NAVY}40`,
                              background: '#fff', cursor: 'pointer',
                              color: NAVY, display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 600,
                            }}
                          >
                            <Printer size={13} /> Print
                          </button>
                          {/* Download */}
                          <button
                            title="Download CSV"
                            onClick={() => downloadCSV(row)}
                            style={{
                              padding: '5px 10px', borderRadius: 6,
                              border: `1px solid ${NAVY}40`,
                              background: '#fff', cursor: 'pointer',
                              color: NAVY, display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 600,
                            }}
                          >
                            <Download size={13} /> Download
                          </button>
                          {/* Update */}
                          <button
                            title="Update timetable"
                            onClick={() => openModal(row)}
                            style={{
                              padding: '5px 14px', borderRadius: 6,
                              border: 'none',
                              background: NAVY, cursor: 'pointer',
                              color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 700,
                            }}
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          UPDATE MODAL
      ════════════════════════════════════════ */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            background: '#fff',
            borderRadius: 14,
            width: '100%', maxWidth: 800,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          }}>
            {/* Modal Header */}
            <div style={{
              background: NAVY, color: '#fff',
              padding: '16px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  Time Table for Class {modal.className} Section {modal.sectionName}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  {activeDay} — Edit periods below
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'rgba(255,255,255,0.18)', border: 'none',
                  borderRadius: 6, padding: '6px 14px',
                  color: '#fff', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <X size={14} /> Close
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
              {/* Periods Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: NAVY_BG }}>
                      {['S.No.', 'Start Time', 'End Time', 'Subject', 'Teacher', 'Delete'].map(h => (
                        <th key={h} style={{
                          padding: '9px 12px', color: NAVY,
                          fontWeight: 700, fontSize: 12,
                          textAlign: 'left', borderBottom: `2px solid ${NAVY}30`,
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p, idx) => (
                      <tr key={p.id || p._tempId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        {/* S.No. */}
                        <td style={{ padding: '8px 12px', color: '#64748B', fontWeight: 600, fontSize: 13 }}>
                          {idx + 1}
                        </td>
                        {/* Start Time */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="time"
                            value={p.startTime}
                            onChange={e => updatePeriod(idx, 'startTime', e.target.value)}
                            style={{
                              border: '1px solid #D1D5DB', borderRadius: 6,
                              padding: '6px 8px', fontSize: 13,
                              outline: 'none', width: '100%',
                              color: '#1E293B',
                            }}
                          />
                        </td>
                        {/* End Time */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="time"
                            value={p.endTime}
                            onChange={e => updatePeriod(idx, 'endTime', e.target.value)}
                            style={{
                              border: '1px solid #D1D5DB', borderRadius: 6,
                              padding: '6px 8px', fontSize: 13,
                              outline: 'none', width: '100%',
                              color: '#1E293B',
                            }}
                          />
                        </td>
                        {/* Subject */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={p.subject}
                            onChange={e => updatePeriod(idx, 'subject', e.target.value)}
                            placeholder="Subject"
                            style={{
                              border: '1px solid #D1D5DB', borderRadius: 6,
                              padding: '6px 10px', fontSize: 13,
                              outline: 'none', width: '100%',
                              color: '#1E293B',
                            }}
                          />
                        </td>
                        {/* Teacher */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={p.teacherName}
                            onChange={e => updatePeriod(idx, 'teacherName', e.target.value)}
                            placeholder="Teacher"
                            style={{
                              border: '1px solid #D1D5DB', borderRadius: 6,
                              padding: '6px 10px', fontSize: 13,
                              outline: 'none', width: '100%',
                              color: '#1E293B',
                            }}
                          />
                        </td>
                        {/* Delete */}
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => deletePeriodRow(idx)}
                            disabled={deletingIds.has(p.id)}
                            style={{
                              background: '#FFF5F5', border: '1px solid #FCA5A5',
                              borderRadius: 6, padding: '5px 9px',
                              cursor: 'pointer', color: '#DC2626',
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: 12,
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {periods.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                          No periods yet. Click "+ Add Period" below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  onClick={addPeriod}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 7,
                    background: NAVY, color: '#fff',
                    border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                  }}
                >
                  <Plus size={14} /> Add Period
                </button>

                {getPreviousDay(activeDay) && (
                  <button
                    onClick={copyFromPreviousDay}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', borderRadius: 7,
                      background: '#fff', color: NAVY,
                      border: `1.5px solid ${NAVY}`,
                      cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    }}
                  >
                    <Copy size={14} /> Copy from {getPreviousDay(activeDay)?.short}
                  </button>
                )}

                <button
                  onClick={closeModal}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 18px', borderRadius: 7,
                    background: '#F1F5F9', color: '#374151',
                    border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    marginLeft: 'auto',
                  }}
                >
                  <X size={14} /> Close &amp; Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
