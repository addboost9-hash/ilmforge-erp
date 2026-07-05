/** EMI Plans — Instalment-based fee payment schedules */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { CreditCard, Plus, Trash2, Calendar } from 'lucide-react';

const empty = { title: '', totalAmount: '', installments: 3, startMonth: '', startYear: new Date().getFullYear(), notes: '' };

export default function EmiPlansPage() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['emi-plans'],
    queryFn: () => api.get('/fees/emi-plans').then(r => r.data.data || []).catch(() => []),
  });

  const create = useMutation({
    mutationFn: () => api.post('/fees/emi-plans', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emi-plans'] }); setShow(false); setForm(empty); toast.success('EMI plan created'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const del = useMutation({
    mutationFn: id => api.delete('/fees/emi-plans/' + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emi-plans'] }); toast.success('Plan deleted'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={20} color="#0073b7" /> EMI / Instalment Plans
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Create instalment schedules for fee payment in easy monthly chunks
          </p>
        </div>
        <button className="btn btn-teal btn-sm" onClick={() => setShow(true)}>
          <Plus size={14} /> New EMI Plan
        </button>
      </div>

      {show && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #0073b7' }}>
          <div className="card-header" style={{ background: '#eff6ff' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>New EMI Plan</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShow(false)}>Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Plan Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual Fee EMI" />
              </div>
              <div className="form-group">
                <label className="form-label">Total Amount (Rs.) *</label>
                <input className="form-input" type="number" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} placeholder="e.g. 12000" />
              </div>
              <div className="form-group">
                <label className="form-label">No. of Instalments</label>
                <select className="form-select" value={form.installments} onChange={e => setForm({ ...form, installments: +e.target.value })}>
                  {[2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} months</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Start Month</label>
                <select className="form-select" value={form.startMonth} onChange={e => setForm({ ...form, startMonth: +e.target.value })}>
                  <option value="">Select month</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
            {form.totalAmount && form.installments && (
              <div className="alert alert-info" style={{ marginBottom: 12 }}>
                <Calendar size={14} />
                <span>Each instalment: <strong>Rs. {Math.round(+form.totalAmount / form.installments).toLocaleString('en-PK')}</strong></span>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => create.mutate()} disabled={!form.title || !form.totalAmount || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : plans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CreditCard size={40} /></div>
            <div className="empty-state-text">No EMI plans yet</div>
            <div className="empty-state-sub">Create instalment plans to help families pay fees in easy chunks</div>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {plans.map(p => (
            <div key={p.id} className="ribbon-card blue">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.installments} × Rs. {Math.round((p.totalAmount || 0) / (p.installments || 1)).toLocaleString('en-PK')}/month</div>
                </div>
                <button className="btn-icon-only" onClick={() => del.mutate(p.id)}><Trash2 size={13} /></button>
              </div>
              <div style={{ marginTop: 12, fontWeight: 800, fontSize: 20, color: '#0073b7' }}>
                Rs. {Number(p.totalAmount || 0).toLocaleString('en-PK')}
              </div>
              {p.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{p.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
