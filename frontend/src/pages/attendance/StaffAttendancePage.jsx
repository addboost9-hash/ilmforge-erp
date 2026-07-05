import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { UserCheck, UserX, Clock } from 'lucide-react';

export default function StaffAttendancePage() {
  const today = new Date().toISOString().split('T')[0];
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(today);

  const { data:staffData, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  });
  const { data:stats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: () => api.get('/staff/stats').then(r => r.data.data),
  });

  const staff = staffData?.data || [];
  const markAll = (status) => {
    const m = {};
    staff.forEach(s => m[s.id] = status);
    setAttendance(m);
  };

  const present = Object.values(attendance).filter(v => v==='present').length;
  const absent  = Object.values(attendance).filter(v => v==='absent').length;

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Staff Attendance</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Mark daily attendance for all staff members</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:150}}/>
          <button className="btn btn-teal"><UserCheck size={15}/> Save Attendance</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-3" style={{marginBottom:16}}>
        {[
          {l:'Total Staff', v:stats?.total||staff.length, c:'#1E3A5F', bg:'#EFF6FF'},
          {l:'Present Today', v:stats?.presentToday||present, c:'#15803D', bg:'#DCFCE7'},
          {l:'Absent Today', v:stats?.absentToday||absent, c:'#DC2626', bg:'#FEE2E2'},
        ].map(item => (
          <div key={item.l} className="card" style={{background:item.bg, border:'none', padding:16, textAlign:'center'}}>
            <div style={{fontSize:24, fontWeight:800, color:item.c}}>{item.v}</div>
            <div style={{fontSize:12, color:'#64748B', fontWeight:600, marginTop:2}}>{item.l}</div>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <button className="btn btn-sm btn-green" onClick={() => markAll('present')}><UserCheck size={13}/> All Present</button>
        <button className="btn btn-sm btn-red" onClick={() => markAll('absent')}><UserX size={13}/> All Absent</button>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Emp Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{color:'#94a3b8'}}>{idx+1}</td>
                    <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#0D9488'}}>{s.empCode||'S-'+s.id}</span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#0D9488,#0F766E)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11}}>
                          {s.name?.charAt(0)}
                        </div>
                        <span style={{fontWeight:600}}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{fontSize:12.5,color:'#64748B'}}>{s.department?.name||'—'}</td>
                    <td style={{fontSize:12.5,color:'#64748B'}}>{s.designation||'—'}</td>
                    <td>
                      <div style={{display:'flex', gap:6}}>
                        {[
                          {val:'present', label:'P', c:'#15803D', bg:'#DCFCE7'},
                          {val:'absent',  label:'A', c:'#B91C1C', bg:'#FEE2E2'},
                          {val:'leave',   label:'L', c:'#B45309', bg:'#FEF3C7'},
                        ].map(({val,label,c,bg}) => (
                          <button key={val} onClick={() => setAttendance({...attendance,[s.id]:val})}
                            style={{
                              padding:'4px 10px', borderRadius:5, cursor:'pointer',
                              fontWeight:attendance[s.id]===val?700:400, fontSize:12,
                              background:attendance[s.id]===val?bg:'#F8FAFC',
                              color:attendance[s.id]===val?c:'#94a3b8',
                              border:`1px solid ${attendance[s.id]===val?c:'#E8EDF3'}`,
                            }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No staff found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
