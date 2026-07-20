/**
 * IlmForge Messenger — WhatsApp-style role-structured chat
 * =========================================================
 * Left: conversations grouped by role (Teachers / Parents / Staff).
 * Right: thread + composer. Features: direct chats (role-guarded),
 * class broadcasts (teacher/admin), document/image attachments (<=2MB),
 * 5s polling, read status ticks, mobile responsive.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import {
  MessageCircle, Send, Paperclip, Plus, Megaphone, Search,
  FileText, Image as ImageIcon, Download, X, ChevronLeft, Users,
  CheckCheck, Check,
} from 'lucide-react';

const roleColor = { admin: '#0D9488', super_admin: '#0D9488', teacher: '#7C3AED', parent: '#F59E0B', student: '#2563EB', accountant: '#0891B2', gatekeeper: '#65A30D' };
const roleLabel = { admin: 'Admin', super_admin: 'Admin', teacher: 'Teacher', parent: 'Parent', student: 'Student', accountant: 'Accountant', gatekeeper: 'Gatekeeper' };

/* Group conversations into labelled buckets for the sidebar */
const GROUPS = [
  { label: 'Broadcasts', roles: ['class_broadcast'], isBroadcast: true },
  { label: 'Teachers',   roles: ['teacher'] },
  { label: 'Parents',    roles: ['parent'] },
  { label: 'Staff',      roles: ['admin', 'super_admin', 'accountant', 'gatekeeper'] },
  { label: 'Students',   roles: ['student'] },
];

