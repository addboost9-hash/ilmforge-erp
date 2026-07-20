/**
 * IlmForge — Fee Collection Report
 * Filter payments by month/year or date range, then export as CSV or Excel.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { BarChart2, FileDown, FileSpreadsheet } from 'lucide-react';
import { downloadCSV, downloadExcel } from '../../utils/export';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const money = v => 'Rs. ' + Number(v || 0).toLocaleString();

export default function FeeCollectionReportPage() {
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year:  new Date().getFullYear(),
    from:  '',
    to:    '',
  });
  const [activeFilters, setActiveFilters] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fee-payments-export', activeFilters],
    enabled: !!activeFilters,
    queryFn: () =>
      api.get('/fees/payments/export', { params: activeFilters }).then(r => r.data),
  });

  const rows   = data?.data || [];
  const total  = data?.totalAmount || 0;

  function handleLoad() {
    setActiveFilters({ ...filters });
  }

  async function handleExportExcel() {
    if (!rows.length) return;
    const label = filters.from && filters.to
      ? `${filters.from}_to_${filters.to}`
      : `${MONTHS[filters.month - 1]}-${filters.year}`;

    const columns = Object.keys(rows[0]).map(k => ({ header: k, key: k, width: 18 }));
    await downloadExcel(rows, `fee-collection-${label}.xlsx`, 'Fee Collection', columns);
  }

  function handleExportCSV() {
    if (!rows.length) return;
    const label = filters.from && filters.to
      ? `${filters.from}_to_${filters.to}`
      : `${MONTHS[filters.month - 1]}-${filters.year}`;
    downloadCSV(rows, `fee-collection-${label}.csv`);
  }

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Fee Collection Report</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Export monthly fee payments as Excel or CSV</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={handleExportCSV}
            disabled={!rows.length}
          >
            <FileDown size={14} /> Download CSV
          </button>
          <button
            className="btn btn-teal"
            onClick={handleExportExcel}
            disabled={!rows.length}
          >
            <FileSpreadsheet size={14} /> Download Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              style={{ width: 150 }}
              value={filters.month}
              onChange={e => setFilters({ ...filters, month: parseInt(e.target.value) })}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Year</label>
            <input
              className="form-input"
              type="number"
              style={{ width: 100 }}
              value={filters.year}
              onChange={e => setFilters({ ...filters, year: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="form-label">From Date (optional)</label>
            <input
              className="form-input"
              type="date"
              style={{ width: 160 }}
              value={filters.from}
              onChange={e => setFilters({ ...filters, from: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">To Date (optional)</label>
            <input
              className="form-input"
              type="date"
              style={{ width: 160 }}
              value={filters.to}
              onChange={e => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
          <button
            className="btn btn-teal"
            onClick={handleLoad}
            disabled={isLoading}
            style={{ alignSelf: 'flex-end' }}
          >
            <BarChart2 size={14} /> {isLoading ? 'Loading...' : 'Load Report'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="card" style={{ background: '#eff6ff', border: 'none', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1B2F6E' }}>{rows.length}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Total Transactions</div>
          </div>
          <div className="card" style={{ background: '#f0fdf4', border: 'none', padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#15803D' }}>{money(total)}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Total Collected</div>
          </div>
        </div>
      )}

      {/* Table Preview */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {!activeFilters ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-text">Select month/year and click "Load Report"</div>
          </div>
        ) : isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No payments found for this period</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(rows[0]).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, vi) => (
                      <td key={vi}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
