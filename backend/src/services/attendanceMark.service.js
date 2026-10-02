/**
 * IlmForge — marking a student present from a device or scan.
 *
 * Every way of taking attendance (the register, a barcode scan, a
 * fingerprint punch, the camera check-in) must land in the SAME record for
 * a given student and day, because Attendance is unique on (student, date).
 *
 * The register and barcode scan store the day as local midnight. The
 * fingerprint and camera routes used to store the exact time of the punch
 * (08:15:32), which never collides with midnight - so a student punched in
 * at 8:15 and later marked by their teacher ended up with TWO attendance
 * records for one day, and screens that look up the day exactly did not see
 * the punch at all.
 */
const prisma = require('../config/prisma');

const dayStart = (d = new Date()) => {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
};

/**
 * First arrival of the day marks the student present.
 *
 * A record that already exists for the day is left alone: if the teacher has
 * marked the student on leave, a later punch must not overwrite that.
 *
 * @returns {{ attendance, created: boolean }}
 */
async function markPresentFromDevice({ schoolId, student, method, markedBy = null, when = new Date() }) {
  const date = dayStart(when);
  const existing = await prisma.attendance.findUnique({
    where: { studentId_date: { studentId: student.id, date } },
  });
  if (existing) return { attendance: existing, created: false };

  try {
    const attendance = await prisma.attendance.create({
      data: {
        schoolId,
        campusId: student.campusId || null,
        studentId: student.id,
        classId: student.classId || null,
        sectionId: student.sectionId || null,
        date,
        status: 'present',
        method,
        markedBy,
      },
    });
    return { attendance, created: true };
  } catch (err) {
    // Two punches in the same instant: the other one won. Not an error.
    if (err.code === 'P2002') {
      const attendance = await prisma.attendance.findUnique({
        where: { studentId_date: { studentId: student.id, date } },
      });
      return { attendance, created: false };
    }
    throw err;
  }
}

module.exports = { markPresentFromDevice, dayStart };
