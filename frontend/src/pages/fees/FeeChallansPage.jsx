/**
 * Bank Challans: fee challans parents deposit at the bank, so the money goes
 * straight into the school's (or the campus's) own account.
 *
 *   Print           a class's (or the whole school's) challans, each with the
 *                   student's unpaid months and the campus's bank account
 *   Record deposits type or scan a paid challan's number: the deposit pays its
 *                   months, oldest first
 *   Bank statement  open the statement the bank sends (Excel or CSV): each
 *                   credit with a challan number is checked and recorded at once
 *   All challans    what was printed, what is paid, reprint or cancel
 *
 * A school with no bank account in Payment Settings gets the same slips
 * without bank details, paid at the school office.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Landmark, Printer, Search, FileSpreadsheet, CheckCircle, ListChecks, Ban, AlertTriangle, Upload } from 'lucide-react';
import api from '../../api/client';
import useFeeOptions from '../../components/fees/useFeeOptions';
import { useChallanSetup } from '../../components/fees/CollectMonths';
import { printChallans } from '../../utils/feeChallanPrint';
import { defaultDueDate, CHALLAN_STATUS, readTableFile, guessColumns, statementRows } from '../../utils/feeChallan';

const NAVY = '#1B2F6E';
const rs = (paisa) => Math.round(Number(paisa || 0) / 100).toLocaleString('en-PK');
const todayPK = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const dmy = (ymd) => (ymd ? String(ymd).slice(0, 10).split('-').reverse().join('/') : '');
const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 14 };
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };
const input = { border: '1px solid #CBD5E1', borderRadius: 7, padding: '7px 9px', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111827', minWidth: 0 };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, color: '#475569', background: '#F1F5F9', whiteSpace: 'nowrap' };
const td = { padding: '7px 8px', borderTop: '1px solid #F1F5F9', fontSize: 13, verticalAlign: 'top' };
const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const TABS = [
  { id: 'print', label: 'Print challans', icon: Printer },
  { id: 'deposit', label: 'Record deposits', icon: CheckCircle },
  { id: 'statement', label: 'Bank statement', icon: FileSpreadsheet },
  { id: 'list', label: 'All challans', icon: ListChecks },
];

function Status({ status }) {
  const s = CHALLAN_STATUS[status] || CHALLAN_STATUS.open;
  return <span style={{ display: 'inline-block', background: s.bg, color: s.fg, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

export default function FeeChallansPage() {
  const [tab, setTab] = useState('print');
  const setup = useChallanSetup();
  return (
    <div style={{ padding: '4px 0 24px' }}>
      <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EEF2FF', color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Landmark size={22} /></div>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: NAVY }}>Bank Challans</h1>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>Parents deposit the challan at the bank; the money goes straight into the school's account. Record the deposit with the challan number, or open the bank statement.</div>
        </div>
        <Accounts setup={setup} />
      </div>
      <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} type="button"
            className={tab === t.id ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'} style={tab === t.id ? { background: NAVY, borderColor: NAVY } : undefined}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'print' && <PrintTab setup={setup} />}
      {tab === 'deposit' && <DepositTab />}
      {tab === 'statement' && <StatementTab />}
      {tab === 'list' && <ListTab />}
    </div>
  );
}

/** Which account each campus's challans name. */
function Accounts({ setup }) {
  if (!setup) return null;
  const list = setup.campuses?.length ? setup.campuses : [{ id: 0, name: 'School', bank: setup.schoolBank }];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Bank accounts">
      {list.map((c) => (
        <div key={c.id} style={{ border: `1px solid ${c.bank ? '#C7D2FE' : '#FDE68A'}`, background: c.bank ? '#F5F7FF' : '#FFFBEB', borderRadius: 8, padding: '6px 10px', fontSize: 12, maxWidth: 280 }}>
          <div style={{ fontWeight: 700, color: '#0F172A' }}>{list.length > 1 ? c.name : 'Deposited in'}</div>
          {c.bank
            ? <div style={{ color: '#334155' }}>{c.bank.bankName} · <span style={{ fontFamily: 'monospace' }}>{c.bank.accountNumber}</span></div>
            : <div style={{ color: '#92400E' }}>No bank account: slips are paid at the school office. Add one in Settings › Payment Settings.</div>}
        </div>
      ))}
    </div>
  );
}

