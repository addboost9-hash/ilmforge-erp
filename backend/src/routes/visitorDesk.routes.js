/**
 * IlmForge — the Visitor Desk (reception), /api/v1/visitor-desk.
 *
 * Reception (the admin, or a Gate & Reception account) writes down everyone
 * who comes, checks them out, and confirms what visitors filled in on the
 * kiosk. The admin also sees the live feed, approves parents' details for
 * children's records and sets up kiosk tablets. See visitorDesk.service.js.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { contains: ciContains } = require('../utils/search');
const vd = require('../services/visitorDesk.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const DESK_ROLES = ['super_admin', 'admin', 'gatekeeper'];
const ADMIN_ROLES = ['super_admin', 'admin'];
const isAdmin = (req) => ADMIN_ROLES.includes(req.user?.role);
const bad = (res, message, code = 400, extra = {}) => res.status(code).json({ success: false, message, ...extra });

router.use((req, res, next) => (DESK_ROLES.includes(req.user?.role) ? next() : bad(res, 'Reception or admin access required.', 403)));
const adminOnly = (req, res, next) => (isAdmin(req) ? next() : bad(res, 'Only the admin can do this.', 403));

const audit = (req, action, id, details) => prisma.auditLog.create({
  data: { schoolId: req.schoolId, userId: req.user?.id || null, action, resource: 'visitor', resourceId: id || null, details: details ? JSON.stringify(details) : null },
}).catch(() => null);

const firstError = (errors) => Object.values(errors)[0];

// GET /options — the lists the desk's form chooses from
router.get('/options', wrap(async (req, res) => {
  const [classes, staff] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: req.schoolId, isActive: true }, select: { name: true }, orderBy: [{ orderNo: 'asc' }, { id: 'asc' }] }),
    prisma.staff.findMany({ where: { schoolId: req.schoolId, deletedAt: null, isActive: true }, select: { name: true, designation: true }, orderBy: { name: 'asc' }, take: 300 }).catch(() => []),
  ]);
  res.json({
    success: true,
    data: {
      reasons: vd.REASONS, complaintTypes: vd.COMPLAINT_TYPES, relations: vd.RELATIONS, outcomes: vd.OUTCOMES,
      childReasons: [...vd.CHILD_REASONS], needsChild: [...vd.NEEDS_CHILD],
      classes: classes.map((c) => c.name),
      staff: staff.map((s) => (s.designation ? `${s.name} (${s.designation})` : s.name)),
      isAdmin: isAdmin(req),
    },
  });
}));

/* The children a CNIC finds, with their photos and the fee still due. */
async function childrenFor(schoolId, cnic) {
  const kids = await vd.childrenByCnic(schoolId, cnic);
  const dues = await vd.duesOf(schoolId, kids.map((k) => k.id));
  return kids.map((k) => vd.childView(k, { dues: dues[k.id] || 0 }));
}

// GET /lookup?cnic=&phone= — a visitor who came before, and the children of a CNIC
router.get('/lookup', wrap(async (req, res) => {
  const cnic = String(req.query.cnic || '');
  const phone = String(req.query.phone || '');
  const filler = vd.cnicDigits(cnic).length === 13 && !vd.isRealCnic(cnic);
  const visitor = await vd.findVisitor(req.schoolId, { cnic, phone });
  let recent = [];
  if (visitor) {
    const rows = await prisma.visitorLog.findMany({ where: { schoolId: req.schoolId, visitorId: visitor.id, status: { not: 'pending' } }, orderBy: { checkinAt: 'desc' }, take: 5 });
    recent = await vd.visitViews(req.schoolId, rows, { fullCnic: isAdmin(req) });
  }
  // The CNIC typed was this person's own: the admin sees it whole; a visitor
  // found by mobile shows the desk only part of theirs.
  const typed = vd.isRealCnic(cnic) && visitor?.cnic === vd.formatCnic(cnic);
  res.json({
    success: true,
    data: {
      filler,
      visitor: visitor && {
        id: visitor.id, name: visitor.name,
        cnic: isAdmin(req) || typed ? (visitor.cnic || '') : vd.maskCnic(visitor.cnic),
        cnicKnown: !!visitor.cnic,
        phone: visitor.phone || '', address: visitor.address || '', city: visitor.city || '',
        photoUrl: visitor.photoUrl || '', hasCnicPhoto: !!visitor.cnicPhotoUrl,
        visitCount: visitor.visitCount, lastVisitAt: visitor.lastVisitAt, recent,
      },
      children: vd.isRealCnic(cnic) ? await childrenFor(req.schoolId, cnic) : [],
    },
  });
}));

