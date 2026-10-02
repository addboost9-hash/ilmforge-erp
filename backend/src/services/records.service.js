/**
 * IlmForge — school records in Excel: template, export, import.
 *
 * ONE workbook format serves three jobs:
 *
 *   1. Bulk entry   download the blank template, fill it, import it
 *   2. Export       download this school's classes, students and staff
 *   3. Migration    export from one server, import on another
 *
 * Because the column definitions below drive all three, an exported file is
 * always a valid import file. Records refer to each other by NAME (class
 * "Class 5", section "A", department "Science"), never by database id, so a
 * file moves between servers where every id is different.
 *
 * Imported people go through the same admission and staff-creation code as
 * the forms (services/admission.service.js, services/staff.service.js), so
 * they get real roll numbers, employee codes and portal accounts.
 *
 * Excel quietly damages Pakistani data in predictable ways, handled here:
 *   - phone 03001234567 typed into a number cell loses its leading 0
 *   - a 13-digit CNIC / B-Form becomes 3.52E+12
 *   - dates arrive as Date objects, as serial numbers (45234), or as text,
 *     and text dates here are DAY first: 05/06/2012 is 5 June, not May 6
 * The template formats those columns as text to prevent it, and the parser
 * repairs it anyway for files typed elsewhere.
 */
const ExcelJS = require('exceljs');
const prisma = require('../config/prisma');
const phoneUtil = require('../utils/phone');

/* ═══ Column definitions — the single source of truth ═════════════════ */

