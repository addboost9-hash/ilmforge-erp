/**
 * New students from their photos (/students/from-photos).
 *
 * Each photo is named with the student's name ("Ali Raza.jpg"). Every photo
 * becomes a new student of the chosen class, with the same stand-in details
 * for what is not known yet (father's name ".", father's CNIC, parent phone),
 * and the photo cut to passport size (35 × 45 mm, head and shoulders).
 *
 *   - A folder of class folders ("Class 5/A/Ali Raza.jpg") puts each photo
 *     in its own class and section.
 *   - A name already in the class, or twice in the photos, is left out unless
 *     ticked.
 *   - Each frame is suggested from the head on the plain wall; any can be
 *     moved and zoomed before saving.
 *   - Students are admitted one by one through the normal admission: roll
 *     number, student and parent logins (each student their own parent
 *     account: a stand-in phone joins nobody), shown once to download.
 *   - The records show as incomplete (Student Registry) until the real
 *     details are filled in with Edit.
 */
import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Camera, FolderOpen, UserPlus, CheckCircle2, XCircle, Crop, RefreshCw, Download, Users, AlertTriangle,
} from 'lucide-react';
import api from '../../api/client';
import { previewOf, passportFromFile, cropStyle, nameFromFile, suggestCrop, centreCrop, RATIO } from '../../utils/passportPhoto';
import { downloadLogins } from '../../utils/loginSheet';

const GREEN = '#0F3D33';
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const isImage = (f) => /^image\/(jpeg|png|webp)$/.test(f.type) || IMAGE_RE.test(f.name);
const norm = (v) => String(v || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };
const placeKey = (classId, sectionId) => `${classId || ''}|${sectionId || ''}`;

/* The class (and section) a photo's folder names: "Class 5/A/Ali.jpg". */
function placeFromPath(path, classes) {
  const parts = String(path || '').split('/').slice(0, -1);
  for (let i = parts.length - 1; i >= 0; i--) {
    const c = classes.find((x) => norm(x.name) === norm(parts[i]));
    if (c) {
      const sec = parts[i + 1] ? c.sections.find((s) => norm(s.name) === norm(parts[i + 1])) : null;
      return { classId: c.id, sectionId: sec?.id || null, fromFolder: true };
    }
    // "Class 5 A" / "Class 5-A" in one folder name
    for (const x of classes) {
      for (const s of x.sections) {
        if (norm(parts[i]) === norm(`${x.name} ${s.name}`)) return { classId: x.id, sectionId: s.id, fromFolder: true };
      }
    }
  }
  return null;
}

