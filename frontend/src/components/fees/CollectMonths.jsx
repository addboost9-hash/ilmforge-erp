/**
 * Collect fee for the months a parent is paying.
 *
 * Only the months still owing are listed, oldest first. Tick the months being
 * paid (or all of them) and type what was received: it pays the oldest ticked
 * month first, each in full before the next, so the last one reached may be
 * part paid and the rest keep their balance. The screen shows that before
 * anything is saved. One receipt lists every month.
 *
 * "Print challan / fee slip" prints the ticked months as a bank challan (or,
 * with no bank account in Payment Settings, a slip paid at the counter).
 *
 *   <CollectMonths student={...} invoices={...} school={...} focusInvoiceId={id} onDone={() => refetch()} />
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, Printer, Receipt, Landmark } from 'lucide-react';
import api from '../../api/client';
import { feePeriod } from '../../utils/feeMonth';
import { oldestFirst, planMonths, defaultDueDate } from '../../utils/feeChallan';
import { printChallans, printMonthsReceipt } from '../../utils/feeChallanPrint';

const NAVY = '#1B2F6E';
const rs = (paisa) => Math.round(Number(paisa || 0) / 100).toLocaleString('en-PK');
const todayPK = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const dmy = (ymd) => String(ymd || '').slice(0, 10).split('-').reverse().join('/');
const box = { border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff' };
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };
const input = { border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 9px', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111827', minWidth: 0 };

export function useChallanSetup() {
  const { data } = useQuery({
    queryKey: ['fee-challan-setup'],
    queryFn: () => api.get('/fees/challans/setup').then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });
  return data || null;
}

export default function CollectMonths({ student, invoices = [], school, focusInvoiceId, onDone }) {
  const setup = useChallanSetup();
  const owing = useMemo(() => invoices.filter((i) => (i.dueAmount || 0) > 0).sort(oldestFirst), [invoices]);
  const [picked, setPicked] = useState(() => new Set());
  const [amount, setAmount] = useState('');
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState({ paymentDate: todayPK(), method: 'cash', notifyVia: 'whatsapp_sms', remarks: '' });
  const [dueDate, setDueDate] = useState('');
  const [done, setDone] = useState(null);

  // A new student, or bills changed after a payment: every owing month ticked.
  const owingKey = owing.map((i) => `${i.id}:${i.dueAmount}`).join(',');
  useEffect(() => { setPicked(new Set(owing.map((i) => i.id))); setTouched(false); }, [student?.id, owingKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // "Collect" on one month of the calendar: just that month.
  useEffect(() => {
    if (!focusInvoiceId || !owing.some((i) => i.id === focusInvoiceId)) return;
    setPicked(new Set([focusInvoiceId])); setTouched(false); setDone(null);
  }, [focusInvoiceId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (setup && !dueDate) setDueDate(defaultDueDate(setup.today || todayPK(), setup.settings?.dueDay)); }, [setup, dueDate]);

  const chosen = owing.filter((i) => picked.has(i.id));
  const chosenTotal = chosen.reduce((t, i) => t + i.dueAmount, 0);
  useEffect(() => { if (!touched) setAmount(chosenTotal ? String(Math.round(chosenTotal / 100)) : ''); }, [chosenTotal, touched]);
  const amountPaisa = Math.round((Number(amount) || 0) * 100);
  const plan = planMonths(chosen, amountPaisa);
  const planOf = new Map(plan.lines.map((l) => [l.inv.id, l]));
  const tooMuch = amountPaisa > chosenTotal;
  const past = form.paymentDate && form.paymentDate < todayPK();

  const campusBank = setup ? (setup.campuses?.find((c) => c.id === student?.campusId)?.bank ?? setup.schoolBank) : null;

  const toggle = (id) => { setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); setDone(null); };
  const all = chosen.length === owing.length;

  const collect = useMutation({
    mutationFn: () => api.post('/fees/payments/months', {
      studentId: student.id, invoiceIds: chosen.map((i) => i.id), amountPaid: amountPaisa,
      method: form.method, notifyVia: past ? 'none' : form.notifyVia, paymentDate: form.paymentDate, remarks: form.remarks || undefined,
    }).then((r) => r.data),
    onSuccess: (r) => {
      toast.success(r.message || 'Fee received.');
      setDone({ ...r.data, method: form.method, note: form.remarks });
      setTouched(false);
      setForm((f) => ({ ...f, remarks: '' }));
      onDone?.(r.data);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'The fee could not be saved.'),
  });

  const issue = useMutation({
    mutationFn: () => api.post('/fees/challans/issue', { studentIds: [student.id], invoiceIds: chosen.map((i) => i.id), dueDate }).then((r) => r.data),
    onSuccess: (r) => {
      if (!r.data.challans.length) { toast(r.message); return; }
      printChallans({ challans: r.data.challans, school: r.data.print.school || school, settings: r.data.print.settings });
      toast.success(`Challan ${r.data.challans[0].challanNo} ready to print.`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'The challan could not be made.'),
  });

  const submit = () => {
    if (!chosen.length) return toast.error('Tick the months being paid.');
    if (!(amountPaisa > 0)) return toast.error('Enter the amount received.');
    if (tooMuch) return toast.error(`The ticked months owe Rs ${rs(chosenTotal)}. Tick more months or enter less.`);
    if (form.paymentDate > todayPK()) return toast.error('The payment date cannot be in the future.');
    collect.mutate();
  };

  if (!owing.length) {
    return (
      <div style={{ ...box, padding: '12px 14px', background: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534', fontWeight: 700, fontSize: 13 }}>
        Nothing is owed: every month is paid.
        {done && <ReceiptDone done={done} student={student} school={school} />}
      </div>
    );
  }

  const fullyPaid = plan.lines.filter((l) => l.state === 'paid');
  const part = plan.lines.find((l) => l.state === 'part');
  const untouched = plan.lines.filter((l) => l.state === 'none');

  return (
    <div style={{ ...box, overflow: 'hidden' }} aria-label="Collect fee for months">
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#F8FAFC' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}><Receipt size={15} /> Collect fee — choose the months</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Only unpaid months are shown. The amount pays the oldest ticked month first; what is not covered stays as balance.</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
          <input type="checkbox" checked={all} onChange={() => { setPicked(all ? new Set() : new Set(owing.map((i) => i.id))); setDone(null); }} aria-label="Tick every unpaid month" />
          All unpaid ({owing.length})
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} aria-label="Unpaid months">
          <thead>
            <tr style={{ background: '#F1F5F9', color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              <th style={{ width: 36, padding: '7px 10px' }} />
              <th style={{ textAlign: 'left', padding: '7px 6px' }}>Month</th>
              <th style={{ textAlign: 'left', padding: '7px 6px' }}>Fee</th>
              <th style={{ textAlign: 'right', padding: '7px 6px' }}>Owes (Rs)</th>
              <th style={{ textAlign: 'right', padding: '7px 6px' }}>Paid now</th>
              <th style={{ textAlign: 'left', padding: '7px 10px' }}>After this</th>
            </tr>
          </thead>
          <tbody>
            {owing.map((inv) => {
              const on = picked.has(inv.id);
              const l = planOf.get(inv.id);
              const state = !on ? 'off' : l?.state || 'none';
              return (
                <tr key={inv.id} data-month-row={inv.id} onClick={() => toggle(inv.id)}
                  style={{ borderTop: '1px solid #F1F5F9', cursor: 'pointer', background: on ? '#F8FBFF' : '#fff', opacity: on ? 1 : 0.65 }}>
                  <td style={{ padding: '7px 10px' }}><input type="checkbox" checked={on} onChange={() => toggle(inv.id)} onClick={(e) => e.stopPropagation()} aria-label={`Pay ${feePeriod(inv) || inv.feeTitle}`} /></td>
                  <td style={{ padding: '7px 6px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{feePeriod(inv) || '—'}</td>
                  <td style={{ padding: '7px 6px', color: '#475569' }}>{inv.feeTitle}{inv.status === 'partial' && <span style={{ marginLeft: 6, fontSize: 11, color: '#B45309', fontWeight: 700 }}>part paid before</span>}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{rs(inv.dueAmount)}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#15803D', fontWeight: 700 }}>{on && l?.pay ? rs(l.pay) : ''}</td>
                  <td style={{ padding: '7px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {state === 'paid' && <span style={{ color: '#15803D', fontWeight: 700 }}>✓ Paid</span>}
                    {state === 'part' && <span style={{ color: '#B45309', fontWeight: 700 }}>Part paid · Rs {rs(l.balance)} left</span>}
                    {state === 'none' && <span style={{ color: '#991B1B' }}>Not reached · stays unpaid</span>}
                    {state === 'off' && <span style={{ color: '#94A3B8' }}>Not paying now</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #E2E8F0', background: '#F8FAFC', fontWeight: 800 }}>
              <td />
              <td colSpan={2} style={{ padding: '8px 6px' }}>Ticked: {chosen.length} of {owing.length}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right' }}>{rs(chosenTotal)}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right', color: '#15803D' }}>{amountPaisa && !tooMuch ? rs(amountPaisa) : ''}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
        <label style={lbl}>Amount received (Rs)
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" min="1" step="1" value={amount} aria-label="Amount received"
              onChange={(e) => { setAmount(e.target.value); setTouched(true); setDone(null); }}
              style={{ ...input, flex: 1, fontWeight: 800, fontSize: 15, borderColor: tooMuch ? '#DC2626' : '#CBD5E1' }} />
            {touched && <button type="button" className="btn btn-outline btn-sm" onClick={() => setTouched(false)} title="The full amount of the ticked months">Full</button>}
          </div>
        </label>
        <label style={lbl}>Received on
          <input type="date" value={form.paymentDate} max={todayPK()} aria-label="Received on" style={input}
            onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value || todayPK() }))} />
        </label>
        <label style={lbl}>Paid by
          <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} style={input} aria-label="Paid by">
            <option value="cash">Cash</option>
            <option value="bank">Bank deposit</option>
            <option value="online">Online transfer</option>
            <option value="cheque">Cheque</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="card">Card</option>
          </select>
        </label>
        <label style={lbl}>Tell the parent
          <select value={past ? 'none' : form.notifyVia} disabled={past} onChange={(e) => setForm((f) => ({ ...f, notifyVia: e.target.value }))} style={input} aria-label="Tell the parent">
            <option value="whatsapp_sms">WhatsApp + SMS</option>
            <option value="sms">SMS only</option>
            <option value="none">Do not send</option>
          </select>
        </label>
        <label style={{ ...lbl, gridColumn: 'span 2' }}>Note (optional)
          <input value={form.remarks} maxLength={200} placeholder="e.g. paid by uncle" onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} style={input} aria-label="Note" />
        </label>
      </div>

      <div style={{ margin: '0 14px 12px', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.55, background: tooMuch ? '#FEF2F2' : '#EFF6FF', color: tooMuch ? '#991B1B' : '#1E3A8A' }} role="status">
        {!chosen.length ? 'Tick the months being paid.'
          : tooMuch ? `Rs ${rs(amountPaisa)} is more than the ticked months owe (Rs ${rs(chosenTotal)}). Tick more months, or enter less.`
            : !amountPaisa ? 'Enter the amount received.'
              : <>
                Rs {rs(amountPaisa)} pays {fullyPaid.length ? <b>{fullyPaid.map((l) => feePeriod(l.inv) || l.inv.feeTitle).join(', ')} in full</b> : null}
                {fullyPaid.length && part ? ' and ' : ''}
                {part ? <b>Rs {rs(part.pay)} of {feePeriod(part.inv) || part.inv.feeTitle}</b> : null}.
                {part || untouched.length ? <> Left as balance: <b>Rs {rs(plan.lines.reduce((t, l) => t + l.balance, 0))}</b>{untouched.length ? ` (${untouched.map((l) => feePeriod(l.inv) || l.inv.feeTitle).join(', ')} not reached)` : ''}.</> : ' Nothing is left on the ticked months.'}
                {past && <> Filed on {dmy(form.paymentDate)}; the parent is not sent a message for an earlier day.</>}
              </>}
      </div>

      <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn btn-success" onClick={submit} disabled={collect.isPending || !chosen.length || !amountPaisa || tooMuch}>
          <CheckCircle size={15} /> {collect.isPending ? 'Saving…' : `Collect Rs ${rs(amountPaisa)}`}
        </button>
        <span style={{ flex: 1 }} />
        <label style={{ ...lbl, flexDirection: 'row', alignItems: 'center', gap: 6 }}>Due date
          <input type="date" value={dueDate} min={todayPK()} onChange={(e) => setDueDate(e.target.value)} style={{ ...input, padding: '5px 7px' }} aria-label="Challan due date" />
        </label>
        <button type="button" className="btn btn-outline" onClick={() => (chosen.length ? issue.mutate() : toast.error('Tick the months to print.'))} disabled={issue.isPending || !dueDate}
          title={campusBank ? `Deposited in ${campusBank.bankName} ${campusBank.accountNumber}` : 'No bank account in Payment Settings: a slip to pay at the school office'}>
          {campusBank ? <Landmark size={14} /> : <Printer size={14} />} {issue.isPending ? 'Making…' : campusBank ? 'Print bank challan' : 'Print fee slip'}
        </button>
      </div>

      {done && <ReceiptDone done={done} student={student} school={school} />}
    </div>
  );
}

function ReceiptDone({ done, student, school }) {
  const paid = done.lines.filter((l) => l.paid > 0);
  return (
    <div style={{ margin: '0 14px 14px', border: '1px solid #86EFAC', background: '#F0FDF4', borderRadius: 8, padding: '10px 12px', color: '#14532D', fontSize: 13 }} role="status" aria-label="Fee received">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <b>Rs {rs(done.amountPaid)} received</b> · receipt {done.receiptNo}
          <div style={{ fontSize: 12 }}>{paid.map((l) => `${l.period || l.feeTitle}: Rs ${rs(l.paid)}${l.balance ? ` (Rs ${rs(l.balance)} left)` : ''}`).join(' · ')}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: done.balance ? '#991B1B' : '#166534' }}>{done.balance ? `Still owed (all months): Rs ${rs(done.balance)}` : 'Nothing more is owed.'}</div>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => printMonthsReceipt({
          school, student, receipt: { ...done, paymentDate: new Date(new Date(done.paymentDate).getTime() + 5 * 3600e3).toISOString().slice(0, 10) },
          cashier: localStorage.getItem('userName') || 'Cashier',
        })}><Printer size={13} /> Print receipt</button>
      </div>
    </div>
  );
}
