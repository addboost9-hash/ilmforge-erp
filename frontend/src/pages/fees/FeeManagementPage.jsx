/**
 * IlmForge — Fee Management Page
 * 5-tab unified fee page matching School Mentor layout
 * Tabs: Fee Structure | Fee Challans | Fee Receiving | Fee History | Reports
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  DollarSign, Printer, Download, Edit2, X, Search,
  Trash2, FileText, RefreshCw, AlertTriangle, Play,
} from 'lucide-react';

/* ─── Shared helpers ─────────────────────────────── */
const TEAL = '#1B2F6E';
const TEAL_LIGHT = '#dbeafe';
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const btn = (extra = {}) => ({
  border: 'none', borderRadius: 6, cursor: 'pointer',
  fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5,
  padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 5,
  transition: 'all .15s',
  ...extra,
});

const tealBtn = {
  ...btn(), background: TEAL, color: '#fff',
};
const outlineBtn = (color = TEAL) => ({
  ...btn(), background: 'transparent',
  border: `1px solid ${color}`, color: color,
});
const redBtn = { ...btn(), background: '#DC2626', color: '#fff' };
const greenBtn = { ...btn(), background: '#16A34A', color: '#fff' };

/* ─── Tab header ─────────────────────────────────── */
const TABS = [
  { id: 'structure',  label: 'Fee Structure' },
  { id: 'challans',   label: 'Fee Challans' },
  { id: 'receiving',  label: 'Fee Receiving' },
  { id: 'history',    label: 'Fee History' },
  { id: 'reports',    label: 'Reports' },
];

