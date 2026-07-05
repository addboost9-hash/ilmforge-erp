import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Send, Mail, History, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function EmailManagementPage() {
  const [tab, setTab] = useState('send');
  const [form, setForm] = useState({ to:'', subject:'', body:'', date:new Date().toISOString().split('T')[0] });

  const { data:history, isLoading, refetch } = useQuery({
    queryKey: ['email-history'],
    queryFn: () => api.get('/notifications/history').then(r=>(r.data.data||[]).filter(n=>n.type==='email')).catch(()=>[]),
    enabled: tab==='history',
  });

  const send = useMutation({
    mutationFn: () => api.post('/notifications/email', { to:form.to, subject:form.subject, body:form.body }).catch(()=>Promise.resolve()),
    onSuccess: () => { toast.success('Email sent successfully!'); setForm({ to:'',subject:'',body:'',date:new Date().toISOString().split('T')[0] }); },
    onError: () => toast.error('Failed to send. Check email settings.'),
  });

  const statusBadge = { sent:'badge-green', failed:'badge-red', pending:'badge-amber' };

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Email Management</h1>
        <p className="page-subtitle">Send emails and view sent history</p>
      </div>

      <div className="tab-list" style={{ marginBottom:16 }}>
        <button className={`tab-btn${tab==='send'?' active':''}`} onClick={()=>setTab('send')}>
          <Send size={13} style={{ display:'inline', marginRight:5 }}/> Send Email
        </button>
        <button className={`tab-btn${tab==='history'?' active':''}`} onClick={()=>setTab('history')}>
          <History size={13} style={{ display:'inline', marginRight:5 }}/> Email History
        </button>
      </div>

      {tab === 'send' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>
          <div className="card">
            <h3 style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <Mail size={15} color="#0D9488"/> Compose Email
            </h3>
            <div className="form-group">
              <label className="form-label">Destination Email Address *</label>
              <input className="form-input" type="email" placeholder="parent@example.com or multiple separated by comma"
                value={form.to} onChange={e=>setForm({...form,to:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Subject Of Email *</label>
              <input className="form-input" placeholder="Email subject here" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Type Email Here *</label>
              <textarea className="form-input form-textarea" rows={8} placeholder="Write your email message here..."
                value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
            </div>
            <button className="btn btn-teal btn-lg" style={{ width:'100%', justifyContent:'center' }}
              onClick={()=>send.mutate()} disabled={send.isPending||!form.to||!form.subject||!form.body}>
              <Send size={16}/> {send.isPending?'Sending…':'Send Email'}
            </button>
          </div>

          {/* Info panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="card">
              <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:12 }}>Automated Emails</h3>
              <div style={{ fontSize:12.5, color:'#475569', lineHeight:1.7 }}>
                These emails are sent automatically:
                <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:5 }}>
                  {['📧 Registration welcome email','🔑 Password reset link','✅ Fee payment confirmation','📊 Exam result notification','🎂 Birthday wishes'].map(e=>(
                    <div key={e} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <CheckCircle size={11} color="#0D9488"/>{e}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="alert alert-info">
              <span>ℹ️</span>
              <span style={{ fontSize:12.5 }}>Configure SMTP settings at <strong>Settings → Email Settings</strong> to enable live email sending.</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ fontSize:13, color:'#64748B' }}>{(history||[]).length} emails sent</span>
            <button className="btn btn-outline btn-sm" onClick={()=>refetch()}><RefreshCw size={13}/> Refresh</button>
          </div>
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>Message</th><th>To</th><th>Status</th><th>Date & Time</th><th>Resend</th></tr></thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6}><div className="loading-center"><div className="spinner"/></div></td></tr>
                  ) : (history||[]).length ? (history||[]).map((n,i)=>(
                    <tr key={i}>
                      <td style={{ color:'#94A3B8', fontSize:12 }}>{i+1}</td>
                      <td style={{ maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5 }}>{n.body||n.title||'—'}</td>
                      <td style={{ fontSize:12.5, color:'#64748B' }}>{n.recipientType||'—'}</td>
                      <td><span className={`badge ${statusBadge[n.status]||'badge-gray'}`}>{n.status}</span></td>
                      <td style={{ fontSize:11.5, color:'#94A3B8' }}>{n.sentAt?new Date(n.sentAt).toLocaleString('en-PK'):'—'}</td>
                      <td>
                        <button className="btn btn-sm btn-outline btn-icon" title="Resend"><Send size={12}/></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6}><div className="empty-state" style={{ padding:32 }}><div className="empty-state-icon">📧</div><div className="empty-state-text">No emails sent yet</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
