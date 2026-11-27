/**
 * One fingerprint machine: is it connected, what it holds, the work going
 * to it, and everything the office can ask of it.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/client';
import {
  Wifi, WifiOff, Send, Fingerprint, History, UserMinus, Clock, Info, RotateCcw, ScrollText, Power, Trash2, AlertTriangle, ChevronDown, ChevronUp, Square,
} from 'lucide-react';
import { ago, dayTimeOf, timeOf, num, errText, hint, pkToday, JOB_LABEL, WhoPicker } from './shared';

const whoBody = (w) => ({ type: w.type, ...(w.classId ? { classId: Number(w.classId) } : {}) });

function Stat({ label, value, sub }) {
  return (
    <div style={{ minWidth: 0, flex: '1 1 110px' }}>
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#64748B' }}>{sub}</div>}
    </div>
  );
}

function Work({ work }) {
  const jobs = Object.entries(work || {}).filter(([, j]) => j.total > 0);
  if (!jobs.length) return null;
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {jobs.map(([job, j]) => {
        const waiting = j.pending + j.sent;
        return (
          <div key={job} style={{ fontSize: 12.5, color: '#334155', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <strong>{JOB_LABEL[job] || job}:</strong>
            <span>{j.done} of {j.total} done</span>
            {waiting > 0 && <span className="badge badge-blue">{waiting} waiting</span>}
            {j.failed > 0 && <span className="badge badge-red">{j.failed} refused</span>}
            {j.cancelled > 0 && <span className="badge badge-gray">{j.cancelled} stopped</span>}
          </div>
        );
      })}
    </div>
  );
}

function MachineLog({ id }) {
  const { data: cmd, isLoading: l1 } = useQuery({ queryKey: ['bio-commands', id], queryFn: () => api.get(`/biometric/devices/${id}/commands`).then((r) => r.data.data), refetchInterval: 5000 });
  const { data: log = [], isLoading: l2 } = useQuery({ queryKey: ['bio-log', id], queryFn: () => api.get(`/biometric/devices/${id}/log`).then((r) => r.data.data || []), refetchInterval: 5000 });
  if (l1 || l2) return <div className="spinner" aria-label="Loading the machine log" />;
  const tone = { done: 'badge-green', failed: 'badge-red', pending: 'badge-blue', sent: 'badge-yellow', cancelled: 'badge-gray' };
  return (
    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Work sent to it (newest first)</div>
        <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Asked</th><th>What</th><th>Status</th><th>Answer</th></tr></thead>
            <tbody>
              {(cmd?.recent || []).map((c) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{dayTimeOf(c.createdAt)}</td>
                  <td style={{ fontSize: 12 }}><div style={{ fontWeight: 600 }}>{JOB_LABEL[c.job] || c.job}{c.pin ? ` · user ${c.pin}` : ''}</div><code style={{ fontSize: 11, color: '#64748B', overflowWrap: 'anywhere' }}>{c.cmd}</code></td>
                  <td><span className={`badge ${tone[c.status] || 'badge-gray'}`}>{c.status}</span>{c.tries > 1 && <div style={{ fontSize: 11, color: '#64748B' }}>tried {c.tries}×</div>}</td>
                  <td style={{ fontSize: 12 }}>{c.resultText}</td>
                </tr>
              ))}
              {!(cmd?.recent || []).length && <tr><td colSpan={4} style={hint}>Nothing sent to this machine yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>What the machine said (since the server last started)</div>
        <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Time</th><th>Call</th><th>Lines</th><th>Reply / note</th></tr></thead>
            <tbody>
              {log.map((l, i) => (
                <tr key={`${l.at}-${i}`}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{timeOf(l.at)}</td>
                  <td style={{ fontSize: 12 }}><code>{l.method} {l.path}{l.table ? ` ${l.table}` : ''}</code>{l.sample && <div style={{ fontSize: 11, color: '#64748B', overflowWrap: 'anywhere' }}>{l.sample}</div>}</td>
                  <td style={{ fontSize: 12 }}>{l.lines ?? ''}</td>
                  <td style={{ fontSize: 12 }}>{l.note ? <div>{l.note}</div> : null}<code style={{ fontSize: 11, color: '#64748B' }}>{l.reply}</code></td>
                </tr>
              ))}
              {!log.length && <tr><td colSpan={4} style={hint}>The machine has not called since the server last started.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LeftList({ id, name, onDone }) {
  const { data: left, isLoading } = useQuery({ queryKey: ['bio-left', id], queryFn: () => api.get(`/biometric/devices/${id}/left`).then((r) => r.data.data || []) });
  const go = useMutation({
    mutationFn: () => api.post(`/biometric/devices/${id}/remove-left`, {}),
    onSuccess: (r) => { toast.success(r.data.message, { duration: 7000 }); onDone(); },
    onError: (e) => toast.error(errText(e, 'It could not be done.')),
  });
  if (isLoading) return <div className="spinner" />;
  if (!left?.length) return <div style={hint}>Nobody who has left the school is on {name}.</div>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 13 }}>{left.length} on {name} who have left the school: <span style={{ color: '#475569' }}>{left.slice(0, 12).map((u) => `${u.name || 'user'} (${u.pin})`).join(', ')}{left.length > 12 ? '…' : ''}</span></div>
      <div><button type="button" className="btn btn-sm" style={{ background: '#DC2626', color: '#fff' }} disabled={go.isPending} onClick={() => go.mutate()}><UserMinus size={13} /> Take {left.length} off the machine</button></div>
      <div style={hint}>Their fingerprints on the machine are deleted too; their attendance in IlmForge is kept.</div>
    </div>
  );
}

export default function MachineCard({ d, isAdmin, classes }) {
  const qc = useQueryClient();
  const [panel, setPanel] = useState(null);
  const [more, setMore] = useState(false);
  const [who, setWho] = useState({ type: 'all', classId: '' });
  const [restore, setRestore] = useState(false);
  const [range, setRange] = useState({ from: pkToday(), to: pkToday() });
  const [result, setResult] = useState(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['bio-devices'] }); qc.invalidateQueries({ queryKey: ['bio-commands', d.id] }); };
  const act = useMutation({
    mutationFn: ({ path, body }) => api.post(`/biometric/devices/${d.id}/${path}`, body || {}),
    onSuccess: (r) => { toast.success(r.data.message, { duration: 7000 }); setResult(r.data); refresh(); },
    onError: (e) => toast.error(errText(e, 'It could not be done.'), { duration: 8000 }),
  });
  const update = useMutation({
    mutationFn: (body) => api.put(`/biometric/devices/${d.id}`, body),
    onSuccess: refresh,
    onError: (e) => toast.error(errText(e, 'It could not be changed.')),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/biometric/devices/${d.id}`),
    onSuccess: (r) => { toast.success(r.data.message); refresh(); },
    onError: (e) => toast.error(errText(e, 'It could not be removed.')),
  });
  const open = (p) => { setResult(null); setPanel(panel === p ? null : p); };
  const clockOff = d.clockOffsetSec !== null && Math.abs(d.clockOffsetSec) > 300;
  const waiting = Object.values(d.work || {}).reduce((n, j) => n + j.pending + j.sent, 0);
  const info = d.info || {};

  return (
    <article className="card" aria-label={`Machine ${d.name}`} style={{ padding: 16, opacity: d.isActive ? 1 : 0.6, display: 'grid', gap: 12, minWidth: 0, alignContent: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>{d.name}</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {[d.location, info.model, d.serialNo && `SN ${d.serialNo}`].filter(Boolean).join(' · ') || <span style={{ color: '#B91C1C' }}>serial number not set</span>}
          </div>
        </div>
        {d.online
          ? <span className="badge badge-green" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Wifi size={12} /> Connected</span>
          : <span className="badge badge-red" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><WifiOff size={12} /> {d.lastSeen ? 'Not connected' : 'Never connected'}</span>}
      </div>
      <div style={{ fontSize: 12, color: '#475569' }}>
        Last contact {ago(d.lastSeen)}{d.ip ? ` · ${d.ip}` : ''}{d.lastPunchAt ? ` · last punch ${timeOf(d.lastPunchAt)}` : ''}
        {!d.isActive && <strong style={{ color: '#B91C1C' }}> · switched off in IlmForge (its punches are refused)</strong>}
      </div>

      {clockOff && (
        <div className="alert alert-warning" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <AlertTriangle size={15} />
          <span style={{ flex: 1, minWidth: 200 }}>Its clock is about {Math.round(Math.abs(d.clockOffsetSec) / 60)} min {d.clockOffsetSec > 0 ? 'slow' : 'fast'}: punch times come from it.</span>
          {isAdmin && <button type="button" className="btn btn-sm btn-outline" onClick={() => act.mutate({ path: 'command', body: { action: 'clock' } })}><Clock size={13} /> Set clock</button>}
        </div>
      )}

      {/* Flex, not grid: the app turns every inline grid into one column on phones. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Punches today" value={num(d.punchesToday)} sub={d.notLinkedToday ? `${d.notLinkedToday} not linked` : null} />
        <Stat label="Users on it" value={num(info.users)} sub={d.known?.users ? `${d.known.linked} linked in IlmForge` : null} />
        <Stat label="Fingers on it" value={num(info.fingers)} sub={info.fpVersion ? `version ${info.fpVersion}` : null} />
        <Stat label="Faces on it" value={num(info.faces)} sub={info.faceVersion ? `version ${info.faceVersion}` : null} />
        <Stat label="Punches stored" value={num(info.punches)} sub={info.firmware ? info.firmware.slice(0, 22) : null} />
      </div>
      {d.refused > 0 && <div style={{ fontSize: 12, color: '#B45309' }}>{d.refused} punches were refused before it was added; the machine sends them again.</div>}

      <Work work={d.work} />

      {isAdmin && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm btn-teal" disabled={!d.serialNo} onClick={() => open('send')}><Send size={13} /> Put names on it</button>
            <button type="button" className="btn btn-sm btn-outline" disabled={!d.serialNo} onClick={() => open('fingers')}><Fingerprint size={13} /> Copy fingers here</button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => open('log')}><ScrollText size={13} /> Machine log</button>
            <button type="button" className="btn btn-sm btn-outline" aria-expanded={more} onClick={() => setMore((v) => !v)}>More {more ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
            {waiting > 0 && <button type="button" className="btn btn-sm btn-outline" onClick={() => act.mutate({ path: 'cancel' })}><Square size={12} /> Stop {waiting} waiting</button>}
          </div>
          {more && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm btn-outline" disabled={!d.serialNo} onClick={() => open('fetch')}><History size={13} /> Fetch punches again</button>
              <button type="button" className="btn btn-sm btn-outline" disabled={!d.serialNo} onClick={() => act.mutate({ path: 'fetch-users' })}><Fingerprint size={13} /> Get users and fingers</button>
              <button type="button" className="btn btn-sm btn-outline" disabled={!d.serialNo} onClick={() => open('left')}><UserMinus size={13} /> Remove people who left</button>
              <button type="button" className="btn btn-sm btn-outline" disabled={!d.serialNo} onClick={() => act.mutate({ path: 'command', body: { action: 'clock' } })}><Clock size={13} /> Set clock</button>
              <button type="button" className="btn btn-sm btn-outline" disabled={!d.serialNo} onClick={() => act.mutate({ path: 'command', body: { action: 'info' } })}><Info size={13} /> Refresh details</button>
              <button type="button" className="btn btn-sm btn-outline" disabled={!d.serialNo} onClick={() => open('reboot')}><RotateCcw size={13} /> Restart</button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => update.mutate({ isActive: !d.isActive })}><Power size={13} /> {d.isActive ? 'Switch off' : 'Switch on'}</button>
              <button type="button" className="btn btn-sm btn-outline" style={{ color: '#DC2626', borderColor: '#FECACA' }} onClick={() => open('remove')}><Trash2 size={13} /> Remove</button>
            </div>
          )}
        </>
      )}

      {panel && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, display: 'grid', gap: 10, minWidth: 0 }}>
          {panel === 'send' && (
            <>
              <div style={{ fontSize: 13 }}>Put names and Device IDs on <strong>{d.name}</strong>. Then enrol each finger on the machine (Menu → User Mgt.), or from IlmForge (People → Enrol).</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <WhoPicker value={who} onChange={setWho} classes={classes} />
                <button type="button" className="btn btn-sm btn-teal" disabled={act.isPending} onClick={() => act.mutate({ path: 'send-people', body: whoBody(who) })}><Send size={13} /> Send</button>
              </div>
              {result?.data?.clashCount > 0 && (
                <div className="alert alert-warning" style={{ margin: 0, fontSize: 12.5 }}>
                  Not sent, their Device ID is someone else's on the machine: {result.data.clashes.map((c) => `${c.name} (${c.pin}${c.onMachine ? `: "${c.onMachine}" on the machine` : ''})`).join(', ')}{result.data.clashCount > result.data.clashes.length ? '…' : ''}. Link or remove that user under People → Users on the machines.
                </div>
              )}
            </>
          )}
          {panel === 'fingers' && (
            <>
              <div style={{ fontSize: 13 }}>Copy the fingerprints (and faces) IlmForge keeps to <strong>{d.name}</strong>: enrol once on any machine, and every machine knows the finger. Only what fits this machine's version is sent.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <WhoPicker value={who} onChange={setWho} classes={classes} />
                <label style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={restore} onChange={(e) => setRestore(e.target.checked)} /> This machine was reset or replaced: send everything back</label>
                <button type="button" className="btn btn-sm btn-teal" disabled={act.isPending} onClick={() => act.mutate({ path: 'send-fingers', body: { ...whoBody(who), restore } })}><Fingerprint size={13} /> Copy</button>
              </div>
            </>
          )}
          {panel === 'fetch' && (
            <>
              <div style={{ fontSize: 13 }}>Ask <strong>{d.name}</strong> to send the punches of these days again (for example after the internet was down). Punches already saved are not counted twice.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ fontSize: 12.5 }}>From <input type="date" className="form-input" style={{ width: 'auto', display: 'inline-block' }} value={range.from} max={pkToday()} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
                <label style={{ fontSize: 12.5 }}>To <input type="date" className="form-input" style={{ width: 'auto', display: 'inline-block' }} value={range.to} max={pkToday()} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
                <button type="button" className="btn btn-sm btn-teal" disabled={act.isPending} onClick={() => act.mutate({ path: 'fetch-punches', body: range })}><History size={13} /> Fetch</button>
              </div>
            </>
          )}
          {panel === 'left' && <LeftList id={d.id} name={d.name} onDone={() => { setPanel(null); refresh(); }} />}
          {panel === 'log' && <MachineLog id={d.id} />}
          {panel === 'reboot' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>Restart {d.name}? Nobody can punch for about a minute.</span>
              <button type="button" className="btn btn-sm btn-teal" onClick={() => { act.mutate({ path: 'command', body: { action: 'reboot' } }); setPanel(null); }}>Yes, restart</button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setPanel(null)}>Cancel</button>
            </div>
          )}
          {panel === 'remove' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>Remove {d.name} from IlmForge? Its punches are refused from then on. Attendance it marked and fingerprints it sent are kept.</span>
              <button type="button" className="btn btn-sm" style={{ background: '#DC2626', color: '#fff' }} disabled={remove.isPending} onClick={() => remove.mutate()}>Yes, remove</button>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setPanel(null)}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
