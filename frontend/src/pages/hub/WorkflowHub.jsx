/**
 * WorkflowHub — Complete Student Lifecycle in One Place
 * Admission → Daily Ops → Exams → Promotion → Leaving
 * One page, the whole cycle — no need to jump between separate hubs
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, DollarSign, CreditCard, CheckSquare, Bell,
  Award, FileText, TrendingUp, LogOut, Calendar,
  ChevronRight, CheckCircle2, Circle, ArrowRight,
  ClipboardList, Search, MessageSquare, Printer,
  BookOpen, Users, Shield, Zap, RotateCcw, Star,
} from 'lucide-react';

/* ─── Workflow definitions ─────────────────────────────────────── */

const WORKFLOWS = [
  {
    id: 'admission',
    label: 'New Admission',
    emoji: '🎓',
    color: '#0073b7',
    bg: '#eff6ff',
    border: '#bfdbfe',
    desc: 'The complete process for admitting a new student — from inquiry to ID card',
    steps: [
      {
        icon: Search,
        title: 'Admission Inquiry',
        desc: "Record the parent's inquiry — name, class, contact details. Create a lead in the CRM.",
        link: '/admissions/crm',
        label: 'Open CRM',
        tip: 'Registering the inquiry is the starting point',
      },
      {
        icon: UserPlus,
        title: 'Admit the Student',
        desc: 'Fill in all the details in the wizard — name, date of birth, class, section, and guardian information.',
        link: '/admissions/wizard',
        label: 'Start Wizard',
        tip: 'Fill in every field carefully — the ID card and fee voucher are generated from this data later',
      },
      {
        icon: DollarSign,
        title: 'Assign a Fee Structure',
        desc: "Set up the fee structure for the student's class, or apply an existing one.",
        link: '/fees/structure',
        label: 'Fee Structure',
        tip: 'If the structure is already set up, go straight to generating the voucher',
      },
      {
        icon: FileText,
        title: 'Generate the First Fee Voucher',
        desc: 'Print the voucher for the admission fee plus the first month, and hand it to the parent.',
        link: '/fees/generate',
        label: 'Generate Voucher',
        tip: 'Make sure to set a due date on the voucher',
      },
      {
        icon: CreditCard,
        title: 'Issue the Student ID Card',
        desc: 'Upload the photo, print the ID card, and hand it to the student.',
        link: '/students/id-cards',
        label: 'Print ID Card',
        tip: 'The ID card is required for attendance and gate pass checks',
      },
      {
        icon: Users,
        title: 'Set Up the Parent Portal',
        desc: 'Send the parent a login link so they can view fees, attendance, and results.',
        link: '/portal-management',
        label: 'Setup Portal',
        tip: "Make sure the parent's phone number or email is verified",
      },
      {
        icon: Bell,
        title: 'Send a Welcome SMS',
        desc: "Send the parent a welcome message with the school's key information.",
        link: '/notifications/sms',
        label: 'Send SMS',
        tip: 'Use a template — ready-made ones are already available under SMS Templates',
      },
    ],
  },
  {
    id: 'daily',
    label: 'Daily Routine',
    emoji: '📅',
    color: '#10b981',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    desc: 'The essential daily tasks — attendance, fees, and communication',
    steps: [
      {
        icon: CheckSquare,
        title: 'Mark Attendance',
        desc: 'The first task of the morning — mark attendance by class or with a barcode scan.',
        link: '/attendance',
        label: 'Mark Attendance',
        tip: 'Barcode scanning is the fastest way — done in a single swipe',
      },
      {
        icon: DollarSign,
        title: 'Collect Fees',
        desc: 'Collect fees from students as they arrive and print a receipt.',
        link: '/fees/collect',
        label: 'Collect Fees',
        tip: 'Receipts print directly from a thermal printer',
      },
      {
        icon: ClipboardList,
        title: 'Check for Defaulters',
        desc: 'Review the list of students with outstanding fees and send reminder SMS messages.',
        link: '/fees/defaulters',
        label: 'View Defaulters',
        tip: 'You can send reminders by SMS directly from this screen',
      },
      {
        icon: MessageSquare,
        title: 'Update Parents',
        desc: 'Send SMS or WhatsApp messages to the parents of absent students.',
        link: '/notifications/sms',
        label: 'Send Reminders',
        tip: 'If enabled, automated SMS messages are triggered automatically right after attendance',
      },
      {
        icon: BookOpen,
        title: 'Homework / Study Material',
        desc: 'Have teachers assign homework or upload study material.',
        link: '/homework',
        label: 'Manage Homework',
        tip: 'This appears directly on the parent portal',
      },
      {
        icon: Bell,
        title: 'Post Announcements',
        desc: 'Send school-wide notices, event updates, or holiday announcements to everyone.',
        link: '/announcements',
        label: 'Post Announcement',
        tip: 'You can also send a push notification alongside it',
      },
    ],
  },
  {
    id: 'exams',
    label: 'Exam Cycle',
    emoji: '📝',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    desc: 'The full exam workflow — from scheduling exams to result cards',
    steps: [
      {
        icon: Calendar,
        title: 'Create the Exam Schedule',
        desc: 'Create the exam — set the title, class, date range, and total marks.',
        link: '/exams',
        label: 'Create Exam',
        tip: 'Once the exam is created, all classes are linked to it automatically',
      },
      {
        icon: FileText,
        title: 'Print the Exam Timetable',
        desc: 'Create the date sheet — subject, date, time, room — and share it with parents.',
        link: '/exams/timetable',
        label: 'Exam Timetable',
        tip: 'Print the timetable as a PDF for the school notice board',
      },
      {
        icon: Printer,
        title: 'Issue Admit Cards',
        desc: 'Print admit cards / exam slips for students.',
        link: '/exams/exam-slip',
        label: 'Print Admit Cards',
        tip: "The student's photo and roll number are added to the admit card automatically",
      },
      {
        icon: ClipboardList,
        title: 'Enter Marks',
        desc: 'Enter marks subject by subject — teachers can also enter them from their portals.',
        link: '/exams',
        label: 'Enter Marks',
        tip: 'Go to Exam > Enter Marks',
      },
      {
        icon: Award,
        title: 'Check Results',
        desc: 'See a summary of passing, failing, and absent students — grades are calculated automatically.',
        link: '/exams',
        label: 'View Results',
        tip: 'Print directly from Results > Print Marksheet',
      },
      {
        icon: Star,
        title: 'Generate the Merit List',
        desc: 'Build a ranked list of top performers by class or section.',
        link: '/exams/merit-list',
        label: 'Merit List',
        tip: 'Post the merit list on the notice board and notify parents by SMS',
      },
      {
        icon: FileText,
        title: 'Annual Report Cards',
        desc: 'Print a cumulative report card covering all exams held during the year.',
        link: '/exams/annual-report',
        label: 'Annual Report Cards',
        tip: 'Perfect for the annual results ceremony',
      },
    ],
  },
  {
    id: 'promotion',
    label: 'Class Promotion',
    emoji: '⬆️',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    desc: 'Promote students to the next class at the end of the year',
    steps: [
      {
        icon: Award,
        title: 'Verify Final Results',
        desc: 'Finalize marks across all exams and review the list of failed students.',
        link: '/exams/failed',
        label: 'Failed Students',
        tip: 'Make sure no marks are missing — verify everything before promotion',
      },
      {
        icon: DollarSign,
        title: 'Check Fee Clearance',
        desc: 'No student should have an outstanding balance before promotion.',
        link: '/fees/defaulters',
        label: 'Check Defaulters',
        tip: 'Have defaulters clear their dues, or hold their certificates',
      },
      {
        icon: TrendingUp,
        title: 'Promote Students',
        desc: 'Bulk promotion — move all passed students up to the next class.',
        link: '/students/promote',
        label: 'Promote Students',
        tip: "Once promoted, the new class's fee structure can be applied automatically",
      },
      {
        icon: DollarSign,
        title: 'New Class Fee Structure',
        desc: "Assign the new class's fee structure to promoted students.",
        link: '/fees/structure',
        label: 'Update Fees',
        tip: 'Set up a separate structure for each class ahead of time',
      },
      {
        icon: CreditCard,
        title: 'Update ID Cards',
        desc: 'Print updated ID cards reflecting the new class.',
        link: '/students/id-cards',
        label: 'Reprint ID Cards',
        tip: "You can also update the student's photo while you're at it",
      },
    ],
  },
  {
    id: 'leaving',
    label: 'Student Leaving',
    emoji: '🎓',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    desc: 'The complete exit process for a student leaving the school',
    steps: [
      {
        icon: DollarSign,
        title: 'Clear Outstanding Fees',
        desc: "Settle all of the student's pending fees and print a receipt.",
        link: '/fees/defaulters',
        label: 'Clear Dues',
        tip: 'Do not issue a certificate until fees are fully cleared',
      },
      {
        icon: Shield,
        title: 'Issue a Gate Pass',
        desc: 'Issue a final gate pass with a QR code and hand it to security.',
        link: '/gate-passes',
        label: 'Issue Gate Pass',
        tip: 'It will be scanned on the gatekeeper portal at final exit',
      },
      {
        icon: FileText,
        title: 'Issue the Leaving Certificate',
        desc: 'Generate the official leaving certificate, including fields for the school stamp.',
        link: '/certificates',
        label: 'Issue Certificate',
        tip: 'You can issue a character certificate alongside it',
      },
      {
        icon: FileText,
        title: 'Transfer Certificate (TC)',
        desc: 'Issue a Transfer Certificate if the student is moving to another school.',
        link: '/certificates',
        label: 'Issue TC',
        tip: 'The TC number is recorded in the registry automatically',
      },
      {
        icon: RotateCcw,
        title: 'Add to Alumni Records',
        desc: 'Add the student to the alumni database for future reference.',
        link: '/alumni',
        label: 'Add to Alumni',
        tip: 'Alumni connections help with future donations and events',
      },
      {
        icon: LogOut,
        title: 'Archive the Student',
        desc: 'Mark the student as inactive — their data will be preserved permanently.',
        link: '/students',
        label: 'Archive Student',
        tip: "Don't delete the record — archive it instead. The data will still be used in reports",
      },
    ],
  },
];

