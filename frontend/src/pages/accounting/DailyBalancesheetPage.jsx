import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { openServerDocument, printHTML, printDocumentShell } from '../../utils/print';
import { feePeriod } from '../../utils/feeMonth';
import {
  BarChart2, Calendar, Users, DollarSign, ChevronRight, ChevronDown,
  Printer, CheckCircle, X, RefreshCw, Wallet, CreditCard,
  Smartphone, AlertCircle, TrendingUp, TrendingDown, Receipt, History, Archive,
} from 'lucide-react';

/* ── helpers ── */
const money    = v  => 'Rs. ' + ((v || 0) / 100).toLocaleString();
const pct      = (a, b) => b ? Math.round((a / b) * 100) : 0;
// Pakistan's today (UTC+5 all year): the PC's own clock zone put the picker
// on yesterday until 5 a.m.
const todayPKT = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const dmy      = ymd => String(ymd || '').split('-').reverse().join('/');
const pkTime   = d => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
const pkStamp  = d => new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
const esc      = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const METHOD_LABEL = {
  cash: 'Cash', card: 'Card', online: 'Online transfer', wallet: 'Parent wallet',
  bank_transfer: 'Bank transfer', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', cheque: 'Cheque',
};
const METHOD_COLOR = {
  cash: '#15803d', card: '#1d4ed8', online: '#7c3aed', wallet: '#b45309',
  bank_transfer: '#0e7490', easypaisa: '#16a34a', jazzcash: '#be123c', cheque: '#475569',
};
const METHOD_ICON  = { cash: DollarSign, card: CreditCard, online: Smartphone, wallet: Wallet };
const methodLabel  = m => METHOD_LABEL[m] || String(m || 'Other').replace(/_/g, ' ');

