/**
 * The papers of one class in an exam: subject, date, time and room. This is
 * the class's date sheet, and the subjects printed on its roll number slips.
 *
 * Saved in one go, for every section of the class (they usually sit the
 * same papers) or for one section only. "Add every subject" fills the list
 * from the class's subjects; "Quick fill" gives the papers dates one day
 * after another (skipping Sundays) and the same time.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowUp, ArrowDown, Wand2, ListPlus, Save, AlertTriangle } from 'lucide-react';
import api from '../../api/client';

const NAVY = '#1B2F6E';
const cell = { border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 8px', fontSize: 13, width: '100%', minWidth: 0, background: '#fff', fontFamily: 'inherit' };

const blank = (key, subject = '') => ({ key, subject, date: '', timeFrom: '', timeTo: '', room: '' });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const plain = (rows) => rows.map(({ subject, date, timeFrom, timeTo, room }) => ({ subject: subject.trim(), date, timeFrom, timeTo, room: room.trim() }));
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* The papers in date order (papers with no date yet go last). */
const byDate = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.timeFrom || '').localeCompare(b.timeFrom || '');

/* Problems that stop the save, and warnings that do not. */
export function checkPapers(rows, exam) {
  const errors = [];
  const warnings = [];
  const seen = new Map();
  rows.forEach((r, i) => {
    const name = r.subject.trim();
    if (!name) { errors.push(`Paper ${i + 1}: choose the subject.`); return; }
    const k = name.toLowerCase();
    if (seen.has(k)) errors.push(`${name} is in the list twice.`);
    seen.set(k, i);
    if (r.timeFrom && r.timeTo && r.timeTo <= r.timeFrom) errors.push(`${name}: the paper must end after it starts.`);
    if (r.date && exam?.dateStart && r.date < String(exam.dateStart).slice(0, 10)) warnings.push(`${name} is before the exam starts.`);
    if (r.date && exam?.dateEnd && r.date > String(exam.dateEnd).slice(0, 10)) warnings.push(`${name} is after the exam ends.`);
  });
  const dated = rows.filter((r) => r.subject.trim() && r.date);
  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      const a = dated[i];
      const b = dated[j];
      if (a.date !== b.date) continue;
      const overlap = !a.timeFrom || !b.timeFrom || !a.timeTo || !b.timeTo || (a.timeFrom < b.timeTo && b.timeFrom < a.timeTo);
      if (overlap) warnings.push(`${a.subject} and ${b.subject} are on the same day${a.timeFrom && b.timeFrom ? ' at the same time' : ''}.`);
    }
  }
  return { errors, warnings };
}

/**
 * cls           { id, name, sections: [{ id, name }] }
 * entriesOf     (sectionId|null) => the saved papers of that section
 * startSection  the section being edited (date sheet tab), if any
 */
