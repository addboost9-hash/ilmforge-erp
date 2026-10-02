/**
 * IlmForge — staff creation.
 *
 * One function creates a staff member and their sign-in account, whether the
 * request came from the Add Staff form or from a row in an Excel import, so
 * both produce the same employee code scheme, role and portal credentials.
 *
 * Moved out of routes/staff.routes.js. Behaviour is unchanged except that
 * employee codes no longer collide after a deletion, and a staff member may
 * be created without an email address when a phone number is given (they
 * then sign in with the phone, which the login already supports).
 */
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const phoneUtil = require('../utils/phone');
const { checkPhoto } = require('../utils/photo');

const STAFF_ROLES = ['teacher', 'accountant', 'gatekeeper', 'admin'];
const ROLE_LABEL = {
  teacher: 'Teacher Portal', accountant: 'Accountant Portal',
  gatekeeper: 'Gate Portal', admin: 'Admin Dashboard',
};

// Unchanged from the original Add Staff route.
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  return `Tch#${pick()}${pick()}${pick()}${pick()}${pick()}${pick()}`;
};

/** Role from an explicit choice, else from the designation, else teacher. */
function inferRole(designation, requested) {
  const r = String(requested || '').toLowerCase().trim();
  if (STAFF_ROLES.includes(r)) return r;
  const t = String(designation || '').toLowerCase();
  if (t.includes('account') || t.includes('cashier') || t.includes('bursar')) return 'accountant';
  if (t.includes('gate') || t.includes('security') || t.includes('guard')) return 'gatekeeper';
  if (t.includes('principal') || t.includes('head') || t.includes('director') || t.includes('admin')) return 'admin';
  return 'teacher';
}

/* Employee code, e.g. TCH-26-0001.
   FIX: the sequence was "staff in school + 1", which after a deletion is
   already in use. It now steps forward until it finds a free code. */
async function generateEmpCode(schoolId, designation, client = prisma) {
  const d = (designation || '').toUpperCase();
  let prefix = 'STF';
  if (d.includes('TEACHER') || d.includes('TUTOR')) prefix = 'TCH';
  else if (d.includes('PRINCIPAL') || d.includes('HEAD')) prefix = 'PRI';
  else if (d.includes('ADMIN') || d.includes('MANAGER')) prefix = 'ADM';
  else if (d.includes('ACCOUNT') || d.includes('FINANCE')) prefix = 'ACC';
  else if (d.includes('SUPPORT') || d.includes('PEON')) prefix = 'SPT';
  else if (d.includes('GUARD') || d.includes('SECURITY')) prefix = 'GRD';
  else if (d.includes('LIBRARIAN')) prefix = 'LIB';
  else if (d.includes('DRIVER')) prefix = 'DRV';

  const yr = new Date().getFullYear().toString().slice(-2);
  const count = await client.staff.count({ where: { schoolId } });
  for (let seq = count + 1; seq < count + 1000; seq++) {
    const candidate = `${prefix}-${yr}-${String(seq).padStart(4, '0')}`;
    const taken = await client.staff.findFirst({ where: { schoolId, empCode: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${prefix}-${yr}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

const slug12 = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);

/**
 * Create a staff member with a sign-in account.
 *
 * @param {object} ctx { schoolId, campusId, actorUserId?, school? }
 * @param {object} input  the same body the Add Staff form posts. basicSalary
 *                        is in PAISA, as everywhere else money is stored.
 */
async function createStaff(ctx, input) {
  const { schoolId } = ctx;
  const {
    name, email, phone, departmentId, designation, joiningDate,
    basicSalary, salaryType, cnic, gender, dob, role: requestedRole, empCode: givenEmpCode, photoUrl,
  } = input;

  const fail = (msg) => { const e = new Error(msg); e.status = 400; throw e; };
  if (!name) fail('Name is required.');

  const photo = photoUrl !== undefined ? checkPhoto(photoUrl) : { value: null };
  if (photo.error) fail(photo.error);

  const canonicalPhone = phone ? (phoneUtil.canonical(phone) || String(phone).trim()) : null;
  if (!email && !canonicalPhone) fail('An email address or a phone number is required, so the staff member can sign in.');

  const campusId = ctx.campusId;
  if (!campusId) fail('No campus found for this school. Create one first in Settings → Campuses.');

  const staffRole = inferRole(designation, requestedRole);
  const empCode = givenEmpCode && String(givenEmpCode).trim()
    ? String(givenEmpCode).trim()
    : await generateEmpCode(schoolId, designation);

  const school = ctx.school || await prisma.school.findUnique({ where: { id: schoolId }, select: { slug: true, name: true } });

  // No email: a unique internal address keeps the account valid, and the
  // person signs in with their phone number instead.
  const loginEmail = email && String(email).trim()
    ? String(email).trim().toLowerCase()
    : `${slug12(name)}.${empCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@${school?.slug || 'school'}.staff`;

  const clash = await prisma.user.findFirst({ where: { schoolId, email: loginEmail }, select: { id: true } });
  if (clash) fail(`A user with the email ${loginEmail} already exists in this school.`);

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        schoolId, campusId, name, email: loginEmail, phone: canonicalPhone,
        role: staffRole, passwordHash, mustChangePassword: true,
        // The school vouches for staff it adds, as it does for students and
        // parents. Without this the new account could not sign in at all.
        phoneVerifiedAt: new Date(),
      },
    });
    const staff = await tx.staff.create({
      data: {
        schoolId, campusId,
        userId: user.id, name, cnic: cnic || null, gender: gender || null,
        dob: dob ? new Date(dob) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        designation: designation || null, empCode,
        photoUrl: photo.value,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        basicSalary: basicSalary ? parseInt(basicSalary) : 0,
        salaryType: salaryType || 'monthly',
      },
    });
    if (ctx.actorUserId) {
      await tx.auditLog.create({
        data: {
          schoolId, userId: ctx.actorUserId,
          action: ctx.auditAction || 'STAFF_CREATED',
          resource: 'staff', resourceId: staff.id,
          details: JSON.stringify({ name, empCode, role: staffRole }),
        },
      }).catch(() => null);
    }
    return { user, staff };
  });

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const signsInWithPhone = !email && canonicalPhone;

  return {
    ...result,
    tempPassword,
    credentials: {
      portalLink: `${FRONTEND_URL}/login?slug=${school?.slug || ''}&role=${staffRole}`,
      loginId: signsInWithPhone ? canonicalPhone : loginEmail,
      loginIdLabel: signsInWithPhone ? 'Phone number' : 'Email',
      phone: canonicalPhone,
      password: tempPassword,
      role: staffRole,
      portal: ROLE_LABEL[staffRole] || 'Staff Portal',
      empCode,
      schoolName: school?.name || '',
      mustChangePassword: true,
    },
  };
}

module.exports = { createStaff, generateEmpCode, inferRole, STAFF_ROLES, ROLE_LABEL };
