/*
 * What to type into each kind of machine: ZKTeco (Cloud Server / ADMS),
 * Hikvision (HTTP listening to its secret link), any other make or program
 * (its secret link), and the four kinds as the office chooses them.
 */
import { Copy, AlertTriangle, Fingerprint, ScanFace, Globe, Usb, ExternalLink } from 'lucide-react';
import { copy, hint } from './shared';

export const KINDS = [
  {
    kind: 'zkteco', icon: Fingerprint, title: 'ZKTeco (or eSSL)',
    text: 'Fingerprint, face or card. Its menu has Comm. → Cloud Server Setting (or ADMS).',
    tag: 'Sends by itself · IlmForge can put names and fingers on it',
  },
  {
    kind: 'hikvision', icon: ScanFace, title: 'Hikvision face or fingerprint terminal',
    text: 'DS-K1T… models. Set up from its web page: HTTP Listening.',
    tag: 'Sends by itself',
  },
  {
    kind: 'web', icon: Globe, title: 'Another make, or attendance software',
    text: 'Its settings take a server, push, HTTP or webhook address, or a program can send its punches.',
    tag: 'Sends by itself',
  },
  {
    kind: 'file', icon: Usb, title: 'Any machine: upload its USB file',
    text: 'Save the attendance log to a USB stick and upload it here, every day or every few days. The machine needs no internet.',
    tag: 'Works with every machine',
  },
];
export const kindInfo = (k) => KINDS.find((x) => x.kind === k) || KINDS[0];

export function Field({ label, value, mono = true, copyable = true, small = false }) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: small ? 14 : 18, fontWeight: 800, color: '#0F172A', fontFamily: mono ? 'monospace' : 'inherit', overflowWrap: 'anywhere', minWidth: 0 }}>{value}</span>
        {copyable && value !== '' && value !== undefined && value !== null && (
          <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', flexShrink: 0 }} aria-label={`Copy ${label}`} title="Copy" onClick={() => copy(value)}><Copy size={12} /></button>
        )}
      </div>
    </div>
  );
}

const fields = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 };
const steps = { margin: 0, paddingLeft: 20, display: 'grid', gap: 6, fontSize: 13, color: '#334155' };

/* ZKTeco: Cloud Server Setting. */
export function ZkSetup({ conn }) {
  if (!conn) return <div className="loading-center"><div className="spinner" /></div>;
  if (conn.edition === 'desktop') {
    if (!conn.lanOn) return <div className="alert alert-warning" style={{ display: 'flex', gap: 8 }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{conn.note}</span></div>;
    return (
      <>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 0 }}>On the machine: <strong>Menu → Comm. → Cloud Server Setting</strong> (some models: <strong>ADMS</strong>). Turn <strong>Enable Domain Name</strong> and <strong>HTTPS</strong> off, then enter:</p>
        <div style={fields}>
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
      <div style={fields}>
        <Field label="Server address (domain)" value={conn.host} />
        <Field label="Server port" value={conn.port} />
        <Field label="HTTPS / SSL" value={conn.https ? 'On' : 'Off'} mono={false} copyable={false} />
      </div>
      <p style={{ ...hint, marginBottom: 0 }}>{conn.note} A machine with no HTTPS setting cannot reach IlmForge online: upload its USB file instead, or use IlmForge Desktop on the school's computer.</p>
    </>
  );
}

/* The address parts of a machine's secret link. */
function linkParts(conn, key) {
  const full = conn?.linkBase && key ? `${conn.linkBase}${key}` : '';
  let host = '';
  let port = '';
  let https = false;
  try {
    const u = new URL(full);
    host = u.hostname;
    https = u.protocol === 'https:';
    port = u.port || (https ? '443' : '80');
  } catch { /* no link yet */ }
  return { full, host, port, https, path: key ? `${conn?.linkPath || '/machine/'}${key}` : '' };
}

