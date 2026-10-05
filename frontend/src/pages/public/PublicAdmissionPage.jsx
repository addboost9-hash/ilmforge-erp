/**
 * IlmForge — online admission form for one school.
 *
 *   /s/<slug>/apply      (and the older /apply-admission?slug=<slug>)
 *
 * The school comes from the link, never from a guess: the form shows that
 * school's name, logo, campuses and classes, and the application is saved
 * to that school only (POST /public/admissions/<slug>). The office sees it
 * at once in the admin bell and under Admissions › Admission Inquiries.
 *
 * It used to post to an endpoint that requires a signed-in finance user, so
 * no application from this page ever arrived — at any school.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Send, RefreshCw, Printer } from 'lucide-react';
import api from '../../api/client';
import { useSchoolSlug, usePublicSchool, rememberSchool } from '../../utils/schoolLinks';
import { PublicShell, SchoolNotFound, SchoolLoading } from './PublicShell';

const EMPTY = {
  studentName: '', gender: '', dob: '', classId: '', classInterested: '', campusId: '',
  fatherName: '', fatherPhone: '', fatherCnic: '', fatherEmail: '', address: '',
  previousSchool: '', message: '', website: '',
};

const newSum = () => {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 9);
  return { a, b };
};

/* Same rules the server applies, so most mistakes are caught before sending. */
function check(f, { hasClasses, campusCount }) {
  const e = {};
  if (f.studentName.trim().length < 2) e.studentName = "Enter the student's full name.";
  if (!f.fatherName.trim()) e.fatherName = "Enter the father's or guardian's name.";
  const core = f.fatherPhone.replace(/\D/g, '').slice(-10);
  if (!/^3\d{9}$/.test(core)) e.fatherPhone = 'Enter a mobile number like 03001234567.';
  if (hasClasses ? !f.classId : !f.classInterested.trim()) e.classId = 'Choose the class you are applying for.';
  if (campusCount > 1 && !f.campusId) e.campusId = 'Choose a campus.';
  const cnic = f.fatherCnic.replace(/\D/g, '');
  if (cnic && cnic.length !== 13) e.fatherCnic = 'CNIC must have 13 digits.';
  if (f.fatherEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.fatherEmail.trim())) e.fatherEmail = 'Enter a valid email address, or leave it empty.';
  return e;
}

const fmtCnic = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

/* Map the server's field names onto this form's. */
const SERVER_FIELD = { phone: 'fatherPhone', email: 'fatherEmail', cnic: 'fatherCnic' };

/* Declared at module level: a component defined inside the page would be a
   new type on every render, and each keystroke would remount the input. */
function Field({ name, label, req, hint, span2, error, children }) {
  return (
    <div className={`ps-field ${span2 ? 'span-2' : ''} ${error ? 'has-error' : ''}`} data-field={name}>
      <label className="ps-label" htmlFor={`f-${name}`}>{label}{req && <span className="req" aria-hidden="true">*</span>}</label>
      {children}
      {error ? <span className="ps-error" id={`e-${name}`}>{error}</span> : hint ? <span className="ps-hint">{hint}</span> : null}
    </div>
  );
}

