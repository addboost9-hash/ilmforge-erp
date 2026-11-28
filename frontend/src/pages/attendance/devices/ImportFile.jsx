/*
 * Upload a machine's log file (any make): read it here, show what was
 * recognised and who the numbers are, then mark the punches in parts.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, FileCheck2, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import api from '../../../api/client';
import { splitRows, detect, dateOrder, buildPunches, cellText } from '../../../utils/punchFile';
import { errText, hint, num, pkToday, smallSelect } from './shared';

const PART = 500;

/* Excel cells as plain values: text, numbers, Dates. */
function excelValue(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date || typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
  if (v.result !== undefined) return excelValue(v.result);
  if (v.text !== undefined) return String(v.text);
  return '';
}

/* The file's rows, whatever it is. */
async function readRows(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    throw new Error('This is an old Excel file (.xls). Open it in Excel, choose File → Save As → Excel Workbook (.xlsx) or CSV, and upload that.');
  }
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf.buffer);
    let best = null;
    wb.eachSheet((ws) => { if (!best || ws.rowCount > best.rowCount) best = ws; });
    const rows = [];
    best?.eachRow({ includeEmpty: false }, (row) => { rows.push((row.values || []).slice(1).map(excelValue)); });
    return rows;
  }
  // Text: UTF-16 (with a BOM, or full of zero bytes) or UTF-8.
  let enc = 'utf-8';
  if (buf[0] === 0xff && buf[1] === 0xfe) enc = 'utf-16le';
  else if (buf[0] === 0xfe && buf[1] === 0xff) enc = 'utf-16be';
  else if (buf.length > 3 && buf.slice(0, 200).filter((b, i) => i % 2 === 1 && b === 0).length > 40) enc = 'utf-16le';
  const text = new TextDecoder(enc).decode(buf);
  // Some machines save an HTML table with an .xls name.
  if (/^\s*</.test(text) && /<table/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return [...doc.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((c) => c.textContent.trim())).filter((r) => r.some(Boolean));
  }
  return splitRows(text);
}

