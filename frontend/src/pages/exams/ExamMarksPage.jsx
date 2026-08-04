/**
 * IlmForge — Exam Marks Entry
 * Works with or without a pre-assigned class
 * Supports subject selection, bulk marking, absent toggle
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, ArrowLeft, CheckCircle, Users, BookOpen } from 'lucide-react';

// Matches the backend's calcGrade bands exactly (exam.routes.js) so this
// live preview never disagrees with the grade actually saved server-side.
const gradeFor = (obtained, total, absent) => {
  if (absent) return 'ABS';
  if (!obtained || !total) return '—';
  const pct = (parseInt(obtained) / parseInt(total)) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};
const gradeColor = g => {
  if (!g || g === '—' || g === 'ABS') return '#94a3b8';
  if (g === 'A+' || g === 'A') return '#15803D';
  if (g === 'B' || g === 'C') return '#1D4ED8';
  if (g === 'D' || g === 'E') return '#B45309';
  return '#B91C1C';
};

export default function ExamMarksPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [marks, setMarks] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [totalMarksDefault, setTotalMarksDefault] = useState(100);

  /* ── Data ── */
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });
  const { data: allExams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data),
  });
  const exam = allExams?.find(e => e.id === parseInt(id));

  /* Use exam's class or the manually selected one */
  const activeClassId = exam?.classId || selectedClass || null;

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-exam', activeClassId],
    enabled: !!activeClassId,
    queryFn: () =>
      api.get('/students', { params: { classId: activeClassId, status: 'active', limit: 300 } })
         .then(r => r.data.data),
  });

  /* Load existing marks if any */
  const { data: existingMarks } = useQuery({
    queryKey: ['exam-marks-existing', id],
    queryFn: () => api.get('/exams/' + id + '/results').then(r => r.data.data || []),
  });

  /* Init marks when students load */
  useEffect(() => {
    if (!students?.length) return;
    setMarks(prev => {
      const m = { ...prev };
      students.forEach(s => {
        if (!m[s.id]) {
          // Check if we already have marks for this student from existing results
          const existing = existingMarks?.find(em => em.studentId === s.id);
          m[s.id] = {
            obtained: existing ? String(existing.obtainedMarks) : '',
            total:    existing ? String(existing.totalMarks)    : String(totalMarksDefault),
            absent:   existing ? existing.isAbsent              : false,
          };
        }
      });
      return m;
    });
  }, [students, existingMarks]);

  /* Set all totals when default changes */
  const applyDefaultTotal = () => {
    setMarks(prev => {
      const m = { ...prev };
      Object.keys(m).forEach(sid => { m[sid] = { ...m[sid], total: String(totalMarksDefault) }; });
      return m;
    });
    toast.success(`Total marks set to ${totalMarksDefault} for all students`);
  };

  /* Save mutation */
  const save = useMutation({
    mutationFn: () =>
      api.post('/exams/' + id + '/marks', {
        marks: Object.entries(marks).map(([sid, m]) => ({
          studentId:     parseInt(sid),
          obtainedMarks: parseInt(m.obtained || 0),
          totalMarks:    parseInt(m.total || totalMarksDefault),
          isAbsent:      m.absent || false,
        })),
      }),
    onSuccess: () => {
      toast.success('Marks saved successfully! ✅');
      qc.invalidateQueries(['exam-results', id]);
      qc.invalidateQueries(['exam-marks-existing', id]);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save marks'),
  });

  const total  = students?.length || 0;
  const filled = Object.values(marks).filter(m => m.absent || m.obtained !== '').length;

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <Link to="/exams" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15}/></Link>
        <div style={{ flex:1 }}>
          <h1 className="page-title">Enter Marks</h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:2 }}>
            {exam?.title || 'Loading…'} &nbsp;·&nbsp;
            <span style={{ color: filled===total && total>0 ? '#15803D' : '#0F766E', fontWeight:600 }}>
              {filled}/{total} students filled
            </span>
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link to={`/exams/${id}/results`} className="btn btn-outline btn-sm">View Results</Link>
          <button className="btn btn-teal" onClick={() => save.mutate()} disabled={save.isPending || total === 0}>
            <Save size={14}/> {save.isPending ? 'Saving…' : 'Save Marks'}
          </button>
        </div>
      </div>

      {/* Class + Total selector */}
      <div className="card" style={{ marginBottom:14, padding:14 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>

          {/* Class selector — only shows when exam has no assigned class */}
          {!exam?.classId && (
            <div className="form-group" style={{ marginBottom:0, minWidth:200 }}>
              <label className="form-label"><Users size={12} style={{marginRight:4}}/>Select Class *</label>
              <select className="form-select" value={selectedClass} onChange={e=>{ setSelectedClass(e.target.value); setMarks({}); }}>
                <option value="">— Choose a class —</option>
                {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {exam?.classId && (
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label"><Users size={12} style={{marginRight:4}}/>Class</label>
              <div className="form-input" style={{ background:'#F8FAFC', color:'#0F766E', fontWeight:700, width:'auto', display:'inline-block', minWidth:160 }}>
                {(classes||[]).find(c=>c.id===exam.classId)?.name || `Class ${exam.classId}`}
              </div>
            </div>
          )}

          {/* Total marks for all */}
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label"><BookOpen size={12} style={{marginRight:4}}/>Total Marks (default)</label>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input type="number" className="form-input" style={{ width:90 }}
                value={totalMarksDefault}
                onChange={e => setTotalMarksDefault(parseInt(e.target.value)||100)}/>
              <button className="btn btn-sm btn-outline" onClick={applyDefaultTotal}>Apply All</button>
            </div>
          </div>

          {/* Quick fill - mark all present */}
          {total > 0 && (
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Quick Actions</label>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-sm btn-outline"
                  onClick={() => {
                    setMarks(prev => {
                      const m = {...prev};
                      Object.keys(m).forEach(sid => { m[sid] = {...m[sid], absent: false}; });
                      return m;
                    });
                    toast('All marked Present');
                  }}>
                  ✓ All Present
                </button>
                <button className="btn btn-sm btn-outline" style={{ borderColor:'#FCA5A5', color:'#B91C1C', background:'#FEF2F2' }}
                  onClick={() => {
                    setMarks(prev => {
                      const m = {...prev};
                      Object.keys(m).forEach(sid => { m[sid] = {...m[sid], absent: true, obtained: ''}; });
                      return m;
                    });
                    toast('All marked Absent');
                  }}>
                  ✗ All Absent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* No class selected state */}
      {!activeClassId && (
        <div className="card">
          <div className="empty-state" style={{ padding:32 }}>
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">Select a Class</div>
            <div className="empty-state-sub">Choose a class above to load students for marks entry</div>
          </div>
        </div>
      )}

      {/* Progress */}
      {total > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748B', marginBottom:4 }}>
            <span>Progress: {filled}/{total} filled</span>
            <span style={{ fontWeight:700, color: filled===total?'#15803D':'#0F766E' }}>
              {total ? Math.round((filled/total)*100) : 0}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill"
              style={{ width:`${total?(filled/total)*100:0}%`, background: filled===total?'#15803D':'#0D9488', transition:'width .2s' }}/>
          </div>
        </div>
      )}

      {/* Marks Table */}
      {activeClassId && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {studentsLoading ? (
            <div className="loading-center" style={{ padding:40 }}><div className="spinner"/></div>
          ) : (
            <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width:40 }}>#</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th style={{ width:100 }}>Total Marks</th>
                    <th style={{ width:130 }}>Obtained Marks</th>
                    <th style={{ width:90 }}>Absent</th>
                    <th style={{ width:70 }}>Grade</th>
                    <th style={{ width:80 }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {(students||[]).map((s, idx) => {
                    const m = marks[s.id] || { obtained:'', total:String(totalMarksDefault), absent:false };
                    const grade = gradeFor(m.obtained, m.total, m.absent);
                    const pct   = !m.absent && m.obtained && m.total
                      ? Math.round((parseInt(m.obtained)/parseInt(m.total))*100)
                      : null;

                    return (
                      <tr key={s.id} style={{ background: m.absent ? '#FEF2F2' : undefined }}>
                        <td style={{ color:'#94a3b8', fontSize:12 }}>{idx+1}</td>
                        <td>
                          <span style={{ fontFamily:'monospace', fontWeight:700, color:'#0D9488', fontSize:12 }}>
                            {s.rollNo||'—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {(() => {
                              const photo = typeof window !== 'undefined' ? localStorage.getItem(`photo_student_${s.id}`) : null;
                              return photo ? (
                                <img src={photo} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
                              ) : (
                                <div style={{ width:28,height:28,borderRadius:'50%',background:s.gender==='female'?'linear-gradient(135deg,#F472B6,#EC4899)':'linear-gradient(135deg,#0F766E,#0D9488)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11,flexShrink:0 }}>
                                  {s.name?.charAt(0)}
                                </div>
                              );
                            })()}
                            <span style={{ fontWeight:600, fontSize:13 }}>{s.name}</span>
                          </div>
                        </td>
                        <td>
                          <input type="number" className="form-input"
                            style={{ width:80, height:32, padding:'4px 8px', fontSize:12 }}
                            value={m.total || totalMarksDefault}
                            onChange={e => {
                              const raw = e.target.value;
                              const clamped = raw === '' ? '' : String(Math.max(1, parseInt(raw) || 1));
                              setMarks(prev => ({...prev, [s.id]:{...m, total:clamped}}));
                            }}
                            disabled={m.absent}
                            min="1"/>
                        </td>
                        <td>
                          <input type="number" className="form-input"
                            style={{ width:100, height:32, padding:'4px 8px', fontSize:12,
                              borderColor: m.obtained && pct !== null && pct < 40 ? '#FCA5A5' : undefined,
                              background:  m.obtained && pct !== null && pct >= 40 ? '#F0FDF4' : m.obtained ? '#FEF2F2' : undefined
                            }}
                            value={m.obtained}
                            onChange={e => {
                              const raw = e.target.value;
                              const ceiling = parseInt(m.total || totalMarksDefault) || 100;
                              const clamped = raw === '' ? '' : String(Math.min(ceiling, Math.max(0, parseInt(raw) || 0)));
                              setMarks(prev => ({...prev, [s.id]:{...m, obtained:clamped}}));
                            }}
                            disabled={m.absent}
                            placeholder="0"
                            min="0" max={m.total || totalMarksDefault}/>
                        </td>
                        <td>
                          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                            <input type="checkbox" checked={m.absent||false}
                              onChange={e => setMarks(prev => ({...prev, [s.id]:{...m, absent:e.target.checked, obtained:e.target.checked?'':m.obtained}}))}
                              style={{ width:16, height:16, accentColor:'#B91C1C' }}/>
                            <span style={{ fontSize:12, color:'#B91C1C', fontWeight:m.absent?700:400 }}>
                              {m.absent ? 'ABS' : 'Present'}
                            </span>
                          </label>
                        </td>
                        <td>
                          <span style={{ fontWeight:800, fontSize:14, color:gradeColor(grade) }}>{grade}</span>
                        </td>
                        <td style={{ fontSize:12, fontWeight:600, color: pct!==null?(pct>=40?'#15803D':'#B91C1C'):'#94a3b8' }}>
                          {pct !== null ? `${pct}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {(!students || students.length === 0) && (
                    <tr>
                      <td colSpan={8} style={{ textAlign:'center', padding:32, color:'#94a3b8' }}>
                        {activeClassId ? 'No active students in this class' : 'Select a class to load students'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bottom save bar */}
      {total > 0 && (
        <div style={{ position:'sticky', bottom:16, marginTop:14, display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-teal"
            style={{ padding:'10px 28px', fontSize:14, fontWeight:700, boxShadow:'0 4px 16px rgba(15,118,110,0.35)' }}
            onClick={() => save.mutate()} disabled={save.isPending}>
            <Save size={15}/> {save.isPending ? 'Saving…' : `Save All Marks (${filled}/${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