/* ─── Reusable filter row for month/year/search ──── */
function MonthYearFilters({ month, year, search, onMonth, onYear, onSearch, onGet, onReset }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Month</div>
        <input
          value={month}
          onChange={e => onMonth(e.target.value)}
          placeholder="e.g. July"
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: 120 }}
        />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Year</div>
        <input
          value={year}
          onChange={e => onYear(e.target.value)}
          placeholder="e.g. 2026"
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: 100 }}
        />
      </div>
      <div style={{ flex: '1 1 220px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Search</div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search by Name, FatherName, Registration and Phone"
            style={{ padding: '7px 12px 7px 30px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12.5, width: '100%' }}
          />
        </div>
      </div>
      <button style={tealBtn} onClick={onGet}>Get Students</button>
      <button style={outlineBtn('#64748b')} onClick={onReset}>
        <RefreshCw size={13} /> Reset Filter
      </button>
    </div>
  );
}

/* ─── Clean table wrapper ─────────────────────────── */
function DataTable({ headers, children, empty }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                color: '#374151', fontSize: 12, whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {empty && (
            <tr>
              <td colSpan={headers.length} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── TAB 1: Fee Structure ────────────────────────── */
function UpdateFeeModal({ cls, onClose, onSave }) {
  const [heads, setHeads] = useState(
    cls.feeHeads || [
      { name: 'Admission Fee', amount: 0 },
      { name: 'Tuition Fee', amount: 0 },
      { name: 'Stationary', amount: 0 },
      { name: 'Annual Fund', amount: 0 },
    ]
  );

  const total = heads.reduce((s, h) => s + Number(h.amount || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ background: TEAL, padding: '16px 20px', borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Update Fee Structure</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{cls.className} — {cls.sectionName || 'All Sections'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Fee heads */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fee Heads</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {heads.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  value={h.name}
                  onChange={e => { const n = [...heads]; n[i] = { ...n[i], name: e.target.value }; setHeads(n); }}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
                  placeholder="Fee head name"
                />
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>Rs.</span>
                  <input
                    type="number"
                    value={h.amount}
                    onChange={e => { const n = [...heads]; n[i] = { ...n[i], amount: e.target.value }; setHeads(n); }}
                    style={{ width: 110, padding: '8px 12px 8px 34px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <button
                  onClick={() => setHeads(heads.filter((_, j) => j !== i))}
                  style={{ ...btn(), background: '#FEF2F2', color: '#DC2626', padding: '7px' }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setHeads([...heads, { name: '', amount: 0 }])}
            style={{ ...outlineBtn(TEAL), marginTop: 10, fontSize: 12 }}
          >
            + Add Fee Head
          </button>

          <div style={{ marginTop: 16, padding: '12px 14px', background: '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>Total Monthly Fee</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#16A34A' }}>Rs. {total.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...outlineBtn('#94a3b8'), flex: 1 }}>Cancel</button>
          <button
            onClick={() => onSave(cls.classId, heads)}
            style={{ ...tealBtn, flex: 2 }}
          >
            Save Fee Structure
          </button>
        </div>
      </div>
    </div>
  );
}

function FeeStructureTab() {
  const [updateTarget, setUpdateTarget] = useState(null);
  const qc = useQueryClient();

  const { data: structures = [], isLoading } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: () => api.get('/fees/structures').then(r => r.data?.data || r.data || []),
  });

  const updateMut = useMutation({
    mutationFn: ({ classId, feeHeads }) => api.put(`/fees/structures/${classId}`, { feeHeads }),
    onSuccess: () => {
      toast.success('Fee structure updated!');
      qc.invalidateQueries({ queryKey: ['fee-structures'] });
      setUpdateTarget(null);
    },
    onError: () => toast.error('Failed to update fee structure'),
  });

  const handlePrint = (row) => {
    toast.success(`Printing fee structure for ${row.className}...`);
    window.print();
  };

  const handleDownload = async (row) => {
    try {
      const res = await api.get(`/fees/structures/${row.classId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `fee-structure-${row.className}.pdf`; a.click();
    } catch {
      toast.error('Download failed. Please try again.');
    }
  };

  const rows = structures.length
    ? structures
    : [
        { classId: 'c1', className: 'Class 1', sectionName: 'A', feeHeads: [] },
        { classId: 'c2', className: 'Class 2', sectionName: 'A', feeHeads: [] },
        { classId: 'c3', className: 'Class 3', sectionName: 'B', feeHeads: [] },
      ];

  return (
    <div>
      {isLoading && <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>Loading fee structures...</div>}
      <DataTable
        headers={['S.No.', 'Class', 'Section', 'Print', 'Download', 'Update']}
        empty={!isLoading && rows.length === 0 ? 'No fee structures found.' : undefined}
      >
        {rows.map((row, i) => (
          <tr key={row.classId || i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '10px 14px', color: '#6b7280' }}>{i + 1}</td>
            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{row.className}</td>
            <td style={{ padding: '10px 14px', color: '#374151' }}>{row.sectionName || '—'}</td>
            <td style={{ padding: '10px 14px' }}>
              <button onClick={() => handlePrint(row)} style={{ ...outlineBtn('#4B5563'), padding: '5px 10px' }}>
                <Printer size={13} /> Print
              </button>
            </td>
            <td style={{ padding: '10px 14px' }}>
              <button onClick={() => handleDownload(row)} style={{ ...outlineBtn('#1d4ed8'), padding: '5px 10px' }}>
                <Download size={13} /> Download
              </button>
            </td>
            <td style={{ padding: '10px 14px' }}>
              <button onClick={() => setUpdateTarget(row)} style={{ ...tealBtn, padding: '5px 12px' }}>
                <Edit2 size={13} /> Update
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {updateTarget && (
        <UpdateFeeModal
          cls={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSave={(classId, feeHeads) => updateMut.mutate({ classId, feeHeads })}
        />
      )}
    </div>
  );
}

/* ─── TAB 2: Fee Challans ────────────────────────── */
function FeeChallansTab() {
  const [month, setMonth] = useState('July');
  const [year, setYear] = useState('2026');
  const [search, setSearch] = useState('');
  const [fetched, setFetched] = useState(false);

  const { data: summary = [], isLoading, refetch } = useQuery({
    queryKey: ['challans-summary', month, year],
    queryFn: () => api.get(`/fees/challans-summary?month=${month}&year=${year}`).then(r => r.data?.data || r.data || []),
    enabled: false,
  });

  const handleGet = () => { setFetched(true); refetch(); };
  const handleReset = () => { setMonth('July'); setYear('2026'); setSearch(''); setFetched(false); };

  const handleBulkDownload = async (row) => {
    try {
      toast.loading('Generating bulk challans...', { id: 'bulk' });
      const res = await api.get(
        `/fees/challans-bulk/${row.classId}/${row.sectionId}?month=${month}&year=${year}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `challans-${row.className}-${month}-${year}.pdf`; a.click();
      toast.success('Challans downloaded!', { id: 'bulk' });
    } catch {
      toast.error('Failed to download challans', { id: 'bulk' });
    }
  };

  const handleDelete = (row) => {
    if (!window.confirm(`Delete all challans for ${row.className} — ${month} ${year}?`)) return;
    api.delete(`/fees/challans/${row.classId}/${row.sectionId}?month=${month}&year=${year}`)
      .then(() => { toast.success('Challans deleted'); refetch(); })
      .catch(() => toast.error('Delete failed'));
  };

  const filtered = summary.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.className || '').toLowerCase().includes(q) ||
      (r.sectionName || '').toLowerCase().includes(q)
    );
  });

  const mockRows = fetched ? filtered : [];

  return (
    <div>
      <MonthYearFilters
        month={month} year={year} search={search}
        onMonth={setMonth} onYear={setYear} onSearch={setSearch}
        onGet={handleGet} onReset={handleReset}
      />

      {isLoading && <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>Loading challans...</div>}

      {fetched && !isLoading && (
        <DataTable
          headers={['S.No.', 'Class', 'Section', 'Download', 'Count', 'Delete', 'Bulk Action']}
          empty={mockRows.length === 0 ? `No challans found for ${month} ${year}` : undefined}
        >
          {mockRows.map((row, i) => (
            <tr key={`${row.classId}-${row.sectionId}`} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 14px', color: '#6b7280' }}>{i + 1}</td>
              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{row.className}</td>
              <td style={{ padding: '10px 14px', color: '#374151' }}>{row.sectionName}</td>
              <td style={{ padding: '10px 14px' }}>
                <button
                  onClick={() => handleBulkDownload(row)}
                  style={{ ...outlineBtn('#1d4ed8'), padding: '5px 9px' }}
                  title="Download challan PDF"
                >
                  <Download size={14} />
                </button>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: TEAL_LIGHT, color: TEAL, fontWeight: 800, fontSize: 13,
                  minWidth: 32, height: 28, borderRadius: 99, padding: '0 10px',
                }}>
                  {row.challanCount || 0}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <button onClick={() => handleDelete(row)} style={{ ...outlineBtn('#DC2626'), padding: '5px 9px' }} title="Delete challans">
                  <Trash2 size={14} />
                </button>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <button onClick={() => handleBulkDownload(row)} style={tealBtn}>
                  <FileText size={13} /> Bulk Challans
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {!fetched && (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
          <DollarSign size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Select month & year and click "Get Students"</div>
          <div style={{ fontSize: 12 }}>Challan summary will appear here</div>
        </div>
      )}
    </div>
  );
}

/* ─── TAB 3: Fee Receiving ───────────────────────── */
function FeeReceivingTab() {
  const [month, setMonth] = useState('July');
  const [year, setYear] = useState('2026');
  const [search, setSearch] = useState('');
  const [fetched, setFetched] = useState(false);

  const { data: summary = [], isLoading, refetch } = useQuery({
    queryKey: ['receiving-summary', month, year],
    queryFn: () => api.get(`/fees/receiving-summary?month=${month}&year=${year}`).then(r => r.data?.data || r.data || []),
    enabled: false,
  });

  const reminderMut = useMutation({
    mutationFn: ({ classId }) => api.post('/fees/defaulters/sms', { classId, month, year }),
    onSuccess: () => toast.success('Fee reminders sent to defaulters!'),
    onError: () => toast.error('Failed to send reminders'),
  });

  const handleGet = () => { setFetched(true); refetch(); };
  const handleReset = () => { setMonth('July'); setYear('2026'); setSearch(''); setFetched(false); };

  const filtered = summary.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.className || '').toLowerCase().includes(q) ||
      (r.sectionName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <MonthYearFilters
        month={month} year={year} search={search}
        onMonth={setMonth} onYear={setYear} onSearch={setSearch}
        onGet={handleGet} onReset={handleReset}
      />

      {isLoading && <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>Loading receiving data...</div>}

      {fetched && !isLoading && (
        <DataTable
          headers={['S.No.', 'Class', 'Section', 'Paid', 'Unpaid', 'Fee Reminder']}
          empty={filtered.length === 0 ? `No data found for ${month} ${year}` : undefined}
        >
          {filtered.map((row, i) => (
            <tr key={`${row.classId}-${row.sectionId}`} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 14px', color: '#6b7280' }}>{i + 1}</td>
              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{row.className}</td>
              <td style={{ padding: '10px 14px', color: '#374151' }}>{row.sectionName}</td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>{row.paidCount ?? '—'}</span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>{row.unpaidCount ?? '—'}</span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <button
                  onClick={() => reminderMut.mutate({ classId: row.classId })}
                  disabled={reminderMut.isPending}
                  style={{ ...tealBtn, opacity: reminderMut.isPending ? 0.7 : 1 }}
                >
                  <AlertTriangle size={13} /> Fee Reminder
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {!fetched && (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
          <DollarSign size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Select month & year and click "Get Students"</div>
          <div style={{ fontSize: 12 }}>Fee receiving summary will appear here</div>
        </div>
      )}
    </div>
  );
}

/* ─── TAB 4: Fee History ─────────────────────────── */
function FeeHistoryTab() {
  const [studentId, setStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ['students-search-fee', studentSearch],
    queryFn: () => api.get(`/students?search=${encodeURIComponent(studentSearch)}&limit=10`).then(r => r.data?.data || []),
    enabled: studentSearch.length >= 2,
  });

  const { data: history = [], isLoading: loadingHistory, refetch } = useQuery({
    queryKey: ['fee-history', studentId, fromDate, toDate],
    queryFn: () => api.get(`/fees/history/${studentId}?from=${fromDate}&to=${toDate}`).then(r => r.data?.data || r.data || []),
    enabled: !!studentId,
  });

  const selectedStudent = students.find(s => (s._id || s.id) === studentId);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 20, alignItems: 'flex-end' }}>
        {/* Student selector */}
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Select Student</div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={selectedStudent ? selectedStudent.name : studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setStudentId(''); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type student name to search..."
              style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
            />
          </div>
          {showDropdown && studentSearch.length >= 2 && students.length > 0 && !studentId && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
            }}>
              {students.map(s => (
                <button
                  key={s._id || s.id}
                  onClick={() => {
                    setStudentId(s._id || s.id);
                    setStudentSearch(s.name);
                    setShowDropdown(false);
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 14px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {s.rollNo ? `Roll: ${s.rollNo}` : ''} {s.class?.name || s.class || ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>From Date</div>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>To Date</div>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
          />
        </div>
        {studentId && (
          <button onClick={() => refetch()} style={tealBtn}>Search History</button>
        )}
      </div>

      {!studentId && (
        <div style={{ padding: '60px 16px', textAlign: 'center', color: '#94a3b8', background: '#f9fafb', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
          <FileText size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Select a student to view their fee history</div>
          <div style={{ fontSize: 12 }}>Invoice history will be displayed here after selection</div>
        </div>
      )}

      {studentId && loadingHistory && (
        <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center' }}>Loading history...</div>
      )}

      {studentId && !loadingHistory && (
        <>
          {selectedStudent && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>
                {(selectedStudent.name || 'S')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{selectedStudent.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {selectedStudent.rollNo ? `Roll: ${selectedStudent.rollNo}` : ''}
                  {selectedStudent.class?.name || selectedStudent.class ? ` · Class: ${selectedStudent.class?.name || selectedStudent.class}` : ''}
                </div>
              </div>
            </div>
          )}
          <DataTable
            headers={['S.No.', 'Invoice #', 'Month', 'Amount', 'Status', 'Paid Date', 'Download']}
            empty={history.length === 0 ? 'No invoice history found for selected period' : undefined}
          >
            {history.map((inv, i) => (
              <tr key={inv._id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{i + 1}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{inv.invoiceNo || `INV-${i + 1}`}</td>
                <td style={{ padding: '10px 14px' }}>{inv.month} {inv.year}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1d4ed8' }}>Rs. {(inv.amount || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: 11,
                    background: inv.status === 'paid' ? '#dcfce7' : '#fef2f2',
                    color: inv.status === 'paid' ? '#16A34A' : '#DC2626',
                  }}>
                    {inv.status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: '#374151' }}>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button style={{ ...outlineBtn('#1d4ed8'), padding: '5px 9px' }}>
                    <Download size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        </>
      )}
    </div>
  );
}

/* ─── TAB 5: Reports ─────────────────────────────── */
function ReportsTab() {
  const [reportSubTab, setReportSubTab] = useState('defaulters');
  const [defaulterSubTab, setDefaulterSubTab] = useState('all');
  const [selMonth, setSelMonth] = useState('');
  const [fetched, setFetched] = useState(false);

  const { data: defaulters = [], isLoading, refetch } = useQuery({
    queryKey: ['fee-defaulters-report', defaulterSubTab, selMonth],
    queryFn: () => {
      const q = selMonth ? `?monthYear=${selMonth}` : '';
      return api.get(`/fees/defaulters${q}`).then(r => r.data?.data || r.data || []);
    },
    enabled: false,
  });

  const handlePDF = () => {
    toast('Generating PDF report...', { icon: '📄' });
    refetch();
  };

  const handleWord = () => {
    toast('Generating Word report...', { icon: '📝' });
  };

  const subTabStyle = (active) => ({
    padding: '7px 18px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: active ? TEAL : '#f1f5f9',
    color: active ? '#fff' : '#374151', borderRadius: 6,
    fontFamily: 'inherit', transition: 'all .15s',
  });

  return (
    <div>
      {/* Top-level sub tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { id: 'defaulters', label: 'Fee Defaulter List' },
          { id: 'collections', label: 'General Fee Collections' },
        ].map(t => (
          <button key={t.id} style={subTabStyle(reportSubTab === t.id)} onClick={() => setReportSubTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {reportSubTab === 'defaulters' && (
        <div>
          {/* Defaulter sub-tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { id: 'all', label: 'All Fee Defaulters' },
              { id: 'monthly', label: 'Monthly Fee Defaulters' },
            ].map(t => (
              <button key={t.id} style={subTabStyle(defaulterSubTab === t.id)} onClick={() => setDefaulterSubTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Filters + action buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
            {defaulterSubTab === 'monthly' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Select Month</div>
                <input
                  type="month"
                  value={selMonth}
                  onChange={e => setSelMonth(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
                />
              </div>
            )}
            <button onClick={handlePDF} style={redBtn}>
              <FileText size={13} /> PDF
            </button>
            <button onClick={handleWord} style={greenBtn}>
              <FileText size={13} /> Word
            </button>
            <button onClick={() => { setFetched(true); refetch(); }} style={tealBtn}>
              <Search size={13} /> Get Report
            </button>
          </div>

          {isLoading && <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>Loading defaulters...</div>}

          {fetched && !isLoading && (
            <DataTable
              headers={['S.No.', 'Student Name', 'Father Name', 'Class', 'Section', 'Month', 'Amount Due', 'Contact']}
              empty={defaulters.length === 0 ? 'No defaulters found.' : undefined}
            >
              {defaulters.map((d, i) => (
                <tr key={d._id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{d.studentName}</td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{d.fatherName || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{d.className}</td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{d.sectionName || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{d.month}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#DC2626' }}>Rs. {(d.amountDue || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{d.phone || '—'}</td>
                </tr>
              ))}
            </DataTable>
          )}

          {!fetched && (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', background: '#f9fafb', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
              <AlertTriangle size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Click "Get Report" to load defaulters</div>
              <div style={{ fontSize: 12 }}>Defaulter list will appear here</div>
            </div>
          )}
        </div>
      )}

      {reportSubTab === 'collections' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Select Month</div>
              <input
                type="month"
                value={selMonth}
                onChange={e => setSelMonth(e.target.value)}
                style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
              />
            </div>
            <button onClick={handlePDF} style={redBtn}><FileText size={13} /> PDF</button>
            <button onClick={handleWord} style={greenBtn}><FileText size={13} /> Word</button>
          </div>

          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', background: '#f9fafb', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
            <DollarSign size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>General Fee Collections Report</div>
            <div style={{ fontSize: 12 }}>Select month and generate PDF or Word report</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────── */
export default function FeeManagementPage() {
  const [activeTab, setActiveTab] = useState('structure');

  const tabStyle = (id) => ({
    padding: '10px 20px', fontSize: 14, fontWeight: activeTab === id ? 700 : 500,
    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
    background: 'none',
    color: activeTab === id ? TEAL : '#64748b',
    borderBottom: activeTab === id ? `3px solid ${TEAL}` : '3px solid transparent',
    transition: 'all .15s',
  });

  const tabContent = {
    structure: <FeeStructureTab />,
    challans:  <FeeChallansTab />,
    receiving: <FeeReceivingTab />,
    history:   <FeeHistoryTab />,
    reports:   <ReportsTab />,
  };

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: '#f0f4f8' }}>
      {/* IlmForge Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DollarSign size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B2F6E' }}>Fee Management</h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Structure · Challans · Receiving · History · Reports
            </div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>ilmفورج</span>
      </div>

      {/* Tab container */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #e2e8f0',
          background: '#fafafa', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => (
            <button key={tab.id} style={tabStyle(tab.id)} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px 22px' }}>
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  );
}
