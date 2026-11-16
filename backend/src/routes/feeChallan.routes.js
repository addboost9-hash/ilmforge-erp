/**
 * Bank challans — /api/v1/fees/challans (finance roles; mounted by fee.routes).
 *
 * A challan lists a student's unpaid months as they stood when it was
 * printed, with the account of the student's campus. The parent deposits it
 * at the bank, so the money goes straight into the school's account; the
 * school then records the deposit against the challan number (typed, or
 * matched from the bank statement), which pays those months oldest first.
 * A school without a bank account prints the same slip without bank details
 * and collects it at the counter.
 *
 *   GET  /setup             letterhead, campuses, each campus's account, challan settings
 *   GET  /                  issued challans (status, class, search)
 *   POST /issue             print challans: one student (chosen months) or a class
 *   GET  /find/:no          one challan with what its months owe now
 *   POST /deposits          record deposits: [{ challanNo, amount, date, bankRef }]
 *   POST /match             check bank statement rows against the challans
 *   POST /:id/cancel        cancel a challan not paid yet
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { readSettings } = require('../utils/schoolSettings');
const { pastDate } = require('../utils/pastDate');
const { contains: ciContains } = require('../utils/search');
const {
  oldestFirst, periodText, applyPayments, challanPrefix, challanNumber, cleanChallanNo,
  bankFor, challanSettings, pkDayOf, dueDay, rs, bad,
} = require('../services/feeCollect.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const dmyOf = (d) => pkDayOf(d).split('-').reverse().join('/');
const MAX_STUDENTS = 3000;
const STATUSES = ['open', 'paid', 'part_paid', 'replaced', 'cancelled'];

const STUDENT_SELECT = {
  id: true, name: true, rollNo: true, fatherName: true, campusId: true, classId: true, sectionId: true, status: true,
  class: { select: { name: true, orderNo: true } }, section: { select: { name: true } },
};
const studentView = (s) => (s ? {
  id: s.id, name: s.name, rollNo: s.rollNo || '', fatherName: s.fatherName || '',
  className: s.class?.name || '', sectionName: s.section?.name || '', classId: s.classId, sectionId: s.sectionId,
} : null);
const byRoll = (a, b) => String(a.rollNo || '').localeCompare(String(b.rollNo || ''), undefined, { numeric: true }) || a.name.localeCompare(b.name);
const byClassThenRoll = (a, b) =>
  ((a.class?.orderNo ?? 999) - (b.class?.orderNo ?? 999)) || String(a.class?.name || '').localeCompare(String(b.class?.name || ''), undefined, { numeric: true })
  || String(a.section?.name || '').localeCompare(String(b.section?.name || '')) || byRoll(a, b);

const parseItems = (c) => { try { return JSON.parse(c.itemsJson || '[]') || []; } catch { return []; } };

/** Everything a printed challan needs besides the challan itself. */
async function printContext(schoolId) {
  const [school, campuses, settings] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, address: true, phone: true, logoUrl: true } }),
    prisma.campus.findMany({ where: { schoolId }, select: { id: true, name: true, address: true, phone: true, isMain: true }, orderBy: [{ isMain: 'desc' }, { name: 'asc' }] }),
    readSettings(schoolId),
  ]);
  const payment = settings.payment || {};
  const banks = Object.fromEntries(campuses.map((c) => [c.id, bankFor(payment, c.id)]));
  const voucher = payment.voucher || {};
  return {
    school: school || {},
    campuses: campuses.map((c) => ({ ...c, bank: banks[c.id] })),
    schoolBank: bankFor(payment, null),
    banks,
    settings: { ...challanSettings(payment), copies: ['1', '2', '3'].includes(String(voucher.copies)) ? Number(voucher.copies) : 3 },
  };
}

function challanView(c, student, ctx) {
  const campus = ctx?.campuses?.find((x) => x.id === c.campusId);
  return {
    id: c.id, challanNo: c.challanNo, studentId: c.studentId, campusId: c.campusId, campusName: campus?.name || '',
    items: parseItems(c), amount: c.amount, lateFee: c.lateFee,
    dueDate: pkDayOf(c.dueDate), issuedOn: pkDayOf(c.createdAt), status: c.status,
    paidAmount: c.paidAmount, paidOn: c.paidOn ? pkDayOf(c.paidOn) : null, bankRef: c.bankRef, receiptNo: c.receiptNo,
    student: studentView(student),
    bank: ctx ? (ctx.banks[c.campusId] ?? ctx.schoolBank) : undefined,
  };
}

