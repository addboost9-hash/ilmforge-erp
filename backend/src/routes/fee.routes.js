const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { readSettings, mergeSettings } = require('../utils/schoolSettings');
const { pastDate } = require('../utils/pastDate');
const { contains: ciContains, equals: ciEquals } = require('../utils/search');
const { monthNumber, monthKeys, monthLabel, byPeriodDesc, feeKind } = require('../utils/feeMonth');
const { sendSMS } = require('../services/sms.service');
const { sendFeePaidNotification } = require('../services/whatsapp.service');
const { duesByStudent } = require('../services/scheduler.service');
const { oldestFirst, applyPayments, bad } = require('../services/feeCollect.service');
const { recomputeInvoice, ownDiscount, setOwnDiscount, paymentTotals, figures } = require('../utils/invoiceMath');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* Pakistan keeps one clock all year, UTC+5. A date picked on a screen is a
   Pakistan day whatever zone the server runs in: the live server is on UTC,
   where setHours(0) began "today" at 5 a.m. Pakistan time. */
const PKT_MS = 5 * 3600 * 1000;
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const pktDayStart = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - PKT_MS);
};
const pktDayEnd = (ymd) => new Date(pktDayStart(ymd).getTime() + 864e5 - 1);
/** Every instant of a fee month in Pakistan, as a Prisma date filter. */
const pktMonth = (month, year) => ({
  gte: new Date(Date.UTC(year, month - 1, 1) - PKT_MS),
  lt: new Date(Date.UTC(year, month, 1) - PKT_MS),
});
/** The Pakistan calendar day an instant falls on, as YYYY-MM-DD. */
const pktDay = (when = new Date()) => new Date(new Date(when).getTime() + PKT_MS).toISOString().slice(0, 10);
/** YYYY-MM-DD -> DD/MM/YYYY, as dates are written in Pakistan. */
const dmy = (ymd) => String(ymd).split('-').reverse().join('/');
/* A fee title's kind, month names taken out (utils/feeMonth.js): the Transport
   tab bills "Transport Fee Of July" and Custom Fee bills "Transport Fee", and
   July's transport must not be billed twice because the two screens name it
   differently. Past Records compares bills with the same rule. */
const kindOf = feeKind;
/** Students among `sameMonth` invoices already billed a fee of the same kind as `title`. */
const billedFor = (sameMonth, title) => {
  const kind = kindOf(title);
  return new Set(sameMonth.filter((inv) => kindOf(inv.feeTitle) === kind).map((inv) => inv.studentId));
};
/* A month can now hold more than one bill (the monthly fee, transport, an
   exam fee), and each needs its own voucher number: the monthly fee keeps
   the usual JUL-0042-2026, any other fee adds its first letters (JUL-0042-2026-TRA). */
const voucherFor = (monthName, studentId, year, title) => {
  const kind = kindOf(title);
  const tag = kind === 'monthly' ? '' : `-${(kind.slice(0, 3) || 'FEE').toUpperCase()}`;
  return `${monthName.toUpperCase()}-${String(studentId).padStart(4, '0')}-${year}${tag}`;
};
/** from/to (Pakistan days, either may be blank) -> { range } | { error }. */
const pktRange = (from, to) => {
  const bad = [from, to].find((v) => v && !isDay(v));
  if (bad) return { error: `${bad} is not a date. Use YYYY-MM-DD.` };
  const range = {};
  if (from) range.gte = pktDayStart(from);
  if (to) range.lte = pktDayEnd(to);
  return { range: Object.keys(range).length ? range : null };
};

const isFinanceRole = (role) => ['super_admin', 'admin', 'accountant'].includes(role);

const requireFinanceRole = (req, res, next) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }
  next();
};

// GET /api/v1/fees/stats?from=&to= — collection totals for a date range.
// The analytics page's date filter had no backing endpoint, so it silently
// fell through to month-fixed dashboard figures and changing the dates
// appeared to do nothing.
router.get('/stats', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { from, to } = req.query;

  // Pakistan days (setHours(0) on the UTC server began them at 5 a.m.).
  const dates = pktRange(from, to);
  if (dates.error) return res.status(400).json({ success: false, message: dates.error });
  const range = dates.range || {};
  const hasRange = !!dates.range;

  const [paidAgg, invoiceAgg] = await Promise.all([
    prisma.feePayment.aggregate({
      where: { schoolId, voidedAt: null, ...(hasRange && { paymentDate: range }) },
      _sum: { amountPaid: true },
      _count: true,
    }),
    // Outstanding is a running balance, so it is scoped by when the invoice
    // was raised rather than by payment date.
    prisma.feeInvoice.aggregate({
      where: { schoolId, ...(hasRange && { createdAt: range }) },
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true, discount: true },
      _count: true,
    }),
  ]);

  const collected = paidAgg._sum.amountPaid || 0;
  const pending = invoiceAgg._sum.dueAmount || 0;
  const billed = invoiceAgg._sum.totalAmount || 0;

  res.json({
    success: true,
    data: {
      from: from || null,
      to: to || null,
      collected,
      pending,
      billed,
      discount: invoiceAgg._sum.discount || 0,
      paymentCount: paidAgg._count || 0,
      invoiceCount: invoiceAgg._count || 0,
      collectionRate: billed > 0 ? Math.round((collected / billed) * 1000) / 10 : 0,
    },
  });
}));

// POST /api/v1/fees/generate - Generate monthly fee for a class
router.post('/generate', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, sectionId, campusId: bodyCampusId, month, year, dueDate, lateFee = 0, feeTitle, customAmount } = req.body;

  if (!classId || !month || !year) {
    return res.status(400).json({ success: false, message: 'classId, month, year required.' });
  }

  // Old months may be billed (a school entering its past fees), but only
  // real ones: a typo such as month 13 or year 2062 would bill every student.
  const monthInt = monthNumber(month);
  const yearInt  = Number(year);
  const lastYear = new Date(Date.now() + PKT_MS).getUTCFullYear() + 1;
  if (!monthInt) {
    return res.status(400).json({ success: false, message: 'Fee month must be 1 to 12.' });
  }
  if (!Number.isInteger(yearInt) || yearInt < 2000 || yearInt > lastYear) {
    return res.status(400).json({ success: false, message: `Fee year must be between 2000 and ${lastYear}.` });
  }
  const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthName = MONTHS[(monthInt - 1)];

  // The campus chosen on the form; "all" bills every campus. "All campuses"
  // used to send nothing, which fell back to the user's own campus, so the
  // other campuses' students were never billed.
  const filterCampusId = bodyCampusId === 'all' ? null : (bodyCampusId ? parseInt(bodyCampusId) : req.campusId);

  // The class's fee: the one with this bill's title when there is one, else
  // its monthly fee, else the fee set most recently. Saving a class's fee
  // again used to add a second row, and the first (old) amount kept being
  // billed.
  const classStructures = await prisma.feeStructure.findMany({
    where: { schoolId, classId: parseInt(classId) },
    orderBy: { updatedAt: 'desc' },
  });
  const sameTitle = (s, t) => s.feeTitle.trim().toLowerCase() === String(t || '').trim().toLowerCase();
  const feeStructure = (feeTitle && classStructures.find((s) => sameTitle(s, feeTitle)))
    || classStructures.find((s) => /monthly|tuition/i.test(s.feeTitle))
    || classStructures[0];

  // Amount priority: customAmount > feeStructure.amount > class tuitionFee > 0
  const cls = await prisma.class.findFirst({ where: { id: parseInt(classId), schoolId } });
  const baseAmount = parseInt(customAmount) || feeStructure?.amount || cls?.tuitionFee || 0;

  // Get ALL active students in class (campus filter optional)
  const studentWhere = {
    schoolId,
    classId: parseInt(classId),
    status:  'active',
    deletedAt: null,
    ...(sectionId && sectionId !== 'all' && { sectionId: parseInt(sectionId) }),
    ...(filterCampusId && { campusId: filterCampusId }),
  };

  const students = await prisma.student.findMany({ where: studentWhere });

  if (!students.length) {
    return res.json({
      success: true,
      data: { generated: 0, skipped: 0, students: [] },
      message: `0 invoices generated — no active students found in this class/section/campus combination.`,
    });
  }

  const results = { generated: 0, skipped: 0, students: [] };

  // FIX: FeeInvoice.month is a String column (elsewhere read back via
  // parseInt(invoice.month)), but this call was passing a raw JS number for
  // both the dedup lookup and the create — Prisma Client rejects a Int value
  // for a String field, so every single fee-generation request threw a
  // validation error before this fix.
  const monthStr = String(monthInt);

  // "Already billed" means a bill of the SAME KIND for this month, under any
  // spelling of the month: "7" from this screen, "July"/"Jul" from
  // admissions, custom invoices and fee records entered from old books.
  // Checking only "7" billed July twice for a month entered as "July"; and
  // an Admission or Transport Fee in July must not stop the monthly fee.
  const title = feeTitle || `Monthly Fee Of ${monthName}`;
  const sameMonth = await prisma.feeInvoice.findMany({
    where: { schoolId, studentId: { in: students.map((s) => s.id) }, year: yearInt, month: { in: monthKeys(monthInt) } },
    select: { studentId: true, feeTitle: true },
  });
  const billed = billedFor(sameMonth, title);

  for (const student of students) {
    if (billed.has(student.id)) {
      results.skipped++;
      results.students.push({ id: student.id, name: student.name, rollNo: student.rollNo, status: 'skipped' });
      continue;
    }

    const voucherNo = voucherFor(monthName, student.id, yearInt, title);

    await prisma.feeInvoice.create({
      data: {
        schoolId,
        campusId: student.campusId,
        studentId: student.id,
        classId: parseInt(classId),
        feeTitle: title,
        totalAmount: baseAmount,
        dueAmount:   baseAmount,
        paidAmount:  0,
        month:   monthStr,
        year:    yearInt,
        dueDate: dueDate ? new Date(dueDate) : null,
        status:  'unpaid',
        voucherNo,
        lateFee: parseInt(lateFee) || 0,
      },
    });
    results.generated++;
    results.students.push({ id: student.id, name: student.name, rollNo: student.rollNo, status: 'generated' });
  }

  res.json({
    success: true,
    data:    results,
    message: `${results.generated} invoice${results.generated !== 1 ? 's' : ''} generated, ${results.skipped} already billed for ${monthLabel(monthInt)} ${yearInt}.`,
  });
}));

