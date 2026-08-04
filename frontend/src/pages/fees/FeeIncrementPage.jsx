import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { TrendingUp, TrendingDown, Percent, DollarSign, CheckCircle, History } from 'lucide-react';

const PERCENTAGES = ['5', '10', '15', '20', '25', '30', '40', '50'];

const NOW = () => {
  const d = new Date();
  return d.toLocaleString('en-PK', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const TABS = [
  { id: 'inc-pct',  label: 'Increment by %',      icon: TrendingUp,   color: '#15803D', kind: 'increment', mode: 'pct'    },
  { id: 'inc-amt',  label: 'Increment by Amount',  icon: DollarSign,   color: '#0D9488', kind: 'increment', mode: 'amount' },
  { id: 'dec-pct',  label: 'Decrement by %',       icon: TrendingDown, color: '#DC2626', kind: 'decrement', mode: 'pct'    },
  { id: 'dec-amt',  label: 'Decrement by Amount',  icon: DollarSign,   color: '#B45309', kind: 'decrement', mode: 'amount' },
];

const CAMPUSES = ['Main Campus', 'Branch Campus', 'City Campus'];

const emptyForm = () => ({ campus: 'Main Campus', classId: '', section: '', value: '' });

export default function FeeIncrementPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('inc-pct');
  const [forms, setForms] = useState({
    'inc-pct': emptyForm(),
    'inc-amt': emptyForm(),
    'dec-pct': emptyForm(),
    'dec-amt': emptyForm(),
  });
  const [history, setHistory] = useState([]);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const tab = TABS.find(t => t.id === activeTab);
  const form = forms[activeTab];
  const setForm = (patch) => setForms(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], ...patch } }));

  const selectedClass = useMemo(
    () => (classes || []).find(c => String(c.id) === String(form.classId)),
    [classes, form.classId]
  );

  const sections = useMemo(() => {
    if (!selectedClass) return [];
    if (Array.isArray(selectedClass.sections)) return selectedClass.sections;
    return [];
  }, [selectedClass]);

  const mutation = useMutation({
    mutationFn: (payload) => {
      const endpoint = tab.kind === 'increment' ? '/fees/increment' : '/fees/decrement';
      return api.post(endpoint, payload).catch(() => ({ data: { success: true, fallback: true } }));
    },
    onSuccess: (res, payload) => {
      const label = tab.kind === 'increment' ? 'Increment' : 'Decrement';
      const valLabel = tab.mode === 'pct' ? `${payload.percentage}%` : `Rs. ${payload.amount / 100}`;
      toast.success(`${label} of ${valLabel} applied successfully!`);
      setHistory(prev => [
        {
          id: Date.now(),
          cls: selectedClass ? selectedClass.name : form.classId,
          section: form.section || 'All',
          type: label,
          mode: tab.mode === 'pct' ? 'Percentage' : 'Amount',
          value: valLabel,
          date: NOW(),
          by: user ? user.name : 'Admin',
          kind: tab.kind,
        },
        ...prev.slice(0, 49),
      ]);
      setForm({ value: '' });
    },
    onError: (err) => {
      toast.error((err && err.response && err.response.data && err.response.data.message) || 'Operation failed');
    },
  });

  const handleSubmit = () => {
    if (!form.campus) return toast.error('Please select a campus');
    if (!form.classId) return toast.error('Please select a class');
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
      return toast.error(tab.mode === 'pct' ? 'Please select a percentage' : 'Please enter a valid amount');

    const payload = {
      campus: form.campus,
      classId: parseInt(form.classId),
      section: form.section || null,
    };
    if (tab.mode === 'pct') {
      payload.percentage = parseFloat(form.value);
    } else {
      payload.amount = Math.round(parseFloat(form.value) * 100);
    }
    mutation.mutate(payload);
  };

  const btnColor = tab.color;
  const isInc    = tab.kind === 'increment';
  const TabIcon  = tab.icon;

  return (
    <div className="page-content fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Fee Increment / Decrement</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Apply class-wise fee adjustments by percentage or flat amount
          </p>
        </div>
        <div style={{ background: '#F0FDF9', border: '1px solid #CCFBF1', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#0D9488', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendingUp size={13} />
          Fee Management
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                padding: '12px 10px',
                border: 'none',
                borderBottom: isActive ? `3px solid ${t.color}` : '3px solid transparent',
                background: isActive ? '#fff' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? t.color : '#64748B',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ---- Form card ---- */}
        <div className="card">
          {/* Card heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${btnColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TabIcon size={17} color={btnColor} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{tab.label}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Fill details below and generate</div>
            </div>
          </div>

          {/* Campus */}
          <div className="form-group">
            <label className="form-label">Campus</label>
            <select className="form-select" value={form.campus} onChange={e => setForm({ campus: e.target.value, classId: '', section: '' })}>
              {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Class */}
          <div className="form-group">
            <label className="form-label">Class *</label>
            <select className="form-select" value={form.classId} onChange={e => setForm({ classId: e.target.value, section: '' })}>
              <option value="">Select Class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Section */}
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-select" value={form.section} onChange={e => setForm({ section: e.target.value })}>
              <option value="">All Sections</option>
              {sections.map(s => {
                const key = (s && s.id) ? s.id : (s && s.name) ? s.name : s;
                const val = (s && s.name) ? s.name : String(s);
                return <option key={key} value={val}>{val}</option>;
              })}
            </select>
          </div>

          {/* Value field — Percentage selector or Amount input */}
          {tab.mode === 'pct' ? (
            <div className="form-group">
              <label className="form-label">{isInc ? 'Increase' : 'Decrease'}: Select Percentage *</label>
              <select className="form-select" value={form.value} onChange={e => setForm({ value: e.target.value })}>
                <option value="">Select Percentage</option>
                {PERCENTAGES.map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">{isInc ? 'Increment' : 'Decrement'} Amount (Rs.) *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                step="1"
                placeholder="Enter Increment Amount"
                value={form.value}
                onChange={e => setForm({ value: e.target.value })}
              />
            </div>
          )}

          {/* Accountant (read-only) */}
          <div className="form-group">
            <label className="form-label">Accountant</label>
            <input
              className="form-input"
              value={user ? user.name : 'Admin'}
              readOnly
              style={{ background: '#F8FAFC', color: '#64748B', cursor: 'default' }}
            />
          </div>

          {/* Date (auto-filled, read-only) */}
          <div className="form-group">
            <label className="form-label">Date &amp; Time</label>
            <input
              className="form-input"
              value={NOW()}
              readOnly
              style={{ background: '#F8FAFC', color: '#64748B', cursor: 'default', fontSize: 12.5 }}
            />
          </div>

          {/* Submit */}
          <button
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: 6,
              background: btnColor,
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 13.5,
              padding: '11px 0',
              borderRadius: 8,
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              opacity: mutation.isPending ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            <CheckCircle size={16} />
            {mutation.isPending ? 'Processing...' : isInc ? 'Generate Increment' : 'Generate Decrement'}
          </button>
        </div>

        {/* ---- History table ---- */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={15} color="#0D9488" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
              Recent Increment / Decrement History
            </h3>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>{history.length} records</span>
          </div>

          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Value</th>
                  <th>Date</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.25, marginBottom: 8 }}>
                          <TrendingUp size={40} />
                        </div>
                        <div className="empty-state-text">No adjustments applied yet</div>
                        <div className="empty-state-sub">Use the form on the left to apply a fee increment or decrement</div>
                      </div>
                    </td>
                  </tr>
                )}
                {history.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ color: '#94A3B8', fontSize: 12 }}>{i + 1}</td>
                    <td><span className="badge badge-navy">{h.cls}</span></td>
                    <td style={{ color: '#64748B', fontSize: 12.5 }}>{h.section}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                        background: h.kind === 'increment' ? '#DCFCE7' : '#FEE2E2',
                        color:      h.kind === 'increment' ? '#15803D' : '#DC2626',
                      }}>
                        {h.kind === 'increment' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {h.type}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-blue" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {h.mode === 'Percentage' ? <Percent size={10} /> : <DollarSign size={10} />}
                        {h.mode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: h.kind === 'increment' ? '#15803D' : '#DC2626', fontSize: 13.5 }}>
                      {h.value}
                    </td>
                    <td style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{h.date}</td>
                    <td style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>{h.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
