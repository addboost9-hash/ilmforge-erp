/**
 * IlmForge — SMS Manager (Enhanced)
 * Bulk SMS to parents with templates, phone validation, delivery report
 */
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Send, MessageSquare, Users, Tag, CheckCircle2, XCircle,
  Settings, RefreshCw, Phone, ChevronDown, ChevronUp,
  BarChart2, AlertTriangle,
} from 'lucide-react';

const TAGS = [
  { tag: '{{student_name}}',  desc: 'Student name' },
  { tag: '{{parent_name}}',   desc: "Parent's name" },
  { tag: '{{class}}',         desc: 'Class name' },
  { tag: '{{amount}}',        desc: 'Fee amount' },
  { tag: '{{month}}',         desc: 'Month name' },
  { tag: '{{school_name}}',   desc: 'School name' },
  { tag: '{{date}}',          desc: "Today's date" },
  { tag: '{{due_date}}',      desc: 'Due date' },
];

const QUICK_TEMPLATES = [
  { name: 'Fee Reminder',    msg: 'Assalam-o-Alaikum {{parent_name}},\nYour child {{student_name}} (Class {{class}}) has outstanding fee of Rs. {{amount}} for {{month}}. Please pay at earliest.\n— IlmForge' },
  { name: 'Absent Alert',    msg: 'Dear {{parent_name}},\n{{student_name}} was ABSENT today. Please ensure regular attendance.\n— IlmForge' },
  { name: 'Fee Received ✅', msg: 'Dear {{parent_name}},\nFee payment of Rs. {{amount}} received for {{student_name}} ({{month}}). Thank you!\n— IlmForge' },
  { name: 'Exam Reminder',   msg: 'Dear {{parent_name}},\nExams of {{student_name}} ({{class}}) begin soon. Please ensure preparation.\n— IlmForge' },
  { name: 'Holiday Notice',  msg: 'Dear Parents,\nSchool will remain CLOSED on {{date}} due to public holiday. Classes resume next day.\n— IlmForge' },
  { name: 'Fee Due Notice',  msg: 'Dear {{parent_name}},\nFee of Rs. {{amount}} for {{student_name}} is due on {{due_date}}. Avoid late charges.\n— IlmForge' },
];

