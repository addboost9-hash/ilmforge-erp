const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// FIX: the mobile app's entire Teacher Portal (home/attendance/homework/students
// screens) calls GET /teacher/classes, /teacher/subjects and /teacher/today-classes,
// but no /api/v1/teacher mount existed anywhere in the backend — every one of
// these calls 404'd, so the mobile Teacher Portal never actually worked
// against the real API. Self-scoped to the calling user's own Staff record —
// same ownership model as teacherScope.js's teacherCanAccessClass.

async function resolveStaff(req) {
  return prisma.staff.findFirst({
    where: { userId: req.user.id, schoolId: req.schoolId, isActive: true, deletedAt: null },
    select: { id: true },
  });
}

// GET /teacher/classes — classes this teacher is assigned to (as class
// teacher, subject teacher, or via the timetable). Mirrors the same
// fallback teacherScope.js uses: if the school hasn't assigned any
// teacher to anything yet, show every class rather than an empty screen.
router.get('/classes', wrap(async (req, res) => {
  const staff = await resolveStaff(req);
  if (!staff) return res.json({ success: true, data: [] });

  const [ownClasses, subjectRows, timetableRows] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: req.schoolId, classTeacherId: staff.id }, select: { id: true, name: true } }),
    prisma.subject.findMany({ where: { schoolId: req.schoolId, teacherId: staff.id }, select: { classId: true } }),
    prisma.timetableEntry.findMany({ where: { schoolId: req.schoolId, teacherId: staff.id }, select: { classId: true } }),
  ]);

  const ownIds = new Set(ownClasses.map(c => c.id));
  const extraIds = [...new Set([...subjectRows.map(s => s.classId), ...timetableRows.map(t => t.classId)])]
    .filter(id => !ownIds.has(id));
  const extraClasses = extraIds.length
    ? await prisma.class.findMany({ where: { id: { in: extraIds } }, select: { id: true, name: true } })
    : [];

  let classes = [...ownClasses, ...extraClasses];

  if (classes.length === 0) {
    const anyAssignment = await prisma.subject.findFirst({ where: { schoolId: req.schoolId, teacherId: { not: null } }, select: { id: true } })
      || await prisma.timetableEntry.findFirst({ where: { schoolId: req.schoolId, teacherId: { not: null } }, select: { id: true } })
      || await prisma.class.findFirst({ where: { schoolId: req.schoolId, classTeacherId: { not: null } }, select: { id: true } });
    if (!anyAssignment) {
      classes = await prisma.class.findMany({ where: { schoolId: req.schoolId }, select: { id: true, name: true } });
    }
  }

  res.json({ success: true, data: classes });
}));

// GET /teacher/subjects — subjects this teacher is assigned to teach.
router.get('/subjects', wrap(async (req, res) => {
  const staff = await resolveStaff(req);
  if (!staff) return res.json({ success: true, data: [] });
  const subjects = await prisma.subject.findMany({
    where: { schoolId: req.schoolId, teacherId: staff.id },
    select: { id: true, name: true, classId: true },
  });
  res.json({ success: true, data: subjects });
}));

// GET /teacher/today-classes — today's timetable periods for this teacher.
router.get('/today-classes', wrap(async (req, res) => {
  const staff = await resolveStaff(req);
  if (!staff) return res.json({ success: true, data: [] });

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = DAYS[new Date().getDay()];

  const entries = await prisma.timetableEntry.findMany({
    where: { schoolId: req.schoolId, teacherId: staff.id, day: today },
    orderBy: { periodNo: 'asc' },
  });

  const classIds = [...new Set(entries.map(e => e.classId))];
  const classes = classIds.length
    ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
    : [];
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  const data = entries.map(e => ({
    id: e.id,
    subject: e.subject || null,
    className: classMap[e.classId] || null,
    time: e.startTime ? `${e.startTime}${e.endTime ? ' - ' + e.endTime : ''}` : null,
  }));

  res.json({ success: true, data });
}));

module.exports = router;
