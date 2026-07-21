import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { UserPlus, Edit, Award, Users, UserCheck, UserX, Phone, Mail, LayoutGrid, Table, X } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

/* ── Onboarding banner ─────────────────────────────────────────────── */
function OnboardingBanner({ onDismiss }) {
  const features = [
    { icon: '👤', label: 'Staff Profiles', desc: 'Store complete staff info, photos and documents' },
    { icon: '✅', label: 'Attendance', desc: 'Track daily presence and absences' },
    { icon: '💰', label: 'Payroll', desc: 'Auto-calculate salaries and print slips' },
    { icon: '⭐', label: 'Appraisals', desc: 'Rate performance and track growth' },
    { icon: '🏖️', label: 'Leave', desc: 'Manage leave requests and balances' },
  ];
  return (
    <div style={{
      background: 'linear-gradient(135deg,#1B2F6E 0%,#0073b7 100%)',
      borderRadius: 16, padding: '24px 24px 20px', marginBottom: 20,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(27,47,110,0.18)',
    }}>
      {/* decorative circles */}
      <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>
      <div style={{ position:'absolute', bottom:-20, right:80, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }}/>

      <button onClick={onDismiss} style={{
        position:'absolute', top:12, right:12, background:'rgba(255,255,255,0.15)',
        border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
      }}><X size={14}/></button>

      <div style={{ color:'#fff', fontWeight:800, fontSize:17, marginBottom:4 }}>
        Welcome to Staff Management
      </div>
      <div style={{ color:'rgba(255,255,255,0.75)', fontSize:12.5, marginBottom:18 }}>
        Everything you need to manage your school's human resources in one place.
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {features.map(f => (
          <div key={f.label} style={{
            background: 'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)',
            borderRadius: 10, padding: '10px 14px', minWidth: 130, flex:'1 1 130px',
            border: '1px solid rgba(255,255,255,0.18)',
          }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{f.icon}</div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:12, marginBottom:2 }}>{f.label}</div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, lineHeight:1.4 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Staff card (card-grid view) ───────────────────────────────────── */
function StaffCard({ s, idx }) {
  const initials = (s.name||'?').charAt(0).toUpperCase();
  return (
    <div style={{
      background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(16px)',
      borderRadius: 16, padding: 20,
      border: '1px solid rgba(255,255,255,0.45)',
      boxShadow: '0 4px 20px rgba(27,47,110,0.08)',
      animation: `ilm-fade-in 0.3s ease-out ${idx*50}ms both`,
      transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(27,47,110,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(27,47,110,0.08)'; }}
    >
      {/* Avatar */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg,#1B2F6E,#0073b7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s.photoUrl ? 0 : 22, fontWeight: 800,
        color: '#fff', marginBottom: 12, overflow: 'hidden', flexShrink: 0,
      }}>
        {s.photoUrl
          ? <img src={s.photoUrl} alt={s.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : initials
        }
      </div>

      {/* Name & role */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', lineHeight: 1.3 }}>{s.name}</div>
      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{s.designation || 'Staff'}</div>

      {/* Department badge */}
      {s.department?.name && (
        <div style={{
          display: 'inline-block', marginTop: 6, fontSize: 10.5, fontWeight: 700,
          padding: '2px 8px', borderRadius: 99,
          background: '#eff6ff', color: '#1B2F6E', border: '1px solid #bfdbfe',
        }}>{s.department.name}</div>
      )}

      {/* Salary */}
      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#15803d' }}>
        {money(s.basicSalary)}
        <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>/mo</span>
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
        <Link to={`/staff/${s.id}/edit`} style={{
          flex: 1, textAlign: 'center', padding: '6px 0',
          background: '#eff6ff', borderRadius: 8,
          fontSize: 11, fontWeight: 700, color: '#1B2F6E', textDecoration: 'none',
          border: '1px solid #bfdbfe', transition: 'background 0.15s',
        }}>Edit</Link>
        <Link to="/attendance/staff" style={{
          flex: 1, textAlign: 'center', padding: '6px 0',
          background: '#f0fdf4', borderRadius: 8,
          fontSize: 11, fontWeight: 700, color: '#059669', textDecoration: 'none',
          border: '1px solid #bbf7d0', transition: 'background 0.15s',
        }}>Attend.</Link>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */
export default function StaffPage() {
  const { data, isLoading } = useQuery({ queryKey:['staff'], queryFn:()=>api.get('/staff').then(r=>r.data) });
  const { data:stats } = useQuery({ queryKey:['staff-stats'], queryFn:()=>api.get('/staff/stats').then(r=>r.data.data) });

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('staff_visited'));

  const dismissOnboarding = () => {
    localStorage.setItem('staff_visited', '1');
    setShowOnboarding(false);
  };

  const staffList = data?.data || [];

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:2 }}>Manage teachers and non-teaching staff</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* View-mode toggle */}
          <div style={{
            display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2,
            border: '1px solid #e2e8f0',
          }}>
            <button
              onClick={() => setViewMode('table')}
              title="Table view"
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: viewMode === 'table' ? '#fff' : 'transparent',
                boxShadow: viewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                color: viewMode === 'table' ? '#1B2F6E' : '#94a3b8',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600,
              }}
            ><Table size={14}/> Table</button>
            <button
              onClick={() => setViewMode('card')}
              title="Card view"
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: viewMode === 'card' ? '#fff' : 'transparent',
                boxShadow: viewMode === 'card' ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                color: viewMode === 'card' ? '#1B2F6E' : '#94a3b8',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600,
              }}
            ><LayoutGrid size={14}/> Cards</button>
          </div>
          <Link to="/staff/new" className="btn btn-teal"><UserPlus size={15}/> Add Staff</Link>
        </div>
      </div>

      {/* Onboarding banner */}
      {showOnboarding && <OnboardingBanner onDismiss={dismissOnboarding}/>}

      {/* Stats */}
      <div className="stats-grid-3" style={{ marginBottom:20 }}>
        {[
          { l:'Total Staff',    v:stats?.total||data?.total||0, bg:'linear-gradient(135deg,#1E3A5F,#253D63)', icon:Users },
          { l:'Present Today',  v:stats?.presentToday||0,       bg:'linear-gradient(135deg,#0D9488,#0F766E)', icon:UserCheck },
          { l:'Absent Today',   v:stats?.absentToday||0,        bg:'linear-gradient(135deg,#DC2626,#B91C1C)', icon:UserX },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.l} className="kpi-card" style={{ background:item.bg }}>
              <div style={{ position:'absolute', right:14, top:14, opacity:0.2 }}><Icon size={40}/></div>
              <div style={{ fontSize:28, fontWeight:800 }}>{item.v}</div>
              <div style={{ fontSize:13, opacity:0.85, marginTop:4 }}>{item.l}</div>
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="alert alert-info" style={{ marginBottom:14 }}>
        <span>📱</span>
        <span>Staff app login: <strong>Email</strong> / Password: <strong>teacher</strong> (must change on first login). Teacher portal available on iOS &amp; Android.</span>
      </div>

      {/* ── Loading ── */}
      {isLoading && <div className="loading-center"><div className="spinner"/></div>}

      {/* ── Card Grid view ── */}
      {!isLoading && viewMode === 'card' && (
        staffList.length === 0
          ? <EmptyState type="staff" title="No staff members added" description="Add your teachers and staff to get started" action={() => window.location.href='/staff/new'} actionLabel="Add Staff Member"/>
          : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
              gap: 16,
            }}>
              {staffList.map((s, i) => <StaffCard key={s.id} s={s} idx={i}/>)}
            </div>
          )
      )}

      {/* ── Table view ── */}
      {!isLoading && viewMode === 'table' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joining Date</th>
                  <th>Basic Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color:'#94a3b8', fontSize:12 }}>{idx+1}</td>
                    <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#0D9488', fontSize:12 }}>{s.empCode||'S-'+s.id}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#7C3AED,#6D28D9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12, flexShrink:0 }}>
                          {s.name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color:'#1E3A5F' }}>{s.name}</div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>{s.user?.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:12.5, color:'#475569' }}>{s.department?.name||'—'}</td>
                    <td style={{ fontSize:12.5 }}>{s.designation||'—'}</td>
                    <td style={{ fontSize:12, color:'#64748B' }}>
                      {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString('en-PK') : '—'}
                    </td>
                    <td style={{ fontWeight:700, color:'#15803D' }}>{money(s.basicSalary)}</td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <Link to={'/staff/'+s.id+'/edit'} className="btn btn-outline btn-sm btn-icon" title="Edit">
                          <Edit size={13}/>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr><td colSpan={8}>
                    <EmptyState
                      type="staff"
                      title="No staff members added"
                      description="Add your teachers and staff to get started"
                      action={() => window.location.href='/staff/new'}
                      actionLabel="Add Staff Member"
                    />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