/* ─── Delivery Report Row ──────────────────────────────────────── */
function DeliveryResult({ results }) {
  const [show, setShow] = useState(false);
  if (!results) return null;
  const sent   = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div className="chip chip-green" style={{ fontSize: 12 }}><CheckCircle2 size={12} /> {sent.length} Delivered</div>
        {failed.length > 0 && <div className="chip chip-red" style={{ fontSize: 12 }}><XCircle size={12} /> {failed.length} Failed</div>}
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setShow(s => !s)}>
          {show ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> Details</>}
        </button>
      </div>
      {show && (
        <div style={{ background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
              {r.success ? <CheckCircle2 size={13} color="#15803d" /> : <XCircle size={13} color="#dc2626" />}
              <span style={{ fontFamily: 'monospace', flex: 1 }}>{r.phone}</span>
              <span style={{ color: r.success ? '#15803d' : '#dc2626', fontSize: 11 }}>{r.success ? (r.sid ? `SID: ${r.sid.slice(-6)}` : 'Sent') : (r.error || 'Failed')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════ */
export default function SMSPage() {
  const [classId,   setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [message,   setMessage]   = useState('');
  const [sendAll,   setSendAll]   = useState(false);
  const [results,   setResults]   = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => api.get('/classes').then(r => r.data.data || []),
  });

  const selectedClass = classes.find(c => c.id === parseInt(classId));
  const sections = selectedClass?.sections || [];

  const { data: students = [], isFetching } = useQuery({
    queryKey: ['sms-students', classId, sectionId, sendAll],
    enabled:  !!classId || sendAll,
    queryFn:  () => api.get('/students', {
      params: { classId: classId || undefined, sectionId: sectionId || undefined, limit: 500, status: 'active' },
    }).then(r => r.data.data || []),
  });

  const validRecipients = students.filter(s => s.emergencyPhone || s.parent?.phone);
  const invalidCount    = students.length - validRecipients.length;

  const sendMutation = useMutation({
    mutationFn: () => api.post('/notifications/sms', {
      phones:  validRecipients.map(s => s.emergencyPhone || s.parent?.phone),
      message,
    }),
    onSuccess: r => {
      const data = r.data.data;
      toast.success(r.data.message || 'SMS sent!');
      setResults(data?.results || null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Send failed'),
  });

  const insertTag = tag => setMessage(m => m + tag);
  const smsCount  = message.length > 0 ? Math.ceil(message.length / 160) : 0;
  const charsLeft = smsCount > 0 ? (smsCount * 160) - message.length : 160;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={20} color="#1d4ed8" /> SMS Manager
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Bulk SMS to parents — Pakistan numbers auto-formatted to +92XXXXXXXXXX
          </p>
        </div>
        <Link to="/settings/channels" className="btn btn-outline btn-sm">
          <Settings size={13} /> SMS Settings
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

        {/* ── Compose Panel ────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={15} color="#1d4ed8" /> Compose SMS
            </h3>
          </div>
          <div className="card-body">

            {/* Target selection */}
            <div style={{ background: '#f8faff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={14} color="#1d4ed8" />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f' }}>Recipients</span>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Class</label>
                  <select className="form-select" value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setSendAll(false); }}>
                    <option value="">Select class…</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {sections.length > 0 && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Section</label>
                    <select className="form-select" value={sectionId} onChange={e => setSectionId(e.target.value)}>
                      <option value="">All Sections</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={sendAll} onChange={e => { setSendAll(e.target.checked); if (e.target.checked) { setClassId(''); setSectionId(''); } }} />
                  <strong>Send to ALL parents</strong> (entire school)
                </label>
              </div>
              {(classId || sendAll) && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isFetching
                    ? <span style={{ fontSize: 12, color: '#94a3b8' }}><RefreshCw size={11} /> Loading…</span>
                    : <>
                        <span className="chip chip-blue">{validRecipients.length} valid numbers</span>
                        {invalidCount > 0 && <span className="chip chip-yellow"><AlertTriangle size={10} /> {invalidCount} no phone</span>}
                      </>
                  }
                </div>
              )}
            </div>

            {/* Quick templates */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>QUICK TEMPLATES</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => setMessage(t.msg)}
                    style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: '#374151', transition: 'all .15s' }}
                    onMouseEnter={e => { e.target.style.borderColor = '#1d4ed8'; e.target.style.color = '#1d4ed8'; }}
                    onMouseLeave={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.color = '#374151'; }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea className="form-input" rows={5} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Type your message. Use tags like {{parent_name}}, {{student_name}}, {{amount}}…" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11.5, color: '#94a3b8' }}>
                <span>{message.length} chars</span>
                <span style={{ color: smsCount > 1 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                  {smsCount > 0 ? `${smsCount} SMS part${smsCount > 1 ? 's' : ''} · ${charsLeft} chars left` : '160 chars per SMS'}
                </span>
              </div>
            </div>

            {/* Send button */}
            <button className="btn btn-primary w-full"
              disabled={!message || validRecipients.length === 0 || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}>
              {sendMutation.isPending
                ? <><RefreshCw size={14} /> Sending to {validRecipients.length} numbers…</>
                : <><Send size={14} /> Send SMS to {validRecipients.length} Parents</>}
            </button>

            {/* Delivery results */}
            <DeliveryResult results={results} />
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Insert tags */}
          <div className="card">
            <div className="card-header"><h3 style={{ fontSize: 13 }}><Tag size={13} /> Insert Tags</h3></div>
            <div className="card-body" style={{ padding: '10px 14px' }}>
              {TAGS.map(t => (
                <button key={t.tag} onClick={() => insertTag(t.tag)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent', marginBottom: 2, fontSize: 12, transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontFamily: 'monospace', color: '#0073b7', fontWeight: 600, fontSize: 11 }}>{t.tag}</span>
                  <span style={{ color: '#94a3b8', marginLeft: 8 }}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <div className="card-header"><h3 style={{ fontSize: 13 }}><BarChart2 size={13} /> This Session</h3></div>
            <div className="card-body" style={{ padding: '10px 14px' }}>
              {[
                { label: 'Recipients',  v: validRecipients.length, color: '#1d4ed8' },
                { label: 'SMS Parts',   v: smsCount || 0,          color: '#d97706' },
                { label: 'Est. Cost',   v: smsCount && validRecipients.length ? `~${(smsCount * validRecipients.length * 0.5).toFixed(0)} Rs` : '—', color: '#15803d' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Pakistan numbers: 03XXXXXXXXX → +92XXXXXXXXXX auto-converted</div>
            </div>
          </div>

          {/* Settings link */}
          <Link to="/settings/channels" style={{ textDecoration: 'none' }}>
            <div className="ribbon-card" style={{ borderLeftColor: '#1d4ed8', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={14} color="#1d4ed8" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1e3a5f' }}>Twilio Settings</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>Configure Account SID, Auth Token, From Number</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
