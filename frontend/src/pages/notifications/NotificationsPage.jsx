/**
 * IlmForge — Notification Hub v3.7
 * Unified: SMS + WhatsApp + Email + Push + Templates + Automation + History + Inbox
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  MessageSquare, Phone, Mail, Bell, Send, Zap, Clock,
  FileText, PlayCircle, BarChart2,
  CheckCircle, AlertTriangle, RefreshCw, Plus, Eye, Copy,
  DollarSign, Calendar, Gift, QrCode, Megaphone,
  Inbox, Trash2, CheckSquare, Filter,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'fee_reminder',     label: 'Fee Reminder',       icon: DollarSign,     color: '#15803d' },
  { id: 'absent_alert',     label: 'Absent Alert',       icon: AlertTriangle,  color: '#dc2626' },
  { id: 'result_published', label: 'Result Published',   icon: CheckCircle,    color: '#0073b7' },
  { id: 'birthday',         label: 'Birthday Wish',      icon: Gift,           color: '#d97706' },
  { id: 'gate_pass',        label: 'Gate Pass',          icon: QrCode,         color: '#7c3aed' },
  { id: 'holiday',          label: 'Holiday Notice',     icon: Calendar,       color: '#0891b2' },
  { id: 'custom',           label: 'Custom',             icon: Megaphone,      color: '#64748b' },
];

const CHANNEL_COLORS = {
  sms:        { bg: '#eff6ff', color: '#1d4ed8', label: 'SMS' },
  whatsapp:   { bg: '#f0fdf4', color: '#15803d', label: 'WhatsApp' },
  email:      { bg: '#fef3c7', color: '#92400e', label: 'Email' },
  push:       { bg: '#f5f3ff', color: '#6d28d9', label: 'Push' },
  all:        { bg: '#f8f9fa', color: '#374151', label: 'All' },
  automation: { bg: '#fff7ed', color: '#c2410c', label: 'Auto' },
};

const TABS = [
  { id: 'inbox',      label: 'Inbox',      icon: Inbox },
  { id: 'overview',   label: 'Overview',   icon: BarChart2 },
  { id: 'send',       label: 'Send Now',   icon: Send },
  { id: 'templates',  label: 'Templates',  icon: FileText },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'history',    label: 'History',    icon: Clock },
];

/* ── Inbox ─────────────────────────────────────────────────────── */
function InboxTab() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  // Locally track read/deleted state (UI-only — backend NotificationLog has no user inbox concept)
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ilmforge_notif_read') || '[]')); } catch { return new Set(); }
  });
  const [deletedIds, setDeletedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ilmforge_notif_deleted') || '[]')); } catch { return new Set(); }
  });

  const persist = (key, set) => {
    try { localStorage.setItem(key, JSON.stringify([...set])); } catch (_) {}
  };

  const { data: raw = [], isLoading, refetch } = useQuery({
    queryKey: ['notif-inbox'],
    queryFn: () => api.get('/notifications/history').then(r => r.data.data || []).catch(() => []),
    refetchInterval: 30000,
  });

  const TYPE_FILTERS = [
    { id: 'all',       label: 'All' },
    { id: 'sms',       label: 'SMS' },
    { id: 'whatsapp',  label: 'WhatsApp' },
    { id: 'email',     label: 'Email' },
    { id: 'push',      label: 'Push' },
  ];

  const visible = raw
    .filter(n => !deletedIds.has(n.id))
    .filter(n => filterType === 'all' || n.type === filterType);

  const unreadCount = visible.filter(n => !readIds.has(n.id)).length;

  const markRead = (id) => {
    const next = new Set(readIds); next.add(id);
    setReadIds(next); persist('ilmforge_notif_read', next);
  };

  const markAllRead = () => {
    const next = new Set([...readIds, ...visible.map(n => n.id)]);
    setReadIds(next); persist('ilmforge_notif_read', next);
    toast.success('All notifications marked as read');
  };

  const deleteNotif = (id) => {
    const next = new Set(deletedIds); next.add(id);
    setDeletedIds(next); persist('ilmforge_notif_deleted', next);
  };

  const clearDeleted = () => {
    setDeletedIds(new Set()); persist('ilmforge_notif_deleted', new Set());
    toast.success('Deleted items restored');
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} color="#64748b" />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>Filter:</span>
          {TYPE_FILTERS.map(f => {
            const ch = CHANNEL_COLORS[f.id] || {};
            return (
              <button key={f.id} onClick={() => setFilterType(f.id)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  border: `1.5px solid ${filterType === f.id ? (ch.color || '#1e3a5f') : '#e2e8f0'}`,
                  background: filterType === f.id ? (ch.bg || '#eff6ff') : 'white',
                  color: filterType === f.id ? (ch.color || '#1e3a5f') : '#64748b',
                }}>
                {f.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: '#ef4444', color: 'white', borderRadius: 20, padding: '3px 9px' }}>
              {unreadCount} unread
            </span>
          )}
          <button className="btn btn-outline btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckSquare size={13} /> Mark All Read
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Inbox size={40} /></div>
            <div className="empty-state-text">Inbox is empty</div>
            <div className="empty-state-sub">
              {filterType !== 'all' ? `No ${filterType.toUpperCase()} notifications` : 'No notifications received yet'}
            </div>
            {deletedIds.size > 0 && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={clearDeleted}>
                Restore Deleted ({deletedIds.size})
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map(n => {
            const ch = CHANNEL_COLORS[n.type] || CHANNEL_COLORS.sms;
            const isRead = readIds.has(n.id);
            return (
              <div key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer', transition: 'background .15s',
                  background: isRead ? 'white' : '#f0f9ff',
                  border: `1px solid ${isRead ? '#e2e8f0' : '#bae6fd'}`,
                  borderLeft: `4px solid ${ch.color}`,
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                {/* Channel badge */}
                <span style={{ padding: '3px 8px', borderRadius: 12, background: ch.bg, color: ch.color, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                  {ch.label}
                </span>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isRead ? 500 : 700, color: '#1e3a5f', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title || n.body || '(no title)'}
                  </div>
                  {n.title && n.body && (
                    <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {n.sentAt ? new Date(n.sentAt).toLocaleString('en-PK') : '—'}
                    {!isRead && <span style={{ marginLeft: 8, color: '#0ea5e9', fontWeight: 700 }}>New</span>}
                  </div>
                </div>
                {/* Status + delete */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: n.status === 'sent' ? '#dcfce7' : n.status === 'failed' ? '#fee2e2' : '#fef9c3', color: n.status === 'sent' ? '#15803d' : n.status === 'failed' ? '#dc2626' : '#92400e' }}>
                    {n.status}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2 }}
                    title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {deletedIds.size > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'center', marginTop: 8 }} onClick={clearDeleted}>
              <RefreshCw size={12} /> Restore {deletedIds.size} deleted
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Overview ─────────────────────────────────────────────────── */
function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: () => api.get('/automation/stats').then(r => r.data.data).catch(() => ({})),
  });

  const QUICK_LINKS = [
    { label: 'Send SMS',          to: '/notifications/sms',      icon: MessageSquare, color: '#1E3A5F', desc: 'Bulk SMS to parents & staff' },
    { label: 'WhatsApp',          to: '/notifications/whatsapp', icon: Phone,         color: '#25D366', desc: 'Rich WhatsApp messages' },
    { label: 'Push Notification', to: '/push',                   icon: Bell,          color: '#7c3aed', desc: 'FCM push to mobile apps' },
    { label: 'Announcements',     to: '/announcements',          icon: Megaphone,     color: '#0891b2', desc: 'School-wide notices' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Templates',    v: isLoading ? '…' : (data?.templates || 0), color: '#0073b7', icon: FileText },
          { label: 'Auto Rules',   v: isLoading ? '…' : (data?.rules    || 0), color: '#7c3aed', icon: Zap },
          { label: 'SMS Sent',     v: isLoading ? '…' : (data?.byType?.sms || 0), color: '#15803d', icon: MessageSquare },
          { label: 'Total Sent',   v: isLoading ? '…' : (data?.logs?.length || 0), color: '#dc2626', icon: Bell },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="ribbon-card" style={{ borderLeftColor: s.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.v}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>Quick Actions</div>
        <div className="action-grid">
          {QUICK_LINKS.map(l => {
            const Icon = l.icon;
            return (
              <Link key={l.to} to={l.to} className="action-tile" style={{ textDecoration: 'none' }}>
                <div className="tile-icon" style={{ background: l.color + '18' }}>
                  <Icon size={20} color={l.color} />
                </div>
                <div className="tile-label">{l.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{l.desc}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>Notification Categories</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} style={{ padding: '12px 14px', background: cat.color + '0d', border: `1px solid ${cat.color}30`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={cat.color} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e3a5f' }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Templates available</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data?.logs?.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Recent Notifications</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-modern">
              <thead><tr>{['Type', 'Message', 'Status', 'Time'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.logs.slice(0, 8).map(l => {
                  const ch = CHANNEL_COLORS[l.type] || CHANNEL_COLORS.sms;
                  return (
                    <tr key={l.id}>
                      <td><span className="chip" style={{ background: ch.bg, color: ch.color }}>{ch.label}</span></td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{l.title || l.body}</td>
                      <td><span className={`chip ${l.status === 'sent' ? 'chip-green' : 'chip-red'}`}>{l.status}</span></td>
                      <td style={{ fontSize: 11.5, color: '#64748b' }}>{l.sentAt ? new Date(l.sentAt).toLocaleString('en-PK') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Send Now ──────────────────────────────────────────────────── */
function SendNowTab() {
  const [channel, setChannel] = useState('sms');
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['notif-templates'],
    queryFn: () => api.get('/automation/templates').then(r => r.data.data || []).catch(() => []),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-phones'],
    queryFn: () => api.get('/students?limit=500&status=active').then(r => r.data.data || []).catch(() => []),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const phones = students.map(s => s.parent?.phone || s.emergencyPhone).filter(Boolean);
      if (channel === 'sms')       return api.post('/notifications/sms',       { phones, message });
      if (channel === 'whatsapp')  return api.post('/notifications/whatsapp',  { phones, message });
      if (channel === 'email') {
        const emails = students.map(s => s.parent?.email).filter(Boolean);
        return api.post('/notifications/email', { to: emails.join(','), subject, html: `<p>${message}</p>`, body: message });
      }
    },
    onSuccess: () => toast.success('Notification sent!'),
    onError: err => toast.error(err.response?.data?.message || 'Send failed'),
  });

  const handleTemplateSelect = async (id) => {
    setTemplateId(id);
    if (!id) { setMessage(''); setSubject(''); setPreview(''); return; }
    const tpl = templates.find(t => t.id === parseInt(id));
    if (tpl) {
      setMessage(tpl.body);
      setSubject(tpl.subject || '');
      if (tpl.type !== 'all') setChannel(tpl.type);
      try {
        const res = await api.post(`/automation/templates/${id}/preview`);
        setPreview(res.data.data.preview);
      } catch (_) { setPreview(tpl.body); }
    }
  };

  const channels = [
    { id: 'sms',      label: 'SMS',       icon: '📲', color: '#1B2F6E' },
    { id: 'whatsapp', label: 'WhatsApp',  icon: '💬', color: '#25d366' },
    { id: 'email',    label: 'Email',     icon: '📧', color: '#ea4335' },
    { id: 'push',     label: 'Push',      icon: '🔔', color: '#f59e0b' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {channels.map(ch => (
          <button key={ch.id} onClick={() => setChannel(ch.id)}
            style={{
              flex: 1, padding: '12px 10px',
              border: `2px solid ${channel === ch.id ? ch.color : '#e2e8f0'}`,
              borderRadius: 12,
              background: channel === ch.id ? ch.color + '14' : 'white',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontWeight: 700, fontSize: 13,
              color: channel === ch.id ? ch.color : '#64748b',
              transition: 'all .15s',
              boxShadow: channel === ch.id ? `0 2px 8px ${ch.color}30` : 'none',
            }}>
            <span style={{ fontSize: 17 }}>{ch.icon}</span> {ch.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><h3>Compose</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Use Template</label>
              <select className="form-select" value={templateId} onChange={e => handleTemplateSelect(e.target.value)}>
                <option value="">— Custom message —</option>
                {CATEGORIES.map(cat => (
                  <optgroup key={cat.id} label={cat.label}>
                    {templates.filter(t => t.category === cat.id && (t.type === channel || t.type === 'all')).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {channel === 'email' && (
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Message *</label>
              <textarea className="form-input" rows={6} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Type message. Tags: {{parent_name}} {{student_name}} {{amount}} {{month}} {{class}} {{date}}" />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {message.length} chars{channel === 'sms' && message.length > 0 ? ` · ${Math.ceil(message.length / 160)} SMS` : ''}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Send To</label>
              <div className="chip chip-blue">All Parents ({students.filter(s => s.parent?.phone || s.emergencyPhone).length} contacts)</div>
            </div>
            <button className="btn btn-primary w-full" disabled={!message || sendMutation.isPending} onClick={() => sendMutation.mutate()}>
              {sendMutation.isPending
                ? <><RefreshCw size={14} /> Sending…</>
                : <><Send size={14} /> Send {channel.toUpperCase()} Now</>}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Preview</h3></div>
          <div className="card-body">
            <div style={{ background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, minHeight: 200 }}>
              {preview || message
                ? <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{preview || message}</div>
                : <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 60 }}>Select template or type message</div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Templates ─────────────────────────────────────────────────── */
function TemplatesTab() {
  const qc = useQueryClient();
  const [filterCat, setFilterCat] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [form, setForm] = useState({ name: '', type: 'sms', category: 'fee_reminder', subject: '', body: '' });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notif-templates', filterCat],
    queryFn: () => api.get('/automation/templates', { params: { category: filterCat || undefined } }).then(r => r.data.data || []).catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/automation/templates', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-templates'] }); setShowAdd(false); toast.success('Template created!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/automation/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-templates'] }); toast.success('Deleted'); },
    onError: err => toast.error(err.response?.data?.message || 'Cannot delete default template'),
  });

  const handlePreview = async (id) => {
    try {
      const res = await api.post(`/automation/templates/${id}/preview`);
      setPreviewId(id); setPreviewText(res.data.data.preview);
    } catch (_) {}
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ flex: '0 0 180px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button className="btn btn-teal btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> New Template
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #0073b7' }}>
          <div className="card-header" style={{ background: '#eff6ff' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>New Template</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fee Reminder — Friendly" />
              </div>
              <div className="form-group">
                <label className="form-label">Channel</label>
                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {['sms', 'whatsapp', 'email', 'push', 'all'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            {form.type === 'email' && (
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Body *</label>
              <textarea className="form-input" rows={5} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="Use {{parent_name}}, {{student_name}}, {{amount}}, {{month}}, {{class}}, {{date}}, {{school_name}} tags" />
            </div>
            <button className="btn btn-primary" onClick={() => createMutation.mutate()} disabled={!form.name || !form.body || createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>
      )}

      {previewId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPreviewId(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 500, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Preview (Sample Data)</div>
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{previewText}</div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setPreviewId(null)}>Close</button>
          </div>
        </div>
      )}

      {isLoading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {templates.map(t => {
            const cat = CATEGORIES.find(c => c.id === t.category);
            const CatIcon = cat?.icon || Megaphone;
            const ch = CHANNEL_COLORS[t.type] || CHANNEL_COLORS.sms;
            return (
              <div key={t.id} className="card" style={{ borderTop: `3px solid ${cat?.color || '#64748b'}` }}>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CatIcon size={13} color={cat?.color || '#64748b'} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f' }}>{t.name}</span>
                      {t.isDefault && <span className="chip chip-blue" style={{ fontSize: 10 }}>Default</span>}
                    </div>
                    <span className="chip" style={{ background: ch.bg, color: ch.color, fontSize: 10 }}>{ch.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, background: '#f8f9fa', padding: '8px 10px', borderRadius: 6, maxHeight: 72, overflow: 'hidden' }}>
                    {t.body.substring(0, 160)}{t.body.length > 160 ? '…' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => handlePreview(t.id)}>
                      <Eye size={11} /> Preview
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(t.body); toast.success('Copied!'); }}>
                      <Copy size={11} /> Copy
                    </button>
                    {!t.isDefault && (
                      <button className="btn-icon-only" style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        onClick={() => { if (window.confirm('Delete?')) deleteMutation.mutate(t.id); }}>×</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Automation ────────────────────────────────────────────────── */
function AutomationTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: 'fee_reminder', channel: 'sms', runDays: [5, 10, 15], runTime: '09:00', templateId: '' });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => api.get('/automation/rules').then(r => r.data.data || []).catch(() => []),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['notif-templates'],
    queryFn: () => api.get('/automation/templates').then(r => r.data.data || []).catch(() => []),
  });

  const createRule = useMutation({
    mutationFn: () => api.post('/automation/rules', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); setShowAdd(false); toast.success('Rule created!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const toggleRule = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/automation/rules/${id}`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); },
  });

  const triggerRule = useMutation({
    mutationFn: id => api.post(`/automation/rules/${id}/trigger`),
    onSuccess: () => toast.success('Rule triggered!'),
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteRule = useMutation({
    mutationFn: id => api.delete(`/automation/rules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); toast.success('Deleted'); },
  });

  const TRIGGER_OPTIONS = [
    { value: 'fee_reminder',     label: 'Fee Reminder',            desc: 'Send to unpaid-fee parents on configured days' },
    { value: 'absent_alert',     label: 'Absent Alert',            desc: 'Notify parents of absent students daily (Mon–Sat)' },
    { value: 'birthday_wish',    label: 'Birthday Wish',           desc: 'Auto-wish students on their birthdays' },
    { value: 'daily_collection', label: 'Daily Collection Report', desc: 'Email admin daily collection summary (Mon–Sat)' },
  ];

  const handleDayToggle = d =>
    setForm(f => ({ ...f, runDays: f.runDays.includes(d) ? f.runDays.filter(x => x !== d) : [...f.runDays, d].sort((a, b) => a - b) }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 14 }}>Automation Rules</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Auto-send notifications via server cron jobs (Pakistan Standard Time)</div>
        </div>
        <button className="btn btn-teal btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> New Rule</button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Zap size={14} />
        <span><strong>How it works:</strong> Rules run automatically on the server. Fee reminders run at 9:00 AM on your configured days. Absent alerts run Mon–Sat at 8:00 AM after attendance is marked.</span>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #7c3aed' }}>
          <div className="card-header" style={{ background: '#f5f3ff' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>New Automation Rule</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rule Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Fee Reminder" />
              </div>
              <div className="form-group">
                <label className="form-label">Trigger</label>
                <select className="form-select" value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })}>
                  {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Channel</label>
                <select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="all">All Channels</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Template</label>
              <select className="form-select" value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}>
                <option value="">— Default template —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {form.trigger === 'fee_reminder' && (
              <div className="form-group">
                <label className="form-label">Run on Days of Month</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <button key={d} onClick={() => handleDayToggle(d)}
                      style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid', borderColor: form.runDays.includes(d) ? '#7c3aed' : '#e2e8f0', background: form.runDays.includes(d) ? '#7c3aed' : 'white', color: form.runDays.includes(d) ? 'white' : '#374151', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      {d}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Selected: {form.runDays.join(', ')} of each month</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Time</label>
              <input type="time" className="form-input" style={{ maxWidth: 140 }} value={form.runTime} onChange={e => setForm({ ...form, runTime: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={() => createRule.mutate()} disabled={!form.name || createRule.isPending}>
              {createRule.isPending ? 'Creating…' : 'Create Rule'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? <div className="loading-center"><div className="spinner" /></div> :
        rules.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Zap size={40} /></div>
              <div className="empty-state-text">No automation rules</div>
              <div className="empty-state-sub">Create rules to auto-send fee reminders, absent alerts, birthday wishes</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rules.map(rule => {
              const trigger = TRIGGER_OPTIONS.find(t => t.value === rule.trigger);
              const ch = CHANNEL_COLORS[rule.channel] || CHANNEL_COLORS.sms;
              const days = rule.runDays ? JSON.parse(rule.runDays) : [];
              return (
                <div key={rule.id} className="card" style={{ opacity: rule.isActive ? 1 : 0.6 }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {rule.name}
                        <span className={`chip ${rule.isActive ? 'chip-green' : 'chip-gray'}`} style={{ fontSize: 10 }}>
                          {rule.isActive ? '● Active' : '○ Paused'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{trigger?.label}</span>
                        <span className="chip" style={{ background: ch.bg, color: ch.color, fontSize: 10 }}>{ch.label}</span>
                        {days.length > 0 && <span>Days: {days.join(', ')}</span>}
                        {rule.runTime && <span>⏰ {rule.runTime}</span>}
                      </div>
                      {rule.lastRunAt && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          Last: {new Date(rule.lastRunAt).toLocaleString('en-PK')} · {rule.totalRuns} runs
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }}
                        onClick={() => triggerRule.mutate(rule.id)} disabled={triggerRule.isPending}>
                        <PlayCircle size={12} /> Run Now
                      </button>
                      <button className={`btn btn-sm ${rule.isActive ? 'btn-outline' : 'btn-primary'}`} style={{ fontSize: 11 }}
                        onClick={() => toggleRule.mutate({ id: rule.id, isActive: !rule.isActive })}>
                        {rule.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button className="btn-icon-only" style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        onClick={() => { if (window.confirm('Delete?')) deleteRule.mutate(rule.id); }}>×</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

/* ── History ───────────────────────────────────────────────────── */
function HistoryTab() {
  const { data: stats } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: () => api.get('/automation/stats').then(r => r.data.data).catch(() => ({})),
  });
  const logs = stats?.logs || [];
  return (
    <div>
      {logs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Clock size={40} /></div>
            <div className="empty-state-text">No notification history yet</div>
            <div className="empty-state-sub">Send notifications or trigger automation rules to see history</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header"><h3>Notification History</h3></div>
          <table className="table-modern">
            <thead><tr>{['Channel', 'Title', 'Details', 'Status', 'Date'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {logs.map(l => {
                const ch = CHANNEL_COLORS[l.type] || CHANNEL_COLORS.sms;
                return (
                  <tr key={l.id}>
                    <td><span className="chip" style={{ background: ch.bg, color: ch.color }}>{ch.label}</span></td>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{l.title || '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.body}</td>
                    <td><span className={`chip ${l.status === 'sent' ? 'chip-green' : 'chip-red'}`}>{l.status}</span></td>
                    <td style={{ fontSize: 11.5, color: '#64748b' }}>{l.sentAt ? new Date(l.sentAt).toLocaleString('en-PK') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('inbox');
  const tabComponents = { inbox: InboxTab, overview: OverviewTab, send: SendNowTab, templates: TemplatesTab, automation: AutomationTab, history: HistoryTab };
  const Tab = tabComponents[activeTab];

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 100%)', borderRadius: 12, padding: '18px 22px', marginBottom: 20, color: 'white' }}>
        <div className="ilm-page-header" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="ilm-page-title">📱 Send Notifications</h1>
            <p className="ilm-page-subtitle">Reach parents and staff instantly via SMS, WhatsApp and Email</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['SMS', 'WhatsApp', 'Email'].map(ch => (
              <div key={ch} style={{
                background: 'rgba(255,255,255,0.2)', color: 'white',
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.3)',
              }}>{ch}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📢</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>SMS · WhatsApp · Email · Push · 12 Templates · Auto Scheduler · History</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link to="/notifications/sms" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>
              <MessageSquare size={12} /> Quick SMS
            </Link>
            <Link to="/push" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 12 }}>
              <Bell size={12} /> Push
            </Link>
          </div>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '11px 18px', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? '#0073b7' : '#64748b', border: 'none', background: 'none', cursor: 'pointer', borderBottom: `2px solid ${activeTab === tab.id ? '#0073b7' : 'transparent'}`, marginBottom: -2, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      <Tab />
    </div>
  );
}