const GENDERS = ['Male', 'Female'];
// The admission wizard offers Other for students; the staff form does not.
const STUDENT_GENDERS = ['Male', 'Female', 'Other'];
const STATUSES = ['Active', 'Inactive', 'Passout'];
const ROLES = ['Teacher', 'Accountant', 'Gatekeeper', 'Admin'];
const SALARY_TYPES = ['Monthly', 'Hourly', 'Lecture'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CLASS_COLUMNS = [
  { key: 'className', header: 'Class', required: true, width: 18, example: 'Class 5', aliases: ['class', 'classname', 'name'] },
  { key: 'sections', header: 'Sections', width: 22, example: 'A, B', note: 'Separate with commas', aliases: ['section', 'sections'] },
  { key: 'orderNo', header: 'Order', type: 'number', width: 9, example: 7, note: 'Position in lists; 1 = first', aliases: ['order', 'orderno', 'sort'] },
];

const STUDENT_COLUMNS = [
  { key: 'rollNo', header: 'Roll No', type: 'text', width: 14, example: '', note: 'Leave blank to generate', aliases: ['rollno', 'roll', 'rollnumber', 'admissionno', 'grno'] },
  { key: 'name', header: 'Student Name', required: true, width: 24, example: 'Ayesha Khan', aliases: ['studentname', 'name', 'student'] },
  { key: 'fatherName', header: 'Father Name', required: true, width: 22, example: 'Imran Khan', aliases: ['fathername', 'father', 'guardianname'] },
  { key: 'gender', header: 'Gender', list: STUDENT_GENDERS, width: 10, example: 'Female', aliases: ['gender', 'sex'] },
  { key: 'dob', header: 'Date of Birth', type: 'date', width: 14, example: '14/03/2014', note: 'DD/MM/YYYY', aliases: ['dateofbirth', 'dob', 'birthdate', 'birth'] },
  { key: 'bFormNo', header: 'B-Form No', type: 'text', width: 18, example: '35202-1234567-1', aliases: ['bformno', 'bform', 'cnic', 'bformnumber'] },
  { key: 'className', header: 'Class', required: true, width: 12, example: 'Class 5', aliases: ['class', 'classname'] },
  { key: 'sectionName', header: 'Section', width: 9, example: 'A', aliases: ['section', 'sectionname'] },
  { key: 'emergencyPhone', header: 'Parent Phone', type: 'phone', width: 16, example: '03001234567', note: 'Parent signs in with this', aliases: ['parentphone', 'phone', 'mobile', 'contact', 'fatherphone', 'emergencyphone'] },
  { key: 'parentEmail', header: 'Parent Email', width: 24, example: '', aliases: ['parentemail', 'email'] },
  { key: 'motherName', header: 'Mother Name', width: 20, example: 'Sana Khan', aliases: ['mothername', 'mother'] },
  { key: 'address', header: 'Address', width: 32, example: 'House 12, Street 4, G-9/3, Islamabad', aliases: ['address', 'homeaddress'] },
  { key: 'religion', header: 'Religion', width: 11, example: 'Islam', aliases: ['religion'] },
  { key: 'bloodGroup', header: 'Blood Group', list: BLOOD_GROUPS, width: 11, example: 'B+', aliases: ['bloodgroup', 'blood'] },
  { key: 'admissionDate', header: 'Admission Date', type: 'date', width: 15, example: '01/04/2024', note: 'DD/MM/YYYY; blank = today', aliases: ['admissiondate', 'dateofadmission', 'admitted'] },
  { key: 'status', header: 'Status', list: STATUSES, width: 10, example: 'Active', note: 'Blank = Active', aliases: ['status'] },
];

const STAFF_COLUMNS = [
  { key: 'empCode', header: 'Employee Code', type: 'text', width: 15, example: '', note: 'Leave blank to generate', aliases: ['employeecode', 'empcode', 'empid', 'employeeid', 'code'] },
  { key: 'name', header: 'Name', required: true, width: 24, example: 'Farah Siddiqui', aliases: ['name', 'staffname', 'teachername', 'fullname'] },
  { key: 'designation', header: 'Designation', width: 18, example: 'Teacher', aliases: ['designation', 'post', 'jobtitle', 'title'] },
  { key: 'role', header: 'Role', list: ROLES, width: 12, example: 'Teacher', note: 'Blank = from designation', aliases: ['role', 'portal', 'access'] },
  { key: 'phone', header: 'Phone', type: 'phone', width: 16, example: '03211234567', note: 'Phone or email required', aliases: ['phone', 'mobile', 'contact'] },
  { key: 'email', header: 'Email', width: 26, example: 'farah@school.edu.pk', aliases: ['email', 'emailaddress'] },
  { key: 'cnic', header: 'CNIC', type: 'text', width: 18, example: '35202-7654321-2', aliases: ['cnic', 'nic', 'idcard'] },
  { key: 'gender', header: 'Gender', list: GENDERS, width: 10, example: 'Female', aliases: ['gender', 'sex'] },
  { key: 'dob', header: 'Date of Birth', type: 'date', width: 14, example: '22/08/1991', note: 'DD/MM/YYYY', aliases: ['dateofbirth', 'dob', 'birthdate'] },
  { key: 'department', header: 'Department', width: 16, example: 'Science', note: 'Created if new', aliases: ['department', 'dept'] },
  { key: 'joiningDate', header: 'Joining Date', type: 'date', width: 14, example: '01/08/2023', note: 'DD/MM/YYYY', aliases: ['joiningdate', 'dateofjoining', 'joined', 'doj'] },
  { key: 'salary', header: 'Monthly Salary (Rs)', type: 'number', width: 17, example: 45000, note: 'In rupees', aliases: ['monthlysalaryrs', 'salary', 'basicsalary', 'monthlysalary', 'pay'] },
  { key: 'salaryType', header: 'Salary Type', list: SALARY_TYPES, width: 12, example: 'Monthly', aliases: ['salarytype', 'paytype'] },
];

const STAFF_USER_ROLES = ['teacher', 'accountant', 'gatekeeper', 'admin'];

const SHEETS = {
  classes: { name: 'Classes', columns: CLASS_COLUMNS },
  students: { name: 'Students', columns: STUDENT_COLUMNS },
  staff: { name: 'Staff', columns: STAFF_COLUMNS },
};

/* ═══ Cell value repair ═══════════════════════════════════════════════ */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Whatever ExcelJS hands back, as plain text. */
function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if (v.text !== undefined) return String(v.text).trim();          // hyperlink (emails)
    if (v.result !== undefined) return cellText(v.result);            // formula
    if (v.error) return '';
    return '';
  }
  if (typeof v === 'number') {
    // Large integers (CNIC, phone) must not become 3.52E+12.
    return Number.isInteger(v) ? v.toFixed(0) : String(v);
  }
  return String(v).trim();
}

/**
 * Date from a cell. Returns { date, error }.
 * Text dates are read DAY first, because that is how dates are written in
 * Pakistan: "05/06/2012" is 5 June 2012. ISO (2012-06-05) is also accepted.
 */
function parseDate(raw) {
  if (raw === null || raw === undefined || raw === '') return { date: null };
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? { error: 'not a valid date' } : { date: raw };
  }
  if (typeof raw === 'number') {
    // Excel serial date: days since 1899-12-30.
    if (raw > 0 && raw < 80000) return { date: new Date(Math.round((raw - 25569) * 86400000)) };
    return { error: 'not a valid date' };
  }
  const s = cellText(raw);
  if (!s) return { date: null };

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return mk(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += y > 50 ? 1900 : 2000;
    return mk(y, +m[2], +m[1]);
  }

  const t = Date.parse(s); // "14 March 2014"
  if (!Number.isNaN(t)) return { date: new Date(t) };
  return { error: `"${s}" is not a date — use DD/MM/YYYY` };

  function mk(y, mo, d) {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return { error: `"${s}" is not a valid date — use DD/MM/YYYY` };
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1) return { error: `"${s}" does not exist (check the day)` };
    return { date: dt };
  }
}

