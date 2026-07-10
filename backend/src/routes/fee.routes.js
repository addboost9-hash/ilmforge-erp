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

  for (const student of students) {
    // Check if invoice already exists for this month/year
    const existing = await prisma.feeInvoice.findFirst({
      where: { schoolId, studentId: student.id, month: monthInt, year: yearInt },
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
        month:   monthInt,
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
  if (!invoiceId || !amountPaid) return res.status(400).json({ success: false, message: 'invoiceId and amountPaid required.' });

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: parseInt(invoiceId), schoolId },
    include: { student: { include: { class: true } } }
  });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

  const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const newPaid = invoice.paidAmount + parseInt(amountPaid);
  const newDue = Math.max(0, invoice.totalAmount - newPaid - parseInt(discount));
  const newStatus = newDue === 0 ? 'paid' : 'partial';

  const [payment] = await prisma.$transaction([
    prisma.feePayment.create({
      data: { schoolId, invoiceId: parseInt(invoiceId), studentId: invoice.studentId,
        amountPaid: parseInt(amountPaid), discount: parseInt(discount), method, receivedBy: req.user.id,
        notifiedVia: notifyVia, receiptNo }
    }),
    prisma.feeInvoice.update({
      where: { id: parseInt(invoiceId) },
      data: { paidAmount: newPaid, dueAmount: newDue, discount: invoice.discount + parseInt(discount), status: newStatus }
    }),
  ]);

  // Send notification to parent
  if (notifyVia !== 'none') {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    // Send WhatsApp/SMS (fire-and-forget)
    sendFeePaidNotification({
      parentPhone: invoice.student.emergencyPhone || '',
      studentName: invoice.student.name, amount: parseInt(amountPaid),
      month: invoice.month || '', receiptNo, schoolName: school?.name || 'School'
    }).catch(console.error);
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
router.post('/invoices', requireFinanceRole, wrap(async (req, res) => {
  const { studentId, month, year, heads = [], dueDate, remarks } = req.body;
  if (!studentId || !heads.length) return res.status(400).json({ success: false, message: 'Student aur kam az kam ek head required.' });
  const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), schoolId: req.schoolId } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  const total = heads.reduce((a, h) => a + (parseInt(h.amount) || 0), 0);
  const inv = await prisma.feeInvoice.create({
    data: {
      schoolId: req.schoolId, campusId: student.campusId, studentId: student.id,
      month: month || new Date().toLocaleString('default', { month: 'long' }),
      year: parseInt(year) || new Date().getFullYear(),
      totalAmount: total, paidAmount: 0, balance: total, status: 'pending',
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 10 * 864e5),
      remarks: remarks || JSON.stringify(heads),
    }
  });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_CREATED', entity: 'fee_invoice', entityId: inv.id, details: JSON.stringify({ total, heads: heads.length }) } }).catch(() => null);
  res.status(201).json({ success: true, data: inv });
}));

// UPDATE — amount / due date / status adjust
router.put('/invoices/:id', requireFinanceRole, wrap(async (req, res) => {
  const { totalAmount, dueDate, status, remarks } = req.body;
  const inv = await prisma.feeInvoice.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  const newTotal = totalAmount !== undefined ? parseInt(totalAmount) : inv.totalAmount;
  const updated = await prisma.feeInvoice.update({
    where: { id: inv.id },
    data: {
      totalAmount: newTotal,
      balance: Math.max(0, newTotal - inv.paidAmount),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(status && { status }),
      ...(remarks !== undefined && { remarks }),
    }
  });
  await prisma.auditLog.create({ data: { schoolId: req.schoolId, userId: req.user.id, action: 'INVOICE_UPDATED', entity: 'fee_invoice', entityId: inv.id } }).catch(() => null);
  res.json({ success: true, data: updated });
}));

// DELETE — sirf unpaid invoices (audit-logged)
router.delete('/invoices/:id', requireFinanceRole, wrap(async (req, res) => {
  const inv = await prisma.feeInvoice.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  if (inv.paidAmount > 0) return res.status(400).json({ success: false, message: 'Paid invoice delete nahi ho sakti — pehle payment reverse karein.' });
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
        // Include the accountant who recorded the payment (for daily balancesheet)
        receivedByUser: {
          select: { id: true, name: true, email: true },
        },
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

module.exports = router;
