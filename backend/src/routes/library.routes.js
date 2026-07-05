const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const LIBRARIAN_ROLES = new Set(['super_admin', 'admin', 'accountant', 'teacher']);
const canManage = (role) => LIBRARIAN_ROLES.has(role);

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
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
    // Do not block if audit logging fails.
  }
}

// GET /api/v1/library/books
router.get('/books', wrap(async (req, res) => {
  const { schoolId } = req;
  const {
    search,
    category,
    active,
    page = '1',
    limit = '25',
  } = req.query;

  const pg = Math.max(1, toInt(page, 1));
  const perPage = Math.min(100, Math.max(1, toInt(limit, 25)));

  const where = {
    schoolId,
    ...(category ? { category: String(category) } : {}),
    ...(active === 'true' ? { isActive: true } : {}),
    ...(active === 'false' ? { isActive: false } : {}),
    ...(search ? {
      OR: [
        { title: { contains: String(search), mode: 'insensitive' } },
        { author: { contains: String(search), mode: 'insensitive' } },
        { isbn: { contains: String(search), mode: 'insensitive' } },
        { accessionNo: { contains: String(search), mode: 'insensitive' } },
      ],
    } : {}),
  };

  const [books, total] = await Promise.all([
    prisma.libraryBook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pg - 1) * perPage,
      take: perPage,
    }),
    prisma.libraryBook.count({ where }),
  ]);

  res.json({ success: true, data: books, total, page: pg, pages: Math.ceil(total / perPage) });
}));

// POST /api/v1/library/books
router.post('/books', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Library management access required.' });
  }

  const {
    title,
    author,
    isbn,
    category,
    shelfCode,
    accessionNo,
    publisher,
    edition,
    publishedYear,
    totalCopies = 1,
    issueDays = 14,
    finePerDay = 20,
  } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: 'title is required.' });
  }

  const copies = Math.max(1, toInt(totalCopies, 1));
  const book = await prisma.libraryBook.create({
    data: {
      schoolId: req.schoolId,
      campusId: req.campusId,
      title: String(title).trim(),
      author: author ? String(author) : null,
      isbn: isbn ? String(isbn) : null,
      category: category ? String(category) : null,
      shelfCode: shelfCode ? String(shelfCode) : null,
      accessionNo: accessionNo ? String(accessionNo) : null,
      publisher: publisher ? String(publisher) : null,
      edition: edition ? String(edition) : null,
      publishedYear: publishedYear ? toInt(publishedYear, null) : null,
      totalCopies: copies,
      availableCopies: copies,
      issueDays: Math.max(1, toInt(issueDays, 14)),
      finePerDay: Math.max(0, toInt(finePerDay, 20)),
      isActive: true,
    },
  });

  await logAudit(req, 'LIBRARY_BOOK_CREATED', 'library_book', book.id);
  res.status(201).json({ success: true, data: book });
}));

