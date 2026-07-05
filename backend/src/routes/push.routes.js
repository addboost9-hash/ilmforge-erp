const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { sendPushMulticast } = require('../services/push.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const ADMIN_ROLES = new Set(['super_admin', 'admin', 'accountant']);
const canSendPush = (role) => ADMIN_ROLES.has(role);

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
    // Audit is best effort.
  }
}

function normalizeTopicList(value) {
  if (!Array.isArray(value)) return null;
  const filtered = value
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .slice(0, 20);
  return filtered.length ? JSON.stringify(filtered) : null;
}

// POST /api/v1/push/tokens
router.post('/tokens', wrap(async (req, res) => {
  const { token, platform, deviceId, appVersion, subscribedTo } = req.body || {};
  if (!token || !platform) {
    return res.status(400).json({ success: false, message: 'token and platform are required.' });
  }

  const normalizedToken = String(token).trim();
  if (!normalizedToken) {
    return res.status(400).json({ success: false, message: 'token cannot be empty.' });
  }

  const upserted = await prisma.deviceToken.upsert({
    where: {
      schoolId_token: {
        schoolId: req.schoolId,
        token: normalizedToken,
      },
    },
    create: {
      schoolId: req.schoolId,
      userId: req.user.id,
      token: normalizedToken,
      platform: String(platform).toLowerCase(),
      deviceId: deviceId ? String(deviceId) : null,
      appVersion: appVersion ? String(appVersion) : null,
      subscribedTo: normalizeTopicList(subscribedTo),
      isActive: true,
      lastSeenAt: new Date(),
    },
    update: {
      userId: req.user.id,
      platform: String(platform).toLowerCase(),
      deviceId: deviceId ? String(deviceId) : null,
      appVersion: appVersion ? String(appVersion) : null,
      subscribedTo: normalizeTopicList(subscribedTo),
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  await logAudit(req, 'DEVICE_TOKEN_REGISTERED', 'device_token', upserted.id);
  res.status(201).json({ success: true, data: upserted });
}));

// DELETE /api/v1/push/tokens
router.delete('/tokens', wrap(async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ success: false, message: 'token is required.' });

  const found = await prisma.deviceToken.findFirst({ where: { schoolId: req.schoolId, token } });
  if (!found) return res.status(404).json({ success: false, message: 'Device token not found.' });

  const isOwner = found.userId === req.user.id;
  if (!isOwner && !ADMIN_ROLES.has(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Not allowed to remove this token.' });
  }

  await prisma.deviceToken.update({ where: { id: found.id }, data: { isActive: false } });
  await logAudit(req, 'DEVICE_TOKEN_DEACTIVATED', 'device_token', found.id);

  res.json({ success: true, message: 'Device token deactivated.' });
}));

// GET /api/v1/push/tokens
router.get('/tokens', wrap(async (req, res) => {
  if (!canSendPush(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  const {
    userId,
    active = 'true',
    platform,
    page = '1',
    limit = '50',
  } = req.query;

  const pg = Math.max(1, toInt(page, 1));
  const perPage = Math.min(200, Math.max(1, toInt(limit, 50)));

  const where = {
    schoolId: req.schoolId,
    ...(userId ? { userId: toInt(userId, 0) } : {}),
    ...(platform ? { platform: String(platform).toLowerCase() } : {}),
    ...(active === 'true' ? { isActive: true } : {}),
    ...(active === 'false' ? { isActive: false } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.deviceToken.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (pg - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        userId: true,
        platform: true,
        deviceId: true,
        appVersion: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.deviceToken.count({ where }),
  ]);

  res.json({ success: true, data: rows, total, page: pg, pages: Math.ceil(total / perPage) });
}));

// POST /api/v1/push/send
router.post('/send', wrap(async (req, res) => {
  if (!canSendPush(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  const {
    userIds,
    title,
    body,
    data,
    platform,
  } = req.body || {};

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'userIds array is required.' });
  }
  if (!title || !body) {
    return res.status(400).json({ success: false, message: 'title and body are required.' });
  }

  const normalizedUserIds = userIds.map((v) => toInt(v, 0)).filter((v) => v > 0);
  const tokens = await prisma.deviceToken.findMany({
    where: {
      schoolId: req.schoolId,
      userId: { in: normalizedUserIds },
      isActive: true,
      ...(platform ? { platform: String(platform).toLowerCase() } : {}),
    },
  });

  const payload = {
    title: String(title),
    body: String(body),
    data: data || {},
  };

  let dispatch;
  try {
    dispatch = await sendPushMulticast({
      tokens: tokens.map((t) => t.token),
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      message: 'Push delivery provider is not configured or failed.',
      error: err?.message || 'FCM dispatch failed',
    });
  }

  await prisma.notificationLog.create({
    data: {
      schoolId: req.schoolId,
      type: 'push',
      recipientType: 'users',
      title: payload.title,
      body: payload.body,
      status: dispatch.failed > 0 && dispatch.sent === 0 ? 'failed' : 'sent',
      sentAt: dispatch.sentAt,
      errorMsg: dispatch.failed > 0 ? `Failed: ${dispatch.failed}` : null,
    },
  });

  await logAudit(req, 'PUSH_SENT', 'notification_log', null);

  res.json({
    success: true,
    message: `Push delivered to ${dispatch.sent} of ${tokens.length} device(s).`,
    data: { recipients: tokens.length, dispatch },
  });
}));

// POST /api/v1/push/broadcast
router.post('/broadcast', wrap(async (req, res) => {
  if (!canSendPush(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  const {
    title,
    body,
    roles,
    topic,
    data,
    platform,
  } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ success: false, message: 'title and body are required.' });
  }

  const userWhere = {
    schoolId: req.schoolId,
    isActive: true,
    ...(Array.isArray(roles) && roles.length ? { role: { in: roles.map((r) => String(r)) } } : {}),
  };
  const users = await prisma.user.findMany({ where: userWhere, select: { id: true } });
  const userIds = users.map((u) => u.id);

  const tokenWhere = {
    schoolId: req.schoolId,
    isActive: true,
    ...(platform ? { platform: String(platform).toLowerCase() } : {}),
    ...(userIds.length ? { userId: { in: userIds } } : { userId: -1 }),
  };

  if (topic) {
    tokenWhere.subscribedTo = { contains: String(topic) };
  }

  const tokens = await prisma.deviceToken.findMany({ where: tokenWhere });

  const payload = {
    title: String(title),
    body: String(body),
    topic: topic ? String(topic) : null,
    data: data || {},
  };

  let dispatch;
  try {
    dispatch = await sendPushMulticast({
      tokens: tokens.map((t) => t.token),
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      message: 'Push delivery provider is not configured or failed.',
      error: err?.message || 'FCM dispatch failed',
    });
  }

  const log = await prisma.notificationLog.create({
    data: {
      schoolId: req.schoolId,
      type: 'push',
      recipientType: 'broadcast',
      title: payload.title,
      body: payload.body,
      status: dispatch.failed > 0 && dispatch.sent === 0 ? 'failed' : 'sent',
      sentAt: dispatch.sentAt,
      errorMsg: dispatch.failed > 0 ? `Failed: ${dispatch.failed}` : null,
    },
  });

  await logAudit(req, 'PUSH_BROADCAST_SENT', 'notification_log', log.id);

  res.json({
    success: true,
    message: `Broadcast delivered to ${dispatch.sent} of ${tokens.length} device(s).`,
    data: { recipients: tokens.length, dispatch, logId: log.id },
  });
}));

module.exports = router;
