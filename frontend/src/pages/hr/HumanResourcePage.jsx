/**
 * IlmForge — Human Resource Module
 * School Mentor style HR hub with tabbed interface
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  Users, UserCheck, UserX, UserPlus, Briefcase,
  DollarSign, Calendar, Award, FileText, TrendingUp,
  Clock, ChevronRight, BarChart2
} from 'lucide-react';

const TABS = [
  { id: 'staff',      label: 'Staff',       icon: Users },
  { id: 'payroll',    label: 'Payroll',      icon: DollarSign },
  { id: 'attendance', label: 'Attendance',   icon: Calendar },
  { id: 'appraisals', label: 'Appraisals',   icon: Award },
  { id: 'leaves',     label: 'Leaves',       icon: Clock },
  { id: 'loans',      label: 'Loans',        icon: FileText },
];

function StatCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 12,
        background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1B2F6E', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{label}</div>
        {subtext && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{subtext}</div>}
      </div>
    </div>
  );
}

function QuickLinkCard({ title, desc, to, icon: Icon, color }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '16px 18px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.07)', border: '1px solid #f0f4ff',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', transition: 'transform .12s, box-shadow .12s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.07)'; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13.5 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{desc}</div>
        </div>
        <ChevronRight size={16} color="#94a3b8" />
      </div>
    </Link>
  );
}

/* ── STAFF TAB ── */
function StaffTab({ staff, stats, isLoading }) {
  const list = Array.isArray(staff?.data) ? staff.data : Array.isArray(staff) ? staff : [];
  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Staff"     value={stats?.total || list.length || 0}      icon={Users}      color="#1B2F6E" />
        <StatCard label="Active"          value={stats?.active || list.filter(s => s.status === 'active').length || 0} icon={UserCheck}  color="#0d9488" />
        <StatCard label="On Leave"        value={stats?.onLeave || 0}                   icon={Clock}      color="#f59e0b" />
        <StatCard label="New This Month"  value={stats?.newThisMonth || 0}              icon={UserPlus}   color="#6366f1" />
      </div>

      {/* Add Staff Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#1B2F6E', fontSize: 15, fontWeight: 600 }}>All Staff Members</h3>
        <Link to="/staff/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#1B2F6E', color: '#fff', padding: '8px 16px', borderRadius: 8,
          textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>
          <UserPlus size={15} /> Add Staff
        </Link>
      </div>

      {/* Staff table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading staff...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <Briefcase size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div>No staff members found</div>
            <Link to="/staff/new" style={{ color: '#1B2F6E', fontWeight: 600, fontSize: 13, marginTop: 8, display: 'inline-block' }}>Add your first staff member</Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Name', 'Role / Department', 'Phone', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 20).map((s, i) => (
                <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'N/A'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.email || ''}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>{s.designation || s.role || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>{s.phone || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: s.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: s.status === 'active' ? '#065f46' : '#991b1b',
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    }}>{s.status || 'Active'}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link to={`/staff/${s._id}/edit`} style={{ color: '#1B2F6E', fontSize: 12, fontWeight: 600 }}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {list.length > 20 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Link to="/staff" style={{ color: '#1B2F6E', fontWeight: 600, fontSize: 13 }}>View All {list.length} Staff Members</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PAYROLL TAB ── */
function PayrollTab() {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="This Month Payroll"  value="Pending"  icon={DollarSign}  color="#1B2F6E" />
        <StatCard label="Last Month Paid"     value="—"        icon={UserCheck}   color="#0d9488" />
        <StatCard label="Pending Salaries"    value="—"        icon={Clock}       color="#f59e0b" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <QuickLinkCard title="Process Payroll"   desc="Generate monthly salary slips" to="/payroll"   icon={DollarSign} color="#1B2F6E" />
        <QuickLinkCard title="Loan Management"   desc="Staff loans & advances"        to="/salary/loans" icon={FileText}   color="#6366f1" />
        <QuickLinkCard title="Salary History"    desc="Past payroll records"           to="/salary"    icon={BarChart2}  color="#0d9488" />
        <QuickLinkCard title="Expense Tracker"   desc="School operational expenses"   to="/expenses"  icon={TrendingUp} color="#f59e0b" />
      </div>
    </div>
  );
}

/* ── ATTENDANCE TAB ── */
function AttendanceTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Present Today"  value="—"  icon={UserCheck}  color="#0d9488" />
        <StatCard label="Absent Today"   value="—"  icon={UserX}      color="#ef4444" />
        <StatCard label="On Leave Today" value="—"  icon={Clock}      color="#f59e0b" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <QuickLinkCard title="Mark Attendance"   desc="Take today's staff attendance"  to="/attendance/staff"   icon={UserCheck}  color="#0d9488" />
        <QuickLinkCard title="Attendance Report" desc="Monthly attendance summary"      to="/attendance/report" icon={BarChart2}   color="#1B2F6E" />
        <QuickLinkCard title="Leave Balance"     desc="Staff leave entitlements"        to="/leaves"            icon={Clock}      color="#6366f1" />
        <QuickLinkCard title="Biometric Setup"   desc="Configure biometric attendance" to="/settings/biometric" icon={Users}     color="#f59e0b" />
      </div>
    </div>
  );
}