// GET /children?cnic= — the children whose father's CNIC this is
router.get('/children', wrap(async (req, res) => {
  const cnic = String(req.query.cnic || '');
  if (vd.cnicDigits(cnic).length !== 13) return bad(res, 'A CNIC has 13 digits.');
  if (!vd.isRealCnic(cnic)) {
    return res.json({ success: true, data: [], filler: true, message: 'This CNIC is a stand-in (all the same digit): find the child by name instead.' });
  }
  res.json({ success: true, data: await childrenFor(req.schoolId, cnic) });
}));

// GET /students?q= — a child by name, roll number or B-Form (reception only; never the kiosk)
router.get('/students', wrap(async (req, res) => {
  const kids = await vd.searchStudents(req.schoolId, req.query.q);
  const dues = await vd.duesOf(req.schoolId, kids.map((k) => k.id));
  res.json({ success: true, data: kids.map((k) => vd.childView(k, { dues: dues[k.id] || 0 })) });
}));

/* The children of a visit, as on the register, or an error. */
async function studentsOf(schoolId, ids) {
  if (!ids.length) return [];
  return prisma.student.findMany({ where: { schoolId, id: { in: ids }, deletedAt: null }, select: vd.STUDENT_SELECT });
}

/* A new visit, at the desk or written later from the paper register. */
async function createVisit(req, res, { late }) {
  const { errors, data: d } = vd.checkVisit(req.body, { late });
  const schoolId = req.schoolId;
  const students = await studentsOf(schoolId, d.studentIds);
  if (students.length !== d.studentIds.length) errors.studentIds = 'A child chosen is not on the register.';
  const existing = await vd.findVisitor(schoolId, d);
  if (!late && !existing && !d.address && d.reason !== 'vendor') errors.address = 'This is their first visit: write the address.';

  let checkinAt = new Date();
  let checkoutAt = null;
  if (late) {
    checkinAt = new Date(req.body.checkinAt);
    checkoutAt = req.body.checkoutAt ? new Date(req.body.checkoutAt) : null;
    const week = Date.now() - 8 * 24 * 3600e3;
    if (Number.isNaN(checkinAt.getTime()) || checkinAt.getTime() > Date.now() + 60e3 || checkinAt.getTime() < week) errors.checkinAt = 'The time they came: within the last week, not later than now.';
    else if (checkoutAt && (Number.isNaN(checkoutAt.getTime()) || checkoutAt < checkinAt || checkoutAt.getTime() > Date.now() + 60e3)) errors.checkoutAt = 'The time they left is after the time they came, and not later than now.';
  }
  if (Object.keys(errors).length) return bad(res, firstError(errors), 400, { errors });

  const result = await prisma.$transaction(async (tx) => {
    const visitor = await vd.saveVisitor(tx, schoolId, d, checkinAt);
    const visit = await tx.visitorLog.create({
      data: {
        schoolId, campusId: req.campusId || null,
        visitorName: d.name, phone: d.phone || null, cnic: d.cnic || null,
        purpose: vd.REASONS[d.reason], hostName: d.hostName || null, vehicleNo: d.vehicleNo || null,
        visitorId: visitor.id, relation: d.relation || null, reason: d.reason, detail: d.detail || null, childName: d.childName || null,
        studentIds: d.studentIds.length ? JSON.stringify(d.studentIds) : null,
        remarks: d.remarks || null, staffNotes: d.staffNotes || null,
        method: d.method, source: late ? 'late' : 'desk', status: checkoutAt ? 'out' : 'in',
        passCode: vd.newPassCode(), checkinAt, checkoutAt,
        recordedBy: req.user.id, ...(checkoutAt && { checkedOutBy: req.user.id }),
      },
    });
    const work = await vd.startWork(tx, { schoolId, campusId: req.campusId, userId: req.user.id, visit, d, students, late });
    const saved = await tx.visitorLog.update({ where: { id: visit.id }, data: { linkType: work.linkType, linkId: work.linkId, urgent: work.urgent } });
    // A parent's details for children whose records lack them: they wait
    // for the admin. Only what the record does not have yet.
    let updates = 0;
    for (const u of d.recordUpdates) {
      const s = students.find((x) => x.id === u.studentId);
      const fix = {};
      if (u.fatherName && !/\p{L}/u.test(String(s.fatherName || ''))) fix.fatherName = u.fatherName;
      if (u.fatherCnic && !vd.isRealCnic(s.fatherCnic)) fix.fatherCnic = u.fatherCnic;
      if (u.phone && !vd.realPhone(s.emergencyPhone)) fix.phone = u.phone;
      if (!Object.keys(fix).length) continue;
      await tx.visitorRecordUpdate.create({ data: { schoolId, studentId: s.id, visitId: visit.id, ...fix, requestedBy: req.user.id } });
      updates += 1;
    }
    return { visit: saved, work, updates };
  });

  await audit(req, late ? 'VISITOR_LATE_ENTRY' : 'VISITOR_CHECKIN', result.visit.id, { reason: d.reason, students: d.studentIds });
  const [view] = await vd.visitViews(schoolId, [result.visit], { fullCnic: isAdmin(req) });
  const notes = [];
  if (result.work.linkType === 'lead') notes.push('An admission lead was added to Admission CRM.');
  if (result.work.linkType === 'complaint') notes.push('The complaint was sent to the principal (Complaints).');
  if (result.work.gatePasses.length) notes.push(`Gate pass: ${result.work.gatePasses.map((g) => `${g.name} ${g.passCode}`).join(', ')}.`);
  if (result.work.unverified.length) notes.push(`No gate pass for ${result.work.unverified.map((u) => u.name).join(', ')}: the CNIC given is not the father's or mother's on the record. Check with the office, then issue one from Gate Control.`);
  if (result.updates) notes.push(`${result.updates === 1 ? 'One record update waits' : `${result.updates} record updates wait`} for the admin's approval.`);
  res.status(201).json({
    success: true,
    data: { visit: view, qr: vd.qrText(result.visit), gatePasses: result.work.gatePasses, unverified: result.work.unverified, recordUpdates: result.updates },
    message: [`${view.slipNo}: ${d.name} checked in.`, ...notes].join(' '),
  });
}

