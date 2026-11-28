/**
 * IlmForge — Dashboard Routes (Optimized)
 * Fixed: N+1 class-stats loop (60+ queries → 4 queries)
 * Fixed: Monthly chart loop (24 sequential → 2 parallel)
 * All stats fetched in parallel with Promise.all
 */
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// GET /api/v1/dashboard/stats
router.get('/stats', wrap(async (req, res) => {
  const { schoolId, campusId } = req;
  const now       = new Date();
  const today     = new Date(now); today.setHours(0,0,0,0);
  const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── 1. Core stats — all in ONE Promise.all ────────────────────────────────
  const [
    totalStudents, maleStudents, femaleStudents, passoutStudents,
    totalStaff, presentStaff, absentStaff,
    unpaidInvoices,
    incomeToday, expenseToday, incomeMonth,
    presentStudentsToday,
    // New admissions this month
    newThisMonth,
    // Recent payments (last 10)
    recentPayments,
    // Recent admissions (last 5)
    recentStudents,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, status: 'active', deletedAt: null } }),
    prisma.student.count({ where: { schoolId, status: 'active', gender: { in: ['Male','male','M'] }, deletedAt: null } }),
    prisma.student.count({ where: { schoolId, status: 'active', gender: { in: ['Female','female','F'] }, deletedAt: null } }),
    prisma.student.count({ where: { schoolId, status: 'passout', deletedAt: null } }),
    prisma.staff.count({ where: { schoolId, isActive: true, deletedAt: null } }),
    prisma.staffAttendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }),
    prisma.staffAttendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'absent' } }),
    prisma.feeInvoice.count({ where: { schoolId, status: { in: ['unpaid', 'partial', 'overdue'] } } }),
    prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { voidedAt: null, schoolId, paymentDate: { gte: today, lt: tomorrow } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { schoolId, date: { gte: today, lt: tomorrow } } }),
    prisma.feePayment.aggregate({ _sum: { amountPaid: true }, where: { voidedAt: null, schoolId, paymentDate: { gte: monthStart, lt: tomorrow } } }),
    prisma.attendance.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }).catch(() => 0),
    prisma.student.count({ where: { schoolId, deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.feePayment.findMany({
      where: { voidedAt: null, schoolId },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      select: {
        id: true, amountPaid: true, paymentDate: true, studentId: true, method: true,
        invoice: { select: { student: { select: { name: true, rollNo: true } } } },
      },
    }).then(payments => payments.map(p => ({
      ...p,
      student: p.invoice?.student || null,
    }))),
    prisma.student.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, rollNo: true, createdAt: true, class: { select: { name: true } } },
    }),
  ]);

  const incomeTodayVal  = incomeToday._sum.amountPaid || 0;
  const expenseTodayVal = expenseToday._sum.amount    || 0;
  const incomeMonthVal  = incomeMonth._sum.amountPaid  || 0;

  // ── 2. Monthly chart — 2 queries (not 24 sequential) ─────────────────────
  const yearAgo = new Date(now); yearAgo.setMonth(yearAgo.getMonth() - 11); yearAgo.setDate(1); yearAgo.setHours(0,0,0,0);

  const [monthlyPayments, monthlyExpenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: { voidedAt: null, schoolId, paymentDate: { gte: yearAgo } },
      select: { amountPaid: true, paymentDate: true },
    }),
    prisma.expense.findMany({
      where: { schoolId, date: { gte: yearAgo } },
      select: { amount: true, date: true },
    }),
  ]);

  // Group by month in JavaScript (fast, no extra queries)
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthMap = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthMap[key] = { month: MONTHS_SHORT[d.getMonth()], income: 0, expense: 0 };
  }
  monthlyPayments.forEach(p => {
    const d = new Date(p.paymentDate);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[k]) monthMap[k].income += p.amountPaid || 0;
  });
  monthlyExpenses.forEach(e => {
    const d = new Date(e.date);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[k]) monthMap[k].expense += e.amount || 0;
  });
  const monthlyChart = Object.values(monthMap);

  // ── 2b. Fee & attendance trend charts — 2 more queries, grouped in JS ────
  const lastYearStart  = new Date(now.getFullYear() - 1, 0, 1);
  const nextYearStart  = new Date(now.getFullYear() + 1, 0, 1);
  const sixMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [feePaymentsTwoYears, attendanceSixMonths] = await Promise.all([
    prisma.feePayment.findMany({
      where: { voidedAt: null, schoolId, paymentDate: { gte: lastYearStart, lt: nextYearStart } },
      select: { amountPaid: true, paymentDate: true },
    }),
    prisma.attendance.findMany({
      where: { schoolId, date: { gte: sixMonthsAgo, lt: tomorrow } },
      select: { date: true, status: true },
    }).catch(() => []),
  ]);

  const monthlyFeeThisYear = Array(12).fill(0);
  const monthlyFeeLastYear = Array(12).fill(0);
  feePaymentsTwoYears.forEach(p => {
    const d = new Date(p.paymentDate);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (y === now.getFullYear())       monthlyFeeThisYear[m] += p.amountPaid || 0;
    else if (y === now.getFullYear() - 1) monthlyFeeLastYear[m] += p.amountPaid || 0;
  });

  const attMonthMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    attMonthMap[key] = { month: MONTHS_SHORT[d.getMonth()], present: 0, absent: 0 };
  }
  (attendanceSixMonths || []).forEach(a => {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!attMonthMap[key]) return;
    if (a.status === 'present') attMonthMap[key].present += 1;
    else if (a.status === 'absent') attMonthMap[key].absent += 1;
  });
  const attendanceTrend = Object.values(attMonthMap);

  // ── 3. Class-wise stats — 3 queries instead of 3N queries ────────────────
  const [classes, studentsByClass, attendanceByClass, feeByClass] = await Promise.all([
    prisma.class.findMany({ where: { schoolId, isActive: true }, orderBy: { orderNo: 'asc' }, select: { id: true, name: true } }),
    prisma.student.groupBy({ by: ['classId'], _count: { id: true }, where: { schoolId, status: 'active', deletedAt: null } }),
    prisma.attendance.groupBy({ by: ['classId'], _count: { id: true }, where: { schoolId, date: { gte: today, lt: tomorrow }, status: 'present' } }).catch(() => []),
    prisma.feeInvoice.groupBy({ by: ['classId'], _sum: { totalAmount: true, paidAmount: true, dueAmount: true }, where: { schoolId } }),
  ]);

  const stuMap  = Object.fromEntries(studentsByClass.map(s => [s.classId, s._count.id]));
  const attMap  = Object.fromEntries((attendanceByClass || []).map(a => [a.classId, a._count.id]));
  const feeMap  = Object.fromEntries(feeByClass.map(f => [f.classId, f._sum]));

  const classStats = classes.map(c => ({
    classId:      c.id,
    className:    c.name,
    strength:     stuMap[c.id]  || 0,
    presentToday: attMap[c.id]  || 0,
    expectedFee:  feeMap[c.id]?.totalAmount || 0,
    paidFee:      feeMap[c.id]?.paidAmount  || 0,
    balanceFee:   feeMap[c.id]?.dueAmount   || 0,
  }));

  // Revalidate: a 30s browser cache meant the dashboard could still show the
  // old totals right after a fee was collected or attendance was marked.
  res.setHeader('Cache-Control', 'private, no-cache');
  // Money is for the office: teachers, parents, students and the gate get the
  // head counts and attendance only (every role used to receive the school's
  // income and expenses and the latest payments with names).
  const money = ['super_admin', 'admin', 'principal', 'accountant'].includes(req.user?.role);
  const noFees = (c) => ({ classId: c.classId, className: c.className, strength: c.strength, presentToday: c.presentToday });
  if (!money) {
    return res.json({
      success: true,
      data: {
        students: { total: totalStudents, male: maleStudents, female: femaleStudents, passout: passoutStudents, presentToday: presentStudentsToday, newThisMonth },
        staff: { total: totalStaff, presentToday: presentStaff, absentToday: absentStaff },
        attendanceTrend,
        classStats: classStats.map(noFees),
      },
    });
  }
  res.json({
    success: true,
    data: {
      students: {
        total: totalStudents, male: maleStudents,
        female: femaleStudents, passout: passoutStudents,
        presentToday: presentStudentsToday,
        newThisMonth,
      },
      staff: { total: totalStaff, presentToday: presentStaff, absentToday: absentStaff },
      finance: {
        unpaidInvoices, incomeToday: incomeTodayVal,
        expenseToday: expenseTodayVal,
        profitToday:  incomeTodayVal - expenseTodayVal,
        incomeThisMonth: incomeMonthVal,
      },
      monthlyChart,
      monthlyFeeThisYear,
      monthlyFeeLastYear,
      attendanceTrend,
      classStats,
      recentPayments,
      recentStudents,
    },
  });
}));

