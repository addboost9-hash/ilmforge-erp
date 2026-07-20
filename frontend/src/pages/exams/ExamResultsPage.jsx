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

const calcGrade = pct => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
};

/* ─── A4 Print styles injected once ──────────────────────── */
const PRINT_STYLES = `
@media print {
  @page { size: A4 portrait; margin: 14mm 12mm; }
  body * { visibility: hidden !important; }
  #exam-result-print-area,
  #exam-result-print-area * { visibility: visible !important; }
  #exam-result-print-area {
    position: fixed; inset: 0;
    width: 100%; height: 100%;
    overflow: visible;
    background: #fff;
  }
  .no-print { display: none !important; }

  /* One report card per page */
  .result-report-card { page-break-after: always; }
  .result-report-card:last-child { page-break-after: avoid; }
}
`;

/* ─── Single student report card (print) ──────────────────── */
function StudentReportCard({ student, exam, serialNo }) {
  const subjects = student.subjects || [];
  const totalMax = subjects.reduce((s, r) => s + (r.totalMarks || 0), 0) || student.totalMarks || 0;
  const totalObt = subjects.reduce((s, r) => s + (r.isAbsent ? 0 : (r.obtainedMarks || 0)), 0) || (student.isAbsent ? 0 : student.obtainedMarks || 0);
  const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
  const overallGrade = calcGrade(pct);
  const gc = gradeColor(overallGrade);
  const pass = pct >= 40;

  /* If there are no per-subject rows, show the single row */
  const rows = subjects.length > 0 ? subjects : [
    {
      subjectName: student.subject?.name || 'General',
      totalMarks: student.totalMarks,
      obtainedMarks: student.obtainedMarks,
      isAbsent: student.isAbsent,
      grade: student.grade,
    }
  ];

  return (
    <div className="result-report-card" style={{
      fontFamily: "'Times New Roman', Times, serif",
      background: '#fff',
      border: '2px solid #1E3A5F',
      borderRadius: 6,
      padding: '18px 22px',
      maxWidth: 720,
      margin: '0 auto',
    }}>
      {/* School Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1E3A5F', paddingBottom: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1E3A5F', letterSpacing: 1 }}>
          {exam?.schoolName || 'School Name'}
        </div>
        {exam?.schoolAddress && (
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{exam.schoolAddress}</div>
        )}
        <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#0D9488', letterSpacing: 3, textTransform: 'uppercase' }}>
          Progress Report Card
        </div>
      </div>

      {/* Student Info strip */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ width: '40%', padding: '3px 0' }}>
              <span style={{ color: '#64748B' }}>Student:</span>{' '}
              <strong style={{ color: '#1E3A5F' }}>{student.student?.name || student.name || '—'}</strong>
            </td>
            <td style={{ width: '20%', padding: '3px 0' }}>
              <span style={{ color: '#64748B' }}>Roll No:</span>{' '}
              <strong>{student.student?.rollNo || student.rollNo || serialNo || '—'}</strong>
            </td>
            <td style={{ width: '40%', padding: '3px 0', textAlign: 'right' }}>
              <span style={{ color: '#64748B' }}>Exam:</span>{' '}
              <strong style={{ color: '#1E3A5F' }}>{exam?.title || '—'}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '3px 0' }}>
              <span style={{ color: '#64748B' }}>Class:</span>{' '}
              <strong>{exam?.class?.name || (exam?.classId ? `Class ${exam.classId}` : '—')}</strong>
            </td>
            <td style={{ padding: '3px 0' }}>
              <span style={{ color: '#64748B' }}>Term:</span>{' '}
              <strong>{exam?.term || exam?.type || '—'}</strong>
            </td>
            <td style={{ padding: '3px 0', textAlign: 'right' }}>
              <span style={{ color: '#64748B' }}>Session:</span>{' '}
              <strong>{exam?.session?.name || '—'}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Marks Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#1E3A5F', color: '#fff' }}>
            <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #1E3A5F' }}>Subject</th>
            <th style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F', width: 60 }}>Max</th>
            <th style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F', width: 60 }}>Obtained</th>
            <th style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F', width: 60 }}>%</th>
            <th style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F', width: 60 }}>Grade</th>
            <th style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F', width: 60 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rowPct = r.isAbsent ? 0 : r.totalMarks > 0 ? Math.round((r.obtainedMarks / r.totalMarks) * 100) : 0;
            const rowPass = !r.isAbsent && rowPct >= 40;
            const rowGrade = r.grade || (r.isAbsent ? 'ABS' : calcGrade(rowPct));
            const rgc = gradeColor(rowGrade);
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                <td style={{ padding: '5px 10px', fontWeight: 600, color: '#1E3A5F', border: '1px solid #E2E8F0' }}>
                  {r.subjectName || r.subject?.name || 'General'}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>{r.totalMarks}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #E2E8F0', fontWeight: 700,
                  color: r.isAbsent ? '#94a3b8' : rowPass ? '#15803D' : '#B91C1C' }}>
                  {r.isAbsent ? 'ABS' : r.obtainedMarks}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  {r.isAbsent ? '—' : `${rowPct}%`}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #E2E8F0', fontWeight: 800,
                  color: rgc.c }}>
                  {rowGrade}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: r.isAbsent ? '#F1F5F9' : rowPass ? '#DCFCE7' : '#FEE2E2',
                    color: r.isAbsent ? '#64748B' : rowPass ? '#15803D' : '#B91C1C',
                  }}>
                    {r.isAbsent ? 'Absent' : rowPass ? 'Pass' : 'Fail'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#1E3A5F', color: '#fff', fontWeight: 800 }}>
            <td style={{ padding: '7px 10px', border: '1px solid #1E3A5F' }}>Total</td>
            <td style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F' }}>{totalMax}</td>
            <td style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F' }}>{totalObt}</td>
            <td style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F' }}>{pct}%</td>
            <td style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F',
              color: gc.c, background: gc.bg }}>
              {overallGrade}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F',
              color: pass ? '#DCFCE7' : '#FEE2E2' }}>
              {pass ? 'PASS' : 'FAIL'}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Remarks + Signature */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 24 }}>
            <strong>Teacher Remarks:</strong>&nbsp;
            <span style={{ borderBottom: '1px solid #CBD5E1', display: 'inline-block', minWidth: 260 }}>&nbsp;</span>
          </div>
          <div style={{ fontSize: 12, color: '#374151' }}>
            <strong>Promoted to:</strong>&nbsp; Class{' '}
            <span style={{ borderBottom: '1px solid #CBD5E1', display: 'inline-block', minWidth: 70 }}>&nbsp;</span>
            &nbsp;&nbsp;
            <span style={{ border: '1px solid #374151', padding: '1px 6px', marginRight: 4 }}>Promoted</span>
            <span style={{ border: '1px solid #374151', padding: '1px 6px' }}>Not Promoted</span>
          </div>
        </div>
        <div style={{ width: 160, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ height: 40 }} />
          <div style={{ borderTop: '1px solid #374151', paddingTop: 4, fontSize: 12, color: '#374151', fontWeight: 600 }}>
            Principal Signature
          </div>
        </div>
      </div>

      {/* Date */}
      <div style={{ marginTop: 10, fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
        Date: {new Date().toLocaleDateString('en-PK')}
      </div>
    </div>
  );
}