/** Pakistani mobile. Restores a leading zero Excel removed. */
function parsePhone(raw) {
  const s = cellText(raw);
  if (!s) return { phone: null };
  const digits = s.replace(/\D/g, '');
  const core = phoneUtil.core(s);
  const looksMobile = core.length === 10 && core.startsWith('3')
    && [10, 11, 12].includes(digits.length);
  if (!looksMobile) return { phone: s, warning: `"${s}" does not look like a Pakistani mobile number` };
  return { phone: '0' + core }; // stored as typed locally; canonicalised on the account
}

/** CNIC / B-Form: 13 digits, formatted 12345-1234567-1. */
function parseCnic(raw) {
  const s = cellText(raw);
  if (!s) return { value: null };
  const d = s.replace(/\D/g, '');
  if (d.length === 13) return { value: `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` };
  return { value: s, warning: `"${s}" is not 13 digits` };
}

// Compare case-insensitively but keep + and -: stripping symbols made
// B+ and B- the same value, recording every B-negative student as B-positive.
const signNorm = (x) => String(x || '').toUpperCase().replace(/\s+/g, '');
const pickList = (raw, list) => {
  const s = cellText(raw);
  if (!s) return { value: null };
  const hit = list.find((x) => signNorm(x) === signNorm(s))
    || (norm(s) === 'm' ? 'Male' : norm(s) === 'f' ? 'Female' : null);
  return hit ? { value: hit } : { value: s, unknown: true };
};

/* ═══ Reading a workbook ═══════════════════════════════════════════════ */

/**
 * Find the header row (first row with at least two recognised headers) and
 * map each column to a field. Headers are matched loosely so "Father's Name",
 * "father name" and the old CSV's "fatherName" all land in the same field.
 */
function mapHeaders(ws, columns) {
  for (let r = 1; r <= Math.min(ws.rowCount, 10); r++) {
    const row = ws.getRow(r);
    const map = {};
    row.eachCell({ includeEmpty: false }, (cell, colNo) => {
      const h = norm(cellText(cell.value));
      if (!h) return;
      const col = columns.find((c) => norm(c.header) === h)
        || columns.find((c) => (c.aliases || []).includes(h));
      if (col && !Object.values(map).includes(col.key)) map[colNo] = col.key;
    });
    if (Object.keys(map).length >= 2) return { headerRow: r, map };
  }
  return { headerRow: 0, map: {} };
}

function readSheet(ws, columns) {
  if (!ws) return { rows: [], missingHeaders: false };
  const { headerRow, map } = mapHeaders(ws, columns);
  if (!headerRow) return { rows: [], missingHeaders: ws.rowCount > 0 };
  const rows = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec = { _row: r };
    let any = false;
    for (const [colNo, key] of Object.entries(map)) {
      const v = row.getCell(Number(colNo)).value;
      if (v !== null && v !== undefined && cellText(v) !== '') any = true;
      rec[key] = v;
    }
    // Skip blank rows and the template's grey example row.
    if (!any) continue;
    if (cellText(rec.name || rec.className).toLowerCase().startsWith('example')) continue;
    rows.push(rec);
  }
  return { rows };
}

/** Turn an uploaded .xlsx (base64) into raw rows per sheet. */
async function parseWorkbook(base64) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(base64, 'base64'));
  } catch {
    const e = new Error('This file could not be read as an Excel workbook (.xlsx). Save it as "Excel Workbook" and try again.');
    e.status = 400;
    throw e;
  }
  const byName = (want) => wb.worksheets.find((w) => norm(w.name) === norm(want));
  let students = readSheet(byName('Students'), STUDENT_COLUMNS);
  let staff = readSheet(byName('Staff'), STAFF_COLUMNS);
  const classes = readSheet(byName('Classes'), CLASS_COLUMNS);

  // A single-sheet file with no recognised sheet names (someone's own list):
  // read the first sheet as students, which is by far the common case.
  if (!byName('Students') && !byName('Staff') && !byName('Classes') && wb.worksheets[0]) {
    students = readSheet(wb.worksheets[0], STUDENT_COLUMNS);
    staff = { rows: [] };
  }
  return { classes: classes.rows, students: students.rows, staff: staff.rows };
}

/* ═══ Normalising + validating ═════════════════════════════════════════ */

/**
 * Normalise and check every row against the school's current data, without
 * writing anything. The result is what the preview screen shows, and the
 * normalised rows are what the import step receives back.
 */
