/**
 * IlmForge — Fee Types Management
 * Tabs: Fee Type List | Add A Fee Type
 * Kept with the school on the server (GET/PUT /fees/types): the Generate Fee
 * page offers these names. It used to be one browser's localStorage list,
 * with three campuses the school did not have.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Tag, Plus, Trash2, Edit2, Save, X, Search, Printer } from 'lucide-react';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';
import useFeeTypes from '../../hooks/useFeeTypes';
import useAuthStore from '../../store/auth.store';

const PAGE_SIZE = 10;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const schoolNameNow = () => {
  const s = useAuthStore.getState();
  return s.school?.name || s.branding?.schoolName || 'School';
};

/* ── Export helpers ──────────────────────────────────────── */
function download(text, type, name) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCSV(rows) {
  const header = 'Type ID,Fee Name,Campus\n';
  const body = rows.map(r => [r.id, r.name, r.campus].map(csvCell).join(',')).join('\n');
  download(header + body, 'text/csv', 'fee_types.csv');
}

function exportExcel(rows) {
  // Tab-separated .xls compatible export
  const header = 'Type ID\tFee Name\tCampus\n';
  const body = rows.map(r => `${r.id}\t${r.name}\t${r.campus}`).join('\n');
  download(header + body, 'application/vnd.ms-excel', 'fee_types.xls');
}

function exportPDF(rows) {
  const schoolName = esc(schoolNameNow());
  const schoolLogo = useAuthStore.getState().school?.logoUrl || localStorage.getItem('schoolLogoPreview') || '';
  const watermarkCss = buildWatermarkCss({ mode: 'a4', color: '#1E3A5F' });
  const watermarkHtml = buildWatermarkMarkup({ logo: schoolLogo, text: schoolNameNow() });
  const date = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
  const rowsHTML = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'}">
      <td style="padding:7px 10px;border:1px solid #E2E8F0;text-align:center;color:#64748B;">${r.id}</td>
      <td style="padding:7px 10px;border:1px solid #E2E8F0;font-weight:600;color:#1E3A5F;">${esc(r.name)}</td>
      <td style="padding:7px 10px;border:1px solid #E2E8F0;color:#374151;">${esc(r.campus)}</td>
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
  if (!w) { toast.error('Allow pop-ups for this site to print.'); return; }
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
  const { types: savedTypes, campuses, campusName, isLoading, error, save, isSaving } = useFeeTypes();
  const [tab, setTab]         = useState('list');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [editId, setEditId]   = useState(null);
  const [editName, setEditName] = useState('');
  const [editCampus, setEditCampus] = useState('');

  // Add form state
  const [form, setForm] = useState({ campusId: '', name: '' });
  const saving = isSaving;

  const types = savedTypes.map(t => ({ ...t, campus: campusName(t.campusId) }));

  /* ── Derived: filtered + paginated ── */
  const q = search.trim().toLowerCase();
  const filtered = types.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.campus.toLowerCase().includes(q) ||
    String(t.id).includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const strip = (list) => list.map(({ id, name, campusId }) => ({ id, name, campusId: campusId ?? null }));
  const store = async (list, done) => {
    try {
      await save(strip(list));
      toast.success(done);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'It could not be saved. Try again.');
      return false;
    }
  };
  const taken = (name, exceptId) => types.some(t => t.id !== exceptId && t.name.trim().toLowerCase() === name.trim().toLowerCase());

  /* ── Add fee type ── */
  const handleAdd = async () => {
    if (saving) return;
    const name = form.name.trim();
    if (!name) { toast.error('Fee name is required'); return; }
    if (taken(name)) { toast.error(`"${name}" is already in the list.`); return; }
    if (await store([...types, { name, campusId: form.campusId ? Number(form.campusId) : null }], 'Fee type added')) {
      setForm({ campusId: '', name: '' });
      setTab('list');
    }
  };

  /* ── Delete ── */
  const handleDelete = (id) => {
    if (!window.confirm('Delete this fee type? Bills already made with it are not changed.')) return;
    store(types.filter(t => t.id !== id), 'Fee type deleted');
  };

  /* ── Edit start ── */
  const startEdit = (t) => {
    setEditId(t.id);
    setEditName(t.name);
    setEditCampus(t.campusId == null ? '' : String(t.campusId));
  };

  /* ── Edit save ── */
  const saveEdit = async (id) => {
    if (saving) return;
    const name = editName.trim();
    if (!name) { toast.error('Fee name cannot be empty'); return; }
    if (taken(name, id)) { toast.error(`"${name}" is already in the list.`); return; }
    const updated = types.map(t => t.id === id ? { ...t, name, campusId: editCampus ? Number(editCampus) : null } : t);
    if (await store(updated, 'Fee type updated')) setEditId(null);
  };

  const cancelEdit = () => setEditId(null);

  /* ── Search reset page ── */
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  const campusOptions = (
    <>
      <option value="">All campuses</option>
      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </>
  );

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
                  {isLoading && (
                    <tr><td colSpan={4}><div className="loading-center"><div className="spinner" /></div></td></tr>
                  )}
                  {!isLoading && error && (
                    <tr><td colSpan={4} style={{ color: '#B91C1C', padding: 16 }}>
                      {error.response?.data?.message || 'The fee types could not be loaded.'}
                    </td></tr>
                  )}
                  {!isLoading && !error && pageRows.length === 0 && (
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
                            {campusOptions}
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
                              disabled={saving}
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
                              disabled={saving}
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
              <select aria-label="Campus"
                className="form-select"
                value={form.campusId}
                onChange={e => setForm({ ...form, campusId: e.target.value })}
              >
                {campusOptions}
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
                onClick={() => { setForm({ campusId: '', name: '' }); setTab('list'); }}
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
