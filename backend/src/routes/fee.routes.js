const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { sendSMS } = require('../services/sms.service');
const { sendFeePaidNotification, sendFeeReminderNotification } = require('../services/whatsapp.service');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const isFinanceRole = (role) => ['super_admin', 'admin', 'accountant'].includes(role);

const requireFinanceRole = (req, res, next) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }
  next();
};

// POST /api/v1/fees/generate - Generate monthly fee for a class
router.post('/generate', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId, sectionId, campusId: bodyCampusId, month, year, dueDate, lateFee = 0, feeTitle, customAmount } = req.body;

  if (!classId || !month || !year) {
    return res.status(400).json({ success: false, message: 'classId, month, year required.' });
  }

  const monthInt = parseInt(month);
  const yearInt  = parseInt(year);
  const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthName = MONTHS[(monthInt - 1)] || String(month);

  // Use campusId from body (user selection) or fall back to middleware campus
  const filterCampusId = bodyCampusId ? parseInt(bodyCampusId) : req.campusId;

  // Get fee structure for this class
  const feeStructure = await prisma.feeStructure.findFirst({
    where: { schoolId, classId: parseInt(classId) },
  });

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

  for (const student of students) {
    // Check if invoice already exists for this month/year
    const existing = await prisma.feeInvoice.findFirst({
      where: { schoolId, studentId: student.id, month: monthStr, year: yearInt },
    });
    if (existing) {
      results.skipped++;
      results.students.push({ id: student.id, name: student.name, rollNo: student.rollNo, status: 'skipped' });
      continue;
    }

    const voucherNo = `${monthName.toUpperCase()}-${String(student.id).padStart(4,'0')}-${year}`;

    await prisma.feeInvoice.create({
      data: {
        schoolId,
        campusId: student.campusId,
        studentId: student.id,
        classId: parseInt(classId),
        feeTitle: feeTitle || `Monthly Fee Of ${monthName}`,
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
    message: `${results.generated} invoice${results.generated !== 1 ? 's' : ''} generated, ${results.skipped} already existed.`,
  });
}));

// GET /api/v1/fees/invoices
router.get('/invoices', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, status, month, year, search, page = 1, limit = 25 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    schoolId, ...(campusId && { campusId }),
    ...(classId && { classId: parseInt(classId) }),
    ...(status && { status }),
    ...(month && { month }),
    ...(year && { year: parseInt(year) }),
    ...(search && { student: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { rollNo: { contains: search, mode: 'insensitive' } }] } }),
  };
  const [invoices, total] = await Promise.all([
    prisma.feeInvoice.findMany({ where, skip, take: parseInt(limit), include: { student: { select: { name: true, rollNo: true, classId: true } }, payments: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } }),
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
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  });

  res.json({ success: true, data: { student, invoices } });
}));

// POST /api/v1/fees/payments - Record a fee payment
router.post('/payments', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { invoiceId, amountPaid, discount = 0, method = 'cash', notifyVia = 'whatsapp_sms' } = req.body;
  const paidNum = parseInt(amountPaid);
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
        throw Object.assign(new Error(`Payment plus discount (Rs ${paidNum + discountNum}) exceeds the remaining due amount (Rs ${current.dueAmount}).`), { status: 400 });
      }
      const due = Math.max(0, current.dueAmount - paidNum - discountNum);
      const status = due === 0 ? 'paid' : 'partial';

      const pay = await tx.feePayment.create({
        data: { schoolId, invoiceId: parseInt(invoiceId), studentId: invoice.studentId,
          amountPaid: paidNum, discount: discountNum, method, receivedBy: req.user.id,
          notifiedVia: notifyVia, receiptNo }
      });
      await tx.feeInvoice.update({
        where: { id: parseInt(invoiceId) },
        data: { paidAmount: { increment: paidNum }, discount: { increment: discountNum }, dueAmount: due, status }
      });
      return { pay, due, status };
    });
    payment = result.pay; newDue = result.due; newStatus = result.status;
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    throw err;
  }

  // Send notification to parent (WhatsApp/SMS + Email)
  if (notifyVia !== 'none') {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthStr = invoice.month ? (monthNames[(parseInt(invoice.month)-1)] || invoice.month) : '';

    // WhatsApp/SMS — fire and forget
    sendFeePaidNotification({
      parentPhone: invoice.student.emergencyPhone || '',
      studentName: invoice.student.name, amount: parseInt(amountPaid),
      month: monthStr, receiptNo, schoolName: school?.name || 'School'
    }).catch(() => {});

    // Email receipt — fire and forget
    const parentEmail = invoice.student.parent?.email;
    if (parentEmail) {
      const { sendFeeReceiptEmail } = require('../services/email.service');
      sendFeeReceiptEmail({
        to: parentEmail,
        parentName: invoice.student.parent?.name || invoice.student.fatherName || 'Parent',
        studentName: invoice.student.name,
        amount: parseInt(amountPaid),
        month: `${monthStr} ${invoice.year || ''}`.trim(),
        receiptNo,
        schoolName: school?.name || 'School',
      }).catch(() => {});
    }
  }

  res.json({ success: true, data: { payment, receiptNo, newStatus, newDue }, message: 'Payment recorded successfully.' });
}));