const colName = (rows, layout, k) => {
  const head = layout.heads?.[k] || '';
  const sample = cellText(rows[layout.header + 1]?.[k]);
  return `${head || `Column ${k + 1}`}${sample ? ` (${sample.slice(0, 22)})` : ''}`;
};
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
const daysAgo = (n) => new Date(Date.now() + 5 * 3600e3 - n * 864e5).toISOString().slice(0, 10);
const niceDay = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function ImportFile({ device, onDone }) {
  const qc = useQueryClient();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [layout, setLayout] = useState(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState('');
  const [who, setWho] = useState(null);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const choose = async (f) => {
    if (!f) return;
    setFile(f); setRows(null); setLayout(null); setReadError(''); setWho(null); setResult(null);
    setReading(true);
    try {
      const r = await readRows(f);
      if (!r.length) throw new Error('The file is empty.');
      const d = detect(r);
      const timeCol = d.cols.dateTime >= 0 ? d.cols.dateTime : d.cols.date;
      const order = dateOrder(r.slice(d.header + 1).map((x) => x[timeCol]));
      setRows(r);
      setLayout({ ...d, order: order === 'either' ? 'dmy' : order, orderSure: order !== 'either', useDir: false, twoCols: d.cols.dateTime < 0 && d.cols.date >= 0 });
    } catch (e) {
      setReadError(e.message || 'The file could not be read.');
    } finally {
      setReading(false);
    }
  };

  const built = useMemo(() => {
    if (!rows || !layout) return null;
    const cols = layout.twoCols ? { ...layout.cols, dateTime: -1 } : { ...layout.cols, date: -1, time: -1 };
    if (cols.id < 0 || (cols.dateTime < 0 && (cols.date < 0 || cols.time < 0))) return { missing: true };
    const b = buildPunches(rows, { ...layout, cols });
    // IlmForge takes in the last 30 days, and nothing ahead of today.
    const from = daysAgo(30);
    const to = pkToday();
    const inRange = b.punches.filter((p) => p.stamp.slice(0, 10) >= from && p.stamp.slice(0, 10) <= to);
    return { ...b, send: inRange, old: b.punches.filter((p) => p.stamp.slice(0, 10) < from).length, future: b.punches.filter((p) => p.stamp.slice(0, 10) > to).length };
  }, [rows, layout]);

  // Who the numbers are (before anything is marked).
  const pinsKey = built?.send ? [...new Set(built.send.map((p) => p.pin))].slice(0, 1500).join(',') : '';
  useEffect(() => {
    if (!pinsKey) { setWho(null); return undefined; }
    let live = true;
    api.post('/biometric/import-check', { pins: pinsKey.split(',') }, { silent: true })
      .then((r) => { if (live) setWho(r.data.data || {}); })
      .catch(() => { if (live) setWho(null); });
    return () => { live = false; };
  }, [pinsKey]);

  const known = who ? Object.values(who).filter(Boolean).length : null;
  const people = pinsKey ? pinsKey.split(',').length : 0;

  const go = async () => {
    const list = built.send;
    const importId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const total = { received: 0, marked: 0, again: 0, notLinked: 0, refused: 0, old: built.old, future: built.future, bad: built.bad.length, unknown: new Map() };
    setProgress({ done: 0, of: list.length });
    try {
      for (let i = 0; i < list.length; i += PART) {
        const r = await api.post(`/biometric/devices/${device.id}/import`, { importId, file: file.name, punches: list.slice(i, i + PART) });
        const d = r.data.data;
        ['received', 'marked', 'again', 'notLinked', 'refused'].forEach((k) => { total[k] += d[k] || 0; });
        total.old += d.old || 0;
        total.future += d.future || 0;
        total.bad += d.bad || 0;
        (d.unknown || []).forEach((u) => total.unknown.set(u.pin, u.name));
        setProgress({ done: Math.min(i + PART, list.length), of: list.length });
      }
      setResult({ ...total, unknown: [...total.unknown.entries()] });
      toast.success(`${plural(total.marked, 'punch', 'punches')} marked from ${file.name}.`);
      qc.invalidateQueries({ queryKey: ['bio-devices'] });
      qc.invalidateQueries({ queryKey: ['bio-punches'] });
    } catch (e) {
      toast.error(errText(e, 'The file could not be taken in.'), { duration: 8000 });
      setResult({ error: errText(e, 'The file could not be taken in.') });
    } finally {
      setProgress(null);
    }
  };

  const reset = () => { setFile(null); setRows(null); setLayout(null); setResult(null); setReadError(''); if (input.current) input.current.value = ''; };
  const set = (patch) => setLayout((l) => ({ ...l, ...patch }));
  const setCol = (k, v) => setLayout((l) => ({ ...l, cols: { ...l.cols, [k]: Number(v) } }));
  const width = layout?.width || 0;
  const options = (none) => [
    ...(none ? [<option key="none" value={-1}>{none}</option>] : []),
    ...Array.from({ length: width }, (_, k) => <option key={k} value={k}>{colName(rows, layout, k)}</option>),
  ];

  if (result && !result.error) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="alert alert-success" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <strong>{file.name}: {plural(result.marked, 'punch', 'punches')} marked</strong>
            <span>
              {[
                result.again && `${num(result.again)} already in`,
                result.notLinked && `${num(result.notLinked)} from ${plural(result.unknown.length, 'user number', 'user numbers')} not linked yet (kept)`,
                result.refused && `${num(result.refused)} refused (people who left)`,
                result.old && `${num(result.old)} older than 30 days left out`,
                result.future && `${num(result.future)} dated after today left out (check the machine's clock)`,
                result.bad && `${plural(result.bad, 'row', 'rows')} not understood`,
              ].filter(Boolean).join(' · ') || 'Nothing else to note.'}
            </span>
          </div>
        </div>
        {result.unknown.length > 0 && (
          <div className="alert alert-warning" style={{ margin: 0, fontSize: 13 }}>
            Not linked yet: {result.unknown.slice(0, 12).map(([pin, name]) => (name ? `${pin} (${name})` : pin)).join(', ')}{result.unknown.length > 12 ? '…' : ''}.{' '}
            <Link to="/attendance/biometric-attendance?view=people#machine-users">Link them on People &amp; fingers</Link>: their punches are then marked at their own times.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm btn-outline" onClick={reset}><RotateCcw size={13} /> Upload another file</button>
          {onDone && <button type="button" className="btn btn-sm btn-teal" onClick={onDone}>Done</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
      {!rows && (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 18, display: 'grid', gap: 8, justifyItems: 'start', background: '#fff' }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files?.[0]); }}>
          <div style={{ fontSize: 13.5, color: '#334155' }}>
            The attendance log from <strong>{device.name}</strong>: on the machine, <strong>Menu → USB Manager (or Data Mgt.) → Download → Attendance</strong> onto a USB stick, then choose the file here. Or drag it onto this box.
          </div>
          <input ref={input} type="file" accept=".dat,.txt,.csv,.tsv,.log,.xls,.xlsx" style={{ display: 'none' }} onChange={(e) => choose(e.target.files?.[0])} aria-label="The machine's log file" />
          <button type="button" className="btn btn-teal btn-sm" disabled={reading} onClick={() => input.current?.click()}><Upload size={14} /> {reading ? 'Reading…' : 'Choose the file'}</button>
          <div style={hint}>attlog.dat, GLG_001.TXT, a CSV or text file, or Excel (.xlsx), from any make. The last 30 days are taken in; the same punch twice is counted once.</div>
          {readError && <div className="alert alert-danger" style={{ margin: 0, fontSize: 13 }}>{readError}</div>}
        </div>
      )}

      {rows && layout && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
            <FileCheck2 size={18} color="#0D9488" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <strong style={{ overflowWrap: 'anywhere' }}>{file.name}</strong> · {layout.label}
              {built && !built.missing && <> · {plural(built.punches.length, 'punch', 'punches')} of {plural(built.people, 'person', 'people')}{built.first && <>, {niceDay(built.first)} to {niceDay(built.last)}</>}</>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569' }}>User number
              <select className="form-select" style={smallSelect} aria-label="User number column" value={layout.cols.id} onChange={(e) => setCol('id', e.target.value)}>{options('Choose…')}</select>
            </label>
            <label style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569' }}>Time is in
              <select className="form-select" style={smallSelect} aria-label="Time is in" value={layout.twoCols ? 'two' : 'one'} onChange={(e) => set({ twoCols: e.target.value === 'two' })}>
                <option value="one">One column (date and time)</option><option value="two">Two columns (date, time)</option>
              </select>
            </label>
            {!layout.twoCols ? (
              <label style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569' }}>Date and time
                <select className="form-select" style={smallSelect} aria-label="Date and time column" value={layout.cols.dateTime} onChange={(e) => setCol('dateTime', e.target.value)}>{options('Choose…')}</select>
              </label>
            ) : (
              <>
                <label style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569' }}>Date
                  <select className="form-select" style={smallSelect} aria-label="Date column" value={layout.cols.date} onChange={(e) => setCol('date', e.target.value)}>{options('Choose…')}</select>
                </label>
                <label style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569' }}>Time
                  <select className="form-select" style={smallSelect} aria-label="Time column" value={layout.cols.time} onChange={(e) => setCol('time', e.target.value)}>{options('Choose…')}</select>
                </label>
              </>
            )}
            {layout.order !== 'ymd' && (
              <label style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569' }}>Dates are written
                <select className="form-select" style={smallSelect} aria-label="Dates are written" value={layout.order} onChange={(e) => set({ order: e.target.value })}>
                  <option value="dmy">Day first (28/11/2026)</option><option value="mdy">Month first (11/28/2026)</option>
                </select>
              </label>
            )}
            {layout.cols.dir >= 0 && (
              <label style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 6 }}>
                <input type="checkbox" checked={layout.useDir} onChange={(e) => set({ useDir: e.target.checked })} /> Use its in / out column
              </label>
            )}
          </div>
          {!layout.orderSure && layout.order !== 'ymd' && <div style={{ ...hint, color: '#B45309' }}>Every date in the file fits both orders (no day above 12): check that the preview below shows the right days.</div>}
          {layout.cols.dir >= 0 && !layout.useDir && <div style={hint}>Arriving and leaving are decided by the time, as for the machines (the first punch of the day is the arrival).</div>}

          {built?.missing ? (
            <div className="alert alert-warning" style={{ margin: 0, fontSize: 13 }}>Choose the column with the user number and the column with the time.</div>
          ) : built && (
            <>
              {(built.old > 0 || built.future > 0 || built.bad.length > 0) && (
                <div className="alert alert-warning" style={{ margin: 0, fontSize: 12.5, display: 'grid', gap: 2 }}>
                  {built.old > 0 && <span>{plural(built.old, 'punch older than 30 days is', 'punches older than 30 days are')} left out.</span>}
                  {built.future > 0 && <span>{plural(built.future, 'punch dated after today is', 'punches dated after today are')} left out: check the machine's date.</span>}
                  {built.bad.length > 0 && <span>{plural(built.bad.length, 'row', 'rows')} could not be read: {built.bad.slice(0, 3).map((b) => `row ${b.row} (${b.why})`).join('; ')}{built.bad.length > 3 ? '…' : ''}.</span>}
                </div>
              )}
              {who && people > 0 && (
                <div style={{ fontSize: 13, color: known === people ? '#15803D' : '#334155' }}>
                  {known === people
                    ? (people === 1 ? 'The user number is known.' : `All ${num(people)} user numbers are known.`)
                    : `${num(known)} of ${plural(people, 'user number is', 'user numbers are')} known. ${people - known === 1 ? 'The other one is' : `The other ${num(people - known)} are`} kept and marked when you link them (People & fingers → Users on the machines).`}
                </div>
              )}
              <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>User no.</th><th>Who</th><th>Time</th>{layout.useDir && <th>In / Out</th>}</tr></thead>
                  <tbody>
                    {built.send.slice(0, 8).map((p) => {
                      const w = who?.[p.pin];
                      return (
                        <tr key={`${p.pin}-${p.stamp}`}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.pin}</td>
                          <td style={{ fontSize: 12.5 }}>{w ? <>{w.name} <span style={{ color: '#64748B' }}>{w.label}</span></> : who ? <span style={{ color: '#B45309' }}>not linked yet{p.name ? ` (${p.name} on the machine)` : ''}</span> : '…'}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{p.stamp.slice(0, 16)}</td>
                          {layout.useDir && <td>{p.dir || '—'}</td>}
                        </tr>
                      );
                    })}
                    {!built.send.length && <tr><td colSpan={4} style={hint}>No punches from the last 30 days in this file.</td></tr>}
                  </tbody>
                </table>
              </div>
              {progress ? (
                <div style={{ display: 'grid', gap: 4 }} role="status">
                  <div style={{ fontSize: 13 }}>Marking… {num(progress.done)} of {num(progress.of)}</div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.round((progress.done / Math.max(progress.of, 1)) * 100)}%`, background: '#0D9488' }} /></div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-teal btn-sm" disabled={!built.send.length} onClick={go}><Upload size={13} /> Mark attendance ({plural(built.send.length, 'punch', 'punches')})</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={reset}>Choose another file</button>
                </div>
              )}
              {result?.error && <div className="alert alert-danger" style={{ margin: 0, fontSize: 13 }}><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {result.error}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}
