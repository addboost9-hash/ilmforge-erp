/**
 * IlmForge — Launch Setup / Basics
 * Guided school setup checklist with progress tracking
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  CheckCircle, AlertCircle, ChevronRight, Rocket, School,
  BookOpen, Users, DollarSign, Calendar, UserCheck,
  ShieldCheck, ArrowRight, RefreshCw
} from 'lucide-react';

const SETUP_STEPS = [
  {
    id: 'school-profile',
    title: 'School Profile',
    desc: 'Set your school name, logo, address & contact info',
    icon: School,
    color: '#1B2F6E',
    to: '/settings',
    check: (data) => !!(data?.school?.name && data?.school?.name !== 'IlmForge School'),
    tip: 'A complete school profile builds trust with parents.',
  },
  {
    id: 'classes',
    title: 'Classes & Sections',
    desc: 'Create classes (Grade 1, 2, 3...) and sections (A, B, C)',
    icon: BookOpen,
    color: '#0d9488',
    to: '/settings/classes',
    check: (data) => (data?.classes?.total || 0) > 0,
    tip: 'You need at least one class before adding students.',
  },
  {
    id: 'subjects',
    title: 'Subjects',
    desc: 'Add the subjects taught in your school',
    icon: BookOpen,
    color: '#6366f1',
    to: '/settings/subjects',
    check: (data) => (data?.subjects?.total || 0) > 0,
    tip: 'Subjects are required for timetable and exam management.',
  },
  {
    id: 'staff',
    title: 'Add Teachers & Staff',
    desc: 'Add your teachers, admin staff and other employees',
    icon: Users,
    color: '#f59e0b',
    to: '/staff/new',
    check: (data) => (data?.staff?.total || 0) > 0,
    tip: 'Staff profiles are needed for attendance and payroll.',
  },
  {
    id: 'fee-structure',
    title: 'Fee Structure',
    desc: 'Define fee amounts for each class and fee type',
    icon: DollarSign,
    color: '#ef4444',
    to: '/fees/structure',
    check: (data) => (data?.feeStructures || 0) > 0,
    tip: 'Fee structure is required to generate and collect fees.',
  },
  {
    id: 'academic-session',
    title: 'Academic Session',
    desc: 'Set up the current academic year (e.g., 2025-2026)',
    icon: Calendar,
    color: '#0073b7',
    to: '/settings/sessions',
    check: (data) => (data?.sessions?.total || 0) > 0,
    tip: 'Academic sessions organize students and records by year.',
  },
  {
    id: 'admin-accounts',
    title: 'Admin Accounts',
    desc: 'Create accounts for accountants, teachers & other admins',
    icon: UserCheck,
    color: '#64748b',
    to: '/settings/admins',
    check: (data) => (data?.admins?.total || 1) > 1,
    tip: 'Additional admin accounts allow role-based access control.',
  },
];

function StepCard({ step, index, isDone, isLoading }) {
  const Icon = step.icon;
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      border: `1px solid ${isDone ? '#bbf7d0' : '#f0f4ff'}`,
      display: 'flex', alignItems: 'center', gap: 16,
      transition: 'transform .12s, box-shadow .12s',
      opacity: isLoading ? 0.6 : 1,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
    >
      {/* Step Number */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: isDone ? '#d1fae5' : step.color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14, color: isDone ? '#065f46' : step.color,
      }}>
        {isDone ? <CheckCircle size={18} color="#0d9488" /> : index + 1}
      </div>

      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: step.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={step.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{step.title}</span>
          {isDone ? (
            <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>DONE</span>
          ) : (
            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>PENDING</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>{step.desc}</div>
        {!isDone && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>{step.tip}</div>}
      </div>

      {/* Action */}
      <Link to={step.to} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: isDone ? '#f0fdf4' : step.color,
        color: isDone ? '#0d9488' : '#fff',
        padding: '8px 14px', borderRadius: 8, textDecoration: 'none',
        fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
        border: isDone ? '1px solid #bbf7d0' : 'none',
      }}>
        {isDone ? 'Review' : 'Setup Now'} <ArrowRight size={13} />
      </Link>
    </div>
  );
}

/* ── Animated progress bar ── */
function AnimatedProgressBar({ progress }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = null;
    const target = progress;
    const duration = 900;
    const step = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const pct = Math.min(elapsed / duration, 1);
      // ease-out
      setDisplayed(Math.round(target * (1 - Math.pow(1 - pct, 3))));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [progress]);
  return (
    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 12, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        height: '100%', borderRadius: 99,
        background: progress === 100 ? '#0d9488' : 'linear-gradient(90deg, #38bdf8, #60a5fa)',
        width: `${displayed}%`, transition: 'width .06s linear',
        boxShadow: progress > 0 ? '0 0 8px rgba(96,165,250,0.6)' : 'none',
      }} />
    </div>
  );
}

