import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Settings, Trash2, Edit2, X } from 'lucide-react';
import useFeeTypes from '../../hooks/useFeeTypes';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function FeeStructurePage() {
  const qc = useQueryClient();
  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({ queryKey:['fee-structures'], queryFn:()=>api.get('/fees/structures').then(r=>r.data.data) });
  const { types: feeTypes } = useFeeTypes();
  const EMPTY = { classId:'', feeTitle:'Monthly Fee', amount:'', dueDayOfMonth:10, lateFeePerDay:0 };
  const [form, setForm] = useState(EMPTY);
  // Changing a fee in place (PUT). Saving a class and fee title that already
  // exist also changes it rather than adding a second row billing never read.
  const [editingId, setEditingId] = useState(null);
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const add = useMutation({
    mutationFn: ({ id, ...d }) => (id ? api.put(`/fees/structures/${id}`, d) : api.post('/fees/structures', d)),
    onSuccess: (res, vars) => {
      toast.success(vars.id || res.data?.updated ? 'Fee updated for this class' : 'Fee structure saved');
      qc.invalidateQueries({ queryKey: ['fee-structures'] });
      reset();
    },
    onError: err => toast.error(err.response?.data?.message || 'It could not be saved. Try again.'),
  });

  const remove = useMutation({
    mutationFn: id => api.delete(`/fees/structures/${id}`),
    onSuccess: (res, id) => {
      toast.success(res.data?.message || 'Fee removed');
      qc.invalidateQueries({ queryKey: ['fee-structures'] });
      if (editingId === id) reset();
    },
    onError: err => toast.error(err.response?.data?.message || 'It could not be removed. Try again.'),
  });

  const startEdit = (f) => {
    setEditingId(f.id);
    setForm({ classId: String(f.classId), feeTitle: f.feeTitle, amount: String((f.amount || 0) / 100), dueDayOfMonth: f.dueDayOfMonth, lateFeePerDay: String((f.lateFeePerDay || 0) / 100) });
  };

  const handleSubmit = () => {
    if (!form.classId || !form.amount) return toast.error('Class and amount required');
    if (!(parseFloat(form.amount) > 0)) return toast.error('The amount must be more than 0.');
    const day = parseInt(form.dueDayOfMonth, 10);
    if (!(day >= 1 && day <= 31)) return toast.error('The due day must be 1 to 31.');
    if (parseFloat(form.lateFeePerDay || 0) < 0) return toast.error('The late fee cannot be less than 0.');
    add.mutate({
      id: editingId || undefined,
      classId: parseInt(form.classId),
      feeTitle: form.feeTitle,
      amount: Math.round(parseFloat(form.amount) * 100),
      dueDayOfMonth: day,
      lateFeePerDay: Math.round(parseFloat(form.lateFeePerDay||0) * 100),
    });
  };

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
        <div>
          <h1 className="page-title">Fee Structure</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Configure monthly fee amounts per class</p>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:16}}>
        {/* Form */}
        <div className="card">
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
            <Settings size={16} color="#0D9488"/>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>{editingId ? 'Change Fee' : 'Add Fee Structure'}</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Class *</label>
            <select aria-label="Class" className="form-select" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})} disabled={!!editingId}>
              <option value="">Select Class</option>
              {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fee Title</label>
            <input className="form-input" list="fee-type-names" value={form.feeTitle} onChange={e=>setForm({...form,feeTitle:e.target.value})} placeholder="Monthly Fee"/>
            <datalist id="fee-type-names">
              {['Monthly Fee', ...feeTypes.map(t => t.name)].filter((n, i, a) => a.indexOf(n) === i).map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (Rs.) *</label>
            <input className="form-input" type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="e.g. 3500"/>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div className="form-group">
              <label className="form-label">Due Day</label>
              <input aria-label="Due Day" className="form-input" type="number" min="1" max="31" value={form.dueDayOfMonth} onChange={e=>setForm({...form,dueDayOfMonth:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Late Fee/Day (Rs.)</label>
              <input aria-label="Late Fee/Day (Rs.)" className="form-input" type="number" min="0" value={form.lateFeePerDay} onChange={e=>setForm({...form,lateFeePerDay:e.target.value})}/>
            </div>
          </div>

          <button className="btn btn-teal" style={{width:'100%', justifyContent:'center', marginTop:4}} onClick={handleSubmit} disabled={add.isPending}>
            <Plus size={15}/> {add.isPending ? 'Saving...' : editingId ? 'Save Change' : 'Save Fee Structure'}
          </button>
          {editingId && (
            <button className="btn btn-outline" style={{width:'100%', justifyContent:'center', marginTop:8}} onClick={reset}>
              <X size={14}/> Cancel
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Current Fee Structure</h3>
            <span style={{fontSize:12, color:'#64748B'}}>{new Set((data||[]).map(f => f.classId)).size} classes configured</span>
          </div>
          {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Fee Title</th>
                    <th>Amount</th>
                    <th>Due Day</th>
                    <th>Late Fee/Day</th>
                    <th style={{textAlign:'center'}}>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {(data||[]).map(f => (
                    <tr key={f.id}>
                      <td><span className="badge badge-navy">{f.class?.name || '—'}</span></td>
                      <td style={{fontWeight:600}}>{f.feeTitle}</td>
                      <td><span style={{fontSize:15, fontWeight:800, color:'#15803D'}}>{money(f.amount)}</span></td>
                      <td>{f.dueDayOfMonth}<sup>th</sup></td>
                      <td style={{color:'#B91C1C'}}>{money(f.lateFeePerDay)}/day</td>
                      <td style={{textAlign:'center', whiteSpace:'nowrap'}}>
                        <button className="btn btn-outline btn-sm" style={{padding:'3px 8px', marginRight:6}} title="Change" onClick={() => startEdit(f)}><Edit2 size={13}/></button>
                        <button className="btn btn-outline btn-sm" style={{padding:'3px 8px', color:'#DC2626', borderColor:'#FECACA'}} title="Remove" disabled={remove.isPending}
                          onClick={() => { if (window.confirm(`Remove "${f.feeTitle}" for ${f.class?.name || 'this class'}? Bills already made are not changed.`)) remove.mutate(f.id); }}>
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!data||data.length===0) && (
                    <tr><td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">💰</div>
                        <div className="empty-state-text">No fee structure configured</div>
                        <div className="empty-state-sub">Add fee for each class using the form on the left</div>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
