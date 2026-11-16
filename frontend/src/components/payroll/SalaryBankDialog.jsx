/**
 * Pay the month's salaries through the bank.
 *
 * Staff with a bank account (Staff › Edit › Salary bank account) are listed
 * with their net salary. Choose the school's account they are paid from,
 * print the letter for the bank (or download the sheet for internet
 * banking's bulk upload), and once the bank has paid, mark those salaries
 * paid: each is recorded under Expenses on that day, as Pay does. Staff
 * without an account are listed apart, to be paid in cash.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Printer, Download, CheckCircle, Landmark } from 'lucide-react';
import api from '../../api/client';
import { printSalaryBankLetter, salaryBankCsv, downloadText } from '../../utils/salaryBankPrint';

const NAVY = '#1B2F6E';
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const rs = (paisa) => Math.round(Number(paisa || 0) / 100).toLocaleString('en-PK');
const pkToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const dmy = (ymd) => (ymd ? String(ymd).split('-').reverse().join('/') : '');
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };
const input = { border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 9px', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111827', minWidth: 0 };
const th = { textAlign: 'left', padding: '6px 8px', fontSize: 11, textTransform: 'uppercase', color: '#475569', background: '#F1F5F9', whiteSpace: 'nowrap' };
const td = { padding: '6px 8px', borderTop: '1px solid #F1F5F9', fontSize: 12.5, verticalAlign: 'top' };

export default function SalaryBankDialog({ month, year, onClose, onPaid }) {
  const period = `${FULL[month - 1]} ${year}`;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payroll-bank-list', month, year],
    queryFn: () => api.get('/payroll/bank-list', { params: { month, year } }).then((r) => r.data.data),
  });
  const accounts = useMemo(() => {
    if (!data) return [];
    const list = [];
    if (data.schoolBank) list.push({ key: 'school', label: `School account — ${data.schoolBank.bankName} ${data.schoolBank.accountNumber}`, bank: data.schoolBank });
    for (const c of data.campuses || []) {
      if (c.bank && !list.some((a) => a.bank.accountNumber === c.bank.accountNumber)) list.push({ key: `c${c.id}`, label: `${c.name} — ${c.bank.bankName} ${c.bank.accountNumber}`, bank: c.bank });
    }
    return list;
  }, [data]);
  const [acc, setAcc] = useState('');
  useEffect(() => { if (!acc && accounts.length) setAcc(accounts[0].key); }, [accounts, acc]);
  const bank = accounts.find((a) => a.key === acc)?.bank || null;

  const rows = data?.rows || [];
  const withBank = rows.filter((r) => r.bankAccountNo);
  const cash = rows.filter((r) => !r.bankAccountNo);
  const [pick, setPick] = useState(null);
  useEffect(() => { if (data && pick === null) setPick(new Set(withBank.filter((r) => r.status === 'pending').map((r) => r.recordId))); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = withBank.filter((r) => pick?.has(r.recordId));
  const chosenPending = chosen.filter((r) => r.status === 'pending');
  const total = chosen.reduce((t, r) => t + r.netSalary, 0);
  const [date, setDate] = useState(pkToday());
  const [chequeNo, setChequeNo] = useState('');
  const [confirm, setConfirm] = useState(false);

  const pay = useMutation({
    mutationFn: () => api.post('/payroll/pay-all', { month, year, paidOn: date, ids: chosenPending.map((r) => r.recordId) }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setConfirm(false); setPick(null); refetch(); onPaid?.(); },
    onError: (e) => toast.error(e.response?.data?.message || 'The salaries could not be marked as paid.'),
  });

  const toggle = (id) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const fileName = `salaries-${year}-${String(month).padStart(2, '0')}.csv`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 12px', overflowY: 'auto' }} onClick={onClose}>
      <div role="dialog" aria-label="Pay salaries through the bank" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(980px, 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}><Landmark size={18} /> Pay through the bank — {period}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Print the letter for the bank (or download the sheet for internet banking), then mark the salaries paid once the bank has sent them.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 18 }}>
          {isLoading && <div style={{ color: '#64748B' }}>Loading…</div>}
          {data && !rows.length && <div style={{ color: '#64748B' }}>No salaries for {period} yet. Generate the payroll first.</div>}
          {data && rows.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 12 }}>
                <label style={{ ...lbl, gridColumn: 'span 2' }}>Paid from
                  {accounts.length
                    ? <select value={acc} onChange={(e) => setAcc(e.target.value)} style={input} aria-label="Paid from account">{accounts.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select>
                    : <div style={{ fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 7, padding: '7px 9px' }}>No school bank account yet: add it in Settings › Payment Settings.</div>}
                </label>
                <label style={lbl}>Date
                  <input type="date" value={date} max={pkToday()} onChange={(e) => setDate(e.target.value || pkToday())} style={input} aria-label="Letter date" />
                </label>
                <label style={lbl}>Cheque no. (optional)
                  <input value={chequeNo} maxLength={30} onChange={(e) => setChequeNo(e.target.value)} style={input} aria-label="Cheque number" />
                </label>
              </div>

              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', margin: '4px 0 6px' }}>Paid into their accounts ({withBank.length})</div>
              <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Staff paid through the bank">
                  <thead><tr><th style={th} /><th style={th}>Name</th><th style={th}>Bank</th><th style={th}>Account title</th><th style={th}>Account no. / IBAN</th><th style={{ ...th, textAlign: 'right' }}>Net salary</th><th style={th}>Status</th></tr></thead>
                  <tbody>
                    {withBank.map((r) => (
                      <tr key={r.recordId} style={{ opacity: pick?.has(r.recordId) ? 1 : 0.6 }}>
                        <td style={td}><input type="checkbox" checked={!!pick?.has(r.recordId)} onChange={() => toggle(r.recordId)} aria-label={`Include ${r.name}`} /></td>
                        <td style={td}><b>{r.name}</b><div style={{ fontSize: 11, color: '#64748B' }}>{[r.empCode, r.designation].filter(Boolean).join(' · ')}</div></td>
                        <td style={td}>{r.bankName}</td>
                        <td style={td}>{r.bankAccountTitle || r.name}</td>
                        <td style={{ ...td, fontFamily: 'monospace' }}>{r.bankAccountNo}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{rs(r.netSalary)}</td>
                        <td style={td}>{r.status === 'issued' ? <span style={{ color: '#15803D', fontWeight: 700 }}>Paid {dmy(r.paidOn)}</span> : <span style={{ color: '#B45309', fontWeight: 700 }}>Pending</span>}</td>
                      </tr>
                    ))}
                    {!withBank.length && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#64748B', padding: 18 }}>No staff member has a bank account yet. Add it on each one's form (Staff › Edit › Salary bank account).</td></tr>}
                  </tbody>
                  {withBank.length > 0 && <tfoot><tr><td style={td} /><td style={{ ...td, fontWeight: 800 }} colSpan={4}>Ticked: {chosen.length}</td><td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>{rs(total)}</td><td style={td} /></tr></tfoot>}
                </table>
              </div>

              {cash.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }} aria-label="Paid in cash">
                  <b>No bank account — pay in cash ({cash.length}):</b> {cash.map((r) => `${r.name} Rs ${rs(r.netSalary)}${r.status === 'issued' ? ' (paid)' : ''}`).join(' · ')}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
                <button type="button" className="btn btn-primary" disabled={!chosen.length || !bank} onClick={() => printSalaryBankLetter({ school: data.school, bank, period, rows: chosen, date, chequeNo })}>
                  <Printer size={14} /> Print letter for the bank
                </button>
                <button type="button" className="btn btn-outline" disabled={!chosen.length} onClick={() => downloadText(fileName, salaryBankCsv({ rows: chosen, period }))}>
                  <Download size={14} /> Download sheet (CSV)
                </button>
                <span style={{ flex: 1 }} />
                {!confirm ? (
                  <button type="button" className="btn btn-success" disabled={!chosenPending.length} onClick={() => setConfirm(true)}>
                    <CheckCircle size={14} /> Mark {chosenPending.length} as paid
                  </button>
                ) : (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}>
                    Paid on {dmy(date)}, and added to Expenses?
                    <button type="button" className="btn btn-success btn-sm" disabled={pay.isPending} onClick={() => pay.mutate()}>{pay.isPending ? 'Saving…' : 'Yes, mark paid'}</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirm(false)}>No</button>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
