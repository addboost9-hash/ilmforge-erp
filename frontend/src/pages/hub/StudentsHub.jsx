/**
 * IlmForge — Students Hub v2.0 (Enhanced)
 * Complete student lifecycle hub with live KPI stats,
 * 12 feature tabs, quick actions sidebar, birthday widget
 */
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  Users, UserPlus, Search, CreditCard, Gift, Upload, BarChart2,
  Briefcase, GraduationCap, FileText, MessageSquare, Printer,
  TrendingUp, Calendar, QrCode, ChevronRight,
  BookOpen, AlertTriangle, CheckCircle,
} from 'lucide-react';

const StudentsPage        = lazy(() => import('../students/StudentsPage'));
const AdmissionWizardPage = lazy(() => import('../admission/AdmissionWizardPage'));
const AdmissionInquiries  = lazy(() => import('../admission/AdmissionInquiriesPage'));
const BirthdaysPage       = lazy(() => import('../students/BirthdaysPage'));
const IDCardsPage         = lazy(() => import('../idcards/IDCardsPage'));
const BulkImportPage      = lazy(() => import('../students/BulkImportPage'));
const AnalyticsPage       = lazy(() => import('../analytics/StudentAnalyticsPage'));
const AdmissionCRMPage    = lazy(() => import('../crm/AdmissionCRMPage'));
const AlumniPage          = lazy(() => import('../students/AlumniPage'));
const StudentInfoRep      = lazy(() => import('../students/StudentInfoReportsPage'));
const AdmFormPrint        = lazy(() => import('../admission/AdmissionFormPrintPage'));
const AttCalendar         = lazy(() => import('../reports/StudentAttendanceCalendarPage'));
const StudentHealthPage   = lazy(() => import('../students/StudentHealthPage'));
const PromotionPage       = lazy(() => import('../students/StudentPromotionPage'));
const LeavePage           = lazy(() => import('../leaves/LeavePage'));

const ACCENT = '#1B2F6E';
const CYAN   = '#0073b7';

function L(C) {
  return () => (
    <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}><div className="spinner"/></div>}>
      <C />
    </Suspense>
  );
}

const TABS = [
  { id:'list',       label:'All Students',    icon:Users,         color:'#1B2F6E', render:L(StudentsPage),        desc:'Full roster with search & filters' },
  { id:'admit',      label:'Admit Student',   icon:UserPlus,      color:'#15803d', render:L(AdmissionWizardPage), desc:'5-step linked admission wizard' },
  { id:'inquiries',  label:'Inquiries',       icon:Search,        color:'#7c3aed', render:L(AdmissionInquiries),  desc:'Admission inquiry requests' },
  { id:'crm',        label:'Admissions CRM',  icon:Briefcase,     color:'#d97706', render:L(AdmissionCRMPage),    desc:'Lead pipeline management' },
  { id:'idcards',    label:'ID Cards',        icon:CreditCard,    color:'#0891b2', render:L(IDCardsPage),         desc:'Print student ID cards' },
  { id:'birthdays',  label:'Birthdays',       icon:Gift,          color:'#db2777', render:L(BirthdaysPage),       desc:'Today\'s student birthdays' },
  { id:'attendance', label:'Att. Calendar',   icon:Calendar,      color:'#dc2626', render:L(AttCalendar),         desc:'Annual P/A/H calendar' },
  { id:'bulk',       label:'Bulk Import',     icon:Upload,        color:'#64748b', render:L(BulkImportPage),      desc:'Import from Excel/CSV' },
  { id:'analytics',  label:'Analytics',       icon:BarChart2,     color:'#0073b7', render:L(AnalyticsPage),       desc:'Performance trends & charts' },
  { id:'reports',    label:'Info Reports',    icon:FileText,      color:'#374151', render:L(StudentInfoRep),      desc:'Printable student lists' },
  { id:'form',       label:'Adm. Form',       icon:Printer,       color:'#7c3aed', render:L(AdmFormPrint),        desc:'Print blank/filled forms' },
  { id:'alumni',     label:'Alumni',          icon:GraduationCap, color:'#15803d', render:L(AlumniPage),          desc:'Passout student records' },
  { id:'health',     label:'Health Records',  icon:BookOpen,      color:'#ef4444', render:L(StudentHealthPage),   desc:'Blood group, allergies, medical' },
  { id:'promotion',  label:'Promotion',       icon:TrendingUp,    color:'#7c3aed', render:L(PromotionPage),       desc:'Bulk class promotion' },
  { id:'leaves',     label:'Student Leaves',  icon:Calendar,      color:'#d97706', render:L(LeavePage),           desc:'Leave applications' },
];

const QUICK_ACTIONS = [
  { label:'Mark Attendance',     to:'/attendance',        icon:CheckCircle,   color:'#15803d' },
  { label:'Defaulters List',     to:'/fees/defaulters',   icon:AlertTriangle, color:'#dc2626' },
  { label:'Promote Students',    to:'/students/promote',  icon:TrendingUp,    color:'#7c3aed' },
  { label:'Gate Passes',         to:'/gate-passes',       icon:QrCode,        color:'#0891b2' },
  { label:'Send SMS to Parents', to:'/notifications/sms', icon:MessageSquare, color:'#d97706' },
  { label:'Student Health',      to:'/student-health',    icon:BookOpen,      color:'#db2777' },
];

