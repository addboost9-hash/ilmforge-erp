import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { ArrowLeft, CheckCircle, Send } from 'lucide-react';

export default function PublicAdmissionPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '', fatherName: '', gender: '', dob: '',
    fatherEmail: '', fatherCnic: '', fatherPhone: '', address: '',
    classInterested: '', campusId: '1',
  });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Simple math captcha
  const [n1] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [n2] = useState(() => Math.floor(Math.random() * 9) + 1);
  const correctCaptcha = String(n1 + n2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.fatherPhone) return toast.error('Student name and father phone are required');
    if (captchaAnswer !== correctCaptcha) return toast.error('Incorrect captcha answer');
    setLoading(true);
    try {
      await api.post('/admissions/inquiries', {
        name: form.name,
        phone: form.fatherPhone,
        classInterested: form.classInterested,
        notes: `Father: ${form.fatherName} | CNIC: ${form.fatherCnic} | Email: ${form.fatherEmail} | DOB: ${form.dob} | Address: ${form.address}`,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight:'100vh', background:'#F0F4F8', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
        <div style={{ maxWidth:480, width:'100%', background:'#fff', borderRadius:16, padding:'40px 36px', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ width:80,height:80,borderRadius:'50%',background:'#DCFCE7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px' }}>
            <CheckCircle size={40} color="#15803D"/>
          </div>
          <h2 style={{ fontSize:22,fontWeight:800,color:'#1E3A5F',marginBottom:8 }}>Application Submitted! ✅</h2>
          <p style={{ color:'#64748B',fontSize:14,lineHeight:1.7,marginBottom:24 }}>
            Your admission request for <strong>{form.name}</strong> has been submitted successfully.
            The school will contact you at <strong>{form.fatherPhone}</strong> shortly.
          </p>
          <div style={{ background:'#F0FDF9',border:'1px solid #CCFBF1',borderRadius:10,padding:14,marginBottom:24,textAlign:'left' }}>
            <div style={{ fontSize:12,fontWeight:700,color:'#0F766E',marginBottom:8 }}>Application Details</div>
            <div style={{ fontSize:12.5,color:'#374151',lineHeight:1.8 }}>
              <div><strong>Student:</strong> {form.name}</div>
              <div><strong>Father:</strong> {form.fatherName}</div>
              <div><strong>Class:</strong> {form.classInterested || 'Not specified'}</div>
              <div><strong>Phone:</strong> {form.fatherPhone}</div>
            </div>
          </div>
          <Link to="/login" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'#1E3A5F',color:'#fff',padding:'11px 24px',borderRadius:9,textDecoration:'none',fontSize:13.5,fontWeight:700 }}>
            <ArrowLeft size={15}/> Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F0F4F8', fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#6B21A8,#4A1580)', padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:42,height:42,borderRadius:11,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🎓</div>
        <div>
          <div style={{ color:'#fff',fontWeight:800,fontSize:16 }}>EduForge Pro</div>
          <div style={{ color:'rgba(255,255,255,0.65)',fontSize:12 }}>Apply for Admission</div>
        </div>
        <Link to="/login" style={{ marginLeft:'auto',color:'rgba(255,255,255,0.7)',fontSize:13,textDecoration:'none',display:'flex',alignItems:'center',gap:5 }}>
          <ArrowLeft size={13}/> Back to Login
        </Link>
      </div>

      <div style={{ maxWidth:620, margin:'32px auto', padding:'0 16px 32px' }}>
        {/* School logo + title */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#6B21A8,#4A1580)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:34 }}>🎓</div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'#1E3A5F',marginBottom:4 }}>EduForge Pro</h1>
          <p style={{ color:'#64748B',fontSize:13.5 }}>Apply for admission</p>
        </div>

        <div style={{ background:'#fff',borderRadius:14,padding:'28px 28px',boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleSubmit}>

            {/* Campus */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Select a campus</label>
              <select style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none' }}
                value={form.campusId} onChange={e=>setForm({...form,campusId:e.target.value})}>
                <option value="1">Main Campus</option>
              </select>
            </div>

            {/* Student Name */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Student Name *</label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="Student Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            </div>

            {/* Father Name */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Father Name</label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="Father Name" value={form.fatherName} onChange={e=>setForm({...form,fatherName:e.target.value})}/>
            </div>

            {/* Roll ID — auto generated hint */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Roll ID</label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#F8FAFC',fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'#94A3B8' }}
                value="Auto Generated" disabled/>
            </div>

            {/* DOB */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Select Birthday</label>
              <input type="date" style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})}/>
            </div>

            {/* Gender */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Gender</label>
              <select style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none' }}
                value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Class interested */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Class Interested</label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="e.g. Class 5, KG, Nursery" value={form.classInterested} onChange={e=>setForm({...form,classInterested:e.target.value})}/>
            </div>

            {/* Father Email */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Father Email Address</label>
              <input type="email" style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="Father Email Address" value={form.fatherEmail} onChange={e=>setForm({...form,fatherEmail:e.target.value})}/>
            </div>

            {/* Father CNIC */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Father CNIC Number (without dashes)</label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="Father CNIC Number (without dashes)" value={form.fatherCnic} onChange={e=>setForm({...form,fatherCnic:e.target.value})}/>
            </div>

            {/* Father Phone */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Father Phone Number *</label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="Father Phone Number" value={form.fatherPhone} onChange={e=>setForm({...form,fatherPhone:e.target.value})} required/>
            </div>

            {/* Address */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>Full Home Address</label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="Full Home Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
            </div>

            {/* Captcha */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'#374151',marginBottom:5 }}>
                Are you a human? What is {n1} + {n2}?
                <button type="button" onClick={() => { /* refresh captcha */ }}
                  style={{ background:'none',border:'none',cursor:'pointer',marginLeft:6,color:'#0D9488' }}>🔄</button>
              </label>
              <input style={{ width:'100%',padding:'9px 12px',border:'1.5px solid #E2E8F0',borderRadius:8,fontSize:13,background:'#fff',fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
                placeholder="Type answer here..." value={captchaAnswer} onChange={e=>setCaptchaAnswer(e.target.value)} required/>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width:'100%',padding:'13px',borderRadius:9,border:'none',background:'linear-gradient(90deg,#6B21A8,#4A1580)',color:'#fff',fontSize:14.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              <Send size={16}/> {loading ? 'Submitting...' : 'Submit Admission Request ✓'}
            </button>

            {/* Go Back */}
            <div style={{ textAlign:'center',marginTop:14 }}>
              <Link to="/login" style={{ display:'inline-flex',alignItems:'center',gap:6,background:'#15803D',color:'#fff',padding:'9px 20px',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600 }}>
                ← Go Back
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
