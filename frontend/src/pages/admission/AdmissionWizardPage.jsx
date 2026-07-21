/**
 * IlmForge — LINKED ADMISSION WIZARD (School Mentor style)
 * ═══════════════════════════════════════════════════════════
 * End-to-end linked flow — nothing can be missed:
 *   Step 1: Student Info (School Mentor-style full form)
 *   Step 2: Class + Section assign
 *   Step 3: Fee Structure (per-head with discounts)
 *   Step 4: Parent Info
 *   Step 5: Review & Confirm
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { validatePhone, validateCNIC, formatCNIC } from '../../utils/validation';

/* ═══════════════════════════════════════════════════════
   LIVE PHOTO CAPTURE COMPONENT
═══════════════════════════════════════════════════════ */
function PhotoCapture({ preview, onCapture, onClear }) {
  const [mode, setMode] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [facing, setFacing] = useState('user');
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setMode('camera');
    } catch {
      setCameraError('Camera not available. Please allow camera access or use file upload.');
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext('2d').drawImage(v, 0, 0);
    const base64 = c.toDataURL('image/jpeg', 0.85);
    stopCamera(); onCapture(base64); setMode('captured');
  };

  const flipCamera = async () => {
    stopCamera();
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch {}
  };

  const reset = () => { stopCamera(); onClear(); setMode('idle'); setCameraError(''); };
  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ width:110, height:130, borderRadius:10, overflow:'hidden', border:'2px dashed #cbd5e1', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        {mode === 'camera'
          ? <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', transform: facing==='user' ? 'scaleX(-1)' : 'none' }} />
          : preview
            ? <img src={preview} alt="Student" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <div style={{ textAlign:'center', color:'#94a3b8', fontSize:11 }}><div style={{ fontSize:32 }}>👤</div>NO IMAGE<br/>AVAILABLE</div>
        }
        <canvas ref={canvasRef} style={{ display:'none' }} />
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {mode === 'idle' && !preview && <>
          <button type="button" onClick={startCamera} style={btnSm('#0073b7')}>📷 Camera</button>
          <label style={{ ...btnSm('#475569'), cursor:'pointer' }}>
            📁 Browse
            <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              if (file.size > 3 * 1024 * 1024) { alert('Photo must be under 3MB'); return; }
              const reader = new FileReader();
              reader.onload = ev => { onCapture(ev.target.result); setMode('captured'); };
              reader.readAsDataURL(file);
            }} />
          </label>
        </>}
        {mode === 'camera' && <>
          <button type="button" onClick={capture} style={btnSm('#15803d')}>📸 Capture</button>
          <button type="button" onClick={flipCamera} style={btnSm('#475569')}>🔄 Flip</button>
          <button type="button" onClick={reset} style={btnSm('#dc2626')}>✕</button>
        </>}
        {(mode === 'captured' || (preview && mode !== 'camera')) && <>
          <button type="button" onClick={startCamera} style={btnSm('#0073b7')}>📷 Retake</button>
          <button type="button" onClick={reset} style={btnSm('#dc2626')}>✕ Remove</button>
        </>}
      </div>
      {cameraError && <div style={{ fontSize:11, color:'#b91c1c', background:'#fef2f2', padding:'6px 10px', borderRadius:7, border:'1px solid #fecaca' }}>{cameraError}</div>}
    </div>
  );
}
function btnSm(bg) { return { padding:'5px 10px', background:bg, color:'white', border:'none', borderRadius:7, cursor:'pointer', fontSize:11.5, fontWeight:600 }; }

import {
  User, GraduationCap, Wallet, Users, ClipboardCheck, CheckCircle2,
  ChevronRight, ChevronLeft, Printer, Copy, KeyRound, Link2, AlertCircle,
  Calendar, BookOpen, UserCheck, ChevronDown, ChevronUp,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Student Info',   Icon: User },
  { id: 2, label: 'Class & Section', Icon: GraduationCap },
  { id: 3, label: 'Fee Details',     Icon: Wallet },
  { id: 4, label: 'Parent Details',  Icon: Users },
  { id: 5, label: 'Review & Admit',  Icon: ClipboardCheck },
];

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

// Default 5 years ago
const defaultDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().slice(0, 10);
};

// Standard fee heads matching School Mentor
const FEE_HEADS = ['Admission Fee', 'Tuition Fee', 'Stationary', 'Annual Fund'];

