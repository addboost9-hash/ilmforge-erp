import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

const STATUS_STYLES = {
  implemented: { label: 'Implemented', icon: CheckCircle2, bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' },
  upgrade: { label: 'Needs Upgrade', icon: AlertTriangle, bg: '#FFFBEB', fg: '#B45309', bd: '#FDE68A' },
  missing: { label: 'Missing', icon: XCircle, bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' },
};

const MATRIX = [
  { module: 'Core Platform', feature: 'Cloud-based school operating system', status: 'implemented', notes: 'Web + API architecture already deployed-ready.' },
  { module: 'Core Platform', feature: 'Role-based access control', status: 'implemented', notes: 'Route-level RBAC + role portals are live.' },
  { module: 'Core Platform', feature: 'Data encryption and secure access', status: 'upgrade', notes: 'JWT and secure middleware exist; strengthen with at-rest encryption policy.' },
  { module: 'Core Platform', feature: 'Centralized single dashboard', status: 'implemented', notes: 'Dashboard route and widgets are active.' },
  { module: 'Core Platform', feature: 'Real-time insights and reporting', status: 'upgrade', notes: 'Operational stats exist; expand real-time drilldown coverage.' },
  { module: 'Core Platform', feature: 'Anywhere access on web and mobile', status: 'upgrade', notes: 'Web available; mobile apps are planned, not bundled here.' },
  { module: 'Core Platform', feature: 'Implementation and onboarding support', status: 'implemented', notes: 'Onboarding flow and setup pages are available.' },
  { module: 'Core Platform', feature: 'Dedicated head-office support', status: 'implemented', notes: 'Support center added with escalation channels.' },
  { module: 'Core Platform', feature: 'Built for Pakistani context', status: 'implemented', notes: 'Currency/date/format defaults and schooling workflows align locally.' },
  { module: 'Core Platform', feature: 'Auditability and process standardization', status: 'implemented', notes: 'Audit model + new audit visibility module added.' },

  { module: '6-in-1 Stack', feature: 'School ERP', status: 'implemented', notes: 'All major ERP functional areas available.' },
  { module: '6-in-1 Stack', feature: 'Mobile app suite', status: 'missing', notes: 'Mobile clients not part of this repository.' },
  { module: '6-in-1 Stack', feature: 'Operational manuals (SOPs)', status: 'implemented', notes: 'Manual module exists and is linked in layout.' },
  { module: '6-in-1 Stack', feature: 'Teacher training workshops', status: 'implemented', notes: 'Video tutorials and training section available.' },
  { module: '6-in-1 Stack', feature: 'Mentor AI tools', status: 'implemented', notes: 'AI tools workspace added with 4 tools.' },
  { module: '6-in-1 Stack', feature: 'Head office support', status: 'implemented', notes: 'Support center module added.' },

  { module: 'ERP Modules', feature: 'Academics', status: 'implemented', notes: 'Homework, study materials, online classes, timetable.' },
  { module: 'ERP Modules', feature: 'Examination', status: 'implemented', notes: 'Exam management, marks, results, slips.' },
  { module: 'ERP Modules', feature: 'Paper Generator', status: 'upgrade', notes: 'AI paper drafts supported; full blueprint bank pending.' },
  { module: 'ERP Modules', feature: 'Attendance', status: 'implemented', notes: 'Student/staff attendance + reporting.' },
  { module: 'ERP Modules', feature: 'Time Table', status: 'implemented', notes: 'Class and section schedule module available.' },
  { module: 'ERP Modules', feature: 'Fee', status: 'implemented', notes: 'Structure, invoices, defaulters, collection flows.' },
  { module: 'ERP Modules', feature: 'Accounts', status: 'implemented', notes: 'Accounting/reports/expense blocks available.' },
  { module: 'ERP Modules', feature: 'Inventory/POS', status: 'implemented', notes: 'Products and stock transactions supported.' },
  { module: 'ERP Modules', feature: 'Admission CRM', status: 'implemented', notes: 'Inquiry funnel and admission workflows exist.' },
  { module: 'ERP Modules', feature: 'Students', status: 'implemented', notes: 'Profiles, documents, certificates, role links.' },
  { module: 'ERP Modules', feature: 'Human Resource', status: 'implemented', notes: 'Staff, payroll, leaves and tasking present.' },
  { module: 'ERP Modules', feature: 'Staff Appraisals', status: 'implemented', notes: 'Dedicated appraisal API + management page now active.' },
  { module: 'ERP Modules', feature: 'School SOPs', status: 'implemented', notes: 'Manual center in app.' },
  { module: 'ERP Modules', feature: 'Teacher Trainings', status: 'implemented', notes: 'Tutorial and training sections available.' },
  { module: 'ERP Modules', feature: 'Launch Setup', status: 'implemented', notes: 'Setup and onboarding modules available.' },
  { module: 'ERP Modules', feature: 'Audit Logs', status: 'implemented', notes: 'Backend + new UI viewer available.' },
  { module: 'ERP Modules', feature: 'Settings', status: 'implemented', notes: 'Comprehensive settings menu exists.' },
  { module: 'ERP Modules', feature: 'User Permissions', status: 'implemented', notes: 'Granular role-module action matrix is now active.' },

  { module: 'Communication', feature: 'Parent notifications and updates', status: 'implemented', notes: 'SMS, WhatsApp, announcements integrated.' },
  { module: 'Communication', feature: 'Academic communication flow', status: 'implemented', notes: 'Homework, announcements, results, portals.' },
  { module: 'Communication', feature: 'WhatsApp/direct-call support channels', status: 'implemented', notes: 'Support center quick channel actions available.' },
  { module: 'Communication', feature: 'Parent visibility in portals', status: 'implemented', notes: 'Attendance/homework/notice visibility paths exist.' },

  { module: 'AI', feature: 'AI Chat', status: 'implemented', notes: 'Prompt workspace added.' },
  { module: 'AI', feature: 'AI Lesson Plans', status: 'implemented', notes: 'Lesson planner generator added.' },
  { module: 'AI', feature: 'AI Worksheets', status: 'implemented', notes: 'Worksheet generator added.' },
  { module: 'AI', feature: 'Design Studio', status: 'implemented', notes: 'Design brief generator added.' },

  { module: 'Operations', feature: '100+ manuals coverage', status: 'upgrade', notes: 'Manual framework exists; scale content depth over time.' },
  { module: 'Operations', feature: 'Monthly teacher development workshops', status: 'upgrade', notes: 'Training pages exist; monthly schedule automation pending.' },
  { module: 'Operations', feature: 'Professional onboarding support', status: 'implemented', notes: 'Onboarding setup and guidance are included.' },
  { module: 'Operations', feature: 'Continuous support model', status: 'implemented', notes: 'Support center with escalation stack is active.' },
];

const ROLE_MAP = [
  { role: 'super_admin', home: '/dashboard', modules: 'All modules including audit and user governance.' },
  { role: 'admin', home: '/dashboard', modules: 'Operational control across academics, finance, staff, settings.' },
  { role: 'accountant', home: '/accountant-portal', modules: 'Fee, salary, expenses, loan and reporting finance blocks.' },
  { role: 'teacher', home: '/teacher-portal', modules: 'Attendance, exams, homework, timetable, student-facing academics.' },
  { role: 'parent', home: '/parent-portal', modules: 'Own-child attendance, fee visibility, homework, announcements.' },
  { role: 'student', home: '/student-portal', modules: 'Own attendance, homework, timetable, notices, results.' },
  { role: 'gatekeeper', home: '/gatekeeper-portal', modules: 'Attendance and controlled operational check-in workflows.' },
];

const BACKLOG = [
  { priority: 'P1', item: 'At-rest sensitive field encryption policy', impact: 'Compliance and stronger data protection posture.' },
  { priority: 'P1', item: 'Permission analytics and policy templates', impact: 'Improve governance insights and faster role onboarding.' },
  { priority: 'P2', item: 'Automated appraisal-to-payroll increment execution', impact: 'Converts recommendations into controlled payroll updates.' },
  { priority: 'P1', item: 'Mobile app API contracts and push sync hardening', impact: 'Anywhere access parity with web features.' },
  { priority: 'P2', item: 'Manual content expansion and versioning workflow', impact: 'Standardization depth and training maturity.' },
];

function Pill({ status }) {
  const s = STATUS_STYLES[status];
  const Icon = s.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: s.bg, color: s.fg, border: `1px solid ${s.bd}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
      <Icon size={13} />
      {s.label}
    </span>
  );
}

export default function FeatureMatrixPage() {
  const summary = useMemo(() => {
    const out = { implemented: 0, upgrade: 0, missing: 0 };
    MATRIX.forEach((row) => { out[row.status] += 1; });
    return out;
  }, []);

  return (
    <div className="page-content fade-in" style={{ paddingBottom: 24 }}>
      <div style={{
        background: 'linear-gradient(120deg,#1D4ED8 0%,#0F766E 55%,#EA580C 100%)',
        borderRadius: 16,
        padding: '20px 22px',
        color: '#fff',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Feature Matrix and Upgrade Control Center</div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
          Full benchmark alignment board for ERP, AI, support, governance and stakeholder portals.
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '5px 10px', fontSize: 12 }}>Implemented: {summary.implemented}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '5px 10px', fontSize: 12 }}>Needs Upgrade: {summary.upgrade}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '5px 10px', fontSize: 12 }}>Missing: {summary.missing}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 14 }}>
        <Link to="/mentor-ai" style={{ textDecoration: 'none', color: '#111827' }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>AI suite</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Mentor AI Workspace</div>
            </div>
            <ArrowRight size={16} />
          </div>
        </Link>
        <Link to="/support-center" style={{ textDecoration: 'none', color: '#111827' }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Operations</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Head Office Support</div>
            </div>
            <ArrowRight size={16} />
          </div>
        </Link>
        <Link to="/settings/audit-logs" style={{ textDecoration: 'none', color: '#111827' }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Governance</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Audit Visibility</div>
            </div>
            <ArrowRight size={16} />
          </div>
        </Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', fontWeight: 800, color: '#0F172A' }}>Feature Checklist Matrix</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#334155' }}>Module Area</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#334155' }}>Feature</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#334155' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#334155' }}>Current State</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((r, idx) => (
                <tr key={`${r.module}-${r.feature}`} style={{ borderTop: idx === 0 ? 'none' : '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12.5, color: '#475569', fontWeight: 700 }}>{r.module}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13.5, color: '#0F172A' }}>{r.feature}</td>
                  <td style={{ padding: '10px 12px' }}><Pill status={r.status} /></td>
                  <td style={{ padding: '10px 12px', fontSize: 12.5, color: '#64748B' }}>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', fontWeight: 800 }}>Role-wise Portal Mapping</div>
          <div style={{ padding: 10 }}>
            {ROLE_MAP.map((row) => (
              <div key={row.role} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{row.role}</div>
                  <span style={{ fontSize: 12, color: '#475569' }}>{row.home}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: '#64748B' }}>{row.modules}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', fontWeight: 800 }}>Prioritized Enhancement Backlog</div>
          <div style={{ padding: 10 }}>
            {BACKLOG.map((row) => (
              <div key={row.item} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>{row.item}</div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: row.priority === 'P0' ? '#B91C1C' : row.priority === 'P1' ? '#B45309' : '#0369A1' }}>{row.priority}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: '#64748B' }}>{row.impact}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
