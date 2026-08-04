const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { ROLES, MODULES, getDefaultPermission, normalizePermission } = require('../config/permissionMatrix');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/meta', wrap(async (req, res) => {
  res.json({ success: true, data: { roles: ROLES, modules: MODULES } });
}));

router.get('/', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const rows = await prisma.rolePermission.findMany({
    where: { schoolId },
    orderBy: [{ role: 'asc' }, { module: 'asc' }],
  });

  const byKey = new Map(rows.map((r) => [`${r.role}::${r.module}`, r]));

  const matrix = ROLES.map((role) => ({
    role,
    modules: MODULES.map((module) => {
      const override = byKey.get(`${role}::${module}`);
      const base = override || getDefaultPermission(role, module);
      return {
        module,
        canView: !!base.canView,
        canCreate: !!base.canCreate,
        canUpdate: !!base.canUpdate,
        canDelete: !!base.canDelete,
        canExport: !!base.canExport,
        isOverride: !!override,
      };
    }),
  }));

  res.json({ success: true, data: matrix });
}));

router.put('/:role/:module', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const role = String(req.params.role);
  const module = String(req.params.module);

  if (!ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }
  if (!MODULES.includes(module)) {
    return res.status(400).json({ success: false, message: 'Invalid module.' });
  }

  const perm = normalizePermission(req.body || {});

  const saved = await prisma.rolePermission.upsert({
    where: { schoolId_role_module: { schoolId, role, module } },
    create: { schoolId, role, module, ...perm },
    update: { ...perm },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user?.id,
      action: 'update_role_permission',
      resource: 'role_permission',
      resourceId: saved.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.json({ success: true, data: saved });
}));

router.post('/reset-defaults', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  await prisma.rolePermission.deleteMany({ where: { schoolId } });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user?.id,
      action: 'reset_role_permissions_defaults',
      resource: 'role_permission',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.json({ success: true, message: 'Permissions reset to defaults.' });
}));

module.exports = router;
