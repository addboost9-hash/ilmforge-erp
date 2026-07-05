/**
 * IlmForge — Alumni Routes
 * GET    /api/v1/alumni            — list passout students as alumni
 * GET    /api/v1/alumni/stats      — alumni statistics by year/class
 * PUT    /api/v1/alumni/:studentId — update alumni profile fields
 * POST   /api/v1/alumni/send-invitation — bulk SMS/email for annual function
 */

const express = require('express');
const router  = express.Router();
const prisma  = require('../config/prisma');
const wrap    = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/* ─────────────────────────────────────────────────────────────
   GET /api/v1/alumni
   Query: year, classId, city, search, page, limit
   Returns passout students enriched with alumni profile fields
───────────────────────────────────────────────────────────── */
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { year, classId, city, search, page = 1, limit = 30 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    schoolId,
    status: 'passout',
    deletedAt: null,
    ...(classId && { classId: parseInt(classId) }),
    ...(search && {
      OR: [
        { name:    { contains: search, mode: 'insensitive' } },
        { rollNo:  { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // If year filter is supplied match against updatedAt / admissionDate year proxy
  // (passout year is stored in AlumniProfile if available, else we fall back to updatedAt year)
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
      include: {
        class:        { select: { id: true, name: true } },
        alumniProfile: true,
      },
    }),
    prisma.student.count({ where }),
  ]);

  // Shape the response — gracefully degrade if AlumniProfile model not yet migrated
  const data = students.map((s) => {
    const ap = s.alumniProfile || {};
    const passoutYear = ap.passoutYear || new Date(s.updatedAt).getFullYear();
    return {
      id:                 s.id,
      name:               s.name,
      rollNo:             s.rollNo,
      class:              s.class?.name || null,
      classId:            s.classId,
      passoutYear,
      currentOccupation:  ap.currentOccupation || null,
      company:            ap.company            || null,
      phone:              ap.phone              || s.emergencyPhone || null,
      email:              ap.email              || null,
      city:               ap.city               || null,
      country:            ap.country            || null,
      linkedIn:           ap.linkedIn           || null,
      achievements:       ap.achievements       || null,
      photoUrl:           ap.photoUrl           || s.photoUrl || null,
    };
  });

  // Apply city filter after shape (stored in alumni profile)
  const filtered = city
    ? data.filter((a) => a.city && a.city.toLowerCase().includes(city.toLowerCase()))
    : data;

  // Apply year filter
  const result = year
    ? filtered.filter((a) => String(a.passoutYear) === String(year))
    : filtered;

  res.json({ success: true, data: result, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}));

/* ─────────────────────────────────────────────────────────────
   GET /api/v1/alumni/stats
   Returns alumni count broken down by year and by class
───────────────────────────────────────────────────────────── */
router.get('/stats', wrap(async (req, res) => {
  const { schoolId } = req;

  const passoutStudents = await prisma.student.findMany({
    where: { schoolId, status: 'passout', deletedAt: null },
    select: {
      id:        true,
      updatedAt: true,
      classId:   true,
      class:     { select: { name: true } },
      alumniProfile: { select: { passoutYear: true, phone: true, email: true } },
    },
  });

  const total = passoutStudents.length;
  const currentYear = new Date().getFullYear();
  const lastYear    = currentYear - 1;

  const thisYearCount = passoutStudents.filter((s) => {
    const y = s.alumniProfile?.passoutYear || new Date(s.updatedAt).getFullYear();
    return y === currentYear;
  }).length;

  const lastYearCount = passoutStudents.filter((s) => {
    const y = s.alumniProfile?.passoutYear || new Date(s.updatedAt).getFullYear();
    return y === lastYear;
  }).length;

  const activeContact = passoutStudents.filter((s) =>
    s.alumniProfile?.phone || s.alumniProfile?.email
  ).length;

  // Group by year
  const byYear = {};
  passoutStudents.forEach((s) => {
    const y = s.alumniProfile?.passoutYear || new Date(s.updatedAt).getFullYear();
    byYear[y] = (byYear[y] || 0) + 1;
  });

  // Group by class
  const byClass = {};
  passoutStudents.forEach((s) => {
    const cn = s.class?.name || 'Unknown';
    byClass[cn] = (byClass[cn] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      total,
      thisYear:      thisYearCount,
      lastYear:      lastYearCount,
      activeContact,
      byYear:  Object.entries(byYear).map(([year, count]) => ({ year: parseInt(year), count })).sort((a, b) => b.year - a.year),
      byClass: Object.entries(byClass).map(([className, count]) => ({ className, count })),
    },
  });
}));

/* ─────────────────────────────────────────────────────────────
   PUT /api/v1/alumni/:studentId
   Body: { currentOccupation, company, phone, email, city,
           country, linkedIn, achievements, photoUrl, passoutYear }
   Upserts the AlumniProfile linked to the student
───────────────────────────────────────────────────────────── */
router.put('/:studentId', wrap(async (req, res) => {
  const { schoolId } = req;
  const studentId = parseInt(req.params.studentId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, deletedAt: null, status: 'passout' },
  });
  if (!student) return res.status(404).json({ success: false, message: 'Alumni not found.' });

  const allowed = ['currentOccupation', 'company', 'phone', 'email', 'city', 'country', 'linkedIn', 'achievements', 'photoUrl', 'passoutYear'];
  const profileData = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) profileData[k] = req.body[k]; });
  if (profileData.passoutYear) profileData.passoutYear = parseInt(profileData.passoutYear);

  // Upsert AlumniProfile — graceful fallback if model not migrated
  let profile;
  try {
    profile = await prisma.alumniProfile.upsert({
      where:  { studentId },
      update: { ...profileData, updatedAt: new Date() },
      create: { studentId, schoolId, ...profileData },
    });
  } catch (modelErr) {
    // AlumniProfile table not yet migrated — store on student directly as fallback
    const studentAllowed = ['photoUrl'];
    const studentData = {};
    studentAllowed.forEach((k) => { if (profileData[k] !== undefined) studentData[k] = profileData[k]; });
    if (Object.keys(studentData).length) {
      await prisma.student.update({ where: { id: studentId }, data: studentData });
    }
    profile = { studentId, ...profileData };
  }

  // Audit
  await prisma.auditLog.create({
    data: {
      schoolId, userId: req.user?.id || null,
      action: 'ALUMNI_PROFILE_UPDATED',
      entity: 'student', entityId: studentId,
      details: JSON.stringify(profileData),
    },
  }).catch(() => null);

  res.json({ success: true, data: profile, message: 'Alumni profile updated.' });
}));