// GET /api/v1/fees/invoices
router.get('/invoices', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, status, month, year, search, page = 1, limit = 25 } = req.query;
  // One student's invoices. The accountant portal asked for these as
  // ?student=<id>, which this route ignored, so it listed the newest 50
  // invoices of the whole school under whichever student was selected - and
  // "Pay Now" could record a payment against someone else's child.
  const oneStudent = parseInt(req.query.studentId ?? req.query.student);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    schoolId, ...(campusId && { campusId }),
    ...(Number.isFinite(oneStudent) && { studentId: oneStudent }),
    ...(classId && { classId: parseInt(classId) }),
    ...(status && { status }),
    // Any spelling of the month: "7" and "July" are the same month.
    ...(month && { month: { in: monthKeys(month) } }),
    ...(year && { year: parseInt(year) }),
    ...(search && { student: { OR: [{ name: ciContains(search) }, { rollNo: ciContains(search) }] } }),
  };
  const [invoices, total] = await Promise.all([
    prisma.feeInvoice.findMany({ where, skip, take: parseInt(limit), include: { student: { select: { name: true, rollNo: true, classId: true, fatherName: true, class: { select: { name: true } } } }, payments: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } }),
    prisma.feeInvoice.count({ where })
  ]);
  res.json({ success: true, data: invoices, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}));

// GET /api/v1/fees/student/:studentId - Get all invoices for a student
router.get('/student/:studentId', wrap(async (req, res) => {
  const { schoolId } = req;
  const studentId = parseInt(req.params.studentId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, deletedAt: null },
    include: { class: true, section: true }
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  if (req.user?.role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { schoolId, userId: req.user.id } });
    if (!parent) {
      return res.status(403).json({ success: false, message: 'Access denied for this student.' });
    }
    const link = await prisma.parentStudent.findFirst({ where: { schoolId, parentId: parent.id, studentId } });
    if (!link) return res.status(403).json({ success: false, message: 'Access denied for this student.' });
  }

  if (req.user?.role === 'student') {
    if (student.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied for this student.' });
    }
  }

  if (['teacher', 'gatekeeper'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Role cannot access fee details.' });
  }

  const invoices = await prisma.feeInvoice.findMany({
    where: { schoolId, studentId },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }]
  });
  // Newest month first, by the month's number: sorting the text column put
  // "9" above "12" and "September" above "October".
  invoices.sort(byPeriodDesc);

  res.json({ success: true, data: { student, invoices } });
}));

// GET /api/v1/fees/register?from=2026-04&to=2027-03&classId=&sectionId=&studentId=
// The fee register: the students of a class (classId=all: the whole school;
// studentId: one student) with their bills, for a screen that lays the year
// out month by month: paid and on which day, part paid, unpaid, not billed.
// Bills of the years asked are sent, and any bill still owing from before,
// which is the student's earlier dues. Voided payments are left out.
const REGISTER_MAX_STUDENTS = 3000;

// GET /api/v1/fees/register/options — what the register and the fee
// calendar are chosen and printed with: the classes and their sections, the
// academic sessions, and the school's name, address and logo. The
// accountant may not read the class or settings pages, so these come with
// the fees.
router.get('/register/options', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const [classes, sessions, school] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, sections: { select: { id: true, name: true }, orderBy: { name: 'asc' } } },
      orderBy: [{ orderNo: 'asc' }, { name: 'asc' }],
    }),
    prisma.academicSession.findMany({
      where: { schoolId },
      select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
      orderBy: { startDate: 'desc' },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, address: true, phone: true, logoUrl: true } }),
  ]);
  res.json({ success: true, data: { classes, sessions, school: school || {} } });
}));

router.get('/register', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const parseYm = (v) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(v || ''));
    return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? { y: Number(m[1]), m: Number(m[2]) } : null;
  };
  const from = parseYm(req.query.from);
  const to = parseYm(req.query.to);
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'from and to are months, written YYYY-MM.' });
  }
  const span = (to.y - from.y) * 12 + (to.m - from.m) + 1;
  if (span < 1 || span > 24) {
    return res.status(400).json({ success: false, message: 'Choose up to 24 months, the first month before the last.' });
  }

  const allClasses = req.query.classId === 'all';
  const classId = parseInt(req.query.classId) || null;
  const sectionId = parseInt(req.query.sectionId) || null;
  const studentId = parseInt(req.query.studentId) || null;
  if (!studentId && !classId && !allClasses) {
    return res.status(400).json({ success: false, message: 'Choose a class.' });
  }

  const where = { schoolId, deletedAt: null, ...(campusId && { campusId }) };
  if (studentId) where.id = studentId;
  else {
    where.status = 'active';
    if (classId) where.classId = classId;
    if (classId && sectionId) where.sectionId = sectionId;
  }
  const found = await prisma.student.findMany({
    where,
    select: {
      id: true, name: true, rollNo: true, fatherName: true, emergencyPhone: true, motherPhone: true,
      admissionDate: true, status: true, classId: true, sectionId: true,
      class: { select: { name: true, orderNo: true } }, section: { select: { name: true } },
    },
    take: REGISTER_MAX_STUDENTS + 1,
  });
  if (studentId && !found.length) return res.status(404).json({ success: false, message: 'Student not found.' });
  const truncated = found.length > REGISTER_MAX_STUDENTS;
  const byRollNo = (a, b) => String(a || '￿').localeCompare(String(b || '￿'), 'en', { numeric: true, sensitivity: 'base' });
  const students = found.slice(0, REGISTER_MAX_STUDENTS).sort((a, b) =>
    ((a.class?.orderNo ?? 999) - (b.class?.orderNo ?? 999))
    || String(a.class?.name || '').localeCompare(String(b.class?.name || ''), 'en', { numeric: true })
    || String(a.section?.name || '').localeCompare(String(b.section?.name || ''), 'en', { numeric: true })
    || byRollNo(a.rollNo, b.rollNo)
    || a.name.localeCompare(b.name));

  const years = [];
  for (let y = from.y; y <= to.y; y++) years.push(y);
  const invoices = students.length ? await prisma.feeInvoice.findMany({
    where: {
      schoolId,
      studentId: { in: students.map((s) => s.id) },
      // A bill without a year is placed by its due date or the day it was
      // made, so those come too.
      OR: [{ year: { in: years } }, { year: null }, { dueAmount: { gt: 0 } }],
    },
    select: {
      id: true, studentId: true, feeTitle: true, month: true, year: true, voucherNo: true,
      totalAmount: true, discount: true, lateFee: true, paidAmount: true, dueAmount: true, status: true,
      dueDate: true, createdAt: true,
      payments: {
        where: { voidedAt: null },
        select: { id: true, amountPaid: true, discount: true, paymentDate: true, receiptNo: true, method: true },
        orderBy: { paymentDate: 'asc' },
      },
    },
  }) : [];

  res.json({
    success: true,
    data: {
      from: req.query.from, to: req.query.to, truncated,
      students: students.map(({ class: cls, section, ...s }) => ({ ...s, className: cls?.name || '', sectionName: section?.name || '' })),
      invoices,
    },
  });
}));