/* ── APPRAISALS TAB ── */
function AppraisalsTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Reviews"    value="—"  icon={Award}      color="#1B2F6E" />
        <StatCard label="Completed"        value="—"  icon={UserCheck}  color="#0d9488" />
        <StatCard label="Pending"          value="—"  icon={Clock}      color="#f59e0b" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <QuickLinkCard title="Staff Appraisals"  desc="Performance review management"  to="/staff/appraisals"     icon={Award}     color="#1B2F6E" />
        <QuickLinkCard title="New Appraisal"     desc="Start a performance review"      to="/staff/appraisals-new" icon={UserPlus}  color="#0d9488" />
        <QuickLinkCard title="Appraisal Reports" desc="View all review results"          to="/staff/appraisals"     icon={BarChart2} color="#6366f1" />
        <QuickLinkCard title="KPI Settings"      desc="Configure appraisal criteria"    to="/staff/appraisals"     icon={FileText}  color="#f59e0b" />
      </div>
    </div>
  );
}

/* ── LEAVES TAB ── */
function LeavesTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Leave Requests"  value="—"  icon={FileText}   color="#1B2F6E" />
        <StatCard label="Approved"        value="—"  icon={UserCheck}  color="#0d9488" />
        <StatCard label="Pending"         value="—"  icon={Clock}      color="#f59e0b" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <QuickLinkCard title="Leave Management"  desc="View & approve leave requests"  to="/leaves"  icon={Clock}     color="#1B2F6E" />
        <QuickLinkCard title="Apply Leave"       desc="Submit a new leave request"     to="/leaves"  icon={UserPlus}  color="#0d9488" />
        <QuickLinkCard title="Leave Policy"      desc="Configure leave entitlements"   to="/leaves"  icon={FileText}  color="#6366f1" />
        <QuickLinkCard title="Attendance Impact" desc="Leaves affecting attendance"    to="/attendance/staff" icon={BarChart2} color="#f59e0b" />
      </div>
    </div>
  );
}

