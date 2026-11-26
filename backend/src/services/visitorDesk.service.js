/**
 * IlmForge — the Visitor Desk.
 *
 * Everyone who comes to the school (to ask about admission, complain, pay
 * the fee, meet a teacher, take a child early…) is written down at reception,
 * or by the visitor on the kiosk tablet and confirmed at reception:
 *
 *   - a person is a Visitor, found again by CNIC (or mobile) on the next visit;
 *   - each visit is a VisitorLog row: why they came, which children it is
 *     about, what they said (remarks), the office's own notes, and the result
 *     when they leave;
 *   - a parent finds their children by the FATHER's CNIC on the children's
 *     records (whoever comes: mother, uncle…); a record with no real CNIC
 *     (11111-1111111-1 from Students from Photos) is found by name at the desk,
 *     and the CNIC/phone the parent gives waits for the admin's approval
 *     before it is written to the child's record;
 *   - a visit starts the office's work: an admission lead, a complaint, a
 *     gate pass for a child taken early.
 *
 * The pure helpers (CNIC, phone, input checks) are exported for the tests.
 */
const crypto = require('crypto');
const prisma = require('../config/prisma');
const phoneUtil = require('../utils/phone');
const { checkPhoto } = require('../utils/photo');
const { contains: ciContains } = require('../utils/search');
const { syncParentLoginPhone } = require('./parentPhone.service');

const REASONS = {
  admission: 'Admission enquiry',
  complaint: 'Complaint',
  fee: 'Fee payment',
  meet_teacher: 'Meet a teacher',
  meet_principal: 'Meet the principal',
  early_pickup: 'Take a child early',
  result: 'Result / report card',
  documents: 'Certificate / documents',
  interview: 'Job interview',
  vendor: 'Vendor / delivery',
  other: 'Other',
};
const COMPLAINT_TYPES = {
  teacher: "Teacher's behaviour",
  studies: 'Studies / homework',
  transport: 'Transport / van',
  fee: 'Fee / billing',
  cleanliness: 'Cleanliness',
  safety: 'Bullying / safety',
  uniform: 'Uniform / books',
  other: 'Other',
};
const RELATIONS = {
  father: 'Father', mother: 'Mother', guardian: 'Guardian', grandparent: 'Grandparent',
  uncle: 'Uncle', aunt: 'Aunt', brother: 'Brother', sister: 'Sister', other: 'Other',
};
const OUTCOMES = { resolved: 'Resolved', follow_up: 'Follow-up needed', called_again: 'Called again' };
const METHODS = ['manual', 'cnic', 'phone', 'qr', 'thumb'];
// Reasons that are about a child of the school, and those that need one.
const CHILD_REASONS = new Set(['complaint', 'fee', 'meet_teacher', 'meet_principal', 'early_pickup', 'result', 'documents']);
const NEEDS_CHILD = new Set(['fee', 'early_pickup', 'result']);
const MAX_CHILDREN = 10;

/* ── CNIC ─────────────────────────────────────────────────────────────── */

const cnicDigits = (raw) => String(raw ?? '').replace(/\D/g, '');
const formatCnic = (raw) => {
  const d = cnicDigits(raw);
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : '';
};
/** A real CNIC: 13 digits, not a stand-in such as 11111-1111111-1. */
const isRealCnic = (raw) => {
  const d = cnicDigits(raw);
  return d.length === 13 && !/^(\d)\1{12}$/.test(d) && d !== '1234567890123' && d[0] !== '0';
};
/** "35202-1234567-1" → "35202-•••••••-1" (lists, the live feed). */
const maskCnic = (raw) => {
  const d = cnicDigits(raw);
  return d.length === 13 ? `${d.slice(0, 5)}-•••••••-${d.slice(12)}` : '';
};
/* The forms a CNIC may be stored in, for lookups. */
const cnicForms = (raw) => {
  const d = cnicDigits(raw);
  return d.length === 13 ? [formatCnic(d), d] : [];
};

/* ── Phone ────────────────────────────────────────────────────────────── */

