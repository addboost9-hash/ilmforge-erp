/**
 * Quick actions — the jobs a school office does every day, one click from
 * the dashboard. The admin picks which ones appear ("Customise"); the choice
 * is remembered per user on this computer.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck, ScanLine, Wallet, UserPlus, BookOpen, Receipt, AlertTriangle,
  Contact, Award, MessageSquare, UserCog, Fingerprint, Banknote, BarChart3,
  Upload, CalendarDays, Megaphone, PenLine, Users, GraduationCap, DoorOpen,
  Library, Bus, TrendingUp, Settings2, Check,
} from 'lucide-react';

/* tone = colour family in dashboard-tokens.css */
export const ACTIONS = [
  { id: 'attendance',   label: 'Mark attendance',   hint: 'Daily class register',       to: '/attendance',                Icon: ClipboardCheck, tone: 'att' },
  { id: 'scan',         label: 'Scan ID cards',     hint: 'QR / barcode check-in',      to: '/attendance/barcode',        Icon: ScanLine,       tone: 'att' },
  { id: 'staff-att',    label: 'Staff attendance',  hint: 'Teachers and staff',         to: '/attendance/staff',          Icon: UserCog,        tone: 'att' },
  { id: 'biometric',    label: 'Fingerprint',       hint: 'Device punches',             to: '/attendance/biometric-attendance', Icon: Fingerprint, tone: 'att' },
  { id: 'collect',      label: 'Collect fee',       hint: 'Take a payment, print receipt', to: '/hub/fees?tab=collect',   Icon: Wallet,         tone: 'fee' },
  { id: 'generate',     label: 'Generate fee',      hint: 'Monthly vouchers',           to: '/hub/fees?tab=generate',     Icon: Receipt,        tone: 'fee' },
  { id: 'defaulters',   label: 'Defaulters',        hint: 'Who still owes',             to: '/fees/defaulters',           Icon: AlertTriangle,  tone: 'fee' },
  { id: 'expense',      label: 'Add expense',       hint: 'Bills, petty cash',          to: '/expenses',                  Icon: Banknote,       tone: 'fee' },
  { id: 'payroll',      label: 'Payroll',           hint: 'Salaries this month',        to: '/payroll',                   Icon: TrendingUp,     tone: 'fee' },
  { id: 'exams',        label: 'Exam Vault',        hint: 'Exams, marks, results',      to: '/examination',               Icon: PenLine,        tone: 'exam' },
  { id: 'homework',     label: 'Homework diary',    hint: "Today's homework",           to: '/homework/diary',            Icon: BookOpen,       tone: 'exam' },
  { id: 'timetable',    label: 'Timetable',         hint: 'Periods and teachers',       to: '/timetable',                 Icon: CalendarDays,   tone: 'exam' },
  { id: 'admission',    label: 'New admission',     hint: 'Admit a student',            to: '/admissions/wizard',         Icon: UserPlus,       tone: 'people' },
  { id: 'students',     label: 'Students',          hint: 'Search any student',         to: '/students',                  Icon: Users,          tone: 'people' },
  { id: 'add-staff',    label: 'Add staff',         hint: 'Teacher or employee',        to: '/staff/new',                 Icon: GraduationCap,  tone: 'people' },
  { id: 'id-cards',     label: 'ID cards',          hint: 'Print student cards',        to: '/id-cards',                  Icon: Contact,        tone: 'people' },
  { id: 'certificates', label: 'Certificates',      hint: 'Leaving, character',         to: '/certificates',              Icon: Award,          tone: 'people' },
  { id: 'gate',         label: 'Gate passes',       hint: 'Early leave, visitors',      to: '/gate-passes',               Icon: DoorOpen,       tone: 'people' },
  { id: 'sms',          label: 'Send SMS',          hint: 'Message parents',            to: '/notifications/sms',         Icon: MessageSquare,  tone: 'comm' },
  { id: 'notice',       label: 'Announcement',      hint: 'Notice to portals',          to: '/announcements',             Icon: Megaphone,      tone: 'comm' },
  { id: 'reports',      label: 'Reports',           hint: 'All school reports',         to: '/reports-hub',               Icon: BarChart3,      tone: 'comm' },
  { id: 'import',       label: 'Import / export',   hint: 'Excel records',              to: '/settings/import-export',    Icon: Upload,         tone: 'admin' },
  { id: 'library',      label: 'Library',           hint: 'Issue and return',           to: '/library',                   Icon: Library,        tone: 'admin' },
  { id: 'transport',    label: 'Transport',         hint: 'Routes and vans',            to: '/transport',                 Icon: Bus,            tone: 'admin' },
];