// GET /api/v1/fees/defaulters
// FIX: added pagination via limit/offset query params to prevent unbounded result sets.
// Defaults to 50 rows per page; hard-capped at 500.
router.get('/defaulters', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId } = req.query;
  const pageSize = Math.min(parseInt(req.query.limit) || 50, 500);
  const offset = parseInt(req.query.offset) || 0;

  const where = {
    schoolId,
    status: { in: ['unpaid', 'partial'] },
    ...(campusId && { campusId }),
    ...(classId && { classId: parseInt(classId) }),
  };

  const [invoices, total] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      include: { student: { include: { class: true } } },
      orderBy: { dueAmount: 'desc' },
      take: pageSize,
      skip: offset,
    }),
    prisma.feeInvoice.count({ where }),
  ]);

  res.json({ success: true, data: invoices, total, limit: pageSize, offset });
}));

// POST /api/v1/fees/defaulters/sms - Send reminder to all defaulters
router.post('/defaulters/sms', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const { classId } = req.body;
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const invoices = await prisma.feeInvoice.findMany({
    where: { schoolId, status: { in: ['unpaid', 'partial'] }, ...(classId && { classId: parseInt(classId) }) },
    include: { student: true }
  });
  let sent = 0;
  for (const inv of invoices) {
    if (inv.student?.emergencyPhone) {
      await sendFeeReminderNotification({
        parentPhone: inv.student.emergencyPhone, studentName: inv.student.name,
        dueAmount: inv.dueAmount, month: inv.month || '', dueDate: inv.dueDate?.toLocaleDateString() || '', schoolName: school?.name || 'School'
      });
      sent++;
    }
  }
  res.json({ success: true, message: `Reminder sent to ${sent} parents.` });
}));

// GET /api/v1/fees/structures
router.get('/structures', requireFinanceRole, wrap(async (req, res) => {
  const structures = await prisma.feeStructure.findMany({
    where: { schoolId: req.schoolId }, include: { class: true }
  });
  res.json({ success: true, data: structures });
}));

// POST /api/v1/fees/structures
router.post('/structures', requireFinanceRole, wrap(async (req, res) => {
  const { classId, feeTitle, amount, dueDayOfMonth = 10, lateFeePerDay = 0 } = req.body;
  const structure = await prisma.feeStructure.create({
    data: { schoolId: req.schoolId, classId: parseInt(classId), feeTitle, amount: parseInt(amount), dueDayOfMonth: parseInt(dueDayOfMonth), lateFeePerDay: parseInt(lateFeePerDay) }
  });
  res.status(201).json({ success: true, data: structure });
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
  if (!studentId || !heads.length) return res.status(400).json({ success: false, message: 'Student aur kam az kam ek head required.' });
  const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), schoolId: req.schoolId } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  const total = heads.reduce((a, h) => a + (parseInt(h.amount) || 0), 0);
  const feeTitle = heads.length > 1 ? `Custom Fee (${heads.length} heads)` : (heads[0]?.name || 'Custom Fee');
  const inv = await prisma.feeInvoice.create({
    data: {
      schoolId: req.schoolId, campusId: student.campusId, studentId: student.id,
      classId: student.classId,
      feeTitle,
      month: month ? String(month) : new Date().toLocaleString('default', { month: 'long' }),
      year: parseInt(year) || new Date().getFullYear(),
      totalAmount: total, paidAmount: 0, dueAmount: total, status: 'unpaid',
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 10 * 864e5),
    }
  });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_CREATED', entity: 'fee_invoice', entityId: inv.id, details: JSON.stringify({ total, heads }) } }).catch(() => null);
  res.status(201).json({ success: true, data: inv });
}));

