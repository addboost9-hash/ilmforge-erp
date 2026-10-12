/**
 * Edit a student's record: every field of the admission form, class and
 * section, photo.
 *
 * One form used everywhere a record is fixed: the student list (search by
 * class or name), the student profile, the admission form page, the
 * admission wizard's last step and the list of students just imported from
 * Excel. The server checks every field (studentUpdate.js) and the messages
 * it returns appear next to the field they belong to.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Save, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import StudentPhotoButton from './StudentPhotoButton';

const NAVY = '#1B2F6E';
// The day in Pakistan: an admission saved at 1 a.m. is still that day.
const dateInput = (d) => (d ? new Date(new Date(d).getTime() + 5 * 3600000).toISOString().slice(0, 10) : '');
const genderValue = (g) => { const v = String(g || '').toLowerCase(); return v === 'male' ? 'Male' : v === 'female' ? 'Female' : v === 'other' ? 'Other' : ''; };

/* The same lists the admission wizard offers. */
const LISTS = {
  gender: [['', 'Not specified'], ['Male', 'Male'], ['Female', 'Female'], ['Other', 'Other']],
  status: [['active', 'Active'], ['inactive', 'Left school (inactive)'], ['passout', 'Passed out']],
  qualification: ['Matric', 'Intermediate', 'Bachelor', 'Master', 'PhD', 'Other', 'None'],
  nationality: ['Pakistani', 'Afghan', 'Iranian', 'Indian', 'Other'],
  province: ['ICT', 'Punjab', 'Sindh', 'KPK', 'Balochistan', 'AJK', 'GB'],
  religion: ['Islam', 'Christianity', 'Hinduism', 'Sikhism', 'Other'],
  bloodGroup: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
};

const TABS = [
  { id: 'student', label: 'Student' },
  { id: 'admission', label: 'Admission & class' },
  { id: 'parents', label: 'Father & mother' },
  { id: 'contact', label: 'Contact & address' },
  { id: 'previous', label: 'Previous school' },
  { id: 'health', label: 'Health' },
];

/* Every field of the admission form: [key, label, tab, kind, options]. */
const FIELDS = [
  ['name', "Student's first name *", 'student'],
  ['lastName', 'Last name', 'student'],
  ['firstNameUrdu', 'First name (Urdu)', 'student', 'urdu'],
  ['lastNameUrdu', 'Last name (Urdu)', 'student', 'urdu'],
  ['gender', 'Gender', 'student', 'select', LISTS.gender],
  ['dob', 'Date of birth', 'student', 'date'],
  ['bFormNo', 'B-Form / CNIC', 'student', 'text', { placeholder: '35202-1234567-1', inputMode: 'numeric' }],
  ['religion', 'Religion', 'student', 'choice', LISTS.religion],
  ['caste', 'Caste', 'student'],
  ['nationality', 'Nationality', 'student', 'choice', LISTS.nationality],

  ['classId', 'Class', 'admission', 'class'],
  ['sectionId', 'Section', 'admission', 'section'],
  ['rollNo', 'Roll number', 'admission'],
  ['status', 'Status', 'admission', 'select', LISTS.status],
  ['familyNo', 'Family number', 'admission'],
  ['admissionDate', 'Admission date', 'admission', 'date'],
  ['admissionTestMarks', 'Admission test marks', 'admission', 'text', { inputMode: 'decimal' }],
  ['isFreeStudent', 'Free student (no fee)', 'admission', 'check'],

  ['fatherName', "Father's name", 'parents'],
  ['fatherNameUrdu', "Father's name (Urdu)", 'parents', 'urdu'],
  ['fatherCnic', "Father's CNIC", 'parents', 'text', { placeholder: '35202-1234567-1', inputMode: 'numeric' }],
  ['fatherQualification', "Father's qualification", 'parents', 'choice', LISTS.qualification],
  ['fatherOccupation', "Father's occupation", 'parents'],
  ['motherName', "Mother's name", 'parents'],
  ['motherCnic', "Mother's CNIC", 'parents', 'text', { placeholder: '35202-1234567-1', inputMode: 'numeric' }],
  ['motherQualification', "Mother's qualification", 'parents', 'choice', LISTS.qualification],
  ['motherOccupation', "Mother's occupation", 'parents'],
  ['motherPhone', "Mother's mobile", 'parents', 'tel'],

  ['emergencyPhone', "Parent's mobile number", 'contact', 'tel'],
  ['email', "Student's email", 'contact', 'email'],
  ['parentEmail', "Parent's email", 'contact', 'email'],
  ['parentCnic', "Parent account CNIC", 'contact', 'text', { placeholder: '35202-1234567-1', inputMode: 'numeric' }],
  ['province', 'Province', 'contact', 'choice', LISTS.province],
  ['city', 'City', 'contact'],
  ['postalAddress', 'Postal address', 'contact', 'wide'],
  ['address', 'Permanent address', 'contact', 'wide'],

  ['prevSchoolName', 'Previous school', 'previous'],
  ['prevSchoolFocalPerson', 'Contact person there', 'previous'],
  ['prevSchoolPhone', "School's phone", 'previous', 'tel'],
  ['prevAdmissionNo', 'Admission number there', 'previous'],
  ['prevGrade', 'Last class passed', 'previous'],
  ['prevTestGrade', 'Grade / result', 'previous'],
  ['prevSchoolAddress', "School's address", 'previous', 'wide'],

  ['bloodGroup', 'Blood group', 'health', 'choice', LISTS.bloodGroup],
  ['foodDietaryReq', 'Food / diet needs', 'health', 'wide'],
  ['allergies', 'Allergies', 'health', 'wide'],
  ['childCondition', 'Medical condition / notes', 'health', 'wide'],
];
const TAB_OF = Object.fromEntries(FIELDS.map(([k, , tab]) => [k, tab]));

