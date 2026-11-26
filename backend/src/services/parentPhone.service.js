const prisma = require('../config/prisma');
const phoneUtil = require('../utils/phone');

/* When the parent's phone on a student record is corrected, the parent's
   sign-in number must follow: the manual tells offices to fix a parent who
   cannot sign in exactly this way, but the edit used to change only the
   student record. Only a parent account that signed in with the OLD number
   is moved, and never onto a number another account here already uses.
   (Used by a student's edit and by the Visitor Desk's approved updates.) */
async function syncParentLoginPhone({ schoolId, studentId, oldPhone, newPhone }) {
  const links = await prisma.parentStudent.findMany({
    where: { schoolId, studentId },
    include: { parent: { include: { user: { select: { id: true, phone: true } } } } },
  });
  const users = links.map((l) => l.parent?.user).filter((u) => u && (!oldPhone || !u.phone || phoneUtil.same(u.phone, oldPhone)));
  if (!users.length) return { changed: false };
  const taken = await prisma.user.findFirst({
    where: { schoolId, deletedAt: null, id: { notIn: users.map((u) => u.id) }, OR: phoneUtil.variants(newPhone).map((v) => ({ phone: v })) },
    select: { id: true },
  });
  if (taken) {
    return { changed: false, reason: 'Another account at this school already uses this number, so the parent still signs in with the old one.' };
  }
  const canonical = phoneUtil.canonical(newPhone);
  await prisma.user.updateMany({ where: { id: { in: users.map((u) => u.id) } }, data: { phone: canonical } });
  return { changed: true, phone: newPhone };
}

module.exports = { syncParentLoginPhone };