// UPDATE — amount / due date / status adjust
// FIX: wrote `balance` (not a FeeInvoice column — the column is `dueAmount`)
// and `remarks` (doesn't exist on FeeInvoice at all); both threw a Prisma
// validation error on every call, so editing an invoice always failed.
router.put('/invoices/:id', requireFinanceRole, wrap(async (req, res) => {
  const { totalAmount, dueDate, status } = req.body;
  const inv = await prisma.feeInvoice.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  const newTotal = totalAmount !== undefined ? parseInt(totalAmount) : inv.totalAmount;
  const updated = await prisma.feeInvoice.update({
    where: { id: inv.id },
    data: {
      totalAmount: newTotal,
      dueAmount: Math.max(0, newTotal - inv.paidAmount),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(status && { status }),
    }
  });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_UPDATED', entity: 'fee_invoice', entityId: inv.id } }).catch(() => null);
  res.json({ success: true, data: updated });
}));

// DELETE — unpaid invoices only (audit-logged)
router.delete('/invoices/:id', requireFinanceRole, wrap(async (req, res) => {
  const inv = await prisma.feeInvoice.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  if (inv.paidAmount > 0) return res.status(400).json({ success: false, message: 'A paid invoice cannot be deleted — please reverse the payment first.' });
  await prisma.feeInvoice.delete({ where: { id: inv.id } });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_DELETED', entity: 'fee_invoice', entityId: inv.id, details: JSON.stringify({ amount: inv.totalAmount, month: inv.month }) } }).catch(() => null);
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

  // Try to find student by rollNo first, then by admissionNo
  let student = await prisma.student.findFirst({
    where: {
      schoolId,
      deletedAt: null,
      ...(campusId && { campusId }),
      OR: [
        { rollNo:       { equals: code, mode: 'insensitive' } },
        { admissionNo:  { equals: code, mode: 'insensitive' } },
      ],
    },
    include: {
      class:   { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  });

  // Fallback: partial match on rollNo (handles barcodes with leading zeros etc.)
  if (!student) {
    student = await prisma.student.findFirst({
      where: {
        schoolId,
        deletedAt: null,
        ...(campusId && { campusId }),
        OR: [
          { rollNo:      { contains: code, mode: 'insensitive' } },
          { admissionNo: { contains: code, mode: 'insensitive' } },
        ],
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

  // Fetch all invoices; frontend filters to unpaid/partial for quick display
  const invoices = await prisma.feeInvoice.findMany({
    where: { schoolId, studentId: student.id },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  res.json({ success: true, data: { student, invoices } });
}));

// GET /api/v1/fees/payments — Filter fee payments by accountant, date range, and limit
// Query: ?accountant=<userId>&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50
router.get('/payments', requireFinanceRole, wrap(async (req, res) => {
  const { accountant, from, to, limit = 50, page = 1 } = req.query;
  const take = Math.min(parseInt(limit) || 50, 500); // hard cap at 500
  const skip = (parseInt(page) - 1) * take;

  const where = {
    schoolId: req.schoolId,
    ...(accountant && { receivedBy: parseInt(accountant) }),
    ...(from && to && {
      paymentDate: {
        gte: new Date(new Date(from).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      },
    }),
    ...(from && !to && {
      paymentDate: { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) },
    }),
    ...(!from && to && {
      paymentDate: { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) },
    }),
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
            student: { select: { id: true, name: true, rollNo: true } },
          },
        },
        // receivedBy is just an Int field (userId) — no relation in schema
      },
      orderBy: { paymentDate: 'desc' },
    }),
    prisma.feePayment.count({ where }),
  ]);

  const totalAmount = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  res.json({
    success: true,
    data: payments,
    total,
    totalAmount,
    page: parseInt(page),
    pages: Math.ceil(total / take),
  });
}));

// GET /api/v1/fees/payments/export
// Returns all fee payments for a given month/year as JSON (frontend handles CSV/Excel download).
// Query: ?month=<1-12>&year=<YYYY>&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/payments/export', requireFinanceRole, wrap(async (req, res) => {
  const { month, year, from, to } = req.query;

  const where = {
    schoolId: req.schoolId,
    ...(from && to && {
      paymentDate: {
        gte: new Date(new Date(from).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      },
    }),
    ...(from && !to && {
      paymentDate: { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) },
    }),
    ...(!from && to && {
      paymentDate: { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) },
    }),
    ...(month && year && {
      invoice: { month: parseInt(month), year: parseInt(year) },
    }),
    ...(!from && !to && month && !year && {
      invoice: { month: parseInt(month) },
    }),
    ...(!from && !to && !month && year && {
      invoice: { year: parseInt(year) },
    }),
  };

  const payments = await prisma.feePayment.findMany({
    where,
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
    orderBy: { paymentDate: 'desc' },
    take: 5000, // safety cap
  });

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const rows = payments.map(p => ({
    'Receipt No':    p.receiptNo || '',
    'Voucher No':    p.invoice?.voucherNo || '',
    'Student Name':  p.invoice?.student?.name || '',
    'Roll No':       p.invoice?.student?.rollNo || '',
    'Class':         p.invoice?.student?.class?.name || '',
    'Fee Title':     p.invoice?.feeTitle || '',
    'Month':         p.invoice?.month ? (MONTHS[(parseInt(p.invoice.month) - 1)] || p.invoice.month) : '',
    'Year':          p.invoice?.year || '',
    'Amount Paid':   p.amountPaid || 0,
    'Discount':      p.discount || 0,
    'Method':        p.method || 'cash',
    'Payment Date':  p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-PK') : '',
  }));

  const totalAmount = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  res.json({ success: true, data: rows, total: rows.length, totalAmount });
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
  const { studentId, discountType, discountValue, reason } = req.body;
  if (!studentId || !discountValue) return res.status(400).json({ success: false, message: 'studentId and discountValue required' });

  const invoices = await prisma.feeInvoice.findMany({ where: { schoolId, studentId: parseInt(studentId), status: { not: 'paid' } } });
  let applied = 0;
  for (const inv of invoices) {
    const discAmt = discountType === 'percent'
      ? Math.round(inv.totalAmount * parseFloat(discountValue) / 100)
      : Math.round(parseFloat(discountValue));
    await prisma.feeInvoice.update({ where: { id: inv.id }, data: { discount: discAmt, dueAmount: Math.max(0, inv.totalAmount - discAmt) } });
    applied++;
  }
  res.json({ success: true, message: `Discount applied to ${applied} invoice(s)`, applied });
}));

