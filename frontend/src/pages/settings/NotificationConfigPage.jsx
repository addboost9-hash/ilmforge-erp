import { useState } from 'react';
import { Bell, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationConfigPage() {
  const [prefs, setPrefs] = useState({
    attendanceAlerts: true,
    feeAlerts: true,
    examAlerts: true,
    complaintAlerts: true,
    channelApp: true,
    channelSms: false,
    channelEmail: true,
    channelWhatsapp: false,
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
              <input type="checkbox" checked={prefs[k]} onChange={() => toggle(k)} />
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
              <input type="checkbox" checked={prefs[k]} onChange={() => toggle(k)} />
              <span>{label}</span>
            </label>
          ))}
        </section>
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => toast.success('Notification preferences saved locally.')}
          style={{ border: 'none', background: '#0D9488', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Save size={14} /> Save Preferences
        </button>
      </div>
    </div>
  );
}

const box = { border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, background: '#F8FAFC' };
const head = { fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 };
const row = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', marginBottom: 8 };
