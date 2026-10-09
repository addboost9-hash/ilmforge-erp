/**
 * IlmForge — Fee Collection Report
 * The fees RECEIVED in a month or between two days, then printed or
 * downloaded as CSV / Excel. A fee is listed on the day it was paid, so a
 * fee keyed in late (or entered from old records) falls in the right month;
 * "Entered" shows when it was keyed in on a later day.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { BarChart2, FileDown, FileSpreadsheet, Printer, Search, History } from 'lucide-react';
import { downloadCSV, downloadExcel } from '../../utils/export';
import { printHTML, printDocumentShell } from '../../utils/print';
import { money, toPaisa } from '../../utils/currency';
import { SkeletonRows } from '../../components/Skeleton';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Pakistan's today (UTC+5 all year), whatever zone this computer is set to.
const todayPKT = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const thisMonth = () => {
  const [year, month] = todayPKT().split('-').map(Number);
  return { month, year };
};
// This year and the five before it.
const yearOptions = () => {
  const { year } = thisMonth();
  return Array.from({ length: 6 }, (_, i) => year - i);
};

// The export's row amounts are rupees (they go straight into a spreadsheet);
// its totals are paisa like every other API figure.
const rupees = v => Number(v || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
const rowPaisa = (rows, key) => rows.reduce((t, r) => t + toPaisa(r[key]), 0);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The server sends at most this many rows for one period.
const ROW_CAP = 5000;
const IMPORTED = 'Imported';

const COLUMN_WIDTHS = {
  'Date': 12, 'Receipt No': 24, 'Voucher No': 16, 'Student': 24, 'Roll No': 12, 'Class': 14,
  'Fee': 24, 'Fee Month': 16, 'Amount (Rs)': 13, 'Discount (Rs)': 13, 'Method': 12,
  'Received By': 20, 'Entered On': 12,
};

const paramsOf = (f) => (f.mode === 'range'
  ? { from: f.from || undefined, to: f.to || undefined }
  : { month: f.month, year: f.year });

// "October 2026" -> "October-2026", "01/10/2026 to 09/10/2026" -> "01-10-2026_to_09-10-2026"
const fileLabel = period => String(period || 'report').replace(/\//g, '-').replace(/\s+/g, '_');

function printReport({ rows, period, totalAmount, totalDiscount, school }) {
  const later = rows.filter(r => r['Entered On']).length;
  const body = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1B2F6E;padding-bottom:8px;margin-bottom:12px">
      <div>
        <div style="font-size:18px;font-weight:800">${esc(school.name)}</div>
        ${school.address ? `<div style="font-size:11px;color:#64748B">${esc(school.address)}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:800;color:#1B2F6E">Fee Collection Report</div>
        <div style="font-size:12px">${esc(period)}</div>
      </div>
    </div>
    <p style="font-size:12px;margin:0 0 10px">
      ${rows.length} payment${rows.length === 1 ? '' : 's'} &middot; Collected <b>${money(totalAmount)}</b>
      ${totalDiscount ? ` &middot; Discount ${money(totalDiscount)}` : ''}
      ${later ? ` &middot; ${later} entered on a later day` : ''}
    </p>
    <table style="font-size:10.5px">
      <thead><tr>
        ${['#', 'Paid on', 'Receipt', 'Student', 'Class', 'Fee', 'Fee month', 'Method', 'Received by', 'Amount (Rs)']
          .map(h => `<th style="text-align:left;padding:5px 6px;border-bottom:1px solid #94A3B8;background:#F1F5F9">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${i + 1}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0;white-space:nowrap">${esc(r['Date'])}${r['Entered On'] ? `<div style="font-size:9px;color:#92400E">entered ${esc(r['Entered On'])}</div>` : ''}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${esc(r['Receipt No'])}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${esc(r['Student'])}${r['Roll No'] ? ` <span style="color:#64748B">(${esc(r['Roll No'])})</span>` : ''}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${esc(r['Class'])}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${esc(r['Fee'])}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${esc(r['Fee Month'])}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${esc(r['Method'])}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0">${esc(r['Received By'])}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700">${rupees(r['Amount (Rs)'])}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr>
        <td colspan="9" style="padding:6px;font-weight:800;border-top:2px solid #1B2F6E">Total</td>
        <td style="padding:6px;text-align:right;font-weight:800;border-top:2px solid #1B2F6E">${rupees(totalAmount / 100)}</td>
      </tr></tfoot>
    </table>
    <p style="font-size:10px;color:#64748B;margin-top:10px">
      Fees are listed on the day they were received. "Entered" marks a fee keyed in on a later day;
      "${IMPORTED}" marks old records entered into IlmForge. Printed ${esc(new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }))}.
    </p>`;
  const title = `Fee Collection Report — ${period}`;
  printHTML(printDocumentShell({ title, body, size: 'A4 landscape', margin: '10mm' }), { title });
}

export default function FeeCollectionReportPage() {
  const { school } = useAuthStore();
  const [form, setForm] = useState(() => ({ mode: 'month', ...thisMonth(), from: '', to: '' }));
  // What the table shows: this month until the user picks another period.
  const [applied, setApplied] = useState(() => ({ mode: 'month', ...thisMonth() }));
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');

  const params = paramsOf(applied);
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['fee-collection-report', params],
    queryFn: () => api.get('/fees/payments/export', { params }).then(r => r.data),
    // A fee entered a minute ago must show when the report is opened again.
    staleTime: 30_000,
    refetchOnMount: true,
  });

  const rows          = data?.data || [];
  const period        = data?.period || '';
  const totalAmount   = data?.totalAmount || 0;
  const totalDiscount = data?.totalDiscount || 0;
  const enteredLater  = rows.filter(r => r['Entered On']).length;
  const imported      = rows.filter(r => r['Received By'] === IMPORTED).length;

  const q = search.trim().toLowerCase();
  const shown = q
    ? rows.filter(r => ['Student', 'Roll No', 'Receipt No', 'Voucher No', 'Class', 'Received By']
      .some(k => String(r[k] || '').toLowerCase().includes(q)))
    : rows;

  const set = (patch) => { setForm(f => ({ ...f, ...patch })); setFormError(''); };

  function handleLoad() {
    if (form.mode === 'range') {
      if (!form.from && !form.to) return setFormError('Choose a from date, a to date, or both.');
      if (form.from && form.to && form.from > form.to) return setFormError('The from date is after the to date.');
    }
    const next = form.mode === 'range'
      ? { mode: 'range', from: form.from, to: form.to }
      : { mode: 'month', month: form.month, year: form.year };
    // Asking again for the same period reloads it (a payment may just have been entered).
    if (JSON.stringify(paramsOf(next)) === JSON.stringify(params)) refetch();
    else setApplied(next);
  }

  function handleExportCSV() {
    if (rows.length) downloadCSV(rows, `fee-collection-${fileLabel(period)}.csv`);
  }

  async function handleExportExcel() {
    if (!rows.length) return;
    const columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: COLUMN_WIDTHS[k] || 16 }));
    await downloadExcel(rows, `fee-collection-${fileLabel(period)}.xlsx`, 'Fee Collection', columns);
  }

  function handlePrint() {
    if (!rows.length) return;
    printReport({
      rows, period, totalAmount, totalDiscount,
      school: {
        name: school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School',
        address: school?.address || '',
      },
    });
  }

  const loading = isLoading || (isFetching && !rows.length);
  const segBtn = active => ({
    padding: '7px 14px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
    background: active ? '#1B2F6E' : '#fff', color: active ? '#fff' : '#475569',
  });

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Fee Collection Report</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Fees received in a month or between two dates, by the day they were paid
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handlePrint} disabled={!rows.length}>
            <Printer size={14} /> Print
          </button>
          <button className="btn btn-outline" onClick={handleExportCSV} disabled={!rows.length}>
            <FileDown size={14} /> Download CSV
          </button>
          <button className="btn btn-teal" onClick={handleExportExcel} disabled={!rows.length}>
            <FileSpreadsheet size={14} /> Download Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Report by</label>
            <div role="group" aria-label="Report by" style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <button type="button" style={segBtn(form.mode === 'month')} aria-pressed={form.mode === 'month'} onClick={() => set({ mode: 'month' })}>Month</button>
              <button type="button" style={segBtn(form.mode === 'range')} aria-pressed={form.mode === 'range'} onClick={() => set({ mode: 'range' })}>Between dates</button>
            </div>
          </div>

          {form.mode === 'month' ? (
            <>
              <div>
                <label className="form-label" htmlFor="fcr-month">Month</label>
                <select id="fcr-month" className="form-select" style={{ width: 150 }}
                  value={form.month} onChange={e => set({ month: Number(e.target.value) })}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="fcr-year">Year</label>
                <select id="fcr-year" className="form-select" style={{ width: 110 }}
                  value={form.year} onChange={e => set({ year: Number(e.target.value) })}>
                  {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="form-label" htmlFor="fcr-from">From</label>
                <input id="fcr-from" className="form-input" type="date" style={{ width: 160 }} max={todayPKT()}
                  value={form.from} onChange={e => set({ from: e.target.value })} />
              </div>
              <div>
                <label className="form-label" htmlFor="fcr-to">To</label>
                <input id="fcr-to" className="form-input" type="date" style={{ width: 160 }} max={todayPKT()}
                  value={form.to} onChange={e => set({ to: e.target.value })} />
              </div>
            </>
          )}

          <button className="btn btn-teal" onClick={handleLoad} disabled={isFetching}>
            <BarChart2 size={14} /> {isFetching ? 'Loading...' : 'Show Report'}
          </button>
        </div>
        {formError && <div style={{ color: '#B91C1C', fontSize: 12.5, marginTop: 8 }}>{formError}</div>}
        {form.mode === 'range' && !formError && (
          <div style={{ color: '#94A3B8', fontSize: 11.5, marginTop: 8 }}>
            Leave "From" empty to start at the first record, or "To" empty to end today.
          </div>
        )}
      </div>

      {/* Summary */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div className="card" style={{ background: '#eff6ff', border: 'none', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1B2F6E' }}>{rows.length.toLocaleString('en-PK')}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Payments — {period}</div>
          </div>
          <div className="card" style={{ background: '#f0fdf4', border: 'none', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#15803D' }}>{money(totalAmount)}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Total Collected</div>
          </div>
          <div className="card" style={{ background: '#faf5ff', border: 'none', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6D28D9' }}>{money(totalDiscount)}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Discount Given</div>
          </div>
          <div className="card" style={{ background: '#fffbeb', border: 'none', padding: 14, textAlign: 'center' }}
            title="Fees keyed in on a later day than they were paid">
            <div style={{ fontSize: 22, fontWeight: 800, color: '#B45309' }}>{enteredLater}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              Entered on a later day{imported ? ` · ${imported} from old records` : ''}
            </div>
          </div>
        </div>
      )}

      {rows.length >= ROW_CAP && (
        <div className="alert alert-warning" style={{ marginBottom: 14, fontSize: 13 }}>
          Only the first {ROW_CAP.toLocaleString('en-PK')} payments of this period are shown. Choose a shorter period to see them all.
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length > 0 && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input className="form-input" style={{ paddingLeft: 30 }} placeholder="Find a student, roll no or receipt..."
                aria-label="Find a student, roll number or receipt" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {q && <span style={{ fontSize: 12, color: '#64748B' }}>{shown.length} of {rows.length} payments</span>}
          </div>
        )}

        {loading ? (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>{['Paid on', 'Receipt No', 'Student', 'Class', 'Fee', 'Fee Month', 'Amount', 'Method', 'Received By'].map(col => <th key={col}>{col}</th>)}</tr>
              </thead>
              <tbody><SkeletonRows rows={7} cols={9} /></tbody>
            </table>
          </div>
        ) : isError ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-text">
              {error?.response?.data?.message || 'The report could not be loaded. Please try again.'}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No fees were received{period ? ` in ${period}` : ' in this period'}.</div>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-text">No payment matches "{search}".</div>
          </div>
        ) : (
          <div className="table-wrap skeleton-content-fade" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paid on</th>
                  <th>Receipt No</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Fee</th>
                  <th>Fee Month</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Discount</th>
                  <th>Method</th>
                  <th>Received By</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row, idx) => (
                  <tr key={`${row['Receipt No']}-${idx}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {row['Date']}
                      {row['Entered On'] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#B45309', marginTop: 2 }}
                          title={`Paid on ${row['Date']}, keyed in on ${row['Entered On']}`}>
                          <History size={11} /> Entered {row['Entered On']}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row['Receipt No'] || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1E3A5F' }}>{row['Student'] || '—'}</div>
                      {row['Roll No'] && <div style={{ fontSize: 11, color: '#94A3B8' }}>Roll: {row['Roll No']}</div>}
                    </td>
                    <td>{row['Class'] || '—'}</td>
                    <td style={{ fontSize: 12.5 }}>{row['Fee'] || '—'}</td>
                    <td style={{ fontSize: 12.5, color: '#475569' }}>{row['Fee Month'] || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803D' }}>{rupees(row['Amount (Rs)'])}</td>
                    <td style={{ textAlign: 'right', color: '#6D28D9' }}>{row['Discount (Rs)'] ? rupees(row['Discount (Rs)']) : '—'}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: 12.5 }}>{String(row['Method'] || '').replace(/_/g, ' ')}</td>
                    <td>
                      {row['Received By'] === IMPORTED
                        ? <span className="badge badge-gray" title="Entered from old records, not cash anyone received">Imported</span>
                        : (row['Received By'] || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F0FDF4', fontWeight: 800 }}>
                  <td colSpan={6} style={{ padding: '10px 14px', color: '#1E3A5F' }}>
                    Total{q ? ` (${shown.length} shown)` : ''}
                  </td>
                  <td style={{ textAlign: 'right', color: '#15803D' }}>{money(q ? rowPaisa(shown, 'Amount (Rs)') : totalAmount)}</td>
                  <td style={{ textAlign: 'right', color: '#6D28D9' }}>{money(q ? rowPaisa(shown, 'Discount (Rs)') : totalDiscount)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
