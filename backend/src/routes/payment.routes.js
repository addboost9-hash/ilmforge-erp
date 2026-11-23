const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const { ownDiscount, recomputeInvoice } = require('../utils/invoiceMath');

/* A transaction's amount is in RUPEES (the Payment Transactions page has
   always saved what is typed); fee bills are paisa. Marking a transaction
   paid added its rupees straight onto the bill, so Rs 3,500 paid counted
   as Rs 35. */
const toPaisa = (rupees) => Math.round(Number(rupees || 0) * 100);
const fail = (status, message) => Object.assign(new Error(message), { status });

/* from/to are Pakistan days (YYYY-MM-DD): new Date('2026-11-20') is 5 am
   here, and "to" ended at the START of its day, leaving the day itself out. */
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function pkDayRange(from, to) {
  const start = (d) => new Date(Date.parse(`${d}T00:00:00.000Z`) - 5 * 3600e3);
  const range = {};
  if (from && DAY_RE.test(String(from))) range.gte = start(from);
  if (to && DAY_RE.test(String(to))) range.lt = new Date(start(to).getTime() + 864e5);
  return Object.keys(range).length ? range : null;
}

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
  if (tx.status === 'refunded') return res.status(400).json({ success: false, message: 'A refunded transaction cannot be marked paid.' });

  const updated = await prisma.$transaction(async (db) => {
    // Only from pending or failed, in one write: two clicks used to post the
    // payment to the bill twice.
    const { count } = await db.paymentTransaction.updateMany({
      where: { id: tx.id, status: { in: ['pending', 'failed'] } },
      data: {
        status: 'paid',
        providerRef: providerRef ? String(providerRef) : tx.providerRef,
        notes: notes ? String(notes) : tx.notes,
        paidAt: new Date(),
        processedBy: req.user?.id || null,
      },
    });
    if (count !== 1) throw fail(409, 'This transaction was just marked by someone else. Refresh the list.');
    const paidTx = await db.paymentTransaction.findUnique({ where: { id: tx.id } });

    if (tx.invoiceId) {
      const invoice = await db.feeInvoice.findFirst({ where: { id: tx.invoiceId, schoolId: req.schoolId } });
      if (invoice) {
        const paisa = toPaisa(tx.amount);
        if (paisa > invoice.dueAmount) {
          throw fail(400, `This payment (Rs ${Number(tx.amount).toLocaleString('en-PK')}) is more than the bill's balance (Rs ${(invoice.dueAmount / 100).toLocaleString('en-PK')}).`);
        }
        const own = await ownDiscount(db, invoice.id);
        await db.feePayment.create({
          data: {
            schoolId: req.schoolId,
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            amountPaid: paisa,
            discount: 0,
            method: tx.paymentMethod || 'online',
            paymentDate: new Date(),
            receivedBy: req.user?.id || null,
            notifiedVia: 'payment_transaction',
            transactionRef: paidTx.providerRef || paidTx.transactionNo,
            receiptNo: `RCP-${paidTx.id}-${Date.now()}`,
          },
        });
        // Balance and status from the bill's payments (keeps the late fee
        // and the bill's discount, which this left out).
        await recomputeInvoice(db, invoice.id, own);
      }
    }

    return paidTx;
  }).catch((err) => { if (err.status) return { error: err }; throw err; });
  if (updated.error) return res.status(updated.error.status).json({ success: false, message: updated.error.message });

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

  const { count } = await prisma.paymentTransaction.updateMany({
    where: { id: tx.id, status: 'pending' },
    data: {
      status: 'failed',
      failureReason: reason ? String(reason) : 'Unknown failure',
      providerRef: providerRef ? String(providerRef) : tx.providerRef,
      failedAt: new Date(),
      processedBy: req.user?.id || null,
    },
  });
  if (count !== 1) return res.status(409).json({ success: false, message: 'Only a pending transaction can be marked failed.' });
  const updated = await prisma.paymentTransaction.findUnique({ where: { id: tx.id } });

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
    const { count } = await db.paymentTransaction.updateMany({
      where: { id: tx.id, status: 'paid' },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        processedBy: req.user?.id || null,
        notes: req.body?.notes ? String(req.body.notes) : tx.notes,
      },
    });
    if (count !== 1) throw fail(409, 'This transaction has just been refunded.');
    const refundedTx = await db.paymentTransaction.findUnique({ where: { id: tx.id } });

    if (tx.invoiceId) {
      const invoice = await db.feeInvoice.findFirst({ where: { id: tx.invoiceId, schoolId: req.schoolId } });
      if (invoice) {
        const own = await ownDiscount(db, invoice.id);
        await db.feePayment.create({
          data: {
            schoolId: req.schoolId,
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            amountPaid: -toPaisa(refundAmount),
            discount: 0,
            method: 'refund',
            paymentDate: new Date(),
            receivedBy: req.user?.id || null,
            notifiedVia: 'refund',
            transactionRef: refundedTx.transactionNo,
            receiptNo: `REF-${refundedTx.id}-${Date.now()}`,
          },
        });
        await recomputeInvoice(db, invoice.id, own);
      }
    }

    return refundedTx;
  }).catch((err) => { if (err.status) return { error: err }; throw err; });
  if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

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
    ...(pkDayRange(from, to) ? { createdAt: pkDayRange(from, to) } : {}),
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
  const range = pkDayRange(req.query.from, req.query.to);
  const dateFilter = range ? { createdAt: range } : {};

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