export default function LaunchSetupPage() {
  const { data: setupData, isLoading, refetch } = useQuery({
    queryKey: ['launch-setup-status'],
    queryFn: async () => {
      const [school, classes, subjects, staff, feeStructures, sessions, admins] = await Promise.allSettled([
        api.get('/settings/school').then(r => r.data),
        api.get('/settings/classes').then(r => r.data),
        api.get('/subjects').then(r => r.data),
        api.get('/staff/stats').then(r => r.data?.data || r.data),
        api.get('/fees/structures').then(r => r.data),
        api.get('/settings/sessions').then(r => r.data),
        api.get('/settings/admins').then(r => r.data),
      ]);
      const classList  = classes.status === 'fulfilled'       ? (classes.value?.data   || classes.value   || []) : [];
      const subjList   = subjects.status === 'fulfilled'      ? (subjects.value?.data  || subjects.value  || []) : [];
      const sessionList= sessions.status === 'fulfilled'      ? (sessions.value?.data  || sessions.value  || []) : [];
      const feeList    = feeStructures.status === 'fulfilled' ? (feeStructures.value?.data || feeStructures.value || []) : [];
      const adminList  = admins.status === 'fulfilled'        ? (admins.value?.data    || admins.value    || []) : [];
      return {
        school:        school.status === 'fulfilled'   ? school.value   : null,
        classes:       { total: Array.isArray(classList)  ? classList.length  : (classList?.total ?? 0) },
        subjects:      { total: Array.isArray(subjList)   ? subjList.length   : (subjList?.total  ?? 0) },
        staff:         staff.status === 'fulfilled'    ? staff.value    : { total: 0 },
        feeStructures: Array.isArray(feeList) ? feeList.length : (feeList?.total ?? 0),
        sessions:      { total: Array.isArray(sessionList) ? sessionList.length : (sessionList?.total ?? 0) },
        admins:        { total: Array.isArray(adminList) ? adminList.length : (adminList?.total ?? 1) },
      };
    },
    staleTime: 60_000,
    retry: 0,
  });

  const doneCount = SETUP_STEPS.filter(s => s.check(setupData || {})).length;
  const totalCount = SETUP_STEPS.length;
  const remaining = totalCount - doneCount;
  const progress = Math.round((doneCount / totalCount) * 100);
  const estMinutes = remaining * 5;
  const estLabel = remaining === 0
    ? 'All done!'
    : estMinutes >= 60
      ? `~${Math.round(estMinutes / 60)} hour${Math.round(estMinutes / 60) > 1 ? 's' : ''} remaining`
      : `~${estMinutes} minute${estMinutes !== 1 ? 's' : ''} remaining`;

  return (
    <div className="page-content page-animate" style={{ padding: '20px 22px 40px' }}>

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1B2F6E 0%, #2d4a8a 60%, #0073b7 100%)',
        borderRadius: 14, padding: '28px 28px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Rocket size={28} color="#fff" />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Launch Setup</h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, margin: '4px 0 0' }}>
                Complete these steps to get your school fully operational
              </p>
            </div>
          </div>
          <button onClick={() => refetch()} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
            padding: '8px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
          }}>
            <RefreshCw size={13} /> Refresh Status
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>
              Setup {progress}% complete — {doneCount} of {totalCount} steps done
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}>
              {estLabel}
            </span>
          </div>
          <AnimatedProgressBar progress={progress} />
          {progress === 100 ? (
            <div style={{ marginTop: 12, color: '#6ee7b7', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={16} /> Your school is fully set up! All systems go.
            </div>
          ) : (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SETUP_STEPS.map(s => {
                const done = s.check(setupData || {});
                return (
                  <div key={s.id} title={s.title} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: done ? '#6ee7b7' : 'rgba(255,255,255,0.25)',
                    transition: 'background .3s',
                  }} />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary Status Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0d9488' }}>{doneCount}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Steps Completed</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{totalCount - doneCount}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Steps Remaining</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1B2F6E' }}>{progress}%</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Overall Progress</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1B2F6E', margin: '0 0 8px' }}>
          Setup Checklist
        </h2>
        {SETUP_STEPS.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            isDone={step.check(setupData || {})}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Help Box */}
      <div style={{
        background: '#f0f4ff', borderRadius: 12, padding: '18px 20px',
        border: '1px solid #c7d2fe', marginTop: 24,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <ShieldCheck size={28} color="#1B2F6E" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, color: '#1B2F6E', fontSize: 14 }}>Need Help Getting Started?</div>
          <div style={{ fontSize: 13, color: '#4338ca', marginTop: 3 }}>
            Watch our video tutorials or contact support for guided onboarding assistance.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link to="/tutorials" style={{
            background: '#1B2F6E', color: '#fff', padding: '8px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            Tutorials <ChevronRight size={14} />
          </Link>
          <Link to="/support-center" style={{
            background: '#fff', color: '#1B2F6E', padding: '8px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
            border: '1px solid #c7d2fe',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
