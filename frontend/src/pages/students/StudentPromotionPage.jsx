import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  ArrowRightLeft, RefreshCw, CheckCircle, X, Printer,
  ChevronDown, AlertTriangle, Clock, History, Play,
  Users, TrendingUp, MinusCircle, LogOut,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const pct = (p) => (p == null ? null : parseFloat(p).toFixed(1));

function gradeFromPct(p) {
  if (p == null) return '—';
  if (p >= 80) return 'A+';
  if (p >= 70) return 'A';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  if (p >= 33) return 'E';
  return 'F';
}

function autoAction(p, isHighestClass) {
  if (p == null) return 'promote'; // no result yet — default promote
  if (isHighestClass) return p >= 33 ? 'passout' : 'holdback';
  return p >= 33 ? 'promote' : 'holdback';
}

const ACTION_COLORS = {
  promote:  { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', label: 'Promote' },
  holdback: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'Hold Back' },
  passout:  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'Mark Passout' },
};

// ─── component ──────────────────────────────────────────────────────────────
export default function StudentPromotionPage() {
  const qc = useQueryClient();

  // ── filter state ──
  const [filters, setFilters] = useState({ currentSessionId: '', newSessionId: '', classId: '', sectionFilter: 'all' });

  // ── preview / action state ──
  const [previewRows, setPreviewRows] = useState([]);   // [{student, action, toClassId, toSectionId}]
  const [previewed,   setPreviewed]   = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ── ui state ──
  const [activeTab,      setActiveTab]      = useState('promote');   // 'promote' | 'history'
  const [showFilter,     setShowFilter]     = useState('all');        // 'all'|'promote'|'holdback'|'passout'
  const [selectAll,      setSelectAll]      = useState(false);
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [confirmModal,   setConfirmModal]   = useState(false);
  const [successInfo,    setSuccessInfo]    = useState(null);         // {promoted,held,passout}
  const [histSessionId,  setHistSessionId]  = useState('');

  // ── data queries ──
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/settings/sessions').then(r => r.data.data),
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const { data: historyData, isLoading: histLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['promotion-history', histSessionId],
    queryFn: () => api.get('/students/promotion-history', { params: { sessionId: histSessionId || undefined } }).then(r => r.data.data),
    enabled: activeTab === 'history',
  });

  // ── derived: sections for the selected class ──
  const selectedClass = useMemo(() => (classes || []).find(c => c.id === parseInt(filters.classId)), [classes, filters.classId]);
  const classOrder    = useMemo(() => (classes || []).map(c => c.order ?? c.id).sort((a, b) => a - b), [classes]);
  const isHighestClass = useMemo(() => {
    if (!selectedClass || !classes?.length) return false;
    const maxOrder = Math.max(...(classes.map(c => c.order ?? c.id)));
    return (selectedClass.order ?? selectedClass.id) === maxOrder;
  }, [selectedClass, classes]);

  const nextClass = useMemo(() => {
    if (!selectedClass || !classes?.length) return null;
    const sorted = [...(classes || [])].sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
    const idx = sorted.findIndex(c => c.id === selectedClass.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  }, [selectedClass, classes]);

  const sections = useMemo(() => {
    const base = [{ id: 'all', name: 'All Sections' }];
    return [...base, ...((selectedClass?.sections || []).map(s => ({ id: s.id, name: s.name })))];
  }, [selectedClass]);

  // ── load preview ──
  const loadPreview = async () => {
    if (!filters.classId) { toast.error('Please select a class first.'); return; }
    setLoadingPreview(true);
    try {
      const params = { classId: filters.classId, status: 'active', limit: 200 };
      if (filters.sectionFilter !== 'all') params.sectionId = filters.sectionFilter;
      const res = await api.get('/students', { params });
      const students = res.data.data || [];

      const rows = students.map(st => {
        const p = st.examPercent ?? null;
        const action = autoAction(p, isHighestClass);
        return {
          student: st,
          action,
          toClassId:   action === 'promote' ? (nextClass?.id ?? null) : null,
          toSectionId: null,
          selected: false,
        };
      });

      setPreviewRows(rows);
      setPreviewed(true);
      setSelectedIds(new Set());
      setSelectAll(false);
      setSuccessInfo(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── row action change ──
  const setRowAction = (studentId, action) => {
    setPreviewRows(rows => rows.map(r => {
      if (r.student.id !== studentId) return r;
      return {
        ...r,
        action,
        toClassId: action === 'promote' ? (nextClass?.id ?? null) : null,
      };
    }));
  };

  // ── bulk: promote all passing ──
  const promoteAllPassing = () => {
    setPreviewRows(rows => rows.map(r => {
      const p = r.student.examPercent ?? null;
      if (p == null || p >= 33) {
        return { ...r, action: isHighestClass ? 'passout' : 'promote', toClassId: isHighestClass ? null : (nextClass?.id ?? null) };
      }
      return r;
    }));
    toast.success('Updated all passing students.');
  };

  // ── bulk: hold back all failing ──
  const holdBackAllFailing = () => {
    setPreviewRows(rows => rows.map(r => {
      const p = r.student.examPercent ?? null;
      if (p != null && p < 33) return { ...r, action: 'holdback', toClassId: null };
      return r;
    }));
    toast.success('Updated all failing students.');
  };

  // ── select all toggle ──
  const toggleSelectAll = () => {
    const vis = filteredRows.map(r => r.student.id);
    if (selectAll) {
      setSelectedIds(ids => { const n = new Set(ids); vis.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(ids => { const n = new Set(ids); vis.forEach(id => n.add(id)); return n; });
    }
    setSelectAll(s => !s);
  };

  const toggleSelect = (id) => {
    setSelectedIds(ids => {
      const n = new Set(ids);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // ── filtered rows ──
  const filteredRows = useMemo(() => {
    if (showFilter === 'all') return previewRows;
    return previewRows.filter(r => r.action === showFilter);
  }, [previewRows, showFilter]);

  // ── summary counts ──
  const summary = useMemo(() => ({
    promote:  previewRows.filter(r => r.action === 'promote').length,
    holdback: previewRows.filter(r => r.action === 'holdback').length,
    passout:  previewRows.filter(r => r.action === 'passout').length,
    total:    previewRows.length,
  }), [previewRows]);

  // ── execute mutation ──
  const execute = useMutation({
    mutationFn: (records) => api.post('/students/promote', {
      records,
      fromSessionId: filters.currentSessionId ? parseInt(filters.currentSessionId) : undefined,
      newSessionId:  filters.newSessionId      ? parseInt(filters.newSessionId)      : undefined,
    }),
    onSuccess: (res) => {
      const d = res.data;
      setSuccessInfo({ promoted: d.promoted ?? 0, held: d.held ?? 0, passout: d.passout ?? 0 });
      setConfirmModal(false);
      setPreviewed(false);
      setPreviewRows([]);
      qc.invalidateQueries(['students']);
      qc.invalidateQueries(['promotion-history']);
      toast.success('Promotion executed successfully!');
    },
    onError: err => toast.error(err.response?.data?.message || 'Promotion failed.'),
  });

  const handleExecute = () => {
    const records = previewRows.map(r => ({
      studentId:    r.student.id,
      action:       r.action,
      toClassId:    r.toClassId    ? parseInt(r.toClassId)    : null,
      toSectionId:  r.toSectionId  ? parseInt(r.toSectionId)  : null,
      newSessionId: filters.newSessionId ? parseInt(filters.newSessionId) : null,
    }));
    execute.mutate(records);
  };

  // ── undo mutation ──
  const undoPromotion = useMutation({
    mutationFn: (promotionId) => api.delete(`/students/promotion-history/${promotionId}`),
    onSuccess: () => { toast.success('Promotion undone.'); refetchHistory(); },
    onError: err => toast.error(err.response?.data?.message || 'Undo failed.'),
  });

  // ── render ──
  return (
    <div className="page-content fade-in">

      {/* ── Page Header ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowRightLeft size={22} style={{ color: '#0D9488' }} />
            Student Promotion / End of Year
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
            Move students to the next class at the end of each academic year.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {successInfo && (
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
              <Printer size={14} /> Print Report
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '2px solid #E2E8F0' }}>
        {[
          { key: 'promote', label: 'Execute Promotion', icon: <TrendingUp size={14} /> },
          { key: 'history', label: 'Promotion History', icon: <History size={14} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#0D9488' : '#64748B',
              background: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #0D9488' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB: EXECUTE PROMOTION
      ══════════════════════════════════════════════════ */}
      {activeTab === 'promote' && (
        <>
          {/* ── Success Banner ──────────────────────────── */}
          {successInfo && (
            <div style={{
              background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10,
              padding: '16px 20px', marginBottom: 18,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <CheckCircle size={22} style={{ color: '#16A34A', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#15803D', fontSize: 14 }}>Promotion Executed Successfully!</div>
                <div style={{ color: '#166534', fontSize: 13, marginTop: 2 }}>
                  <strong>{successInfo.promoted}</strong> promoted &nbsp;|&nbsp;
                  <strong>{successInfo.held}</strong> held back &nbsp;|&nbsp;
                  <strong>{successInfo.passout}</strong> marked passout
                </div>
              </div>
              <button onClick={() => setSuccessInfo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* ── Filter Card ─────────────────────────────── */}
          <div className="card" style={{ marginBottom: 16, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F', marginBottom: 14 }}>
              Promotion Filters
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current Session</label>
                <select className="form-select" value={filters.currentSessionId}
                  onChange={e => setFilters(f => ({ ...f, currentSessionId: e.target.value }))}>
                  <option value="">Select Session</option>
                  {(sessions || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New Session (Promote Into)</label>
                <select className="form-select" value={filters.newSessionId}
                  onChange={e => setFilters(f => ({ ...f, newSessionId: e.target.value }))}>
                  <option value="">Select New Session</option>
                  {(sessions || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">From Class *</label>
                <select className="form-select" value={filters.classId}
                  onChange={e => {
                    setFilters(f => ({ ...f, classId: e.target.value, sectionFilter: 'all' }));
                    setPreviewRows([]); setPreviewed(false);
                  }}>
                  <option value="">Select Class</option>
                  {(classes || []).sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">From Section</label>
                <select className="form-select" value={filters.sectionFilter}
                  onChange={e => { setFilters(f => ({ ...f, sectionFilter: e.target.value })); setPreviewRows([]); setPreviewed(false); }}>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

            </div>

            {/* Next class info */}
            {selectedClass && (
              <div style={{ marginTop: 14, padding: '8px 14px', background: '#F1F5F9', borderRadius: 8, fontSize: 12.5, color: '#475569' }}>
                <strong>Selected:</strong> {selectedClass.name}
                {' → '}
                {isHighestClass
                  ? <span style={{ color: '#B91C1C', fontWeight: 600 }}>Highest class — passing students will be marked Passout</span>
                  : nextClass
                    ? <span style={{ color: '#15803D', fontWeight: 600 }}>Will promote to {nextClass.name}</span>
                    : <span style={{ color: '#92400E' }}>No next class found</span>
                }
              </div>
            )}

            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button
                className="btn btn-teal"
                disabled={!filters.classId || loadingPreview}
                onClick={loadPreview}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {loadingPreview ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Loading…</> : <><Play size={14} /> Load Students for Preview</>}
              </button>
              {previewed && (
                <button className="btn btn-outline btn-sm" onClick={loadPreview}>
                  <RefreshCw size={13} /> Refresh
                </button>
              )}
            </div>
          </div>

          {/* ── Preview Table ───────────────────────────── */}
          {previewed && previewRows.length > 0 && (
            <>
              {/* Summary chips */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { key: 'all',      label: `All (${summary.total})`,           color: '#64748B', bg: '#F1F5F9' },
                  { key: 'promote',  label: `Promote (${summary.promote})`,      color: '#15803D', bg: '#F0FDF4' },
                  { key: 'holdback', label: `Hold Back (${summary.holdback})`,   color: '#C2410C', bg: '#FFF7ED' },
                  { key: 'passout',  label: `Passout (${summary.passout})`,      color: '#B91C1C', bg: '#FEF2F2' },
                ].map(chip => (
                  <button key={chip.key} onClick={() => setShowFilter(chip.key)}
                    style={{
                      padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                      borderColor: showFilter === chip.key ? chip.color : '#E2E8F0',
                      background: showFilter === chip.key ? chip.bg : '#fff',
                      color: chip.color, fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                    }}>
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Bulk Actions Bar */}
              <div className="card" style={{ padding: '10px 16px', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', marginRight: 6 }}>
                  <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                  Select Visible
                </label>
                <div style={{ width: 1, height: 20, background: '#E2E8F0' }} />
                <button className="btn btn-sm" onClick={promoteAllPassing}
                  style={{ background: '#F0FDF4', border: '1px solid #86EFAC', color: '#15803D', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <TrendingUp size={13} /> Promote All Passing
                </button>
                <button className="btn btn-sm" onClick={holdBackAllFailing}
                  style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#C2410C', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MinusCircle size={13} /> Hold Back All Failing
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {summary.total} student{summary.total !== 1 ? 's' : ''} loaded
                  </span>
                  <button
                    className="btn btn-teal"
                    disabled={previewRows.length === 0 || execute.isPending}
                    onClick={() => setConfirmModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <CheckCircle size={14} /> Execute Promotion
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}></th>
                        <th>Roll No</th>
                        <th>Name</th>
                        <th>Father Name</th>
                        <th>Current Class</th>
                        <th>Exam Result</th>
                        <th>%</th>
                        <th>Grade</th>
                        <th style={{ minWidth: 220 }}>Proposed Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(r => {
                        const p = r.student.examPercent ?? null;
                        const col = ACTION_COLORS[r.action];
                        const isSelected = selectedIds.has(r.student.id);
                        return (
                          <tr key={r.student.id} style={{ background: isSelected ? '#F0FDFA' : undefined }}>
                            <td>
                              <input type="checkbox" checked={isSelected}
                                onChange={() => toggleSelect(r.student.id)}
                                style={{ width: 15, height: 15, cursor: 'pointer' }} />
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#0D9488', fontFamily: 'monospace', fontSize: 12 }}>
                                {r.student.rollNo || '—'}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{r.student.name}</div>
                            </td>
                            <td style={{ color: '#475569', fontSize: 13 }}>{r.student.fatherName || '—'}</td>
                            <td>
                              <span className="badge badge-blue">{r.student.class?.name || '—'}</span>
                              {r.student.section?.name && (
                                <span style={{ marginLeft: 4, fontSize: 11, color: '#64748B' }}>/ {r.student.section.name}</span>
                              )}
                            </td>
                            <td style={{ fontSize: 12, color: '#475569' }}>
                              {r.student.examResult || '—'}
                            </td>
                            <td>
                              {p != null ? (
                                <span style={{
                                  fontWeight: 700, fontSize: 13,
                                  color: p >= 33 ? '#15803D' : '#B91C1C',
                                }}>
                                  {pct(p)}%
                                </span>
                              ) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11,
                                background: p == null ? '#F1F5F9' : p >= 33 ? '#F0FDF4' : '#FEF2F2',
                                color: p == null ? '#64748B' : p >= 33 ? '#15803D' : '#B91C1C',
                              }}>
                                {gradeFromPct(p)}
                              </span>
                            </td>
                            <td>
                              <select
                                value={r.action}
                                onChange={e => setRowAction(r.student.id, e.target.value)}
                                style={{
                                  padding: '5px 10px', borderRadius: 8, fontSize: 12.5,
                                  fontWeight: 600, cursor: 'pointer', outline: 'none',
                                  border: `1.5px solid ${col.border}`,
                                  background: col.bg, color: col.text,
                                  appearance: 'none', WebkitAppearance: 'none',
                                  paddingRight: 28, width: '100%',
                                }}
                              >
                                <option value="promote" style={{ background: '#fff', color: '#15803D' }}>
                                  {nextClass ? `Promote → ${nextClass.name}` : 'Promote'}
                                </option>
                                <option value="holdback" style={{ background: '#fff', color: '#C2410C' }}>
                                  Hold Back (Same Class)
                                </option>
                                <option value="passout" style={{ background: '#fff', color: '#B91C1C' }}>
                                  Mark Passout
                                </option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom execute bar */}
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  className="btn btn-teal"
                  disabled={previewRows.length === 0 || execute.isPending}
                  onClick={() => setConfirmModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle size={15} /> Execute Promotion ({summary.total} students)
                </button>
              </div>
            </>
          )}

          {/* Empty preview */}
          {previewed && previewRows.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🎓</div>
                <div className="empty-state-text">No active students found</div>
                <div className="empty-state-sub">Try a different class or section.</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: PROMOTION HISTORY
      ══════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          <div className="card" style={{ marginBottom: 16, padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="form-select" style={{ width: 220 }} value={histSessionId}
                onChange={e => setHistSessionId(e.target.value)}>
                <option value="">All Sessions</option>
                {(sessions || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" onClick={() => refetchHistory()}>
                <RefreshCw size={13} /> Refresh
              </button>
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>
                Undo is available within 24 hours of promotion.
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {histLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Session</th>
                      <th>Student</th>
                      <th>From Class</th>
                      <th>To Class</th>
                      <th>Action</th>
                      <th>By</th>
                      <th>Undo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historyData || []).length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                          <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-text">No promotion history found</div>
                          </div>
                        </td>
                      </tr>
                    ) : (historyData || []).map((h, idx) => {
                      const canUndo = h.createdAt && (Date.now() - new Date(h.createdAt).getTime()) < 24 * 60 * 60 * 1000;
                      const actionCol = ACTION_COLORS[h.action] || ACTION_COLORS.promote;
                      return (
                        <tr key={h.id}>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                          <td style={{ fontSize: 12, color: '#475569' }}>
                            {h.createdAt ? new Date(h.createdAt).toLocaleString('en-PK') : '—'}
                          </td>
                          <td style={{ fontSize: 12 }}>{h.session?.name || h.newSession?.name || '—'}</td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1E3A5F' }}>{h.student?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.student?.rollNo || ''}</div>
                          </td>
                          <td>
                            <span className="badge badge-blue">{h.fromClass?.name || '—'}</span>
                          </td>
                          <td>
                            <span className="badge badge-teal">{h.toClass?.name || '—'}</span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11,
                              background: actionCol.bg, color: actionCol.text, border: `1px solid ${actionCol.border}`,
                            }}>
                              {actionCol.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#475569' }}>{h.promotedBy?.name || '—'}</td>
                          <td>
                            {canUndo ? (
                              <button
                                className="btn btn-sm"
                                style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#C2410C', display: 'flex', alignItems: 'center', gap: 4 }}
                                title="Undo this promotion (within 24h)"
                                disabled={undoPromotion.isPending}
                                onClick={() => {
                                  if (confirm(`Undo promotion for ${h.student?.name}?`)) {
                                    undoPromotion.mutate(h.id);
                                  }
                                }}
                              >
                                <RefreshCw size={12} /> Undo
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} /> Expired
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          CONFIRMATION MODAL
      ══════════════════════════════════════════════════ */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => !execute.isPending && setConfirmModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} style={{ color: '#D97706' }} />
                  Confirm Bulk Promotion
                </div>
                <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>
                  This will update class assignments for all listed students.
                </div>
              </div>
              {!execute.isPending && (
                <button onClick={() => setConfirmModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="modal-body">
              {/* Summary breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'Promote', count: summary.promote,  icon: <TrendingUp size={20} />, color: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
                  { label: 'Hold Back', count: summary.holdback, icon: <MinusCircle size={20} />, color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
                  { label: 'Passout', count: summary.passout,  icon: <LogOut size={20} />,    color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 10,
                    padding: '12px 10px', textAlign: 'center',
                  }}>
                    <div style={{ color: s.color, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400E' }}>
                <strong>Note:</strong> Promoted students will move to <strong>{nextClass?.name || 'next class'}</strong> in session{' '}
                <strong>{(sessions || []).find(s => s.id === parseInt(filters.newSessionId))?.name || '(not selected)'}</strong>.
                Held-back students remain in the same class. Passout students will be marked as graduated.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" disabled={execute.isPending} onClick={() => setConfirmModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-teal"
                disabled={execute.isPending}
                onClick={handleExecute}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {execute.isPending
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Processing…</>
                  : <><CheckCircle size={15} /> Confirm & Execute</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
