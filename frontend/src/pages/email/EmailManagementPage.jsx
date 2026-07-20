/**
 * IlmForge — Email Management
 * ============================
 * - Compose to parents / staff group or custom address
 * - Email templates (fee reminder, exam notice, etc.)
 * - Sent history (from /notifications/history filtered to email)
 * - Connects to POST /notifications/email
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Send, Mail, History, RefreshCw, CheckCircle, Users,
  FileText, ChevronDown, ChevronUp, Trash2, RotateCcw,
} from 'lucide-react';

/* ── Built-in email templates ──────────────────────────────────── */
const EMAIL_TEMPLATES = [
  {
    id: 'fee_reminder',
    label: 'Fee Reminder',
    subject: 'Fee Payment Reminder — {school}',
    body: `Dear Parent,\n\nThis is a friendly reminder that the fee for the current month is due.\nKindly clear the outstanding amount at your earliest convenience to avoid any inconvenience.\n\nIf you have already made the payment, please disregard this message.\n\nRegards,\nAccounts Department\n{school}`,
  },
  {
    id: 'exam_notice',
    label: 'Exam Notice',
    subject: 'Upcoming Examination Schedule — {school}',
    body: `Dear Parent,\n\nWe would like to inform you that the upcoming examinations are scheduled soon.\nPlease ensure your child is well-prepared and attends school on time during the exam period.\n\nThe detailed timetable will be shared separately.\n\nRegards,\nExamination Committee\n{school}`,
  },
  {
    id: 'result_published',
    label: 'Result Published',
    subject: 'Examination Results Published — {school}',
    body: `Dear Parent,\n\nWe are pleased to inform you that the examination results have been published.\nYou may log in to the parent portal to view your child's result.\n\nFor any queries, please contact the school office.\n\nRegards,\n{school}`,
  },
  {
    id: 'holiday_notice',
    label: 'Holiday Notice',
    subject: 'School Holiday Notice — {school}',
    body: `Dear Parent,\n\nPlease note that school will remain closed on the upcoming public holiday.\nClasses will resume as usual on the next working day.\n\nThank you for your understanding.\n\nRegards,\n{school}`,
  },
  {
    id: 'parent_meeting',
    label: 'Parent-Teacher Meeting',
    subject: 'Invitation: Parent-Teacher Meeting — {school}',
    body: `Dear Parent,\n\nYou are cordially invited to the Parent-Teacher Meeting scheduled at our school premises.\nThis is an excellent opportunity to discuss your child's academic progress and development.\n\nKindly confirm your attendance with the class teacher.\n\nRegards,\n{school}`,
  },
  {
    id: 'custom',
    label: 'Custom (blank)',
    subject: '',
    body: '',
  },
];

const RECIPIENT_GROUPS = [
  { id: 'custom',  label: 'Custom email address' },
  { id: 'parents', label: 'All Parents (from student records)' },
  { id: 'staff',   label: 'All Staff (teachers + admin)' },
];

