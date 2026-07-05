/** Communication Hub — SMS, WhatsApp, notices, announcements, email */
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Bell, Smartphone, BellRing, Megaphone, Mail, MessagesSquare, Bot, Radio } from 'lucide-react';

const SMSPage        = lazy(() => import('../notifications/SMSPage'));
const WhatsAppPage   = lazy(() => import('../notifications/WhatsAppPage'));
const Notifications  = lazy(() => import('../notifications/NotificationsPage'));
const Noticeboard    = lazy(() => import('../settings/NoticeboardPage'));
const Announcements  = lazy(() => import('../announcements/AnnouncementsPage'));
const EmailMgmt      = lazy(() => import('../email/EmailManagementPage'));
const RoboBuddyPage  = lazy(() => import('../robobuddy/RoboBuddyPage'));
const ChatPage       = lazy(() => import('../chat/ChatPage'));

const L = (C) => () => (
  <Suspense fallback={<div className="p-10 text-center text-slate-400 text-sm">Loading…</div>}>
    <C />
  </Suspense>
);

const TABS = [
  { id: 'sms',           label: 'SMS',           hint: 'Parents + staff',       icon: Smartphone,    render: L(SMSPage) },
  { id: 'whatsapp',      label: 'WhatsApp',      hint: 'Messages + media',      icon: MessageSquare, render: L(WhatsAppPage) },
  { id: 'notifications', label: 'App Notify',    hint: 'Push notifications',    icon: BellRing,      render: L(Notifications) },
  { id: 'noticeboard',   label: 'Noticeboard',   hint: 'Role-targeted',         icon: Radio,         render: L(Noticeboard) },
  { id: 'announcements', label: 'Announcements', hint: 'Broadcast',             icon: Megaphone,     render: L(Announcements) },
  { id: 'email',         label: 'Email',         hint: 'Alerts + history',      icon: Mail,          render: L(EmailMgmt) },
  { id: 'messenger',     label: 'Messenger 💬',  hint: 'Role-wise chat + docs', icon: MessagesSquare, render: L(ChatPage) },
  { id: 'robobuddy',     label: 'RoboBuddy 🤖🇵🇰', hint: 'WhatsApp bot',        icon: Bot,           render: L(RoboBuddyPage) },
];

const ACCENT = '#00c0ef';

export default function CommunicationHub() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('tab') || TABS[0].id;
  const active = TABS.find(t => t.id === activeId) || TABS[0];
  const go = (id) => setParams({ tab: id }, { replace: false });

  return (
    <div className="hub-shell">

      {/* Hub Header */}
      <div className="hub-header" style={{ borderLeft: `4px solid ${ACCENT}` }}>
        <div>
          <div className="hub-title">
            <Radio size={20} style={{ color: ACCENT }} />
            Communication Hub
          </div>
          <div className="hub-subtitle">
            SMS, WhatsApp, noticeboard, announcements — parents/staff se rabta ek jagah
          </div>
        </div>
        <div className="hub-actions">
          <button className="btn btn-primary" onClick={() => go('sms')}>
            <MessageSquare size={14} /> Send SMS
          </button>
          <button className="btn btn-outline" onClick={() => go('noticeboard')}>
            <Bell size={14} /> Post Notice
          </button>
        </div>
      </div>

      {/* Tab Strip */}
      <div className="tab-strip">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={'tab-btn' + (activeId === tab.id ? ' active' : '')}
            onClick={() => go(tab.id)}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className="content-wrapper" style={{ paddingBottom: 0, paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Communication Hub</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span style={{ color: ACCENT }}>{active.label}</span>
          {active.hint && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>›</span>
              <span>{active.hint}</span>
            </>
          )}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="content-wrapper" style={{ paddingTop: 0 }}>
        <div className="hub-content">
          {active.render()}
        </div>
      </div>

    </div>
  );
}
