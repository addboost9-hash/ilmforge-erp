const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const data = await prisma.staffLoan.findMany({ where: { schoolId: req.schoolId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));

router.post('/', wrap(async (req, res) => {
  const { staffId, loanAmount, installments, notes } = req.body;
  if (!staffId || !loanAmount) return res.status(400).json({ success: false, message: 'Staff and amount required.' });
  const inst = parseInt(installments) || 1;
  const monthly = Math.ceil(parseInt(loanAmount) / inst);
  const loan = await prisma.staffLoan.create({
    data: {
      schoolId: req.schoolId, staffId: parseInt(staffId),
      loanAmount: parseInt(loanAmount), installments: inst,
      monthlyInstallment: monthly, remaining: parseInt(loanAmount), notes,
    }
  });
  res.status(201).json({ success: true, data: loan, monthlyInstallment: monthly });
}));

// Record installment payment (called during salary generation)
router.post('/:id/pay-installment', wrap(async (req, res) => {
  const loan = await prisma.staffLoan.findFirst({ where: { id: parseInt(req.params.id), schoolId: req.schoolId } });
  if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });
  // A completed/cancelled loan must never accept another installment —
  // previously there was no guard here, so a retried/duplicate call could
  // silently push paidAmount/paidInstallments past the loan total.
  if (loan.status !== 'active') {
    return res.status(400).json({ success: false, message: `This loan is ${loan.status}; no further installments can be recorded.` });
  }
  // Cap the deducted amount to what's actually remaining — Math.ceil() on the
  // monthly installment means the final payment would otherwise overcharge
  // by the rounding residue (e.g. Rs 20,000 / 3 = Rs 6,667 x 3 = Rs 20,001).
  const deduction = Math.min(loan.monthlyInstallment, loan.remaining);
  const newPaid = loan.paidAmount + deduction;
  const newRemaining = Math.max(0, loan.remaining - deduction);
  const updated = await prisma.staffLoan.update({
    where: { id: loan.id },
    data: {
      paidInstallments: loan.paidInstallments + 1,
      paidAmount: newPaid, remaining: newRemaining,
      status: newRemaining <= 0 ? 'completed' : 'active',
    }
  });
  res.json({ success: true, data: updated });
}));

module.exports = router;