// POST /api/v1/fees/payments - Record a fee payment
router.post('/payments', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { invoiceId, amountPaid, discount = 0, method = 'cash', notifyVia = 'whatsapp_sms', paymentDate, remarks } = req.body;
  // An optional note typed with the payment ("part payment", "advance").
  const note = remarks ? String(remarks).replace(/\s+/g, ' ').trim().slice(0, 200) || null : null;
  const paidNum = parseInt(amountPaid);
  // The day the money was actually received. Entering a payment late (or a
  // school entering its past fees) must file it on that day, not today.
  const enteredAt = new Date();
  const when = pastDate(paymentDate, { label: 'Payment date', now: enteredAt });
  if (when.error) return res.status(400).json({ success: false, message: when.error });
  // pastDate hands back `now` itself for today, so anything else is an earlier day.
  const backdated = when.date !== enteredAt;
  const discountNum = parseInt(discount) || 0;
  // FIX: !amountPaid is truthy-falsy only — a negative number passes it — and
  // there was no cap on discount vs. remaining due, so a payment could mark
  // an invoice "paid" without covering the actual balance, or apply an
  // unbounded discount. There was also no row locking: paidAmount/dueAmount
  // were read once, computed in JS, then written as absolute values, so two
  // concurrent payments on the same invoice could silently lose one update.
  if (!invoiceId || !Number.isFinite(paidNum) || paidNum <= 0) {
    return res.status(400).json({ success: false, message: 'invoiceId and a positive amountPaid are required.' });
  }
  if (discountNum < 0) {
    return res.status(400).json({ success: false, message: 'discount cannot be negative.' });
  }

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: parseInt(invoiceId), schoolId },
    include: { student: { include: { class: true } } }
  });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

  const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random()*1000)}`;

  let payment, newDue, newStatus;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.feeInvoice.findUniqueOrThrow({ where: { id: parseInt(invoiceId) } });
      if (paidNum + discountNum > current.dueAmount) {
        throw Object.assign(new Error(`Payment plus discount (${rs(paidNum + discountNum)}) exceeds the remaining due amount (${rs(current.dueAmount)}).`), { status: 400 });
      }
      const due = Math.max(0, current.dueAmount - paidNum - discountNum);
      const status = due === 0 ? 'paid' : 'partial';

      const pay = await tx.feePayment.create({
        data: { schoolId, invoiceId: parseInt(invoiceId), studentId: invoice.studentId,
          amountPaid: paidNum, discount: discountNum, method, receivedBy: req.user.id,
          notifiedVia: notifyVia, receiptNo, paymentDate: when.date, remarks: note }
      });
      // Written only if the balance is still the one read above: two
      // payments at the same moment (two counters, a double click) each
      // read the same balance, and the second overwrote the first.
      const { count } = await tx.feeInvoice.updateMany({
        where: { id: parseInt(invoiceId), schoolId, dueAmount: current.dueAmount },
        data: { paidAmount: { increment: paidNum }, discount: { increment: discountNum }, dueAmount: due, status }
      });
      if (count !== 1) throw Object.assign(new Error('This bill changed while the payment was being saved. Open it again and retry.'), { status: 409 });
      // A fee keyed in for an earlier day is legitimate (it was received
      // then), but an auditor must be able to tell it from one recorded on
      // the day, so the entry date is kept beside the date written on it.
      if (backdated) {
        await tx.auditLog.create({
          data: {
            schoolId, userId: req.user.id, action: 'PAYMENT_BACKDATED', resource: 'fee_payment', resourceId: pay.id,
            details: JSON.stringify({ paymentId: pay.id, paymentDate: pktDay(when.date), enteredAt: enteredAt.toISOString() }),
          },
        });
      }
      return { pay, due, status };
    });
    payment = result.pay; newDue = result.due; newStatus = result.status;
  } catch (err) {
    if (err.status === 400 || err.status === 409) return res.status(err.status).json({ success: false, message: err.message });
    throw err;
  }

  // Send notification to parent (WhatsApp/SMS + Email)
  if (notifyVia !== 'none') {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const monthStr = invoice.month ? `${monthLabel(invoice.month)} ${invoice.year || ''}`.trim() : '';

    // WhatsApp/SMS — fire and forget. The messages print "Rs." before the
    // figure, so they get rupees: the stored paisa read as Rs 350,000.
    sendFeePaidNotification({
      schoolId, parentPhone: invoice.student.emergencyPhone || '', parentName: invoice.student.fatherName,
      studentName: invoice.student.name, className: invoice.student.class?.name, feeTitle: invoice.feeTitle,
      amount: paidNum / 100, month: monthStr, receiptNo, schoolName: school?.name || 'School'
    }).catch(() => {});

    // Email receipt — fire and forget
    const parentEmail = invoice.student.parent?.email;
    if (parentEmail) {
      const { sendFeeReceiptEmail } = require('../services/email.service');
      sendFeeReceiptEmail({
        to: parentEmail,
        parentName: invoice.student.parent?.name || invoice.student.fatherName || 'Parent',
        studentName: invoice.student.name,
        amount: paidNum / 100,
        month: monthStr,
        receiptNo,
        schoolName: school?.name || 'School',
      }).catch(() => {});
    }
  }

  res.json({
    success: true,
    data: { payment, receiptNo, newStatus, newDue, paymentDate: payment.paymentDate, backdated },
    message: backdated ? `Payment recorded on ${dmy(pktDay(payment.paymentDate))}.` : 'Payment recorded successfully.',
  });
}));

// POST /api/v1/fees/payments/months — fee received for several months at once.
// Body: { studentId, invoiceIds: [..], amountPaid (paisa), method, notifyVia,
//         paymentDate, remarks }
// The amount pays the chosen bills oldest month first, each in full before
// the next: the last one reached may be part paid, and the rest keep their
// balance. One receipt number for all of it.
const COLLECT_METHODS = ['cash', 'bank', 'online', 'card', 'cheque', 'easypaisa', 'jazzcash'];
router.post('/payments/months', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { studentId, invoiceIds, amountPaid, method = 'cash', notifyVia = 'whatsapp_sms', paymentDate, remarks } = req.body || {};
  const sid = parseInt(studentId);
  const ids = [...new Set((Array.isArray(invoiceIds) ? invoiceIds : []).map(Number).filter(Number.isInteger))];
  const paid = Number(amountPaid);
  if (!sid || !ids.length) return res.status(400).json({ success: false, message: 'Choose the student and at least one month.' });
  if (ids.length > 60) return res.status(400).json({ success: false, message: 'Choose at most 60 bills at a time.' });
  if (!Number.isInteger(paid) || paid <= 0) return res.status(400).json({ success: false, message: 'Enter the amount received.' });
  if (!COLLECT_METHODS.includes(method)) return res.status(400).json({ success: false, message: `Payment method must be one of: ${COLLECT_METHODS.join(', ')}.` });
  const note = remarks ? String(remarks).replace(/\s+/g, ' ').trim().slice(0, 200) || null : null;
  const enteredAt = new Date();
  const when = pastDate(paymentDate, { label: 'Payment date', now: enteredAt });
  if (when.error) return res.status(400).json({ success: false, message: when.error });
  const backdated = when.date !== enteredAt;

  const student = await prisma.student.findFirst({ where: { id: sid, schoolId, deletedAt: null }, include: { class: true } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let lines;
  try {
    lines = await prisma.$transaction(async (tx) => {
      const invoices = await tx.feeInvoice.findMany({ where: { schoolId, studentId: sid, id: { in: ids } } });
      if (invoices.length !== ids.length) throw bad("Some of the chosen bills are not this student's.");
      const owing = invoices.filter((i) => i.dueAmount > 0).sort(oldestFirst);
      if (!owing.length) throw bad('The chosen months are already paid.');
      const total = owing.reduce((s, i) => s + i.dueAmount, 0);
      if (paid > total) throw bad(`${rs(paid)} is more than the chosen months owe (${rs(total)}). Tick more months, or enter ${rs(total)}.`);
      const out = await applyPayments(tx, {
        schoolId, studentId: sid, invoices: owing, amount: paid,
        payment: { method, receivedBy: req.user.id, notifiedVia: notifyVia, receiptNo, paymentDate: when.date, remarks: note },
      });
      if (backdated) {
        await tx.auditLog.create({
          data: {
            schoolId, userId: req.user.id, action: 'PAYMENT_BACKDATED', resource: 'fee_payment', resourceId: sid,
            details: JSON.stringify({ receiptNo, paymentDate: pktDay(when.date), enteredAt: enteredAt.toISOString() }),
          },
        });
      }
      return out;
    });
  } catch (err) {
    if (err.status === 400 || err.status === 409) return res.status(err.status).json({ success: false, message: err.message });
    throw err;
  }

  const left = await prisma.feeInvoice.aggregate({ where: { schoolId, studentId: sid, dueAmount: { gt: 0 } }, _sum: { dueAmount: true } });
  const paidLines = lines.filter((l) => l.paid > 0);

  if (notifyVia !== 'none') {
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
    sendFeePaidNotification({
      schoolId, parentPhone: student.emergencyPhone || '', parentName: student.fatherName,
      studentName: student.name, className: student.class?.name, feeTitle: paidLines.length > 1 ? 'Fee' : paidLines[0]?.feeTitle,
      amount: paid / 100, month: paidLines.map((l) => l.period).join(', '), receiptNo, schoolName: school?.name || 'School',
    }).catch(() => {});
  }

  res.json({
    success: true,
    data: { receiptNo, paymentDate: when.date, backdated, amountPaid: paid, lines, balance: left._sum.dueAmount || 0 },
    message: `${rs(paid)} received for ${paidLines.length} bill${paidLines.length === 1 ? '' : 's'}${backdated ? `, filed on ${dmy(pktDay(when.date))}` : ''}.`,
  });
}));

// Bank challans: printed, deposited, matched with the bank statement.
router.use('/challans', requireFinanceRole, require('./feeChallan.routes'));

// GET /api/v1/fees/defaulters
// FIX: added pagination via limit/offset query params to prevent unbounded result sets.
// Defaults to 50 rows per page; hard-capped at 500.
/* ────────────────────────────────────────────────────────────────────
   Correcting a mis-keyed payment.

   A recorded payment is never edited in place and never deleted. Voiding
   reverses its effect on the invoice and leaves the original row on the
   ledger, flagged. A correction does the same and writes a replacement
   row linked back to what it replaced, so "Rs 25,000 was collected then
   corrected to Rs 2,500" stays visible to an auditor.

   Both run in one transaction and re-read the invoice inside it, so a
   correction racing a fresh payment cannot lose an update.
   ──────────────────────────────────────────────────────────────────── */

// Recompute an invoice from its own non-voided payments, rather than
// incrementing/decrementing, so the invoice can never drift out of step
// with the payment rows that justify it.
// Amounts are stored in paisa; messages read back to the user in rupees.
const rs = (paisa) => 'Rs ' + Math.round((paisa || 0) / 100).toLocaleString('en-PK');

// recomputeInvoice (utils/invoiceMath) keeps the bill's own discount: it
// used to count only the payments' discounts, so voiding or correcting a
// receipt on a bill with a concession put the concession back on the balance.

// POST /api/v1/fees/payments/:id/void  — cancel a payment outright
router.post('/payments/:id/void', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const reason = String(req.body?.reason || '').trim();
  if (!Number.isFinite(id)) {
    return res.status(400).json({ success: false, message: 'A valid payment id is required.' });
  }
  if (!reason) {
    return res.status(400).json({ success: false, message: 'A reason is required to void a payment.' });
  }

  const existing = await prisma.feePayment.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Payment not found.' });
  if (existing.voidedAt) {
    return res.status(400).json({ success: false, message: 'This payment has already been voided.' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const own = await ownDiscount(tx, existing.invoiceId);
    // Only a payment still live is voided (two clicks cannot both count).
    const { count } = await tx.feePayment.updateMany({
      where: { id, voidedAt: null },
      data: { voidedAt: new Date(), voidedBy: req.user.id, voidReason: reason },
    });
    if (count !== 1) throw bad('This payment has already been voided.');
    return recomputeInvoice(tx, existing.invoiceId, own);
  }).catch((err) => { if (err.status) return { error: err }; throw err; });
  if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

  res.json({
    success: true,
    data: { invoiceId: existing.invoiceId, ...result },
    message: `Payment of ${rs(existing.amountPaid)} voided. Invoice balance updated.`,
  });
}));

// PUT /api/v1/fees/payments/:id  — correct the amount (void + replacement)
router.put('/payments/:id', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const { amountPaid, discount, method, reason } = req.body || {};
  const paidNum = parseInt(amountPaid);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ success: false, message: 'A valid payment id is required.' });
  }
  if (!Number.isFinite(paidNum) || paidNum <= 0) {
    return res.status(400).json({ success: false, message: 'A positive corrected amount is required.' });
  }
  const why = String(reason || '').trim();
  if (!why) {
    return res.status(400).json({ success: false, message: 'A reason is required to correct a payment.' });
  }

  const existing = await prisma.feePayment.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Payment not found.' });
  if (existing.voidedAt) {
    return res.status(400).json({ success: false, message: 'This payment has already been voided and cannot be corrected again.' });
  }
  if (existing.replacedBy) {
    return res.status(400).json({ success: false, message: 'This payment has already been corrected.' });
  }

  const discNum = Number.isFinite(parseInt(discount)) ? parseInt(discount) : existing.discount;
  if (discNum < 0) {
    return res.status(400).json({ success: false, message: 'discount cannot be negative.' });
  }

  let out;
  try {
    out = await prisma.$transaction(async (tx) => {
      const own = await ownDiscount(tx, existing.invoiceId);
      // Void first, so the headroom check below sees the invoice WITHOUT
      // the mistaken amount — otherwise correcting 250 up to 2,500 would
      // be rejected for "exceeding" a due it is itself responsible for.
      const { count } = await tx.feePayment.updateMany({
        where: { id, voidedAt: null, replacedBy: { is: null } },
        data: { voidedAt: new Date(), voidedBy: req.user.id, voidReason: `Corrected: ${why}` },
      });
      if (count !== 1) throw Object.assign(new Error('This payment has just been voided or corrected.'), { status: 400 });
      const afterVoid = await recomputeInvoice(tx, existing.invoiceId, own);

      if (paidNum + discNum > afterVoid.due) {
        throw Object.assign(new Error(
          `Corrected amount (${rs(paidNum + discNum)}) exceeds the amount outstanding on this invoice (${rs(afterVoid.due)}).`
        ), { status: 400 });
      }

      // A correction re-keys the same cash, so the new row keeps the day it
      // was received, the person who received it and when it was first
      // entered. Dated today and credited to the corrector, it moved the
      // fee to the wrong month in reports and showed up as fresh cash in
      // the corrector's balance sheet. voidedBy/voidedAt on the original
      // record who corrected it and when.
      const replacement = await tx.feePayment.create({
        data: {
          schoolId,
          invoiceId: existing.invoiceId,
          studentId: existing.studentId,
          amountPaid: paidNum,
          discount: discNum,
          method: method || existing.method,
          receivedBy: existing.receivedBy,
          paymentDate: existing.paymentDate,
          createdAt: existing.createdAt,
          receiptNo: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          remarks: `Correction of receipt ${existing.receiptNo || existing.id}: ${why}`,
          replacesId: existing.id,
        },
      });
      const final = await recomputeInvoice(tx, existing.invoiceId, own);
      return { replacement, ...final };
    });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    throw err;
  }

  res.json({
    success: true,
    data: {
      payment: out.replacement,
      receiptNo: out.replacement.receiptNo,
      newDue: out.due,
      newStatus: out.status,
      voidedPaymentId: existing.id,
      previousAmount: existing.amountPaid,
    },
    message: `Corrected from ${rs(existing.amountPaid)} to ${rs(paidNum)}. A new receipt has been issued.`,
  });
}));

router.get('/defaulters', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId } = req.query;
  const pageSize = Math.min(parseInt(req.query.limit) || 50, 500);
  const offset = parseInt(req.query.offset) || 0;
  // ?monthYear=2026-07 narrows the list to one fee month (Fee Management's
  // "Monthly Fee Defaulters"), matching every stored spelling of it.
  const [, ofYear, ofMonth] = /^(\d{4})-(\d{1,2})$/.exec(String(req.query.monthYear || '')) || [];

  const where = {
    schoolId,
    status: { in: ['unpaid', 'partial'] },
    ...(campusId && { campusId }),
    ...(classId && { classId: parseInt(classId) }),
    ...(ofYear && { year: Number(ofYear), month: { in: monthKeys(Number(ofMonth)) } }),
  };

  const [invoices, total, sum, students] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      include: { student: { include: { class: true, section: true } } },
      orderBy: { dueAmount: 'desc' },
      take: pageSize,
      skip: offset,
    }),
    prisma.feeInvoice.count({ where }),
    prisma.feeInvoice.aggregate({ where, _sum: { dueAmount: true } }),
    prisma.feeInvoice.groupBy({ by: ['studentId'], where }),
  ]);

  // Totals for every defaulter, not only the page shown: the screen added
  // up the first 50 bills and called it the total due.
  res.json({ success: true, data: invoices, total, limit: pageSize, offset, summary: { totalDue: sum._sum.dueAmount || 0, students: students.length } });
}));

// POST /api/v1/fees/defaulters/sms  { classId?, studentIds?, channel: 'sms'|'whatsapp' }
// A reminder to each defaulter's parent: everyone, one class, or the
// students named. In the school's own words (SMS Templates → Fee Payment
// Reminder) through its own SMS or WhatsApp account (Settings → Channels).
router.post('/defaulters/sms', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, studentIds } = req.body || {};
  const channel = req.body?.channel === 'whatsapp' ? 'whatsapp' : 'sms';
  const onlyIds = Array.isArray(studentIds) ? studentIds.map((x) => parseInt(x)).filter((x) => x > 0) : null;
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  // The same campus as the defaulters list it is sent from (it reminded
  // every campus's defaulters while the list showed one campus).
  const invoices = await prisma.feeInvoice.findMany({
    where: {
      schoolId, status: { in: ['unpaid', 'partial'] }, dueAmount: { gt: 0 },
      ...(req.campusId && { campusId: req.campusId }),
      ...(classId && { classId: parseInt(classId) }),
      ...(onlyIds && { studentId: { in: onlyIds } }),
    },
    include: { student: true }
  });
  const { messageFor } = require('../services/messageTemplate');
  const { sendWhatsApp } = require('../services/whatsapp.service');
  const channels = (await readSettings(schoolId)).channels || {};
  // One message per student, not one per unpaid invoice: the total still
  // due, in rupees (the message prints "Rs." before it; the stored paisa
  // read as a hundred times the fee), and every month it covers. Counted
  // only when it went: every parent with a phone was counted as reminded,
  // even with nothing set up to send it.
  let sent = 0;
  let noPhone = 0;
  const failed = [];
  const dues = duesByStudent(invoices);
  for (const due of dues) {
    const phone = due.student?.emergencyPhone || due.student?.motherPhone;
    if (!phone) { noPhone++; continue; }
    const message = await messageFor(schoolId, 'fee_reminder', {
      parent_name: due.student.fatherName || 'Parent', student_name: due.student.name,
      fee_due: (due.totalDue / 100).toLocaleString('en-PK'), fee_title: due.months.join(', '), month: due.months.join(', '),
      due_date: payBy(due.invoices), roll_id: due.student.rollNo || '', school_name: school?.name || 'School',
    }, 'Dear {parent_name}, Rs. {fee_due} fee is due for {student_name} ({month}). Please pay by {due_date}. - {school_name}');
    if (!message) {
      return res.json({ success: true, data: { sent: 0 }, message: 'Fee reminders are switched off in Settings → SMS Templates, so none were sent.' });
    }
    const r = channel === 'whatsapp' ? await sendWhatsApp(phone, message, channels) : await sendSMS(phone, message, channels);
    if (r?.success) sent++;
    else failed.push({ name: due.student.name, reason: r?.error || 'Not sent' });
  }
  const label = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
  const notSet = failed.length && !sent && failed.every((f) => /not configured/i.test(f.reason));
  const message = !dues.length
    ? 'No unpaid fees to remind about.'
    : notSet
      ? `${label} is not set up for this school (Settings → Channels), so no reminder was sent.`
      : `${label} reminder sent to ${sent} of ${dues.length} parent${dues.length === 1 ? '' : 's'}.${failed.length ? ` ${failed.length} not sent (${failed[0].reason}).` : ''}${noPhone ? ` ${noPhone} without a phone number.` : ''}`;
  try {
    await prisma.notificationLog.create({
      data: { schoolId, type: channel, title: 'Fee reminder', body: message.slice(0, 200), status: sent ? 'sent' : 'failed', sentAt: new Date() },
    });
  } catch (_) { /* the log is not the message */ }
  res.json({ success: true, data: { sent, total: dues.length, failed, noPhone }, message });
}));

// "Please pay by ..." in a reminder: the nearest due date still ahead, or
// today when every month is already overdue (a past date reads as a typo).
function payBy(invoices, now = new Date()) {
  const todayStart = pktDayStart(pktDay(now));
  const ahead = invoices
    .map((inv) => inv.dueDate && new Date(inv.dueDate))
    .filter((d) => d && d >= todayStart)
    .sort((a, b) => a - b)[0];
  return dmy(pktDay(ahead || now));
}

// GET /api/v1/fees/structures
router.get('/structures', requireFinanceRole, wrap(async (req, res) => {
  const structures = await prisma.feeStructure.findMany({
    where: { schoolId: req.schoolId }, include: { class: true }
  });
  res.json({ success: true, data: structures });
}));

// What a class pays for one fee (amounts in paisa). Checked here: a missing
// class or amount used to reach the database and come back as a server error.
function structureInput(body) {
  const feeTitle = String(body.feeTitle ?? 'Monthly Fee').trim().replace(/\s+/g, ' ').slice(0, 80);
  const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));
  const amount = num(body.amount, NaN);
  const dueDayOfMonth = num(body.dueDayOfMonth, 10);
  const lateFeePerDay = num(body.lateFeePerDay, 0);
  if (!feeTitle) return { error: 'Give the fee a title, such as Monthly Fee.' };
  if (!Number.isInteger(amount) || amount <= 0) return { error: 'The amount must be more than 0.' };
  if (!Number.isInteger(dueDayOfMonth) || dueDayOfMonth < 1 || dueDayOfMonth > 31) return { error: 'The due day must be 1 to 31.' };
  if (!Number.isInteger(lateFeePerDay) || lateFeePerDay < 0) return { error: 'The late fee cannot be less than 0.' };
  return { feeTitle, amount, dueDayOfMonth, lateFeePerDay };
}
const sameFeeTitle = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// POST /api/v1/fees/structures — saving the same class and fee again
// changes it; it used to add a second row that billing never read.
router.post('/structures', requireFinanceRole, wrap(async (req, res) => {
  const input = structureInput(req.body || {});
  if (input.error) return res.status(400).json({ success: false, message: input.error });
  const cls = await prisma.class.findFirst({ where: { id: parseInt(req.body.classId) || 0, schoolId: req.schoolId }, select: { id: true } });
  if (!cls) return res.status(400).json({ success: false, message: 'Choose a class of this school.' });
  const same = (await prisma.feeStructure.findMany({ where: { schoolId: req.schoolId, classId: cls.id } }))
    .find((s) => sameFeeTitle(s.feeTitle, input.feeTitle));
  const structure = same
    ? await prisma.feeStructure.update({ where: { id: same.id }, data: input, include: { class: true } })
    : await prisma.feeStructure.create({ data: { schoolId: req.schoolId, classId: cls.id, ...input }, include: { class: true } });
  res.status(same ? 200 : 201).json({ success: true, data: structure, updated: !!same });
}));

// PUT /api/v1/fees/structures/:id
router.put('/structures/:id', requireFinanceRole, wrap(async (req, res) => {
  const row = await prisma.feeStructure.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!row) return res.status(404).json({ success: false, message: 'This fee was not found.' });
  const input = structureInput({ ...row, ...(req.body || {}) });
  if (input.error) return res.status(400).json({ success: false, message: input.error });
  const clash = await prisma.feeStructure.findMany({ where: { schoolId: req.schoolId, classId: row.classId, id: { not: row.id } } });
  if (clash.some((s) => sameFeeTitle(s.feeTitle, input.feeTitle))) {
    return res.status(409).json({ success: false, message: `This class already has a fee called "${input.feeTitle}".` });
  }
  const structure = await prisma.feeStructure.update({ where: { id: row.id }, data: input, include: { class: true } });
  res.json({ success: true, data: structure });
}));

// DELETE /api/v1/fees/structures/:id — bills already made are kept.
router.delete('/structures/:id', requireFinanceRole, wrap(async (req, res) => {
  const row = await prisma.feeStructure.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!row) return res.status(404).json({ success: false, message: 'This fee was not found.' });
  await prisma.feeStructure.delete({ where: { id: row.id } });
  res.json({ success: true, message: 'Fee removed. Bills already made are not changed.' });
}));

/* Fee types: the school's list of fee names (Admission Fee, Exam Fee…)
   offered when billing, each for every campus or for one. Kept with the
   school (settingsJson.feeTypes): it used to live in one browser's
   localStorage, so the other office computers never saw it, and the list
   offered three campuses the school did not have. */
const DEFAULT_FEE_TYPES = ['Monthly Tuition Fee', 'Admission Fee', 'Exam Fee', 'Transport Fee', 'Lab Fee',
  'Sports Fee', 'Computer Fee', 'Books Fee', 'Library Fee'].map((name, i) => ({ id: i + 1, name, campusId: null }));

const schoolCampuses = (schoolId) => prisma.campus.findMany({
  where: { schoolId }, select: { id: true, name: true, isMain: true }, orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
});

// GET /api/v1/fees/types — the list (the usual ones until the school saves
// its own) and the school's campuses to choose from.
router.get('/types', requireFinanceRole, wrap(async (req, res) => {
  const [settings, campuses] = await Promise.all([readSettings(req.schoolId), schoolCampuses(req.schoolId)]);
  const saved = Array.isArray(settings.feeTypes);
  // A campus since removed: the fee is then for every campus.
  const ids = new Set(campuses.map((c) => c.id));
  const types = (saved ? settings.feeTypes : DEFAULT_FEE_TYPES).map((t) => (t.campusId == null || ids.has(t.campusId) ? t : { ...t, campusId: null }));
  res.json({ success: true, data: { types, saved, campuses } });
}));

// PUT /api/v1/fees/types  { types: [{ id?, name, campusId? }] } — the whole list.
router.put('/types', requireFinanceRole, wrap(async (req, res) => {
  const list = req.body?.types;
  if (!Array.isArray(list) || list.length > 200) {
    return res.status(400).json({ success: false, message: 'Send the list of fee types (at most 200).' });
  }
  const campuses = await schoolCampuses(req.schoolId);
  const campusIds = new Set(campuses.map((c) => c.id));
  const seen = new Set();
  const types = [];
  let next = Math.max(0, ...list.map((t) => parseInt(t?.id) || 0)) + 1;
  for (const t of list) {
    const name = String(t?.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!name) return res.status(400).json({ success: false, message: 'Every fee type needs a name.' });
    const key = name.toLowerCase();
    if (seen.has(key)) return res.status(400).json({ success: false, message: `"${name}" is in the list twice.` });
    seen.add(key);
    const campusId = t.campusId === undefined || t.campusId === null || t.campusId === '' ? null : parseInt(t.campusId);
    if (campusId !== null && !campusIds.has(campusId)) {
      return res.status(400).json({ success: false, message: `Choose one of this school's campuses for "${name}", or all campuses.` });
    }
    let id = parseInt(t.id);
    if (!(id > 0) || types.some((x) => x.id === id)) id = next++;
    types.push({ id, name, campusId });
  }
  await mergeSettings(req.schoolId, { feeTypes: types });
  res.json({ success: true, data: { types, saved: true, campuses } });
}));