/** [[method, paisa], ...] for a list of payments, largest first. */
const byMethodOf = (payments) => {
  const m = {};
  for (const p of payments) m[p.method || 'cash'] = (m[p.method || 'cash'] || 0) + (p.amountPaid || 0);
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

const NO_SUMMARY = { previousUnsettled: 0, todayCollected: 0, todayExpenses: 0, handedOver: 0, cashInHand: 0, backdated: 0 };
const personName = s => s?.name || 'Not recorded';

const Spin = () => (
  <span style={{
    display:'inline-block', width:14, height:14, border:'2px solid #ccc',
    borderTopColor:'#0D9488', borderRadius:'50%', animation:'spin .7s linear infinite',
    verticalAlign:'middle', marginRight:6
  }}/>
);

/* ── sub-components ── */
function StatBox({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid #E8EDF3', borderRadius:12,
      padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flex:'1 1 200px'
    }}>
      <div style={{
        width:44, height:44, borderRadius:10,
        background: color + '18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
      }}>
        <Icon size={20} color={color}/>
      </div>
      <div>
        <div style={{ color:'#64748B', fontSize:11, fontWeight:600, letterSpacing:.5 }}>{label}</div>
        <div style={{ color:'#1E3A5F', fontSize:20, fontWeight:800, lineHeight:1.2 }}>{value}</div>
        {sub && <div style={{ color:'#94a3b8', fontSize:11, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function MethodBar({ label, amount, total, color }) {
  const w = pct(amount, total);
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
        <span style={{ color:'#475569', fontWeight:600 }}>{label}</span>
        <span style={{ color, fontWeight:700 }}>{money(amount)}</span>
      </div>
      <div style={{ background:'#F1F5F9', borderRadius:4, height:6, overflow:'hidden' }}>
        <div style={{ width:`${w}%`, background:color, borderRadius:4, height:'100%', transition:'width .4s ease' }}/>
      </div>
    </div>
  );
}

// Marks an entry keyed in on this day for an earlier date.
function BackdatedTag({ on, entered }) {
  return (
    <span className="badge badge-amber" title={`Dated ${dmy(on)}, entered on ${dmy(entered)}`}
      style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10.5, marginLeft:6 }}>
      <History size={10}/> Backdated
    </span>
  );
}

/* ── AccountantRow ── */
function AccountantRow({ sheet, isSelected, onSelect, onSettle, canSettle, settling }) {
  const s       = sheet.summary || NO_SUMMARY;
  const settled = sheet.status === 'settled';

  return (
    <div
      style={{
        border:`1px solid ${isSelected ? '#0D9488' : '#E8EDF3'}`,
        borderRadius:12, padding:'14px 18px', marginBottom:10,
        cursor:'pointer', background: isSelected ? '#F0FDF9' : '#fff',
        transition:'all .2s', boxShadow: isSelected ? '0 0 0 2px #CCFBF1' : 'none'
      }}
      onClick={() => onSelect(sheet)}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:40, height:40, borderRadius:'50%',
            background: settled ? 'linear-gradient(135deg,#DCFCE7,#BBF7D0)' : 'linear-gradient(135deg,#F0FDF9,#CCFBF1)',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16,
            color: settled ? '#15803d' : '#0D9488', flexShrink:0
          }}>
            {personName(sheet).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, color:'#1E3A5F', fontSize:14 }}>{personName(sheet)}</div>
            <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
              {sheet.payments.length} payment{sheet.payments.length === 1 ? '' : 's'}
              {sheet.expenses.length > 0 && <> &bull; {sheet.expenses.length} expense{sheet.expenses.length === 1 ? '' : 's'}</>}
              {sheet.role && <> &bull; <span style={{ textTransform:'capitalize' }}>{sheet.role.replace(/_/g, ' ')}</span></>}
              {s.backdated > 0 && (
                <span className="badge badge-amber" style={{ marginLeft:6, fontSize:10.5 }} title="Entries keyed in on this day for an earlier date">
                  {s.backdated} backdated
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          {/* Method breakdown (mini) */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {byMethodOf(sheet.payments).map(([m, v]) => {
              const Icon = METHOD_ICON[m] || DollarSign;
              return (
                <span key={m} style={{
                  display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
                  color: METHOD_COLOR[m] || '#475569', background:'#F8FAFC',
                  border:'1px solid #E8EDF3', borderRadius:6, padding:'2px 8px'
                }} title={methodLabel(m)}>
                  <Icon size={11}/> {money(v)}
                </span>
              );
            })}
          </div>

          <div style={{ textAlign:'right', minWidth:100 }}>
            <div style={{ fontSize:12, color:'#64748B' }}>Collected</div>
            <div style={{ fontSize:16, fontWeight:800, color: s.todayCollected ? '#0D9488' : '#94a3b8' }}>
              {money(s.todayCollected)}
            </div>
          </div>
          <div style={{ textAlign:'right', minWidth:100 }}>
            <div style={{ fontSize:12, color:'#64748B' }}>Cash in hand</div>
            <div style={{ fontSize:16, fontWeight:800, color: sheet.cashInHand ? '#b45309' : '#94a3b8' }}>
              {money(sheet.cashInHand)}
            </div>
          </div>

          {!settled && canSettle && (
            <button
              className="btn btn-sm btn-green"
              style={{ whiteSpace:'nowrap' }}
              onClick={e => { e.stopPropagation(); onSettle(sheet); }}
              disabled={settling}
            >
              {settling ? <Spin/> : <CheckCircle size={13}/>} Settle
            </button>
          )}
          {settled && (
            <span className="badge badge-green" style={{ whiteSpace:'nowrap' }}>
              <CheckCircle size={12}/> Settled
            </span>
          )}

          <div style={{ color:'#94a3b8' }}>
            {isSelected ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Settle confirmation (in-page) ── */
function SettleDialog({ targets, date, busy, onCancel, onConfirm }) {
  const [notes, setNotes] = useState('');
  const total = targets.reduce((t, s) => t + (s.cashInHand || 0), 0);
  const one = targets.length === 1 ? targets[0] : null;

  return (
    <div onClick={busy ? undefined : onCancel} style={{
      position:'fixed', inset:0, background:'rgba(15, 23, 42, 0.55)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="settle-title" onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius:14, padding:'26px 26px 20px', maxWidth:440, width:'100%',
        boxShadow:'0 8px 32px rgba(0,0,0,0.16)',
      }}>
        <h2 id="settle-title" style={{ fontSize:17, fontWeight:700, color:'#1E3A5F', marginBottom:10 }}>
          {one ? `Settle ${personName(one)}'s sheet?` : `Settle ${targets.length} balance sheets?`}
        </h2>
        <p style={{ fontSize:13.5, color:'#64748B', lineHeight:1.6, marginBottom:14 }}>
          {money(total)} will be recorded as handed over for {dmy(date)}. Everything
          {one ? ' this person' : ' these people'} entered up to the end of that day counts as settled.
        </p>
        {!one && (
          <div style={{ border:'1px solid #E8EDF3', borderRadius:8, marginBottom:14, maxHeight:150, overflowY:'auto' }}>
            {targets.map(s => (
              <div key={s.accountantId} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', borderBottom:'1px solid #F1F5F9', fontSize:13 }}>
                <span>{personName(s)}</span>
                <span style={{ fontWeight:700, color:'#1E3A5F' }}>{money(s.cashInHand)}</span>
              </div>
            ))}
          </div>
        )}
        <label htmlFor="settle-notes" style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:4 }}>
          Note (optional)
        </label>
        <input id="settle-notes" className="form-input" value={notes} maxLength={200}
          placeholder="e.g. Cash handed to the principal" onChange={e => setNotes(e.target.value)}
          style={{ marginBottom:18 }}/>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btn-green btn-sm" onClick={() => onConfirm(notes.trim())} disabled={busy}>
            {busy ? <Spin/> : <CheckCircle size={13}/>} {busy ? 'Settling...' : 'Yes, settle'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Printed sheet ── */
function printSheets({ date, sheets, imported, totals, school }) {
  const th = h => `<th style="text-align:left;padding:5px 6px;border-bottom:1px solid #94A3B8;background:#F1F5F9;font-size:10.5px">${h}</th>`;
  const td = (v, right) => `<td style="padding:4px 6px;border-bottom:1px solid #E2E8F0;font-size:10.5px${right ? ';text-align:right' : ''}">${v}</td>`;
  const later = (row) => (row.backdated ? ` <span style="color:#92400E;font-size:9px">(dated ${dmy(row.datedOn)})</span>` : '');

  const summary = `
    <table>
      <thead><tr>${['Person', 'Carried in', 'Collected', 'Spent', 'Handed over', 'Cash in hand', 'Status'].map(th).join('')}</tr></thead>
      <tbody>${sheets.map(s => `<tr>
        ${td(esc(personName(s)))}${td(money(s.summary.previousUnsettled), 1)}${td(money(s.summary.todayCollected), 1)}
        ${td(money(s.summary.todayExpenses), 1)}${td(money(s.summary.handedOver), 1)}${td(`<b>${money(s.cashInHand)}</b>`, 1)}
        ${td(s.status === 'settled' ? 'Settled' : 'Not settled')}
      </tr>`).join('')}</tbody>
      <tfoot><tr>
        ${td('<b>Total</b>')}${td(`<b>${money(totals.carried)}</b>`, 1)}${td(`<b>${money(totals.collected)}</b>`, 1)}
        ${td(`<b>${money(totals.spent)}</b>`, 1)}${td(`<b>${money(totals.handedOver)}</b>`, 1)}${td(`<b>${money(totals.inHand)}</b>`, 1)}${td('')}
      </tr></tfoot>
    </table>`;

  const detail = sheets.filter(s => s.payments.length || s.expenses.length).map(s => `
    <h3 style="font-size:13px;margin:16px 0 6px;color:#1B2F6E">${esc(personName(s))}</h3>
    ${s.payments.length ? `<table>
      <thead><tr>${['Entered', 'Student', 'Fee', 'Fee month', 'Paid on', 'Method', 'Receipt', 'Amount'].map(th).join('')}</tr></thead>
      <tbody>${s.payments.map(p => `<tr>
        ${td(pkTime(p.createdAt))}${td(esc(p.invoice?.student?.name || '—'))}${td(esc(p.invoice?.feeTitle || '—'))}
        ${td(esc(feePeriod(p.invoice) || '—'))}${td(dmy(p.datedOn) + later(p))}${td(esc(methodLabel(p.method)))}
        ${td(esc(p.receiptNo || '—'))}${td(money(p.amountPaid), 1)}
      </tr>`).join('')}</tbody>
    </table>` : ''}
    ${s.expenses.length ? `<table style="margin-top:6px">
      <thead><tr>${['Entered', 'Expense', 'Category', 'Dated', 'Amount'].map(th).join('')}</tr></thead>
      <tbody>${s.expenses.map(e => `<tr>
        ${td(pkTime(e.createdAt))}${td(esc(e.description || '—'))}${td(esc(e.category || '—'))}
        ${td(dmy(e.datedOn) + later(e))}${td(money(e.amount), 1)}
      </tr>`).join('')}</tbody>
    </table>` : ''}`).join('');

  const body = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1B2F6E;padding-bottom:8px;margin-bottom:12px">
      <div>
        <div style="font-size:18px;font-weight:800">${esc(school.name)}</div>
        ${school.address ? `<div style="font-size:11px;color:#64748B">${esc(school.address)}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:800;color:#1B2F6E">Daily Balance Sheet</div>
        <div style="font-size:12px">${dmy(date)}</div>
      </div>
    </div>
    ${sheets.length ? summary : '<p>Nothing was entered on this day.</p>'}
    ${imported.count ? `<p style="font-size:11px;margin-top:8px">Old records imported on this day: ${imported.count} fee payment${imported.count === 1 ? '' : 's'}, ${money(imported.amount)}. Not counted: they are past records, not cash anyone holds.</p>` : ''}
    ${totals.backdated ? `<p style="font-size:11px;margin-top:4px">${totals.backdated} entr${totals.backdated === 1 ? 'y was' : 'ies were'} keyed in on this day for an earlier date; they count as cash entered on this day.</p>` : ''}
    ${detail}
    <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:11px">
      <div style="border-top:1px solid #334155;width:180px;text-align:center;padding-top:4px">Accountant</div>
      <div style="border-top:1px solid #334155;width:180px;text-align:center;padding-top:4px">Checked by</div>
    </div>
    <p style="font-size:9.5px;color:#94A3B8;margin-top:14px">Printed ${esc(new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }))}</p>`;
  const title = `Daily Balance Sheet — ${dmy(date)}`;
  printHTML(printDocumentShell({ title, body }), { title });
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   Cash is counted by when it was ENTERED: a fee received last week but
   keyed in today is in the cashier's hand today, so it is listed here with
   the date written on it and marked Backdated. Fee history imported from old
   books has no receiver; it is reported apart and is nobody's cash.
═══════════════════════════════════════════════════════ */
export default function DailyBalancesheetPage() {
  const qc = useQueryClient();
  const { user, school } = useAuthStore();
  const [date,        setDate]        = useState(todayPKT());
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [confirming,  setConfirming]  = useState(null);   // sheets waiting for a yes

  const isAdmin   = ['admin', 'super_admin'].includes(user?.role);
  // An accountant may settle only their own sheet; the server says the same.
  const canSettle = sheet => isAdmin || sheet.accountantId === user?.id;

  /* ── 1. Every person's sheet for the day ── */
  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['daily-balancesheet', date],
    queryFn:  () => api.get('/reports/accounting/daily-balancesheet', { params: { date } }).then(r => r.data.data),
    // Money changes hands all day: never show a five-minute-old sheet.
    staleTime: 0,
    refetchOnMount: true,
  });

  const sheets   = (data?.date === date ? data?.sheets : null) || [];
  const imported = data?.imported || { count: 0, amount: 0 };

  /* ── 2. Grand totals ── */
  const totals = sheets.reduce((t, s) => {
    const sum = s.summary || NO_SUMMARY;
    return {
      collected:  t.collected + sum.todayCollected,
      spent:      t.spent + sum.todayExpenses,
      carried:    t.carried + sum.previousUnsettled,
      handedOver: t.handedOver + sum.handedOver,
      inHand:     t.inHand + (s.cashInHand || 0),
      payments:   t.payments + s.payments.length,
      backdated:  t.backdated + sum.backdated,
    };
  }, { collected: 0, spent: 0, carried: 0, handedOver: 0, inHand: 0, payments: 0, backdated: 0 });
  const methods = byMethodOf(sheets.flatMap(s => s.payments));

  /* ── 3. Settle ── */
  const settle = useMutation({
    // One at a time, so each person's handover is recorded on its own.
    mutationFn: async ({ targets, notes }) => {
      const done = [];
      const failed = [];
      for (const s of targets) {
        try {
          const r = await api.post('/reports/accounting/settle', { accountantId: s.accountantId, date, notes });
          done.push(r.data?.message || `Balance sheet settled for ${personName(s)}.`);
        } catch (err) {
          failed.push(`${personName(s)}: ${err.response?.data?.message || 'could not be settled. Try again.'}`);
        }
      }
      return { done, failed };
    },
    retry: false,   // a repeated settle would record a second handover
    onSuccess: ({ done, failed }) => {
      if (done.length === 1) toast.success(done[0]);
      else if (done.length > 1) toast.success(`${done.length} balance sheets settled for ${dmy(date)}.`);
      failed.forEach(msg => toast.error(msg, { duration: 6000 }));
      setConfirming(null);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily-balancesheet'] });
      // The Accountant Portal shows the same sheet.
      ['last-balancesheet', 'sheet-status', 'prev-sheet'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });

  const openToSettle = sheets.filter(s => s.status !== 'settled' && canSettle(s));

  /* ── 4. Print ── */
  const handlePrint = () => printSheets({
    date, sheets, imported, totals,
    school: {
      name: school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School',
      address: school?.address || '',
    },
  });

  /* ── 5. Detail ── */
  const accData = selectedAcc ? sheets.find(s => s.accountantId === selectedAcc) : null;
  const accSum  = accData?.summary || NO_SUMMARY;
  const isToday = date === todayPKT();
  const onDay   = isToday ? 'today' : `on ${dmy(date)}`;

  return (
    <div className="page-content fade-in">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {confirming && (
        <SettleDialog
          targets={confirming}
          date={date}
          busy={settle.isPending}
          onCancel={() => setConfirming(null)}
          onConfirm={notes => settle.mutate({ targets: confirming, notes })}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }} className="no-print">
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <BarChart2 size={26} color="#0D9488"/>
            Daily Balance Sheet
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>
            What each person entered on a day, the cash still in their hand, and settling it
          </p>
        </div>

        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E8EDF3', borderRadius:10, padding:'6px 14px' }}>
            <Calendar size={15} color="#0D9488"/>
            <input
              type="date"
              aria-label="Day"
              value={date}
              max={todayPKT()}
              onChange={e => { if (e.target.value) { setDate(e.target.value); setSelectedAcc(null); } }}
              style={{ border:'none', outline:'none', fontSize:14, fontWeight:600, color:'#1E3A5F', background:'transparent', cursor:'pointer' }}
            />
          </div>

          {isToday && (
            <span className="badge badge-teal" style={{ padding:'6px 12px' }}>Today</span>
          )}

          <button
            className="btn btn-outline btn-sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['daily-balancesheet', date] })}
            disabled={isFetching}
          >
            <RefreshCw size={13}/> Refresh
          </button>

          {openToSettle.length > 1 && (
            <button className="btn btn-green btn-sm" onClick={() => setConfirming(openToSettle)} disabled={settle.isPending}>
              <CheckCircle size={13}/> Settle All ({openToSettle.length})
            </button>
          )}

          <button className="btn btn-outline btn-sm" onClick={handlePrint} disabled={isFetching && !sheets.length}>
            <Printer size={13}/> Print Report
          </button>
        </div>
      </div>

      {isError && (
        <div className="alert alert-danger" style={{ marginBottom:16 }}>
          <AlertCircle size={16}/> {error?.response?.data?.message || 'The balance sheet could not be loaded. Please try again.'}
        </div>
      )}

      {/* ── Grand Summary Stats ── */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <StatBox label="COLLECTED"    value={money(totals.collected)}  sub={`${totals.payments} payment${totals.payments === 1 ? '' : 's'} entered ${onDay}`} color="#0D9488" icon={TrendingUp}/>
        <StatBox label="SPENT"        value={money(totals.spent)}      sub={`expenses entered ${onDay}`} color="#DC2626" icon={TrendingDown}/>
        <StatBox label="CASH IN HAND" value={money(totals.inHand)}     sub="still to hand over" color="#b45309" icon={Wallet}/>
        <StatBox label="HANDED OVER"  value={money(totals.handedOver)} sub="settled" color="#15803d" icon={CheckCircle}/>
      </div>

      {/* ── Backdated / imported notes ── */}
      {totals.backdated > 0 && (
        <div className="alert alert-warning" style={{ marginBottom:12 }}>
          <History size={16} style={{ flexShrink:0, marginTop:2 }}/>
          <span>
            {totals.backdated} entr{totals.backdated === 1 ? 'y was' : 'ies were'} keyed in {onDay} with an earlier date.
            They count as cash entered {onDay} and are marked <b>Backdated</b> with the date written on them.
          </span>
        </div>
      )}
      {imported.count > 0 && (
        <div className="alert alert-info" style={{ marginBottom:12 }}>
          <Archive size={16} style={{ flexShrink:0, marginTop:2 }}/>
          <span>
            Old records: {imported.count} fee payment{imported.count === 1 ? '' : 's'} ({money(imported.amount)}) imported {onDay}.
            They are past records, not cash anyone holds, so no sheet counts them.
          </span>
        </div>
      )}

      {/* ── Method breakdown bar ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, color:'#1E3A5F', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <BarChart2 size={16} color="#0D9488"/> Collection by Method
        </div>
        {methods.length === 0
          ? <div style={{ fontSize:13, color:'#94a3b8' }}>No fees entered {onDay}.</div>
          : methods.map(([m, v]) => (
            <MethodBar key={m} label={methodLabel(m)} amount={v} total={totals.collected} color={METHOD_COLOR[m] || '#475569'}/>
          ))}
      </div>

      {/* ── Main area: two columns when detail open ── */}
      <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>

        {/* ── People ── */}
        <div style={{ flex: selectedAcc ? '1 1 380px' : '1 1 100%', minWidth:0 }}>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{
              padding:'12px 18px', background:'#F8FAFC', borderBottom:'1px solid #E8EDF3',
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <div style={{ fontWeight:700, color:'#1E3A5F', fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                <Users size={15} color="#0D9488"/> People ({sheets.length})
              </div>
              {selectedAcc && (
                <button style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', gap:4, fontSize:12 }}
                  onClick={() => setSelectedAcc(null)}>
                  <X size={14}/> Close Detail
                </button>
              )}
            </div>

            <div style={{ padding:'12px 14px' }}>
              {isFetching && !sheets.length && (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>
                  <Spin/> Loading...
                </div>
              )}

              {!isFetching && !isError && sheets.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 16px', color:'#94a3b8' }}>
                  <Receipt size={36} style={{ opacity:0.3, display:'block', margin:'0 auto 10px' }}/>
                  <div style={{ fontWeight:600, marginBottom:4 }}>Nothing entered on {dmy(date)}</div>
                  <div style={{ fontSize:12 }}>No fees or expenses were entered that day, and no cash was left to hand over.</div>
                </div>
              )}

              {sheets.map(s => (
                <AccountantRow
                  key={s.accountantId}
                  sheet={s}
                  isSelected={selectedAcc === s.accountantId}
                  onSelect={a => setSelectedAcc(selectedAcc === a.accountantId ? null : a.accountantId)}
                  onSettle={a => setConfirming([a])}
                  canSettle={canSettle(s)}
                  settling={settle.isPending && confirming?.some(c => c.accountantId === s.accountantId)}
                />
              ))}
            </div>

            {sheets.length > 0 && (
              <div style={{
                padding:'12px 18px', borderTop:'1px solid #E8EDF3', background:'#F0FDF9',
                display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8
              }}>
                <span style={{ fontWeight:700, color:'#1E3A5F', fontSize:13 }}>Cash in hand, everyone</span>
                <span style={{ fontWeight:800, color:'#b45309', fontSize:18 }}>{money(totals.inHand)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        {selectedAcc && accData && (
          <div style={{ flex:'2 1 480px', minWidth:0 }}>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{
                padding:'14px 20px',
                background:'linear-gradient(90deg,#0D9488,#0F766E)',
                display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#fff', fontWeight:800, fontSize:18
                  }}>
                    {personName(accData).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{personName(accData)}</div>
                    <div style={{ color:'rgba(255,255,255,0.8)', fontSize:12 }}>
                      {accData.payments.length} payments &bull; {dmy(date)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'rgba(255,255,255,0.8)', fontSize:11 }}>CASH IN HAND</div>
                  <div style={{ color:'#FEF08A', fontSize:22, fontWeight:800 }}>{money(accData.cashInHand)}</div>
                </div>
              </div>

              {/* How the cash in hand is made up */}
              <div style={{ padding:'12px 20px', background:'#F8FAFC', borderBottom:'1px solid #E8EDF3', fontSize:13 }}>
                {[
                  ['Carried from earlier days', accSum.previousUnsettled, '#475569', ''],
                  [`Fees entered ${onDay}`, accSum.todayCollected, '#15803d', '+ '],
                  [`Expenses entered ${onDay}`, accSum.todayExpenses, '#DC2626', '− '],
                  ['Handed over (settled)', accSum.handedOver, '#1d4ed8', '− '],
                ].map(([label, v, color, sign]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4, color:'#64748B' }}>
                    <span>{label}</span>
                    <span style={{ fontWeight:700, color }}>{sign}{money(v)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #CBD5E1', paddingTop:6, marginTop:4, fontWeight:800, color:'#1E3A5F' }}>
                  <span>Cash in hand</span>
                  <span>{money(accData.cashInHand)}</span>
                </div>
              </div>

              {/* Payments table */}
              <div className="table-wrap" style={{ borderRadius:0, border:'none', maxHeight:480, overflowY:'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Entered</th>
                      <th>Student</th>
                      <th>Fee</th>
                      <th>Fee Month</th>
                      <th>Paid On</th>
                      <th>Method</th>
                      <th>Discount</th>
                      <th>Amount</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accData.payments.map((p, idx) => {
                      const Icon = METHOD_ICON[p.method] || DollarSign;
                      const color = METHOD_COLOR[p.method] || '#475569';
                      return (
                        <tr key={p.id} style={p.backdated ? { background:'#FFFBEB' } : undefined}>
                          <td style={{ color:'#94a3b8', fontSize:12 }}>{idx + 1}</td>
                          <td style={{ color:'#64748B', fontSize:12, whiteSpace:'nowrap' }}>{pkTime(p.createdAt)}</td>
                          <td style={{ fontWeight:600, color:'#1E3A5F' }}>
                            {p.invoice?.student?.name || '—'}
                            {p.invoice?.student?.rollNo && (
                              <span style={{ color:'#94a3b8', fontSize:11, display:'block' }}>
                                Roll: {p.invoice.student.rollNo}
                              </span>
                            )}
                          </td>
                          <td style={{ color:'#475569', fontSize:13 }}>{p.invoice?.feeTitle || '—'}</td>
                          <td style={{ color:'#64748B', fontSize:12 }}>{feePeriod(p.invoice) || '—'}</td>
                          <td style={{ fontSize:12, whiteSpace:'nowrap' }}>
                            {dmy(p.datedOn)}
                            {p.backdated && <BackdatedTag on={p.datedOn} entered={date}/>}
                          </td>
                          <td>
                            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color }}>
                              <Icon size={12}/> {methodLabel(p.method)}
                            </span>
                          </td>
                          <td style={{ color:'#0D9488', fontSize:12 }}>
                            {p.discount ? money(p.discount) : '—'}
                          </td>
                          <td style={{ fontWeight:700, color:'#15803d' }}>{money(p.amountPaid)}</td>
                          <td>
                            {p.receiptNo && (
                              <button
                                type="button"
                                onClick={() => openServerDocument(`/pdf/receipt/${p.id}`, { title: `Receipt ${p.receiptNo}` })
                                  .catch(() => toast.error('The receipt could not be opened. Try again.'))}
                                style={{ color:'#0D9488', fontSize:11, display:'flex', alignItems:'center', gap:3, background:'none', border:0, padding:0, cursor:'pointer', font:'inherit' }}
                              >
                                <Receipt size={11}/> {p.receiptNo}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {accData.payments.length === 0 && (
                      <tr>
                        <td colSpan={10} style={{ textAlign:'center', padding:24, color:'#94a3b8' }}>
                          No fees entered {onDay}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {accData.payments.length > 0 && (
                    <tfoot>
                      <tr style={{ background:'#F0FDF9', fontWeight:800 }}>
                        <td colSpan={8} style={{ padding:'10px 14px', color:'#1E3A5F', fontSize:13 }}>
                          Total — {accData.payments.length} payments
                        </td>
                        <td style={{ color:'#0D9488', fontSize:15 }}>{money(accSum.todayCollected)}</td>
                        <td/>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Expenses entered by this person */}
              {accData.expenses.length > 0 && (
                <div className="table-wrap" style={{ borderRadius:0, border:'none', borderTop:'1px solid #E8EDF3' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Entered</th>
                        <th>Expense</th>
                        <th>Category</th>
                        <th>Dated</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accData.expenses.map(e => (
                        <tr key={e.id} style={e.backdated ? { background:'#FFFBEB' } : undefined}>
                          <td style={{ color:'#64748B', fontSize:12 }}>{pkTime(e.createdAt)}</td>
                          <td style={{ fontSize:13 }}>{e.description || '—'}</td>
                          <td style={{ fontSize:12, color:'#64748B' }}>{e.category || '—'}</td>
                          <td style={{ fontSize:12, whiteSpace:'nowrap' }}>
                            {dmy(e.datedOn)}
                            {e.backdated && <BackdatedTag on={e.datedOn} entered={date}/>}
                          </td>
                          <td style={{ fontWeight:700, color:'#DC2626' }}>{money(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Settlement status banner */}
              {accData.status === 'settled' ? (
                <div style={{ padding:'10px 20px', background:'#DCFCE7', borderTop:'1px solid #BBF7D0', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <CheckCircle size={16} color="#15803d"/>
                  <span style={{ color:'#15803d', fontWeight:600, fontSize:13 }}>
                    Settled: {money(accSum.handedOver)} handed over
                    {accData.lastSettledAt ? ` (last settlement ${pkStamp(accData.lastSettledAt)})` : ''}.
                  </span>
                </div>
              ) : (
                <div style={{ padding:'10px 20px', background:'#FEF9C3', borderTop:'1px solid #FDE047', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={16} color="#b45309"/>
                    <span style={{ color:'#b45309', fontWeight:600, fontSize:13 }}>
                      Not settled yet: {money(accData.cashInHand)} still to hand over
                    </span>
                  </div>
                  {canSettle(accData) && (
                    <button
                      className="btn btn-sm btn-green"
                      onClick={() => setConfirming([accData])}
                      disabled={settle.isPending}
                    >
                      <CheckCircle size={13}/> Mark as Settled
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Daily Summary ── */}
      <div className="card" style={{ marginTop:16, pageBreakInside:'avoid' }}>
        <div style={{ fontWeight:700, color:'#1E3A5F', marginBottom:12, fontSize:15 }}>
          Daily Summary — {dmy(date)}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F0FDF9' }}>
                {['Person', 'Carried in', 'Collected', 'Spent', 'Handed over', 'Cash in hand', 'Status'].map((h, i) => (
                  <th key={h} style={{ padding:'8px 12px', textAlign: i === 0 ? 'left' : i === 6 ? 'center' : 'right', borderBottom:'2px solid #CCFBF1', color:'#0D9488', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheets.map((s, i) => (
                <tr key={s.accountantId} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <td style={{ padding:'8px 12px', fontWeight:600, color:'#1E3A5F' }}>{personName(s)}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', color:'#64748B' }}>{money(s.summary.previousUnsettled)}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', color:'#15803d', fontWeight:600 }}>{money(s.summary.todayCollected)}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', color:'#DC2626', fontWeight:600 }}>{money(s.summary.todayExpenses)}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', color:'#1d4ed8', fontWeight:600 }}>{money(s.summary.handedOver)}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:800, color:'#b45309', fontSize:14 }}>{money(s.cashInHand)}</td>
                  <td style={{ padding:'8px 12px', textAlign:'center' }}>
                    {s.status === 'settled'
                      ? <span className="badge badge-green">Settled</span>
                      : <span className="badge badge-amber">Pending</span>
                    }
                  </td>
                </tr>
              ))}
              {sheets.length === 0 && (
                <tr><td colSpan={7} style={{ padding:'14px 12px', textAlign:'center', color:'#94a3b8' }}>Nothing entered on this day.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background:'#F0FDF9', fontWeight:800 }}>
                <td style={{ padding:'10px 12px', color:'#1E3A5F' }}>GRAND TOTAL</td>
                <td style={{ padding:'10px 12px', textAlign:'right', color:'#64748B' }}>{money(totals.carried)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', color:'#15803d' }}>{money(totals.collected)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', color:'#DC2626' }}>{money(totals.spent)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', color:'#1d4ed8' }}>{money(totals.handedOver)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', color:'#b45309', fontSize:16 }}>{money(totals.inHand)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style={{ marginTop:10, fontSize:11, color:'#94a3b8', textAlign:'right' }}>
          Cash is counted on the day it was entered. Imported old records are not counted.
        </div>
      </div>
    </div>
  );
}
