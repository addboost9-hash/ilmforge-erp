import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, TrendingDown, Tag, Calendar } from 'lucide-react';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function ExpensesPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ amount:'', description:'', date:today, categoryId:'' });
  const [newCat, setNewCat] = useState('');
  const [showCatForm, setShowCatForm] = useState(false);

  const { data:cats } = useQuery({ queryKey:['exp-cats'], queryFn:()=>api.get('/expenses/categories').then(r=>r.data.data) });
  const { data, isLoading } = useQuery({ queryKey:['expenses'], queryFn:()=>api.get('/expenses').then(r=>r.data) });

  const add = useMutation({
    mutationFn: d => api.post('/expenses', d),
    onSuccess: () => {
      toast.success('Expense added');
      qc.invalidateQueries(['expenses']);
      qc.invalidateQueries(['dashboard']);
      setForm({amount:'', description:'', date:today, categoryId:''});
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const addCat = useMutation({
    mutationFn: () => api.post('/expenses/categories', {name:newCat}),
    onSuccess: () => { toast.success('Category added'); qc.invalidateQueries(['exp-cats']); setNewCat(''); setShowCatForm(false); },
  });

  const total = (data?.data||[]).reduce((s,e) => s+(e.amount||0), 0);

  const getCatName = (id) => (cats||[]).find(c=>c.id===id)?.name || '—';

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Expense Management</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            Total (this view): <strong style={{color:'#DC2626'}}>{money(total)}</strong>
          </p>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:16}}>
        {/* Add expense form */}
        <div>
          <div className="card">
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
              <TrendingDown size={16} color="#DC2626"/>
              <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Add Expense</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <div style={{display:'flex', gap:6}}>
                <select className="form-select" value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}>
                  <option value="">Select Category</option>
                  {(cats||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn btn-outline btn-sm btn-icon" onClick={() => setShowCatForm(s=>!s)} title="Add Category">
                  <Plus size={13}/>
                </button>
              </div>
            </div>

            {showCatForm && (
              <div style={{display:'flex', gap:6, marginBottom:12}}>
                <input className="form-input" placeholder="New category name" value={newCat} onChange={e=>setNewCat(e.target.value)} style={{flex:1}}/>
                <button className="btn btn-teal btn-sm" onClick={() => addCat.mutate()} disabled={!newCat}>Add</button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Amount (Rs.) *</label>
              <input className="form-input" type="number" placeholder="e.g. 5000" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Electricity bill, repair work, etc." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
            </div>

            <button className="btn btn-red" style={{width:'100%', justifyContent:'center'}}
              onClick={() => add.mutate({
                amount: Math.round(parseFloat(form.amount||0)*100),
                description: form.description,
                date: form.date,
                categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
              })}
              disabled={add.isPending || !form.amount}>
              <Plus size={15}/> {add.isPending ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>

        {/* Expenses list */}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Recent Expenses</h3>
            <span style={{fontSize:12, color:'#DC2626', fontWeight:600}}>Total: {money(total)}</span>
          </div>
          {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data||[]).map(e => (
                    <tr key={e.id}>
                      <td style={{fontSize:12, color:'#64748B'}}>{new Date(e.date).toLocaleDateString('en-PK')}</td>
                      <td><span className="badge badge-amber">{getCatName(e.categoryId)}</span></td>
                      <td style={{fontSize:13, color:'#475569'}}>{e.description||'—'}</td>
                      <td><span style={{fontWeight:800, color:'#DC2626', fontSize:14}}>{money(e.amount)}</span></td>
                    </tr>
                  ))}
                  {(!data?.data||data.data.length===0) && (
                    <tr><td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <div className="empty-state-text">No expenses recorded</div>
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
