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
  const [subjectMatch, timetableMatch, classTeacher] = await Promise.all([
    prisma.subject.findFirst({ where: { schoolId: req.schoolId, classId: classIdInt, teacherId: staff.id } }),
    prisma.timetableEntry.findFirst({ where: { schoolId: req.schoolId, classId: classIdInt, teacherId: staff.id } }),
    // The class teacher of the class (they were refused their own class).
    prisma.class.findFirst({ where: { id: classIdInt, schoolId: req.schoolId, classTeacherId: staff.id }, select: { id: true } }),
  ]);
  return !!(subjectMatch || timetableMatch || classTeacher);
};

/**
 * Whether the requesting user may enter marks for this subject of this class.
 * Once a school assigns teachers to subjects, a teacher marks their own
 * subjects (by Subject.teacherId or a timetable period of it); the class
 * teacher may mark every subject of the class. Before any assignment, the
 * class check alone decides (as teacherCanAccessClass).
 */
const teacherCanMarkSubject = async (req, classId, subjectId) => {
  const role = req.user?.role;
  if (['super_admin', 'admin'].includes(role)) return true;
  if (!(await teacherCanAccessClass(req, classId))) return false;
  if (!subjectId) return true;
  const staff = await prisma.staff.findFirst({ where: { userId: req.user.id, schoolId: req.schoolId, isActive: true, deletedAt: null }, select: { id: true } });
  if (!staff) return false;
  const subjectsAssigned = await prisma.subject.findFirst({ where: { schoolId: req.schoolId, teacherId: { not: null } }, select: { id: true } });
  if (!subjectsAssigned) return true;
  const [own, period, classTeacher] = await Promise.all([
    prisma.subject.findFirst({ where: { id: parseInt(subjectId), schoolId: req.schoolId, teacherId: staff.id }, select: { id: true } }),
    prisma.timetableEntry.findFirst({ where: { schoolId: req.schoolId, classId: parseInt(classId), subjectId: parseInt(subjectId), teacherId: staff.id }, select: { id: true } }),
    prisma.class.findFirst({ where: { id: parseInt(classId), schoolId: req.schoolId, classTeacherId: staff.id }, select: { id: true } }),
  ]);
  return !!(own || period || classTeacher);
};

module.exports = { teacherCanAccessClass, teacherCanMarkSubject };
