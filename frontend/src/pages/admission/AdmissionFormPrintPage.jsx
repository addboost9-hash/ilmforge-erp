/**
 * IlmForge — Professional Admission Form Print v2.0
 * Next-level: Blank + Filled forms, complete fields,
 * photo placeholder, all sections, school branding
 */
import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../../api/client';
import { Link } from 'react-router-dom';
import { printHTML } from '../../utils/print';
import { useDebounce } from '../../hooks/useDebounce';
import { Printer, Search, FileText, ChevronRight, Pencil } from 'lucide-react';
import StudentPhotoButton from '../../components/StudentPhotoButton';
import EditStudentModal from '../../components/EditStudentModal';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

/* Record values go into the printed page as HTML, so they are escaped: a
   name with "<" or "&" in it would break the form. */
const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Empty prints as a blank line to write on; 0 (test marks) still prints.
const show = v => (v === null || v === undefined || v === '' ? '' : esc(v));

/* Age today as "9 years 4 months". The old sum did not take a year off
   before the birthday month: 10 years 10 months printed as 11 years 10 months. */
const ageText = dob => {
  const d = dob ? new Date(dob) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  return months < 0 ? '' : `${Math.floor(months / 12)} years ${months % 12} months`;
};

/* ── Print function ─────────────────────────────────────── */
export function printAdmissionForm(student, school) {
  const logo    = school?.logoUrl || localStorage.getItem('schoolLogoPreview') || '';
  const sName   = school?.name   || localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const sAddr   = school?.address || '';
  const sPhone  = school?.phone   || '';
  const sEmail  = school?.email   || '';
  const year    = new Date().getFullYear();

  /* Sections 1-4 follow the admission form's own fields, each printed from
     its column on the student record. They used to read fields that do not
     exist (placeOfBirth, parent.cnic, medicalConditions), leave real ones
     blank (father's CNIC and occupation, mother's phone, previous school) and
     print "Pakistani", "Islam" and "Father" even on a blank form. */
  const s = student || {};
  // The admission form takes first and last name (and their Urdu) separately.
  const fullName = [s.name, s.lastName].filter(Boolean).join(' ');
  const urduName = [s.firstNameUrdu, s.lastNameUrdu].filter(Boolean).join(' ');

  const field = (label, val, w = '48%') => `
    <div style="width:${w}; margin-bottom:8px;">
      <div style="font-size:8px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${label}</div>
      <div dir="auto" style="border-bottom:1px solid #374151;min-height:18px;padding:2px 4px;font-size:11px;color:#111;">${show(val)}</div>
    </div>`;

  const fieldFull = (label, val) => field(label, val, '100%');

  const section = (title, color = '#1B2F6E') => `
    <div style="background:${color};color:white;padding:6px 10px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px;border-radius:3px;">${title}</div>`;

  const html = `<!DOCTYPE html>
<html><head>
<title>Admission Form — ${show(fullName) || 'Blank'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px 24px; }
  .page { max-width: 780px; margin: 0 auto; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1B2F6E; padding-bottom: 12px; margin-bottom: 4px; }
  .logo { width: 70px; height: 70px; border: 1px solid #ddd; border-radius: 6px; object-fit: contain; }
  .logo-ph { width: 70px; height: 70px; border: 1px solid #ddd; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 28px; background: #f8f9fa; }
  .school-info { flex: 1; }
  .school-name { font-size: 22px; font-weight: 900; color: #1B2F6E; letter-spacing: -0.5px; }
  .school-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
  .form-title { text-align: right; }
  .form-title h2 { font-size: 16px; font-weight: 800; color: #1B2F6E; }
  .form-title p { font-size: 10px; color: #64748b; margin-top: 2px; }
  .form-no { font-size: 10px; color: #374151; margin-top: 4px; }
  .row { display: flex; gap: 12px; flex-wrap: wrap; }
  .photo-box { width: 100px; height: 120px; border: 2px dashed #94a3b8; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; border-radius: 4px; flex-shrink: 0; overflow: hidden; }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .checkbox-row { display: flex; gap: 16px; align-items: center; margin: 4px 0; font-size: 10px; }
  .checkbox-item { display: flex; align-items: center; gap: 4px; }
  .cb { width: 12px; height: 12px; border: 1px solid #374151; display: inline-block; flex-shrink: 0; }
  table.grid { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 8px; }
  table.grid th { background: #1B2F6E; color: white; padding: 5px 6px; text-align: left; }
  table.grid td { border: 1px solid #e2e8f0; padding: 5px 6px; height: 20px; }
  table.grid tr:nth-child(even) td { background: #f8f9fa; }
  .sig-row { display: flex; gap: 24px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
  .sig-box { flex: 1; text-align: center; }
  .sig-line { border-top: 1px solid #374151; padding-top: 4px; font-size: 9px; font-weight: 700; color: #374151; margin-top: 28px; }
  .declaration { background: #fef9c3; border: 1px solid #fde68a; border-radius: 4px; padding: 8px 12px; font-size: 9px; color: #374151; margin-top: 10px; line-height: 1.6; }
  .office-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; margin-top: 8px; }
  .office-title { font-size: 9px; font-weight: 800; color: #1B2F6E; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .no-print { display: none; }
  @media print {
    body { padding: 10px 14px; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 10mm; }
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>
<div class="page">

  <!-- PRINT BUTTON -->
  <div class="no-print" style="display:flex;gap:10px;margin-bottom:14px;">
    <button onclick="window.print()" style="background:#1B2F6E;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">🖨️ Print Form</button>
    <button onclick="window.close()" style="background:#f1f5f9;border:1px solid #e2e8f0;padding:10px 18px;border-radius:8px;font-size:13px;cursor:pointer;">✕ Close</button>
  </div>

  <!-- HEADER -->
  <div class="header">
    <div>
      ${logo ? `<img src="${logo}" alt="Logo" class="logo"/>` : `<div class="logo-ph">🏫</div>`}
    </div>
    <div class="school-info">
      <div class="school-name">${sName}</div>
      <div class="school-sub">${sAddr}${sPhone ? ' | Ph: ' + sPhone : ''}${sEmail ? ' | ' + sEmail : ''}</div>
    </div>
    <div class="form-title">
      <h2>ADMISSION FORM</h2>
      <p>Academic Year: ${show(s.session?.name) || `${year}–${year + 1}`}</p>
      <div class="form-no">Form No.: ${s.rollNo ? 'ADM-' + show(s.rollNo) : '___________'}</div>
      <div class="form-no">Date: ${s.createdAt ? fmtDate(s.createdAt) : '___________'}</div>
    </div>
  </div>

  <!-- STUDENT PHOTO + BASIC INFO -->
  <div class="row" style="margin-top:12px; align-items:flex-start;">
    <div>
      <div class="photo-box">
        ${s.photoUrl ? `<img src="${s.photoUrl}" alt="Photo"/>` : '<div style="font-size:28px;margin-bottom:4px">📷</div><div>Student Photo</div><div style="font-size:8px;color:#94a3b8;margin-top:2px">1.5" × 1.5"</div>'}
      </div>
    </div>
    <div style="flex:1;">
      <div class="row">
        ${field('GR Number', s.id ? `GR-${String(s.id).padStart(5,'0')}` : '')}
        ${field('Roll Number', s.rollNo)}
        ${field('Admission Date', fmtDate(s.admissionDate || s.createdAt))}
        ${field('Campus', s.campus?.name)}
        ${field('Class', s.class?.name)}
        ${field('Section', s.section?.name)}
      </div>
    </div>
  </div>

  <!-- 1. STUDENT INFORMATION -->
  ${section('1. Student Information')}
  <div class="row">
    ${fieldFull('Full Name (English)', fullName)}
    ${fieldFull('Full Name (اردو)', urduName)}
    ${field('Date of Birth', fmtDate(s.dob))}
    ${field('Age (Years / Months)', ageText(s.dob))}
    ${field('Gender', s.gender)}
    ${field('Religion', s.religion)}
    ${field('Nationality', s.nationality)}
    ${field('Caste', s.caste)}
    ${field('B-Form No.', s.bFormNo)}
    ${field('Family No.', s.familyNo)}
  </div>
  <div class="row">
    ${fieldFull('Permanent Address', s.address)}
    ${field('City', s.city)}
    ${field('Province', s.province)}
    ${fieldFull('Postal Address', s.postalAddress)}
  </div>

  <!-- 2. GUARDIAN INFORMATION -->
  ${section('2. Guardian Information', '#15803D')}
  <div class="row">
    ${field("Father's Full Name", s.fatherName)}
    ${field("Father's Name (اردو)", s.fatherNameUrdu)}
    ${field("Father's CNIC", s.fatherCnic)}
    ${field("Father's Occupation", s.fatherOccupation)}
    ${field("Father's Qualification", s.fatherQualification)}
    ${field('Parent Mobile No. (WhatsApp)', s.emergencyPhone)}
    ${field("Mother's Full Name", s.motherName)}
    ${field("Mother's CNIC", s.motherCnic)}
    ${field("Mother's Occupation", s.motherOccupation)}
    ${field("Mother's Qualification", s.motherQualification)}
    ${field("Mother's Mobile No.", s.motherPhone)}
    ${field('Email Address', s.email)}
  </div>

  <!-- 3. PREVIOUS SCHOOL -->
  ${section('3. Previous School / Academic Record', '#7C3AED')}
  <div class="row">
    ${field('School Name', s.prevSchoolName)}
    ${field('Admission No.', s.prevAdmissionNo)}
    ${fieldFull('School Address', s.prevSchoolAddress)}
    ${field('Contact No.', s.prevSchoolPhone)}
    ${field('Focal Person', s.prevSchoolFocalPerson)}
    ${field('Previous Grade', s.prevGrade)}
    ${field('Test of Grade', s.prevTestGrade)}
  </div>

  <!-- 4. MEDICAL INFORMATION -->
  ${section('4. Medical Information', '#DC2626')}
  <div class="row">
    ${field('Blood Group', s.bloodGroup)}
    ${field('Food / Dietary Needs', s.foodDietaryReq)}
    ${fieldFull('Allergies / Major Illness', s.allergies)}
    ${fieldFull('Condition of the Child', s.childCondition)}
  </div>

  <!-- 5. TRANSPORT / HOSTEL -->
  ${section('5. Transport & Hostel', '#D97706')}
  <div class="row" style="align-items:center;">
    <div style="font-size:9px;font-weight:600;color:#374151;margin-right:8px;">Transport Required:</div>
    <div class="checkbox-item"><div class="cb"></div> Yes</div>
    <div class="checkbox-item"><div class="cb"></div> No</div>
    <div style="width:32px;"></div>
    <div style="font-size:9px;font-weight:600;color:#374151;margin-right:8px;">Hostel Required:</div>
    <div class="checkbox-item"><div class="cb"></div> Yes</div>
    <div class="checkbox-item"><div class="cb"></div> No</div>
  </div>
  <div class="row" style="margin-top:6px;">
    ${field('Pick-up / Drop-off Area', '')}
    ${field('Transport Route', '')}
  </div>

  <!-- 6. SIBLING INFORMATION -->
  ${section('6. Sibling Information (If studying in same school)', '#0891B2')}
  <table class="grid">
    <thead>
      <tr><th>Name</th><th>Class</th><th>Roll Number</th><th>Relation</th></tr>
    </thead>
    <tbody>
      <tr><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <!-- 7. CO-CURRICULAR -->
  ${section('7. Co-Curricular Activities Interest', '#64748B')}
  <div class="row" style="gap:8px; flex-wrap:wrap;">
    ${['Cricket','Football','Basketball','Badminton','Swimming','Debate','Drama','Quran Recitation','Art & Craft','Computer/IT','Scouting','Music/Nasheed'].map(a => `<div class="checkbox-item"><div class="cb"></div><span style="font-size:9px;">${a}</span></div>`).join('')}
  </div>

  <!-- DECLARATION -->
  <div class="declaration">
    <strong>Declaration:</strong> I/We hereby declare that all the information provided above is true and correct to the best of my/our knowledge.
    I/We have read and agreed to the school rules, regulations, and fee policy. I/We understand that any false information
    may result in cancellation of admission.
  </div>

  <!-- OFFICE USE ONLY -->
  <div class="office-box">
    <div class="office-title">For Office Use Only</div>
    <div class="row">
      ${field('Admission Test Marks', s.admissionTestMarks)}
      ${field('Admission Approved By', '')}
      ${field('Approval Date', '')}
      ${field('Fee Structure', '')}
      ${field('First Invoice Generated', '')}
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="sig-row">
    <div class="sig-box"><div class="sig-line">Parent / Guardian Signature</div></div>
    <div class="sig-box"><div class="sig-line">Class Teacher</div></div>
    <div class="sig-box"><div class="sig-line">Incharge / Coordinator</div></div>
    <div class="sig-box"><div class="sig-line">Principal</div></div>
  </div>

  <div style="text-align:center; margin-top:12px; font-size:8.5px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:8px;">
    Powered by IlmForge School Management System &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-PK')} &nbsp;|&nbsp; ${sName}
  </div>
</div>
</body>
</html>`;

  printHTML(html, { title: student ? `Admission Form - ${student.name}` : 'Admission Form' });
}

