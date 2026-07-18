import { useState } from 'react';
import { printFeeVoucher } from '../../utils/printDesigns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Search, DollarSign, Printer, X, CheckCircle, Receipt, CreditCard } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

const money = v => 'Rs. ' + ((v || 0) / 100).toLocaleString();

export default function FeeCollectionPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeInv, setActiveInv] = useState(null);
  const [payForm, setPayForm] = useState({ amountPaid: '', discount: 0, method: 'cash', notifyVia: 'whatsapp_sms' });
  const [receiptData, setReceiptData] = useState(null); // holds last payment receipt for display

  const { data: searchResults, isFetching: sLoading } = useQuery({
    queryKey: ['fee-search', search],
    queryFn: () => search.length > 1 ? api.get('/students', { params: { search, limit: 10 } }).then(r => r.data.data) : Promise.resolve([]),
    enabled: search.length > 1,
  });

  const { data: feeData } = useQuery({
    queryKey: ['student-fee', selected?.id],
    queryFn: () => api.get('/fees/student/' + selected.id).then(r => r.data.data),
    enabled: !!selected,
  });

  const pay = useMutation({
    mutationFn: d => api.post('/fees/payments', d),
    onSuccess: (r, variables) => {
      const receiptNo = r.data.data?.receiptNo || r.data.data?.payment?.id || 'N/A';
      const studentName = selected?.name || feeData?.student?.name || 'Student';
      const paidAmount = money(variables.amountPaid);
      toast.success(`Payment of ${paidAmount} collected from ${studentName}. Receipt: ${receiptNo}`);
      qc.invalidateQueries(['student-fee', selected?.id]);
      qc.invalidateQueries(['dashboard']);
      // Store receipt data for the success/print modal
      setReceiptData({
        receiptNo,
        studentName,
        studentRollNo: feeData?.student?.rollNo || selected?.rollNo || '',
        className: feeData?.student?.class?.name || selected?.class?.name || '',
        feeTitle: activeInv?.feeTitle || '',
        month: activeInv ? `${activeInv.month} ${activeInv.year}` : '',
        amountPaid: variables.amountPaid,
        method: variables.method,
        newStatus: r.data.data?.newStatus,
        newDue: r.data.data?.newDue,
        date: new Date().toLocaleString('en-PK'),
      });
      setShowModal(false);
    },
    onError: err => toast.error(err.response?.data?.message || 'Payment failed'),
  });

  const openPayModal = (inv) => {
    setActiveInv(inv);
    setPayForm({ amountPaid: ((inv.dueAmount || 0) / 100).toFixed(0), discount: 0, method: 'cash', notifyVia: 'whatsapp_sms' });
    setShowModal(true);
  };

  const confirmPayment = () => {
    if (!payForm.amountPaid || payForm.amountPaid <= 0) return toast.error('Enter valid amount');
    pay.mutate({
      invoiceId: activeInv.id,
      studentId: selected.id,
      amountPaid: Math.round(parseFloat(payForm.amountPaid) * 100),
      discount: Math.round(parseFloat(payForm.discount || 0) * 100),
      method: payForm.method,
      notifyVia: payForm.notifyVia,
    });
  };

  const totalDue = (feeData?.invoices || []).filter(i => i.status !== 'paid').reduce((s, i) => s + (i.dueAmount || 0), 0);

  return (
    <div className="page-content fade-in">

      {/* Page Header Card */}
      <div className="card" style={{ marginBottom: 16, padding: 0 }}>
        <div className="content-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Fee Collection</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>Search student and collect fee payments</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Receipt size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fee Portal</span>
          </div>
        </div>
      </div>

      {/* Student Search Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3><Search size={15} /> Search Student</h3>
        </div>
        <div className="card-body" style={{ paddingBottom: search.length > 1 && !selected ? 0 : undefined }}>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="Type student name, roll no, or father name..."
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setSelected(null); }}
            />
            {selected && (
              <button
                onClick={() => { setSelected(null); setSearchInput(''); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* Search dropdown results */}
          {search.length > 1 && !selected && (
            <div style={{ marginTop: 8, border: '1px solid var(--border-light)', borderRadius: 4, overflow: 'hidden', maxWidth: 480, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', background: '#fff' }}>
              {sLoading && (
                <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13 }}>Searching...</div>
              )}
              {!sLoading && (searchResults || []).length === 0 && (
                <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13 }}>No students found</div>
              )}
              {(searchResults || []).map(s => (
                <div
                  key={s.id}
                  onClick={() => { setSelected(s); setSearchInput(s.name); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</span>
                    {s.fatherName && <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>— {s.fatherName}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {s.rollNo && <span className="badge badge-teal">{s.rollNo}</span>}
                    {s.class?.name && <span className="badge badge-primary">{s.class.name}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Fee Info Card */}
      {selected && feeData && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>

          {/* Card Header: Student Info */}
          <div className="card-header" style={{ background: 'linear-gradient(90deg, var(--primary-light), #f8f9fa)', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>
                {selected.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{feeData.student?.name || selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Roll: <strong>{feeData.student?.rollNo || '—'}</strong>
                  {feeData.student?.class?.name && <> | Class: <strong>{feeData.student.class.name}</strong></>}
                  {feeData.student?.fatherName && <> | Father: <strong>{feeData.student.fatherName}</strong></>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {totalDue > 0 && (
                <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: '6px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#721c24', fontWeight: 600 }}>Total Due</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#721c24' }}>{money(totalDue)}</div>
                </div>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => { setSelected(null); setSearchInput(''); }}>
                <X size={13} /> Clear
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
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
                {(feeData.invoices || []).map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.feeTitle}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{inv.month} {inv.year}</td>
                    <td>{money(inv.totalAmount)}</td>
                    <td style={{ color: 'var(--stat-teal)' }}>{money(inv.discount)}</td>
                    <td style={{ color: 'var(--stat-green)', fontWeight: 600 }}>{money(inv.paidAmount)}</td>
                    <td style={{ color: inv.dueAmount > 0 ? 'var(--stat-red)' : 'var(--stat-green)', fontWeight: 700 }}>{money(inv.dueAmount)}</td>
                    <td>
                      <span className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                        {inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {inv.status !== 'paid' && (
                          <button className="btn btn-sm btn-success" onClick={() => openPayModal(inv)}>
                            <DollarSign size={12} /> Collect
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline btn-icon"
                          title="Print Voucher"
                          onClick={() => {
                            const token = localStorage.getItem('accessToken');
                            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
                            const url = `${apiBase}/pdf/voucher/${inv.id}`;
                            fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                              .then(r => r.text())
                              .then(html => {
                                // Use iframe to avoid popup blocker
                                const iframe = document.createElement('iframe');
                                iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999;background:white;';
                                document.body.appendChild(iframe);
                                iframe.contentDocument.write(html + `<script>window.onload=()=>{window.print();setTimeout(()=>{document.body.removeChild(parent.document.querySelector('iframe[style*="z-index:9999"]'))},500)}<\/script>`);
                                iframe.contentDocument.close();
                              })
                              .catch(() => {
                                // Fallback: navigate to public fee voucher
                                window.open('/fee-voucher', '_blank');
                              });
                          }}>
                          <Printer size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!feeData.invoices || feeData.invoices.length === 0) && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                      No fee invoices found. Generate fee first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Fee Summary Row */}
          {feeData.invoices && feeData.invoices.length > 0 && (
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 28 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Total Billed: <strong style={{ color: 'var(--text-primary)' }}>
                  {money((feeData.invoices || []).reduce((s, i) => s + (i.totalAmount || 0), 0))}
                </strong>
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Total Paid: <strong style={{ color: 'var(--stat-green)' }}>
                  {money((feeData.invoices || []).reduce((s, i) => s + (i.paidAmount || 0), 0))}
                </strong>
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Total Due: <strong style={{ color: totalDue > 0 ? 'var(--stat-red)' : 'var(--stat-green)' }}>
                  {money(totalDue)}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showModal && activeInv && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ padding: 0 }}>

            {/* Modal Header */}
            <div className="card-header" style={{ borderRadius: '8px 8px 0 0' }}>
              <div>
                <div className="modal-title">Collect Payment</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {activeInv.feeTitle} — {activeInv.month} {activeInv.year}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div className="card-body">
              {/* Invoice summary */}
              <div className="alert alert-info" style={{ marginBottom: 16, borderRadius: 4 }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>Total Amount</span>
                    <strong>{money(activeInv.totalAmount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                    <span>Already Paid</span>
                    <strong style={{ color: 'var(--stat-green)' }}>{money(activeInv.paidAmount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 6, paddingTop: 6, borderTop: '1px solid #bee5eb' }}>
                    <strong style={{ color: 'var(--stat-red)' }}>Due Amount</strong>
                    <strong style={{ color: 'var(--stat-red)' }}>{money(activeInv.dueAmount)}</strong>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount to Collect (Rs.) *</label>
                <input className="form-control" type="number" step="1" min="1"
                  value={payForm.amountPaid} onChange={e => setPayForm({ ...payForm, amountPaid: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Discount (Rs.)</label>
                <input className="form-control" type="number" step="1" min="0"
                  value={payForm.discount} onChange={e => setPayForm({ ...payForm, discount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online Transfer</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="wallet">Parent Wallet</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notify Parent</label>
                <select className="form-select" value={payForm.notifyVia} onChange={e => setPayForm({ ...payForm, notifyVia: e.target.value })}>
                  <option value="whatsapp_sms">WhatsApp + SMS</option>
                  <option value="sms">SMS Only</option>
                  <option value="none">Do Not Notify</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={confirmPayment} disabled={pay.isPending}>
                {pay.isPending ? 'Processing...' : <><CheckCircle size={15} /> Confirm Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Success Modal — shown after successful payment */}
      {receiptData && (
        <div className="modal-overlay" onClick={() => setReceiptData(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ padding: 0 }}>
            <div className="card-header" style={{ borderRadius: '8px 8px 0 0', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={20} color="#fff" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Payment Successful</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Receipt generated</div>
                </div>
              </div>
              <button onClick={() => setReceiptData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <div className="card-body">
              {/* Receipt details */}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>PAYMENT RECEIPT</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{receiptData.date}</div>
                </div>
                {[
                  ['Receipt No', receiptData.receiptNo],
                  ['Student', receiptData.studentName],
                  ['Roll No', receiptData.studentRollNo || '—'],
                  ['Class', receiptData.className || '—'],
                  ['Fee Title', receiptData.feeTitle || '—'],
                  ['Period', receiptData.month || '—'],
                  ['Amount Paid', money(receiptData.amountPaid)],
                  ['Method', receiptData.method?.toUpperCase() || '—'],
                  ['Balance Due', receiptData.newDue != null ? money(receiptData.newDue) : '—'],
                  ['Status', receiptData.newStatus?.toUpperCase() || '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px dashed #d1fae5' }}>
                    <span style={{ color: '#374151' }}>{label}</span>
                    <strong style={{ color: '#111827' }}>{val}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setReceiptData(null)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const printHtml = `<!DOCTYPE html><html><head><title>Receipt ${receiptData.receiptNo}</title>
                  <style>body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:20px}
                  h2{text-align:center;margin:4px 0;font-size:15px}
                  .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #ccc}
                  .label{color:#555}.val{font-weight:700}
                  @media print{body{-webkit-print-color-adjust:exact}}</style></head><body>
                  <h2>PAYMENT RECEIPT</h2>
                  <p style="text-align:center;color:#888;font-size:11px;margin:2px 0">${receiptData.date}</p>
                  <div style="margin-top:14px">
                  ${[
                    ['Receipt No', receiptData.receiptNo],
                    ['Student', receiptData.studentName],
                    ['Roll No', receiptData.studentRollNo || '—'],
                    ['Class', receiptData.className || '—'],
                    ['Fee Title', receiptData.feeTitle || '—'],
                    ['Period', receiptData.month || '—'],
                    ['Amount Paid', 'Rs. ' + (receiptData.amountPaid / 100).toLocaleString()],
                    ['Method', receiptData.method?.toUpperCase() || '—'],
                    ['Balance Due', receiptData.newDue != null ? 'Rs. ' + (receiptData.newDue / 100).toLocaleString() : '—'],
                    ['Status', receiptData.newStatus?.toUpperCase() || '—'],
                  ].map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="val">${v}</span></div>`).join('')}
                  </div>
                  <p style="text-align:center;font-size:10px;color:#999;margin-top:18px">Powered by IlmForge School Management</p>
                  <script>window.onload=()=>window.print()<\/script></body></html>`;
                  const w = window.open('', '_blank', 'width=480,height=640');
                  if (w) { w.document.write(printHtml); w.document.close(); }
                }}
              >
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selected && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.25 }}>
            <Receipt size={52} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Search a Student to Collect Fee</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Type at least 2 characters to search by name, roll number, or father's name</div>
        </div>
      )}
    </div>
  );
}
