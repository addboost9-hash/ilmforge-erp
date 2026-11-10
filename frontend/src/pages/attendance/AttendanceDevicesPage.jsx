/**
 * Fingerprint machines & scanners — set up, connect and test.
 *
 *   1. What to type into the machine (this server's address)
 *   2. The school's machines: add by serial number, live status, send people
 *   3. Everyone's Device ID (the user number enrolled on the machine)
 *   4. A test punch, no machine needed
 *   5. Rules: late time, staff late time, minutes before a check-out counts
 *   Today's punches
 *
 * The machines talk to the server on their own (Cloud server / ADMS mode);
 * the Attendance Kiosk screen shows each punch with the person's photo.
 * Step-by-step guide: /guides/IlmForge-Attendance-Devices-Guide.pdf
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import {
  Fingerprint, Plus, Trash2, Wifi, WifiOff, Copy, Send, Search, Download, Printer, PlayCircle, Clock,
  Monitor, Globe, AlertTriangle, CheckCircle2, BookOpen, ScanLine, Power, RefreshCw,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL || '/';
const GUIDE = `${BASE}guides/IlmForge-Attendance-Devices-Guide.pdf`;
const ago = (d) => {
  if (!d) return 'never';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(d).toLocaleDateString('en-PK');
};
const timeOf = (d) => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const csvCell = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

function copy(textValue) {
  navigator.clipboard?.writeText(String(textValue)).then(() => toast.success('Copied')).catch(() => toast.error('Copy it by hand: ' + textValue));
}

function Section({ n, title, icon: Icon, children, right }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {n && <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#0D9488', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>}
        {Icon && <Icon size={17} color="#0D9488" />}
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F', flex: 1 }}>{title}</h3>
        {right}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

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

export default function AttendanceDevicesPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = ['admin', 'super_admin', 'principal'].includes(role);

  const { data: conn } = useQuery({ queryKey: ['bio-connection'], queryFn: () => api.get('/biometric/connection').then((r) => r.data.data) });
  const { data: devices = [], isLoading: devLoading } = useQuery({
    queryKey: ['bio-devices'], queryFn: () => api.get('/biometric/devices').then((r) => r.data.data || []), refetchInterval: 5000,
  });
  const { data: unregistered = [] } = useQuery({
    queryKey: ['bio-unregistered'], queryFn: () => api.get('/biometric/unregistered', { silent: true }).then((r) => r.data.data || []).catch(() => []),
    enabled: isAdmin && conn?.edition === 'desktop', refetchInterval: 10000,
  });
  const { data: punches = [] } = useQuery({
    queryKey: ['bio-punches'], queryFn: () => api.get('/biometric/punches').then((r) => r.data.data || []), refetchInterval: 8000,
  });
  const { data: rules } = useQuery({ queryKey: ['attendance-device-settings'], queryFn: () => api.get('/biometric/settings').then((r) => r.data.data) });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });

  const refresh = () => qc.invalidateQueries({ queryKey: ['bio-devices'] });

  /* ── add a machine ── */
  const EMPTY = { name: '', serialNo: '', location: '' };
  const [form, setForm] = useState(EMPTY);
  const [showAdd, setShowAdd] = useState(false);
  const add = useMutation({
    mutationFn: (d) => api.post('/biometric/devices', d),
    onSuccess: (r) => { toast.success(r.data?.message || 'Added'); setForm(EMPTY); setShowAdd(false); refresh(); qc.invalidateQueries({ queryKey: ['bio-unregistered'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'It could not be added.'),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/biometric/devices/${id}`, d),
    onSuccess: refresh,
    onError: (e) => toast.error(e.response?.data?.message || 'It could not be changed.'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/biometric/devices/${id}`),
    onSuccess: (r) => { toast.success(r.data?.message || 'Removed'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'It could not be removed.'),
  });
  const [sendType, setSendType] = useState('all');
  const send = useMutation({
    mutationFn: ({ id, type }) => api.post(`/biometric/devices/${id}/send-people`, { type }),
    onSuccess: (r) => { toast.success(r.data?.message, { duration: 7000 }); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'It could not be sent.'),
  });

  /* ── people and Device IDs ── */
  const [ptype, setPtype] = useState('all');
  const [pclass, setPclass] = useState('');
  const [search, setSearch] = useState('');
  const { data: people = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['bio-people', ptype, pclass],
    queryFn: () => api.get('/biometric/people', { params: { type: ptype, classId: pclass || undefined } }).then((r) => r.data.data || []),
  });
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? people.filter((p) => [p.name, p.rollNo, p.devicePin, p.className].some((v) => String(v || '').toLowerCase().includes(q))) : people;
  }, [people, search]);
  const exportCsv = () => {
    const rows = [['Device ID', 'Name', 'Type', 'Class / Designation', 'Section / Department', 'Roll no / Employee code'],
      ...shown.map((p) => [p.devicePin, p.name, p.kind, p.className, p.sectionName, p.rollNo])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'device-ids.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const printList = () => {
    const school = useAuthStore.getState().school?.name || '';
    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow pop-ups for this site to print.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Device IDs</title><style>
      body{font-family:Arial,sans-serif;padding:14mm;font-size:10.5pt} h2{margin:0 0 2px} p{margin:0 0 10px;color:#555}
      table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:5px 7px;text-align:left} th{background:#1E3A5F;color:#fff}
      td.pin{font-family:monospace;font-weight:700;font-size:12pt}</style></head><body>
      <h2>${esc(school)} — Fingerprint machine Device IDs</h2><p>Enrol each person's finger on the machine under this user number (ID).</p>
      <table><thead><tr><th>Device ID</th><th>Name</th><th>Class / Designation</th><th>Roll no / Code</th><th>Finger enrolled ✓</th></tr></thead><tbody>
      ${shown.map((p) => `<tr><td class="pin">${esc(p.devicePin)}</td><td>${esc(p.name)}</td><td>${esc([p.className, p.sectionName].filter(Boolean).join(' — '))}</td><td>${esc(p.rollNo)}</td><td></td></tr>`).join('')}
      </tbody></table></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  /* ── test punch ── */
  const [testCode, setTestCode] = useState('');
  const [testDir, setTestDir] = useState('');
  const [testDevice, setTestDevice] = useState('');
  const [testResult, setTestResult] = useState(null);
  const simulate = useMutation({
    mutationFn: () => api.post('/biometric/simulate', { code: testCode.trim(), direction: testDir || undefined, deviceId: testDevice || undefined }).then((r) => r.data),
    onSuccess: (d) => { setTestResult({ ok: true, ...d.data, message: d.message }); qc.invalidateQueries({ queryKey: ['bio-punches'] }); refresh(); },
    onError: (e) => setTestResult({ ok: false, message: e.response?.data?.message || 'It did not work.' }),
  });

  /* ── rules ── */
  const [ruleForm, setRuleForm] = useState(null);
  const r = ruleForm || { lateAfter: rules?.lateAfter || '', staffLateAfter: rules?.staffLateAfter || '', gapMinutes: rules?.gapMinutes || 30, timeZone: rules?.timeZone || '+05:00' };
  const saveRules = useMutation({
    mutationFn: () => api.put('/biometric/settings', { ...r, lateAfter: r.lateAfter || null, staffLateAfter: r.staffLateAfter || null, gapMinutes: Number(r.gapMinutes) }),
    onSuccess: () => { toast.success('Saved: every scanner and machine uses these now.'); setRuleForm(null); qc.invalidateQueries({ queryKey: ['attendance-device-settings'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'It could not be saved.'),
  });

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="page-content fade-in" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Fingerprint size={24} color="#0D9488" /> Fingerprint Machines &amp; Scanners</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Students and staff mark attendance with a finger, an ID card barcode or a QR code. Every mark is saved in the attendance register.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn-outline" href={GUIDE} target="_blank" rel="noreferrer"><BookOpen size={15} /> Setup guide (PDF)</a>
          <Link className="btn btn-teal" to="/attendance/barcode"><ScanLine size={15} /> Open Attendance Kiosk</Link>
        </div>
      </div>

      {/* 1. Connection */}
      <Section n="1" title="What to type into the fingerprint machine" icon={conn?.edition === 'desktop' ? Monitor : Globe}>
        {!conn ? <div className="loading-center"><div className="spinner" /></div> : conn.edition === 'desktop' ? (
          <>
            {!conn.lanOn ? (
              <div className="alert alert-warning" style={{ display: 'flex', gap: 8 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{conn.note}</span>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
                  On the machine: <strong>Menu → Comm. → Cloud Server Setting</strong> (some models: <strong>ADMS</strong>). Turn <strong>Enable Domain Name</strong> and <strong>HTTPS</strong> off, then enter:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  <Field label="Server address" value={conn.addresses[0] || '—'} />
                  <Field label="Server port" value={conn.port} />
                  <Field label="HTTPS / SSL" value="Off" mono={false} copyable={false} />
                </div>
                {conn.addresses.length > 1 && (
                  <p style={{ fontSize: 12, color: '#64748B', marginBottom: 0 }}>
                    This computer has more than one network address: {conn.addresses.join(', ')}. Use the one on the same network as the machine (usually 192.168.x.x).
                  </p>
                )}
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 0 }}>
                  Keep IlmForge open on this computer. Give this computer a fixed address in the router (DHCP reservation) so the machine always finds it, and allow IlmForge in Windows Firewall for private networks.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
              On the machine: <strong>Menu → Comm. → Cloud Server Setting</strong> (some models: <strong>ADMS</strong>). Turn <strong>Enable Domain Name</strong> on and <strong>HTTPS</strong> on, then enter:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <Field label="Server address (domain)" value={conn.host} />
              <Field label="Server port" value={conn.port} />
              <Field label="HTTPS / SSL" value={conn.https ? 'On' : 'Off'} mono={false} copyable={false} />
            </div>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 0 }}>{conn.note} A machine that cannot use HTTPS works with the IlmForge desktop app on the school's own computer instead (see the guide).</p>
          </>
        )}
      </Section>

      {/* 2. Machines */}
      <Section n="2" title={`The school's machines${devices.length ? ` (${onlineCount} of ${devices.length} connected)` : ''}`} icon={Fingerprint}
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
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#64748B' }}>
              The serial number is on the machine: <strong>Menu → System Info → Device Info → Serial Number</strong> (also on the sticker on the back).
            </div>
          </form>
        )}
        {devLoading ? <div className="loading-center"><div className="spinner" /></div> : devices.length === 0 ? (
          <div className="empty-state" style={{ padding: '18px 0' }}>
            <div className="empty-state-icon"><Fingerprint size={34} color="#94A3B8" /></div>
            <div className="empty-state-text">No machine added yet</div>
            <div className="empty-state-sub">Add a machine with its serial number. Until then you can try everything with the test punch below.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Machine</th><th>Serial number</th><th>Status</th><th>Punches today</th><th>Send names to machine</th>{isAdmin && <th />}</tr></thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} style={{ opacity: d.isActive ? 1 : 0.55 }}>
                    <td><div style={{ fontWeight: 700 }}>{d.name}</div><div style={{ fontSize: 12, color: '#64748B' }}>{d.location || ''}</div></td>
                    <td style={{ fontFamily: 'monospace' }}>{d.serialNo || <span style={{ color: '#B91C1C' }}>not set</span>}</td>
                    <td>
                      {d.online
                        ? <span className="badge badge-green" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Wifi size={12} /> Connected</span>
                        : <span className="badge badge-red" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><WifiOff size={12} /> {d.lastSeen ? 'Not connected' : 'Never connected'}</span>}
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>Last contact: {ago(d.lastSeen)}{d.ip ? ` · ${d.ip}` : ''}</div>
                      {!d.isActive && <div style={{ fontSize: 11.5, color: '#B91C1C' }}>Switched off in IlmForge</div>}
                    </td>
                    <td style={{ fontWeight: 700 }}>{d.punchesToday}</td>
                    <td>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <select aria-label="Who to send" className="form-select" style={{ width: 'auto', height: 32, fontSize: 12.5, padding: '0 28px 0 8px', lineHeight: '30px' }} value={sendType} onChange={(e) => setSendType(e.target.value)}>
                            <option value="all">Everyone</option><option value="students">Students</option><option value="staff">Staff</option>
                          </select>
                          <button type="button" className="btn btn-outline btn-sm" disabled={send.isPending || !d.serialNo}
                            onClick={() => { if (window.confirm(`Put the names and Device IDs of ${sendType === 'all' ? 'all students and staff' : sendType} on ${d.name}? Fingers are then enrolled on the machine.`)) send.mutate({ id: d.id, type: sendType }); }}>
                            <Send size={13} /> Send
                          </button>
                        </div>
                      )}
                      {d.sending && d.sending.total > 0 && (
                        <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
                          {d.pending > 0 ? `Sending: ${d.sending.total - d.pending} of ${d.sending.total}` : `Sent ${d.sending.total}`}
                          {d.sending.ok > 0 && ` · saved on machine ${d.sending.ok}`}{d.sending.failed > 0 && ` · refused ${d.sending.failed}`}
                        </div>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-outline btn-sm" title={d.isActive ? 'Switch off (its punches are refused)' : 'Switch on'} style={{ marginRight: 6 }}
                          onClick={() => update.mutate({ id: d.id, isActive: !d.isActive })}><Power size={13} /></button>
                        <button type="button" className="btn btn-outline btn-sm" title="Remove" style={{ color: '#DC2626', borderColor: '#FECACA' }}
                          onClick={() => { if (window.confirm(`Remove ${d.name}? Attendance it marked is kept.`)) remove.mutate(d.id); }}><Trash2 size={13} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 3. Device IDs */}
      <Section n="3" title="Device IDs: the number to enrol each finger under" icon={Search}
        right={(
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={exportCsv} disabled={!shown.length}><Download size={13} /> CSV</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={printList} disabled={!shown.length}><Printer size={13} /> Print list</button>
          </div>
        )}>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
          "Send" above puts these names and numbers on the machine. Then on the machine: <strong>Menu → User Mgt. → All Users</strong>, choose the person, <strong>Edit → Fingerprint</strong>, and press the finger three times.
          The ID card barcode and QR code work without any enrolment.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <select aria-label="Who" className="form-select" style={{ width: 'auto' }} value={ptype} onChange={(e) => { setPtype(e.target.value); if (e.target.value === 'staff') setPclass(''); }}>
            <option value="all">Students and staff</option><option value="students">Students</option><option value="staff">Staff</option>
          </select>
          {ptype !== 'staff' && (
            <select aria-label="Class" className="form-select" style={{ width: 'auto' }} value={pclass} onChange={(e) => setPclass(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input className="form-input" style={{ maxWidth: 280 }} placeholder="Search name, roll no, Device ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span style={{ alignSelf: 'center', fontSize: 12, color: '#64748B' }}>{shown.length} people</span>
        </div>
        {peopleLoading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Device ID</th><th>Name</th><th>Class / Designation</th><th>Roll no / Code</th><th>Photo</th></tr></thead>
              <tbody>
                {shown.slice(0, 500).map((p) => (
                  <tr key={`${p.kind}-${p.id}`}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#0D9488' }}>{p.devicePin}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.name} {p.kind === 'staff' && <span className="badge badge-purple" style={{ marginLeft: 4 }}>Staff</span>}</td>
                    <td style={{ fontSize: 12.5 }}>{[p.className, p.sectionName].filter(Boolean).join(' — ')}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{p.rollNo || '—'}</td>
                    <td>{p.hasPhoto ? <CheckCircle2 size={15} color="#16A34A" /> : <span style={{ fontSize: 11.5, color: '#B45309' }}>none: add one for the pop-up</span>}</td>
                  </tr>
                ))}
                {shown.length > 500 && <tr><td colSpan={5} style={{ fontSize: 12, color: '#64748B' }}>Showing 500 of {shown.length}: search or choose a class to see the others (CSV and Print include everyone shown).</td></tr>}
                {!shown.length && <tr><td colSpan={5} style={{ color: '#64748B' }}>Nobody found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 4. Test */}
      <Section n="4" title="Try it: a test punch without a machine" icon={PlayCircle}>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>
          Open the <Link to="/attendance/barcode">Attendance Kiosk</Link> on this or another computer, then press <strong>Punch</strong> here: the kiosk shows the pop-up with the photo and says
          "Thank you, attendance marked", exactly as for a real finger. It is saved in the register like any mark.
        </p>
        {isAdmin ? (
          <form onSubmit={(e) => { e.preventDefault(); if (testCode.trim()) simulate.mutate(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="form-input" style={{ maxWidth: 260, fontFamily: 'monospace' }} value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="Device ID, roll no or employee code" aria-label="Who" />
            <select aria-label="In or out" className="form-select" style={{ width: 'auto' }} value={testDir} onChange={(e) => setTestDir(e.target.value)}>
              <option value="">In or out by the time (as the machine does)</option><option value="in">Arriving</option><option value="out">Leaving</option>
            </select>
            {devices.length > 0 && (
              <select aria-label="As if from" className="form-select" style={{ width: 'auto' }} value={testDevice} onChange={(e) => setTestDevice(e.target.value)}>
                <option value="">No machine</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <button type="submit" className="btn btn-teal" disabled={simulate.isPending || !testCode.trim()}><Fingerprint size={15} /> {simulate.isPending ? 'Punching…' : 'Punch'}</button>
          </form>
        ) : <div style={{ fontSize: 13, color: '#64748B' }}>The administrator can make test punches.</div>}
        {testResult && (
          <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: 12, marginBottom: 0 }}>
            {testResult.ok ? <><strong>{testResult.person?.name}</strong> ({testResult.person?.className}) — {testResult.message}</> : testResult.message}
          </div>
        )}
      </Section>

      {/* 5. Rules */}
      <Section n="5" title="Rules for every scanner and machine" icon={Clock}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label className="form-group" style={{ margin: 0 }}><span className="form-label">Students late after</span>
            <input type="time" className="form-input" disabled={!isAdmin} value={r.lateAfter} onChange={(e) => setRuleForm({ ...r, lateAfter: e.target.value })} /></label>
          <label className="form-group" style={{ margin: 0 }}><span className="form-label">Staff late after</span>
            <input type="time" className="form-input" disabled={!isAdmin} value={r.staffLateAfter} onChange={(e) => setRuleForm({ ...r, staffLateAfter: e.target.value })} /></label>
          <label className="form-group" style={{ margin: 0 }}><span className="form-label">Minutes before a second punch is a check-out</span>
            <input type="number" min="5" max="600" className="form-input" disabled={!isAdmin} value={r.gapMinutes} onChange={(e) => setRuleForm({ ...r, gapMinutes: e.target.value })} /></label>
          <label className="form-group" style={{ margin: 0 }}><span className="form-label">Machine clock time zone</span>
            <select className="form-select" disabled={!isAdmin} value={r.timeZone} onChange={(e) => setRuleForm({ ...r, timeZone: e.target.value })}>
              <option value="+05:00">Pakistan (UTC+05:00)</option><option value="+04:00">UTC+04:00 (Gulf)</option><option value="+03:00">UTC+03:00 (Saudi Arabia)</option><option value="+00:00">UTC</option>
            </select></label>
        </div>
        <p style={{ fontSize: 12, color: '#64748B', margin: '10px 0 0' }}>
          Leave a late time empty and nobody is marked late. A second punch within the minutes above says "already marked"; after that it is a check-out (staff) or leaving school (students).
        </p>
        {isAdmin && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-teal" disabled={!ruleForm || saveRules.isPending} onClick={() => saveRules.mutate()}>{saveRules.isPending ? 'Saving…' : 'Save rules'}</button>
            {ruleForm && <button type="button" className="btn btn-outline" onClick={() => setRuleForm(null)}>Undo</button>}
          </div>
        )}
      </Section>

      {/* Today's punches */}
      <Section title={`Today's punches (${punches.length})`} icon={RefreshCw}>
        {punches.length === 0 ? <div style={{ fontSize: 13, color: '#64748B' }}>No punches or scans yet today.</div> : (
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Time</th><th>Name</th><th>Class / Designation</th><th>How</th><th>In / Out</th><th>Machine</th></tr></thead>
              <tbody>
                {punches.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{timeOf(p.punchTime)}</td>
                    <td style={{ fontWeight: 600 }}>{p.person?.name}</td>
                    <td style={{ fontSize: 12.5 }}>{[p.person?.className, p.person?.sectionName].filter(Boolean).join(' — ')}</td>
                    <td style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{p.method}</td>
                    <td><span className={`badge ${p.direction === 'out' ? 'badge-purple' : p.direction === 'again' ? 'badge-blue' : 'badge-green'}`}>{p.direction === 'out' ? 'Out' : p.direction === 'again' ? 'Again' : 'In'}</span></td>
                    <td style={{ fontSize: 12.5 }}>{p.deviceName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
