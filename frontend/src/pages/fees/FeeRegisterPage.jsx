/**
 * Fee Register: a class's fees for a session or year, a row per student
 * and a column per month, the way a school keeps its fee register book.
 * Each month shows paid (with the day it was collected), part paid,
 * unpaid or not billed; students with months pending can be picked out,
 * and the register printed (or saved as PDF) or taken to Excel.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, Printer, FileSpreadsheet, X, DollarSign, Search, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { feeYear, monthRange, monthTitle, periodOptions, money, rs, dmy, lookOf, STATE_LOOK } from '../../utils/feeYear';
import { printFeeRegister, cellText } from '../../utils/feeRegisterPrint';
import { downloadExcel } from '../../utils/export';
import useFeeOptions from '../../components/fees/useFeeOptions';
import { useSchoolStamp, stampFor } from '../../utils/schoolStamp';

const SHOW = [
  { id: 'all', label: 'All students' },
  { id: 'pending', label: 'With pending fees' },
  { id: '2', label: '2 or more months pending' },
  { id: '3', label: '3 or more months pending' },
  { id: 'clear', label: 'Nothing pending' },
];
const keep = (show, t) => (show === 'pending' ? t.balance > 0
  : show === '2' ? t.pendingMonths >= 2
    : show === '3' ? t.pendingMonths >= 3
      : show === 'clear' ? t.balance <= 0 : true);

export default function FeeRegisterPage({ initialClassId, initialSectionId, onOpenStudent } = {}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [classId, setClassId] = useState(String(initialClassId || params.get('classId') || ''));
  const [sectionId, setSectionId] = useState(String(initialSectionId || params.get('sectionId') || ''));
  const [periodId, setPeriodId] = useState('');
  const [show, setShow] = useState(params.get('show') || 'all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // { row, cell }

  const { classes, sessions, school } = useFeeOptions();
  const stamp = stampFor(useSchoolStamp(), 'feeRecords');
  const { options, defaultId } = useMemo(() => periodOptions(sessions), [sessions]);
  const period = options.find((o) => o.id === periodId) || options.find((o) => o.id === defaultId);
  const months = useMemo(() => monthRange(period.from, period.to), [period.from, period.to]);
  const cls = classId || (classes[0] ? String(classes[0].id) : '');
  const sections = classes.find((c) => String(c.id) === cls)?.sections || [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['fee-register', cls, sectionId, period.from, period.to],
    queryFn: () => api.get('/fees/register', { params: { classId: cls, sectionId: sectionId || undefined, from: period.from, to: period.to } }).then((r) => r.data.data),
    enabled: !!cls,
  });

  // Every student's months, worked out once.
  const all = useMemo(() => {
    if (!data) return [];
    const bills = new Map();
    for (const inv of data.invoices || []) {
      if (!bills.has(inv.studentId)) bills.set(inv.studentId, []);
      bills.get(inv.studentId).push(inv);
    }
    return (data.students || []).map((s) => ({ student: s, ...feeYear(bills.get(s.id) || [], months, { admissionDate: s.admissionDate }) }));
  }, [data, months]);

  const needle = q.trim().toLowerCase();
  const rows = all.filter((r) => keep(show, r.totals)
    && (!needle || [r.student.name, r.student.rollNo, r.student.fatherName].some((v) => String(v || '').toLowerCase().includes(needle))));

  // One group per class and section, as the register book has a page each.
  const groups = useMemo(() => {
    const out = [];
    for (const r of rows) {
      const title = [r.student.className, r.student.sectionName].filter(Boolean).join(' — ') || 'Students';
      let g = out[out.length - 1];
      if (!g || g.title !== title) { g = { title, rows: [] }; out.push(g); }
      g.rows.push(r);
    }
    return out;
  }, [rows]);

  const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);
  const counts = {
    pending: all.filter((r) => r.totals.balance > 0).length,
    three: all.filter((r) => r.totals.pendingMonths >= 3).length,
  };
  const anyEarlier = rows.some((r) => r.totals.earlierDue > 0);
  const showLabel = SHOW.find((s) => s.id === show)?.label;
  const className = cls === 'all' ? 'All classes' : classes.find((c) => String(c.id) === cls)?.name || '';
  const sectionName = sections.find((s) => String(s.id) === sectionId)?.name;

  const print = () => {
    const ok = printFeeRegister({
      school, period, months, groups, stamp,
      note: [show !== 'all' && showLabel, needle && `Search: ${q.trim()}`].filter(Boolean).join(' · '),
    });
    if (!ok) toast.error('No students to print. Change the class or the "Show" choice.');
  };

  const toExcel = async () => {
    if (!rows.length) return toast.error('No students to export.');
    const text = (c) => ({
      paid: c.lastPaidOn ? `Paid ${dmy(c.lastPaidOn)}` : 'Paid',
      partial: `Part paid, balance ${rs(c.due)}`,
      unpaid: `Unpaid ${rs(c.due)}`,
      none: 'Not billed',
      before: 'Before admission',
      upcoming: '',
    }[c.state]);
    const sheet = rows.map((r) => {
      const o = { Class: r.student.className, Section: r.student.sectionName, 'Roll No': r.student.rollNo || '', Student: r.student.name, Father: r.student.fatherName || '' };
      r.cells.forEach((c) => { o[monthTitle(c.month)] = text(c); });
      o['Months pending'] = r.totals.pendingMonths;
      o['Earlier dues (Rs)'] = Math.round(r.totals.earlierDue / 100);
      o['Collected (Rs)'] = Math.round(r.totals.paid / 100);
      o['Balance (Rs)'] = Math.round(r.totals.balance / 100);
      return o;
    });
    const file = `Fee Register - ${className}${sectionName ? ` ${sectionName}` : ''} - ${period.title}.xlsx`.replace(/[\\/:*?"<>|]/g, '-');
    try { await downloadExcel(sheet, file, 'Fee Register'); } catch { toast.error('Could not make the Excel file.'); }
  };

  const collect = (s) => (onOpenStudent ? onOpenStudent(s) : navigate(`/hub/fees?tab=collect&student=${s.id}`));

  return (
    <div className="page-content fade-in">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={19} style={{ color: 'var(--primary)' }} /> Fee Register
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '3px 0 0' }}>
              Each student's fee month by month: paid with the day it was collected, part paid, unpaid or not billed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={toExcel} disabled={!rows.length}><FileSpreadsheet size={14} /> Excel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={print} disabled={!rows.length}><Printer size={14} /> Print / Save as PDF</button>
          </div>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <label style={lab}>Class
            <select className="form-select" aria-label="Class" value={cls} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="all">All classes</option>
            </select>
          </label>
          <label style={lab}>Section
            <select className="form-select" aria-label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={cls === 'all' || !sections.length}>
              <option value="">All sections</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label style={{ ...lab, gridColumn: 'span 2' }}>Session or year
            <select className="form-select" aria-label="Session or year" value={period.id} onChange={(e) => setPeriodId(e.target.value)}>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <label style={lab}>Show
            <select className="form-select" aria-label="Show" value={show} onChange={(e) => setShow(e.target.value)}>
              {SHOW.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label style={lab}>Find a student
            <span style={{ position: 'relative', display: 'block' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" aria-label="Find a student" placeholder="Name, roll no., father" style={{ paddingLeft: 28 }} value={q} onChange={(e) => setQ(e.target.value)} />
            </span>
          </label>
        </div>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
          <Stat label="Students" value={all.length} />
          <Stat label="Collected" value={money(sum(all, (r) => r.totals.paid))} tone="#166534" />
          <Stat label="Balance (with earlier dues)" value={money(sum(all, (r) => r.totals.balance))} tone="#991B1B" />
          <Stat label="Students with fees pending" value={counts.pending} tone={counts.pending ? '#991B1B' : undefined} onClick={() => setShow('pending')} />
          <Stat label="3 or more months pending" value={counts.three} tone={counts.three ? '#991B1B' : undefined} onClick={() => setShow('3')} />
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading the register…</div>}
        {isError && <div role="alert" style={{ padding: 24, color: '#991B1B' }}>{error?.response?.data?.message || 'Could not load the register.'}</div>}
        {data?.truncated && <div role="alert" style={{ padding: '10px 14px', background: '#FEF3C7', color: '#92400E', fontSize: 13 }}>Only the first 3,000 students are shown. Choose a class to see the rest.</div>}
        {data && !rows.length && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            {all.length ? `No student matches "${showLabel}"${needle ? ' and the search' : ''}.` : 'No active students in this class.'}
          </div>
        )}
        {rows.length > 0 && (
          <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
            <table aria-label="Fee register" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, tableLayout: 'fixed', width: W.n + W.roll + W.name + months.length * W.month + W.pend + (anyEarlier ? W.early : 0) + W.bal }}>
              <colgroup>
                <col style={{ width: W.n }} /><col style={{ width: W.roll }} /><col style={{ width: W.name }} />
                {months.map((m) => <col key={m} style={{ width: W.month }} />)}
                <col style={{ width: W.pend }} />{anyEarlier && <col style={{ width: W.early }} />}<col style={{ width: W.bal }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...th, ...stick(0), zIndex: 3 }}>#</th>
                  <th style={{ ...th, ...stick(W.n), zIndex: 3 }}>Roll No.</th>
                  <th style={{ ...th, ...stick(W.n + W.roll), textAlign: 'left', zIndex: 3, boxShadow: 'inset -1px 0 0 #CBD5E1' }}>Student</th>
                  {months.map((m) => (
                    <th key={m} style={th}>{monthTitle(m, { year: false })}<div style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)' }}>{m.slice(0, 4)}</div></th>
                  ))}
                  <th style={{ ...th, whiteSpace: 'normal', lineHeight: 1.2 }}>Months pending</th>
                  {anyEarlier && <th style={{ ...th, whiteSpace: 'normal', lineHeight: 1.2 }}>Earlier dues</th>}
                  <th style={{ ...th, textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => [
                  groups.length > 1 || cls === 'all' ? (
                    <tr key={`g-${g.title}`}>
                      <td colSpan={3} style={{ ...td, ...stick(0), background: '#EEF2FF', fontWeight: 800, color: '#1E3A8A', zIndex: 1 }}>{g.title} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {g.rows.length} student{g.rows.length === 1 ? '' : 's'}</span></td>
                      <td colSpan={months.length + (anyEarlier ? 3 : 2)} style={{ ...td, background: '#EEF2FF' }} />
                    </tr>
                  ) : null,
                  ...g.rows.map((r, n) => (
                    <tr key={r.student.id}>
                      <td style={{ ...td, ...stick(0), textAlign: 'center', color: 'var(--text-muted)' }}>{n + 1}</td>
                      <td style={{ ...td, ...stick(W.n), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.student.rollNo || ''}>{r.student.rollNo || '—'}</td>
                      <td style={{ ...td, ...stick(W.n + W.roll), boxShadow: 'inset -1px 0 0 #CBD5E1', overflowWrap: 'anywhere' }}>
                        <button type="button" onClick={() => collect(r.student)} title="Open in Collect Fee"
                          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12.5 }}>
                          {r.student.name}
                        </button>
                        {r.student.fatherName && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.student.fatherName}</div>}
                      </td>
                      {r.cells.map((c) => {
                        const look = lookOf(c);
                        const empty = !c.bills.length;
                        return (
                          <td key={c.month} style={{ ...td, padding: 2, textAlign: 'center' }}>
                            <button type="button" data-state={c.state} disabled={empty}
                              onClick={() => setOpen({ row: r, cell: c })}
                              title={`${monthTitle(c.month, { short: false })}: ${look.label}${c.lastPaidOn ? `, collected ${dmy(c.lastPaidOn)}` : ''}${c.due ? `, balance ${money(c.due)}` : ''}`}
                              style={{
                                width: '100%', minHeight: 30, border: `1px solid ${look.bd}`, borderRadius: 5, background: look.bg, color: look.fg,
                                fontSize: 11.5, fontWeight: c.state === 'none' || c.state === 'upcoming' ? 400 : 700, cursor: empty ? 'default' : 'pointer',
                                outline: c.current ? '2px solid var(--primary)' : 'none', outlineOffset: -1, whiteSpace: 'nowrap', padding: '2px 3px',
                              }}>
                              {cellText(c) || ' '}
                            </button>
                          </td>
                        );
                      })}
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: r.totals.pendingMonths ? '#991B1B' : 'var(--text-muted)' }}>{r.totals.pendingMonths || '—'}</td>
                      {anyEarlier && <td style={{ ...td, textAlign: 'right', color: r.totals.earlierDue ? '#92400E' : 'var(--text-muted)' }}>{r.totals.earlierDue ? rs(r.totals.earlierDue) : '—'}</td>}
                      <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: r.totals.balance ? '#991B1B' : '#166534' }}>{money(r.totals.balance)}</td>
                    </tr>
                  )),
                ])}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ ...tf, ...stick(0), zIndex: 1 }}>Collected</td>
                  {months.map((m, i) => { const v = sum(rows, (r) => r.cells[i].paid); return <td key={m} style={{ ...tf, textAlign: 'center', color: '#166534' }}>{v ? rs(v) : ''}</td>; })}
                  <td style={tf} />{anyEarlier && <td style={tf} />}
                  <td style={{ ...tf, textAlign: 'right', color: '#166534' }}>{money(sum(rows, (r) => r.totals.paid))}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ ...tf, ...stick(0), zIndex: 1 }}>Balance</td>
                  {months.map((m, i) => { const v = sum(rows, (r) => r.cells[i].due); return <td key={m} style={{ ...tf, textAlign: 'center', color: '#991B1B' }}>{v ? rs(v) : ''}</td>; })}
                  <td style={tf} />{anyEarlier && <td style={{ ...tf, textAlign: 'right', color: '#92400E' }}>{rs(sum(rows, (r) => r.totals.earlierDue))}</td>}
                  <td style={{ ...tf, textAlign: 'right', color: '#991B1B' }}>{money(sum(rows, (r) => r.totals.balance))}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ ...tf, ...stick(0), zIndex: 1 }}>Students paid / billed</td>
                  {months.map((m, i) => {
                    const billed = rows.filter((r) => r.cells[i].bills.length).length;
                    return <td key={m} style={{ ...tf, textAlign: 'center' }}>{billed ? `${rows.filter((r) => r.cells[i].state === 'paid').length}/${billed}` : ''}</td>;
                  })}
                  <td style={tf} />{anyEarlier && <td style={tf} />}<td style={tf} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '10px 14px', fontSize: 11.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
            <span><b style={{ color: STATE_LOOK.paid.fg }}>✓ 05/09</b> paid, with the day collected</span>
            <span><b style={{ color: STATE_LOOK.partial.fg }}>P 1,500</b> part paid, balance shown</span>
            <span><b style={{ color: STATE_LOOK.unpaid.fg }}>2,500</b> unpaid</span>
            <span><b style={{ color: STATE_LOOK.due.fg }}>2,500</b> due, not late yet</span>
            <span>— not billed</span>
            <span>Click a month for its details, or a name to collect the fee.</span>
          </div>
        )}
      </div>

      {open && <MonthDetails row={open.row} cell={open.cell} onClose={() => setOpen(null)} onCollect={() => collect(open.row.student)} />}
    </div>
  );
}

function MonthDetails({ row, cell, onClose, onCollect }) {
  const look = lookOf(cell);
  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="fee-month-title" onClick={(e) => e.stopPropagation()} style={{ padding: 0, width: '100%', maxWidth: 660 }}>
        <div className="card-header" style={{ borderRadius: '8px 8px 0 0' }}>
          <div>
            <div id="fee-month-title" className="modal-title">{row.student.name} — {monthTitle(cell.month, { short: false })}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {[row.student.className, row.student.sectionName].filter(Boolean).join(' — ')}{row.student.rollNo ? ` · Roll ${row.student.rollNo}` : ''}
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} autoFocus style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ alignSelf: 'flex-start', background: look.bg, color: look.fg, border: `1px solid ${look.bd}`, borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{look.label}</span>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: 'var(--text-secondary)', fontSize: 12 }}>
                  <th style={dth}>Fee</th><th style={{ ...dth, textAlign: 'right' }}>Amount</th><th style={{ ...dth, textAlign: 'right' }}>Discount</th><th style={{ ...dth, textAlign: 'right' }}>Paid</th><th style={{ ...dth, textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {cell.bills.map((b) => (
                  <tr key={b.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                    <td style={dtd}><b>{b.feeTitle}</b>{b.voucherNo ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Voucher {b.voucherNo}</div> : null}</td>
                    <td style={{ ...dtd, textAlign: 'right' }}>{money(Number(b.totalAmount) + Number(b.lateFee || 0))}</td>
                    <td style={{ ...dtd, textAlign: 'right' }}>{b.discount ? money(b.discount) : '—'}</td>
                    <td style={{ ...dtd, textAlign: 'right', color: '#166534' }}>{money(b.paidAmount)}</td>
                    <td style={{ ...dtd, textAlign: 'right', fontWeight: 700, color: b.dueAmount > 0 ? '#991B1B' : '#166534' }}>{money(b.dueAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Collected</div>
            {cell.payments.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing collected for this month yet.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                {cell.payments.map((p) => (
                  <li key={p.id}><b>{dmy(p.day)}</b> — {money(p.amountPaid)}{p.discount ? ` (+ ${money(p.discount)} discount)` : ''}, {p.method || 'cash'}{p.receiptNo ? `, receipt ${p.receiptNo}` : ''}</li>
                ))}
              </ul>
            )}
          </div>
          {row.totals.balance > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 10px' }}>
              <AlertTriangle size={15} /> In all, {row.totals.pendingMonths} month{row.totals.pendingMonths === 1 ? '' : 's'} pending this period; balance {money(row.totals.balance)}.
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-success" onClick={onCollect}><DollarSign size={14} /> {row.totals.balance > 0 ? 'Collect fee' : 'Open in Collect Fee'}</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="card"
      style={{ padding: '12px 14px', textAlign: 'left', border: '1px solid var(--border-light)', cursor: onClick ? 'pointer' : 'default', background: '#fff' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tone || 'var(--text-primary)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </Tag>
  );
}

const dth = { padding: '7px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' };
const dtd = { padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'top' };
const lab = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' };
const th = { position: 'sticky', top: 0, zIndex: 2, background: '#F1F5F9', color: '#1E293B', fontSize: 11.5, fontWeight: 700, padding: '7px 6px', borderBottom: '1px solid #CBD5E1', textAlign: 'center', whiteSpace: 'nowrap' };
const td = { padding: '5px 6px', borderBottom: '1px solid #E2E8F0', background: '#fff', verticalAlign: 'middle' };
const tf = { padding: '6px', borderTop: '1px solid #CBD5E1', background: '#F8FAFC', fontWeight: 700, fontSize: 11.5, whiteSpace: 'nowrap' };
const stick = (left) => ({ position: 'sticky', left, zIndex: 1 });
/* Column widths in px (the table is laid out with exactly these). */
const W = { n: 34, roll: 92, name: 176, month: 64, pend: 66, early: 80, bal: 96 };
