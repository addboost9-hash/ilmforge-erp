import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { ChevronDown, ChevronUp, X, FileText, Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import EmptyState from '../../components/ui/EmptyState';

/* ─── helpers ─────────────────────────────────────────────────── */
const TEAL = '#0D9488';
const TEAL_LIGHT = '#F0FDFA';

const btnTeal = {
  background: TEAL,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const btnOutline = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  padding: '7px 14px',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 13,
};

/* ─── PromoteModal ────────────────────────────────────────────── */
function PromoteModal({ row, classes, onClose, onPromoted }) {
  const qc = useQueryClient();
  const [toClassId, setToClassId] = useState('');
  const [toSectionId, setToSectionId] = useState('');
  const [moveHeads, setMoveHeads] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [selected, setSelected] = useState({});
  const [confirming, setConfirming] = useState(false);

  // Load students in this class-section for bulk promote
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-for-promote', row.classId, row.sectionId],
    queryFn: () =>
      api
        .get('/students', {
          params: {
            classId: row.classId,
            sectionId: row.sectionId || undefined,
            status: 'active',
            limit: 300,
          },
        })
        .then((r) => r.data.data || []),
    staleTime: 0,
  });

  const toClass = (classes || []).find((c) => c.id === parseInt(toClassId));
  const toSections = toClass?.sections || [];
  const toSection = toSections.find((s) => s.id === parseInt(toSectionId));

  const selectedIds = students.filter((s) => selected[s.id]).map((s) => s.id);
  const selectedCount = selectedIds.length;

  const toggleAll = (v) => {
    setSelectAll(v);
    const m = {};
    students.forEach((s) => (m[s.id] = v));
    setSelected(m);
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // Sync selectAll state
      const allChecked = students.length > 0 && students.every((s) => next[s.id]);
      setSelectAll(allChecked);
      return next;
    });
  };

  const handlePromoteClick = () => {
    if (!toClassId) {
      toast.error('Please select a target class');
      return;
    }
    if (selectedCount === 0) {
      toast.error('Please select at least one student');
      return;
    }
    setConfirming(true);
  };

  const promote = useMutation({
    mutationFn: () => {
      const records = selectedIds.map((studentId) => ({
        studentId,
        action: 'promote',
        toClassId: parseInt(toClassId),
        toSectionId: toSectionId ? parseInt(toSectionId) : undefined,
      }));
      return api.post('/students/promote', { records });
    },
    onSuccess: () => {
      const className = toClass?.name || `Class ${toClassId}`;
      const sectionLabel = toSection ? ` - ${toSection.name}` : '';
      toast.success(`${selectedCount} student${selectedCount !== 1 ? 's' : ''} promoted to ${className}${sectionLabel}!`);
      qc.invalidateQueries({ queryKey: ['class-sections'] });
      qc.invalidateQueries({ queryKey: ['students-expanded'] });
      qc.invalidateQueries({ queryKey: ['students-for-promote'] });
      onPromoted && onPromoted();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Promote failed'),
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: TEAL,
            color: '#fff',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Promote From {row.className}
            {row.sectionName ? ` - ${row.sectionName}` : ''} to
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Target class/section row */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Select Grade
            </label>
            <select
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13 }}
              value={toClassId}
              onChange={(e) => { setToClassId(e.target.value); setToSectionId(''); }}
            >
              <option value="">-- Select Class --</option>
              {(classes || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Select Section
            </label>
            <select
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13 }}
              value={toSectionId}
              onChange={(e) => setToSectionId(e.target.value)}
            >
              <option value="">-- Select Section --</option>
              {toSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Financial settings */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Financial Settings</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={moveHeads}
              onChange={(e) => setMoveHeads(e.target.checked)}
              style={{ accentColor: TEAL }}
            />
            Move Heads &amp; Discounts
          </label>
        </div>

        {/* Students table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading students…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>#</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Reg No</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Name</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>F Name</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => toggleAll(e.target.checked)}
                        style={{ accentColor: TEAL }}
                      />
                      Select All
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>
                      {s.rollNo || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '8px 12px', color: '#6B7280' }}>{s.fatherName || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!selected[s.id]}
                        onChange={() => toggleOne(s.id)}
                        style={{ accentColor: TEAL }}
                      />
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                      No active students found in this class/section
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {selectedCount > 0 && (
            <span style={{ fontSize: 12, color: '#6B7280', marginRight: 'auto' }}>
              {selectedCount} student{selectedCount !== 1 ? 's' : ''} selected
            </span>
          )}
          <button style={btnOutline} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...btnTeal, opacity: promote.isPending ? 0.7 : 1 }}
            disabled={promote.isPending}
            onClick={handlePromoteClick}
          >
            {promote.isPending ? 'Promoting…' : 'Promote'}
          </button>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirming && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              width: '100%',
              maxWidth: 420,
              padding: 28,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700, color: '#111827' }}>
              Confirm Promotion
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
              Promote <strong>{selectedCount}</strong> student{selectedCount !== 1 ? 's' : ''} to{' '}
              <strong>{toClass?.name}</strong>
              {toSection ? <> &ndash; <strong>{toSection.name}</strong></> : ''}?
              {moveHeads && (
                <span style={{ display: 'block', marginTop: 6, color: '#0F766E', fontWeight: 600 }}>
                  Heads &amp; Discounts will also be moved.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={btnOutline} onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                style={{ ...btnTeal, opacity: promote.isPending ? 0.7 : 1 }}
                disabled={promote.isPending}
                onClick={() => { setConfirming(false); promote.mutate(); }}
              >
                {promote.isPending ? 'Promoting…' : 'Yes, Promote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AddStudentInlineForm ───────────────────────────────────── */
function AddStudentRow({ classId, sectionId, onAdded }) {
  const nav = useNavigate();
  return (
    <div style={{ padding: '10px 16px', background: TEAL_LIGHT, borderTop: '1px solid #CCFBF1' }}>
      <button
        style={{ ...btnTeal, fontSize: 12, padding: '6px 14px' }}
        onClick={() => nav(`/admissions?classId=${classId}&sectionId=${sectionId || ''}`)}
      >
        + Add Student
      </button>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function StudentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [expandedRow, setExpandedRow] = useState(null);
  const [promoteRow, setPromoteRow] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebounce(searchInput.trim(), 400);

  const qc = useQueryClient();

  const handleSearchChange = useCallback((val) => {
    setSearchInput(val);
  }, []);

  const { data: classSections = [], isLoading } = useQuery({
    queryKey: ['class-sections', activeTab],
    queryFn: () => api.get('/students/class-sections').then((r) => r.data.data || []),
    staleTime: 60_000,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data.data || []),
  });

  // Search results query (only fires when searchQuery is non-empty)
  const { data: searchResults = [], isFetching: searchLoading } = useQuery({
    queryKey: ['students-search', searchQuery, activeTab],
    enabled: searchQuery.length > 0,
    queryFn: () =>
      api.get('/students', {
        params: { search: searchQuery, status: activeTab, limit: 50 },
      }).then((r) => r.data.data || []),
    staleTime: 30_000,
  });

  // Expanded row students
  const { data: expandedStudents = [], isLoading: loadingExpanded } = useQuery({
    queryKey: ['students-expanded', expandedRow],
    enabled: !!expandedRow,
    queryFn: () => {
      const [classId, sectionId] = (expandedRow || '').split('-');
      return api
        .get('/students', {
          params: { classId, sectionId: sectionId !== 'null' ? sectionId : undefined, status: activeTab, limit: 300 },
        })
        .then((r) => r.data.data || []);
    },
    staleTime: 0,
  });

  const total = classSections.reduce((sum, r) => sum + r.studentCount, 0);

  const tabStyle = (tab) => ({
    padding: '10px 22px',
    border: 'none',
    borderBottom: activeTab === tab ? `3px solid ${TEAL}` : '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 700 : 500,
    color: activeTab === tab ? TEAL : '#6B7280',
    fontSize: 14,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: 20, background: '#F9FAFB', minHeight: '100vh' }}>
      {/* Page header */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '14px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Students</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>
            Total Active: <strong>{total}</strong>
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', pointerEvents:'none' }}/>
            <input
              style={{ paddingLeft:30, paddingRight: searchInput ? 28 : 10, padding:'8px 10px 8px 30px', border:'1px solid #D1D5DB', borderRadius:6, fontSize:13, width:240 }}
              placeholder="Search by name, roll, father..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, lineHeight:1 }}>
                <X size={13}/>
              </button>
            )}
          </div>
          <button
            style={{ ...btnTeal, gap: 7 }}
            onClick={() => window.open('/api/v1/reports/admission-form', '_blank')}
          >
            <FileText size={14} />
            Admission Form
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
          <button style={tabStyle('active')} onClick={() => { setActiveTab('active'); setExpandedRow(null); }}>
            Active
          </button>
          <button style={tabStyle('inactive')} onClick={() => { setActiveTab('inactive'); setExpandedRow(null); }}>
            Inactive
          </button>
        </div>

        {/* ── Search Results Panel ── */}
        {searchQuery && (
          <div style={{ padding:'12px 16px', background:'#FFFBEB', borderBottom:'2px solid #FDE68A' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#92400E' }}>
                Search: "{searchQuery}" — {searchLoading ? 'Searching…' : `${searchResults.length} result(s)`}
              </span>
              <button onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                style={{ ...btnOutline, padding:'4px 12px', fontSize:12 }}>
                Clear Search
              </button>
            </div>
            {!searchLoading && searchResults.length === 0 && (
              <EmptyState
                type="students"
                title="No students found"
                description="Try a different search or add a new student"
                action={() => navigate('/admissions/wizard')}
                actionLabel="Admit Student"
              />
            )}
            {searchResults.length > 0 && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, background:'#fff', borderRadius:6, overflow:'hidden' }}>
                <thead>
                  <tr style={{ background: TEAL }}>
                    {['#','Roll No','Name','Father Name','Class','Section','Gender','Actions'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', color:'#fff', fontWeight:700, textAlign:'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom:'1px solid #F3F4F6', background: i%2===0?'#fff':'#FAFAFA' }}>
                      <td style={{ padding:'8px 12px', color:'#9CA3AF' }}>{i+1}</td>
                      <td style={{ padding:'8px 12px', fontFamily:'monospace', color:TEAL, fontWeight:700 }}>{s.rollNo||'—'}</td>
                      <td style={{ padding:'8px 12px', fontWeight:600, color:'#111827' }}>{s.name}</td>
                      <td style={{ padding:'8px 12px', color:'#6B7280' }}>{s.fatherName||'—'}</td>
                      <td style={{ padding:'8px 12px' }}>{s.class?.name||'—'}</td>
                      <td style={{ padding:'8px 12px', color:'#6B7280' }}>{s.section?.name||'—'}</td>
                      <td style={{ padding:'8px 12px', color:'#6B7280', textTransform:'capitalize' }}>{s.gender||'—'}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <Link to={`/students/${s.id}`}
                          style={{ ...btnTeal, padding:'4px 12px', fontSize:12, textDecoration:'none' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
            <div className="spinner" />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: TEAL }}>
                <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>S.No.</th>
                <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Class</th>
                <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Section</th>
                <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Strength</th>
                <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Actions</th>
                <th style={{ padding: '11px 14px', color: '#fff', fontWeight: 700, textAlign: 'left' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {classSections.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                    No {activeTab} students found
                  </td>
                </tr>
              )}
              {classSections.map((row, idx) => {
                const rowKey = `${row.classId}-${row.sectionId}`;
                const isExpanded = expandedRow === rowKey;
                return (
                  <>
                    <tr
                      key={rowKey}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: isExpanded ? TEAL_LIGHT : idx % 2 === 0 ? '#fff' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: '#9CA3AF' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{row.className}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{row.sectionName || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            background: '#DBEAFE',
                            color: '#1D4ED8',
                            borderRadius: 12,
                            padding: '2px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {row.studentCount}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          style={{ ...btnTeal, fontSize: 12, padding: '5px 14px' }}
                          onClick={() => setPromoteRow(row)}
                        >
                          Promotion
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          style={{
                            background: 'none',
                            border: '1px solid #D1D5DB',
                            borderRadius: 6,
                            padding: '5px 12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 13,
                            color: '#374151',
                          }}
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedRow(null);
                            } else {
                              setExpandedRow(rowKey);
                            }
                          }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${rowKey}-expanded`}>
                        <td colSpan={6} style={{ padding: 0, background: TEAL_LIGHT }}>
                          {loadingExpanded ? (
                            <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>Loading…</div>
                          ) : (
                            <>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                  <tr style={{ background: '#CCFBF1' }}>
                                    <th style={{ padding: '7px 14px', textAlign: 'left', color: '#0F766E', fontWeight: 700 }}>#</th>
                                    <th style={{ padding: '7px 14px', textAlign: 'left', color: '#0F766E', fontWeight: 700 }}>Reg No</th>
                                    <th style={{ padding: '7px 14px', textAlign: 'left', color: '#0F766E', fontWeight: 700 }}>Name</th>
                                    <th style={{ padding: '7px 14px', textAlign: 'left', color: '#0F766E', fontWeight: 700 }}>Father Name</th>
                                    <th style={{ padding: '7px 14px', textAlign: 'left', color: '#0F766E', fontWeight: 700 }}>Gender</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {expandedStudents.map((s, i) => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #D1FAE5' }}>
                                      <td style={{ padding: '7px 14px', color: '#9CA3AF' }}>{i + 1}</td>
                                      <td style={{ padding: '7px 14px', fontFamily: 'monospace', color: TEAL, fontWeight: 700 }}>
                                        {s.rollNo || '—'}
                                      </td>
                                      <td style={{ padding: '7px 14px', fontWeight: 600 }}>{s.name}</td>
                                      <td style={{ padding: '7px 14px', color: '#6B7280' }}>{s.fatherName || '—'}</td>
                                      <td style={{ padding: '7px 14px', color: '#6B7280', textTransform: 'capitalize' }}>
                                        {s.gender || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                  {expandedStudents.length === 0 && (
                                    <tr>
                                      <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>
                                        No students found
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                              <AddStudentRow classId={row.classId} sectionId={row.sectionId} />
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Promote Modal */}
      {promoteRow && (
        <PromoteModal
          row={promoteRow}
          classes={classes}
          onClose={() => setPromoteRow(null)}
          onPromoted={() => qc.invalidateQueries({ queryKey: ['class-sections'] })}
        />
      )}
    </div>
  );
}