export default function PublicAdmissionPage() {
  const { slug, fromUrl } = useSchoolSlug();
  const { data: school, isLoading, isError } = usePublicSchool(slug);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sum, setSum] = useState(newSum);
  const [answer, setAnswer] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => { if (school && fromUrl) rememberSchool(school); }, [school, fromUrl]);
  useEffect(() => { if (school?.name) document.title = `Admission — ${school.name}`; }, [school?.name]);

  const classes = school?.classes || [];
  const campuses = school?.campuses || [];
  const hasClasses = classes.length > 0;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (!slug) return <SchoolNotFound missing then="/apply" />;
  if (isLoading) return <SchoolLoading />;
  if (isError || !school) return <SchoolNotFound then="/apply" />;

  const schoolPage = { to: `/s/${encodeURIComponent(school.slug)}`, label: 'School page' };
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    setProblem('');
    const found = check(form, { hasClasses, campusCount: campuses.length });
    if (String(sum.a + sum.b) !== answer.trim()) found.captcha = 'That answer is not right. Please try again.';
    setErrors(found);
    if (Object.keys(found).length) {
      const first = document.querySelector(`[data-field="${Object.keys(found)[0]}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post(`/public/admissions/${encodeURIComponent(school.slug)}`, form, { silent: true });
      setDone({ ...data.data, studentName: form.studentName, phone: form.fatherPhone });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const res = err.response?.data;
      if (res?.errors) {
        const mapped = {};
        for (const [k, v] of Object.entries(res.errors)) mapped[SERVER_FIELD[k] || k] = v;
        setErrors(mapped);
      }
      setProblem(res?.message || (err.response ? 'The application could not be sent. Please try again.' : 'Could not reach the school’s server. Check your internet connection and try again.'));
      setSum(newSum()); setAnswer('');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <PublicShell school={school} title="Admission application" back={schoolPage} narrow>
        <section className="ps-card ps-success" aria-live="polite">
          <span className="ps-success-mark"><CheckCircle2 size={38} /></span>
          <h1 style={{ fontSize: 22 }}>{done.duplicate ? 'Already received' : 'Application received'}</h1>
          <p style={{ margin: 0, color: 'var(--ps-muted)', lineHeight: 1.6 }}>
            {done.duplicate
              ? `${school.name} already has this application. You do not need to send it again.`
              : `Thank you. ${school.name} has received the application for ${done.studentName} and will contact you on ${done.phone}.`}
          </p>
          <div>
            <div className="ps-hint" style={{ marginBottom: 6 }}>Your reference number</div>
            <div className="ps-ref">{done.reference}</div>
          </div>
          <p className="ps-hint" style={{ margin: 0 }}>Keep this number. Quote it when you call or visit the school.</p>
          {done.schoolPhone && <p style={{ margin: 0, fontSize: 14 }}>School phone: <strong className="ps-select">{done.schoolPhone}</strong></p>}
          <div className="ps-row">
            <button type="button" className="ps-btn is-ghost" onClick={() => window.print()}><Printer size={16} /> Print</button>
            <button type="button" className="ps-btn is-ghost" onClick={() => { setDone(null); setForm({ ...EMPTY, fatherName: form.fatherName, fatherPhone: form.fatherPhone, fatherCnic: form.fatherCnic, fatherEmail: form.fatherEmail, address: form.address }); setSum(newSum()); setAnswer(''); }}>
              Apply for another child
            </button>
            <Link to={schoolPage.to} className="ps-btn">Back to school page</Link>
          </div>
        </section>
      </PublicShell>
    );
  }

  const inputProps = (name) => ({
    id: `f-${name}`,
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `e-${name}` : undefined,
  });

  return (
    <PublicShell school={school} title="Apply for admission" back={schoolPage} narrow>
      <section className="ps-card">
        <h1 style={{ fontSize: 21, marginBottom: 4 }}>Admission application</h1>
        <p style={{ margin: 0, color: 'var(--ps-muted)', fontSize: 14 }}>
          Fill this form and {school.name} will contact you. Fields marked <span style={{ color: 'var(--ps-error)' }}>*</span> are required.
        </p>
      </section>

      <form className="ps-card ps-form" onSubmit={submit} noValidate>
        {problem && <div className="ps-alert" role="alert">{problem}</div>}

        <div className="ps-section">
          <div className="ps-section-title">Student</div>
          <div className="ps-grid">
            <Field name="studentName" error={errors.studentName} label="Student's full name" req span2>
              <input className="ps-input" {...inputProps('studentName')} autoComplete="off" value={form.studentName} onChange={(e) => set('studentName', e.target.value)} placeholder="e.g. Ayesha Khan" />
            </Field>
            <Field name="gender" error={errors.gender} label="Gender">
              <select className="ps-select-input" {...inputProps('gender')} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
              </select>
            </Field>
            <Field name="dob" error={errors.dob} label="Date of birth">
              <input type="date" className="ps-input" {...inputProps('dob')} max={today} value={form.dob} onChange={(e) => set('dob', e.target.value)} />
            </Field>
            <Field name="classId" error={errors.classId} label="Class applying for" req>
              {hasClasses ? (
                <select className="ps-select-input" {...inputProps('classId')} value={form.classId} onChange={(e) => set('classId', e.target.value)}>
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input className="ps-input" {...inputProps('classId')} value={form.classInterested} onChange={(e) => { set('classInterested', e.target.value); set('classId', ''); }} placeholder="e.g. Class 5, KG, Nursery" />
              )}
            </Field>
            {campuses.length > 1 && (
              <Field name="campusId" error={errors.campusId} label="Campus" req>
                <select className="ps-select-input" {...inputProps('campusId')} value={form.campusId} onChange={(e) => set('campusId', e.target.value)}>
                  <option value="">Select campus</option>
                  {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            <Field name="previousSchool" error={errors.previousSchool} label="Previous school" hint="Leave empty if this is the first school." span2={campuses.length <= 1}>
              <input className="ps-input" {...inputProps('previousSchool')} value={form.previousSchool} onChange={(e) => set('previousSchool', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="ps-section">
          <div className="ps-section-title">Parent / guardian</div>
          <div className="ps-grid">
            <Field name="fatherName" error={errors.fatherName} label="Father / guardian name" req>
              <input className="ps-input" {...inputProps('fatherName')} autoComplete="name" value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} />
            </Field>
            <Field name="fatherPhone" error={errors.fatherPhone} label="Mobile number" req hint="The school will call or WhatsApp this number.">
              <input className="ps-input" {...inputProps('fatherPhone')} inputMode="tel" autoComplete="tel" value={form.fatherPhone} onChange={(e) => set('fatherPhone', e.target.value)} placeholder="03001234567" />
            </Field>
            <Field name="fatherCnic" error={errors.fatherCnic} label="CNIC">
              <input className="ps-input" {...inputProps('fatherCnic')} inputMode="numeric" value={form.fatherCnic} onChange={(e) => set('fatherCnic', fmtCnic(e.target.value))} placeholder="35202-1234567-1" />
            </Field>
            <Field name="fatherEmail" error={errors.fatherEmail} label="Email">
              <input type="email" className="ps-input" {...inputProps('fatherEmail')} autoComplete="email" value={form.fatherEmail} onChange={(e) => set('fatherEmail', e.target.value)} />
            </Field>
            <Field name="address" error={errors.address} label="Home address" span2>
              <input className="ps-input" {...inputProps('address')} autoComplete="street-address" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field name="message" error={errors.message} label="Anything the school should know?" span2>
              <textarea className="ps-textarea" {...inputProps('message')} value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={500} />
            </Field>
          </div>
        </div>

        {/* Hidden from people; form-filling bots fill it and are ignored. */}
        <div className="ps-honey" aria-hidden="true">
          <label htmlFor="f-website">Website</label>
          <input id="f-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
        </div>

        <div className={`ps-field ${errors.captcha ? 'has-error' : ''}`} data-field="captcha">
          <label className="ps-label" htmlFor="f-captcha">Quick check: what is {sum.a} + {sum.b}?<span className="req" aria-hidden="true">*</span></label>
          <div className="ps-captcha">
            <span className="ps-captcha-q" aria-hidden="true">{sum.a} + {sum.b} =</span>
            <input id="f-captcha" className="ps-input" style={{ width: 110 }} inputMode="numeric" value={answer} onChange={(e) => { setAnswer(e.target.value); setErrors((x) => ({ ...x, captcha: undefined })); }} aria-invalid={errors.captcha ? 'true' : undefined} />
            <button type="button" className="ps-btn is-ghost" onClick={() => { setSum(newSum()); setAnswer(''); }} aria-label="New question">
              <RefreshCw size={15} />
            </button>
          </div>
          {errors.captcha && <span className="ps-error">{errors.captcha}</span>}
        </div>

        <button type="submit" className="ps-btn is-block" disabled={sending}>
          <Send size={17} /> {sending ? 'Sending…' : 'Send application'}
        </button>
        <p className="ps-hint" style={{ margin: 0, textAlign: 'center' }}>
          Your details go only to {school.name}.
        </p>
      </form>
    </PublicShell>
  );
}