router.post('/visits', wrap((req, res) => createVisit(req, res, { late: false })));
// POST /visits/late — from the paper register, with the times written there
router.post('/visits/late', wrap((req, res) => createVisit(req, res, { late: true })));

// GET /visits?scope=inside|pending|today|date&date=YYYY-MM-DD&q=
router.get('/visits', wrap(async (req, res) => {
  const scope = String(req.query.scope || 'today');
  const where = { schoolId: req.schoolId };
  if (scope === 'inside') Object.assign(where, { status: 'in', checkoutAt: null });
  else if (scope === 'pending') Object.assign(where, { status: 'pending' });
  else {
    const range = scope === 'date' ? vd.pkDayRange(req.query.date) : null;
    const start = range ? range.start : vd.pkDayStart();
    where.checkinAt = { gte: start, ...(range && { lt: range.end }) };
    where.status = { not: 'pending' };
  }
  const q = String(req.query.q || '').trim();
  if (q) {
    const digits = q.replace(/\D/g, '');
    where.OR = [{ visitorName: ciContains(q) }, ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-10) } }, { cnic: { contains: digits.length === 13 ? vd.formatCnic(digits) : digits } }] : [])];
  }
  const rows = await prisma.visitorLog.findMany({ where, orderBy: { checkinAt: 'desc' }, take: 300 });
  const [inside, pending] = await Promise.all([
    prisma.visitorLog.count({ where: { schoolId: req.schoolId, status: 'in', checkoutAt: null } }),
    prisma.visitorLog.count({ where: { schoolId: req.schoolId, status: 'pending' } }),
  ]);
  res.json({ success: true, data: await vd.visitViews(req.schoolId, rows, { fullCnic: isAdmin(req) }), counts: { inside, pending } });
}));

// GET /visits/:id — one visit, with the visitor's photos and a kiosk entry's details
router.get('/visits/:id', wrap(async (req, res) => {
  const row = await prisma.visitorLog.findFirst({ where: { id: parseInt(req.params.id, 10), schoolId: req.schoolId } });
  if (!row) return bad(res, 'Visit not found.', 404);
  const [view] = await vd.visitViews(req.schoolId, [row], { fullCnic: isAdmin(req) });
  const visitor = row.visitorId ? await prisma.visitor.findFirst({ where: { id: row.visitorId, schoolId: req.schoolId } }) : null;
  let kiosk = null;
  try { kiosk = row.kioskData ? JSON.parse(row.kioskData) : null; } catch { kiosk = null; }
  res.json({
    success: true,
    data: {
      ...view,
      qr: vd.qrText(row),
      address: visitor?.address || kiosk?.address || '',
      city: visitor?.city || kiosk?.city || '',
      photoUrl: visitor?.photoUrl || kiosk?.photoUrl || '',
      cnicPhotoUrl: isAdmin(req) ? (visitor?.cnicPhotoUrl || kiosk?.cnicPhotoUrl || '') : '',
      visitCount: visitor?.visitCount || 0,
    },
  });
}));