/* ── Print ──────────────────────────────────────────────────────────────── */
function PrintTab({ setup }) {
  const { classes, school } = useFeeOptions();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [last, setLast] = useState(null);
  useEffect(() => { if (setup && !dueDate) setDueDate(defaultDueDate(setup.today || todayPK(), setup.settings?.dueDay)); }, [setup, dueDate]);
  const sections = classes.find((c) => String(c.id) === String(classId))?.sections || [];
  const qc = useQueryClient();

  const issue = useMutation({
    mutationFn: () => api.post('/fees/challans/issue', { classId: classId === 'all' ? 'all' : Number(classId), sectionId: sectionId ? Number(sectionId) : undefined, dueDate }).then((r) => r.data),
    onSuccess: (r) => {
      setLast(r);
      qc.invalidateQueries({ queryKey: ['fee-challans'] });
      if (r.data.challans.length) printChallans({ challans: r.data.challans, school: r.data.print.school || school, settings: r.data.print.settings });
      toast.success(r.message);
    },
    onError: (e) => toast.error(errText(e, 'The challans could not be made.')),
  });

  const late = setup?.settings?.lateFee || 0;
  return (
    <div style={card}>
      <div style={{ fontWeight: 800, color: NAVY, marginBottom: 4 }}>Print challans for a class</div>
      <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12 }}>
        Each student gets one challan, on its own page, with every month still unpaid and the account of the student's campus. Students who owe nothing are left out.
        Printing again with nothing changed gives the same challan numbers.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
        <label style={lbl}>Class
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }} style={input} aria-label="Class">
            <option value="">Choose a class</option>
            <option value="all">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={lbl}>Section
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!sections.length} style={input} aria-label="Section">
            <option value="">All sections</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label style={lbl}>Due date
          <input type="date" value={dueDate} min={todayPK()} onChange={(e) => setDueDate(e.target.value)} style={input} aria-label="Due date" />
        </label>
        <button type="button" className="btn btn-teal" style={{ background: NAVY, borderColor: NAVY }} disabled={!classId || !dueDate || issue.isPending} onClick={() => issue.mutate()}>
          <Printer size={15} /> {issue.isPending ? 'Making challans…' : 'Make and print'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
        {late ? `After the due date the challan asks Rs ${rs(late)} more (late fee). ` : 'No late fee is set. '}
        Copies, due day and late fee are set in Settings › Payment Settings.
      </div>
      {last && (
        <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 8, background: '#F0FDF4', color: '#14532D', fontSize: 13 }} role="status">
          {last.message}
          {last.data.challans.length > 0 && (
            <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 10 }} onClick={() => printChallans({ challans: last.data.challans, school: last.data.print.school || school, settings: last.data.print.settings })}>
              <Printer size={13} /> Print again
            </button>
          )}
          {last.data.noDues?.length > 0 && <div style={{ fontSize: 12, marginTop: 4, color: '#166534' }}>Nothing to pay: {last.data.noDues.slice(0, 12).join(', ')}{last.data.noDues.length > 12 ? ` and ${last.data.noDues.length - 12} more` : ''}.</div>}
        </div>
      )}
    </div>
  );
}

