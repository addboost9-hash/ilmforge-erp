/**
 * IlmForge — Public Fee Voucher Download
 * 3-copy layout: Bank Copy · School Copy · Parent Copy
 * Actions: Print · Download as Image · Send via WhatsApp
 */
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { ArrowLeft, Lock, Search, Printer, Download, MessageSquare, FileText } from 'lucide-react';
import { getWatermarkScale } from '../../utils/watermarkPrint';

const Rs = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const monthName = m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1] || m;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── 3-Copy Voucher Print Template ─────────────────────── */
function VoucherCopy({ label, student, invoice, school, bankDetails, monthlyHistory }) {
  const barcodeVal = invoice?.voucherNo || `VCH-${String(invoice?.id || '0000').padStart(5,'0')}`;
  const dueDate    = invoice?.dueDate   ? new Date(invoice.dueDate).toLocaleDateString('en-PK', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
  const validity   = invoice?.dueDate   ? new Date(invoice.dueDate).toLocaleDateString('en-PK', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—';

  // Bank details — prefer from API, then localStorage fallback
  const bankName   = bankDetails?.bankName    || localStorage.getItem('ilmforge_bank_name')   || '';
  const bankBranch = bankDetails?.branch      || localStorage.getItem('ilmforge_bank_branch') || '';
  const bankAccNo  = bankDetails?.accountNumber || localStorage.getItem('ilmforge_bank_acc')  || '';
  const bankTitle  = bankDetails?.accountTitle  || localStorage.getItem('ilmforge_bank_title')|| school?.name || 'School Account';

  const logo       = school?.logoUrl || localStorage.getItem('schoolLogoPreview');
  const schoolName = school?.name    || localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const address    = [school?.address, school?.city].filter(Boolean).join(', ') || '';
  const phone      = school?.phone   || '';
  const compactScale = getWatermarkScale('compact');

  // Fee breakdown
  const prevBalance  = 0; // can be enhanced later
  const subtotal     = Number(invoice?.totalAmount || 0);
  const lateFee      = Number(invoice?.lateFee || 0);
  const total        = subtotal + lateFee;
  const afterDueDate = total + Math.round(total * 0.05); // 5% after due

  return (
    <div style={{
      width: 210, minWidth: 210, border: '1px solid #ddd',
      fontFamily: "'Courier New', monospace",
      fontSize: 9, background: '#fff', pageBreakInside: 'avoid', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        {logo ? <img src={logo} alt="watermark" style={{ width:compactScale.logoSize, height:compactScale.logoSize, objectFit:'cover', borderRadius:20, opacity:0.07 }} /> : null}
        <div style={{ marginTop:compactScale.textMarginTop, fontSize:compactScale.textSize, fontWeight:700, letterSpacing:1, color:'#1F2937', textTransform:'uppercase', opacity:0.055 }}>{schoolName}</div>
      </div>

      {/* Copy label */}
      <div style={{ background: '#0F4C45', color: '#fff', textAlign: 'center', padding: '3px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>
        {label}
      </div>

      {/* School header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderBottom: '1px solid #ddd' }}>
        {logo && <img src={logo} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}/>}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: '#0F4C45', lineHeight: 1.2 }}>{schoolName}</div>
          {address && <div style={{ fontSize: 7.5, color: '#555', lineHeight: 1.3 }}>{address}</div>}
          {phone && <div style={{ fontSize: 7.5, color: '#555' }}>Contact: {phone}</div>}
        </div>
      </div>

      {/* Barcode area */}
      <div style={{ textAlign: 'center', padding: '4px 8px', borderBottom: '1px solid #eee', background: '#FAFAFA' }}>
        <div style={{ fontFamily: "'Libre Barcode 39',monospace", fontSize: 24, letterSpacing: 2, lineHeight: 1 }}>
          {'|'.repeat(20)}
        </div>
        <div style={{ fontSize: 8, color: '#888', marginTop: 1 }}>{barcodeVal}</div>
      </div>

      {/* Student info */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid #eee' }}>
        {[
          ['Name:',    student?.name || '—'],
          ['Parent:',  student?.fatherName || '—'],
          ['Class/Sec:', `${student?.class?.name || '—'} / ${student?.section?.name || '—'}`],
          ['Roll No:',  student?.rollNo || '—'],
          ['Campus:',   school?.name || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
            <span style={{ width: 58, fontWeight: 700, color: '#333', flexShrink: 0 }}>{k}</span>
            <span style={{ color: '#444' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Bank details */}
      {(bankName || bankBranch || bankAccNo) && (
        <div style={{ padding: '4px 8px', borderBottom: '1px solid #eee', background: '#F9FAFB', textAlign: 'center' }}>
          {bankName && <div style={{ fontWeight: 700, fontSize: 8.5, color: '#1e3a5f' }}>{bankName}{bankBranch ? ` - Branch: ${bankBranch}` : ''}</div>}
          {bankAccNo && <div style={{ fontSize: 8, color: '#374151' }}>Acc# {bankAccNo} - Acc. Title: {bankTitle}</div>}
        </div>
      )}

      {/* Fee description */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5 }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ textAlign: 'left', padding: '2px 3px', fontWeight: 700, border: '1px solid #ddd' }}>Fee Description</th>
              <th style={{ textAlign: 'right', padding: '2px 3px', fontWeight: 700, border: '1px solid #ddd' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding:'2px 3px', border:'1px solid #eee' }}>{invoice?.feeTitle || 'Monthly Fee'}</td><td style={{ padding:'2px 3px', textAlign:'right', border:'1px solid #eee' }}>{subtotal}</td></tr>
            <tr><td style={{ padding:'2px 3px', border:'1px solid #eee' }}>Previous Balance</td><td style={{ padding:'2px 3px', textAlign:'right', border:'1px solid #eee' }}>{prevBalance}</td></tr>
          </tbody>
          <tfoot>
            <tr style={{ background:'#f9f9f9' }}>
              <td style={{ padding:'2px 3px', fontWeight:700, border:'1px solid #ddd' }}>Subtotal</td>
              <td style={{ padding:'2px 3px', textAlign:'right', fontWeight:700, border:'1px solid #ddd' }}>{subtotal}</td>
            </tr>
            <tr>
              <td style={{ padding:'2px 3px', border:'1px solid #eee' }}>Late Fee (For Arrears)</td>
              <td style={{ padding:'2px 3px', textAlign:'right', border:'1px solid #eee' }}>{lateFee}</td>
            </tr>
            <tr style={{ fontWeight:700 }}>
              <td style={{ padding:'2px 3px', border:'1px solid #ddd' }}>Total:</td>
              <td style={{ padding:'2px 3px', textAlign:'right', border:'1px solid #ddd' }}>{total}</td>
            </tr>
            <tr>
              <td style={{ padding:'2px 3px', color:'#B91C1C', fontWeight:700, border:'1px solid #ddd' }}>After Due Date:</td>
              <td style={{ padding:'2px 3px', textAlign:'right', color:'#B91C1C', fontWeight:700, border:'1px solid #ddd' }}>{afterDueDate}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Dates */}
      <div style={{ padding: '3px 8px', display: 'flex', gap: 8, borderBottom: '1px solid #eee', fontSize: 8 }}>
        <span>Validity: <strong>{validity}</strong></span>
        <span>Due Date: <strong style={{ color: '#B91C1C' }}>{dueDate}</strong></span>
      </div>

      {/* Monthly history */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: '#374151', marginBottom: 3, textAlign:'center' }}>Student Fee History</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7, border:'1px solid #ddd' }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th style={{ padding:'1px 2px', textAlign:'left', border:'1px solid #ddd' }}>Month</th>
              {MONTHS_SHORT.map(m => <th key={m} style={{ padding:'1px 2px', textAlign:'center', border:'1px solid #ddd', width:14 }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding:'1px 2px', fontWeight:700, border:'1px solid #ddd' }}>Total</td>
              {(monthlyHistory || Array.from({length:12},()=>({total:0,paid:0}))).map((h,i) => (
                <td key={i} style={{ padding:'1px 2px', textAlign:'center', border:'1px solid #ddd' }}>
                  {h.total > 0 ? h.total : 0}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding:'1px 2px', fontWeight:700, border:'1px solid #ddd' }}>Paid</td>
              {(monthlyHistory || Array.from({length:12},()=>({total:0,paid:0}))).map((h,i) => (
                <td key={i} style={{ padding:'1px 2px', textAlign:'center', border:'1px solid #ddd', color: h.paid > 0 ? '#15803d' : '#999' }}>
                  {h.paid > 0 ? h.paid : 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notice + QR */}
      <div style={{ padding: '4px 8px', display: 'flex', gap: 6, borderBottom: '1px solid #eee' }}>
        <div style={{ flex: 1, fontSize: 7, color: '#555', lineHeight: 1.5 }}>
          <strong style={{ color: '#1E3A5F' }}>NOTICE:</strong><br/>
          * This computer generated fee voucher. No manual corrections will be acceptable.<br/>
          * This is a computer generated voucher, no manual corrections will be acceptable.
        </div>
        {/* QR placeholder */}
        <div style={{ width: 36, height: 36, border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, color: '#aaa', flexShrink: 0 }}>
          QR<br/>Code
        </div>
      </div>

      {/* Signatures */}
      <div style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: '#555' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #999', width: 70, paddingTop: 2 }}>Authorized Signature</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #999', width: 70, paddingTop: 2 }}>Bank School Stamp</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '2px 0', fontSize: 7, color: '#94A3B8', borderTop: '1px solid #F3F4F6' }}>
        Powered by IlmForge · ilmforge-erp.vercel.app
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function PublicFeeVoucherPage() {
  const [rollId,   setRollId]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [student,        setStudent]       = useState(null);
  const [invoices,       setInvoices]      = useState([]);
  const [school,         setSchool]        = useState(null);
  const [bankDetails,    setBankDetails]   = useState(null);
  const [monthlyHistory, setMonthlyHistory]= useState(null);
  const [selected,       setSelected]      = useState(null);
  const [step,           setStep]          = useState(1);
  const printRef = useRef();

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!rollId.trim()) return toast.error('Please enter your Roll ID');
    setLoading(true);
    try {
      const slug = localStorage.getItem('schoolSlug') || '';
      const res = await api.get('/public/fees/by-roll/' + encodeURIComponent(rollId.trim()) + (slug ? `?schoolSlug=${slug}` : ''));
      const payload = res.data.data || {};
      setStudent(payload.student || null);
      setInvoices(payload.invoices || []);
      setSchool(payload.school || null);
      setBankDetails(payload.bankDetails || null);
      setMonthlyHistory(payload.monthlyHistory || null);
      if ((payload.invoices || []).length > 0) {
        setSelected(payload.invoices[0]);
      }
      setStep(2);
    } catch {
      toast.error('Student not found. Check your Roll ID.');
    } finally {
      setLoading(false);
    }
  };

  /* Print 3-copy voucher */
  const handlePrint = () => {
    if (!selected) return toast.error('Select an invoice first');
    const content = printRef.current;
    const w = window.open('', '_blank', 'width=900,height=650');
    w.document.write(`
      <html><head>
        <title>Fee Voucher — ${student?.name}</title>
        <style>
          body { margin:0; padding:16px; background:#fff; font-family:'Courier New',monospace; }
          .copies { display:flex; gap:12px; justify-content:center; }
          @media print {
            .no-print { display:none; }
            .copies { gap:6px; }
          }
        </style>
      </head><body>
        <div class="no-print" style="text-align:center;margin-bottom:14px;">
          <button onclick="window.print()" style="background:#0F766E;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;cursor:pointer;margin-right:8px;">🖨️ Print</button>
          <button onclick="window.close()" style="background:#F1F5F9;color:#374151;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;">✕ Close</button>
        </div>
        ${content.innerHTML}
      </body></html>
    `);
    w.document.close();
  };

  /* Download as Image — use browser print to PDF  */
  const handleDownloadImage = () => {
    toast('Use Print → "Save as PDF" to download as PDF or image', { icon: '📥', duration: 4000 });
    handlePrint();
  };

  /* Send via WhatsApp */
  const handleWhatsApp = () => {
    if (!student) return;
    const phone   = student?.emergencyPhone?.replace(/\D/g, '') || '';
    const balance = selected ? Rs(selected.dueAmount) : 'pending';
    const dueDate = selected?.dueDate ? new Date(selected.dueDate).toLocaleDateString('en-PK') : '—';
    const msg = encodeURIComponent(
      `*${school?.name || 'IlmForge School'} Fee Voucher*\n\n` +
      `Student: *${student?.name}*\n` +
      `Roll No: ${student?.rollNo}\n` +
      `Class: ${student?.class?.name || '—'}\n` +
      `Month: ${selected?.month ? monthName(selected.month) : '—'} ${selected?.year || ''}\n` +
      `Amount: *${Rs(selected?.totalAmount)}*\n` +
      `Due Date: ${dueDate}\n` +
      `Status: ${selected?.status || 'unpaid'}\n\n` +
      `Please pay before the due date to avoid late fees.\n` +
      `For voucher: ${window.location.origin}/fee-voucher`
    );
    const waUrl = phone
      ? `https://wa.me/92${phone.slice(-10)}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0F4C45,#0F766E)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {(() => {
          const logo = localStorage.getItem('schoolLogoPreview');
          return logo
            ? <img src={logo} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}/>
            : <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎓</div>;
        })()}
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>
            {localStorage.getItem('registeredSchoolName') || 'IlmForge School'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Fee Voucher Download</div>
        </div>
        <Link to="/login" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={13}/> Back to Login
        </Link>
      </div>

      <div style={{ maxWidth: 680, margin: '36px auto', padding: '0 16px 40px' }}>

        {/* ── Step 1: Enter Roll ID ── */}
        {step === 1 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#0F4C45,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 34 }}>🎓</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F', marginBottom: 6 }}>Download Student Voucher</h1>
            <p style={{ color: '#DC2626', fontSize: 14, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Lock size={14}/> Please Type Student Roll Id Below To Verify
            </p>
            <form onSubmit={handleContinue}>
              <input
                style={{ width: '100%', padding: '13px 16px', border: '2px solid #E2E8F0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none', marginBottom: 16, boxSizing: 'border-box', textAlign: 'center', letterSpacing: 2, fontWeight: 600 }}
                placeholder="Type roll id here..."
                value={rollId}
                onChange={e => setRollId(e.target.value)}
                autoFocus
              />
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(90deg,#0F4C45,#0F766E)', color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Search size={16}/> {loading ? 'Searching...' : 'Continue →'}
              </button>
            </form>
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#FEF2F2', borderRadius: 9, border: '1px solid #FECACA' }}>
              <p style={{ color: '#B91C1C', fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                Student roll ID can be found on an old voucher or student ID card.<br/>
                Please make sure to type the correct roll ID to get the accurate voucher.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Voucher View ── */}
        {step === 2 && student && (
          <div>
            {/* Student card */}
            <div style={{ background: 'linear-gradient(135deg,#0F4C45,#0F766E)', borderRadius: 14, padding: '18px 22px', marginBottom: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>
                {student.name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{student.name}</div>
                <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                  Roll: {student.rollNo} · {student.class?.name || '—'} · Section {student.section?.name || '—'}
                </div>
                {student.fatherName && <div style={{ fontSize: 12, opacity: 0.6 }}>Father: {student.fatherName}</div>}
              </div>
              <button onClick={() => { setStep(1); setRollId(''); setStudent(null); setInvoices([]); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                ← Back
              </button>
            </div>

            {/* Invoice selector */}
            {invoices.length > 1 && (
              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Select Invoice to Print</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {invoices.map(inv => (
                    <button key={inv.id}
                      onClick={() => setSelected(inv)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                        borderColor: selected?.id === inv.id ? '#0D9488' : '#E5E7EB',
                        background: selected?.id === inv.id ? '#F0FDF9' : '#fff',
                        color: selected?.id === inv.id ? '#0F766E' : '#374151',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {monthName(inv.month)} {inv.year}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {selected && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <button onClick={handlePrint}
                  style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#0F766E', color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Printer size={15}/> 🖨️ Print
                </button>
                <button onClick={handleDownloadImage}
                  style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#1D4ED8', color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Download size={15}/> 📥 Download as Image
                </button>
                <button onClick={handleWhatsApp}
                  style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#15803D', color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <MessageSquare size={15}/> 📲 Send via WhatsApp
                </button>
              </div>
            )}

            {/* 3-copy voucher preview */}
            {selected ? (
              <div ref={printRef}>
                {/* Print-only header */}
                <div style={{ display: 'none' }} className="print-header">
                  <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: '#666' }}>
                    {school?.name} — Fee Voucher — {monthName(selected?.month)} {selected?.year}
                  </div>
                </div>
                {/* 3 copies side by side */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', overflowX: 'auto', padding: '4px 2px' }}>
                  {['BANK COPY', 'SCHOOL COPY', 'PARENT COPY'].map(label => (
                    <VoucherCopy key={label} label={label} student={student} invoice={selected} school={school} bankDetails={bankDetails} monthlyHistory={monthlyHistory}/>
                  ))}
                </div>
              </div>
            ) : invoices.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                <FileText size={36} style={{ marginBottom: 10, opacity: 0.3 }}/>
                <div>No fee vouchers found for this student</div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
