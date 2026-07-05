import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { BellRing, Send, RefreshCw } from 'lucide-react';

export default function PushManagementPage() {
  const qc = useQueryClient();

  const [tokenForm, setTokenForm] = useState({ token: '', platform: 'web', deviceId: 'admin-browser', topics: 'all,alerts' });
  const [sendForm, setSendForm] = useState({ userIds: '', title: '', body: '' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', role: 'admin', topic: 'all' });

  const tokensQ = useQuery({
    queryKey: ['push-tokens'],
    queryFn: () => api.get('/push/tokens?page=1&limit=50').then((r) => r.data),
    staleTime: 15_000,
  });

  const registerToken = useMutation({
    mutationFn: () => api.post('/push/tokens', {
      token: tokenForm.token,
      platform: tokenForm.platform,
      deviceId: tokenForm.deviceId,
      appVersion: '1.0.0',
      subscribedTo: tokenForm.topics.split(',').map((t) => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      toast.success('Device token registered.');
      setTokenForm((p) => ({ ...p, token: '' }));
      qc.invalidateQueries({ queryKey: ['push-tokens'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not register token.'),
  });

  const deactivateToken = useMutation({
    mutationFn: (token) => api.delete('/push/tokens', { data: { token } }),
    onSuccess: () => {
      toast.success('Device token deactivated.');
      qc.invalidateQueries({ queryKey: ['push-tokens'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not deactivate token.'),
  });

  const sendDirect = useMutation({
    mutationFn: () => api.post('/push/send', {
      userIds: sendForm.userIds.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => !Number.isNaN(v)),
      title: sendForm.title,
      body: sendForm.body,
      data: { source: 'push-ui' },
    }),
    onSuccess: () => {
      toast.success('Direct push dispatched.');
      setSendForm({ userIds: '', title: '', body: '' });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not send direct push.'),
  });

  const sendBroadcast = useMutation({
    mutationFn: () => api.post('/push/broadcast', {
      title: broadcastForm.title,
      body: broadcastForm.body,
      roles: [broadcastForm.role],
      topic: broadcastForm.topic,
      data: { source: 'push-ui' },
    }),
    onSuccess: () => {
      toast.success('Broadcast push dispatched.');
      setBroadcastForm({ title: '', body: '', role: 'admin', topic: 'all' });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not send broadcast push.'),
  });

  const tokens = tokensQ.data?.data || [];

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BellRing size={18} color="#B91C1C" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 18 }}>Push Management</div>
            <div style={{ color: '#64748B', fontSize: 12 }}>Device tokens, direct push, and broadcast push</div>
          </div>
        </div>
        <button onClick={() => tokensQ.refetch()} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <section style={card}>
          <div style={title}>Register Device Token</div>
          <div style={grid4}>
            <input value={tokenForm.token} onChange={(e) => setTokenForm((p) => ({ ...p, token: e.target.value }))} placeholder="Token" style={inputStyle} />
            <select value={tokenForm.platform} onChange={(e) => setTokenForm((p) => ({ ...p, platform: e.target.value }))} style={inputStyle}>
              <option value="web">web</option>
              <option value="android">android</option>
              <option value="ios">ios</option>
            </select>
            <input value={tokenForm.deviceId} onChange={(e) => setTokenForm((p) => ({ ...p, deviceId: e.target.value }))} placeholder="Device ID" style={inputStyle} />
            <input value={tokenForm.topics} onChange={(e) => setTokenForm((p) => ({ ...p, topics: e.target.value }))} placeholder="Topics (comma)" style={inputStyle} />
          </div>
          <button
            style={btn('#B91C1C')}
            disabled={registerToken.isPending}
            onClick={() => {
              if (!tokenForm.token.trim()) return toast.error('Token is required.');
              registerToken.mutate();
            }}
          >
            {registerToken.isPending ? 'Saving...' : 'Register Token'}
          </button>
        </section>

        <section style={card}>
          <div style={title}>Send Direct Push</div>
          <div style={grid3}>
            <input value={sendForm.userIds} onChange={(e) => setSendForm((p) => ({ ...p, userIds: e.target.value }))} placeholder="User IDs (comma)" style={inputStyle} />
            <input value={sendForm.title} onChange={(e) => setSendForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" style={inputStyle} />
            <input value={sendForm.body} onChange={(e) => setSendForm((p) => ({ ...p, body: e.target.value }))} placeholder="Body" style={inputStyle} />
          </div>
          <button
            style={btn('#0D9488')}
            disabled={sendDirect.isPending}
            onClick={() => {
              if (!sendForm.userIds.trim() || !sendForm.title.trim() || !sendForm.body.trim()) return toast.error('userIds, title, and body are required.');
              sendDirect.mutate();
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Send size={13} />{sendDirect.isPending ? 'Sending...' : 'Send Direct'}</span>
          </button>
        </section>
      </div>

      <section style={{ ...card, marginBottom: 12 }}>
        <div style={title}>Broadcast Push</div>
        <div style={grid4}>
          <input value={broadcastForm.title} onChange={(e) => setBroadcastForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" style={inputStyle} />
          <input value={broadcastForm.body} onChange={(e) => setBroadcastForm((p) => ({ ...p, body: e.target.value }))} placeholder="Body" style={inputStyle} />
          <select value={broadcastForm.role} onChange={(e) => setBroadcastForm((p) => ({ ...p, role: e.target.value }))} style={inputStyle}>
            <option value="admin">admin</option>
            <option value="accountant">accountant</option>
            <option value="teacher">teacher</option>
            <option value="parent">parent</option>
            <option value="student">student</option>
          </select>
          <input value={broadcastForm.topic} onChange={(e) => setBroadcastForm((p) => ({ ...p, topic: e.target.value }))} placeholder="Topic" style={inputStyle} />
        </div>
        <button
          style={btn('#1D4ED8')}
          disabled={sendBroadcast.isPending}
          onClick={() => {
            if (!broadcastForm.title.trim() || !broadcastForm.body.trim()) return toast.error('title and body are required.');
            sendBroadcast.mutate();
          }}
        >
          {sendBroadcast.isPending ? 'Broadcasting...' : 'Send Broadcast'}
        </button>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={title}>Active Device Tokens</div>
          <div style={{ color: '#64748B', fontSize: 12 }}>{tokens.length} tokens</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['User', 'Platform', 'Device', 'Last Seen', 'Action'].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td style={td}>{t.userId}</td>
                  <td style={td}>{t.platform}</td>
                  <td style={td}>{t.deviceId || '-'}</td>
                  <td style={td}>{new Date(t.lastSeenAt).toLocaleString()}</td>
                  <td style={td}>
                    <button disabled={deactivateToken.isPending} onClick={() => deactivateToken.mutate(t.token)} style={chip('#B91C1C')}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const card = { background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16 };
const title = { fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 8 };
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 };
const grid4 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 };
const inputStyle = { border: '1px solid #CBD5E1', borderRadius: 8, padding: '9px 10px', fontSize: 13, outline: 'none' };
const th = { textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#64748B', fontWeight: 700, borderBottom: '1px solid #E2E8F0' };
const td = { padding: '10px 8px', fontSize: 12.5, color: '#1F2937', borderBottom: '1px solid #F1F5F9' };
const btn = (bg) => ({ border: 'none', background: bg, color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' });
const chip = (c) => ({ border: `1px solid ${c}33`, background: `${c}15`, color: c, borderRadius: 999, fontSize: 11, padding: '4px 8px', fontWeight: 700, cursor: 'pointer' });
