import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { UserPlus, Search, Download, Eye, Trash2, FileText, RefreshCw, Printer, ArrowRightLeft, X, CheckCircle } from 'lucide-react';

const statusBadge = { active:'badge-teal', inactive:'badge-red', passout:'badge-gray' };

export default function StudentsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status:'active', search:'', classId:'' });
  const [page, setPage] = useState(1);

  // Promote modal state
  const [promoteModal, setPromoteModal] = useState(null); // {student}
  const [promoteForm, setPromoteForm] = useState({ classId:'', sectionId:'', status:'active' });
  const [promoteSections, setPromoteSections] = useState([]);

  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', filters, page],
    queryFn: () => api.get('/students', { params:{...filters, page, limit:25} }).then(r => r.data),
  });

  const deactivate = useMutation({
    mutationFn: id => api.delete('/students/' + id),
    onSuccess: () => { toast.success('Student deactivated'); qc.invalidateQueries(['students']); },
  });

  // Promote / transfer student
  const promote = useMutation({
    mutationFn: ({ id, data }) => api.put('/students/' + id, data),
    onSuccess: (_, vars) => {
      const st = promoteModal;
      toast.success(`${st?.name} promoted successfully! 🎓`);
      qc.invalidateQueries(['students']);
      setPromoteModal(null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Promote failed'),
  });

  const openPromote = (student) => {
    setPromoteModal(student);
    setPromoteForm({ classId: student.classId||'', sectionId: student.sectionId||'', status: student.status||'active' });
    const cls = (classes||[]).find(c => c.id === student.classId);
    setPromoteSections(cls?.sections||[]);
  };

  const onPromoteClassChange = (e) => {
    const cls = (classes||[]).find(c => c.id===parseInt(e.target.value));
    setPromoteForm(f=>({...f, classId:e.target.value, sectionId:''}));
    setPromoteSections(cls?.sections||[]);
  };

  const downloadExcel = () => {
    const p = new URLSearchParams({...filters, classId:filters.classId||''});
    window.open('/api/v1/reports/students/excel?' + p, '_blank');
  };

  const total = data?.total ?? 0;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
        <div>
          <h1 className="page-title">Students</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            Total: <strong>{total}</strong> students
          </p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-outline btn-sm" onClick={downloadExcel}><Download size={14}/> Excel</button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Printer size={14}/> Print</button>
          <button className="btn btn-teal" onClick={() => nav('/admissions')}><UserPlus size={14}/> Admit Student</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:14, padding:14}}>
        <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
          <div style={{position:'relative', flex:1, minWidth:200}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}/>
            <input className="form-input" style={{paddingLeft:32}} placeholder="Search name, roll no, father name..."
              value={filters.search} onChange={e => { setFilters({...filters, search:e.target.value}); setPage(1); }}/>
          </div>
          <select className="form-select" style={{width:160}} value={filters.classId}
            onChange={e => { setFilters({...filters, classId:e.target.value}); setPage(1); }}>
            <option value="">All Classes</option>
            {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-select" style={{width:140}} value={filters.status}
            onChange={e => { setFilters({...filters, status:e.target.value}); setPage(1); }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="passout">Pass-out</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}><RefreshCw size={13}/></button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner"/></div>
        ) : (
          <>
            <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No</th>
                    <th>Student</th>
                    <th>Father Name</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data || []).map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{color:'#94a3b8', fontSize:12}}>{(page-1)*25 + idx + 1}</td>
                      <td>
                        <span style={{fontWeight:700, color:'#0D9488', fontFamily:'monospace', fontSize:12}}>
                          {s.rollNo || '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:9}}>
                          {/* Show saved photo or initials */}
                          {(() => {
                            const photo = typeof window !== 'undefined' ? localStorage.getItem(`photo_student_${s.id}`) : null;
                            return photo ? (
                              <img src={photo} alt={s.name}
                                style={{width:34,height:34,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'2px solid #CCFBF1'}}/>
                            ) : (
                              <div style={{
                                width:34, height:34, borderRadius:'50%',
                                background: s.gender==='female' ? 'linear-gradient(135deg,#F472B6,#EC4899)' : 'linear-gradient(135deg,#0F766E,#0D9488)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                color:'#fff', fontWeight:700, fontSize:13, flexShrink:0,
                              }}>
                                {s.name?.charAt(0)}
                              </div>
                            );
                          })()}
                          <div>
                            <div style={{fontWeight:600, fontSize:13, color:'#1E3A5F'}}>{s.name}</div>
                            {s.dob && <div style={{fontSize:11, color:'#94a3b8'}}>{new Date(s.dob).toLocaleDateString('en-PK')}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{color:'#475569', fontSize:13}}>{s.fatherName || '—'}</td>
                      <td><span className="badge badge-blue">{s.class?.name || '—'}</span></td>
                      <td>{s.section?.name || '—'}</td>
                      <td style={{textTransform:'capitalize', fontSize:12, color:'#64748B'}}>{s.gender || '—'}</td>
                      <td><span className={`badge ${statusBadge[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                      <td>
                        <div style={{display:'flex', gap:5}}>
                          <Link to={'/students/'+s.id} className="btn btn-outline btn-sm btn-icon" title="View Profile">
                            <Eye size={13}/>
                          </Link>
                          <button
                            className="btn btn-sm btn-icon"
                            style={{background:'#F0FDFA',border:'1px solid #CCFBF1',color:'#0F766E'}}
                            title="Promote / Transfer"
                            onClick={() => openPromote(s)}>
                            <ArrowRightLeft size={13}/>
                          </button>
                          <a href={'/api/v1/pdf/voucher/'+s.id} target="_blank" rel="noreferrer"
                            className="btn btn-sm btn-icon" style={{background:'#EFF6FF',border:'1px solid #BFDBFE',color:'#2563EB'}} title="Fee Voucher">
                            <FileText size={13}/>
                          </a>
                          <button className="btn btn-sm btn-icon"
                            style={{background:'#FEF2F2',border:'1px solid #FECACA',color:'#B91C1C'}}
                            title="Deactivate"
                            onClick={() => { if(confirm(`Deactivate ${s.name}?`)) deactivate.mutate(s.id); }}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data?.data || data.data.length === 0) && (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state">
                          <div className="empty-state-icon">👨‍🎓</div>
                          <div className="empty-state-text">No students found</div>
                          <div className="empty-state-sub">
                            <Link to="/admissions" style={{color:'#0D9488'}}>Admit your first student →</Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
                {Array.from({length:data.pages}, (_,i) => (
                  <button key={i+1} className={`page-btn${page===i+1?' active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p=>Math.min(data.pages,p+1))} disabled={page===data.pages}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ PROMOTE / TRANSFER MODAL ═══ */}
      {promoteModal && (
        <div className="modal-overlay" onClick={() => setPromoteModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">🎓 Promote / Transfer Student</div>
                <div style={{fontSize:12.5, color:'#6B7280', marginTop:3}}>
                  Move <strong>{promoteModal.name}</strong> to a different class
                </div>
              </div>
              <button onClick={() => setPromoteModal(null)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:4}}>
                <X size={18}/>
              </button>
            </div>

            <div className="modal-body">
              {/* Current info */}
              <div style={{background:'#F8FAFC',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:13}}>
                <span style={{color:'#6B7280'}}>Current: </span>
                <strong style={{color:'#0F766E'}}>{promoteModal.class?.name||'No class'}</strong>
                {promoteModal.section?.name && <> — Section <strong>{promoteModal.section.name}</strong></>}
                <span className={`badge ${statusBadge[promoteModal.status]||'badge-gray'}`} style={{marginLeft:8}}>{promoteModal.status}</span>
              </div>

              <div className="form-group">
                <label className="form-label">New Class *</label>
                <select className="form-select" value={promoteForm.classId} onChange={onPromoteClassChange}>
                  <option value="">Select New Class</option>
                  {(classes||[]).map(c=>(
                    <option key={c.id} value={c.id}>
                      {c.name} {c.id===promoteModal.classId?'(Current)':''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">New Section</label>
                <select className="form-select" value={promoteForm.sectionId} onChange={e=>setPromoteForm(f=>({...f,sectionId:e.target.value}))}>
                  <option value="">Select Section</option>
                  {promoteSections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Student Status</label>
                <select className="form-select" value={promoteForm.status} onChange={e=>setPromoteForm(f=>({...f,status:e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="passout">Pass-out (Graduated)</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPromoteModal(null)}>Cancel</button>
              <button
                className="btn btn-teal"
                disabled={!promoteForm.classId || promote.isPending}
                onClick={() => promote.mutate({
                  id: promoteModal.id,
                  data: {
                    classId:   promoteForm.classId   ? parseInt(promoteForm.classId)   : undefined,
                    sectionId: promoteForm.sectionId ? parseInt(promoteForm.sectionId) : undefined,
                    status:    promoteForm.status,
                  }
                })}>
                {promote.isPending
                  ? 'Saving…'
                  : <><CheckCircle size={15}/> Promote Student</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