/**
 * GET /api/v1/dashboard/alerts
 * What the bell in the admin header shows: things that arrived and still
 * need someone in the office to act. Read state is kept by the browser
 * (last time the bell was opened), so this only reports what is open.
 */
const ALERT_ROLES = ['super_admin', 'admin', 'principal'];

/* Fingerprint machines that need the office: silent during the school day,
   a clock that is off, punches from people not linked yet, and an
   auto-absent that did not run because the machines were silent. */
const MACHINE_LINK = '/attendance/biometric-attendance';
async function machineAlerts(schoolId) {
  const registry = require('../services/deviceRegistry');
  const { readSettings } = require('../utils/schoolSettings');
  const { dayStart } = require('../services/attendanceMark.service');
  const now = Date.now();
  const pk = new Date(now + 5 * 3600e3);
  const pkMin = pk.getUTCHours() * 60 + pk.getUTCMinutes();
  const schoolHours = pk.getUTCDay() !== 0 && pkMin >= 6 * 60 + 30 && pkMin <= 17 * 60;
  const today = dayStart(new Date());
  const [devices, serials, unknown, lastUnknown, settings] = await Promise.all([
    prisma.biometricDevice.findMany({ where: { schoolId, isActive: true }, select: { id: true, name: true, lastSyncAt: true, kind: true } }),
    registry.serialsOf(schoolId),
    prisma.biometricPunch.count({ where: { schoolId, matched: false, punchTime: { gte: today } } }),
    prisma.biometricPunch.findFirst({ where: { schoolId, matched: false, punchTime: { gte: today } }, orderBy: { punchTime: 'desc' }, select: { punchTime: true } }),
    readSettings(schoolId),
  ]);
  const items = [];
  for (const d of devices) {
    const serial = Object.keys(serials).find((k) => Number(serials[k]) === d.id);
    const st = serial ? registry.statusOf(serial) : null;
    const seen = st?.lastSeen || (d.lastSyncAt ? new Date(d.lastSyncAt).getTime() : 0);
    // Only a ZKTeco calls every few seconds: other makes are heard only when
    // someone punches, and a file machine never calls.
    const calls = !d.kind || d.kind === 'zkteco';
    if (calls && schoolHours && seen && now - seen > 15 * 60e3) {
      items.push({
        type: 'machine', id: `machine-off-${d.id}-${seen}`, title: `${d.name} is not connected`,
        body: `No contact since ${new Date(seen + 5 * 3600e3).toISOString().slice(11, 16)}. Check its power, network cable or Wi-Fi.`,
        at: new Date(seen + 15 * 60e3), link: MACHINE_LINK,
      });
    }
    const off = st?.clockOffsetSec;
    if (off && Math.abs(off) > 300) {
      items.push({
        type: 'machine', id: `machine-clock-${d.id}-${Math.round(off / 300)}`, title: `${d.name}: its clock is about ${Math.round(Math.abs(off) / 60)} min ${off > 0 ? 'slow' : 'fast'}`,
        body: 'Punch times are taken from the machine’s clock. Set it from the machine page (Set clock) or on the machine.', at: new Date(st.clockAt || now), link: MACHINE_LINK,
      });
    }
  }
  if (unknown) {
    items.push({
      type: 'machine', id: `machine-unlinked-${unknown}`, title: `${unknown} punch${unknown === 1 ? '' : 'es'} from people not linked`,
      body: 'Someone on a machine is not linked to a student or staff member. Link them and their punches are marked.',
      at: lastUnknown?.punchTime || new Date(), link: `${MACHINE_LINK}?view=people`,
    });
  }
  const last = settings.autoAbsentLast;
  const pkToday = pk.toISOString().slice(0, 10);
  if (last?.date === pkToday && !last.ok && last.reason) {
    items.push({ type: 'machine', id: `auto-absent-${pkToday}`, title: 'Auto-absent did not run today', body: last.reason, at: new Date(last.at || now), link: `${MACHINE_LINK}?view=rules` });
  }
  return items;
}
const fmtDay = (d) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