/* ─── Step Card ──────────────────────────────────────────────────── */
function StepCard({ step, index, color, active, onToggle, done }) {
  const Icon = step.icon;
  return (
    <div
      style={{
        display: 'flex', gap: 14, padding: '14px 16px',
        background: done ? '#f0fdf4' : active ? '#fafbff' : 'white',
        border: `1px solid ${done ? '#86efac' : active ? color + '40' : '#e2e8f0'}`,
        borderRadius: 10, cursor: 'pointer', transition: 'all .18s',
        borderLeft: `3px solid ${done ? '#22c55e' : active ? color : '#e2e8f0'}`,
      }}
      onClick={onToggle}
    >
      {/* Step number / check */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#22c55e' : active ? color : '#f1f5f9',
        color: done || active ? 'white' : '#94a3b8',
        fontWeight: 800, fontSize: 13, transition: 'all .2s',
      }}>
        {done ? <CheckCircle2 size={16} /> : active ? <Icon size={15} /> : index + 1}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: done ? '#15803d' : '#1e3a5f' }}>
            {step.title}
          </div>
          {done && <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '1px 8px', borderRadius: 99 }}>Done ✓</span>}
        </div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3, lineHeight: 1.6 }}>{step.desc}</div>

        {/* Tip box */}
        {active && (
          <div style={{ marginTop: 8, padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11.5, color: '#92400e', display: 'flex', gap: 5 }}>
            <Zap size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Tip:</strong> {step.tip}</span>
          </div>
        )}

        {/* Action button */}
        {active && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              to={step.link}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 700,
                background: color, color: 'white', textDecoration: 'none',
                boxShadow: `0 2px 8px ${color}40`, transition: 'opacity .15s',
              }}
              onClick={e => e.stopPropagation()}
            >
              {step.label} <ArrowRight size={12} />
            </Link>
            <button
              style={{ fontSize: 12, color: '#10b981', fontWeight: 600, background: 'none', border: '1px solid #86efac', padding: '5px 12px', borderRadius: 6, cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onToggle('done'); }}
            >
              Mark Done ✓
            </button>
          </div>
        )}
      </div>

      {/* Expand arrow */}
      <div style={{ color: '#cbd5e1', flexShrink: 0, alignSelf: 'center', transform: active ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
        <ChevronRight size={16} />
      </div>
    </div>
  );
}

