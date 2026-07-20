/**
 * IlmForge — Online Payment Gateway
 * JazzCash, EasyPaisa, and Debit/Credit Card fee collection
 * Manual transaction recording + recent payments table
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  Globe, CreditCard, Smartphone, ExternalLink, CheckCircle,
  X, Search, Plus, Copy, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react';

/* ── Gateway config ──────────────────────────── */
const GATEWAYS = [
  {
    id:      'jazzcash',
    label:   'JazzCash',
    color:   '#EF4444',
    bgLight: '#FEF2F2',
    icon:    '📱',
    tagline: "Pakistan's leading mobile wallet",
    desc:    'Students and parents can pay school fees directly via the JazzCash app, USSD *786#, or any JazzCash merchant.',
    steps: [
      'Open JazzCash app or dial *786#',
      'Select "Send Money" or "Bill Payment"',
      'Enter the school JazzCash account number',
      'Enter fee amount and confirm with PIN',
      'Share transaction ID with the school',
    ],
    accountLabel: 'JazzCash Account',
    settingsKey:  'jazzcashAccount',
    color2:       '#B91C1C',
  },
  {
    id:      'easypaisa',
    label:   'EasyPaisa',
    color:   '#10B981',
    bgLight: '#ECFDF5',
    icon:    '💚',
    tagline: 'Telenor EasyPaisa mobile payments',
    desc:    'Widely used across Pakistan. Parents can pay via EasyPaisa app, SMS, or any EasyPaisa retailer.',
    steps: [
      'Open EasyPaisa app or dial *786#',
      'Choose "Send Money" or "Pay Bill"',
      'Enter school EasyPaisa mobile number',
      'Confirm the amount and authenticate',
      'Note the Transaction ID (TID) for records',
    ],
    accountLabel: 'EasyPaisa Number',
    settingsKey:  'easypaisaAccount',
    color2:       '#065F46',
  },
  {
    id:      'card',
    label:   'Debit / Credit Card',
    color:   '#6366F1',
    bgLight: '#EEF2FF',
    icon:    '💳',
    tagline: 'Visa & Mastercard via secure gateway',
    desc:    'Parents can pay using any Visa or Mastercard debit/credit card through the school online portal.',
    steps: [
      'Visit the school payment portal link',
      'Enter student roll number or ID',
      'Enter fee amount to pay',
      'Provide card details on the secure page',
      'Save the payment receipt',
    ],
    accountLabel: 'Payment Portal URL',
    settingsKey:  'cardPaymentUrl',
    color2:       '#4338CA',
  },
];

