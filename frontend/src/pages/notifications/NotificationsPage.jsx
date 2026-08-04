import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { MessageSquare, Phone, Bell, History, Send, ChevronRight } from 'lucide-react';

const typeColors = { sms:'badge-blue', whatsapp:'badge-green', email:'badge-amber', push:'badge-purple' };

export default function NotificationsPage() {
  const { data } = useQuery({
    queryKey: ['notif-history'],
    queryFn: () => api.get('/notifications/history').then(r => r.data.data),
  });

  const channels = [
    { label:'Send SMS', to:'/notifications/sms', desc:'Text messages to parents & staff', color:'#1E3A5F', icon:MessageSquare, badge:'Twilio' },
    { label:'Send WhatsApp', to:'/notifications/whatsapp', desc:'Rich messages with media & buttons', color:'#25D366', icon:Phone, badge:'WhatsApp API' },
  ];

  const stats = [
    { label:'SMS Sent', v:(data||[]).filter(n=>n.type==='sms').length, c:'#1E3A5F' },
    { label:'WhatsApp Sent', v:(data||[]).filter(n=>n.type==='whatsapp').length, c:'#25D366' },
    { label:'Total Notifications', v:(data||[]).length, c:'#0D9488' },
  ];

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">Communication Hub</h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Send notifications to parents, staff, and students</p>
      </div>

      {/* Stats */}
      <div className="stats-grid-3" style={{marginBottom:16}}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{padding:14, textAlign:'center'}}>
            <div style={{fontSize:24, fontWeight:800, color:s.c}}>{s.v}</div>
            <div style={{fontSize:12, color:'#64748B', fontWeight:600, marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Channels */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20}}>
        {channels.map(ch => {
          const Icon = ch.icon;
          return (
            <Link key={ch.to} to={ch.to} style={{textDecoration:'none'}}>
              <div className="card" style={{display:'flex', alignItems:'center', gap:14, cursor:'pointer', transition:'box-shadow 0.15s', padding:18}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=''}>
                <div style={{width:48,height:48,borderRadius:12,background:ch.color+'18',border:`1px solid ${ch.color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Icon size={22} color={ch.color}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700, fontSize:14, color:'#1E3A5F'}}>{ch.label}</div>
                  <div style={{fontSize:12, color:'#64748B', marginTop:2}}>{ch.desc}</div>
                  <span style={{fontSize:10.5, fontWeight:600, color:ch.color, marginTop:3, display:'inline-block'}}>{ch.badge}</span>
                </div>
                <ChevronRight size={16} color="#94a3b8"/>
              </div>
            </Link>
          );
        })}
      </div>

      {/* History */}
      <div className="card" style={{padding:0}}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8}}>
          <History size={15} color="#64748B"/>
          <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Notification History</h3>
          {data && <span className="badge badge-gray" style={{marginLeft:'auto'}}>{data.length} total</span>}
        </div>
        <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>Message</th><th>Status</th><th>Sent At</th></tr>
            </thead>
            <tbody>
              {(data||[]).map((n,i) => (
                <tr key={i}>
                  <td><span className={`badge ${typeColors[n.type]||'badge-gray'}`}>{n.type}</span></td>
                  <td style={{maxWidth:360,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12.5,color:'#475569'}}>{n.body}</td>
                  <td><span className={`badge ${n.status==='sent'?'badge-green':'badge-red'}`}>{n.status}</span></td>
                  <td style={{fontSize:12,color:'#94a3b8'}}>{n.sentAt?new Date(n.sentAt).toLocaleString('en-PK'):n.createdAt?new Date(n.createdAt).toLocaleString('en-PK'):'—'}</td>
                </tr>
              ))}
              {(!data||data.length===0) && (
                <tr><td colSpan={4}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <div className="empty-state-text">No notifications sent yet</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
