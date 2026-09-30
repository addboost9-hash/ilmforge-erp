/**
 * IlmForge — Professional ID Card Printing
 * 5 premium templates matching reference designs
 * Portrait & Landscape orientations
 * School logo, QR code, barcode, photo, wave designs
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { TEMPLATES, templateById, DEFAULT_RULES } from './cardTemplates';
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

/* ─── QR code ────────────────────────────────────
   Rendered from a pre-generated data-URL map (see qrDataUrlsFor below).
   The previous version drew a fixed decorative pattern — the same image for
   every person, encoding nothing — so the "QR code" on a printed card was
   just art. */
const qrSVG = (val, size = 40, qrMap = null) => {
  const src = qrMap?.[val];
  if (src) {
    return `<img src="${src}" width="${size}" height="${size}" alt="QR ${val}" style="display:block;background:#fff;border-radius:2px;"/>`;
  }
  // No QR available (generation failed) — leave the space blank rather than
  // printing a fake code that scanners will reject.
  return `<div style="width:${size}px;height:${size}px;"></div>`;
};

/* ─── Code 39 barcode ─────────────────────────────
   FIX: the old generator set each bar's width from its *index*
   (i%3===0?3:i%3===1?2:1), so the pattern never depended on the value —
   "ST-001" and "ST-999" rendered byte-identical barcodes that encoded
   nothing and no scanner could read. Cards are meant to work with this same
   app's barcode attendance kiosk (POST /attendance/barcode-scan looks a
   student up by rollNo), so the printed code has to be genuinely scannable.

   Code 39 is used because it needs no checksum, covers A-Z/0-9/'-' (roll
   numbers like ST-001 and NURA-26-001), and every handheld scanner reads it.
   Each character is 9 elements — 5 bars, 4 spaces, alternating, where 1 = wide. */
const CODE39 = {
  '0':'000110100','1':'100100001','2':'001100001','3':'101100000','4':'000110001',
  '5':'100110000','6':'001110000','7':'000100101','8':'100100100','9':'001100100',
  'A':'100001001','B':'001001001','C':'101001000','D':'000011001','E':'100011000',
  'F':'001011000','G':'000001101','H':'100001100','I':'001001100','J':'000011100',
  'K':'100000011','L':'001000011','M':'101000010','N':'000010011','O':'100010010',
  'P':'001010010','Q':'000000111','R':'100000110','S':'001000110','T':'000010110',
  'U':'110000001','V':'011000001','W':'111000000','X':'010010001','Y':'110010000',
  'Z':'011010000','-':'010000101','.':'110000100',' ':'011000100','$':'010101000',
  '/':'010100010','+':'010001010','%':'000101010','*':'010010100',
};

const barcodeSVG = (val, w = 200, h = 30) => {
  const NARROW = 2, WIDE = 5, GAP = 2;   // element widths in viewBox units
  // Code 39 is uppercase-only; anything unencodable is dropped so the symbol
  // stays valid rather than silently producing an unscannable code.
  const text = String(val || '').toUpperCase();
  const chars = ('*' + text.split('').filter(c => CODE39[c]).join('') + '*').split('');

  let x = 0;
  let bars = '';
  for (const ch of chars) {
    const pattern = CODE39[ch];
    for (let i = 0; i < 9; i++) {
      const width = pattern[i] === '1' ? WIDE : NARROW;
      if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${width}" height="${h}" fill="#000"/>`;
      x += width;
    }
    x += GAP;  // inter-character gap
  }

  const vbWidth = Math.max(x, 1);
  // Wrapped in a single block: these are often dropped into flex rows, where
  // two sibling nodes would lay out side by side and put the caption next to
  // the bars instead of beneath them.
  return `<div style="display:block;text-align:center;line-height:0;">
    <svg width="${w}" height="${h}" viewBox="0 0 ${vbWidth} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${vbWidth}" height="${h}" fill="#fff"/>
      <g>${bars}</g>
    </svg>
    <div style="font-family:monospace;font-size:6pt;color:#333;letter-spacing:1.5px;line-height:1.4;">${text}</div>
  </div>`;
};

/* ─── Person silhouette SVG (used as photo placeholder) ── */
const personSVG = (color='#0F766E') => `
<svg width="100%" height="100%" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="120" fill="${color}18"/>
  <circle cx="50" cy="35" r="22" fill="${color}50"/>
  <ellipse cx="50" cy="95" rx="35" ry="30" fill="${color}40"/>
</svg>`;

/* ════════════════════════════════════════════════════
   5 PREMIUM ID CARD TEMPLATES
════════════════════════════════════════════════════ */
/* ─── Card assembly ──────────────────────────────
   Turns a person into the context every template design consumes, then asks
   the chosen template for the requested face. Designs live in
   cardTemplates.js so adding one does not mean touching this page. */