function groupConversations(convos) {
  const grouped = {};
  const used = new Set();
  for (const g of GROUPS) {
    const matches = convos.filter(c => {
      if (g.isBroadcast) return c.type === 'class_broadcast' && !used.has(c.id);
      return c.type !== 'class_broadcast' && g.roles.includes(c.otherRole) && !used.has(c.id);
    });
    if (matches.length) {
      grouped[g.label] = matches;
      matches.forEach(c => used.add(c.id));
    }
  }
  // Uncategorised fallback
  const rest = convos.filter(c => !used.has(c.id));
  if (rest.length) grouped['Other'] = rest;
  return grouped;
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [active, setActive] = useState(null);
  const [text, setText] = useState('');
  const [attach, setAttach] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [mobileThread, setMobileThread] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const { data: convos = [] } = useQuery({
    queryKey: ['chat-convos'],
    queryFn: () => api.get('/chat/conversations').then(r => r.data.data || []),
    refetchInterval: 6000,
  });
  const { data: messages = [] } = useQuery({
    queryKey: ['chat-msgs', active?.id],
    queryFn: () => api.get(`/chat/conversations/${active.id}/messages`).then(r => r.data.data || []),
    enabled: !!active,
    refetchInterval: 5000,
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['chat-contacts'],
    queryFn: () => api.get('/chat/contacts').then(r => r.data.data || []),
    enabled: showNew,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['chat-classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
    enabled: showNew && ['teacher', 'admin', 'super_admin'].includes(user?.role),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, active?.id]);

  const send = useMutation({
    mutationFn: () => api.post(`/chat/conversations/${active.id}/messages`, {
      body: text || null,
      ...(attach && { attachmentName: attach.name, attachmentType: attach.type, attachmentData: attach.data }),
    }),
    onSuccess: () => { setText(''); setAttach(null); qc.invalidateQueries({ queryKey: ['chat-msgs', active.id] }); qc.invalidateQueries({ queryKey: ['chat-convos'] }); },
  });
  const startDirect = useMutation({
    mutationFn: (userId) => api.post('/chat/conversations/direct', { userId }),
    onSuccess: (r) => { setShowNew(false); qc.invalidateQueries({ queryKey: ['chat-convos'] }).then(() => { setActive({ id: r.data.data.id, title: 'Chat', type: 'direct' }); setMobileThread(true); }); },
  });
  const startBroadcast = useMutation({
    mutationFn: (classId) => api.post('/chat/conversations/broadcast', { classId }),
    onSuccess: (r) => { setShowNew(false); qc.invalidateQueries({ queryKey: ['chat-convos'] }).then(() => { setActive({ id: r.data.data.id, title: r.data.data.title, type: 'class_broadcast' }); setMobileThread(true); }); },
  });

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert('Max 2MB file'); return; }
    const reader = new FileReader();
    reader.onload = () => setAttach({ name: f.name, type: f.type, data: reader.result });
    reader.readAsDataURL(f);
  };
  const downloadAttach = (m) => {
    const a = document.createElement('a');
    a.href = m.attachmentData; a.download = m.attachmentName || 'file'; a.click();
  };

  const timeStr = (d) => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  const isBroadcastLocked = active?.type === 'class_broadcast' && !['teacher', 'admin', 'super_admin'].includes(user?.role);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 190px)', minHeight: 480 }}>
      <div className="flex h-full">
        {/* ═══ LEFT: Conversations ═══ */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${mobileThread ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2"><MessageCircle className="w-4 h-4 text-teal-600" /> Messenger</h3>
            <button onClick={() => setShowNew(true)} className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 ? (
              <div className="text-center py-14 px-6">
                <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No conversations yet — use the + button to start a chat</p>
              </div>
            ) : (
              Object.entries(groupConversations(convos)).map(([groupLabel, groupConvos]) => (
                <div key={groupLabel}>
                  {/* Group header */}
                  <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
                    <Users style={{ width: 11, height: 11 }} />
                    {groupLabel}
                    <span className="ml-auto font-bold normal-case text-[9px] text-slate-300">{groupConvos.length}</span>
                  </div>
                  {groupConvos.map(c => (
                    <button key={c.id} onClick={() => { setActive(c); setMobileThread(true); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 hover:bg-slate-50 transition ${active?.id === c.id ? 'bg-teal-50/70' : ''}`}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                        style={{ background: c.type === 'class_broadcast' ? '#EA580C' : (roleColor[c.otherRole] || '#64748B') }}>
                        {c.type === 'class_broadcast'
                          ? <Megaphone style={{ width: 18, height: 18 }} />
                          : (c.title || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800 truncate">{c.title || 'Chat'}</span>
                          {c.lastMessage && <span className="text-[10px] text-slate-400 shrink-0">{timeStr(c.lastMessage.createdAt)}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 truncate">
                            {c.lastMessage?.body || (c.lastMessage?.attachmentName ? `\u{1F4CE} ${c.lastMessage.attachmentName}` : 'Start conversation…')}
                          </span>
                          {c.unread > 0
                            ? <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-teal-600 text-white text-[10px] font-extrabold flex items-center justify-center">{c.unread}</span>
                            : c.lastMessage && <CheckCheck style={{ width: 13, height: 13, flexShrink: 0, color: '#0D9488' }} />
                          }
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Thread ═══ */}
        <div className={`flex-1 flex flex-col ${mobileThread ? '' : 'hidden md:flex'}`}>
          {active ? (<>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <button onClick={() => setMobileThread(false)} className="md:hidden p-1 text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold"
                style={{ background: active.type === 'class_broadcast' ? '#EA580C' : (roleColor[active.otherRole] || '#0D9488') }}>
                {active.type === 'class_broadcast' ? <Megaphone className="w-4 h-4" /> : (active.title || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-800">{active.title}</div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  {active.type === 'class_broadcast' ? 'Class broadcast — students + parents' : roleLabel[active.otherRole] || ''}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5" style={{ background: 'linear-gradient(180deg,#F8FAFC, #F0FDFA33)' }}>
              {messages.map(m => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${mine ? 'bg-teal-600 text-white rounded-br-md' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md'}`}>
                      {!mine && <div className="text-[10px] font-extrabold mb-0.5" style={{ color: roleColor[m.senderRole] || '#64748B' }}>{m.senderName} · {roleLabel[m.senderRole]}</div>}
                      {m.attachmentData && (
                        m.attachmentType?.startsWith('image/')
                          ? <img src={m.attachmentData} alt={m.attachmentName} className="rounded-xl mb-1.5 max-h-52 cursor-pointer" onClick={() => downloadAttach(m)} />
                          : <button onClick={() => downloadAttach(m)} className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-1.5 text-xs font-bold w-full ${mine ? 'bg-white/15' : 'bg-slate-50 border border-slate-100'}`}>
                              <FileText className="w-4 h-4 shrink-0" /><span className="truncate flex-1 text-left">{m.attachmentName}</span><Download className="w-3.5 h-3.5 shrink-0" />
                            </button>
                      )}
                      {m.body && <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>}
                      <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${mine ? 'text-white/60' : 'text-slate-300'}`}>
                        {timeStr(m.createdAt)}
                        {mine && (
                          m.readAt
                            ? <CheckCheck style={{ width: 11, height: 11, color: mine ? '#a7f3d0' : '#0D9488' }} />
                            : <Check style={{ width: 11, height: 11 }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            {isBroadcastLocked ? (
              <div className="px-4 py-3 border-t border-slate-100 text-center text-[11px] text-slate-400 font-semibold bg-slate-50">📢 Broadcast — sirf teacher/admin messages bhej sakte hain</div>
            ) : (
              <div className="border-t border-slate-100 p-3">
                {attach && (
                  <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 mb-2 text-xs">
                    {attach.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-teal-600" /> : <FileText className="w-4 h-4 text-teal-600" />}
                    <span className="font-bold text-slate-700 truncate flex-1">{attach.name}</span>
                    <button onClick={() => setAttach(null)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 transition">
                    <Paperclip className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                  </button>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
                  <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder="Message likhein…"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text || attach) send.mutate(); } }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500 resize-none max-h-28" />
                  <button onClick={() => send.mutate()} disabled={(!text && !attach) || send.isPending}
                    className="p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition shadow-lg shadow-teal-600/25">
                    <Send className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              </div>
            )}
          </>) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-3"><MessageCircle className="w-8 h-8 text-teal-500" /></div>
              <h3 className="font-extrabold text-slate-700">IlmForge Messenger</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Parents, teachers, students aur admin — sab role-wise securely connected. Documents bhi share kar sakte hain.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ New chat modal ═══ */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm">New Conversation</h3>
              <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            {['teacher', 'admin', 'super_admin'].includes(user?.role) && classes.length > 0 && (
              <div className="p-3 border-b border-slate-100">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase mb-2 flex items-center gap-1"><Megaphone className="w-3 h-3" /> Class Broadcast</div>
                <div className="flex gap-1.5 flex-wrap">
                  {classes.map(c => (
                    <button key={c.id} onClick={() => startBroadcast.mutate(c.id)}
                      className="text-[11px] font-bold border border-orange-200 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-100 transition">
                      📢 {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {contacts.filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase())).slice(0, 60).map(c => (
                <button key={c.id} onClick={() => startDirect.mutate(c.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold" style={{ background: roleColor[c.role] || '#64748B' }}>
                    {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div><div className="text-sm font-bold text-slate-700">{c.name}</div>
                    <div className="text-[10px] font-bold" style={{ color: roleColor[c.role] }}>{roleLabel[c.role]}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
