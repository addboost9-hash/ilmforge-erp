import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { ArrowLeft, Printer, Trophy, BarChart2 } from 'lucide-react';

const gradeColor = g => {
  if (!g || g==='ABS') return {c:'#94a3b8', bg:'#F1F5F9'};
  if (g==='A+' || g==='A') return {c:'#15803D', bg:'#DCFCE7'};
  if (g==='B' || g==='C') return {c:'#1D4ED8', bg:'#DBEAFE'};
  if (g==='D' || g==='E') return {c:'#B45309', bg:'#FEF3C7'};
  return {c:'#B91C1C', bg:'#FEE2E2'};
};

export default function ExamResultsPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['exam-results', id],
    queryFn: () => api.get('/exams/'+id+'/results').then(r => r.data.data),
  });

  const { data:allExams } = useQuery({ queryKey:['exams'], queryFn:()=>api.get('/exams').then(r=>r.data.data) });
  const exam = allExams?.find(e => e.id === parseInt(id));

  const results = data || [];
  const passed = results.filter(r => !r.isAbsent && r.obtainedMarks/r.totalMarks>=0.4).length;
  const failed = results.filter(r => !r.isAbsent && r.obtainedMarks/r.totalMarks<0.4).length;
  const absent = results.filter(r => r.isAbsent).length;

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <Link to="/exams" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15}/></Link>
        <div style={{flex:1}}>
          <h1 className="page-title">Exam Results</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>{exam?.title}</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Link to={`/exams/${id}/marks`} className="btn btn-outline btn-sm">Edit Marks</Link>
          <button className="btn btn-teal btn-sm" onClick={() => window.print()}><Printer size={14}/> Print Marksheet</button>
        </div>
      </div>

      {/* Summary */}
      {results.length > 0 && (
        <div className="stats-grid-4" style={{marginBottom:16}}>
          {[
            {l:'Total Students', v:results.length, c:'#1E3A5F', bg:'#EFF6FF'},
            {l:'Passed', v:passed, c:'#15803D', bg:'#DCFCE7'},
            {l:'Failed', v:failed, c:'#B91C1C', bg:'#FEE2E2'},
            {l:'Absent', v:absent, c:'#64748B', bg:'#F1F5F9'},
          ].map(item => (
            <div key={item.l} className="card" style={{background:item.bg, border:'none', padding:14, textAlign:'center'}}>
              <div style={{fontSize:22, fontWeight:800, color:item.c}}>{item.v}</div>
              <div style={{fontSize:12, color:'#64748B', marginTop:2}}>{item.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Total</th>
                  <th>Obtained</th>
                  <th>%</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((m, idx) => {
                  const pct = m.isAbsent ? 0 : Math.round((m.obtainedMarks/m.totalMarks)*100);
                  const gc = gradeColor(m.grade);
                  const pass = !m.isAbsent && m.obtainedMarks/m.totalMarks >= 0.4;
                  return (
                    <tr key={idx}>
                      <td style={{color:'#94a3b8', fontSize:12}}>{idx+1}</td>
                      <td style={{fontWeight:600, color:'#1E3A5F'}}>{m.student?.name || m.studentId}</td>
                      <td style={{fontSize:12.5, color:'#64748B'}}>{m.subject?.name || 'General'}</td>
                      <td>{m.totalMarks}</td>
                      <td style={{fontWeight:700, color:m.isAbsent?'#94a3b8':pass?'#15803D':'#B91C1C'}}>
                        {m.isAbsent ? 'ABS' : m.obtainedMarks}
                      </td>
                      <td>
                        {!m.isAbsent && (
                          <div>
                            <div className="progress-bar" style={{width:60, display:'inline-block', verticalAlign:'middle', marginRight:6}}>
                              <div className="progress-fill" style={{width:`${pct}%`, background:pass?'#0D9488':'#DC2626'}}/>
                            </div>
                            <span style={{fontSize:11, fontWeight:600}}>{pct}%</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{fontWeight:800, fontSize:13, color:gc.c, background:gc.bg, padding:'3px 8px', borderRadius:4}}>
                          {m.grade || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${m.isAbsent?'badge-gray':pass?'badge-green':'badge-red'}`}>
                          {m.isAbsent ? 'Absent' : pass ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {results.length===0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📊</div>
                      <div className="empty-state-text">No results yet</div>
                      <div className="empty-state-sub">
                        <Link to={`/exams/${id}/marks`} style={{color:'#0D9488'}}>Enter marks →</Link>
                      </div>
                    </div>
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