/* ─── Workflow Section ───────────────────────────────────────────── */
function WorkflowSection({ wf }) {
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState(new Set());

  const toggle = (i, action) => {
    if (action === 'done') {
      setDoneSteps(prev => { const s = new Set(prev); s.add(i); return s; });
      if (i + 1 < wf.steps.length) setActiveStep(i + 1);
    } else {
      setActiveStep(prev => prev === i ? -1 : i);
    }
  };

  const progress = doneSteps.size;
  const total = wf.steps.length;
  const pct = Math.round((progress / total) * 100);

  return (
    <div style={{ background: wf.bg, border: `1px solid ${wf.border}`, borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: wf.color, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{wf.emoji}</span>
            {wf.label}
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>{wf.desc}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: pct === 100 ? '#22c55e' : wf.color }}>{pct}%</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{progress}/{total} steps</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : wf.color, borderRadius: 99, transition: 'width .4s ease' }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {wf.steps.map((step, i) => (
          <StepCard
            key={i}
            step={step}
            index={i}
            color={wf.color}
            active={activeStep === i}
            done={doneSteps.has(i)}
            onToggle={(action) => toggle(i, action)}
          />
        ))}
      </div>

      {/* Completion message */}
      {pct === 100 && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#15803d' }}>
          <CheckCircle2 size={16} /> Nice work! The {wf.label} cycle is complete ✨
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function WorkflowHub() {
  const [active, setActive] = useState('admission');

  return (
    <div className="page-content fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 20, padding: '20px 22px', background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 100%)', borderRadius: 12, color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            🔄
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Smart Workflow Hub</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>
              From admission to leaving — the entire student lifecycle in one place. No need to switch between hubs.
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {WORKFLOWS.map(wf => (
          <button
            key={wf.id}
            onClick={() => setActive(wf.id)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: `2px solid ${active === wf.id ? wf.color : '#e2e8f0'}`,
              background: active === wf.id ? wf.color : 'white',
              color: active === wf.id ? 'white' : '#475569',
              cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>{wf.emoji}</span> {wf.label}
          </button>
        ))}
      </div>

      {/* Active Workflow */}
      {WORKFLOWS.filter(wf => wf.id === active).map(wf => (
        <WorkflowSection key={wf.id} wf={wf} />
      ))}

      {/* Bottom quick links */}
      <div style={{ marginTop: 20, padding: '16px 18px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginRight: 4 }}>QUICK JUMP:</span>
        {[
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/hub/students', label: 'Students Hub' },
          { to: '/hub/fees', label: 'Fees Hub' },
          { to: '/hub/exams', label: 'Exams Hub' },
          { to: '/hub/attendance', label: 'Attendance Hub' },
          { to: '/hub/communication', label: 'Communication Hub' },
        ].map(l => (
          <Link key={l.to} to={l.to}
            style={{ fontSize: 12, color: '#0073b7', textDecoration: 'none', fontWeight: 600, padding: '4px 10px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', gap: 4 }}>
            {l.label} <ChevronRight size={11} />
          </Link>
        ))}
      </div>
    </div>
  );
}
