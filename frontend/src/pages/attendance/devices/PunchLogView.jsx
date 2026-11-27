/* Punch log: every punch and scan, any days, filtered, with a CSV. */
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/client';
import { ListChecks, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Section, downloadCsv, errText, hint, pkToday } from './shared';

const DIR = { in: ['In', 'badge-green'], out: ['Out', 'badge-purple'], again: ['Again', 'badge-blue'] };
const when = (d) => new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function PunchLogView() {
  const today = pkToday();
  const [f, setF] = useState({ from: today, to: today, deviceId: '', who: '', method: '', search: '' });
  const [page, setPage] = useState(1);
  const set = (patch) => { setF({ ...f, ...patch }); setPage(1); };
  const params = { ...f, search: f.search.trim() || undefined, deviceId: f.deviceId || undefined, who: f.who || undefined, method: f.method || undefined };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['bio-punch-log', params, page],
    queryFn: () => api.get('/biometric/punch-log', { params: { ...params, page, size: 100 }, silent: true }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
  const { data: devices = [] } = useQuery({ queryKey: ['bio-devices'], queryFn: () => api.get('/biometric/devices').then((r) => r.data.data || []) });
  const rows = data?.data || [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  const csv = useMutation({
    mutationFn: () => api.get('/biometric/punch-log', { params: { ...params, page: 1, size: 5000 } }).then((r) => r.data),
    onSuccess: (d) => {
      downloadCsv(`punches-${f.from}-to-${f.to}.csv`, [
        ['Date', 'Time', 'Name', 'Class / Designation', 'Roll no / Code', 'How', 'In / Out', 'Machine', 'User no.'],
        ...d.data.map((p) => {
          const t = new Date(new Date(p.punchTime).getTime() + 5 * 3600e3).toISOString();
          return [t.slice(0, 10), t.slice(11, 19), p.person?.name, [p.person?.className, p.person?.sectionName].filter(Boolean).join(' — '), p.person?.rollNo || '', p.method, p.matched === false ? 'waiting for a link' : p.direction, p.deviceName || '', p.pin || p.person?.devicePin || ''];
        }),
      ]);
      if (d.total > d.data.length) toast(`The file has the newest ${d.data.length} of ${d.total}: choose fewer days for the rest.`);
    },
    onError: (e) => toast.error(errText(e, 'It could not be made.')),
  });

  return (
    <Section title="Punch log" icon={ListChecks}
      right={<button type="button" className="btn btn-outline btn-sm" disabled={!data?.total || csv.isPending} onClick={() => csv.mutate()}><Download size={13} /> {csv.isPending ? 'Making…' : 'CSV'}</button>}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 12.5 }}>From <input type="date" className="form-input" style={{ width: 'auto', display: 'inline-block' }} value={f.from} max={today} onChange={(e) => set({ from: e.target.value, to: e.target.value > f.to ? e.target.value : f.to })} /></label>
        <label style={{ fontSize: 12.5 }}>To <input type="date" className="form-input" style={{ width: 'auto', display: 'inline-block' }} value={f.to} max={today} onChange={(e) => set({ to: e.target.value })} /></label>
        <select aria-label="Machine" className="form-select" style={{ width: 'auto' }} value={f.deviceId} onChange={(e) => set({ deviceId: e.target.value })}>
          <option value="">All machines and scanners</option>
          {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          <option value="none">Scanners and phones (no machine)</option>
        </select>
        <select aria-label="Who" className="form-select" style={{ width: 'auto' }} value={f.who} onChange={(e) => set({ who: e.target.value })}>
          <option value="">Everyone</option><option value="student">Students</option><option value="staff">Staff</option><option value="unknown">Not linked yet</option>
        </select>
        <select aria-label="How" className="form-select" style={{ width: 'auto' }} value={f.method} onChange={(e) => set({ method: e.target.value })}>
          <option value="">Any way</option><option value="fingerprint">Fingerprint</option><option value="face">Face</option><option value="card">Card</option><option value="barcode">Barcode</option><option value="qr">QR</option>
        </select>
        <input className="form-input" style={{ maxWidth: 220 }} placeholder="Name, roll no, user no." value={f.search} onChange={(e) => set({ search: e.target.value })} aria-label="Search punches" />
      </div>
      {isError ? <div className="alert alert-danger">{errText(error, 'The punches could not be loaded.')}</div> : isLoading ? <div className="loading-center"><div className="spinner" /></div> : (
        <>
          <div style={{ ...hint, marginBottom: 6 }}>{data.total} punch{data.total === 1 ? '' : 'es'}</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>Name</th><th>Class / Designation</th><th>How</th><th>In / Out</th><th>Machine</th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const [label, tone] = p.matched === false ? ['Waiting', 'badge-yellow'] : DIR[p.direction] || DIR.in;
                  return (
                    <tr key={p.id} style={p.matched === false ? { background: '#FFFBEB' } : undefined}>
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>{when(p.punchTime)}</td>
                      <td style={{ fontWeight: 600 }}>{p.person?.name}{p.pin && p.matched === false && <div style={hint}>user {p.pin}</div>}</td>
                      <td style={{ fontSize: 12.5 }}>{[p.person?.className, p.person?.sectionName].filter(Boolean).join(' — ')}</td>
                      <td style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{p.method}</td>
                      <td><span className={`badge ${tone}`}>{label}</span></td>
                      <td style={{ fontSize: 12.5 }}>{p.deviceName || '—'}</td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={6} style={{ color: '#64748B' }}>No punches for this choice.</td></tr>}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={13} /> Newer</button>
              <span style={hint}>Page {page} of {pages}</span>
              <button type="button" className="btn btn-sm btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older <ChevronRight size={13} /></button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
