/**
 * Fill the admission wizard from a filled paper form.
 *
 * The office prints the blank admission form, the parent fills it in by hand
 * and brings or WhatsApps it back. Here the office drops in a photo, a scan
 * or a PDF of it (or pastes a picture, or the details as text); the server
 * reads it (services/formReader.service.js) and the values found are shown
 * for checking before they go into the form. Nothing is saved until the
 * office admits the student as usual.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { prepareScan } from '../utils/scan';

export const READER_LABELS = {
  name: 'Student name', firstNameUrdu: 'Name (Urdu)', gender: 'Gender', dob: 'Date of birth',
  admissionDate: 'Admission date', className: 'Class', sectionName: 'Section',
  religion: 'Religion', nationality: 'Nationality', caste: 'Caste', bFormNo: 'B-Form No.', familyNo: 'Family No.',
  address: 'Permanent address', city: 'City', province: 'Province', postalAddress: 'Postal address',
  fatherName: "Father's name", fatherNameUrdu: "Father's name (Urdu)", fatherCnic: "Father's CNIC",
  fatherOccupation: "Father's occupation", fatherQualification: "Father's qualification",
  emergencyPhone: 'Parent mobile', motherName: "Mother's name", motherCnic: "Mother's CNIC",
  motherOccupation: "Mother's occupation", motherQualification: "Mother's qualification", motherPhone: "Mother's mobile",
  email: 'Email', prevSchoolName: 'Previous school', prevAdmissionNo: 'Admission No. there',
  prevSchoolAddress: "Previous school's address", prevSchoolPhone: "Previous school's phone",
  prevSchoolFocalPerson: 'Contact person there', prevGrade: 'Previous grade', prevTestGrade: 'Test grade',
  admissionTestMarks: 'Admission test marks', bloodGroup: 'Blood group', foodDietaryReq: 'Food / diet',
  allergies: 'Allergies', childCondition: 'Condition of the child',
};
const ORDER = Object.keys(READER_LABELS);
const MAX_PAGES = 6;

export default function FormReaderPanel({ onApply, startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  const [pages, setPages] = useState([]);
  const [pasted, setPasted] = useState('');
  const [showText, setShowText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState(null);     // { fields, unclear, notes }
  const [picked, setPicked] = useState({});
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const boxRef = useRef(null);

  const { data: status } = useQuery({
    queryKey: ['read-form-status'],
    queryFn: () => api.get('/admissions/read-form/status').then((r) => r.data.data).catch(() => ({ enabled: false })),
    staleTime: 5 * 60_000,
    enabled: open,
  });
  const enabled = status?.enabled !== false;

  const addFiles = async (files) => {
    const list = [...files].slice(0, MAX_PAGES - pages.length);
    if (files.length > list.length) toast.error(`Up to ${MAX_PAGES} pages at a time.`);
    for (const f of list) {
      try {
        const p = await prepareScan(f);
        setPages((x) => [...x, p]);
      } catch (e) { toast.error(e.message); }
    }
    setFound(null);
  };

  // Ctrl+V of a picture (a WhatsApp photo, a screenshot) while the panel is open.
  useEffect(() => {
    if (!open) return undefined;
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
      if (files.length) { e.preventDefault(); addFiles(files); return; }
      // Text pasted outside a box: the details typed in a message.
      const t = e.clipboardData?.getData('text');
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if (t && t.trim().length > 20 && !inField) { e.preventDefault(); setPasted(t); setShowText(true); setFound(null); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, pages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const read = async () => {
    setBusy(true);
    setFound(null);
    try {
      const r = await api.post('/admissions/read-form', { files: pages.map((p) => p.dataUrl), text: showText ? pasted : '' }, { timeout: 120000 });
      const d = r.data.data;
      const keys = ORDER.filter((k) => d.fields[k]);
      if (!keys.length) {
        toast.error('Nothing could be read from that. Try a sharper, straighter photo in good light.');
        return;
      }
      setFound({ fields: { ...d.fields }, unclear: d.unclear || [], notes: d.notes || '' });
      setPicked(Object.fromEntries(keys.map((k) => [k, true])));
      setTimeout(() => boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (e) {
      toast.error(e.response?.data?.message || 'The form could not be read. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    const fields = {};
    Object.keys(picked).forEach((k) => { if (picked[k] && found.fields[k]) fields[k] = found.fields[k]; });
    onApply(fields, found.unclear.filter((k) => fields[k] !== undefined || !found.fields[k]));
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full mb-5 flex items-center gap-3 text-left bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-200 hover:border-indigo-300 rounded-2xl px-4 py-3 transition">
        <span className="text-2xl">📄</span>
        <span className="flex-1">
          <span className="block font-bold text-slate-800 text-sm">Got a filled paper form back? Fill this form from it</span>
          <span className="block text-xs text-slate-500">Upload or paste a photo, scan or PDF of the form the parent filled in. It is read for you to check.</span>
        </span>
        <span className="text-xs font-semibold text-indigo-700">Open →</span>
      </button>
    );
  }

  const count = Object.values(picked).filter(Boolean).length;

  return (
    <div ref={boxRef} className="mb-5 bg-white border border-indigo-200 rounded-2xl p-4 shadow-sm" aria-label="Fill from a paper form">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">📄</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm">Fill from a filled paper form</h3>
          <p className="text-xs text-slate-500">Photos of every page (straight, in good light), a scan or a PDF. You check everything before admitting.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm" aria-label="Close paper form reader">✕</button>
      </div>

      {!enabled && (
        <div role="note" className="mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
          Reading paper forms is not switched on yet: the server needs an AI key (ANTHROPIC_API_KEY or GEMINI_API_KEY). Until then, type the details in below.
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed p-4 text-center transition ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="text-sm text-slate-600 mb-2">Drop the pages here, or <strong>Ctrl+V</strong> to paste a picture</div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Choose photo / scan / PDF</button>
          <button type="button" onClick={() => camRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold">📷 Take a photo</button>
          <button type="button" onClick={() => setShowText((v) => !v)} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold">{showText ? 'Hide text box' : 'Paste details as text'}</button>
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" aria-label="Choose pages of the filled form"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Take a photo of the filled form"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {pages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {pages.map((p, i) => (
            <div key={i} className="relative w-20 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              {p.kind === 'pdf' ? <span className="text-xs text-slate-500 text-center px-1">📑<br />{p.name.slice(0, 14)}</span>
                : <img src={p.dataUrl} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />}
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center">Page {i + 1}</span>
              <button type="button" aria-label={`Remove page ${i + 1}`} onClick={() => { setPages((x) => x.filter((_, j) => j !== i)); setFound(null); }}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] leading-5">✕</button>
            </div>
          ))}
        </div>
      )}

      {showText && (
        <textarea value={pasted} onChange={(e) => { setPasted(e.target.value); setFound(null); }} rows={5} aria-label="Admission details as text"
          placeholder={"Paste the details the parent sent, e.g.\nName: Ayesha Khan\nFather: Tariq Mehmood\nDOB: 04/05/2017 ..."}
          className="mt-3 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
      )}

      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={read} disabled={busy || !enabled || (!pages.length && !(showText && pasted.trim()))}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold">
          {busy ? 'Reading the form…' : 'Read the form'}
        </button>
        {busy && <span className="text-xs text-slate-500">This takes 10 to 40 seconds.</span>}
      </div>

      {found && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-bold text-slate-800 text-sm">Read from the form</h4>
            <span className="text-xs text-slate-500">Correct anything here, untick what you do not want, then fill the form.</span>
          </div>
          {found.notes && <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-2 text-slate-600">Note: {found.notes}</div>}
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {ORDER.filter((k) => found.fields[k] !== undefined).map((k) => {
              const doubt = found.unclear.includes(k);
              return (
                <label key={k} className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1 ${doubt ? 'bg-amber-50 border border-amber-200' : ''}`}>
                  <input type="checkbox" checked={!!picked[k]} onChange={(e) => setPicked((p) => ({ ...p, [k]: e.target.checked }))} aria-label={`Use ${READER_LABELS[k]}`} />
                  <span className="w-36 shrink-0 text-xs font-semibold text-slate-500">{READER_LABELS[k]}{doubt && <span className="text-amber-700"> · check</span>}</span>
                  <input value={found.fields[k]} onChange={(e) => setFound((f) => ({ ...f, fields: { ...f.fields, [k]: e.target.value } }))}
                    aria-label={READER_LABELS[k]} dir={/Urdu$/.test(k) ? 'rtl' : undefined}
                    className="flex-1 min-w-0 px-2 py-1 rounded-md border border-slate-200 text-sm" />
                </label>
              );
            })}
          </div>
          {found.unclear.filter((k) => !found.fields[k]).length > 0 && (
            <p className="text-xs text-amber-800 mt-2">Could not be read, fill in by hand: {found.unclear.filter((k) => !found.fields[k]).map((k) => READER_LABELS[k] || k).join(', ').replace(/\.$/, '')}.</p>
          )}
          <button type="button" onClick={apply} disabled={!count}
            className="mt-3 px-4 py-2 rounded-xl bg-[#1B2F6E] hover:bg-[#16255a] disabled:opacity-50 text-white text-sm font-semibold">
            Fill the admission form with {count} field{count === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}
