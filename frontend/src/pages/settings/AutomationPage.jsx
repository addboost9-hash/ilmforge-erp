import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Zap, Calendar, DollarSign, Briefcase, Cake, Database, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'ilmforge_automation_settings';

const TASKS = [
  {
    id: 'auto_fee_generate',
    icon: DollarSign,
    color: '#15803D',
    title: 'Auto Fee Generate',
    desc: 'Automatically generate monthly fee invoices for all students on a specific day of the month.',
    settings: [
      { key: 'enabled',   label: 'Enable Auto Fee Generation', type: 'toggle' },
      { key: 'day',       label: 'Generate on Day of Month', type: 'number', placeholder: 'e.g. 1 (first day)' },
      { key: 'feeTitle',  label: 'Default Fee Title', type: 'text', placeholder: 'Monthly Fee of {month}' },
    ],
    defaults: { enabled: false, day: '1', feeTitle: 'Monthly Fee' },
  },
  {
    id: 'auto_salary_generate',
    icon: Briefcase,
    color: '#2563EB',
    title: 'Auto Salary Generate',
    desc: 'Automatically generate salary records for all active staff at the end of each month.',
    settings: [
      { key: 'enabled',  label: 'Enable Auto Salary Generation', type: 'toggle' },
      { key: 'day',      label: 'Generate on Day of Month', type: 'number', placeholder: 'e.g. 28' },
    ],
    defaults: { enabled: false, day: '28' },
  },
  {
    id: 'auto_birthday_wish',
    icon: Cake,
    color: '#D97706',
    title: 'Auto Birthday Wish',
    desc: 'Automatically send birthday wishes to students and staff on their birthdays via SMS/WhatsApp.',
    settings: [
      { key: 'enabled',     label: 'Enable Birthday Wishes', type: 'toggle' },
      { key: 'sendSMS',     label: 'Send via SMS', type: 'toggle' },
      { key: 'sendWA',      label: 'Send via WhatsApp', type: 'toggle' },
      { key: 'sendTime',    label: 'Send at Time', type: 'time', placeholder: '08:00' },
    ],
    defaults: { enabled: false, sendSMS: true, sendWA: true, sendTime: '08:00' },
  },
  {
    id: 'auto_db_backup',
    icon: Database,
    color: '#7C3AED',
    title: 'Auto Database Backup',
    desc: 'Automatically backup your school database and send a download link to admin email.',
    settings: [
      { key: 'enabled',    label: 'Enable Auto Backup', type: 'toggle' },
      { key: 'frequency',  label: 'Backup Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly'] },
      { key: 'backupTime', label: 'Backup Time', type: 'time', placeholder: '02:00' },
    ],
    defaults: { enabled: false, frequency: 'Daily', backupTime: '02:00' },
  },
];

export default function AutomationPage() {
  const defaultSettings = TASKS.reduce((acc, t) => ({ ...acc, [t.id]: {...t.defaults} }), {});
  const [taskSettings, setTaskSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  /* Load from localStorage */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setTaskSettings(prev => ({ ...prev, ...JSON.parse(stored) })); } catch {}
    }
  }, []);

  const update = (taskId, key, value) => {
    setTaskSettings(prev => ({ ...prev, [taskId]: { ...prev[taskId], [key]: value } }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taskSettings));
    const active = TASKS.filter(t => taskSettings[t.id]?.enabled).map(t => t.title);
    setSaved(true);
    toast.success(active.length ? `Automation saved! Active: ${active.join(', ')}` : 'Settings saved. All automations off.');
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Task Automation</h1>
          <p className="page-subtitle">Configure automated tasks that run on a schedule</p>
        </div>
        <button className="btn btn-teal" onClick={handleSave}>
          {saved ? <><CheckCircle size={14}/> Saved!</> : <><Save size={15}/> Save Settings</>}
        </button>
      </div>

      <div className="alert alert-warning" style={{ marginBottom:16 }}>
        <AlertTriangle size={15}/>
        <span>Automation tasks require the server to be running continuously. Turning off the server will pause all scheduled tasks.</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {TASKS.map(task => {
          const Icon = task.icon;
          const ts = taskSettings[task.id];
          const isEnabled = ts?.enabled;

          return (
            <div key={task.id} className="card" style={{ borderLeft: `4px solid ${task.color}`, opacity: isEnabled ? 1 : 0.75 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:task.color+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={22} color={task.color}/>
                  </div>
                  <div>
                    <div style={{ fontSize:14.5, fontWeight:700, color:'#1E3A5F' }}>{task.title}</div>
                    <div style={{ fontSize:12.5, color:'#64748B', maxWidth:480, lineHeight:1.5 }}>{task.desc}</div>
                  </div>
                </div>

                {/* Main toggle */}
                <div
                  onClick={() => update(task.id, 'enabled', !ts?.enabled)}
                  style={{
                    width:46, height:24, borderRadius:12, position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0,
                    background: isEnabled ? task.color : '#CBD5E1',
                  }}>
                  <div style={{ position:'absolute', top:4, left:isEnabled?25:4, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                </div>
              </div>

              {/* Status badge */}
              <div style={{ marginBottom:14 }}>
                <span className={`badge ${isEnabled?'badge-green':'badge-gray'}`}>
                  {isEnabled ? '✓ Active' : '○ Inactive — Not configured'}
                </span>
              </div>

              {/* Settings fields */}
              {isEnabled && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, paddingTop:14, borderTop:'1px solid #F1F5F9' }}>
                  {task.settings.filter(s => s.type !== 'toggle' || s.key !== 'enabled').map(setting => {
                    if (setting.type === 'toggle') return (
                      <div key={setting.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div onClick={() => update(task.id, setting.key, !ts?.[setting.key])}
                          style={{ width:36, height:20, borderRadius:10, position:'relative', cursor:'pointer', background:ts?.[setting.key]?task.color:'#CBD5E1', transition:'background 0.2s', flexShrink:0 }}>
                          <div style={{ position:'absolute', top:3, left:ts?.[setting.key]?19:3, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
                        </div>
                        <span style={{ fontSize:12.5, color:'#374151' }}>{setting.label}</span>
                      </div>
                    );
                    if (setting.type === 'select') return (
                      <div key={setting.key} className="form-group" style={{ marginBottom:0 }}>
                        <label className="form-label">{setting.label}</label>
                        <select className="form-select" value={ts?.[setting.key]||''} onChange={e => update(task.id, setting.key, e.target.value)}>
                          {setting.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                    return (
                      <div key={setting.key} className="form-group" style={{ marginBottom:0 }}>
                        <label className="form-label">{setting.label}</label>
                        <input className="form-input" type={setting.type} placeholder={setting.placeholder}
                          value={ts?.[setting.key]||''} onChange={e => update(task.id, setting.key, e.target.value)}/>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