/* ═══ v3.3 CRUD: manual invoice insert / update / delete ═══ */
// INSERT — custom invoice with multiple heads (admission, annual, stationary...)
// FIX: this handler wrote `balance` and `remarks` to FeeInvoice.create(), but
// neither field exists on the FeeInvoice model (it uses `dueAmount`, and has
// no free-text remarks column) — every call threw a Prisma "unknown
// argument" validation error. It also never set the required `feeTitle`
// column, which would have failed on its own. Rewritten to use only real
// columns: dueAmount instead of balance, status 'unpaid' (matches the rest
// of the module's status values), and feeTitle summarised from the heads.
router.post('/invoices', requireFinanceRole, wrap(async (req, res) => {
  const { studentId, month, year, heads = [], dueDate, remarks } = req.body;
  if (!studentId || !heads.length) return res.status(400).json({ success: false, message: 'Choose a student and add at least one fee head.' });
  const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), schoolId: req.schoolId } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  if (heads.some((h) => !String(h.name || '').trim() || !(parseInt(h.amount) > 0))) {
    return res.status(400).json({ success: false, message: 'Every fee head needs a name and an amount more than 0.' });
  }
  const total = heads.reduce((a, h) => a + (parseInt(h.amount) || 0), 0);
  const feeTitle = heads.length > 1 ? `Custom Fee (${heads.length} heads)` : (heads[0]?.name || 'Custom Fee');
  // The month the bill is for, in Pakistan: the UTC server's own month is
  // still last month for the first five hours of each month here.
  const pkNow = new Date(Date.now() + PKT_MS);
  const monthNum = month ? monthNumber(month) : pkNow.getUTCMonth() + 1;
  const yearNum = year ? parseInt(year) : pkNow.getUTCFullYear();
  if (!monthNum || !(yearNum >= 2000 && yearNum <= pkNow.getUTCFullYear() + 1)) {
    return res.status(400).json({ success: false, message: 'Choose a valid month and year for this bill.' });
  }
  if (dueDate && !isDay(String(dueDate).slice(0, 10))) {
    return res.status(400).json({ success: false, message: 'The due date must be a date (YYYY-MM-DD).' });
  }
  const inv = await prisma.feeInvoice.create({
    data: {
      schoolId: req.schoolId, campusId: student.campusId, studentId: student.id,
      classId: student.classId,
      feeTitle,
      month: String(monthNum),
      year: yearNum,
      totalAmount: total, paidAmount: 0, dueAmount: total, status: 'unpaid',
      // A due date is a day: midday in Pakistan keeps it on that day everywhere.
      dueDate: dueDate ? new Date(`${String(dueDate).slice(0, 10)}T07:00:00.000Z`) : new Date(Date.now() + 10 * 864e5),
      // Keep the itemised heads (amounts in paisa) so the printed voucher
      // can list Admission, Annual, Uniform... instead of one lump sum.
      remarks: JSON.stringify(heads.map((h) => ({ name: String(h.name || ''), amount: parseInt(h.amount) || 0 }))),
    }
  });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_CREATED', resource: 'fee_invoice', resourceId: inv.id, details: JSON.stringify({ total, heads }) } }).catch(() => null);
  res.status(201).json({ success: true, data: inv });
}));

