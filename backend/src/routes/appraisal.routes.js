const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const isAdminRole = (role) => role === 'super_admin' || role === 'admin';
const canApproveRole = (role) => role === 'super_admin' || role === 'admin';
const DUAL_APPROVAL_THRESHOLD_PCT = 10;
const DUAL_APPROVAL_THRESHOLD_AMOUNT = 50000;

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-PK') : '—');

const needsDualApproval = (incrementPercent) => Number(incrementPercent || 0) > DUAL_APPROVAL_THRESHOLD_PCT;
const needsSuperAdminPairApproval = (incrementPercent, incrementAmount) => (
  Number(incrementPercent || 0) > DUAL_APPROVAL_THRESHOLD_PCT
  || Number(incrementAmount || 0) > DUAL_APPROVAL_THRESHOLD_AMOUNT
);

const incrementByScore = (score) => {
  if (score >= 90) return 15;
  if (score >= 85) return 12;
  if (score >= 80) return 10;
  if (score >= 75) return 8;
  if (score >= 70) return 6;
  if (score >= 60) return 4;
  return 0;
};

const recommendationByScore = (score) => {
  if (score >= 90) return 'Promotion fast-track and leadership responsibilities.';
  if (score >= 80) return 'Strong performance; eligible for increment and advanced duties.';
  if (score >= 70) return 'Good standing; continue with mentoring and targeted growth plan.';
  if (score >= 60) return 'Needs improvement plan with monthly review milestones.';
  return 'Performance risk; initiate coaching plan and close follow-up cycle.';
};

router.get('/', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const role = req.user?.role;
  const userId = req.user?.id;
  const { staffId, year, term, status, limit = 100 } = req.query;

  const where = {
    schoolId,
    ...(year && { year: parseInt(year, 10) }),
    ...(term && { term: String(term) }),
    ...(status && { status: String(status) }),
  };

  if (staffId) {
    where.staffId = parseInt(staffId, 10);
  }

  if (!isAdminRole(role)) {
    const ownStaff = await prisma.staff.findFirst({
      where: { schoolId, userId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!ownStaff) return res.json({ success: true, data: [] });
    where.staffId = ownStaff.id;
  }

  const rows = await prisma.staffAppraisal.findMany({
    where,
    include: {
      staff: { select: { id: true, name: true, empCode: true, designation: true } },
    },
    orderBy: [{ year: 'desc' }, { appraisalDate: 'desc' }],
    take: Math.min(parseInt(limit, 10) || 100, 300),
  });

  // Parse criteria from goals field
  const data = rows.map(r => {
    let criteria = [];
    if (r.goals) { try { criteria = JSON.parse(r.goals); } catch { criteria = []; } }
    return { ...r, criteria: Array.isArray(criteria) ? criteria : [] };
  });

  res.json({ success: true, data });
}));

router.get('/summary', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const role = req.user?.role;
  const userId = req.user?.id;
  const thisYear = new Date().getFullYear();

  const where = { schoolId, year: thisYear };

  if (!isAdminRole(role)) {
    const ownStaff = await prisma.staff.findFirst({
      where: { schoolId, userId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!ownStaff) return res.json({ success: true, data: { total: 0, finalized: 0, submitted: 0, draft: 0, avgScore: 0 } });
    where.staffId = ownStaff.id;
  }

  const [total, finalized, submitted, draft, avg] = await Promise.all([
    prisma.staffAppraisal.count({ where }),
    prisma.staffAppraisal.count({ where: { ...where, status: 'finalized' } }),
    prisma.staffAppraisal.count({ where: { ...where, status: 'submitted' } }),
    prisma.staffAppraisal.count({ where: { ...where, status: 'draft' } }),
    prisma.staffAppraisal.aggregate({ where, _avg: { score: true } }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      finalized,
      submitted,
      draft,
      avgScore: Math.round(avg._avg.score || 0),
      year: thisYear,
    },
  });
}));