async function validate(schoolId, raw) {
  const [dbClasses, dbStudents, dbStaff, dbUsers] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, include: { sections: true } }),
    prisma.student.findMany({ where: { schoolId, deletedAt: null }, select: { rollNo: true, name: true, fatherName: true, dob: true } }),
    prisma.staff.findMany({ where: { schoolId, deletedAt: null }, select: { empCode: true, cnic: true } }),
    prisma.user.findMany({ where: { schoolId }, select: { email: true, phone: true, role: true } }),
  ]);

  const issues = [];
  const add = (sheet, row, level, field, message) => issues.push({ sheet, row, level, field, message });

  /* Classes — the sheet may define classes that do not exist yet. */
  const classMap = new Map(); // normName -> { name, sections:Set, exists, orderNo }
  for (const c of dbClasses) {
    classMap.set(norm(c.name), { name: c.name, sections: new Set(c.sections.map((s) => s.name)), exists: true });
  }
  const classes = [];
  for (const r of raw.classes || []) {
    const name = cellText(r.className);
    if (!name) { add('Classes', r._row, 'error', 'Class', 'Class name is empty.'); continue; }
    const sections = cellText(r.sections).split(/[,/;]+/).map((x) => x.trim()).filter(Boolean);
    const orderNo = r.orderNo !== undefined && cellText(r.orderNo) !== '' ? parseInt(cellText(r.orderNo)) : null;
    const key = norm(name);
    const existing = classMap.get(key);
    if (existing) {
      const fresh = sections.filter((s) => ![...existing.sections].some((x) => norm(x) === norm(s)));
      fresh.forEach((s) => existing.sections.add(s));
      classes.push({ _row: r._row, className: existing.name, sections, orderNo, action: existing.exists ? (fresh.length ? 'add-sections' : 'exists') : 'create', newSections: fresh });
    } else {
      classMap.set(key, { name, sections: new Set(sections), exists: false, orderNo });
      classes.push({ _row: r._row, className: name, sections, orderNo, action: 'create', newSections: sections });
    }
  }

  /* Students */
  const knownRolls = new Set(dbStudents.map((s) => norm(s.rollNo)).filter(Boolean));
  const knownPeople = new Set(dbStudents.map((s) => `${norm(s.name)}|${norm(s.fatherName)}|${s.dob ? s.dob.toISOString().slice(0, 10) : ''}`));
  const seenRolls = new Map();
  const students = [];

  for (const r of raw.students || []) {
    const row = r._row;
    const out = { _row: row };
    let bad = false;
    const err = (f, m) => { add('Students', row, 'error', f, m); bad = true; };
    const warn = (f, m) => add('Students', row, 'warning', f, m);

    out.name = cellText(r.name);
    out.fatherName = cellText(r.fatherName);
    if (!out.name) err('Student Name', 'Student name is required.');
    if (!out.fatherName) err('Father Name', 'Father name is required.');

    out.rollNo = cellText(r.rollNo) || null;

    // Stored as "Male"/"Female"/"Other", matching the admission wizard.
    const g = pickList(r.gender, STUDENT_GENDERS);
    out.gender = g.value && !g.unknown ? g.value : null;
    if (g.unknown) warn('Gender', `"${g.value}" is not Male, Female or Other.`);

    for (const [field, label] of [['dob', 'Date of Birth'], ['admissionDate', 'Admission Date']]) {
      const d = parseDate(r[field]);
      if (d.error) err(label, d.error);
      else if (d.date && d.date > new Date()) err(label, 'Date is in the future.');
      // Keep the bad text rather than blanking it. Blanking it let the
      // re-check on import see an empty, valid field and save the row.
      out[field] = d.date ? d.date.toISOString().slice(0, 10) : (d.error ? cellText(r[field]) : null);
    }

    const b = parseCnic(r.bFormNo);
    out.bFormNo = b.value;
    if (b.warning) warn('B-Form No', b.warning);

    const className = cellText(r.className);
    const cls = className ? classMap.get(norm(className)) : null;
    if (!className) err('Class', 'Class is required.');
    else if (!cls) err('Class', `Class "${className}" does not exist. Add it on the Classes sheet or create it first.`);
    out.className = cls ? cls.name : className;

    const sectionName = cellText(r.sectionName);
    if (sectionName && cls) {
      const sec = [...cls.sections].find((s) => norm(s) === norm(sectionName));
      if (!sec) err('Section', `Section "${sectionName}" does not exist in ${cls.name}. Add it on the Classes sheet.`);
      out.sectionName = sec || sectionName;
    } else {
      out.sectionName = null;
      if (cls && cls.sections.size) warn('Section', `No section given; ${cls.name} has sections ${[...cls.sections].join(', ')}.`);
    }

    const p = parsePhone(r.emergencyPhone);
    out.emergencyPhone = p.phone;
    if (p.warning) warn('Parent Phone', p.warning);
    if (!p.phone) warn('Parent Phone', 'No parent phone: the parent will sign in with an email address instead.');

    out.parentEmail = cellText(r.parentEmail) || null;
    if (out.parentEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.parentEmail)) err('Parent Email', `"${out.parentEmail}" is not an email address.`);

    out.motherName = cellText(r.motherName) || null;
    out.address = cellText(r.address) || null;
    out.religion = cellText(r.religion) || null;
    const bg = pickList(r.bloodGroup, BLOOD_GROUPS);
    out.bloodGroup = bg.value && !bg.unknown ? bg.value : null;
    if (bg.unknown) warn('Blood Group', `"${bg.value}" is not a recognised blood group.`);
    const st = pickList(r.status, STATUSES);
    out.status = st.value ? st.value.toLowerCase() : 'active';
    if (st.unknown) err('Status', `"${st.value}" must be Active, Inactive or Passout.`);

    // Already in the school? Skipped, not duplicated — re-importing the
    // same file twice must be harmless.
    const personKey = `${norm(out.name)}|${norm(out.fatherName)}|${out.dob || ''}`;
    if (out.rollNo && knownRolls.has(norm(out.rollNo))) out.action = 'skip-exists';
    else if (!out.rollNo && knownPeople.has(personKey)) out.action = 'skip-exists';
    else out.action = 'create';
    if (out.action === 'skip-exists') add('Students', row, 'info', 'Roll No', 'Already in this school — will be skipped.');

    if (out.rollNo) {
      const k = norm(out.rollNo);
      if (seenRolls.has(k)) err('Roll No', `Roll number ${out.rollNo} is also used on row ${seenRolls.get(k)}.`);
      else seenRolls.set(k, row);
    }
    if (bad) out.action = 'error';
    students.push(out);
  }

  /* Staff */
  const knownCodes = new Set(dbStaff.map((s) => norm(s.empCode)).filter(Boolean));
  const knownCnics = new Set(dbStaff.map((s) => norm(s.cnic)).filter(Boolean));
  const knownEmails = new Set(dbUsers.map((u) => String(u.email || '').toLowerCase()));
  // Staff who give only a phone number would otherwise match nothing and be
  // created again every time the same file is imported.
  const knownStaffPhones = new Set(dbUsers.filter((u) => STAFF_USER_ROLES.includes(u.role)).map((u) => phoneUtil.core(u.phone)).filter((c) => c.length === 10));
  const seenEmails = new Map();
  const staff = [];

  for (const r of raw.staff || []) {
    const row = r._row;
    const out = { _row: row };
    let bad = false;
    const err = (f, m) => { add('Staff', row, 'error', f, m); bad = true; };
    const warn = (f, m) => add('Staff', row, 'warning', f, m);

    out.name = cellText(r.name);
    if (!out.name) err('Name', 'Name is required.');
    out.empCode = cellText(r.empCode) || null;
    out.designation = cellText(r.designation) || null;

    const role = pickList(r.role, ROLES);
    out.role = role.value && !role.unknown ? role.value.toLowerCase() : null;
    if (role.unknown) warn('Role', `"${role.value}" is not a role; it will be chosen from the designation.`);

    const p = parsePhone(r.phone);
    out.phone = p.phone;
    if (p.warning) warn('Phone', p.warning);

    out.email = cellText(r.email).toLowerCase() || null;
    if (out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) err('Email', `"${out.email}" is not an email address.`);
    if (!out.email && !out.phone) err('Phone', 'A phone number or an email is required, so they can sign in.');

    const c = parseCnic(r.cnic);
    out.cnic = c.value;
    if (c.warning) warn('CNIC', c.warning);

    // Stored lowercase, matching the Add Staff form.
    const g = pickList(r.gender, GENDERS);
    out.gender = g.value && !g.unknown ? g.value.toLowerCase() : null;
    if (g.unknown) warn('Gender', `"${g.value}" is not Male or Female.`);

    for (const [field, label] of [['dob', 'Date of Birth'], ['joiningDate', 'Joining Date']]) {
      const d = parseDate(r[field]);
      if (d.error) err(label, d.error);
      out[field] = d.date ? d.date.toISOString().slice(0, 10) : (d.error ? cellText(r[field]) : null);
    }

    out.department = cellText(r.department) || null;

    const salText = cellText(r.salary).replace(/[,\s]|rs\.?/gi, '');
    if (salText && !/^\d+(\.\d+)?$/.test(salText)) err('Monthly Salary (Rs)', `"${cellText(r.salary)}" is not a number.`);
    out.salary = salText && /^\d+(\.\d+)?$/.test(salText) ? Math.round(parseFloat(salText)) : (salText ? cellText(r.salary) : 0);

    const stype = pickList(r.salaryType, SALARY_TYPES);
    out.salaryType = stype.value && !stype.unknown ? stype.value.toLowerCase() : 'monthly';

    if (out.empCode && knownCodes.has(norm(out.empCode))) out.action = 'skip-exists';
    else if (out.email && knownEmails.has(out.email)) out.action = 'skip-exists';
    else if (out.cnic && knownCnics.has(norm(out.cnic))) out.action = 'skip-exists';
    else if (out.phone && knownStaffPhones.has(phoneUtil.core(out.phone))) out.action = 'skip-exists';
    else out.action = 'create';
    if (out.action === 'skip-exists') add('Staff', row, 'info', 'Name', 'Already in this school — will be skipped.');

    if (out.email) {
      if (seenEmails.has(out.email)) err('Email', `${out.email} is also used on row ${seenEmails.get(out.email)}.`);
      else seenEmails.set(out.email, row);
    }
    if (bad) out.action = 'error';
    staff.push(out);
  }

  const count = (list, action) => list.filter((x) => x.action === action).length;
  return {
    rows: { classes, students, staff },
    issues,
    summary: {
      classes: { create: count(classes, 'create'), addSections: count(classes, 'add-sections'), exists: count(classes, 'exists'), total: classes.length },
      students: { create: count(students, 'create'), skip: count(students, 'skip-exists'), error: count(students, 'error'), total: students.length },
      staff: { create: count(staff, 'create'), skip: count(staff, 'skip-exists'), error: count(staff, 'error'), total: staff.length },
      errors: issues.filter((i) => i.level === 'error').length,
      warnings: issues.filter((i) => i.level === 'warning').length,
    },
  };
}

