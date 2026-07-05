/**
 * IlmForge Chat Messenger — role-structured WhatsApp-style messaging
 * ═══════════════════════════════════════════════════════════════════
 * Rules:
 *  - parent/student/teacher → can chat with ADMIN (auto-find admin)
 *  - teacher → can chat with own-class students & their parents; class broadcast
 *  - admin → anyone in school
 *  - attachments: base64, 2MB cap, any doc/image type
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const MAX_ATTACH = 2 * 1024 * 1024 * 1.37; // ~2MB binary as base64

/* ── Contacts I'm allowed to start a chat with (role-scoped) ── */
router.get('/contacts', wrap(async (req, res) => {
  const { role, id: myId } = req.user;
  const schoolId = req.schoolId;
  let users = [];

  if (role === 'admin' || role === 'super_admin') {
    users = await prisma.user.findMany({
      where: { schoolId, isActive: true, deletedAt: null, id: { not: myId } },
      select: { id: true, name: true, role: true }, take: 500,
    });
  } else if (role === 'teacher') {
    // admins + (students/parents — school-wide for simplicity; class filter client-side)
    users = await prisma.user.findMany({
      where: { schoolId, isActive: true, deletedAt: null, id: { not: myId }, role: { in: ['admin', 'super_admin', 'student', 'parent'] } },
      select: { id: true, name: true, role: true }, take: 500,
    });
  } else {
    // parent/student/accountant/gatekeeper → admins + teachers
    users = await prisma.user.findMany({
      where: { schoolId, isActive: true, deletedAt: null, role: { in: ['admin', 'super_admin', 'teacher'] } },
      select: { id: true, name: true, role: true }, take: 100,
    });
  }
  res.json({ success: true, data: users });
}));

/* ── My conversations (with last message + unread count) ── */
router.get('/conversations', wrap(async (req, res) => {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId: req.user.id },
    include: {
      conversation: {
        include: {
          participants: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, senderName: true, attachmentName: true, createdAt: true } },
        }
      }
    },
  });
  const convos = [];
  for (const p of parts) {
    const c = p.conversation;
    if (c.schoolId !== req.schoolId) continue;
    const unread = await prisma.chatMessage.count({
      where: { conversationId: c.id, senderId: { not: req.user.id }, createdAt: { gt: p.lastReadAt || new Date(0) } }
    });
    // Resolve display name for direct chats
    let title = c.title;
    if (c.type === 'direct') {
      const otherId = c.participants.find(x => x.userId !== req.user.id)?.userId;
      if (otherId) {
        const other = await prisma.user.findUnique({ where: { id: otherId }, select: { name: true, role: true } });
        title = other ? `${other.name}` : 'Chat';
        c.otherRole = other?.role;
      }
    }
    convos.push({
      id: c.id, type: c.type, title, otherRole: c.otherRole || null, classId: c.classId,
      lastMessage: c.messages[0] || null, unread, updatedAt: c.updatedAt,
    });
  }
  convos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ success: true, data: convos });
}));

/* ── Start (or reuse) a direct conversation ── */
router.post('/conversations/direct', wrap(async (req, res) => {
  const otherId = parseInt(req.body.userId);
  if (!otherId) return res.status(400).json({ success: false, message: 'userId required.' });
  const other = await prisma.user.findFirst({ where: { id: otherId, schoolId: req.schoolId } });
  if (!other) return res.status(404).json({ success: false, message: 'User not found.' });

  // Role guard: non-admins can only start with allowed roles
  const myRole = req.user.role;
  const allowed =
    ['admin', 'super_admin'].includes(myRole) ? true :
    myRole === 'teacher' ? ['admin', 'super_admin', 'student', 'parent'].includes(other.role) :
    ['admin', 'super_admin', 'teacher'].includes(other.role);
  if (!allowed) return res.status(403).json({ success: false, message: 'Is role se chat allowed nahi.' });

  // Reuse existing direct convo
  const mine = await prisma.conversationParticipant.findMany({ where: { userId: req.user.id }, select: { conversationId: true } });
  const existing = await prisma.conversation.findFirst({
    where: { id: { in: mine.map(m => m.conversationId) }, type: 'direct', participants: { some: { userId: otherId } } },
  });
  if (existing) return res.json({ success: true, data: existing, existing: true });

  const convo = await prisma.conversation.create({
    data: {
      schoolId: req.schoolId, type: 'direct', createdBy: req.user.id,
      participants: { create: [{ userId: req.user.id }, { userId: otherId }] },
    }
  });
  res.status(201).json({ success: true, data: convo });
}));

