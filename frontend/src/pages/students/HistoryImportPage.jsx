/**
 * IlmForge — Past Records.
 *
 * A school that starts using IlmForge part-way through brings its history:
 * past fees (month by month, or each student's previous balance), past
 * salaries and past expenses, from one Excel workbook. Every row is filed on
 * the day it really happened, so the dashboard, reports and each student's
 * fee record are complete from the first day.
 *
 *   Download template  -> the four sheets, with the school's students and
 *                         staff listed to copy roll numbers and codes from
 *   Import             -> check the file, preview every problem, then import
 *   Earlier imports    -> what each import added, and Undo
 *
 * Same flow and look as Import & Export (RecordsImportExportPage). The work
 * is done by /history on the server (services/history.service.js).
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  Info, RefreshCw, History, Undo2, CalendarClock,
} from 'lucide-react';
import api from '../../api/client';
import { money } from '../../utils/currency';

const CHUNK = 100; // rows per request
const SHEETS = [
  { key: 'fees', label: 'Fee History' },
  { key: 'balances', label: 'Previous Balance' },
  { key: 'salaries', label: 'Salary History' },
  { key: 'expenses', label: 'Expenses' },
];
const SHOW_ISSUES = 500;

/* Fetch a file the API builds, with the auth header, and save it. */
async function saveFromApi(url, fallbackName) {
  const res = await api.get(url, { responseType: 'blob' });
  const cd = res.headers['content-disposition'] || '';
  const name = (cd.match(/filename="([^"]+)"/) || [])[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
  return name;
}

const toBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error('The file could not be read.'));
  r.readAsDataURL(file);
});

// The check reports rupees; the earlier-imports list reports paisa.
const rupees = (n) => money(Math.round((Number(n) || 0) * 100));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const when = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const LEVEL = {
  error:   { Icon: XCircle,       color: '#B23742' },
  warning: { Icon: AlertTriangle, color: '#9A6408' },
  info:    { Icon: Info,          color: '#5E6B67' },
};

const toImport = (rows) => rows.filter((r) => r.action === 'create' || r.action === 'add-payment');

