const prisma = require('../config/prisma');
const { getDefaultPermission } = require('../config/permissionMatrix');

function resolveAction(req) {
  const path = (req.path || '').toLowerCase();
  if (path.includes('export') || path.includes('download') || path.includes('csv') || path.includes('pdf')) {
    return 'canExport';
  }

  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return 'canView';
  if (method === 'POST') return 'canCreate';
  if (method === 'PUT' || method === 'PATCH') return 'canUpdate';
  if (method === 'DELETE') return 'canDelete';
  return 'canView';
}

const requireModulePermission = (moduleKey) => async (req, res, next) => {
  try {
    const role = req.user?.role;

    if (!role) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    if (role === 'super_admin') return next();

    const action = resolveAction(req);
    const where = { schoolId: req.schoolId, role, module: moduleKey };

    const override = await prisma.rolePermission.findFirst({ where });
    const effective = override || getDefaultPermission(role, moduleKey);

    if (effective[action]) return next();

    return res.status(403).json({
      success: false,
      message: `Access denied: ${role} cannot perform this action on ${moduleKey}.`,
      code: 'PERMISSION_DENIED',
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { requireModulePermission };