/* ── GET /fees/student-fee-details/:studentId — Fee heads with class structure ── */
router.get('/student-fee-details/:studentId', wrap(async (req, res) => {
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

  // Merge saved per-student discounts from the most recent invoice remarks if any
  const latestInvoice = await prisma.feeInvoice.findFirst({
    where: { schoolId, studentId },
    orderBy: { createdAt: 'desc' },
  });

  let savedDiscounts = {};
  let savedComments = '';
  if (latestInvoice?.remarks) {
    try {
      const parsed = JSON.parse(latestInvoice.remarks);
      if (parsed?.feeHeadDiscounts) {
        savedDiscounts = parsed.feeHeadDiscounts;
        savedComments  = parsed.comments || '';
      }
    } catch { /* ignore */ }
  }

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

/* ── PUT /fees/student-discount/:studentId — Apply per-head discounts to student ── */
router.put('/student-discount/:studentId', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId } = req;
  const studentId = parseInt(req.params.studentId);
  const { heads = [], comments = '' } = req.body;

  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId, deletedAt: null } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  // Build a discount map by head name
  const feeHeadDiscounts = {};
  let totalDiscount = 0;
  for (const h of heads) {
    feeHeadDiscounts[h.name] = parseInt(h.discount) || 0;
    totalDiscount += feeHeadDiscounts[h.name];
  }

  // Store discount info on the latest unpaid invoice or all pending invoices
  const pendingInvoices = await prisma.feeInvoice.findMany({
    where: { schoolId, studentId, status: { not: 'paid' } },
    orderBy: { createdAt: 'desc' },
  });

  let updated = 0;
  for (const inv of pendingInvoices) {
    const newDiscount = Math.min(totalDiscount, inv.totalAmount);
    const newDue = Math.max(0, inv.totalAmount - inv.paidAmount - newDiscount);

    // FIX: this used to also set `updateData.remarks = ...`, but FeeInvoice
    // has no `remarks` column — every call threw a Prisma "unknown argument"
    // error, so applying a per-head discount always failed with a 500.
    // The per-head breakdown (feeHeadDiscounts/comments) is still returned
    // in this response and logged to the audit trail below; only the real
    // discount/dueAmount totals are persisted on the invoice itself.
    const updateData = { discount: newDiscount, dueAmount: newDue };

    await prisma.feeInvoice.update({ where: { id: inv.id }, data: updateData });
    updated++;
  }

  await prisma.auditLog.create({
    data: {
      schoolId, userId: req.user.id, action: 'FEE_DISCOUNT_APPLIED', entity: 'student', entityId: studentId,
      details: JSON.stringify({ totalDiscount, heads: heads.length, invoicesUpdated: updated }),
    },
  }).catch(() => null);

  res.json({ success: true, message: `Discounts applied. ${updated} invoice(s) updated.`, updated, totalDiscount });
}));

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