export default function HistoryImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(''); // 'template' | 'checking' | 'importing'
  const [fileName, setFileName] = useState('');
  const [check, setCheck] = useState(null);
  const [filter, setFilter] = useState('error');
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null); // { batchId, bySheet: { fees: [...] }, stopped, leftOut }

  const { data: batches = [], refetch: refetchBatches } = useQuery({
    queryKey: ['history-batches'],
    queryFn: () => api.get('/history/batches').then((r) => r.data.data || []),
  });

  const reset = () => {
    setCheck(null); setResults(null); setProgress(null); setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const getTemplate = async () => {
    setBusy('template');
    try { await saveFromApi('/history/template', 'past-records.xlsx'); toast.success('Template downloaded'); }
    catch { toast.error('The template could not be downloaded. Try again.'); }
    finally { setBusy(''); }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      toast.error('Choose an Excel workbook (.xlsx). Older .xls and .csv files need to be saved as .xlsx first.');
      e.target.value = '';
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error('This file is over 6 MB. Split it into smaller files, for example one per year.');
      e.target.value = '';
      return;
    }
    setFileName(file.name); setResults(null); setCheck(null); setBusy('checking');
    try {
      const b64 = await toBase64(file);
      const r = await api.post('/history/validate', { file: b64 }, { timeout: 120000 });
      setCheck(r.data.data);
      const s = r.data.data.summary;
      setFilter(s.errors ? 'error' : s.warnings ? 'warning' : 'info');
    } catch (err) {
      toast.error(err.response?.data?.message || 'The file could not be checked.');
      setFileName('');
    } finally {
      setBusy('');
      e.target.value = '';
    }
  };

  const runImport = async () => {
    const plan = SHEETS.map((s) => ({ ...s, rows: toImport(check.rows[s.key] || []) })).filter((s) => s.rows.length);
    const total = plan.reduce((t, s) => t + s.rows.length, 0);
    if (!total) return;

    setBusy('importing');
    setProgress({ done: 0, total });
    const bySheet = {};
    let stopped = false;
    try {
      for (const sheet of plan) {
        bySheet[sheet.key] = [];
        for (let i = 0; i < sheet.rows.length; i += CHUNK) {
          const part = sheet.rows.slice(i, i + CHUNK);
          const r = await api.post('/history/import', { batchId: check.batchId, sheet: sheet.key, rows: part }, { timeout: 120000 });
          bySheet[sheet.key].push(...r.data.data.results);
          setProgress((p) => ({ ...p, done: p.done + part.length }));
        }
      }
      const added = Object.values(bySheet).flat().filter((x) => x.status === 'imported' || x.status === 'payment added').length;
      toast.success(`${plural(added, 'record', 'records')} added from old records`);
    } catch (err) {
      stopped = true;
      toast.error(err.response?.data?.message || 'The import stopped part-way. What was imported is saved: upload the same file again to finish, rows already imported are skipped.');
    } finally {
      const leftOut = SHEETS.reduce((t, sh) => t + (check.rows[sh.key] || []).filter((r) => r.action === 'error').length, 0);
      setResults({ batchId: check.batchId, bySheet, stopped, leftOut });
      setBusy('');
      refetchBatches();
      // Fees, payroll, expenses and the dashboard all change.
      qc.invalidateQueries();
    }
  };

  const s = check?.summary;
  const willImport = s ? s.fees.create + s.balances.create + s.salaries.create + s.expenses.create : 0;
  const counts = {
    error: check?.issues.filter((i) => i.level === 'error').length || 0,
    warning: check?.issues.filter((i) => i.level === 'warning').length || 0,
    info: check?.issues.filter((i) => i.level === 'info').length || 0,
  };
  const issues = (check?.issues || []).filter((i) => i.level === filter);

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={20} color="#0F3D33" /> Past Records
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Fees, salaries and expenses from before the school used IlmForge, each on the date it happened
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 18 }}>
        <ActionCard
          step="1" title="Download the template" Icon={FileSpreadsheet}
          text="Fee History, Previous Balance, Salary History and Expenses sheets, with your students and staff listed to copy roll numbers and codes from."
          button={busy === 'template' ? 'Preparing…' : 'Download template'}
          ButtonIcon={Download} onClick={getTemplate} disabled={!!busy}
        />
        <ActionCard
          step="2" title="Import the filled file" Icon={Upload}
          text="Upload the workbook. You see every problem by row, and the rupee totals, before anything is saved."
          button={busy === 'checking' ? 'Checking file…' : 'Choose Excel file'}
          ButtonIcon={Upload} primary disabled={!!busy}
          onClick={() => fileRef.current?.click()}
        />
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" style={stepStyle}><CalendarClock size={14} /></span>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Only a few entries?</div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Enter them directly, with the date they really happened:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
            <li><Link to="/fees/collect" style={linkStyle}>Fee Collection</Link>: <em>Payment date</em></li>
            <li><Link to="/payroll" style={linkStyle}>Payroll</Link>: <em>Paid on</em></li>
            <li><Link to="/expenses" style={linkStyle}>Expenses</Link>: <em>Date</em></li>
          </ul>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx" aria-label="Excel file of past records"
        style={{ display: 'none' }} onChange={onFile} />

      {/* ── Preview ───────────────────────────────────────── */}
      {check && !results && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="card-title">Check before importing</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fileName} · nothing has been saved yet</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={reset}><RefreshCw size={13} /> Choose another file</button>
          </div>

          <div className="card-body">
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: 16 }}>
              <Tally label="Fee History" t={s.fees} lines={[
                s.fees.billed ? `${rupees(s.fees.billed)} billed` : null,
                s.fees.paid ? `${rupees(s.fees.paid)} received` : null,
                s.fees.addPayments ? `${plural(s.fees.addPayments, 'payment', 'payments')} for bills already here` : null,
              ]} />
              <Tally label="Previous Balance" t={s.balances} lines={[s.balances.amount ? `${rupees(s.balances.amount)} owed` : null]} />
              <Tally label="Salary History" t={s.salaries} lines={[
                s.salaries.paid ? `${rupees(s.salaries.paid)} paid` : null,
                s.salaries.unpaid ? `${rupees(s.salaries.unpaid)} unpaid` : null,
              ]} />
              <Tally label="Expenses" t={s.expenses} lines={[
                s.expenses.amount ? `${rupees(s.expenses.amount)} spent` : null,
                s.expenses.newCategories ? `${plural(s.expenses.newCategories, 'new category', 'new categories')}` : null,
              ]} />
            </div>

            {counts.error > 0 && (
              <div style={{ background: '#D6455014', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14, color: 'var(--text-primary)' }}>
                <strong>{counts.error} {counts.error === 1 ? 'row has a problem' : 'rows have problems'}</strong> and will be left out.
                Fix them in Excel and upload again, or import the rest now and add those later. Importing the same file
                again is safe: rows already added are skipped.
              </div>
            )}

            {check.issues.length > 0 && (
              <>
                <div role="tablist" aria-label="Filter messages" style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {['error', 'warning', 'info'].map((l) => (
                    <button key={l} role="tab" aria-selected={filter === l}
                      className={`btn btn-sm ${filter === l ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setFilter(l)} disabled={!counts[l]}>
                      {l === 'error' ? 'Problems' : l === 'warning' ? 'Worth checking' : 'Notes'} ({counts[l]})
                    </button>
                  ))}
                </div>
                <div className="table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Sheet</th><th>Row</th><th>Column</th><th>What to check</th></tr></thead>
                    <tbody>
                      {issues.slice(0, SHOW_ISSUES).map((i, n) => {
                        const L = LEVEL[i.level];
                        return (
                          <tr key={n}>
                            <td style={{ whiteSpace: 'nowrap' }}>{i.sheet}</td>
                            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{i.row}</td>
                            <td>{i.field}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
                                <L.Icon size={14} style={{ color: L.color, flexShrink: 0, marginTop: 3 }} />
                                {i.message}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {issues.length > SHOW_ISSUES && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Showing the first {SHOW_ISSUES} of {issues.length}. Fix these and check the file again to see the rest.
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 560 }}>
              {willImport
                ? 'Each row is filed on its own date. No message is sent to parents or staff, and the whole import can be undone afterwards.'
                : 'There is nothing new to import in this file.'}
            </span>
            <button className="btn btn-success" onClick={runImport} disabled={!willImport || !!busy}>
              <CheckCircle2 size={15} /> Import {plural(willImport, 'row', 'rows')}
            </button>
          </div>
        </div>
      )}

      {/* ── Progress ──────────────────────────────────────── */}
      {busy === 'importing' && progress && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <strong>Importing…</strong>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress.done} of {progress.total}</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}
              style={{ height: 8, background: 'var(--border, #e5e7eb)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(progress.done / progress.total) * 100}%`, height: '100%', background: '#0F3D33', transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Keep this page open until it finishes.</div>
          </div>
        </div>
      )}

      {/* ── Done ──────────────────────────────────────────── */}
      {results && <Done results={results} onAgain={reset} />}

      {/* ── Earlier imports ───────────────────────────────── */}
      {batches.length > 0 && (
        <EarlierImports batches={batches} onUndone={() => { refetchBatches(); qc.invalidateQueries(); }} />
      )}

      {/* ── How it works (only before a file is chosen) ───── */}
      {!check && !results && (
        <div className="card">
          <div className="card-header"><div className="card-title">How it works</div></div>
          <div className="card-body" style={{ fontSize: 13.5, lineHeight: 1.7, display: 'grid', gap: 8 }}>
            <p style={{ margin: 0 }}><strong>First add your students and staff</strong> in <Link to="/settings/import-export" style={linkStyle}>Import &amp; Export</Link>, including those who have left (students: Status Inactive; staff: Status Left). Past records find them by roll number and employee code.</p>
            <p style={{ margin: 0 }}><strong>Fee History</strong> has one row per student per month: the bill, what was paid and on which day. Or use <strong>Previous Balance</strong> for just what each student still owed; it becomes one unpaid bill you can collect in Fee Collection. Use one or the other for the same months, not both. Anything left unpaid is a real due that parents see and are reminded about, so enter an amount the school has written off as Concession.</p>
            <p style={{ margin: 0 }}><strong>Salary History</strong> has one row per staff member per month, Paid or Unpaid. Paid salaries are also counted under the expense category Salaries, so do not list them again on the <strong>Expenses</strong> sheet.</p>
            <p style={{ margin: 0 }}>Months are written <strong>07/2025</strong>, dates day first: <strong>08/07/2025</strong> is 8 July 2025. Amounts in rupees. A month already in IlmForge is skipped, so importing the same file twice adds nothing.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Done({ results, onAgain }) {
  const all = Object.values(results.bySheet).flat();
  const added = (key) => (results.bySheet[key] || []).filter((x) => x.status === 'imported').length;
  const paymentsAdded = (results.bySheet.fees || []).filter((x) => x.status === 'payment added').length;
  const failed = all.filter((x) => x.status === 'failed' || x.status === 'not imported');
  const skipped = all.filter((x) => x.status === 'skipped').length;
  const parts = [
    added('fees') && plural(added('fees'), 'fee bill', 'fee bills'),
    paymentsAdded && plural(paymentsAdded, 'payment on an existing bill', 'payments on existing bills'),
    added('balances') && plural(added('balances'), 'previous balance', 'previous balances'),
    added('salaries') && plural(added('salaries'), 'salary month', 'salary months'),
    added('expenses') && plural(added('expenses'), 'expense', 'expenses'),
  ].filter(Boolean);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-body" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {results.stopped ? <AlertTriangle size={26} color="#9A6408" /> : <CheckCircle2 size={26} color="#1F9D6B" />}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {parts.length ? `Added ${parts.join(', ')}` : 'Nothing new was added'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {results.stopped
                ? 'The import stopped part-way. What is listed here is saved: upload the same file again to finish.'
                : `They now show in reports, the dashboard, each student's fee record and Payroll, on their own dates.${skipped ? ` ${plural(skipped, 'row was', 'rows were')} already in IlmForge and skipped.` : ''}`}
            </div>
          </div>
        </div>

        {results.leftOut > 0 && (
          <div style={{ background: '#D6455014', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <strong>{plural(results.leftOut, 'row with a problem was', 'rows with problems were')} left out.</strong> Fix
            {results.leftOut === 1 ? ' it' : ' them'} in Excel and import the same file again: rows already added are skipped.
          </div>
        )}

        {failed.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{plural(failed.length, 'row was', 'rows were')} not imported</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 3, maxHeight: 220, overflowY: 'auto' }}>
              {failed.slice(0, 200).map((f, i) => <li key={i}>Row {f.row}, {f.label}: {f.error}</li>)}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={onAgain}><Upload size={13} /> Import another file</button>
          <Link className="btn btn-outline btn-sm" to="/fees/collection-report">Fee reports</Link>
          <Link className="btn btn-outline btn-sm" to="/payroll">Payroll</Link>
        </div>
      </div>
    </div>
  );
}

function EarlierImports({ batches, onUndone }) {
  const [confirming, setConfirming] = useState(null);
  const [working, setWorking] = useState(null);

  const undo = async (b) => {
    setWorking(b.batchId);
    try {
      const r = await api.delete(`/history/batches/${b.batchId}`, { timeout: 120000 });
      const c = r.data.data;
      toast.success(`Import undone: removed ${[c.bills && plural(c.bills, 'bill', 'bills'), c.payments && plural(c.payments, 'payment', 'payments'), c.salaries && plural(c.salaries, 'salary month', 'salary months'), c.expenses && plural(c.expenses, 'expense', 'expenses')].filter(Boolean).join(', ') || 'nothing'}`);
      setConfirming(null);
      onUndone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'The import could not be undone.', { duration: 9000 });
    } finally {
      setWorking(null);
    }
  };

  const what = (x) => [
    x.bills && plural(x.bills, 'bill', 'bills'),
    x.payments && plural(x.payments, 'payment', 'payments'),
    x.salaries && plural(x.salaries, 'salary month', 'salary months'),
    x.expenses && plural(x.expenses, 'expense', 'expenses'),
  ].filter(Boolean).join(' · ');

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><div className="card-title">Earlier imports</div></div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Imported</th><th>By</th><th>In IlmForge now</th><th style={{ textAlign: 'right' }}>Amount</th><th /></tr></thead>
          <tbody>
            {batches.map((b) => {
              const left = what(b.stillIn);
              return (
                <tr key={b.batchId}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(b.startedAt)}</td>
                  <td>{b.by || '—'}</td>
                  <td>{b.undoneAt ? <span style={{ color: 'var(--text-muted)' }}>Undone {when(b.undoneAt)}</span> : left || <span style={{ color: 'var(--text-muted)' }}>Nothing left</span>}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(b.totalPaisa)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {!b.undoneAt && left && (confirming === b.batchId ? (
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5 }}>Remove {left}?</span>
                        <button className="btn btn-sm btn-danger" onClick={() => undo(b)} disabled={working === b.batchId}>
                          {working === b.batchId ? 'Undoing…' : 'Yes, undo'}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => setConfirming(null)} disabled={working === b.batchId}>Keep</button>
                      </span>
                    ) : (
                      <button className="btn btn-sm btn-outline" onClick={() => setConfirming(b.batchId)}>
                        <Undo2 size={13} /> Undo
                      </button>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const linkStyle = { color: 'var(--primary, #0F3D33)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 };

const stepStyle = {
  width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center',
  background: '#0F3D3314', color: '#0F3D33', fontWeight: 700, fontSize: 13, flexShrink: 0,
};

function ActionCard({ step, title, text, button, ButtonIcon, onClick, disabled, primary, Icon }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={stepStyle}>{step}</span>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
        <Icon size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} aria-hidden="true" />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, flex: 1 }}>{text}</p>
      <button className={`btn ${primary ? 'btn-primary' : 'btn-outline'}`} onClick={onClick} disabled={disabled}
        style={{ justifyContent: 'center' }}>
        <ButtonIcon size={14} /> {button}
      </button>
    </div>
  );
}

function Tally({ label, t, lines }) {
  const shown = lines.filter(Boolean);
  return (
    <div style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', margin: '2px 0' }}>
        {t.create} <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)' }}>to add</span>
      </div>
      {shown.map((l) => <div key={l} style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{l}</div>)}
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {t.total === 0 ? 'Sheet left empty' : t.skip ? `${t.skip} already in IlmForge` : 'none already in IlmForge'}
        {t.error ? <span style={{ color: '#B23742' }}> · {t.error} with problems</span> : null}
      </div>
    </div>
  );
}
