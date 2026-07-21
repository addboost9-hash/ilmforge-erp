import { useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, ArrowLeft, UserPlus, Camera, Upload, X, Hash, ChevronDown, ChevronUp, User, Briefcase, Shield } from 'lucide-react';

/* Preview emp code format based on designation */
function previewEmpCode(designation) {
  const d = (designation||'').toUpperCase();
  let prefix = 'STF';
  if      (d.includes('TEACHER') || d.includes('TUTOR'))    prefix = 'TCH';
  else if (d.includes('PRINCIPAL') || d.includes('HEAD'))   prefix = 'PRI';
  else if (d.includes('ADMIN') || d.includes('MANAGER'))    prefix = 'ADM';
  else if (d.includes('ACCOUNT') || d.includes('FINANCE'))  prefix = 'ACC';
  else if (d.includes('SUPPORT') || d.includes('PEON'))     prefix = 'SPT';
  else if (d.includes('GUARD') || d.includes('SECURITY'))   prefix = 'GRD';
  else if (d.includes('LIBRARIAN'))                         prefix = 'LIB';
  else if (d.includes('DRIVER'))                            prefix = 'DRV';
  const yr = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${yr}-XXXX`;
}

/* ── Section card with collapsible body ─────────────────────────────── */
function SectionCard({ title, subtitle, icon: Icon, accentColor, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: '#fff', borderRadius: 14, marginBottom: 16,
      border: '1px solid #e9edf3',
      boxShadow: '0 2px 10px rgba(27,47,110,0.05)',
      overflow: 'hidden',
    }}>
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
          borderLeft: `4px solid ${accentColor}`,
          borderBottom: open ? '1px solid #f1f5f9' : 'none',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: accentColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={accentColor}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>{subtitle}</div>}
        </div>
        {open ? <ChevronUp size={16} color="#94a3b8"/> : <ChevronDown size={16} color="#94a3b8"/>}
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '18px 18px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Main form ──────────────────────────────────────────────────────── */
export default function StaffFormPage() {
  const nav = useNavigate();
  const photoRef = useRef();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', designation: 'Teacher',
    joiningDate: '', basicSalary: '', salaryType: 'monthly',
    gender: 'male', cnic: '', departmentId: '', dob: '',
  });
  const [createAccount, setCreateAccount] = useState(true);
  const [photoPreview, setPhotoPreview] = useState(null);

  const empCodePreview = useMemo(() => previewEmpCode(form.designation), [form.designation]);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 3*1024*1024) return toast.error('Photo must be less than 3MB');
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const save = useMutation({
    mutationFn: d => api.post('/staff', d),
    onSuccess: (r) => {
      const staffId = r?.data?.data?.id;
      if (photoPreview && staffId) {
        try { localStorage.setItem(`photo_staff_${staffId}`, photoPreview); } catch {}
      }
      toast.success('Staff member saved successfully!');
      nav('/staff');
    },
    onError: err => toast.error('Failed to save staff: ' + (err.response?.data?.message || err.message || 'Unknown error')),
  });

  const handleSubmit = () => {
    if (!form.name || !form.email) return toast.error('Name and email are required');
    save.mutate({
      ...form,
      basicSalary: Math.round(parseFloat(form.basicSalary||0) * 100),
      departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
    });
  };

  return (
    <div className="page-content fade-in">
      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <Link to="/staff" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15}/></Link>
        <div>
          <h1 className="page-title">Add New Staff Member</h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:2 }}>Teacher, accountant, or support staff</p>
        </div>
      </div>

      {/* ── Photo upload card ────────────────────────────────────────── */}
      <div style={{
        background: '#F5F3FF', borderRadius: 14, padding: 18, marginBottom: 16,
        border: '1px solid #DDD6FE', borderLeft: '4px solid #7C3AED',
        display: 'flex', alignItems: 'flex-start', gap: 20,
      }}>
        {/* Photo box */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <div
            onClick={() => photoRef.current?.click()}
            style={{
              width:96, height:112, borderRadius:10, overflow:'hidden',
              border:`2.5px dashed ${photoPreview?'#7C3AED':'#CBD5E1'}`,
              background: photoPreview ? 'transparent' : '#F8FAFC',
              cursor:'pointer', display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center', gap:6,
              transition:'border-color .15s', position:'relative',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Staff" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8 }}/>
            ) : (
              <>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#CBD5E1', marginBottom:-4 }}/>
                <div style={{ width:56, height:28, borderRadius:'16px 16px 0 0', background:'#CBD5E1' }}/>
                <span style={{ fontSize:10, color:'#94A3B8', fontWeight:600, position:'absolute', bottom:8 }}>Add Photo</span>
              </>
            )}
          </div>
          {photoPreview && (
            <button type="button"
              onClick={() => setPhotoPreview(null)}
              style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'#EF4444', border:'2px solid #fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={10} color="#fff"/>
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoChange}/>
        </div>

        <div>
          <div style={{ fontWeight:700, fontSize:14, color:'#4C1D95', marginBottom:5 }}>📸 Staff Photo</div>
          <p style={{ fontSize:12.5, color:'#374151', lineHeight:1.65, marginBottom:10 }}>
            Upload the staff member's photo. It will be <strong>automatically used</strong> on:
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'#7C3AED' }}>
            {['🪪 Staff ID Card','🏆 Experience Certificate','📋 Staff Profile','📄 Salary Slips'].map(item=>(
              <div key={item} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#7C3AED', flexShrink:0 }}/>
                {item}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" style={{ marginTop:12, background:'#7C3AED', color:'#fff', border:'none' }}
            onClick={() => photoRef.current?.click()}>
            <Upload size={13}/> {photoPreview ? 'Change Photo' : 'Upload Photo'}
          </button>
        </div>
      </div>

      {/* ── Section 1: Personal Information ─────────────────────────── */}
      <SectionCard
        title="Personal Information"
        subtitle="Full name, contact details and identification"
        icon={User}
        accentColor="#1B2F6E"
        defaultOpen={true}
      >
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" placeholder="Muhammad Ali Khan" value={form.name} onChange={set('name')}/>
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" placeholder="03001234567" value={form.phone} onChange={set('phone')}/>
          </div>
          <div className="form-group">
            <label className="form-label">CNIC</label>
            <input className="form-input" placeholder="3520100000000" value={form.cnic} onChange={set('cnic')}/>
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" type="date" value={form.dob} onChange={set('dob')}/>
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-select" value={form.gender} onChange={set('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 2: Professional Details ─────────────────────────── */}
      <SectionCard
        title="Professional Details"
        subtitle="Role, department, joining date and compensation"
        icon={Briefcase}
        accentColor="#0073b7"
        defaultOpen={true}
      >
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
          <div className="form-group">
            <label className="form-label" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              Designation
              <span style={{ fontSize:11, background:'#F0FDFA', color:'#0F766E', padding:'2px 8px', borderRadius:99, fontWeight:700, fontFamily:'monospace', border:'1px solid #CCFBF1' }}>
                <Hash size={10} style={{ display:'inline', marginRight:3, verticalAlign:'middle' }}/>{empCodePreview}
              </span>
            </label>
            <input className="form-input" placeholder="Teacher, Principal, etc." value={form.designation} onChange={set('designation')}/>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" placeholder="Science, Arts, Admin..." value={form.departmentId} onChange={set('departmentId')}/>
          </div>
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" type="date" value={form.joiningDate} onChange={set('joiningDate')}/>
          </div>
          <div className="form-group">
            <label className="form-label">Basic Salary (Rs.)</label>
            <input className="form-input" type="number" placeholder="25000" value={form.basicSalary} onChange={set('basicSalary')}/>
          </div>
          <div className="form-group">
            <label className="form-label">Salary Type</label>
            <select className="form-select" value={form.salaryType} onChange={set('salaryType')}>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
              <option value="lecture">Lecture-wise</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 3: Portal Access ─────────────────────────────────── */}
      <SectionCard
        title="Portal Access"
        subtitle="Create a login account for this staff member"
        icon={Shield}
        accentColor="#059669"
        defaultOpen={true}
      >
        {/* Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: createAccount ? 16 : 0,
          padding: '12px 14px', background: createAccount ? '#f0fdf4' : '#f8fafc',
          borderRadius: 10, border: `1px solid ${createAccount ? '#bbf7d0' : '#e2e8f0'}`,
          transition: 'background 0.2s',
        }}>
          <button
            type="button"
            onClick={() => setCreateAccount(v => !v)}
            style={{
              width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: createAccount ? '#059669' : '#cbd5e1',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: createAccount ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}/>
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f' }}>Create portal account</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {createAccount ? 'Staff will receive login credentials' : 'No account — staff will not have portal access'}
            </div>
          </div>
        </div>

        {createAccount && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" placeholder="teacher@school.com" value={form.email} onChange={set('email')}/>
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">Temporary Password</label>
              <input className="form-input" value="teacher" disabled style={{ color:'#94a3b8', background:'#f8fafc' }}/>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Staff must change this on first login</div>
            </div>
          </div>
        )}

        {!createAccount && (
          <div className="alert alert-info" style={{ marginTop:12, marginBottom:0 }}>
            <span>ℹ️</span>
            <span style={{ fontSize:12.5 }}>You can always enable portal access later from the staff edit page.</span>
          </div>
        )}
      </SectionCard>

      {/* ── Action buttons ───────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, marginTop:4 }}>
        <button className="btn btn-teal btn-lg" onClick={handleSubmit} disabled={save.isPending}>
          <Save size={16}/> {save.isPending ? 'Saving...' : 'Save Staff Member'}
        </button>
        <Link to="/staff" className="btn btn-outline btn-lg">Cancel</Link>
      </div>
    </div>
  );
}
