const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const FINANCE_ROLES = new Set(['super_admin', 'admin', 'accountant']);
const isFinanceRole = (role) => FINANCE_ROLES.has(role);

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function makeTransactionNo(schoolId) {
  const now = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PAY-${schoolId}-${now}-${rnd}`;
}

async function logAudit(req, action, resource, resourceId) {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId: req.schoolId,
        userId: req.user?.id || null,
        action,
        resource,
        resourceId: resourceId || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
      },
    });
  } catch (_) {
    // Audit writes should not block primary flow.
  }
}

// POST /api/v1/payments/initiate
router.post('/initiate', wrap(async (req, res) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }

  const { schoolId, campusId } = req;
  const {
    studentId,
    invoiceId,
    amount,
    method = 'online',
    provider,
    providerRef,
    channel,
    purpose = 'fee_payment',
    notes,
    metadata,
  } = req.body || {};

  const normalizedAmount = toInt(amount, -1);
  if (normalizedAmount <= 0) {
    return res.status(400).json({ success: false, message: 'amount must be a positive integer.' });
  }

  let resolvedStudentId = studentId ? toInt(studentId, 0) : null;
  let resolvedInvoiceId = invoiceId ? toInt(invoiceId, 0) : null;

  if (resolvedInvoiceId) {
    const invoice = await prisma.feeInvoice.findFirst({
      where: { id: resolvedInvoiceId, schoolId },
      select: { id: true, studentId: true, dueAmount: true },
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    resolvedStudentId = invoice.studentId;
  }

  if (resolvedStudentId) {
    const student = await prisma.student.findFirst({ where: { id: resolvedStudentId, schoolId, deletedAt: null } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  const tx = await prisma.paymentTransaction.create({
    data: {
      schoolId,
      campusId,
      studentId: resolvedStudentId,
      invoiceId: resolvedInvoiceId,
      transactionNo: makeTransactionNo(schoolId),
      amount: normalizedAmount,
      paymentMethod: String(method || 'online'),
      provider: provider ? String(provider) : null,
      providerRef: providerRef ? String(providerRef) : null,
      channel: channel ? String(channel) : null,
      purpose: String(purpose || 'fee_payment'),
      notes: notes ? String(notes) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      initiatedBy: req.user?.id || null,
      status: 'pending',
    },
  });

  await logAudit(req, 'PAYMENT_INITIATED', 'payment_transaction', tx.id);
  res.status(201).json({ success: true, data: tx });
}));

// POST /api/v1/payments/:id/mark-success
router.post('/:id/mark-success', wrap(async (req, res) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }

  const txId = toInt(req.params.id, 0);
  if (!txId) return res.status(400).json({ success: false, message: 'Invalid transaction id.' });

  const { providerRef, notes } = req.body || {};

  const tx = await prisma.paymentTransaction.findFirst({ where: { id: txId, schoolId: req.schoolId } });
  if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });

  if (tx.status === 'paid') {
    return res.json({ success: true, data: tx, message: 'Transaction is already marked paid.' });
  }

  const updated = await prisma.$transaction(async (db) => {
    const paidTx = await db.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'paid',
        providerRef: providerRef ? String(providerRef) : tx.providerRef,
        notes: notes ? String(notes) : tx.notes,
        paidAt: new Date(),
        processedBy: req.user?.id || null,
      },
    });

    if (tx.invoiceId) {
      const invoice = await db.feeInvoice.findFirst({ where: { id: tx.invoiceId, schoolId: req.schoolId } });
      if (invoice) {
        const newPaid = invoice.paidAmount + tx.amount;
        const newDue = Math.max(0, invoice.totalAmount - newPaid - (invoice.discount || 0));
        const newStatus = newDue === 0 ? 'paid' : 'partial';

        await db.feeInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
        });

        await db.feePayment.create({
          data: {
            schoolId: req.schoolId,
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            amountPaid: tx.amount,
            discount: 0,
            method: tx.paymentMethod || 'online',
            paymentDate: new Date(),
            receivedBy: req.user?.id || null,
            notifiedVia: 'payment_transaction',
            transactionRef: paidTx.providerRef || paidTx.transactionNo,
            receiptNo: `RCP-${paidTx.id}-${Date.now()}`,
          },
        });
      }
    }

    return paidTx;
  });

  await logAudit(req, 'PAYMENT_MARKED_PAID', 'payment_transaction', updated.id);
  res.json({ success: true, data: updated });
}));

// POST /api/v1/payments/:id/mark-failed
router.post('/:id/mark-failed', wrap(async (req, res) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }

  const txId = toInt(req.params.id, 0);
  if (!txId) return res.status(400).json({ success: false, message: 'Invalid transaction id.' });

  const { reason, providerRef } = req.body || {};

  const tx = await prisma.paymentTransaction.findFirst({ where: { id: txId, schoolId: req.schoolId } });
  if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });

  if (tx.status === 'paid') {
    return res.status(400).json({ success: false, message: 'Paid transaction cannot be marked failed.' });
  }

  const updated = await prisma.paymentTransaction.update({
    where: { id: tx.id },
    data: {
      status: 'failed',
      failureReason: reason ? String(reason) : 'Unknown failure',
      providerRef: providerRef ? String(providerRef) : tx.providerRef,
      failedAt: new Date(),
      processedBy: req.user?.id || null,
    },
  });

  await logAudit(req, 'PAYMENT_MARKED_FAILED', 'payment_transaction', updated.id);
  res.json({ success: true, data: updated });
}));

// POST /api/v1/payments/:id/refund
router.post('/:id/refund', wrap(async (req, res) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }

  const txId = toInt(req.params.id, 0);
  const refundAmount = toInt(req.body?.amount, 0);
  if (!txId || refundAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid transaction id and positive refund amount are required.' });
  }

  const tx = await prisma.paymentTransaction.findFirst({ where: { id: txId, schoolId: req.schoolId } });
  if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
  if (tx.status !== 'paid') {
    return res.status(400).json({ success: false, message: 'Only paid transactions can be refunded.' });
  }
  if (refundAmount > tx.amount) {
    return res.status(400).json({ success: false, message: 'Refund amount cannot exceed original payment amount.' });
  }

  const result = await prisma.$transaction(async (db) => {
    const refundedTx = await db.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        processedBy: req.user?.id || null,
        notes: req.body?.notes ? String(req.body.notes) : tx.notes,
      },
    });

    if (tx.invoiceId) {
      const invoice = await db.feeInvoice.findFirst({ where: { id: tx.invoiceId, schoolId: req.schoolId } });
      if (invoice) {
        const newPaid = Math.max(0, invoice.paidAmount - refundAmount);
        const newDue = Math.max(0, invoice.totalAmount - newPaid - (invoice.discount || 0));
        const newStatus = newPaid === 0 ? 'unpaid' : 'partial';

        await db.feeInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
        });

        await db.feePayment.create({
          data: {
            schoolId: req.schoolId,
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            amountPaid: -refundAmount,
            discount: 0,
            method: 'refund',
            paymentDate: new Date(),
            receivedBy: req.user?.id || null,
            notifiedVia: 'refund',
            transactionRef: refundedTx.transactionNo,
            receiptNo: `REF-${refundedTx.id}-${Date.now()}`,
          },
        });
      }
    }

    return refundedTx;
  });

  await logAudit(req, 'PAYMENT_REFUNDED', 'payment_transaction', result.id);
  res.json({ success: true, data: result });
}));

// GET /api/v1/payments/transactions
router.get('/transactions', wrap(async (req, res) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }

  const { schoolId } = req;
  const {
    status,
    studentId,
    invoiceId,
    method,
    from,
    to,
    page = '1',
    limit = '25',
  } = req.query;

  const pg = Math.max(1, toInt(page, 1));
  const perPage = Math.min(100, Math.max(1, toInt(limit, 25)));
  const skip = (pg - 1) * perPage;

  const where = {
    schoolId,
    ...(status ? { status: String(status) } : {}),
    ...(studentId ? { studentId: toInt(studentId, 0) } : {}),
    ...(invoiceId ? { invoiceId: toInt(invoiceId, 0) } : {}),
    ...(method ? { paymentMethod: String(method) } : {}),
    ...((from || to) ? {
      createdAt: {
        ...(from ? { gte: new Date(String(from)) } : {}),
        ...(to ? { lte: new Date(String(to)) } : {}),
      },
    } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.paymentTransaction.count({ where }),
  ]);

  res.json({ success: true, data: rows, total, page: pg, pages: Math.ceil(total / perPage) });
}));

// GET /api/v1/payments/summary
router.get('/summary', wrap(async (req, res) => {
  if (!isFinanceRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Finance access required.' });
  }

  const { schoolId } = req;
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const dateFilter = (from || to)
    ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
    : {};

  const whereBase = { schoolId, ...dateFilter };

  const [pending, paid, failed, refunded] = await Promise.all([
    prisma.paymentTransaction.aggregate({ where: { ...whereBase, status: 'pending' }, _sum: { amount: true }, _count: { id: true } }),
    prisma.paymentTransaction.aggregate({ where: { ...whereBase, status: 'paid' }, _sum: { amount: true }, _count: { id: true } }),
    prisma.paymentTransaction.aggregate({ where: { ...whereBase, status: 'failed' }, _sum: { amount: true }, _count: { id: true } }),
    prisma.paymentTransaction.aggregate({ where: { ...whereBase, status: 'refunded' }, _sum: { amount: true }, _count: { id: true } }),
  ]);

  res.json({
    success: true,
    data: {
      pending: { count: pending._count.id, amount: pending._sum.amount || 0 },
      paid: { count: paid._count.id, amount: paid._sum.amount || 0 },
      failed: { count: failed._count.id, amount: failed._sum.amount || 0 },
      refunded: { count: refunded._count.id, amount: refunded._sum.amount || 0 },
    },
  });
}));

module.exports = router;