const buildCard = (p, opts, side = 'front') => {
  const { primary, secondary, schoolName, address, phone, email, type, template,
          photoMap, logoSrc, qrMap, validity, rules } = opts;
  const tpl = templateById(template);
  const id  = p.rollNo || p.empCode || `ID-${p.id}`;
  const classInfo = p.class?.name ? `${p.class.name}${p.section?.name ? ' - ' + p.section.name : ''}` : '—';
  const photo = photoMap?.[p.id] || p.photoUrl || null;
  const dob   = p.dob ? new Date(p.dob).toLocaleDateString('en-PK') : '—';
  const cnic  = p.bFormNo || p.cnic || '';
  const isStaff = type === 'staff';

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" style="width:100%;height:100%;object-fit:contain;border-radius:3px;"/>`
    : `<span style="font-size:13px;">🎓</span>`;

  /* Photo, or a neutral silhouette when none has been uploaded. */
  const photoBox = (w, h, round = false) => {
    const r = round ? '50%' : '4px';
    return photo
      ? `<img src="${photo}" style="width:${w};height:${h};object-fit:cover;border-radius:${r};display:block;"/>`
      : `<div style="width:${w};height:${h};border-radius:${r};overflow:hidden;background:${primary}18;display:flex;align-items:flex-end;justify-content:center;">
           <div style="width:52%;aspect-ratio:1;border-radius:50%;background:${primary}4d;margin-bottom:6%;flex-shrink:0;"></div>
         </div>`;
  };

  /* Field list differs for staff and students — a teacher has no father's
     name or class, and printing blank rows looks like broken data. */
  const fields = isStaff
    ? [
        ['Employee ID', id],
        ['Designation', p.designation],
        ['Department',  p.department?.name],
        ['Date of Birth', dob],
        ...(cnic ? [['CNIC', cnic]] : []),
      ]
    : [
        ['Student ID', id],
        ['Father Name', p.fatherName],
        ['Class', classInfo],
        ['Date of Birth', dob],
        ...(cnic ? [['B-Form', cnic]] : []),
      ];

  const ctx = {
    p, id_: id, name: p.name,
    subtitle: isStaff ? (p.designation || 'Staff') : classInfo,
    typeLabel: isStaff ? 'STAFF' : 'STUDENT',
    // Drop rows the record has no value for, so a card never prints a
    // column of em-dashes. Templates that slice(0, n) then get n real rows.
    fields: fields.filter(([, v]) => v != null && !['', '-', '—'].includes(String(v).trim())),
    photoBox, logoHtml,
    primary, secondary,
    dark: '#1B2430',
    schoolName, address, phone, email,
    validity, rules: rules && rules.length ? rules : DEFAULT_RULES,
    qr: (size) => qrSVG(id, size, qrMap),
    barcode: (w, h) => barcodeSVG(id, w, h),
  };

  return side === 'back' ? tpl.back(ctx) : tpl.front(ctx);
};

/* ─── Real QR codes ───────────────────────────────
   Generates a { idValue -> dataURL } map with the `qrcode` package (already a
   dependency). Encodes the roll/employee number, which is exactly what this
   app's own barcode attendance kiosk looks a person up by, so a scanned card
   resolves to the right person instead of decoding to nothing. */
const idValueFor = (p) => p.rollNo || p.empCode || `ID-${p.id}`;

const qrDataUrlsFor = async (people) => {
  const map = {};
  try {
    const QR = (await import('qrcode')).default;
    await Promise.all(people.map(async (p) => {
      const val = idValueFor(p);
      try {
        map[val] = await QR.toDataURL(val, { margin: 0, width: 160, errorCorrectionLevel: 'M' });
      } catch { /* skip this one; the card renders without a QR */ }
    }));
  } catch {
    // qrcode unavailable — cards still print, just without QR codes.
  }
  return map;
};

