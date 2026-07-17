/**
 * SchoolMentorHub — All School Mentor modules in one page
 * Left icon-only sidebar matching School Mentor's layout exactly
 * Teal (#0D9488) color scheme
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, ClipboardList, CheckSquare,
  Calendar, Wallet, BarChart2, Users, Briefcase, Settings,
  TrendingUp, DollarSign, AlertTriangle, UserCheck,
} from 'lucide-react';
import useAuthStore from '../store/auth.store';

// Import existing pages as module components
import ExaminationPage from './exams/ExaminationPage';
import SchoolMentorAcademicsPage from './academics/SchoolMentorAcademicsPage';
import AttendanceHubPage from './attendance/AttendanceHubPage';
import TimetablePage from './timetable/TimetablePage';
import FeeManagementPage from './fees/FeeManagementPage';
import StudentsPage from './students/StudentsPage';
import HumanResourcePage from './hr/HumanResourcePage';
import LaunchSetupPage from './setup/LaunchSetupPage';
import AccountsPage from './accounts/AccountsPage';

/* ── Module definitions ── */
const SM_MODULES = [
  { id: 'dashboard',   label: 'Dashboard',      Icon: LayoutDashboard, section: 'ACADEMICS' },
  { id: 'academics',   label: 'Academics',       Icon: GraduationCap,   section: 'ACADEMICS' },
  { id: 'examination', label: 'Examination',     Icon: ClipboardList,   section: 'ACADEMICS' },
  { id: 'attendance',  label: 'Attendance',      Icon: CheckSquare,     section: 'ACADEMICS' },
  { id: 'timetable',   label: 'Time Table',      Icon: Calendar,        section: 'ACADEMICS' },
  { id: 'fee',         label: 'Fee',             Icon: Wallet,          section: 'ACCOUNTS' },
  { id: 'accounts',    label: 'Accounts',        Icon: BarChart2,       section: 'ACCOUNTS' },
  { id: 'students',    label: 'Students',        Icon: Users,           section: 'ADMINISTRATION' },
  { id: 'hr',          label: 'Human Resource',  Icon: Briefcase,       section: 'ADMINISTRATION' },
  { id: 'setup',       label: 'Launch Setup',    Icon: Settings,        section: 'BASICS' },
];

const SECTIONS = ['ACADEMICS', 'ACCOUNTS', 'ADMINISTRATION', 'BASICS'];