// UPDATE — amount / due date / status adjust
// FIX: wrote `balance` (not a FeeInvoice column — the column is `dueAmount`)
// and `remarks` (doesn't exist on FeeInvoice at all); both threw a Prisma
// validation error on every call, so editing an invoice always failed.
router.put('/invoices/:id', requireFinanceRole, wrap(async (req, res) => {
  // The status follows the amounts (paid, part paid, unpaid): it used to be
  // set from the form, so a bill could say "paid" with nothing paid, and
  // the balance left out the discount and the late fee.
  const { totalAmount, dueDate } = req.body;
  const inv = await prisma.feeInvoice.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  const newTotal = totalAmount !== undefined && totalAmount !== '' ? Number(totalAmount) : inv.totalAmount;
  if (!Number.isInteger(newTotal) || newTotal < 0) return res.status(400).json({ success: false, message: 'The amount must be 0 or more.' });
  if (dueDate && !isDay(String(dueDate).slice(0, 10))) return res.status(400).json({ success: false, message: 'The due date must be a date (YYYY-MM-DD).' });
  const updated = await prisma.$transaction(async (tx) => {
    const totals = await paymentTotals(tx, inv.id);
    const own = Math.max(0, (inv.discount || 0) - totals.paymentDiscount);
    if (newTotal + (inv.lateFee || 0) < totals.paid + totals.paymentDiscount) {
      throw Object.assign(new Error(`${rs(totals.paid)} has already been paid on this bill; the amount cannot be less than that.`), { status: 400 });
    }
    // The bill's own discount stays, up to the new amount.
    const keep = Math.min(own, Math.max(0, newTotal + (inv.lateFee || 0) - totals.paid - totals.paymentDiscount));
    const data = figures({ ...inv, totalAmount: newTotal }, totals, keep);
    return tx.feeInvoice.update({
      where: { id: inv.id },
      data: { totalAmount: newTotal, ...data, ...(dueDate && { dueDate: new Date(`${String(dueDate).slice(0, 10)}T07:00:00.000Z`) }) },
    });
  }).catch((err) => { if (err.status) return { error: err }; throw err; });
  if (updated.error) return res.status(400).json({ success: false, message: updated.error.message });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_UPDATED', resource: 'fee_invoice', resourceId: inv.id, details: JSON.stringify({ from: inv.totalAmount, to: newTotal }) } }).catch(() => null);
  res.json({ success: true, data: updated });
}));

