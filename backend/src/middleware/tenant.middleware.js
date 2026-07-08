const prisma = require('../config/prisma');

/**
 * IlmForge — Tenant Middleware (Fixed)
 * Resolves schoolId and campusId for every protected request.
 * For admin/super_admin: auto-fetches main campus when none supplied.
 * Never blocks a request because of missing campusId.
 */
const tenantMiddleware = async (req, res, next) => {
  const schoolId    = req.user?.schoolId;
  const schoolIdInt = parseInt(schoolId);
  const role        = req.user?.role;
  const isPrivileged = ['super_admin', 'admin', 'accountant'].includes(role);
  const headerCampusId = req.headers['x-campus-id'];
  const tokenCampusId  = req.user?.campusId;

  if (!schoolId || Number.isNaN(schoolIdInt)) {
    return res.status(403).json({ success: false, message: 'School context missing.' });
  }

  // Non-admin roles cannot override campus context via header.
  if (headerCampusId && !isPrivileged) {
    return res.status(403).json({ success: false, message: 'Campus override not allowed for this role.' });
  }

  // Prefer explicit header for privileged roles; others stay on token campus.
  const selectedRaw = isPrivileged
    ? (headerCampusId ?? tokenCampusId)
    : tokenCampusId;

  let resolvedCampusId = selectedRaw ? parseInt(selectedRaw) : null;
  if (Number.isNaN(resolvedCampusId)) resolvedCampusId = null;

  // Validate provided campusId belongs to this school
  if (resolvedCampusId) {
    const campus = await prisma.campus.findFirst({
      where: { id: resolvedCampusId, schoolId: schoolIdInt },
      select: { id: true },
    });
    if (!campus) resolvedCampusId = null; // invalid — will auto-resolve below
  }

  // AUTO-RESOLVE: For any role, if campusId is still null, fetch the main campus.
  // This prevents FK constraint failures on campusId fields.
  if (!resolvedCampusId) {
    const fallback = await prisma.campus.findFirst({
      where:   { schoolId: schoolIdInt },
      orderBy: [{ isMain: 'desc' }, { id: 'asc' }],
      select:  { id: true },
    });
    resolvedCampusId = fallback?.id ?? null;
  }

  req.schoolId  = schoolIdInt;
  req.campusId  = resolvedCampusId;
  next();
};

module.exports = { tenantMiddleware };