/* ── LOANS TAB ── */
function LoansTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Loans"      value="—"  icon={FileText}   color="#1B2F6E" />
        <StatCard label="Active Loans"     value="—"  icon={Users}      color="#f59e0b" />
        <StatCard label="Recovered"        value="—"  icon={UserCheck}  color="#0d9488" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <QuickLinkCard title="Loan Management"  desc="View all staff loans"          to="/salary/loans"  icon={FileText}   color="#1B2F6E" />
        <QuickLinkCard title="New Loan"         desc="Issue a new loan to staff"     to="/salary/loans"  icon={UserPlus}   color="#0d9488" />
        <QuickLinkCard title="Recovery Schedule" desc="Loan deduction schedule"      to="/salary/loans"  icon={BarChart2}  color="#6366f1" />
        <QuickLinkCard title="Loan Reports"     desc="Monthly loan recovery report"  to="/salary/loans"  icon={TrendingUp} color="#f59e0b" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function HumanResourcePage() {
  const [activeTab, setActiveTab] = useState('staff');
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('hr_visited'));
  const [tabVisible, setTabVisible] = useState(true);

  const switchTab = (id) => {
    if (id === activeTab) return;
    setTabVisible(false);
    setTimeout(() => { setActiveTab(id); setTabVisible(true); }, 160);
  };

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: stats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: () => api.get('/staff/stats').then(r => r.data?.data || r.data),
    staleTime: 5 * 60_000,
  });

  const list = Array.isArray(staff?.data) ? staff.data : Array.isArray(staff) ? staff : [];

  return (
    <div className="page-content page-animate" style={{ padding: '20px 22px 40px' }}>

      {/* ── HR Onboarding Modal ── */}
      {showOnboarding && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',backdropFilter:'blur(8px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'rgba(255,255,255,0.97)',borderRadius:24,padding:36,maxWidth:460,width:'100%',textAlign:'center',animation:'scaleIn 0.3s ease-out',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
            <div style={{fontSize:64,marginBottom:12}}>👔</div>
            <h2 style={{fontSize:22,fontWeight:800,color:'#1B2F6E',margin:'0 0 8px'}}>HR & Human Resource</h2>
            <p style={{color:'#64748b',fontSize:13,lineHeight:1.7,margin:'0 0 20px'}}>Manage all your school's human resource operations from one place.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>
              {[
                ['👥','Staff Management','Track all staff details & roles'],
                ['💰','Payroll','Generate & pay monthly salaries'],
                ['🏆','Appraisals','Performance reviews & KPIs'],
                ['📅','Leave Management','Approve & track leave requests'],
                ['📄','Loans','Issue & recover staff loans'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{background:'#f8fafc',borderRadius:10,padding:'12px 10px',border:'1px solid #e2e8f0',textAlign:'left'}}>
                  <div style={{fontSize:24,marginBottom:4}}>{icon}</div>
                  <div style={{fontWeight:700,fontSize:12.5,color:'#1B2F6E'}}>{title}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{desc}</div>
                </div>
              ))}
              <div style={{background:'linear-gradient(135deg,#1B2F6E,#2d4a8a)',borderRadius:10,padding:'12px 10px',textAlign:'left',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div style={{fontSize:24,marginBottom:4}}>📊</div>
                <div style={{fontWeight:700,fontSize:12.5,color:'#fff'}}>Attendance</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:2}}>Daily staff attendance reports</div>
              </div>
            </div>
            <button onClick={() => { localStorage.setItem('hr_visited','1'); setShowOnboarding(false); }}
              style={{background:'linear-gradient(135deg,#1B2F6E,#0073b7)',color:'white',border:'none',borderRadius:999,padding:'11px 36px',fontSize:14,fontWeight:700,cursor:'pointer',width:'100%'}}>
              Get Started →
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1B2F6E 0%, #2d4a8a 100%)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Human Resource</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '3px 0 0' }}>
              Manage staff, payroll, attendance, appraisals, leaves & loans
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/staff/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '8px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            <UserPlus size={15} /> Add Staff
          </Link>
          <Link to="/hub/staff" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff', color: '#1B2F6E', padding: '8px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
          }}>
            Staff Hub <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, background: '#fff', padding: 6, borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 20, overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id}
              onClick={() => switchTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? '#1B2F6E' : 'transparent',
                color: active ? '#fff' : '#64748b',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ opacity: tabVisible ? 1 : 0, transform: tabVisible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.16s, transform 0.16s' }}>
        {activeTab === 'staff'      && <StaffTab staff={staff} stats={stats} isLoading={isLoading} />}
        {activeTab === 'payroll'    && <PayrollTab />}
        {activeTab === 'attendance' && <AttendanceTab />}
        {activeTab === 'appraisals' && <AppraisalsTab />}
        {activeTab === 'leaves'     && <LeavesTab />}
        {activeTab === 'loans'      && <LoansTab />}
      </div>
    </div>
  );
}
