/**
 * Roll Numbers: a class's roll numbers, rearranged and renumbered as the
 * school wants.
 *
 *   - put the students in order: by name, father's name, admission date,
 *     current roll number, girls or boys first, or by hand (drag, or ↑ ↓)
 *   - number them in that order with the school's own pattern
 *     (prefix, first number, digits), or type any roll number by hand
 *   - see every change (old → new) before saving; saved together, and can
 *     be undone straight after
 *
 * A roll number is also the student's code on the ID card (barcode and QR),
 * at the attendance kiosk and fee scanner, and to sign in, so the page says
 * so before saving and offers new ID cards after.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ListOrdered, ArrowUp, ArrowDown, GripVertical, Save, Undo2, Printer, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import api from '../../api/client';
import { printHTML } from '../../utils/print';

const NAVY = '#1B2F6E';
const ROLL_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,29}$/;
const natural = (a, b) => String(a || '￿').localeCompare(String(b || '￿'), 'en', { numeric: true, sensitivity: 'base' });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const ORDERS = [
  { id: 'name', label: 'Name (A–Z)', sort: (a, b) => a.name.localeCompare(b.name) },
  { id: 'father', label: "Father's name (A–Z)", sort: (a, b) => String(a.fatherName || '').localeCompare(String(b.fatherName || '')) || a.name.localeCompare(b.name) },
  { id: 'admission', label: 'Admission date (earliest first)', sort: (a, b) => new Date(a.admissionDate) - new Date(b.admissionDate) || a.name.localeCompare(b.name) },
  { id: 'current', label: 'Current roll number', sort: (a, b) => natural(a.rollNo, b.rollNo) || a.name.localeCompare(b.name) },
  { id: 'girls', label: 'Girls first, then boys (each A–Z)', sort: (a, b) => girl(b) - girl(a) || a.name.localeCompare(b.name) },
  { id: 'boys', label: 'Boys first, then girls (each A–Z)', sort: (a, b) => girl(a) - girl(b) || a.name.localeCompare(b.name) },
];
const girl = (s) => (/^f/i.test(String(s.gender || '')) ? 1 : 0);

/** A pattern from a roll number already in use: "NURA-26-007" → prefix "NURA-26-", 3 digits. */
function guessPattern(sample) {
  const m = /^(.*?)(\d+)$/.exec(String(sample || ''));
  return m ? { prefix: m[1], digits: m[2].length, start: 1 } : { prefix: '', digits: 1, start: 1 };
}
const makeRoll = ({ prefix, digits, start }, i) => `${prefix}${String(Number(start) + i).padStart(Math.max(1, Math.min(6, Number(digits) || 1)), '0')}`;

