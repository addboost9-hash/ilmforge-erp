/**
 * IlmForge — Video Tutorials
 * Getting started guides for school admins
 */
import { useState } from 'react';
import { Play, ExternalLink, Clock, BookOpen, DollarSign, Users, UserCheck, GraduationCap, Settings, MessageSquare } from 'lucide-react';

const TUTORIALS = [
  {
    id:1, category:'Getting Started',
    title:'Welcome & Account Setup', duration:'5:30',
    desc:'Complete walkthrough of your IlmForge account setup, school profile configuration and first steps.',
    thumb:'🎓', color:'#0F766E', bg:'#F0FDFA',
    url:'https://youtube.com',
  },
  {
    id:2, category:'Admissions',
    title:'Full Admissions Guide', duration:'8:15',
    desc:'How to admit students, manage inquiries, print admission forms and set up the public admission portal.',
    thumb:'📋', color:'#6366F1', bg:'#EEF2FF',
    url:'https://youtube.com',
  },
  {
    id:3, category:'Fee Management',
    title:'Complete Fee Management', duration:'12:00',
    desc:'Generate fees, collect payments, print vouchers, manage defaulters and create family vouchers.',
    thumb:'💰', color:'#059669', bg:'#ECFDF5',
    url:'https://youtube.com',
  },
  {
    id:4, category:'Attendance',
    title:'Attendance & Barcode System', duration:'6:45',
    desc:'Mark daily attendance, set up barcode scanning, connect biometric devices and generate reports.',
    thumb:'✅', color:'#D97706', bg:'#FFFBEB',
    url:'https://youtube.com',
  },
  {
    id:5, category:'Staff & Salary',
    title:'Staff Salary & Loan Management', duration:'9:20',
    desc:'Add staff, generate monthly salary, manage loans/deductions, issue payslips and print salary reports.',
    thumb:'👨‍🏫', color:'#DC2626', bg:'#FEF2F2',
    url:'https://youtube.com',
  },
  {
    id:6, category:'Exams',
    title:'Exam & Test Management', duration:'7:50',
    desc:'Create exams, enter marks, generate marksheets, print admit cards and publish results to parents.',
    thumb:'📝', color:'#7C3AED', bg:'#F5F3FF',
    url:'https://youtube.com',
  },
  {
    id:7, category:'Reports',
    title:'Reports & Certificates', duration:'5:10',
    desc:'Generate 50+ reports, print certificates (leaving, character, DOB), create ID cards and vouchers.',
    thumb:'📊', color:'#0891B2', bg:'#F0F9FF',
    url:'https://youtube.com',
  },
  {
    id:8, category:'Communication',
    title:'SMS, WhatsApp & Email Alerts', duration:'6:30',
    desc:'Configure SMS templates, send WhatsApp messages, set up automatic alerts and manage notification history.',
    thumb:'📱', color:'#22C55E', bg:'#F0FDF4',
    url:'https://youtube.com',
  },
];

const CATEGORIES = ['All', ...new Set(TUTORIALS.map(t=>t.category))];

export default function VideoTutorialsPage() {
  const [cat, setCat] = useState('All');
  const filtered = cat==='All' ? TUTORIALS : TUTORIALS.filter(t=>t.category===cat);

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Video Tutorials</h1>
        <p className="page-subtitle">Step-by-step video guides to help you get the most out of IlmForge</p>
      </div>

      {/* Getting started banner */}
      <div className="card" style={{ marginBottom:20, background:'linear-gradient(135deg,#0F4C45,#0F766E)', color:'#fff', padding:'24px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ fontSize:52, flexShrink:0 }}>🎓</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>New to IlmForge?</div>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.75)', margin:0, lineHeight:1.6 }}>
              Start with the "Welcome & Account Setup" tutorial, then follow along with the Admissions and Fee Management guides.
              Most schools are fully operational within 30 minutes!
            </p>
          </div>
          <a href="https://youtube.com" target="_blank" rel="noreferrer"
            style={{ display:'flex',alignItems:'center',gap:8,background:'#D97706',color:'#fff',padding:'11px 22px',borderRadius:9,textDecoration:'none',fontSize:14,fontWeight:700,flexShrink:0,boxShadow:'0 4px 14px rgba(217,119,6,0.4)',transition:'transform .13s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e=>e.currentTarget.style.transform=''}>
            <Play size={16} fill="currentColor"/> Watch Getting Started
          </a>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        {CATEGORIES.map(c=>(
          <button key={c} className={`btn btn-sm ${cat===c?'btn-teal':'btn-outline'}`} onClick={()=>setCat(c)}>{c}</button>
        ))}
      </div>

      {/* Video grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {filtered.map(t => (
          <div key={t.id} className="card" style={{ padding:0, overflow:'hidden', transition:'box-shadow .15s' }}>
            {/* Thumbnail */}
            <div style={{ height:160, background:`linear-gradient(135deg,${t.color}15,${t.color}08)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', cursor:'pointer', borderBottom:`1px solid ${t.color}15` }}>
              <div style={{ fontSize:64 }}>{t.thumb}</div>
              <a href={t.url} target="_blank" rel="noreferrer"
                style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0)', transition:'background .15s', textDecoration:'none' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.15)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0)'}>
                <div style={{ width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.92)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
                  <Play size={20} color={t.color} fill={t.color}/>
                </div>
              </a>
              <div style={{ position:'absolute',top:10,left:10,background:t.color,color:'#fff',fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:99 }}>
                {t.category}
              </div>
              <div style={{ position:'absolute',bottom:10,right:10,background:'rgba(0,0,0,0.7)',color:'#fff',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:6,display:'flex',alignItems:'center',gap:4 }}>
                <Clock size={10}/> {t.duration}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding:'14px 16px' }}>
              <div style={{ fontWeight:700, fontSize:13.5, color:'#111827', marginBottom:6 }}>{t.title}</div>
              <p style={{ fontSize:12.5, color:'#6B7280', lineHeight:1.5, margin:'0 0 12px' }}>{t.desc}</p>
              <a href={t.url} target="_blank" rel="noreferrer"
                style={{ display:'inline-flex',alignItems:'center',gap:6,fontSize:12.5,color:t.color,fontWeight:600,textDecoration:'none',padding:'6px 0' }}>
                <Play size={13} fill={t.color}/> Watch Tutorial <ExternalLink size={11}/>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Support section */}
      <div className="card" style={{ marginTop:20, textAlign:'center', padding:32 }}>
        <div style={{ fontSize:32, marginBottom:10 }}>💬</div>
        <div style={{ fontSize:16, fontWeight:700, color:'#111827', marginBottom:6 }}>Need More Help?</div>
        <p style={{ fontSize:13.5, color:'#6B7280', maxWidth:480, margin:'0 auto 16px', lineHeight:1.6 }}>
          Our support team is available 24/7 via WhatsApp to help you with any questions or issues.
        </p>
        <a href="https://wa.me/923001234567" target="_blank" rel="noreferrer"
          style={{ display:'inline-flex',alignItems:'center',gap:8,background:'#25D366',color:'#fff',padding:'10px 24px',borderRadius:9,textDecoration:'none',fontSize:14,fontWeight:700,boxShadow:'0 3px 12px rgba(37,211,102,0.3)' }}>
          📱 WhatsApp Support: +92 300 1234567
        </a>
      </div>
    </div>
  );
}
