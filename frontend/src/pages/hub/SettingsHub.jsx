/**
 * IlmForge — Settings Hub
 * Sidebar-nav layout with 4 category groups instead of horizontal tab strip.
 * All existing setting component integrations are preserved exactly.
 */
import { lazy, Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings, Palette, School, Globe, Mail, MessageSquare,
  Fingerprint, Printer, CreditCard, Shield, FileText,
  Bell, LayoutGrid, BookOpen, Sliders, Building2,
  Calendar, Layers, Bot, Zap, Users, Key, ClipboardList,
  ChevronRight,
} from 'lucide-react';

/* ── Lazy-loaded setting pages ── */
const SchoolProfile     = lazy(() => import('../settings/SchoolProfilePage'));
const GeneralSettings   = lazy(() => import('../settings/GeneralSettingsPage'));
const SessionsPage      = lazy(() => import('../settings/SessionsPage'));
const CampusesPage      = lazy(() => import('../settings/CampusesPage'));
const AdminsPage        = lazy(() => import('../settings/AdminsPage'));
const SMSTemplates      = lazy(() => import('../settings/SMSTemplatesPage'));
const EmailSettings     = lazy(() => import('../settings/EmailSettingsPage'));
const WhatsAppSettings  = lazy(() => import('../settings/WhatsAppSettingsPage'));
const ThemeSettings     = lazy(() => import('../settings/ThemeSettingsPage'));
const ExamSettings      = lazy(() => import('../settings/ExamSettingsPage'));
const PaymentSettings   = lazy(() => import('../settings/PaymentSettingsPage'));
const BiometricSettings = lazy(() => import('../settings/BiometricSettingsPage'));
const ThermalPrinter    = lazy(() => import('../settings/ThermalPrinterPage'));
const WebsiteSettings   = lazy(() => import('../settings/WebsiteSettingsPage'));
const AutomationPage    = lazy(() => import('../settings/AutomationPage'));
const ProfilePage       = lazy(() => import('../settings/ProfilePage'));
const ClassesPage       = lazy(() => import('../settings/ClassesPage'));
const SubjectsPage      = lazy(() => import('../settings/SubjectsPage'));
const PermissionsMatrix = lazy(() => import('../settings/PermissionsMatrixPage'));
const AuditLogs         = lazy(() => import('../settings/AuditLogsPage'));
const NotificationConfig= lazy(() => import('../settings/NotificationConfigPage'));

const L = (C) => () => (
  <Suspense fallback={<div style={{ padding:'40px 20px', textAlign:'center', color:'#9CA3AF', fontSize:13 }}>Loading…</div>}>
    <C />
  </Suspense>
);