router.get('/analytics', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const role = req.user?.role;
  const userId = req.user?.id;
  const thisYear = new Date().getFullYear();
  const prevYear = thisYear - 1;

  const where = { schoolId, year: { in: [prevYear, thisYear] } };
  if (!isAdminRole(role)) {
    const ownStaff = await prisma.staff.findFirst({
      where: { schoolId, userId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!ownStaff) {
      return res.json({
        success: true,
        data: { thisYear, prevYear, trend: 'stable', trendDelta: 0, avgScoreThisYear: 0, avgScorePrevYear: 0, topPerformers: [], recommendations: [] },
      });
    }
    where.staffId = ownStaff.id;
  }

  const rows = await prisma.staffAppraisal.findMany({
    where,
    include: {
      staff: { select: { id: true, name: true, empCode: true, designation: true, basicSalary: true } },
      payrollAdjustment: { select: { id: true, status: true, incrementPercent: true, incrementAmount: true } },
    },
    orderBy: [{ year: 'desc' }, { score: 'desc' }, { appraisalDate: 'desc' }],
  });

  const thisYearRows = rows.filter((r) => r.year === thisYear);
  const prevYearRows = rows.filter((r) => r.year === prevYear);

  const avgScoreThisYear = thisYearRows.length
    ? Math.round(thisYearRows.reduce((s, r) => s + Number(r.score || 0), 0) / thisYearRows.length)
    : 0;
  const avgScorePrevYear = prevYearRows.length
    ? Math.round(prevYearRows.reduce((s, r) => s + Number(r.score || 0), 0) / prevYearRows.length)
    : 0;

  const trendDelta = avgScoreThisYear - avgScorePrevYear;
  const trend = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'stable';

  const topPerformers = thisYearRows
    .slice()
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 8)
    .map((r) => ({
      appraisalId: r.id,
      staffId: r.staffId,
      staffName: r.staff?.name || 'Unknown',
      empCode: r.staff?.empCode || null,
      designation: r.staff?.designation || null,
      score: Number(r.score || 0),
      rating: r.rating,
      suggestedIncrementPercent: incrementByScore(Number(r.score || 0)),
      payrollStatus: r.payrollAdjustment?.status || null,
      requiresDualApproval: !!r.payrollAdjustment?.requiresDualApproval,
      approvalStage: Number(r.payrollAdjustment?.approvalStage || 0),
    }));

  const bestByStaff = new Map();
  for (const r of thisYearRows) {
    const prev = bestByStaff.get(r.staffId);
    if (!prev || Number(r.score || 0) > Number(prev.score || 0)) {
      bestByStaff.set(r.staffId, r);
    }
  }

  const recommendations = Array.from(bestByStaff.values())
    .map((r) => {
      const score = Number(r.score || 0);
      const baseSalary = Number(r.staff?.basicSalary || 0);
      const pct = incrementByScore(score);
      const estimatedIncrement = Math.round((baseSalary * pct) / 100);
      return {
        appraisalId: r.id,
        staffId: r.staffId,
        staffName: r.staff?.name || 'Unknown',
        score,
        rating: r.rating,
        suggestedIncrementPercent: pct,
        estimatedIncrement,
        recommendation: recommendationByScore(score),
        payrollStatus: r.payrollAdjustment?.status || null,
        requiresDualApproval: !!r.payrollAdjustment?.requiresDualApproval,
        approvalStage: Number(r.payrollAdjustment?.approvalStage || 0),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  res.json({
    success: true,
    data: {
      thisYear,
      prevYear,
      trend,
      trendDelta,
      avgScoreThisYear,
      avgScorePrevYear,
      topPerformers,
      recommendations,
    },
  });
}));

router.get('/payroll/adjustments', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const rows = await prisma.payrollAdjustment.findMany({
    where: { schoolId },
    include: {
      staff: { select: { id: true, name: true, empCode: true, designation: true } },
      appraisal: { select: { id: true, year: true, term: true, score: true, rating: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });
  const data = rows.map((r) => ({
    ...r,
    requiresSuperAdminPair: needsSuperAdminPairApproval(r.incrementPercent, r.incrementAmount),
  }));
  res.json({ success: true, data });
}));

router.get('/payroll/report.csv', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can download payroll adjustment report.' });
  }

  const schoolId = req.schoolId;
  const { from, to, status } = req.query;

  const where = {
    schoolId,
    ...(status && { status: String(status) }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const rows = await prisma.payrollAdjustment.findMany({
    where,
    include: {
      staff: { select: { name: true, empCode: true, designation: true } },
      appraisal: { select: { year: true, term: true, score: true, rating: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const esc = (v) => {
    const s = String(v ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };

  const header = [
    'Adjustment ID',
    'Staff',
    'Emp Code',
    'Designation',
    'Appraisal Year',
    'Appraisal Term',
    'Score',
    'Rating',
    'Old Basic',
    'New Basic',
    'Increment %',
    'Increment Amount',
    'Requires Dual Approval',
    'Approval Stage',
    'Status',
    'Proposed At',
    'Approved At',
    'Applied At',
    'Rolled Back At',
    'Reason',
    'First Approval Comment',
    'Second Approval Comment',
    'Apply Comment',
    'Rollback Reason',
  ].join(',');

  const lines = rows.map((r) => [
    r.id,
    r.staff?.name || '',
    r.staff?.empCode || '',
    r.staff?.designation || '',
    r.appraisal?.year || '',
    r.appraisal?.term || '',
    r.appraisal?.score || '',
    r.appraisal?.rating || '',
    r.oldBasicSalary,
    r.newBasicSalary,
    r.incrementPercent,
    r.incrementAmount,
    r.requiresDualApproval ? 'yes' : 'no',
    r.approvalStage,
    r.status,
    r.proposedAt?.toISOString() || '',
    r.approvedAt?.toISOString() || '',
    r.appliedAt?.toISOString() || '',
    r.rolledBackAt?.toISOString() || '',
    r.reason || '',
    r.firstApprovalComment || '',
    r.secondApprovalComment || '',
    r.applyComment || '',
    r.rollbackReason || '',
  ].map(esc).join(','));

  const csv = [header, ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-adjustments-${Date.now()}.csv"`);
  res.send(csv);
}));

router.get('/payroll/report.pdf', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can download payroll adjustment report.' });
  }

  const schoolId = req.schoolId;
  const { from, to, status } = req.query;

  const where = {
    schoolId,
    ...(status && { status: String(status) }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const [rows, school] = await Promise.all([
    prisma.payrollAdjustment.findMany({
      where,
      include: {
        staff: { select: { name: true, empCode: true, designation: true } },
        appraisal: { select: { year: true, term: true, score: true, rating: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
    prisma.school.findUnique({ where: { id: schoolId } }),
  ]);

  const totalImpact = rows.reduce((s, r) => s + Number(r.incrementAmount || 0), 0);
  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Payroll Adjustment Compliance Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 18px; color: #1f2937; }
      .top { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
      .title { font-size: 20px; font-weight: 800; color:#0f172a; }
      .muted { color:#64748b; font-size:12px; }
      table { width: 100%; border-collapse: collapse; font-size:11px; margin-top:10px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align:left; }
      th { background:#0f172a; color:#fff; font-weight:700; }
      tr:nth-child(even) { background:#f8fafc; }
      .chip { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; }
      .chip.high { background:#fee2e2; color:#b91c1c; }
      .chip.dual { background:#dbeafe; color:#1d4ed8; }
      .chip.single { background:#dcfce7; color:#166534; }
      @media print { .no-print { display:none; } }
    </style>
  </head>
  <body>
    <div class="top">
      <div>
        <div class="title">Payroll Adjustment Compliance Report</div>
        <div class="muted">${school?.name || 'School'} • Generated ${fmtDateTime(new Date())}</div>
      </div>
      <button class="no-print" onclick="window.print()">Print / Save PDF</button>
    </div>
    <div class="muted">Records: <strong>${rows.length}</strong> • Total Increment Impact: <strong>Rs ${totalImpact.toLocaleString('en-PK')}</strong></div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Staff</th>
          <th>Appraisal</th>
          <th>Old</th>
          <th>New</th>
          <th>Increment</th>
          <th>Policy</th>
          <th>Status</th>
          <th>Proposed</th>
          <th>Approved</th>
          <th>Applied</th>
          <th>Rollback</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => {
          const high = needsSuperAdminPairApproval(r.incrementPercent, r.incrementAmount);
          const policy = high ? '<span class="chip high">Dual super_admin</span>' : r.requiresDualApproval ? '<span class="chip dual">Dual approval</span>' : '<span class="chip single">Single approval</span>';
          return `<tr>
            <td>${r.id}</td>
            <td>${r.staff?.name || ''}${r.staff?.empCode ? ` (${r.staff.empCode})` : ''}</td>
            <td>${r.appraisal?.term || ''} ${r.appraisal?.year || ''} • ${r.appraisal?.score ?? '-'} (${r.appraisal?.rating || '-'})</td>
            <td>Rs ${Number(r.oldBasicSalary || 0).toLocaleString('en-PK')}</td>
            <td>Rs ${Number(r.newBasicSalary || 0).toLocaleString('en-PK')}</td>
            <td>${r.incrementPercent}% / Rs ${Number(r.incrementAmount || 0).toLocaleString('en-PK')}</td>
            <td>${policy}</td>
            <td>${r.status}</td>
            <td>${fmtDateTime(r.proposedAt)}</td>
            <td>${fmtDateTime(r.approvedAt)}</td>
            <td>${fmtDateTime(r.appliedAt)}</td>
            <td>${fmtDateTime(r.rolledBackAt)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </body>
  </html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}));

router.get('/payroll/:adjustmentId/timeline', wrap(async (req, res) => {
  const schoolId = req.schoolId;
  const adjustmentId = parseInt(req.params.adjustmentId, 10);
  const [row, auditEvents] = await Promise.all([
    prisma.payrollAdjustment.findFirst({ where: { id: adjustmentId, schoolId } }),
    prisma.auditLog.findMany({
      where: {
        schoolId,
        resource: 'payroll_adjustment',
        resourceId: adjustmentId,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
  ]);
  if (!row) return res.status(404).json({ success: false, message: 'Adjustment not found.' });

  const userIds = [
    row.proposedBy,
    row.firstApprovedBy,
    row.secondApprovedBy,
    row.approvedBy,
    row.appliedBy,
    row.rolledBackBy,
    ...auditEvents.map((a) => a.userId),
  ]
    .filter(Boolean);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { schoolId, id: { in: userIds } }, select: { id: true, name: true, role: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const events = [];
  const pushEvt = (type, at, actorId, comment, meta = {}) => {
    if (!at) return;
    const actor = actorId ? userMap.get(actorId) : null;
    events.push({
      type,
      at,
      actorId: actorId || null,
      actorName: actor?.name || null,
      actorRole: actor?.role || null,
      comment: comment || null,
      meta,
    });
  };

  pushEvt('proposed', row.proposedAt, row.proposedBy, row.reason, { incrementPercent: row.incrementPercent, incrementAmount: row.incrementAmount });
  pushEvt('first_approved', row.firstApprovedAt, row.firstApprovedBy, row.firstApprovalComment, { approvalStage: 1 });
  pushEvt('second_approved', row.secondApprovedAt, row.secondApprovedBy, row.secondApprovalComment, { approvalStage: 2 });
  pushEvt('approved', row.approvedAt, row.approvedBy, row.secondApprovalComment || row.firstApprovalComment, { approvalStage: row.approvalStage });
  pushEvt('applied', row.appliedAt, row.appliedBy, row.applyComment, { newBasicSalary: row.newBasicSalary });
  pushEvt('rolled_back', row.rolledBackAt, row.rolledBackBy, row.rollbackReason, { restoredBasicSalary: row.oldBasicSalary });

  for (const a of auditEvents) {
    const actor = a.userId ? userMap.get(a.userId) : null;
    events.push({
      type: a.action,
      at: a.createdAt,
      actorId: a.userId || null,
      actorName: actor?.name || null,
      actorRole: actor?.role || null,
      comment: null,
      meta: { source: 'audit' },
    });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  res.json({ success: true, data: events });
}));

router.post('/:id/payroll/propose', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can propose payroll adjustments.' });
  }

  const schoolId = req.schoolId;
  const appraisalId = parseInt(req.params.id, 10);
  const { incrementPercent, reason } = req.body || {};

  const appraisal = await prisma.staffAppraisal.findFirst({
    where: { id: appraisalId, schoolId },
    include: { staff: { select: { id: true, basicSalary: true, name: true } } },
  });
  if (!appraisal) return res.status(404).json({ success: false, message: 'Appraisal not found.' });

  const existing = await prisma.payrollAdjustment.findFirst({ where: { schoolId, appraisalId } });
  if (existing && existing.status !== 'rolled_back' && existing.status !== 'rejected') {
    return res.status(409).json({ success: false, message: 'Payroll adjustment already exists for this appraisal.' });
  }

  const pct = Number.isFinite(Number(incrementPercent))
    ? parseInt(incrementPercent, 10)
    : incrementByScore(Number(appraisal.score || 0));
  const oldBasic = Number(appraisal.staff?.basicSalary || 0);
  const incAmount = Math.round((oldBasic * pct) / 100);
  const newBasic = oldBasic + incAmount;
  const dualApproval = needsDualApproval(pct) || needsSuperAdminPairApproval(pct, incAmount);

  const adjustment = existing
    ? await prisma.payrollAdjustment.update({
      where: { id: existing.id },
      data: {
        oldBasicSalary: oldBasic,
        newBasicSalary: newBasic,
        incrementPercent: pct,
        incrementAmount: incAmount,
        reason: reason || recommendationByScore(Number(appraisal.score || 0)),
        status: 'proposed',
        requiresDualApproval: dualApproval,
        approvalStage: 0,
        proposedBy: req.user?.id,
        proposedAt: new Date(),
        firstApprovedBy: null,
        secondApprovedBy: null,
        approvedBy: null,
        appliedBy: null,
        rolledBackBy: null,
        firstApprovedAt: null,
        secondApprovedAt: null,
        approvedAt: null,
        appliedAt: null,
        rolledBackAt: null,
        rollbackReason: null,
      },
      include: {
        staff: { select: { id: true, name: true, empCode: true } },
        appraisal: { select: { id: true, year: true, term: true, score: true } },
      },
    })
    : await prisma.payrollAdjustment.create({
      data: {
        schoolId,
        appraisalId,
        staffId: appraisal.staffId,
        oldBasicSalary: oldBasic,
        newBasicSalary: newBasic,
        incrementPercent: pct,
        incrementAmount: incAmount,
        reason: reason || recommendationByScore(Number(appraisal.score || 0)),
        status: 'proposed',
        requiresDualApproval: dualApproval,
        approvalStage: 0,
        proposedBy: req.user?.id,
      },
      include: {
        staff: { select: { id: true, name: true, empCode: true } },
        appraisal: { select: { id: true, year: true, term: true, score: true } },
      },
    });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user?.id,
      action: 'propose_payroll_adjustment',
      resource: 'payroll_adjustment',
      resourceId: adjustment.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.status(201).json({ success: true, data: adjustment });
}));

router.post('/payroll/:adjustmentId/approve', wrap(async (req, res) => {
  if (!canApproveRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can approve adjustments.' });
  }

  const schoolId = req.schoolId;
  const adjustmentId = parseInt(req.params.adjustmentId, 10);
  const { comment } = req.body || {};
  const row = await prisma.payrollAdjustment.findFirst({ where: { id: adjustmentId, schoolId } });
  if (!row) return res.status(404).json({ success: false, message: 'Adjustment not found.' });
  if (row.status !== 'proposed') {
    return res.status(400).json({ success: false, message: `Only proposed adjustments can be approved. Current status: ${row.status}` });
  }
  if (row.proposedBy && row.proposedBy === req.user?.id) {
    return res.status(400).json({ success: false, message: 'Approval gate violation: proposer cannot approve the same adjustment.' });
  }

  const dual = !!row.requiresDualApproval;
  const requiresSuperAdminPair = needsSuperAdminPairApproval(row.incrementPercent, row.incrementAmount);

  if (dual && row.approvalStage === 0) {
    if (requiresSuperAdminPair && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: `High-value adjustment requires super_admin first approval (>${DUAL_APPROVAL_THRESHOLD_PCT}% or >Rs ${DUAL_APPROVAL_THRESHOLD_AMOUNT}).`,
      });
    }

    const firstPass = await prisma.payrollAdjustment.update({
      where: { id: adjustmentId },
      data: {
        approvalStage: 1,
        firstApprovedBy: req.user?.id,
        firstApprovedAt: new Date(),
        firstApprovalComment: comment || null,
      },
      include: {
        staff: { select: { id: true, name: true, empCode: true } },
        appraisal: { select: { id: true, year: true, term: true, score: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: req.user?.id,
        action: 'first_approve_payroll_adjustment',
        resource: 'payroll_adjustment',
        resourceId: adjustmentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    return res.json({ success: true, data: firstPass, message: 'First approval complete. Awaiting final approval.' });
  }

  if (dual && row.approvalStage === 1) {
    if (row.firstApprovedBy && row.firstApprovedBy === req.user?.id) {
      return res.status(400).json({ success: false, message: 'Second approval must be by a different approver.' });
    }
    if (requiresSuperAdminPair && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: `High-value adjustment requires super_admin second approval (>${DUAL_APPROVAL_THRESHOLD_PCT}% or >Rs ${DUAL_APPROVAL_THRESHOLD_AMOUNT}).`,
      });
    }

    const secondPass = await prisma.payrollAdjustment.update({
      where: { id: adjustmentId },
      data: {
        approvalStage: 2,
        status: 'approved',
        secondApprovedBy: req.user?.id,
        secondApprovedAt: new Date(),
        secondApprovalComment: comment || null,
        approvedBy: req.user?.id,
        approvedAt: new Date(),
      },
      include: {
        staff: { select: { id: true, name: true, empCode: true } },
        appraisal: { select: { id: true, year: true, term: true, score: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: req.user?.id,
        action: 'second_approve_payroll_adjustment',
        resource: 'payroll_adjustment',
        resourceId: adjustmentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    return res.json({ success: true, data: secondPass, message: 'Final approval complete.' });
  }

  if (dual && row.approvalStage >= 2) {
    return res.status(400).json({ success: false, message: 'Adjustment already fully approved.' });
  }

  const updated = await prisma.payrollAdjustment.update({
    where: { id: adjustmentId },
    data: {
      approvalStage: 2,
      status: 'approved',
      secondApprovalComment: comment || null,
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    },
    include: {
      staff: { select: { id: true, name: true, empCode: true } },
      appraisal: { select: { id: true, year: true, term: true, score: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user?.id,
      action: 'approve_payroll_adjustment',
      resource: 'payroll_adjustment',
      resourceId: adjustmentId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.json({ success: true, data: updated });
}));

router.post('/payroll/:adjustmentId/apply', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can apply adjustments.' });
  }

  const schoolId = req.schoolId;
  const adjustmentId = parseInt(req.params.adjustmentId, 10);
  const { comment } = req.body || {};
  const row = await prisma.payrollAdjustment.findFirst({ where: { id: adjustmentId, schoolId } });
  if (!row) return res.status(404).json({ success: false, message: 'Adjustment not found.' });
  if (row.status !== 'approved') {
    return res.status(400).json({ success: false, message: `Only approved adjustments can be applied. Current status: ${row.status}` });
  }

  const result = await prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findFirst({ where: { id: row.staffId, schoolId, isActive: true, deletedAt: null } });
    if (!staff) throw Object.assign(new Error('Staff not found for adjustment.'), { status: 404 });

    await tx.staff.update({ where: { id: staff.id }, data: { basicSalary: row.newBasicSalary } });

    const updated = await tx.payrollAdjustment.update({
      where: { id: adjustmentId },
      data: { status: 'applied', appliedBy: req.user?.id, appliedAt: new Date(), applyComment: comment || null },
      include: {
        staff: { select: { id: true, name: true, empCode: true, basicSalary: true } },
        appraisal: { select: { id: true, year: true, term: true, score: true } },
      },
    });

    return updated;
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user?.id,
      action: 'apply_payroll_adjustment',
      resource: 'payroll_adjustment',
      resourceId: adjustmentId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.json({ success: true, data: result });
}));

router.post('/payroll/:adjustmentId/rollback', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can rollback adjustments.' });
  }

  const schoolId = req.schoolId;
  const adjustmentId = parseInt(req.params.adjustmentId, 10);
  const { reason } = req.body || {};
  const row = await prisma.payrollAdjustment.findFirst({ where: { id: adjustmentId, schoolId } });
  if (!row) return res.status(404).json({ success: false, message: 'Adjustment not found.' });
  if (row.status !== 'applied') {
    return res.status(400).json({ success: false, message: `Only applied adjustments can be rolled back. Current status: ${row.status}` });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findFirst({ where: { id: row.staffId, schoolId, isActive: true, deletedAt: null } });
    if (!staff) throw Object.assign(new Error('Staff not found for rollback.'), { status: 404 });

    await tx.staff.update({ where: { id: staff.id }, data: { basicSalary: row.oldBasicSalary } });

    const rolled = await tx.payrollAdjustment.update({
      where: { id: adjustmentId },
      data: {
        status: 'rolled_back',
        approvalStage: 0,
        rolledBackBy: req.user?.id,
        rolledBackAt: new Date(),
        rollbackReason: reason || 'Administrative rollback',
      },
      include: {
        staff: { select: { id: true, name: true, empCode: true, basicSalary: true } },
        appraisal: { select: { id: true, year: true, term: true, score: true } },
      },
    });

    return rolled;
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user?.id,
      action: 'rollback_payroll_adjustment',
      resource: 'payroll_adjustment',
      resourceId: adjustmentId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.json({ success: true, data: updated });
}));

router.post('/', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can create appraisals.' });
  }

  const schoolId = req.schoolId;
  const reviewerId = req.user?.id;
  const {
    staffId,
    year,
    term = 'Annual',
    score = 0,
    rating = 'Good',
    strengths,
    improvements,
    goals,
    criteria,
    status = 'draft',
    appraisalDate,
  } = req.body;

  if (!staffId || !year) {
    return res.status(400).json({ success: false, message: 'staffId and year are required.' });
  }

  const staff = await prisma.staff.findFirst({
    where: { id: parseInt(staffId, 10), schoolId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });

  // Store criteria as JSON in goals field
  const goalsValue = criteria && Array.isArray(criteria)
    ? JSON.stringify(criteria)
    : (goals || null);

  const created = await prisma.staffAppraisal.create({
    data: {
      schoolId,
      staffId: parseInt(staffId, 10),
      year: parseInt(year, 10),
      term: String(term),
      score: parseInt(score, 10) || 0,
      rating: String(rating),
      strengths: strengths || null,
      improvements: improvements || null,
      goals: goalsValue,
      status: String(status),
      reviewerId,
      appraisalDate: appraisalDate ? new Date(appraisalDate) : new Date(),
    },
    include: { staff: { select: { id: true, name: true, empCode: true, designation: true } } },
  });

  // Parse criteria back for the response
  let parsedCriteria = criteria || [];
  if (!parsedCriteria.length && created.goals) {
    try { parsedCriteria = JSON.parse(created.goals); } catch { parsedCriteria = []; }
  }

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: reviewerId,
      action: 'create_staff_appraisal',
      resource: 'staff_appraisal',
      resourceId: created.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.status(201).json({ success: true, data: { ...created, criteria: parsedCriteria } });
}));

router.put('/:id', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can update appraisals.' });
  }

  const schoolId = req.schoolId;
  const id = parseInt(req.params.id, 10);
  const {
    score,
    rating,
    strengths,
    improvements,
    goals,
    status,
    appraisalDate,
    term,
    year,
  } = req.body;

  const existing = await prisma.staffAppraisal.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return res.status(404).json({ success: false, message: 'Appraisal not found.' });

  const updated = await prisma.staffAppraisal.update({
    where: { id },
    data: {
      ...(typeof score !== 'undefined' && { score: parseInt(score, 10) || 0 }),
      ...(typeof rating !== 'undefined' && { rating: String(rating) }),
      ...(typeof strengths !== 'undefined' && { strengths: strengths || null }),
      ...(typeof improvements !== 'undefined' && { improvements: improvements || null }),
      ...(typeof goals !== 'undefined' && { goals: goals || null }),
      ...(typeof status !== 'undefined' && { status: String(status) }),
      ...(typeof term !== 'undefined' && { term: String(term) }),
      ...(typeof year !== 'undefined' && { year: parseInt(year, 10) }),
      ...(typeof appraisalDate !== 'undefined' && { appraisalDate: appraisalDate ? new Date(appraisalDate) : new Date() }),
      reviewerId: req.user?.id,
    },
    include: { staff: { select: { id: true, name: true, empCode: true, designation: true } } },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: req.user?.id,
      action: 'update_staff_appraisal',
      resource: 'staff_appraisal',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    },
  });

  res.json({ success: true, data: updated });
}));

// DELETE /:id - delete appraisal
router.delete('/:id', wrap(async (req, res) => {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Only admin can delete appraisals.' });
  }

  const schoolId = req.schoolId;
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.staffAppraisal.findFirst({ where: { id, schoolId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Appraisal not found.' });

  // Delete associated payroll adjustment first (if any)
  await prisma.payrollAdjustment.deleteMany({ where: { appraisalId: id } });
  await prisma.staffAppraisal.delete({ where: { id } });

  res.json({ success: true, message: 'Appraisal deleted.' });
}));

module.exports = router;
