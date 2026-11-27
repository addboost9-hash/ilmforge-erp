/**
 * Staff timesheet: each staff member's month against their shift, with the
 * day-by-day detail and corrections (a reason is required and kept).
 */
import { useState, useMemo, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/client';
import { CalendarClock, Download, Printer, ChevronDown, ChevronRight, Pencil, AlertTriangle } from 'lucide-react';
import { Section, downloadCsv, printPage, esc, errText, hint, fmtMin, pkMonth, smallSelect } from './shared';

const CODE = {
  P: ['Present', '#DCFCE7', '#15803D'], L: ['Late', '#FEF3C7', '#92400E'], HD: ['Half day', '#FFEDD5', '#9A3412'],
  A: ['Absent', '#FEE2E2', '#B91C1C'], LV: ['Leave', '#EDE9FE', '#6D28D9'], H: ['Holiday', '#E0F2FE', '#0369A1'], O: ['Off', '#F1F5F9', '#64748B'],
};
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pkHm = (d) => (d ? new Date(new Date(d).getTime() + 5 * 3600e3).toISOString().slice(11, 16) : '');

function Chip({ code }) {
  if (!code) return <span style={{ color: '#CBD5E1' }}>·</span>;
  const [label, bg, fg] = CODE[code] || [code, '#F1F5F9', '#334155'];
  return <span title={label} style={{ display: 'inline-block', minWidth: 26, textAlign: 'center', padding: '1px 6px', borderRadius: 6, background: bg, color: fg, fontWeight: 800, fontSize: 11.5 }}>{code}</span>;
}

function FixForm({ staff, day, onDone }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ checkIn: pkHm(day.in), checkOut: pkHm(day.out), status: '', reason: '' });
  const save = useMutation({
    mutationFn: () => api.put('/biometric/timesheet', { staffId: staff.id, ymd: day.ymd, checkIn: f.checkIn || null, checkOut: f.checkOut || null, status: f.status || undefined, reason: f.reason }),
    onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries({ queryKey: ['bio-timesheet'] }); onDone(); },
    onError: (e) => toast.error(errText(e, 'It could not be saved.')),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
      <label style={{ fontSize: 12 }}>Arrived<br /><input type="time" className="form-input" style={{ width: 'auto' }} value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></label>
      <label style={{ fontSize: 12 }}>Left<br /><input type="time" className="form-input" style={{ width: 'auto' }} value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></label>
      <label style={{ fontSize: 12 }}>Day<br />
        <select className="form-select" style={smallSelect} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">By the times (shift rules)</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="leave">Leave</option>
        </select></label>
      <label style={{ fontSize: 12, flex: 1, minWidth: 200 }}>Reason (kept in the audit log) *<br /><input className="form-input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. machine was off, came at 8:00" /></label>
      <button type="submit" className="btn btn-sm btn-teal" disabled={save.isPending || f.reason.trim().length < 3}>Save</button>
      <button type="button" className="btn btn-sm btn-outline" onClick={onDone}>Cancel</button>
    </form>
  );
}

