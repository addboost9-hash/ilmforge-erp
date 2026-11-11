/**
 * Roll number slips: how a school's slip looks (its design), and everything
 * printed on the slips of an exam, class by class.
 *
 * The design is kept in School.settingsJson.slipDesign. The instructions
 * printed on the slip are the exam settings' "admit card instructions", so
 * there is one place for them, whichever page they are edited on.
 *
 * The subjects on a slip are the exam's date sheet (ExamTimetable) for the
 * student's class and section. A section with no date sheet of its own uses
 * the class's, then that of another section of the class (schools usually
 * plan one section and the others sit the same papers); the slip data says
 * which, so the page can show it.
 */
const prisma = require('../config/prisma');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');

const DEFAULT_INSTRUCTIONS = [
  'Reach the examination hall 15 minutes before the paper starts.',
  'Bring this slip and your school ID card to every paper.',
  'Mobile phones, notes and any unfair means are not allowed in the hall.',
  'Follow the instructions of the invigilator at all times.',
  'This slip is not valid if it is altered or overwritten.',
];

const DEFAULT_SLIP_DESIGN = {
  title: 'Roll Number Slip',
  color: '#1B2F6E',
  perPage: 2, // slips on one A4 page: 1 or 2
  rollNumber: 'student', // student: the student's own roll no. | exam: numbered for the exam
  rollStart: 1001,
  rollPrefix: '',
  show: {
    photo: true,
    fatherName: true,
    day: true,
    time: true,
    room: false,
    maxMarks: false,
    invigilator: true,
    instructions: true,
    studentSignature: true,
    principalSignature: true,
    classTeacherSignature: false,
  },
  principalName: '',
  principalTitle: 'Principal',
  principalSignature: '', // data:image/png;base64,… (a small picture of the signature)
  signatureSet: false, // chosen here (even if removed): the result card's is not used
  footerNote: 'No slip, no entry: bring this slip to every paper.',
};

const SHOW_KEYS = Object.keys(DEFAULT_SLIP_DESIGN.show);
const SIGNATURE_RE = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
const SIGNATURE_MAX = 400 * 1024;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* The design as saved, merged over the defaults (older saves lack new keys). */
function withDefaults(saved = {}) {
  const s = saved && typeof saved === 'object' ? saved : {};
  return { ...DEFAULT_SLIP_DESIGN, ...s, show: { ...DEFAULT_SLIP_DESIGN.show, ...(s.show || {}) } };
}

/* A design sent by the page, checked field by field. Returns { design } or
   { error }. Fields that are not sent keep their saved value. */
function checkDesign(input = {}, current = DEFAULT_SLIP_DESIGN) {
  const d = withDefaults(current);
  const has = (k) => Object.prototype.hasOwnProperty.call(input, k);
  if (has('title')) {
    d.title = text(input.title, 60);
    if (!d.title) return { error: 'Give the slip a title, for example "Roll Number Slip".' };
  }
  if (has('color')) {
    if (!HEX_RE.test(String(input.color))) return { error: 'The colour is not valid.' };
    d.color = String(input.color);
  }
  if (has('perPage')) {
    const n = Number(input.perPage);
    if (![1, 2].includes(n)) return { error: 'Slips per page is 1 or 2.' };
    d.perPage = n;
  }
  if (has('rollNumber')) {
    if (!['student', 'exam'].includes(input.rollNumber)) return { error: 'Roll number is the student\'s own or numbered for the exam.' };
    d.rollNumber = input.rollNumber;
  }
  if (has('rollStart')) {
    const n = Number(input.rollStart);
    if (!Number.isInteger(n) || n < 1 || n > 9999999) return { error: 'The first exam roll number is a whole number from 1 to 9999999.' };
    d.rollStart = n;
  }
  if (has('rollPrefix')) {
    const p = String(input.rollPrefix ?? '').trim();
    if (!/^[A-Za-z0-9/-]{0,12}$/.test(p)) return { error: 'The roll number prefix is up to 12 letters, digits, "-" or "/".' };
    d.rollPrefix = p;
  }
  if (has('show') && input.show && typeof input.show === 'object') {
    for (const k of SHOW_KEYS) if (k in input.show) d.show[k] = Boolean(input.show[k]);
  }
  if (has('principalName')) d.principalName = text(input.principalName, 80);
  if (has('principalTitle')) d.principalTitle = text(input.principalTitle, 60) || 'Principal';
  if (has('footerNote')) d.footerNote = text(input.footerNote, 160);
  if (has('principalSignature')) {
    const sig = String(input.principalSignature || '');
    if (sig && (!SIGNATURE_RE.test(sig) || sig.length > SIGNATURE_MAX)) {
      return { error: 'The signature must be a PNG or JPG picture under 300 KB.' };
    }
    d.principalSignature = sig;
    d.signatureSet = true;
  }
  return { design: d };
}