export const DEFAULT_ACTIONS = [
  'attendance', 'collect', 'exams', 'admission', 'scan', 'generate',
  'defaulters', 'homework', 'staff-att', 'id-cards', 'sms', 'reports',
];

const MAX = 12;
const storeKey = (userId) => `ilm.dash.shortcuts.${userId || 'me'}`;

function loadChoice(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey(userId)) || 'null');
    if (Array.isArray(saved)) {
      const known = saved.filter(id => ACTIONS.some(a => a.id === id));
      if (known.length) return known;
    }
  } catch { /* private window or blocked storage: fall back to defaults */ }
  return DEFAULT_ACTIONS;
}

export default function QuickActions({ userId }) {
  const [chosen, setChosen] = useState(() => loadChoice(userId));
  const [editing, setEditing] = useState(false);

  const save = (next) => {
    setChosen(next);
    try { localStorage.setItem(storeKey(userId), JSON.stringify(next)); } catch { /* not fatal */ }
  };
  const toggle = (id) => {
    if (chosen.includes(id)) {
      if (chosen.length > 1) save(chosen.filter(x => x !== id));
    } else if (chosen.length < MAX) {
      save([...chosen, id]);
    }
  };

  const shown = chosen.map(id => ACTIONS.find(a => a.id === id)).filter(Boolean);

  return (
    <section className="d-panel d-enter d-no-print" aria-labelledby="qa-title" style={{ marginBottom: 14 }}>
      <div className="d-panel-head" style={{ alignItems: 'center' }}>
        <div>
          <h2 id="qa-title" className="d-panel-title">Quick actions</h2>
          <div className="d-panel-sub">
            {editing ? `Tap to add or remove — ${chosen.length} of ${MAX} chosen` : 'The daily jobs, one click away'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing && (
            <button className="d-btn" onClick={() => save(DEFAULT_ACTIONS)}>Reset</button>
          )}
          <button
            className={`d-btn d-no-print ${editing ? 'd-btn-primary' : ''}`}
            onClick={() => setEditing(e => !e)}
            aria-pressed={editing}
          >
            {editing ? <><Check size={14} /> Done</> : <><Settings2 size={14} /> Customise</>}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="d-qa-picker">
          {ACTIONS.map(({ id, label, Icon, tone }) => {
            const on = chosen.includes(id);
            const full = !on && chosen.length >= MAX;
            return (
              <button
                key={id}
                type="button"
                className={`d-qa-pick d-tone-${tone} ${on ? 'is-on' : ''}`}
                onClick={() => toggle(id)}
                disabled={full}
                aria-pressed={on}
                title={full ? `Remove one first — up to ${MAX} shortcuts` : undefined}
              >
                <Icon size={15} />
                {label}
                {on && <Check size={13} className="d-qa-tick" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="d-qa-grid">
          {shown.map(({ id, label, hint, to, Icon, tone }) => (
            <Link key={id} to={to} className={`d-qa d-tone-${tone}`}>
              <span className="d-qa-icon"><Icon size={20} strokeWidth={2} /></span>
              <span className="d-qa-label">{label}</span>
              <span className="d-qa-hint">{hint}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
