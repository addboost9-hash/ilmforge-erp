/**
 * Checks and tidies an online admission application before it is saved as an
 * AdmissionInquiry. Kept free of the database so it can be tested directly.
 *
 *   parseApplication(body, { classes, campuses, today })
 *     -> { errors: { field: message }, value }
 *
 * `classes` and `campuses` are the school's own rows ({ id, name }); a class
 * or campus id from another school is rejected rather than trusted.
 */
const phoneUtil = require('./phone');

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const GENDERS = { male: 'Male', female: 'Female', boy: 'Male', girl: 'Female', m: 'Male', f: 'Female' };

const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

function parseApplication(body = {}, { classes = [], campuses = [], today = new Date() } = {}) {
  const errors = {};
  const value = {};

  value.studentName = clean(body.studentName ?? body.name, 80);
  if (value.studentName.length < 2) errors.studentName = "Enter the student's full name.";

  value.fatherName = clean(body.fatherName, 80);
  if (!value.fatherName) errors.fatherName = "Enter the father's or guardian's name.";

  const core = phoneUtil.core(body.fatherPhone ?? body.phone);
  if (core.length !== 10 || !/^3\d{9}$/.test(core)) {
    errors.fatherPhone = 'Enter a mobile number like 03001234567.';
  } else {
    value.phone = `0${core}`;
  }

  const g = clean(body.gender, 10).toLowerCase();
  value.gender = GENDERS[g] || '';

  if (body.dob) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(body.dob).trim());
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    const valid = d && d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
    const age = valid ? (today - d) / (365.25 * 86400000) : -1;
    if (!valid || age < 1 || age > 25) errors.dob = 'Enter a real date of birth.';
    else value.dob = fmtDate(d);
  }

  const classId = parseInt(body.classId, 10);
  if (Number.isFinite(classId)) {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) errors.classId = 'Choose a class from the list.';
    else { value.classId = cls.id; value.classInterested = cls.name; }
  } else {
    value.classInterested = clean(body.classInterested, 60);
  }
  if (!value.classInterested && !errors.classId) errors.classId = 'Choose the class you are applying for.';

  const campusId = parseInt(body.campusId, 10);
  if (Number.isFinite(campusId)) {
    const campus = campuses.find((c) => c.id === campusId);
    if (!campus) errors.campusId = 'Choose a campus from the list.';
    else { value.campusId = campus.id; value.campusName = campus.name; }
  } else if (campuses.length === 1) {
    value.campusId = campuses[0].id; value.campusName = campuses[0].name;
  }

  value.email = clean(body.fatherEmail ?? body.email, 120).toLowerCase();
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email)) errors.email = 'Enter a valid email address, or leave it empty.';

  const cnicDigits = String(body.fatherCnic ?? body.cnic ?? '').replace(/\D/g, '');
  if (cnicDigits) {
    if (cnicDigits.length !== 13) errors.cnic = 'CNIC must have 13 digits.';
    else value.cnic = `${cnicDigits.slice(0, 5)}-${cnicDigits.slice(5, 12)}-${cnicDigits.slice(12)}`;
  }

  value.address = clean(body.address, 300);
  value.previousSchool = clean(body.previousSchool, 120);
  value.message = clean(body.message, 500);

  return { errors, value };
}

/** The inquiry's notes: everything the office needs, one fact per line. */
function applicationNotes(v) {
  return [
    'Source: Online admission form',
    v.fatherName && `Father / guardian: ${v.fatherName}`,
    v.gender && `Gender: ${v.gender}`,
    v.dob && `Date of birth: ${v.dob}`,
    v.campusName && `Campus: ${v.campusName}`,
    v.cnic && `Father CNIC: ${v.cnic}`,
    v.email && `Email: ${v.email}`,
    v.address && `Address: ${v.address}`,
    v.previousSchool && `Previous school: ${v.previousSchool}`,
    v.message && `Message: ${v.message}`,
  ].filter(Boolean).join('\n');
}

const reference = (id) => `ADM-${String(id).padStart(5, '0')}`;

module.exports = { parseApplication, applicationNotes, reference };