/* ── Moving and zooming one frame ──────────────────────────────────── */
function CropEditor({ row, onClose, onSave }) {
  const [crop, setCrop] = useState(row.crop);
  const stage = useRef(null);
  const drag = useRef(null);
  const W = row.width;
  const H = row.height;
  const maxW = Math.min(1, (H * RATIO) / W);
  const setSize = (w) => setCrop((c) => {
    const nw = Math.max(0.08, Math.min(maxW, w));
    const nh = (nw * W) / RATIO / H;
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    return { ...c, w: nw, h: nh, x: Math.min(1 - nw, Math.max(0, cx - nw / 2)), y: Math.min(1 - nh, Math.max(0, cy - nh / 2)) };
  });
  const onDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const r = stage.current.getBoundingClientRect();
    drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y, sw: r.width, sh: r.height };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    setCrop((c) => ({
      ...c,
      x: Math.min(1 - c.w, Math.max(0, d.x + (e.clientX - d.px) / d.sw)),
      y: Math.min(1 - c.h, Math.max(0, d.y + (e.clientY - d.py) / d.sh)),
    }));
  };
  const onUp = () => { drag.current = null; };
  const auto = () => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      try { setCrop(suggestCrop(ctx.getImageData(0, 0, cv.width, cv.height))); } catch { setCrop(centreCrop(cv.width, cv.height)); }
    };
    img.src = row.src;
  };
  const stageW = Math.min(360, (440 * W) / H);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Photo of ${row.name || row.file.name}`}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Not a .card: the theme makes cards see-through, and the page would show through the dialog. */}
      <div style={{ padding: 18, width: 'min(680px, 100%)', maxHeight: '95vh', overflow: 'auto', display: 'grid', gap: 12, background: '#ffffff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontWeight: 800, color: GREEN, fontSize: 15 }}>{row.name || row.file.name}: passport frame</div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div ref={stage} style={{ position: 'relative', width: stageW, height: (stageW * H) / W, flex: 'none', userSelect: 'none', touchAction: 'none' }}>
            <img src={row.src} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 6 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', borderRadius: 6, clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${crop.y * 100}%, ${crop.x * 100}% ${crop.y * 100}%, ${crop.x * 100}% ${(crop.y + crop.h) * 100}%, ${(crop.x + crop.w) * 100}% ${(crop.y + crop.h) * 100}%, ${(crop.x + crop.w) * 100}% ${crop.y * 100}%, 0 ${crop.y * 100}%)` }} />
            <div aria-label="Passport frame: drag to move" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              style={{ position: 'absolute', left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%`, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,.5)', cursor: 'move' }} />
          </div>
          <div style={{ display: 'grid', gap: 10, minWidth: 160, flex: '1 1 160px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>As saved</div>
            <div style={{ ...cropStyle(row.src, crop, 140), border: '1px solid #CBD5E1', borderRadius: 4 }} />
            <label style={label}>Size
              <input type="range" min={0.08} max={maxW} step={0.005} value={crop.w} onChange={(e) => setSize(Number(e.target.value))} aria-label="Frame size" />
            </label>
            <div style={{ fontSize: 12, color: '#64748B' }}>Drag the white frame over the face and shoulders. Smaller frame = closer face.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={auto}><RefreshCw size={13} /> Automatic</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onSave(crop)}>Done</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterFromPhotosPage() {
  const filesRef = useRef(null);
  const folderRef = useRef(null);
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const [form, setForm] = useState({ place: '', gender: '', admissionDate: today(), fatherName: '.', fatherCnic: '11111111111', phone: '111111' });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const [rows, setRows] = useState([]);       // { key, file, src, width, height, crop, name, problem, place, include }
  const [busy, setBusy] = useState('');       // reading | saving
  const [progress, setProgress] = useState(null);
  const [existing, setExisting] = useState({}); // classId -> [{ name, rollNo }]
  const [editing, setEditing] = useState(null);
  const [done, setDone] = useState(null);

  // Every class and section as one choice.
  const places = useMemo(() => classes.flatMap((c) => [
    ...(c.sections.length ? c.sections.map((s) => ({ key: placeKey(c.id, s.id), label: `${c.name} — ${s.name}`, classId: c.id, sectionId: s.id })) : []),
    { key: placeKey(c.id, null), label: c.sections.length ? `${c.name} (no section)` : c.name, classId: c.id, sectionId: null },
  ]), [classes]);
  const placeOf = (key) => places.find((p) => p.key === key);

  const loadClass = async (classId) => {
    if (!classId || existing[classId]) return;
    try {
      const { data } = await api.get('/students', { params: { classId, limit: 5000 } });
      setExisting((m) => ({ ...m, [classId]: (data.data || []).map((s) => ({ name: [s.name, s.lastName].filter(Boolean).join(' '), rollNo: s.rollNo })) }));
    } catch { /* the check is a help only */ }
  };

  const choose = async (list, input) => {
    const files = [...(list || [])].filter(isImage);
    if (input) input.value = '';
    if (!files.length) { toast.error('No JPG, PNG or WebP photos were chosen.'); return; }
    setBusy('reading'); setDone(null);
    const out = [];
    for (const [i, file] of files.entries()) {
      try {
        const pv = await previewOf(file);
        const n = nameFromFile(file.name);
        const folder = placeFromPath(file.webkitRelativePath, classes);
        const place = folder ? placeKey(folder.classId, folder.sectionId) : form.place;
        out.push({ key: `${Date.now()}-${i}`, file, ...pv, name: n.name, problem: n.problem || '', place, fromFolder: !!folder, include: true });
      } catch (e) {
        out.push({ key: `${Date.now()}-${i}`, file, src: '', name: '', problem: e.message, place: form.place, include: false, unreadable: true });
      }
      if (i % 10 === 9) setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    setRows((r) => [...r, ...out]);
    [...new Set(out.map((r) => placeOf(r.place)?.classId).filter(Boolean))].forEach(loadClass);
    setBusy('');
  };

  // Why a photo is not registered as it stands (or '').
  const checked = useMemo(() => {
    const seen = new Map();
    return rows.map((r) => {
      const p = placeOf(r.place);
      let why = '';
      let skip = false;
      if (r.unreadable) why = r.problem;
      else if (!r.name.trim()) why = r.problem || 'Type the student\'s name.';
      else if (!p) why = 'Choose the class.';
      else {
        const k = `${p.classId}|${norm(r.name)}`;
        const there = (existing[p.classId] || []).find((s) => norm(s.name) === norm(r.name));
        if (there) { why = `Already in ${classes.find((c) => c.id === p.classId)?.name || 'this class'}${there.rollNo ? ` (roll no. ${there.rollNo})` : ''}. Tick to add another child of this name.`; skip = true; }
        else if (seen.has(k)) { why = `The same name as ${seen.get(k)}. Tick to add both.`; skip = true; }
        seen.set(k, r.file.name);
      }
      const blocked = !!why && !skip;
      return { ...r, why, blocked, on: blocked ? false : (skip ? r.include === 'yes' : r.include !== false) };
    });
  }, [rows, existing, places]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = checked.filter((r) => r.on);
  const update = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const register = async () => {
    if (!chosen.length) return;
    if (!form.fatherName.trim()) { toast.error('Give the father\'s name to use (a "." is fine).'); return; }
    setBusy('saving');
    setProgress({ done: 0, total: chosen.length });
    const results = [];
    for (const r of chosen) {
      const p = placeOf(r.place);
      try {
        const photoUrl = await passportFromFile(r.file, r.crop);
        const { data } = await api.post('/students', {
          name: r.name.trim(),
          fatherName: form.fatherName.trim(),
          fatherCnic: form.fatherCnic.trim() || null,
          parentCnic: form.fatherCnic.trim() || null,
          emergencyPhone: form.phone.trim(),
          gender: form.gender || undefined,
          classId: p.classId,
          sectionId: p.sectionId || undefined,
          admissionDate: form.admissionDate || undefined,
          photoUrl,
          createPortalAccounts: true,
        });
        results.push({ key: r.key, status: 'registered', id: data.data?.id, name: r.name.trim(), rollNo: data.data?.rollNo, place: p.label, credentials: data.credentials });
      } catch (e) {
        results.push({ key: r.key, status: e.response?.status === 409 ? 'skipped' : 'failed', name: r.name.trim(), place: p?.label, error: e.response?.data?.message || e.message });
      }
      setProgress((x) => ({ ...x, done: x.done + 1 }));
    }
    const ok = results.filter((x) => x.status === 'registered');
    setRows((rs) => rs.filter((r) => !ok.some((x) => x.key === r.key)));
    // The students just added are in their class now.
    setExisting((m) => {
      const next = { ...m };
      for (const x of ok) {
        const cid = placeOf(chosen.find((r) => r.key === x.key)?.place)?.classId;
        if (cid) next[cid] = [...(next[cid] || []), { name: x.name, rollNo: x.rollNo }];
      }
      return next;
    });
    setDone(results);
    setProgress(null);
    setBusy('');
    toast.success(`${ok.length} ${ok.length === 1 ? 'student' : 'students'} registered`);
  };

  const registered = done ? done.filter((x) => x.status === 'registered') : [];
  const notDone = done ? done.filter((x) => x.status !== 'registered') : [];

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/students/bulk-import" className="btn btn-outline btn-sm btn-icon" aria-label="Back to Import & Export"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={21} color={GREEN} /> New Students from Photos</h1>
          <p className="page-subtitle">Each photo named with the student's name becomes a new student of the class, with a passport-size photo.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 14, display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <label style={label}>Class and section *
            <select className="form-select" value={form.place} onChange={(e) => {
              const v = e.target.value;
              setRows((rs) => rs.map((r) => (r.fromFolder || (r.place && r.place !== form.place) ? r : { ...r, place: v })));
              set({ place: v });
              loadClass(placeOf(v)?.classId);
            }}>
              <option value="">Choose…</option>
              {places.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <span style={{ fontWeight: 400, color: '#64748B' }}>Photos in class folders go to that class.</span>
          </label>
          <label style={label}>Gender
            <select className="form-select" value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
              <option value="">Leave empty</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </label>
          <label style={label}>Admission date
            <input className="form-input" type="date" value={form.admissionDate} max={today()} onChange={(e) => set({ admissionDate: e.target.value })} />
          </label>
        </div>
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>Until the real details are known, every student gets</div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label style={label}>Father's name
              <input className="form-input" value={form.fatherName} maxLength={60} onChange={(e) => set({ fatherName: e.target.value })} />
            </label>
            <label style={label}>Father's CNIC
              <input className="form-input" value={form.fatherCnic} maxLength={20} onChange={(e) => set({ fatherCnic: e.target.value })} />
            </label>
            <label style={label}>Parent phone
              <input className="form-input" value={form.phone} maxLength={20} onChange={(e) => set({ phone: e.target.value })} />
            </label>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <AlertTriangle size={14} style={{ flex: 'none', marginTop: 2, color: '#B45309' }} />
            <span>These students show as <strong>incomplete</strong> in the Student Registry until the real details are put in with <strong>Edit</strong>. Each gets a parent account of their own: a stand-in phone joins nobody, and the real number, once entered, becomes the parent's sign-in.</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 14, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-primary" disabled={!!busy || !classes.length} onClick={() => filesRef.current?.click()}><Camera size={15} /> Choose photos</button>
          <button type="button" className="btn btn-outline" disabled={!!busy || !classes.length} onClick={() => folderRef.current?.click()}><FolderOpen size={15} /> Choose a folder</button>
          {rows.length > 0 && !busy && <button type="button" className="btn btn-outline btn-sm" onClick={() => { setRows([]); setDone(null); }}><RefreshCw size={13} /> Start again</button>}
          <span style={{ fontSize: 12.5, color: '#64748B' }}>Name each photo with the student's name, e.g. <code>Ali Raza.jpg</code>. A folder may hold class folders: <code>Class 5/A/Ali Raza.jpg</code>.</span>
        </div>
        <input ref={filesRef} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Student photos" style={{ display: 'none' }} onChange={(e) => choose(e.target.files, e.target)} />
        <input ref={folderRef} type="file" multiple webkitdirectory="" directory="" aria-label="Folder of student photos" style={{ display: 'none' }} onChange={(e) => choose(e.target.files, e.target)} />
        {busy === 'reading' && <div style={{ fontSize: 13, color: '#475569' }}>Reading the photos{progress ? ` (${progress.done} of ${progress.total})` : ''}…</div>}

        {checked.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: '#475569' }}>
              <strong>{chosen.length}</strong> of {checked.length} ready to register. Click a photo to move or zoom its passport frame.
            </div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
              {checked.map((r) => (
                <div key={r.key} style={{ display: 'flex', gap: 10, border: `1px solid ${r.on ? '#BBF7D0' : r.blocked ? '#FECACA' : '#E2E8F0'}`, background: r.on ? '#F0FDF4' : '#fff', borderRadius: 10, padding: 8 }}>
                  {r.src
                    ? <button type="button" title="Move or zoom the frame" onClick={() => setEditing(r)} style={{ ...cropStyle(r.src, r.crop, 72), border: '1px solid #CBD5E1', borderRadius: 4, padding: 0, cursor: 'pointer', flex: 'none' }} aria-label={`Frame of ${r.name || r.file.name}`} />
                    : <div style={{ width: 72, height: 72 / RATIO, background: '#F1F5F9', borderRadius: 4, flex: 'none' }} />}
                  <div style={{ display: 'grid', gap: 5, minWidth: 0, flex: 1, alignContent: 'start' }}>
                    <input className="form-input" style={{ padding: '4px 7px', fontSize: 13, fontWeight: 700 }} aria-label="Student's name" placeholder="Student's name" value={r.name} disabled={r.unreadable || !!busy} onChange={(e) => update(r.key, { name: e.target.value })} />
                    <select className="form-select" style={{ padding: '3px 6px', fontSize: 12 }} aria-label="Class" value={r.place} disabled={r.unreadable || !!busy} onChange={(e) => { update(r.key, { place: e.target.value, fromFolder: true }); loadClass(placeOf(e.target.value)?.classId); }}>
                      <option value="">Class…</option>
                      {places.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, color: r.blocked ? '#B91C1C' : r.why ? '#92400E' : '#15803D' }}>
                      <input type="checkbox" checked={r.on} disabled={r.blocked || !!busy} onChange={(e) => update(r.key, { include: r.why ? (e.target.checked ? 'yes' : 'no') : e.target.checked })} />
                      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{r.why || 'Ready'}{r.crop && !r.crop.auto && !r.why ? ' · check the frame' : ''}</span>
                    </label>
                    <span style={{ fontSize: 10.5, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.file.webkitRelativePath || r.file.name}>{r.file.webkitRelativePath || r.file.name}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {busy === 'saving' && progress && <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>Registering {progress.done} of {progress.total}… keep this page open</span>}
              <button type="button" className="btn btn-success" disabled={!chosen.length || !!busy} onClick={register}>
                <UserPlus size={15} /> {busy === 'saving' ? 'Registering…' : `Register ${chosen.length} ${chosen.length === 1 ? 'student' : 'students'}`}
              </button>
            </div>
            {busy === 'saving' && progress && (
              <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(progress.done / progress.total) * 100}%`, height: '100%', background: GREEN, transition: 'width .3s' }} />
              </div>
            )}
          </>
        )}
      </div>

      {done && (
        <div className="card" style={{ padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={24} color="#1F9D6B" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{registered.length} {registered.length === 1 ? 'student' : 'students'} registered</div>
              <div style={{ fontSize: 12.5, color: '#64748B' }}>With roll numbers and passport photos. Fill in their real details in the Student Registry with Edit.</div>
            </div>
          </div>
          {registered.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#F2A33A22', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              <span style={{ flex: '1 1 260px' }}><strong>Download the login details now.</strong> The new passwords are shown only here.</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => downloadLogins({ students: registered, staff: [] }, 'new-students').catch(() => toast.error('The login sheet could not be created.'))}><Download size={14} /> Download login details</button>
            </div>
          )}
          {registered.length > 0 && (
            <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="data-table" aria-label="Students registered">
                <thead><tr><th>Student</th><th>Class</th><th>Roll No</th></tr></thead>
                <tbody>{registered.map((x) => <tr key={x.key}><td><Link to={`/students/${x.id}`} style={{ fontWeight: 700 }}>{x.name}</Link></td><td>{x.place}</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{x.rollNo}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {notDone.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{notDone.length} not registered</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 2 }}>
                {notDone.map((x) => <li key={x.key}>{x.name}{x.place ? ` (${x.place})` : ''}: {x.error}</li>)}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/students" className="btn btn-outline btn-sm"><Users size={13} /> Student Registry</Link>
            <Link to="/examination?tab=roll-slips" className="btn btn-outline btn-sm">Roll number slips</Link>
          </div>
        </div>
      )}

      {editing && (
        <CropEditor row={editing} onClose={() => setEditing(null)} onSave={(crop) => { update(editing.key, { crop }); setEditing(null); }} />
      )}
      {!rows.length && !done && (
        <div className="card" style={{ padding: 18, fontSize: 13.5, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}><Crop size={15} /> How it works</div>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>Choose the class (and section). Photos kept in class folders go to their own class.</li>
            <li>Choose the photos. Each one's name is the student's name; the frame is set on the head and shoulders.</li>
            <li>Check the names, fix any frame by clicking the photo, and click <strong>Register</strong>.</li>
            <li>Download the login details. Each student has a roll number and a passport photo; fill in the real details later.</li>
          </ol>
          <p style={{ margin: '8px 0 0', color: '#64748B' }}>Students who are already registered and only need a photo: use <Link to="/students/bulk-import">Import &amp; Export → Student photos in bulk</Link>.</p>
        </div>
      )}
    </div>
  );
}