export default function RollNumbersPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') || '';
  const sectionId = params.get('sectionId') || '';
  const pickClass = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  useEffect(() => { if (!classId && classes.length) pickClass({ classId: String(classes[0].id) }); }, [classes]); // eslint-disable-line react-hooks/exhaustive-deps
  const cls = classes.find((c) => String(c.id) === classId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['roll-numbers', classId, sectionId],
    queryFn: () => api.get('/students/roll-numbers', { params: { classId, sectionId: sectionId || undefined } }).then((r) => r.data),
    enabled: !!classId,
  });
  const canEdit = !!data?.canEdit;

  // The list as arranged, each with the roll number it will get.
  const [rows, setRows] = useState([]);
  const [pattern, setPattern] = useState({ prefix: '', digits: 3, start: 1 });
  const [order, setOrder] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undo, setUndo] = useState(null); // the last save, to put back
  const dragFrom = useRef(null);

  useEffect(() => {
    const list = data?.data || [];
    setRows(list.map((s) => ({ ...s, next: s.rollNo || '' })));
    setPattern(guessPattern(list.find((s) => s.rollNo)?.rollNo));
    setOrder('');
  }, [data]);

  const arrange = (id) => {
    const o = ORDERS.find((x) => x.id === id);
    if (o) setRows((r) => [...r].sort(o.sort));
    setOrder(id);
  };
  const move = (i, to) => setRows((r) => {
    if (to < 0 || to >= r.length) return r;
    const next = [...r];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    return next;
  });
  const numberAll = () => setRows((r) => r.map((s, i) => ({ ...s, next: makeRoll(pattern, i) })));
  const setNext = (id, v) => setRows((r) => r.map((s) => (s.id === id ? { ...s, next: v.trim() } : s)));
  const reset = () => { setRows((data?.data || []).map((s) => ({ ...s, next: s.rollNo || '' }))); setOrder(''); };

  // What is wrong before saving: empty, not a roll number, twice in the list.
  const problems = useMemo(() => {
    const seen = new Map();
    rows.forEach((s) => { const k = s.next.toLowerCase(); if (k) seen.set(k, (seen.get(k) || 0) + 1); });
    return Object.fromEntries(rows.map((s) => [s.id,
      !s.next ? 'A roll number is needed.'
        : !ROLL_RE.test(s.next) ? 'Use letters, digits and - / _ . only (no spaces, up to 30).'
          : seen.get(s.next.toLowerCase()) > 1 ? 'Given to two students.' : '']).filter(([, v]) => v));
  }, [rows]);
  const changes = rows.filter((s) => s.next !== (s.rollNo || ''));
  // Only a change can stop the save: roll numbers already shared before
  // (from an old import) are shown, to be fixed, but do not block others.
  const bad = changes.filter((s) => problems[s.id]).length;
  const oldShared = rows.filter((s) => problems[s.id] && s.next === (s.rollNo || '')).length;
  const sections = cls?.sections || [];

  const save = async (list, { isUndo = false } = {}) => {
    setSaving(true);
    try {
      const r = await api.put('/students/roll-numbers', { changes: list.map((s) => ({ id: s.id, rollNo: s.to })) });
      toast.success(isUndo ? 'The roll numbers are back as they were.' : r.data.message);
      setUndo(isUndo ? null : r.data.data.changes);
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ['roll-numbers'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'The roll numbers could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const printList = () => {
    const title = [cls?.name, sections.find((s) => String(s.id) === sectionId)?.name].filter(Boolean).join(' — ');
    printHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Roll list — ${esc(title)}</title><style>
      @page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#111827}
      h2{margin:0;color:${NAVY}}h3{margin:2px 0 10px;font-weight:600;color:#4B5563}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #9CA3AF;padding:6px 8px;font-size:12.5px;text-align:left}
      th{background:#E5E9F5;color:${NAVY}}td.n{text-align:center;width:6%}td.r{font-weight:700;font-family:'Courier New',monospace}
    </style></head><body><h2>${esc(localStorage.getItem('schoolName') || localStorage.getItem('registeredSchoolName') || 'School')}</h2>
      <h3>Roll list — ${esc(title)}</h3>
      <table><thead><tr><th>#</th><th>Roll No.</th><th>Student</th><th>Father's name</th>${sectionId ? '' : '<th>Section</th>'}</tr></thead><tbody>
      ${rows.map((s, i) => `<tr><td class="n">${i + 1}</td><td class="r">${esc(s.next || s.rollNo || '')}</td><td dir="auto">${esc(s.name)}</td><td dir="auto">${esc(s.fatherName || '')}</td>${sectionId ? '' : `<td>${esc(s.sectionName)}</td>`}</tr>`).join('')}
      </tbody></table></body></html>`, { title: 'Roll list' });
  };

  return (
    <div className="page-content fade-in">
      <div className="card" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}><ListOrdered size={19} /> Roll Numbers</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Put a class in the order you want and give them the roll numbers you want. Roll number slips, result cards and registers follow this order.</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={printList} disabled={!rows.length}><Printer size={14} /> Print roll list</button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <label style={lab}>Class
            <select className="form-select" aria-label="Class" value={classId} onChange={(e) => pickClass({ classId: e.target.value, sectionId: '' })}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={lab}>Section
            <select className="form-select" aria-label="Section" value={sectionId} disabled={!sections.length} onChange={(e) => pickClass({ sectionId: e.target.value })}>
              <option value="">All sections</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {undo && (
        <div role="status" style={{ ...banner, background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
          <CheckCircle2 size={16} />
          <span style={{ flex: 1 }}>{undo.length} roll number{undo.length === 1 ? '' : 's'} changed. Print new ID cards for these students: their old cards carry the old number.</span>
          <Link className="btn btn-outline btn-sm" to="/id-cards">Print ID cards</Link>
          <Link className="btn btn-outline btn-sm" to="/examination?tab=roll-slips">Roll number slips</Link>
          <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => save(undo.filter((c) => c.from).map((c) => ({ id: c.id, to: c.from })), { isUndo: true })}><Undo2 size={13} /> Undo</button>
          <button type="button" aria-label="Close" onClick={() => setUndo(null)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit' }}><X size={15} /></button>
        </div>
      )}

      {canEdit && rows.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 14, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ ...lab, minWidth: 260 }}><span>1. Put them in order</span>
              <select className="form-select" aria-label="Arrange by" value={order} onChange={(e) => arrange(e.target.value)}>
                <option value="">As they are now (or drag them)</option>
                {ORDERS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={lab}><span>2. Number them: prefix</span>
              <input className="form-input" aria-label="Prefix" style={{ width: 140 }} maxLength={20} value={pattern.prefix} placeholder="e.g. NURA-26-" onChange={(e) => setPattern((p) => ({ ...p, prefix: e.target.value.replace(/\s/g, '') }))} />
            </label>
            <label style={lab}>First number
              <input className="form-input" aria-label="First number" type="number" min="0" max="99999" style={{ width: 110 }} value={pattern.start} onChange={(e) => setPattern((p) => ({ ...p, start: Math.max(0, Math.min(99999, parseInt(e.target.value, 10) || 0)) }))} />
            </label>
            <label style={lab}>Digits
              <select className="form-select" aria-label="Digits" style={{ width: 150 }} value={pattern.digits} onChange={(e) => setPattern((p) => ({ ...p, digits: Number(e.target.value) }))}>
                {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{d} ({makeRoll({ prefix: '', digits: d, start: 1 }, 0)})</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={numberAll}><ListOrdered size={14} /> Number in this order</button>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{makeRoll(pattern, 0)} … {makeRoll(pattern, rows.length - 1)}</span>
          </div>
          {!sectionId && sections.length > 1 && (
            <div style={{ fontSize: 12.5, color: '#92400E' }}>All sections are shown, so the numbers run on from one section to the next. To number each section on its own, choose the section.</div>
          )}
        </div>
      )}

      {oldShared > 0 && (
        <div role="note" style={{ ...banner, background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
          <AlertTriangle size={16} />
          <span style={{ flex: 1 }}>{oldShared} student{oldShared === 1 ? '' : 's'} here {oldShared === 1 ? 'has' : 'have'} a roll number another student also has (marked in red). Two students with one roll number cannot be told apart at the kiosk or on a slip{canEdit ? ': number the class again, or type a new number for one of them.' : '.'}</span>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}
        {isError && <div role="alert" style={{ padding: 20, color: '#B91C1C' }}>{error?.response?.data?.message || 'Could not load the class.'}</div>}
        {data && !rows.length && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No active students in this class.</div>}
        {rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table aria-label="Roll numbers" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F1F5F9', color: '#334155', textAlign: 'left' }}>
                  {canEdit && <th style={th} aria-label="Move" />}
                  <th style={{ ...th, width: 40 }}>#</th>
                  <th style={th}>Roll No. now</th>
                  {canEdit && <th style={th}>New roll No.</th>}
                  <th style={th}>Student</th>
                  {!sectionId && <th style={th}>Section</th>}
                  <th style={th}>Gender</th>
                  <th style={th}>Admitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => {
                  const changed = s.next !== (s.rollNo || '');
                  const p = problems[s.id];
                  return (
                    <tr key={s.id} data-id={s.id} draggable={canEdit}
                      onDragStart={() => { dragFrom.current = i; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragFrom.current !== null) move(dragFrom.current, i); dragFrom.current = null; }}
                      style={{ borderTop: '1px solid #EEF2F7', background: p ? '#FEF2F2' : changed ? '#FFFBEB' : '#fff' }}>
                      {canEdit && (
                        <td style={{ ...td, whiteSpace: 'nowrap', color: '#94A3B8' }}>
                          <GripVertical size={14} style={{ cursor: 'grab', verticalAlign: 'middle', display: 'inline-block' }} aria-hidden="true" />
                          <button type="button" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} style={iconBtn}><ArrowUp size={13} /></button>
                          <button type="button" aria-label={`Move ${s.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, i + 1)} style={iconBtn}><ArrowDown size={13} /></button>
                        </td>
                      )}
                      <td style={{ ...td, color: '#94A3B8' }}>{i + 1}</td>
                      <td style={{ ...td, fontFamily: 'monospace', color: changed ? '#94A3B8' : '#0F172A', textDecoration: changed ? 'line-through' : 'none' }}>{s.rollNo || '—'}</td>
                      {canEdit && (
                        <td style={td}>
                          <input className="form-input" aria-label={`New roll number for ${s.name}`} value={s.next} maxLength={30}
                            onChange={(e) => setNext(s.id, e.target.value)}
                            style={{ width: 150, padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, borderColor: p ? '#F87171' : changed ? '#F59E0B' : undefined }} />
                          {p && <div style={{ fontSize: 11.5, color: '#B91C1C', marginTop: 2 }}>{p}</div>}
                        </td>
                      )}
                      <td style={td}><b>{s.name}</b>{s.fatherName && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.fatherName}</div>}</td>
                      {!sectionId && <td style={td}>{s.sectionName || '—'}</td>}
                      <td style={{ ...td, textTransform: 'capitalize' }}>{s.gender || '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{day(s.admissionDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!canEdit && data && rows.length > 0 && (
          <div style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>Only the admin or the principal can change roll numbers.</div>
        )}
      </div>

      {canEdit && rows.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', background: 'var(--bg-body, #F1F5F9)', padding: '12px 64px 12px 0', marginTop: 8 }}>
          <span style={{ fontSize: 13, color: bad ? '#B91C1C' : changes.length ? '#92400E' : 'var(--text-muted)' }}>
            {bad ? `${bad} roll number${bad === 1 ? '' : 's'} to fix` : changes.length ? `${changes.length} change${changes.length === 1 ? '' : 's'} not saved` : 'No changes'}
          </span>
          <button type="button" className="btn btn-outline" disabled={!changes.length && !order} onClick={reset}><Undo2 size={14} /> Start again</button>
          <button type="button" className="btn btn-primary" disabled={!changes.length || !!bad || saving} onClick={() => setConfirm(true)}><Save size={14} /> Save roll numbers</button>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="roll-confirm-title" onClick={(e) => e.stopPropagation()} style={{ padding: 0, width: '100%', maxWidth: 560 }}>
            <div className="card-header" style={{ borderRadius: '8px 8px 0 0' }}>
              <div id="roll-confirm-title" className="modal-title">Change {changes.length} roll number{changes.length === 1 ? '' : 's'}?</div>
              <button type="button" aria-label="Close" onClick={() => setConfirm(false)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 12 }}>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {changes.map((s) => (
                      <tr key={s.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td style={td}>{s.name}</td>
                        <td style={{ ...td, fontFamily: 'monospace', color: '#94A3B8', textDecoration: 'line-through' }}>{s.rollNo || '—'}</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>→ {s.next}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '9px 11px', lineHeight: 1.5 }}>
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
                <span>The roll number is also on each student's <b>ID card</b> (barcode and QR) and is used at the <b>attendance kiosk</b>, the <b>fee scanner</b> and to <b>sign in</b>. After this change, print new ID cards for these students; they sign in with the new roll number and the same password. Marks, fees and attendance stay with the student.</span>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-outline" onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => save(changes.map((s) => ({ id: s.id, to: s.next })))}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save roll numbers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lab = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 180 };
const th = { padding: '8px 10px', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' };
const td = { padding: '7px 10px', verticalAlign: 'middle' };
const iconBtn = { display: 'inline-flex', background: 'none', border: '1px solid #E2E8F0', borderRadius: 5, padding: '2px 4px', margin: '0 2px', cursor: 'pointer', color: '#475569', verticalAlign: 'middle' };
const banner = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', border: '1px solid', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 };
