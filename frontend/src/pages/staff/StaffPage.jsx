import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { UserPlus, Edit, Users, UserMinus, LayoutGrid, Table, X, GraduationCap, ShieldCheck, Activity, Search, Building2 } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonRows, SkeletonCard } from '../../components/Skeleton';

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

      <button aria-label="Close" onClick={onDismiss} style={{
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

/* Department of a staff member as a filter key: its id, or 'none'. */
const deptKey = s => (s.departmentId ? String(s.departmentId) : 'none');

/* ── One row of the staff table ────────────────────────────────────── */
function StaffRow({ s, idx, onOffboard, busy }) {
  return (
    <tr>
      <td style={{ color:'#94a3b8', fontSize:12 }}>{idx+1}</td>
      <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#0D9488', fontSize:12 }}>{s.empCode||'S-'+s.id}</span></td>
      <td>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#7C3AED,#6D28D9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12, flexShrink:0, overflow:'hidden' }}>
            {s.photoUrl ? <img src={s.photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : s.name?.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight:600, fontSize:13, color:'#1E3A5F' }}>{s.name}</div>
            <div style={{ fontSize:11, color:'#94a3b8' }}>{s.user?.email || s.user?.phone || '—'}</div>
          </div>
        </div>
      </td>
      <td style={{ fontSize:12.5, color: s.department?.name ? '#475569' : '#CBD5E1' }}>{s.department?.name||'—'}</td>
      <td style={{ fontSize:12.5 }}>{s.designation||'—'}</td>
      <td style={{ fontSize:12, color:'#64748B' }}>
        {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString('en-PK') : '—'}
      </td>
      <td style={{ fontWeight:700, color:'#15803D' }}>{money(s.basicSalary)}</td>
      <td>
        <div style={{ display:'flex', gap:5 }}>
          <Link to={'/staff/'+s.id+'/edit'} className="btn btn-outline btn-sm btn-icon" title="Edit" aria-label={`Edit ${s.name}`}>
            <Edit size={13}/>
          </Link>
          {/* Staff could be added but never removed — an
              offboarded employee stayed in every list and kept
              their login. This soft-deletes and deactivates. */}
          <button
            className="btn btn-outline btn-sm btn-icon"
            style={{ color:'#B91C1C', borderColor:'#FECACA' }}
            title="Offboard"
            aria-label={`Offboard ${s.name}`}
            disabled={busy}
            onClick={() => onOffboard(s)}
          >
            <UserMinus size={13}/>
          </button>
        </div>
      </td>
    </tr>
  );
}

const readPref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const writePref = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };

/* ── Main page ─────────────────────────────────────────────────────── */
export default function StaffPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:['staff'], queryFn:()=>api.get('/staff').then(r=>r.data) });
  const { data:stats } = useQuery({ queryKey:['staff-stats'], queryFn:()=>api.get('/staff/stats').then(r=>r.data.data) });
  const { data:departments = [] } = useQuery({ queryKey:['departments'], queryFn:()=>api.get('/staff/departments').then(r=>r.data.data||[]) });

  const offboard = useMutation({
    mutationFn: (id) => api.delete(`/staff/${id}`),
    onSuccess: (r) => {
      toast.success(r.data?.message || 'Staff offboarded');
      qc.invalidateQueries({ queryKey:['staff'] });
      qc.invalidateQueries({ queryKey:['staff-stats'] });
      qc.invalidateQueries({ queryKey:['departments'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to offboard'),
  });

  const confirmOffboard = (s) => {
    if (!window.confirm(`Offboard ${s.name}? Their login will be disabled and they'll be removed from staff lists. Payroll and attendance history is kept.`)) return;
    offboard.mutate(s.id);
  };

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const [showOnboarding, setShowOnboarding] = useState(!readPref('staff_visited', ''));
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');            // '' all, 'none', or a department id
  const [grouped, setGrouped] = useState(readPref('staff_grouped', '1') === '1');

  const dismissOnboarding = () => {
    writePref('staff_visited', '1');
    setShowOnboarding(false);
  };
  const toggleGrouped = () => setGrouped(g => { writePref('staff_grouped', g ? '0' : '1'); return !g; });

  const staffList = data?.data || [];

  /* How many staff in each department, counted from the list itself, so the
     chips always match what is shown. */
  const counts = useMemo(() => {
    const c = {};
    staffList.forEach(s => { c[deptKey(s)] = (c[deptKey(s)] || 0) + 1; });
    return c;
  }, [staffList]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter(s =>
      (!dept || deptKey(s) === dept) &&
      (!q || [s.name, s.empCode, s.designation, s.department?.name, s.user?.email, s.user?.phone, s.cnic]
        .some(v => v && String(v).toLowerCase().includes(q))));
  }, [staffList, search, dept]);

  /* Department sections, in name order, "No department" last. */
  const groups = useMemo(() => {
    if (!grouped) return [{ key:'all', name:null, list:shown }];
    const by = new Map();
    shown.forEach(s => {
      const k = deptKey(s);
      if (!by.has(k)) by.set(k, { key:k, name:s.department?.name || 'No department', list:[] });
      by.get(k).list.push(s);
    });
    return [...by.values()].sort((a, b) =>
      a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.name.localeCompare(b.name));
  }, [shown, grouped]);

  /* Derive counts from list for granular stats */
  const teacherCount = staffList.filter(s =>
    s.designation?.toLowerCase().includes('teacher') ||
    s.designation?.toLowerCase().includes('lecturer') ||
    s.role?.toLowerCase() === 'teacher'
  ).length;
  const adminCount = staffList.filter(s =>
    s.designation?.toLowerCase().includes('admin') ||
    s.designation?.toLowerCase().includes('principal') ||
    s.designation?.toLowerCase().includes('head') ||
    s.role?.toLowerCase() === 'admin'
  ).length;
  const activeCount = staffList.filter(s => s.status === 'active' || s.isActive !== false).length;

  const chip = (key, label, n) => {
    const on = dept === key;
    return (
      <button key={key || 'all'} type="button" onClick={() => setDept(key)} aria-pressed={on}
        style={{
          padding:'5px 12px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer',
          border:`1px solid ${on ? '#1B2F6E' : '#E2E8F0'}`,
          background: on ? '#1B2F6E' : '#fff', color: on ? '#fff' : '#475569',
          display:'inline-flex', alignItems:'center', gap:6,
        }}>
        {label}
        <span style={{ fontSize:11, fontWeight:700, padding:'0 6px', borderRadius:99, background: on ? 'rgba(255,255,255,0.2)' : '#F1F5F9', color: on ? '#fff' : '#64748B' }}>{n}</span>
      </button>
    );
  };

  const groupHeading = (g) => g.name && (
    <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:13, color: g.key === 'none' ? '#94A3B8' : '#1B2F6E' }}>
      <Building2 size={14}/> {g.name}
      <span style={{ fontWeight:600, fontSize:11.5, color:'#94A3B8' }}>· {g.list.length} staff</span>
    </div>
  );

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 className="page-title">Staff Directory</h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:2 }}>Manage teachers and non-teaching staff members</p>
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

      {/* Stats — Total / Teachers / Admin / Active */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14, marginBottom:20 }}>
        {[
          { l:'Total Staff',  v:stats?.total||staffList.length||0,             bg:'linear-gradient(135deg,#1E3A5F,#253D63)', icon:Users },
          { l:'Teachers',     v:stats?.teachers||teacherCount,                 bg:'linear-gradient(135deg,#0D9488,#0F766E)', icon:GraduationCap },
          { l:'Admin / Other',v:stats?.admin||adminCount,                      bg:'linear-gradient(135deg,#7C3AED,#6D28D9)', icon:ShieldCheck },
          { l:'Active',       v:stats?.active||activeCount||staffList.length,  bg:'linear-gradient(135deg,#059669,#047857)', icon:Activity },
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
        <span>Each new staff member gets their own sign-in (email or phone number) and a one-time password, shown when you save them. They set their own password on first sign-in.</span>
      </div>

      {/* Search, department filter and grouping */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:14, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:'1 1 240px', maxWidth:360 }}>
            <Search size={14} color="#94A3B8" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}/>
            <input className="form-input" style={{ paddingLeft:30 }} placeholder="Search name, code, designation, phone…"
              value={search} onChange={e => setSearch(e.target.value)} aria-label="Search staff"/>
          </div>
          <label style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:12.5, fontWeight:600, color:'#475569', cursor:'pointer' }}>
            <input type="checkbox" checked={grouped} onChange={toggleGrouped}/> Group by department
          </label>
          <Link to="/staff/departments" className="btn btn-outline btn-sm" style={{ marginLeft:'auto' }}>
            <Building2 size={13}/> Manage departments
          </Link>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }} role="group" aria-label="Filter by department">
          {chip('', 'All', staffList.length)}
          {departments.map(d => chip(String(d.id), d.name, counts[String(d.id)] || 0))}
          {(counts.none || 0) > 0 && chip('none', 'No department', counts.none)}
        </div>
      </div>

      {/* ── Loading — skeleton matches the active view mode ── */}
      {isLoading && viewMode === 'card' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      {isLoading && viewMode === 'table' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Code</th><th>Name</th><th>Department</th>
                  <th>Designation</th><th>Joining Date</th><th>Basic Salary</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonRows rows={8} cols={8} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && staffList.length > 0 && shown.length === 0 && (
        <div className="card" style={{ padding:28, textAlign:'center', color:'#64748B', fontSize:13 }}>
          No staff match{search ? ` "${search}"` : ''}{dept ? ' in this department' : ''}.{' '}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setDept(''); }}>Show everyone</button>
        </div>
      )}

      {/* ── Card Grid view ── */}
      {!isLoading && viewMode === 'card' && (
        staffList.length === 0
          ? <EmptyState type="staff" title="No staff members added" description="Add your teachers and staff to get started" action={() => window.location.href='/staff/new'} actionLabel="Add Staff Member"/>
          : (
            <div className="skeleton-content-fade" style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {groups.filter(g => g.list.length).map(g => (
                <section key={g.key} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {groupHeading(g)}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                    {g.list.map((s, i) => <StaffCard key={s.id} s={s} idx={i}/>)}
                  </div>
                </section>
              ))}
            </div>
          )
      )}

      {/* ── Table view ── */}
      {!isLoading && viewMode === 'table' && (staffList.length === 0 || shown.length > 0) && (
        <div className="card skeleton-content-fade" style={{ padding:0, overflow:'hidden' }}>
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
              {groups.filter(g => g.list.length).map(g => (
                <tbody key={g.key}>
                  {g.name && (
                    <tr style={{ background:'#F8FAFC' }}>
                      <td colSpan={8} style={{ padding:'9px 14px', borderTop:'2px solid #E2E8F0' }}>{groupHeading(g)}</td>
                    </tr>
                  )}
                  {g.list.map((s, idx) => (
                    <StaffRow key={s.id} s={s} idx={idx} onOffboard={confirmOffboard} busy={offboard.isPending}/>
                  ))}
                </tbody>
              ))}
              {staffList.length === 0 && (
                <tbody>
                  <tr><td colSpan={8}>
                    <EmptyState
                      type="staff"
                      title="No staff members added"
                      description="Add your teachers and staff to get started"
                      action={() => window.location.href='/staff/new'}
                      actionLabel="Add Staff Member"
                    />
                  </td></tr>
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
