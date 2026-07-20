import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, CheckCircle, XCircle, Clock, RefreshCw, Users, AlertTriangle } from 'lucide-react';

export default function AttendancePage() {
  const qc    = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({ classId:'', sectionId:'', date:today });
  const [attendance, setAttendance] = useState({});

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance', filters],
    enabled: !!filters.classId,
    queryFn: () => api.get('/attendance', {params:filters}).then(r => r.data.data),
  });

  useEffect(() => {
    if (data) {
      const m = {};
      data.forEach(s => { m[s.id] = s.attendance?.status || 'present'; });
      setAttendance(m);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.post('/attendance/save', {
      classId: filters.classId,
      sectionId: filters.sectionId || null,
      date: filters.date,
      records: Object.entries(attendance).map(([studentId, status]) => ({ studentId: parseInt(studentId), status })),
    }),
    onSuccess: (r, _variables, _context) => {
      const count = Object.keys(attendance).length;
      const label = filters.date < today ? 'correction saved' : 'saved';
      toast.success(`Attendance ${label} for ${count} student${count !== 1 ? 's' : ''}!`);
      // Refresh dashboard so attendance stats update immediately
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save attendance'),
  });

  const isPastDate = filters.date && filters.date < today;

  const cls = (classes||[]).find(c => c.id === parseInt(filters.classId));
  const sections = cls?.sections || [];
  const markAll = (status) => {
    const m = {};
    (data||[]).forEach(s => m[s.id] = status);
    setAttendance(m);
  };

  const present = Object.values(attendance).filter(v => v==='present').length;
  const absent  = Object.values(attendance).filter(v => v==='absent').length;
  const leave   = Object.values(attendance).filter(v => v==='leave').length;
  const total   = data?.length || 0;

  const statusBtns = [
    { val:'present', label:'P', color:'#15803D', bg:'#DCFCE7', border:'#BBF7D0' },
    { val:'absent',  label:'A', color:'#B91C1C', bg:'#FEE2E2', border:'#FECACA' },
    { val:'leave',   label:'L', color:'#B45309', bg:'#FEF3C7', border:'#FDE68A' },
    { val:'late',    label:'Lt', color:'#1D4ED8', bg:'#DBEAFE', border:'#BFDBFE' },
  ];

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
        <div>
          <h1 className="page-title">Mark Attendance</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            Select class and mark each student's attendance
          </p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}><RefreshCw size={14}/></button>
          <button className="btn btn-teal" onClick={() => save.mutate()} disabled={save.isPending || !filters.classId || total===0}>
            <Save size={15}/> {save.isPending ? 'Saving...' : isPastDate ? 'Save Correction' : 'Save & Notify'}
          </button>
        </div>
      </div>

      {/* Past-date correction banner */}
      {isPastDate && (
        <div style={{
          background: 'linear-gradient(90deg,#FEF3C7,#FDE68A)',
          border: '1.5px solid #F59E0B',
          borderRadius: 10,
          padding: '11px 18px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <AlertTriangle size={20} color="#B45309" style={{flexShrink:0}} />
          <div>
            <div style={{fontWeight:700, fontSize:13.5, color:'#78350F'}}>
              Editing attendance for {new Date(filters.date + 'T00:00:00').toLocaleDateString('en-PK', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}
            </div>
            <div style={{fontSize:12, color:'#92400E', marginTop:2}}>
              You are modifying a past date. Changes will be saved as corrections and may override existing records for this date.
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{marginBottom:14, padding:14}}>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end'}}>
          <div style={{flex:'0 0 160px'}}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={filters.classId}
              onChange={e => setFilters({...filters, classId:e.target.value, sectionId:''})}>
              <option value="">Select Class</option>
              {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{flex:'0 0 130px'}}>
            <label className="form-label">Section</label>
            <select className="form-select" value={filters.sectionId}
              onChange={e => setFilters({...filters, sectionId:e.target.value})}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{flex:'0 0 150px'}}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={filters.date}
              onChange={e => setFilters({...filters, date:e.target.value})}
              max={today}/>
          </div>

          {/* Bulk actions */}
          {total > 0 && (
            <div style={{display:'flex', gap:8, marginLeft:'auto', alignItems:'flex-end', paddingBottom:1}}>
              <button className="btn btn-sm btn-green" onClick={() => markAll('present')}>
                <CheckCircle size={13}/> All Present
              </button>
              <button className="btn btn-sm btn-red" onClick={() => markAll('absent')}>
                <XCircle size={13}/> All Absent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      {filters.classId && total > 0 && (
        <div style={{display:'flex', gap:10, marginBottom:14}}>
          {[
            { label:'Total', val:total, color:'#1E3A5F', bg:'#EFF6FF' },
            { label:'Present', val:present, color:'#15803D', bg:'#DCFCE7' },
            { label:'Absent', val:absent, color:'#B91C1C', bg:'#FEE2E2' },
            { label:'Leave', val:leave, color:'#B45309', bg:'#FEF3C7' },
          ].map(item => (
            <div key={item.label} style={{background:item.bg, borderRadius:8, padding:'8px 16px', textAlign:'center', minWidth:80}}>
              <div style={{fontSize:20, fontWeight:800, color:item.color}}>{item.val}</div>
              <div style={{fontSize:11, color:'#64748B', fontWeight:600}}>{item.label}</div>
            </div>
          ))}
          <div style={{marginLeft:'auto', alignSelf:'center'}}>
            <div className="progress-bar" style={{width:150, marginBottom:4}}>
              <div className="progress-fill" style={{width:`${total?((present/total)*100).toFixed(0):0}%`, background:'#0D9488'}}/>
            </div>
            <div style={{fontSize:11, color:'#64748B', textAlign:'right'}}>
              {total ? ((present/total)*100).toFixed(0) : 0}% Present
            </div>
          </div>
        </div>
      )}

      {/* Main attendance table */}
      {!filters.classId ? (
        <div className="card" style={{textAlign:'center', padding:48}}>
          <div style={{fontSize:48, marginBottom:12, opacity:0.3}}>📋</div>
          <div style={{fontSize:15, fontWeight:600, color:'#475569'}}>Select a Class to Mark Attendance</div>
          <div style={{fontSize:13, color:'#94a3b8', marginTop:4}}>Choose class and section from the filters above</div>
        </div>
      ) : (
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          {isLoading ? (
            <div className="loading-center"><div className="spinner"/></div>
          ) : (
            <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Father Name</th>
                    <th style={{minWidth:260}}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data||[]).map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{color:'#94a3b8', width:40}}>{idx+1}</td>
                      <td><span style={{fontWeight:700, color:'#0D9488', fontFamily:'monospace'}}>{s.rollNo||'—'}</span></td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <div style={{
                            width:28, height:28, borderRadius:'50%',
                            background: attendance[s.id]==='present' ? 'linear-gradient(135deg,#0D9488,#0F766E)' :
                                        attendance[s.id]==='absent'  ? 'linear-gradient(135deg,#DC2626,#B91C1C)' :
                                        attendance[s.id]==='leave'   ? 'linear-gradient(135deg,#D97706,#B45309)' :
                                                                        'linear-gradient(135deg,#94a3b8,#64748B)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#fff', fontWeight:700, fontSize:10, flexShrink:0,
                          }}>
                            {s.name?.charAt(0)}
                          </div>
                          <span style={{fontWeight:600, fontSize:13}}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{color:'#64748B', fontSize:12.5}}>{s.fatherName||'—'}</td>
                      <td>
                        <div style={{display:'flex', gap:6}}>
                          {statusBtns.map(({val, label, color, bg, border}) => (
                            <button key={val} onClick={() => setAttendance({...attendance, [s.id]:val})}
                              style={{
                                padding:'5px 12px', borderRadius:6, border:`1.5px solid ${attendance[s.id]===val ? border : '#E8EDF3'}`,
                                cursor:'pointer', fontWeight:attendance[s.id]===val ? 700 : 400,
                                fontSize:12, background:attendance[s.id]===val ? bg : '#FAFAFA',
                                color:attendance[s.id]===val ? color : '#94a3b8',
                                transition:'all 0.1s',
                              }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data || data.length===0) && (
                    <tr><td colSpan={5} style={{textAlign:'center',padding:32,color:'#94a3b8'}}>
                      No students in this class/section
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