/* ── Record deposits ────────────────────────────────────────────────────── */
function DepositTab() {
  const qc = useQueryClient();
  const [no, setNo] = useState('');
  const [found, setFound] = useState(null);
  const [form, setForm] = useState({ amount: '', date: todayPK(), bankRef: '' });
  const [done, setDone] = useState([]);
  const noRef = useRef(null);

  const find = useMutation({
    mutationFn: (n) => api.get(`/fees/challans/find/${encodeURIComponent(n)}`).then((r) => r.data.data),
    onSuccess: (d) => {
      setFound(d);
      const owes = d.now.due + (d.now.due > 0 ? d.now.late : 0);
      setForm((f) => ({ ...f, amount: owes ? String(Math.round(owes / 100)) : '' }));
    },
    onError: (e) => { setFound(null); toast.error(errText(e, 'Challan not found.')); },
  });
  const record = useMutation({
    mutationFn: () => api.post('/fees/challans/deposits', { deposits: [{ challanNo: found.challan.challanNo, amount: Math.round(Number(form.amount) * 100), date: form.date, bankRef: form.bankRef || undefined }] }).then((r) => r.data),
    onSuccess: (r) => {
      const res = r.data.results[0];
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(`Rs ${rs(res.amount)} recorded for ${res.student?.name || ''}.`);
      setDone((d) => [res, ...d]);
      setFound(null); setNo(''); setForm((f) => ({ ...f, amount: '', bankRef: '' }));
      qc.invalidateQueries({ queryKey: ['fee-challans'] });
      qc.invalidateQueries({ queryKey: ['student-fee'] });
      setTimeout(() => noRef.current?.focus(), 50);
    },
    onError: (e) => toast.error(errText(e, 'The deposit could not be recorded.')),
  });

  const c = found?.challan;
  const late = found && found.now.late && form.date > c.dueDate ? found.now.late : 0;
  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 4 }}>Record a deposit</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12 }}>Type or scan the number on the paid challan (the bank's stamped copy, or the parent's), check the amount, and record it. The months on it are marked paid, oldest first.</div>
        <form onSubmit={(e) => { e.preventDefault(); if (no.trim()) find.mutate(no.trim()); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input ref={noRef} autoFocus value={no} onChange={(e) => setNo(e.target.value)} placeholder="Challan number, e.g. 261100012301" aria-label="Challan number"
            style={{ ...input, flex: '1 1 260px', fontFamily: 'monospace', fontSize: 15, letterSpacing: 1 }} />
          <button type="submit" className="btn btn-outline" disabled={!no.trim() || find.isPending}><Search size={14} /> {find.isPending ? 'Finding…' : 'Find'}</button>
        </form>

        {c && (
          <div style={{ marginTop: 14, border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }} aria-label="Challan found">
            <div style={{ padding: '10px 12px', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0F172A' }}>{c.student?.name} <span style={{ fontWeight: 500, color: '#64748B' }}>· Roll {c.student?.rollNo || '—'} · {[c.student?.className, c.student?.sectionName].filter(Boolean).join(' – ')}</span></div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Challan <b style={{ fontFamily: 'monospace' }}>{c.challanNo}</b> · issued {dmy(c.issuedOn)} · due {dmy(c.dueDate)}{c.campusName ? ` · ${c.campusName}` : ''}</div>
              </div>
              <Status status={c.status} />
            </div>
            {c.status === 'paid' && <div style={{ padding: '8px 12px', background: '#FEF2F2', color: '#991B1B', fontSize: 12.5 }}>Already recorded as paid on {dmy(c.paidOn)} (receipt {c.receiptNo}).</div>}
            {c.status === 'replaced' && <div style={{ padding: '8px 12px', background: '#FFFBEB', color: '#92400E', fontSize: 12.5 }}>A newer challan was printed for this student. A deposit on this one still pays the months that are owing.</div>}
            {c.status === 'cancelled' && <div style={{ padding: '8px 12px', background: '#FEF2F2', color: '#991B1B', fontSize: 12.5 }}>This challan was cancelled.</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Month</th><th style={th}>Fee</th><th style={{ ...th, textAlign: 'right' }}>On the challan</th><th style={{ ...th, textAlign: 'right' }}>Owing now</th></tr></thead>
              <tbody>
                {c.items.map((i) => (
                  <tr key={i.invoiceId}><td style={td}><b>{i.period}</b></td><td style={td}>{i.feeTitle}</td><td style={{ ...td, textAlign: 'right' }}>{rs(i.due)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: found.now.items.find((x) => x.invoiceId === i.invoiceId)?.dueNow ? '#991B1B' : '#15803D' }}>{rs(found.now.items.find((x) => x.invoiceId === i.invoiceId)?.dueNow)}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '8px 12px', fontSize: 12.5, color: '#334155', borderTop: '1px solid #F1F5F9' }}>
              Challan amount Rs {rs(c.amount)}{c.lateFee ? ` (Rs ${rs(c.amount + c.lateFee)} after ${dmy(c.dueDate)})` : ''} · owing now on these months <b>Rs {rs(found.now.due)}</b>
              {found.now.otherDue ? <> · other months owing Rs {rs(found.now.otherDue)}</> : null}
            </div>
            {c.status !== 'paid' && c.status !== 'cancelled' && (
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, alignItems: 'end', borderTop: '1px solid #F1F5F9' }}>
                <label style={lbl}>Amount deposited (Rs)
                  <input type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} style={{ ...input, fontWeight: 800 }} aria-label="Amount deposited" />
                </label>
                <label style={lbl}>Deposited on
                  <input type="date" value={form.date} max={todayPK()} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value || todayPK() }))} style={input} aria-label="Deposited on" />
                </label>
                <label style={lbl}>Bank reference (optional)
                  <input value={form.bankRef} maxLength={60} placeholder="Transaction / slip no." onChange={(e) => setForm((f) => ({ ...f, bankRef: e.target.value }))} style={input} aria-label="Bank reference" />
                </label>
                <button type="button" className="btn btn-success" disabled={!(Number(form.amount) > 0) || record.isPending} onClick={() => record.mutate()}>
                  <CheckCircle size={15} /> {record.isPending ? 'Recording…' : 'Record deposit'}
                </button>
                {late > 0 && <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#92400E' }}>Deposited after the due date: the late fee of Rs {rs(late)} is charged from what was deposited above the months' amount.</div>}
              </div>
            )}
          </div>
        )}
      </div>
      {done.length > 0 && (
        <div style={card} aria-label="Recorded now">
          <div style={{ fontWeight: 800, color: NAVY, marginBottom: 8 }}>Recorded now ({done.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Challan</th><th style={th}>Student</th><th style={th}>Months paid</th><th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}>Deposited</th><th style={th}>Receipt</th></tr></thead>
              <tbody>
                {done.map((d) => (
                  <tr key={d.receiptNo}><td style={{ ...td, fontFamily: 'monospace' }}>{d.challanNo}</td><td style={td}>{d.student?.name}</td>
                    <td style={td}>{d.lines.map((l) => `${l.period}${l.balance ? ` (Rs ${rs(l.balance)} left)` : ''}`).join(', ')}{d.lateCharged ? ` · late fee Rs ${rs(d.lateCharged)}` : ''}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{rs(d.amount)}</td><td style={td}>{dmy(d.depositDate)}</td><td style={{ ...td, fontSize: 11.5 }}>{d.receiptNo}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Bank statement ─────────────────────────────────────────────────────── */
const VERDICT = {
  ok: { label: 'Matches', bg: '#DCFCE7', fg: '#166534' },
  differs: { label: 'Amount differs', bg: '#FFEDD5', fg: '#9A3412' },
  not_found: { label: 'No challan', bg: '#F1F5F9', fg: '#475569' },
  already_paid: { label: 'Already recorded', bg: '#E0E7FF', fg: '#3730A3' },
  duplicate: { label: 'Twice in file', bg: '#FEE2E2', fg: '#991B1B' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#991B1B' },
  no_amount: { label: 'No amount', bg: '#F1F5F9', fg: '#475569' },
};

function StatementTab() {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [table, setTable] = useState(null);
  const [cols, setCols] = useState(null);
  const [checked, setChecked] = useState(null);
  const [pick, setPick] = useState(new Set());
  const [result, setResult] = useState(null);
  const [reading, setReading] = useState(false);

  const header = table && cols && cols.headerRow >= 0 ? table[cols.headerRow] : (table?.[0] || []);
  const width = table ? Math.max(0, ...table.slice(0, 50).map((r) => r.length)) : 0;
  const colName = (i) => String(header[i] ?? '').trim() || `Column ${i + 1}`;
  const lines = useMemo(() => (table && cols ? statementRows(table, cols) : []), [table, cols]);
  const withNo = lines.filter((l) => l.challanNo);

  const open = async (f) => {
    if (!f) return;
    setReading(true); setFile(f); setChecked(null); setResult(null);
    try {
      const t = await readTableFile(f);
      if (!t.length) throw new Error('The file has no rows.');
      setTable(t);
      setCols(guessColumns(t));
    } catch (e) {
      setTable(null); setCols(null);
      toast.error(e.message || 'The file could not be read. Save it as Excel (.xlsx) or CSV and try again.');
    } finally { setReading(false); }
  };

  const match = useMutation({
    mutationFn: () => api.post('/fees/challans/match', { rows: withNo.map((l) => ({ challanNo: l.challanNo, amount: l.amount, date: l.date })) }).then((r) => r.data.data),
    onSuccess: (d) => {
      const rows = d.rows.map((r, i) => ({ ...r, line: withNo[i].line, text: withNo[i].text }));
      setChecked({ ...d, rows });
      setPick(new Set(rows.map((r, i) => (r.verdict === 'ok' ? i : -1)).filter((i) => i >= 0)));
      setResult(null);
    },
    onError: (e) => toast.error(errText(e, 'The statement could not be checked.')),
  });
  const record = useMutation({
    mutationFn: () => api.post('/fees/challans/deposits', {
      deposits: [...pick].map((i) => checked.rows[i]).map((r) => ({ challanNo: r.challanNo, amount: r.amount, date: r.date || undefined, bankRef: `Statement line ${r.line}` })),
    }).then((r) => r.data),
    onSuccess: (r) => {
      setResult(r.data);
      toast.success(r.message);
      setPick(new Set());
      qc.invalidateQueries({ queryKey: ['fee-challans'] });
      qc.invalidateQueries({ queryKey: ['student-fee'] });
      match.mutate();
    },
    onError: (e) => toast.error(errText(e, 'The deposits could not be recorded.')),
  });

  const pickable = (r) => r.verdict === 'ok' || r.verdict === 'differs';
  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 4 }}>Open the bank statement</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12 }}>
          Download the account statement from the bank (internet banking) as Excel or CSV and open it here. Each credit whose description holds a challan number is checked against the challan; tick the ones to record.
        </div>
        <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
          <Upload size={14} /> {reading ? 'Reading…' : file ? 'Open another file' : 'Choose the statement file'}
          <input type="file" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" style={{ display: 'none' }} aria-label="Bank statement file"
            onChange={(e) => { open(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {file && <span style={{ marginLeft: 10, fontSize: 12.5, color: '#334155' }}>{file.name}</span>}

        {table && cols && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 14 }}>
              <label style={lbl}>Date column
                <select value={cols.date} onChange={(e) => setCols((c) => ({ ...c, date: Number(e.target.value) }))} style={input} aria-label="Date column">
                  <option value={-1}>No date</option>
                  {Array.from({ length: width }, (_, i) => <option key={i} value={i}>{colName(i)}</option>)}
                </select>
              </label>
              <label style={lbl}>Money received (credit) column
                <select value={cols.amount} onChange={(e) => setCols((c) => ({ ...c, amount: Number(e.target.value) }))} style={input} aria-label="Credit column">
                  <option value={-1}>Choose…</option>
                  {Array.from({ length: width }, (_, i) => <option key={i} value={i}>{colName(i)}</option>)}
                </select>
              </label>
              <label style={lbl}>Challan number is in
                <select value={cols.reference} onChange={(e) => setCols((c) => ({ ...c, reference: Number(e.target.value) }))} style={input} aria-label="Challan number column">
                  <option value={-1}>Any column (description, reference…)</option>
                  {Array.from({ length: width }, (_, i) => <option key={i} value={i}>{colName(i)}</option>)}
                </select>
              </label>
            </div>
            <div style={{ fontSize: 12.5, color: '#334155', marginTop: 10 }} role="status">
              {cols.amount < 0 ? 'Choose the column with the money received.' : `${lines.length} credit${lines.length === 1 ? '' : 's'} in the statement; ${withNo.length} with a challan number.`}
              {lines.length > withNo.length && cols.amount >= 0 ? ` ${lines.length - withNo.length} without one (other money, or a parent who did not write the number) are left out.` : ''}
            </div>
            <button type="button" className="btn btn-teal" style={{ marginTop: 10, background: NAVY, borderColor: NAVY }} disabled={!withNo.length || match.isPending} onClick={() => match.mutate()}>
              <Search size={14} /> {match.isPending ? 'Checking…' : `Check ${withNo.length} against the challans`}
            </button>
          </>
        )}
      </div>

      {checked && (
        <div style={card} aria-label="Statement checked">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: '#334155' }}>
              <b style={{ color: '#166534' }}>{checked.summary.ok} match</b> · <b style={{ color: '#9A3412' }}>{checked.summary.differs} amount differs</b> · {checked.summary.alreadyPaid} already recorded · {checked.summary.notFound} no challan{checked.summary.other ? ` · ${checked.summary.other} other` : ''}
            </div>
            <button type="button" className="btn btn-success" disabled={!pick.size || record.isPending} onClick={() => record.mutate()}>
              <CheckCircle size={15} /> {record.isPending ? 'Recording…' : `Record ${pick.size} deposit${pick.size === 1 ? '' : 's'} (Rs ${rs([...pick].reduce((t, i) => t + (checked.rows[i]?.amount || 0), 0))})`}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th} /><th style={th}>Line</th><th style={th}>Challan</th><th style={th}>Student</th><th style={th}>Date</th><th style={{ ...th, textAlign: 'right' }}>Deposited</th><th style={{ ...th, textAlign: 'right' }}>Challan asks</th><th style={th}>Check</th></tr></thead>
              <tbody>
                {checked.rows.map((r, i) => {
                  const v = VERDICT[r.verdict] || VERDICT.not_found;
                  return (
                    <tr key={`${r.line}-${i}`} style={{ opacity: pickable(r) ? 1 : 0.7 }}>
                      <td style={td}><input type="checkbox" disabled={!pickable(r)} checked={pick.has(i)} aria-label={`Record line ${r.line}`}
                        onChange={() => setPick((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} /></td>
                      <td style={td}>{r.line}</td>
                      <td style={{ ...td, fontFamily: 'monospace' }}>{r.challanNo}</td>
                      <td style={td}>{r.student ? <>{r.student.name}<div style={{ fontSize: 11, color: '#64748B' }}>{[r.student.className, r.student.sectionName].filter(Boolean).join(' – ')}</div></> : <span style={{ fontSize: 11.5, color: '#64748B' }}>{r.text}</span>}</td>
                      <td style={td}>{dmy(r.date)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{rs(r.amount)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{r.expected != null ? rs(r.expected) : ''}</td>
                      <td style={td}><span style={{ background: v.bg, color: v.fg, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{v.label}</span><div style={{ fontSize: 11, color: '#64748B' }}>{r.message}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result && result.failed > 0 && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: '#991B1B' }}>
              <AlertTriangle size={13} /> Not recorded: {result.results.filter((r) => !r.ok).map((r) => `${r.challanNo}: ${r.message}`).join(' · ')}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── All challans ───────────────────────────────────────────────────────── */
function ListTab() {
  const qc = useQueryClient();
  const { classes } = useFeeOptions();
  const [status, setStatus] = useState('open');
  const [classId, setClassId] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  const { data, isFetching } = useQuery({
    queryKey: ['fee-challans', status, classId, q, limit],
    queryFn: () => api.get('/fees/challans', { params: { status, classId: classId || undefined, q: q.trim() || undefined, limit } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
  const rows = data?.data || [];
  const cancel = useMutation({
    mutationFn: (id) => api.post(`/fees/challans/${id}/cancel`).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ['fee-challans'] }); },
    onError: (e) => toast.error(errText(e, 'The challan could not be cancelled.')),
  });
  const [confirm, setConfirm] = useState(null);
  const reprint = (list) => printChallans({ challans: list, school: data?.print?.school, settings: data?.print?.settings });

  return (
    <div style={card}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 12 }}>
        <label style={lbl}>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={input} aria-label="Status">
            <option value="open">Not paid yet</option>
            <option value="paid">Paid</option>
            <option value="part_paid">Part paid</option>
            <option value="replaced">Replaced</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
        </label>
        <label style={lbl}>Class
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={input} aria-label="Class filter">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={{ ...lbl, gridColumn: 'span 2' }}>Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Challan number, student or father's name" style={input} aria-label="Search challans" />
        </label>
        <button type="button" className="btn btn-outline" disabled={!rows.length} onClick={() => reprint(rows.filter((r) => r.status === 'open' || r.status === 'part_paid'))} title="Print the challans shown that are not paid yet">
          <Printer size={14} /> Print these
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{isFetching ? 'Loading…' : `${data?.total ?? 0} challan${data?.total === 1 ? '' : 's'}${data && data.total > rows.length ? `, showing ${rows.length}` : ''}.`}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Challans">
          <thead><tr><th style={th}>Challan</th><th style={th}>Student</th><th style={th}>Months</th><th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}>Due</th><th style={th}>Status</th><th style={th}>Paid</th><th style={th} /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, fontFamily: 'monospace' }}>{r.challanNo}<div style={{ fontFamily: 'inherit', fontSize: 11, color: '#64748B' }}>issued {dmy(r.issuedOn)}</div></td>
                <td style={td}><b>{r.student?.name}</b><div style={{ fontSize: 11, color: '#64748B' }}>Roll {r.student?.rollNo || '—'} · {[r.student?.className, r.student?.sectionName].filter(Boolean).join(' – ')}</div></td>
                <td style={{ ...td, fontSize: 12 }}>{r.items.length > 3 ? `${r.items[0].period} – ${r.items[r.items.length - 1].period} (${r.items.length})` : r.items.map((i) => i.period).join(', ')}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{rs(r.amount)}</td>
                <td style={td}>{dmy(r.dueDate)}</td>
                <td style={td}><Status status={r.status} /></td>
                <td style={{ ...td, fontSize: 12 }}>{r.paidAmount ? <>Rs {rs(r.paidAmount)}<div style={{ color: '#64748B' }}>{dmy(r.paidOn)}{r.bankRef ? ` · ${r.bankRef}` : ''}</div></> : ''}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => reprint([r])} title="Print this challan"><Printer size={12} /></button>
                  {(r.status === 'open' || r.status === 'replaced') && (
                    confirm === r.id
                      ? <> <button type="button" className="btn btn-danger btn-sm" onClick={() => { cancel.mutate(r.id); setConfirm(null); }}>Yes, cancel</button> <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirm(null)}>No</button></>
                      : <> <button type="button" className="btn btn-outline btn-sm" style={{ color: '#B91C1C' }} onClick={() => setConfirm(r.id)} title="Cancel this challan"><Ban size={12} /></button></>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && !isFetching && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#64748B', padding: 24 }}>No challans here yet. Print them from "Print challans", or from a student on Collect Fee.</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.total > rows.length && <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => setLimit((l) => Math.min(l + 100, 500))} disabled={limit >= 500}>Show more</button>}
    </div>
  );
}