export default function ClassPapersEditor({ examId, exam, cls, entriesOf, startSection = null, onSaved, onDirtyChange }) {
  const sections = cls.sections || [];
  const sectionsDiffer = useMemo(() => {
    if (sections.length < 2) return false;
    const first = plain((entriesOf(sections[0].id) || []).map((e, i) => ({ ...blank(i), ...e }))).sort(byDate);
    return sections.some((s) => !same(plain((entriesOf(s.id) || []).map((e, i) => ({ ...blank(i), ...e }))).sort(byDate), first));
  }, [sections, entriesOf]);
  const [scope, setScope] = useState(() => (startSection && sectionsDiffer ? String(startSection) : 'all'));
  const keyRef = useRef(1);
  const load = (sc) => {
    let list;
    if (sc !== 'all') list = entriesOf(Number(sc)) || [];
    else {
      const withPapers = sections.find((s) => (entriesOf(s.id) || []).length);
      list = withPapers ? entriesOf(withPapers.id) : entriesOf(null) || [];
    }
    return list.map((e) => ({ ...blank(keyRef.current++), subject: e.subject || '', date: e.date || '', timeFrom: e.timeFrom || '', timeTo: e.timeTo || '', room: e.room || '' }));
  };
  const [rows, setRows] = useState(() => load(scope));
  const [saved, setSaved] = useState(() => plain(load(scope)));
  const [saving, setSaving] = useState(false);
  const [fill, setFill] = useState(() => ({ first: exam?.dateStart ? String(exam.dateStart).slice(0, 10) : '', from: '09:00', to: '12:00', skipSunday: true }));
  const [showFill, setShowFill] = useState(false);
  const dirty = !same(plain(rows), saved);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['class-subjects', cls.id],
    queryFn: () => api.get('/classes/subjects', { params: { classId: cls.id } }).then((r) => r.data.data || []),
  });

  const { errors, warnings } = checkPapers(rows, exam);
  const set = (key, field, value) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const move = (i, d) => setRows((rs) => { const out = [...rs]; const [x] = out.splice(i, 1); out.splice(i + d, 0, x); return out; });
  const addAll = () => {
    if (!subjects.length) { toast.error(`${cls.name} has no subjects yet. Add them in Settings → Subjects, or type each subject.`); return; }
    const have = new Set(rows.map((r) => r.subject.trim().toLowerCase()));
    const missing = subjects.filter((s) => !have.has(s.name.trim().toLowerCase()));
    if (!missing.length) { toast('Every subject of the class is already in the list.'); return; }
    setRows((rs) => [...rs.filter((r) => r.subject.trim()), ...missing.map((s) => blank(keyRef.current++, s.name))]);
  };
  const quickFill = () => {
    if (!fill.first) { toast.error('Choose the date of the first paper.'); return; }
    if (fill.from && fill.to && fill.to <= fill.from) { toast.error('The paper must end after it starts.'); return; }
    setRows((rs) => {
      // Counted inside the update: React may run it twice.
      const d = new Date(`${fill.first}T00:00:00`);
      return rs.map((r) => {
      if (!r.subject.trim()) return r;
      while (fill.skipSunday && d.getDay() === 0) d.setDate(d.getDate() + 1);
      const out = { ...r, date: isoDay(d), timeFrom: fill.from || r.timeFrom, timeTo: fill.to || r.timeTo };
      d.setDate(d.getDate() + 1);
      return out;
      });
    });
    setShowFill(false);
  };
  const changeScope = (v) => {
    if (dirty && !window.confirm('Your changes to these papers are not saved. Switch anyway?')) return;
    setScope(v);
    const next = load(v);
    setRows(next);
    setSaved(plain(next));
  };

  const save = async () => {
    if (errors.length) { toast.error(errors[0]); return; }
    const list = plain(rows).filter((r) => r.subject).sort(byDate);
    setSaving(true);
    try {
      const { data } = await api.put(`/exams/${examId}/datesheet/class/${cls.id}`, { entries: list, ...(scope !== 'all' && { sectionId: Number(scope) }) });
      toast.success(data.message || 'Saved.');
      const next = list.map((r) => ({ ...blank(keyRef.current++), ...r }));
      setRows(next);
      setSaved(plain(next));
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save the papers.');
    } finally {
      setSaving(false);
    }
  };

  const listId = `subjects-of-${cls.id}`;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        {sections.length > 1 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', flex: '1 1 220px' }}>
            These papers are for
            <select aria-label="Papers are for" className="form-select" value={scope} onChange={(e) => changeScope(e.target.value)}>
              <option value="all">All sections of {cls.name}</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{cls.name} — {s.name} only</option>)}
            </select>
          </label>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={addAll}><ListPlus size={14} /> Add every subject</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowFill((v) => !v)} disabled={!rows.some((r) => r.subject.trim())}><Wand2 size={14} /> Quick fill dates</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setRows((rs) => [...rs, blank(keyRef.current++)])}><Plus size={14} /> Add a paper</button>
        </div>
      </div>
      {sections.length > 1 && scope === 'all' && sectionsDiffer && (
        <div role="note" style={{ fontSize: 12.5, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '7px 11px', marginBottom: 10 }}>
          The sections of {cls.name} have different papers now. Saving here gives every section this list.
        </div>
      )}

      {showFill && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 }}>First paper on
            <input type="date" style={{ ...cell, width: 160 }} value={fill.first} onChange={(e) => setFill((f) => ({ ...f, first: e.target.value }))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 }}>From
            <input type="time" style={{ ...cell, width: 120 }} value={fill.from} onChange={(e) => setFill((f) => ({ ...f, from: e.target.value }))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 }}>To
            <input type="time" style={{ ...cell, width: 120 }} value={fill.to} onChange={(e) => setFill((f) => ({ ...f, to: e.target.value }))} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 6 }}>
            <input type="checkbox" checked={fill.skipSunday} onChange={(e) => setFill((f) => ({ ...f, skipSunday: e.target.checked }))} /> Skip Sundays
          </label>
          <button type="button" className="btn btn-teal btn-sm" onClick={quickFill}>Give each paper the next day</button>
          <div style={{ flexBasis: '100%', fontSize: 12, color: '#64748B' }}>In the order of the list: move papers up or down first.</div>
        </div>
      )}

      <datalist id={listId}>{subjects.map((s) => <option key={s.id} value={s.name} />)}</datalist>
      <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }} aria-label={`Papers of ${cls.name}`}>
          <thead>
            <tr style={{ background: '#F1F5F9', color: '#334155' }}>
              {['#', 'Subject', 'Date', 'From', 'To', 'Room', ''].map((h, i) => (
                <th key={i} style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, fontSize: 12, width: [34, undefined, 150, 112, 112, 90, 96][i] }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 22, textAlign: 'center', color: '#64748B' }}>
                No papers yet. Click <strong>Add every subject</strong> to start with the subjects of {cls.name}.
              </td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key} style={{ borderTop: '1px solid #F1F5F9' }}>
                <td style={{ padding: '6px 8px', color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                <td style={{ padding: '6px 4px' }}><input aria-label={`Subject of paper ${i + 1}`} list={listId} style={cell} value={r.subject} placeholder="Subject" dir="auto" onChange={(e) => set(r.key, 'subject', e.target.value)} /></td>
                <td style={{ padding: '6px 4px' }}><input aria-label={`Date of paper ${i + 1}`} type="date" style={cell} value={r.date} onChange={(e) => set(r.key, 'date', e.target.value)} /></td>
                <td style={{ padding: '6px 4px' }}><input aria-label={`Start of paper ${i + 1}`} type="time" style={cell} value={r.timeFrom} onChange={(e) => set(r.key, 'timeFrom', e.target.value)} /></td>
                <td style={{ padding: '6px 4px' }}><input aria-label={`End of paper ${i + 1}`} type="time" style={cell} value={r.timeTo} onChange={(e) => set(r.key, 'timeTo', e.target.value)} /></td>
                <td style={{ padding: '6px 4px' }}><input aria-label={`Room of paper ${i + 1}`} style={cell} value={r.room} maxLength={40} placeholder="—" onChange={(e) => set(r.key, 'room', e.target.value)} /></td>
                <td style={{ padding: '6px 6px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button type="button" className="btn btn-outline btn-sm btn-icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={13} /></button>{' '}
                  <button type="button" className="btn btn-outline btn-sm btn-icon" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown size={13} /></button>{' '}
                  <button type="button" className="btn btn-outline btn-sm btn-icon" aria-label={`Remove ${r.subject || 'paper'}`} style={{ color: '#DC2626' }} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(errors.length > 0 || warnings.length > 0) && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 4 }}>
          {errors.map((m) => <li key={`e${m}`} style={{ fontSize: 12.5, color: '#B91C1C', display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={13} /> {m}</li>)}
          {warnings.map((m) => <li key={`w${m}`} style={{ fontSize: 12.5, color: '#B45309', display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={13} /> {m}</li>)}
        </ul>
      )}

      {/* Clear of the app's floating + button in the corner. */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap', paddingRight: 64 }}>
        <span style={{ fontSize: 12.5, color: dirty ? '#B45309' : '#64748B' }}>
          {dirty ? 'Not saved yet' : `${saved.length} paper${saved.length === 1 ? '' : 's'} saved`}
        </span>
        <button type="button" className="btn btn-teal" style={{ background: NAVY }} disabled={!dirty || saving || errors.length > 0} onClick={save}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save papers'}
        </button>
      </div>
    </div>
  );
}
