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

// POST /api/v1/fees/generate - Generate monthly/custom/transport fee for a class
router.post('/generate', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId, sectionId, month, year, dueDate, lateFee = 0, feeTitle, amount: customAmount, type } = req.body;
  if (!classId || !month || !year) return res.status(400).json({ success: false, message: 'classId, month, year required.' });

  // Single source of truth for the fallback title, used consistently for both
  // the duplicate-check lookup and the actual insert (previously these diverged,
  // which meant the dedupe check never matched what was inserted).
  const DEFAULT_FEE_TITLE = 'Monthly Fee';
  const resolvedFeeTitle = (feeTitle && String(feeTitle).trim()) || DEFAULT_FEE_TITLE;
  const isCustom = type === 'custom' || type === 'transport';

  // Custom/transport fee generation must honor the amount actually submitted,
  // not silently fall back to the class's monthly tuition fee structure.
  const feeStructure = isCustom ? null : await prisma.feeStructure.findFirst({ where: { schoolId, classId: parseInt(classId) } });
  if (isCustom && !(parseInt(customAmount) > 0)) {
    return res.status(400).json({ success: false, message: 'A positive amount is required for custom/transport fee generation.' });
  }

  // Get all active students in class
  const students = await prisma.student.findMany({
    where: { schoolId, classId: parseInt(classId), status: 'active', deletedAt: null, ...(sectionId && { sectionId: parseInt(sectionId) }), ...(campusId && { campusId }) }
  });

  const results = { generated: 0, skipped: 0, students: [] };

  for (const student of students) {
    const existing = await prisma.feeInvoice.findFirst({
      where: { schoolId, studentId: student.id, month, year: parseInt(year), feeTitle: resolvedFeeTitle }
    });
    if (existing) { results.skipped++; results.students.push({ ...student, status: 'already_generated' }); continue; }

    const voucherNo = `${month.substring(0,3).toUpperCase()}-${String(student.id).padStart(4,'0')}-${year}`;
    const amount = isCustom ? parseInt(customAmount) : (feeStructure?.amount || 0);

    try {
      await prisma.feeInvoice.create({
        data: { schoolId, campusId: student.campusId, studentId: student.id, classId: parseInt(classId),
          feeTitle: resolvedFeeTitle, totalAmount: amount, dueAmount: amount,
          month, year: parseInt(year), dueDate: dueDate ? new Date(dueDate) : null,
          status: 'unpaid', voucherNo, lateFee: parseInt(lateFee) || 0, isCustomFee: isCustom }
      });
      results.generated++;
      results.students.push({ ...student, status: 'generated' });
    } catch (err) {
      // Unique constraint race (two concurrent generate calls) — treat as already-generated, not a hard failure.
      if (err.code === 'P2002') {
        results.skipped++;
        results.students.push({ ...student, status: 'already_generated' });
      } else {
        throw err;
      }
    }
  }

  res.json({ success: true, data: results, message: `${results.generated} invoices generated, ${results.skipped} already existed.` });
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

  // Re-read the invoice's current dueAmount inside the transaction and validate
  // the payment+discount cannot exceed it — closes both the negative-payment
  // and unbounded-discount/overpayment gaps, and avoids a lost-update race
  // between two concurrent payments on the same invoice.
  let newDue, newStatus, payment, updatedInvoice;
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
      const inv = await tx.feeInvoice.update({
        where: { id: parseInt(invoiceId) },
        data: { paidAmount: { increment: paidNum }, discount: { increment: discountNum }, dueAmount: due, status }
      });
      return { pay, inv, due, status };
    });
    payment = result.pay; updatedInvoice = result.inv; newDue = result.due; newStatus = result.status;
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    throw err;
  }

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
router.get('/defaulters', requireFinanceRole, wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const { classId } = req.query;
  const invoices = await prisma.feeInvoice.findMany({
    where: { schoolId, status: { in: ['unpaid', 'partial'] }, ...(campusId && { campusId }), ...(classId && { classId: parseInt(classId) }) },
    include: { student: { include: { class: true } } },
    orderBy: { dueAmount: 'desc' }
  });
  res.json({ success: true, data: invoices, total: invoices.length });
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

module.exports = router;
