/**
 * Student photos in bulk, on the Import & Export page.
 *
 *   1  Download the photo list: every student with the name to give their
 *      photo file (the roll number).
 *   2  Choose all the photos at once (or the folder). Each file name is the
 *      student's roll number, B-Form number, or full name; the list shows
 *      who each photo is for before anything is saved.
 *   3  Upload. Each photo is shrunk here to passport size (about 40 KB) and
 *      sent ten at a time. A student who has a photo keeps it, unless
 *      "Replace photos students already have" is ticked.
 */
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Download, FolderOpen, Image as Images, CheckCircle2, XCircle, Upload, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { compressPhoto } from '../../utils/photo';

const BATCH = 10;
const MAX_BYTES = 20 * 1024 * 1024; // a camera's photo; shrunk before sending
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const isImage = (f) => /^image\/(jpeg|png|webp)$/.test(f.type) || IMAGE_RE.test(f.name);

const chip = (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, borderRadius: 99, padding: '2px 9px', background: bg, color, whiteSpace: 'nowrap' });

export default function BulkPhotos({ saveFromApi }) {
  const filesRef = useRef(null);
  const folderRef = useRef(null);
  const [items, setItems] = useState(null);   // [{ file, key, student?, error? }]
  const [busy, setBusy] = useState('');       // list | matching | uploading
  const [replace, setReplace] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(null);     // [{ file, status, student?, error? }]
  const [show, setShow] = useState('all');

  const reset = () => { setItems(null); setDone(null); setProgress(null); setShow('all'); };

  const photoList = async () => {
    setBusy('list');
    try { await saveFromApi('/bulk/photo-list', 'student-photo-list.xlsx'); toast.success('Photo list downloaded'); }
    catch { toast.error('The photo list could not be downloaded. Try again.'); }
    finally { setBusy(''); }
  };

  const choose = async (list, input) => {
    const all = [...(list || [])];
    if (input) input.value = '';
    const images = all.filter(isImage);
    if (!images.length) { toast.error('No JPG, PNG or WebP photos were chosen.'); return; }
    setBusy('matching'); setDone(null); setProgress(null);
    try {
      const { data } = await api.post('/bulk/photos/match', { files: images.map((f) => f.name) });
      setItems(images.map((f, i) => {
        const m = data.data[i] || {};
        const big = f.size > MAX_BYTES ? `This photo is ${(f.size / 1048576).toFixed(1)} MB: up to 20 MB.` : null;
        return { ...m, file: f, error: m.error || big };
      }));
      setShow('all');
    } catch (e) {
      toast.error(e.response?.data?.message || 'The photos could not be checked.');
    } finally {
      setBusy('');
    }
  };

  const ready = (items || []).filter((x) => x.student && !x.error);
  const toSave = ready.filter((x) => replace || !x.student.hasPhoto);
  const haveOne = ready.filter((x) => x.student.hasPhoto);
  const problems = (items || []).filter((x) => x.error);

  const upload = async () => {
    if (!toSave.length) return;
    setBusy('uploading');
    setProgress({ done: 0, total: toSave.length });
    const out = [];
    try {
      for (let i = 0; i < toSave.length; i += BATCH) {
        const part = toSave.slice(i, i + BATCH);
        const photos = [];
        for (const x of part) {
          try { photos.push({ file: x.file.name, photo: await compressPhoto(x.file) }); }
          catch (e) { out.push({ file: x.file.name, status: 'failed', student: x.student, error: e.message }); }
        }
        if (photos.length) {
          const { data } = await api.post('/bulk/photos', { photos, replace });
          out.push(...data.data);
        }
        setProgress((p) => ({ ...p, done: Math.min(p.total, p.done + part.length) }));
      }
      const saved = out.filter((r) => r.status === 'saved').length;
      toast.success(`${saved} ${saved === 1 ? 'photo' : 'photos'} saved`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'The upload stopped part-way. Photos already saved are kept: choose the photos again to finish (those saved are skipped).');
    } finally {
      setDone(out);
      setBusy('');
    }
  };

  const rows = (items || []).filter((x) => show === 'all' || (show === 'problems' ? x.error : show === 'has' ? (x.student && !x.error && x.student.hasPhoto) : (x.student && !x.error && !x.student.hasPhoto)));
  const saved = done ? done.filter((r) => r.status === 'saved').length : 0;
  const failed = done ? done.filter((r) => r.status === 'failed') : [];

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={17} color="#0F3D33" /> Student photos in bulk</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>After the students are imported: every photo at once, matched by its file name.</div>
        </div>
        {items && !busy && <button type="button" className="btn btn-outline btn-sm" onClick={reset}><RefreshCw size={13} /> Choose other photos</button>}
      </div>

      <div className="card-body" style={{ display: 'grid', gap: 14 }}>
        {!items && (
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.7, display: 'grid', gap: 4 }}>
            <li>
              <strong>Name each photo with the student's roll number</strong>, for example <code>NUR-26-001.jpg</code>. The
              {' '}<button type="button" className="btn btn-outline btn-sm" style={{ padding: '1px 8px', verticalAlign: 'baseline' }} onClick={photoList} disabled={!!busy}><Download size={12} /> {busy === 'list' ? 'Preparing…' : 'photo list'}</button>{' '}
              has every student's roll number and the file name to give their photo. The B-Form number (<code>3520212345671.jpg</code>) or the student's full name (<code>Ayesha Khan.jpg</code>, when no other student has it) also work.
            </li>
            <li><strong>Choose all the photos at once</strong> (in the folder press <kbd>Ctrl</kbd>+<kbd>A</kbd>), or choose the whole folder. JPG, PNG or WebP; large camera photos are fine, they are made small here.</li>
            <li><strong>Check the list</strong> of who each photo is for, then press <strong>Upload</strong>. Students who already have a photo keep it, unless you tick <em>Replace</em>.</li>
          </ol>
        )}

        {!items && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => filesRef.current?.click()}>
              <Images size={15} /> {busy === 'matching' ? 'Checking the photos…' : 'Choose photos'}
            </button>
            <button type="button" className="btn btn-outline" disabled={!!busy} onClick={() => folderRef.current?.click()}>
              <FolderOpen size={15} /> Choose a folder
            </button>
          </div>
        )}
        <input ref={filesRef} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Student photos" style={{ display: 'none' }} onChange={(e) => choose(e.target.files, e.target)} />
        <input ref={folderRef} type="file" multiple webkitdirectory="" directory="" aria-label="Folder of student photos" style={{ display: 'none' }} onChange={(e) => choose(e.target.files, e.target)} />

        {items && !done && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="tablist" aria-label="Show photos">
              {[
                ['all', `All ${items.length}`],
                ['new', `${ready.length - haveOne.length} ready`],
                ['has', `${haveOne.length} already have a photo`],
                ['problems', `${problems.length} not matched`],
              ].map(([k, t]) => (
                <button key={k} type="button" role="tab" aria-selected={show === k} className={`btn btn-sm ${show === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShow(k)}>{t}</button>
              ))}
            </div>
            <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="data-table" aria-label="Who each photo is for">
                <thead><tr><th>Photo file</th><th>Student</th><th>Class</th><th>Roll No</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.slice(0, 500).map((x, i) => (
                    <tr key={`${x.file.name}-${i}`}>
                      <td style={{ fontFamily: 'Consolas, monospace', fontSize: 12.5 }}>{x.file.name}</td>
                      <td>{x.student ? <><strong>{x.student.name}</strong>{x.student.fatherName && <span style={{ color: 'var(--text-muted)' }}> s/o {x.student.fatherName}</span>}</> : '—'}</td>
                      <td>{x.student?.className || '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{x.student?.rollNo || '—'}</td>
                      <td>
                        {x.error
                          ? <span style={{ ...chip('#D6455014', '#B23742'), whiteSpace: 'normal' }}><XCircle size={12} /> {x.error}</span>
                          : x.student.hasPhoto
                            ? <span style={chip('#F2A33A22', '#9A6408')}>{replace ? 'Will be replaced' : 'Has a photo: kept'}</span>
                            : <span style={chip('#1F9D6B18', '#15803D')}><CheckCircle2 size={12} /> Ready (by {x.student.by})</span>}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 500 && <tr><td colSpan={5} style={{ color: 'var(--text-muted)' }}>… and {rows.length - 500} more</td></tr>}
                  {!rows.length && <tr><td colSpan={5} style={{ color: 'var(--text-muted)', padding: 18 }}>None.</td></tr>}
                </tbody>
              </table>
            </div>
            {problems.length > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Photos not matched are left out. Rename them with the roll number (see the{' '}
                <button type="button" className="btn btn-outline btn-sm" style={{ padding: '0 7px' }} onClick={photoList} disabled={!!busy}>photo list</button>) and choose them again.
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} disabled={!!busy} />
                Replace photos students already have ({haveOne.length})
              </label>
              <button type="button" className="btn btn-success" disabled={!toSave.length || !!busy} onClick={upload}>
                <Upload size={15} /> {busy === 'uploading' ? 'Uploading…' : `Upload ${toSave.length} ${toSave.length === 1 ? 'photo' : 'photos'}`}
              </button>
            </div>
          </>
        )}

        {busy === 'uploading' && progress && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <strong>Uploading…</strong><span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress.done} of {progress.total}</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} style={{ height: 8, background: 'var(--border, #e5e7eb)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(progress.done / progress.total) * 100}%`, height: '100%', background: '#0F3D33', transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Keep this page open.</div>
          </div>
        )}

        {done && !busy && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={24} color="#1F9D6B" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{saved} {saved === 1 ? 'photo' : 'photos'} saved</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>They are on the students' records, ID cards, roll number slips and result cards now.</div>
              </div>
            </div>
            {failed.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{failed.length} not saved</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 2 }}>
                  {failed.slice(0, 50).map((f, i) => <li key={i}><code>{f.file}</code>: {f.error}</li>)}
                </ul>
              </div>
            )}
            <div><button type="button" className="btn btn-outline btn-sm" onClick={reset}><Images size={13} /> Add more photos</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
