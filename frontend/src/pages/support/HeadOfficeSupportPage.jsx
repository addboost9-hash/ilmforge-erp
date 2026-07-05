import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LifeBuoy, PhoneCall, MessageCircle, HelpCircle, Clock3, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../api/client';

function Card({ title, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${color}55`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748B' }}>{title}</div>
      <div style={{ marginTop: 2, fontSize: 22, fontWeight: 900, color }}>{value}</div>
      {sub && <div style={{ marginTop: 2, fontSize: 12, color: '#64748B' }}>{sub}</div>}
    </div>
  );
}

export default function HeadOfficeSupportPage() {
  const { data: complaints = [] } = useQuery({
    queryKey: ['support-complaints'],
    queryFn: () => api.get('/complaints').then((r) => r.data.data || []),
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const open = complaints.filter((c) => c.status === 'open').length;
    const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    return { open, inProgress, resolved, total: complaints.length };
  }, [complaints]);

  return (
    <div className="page-content fade-in" style={{ paddingBottom: 24 }}>
      <div style={{
        background: 'linear-gradient(120deg,#0B3B7A 0%,#0284C7 50%,#059669 100%)',
        borderRadius: 16,
        color: '#fff',
        padding: '20px 22px',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LifeBuoy size={20} />
          <div style={{ fontSize: 22, fontWeight: 900 }}>Head Office Support Center</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
          Escalations, support channels, and complaint resolution monitoring in one workspace.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 12 }}>
        <Card title="Open Tickets" value={stats.open} sub="Requires immediate response" color="#DC2626" />
        <Card title="In Progress" value={stats.inProgress} sub="Under active handling" color="#B45309" />
        <Card title="Resolved" value={stats.resolved} sub="Closed successfully" color="#059669" />
        <Card title="Total Complaints" value={stats.total} sub="Current tracking window" color="#1D4ED8" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Support Channels</div>

          <a href="https://wa.me/923700036867?text=Assalam%20o%20Alaikum%2C%20we%20need%20support%20for%20our%20school%20operations." target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#0F172A', border: '1px solid #DCFCE7', background: '#F0FDF4', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={16} color="#15803D" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>WhatsApp Priority Desk</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Fast ticket creation and escalation</div>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Open</span>
          </a>

          <a href="tel:+923700036867" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#0F172A', border: '1px solid #DBEAFE', background: '#EFF6FF', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PhoneCall size={16} color="#1D4ED8" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Direct Call Support</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>For urgent operational downtime</div>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>Call</span>
          </a>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Clock3 size={15} color="#475569" />
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Operational Support Window</div>
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>6 days support model with same-day escalation path for blocking issues.</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Support Workflow</div>

          {[
            { icon: HelpCircle, title: '1. Log Issue', desc: 'Create complaint with subject, impact and affected module.', color: '#1D4ED8' },
            { icon: AlertCircle, title: '2. Triage', desc: 'Classify severity and assign owner for response.', color: '#B45309' },
            { icon: CheckCircle2, title: '3. Resolve and Verify', desc: 'Fix issue, confirm with requester, close ticket.', color: '#059669' },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={15} color={step.color} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{step.title}</div>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: '#64748B' }}>{step.desc}</div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Link to="/complaints" style={{ textDecoration: 'none', flex: 1 }}>
              <button type="button" style={{ width: '100%', border: '1px solid #1D4ED8', color: '#1D4ED8', background: '#EFF6FF', borderRadius: 8, padding: '9px 10px', fontWeight: 700, cursor: 'pointer' }}>
                Open Complaint Board
              </button>
            </Link>
            <Link to="/manual" style={{ textDecoration: 'none', flex: 1 }}>
              <button type="button" style={{ width: '100%', border: '1px solid #0F766E', color: '#0F766E', background: '#F0FDFA', borderRadius: 8, padding: '9px 10px', fontWeight: 700, cursor: 'pointer' }}>
                SOP Reference
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