/* The record as form values (strings, and a boolean for the tick box). */
function formValues(s) {
  const v = {};
  FIELDS.forEach(([k, , , kind]) => {
    if (kind === 'check') v[k] = !!s[k];
    else if (kind === 'date') v[k] = dateInput(s[k]);
    else if (kind === 'class' || kind === 'section') v[k] = s[k] ? String(s[k]) : '';
    else v[k] = s[k] === null || s[k] === undefined ? '' : String(s[k]);
  });
  v.gender = genderValue(s.gender);
  v.status = s.status || 'active';
  v.parentEmail = s.parentInfo?.email || '';
  v.parentCnic = s.parentInfo?.cnic || '';
  return v;
}

/* Lists carry only some fields (no address, mother's name...). The form
   loads the full record first, so nothing shows blank that is not blank. */
export default function EditStudentModal({ student: partial, onClose, onSaved, initialTab }) {
  const { data: full, isLoading, isError } = useQuery({
    queryKey: ['student', String(partial.id)],
    queryFn: () => api.get(`/students/${partial.id}`).then((r) => r.data.data),
    staleTime: 0,
  });
  // Once loaded, a failed background refresh must not close an open form.
  if (!full) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'grid', placeItems: 'center', padding: 16 }} onClick={onClose}>
        <div role="dialog" aria-modal="true" aria-label="Edit student" onClick={(e) => e.stopPropagation()}
          style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 260, textAlign: 'center' }}>
          {isError && !isLoading
            ? <><p style={{ marginBottom: 12 }}>The record could not be loaded.</p><button className="btn btn-outline" onClick={onClose}>Close</button></>
            : <><div className="spinner" style={{ margin: '0 auto 10px' }} />Loading {partial.name}…</>}
        </div>
      </div>
    );
  }
  return <EditStudentForm student={full} onClose={onClose} onSaved={onSaved} initialTab={initialTab} />;
}

