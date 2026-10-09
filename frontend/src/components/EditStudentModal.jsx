/**
 * Edit a student's record: details, class and section, photo.
 *
 * One form used everywhere a record is fixed: the student list (search by
 * class or name), the student profile, and the list of students just
 * imported from Excel. The server checks every field (studentUpdate.js) and
 * the messages it returns appear next to the field they belong to.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Save, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import StudentPhotoButton from './StudentPhotoButton';

const NAVY = '#1B2F6E';
const dateInput = (d) => (d ? String(d).split('T')[0] : '');
const genderValue = (g) => { const v = String(g || '').toLowerCase(); return v === 'male' ? 'Male' : v === 'female' ? 'Female' : v === 'other' ? 'Other' : ''; };

/* Lists carry only some fields (no address, mother's name...). The form
   loads the full record first, so nothing shows blank that is not blank. */
export default function EditStudentModal({ student: partial, onClose, onSaved }) {
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
  return <EditStudentForm student={full} onClose={onClose} onSaved={onSaved} />;
}

function EditStudentForm({ student, onClose, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: student.name || '',
    fatherName: student.fatherName || '',
    motherName: student.motherName || '',
    gender: genderValue(student.gender),
    dob: dateInput(student.dob),
    classId: student.classId ? String(student.classId) : '',
    sectionId: student.sectionId ? String(student.sectionId) : '',
    rollNo: student.rollNo || '',
    emergencyPhone: student.emergencyPhone || '',
    bFormNo: student.bFormNo || '',
    address: student.address || '',
    status: student.status || 'active',
  });
  const [errors, setErrors] = useState({});

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-for-edit'],
    queryFn: () => api.get('/classes').then((r) => r.data.data || []),
    staleTime: 5 * 60_000,
  });
  const sections = useMemo(() => classes.find((c) => String(c.id) === form.classId)?.sections || [], [classes, form.classId]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const save = useMutation({
    mutationFn: () => {
      // Send only what changed, so an untouched field can never fail a save.
      const original = {
        name: student.name || '', fatherName: student.fatherName || '', motherName: student.motherName || '',
        gender: genderValue(student.gender), dob: dateInput(student.dob),
        classId: student.classId ? String(student.classId) : '', sectionId: student.sectionId ? String(student.sectionId) : '',
        rollNo: student.rollNo || '', emergencyPhone: student.emergencyPhone || '', bFormNo: student.bFormNo || '',
        address: student.address || '', status: student.status || 'active',
      };
      const body = {};
      Object.keys(form).forEach((k) => { if (form[k] !== original[k]) body[k] = form[k]; });
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
      qc.invalidateQueries({ predicate: (q) => /student|class-sections|idcard|card|certificate/i.test(String(q.queryKey?.[0] || '')) });
      onSaved && onSaved(res.data?.data);
      onClose();
    },
    onError: (err) => {
      const d = err.response?.data;
      if (d?.errors) setErrors(d.errors);
      toast.error(d?.message || 'The record could not be saved.');
    },
  });

  const field = (label, key, type = 'text', extra = {}) => (
    <div className="form-group" style={{ marginBottom: 12 }}>
      <label className="form-label" htmlFor={`es-${key}`}>{label}</label>
      <input id={`es-${key}`} className="form-input" type={type} value={form[key]} onChange={(e) => set(key, e.target.value)}
        aria-invalid={errors[key] ? 'true' : undefined} style={errors[key] ? { borderColor: '#DC2626' } : undefined} {...extra} />
      {errors[key] && <div style={{ color: '#B91C1C', fontSize: 12, marginTop: 3, fontWeight: 600 }}>{errors[key]}</div>}
    </div>
  );
  const select = (label, key, options, extra = {}) => (
    <div className="form-group" style={{ marginBottom: 12 }}>
      <label className="form-label" htmlFor={`es-${key}`}>{label}</label>
      <select id={`es-${key}`} className="form-select" value={form[key]} onChange={(e) => set(key, e.target.value)}
        aria-invalid={errors[key] ? 'true' : undefined} style={errors[key] ? { borderColor: '#DC2626' } : undefined} {...extra}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {errors[key] && <div style={{ color: '#B91C1C', fontSize: 12, marginTop: 3, fontWeight: 600 }}>{errors[key]}</div>}
    </div>
  );

  const rollChanged = form.rollNo !== (student.rollNo || '');
  const phoneChanged = form.emergencyPhone !== (student.emergencyPhone || '');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-student-title" onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ background: `linear-gradient(135deg, ${NAVY}, #0073b7)`, color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span id="edit-student-title" style={{ fontWeight: 700, fontSize: 15 }}>Edit student — {student.name}{student.rollNo ? ` (${student.rollNo})` : ''}</span>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: 12, background: '#F8FAFC', borderRadius: 10 }}>
              <StudentPhotoButton student={student} size={56} />
              <span style={{ fontSize: 12.5, color: '#64748B' }}>The photo is saved straight away and appears on the ID card, certificates, admission form and portal.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 14px' }}>
              {field("Student's full name *", 'name')}
              {field("Father's name", 'fatherName')}
              {field("Mother's name", 'motherName')}
              {field('Date of birth', 'dob', 'date')}
              {select('Gender', 'gender', [{ v: '', l: 'Not specified' }, { v: 'Male', l: 'Male' }, { v: 'Female', l: 'Female' }, { v: 'Other', l: 'Other' }])}
              {select('Status', 'status', [
                { v: 'active', l: 'Active' }, { v: 'inactive', l: 'Left school (inactive)' }, { v: 'passout', l: 'Passed out' },
              ])}
              {select('Class', 'classId', [{ v: '', l: classes.length ? 'Choose class' : 'Loading…' }, ...classes.map((c) => ({ v: String(c.id), l: c.name }))],
                { onChange: (e) => { set('classId', e.target.value); set('sectionId', ''); } })}
              {select('Section', 'sectionId', [{ v: '', l: sections.length ? 'No section' : '—' }, ...sections.map((sec) => ({ v: String(sec.id), l: sec.name }))])}
              {field('Roll number', 'rollNo')}
              {field("Parent's mobile number", 'emergencyPhone', 'tel', { placeholder: '03001234567', inputMode: 'tel' })}
              {field('B-Form / CNIC', 'bFormNo', 'text', { placeholder: '35202-1234567-1', inputMode: 'numeric' })}
            </div>
            {field('Home address', 'address')}

            {(rollChanged || phoneChanged) && (
              <div role="note" style={{ display: 'flex', gap: 8, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '9px 11px', fontSize: 12.5, color: '#92400E' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  {rollChanged && 'The student will sign in with the new roll number, and new fee slips will show it. '}
                  {phoneChanged && "The parent will sign in with the new mobile number from now on."}
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
