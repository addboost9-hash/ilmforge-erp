/**
 * Checks and tidies the fields of a student edit before it is saved, so a
 * mistake is explained instead of stored (or crashing the save):
 *
 *   normalizeStudentUpdate(body, { today }) -> { errors: { field: msg }, data }
 *
 * Only fields present in `body` are returned in `data`; an empty string
 * clears an optional field. Database checks (class belongs to the school,
 * roll number not taken, parent login phone) are done by the route.
 */
const phoneUtil = require('./phone');

const GENDERS = { male: 'Male', m: 'Male', boy: 'Male', female: 'Female', f: 'Female', girl: 'Female', other: 'Other' };
const STATUSES = ['active', 'inactive', 'passout', 'left', 'withdrawn'];
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined;
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function cnicLike(raw, field, label, errors) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 13) { errors[field] = `${label} must have 13 digits.`; return undefined; }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function normalizeStudentUpdate(body = {}, { today = new Date() } = {}) {
  const errors = {};
  const data = {};

  if (has(body, 'name')) {
    const v = text(body.name, 100);
    if (v.length < 2) errors.name = "Enter the student's full name.";
    else data.name = v;
  }
  for (const k of ['fatherName', 'motherName', 'address', 'religion', 'city', 'postalAddress', 'prevSchoolName']) {
    if (has(body, k)) data[k] = text(body[k], k === 'address' || k === 'postalAddress' ? 300 : 100) || null;
  }

  if (has(body, 'gender')) {
    const g = text(body.gender, 10).toLowerCase();
    if (!g) data.gender = null;
    else if (GENDERS[g]) data.gender = GENDERS[g];
    else errors.gender = 'Choose Male or Female.';
  }

  if (has(body, 'dob')) {
    const raw = text(body.dob, 30);
    if (!raw) data.dob = null;
    else {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
      // UTC midnight, like admissions and the Excel import: local midnight
      // on a Pakistan-time server is the previous day in UTC, so the form
      // showed the day before after every save.
      const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date(raw);
      const age = (today - d) / (365.25 * 86400000);
      if (Number.isNaN(d.getTime()) || age < 1 || age > 30) errors.dob = 'Enter a real date of birth.';
      else data.dob = d;
    }
  }

  if (has(body, 'emergencyPhone')) {
    const raw = text(body.emergencyPhone, 20);
    if (!raw) data.emergencyPhone = null;
    else {
      const core = phoneUtil.core(raw);
      if (core.length !== 10 || !/^3\d{9}$/.test(core)) errors.emergencyPhone = 'Enter a mobile number like 03001234567.';
      else data.emergencyPhone = `0${core}`;
    }
  }
  if (has(body, 'motherPhone')) {
    const raw = text(body.motherPhone, 20);
    if (!raw) data.motherPhone = null;
    else {
      const core = phoneUtil.core(raw);
      if (core.length !== 10) errors.motherPhone = 'Enter a mobile number like 03001234567.';
      else data.motherPhone = `0${core}`;
    }
  }

  if (has(body, 'bFormNo')) {
    const v = cnicLike(body.bFormNo, 'bFormNo', 'B-Form / CNIC', errors);
    if (v !== undefined) data.bFormNo = v;
  }
  if (has(body, 'fatherCnic')) {
    const v = cnicLike(body.fatherCnic, 'fatherCnic', "Father's CNIC", errors);
    if (v !== undefined) data.fatherCnic = v;
  }

  if (has(body, 'email')) {
    const v = text(body.email, 120).toLowerCase();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors.email = 'Enter a valid email address, or leave it empty.';
    else data.email = v || null;
  }

  if (has(body, 'status')) {
    const v = text(body.status, 20).toLowerCase();
    if (!STATUSES.includes(v)) errors.status = 'Choose a valid status.';
    else data.status = v;
  }

  if (has(body, 'rollNo')) {
    const v = text(body.rollNo, 40);
    if (!v) errors.rollNo = 'A roll number is needed: students sign in with it.';
    else data.rollNo = v;
  }

  return { errors, data };
}

module.exports = { normalizeStudentUpdate, STATUSES };
