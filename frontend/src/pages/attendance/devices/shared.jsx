/* Shared bits of the fingerprint machine pages. */
import toast from 'react-hot-toast';
import useAuthStore from '../../../store/auth.store';

export const useIsAdmin = () => ['admin', 'super_admin', 'principal'].includes(useAuthStore((s) => s.user?.role));

export const ago = (d) => {
  if (!d) return 'never';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(d).toLocaleDateString('en-PK');
};
export const timeOf = (d) => (d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '');
export const dayTimeOf = (d) => (d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const pkToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
export const pkMonth = () => pkToday().slice(0, 7);
export const fmtMin = (m) => (m ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : '');
export const num = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-PK'));
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const errText = (e, fallback) => e?.response?.data?.message || fallback;

const csvCell = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
export function downloadCsv(name, rows) {
  // A BOM so Excel reads Urdu names and the like correctly.
  const url = URL.createObjectURL(new Blob([`﻿${rows.map((r) => r.map(csvCell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printPage(title, bodyHtml) {
  const school = useAuthStore.getState().school?.name || '';
  const w = window.open('', '_blank');
  if (!w) { toast.error('Allow pop-ups for this site to print.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:Arial,sans-serif;padding:10mm;font-size:10pt;color:#111} h2{margin:0 0 2px} p{margin:0 0 8px;color:#555}
    table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top} th{background:#1E3A5F;color:#fff}
    td.n{text-align:right;font-variant-numeric:tabular-nums} .mono{font-family:monospace;font-weight:700}
    @page{size:auto;margin:10mm}</style></head><body><h2>${esc(school)} — ${esc(title)}</h2>${bodyHtml}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}

export function copy(textValue) {
  navigator.clipboard?.writeText(String(textValue)).then(() => toast.success('Copied')).catch(() => toast.error(`Copy it by hand: ${textValue}`));
}

export function Section({ n, title, icon: Icon, children, right, id }) {
  return (
    <section className="card" id={id} style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {n && <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#0D9488', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>}
        {Icon && <Icon size={17} color="#0D9488" />}
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E3A5F', flex: 1, minWidth: 180 }}>{title}</h3>
        {right}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

export const smallSelect = { width: 'auto', height: 32, fontSize: 12.5, padding: '0 28px 0 8px', lineHeight: '30px' };
export const hint = { fontSize: 12, color: '#64748B' };

/* The ten fingers as ZKTeco numbers them. */
export const FINGERS = [
  [6, 'Right index'], [5, 'Right thumb'], [7, 'Right middle'], [8, 'Right ring'], [9, 'Right little'],
  [3, 'Left index'], [4, 'Left thumb'], [2, 'Left middle'], [1, 'Left ring'], [0, 'Left little'],
];

export const JOB_LABEL = {
  people: 'Names put on', fingers: 'Fingers copied', remove: 'People taken off', info: 'Details asked',
  fetch: 'Punches asked again', users: 'Users asked', clock: 'Clock set', reboot: 'Restart', enrol: 'Enrol a finger',
};

/* A choice of who: everyone, students, staff or one class. */
export function WhoPicker({ value, onChange, classes, label = 'Who' }) {
  const v = value || { type: 'all', classId: '' };
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <select aria-label={label} className="form-select" style={smallSelect} value={v.classId ? 'class' : v.type}
        onChange={(e) => onChange(e.target.value === 'class' ? { type: 'students', classId: classes[0]?.id ? String(classes[0].id) : '' } : { type: e.target.value, classId: '' })}>
        <option value="all">Everyone</option><option value="students">All students</option><option value="staff">Staff</option>
        {classes.length > 0 && <option value="class">One class</option>}
      </select>
      {v.classId !== '' && (
        <select aria-label="Class" className="form-select" style={smallSelect} value={v.classId} onChange={(e) => onChange({ type: 'students', classId: e.target.value })}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}