/** A real Pakistani mobile (10 digits after 0 / +92): its +92 form, else ''. */
const realPhone = (raw) => phoneUtil.canonical(raw);
/** Do the last 4 digits match any real phone on record? */
const lastFourMatches = (phones, last4) => {
  const want = String(last4 ?? '').replace(/\D/g, '');
  if (want.length !== 4) return false;
  return phones.some((p) => { const c = phoneUtil.core(p); return c.length === 10 && c.endsWith(want); });
};

/* ── Time ─────────────────────────────────────────────────────────────── */

/** Midnight in Pakistan (UTC+5), whatever the server's own clock zone. */
const pkDayStart = (d = new Date()) => {
  const t = new Date(new Date(d).getTime() + 5 * 3600e3);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - 5 * 3600e3);
};
/** "2026-11-26" (a Pakistan date) → that day's [start, end). */
const pkDayRange = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return null;
  const start = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) - 5 * 3600e3);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 3600e3) };
};

/* ── The slip ─────────────────────────────────────────────────────────── */

const slipNo = (id) => `V-${id}`;
const newPassCode = () => crypto.randomBytes(5).toString('base64').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6).padEnd(6, 'X');
/** What the guard types or scans: "V-1042", "1042" or the QR "IFV-1042-AB12CD". */
function parseSlip(text) {
  const t = String(text || '').trim().toUpperCase();
  let m = /^IFV-(\d+)-([A-Z0-9]+)$/.exec(t);
  if (m) return { id: Number(m[1]), code: m[2] };
  m = /^V?-?\s*(\d{1,9})$/.exec(t);
  if (m) return { id: Number(m[1]), code: null };
  return null;
}
const qrText = (visit) => `IFV-${visit.id}-${visit.passCode || ''}`;

