/**
 * IlmForge — Parent Wallet System
 * Credit/advance payments. Parents can deposit money,
 * system auto-deducts from wallet when fees are due.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Wallet, Search, Plus, ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react';

const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';

export default function ParentWalletPage() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [selStudent, setSel]  = useState(null);
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');
  const [showDeposit, setShowDeposit] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ['wallet-search', search],
    queryFn: () => api.get('/students', { params: { search, limit: 8 } }).then(r => r.data.data || []).catch(() => []),
    enabled: search.length >= 2,
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet', selStudent?.id],
    queryFn: () => api.get(`/fees/wallet/${selStudent.id}`).then(r => r.data.data).catch(() => ({ balance: 0, transactions: [] })),
    enabled: !!selStudent,
  });

  const deposit = useMutation({
    mutationFn: () => api.post('/fees/wallet/deposit', {
      studentId: selStudent.id, amount: Number(amount), note,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['wallet', selStudent?.id]);
      setAmount(''); setNote(''); setShowDeposit(false);
      toast.success(`Rs. ${Number(amount).toLocaleString('en-PK')} deposited to wallet`);
    },
    onError: err => toast.error(err.response?.data?.message || 'Deposit failed'),
  });

  const balance  = walletData?.balance || 0;
  const txns     = walletData?.transactions || [];

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Wallet size={20} color="#7c3aed" /> Parent Wallet System
          </h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:2 }}>
            Advance / credit deposits. System auto-deducts when fees are due.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body">
          <div style={{ position:'relative', maxWidth:400 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
            <input className="form-input" style={{ paddingLeft:32 }} placeholder="Search student by name or roll no…"
              value={search} onChange={e => { setSearch(e.target.value); setSel(null); }} />
            {students.length > 0 && !selStudent && search.length >= 2 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e2e8f0', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:100 }}>
                {students.map(s => (
                  <div key={s.id} style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}
                    onClick={() => { setSel(s); setSearch(s.name); }}>
                    <ChevronRight size={12} color="#94a3b8"/>
                    <strong>{s.name}</strong>
                    <span style={{ color:'#94a3b8', fontSize:11 }}>{s.class?.name} | Roll: {s.rollNo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!selStudent ? (
        <div className="card">
          <div className="empty-state" style={{ padding:60 }}>
            <div style={{ fontSize:48 }}>💳</div>
            <div className="empty-state-text">Search a student to view wallet</div>
            <div className="empty-state-sub">Parents can deposit advance payments — auto-deducted on fee generation</div>
          </div>
        </div>
      ) : (
        <>
          {/* Wallet card */}
          <div style={{ background:'linear-gradient(135deg,#4c1d95,#7c3aed)', borderRadius:14, padding:'22px 24px', marginBottom:16, color:'white' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, opacity:0.8 }}>Wallet Balance</div>
                <div style={{ fontSize:36, fontWeight:900, marginTop:4 }}>{Rs(balance)}</div>
                <div style={{ fontSize:12, opacity:0.7, marginTop:6 }}>
                  {selStudent.name} · {selStudent.class?.name} · Roll: {selStudent.rollNo}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>💳</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={() => setShowDeposit(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', color:'white', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                <Plus size={14}/> Add Deposit
              </button>
            </div>
          </div>

          {/* Deposit form */}
          {showDeposit && (
            <div className="card" style={{ marginBottom:16, border:'1px solid #7c3aed' }}>
              <div className="card-header" style={{ background:'#f5f3ff' }}>
                <h3 style={{ margin:0, fontSize:14 }}>Add Wallet Deposit</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDeposit(false)}>Cancel</button>
              </div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Deposit Amount (Rs.) *</label>
                    <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Note</label>
                    <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Advance for July" />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => deposit.mutate()} disabled={!amount || deposit.isPending}>
                  {deposit.isPending ? 'Processing…' : `Deposit ${amount ? Rs(amount) : ''}  to Wallet`}
                </button>
              </div>
            </div>
          )}

          {/* Transaction history */}
          <div className="card">
            <div className="card-header">
              <h3>Wallet Transactions</h3>
              <span style={{ fontSize:12, color:'#64748b' }}>{txns.length} transactions</span>
            </div>
            {txns.length === 0 ? (
              <div className="empty-state" style={{ padding:40 }}>
                <div className="empty-state-text">No transactions yet</div>
                <div className="empty-state-sub">Deposits and deductions will appear here</div>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="table-modern">
                  <thead><tr>{['Date','Type','Amount','Balance After','Note'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {txns.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontSize:12 }}>{fmtDate(t.createdAt)}</td>
                        <td>
                          {t.type === 'deposit'
                            ? <span className="chip chip-green"><ArrowDownLeft size={10}/> Deposit</span>
                            : <span className="chip chip-red"><ArrowUpRight size={10}/> Deduction</span>
                          }
                        </td>
                        <td style={{ fontWeight:700, color: t.type === 'deposit' ? '#15803d' : '#dc2626' }}>
                          {t.type === 'deposit' ? '+' : '-'}{Rs(t.amount)}
                        </td>
                        <td style={{ fontWeight:700 }}>{Rs(t.balanceAfter)}</td>
                        <td style={{ fontSize:12, color:'#64748b' }}>{t.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