/* ═══ Importing a chunk ════════════════════════════════════════════════ */

/**
 * Import one chunk of already-validated rows. Called repeatedly by the
 * browser so a 900-student file never becomes one five-minute request, and
 * the screen can show progress. Each chunk is validated again here — the
 * browser is never trusted.
 */
async function importChunk(ctx, chunk) {
  const { schoolId } = ctx;
  const { admitStudent } = require('./admission.service');
  const { createStaff } = require('./staff.service');

  const check = await validate(schoolId, {
    classes: (chunk.classes || []).map((c) => ({ ...c, sections: (c.sections || []).join(', ') })),
    students: chunk.students || [],
    staff: chunk.staff || [],
  });

  const results = { classes: [], students: [], staff: [] };
  const school = await prisma.school.findUnique({ where: { id: schoolId } });

  /* Classes and sections first: students below may need them. */
  for (const c of check.rows.classes) {
    try {
      let cls = await prisma.class.findFirst({ where: { schoolId, name: c.className } });
      if (!cls) {
        cls = await prisma.class.create({ data: { schoolId, name: c.className, orderNo: c.orderNo || 0 } });
      }
      const have = await prisma.section.findMany({ where: { classId: cls.id } });
      let added = 0;
      for (const s of c.sections) {
        if (!have.some((h) => norm(h.name) === norm(s))) {
          await prisma.section.create({ data: { schoolId, classId: cls.id, name: s } });
          added++;
        }
      }
      results.classes.push({ row: c._row, className: c.className, status: c.action === 'create' ? 'created' : added ? 'sections added' : 'already existed' });
    } catch (e) {
      results.classes.push({ row: c._row, className: c.className, status: 'failed', error: e.message });
    }
  }

  /* Staff */
  const deptCache = new Map();
  const deptId = async (name) => {
    if (!name) return null;
    const k = norm(name);
    if (deptCache.has(k)) return deptCache.get(k);
    let d = (await prisma.department.findMany({ where: { schoolId } })).find((x) => norm(x.name) === k);
    if (!d) d = await prisma.department.create({ data: { schoolId, name } });
    deptCache.set(k, d.id);
    return d.id;
  };

  for (const s of check.rows.staff) {
    if (s.action !== 'create') {
      results.staff.push({ row: s._row, name: s.name, status: s.action === 'skip-exists' ? 'skipped (already exists)' : 'not imported (has errors)' });
      continue;
    }
    try {
      const out = await createStaff(
        { schoolId, campusId: ctx.campusId, actorUserId: ctx.actorUserId, school, auditAction: 'STAFF_IMPORTED' },
        {
          name: s.name, email: s.email, phone: s.phone, designation: s.designation, role: s.role,
          cnic: s.cnic, gender: s.gender, dob: s.dob, joiningDate: s.joiningDate,
          departmentId: await deptId(s.department),
          basicSalary: Math.round((s.salary || 0) * 100), // rupees -> paisa
          salaryType: s.salaryType, empCode: s.empCode,
        },
      );
      results.staff.push({ row: s._row, name: s.name, status: 'imported', credentials: out.credentials });
    } catch (e) {
      results.staff.push({ row: s._row, name: s.name, status: 'failed', error: e.message });
    }
  }

  /* Students */
  const classes = await prisma.class.findMany({ where: { schoolId }, include: { sections: true } });
  for (const st of check.rows.students) {
    if (st.action !== 'create') {
      results.students.push({ row: st._row, name: st.name, status: st.action === 'skip-exists' ? 'skipped (already exists)' : 'not imported (has errors)' });
      continue;
    }
    try {
      const cls = classes.find((c) => norm(c.name) === norm(st.className));
      const sec = cls && st.sectionName ? cls.sections.find((x) => norm(x.name) === norm(st.sectionName)) : null;
      const out = await admitStudent(
        { schoolId, campusId: ctx.campusId, actorUserId: ctx.actorUserId, school, auditAction: 'STUDENT_IMPORTED' },
        {
          name: st.name, fatherName: st.fatherName, motherName: st.motherName,
          gender: st.gender, dob: st.dob, bFormNo: st.bFormNo,
          classId: cls?.id, sectionId: sec?.id, rollNo: st.rollNo,
          emergencyPhone: st.emergencyPhone, parentEmail: st.parentEmail,
          address: st.address, religion: st.religion, bloodGroup: st.bloodGroup,
          admissionDate: st.admissionDate, status: st.status,
          createPortalAccounts: true,
        },
      );
      results.students.push({ row: st._row, name: st.name, status: 'imported', rollNo: out.student.rollNo, credentials: out.credentials });
    } catch (e) {
      results.students.push({ row: st._row, name: st.name, status: 'failed', error: e.message });
    }
  }

  return results;
}