/* ── Status badge helper ───────────────────────────────────────── */
const statusCls = { sent: 'badge-green', failed: 'badge-red', pending: 'badge-amber' };

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function EmailManagementPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('send');
  const [recipientGroup, setRecipientGroup] = useState('custom');
  const [form, setForm] = useState({ to: '', subject: '', body: '' });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  /* Fetch parent emails */
  const { data: students = [] } = useQuery({
    queryKey: ['students-for-email'],
    queryFn: () => api.get('/students?limit=1000&status=active').then(r => r.data.data || []).catch(() => []),
    enabled: recipientGroup === 'parents',
  });

  /* Fetch staff emails */
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-for-email'],
    queryFn: () => api.get('/staff?limit=500').then(r => r.data.data || []).catch(() => []),
    enabled: recipientGroup === 'staff',
  });

  /* Sent history */
  const { data: history = [], isLoading: histLoading, refetch } = useQuery({
    queryKey: ['email-history'],
    queryFn: () => api.get('/notifications/history').then(r => (r.data.data || []).filter(n => n.type === 'email')).catch(() => []),
    enabled: tab === 'history',
  });

  /* Resolve recipient list */
  const resolveRecipients = () => {
    if (recipientGroup === 'parents') {
      const emails = students.map(s => s.parent?.email || s.emergencyEmail).filter(Boolean);
      return [...new Set(emails)].join(',');
    }
    if (recipientGroup === 'staff') {
      const emails = staffList.map(s => s.email).filter(Boolean);
      return [...new Set(emails)].join(',');
    }
    return form.to;
  };

  const recipientCount = () => {
    if (recipientGroup === 'parents') return students.filter(s => s.parent?.email || s.emergencyEmail).length;
    if (recipientGroup === 'staff') return staffList.filter(s => s.email).length;
    return form.to ? form.to.split(',').filter(e => e.trim()).length : 0;
  };

  /* Send mutation — POST /notifications/email */
  const send = useMutation({
    mutationFn: () => {
      const to = resolveRecipients();
      if (!to) throw new Error('No recipient email addresses found.');
      return api.post('/notifications/email', {
        to,
        subject: form.subject,
        html: form.body.replace(/\n/g, '<br>'),
        body: form.body,
      });
    },
    onSuccess: () => {
      toast.success('Email sent successfully!');
      setForm({ to: '', subject: '', body: '' });
      setSelectedTemplate('');
      qc.invalidateQueries({ queryKey: ['email-history'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to send email. Check SMTP settings.');
    },
  });

  /* Apply template */
  const applyTemplate = (tplId) => {
    setSelectedTemplate(tplId);
    if (!tplId || tplId === 'custom') {
      setForm(f => ({ ...f, subject: '', body: '' }));
      return;
    }
    const tpl = EMAIL_TEMPLATES.find(t => t.id === tplId);
    if (tpl) setForm(f => ({ ...f, subject: tpl.subject, body: tpl.body }));
  };

  const canSend = form.subject && form.body && (recipientGroup !== 'custom' || form.to);

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Email Management</h1>
        <p className="page-subtitle">Compose emails to parent / staff groups and view sent history</p>
      </div>

      <div className="tab-list" style={{ marginBottom: 16 }}>
        <button className={`tab-btn${tab === 'send' ? ' active' : ''}`} onClick={() => setTab('send')}>
          <Send size={13} style={{ display: 'inline', marginRight: 5 }} /> Compose Email
        </button>
        <button className={`tab-btn${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
          <History size={13} style={{ display: 'inline', marginRight: 5 }} /> Sent History
        </button>
      </div>

      {/* ── COMPOSE ──────────────────────────────────────────── */}
      {tab === 'send' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          {/* Left: form */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={15} color="#0D9488" /> Compose Email
            </h3>

            {/* Recipient group selector */}
            <div className="form-group">
              <label className="form-label">Send To *</label>
              <select className="form-select" value={recipientGroup} onChange={e => setRecipientGroup(e.target.value)}>
                {RECIPIENT_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              {recipientGroup !== 'custom' && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#0D9488', fontWeight: 600 }}>
                  <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {recipientCount()} recipient{recipientCount() !== 1 ? 's' : ''} found
                </div>
              )}
            </div>

            {/* Custom email field */}
            {recipientGroup === 'custom' && (
              <div className="form-group">
                <label className="form-label">Email Address(es) *</label>
                <input className="form-input" type="text"
                  placeholder="parent@example.com, another@example.com"
                  value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Separate multiple addresses with a comma</div>
              </div>
            )}

            {/* Template picker */}
            <div className="form-group">
              <label className="form-label">
                <button type="button" onClick={() => setShowTemplates(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#0073b7', fontWeight: 700, fontSize: 12.5, padding: 0 }}>
                  <FileText size={13} /> Email Templates
                  {showTemplates ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </label>
              {showTemplates && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {EMAIL_TEMPLATES.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => { applyTemplate(t.id); setShowTemplates(false); }}
                      style={{
                        padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                        border: `1.5px solid ${selectedTemplate === t.id ? '#0073b7' : '#e2e8f0'}`,
                        background: selectedTemplate === t.id ? '#eff6ff' : 'white',
                        color: selectedTemplate === t.id ? '#0073b7' : '#475569',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input className="form-input" placeholder="Email subject"
                value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>

            {/* Body */}
            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea className="form-input form-textarea" rows={9}
                placeholder="Write your email message here…"
                value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            </div>

            <button className="btn btn-teal btn-lg" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => send.mutate()} disabled={send.isPending || !canSend}>
              <Send size={16} /> {send.isPending ? 'Sending…' : `Send Email${recipientGroup !== 'custom' ? ` to ${recipientCount()} Recipients` : ''}`}
            </button>
          </div>

          {/* Right: info panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>Automated Emails</h3>
              <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.7 }}>
                These emails are sent automatically:
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    'Registration welcome email',
                    'Password reset link',
                    'Fee payment confirmation',
                    'Exam result notification',
                    'Birthday wishes',
                  ].map(e => (
                    <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={11} color="#0D9488" /> {e}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="alert alert-info">
              <span>i</span>
              <span style={{ fontSize: 12.5 }}>
                Configure SMTP at <strong>Settings &rarr; Email Settings</strong> to enable live sending.
              </span>
            </div>
            {/* Quick template guide */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10 }}>Available Templates</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EMAIL_TEMPLATES.filter(t => t.id !== 'custom').map(t => (
                  <button key={t.id} type="button"
                    onClick={() => { applyTemplate(t.id); setShowTemplates(false); }}
                    style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: selectedTemplate === t.id ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={12} color="#0073b7" /> {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ──────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>{history.length} email{history.length !== 1 ? 's' : ''} sent</span>
            <button className="btn btn-outline btn-sm" onClick={() => refetch()}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject / Message</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>Date &amp; Time</th>
                    <th>Resend</th>
                  </tr>
                </thead>
                <tbody>
                  {histLoading ? (
                    <tr><td colSpan={6}><div className="loading-center"><div className="spinner" /></div></td></tr>
                  ) : history.length ? history.map((n, i) => (
                    <tr key={n.id || i}>
                      <td style={{ color: '#94A3B8', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
                        {n.title || n.body || '—'}
                      </td>
                      <td style={{ fontSize: 12.5, color: '#64748B' }}>{n.recipientType || '—'}</td>
                      <td><span className={`badge ${statusCls[n.status] || 'badge-gray'}`}>{n.status}</span></td>
                      <td style={{ fontSize: 11.5, color: '#94A3B8' }}>
                        {n.sentAt ? new Date(n.sentAt).toLocaleString('en-PK') : '—'}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline btn-icon" title="Resend"
                          onClick={() => {
                            setTab('send');
                            setForm({ to: '', subject: n.title || n.body || '', body: n.body || '' });
                          }}>
                          <RotateCcw size={12} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state" style={{ padding: 32 }}>
                          <div className="empty-state-icon">
                            <Mail size={36} color="#CBD5E1" />
                          </div>
                          <div className="empty-state-text">No emails sent yet</div>
                        </div>
                      </td>
                    </tr>
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
