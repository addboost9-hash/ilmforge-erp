/**
 * IlmForge — Import & Export records.
 *
 * One page for three jobs, all driven by the same Excel format:
 *   Download template  → fill students and staff in Excel
 *   Import             → check the file, preview every problem, then import
 *   Export             → this school's classes, students and staff, which is
 *                         also how a school moves to another server
 *
 * The import runs in small batches with a progress bar, so a large school
 * never sits on one long request, and nothing is written until the preview
 * has been seen and Import pressed. New logins are shown once, at the end,
 * as a downloadable sheet.
 */
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  Info, RefreshCw, KeyRound, ArrowRightLeft,
} from 'lucide-react';
import api from '../../api/client';

const CHUNK = 25; // people per request

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

/* The sheet of new usernames and passwords, built in the browser so the
   passwords are never sent anywhere else. */
async function downloadLogins(results, schoolLabel) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  const head = (ws) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3D33' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const st = wb.addWorksheet('Students & Parents');
  st.columns = [
    { header: 'Student', key: 'name', width: 24 },
    { header: 'Roll No', key: 'roll', width: 16 },
    { header: 'Student signs in with', key: 'sLogin', width: 20 },
    { header: 'Student password', key: 'sPass', width: 18 },
    { header: 'Parent signs in with', key: 'pLogin', width: 22 },
    { header: 'Parent password', key: 'pPass', width: 30 },
    { header: 'Portal link', key: 'link', width: 50 },
  ];
  head(st);
  results.students.filter(r => r.credentials).forEach(r => st.addRow({
    name: r.name, roll: r.rollNo,
    sLogin: r.credentials.student.loginId, sPass: r.credentials.student.password,
    pLogin: r.credentials.parent.loginId, pPass: r.credentials.parent.password,
    link: r.credentials.parent.portalLink,
  }));

  const sf = wb.addWorksheet('Staff');
  sf.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Employee Code', key: 'code', width: 16 },
    { header: 'Portal', key: 'portal', width: 18 },
    { header: 'Signs in with', key: 'login', width: 28 },
    { header: 'Temporary password', key: 'pass', width: 20 },
    { header: 'Portal link', key: 'link', width: 50 },
  ];
  head(sf);
  results.staff.filter(r => r.credentials).forEach(r => sf.addRow({
    name: r.name, code: r.credentials.empCode, portal: r.credentials.portal,
    login: r.credentials.loginId, pass: r.credentials.password, link: r.credentials.portalLink,
  }));

  const buf = await wb.xlsx.writeBuffer();
  const href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = href; a.download = `${schoolLabel}-login-details-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

const LEVEL = {
  error:   { Icon: XCircle,       color: '#B23742', bg: '#D6455014', label: 'Problem' },
  warning: { Icon: AlertTriangle, color: '#9A6408', bg: '#F2A33A22', label: 'Check' },
  info:    { Icon: Info,          color: '#5E6B67', bg: '#5E6B6712', label: 'Note' },
};

export default function RecordsImportExportPage() {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(''); // 'template' | 'export' | 'checking' | 'importing'
  const [fileName, setFileName] = useState('');
  const [check, setCheck] = useState(null);       // validate response
  const [filter, setFilter] = useState('error');
  const [progress, setProgress] = useState(null);  // { done, total }
  const [results, setResults] = useState(null);

  const reset = () => {
    setCheck(null); setResults(null); setProgress(null); setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const getTemplate = async () => {
    setBusy('template');
    try { await saveFromApi('/bulk/template', 'ilmforge-import-template.xlsx'); toast.success('Template downloaded'); }
    catch { toast.error('The template could not be downloaded. Try again.'); }
    finally { setBusy(''); }
  };

  const doExport = async () => {
    setBusy('export');
    try { const n = await saveFromApi('/bulk/export', 'school-records.xlsx'); toast.success(`Exported ${n}`); }
    catch { toast.error('The export could not be created. Try again.'); }
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
      toast.error('This file is over 6 MB. Split it into smaller files.');
      e.target.value = '';
      return;
    }
    setFileName(file.name); setResults(null); setCheck(null); setBusy('checking');
    try {
      const b64 = await toBase64(file);
      const r = await api.post('/bulk/validate', { file: b64 });
      setCheck(r.data.data);
      setFilter(r.data.data.summary.errors ? 'error' : r.data.data.summary.warnings ? 'warning' : 'info');
    } catch (err) {
      toast.error(err.response?.data?.message || 'The file could not be checked.');
      setFileName('');
    } finally {
      setBusy('');
      e.target.value = '';
    }
  };

  const runImport = async () => {
    const { rows } = check;
    const classes = rows.classes.filter(c => c.action === 'create' || c.action === 'add-sections');
    const staff = rows.staff.filter(s => s.action === 'create');
    const students = rows.students.filter(s => s.action === 'create');
    const total = classes.length + staff.length + students.length;
    if (!total) return;

    setBusy('importing');
    setProgress({ done: 0, total });
    const out = { classes: [], staff: [], students: [] };
    try {
      if (classes.length) {
        const r = await api.post('/bulk/import', { classes });
        out.classes.push(...r.data.data.classes);
        setProgress(p => ({ ...p, done: p.done + classes.length }));
      }
      for (let i = 0; i < staff.length; i += CHUNK) {
        const part = staff.slice(i, i + CHUNK);
        const r = await api.post('/bulk/import', { staff: part });
        out.staff.push(...r.data.data.staff);
        setProgress(p => ({ ...p, done: p.done + part.length }));
      }
      for (let i = 0; i < students.length; i += CHUNK) {
        const part = students.slice(i, i + CHUNK);
        const r = await api.post('/bulk/import', { students: part });
        out.students.push(...r.data.data.students);
        setProgress(p => ({ ...p, done: p.done + part.length }));
      }
      setResults(out);
      const ok = out.students.filter(r => r.status === 'imported').length + out.staff.filter(r => r.status === 'imported').length;
      toast.success(`${ok} ${ok === 1 ? 'record' : 'records'} imported`);
    } catch (err) {
      // Batches already sent are saved; show what made it in.
      setResults(out);
      toast.error(err.response?.data?.message || 'The import stopped part-way. Records already imported are saved — upload the same file again to finish; existing records are skipped.');
    } finally {
      setBusy('');
    }
  };

  const s = check?.summary;
  const willImport = s ? s.classes.create + s.classes.addSections + s.students.create + s.staff.create : 0;
  const issues = (check?.issues || []).filter(i => i.level === filter);
  const counts = {
    error: check?.issues.filter(i => i.level === 'error').length || 0,
    warning: check?.issues.filter(i => i.level === 'warning').length || 0,
    info: check?.issues.filter(i => i.level === 'info').length || 0,
  };
  const imported = results ? {
    students: results.students.filter(r => r.status === 'imported').length,
    staff: results.staff.filter(r => r.status === 'imported').length,
    failed: [...results.students, ...results.staff].filter(r => r.status === 'failed'),
  } : null;

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRightLeft size={20} color="#0F3D33" /> Import &amp; Export Records
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Add students and staff from Excel, or export this school's records to another server
          </p>
        </div>
      </div>

      {/* ── The three actions ─────────────────────────────── */}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 18 }}>
        <ActionCard
          step="1" title="Download the template" Icon={FileSpreadsheet}
          text="An Excel workbook with Classes, Students and Staff sheets, drop-down lists, and your current classes filled in."
          button={busy === 'template' ? 'Preparing…' : 'Download template'}
          ButtonIcon={Download} onClick={getTemplate} disabled={!!busy}
        />
        <ActionCard
          step="2" title="Import the filled file" Icon={Upload}
          text="Upload the workbook. You see every problem by row before anything is saved."
          button={busy === 'checking' ? 'Checking file…' : 'Choose Excel file'}
          ButtonIcon={Upload} primary disabled={!!busy}
          onClick={() => fileRef.current?.click()}
        />
        <ActionCard
          step="↗" title="Export this school" Icon={Download}
          text="All classes, students and staff in the same format. Import it on another server to move the school."
          button={busy === 'export' ? 'Exporting…' : 'Export records'}
          ButtonIcon={Download} onClick={doExport} disabled={!!busy}
        />
      </div>
      <input ref={fileRef} type="file" accept=".xlsx" aria-label="Excel file to import"
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
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 16 }}>
              <Tally label="Students" add={s.students.create} skip={s.students.skip} bad={s.students.error} />
              <Tally label="Staff" add={s.staff.create} skip={s.staff.skip} bad={s.staff.error} />
              <Tally label="Classes" add={s.classes.create} skip={s.classes.exists} extra={s.classes.addSections ? `${s.classes.addSections} get new sections` : null} />
            </div>

            {counts.error > 0 && (
              <div style={{ background: '#D6455014', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 14, color: 'var(--text-primary)' }}>
                <strong>{counts.error} {counts.error === 1 ? 'row has a problem' : 'rows have problems'}</strong> and will be left out.
                Fix them in Excel and upload again, or import the rest now and add those later. Importing the same file
                again is safe: records already added are skipped.
              </div>
            )}

            {check.issues.length > 0 && (
              <>
                <div role="tablist" aria-label="Filter messages" style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {['error', 'warning', 'info'].map(l => (
                    <button key={l} role="tab" aria-selected={filter === l}
                      className={`btn btn-sm ${filter === l ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setFilter(l)} disabled={!counts[l]}>
                      {l === 'error' ? 'Problems' : l === 'warning' ? 'Worth checking' : 'Notes'} ({counts[l]})
                    </button>
                  ))}
                </div>
                <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Sheet</th><th>Row</th><th>Column</th><th>What to fix</th></tr></thead>
                    <tbody>
                      {issues.map((i, n) => {
                        const L = LEVEL[i.level];
                        return (
                          <tr key={n}>
                            <td>{i.sheet}</td>
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
              </>
            )}
          </div>

          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {willImport
                ? 'Each student gets a roll number and student and parent portal logins. Each staff member gets an employee code and a login.'
                : 'There is nothing new to import in this file.'}
            </span>
            <button className="btn btn-success" onClick={runImport} disabled={!willImport || !!busy}>
              <CheckCircle2 size={15} /> Import {willImport} {willImport === 1 ? 'record' : 'records'}
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
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Keep this page open. Each student takes a moment because their portal logins are created as they are added.
            </div>
          </div>
        </div>
      )}

      {/* ── Done ──────────────────────────────────────────── */}
      {results && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={26} color="#1F9D6B" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {imported.students} {imported.students === 1 ? 'student' : 'students'} and {imported.staff} staff imported
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  They are in the registers now, with roll numbers, employee codes and portal logins.
                </div>
              </div>
            </div>

            {(imported.students + imported.staff) > 0 && (
              <div style={{ background: '#F2A33A22', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <KeyRound size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span><strong>Download the login details now.</strong> New passwords are shown only on this screen and cannot be recovered later, only reset.</span>
                </div>
                <button className="btn btn-primary" onClick={() => downloadLogins(results, 'school').catch(() => toast.error('The login sheet could not be created.'))}>
                  <Download size={14} /> Download login details
                </button>
              </div>
            )}

            {imported.failed.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{imported.failed.length} could not be imported</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 3 }}>
                  {imported.failed.map((f, i) => <li key={i}>Row {f.row}, {f.name}: {f.error}</li>)}
                </ul>
              </div>
            )}

            <div><button className="btn btn-outline btn-sm" onClick={reset}><Upload size={13} /> Import another file</button></div>
          </div>
        </div>
      )}

      {/* ── How it works (only before a file is chosen) ───── */}
      {!check && !results && (
        <div className="card">
          <div className="card-header"><div className="card-title">How it works</div></div>
          <div className="card-body" style={{ fontSize: 13.5, lineHeight: 1.7, display: 'grid', gap: 8 }}>
            <p style={{ margin: 0 }}>Fill the <strong>Classes</strong> sheet first, then <strong>Students</strong> and <strong>Staff</strong>. Columns with * are required. Leave Roll No and Employee Code blank and they are created for you.</p>
            <p style={{ margin: 0 }}>Dates are day first: <strong>14/03/2014</strong> is 14 March. Type phone numbers as <strong>03001234567</strong>. The template keeps the leading zero for you.</p>
            <p style={{ margin: 0 }}>Brothers and sisters with the same parent phone share one parent account. Anyone already in the school is skipped, so importing the same file twice never creates duplicates.</p>
            <p style={{ margin: 0 }}><strong>Moving to another server:</strong> export here, then import the file on the new server. Classes, students, parents and staff move across. Fee history, attendance and exam marks are not included, and everyone gets a new password in the login details sheet.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({ step, title, text, button, ButtonIcon, onClick, disabled, primary, Icon }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{
          width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center',
          background: '#0F3D3314', color: '#0F3D33', fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>{step}</span>
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

function Tally({ label, add, skip, bad, extra }) {
  return (
    <div style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', margin: '2px 0' }}>{add} <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-muted)' }}>to add</span></div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {skip ? `${skip} already in school` : 'none already in school'}
        {bad ? <span style={{ color: '#B23742' }}> · {bad} with problems</span> : null}
        {extra ? ` · ${extra}` : null}
      </div>
    </div>
  );
}
