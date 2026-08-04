/**
 * IlmForge — Fee Types Management
 * Tabs: Fee Type List | Add A Fee Type
 * localStorage key: ilmforge_fee_types
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Tag, Plus, Trash2, Edit2, Save, X, Search, Printer } from 'lucide-react';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

/* ── Seed data ───────────────────────────────────────────── */
const SEED = [
  { id: 1, name: 'Monthly Tuition Fee', campus: 'Main Campus' },
  { id: 2, name: 'Admission Fee',        campus: 'Main Campus' },
  { id: 3, name: 'Exam Fee',             campus: 'Main Campus' },
  { id: 4, name: 'Transport Fee',        campus: 'Main Campus' },
  { id: 5, name: 'Lab Fee',              campus: 'Main Campus' },
  { id: 6, name: 'Sports Fee',           campus: 'Main Campus' },
  { id: 7, name: 'Computer Fee',         campus: 'Main Campus' },
  { id: 8, name: 'Books Fee',            campus: 'Main Campus' },
];

const LS_KEY = 'ilmforge_fee_types';
const CAMPUSES = ['Main Campus', 'Branch 1', 'Branch 2'];
const PAGE_SIZE = 10;

/* ── Local-storage helpers ───────────────────────────────── */
function loadTypes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  localStorage.setItem(LS_KEY, JSON.stringify(SEED));
  return SEED;
}