/* ── Dashboard stats component ── */
function DashboardContent() {
  const { school } = useAuthStore();

  const stats = [
    { label: 'Total Students',       value: '1,248', Icon: Users,          color: '#0D9488', sub: '+12 this month' },
    { label: 'Total Staff',          value: '87',    Icon: Briefcase,      color: '#0891b2', sub: '5 on leave' },
    { label: 'Fee Collected Today',  value: 'Rs. 45,200', Icon: DollarSign, color: '#059669', sub: '18 vouchers' },
    { label: 'Pending Fees',         value: 'Rs. 1.2L',   Icon: AlertTriangle, color: '#d97706', sub: '34 defaulters' },
    { label: "Today's Attendance",   value: '94.2%', Icon: UserCheck,      color: '#7c3aed', sub: '1,174 present' },
    { label: 'Active Classes',       value: '42',    Icon: GraduationCap,  color: '#be185d', sub: 'Across 6 grades' },
  ];

  const quickActions = [
    { label: 'Mark Attendance', color: '#0D9488', icon: '✓' },
    { label: 'Collect Fee',     color: '#0891b2', icon: '₨' },
    { label: 'Add Student',     color: '#059669', icon: '+' },
    { label: 'Generate Report', color: '#7c3aed', icon: '📊' },
    { label: 'Send SMS',        color: '#d97706', icon: '✉' },
    { label: 'View Timetable',  color: '#be185d', icon: '📅' },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* School header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D9488 0%, #0891b2 100%)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: '#fff',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {school?.name || 'School Mentor Dashboard'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Academic Year 2025–26 &nbsp;|&nbsp; {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.18)', borderRadius: 10,
          padding: '10px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>SM</div>
          <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: 1 }}>SCHOOL MENTOR</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16, marginBottom: 24,
      }}>
        {stats.map(({ label, value, Icon, color, sub }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: color, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 8, padding: 10,
              }}>
                <Icon size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
            <div style={{ padding: '8px 16px', background: '#f9fafb' }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        background: '#fff', borderRadius: 10, padding: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 14 }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {quickActions.map(({ label, color, icon }) => (
            <button key={label} style={{
              background: color, color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: '#fff', borderRadius: 10, padding: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 14 }}>
          Recent Activity
        </div>
        {[
          { action: 'Fee collected from Ahmed Ali (Class 8-A)', time: '5 min ago', type: 'fee' },
          { action: 'Attendance marked for Class 10-B — 28/30 present', time: '18 min ago', type: 'attendance' },
          { action: 'New student admission: Fatima Khalid (Class 5)', time: '1 hr ago', type: 'student' },
          { action: 'Monthly salary processed for 87 staff members', time: '2 hrs ago', type: 'salary' },
          { action: 'Result cards generated for Grade 9 Mid-Term', time: 'Yesterday', type: 'exam' },
        ].map(({ action, time, type }, i) => {
          const colors = { fee: '#059669', attendance: '#0D9488', student: '#0891b2', salary: '#7c3aed', exam: '#d97706' };
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 0',
              borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: colors[type] || '#0D9488',
                marginTop: 6, flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#374151' }}>{action}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main SchoolMentorHub component ── */
export default function SchoolMentorHub() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const navigate = useNavigate();

  const activeLabel = SM_MODULES.find(m => m.id === activeModule)?.label || 'Dashboard';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif' }}>

      {/* ── Left Sidebar — School Mentor style ── */}
      <div style={{
        width: 64,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Logo area */}
        <div style={{
          width: '100%', padding: '14px 0', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid #f3f4f6', marginBottom: 4,
          background: '#0D9488',
        }}>
          <div style={{
            width: 36, height: 36, background: 'rgba(255,255,255,0.25)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 900 }}>SM</span>
          </div>
        </div>

        {/* Module icons grouped by section */}
        {SECTIONS.map(section => (
          <div key={section} style={{ width: '100%', marginBottom: 2 }}>
            {/* Section label */}
            <div style={{
              fontSize: 7, color: '#9ca3af', textAlign: 'center',
              padding: '6px 2px 2px', letterSpacing: 0.5,
              fontWeight: 700, textTransform: 'uppercase',
            }}>
              {section === 'ADMINISTRATION' ? 'ADMIN' : section}
            </div>

            {/* Icons in this section */}
            {SM_MODULES.filter(m => m.section === section).map(mod => {
              const Icon = mod.Icon;
              const active = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  title={mod.label}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: active ? '#f0fdfa' : 'transparent',
                    cursor: 'pointer',
                    padding: '9px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    borderLeft: active ? '3px solid #0D9488' : '3px solid transparent',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={19} color={active ? '#0D9488' : '#6b7280'} />
                  <span style={{
                    fontSize: 8,
                    color: active ? '#0D9488' : '#9ca3af',
                    fontWeight: active ? 700 : 400,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    maxWidth: 56,
                    overflow: 'hidden',
                  }}>
                    {mod.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}

            {/* Section divider */}
            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 8px' }} />
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div style={{ marginLeft: 64, flex: 1, background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar — School Mentor style */}
        <div style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {/* Left: branding + active module */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34,
              background: '#0D9488',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>SM</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>School Mentor</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>Demo Mode</div>
            </div>
            <div style={{ width: 1, height: 28, background: '#e5e7eb', margin: '0 4px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{activeLabel}</div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{
              padding: '6px 14px',
              background: '#0D9488', color: '#fff',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>▶</span> Tutorial
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '6px 14px',
                background: '#f3f4f6', color: '#374151',
                border: '1px solid #e5e7eb', borderRadius: 6,
                cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}
            >
              ← Back to IlmForge
            </button>
          </div>
        </div>

        {/* Module content */}
        <div style={{ flex: 1 }}>
          {activeModule === 'dashboard'   && <DashboardContent />}
          {activeModule === 'academics'   && <SchoolMentorAcademicsPage />}
          {activeModule === 'examination' && <ExaminationPage />}
          {activeModule === 'attendance'  && <AttendanceHubPage />}
          {activeModule === 'timetable'   && <TimetablePage />}
          {activeModule === 'fee'         && <FeeManagementPage />}
          {activeModule === 'accounts'    && <AccountsPage />}
          {activeModule === 'students'    && <StudentsPage />}
          {activeModule === 'hr'          && <HumanResourcePage />}
          {activeModule === 'setup'       && <LaunchSetupPage />}
        </div>
      </div>
    </div>
  );
}
