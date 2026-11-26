/**
 * The live feed of the Visitor Desk (admin): who came today, why, for which
 * child, what they said, how long they waited and who wrote them down —
 * newest first, refreshed every few seconds, on the phone too. New entries
 * light up for a moment. compact: the dashboard's short version.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Radio, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { reasonStyle, timeOf, waited } from '../../utils/visitorDesk';

export const FEED_KEY = ['visitor-feed'];
const FILTERS = [
  ['all', 'All'], ['inside', 'Inside now'], ['complaint', 'Complaints'], ['admission', 'Admissions'], ['urgent', 'Urgent'], ['pending', 'At the kiosk'],
];
const dot = (v) => (v.status === 'pending' ? '#F59E0B' : v.status === 'cancelled' ? '#94A3B8' : v.inside ? (v.urgent ? '#DC2626' : '#16A34A') : '#2563EB');

export default function VisitorFeed({ compact = false }) {
  const [filter, setFilter] = useState('all');
  const seen = useRef(null);
  const [fresh, setFresh] = useState(new Set());
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: FEED_KEY,
    queryFn: () => api.get('/visitor-desk/feed', { silent: true }).then((r) => r.data.data),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    staleTime: 5_000,
  });
  const visits = data?.visits || [];
  const c = data?.counts || {};

  // Light up what arrived since the last look.
  useEffect(() => {
    if (!data) return;
    const ids = new Set(visits.map((v) => v.id));
    if (seen.current) {
      const added = visits.filter((v) => !seen.current.has(v.id)).map((v) => v.id);
      if (added.length) {
        setFresh(new Set(added));
        setTimeout(() => setFresh(new Set()), 6000);
      }
    }
    seen.current = ids;
  }, [dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => visits.filter((v) => {
    if (filter === 'all') return v.status !== 'cancelled';
    if (filter === 'inside') return v.inside;
    if (filter === 'urgent') return v.urgent;
    if (filter === 'pending') return v.status === 'pending';
    return v.reason === filter;
  }), [visits, filter]);
  const list = compact ? shown.slice(0, 6) : shown;

  const stat = (n, label, color, f) => (
    <button type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
      style={{ border: `1px solid ${filter === f ? color : '#E2E8F0'}`, background: filter === f ? `${color}12` : '#fff', borderRadius: 10, padding: compact ? '6px 10px' : '8px 12px', textAlign: 'left', cursor: 'pointer', minWidth: compact ? 74 : 96 }}>
      <div style={{ fontSize: compact ? 17 : 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{n ?? 0}</div>
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{label}</div>
    </button>
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <style>{'@keyframes vfIn{from{background:#FEF9C3}to{background:#fff}} @keyframes vfPulse{0%,100%{opacity:1}50%{opacity:.35}}'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio size={17} color="#DC2626" style={{ animation: 'vfPulse 1.6s infinite' }} />
          <strong style={{ fontSize: 15, color: '#0F172A' }}>Visitor Desk — live</strong>
          <span style={{ fontSize: 11.5, color: '#94A3B8' }}>{dataUpdatedAt ? `updated ${timeOf(dataUpdatedAt)}` : ''}</span>
        </div>
        {compact && <Link to="/visitor-desk?tab=live" className="btn btn-outline btn-sm">Open the live feed</Link>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stat(c.today, 'Today', '#0F172A', 'all')}
        {stat(c.inside, 'Inside now', '#16A34A', 'inside')}
        {stat(c.complaints, 'Complaints', '#DC2626', 'complaint')}
        {stat(c.admissions, 'Admissions', '#2563EB', 'admission')}
        {!compact && stat(c.pending, 'At the kiosk', '#D97706', 'pending')}
        {(c.urgent > 0 || !compact) && stat(c.urgent, 'Urgent', '#B91C1C', 'urgent')}
      </div>
      {!compact && c.recordUpdates > 0 && (
        <Link to="/visitor-desk?tab=approvals" style={{ fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '8px 12px', textDecoration: 'none' }}>
          {c.recordUpdates === 1 ? 'One parent\'s details wait' : `${c.recordUpdates} parents' details wait`} for your approval before they go on the children's records →
        </Link>
      )}

      {isLoading && <div style={{ fontSize: 13, color: '#64748B' }}>Loading…</div>}
      {isError && <div style={{ fontSize: 13, color: '#B91C1C' }}>The live feed could not be loaded. It tries again by itself.</div>}
      {!isLoading && !list.length && <div style={{ fontSize: 13, color: '#64748B', padding: '10px 0' }}>{filter === 'all' ? 'Nobody has come in yet today.' : 'Nobody here.'}</div>}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }} aria-label="Visitors today, newest first">
        {list.map((v) => {
          const st = reasonStyle(v.reason);
          return (
            <li key={v.id} style={{ display: 'grid', gridTemplateColumns: compact ? '58px 1fr' : '70px 1fr', gap: 10, padding: '10px 4px', borderBottom: '1px solid #F1F5F9', animation: fresh.has(v.id) ? 'vfIn 6s ease-out' : 'none', borderLeft: v.urgent && v.inside ? '3px solid #DC2626' : '3px solid transparent', paddingLeft: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: dot(v), marginTop: 4, flex: 'none' }} title={v.status === 'pending' ? 'Waiting at the kiosk' : v.inside ? 'Inside' : 'Left'} />
                {timeOf(v.checkinAt)}
              </div>
              <div style={{ minWidth: 0, display: 'grid', gap: 3 }}>
                <div style={{ fontSize: 13.5, color: '#0F172A', lineHeight: 1.4 }}>
                  <strong dir="auto">{v.visitorName}</strong>
                  {v.relationLabel && <span style={{ color: '#64748B' }}> ({v.relationLabel.toLowerCase()})</span>}
                  <span style={{ color: '#94A3B8' }}> · </span>
                  <span style={{ color: st.color, fontWeight: 700 }}>{st.icon} {v.reasonLabel}</span>
                  {v.detailLabel && <span style={{ color: '#475569' }}> › {v.detailLabel}</span>}
                  {v.childName && <span style={{ color: '#475569' }}> · {v.childName}</span>}
                  {v.students.length > 0 && <span style={{ color: '#475569' }}> · {v.students.map((s) => `${s.name}${s.className ? `, ${s.className}` : ''}`).join('; ')}</span>}
                  {v.urgent && v.inside && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: '#fff', background: '#DC2626', borderRadius: 6, padding: '1px 6px' }}><AlertTriangle size={10} style={{ verticalAlign: -1 }} /> URGENT</span>}
                </div>
                {v.remarks && <div dir="auto" style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', overflowWrap: 'anywhere' }}>"{v.remarks}"</div>}
                <div style={{ fontSize: 11.5, color: '#64748B', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>{v.status === 'pending' ? `Waiting at the kiosk ${waited(v.minutes)}` : v.inside ? `Inside ${waited(v.minutes)}` : v.status === 'cancelled' ? 'Cancelled' : `Left at ${timeOf(v.checkoutAt)} (${waited(v.minutes)})`}</span>
                  {v.hostName && <span>To meet: {v.hostName}</span>}
                  {v.recordedByName && <span>Written by: {v.recordedByName}{v.recordedByRole === 'gatekeeper' ? ' (reception)' : ''}</span>}
                  {v.source === 'kiosk' && <span>From the kiosk</span>}
                  {v.source === 'late' && <span>Written later from the paper register</span>}
                  {v.outcomeLabel && <span style={{ fontWeight: 700, color: v.outcome === 'resolved' ? '#15803D' : '#B45309' }}>{v.outcomeLabel}</span>}
                  {v.cnic && <span>CNIC {v.cnic}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {compact && shown.length > list.length && <Link to="/visitor-desk?tab=live" style={{ fontSize: 12.5, fontWeight: 700, color: '#1B2F6E' }}>{shown.length - list.length} more today →</Link>}
    </div>
  );
}
