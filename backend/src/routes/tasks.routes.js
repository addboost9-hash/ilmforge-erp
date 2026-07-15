const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/tasks — list SchoolTask for schoolId
router.get('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { assignedTo, status, priority } = req.query;

  const where = { schoolId };
  if (assignedTo) where.assignedTo = parseInt(assignedTo);
  if (status)     where.status     = status;
  if (priority)   where.priority   = priority;

  const tasks = await prisma.schoolTask.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
  });

  // Attach assignedToUser name by fetching user info
  const userIds = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];
  let usersMap = {};
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    usersMap = Object.fromEntries(users.map(u => [u.id, u]));
  }

  const result = tasks.map(t => ({
    ...t,
    assignedToUser: t.assignedTo ? usersMap[t.assignedTo] || null : null,
  }));

  res.json({ success: true, data: result });
}));

// GET /api/v1/tasks/my-tasks — tasks assigned to current user
router.get('/my-tasks', wrap(async (req, res) => {
  const { schoolId } = req;
  const userId = req.user?.id;

  const tasks = await prisma.schoolTask.findMany({
    where: { schoolId, assignedTo: userId },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  res.json({ success: true, data: tasks });
}));

// POST /api/v1/tasks — create task
router.post('/', wrap(async (req, res) => {
  const { schoolId } = req;
  const { title, description, assignedTo, priority, dueDate } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'title is required.' });

  const task = await prisma.schoolTask.create({
    data: {
      schoolId,
      title,
      description: description || null,
      assignedTo:  assignedTo ? parseInt(assignedTo) : null,
      priority:    priority   || 'medium',
      status:      'pending',
      dueDate:     dueDate    ? new Date(dueDate) : null,
      createdBy:   req.user?.id || null,
    },
  });

  res.status(201).json({ success: true, data: task });
}));

// PUT /api/v1/tasks/:id — update task
router.put('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);
  const { title, description, status, priority, dueDate, assignedTo } = req.body;

  const existing = await prisma.schoolTask.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Task not found.' });

  const updated = await prisma.schoolTask.update({
    where: { id },
    data: {
      ...(title       !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status      !== undefined && { status }),
      ...(priority    !== undefined && { priority }),
      ...(assignedTo  !== undefined && { assignedTo: assignedTo ? parseInt(assignedTo) : null }),
      ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
  });

  res.json({ success: true, data: updated });
}));

// PUT /api/v1/tasks/:id/complete — mark as complete
router.put('/:id/complete', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);

  const existing = await prisma.schoolTask.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Task not found.' });

  const updated = await prisma.schoolTask.update({
    where: { id },
    data: {
      status:      'completed',
    },
  });

  res.json({ success: true, data: updated });
}));

// DELETE /api/v1/tasks/:id
router.delete('/:id', wrap(async (req, res) => {
  const { schoolId } = req;
  const id = parseInt(req.params.id);

  const existing = await prisma.schoolTask.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Task not found.' });

  await prisma.schoolTask.delete({ where: { id } });
  res.json({ success: true, message: 'Task deleted.' });
}));

module.exports = router;
