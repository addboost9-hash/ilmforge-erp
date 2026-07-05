import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Send, Phone } from 'lucide-react';

export default function WhatsAppPage() {
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data:students } = useQuery({
    queryKey: ['wa-students', classId],
    enabled: !!classId,
    queryFn: () => api.get('/students', {params:{classId, limit:300, status:'active'}}).then(r=>r.data.data),
  });

  const send = useMutation({
    mutationFn: () => api.post('/notifications/whatsapp', {
      phones: (students||[]).map(s=>s.emergencyPhone).filter(Boolean),
      message,
    }),
    onSuccess: r => { toast.success(r.data.message || 'WhatsApp messages sent!'); setMessage(''); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to send'),
  });

  const recipientCount = (students||[]).filter(s=>s.emergencyPhone).length;

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title" style={{display:'flex', alignItems:'center', gap:10}}>
          <Phone size={22} color="#25D366"/> WhatsApp Messages
        </h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Send rich text messages via WhatsApp Business API</p>
      </div>

      <div className="alert" style={{marginBottom:16, background:'#F0FDF4', border:'1px solid #86EFAC', color:'#15803D'}}>
        <span>💡</span>
        <span style={{fontSize:12.5}}>
          WhatsApp messages support text, images, PDFs, and links. Configure your <strong>WHATSAPP_API_KEY</strong> in the .env file to enable live sending.
        </span>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:16}}>
        {/* Compose */}
        <div className="card">
          <h3 style={{fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:16}}>Compose WhatsApp Message</h3>

          <div className="form-group">
            <label className="form-label">Send to Class</label>
            <select className="form-select" value={classId} onChange={e=>setClassId(e.target.value)}>
              <option value="">Select Class</option>
              {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {classId && <div style={{fontSize:12, color:'#0D9488', fontWeight:600, marginTop:4}}>{recipientCount} parents with phone numbers</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-input form-textarea" rows={6}
              placeholder="Write your WhatsApp message here. Use *bold* for bold, _italic_ for italic."
              value={message} onChange={e=>setMessage(e.target.value)}/>
            <div style={{fontSize:11, color:'#94a3b8', marginTop:4}}>{message.length} characters</div>
          </div>

          <button
            style={{width:'100%', justifyContent:'center', background:'#25D366', color:'#fff', border:'none', cursor:'pointer', padding:'11px 24px', borderRadius:8, fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:8, opacity:(!message||!classId||recipientCount===0)?0.5:1}}
            onClick={() => send.mutate()} disabled={send.isPending || !message || recipientCount===0}>
            <Send size={16}/> {send.isPending ? 'Sending...' : `Send to ${recipientCount} Parents`}
          </button>
        </div>

        {/* Preview */}
        <div>
          <div className="card" style={{background:'#ECE5DD', border:'none'}}>
            <div style={{fontSize:12, fontWeight:700, color:'#1E3A5F', marginBottom:10}}>📱 Message Preview</div>
            <div style={{
              background:'#fff', borderRadius:'4px 12px 12px 12px',
              padding:'10px 14px', fontSize:13, color:'#111', lineHeight:1.6,
              boxShadow:'0 1px 2px rgba(0,0,0,0.1)', maxWidth:260,
              whiteSpace:'pre-wrap', wordBreak:'break-word', minHeight:40,
            }}>
              {message || <span style={{color:'#94a3b8', fontStyle:'italic'}}>Your message preview...</span>}
            </div>
            <div style={{textAlign:'right', fontSize:11, color:'#94a3b8', marginTop:4}}>✓✓</div>
          </div>

          {/* Recipients */}
          {classId && (
            <div className="card" style={{marginTop:12, padding:0, overflow:'hidden', maxHeight:280}}>
              <div style={{padding:'10px 14px', borderBottom:'1px solid #F1F5F9', fontSize:12, fontWeight:700, color:'#1E3A5F'}}>
                Recipients ({recipientCount})
              </div>
              <div style={{overflowY:'auto', maxHeight:220}}>
                {(students||[]).map(s => (
                  <div key={s.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 14px',borderBottom:'1px solid #F8FAFC',fontSize:12}}>
                    <span style={{fontWeight:500}}>{s.name}</span>
                    <span style={{color:s.emergencyPhone?'#25D366':'#DC2626',fontSize:11}}>
                      {s.emergencyPhone || '❌'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
