const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { contains: ciContains, equals: ciEquals } = require('../utils/search');
const bcrypt = require('bcryptjs');
const { createStaff } = require('../services/staff.service');
const { checkPhoto } = require('../utils/photo');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);


/* ═══ Departments ═══════════════════════════════════════════
   The Department model has always existed (Staff.departmentId points at it,
   attendance/payroll reports group by it), but there was no API to create,
   rename or remove one — so the dropdown that should populate a staff
   member's department had nothing to read and StaffFormPage degraded into a
   free-text box that sent parseInt("Science") === NaN to the backend.
   Registered above the `/:id` routes below so "departments" isn't parsed as
   a staff id.
═══════════════════════════════════════════════════════════ */
router.get('/departments', wrap(async (req, res) => {
  const departments = await prisma.department.findMany({
    where: { schoolId: req.schoolId },
    orderBy: { name: 'asc' },
    // Only people still working here: offboarded staff kept the count up.
    include: { _count: { select: { staff: { where: { deletedAt: null, isActive: true } } } } },
  });
  res.json({
    success: true,
    data: departments.map(d => ({ id: d.id, name: d.name, staffCount: d._count.staff, createdAt: d.createdAt })),
  });
}));

router.post('/departments', wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });

  const existing = await prisma.department.findFirst({ where: { schoolId: req.schoolId, name } });
  if (existing) return res.status(409).json({ success: false, message: 'A department with that name already exists.' });

  const department = await prisma.department.create({ data: { schoolId: req.schoolId, name } });
  res.status(201).json({ success: true, data: department });
}));

router.put('/departments/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });

  const existing = await prisma.department.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Department not found.' });

  const clash = await prisma.department.findFirst({ where: { schoolId: req.schoolId, name, id: { not: id } } });
  if (clash) return res.status(409).json({ success: false, message: 'Another department already uses that name.' });

  const department = await prisma.department.update({ where: { id }, data: { name } });
  res.json({ success: true, data: department });
}));

/* Move staff into or out of a department in one go, from the Departments
   page, instead of opening every staff record. Body: { add: [staffId], remove: [staffId] } */
router.put('/departments/:id/members', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const dept = await prisma.department.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
  const ids = (v) => (Array.isArray(v) ? v : []).map((x) => parseInt(x)).filter(Number.isInteger);
  const add = ids(req.body.add);
  const remove = ids(req.body.remove).filter((x) => !add.includes(x));
  if (!add.length && !remove.length) return res.status(400).json({ success: false, message: 'Choose at least one staff member.' });

  const [added, removed] = await prisma.$transaction([
    prisma.staff.updateMany({ where: { id: { in: add }, schoolId: req.schoolId, deletedAt: null }, data: { departmentId: id } }),
    prisma.staff.updateMany({ where: { id: { in: remove }, schoolId: req.schoolId, departmentId: id }, data: { departmentId: null } }),
  ]);
  const parts = [];
  if (added.count) parts.push(`${added.count} added to ${dept.name}`);
  if (removed.count) parts.push(`${removed.count} removed from ${dept.name}`);
  res.json({ success: true, message: parts.join(', ') || 'Nothing changed.', data: { added: added.count, removed: removed.count } });
}));