function EditStudentForm({ student, onClose, onSaved, initialTab }) {
  const qc = useQueryClient();
  const original = useMemo(() => formValues(student), [student]);
  const [form, setForm] = useState(original);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState(initialTab || 'student');
  const hasParent = !!student.parentInfo;

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-for-edit'],
    queryFn: () => api.get('/classes').then((r) => r.data.data || []),
    staleTime: 5 * 60_000,
  });
  const sections = useMemo(() => classes.find((c) => String(c.id) === form.classId)?.sections || [], [classes, form.classId]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const changed = (k) => form[k] !== original[k];

  const save = useMutation({
    mutationFn: () => {
      // Send only what changed, so an untouched field can never fail a save.
      const body = {};
      Object.keys(form).forEach((k) => { if (changed(k)) body[k] = form[k]; });
      if (body.classId !== undefined && body.sectionId === undefined) body.sectionId = form.sectionId || null;
      if (!Object.keys(body).length) return Promise.resolve({ data: { unchanged: true } });
      return api.put(`/students/${student.id}`, body);
    },
    onSuccess: (res) => {
      if (res.data?.unchanged) { onClose(); return; }
      toast.success(`${form.name || 'Student'} updated.`);
      const pl = res.data?.parentLogin;
      if (pl?.changed) toast(`The parent now signs in with ${pl.phone}.`, { icon: '📱', duration: 6000 });
      else if (pl?.reason) toast(pl.reason, { icon: 'ℹ️', duration: 7000 });
      qc.invalidateQueries({ predicate: (q) => /student|class-sections|idcard|card|certificate|admission/i.test(String(q.queryKey?.[0] || '')) });
      onSaved && onSaved(res.data?.data);
      onClose();
    },
    onError: (err) => {
      const d = err.response?.data;
      if (d?.errors) {
        setErrors(d.errors);
        // Show the tab where the first problem is.
        const first = Object.keys(d.errors).find((k) => TAB_OF[k]);
        if (first) setTab(TAB_OF[first]);
      }
      toast.error(d?.message || 'The record could not be saved.');
    },
  });

  const errorText = (k) => errors[k] && <div style={{ color: '#B91C1C', fontSize: 12, marginTop: 3, fontWeight: 600 }}>{errors[k]}</div>;
  const bad = (k) => (errors[k] ? { borderColor: '#DC2626' } : undefined);

  const renderField = ([key, label, , kind = 'text', opt]) => {
    if ((key === 'parentEmail' || key === 'parentCnic') && !hasParent) return null;
    const id = `es-${key}`;
    const wrap = (control, wide) => (
      <div key={key} className="form-group" style={{ marginBottom: 12, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
        <label className="form-label" htmlFor={id}>{label}{changed(key) && <span style={{ color: '#0D9488', fontWeight: 700 }}> · changed</span>}</label>
        {control}
        {errorText(key)}
      </div>
    );
    const common = { id, 'aria-invalid': errors[key] ? 'true' : undefined, style: bad(key) };

    if (kind === 'check') {
      return (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 12, alignSelf: 'end', minHeight: 38 }}>
          <input id={id} type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} /> {label}
          {changed(key) && <span style={{ color: '#0D9488', fontWeight: 700 }}>· changed</span>}
        </label>
      );
    }
    if (kind === 'select' || kind === 'choice') {
      // A value from an import that is not in the list stays selectable.
      const list = kind === 'select' ? opt : [['', 'Not specified'], ...opt.map((o) => [o, o])];
      const items = form[key] && !list.some(([v]) => v === form[key]) ? [...list, [form[key], form[key]]] : list;
      return wrap(
        <select className="form-select" value={form[key]} onChange={(e) => set(key, e.target.value)} {...common}>
          {items.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>,
      );
    }
    if (kind === 'class') {
      return wrap(
        <select className="form-select" value={form.classId} onChange={(e) => { set('classId', e.target.value); set('sectionId', ''); }} {...common}>
          <option value="">{classes.length ? 'Choose class' : 'Loading…'}</option>
          {classes.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>,
      );
    }
    if (kind === 'section') {
      return wrap(
        <select className="form-select" value={form.sectionId} onChange={(e) => set('sectionId', e.target.value)} {...common}>
          <option value="">{sections.length ? 'No section' : '—'}</option>
          {sections.map((sec) => <option key={sec.id} value={String(sec.id)}>{sec.name}</option>)}
        </select>,
      );
    }
    const type = kind === 'date' ? 'date' : kind === 'tel' ? 'tel' : kind === 'email' ? 'email' : 'text';
    const extra = kind === 'tel' ? { placeholder: '03001234567', inputMode: 'tel' }
      : kind === 'urdu' ? { dir: 'rtl', lang: 'ur' }
      : (opt && !Array.isArray(opt) ? opt : {});
    return wrap(
      <input className="form-input" type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} {...common} {...extra} />,
      kind === 'wide',
    );
  };

  const tabState = (id) => {
    const keys = FIELDS.filter(([, , t]) => t === id).map(([k]) => k);
    return { error: keys.some((k) => errors[k]), edited: keys.some((k) => changed(k)) };
  };
  const editedCount = Object.keys(form).filter(changed).length;
  const rollChanged = changed('rollNo');
  const phoneChanged = changed('emergencyPhone');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-student-title" onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 780, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ background: `linear-gradient(135deg, ${NAVY}, #0073b7)`, color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span id="edit-student-title" style={{ fontWeight: 700, fontSize: 15 }}>Edit student — {student.name}{student.rollNo ? ` (${student.rollNo})` : ''}</span>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Sections of the admission form */}
        <div role="tablist" aria-label="Parts of the admission form" style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, padding: '8px 12px 0', borderBottom: '1px solid #E5E7EB', overflowX: 'auto', flexShrink: 0 }}>
          {TABS.map((t) => {
            const st = tabState(t.id);
            const on = tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 12px', border: 0, borderBottom: `2px solid ${on ? NAVY : 'transparent'}`, background: 'none',
                  color: on ? NAVY : '#64748B', fontWeight: on ? 700 : 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                {t.label}
                {st.error ? <span title="Needs a fix" style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC2626' }} />
                  : st.edited ? <span title="Changed" style={{ width: 7, height: 7, borderRadius: '50%', background: '#0D9488' }} /> : null}
              </button>
            );
          })}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
            {tab === 'student' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: 12, background: '#F8FAFC', borderRadius: 10 }}>
                <StudentPhotoButton student={student} size={56} />
                <span style={{ fontSize: 12.5, color: '#64748B' }}>The photo is saved straight away and appears on the ID card, certificates, admission form and portal.</span>
              </div>
            )}
            {tab === 'contact' && !hasParent && (
              <div style={{ fontSize: 12.5, color: '#64748B', background: '#F8FAFC', borderRadius: 8, padding: '8px 11px', marginBottom: 12 }}>
                This student has no parent account, so there is no parent email or CNIC to correct here.
              </div>
            )}

            <div role="tabpanel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 14px' }}>
              {FIELDS.filter(([, , t]) => t === tab).map(renderField)}
            </div>

            {tab === 'contact' && hasParent && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: -4 }}>
                The parent's email and CNIC are on the parent account, so a change also shows for this student's brothers and sisters.
              </div>
            )}

            {(rollChanged || phoneChanged) && (
              <div role="note" style={{ display: 'flex', gap: 8, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '9px 11px', fontSize: 12.5, color: '#92400E', marginTop: 8 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  {rollChanged && 'The student will sign in with the new roll number, and new fee slips will show it. '}
                  {phoneChanged && "The parent will sign in with the new mobile number from now on."}
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ marginRight: 'auto', fontSize: 12.5, color: editedCount ? '#0D9488' : '#94A3B8', fontWeight: 600 }}>
              {editedCount ? `${editedCount} field${editedCount === 1 ? '' : 's'} changed` : 'No changes yet'}
            </span>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={save.isPending || !form.name.trim()}>
              <Save size={14} /> {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