/* The instructions, one per line: from the exam settings, or the defaults. */
function instructionLines(raw) {
  const lines = String(raw || '').split(/\r?\n/).map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
  return lines.length ? lines.slice(0, 12) : DEFAULT_INSTRUCTIONS;
}

async function readDesign(schoolId) {
  const [settings, exam] = await Promise.all([
    readSettings(schoolId),
    prisma.examSettings.findFirst({ where: { schoolId }, select: { admitCardInstructions: true } }).catch(() => null),
  ]);
  const design = withDefaults(settings.slipDesign);
  // The result cards' principal signature, when the slip has none of its own.
  const cardSig = design.signatureSet ? null : (settings.resultConfig?.signatures || []).find((s) => /principal/i.test(`${s.designation} ${s.name}`) && SIGNATURE_RE.test(String(s.signatureUrl || '')));
  return {
    ...design,
    instructions: instructionLines(exam?.admitCardInstructions),
    signatureFromResultCard: !design.principalSignature && !!cardSig,
    ...(!design.principalSignature && cardSig ? { principalSignature: cardSig.signatureUrl } : {}),
  };
}

async function saveDesign(schoolId, input = {}) {
  const settings = await readSettings(schoolId);
  const { design, error } = checkDesign(input, settings.slipDesign);
  if (error) return { error };
  await mergeSettings(schoolId, { slipDesign: design });
  if (input.instructions !== undefined) {
    const list = (Array.isArray(input.instructions) ? input.instructions : String(input.instructions).split(/\r?\n/))
      .map((l) => text(l, 300)).filter(Boolean).slice(0, 12);
    const value = list.map((l, i) => `${i + 1}. ${l}`).join('\n');
    const existing = await prisma.examSettings.findFirst({ where: { schoolId }, select: { id: true } });
    if (existing) await prisma.examSettings.update({ where: { id: existing.id }, data: { admitCardInstructions: value } });
    else await prisma.examSettings.create({ data: { schoolId, admitCardInstructions: value } });
  }
  return { design: await readDesign(schoolId) };
}

/* ── The slips of an exam ─────────────────────────────────────────────── */

const examClassIds = (exam) => {
  let list = [];
  try {
    list = JSON.parse(exam.classIds || '[]').map((c) => parseInt(c && typeof c === 'object' ? c.classId : c)).filter(Number.isInteger);
  } catch { list = []; }
  if (!list.length && exam.classId) list = [exam.classId];
  return [...new Set(list)];
};

/* Roll numbers in their natural order: 2 before 10, "A-2" before "A-10". */
const byRoll = (a, b) => {
  const ra = String(a.rollNo || '');
  const rb = String(b.rollNo || '');
  if (ra && !rb) return -1;
  if (!ra && rb) return 1;
  return ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' }) || String(a.name).localeCompare(String(b.name));
};

const dayName = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }) : '');

/**
 * Everything printed on the slips of an exam, one group per class-section.
 *   classIds   only these classes (the teacher's own, or the one chosen)
 *   sectionId  only this section
 *   photos     false: leave the pictures out (a count of the slips only)
 * Exam roll numbers are counted over every class of the exam, in class
 * order, so a student has the same number whichever class is printed.
 */
