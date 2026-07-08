const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  return `Tch#${pick()}${pick()}${pick()}${pick()}${pick()}${pick()}`;
};

router.get('/', wrap(async (req, res) => {
  const { departmentId, search, page = 1, limit = 25 } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  const where = { schoolId: req.schoolId, isActive: true, deletedAt: null, ...(departmentId && { departmentId: parseInt(departmentId) }), ...(search && { name: { contains: search, mode: 'insensitive' } }) };
  const [staff, total] = await Promise.all([
    prisma.staff.findMany({ where, skip, take: parseInt(limit), include: { department: true }, orderBy: { name: 'asc' } }),
    prisma.staff.count({ where })
  ]);
  res.json({ success: true, data: staff, total });
}));

/* ── Auto-generate staff employee code ─────────────────── */
async function generateEmpCode(schoolId, designation) {
  // Prefix based on designation
  const d = (designation || '').toUpperCase();
  let prefix = 'STF';
  if      (d.includes('TEACHER') || d.includes('TUTOR'))    prefix = 'TCH';
  else if (d.includes('PRINCIPAL') || d.includes('HEAD'))   prefix = 'PRI';
  else if (d.includes('ADMIN') || d.includes('MANAGER'))    prefix = 'ADM';
  else if (d.includes('ACCOUNT') || d.includes('FINANCE'))  prefix = 'ACC';
  else if (d.includes('SUPPORT') || d.includes('PEON'))     prefix = 'SPT';
  else if (d.includes('GUARD') || d.includes('SECURITY'))   prefix = 'GRD';
  else if (d.includes('LIBRARIAN'))                         prefix = 'LIB';
  else if (d.includes('DRIVER'))                            prefix = 'DRV';

  // Count all staff in school → sequential across entire school
  const count = await prisma.staff.count({ where: { schoolId } });
  const seq   = String(count + 1).padStart(4, '0');
  const yr    = new Date().getFullYear().toString().slice(-2);

  return `${prefix}-${yr}-${seq}`;   // e.g. TCH-26-0001, ADM-26-0002
}

router.post('/', wrap(async (req, res) => {
  const { name, email, phone, departmentId, designation, joiningDate, basicSalary, salaryType, cnic, gender, dob } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required.' });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const empCode = await generateEmpCode(req.schoolId, designation);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { schoolId: req.schoolId, campusId: req.campusId || 1, name, email, phone, role: 'teacher', passwordHash, mustChangePassword: true }
    });
    const staff = await tx.staff.create({
      data: {
        schoolId: req.schoolId, campusId: req.campusId || 1,
        userId: user.id, name, cnic, gender,
        dob: dob ? new Date(dob) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        designation, empCode,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        basicSalary: basicSalary ? parseInt(basicSalary) : 0,
        salaryType: salaryType || 'monthly'
      }
    });
    return { user, staff };
  });

  res.status(201).json({ success: true, data: result, tempPassword });
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

module.exports = router;
