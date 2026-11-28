/* Machines: the school's machines (any make), adding one, a test punch, today's punches. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { Fingerprint, Plus, Monitor, Globe, PlayCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import MachineCard from './MachineCard';
import AddMachine from './AddMachine';
import { ZkSetup } from './setup';
import { Section, ago, timeOf, errText } from './shared';

export default function MachinesView({ isAdmin, classes }) {
  const qc = useQueryClient();
  const { data: conn } = useQuery({ queryKey: ['bio-connection'], queryFn: () => api.get('/biometric/connection').then((r) => r.data.data) });
  const { data: devices = [], isLoading } = useQuery({ queryKey: ['bio-devices'], queryFn: () => api.get('/biometric/devices').then((r) => r.data.data || []), refetchInterval: 5000 });
  const { data: unregistered = [] } = useQuery({
    queryKey: ['bio-unregistered'], queryFn: () => api.get('/biometric/unregistered', { silent: true }).then((r) => r.data.data || []).catch(() => []),
    enabled: isAdmin && conn?.edition === 'desktop', refetchInterval: 10000,
  });
  const { data: punches = [] } = useQuery({ queryKey: ['bio-punches'], queryFn: () => api.get('/biometric/punches').then((r) => r.data.data || []), refetchInterval: 8000 });
  const zk = devices.filter((d) => d.kind === 'zkteco');
  const [showConn, setShowConn] = useState(null);
  // The ZKTeco settings stay open until a ZKTeco machine has called.
  const connOpen = showConn ?? (zk.length > 0 && !zk.some((d) => d.lastSeen));
  // The add-a-machine steps: open, or open for a ZKTeco calling in (its serial filled in).
  const [adding, setAdding] = useState(null);

  const [test, setTest] = useState({ code: '', dir: '', device: '' });
  const [testResult, setTestResult] = useState(null);
  const simulate = useMutation({
    mutationFn: () => api.post('/biometric/simulate', { code: test.code.trim(), direction: test.dir || undefined, deviceId: test.device || undefined }).then((r) => r.data),
    onSuccess: (d) => { setTestResult({ ok: true, ...d.data, message: d.message }); qc.invalidateQueries({ queryKey: ['bio-punches'] }); qc.invalidateQueries({ queryKey: ['bio-devices'] }); },
    onError: (e) => setTestResult({ ok: false, message: errText(e, 'It did not work.') }),
  });


  return (
    <>
      <Section title={`The school's machines${devices.length ? ` (${devices.length})` : ''}`} icon={Fingerprint}
        right={isAdmin && <button type="button" className="btn btn-teal btn-sm" aria-expanded={!!adding} onClick={() => setAdding(adding ? null : {})}><Plus size={14} /> Add machine</button>}>
        {isAdmin && unregistered.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>A machine is trying to connect but is not added yet:</div>
            {unregistered.map((u) => (
              <div key={u.serial} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{u.serial}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>from {u.ip} · {ago(u.lastSeen)}</span>
                <button type="button" className="btn btn-sm btn-teal" onClick={() => setAdding({ kind: 'zkteco', name: 'Fingerprint machine', serialNo: u.serial })}>Add this machine</button>
              </div>
            ))}
          </div>
        )}
        {adding && isAdmin && <AddMachine key={adding.serialNo || 'new'} conn={conn} preset={adding.kind ? adding : null} onClose={() => setAdding(null)} />}
        {isLoading ? <div className="loading-center"><div className="spinner" /></div> : devices.length === 0 ? (
          <div className="empty-state" style={{ padding: '18px 0' }}>
            <div className="empty-state-icon"><Fingerprint size={34} color="#94A3B8" /></div>
            <div className="empty-state-text">No machine added yet</div>
            <div className="empty-state-sub">Add a machine of any make: ZKTeco, Hikvision, another make that can send to a web address, or any machine's USB file. Until then you can try everything with the test punch below.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: 14, alignItems: 'start' }}>
            {devices.map((d) => <MachineCard key={d.id} d={d} isAdmin={isAdmin} classes={classes} conn={conn} />)}
          </div>
        )}
      </Section>

      <Section title="What to type into a ZKTeco machine" icon={conn?.edition === 'desktop' ? Monitor : Globe}
        right={<button type="button" className="btn btn-outline btn-sm" aria-expanded={connOpen} onClick={() => setShowConn(!connOpen)}>{connOpen ? <>Hide <ChevronUp size={13} /></> : <>Show <ChevronDown size={13} /></>}</button>}>
        {connOpen ? <ZkSetup conn={conn} /> : <div style={{ fontSize: 12, color: '#64748B' }}>For a ZKTeco's Cloud Server Setting. Other makes: each card's <strong>How to connect</strong>.</div>}
      </Section>

      <Section title="Try it: a test punch without a machine" icon={PlayCircle}>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
          Open the <Link to="/attendance/barcode">Attendance Kiosk</Link> on this or another computer, then press <strong>Punch</strong> here: the kiosk shows the pop-up with the photo, exactly as for a real finger. It is saved in the register like any mark.
        </p>
        {isAdmin ? (
          <form onSubmit={(e) => { e.preventDefault(); if (test.code.trim()) simulate.mutate(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="form-input" style={{ maxWidth: 260, fontFamily: 'monospace' }} value={test.code} onChange={(e) => setTest({ ...test, code: e.target.value })} placeholder="Device ID, roll no or employee code" aria-label="Who" />
            <select aria-label="In or out" className="form-select" style={{ width: 'auto' }} value={test.dir} onChange={(e) => setTest({ ...test, dir: e.target.value })}>
              <option value="">In or out by the time (as the machine does)</option><option value="in">Arriving</option><option value="out">Leaving</option>
            </select>
            {devices.length > 0 && (
              <select aria-label="As if from" className="form-select" style={{ width: 'auto' }} value={test.device} onChange={(e) => setTest({ ...test, device: e.target.value })}>
                <option value="">No machine</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <button type="submit" className="btn btn-teal" disabled={simulate.isPending || !test.code.trim()}><Fingerprint size={15} /> {simulate.isPending ? 'Punching…' : 'Punch'}</button>
          </form>
        ) : <div style={{ fontSize: 13, color: '#64748B' }}>The administrator can make test punches.</div>}
        {testResult && (
          <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: 12, marginBottom: 0 }}>
            {testResult.ok ? <><strong>{testResult.person?.name}</strong> ({testResult.person?.className}) — {testResult.message}</> : testResult.message}
          </div>
        )}
      </Section>

      <Section title={`Today's punches (${punches.length})`} icon={RefreshCw}>
        {punches.length === 0 ? <div style={{ fontSize: 13, color: '#64748B' }}>No punches or scans yet today.</div> : (
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Time</th><th>Name</th><th>Class / Designation</th><th>How</th><th>In / Out</th><th>Machine</th></tr></thead>
              <tbody>
                {punches.map((p) => (
                  <tr key={p.id} style={p.matched === false ? { background: '#FFFBEB' } : undefined}>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{timeOf(p.punchTime)}</td>
                    <td style={{ fontWeight: 600 }}>{p.person?.name}</td>
                    <td style={{ fontSize: 12.5 }}>{[p.person?.className, p.person?.sectionName].filter(Boolean).join(' — ')}</td>
                    <td style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{p.method}</td>
                    <td><span className={`badge ${p.matched === false ? 'badge-yellow' : p.direction === 'out' ? 'badge-purple' : p.direction === 'again' ? 'badge-blue' : 'badge-green'}`}>{p.matched === false ? 'Waiting' : p.direction === 'out' ? 'Out' : p.direction === 'again' ? 'Again' : 'In'}</span></td>
                    <td style={{ fontSize: 12.5 }}>{p.deviceName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