/* ─── Print HTML ─────────────────────────────────── */
const buildPrintHTML = (people, opts) => {
  const isPortrait = templateById(opts.template).orient === 'portrait';
  // Front and back are emitted as a pair per person and kept together, so a
  // duplex print lines the two faces of one card up on the same sheet.
  const cards = people.map((p) => `
    <div class="pair">
      <div class="face">${buildCard(p, opts, 'front')}<div class="face-tag">FRONT</div></div>
      <div class="face">${buildCard(p, opts, 'back')}<div class="face-tag">BACK</div></div>
    </div>`).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>ID Cards — ${opts.schoolName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#f0f0f0;font-family:Arial,sans-serif;padding:10mm;}
  .wrap{display:flex;flex-wrap:wrap;gap:6mm;}
  /* One person = one pair. keeping the pair unbreakable means the two faces
     of a card never land on different sheets. */
  .pair{display:flex;gap:3mm;break-inside:avoid;page-break-inside:avoid;}
  .face{position:relative;}
  .face-tag{position:absolute;top:-4mm;left:0;font-size:7px;letter-spacing:1px;color:#94a3b8;font-family:Arial,sans-serif;}
  @media print{
    body{background:#fff;padding:4mm;}
    .no-print{display:none!important;}
    .wrap{gap:4mm;}
    .pair{gap:2mm;}
    .face-tag{display:none;}   /* guides for the screen only */
    @page{margin:6mm;}
  }
</style></head><body>
  <div class="no-print" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div>
      <h2 style="font-size:15px;font-weight:700;color:#0F4C45;margin:0 0 2px;">${opts.schoolName} — ID Cards</h2>
      <p style="font-size:12px;color:#9CA3AF;margin:0;">${people.length} card(s) · ${new Date().toLocaleDateString('en-PK')}</p>
    </div>
    <button onclick="window.print()" style="background:#0F766E;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">🖨 Print ID Cards</button>
  </div>
  <div class="wrap">${cards}</div>
</body></html>`;
};

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
  const [primary,  setPrimary]  = useState('#0F766E');
  const [secondary,setSecondary]= useState('#D97706');
  const [template, setTemplate] = useState('portrait');
  const [selected, setSelected] = useState([]);
  const [photoMap, setPhotoMap] = useState({});
  const [preview,  setPreview]  = useState(null);

  const fileRefs = useRef({});

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data:school  } = useQuery({ queryKey:['school-settings'], queryFn:()=>api.get('/settings/school').then(r=>r.data.data) });
  const logoSrc = typeof window!=='undefined' ? localStorage.getItem('schoolLogoPreview') : null;

  const { data:raw, isLoading } = useQuery({
    queryKey: [type, classId, sectionId],
    queryFn: () => type==='student'
      ? api.get('/students',{params:{classId:classId||undefined,sectionId:sectionId||undefined,status:'active',limit:200}}).then(r=>r.data.data||[])
      : api.get('/staff').then(r=>r.data.data||[]),
  });

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

  const cls        = (classes||[]).find(c=>c.id===parseInt(classId));
  const allChecked = people.length>0 && selected.length===people.length;

  const toggleOne = id => setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const toggleAll = () => setSelected(allChecked?[]:people.map(p=>p.id));

  const uploadPhoto = useCallback((id, file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => setPhotoMap(m=>({...m,[id]:ev.target.result}));
    r.readAsDataURL(file);
  }, []);

  const opts = {
    primary, secondary,
    schoolName: school?.name || 'IlmForge School',
    address:    school?.city  || school?.address || 'Islamabad, Pakistan',
    phone:      school?.phone || '',
    type, template, photoMap, logoSrc,
  };

  /* The live preview generates its QR too, so what's on screen matches what
     comes out of the printer. */
  const previewPerson = preview || {
    id: 0, name: 'Student Name', rollNo: 'ST-001', fatherName: 'Father Name',
    class: { name: 'Class 5' }, section: { name: 'A' },
    designation: 'Teacher', department: { name: 'Teaching' },
  };
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

    const qrMap = await qrDataUrlsFor(subset);
    win.document.open();
    win.document.write(buildPrintHTML(subset, { ...opts, qrMap }));
    win.document.close();
    toast.success(`Opened ${subset.length} ID card(s) for printing!`);
  };

  /* Designs come from cardTemplates.js — each ships a front and a back. */

  const isPortrait = templateById(template).orient === 'portrait';

  return (
    <div className="page-content fade-up">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h1 className="page-title">ID Card Printing</h1>
          <p className="page-subtitle">Professional ID cards with 5 premium templates · school logo · barcode · QR code</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {selected.length>0 && (
            <button className="btn btn-outline btn-sm" onClick={()=>setSelected([])}>
              <X size={12}/> Clear ({selected.length})
            </button>
          )}
          <button className="btn btn-teal" disabled={selected.length===0}
            onClick={()=>doPrint(people.filter(p=>selected.includes(p.id)))}>
            <Printer size={15}/> Print {selected.length||''} Cards
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'290px 1fr', gap:16 }}>

        {/* ═══ LEFT SETTINGS ═══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

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

          {/* Template selector */}
          <div className="card">
            <div style={{ fontSize:12.5, fontWeight:700, color:'#374151', marginBottom:10 }}>Template Style</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {TEMPLATES.map(t=>(
                <div key={t.id} onClick={()=>setTemplate(t.id)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 11px', borderRadius:8, cursor:'pointer', border:`2px solid ${template===t.id?primary:'#E5E7EB'}`, background:template===t.id?primary+'10':'#FAFAFA', transition:'all .12s' }}>
                  <div style={{ width:28, height:t.orient.includes('↕')?36:22, borderRadius:3, background:template===t.id?primary:'#CBD5E1', flexShrink:0, border:`1px solid ${template===t.id?primary+'80':'transparent'}` }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:template===t.id?primary:'#374151' }}>{t.label}</div>
                    <div style={{ fontSize:10.5, color:'#9CA3AF' }}>{t.orient} · {t.desc}</div>
                  </div>
                  {template===t.id && <div style={{ width:16, height:16, borderRadius:'50%', background:primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ color:'#fff', fontSize:9, fontWeight:900 }}>✓</span>
                  </div>}
                </div>
              ))}
            </div>
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

          {/* Live preview */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
              <Eye size={13} color={primary}/>
              <span style={{ fontSize:12.5, fontWeight:700, color:'#374151' }}>Live Preview</span>
              {preview && (
                <button onClick={()=>setPreview(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                  <RotateCcw size={12}/>
                </button>
              )}
            </div>
            <div style={{ background:'#F1F5F9', borderRadius:8, padding:12, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              {/* Both faces, so the design can be judged as a whole card
                  rather than a front whose back is a surprise at print time. */}
              <div style={{ transform:`scale(${isPortrait?0.62:0.74})`, transformOrigin:'top center', marginBottom: isPortrait?'-30mm':'-13mm' }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
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
                  Tap <strong style={{ color:primary }}>📷</strong> icon on each row to add photo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PEOPLE LIST ═══ */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            {/* Search */}
            <div style={{ position:'relative', flex:1 }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
              <input className="form-input" style={{ paddingLeft:30 }}
                placeholder={`Search ${type==='staff'?'staff':'student'} — name, roll no, father, class...`}
                value={search} onChange={e=>{ setSearch(e.target.value); setSelected([]); }}/>
              {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}><X size={13}/></button>}
            </div>
            <button className="btn btn-outline btn-sm" onClick={toggleAll}>
              {allChecked?<><X size={12}/> Deselect All</>:<><CheckSquare size={12}/> Select All</>}
            </button>
            {selected.length>0 && (
              <button className="btn btn-teal btn-sm" onClick={()=>doPrint(people.filter(p=>selected.includes(p.id)))}>
                <Printer size={12}/> Print ({selected.length})
              </button>
            )}
          </div>

          <div style={{ marginBottom:8, fontSize:12.5, color:'#6B7280' }}>
            {people.length} {type==='staff'?'staff':'students'}{search&&` matching "${search}"`}
            {selected.length>0&&<span className="badge badge-teal" style={{ marginLeft:8 }}>{selected.length} selected</span>}
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {isLoading ? (
              <div className="loading-center"><div className="spinner"/></div>
            ) : people.length===0 ? (
              <div className="empty-state" style={{ padding:48 }}>
                <div className="empty-state-icon"><CreditCard size={44} style={{ opacity:.2 }}/></div>
                <div className="empty-state-text">{search?`No results for "${search}"`:`No ${type==='staff'?'staff':'students'} found`}</div>
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
                    {people.map((p,i)=>{
                      const checked  = selected.includes(p.id);
                      const hasPhoto = !!(photoMap[p.id]||p.photoUrl);
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
                              <div style={{ width:46, height:54, borderRadius:6, overflow:'hidden', border:`2px solid ${hasPhoto?primary:primary+'30'}`, background:primary+'10', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
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
                                onClick={()=>fileRefs.current[p.id]?.click()}
                                style={{ position:'absolute',bottom:-3,right:-3,width:20,height:20,borderRadius:'50%',background:primary,border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}>
                                <Camera size={10} color="#fff"/>
                              </button>
                              <input ref={el=>fileRefs.current[p.id]=el} aria-label={`Photo file for ${p.name}`} type="file" accept="image/*" style={{ display:'none' }}
                                onChange={e=>uploadPhoto(p.id,e.target.files?.[0])}/>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight:700,fontSize:13,color:'#111827' }}>{p.name}</div>
                            {hasPhoto&&<div style={{ fontSize:10,color:'#059669',fontWeight:700 }}>✓ Photo</div>}
                          </td>
                          <td><span style={{ fontFamily:'monospace',fontWeight:700,color:primary,fontSize:12 }}>{p.rollNo||p.empCode||`ID-${p.id}`}</span></td>
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
