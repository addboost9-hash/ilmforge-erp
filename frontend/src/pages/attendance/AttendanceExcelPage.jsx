import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Upload, Download, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react';

const TEMPLATE_HEADERS = ['date', 'rollNo', 'studentName', 'status', 'remarks'];
const VALID_STATUSES = ['present', 'absent', 'leave', 'late'];

// Parse a CSV string → array of objects using first row as keys
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], error: 'CSV must have at least a header row and one data row.' };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line, idx) => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = { _rowNum: idx + 2 };
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
  return { headers, rows, error: null };
}

// Validate a parsed row
function validateRow(row) {
  const errors = [];
  if (!row.date) errors.push('date missing');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) errors.push('date must be YYYY-MM-DD');
  if (!row.rollNo && !row.studentName) errors.push('rollNo or studentName required');
  if (!row.status) errors.push('status missing');
  else if (!VALID_STATUSES.includes(row.status.toLowerCase())) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  return errors;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const today = new Date().toISOString().slice(0, 10);
  const sampleRows = [
    [today, 'R-001', 'Muhammad Ali', 'present', ''],
    [today, 'R-002', 'Ahmad Khan',   'absent',  'sick'],
    [today, 'R-003', 'Sara Bibi',    'leave',   'approved leave'],
    [today, 'R-004', 'Fatima Noor',  'late',    'arrived 15 min late'],
  ];
  const csvContent = [
    TEMPLATE_HEADERS.join(','),
    ...sampleRows.map(r => r.join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'attendance_import_template.csv');
}

