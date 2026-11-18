/**
 * IlmForge — ID card printing for students, teachers and staff.
 * 11 designs (cardTemplates.js), portrait and landscape, each with a front
 * and a back: school logo, photo, a scannable barcode and QR code. The
 * design, colours and "valid until" chosen are remembered on this computer.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { compressPhoto, compressLogo, pickProblem, PICK_RULES } from '../../utils/photo';
import useAuthStore from '../../store/auth.store';
import { schoolLogoOf, logoOnlyInBrowser } from '../../utils/schoolBranding';
import { TEMPLATES, templateById } from './cardTemplates';
import { cardCode, buildCard, qrDataUrlsFor, buildPrintHTML } from './cardBuild';
import {
  CreditCard, Users, Award, Printer, Search, Settings,
  Palette, Camera, X, CheckSquare, Eye, RotateCcw
} from 'lucide-react';

/* ─── Color presets ──────────────────────────────── */
const PRESETS = [
  { name:'Teal',   p:'#0F766E', s:'#D97706' },
  { name:'Navy',   p:'#1E3A5F', s:'#F59E0B' },
  { name:'Purple', p:'#7C3AED', s:'#F472B6' },
  { name:'Red',    p:'#DC2626', s:'#1F2937' },
  { name:'Green',  p:'#059669', s:'#ECFDF5' },
  { name:'Orange', p:'#EA580C', s:'#1F2937' },
  { name:'Blue',   p:'#2563EB', s:'#DBEAFE' },
  { name:'Dark',   p:'#111827', s:'#F59E0B' },
];

/* The design, colours and validity, remembered on this computer. */
const remembered = (k, d) => { try { return localStorage.getItem(`idcard_${k}`) || d; } catch { return d; } };
const remember = (k, v) => { try { localStorage.setItem(`idcard_${k}`, v); } catch { /* not kept */ } };