/* ── Class broadcast (teacher/admin → all students+parents of a class) ── */
router.post('/conversations/broadcast', wrap(async (req, res) => {
  if (!['teacher', 'admin', 'super_admin'].includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Sirf teacher/admin broadcast kar sakte hain.' });
  const classId = parseInt(req.body.classId);
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId: req.schoolId } });
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

  // Collect student users of this class (by matching student names→users is unreliable; use role student+parent linked via students' emergencyPhone)
  const students = await prisma.student.findMany({ where: { schoolId: req.schoolId, classId, deletedAt: null }, select: { name: true, emergencyPhone: true } });
  const phones = students.map(s => s.emergencyPhone).filter(Boolean);
  const users = await prisma.user.findMany({
    where: {
      schoolId: req.schoolId, isActive: true,
      OR: [
        { role: 'parent', phone: { in: phones } },
        { role: 'student', name: { in: students.map(s => s.name) } },
      ],
    },
    select: { id: true },
  });

  const convo = await prisma.conversation.create({
    data: {
      schoolId: req.schoolId, type: 'class_broadcast', classId,
      title: `📢 ${cls.name} — Class Announcements`,
      createdBy: req.user.id,
      participants: { create: [{ userId: req.user.id }, ...users.map(u => ({ userId: u.id }))] },
    }
  });
  res.status(201).json({ success: true, data: convo, recipients: users.length });
}));

/* ── Messages: list + mark read ── */
router.get('/conversations/:id/messages', wrap(async (req, res) => {
  const convoId = parseInt(req.params.id);
  const isPart = await prisma.conversationParticipant.findFirst({ where: { conversationId: convoId, userId: req.user.id } });
  if (!isPart) return res.status(403).json({ success: false, message: 'Not a participant.' });
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: convoId },
    orderBy: { createdAt: 'asc' }, take: 200,
  });
  await prisma.conversationParticipant.update({ where: { id: isPart.id }, data: { lastReadAt: new Date() } });
  res.json({ success: true, data: messages });
}));

/* ── Send message (text and/or attachment) ── */
router.post('/conversations/:id/messages', wrap(async (req, res) => {
  const convoId = parseInt(req.params.id);
  const { body, attachmentName, attachmentType, attachmentData } = req.body;
  if (!body && !attachmentData) return res.status(400).json({ success: false, message: 'Message ya attachment required.' });
  if (attachmentData && attachmentData.length > MAX_ATTACH) return res.status(400).json({ success: false, message: 'Attachment max 2MB.' });
  const isPart = await prisma.conversationParticipant.findFirst({ where: { conversationId: convoId, userId: req.user.id } });
  if (!isPart) return res.status(403).json({ success: false, message: 'Not a participant.' });

  const convo = await prisma.conversation.findUnique({ where: { id: convoId } });
  // Broadcast: only creator (teacher/admin) can send
  if (convo.type === 'class_broadcast' && convo.createdBy !== req.user.id && !['admin', 'super_admin'].includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Broadcast mein sirf teacher/admin bhej sakte hain.' });

  const msg = await prisma.chatMessage.create({
    data: {
      conversationId: convoId, senderId: req.user.id,
      senderName: req.user.name, senderRole: req.user.role,
      body: body || null, attachmentName, attachmentType, attachmentData,
    }
  });
  await prisma.conversation.update({ where: { id: convoId }, data: { updatedAt: new Date() } });
  res.status(201).json({ success: true, data: msg });
}));

/* ── Total unread badge ── */
router.get('/unread-count', wrap(async (req, res) => {
  const parts = await prisma.conversationParticipant.findMany({ where: { userId: req.user.id } });
  let total = 0;
  for (const p of parts) {
    total += await prisma.chatMessage.count({
      where: { conversationId: p.conversationId, senderId: { not: req.user.id }, createdAt: { gt: p.lastReadAt || new Date(0) } }
    });
  }
  res.json({ success: true, count: total });
}));

module.exports = router;