router.delete('/departments/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.department.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Department not found.' });

  // Staff.departmentId has no cascade — deleting a department that still has
  // staff would orphan them behind a foreign key error, so refuse and say why.
  const staffCount = await prisma.staff.count({ where: { departmentId: id, deletedAt: null } });
  if (staffCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete "${existing.name}" — ${staffCount} staff member(s) are still assigned to it. Move them to another department first.`,
    });
  }

  await prisma.department.delete({ where: { id } });
  res.json({ success: true, message: `Department "${existing.name}" deleted.` });
}));

router.get('/', wrap(async (req, res) => {
  const { departmentId, page = 1 } = req.query;
  const search = req.query.search || req.query.name;
  // Without a limit every staff member comes back. The default used to be 25,
  // and most pages (staff list, staff attendance, HR) never asked for more, so
  // from the 26th teacher on people were missing from them.
  const take = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 2000) : 2000;
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
  const dept = departmentId === 'none' ? { departmentId: null }
    : departmentId && Number.isInteger(parseInt(departmentId)) ? { departmentId: parseInt(departmentId) } : {};
  const where = { schoolId: req.schoolId, isActive: true, deletedAt: null, ...dept, ...(search && { name: ciContains(search) }) };
  const [staff, total] = await Promise.all([
    // `user` is included so lists can show contact details (the staff
    // directory and birthday list both need a phone number); Staff itself
    // has no email/phone column — those live on the linked User.
    prisma.staff.findMany({ where, skip, take, include: { department: true, user: { select: { email: true, phone: true } } }, orderBy: { name: 'asc' } }),
    prisma.staff.count({ where })
  ]);
  res.json({ success: true, data: staff, total });
}));

/* ── Auto-generate staff employee code ─────────────────── */

// Staff creation lives in services/staff.service.js, shared with the Excel import.
router.post('/', wrap(async (req, res) => {
  try {
    const out = await createStaff(
      { schoolId: req.schoolId, campusId: req.campusId, actorUserId: req.user?.id },
      req.body,
    );
    res.status(201).json({
      success: true,
      data: { user: out.user, staff: out.staff },
      tempPassword: out.tempPassword,
      credentials: out.credentials,
    });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, message: err.message });
    throw err;
  }
}));

router.get('/stats', wrap(async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const [total, present, absent] = await Promise.all([
    prisma.staff.count({ where: { schoolId: req.schoolId, isActive: true, deletedAt: null } }),
    prisma.staffAttendance.count({ where: { schoolId: req.schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }),
    prisma.staffAttendance.count({ where: { schoolId: req.schoolId, date: { gte: today, lt: tomorrow }, status: 'absent' } }),
  ]);
  res.json({ success: true, data: { total, presentToday: present, absentToday: absent } });
}));

// GET /api/v1/staff/:id — fetch a single staff record
// FIX: this endpoint never existed — StaffFormPage's "Edit" route
// (/staff/:id/edit) had no way to load the record it was supposed to edit.
router.get('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const staff = await prisma.staff.findFirst({
    where: { id, schoolId: req.schoolId },
    include: { department: true, user: { select: { email: true, phone: true } } },
  });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
  res.json({ success: true, data: { ...staff, email: staff.user?.email, phone: staff.user?.phone } });
}));

// PUT /api/v1/staff/:id — update a staff record
// FIX: no update endpoint existed at all — every "Edit Staff" submission
// actually had nowhere to go (the frontend always POSTed to / instead,
// silently creating a duplicate staff+user record on every "edit").
router.put('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, phone, departmentId, designation, joiningDate, basicSalary, salaryType, cnic, gender, dob, photoUrl } = req.body;

  const existing = await prisma.staff.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Staff not found.' });

  // A department from another school, or one deleted meanwhile, would fail
  // on the foreign key with a bare 500; say what is wrong instead.
  if (departmentId) {
    const dept = await prisma.department.findFirst({ where: { id: parseInt(departmentId), schoolId: req.schoolId }, select: { id: true } });
    if (!dept) return res.status(400).json({ success: false, message: 'That department no longer exists. Pick another one.' });
  }

  // Staff photos could never be saved: this update ignored the field, so a
  // teacher's photo added on the ID Cards page vanished on the next visit.
  let photo;
  if (photoUrl !== undefined) {
    photo = checkPhoto(photoUrl);
    if (photo.error) return res.status(400).json({ success: false, message: photo.error });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (existing.userId && (name !== undefined || email !== undefined || phone !== undefined)) {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(name  !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
        },
      });
    }
    return tx.staff.update({
      where: { id },
      data: {
        ...(name         !== undefined && { name }),
        ...(cnic         !== undefined && { cnic }),
        ...(gender       !== undefined && { gender }),
        ...(dob          !== undefined && { dob: dob ? new Date(dob) : null }),
        ...(departmentId !== undefined && { departmentId: departmentId ? parseInt(departmentId) : null }),
        ...(designation  !== undefined && { designation }),
        ...(joiningDate  !== undefined && { joiningDate: joiningDate ? new Date(joiningDate) : null }),
        ...(basicSalary  !== undefined && { basicSalary: basicSalary ? parseInt(basicSalary) : 0 }),
        ...(salaryType   !== undefined && { salaryType }),
        ...(photo                      && { photoUrl: photo.value }),
      },
      include: { department: true },
    });
  });

  res.json({ success: true, data: updated, message: 'Staff updated.' });
}));

/* ── Per-staff module permissions ── */
router.put('/:id/permissions', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object')
    return res.status(400).json({ success: false, message: 'permissions object required' });
  const staff = await prisma.staff.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
  let existing = {};
  try { existing = JSON.parse(staff.notes || '{}'); } catch {}
  await prisma.staff.update({ where: { id }, data: { notes: JSON.stringify({ ...existing, modulePermissions: permissions }) } });
  res.json({ success: true, message: 'Permissions updated' });
}));

router.get('/:id/permissions', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const staff = await prisma.staff.findFirst({ where: { id, schoolId: req.schoolId } });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
  let permissions = {};
  try { permissions = JSON.parse(staff.notes || '{}').modulePermissions || {}; } catch {}
  res.json({ success: true, data: { id, permissions } });
}));

/* ── DELETE /staff/:id — soft-delete (offboard) a staff member ──
   There was no way to remove a staff member at all: once created they stayed
   in every list forever. Soft-deletes (Staff.deletedAt + isActive:false) so
   historical payroll, attendance and appraisal records stay intact, and
   deactivates their login so an offboarded employee can't sign in. */
router.delete('/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  const staff = await prisma.staff.findFirst({ where: { id, schoolId: req.schoolId, deletedAt: null } });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });

  // Don't strand a class without its class teacher.
  const classesLed = await prisma.class.count({ where: { schoolId: req.schoolId, classTeacherId: id } });
  if (classesLed > 0) {
    return res.status(400).json({
      success: false,
      message: `${staff.name} is still the class teacher for ${classesLed} class(es). Assign a different class teacher first.`,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    if (staff.userId) {
      await tx.user.update({ where: { id: staff.userId }, data: { isActive: false, deletedAt: new Date() } });
    }
  });

  res.json({ success: true, message: `${staff.name} has been offboarded.` });
}));

module.exports = router;