// DELETE — unpaid invoices only (audit-logged)
router.delete('/invoices/:id', requireFinanceRole, wrap(async (req, res) => {
  const inv = await prisma.feeInvoice.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  if (inv.paidAmount > 0) return res.status(400).json({ success: false, message: 'A paid invoice cannot be deleted — please reverse the payment first.' });
  await prisma.feeInvoice.delete({ where: { id: inv.id } });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_DELETED', resource: 'fee_invoice', resourceId: inv.id, details: JSON.stringify({ amount: inv.totalAmount, month: inv.month }) } }).catch(() => null);
  res.json({ success: true, message: 'Invoice deleted.' });
}));

// GET /api/v1/fees/student-by-barcode?barcode=<value>
// Barcode = roll no OR admission number on the fee slip.
// Returns student info + all unpaid/partial invoices so the accountant can collect instantly.
router.get('/student-by-barcode', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { barcode } = req.query;
  if (!barcode || !barcode.trim()) {
    return res.status(400).json({ success: false, message: 'barcode query parameter is required.' });
  }

  const code = barcode.trim();

  // Roll number first, then the voucher number printed on a fee slip.
  // (It used to also match `admissionNo`, a field Student does not have, so
  // every lookup failed with a server error.)
  const studentInclude = {
    class:   { select: { id: true, name: true } },
    section: { select: { id: true, name: true } },
  };
  let student = await prisma.student.findFirst({
    where: { schoolId, deletedAt: null, ...(campusId && { campusId }), rollNo: ciEquals(code) },
    include: studentInclude,
  });
  if (!student) {
    const voucher = await prisma.feeInvoice.findFirst({ where: { schoolId, voucherNo: code }, select: { studentId: true } });
    if (voucher) {
      student = await prisma.student.findFirst({ where: { id: voucher.studentId, schoolId, deletedAt: null }, include: studentInclude });
    }
  }

  // Fallback: partial match on rollNo (handles barcodes with leading zeros etc.)
  if (!student) {
    student = await prisma.student.findFirst({
      where: {
        schoolId,
        deletedAt: null,
        ...(campusId && { campusId }),
        rollNo: ciContains(code),
      },
      include: {
        class:   { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
  }

  if (!student) {
    return res.status(404).json({ success: false, message: `No student found for barcode: ${code}` });
  }

  // Fetch all invoices; frontend filters to unpaid/partial for quick display.
  // Newest month first by its number, not by the text column ("9" > "12").
  const invoices = await prisma.feeInvoice.findMany({
    where: { schoolId, studentId: student.id },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
  });
  invoices.sort(byPeriodDesc);

  res.json({ success: true, data: { student, invoices } });
}));

// GET /api/v1/fees/payments — Filter fee payments by accountant, date range, and limit
// Query: ?accountant=<userId>&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50
router.get('/payments', requireFinanceRole, wrap(async (req, res) => {
  const { accountant, from, to, limit = 50, page = 1, method } = req.query;
  const take = Math.min(parseInt(limit) || 50, 500); // hard cap at 500
  // ?method=wallet,card: only payments made that way (the Online Payment page).
  const methods = method ? String(method).split(',').map((m) => m.trim()).filter(Boolean) : null;
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
  // from/to are Pakistan days, matched on the day the money was received.
  const dates = pktRange(from, to);
  if (dates.error) return res.status(400).json({ success: false, message: dates.error });

  const where = {
    schoolId: req.schoolId,
    ...(accountant && { receivedBy: parseInt(accountant) }),
    ...(dates.range && { paymentDate: dates.range }),
    ...(methods && { method: { in: methods } }),
  };

  const [payments, total] = await Promise.all([
    prisma.feePayment.findMany({
      where,
      skip,
      take,
      include: {
        invoice: {
          select: {
            feeTitle: true,
            month: true,
            year: true,
            voucherNo: true,
            student: { select: { id: true, name: true, rollNo: true, fatherName: true, class: { select: { name: true } } } },
          },
        },
        // receivedBy is just an Int field (userId) — no relation in schema
      },
      orderBy: { paymentDate: 'desc' },
    }),
    prisma.feePayment.count({ where }),
  ]);

  // receivedBy has no relation in the schema, so look the names up here;
  // the daily balance sheet showed "User #1" without them.
  const receiverIds = [...new Set(payments.map((p) => p.receivedBy).filter(Boolean))];
  const receivers = receiverIds.length
    ? await prisma.user.findMany({ where: { id: { in: receiverIds } }, select: { id: true, name: true, email: true, role: true } })
    : [];
  const byId = new Map(receivers.map((u) => [u.id, u]));
  payments.forEach((p) => { p.receivedByUser = byId.get(p.receivedBy) || null; });

  // Voided rows stay in the list so the correction is visible to whoever
  // is reconciling the day's cash, but they are not money collected, so
  // they are excluded from the total the dashboard also reports.
  // Over every payment matching the filters, not only this page (the
  // total was the first 50 rows' and read as the day's or month's total).
  const [liveSum, voidedCount] = await Promise.all([
    prisma.feePayment.aggregate({ where: { ...where, voidedAt: null }, _sum: { amountPaid: true } }),
    prisma.feePayment.count({ where: { ...where, voidedAt: { not: null } } }),
  ]);
  const totalAmount = liveSum._sum.amountPaid || 0;

  res.json({
    success: true,
    data: payments,
    total,
    totalAmount,
    voidedCount,
    page: parseInt(page),
    pages: Math.ceil(total / take),
  });
}));

// GET /api/v1/fees/payments/export — the Fee Collection Report.
// The money RECEIVED in a month (?month=1-12&year=YYYY), or between two days
// (?from=&to=, which take precedence), as rows ready for CSV/Excel. Row
// amounts are rupees (they go straight into a spreadsheet); totalAmount is
// paisa like every other API figure.
//
// This filtered on the invoice's month with parseInt() against a text column,
// which Prisma rejects, so the report never loaded. It also asked which month
// a fee was FOR rather than when it was paid; a collection report is about
// money received, so it goes by the payment date.
router.get('/payments/export', requireFinanceRole, wrap(async (req, res) => {
  const { month, year, from, to } = req.query;

  let paymentDate;
  let period;
  if (from || to) {
    const dates = pktRange(from, to);
    if (dates.error) return res.status(400).json({ success: false, message: dates.error });
    paymentDate = dates.range;
    period = `${from ? dmy(from) : 'the start'} to ${to ? dmy(to) : 'today'}`;
  } else {
    const m = monthNumber(month);
    const y = Number(year);
    if (!m || !Number.isInteger(y) || y < 2000) {
      return res.status(400).json({ success: false, message: 'Choose a month and year, or a from and to date.' });
    }
    paymentDate = pktMonth(m, y);
    period = `${monthLabel(m)} ${y}`;
  }

  const payments = await prisma.feePayment.findMany({
    where: {
      schoolId: req.schoolId, voidedAt: null, paymentDate,
      // A parent's "I have paid online" note is stored as a Rs 0 payment
      // until someone checks the transfer: not money received.
      OR: [{ amountPaid: { gt: 0 } }, { discount: { gt: 0 } }],
    },
    include: {
      invoice: {
        select: {
          feeTitle: true,
          month: true,
          year: true,
          voucherNo: true,
          student: {
            select: { id: true, name: true, rollNo: true, class: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
    take: 5000, // safety cap
  });

  const receiverIds = [...new Set(payments.map((p) => p.receivedBy).filter(Boolean))];
  const receivers = receiverIds.length
    ? await prisma.user.findMany({ where: { id: { in: receiverIds } }, select: { id: true, name: true } })
    : [];
  const receiverName = new Map(receivers.map((u) => [u.id, u.name]));

  const rows = payments.map((p) => {
    const paidOn = pktDay(p.paymentDate);
    const enteredOn = pktDay(p.createdAt);
    return {
      'Date':          dmy(paidOn),
      'Receipt No':    p.receiptNo || '',
      'Voucher No':    p.invoice?.voucherNo || '',
      'Student':       p.invoice?.student?.name || '',
      'Roll No':       p.invoice?.student?.rollNo || '',
      'Class':         p.invoice?.student?.class?.name || '',
      'Fee':           p.invoice?.feeTitle || '',
      'Fee Month':     p.invoice?.month ? `${monthLabel(p.invoice.month)} ${p.invoice.year || ''}`.trim() : '',
      'Amount (Rs)':   (p.amountPaid || 0) / 100,
      'Discount (Rs)': (p.discount || 0) / 100,
      'Method':        p.method || 'cash',
      // Imported history has no receiver: it is a record, not anyone's cash.
      'Received By':   p.receivedBy ? (receiverName.get(p.receivedBy) || 'Unknown user') : 'Imported',
      // Filled only for a fee keyed in on a later day than it was paid.
      'Entered On':    enteredOn !== paidOn ? dmy(enteredOn) : '',
    };
  });

  const totalAmount = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalDiscount = payments.reduce((sum, p) => sum + (p.discount || 0), 0);

  res.json({ success: true, data: rows, total: rows.length, totalAmount, totalDiscount, period });
}));

/* ── POST /fees/increment — Apply fee increment to all students in a class ── */
router.post('/increment', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, mode, value, reason } = req.body;
  if (!value || value <= 0) return res.status(400).json({ success: false, message: 'Value required' });

  // Update FeeStructure for this class
  const structures = await prisma.feeStructure.findMany({ where: { schoolId, ...(classId && { classId: parseInt(classId) }) } });
  let updatedCount = 0;
  for (const s of structures) {
    const newAmt = mode === 'pct'
      ? Math.round(s.amount * (1 + parseFloat(value) / 100))
      : Math.round(s.amount + parseFloat(value));
    await prisma.feeStructure.update({ where: { id: s.id }, data: { amount: newAmt } });
    updatedCount++;
  }
  res.json({ success: true, message: `Fee incremented for ${updatedCount} structure(s)`, updated: updatedCount });
}));

/* ── POST /fees/decrement — Apply fee decrement ── */
router.post('/decrement', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, mode, value, reason } = req.body;
  if (!value || value <= 0) return res.status(400).json({ success: false, message: 'Value required' });

  const structures = await prisma.feeStructure.findMany({ where: { schoolId, ...(classId && { classId: parseInt(classId) }) } });
  let updatedCount = 0;
  for (const s of structures) {
    const newAmt = mode === 'pct'
      ? Math.round(s.amount * (1 - parseFloat(value) / 100))
      : Math.round(s.amount - parseFloat(value));
    await prisma.feeStructure.update({ where: { id: s.id }, data: { amount: Math.max(0, newAmt) } });
    updatedCount++;
  }
  res.json({ success: true, message: `Fee decremented for ${updatedCount} structure(s)`, updated: updatedCount });
}));

/* ── GET /fees/discounts — List students with active discounts ── */
router.get('/discounts', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const discounted = await prisma.feeInvoice.findMany({
    where: { schoolId, discount: { gt: 0 }, status: { not: 'paid' } },
    select: { studentId: true, discount: true, student: { select: { id: true, name: true, rollNo: true, class: { select: { name: true } } } } },
    distinct: ['studentId'],
  });
  res.json({ success: true, data: discounted });
}));

