import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { CreditCard, RefreshCw, AlertCircle } from 'lucide-react';

const Rs = (v) => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');

export default function PaymentTransactionsPage() {
  const qc = useQueryClient();

  const [filters, setFilters] = useState({ status: '', method: '' });
  const [form, setForm] = useState({ amount: '', method: 'online', provider: '', channel: 'manual', purpose: 'fee_payment', notes: '' });

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: '1', limit: '25' });
    if (filters.status) params.set('status', filters.status);
    if (filters.method) params.set('method', filters.method);
    return params.toString();
  }, [filters]);

  const { data: txResp, isLoading: txLoading, refetch } = useQuery({
    queryKey: ['payments-transactions', queryString],
    queryFn: () => api.get(`/payments/transactions?${queryString}`).then((r) => r.data),
    staleTime: 20_000,
  });

  const { data: summaryResp, isLoading: summaryLoading } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: () => api.get('/payments/summary').then((r) => r.data),
    staleTime: 20_000,
  });

  const rows = txResp?.data || [];
  const summary = summaryResp?.data || {};

  const initiate = useMutation({
    mutationFn: () => api.post('/payments/initiate', {
      amount: parseInt(form.amount, 10),
      method: form.method,
      provider: form.provider || undefined,
      channel: form.channel || undefined,
      purpose: form.purpose || 'fee_payment',
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Payment transaction initiated.');
      setForm((p) => ({ ...p, amount: '', provider: '', notes: '' }));
      qc.invalidateQueries({ queryKey: ['payments-transactions'] });
      qc.invalidateQueries({ queryKey: ['payments-summary'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not initiate transaction.'),
  });

  const markPaid = useMutation({
    mutationFn: (id) => api.post(`/payments/${id}/mark-success`, { providerRef: `UI-PAID-${id}` }),
    onSuccess: () => {
      toast.success('Transaction marked paid.');
      qc.invalidateQueries({ queryKey: ['payments-transactions'] });
      qc.invalidateQueries({ queryKey: ['payments-summary'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not mark paid.'),
  });

  const markFailed = useMutation({
    mutationFn: (id) => api.post(`/payments/${id}/mark-failed`, { reason: 'Marked failed from UI' }),
    onSuccess: () => {
      toast.success('Transaction marked failed.');
      qc.invalidateQueries({ queryKey: ['payments-transactions'] });
      qc.invalidateQueries({ queryKey: ['payments-summary'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not mark failed.'),
  });

  const card = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    padding: 16,
  };

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={18} color="#1D4ED8" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 18 }}>Payment Transactions</div>
            <div style={{ color: '#64748B', fontSize: 12 }}>Initiate and reconcile transaction events</div>
          </div>
        </div>
        <button onClick={() => refetch()} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { key: 'pending', label: 'Pending', color: '#B45309', bg: '#FEF3C7' },
          { key: 'paid', label: 'Paid', color: '#15803D', bg: '#DCFCE7' },
          { key: 'failed', label: 'Failed', color: '#B91C1C', bg: '#FEE2E2' },
          { key: 'refunded', label: 'Refunded', color: '#1D4ED8', bg: '#DBEAFE' },
        ].map((s) => (
          <div key={s.key} style={{ ...card, background: s.bg, borderColor: 'transparent', minHeight: 86 }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 22, color: s.color, fontWeight: 900, marginTop: 2 }}>{summaryLoading ? '...' : (summary[s.key]?.count || 0)}</div>
            <div style={{ fontSize: 12, color: s.color }}>{summaryLoading ? '' : Rs(summary[s.key]?.amount || 0)}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: '#0F172A' }}>Initiate Transaction</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1.5fr auto', gap: 8 }}>
          <input value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" type="number" style={inputStyle} />
          <select value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))} style={inputStyle}>
            <option value="online">online</option>
            <option value="cash">cash</option>
            <option value="card">card</option>
            <option value="wallet">wallet</option>
            <option value="bank">bank</option>
          </select>
          <input value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} placeholder="Provider" style={inputStyle} />
          <input value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))} placeholder="Channel" style={inputStyle} />
          <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" style={inputStyle} />
          <button
            onClick={() => {
              if (!form.amount || parseInt(form.amount, 10) <= 0) return toast.error('Enter valid amount.');
              initiate.mutate();
            }}
            disabled={initiate.isPending}
            style={actionBtn('#0D9488')}
          >
            {initiate.isPending ? 'Saving...' : 'Initiate'}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: '#0F172A' }}>Transactions</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={smallSelect}>
              <option value="">All Status</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
              <option value="refunded">refunded</option>
            </select>
            <select value={filters.method} onChange={(e) => setFilters((p) => ({ ...p, method: e.target.value }))} style={smallSelect}>
              <option value="">All Methods</option>
              <option value="online">online</option>
              <option value="cash">cash</option>
              <option value="card">card</option>
              <option value="wallet">wallet</option>
              <option value="bank">bank</option>
            </select>
          </div>
        </div>

        {txLoading ? (
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading transactions...</div>
        ) : rows.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={14} />No transactions found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Txn #', 'Amount', 'Method', 'Status', 'Provider Ref', 'Created', 'Action'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.transactionNo}</td>
                    <td style={td}>{Rs(r.amount)}</td>
                    <td style={td}>{r.paymentMethod}</td>
                    <td style={td}><StatusBadge status={r.status} /></td>
                    <td style={td}>{r.providerRef || '-'}</td>
                    <td style={td}>{new Date(r.createdAt).toLocaleString()}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button disabled={r.status !== 'pending' || markPaid.isPending} onClick={() => markPaid.mutate(r.id)} style={chip('#15803D')}>Paid</button>
                        <button disabled={r.status !== 'pending' || markFailed.isPending} onClick={() => markFailed.mutate(r.id)} style={chip('#B91C1C')}>Fail</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { bg: '#FEF3C7', c: '#B45309' },
    paid: { bg: '#DCFCE7', c: '#15803D' },
    failed: { bg: '#FEE2E2', c: '#B91C1C' },
    refunded: { bg: '#DBEAFE', c: '#1D4ED8' },
  };
  const s = map[status] || map.pending;
  return <span style={{ background: s.bg, color: s.c, padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{status}</span>;
}

const inputStyle = {
  border: '1px solid #CBD5E1',
  borderRadius: 8,
  padding: '9px 10px',
  fontSize: 13,
  outline: 'none',
};

const smallSelect = {
  border: '1px solid #CBD5E1',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
};

const th = {
  textAlign: 'left',
  padding: '10px 8px',
  fontSize: 11,
  color: '#64748B',
  fontWeight: 700,
  borderBottom: '1px solid #E2E8F0',
};

const td = {
  padding: '10px 8px',
  fontSize: 12.5,
  color: '#1F2937',
  borderBottom: '1px solid #F1F5F9',
  verticalAlign: 'middle',
};

const actionBtn = (bg) => ({
  border: 'none',
  background: bg,
  color: '#fff',
  borderRadius: 8,
  padding: '0 12px',
  fontWeight: 700,
  cursor: 'pointer',
  minHeight: 38,
});

const chip = (c) => ({
  border: `1px solid ${c}33`,
  background: `${c}15`,
  color: c,
  borderRadius: 999,
  fontSize: 11,
  padding: '4px 8px',
  fontWeight: 700,
  cursor: 'pointer',
});
