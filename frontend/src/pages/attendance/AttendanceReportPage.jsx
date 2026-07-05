import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Printer } from 'lucide-react';

export default function AttendanceReportPage() {
  const [filters, setFilters] = useState({
    classId: '',
    month: new Date().getMonth()+1,
    year: new Date().getFullYear(),
  });

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['att-summary', filters],
    enabled: !!filters.classId,
    queryFn: () => api.get('/attendance/summary', {params:filters}).then(r => r.data.data),
  });

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const summary = data || [];
  const totalPresent = summary.reduce((s,r) => s+(r.present||0), 0);
  const totalAbsent = summary.reduce((s,r) => s+(r.absent||0), 0);
  const avgPct = summary.length ? Math.round(summary.reduce((s,r)=>s+(r.percentage||0),0)/summary.length) : 0;

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Attendance Report</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Monthly attendance summary per student</p>
        </div>
        <button className="btn btn-outline" onClick={() => window.print()} disabled={!filters.classId}><Printer size={14}/> Print</button>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:14, padding:14}}>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end'}}>
          <div>
            <label className="form-label">Class *</label>
            <select className="form-select" style={{width:160}} value={filters.classId} onChange={e=>setFilters({...filters,classId:e.target.value})}>
              <option value="">Select Class</option>
              {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Month</label>
            <select className="form-select" style={{width:140}} value={filters.month} onChange={e=>setFilters({...filters,month:parseInt(e.target.value)})}>
              {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Year</label>
            <input className="form-input" type="number" style={{width:100}} value={filters.year} onChange={e=>setFilters({...filters,year:parseInt(e.target.value)})}/>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {summary.length > 0 && (
        <div className="stats-grid-3" style={{marginBottom:14}}>
          {[
            {l:'Total Present Days', v:totalPresent, c:'#15803D', bg:'#DCFCE7'},
            {l:'Total Absent Days', v:totalAbsent, c:'#B91C1C', bg:'#FEE2E2'},
            {l:'Avg Attendance', v:avgPct+'%', c:avgPct>=75?'#15803D':'#B91C1C', bg:avgPct>=75?'#DCFCE7':'#FEE2E2'},
          ].map(item => (
            <div key={item.l} className="card" style={{background:item.bg, border:'none', padding:14, textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:800, color:item.c}}>{item.v}</div>
              <div style={{fontSize:12, color:'#64748B', fontWeight:600}}>{item.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {!filters.classId ? (
          <div className="empty-state" style={{padding:48}}>
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Select a class to view attendance report</div>
          </div>
        ) : isLoading ? (
          <div className="loading-center"><div className="spinner"/></div>
        ) : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr><th>Roll</th><th>Name</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total</th><th>Percentage</th></tr>
              </thead>
              <tbody>
                {summary.map(s => (
                  <tr key={s.studentId}>
                    <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#0D9488',fontSize:12}}>{s.rollNo||'—'}</span></td>
                    <td style={{fontWeight:600, color:'#1E3A5F'}}>{s.name}</td>
                    <td><span style={{fontWeight:700, color:'#15803D'}}>{s.present||0}</span></td>
                    <td><span style={{fontWeight:700, color:'#DC2626'}}>{s.absent||0}</span></td>
                    <td style={{color:'#B45309'}}>{s.leave||0}</td>
                    <td style={{color:'#64748B'}}>{s.total||0}</td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div className="progress-bar" style={{width:60}}>
                          <div className="progress-fill" style={{width:`${s.percentage||0}%`, background:s.percentage>=75?'#0D9488':'#DC2626'}}/>
                        </div>
                        <span className={`badge ${(s.percentage||0)>=75?'badge-green':(s.percentage||0)>=50?'badge-amber':'badge-red'}`}>
                          {s.percentage||0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {summary.length===0 && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No attendance data for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
