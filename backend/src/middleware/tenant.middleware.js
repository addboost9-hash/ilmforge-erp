const prisma = require('../config/prisma');

// Every request to protected routes must carry school_id from JWT
// This middleware injects it so all DB queries are automatically scoped
const tenantMiddleware = async (req, res, next) => {
  const schoolId = req.user?.schoolId;
  const campusId = req.user?.campusId || req.headers['x-campus-id'];

  if (!schoolId) {
    return res.status(403).json({ success: false, message: 'School context missing' });
  }

  // Non-admin roles cannot override campus context via header.
  if (req.headers['x-campus-id'] && !['super_admin', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Campus override is not allowed for this role.' });
  }

  let resolvedCampusId = campusId ? parseInt(campusId) : null;
  if (Number.isNaN(resolvedCampusId)) resolvedCampusId = null;

  if (resolvedCampusId) {
    const campus = await prisma.campus.findFirst({
      where: { id: resolvedCampusId, schoolId: parseInt(schoolId) },
      select: { id: true },
    });
    if (!campus) {
      return res.status(403).json({ success: false, message: 'Invalid campus context.' });
    }
  }

  req.schoolId = parseInt(schoolId);
  req.campusId = resolvedCampusId;
  next();
};

module.exports = { tenantMiddleware };
