/** Students Hub — poora student lifecycle ek page pe */
import { lazy, Suspense, useState } from 'react';
import { Users, UserPlus, Search, CreditCard, Gift, Upload, BarChart2, Briefcase, Map, GraduationCap } from 'lucide-react';

const StudentsPage        = lazy(() => import('../students/StudentsPage'));
const AdmissionWizardPage = lazy(() => import('../admission/AdmissionWizardPage'));
const AdmissionInquiries  = lazy(() => import('../admission/AdmissionInquiriesPage'));
const BirthdaysPage       = lazy(() => import('../students/BirthdaysPage'));
const IDCardsPage         = lazy(() => import('../idcards/IDCardsPage'));
const BulkImportPage      = lazy(() => import('../students/BulkImportPage'));
const AnalyticsPage       = lazy(() => import('../analytics/StudentAnalyticsPage'));
const AdmissionCRMPage    = lazy(() => import('../crm/AdmissionCRMPage'));
const AlumniPage          = lazy(() => import('../students/AlumniPage'));

const ACCENT = '#0073b7';

const StudentProfileHint = () => (
  <div className="card" style={{padding:16}}>
    <p style={{color:'#999', fontSize:13}}>
      Kisi bhi student pe click karke poori profile kholen — fees, attendance, results sab wahan linked hain.
    </p>
  </div>
);

const L = (C) => () => (
  <Suspense fallback={<div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>Loading…</div>}>
    <C />
  </Suspense>
);

const TABS = [
  { id: 'list',      label: 'All Students',    icon: Users,         render: L(StudentsPage) },
  { id: 'admit',     label: 'Admit Student',   icon: UserPlus,      render: L(AdmissionWizardPage) },
  { id: 'inquiries', label: 'Inquiries',       icon: Search,        render: L(AdmissionInquiries) },
  { id: 'crm',       label: 'Admissions CRM',  icon: Briefcase,     render: L(AdmissionCRMPage) },
  { id: 'idcards',   label: 'ID Cards',        icon: CreditCard,    render: L(IDCardsPage) },
  { id: 'birthdays', label: 'Birthdays',       icon: Gift,          render: L(BirthdaysPage) },
  { id: 'bulk',      label: 'Bulk Import',     icon: Upload,        render: L(BulkImportPage) },
  { id: 'analytics', label: 'Analytics',       icon: BarChart2,     render: L(AnalyticsPage) },
  { id: 'profiles',  label: 'Profiles Guide',  icon: Map,           render: () => <StudentProfileHint /> },
  { id: 'alumni',    label: 'Alumni',          icon: GraduationCap, render: L(AlumniPage) },
];

export default function StudentsHub() {
  const [activeId, setActiveId] = useState('list');
  const active = TABS.find(t => t.id === activeId) || TABS[0];

  return (
    <div className="hub-shell">
      {/* Hub Header */}
      <div style={{background:'white', padding:'20px', borderBottom:'1px solid #dee2e6', borderLeft:`4px solid ${ACCENT}`, display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:0}}>
        <div>
          <div style={{fontSize:22, fontWeight:700, color:'#333', display:'flex', alignItems:'center', gap:10}}>
            <Users size={24} style={{color:ACCENT}}/> Students Hub
          </div>
          <div style={{fontSize:13, color:'#999', marginTop:3}}>
            Admission se leke promotion tak — poora student lifecycle yahan ek jagah
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-primary" onClick={() => setActiveId('admit')}>
            <UserPlus size={15} />
            Add Student
          </button>
          <button className="btn btn-outline" onClick={() => setActiveId('bulk')}>
            <Upload size={15} />
            Bulk Import
          </button>
        </div>
      </div>

      {/* Tab Strip */}
      <div style={{display:'flex', borderBottom:'2px solid #dee2e6', overflowX:'auto', padding:'0 20px', background:'white', gap:0}}>
        {TABS.map(t => (
          <button key={t.id}
            style={{padding:'12px 18px', fontSize:'13.5px', fontWeight: activeId===t.id ? 600 : 500,
                    color: activeId===t.id ? '#0073b7' : '#666', border:'none', background:'none',
                    cursor:'pointer', borderBottom: activeId===t.id ? '2px solid #0073b7' : '2px solid transparent',
                    marginBottom:-2, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6}}
            onClick={() => setActiveId(t.id)}>
            <t.icon size={15}/> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="hub-content" style={{padding:16}}>
        {active.render()}
      </div>
    </div>
  );
}