// PUT /api/v1/library/books/:id
router.put('/books/:id', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Library management access required.' });
  }

  const bookId = toInt(req.params.id, 0);
  if (!bookId) return res.status(400).json({ success: false, message: 'Invalid book id.' });

  const existing = await prisma.libraryBook.findFirst({ where: { id: bookId, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Book not found.' });

  const data = {
    ...(req.body?.title !== undefined ? { title: String(req.body.title || '').trim() } : {}),
    ...(req.body?.author !== undefined ? { author: req.body.author ? String(req.body.author) : null } : {}),
    ...(req.body?.isbn !== undefined ? { isbn: req.body.isbn ? String(req.body.isbn) : null } : {}),
    ...(req.body?.category !== undefined ? { category: req.body.category ? String(req.body.category) : null } : {}),
    ...(req.body?.shelfCode !== undefined ? { shelfCode: req.body.shelfCode ? String(req.body.shelfCode) : null } : {}),
    ...(req.body?.accessionNo !== undefined ? { accessionNo: req.body.accessionNo ? String(req.body.accessionNo) : null } : {}),
    ...(req.body?.publisher !== undefined ? { publisher: req.body.publisher ? String(req.body.publisher) : null } : {}),
    ...(req.body?.edition !== undefined ? { edition: req.body.edition ? String(req.body.edition) : null } : {}),
    ...(req.body?.publishedYear !== undefined ? { publishedYear: req.body.publishedYear ? toInt(req.body.publishedYear, null) : null } : {}),
    ...(req.body?.issueDays !== undefined ? { issueDays: Math.max(1, toInt(req.body.issueDays, 14)) } : {}),
    ...(req.body?.finePerDay !== undefined ? { finePerDay: Math.max(0, toInt(req.body.finePerDay, 0)) } : {}),
    ...(req.body?.isActive !== undefined ? { isActive: !!req.body.isActive } : {}),
  };

  if (req.body?.totalCopies !== undefined) {
    const newTotal = Math.max(1, toInt(req.body.totalCopies, existing.totalCopies));
    const issuedCount = Math.max(0, existing.totalCopies - existing.availableCopies);
    data.totalCopies = newTotal;
    data.availableCopies = Math.max(0, newTotal - issuedCount);
  }

  if (data.title !== undefined && !data.title) {
    return res.status(400).json({ success: false, message: 'title cannot be empty.' });
  }

  const updated = await prisma.libraryBook.update({ where: { id: existing.id }, data });
  await logAudit(req, 'LIBRARY_BOOK_UPDATED', 'library_book', updated.id);
  res.json({ success: true, data: updated });
}));

// DELETE /api/v1/library/books/:id (soft-delete)
router.delete('/books/:id', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Library management access required.' });
  }

  const bookId = toInt(req.params.id, 0);
  if (!bookId) return res.status(400).json({ success: false, message: 'Invalid book id.' });

  const book = await prisma.libraryBook.findFirst({ where: { id: bookId, schoolId: req.schoolId } });
  if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

  const openIssue = await prisma.bookIssue.findFirst({
    where: { schoolId: req.schoolId, bookId: book.id, status: 'issued' },
    select: { id: true },
  });
  if (openIssue) {
    return res.status(400).json({ success: false, message: 'Cannot remove book while active issues exist.' });
  }

  await prisma.libraryBook.update({ where: { id: book.id }, data: { isActive: false } });
  await logAudit(req, 'LIBRARY_BOOK_DEACTIVATED', 'library_book', book.id);
  res.json({ success: true, message: 'Book deactivated.' });
}));

// POST /api/v1/library/issues
router.post('/issues', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Library management access required.' });
  }

  const { bookId, studentId, staffId, dueDate, remarks } = req.body || {};
  const normalizedBookId = toInt(bookId, 0);
  const normalizedStudentId = studentId ? toInt(studentId, 0) : null;
  const normalizedStaffId = staffId ? toInt(staffId, 0) : null;

  if (!normalizedBookId) {
    return res.status(400).json({ success: false, message: 'bookId is required.' });
  }
  if (!normalizedStudentId && !normalizedStaffId) {
    return res.status(400).json({ success: false, message: 'Either studentId or staffId is required.' });
  }

  const book = await prisma.libraryBook.findFirst({ where: { id: normalizedBookId, schoolId: req.schoolId, isActive: true } });
  if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
  if (book.availableCopies <= 0) return res.status(400).json({ success: false, message: 'No copies available for issue.' });

  if (normalizedStudentId) {
    const st = await prisma.student.findFirst({ where: { id: normalizedStudentId, schoolId: req.schoolId, deletedAt: null } });
    if (!st) return res.status(404).json({ success: false, message: 'Student not found.' });
  }
  if (normalizedStaffId) {
    const sf = await prisma.staff.findFirst({ where: { id: normalizedStaffId, schoolId: req.schoolId, deletedAt: null } });
    if (!sf) return res.status(404).json({ success: false, message: 'Staff not found.' });
  }

  const issueDueDate = dueDate
    ? new Date(String(dueDate))
    : new Date(Date.now() + (book.issueDays || 14) * 24 * 60 * 60 * 1000);

  const issue = await prisma.$transaction(async (db) => {
    const created = await db.bookIssue.create({
      data: {
        schoolId: req.schoolId,
        campusId: req.campusId,
        bookId: normalizedBookId,
        studentId: normalizedStudentId,
        staffId: normalizedStaffId,
        issuedToType: normalizedStudentId ? 'student' : 'staff',
        dueDate: issueDueDate,
        remarks: remarks ? String(remarks) : null,
        issuedBy: req.user?.id || null,
        status: 'issued',
      },
    });

    await db.libraryBook.update({
      where: { id: normalizedBookId },
      data: { availableCopies: { decrement: 1 } },
    });

    return created;
  });

  await logAudit(req, 'LIBRARY_BOOK_ISSUED', 'book_issue', issue.id);
  res.status(201).json({ success: true, data: issue });
}));

