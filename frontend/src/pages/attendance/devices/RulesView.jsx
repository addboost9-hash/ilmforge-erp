/**
 * Rules: late times and the check-out gap, auto-absent for students who did
 * not come, staff shifts (who works which) and the late rule for payroll.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/client';
import { Clock, UserX, Briefcase, Plus, Trash2, Play, Undo2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Section, errText, hint, smallSelect } from './shared';

const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
const useSave = (onOk) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.put('/biometric/settings', body),
    onSuccess: () => { toast.success('Saved.'); qc.invalidateQueries({ queryKey: ['attendance-device-settings'] }); qc.invalidateQueries({ queryKey: ['bio-timesheet'] }); onOk?.(); },
    onError: (e) => toast.error(errText(e, 'It could not be saved.'), { duration: 7000 }),
  });
};

function DayChips({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {DAYS.map(([n, l]) => {
        const on = value.includes(n);
        return (
          <button key={n} type="button" disabled={disabled} aria-pressed={on} onClick={() => onChange(on ? value.filter((d) => d !== n) : [...value, n].sort())}
            style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${on ? '#0D9488' : '#CBD5E1'}`, background: on ? '#CCFBF1' : '#fff', color: on ? '#115E59' : '#64748B', fontSize: 12, fontWeight: 700, cursor: disabled ? 'default' : 'pointer' }}>{l}</button>
        );
      })}
    </div>
  );
}

function BasicRules({ rules, isAdmin }) {
  const [form, setForm] = useState(null);
  const r = form || { lateAfter: rules.lateAfter || '', staffLateAfter: rules.staffLateAfter || '', gapMinutes: rules.gapMinutes || 30, timeZone: rules.timeZone || '+05:00' };
  const save = useSave(() => setForm(null));
  return (
    <Section title="Late times and check-out" icon={Clock}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
        <label className="form-group" style={{ margin: 0 }}><span className="form-label">Students late after</span>
          <input type="time" className="form-input" disabled={!isAdmin} value={r.lateAfter} onChange={(e) => setForm({ ...r, lateAfter: e.target.value })} /></label>
        <label className="form-group" style={{ margin: 0 }}><span className="form-label">Staff without a shift late after</span>
          <input type="time" className="form-input" disabled={!isAdmin} value={r.staffLateAfter} onChange={(e) => setForm({ ...r, staffLateAfter: e.target.value })} /></label>
        <label className="form-group" style={{ margin: 0 }}><span className="form-label">Minutes before a second punch is a check-out</span>
          <input type="number" min="5" max="600" className="form-input" disabled={!isAdmin} value={r.gapMinutes} onChange={(e) => setForm({ ...r, gapMinutes: e.target.value })} /></label>
        <label className="form-group" style={{ margin: 0 }}><span className="form-label">Machine clock time zone</span>
          <select className="form-select" disabled={!isAdmin} value={r.timeZone} onChange={(e) => setForm({ ...r, timeZone: e.target.value })}>
            <option value="+05:00">Pakistan (UTC+05:00)</option><option value="+04:00">UTC+04:00 (Gulf)</option><option value="+03:00">UTC+03:00 (Saudi Arabia)</option><option value="+00:00">UTC</option>
          </select></label>
      </div>
      <p style={{ ...hint, margin: '10px 0 0' }}>Leave a late time empty and nobody is marked late. A second punch within the minutes above says "already marked"; after that it is a check-out (staff) or leaving school (students).</p>
      {isAdmin && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-teal" disabled={!form || save.isPending} onClick={() => save.mutate({ ...r, lateAfter: r.lateAfter || null, staffLateAfter: r.staffLateAfter || null, gapMinutes: Number(r.gapMinutes) })}>{save.isPending ? 'Saving…' : 'Save'}</button>
          {form && <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Undo</button>}
        </div>
      )}
    </Section>
  );
}

function AutoAbsent({ rules, classes, isAdmin }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const a = form || rules.autoAbsent;
  const save = useSave(() => { setForm(null); qc.invalidateQueries({ queryKey: ['bio-auto-absent'] }); });
  const { data: st } = useQuery({ queryKey: ['bio-auto-absent'], queryFn: () => api.get('/biometric/auto-absent').then((r) => r.data.data), enabled: isAdmin, refetchInterval: 30000 });
  const done = () => { qc.invalidateQueries({ queryKey: ['bio-auto-absent'] }); qc.invalidateQueries({ queryKey: ['dashboard-alerts'] }); };
  const run = useMutation({
    mutationFn: () => api.post('/biometric/auto-absent/run', {}),
    onSuccess: (r) => { toast.success(r.data.message, { duration: 7000 }); done(); },
    onError: (e) => { toast.error(errText(e, 'Nobody was marked.'), { duration: 9000 }); done(); },
  });
  const [undoAsk, setUndoAsk] = useState(false);
  const undo = useMutation({
    mutationFn: () => api.post('/biometric/auto-absent/undo', {}),
    onSuccess: (r) => { toast.success(r.data.message, { duration: 7000 }); setUndoAsk(false); done(); },
    onError: (e) => toast.error(errText(e, 'It could not be undone.')),
  });
  const all = !a.classIds.length;
  const last = st?.last;
  return (
    <Section title="Auto-absent: students who did not come" icon={UserX}>
      <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
        At the time below, every student with no attendance yet is marked <strong>absent</strong> (or <strong>leave</strong> when a leave is approved), and parents get the same absent message the register sends. A student who punches later becomes present or late.
        <strong> If the machines were silent</strong> (far fewer arrivals than usual), nobody is marked and you are told in the bell.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
          <input type="checkbox" disabled={!isAdmin} checked={a.on} onChange={(e) => setForm({ ...a, on: e.target.checked })} /> Mark absent automatically
        </label>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
          <label className="form-group" style={{ margin: 0 }}><span className="form-label">At</span>
            <input type="time" className="form-input" style={{ width: 'auto' }} disabled={!isAdmin} value={a.at} onChange={(e) => setForm({ ...a, at: e.target.value })} /></label>
          <div><div className="form-label">On</div><DayChips disabled={!isAdmin} value={a.days} onChange={(days) => setForm({ ...a, days })} /></div>
          <label className="form-group" style={{ margin: 0 }}><span className="form-label">Not if arrivals are below</span>
            <select className="form-select" style={smallSelect} disabled={!isAdmin} value={String(a.minShare)} onChange={(e) => setForm({ ...a, minShare: Number(e.target.value) })}>
              <option value="0.2">20% of usual</option><option value="0.3">30% of usual</option><option value="0.5">50% of usual</option><option value="0.7">70% of usual</option>
            </select></label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" disabled={!isAdmin} checked={a.notify} onChange={(e) => setForm({ ...a, notify: e.target.checked })} /> Send parents the absent message</label>
        </div>
        <div>
          <div className="form-label">Classes</div>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, marginRight: 12 }}><input type="checkbox" disabled={!isAdmin} checked={all} onChange={(e) => setForm({ ...a, classIds: e.target.checked ? [] : classes.map((c) => c.id) })} /> All classes</label>
          {!all && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              {classes.map((c) => (
                <label key={c.id} style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 12.5 }}>
                  <input type="checkbox" disabled={!isAdmin} checked={a.classIds.includes(c.id)} onChange={(e) => setForm({ ...a, classIds: e.target.checked ? [...a.classIds, c.id] : a.classIds.filter((x) => x !== c.id) })} /> {c.name}
                </label>
              ))}
            </div>
          )}
          <div style={{ ...hint, marginTop: 4 }}>Choose only the classes that punch on a machine; a class whose teacher marks the register is left to the teacher.</div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-teal" disabled={!form || save.isPending} onClick={() => save.mutate({ autoAbsent: a })}>{save.isPending ? 'Saving…' : 'Save'}</button>
            {form && <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Undo changes</button>}
          </div>
        )}
        {isAdmin && st && (
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
              {last ? (last.ok
                ? <><CheckCircle2 size={15} color="#16A34A" /> Today: {last.undone !== undefined ? `undone (${last.undone} taken back)` : `${last.marked} marked absent${last.leave ? `, ${last.leave} on leave` : ''}`} at {new Date(last.at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}.</>
                : <><AlertTriangle size={15} color="#B45309" /> Today: not run. {last.reason}</>)
                : <span style={hint}>{a.on ? `Today: runs at ${a.at}.` : 'Off.'}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn btn-sm btn-outline" disabled={run.isPending} onClick={() => run.mutate()}><Play size={13} /> Run now</button>
              {st.autoToday > 0 && !undoAsk && <button type="button" className="btn btn-sm btn-outline" onClick={() => setUndoAsk(true)}><Undo2 size={13} /> Undo today ({st.autoToday})</button>}
              {undoAsk && (
                <>
                  <span style={{ fontSize: 12.5 }}>Take back today's automatic marks? Messages already sent cannot be taken back.</span>
                  <button type="button" className="btn btn-sm btn-teal" disabled={undo.isPending} onClick={() => undo.mutate()}>Yes, undo</button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setUndoAsk(false)}>Cancel</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

const NEW_SHIFT = { name: '', start: '08:00', end: '14:00', graceIn: 10, graceOut: 10, halfDayMin: 0, overtimeAfter: 0, days: [1, 2, 3, 4, 5, 6] };

function Shifts({ rules, isAdmin }) {
  const [list, setList] = useState(null);
  const [def, setDef] = useState(undefined);
  const shifts = list || rules.shifts;
  const defaultShift = def === undefined ? rules.defaultShift || '' : def;
  const save = useSave(() => { setList(null); setDef(undefined); });
  const edit = (i, patch) => setList(shifts.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const nextId = () => { let n = shifts.length + 1; while (shifts.some((s) => s.id === `s${n}`)) n++; return `s${n}`; };
  const changed = list !== null || def !== undefined;

  const { data: staff = [] } = useQuery({ queryKey: ['bio-people', 'staff', ''], queryFn: () => api.get('/biometric/people', { params: { type: 'staff' } }).then((r) => r.data.data || []) });
  const [assign, setAssign] = useState({});
  const [bulk, setBulk] = useState('');
  const [q, setQ] = useState('');
  const shownStaff = useMemo(() => staff.filter((s) => !q.trim() || [s.name, s.className, s.sectionName, s.rollNo].some((v) => String(v || '').toLowerCase().includes(q.trim().toLowerCase()))), [staff, q]);
  const current = (id) => (assign[id] !== undefined ? assign[id] : rules.staffShifts?.[id] || '');
  const saveAssign = useSave(() => setAssign({}));
  const nameOf = (id) => rules.shifts.find((s) => s.id === id)?.name;

  return (
    <Section title="Staff shifts" icon={Briefcase}>
      <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
        A shift sets when staff are late (after the start and the grace minutes), leave early, work a half day or overtime. These show on the staff timesheet. Shifts past midnight are not supported.
      </p>
      <div className="table-wrap">
        <table className="data-table" style={{ fontSize: 12.5 }}>
          <thead><tr><th>Name</th><th>Start</th><th>End</th><th title="Late after the start plus these minutes">Grace in</th><th title="Early when leaving more than these minutes before the end">Grace out</th><th title="Half day when worked less than this many hours (0 = off)">Half day under (h)</th><th title="Overtime when leaving more than these minutes after the end (0 = off)">Overtime after (min)</th><th>Days</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {shifts.map((s, i) => (
              <tr key={s.id}>
                <td><input className="form-input" style={{ minWidth: 120 }} disabled={!isAdmin} value={s.name} onChange={(e) => edit(i, { name: e.target.value })} aria-label="Shift name" placeholder="Teachers" /></td>
                <td><input type="time" className="form-input" disabled={!isAdmin} value={s.start} onChange={(e) => edit(i, { start: e.target.value })} aria-label="Start" /></td>
                <td><input type="time" className="form-input" disabled={!isAdmin} value={s.end} onChange={(e) => edit(i, { end: e.target.value })} aria-label="End" /></td>
                <td><input type="number" min="0" max="180" className="form-input" style={{ width: 70 }} disabled={!isAdmin} value={s.graceIn} onChange={(e) => edit(i, { graceIn: e.target.value })} aria-label="Grace in" /></td>
                <td><input type="number" min="0" max="180" className="form-input" style={{ width: 70 }} disabled={!isAdmin} value={s.graceOut} onChange={(e) => edit(i, { graceOut: e.target.value })} aria-label="Grace out" /></td>
                <td><input type="number" min="0" max="12" step="0.5" className="form-input" style={{ width: 70 }} disabled={!isAdmin} value={s.halfDayMin ? s.halfDayMin / 60 : 0} onChange={(e) => edit(i, { halfDayMin: Math.round(Number(e.target.value || 0) * 60) })} aria-label="Half day under hours" /></td>
                <td><input type="number" min="0" max="600" className="form-input" style={{ width: 80 }} disabled={!isAdmin} value={s.overtimeAfter} onChange={(e) => edit(i, { overtimeAfter: e.target.value })} aria-label="Overtime after minutes" /></td>
                <td><DayChips disabled={!isAdmin} value={s.days} onChange={(days) => edit(i, { days })} /></td>
                {isAdmin && <td><button type="button" className="btn btn-sm btn-outline" aria-label={`Delete ${s.name || 'shift'}`} onClick={() => setList(shifts.filter((_, j) => j !== i))}><Trash2 size={12} /></button></td>}
              </tr>
            ))}
            {!shifts.length && <tr><td colSpan={9} style={hint}>No shifts yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setList([...shifts, { ...NEW_SHIFT, id: nextId(), name: shifts.length ? '' : 'Teachers' }])}><Plus size={13} /> Add a shift</button>
          <label style={{ fontSize: 12.5 }}>Everyone not given a shift: <select className="form-select" style={smallSelect} value={defaultShift} onChange={(e) => setDef(e.target.value)} aria-label="Default shift">
            <option value="">No shift (staff late time)</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
          </select></label>
          <button type="button" className="btn btn-sm btn-teal" disabled={!changed || save.isPending} onClick={() => save.mutate({ shifts: shifts.map((s) => ({ ...s, graceIn: Number(s.graceIn), graceOut: Number(s.graceOut), overtimeAfter: Number(s.overtimeAfter) })), defaultShift: defaultShift || null })}>{save.isPending ? 'Saving…' : 'Save shifts'}</button>
          {changed && <button type="button" className="btn btn-sm btn-outline" onClick={() => { setList(null); setDef(undefined); }}>Undo</button>}
        </div>
      )}

      {rules.shifts.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Who works which shift</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <input className="form-input" style={{ maxWidth: 220 }} placeholder="Name, designation" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search staff" />
            {isAdmin && (
              <>
                <select className="form-select" style={smallSelect} value={bulk} onChange={(e) => setBulk(e.target.value)} aria-label="Shift for everyone shown">
                  <option value="">Give everyone shown…</option><option value="default">the usual (default)</option><option value="none">no shift</option>{rules.shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" className="btn btn-sm btn-outline" disabled={!bulk} onClick={() => { const v = bulk === 'default' ? '' : bulk; setAssign({ ...assign, ...Object.fromEntries(shownStaff.map((s) => [s.id, v])) }); setBulk(''); }}>Apply</button>
                <button type="button" className="btn btn-sm btn-teal" disabled={!Object.keys(assign).length || saveAssign.isPending} onClick={() => saveAssign.mutate({ staffShifts: assign })}>{saveAssign.isPending ? 'Saving…' : `Save ${Object.keys(assign).length || ''} change${Object.keys(assign).length === 1 ? '' : 's'}`}</button>
              </>
            )}
          </div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: 12.5 }}>
              <thead><tr><th>Staff</th><th>Designation</th><th>Shift</th></tr></thead>
              <tbody>
                {shownStaff.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{[s.className, s.sectionName].filter(Boolean).join(' — ')}</td>
                    <td>
                      <select className="form-select" style={{ ...smallSelect, background: assign[s.id] !== undefined ? '#FEF9C3' : undefined }} disabled={!isAdmin} value={current(s.id)} onChange={(e) => setAssign({ ...assign, [s.id]: e.target.value })} aria-label={`Shift of ${s.name}`}>
                        <option value="">{rules.defaultShift ? `Usual (${nameOf(rules.defaultShift)})` : 'Usual (no shift)'}</option>
                        <option value="none">No shift</option>
                        {rules.shifts.map((x) => <option key={x.id} value={x.id}>{x.name} {x.start}–{x.end}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {!shownStaff.length && <tr><td colSpan={3} style={hint}>No staff found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  );
}

function LateRule({ rules, isAdmin }) {
  const [form, setForm] = useState(null);
  const r = form || { lates: rules.lateRule?.lates || '', days: rules.lateRule?.days || 1 };
  const save = useSave(() => setForm(null));
  return (
    <Section title="Late rule for payroll" icon={Clock}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
        Every <input type="number" min="1" max="31" className="form-input" style={{ width: 70 }} disabled={!isAdmin} value={r.lates} onChange={(e) => setForm({ ...r, lates: e.target.value })} aria-label="Lates" placeholder="3" />
        lates count as <select className="form-select" style={smallSelect} disabled={!isAdmin} value={String(r.days)} onChange={(e) => setForm({ ...r, days: Number(e.target.value) })} aria-label="Days">
          <option value="0.5">half a day</option><option value="1">1 day</option><option value="2">2 days</option>
        </select>
        {isAdmin && <button type="button" className="btn btn-sm btn-teal" disabled={!form || save.isPending} onClick={() => save.mutate({ lateRule: r.lates ? { lates: Number(r.lates), days: Number(r.days) } : null })}>Save</button>}
      </div>
      <p style={{ ...hint, marginBottom: 0 }}>Shown on the staff timesheet as "Lates as days" for whoever makes the salaries. Leave it empty for none. Salaries are not changed by it.</p>
    </Section>
  );
}

export default function RulesView({ isAdmin, classes }) {
  const { data: rules, isLoading } = useQuery({ queryKey: ['attendance-device-settings'], queryFn: () => api.get('/biometric/settings').then((r) => r.data.data) });
  if (isLoading || !rules) return <div className="loading-center"><div className="spinner" /></div>;
  return (
    <>
      <AutoAbsent rules={rules} classes={classes} isAdmin={isAdmin} />
      <Shifts rules={rules} isAdmin={isAdmin} />
      <BasicRules rules={rules} isAdmin={isAdmin} />
      <LateRule rules={rules} isAdmin={isAdmin} />
    </>
  );
}