/* Hikvision: HTTP listening. */
export function HikSetup({ conn, pushKey }) {
  if (!conn) return <div className="loading-center"><div className="spinner" /></div>;
  if (!pushKey) return <div style={hint}>Only the administrator sees this machine's link.</div>;
  if (conn.edition === 'desktop' && !conn.lanOn) return <div className="alert alert-warning" style={{ display: 'flex', gap: 8 }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /><span>{conn.note}</span></div>;
  const L = linkParts(conn, pushKey);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <ol style={steps}>
        <li>On a computer on the same network as the machine, open the machine's address in the browser (on the machine: <strong>Menu → Comm. → Network</strong>, for example 192.168.1.64) and sign in as admin. Hikvision's iVMS-4200 (Device Management → Remote Configuration) shows the same settings.</li>
        <li>Open <strong>Configuration → Network → Advanced Settings → HTTP Listening</strong> (on some firmware: <strong>Network Service → HTTP(S)</strong> or <strong>Event → HTTP Listening</strong>).</li>
        <li>Enter these, and Save:</li>
      </ol>
      <div style={fields}>
        <Field label="Event alarm IP / domain name" value={L.host} small />
        <Field label="URL" value={L.path} small />
        <Field label="Port" value={L.port} small />
        <Field label="Protocol" value={L.https ? 'HTTPS' : 'HTTP'} mono={false} copyable={false} small />
      </div>
      <ol start={4} style={steps}>
        <li>Each person's <strong>Employee ID</strong> on the machine must be their IlmForge <strong>Device ID</strong> (the People &amp; fingers tab lists them: Print list). Add them under <strong>User Management → Add</strong> with that number, then their face, fingerprint or card. People already on the machine under other numbers are linked once on People &amp; fingers → Users on the machines.</li>
        <li>The machine's time: <strong>Configuration → System → Time Settings</strong>: time zone (GMT+05:00) Islamabad, Karachi, and the right time (or NTP).</li>
        <li>Show a face at the machine: the punch appears on this page within seconds.</li>
      </ol>
      {L.https && <p style={{ ...hint, margin: 0 }}>If the machine's HTTP Listening has no HTTPS choice, it cannot reach IlmForge online. Upload its USB file instead (on its card: Upload a log file), or use IlmForge Desktop on the school's computer.</p>}
    </div>
  );
}

/* Any other make or program: its link, and what to send. */
export function WebSetup({ conn, pushKey }) {
  if (!conn) return <div className="loading-center"><div className="spinner" /></div>;
  if (!pushKey) return <div style={hint}>Only the administrator sees this machine's link.</div>;
  const L = linkParts(conn, pushKey);
  const sample = '{ "id": "1843", "time": "2026-11-28 08:01:02" }';
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>Put this link into the machine's <strong>server</strong>, <strong>push</strong>, <strong>HTTP</strong> or <strong>webhook</strong> setting, or give it to whoever runs the attendance program. Keep it private: anyone with it can send punches for this machine (you can make a new one at any time).</p>
      <Field label="This machine's link" value={L.full} small />
      <div style={{ fontSize: 13, color: '#334155', display: 'grid', gap: 6 }}>
        <div>Each punch, sent to the link (POST as JSON or a form, or GET):</div>
        <code style={{ display: 'block', background: '#0F172A', color: '#E2E8F0', borderRadius: 8, padding: '8px 10px', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre' }}>{`POST ${L.full}\n${sample}\n\nGET ${L.full}?id=1843&time=2026-11-28%2008:01:02`}</code>
        <div style={hint}>
          The person: <code>id</code>, <code>userId</code>, <code>employeeNo</code> or <code>pin</code>: their Device ID (or roll number / employee code). The time: <code>time</code>, <code>timestamp</code> or <code>datetime</code>, on the machine's clock (2026-11-28 08:01:02), with a time zone, or seconds since 1970. A list of punches works too, and a date and a time in two fields. The machine's own numbers can be linked once on People &amp; fingers.
        </div>
      </div>
      <div><a className="btn btn-outline btn-sm" href={L.full} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open the link to check it</a></div>
    </div>
  );
}