/* ── POST /fees/discounts — Apply discount to student's pending invoices ── */
router.post('/discounts', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  // Sets each open bill's own discount (0 removes it). It used to set the
  // balance to "amount − discount", forgetting what was already paid and
  // the late fee, never changed the status, and refused 0, so "Remove"
  // never worked.
  const { studentId, discountType, discountValue, reason } = req.body;
  const value = Number(discountValue);
  const percent = discountType === 'percent';
  if (!studentId || discountValue === undefined || discountValue === null || discountValue === '' || !Number.isFinite(value) || value < 0) {
    return res.status(400).json({ success: false, message: 'Choose a student and a discount of 0 or more.' });
  }
  if (percent && value > 100) return res.status(400).json({ success: false, message: 'A percentage discount cannot be more than 100.' });
  const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), schoolId }, select: { id: true } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  // Open bills, and bills with no balance only because of a discount (so a
  // discount can be taken off again).
  const invoices = (await prisma.feeInvoice.findMany({ where: { schoolId, studentId: student.id, OR: [{ status: { not: 'paid' } }, { discount: { gt: 0 } }] } }));
  let applied = 0;
  await prisma.$transaction(async (tx) => {
    for (const inv of invoices) {
      const totals = await paymentTotals(tx, inv.id);
      // A bill settled by payments is left alone.
      if (totals.paid + totals.paymentDiscount >= inv.totalAmount + inv.lateFee) continue;
      const amount = percent ? Math.round(inv.totalAmount * value / 100) : Math.round(value);
      await setOwnDiscount(tx, inv.id, amount);
      applied++;
    }
    await tx.auditLog.create({
      data: { schoolId, userId: req.user.id, action: value > 0 ? 'FEE_DISCOUNT_APPLIED' : 'FEE_DISCOUNT_REMOVED', resource: 'student', resourceId: student.id, details: JSON.stringify({ discountType: percent ? 'percent' : 'flat', discountValue: value, reason: reason || null, invoices: applied }) },
    });
  });
  res.json({ success: true, message: value > 0 ? `Discount applied to ${applied} bill(s).` : `Discount removed from ${applied} bill(s).`, applied });
}));