/* ═══ Writing a workbook (template or export) ══════════════════════════ */

const INK = 'FF16211E', GREEN = 'FF0F3D33', PAPER = 'FFF7F8F5', MUTED = 'FF5E6B67', LINE = 'FFE3E7E3';

function addSheet(wb, def, records, { withExample }) {
  const ws = wb.addWorksheet(def.name, {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 20 },
  });
  ws.columns = def.columns.map((c) => ({
    header: c.required ? `${c.header} *` : c.header,
    key: c.key,
    width: c.width,
    // Text format stops Excel eating leading zeros and CNIC digits.
    style: c.type === 'text' || c.type === 'phone' ? { numFmt: '@' } : c.type === 'date' ? { numFmt: 'dd/mm/yyyy' } : {},
  }));

  const head = ws.getRow(1);
  head.height = 26;
  head.eachCell((cell, i) => {
    const col = def.columns[i - 1];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    if (col?.note) cell.note = { texts: [{ text: col.note }] };
  });

  if (withExample) {
    const ex = {};
    def.columns.forEach((c) => { ex[c.key] = c.example; });
    // The parser skips a row whose name starts with "Example".
    if ('name' in ex) ex.name = `Example: ${ex.name}`;
    else if ('className' in ex) ex.className = `Example: ${ex.className}`;
    const r = ws.addRow(ex);
    r.font = { italic: true, color: { argb: MUTED } };
  }

  for (const rec of records) ws.addRow(rec);

  // Drop-down lists for the fixed-choice columns, for 1000 rows.
  def.columns.forEach((c, i) => {
    if (!c.list) return;
    const letter = ws.getColumn(i + 1).letter;
    for (let r = 2; r <= 1001; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`"${c.list.join(',')}"`],
        showErrorMessage: true, errorStyle: 'warning',
        errorTitle: c.header, error: `Choose one of: ${c.list.join(', ')}`,
      };
    }
  });
  return ws;
}

