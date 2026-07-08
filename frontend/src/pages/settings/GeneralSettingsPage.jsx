/**
 * IlmForge — General Settings
 * All fields from screenshots: school info, currency, timezone,
 * session management, roll ID sequence, barcode settings
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { Save, School, Globe, Clock, Hash, Settings, CheckCircle } from 'lucide-react';

const TIMEZONES = [
  'Asia/Karachi','Asia/Kolkata','Asia/Dubai','Asia/Riyadh',
  'Europe/London','America/New_York','America/Chicago','UTC',
];
const CURRENCIES = ['PKR','USD','AED','SAR','GBP','EUR','INR'];
const INSTITUTION_TYPES = ['School','College','University','Academy','Institute','Madrasa'];

export default function GeneralSettingsPage() {
  const { school, updateSchool } = useAuthStore();
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data),
  });

  const [form, setForm] = useState({
    name:             '',
    smsSignature:     '',
    address:          '',
    phone:            '',
    email:            '',
    currency:         'PKR',
    timezone:         'Asia/Karachi',
    runningSession:   '2025-2026',
    showClassOnDash:  'Yes',
    institutionType:  'School',
    rollIdSequence:   '',
    barcodeAttMsg:    'No',
    city:             '',
    subdomain:        '',
  });

  useEffect(() => {
    if (data) {
      setForm(f => ({
        ...f,
        name:    data.name    || '',
        address: data.address || '',
        phone:   data.phone   || '',
        email:   data.email   || '',
        city:    data.city    || '',
      }));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.put('/settings/school', {
      name:    form.name,
      address: form.address,
      phone:   form.phone,
      email:   form.email,
      city:    form.city,
    }),
    onSuccess: () => {
      setSaved(true);
      toast.success('General settings saved successfully!');
      setTimeout(() => setSaved(false), 3000);
      if (updateSchool) updateSchool({ ...school, ...form });
      try { localStorage.setItem('registeredSchoolName', form.name); } catch {}
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save settings'),
  });

  const Field = ({ label, name, type = 'text', placeholder, tip, span = 1, options }) => (
    <div style={{ gridColumn: `span ${span}` }}>
      <label className="form-label">{label}</label>
      {options ? (
        <select className="form-select" value={form[name]} onChange={e => setForm(f => ({...f, [name]: e.target.value}))}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="form-input" type={type} placeholder={placeholder} value={form[name]}
          onChange={e => setForm(f => ({...f, [name]: e.target.value}))} />
      )}
      {tip && <p style={{ fontSize:11.5, color:'#3B82F6', marginTop:3 }}>{tip}</p>}
    </div>
  );

  if (isLoading) return <div className="loading-center"><div className="spinner"/></div>;

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="page-title">General Settings</h1>
          <p className="page-subtitle">System-wide configuration for your school</p>
        </div>
        <button className="btn btn-teal" onClick={() => save.mutate()} disabled={save.isPending}>
          {saved ? <><CheckCircle size={15}/> Saved!</> : <><Save size={15}/> {save.isPending?'Saving…':'Save Changes'}</>}
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── School Identity ── */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'#F0FDFA',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <School size={16} color="#0F766E"/>
            </div>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111827' }}>School Identity</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
            <Field label="School Name *" name="name" placeholder="Future Foundation School" span={2}/>
            <Field label="SMS Signature" name="smsSignature" placeholder="Future Foundation School"
              tip="This name appears at the end of all SMS messages sent from the system." />
            <Field label="School Phone" name="phone" placeholder="03001234567" />
            <Field label="School Email" name="email" type="email" placeholder="info@school.com" span={2}/>
            <Field label="City" name="city" placeholder="Islamabad" />
            <Field label="Full Address" name="address" placeholder="Street, Area, City" />
          </div>
        </div>

        {/* ── Regional Settings ── */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'#EFF6FF',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Globe size={16} color="#2563EB"/>
            </div>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111827' }}>Regional Settings</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            <Field label="Currency" name="currency" options={CURRENCIES} />
            <Field label="Timezone" name="timezone" options={TIMEZONES} />
            <Field label="Institution Type" name="institutionType" options={INSTITUTION_TYPES} />
          </div>
        </div>

        {/* ── Session & Display ── */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'#FFFBEB',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Clock size={16} color="#D97706"/>
            </div>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111827' }}>Session & Display</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
            <div>
              <label className="form-label">Running Session</label>
              <select className="form-select" value={form.runningSession}
                onChange={e => setForm(f=>({...f, runningSession:e.target.value}))}>
                {['2023-2024','2024-2025','2025-2026','2026-2027'].map(s=><option key={s}>{s}</option>)}
              </select>
              <p style={{ fontSize:11.5, color:'#EF4444', marginTop:3 }}>
                Changing session will affect exam management system only.
              </p>
            </div>
            <Field label="Show Class List On Dashboard" name="showClassOnDash"
              options={['Yes','No']} />
          </div>
        </div>

        {/* ── Roll ID & Barcode ── */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Hash size={16} color="#7C3AED"/>
            </div>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111827' }}>Roll ID & Barcode</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
            <div>
              <label className="form-label">Roll ID Sequence</label>
              <input className="form-input" placeholder="e.g. ST-{year}-{number}"
                value={form.rollIdSequence}
                onChange={e => setForm(f=>({...f, rollIdSequence:e.target.value}))} />
              <p style={{ fontSize:11.5, color:'#6B7280', marginTop:3 }}>
                Leave blank to use default auto-increment sequence.
              </p>
            </div>
            <div>
              <label className="form-label">Barcode Attendance IN/OUT Message</label>
              <select className="form-select" value={form.barcodeAttMsg}
                onChange={e => setForm(f=>({...f, barcodeAttMsg:e.target.value}))}>
                {['Yes','No'].map(v=><option key={v}>{v}</option>)}
              </select>
              <p style={{ fontSize:11.5, color:'#6B7280', marginTop:3 }}>
                Show IN/OUT notification when student scans barcode.
              </p>
            </div>
          </div>
        </div>

        {/* ── Current Info Preview ── */}
        <div className="card" style={{ background:'#F0FDFA', border:'1px solid #CCFBF1' }}>
          <div className="card-title" style={{ marginBottom:12 }}>Current School Info Preview</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, fontSize:13 }}>
            {[
              ['School', form.name || data?.name],
              ['Email', form.email || data?.email],
              ['Phone', form.phone || data?.phone],
              ['City', form.city || data?.city],
              ['Currency', form.currency],
              ['Timezone', form.timezone],
              ['Session', form.runningSession],
              ['Type', form.institutionType],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', gap:6 }}>
                <span style={{ color:'#6B7280', fontWeight:500, minWidth:65 }}>{l}:</span>
                <span style={{ fontWeight:600, color:'#0F4C45' }}>{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