export default function ExamResultsPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['exam-results', id],
    queryFn: () => api.get('/exams/'+id+'/results').then(r => r.data.data),
  });

  const { data:allExams } = useQuery({ queryKey:['exams'], queryFn:()=>api.get('/exams').then(r=>r.data.data) });
  const exam = allExams?.find(e => e.id === parseInt(id));

  const results = data || [];

  /* Group by student so each card shows all subjects */
  const studentMap = {};
  results.forEach(m => {
    const sid = m.studentId;
    if (!studentMap[sid]) {
      studentMap[sid] = {
        studentId: sid,
        student: m.student,
        rollNo: m.student?.rollNo,
        name: m.student?.name,
        subjects: [],
        totalMarks: 0,
        obtainedMarks: 0,
        isAbsent: false,
      };
    }
    studentMap[sid].subjects.push({
      subjectName: m.subject?.name || 'General',
      totalMarks: m.totalMarks,
      obtainedMarks: m.obtainedMarks,
      isAbsent: m.isAbsent,
      grade: m.grade,
    });
    studentMap[sid].totalMarks += m.totalMarks || 0;
    studentMap[sid].obtainedMarks += m.isAbsent ? 0 : (m.obtainedMarks || 0);
  });
  const studentCards = Object.values(studentMap);

  const passed = results.filter(r => !r.isAbsent && r.obtainedMarks/r.totalMarks>=0.4).length;
  const failed = results.filter(r => !r.isAbsent && r.obtainedMarks/r.totalMarks<0.4).length;
  const absent = results.filter(r => r.isAbsent).length;

  const handlePrintCards = () => window.print();

  return (
    <div className="page-content fade-in">
      {/* Inject print styles */}
      <style>{PRINT_STYLES}</style>

      {/* Header — hidden at print */}
      <div className="no-print" style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <Link to="/exams" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15}/></Link>
        <div style={{flex:1}}>
          <h1 className="page-title">Exam Results</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>{exam?.title}</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Link to={`/exams/${id}/marks`} className="btn btn-outline btn-sm">Edit Marks</Link>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Printer size={14}/> Print Marksheet
          </button>
          {studentCards.length > 0 && (
            <button className="btn btn-teal btn-sm" onClick={handlePrintCards}>
              <Printer size={14}/> Print Report Cards (A4)
            </button>
          )}
        </div>
      </div>

      {/* Summary — hidden at print */}
      {results.length > 0 && (
        <div className="stats-grid-4 no-print" style={{marginBottom:16}}>
          {[
            {l:'Total Students', v:studentCards.length, c:'#1E3A5F', bg:'#EFF6FF'},
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

      {/* Marksheet table — hidden at print */}
      <div className="card no-print" style={{padding:0, overflow:'hidden'}}>
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

      {/* ── A4 Report Cards (only shown at print) ─────────────────────── */}
      {studentCards.length > 0 && (
        <div id="exam-result-print-area">
          {studentCards.map((s, i) => (
            <StudentReportCard
              key={s.studentId}
              student={s}
              exam={exam}
              serialNo={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
