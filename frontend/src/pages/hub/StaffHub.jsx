/** Staff & Teachers Hub — hire se salary tak ek page */
import { lazy, Suspense, useState } from 'react';
import { Briefcase, UserPlus, Users, Wallet, Clock, CreditCard, Star } from 'lucide-react';

const StaffPage       = lazy(() => import('../staff/StaffPage'));
const StaffFormPage   = lazy(() => import('../staff/StaffFormPage'));
const StaffAttendance = lazy(() => import('../attendance/StaffAttendancePage'));
const SalaryPage      = lazy(() => import('../salary/SalaryPage'));
const LoanPage        = lazy(() => import('../salary/LoanManagementPage'));
const IDCardsPage     = lazy(() => import('../idcards/IDCardsPage'));
const AppraisalsPage  = lazy(() => import('../staff/StaffAppraisalsPage'));

const ACCENT = '#605ca8';

const L = (C) => () => (
  <Suspense fallback={<div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>Loading…</div>}>
    <C />
  </Suspense>
);

const TABS = [
  { id: 'list',       label: 'All Staff',        icon: Users,      render: L(StaffPage) },
  { id: 'add',        label: 'Add Staff',         icon: UserPlus,   render: L(StaffFormPage) },
  { id: 'attendance', label: 'Staff Attendance',  icon: Clock,      render: L(StaffAttendance) },
  { id: 'salary',     label: 'Salary',            icon: Wallet,     render: L(SalaryPage) },
  { id: 'loans',      label: 'Loans',             icon: Briefcase,  render: L(LoanPage) },
  { id: 'idcards',    label: 'Staff ID Cards',    icon: CreditCard, render: L(IDCardsPage) },
  { id: 'appraisals', label: 'Appraisals',        icon: Star,       render: L(AppraisalsPage) },
];

export default function StaffHub() {
  const [activeId, setActiveId] = useState('list');
  const active = TABS.find(t => t.id === activeId) || TABS[0];

  return (
    <div className="hub-shell">
      {/* Hub Header */}
      <div style={{background:'white', padding:'20px', borderBottom:'1px solid #dee2e6', borderLeft:`4px solid ${ACCENT}`, display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:0}}>
        <div>
          <div style={{fontSize:22, fontWeight:700, color:'#333', display:'flex', alignItems:'center', gap:10}}>
            <Briefcase size={24} style={{color:ACCENT}}/> Staff &amp; Teachers Hub
          </div>
          <div style={{fontSize:13, color:'#999', marginTop:3}}>
            Hiring, attendance, salary, loans — staff ka sab kuch ek jagah
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-primary" onClick={() => setActiveId('add')}>
            <UserPlus size={15} />
            Add Staff
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