/* ── Input ────────────────────────────────────────────────────────────── */

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanLong = (v, max) => String(v ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const idList = (v) => [...new Set((Array.isArray(v) ? v : []).map((x) => parseInt(x, 10)).filter((x) => x > 0))];

/**
 * Checks a visit as typed at the desk or on the kiosk. Returns
 * { errors: { field: message }, data } — data holds the tidy values.
 * { kiosk: true } is stricter: CNIC and mobile are required there.
 */
function checkVisit(body = {}, { kiosk = false, late = false } = {}) {
  const errors = {};
  const v = body.visitor || {};
  const data = {
    name: clean(v.name, 80),
    cnic: '',
    noCnic: !kiosk && !!body.noCnic,
    phone: '',
    address: clean(v.address, 200),
    city: clean(v.city, 60),
    photoUrl: null,
    cnicPhotoUrl: null,
    reason: String(body.reason || ''),
    detail: clean(body.detail, 60),
    childName: clean(body.childName, 80),
    relation: String(body.relation || ''),
    fatherCnic: '',
    studentIds: idList(body.studentIds).slice(0, MAX_CHILDREN),
    remarks: cleanLong(body.remarks, 1000),
    staffNotes: kiosk ? '' : cleanLong(body.staffNotes, 1000),
    hostName: clean(body.hostName, 80),
    vehicleNo: clean(body.vehicleNo, 20).toUpperCase(),
    method: METHODS.includes(body.method) ? body.method : 'manual',
  };

  if (!data.name || !/\p{L}/u.test(data.name)) errors.name = 'Write the visitor\'s name.';

  if (v.cnic) {
    if (!isRealCnic(v.cnic)) errors.cnic = 'A CNIC has 13 digits, e.g. 35202-1234567-1.';
    else data.cnic = formatCnic(v.cnic);
  } else if (!data.noCnic && !late) {
    errors.cnic = kiosk ? 'Write your CNIC number.' : 'Write the CNIC, or tick "No CNIC".';
  }

  if (v.phone) {
    data.phone = realPhone(v.phone);
    if (!data.phone) errors.phone = 'A mobile number has 11 digits, e.g. 0300 1234567.';
  }
  if (!data.phone && !errors.phone) {
    if (kiosk) errors.phone = 'Write your mobile number.';
    else if (data.noCnic) errors.phone = 'Without a CNIC, the mobile number is needed.';
    else if (data.reason === 'admission') errors.phone = 'For admission, the mobile number is needed to call back.';
  }

  for (const k of ['photoUrl', 'cnicPhotoUrl']) {
    if (v[k]) {
      const p = checkPhoto(v[k]);
      if (p.error) errors[k] = p.error; else data[k] = p.value;
    }
  }

  if (!REASONS[data.reason]) errors.reason = 'Choose why they came.';
  if (data.reason === 'complaint') {
    if (!COMPLAINT_TYPES[data.detail]) errors.detail = 'Choose what the complaint is about.';
  } else if (data.reason !== 'admission') {
    data.detail = '';
  }
  if (data.reason !== 'admission') data.childName = '';
  if (!CHILD_REASONS.has(data.reason)) data.studentIds = [];
  if (NEEDS_CHILD.has(data.reason) && !data.studentIds.length) errors.studentIds = 'Choose the child.';
  if (data.studentIds.length && !RELATIONS[data.relation]) errors.relation = 'Choose how the visitor is related to the child.';
  if (!data.studentIds.length) data.relation = '';
  if (body.fatherCnic && isRealCnic(body.fatherCnic)) data.fatherCnic = formatCnic(body.fatherCnic);

  // The parent's details for a child whose record lacks them (desk only).
  data.recordUpdates = [];
  if (!kiosk && Array.isArray(body.recordUpdates)) {
    for (const u of body.recordUpdates.slice(0, MAX_CHILDREN)) {
      const studentId = parseInt(u?.studentId, 10);
      if (!data.studentIds.includes(studentId)) continue;
      const fix = { studentId };
      if (u.fatherName && /\p{L}/u.test(u.fatherName)) fix.fatherName = clean(u.fatherName, 100);
      if (u.fatherCnic) {
        if (isRealCnic(u.fatherCnic)) fix.fatherCnic = formatCnic(u.fatherCnic);
        else errors[`recordUpdates.${studentId}`] = 'The father\'s CNIC has 13 digits.';
      }
      if (u.phone) {
        if (realPhone(u.phone)) fix.phone = realPhone(u.phone);
        else errors[`recordUpdates.${studentId}`] = 'The mobile number has 11 digits.';
      }
      if (fix.fatherName || fix.fatherCnic || fix.phone) data.recordUpdates.push(fix);
    }
  }
  return { errors, data };
}

/* ── Children ─────────────────────────────────────────────────────────── */

const STUDENT_SELECT = {
  id: true, name: true, lastName: true, rollNo: true, fatherName: true, fatherCnic: true, motherCnic: true,
  emergencyPhone: true, motherPhone: true, photoUrl: true, status: true, classId: true, sectionId: true,
  class: { select: { name: true } }, section: { select: { name: true } },
};
const fullName = (s) => [s.name, s.lastName].filter(Boolean).join(' ');
const classOf = (s) => [s.class?.name, s.section?.name].filter(Boolean).join(' — ');

/** A child as the desk shows it (the photo only when asked for). */
function childView(s, { photo = true, dues } = {}) {
  return {
    id: s.id,
    name: fullName(s),
    rollNo: s.rollNo || '',
    className: classOf(s),
    fatherName: /\p{L}/u.test(String(s.fatherName || '')) ? s.fatherName : '',
    fatherCnicKnown: isRealCnic(s.fatherCnic),
    phoneKnown: !!realPhone(s.emergencyPhone),
    ...(photo && { photoUrl: s.photoUrl || '' }),
    ...(dues !== undefined && { dues }),
  };
}

/** The school's students whose father's (or mother's / parent account's) CNIC is this one. */
async function childrenByCnic(schoolId, cnic) {
  const forms = cnicForms(cnic);
  if (!forms.length || !isRealCnic(cnic)) return [];
  return prisma.student.findMany({
    where: {
      schoolId, deletedAt: null, status: 'active',
      OR: [
        { fatherCnic: { in: forms } },
        { motherCnic: { in: forms } },
        { parents: { some: { parent: { cnic: { in: forms } } } } },
      ],
    },
    select: { ...STUDENT_SELECT, parents: { select: { parent: { select: { user: { select: { phone: true } } } } } } },
    orderBy: { name: 'asc' },
    take: 20,
  });
}

/** Students by name, roll number or B-Form (the desk only; never the kiosk). */
async function searchStudents(schoolId, q) {
  const words = String(q || '').trim().split(/\s+/).filter(Boolean).slice(0, 4);
  if (!words.length || words.join('').length < 2) return [];
  return prisma.student.findMany({
    where: {
      schoolId, deletedAt: null, status: 'active',
      AND: words.map((w) => ({ OR: [{ name: ciContains(w) }, { lastName: ciContains(w) }, { rollNo: ciContains(w) }, { bFormNo: ciContains(w) }, { fatherName: ciContains(w) }] })),
    },
    select: STUDENT_SELECT,
    orderBy: { name: 'asc' },
    take: 15,
  });
}

/** Fee still due per child (paisa), for a visit about the fee. */
async function duesOf(schoolId, ids) {
  if (!ids.length) return {};
  const rows = await prisma.feeInvoice.groupBy({
    by: ['studentId'],
    where: { schoolId, studentId: { in: ids }, status: { in: ['unpaid', 'partial'] } },
    _sum: { dueAmount: true },
  }).catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.studentId, r._sum.dueAmount || 0]));
}

