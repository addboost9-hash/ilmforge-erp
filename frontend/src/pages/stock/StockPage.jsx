import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, ShoppingCart, Package, AlertTriangle, Pencil, Trash2, X, Save } from 'lucide-react';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

const EMPTY_FORM = { name:'', barcode:'', category:'', purchasePrice:'', sellPrice:'', quantity:'' };

export default function StockPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  // Inventory was create-and-sell only — no way to correct a price, fix a
  // typo or retire a discontinued item. Editing reuses this same form.
  const [editingId, setEditingId] = useState(null);
  const [sellForm, setSellForm] = useState({ productId:'', quantity:1, studentId:'' });
  const [receipt, setReceipt] = useState(null);

  const { data, isLoading } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/products').then(r=>r.data.data) });

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); };

  const add = useMutation({
    mutationFn: d => api.post('/products', d),
    onSuccess: () => { toast.success('Product added!'); qc.invalidateQueries(['products']); resetForm(); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/products/${id}`, d),
    onSuccess: () => { toast.success('Product updated!'); qc.invalidateQueries(['products']); resetForm(); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const remove = useMutation({
    mutationFn: id => api.delete(`/products/${id}`),
    onSuccess: r => { toast.success(r.data?.message || 'Product deleted'); qc.invalidateQueries(['products']); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      barcode: p.barcode || '',
      category: p.category || '',
      purchasePrice: ((p.purchasePrice || 0) / 100).toString(),
      sellPrice: ((p.sellPrice || 0) / 100).toString(),
      quantity: String(p.quantity ?? ''),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitForm = () => {
    const payload = {
      ...form,
      purchasePrice: Math.round(parseFloat(form.purchasePrice || 0) * 100),
      sellPrice: Math.round(parseFloat(form.sellPrice || 0) * 100),
      quantity: parseInt(form.quantity || 0),
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else add.mutate(payload);
  };

  const confirmRemove = (p) => {
    if (!window.confirm(`Delete "${p.name}" from inventory?`)) return;
    remove.mutate(p.id);
  };

  const sell = useMutation({
    mutationFn: d => api.post('/products/sell', d),
    onSuccess: r => {
      toast.success('Sold! Total: '+money(r.data.totalAmount));
      qc.invalidateQueries(['products']);
      setReceipt({...sellForm, total:r.data.totalAmount, time:new Date().toLocaleTimeString('en-PK')});
      setSellForm({productId:'',quantity:1,studentId:''});
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const products = data || [];
  const outOfStock = products.filter(p=>p.quantity===0).length;
  const lowStock = products.filter(p=>p.quantity>0&&p.quantity<=p.reorderLevel).length;

  return (
    <div className="page-content fade-in">
      <div style={{marginBottom:20}}>
        <h1 className="page-title">Stock / Point of Sale</h1>
        <p style={{color:'#64748B', fontSize:13, marginTop:2}}>Manage school inventory and sell items</p>
      </div>

      {/* Alerts */}
      {(outOfStock > 0 || lowStock > 0) && (
        <div className="alert alert-warning" style={{marginBottom:14}}>
          <AlertTriangle size={15}/>
          <span style={{fontSize:12.5}}>
            {outOfStock > 0 && <span><strong>{outOfStock} products</strong> are out of stock. </span>}
            {lowStock > 0 && <span><strong>{lowStock} products</strong> are running low.</span>}
          </span>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
        {/* Add product */}
        <div className="card">
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            <Package size={15} color="#0D9488"/>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>
              {editingId ? 'Edit Product' : 'Add Product'}
            </h3>
            {editingId && (
              <button
                onClick={resetForm}
                style={{marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:4, background:'none', border:'none', color:'#64748B', fontSize:12, fontWeight:600, cursor:'pointer'}}
              >
                <X size={13}/> Cancel edit
              </button>
            )}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            {[['Product Name *','name','text'],['Barcode','barcode','text'],['Category','category','text'],['Purchase Price (Rs.)','purchasePrice','number'],['Sell Price (Rs.)','sellPrice','number'],[editingId?'Quantity in Stock':'Initial Quantity','quantity','number']].map(([l,k,t]) => (
              <div key={k} className="form-group" style={{marginBottom:0}}>
                <label className="form-label" htmlFor={`product-${k}`}>{l}</label>
                <input id={`product-${k}`} className="form-input" type={t} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={k==='purchasePrice'?'0':k==='sellPrice'?'0':k==='quantity'?'0':''}/>
              </div>
            ))}
          </div>
          <button className="btn btn-teal" style={{marginTop:12,width:'100%',justifyContent:'center'}}
            onClick={submitForm}
            disabled={!form.name || add.isPending || update.isPending}>
            {editingId
              ? <><Save size={14}/> {update.isPending ? 'Saving…' : 'Update Product'}</>
              : <><Plus size={14}/> {add.isPending ? 'Adding…' : 'Add Product'}</>}
          </button>
        </div>

        {/* Issue/Sell */}
        <div className="card">
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            <ShoppingCart size={15} color="#15803D"/>
            <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Issue / Sell</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Product</label>
            <select className="form-select" value={sellForm.productId} onChange={e=>setSellForm({...sellForm,productId:e.target.value})}>
              <option value="">Select Product</option>
              {products.filter(p=>p.quantity>0).map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity}) — {money(p.sellPrice)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input className="form-input" type="number" min="1" value={sellForm.quantity} onChange={e=>setSellForm({...sellForm,quantity:parseInt(e.target.value||1)})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Student ID (optional)</label>
            <input className="form-input" type="number" placeholder="Link to student account" value={sellForm.studentId} onChange={e=>setSellForm({...sellForm,studentId:e.target.value})}/>
          </div>

          {sellForm.productId && (
            <div style={{marginBottom:10, padding:'8px 12px', background:'#DCFCE7', borderRadius:7, fontSize:13}}>
              Total: <strong style={{color:'#15803D'}}>
                {money((products.find(p=>p.id===parseInt(sellForm.productId))?.sellPrice||0)*sellForm.quantity)}
              </strong>
            </div>
          )}

          <button className="btn btn-green" style={{width:'100%',justifyContent:'center'}}
            onClick={() => sell.mutate({productId:parseInt(sellForm.productId),quantity:sellForm.quantity,studentId:sellForm.studentId?parseInt(sellForm.studentId):null})}
            disabled={!sellForm.productId||sell.isPending}>
            <ShoppingCart size={14}/> {sell.isPending?'Processing...':'Sell / Issue'}
          </button>

          {receipt && (
            <div style={{marginTop:12, padding:10, background:'#F0FDF9', borderRadius:7, border:'1px solid #CCFBF1', fontSize:12}}>
              <div style={{fontWeight:700,color:'#0D9488',marginBottom:4}}>✓ Last Sale</div>
              <div>Qty: {receipt.quantity} | Total: {money(receipt.total)} | {receipt.time}</div>
            </div>
          )}
        </div>
      </div>

      {/* Products table */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <div style={{padding:'12px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={{margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F'}}>Products Inventory</h3>
          <span style={{fontSize:12, color:'#64748B'}}>{products.length} products</span>
        </div>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Barcode</th><th>Category</th><th>Buy Price</th><th>Sell Price</th><th>Stock</th><th>Status</th><th style={{textAlign:'right'}}>Actions</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={editingId===p.id ? {background:'#F0FDFA'} : undefined}>
                    <td style={{fontWeight:600, color:'#1E3A5F'}}>{p.name}</td>
                    <td style={{fontFamily:'monospace', fontSize:12}}>{p.barcode||'—'}</td>
                    <td><span className="badge badge-gray">{p.category||'General'}</span></td>
                    <td style={{color:'#64748B'}}>{money(p.purchasePrice)}</td>
                    <td style={{fontWeight:700, color:'#15803D'}}>{money(p.sellPrice)}</td>
                    <td style={{fontWeight:700, color:p.quantity===0?'#B91C1C':p.quantity<=p.reorderLevel?'#B45309':'#15803D'}}>{p.quantity}</td>
                    <td><span className={`badge ${p.quantity===0?'badge-red':p.quantity<=p.reorderLevel?'badge-amber':'badge-green'}`}>{p.quantity===0?'Out':p.quantity<=p.reorderLevel?'Low':'In Stock'}</span></td>
                    <td style={{textAlign:'right', whiteSpace:'nowrap'}}>
                      <button className="btn btn-sm" style={{marginRight:6}} onClick={()=>startEdit(p)} aria-label={`Edit ${p.name}`}>
                        <Pencil size={14}/>
                      </button>
                      <button className="btn btn-sm btn-red" onClick={()=>confirmRemove(p)} disabled={remove.isPending} aria-label={`Delete ${p.name}`}>
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length===0 && <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-text">No products yet</div></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
