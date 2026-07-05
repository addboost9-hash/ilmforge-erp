import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  BarChart2, Calendar, Users, DollarSign, ChevronRight, ChevronDown,
  Printer, CheckCircle, X, RefreshCw, ArrowLeft, Wallet, CreditCard,
  Smartphone, AlertCircle, TrendingUp, Receipt, User, Download
} from 'lucide-react';

/* ── helpers ── */
const money    = v  => 'Rs. ' + ((v || 0) / 100).toLocaleString();
const pct      = (a, b) => b ? Math.round((a / b) * 100) : 0;
const todayISO = () => new Date().toISOString().split('T')[0];

const METHOD_COLOR = { cash:'#15803d', card:'#1d4ed8', online:'#7c3aed', wallet:'#b45309' };
const METHOD_ICON  = { cash: DollarSign, card: CreditCard, online: Smartphone, wallet: Wallet };

const Spin = () => (
  <span style={{
    display:'inline-block', width:14, height:14, border:'2px solid #ccc',
    borderTopColor:'#0D9488', borderRadius:'50%', animation:'spin .7s linear infinite',
    verticalAlign:'middle', marginRight:6
  }}/>
);

/* ── sub-components ── */
function StatBox({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid #E8EDF3', borderRadius:12,
      padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flex:1
    }}>
      <div style={{
        width:44, height:44, borderRadius:10,
        background: color + '18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
      }}>
        <Icon size={20} color={color}/>
      </div>
      <div>
        <div style={{ color:'#64748B', fontSize:11, fontWeight:600, letterSpacing:.5 }}>{label}</div>
        <div style={{ color:'#1E3A5F', fontSize:20, fontWeight:800, lineHeight:1.2 }}>{value}</div>
        {sub && <div style={{ color:'#94a3b8', fontSize:11, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function MethodBar({ label, amount, total, color }) {
  const w = pct(amount, total);
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
        <span style={{ color:'#475569', fontWeight:600 }}>{label}</span>
        <span style={{ color, fontWeight:700 }}>{money(amount)}</span>
      </div>
      <div style={{ background:'#F1F5F9', borderRadius:4, height:6, overflow:'hidden' }}>
        <div style={{ width:`${w}%`, background:color, borderRadius:4, height:'100%', transition:'width .4s ease' }}/>
      </div>
    </div>
  );
}

/* ── AccountantRow ── */
function AccountantRow({ acc, isSelected, onSelect, onSettle, settling }) {
  const settled   = acc.settled;
  const hasAmount = acc.totalAmount > 0;

  return (
    <div
      style={{
        border:`1px solid ${isSelected ? '#0D9488' : '#E8EDF3'}`,
        borderRadius:12, padding:'14px 18px', marginBottom:10,
        cursor:'pointer', background: isSelected ? '#F0FDF9' : '#fff',
        transition:'all .2s', boxShadow: isSelected ? '0 0 0 2px #CCFBF1' : 'none'
      }}
      onClick={() => onSelect(acc)}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:40, height:40, borderRadius:'50%',
            background: settled ? 'linear-gradient(135deg,#DCFCE7,#BBF7D0)' : 'linear-gradient(135deg,#F0FDF9,#CCFBF1)',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16,
            color: settled ? '#15803d' : '#0D9488', flexShrink:0
          }}>
            {acc.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <div style={{ fontWeight:700, color:'#1E3A5F', fontSize:14 }}>{acc.name}</div>
            <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
              {acc.count} payments &bull; {acc.email || 'Accountant'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Method breakdown (mini) */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Object.entries(acc.byMethod || {}).map(([m, v]) => {
              if (!v) return null;
              const Icon = METHOD_ICON[m] || DollarSign;
              return (
                <span key={m} style={{
                  display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
                  color: METHOD_COLOR[m] || '#475569', background:'#F8FAFC',
                  border:'1px solid #E8EDF3', borderRadius:6, padding:'2px 8px'
                }}>
                  <Icon size={11}/> {money(v)}
                </span>
              );
            })}
          </div>

          {/* Total */}
          <div style={{ textAlign:'right', minWidth:110 }}>
            <div style={{ fontSize:12, color:'#64748B' }}>Total Collected</div>
            <div style={{ fontSize:18, fontWeight:800, color: hasAmount ? '#0D9488' : '#94a3b8' }}>
              {money(acc.totalAmount)}
            </div>
          </div>

          {/* Settle button */}
          {!settled && hasAmount && (
            <button
              className="btn btn-sm btn-green"
              style={{ whiteSpace:'nowrap' }}
              onClick={e => { e.stopPropagation(); onSettle(acc.id); }}
              disabled={settling}
            >
              {settling ? <Spin/> : <CheckCircle size={13}/>} Settle
            </button>
          )}
          {settled && (
            <span className="badge badge-green" style={{ whiteSpace:'nowrap' }}>
              <CheckCircle size={12}/> Settled
            </span>
          )}

          {/* Expand arrow */}
          <div style={{ color:'#94a3b8' }}>
            {isSelected ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function DailyBalancesheetPage() {
  const qc = useQueryClient();
  const [date,        setDate]        = useState(todayISO());
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [settlingId,  setSettlingId]  = useState(null);

  /* ── 1. Fetch all payments for the selected date ── */
  const { data: paymentsData, isFetching } = useQuery({
    queryKey: ['daily-balancesheet', date],
    queryFn:  () => api.get('/fees/payments', { params: { from: date, to: date, limit: 500 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const payments = paymentsData?.data || [];

  /* ── 2. Group payments by accountant (receivedBy) ── */
  const accountants = useMemo(() => {
    const map = {};
    for (const p of payments) {
      const uid = p.receivedBy;
      if (!map[uid]) {
        map[uid] = {
          id:          uid,
          name:        p.receivedByUser?.name || `User #${uid}`,
          email:       p.receivedByUser?.email || '',
          count:       0,
          totalAmount: 0,
          byMethod:    { cash:0, card:0, online:0, wallet:0 },
          settled:     false,   // extend: pull from a settlements table
          payments:    [],
        };
      }
      const g = map[uid];
      g.count++;
      g.totalAmount += p.amountPaid || 0;
      g.byMethod[p.method] = (g.byMethod[p.method] || 0) + (p.amountPaid || 0);
      g.payments.push(p);
    }
    return Object.values(map).sort((a,b) => b.totalAmount - a.totalAmount);
  }, [payments]);

  /* ── 3. Grand totals ── */
  const grandTotal   = accountants.reduce((s,a) => s + a.totalAmount, 0);
  const grandCount   = accountants.reduce((s,a) => s + a.count, 0);
  const byMethod     = useMemo(() => {
    const m = { cash:0, card:0, online:0, wallet:0 };
    for (const p of payments) m[p.method] = (m[p.method] || 0) + (p.amountPaid || 0);
    return m;
  }, [payments]);

  /* ── 4. Settle mutation (placeholder — extend with your settlement model) ── */
  const settle = useMutation({
    mutationFn: async (userId) => {
      /* POST to a settlement endpoint — implement as needed */
      return api.post('/fees/settle', { userId, date });
    },
    onMutate: (userId) => setSettlingId(userId),
    onSuccess: () => {
      toast.success('Accountant settled successfully');
      qc.invalidateQueries(['daily-balancesheet', date]);
      setSettlingId(null);
    },
    onError: err => {
      toast.error(err.response?.data?.message || 'Settlement failed');
      setSettlingId(null);
    },
  });

  const settleAll = () => {
    if (!accountants.length) return;
    if (!window.confirm(`Settle all ${accountants.length} accountants for ${date}?`)) return;
    /* fire sequentially */
    (async () => {
      for (const acc of accountants.filter(a => !a.settled && a.totalAmount > 0)) {
        await settle.mutateAsync(acc.id).catch(() => {});
      }
    })();
  };

  /* ── 5. Print ── */
  const handlePrint = () => window.print();

  /* ── 6. Detailed view helpers ── */
  const accPayments = selectedAcc
    ? accountants.find(a => a.id === selectedAcc)?.payments || []
    : [];

  const accData     = selectedAcc
    ? accountants.find(a => a.id === selectedAcc)
    : null;

  const isToday     = date === todayISO();

  return (
    <div className="page-content fade-in">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .no-print { display: none !important; }
          .page-content { padding: 0 !important; }
          .card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }} className="no-print">
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <BarChart2 size={26} color="#0D9488"/>
            Daily Balancesheet
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>
            Per-accountant collection summary — settle and print daily reports
          </p>
        </div>

        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {/* Date picker */}
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E8EDF3', borderRadius:10, padding:'6px 14px' }}>
            <Calendar size={15} color="#0D9488"/>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={e => { setDate(e.target.value); setSelectedAcc(null); }}
              style={{ border:'none', outline:'none', fontSize:14, fontWeight:600, color:'#1E3A5F', background:'transparent', cursor:'pointer' }}
            />
          </div>

          {isToday && (
            <span className="badge badge-teal" style={{ padding:'6px 12px' }}>Today</span>
          )}

          <button
            className="btn btn-outline btn-sm"
            onClick={() => qc.invalidateQueries(['daily-balancesheet', date])}
            disabled={isFetching}
          >
            <RefreshCw size={13}/> Refresh
          </button>

          {accountants.some(a => !a.settled && a.totalAmount > 0) && (
            <button className="btn btn-green btn-sm" onClick={settleAll} disabled={settle.isPending}>
              {settle.isPending ? <Spin/> : <CheckCircle size={13}/>} Settle All
            </button>
          )}

          <button className="btn btn-outline btn-sm" onClick={handlePrint}>
            <Printer size={13}/> Print Report
          </button>
        </div>
      </div>

      {/* ── Print header (print only) ── */}
      <div style={{ display:'none' }} className="print-only">
        <h2 style={{ textAlign:'center', margin:'0 0 4px' }}>Daily Balancesheet — {date}</h2>
        <p style={{ textAlign:'center', color:'#64748B', margin:'0 0 20px' }}>IlmForge School ERP</p>
      </div>

      {/* ── Grand Summary Stats ── */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <StatBox label="TOTAL COLLECTED"    value={money(grandTotal)}       sub={`${grandCount} payments`}     color="#0D9488" icon={TrendingUp}  />
        <StatBox label="ACCOUNTANTS ACTIVE" value={accountants.length}      sub="collected today"              color="#1d4ed8" icon={Users}       />
        <StatBox label="CASH"               value={money(byMethod.cash)}    sub={`${pct(byMethod.cash, grandTotal)}% of total`}   color="#15803d" icon={DollarSign}/>
        <StatBox label="ONLINE / CARD"      value={money(byMethod.online + byMethod.card + byMethod.wallet)} sub="non-cash"  color="#7c3aed" icon={Smartphone}  />
      </div>

      {/* ── Method breakdown bar ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, color:'#1E3A5F', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <BarChart2 size={16} color="#0D9488"/> Collection by Method
        </div>
        <MethodBar label="Cash"           amount={byMethod.cash}   total={grandTotal} color="#15803d"/>
        <MethodBar label="Card"           amount={byMethod.card}   total={grandTotal} color="#1d4ed8"/>
        <MethodBar label="Online Transfer" amount={byMethod.online} total={grandTotal} color="#7c3aed"/>
        <MethodBar label="Parent Wallet"  amount={byMethod.wallet} total={grandTotal} color="#b45309"/>
      </div>

      {/* ── Main area: two columns when detail open ── */}
      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>

        {/* ── Accountants List ── */}
        <div style={{ flex: selectedAcc ? '0 0 400px' : '1', minWidth:0 }}>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{
              padding:'12px 18px', background:'#F8FAFC', borderBottom:'1px solid #E8EDF3',
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <div style={{ fontWeight:700, color:'#1E3A5F', fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                <Users size={15} color="#0D9488"/> Accountants ({accountants.length})
              </div>
              {selectedAcc && (
                <button style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', gap:4, fontSize:12 }}
                  onClick={() => setSelectedAcc(null)}>
                  <X size={14}/> Close Detail
                </button>
              )}
            </div>

            <div style={{ padding:'12px 14px' }}>
              {isFetching && !accountants.length && (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>
                  <Spin/> Loading...
                </div>
              )}

              {!isFetching && accountants.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 16px', color:'#94a3b8' }}>
                  <Receipt size={36} style={{ opacity:0.3, marginBottom:8, display:'block', margin:'0 auto 10px' }}/>
                  <div style={{ fontWeight:600, marginBottom:4 }}>No collections on {date}</div>
                  <div style={{ fontSize:12 }}>Try a different date or check if payments were recorded</div>
                </div>
              )}

              {accountants.map(acc => (
                <AccountantRow
                  key={acc.id}
                  acc={acc}
                  isSelected={selectedAcc === acc.id}
                  onSelect={a => setSelectedAcc(selectedAcc === a.id ? null : a.id)}
                  onSettle={id => settle.mutate(id)}
                  settling={settlingId === acc.id && settle.isPending}
                />
              ))}
            </div>

            {/* Footer total */}
            {accountants.length > 0 && (
              <div style={{
                padding:'12px 18px', borderTop:'1px solid #E8EDF3', background:'#F0FDF9',
                display:'flex', justifyContent:'space-between', alignItems:'center'
              }}>
                <span style={{ fontWeight:700, color:'#1E3A5F', fontSize:13 }}>Grand Total</span>
                <span style={{ fontWeight:800, color:'#0D9488', fontSize:18 }}>{money(grandTotal)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        {selectedAcc && accData && (
          <div style={{ flex:1, minWidth:0 }}>
            {/* Detail Header */}
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{
                padding:'14px 20px',
                background:'linear-gradient(90deg,#0D9488,#0F766E)',
                display:'flex', justifyContent:'space-between', alignItems:'center'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#fff', fontWeight:800, fontSize:18
                  }}>
                    {accData.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{accData.name}</div>
                    <div style={{ color:'rgba(255,255,255,0.8)', fontSize:12 }}>
                      {accData.count} payments &bull; {date}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'rgba(255,255,255,0.8)', fontSize:11 }}>TOTAL</div>
                  <div style={{ color:'#FEF08A', fontSize:22, fontWeight:800 }}>{money(accData.totalAmount)}</div>
                </div>
              </div>

              {/* Mini method breakdown */}
              <div style={{ padding:'10px 20px', background:'#F8FAFC', borderBottom:'1px solid #E8EDF3', display:'flex', gap:16, flexWrap:'wrap' }}>
                {Object.entries(accData.byMethod).map(([m, v]) => {
                  if (!v) return null;
                  const Icon = METHOD_ICON[m] || DollarSign;
                  return (
                    <div key={m} style={{ display:'flex', alignItems:'center', gap:5, fontSize:13 }}>
                      <Icon size={13} color={METHOD_COLOR[m]}/>
                      <span style={{ color:'#64748B' }}>{m.charAt(0).toUpperCase()+m.slice(1)}:</span>
                      <span style={{ fontWeight:700, color:METHOD_COLOR[m] }}>{money(v)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Payments table */}
              <div className="table-wrap" style={{ borderRadius:0, border:'none', maxHeight:480, overflowY:'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Student</th>
                      <th>Fee Title</th>
                      <th>Month</th>
                      <th>Method</th>
                      <th>Discount</th>
                      <th>Amount</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accPayments.map((p, idx) => {
                      const Icon = METHOD_ICON[p.method] || DollarSign;
                      const color = METHOD_COLOR[p.method] || '#475569';
                      const time  = p.paymentDate || p.createdAt
                        ? new Date(p.paymentDate || p.createdAt).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' })
                        : '—';
                      return (
                        <tr key={p.id}>
                          <td style={{ color:'#94a3b8', fontSize:12 }}>{idx + 1}</td>
                          <td style={{ color:'#64748B', fontSize:12 }}>{time}</td>
                          <td style={{ fontWeight:600, color:'#1E3A5F' }}>
                            {p.invoice?.student?.name || '—'}
                            {p.invoice?.student?.rollNo && (
                              <span style={{ color:'#94a3b8', fontSize:11, display:'block' }}>
                                Roll: {p.invoice.student.rollNo}
                              </span>
                            )}
                          </td>
                          <td style={{ color:'#475569', fontSize:13 }}>{p.invoice?.feeTitle || '—'}</td>
                          <td style={{ color:'#64748B', fontSize:12 }}>
                            {p.invoice?.month || ''} {p.invoice?.year || ''}
                          </td>
                          <td>
                            <span style={{
                              display:'flex', alignItems:'center', gap:4,
                              fontSize:12, fontWeight:600, color
                            }}>
                              <Icon size={12}/> {p.method}
                            </span>
                          </td>
                          <td style={{ color:'#0D9488', fontSize:12 }}>
                            {p.discount ? money(p.discount) : '—'}
                          </td>
                          <td style={{ fontWeight:700, color:'#15803d' }}>{money(p.amountPaid)}</td>
                          <td>
                            {p.receiptNo && (
                              <a
                                href={`/api/v1/pdf/receipt/${p.id}`}
                                target="_blank" rel="noreferrer"
                                style={{ color:'#0D9488', fontSize:11, display:'flex', alignItems:'center', gap:3 }}
                              >
                                <Receipt size={11}/> {p.receiptNo}
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {accPayments.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign:'center', padding:24, color:'#94a3b8' }}>
                          No payments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'#F0FDF9', fontWeight:800 }}>
                      <td colSpan={7} style={{ padding:'10px 14px', color:'#1E3A5F', fontSize:13 }}>
                        Total — {accData.count} payments
                      </td>
                      <td style={{ color:'#0D9488', fontSize:15 }}>{money(accData.totalAmount)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Settlement status banner */}
              {accData.settled ? (
                <div style={{ padding:'10px 20px', background:'#DCFCE7', borderTop:'1px solid #BBF7D0', display:'flex', alignItems:'center', gap:8 }}>
                  <CheckCircle size={16} color="#15803d"/>
                  <span style={{ color:'#15803d', fontWeight:600, fontSize:13 }}>
                    This accountant has been settled for {date}
                  </span>
                </div>
              ) : (
                <div style={{ padding:'10px 20px', background:'#FEF9C3', borderTop:'1px solid #FDE047', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={16} color="#b45309"/>
                    <span style={{ color:'#b45309', fontWeight:600, fontSize:13 }}>
                      Not yet settled
                    </span>
                  </div>
                  {accData.totalAmount > 0 && (
                    <button
                      className="btn btn-sm btn-green"
                      onClick={() => settle.mutate(accData.id)}
                      disabled={settle.isPending}
                    >
                      {settle.isPending ? <Spin/> : <CheckCircle size={13}/>} Mark as Settled
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Print Summary (visible in print) ── */}
      <div className="card" style={{ marginTop:16, pageBreakInside:'avoid' }}>
        <div style={{ fontWeight:700, color:'#1E3A5F', marginBottom:12, fontSize:15 }}>
          Daily Summary — {date}
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#F0FDF9' }}>
              <th style={{ padding:'8px 12px', textAlign:'left', borderBottom:'2px solid #CCFBF1', color:'#0D9488' }}>Accountant</th>
              <th style={{ padding:'8px 12px', textAlign:'right', borderBottom:'2px solid #CCFBF1', color:'#0D9488' }}>Transactions</th>
              <th style={{ padding:'8px 12px', textAlign:'right', borderBottom:'2px solid #CCFBF1', color:'#0D9488' }}>Cash</th>
              <th style={{ padding:'8px 12px', textAlign:'right', borderBottom:'2px solid #CCFBF1', color:'#0D9488' }}>Online</th>
              <th style={{ padding:'8px 12px', textAlign:'right', borderBottom:'2px solid #CCFBF1', color:'#0D9488' }}>Total</th>
              <th style={{ padding:'8px 12px', textAlign:'center', borderBottom:'2px solid #CCFBF1', color:'#0D9488' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {accountants.map((acc, i) => (
              <tr key={acc.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                <td style={{ padding:'8px 12px', fontWeight:600, color:'#1E3A5F' }}>{acc.name}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', color:'#64748B' }}>{acc.count}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', color:'#15803d', fontWeight:600 }}>{money(acc.byMethod.cash)}</td>
                <td style={{ padding:'8px 12px', textAlign:'right', color:'#7c3aed', fontWeight:600 }}>
                  {money((acc.byMethod.online || 0) + (acc.byMethod.card || 0) + (acc.byMethod.wallet || 0))}
                </td>
                <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:800, color:'#0D9488', fontSize:14 }}>{money(acc.totalAmount)}</td>
                <td style={{ padding:'8px 12px', textAlign:'center' }}>
                  {acc.settled
                    ? <span className="badge badge-green">Settled</span>
                    : <span className="badge badge-amber">Pending</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background:'#F0FDF9', fontWeight:800 }}>
              <td style={{ padding:'10px 12px', color:'#1E3A5F' }}>GRAND TOTAL</td>
              <td style={{ padding:'10px 12px', textAlign:'right', color:'#64748B' }}>{grandCount}</td>
              <td style={{ padding:'10px 12px', textAlign:'right', color:'#15803d' }}>{money(byMethod.cash)}</td>
              <td style={{ padding:'10px 12px', textAlign:'right', color:'#7c3aed' }}>
                {money((byMethod.online || 0) + (byMethod.card || 0) + (byMethod.wallet || 0))}
              </td>
              <td style={{ padding:'10px 12px', textAlign:'right', color:'#0D9488', fontSize:16 }}>{money(grandTotal)}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
        <div style={{ marginTop:10, fontSize:11, color:'#94a3b8', textAlign:'right' }}>
          Generated: {new Date().toLocaleString('en-PK')} &bull; IlmForge School ERP
        </div>
      </div>
    </div>
  );
}
