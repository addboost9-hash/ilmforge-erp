import { useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, ArrowLeft, UserPlus, Camera, Upload, X, Hash } from 'lucide-react';

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

export default function StaffFormPage() {
  const nav = useNavigate();
  const photoRef = useRef();
  const [form, setForm] = useState({
    name:'', email:'', phone:'', designation:'Teacher',
    joiningDate:'', basicSalary:'', salaryType:'monthly',
    gender:'male', cnic:'', departmentId:'',
  });
  const empCodePreview = useMemo(() => previewEmpCode(form.designation), [form.designation]);
  const [photoPreview, setPhotoPreview] = useState(null);

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
      // Save photo to localStorage keyed by staff ID — auto-used in ID cards & documents
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
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <Link to="/staff" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15}/></Link>
        <div>
          <h1 className="page-title">Add New Staff Member</h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:2 }}>Teacher, accountant, or support staff</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          <div style={{ width:36,height:36,borderRadius:9,background:'linear-gradient(135deg,#7C3AED,#6D28D9)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <UserPlus size={17} color="#fff"/>
          </div>
          <h2 style={{ fontSize:15, fontWeight:700, color:'#1E3A5F', margin:0 }}>Staff Information</h2>
        </div>

        {/* ── Photo Capture ─────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20, padding:16, background:'#F5F3FF', borderRadius:12, border:'1px solid #DDD6FE' }}>
          {/* Photo box */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div
              onClick={() => photoRef.current?.click()}
              style={{
                width:96, height:112,
                borderRadius:10, overflow:'hidden',
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

        {/* Form fields */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" placeholder="Muhammad Ali Khan" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-input" type="email" placeholder="teacher@school.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" placeholder="03001234567" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          </div>

          <div className="form-group">
            <label className="form-label">CNIC</label>
            <input className="form-input" placeholder="3520100000000" value={form.cnic} onChange={e=>setForm({...form,cnic:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              Designation
              <span style={{ fontSize:11, background:'#F0FDFA', color:'#0F766E', padding:'2px 8px', borderRadius:99, fontWeight:700, fontFamily:'monospace', border:'1px solid #CCFBF1' }}>
                <Hash size={10} style={{ display:'inline', marginRight:3, verticalAlign:'middle' }}/>{empCodePreview}
              </span>
            </label>
            <input className="form-input" placeholder="Teacher, Principal, etc." value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-select" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" type="date" value={form.joiningDate} onChange={e=>setForm({...form,joiningDate:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Basic Salary (Rs.)</label>
            <input className="form-input" type="number" placeholder="25000" value={form.basicSalary} onChange={e=>setForm({...form,basicSalary:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Salary Type</label>
            <select className="form-select" value={form.salaryType} onChange={e=>setForm({...form,salaryType:e.target.value})}>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
              <option value="lecture">Lecture-wise</option>
            </select>
          </div>
        </div>

        <div className="alert alert-info" style={{ marginTop:16, marginBottom:16 }}>
          <span>ℹ️</span>
          <span style={{ fontSize:12.5 }}>A temporary password <strong>teacher</strong> will be assigned. Staff must change it on first login.</span>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-teal btn-lg" onClick={handleSubmit} disabled={save.isPending}>
            <Save size={16}/> {save.isPending ? 'Saving...' : 'Save Staff Member'}
          </button>
          <Link to="/staff" className="btn btn-outline btn-lg">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