export default function AdmissionWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [stepVisible, setStepVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  // Collapsible sections state
  const [prevHistoryOpen, setPrevHistoryOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  const [form, setForm] = useState({
    // ── Step 1: Student Info ──
    familyNo: '',
    admissionDate: new Date().toISOString().slice(0, 10),
    // Name
    name: '',          // First Name
    lastName: '',
    firstNameUrdu: '',
    lastNameUrdu: '',
    // Father
    fatherName: '',
    fatherNameUrdu: '',
    fatherCnic: '',
    fatherQualification: '',
    fatherOccupation: '',
    // Mother
    motherName: '',
    motherCnic: '',
    motherQualification: '',
    motherOccupation: '',
    // Basic
    gender: '',
    dob: defaultDob(),
    caste: '',
    nationality: '',
    country: 'Pakistan',
    province: 'ICT',
    city: 'Islamabad',
    religion: '',
    postalAddress: '',
    address: '',       // Permanent Address
    emergencyPhone: '+92 348 120000',
    motherPhone: '',
    email: '',
    bFormNo: '',
    admissionTestMarks: '',
    // Photo
    photoPreview: '',
    photoBase64: '',
    // Previous School
    prevSchoolName: '',
    prevSchoolFocalPerson: '',
    prevSchoolPhone: '',
    prevSchoolAddress: '',
    prevAdmissionNo: '',
    prevGrade: '',
    prevTestGrade: '',
    // Health
    bloodGroup: '',
    foodDietaryReq: '',
    allergies: '',
    childCondition: '',
    // ── Step 2 ──
    classId: '', sectionId: '', teacherId: '',
    // ── Step 3: Fee ──
    isFreeStudent: false,
    generateFirstInvoice: true,
    monthlyFee: '',
    feeDiscounts: { 'Admission Fee': '', 'Tuition Fee': '', 'Stationary': '', 'Annual Fund': '' },
    feeComments: '',
    // ── Step 4 ──
    parentEmail: '', parentCnic: '',
    createPortalAccounts: true,
  });

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })); };
  const setDiscount = (head, val) => setForm(f => ({ ...f, feeDiscounts: { ...f.feeDiscounts, [head]: val } }));

  /* ── Linked data ── */
  const { data: classes = [] } = useQuery({
    queryKey: ['wizard-classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });
  const selectedClass = classes.find(c => String(c.id) === String(form.classId));
  const sections = selectedClass?.sections || [];

  const { data: feeStructures = [] } = useQuery({
    queryKey: ['wizard-fee-structures'],
    queryFn: () => api.get('/fees/structures').then(r => r.data.data || []).catch(() => []),
  });
  const { data: timetable = [] } = useQuery({
    queryKey: ['wizard-tt', form.classId],
    queryFn: () => api.get('/timetable', { params: { classId: form.classId } }).then(r => r.data.data || []).catch(() => []),
    enabled: !!form.classId,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['wizard-staff'],
    queryFn: () => api.get('/staff').then(r => r.data.data || []).catch(() => []),
  });

  // Auto-fill fee from class structure
  useEffect(() => {
    if (!form.classId) return;
    const fs = feeStructures.find(f => String(f.classId) === String(form.classId));
    if (fs && !form.monthlyFee) set('monthlyFee', String(fs.amount || fs.monthlyFee || ''));
  }, [form.classId, feeStructures]);

  const classTeacher = staff.find(s => s.id === selectedClass?.classTeacherId)
    || staff.find(s => (s.designation || '').toLowerCase().includes('teacher'));

  // Compute class fee heads from feeStructures for step 3
  const classFeeStructures = feeStructures.filter(f => String(f.classId) === String(form.classId));

  // Build fee rows: match head names against FEE_HEADS; fallback to monthlyFee for Tuition Fee
  const feeRows = FEE_HEADS.map(head => {
    const matched = classFeeStructures.find(fs =>
      (fs.feeTitle || '').toLowerCase().includes(head.toLowerCase().split(' ')[0])
    );
    let amount = matched?.amount || 0;
    if (!amount && head === 'Tuition Fee' && form.monthlyFee) amount = parseFloat(form.monthlyFee) || 0;
    const discount = parseFloat(form.feeDiscounts[head] || 0) || 0;
    const net = Math.max(0, amount - discount);
    return { head, amount, discount, net };
  });
  const totalNet = feeRows.reduce((s, r) => s + r.net, 0);

  /* ── Validation ── */
  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.name.trim()) e.name = "Please enter the student's first name (required)";
      if (!form.fatherName.trim()) e.fatherName = "Please enter the father's full name (required)";
      if (!form.emergencyPhone.trim()) {
        e.emergencyPhone = "Parent's phone number is required for portal access and notifications";
      } else if (!validatePhone(form.emergencyPhone)) {
        e.emergencyPhone = 'Enter a valid Pakistan mobile number (e.g. 0312-3456789 or +923123456789)';
      }
      if (form.fatherCnic && !validateCNIC(form.fatherCnic)) {
        e.fatherCnic = 'Father CNIC must be 13 digits (XXXXX-XXXXXXX-X)';
      }
      if (form.motherCnic && !validateCNIC(form.motherCnic)) {
        e.motherCnic = 'Mother CNIC must be 13 digits (XXXXX-XXXXXXX-X)';
      }
    }
    if (s === 2) {
      if (!form.classId) e.classId = 'Please select a class for this student';
    }
    if (s === 4) {
      if (!form.emergencyPhone.trim()) {
        e.emergencyPhone = "Parent's phone number is required for portal access and notifications";
      } else if (!validatePhone(form.emergencyPhone)) {
        e.emergencyPhone = 'Enter a valid Pakistan mobile number (e.g. 0312-3456789 or +923123456789)';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => {
    if (validate(step)) {
      setStepVisible(false);
      setTimeout(() => { setStep(s => Math.min(5, s + 1)); setStepVisible(true); }, 200);
    }
  };
  const back = () => {
    setStepVisible(false);
    setTimeout(() => { setStep(s => Math.max(1, s - 1)); setStepVisible(true); }, 200);
  };

  /* ── SUBMIT ── */
  const submit = async () => {
    if (!validate(4)) { setStep(4); return; }
    setSubmitting(true);
    const loadingToast = toast.loading('Submitting admission...');
    try {
      const payload = {
        // Basic
        name: form.name,
        lastName: form.lastName || null,
        fatherName: form.fatherName,
        motherName: form.motherName || null,
        gender: form.gender || null,
        dob: form.dob || null,
        bFormNo: form.bFormNo || null,
        address: form.address || null,
        // Extended
        familyNo: form.familyNo || null,
        firstNameUrdu: form.firstNameUrdu || null,
        lastNameUrdu: form.lastNameUrdu || null,
        fatherNameUrdu: form.fatherNameUrdu || null,
        fatherCnic: form.fatherCnic || null,
        fatherQualification: form.fatherQualification || null,
        fatherOccupation: form.fatherOccupation || null,
        motherCnic: form.motherCnic || null,
        motherQualification: form.motherQualification || null,
        motherOccupation: form.motherOccupation || null,
        motherPhone: form.motherPhone || null,
        caste: form.caste || null,
        nationality: form.nationality || null,
        religion: form.religion || null,
        province: form.province || null,
        city: form.city || null,
        postalAddress: form.postalAddress || null,
        email: form.email || null,
        admissionTestMarks: form.admissionTestMarks !== '' ? parseFloat(form.admissionTestMarks) : null,
        // Health
        bloodGroup: form.bloodGroup || null,
        foodDietaryReq: form.foodDietaryReq || null,
        allergies: form.allergies || null,
        childCondition: form.childCondition || null,
        // Previous school
        prevSchoolName: form.prevSchoolName || null,
        prevSchoolFocalPerson: form.prevSchoolFocalPerson || null,
        prevSchoolPhone: form.prevSchoolPhone || null,
        prevSchoolAddress: form.prevSchoolAddress || null,
        prevAdmissionNo: form.prevAdmissionNo || null,
        prevGrade: form.prevGrade || null,
        prevTestGrade: form.prevTestGrade || null,
        // Class
        classId: form.classId || null,
        sectionId: form.sectionId || null,
        teacherId: form.teacherId || null,
        // Contact
        emergencyPhone: form.emergencyPhone,
        parentEmail: form.parentEmail || null,
        parentCnic: form.parentCnic || null,
        photoUrl: form.photoBase64 || null,
        // Fee
        createPortalAccounts: form.createPortalAccounts,
        generateFirstInvoice: form.generateFirstInvoice && !form.isFreeStudent,
        monthlyFee: form.isFreeStudent ? 0 : (form.monthlyFee || 0),
        feeDiscounts: form.feeDiscounts,
      };
      const res = await api.post('/students', payload);
      toast.dismiss(loadingToast);
      toast.success('Student admitted successfully! Credentials have been sent.');
      setResult(res.data);
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err.response?.data?.message || 'Try again.';
      toast.error('Admission failed: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = (t) => { navigator.clipboard?.writeText(t); };

  /* ── Print credentials slip ── */
  const printSlip = () => {
    const c = result?.credentials;
    const s = result?.data;
    if (!c || !s) return;
    const w = window.open('', '_blank', 'width=520,height=700');
    w.document.write(`<!DOCTYPE html><html><head><title>Portal Credentials — ${s.name}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:26px;font-size:13px;color:#0F172A}
      .hd{text-align:center;border-bottom:3px solid #0D9488;padding-bottom:14px;margin-bottom:18px}
      .hd h1{font-size:19px;color:#0D9488}.hd p{font-size:11px;color:#64748B;margin-top:3px}
      .card{border:1.5px solid #E2E8F0;border-radius:14px;padding:16px;margin-bottom:14px;position:relative;overflow:hidden}
      .card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#0D9488}
      .card.parent::before{background:#F59E0B}
      .card h3{font-size:13px;margin-bottom:10px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #F1F5F9;font-size:12px}
      .row b{font-family:'Consolas',monospace;background:#F8FAFC;padding:2px 8px;border-radius:6px}
      .lnk{background:#F0FDFA;border:1px solid #99F6E4;border-radius:10px;padding:10px 14px;text-align:center;font-size:12px;margin-bottom:14px;word-break:break-all}
      .warn{background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:11px;color:#92400E;margin-top:12px}
      .ft{text-align:center;margin-top:16px;font-size:10px;color:#94A3B8;border-top:1px solid #F1F5F9;padding-top:10px}
    </style></head><body>
      <div class="hd"><h1>Portal Access Credentials</h1><p>Student: <strong>${s.name}</strong> · Roll No: <strong>${s.rollNo}</strong> · Class: ${s.class?.name || '—'}</p></div>
      <div class="lnk">School Portal Link:<br>${c.portalLink}</div>
      <div class="card"><h3>STUDENT PORTAL LOGIN</h3>
        <div class="row"><span>Email / Username</span><b>${c.student.email}</b></div>
        <div class="row"><span>Password</span><b>${c.student.password}</b></div>
      </div>
      <div class="card parent"><h3>PARENT PORTAL LOGIN</h3>
        <div class="row"><span>Email / Username</span><b>${c.parent.email}</b></div>
        <div class="row"><span>Password</span><b>${c.parent.password}</b></div>
      </div>
      <div class="warn">Keep this slip safe. These credentials are shown only once.</div>
      <div class="ft">Generated on ${new Date().toLocaleString('en-PK')}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  /* ═══════════════ SUCCESS SCREEN ═══════════════ */
  if (result) {
    const c = result.credentials;
    const s = result.data;
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-9 h-9 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Admission Complete!</h1>
          <p className="text-sm text-slate-500 mt-1">
            <strong>{s.name}</strong> admitted · Roll No <strong className="text-teal-700">{s.rollNo}</strong>
            {s.class && <> · {s.class.name}{s.section ? ` — ${s.section.name}` : ''}</>}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            { ok: true, label: 'Student Record' },
            { ok: !!c, label: 'Student Portal' },
            { ok: !!c, label: 'Parent Portal' },
            { ok: !!result.invoice, label: 'Fee Invoice' },
          ].map((x, i) => (
            <div key={i} className={`rounded-xl border p-3 text-center ${x.ok ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-lg">{x.ok ? '✅' : '⏭️'}</div>
              <div className="text-[11px] font-semibold text-slate-600 mt-1">{x.label}</div>
            </div>
          ))}
        </div>
        {c && (
          <>
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <Link2 className="w-5 h-5 text-teal-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">School Portal Link</div>
                <div className="text-sm font-mono text-slate-700 truncate">{c.portalLink}</div>
              </div>
              <button onClick={() => copyText(c.portalLink)} className="p-2 rounded-lg hover:bg-teal-100 text-teal-600"><Copy className="w-4 h-4" /></button>
            </div>
            <div className="bg-white border-l-4 border-teal-500 border border-slate-200 rounded-2xl p-5 mb-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-800 text-sm">Student Portal Credentials</h3>
              </div>
              <CredRow label="Email" value={c.student.email} onCopy={copyText} />
              <CredRow label="Password" value={c.student.password} onCopy={copyText} mono />
            </div>
            <div className="bg-white border-l-4 border-amber-500 border border-slate-200 rounded-2xl p-5 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">Parent Portal Credentials</h3>
                {c.parent.existing && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Sibling — existing account</span>}
              </div>
              <CredRow label="Email" value={c.parent.email} onCopy={copyText} />
              <CredRow label="Password" value={c.parent.password} onCopy={copyText} mono />
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">These credentials are shown <strong>only once</strong>. Print/copy now and hand the slip to the parent.</p>
            </div>
          </>
        )}
        <div className="flex gap-3">
          {c && (
            <button onClick={printSlip} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition">
              <Printer className="w-4 h-4" /> Print Credentials Slip
            </button>
          )}
          <button onClick={() => { setResult(null); setStep(1); setForm(f => ({ ...f, name: '', fatherName: '', dob: defaultDob(), emergencyPhone: '+92 348 120000', parentEmail: '' })); }}
            className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition">
            + Admit Another Student
          </button>
        </div>
        <button onClick={() => navigate(`/students/${s.id}`)} className="w-full mt-3 text-sm text-teal-600 hover:underline">View Student Profile →</button>
      </div>
    );
  }

  /* ═══════════════ WIZARD ═══════════════ */
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">New Student Admission</h1>
        <p className="text-sm text-slate-500">Complete student registration — portal accounts, fee & class auto-linked</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button onClick={() => s.id < step && setStep(s.id)}
              className={`flex flex-col items-center gap-1.5 ${s.id < step ? 'cursor-pointer' : 'cursor-default'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                ${s.id === step ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/30 scale-110'
                : s.id < step ? 'bg-teal-100 border-teal-500 text-teal-700'
                : 'bg-white border-slate-200 text-slate-400'}`}>
                {s.id < step ? <CheckCircle2 className="w-5 h-5" /> : <s.Icon style={{ width:18, height:18 }} />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${s.id === step ? 'text-teal-700' : 'text-slate-400'}`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-2 mb-5 rounded ${s.id < step ? 'bg-teal-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        style={{
          opacity: stepVisible ? 1 : 0,
          transform: stepVisible ? 'translateX(0)' : 'translateX(20px)',
          transition: 'opacity 0.2s, transform 0.2s',
        }}>

        {/* ─── STEP 1: Student Info (School Mentor style) ─── */}
        {step === 1 && (
          <div>
            {/* ── General Information header ── */}
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">General Information</h2>
                <p className="text-xs text-slate-500">Student Registration Details</p>
              </div>
            </div>

            {/* Photo + Reg No / Family No row */}
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-5 mb-4 items-start">
              {/* Photo */}
              <div>
                <label className={labelCls}>Photo</label>
                <PhotoCapture
                  preview={form.photoPreview}
                  onCapture={(b) => { set('photoPreview', b); set('photoBase64', b); }}
                  onClear={() => { set('photoPreview', ''); set('photoBase64', ''); }}
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Registration No" note="Auto-generated">
                  <input className={inputCls + ' bg-slate-50 text-slate-400'} value="Auto" readOnly />
                </Field>
                <Field label="Family No">
                  <input className={inputCls} value={form.familyNo} onChange={e => set('familyNo', e.target.value)} placeholder="Family number" />
                </Field>
                <Field label="Date of Admission">
                  <input type="date" className={inputCls} value={form.admissionDate} onChange={e => set('admissionDate', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Admission Test Marks %">
                  <input type="number" className={inputCls} value={form.admissionTestMarks} onChange={e => set('admissionTestMarks', e.target.value)} placeholder="e.g. 85" min="0" max="100" />
                </Field>
                <Field label="B-Form No" error={errors.bFormNo}>
                  <input className={inputCls} value={form.bFormNo}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9-]/g, '');
                      set('bFormNo', v);
                      if (v && v.length >= 15 && !/^\d{5}-\d{7}-\d$/.test(v)) {
                        setErrors(er => ({ ...er, bFormNo: 'Format: XXXXX-XXXXXXX-X' }));
                      } else { setErrors(er => ({ ...er, bFormNo: null })); }
                    }}
                    placeholder="XXXXX-XXXXXXXX-X" maxLength={16} />
                </Field>
              </div>
            </div>

            {/* Name fields */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="First Name *" error={errors.name}>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Muhammad Ahmad" autoFocus />
              </Field>
              <Field label="Last Name">
                <input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="e.g. Khan" />
              </Field>
              <Field label="First Name In Urdu">
                <input className={inputCls} dir="rtl" value={form.firstNameUrdu} onChange={e => set('firstNameUrdu', e.target.value)} placeholder="احمد" style={{ fontFamily:'serif' }} />
              </Field>
              <Field label="Last Name In Urdu">
                <input className={inputCls} dir="rtl" value={form.lastNameUrdu} onChange={e => set('lastNameUrdu', e.target.value)} placeholder="خان" style={{ fontFamily:'serif' }} />
              </Field>
            </div>

            {/* Father fields */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Father Name *" error={errors.fatherName}>
                <input className={inputCls} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="e.g. Muhammad Ali" />
              </Field>
              <Field label="Father Name In Urdu">
                <input className={inputCls} dir="rtl" value={form.fatherNameUrdu} onChange={e => set('fatherNameUrdu', e.target.value)} placeholder="محمد علی خان" style={{ fontFamily:'serif' }} />
              </Field>
              <Field label="Father CNIC" error={errors.fatherCnic}>
                <input
                  className={inputCls}
                  value={form.fatherCnic}
                  onChange={e => {
                    const formatted = formatCNIC(e.target.value);
                    set('fatherCnic', formatted);
                  }}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (val && !validateCNIC(val)) {
                      setErrors(er => ({ ...er, fatherCnic: 'Father CNIC must be 13 digits (XXXXX-XXXXXXX-X)' }));
                    }
                  }}
                  placeholder="XXXXX-XXXXXXX-X"
                  maxLength={15}
                />
                {form.fatherCnic && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: validateCNIC(form.fatherCnic) ? '#059669' : '#DC2626'
                  }}>
                    {validateCNIC(form.fatherCnic) ? '✓ Valid' : '✗ Incomplete (13 digits required)'}
                  </span>
                )}
              </Field>
              <Field label="Father's Qualification">
                <select className={inputCls} value={form.fatherQualification} onChange={e => set('fatherQualification', e.target.value)}>
                  <option value="">Select Qualification</option>
                  {['Matric','Intermediate','Bachelor','Master','PhD','Other','None'].map(q => <option key={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="Father's Occupation">
                <input className={inputCls} value={form.fatherOccupation} onChange={e => set('fatherOccupation', e.target.value)} placeholder="e.g. Business, Government Job" />
              </Field>
            </div>

            {/* Mother fields */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Mother Name">
                <input className={inputCls} value={form.motherName} onChange={e => set('motherName', e.target.value)} placeholder="e.g. Fatima Bibi" />
              </Field>
              <Field label="Mother CNIC" error={errors.motherCnic}>
                <input
                  className={inputCls}
                  value={form.motherCnic}
                  onChange={e => {
                    const formatted = formatCNIC(e.target.value);
                    set('motherCnic', formatted);
                  }}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (val && !validateCNIC(val)) {
                      setErrors(er => ({ ...er, motherCnic: 'Mother CNIC must be 13 digits (XXXXX-XXXXXXX-X)' }));
                    }
                  }}
                  placeholder="XXXXX-XXXXXXX-X"
                  maxLength={15}
                />
                {form.motherCnic && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: validateCNIC(form.motherCnic) ? '#059669' : '#DC2626'
                  }}>
                    {validateCNIC(form.motherCnic) ? '✓ Valid' : '✗ Incomplete (13 digits required)'}
                  </span>
                )}
              </Field>
              <Field label="Mother's Qualification">
                <select className={inputCls} value={form.motherQualification} onChange={e => set('motherQualification', e.target.value)}>
                  <option value="">Select Qualification</option>
                  {['Matric','Intermediate','Bachelor','Master','PhD','Other','None'].map(q => <option key={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="Mother's Occupation">
                <input className={inputCls} value={form.motherOccupation} onChange={e => set('motherOccupation', e.target.value)} placeholder="e.g. Housewife, Teacher" />
              </Field>
            </div>

            {/* Personal details */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Gender">
                <select className={inputCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input type="date" className={inputCls} value={form.dob} onChange={e => set('dob', e.target.value)} />
              </Field>
              <Field label="Caste">
                <input className={inputCls} value={form.caste} onChange={e => set('caste', e.target.value)} placeholder="e.g. Sheikh, Syed" />
              </Field>
              <Field label="Nationality">
                <select className={inputCls} value={form.nationality} onChange={e => set('nationality', e.target.value)}>
                  <option value="">Select Nationality</option>
                  {['Pakistani','Afghan','Iranian','Indian','Other'].map(n => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Country">
                <input className={inputCls} value={form.country} onChange={e => set('country', e.target.value)} />
              </Field>
              <Field label="Province">
                <select className={inputCls} value={form.province} onChange={e => set('province', e.target.value)}>
                  {['ICT','Punjab','Sindh','KPK','Balochistan','AJK','GB'].map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="City">
                <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Islamabad" />
              </Field>
              <Field label="Religion">
                <select className={inputCls} value={form.religion} onChange={e => set('religion', e.target.value)}>
                  <option value="">Select Religion</option>
                  {['Islam','Christianity','Hinduism','Sikhism','Other'].map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {/* Addresses */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Postal Address" full>
                <input className={inputCls} value={form.postalAddress} onChange={e => set('postalAddress', e.target.value)} placeholder="Postal / Mailing Address" />
              </Field>
              <Field label="Permanent Address" full>
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Permanent Home Address" />
              </Field>
            </div>

            {/* Contact */}
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Mobile No *" error={errors.emergencyPhone}>
                <input
                  className={inputCls}
                  value={form.emergencyPhone}
                  onChange={e => {
                    // Allow digits, +, spaces, and dashes; strip everything else
                    const raw = e.target.value.replace(/[^0-9+\s\-]/g, '');
                    set('emergencyPhone', raw);
                  }}
                  onBlur={e => {
                    const raw = e.target.value.trim();
                    if (raw && !validatePhone(raw)) {
                      setErrors(er => ({ ...er, emergencyPhone: 'Enter a valid Pakistan mobile number (e.g. 0312-3456789 or +923123456789)' }));
                    }
                  }}
                  placeholder="03XX-XXXXXXX"
                  maxLength={15}
                />
                {form.emergencyPhone && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: validatePhone(form.emergencyPhone) ? '#059669' : '#DC2626'
                  }}>
                    {validatePhone(form.emergencyPhone) ? '✓ Valid' : '✗ Invalid format'}
                  </span>
                )}
              </Field>
              <Field label="Mother Mobile No">
                <input className={inputCls} value={form.motherPhone} onChange={e => set('motherPhone', e.target.value)} placeholder="+92 3XX XXXXXXX" />
              </Field>
              <Field label="Email">
                <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="parent@email.com (optional)" />
              </Field>
            </div>

            {/* ── Previous Institutional History (collapsible) ── */}
            <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => setPrevHistoryOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left">
                <span className="font-semibold text-slate-700 text-sm">Previous Institutional History</span>
                {prevHistoryOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {prevHistoryOpen && (
                <div className="p-4 grid sm:grid-cols-2 gap-3">
                  <Field label="School Name">
                    <input className={inputCls} value={form.prevSchoolName} onChange={e => set('prevSchoolName', e.target.value)} placeholder="Previous school name" />
                  </Field>
                  <Field label="Focal Person">
                    <input className={inputCls} value={form.prevSchoolFocalPerson} onChange={e => set('prevSchoolFocalPerson', e.target.value)} />
                  </Field>
                  <Field label="Contact No">
                    <input className={inputCls} value={form.prevSchoolPhone} onChange={e => set('prevSchoolPhone', e.target.value)} />
                  </Field>
                  <Field label="School Address">
                    <input className={inputCls} value={form.prevSchoolAddress} onChange={e => set('prevSchoolAddress', e.target.value)} />
                  </Field>
                  <Field label="Admission No">
                    <input className={inputCls} value={form.prevAdmissionNo} onChange={e => set('prevAdmissionNo', e.target.value)} />
                  </Field>
                  <Field label="Previous Grade">
                    <input className={inputCls} value={form.prevGrade} onChange={e => set('prevGrade', e.target.value)} placeholder="e.g. Grade 3" />
                  </Field>
                  <Field label="Test of Grade">
                    <input className={inputCls} value={form.prevTestGrade} onChange={e => set('prevTestGrade', e.target.value)} placeholder="e.g. A+" />
                  </Field>
                </div>
              )}
            </div>

            {/* ── Health & Emergency Information (collapsible) ── */}
            <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => setHealthOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left">
                <span className="font-semibold text-slate-700 text-sm">Health & Emergency Information</span>
                {healthOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {healthOpen && (
                <div className="p-4 grid sm:grid-cols-2 gap-3">
                  <Field label="Blood Group">
                    <select className={inputCls} value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                      <option value="">Select Blood Group</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                    </select>
                  </Field>
                  <Field label="Food and Dietary Req">
                    <input className={inputCls} value={form.foodDietaryReq} onChange={e => set('foodDietaryReq', e.target.value)} placeholder="e.g. Vegetarian, Halal only" />
                  </Field>
                  <Field label="Allergies / Major Illness" full>
                    <input className={inputCls} value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="e.g. Peanut allergy, Asthma" />
                  </Field>
                  <Field label="Condition of the Child" full>
                    <input className={inputCls} value={form.childCondition} onChange={e => set('childCondition', e.target.value)} placeholder="e.g. Healthy, Requires special attention" />
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Class & Section ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Assign Class *" error={errors.classId}>
                <select className={inputCls} value={form.classId} onChange={e => { set('classId', e.target.value); set('sectionId', ''); }}>
                  <option value="">Select class…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Section">
                <select className={inputCls} value={form.sectionId} onChange={e => set('sectionId', e.target.value)} disabled={!sections.length}>
                  <option value="">{sections.length ? 'Select section…' : 'No sections'}</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Assign Teacher (Optional)">
              <select className={inputCls} value={form.teacherId} onChange={e => set('teacherId', e.target.value)}>
                <option value="">{classTeacher ? `Auto: ${classTeacher.name} (Class Teacher)` : 'Select teacher…'}</option>
                {staff.filter(s => s.role === 'teacher' || s.designation?.toLowerCase().includes('teacher')).map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.designation ? ` — ${s.designation}` : ''}</option>
                ))}
              </select>
            </Field>
            {selectedClass && (
              <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-4 space-y-3">
                <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">Auto-linked with this class</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <LinkedCard Icon={UserCheck} title="Class Teacher"
                    value={form.teacherId ? (staff.find(s => String(s.id) === String(form.teacherId))?.name || 'Selected') : (classTeacher?.name || 'Not assigned')}
                    sub={form.teacherId ? 'Manually selected' : (classTeacher ? 'Auto from class' : 'Select above')} />
                  <LinkedCard Icon={Calendar} title="Timetable" value={timetable.length ? `${timetable.length} periods set` : 'Not created yet'} sub={timetable.length ? 'Auto-visible on student portal' : 'Create later'} />
                  <LinkedCard Icon={BookOpen} title="Roll Number" value="Auto-generate" sub="Class prefix (e.g. C5A-26-001)" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: Fee Details (School Mentor style) ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">Fee Details</h2>
                <p className="text-xs text-slate-500">
                  {selectedClass ? `Fee structure for ${selectedClass.name}` : 'Select a class first to load fee structure'}
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={form.isFreeStudent} onChange={e => set('isFreeStudent', e.target.checked)} className="w-4 h-4 accent-teal-600" />
              <div>
                <div className="text-sm font-semibold text-slate-700">Free Student (Zakat / Scholarship)</div>
                <div className="text-xs text-slate-500">Fee invoices will not be generated</div>
              </div>
            </label>

            {!form.isFreeStudent && (
              <>
                {/* Fee structure table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-700 text-white text-xs">
                        <th className="text-left px-4 py-2.5 font-semibold">Fee Head</th>
                        <th className="text-right px-4 py-2.5 font-semibold">Amount (Rs)</th>
                        <th className="text-right px-4 py-2.5 font-semibold">Discount (Rs)</th>
                        <th className="text-right px-4 py-2.5 font-semibold">Net Amount (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeRows.map((row, idx) => (
                        <tr key={row.head} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-2.5 font-medium text-slate-700">{row.head}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {row.head === 'Tuition Fee' && !row.amount ? (
                              <input
                                type="number"
                                className="w-28 text-right px-2 py-1 rounded border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                                value={form.monthlyFee}
                                onChange={e => set('monthlyFee', e.target.value)}
                                placeholder="0"
                              />
                            ) : (
                              <span>{row.amount > 0 ? row.amount.toLocaleString() : <span className="text-slate-300">—</span>}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              className="w-24 text-right px-2 py-1 rounded border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                              value={form.feeDiscounts[row.head]}
                              onChange={e => setDiscount(row.head, e.target.value)}
                              placeholder="0"
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-teal-700">
                            {row.net > 0 ? row.net.toLocaleString() : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-teal-50 border-t-2 border-teal-200">
                        <td className="px-4 py-3 font-bold text-slate-700" colSpan={3}>Total Net Amount</td>
                        <td className="px-4 py-3 text-right font-bold text-teal-700 text-base">
                          Rs {totalNet.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Comments */}
                <Field label="Comments">
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={form.feeComments}
                    onChange={e => set('feeComments', e.target.value)}
                    placeholder="Any notes regarding fee discounts or special cases…"
                  />
                </Field>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-teal-200 bg-teal-50/50 cursor-pointer">
                  <input type="checkbox" checked={form.generateFirstInvoice} onChange={e => set('generateFirstInvoice', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Generate this month's fee invoice now</div>
                    <div className="text-xs text-slate-500">First challan will be created alongside admission — visible immediately in fee collection</div>
                  </div>
                </label>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 4: Parent Details ─── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Parent Phone (WhatsApp) *" error={errors.emergencyPhone}>
                <input
                  className={inputCls}
                  value={form.emergencyPhone}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9+\s\-]/g, '');
                    set('emergencyPhone', raw);
                  }}
                  onBlur={e => {
                    const raw = e.target.value.trim();
                    if (raw && !validatePhone(raw)) {
                      setErrors(er => ({ ...er, emergencyPhone: 'Enter a valid Pakistan mobile number (e.g. 0312-3456789 or +923123456789)' }));
                    }
                  }}
                  placeholder="03XX-XXXXXXX"
                  maxLength={15}
                />
                {form.emergencyPhone && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: validatePhone(form.emergencyPhone) ? '#059669' : '#DC2626'
                  }}>
                    {validatePhone(form.emergencyPhone) ? '✓ Valid' : '✗ Invalid format'}
                  </span>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Sibling detection uses this number — same parent = same account</p>
              </Field>
              <Field label="Parent Email (optional)">
                <input className={inputCls} type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} placeholder="parent@email.com" />
              </Field>
              <Field label="Parent CNIC" error={errors.parentCnic}>
                <input
                  className={inputCls}
                  value={form.parentCnic}
                  onChange={e => {
                    const formatted = formatCNIC(e.target.value);
                    set('parentCnic', formatted);
                  }}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (val && !validateCNIC(val)) {
                      setErrors(er => ({ ...er, parentCnic: 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)' }));
                    } else {
                      setErrors(er => ({ ...er, parentCnic: null }));
                    }
                  }}
                  placeholder="XXXXX-XXXXXXX-X"
                  maxLength={15}
                />
              </Field>
            </div>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-teal-300 bg-teal-50 cursor-pointer">
              <input type="checkbox" checked={form.createPortalAccounts} onChange={e => set('createPortalAccounts', e.target.checked)} className="w-5 h-5 accent-teal-600" />
              <div>
                <div className="text-sm font-bold text-slate-800">Auto-create Portal Accounts (Recommended)</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Student Portal account + password &nbsp;|&nbsp; Parent Portal account + password<br/>
                  Credentials will appear on screen when admission completes + printable slip
                </div>
              </div>
            </label>
          </div>
        )}

        {/* ─── STEP 5: Review ─── */}
        {step === 5 && (
          <div className="space-y-3">
            <ReviewRow label="First Name" value={`${form.name}${form.lastName ? ' ' + form.lastName : ''}`} onEdit={() => setStep(1)} />
            <ReviewRow label="Father's Name" value={form.fatherName} onEdit={() => setStep(1)} />
            <ReviewRow label="Gender / DOB" value={`${form.gender || '—'} · ${form.dob || '—'}`} onEdit={() => setStep(1)} />
            <ReviewRow label="Mobile No" value={form.emergencyPhone} onEdit={() => setStep(1)} />
            {form.bFormNo && <ReviewRow label="B-Form No" value={form.bFormNo} onEdit={() => setStep(1)} />}
            {form.religion && <ReviewRow label="Religion" value={form.religion} onEdit={() => setStep(1)} />}
            <ReviewRow label="Class" value={selectedClass ? `${selectedClass.name}${form.sectionId ? ' — ' + (sections.find(s => String(s.id) === String(form.sectionId))?.name || '') : ''}` : '—'} onEdit={() => setStep(2)} />
            <ReviewRow label="Class Teacher" value={classTeacher?.name || 'Not assigned'} onEdit={() => setStep(2)} />
            <ReviewRow label="Fee"
              value={form.isFreeStudent ? 'FREE Student' : `Net Rs ${totalNet.toLocaleString()}${form.generateFirstInvoice ? ' · First invoice: YES' : ''}`}
              onEdit={() => setStep(3)} />
            <ReviewRow label="Portal Accounts" value={form.createPortalAccounts ? 'Student + Parent (auto credentials)' : 'Skip'} onEdit={() => setStep(4)} />

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">On admission, the following will auto-complete:</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                <div>✅ Roll number auto-generate</div>
                <div>✅ Class + section link</div>
                {form.createPortalAccounts && <><div>✅ Student portal + password</div><div>✅ Parent portal + password</div></>}
                {form.generateFirstInvoice && !form.isFreeStudent && <div>✅ First month fee invoice</div>}
                <div>✅ Audit log entry</div>
                <div>✅ Timetable auto-visible (portal)</div>
                <div>✅ Attendance ready (class list)</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between mt-8 pt-5 border-t border-slate-100">
          <button onClick={back} disabled={step === 1}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < 5 ? (
            <button onClick={next}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25 transition">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25 disabled:opacity-60 transition">
              {submitting ? 'Admitting…' : 'Complete Admission'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small components ── */
function Field({ label, error, children, full, note }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className={labelCls}>
        {label}
        {note && <span className="ml-1 text-slate-400 normal-case font-normal">({note})</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}
function LinkedCard({ Icon, title, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-teal-100 p-3">
      <div className="flex items-center gap-1.5 text-teal-600 mb-1"><Icon className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">{title}</span></div>
      <div className="text-xs font-semibold text-slate-700">{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
function ReviewRow({ label, value, onEdit }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 border-b border-slate-100">
      <div><div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div><div className="text-sm text-slate-700 font-medium">{value || '—'}</div></div>
      <button onClick={onEdit} className="text-xs text-teal-600 hover:underline font-semibold">Edit</button>
    </div>
  );
}
function CredRow({ label, value, onCopy, mono }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <code className={`text-sm ${mono ? 'font-mono bg-slate-100 px-2.5 py-1 rounded-lg font-bold text-slate-800' : 'text-slate-700'}`}>{value}</code>
        <button onClick={() => onCopy(value)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600"><Copy className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