/* ── Visitors ─────────────────────────────────────────────────────────── */

async function findVisitor(schoolId, { cnic, phone }) {
  if (cnic && isRealCnic(cnic)) {
    const v = await prisma.visitor.findFirst({ where: { schoolId, cnic: formatCnic(cnic) } });
    if (v) return v;
  }
  if (phone && realPhone(phone)) {
    return prisma.visitor.findFirst({ where: { schoolId, OR: phoneUtil.variants(phone).map((p) => ({ phone: p })) }, orderBy: { lastVisitAt: 'desc' } });
  }
  return null;
}

/* The visitor's record: found by CNIC (else mobile) and brought up to date,
   or made. A visit to the desk only adds what is new; an empty field keeps
   what was there. */
async function saveVisitor(tx, schoolId, d, at = new Date()) {
  let v = null;
  if (d.cnic) v = await tx.visitor.findFirst({ where: { schoolId, cnic: d.cnic } });
  if (!v && d.phone) v = await tx.visitor.findFirst({ where: { schoolId, cnic: null, OR: phoneUtil.variants(d.phone).map((p) => ({ phone: p })) } });
  const fields = {
    name: d.name,
    ...(d.cnic && { cnic: d.cnic }),
    ...(d.phone && { phone: d.phone }),
    ...(d.address && { address: d.address }),
    ...(d.city && { city: d.city }),
    ...(d.photoUrl && { photoUrl: d.photoUrl }),
    ...(d.cnicPhotoUrl && { cnicPhotoUrl: d.cnicPhotoUrl }),
  };
  if (v) {
    return tx.visitor.update({
      where: { id: v.id },
      data: { ...fields, visitCount: { increment: 1 }, lastVisitAt: at > (v.lastVisitAt || 0) ? at : v.lastVisitAt },
    });
  }
  return tx.visitor.create({ data: { schoolId, ...fields, visitCount: 1, lastVisitAt: at } });
}

/* ── What a visit starts ──────────────────────────────────────────────── */

/**
 * The office's work a visit starts, inside the visit's transaction:
 * admission → a lead in Admission CRM; complaint → a complaint for the
 * principal; early pick-up → a gate pass for each child found by the
 * father's CNIC (the others need the office to check first; none for a
 * visit written later from the paper register).
 * Returns { linkType, linkId, urgent, gatePasses, unverified }.
 */
