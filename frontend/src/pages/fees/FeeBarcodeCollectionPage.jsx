import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Barcode, X, DollarSign, Printer, CheckCircle, User,
  RefreshCw, ZapIcon, Receipt, CreditCard, Smartphone, Wallet,
  AlertCircle, ChevronRight, Hash, GraduationCap, Users
} from 'lucide-react';

const money = v => 'Rs. ' + ((v || 0) / 100).toLocaleString();
const fmt   = v => ((v || 0) / 100).toFixed(0);

const STATUS_BADGE = {
  paid:    { cls: 'badge-green',  label: 'Paid' },
  partial: { cls: 'badge-amber',  label: 'Partial' },
  unpaid:  { cls: 'badge-red',    label: 'Unpaid' },
  pending: { cls: 'badge-slate',  label: 'Pending' },
};

const METHOD_ICONS = {
  cash:   { icon: DollarSign,  label: 'Cash',          color: '#15803d' },
  card:   { icon: CreditCard,  label: 'Card',          color: '#1d4ed8' },
  online: { icon: Smartphone,  label: 'Online Transfer', color: '#7c3aed' },
  wallet: { icon: Wallet,      label: 'Parent Wallet',  color: '#b45309' },
};

/* ─── tiny inline spinner ─── */
const Spin = () => (
  <span style={{
    display:'inline-block', width:14, height:14, border:'2px solid #ccc',
    borderTopColor:'#0D9488', borderRadius:'50%', animation:'spin .7s linear infinite',
    verticalAlign:'middle', marginRight:6
  }}/>
);

