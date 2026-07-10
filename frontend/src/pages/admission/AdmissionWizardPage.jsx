/**
 * IlmForge — LINKED ADMISSION WIZARD (onboarding style)
 * ═══════════════════════════════════════════════════════════
 * End-to-end linked flow — nothing can be missed:
 *   Step 1: Student Info
 *   Step 2: Class + Section assign (teacher & timetable auto-shown)
 *   Step 3: Fee Structure (auto-loaded from class, first invoice option)
 *   Step 4: Parent Info (portal account auto)
 *   Step 5: Review & Confirm
 *   Success: BOTH portal credentials shown + printable slip
 * Everything is engaged: portal accounts, fee invoice, class link,
 * teacher visibility, roll number — all auto.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  User, GraduationCap, Wallet, Users, ClipboardCheck, CheckCircle2,
  ChevronRight, ChevronLeft, Printer, Copy, KeyRound, Link2, AlertCircle,
  Calendar, BookOpen, UserCheck,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Student Info',   Icon: User },
  { id: 2, label: 'Class & Section', Icon: GraduationCap },
  { id: 3, label: 'Fee Setup',       Icon: Wallet },
  { id: 4, label: 'Parent Details',  Icon: Users },
  { id: 5, label: 'Review & Admit',  Icon: ClipboardCheck },
];

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

export default function AdmissionWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // success payload with credentials
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    // Step 1
    name: '', fatherName: '', motherName: '', gender: 'Male', dob: '',
    bFormNo: '', address: '',
    // Step 2
    classId: '', sectionId: '',
    // Step 3
    monthlyFee: '', generateFirstInvoice: true, isFreeStudent: false,
    // Step 4
    emergencyPhone: '', parentEmail: '', parentCnic: '',
    createPortalAccounts: true,
  });
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })); };

  /* ── Linked data: classes with sections + fee structures + timetable ── */
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

  // ═══ LINKED: auto-fill fee from class fee structure when class selected ═══
  useEffect(() => {
    if (!form.classId) return;
    const fs = feeStructures.find(f => String(f.classId) === String(form.classId));
    if (fs && !form.monthlyFee) set('monthlyFee', String(fs.amount || fs.monthlyFee || ''));
  }, [form.classId, feeStructures]);

  // Class teacher (linked visibility)
  const classTeacher = staff.find(s => s.id === selectedClass?.classTeacherId)
    || staff.find(s => (s.designation || '').toLowerCase().includes('teacher'));

  /* ── Step validation — nothing can be skipped ── */
  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.name.trim()) e.name = 'Student name required';
      if (!form.fatherName.trim()) e.fatherName = "Father's name required";
      if (!form.dob) e.dob = 'Date of birth required';
    }
    if (s === 2) {
      if (!form.classId) e.classId = 'Class assign karna zaroori hai';
    }
    if (s === 3) {
      if (!form.isFreeStudent && !form.monthlyFee) e.monthlyFee = 'Monthly fee required (ya Free Student mark karein)';
    }
    if (s === 4) {
      if (!form.emergencyPhone.trim()) e.emergencyPhone = 'Parent phone required — portal credentials isi pe linked hongi';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => { if (validate(step)) setStep(s => Math.min(5, s + 1)); };
  const back = () => setStep(s => Math.max(1, s - 1));

  /* ── FINAL SUBMIT — one API call, everything linked server-side ── */
  const submit = async () => {
    if (!validate(4)) { setStep(4); return; }
    setSubmitting(true);
    try {
      // Build payload — exclude UI-only fields
      const payload = {
        name:          form.name,
        fatherName:    form.fatherName,
        motherName:    form.motherName,
        gender:        form.gender,
        dob:           form.dob || null,
        bFormNo:       form.bFormNo || null,
        address:       form.address || null,
        classId:       form.classId || null,
        sectionId:     form.sectionId || null,
        emergencyPhone:form.emergencyPhone,
        parentEmail:   form.parentEmail || null,
        parentCnic:    form.parentCnic || null,
        photoUrl:      form.photoBase64 || null,   // base64 photo
        createPortalAccounts: form.createPortalAccounts,
        generateFirstInvoice: form.generateFirstInvoice && !form.isFreeStudent,
        monthlyFee:    form.isFreeStudent ? 0 : (form.monthlyFee || 0),
      };
      const res = await api.post('/students', payload);
      setResult(res.data); // { data: student, credentials, invoice }
    } catch (err) {
      alert(err.response?.data?.message || 'Admission failed. Try again.');
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
      .card h3{font-size:13px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #F1F5F9;font-size:12px}
      .row b{font-family:'Consolas',monospace;background:#F8FAFC;padding:2px 8px;border-radius:6px}
      .lnk{background:#F0FDFA;border:1px solid #99F6E4;border-radius:10px;padding:10px 14px;text-align:center;font-size:12px;margin-bottom:14px;word-break:break-all}
      .warn{background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:11px;color:#92400E;margin-top:12px}
      .ft{text-align:center;margin-top:16px;font-size:10px;color:#94A3B8;border-top:1px solid #F1F5F9;padding-top:10px}
    </style></head><body>
      <div class="hd"><h1>🎓 Portal Access Credentials</h1><p>Student: <strong>${s.name}</strong> · Roll No: <strong>${s.rollNo}</strong> · Class: ${s.class?.name || '—'}</p></div>
      <div class="lnk">🔗 <strong>School Portal Link:</strong><br>${c.portalLink}</div>
      <div class="card"><h3>👨‍🎓 STUDENT PORTAL LOGIN</h3>
        <div class="row"><span>Email / Username</span><b>${c.student.email}</b></div>
        <div class="row"><span>Password</span><b>${c.student.password}</b></div>
      </div>
      <div class="card parent"><h3>👨‍👩‍👧 PARENT PORTAL LOGIN</h3>
        <div class="row"><span>Email / Username</span><b>${c.parent.email}</b></div>
        <div class="row"><span>Password</span><b>${c.parent.password}</b></div>
      </div>
      <div class="warn">⚠️ Yeh credentials sirf ek dafa dikhaye ja rahe hain. Parent ko yeh slip dein aur pehli login pe password change karne ka kahein. Portal link browser mein open karke in credentials se login karein.</div>
      <div class="ft">Generated on ${new Date().toLocaleString('en-PK')} · Keep this slip safe</div>
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
          <h1 className="text-2xl font-bold text-slate-800">Admission Complete! 🎉</h1>
          <p className="text-sm text-slate-500 mt-1">
            <strong>{s.name}</strong> admitted · Roll No <strong className="text-teal-700">{s.rollNo}</strong>
            {s.class && <> · {s.class.name}{s.section ? ` — ${s.section.name}` : ''}</>}
          </p>
        </div>

        {/* Everything that got LINKED */}
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
            {/* School portal link */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <Link2 className="w-5 h-5 text-teal-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">School Portal Link (unique)</div>
                <div className="text-sm font-mono text-slate-700 truncate">{c.portalLink}</div>
              </div>
              <button onClick={() => copyText(c.portalLink)} className="p-2 rounded-lg hover:bg-teal-100 text-teal-600" title="Copy"><Copy className="w-4 h-4" /></button>
            </div>

            {/* Student credentials */}
            <div className="bg-white border-l-4 border-teal-500 border border-slate-200 rounded-2xl p-5 mb-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-800 text-sm">Student Portal Credentials</h3>
              </div>
              <CredRow label="Email" value={c.student.email} onCopy={copyText} />
              <CredRow label="Password" value={c.student.password} onCopy={copyText} mono />
            </div>

            {/* Parent credentials */}
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
              <p className="text-xs text-amber-800">Yeh credentials <strong>sirf ek dafa</strong> screen pe dikh rahe hain. Print/copy kar lein aur parent ko slip dein — dobara nahi dikhenge (sirf password reset ho sakta hai Portal Management se).</p>
            </div>
          </>
        )}

        <div className="flex gap-3">
          {c && (
            <button onClick={printSlip} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition">
              <Printer className="w-4 h-4" /> Print Credentials Slip
            </button>
          )}
          <button onClick={() => { setResult(null); setStep(1); setForm(f => ({ ...f, name: '', fatherName: '', motherName: '', dob: '', bFormNo: '', emergencyPhone: '', parentEmail: '' })); }}
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
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">New Student Admission</h1>
        <p className="text-sm text-slate-500">Linked flow — portal accounts, fee & class sab auto engage honge</p>
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
                {s.id < step ? <CheckCircle2 className="w-5 h-5" /> : <s.Icon className="w-4.5 h-4.5" style={{width:18,height:18}} />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${s.id === step ? 'text-teal-700' : 'text-slate-400'}`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-2 mb-5 rounded ${s.id < step ? 'bg-teal-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {/* ─── STEP 1: Student Info ─── */}
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Photo upload */}
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>
              <div style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', flexShrink: 0 }}>
                {form.photoPreview
                  ? <img src={form.photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 32 }}>📷</span>
                }
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 4 }}>Student Photo</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Upload photo for ID card (optional, max 2MB)</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#0073b7', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  📷 Choose Photo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { alert('Photo must be under 2MB'); return; }
                    const reader = new FileReader();
                    reader.onload = ev => { set('photoPreview', ev.target.result); set('photoBase64', ev.target.result); };
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {form.photoPreview && (
                  <button onClick={() => { set('photoPreview', ''); set('photoBase64', ''); }}
                    style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}>✕ Remove</button>
                )}
              </div>
            </div>
            <Field label="Student Full Name *" error={errors.name}>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ahmed Ali Khan" autoFocus />
            </Field>
            <Field label="Father's Name *" error={errors.fatherName}>
              <input className={inputCls} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="e.g. Muhammad Ali Khan" />
            </Field>
            <Field label="Mother's Name">
              <input className={inputCls} value={form.motherName} onChange={e => set('motherName', e.target.value)} />
            </Field>
            <Field label="Gender">
              <select className={inputCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option>Male</option><option>Female</option>
              </select>
            </Field>
            <Field label="Date of Birth *" error={errors.dob}>
              <input type="date" className={inputCls} value={form.dob} onChange={e => set('dob', e.target.value)} />
            </Field>
            <Field label="B-Form Number" error={errors.bFormNo}>
              <input className={inputCls} value={form.bFormNo}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9-]/g,'');
                  set('bFormNo', v);
                  if (v && v.length > 0 && !/^\d{5}-\d{7}-\d$/.test(v) && v.length >= 15) {
                    setErrors(er => ({ ...er, bFormNo: 'Format: XXXXX-XXXXXXX-X' }));
                  } else { setErrors(er => ({ ...er, bFormNo: null })); }
                }}
                placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
            </Field>
            <Field label="Home Address" full>
              <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} />
            </Field>
          </div>
        )}

        {/* ─── STEP 2: Class & Section (LINKED: teacher + timetable preview) ─── */}
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

            {/* LINKED PREVIEW — what this class connects to */}
            {selectedClass && (
              <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-4 space-y-3">
                <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">🔗 Is class se auto-linked</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <LinkedCard Icon={UserCheck} title="Class Teacher" value={classTeacher?.name || 'Not assigned yet'} sub={classTeacher ? 'Attendance & marks isi teacher se' : 'Staff → assign later'} />
                  <LinkedCard Icon={Calendar} title="Timetable" value={timetable.length ? `${timetable.length} periods set` : 'Not created yet'} sub={timetable.length ? 'Student portal pe auto-visible' : 'Timetable → create later'} />
                  <LinkedCard Icon={BookOpen} title="Roll Number" value="Auto-generate" sub="Class prefix ke saath (e.g. C5-001)" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: Fee (LINKED: auto-loaded from class structure) ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={form.isFreeStudent} onChange={e => set('isFreeStudent', e.target.checked)} className="w-4 h-4 accent-teal-600" />
              <div>
                <div className="text-sm font-semibold text-slate-700">Free Student (Zakat / Scholarship)</div>
                <div className="text-xs text-slate-500">Fee invoices generate nahi hongi</div>
              </div>
            </label>

            {!form.isFreeStudent && (
              <>
                <Field label="Monthly Fee (Rs) *" error={errors.monthlyFee}>
                  <input type="number" className={inputCls} value={form.monthlyFee} onChange={e => set('monthlyFee', e.target.value)} placeholder="e.g. 3500" />
                  {selectedClass && feeStructures.find(f => String(f.classId) === String(form.classId)) &&
                    <p className="text-[11px] text-teal-600 mt-1">✓ Auto-loaded from {selectedClass.name} fee structure</p>}
                </Field>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-teal-200 bg-teal-50/50 cursor-pointer">
                  <input type="checkbox" checked={form.generateFirstInvoice} onChange={e => set('generateFirstInvoice', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">🔗 Is month ki fee invoice abhi generate karo</div>
                    <div className="text-xs text-slate-500">Admission ke saath hi pehli challan ban jayegi — fee collection mein turant dikhegi</div>
                  </div>
                </label>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 4: Parent (LINKED: portal accounts auto) ─── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Parent Phone (WhatsApp) *" error={errors.emergencyPhone}>
                <input className={inputCls} value={form.emergencyPhone}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9+\-\s]/g,'');
                    set('emergencyPhone', v);
                  }}
                  placeholder="03XX-XXXXXXX" />
                <p className="text-[11px] text-slate-400 mt-1">Sibling detection isi number se — same parent = same account</p>
              </Field>
              <Field label="Parent Email (optional)">
                <input className={inputCls} type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)} placeholder="parent@email.com (optional)" />
              </Field>
              <Field label="Parent CNIC" error={errors.parentCnic}>
                <input className={inputCls} value={form.parentCnic}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9-]/g,'');
                    set('parentCnic', v);
                    if (v && v.length > 0 && !/^\d{5}-\d{7}-\d$/.test(v) && v.length >= 15) {
                      setErrors(er => ({ ...er, parentCnic: 'Format: XXXXX-XXXXXXX-X' }));
                    } else { setErrors(er => ({ ...er, parentCnic: null })); }
                  }}
                  placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
              </Field>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-teal-300 bg-teal-50 cursor-pointer">
              <input type="checkbox" checked={form.createPortalAccounts} onChange={e => set('createPortalAccounts', e.target.checked)} className="w-5 h-5 accent-teal-600" />
              <div>
                <div className="text-sm font-bold text-slate-800">🔗 Portal accounts auto-create karo (Recommended)</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  ✓ Student Portal account + password &nbsp; ✓ Parent Portal account + password<br/>
                  Credentials admission complete hote hi screen pe dikhengi + print slip milegi
                </div>
              </div>
            </label>
          </div>
        )}

        {/* ─── STEP 5: Review ─── */}
        {step === 5 && (
          <div className="space-y-3">
            <ReviewRow label="Student" value={`${form.name} ${form.gender === 'Male' ? '👦' : '👧'} · DOB ${form.dob}`} onEdit={() => setStep(1)} />
            <ReviewRow label="Father" value={form.fatherName} onEdit={() => setStep(1)} />
            <ReviewRow label="Class" value={selectedClass ? `${selectedClass.name}${form.sectionId ? ' — ' + (sections.find(s => String(s.id) === String(form.sectionId))?.name || '') : ''}` : '—'} onEdit={() => setStep(2)} />
            <ReviewRow label="Class Teacher (linked)" value={classTeacher?.name || 'Not assigned'} onEdit={() => setStep(2)} />
            <ReviewRow label="Fee" value={form.isFreeStudent ? 'FREE Student' : `Rs ${form.monthlyFee}/month${form.generateFirstInvoice ? ' · First invoice: YES' : ''}`} onEdit={() => setStep(3)} />
            <ReviewRow label="Parent Phone" value={form.emergencyPhone} onEdit={() => setStep(4)} />
            <ReviewRow label="Portal Accounts" value={form.createPortalAccounts ? '✅ Student + Parent (auto credentials)' : '❌ Skip'} onEdit={() => setStep(4)} />

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Admit hote hi yeh sab auto hoga:</div>
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
              {submitting ? 'Admitting…' : '🎓 Complete Admission'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small components ── */
function Field({ label, error, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className={labelCls}>{label}</label>
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
      <div><div className="text-[10px] font-bold text-slate-400 uppercase">{label}</div><div className="text-sm text-slate-700 font-medium">{value}</div></div>
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
        <button onClick={() => onCopy(value)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
