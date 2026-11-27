/* Machines: how to connect one, the school's machines, a test punch, today's punches. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/client';
import { Fingerprint, Plus, Monitor, Globe, AlertTriangle, PlayCircle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import MachineCard from './MachineCard';
import { Section, ago, timeOf, copy, errText, hint } from './shared';

function Field({ label, value, mono = true, copyable = true }) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', fontFamily: mono ? 'monospace' : 'inherit', overflowWrap: 'anywhere' }}>{value}</span>
        {copyable && value !== '' && value !== undefined && <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px' }} title="Copy" onClick={() => copy(value)}><Copy size={12} /></button>}
      </div>
    </div>
  );
}

function Connection({ conn }) {
  if (!conn) return <div className="loading-center"><div className="spinner" /></div>;
  if (conn.edition === 'desktop') {
    if (!conn.lanOn) return <div className="alert alert-warning" style={{ display: 'flex', gap: 8 }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{conn.note}</span></div>;
    return (
      <>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>On the machine: <strong>Menu → Comm. → Cloud Server Setting</strong> (some models: <strong>ADMS</strong>). Turn <strong>Enable Domain Name</strong> and <strong>HTTPS</strong> off, then enter:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <Field label="Server address" value={conn.addresses[0] || '—'} />
          <Field label="Server port" value={conn.port} />
          <Field label="HTTPS / SSL" value="Off" mono={false} copyable={false} />
        </div>
        {conn.addresses.length > 1 && <p style={{ ...hint, marginBottom: 0 }}>This computer has more than one network address: {conn.addresses.join(', ')}. Use the one on the same network as the machine (usually 192.168.x.x).</p>}
        <p style={{ ...hint, marginBottom: 0 }}>Keep IlmForge open on this computer. Give this computer a fixed address in the router (DHCP reservation) so the machine always finds it, and allow IlmForge in Windows Firewall for private networks.</p>
      </>
    );
  }
  return (
    <>
      <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>On the machine: <strong>Menu → Comm. → Cloud Server Setting</strong> (some models: <strong>ADMS</strong>). Turn <strong>Enable Domain Name</strong> on and <strong>HTTPS</strong> on, then enter:</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <Field label="Server address (domain)" value={conn.host} />
        <Field label="Server port" value={conn.port} />
        <Field label="HTTPS / SSL" value={conn.https ? 'On' : 'Off'} mono={false} copyable={false} />
      </div>
      <p style={{ ...hint, marginBottom: 0 }}>{conn.note} A machine that cannot use HTTPS works with the IlmForge desktop app on the school's own computer instead (see the guide).</p>
    </>
  );
}

export default function MachinesView({ isAdmin, classes }) {
  const qc = useQueryClient();
  const { data: conn } = useQuery({ queryKey: ['bio-connection'], queryFn: () => api.get('/biometric/connection').then((r) => r.data.data) });
  const { data: devices = [], isLoading } = useQuery({ queryKey: ['bio-devices'], queryFn: () => api.get('/biometric/devices').then((r) => r.data.data || []), refetchInterval: 5000 });
  const { data: unregistered = [] } = useQuery({
    queryKey: ['bio-unregistered'], queryFn: () => api.get('/biometric/unregistered', { silent: true }).then((r) => r.data.data || []).catch(() => []),
    enabled: isAdmin && conn?.edition === 'desktop', refetchInterval: 10000,
  });
  const { data: punches = [] } = useQuery({ queryKey: ['bio-punches'], queryFn: () => api.get('/biometric/punches').then((r) => r.data.data || []), refetchInterval: 8000 });
  const anyConnected = devices.some((d) => d.lastSeen);
  const [showConn, setShowConn] = useState(null);
  const connOpen = showConn ?? !anyConnected;

  const EMPTY = { name: '', serialNo: '', location: '' };
  const [form, setForm] = useState(EMPTY);
  const [showAdd, setShowAdd] = useState(false);
  const add = useMutation({
    mutationFn: (d) => api.post('/biometric/devices', d),
    onSuccess: (r) => { toast.success(r.data?.message || 'Added'); setForm(EMPTY); setShowAdd(false); qc.invalidateQueries({ queryKey: ['bio-devices'] }); qc.invalidateQueries({ queryKey: ['bio-unregistered'] }); },
    onError: (e) => toast.error(errText(e, 'It could not be added.')),
  });

  const [test, setTest] = useState({ code: '', dir: '', device: '' });
  const [testResult, setTestResult] = useState(null);
  const simulate = useMutation({
    mutationFn: () => api.post('/biometric/simulate', { code: test.code.trim(), direction: test.dir || undefined, deviceId: test.device || undefined }).then((r) => r.data),
    onSuccess: (d) => { setTestResult({ ok: true, ...d.data, message: d.message }); qc.invalidateQueries({ queryKey: ['bio-punches'] }); qc.invalidateQueries({ queryKey: ['bio-devices'] }); },
    onError: (e) => setTestResult({ ok: false, message: errText(e, 'It did not work.') }),
  });

  const online = devices.filter((d) => d.online).length;

  return (
    <>
      <Section title={`The school's machines${devices.length ? ` (${online} of ${devices.length} connected)` : ''}`} icon={Fingerprint}
        right={isAdmin && <button type="button" className="btn btn-teal btn-sm" onClick={() => setShowAdd((v) => !v)}><Plus size={14} /> Add machine</button>}>
        {isAdmin && unregistered.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>A machine is trying to connect but is not added yet:</div>
            {unregistered.map((u) => (
              <div key={u.serial} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{u.serial}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>from {u.ip} · {ago(u.lastSeen)}</span>
                <button type="button" className="btn btn-sm btn-teal" onClick={() => { setForm({ name: 'Fingerprint machine', serialNo: u.serial, location: '' }); setShowAdd(true); }}>Add this machine</button>
              </div>
            ))}
          </div>
        )}
        {showAdd && isAdmin && (
          <form onSubmit={(e) => { e.preventDefault(); add.mutate(form); }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, alignItems: 'end', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <label className="form-group" style={{ margin: 0 }}><span className="form-label">Name *</span>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main gate" /></label>
            <label className="form-group" style={{ margin: 0 }}><span className="form-label">Serial number *</span>
              <input className="form-input" value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} placeholder="e.g. CQZ7224460123" style={{ fontFamily: 'monospace' }} /></label>
            <label className="form-group" style={{ margin: 0 }}><span className="form-label">Where it is</span>
              <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Staff room" /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-teal" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add'}</button>
              <button type="button" className="btn btn-outline" onClick={() => { setShowAdd(false); setForm(EMPTY); }}>Cancel</button>
            </div>
            <div style={{ gridColumn: '1 / -1', ...hint }}>The serial number is on the machine: <strong>Menu → System Info → Device Info → Serial Number</strong> (also on the sticker on the back).</div>
          </form>
        )}
        {isLoading ? <div className="loading-center"><div className="spinner" /></div> : devices.length === 0 ? (
          <div className="empty-state" style={{ padding: '18px 0' }}>
            <div className="empty-state-icon"><Fingerprint size={34} color="#94A3B8" /></div>
            <div className="empty-state-text">No machine added yet</div>
            <div className="empty-state-sub">Add a machine with its serial number. Until then you can try everything with the test punch below.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: 14, alignItems: 'start' }}>
            {devices.map((d) => <MachineCard key={d.id} d={d} isAdmin={isAdmin} classes={classes} />)}
          </div>
        )}
      </Section>

      <Section title="What to type into the fingerprint machine" icon={conn?.edition === 'desktop' ? Monitor : Globe}
        right={<button type="button" className="btn btn-outline btn-sm" aria-expanded={connOpen} onClick={() => setShowConn(!connOpen)}>{connOpen ? <>Hide <ChevronUp size={13} /></> : <>Show <ChevronDown size={13} /></>}</button>}>
        {connOpen ? <Connection conn={conn} /> : <div style={hint}>Shown again with "Show" when you set up another machine.</div>}
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
