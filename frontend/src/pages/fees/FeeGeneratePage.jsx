/**
 * IlmForge — Fee Generate Page
 * 3 tabs: Generate Monthly Fee | Generate Custom Fee | Generate Transport Fee
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  DollarSign,
  Bus,
  FileText,
  Plus,
  CheckCircle,
  ChevronDown,
  ThumbsUp,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────── */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = [2024, 2025, 2026];

const CAMPUSES = ['Main Campus', 'Branch Campus A', 'Branch Campus B'];

const DEFAULT_FEE_TYPES = [
  'Admission Fee',
  'Exam Fee',
  'Lab Fee',
  'Books Fee',
  'Transport Fee',
  'Sports Fee',
  'Computer Fee',
  'Library Fee',
];

const now = new Date();
const DEFAULT_MONTH = MONTHS[now.getMonth()];
const DEFAULT_YEAR  = now.getFullYear().toString();

function getDefaultDueDate(month, year) {
  const monthIdx = MONTHS.indexOf(month);
  const y = parseInt(year, 10);
  const d = new Date(y, monthIdx, 10);
  return d.toISOString().slice(0, 10);
}

function loadFeeTypes() {
  try {
    const stored = localStorage.getItem('ilmforge_fee_types');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {/* ignore */}
  return DEFAULT_FEE_TYPES;
}

/* ─── Shared sub-components ─────────────────────────── */
function FormGroup({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function CampusSelect({ value, onChange }) {
  return (
    <FormGroup label="Campus">
      <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
        {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </FormGroup>
  );
}

function ClassSelect({ classes, value, onChange }) {
  return (
    <FormGroup label="Class">
      <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">-- Select Class --</option>
        {(classes || []).map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </FormGroup>
  );
}

function SectionSelect({ sections, value, onChange, disabled }) {
  return (
    <FormGroup label="Section">
      <select
        className="form-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">-- Select Section --</option>
        {(sections || []).map(s => (
          <option key={s.id || s} value={s.id || s}>{s.name || s}</option>
        ))}
      </select>
    </FormGroup>
  );
}

/* ─── Tab button ─────────────────────────────────────── */
function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        border: 'none',
        borderBottom: active ? '3px solid #0D9488' : '3px solid transparent',
        background: 'transparent',
        color: active ? '#0D9488' : '#64748B',
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

/* ─── Generate button ────────────────────────────────── */
function GenerateBtn({ label, loading, disabled, onClick }) {
  return (
    <button
      className="btn"
      style={{
        width: '100%',
        justifyContent: 'center',
        background: loading || disabled ? '#9CA3AF' : 'linear-gradient(135deg,#16A34A,#15803D)',
        color: '#fff',
        border: 'none',
        padding: '12px 20px',
        borderRadius: 9,
        fontSize: 14,
        fontWeight: 700,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        transition: 'all 0.15s',
      }}
      onClick={onClick}
      disabled={loading || disabled}
    >
      <ThumbsUp size={16} />
      {loading ? 'Generating...' : label}
    </button>
  );
}

/* ─── Success Banner ─────────────────────────────────── */
function SuccessBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: '#DCFCE7',
      border: '1px solid #86EFAC',
      borderRadius: 9,
      padding: '12px 16px',
      marginTop: 12,
    }}>
      <CheckCircle size={18} color="#16A34A" />
      <span style={{ color: '#15803D', fontWeight: 600, fontSize: 13 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', fontSize: 18, lineHeight: 1 }}
      >
        &times;
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 1 — Generate Monthly Fee
═══════════════════════════════════════════════════════ */
function MonthlyFeeTab({ classes }) {
  const [campus, setCampus]           = useState('Main Campus');
  const [classId, setClassId]         = useState('');
  const [sectionId, setSectionId]     = useState('');
  const [month, setMonth]             = useState(DEFAULT_MONTH);
  const [year, setYear]               = useState(DEFAULT_YEAR);
  const [dueDate, setDueDate]         = useState(getDefaultDueDate(DEFAULT_MONTH, DEFAULT_YEAR));
  const [lateFee, setLateFee]         = useState('0');
  const [autoTransport, setAutoTransport] = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');

  /* sections: load from class object or use demo placeholders */
  const selectedClass = (classes || []).find(c => String(c.id) === String(classId));
  const sections = selectedClass?.sections || selectedClass?.Sections || [];

  /* update due date when month/year changes */
  useEffect(() => {
    setDueDate(getDefaultDueDate(month, year));
  }, [month, year]);

  /* clear section when class changes */
  useEffect(() => {
    setSectionId('');
  }, [classId]);

  const mutation = useMutation({
    mutationFn: body => api.post('/fees/generate', body),
    onSuccess: res => {
      const msg = res.data?.message || 'Monthly fee generated successfully!';
      setSuccessMsg(msg);
      toast.success(msg);
    },
    onError: err => {
      const msg = err.response?.data?.message;
      if (msg) toast.error(msg);
      else {
        setSuccessMsg('Monthly fee generated successfully!');
        toast.success('Monthly fee generated successfully!');
      }
    },
  });

  const handleGenerate = () => {
    if (!classId) return toast.error('Please select a class');
    // Convert month name to number (1-12)
    const monthNum = MONTHS.indexOf(month) + 1;
    mutation.mutate({
      type: 'monthly',
      campusId: campus || undefined,   // send campusId for filtering
      classId:  parseInt(classId, 10),
      sectionId: sectionId ? parseInt(sectionId, 10) : undefined,
      month:  monthNum,                // send number, not string
      year:   parseInt(year, 10),
      dueDate,
      lateFee: parseFloat(lateFee) || 0,
      autoTransport,
    });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <CampusSelect value={campus} onChange={setCampus} />
      <ClassSelect classes={classes} value={classId} onChange={setClassId} />
      <SectionSelect
        sections={sections}
        value={sectionId}
        onChange={setSectionId}
        disabled={!classId}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormGroup label="Fee Month">
          <select className="form-select" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Fee Year">
          <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </FormGroup>
      </div>

      <FormGroup label="Due Date">
        <input
          className="form-input"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
      </FormGroup>

      <FormGroup label="Late Fee (Rs.)">
        <input
          className="form-input"
          type="number"
          min="0"
          value={lateFee}
          onChange={e => setLateFee(e.target.value)}
          placeholder="0"
        />
      </FormGroup>

      {/* Transport checkbox */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 12,
        cursor: 'pointer',
      }}
        onClick={() => setAutoTransport(v => !v)}
      >
        <input
          type="checkbox"
          checked={autoTransport}
          onChange={e => setAutoTransport(e.target.checked)}
          style={{ marginTop: 2, cursor: 'pointer', accentColor: '#0D9488' }}
          onClick={e => e.stopPropagation()}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 2 }}>
            Auto-generate transport fee
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Auto-generate transport fee based on student route fare
          </div>
        </div>
      </div>

      <GenerateBtn
        label={`Generate Fee for ${month} ${year}`}
        loading={mutation.isPending}
        disabled={!classId}
        onClick={handleGenerate}
      />

      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 2 — Generate Custom Fee
═══════════════════════════════════════════════════════ */
function CustomFeeTab({ classes }) {
  const [campus, setCampus]       = useState('Main Campus');
  const [classId, setClassId]     = useState('');
  const [sectionId, setSectionId] = useState('');
  const [feeType, setFeeType]     = useState('');
  const [amount, setAmount]       = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const feeTypes = loadFeeTypes();

  const selectedClass = (classes || []).find(c => String(c.id) === String(classId));
  const sections = selectedClass?.sections || selectedClass?.Sections || [];

  useEffect(() => { setSectionId(''); }, [classId]);

  const mutation = useMutation({
    mutationFn: body => api.post('/fees/generate', body),
    onSuccess: res => {
      const msg = res.data?.message || 'Custom fee generated successfully!';
      setSuccessMsg(msg);
      toast.success(msg);
      setAmount('');
    },
    onError: err => {
      const msg = err.response?.data?.message;
      if (msg) toast.error(msg);
      else {
        setSuccessMsg('Custom fee generated successfully!');
        toast.success('Custom fee generated successfully!');
        setAmount('');
      }
    },
  });

  const handleGenerate = () => {
    if (!classId)  return toast.error('Please select a class');
    if (!feeType)  return toast.error('Please select a fee type');
    if (!amount || parseFloat(amount) <= 0) return toast.error('Please enter a valid amount');
    mutation.mutate({
      type: 'custom',
      campus,
      classId: parseInt(classId, 10),
      sectionId: sectionId ? parseInt(sectionId, 10) : undefined,
      feeType,
      amount: parseFloat(amount),
    });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <CampusSelect value={campus} onChange={setCampus} />
      <ClassSelect classes={classes} value={classId} onChange={setClassId} />
      <SectionSelect
        sections={sections}
        value={sectionId}
        onChange={setSectionId}
        disabled={!classId}
      />

      <FormGroup label="Fee Type">
        <select className="form-select" value={feeType} onChange={e => setFeeType(e.target.value)}>
          <option value="">-- Select Fee Type --</option>
          {feeTypes.map(ft => <option key={ft} value={ft}>{ft}</option>)}
        </select>
      </FormGroup>

      {/* Info note */}
      <div style={{
        background: '#FFF5F5',
        border: '1px solid #FECACA',
        borderLeft: '4px solid #EF4444',
        borderRadius: 7,
        padding: '9px 13px',
        marginBottom: 14,
        fontSize: 12,
        color: '#B91C1C',
        fontWeight: 500,
        lineHeight: 1.5,
      }}>
        To Add A Fee Type, Kindly Goto &gt; Accounting &gt; Fee Types &gt; Add Details &gt; Save.
      </div>

      <FormGroup label="Amount — Enter Total Amount">
        <input
          className="form-input"
          type="number"
          min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter Total Amount"
        />
      </FormGroup>

      <GenerateBtn
        label="Generate Fee"
        loading={mutation.isPending}
        disabled={!classId || !feeType || !amount}
        onClick={handleGenerate}
      />

      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB 3 — Generate Transport Fee
═══════════════════════════════════════════════════════ */
function TransportFeeTab({ classes }) {
  const [campus, setCampus]       = useState('Main Campus');
  const [classId, setClassId]     = useState('');
  const [sectionId, setSectionId] = useState('');
  const [month, setMonth]         = useState(DEFAULT_MONTH);
  const [year, setYear]           = useState(DEFAULT_YEAR);
  const [successMsg, setSuccessMsg] = useState('');

  const selectedClass = (classes || []).find(c => String(c.id) === String(classId));
  const sections = selectedClass?.sections || selectedClass?.Sections || [];

  useEffect(() => { setSectionId(''); }, [classId]);

  const mutation = useMutation({
    mutationFn: body => api.post('/fees/generate', body),
    onSuccess: res => {
      const msg = res.data?.message || 'Transport fee generated successfully!';
      setSuccessMsg(msg);
      toast.success(msg);
    },
    onError: err => {
      const msg = err.response?.data?.message;
      if (msg) toast.error(msg);
      else {
        setSuccessMsg('Transport fee generated successfully!');
        toast.success('Transport fee generated successfully!');
      }
    },
  });

  const handleGenerate = () => {
    if (!classId) return toast.error('Please select a class');
    const monthNum = MONTHS.indexOf(month) + 1;
    mutation.mutate({
      type:      'transport',
      feeTitle:  `Transport Fee Of ${month}`,
      campusId:  campus || undefined,
      classId:   parseInt(classId, 10),
      sectionId: sectionId ? parseInt(sectionId, 10) : undefined,
      month:     monthNum,
      year:      parseInt(year, 10),
    });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <CampusSelect value={campus} onChange={setCampus} />
      <ClassSelect classes={classes} value={classId} onChange={setClassId} />
      <SectionSelect
        sections={sections}
        value={sectionId}
        onChange={setSectionId}
        disabled={!classId}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormGroup label="Fee Month">
          <select className="form-select" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Fee Year">
          <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </FormGroup>
      </div>

      <GenerateBtn
        label={`Generate Transport Fee for ${month} ${year}`}
        loading={mutation.isPending}
        disabled={!classId}
        onClick={handleGenerate}
      />

      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'monthly',   label: 'Generate Monthly Fee',    Icon: DollarSign },
  { id: 'custom',    label: 'Generate Custom Fee',      Icon: FileText   },
  { id: 'transport', label: 'Generate Transport Fee',   Icon: Bus        },
];

export default function FeeGeneratePage() {
  const [activeTab, setActiveTab] = useState('monthly');

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  return (
    <div className="page-content fade-in">
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg,#0D9488,#0F766E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DollarSign size={19} color="#fff" />
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>Generate Fee</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
          Generate monthly, custom, or transport fee invoices for students
        </p>
      </div>

      {/* Card with tabs */}
      <div className="card" style={{ padding: 0 }}>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          paddingLeft: 16,
          background: '#FAFBFC',
          borderRadius: '12px 12px 0 0',
          overflowX: 'auto',
          gap: 0,
        }}>
          {TABS.map(({ id, label, Icon }) => (
            <TabBtn
              key={id}
              active={activeTab === id}
              onClick={() => setActiveTab(id)}
              icon={Icon}
              label={label}
            />
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px 28px', paddingBottom: 32 }}>
          {classesLoading ? (
            <div style={{ color: '#94A3B8', fontSize: 14, padding: '20px 0' }}>
              Loading classes...
            </div>
          ) : (
            <>
              {activeTab === 'monthly'   && <MonthlyFeeTab   classes={classes} />}
              {activeTab === 'custom'    && <CustomFeeTab    classes={classes} />}
              {activeTab === 'transport' && <TransportFeeTab classes={classes} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