/* ── Category groups & their items ── */
const GROUPS = [
  {
    id: 'school-setup',
    label: 'School Setup',
    icon: School,
    color: '#0F766E',
    items: [
      { id: 'profile',   label: 'School Profile',   icon: School,       hint: 'Logo + basic info',   render: L(SchoolProfile) },
      { id: 'campuses',  label: 'Campuses',          icon: Building2,    hint: 'Multi-branch setup',  render: L(CampusesPage) },
      { id: 'sessions',  label: 'Sessions',          icon: Calendar,     hint: 'Academic years',      render: L(SessionsPage) },
      { id: 'classes',   label: 'Classes',           icon: Layers,       hint: 'Grade management',    render: L(ClassesPage) },
      { id: 'subjects',  label: 'Subjects',          icon: BookOpen,     hint: 'Subject catalogue',   render: L(SubjectsPage) },
      { id: 'general',   label: 'General Settings',  icon: Sliders,      hint: 'Preferences',         render: L(GeneralSettings) },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Globe,
    color: '#7C3AED',
    items: [
      { id: 'email',      label: 'Email',            icon: Mail,          hint: 'SMTP config',         render: L(EmailSettings) },
      { id: 'smstpl',     label: 'SMS Templates',    icon: MessageSquare, hint: 'Auto messages',       render: L(SMSTemplates) },
      { id: 'whatsapp',   label: 'WhatsApp',         icon: Bot,           hint: 'Integration',         render: L(WhatsAppSettings) },
      { id: 'automation', label: 'Automation',       icon: Zap,           hint: 'Auto triggers',       render: L(AutomationPage) },
      { id: 'website',    label: 'Website Settings', icon: Globe,         hint: 'Public pages',        render: L(WebsiteSettings) },
    ],
  },
  {
    id: 'hardware',
    label: 'Hardware',
    icon: Printer,
    color: '#D97706',
    items: [
      { id: 'biometric', label: 'Biometric Devices', icon: Fingerprint,   hint: 'Device setup',        render: L(BiometricSettings) },
      { id: 'thermal',   label: 'Thermal Printer',   icon: Printer,       hint: 'Receipt printer',     render: L(ThermalPrinter) },
      { id: 'payment',   label: 'Payment Settings',  icon: CreditCard,    hint: 'Gateway config',      render: L(PaymentSettings) },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: Shield,
    color: '#DC2626',
    items: [
      { id: 'admins',      label: 'Admins',              icon: Users,          hint: 'Admin accounts',    render: L(AdminsPage) },
      { id: 'permissions', label: 'Permissions Matrix',  icon: Key,            hint: 'Role permissions',  render: L(PermissionsMatrix) },
      { id: 'auditlogs',   label: 'Audit Logs',          icon: ClipboardList,  hint: 'Activity history',  render: L(AuditLogs) },
      { id: 'theme',       label: 'Theme',               icon: Palette,        hint: 'Colors + branding', render: L(ThemeSettings) },
      { id: 'exam',        label: 'Exam Settings',       icon: FileText,       hint: 'Grading rules',     render: L(ExamSettings) },
      { id: 'notifconfig', label: 'Notification Config', icon: Bell,           hint: 'Alert preferences', render: L(NotificationConfig) },
    ],
  },
];

/* Flat list of all items for lookup */
const ALL_ITEMS = GROUPS.flatMap(g => g.items.map(item => ({ ...item, groupId: g.id, groupColor: g.color })));

const ACCENT = '#6c757d';

export default function SettingsHub() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('tab') || ALL_ITEMS[0]?.id;

  const activeItem = useMemo(
    () => ALL_ITEMS.find(i => i.id === activeId) || ALL_ITEMS[0],
    [activeId]
  );

  const go = (id) => setParams({ tab: id }, { replace: false });

  return (
    <div className="hub-shell">

      {/* Hub Header */}
      <div className="hub-header" style={{ borderLeft: `4px solid ${ACCENT}` }}>
        <div>
          <div className="hub-title">
            <Settings size={20} style={{ color: ACCENT }} />
            Settings Hub
          </div>
          <div className="hub-subtitle">
            School profile, sessions, integrations, theme — poori configuration ek jagah
          </div>
        </div>
        <div className="hub-actions">
          <button className="btn btn-primary" onClick={() => go('profile')}>
            <School size={14} /> School Profile
          </button>
          <button className="btn btn-outline" onClick={() => go('theme')}>
            <Palette size={14} /> Theme
          </button>
          <button className="btn btn-outline" onClick={() => go('admins')}>
            <Users size={14} /> Admins
          </button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="content-wrapper" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* LEFT SIDEBAR NAV */}
          <aside style={{
            width: 240, flexShrink: 0,
            background: 'var(--card-bg)',
            borderRadius: 'var(--card-radius)',
            border: 'var(--card-border)',
            boxShadow: 'var(--card-shadow)',
            overflow: 'hidden',
            position: 'sticky', top: 80,
          }}>
            {GROUPS.map((group, gi) => {
              const GroupIcon = group.icon;
              const isGroupActive = group.items.some(i => i.id === activeId);
              return (
                <div key={group.id}>
                  {/* Group Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px 6px',
                    borderTop: gi === 0 ? 'none' : '1px solid var(--border-light)',
                    background: gi === 0 ? 'transparent' : 'var(--surface-2)',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: isGroupActive ? group.color + '22' : 'var(--content-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <GroupIcon size={12} style={{ color: isGroupActive ? group.color : 'var(--text-muted)' }} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: isGroupActive ? group.color : 'var(--text-muted)',
                    }}>
                      {group.label}
                    </span>
                  </div>

                  {/* Group Items */}
                  <div style={{ padding: '2px 8px 6px' }}>
                    {group.items.map(item => {
                      const isActive = item.id === activeId;
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => go(item.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9,
                            width: '100%', padding: '7px 10px',
                            borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
                            background: isActive ? group.color + '15' : 'transparent',
                            borderLeft: isActive ? `3px solid ${group.color}` : '3px solid transparent',
                            transition: 'all .13s', textAlign: 'left',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--content-bg)'; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{
                            width: 26, height: 26, borderRadius: 6,
                            background: isActive ? group.color + '22' : 'var(--content-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'background .12s',
                          }}>
                            <ItemIcon size={13} style={{ color: isActive ? group.color : 'var(--text-muted)' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                              color: isActive ? group.color : 'var(--text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.label}
                            </div>
                            {item.hint && (
                              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
                                {item.hint}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </aside>

          {/* RIGHT CONTENT AREA */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
              marginBottom: 14, paddingLeft: 2,
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Settings</span>
              <ChevronRight size={12} />
              <span style={{ color: activeItem?.groupColor || ACCENT }}>{activeItem?.label}</span>
            </div>

            {/* Active component */}
            <div className="hub-content">
              {activeItem?.render?.()}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