function saveTypes(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

/* ── Export helpers ──────────────────────────────────────── */
function exportCSV(rows) {
  const header = 'Type ID,Fee Name,Campus\n';
  const body = rows.map(r => `${r.id},${r.name},${r.campus}`).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fee_types.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(rows) {
  // Tab-separated .xls compatible export
  const header = 'Type ID\tFee Name\tCampus\n';
  const body = rows.map(r => `${r.id}\t${r.name}\t${r.campus}`).join('\n');
  const blob = new Blob([header + body], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fee_types.xls';
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(rows) {
  const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';
  const schoolLogo = localStorage.getItem('schoolLogoPreview') || '';
  const watermarkCss = buildWatermarkCss({ mode: 'a4', color: '#1E3A5F' });
  const watermarkHtml = buildWatermarkMarkup({ logo: schoolLogo, text: schoolName });
  const date = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
  const rowsHTML = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'}">
      <td style="padding:7px 10px;border:1px solid #E2E8F0;text-align:center;color:#64748B;">${r.id}</td>
      <td style="padding:7px 10px;border:1px solid #E2E8F0;font-weight:600;color:#1E3A5F;">${r.name}</td>
      <td style="padding:7px 10px;border:1px solid #E2E8F0;color:#374151;">${r.campus}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Fee Types — ${schoolName}</title>
  <style>* { margin:0;padding:0;box-sizing:border-box; } body { font-family:Arial,sans-serif;padding:18mm;background:#fff;font-size:10pt;position:relative;overflow:hidden; }
  ${watermarkCss}
  .header, table, p { position:relative; z-index:1; }
  .header { text-align:center;border-bottom:2.5px solid #1E3A5F;padding-bottom:10px;margin-bottom:14px; }
  .school { font-size:16pt;font-weight:900;color:#1E3A5F; }
  .title { font-size:12pt;font-weight:700;color:#0D9488;margin-top:4px; }
  .date { font-size:9pt;color:#64748B;margin-top:2px; }
  table { width:100%;border-collapse:collapse;margin-top:10px; }
  th { background:#1E3A5F;color:#fff;padding:8px 10px;text-align:left;font-size:9.5pt; }
  @media print { body { padding:0; } }</style>
  </head><body>
  ${watermarkHtml}
  <div class="header">
    <div class="school">${schoolName}</div>
    <div class="title">Fee Types Report</div>
    <div class="date">Generated: ${date}</div>
  </div>
  <table><thead><tr><th>Type ID</th><th>Fee Name</th><th>Campus</th></tr></thead>
  <tbody>${rowsHTML}</tbody></table>
  <p style="margin-top:16px;font-size:8.5pt;color:#9CA3AF;text-align:center;">Total: ${rows.length} fee type(s) · ${schoolName}</p>
  </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

function printTable(rows) {
  exportPDF(rows);
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function FeeTypesPage() {
  const [tab, setTab]         = useState('list');
  const [types, setTypes]     = useState(loadTypes);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [editId, setEditId]   = useState(null);
  const [editName, setEditName] = useState('');
  const [editCampus, setEditCampus] = useState('');

  // Add form state
  const [form, setForm] = useState({ campus: 'Main Campus', name: '' });
  const [saving, setSaving] = useState(false);

  /* ── Derived: filtered + paginated ── */
  const filtered = types.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.campus.toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* ── Add fee type ── */
  const handleAdd = () => {
    if (!form.name.trim()) { toast.error('Fee name is required'); return; }
    setSaving(true);
    setTimeout(() => {
      const newId = types.length ? Math.max(...types.map(t => t.id)) + 1 : 1;
      const updated = [...types, { id: newId, name: form.name.trim(), campus: form.campus }];
      saveTypes(updated);
      setTypes(updated);
      setForm({ campus: 'Main Campus', name: '' });
      setSaving(false);
      toast.success('Fee type added successfully');
      setTab('list');
    }, 300);
  };

  /* ── Delete ── */
  const handleDelete = (id) => {
    if (!window.confirm('Delete this fee type?')) return;
    const updated = types.filter(t => t.id !== id);
    saveTypes(updated);
    setTypes(updated);
    toast.success('Fee type deleted');
  };

  /* ── Edit start ── */
  const startEdit = (t) => {
    setEditId(t.id);
    setEditName(t.name);
    setEditCampus(t.campus);
  };

  /* ── Edit save ── */
  const saveEdit = (id) => {
    if (!editName.trim()) { toast.error('Fee name cannot be empty'); return; }
    const updated = types.map(t => t.id === id ? { ...t, name: editName.trim(), campus: editCampus } : t);
    saveTypes(updated);
    setTypes(updated);
    setEditId(null);
    toast.success('Fee type updated');
  };

  const cancelEdit = () => setEditId(null);

  /* ── Search reset page ── */
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={22} color="#0D9488" style={{ flexShrink: 0 }} />
            Fee Types
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Manage fee categories for your school
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-teal"
            onClick={() => setTab('add')}
            style={{ gap: 6 }}
          >
            <Plus size={15} /> Add Fee Type
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tab-list" style={{ padding: '0 16px', borderBottom: '1px solid #F1F5F9' }}>
          <button
            className={`tab-btn${tab === 'list' ? ' active' : ''}`}
            onClick={() => setTab('list')}
          >
            Fee Type List
          </button>
          <button
            className={`tab-btn${tab === 'add' ? ' active' : ''}`}
            onClick={() => setTab('add')}
          >
            <Plus size={13} style={{ marginRight: 4 }} />
            Add A Fee Type
          </button>
        </div>

        {/* ── LIST TAB ── */}
        {tab === 'list' && (
          <div style={{ padding: 16 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: 220, flex: 1, maxWidth: 340 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 32, fontSize: 13 }}
                  placeholder="Search fee types..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>

              {/* Export buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => exportExcel(filtered)}
                  title="Export Excel"
                  style={{ fontSize: 12 }}
                >
                  Excel
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => exportCSV(filtered)}
                  title="Export CSV"
                  style={{ fontSize: 12 }}
                >
                  CSV
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => exportPDF(filtered)}
                  title="Export PDF"
                  style={{ fontSize: 12 }}
                >
                  PDF
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => printTable(filtered)}
                  title="Print"
                  style={{ fontSize: 12 }}
                >
                  <Printer size={13} style={{ marginRight: 4 }} />
                  Print
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Type ID</th>
                    <th>Fee Name</th>
                    <th style={{ width: 180 }}>Campus</th>
                    <th style={{ width: 120, textAlign: 'center' }}>OPTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty-state">
                          <div className="empty-state-icon" style={{ fontSize: 32 }}>🏷️</div>
                          <div className="empty-state-text">No fee types found</div>
                          <div className="empty-state-sub">
                            {search ? 'Try a different search term' : 'Add your first fee type using the tab above'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {pageRows.map(t => (
                    <tr key={t.id}>
                      {/* Type ID */}
                      <td>
                        <span className="badge badge-navy" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          #{t.id}
                        </span>
                      </td>

                      {/* Fee Name — inline edit */}
                      <td>
                        {editId === t.id ? (
                          <input
                            className="form-input"
                            style={{ fontSize: 13, padding: '4px 8px', height: 32 }}
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(t.id); if (e.key === 'Escape') cancelEdit(); }}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: '#1E3A5F' }}>{t.name}</span>
                        )}
                      </td>

                      {/* Campus — inline edit */}
                      <td>
                        {editId === t.id ? (
                          <select
                            className="form-select"
                            style={{ fontSize: 13, padding: '4px 8px', height: 32 }}
                            value={editCampus}
                            onChange={e => setEditCampus(e.target.value)}
                          >
                            {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span className="badge badge-teal">{t.campus}</span>
                        )}
                      </td>

                      {/* Options */}
                      <td style={{ textAlign: 'center' }}>
                        {editId === t.id ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              className="btn btn-teal btn-sm"
                              style={{ padding: '3px 10px', fontSize: 12, gap: 4 }}
                              onClick={() => saveEdit(t.id)}
                            >
                              <Save size={12} /> Save
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '3px 10px', fontSize: 12, gap: 4 }}
                              onClick={cancelEdit}
                            >
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 10px', fontSize: 12, gap: 4, color: '#2563EB', borderColor: '#BFDBFE' }}
                              onClick={() => startEdit(t)}
                              title="Edit"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 10px', fontSize: 12, gap: 4, color: '#DC2626', borderColor: '#FECACA' }}
                              onClick={() => handleDelete(t.id)}
                              title="Delete"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: '#64748B' }}>
                  Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} fee type(s)
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{ fontSize: 12, padding: '3px 10px' }}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`btn btn-sm${p === currentPage ? ' btn-teal' : ' btn-outline'}`}
                      style={{ fontSize: 12, padding: '3px 10px', minWidth: 32 }}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    style={{ fontSize: 12, padding: '3px 10px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ADD TAB ── */}
        {tab === 'add' && (
          <div style={{ padding: 24, maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={17} color="#0D9488" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Add New Fee Type</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Create a new fee category for your school</div>
              </div>
            </div>

            {/* Campus */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Campus</label>
              <select
                className="form-select"
                value={form.campus}
                onChange={e => setForm({ ...form, campus: e.target.value })}
              >
                {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Fee Name */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Fee Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Monthly Tuition Fee"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              />
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-teal"
                onClick={handleAdd}
                disabled={saving || !form.name.trim()}
                style={{ gap: 6 }}
              >
                <Plus size={15} />
                {saving ? 'Adding...' : 'Add Fee Type'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setForm({ campus: 'Main Campus', name: '' }); setTab('list'); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
