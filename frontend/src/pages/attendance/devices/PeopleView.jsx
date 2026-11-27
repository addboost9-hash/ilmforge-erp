/**
 * People: everyone's Device ID, which machines they are on and how many
 * fingers IlmForge keeps; enrolling a finger from here; and the users on the
 * machines, linked to a student or staff member (an old machine's users).
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/client';
import { Users, Download, Printer, Fingerprint, Link2, Unlink, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { Section, downloadCsv, printPage, esc, errText, hint, smallSelect, FINGERS, dayTimeOf } from './shared';

function Tile({ label, value, of, tone = '#0D9488' }) {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', minWidth: 0, flex: '1 1 140px' }}>
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>{value}{of !== undefined && <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}> / {of}</span>}</div>
    </div>
  );
}

function EnrolRow({ p, devices, onClose }) {
  const ready = devices.filter((d) => d.online && d.isActive);
  const [device, setDevice] = useState(ready[0]?.id || '');
  const [finger, setFinger] = useState(6);
  const go = useMutation({
    mutationFn: () => api.post(`/biometric/devices/${device}/enrol`, { kind: p.kind, personId: p.id, finger }),
    onSuccess: (r) => { toast.success(r.data.message, { duration: 10000 }); onClose(); },
    onError: (e) => toast.error(errText(e, 'It could not be started.'), { duration: 8000 }),
  });
  if (!ready.length) return <div style={{ fontSize: 12.5, color: '#B45309' }}>No machine is connected now. Enrol on the machine itself: Menu → User Mgt. → user {p.devicePin}.</div>;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select aria-label="Machine" className="form-select" style={smallSelect} value={device} onChange={(e) => setDevice(e.target.value)}>
        {ready.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select aria-label="Finger" className="form-select" style={smallSelect} value={finger} onChange={(e) => setFinger(Number(e.target.value))}>
        {FINGERS.map(([n, l]) => <option key={n} value={n}>{l}</option>)}
      </select>
      <button type="button" className="btn btn-sm btn-teal" disabled={go.isPending || !device} onClick={() => go.mutate()}><Fingerprint size={13} /> Start on the machine</button>
      <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Cancel</button>
      <span style={hint}>The machine then asks for the finger three times.</span>
    </div>
  );
}

function PersonFinder({ onPick }) {
  const [q, setQ] = useState('');
  const { data = [], isFetching } = useQuery({
    queryKey: ['bio-people-find', q], enabled: q.trim().length >= 2,
    queryFn: () => api.get('/biometric/people', { params: { search: q.trim() } }).then((r) => (r.data.data || []).slice(0, 8)),
  });
  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <input className="form-input" autoFocus style={{ maxWidth: 320 }} placeholder="Type a name, roll no or employee code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find the person" />
      {q.trim().length >= 2 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {isFetching && <span className="spinner" />}
          {data.map((p) => (
            <button key={`${p.kind}-${p.id}`} type="button" className="btn btn-sm btn-outline" onClick={() => onPick(p)}>
              {p.name} <span style={{ color: '#64748B', fontWeight: 400 }}>· {p.className}{p.rollNo ? ` · ${p.rollNo}` : ''}</span>
            </button>
          ))}
          {!isFetching && !data.length && <span style={hint}>Nobody found.</span>}
        </div>
      )}
    </div>
  );
}

const HOW = { sent: 'put on by IlmForge', auto: 'by its number', manual: 'linked by the office' };

function MachineUsers() {
  const qc = useQueryClient();
  const [show, setShow] = useState('unlinked');
  const [search, setSearch] = useState('');
  const [finding, setFinding] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['bio-machine-users', show, search],
    queryFn: () => api.get('/biometric/machine-users', { params: { show, search: search.trim() || undefined } }).then((r) => r.data),
  });
  const done = () => { qc.invalidateQueries({ queryKey: ['bio-machine-users'] }); qc.invalidateQueries({ queryKey: ['bio-people'] }); qc.invalidateQueries({ queryKey: ['bio-devices'] }); };
  const link = useMutation({
    mutationFn: (b) => api.post('/biometric/machine-users/link', b),
    onSuccess: (r) => { toast.success(r.data.message); setFinding(null); done(); },
    onError: (e) => toast.error(errText(e, 'It could not be linked.')),
  });
  const unlink = useMutation({
    mutationFn: (pin) => api.post('/biometric/machine-users/unlink', { pin }),
    onSuccess: (r) => { toast.success(r.data.message); done(); },
    onError: (e) => toast.error(errText(e, 'It could not be unlinked.')),
  });
  const sure = useMutation({
    mutationFn: () => api.post('/biometric/machine-users/link-sure', {}),
    onSuccess: (r) => { toast.success(r.data.message, { duration: 7000 }); done(); },
    onError: (e) => toast.error(errText(e, 'It did not work.')),
  });
  const list = data?.data || [];
  const counts = data?.counts || {};
  const sureCount = list.filter((u) => u.sure).length;

  return (
    <Section id="machine-users" title="Users on the machines" icon={Link2}
      right={show === 'unlinked' && sureCount > 0 && <button type="button" className="btn btn-sm btn-teal" disabled={sure.isPending} onClick={() => sure.mutate()}><Sparkles size={13} /> Link {sureCount} clear match{sureCount === 1 ? '' : 'es'} by name</button>}>
      <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
        Everyone enrolled on the school's machines, by their user number. People put on by IlmForge are linked already. A machine that had users before IlmForge: use <strong>Get users and fingers</strong> on it, then link each user here once — no need to enrol the fingers again. Punches from a user not linked are kept and marked when you link them.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <div role="tablist" aria-label="Which users" style={{ display: 'inline-flex', border: '1px solid #CBD5E1', borderRadius: 8, overflow: 'hidden' }}>
          {[['unlinked', `Not linked (${counts.unlinked ?? '…'})`], ['linked', `Linked (${counts.linked ?? '…'})`], ['all', 'All']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={show === k} onClick={() => setShow(k)}
              style={{ padding: '6px 12px', border: 0, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: show === k ? '#0D9488' : '#fff', color: show === k ? '#fff' : '#334155' }}>{l}</button>
          ))}
        </div>
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="User no. or name" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users on the machines" />
        {counts.waiting > 0 && <span className="badge badge-yellow">{counts.waiting} punch{counts.waiting === 1 ? '' : 'es'} waiting for a link</span>}
      </div>
      {isLoading ? <div className="spinner" /> : !list.length ? (
        <div style={{ ...hint, display: 'flex', gap: 6, alignItems: 'center' }}><CheckCircle2 size={14} color="#16A34A" /> {show === 'unlinked' ? 'Every user on the machines is linked to someone.' : 'Nobody here yet.'}</div>
      ) : (
        <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>User no.</th><th>Name on the machine</th><th>Machines</th><th>Kept</th><th>Is</th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.pin}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>{u.pin}</td>
                  <td>{u.machineName || <span style={hint}>—</span>}{u.waiting > 0 && <div><span className="badge badge-yellow">{u.waiting} punch{u.waiting === 1 ? '' : 'es'} waiting</span></div>}{u.lastPunchAt && <div style={hint}>last {dayTimeOf(u.lastPunchAt)}</div>}</td>
                  <td style={{ fontSize: 12 }}>{u.machines.join(', ') || '—'}</td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{u.fingers ? `${u.fingers} finger${u.fingers === 1 ? '' : 's'}` : '—'}{u.faces ? ' · face' : ''}</td>
                  <td style={{ minWidth: 260 }}>
                    {u.person ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span><strong>{u.person.name}</strong> <span style={{ fontSize: 12, color: u.person.left ? '#B91C1C' : '#64748B' }}>· {u.person.label}</span><div style={hint}>{HOW[u.linkHow] || ''}</div></span>
                        <button type="button" className="btn btn-sm btn-outline" title="Not this person" onClick={() => unlink.mutate(u.pin)}><Unlink size={12} /> Unlink</button>
                      </div>
                    ) : finding === u.pin ? (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <PersonFinder onPick={(p) => link.mutate({ pin: u.pin, kind: p.kind, personId: p.id })} />
                        <div><button type="button" className="btn btn-sm btn-outline" onClick={() => setFinding(null)}>Cancel</button></div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {(u.suggestions || []).map((s) => (
                          <button key={`${s.kind}-${s.id}`} type="button" className={`btn btn-sm ${u.sure && s === u.suggestions[0] ? 'btn-teal' : 'btn-outline'}`} disabled={link.isPending}
                            title={`By ${s.why}`} onClick={() => link.mutate({ pin: u.pin, kind: s.kind, personId: s.id })}>
                            {s.name} <span style={{ fontWeight: 400, opacity: 0.85 }}>· {s.label} · {s.why} {Math.round(s.score * 100)}%</span>
                          </button>
                        ))}
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => setFinding(u.pin)}><Search size={12} /> Find…</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.total > list.length && <div style={{ ...hint, padding: 8 }}>Showing {list.length} of {data.total}: search to find the others.</div>}
        </div>
      )}
    </Section>
  );
}

export default function PeopleView({ isAdmin, classes }) {
  const [ptype, setPtype] = useState('all');
  const [pclass, setPclass] = useState('');
  const [search, setSearch] = useState('');
  const [noFinger, setNoFinger] = useState(false);
  const [enrolling, setEnrolling] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['bio-people', ptype, pclass],
    queryFn: () => api.get('/biometric/people', { params: { type: ptype, classId: pclass || undefined } }).then((r) => r.data),
  });
  const { data: devices = [] } = useQuery({ queryKey: ['bio-devices'], queryFn: () => api.get('/biometric/devices').then((r) => r.data.data || []), refetchInterval: 15000 });
  const people = data?.data || [];
  const s = data?.summary || {};
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => (!noFinger || !p.fingers) && (!q || [p.name, p.rollNo, p.devicePin, p.className, ...(p.pins || [])].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [people, search, noFinger]);

  const csv = () => downloadCsv('fingerprint-people.csv', [
    ['Device ID', 'Name', 'Type', 'Class / Designation', 'Section / Department', 'Roll no / Employee code', 'Other user numbers', 'On machines', 'Fingers kept', 'Face kept'],
    ...shown.map((p) => [p.devicePin, p.name, p.kind, p.className, p.sectionName, p.rollNo, p.pins.filter((x) => x !== p.devicePin).join(' '), p.machines.join('; '), p.fingers, p.face ? 'yes' : '']),
  ]);
  const print = () => printPage(noFinger ? 'Still to enrol a finger' : 'Fingerprint machine Device IDs', `
    <p>${noFinger ? 'Nobody\'s fingerprint is kept for these people yet: enrol each under the Device ID shown.' : 'Enrol each person\'s finger on the machine under this user number (ID).'}</p>
    <table><thead><tr><th>Device ID</th><th>Name</th><th>Class / Designation</th><th>Roll no / Code</th><th>On machines</th><th>Enrolled ✓</th></tr></thead><tbody>
    ${shown.map((p) => `<tr><td class="mono">${esc(p.devicePin)}</td><td>${esc(p.name)}</td><td>${esc([p.className, p.sectionName].filter(Boolean).join(' — '))}</td><td>${esc(p.rollNo)}</td><td>${esc(p.machines.join(', '))}</td><td>${p.fingers ? '✓' : ''}</td></tr>`).join('')}
    </tbody></table>`);

  return (
    <>
      <Section title="Fingerprints: who is enrolled" icon={Users}
        right={(
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={csv} disabled={!shown.length}><Download size={13} /> CSV</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={print} disabled={!shown.length}><Printer size={13} /> Print list</button>
          </div>
        )}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <Tile label="People" value={s.total ?? '…'} tone="#1E3A5F" />
          <Tile label="On a machine" value={s.onMachine ?? '…'} of={s.total} />
          <Tile label="Fingerprint kept" value={s.withFinger ?? '…'} of={s.total} />
          <Tile label="Face kept" value={s.withFace ?? '…'} of={s.total} tone="#7C3AED" />
        </div>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
          <strong>Kept</strong> means a machine sent IlmForge the fingerprint after it was enrolled: it is backed up, and copied to the school's other machines with <strong>Copy fingers here</strong>.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          <select aria-label="Who" className="form-select" style={{ width: 'auto' }} value={ptype} onChange={(e) => { setPtype(e.target.value); if (e.target.value === 'staff') setPclass(''); }}>
            <option value="all">Students and staff</option><option value="students">Students</option><option value="staff">Staff</option>
          </select>
          {ptype !== 'staff' && (
            <select aria-label="Class" className="form-select" style={{ width: 'auto' }} value={pclass} onChange={(e) => setPclass(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input className="form-input" style={{ maxWidth: 260 }} placeholder="Search name, roll no, Device ID" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search people" />
          <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={noFinger} onChange={(e) => setNoFinger(e.target.checked)} /> No fingerprint kept yet</label>
          <span style={hint}>{shown.length} people</span>
        </div>
        {isLoading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap" style={{ maxHeight: 460, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Device ID</th><th>Name</th><th>Class / Designation</th><th>On machines</th><th>Kept</th>{isAdmin && <th />}</tr></thead>
              <tbody>
                {shown.slice(0, 400).map((p) => {
                  const key = `${p.kind}-${p.id}`;
                  return (
                    <tr key={key}>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#0D9488' }}>{p.devicePin}</span>{p.pins.filter((x) => x !== p.devicePin).map((x) => <div key={x} style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#64748B' }} title="Their number on an old machine">also {x}</div>)}</td>
                      <td style={{ fontWeight: 600 }}>{p.name} {p.kind === 'staff' && <span className="badge badge-purple" style={{ marginLeft: 4 }}>Staff</span>}{p.rollNo && <div style={{ ...hint, fontWeight: 400 }}>{p.rollNo}</div>}</td>
                      <td style={{ fontSize: 12.5 }}>{[p.className, p.sectionName].filter(Boolean).join(' — ')}</td>
                      <td style={{ fontSize: 12.5 }}>{p.machines.join(', ') || <span style={{ color: '#94A3B8' }}>none</span>}</td>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {p.fingers ? <span className="badge badge-green">{p.fingers} finger{p.fingers === 1 ? '' : 's'}</span> : <span style={{ color: '#B45309' }}>no finger</span>}
                        {p.face && <span className="badge badge-purple" style={{ marginLeft: 4 }}>face</span>}
                      </td>
                      {isAdmin && (
                        <td style={{ minWidth: 120 }}>
                          {enrolling === key
                            ? <EnrolRow p={p} devices={devices} onClose={() => setEnrolling(null)} />
                            : <button type="button" className="btn btn-sm btn-outline" onClick={() => setEnrolling(key)}><Fingerprint size={12} /> Enrol</button>}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {shown.length > 400 && <tr><td colSpan={6} style={hint}>Showing 400 of {shown.length}: search or choose a class to see the others (CSV and Print include everyone shown).</td></tr>}
                {!shown.length && <tr><td colSpan={6} style={{ color: '#64748B' }}>Nobody found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {isAdmin && <MachineUsers />}
    </>
  );
}
