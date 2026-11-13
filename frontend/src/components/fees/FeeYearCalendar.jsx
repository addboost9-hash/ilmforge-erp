/**
 * One student's fee year as a calendar: a tile per month showing paid (and
 * the day it was collected), part paid, unpaid, not billed. Unpaid months
 * can be collected from their tile. Shown on Collect Fee.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, DollarSign, Printer, AlertTriangle, CheckCircle2, BookOpen } from 'lucide-react';
import useFeeOptions from './useFeeOptions';
import { useSchoolStamp, stampFor } from '../../utils/schoolStamp';
import { feeYear, monthRange, monthTitle, periodOptions, money, rs, dmy, dm, lookOf, STATE_LOOK } from '../../utils/feeYear';
import { printFeeCard } from '../../utils/feeRegisterPrint';

const LEGEND = ['paid', 'partial', 'unpaid', 'due', 'none'];

/* onOpenRegister: where "Class register" goes; by default the Fees hub
   (the accountant portal passes its own tab instead). */
export default function FeeYearCalendar({ student, invoices, onCollect, onOpenRegister }) {
  const { sessions, school } = useFeeOptions();
  const stamp = stampFor(useSchoolStamp(), 'feeRecords');
  const { options, defaultId } = useMemo(() => periodOptions(sessions), [sessions]);
  const [periodId, setPeriodId] = useState('');
  const period = options.find((o) => o.id === periodId) || options.find((o) => o.id === defaultId);
  const months = useMemo(() => monthRange(period.from, period.to), [period.from, period.to]);
  const { cells, totals } = useMemo(
    () => feeYear(invoices || [], months, { admissionDate: student?.admissionDate }),
    [invoices, months, student?.admissionDate],
  );

  return (
    <section aria-label="Fee calendar" style={{ padding: '14px 16px 16px', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={16} style={{ color: 'var(--primary)' }} />
          <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Fee calendar</strong>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{period.title}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-select" aria-label="Fee calendar period" style={{ width: 'auto', minWidth: 230, height: 32, fontSize: 13 }}
            value={period.id} onChange={(e) => setPeriodId(e.target.value)}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => printFeeCard({ student, school, period, cells, totals, stamp })}>
            <Printer size={13} /> Fee card
          </button>
          {student?.classId && onOpenRegister && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onOpenRegister(student)}>
              <BookOpen size={13} /> Class register
            </button>
          )}
          {student?.classId && !onOpenRegister && (
            <Link className="btn btn-outline btn-sm" to={`/hub/fees?tab=register&classId=${student.classId}${student.sectionId ? `&sectionId=${student.sectionId}` : ''}`}>
              <BookOpen size={13} /> Class register
            </Link>
          )}
        </div>
      </div>

      {/* Where the student stands this year, in one line. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 12.5 }}>
        {totals.pendingMonths > 0 ? (
          <span role="status" style={chip(STATE_LOOK.unpaid)}>
            <AlertTriangle size={13} /> {totals.pendingMonths} month{totals.pendingMonths === 1 ? '' : 's'} pending — {money(totals.due)}
            <span style={{ fontWeight: 500 }}>({totals.pendingList.map((m) => monthTitle(m, { year: false })).join(', ')})</span>
          </span>
        ) : totals.billedMonths > 0 ? (
          <span role="status" style={chip(STATE_LOOK.paid)}><CheckCircle2 size={13} /> Every billed month is paid</span>
        ) : (
          <span role="status" style={chip(STATE_LOOK.none)}>No fee billed in this period</span>
        )}
        {totals.billedMonths > 0 && <span style={chip(STATE_LOOK.none)}>Paid {totals.paidMonths} of {totals.billedMonths} billed months · {money(totals.paid)} collected</span>}
        {totals.earlierDue > 0 && <span style={chip(STATE_LOOK.partial)}>Earlier dues {money(totals.earlierDue)}</span>}
        {totals.lastPaidOn && <span style={chip(STATE_LOOK.none)}>Last collected {dmy(totals.lastPaidOn)}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: 8 }}>
        {cells.map((c) => <MonthTile key={c.month} c={c} onCollect={onCollect} />)}
      </div>

      <div aria-hidden="true" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
        {LEGEND.map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: STATE_LOOK[k].bg, border: `1px solid ${STATE_LOOK[k].bd}` }} />
            {k === 'due' ? 'Due (not late yet)' : STATE_LOOK[k].label}
          </span>
        ))}
      </div>
    </section>
  );
}

const chip = (l) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, background: l.bg, color: l.fg, border: `1px solid ${l.bd}`, borderRadius: 999, padding: '3px 10px', fontWeight: 600 });

function MonthTile({ c, onCollect }) {
  const look = lookOf(c);
  const owing = c.bills.filter((b) => Number(b.dueAmount) > 0);
  const faint = c.state === 'upcoming' || c.state === 'before';
  return (
    <div data-month={c.month} data-state={c.state}
      style={{
        border: `1px solid ${c.current ? 'var(--primary)' : look.bd}`, boxShadow: c.current ? '0 0 0 1px var(--primary)' : 'none',
        borderRadius: 8, overflow: 'hidden', background: '#fff', opacity: faint ? 0.75 : 1, display: 'flex', flexDirection: 'column',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, padding: '5px 9px', background: look.bg, color: look.fg }}>
        <strong style={{ fontSize: 12.5 }}>{monthTitle(c.month)}</strong>
        <span style={{ fontSize: 11, fontWeight: 700 }}>{c.current && c.state !== 'paid' ? `${look.label} · now` : look.label}</span>
      </div>
      <div style={{ padding: '7px 9px', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {c.bills.length === 0 && (
          <span style={{ color: '#9CA3AF' }}>{c.state === 'upcoming' ? 'Not billed yet' : c.state === 'before' ? 'Before admission' : 'No fee billed'}</span>
        )}
        {c.bills.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <span>Fee</span><strong style={{ color: 'var(--text-primary)' }}>{money(c.billed)}</strong>
            </div>
            {c.bills.length > 1 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.bills.map((b) => `${shortTitle(b.feeTitle)} ${rs(Number(b.totalAmount) + Number(b.lateFee || 0))}`).join(' · ')}</div>
            )}
            {c.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>{money(c.discount)}</span></div>}
            {c.paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}><span>Paid</span><strong>{money(c.paid)}</strong></div>}
            {c.due > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: c.late ? '#991B1B' : '#075985' }}><span>Balance</span><strong>{money(c.due)}</strong></div>}
            {c.payments.length > 0 && (
              <div style={{ fontSize: 11.5, color: '#166534', marginTop: 2 }}
                title={c.payments.map((p) => `${dmy(p.day)} · ${money(p.amountPaid)} · ${p.method || ''}${p.receiptNo ? ` · Receipt ${p.receiptNo}` : ''}`).join('\n')}>
                ✓ Collected {c.payments.length > 2 ? `${dm(c.payments[0].day)} … ${dmy(c.lastPaidOn)}` : c.payments.map((p) => (c.payments.length > 1 ? dm(p.day) : dmy(p.day))).join(', ')}
                {c.payments.length === 1 && c.payments[0].receiptNo ? <div style={{ color: 'var(--text-muted)' }}>Receipt {c.payments[0].receiptNo}</div> : null}
              </div>
            )}
          </>
        )}
        {owing.length > 0 && onCollect && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto', paddingTop: 4 }}>
            {owing.map((b) => (
              <button key={b.id} type="button" className="btn btn-sm btn-success" style={{ justifyContent: 'center', padding: '3px 8px', fontSize: 11.5 }}
                onClick={() => onCollect(b)} aria-label={`Collect ${b.feeTitle} for ${monthTitle(c.month, { short: false })}`}>
                <DollarSign size={11} /> Collect{owing.length > 1 ? ` ${shortTitle(b.feeTitle)}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** "Monthly Fee Of September" -> "Monthly", "Transport Fee Of July" -> "Transport". */
export function shortTitle(title) {
  const t = String(title || '').replace(/\b(fee|fees|of|for)\b/gi, ' ')
    .replace(/\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?|(19|20)\d\d)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  return t || 'Fee';
}