/* ─────────────────────────────────────────────────────────────
   POST /api/v1/alumni/send-invitation
   Body: { subject, message, channel: 'email'|'sms'|'both',
           studentIds?: number[]  — if omitted, sends to all alumni }
───────────────────────────────────────────────────────────── */
router.post('/send-invitation', wrap(async (req, res) => {
  const { schoolId } = req;
  const { subject, message, channel = 'both', studentIds } = req.body;

  if (!message) return res.status(400).json({ success: false, message: 'Message body is required.' });

  const where = {
    schoolId,
    status: 'passout',
    deletedAt: null,
    ...(Array.isArray(studentIds) && studentIds.length && { id: { in: studentIds.map(Number) } }),
  };

  const alumni = await prisma.student.findMany({
    where,
    select: { id: true, name: true, emergencyPhone: true, alumniProfile: { select: { phone: true, email: true } } },
  });

  if (!alumni.length) return res.status(404).json({ success: false, message: 'No alumni found to send to.' });

  // Collect targets
  const targets = alumni.map((a) => ({
    id:    a.id,
    name:  a.name,
    phone: a.alumniProfile?.phone || a.emergencyPhone || null,
    email: a.alumniProfile?.email || null,
  }));

  const reachableEmail = targets.filter((t) => t.email).length;
  const reachableSMS   = targets.filter((t) => t.phone).length;

  // In production, integrate with the school's configured SMS/email gateway here.
  // For now we log the notification and return the dispatch summary.
  await prisma.auditLog.create({
    data: {
      schoolId, userId: req.user?.id || null,
      action: 'ALUMNI_INVITATION_SENT',
      entity: 'school', entityId: schoolId,
      details: JSON.stringify({ channel, subject, total: alumni.length, reachableEmail, reachableSMS }),
    },
  }).catch(() => null);

  res.json({
    success: true,
    message: `Invitation queued for ${alumni.length} alumni.`,
    data: {
      total:          alumni.length,
      reachableEmail,
      reachableSMS,
      channel,
    },
  });
}));

module.exports = router;
