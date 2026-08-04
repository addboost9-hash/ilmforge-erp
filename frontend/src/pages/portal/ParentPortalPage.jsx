/**
 * IlmForge — Parent Portal
 * Parents see ONLY their own children — no admin access
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import api from '../../api/client';
import {
  Users, DollarSign, UserCheck, BookOpen, Bell,
  Eye, FileText, CreditCard, ChevronRight, Calendar, Award, KeyRound, LogOut
} from 'lucide-react';

const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const statusBadge = s => {
  const m = { paid:{bg:'#DCFCE7',c:'#15803D'}, unpaid:{bg:'#FEE2E2',c:'#B91C1C'}, partial:{bg:'#FEF3C7',c:'#B45309'} };
  return m[s] || m.unpaid;
};

export default function ParentPortalPage() {
  const { user, logout } = useAuthStore();
  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  /* Load parent's children only */
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => api.get('/students', { params:{ limit:20 } }).then(r => r.data.data || []),
    staleTime: 60_000,
  });

  const child = selectedChild || children[0] || null;

  /* Load selected child's fees */
  const { data: feeData } = useQuery({
    queryKey: ['parent-fees', child?.id],
    queryFn: () => api.get('/fees/student/' + child.id).then(r => r.data.data),
    enabled: !!child,
    staleTime: 60_000,
  });

  const invoices = feeData?.invoices || [];
  const unpaidCount  = invoices.filter(i => i.status !== 'paid').length;
  const totalDue     = invoices.filter(i => i.status !== 'paid').reduce((s,i)=>s+(i.dueAmount||0), 0);

  const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const logo = localStorage.getItem('schoolLogoPreview');

  return (
    <div style={{ minHeight:'100vh', background:'#F0F4F8', fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* ── Top Bar ── */}
      <div style={{ background:'linear-gradient(90deg,#0F4C45,#0F766E)', padding:'12px 20px', display:'flex', alignItems:'center', gap:14 }}>
        {logo
          ? <img src={logo} alt="" style={{ width:40,height:40,borderRadius:9,objectFit:'cover',flexShrink:0 }}/>
          : <div style={{ width:40,height:40,borderRadius:9,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🎓</div>
        }
        <div style={{ flex:1 }}>
          <div style={{ color:'#fff',fontWeight:700,fontSize:15 }}>{schoolName}</div>
          <div style={{ color:'rgba(255,255,255,0.6)',fontSize:11.5 }}>Parent Portal — Welcome, {user?.name || 'Parent'}</div>
        </div>
        {totalDue > 0 && (
          <div style={{ background:'rgba(239,68,68,0.25)',border:'1px solid rgba(239,68,68,0.4)',borderRadius:8,padding:'5px 12px',color:'#FCA5A5',fontSize:12.5,fontWeight:700 }}>
            Due: {Rs(totalDue)}
          </div>
        )}
        <Link to="/change-password-required" title="Change Password"
          style={{ display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.12)',color:'#fff' }}>
          <KeyRound size={16}/>
        </Link>
        <button onClick={logout} title="Logout"
          style={{ display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.12)',border:'none',color:'#fff',cursor:'pointer' }}>
          <LogOut size={16}/>
        </button>
      </div>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'20px 16px' }}>

        {/* ── My Children ── */}
        {isLoading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#6B7280' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>Loading your children's data…
          </div>
        ) : children.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:16, padding:'40px 24px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>👨‍👩‍👦</div>
            <div style={{ fontWeight:700, fontSize:18, color:'#1E3A5F', marginBottom:8 }}>No Children Found</div>
            <p style={{ color:'#6B7280', fontSize:14, lineHeight:1.6 }}>
              Your children don't appear to be enrolled yet, or your phone number doesn't match
              the emergency contact in the admission form.<br/><br/>
              Please contact the school admin to link your account.
            </p>
          </div>
        ) : (
          <>
            {/* ── Child Selector ── */}
            {children.length > 1 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:'#6B7280', marginBottom:8 }}>SELECT A CHILD</div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {children.map(c=>(
                    <button key={c.id} onClick={()=>{ setSelectedChild(c); setActiveTab('overview'); }}
                      style={{
                        padding:'8px 16px', borderRadius:99, border:'2px solid',
                        borderColor: (selectedChild||children[0])?.id===c.id ? '#0F766E' : '#E5E7EB',
                        background: (selectedChild||children[0])?.id===c.id ? '#F0FDF9' : '#fff',
                        color: (selectedChild||children[0])?.id===c.id ? '#0F766E' : '#374151',
                        cursor:'pointer', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:8,
                        fontFamily:'inherit',
                      }}>
                      <div style={{ width:26,height:26,borderRadius:'50%',background:c.gender==='female'?'linear-gradient(135deg,#F472B6,#EC4899)':'linear-gradient(135deg,#0F766E,#0D9488)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11 }}>
                        {c.name?.charAt(0)}
                      </div>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Student Profile Card ── */}
            {child && (
              <div style={{ background:'linear-gradient(135deg,#1E3A5F,#0F766E)', borderRadius:16, padding:'20px 24px', marginBottom:16, color:'#fff' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,border:'3px solid rgba(255,255,255,0.3)' }}>
                    {child.name?.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:18, fontWeight:800 }}>{child.name}</div>
                    <div style={{ fontSize:12.5, opacity:0.75, marginTop:3 }}>
                      Roll No: <strong>{child.rollNo||'—'}</strong> &nbsp;·&nbsp;
                      Class: <strong>{child.class?.name||'—'}</strong> &nbsp;·&nbsp;
                      Section: <strong>{child.section?.name||'—'}</strong>
                    </div>
                    {child.fatherName && <div style={{ fontSize:12, opacity:0.6, marginTop:2 }}>Father: {child.fatherName}</div>}
                  </div>
                  {/* Due badge */}
                  {unpaidCount > 0 && (
                    <div style={{ background:'rgba(239,68,68,0.3)',borderRadius:10,padding:'8px 14px',textAlign:'center' }}>
                      <div style={{ fontSize:20,fontWeight:900,color:'#FCA5A5' }}>{unpaidCount}</div>
                      <div style={{ fontSize:11,color:'rgba(255,255,255,0.7)' }}>Unpaid</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tabs ── */}
            <div style={{ display:'flex', gap:0, marginBottom:16, background:'#fff', borderRadius:12, padding:4, border:'1px solid #E5E7EB' }}>
              {[
                { id:'overview', label:'📊 Overview',   },
                { id:'fees',     label:'💰 Fee Details' },
                { id:'attend',   label:'✅ Attendance'  },
              ].map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  style={{ flex:1, padding:'9px 0', border:'none', borderRadius:9, cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13,
                    background: activeTab===t.id ? '#0F766E' : 'transparent',
                    color:      activeTab===t.id ? '#fff'    : '#6B7280',
                    transition:'all .13s',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab==='overview' && child && (
              <div>
                {/* 4 stat cards */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
                  {[
                    { label:'Unpaid Fee',      value: Rs(totalDue),         color:'#DC2626', bg:'#FEE2E2', icon:DollarSign },
                    { label:'Paid Invoices',   value: invoices.filter(i=>i.status==='paid').length, color:'#15803D', bg:'#DCFCE7', icon:CreditCard },
                    { label:'Class',           value: child.class?.name||'—',  color:'#2563EB', bg:'#EFF6FF', icon:BookOpen  },
                    { label:'Roll No',         value: child.rollNo||'—',       color:'#7C3AED', bg:'#F5F3FF', icon:Award     },
                  ].map(c=>{
                    const Icon=c.icon;
                    return (
                      <div key={c.label} style={{ background:c.bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${c.color}20` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <Icon size={16} color={c.color}/>
                          <span style={{ fontSize:11.5, fontWeight:600, color:c.color }}>{c.label}</span>
                        </div>
                        <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick links */}
                <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden' }}>
                  {[
                    { label:'View Fee Vouchers',  onClick:()=>setActiveTab('fees'),   icon:'💰', desc:'See all invoices and due amounts' },
                    { label:'Attendance Report',  onClick:()=>setActiveTab('attend'), icon:'✅', desc:'Check daily attendance record' },
                    { label:'Download Fee Voucher', onClick:()=>window.open('/fee-voucher','_blank'), icon:'📄', desc:'Enter roll number to download voucher' },
                    { label:'School Noticeboard', onClick:()=>{},                    icon:'📢', desc:'Latest school announcements' },
                  ].map((item,i)=>(
                    <div key={i} onClick={item.onClick}
                      style={{ padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#F0FDF9'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <span style={{ fontSize:22 }}>{item.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13.5, color:'#1E3A5F' }}>{item.label}</div>
                        <div style={{ fontSize:12, color:'#6B7280' }}>{item.desc}</div>
                      </div>
                      <ChevronRight size={15} color="#94A3B8"/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FEES TAB ── */}
            {activeTab==='fees' && (
              <div>
                <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                  {[
                    { label:'All',     filter:null   },
                    { label:'Unpaid',  filter:'unpaid'  },
                    { label:'Paid',    filter:'paid'    },
                  ].map(f=>(
                    <button key={f.label}
                      style={{ padding:'6px 16px', borderRadius:99, border:'1.5px solid', fontFamily:'inherit', cursor:'pointer', fontSize:12.5, fontWeight:600 }}
                      onClick={()=>{}}>{f.label}
                    </button>
                  ))}
                </div>

                {invoices.length===0 ? (
                  <div style={{ background:'#fff', borderRadius:12, padding:'36px', textAlign:'center', color:'#94A3B8' }}>
                    <FileText size={36} style={{ opacity:0.3, marginBottom:8 }}/>
                    <div>No fee invoices found</div>
                  </div>
                ) : (
                  <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', overflow:'hidden' }}>
                    {invoices.map((inv,i)=>{
                      const bd = statusBadge(inv.status);
                      return (
                        <div key={inv.id} style={{ padding:'14px 18px', borderBottom:'1px solid #F8FAFC', display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:42,height:42,borderRadius:10,background:bd.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                            <DollarSign size={18} color={bd.c}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:13.5, color:'#1E3A5F' }}>{inv.feeTitle||'Monthly Fee'}</div>
                            <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
                              {inv.month&&inv.year ? `${inv.month}/${inv.year}` : fmtDate(inv.createdAt)} &nbsp;·&nbsp; Total: {Rs(inv.totalAmount)}
                              {inv.dueAmount > 0 && <span style={{ color:'#DC2626', fontWeight:700 }}> · Due: {Rs(inv.dueAmount)}</span>}
                            </div>
                          </div>
                          <span style={{ background:bd.bg, color:bd.c, padding:'4px 10px', borderRadius:99, fontSize:11.5, fontWeight:700, textTransform:'capitalize', flexShrink:0 }}>
                            {inv.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop:14, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'12px 16px' }}>
                  <p style={{ margin:0, color:'#1D4ED8', fontSize:12.5, lineHeight:1.6 }}>
                    ℹ️ To pay fees, visit the school office or contact them on WhatsApp.<br/>
                    To download a printable fee voucher: <a href="/fee-voucher" target="_blank" rel="noreferrer" style={{ color:'#0F766E', fontWeight:700 }}>Click Here →</a>
                  </p>
                </div>
              </div>
            )}

            {/* ── ATTENDANCE TAB ── */}
            {activeTab==='attend' && (
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'24px', textAlign:'center', color:'#6B7280' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>📅</div>
                <div style={{ fontWeight:700, fontSize:16, color:'#1E3A5F', marginBottom:6 }}>Attendance Report</div>
                <p style={{ fontSize:13, lineHeight:1.7 }}>
                  Full attendance history with monthly breakdown is available from the school admin.<br/>
                  Contact the school office or ask the admin to share the attendance report.
                </p>
                <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:16 }}>
                  {[['Present','#15803D','#DCFCE7'],['Absent','#DC2626','#FEE2E2'],['Leave','#D97706','#FEF3C7']].map(([l,c,bg])=>(
                    <div key={l} style={{ background:bg, borderRadius:10, padding:'10px 20px' }}>
                      <div style={{ fontSize:22, fontWeight:800, color:c }}>—</div>
                      <div style={{ fontSize:12, color:c, fontWeight:600 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign:'center', marginTop:24, padding:'16px', color:'#94A3B8', fontSize:12 }}>
          {schoolName} · Powered by IlmForge · Ilm Ko Asaan Banaye
        </div>
      </div>
    </div>
  );
}
