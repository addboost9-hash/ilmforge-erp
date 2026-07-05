const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/leads', wrap(async (req, res) => {
  const data = await prisma.admissionLead.findMany({
    where: { schoolId: req.schoolId },
    include: { followUps: { orderBy: { createdAt: 'desc' }, take: 3 } },
    orderBy: { updatedAt: 'desc' }, take: 200,
  });
  const stats = {};
  for (const s of ['new', 'contacted', 'visited', 'admitted', 'lost']) {
    stats[s] = await prisma.admissionLead.count({ where: { schoolId: req.schoolId, stage: s } });
  }
  res.json({ success: true, data, stats });
}));

router.post('/leads', wrap(async (req, res) => {
  const { studentName, parentName, phone, classApplied, source, notes, nextFollowUp } = req.body;
  if (!studentName || !parentName || !phone) return res.status(400).json({ success: false, message: 'Student, parent, phone required.' });
  const lead = await prisma.admissionLead.create({
    data: { schoolId: req.schoolId, studentName, parentName, phone, classApplied, source: source || 'walk-in', notes, nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null }
  });
  res.status(201).json({ success: true, data: lead });
}));

router.put('/leads/:id/stage', wrap(async (req, res) => {
  const lead = await prisma.admissionLead.update({ where: { id: parseInt(req.params.id) }, data: { stage: req.body.stage } });
  res.json({ success: true, data: lead });
}));

router.post('/leads/:id/followup', wrap(async (req, res) => {
  const fu = await prisma.leadFollowUp.create({
    data: { leadId: parseInt(req.params.id), note: req.body.note, outcome: req.body.outcome, byUserId: req.user.id }
  });
  await prisma.admissionLead.update({ where: { id: parseInt(req.params.id) }, data: { stage: req.body.newStage || 'contacted', nextFollowUp: req.body.nextFollowUp ? new Date(req.body.nextFollowUp) : null } });
  res.status(201).json({ success: true, data: fu });
}));

// POST /api/v1/crm/leads/:id/convert
// Converts an admission lead into an active student and marks lead as admitted.
router.post('/leads/:id/convert', wrap(async (req, res) => {
  const leadId = parseInt(req.params.id);
  const { classId, sectionId, rollNo, remarks } = req.body;

  const lead = await prisma.admissionLead.findFirst({ where: { id: leadId, schoolId: req.schoolId } });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

  const selectedClassId = classId ? parseInt(classId) : null;
  const selectedSectionId = sectionId ? parseInt(sectionId) : null;

  if (selectedClassId) {
    const cls = await prisma.class.findFirst({ where: { id: selectedClassId, schoolId: req.schoolId } });
    if (!cls) return res.status(400).json({ success: false, message: 'Invalid classId.' });
  }

  if (selectedSectionId) {
    const sec = await prisma.section.findFirst({ where: { id: selectedSectionId, schoolId: req.schoolId } });
    if (!sec) return res.status(400).json({ success: false, message: 'Invalid sectionId.' });
  }

  const autoRoll = `CRM-${Date.now().toString(36).toUpperCase()}`;

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        schoolId: req.schoolId,
        campusId: req.campusId || 1,
        name: lead.studentName,
        fatherName: lead.parentName,
        emergencyPhone: lead.phone,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        rollNo: rollNo || autoRoll,
        status: 'active',
      },
    });

    await tx.admissionLead.update({
      where: { id: lead.id },
      data: {
        stage: 'admitted',
        notes: remarks ? `${lead.notes || ''}\n${remarks}`.trim() : lead.notes,
      },
    });

    await tx.leadFollowUp.create({
      data: {
        leadId: lead.id,
        note: remarks || 'Lead converted to student',
        outcome: 'converted',
        byUserId: req.user.id,
      },
    });

    return student;
  });

  await prisma.auditLog.create({
    data: {
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'CRM_LEAD_CONVERTED',
      resource: 'admission_lead',
      resourceId: lead.id,
    },
  }).catch(() => null);

  res.json({ success: true, data: { leadId: lead.id, student: result }, message: 'Lead converted to student successfully.' });
}));

module.exports = router;
