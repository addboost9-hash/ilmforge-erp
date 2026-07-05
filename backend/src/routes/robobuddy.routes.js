const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  let cfg = await prisma.roboBuddyConfig.findUnique({ where: { schoolId: req.schoolId } });
  if (!cfg) cfg = await prisma.roboBuddyConfig.create({ data: { schoolId: req.schoolId } });
  res.json({ success: true, data: cfg });
}));

router.put('/', wrap(async (req, res) => {
  const { botName, whatsappNumber, isEnabled, autoFeeReminder, autoAbsentAlert, autoResultShare, welcomeMessage } = req.body;
  const cfg = await prisma.roboBuddyConfig.upsert({
    where: { schoolId: req.schoolId },
    create: { schoolId: req.schoolId, botName, whatsappNumber, isEnabled, autoFeeReminder, autoAbsentAlert, autoResultShare, welcomeMessage },
    update: { botName, whatsappNumber, isEnabled, autoFeeReminder, autoAbsentAlert, autoResultShare, welcomeMessage },
  });
  res.json({ success: true, data: cfg });
}));

module.exports = router;