export default function AttendanceExcelPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [parsed, setParsed] = useState(null);   // { headers, rows, error }
  const [fileName, setFileName] = useState('');
  const [validRows, setValidRows] = useState([]);
  const [errorRows, setErrorRows] = useState([]);
  const [importResult, setImportResult] = useState(null);

  // --- Parse uploaded file ---
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast.error('Please upload a CSV file (.csv)');
      return;
    }
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const result = parseCSV(ev.target.result);
      if (result.error) {
        toast.error(result.error);
        setParsed(null);
        return;
      }
      // Check required headers
      const missing = ['date', 'status'].filter(h => !result.headers.includes(h));
      if (missing.length > 0) {
        toast.error(`Missing required columns: ${missing.join(', ')}`);
        setParsed(null);
        return;
      }
      const vRows = [], eRows = [];
      result.rows.forEach(row => {
        const errs = validateRow(row);
        if (errs.length === 0) vRows.push(row);
        else eRows.push({ ...row, _errors: errs });
      });
      setParsed(result);
      setValidRows(vRows);
      setErrorRows(eRows);
      toast.success(`Parsed ${result.rows.length} rows: ${vRows.length} valid, ${eRows.length} with errors`);
    };
    reader.readAsText(file);
    // reset file input so same file can be re-uploaded
    e.target.value = '';
  }

  function clearUpload() {
    setParsed(null);
    setValidRows([]);
    setErrorRows([]);
    setFileName('');
    setImportResult(null);
  }

  // --- Bulk import mutation ---
  const importMutation = useMutation({
    mutationFn: () =>
      api.post('/attendance/bulk-import', {
        records: validRows.map(r => ({
          date:        r.date,
          rollNo:      r.rollNo || undefined,
          studentName: r.studentName || undefined,
          status:      r.status.toLowerCase(),
          remarks:     r.remarks || undefined,
        })),
      }),
    onSuccess: res => {
      const d = res.data?.data || res.data || {};
      setImportResult(d);
      toast.success(`Import complete: ${d.imported || validRows.length} records saved`);
      qc.invalidateQueries({ queryKey: ['att-summary'] });
      qc.invalidateQueries({ queryKey: ['att-report'] });
    },
    onError: err => toast.error(err.response?.data?.message || 'Import failed'),
  });

  const statusColor = {
    present: { bg: '#DCFCE7', color: '#15803D' },
    absent:  { bg: '#FEE2E2', color: '#B91C1C' },
    leave:   { bg: '#FEF3C7', color: '#B45309' },
    late:    { bg: '#DBEAFE', color: '#1D4ED8' },
  };

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Bulk Attendance Import</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Import attendance records from a CSV file
          </p>
        </div>
      </div>

      {/* Step 1: Download Template */}
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Download size={20} color="#2563EB" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: '0 0 4px' }}>
              Step 1 — Download CSV Template
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
              Download the template, fill in attendance data, then upload below.
              Required columns: <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>date</code>,{' '}
              <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>rollNo</code>,{' '}
              <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>studentName</code>,{' '}
              <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>status</code>,{' '}
              <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>remarks</code>.
            </p>
            <div style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
              padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#475569',
            }}>
              <strong>Status values:</strong> present | absent | leave | late&nbsp;&nbsp;
              <strong>Date format:</strong> YYYY-MM-DD (e.g. 2026-07-15)
            </div>
            <button className="btn btn-primary" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Download Template CSV
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Upload CSV */}
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Upload size={20} color="#15803D" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: '0 0 4px' }}>
              Step 2 — Upload CSV File
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px' }}>
              Select your filled CSV file to preview and validate before importing.
            </p>

            {!parsed ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed #CBD5E1', borderRadius: 10, padding: '32px 20px',
                  textAlign: 'center', cursor: 'pointer', background: '#FAFBFC',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.background = '#F0FDF4'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FAFBFC'; }}
              >
                <FileText size={36} color="#94A3B8" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Click to select CSV file
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Supports .csv files only</div>
              </div>
            ) : (
              <div style={{
                border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px',
                background: '#F0FDF4', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <FileText size={20} color="#15803D" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#15803D' }}>{fileName}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {parsed.rows.length} rows — {validRows.length} valid, {errorRows.length} with errors
                  </div>
                </div>
                <button onClick={clearUpload} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                  <X size={16} />
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
        </div>
      </div>

      {/* Step 3: Preview & Validate */}
      {parsed && (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={16} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Step 3 — Preview Imported Data</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Review rows before importing. Fix errors in your CSV and re-upload if needed.</div>
            </div>
            {validRows.length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: 5, fontWeight: 700 }}>
                  {validRows.length} valid
                </span>
                {errorRows.length > 0 && (
                  <span style={{ fontSize: 12, background: '#FEE2E2', color: '#B91C1C', padding: '3px 10px', borderRadius: 5, fontWeight: 700 }}>
                    {errorRows.length} errors
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Valid rows preview */}
          {validRows.length > 0 && (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Date</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((r, i) => {
                    const sc = statusColor[r.status?.toLowerCase()] || { bg: '#F1F5F9', color: '#64748B' };
                    return (
                      <tr key={i}>
                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{r._rowNum}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.date}</td>
                        <td style={{ fontFamily: 'monospace', color: '#0D9488', fontWeight: 700, fontSize: 12 }}>{r.rollNo || '—'}</td>
                        <td style={{ fontWeight: 600, color: '#1E3A5F' }}>{r.studentName || '—'}</td>
                        <td>
                          <span style={{
                            padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            background: sc.bg, color: sc.color, textTransform: 'capitalize',
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#64748B' }}>{r.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Error rows */}
          {errorRows.length > 0 && (
            <div style={{ borderTop: '1px solid #FECACA', background: '#FFF5F5' }}>
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} color="#B91C1C" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>
                  {errorRows.length} row{errorRows.length > 1 ? 's' : ''} with errors (will be skipped)
                </span>
              </div>
              <div style={{ maxHeight: 150, overflowY: 'auto', padding: '0 16px 12px' }}>
                {errorRows.map((r, i) => (
                  <div key={i} style={{
                    fontSize: 12, color: '#7F1D1D', marginBottom: 4,
                    background: '#FEE2E2', borderRadius: 6, padding: '6px 10px',
                  }}>
                    <strong>Row {r._rowNum}:</strong> {r._errors.join('; ')}
                    {' — '}{[r.date, r.rollNo, r.studentName, r.status].filter(Boolean).join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {validRows.length === 0 && (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon"><AlertTriangle size={32} color="#DC2626" /></div>
              <div className="empty-state-text">No valid rows found</div>
              <div className="empty-state-sub">Fix the errors in your CSV and re-upload</div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Import */}
      {parsed && validRows.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={20} color="#7C3AED" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: '0 0 4px' }}>
                Step 4 — Import Records
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                {validRows.length} valid record{validRows.length !== 1 ? 's' : ''} ready to import.
                {errorRows.length > 0 && ` ${errorRows.length} row${errorRows.length !== 1 ? 's' : ''} with errors will be skipped.`}
              </p>
            </div>
            <button
              className="btn btn-teal"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              <Upload size={14} />
              {importMutation.isPending ? 'Importing...' : `Import ${validRows.length} Records`}
            </button>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div style={{
          border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 20px',
          background: '#F0FDF4', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <CheckCircle size={24} color="#15803D" />
          <div>
            <div style={{ fontWeight: 700, color: '#15803D', fontSize: 14 }}>Import Successful</div>
            <div style={{ fontSize: 13, color: '#166534', marginTop: 2 }}>
              {importResult.imported ?? validRows.length} records imported
              {importResult.skipped ? `, ${importResult.skipped} skipped` : ''}
              {importResult.updated ? `, ${importResult.updated} updated` : ''}.
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={clearUpload} style={{ marginLeft: 'auto' }}>
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
