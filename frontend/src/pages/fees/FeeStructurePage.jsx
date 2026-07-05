import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Settings, Trash2 } from 'lucide-react';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function FeeStructurePage() {
  const qc = useQueryClient();
  const { data:classes } = useQuery({ queryKey:['classes'], queryFn:()=>api.get('/classes').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({ queryKey:['fee-structures'], queryFn:()=>api.get('/fees/structures').then(r=>r.data.data) });
  const [form, setForm] = useState({ classId:'', feeTitle:'Monthly Fee', amount:'', dueDayOfMonth:10, lateFeePerDay:0 });

  const add = useMutation({
    mutationFn: d => api.post('/fees/structures', d),
    onSuccess: () => { toast.success('Fee structure saved'); qc.invalidateQueries(['fee-structures']); setForm({classId:'',feeTitle:'Monthly Fee',amount:'',dueDayOfMonth:10,lateFeePerDay:0}); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleSubmit = () => {
    if (!form.classId || !form.amount) return toast.error('Class and amount required');
    add.mutate({
      classId: parseInt(form.classId),
      feeTitle: form.feeTitle,
      amount: Math.round(parseFloat(form.amount) * 100),
      dueDayOfMonth: parseInt(form.dueDayOfMonth),
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
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Add Fee Structure</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Class *</label>
            <select className="form-select" value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})}>
              <option value="">Select Class</option>
              {(classes||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fee Title</label>
            <input className="form-input" value={form.feeTitle} onChange={e=>setForm({...form,feeTitle:e.target.value})} placeholder="Monthly Fee"/>
          </div>

          <div className="form-group">
            <label className="form-label">Monthly Amount (Rs.) *</label>
            <input className="form-input" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="e.g. 3500"/>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div className="form-group">
              <label className="form-label">Due Day</label>
              <input className="form-input" type="number" min="1" max="31" value={form.dueDayOfMonth} onChange={e=>setForm({...form,dueDayOfMonth:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Late Fee/Day (Rs.)</label>
              <input className="form-input" type="number" value={form.lateFeePerDay} onChange={e=>setForm({...form,lateFeePerDay:e.target.value})}/>
            </div>
          </div>

          <button className="btn btn-teal" style={{width:'100%', justifyContent:'center', marginTop:4}} onClick={handleSubmit} disabled={add.isPending}>
            <Plus size={15}/> {add.isPending ? 'Saving...' : 'Save Fee Structure'}
          </button>
        </div>

        {/* Table */}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Current Fee Structure</h3>
            <span style={{fontSize:12, color:'#64748B'}}>{(data||[]).length} classes configured</span>
          </div>
          {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Fee Title</th>
                    <th>Monthly Amount</th>
                    <th>Due Day</th>
                    <th>Late Fee/Day</th>
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
                    </tr>
                  ))}
                  {(!data||data.length===0) && (
                    <tr><td colSpan={5}>
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
