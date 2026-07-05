/**
 * WorkflowHub — Complete Student Lifecycle in One Place
 * Admission → Daily Ops → Exams → Promotion → Leaving
 * Ek page, poora cycle — koi alag hub pe jane ki zaroorat nahi
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
    desc: 'Naya student admit karne ka poora process — inquiry se ID card tak',
    steps: [
      {
        icon: Search,
        title: 'Admission Inquiry',
        desc: 'Parent ki inquiry record karo — naam, class, contact. CRM mein lead banao.',
        link: '/admissions/crm',
        label: 'Open CRM',
        tip: 'Inquiry register karna start point hai',
      },
      {
        icon: UserPlus,
        title: 'Student Admit Karo',
        desc: 'Wizard mein poori detail bharo — naam, DOB, class, section, guardian info.',
        link: '/admissions/wizard',
        label: 'Start Wizard',
        tip: 'Sab fields carefully bharo — baad mein ID card aur voucher inhi se banta hai',
      },
      {
        icon: DollarSign,
        title: 'Fee Structure Assign Karo',
        desc: 'Student ki class ka fee structure set karo ya existing structure apply karo.',
        link: '/fees/structure',
        label: 'Fee Structure',
        tip: 'Agar structure already set hai toh seedha voucher generate karo',
      },
      {
        icon: FileText,
        title: 'Pehla Fee Voucher Generate Karo',
        desc: 'Admission fee + first month ka voucher print karo. Parent ko de do.',
        link: '/fees/generate',
        label: 'Generate Voucher',
        tip: 'Voucher mein due date zaroor set karo',
      },
      {
        icon: CreditCard,
        title: 'Student ID Card Issue Karo',
        desc: 'Photo upload karo, ID card print karo aur student ko de do.',
        link: '/students/id-cards',
        label: 'Print ID Card',
        tip: 'ID card attendance aur gate pass ke liye zaroor chahiye',
      },
      {
        icon: Users,
        title: 'Parent Portal Setup Karo',
        desc: 'Parent ko login link bhejo taake woh fees, attendance, results dekh sakein.',
        link: '/portal-management',
        label: 'Setup Portal',
        tip: 'Parent ka phone number/email verify hona chahiye',
      },
      {
        icon: Bell,
        title: 'Welcome SMS Bhejo',
        desc: 'Parent ko welcome message aur school info ka SMS bhejo.',
        link: '/notifications/sms',
        label: 'Send SMS',
        tip: 'Templates use karo — SMS Templates mein already banay hain',
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
    desc: 'Roz ke zaroori kaam — attendance, fees, communication',
    steps: [
      {
        icon: CheckSquare,
        title: 'Attendance Mark Karo',
        desc: 'Subah pehla kaam — attendance. Class-wise ya barcode scan se mark karo.',
        link: '/attendance',
        label: 'Mark Attendance',
        tip: 'Barcode scan fastest tareeqa hai — ek swipe mein ho jaata hai',
      },
      {
        icon: DollarSign,
        title: 'Fees Collect Karo',
        desc: 'Aane wale students ki fees receive karo, receipt print karo.',
        link: '/fees/collect',
        label: 'Collect Fees',
        tip: 'Thermal printer se receipt directly print hogi',
      },
      {
        icon: ClipboardList,
        title: 'Defaulters Check Karo',
        desc: 'Due fees wale students ki list dekho. Reminder SMS bhejo.',
        link: '/fees/defaulters',
        label: 'View Defaulters',
        tip: 'SMS se reminder bhejne ka option directly available hai',
      },
      {
        icon: MessageSquare,
        title: 'Parents Ko Update Karo',
        desc: 'Absent students ke parents ko SMS/WhatsApp bhejo.',
        link: '/notifications/sms',
        label: 'Send Reminders',
        tip: 'Automated SMS attendance ke baad auto-trigger hoti hai agar ON ho',
      },
      {
        icon: BookOpen,
        title: 'Homework / Study Material',
        desc: 'Teachers homework assign karein ya study material upload karein.',
        link: '/homework',
        label: 'Manage Homework',
        tip: 'Parent portal pe directly show hoga',
      },
      {
        icon: Bell,
        title: 'Announcements Karo',
        desc: 'School-wide notice, event, ya holiday announcement sab ko bhejo.',
        link: '/announcements',
        label: 'Post Announcement',
        tip: 'Push notification bhi bhej sakte ho saath mein',
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
    desc: 'Exam schedule banane se result cards tak — poora exam workflow',
    steps: [
      {
        icon: Calendar,
        title: 'Exam Schedule Banao',
        desc: 'Exam create karo — title, class, date range, total marks set karo.',
        link: '/exams',
        label: 'Create Exam',
        tip: 'Ek baar exam create hone ke baad sab classes automatically link ho jaati hain',
      },
      {
        icon: FileText,
        title: 'Exam Timetable Print Karo',
        desc: 'Date sheet banao — subject, date, time, room. Parents ko bhejo.',
        link: '/exams/timetable',
        label: 'Exam Timetable',
        tip: 'Timetable PDF print karo school notice board ke liye',
      },
      {
        icon: Printer,
        title: 'Admit Cards Issue Karo',
        desc: 'Students ke admit cards / exam slips print karo.',
        link: '/exams/exam-slip',
        label: 'Print Admit Cards',
        tip: 'Admit card mein student photo aur roll number automatically aata hai',
      },
      {
        icon: ClipboardList,
        title: 'Marks Enter Karo',
        desc: 'Subject-wise marks darj karo. Teacher portals se bhi enter ho sakta hai.',
        link: '/exams',
        label: 'Enter Marks',
        tip: 'Exam > Enter Marks pe click karo',
      },
      {
        icon: Award,
        title: 'Results Check Karo',
        desc: 'Passing, failing, absent students ki summary. Grade auto-calculate hogi.',
        link: '/exams',
        label: 'View Results',
        tip: 'Results > Print Marksheet se directly print ho jaata hai',
      },
      {
        icon: Star,
        title: 'Merit List Generate Karo',
        desc: 'Class/section ke top performers ki rank list banao.',
        link: '/exams/merit-list',
        label: 'Merit List',
        tip: 'Merit list notice board pe lagao aur parents ko SMS bhejo',
      },
      {
        icon: FileText,
        title: 'Annual Report Cards',
        desc: 'Saal bhar ke sab exams ka cumulative report card print karo.',
        link: '/exams/annual-report',
        label: 'Annual Report Cards',
        tip: 'Annual result ceremony ke liye perfect',
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
    desc: 'Saal ke aakhir mein students ko agle class mein promote karo',
    steps: [
      {
        icon: Award,
        title: 'Final Results Verify Karo',
        desc: 'Sab exams ke marks finalize karo. Failed students ki list check karo.',
        link: '/exams/failed',
        label: 'Failed Students',
        tip: 'Koi mark missing na ho — promotion se pehle verify karo',
      },
      {
        icon: DollarSign,
        title: 'Fee Clearance Check Karo',
        desc: 'Kisi ka bhi outstanding balance nahi hona chahiye promotion se pehle.',
        link: '/fees/defaulters',
        label: 'Check Defaulters',
        tip: 'Defaulters ko clear karwao ya certificate rok lo',
      },
      {
        icon: TrendingUp,
        title: 'Students Promote Karo',
        desc: 'Bulk promotion — sab passed students ko agle class mein shift karo.',
        link: '/students/promote',
        label: 'Promote Students',
        tip: 'Ek baar promote hone ke baad nayi class ka fee structure auto-apply ho sakta hai',
      },
      {
        icon: DollarSign,
        title: 'Nayi Class Fee Structure',
        desc: 'Promoted students ke liye nayi class ka fee structure assign karo.',
        link: '/fees/structure',
        label: 'Update Fees',
        tip: 'Har class ka alag structure set karo pehle se',
      },
      {
        icon: CreditCard,
        title: 'ID Cards Update Karo',
        desc: 'Nayi class ke hisaab se updated ID cards print karo.',
        link: '/students/id-cards',
        label: 'Reprint ID Cards',
        tip: 'Photo update ka option bhi available hai',
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
    desc: 'School chhodne wale student ka complete exit process',
    steps: [
      {
        icon: DollarSign,
        title: 'Fee Clearance Karo',
        desc: 'Student ki saari pending fees clear karwao. Receipt print karo.',
        link: '/fees/defaulters',
        label: 'Clear Dues',
        tip: 'Jab tak fees clear nahi — certificate issue mat karo',
      },
      {
        icon: Shield,
        title: 'Gate Pass Issue Karo',
        desc: 'Final gate pass issue karo — QR code ke saath. Security ko de do.',
        link: '/gate-passes',
        label: 'Issue Gate Pass',
        tip: 'Gatekeeper portal pe scan hoga last exit ke waqt',
      },
      {
        icon: FileText,
        title: 'Leaving Certificate Issue Karo',
        desc: 'Official leaving certificate generate karo with school stamp fields.',
        link: '/certificates',
        label: 'Issue Certificate',
        tip: 'Character certificate bhi saath issue kar sakte ho',
      },
      {
        icon: FileText,
        title: 'Transfer Certificate (TC)',
        desc: 'Agar doosre school mein ja raha hai toh TC issue karo.',
        link: '/certificates',
        label: 'Issue TC',
        tip: 'TC number registry mein record hoga automatically',
      },
      {
        icon: RotateCcw,
        title: 'Alumni Record Mein Add Karo',
        desc: 'Student ko alumni database mein add karo — future reference ke liye.',
        link: '/alumni',
        label: 'Add to Alumni',
        tip: 'Alumni se future donations aur events mein help milti hai',
      },
      {
        icon: LogOut,
        title: 'Student Archive Karo',
        desc: 'Student ko inactive mark karo. Data permanently save rahega.',
        link: '/students',
        label: 'Archive Student',
        tip: 'Delete mat karo — archive karo. Data reports mein use hoga',
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
          <CheckCircle2 size={16} /> Mubarak! {wf.label} cycle mukammal ho gayi ✨
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
              Admission se leaving tak — poora student lifecycle ek jagah. Koi hub nahi badalna padega.
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
