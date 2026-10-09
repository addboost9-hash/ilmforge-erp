import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import ConfirmModal from '../../components/ConfirmModal';
import { money, toPaisa, rupeesInput } from '../../utils/currency';
import { Plus, TrendingDown, Tag, Calendar, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Pakistan is UTC+5 all year: today and this month are Pakistan's, whatever
// zone this computer's clock is set to.
const PK_OFFSET_MS = 5 * 3600e3;
const pkToday = () => new Date(Date.now() + PK_OFFSET_MS).toISOString().slice(0, 10);
// The Pakistan day a stored moment falls on: "2026-10-08" for a date input.
const pkDay = (d) => new Date(new Date(d).getTime() + PK_OFFSET_MS).toISOString().slice(0, 10);
const dmy = (ymd) => ymd.split('-').reverse().join('/');

// "2026-10" -> the first and last day of that month, as the API takes them.
const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` };
};
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${FULL_MONTHS[m - 1]} ${y}`;
};
// This month and the 35 before it; older ones are under "All months".
const recentMonths = () => {
  const [y, m] = pkToday().split('-').map(Number);
  return Array.from({ length: 36 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
};

// Screens whose figures an expense changes. They keep data for five minutes
// and do not reload on opening, so they are refreshed now.
const EXPENSE_KEYS = ['expenses', 'expenses-today', 'expenses-all-today', 'bs-expenses', 'accounting-ledger', 'accounting-stats', 'dashboard', 'dash-admin-overview'];

const blankForm = (date = pkToday()) => ({ amount:'', description:'', date, categoryId:'' });

export default function ExpensesPage() {
  const qc = useQueryClient();
  const formRef = useRef(null);
  const [months] = useState(recentMonths);
  const [month, setMonth] = useState(() => months[0]);   // 'YYYY-MM' or 'all'
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState(null);          // the expense being corrected
  const [deleting, setDeleting] = useState(null);        // the expense waiting for a yes
  const [newCat, setNewCat] = useState('');
  const [showCatForm, setShowCatForm] = useState(false);

  const { data:cats } = useQuery({ queryKey:['exp-cats'], queryFn:()=>api.get('/expenses/categories').then(r=>r.data.data) });
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['expenses', month, catFilter, page],
    queryFn: () => api.get('/expenses', {
      params: { ...(month === 'all' ? {} : monthRange(month)), categoryId: catFilter || undefined, page, limit: PAGE_SIZE },
    }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

  const refresh = () => EXPENSE_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k], refetchType: 'all' }));

  const save = useMutation({
    mutationFn: ({ id, body }) => (id ? api.put(`/expenses/${id}`, body) : api.post('/expenses', body)),
    onSuccess: (_, { id, body }) => {
      toast.success(id ? 'Expense updated' : `Expense added for ${dmy(body.date)}`);
      refresh();
      // Keep the day and category: past bills are usually entered several at a time.
      setForm(f => (id ? blankForm() : { ...blankForm(f.date), categoryId: f.categoryId }));
      setEditing(null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: (_, id) => {
      toast.success('Expense deleted');
      refresh();
      if (editing?.id === id) { setEditing(null); setForm(blankForm()); }
      // The last row of a page went: step back rather than show an empty page.
      if ((data?.data || []).length === 1 && page > 1) setPage(p => p - 1);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
    onSettled: () => setDeleting(null),
  });

  const addCat = useMutation({
    mutationFn: () => api.post('/expenses/categories', {name:newCat}),
    onSuccess: (res) => {
      // A name that only differs in case from an existing one gets that one back.
      if (res.data.existed) toast(res.data.message); else toast.success('Category added');
      qc.invalidateQueries({ queryKey: ['exp-cats'] });
      setForm(f => ({ ...f, categoryId: String(res.data.data.id) }));
      setNewCat(''); setShowCatForm(false);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const submit = () => {
    const paisa = toPaisa(form.amount);
    if (!(Number(form.amount) > 0) || paisa <= 0) { toast.error('Enter an amount more than 0.'); return; }
    if (!form.date) { toast.error('Enter the date of the expense.'); return; }
    if (form.date > pkToday()) { toast.error('The date cannot be in the future.'); return; }
    save.mutate({
      id: editing?.id,
      body: {
        amount: paisa,
        description: form.description,
        date: form.date,
        // On an edit, no category means "remove it"; on a new one, simply none.
        categoryId: form.categoryId ? parseInt(form.categoryId) : (editing ? null : undefined),
      },
    });
  };

  const startEdit = (e) => {
    setEditing(e);
    setForm({ amount: rupeesInput(e.amount), description: e.description || '', date: pkDay(e.date), categoryId: e.categoryId ? String(e.categoryId) : '' });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const cancelEdit = () => { setEditing(null); setForm(blankForm()); };

  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalAmount = data?.totalAmount || 0;
  const pages = Math.max(1, data?.pages || 1);
  const viewLabel = month === 'all' ? 'All months' : monthLabel(month);

  const getCatName = (id) => (cats||[]).find(c=>c.id===id)?.name || '—';
  const isSalaryPayment = (e) => /^Salary — /.test(e.description || '');

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Expense Management</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            {viewLabel}: <strong style={{color:'#DC2626'}}>{money(totalAmount)}</strong> in {total} {total === 1 ? 'expense' : 'expenses'}
          </p>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:16}}>
        {/* Add / edit expense form */}
        <div ref={formRef}>
          <div className="card" style={editing ? {border:'1.5px solid #0D9488'} : undefined}>
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
              {editing ? <Pencil size={16} color="#0D9488"/> : <TrendingDown size={16} color="#DC2626"/>}
              <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>{editing ? 'Edit Expense' : 'Add Expense'}</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <div style={{display:'flex', gap:6}}>
                <select aria-label="Category" className="form-select" value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}>
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
                <button className="btn btn-teal btn-sm" onClick={() => addCat.mutate()} disabled={!newCat.trim() || addCat.isPending}>Add</button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Amount (Rs.) *</label>
              <input className="form-input" type="number" min="0" step="any" inputMode="decimal" placeholder="e.g. 5000" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Electricity bill, repair work, etc." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input aria-label="Date" className="form-input" type="date" max={pkToday()} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
              <div style={{fontSize:11.5, color:'#64748B', marginTop:4}}>The day the money was spent. Past dates are fine.</div>
            </div>

            <div style={{display:'flex', gap:8}}>
              {editing && (
                <button className="btn btn-outline" style={{flex:1, justifyContent:'center'}} onClick={cancelEdit} disabled={save.isPending}>Cancel</button>
              )}
              <button className={editing ? 'btn btn-teal' : 'btn btn-red'} style={{flex:2, justifyContent:'center'}}
                onClick={submit} disabled={save.isPending || !form.amount}>
                {editing
                  ? (save.isPending ? 'Saving...' : 'Save Changes')
                  : <><Plus size={15}/> {save.isPending ? 'Adding...' : 'Add Expense'}</>}
              </button>
            </div>
          </div>
        </div>

        {/* Expenses list */}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div style={{padding:'14px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
            <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
              <Calendar size={15} color="#64748B"/>
              <select aria-label="Month" className="form-select" style={{width:170}} value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}>
                <option value="all">All months</option>
                {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
              <Tag size={15} color="#64748B"/>
              <select aria-label="Filter by category" className="form-select" style={{width:170}} value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {(cats||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <span style={{fontSize:12, color:'#DC2626', fontWeight:600}}>Total: {money(totalAmount)}</span>
          </div>
          {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div className="table-wrap" style={{borderRadius:0, border:'none', opacity: isFetching ? 0.6 : 1}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th style={{width:90}}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(e => (
                    <tr key={e.id} style={editing?.id === e.id ? {background:'#F0FDFA'} : undefined}>
                      <td style={{fontSize:12, color:'#64748B', whiteSpace:'nowrap'}}>{dmy(pkDay(e.date))}</td>
                      <td><span className="badge badge-amber">{e.category || getCatName(e.categoryId)}</span></td>
                      <td style={{fontSize:13, color:'#475569'}}>{e.description||'—'}</td>
                      <td><span style={{fontWeight:800, color:'#DC2626', fontSize:14, whiteSpace:'nowrap'}}>{money(e.amount)}</span></td>
                      <td>
                        <div style={{display:'flex', gap:5}}>
                          <button className="btn btn-sm btn-outline btn-icon" title="Edit" aria-label="Edit expense" onClick={() => startEdit(e)}><Pencil size={12}/></button>
                          <button className="btn btn-sm btn-outline btn-icon" title="Delete" aria-label="Delete expense" style={{color:'#DC2626', borderColor:'#FCA5A5'}} onClick={() => setDeleting(e)}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length===0 && (
                    <tr><td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <div className="empty-state-text">{month === 'all' && !catFilter ? 'No expenses recorded' : `No expenses for ${viewLabel}${catFilter ? ' in this category' : ''}`}</div>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderTop:'1px solid #F1F5F9', fontSize:12.5, color:'#64748B'}}>
              <span>Page {page} of {pages} · {total} expenses</span>
              <div style={{display:'flex', gap:6}}>
                <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={13}/> Previous</button>
                <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}>Next <ChevronRight size={13}/></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleting}
        danger
        title="Delete this expense?"
        message={deleting ? `${money(deleting.amount)} on ${dmy(pkDay(deleting.date))}${deleting.description ? ` — ${deleting.description}` : ''}. This cannot be undone.${isSalaryPayment(deleting) ? ' It was recorded when a salary was paid; deleting it does not mark that salary unpaid.' : ''}` : ''}
        confirmLabel={remove.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => { if (!remove.isPending) remove.mutate(deleting.id); }}
        onCancel={() => { if (!remove.isPending) setDeleting(null); }}
      />
    </div>
  );
}
