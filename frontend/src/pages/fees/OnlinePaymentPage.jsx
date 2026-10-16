/**
 * IlmForge — Online Payment Gateway
 * JazzCash, EasyPaisa, and Debit/Credit Card fee collection
 * Manual transaction recording + recent payments table
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { money, fromPaisa, toPaisa } from '../../utils/currency';
import { feePeriod } from '../../utils/feeMonth';
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

/* ── Record Payment Modal ──────────────────────
   An online payment pays a fee bill like any other: choose the student,
   then the bill, and it is recorded with Fee Collection's own payment
   (receipt, the bill marked paid, the parent told). It used to post to an
   address that did not exist, so nothing was ever saved. */
const pkToday = () => new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
const METHOD = { jazzcash: 'wallet', easypaisa: 'wallet', card: 'card' };

function RecordPaymentModal({ gateway, onClose, onSaved, recent }) {
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [form, setForm] = useState({ amount: '', transactionId: '', date: pkToday(), notes: '' });
  const [loading, setLoading] = useState(false);

  const { data: studentResults = [] } = useQuery({
    queryKey: ['online-pay-student', studentSearch],
    queryFn: () => api.get('/students', { params: { search: studentSearch, limit: 8 } }).then(r => r.data.data || []),
    enabled: studentSearch.length > 1 && !selectedStudent,
  });
  const { data: fees, isLoading: feesLoading } = useQuery({
    queryKey: ['student-fee', selectedStudent?.id],
    queryFn: () => api.get(`/fees/student/${selectedStudent.id}`).then(r => r.data.data),
    enabled: !!selectedStudent,
  });
  // Bills still owing, oldest first: a payment normally clears the oldest.
  const unpaid = (fees?.invoices || []).filter(i => i.dueAmount > 0).slice().reverse();
  const invoice = unpaid.find(i => String(i.id) === String(invoiceId));

  const pickStudent = (s) => {
    setSelectedStudent(s);
    setStudentSearch(s.name);
    setInvoiceId('');
    setForm(f => ({ ...f, amount: '' }));
  };
  const pickInvoice = (id) => {
    setInvoiceId(id);
    const inv = unpaid.find(i => String(i.id) === String(id));
    if (inv) setForm(f => ({ ...f, amount: String(fromPaisa(inv.dueAmount)) }));
  };
  // Choose the oldest unpaid bill once the student's bills arrive.
  useEffect(() => {
    if (selectedStudent && !invoiceId && unpaid.length) pickInvoice(unpaid[0].id);
  }, [fees, selectedStudent]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!selectedStudent) return toast.error('Choose the student.');
    if (!invoice) return toast.error('Choose the fee bill this payment is for.');
    const paisa = toPaisa(form.amount);
    if (!paisa || paisa <= 0) return toast.error('Enter the amount paid.');
    if (paisa > invoice.dueAmount) return toast.error(`The bill has ${money(invoice.dueAmount)} due. Enter that or less.`);
    const ref = form.transactionId.trim();
    if (!ref) return toast.error('Enter the transaction ID from the payment message.');
    // The same transaction recorded twice would count the money twice.
    if ((recent || []).some(p => !p.voidedAt && String(p.remarks || '').includes(`Ref ${ref}`))) {
      return toast.error(`Transaction ${ref} is already recorded.`);
    }
    setLoading(true);
    try {
      const r = await api.post('/fees/payments', {
        invoiceId: invoice.id,
        amountPaid: paisa,
        method: METHOD[gateway.id] || 'online',
        paymentDate: form.date,
        remarks: [`${gateway.label} · Ref ${ref}`, form.notes.trim()].filter(Boolean).join(' · '),
      });
      toast.success(`Recorded: receipt ${r.data.data?.receiptNo || ''} for ${selectedStudent.name}.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'The payment could not be recorded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="record-online-title" style={{ background: '#fff', borderRadius: 14, padding: 26, width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div id="record-online-title" style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
            {gateway.icon} Record a {gateway.label} payment
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18}/></button>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="op-student">Student *</label>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}/>
            <input id="op-student" className="form-input" style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="Name, roll number or parent's phone"
              value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); setInvoiceId(''); }} />
          </div>
          {studentSearch.length > 1 && !selectedStudent && studentResults.length > 0 && (
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.07)' }}>
              {studentResults.map(s => (
                <button type="button" key={s.id} onClick={() => pickStudent(s)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', cursor: 'pointer', fontSize: 13, border: 0, borderBottom: '1px solid #F3F4F6', background: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{s.name} <span style={{ color: '#6B7280', fontWeight: 400 }}>· {s.rollNo}</span></span>
                  <span style={{ color: '#6B7280', fontSize: 12 }}>{s.class?.name || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" htmlFor="op-bill">Fee bill *</label>
            {feesLoading ? <div style={{ fontSize: 12.5, color: '#6B7280' }}>Loading bills…</div>
              : unpaid.length ? (
                <select id="op-bill" className="form-input" value={invoiceId} onChange={e => pickInvoice(e.target.value)}>
                  {unpaid.map(i => <option key={i.id} value={i.id}>{feePeriod(i) || i.feeTitle} — {money(i.dueAmount)} due</option>)}
                </select>
              ) : <div style={{ fontSize: 12.5, color: '#15803D', fontWeight: 600 }}>{selectedStudent.name} has no unpaid bills.</div>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="op-amount">Amount paid (Rs.) *</label>
            <input id="op-amount" className="form-input" type="number" min="1" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 2500" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="op-date">Paid on</label>
            <input id="op-date" className="form-input" type="date" value={form.date} max={pkToday()}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="op-ref">Transaction ID *</label>
          <input id="op-ref" className="form-input" value={form.transactionId}
            onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))}
            placeholder={gateway.id === 'jazzcash' ? 'e.g. 012345678901' : gateway.id === 'easypaisa' ? 'e.g. 23456789012' : 'e.g. TXN123456'} />
        </div>

        <div className="form-group" style={{ marginBottom: 18 }}>
          <label className="form-label" htmlFor="op-notes">Note (optional)</label>
          <input id="op-notes" className="form-input" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. paid by the father" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="button" className="btn btn-sm" style={{ flex: 1, background: gateway.color, color: '#fff', border: 'none' }}
            onClick={save} disabled={loading || !invoice}>
            {loading ? 'Recording…' : 'Record payment'}
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
        <button aria-label="Show more"
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
            <Link to="/settings/payments"
              className="btn btn-outline btn-sm"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ExternalLink size={12}/> Configure in Settings
            </Link>
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

  // The payments recorded from this page are fee payments made by wallet
  // (JazzCash, EasyPaisa) or card.
  const { data: txns = [] } = useQuery({
    queryKey: ['recent-payments-online'],
    queryFn: () => api.get('/fees/payments', { params: { method: 'wallet,card,online', limit: 200 } })
      .then(r => r.data.data || []).catch(() => []),
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
          onSaved={() => { qc.invalidateQueries({ queryKey: ['recent-payments-online'] }); qc.invalidateQueries({ queryKey: ['student-fee'] }); }}
          recent={txns}
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
          <Link to="/settings/payments" style={{ color: '#D97706', fontWeight: 700 }}>Settings &rarr; Payments</Link>{' '}
          to show them on vouchers and receipts. A payment a parent made online is recorded against their fee bill here.
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
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Latest {Math.min(txns.length, 20)}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>
                {['Paid on', 'Student', 'Fee', 'Amount', 'Paid by', 'Receipt / reference', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: '#94a3b8', fontSize: 13 }}>
                    No online payments recorded yet
                  </td>
                </tr>
              ) : txns.slice(0, 20).map(t => {
                const voided = !!t.voidedAt;
                const how = /jazzcash/i.test(t.remarks || '') ? 'JazzCash' : /easypaisa/i.test(t.remarks || '') ? 'EasyPaisa' : t.method === 'card' ? 'Card' : t.method;
                const pc = providerColor(/jazzcash/i.test(how) ? 'jazzcash' : /easypaisa/i.test(how) ? 'easypaisa' : 'card');
                return (
                  <tr key={t.id} style={{ opacity: voided ? 0.55 : 1 }}>
                    <td style={{ fontSize: 12, color: '#6B7280' }}>{t.paymentDate ? new Date(t.paymentDate).toLocaleDateString('en-PK') : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{t.invoice?.student?.name || '—'}<div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{t.invoice?.student?.class?.name || ''}</div></td>
                    <td style={{ fontSize: 12.5 }}>{feePeriod(t.invoice || {}) || t.invoice?.feeTitle || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#0073b7', textDecoration: voided ? 'line-through' : 'none' }}>{money(t.amountPaid)}</td>
                    <td><span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: pc + '18', color: pc }}>{how}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#374151' }}>{t.receiptNo || '—'}<div style={{ color: '#94a3b8' }}>{(String(t.remarks || '').match(/Ref ([^·]+)/) || [])[1] || ''}</div></td>
                    <td><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: voided ? '#FEE2E2' : '#DCFCE7', color: voided ? '#DC2626' : '#15803D' }}>{voided ? 'cancelled' : 'received'}</span></td>
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
