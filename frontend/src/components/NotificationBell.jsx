/**
 * The bell in the admin header.
 *
 * It used to show a hard-coded red "3" whatever happened. It now lists what
 * actually needs the office: new admission applications (including ones from
 * the school's online form), parent complaints and leave requests, from
 * GET /dashboard/alerts. The red count is what arrived since this person last
 * opened the bell, remembered per user on this computer. While IlmForge is
 * open, a new application also pops up a short message.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, UserPlus, MessageSquareWarning, CalendarClock, ChevronRight, CheckCheck } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../store/auth.store';

const ALERT_ROLES = ['super_admin', 'admin', 'principal'];
const ICON = { admission: UserPlus, complaint: MessageSquareWarning, leave: CalendarClock };
const TONE = { admission: '#0F766E', complaint: '#DC2626', leave: '#7C3AED' };

const seenKey = (userId) => `ilm.alerts.seen.${userId || 'me'}`;
const readSeen = (userId) => { try { return Number(localStorage.getItem(seenKey(userId))) || 0; } catch { return 0; } };
const writeSeen = (userId, t) => { try { localStorage.setItem(seenKey(userId), String(t)); } catch { /* ignore */ } };

function ago(at) {
  const s = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const allowed = ALERT_ROLES.includes(user?.role);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(() => readSeen(user?.id));
  const wrapRef = useRef(null);
  const known = useRef(null); // ids already shown, so only genuinely new ones pop up

  const { data } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts', { silent: true }).then((r) => r.data.data),
    enabled: allowed,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  const items = data?.items || [];
  const unseen = items.filter((i) => new Date(i.at).getTime() > seenAt);

  // Pop up applications that arrive while the page is open.
  useEffect(() => {
    if (!data) return;
    const ids = new Set(items.map((i) => i.id));
    if (known.current) {
      items
        .filter((i) => !known.current.has(i.id) && i.type === 'admission' && new Date(i.at).getTime() > seenAt)
        .slice(0, 3)
        .forEach((i) => toast(`New admission application: ${i.body}`, { icon: '🎓', id: `alert-${i.id}`, duration: 7000 }));
    }
    known.current = ids;
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markSeen = () => { const t = Date.now(); writeSeen(user?.id, t); setSeenAt(t); };
  const toggle = () => {
    setOpen((o) => !o);
    // Opening the bell counts as having seen what is in it; the list keeps
    // showing open items until someone acts on them.
    if (!open && unseen.length) setTimeout(markSeen, 1200);
  };
  const go = (link) => { setOpen(false); markSeen(); navigate(link); };

  const count = unseen.length;
  const counts = data?.counts || {};

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={count ? `Notifications, ${count} new` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
        style={{
          width: 36, height: 36, borderRadius: 6,
          border: '1px solid #dee2e6', background: open ? '#e8f4fd' : '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#0073b7' : '#666', position: 'relative', transition: 'all .12s',
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px',
            background: '#DC2626', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', lineHeight: 1,
          }}>{count > 9 ? '9+' : count}</span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute', right: 0, top: 44, width: 'min(360px, calc(100vw - 24px))', zIndex: 1200,
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
            boxShadow: '0 16px 40px rgba(15,23,42,.18)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}>
            <strong style={{ fontSize: 14, color: '#1E293B' }}>Notifications</strong>
            {count > 0 && (
              <button type="button" onClick={markSeen} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, color: '#0073b7', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <CheckCheck size={14} /> Mark all as read
              </button>
            )}
          </div>

          {!allowed ? (
            <div style={{ padding: 22, textAlign: 'center', fontSize: 13, color: '#64748B' }}>No notifications for your role.</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 26, textAlign: 'center', fontSize: 13, color: '#64748B' }}>
              <Bell size={22} style={{ opacity: .35, display: 'block', margin: '0 auto 8px' }} />
              Nothing needs attention. New admission applications, complaints and leave requests will appear here.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 380, overflowY: 'auto' }}>
              {items.map((i) => {
                const Icon = ICON[i.type] || Bell;
                const isNew = new Date(i.at).getTime() > seenAt;
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => go(i.link)}
                      style={{
                        width: '100%', display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left',
                        padding: '11px 14px', background: isNew ? '#F0F9FF' : '#fff', border: 0,
                        borderBottom: '1px solid #F1F5F9', cursor: 'pointer', font: 'inherit',
                      }}
                    >
                      <span style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: `${TONE[i.type] || '#475569'}18`, color: TONE[i.type] || '#475569' }}>
                        <Icon size={16} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                          {i.title}
                          {i.online && <span style={{ fontSize: 10, fontWeight: 700, color: '#0F766E', background: '#CCFBF1', borderRadius: 99, padding: '1px 7px' }}>Online form</span>}
                          {isNew && <span aria-label="new" style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />}
                        </span>
                        <span style={{ display: 'block', fontSize: 12.5, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.body}</span>
                        <span style={{ display: 'block', fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{ago(i.at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {allowed && (
            <button type="button" onClick={() => go('/admissions/inquiries')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#F8FAFC', border: 0, borderTop: '1px solid #E2E8F0', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B2F6E' }}>
              Admission inquiries{counts.admissions ? ` (${counts.admissions} open)` : ''}
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
