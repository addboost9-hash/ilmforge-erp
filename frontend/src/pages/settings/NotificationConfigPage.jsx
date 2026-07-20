import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const DEFAULT_PREFS = {
  attendanceAlerts: true,
  feeAlerts: true,
  examAlerts: true,
  complaintAlerts: true,
  channelApp: true,
  channelSms: false,
  channelEmail: true,
  channelWhatsapp: false,
};

export default function NotificationConfigPage() {
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [savedOk, setSavedOk] = useState(false);

  /* Load preferences from backend */
  const { data: savedPrefs } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => api.get('/settings/notifications').then(r => r.data.data),
  });

  useEffect(() => {
    if (savedPrefs) setPrefs({ ...DEFAULT_PREFS, ...savedPrefs });
  }, [savedPrefs]);

  /* Save preferences to backend */
  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings/notifications', data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
      setSavedOk(true);
      toast.success('Notification preferences saved.');
      setTimeout(() => setSavedOk(false), 2500);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save notification preferences.');
    },
  });

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={16} color="#B91C1C" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Notification Configuration</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Set event and channel preferences for school alerts.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <section style={box}>
          <div style={head}>Events</div>
          {[
            ['attendanceAlerts', 'Attendance alerts'],
            ['feeAlerts', 'Fee due/paid alerts'],
            ['examAlerts', 'Exam announcements'],
            ['complaintAlerts', 'Complaint updates'],
          ].map(([k, label]) => (
            <label key={k} style={row}>
              <input type="checkbox" checked={!!prefs[k]} onChange={() => toggle(k)} />
              <span>{label}</span>
            </label>
          ))}
        </section>

        <section style={box}>
          <div style={head}>Channels</div>
          {[
            ['channelApp', 'In-app notifications'],
            ['channelSms', 'SMS notifications'],
            ['channelEmail', 'Email notifications'],
            ['channelWhatsapp', 'WhatsApp notifications'],
          ].map(([k, label]) => (
            <label key={k} style={row}>
              <input type="checkbox" checked={!!prefs[k]} onChange={() => toggle(k)} />
              <span>{label}</span>
            </label>
          ))}
        </section>
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => saveMutation.mutate(prefs)}
          disabled={saveMutation.isPending}
          style={{ border: 'none', background: '#0D9488', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: saveMutation.isPending ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saveMutation.isPending ? 0.7 : 1 }}
        >
          {savedOk
            ? <><CheckCircle size={14} /> Saved!</>
            : <><Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save Preferences'}</>
          }
        </button>
      </div>
    </div>
  );
}

const box = { border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, background: '#F8FAFC' };
const head = { fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 };
const row = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', marginBottom: 8 };
