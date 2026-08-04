require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
  console.log('Starting portal link backfill...');

  let parentLinksCreated = 0;
  let studentLinksCreated = 0;

  const parents = await prisma.parent.findMany({
    include: { user: true, students: true },
  });

  for (const parent of parents) {
    if (parent.students.length > 0) continue;
    const phone = parent.user?.phone;
    if (!phone) continue;

    const students = await prisma.student.findMany({
      where: {
        schoolId: parent.schoolId,
        emergencyPhone: phone,
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const s of students) {
      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: s.id } },
        update: {},
        create: { schoolId: parent.schoolId, parentId: parent.id, studentId: s.id },
      });
      parentLinksCreated++;
    }
  }

  const studentUsers = await prisma.user.findMany({
    where: { role: 'student', deletedAt: null },
    select: { id: true, schoolId: true, email: true },
  });

  for (const su of studentUsers) {
    const already = await prisma.student.findFirst({
      where: { schoolId: su.schoolId, userId: su.id },
      select: { id: true },
    });
    if (already) continue;

    const candidates = await prisma.student.findMany({
      where: { schoolId: su.schoolId, userId: null, deletedAt: null, rollNo: { not: null } },
      select: { id: true, rollNo: true },
    });

    const matched = candidates.find((c) => {
      const token = normalize(c.rollNo);
      return token && normalize(su.email).includes(token);
    });

    if (matched) {
      await prisma.student.update({
        where: { id: matched.id },
        data: { userId: su.id },
      });
      studentLinksCreated++;
    }
  }

  console.log(`Parent-student links created: ${parentLinksCreated}`);
  console.log(`Student-user links created: ${studentLinksCreated}`);
  console.log('Backfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