function addReadMe(wb, { schoolName, mode, counts }) {
  const ws = wb.addWorksheet('Read me', { properties: { tabColor: { argb: GREEN } } });
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 100;
  const line = (text, opts = {}) => {
    const r = ws.addRow(['', text]);
    r.getCell(2).font = { name: 'Calibri', size: opts.size || 11, bold: !!opts.bold, color: { argb: opts.color || INK } };
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    if (opts.height) r.height = opts.height;
    return r;
  };
  ws.addRow([]);
  line('IlmForge — school records', { size: 16, bold: true, color: GREEN, height: 26 });
  line(mode === 'export'
    ? `Exported from ${schoolName || 'this school'} on ${new Date().toLocaleDateString('en-GB')}. ${counts}`
    : 'Fill in this workbook, then import it from Students › Import & Export in IlmForge.', { color: MUTED });
  ws.addRow([]);
  line('How to fill it in', { bold: true, size: 12 });
  [
    '1.  Classes sheet first. List every class and its sections, for example Class 5 with sections "A, B". Classes that already exist are left alone; missing sections are added.',
    '2.  Students sheet. One student per row. Columns marked * are required. Class and Section must match the Classes sheet or classes already in IlmForge.',
    '3.  Staff sheet. One person per row. Give a phone number or an email — that is how they will sign in.',
    '4.  Leave Roll No and Employee Code blank and IlmForge creates them. Fill them in only when moving existing records from another system.',
    '5.  Dates are DAY first: 14/03/2014 is 14 March 2014.',
    '6.  Type phone numbers as 03001234567. The column is set to text so Excel keeps the leading 0.',
    '7.  The grey "Example" row in each sheet is ignored. You can delete it.',
  ].forEach((t) => line(t, { height: 32 }));
  ws.addRow([]);
  line('What happens when you import', { bold: true, size: 12 });
  [
    'Nothing is saved until you check the preview and press Import.',
    'Every student gets a roll number, a student portal login and a parent portal login. Brothers and sisters with the same parent phone share one parent account.',
    'Every staff member gets an employee code and a login for the portal that matches their role.',
    'Anyone already in the school (same roll number, employee code, email or CNIC) is skipped, so importing the same file twice does not create duplicates.',
    'When the import finishes you can download a Login Details sheet with every new username and password. Passwords are shown only then.',
  ].forEach((t) => line(t, { height: 32 }));
  ws.addRow([]);
  line('Moving to another server', { bold: true, size: 12 });
  line('Export from the old server, then import the same file on the new one. Classes, sections, students, parents and staff move across. Fee history, attendance and exam marks are not part of this file. Passwords cannot be exported, so everyone receives a new one in the Login Details sheet.', { height: 46 });
  return ws;
}