export default function StudentsHub() {
  const [activeId, setActiveId] = useState('list');
  const active = TABS.find(t => t.id === activeId) || TABS[0];

  const { data: stats } = useQuery({
    queryKey:  ['hub-student-stats'],
    queryFn:   () => api.get('/students/stats').then(r => r.data.data).catch(() => null),
    staleTime: 3 * 60_000,
  });

  const { data: birthdays = [] } = useQuery({
    queryKey: ['birthdays-today'],
    queryFn:  () => api.get('/students/birthdays/today').then(r => r.data.data || []).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const KPIs = [
    { label:'Total Students', v: stats?.totalStudents || '—', icon:Users,        color:'white' },
    { label:'Active',         v: stats?.activeStudents || '—',icon:CheckCircle,  color:'rgba(255,255,255,0.85)' },
    { label:'Birthdays Today',v: birthdays.length,            icon:Gift,         color:'#fde68a' },
    { label:'New This Month', v: stats?.newThisMonth  || '—', icon:UserPlus,     color:'rgba(255,255,255,0.85)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'calc(100vh - 56px)', background:'#f1f5f9' }}>

      {/* ── Hero Header ── */}
      <div style={{ background:`linear-gradient(135deg, ${ACCENT} 0%, ${CYAN} 100%)`, padding:'20px 24px 0', color:'white' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>👨‍🎓</div>
            <div>
              <div style={{ fontSize:21, fontWeight:800, letterSpacing:-0.3 }}>Students Hub</div>
              <div style={{ fontSize:12.5, opacity:0.8, marginTop:2 }}>Admission se alumni tak — poora student lifecycle ek jagah</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setActiveId('admit')}
              style={{ background:'white', color:ACCENT, border:'none', padding:'8px 18px', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <UserPlus size={14}/> Add Student
            </button>
            <button onClick={() => setActiveId('bulk')}
              style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', padding:'8px 14px', borderRadius:9, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <Upload size={14}/> Bulk Import
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          {KPIs.map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.12)', borderRadius:9, padding:'8px 14px', display:'flex', alignItems:'center', gap:9, backdropFilter:'blur(4px)', minWidth:110 }}>
                <Icon size={16} color={k.color}/>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:'white', lineHeight:1 }}>{k.v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:1 }}>{k.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Strip */}
        <div style={{ display:'flex', overflowX:'auto', gap:1, scrollbarWidth:'none' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeId === t.id;
            return (
              <button key={t.id} onClick={() => setActiveId(t.id)}
                style={{ padding:'9px 13px', border:'none', background: isActive ? 'white' : 'transparent', color: isActive ? t.color : 'rgba(255,255,255,0.78)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight: isActive ? 700 : 500, whiteSpace:'nowrap', borderRadius: isActive ? '8px 8px 0 0' : 0, transition:'all .15s', flexShrink:0 }}>
                <Icon size={13}/> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content + Sidebar ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Main Tab Content */}
        <div style={{ flex:1, overflow:'auto', padding:16, minWidth:0 }}>
          {active.render()}
        </div>

        {/* Right Quick-Action Sidebar */}
        <div style={{ width:192, flexShrink:0, background:'white', borderLeft:'1px solid #e2e8f0', padding:12, display:'flex', flexDirection:'column', gap:6, overflowY:'auto' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:2 }}>Quick Actions</div>

          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <Link key={a.to} to={a.to}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 9px', borderRadius:8, background: a.color + '0e', border:`1px solid ${a.color}22`, textDecoration:'none', transition:'all .12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = a.color + '18'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = a.color + '0e'; e.currentTarget.style.transform = 'none'; }}>
                <Icon size={13} color={a.color}/>
                <span style={{ fontSize:11.5, fontWeight:600, color:'#374151', flex:1, lineHeight:1.3 }}>{a.label}</span>
                <ChevronRight size={10} color="#cbd5e1"/>
              </Link>
            );
          })}

          <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:8, marginTop:4 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Print & Reports</div>
            {[
              { label:'ID Cards',      id:'idcards',   icon:CreditCard },
              { label:'Adm. Forms',    id:'form',      icon:Printer },
              { label:'Student Lists', id:'reports',   icon:FileText },
              { label:'Analytics',     id:'analytics', icon:BarChart2 },
            ].map(a => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => setActiveId(a.id)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 8px', borderRadius:7, background:'#f8f9fa', border:'1px solid #e2e8f0', cursor:'pointer', marginBottom:5, width:'100%', fontSize:11.5, color:'#374151', fontWeight:600, textAlign:'left' }}>
                  <Icon size={13} color="#374151"/>
                  {a.label}
                </button>
              );
            })}
          </div>

          {/* Birthday widget */}
          {birthdays.length > 0 && (
            <div style={{ marginTop:6, background:'linear-gradient(135deg,#fdf4ff,#fce7f3)', border:'1px solid #f0abfc', borderRadius:9, padding:'9px 10px' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#7e22ce', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                🎂 Today ({birthdays.length})
              </div>
              {birthdays.slice(0,4).map(s => (
                <div key={s.id} style={{ fontSize:11, color:'#374151', padding:'3px 0', display:'flex', alignItems:'center', gap:5, borderBottom:'1px solid rgba(240,171,252,0.3)' }}>
                  <span style={{ width:18, height:18, borderRadius:'50%', background:'#e879f9', color:'white', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {(s.name||'?').charAt(0)}
                  </span>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{s.name}</span>
                </div>
              ))}
              {birthdays.length > 4 && (
                <button onClick={() => setActiveId('birthdays')}
                  style={{ fontSize:10.5, color:'#7e22ce', background:'none', border:'none', cursor:'pointer', padding:'3px 0', fontWeight:700 }}>
                  +{birthdays.length - 4} more →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
