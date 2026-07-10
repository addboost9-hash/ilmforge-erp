/**
 * IlmForge — WhatsApp Manager (Enhanced)
 * Rich messages with *bold*, _italic_, emojis, templates, delivery report
 */
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Send, Phone, Users, Tag, CheckCircle2, XCircle,
  Settings, RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';

const TAGS = [
  { tag: '{{student_name}}', desc: 'Student name' },
  { tag: '{{parent_name}}',  desc: "Parent's name" },
  { tag: '{{class}}',        desc: 'Class name' },
  { tag: '{{amount}}',       desc: 'Amount' },
  { tag: '{{month}}',        desc: 'Month' },
  { tag: '{{date}}',         desc: 'Date' },
];

const QUICK_TEMPLATES = [
  { name: '💰 Fee Reminder', msg: '🔔 *Fee Reminder*\n\nDear *{{parent_name}}*,\nYour child *{{student_name}}* (Class {{class}}) has pending fee of *Rs. {{amount}}* for {{month}}.\n\nPlease pay at earliest to avoid late charges.\n\nThank you — *IlmForge*' },
  { name: '⚠️ Absent Alert', msg: '⚠️ *Attendance Alert*\n\nDear *{{parent_name}}*,\nYour child *{{student_name}}* was *ABSENT* today.\n\nPlease ensure regular attendance.\n\n— *IlmForge*' },
  { name: '✅ Fee Received', msg: '✅ *Payment Confirmed!*\n\nDear *{{parent_name}}*,\nFee of *Rs. {{amount}}* for *{{student_name}}* ({{month}}) has been received.\n\nThank you for timely payment! 🎉\n\n— *IlmForge*' },
  { name: '🎓 Result Ready', msg: '🎓 *Result Published!*\n\nDear *{{parent_name}}*,\n*{{student_name}}* exam results are now available.\n\nPlease login to the Parent Portal to view.\n\n— *IlmForge*' },
  { name: '📅 Holiday',      msg: '📅 *Holiday Notice*\n\nDear Parents,\nSchool will remain *CLOSED* on *{{date}}*.\n\nClasses will resume normally the next day.\n\n— *IlmForge*' },
  { name: '📝 Exam Notice',  msg: '📝 *Exam Schedule*\n\nDear *{{parent_name}}*,\nExams of *{{student_name}}* ({{class}}) begin soon.\n\nPlease ensure proper preparation and study material.\n\nBest of luck! 🌟\n\n— *IlmForge*' },
];

