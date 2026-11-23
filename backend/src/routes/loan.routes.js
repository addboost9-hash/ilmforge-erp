const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const LOAN_STATUSES = ['pending', 'active', 'completed', 'cancelled'];

// Loans carry only staffId, so resolve the staff names in one batched query
// (the UI lists the borrower by name).
async function withStaffNames(schoolId, loans) {
  const ids = [...new Set(loans.map((l) => l.staffId).filter(Boolean))];
  const staff = ids.length
    ? await prisma.staff.findMany({
        where: { id: { in: ids }, schoolId },
        select: { id: true, name: true, designation: true, empCode: true },
      })
    : [];
  const map = Object.fromEntries(staff.map((s) => [s.id, s]));
  return loans.map((l) => ({ ...l, staff: map[l.staffId] || null }));
}

router.get('/', wrap(async (req, res) => {
  const { status } = req.query;
  const loans = await prisma.staffLoan.findMany({
    where: { schoolId: req.schoolId, ...(status ? { status: String(status) } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: await withStaffNames(req.schoolId, loans) });
}));

router.post('/', wrap(async (req, res) => {
  const { staffId, loanAmount, installments, notes, loanDate } = req.body;
  if (!staffId || !loanAmount) return res.status(400).json({ success: false, message: 'Staff and amount required.' });

  const amount = parseInt(loanAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Loan amount must be a positive number.' });
  }

  // Scope the staff lookup to this school so a loan cannot be attached to
  // another tenant's employee by guessing an id.
  const staff = await prisma.staff.findFirst({ where: { id: parseInt(staffId), schoolId: req.schoolId }, select: { id: true } });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found in this school.' });

  const inst = parseInt(installments) || 1;
  const monthly = Math.ceil(amount / inst);
  const loan = await prisma.staffLoan.create({
    data: {
      schoolId: req.schoolId, staffId: staff.id,
      loanAmount: amount, installments: inst,
      monthlyInstallment: monthly, remaining: amount, notes,
      // New loans await approval rather than being immediately active.
      status: 'pending',
      ...(loanDate ? { loanDate: new Date(loanDate) } : {}),
    }
  });
  res.status(201).json({ success: true, data: loan, monthlyInstallment: monthly });
}));

// DELETE /loans/:id — remove a loan recorded in error. Only while nothing has
// been repaid; once instalments exist the record must be cancelled, not
// erased, so the repayment history stays auditable.
router.delete('/:id', wrap(async (req, res) => {
  const loan = await prisma.staffLoan.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });
  if (loan.paidAmount > 0) {
    return res.status(400).json({
      success: false,
      message: `Rs. ${loan.paidAmount} has already been repaid on this loan — cancel it instead of deleting.`,
    });
  }
  await prisma.staffLoan.delete({ where: { id: loan.id } });
  res.json({ success: true, message: 'Loan deleted.' });
}));

/* ── PUT /loans/:id — correct or cancel a loan ──
   A loan could be issued and paid down but never corrected: a wrong amount or
   instalment count was permanent, and there was no way to cancel one that was
   entered by mistake. Recalculates the monthly instalment and remaining
   balance from what's already been paid so the schedule stays consistent. */
router.put('/:id', wrap(async (req, res) => {
  const loan = await prisma.staffLoan.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });

  const { loanAmount, installments, notes, status } = req.body;
  if (status && !LOAN_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${LOAN_STATUSES.join(', ')}.` });
  }

  const newAmount = loanAmount !== undefined ? parseInt(loanAmount) : loan.loanAmount;
  const newInstallments = installments !== undefined ? (parseInt(installments) || 1) : loan.installments;
  if (newAmount < loan.paidAmount) {
    return res.status(400).json({
      success: false,
      message: `Loan amount cannot be less than the Rs. ${loan.paidAmount} already repaid.`,
    });
  }

  const remaining = Math.max(0, newAmount - loan.paidAmount);
  const remainingInstallments = Math.max(1, newInstallments - loan.paidInstallments);

  const updated = await prisma.staffLoan.update({
    where: { id: loan.id },
    data: {
      loanAmount: newAmount,
      installments: newInstallments,
      monthlyInstallment: remaining > 0 ? Math.ceil(remaining / remainingInstallments) : 0,
      remaining,
      ...(notes !== undefined && { notes }),
      status: status || (remaining <= 0 ? 'completed' : loan.status),
    },
  });
  res.json({ success: true, data: updated, message: 'Loan updated.' });
}));

// Record installment payment (called during salary generation)
// FIX: was looked up by id only with no schoolId check — any finance user on
// any school could pay off / mutate another school's loan record by guessing
// the numeric id (cross-tenant data leak/manipulation).
router.post('/:id/pay-installment', wrap(async (req, res) => {
  const loan = await prisma.staffLoan.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });
  if (loan.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: `Cannot record an instalment against a ${loan.status} loan — approve it first.`,
    });
  }
  // The last instalment is only what is left (a Rs 10,000 loan in 3
  // instalments of 3,334 was repaid 10,002), and an instalment is counted
  // once: the write only happens if no other one was recorded since this
  // was read (a double click recorded two).
  const owed = Math.max(0, loan.loanAmount - loan.paidAmount);
  if (owed <= 0) return res.status(400).json({ success: false, message: 'This loan is already fully repaid.' });
  const instalment = Math.min(loan.monthlyInstallment || owed, owed);
  const newPaid = loan.paidAmount + instalment;
  const newRemaining = Math.max(0, loan.loanAmount - newPaid);
  const { count } = await prisma.staffLoan.updateMany({
    where: { id: loan.id, schoolId: req.schoolId, status: 'active', paidAmount: loan.paidAmount, paidInstallments: loan.paidInstallments },
    data: {
      paidInstallments: loan.paidInstallments + 1,
      paidAmount: newPaid, remaining: newRemaining,
      status: newRemaining <= 0 ? 'completed' : 'active',
    }
  });
  if (count !== 1) return res.status(409).json({ success: false, message: 'An instalment was just recorded on this loan. Refresh and check before recording another.' });
  const updated = await prisma.staffLoan.findUnique({ where: { id: loan.id } });
  res.json({ success: true, data: updated, instalment });
}));

module.exports = router;
