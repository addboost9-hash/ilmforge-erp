const prisma = require('../config/prisma');

// Every request to protected routes must carry school_id from JWT
// This middleware injects it so all DB queries are automatically scoped
const tenantMiddleware = async (req, res, next) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'School context missing' });
    }
    req.schoolId = parseInt(schoolId);

    // The user's own campus (from their JWT) is always trusted as-is. A
    // client-supplied x-campus-id header is only honored after verifying it
    // actually belongs to this school — previously it was trusted outright,
    // letting a client claim any campus id (including another school's) and
    // have downstream campus-filtered queries scoped to it.
    if (req.user?.campusId) {
      req.campusId = parseInt(req.user.campusId);
    } else if (req.headers['x-campus-id']) {
      const requestedCampusId = parseInt(req.headers['x-campus-id']);
      const campus = Number.isFinite(requestedCampusId)
        ? await prisma.campus.findFirst({ where: { id: requestedCampusId, schoolId: req.schoolId } })
        : null;
      if (!campus) {
        return res.status(403).json({ success: false, message: 'Invalid campus for this school.' });
      }
      req.campusId = campus.id;
    } else {
      req.campusId = null;
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { tenantMiddleware };