async function slipData(schoolId, exam, { classIds: only = null, sectionId = null, photos = true } = {}) {
  const forClasses = examClassIds(exam);
  const [school, classes, entries, design] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, address: true, city: true, phone: true, logoUrl: true } }),
    prisma.class.findMany({
      where: { schoolId, isActive: true, ...(forClasses.length && { id: { in: forClasses } }) },
      include: { sections: { orderBy: { name: 'asc' } } },
      orderBy: [{ orderNo: 'asc' }, { id: 'asc' }],
    }),
    prisma.examTimetable.findMany({ where: { examId: exam.id, schoolId }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }] }),
    readDesign(schoolId),
  ]);
  const classIds = classes.map((c) => c.id);
  const [students, subjects] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, classId: { in: classIds }, status: 'active', deletedAt: null },
      select: { id: true, name: true, lastName: true, fatherName: true, rollNo: true, photoUrl: true, gender: true, classId: true, sectionId: true },
    }),
    prisma.subject.findMany({ where: { schoolId, classId: { in: classIds } }, select: { classId: true, name: true, totalMarks: true } }),
  ]);

  const scheduleOf = (classId, secId) => entries
    .filter((e) => e.classId === classId && (e.sectionId || null) === (secId || null))
    .map((e) => {
      const date = e.date ? e.date.toISOString().slice(0, 10) : '';
      const subject = subjects.find((s) => s.classId === classId && s.name.trim().toLowerCase() === e.subjectName.trim().toLowerCase());
      return { subject: e.subjectName, date, day: dayName(date), timeFrom: e.startTime || '', timeTo: e.endTime || '', room: e.room || '', maxMarks: subject?.totalMarks ?? null };
    });

  // Groups in class order; within a class, its sections by name, then
  // students with no section.
  const groups = [];
  for (const c of classes) {
    const inClass = students.filter((s) => s.classId === c.id);
    const secs = [...c.sections.map((s) => ({ id: s.id, name: s.name })), { id: null, name: '' }];
    for (const sec of secs) {
      const list = inClass.filter((s) => (sec.id ? s.sectionId === sec.id : !c.sections.some((x) => x.id === s.sectionId))).sort(byRoll);
      if (!list.length && sec.id === null) continue;
      let schedule = sec.id ? scheduleOf(c.id, sec.id) : [];
      let scheduleFrom = schedule.length ? 'section' : '';
      if (!schedule.length) { schedule = scheduleOf(c.id, null); scheduleFrom = schedule.length ? 'class' : ''; }
      if (!schedule.length) {
        const other = c.sections.find((s) => s.id !== sec.id && scheduleOf(c.id, s.id).length);
        if (other) { schedule = scheduleOf(c.id, other.id); scheduleFrom = `section:${other.name}`; }
      }
      groups.push({
        classId: c.id, className: c.name, sectionId: sec.id, sectionName: sec.name,
        schedule, scheduleFrom: scheduleFrom || 'none',
        students: list.map((s) => ({
          id: s.id,
          name: [s.name, s.lastName].filter(Boolean).join(' '),
          fatherName: s.fatherName || '',
          rollNo: s.rollNo || '',
          photoUrl: photos ? s.photoUrl || '' : '',
          hasPhoto: !!s.photoUrl,
          gender: s.gender || '',
        })),
      });
    }
  }

  // Exam roll numbers, counted over all of the exam's classes.
  let n = design.rollStart;
  for (const g of groups) for (const s of g.students) s.examRollNo = `${design.rollPrefix}${n++}`;

  const wanted = groups.filter((g) => (!only || only.includes(g.classId)) && (!sectionId || g.sectionId === sectionId));
  return {
    exam: { id: exam.id, title: exam.title, term: exam.term || '', dateStart: exam.dateStart, dateEnd: exam.dateEnd },
    school: { name: school?.name || '', address: [school?.address, school?.city].filter(Boolean).join(', '), phone: school?.phone || '', logoUrl: school?.logoUrl || '' },
    design,
    groups: wanted,
  };
}

/* ── A class's date sheet, saved in one go ────────────────────────────── */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/* The papers of one class (or section), checked. Returns { rows } or { error }. */
function checkSchedule(entries) {
  if (!Array.isArray(entries)) return { error: 'Send the list of papers.' };
  if (entries.length > 40) return { error: 'A date sheet has at most 40 papers.' };
  const rows = [];
  const seen = new Set();
  for (const [i, e] of entries.entries()) {
    const at = `Paper ${i + 1}`;
    const subject = text(e?.subject, 80);
    if (!subject) return { error: `${at}: choose the subject.` };
    const key = subject.toLowerCase();
    if (seen.has(key)) return { error: `${subject} is in the list twice.` };
    seen.add(key);
    const date = String(e?.date || '').trim();
    if (date && (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))) return { error: `${subject}: the date is not valid.` };
    const timeFrom = String(e?.timeFrom || '').trim();
    const timeTo = String(e?.timeTo || '').trim();
    if (timeFrom && !TIME_RE.test(timeFrom)) return { error: `${subject}: the start time is not valid.` };
    if (timeTo && !TIME_RE.test(timeTo)) return { error: `${subject}: the end time is not valid.` };
    if (timeFrom && timeTo && timeTo <= timeFrom) return { error: `${subject}: the paper must end after it starts.` };
    rows.push({ subjectName: subject, date: date ? new Date(`${date}T00:00:00Z`) : null, startTime: timeFrom || null, endTime: timeTo || null, room: text(e?.room, 40) || null });
  }
  return { rows };
}

module.exports = {
  DEFAULT_SLIP_DESIGN, DEFAULT_INSTRUCTIONS,
  checkDesign, instructionLines, readDesign, saveDesign, slipData, checkSchedule, examClassIds, byRoll,
};