function DeliveryResult({ results }) {
  const [show, setShow] = useState(false);
  if (!results) return null;
  const sent   = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div className="chip chip-green"><CheckCircle2 size={12} /> {sent.length} Sent</div>
        {failed.length > 0 && <div className="chip chip-red"><XCircle size={12} /> {failed.length} Failed</div>}
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
              <span style={{ color: r.success ? '#15803d' : '#dc2626', fontSize: 11 }}>{r.success ? 'Sent' : (r.error || 'Failed')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── WhatsApp preview renderer ────────────────────────────────── */
function WAPreview({ text }) {
  if (!text) return <div style={{ color: '#94a3b8', fontSize: 12, padding: 12, textAlign: 'center' }}>Type a message to see preview</div>;
  const formatted = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g,   '<em>$1</em>')
    .replace(/~(.*?)~/g,   '<s>$1</s>')
    .replace(/\n/g,        '<br/>');
  return (
    <div style={{ background: '#dcf8c6', borderRadius: '0 8px 8px 8px', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.7, maxWidth: '90%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
      dangerouslySetInnerHTML={{ __html: formatted }} />
  );
}

const MSG_TYPES = [
  { id: 'text',   label: 'Text',                icon: '📝' },
  { id: 'media',  label: 'Picture/Video/Audio/Document', icon: '📎' },
  { id: 'link',   label: 'Link / URL',           icon: '🔗' },
  { id: 'location',label: 'Location',            icon: '📍' },
  { id: 'quiz',   label: 'Multiple-choice / Quiz / Poll', icon: '📊' },
];

export default function WhatsAppPage() {
  const [classId,   setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [message,   setMessage]   = useState('');
  const [sendAll,   setSendAll]   = useState(false);
  const [results,   setResults]   = useState(null);
  const [msgType,   setMsgType]   = useState('text');
  const [mediaUrl,  setMediaUrl]  = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [linkUrl,   setLinkUrl]   = useState('');
  const [quizQ,     setQuizQ]     = useState('');
  const [quizDesc,  setQuizDesc]  = useState('');
  const [quizOpts,  setQuizOpts]  = useState(['','','']);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => api.get('/classes').then(r => r.data.data || []),
  });

  const selectedClass = classes.find(c => c.id === parseInt(classId));
  const sections = selectedClass?.sections || [];

  const { data: students = [], isFetching } = useQuery({
    queryKey: ['wa-students', classId, sectionId, sendAll],
    enabled:  !!classId || sendAll,
    queryFn:  () => api.get('/students', {
      params: { classId: classId || undefined, sectionId: sectionId || undefined, limit: 100, status: 'active' },
    }).then(r => r.data.data || []),
  });

  const validRecipients = students.filter(s => s.emergencyPhone || s.parent?.phone);
  const invalidCount    = students.length - validRecipients.length;

  const buildMessage = () => {
    if (msgType === 'media')    return `${mediaCaption || message}\n${mediaUrl}`;
    if (msgType === 'link')     return `${message}\n${linkUrl}`;
    if (msgType === 'location') return message;
    if (msgType === 'quiz')     return `*${quizQ}*\n${quizDesc}\n${quizOpts.filter(Boolean).map((o,i)=>` ${i+1}. ${o}`).join('\n')}`;
    return message;
  };

  const sendMutation = useMutation({
    mutationFn: () => api.post('/notifications/whatsapp', {
      phones:  validRecipients.map(s => s.emergencyPhone || s.parent?.phone),
      message: buildMessage(),
      type:    msgType === 'text' ? 'text' : 'text', // WA API type
    }),
    onSuccess: r => {
      toast.success(r.data.message || 'WhatsApp messages sent!');
      setResults(r.data.data?.results || null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Send failed'),
  });

  const insertTag = tag => setMessage(m => m + tag);

  const formatters = [
    { label: 'Bold',   wrap: (t) => `*${t || 'text'}*` },
    { label: 'Italic', wrap: (t) => `_${t || 'text'}_` },
    { label: 'Strike', wrap: (t) => `~${t || 'text'}~` },
  ];

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={20} color="#25D366" /> WhatsApp Manager
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Rich text messages with *bold*, _italic_, emojis — delivered via WhatsApp Business API
          </p>
        </div>
        <Link to="/settings/channels" className="btn btn-outline btn-sm">
          <Settings size={13} /> WA Settings
        </Link>
      </div>

      <div className="alert" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', marginBottom: 16 }}>
        <span>💡</span>
        <span style={{ fontSize: 12.5 }}>
          Use <strong>*bold*</strong> for emphasis, <strong>_italic_</strong> for notes, emojis for engagement.
          Configure your WhatsApp API at <strong>Settings → Channel Settings</strong>.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── Compose ─────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={15} color="#25D366" /> Compose WhatsApp Message
            </h3>
          </div>
          <div className="card-body">

            {/* Target */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={13} color="#15803d" />
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 10 }}>
                <input type="checkbox" checked={sendAll} onChange={e => { setSendAll(e.target.checked); if (e.target.checked) { setClassId(''); setSectionId(''); } }} />
                Send to ALL parents (entire school)
              </label>
              {(classId || sendAll) && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  {isFetching
                    ? <span style={{ fontSize: 12, color: '#94a3b8' }}>Loading…</span>
                    : <>
                        <span className="chip chip-green">{validRecipients.length} numbers</span>
                        {invalidCount > 0 && <span className="chip chip-yellow"><AlertTriangle size={10} /> {invalidCount} no phone</span>}
                      </>
                  }
                </div>
              )}
            </div>

            {/* Message Type Selector */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>MESSAGE TYPE</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MSG_TYPES.map(t => (
                  <button key={t.id} onClick={() => setMsgType(t.id)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${msgType === t.id ? '#25D366' : '#e2e8f0'}`, background: msgType === t.id ? '#dcfce7' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: msgType === t.id ? '#15803d' : '#64748b' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              {/* Type-specific fields */}
              {msgType === 'media' && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input className="form-input" placeholder="File URL or YouTube URL" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
                  <input className="form-input" placeholder="Caption (optional)" value={mediaCaption} onChange={e => setMediaCaption(e.target.value)} />
                </div>
              )}
              {msgType === 'link' && (
                <div style={{ marginTop: 8 }}>
                  <input className="form-input" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
                </div>
              )}
              {msgType === 'quiz' && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input className="form-input" placeholder="Question / Poll message" value={quizQ} onChange={e => setQuizQ(e.target.value)} />
                  <input className="form-input" placeholder="Description (optional)" value={quizDesc} onChange={e => setQuizDesc(e.target.value)} />
                  {quizOpts.map((opt, i) => (
                    <input key={i} className="form-input" placeholder={`Option ${i + 1}`} value={opt} onChange={e => setQuizOpts(opts => opts.map((o, j) => j === i ? e.target.value : o))} />
                  ))}
                </div>
              )}
            </div>

            {/* Quick templates */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>QUICK TEMPLATES</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => setMessage(t.msg)}
                    style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid #86efac', background: 'white', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: '#15803d' }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Format buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {formatters.map(f => (
                <button key={f.label} onClick={() => setMessage(m => m + f.wrap())}
                  style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  {f.label === 'Bold' ? <strong>B</strong> : f.label === 'Italic' ? <em>I</em> : <s>S</s>}
                </button>
              ))}
              <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'center', marginLeft: 4 }}>
                *bold* _italic_ ~strike~
              </span>
            </div>

            {/* Message */}
            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea className="form-input" rows={6} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="🔔 *Fee Reminder*&#10;&#10;Dear *{{parent_name}}*,&#10;Your child *{{student_name}}* has pending fee…" />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{message.length} characters</div>
            </div>

            <button className="btn w-full" disabled={!message || validRecipients.length === 0 || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
              style={{ background: '#25D366', color: 'white', fontWeight: 700, padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {sendMutation.isPending
                ? <><RefreshCw size={14} /> Sending…</>
                : <><Send size={14} /> Send WhatsApp to {validRecipients.length} Parents</>}
            </button>

            <DeliveryResult results={results} />
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Live preview */}
          <div className="card">
            <div className="card-header"><h3 style={{ fontSize: 13 }}>📱 Preview</h3></div>
            <div className="card-body">
              <div style={{ background: '#e5ddd5', borderRadius: 8, padding: 16, minHeight: 120 }}>
                <div style={{ fontSize: 10, color: '#8a9bb0', marginBottom: 8, textAlign: 'center' }}>WhatsApp Chat Preview</div>
                <WAPreview text={message} />
                {message && <div style={{ fontSize: 10, color: '#92a0ad', textAlign: 'right', marginTop: 4 }}>11:30 AM ✓✓</div>}
              </div>
            </div>
          </div>

          {/* Insert tags */}
          <div className="card">
            <div className="card-header"><h3 style={{ fontSize: 13 }}><Tag size={13} /> Insert Tags</h3></div>
            <div className="card-body" style={{ padding: '10px 14px' }}>
              {TAGS.map(t => (
                <button key={t.tag} onClick={() => insertTag(t.tag)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent', marginBottom: 2, fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontFamily: 'monospace', color: '#15803d', fontWeight: 600, fontSize: 11 }}>{t.tag}</span>
                  <span style={{ color: '#94a3b8', marginLeft: 8 }}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Link to="/settings/channels" style={{ textDecoration: 'none' }}>
            <div className="ribbon-card" style={{ borderLeftColor: '#25D366', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={14} color="#25D366" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>WaSender / UltraMsg</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>Configure API URL and Key</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
