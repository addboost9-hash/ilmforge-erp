import { useState } from 'react';
import { printFeeVoucher } from '../../utils/printDesigns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Search, DollarSign, Printer, X, CheckCircle, Receipt } from 'lucide-react';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function FeeCollectionPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeInv, setActiveInv] = useState(null);
  const [payForm, setPayForm] = useState({ amountPaid:'', discount:0, method:'cash', notifyVia:'whatsapp_sms' });

  const { data:searchResults, isFetching:sLoading } = useQuery({
    queryKey: ['fee-search', search],
    queryFn: () => search.length > 1 ? api.get('/students', {params:{search, limit:10}}).then(r=>r.data.data) : Promise.resolve([]),
    enabled: search.length > 1,
  });

  const { data:feeData } = useQuery({
    queryKey: ['student-fee', selected?.id],
    queryFn: () => api.get('/fees/student/'+selected.id).then(r=>r.data.data),
    enabled: !!selected,
  });

  const pay = useMutation({
    mutationFn: d => api.post('/fees/payments', d),
    onSuccess: r => {
      const receipt = r.data.data?.receiptNo || r.data.data?.id;
      toast.success(`Payment recorded! Receipt: ${receipt}`);
      qc.invalidateQueries(['student-fee', selected?.id]);
      qc.invalidateQueries(['dashboard']);
      setShowModal(false);
    },
    onError: err => toast.error(err.response?.data?.message || 'Payment failed'),
  });

  const openPayModal = (inv) => {
    setActiveInv(inv);
    setPayForm({ amountPaid: ((inv.dueAmount||0)/100).toFixed(0), discount:0, method:'cash', notifyVia:'whatsapp_sms' });
    setShowModal(true);
  };

  const confirmPayment = () => {
    if (!payForm.amountPaid || payForm.amountPaid <= 0) return toast.error('Enter valid amount');
    pay.mutate({
      invoiceId: activeInv.id,
      studentId: selected.id,
      amountPaid: Math.round(parseFloat(payForm.amountPaid) * 100),
      discount: Math.round(parseFloat(payForm.discount||0) * 100),
      method: payForm.method,
      notifyVia: payForm.notifyVia,
    });
  };

  const totalDue = (feeData?.invoices||[]).filter(i=>i.status!=='paid').reduce((s,i)=>s+(i.dueAmount||0),0);

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 className="page-title">Fee Collection</h1>
          <p style={{color:'#64748B',fontSize:13,marginTop:2}}>Search student and collect fee payments</p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{marginBottom:16}}>
        <label className="form-label" style={{fontSize:14}}>🔍 Search Student</label>
        <div style={{position:'relative', maxWidth:450}}>
          <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}/>
          <input className="form-input" style={{paddingLeft:38,fontSize:14}} placeholder="Type student name, roll no, or father name..."
            value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }}/>
          {selected && (
            <button style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}
              onClick={()=>{ setSelected(null); setSearch(''); }}>
              <X size={16}/>
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {search.length > 1 && !selected && (
          <div style={{marginTop:6, border:'1px solid #E8EDF3', borderRadius:8, overflow:'hidden', maxWidth:450, boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
            {sLoading && <div style={{padding:'10px 14px', color:'#94a3b8', fontSize:13}}>Searching...</div>}
            {!sLoading && (searchResults||[]).length === 0 && search.length > 1 && (
              <div style={{padding:'10px 14px', color:'#94a3b8', fontSize:13}}>No students found</div>
            )}
            {(searchResults||[]).map(s => (
              <div key={s.id}
                onClick={() => { setSelected(s); setSearch(s.name); }}
                style={{padding:'11px 14px', cursor:'pointer', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13}}
                onMouseEnter={e=>e.currentTarget.style.background='#F0FDF9'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div>
                  <span style={{fontWeight:700, color:'#1E3A5F'}}>{s.name}</span>
                  {s.fatherName && <span style={{color:'#64748B', marginLeft:8, fontSize:12}}>— {s.fatherName}</span>}
                </div>
                <div style={{display:'flex', gap:6}}>
                  {s.rollNo && <span className="badge badge-teal">{s.rollNo}</span>}
                  {s.class?.name && <span className="badge badge-blue">{s.class.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Fee Info */}
      {selected && feeData && (
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          {/* Student header */}
          <div style={{padding:'14px 20px', background:'linear-gradient(90deg,#F0FDF9,#F8FAFC)', borderBottom:'1px solid #CCFBF1', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#0D9488,#0F766E)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:16}}>
                {selected.name?.charAt(0)}
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:'#1E3A5F'}}>{feeData.student?.name || selected.name}</div>
                <div style={{fontSize:12,color:'#64748B'}}>
                  Roll: <strong>{feeData.student?.rollNo || '—'}</strong>
                  {feeData.student?.class?.name && <> | Class: <strong>{feeData.student.class.name}</strong></>}
                  {feeData.student?.fatherName && <> | Father: <strong>{feeData.student.fatherName}</strong></>}
                </div>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              {totalDue > 0 && (
                <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'6px 14px',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'#B91C1C',fontWeight:600}}>Total Due</div>
                  <div style={{fontSize:16,fontWeight:800,color:'#DC2626'}}>{money(totalDue)}</div>
                </div>
              )}
              <button className="btn btn-outline btn-sm" onClick={()=>{ setSelected(null); setSearch(''); }}>
                <X size={13}/> Clear
              </button>
            </div>
          </div>

          {/* Invoices table */}
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fee Title</th>
                  <th>Month / Year</th>
                  <th>Total</th>
                  <th>Discount</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(feeData.invoices||[]).map(inv => (
                  <tr key={inv.id}>
                    <td style={{fontWeight:600}}>{inv.feeTitle}</td>
                    <td style={{color:'#64748B'}}>{inv.month} {inv.year}</td>
                    <td>{money(inv.totalAmount)}</td>
                    <td style={{color:'#0D9488'}}>{money(inv.discount)}</td>
                    <td style={{color:'#15803d', fontWeight:600}}>{money(inv.paidAmount)}</td>
                    <td style={{color: inv.dueAmount>0 ? '#DC2626' : '#15803d', fontWeight:700}}>{money(inv.dueAmount)}</td>
                    <td>
                      <span className={`badge ${inv.status==='paid'?'badge-green':inv.status==='partial'?'badge-amber':'badge-red'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex', gap:5}}>
                        {inv.status !== 'paid' && (
                          <button className="btn btn-sm btn-green" onClick={() => openPayModal(inv)}>
                            <DollarSign size={12}/> Collect
                          </button>
                        )}
                        <a href={'/api/v1/pdf/voucher/'+inv.id} target="_blank" rel="noreferrer"
                          className="btn btn-sm btn-outline btn-icon" title="Print Voucher">
                          <Printer size={12}/>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!feeData.invoices || feeData.invoices.length===0) && (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:24,color:'#94a3b8'}}>
                    No fee invoices. Generate fee first.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && activeInv && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">💰 Collect Payment</div>
                <div style={{fontSize:12,color:'#64748B',marginTop:2}}>{activeInv.feeTitle} — {activeInv.month} {activeInv.year}</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div style={{background:'#F0FDF9',border:'1px solid #CCFBF1',borderRadius:8,padding:12,marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{color:'#64748B'}}>Total Amount</span>
                  <span style={{fontWeight:700}}>{money(activeInv.totalAmount)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:4}}>
                  <span style={{color:'#64748B'}}>Already Paid</span>
                  <span style={{fontWeight:700,color:'#15803d'}}>{money(activeInv.paidAmount)}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginTop:4,paddingTop:8,borderTop:'1px solid #CCFBF1'}}>
                  <span style={{fontWeight:700,color:'#DC2626'}}>Due Amount</span>
                  <span style={{fontWeight:800,color:'#DC2626'}}>{money(activeInv.dueAmount)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount to Collect (Rs.) *</label>
                <input className="form-input" type="number" step="1" min="1"
                  value={payForm.amountPaid} onChange={e => setPayForm({...payForm, amountPaid:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Discount (Rs.)</label>
                <input className="form-input" type="number" step="1" min="0"
                  value={payForm.discount} onChange={e => setPayForm({...payForm, discount:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={payForm.method} onChange={e => setPayForm({...payForm, method:e.target.value})}>
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="online">📱 Online (EasyPaisa / JazzCash)</option>
                  <option value="wallet">👛 Parent Wallet</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notify Parent</label>
                <select className="form-select" value={payForm.notifyVia} onChange={e => setPayForm({...payForm, notifyVia:e.target.value})}>
                  <option value="whatsapp_sms">📲 WhatsApp + SMS</option>
                  <option value="sms">📱 SMS Only</option>
                  <option value="none">🔕 Don't Notify</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-teal" onClick={confirmPayment} disabled={pay.isPending}>
                {pay.isPending ? 'Processing...' : <><CheckCircle size={15}/> Confirm Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selected && (
        <div className="card" style={{textAlign:'center', padding:48}}>
          <div style={{fontSize:48, marginBottom:12, opacity:0.3}}>💳</div>
          <div style={{fontSize:15, fontWeight:600, color:'#475569', marginBottom:6}}>Search a Student to Collect Fee</div>
          <div style={{fontSize:13, color:'#94a3b8'}}>Type at least 2 characters to search by name, roll number, or father's name</div>
        </div>
      )}
    </div>
  );
}