// POST /visits/:id/confirm — a kiosk entry, checked by reception
router.post('/visits/:id/confirm', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await prisma.visitorLog.findFirst({ where: { id, schoolId: req.schoolId, status: 'pending' } });
  if (!row) return bad(res, 'This kiosk entry was already confirmed or cancelled.', 409);
  let k = {};
  try { k = JSON.parse(row.kioskData || '{}'); } catch { k = {}; }
  const ids = vd.parseIds(row.studentIds);
  const students = await studentsOf(req.schoolId, ids);
  const d = {
    name: row.visitorName, cnic: row.cnic || '', phone: row.phone || '', address: k.address || '', city: k.city || '',
    photoUrl: k.photoUrl || null, cnicPhotoUrl: k.cnicPhotoUrl || null,
    reason: row.reason, detail: row.detail || '', childName: row.childName || '', relation: row.relation || '',
    fatherCnic: k.fatherCnic || '', remarks: row.remarks || '', studentIds: ids,
  };
  const staffNotes = String(req.body?.staffNotes || '').trim().slice(0, 1000);
  const hostName = String(req.body?.hostName || '').trim().slice(0, 80);
  const result = await prisma.$transaction(async (tx) => {
    const { count } = await tx.visitorLog.updateMany({ where: { id, status: 'pending' }, data: { status: 'in', confirmedBy: req.user.id } });
    if (count !== 1) return null;
    const visitor = await vd.saveVisitor(tx, req.schoolId, d, row.checkinAt);
    const work = await vd.startWork(tx, { schoolId: req.schoolId, campusId: req.campusId, userId: req.user.id, visit: row, d, students });
    const saved = await tx.visitorLog.update({
      where: { id },
      data: {
        visitorId: visitor.id, kioskData: null, linkType: work.linkType, linkId: work.linkId, urgent: work.urgent,
        passCode: row.passCode || vd.newPassCode(),
        ...(staffNotes && { staffNotes }), ...(hostName && { hostName }),
      },
    });
    return { visit: saved, work };
  });
  if (!result) return bad(res, 'This kiosk entry was just confirmed at another desk.', 409);
  await audit(req, 'VISITOR_KIOSK_CONFIRMED', id, { reason: row.reason });
  const [view] = await vd.visitViews(req.schoolId, [result.visit], { fullCnic: isAdmin(req) });
  res.json({ success: true, data: { visit: view, qr: vd.qrText(result.visit), gatePasses: result.work.gatePasses, unverified: result.work.unverified }, message: `${view.slipNo}: ${row.visitorName} checked in.` });
}));

// POST /visits/:id/cancel — a kiosk entry that was a mistake, or a visit entered by mistake
router.post('/visits/:id/cancel', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { count } = await prisma.visitorLog.updateMany({ where: { id, schoolId: req.schoolId, status: { in: ['pending', 'in'] }, checkoutAt: null }, data: { status: 'cancelled', kioskData: null, staffNotes: req.body?.reason ? String(req.body.reason).slice(0, 300) : undefined } });
  if (!count) return bad(res, 'Only an entry still open can be cancelled.', 409);
  await audit(req, 'VISITOR_CANCELLED', id);
  res.json({ success: true, message: 'Entry cancelled.' });
}));

/* Checks a visitor out (once, even from two gates at the same moment). */
async function checkout(req, res, row, method) {
  const outcome = vd.OUTCOMES[req.body?.outcome] ? req.body.outcome : undefined;
  const staffNotes = req.body?.staffNotes !== undefined ? String(req.body.staffNotes).trim().slice(0, 1000) : undefined;
  if (row.status === 'pending') return bad(res, 'This kiosk entry is not confirmed yet.', 409);
  if (row.status === 'cancelled') return bad(res, 'This entry was cancelled.', 409);
  const { count } = await prisma.visitorLog.updateMany({
    where: { id: row.id, status: 'in', checkoutAt: null },
    data: { status: 'out', checkoutAt: new Date(), checkedOutBy: req.user.id, ...(outcome && { outcome }), ...(staffNotes !== undefined && { staffNotes: staffNotes || null }) },
  });
  if (!count) return bad(res, `${row.visitorName} (${vd.slipNo(row.id)}) has already left.`, 409);
  await audit(req, 'VISITOR_CHECKOUT', row.id, { method });
  const saved = await prisma.visitorLog.findUnique({ where: { id: row.id } });
  const [view] = await vd.visitViews(req.schoolId, [saved], { fullCnic: isAdmin(req) });
  return res.json({ success: true, data: view, message: `${row.visitorName} (${view.slipNo}) checked out after ${view.minutes} min.` });
}

