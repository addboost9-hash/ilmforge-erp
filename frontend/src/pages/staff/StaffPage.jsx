import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { UserPlus, Edit, Award, Users, UserCheck, UserX, Phone, Mail } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function StaffPage() {
  const { data, isLoading } = useQuery({ queryKey:['staff'], queryFn:()=>api.get('/staff').then(r=>r.data) });
  const { data:stats } = useQuery({ queryKey:['staff-stats'], queryFn:()=>api.get('/staff/stats').then(r=>r.data.data) });

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Manage teachers and non-teaching staff</p>
        </div>
        <Link to="/staff/new" className="btn btn-teal"><UserPlus size={15}/> Add Staff</Link>
      </div>

      {/* Stats */}
      <div className="stats-grid-3" style={{marginBottom:20}}>
        {[
          {l:'Total Staff', v:stats?.total||data?.total||0, c:'#1E3A5F', bg:'linear-gradient(135deg,#1E3A5F,#253D63)', icon:Users},
          {l:'Present Today', v:stats?.presentToday||0, c:'#fff', bg:'linear-gradient(135deg,#0D9488,#0F766E)', icon:UserCheck},
          {l:'Absent Today', v:stats?.absentToday||0, c:'#fff', bg:'linear-gradient(135deg,#DC2626,#B91C1C)', icon:UserX},
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.l} className="kpi-card" style={{background:item.bg}}>
              <div style={{position:'absolute',right:14,top:14,opacity:0.2}}><Icon size={40}/></div>
              <div style={{fontSize:28,fontWeight:800}}>{item.v}</div>
              <div style={{fontSize:13,opacity:0.85,marginTop:4}}>{item.l}</div>
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="alert alert-info" style={{marginBottom:14}}>
        <span>📱</span>
        <span>Staff app login: <strong>Email</strong> / Password: <strong>teacher</strong> (must change on first login). Teacher portal available on iOS & Android.</span>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
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
                {(data?.data||[]).map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{color:'#94a3b8', fontSize:12}}>{idx+1}</td>
                    <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#0D9488',fontSize:12}}>{s.empCode||'S-'+s.id}</span></td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:9}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#6D28D9)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0}}>
                          {s.name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{fontWeight:600, fontSize:13, color:'#1E3A5F'}}>{s.name}</div>
                          <div style={{fontSize:11, color:'#94a3b8'}}>{s.user?.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{fontSize:12.5, color:'#475569'}}>{s.department?.name||'—'}</td>
                    <td style={{fontSize:12.5}}>{s.designation||'—'}</td>
                    <td style={{fontSize:12, color:'#64748B'}}>
                      {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString('en-PK') : '—'}
                    </td>
                    <td style={{fontWeight:700, color:'#15803D'}}>{money(s.basicSalary)}</td>
                    <td>
                      <div style={{display:'flex', gap:5}}>
                        <Link to={'/staff/'+s.id+'/edit'} className="btn btn-outline btn-sm btn-icon" title="Edit">
                          <Edit size={13}/>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data?.data||data.data.length===0) && (
                  <tr><td colSpan={8}>
                    <EmptyState
                      type="staff"
                      title="No staff members added"
                      description="Add your teachers and staff to get started"
                      action={() => window.location.href = '/staff/new'}
                      actionLabel="Add Staff Member"
                    />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