async function startWork(tx, { schoolId, campusId, userId, visit, d, students, late = false }) {
  const out = { linkType: null, linkId: null, urgent: false, gatePasses: [], unverified: [] };
  const names = students.map(fullName);
  if (d.reason === 'admission') {
    const lead = await tx.admissionLead.create({
      data: {
        schoolId,
        studentName: d.childName || 'Not told yet',
        parentName: d.name,
        phone: d.phone || '',
        classApplied: d.detail || null,
        source: 'walk-in',
        stage: 'visited',
        notes: [d.remarks, `Came to the school (Visitor Desk, slip ${slipNo(visit.id)}).`].filter(Boolean).join('\n'),
      },
    });
    Object.assign(out, { linkType: 'lead', linkId: lead.id });
  } else if (d.reason === 'complaint') {
    // The parent account: by the visitor's CNIC, else the child's own parent.
    const forms = cnicForms(d.cnic);
    let parent = forms.length ? await tx.parent.findFirst({ where: { schoolId, cnic: { in: forms } }, select: { id: true } }) : null;
    if (!parent && students[0]) {
      const link = await tx.parentStudent.findFirst({ where: { schoolId, studentId: students[0].id }, select: { parentId: true } });
      if (link) parent = { id: link.parentId };
    }
    const complaint = await tx.parentComplaint.create({
      data: {
        schoolId,
        campusId: campusId || null,
        subject: `${COMPLAINT_TYPES[d.detail]}${names.length ? ` — ${names.join(', ')}` : ''} (at the desk)`.slice(0, 190),
        description: [d.remarks || '(Told at the desk; nothing written.)', `${d.name}${d.relation ? ` (${RELATIONS[d.relation].toLowerCase()})` : ''}, slip ${slipNo(visit.id)}.`].join('\n\n'),
        parentId: parent?.id || null,
        studentId: students[0]?.id || null,
      },
    });
    Object.assign(out, { linkType: 'complaint', linkId: complaint.id, urgent: d.detail === 'safety' });
  } else if (d.reason === 'early_pickup' && !late) {
    // (Written later from the paper register, the child has already gone.)
    out.urgent = true;
    // A child is the visitor's to take when the CNIC they came with is the
    // father's or mother's on the child's record.
    const known = new Set([d.fatherCnic, d.cnic].filter((c) => isRealCnic(c)).map(formatCnic));
    const verified = students.filter((s) => [s.fatherCnic, s.motherCnic].some((c) => isRealCnic(c) && known.has(formatCnic(c))));
    const stamp = Date.now().toString(36).toUpperCase();
    let i = 0;
    for (const s of verified) {
      i += 1;
      const pass = await tx.gatePass.create({
        data: {
          schoolId, studentId: s.id,
          parentName: `${d.name}${d.relation ? ` (${RELATIONS[d.relation]})` : ''}`.slice(0, 120),
          reason: d.remarks ? `Early pick-up: ${d.remarks}`.slice(0, 300) : 'Early pick-up',
          passCode: `GP-${schoolId}-${stamp}${i}`,
          validDate: new Date(),
          issuedBy: userId || null,
        },
      });
      out.gatePasses.push({ studentId: s.id, name: fullName(s), passCode: pass.passCode });
      if (!out.linkId) Object.assign(out, { linkType: 'gatepass', linkId: pass.id });
    }
    out.unverified = students.filter((s) => !verified.includes(s)).map((s) => ({ studentId: s.id, name: fullName(s) }));
  }
  return out;
}

/* ── Views ────────────────────────────────────────────────────────────── */

const parseIds = (json) => { try { return idList(JSON.parse(json || '[]')); } catch { return []; } };

/**
 * Visits as the desk and the live feed show them. fullCnic: the admin sees
 * the whole CNIC; everyone else and the feed, the masked one.
 */
