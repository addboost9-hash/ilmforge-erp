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
 *
 * Exam roll numbers (seat numbers) are counted class by class, or "mixed":
 * one student of each class in turn (Play Group 5001, Nursery 5002, Prep
 * 5003 ... then the second student of each class), so students seated in
 * number order never sit beside a classmate. They are fixed (ExamRollNumber)
 * when the exam's slips are first printed: a slip printed later keeps its
 * number, and a student admitted since gets the next number after the
 * highest, so no number is ever handed out twice.
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
  schoolName: '', // the name printed on the slip; empty: the school's name
  color: '#1B2F6E',
  perPage: 2, // slips on one A4 page: 1 or 2
  rollNumber: 'student', // student: the student's own roll no. | exam: numbered for the exam, class by class | mixed: numbered for the exam, one student of each class in turn
  rollStart: 1001,
  rollPrefix: '',
  show: {
    logo: true,
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
const ROLL_MODES = ['student', 'exam', 'mixed'];
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
  if (has('schoolName')) d.schoolName = text(input.schoolName, 150);
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
    if (!ROLL_MODES.includes(input.rollNumber)) return { error: 'Roll number is the student\'s own, or numbered for the exam class by class or mixed.' };
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

const norm = (v) => String(v || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/* The same child recorded twice in a class (the same name and father's name)
   gets one slip: the record with a roll number, else the older one. Without a
   father's name two records are never taken for one child. Returns
   { keep, duplicates: [{ student, keptId }] }. */
function oneRecordEach(students) {
  const order = [...students].sort((a, b) => (a.rollNo ? 0 : 1) - (b.rollNo ? 0 : 1) || a.id - b.id);
  const first = new Map();
  const keep = [];
  const duplicates = [];
  for (const s of order) {
    const father = norm(s.fatherName);
    const key = father ? `${s.classId}|${norm([s.name, s.lastName].filter(Boolean).join(' '))}|${father}` : null;
    if (key && first.has(key)) { duplicates.push({ student: s, keptId: first.get(key).id }); continue; }
    if (key) first.set(key, s);
    keep.push(s);
  }
  return { keep, duplicates };
}

/* The order students get their exam numbers in. `classes` is each class's
   students in order, the classes in the school's order. Class by class, or
   mixed: the first student of every class, then the second of every class...
   (a class that has run out is passed over). */
function numberingOrder(classes, mode) {
  if (mode !== 'mixed') return classes.flat();
  const out = [];
  const longest = Math.max(0, ...classes.map((c) => c.length));
  for (let i = 0; i < longest; i++) for (const c of classes) if (i < c.length) out.push(c[i]);
  return out;
}

/**
 * Each student's exam number: a fixed one as it was saved; the others (all
 * of them before the slips are first printed, afterwards those admitted
 * since) the next numbers in order. Once numbers are fixed, their mode and
 * prefix carry on, whatever the design says now.
 *   classes  [[{ id }...]...]  as for numberingOrder
 *   saved    [{ studentId, number, prefix, rollNo, mode }]
 * Returns { byStudent: Map(id -> rollNo), fresh: [{ studentId, number, prefix, rollNo }], mode, prefix, fixed }
 */
function examNumbers(classes, { mode = 'exam', start = 1001, prefix = '', saved = [] } = {}) {
  const byStudent = new Map(saved.map((r) => [r.studentId, r.rollNo]));
  const fixed = saved.length > 0;
  const useMode = fixed ? (saved[0].mode === 'mixed' ? 'mixed' : 'exam') : (mode === 'mixed' ? 'mixed' : 'exam');
  const usePrefix = fixed ? saved[0].prefix || '' : prefix || '';
  let next = fixed ? Math.max(...saved.map((r) => r.number)) + 1 : start;
  const fresh = [];
  for (const s of numberingOrder(classes.map((list) => list.filter((x) => !byStudent.has(x.id))), useMode)) {
    const number = next++;
    const rollNo = `${usePrefix}${number}`;
    byStudent.set(s.id, rollNo);
    fresh.push({ studentId: s.id, number, prefix: usePrefix, rollNo });
  }
  return { byStudent, fresh, mode: useMode, prefix: usePrefix, fixed };
}

/* What the page says about an exam's numbers. */
function numbersSummary(saved, fresh, mode) {
  const nums = saved.map((r) => r.number);
  const at = saved.reduce((m, r) => (!m || r.createdAt < m ? r.createdAt : m), null);
  const lo = saved.find((r) => r.number === Math.min(...nums));
  const hi = saved.find((r) => r.number === Math.max(...nums));
  return {
    mode,
    fixed: saved.length > 0,
    fixedAt: at,
    count: saved.length,
    from: lo?.rollNo || null,
    to: hi?.rollNo || null,
    notFixed: fresh.length, // students without a fixed number yet
  };
}

/**
 * Everything printed on the slips of an exam, one group per class-section.
 *   classIds   only these classes (the teacher's own, or the one chosen)
 *   sectionId  only this section
 *   photos     false: leave the pictures out (a count of the slips only)
 * Exam roll numbers are counted over every class of the exam, in class
 * order, so a student has the same number whichever class is printed.
 */
async function slipData(schoolId, exam, { classIds: only = null, sectionId = null, photos = true, numbering = null } = {}) {
  const forClasses = examClassIds(exam);
  const [school, classes, entries, design, saved] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, address: true, city: true, phone: true, logoUrl: true } }),
    prisma.class.findMany({
      where: { schoolId, isActive: true, ...(forClasses.length && { id: { in: forClasses } }) },
      include: { sections: { orderBy: { name: 'asc' } } },
      orderBy: [{ orderNo: 'asc' }, { id: 'asc' }],
    }),
    prisma.examTimetable.findMany({ where: { examId: exam.id, schoolId }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }] }),
    readDesign(schoolId),
    prisma.examRollNumber.findMany({ where: { schoolId, examId: exam.id }, orderBy: { number: 'asc' } }),
  ]);
  const classIds = classes.map((c) => c.id);
  const [allStudents, subjects] = await Promise.all([
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

  // One slip per child, however many times the child was recorded.
  const { keep: students, duplicates } = oneRecordEach(allStudents);

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

  // Exam roll numbers, over all of the exam's classes: the fixed ones, and
  // the next numbers for everyone else.
  const perClass = classes.map((c) => groups.filter((g) => g.classId === c.id).flatMap((g) => g.students));
  // The numbering being designed (not saved yet) when the page sends it, so
  // the preview shows the numbers that will print; fixed numbers win anyway.
  const n = numbering || {};
  const nums = examNumbers(perClass, { mode: n.mode ?? design.rollNumber, start: n.start ?? design.rollStart, prefix: n.prefix ?? design.rollPrefix, saved });
  for (const g of groups) for (const s of g.students) s.examRollNo = nums.byStudent.get(s.id);

  const inView = (classId, secId) => (!only || only.includes(classId)) && (!sectionId || secId === sectionId);
  const wanted = groups.filter((g) => inView(g.classId, g.sectionId));
  const className = (id) => classes.find((c) => c.id === id)?.name || '';
  return {
    exam: { id: exam.id, title: exam.title, term: exam.term || '', dateStart: exam.dateStart, dateEnd: exam.dateEnd },
    school: { name: school?.name || '', address: [school?.address, school?.city].filter(Boolean).join(', '), phone: school?.phone || '', logoUrl: school?.logoUrl || '' },
    design,
    groups: wanted,
    rollNumbers: numbersSummary(saved, nums.fresh, nums.mode),
    // Records left out because the same child is already printed.
    duplicates: duplicates
      .filter((d) => inView(d.student.classId, d.student.sectionId))
      .map((d) => ({
        id: d.student.id,
        name: [d.student.name, d.student.lastName].filter(Boolean).join(' '),
        fatherName: d.student.fatherName || '',
        rollNo: d.student.rollNo || '',
        className: className(d.student.classId),
        keptId: d.keptId,
        keptRollNo: allStudents.find((x) => x.id === d.keptId)?.rollNo || '',
      })),
  };
}

/**
 * Fix the exam's numbers, as printed: everyone's the first time, then those
 * of students who have none yet (admitted since). The numbering (mode, first
 * number, prefix) is the one being printed with; once fixed it carries on.
 * Returns { added, rollNumbers } or { error }.
 */
async function fixRollNumbers(schoolId, exam, input = {}) {
  const current = await readDesign(schoolId);
  const { design, error } = checkDesign({
    rollNumber: input.mode ?? current.rollNumber,
    rollStart: input.start ?? current.rollStart,
    rollPrefix: input.prefix ?? current.rollPrefix,
  }, current);
  if (error) return { error };
  if (design.rollNumber === 'student') return { error: 'These slips print the students\' own roll numbers: there is nothing to fix.' };
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = await slipData(schoolId, exam, { photos: false });
    const saved = await prisma.examRollNumber.findMany({ where: { schoolId, examId: exam.id } });
    const perClass = [];
    for (const g of data.groups) {
      let list = perClass.find((x) => x.classId === g.classId);
      if (!list) { list = { classId: g.classId, students: [] }; perClass.push(list); }
      list.students.push(...g.students);
    }
    const nums = examNumbers(perClass.map((x) => x.students), { mode: design.rollNumber, start: design.rollStart, prefix: design.rollPrefix, saved });
    if (!nums.fresh.length) return { added: 0, rollNumbers: numbersSummary(saved, [], nums.mode) };
    try {
      await prisma.$transaction(async (tx) => tx.examRollNumber.createMany({
        data: nums.fresh.map((f) => ({ schoolId, examId: exam.id, studentId: f.studentId, number: f.number, prefix: f.prefix, rollNo: f.rollNo, mode: nums.mode })),
      }));
      const all = await prisma.examRollNumber.findMany({ where: { schoolId, examId: exam.id } });
      return { added: nums.fresh.length, rollNumbers: numbersSummary(all, [], nums.mode) };
    } catch (e) {
      // Fixed by someone else at the same moment: read them again.
      if (e.code !== 'P2002') throw e;
    }
  }
  return { error: 'The numbers are being fixed by someone else right now. Try again.' };
}

/* Forget the exam's fixed numbers: they are worked out afresh from the
   design, and fixed again at the next print. */
async function resetRollNumbers(schoolId, examId) {
  const { count } = await prisma.examRollNumber.deleteMany({ where: { schoolId, examId } });
  return count;
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
  numberingOrder, examNumbers, oneRecordEach, fixRollNumbers, resetRollNumbers,
};
