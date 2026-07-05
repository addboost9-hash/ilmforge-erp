import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Send, MessageSquare, Users, Tag } from 'lucide-react';

const TAGS = [
  { tag:'{student_name}', desc:'Student name' },
  { tag:'{class_name}', desc:'Class name' },
  { tag:'{fee_due}', desc:'Due amount' },
  { tag:'{month}', desc:'Month' },
  { tag:'{school_name}', desc:'School name' },
];

const TEMPLATES = [
  { name:'Fee Reminder', msg:'Dear Parent, your child {student_name} has an outstanding fee of {fee_due} for {month}. Please pay at the earliest. Thank you.' },
  { name:'Attendance Alert', msg:'Dear Parent, your child {student_name} was absent from school today. Please ensure regular attendance. Thank you.' },
  { name:'Fee Received', msg:'Dear Parent, fee payment received for {student_name} for {month}. Thank you for timely payment. - {school_name}' },
  { name:'Exam Notice', msg:'Dear Parent, exams of {student_name} from {class_name} will start next week. Please ensure preparation. - {school_name}' },
];

export default function SMSPage() {
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');
  const [sendAll, setSendAll] = useState(false);

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data:students } = useQuery({
    queryKey: ['sms-students', classId],
    enabled: !!classId || sendAll,
    queryFn: () => api.get('/students', {params:{classId:classId||undefined, limit:500, status:'active'}}).then(r=>r.data.data),
  });

  const send = useMutation({
    mutationFn: () => api.post('/notifications/sms', {
      phones: (students||[]).map(s=>s.emergencyPhone).filter(Boolean),
      message,
    }),
    onSuccess: r => { toast.success(r.data.message || 'SMS sent!'); setMessage(''); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to send SMS'),
  });

  const insertTag = tag => setMessage(m => m + tag);
  const recipientCount = (students||[]).filter(s=>s.emergencyPhone).length;

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">SMS Manager</h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Send text messages to parents and staff</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:16}}>
        {/* Compose */}
        <div className="card">
          <h3 style={{fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:16, display:'flex', alignItems:'center', gap:8}}>
            <MessageSquare size={15} color="#0D9488"/> Compose SMS
          </h3>

          {/* Templates */}
          <div style={{marginBottom:14}}>
            <label className="form-label">Quick Templates</label>
            <div style={{display:'flex', gap:7, flexWrap:'wrap'}}>
              {TEMPLATES.map(t => (
                <button key={t.name} className="btn btn-outline btn-sm" onClick={() => setMessage(t.msg)}>{t.name}</button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{marginBottom:14}}>
            <label className="form-label">Insert Smart Tags</label>
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {TAGS.map(t => (
                <button key={t.tag} className="btn btn-sm"
                  style={{background:'#EDE9FE', color:'#6D28D9', border:'1px solid #DDD6FE', fontSize:11}}
                  onClick={() => insertTag(t.tag)}>
                  {t.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div className="form-group">
            <label className="form-label">Send To</label>
            <div style={{display:'flex', gap:8, marginBottom:8}}>
              <select className="form-select" value={classId} onChange={e=>{setClassId(e.target.value); setSendAll(false);}}>
                <option value="">Select Class</option>
                {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className={`btn ${sendAll?'btn-navy':'btn-outline'} btn-sm`} onClick={()=>{setSendAll(s=>!s); setClassId('');}}>
                <Users size={13}/> All Parents
              </button>
            </div>
            {recipientCount > 0 && (
              <div style={{fontSize:12, color:'#0D9488', fontWeight:600}}>
                ✓ {recipientCount} recipients with phone numbers
              </div>
            )}
          </div>

          {/* Message */}
          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-input form-textarea" rows={5}
              placeholder="Type your SMS message here..." value={message}
              onChange={e=>setMessage(e.target.value)}/>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:4}}>
              <span style={{fontSize:11, color:'#94a3b8'}}>{message.length} chars · ~{Math.ceil(message.length/160)} SMS</span>
              <span style={{fontSize:11, color:message.length>160?'#DC2626':'#94a3b8'}}>{message.length}/160</span>
            </div>
          </div>

          <button className="btn btn-teal btn-lg" style={{width:'100%', justifyContent:'center'}}
            onClick={() => send.mutate()} disabled={send.isPending || !message || recipientCount===0}>
            <Send size={16}/>
            {send.isPending ? 'Sending...' : `Send SMS to ${recipientCount} Parents`}
          </button>
        </div>

        {/* Recipients preview */}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div style={{padding:'12px 16px', borderBottom:'1px solid #F1F5F9', background:'#F8FAFC', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontSize:13, fontWeight:700, color:'#1E3A5F'}}>Recipients</span>
            {recipientCount > 0 && <span className="badge badge-teal">{recipientCount}</span>}
          </div>
          {!classId && !sendAll ? (
            <div style={{padding:24, textAlign:'center', color:'#94a3b8', fontSize:12.5}}>
              Select a class or "All Parents"
            </div>
          ) : (
            <div style={{maxHeight:400, overflowY:'auto'}}>
              {(students||[]).map(s => (
                <div key={s.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid #F8FAFC', fontSize:12.5}}>
                  <span style={{fontWeight:600}}>{s.name}</span>
                  <span style={{color: s.emergencyPhone?'#0D9488':'#DC2626', fontSize:11}}>
                    {s.emergencyPhone || '❌ No phone'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