/** Blank template with one example row per sheet. */
async function buildTemplate(schoolId) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const classes = await prisma.class.findMany({ where: { schoolId, isActive: true }, include: { sections: true }, orderBy: { orderNo: 'asc' } });
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  addReadMe(wb, { schoolName: school?.name, mode: 'template' });
  // Pre-fill the school's existing classes so staff only add students.
  addSheet(wb, SHEETS.classes, classes.map((c) => ({ className: c.name, sections: c.sections.map((s) => s.name).join(', '), orderNo: c.orderNo })), { withExample: classes.length === 0 });
  addSheet(wb, SHEETS.students, [], { withExample: true });
  addSheet(wb, SHEETS.staff, [], { withExample: true });
  return wb;
}

/** Everything this school has, in the import format. */
async function buildExport(schoolId) {
  const fmt = (d) => (d ? new Date(d) : null);
  const [school, classes, students, staff] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    prisma.class.findMany({ where: { schoolId }, include: { sections: true }, orderBy: { orderNo: 'asc' } }),
    prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      include: { class: true, section: true, parents: { include: { parent: { include: { user: { select: { email: true, phone: true } } } } } } },
      orderBy: [{ classId: 'asc' }, { rollNo: 'asc' }],
    }),
    prisma.staff.findMany({
      where: { schoolId, deletedAt: null },
      include: { user: { select: { email: true, phone: true, role: true } }, department: true },
      orderBy: { empCode: 'asc' },
    }),
  ]);

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);
  const realEmail = (e) => (e && !/\.(parent|student|staff)$/.test(e) ? e : null);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  addReadMe(wb, {
    schoolName: school?.name,
    mode: 'export',
    counts: `${classes.length} classes, ${students.length} students, ${staff.length} staff.`,
  });
  addSheet(wb, SHEETS.classes, classes.map((c) => ({
    className: c.name, sections: c.sections.map((s) => s.name).join(', '), orderNo: c.orderNo,
  })), { withExample: false });

  addSheet(wb, SHEETS.students, students.map((s) => {
    const parentUser = s.parents?.[0]?.parent?.user;
    return {
      rollNo: s.rollNo, name: s.name, fatherName: s.fatherName,
      gender: cap(s.gender), dob: fmt(s.dob), bFormNo: s.bFormNo,
      className: s.class?.name || '', sectionName: s.section?.name || '',
      emergencyPhone: s.emergencyPhone || parentUser?.phone || '',
      parentEmail: realEmail(parentUser?.email) || '',
      motherName: s.motherName, address: s.address, religion: s.religion,
      bloodGroup: s.bloodGroup, admissionDate: fmt(s.admissionDate), status: cap(s.status),
    };
  }), { withExample: false });

  addSheet(wb, SHEETS.staff, staff.map((s) => ({
    empCode: s.empCode, name: s.name, designation: s.designation,
    role: cap(s.user?.role), phone: s.user?.phone || '',
    email: realEmail(s.user?.email) || '',
    cnic: s.cnic, gender: cap(s.gender), dob: fmt(s.dob),
    department: s.department?.name || '', joiningDate: fmt(s.joiningDate),
    salary: s.basicSalary ? Math.round(s.basicSalary / 100) : null, // paisa -> rupees
    salaryType: cap(s.salaryType),
  })), { withExample: false });

  return { wb, counts: { classes: classes.length, students: students.length, staff: staff.length } };
}

module.exports = {
  parseWorkbook, validate, importChunk, buildTemplate, buildExport,
  // exported for tests
  parseDate, parsePhone, parseCnic, cellText, pickList, BLOOD_GROUPS, STUDENT_GENDERS, CLASS_COLUMNS, STUDENT_COLUMNS, STAFF_COLUMNS,
};