// POST /visits/:id/checkout { outcome, staffNotes }
router.post('/visits/:id/checkout', wrap(async (req, res) => {
  const row = await prisma.visitorLog.findFirst({ where: { id: parseInt(req.params.id, 10), schoolId: req.schoolId } });
  if (!row) return bad(res, 'Visit not found.', 404);
  return checkout(req, res, row, 'list');
}));

// POST /checkout { code } — the slip's number typed, or its QR code scanned
router.post('/checkout', wrap(async (req, res) => {
  const slip = vd.parseSlip(req.body?.code);
  if (!slip) return bad(res, 'Type the slip number (e.g. V-1042) or scan its QR code.');
  const row = await prisma.visitorLog.findFirst({ where: { id: slip.id, schoolId: req.schoolId } });
  if (!row || (slip.code && row.passCode && slip.code !== row.passCode)) return bad(res, 'No visitor with this slip at this school.', 404);
  return checkout(req, res, row, slip.code ? 'qr' : 'number');
}));

// PUT /visits/:id/notes { staffNotes, outcome } — the office's notes, any time
router.put('/visits/:id/notes', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await prisma.visitorLog.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!row) return bad(res, 'Visit not found.', 404);
  const data = {};
  if (req.body?.staffNotes !== undefined) data.staffNotes = String(req.body.staffNotes).trim().slice(0, 1000) || null;
  if (req.body?.outcome !== undefined) data.outcome = vd.OUTCOMES[req.body.outcome] ? req.body.outcome : null;
  const saved = await prisma.visitorLog.update({ where: { id }, data });
  const [view] = await vd.visitViews(req.schoolId, [saved], { fullCnic: isAdmin(req) });
  res.json({ success: true, data: view, message: 'Saved.' });
}));

// GET /feed — the admin's live feed: today's visits, newest first
router.get('/feed', adminOnly, wrap(async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-cache');
  const start = vd.pkDayStart();
  const rows = await prisma.visitorLog.findMany({
    where: { schoolId: req.schoolId, OR: [{ checkinAt: { gte: start } }, { status: 'in', checkoutAt: null }, { status: 'pending' }] },
    orderBy: { checkinAt: 'desc' }, take: 150,
  });
  const visits = await vd.visitViews(req.schoolId, rows, { fullCnic: false });
  const today = visits.filter((v) => new Date(v.checkinAt) >= start && v.status !== 'cancelled' && v.status !== 'pending');
  const byReason = {};
  for (const v of today) byReason[v.reason || 'other'] = (byReason[v.reason || 'other'] || 0) + 1;
  const updates = await prisma.visitorRecordUpdate.count({ where: { schoolId: req.schoolId, status: 'pending' } });
  res.json({
    success: true,
    data: {
      visits,
      counts: {
        today: today.length,
        inside: visits.filter((v) => v.inside).length,
        pending: visits.filter((v) => v.status === 'pending').length,
        urgent: visits.filter((v) => v.urgent && v.inside).length,
        complaints: byReason.complaint || 0,
        admissions: byReason.admission || 0,
        byReason,
        recordUpdates: updates,
      },
      at: new Date(),
    },
  });
}));

