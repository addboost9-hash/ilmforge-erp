/**
 * IlmForge — EMI / Instalment Plans
 * Create instalment plans per student, track payment per instalment.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  CreditCard, Plus, Trash2, Calendar, Search, CheckCircle,
  ChevronDown, ChevronRight, DollarSign, X, Clock,
} from 'lucide-react';

const money = v => 'Rs. ' + ((v || 0) / 100).toLocaleString();
const moneyNum = v => ((v || 0) / 100);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const emptyForm = {
  studentId:    '',
  title:        '',
  totalAmount:  '',
  installments: 3,
  startMonth:   new Date().getMonth() + 1,
  startYear:    new Date().getFullYear(),
  notes:        '',
};

/* ── Instalment badge ─────────────────────────── */
function InstBadge({ status }) {
  const map = {
    paid:    { label: 'Paid',    bg: '#DCFCE7', color: '#15803D' },
    pending: { label: 'Pending', bg: '#FEF3C7', color: '#92400E' },
    overdue: { label: 'Overdue', bg: '#FEE2E2', color: '#DC2626' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ── Pay Instalment Modal ─────────────────────── */
function PayInstModal({ plan, instalment, onClose, onPaid }) {
  const [method,  setMethod]  = useState('cash');
  const [loading, setLoading] = useState(false);

  const amount = Math.round((plan.totalAmount || 0) / (plan.installments || 1));

  const confirm = async () => {
    setLoading(true);
    try {
      await api.post(`/fees/emi-plans/${plan.id}/pay`, {
        instalmentIndex: instalment.index,
        amountPaid:      amount,
        method,
      });
      toast.success('Instalment marked as paid');
      onPaid();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F4C45' }}>Mark Instalment Paid</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18}/></button>
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 14 }}>
          <div style={{ fontWeight: 600 }}>{plan.title}</div>
          <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
            Instalment {instalment.index + 1} of {plan.installments} — {MONTHS[(instalment.month - 1) % 12]} {instalment.year}
          </div>
          <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: '#0F4C45' }}>
            Amount: {money(amount * 100)}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Payment Method</label>
          <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-teal btn-sm" onClick={confirm} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Plan Card ─────────────────────────────────── */
function PlanCard({ plan, onDelete, onPayInstalment }) {
  const [expanded, setExpanded] = useState(false);
  const instAmount = Math.round((plan.totalAmount || 0) / (plan.installments || 1));
  const paidCount  = (plan.paidInstalments || []).length;
  const progress   = Math.round((paidCount / (plan.installments || 1)) * 100);

  // Build instalment schedule
  const schedule = useMemo(() => {
    const list = [];
    let month = plan.startMonth || 1;
    let year  = plan.startYear  || new Date().getFullYear();
    for (let i = 0; i < (plan.installments || 1); i++) {
      const isPaid = (plan.paidInstalments || []).includes(i);
      const dueDate = new Date(year, month - 1, 1);
      const isOverdue = !isPaid && dueDate < new Date();
      list.push({ index: i, month, year, isPaid, isOverdue });
      month++;
      if (month > 12) { month = 1; year++; }
    }
    return list;
  }, [plan]);

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      {/* Card header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{plan.title}</div>
            {plan.student && (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                {plan.student.name} — {plan.student.class?.name || ''}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0073b7' }}>
              {money((plan.totalAmount || 0) * 100)}
            </span>
            <button className="btn-icon-only" onClick={() => onDelete(plan.id)} title="Delete plan">
              <Trash2 size={13}/>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280', marginBottom: 10, flexWrap: 'wrap' }}>
          <span><strong>{plan.installments}</strong> instalments</span>
          <span><strong>{money(instAmount * 100)}</strong>/month</span>
          <span style={{ color: '#15803D', fontWeight: 600 }}>{paidCount} paid</span>
          <span style={{ color: plan.installments - paidCount > 0 ? '#DC2626' : '#15803D', fontWeight: 600 }}>
            {plan.installments - paidCount} remaining
          </span>
          {plan.startMonth && (
            <span>From {MONTHS[(plan.startMonth - 1) % 12]} {plan.startYear}</span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ background: '#F3F4F6', borderRadius: 99, height: 7, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: progress === 100 ? '#10b981' : '#0073b7', borderRadius: 99, width: progress + '%', transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{progress}% paid</div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', background: '#F8FAFC', border: 'none', padding: '9px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#0073b7', fontWeight: 600 }}
      >
        {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        {expanded ? 'Hide' : 'Show'} Instalment Schedule
      </button>

      {/* Schedule list */}
      {expanded && (
        <div style={{ padding: '10px 18px 14px' }}>
          {schedule.map(inst => (
            <div key={inst.index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: inst.isPaid ? '#DCFCE7' : inst.isOverdue ? '#FEE2E2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {inst.isPaid
                  ? <CheckCircle size={13} color="#15803D"/>
                  : inst.isOverdue
                    ? <Clock size={13} color="#DC2626"/>
                    : <Calendar size={13} color="#3B82F6"/>
                }
              </div>
              <div style={{ flex: 1, fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>
                  Instalment {inst.index + 1} — {MONTHS[(inst.month - 1) % 12]} {inst.year}
                </div>
                <div style={{ fontSize: 11.5, color: '#6B7280' }}>{money(instAmount * 100)}</div>
              </div>
              <InstBadge status={inst.isPaid ? 'paid' : inst.isOverdue ? 'overdue' : 'pending'} />
              {!inst.isPaid && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#0F766E', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11.5, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => onPayInstalment(plan, inst)}
                >
                  <DollarSign size={11}/> Pay
                </button>
              )}
            </div>
          ))}
          {plan.notes && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
              Note: {plan.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────── */
export default function EmiPlansPage() {
  const qc = useQueryClient();
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [filterSearch,  setFilterSearch]  = useState('');
  const [payTarget,     setPayTarget]     = useState(null); // { plan, instalment }

  /* load plans */
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['emi-plans'],
    queryFn: () => api.get('/fees/emi-plans').then(r => r.data.data || []).catch(() => []),
  });

  /* student search for form */
  const { data: studentResults = [] } = useQuery({
    queryKey: ['emi-student-search', studentSearch],
    queryFn: () => studentSearch.length > 1
      ? api.get('/students', { params: { search: studentSearch, limit: 8 } }).then(r => r.data.data || [])
      : Promise.resolve([]),
    enabled: studentSearch.length > 1,
  });

  /* create */
  const create = useMutation({
    mutationFn: () => api.post('/fees/emi-plans', {
      ...form,
      totalAmount: Math.round(parseFloat(form.totalAmount) * 100), // store in paisa
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emi-plans'] });
      setShowForm(false);
      setForm(emptyForm);
      setStudentSearch('');
      toast.success('EMI plan created');
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to create plan'),
  });

  /* delete */
  const del = useMutation({
    mutationFn: id => api.delete('/fees/emi-plans/' + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emi-plans'] }); toast.success('Plan deleted'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const perInstalment = form.totalAmount && form.installments
    ? Math.round(parseFloat(form.totalAmount) / form.installments)
    : 0;

  const filteredPlans = filterSearch
    ? plans.filter(p =>
        p.title?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.student?.name?.toLowerCase().includes(filterSearch.toLowerCase())
      )
    : plans;

  const totalPlans    = plans.length;
  const activePlans   = plans.filter(p => (p.paidInstalments || []).length < (p.installments || 1)).length;
  const completedPlans = plans.filter(p => (p.paidInstalments || []).length >= (p.installments || 1)).length;

  return (
    <div className="page-content fade-in">
      {/* Pay instalment modal */}
      {payTarget && (
        <PayInstModal
          plan={payTarget.plan}
          instalment={payTarget.instalment}
          onClose={() => setPayTarget(null)}
          onPaid={() => qc.invalidateQueries({ queryKey: ['emi-plans'] })}
        />
      )}

      {/* Page header */}
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={20} color="#0073b7"/> EMI / Instalment Plans
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Create monthly instalment plans and track payment per instalment
          </p>
        </div>
        <button className="btn btn-teal btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14}/> New EMI Plan
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Plans',     value: totalPlans,    color: '#0073b7' },
          { label: 'Active',          value: activePlans,   color: '#D97706' },
          { label: 'Completed',       value: completedPlans, color: '#059669' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>New EMI Plan</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
              <X size={14}/> Cancel
            </button>
          </div>

          {/* Student selector */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Student *</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}/>
              <input className="form-input" style={{ paddingLeft: 32, fontSize: 13 }}
                placeholder="Search student by name..."
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setForm(f => ({ ...f, studentId: '' })); }}
              />
            </div>
            {form.studentId && (
              <div style={{ marginTop: 5, fontSize: 12.5, color: '#0F766E', fontWeight: 600 }}>
                Selected: {studentResults.find(s => s.id === form.studentId)?.name || 'Student #' + form.studentId}
              </div>
            )}
            {studentSearch.length > 1 && !form.studentId && studentResults.length > 0 && (
              <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.07)' }}>
                {studentResults.map(s => (
                  <div key={s.id}
                    onClick={() => { setForm(f => ({ ...f, studentId: s.id })); setStudentSearch(s.name); }}
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Plan Title *</label>
              <input className="form-input" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Annual Fee EMI"/>
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount (Rs.) *</label>
              <input className="form-input" type="number" value={form.totalAmount}
                onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                placeholder="e.g. 12000"/>
            </div>
            <div className="form-group">
              <label className="form-label">No. of Instalments</label>
              <select className="form-select" value={form.installments}
                onChange={e => setForm({ ...form, installments: +e.target.value })}>
                {[2, 3, 4, 6, 12].map(n => (
                  <option key={n} value={n}>{n} months</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Month</label>
              <select className="form-select" value={form.startMonth}
                onChange={e => setForm({ ...form, startMonth: +e.target.value })}>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Year</label>
              <select className="form-select" value={form.startYear}
                onChange={e => setForm({ ...form, startYear: +e.target.value })}>
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes..."/>
          </div>

          {perInstalment > 0 && (
            <div className="alert alert-info" style={{ marginBottom: 14 }}>
              <Calendar size={14}/>
              <span>
                Each instalment: <strong>Rs. {perInstalment.toLocaleString('en-PK')}</strong>
                {' '}over <strong>{form.installments} months</strong>
                {' '}starting <strong>{MONTHS[form.startMonth - 1]} {form.startYear}</strong>
              </span>
            </div>
          )}

          <button className="btn btn-primary"
            onClick={() => create.mutate()}
            disabled={!form.studentId || !form.title || !form.totalAmount || create.isPending}>
            {create.isPending ? 'Creating...' : 'Create EMI Plan'}
          </button>
        </div>
      )}

      {/* Filter bar */}
      {plans.length > 0 && (
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}/>
          <input className="form-input" style={{ paddingLeft: 32, fontSize: 13, maxWidth: 360 }}
            placeholder="Filter plans by name or student..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
          />
        </div>
      )}

      {/* Plans list */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner"/></div>
      ) : filteredPlans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CreditCard size={40}/></div>
            <div className="empty-state-text">{plans.length === 0 ? 'No EMI plans yet' : 'No plans match your filter'}</div>
            <div className="empty-state-sub">
              {plans.length === 0
                ? 'Create instalment plans to help families pay fees in easy monthly chunks'
                : 'Try a different search term'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredPlans.map(p => (
            <PlanCard
              key={p.id}
              plan={p}
              onDelete={id => del.mutate(id)}
              onPayInstalment={(plan, inst) => setPayTarget({ plan, instalment: inst })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
