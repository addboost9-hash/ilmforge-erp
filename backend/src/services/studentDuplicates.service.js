/**
 * Students recorded twice: the same child admitted again, imported from
 * Excel and then registered from photos, or a form saved twice.
 *
 * Records are put together when they share:
 *   - the B-Form number (a real one, not 11111-1111111-1);
 *   - the name, father's name and date of birth;
 *   - the name, father's name and parent's phone;
 *   - the name and father's name, in the same class;
 *   - the name, in the same class, when one of them has no father's name yet
 *     (".", from Students from Photos) — shown as "possibly the same child".
 *
 * For each group the record to keep is suggested: the one with fee payments,
 * then marks, attendance, a roll number, a photo, then the oldest. The office
 * deletes the extra ones (the usual delete: a record with fee payments cannot
 * be deleted, so it is the one to keep).
 */
const prisma = require('../config/prisma');

const norm = (v) => String(v || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const hasLetters = (v) => /\p{L}/u.test(String(v || ''));
const digits = (v) => String(v || '').replace(/\D/g, '');
const realId = (v) => { const d = digits(v); return d.length === 13 && !/^(\d)\1{12}$/.test(d) ? d : ''; };
const phoneCore = (v) => { const d = digits(v).slice(-10); return d.length === 10 && d[0] === '3' ? d : ''; };
const day = (d) => (d ? new Date(new Date(d).getTime() + 5 * 3600e3).toISOString().slice(0, 10) : '');
const fullName = (s) => norm([s.name, s.lastName].filter(Boolean).join(' '));

const REASONS = {
  bform: 'Same B-Form number',
  dob: 'Same name, father and date of birth',
  phone: 'Same name, father and parent phone',
  class: 'Same name and father, in the same class',
  noFather: 'Same name in the same class, and the father\'s name is missing',
};

/**
 * Groups of records that are the same child. students: [{ id, name,
 * lastName, fatherName, bFormNo, dob, emergencyPhone, classId }].
 * Returns [{ ids: [..], reasons: [key..], sure: boolean }], biggest first.
 */
function groupDuplicates(students) {
  const parent = new Map(students.map((s) => [s.id, s.id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const pairs = [];
  const join = (a, b, reason) => { if (a !== b) { pairs.push([a, b, reason]); parent.set(find(a), find(b)); } };

  const buckets = new Map();
  const add = (key, s) => { if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(s); };
  for (const s of students) {
    const name = fullName(s);
    const father = hasLetters(s.fatherName) ? norm(s.fatherName) : '';
    const b = realId(s.bFormNo);
    if (b) add(`bform|${b}`, s);
    if (name && father && s.dob) add(`dob|${name}|${father}|${day(s.dob)}`, s);
    if (name && father && phoneCore(s.emergencyPhone)) add(`phone|${name}|${father}|${phoneCore(s.emergencyPhone)}`, s);
    if (name && father && s.classId) add(`class|${s.classId}|${name}|${father}`, s);
    if (name && s.classId) add(`noFather|${s.classId}|${name}`, s);
  }
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const reason = key.split('|')[0];
    if (reason === 'bform') {
      // A number on more than 3 records is a stand-in the office typed for
      // everyone, not one child's. Otherwise the first names must agree too
      // ("Ayesha" and "Ayesha Bibi"), so a mistyped B-Form joins nobody.
      if (list.length > 3) continue;
      const first = (x) => fullName(x).split(' ')[0];
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (first(list[i]) === first(list[j])) join(list[i].id, list[j].id, reason);
    } else if (reason === 'noFather') {
      // Only a record without the father's name joins the others here: two
      // children of the same name with different fathers stay apart.
      for (const u of list.filter((s) => !hasLetters(s.fatherName))) for (const o of list) join(u.id, o.id, reason);
    } else {
      for (let i = 1; i < list.length; i++) join(list[0].id, list[i].id, reason);
    }
  }
  const groups = new Map();
  for (const s of students) {
    const r = find(s.id);
    if (!groups.has(r)) groups.set(r, { ids: [], reasons: new Set() });
    groups.get(r).ids.push(s.id);
  }
  for (const [a, , reason] of pairs) groups.get(find(a)).reasons.add(reason);
  return [...groups.values()]
    .filter((g) => g.ids.length > 1)
    .map((g) => ({ ids: g.ids.sort((x, y) => x - y), reasons: [...g.reasons], sure: [...g.reasons].some((x) => x !== 'noFather') }))
    .sort((x, y) => Number(y.sure) - Number(x.sure) || y.ids.length - x.ids.length || x.ids[0] - y.ids[0]);
}

/** The record to keep: payments, then marks, attendance, roll number, photo, father's name, then the oldest. */
function keepOf(records) {
  const score = (r) => r.payments * 1e6 + r.marks * 1e3 + r.attendance + (r.rollNo ? 0.5 : 0) + (r.hasPhoto ? 0.25 : 0) + (r.fatherKnown ? 0.1 : 0);
  return [...records].sort((a, b) => score(b) - score(a) || a.id - b.id)[0]?.id;
}

/** The school's duplicate groups, with each record's details and what it holds. */
async function findDuplicates(schoolId) {
  const students = await prisma.student.findMany({
    where: { schoolId, deletedAt: null, status: 'active' },
    select: { id: true, name: true, lastName: true, fatherName: true, bFormNo: true, dob: true, emergencyPhone: true, classId: true },
  });
  const groups = groupDuplicates(students);
  const ids = groups.flatMap((g) => g.ids);
  if (!ids.length) return [];
  const [rows, payments, invoices, attendance, marks] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, id: { in: ids } },
      select: {
        id: true, name: true, lastName: true, rollNo: true, fatherName: true, bFormNo: true, dob: true, emergencyPhone: true,
        admissionDate: true, createdAt: true, photoUrl: true, status: true,
        class: { select: { name: true } }, section: { select: { name: true } },
      },
    }),
    prisma.feePayment.groupBy({ by: ['studentId'], where: { schoolId, studentId: { in: ids }, voidedAt: null }, _count: { _all: true } }).catch(() => []),
    prisma.feeInvoice.groupBy({ by: ['studentId'], where: { schoolId, studentId: { in: ids } }, _count: { _all: true } }).catch(() => []),
    prisma.attendance.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }).catch(() => []),
    prisma.examMark.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }).catch(() => []),
  ]);
  const count = (list) => new Map(list.map((r) => [r.studentId, r._count._all]));
  const [p, inv, att, mk] = [count(payments), count(invoices), count(attendance), count(marks)];
  const byId = new Map(rows.map((s) => [s.id, {
    id: s.id,
    name: [s.name, s.lastName].filter(Boolean).join(' '),
    className: [s.class?.name, s.section?.name].filter(Boolean).join(' — '),
    rollNo: s.rollNo || '',
    fatherName: hasLetters(s.fatherName) ? s.fatherName : '',
    fatherKnown: hasLetters(s.fatherName),
    bFormNo: s.bFormNo || '',
    dob: s.dob,
    phone: phoneCore(s.emergencyPhone) ? s.emergencyPhone : '',
    admissionDate: s.admissionDate,
    createdAt: s.createdAt,
    photoUrl: s.photoUrl || '',
    hasPhoto: !!s.photoUrl,
    payments: p.get(s.id) || 0,
    invoices: inv.get(s.id) || 0,
    attendance: att.get(s.id) || 0,
    marks: mk.get(s.id) || 0,
  }]));
  return groups.map((g) => {
    const records = g.ids.map((id) => byId.get(id)).filter(Boolean);
    return { sure: g.sure, reasons: g.reasons.map((r) => REASONS[r]), keepId: keepOf(records), students: records };
  });
}

module.exports = { groupDuplicates, keepOf, findDuplicates, REASONS };