function StaffMonth({ s, days }) {
  const [editing, setEditing] = useState(null);
  return (
    <div className="table-wrap" style={{ margin: '4px 0 10px' }}>
      {/* The outer row's hover colour must not fill the whole month. */}
      <style>{'.data-table.ts-days tbody tr td{background:#fff}.data-table.ts-days tbody tr.ts-sun td{background:#F8FAFC}.data-table.ts-days tbody tr:hover td{background:#F1F5F9}.data-table tbody tr:hover td.ts-host{background:#FCFDFE}'}</style>
      <table className="data-table ts-days" style={{ fontSize: 12.5 }}>
        <thead><tr><th>Day</th><th /><th>Arrived</th><th>Left</th><th>Worked</th><th>Late</th><th>Early</th><th>Overtime</th><th>Note</th><th /></tr></thead>
        <tbody>
          {s.days.map((d, i) => {
            const day = days[i];
            const past = !!d.code;
            return (
              <Fragment key={d.ymd}>
                <tr className={day.weekday === 0 ? 'ts-sun' : undefined}>
                  <td style={{ whiteSpace: 'nowrap' }}>{WD[day.weekday]} {day.d}</td>
                  <td><Chip code={d.code} /></td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{pkHm(d.in)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{pkHm(d.out)}{d.missingOut && <span title="No check-out" style={{ color: '#B45309' }}> ?</span>}</td>
                  <td>{fmtMin(d.workedMin)}</td>
                  <td style={{ color: d.lateMin ? '#92400E' : undefined }}>{d.lateMin ? `${d.lateMin} min` : ''}</td>
                  <td style={{ color: d.earlyMin ? '#9A3412' : undefined }}>{d.earlyMin ? `${d.earlyMin} min` : ''}</td>
                  <td>{d.overtimeMin ? `${d.overtimeMin} min` : ''}</td>
                  <td style={{ fontSize: 11.5, color: '#64748B' }}>{d.fixed ? `Corrected: ${d.reason || ''}` : d.before ? 'before attendance was kept' : day.holiday || (d.missingOut ? 'no check-out' : '')}</td>
                  <td>{past && <button type="button" className="btn btn-sm btn-outline" aria-label={`Correct ${day.d}`} onClick={() => setEditing(editing === d.ymd ? null : d.ymd)}><Pencil size={12} /></button>}</td>
                </tr>
                {editing === d.ymd && <tr><td colSpan={10}><FixForm staff={s} day={d} onDone={() => setEditing(null)} /></td></tr>}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TimesheetView() {
  const [month, setMonth] = useState(pkMonth());
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['bio-timesheet', month],
    queryFn: () => api.get('/biometric/timesheet', { params: { month }, silent: true }).then((r) => r.data.data),
  });
  const staff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.staff || []).filter((s) => !q || [s.name, s.empCode, s.designation, s.department].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [data, search]);
  const rule = data?.lateRule;
  const lateDays = (t) => (rule ? Math.floor(t.late / rule.lates) * rule.days : 0);
  const head = ['Staff', 'Code', 'Designation', 'Shift', 'Present', 'Late', 'Late min', 'Half days', 'Left early', 'Early min', 'Absent', 'Leave', 'Hours', 'Overtime', 'No check-out', ...(rule ? [`Lates as days (${rule.lates} = ${rule.days})`] : [])];
  const rowOf = (s) => [s.name, s.empCode, s.designation, s.shift ? `${s.shift.name} ${s.shift.start}-${s.shift.end}` : '', s.totals.present, s.totals.late, s.totals.lateMin, s.totals.halfDay, s.totals.earlyDays, s.totals.earlyMin, s.totals.absent, s.totals.leave, fmtMin(s.totals.workedMin) || '0:00', fmtMin(s.totals.overtimeMin), s.totals.missingOut, ...(rule ? [lateDays(s.totals)] : [])];
  const csv = () => {
    const days = data.days;
    downloadCsv(`staff-timesheet-${month}.csv`, [
      [...head, ...days.map((d) => `${d.d} ${WD[d.weekday]}`)],
      ...staff.map((s) => [...rowOf(s), ...s.days.map((d) => [d.code, d.in ? `${pkHm(d.in)}-${pkHm(d.out) || '?'}` : ''].filter(Boolean).join(' '))]),
    ]);
  };
  const print = () => printPage(`Staff timesheet ${month}`, `
    <p>P present · L late · HD half day · A absent · LV leave · H holiday · O off. Late and early in minutes against each person's shift.</p>
    <table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
    ${staff.map((s) => `<tr>${rowOf(s).map((v, i) => `<td${i > 3 ? ' class="n"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}
    </tbody></table>`);

  return (
    <Section title="Staff timesheet" icon={CalendarClock}
      right={(
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-outline btn-sm" disabled={!staff.length} onClick={csv}><Download size={13} /> CSV (Excel)</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={!staff.length} onClick={print}><Printer size={13} /> Print</button>
        </div>
      )}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 12.5 }}>Month <input type="month" className="form-input" style={{ width: 'auto', display: 'inline-block' }} value={month} max={pkMonth()} onChange={(e) => { setMonth(e.target.value || pkMonth()); setOpen(null); }} /></label>
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Name, code, designation" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search staff" />
        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>{Object.keys(CODE).map((c) => <span key={c} style={{ display: 'inline-flex', gap: 3, alignItems: 'center', fontSize: 11.5, color: '#64748B' }}><Chip code={c} />{CODE[c][0]}</span>)}</span>
      </div>
      {data && !data.staff.some((s) => s.shift) && (
        <div className="alert alert-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><AlertTriangle size={15} /> No shifts yet: late is by the one staff late time, and early leaving and overtime are not counted. Add shifts under Rules.</div>
      )}
      {isError ? <div className="alert alert-danger">{errText(error, 'The timesheet could not be loaded.')}</div> : isLoading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Staff</th><th>Shift</th><th title="Present">P</th><th title="Late (times / minutes)">Late</th><th title="Half days">HD</th><th title="Left early (times / minutes)">Early</th><th title="Absent">A</th><th title="Leave">LV</th><th>Hours</th><th>Overtime</th><th title="Days with no check-out">No out</th>{rule && <th title={`Every ${rule.lates} lates count as ${rule.days} day`}>Lates as days</th>}</tr></thead>
            <tbody>
              {staff.map((s) => (
                <Fragment key={s.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <td style={{ fontWeight: 700 }}>
                      <button type="button" aria-expanded={open === s.id} aria-label={`${s.name}: day by day`} style={{ background: 'none', border: 0, padding: 0, marginRight: 4, cursor: 'pointer', verticalAlign: 'middle' }}>{open === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                      {s.name}<div style={{ ...hint, fontWeight: 400 }}>{[s.empCode, s.designation].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{s.shift ? <>{s.shift.name}<div style={hint}>{s.shift.start}–{s.shift.end}</div></> : <span style={hint}>none</span>}</td>
                    <td>{s.totals.present}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.totals.late}{s.totals.lateMin ? <span style={hint}> / {s.totals.lateMin}m</span> : ''}</td>
                    <td>{s.totals.halfDay || ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.totals.earlyDays || ''}{s.totals.earlyMin ? <span style={hint}> / {s.totals.earlyMin}m</span> : ''}</td>
                    <td style={{ color: s.totals.absent ? '#B91C1C' : undefined, fontWeight: s.totals.absent ? 700 : 400 }}>{s.totals.absent}</td>
                    <td>{s.totals.leave || ''}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMin(s.totals.workedMin) || '0:00'}</td>
                    <td>{fmtMin(s.totals.overtimeMin)}</td>
                    <td style={{ color: s.totals.missingOut ? '#B45309' : undefined }}>{s.totals.missingOut || ''}</td>
                    {rule && <td style={{ fontWeight: 700 }}>{lateDays(s.totals) || ''}</td>}
                  </tr>
                  {open === s.id && <tr><td className="ts-host" colSpan={rule ? 12 : 11} style={{ background: '#FCFDFE' }}><StaffMonth s={s} days={data.days} /></td></tr>}
                </Fragment>
              ))}
              {!staff.length && <tr><td colSpan={12} style={{ color: '#64748B' }}>No staff found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ ...hint, marginBottom: 0, marginTop: 10 }}>A working day in the past with no attendance and no approved leave counts as absent. "Lates as days" is shown for payroll to decide; salaries are not changed by it.</p>
    </Section>
  );
}