router.get('/alerts', wrap(async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-cache');
  if (!ALERT_ROLES.includes(req.user?.role)) {
    return res.json({ success: true, data: { items: [], counts: { admissions: 0, complaints: 0, leaves: 0 } } });
  }
  const schoolId = req.schoolId;
  const vd = require('../services/visitorDesk.service');
  const [admissions, admissionCount, complaints, complaintCount, leaves, leaveCount, urgentVisits, recordUpdates, lastUpdate] = await Promise.all([
    prisma.admissionInquiry.findMany({
      where: { schoolId, status: 'open' }, orderBy: { createdAt: 'desc' }, take: 15,
      select: { id: true, name: true, phone: true, classInterested: true, notes: true, createdAt: true },
    }),
    prisma.admissionInquiry.count({ where: { schoolId, status: 'open' } }),
    prisma.parentComplaint.findMany({
      where: { schoolId, status: 'open' }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, subject: true, createdAt: true },
    }).catch(() => []),
    prisma.parentComplaint.count({ where: { schoolId, status: 'open' } }).catch(() => 0),
    prisma.leaveApplication.findMany({
      where: { schoolId, status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, applicantType: true, applicantId: true, fromDate: true, toDate: true, createdAt: true },
    }).catch(() => []),
    prisma.leaveApplication.count({ where: { schoolId, status: 'pending' } }).catch(() => 0),
    prisma.visitorLog.findMany({
      where: { schoolId, urgent: true, status: 'in', checkoutAt: null, checkinAt: { gte: vd.pkDayStart() } }, orderBy: { checkinAt: 'desc' }, take: 10,
    }).catch(() => []),
    prisma.visitorRecordUpdate.count({ where: { schoolId, status: 'pending' } }).catch(() => 0),
    prisma.visitorRecordUpdate.findFirst({ where: { schoolId, status: 'pending' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).catch(() => null),
  ]);
  const visitViews = urgentVisits.length ? await vd.visitViews(schoolId, urgentVisits, { fullCnic: false, staffNotes: false }) : [];
  const machineItems = await machineAlerts(schoolId).catch(() => []);

  // Names for leave requests (applicantId points at a student or a staff row).
  const ids = (type) => leaves.filter((l) => l.applicantType === type).map((l) => l.applicantId);
  const [students, staff] = await Promise.all([
    ids('student').length ? prisma.student.findMany({ where: { schoolId, id: { in: ids('student') } }, select: { id: true, name: true } }) : [],
    ids('staff').length ? prisma.staff.findMany({ where: { schoolId, id: { in: ids('staff') } }, select: { id: true, name: true } }) : [],
  ]);
  const nameOf = (l) => (l.applicantType === 'staff' ? staff : students).find((p) => p.id === l.applicantId)?.name;

  const items = [
    ...admissions.map((a) => ({
      type: 'admission',
      id: `admission-${a.id}`,
      title: 'New admission application',
      body: [a.name, a.classInterested, a.phone].filter(Boolean).join(' · '),
      online: /^Source: Online admission form/.test(a.notes || ''),
      at: a.createdAt,
      link: '/admissions/inquiries',
    })),
    ...complaints.map((c) => ({
      type: 'complaint', id: `complaint-${c.id}`, title: 'New parent complaint', body: c.subject, at: c.createdAt, link: '/complaints',
    })),
    ...leaves.map((l) => ({
      type: 'leave',
      id: `leave-${l.id}`,
      title: l.applicantType === 'staff' ? 'Staff leave request' : 'Student leave request',
      body: `${nameOf(l) || 'Unknown'} · ${fmtDay(l.fromDate)} – ${fmtDay(l.toDate)}`,
      at: l.createdAt,
      link: '/leaves',
    })),
    ...visitViews.map((v) => ({
      type: 'visitor',
      id: `visitor-${v.id}`,
      title: v.reason === 'early_pickup' ? 'Child being taken early' : 'Safety complaint at the desk',
      body: [v.visitorName, v.students.map((s) => `${s.name} (${s.className})`).join(', '), v.remarks].filter(Boolean).join(' · ').slice(0, 160),
      at: v.checkinAt,
      link: '/visitor-desk?tab=live',
    })),
    ...(recordUpdates ? [{
      type: 'visitor-update',
      id: `visitor-updates-${recordUpdates}`,
      title: 'Parents\' details to approve',
      body: `${recordUpdates} from the Visitor Desk, for children's records`,
      at: lastUpdate?.createdAt || new Date(),
      link: '/visitor-desk?tab=approvals',
    }] : []),
    ...machineItems,
  ].sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 25);

  res.json({
    success: true,
    data: { items, counts: { admissions: admissionCount, complaints: complaintCount, leaves: leaveCount, urgentVisitors: urgentVisits.length, recordUpdates, machines: machineItems.length } },
  });
}));

module.exports = router;
