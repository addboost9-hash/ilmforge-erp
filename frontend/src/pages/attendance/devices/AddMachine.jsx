/*
 * Adding a machine, step by step: which kind it is, its name, what to type
 * into it (or its file), and the moment IlmForge first hears from it.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, ArrowLeft, X, HelpCircle } from 'lucide-react';
import api from '../../../api/client';
import { KINDS, kindInfo, ZkSetup, HikSetup, WebSetup } from './setup';
import ImportFile from './ImportFile';
import { errText, hint, ago } from './shared';

const box = { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, display: 'grid', gap: 12, marginBottom: 14, minWidth: 0 };

function StepDots({ step }) {
  const names = ['Kind of machine', 'Its name', 'Connect it'];
  return (
    <ol aria-label="Steps" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', listStyle: 'none', margin: 0, padding: 0 }}>
      {names.map((n, i) => (
        <li key={n} aria-current={step === i + 1 ? 'step' : undefined} style={{
          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
          background: step === i + 1 ? '#0D9488' : step > i + 1 ? '#CCFBF1' : '#E2E8F0', color: step === i + 1 ? '#fff' : '#334155',
        }}>{i + 1}. {n}</li>
      ))}
    </ol>
  );
}

/* Waits for the machine's first call (the page refreshes the machines every few seconds). */
function FirstContact({ id, kind }) {
  const { data: devices = [] } = useQuery({ queryKey: ['bio-devices'], queryFn: () => api.get('/biometric/devices').then((r) => r.data.data || []), refetchInterval: 4000 });
  const [since] = useState(Date.now());
  const d = devices.find((x) => x.id === id);
  if (d?.lastSeen) {
    return (
      <div className="alert alert-success" role="status" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        <CheckCircle2 size={18} /> <span><strong>IlmForge hears {d.name}</strong> ({ago(d.lastSeen)}).{d.punchesToday ? ` ${d.punchesToday} punch${d.punchesToday === 1 ? '' : 'es'} today.` : ''}</span>
      </div>
    );
  }
  const long = Date.now() - since > 3 * 60e3;
  return (
    <div role="status" style={{ display: 'grid', gap: 6, fontSize: 13, color: '#334155' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        {kind === 'zkteco' ? 'Waiting for the machine to call IlmForge: it calls within a minute of saving.' : 'Waiting for the first punch: show a face or press a finger on the machine.'}
      </div>
      {long && (
        <div className="alert alert-warning" style={{ margin: 0, fontSize: 12.5 }}>
          Nothing yet. Check: the machine has the internet (its network settings: gateway and DNS); the address, {kind === 'zkteco' ? 'port and serial number' : 'URL and port'} are exactly as shown; HTTPS is on. You can close this: the machine's card shows when it connects, and its Machine log shows what it sent.
        </div>
      )}
    </div>
  );
}

export default function AddMachine({ conn, preset, onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(preset?.kind ? 2 : 1);
  const [kind, setKind] = useState(preset?.kind || null);
  const [form, setForm] = useState({ name: preset?.name || '', location: '', serialNo: preset?.serialNo || '' });
  const [made, setMade] = useState(null);
  const add = useMutation({
    mutationFn: () => api.post('/biometric/devices', { ...form, kind, ...(kind !== 'zkteco' && { serialNo: undefined }) }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message || 'Added'); setMade(r.data); setStep(3); qc.invalidateQueries({ queryKey: ['bio-devices'] }); qc.invalidateQueries({ queryKey: ['bio-unregistered'] }); },
    onError: (e) => toast.error(errText(e, 'It could not be added.'), { duration: 7000 }),
  });
  const info = kind ? kindInfo(kind) : null;

  return (
    <div style={box} aria-label="Add a machine" role="region">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15, color: '#1E3A5F', flex: 1, minWidth: 160 }}>Add a machine</strong>
        <StepDots step={step} />
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose} aria-label="Close"><X size={14} /></button>
      </div>

      {step === 1 && (
        <>
          <div style={{ fontSize: 13, color: '#475569' }}>Which machine do you have? Every make works: the last choice works with all of them.</div>
          <div role="radiogroup" aria-label="Kind of machine" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {KINDS.map((k) => {
              const Icon = k.icon;
              const on = kind === k.kind;
              return (
                <button key={k.kind} type="button" role="radio" aria-checked={on} onClick={() => { setKind(k.kind); setStep(2); }}
                  style={{
                    flex: '1 1 220px', textAlign: 'left', display: 'grid', gap: 6, alignContent: 'start', padding: 14, borderRadius: 12, cursor: 'pointer',
                    background: '#fff', border: `2px solid ${on ? '#0D9488' : '#E2E8F0'}`, minWidth: 0,
                  }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 800, color: '#0F172A', fontSize: 14 }}><Icon size={20} color="#0D9488" /> {k.title}</span>
                  <span style={{ fontSize: 12.5, color: '#475569' }}>{k.text}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: k.kind === 'file' ? '#0D9488' : '#64748B' }}>{k.tag}</span>
                </button>
              );
            })}
          </div>
          <div style={{ ...hint, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <HelpCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Not sure? Look at the logo, then the menu. A ZKTeco or eSSL machine whose menu has no Cloud Server Setting (older models), or any other make that cannot send by itself: choose <strong>Any machine: upload its USB file</strong>.</span>
          </div>
        </>
      )}

      {step === 2 && info && (
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 13, color: '#334155', display: 'flex', gap: 8, alignItems: 'center' }}><info.icon size={18} color="#0D9488" /> <strong>{info.title}</strong></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="form-group" style={{ margin: 0, flex: '1 1 180px' }}><span className="form-label">Name *</span>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main gate" autoFocus /></label>
            <label className="form-group" style={{ margin: 0, flex: '1 1 180px' }}><span className="form-label">Where it is</span>
              <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="School entrance" /></label>
            {kind === 'zkteco' && (
              <label className="form-group" style={{ margin: 0, flex: '1 1 200px' }}><span className="form-label">Serial number *</span>
                <input className="form-input" value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} placeholder="e.g. CQZ7224460123" style={{ fontFamily: 'monospace' }} /></label>
            )}
          </div>
          {kind === 'zkteco' && <div style={hint}>The serial number is on the machine: <strong>Menu → System Info → Device Info → Serial Number</strong> (also on the sticker on the back).</div>}
          {(kind === 'hikvision' || kind === 'web') && <div style={hint}>IlmForge makes a private link for this machine; the next step shows what to type into it.</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!preset?.kind && <button type="button" className="btn btn-outline btn-sm" onClick={() => setStep(1)}><ArrowLeft size={13} /> Back</button>}
            <button type="submit" className="btn btn-teal btn-sm" disabled={add.isPending || !form.name.trim() || (kind === 'zkteco' && !form.serialNo.trim())}>{add.isPending ? 'Adding…' : kind === 'file' ? 'Add, then upload its file' : 'Add, then connect it'}</button>
          </div>
        </form>
      )}

      {step === 3 && made && (
        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          {kind === 'zkteco' && <ZkSetup conn={conn} />}
          {kind === 'hikvision' && <HikSetup conn={conn} pushKey={made.pushKey} />}
          {kind === 'web' && <WebSetup conn={conn} pushKey={made.pushKey} />}
          {kind === 'file' && <ImportFile device={made} />}
          {kind !== 'file' && <FirstContact id={made.id} kind={kind} />}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, fontSize: 13, color: '#334155', display: 'grid', gap: 4 }}>
            <strong>Next</strong>
            {kind === 'zkteco' && <span>On {made.name}'s card: <strong>Put names on it</strong>, then enrol fingers or faces on the machine (or with Enrol on the <Link to="/attendance/biometric-attendance?view=people">People &amp; fingers</Link> tab). A machine that already has users: More → Get users and fingers, then link them once.</span>}
            {(kind === 'hikvision' || kind === 'web') && <span>Enrol people on the machine with their <strong>Device ID</strong> as their number: the <Link to="/attendance/biometric-attendance?view=people">People &amp; fingers</Link> tab lists everyone's (Print list). People already on it under other numbers are linked once there.</span>}
            {kind === 'file' && <span>Whenever you take the log off the machine, upload it on {made.name}'s card (<strong>Upload a log file</strong>). Enrol people on the machine with their <strong>Device ID</strong> as their number (<Link to="/attendance/biometric-attendance?view=people">People &amp; fingers</Link> → Print list); other numbers are linked once there.</span>}
          </div>
          <div><button type="button" className="btn btn-teal btn-sm" onClick={onClose}>Done</button></div>
        </div>
      )}
    </div>
  );
}