/* ── GET /fees/student-fee-details/:studentId — Fee heads with class structure ── */
// Finance staff only: it returns the whole student record (parents' CNICs,
// medical notes, phones) and any child's discounts; parents and students could
// read it for any child of the school.
router.get('/student-fee-details/:studentId', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const studentId = parseInt(req.params.studentId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, deletedAt: null },
    include: { class: true, section: true },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  // Get fee structures for the student's class
  const structures = await prisma.feeStructure.findMany({
    where: { schoolId, classId: student.classId || 0 },
  });

  // Build default fee heads from FeeStructure entries; if none exist, use defaults
  let heads;
  if (structures.length > 0) {
    heads = structures.map(s => ({
      name: s.feeTitle,
      amount: s.amount,
      discount: 0,
      netAmount: s.amount,
    }));
  } else {
    // Fallback: show standard heads with zero amounts
    heads = [
      { name: 'Admission Fee', amount: 0, discount: 0, netAmount: 0 },
      { name: 'Tuition Fee',   amount: 0, discount: 0, netAmount: 0 },
      { name: 'Stationary',    amount: 0, discount: 0, netAmount: 0 },
      { name: 'Annual Fund',   amount: 0, discount: 0, netAmount: 0 },
    ];
  }

  // The student's saved per-head discounts: kept with the change in the
  // audit log (they used to be written over the remarks of every open bill,
  // and were lost as soon as a new month was billed).
  const { feeHeadDiscounts: savedDiscounts, comments: savedComments } = await savedHeadDiscounts(schoolId, studentId);

  // Apply saved discounts
  heads = heads.map(h => {
    const disc = savedDiscounts[h.name] || 0;
    return { ...h, discount: disc, netAmount: Math.max(0, h.amount - disc) };
  });

  const totalFee      = heads.reduce((s, h) => s + h.amount, 0);
  const discountTotal = heads.reduce((s, h) => s + h.discount, 0);
  const netTotal      = heads.reduce((s, h) => s + h.netAmount, 0);

  res.json({ success: true, data: { student, feeStructure: { heads }, totalFee, discountTotal, netTotal, comments: savedComments } });
}));

/* ── PUT /fees/student-discount/:studentId — Apply per-head discounts to student ──
   Each open bill gets the discount of ITS fee head: the Tuition discount on
   the monthly bills, the Admission discount on the admission bill. Every
   head's discount used to come off every bill (a Rs 500 tuition and Rs 1,000
   admission discount took Rs 1,500 off each month), and the remarks of every
   bill were replaced with the discount list. */
router.put('/student-discount/:studentId', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const studentId = parseInt(req.params.studentId);
  const { heads = [], comments = '' } = req.body;

  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId, deletedAt: null } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  if (!Array.isArray(heads)) return res.status(400).json({ success: false, message: 'heads must be a list.' });

  const feeHeadDiscounts = {};
  const byKind = new Map();
  for (const h of heads) {
    const name = String(h?.name || '').trim();
    const d = Number(h?.discount) || 0;
    if (!name) continue;
    if (!Number.isInteger(d) || d < 0) return res.status(400).json({ success: false, message: `The discount on ${name} must be 0 or more.` });
    feeHeadDiscounts[name] = d;
    byKind.set(feeKind(name), (byKind.get(feeKind(name)) || 0) + d);
  }
  const totalDiscount = Object.values(feeHeadDiscounts).reduce((a, b) => a + b, 0);

  // A bill's discount: its own head's, or for a bill of several heads (made
  // on Manage Invoices) each of its heads' discounts, up to that head's amount.
  const discountFor = (inv) => {
    let parts = null;
    try { const j = JSON.parse(inv.remarks || ''); if (Array.isArray(j)) parts = j; } catch { /* plain remarks */ }
    if (parts && parts.length) return parts.reduce((t, p) => t + Math.min(byKind.get(feeKind(p.name)) || 0, Number(p.amount) || 0), 0);
    return byKind.get(feeKind(inv.feeTitle)) || 0;
  };

  const bills = await prisma.feeInvoice.findMany({
    where: { schoolId, studentId, OR: [{ status: { not: 'paid' } }, { discount: { gt: 0 } }] },
    orderBy: { createdAt: 'desc' },
  });
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const inv of bills) {
      const totals = await paymentTotals(tx, inv.id);
      if (totals.paid + totals.paymentDiscount >= inv.totalAmount + inv.lateFee) continue; // settled by payments
      await setOwnDiscount(tx, inv.id, discountFor(inv));
      updated++;
    }
    await tx.auditLog.create({
      data: {
        schoolId, userId: req.user.id, action: 'FEE_HEAD_DISCOUNTS', resource: 'student', resourceId: studentId,
        details: JSON.stringify({ feeHeadDiscounts, comments: String(comments || '').slice(0, 500), totalDiscount, invoicesUpdated: updated }),
      },
    });
  });

  res.json({ success: true, message: `Discounts applied. ${updated} bill(s) updated.`, updated, totalDiscount });
}));

// The per-head discounts last saved for a student (the audit log keeps
// them; before this, the remarks of the student's latest bill did).
async function savedHeadDiscounts(schoolId, studentId) {
  const log = await prisma.auditLog.findFirst({
    where: { schoolId, action: 'FEE_HEAD_DISCOUNTS', resource: 'student', resourceId: studentId },
    orderBy: { createdAt: 'desc' },
  });
  try {
    const j = JSON.parse(log?.details || '');
    if (j?.feeHeadDiscounts) return { feeHeadDiscounts: j.feeHeadDiscounts, comments: j.comments || '' };
  } catch { /* none */ }
  const old = await prisma.feeInvoice.findFirst({ where: { schoolId, studentId, remarks: { contains: 'feeHeadDiscounts' } }, orderBy: { createdAt: 'desc' } });
  try {
    const j = JSON.parse(old?.remarks || '');
    if (j?.feeHeadDiscounts) return { feeHeadDiscounts: j.feeHeadDiscounts, comments: j.comments || '' };
  } catch { /* none */ }
  return { feeHeadDiscounts: {}, comments: '' };
}

/* ── POST /fees/payments/online — Parent self-service "I have paid" ── */
// Accessible to all authenticated users (parents included).
// Records a payment intent with method=online and status pending.
// Admin/accountant will confirm the payment after verifying transfer proof.
router.post('/payments/online', wrap(async (req, res) => {
  const { schoolId } = req;
  const { invoiceId, method = 'online', reference = '' } = req.body;
  if (!invoiceId) return res.status(400).json({ success: false, message: 'invoiceId required.' });

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: parseInt(invoiceId), schoolId },
    include: { student: { select: { name: true, rollNo: true } } },
  });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'This invoice is already paid.' });

  // Create a pending payment record — amount = full due amount, not yet credited
  const receiptNo = `ONL-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const payment = await prisma.feePayment.create({
    data: {
      schoolId,
      invoiceId: parseInt(invoiceId),
      studentId: invoice.studentId,
      amountPaid: 0,           // 0 until accountant confirms
      discount: 0,
      method,
      receivedBy: req.user.id,
      notifiedVia: 'none',
      receiptNo,
      remarks: JSON.stringify({ onlinePayment: true, method, reference, status: 'pending_confirmation', submittedBy: req.user.id, submittedAt: new Date().toISOString() }),
    },
  });

  res.status(201).json({
    success: true,
    data: { payment, receiptNo },
    message: 'Payment intent recorded. School admin will confirm once transfer is verified.',
  });
}));

module.exports = router;
// Pure helpers, exported for tests/fees/fee-history.test.mjs.
module.exports.helpers = { pktDayStart, pktDayEnd, pktMonth, pktDay, pktRange, payBy, billedFor };
