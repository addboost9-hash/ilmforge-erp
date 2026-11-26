/**
 * IlmForge — the visitor kiosk, /api/v1/kiosk.
 *
 * A tablet at reception where visitors fill the form themselves. It is not
 * a person's account: it carries its own key (x-kiosk-token), made by the
 * admin on the Visitor Desk, and can do only three things:
 *
 *   GET  /me        the school's name, logo and the form's lists
 *   POST /children  a parent's own children: the father's CNIC AND the last
 *                   4 digits of the mobile number the school has. Only first
 *                   names and classes; never a search by name, so a stranger
 *                   cannot look children up.
 *   POST /visits    the visit, waiting for reception to confirm it
 *
 * A wrong CNIC or number answers the same as "no children", and lookups are
 * limited per tablet, so the kiosk cannot be used to find out who studies here.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const prisma = require('../config/prisma');
const vd = require('../services/visitorDesk.service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, message, code = 400, extra = {}) => res.status(code).json({ success: false, message, ...extra });

/* The tablet's key → its school. */
router.use(wrap(async (req, res, next) => {
  const token = req.get('x-kiosk-token');
  if (!token) return bad(res, 'This tablet is not set up as a kiosk.', 401, { code: 'KIOSK_NO_KEY' });
  const k = await prisma.kioskDevice.findUnique({ where: { tokenHash: vd.hashToken(token) } });
  if (!k || k.revokedAt) return bad(res, 'This kiosk was removed. Ask the admin to set it up again.', 401, { code: 'KIOSK_REVOKED' });
  const school = await prisma.school.findUnique({ where: { id: k.schoolId }, select: { id: true, name: true, logoUrl: true, status: true } });
  if (!school || ['suspended', 'inactive'].includes(school.status)) return bad(res, 'This school\'s account is not active.', 403, { code: 'SCHOOL_INACTIVE' });
  req.kiosk = k;
  req.school = school;
  req.schoolId = k.schoolId;
  if (!k.lastSeenAt || Date.now() - new Date(k.lastSeenAt).getTime() > 5 * 60e3) {
    prisma.kioskDevice.update({ where: { id: k.id }, data: { lastSeenAt: new Date() } }).catch(() => null);
  }
  return next();
}));

// Children lookups: a few a minute per tablet (a family needs one or two).
const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  keyGenerator: (req) => `kiosk:${req.kiosk?.id || req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { success: false, message: 'Too many tries. Please wait a minute, or ask at reception.' },
});
const visitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => `kiosk-visit:${req.kiosk?.id || req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { success: false, message: 'Too many entries. Please wait a minute, or ask at reception.' },
});

router.get('/me', wrap(async (req, res) => {
  const classes = await prisma.class.findMany({ where: { schoolId: req.schoolId, isActive: true }, select: { name: true }, orderBy: [{ orderNo: 'asc' }, { id: 'asc' }] });
  res.json({
    success: true,
    data: {
      kiosk: { name: req.kiosk.name },
      school: { name: req.school.name, logoUrl: req.school.logoUrl || '' },
      reasons: Object.keys(vd.REASONS).filter((r) => r !== 'vendor'),
      complaintTypes: Object.keys(vd.COMPLAINT_TYPES),
      relations: Object.keys(vd.RELATIONS),
      childReasons: [...vd.CHILD_REASONS],
      needsChild: [...vd.NEEDS_CHILD],
      classes: classes.map((c) => c.name),
    },
  });
}));

/* The children this CNIC and mobile (last 4 digits) open: the father's CNIC
   on their record, and the same number among the record's phones. */
async function ownChildren(schoolId, fatherCnic, last4) {
  if (!vd.isRealCnic(fatherCnic)) return [];
  const kids = await vd.childrenByCnic(schoolId, fatherCnic);
  return kids.filter((s) => vd.lastFourMatches(
    [s.emergencyPhone, s.motherPhone, ...(s.parents || []).map((p) => p.parent?.user?.phone)].filter(Boolean),
    last4,
  ));
}

// POST /children { fatherCnic, last4 }
router.post('/children', lookupLimiter, wrap(async (req, res) => {
  const { fatherCnic, last4 } = req.body || {};
  if (vd.cnicDigits(fatherCnic).length !== 13) return bad(res, 'Write the 13 digits of the father\'s CNIC.');
  if (String(last4 || '').replace(/\D/g, '').length !== 4) return bad(res, 'Write the last 4 digits of your mobile number.');
  const kids = await ownChildren(req.schoolId, fatherCnic, last4);
  res.json({
    success: true,
    data: kids.map((s) => ({ id: s.id, firstName: String(s.name || '').split(/\s+/)[0], className: vd.classOf(s) })),
    ...(kids.length ? {} : { message: 'No child found with this CNIC and mobile number. Please ask at reception.' }),
  });
}));

// POST /visits — the visit, waiting for reception to confirm it
router.post('/visits', visitLimiter, wrap(async (req, res) => {
  const { errors, data: d } = vd.checkVisit(req.body, { kiosk: true });
  if (d.reason === 'vendor') errors.reason = 'Vendors and deliveries: please ask at reception.';
  if (d.studentIds.length) {
    // Only children the CNIC and mobile number open (checked again here).
    const own = await ownChildren(req.schoolId, req.body?.fatherCnic, req.body?.last4);
    const ok = new Set(own.map((s) => s.id));
    if (!d.studentIds.every((id) => ok.has(id))) errors.studentIds = 'Choose your child again, or ask at reception.';
  }
  if (Object.keys(errors).length) return bad(res, Object.values(errors)[0], 400, { errors });

  const visit = await prisma.visitorLog.create({
    data: {
      schoolId: req.schoolId,
      visitorName: d.name, phone: d.phone || null, cnic: d.cnic || null,
      purpose: vd.REASONS[d.reason],
      relation: d.relation || null, reason: d.reason, detail: d.detail || null, childName: d.childName || null,
      studentIds: d.studentIds.length ? JSON.stringify(d.studentIds) : null,
      remarks: d.remarks || null,
      method: 'cnic', source: 'kiosk', status: 'pending', passCode: vd.newPassCode(),
      kioskData: JSON.stringify({
        address: d.address || '', city: d.city || '',
        photoUrl: d.photoUrl || null, cnicPhotoUrl: d.cnicPhotoUrl || null,
        fatherCnic: d.fatherCnic || '', kiosk: req.kiosk.name,
      }),
    },
  });
  await prisma.auditLog.create({
    data: { schoolId: req.schoolId, userId: null, action: 'VISITOR_KIOSK_ENTRY', resource: 'visitor', resourceId: visit.id, details: JSON.stringify({ kiosk: req.kiosk.id, reason: d.reason }) },
  }).catch(() => null);
  res.status(201).json({ success: true, data: { ticket: vd.slipNo(visit.id) }, message: 'Thank you. Please show this number at reception.' });
}));

module.exports = router;
