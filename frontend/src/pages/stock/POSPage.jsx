/**
 * IlmForge — Point of Sale (Canteen / School Shop)
 * Product grid, cart, receipt print, daily sales report
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, Trash2, Printer, Search, Package } from 'lucide-react';

const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');

function printReceipt(cart, total, school) {
  const sName = school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const rows = cart.map(i => `
    <tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">${Number(i.salePrice).toLocaleString('en-PK')}</td>
      <td style="text-align:right">${(i.qty * Number(i.salePrice)).toLocaleString('en-PK')}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><title>Receipt</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
      h2 { text-align: center; font-size: 16px; margin: 4px 0; }
      p  { text-align: center; font-size: 11px; margin: 2px 0; color: #666; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 4px 2px; font-size: 11px; }
      td { padding: 3px 2px; font-size: 11px; }
      .total { font-weight: 700; font-size: 14px; text-align: right; margin-top: 8px; border-top: 1px dashed #333; padding-top: 6px; }
      .footer { text-align: center; font-size: 10px; color: #666; margin-top: 10px; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style>
  </head><body>
    <h2>${sName}</h2>
    <p>Sales Receipt</p>
    <p>${new Date().toLocaleString('en-PK')}</p>
    <table>
      <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">TOTAL: Rs. ${total.toLocaleString('en-PK')}</div>
    <div class="footer">Thank you! — IlmForge</div>
  </body></html>`;
  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(html); w.document.close(); w.print();
}

export default function POSPage() {
  const qc = useQueryClient();
  const [cart, setCart]     = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCat] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => api.get('/products?limit=100&status=active').then(r => r.data.data || []).catch(() => []),
  });

  const { data: school } = useQuery({
    queryKey: ['school-settings-bise'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => null),
  });

  const saleMut = useMutation({
    mutationFn: () => api.post('/products/sale', {
      items: cart.map(i => ({ productId: i.id, quantity: i.qty, price: i.salePrice })),
      total: cartTotal,
    }),
    onSuccess: () => {
      printReceipt(cart, cartTotal, school);
      setCart([]);
      toast.success('Sale completed! Receipt printed.');
      qc.invalidateQueries(['pos-products']);
    },
    onError: err => toast.error(err.response?.data?.message || 'Sale failed'),
  });

  const addToCart = (p) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id);
      if (existing) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const categories = ['', ...new Set(products.map(p => p.category?.name || p.categoryName).filter(Boolean))];
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || (p.category?.name || p.categoryName) === catFilter;
    return matchSearch && matchCat;
  });
  const cartTotal = cart.reduce((s, i) => s + i.qty * Number(i.salePrice || 0), 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <ShoppingCart size={20} color="#0073b7"/> Point of Sale
          </h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:2 }}>Canteen & school shop. Add products to cart and checkout.</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
        {/* Products */}
        <div>
          {/* Filters */}
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:'1 1 200px' }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
              <input className="form-input" style={{ paddingLeft:32 }} placeholder="Search product…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ flex:'0 0 160px' }} value={catFilter} onChange={e => setCat(e.target.value)}>
              <option value="">All Categories</option>
              {categories.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="loading-center"><div className="spinner"/></div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div style={{ fontSize:40 }}><Package size={40}/></div>
                <div className="empty-state-text">No products found</div>
                <div className="empty-state-sub">Add products in Stock & Inventory → Products & Stock</div>
              </div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
              {filtered.map(p => {
                const inCart = cart.find(i => i.id === p.id);
                const outOfStock = Number(p.quantity || p.stock || 0) === 0;
                return (
                  <div key={p.id}
                    onClick={() => !outOfStock && addToCart(p)}
                    style={{ background:'white', borderRadius:10, border:`1.5px solid ${inCart?'#0073b7':'#e2e8f0'}`, padding:12, cursor: outOfStock ? 'not-allowed' : 'pointer', opacity: outOfStock ? 0.5 : 1, transition:'all .15s', position:'relative' }}>
                    {inCart && (
                      <div style={{ position:'absolute', top:8, right:8, width:22, height:22, borderRadius:'50%', background:'#0073b7', color:'white', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {inCart.qty}
                      </div>
                    )}
                    <div style={{ fontSize:32, textAlign:'center', marginBottom:6 }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width:48, height:48, objectFit:'cover', borderRadius:6 }} /> : '📦'}
                    </div>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'#1e3a5f', textAlign:'center', lineHeight:1.3 }}>{p.name}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#0073b7', textAlign:'center', marginTop:4 }}>{Rs(p.salePrice)}</div>
                    {outOfStock && <div style={{ fontSize:10, color:'#dc2626', textAlign:'center', fontWeight:700 }}>Out of Stock</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        <div>
          <div className="card" style={{ position:'sticky', top:16 }}>
            <div className="card-header" style={{ background:'#1e3a5f' }}>
              <div style={{ color:'white', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                <ShoppingCart size={15}/> Cart
                {cartCount > 0 && <span style={{ background:'#0073b7', color:'white', width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{cartCount}</span>}
              </div>
            </div>
            <div style={{ maxHeight:350, overflowY:'auto' }}>
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding:30 }}>
                  <ShoppingCart size={32} style={{ opacity:0.3 }}/>
                  <div className="empty-state-sub" style={{ marginTop:8 }}>Cart is empty</div>
                </div>
              ) : (
                cart.map(i => (
                  <div key={i.id} style={{ padding:'10px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1e3a5f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.name}</div>
                      <div style={{ fontSize:11.5, color:'#64748b' }}>{Rs(i.salePrice)} each</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <button onClick={() => updateQty(i.id,-1)} style={{ width:22, height:22, borderRadius:5, border:'1px solid #e2e8f0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Minus size={11}/></button>
                      <span style={{ fontSize:13, fontWeight:700, minWidth:20, textAlign:'center' }}>{i.qty}</span>
                      <button onClick={() => updateQty(i.id,1)} style={{ width:22, height:22, borderRadius:5, border:'1px solid #e2e8f0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Plus size={11}/></button>
                    </div>
                    <div style={{ fontWeight:700, fontSize:13, color:'#0073b7', minWidth:60, textAlign:'right' }}>{Rs(i.qty * Number(i.salePrice))}</div>
                    <button onClick={() => setCart(c => c.filter(x => x.id !== i.id))} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626' }}><Trash2 size={13}/></button>
                  </div>
                ))
              )}
            </div>
            {/* Total + Checkout */}
            <div style={{ padding:'14px', borderTop:'2px solid #e2e8f0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:14, color:'#374151' }}>TOTAL:</span>
                <span style={{ fontWeight:900, fontSize:18, color:'#1e3a5f' }}>{Rs(cartTotal)}</span>
              </div>
              <button className="btn btn-primary w-full"
                onClick={() => saleMut.mutate()}
                disabled={cart.length === 0 || saleMut.isPending}
                style={{ padding:'12px', fontSize:14, fontWeight:700 }}>
                <Printer size={15}/> {saleMut.isPending ? 'Processing…' : 'Checkout & Print Receipt'}
              </button>
              {cart.length > 0 && (
                <button className="btn btn-ghost w-full" style={{ marginTop:6, fontSize:12 }} onClick={() => setCart([])}>
                  Clear Cart
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