// GET /api/v1/library/issues
router.get('/issues', wrap(async (req, res) => {
  const {
    status,
    bookId,
    studentId,
    staffId,
    page = '1',
    limit = '25',
  } = req.query;

  const pg = Math.max(1, toInt(page, 1));
  const perPage = Math.min(100, Math.max(1, toInt(limit, 25)));

  const where = {
    schoolId: req.schoolId,
    ...(status ? { status: String(status) } : {}),
    ...(bookId ? { bookId: toInt(bookId, 0) } : {}),
    ...(studentId ? { studentId: toInt(studentId, 0) } : {}),
    ...(staffId ? { staffId: toInt(staffId, 0) } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.bookIssue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pg - 1) * perPage,
      take: perPage,
    }),
    prisma.bookIssue.count({ where }),
  ]);

  res.json({ success: true, data: rows, total, page: pg, pages: Math.ceil(total / perPage) });
}));

// POST /api/v1/library/issues/:id/return
router.post('/issues/:id/return', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Library management access required.' });
  }

  const issueId = toInt(req.params.id, 0);
  if (!issueId) return res.status(400).json({ success: false, message: 'Invalid issue id.' });

  const issue = await prisma.bookIssue.findFirst({ where: { id: issueId, schoolId: req.schoolId } });
  if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found.' });
  if (issue.status !== 'issued') {
    return res.status(400).json({ success: false, message: 'Only issued records can be returned.' });
  }

  const book = await prisma.libraryBook.findFirst({ where: { id: issue.bookId, schoolId: req.schoolId } });
  if (!book) return res.status(404).json({ success: false, message: 'Book not found for this issue.' });

  const now = new Date();
  const lateDays = issue.dueDate && now > issue.dueDate
    ? Math.ceil((now.getTime() - new Date(issue.dueDate).getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  const fine = lateDays > 0 ? lateDays * (book.finePerDay || 0) : 0;

  const updated = await prisma.$transaction(async (db) => {
    const ret = await db.bookIssue.update({
      where: { id: issue.id },
      data: {
        status: 'returned',
        returnDate: now,
        fineAmount: fine,
        receivedBy: req.user?.id || null,
      },
    });

    await db.libraryBook.update({
      where: { id: book.id },
      data: { availableCopies: { increment: 1 } },
    });

    return ret;
  });

  await logAudit(req, 'LIBRARY_BOOK_RETURNED', 'book_issue', updated.id);
  res.json({ success: true, data: updated, fineAmount: fine });
}));

// POST /api/v1/library/issues/:id/fine/collect
router.post('/issues/:id/fine/collect', wrap(async (req, res) => {
  if (!canManage(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Library management access required.' });
  }

  const issueId = toInt(req.params.id, 0);
  const amount = toInt(req.body?.amount, 0);
  if (!issueId || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid issue id and positive amount are required.' });
  }

  const issue = await prisma.bookIssue.findFirst({ where: { id: issueId, schoolId: req.schoolId } });
  if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found.' });

  const nextFinePaid = Math.min(issue.fineAmount, issue.finePaid + amount);
  const updated = await prisma.bookIssue.update({
    where: { id: issue.id },
    data: { finePaid: nextFinePaid },
  });

  await logAudit(req, 'LIBRARY_FINE_COLLECTED', 'book_issue', updated.id);
  res.json({ success: true, data: updated, remainingFine: Math.max(0, updated.fineAmount - updated.finePaid) });
}));

module.exports = router;