export default function FeeBarcodeCollectionPage() {
  const qc = useQueryClient();

  /* barcode input */
  const barcodeRef  = useRef(null);
  const [barcode,   setBarcode]   = useState('');
  const [scanning,  setScanning]  = useState(false);

  /* loaded student data */
  const [studentData, setStudentData] = useState(null);   // { student, invoices }

  /* payment modal */
  const [modalOpen,  setModalOpen]  = useState(false);
  const [activeInv,  setActiveInv]  = useState(null);
  const [payForm,    setPayForm]    = useState({ amountPaid:'', discount:0, method:'cash', notifyVia:'whatsapp_sms', printReceipt:true });

  /* collect-all mode */
  const [collectAll, setCollectAll] = useState(false);

  /* today's session counter (resets on page reload — for a persistent counter use a query) */
  const [todayCount, setTodayCount] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);

  /* auto-focus barcode field on load */
  useEffect(() => { barcodeRef.current?.focus(); }, []);

  /* ── today's collections (from server) ── */
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: todayStats } = useQuery({
    queryKey: ['barcode-today-stats'],
    queryFn: () => api.get('/fees/payments', { params: { from: todayStr, to: todayStr, limit: 500 } }).then(r => r.data),
    refetchInterval: 30000,
  });

  /* ── barcode lookup mutation (GET via mutate for on-demand) ── */
  const lookup = useMutation({
    mutationFn: code => api.get('/fees/student-by-barcode', { params: { barcode: code } }).then(r => r.data.data),
    onMutate:   ()   => setScanning(true),
    onSuccess:  data => {
      setStudentData(data);
      setScanning(false);
      setBarcode('');
      if (!data?.student) toast.error('Student not found for this barcode.');
    },
    onError: err => {
      setScanning(false);
      toast.error(err.response?.data?.message || 'Barcode lookup failed.');
    },
  });

  /* ── payment mutation ── */
  const pay = useMutation({
    mutationFn: d => api.post('/fees/payments', d),
    onSuccess: r => {
      const receipt = r.data.data?.receiptNo || '';
      toast.success(`Payment recorded! Receipt: ${receipt}`);
      setTodayCount(c => c + 1);
      setTodayTotal(t => t + (r.data.data?.amountPaid || 0));
      qc.invalidateQueries(['barcode-today-stats']);
      /* refresh student invoices */
      if (studentData?.student?.id) {
        api.get('/fees/student-by-barcode', { params: { barcode: studentData.student.rollNo || studentData.student.admissionNo } })
          .then(res => setStudentData(res.data.data))
          .catch(() => {});
      }
      if (payForm.printReceipt && receipt) {
        window.open(`/api/v1/pdf/receipt/${r.data.data?.paymentId || receipt}`, '_blank');
      }
      setModalOpen(false);
      setCollectAll(false);
    },
    onError: err => toast.error(err.response?.data?.message || 'Payment failed'),
  });

  /* ── handle barcode Enter ── */
  const handleScan = useCallback(() => {
    const code = barcode.trim();
    if (!code) return;
    lookup.mutate(code);
  }, [barcode, lookup]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleScan();
  };

  /* ── open single invoice payment modal ── */
  const openPayModal = (inv) => {
    setCollectAll(false);
    setActiveInv(inv);
    setPayForm({ amountPaid: fmt(inv.dueAmount), discount: 0, method:'cash', notifyVia:'whatsapp_sms', printReceipt: true });
    setModalOpen(true);
  };

  /* ── open "collect all" modal ── */
  const openCollectAll = () => {
    const pending = pendingInvoices;
    if (!pending.length) return;
    const totalDue = pending.reduce((s, i) => s + (i.dueAmount || 0), 0);
    setActiveInv(null);
    setCollectAll(true);
    setPayForm({ amountPaid: fmt(totalDue), discount: 0, method:'cash', notifyVia:'whatsapp_sms', printReceipt: true });
    setModalOpen(true);
  };

  /* ── confirm payment (single or all) ── */
  const confirmPayment = async () => {
    const amt = parseFloat(payForm.amountPaid);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    const disc = parseFloat(payForm.discount || 0);

    if (collectAll) {
      /* pay each pending invoice sequentially */
      let remaining = Math.round(amt * 100);
      for (const inv of pendingInvoices) {
        if (remaining <= 0) break;
        const chunk = Math.min(remaining, inv.dueAmount || 0);
        if (chunk <= 0) continue;
        await pay.mutateAsync({
          invoiceId:  inv.id,
          studentId:  studentData.student.id,
          amountPaid: chunk,
          discount:   Math.round(disc * 100 / pendingInvoices.length),
          method:     payForm.method,
          notifyVia:  payForm.notifyVia,
        });
        remaining -= chunk;
      }
    } else {
      pay.mutate({
        invoiceId:  activeInv.id,
        studentId:  studentData.student.id,
        amountPaid: Math.round(amt * 100),
        discount:   Math.round(disc * 100),
        method:     payForm.method,
        notifyVia:  payForm.notifyVia,
      });
    }
  };

  const clearStudent = () => {
    setStudentData(null);
    setBarcode('');
    setModalOpen(false);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  };

  const student        = studentData?.student;
  const allInvoices    = studentData?.invoices || [];
  const pendingInvoices = allInvoices.filter(i => i.status !== 'paid');
  const totalDue       = pendingInvoices.reduce((s, i) => s + (i.dueAmount || 0), 0);
  const serverCount    = todayStats?.total || 0;
  const serverTotal    = todayStats?.totalAmount || 0;

  const avatarLetter   = student?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="page-content fade-in">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanPulse { 0%,100%{box-shadow:0 0 0 0 rgba(13,148,136,0.4)} 50%{box-shadow:0 0 0 10px rgba(13,148,136,0)} }
        .scan-pulse { animation: scanPulse 1.2s ease-in-out infinite; }
        .invoice-row:hover { background:#F0FDF9!important; transition:background .15s; }
        .method-btn { border:2px solid #E8EDF3; border-radius:10px; padding:10px 14px; cursor:pointer; background:#fff; transition:all .15s; display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; }
        .method-btn.active { border-color:#0D9488; background:#F0FDF9; }
        .method-btn:hover { border-color:#0D9488; }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Barcode size={26} color="#0D9488" />
            Fee Barcode Collection
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>
            Scan student fee slip barcode to instantly load and collect fee
          </p>
        </div>

        {/* Today's Counter */}
        <div style={{ display:'flex', gap:12 }}>
          <div style={{ background:'linear-gradient(135deg,#0D9488,#0F766E)', borderRadius:12, padding:'10px 20px', textAlign:'center', minWidth:130 }}>
            <div style={{ color:'rgba(255,255,255,0.8)', fontSize:11, fontWeight:600, letterSpacing:1 }}>TODAY'S COLLECTIONS</div>
            <div style={{ color:'#fff', fontSize:22, fontWeight:800, lineHeight:1.2 }}>{serverCount}</div>
            <div style={{ color:'rgba(255,255,255,0.9)', fontSize:12, marginTop:2 }}>Rs. {(serverTotal / 100).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── Barcode Scanner Input ── */}
      <div className="card" style={{ marginBottom:16, background:'linear-gradient(135deg,#F0FDF9,#F8FAFC)', border:'2px solid #CCFBF1' }}>
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <Barcode size={40} color="#0D9488" style={{ opacity:0.7 }} />
          <div style={{ fontSize:16, fontWeight:700, color:'#1E3A5F', marginTop:6 }}>Scan Fee Slip Barcode</div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>Place cursor here — barcode scanner or type manually and press Enter</div>
        </div>

        <div style={{ display:'flex', gap:10, maxWidth:560, margin:'0 auto', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1 }}>
            <Barcode size={18} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#0D9488' }} />
            <input
              ref={barcodeRef}
              className={`form-input ${scanning ? 'scan-pulse' : ''}`}
              style={{
                paddingLeft:44, fontSize:18, fontWeight:700, letterSpacing:2,
                height:52, borderRadius:12, border:'2px solid #0D9488',
                textAlign:'center', color:'#1E3A5F',
                background: scanning ? '#F0FDF9' : '#fff',
              }}
              placeholder="Scan or type barcode / roll no..."
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button
            className="btn btn-teal"
            style={{ height:52, paddingInline:24, borderRadius:12, fontSize:15, fontWeight:700 }}
            onClick={handleScan}
            disabled={scanning || !barcode.trim()}
          >
            {scanning ? <><Spin/> Loading...</> : <><ZapIcon size={16}/> Lookup</>}
          </button>
          {studentData && (
            <button
              className="btn btn-outline"
              style={{ height:52, paddingInline:18, borderRadius:12 }}
              onClick={clearStudent}
              title="Clear — scan next student"
            >
              <RefreshCw size={16}/> Next
            </button>
          )}
        </div>

        {scanning && (
          <div style={{ textAlign:'center', marginTop:12, color:'#0D9488', fontSize:13, fontWeight:600 }}>
            <Spin /> Looking up student...
          </div>
        )}
      </div>

      {/* ── Student Card ── */}
      {student && (
        <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
          {/* Student Header */}
          <div style={{
            padding:'16px 22px',
            background:'linear-gradient(90deg,#0D9488,#0F766E)',
            display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              {/* Avatar */}
              <div style={{
                width:54, height:54, borderRadius:'50%',
                background:'rgba(255,255,255,0.2)',
                border:'3px solid rgba(255,255,255,0.4)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:800, fontSize:22, flexShrink:0
              }}>
                {student.photo
                  ? <img src={student.photo} alt={student.name} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/>
                  : avatarLetter
                }
              </div>

              <div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:18, lineHeight:1.2 }}>{student.name}</div>
                <div style={{ color:'rgba(255,255,255,0.85)', fontSize:13, marginTop:3, display:'flex', flexWrap:'wrap', gap:8 }}>
                  {student.rollNo && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <Hash size={12}/> Roll: <strong>{student.rollNo}</strong>
                    </span>
                  )}
                  {student.class?.name && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <GraduationCap size={12}/> {student.class.name}
                      {student.section?.name && ` (${student.section.name})`}
                    </span>
                  )}
                  {student.fatherName && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <Users size={12}/> Father: <strong>{student.fatherName}</strong>
                    </span>
                  )}
                  {student.admissionNo && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <User size={12}/> Adm: <strong>{student.admissionNo}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Due + Actions */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {totalDue > 0 ? (
                <div style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, padding:'8px 18px', textAlign:'center' }}>
                  <div style={{ color:'rgba(255,255,255,0.85)', fontSize:11, fontWeight:600 }}>OUTSTANDING</div>
                  <div style={{ color:'#FEF08A', fontSize:20, fontWeight:800 }}>{money(totalDue)}</div>
                </div>
              ) : (
                <div style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, padding:'8px 18px', textAlign:'center' }}>
                  <div style={{ color:'rgba(255,255,255,0.85)', fontSize:11, fontWeight:600 }}>STATUS</div>
                  <div style={{ color:'#86EFAC', fontSize:15, fontWeight:800 }}>All Clear</div>
                </div>
              )}

              {pendingInvoices.length > 1 && (
                <button
                  className="btn"
                  style={{ background:'#FEF08A', color:'#854d0e', fontWeight:700, borderRadius:10, border:'none', paddingInline:18, height:42 }}
                  onClick={openCollectAll}
                >
                  <CheckCircle size={15}/> Collect All
                </button>
              )}

              <button
                style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, padding:'8px 12px', cursor:'pointer', color:'#fff' }}
                onClick={clearStudent}
                title="Clear — scan next student"
              >
                <X size={16}/>
              </button>
            </div>
          </div>

          {/* ── Invoices List ── */}
          <div style={{ padding:'0 0 4px 0' }}>
            {allInvoices.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 20px', color:'#94a3b8' }}>
                <Receipt size={36} style={{ opacity:0.3, marginBottom:8 }} />
                <div style={{ fontSize:14, fontWeight:600 }}>No fee invoices found</div>
                <div style={{ fontSize:12, marginTop:4 }}>Generate fee invoices for this student first</div>
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fee Title</th>
                      <th>Month / Year</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInvoices.map(inv => {
                      const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.pending;
                      return (
                        <tr key={inv.id} className="invoice-row" style={{ opacity: inv.status === 'paid' ? 0.6 : 1 }}>
                          <td style={{ fontWeight:600, color:'#1E3A5F' }}>{inv.feeTitle}</td>
                          <td style={{ color:'#64748B', fontSize:13 }}>{inv.month} {inv.year}</td>
                          <td>{money(inv.totalAmount)}</td>
                          <td style={{ color:'#15803d', fontWeight:600 }}>{money(inv.paidAmount)}</td>
                          <td style={{ color: inv.dueAmount > 0 ? '#DC2626' : '#15803d', fontWeight:700 }}>
                            {money(inv.dueAmount)}
                          </td>
                          <td>
                            <span className={`badge ${badge.cls}`}>{badge.label}</span>
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              {inv.status !== 'paid' && (
                                <button className="btn btn-sm btn-green" onClick={() => openPayModal(inv)}>
                                  <DollarSign size={12}/> Collect
                                </button>
                              )}
                              {inv.voucherNo && (
                                <a
                                  href={`/api/v1/pdf/voucher/${inv.id}`}
                                  target="_blank" rel="noreferrer"
                                  className="btn btn-sm btn-outline btn-icon"
                                  title="Print Voucher"
                                >
                                  <Printer size={12}/>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty / Idle State ── */}
      {!student && !scanning && (
        <div className="card" style={{ textAlign:'center', padding:'52px 24px' }}>
          <div style={{
            width:80, height:80, borderRadius:'50%',
            background:'linear-gradient(135deg,#F0FDF9,#CCFBF1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px auto'
          }}>
            <Barcode size={40} color="#0D9488" style={{ opacity:0.5 }} />
          </div>
          <div style={{ fontSize:17, fontWeight:700, color:'#1E3A5F', marginBottom:6 }}>
            Ready to Scan
          </div>
          <div style={{ fontSize:13, color:'#94a3b8', maxWidth:340, margin:'0 auto', lineHeight:1.6 }}>
            Point barcode scanner at the fee slip and scan, or type the roll number / admission number and press Enter.
          </div>
          <div style={{ marginTop:20, display:'flex', justifyContent:'center', gap:24 }}>
            {[
              { icon: Hash,          text: 'Roll Number'       },
              { icon: User,          text: 'Admission No.'     },
              { icon: Barcode,       text: 'Fee Slip Barcode'  },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:6, color:'#94a3b8', fontSize:12 }}>
                <Icon size={14}/> {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div className="modal-header" style={{ background:'linear-gradient(90deg,#F0FDF9,#F8FAFC)', borderBottom:'1px solid #CCFBF1' }}>
              <div>
                <div className="modal-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <DollarSign size={18} color="#0D9488"/>
                  {collectAll ? 'Collect All Pending Fees' : 'Collect Payment'}
                </div>
                {!collectAll && activeInv && (
                  <div style={{ fontSize:12, color:'#64748B', marginTop:3 }}>
                    {activeInv.feeTitle} — {activeInv.month} {activeInv.year}
                  </div>
                )}
                {collectAll && (
                  <div style={{ fontSize:12, color:'#64748B', marginTop:3 }}>
                    {pendingInvoices.length} pending invoices — {student?.name}
                  </div>
                )}
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                <X size={18}/>
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight:'70vh', overflowY:'auto' }}>
              {/* Summary box */}
              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, padding:14, marginBottom:18 }}>
                {!collectAll && activeInv && (
                  <>
                    <Row label="Total Amount"   value={money(activeInv.totalAmount)} />
                    <Row label="Already Paid"   value={money(activeInv.paidAmount)} color="#15803d" />
                    <div style={{ borderTop:'1px solid #E2E8F0', marginTop:8, paddingTop:8 }}>
                      <Row label="Due Amount" value={money(activeInv.dueAmount)} color="#DC2626" bold />
                    </div>
                  </>
                )}
                {collectAll && (
                  <>
                    <Row label="Pending Invoices" value={pendingInvoices.length} />
                    <div style={{ borderTop:'1px solid #E2E8F0', marginTop:8, paddingTop:8 }}>
                      <Row label="Total Due" value={money(totalDue)} color="#DC2626" bold />
                    </div>
                  </>
                )}
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Amount to Collect (Rs.) *</label>
                <input
                  className="form-input"
                  type="number" step="1" min="1"
                  style={{ fontSize:18, fontWeight:700, textAlign:'center', color:'#15803d' }}
                  value={payForm.amountPaid}
                  onChange={e => setPayForm({ ...payForm, amountPaid: e.target.value })}
                  autoFocus
                />
              </div>

              {/* Discount */}
              <div className="form-group">
                <label className="form-label">Discount / Concession (Rs.)</label>
                <input
                  className="form-input"
                  type="number" step="1" min="0"
                  value={payForm.discount}
                  onChange={e => setPayForm({ ...payForm, discount: e.target.value })}
                />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div style={{ display:'flex', gap:10 }}>
                  {Object.entries(METHOD_ICONS).map(([key, { icon: Icon, label, color }]) => (
                    <button
                      key={key}
                      type="button"
                      className={`method-btn ${payForm.method === key ? 'active' : ''}`}
                      onClick={() => setPayForm({ ...payForm, method: key })}
                    >
                      <Icon size={20} color={payForm.method === key ? color : '#94a3b8'} />
                      <span style={{ fontSize:10, fontWeight:600, color: payForm.method === key ? color : '#94a3b8', whiteSpace:'nowrap' }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notify */}
              <div className="form-group">
                <label className="form-label">Notify Parent</label>
                <select className="form-select" value={payForm.notifyVia} onChange={e => setPayForm({ ...payForm, notifyVia: e.target.value })}>
                  <option value="whatsapp_sms">WhatsApp + SMS</option>
                  <option value="sms">SMS Only</option>
                  <option value="none">Do Not Notify</option>
                </select>
              </div>

              {/* Print Receipt */}
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'#F8FAFC', borderRadius:8, padding:'10px 14px' }}>
                <input
                  type="checkbox"
                  id="printReceipt"
                  checked={payForm.printReceipt}
                  onChange={e => setPayForm({ ...payForm, printReceipt: e.target.checked })}
                  style={{ width:16, height:16, accentColor:'#0D9488' }}
                />
                <label htmlFor="printReceipt" style={{ fontSize:13, fontWeight:600, color:'#1E3A5F', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                  <Printer size={14} color="#0D9488"/> Print receipt after payment
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-teal" onClick={confirmPayment} disabled={pay.isPending}>
                {pay.isPending
                  ? <><Spin/> Processing...</>
                  : <><CheckCircle size={15}/> {collectAll ? 'Collect All Now' : 'Confirm Payment'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* helper row component for modal summary */
function Row({ label, value, color, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginTop:4 }}>
      <span style={{ color:'#64748B' }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, color: color || '#1E3A5F' }}>{value}</span>
    </div>
  );
}