/* ── Record Payment Modal ────────────────────── */
function RecordPaymentModal({ gateway, onClose, onSaved }) {
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState({
    amount:        '',
    transactionId: '',
    date:          new Date().toISOString().slice(0, 10),
    notes:         '',
  });
  const [loading, setLoading] = useState(false);

  const { data: studentResults = [] } = useQuery({
    queryKey: ['online-pay-student', studentSearch],
    queryFn: () => studentSearch.length > 1
      ? api.get('/students', { params: { search: studentSearch, limit: 8 } }).then(r => r.data.data || [])
      : Promise.resolve([]),
    enabled: studentSearch.length > 1,
  });

  const save = async () => {
    if (!selectedStudent) return toast.error('Select a student');
    if (!form.amount || +form.amount <= 0) return toast.error('Enter a valid amount');
    if (!form.transactionId.trim()) return toast.error('Enter the transaction / reference ID');
    setLoading(true);
    try {
      await api.post('/payments', {
        studentId:     selectedStudent.id,
        amount:        Math.round(parseFloat(form.amount) * 100),
        method:        'online',
        provider:      gateway.id,
        providerRef:   form.transactionId,
        date:          form.date,
        notes:         form.notes,
        status:        'completed',
      });
      toast.success('Online payment recorded successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
            {gateway.icon} Record {gateway.label} Payment
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18}/></button>
        </div>

        {/* Student */}
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Student *</label>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}/>
            <input className="form-input" style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="Search student by name..."
              value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
            />
          </div>
          {selectedStudent && (
            <div style={{ marginTop: 5, fontSize: 12.5, fontWeight: 600, color: '#0F766E' }}>
              Selected: {selectedStudent.name} ({selectedStudent.class?.name || ''})
            </div>
          )}
          {studentSearch.length > 1 && !selectedStudent && studentResults.length > 0 && (
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.07)' }}>
              {studentResults.map(s => (
                <div key={s.id}
                  onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FDFA'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: '#6B7280', fontSize: 12 }}>{s.class?.name || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Amount Paid (Rs.) *</label>
            <input className="form-input" type="number" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 5000"/>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Date</label>
            <input className="form-input" type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Transaction / Reference ID *</label>
          <input className="form-input" value={form.transactionId}
            onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))}
            placeholder={gateway.id === 'jazzcash' ? 'e.g. JC2024123456' : gateway.id === 'easypaisa' ? 'e.g. EP20241234' : 'e.g. TXN123456'}/>
        </div>

        <div className="form-group" style={{ marginBottom: 18 }}>
          <label className="form-label">Notes (optional)</label>
          <input className="form-input" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional notes..."/>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button
            className="btn btn-sm"
            style={{ flex: 1, background: gateway.color, color: '#fff', border: 'none' }}
            onClick={save}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Gateway Card ────────────────────────────── */
function GatewayCard({ gw, settings, onRecord }) {
  const [expanded, setExpanded] = useState(false);
  const accountValue = settings?.[gw.settingsKey] || '';
  const active = !!accountValue || (settings?.enabledGateways || []).includes(gw.id);

  const copyAccount = () => {
    if (!accountValue) return;
    navigator.clipboard.writeText(accountValue).then(() => toast.success('Copied to clipboard'));
  };

  return (
    <div style={{ background: '#fff', border: `2px solid ${active ? gw.color + '40' : '#E5E7EB'}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      {/* Top stripe */}
      <div style={{ height: 5, background: `linear-gradient(90deg,${gw.color},${gw.color2})` }}/>

      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: gw.bgLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {gw.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{gw.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: active ? '#DCFCE7' : '#F3F4F6', color: active ? '#15803D' : '#9CA3AF' }}>
                {active ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{gw.tagline}</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 14 }}>{gw.desc}</p>

        {/* Account number display */}
        {accountValue && (
          <div style={{ background: gw.bgLight, border: `1px solid ${gw.color}30`, borderRadius: 9, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: gw.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>
                {gw.accountLabel}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: gw.color2, letterSpacing: '1px' }}>
                {accountValue}
              </div>
            </div>
            <button
              onClick={copyAccount}
              style={{ background: gw.color, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
              <Copy size={12}/> Copy
            </button>
          </div>
        )}

        {/* How to pay — expandable */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: gw.color, fontWeight: 600, marginBottom: expanded ? 10 : 0, padding: 0 }}>
          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
          How to Pay via {gw.label}
        </button>

        {expanded && (
          <ol style={{ margin: '8px 0 14px 18px', padding: 0 }}>
            {gw.steps.map((step, i) => (
              <li key={i} style={{ fontSize: 12.5, color: '#374151', marginBottom: 5, lineHeight: 1.5 }}>
                {step}
              </li>
            ))}
          </ol>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {active ? (
            <button
              className="btn btn-sm"
              style={{ background: gw.color, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => onRecord(gw)}
            >
              <Plus size={13}/> Record Payment
            </button>
          ) : (
            <a href="/settings/payments"
              className="btn btn-outline btn-sm"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ExternalLink size={12}/> Configure in Settings
            </a>
          )}
          {active && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#15803D', fontWeight: 600 }}>
              <CheckCircle size={13}/> Ready
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────── */
export default function OnlinePaymentPage() {
  const qc = useQueryClient();
  const [recordGateway, setRecordGateway] = useState(null);

  const { data: settings = {} } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: () => api.get('/settings/payment').then(r => r.data.data || {}).catch(() => ({})),
  });

  const { data: txns = [] } = useQuery({
    queryKey: ['recent-payments-online'],
    queryFn: () => api.get('/payments?method=online&limit=20').then(r => r.data.data || []).catch(() => []),
  });

  const statusColor = s => ({
    completed: { bg: '#DCFCE7', color: '#15803D' },
    failed:    { bg: '#FEE2E2', color: '#DC2626' },
    pending:   { bg: '#FEF3C7', color: '#92400E' },
  }[s] || { bg: '#F3F4F6', color: '#9CA3AF' });

  const providerColor = id => ({
    jazzcash:  '#EF4444',
    easypaisa: '#10B981',
    card:      '#6366F1',
  }[id] || '#6B7280');

  return (
    <div className="page-content fade-in">
      {recordGateway && (
        <RecordPaymentModal
          gateway={recordGateway}
          onClose={() => setRecordGateway(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['recent-payments-online'] })}
        />
      )}

      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={20} color="#0073b7"/> Online Payment Gateway
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Accept and record JazzCash, EasyPaisa, and card payments from parents
          </p>
        </div>
      </div>

      {/* Notice banner */}
      <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }}/>
        <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
          <strong>Setup required:</strong> Configure your JazzCash account number, EasyPaisa number, and payment portal URL in{' '}
          <a href="/settings/payments" style={{ color: '#D97706', fontWeight: 700 }}>Settings &rarr; Payments</a>{' '}
          to show them on vouchers and receipts. You can still record online payments manually below.
        </div>
      </div>

      {/* Gateway cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 28 }}>
        {GATEWAYS.map(gw => (
          <GatewayCard key={gw.id} gw={gw} settings={settings} onRecord={g => setRecordGateway(g)} />
        ))}
      </div>

      {/* Recent online payments table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Recent Online Payments</h3>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Last 20 transactions</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>
                {['Date', 'Student', 'Amount', 'Provider', 'Transaction ID', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#94a3b8', fontSize: 13 }}>
                    No online payments recorded yet
                  </td>
                </tr>
              ) : txns.map(t => {
                const sc = statusColor(t.status);
                const pc = providerColor(t.provider || t.method);
                return (
                  <tr key={t.id}>
                    <td style={{ fontSize: 12, color: '#6B7280' }}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-PK') : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.student?.name || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#0073b7' }}>
                      Rs. {Number(t.amount || 0).toLocaleString('en-PK')}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: pc + '18', color: pc }}>
                        {t.provider || t.method || '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#374151' }}>
                      {t.providerRef || t.transactionNo || '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: sc.bg, color: sc.color }}>
                        {t.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
