import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { UserPlus, Search, Calendar, TrendingUp, Users, AlertCircle, Camera, Upload, X, Hash, RefreshCw } from 'lucide-react';

export default function AdmissionsPage() {
  const nav = useNavigate();
  const photoRef = useRef();
  const { data:stats } = useQuery({ queryKey:['admission-stats'], queryFn:()=>api.get('/admissions/stats').then(r=>r.data.data) });
  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const [form, setForm] = useState({ name:'', fatherName:'', motherName:'', gender:'male', dob:'', classId:'', sectionId:'', rollNo:'', address:'', bFormNo:'', emergencyPhone:'' });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [sections, setSections] = useState([]);
  const [previewRoll, setPreviewRoll] = useState('');
  const [loadingRoll, setLoadingRoll] = useState(false);

  /* Live preview roll number when class/section changes */
  useEffect(() => {
    if (!form.classId) { setPreviewRoll(''); return; }
    setLoadingRoll(true);
    const params = new URLSearchParams({ classId: form.classId });
    if (form.sectionId) params.append('sectionId', form.sectionId);
    api.get('/students/preview-roll?' + params)
      .then(r => setPreviewRoll(r.data.data?.rollNo || ''))
      .catch(() => setPreviewRoll(''))
      .finally(() => setLoadingRoll(false));
  }, [form.classId, form.sectionId]);

  const onClassChange = (e) => {
    const cls = (classes||[]).find(c => c.id===parseInt(e.target.value));
    setForm({...form, classId:e.target.value, sectionId:''});
    setSections(cls?.sections || []);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 3*1024*1024) return toast.error('Photo must be less than 3MB');
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const admit = useMutation({
    mutationFn: d => api.post('/students', d),
    onSuccess: (r) => {
      // Save photo to localStorage keyed by student ID — auto-used in ID cards & documents
      const studentId = r?.data?.data?.id;
      if (photoPreview && studentId) {
        try { localStorage.setItem(`photo_student_${studentId}`, photoPreview); } catch {}
      }
      toast.success('Student admitted successfully! 🎉');
      nav('/students');
    },
    onError: err => toast.error(err.response?.data?.message || 'Admission failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Student name is required');
    admit.mutate({
      ...form,
      classId: form.classId ? parseInt(form.classId) : undefined,
      sectionId: form.sectionId ? parseInt(form.sectionId) : undefined,
    });
  };

  const clearForm = () => {
    setForm({ name:'', fatherName:'', motherName:'', gender:'male', dob:'', classId:'', sectionId:'', rollNo:'', address:'', bFormNo:'', emergencyPhone:'' });
    setPhotoPreview(null);
  };

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Admission Management</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Admit new students to your school</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Link to="/admissions/inquiries" className="btn btn-outline"><Search size={14}/> Inquiries</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-4" style={{marginBottom:20}}>
        {[
          {l:'Admissions Today', v:stats?.todayCount??0, c:'#2563EB', bg:'#DBEAFE', icon:Calendar},
          {l:'This Month', v:stats?.monthCount??0, c:'#0D9488', bg:'#CCFBF1', icon:TrendingUp},
          {l:'Active Students', v:stats?.active??0, c:'#15803D', bg:'#DCFCE7', icon:Users},
          {l:'Inactive', v:stats?.deactivated??0, c:'#DC2626', bg:'#FEE2E2', icon:AlertCircle},
        ].map(({l,v,c,bg,icon:Icon}) => (
          <div key={l} className="card" style={{background:bg, border:'none', textAlign:'center', padding:16}}>
            <Icon size={22} color={c} style={{marginBottom:6}}/>
            <div style={{fontSize:24, fontWeight:800, color:c}}>{v}</div>
            <div style={{fontSize:12, color:'#475569', fontWeight:600, marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Admission Form */}
      <div className="card">
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:20}}>
          <div style={{width:36,height:36,borderRadius:9,background:'linear-gradient(135deg,#0D9488,#0F766E)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <UserPlus size={18} color="#fff"/>
          </div>
          <h2 style={{fontSize:16, fontWeight:700, color:'#1E3A5F', margin:0}}>Admit New Student</h2>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Photo Capture ─────────────────────────────────────── */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20, padding:16, background:'#F0FDFA', borderRadius:12, border:'1px solid #CCFBF1' }}>
            {/* Photo box */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div
                onClick={() => photoRef.current?.click()}
                style={{
                  width:96, height:112,
                  borderRadius:10, overflow:'hidden',
                  border:`2.5px dashed ${photoPreview?'#0F766E':'#CBD5E1'}`,
                  background: photoPreview ? 'transparent' : '#F8FAFC',
                  cursor:'pointer', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:6,
                  transition:'border-color .15s',
                }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#0F766E'}
                onMouseLeave={e=>e.currentTarget.style.borderColor=photoPreview?'#0F766E':'#CBD5E1'}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8 }}/>
                ) : (
                  <>
                    {/* Person silhouette */}
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'#CBD5E1', marginBottom:-4 }}/>
                    <div style={{ width:56, height:28, borderRadius:'16px 16px 0 0', background:'#CBD5E1' }}/>
                    <span style={{ fontSize:10, color:'#94A3B8', fontWeight:600, position:'absolute', bottom:8 }}>Add Photo</span>
                  </>
                )}
              </div>
              {/* Remove photo button */}
              {photoPreview && (
                <button type="button"
                  onClick={() => setPhotoPreview(null)}
                  style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'#EF4444', border:'2px solid #fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={10} color="#fff"/>
                </button>
              )}
              <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoChange}/>
            </div>

            {/* Info */}
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'#0F4C45', marginBottom:5 }}>
                📸 Student Photo
              </div>
              <p style={{ fontSize:12.5, color:'#374151', lineHeight:1.65, marginBottom:10 }}>
                Upload or capture the student's photo. It will be <strong>automatically used</strong> on:
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'#0F766E' }}>
                {['🪪 ID Card Printing','📜 Certificates','📋 Student Profile','📄 Fee Voucher Header'].map(item=>(
                  <div key={item} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'#0F766E', flexShrink:0 }}/>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button type="button" className="btn btn-teal btn-sm" onClick={()=>photoRef.current?.click()}>
                  <Upload size={13}/> {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </button>
              </div>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14}}>
            <div className="form-group">
              <label className="form-label">Student Full Name *</label>
              <input className="form-input" placeholder="e.g. Ali Hassan" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Father's Name</label>
              <input className="form-input" placeholder="e.g. Zafar Ali" value={form.fatherName} onChange={e=>setForm({...form,fatherName:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Mother's Name</label>
              <input className="form-input" placeholder="e.g. Sana Bibi" value={form.motherName} onChange={e=>setForm({...form,motherName:e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-input" type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Hash size={12} color="#0F766E"/> Roll Number
                {previewRoll && (
                  <span style={{ marginLeft:'auto', fontSize:11, background:'#F0FDFA', color:'#0F766E', padding:'2px 8px', borderRadius:99, fontWeight:700, fontFamily:'monospace', border:'1px solid #CCFBF1' }}>
                    {loadingRoll ? '...' : `Preview: ${previewRoll}`}
                  </span>
                )}
              </label>
              <div style={{ position:'relative' }}>
                <input className="form-input"
                  placeholder={loadingRoll ? 'Generating...' : (previewRoll || 'Auto-generated based on class')}
                  value={form.rollNo}
                  onChange={e=>setForm({...form,rollNo:e.target.value})}
                  style={{ paddingRight: form.rollNo ? 36 : undefined }}
                />
                {form.rollNo && (
                  <button type="button" onClick={()=>setForm({...form,rollNo:''})}
                    style={{ position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',fontSize:13 }}
                    title="Clear (use auto-generated)">
                    <X size={14}/>
                  </button>
                )}
              </div>
              <p style={{ fontSize:11, color:'#9CA3AF', marginTop:3 }}>
                Leave blank to auto-generate · Format: <strong>{previewRoll || 'C5A-26-001'}</strong>
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Class</label>
              <select className="form-select" value={form.classId} onChange={onClassChange}>
                <option value="">Select Class</option>
                {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={form.sectionId} onChange={e=>setForm({...form,sectionId:e.target.value})}>
                <option value="">Select Section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">B-Form / CNIC No.</label>
              <input className="form-input" placeholder="35201-XXXXXXX-X" value={form.bFormNo} onChange={e=>setForm({...form,bFormNo:e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Phone</label>
              <input className="form-input" placeholder="03XXXXXXXXX" value={form.emergencyPhone} onChange={e=>setForm({...form,emergencyPhone:e.target.value})}/>
            </div>
            <div className="form-group" style={{gridColumn:'span 2'}}>
              <label className="form-label">Home Address</label>
              <input className="form-input" placeholder="Full home address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
            </div>
          </div>

          <div style={{display:'flex', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid #F1F5F9'}}>
            <button type="submit" className="btn btn-teal btn-lg" disabled={admit.isPending}>
              <UserPlus size={16}/> {admit.isPending ? 'Admitting...' : 'Admit Student'}
            </button>
            <button type="button" className="btn btn-outline btn-lg" onClick={clearForm}>Clear Form</button>
          </div>
        </form>
      </div>
    </div>
  );
}
