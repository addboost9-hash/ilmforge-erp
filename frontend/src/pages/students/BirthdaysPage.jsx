import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Cake, MessageSquare, Users, Award } from 'lucide-react';

export default function BirthdaysPage() {
  const { data: students, isLoading: sLoading } = useQuery({
    queryKey: ['birthdays'],
    queryFn: () => api.get('/students/birthdays/today').then(r => r.data.data || []),
  });

  const { data: staff } = useQuery({
    queryKey: ['staff-birthdays'],
    queryFn: () => api.get('/staff').then(r =>
      (r.data.data || []).filter(s => {
        if (!s.dob) return false;
        const dob = new Date(s.dob);
        const today = new Date();
        return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
      })
    ).catch(() => []),
  });

  const totalBirthdays = (students?.length||0) + (staff?.length||0);

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Birthdays Today 🎂</h1>
          <p className="page-subtitle">
            {totalBirthdays} birthday{totalBirthdays!==1?'s':''} today — students & staff combined
          </p>
        </div>
        {totalBirthdays > 0 && (
          <button className="btn btn-teal">
            <MessageSquare size={14}/> Wish All via SMS
          </button>
        )}
      </div>

      {/* ── Student Birthdays ─────────────── */}
      <div className="card" style={{ marginBottom:14, padding:0 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(90deg,#1E3A5F,#253d63)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Users size={15} color="#5EEAD4"/>
            <span style={{ fontSize:13.5, fontWeight:700, color:'#fff' }}>Student Birthdays</span>
          </div>
          {students?.length > 0 && (
            <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:11.5, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>
              {students.length} students
            </span>
          )}
        </div>

        {sLoading ? <div className="loading-center" style={{ padding:32 }}><div className="spinner"/></div>
        : students?.length === 0 ? (
          <div className="empty-state" style={{ padding:40 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🎂</div>
            <div className="empty-state-text">No student birthdays today</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead>
                <tr><th>Roll No</th><th>Photo</th><th>Student Name</th><th>Parent</th><th>Class</th><th>Date of Birth</th><th>Action</th></tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const colors = ['#F472B6','#818CF8','#34D399','#60A5FA','#FBBF24','#F87171','#A78BFA'];
                  const c = colors[i % colors.length];
                  return (
                    <tr key={s.id}>
                      <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#0D9488', fontSize:12 }}>{s.rollNo||'—'}</span></td>
                      <td>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:c+'25', border:`2px solid ${c}50`, display:'flex', alignItems:'center', justifyContent:'center', color:c, fontWeight:800, fontSize:14 }}>
                          {s.name?.charAt(0)}
                        </div>
                      </td>
                      <td style={{ fontWeight:700, color:'#1E3A5F' }}>{s.name}</td>
                      <td style={{ fontSize:12.5, color:'#64748B' }}>{s.fatherName||'—'}</td>
                      <td><span className="badge badge-blue">{s.class?.name||'—'}</span></td>
                      <td style={{ fontSize:12.5, color:'#64748B' }}>{s.dob ? new Date(s.dob).toLocaleDateString('en-PK',{day:'numeric',month:'long'}) : '—'}</td>
                      <td>
                        <span style={{ fontSize:16 }}>🎉</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Staff Birthdays ───────────────── */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(90deg,#7C3AED,#6D28D9)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Award size={15} color="#DDD6FE"/>
            <span style={{ fontSize:13.5, fontWeight:700, color:'#fff' }}>Staff Birthdays</span>
          </div>
          {(staff?.length||0) > 0 && (
            <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:11.5, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>
              {staff.length} staff
            </span>
          )}
        </div>

        {(!staff || staff.length === 0) ? (
          <div className="empty-state" style={{ padding:40 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🎂</div>
            <div className="empty-state-text">No staff birthdays today</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead>
                <tr><th>Emp. Code</th><th>Photo</th><th>Name</th><th>Department</th><th>Designation</th><th>Action</th></tr>
              </thead>
              <tbody>
                {staff.map((s, i) => {
                  const colors = ['#34D399','#60A5FA','#FBBF24','#F472B6','#818CF8'];
                  const c = colors[i % colors.length];
                  return (
                    <tr key={s.id}>
                      <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#7C3AED', fontSize:12 }}>{s.empCode||'S-'+s.id}</span></td>
                      <td>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:c+'25', border:`2px solid ${c}50`, display:'flex', alignItems:'center', justifyContent:'center', color:c, fontWeight:800, fontSize:14 }}>
                          {s.name?.charAt(0)}
                        </div>
                      </td>
                      <td style={{ fontWeight:700, color:'#1E3A5F' }}>{s.name}</td>
                      <td style={{ fontSize:12.5, color:'#64748B' }}>{s.department?.name||'—'}</td>
                      <td><span className="badge badge-purple">{s.designation||'Staff'}</span></td>
                      <td><span style={{ fontSize:16 }}>🎉</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
