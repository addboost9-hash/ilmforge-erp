import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Tag, UserPlus, Search, Trash2, Plus, X, CheckCircle, DollarSign } from 'lucide-react';

const money = v => 'Rs. ' + Number(v||0).toLocaleString();

export default function DiscountedStudentsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState({ discountType:'Fixed Amount', discountValue:'', reason:'' });

  // Load discounts from API
  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['fee-discounts'],
    queryFn: () => api.get('/fees/discounts').then(r => r.data.data || []),
  });

  const { data: results, isLoading: searching } = useQuery({
    queryKey: ['disc-search', studentSearch],
    queryFn: () => studentSearch.length > 1
      ? api.get('/students', { params:{ search:studentSearch, limit:8 } }).then(r => r.data.data || [])
      : Promise.resolve([]),
    enabled: studentSearch.length > 1,
  });

  const addMut = useMutation({
    mutationFn: (data) => api.post('/fees/discounts', data),
    onSuccess: () => { qc.invalidateQueries(['fee-discounts']); toast.success('Discount applied!'); setShowModal(false); setSelectedStudent(null); setForm({ discountType:'Fixed Amount', discountValue:'', reason:'' }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const uniqueClasses = [...new Set((discounts||[]).map(d => d.student?.class?.name))].filter(Boolean).sort();

  const handleAdd = () => {
    if (!selectedStudent) return toast.error('Select a student first');
    if (!form.discountValue || Number(form.discountValue) <= 0) return toast.error('Enter a valid discount value');
    if (!form.reason.trim()) return toast.error('Please provide a reason');
    if (form.discountType === 'Percentage' && Number(form.discountValue) > 100)
      return toast.error('Percentage cannot exceed 100');
    addMut.mutate({
      studentId: selectedStudent.id,
      discountType: form.discountType === 'Percentage' ? 'percent' : 'flat',
      discountValue: Number(form.discountValue),
      reason: form.reason,
    });
  };


  const filtered = filterClass
    ? discounts.filter(d => d.className === filterClass)
    : discounts;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Tag size={22} style={{ color:'#0D9488' }} />
            Manage Discounted Students
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:2 }}>Apply and manage fee discounts for individual students</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add New Student
        </button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid-3" style={{ marginBottom:16 }}>
        <div className="card" style={{ background:'linear-gradient(135deg,#F0FDF9,#CCFBF1)', border:'1px solid #99F6E4', padding:16 }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#0D9488' }}>{discounts.length}</div>
          <div style={{ fontSize:12, color:'#0F766E', fontWeight:600 }}>Total Discounted Students</div>
        </div>
        <div className="card" style={{ background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border:'1px solid #BFDBFE', padding:16 }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#1D4ED8' }}>
            {discounts.filter(d => d.discountType === 'Percentage').length}
          </div>
          <div style={{ fontSize:12, color:'#1D4ED8', fontWeight:600 }}>Percentage Discounts</div>
        </div>
        <div className="card" style={{ background:'linear-gradient(135deg,#FFF7ED,#FED7AA)', border:'1px solid #FED7AA', padding:16 }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#C2410C' }}>
            {discounts.filter(d => d.discountType === 'Fixed Amount').length}
          </div>
          <div style={{ fontSize:12, color:'#C2410C', fontWeight:600 }}>Fixed Amount Discounts</div>
        </div>
      </div>

      {/* Filter row */}
      <div className="card" style={{ marginBottom:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <label className="form-label" style={{ margin:0, fontSize:13, whiteSpace:'nowrap' }}>Filter by Class:</label>
        <select className="form-select" style={{ width:200, fontSize:13 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {filterClass && (
          <button className="btn btn-outline btn-sm" onClick={() => setFilterClass('')}>
            <X size={12} /> Clear
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:12, color:'#64748B' }}>
          Showing {filtered.length} of {discounts.length} records
        </span>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student Code</th>
              <th>Name</th>
              <th>Parent</th>
              <th>Class</th>
              <th>Section</th>
              <th>Discount Type</th>
              <th>Discount Amount</th>
              <th>Reason</th>
              <th>OPTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                <td>
                  <span className="badge badge-teal" style={{ fontFamily:'monospace', fontSize:11 }}>{d.studentCode}</span>
                </td>
                <td style={{ fontWeight:700, color:'#1E3A5F' }}>{d.studentName}</td>
                <td style={{ fontSize:12.5, color:'#64748B' }}>{d.parent}</td>
                <td><span className="badge badge-blue">{d.className}</span></td>
                <td style={{ fontSize:13 }}>{d.section}</td>
                <td>
                  <span className={`badge ${d.discountType === 'Percentage' ? 'badge-blue' : 'badge-amber'}`}>
                    {d.discountType === 'Percentage' ? '% ' : 'Rs. '}{d.discountType}
                  </span>
                </td>
                <td style={{ fontWeight:700, color:'#0D9488' }}>
                  {d.discountType === 'Percentage' ? `${d.discountValue}%` : money(d.discountValue)}
                </td>
                <td style={{ fontSize:12, color:'#64748B', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.reason}>
                  {d.reason || '—'}
                </td>
                <td>
                  <button
                    className="btn btn-sm"
                    style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', display:'flex', alignItems:'center', gap:4 }}
                    onClick={() => { if (window.confirm('Remove this discount?')) { persist(discounts.filter(x => x.id !== d.id)); toast.success('Discount removed'); } }}
                    title="Remove Discount"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={9} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:8, opacity:0.3 }}><Tag size={40} /></div>
                  <div style={{ fontWeight:600, fontSize:14 }}>No discounted students found</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Click &quot;Add New Student&quot; to apply a discount</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <UserPlus size={18} style={{ color:'#0D9488' }} />
                <div>
                  <div className="modal-title">Add Discounted Student</div>
                  <div style={{ fontSize:12, color:'#64748B', marginTop:1 }}>Search student and apply fee discount</div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Student search */}
              <div className="form-group" style={{ margin:0 }}>
                <label className="form-label">Search Student *</label>
                <div style={{ position:'relative' }}>
                  <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft:32, fontSize:13 }}
                    placeholder="Type name or roll number..."
                    value={studentSearch}
                    onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
                  />
                </div>
                {studentSearch.length > 1 && !selectedStudent && (
                  <div style={{ border:'1px solid #E5E7EB', borderRadius:8, marginTop:4, maxHeight:160, overflowY:'auto', background:'#fff', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
                    {searching && <div style={{ padding:'10px 14px', fontSize:13, color:'#94A3B8' }}>Searching...</div>}
                    {(results||[]).map(s => (
                      <div
                        key={s.id}
                        onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); }}
                        style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid #F1F5F9', fontSize:13, background:'#fff' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F0FDF9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <strong>{s.name}</strong>
                        <span style={{ color:'#6B7280', fontSize:11 }}> · {s.rollNo} · {s.class?.name}</span>
                      </div>
                    ))}
                    {!searching && !(results||[]).length && (
                      <div style={{ padding:'10px 14px', fontSize:13, color:'#94A3B8' }}>No students found</div>
                    )}
                  </div>
                )}
                {selectedStudent && (
                  <div style={{ background:'#F0FDF9', border:'1px solid #CCFBF1', borderRadius:7, padding:'8px 12px', marginTop:6, fontSize:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <CheckCircle size={13} style={{ color:'#0D9488', marginRight:5, verticalAlign:'middle' }} />
                      <strong>{selectedStudent.name}</strong>
                      {selectedStudent.rollNo && <span style={{ color:'#64748B', marginLeft:6 }}>· {selectedStudent.rollNo}</span>}
                      {selectedStudent.class?.name && <span style={{ color:'#64748B', marginLeft:6 }}>· {selectedStudent.class.name}</span>}
                    </div>
                    <button
                      onClick={() => { setSelectedStudent(null); setStudentSearch(''); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Discount Type */}
              <div className="form-group" style={{ margin:0 }}>
                <label className="form-label">Discount Type *</label>
                <select
                  className="form-select"
                  value={form.discountType}
                  onChange={e => setForm({ ...form, discountType:e.target.value, discountValue:'' })}
                >
                  <option value="Fixed Amount">Fixed Amount (Rs.)</option>
                  <option value="Percentage">Percentage (%)</option>
                </select>
              </div>

              {/* Discount Value */}
              <div className="form-group" style={{ margin:0 }}>
                <label className="form-label">
                  {form.discountType === 'Percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (Rs.) *'}
                </label>
                <div style={{ position:'relative' }}>
                  <DollarSign size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft:32, fontSize:13 }}
                    type="number"
                    min="0"
                    max={form.discountType === 'Percentage' ? 100 : undefined}
                    step={form.discountType === 'Percentage' ? 1 : 50}
                    placeholder={form.discountType === 'Percentage' ? 'e.g. 20' : 'e.g. 500'}
                    value={form.discountValue}
                    onChange={e => setForm({ ...form, discountValue:e.target.value })}
                  />
                </div>
                {form.discountType === 'Percentage' && (
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>Enter a value between 1 and 100</div>
                )}
              </div>

              {/* Reason */}
              <div className="form-group" style={{ margin:0 }}>
                <label className="form-label">Reason for Discount *</label>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ resize:'vertical', fontSize:13 }}
                  placeholder="e.g. Merit scholarship, Financial hardship, Sibling discount..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason:e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-teal"
                onClick={handleAdd}
                disabled={!selectedStudent || !form.discountValue || !form.reason.trim()}
              >
                <CheckCircle size={14} /> Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
