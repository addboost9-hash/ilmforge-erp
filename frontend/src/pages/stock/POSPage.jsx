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
    <div style={{ minHeight:'100vh', background:'#f0fdfa' }}>
      {/* ── Cashier header bar ── */}
      <div style={{ background:'linear-gradient(135deg,#0f766e,#0e9f6e)', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 12px rgba(0,0,0,.12)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ShoppingCart size={20} color="white"/>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'white' }}>Point of Sale</div>
            <div style={{ fontSize:11.5, color:'rgba(255,255,255,.75)' }}>Canteen & school shop cashier screen</div>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,.15)', borderRadius:10, padding:'8px 16px', textAlign:'center' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>Today</div>
          <div style={{ fontWeight:700, fontSize:13, color:'white' }}>{new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
      </div>

      {/* ── Main split layout ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:0, height:'calc(100vh - 68px)', overflow:'hidden' }}>

        {/* LEFT: Product grid */}
        <div style={{ padding:20, overflowY:'auto' }}>
          {/* Filters */}
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:'1 1 200px' }}>
              <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
              <input
                style={{ width:'100%', paddingLeft:34, paddingRight:12, height:38, borderRadius:9, border:'1.5px solid #d1fae5', background:'white', fontSize:13, outline:'none', boxSizing:'border-box' }}
                placeholder="Search product…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              style={{ flex:'0 0 160px', height:38, borderRadius:9, border:'1.5px solid #d1fae5', background:'white', fontSize:13, paddingLeft:10, outline:'none' }}
              value={catFilter}
              onChange={e => setCat(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="loading-center"><div className="spinner"/></div>
          ) : filtered.length === 0 ? (
            <div style={{ background:'white', borderRadius:14, padding:48, textAlign:'center', border:'1.5px dashed #a7f3d0' }}>
              <Package size={44} color="#6ee7b7" style={{ marginBottom:12 }}/>
              <div style={{ fontWeight:700, color:'#1e3a5f', fontSize:15 }}>No products found</div>
              <div style={{ color:'#64748b', fontSize:12.5, marginTop:4 }}>Add products in Stock & Inventory → Products & Stock</div>
            </div>
          ) : (
            /* 2-column product card grid */
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12 }}>
              {filtered.map((p, idx) => {
                const inCart = cart.find(i => i.id === p.id);
                const outOfStock = Number(p.quantity || p.stock || 0) === 0;
                return (
                  <div key={p.id}
                    onClick={() => !outOfStock && addToCart(p)}
                    style={{
                      background: inCart ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'white',
                      borderRadius:13,
                      border:`2px solid ${inCart ? '#34d399' : outOfStock ? '#fca5a5' : '#e2e8f0'}`,
                      padding:'14px 12px',
                      cursor: outOfStock ? 'not-allowed' : 'pointer',
                      opacity: outOfStock ? 0.55 : 1,
                      transition:'all .18s',
                      position:'relative',
                      boxShadow: inCart ? '0 4px 14px rgba(52,211,153,.25)' : '0 1px 6px rgba(0,0,0,.05)',
                      animation:`ilm-fade-in 0.3s ease-out ${idx*40}ms both`,
                    }}>
                    {/* Cart qty badge */}
                    {inCart && (
                      <div style={{ position:'absolute', top:8, right:8, width:24, height:24, borderRadius:'50%', background:'#059669', color:'white', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(5,150,105,.4)' }}>
                        {inCart.qty}
                      </div>
                    )}
                    {/* Product image / emoji */}
                    <div style={{ width:56, height:56, borderRadius:12, background:'#f0fdfa', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', fontSize:30, overflow:'hidden' }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }}/>
                        : '📦'}
                    </div>
                    <div style={{ fontWeight:700, fontSize:12.5, color:'#1e3a5f', textAlign:'center', lineHeight:1.35, marginBottom:6 }}>{p.name}</div>
                    <div style={{ fontWeight:900, fontSize:15, color:'#0f766e', textAlign:'center' }}>{Rs(p.salePrice)}</div>
                    {outOfStock
                      ? <div style={{ fontSize:10, color:'#dc2626', textAlign:'center', fontWeight:700, marginTop:4 }}>Out of Stock</div>
                      : <div style={{ fontSize:10, color:'#64748b', textAlign:'center', marginTop:4 }}>Tap to add</div>
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Cart panel */}
        <div style={{ background:'white', borderLeft:'2px solid #d1fae5', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Cart header */}
          <div style={{ background:'linear-gradient(135deg,#0f766e,#0e9f6e)', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
            <ShoppingCart size={18} color="white"/>
            <span style={{ fontWeight:800, fontSize:15, color:'white' }}>Order Summary</span>
            {cartCount > 0 && (
              <span style={{ marginLeft:'auto', background:'white', color:'#0f766e', width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900 }}>
                {cartCount}
              </span>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
            {cart.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, padding:30 }}>
                <ShoppingCart size={48} color="#a7f3d0"/>
                <div style={{ fontWeight:700, color:'#94a3b8', fontSize:14 }}>Cart is empty</div>
                <div style={{ fontSize:12, color:'#cbd5e1', textAlign:'center' }}>Tap a product on the left to add it here</div>
              </div>
            ) : (
              cart.map(i => (
                <div key={i.id} style={{ padding:'10px 16px', borderBottom:'1px solid #f0fdf4', display:'flex', alignItems:'center', gap:10, transition:'background .15s' }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'#f0fdfa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>📦</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1e3a5f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.name}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{Rs(i.salePrice)} each</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <button onClick={() => updateQty(i.id,-1)} style={{ width:24, height:24, borderRadius:6, border:'1.5px solid #d1fae5', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#0f766e' }}><Minus size={11}/></button>
                    <span style={{ fontSize:13, fontWeight:800, minWidth:22, textAlign:'center', color:'#1e3a5f' }}>{i.qty}</span>
                    <button onClick={() => updateQty(i.id,1)} style={{ width:24, height:24, borderRadius:6, border:'1.5px solid #d1fae5', background:'#f0fdfa', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#0f766e' }}><Plus size={11}/></button>
                  </div>
                  <div style={{ fontWeight:800, fontSize:13.5, color:'#0f766e', minWidth:68, textAlign:'right' }}>{Rs(i.qty * Number(i.salePrice))}</div>
                  <button onClick={() => setCart(c => c.filter(x => x.id !== i.id))} style={{ background:'none', border:'none', cursor:'pointer', color:'#f87171', padding:2, display:'flex', alignItems:'center' }}><Trash2 size={14}/></button>
                </div>
              ))
            )}
          </div>

          {/* Totals & checkout footer */}
          <div style={{ padding:'16px 20px', borderTop:'2px solid #d1fae5', background:'#f0fdfa' }}>
            {/* Item breakdown */}
            {cart.length > 0 && (
              <div style={{ marginBottom:10, fontSize:12, color:'#64748b' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span>Items ({cartCount})</span>
                  <span>{Rs(cartTotal)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Tax</span>
                  <span>Rs. 0</span>
                </div>
              </div>
            )}
            {/* Grand total */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'white', borderRadius:12, border:'1.5px solid #a7f3d0', marginBottom:12 }}>
              <span style={{ fontWeight:800, fontSize:15, color:'#1e3a5f' }}>TOTAL</span>
              <span style={{ fontWeight:900, fontSize:22, color:'#0f766e' }}>{Rs(cartTotal)}</span>
            </div>
            {/* Pay button */}
            <button
              onClick={() => saleMut.mutate()}
              disabled={cart.length === 0 || saleMut.isPending}
              style={{
                width:'100%', padding:'14px', borderRadius:12, border:'none',
                background: cart.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#0f766e,#0e9f6e)',
                color: cart.length === 0 ? '#94a3b8' : 'white',
                fontWeight:800, fontSize:15, cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow: cart.length > 0 ? '0 4px 16px rgba(15,118,110,.35)' : 'none',
                transition:'all .2s',
              }}>
              <Printer size={16}/> {saleMut.isPending ? 'Processing…' : 'Pay & Print Receipt'}
            </button>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                style={{ width:'100%', marginTop:8, padding:'9px', borderRadius:10, border:'1.5px solid #fca5a5', background:'#fef2f2', color:'#dc2626', fontWeight:700, fontSize:12.5, cursor:'pointer' }}>
                Clear Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
