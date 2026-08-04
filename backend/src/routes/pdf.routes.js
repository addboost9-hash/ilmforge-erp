const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { generateFeeVoucherHTML, generateMarksheetHTML } = require('../utils/pdf.helper');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/pdf/voucher/:invoiceId
router.get('/voucher/:invoiceId', wrap(async (req, res) => {
  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: parseInt(req.params.invoiceId), schoolId: req.schoolId },
    include: { student: true, payments: { orderBy: { createdAt: 'desc' } } }
  });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
  const html = generateFeeVoucherHTML({ school, student: invoice.student, invoice, payments: invoice.payments });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

// GET /api/v1/pdf/marksheet/:examId/:studentId
router.get('/marksheet/:examId/:studentId', wrap(async (req, res) => {
  const exam = await prisma.exam.findFirst({ where: { id: parseInt(req.params.examId), schoolId: req.schoolId } });
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
  const student = await prisma.student.findFirst({ where: { id: parseInt(req.params.studentId), schoolId: req.schoolId } });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  const marks = await prisma.examMark.findMany({ where: { examId: exam.id, studentId: student.id } });
  const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
  const html = generateMarksheetHTML({ school, student, exam, marks });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

module.exports = router;