async function visitViews(schoolId, rows, { fullCnic = false, staffNotes = true } = {}) {
  const sids = [...new Set(rows.flatMap((r) => parseIds(r.studentIds)))];
  const uids = [...new Set(rows.flatMap((r) => [r.recordedBy, r.confirmedBy, r.checkedOutBy]).filter(Boolean))];
  const [students, users] = await Promise.all([
    sids.length ? prisma.student.findMany({ where: { schoolId, id: { in: sids } }, select: { id: true, name: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } } }) : [],
    uids.length ? prisma.user.findMany({ where: { schoolId, id: { in: uids } }, select: { id: true, name: true, role: true } }) : [],
  ]);
  const sMap = new Map(students.map((s) => [s.id, s]));
  const uMap = new Map(users.map((u) => [u.id, u]));
  const now = Date.now();
  return rows.map((r) => {
    const inside = r.status === 'in' && !r.checkoutAt;
    const end = r.checkoutAt ? new Date(r.checkoutAt).getTime() : now;
    const by = uMap.get(r.recordedBy || r.confirmedBy);
    return {
      id: r.id,
      slipNo: slipNo(r.id),
      visitorId: r.visitorId,
      visitorName: r.visitorName,
      cnic: fullCnic ? (r.cnic || '') : maskCnic(r.cnic),
      phone: r.phone || '',
      relation: r.relation || '',
      relationLabel: RELATIONS[r.relation] || '',
      reason: r.reason || '',
      reasonLabel: REASONS[r.reason] || r.purpose || 'Visit',
      detail: r.detail || '',
      detailLabel: r.reason === 'complaint' ? (COMPLAINT_TYPES[r.detail] || '') : (r.detail || ''),
      childName: r.childName || '',
      students: parseIds(r.studentIds).map((id) => sMap.get(id)).filter(Boolean).map((s) => ({ id: s.id, name: fullName(s), className: classOf(s) })),
      remarks: r.remarks || '',
      ...(staffNotes && { staffNotes: r.staffNotes || '' }),
      outcome: r.outcome || '',
      outcomeLabel: OUTCOMES[r.outcome] || '',
      hostName: r.hostName || '',
      vehicleNo: r.vehicleNo || '',
      method: r.method,
      source: r.source,
      status: r.status === 'in' && r.checkoutAt ? 'out' : r.status,
      inside,
      urgent: r.urgent,
      checkinAt: r.checkinAt,
      checkoutAt: r.checkoutAt,
      minutes: Math.max(0, Math.round((end - new Date(r.checkinAt).getTime()) / 60000)),
      link: r.linkType ? { type: r.linkType, id: r.linkId } : null,
      recordedByName: by ? by.name : (r.source === 'kiosk' ? 'Kiosk' : ''),
      recordedByRole: by?.role || '',
    };
  });
}

/* ── Record updates (after the admin approves) ───────────────────────── */

/* Writes approved parent details to a child's record: the father's name and
   CNIC (also on the parent account), and the phone (the parent's sign-in
   follows it). */
async function applyRecordUpdate(schoolId, u) {
  const s = await prisma.student.findFirst({ where: { id: u.studentId, schoolId, deletedAt: null } });
  if (!s) return { ok: false, message: 'The student is no longer on the register.' };
  const data = {};
  if (u.fatherName) data.fatherName = u.fatherName;
  if (u.fatherCnic) data.fatherCnic = u.fatherCnic;
  if (u.phone) data.emergencyPhone = u.phone;
  await prisma.student.update({ where: { id: s.id }, data });
  const links = await prisma.parentStudent.findMany({ where: { schoolId, studentId: s.id }, include: { parent: { include: { user: { select: { id: true, name: true } } } } } });
  for (const l of links) {
    if (u.fatherCnic && !isRealCnic(l.parent?.cnic)) await prisma.parent.update({ where: { id: l.parent.id }, data: { cnic: u.fatherCnic } });
    // An account made before the father's name was known is "Parent of Ali".
    if (u.fatherName && /^Parent of /i.test(l.parent?.user?.name || '')) await prisma.user.update({ where: { id: l.parent.user.id }, data: { name: u.fatherName } });
  }
  let parentLogin = null;
  if (u.phone && !phoneUtil.same(u.phone, s.emergencyPhone)) {
    parentLogin = await syncParentLoginPhone({ schoolId, studentId: s.id, oldPhone: realPhone(s.emergencyPhone) ? s.emergencyPhone : null, newPhone: u.phone })
      .catch(() => ({ changed: false, reason: 'The parent sign-in number could not be updated.' }));
  }
  return { ok: true, parentLogin };
}

/* ── Kiosk devices ────────────────────────────────────────────────────── */

const hashToken = (t) => crypto.createHash('sha256').update(String(t || '')).digest('hex');
const newKioskToken = () => crypto.randomBytes(24).toString('base64url');

module.exports = {
  REASONS, COMPLAINT_TYPES, RELATIONS, OUTCOMES, CHILD_REASONS, NEEDS_CHILD,
  cnicDigits, formatCnic, isRealCnic, maskCnic, cnicForms,
  realPhone, lastFourMatches, pkDayStart, pkDayRange,
  slipNo, newPassCode, parseSlip, qrText, checkVisit, parseIds,
  STUDENT_SELECT, fullName, classOf, childView, childrenByCnic, searchStudents, duesOf,
  findVisitor, saveVisitor, startWork, visitViews, applyRecordUpdate,
  hashToken, newKioskToken,
};