/* A design's front, drawn small for the gallery. Cards are 54 × 85.6 mm. */
function CardThumb({ html, portrait }) {
  const W = portrait ? 204 : 324; const H = portrait ? 324 : 204;
  const k = Math.min(124 / W, 118 / H);
  return (
    <div style={{ width: W * k, height: H * k, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${k})`, transformOrigin: 'top left', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
const GALLERY_FILTERS = [
  ['all', 'All'], ['portrait', 'Portrait'], ['landscape', 'Landscape'], ['students', 'Students'], ['staff', 'Teachers & staff'],
];

/* How many people one list request asks for. Students: the API allows up
   to 300, and every row carries a photo of about 40 KB. */
const STUDENT_LIMIT = 200;
const STAFF_LIMIT = 500;

/* ════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════ */
export default function IDCardsPage() {
  // /staff/id-cards and /students/id-cards are linked separately from the
  // command palette and Reports Hub, so honour which one was opened —
  // previously both landed on the Students tab and "Staff ID Cards" showed
  // a student list.
  const { pathname } = useLocation();
  const [type,     setType]     = useState(pathname.startsWith('/staff') ? 'staff' : 'student');
  const [classId,  setClassId]  = useState('');
  const [sectionId,setSectionId]= useState('');
  const [search,   setSearch]   = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [primary,  setPrimaryRaw]  = useState(() => remembered('primary', '#0F766E'));
  const [secondary,setSecondaryRaw]= useState(() => remembered('secondary', '#D97706'));
  const [template, setTemplateRaw] = useState(() => templateById(remembered('template', 'academic')).id);
  const [validity, setValidityRaw] = useState(() => remembered('validity', ''));
  const [galleryFilter, setGalleryFilter] = useState('all');
  const setPrimary = (v) => { setPrimaryRaw(v); remember('primary', v); };
  const setSecondary = (v) => { setSecondaryRaw(v); remember('secondary', v); };
  const setTemplate = (v) => { setTemplateRaw(v); remember('template', v); };
  const setValidity = (v) => { setValidityRaw(v); remember('validity', v); };
  const [selected, setSelected] = useState([]);
  const [photoMap, setPhotoMap] = useState({});
  const [localIds, setLocalIds] = useState([]); // ids whose photo came from this browser only
  const qc = useQueryClient();
  const [preview,  setPreview]  = useState(null);

  const fileRefs = useRef({});

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { school: signedInSchool, user, updateSchool } = useAuthStore();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  // The school's saved record (admins); everyone else has the school as it
  // was at sign-in, refreshed when the app opens.
  const { data:savedSchool } = useQuery({
    queryKey:['school-settings'],
    queryFn:()=>api.get('/settings/school', { silent: true }).then(r=>r.data.data),
    enabled: isAdmin,
    retry: false,
  });
  const school = { ...(signedInSchool || {}), ...(savedSchool || {}) };
  // The logo is the one saved on the school's record. It used to be read
  // from this browser only, so cards printed on any other computer (or after
  // the browser was cleared) came out with no logo.
  const logoSrc = schoolLogoOf(school) || null;
  const logoLocalOnly = logoOnlyInBrowser(school);

  /* Add or change the school logo here, where it is needed. It is saved to
     the school's profile, so every card, certificate and voucher uses it. */
  const logoRef = useRef(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const saveLogo = async (fileOrDataUrl) => {
    setSavingLogo(true);
    try {
      const logoUrl = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : await compressLogo(fileOrDataUrl);
      await api.put('/settings/school', { logoUrl });
      updateSchool({ ...(signedInSchool || {}), logoUrl });
      qc.invalidateQueries({ queryKey: ['school-settings'] });
      toast.success('School logo saved: it now prints on every card');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'The logo could not be saved.');
    } finally {
      setSavingLogo(false);
    }
  };

  /* One request is capped (each student row carries its photo), so the
     whole school may not fit. The API's total says how many there are, and
     the page says when some are not listed instead of dropping them
     silently. Staff lists are short; /staff on its own returned only 25. */
  const { data:list, isLoading } = useQuery({
    queryKey: ['id-cards', type, classId, sectionId],
    queryFn: () => (type==='student'
      ? api.get('/students',{params:{classId:classId||undefined,sectionId:sectionId||undefined,status:'active',limit:STUDENT_LIMIT}})
      : api.get('/staff',{params:{limit:STAFF_LIMIT}})
    ).then(r => ({ rows: r.data.data || [], total: r.data.total ?? (r.data.data || []).length })),
  });
  const raw = list?.rows;
  const notListed = Math.max(0, (list?.total || 0) - (raw?.length || 0));

  /* ── Auto-load saved photos from localStorage when data loads ── */
  useEffect(() => {
    if (!raw?.length) return;
    const prefix = type === 'student' ? 'photo_student_' : 'photo_staff_';
    const loaded = {};
    raw.forEach(p => {
      try {
        const saved = localStorage.getItem(`${prefix}${p.id}`);
        if (saved) loaded[p.id] = saved;
      } catch {}
    });
    if (Object.keys(loaded).length > 0) {
      setPhotoMap(prev => ({ ...loaded, ...prev })); // prev (manually uploaded) takes priority
    }
    setLocalIds(Object.keys(loaded).map(Number));
  }, [raw, type]);

  /* working search */
  const people = (raw||[]).filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q)
      || p.rollNo?.toLowerCase().includes(q)
      || p.empCode?.toLowerCase().includes(q)
      || p.fatherName?.toLowerCase().includes(q)
      || p.class?.name?.toLowerCase().includes(q)
      || p.designation?.toLowerCase().includes(q);
  });
  /* Everyone in this list without a photo: their printed card would show an
     empty photo box, so say so before printing, and let the office find them. */
  const hasPhotoOf = (p) => !!(photoMap[p.id] || p.photoUrl);
  const missingPhotos = (raw || []).filter((p) => !hasPhotoOf(p)).length;
  const shownPeople = onlyMissing ? people.filter((p) => !hasPhotoOf(p)) : people;

  const cls        = (classes||[]).find(c=>c.id===parseInt(classId));
  // Select All means the rows on screen: with "Show only these" on, it used
  // to select the hidden people with photos too.
  const allChecked = shownPeople.length>0 && shownPeople.every(p=>selected.includes(p.id));

  const toggleOne = id => setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const toggleAll = () => setSelected(allChecked?[]:shownPeople.map(p=>p.id));

  /* The camera button on a row saves the photo to the person's record, so
     it appears on certificates and every later print, not just this one.
     It used to live only in this page's memory and this browser.

     The card shows the new photo only once the record has it. It used to
     change first, so a save that failed still looked done until the next
     visit brought the old photo back. */
  const [savingIds, setSavingIds] = useState([]);
  // Refresh every list and document that shows these people's photos.
  const refreshPhotoLists = useCallback(() => {
    const lists = type === 'student' ? /student|card|certificate/i : /staff|card|certificate/i;
    qc.invalidateQueries({ predicate: (q) => lists.test(String(q.queryKey?.[0] || '')) });
  }, [type, qc]);
  const uploadPhoto = useCallback(async (id, file) => {
    if (!file) return;
    const problem = pickProblem(file);
    if (problem) { toast.error(problem); return; }
    setSavingIds(ids => [...ids, id]);
    try {
      const small = await compressPhoto(file);
      await api.put(`/${type === 'student' ? 'students' : 'staff'}/${id}`, { photoUrl: small });
      setPhotoMap(m => ({ ...m, [id]: small }));
      // An older copy kept only in this browser would cover the new photo on the next visit.
      try { localStorage.removeItem(`photo_${type}_${id}`); } catch {}
      setLocalIds(ids => ids.filter(x => x !== id));
      toast.success('Photo saved to the record');
      refreshPhotoLists();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'The photo could not be saved.');
    } finally {
      setSavingIds(ids => ids.filter(x => x !== id));
    }
  }, [type, refreshPhotoLists]);

  /* Photos saved by older versions live only in this browser. Offer to move
     them onto the records so every device and document can use them. */
  const localOnly = (raw || []).filter(p => !p.photoUrl && photoMap[p.id] && localIds.includes(p.id));
  const [rescuing, setRescuing] = useState(false);
  const rescueLocalPhotos = async () => {
    setRescuing(true);
    let saved = 0;
    for (const p of localOnly) {
      try {
        const small = await compressPhoto(photoMap[p.id]);
        await api.put(`/${type === 'student' ? 'students' : 'staff'}/${p.id}`, { photoUrl: small }, { silent: true });
        saved++;
      } catch { /* leave it local; the count below says how many moved */ }
    }
    setRescuing(false);
    refreshPhotoLists();
    toast.success(`${saved} of ${localOnly.length} photos saved to the records`);
  };

  const opts = {
    primary, secondary,
    // The full name as registered; the card designs print it in full.
    schoolName: school?.name || localStorage.getItem('registeredSchoolName') || 'School',
    address:    [school?.address, school?.city].filter(Boolean).join(', ') || '',
    phone:      school?.phone || '',
    email:      school?.email || '',
    validity:   validity.trim(),
    type, template, photoMap, logoSrc,
  };

  /* The live preview generates its QR too, so what's on screen matches what
     comes out of the printer. */
  const previewPerson = preview || (type === 'staff'
    ? { id: 0, name: 'Teacher Name', empCode: 'TCH-001', designation: 'Teacher', department: { name: 'Teaching' }, joiningDate: '2024-04-01' }
    : { id: 0, name: 'Student Name', rollNo: 'ST-001', fatherName: 'Father Name', class: { name: 'Class 5' }, section: { name: 'A' }, admissionDate: '2024-04-01' });
  const [previewQrMap, setPreviewQrMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    qrDataUrlsFor([previewPerson]).then(m => { if (!cancelled) setPreviewQrMap(m); });
    return () => { cancelled = true; };
  }, [previewPerson.rollNo, previewPerson.empCode, previewPerson.id]);

  const doPrint = async subset => {
    if (!subset.length) return toast.error('Select at least one person');

    // The window must be opened synchronously inside the click handler —
    // awaiting the QR generation first breaks the user-gesture chain and the
    // browser blocks the popup. Open now, fill in once the QR codes resolve.
    const win = window.open('', '_blank');
    if (!win) return toast.error('Popup blocked — allow popups for this site to print ID cards.');
    win.document.write('<!DOCTYPE html><html><head><title>Preparing ID cards…</title></head><body style="font-family:Arial,sans-serif;padding:40px;color:#475569;">Generating ID cards…</body></html>');

    const qrMap = await qrDataUrlsFor(subset, type);
    win.document.open();
    win.document.write(buildPrintHTML(subset, { ...opts, qrMap }));
    win.document.close();
    toast.success(`Opened ${subset.length} ID card(s) for printing!`);
  };

  /* Printing the selected cards: when some have no photo, the page asks
     first (in the page, not a browser pop-up) and prints on "Print anyway".
     A changed selection drops the question, so it never prints an old one. */
  const [confirmPrint, setConfirmPrint] = useState(null); // { people, noPhoto }
  useEffect(() => { setConfirmPrint(null); }, [selected, type]);
  const printSelected = () => {
    const chosen = people.filter(p=>selected.includes(p.id));
    const noPhoto = chosen.filter(p=>!hasPhotoOf(p)).length;
    if (noPhoto) setConfirmPrint({ people: chosen, noPhoto });
    else doPrint(chosen);
  };

  /* Designs come from cardTemplates.js — each ships a front and a back. */

  const isPortrait = templateById(template).orient === 'portrait';

  return (
    <div className="page-content fade-up">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h1 className="page-title">ID Card Printing</h1>
          <p className="page-subtitle">Student, teacher and staff ID cards · {TEMPLATES.length} designs, front and back · school logo · photo · barcode · QR code</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {selected.length>0 && (
            <button className="btn btn-outline btn-sm" onClick={()=>setSelected([])}>
              <X size={12}/> Clear ({selected.length})
            </button>
          )}
          <button className="btn btn-teal" disabled={selected.length===0}
            onClick={printSelected}>
            <Printer size={15}/> Print {selected.length||''} Cards
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'290px 1fr', gap:16 }}>

        {/* ═══ LEFT SETTINGS ═══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* School logo: printed on every card */}
          <div className="card">
            <div style={{ fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:10 }}>School Logo</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:52, height:52, borderRadius:10, border:`1.5px ${logoSrc ? 'solid' : 'dashed'} ${logoSrc ? '#E5E7EB' : '#F59E0B'}`, background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                {logoSrc
                  ? <img src={logoSrc} alt="School logo" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                  : <span style={{ fontSize:20 }} aria-hidden="true">🎓</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#111827', lineHeight:1.3 }}>{opts.schoolName}</div>
                <div style={{ fontSize:11, color: logoSrc && !logoLocalOnly ? '#059669' : '#B45309', marginTop:2 }}>
                  {!logoSrc ? 'No logo yet: cards print without one'
                    : logoLocalOnly ? 'Saved only on this computer'
                    : '✓ Prints on every card'}
                </div>
              </div>
            </div>
            {isAdmin ? (
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                <button type="button" className={`btn btn-sm ${logoSrc ? 'btn-outline' : 'btn-teal'}`} disabled={savingLogo}
                  onClick={() => logoRef.current?.click()}>
                  <Camera size={12}/> {savingLogo ? 'Saving…' : logoSrc ? 'Change logo' : 'Add logo'}
                </button>
                {logoLocalOnly && (
                  <button type="button" className="btn btn-sm btn-teal" disabled={savingLogo} onClick={() => saveLogo(logoSrc)}>
                    Save to school profile
                  </button>
                )}
                <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label="School logo file" style={{ display:'none' }}
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) saveLogo(f); }}/>
              </div>
            ) : !logoSrc && (
              <div style={{ fontSize:11, color:'#6B7280', marginTop:8 }}>Ask the school admin to add the logo (School Settings › School Profile).</div>
            )}
            {isAdmin && <div style={{ fontSize:10.5, color:'#9CA3AF', marginTop:6 }}>{PICK_RULES.replace('photo', 'logo').replace('about 40 KB', 'a small size')}</div>}
          </div>

          {/* Card type */}
          <div className="card">
            <div style={{ fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:10 }}>Card Type</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
              {[['student','👨‍🎓 Students',Users],['staff','👨‍🏫 Staff',Award]].map(([v,l,Icon])=>(
                <button key={v} className={`btn btn-sm ${type===v?'btn-teal':'btn-outline'}`}
                  style={{ justifyContent:'center', fontSize:12 }}
                  onClick={()=>{ setType(v); setSelected([]); setPreview(null); }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Designs: each drawn small, front side, with this school's colours */}
          <div className="card">
            <div style={{ fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:8 }}>Card Design <span style={{ fontWeight:500, color:'#9CA3AF' }}>({TEMPLATES.length})</span></div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:9 }} role="tablist" aria-label="Show designs">
              {GALLERY_FILTERS.map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={galleryFilter===k} onClick={()=>setGalleryFilter(k)}
                  style={{ fontSize:10.5, fontWeight:700, padding:'3px 8px', borderRadius:99, cursor:'pointer', border:`1px solid ${galleryFilter===k?primary:'#E5E7EB'}`, background:galleryFilter===k?primary:'#fff', color:galleryFilter===k?'#fff':'#4B5563' }}>{l}</button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }} aria-label="Card designs">
              {TEMPLATES.filter((t) => galleryFilter==='all' || t.orient===galleryFilter || (galleryFilter==='students' && t.for!=='staff') || (galleryFilter==='staff' && t.for!=='students')).map((t) => {
                const on = template===t.id;
                return (
                  <button key={t.id} type="button" onClick={()=>setTemplate(t.id)} aria-pressed={on} title={t.desc} data-template={t.id}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'7px 5px 6px', borderRadius:9, cursor:'pointer', border:`2px solid ${on?primary:'#E5E7EB'}`, background:on?primary+'10':'#FAFAFA', minWidth:0 }}>
                    <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <CardThumb portrait={t.orient==='portrait'} html={buildCard(previewPerson, { ...opts, template:t.id, qrMap: previewQrMap }, 'front')} />
                    </div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:on?primary:'#374151', lineHeight:1.2 }}>{on ? '✓ ' : ''}{t.label}</div>
                    <div style={{ fontSize:9.5, color:'#9CA3AF', textTransform:'capitalize' }}>{t.orient}{t.for==='students' ? ' · juniors' : t.for==='staff' ? ' · staff' : ''}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize:10.5, color:'#6B7280', marginTop:8, lineHeight:1.45 }}>{templateById(template).desc}. Every design prints for students and for teachers and staff.</div>
          </div>

          {/* Filters */}
          {type==='student' && (
            <div className="card">
              <div style={{ fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:10 }}>Filters</div>
              <div className="form-group">
                <label className="form-label">Class</label>
                <select className="form-select" aria-label="Filter by class" value={classId} onChange={e=>{setClassId(e.target.value);setSectionId('');setSelected([]);}}>
                  <option value="">All Classes</option>
                  {(classes||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {cls?.sections?.length>0 && (
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Section</label>
                  <select className="form-select" aria-label="Filter by section" value={sectionId} onChange={e=>{setSectionId(e.target.value);setSelected([]);}}>
                    <option value="">All Sections</option>
                    {cls.sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Colors */}
          <div className="card">
            <div style={{ fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:10 }}>
              <Palette size={13} style={{ display:'inline', marginRight:5, verticalAlign:'middle', color:primary }}/>
              Card Colors
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:'#6B7280', marginBottom:5, fontWeight:600 }}>PRESET SCHEMES</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
                {PRESETS.map(c=>(
                  <div key={c.p} onClick={()=>{ setPrimary(c.p); setSecondary(c.s); }} title={c.name}
                    style={{ height:24, borderRadius:5, background:`linear-gradient(90deg,${c.p} 60%,${c.s} 100%)`, cursor:'pointer', border:primary===c.p?'2.5px solid #111827':'1.5px solid transparent', transition:'all .1s' }}/>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div>
                <div style={{ fontSize:11, color:'#6B7280', marginBottom:4, fontWeight:600 }}>PRIMARY</div>
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  <input type="color" aria-label="Primary colour" value={primary} onChange={e=>setPrimary(e.target.value)}
                    style={{ width:30,height:28,borderRadius:5,border:'1px solid #E5E7EB',cursor:'pointer',padding:2 }}/>
                  <input className="form-input" aria-label="Primary colour hex code" value={primary} onChange={e=>setPrimary(e.target.value)}
                    style={{ flex:1,fontFamily:'monospace',fontSize:11,height:28 }}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:'#6B7280', marginBottom:4, fontWeight:600 }}>ACCENT</div>
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  <input type="color" aria-label="Accent colour" value={secondary} onChange={e=>setSecondary(e.target.value)}
                    style={{ width:30,height:28,borderRadius:5,border:'1px solid #E5E7EB',cursor:'pointer',padding:2 }}/>
                  <input className="form-input" aria-label="Accent colour hex code" value={secondary} onChange={e=>setSecondary(e.target.value)}
                    style={{ flex:1,fontFamily:'monospace',fontSize:11,height:28 }}/>
                </div>
              </div>
            </div>
          </div>

          {/* Printed on the card */}
          <div className="card">
            <div style={{ fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:8 }}>On the Card</div>
            <label className="form-label" htmlFor="card-validity">Valid until (optional)</label>
            <input id="card-validity" className="form-input" placeholder="e.g. March 2027" value={validity} maxLength={30}
              onChange={e=>setValidity(e.target.value)} style={{ height:32, fontSize:12.5 }}/>
            <div style={{ fontSize:10.5, color:'#9CA3AF', marginTop:5 }}>Printed on the designs that show it (Geometric, Ribbon). Leave empty to leave it off.</div>
          </div>

          {/* Live preview */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
              <Eye size={13} color={primary}/>
              <span style={{ fontSize:12.5, fontWeight:700, color:'#374151' }}>Live Preview</span>
              {preview && (
                <button aria-label="Retake photo" onClick={()=>setPreview(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                  <RotateCcw size={12}/>
                </button>
              )}
            </div>
            <div style={{ background:'#F1F5F9', borderRadius:8, padding:12, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              {/* Both faces, so the design can be judged as a whole card
                  rather than a front whose back is a surprise at print time. */}
              {/* Landscape faces are stacked: side by side they were wider
                  than this panel, which cut both ends of the school name. */}
              <div style={{ transform:`scale(${isPortrait?0.62:0.72})`, transformOrigin:'top center', marginBottom: isPortrait?'-30mm':'-33mm' }}>
                <div style={{ display:'flex', flexDirection: isPortrait ? 'row' : 'column', gap:10, alignItems: isPortrait ? 'flex-start' : 'center' }}>
                  {['front','back'].map(face => (
                    <div key={face} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, letterSpacing:1, color:'#94A3B8', marginBottom:4, textTransform:'uppercase' }}>{face}</div>
                      <div dangerouslySetInnerHTML={{ __html: buildCard(
                        previewPerson,
                        { ...opts, qrMap: previewQrMap },
                        face
                      )}}/>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E5E7EB', borderRadius:7, padding:'6px 10px', width:'100%' }}>
                <Camera size={12} color={primary}/>
                <span style={{ fontSize:11, color:'#374151' }}>
                  Click <strong style={{ color:primary }}>Add photo</strong> (or 📷) on a row to add or change that person's photo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PEOPLE LIST ═══ */}
        <div>
          {localOnly.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap',
                          background:'#F2A33A22', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:13 }}>
              <span>
                <strong>{localOnly.length} {localOnly.length === 1 ? 'photo is' : 'photos are'} saved only on this computer.</strong>{' '}
                Save them to the records so they appear on certificates and on other devices.
              </span>
              <button className="btn btn-primary btn-sm" onClick={rescueLocalPhotos} disabled={rescuing}>
                {rescuing ? 'Saving…' : 'Save to records'}
              </button>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            {/* Search */}
            <div style={{ position:'relative', flex:1 }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
              <input className="form-input" style={{ paddingLeft:30 }}
                placeholder={`Search ${type==='staff'?'staff':'student'} — name, roll no, father, class...`}
                value={search} onChange={e=>{ setSearch(e.target.value); setSelected([]); }}/>
              {search && <button aria-label="Clear search" onClick={()=>setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}><X size={13}/></button>}
            </div>
            <button className="btn btn-outline btn-sm" onClick={toggleAll}>
              {allChecked?<><X size={12}/> Deselect All</>:<><CheckSquare size={12}/> Select All</>}
            </button>
            {selected.length>0 && (
              <button className="btn btn-teal btn-sm" onClick={printSelected}>
                <Printer size={12}/> Print ({selected.length})
              </button>
            )}
          </div>

          {confirmPrint && (
            <div role="alert" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap', background:'#FFFBEB', border:'1px solid #F59E0B', borderRadius:8, padding:'10px 12px', marginBottom:10, fontSize:13, color:'#92400E' }}>
              <span>
                <strong>{confirmPrint.noPhoto} of the {confirmPrint.people.length} selected {confirmPrint.people.length===1?'card has':'cards have'} no photo</strong>{' '}
                and will print with an empty photo box.
              </span>
              <span style={{ display:'flex', gap:6 }}>
                <button type="button" className="btn btn-sm btn-outline" onClick={()=>setConfirmPrint(null)}>Cancel</button>
                <button type="button" className="btn btn-sm btn-teal" onClick={()=>{ const chosen = confirmPrint.people; setConfirmPrint(null); doPrint(chosen); }}>
                  <Printer size={12}/> Print anyway
                </button>
              </span>
            </div>
          )}

          {/* Stays while "Show only these" is on, even once everyone has a
              photo: otherwise the list was left empty with no way back. */}
          {(missingPhotos > 0 || (onlyMissing && !isLoading)) && (
            <div role="status" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap', background:missingPhotos>0?'#FFFBEB':'#F0FDF4', border:`1px solid ${missingPhotos>0?'#FDE68A':'#BBF7D0'}`, borderRadius:8, padding:'9px 12px', marginBottom:10, fontSize:13, color:missingPhotos>0?'#92400E':'#166534' }}>
              <span>
                {missingPhotos > 0
                  ? <><strong>{missingPhotos} {missingPhotos===1?(type==='staff'?'person has':'student has'):(type==='staff'?'people have':'students have')} no photo.</strong>{' '}
                      Their cards would print with an empty photo box. Click <strong>Add photo</strong> on the row.</>
                  : <strong>Everyone listed has a photo now.</strong>}
              </span>
              <button type="button" className="btn btn-sm btn-outline" aria-pressed={onlyMissing} onClick={()=>setOnlyMissing(v=>!v)}>
                {onlyMissing ? 'Show everyone' : 'Show only these'}
              </button>
            </div>
          )}
          {notListed > 0 && (
            <div role="status" style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'9px 12px', marginBottom:10, fontSize:13, color:'#1E40AF' }}>
              <strong>Showing {raw.length.toLocaleString('en-PK')} of {list.total.toLocaleString('en-PK')} {type==='staff'?'staff':'students'}</strong>
              {type==='student' && (!classId ? ' — choose a class to see everyone' : (cls?.sections?.length && !sectionId) ? ' — choose a section to see everyone' : '')}.
              {search && ' The search looks only at the ones listed here.'}
            </div>
          )}
          <div style={{ marginBottom:8, fontSize:12.5, color:'#6B7280' }}>
            {shownPeople.length} {type==='staff'?'staff':'students'}{search&&` matching "${search}"`}{onlyMissing&&' without a photo'}
            {selected.length>0&&<span className="badge badge-teal" style={{ marginLeft:8 }}>{selected.length} selected</span>}
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {isLoading ? (
              <div className="loading-center"><div className="spinner"/></div>
            ) : shownPeople.length===0 ? (
              <div className="empty-state" style={{ padding:48 }}>
                <div className="empty-state-icon"><CreditCard size={44} style={{ opacity:.2 }}/></div>
                <div className="empty-state-text">{search?`No results for "${search}"${notListed>0?` among the ${raw.length} listed`:''}`:`No ${type==='staff'?'staff':'students'} found`}</div>
                {search&&<button className="btn btn-outline btn-sm" style={{ marginTop:10 }} onClick={()=>setSearch('')}>Clear search</button>}
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width:40 }}>
                        <input type="checkbox" aria-label="Select all on this page" checked={allChecked} onChange={toggleAll} style={{ width:15,height:15,cursor:'pointer' }}/>
                      </th>
                      <th>#</th>
                      <th style={{ minWidth:70 }}>Photo</th>
                      <th>Name</th>
                      <th>{type==='student'?'Roll No':'Emp. Code'}</th>
                      <th>{type==='student'?'Class':'Designation'}</th>
                      {type==='student'&&<th>Father</th>}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownPeople.map((p,i)=>{
                      const checked  = selected.includes(p.id);
                      const hasPhoto = !!(photoMap[p.id]||p.photoUrl);
                      const saving   = savingIds.includes(p.id);
                      return (
                        <tr key={p.id}
                          style={{ background:checked?primary+'10':undefined }}
                          onClick={()=>setPreview(p)}>
                          <td onClick={e=>e.stopPropagation()}>
                            <input type="checkbox" aria-label={`Select ${p.name}`} checked={checked} onChange={()=>toggleOne(p.id)} style={{ width:15,height:15,cursor:'pointer' }}/>
                          </td>
                          <td style={{ color:'#9CA3AF',fontSize:12 }}>{i+1}</td>
                          {/* Photo cell */}
                          <td onClick={e=>e.stopPropagation()}>
                            <div style={{ position:'relative', width:46, height:54 }}>
                              {/* Photo or placeholder */}
                              <div style={{ width:46, height:54, borderRadius:6, overflow:'hidden', border:`2px solid ${hasPhoto?primary:primary+'30'}`, background:primary+'10', display:'flex', alignItems:'flex-end', justifyContent:'center', opacity: saving ? 0.45 : 1 }}>
                                {hasPhoto
                                  ? <img src={photoMap[p.id]||p.photoUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }}/>
                                  : <>
                                      <div style={{ position:'absolute',top:'18%',left:'50%',transform:'translateX(-50%)',width:'38%',aspectRatio:'1',borderRadius:'50%',background:primary+'40' }}/>
                                      <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translateX(-50%)',width:'65%',height:'55%',borderRadius:'50% 50% 0 0',background:primary+'30' }}/>
                                    </>
                                }
                              </div>
                              {/* Upload button */}
                              <button
                                aria-label={`Upload photo for ${p.name}`}
                                title={`Upload photo for ${p.name}`}
                                disabled={saving}
                                onClick={()=>fileRefs.current[p.id]?.click()}
                                style={{ position:'absolute',bottom:-3,right:-3,width:20,height:20,borderRadius:'50%',background:primary,border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:saving?'wait':'pointer',boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}>
                                <Camera size={10} color="#fff"/>
                              </button>
                              {/* Emptied after every pick: choosing the same file again
                                  (say after a failed save) fires no change otherwise. */}
                              <input ref={el=>fileRefs.current[p.id]=el} aria-label={`Photo file for ${p.name}`} type="file" accept="image/*" style={{ display:'none' }}
                                onChange={e=>{ const file = e.target.files?.[0]; e.target.value = ''; uploadPhoto(p.id, file); }}/>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight:700,fontSize:13,color:'#111827' }}>{p.name}</div>
                            <button type="button" disabled={saving} onClick={e=>{ e.stopPropagation(); fileRefs.current[p.id]?.click(); }}
                              style={{ background:'none', border:0, padding:0, cursor:saving?'wait':'pointer', fontSize:11, fontWeight:700, color: saving ? '#6B7280' : hasPhoto ? '#059669' : '#B45309' }}>
                              {saving ? 'Saving photo…' : hasPhoto ? '✓ Photo · Change' : '⚠ No photo · Add photo'}
                            </button>
                          </td>
                          <td><span style={{ fontFamily:'monospace',fontWeight:700,color:primary,fontSize:12 }}>{cardCode(p, type)}</span></td>
                          <td>
                            {type==='student'
                              ? <span className="badge badge-blue">{p.class?.name||'—'}{p.section?.name?' - '+p.section.name:''}</span>
                              : <span className="badge badge-gold">{p.designation||'—'}</span>
                            }
                          </td>
                          {type==='student'&&<td style={{ fontSize:12,color:'#6B7280',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.fatherName||'—'}</td>}
                          <td onClick={e=>e.stopPropagation()}>
                            <div style={{ display:'flex', gap:5 }}>
                              <button className="btn btn-sm btn-outline" title="Preview" onClick={()=>setPreview(p)}><Eye size={12}/></button>
                              <button className="btn btn-sm btn-teal" aria-label={`Print card for ${p.name}`} title={`Print card for ${p.name}`} onClick={()=>doPrint([p])}><Printer size={12}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
