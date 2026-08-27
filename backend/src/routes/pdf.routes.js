const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { generateFeeVoucherHTML, generateMarksheetHTML } = require('../utils/pdf.helper');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Ownership: PM('reports') is a generic per-module gate keyed on role+module —
// it has no idea whose record is being requested. A school can grant
// `parent`/`student` a `canView`/`canExport` override on the `reports`
// module (RolePermission), and without this check that role could then pull
// ANY student's fee voucher or marksheet in the school just by incrementing
// the id in the URL. Staff roles (admin/super_admin/accountant/teacher) are
// still trusted for any student within their own school (already schoolId-scoped).
async function assertCanViewStudentDoc(req, res, student) {
  const role = req.user?.role;
  if (['admin', 'super_admin', 'accountant', 'teacher'].includes(role)) return true;
  if (role === 'student') {
    if (student.userId === req.user.id) return true;
  } else if (role === 'parent') {
    const parent = await prisma.parent.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId } });
    const link = parent
      ? await prisma.parentStudent.findFirst({ where: { parentId: parent.id, studentId: student.id, schoolId: req.schoolId } })
      : null;
    if (link) return true;
  }
  res.status(403).json({ success: false, message: 'You can only access your own documents.' });
  return false;
}

// GET /api/v1/pdf/voucher/:invoiceId
router.get('/voucher/:invoiceId', wrap(async (req, res) => {
  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: parseInt(req.params.invoiceId), schoolId: req.schoolId },
    include: { student: true, payments: { orderBy: { createdAt: 'desc' } } }
  });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
  if (!(await assertCanViewStudentDoc(req, res, invoice.student))) return;
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
  if (!(await assertCanViewStudentDoc(req, res, student))) return;
  const marks = await prisma.examMark.findMany({ where: { examId: exam.id, studentId: student.id } });
  const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
  const html = generateMarksheetHTML({ school, student, exam, marks });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

module.exports = router;
