const prisma = require('../config/prisma');

/**
 * Whether the requesting user may act on the given classId.
 * Admins/super_admins always pass. Teachers are checked against Subject and
 * TimetableEntry assignments — but only once a school has actually started
 * assigning teachers to classes at all. A freshly-onboarded school that
 * hasn't set up Subject.teacherId / TimetableEntry.teacherId yet would
 * otherwise have EVERY teacher locked out of attendance and marks entry
 * (nothing to match against), which is worse than the gap this closes.
 * Once a school assigns at least one teacher to at least one class, real
 * per-class scoping kicks in for everyone.
 */
const teacherCanAccessClass = async (req, classId) => {
  if (!classId) return true;
  const role = req.user?.role;
  if (['super_admin', 'admin'].includes(role)) return true;
  if (role !== 'teacher') return false;

  const staff = await prisma.staff.findFirst({
    where: { userId: req.user.id, schoolId: req.schoolId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!staff) return false;

  const schoolHasAnyAssignment = await prisma.subject.findFirst({
    where: { schoolId: req.schoolId, teacherId: { not: null } },
    select: { id: true },
  }) || await prisma.timetableEntry.findFirst({
    where: { schoolId: req.schoolId, teacherId: { not: null } },
    select: { id: true },
  });
  if (!schoolHasAnyAssignment) return true;

  const classIdInt = parseInt(classId);
  const [subjectMatch, timetableMatch] = await Promise.all([
    prisma.subject.findFirst({ where: { schoolId: req.schoolId, classId: classIdInt, teacherId: staff.id } }),
    prisma.timetableEntry.findFirst({ where: { schoolId: req.schoolId, classId: classIdInt, teacherId: staff.id } }),
  ]);
  return !!(subjectMatch || timetableMatch);
};

module.exports = { teacherCanAccessClass };