// GET /setup — what the challan screens are chosen and printed with.
router.get('/setup', wrap(async (req, res) => {
  const ctx = await printContext(req.schoolId);
  res.json({ success: true, data: { school: ctx.school, campuses: ctx.campuses, schoolBank: ctx.schoolBank, settings: ctx.settings, today: pkDayOf() } });
}));

// GET / — issued challans, newest first.
// ?status=open|paid|part_paid|replaced|cancelled  ?classId  ?sectionId  ?q (number or name)  ?limit ?offset
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { status, classId, sectionId, q } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const where = { schoolId };
  if (status && status !== 'all') {
    if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}.` });
    where.status = status;
  }
  const studentWhere = {};
  if (classId) studentWhere.classId = parseInt(classId);
  if (sectionId) studentWhere.sectionId = parseInt(sectionId);
  const text = String(q || '').trim();
  if (text) {
    const digits = cleanChallanNo(text);
    if (/^\d{3,}$/.test(digits)) where.challanNo = { contains: digits };
    else studentWhere.OR = [{ name: ciContains(text) }, { rollNo: ciContains(text) }, { fatherName: ciContains(text) }];
  }
  if (Object.keys(studentWhere).length) {
    const ids = await prisma.student.findMany({ where: { schoolId, ...studentWhere }, select: { id: true }, take: 5000 });
    where.studentId = { in: ids.map((s) => s.id) };
  }
  const [rows, total, ctx] = await Promise.all([
    prisma.feeChallan.findMany({ where, orderBy: { id: 'desc' }, take: limit, skip: offset }),
    prisma.feeChallan.count({ where }),
    printContext(schoolId),
  ]);
  const students = await prisma.student.findMany({ where: { schoolId, id: { in: [...new Set(rows.map((r) => r.studentId))] } }, select: STUDENT_SELECT });
  const byId = new Map(students.map((s) => [s.id, s]));
  res.json({ success: true, data: rows.map((r) => challanView(r, byId.get(r.studentId), ctx)), total, print: { school: ctx.school, settings: ctx.settings } });
}));

const sameItems = (challan, items) => {
  const old = parseItems(challan);
  return old.length === items.length && old.every((o, i) => o.invoiceId === items[i].invoiceId && o.due === items[i].due);
};

// POST /issue — make the challans to print.
// Body: { dueDate: 'YYYY-MM-DD', studentIds: [..] | classId (or 'all') [+ sectionId], invoiceIds?: [..] (one student: the months chosen) }
// Each student gets one challan with every month still owing (or the months
// chosen). Printing again with nothing changed gives the same challan; if the
// months or the due date changed, the student's earlier open challan is
// marked replaced and a new number is issued.
router.post('/issue', wrap(async (req, res) => {
  const { schoolId } = req;
  const { dueDate, studentIds, classId, sectionId, invoiceIds } = req.body || {};
  if (!isDay(dueDate)) return res.status(400).json({ success: false, message: 'Choose the due date.' });
  const today = pkDayOf();
  if (dueDate < today) return res.status(400).json({ success: false, message: 'The due date cannot be before today.' });

  const where = { schoolId, deletedAt: null };
  const chosenStudents = Array.isArray(studentIds) ? [...new Set(studentIds.map(Number).filter(Number.isInteger))] : [];
  if (chosenStudents.length) {
    if (chosenStudents.length > MAX_STUDENTS) return res.status(400).json({ success: false, message: `At most ${MAX_STUDENTS} students at a time.` });
    where.id = { in: chosenStudents };
  } else if (classId === 'all' || classId) {
    // A class's challans are for the students studying in it now.
    where.status = 'active';
    if (classId !== 'all') {
      where.classId = parseInt(classId);
      if (!where.classId) return res.status(400).json({ success: false, message: 'Choose a class.' });
      if (sectionId) where.sectionId = parseInt(sectionId);
    }
  } else {
    return res.status(400).json({ success: false, message: 'Choose a student or a class.' });
  }
  const chosenBills = Array.isArray(invoiceIds) ? [...new Set(invoiceIds.map(Number).filter(Number.isInteger))] : null;
  if (chosenBills && chosenStudents.length !== 1) return res.status(400).json({ success: false, message: 'Months can be chosen for one student at a time.' });
  if (chosenBills && !chosenBills.length) return res.status(400).json({ success: false, message: 'Choose at least one month.' });

  const students = (await prisma.student.findMany({ where, select: STUDENT_SELECT })).sort(byClassThenRoll);
  if (!students.length) return res.status(404).json({ success: false, message: 'No student found.' });
  if (students.length > MAX_STUDENTS) return res.status(400).json({ success: false, message: `That is ${students.length} students; print at most ${MAX_STUDENTS} at a time (one class or campus).` });
  const ids = students.map((s) => s.id);

  const [invoices, open, monthNos, ctx] = await Promise.all([
    prisma.feeInvoice.findMany({ where: { schoolId, studentId: { in: ids }, dueAmount: { gt: 0 }, ...(chosenBills && { id: { in: chosenBills } }) } }),
    prisma.feeChallan.findMany({ where: { schoolId, studentId: { in: ids }, status: 'open' } }),
    prisma.feeChallan.findMany({ where: { schoolId, studentId: { in: ids }, challanNo: { startsWith: challanPrefix() } }, select: { studentId: true, challanNo: true } }),
    printContext(schoolId),
  ]);
  if (chosenBills && invoices.length !== chosenBills.length) {
    return res.status(400).json({ success: false, message: 'Some of the chosen months are already paid or are not this student\'s.' });
  }
  const billsOf = new Map();
  for (const inv of invoices) billsOf.set(inv.studentId, [...(billsOf.get(inv.studentId) || []), inv]);
  const nextSeq = new Map();
  for (const c of monthNos) nextSeq.set(c.studentId, Math.max(nextSeq.get(c.studentId) || 1, Number(c.challanNo.slice(-2)) + 1));

  const prefix = challanPrefix();
  const due = dueDay(dueDate);
  const { lateFee } = ctx.settings;
  const keep = [];
  const create = [];
  const replace = [];
  const noDues = [];
  for (const s of students) {
    const bills = (billsOf.get(s.id) || []).sort(oldestFirst);
    if (!bills.length) { noDues.push(s.name); continue; }
    const items = bills.map((b) => ({ invoiceId: b.id, feeTitle: b.feeTitle, month: b.month, year: b.year, period: periodText(b), due: b.dueAmount }));
    const amount = items.reduce((t, i) => t + i.due, 0);
    const mine = open.filter((c) => c.studentId === s.id);
    const same = mine.find((c) => sameItems(c, items) && pkDayOf(c.dueDate) === dueDate && c.lateFee === lateFee);
    if (same) { keep.push(same.challanNo); continue; }
    replace.push(...mine.map((c) => c.id));
    const seq = nextSeq.get(s.id) || 1;
    if (seq > 99) return res.status(400).json({ success: false, message: `${s.name} already has 99 challans this month. Use one of them.` });
    create.push({
      schoolId, campusId: s.campusId ?? null, studentId: s.id, challanNo: challanNumber(prefix, s.id, seq),
      itemsJson: JSON.stringify(items), amount, lateFee, dueDate: due, status: 'open', issuedBy: req.user?.id || null,
    });
  }

  if (create.length || replace.length) {
    await prisma.$transaction(async (tx) => {
      if (replace.length) await tx.feeChallan.updateMany({ where: { schoolId, id: { in: replace }, status: 'open' }, data: { status: 'replaced' } });
      if (create.length) await tx.feeChallan.createMany({ data: create });
    });
  }
  const numbers = [...keep, ...create.map((c) => c.challanNo)];
  const rows = await prisma.feeChallan.findMany({ where: { schoolId, challanNo: { in: numbers } } });
  const byStudent = new Map(rows.map((r) => [r.studentId, r]));
  const challans = students.filter((s) => byStudent.has(s.id)).map((s) => challanView(byStudent.get(s.id), s, ctx));

  res.json({
    success: true,
    data: { challans, created: create.length, reused: keep.length, noDues, print: { school: ctx.school, settings: ctx.settings } },
    message: challans.length
      ? `${challans.length} challan${challans.length === 1 ? '' : 's'} ready to print${noDues.length ? `; ${noDues.length} student${noDues.length === 1 ? ' has' : 's have'} nothing to pay` : ''}.`
      : 'Nothing to pay: every student of this choice has paid.',
  });
}));

/** A challan's months with what they owe now, and the student's other dues. */
async function challanNow(schoolId, challan) {
  const items = parseItems(challan);
  const unpaid = await prisma.feeInvoice.findMany({ where: { schoolId, studentId: challan.studentId, dueAmount: { gt: 0 } }, select: { id: true, dueAmount: true } });
  const owing = new Map(unpaid.map((i) => [i.id, i.dueAmount]));
  const now = items.map((i) => ({ ...i, dueNow: owing.get(i.invoiceId) || 0 }));
  const ids = new Set(items.map((i) => i.invoiceId));
  const due = now.reduce((t, i) => t + i.dueNow, 0);
  const otherDue = unpaid.filter((i) => !ids.has(i.id)).reduce((t, i) => t + i.dueAmount, 0);
  const late = challan.lateFee > 0 && pkDayOf() > pkDayOf(challan.dueDate) ? challan.lateFee : 0;
  return { items: now, due, late, otherDue };
}

// GET /find/:no — a challan by its number, for recording its deposit.
router.get('/find/:no', wrap(async (req, res) => {
  const { schoolId } = req;
  const no = cleanChallanNo(req.params.no);
  const challan = no ? await prisma.feeChallan.findFirst({ where: { schoolId, challanNo: no } }) : null;
  if (!challan) return res.status(404).json({ success: false, message: `No challan numbered ${no || req.params.no}.` });
  const [student, ctx, now] = await Promise.all([
    prisma.student.findFirst({ where: { id: challan.studentId, schoolId }, select: STUDENT_SELECT }),
    printContext(schoolId),
    challanNow(schoolId, challan),
  ]);
  res.json({ success: true, data: { challan: challanView(challan, student, ctx), now } });
}));

/**
 * Records one deposit. The money pays the challan's months oldest first; if it
 * was deposited after the due date and is more than those months owe, the
 * challan's late fee is charged on its newest month first. Anything more pays
 * the student's other unpaid bills, oldest first.
 */
async function recordDeposit({ schoolId, userId, challanNo, amount, date, bankRef }) {
  const no = cleanChallanNo(challanNo);
  const amt = Number(amount);
  if (!no) throw bad('Enter the challan number.');
  if (!Number.isInteger(amt) || amt <= 0) throw bad('Enter the amount deposited.');
  const enteredAt = new Date();
  const when = pastDate(date, { label: 'Deposit date', now: enteredAt });
  if (when.error) throw bad(when.error);
  const challan = await prisma.feeChallan.findFirst({ where: { schoolId, challanNo: no } });
  if (!challan) throw bad(`No challan numbered ${no}.`, 404);
  if (challan.status === 'paid') throw bad(`Challan ${no} is already recorded as paid${challan.paidOn ? ` (deposited ${dmyOf(challan.paidOn)})` : ''}.`, 409);
  if (challan.status === 'cancelled') throw bad(`Challan ${no} was cancelled.`, 409);
  const student = await prisma.student.findFirst({ where: { id: challan.studentId, schoolId }, select: STUDENT_SELECT });
  const late = challan.lateFee > 0 && pkDayOf(when.date) > pkDayOf(challan.dueDate) ? challan.lateFee : 0;
  const ref = bankRef ? String(bankRef).replace(/\s+/g, ' ').trim().slice(0, 60) || null : null;
  const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const itemIds = parseItems(challan).map((i) => i.invoiceId);

  const out = await prisma.$transaction(async (tx) => {
    const unpaid = await tx.feeInvoice.findMany({ where: { schoolId, studentId: challan.studentId, dueAmount: { gt: 0 } } });
    const mine = unpaid.filter((i) => itemIds.includes(i.id)).sort(oldestFirst);
    const others = unpaid.filter((i) => !itemIds.includes(i.id)).sort(oldestFirst);
    const mineDue = mine.reduce((t, i) => t + i.dueAmount, 0);
    let lateCharged = 0;
    if (late && amt > mineDue && mine.length) {
      lateCharged = Math.min(late, amt - mineDue);
      const target = mine[mine.length - 1];
      await tx.feeInvoice.update({ where: { id: target.id }, data: { lateFee: { increment: lateCharged }, dueAmount: { increment: lateCharged } } });
      target.dueAmount += lateCharged;
    }
    const order = [...mine, ...others];
    const owed = order.reduce((t, i) => t + i.dueAmount, 0);
    if (amt > owed) {
      throw bad(`${rs(amt)} is more than ${student?.name || 'the student'} owes (${rs(owed)}). Record ${rs(owed)}; the rest is not a fee.`);
    }
    const lines = await applyPayments(tx, {
      schoolId, studentId: challan.studentId, invoices: order, amount: amt,
      payment: {
        method: 'bank', receivedBy: userId, notifiedVia: 'none', receiptNo, paymentDate: when.date,
        transactionRef: ref || `Challan ${no}`, remarks: `Bank challan ${no}`,
      },
    });
    const stillOwing = lines.filter((l) => itemIds.includes(l.invoiceId)).reduce((t, l) => t + l.balance, 0);
    const paidTotal = challan.paidAmount + amt;
    const status = stillOwing === 0 || paidTotal >= challan.amount + late ? 'paid' : 'part_paid';
    const { count } = await tx.feeChallan.updateMany({
      where: { id: challan.id, status: challan.status, paidAmount: challan.paidAmount },
      data: { paidAmount: paidTotal, status, paidOn: when.date, bankRef: ref, receiptNo, recordedBy: userId },
    });
    if (count !== 1) throw bad(`Challan ${no} was recorded by someone else just now.`, 409);
    await tx.auditLog.create({
      data: {
        schoolId, userId, action: 'FEE_CHALLAN_DEPOSIT', resource: 'fee_challan', resourceId: challan.id,
        details: JSON.stringify({ challanNo: no, amount: amt, lateCharged, depositDate: pkDayOf(when.date), bankRef: ref, receiptNo, enteredAt: enteredAt.toISOString() }),
      },
    });
    return { lines: lines.filter((l) => l.paid > 0), lateCharged, status };
  });

  return {
    ok: true, challanNo: no, amount: amt, depositDate: pkDayOf(when.date), receiptNo, status: out.status,
    lateCharged: out.lateCharged, lines: out.lines, wasReplaced: challan.status === 'replaced',
    student: studentView(student),
  };
}

// POST /deposits — { deposits: [{ challanNo, amount (paisa), date, bankRef }] }
// Each is recorded on its own: one that fails (already paid, not found) does
// not stop the others, and the reply says what happened to each.
router.post('/deposits', wrap(async (req, res) => {
  const list = Array.isArray(req.body?.deposits) ? req.body.deposits : [];
  if (!list.length) return res.status(400).json({ success: false, message: 'Nothing to record.' });
  if (list.length > 500) return res.status(400).json({ success: false, message: 'Record at most 500 deposits at a time.' });
  const results = [];
  for (const d of list) {
    try {
      results.push(await recordDeposit({ schoolId: req.schoolId, userId: req.user?.id || null, ...d }));
    } catch (err) {
      if (!err.status) throw err;
      results.push({ ok: false, challanNo: cleanChallanNo(d?.challanNo), message: err.message });
    }
  }
  const done = results.filter((r) => r.ok);
  const total = done.reduce((t, r) => t + r.amount, 0);
  res.json({
    success: true,
    data: { results, recorded: done.length, failed: results.length - done.length, total },
    message: `${done.length} deposit${done.length === 1 ? '' : 's'} recorded (${rs(total)})${results.length > done.length ? `; ${results.length - done.length} not recorded` : ''}.`,
  });
}));

// POST /match — { rows: [{ challanNo, amount (paisa), date }] } from a bank
// statement: which challan each row is, and whether it can be recorded.
router.post('/match', wrap(async (req, res) => {
  const { schoolId } = req;
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ success: false, message: 'No rows to check.' });
  if (rows.length > 3000) return res.status(400).json({ success: false, message: 'At most 3000 rows at a time.' });
  const nos = [...new Set(rows.map((r) => cleanChallanNo(r.challanNo)).filter(Boolean))];
  const challans = nos.length ? await prisma.feeChallan.findMany({ where: { schoolId, challanNo: { in: nos } } }) : [];
  const byNo = new Map(challans.map((c) => [c.challanNo, c]));
  const students = await prisma.student.findMany({ where: { schoolId, id: { in: [...new Set(challans.map((c) => c.studentId))] } }, select: STUDENT_SELECT });
  const sById = new Map(students.map((s) => [s.id, s]));
  const seen = new Set();
  const out = rows.map((r) => {
    const no = cleanChallanNo(r.challanNo);
    const amount = Number(r.amount);
    const date = isDay(r.date) ? r.date : '';
    const c = byNo.get(no);
    const base = { challanNo: no, amount: Number.isInteger(amount) ? amount : 0, date };
    if (!c) return { ...base, verdict: 'not_found', message: no ? 'No challan with this number.' : 'No challan number in this row.' };
    const info = { ...base, student: studentView(sById.get(c.studentId)), challan: { id: c.id, status: c.status, amount: c.amount, lateFee: c.lateFee, paidAmount: c.paidAmount, dueDate: pkDayOf(c.dueDate) } };
    if (seen.has(no)) return { ...info, verdict: 'duplicate', message: 'This challan is in the file twice.' };
    seen.add(no);
    if (c.status === 'paid') return { ...info, verdict: 'already_paid', message: `Already recorded${c.paidOn ? ` (deposited ${dmyOf(c.paidOn)})` : ''}.` };
    if (c.status === 'cancelled') return { ...info, verdict: 'cancelled', message: 'This challan was cancelled.' };
    if (!(info.amount > 0)) return { ...info, verdict: 'no_amount', message: 'No amount in this row.' };
    const lateOn = date && c.lateFee > 0 && date > pkDayOf(c.dueDate);
    const expected = c.amount - c.paidAmount + (lateOn ? c.lateFee : 0);
    if (info.amount === expected || (!date && info.amount === expected + c.lateFee)) return { ...info, expected, verdict: 'ok', message: lateOn ? 'Paid after the due date, with the late fee.' : 'Matches the challan.' };
    return { ...info, expected, verdict: 'differs', message: `The challan asks ${rs(expected)}; ${rs(info.amount)} was deposited.` };
  });
  const count = (v) => out.filter((r) => r.verdict === v).length;
  res.json({ success: true, data: { rows: out, summary: { ok: count('ok'), differs: count('differs'), notFound: count('not_found'), alreadyPaid: count('already_paid'), other: count('duplicate') + count('cancelled') + count('no_amount') } } });
}));

// POST /:id/cancel — a challan printed by mistake; one already paid stays.
router.post('/:id/cancel', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const c = Number.isInteger(id) ? await prisma.feeChallan.findFirst({ where: { id, schoolId } }) : null;
  if (!c) return res.status(404).json({ success: false, message: 'Challan not found.' });
  if (!['open', 'replaced'].includes(c.status)) {
    return res.status(409).json({ success: false, message: c.status === 'cancelled' ? 'This challan is already cancelled.' : 'A deposit is recorded on this challan; correct the payment instead.' });
  }
  const { count } = await prisma.feeChallan.updateMany({ where: { id, schoolId, status: c.status }, data: { status: 'cancelled' } });
  if (count !== 1) return res.status(409).json({ success: false, message: 'This challan changed just now. Open it again.' });
  await prisma.auditLog.create({ data: { schoolId, userId: req.user?.id, action: 'FEE_CHALLAN_CANCEL', resource: 'fee_challan', resourceId: id, details: JSON.stringify({ challanNo: c.challanNo }) } }).catch(() => null);
  res.json({ success: true, message: `Challan ${c.challanNo} cancelled.` });
}));

router.helpers = { recordDeposit, challanNow };
module.exports = router;