/* ── Main Page ──────────────────────────────────────────── */
export default function AdmissionFormPrintPage() {
  const [search,    setSearch]    = useState('');
  const [studentId, setStudentId] = useState(null);
  const [student,   setStudent]   = useState(null);
  const [mode,      setMode]      = useState('blank');
  const [editing,   setEditing]   = useState(false);

  /* The search list carries only a few fields; the filled form needs the
     whole record (address, B-Form, mother, previous school...), which used to
     print blank. Load it once a student is chosen. */
  const { data: fullStudent, isFetching: loadingFull } = useQuery({
    queryKey: ['student', String(studentId)],
    queryFn: () => api.get(`/students/${studentId}`).then(r => r.data.data),
    enabled: !!studentId,
  });
  // The full record has no campus; the search row does, so keep both.
  const printable = useMemo(() => (fullStudent ? { ...student, ...fullStudent } : student), [student, fullStudent]);

  /* Searched once typing pauses (300 ms), not on every key: each letter used
     to send its own request to the server. */
  const searchTerm = useDebounce(search.trim(), 300);
  const { data: students = [] } = useQuery({
    queryKey: ['adm-form-search', searchTerm],
    queryFn:  () => api.get('/students', { params: { search: searchTerm, limit: 8 } }).then(r => r.data.data || []).catch(() => []),
    enabled:  !studentId && searchTerm.length >= 2,
    placeholderData: keepPreviousData, // the list stays put while the next search loads
  });

  const { data: school } = useQuery({
    queryKey: ['school-settings'],
    queryFn:  () => api.get('/settings/school').then(r => r.data.data).catch(() => null),
  });

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <FileText size={20} color="#1B2F6E" /> Admission Form Print
          </h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:2 }}>
            Professional A4 admission form — blank or pre-filled with student data
          </p>
        </div>
        {/* The blank form comes back filled in by hand: read it straight
            into a new admission instead of typing it all again. */}
        <Link to="/admissions/wizard" state={{ readForm: true }} className="btn btn-teal btn-sm">
          📄 Filled form came back? Read it in
        </Link>
      </div>

      {/* Mode + Search */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body">
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            {/* Mode toggle */}
            <div style={{ display:'flex', gap:6 }}>
              {[{ id:'blank', label:'📄 Blank Form' }, { id:'filled', label:'✅ Filled Form' }].map(m => (
                <button key={m.id} onClick={() => { setMode(m.id); setStudentId(null); setStudent(null); }}
                  className={`btn btn-sm ${mode === m.id ? 'btn-primary' : 'btn-outline'}`}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Student search for filled mode */}
            {mode === 'filled' && (
              <div style={{ flex:'1 1 260px', position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
                <input className="form-input" style={{ paddingLeft:32 }} placeholder="Search student by name or roll no…"
                  value={search} onChange={e => { setSearch(e.target.value); setStudentId(null); setStudent(null); }} />
                {students.length > 0 && !studentId && search.length >= 2 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e2e8f0', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:100 }}>
                    {students.map(st => (
                      <div key={st.id} style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}
                        onClick={() => { setStudentId(st.id); setStudent(st); setSearch(st.name); }}>
                        <ChevronRight size={12} color="#94a3b8"/>
                        <strong>{st.name}</strong>
                        <span style={{ color:'#94a3b8', fontSize:11 }}>{st.class?.name} | Roll: {st.rollNo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Print button */}
            <button className="btn btn-primary"
              disabled={mode === 'filled' && (!studentId || loadingFull)}
              onClick={() => printAdmissionForm(mode === 'filled' ? printable : null, school)}
              style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Printer size={14} /> {mode === 'blank' ? 'Print Blank Form' : 'Print Filled Form'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className="card">
        <div className="card-header">
          <h3>Form Preview</h3>
          <span style={{ fontSize:12, color:'#94a3b8' }}>A4 size · Professional layout · 7 sections</span>
        </div>
        <div className="card-body">
          {/* Sections overview */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
            {[
              { n:'1', title:'Student Information', icon:'👨‍🎓', color:'#1B2F6E', fields:'Name (Eng/Urdu), DOB, Gender, Religion, Nationality, Caste, B-Form, Address' },
              { n:'2', title:'Guardian Information', icon:'👪', color:'#15803D', fields:"Father/Mother name, CNIC, Occupation, Qualification, Mobile, Email" },
              { n:'3', title:'Previous School', icon:'🏫', color:'#7C3AED', fields:'School name, Address, Contact, Admission no., Grade' },
              { n:'4', title:'Medical Information', icon:'🏥', color:'#DC2626', fields:'Blood group, Food needs, Allergies, Condition of the child' },
              { n:'5', title:'Transport & Hostel', icon:'🚌', color:'#D97706', fields:'Transport required, Area, Route, Hostel required' },
              { n:'6', title:'Sibling Info', icon:'👨‍👩‍👧‍👦', color:'#0891B2', fields:'Name, class, roll number of siblings in same school' },
              { n:'7', title:'Co-curricular', icon:'🏆', color:'#64748B', fields:'Sports, Debate, Drama, Arts, Computing, Scouting' },
            ].map(s => (
              <div key={s.n} style={{ padding:'12px 14px', border:`1px solid ${s.color}22`, borderRadius:10, background: s.color + '08' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#1e3a5f' }}>{s.n}. {s.title}</div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>{s.fields}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:16, padding:'12px 14px', background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8, fontSize:12, color:'#92400e' }}>
            <strong>📋 Also includes:</strong> Student photo slot (1.5"×1.5"), Office use section, Declaration box, 4 signature blocks, School branding header with logo
          </div>

          {mode === 'filled' && !studentId && (
            <div style={{ marginTop:12, padding:'12px 14px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, fontSize:13, color:'#1d4ed8' }}>
              Search and select a student above to generate their filled admission form
            </div>
          )}
          {mode === 'filled' && student && (
            <div style={{ marginTop:12, padding:'12px 14px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', fontSize:13, color:'#15803d', fontWeight:600 }}>
              <StudentPhotoButton student={printable} size={44} />
              <span style={{ flex:1, minWidth:200 }}>
                {loadingFull ? 'Loading the full record…' : <>✅ Ready: <strong>{printable.name}</strong> — {printable.class?.name} | Roll: {printable.rollNo} — Click "Print Filled Form"</>}
                {!loadingFull && !printable.photoUrl && <div style={{ color:'#B45309', fontSize:12, marginTop:3 }}>No photo yet: add one first, or the form prints an empty photo box.</div>}
              </span>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditing(true)}><Pencil size={13}/> Edit details</button>
            </div>
          )}
          {editing && printable && <EditStudentModal student={printable} onClose={() => setEditing(false)} />}
        </div>
      </div>
    </div>
  );
}