// GET /record-updates?status=pending — parents' details waiting for approval
router.get('/record-updates', adminOnly, wrap(async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const rows = await prisma.visitorRecordUpdate.findMany({ where: { schoolId: req.schoolId, status }, orderBy: { createdAt: 'desc' }, take: 200 });
  const students = rows.length ? await prisma.student.findMany({ where: { schoolId: req.schoolId, id: { in: [...new Set(rows.map((r) => r.studentId))] } }, select: vd.STUDENT_SELECT }) : [];
  const visits = rows.length ? await prisma.visitorLog.findMany({ where: { schoolId: req.schoolId, id: { in: rows.map((r) => r.visitId).filter(Boolean) } }, select: { id: true, visitorName: true, relation: true, checkinAt: true } }) : [];
  const sMap = new Map(students.map((s) => [s.id, s]));
  const vMap = new Map(visits.map((v) => [v.id, v]));
  res.json({
    success: true,
    data: rows.map((r) => {
      const s = sMap.get(r.studentId);
      const v = vMap.get(r.visitId);
      return {
        id: r.id, status: r.status, createdAt: r.createdAt,
        student: s ? { id: s.id, name: vd.fullName(s), className: vd.classOf(s), rollNo: s.rollNo || '' } : null,
        now: s ? { fatherName: s.fatherName || '', fatherCnic: s.fatherCnic || '', phone: s.emergencyPhone || '' } : null,
        proposed: { fatherName: r.fatherName || '', fatherCnic: r.fatherCnic || '', phone: r.phone || '' },
        by: v ? { visitId: v.id, slipNo: vd.slipNo(v.id), name: v.visitorName, relation: vd.RELATIONS[v.relation] || '', at: v.checkinAt } : null,
      };
    }),
  });
}));

// POST /record-updates/:id/approve | /reject
router.post('/record-updates/:id/:decision', adminOnly, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const decision = req.params.decision;
  if (!['approve', 'reject'].includes(decision)) return bad(res, 'Approve or reject.', 404);
  const row = await prisma.visitorRecordUpdate.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!row) return bad(res, 'Not found.', 404);
  const { count } = await prisma.visitorRecordUpdate.updateMany({
    where: { id, status: 'pending' },
    data: { status: decision === 'approve' ? 'approved' : 'rejected', decidedBy: req.user.id, decidedAt: new Date() },
  });
  if (!count) return bad(res, 'This was already decided.', 409);
  if (decision === 'reject') {
    await audit(req, 'VISITOR_RECORD_UPDATE_REJECTED', id, { studentId: row.studentId });
    return res.json({ success: true, message: 'Rejected: the record is unchanged.' });
  }
  const applied = await vd.applyRecordUpdate(req.schoolId, row);
  if (!applied.ok) {
    await prisma.visitorRecordUpdate.update({ where: { id }, data: { status: 'pending', decidedBy: null, decidedAt: null } });
    return bad(res, applied.message, 409);
  }
  await audit(req, 'VISITOR_RECORD_UPDATE_APPROVED', id, { studentId: row.studentId, fields: ['fatherName', 'fatherCnic', 'phone'].filter((k) => row[k]) });
  const login = applied.parentLogin;
  res.json({
    success: true,
    data: { parentLogin: login },
    message: `Saved to the student's record.${login?.changed ? ' The parent now signs in with this number.' : login?.reason ? ` ${login.reason}` : ''}`,
  });
}));

/* ── Kiosk tablets (admin) ───────────────────────────────────────────── */

router.get('/kiosks', adminOnly, wrap(async (req, res) => {
  const rows = await prisma.kioskDevice.findMany({ where: { schoolId: req.schoolId, revokedAt: null }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: rows.map((k) => ({ id: k.id, name: k.name, createdAt: k.createdAt, lastSeenAt: k.lastSeenAt })) });
}));

// POST /kiosks { name } — the key is shown once, as a link to open on the tablet
router.post('/kiosks', adminOnly, wrap(async (req, res) => {
  const name = String(req.body?.name || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Reception kiosk';
  const count = await prisma.kioskDevice.count({ where: { schoolId: req.schoolId, revokedAt: null } });
  if (count >= 10) return bad(res, 'A school can have up to 10 kiosk tablets. Remove one first.');
  const token = vd.newKioskToken();
  const k = await prisma.kioskDevice.create({ data: { schoolId: req.schoolId, name, tokenHash: vd.hashToken(token), createdBy: req.user.id } });
  await audit(req, 'KIOSK_CREATED', k.id, { name });
  res.status(201).json({ success: true, data: { id: k.id, name: k.name, token }, message: `${name} is ready: open its link on the tablet.` });
}));

router.delete('/kiosks/:id', adminOnly, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { count } = await prisma.kioskDevice.updateMany({ where: { id, schoolId: req.schoolId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!count) return bad(res, 'Kiosk not found.', 404);
  await audit(req, 'KIOSK_REMOVED', id);
  res.json({ success: true, message: 'Removed: that tablet can no longer add visitors.' });
}));

module.exports = router;
