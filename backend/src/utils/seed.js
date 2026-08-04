require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding IlmForge demo data...');

  // ── Guard: skip if already seeded ──────────────────────────
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@demo.com' }
  });
  if (existingAdmin) {
    console.log('✅ Already seeded — skipping. Use admin@demo.com / Admin@123');
    return;
  }

  // ── School ─────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where:  { slug: 'demo-school-abc' },
    update: {},
    create: { name: 'Demo School', slug: 'demo-school-abc', email: 'admin@demo.com', plan: 'premium', status: 'active' }
  });

  // ── Campus ─────────────────────────────────────────────────
  const campus = await prisma.campus.upsert({
    where:  { id: 1 },
    update: {},
    create: { schoolId: school.id, name: 'Main Campus', city: 'Islamabad', isMain: true }
  });

  // ── Admin user ─────────────────────────────────────────────
  const pwHash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.upsert({
    where:  { email_schoolId: { email: 'admin@demo.com', schoolId: school.id } },
    update: {},
    create: {
      schoolId: school.id, campusId: campus.id,
      name: 'Super Admin', email: 'admin@demo.com',
      phone: '03001234567', role: 'admin',
      passwordHash: pwHash, mustChangePassword: false,
      phoneVerifiedAt: new Date(), emailVerifiedAt: new Date()
    }
  });

  // ── Academic session ───────────────────────────────────────
  let session = await prisma.academicSession.findFirst({
    where: { schoolId: school.id, name: '2025-2026' }
  });
  if (!session) {
    session = await prisma.academicSession.create({
      data: { schoolId: school.id, name: '2025-2026', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isActive: true }
    });
  }

  // ── Classes ────────────────────────────────────────────────
  const classNames = ['Nursery','KG','Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10'];
  const classes = [];
  for (let i = 0; i < classNames.length; i++) {
    let cls = await prisma.class.findFirst({ where: { schoolId: school.id, name: classNames[i] } });
    if (!cls) cls = await prisma.class.create({ data: { schoolId: school.id, name: classNames[i], orderNo: i } });
    classes.push(cls);
    // Sections A & B
    for (const sName of ['A', 'B']) {
      const exists = await prisma.section.findFirst({ where: { schoolId: school.id, classId: cls.id, name: sName } });
      if (!exists) await prisma.section.create({ data: { schoolId: school.id, classId: cls.id, name: sName } });
    }
  }

  // ── Subjects for Class 1 ───────────────────────────────────
  const c1 = classes[2];
  for (const sName of ['English','Urdu','Mathematics','Science','Islamiyat','Social Studies']) {
    const ex = await prisma.subject.findFirst({ where: { schoolId: school.id, classId: c1.id, name: sName } });
    if (!ex) await prisma.subject.create({ data: { schoolId: school.id, classId: c1.id, name: sName, totalMarks: 100 } });
  }

  // ── Fee structures ─────────────────────────────────────────
  const fees = [2500,3000,3500,3500,4000,4000,4500,4500,5000,5000,5500,5500];
  for (let i = 0; i < classes.length; i++) {
    const ex = await prisma.feeStructure.findFirst({ where: { schoolId: school.id, classId: classes[i].id } });
    if (!ex) await prisma.feeStructure.create({
      data: { schoolId: school.id, classId: classes[i].id, feeTitle: 'Monthly Fee', amount: fees[i]*100, dueDayOfMonth: 10, lateFeePerDay: 1000 }
    });
  }

  // ── Departments ────────────────────────────────────────────
  const departments = [];
  for (const dName of ['Teaching Staff','Administration','Support Staff']) {
    let dept = await prisma.department.findFirst({ where: { schoolId: school.id, name: dName } });
    if (!dept) dept = await prisma.department.create({ data: { schoolId: school.id, name: dName } });
    departments.push(dept);
  }

  // ── Teachers ───────────────────────────────────────────────
  const tpwHash = await bcrypt.hash('teacher', 12);
  const teachers = [
    { name:'Muhammad Ali Khan', email:'teacher1@demo.com', phone:'03011111111' },
    { name:'Fatima Zafar',      email:'teacher2@demo.com', phone:'03022222222' },
    { name:'Ahmed Hassan',      email:'teacher3@demo.com', phone:'03033333333' },
  ];
  for (const t of teachers) {
    const user = await prisma.user.upsert({
      where:  { email_schoolId: { email: t.email, schoolId: school.id } },
      update: {},
      create: { schoolId: school.id, campusId: campus.id, name: t.name, email: t.email, phone: t.phone, role: 'teacher', passwordHash: tpwHash, phoneVerifiedAt: new Date(), mustChangePassword: true }
    });
    // Safe staff create (skip if userId already exists)
    const staffExists = await prisma.staff.findFirst({ where: { userId: user.id } });
    if (!staffExists) {
      await prisma.staff.create({
        data: { schoolId: school.id, campusId: campus.id, userId: user.id, name: t.name, departmentId: departments[0].id, designation: 'Teacher', joiningDate: new Date('2023-04-01'), basicSalary: 2500000, salaryType: 'monthly' }
      });
    }
  }

  // ── Accountant ─────────────────────────────────────────────
  const acpwHash = await bcrypt.hash('accountant', 12);
  await prisma.user.upsert({
    where:  { email_schoolId: { email: 'accountant@demo.com', schoolId: school.id } },
    update: {},
    create: { schoolId: school.id, campusId: campus.id, name: 'Accountant', email: 'accountant@demo.com', phone: '03044444444', role: 'accountant', passwordHash: acpwHash, phoneVerifiedAt: new Date(), mustChangePassword: true }
  });

  // ── Students ───────────────────────────────────────────────
  const sec1A = await prisma.section.findFirst({ where: { schoolId: school.id, classId: c1.id, name: 'A' } });
  const studentNames = [
    ['Ali Hassan','Zafar Ali'],['Sara Ahmed','Ahmed Khan'],['Bilal Mahmood','Mahmood Raza'],
    ['Ayesha Noor','Noor Ahmed'],['Usman Tariq','Tariq Mehmood'],['Fatima Malik','Malik Zafar'],
    ['Hassan Raza','Raza Hussain'],['Zainab Shah','Shah Faisal'],['Omar Farooq','Farooq Ahmad'],
    ['Hina Baig','Baig Sahib'],
  ];
  for (let i = 0; i < studentNames.length; i++) {
    const [name, father] = studentNames[i];
    const roll = `ST-${String(i+1).padStart(3,'0')}`;
    let student = await prisma.student.findFirst({ where: { schoolId: school.id, rollNo: roll } });
    if (!student) {
      student = await prisma.student.create({
        data: { schoolId: school.id, campusId: campus.id, sessionId: session.id, rollNo: roll, name, fatherName: father, gender: i%2===0?'male':'female', classId: c1.id, sectionId: sec1A.id, status: 'active', admissionDate: new Date('2025-04-01') }
      });
      // Parent
      const parentEmail = `parent${i+1}@demo.com`;
      let parentUser = await prisma.user.findFirst({ where: { email: parentEmail, schoolId: school.id } });
      if (!parentUser) {
        parentUser = await prisma.user.create({ data: { schoolId: school.id, campusId: campus.id, name: father, email: parentEmail, phone: `030500000${i}`, role: 'parent', passwordHash: await bcrypt.hash('parent', 10), phoneVerifiedAt: new Date() } });
      }
      let parentRec = await prisma.parent.findFirst({ where: { schoolId: school.id, userId: parentUser.id } });
      if (!parentRec) {
        parentRec = await prisma.parent.create({ data: { schoolId: school.id, userId: parentUser.id, cnic: `352010000${i}-${i}` } });
      }
      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parentRec.id, studentId: student.id } },
        update: {},
        create: { schoolId: school.id, parentId: parentRec.id, studentId: student.id },
      });
      // Fee invoice
      await prisma.feeInvoice.create({ data: { schoolId: school.id, campusId: campus.id, studentId: student.id, classId: c1.id, feeTitle: 'Monthly Fee Of July', totalAmount: 350000, dueAmount: i<7?0:350000, paidAmount: i<7?350000:0, month: 'July', year: 2025, dueDate: new Date('2025-07-10'), status: i<7?'paid':'unpaid', voucherNo: `JUL-${String(student.id).padStart(4,'0')}-2025` } });
    }
  }

  // ── Expense categories ─────────────────────────────────────
  for (const cName of ['Salaries','Utilities','Repair & Maintenance','Stationery','Events']) {
    const ex = await prisma.expenseCategory.findFirst({ where: { schoolId: school.id, name: cName } });
    if (!ex) await prisma.expenseCategory.create({ data: { schoolId: school.id, name: cName } });
  }
  const cat1 = await prisma.expenseCategory.findFirst({ where: { schoolId: school.id } });
  if (cat1) {
    const expEx = await prisma.expense.findFirst({ where: { schoolId: school.id } });
    if (!expEx) await prisma.expense.create({ data: { schoolId: school.id, campusId: campus.id, categoryId: cat1.id, amount: 5000000, description: 'Monthly utility bills', date: new Date(), addedBy: 1 } });
  }

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Admin:       admin@demo.com / Admin@123');
  console.log('👨‍🏫 Teacher:    teacher1@demo.com / teacher');
  console.log('💰 Accountant: accountant@demo.com / accountant');
  console.log('👨‍👩‍👦 Parent:     parent1@demo.com / parent');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
