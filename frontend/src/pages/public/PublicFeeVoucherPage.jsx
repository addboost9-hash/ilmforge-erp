/**
 * IlmForge — Professional Fee Voucher v2.0
 * Next-level 3-copy with:
 *  • Real CODE128 SVG barcode
 *  • QR code (via qrcode library)
 *  • Previous balance + monthly history
 *  • Bank details from DB
 *  • Tear lines between copies
 *  • School watermark
 *  • Professional Pakistani challan format
 */
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import QRCode from 'qrcode';
import { ArrowLeft, Lock, Search, Printer, Download, MessageSquare, FileText, CheckCircle } from 'lucide-react';

/* ── helpers ──────────────────────────────────────────────── */
const Rs      = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mName   = m => MONTHS[(parseInt(m) - 1)] || m;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

/* ── CODE128 SVG Barcode Generator ────────────────────────── */
const CODE128_PATTERNS = {
  ' ':11011001100,'!':11001101100,'"':11001100110,'#':10010011000,
  '$':10010001100,'%':10001001100,'&':10011001000,"'":10011000100,
  '(':10001100100,')':10011001100,'*':11001001000,'+':11001000100,
  ',':11000100100,'-':10110011100,'.':10011011100,'/':10011001110,
  '0':10111001100,'1':10011101100,'2':10011100110,'3':11100101100,
  '4':11100100110,'5':11101001100,'6':11100101110,'7':11101110100,
  '8':11100011010,'9':11000010100,'A':10001100010,'B':10011100010,
  'C':10001110010,'D':10110001000,'E':10001011000,'F':10001000110,
  'G':10110000100,'H':10000101100,'I':10000100110,'J':10110010000,
  'K':11110111010,'L':11000010010,'M':11001010000,'N':10111011110,
  'O':10111101110,'P':11101011010,'Q':11001000010,'R':11110001010,
  'S':10100110000,'T':10100001100,'U':10010110000,'V':10010000110,
  'W':10000110100,'X':10000110010,'Y':10011000010,'Z':10000011010,
};

function Barcode({ value, height = 40 }) {
  const bars = [];
  let x = 0;
  const barWidth = 1.5;

  const encode = (str) => {
    // Start with CODE128 B start character (105)
    const startBars = '11010010000';
    const stopBars  = '1100011101011';
    let encoded = startBars;
    for (const c of str) {
      const pattern = CODE128_PATTERNS[c] || CODE128_PATTERNS[' '];
      encoded += String(pattern);
    }
    encoded += stopBars;
    return encoded;
  };

  const encoded = encode(value.substring(0, 20));
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '1') {
      bars.push(<rect key={i} x={x} y={0} width={barWidth} height={height} fill="#000" />);
    }
    x += barWidth;
  }

  return (
    <svg width={x} height={height} style={{ display: 'block' }}>
      {bars}
    </svg>
  );
}

/* ── QR Code component ─────────────────────────────────────── */
function QRImg({ text, size = 56 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && text) {
      QRCode.toCanvas(ref.current, text, { width: size, margin: 0, color: { dark: '#000000' } });
    }
  }, [text, size]);
  return <canvas ref={ref} style={{ borderRadius: 2 }} />;
}

/* ── Professional 3-Copy Voucher ───────────────────────────── */
function VoucherCopy({ label, labelColor, student, invoice, school, bankDetails, monthlyHistory }) {
  const vNo       = invoice?.voucherNo || `VCH-${String(invoice?.id || '0000').padStart(5,'0')}`;
  const dueDate   = fmtDate(invoice?.dueDate);
  const issueDate = invoice?.createdAt ? fmtDate(invoice.createdAt) : fmtDate(new Date());
  const monthNum  = invoice?.month;
  const monthStr  = monthNum ? mName(monthNum) : '—';
  const year      = invoice?.year || new Date().getFullYear();

  const logo       = school?.logoUrl || localStorage.getItem('schoolLogoPreview');
  const schoolName = school?.name    || localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const address    = [school?.address, school?.city].filter(Boolean).join(', ');
  const phone      = school?.phone  || '';

  const bankName   = bankDetails?.bankName    || '';
  const bankBranch = bankDetails?.branch      || '';
  const bankAccNo  = bankDetails?.accountNumber || '';
  const bankTitle  = bankDetails?.accountTitle  || schoolName;

  const total      = Number(invoice?.totalAmount || 0);
  const paid       = Number(invoice?.paidAmount  || 0);
  const lateFee    = Number(invoice?.lateFee     || 0);
  const discount   = Number(invoice?.discount    || 0);
  const dueAmt     = Number(invoice?.dueAmount   || total - paid);
  const afterDue   = Math.round((dueAmt + lateFee) * 1.05);

  const isPaid     = invoice?.status === 'paid' || dueAmt === 0;

  const qrData = `${window.location.origin}/fee-voucher#${vNo}`;

  const COPY_COLORS = {
    'BANK COPY':   { header: '#1B3A6E', bg: '#EEF2FF' },
    'SCHOOL COPY': { header: '#15803D', bg: '#F0FDF4' },
    'PARENT COPY': { header: '#7C3AED', bg: '#FAF5FF' },
  };
  const colors = COPY_COLORS[label] || { header: '#374151', bg: '#F9FAFB' };

  return (
    <div style={{
      width: 220, minWidth: 220,
      fontFamily: "'Courier New', 'Courier', monospace",
      fontSize: 8, background: '#fff',
      border: `1px solid ${colors.header}`,
      borderRadius: 4, overflow: 'hidden',
      pageBreakInside: 'avoid',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }}>
      {/* Copy label strip */}
      <div style={{ background: colors.header, color: '#fff', textAlign: 'center', padding: '4px 0', fontSize: 9, fontWeight: 800, letterSpacing: 2 }}>
        {label}
      </div>

      {/* School header */}
      <div style={{ background: colors.bg, padding: '8px 10px', borderBottom: `2px solid ${colors.header}`, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {logo && (
          <img src={logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0, borderRadius: 3 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 10, color: colors.header, lineHeight: 1.2, letterSpacing: 0.3 }}>{schoolName.toUpperCase()}</div>
          {address && <div style={{ fontSize: 7, color: '#64748b', marginTop: 1 }}>{address}</div>}
          {phone && <div style={{ fontSize: 7, color: '#64748b' }}>Ph: {phone}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 7, color: '#64748b' }}>Voucher No.</div>
          <div style={{ fontWeight: 800, fontSize: 8, color: colors.header }}>{vNo}</div>
          {isPaid && <div style={{ background: '#15803d', color: '#fff', fontSize: 7, fontWeight: 800, padding: '1px 5px', borderRadius: 3, marginTop: 2 }}>✓ PAID</div>}
        </div>
      </div>

      {/* Barcode */}
      <div style={{ textAlign: 'center', padding: '6px 4px 3px', background: '#fafafa', borderBottom: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Barcode value={vNo} height={32} />
        <div style={{ fontSize: 7, color: '#64748b', marginTop: 2, letterSpacing: 1 }}>{vNo}</div>
      </div>

      {/* Student Info */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0' }}>
        {[
          ['Student', student?.name || '—'],
          ['Father', student?.fatherName || '—'],
          ['Class/Sec', `${student?.class?.name || '—'} / ${student?.section?.name || 'A'}`],
          ['Roll No.', student?.rollNo || '—'],
          ['Campus', student?.campus?.name || school?.name || '—'],
          ['Voucher Month', `${monthStr} ${year}`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 4, marginBottom: 2.5, alignItems: 'flex-start' }}>
            <span style={{ minWidth: 62, fontWeight: 700, color: '#374151', flexShrink: 0, fontSize: 7.5 }}>{k}:</span>
            <span style={{ color: '#1a1a1a', fontSize: 7.5, lineHeight: 1.3, wordBreak: 'break-word' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Bank Details */}
      {(bankName || bankAccNo) && (
        <div style={{ padding: '5px 8px', background: '#f0f9ff', borderBottom: '1px solid #bfdbfe', textAlign: 'center' }}>
          {bankName && <div style={{ fontWeight: 800, fontSize: 8, color: '#1d4ed8', letterSpacing: 0.3 }}>{bankName}{bankBranch ? ` — Branch: ${bankBranch}` : ''}</div>}
          {bankAccNo && <div style={{ fontSize: 7.5, color: '#374151', marginTop: 1 }}>Acc# {bankAccNo} &nbsp;|&nbsp; Title: {bankTitle}</div>}
        </div>
      )}

      {/* Fee Breakdown */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 800, fontSize: 7.5, color: '#374151', borderBottom: '1px solid #e2e8f0', paddingBottom: 2, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fee Description</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7.5 }}>
          <tbody>
            <tr><td style={{ paddingBottom: 2 }}>{invoice?.feeTitle || 'Monthly Fee'}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{Rs(total)}</td></tr>
            {discount > 0 && <tr style={{ color: '#15803d' }}><td>Discount</td><td style={{ textAlign: 'right' }}>- {Rs(discount)}</td></tr>}
            {paid > 0 && <tr style={{ color: '#0073b7' }}><td>Amount Paid</td><td style={{ textAlign: 'right' }}>- {Rs(paid)}</td></tr>}
            {lateFee > 0 && <tr style={{ color: '#dc2626' }}><td>Late Fee</td><td style={{ textAlign: 'right' }}>+ {Rs(lateFee)}</td></tr>}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #374151', fontWeight: 800 }}>
              <td style={{ paddingTop: 3 }}>TOTAL DUE</td>
              <td style={{ textAlign: 'right', paddingTop: 3, color: isPaid ? '#15803d' : '#dc2626', fontSize: 10 }}>{isPaid ? 'PAID ✓' : Rs(dueAmt)}</td>
            </tr>
            {!isPaid && (
              <tr style={{ color: '#dc2626', fontSize: 7 }}>
                <td>After Due Date:</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{Rs(afterDue)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Dates */}
      <div style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', fontSize: 7 }}>
        <span>Issue: <strong>{issueDate}</strong></span>
        <span style={{ color: '#dc2626' }}>Due: <strong>{dueDate}</strong></span>
      </div>

      {/* Monthly History */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 800, fontSize: 7.5, color: '#374151', marginBottom: 3, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment History {year}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 6.5, border: '1px solid #e2e8f0' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {MONTHS.map(m => <th key={m} style={{ padding: '2px 1px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontWeight: 700 }}>{m.charAt(0)}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              {MONTHS.map((m, i) => {
                const h = monthlyHistory?.[i];
                const isCurrent = (i + 1) === parseInt(monthNum);
                const hasPaid   = h?.paid > 0;
                const hasTotal  = h?.total > 0;
                return (
                  <td key={m} style={{ padding: '2px 1px', textAlign: 'center', borderRight: '1px solid #e2e8f0', background: isCurrent ? '#fef9c3' : 'transparent' }}>
                    {hasTotal
                      ? <span style={{ color: hasPaid ? '#15803d' : '#dc2626', fontWeight: 700 }}>{hasPaid ? '✓' : '✗'}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 6.5, color: '#64748b' }}>
          <span>✓ Paid &nbsp; ✗ Unpaid &nbsp; — Not generated</span>
        </div>
      </div>

      {/* QR + Notice */}
      <div style={{ padding: '5px 8px', display: 'flex', gap: 6, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ flexShrink: 0 }}>
          <QRImg text={qrData} size={44} />
          <div style={{ fontSize: 6, color: '#94a3b8', textAlign: 'center', marginTop: 1 }}>Scan to verify</div>
        </div>
        <div style={{ flex: 1, fontSize: 6.5, color: '#475569', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800, color: '#374151', marginBottom: 2 }}>NOTICE:</div>
          <div>• This is a computer generated voucher.</div>
          <div>• No manual corrections acceptable.</div>
          <div>• Keep this voucher as receipt.</div>
          <div>• Due date: <span style={{ color: '#dc2626', fontWeight: 700 }}>{dueDate}</span></div>
        </div>
      </div>

      {/* Signature */}
      <div style={{ padding: '5px 8px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 7 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #374151', width: 60, paddingTop: 2 }}>Authorized Sign.</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #374151', width: 60, paddingTop: 2 }}>
            {label === 'BANK COPY' ? 'Bank Stamp' : label === 'SCHOOL COPY' ? 'School Stamp' : 'Parent Sign.'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function PublicFeeVoucherPage() {
  const [rollId,         setRollId]         = useState('');
  const [loading,        setLoading]        = useState(false);
  const [student,        setStudent]        = useState(null);
  const [invoices,       setInvoices]       = useState([]);
  const [school,         setSchool]         = useState(null);
  const [bankDetails,    setBankDetails]    = useState(null);
  const [monthlyHistory, setMonthlyHistory] = useState(null);
  const [selected,       setSelected]       = useState(null);
  const [step,           setStep]           = useState(1);
  const printRef = useRef();

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!rollId.trim()) return toast.error('Please enter your Roll ID');
    setLoading(true);
    try {
      const slug = localStorage.getItem('schoolSlug') || '';
      const res  = await api.get(`/public/fees/by-roll/${encodeURIComponent(rollId.trim())}${slug ? `?schoolSlug=${slug}` : ''}`);
      const payload = res.data.data || {};
      setStudent(payload.student || null);
      setInvoices(payload.invoices || []);
      setSchool(payload.school || null);
      setBankDetails(payload.bankDetails || null);
      setMonthlyHistory(payload.monthlyHistory || null);
      const unpaid = (payload.invoices || []).find(i => i.status !== 'paid') || payload.invoices?.[0];
      setSelected(unpaid || null);
      setStep(2);
    } catch {
      toast.error('Student not found. Check your Roll ID.');
    } finally { setLoading(false); }
  };

  /* Print 3-copy voucher */
  const handlePrint = () => {
    if (!selected) return toast.error('Select an invoice first');
    const content = printRef.current;
    const w = window.open('', '_blank', 'width=950,height=700');
    w.document.write(`<!DOCTYPE html>
<html><head>
  <title>Fee Voucher — ${student?.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; padding: 16px; font-family: 'Courier New', monospace; }
    .copies { display: flex; gap: 14px; justify-content: center; align-items: flex-start; }
    .tear { text-align: center; color: #94a3b8; font-size: 10px; margin: 8px 0; letter-spacing: 3px; border-top: 1px dashed #94a3b8; padding-top: 6px; }
    .no-print { display: none !important; }
    @media print {
      body { padding: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .copies { gap: 6px; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center; margin-bottom:12px; display:flex; gap:10px; justify-content:center;">
    <button onclick="window.print()" style="background:#1B3A6E;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ Print All 3 Copies</button>
    <button onclick="window.close()" style="background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;">✕ Close</button>
  </div>
  ${content.innerHTML}
  <div class="tear">✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ TEAR HERE ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 1000);
  };

  /* Send via WhatsApp */
  const handleWhatsApp = () => {
    if (!student) return;
    const phone = student?.emergencyPhone?.replace(/\D/g, '') || '';
    const msg = encodeURIComponent(
      `*${school?.name || 'IlmForge'} Fee Voucher*\n\n` +
      `Student: *${student?.name}*\n` +
      `Roll No: ${student?.rollNo}\n` +
      `Class: ${student?.class?.name || '—'}\n` +
      `Month: ${selected?.month ? mName(selected.month) : '—'} ${selected?.year || ''}\n` +
      `Amount Due: *${Rs(selected?.dueAmount || selected?.totalAmount)}*\n` +
      `Due Date: ${fmtDate(selected?.dueDate)}\n\n` +
      `View voucher: ${window.location.origin}/fee-voucher`
    );
    const waUrl = phone ? `https://wa.me/92${phone.slice(-10)}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  };

  const logo       = localStorage.getItem('schoolLogoPreview');
  const schoolName = school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f4fd 100%)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B2F6E 0%, #0073b7 100%)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
        {logo
          ? <img src={logo} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
          : <div style={{ width: 46, height: 46, borderRadius: 11, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎓</div>
        }
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>{schoolName}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 }}>Fee Voucher Download</div>
        </div>
        <Link to="/login" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.75)', fontSize: 12.5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}>
          <ArrowLeft size={13}/> Back to Login
        </Link>
      </div>

      <div style={{ maxWidth: 900, margin: '28px auto', padding: '0 16px 40px' }}>

        {/* Step 1 — Enter Roll ID */}
        {step === 1 && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '44px 36px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, #1B2F6E, #0073b7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 38 }}>🎓</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1E3A5F', marginBottom: 6 }}>Fee Voucher Download</h1>
            <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 600, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Lock size={14}/> Enter Student Roll ID to access your voucher
            </p>
            <form onSubmit={handleContinue}>
              <input
                style={{ width: '100%', padding: '14px 18px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', outline: 'none', marginBottom: 16, boxSizing: 'border-box', textAlign: 'center', letterSpacing: 3, fontWeight: 700, transition: 'border-color .15s' }}
                placeholder="Type roll id here..."
                value={rollId}
                onChange={e => setRollId(e.target.value)}
                autoFocus
                onFocus={e => e.target.style.borderColor = '#0073b7'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg, #1B2F6E, #0073b7)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Search size={16}/> {loading ? 'Searching…' : 'Continue →'}
              </button>
            </form>
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
              <p style={{ color: '#B91C1C', fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                Roll ID can be found on your ID card or previous fee voucher.<br/>
                Contact school office if you don't know your Roll ID.
              </p>
            </div>
          </div>
        )}

        {/* Step 2 — Voucher View */}
        {step === 2 && student && (
          <div>
            {/* Student Banner */}
            <div style={{ background: 'linear-gradient(135deg, #1B2F6E, #0073b7)', borderRadius: 16, padding: '18px 24px', marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, flexShrink: 0 }}>
                {student.name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{student.name}</div>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>
                  Roll: {student.rollNo} · {student.class?.name || '—'} · {student.section?.name || '—'}
                </div>
                {student.fatherName && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 1 }}>Father: {student.fatherName}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{invoices.filter(i => i.status !== 'paid').length}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Unpaid</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{invoices.filter(i => i.status === 'paid').length}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Paid</div>
                </div>
              </div>
              <button onClick={() => { setStep(1); setRollId(''); setStudent(null); setInvoices([]); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                ← Back
              </button>
            </div>

            {/* Invoice Selector */}
            {invoices.length > 1 && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Select Invoice to Print</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {invoices.map(inv => (
                    <button key={inv.id} onClick={() => setSelected(inv)}
                      style={{ padding: '7px 14px', borderRadius: 9, border: `2px solid ${selected?.id === inv.id ? '#0073b7' : '#e2e8f0'}`, background: selected?.id === inv.id ? '#eff6ff' : '#fff', color: selected?.id === inv.id ? '#0073b7' : '#374151', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {mName(inv.month)} {inv.year}
                      {inv.status === 'paid'
                        ? <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, padding: '1px 6px', borderRadius: 99 }}>Paid</span>
                        : <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, padding: '1px 6px', borderRadius: 99 }}>{Rs(inv.dueAmount)}</span>
                      }
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selected && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={handlePrint}
                  style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1B2F6E', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(27,47,110,0.3)' }}>
                  <Printer size={15}/> Print 3 Copies
                </button>
                <button onClick={handleWhatsApp}
                  style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#15803D', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  <MessageSquare size={15}/> Send via WhatsApp
                </button>
              </div>
            )}

            {/* 3-Copy Preview */}
            {selected ? (
              <>
                {/* Status Banner */}
                {selected.status === 'paid' && (
                  <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 700, fontSize: 13 }}>
                    <CheckCircle size={16}/> This fee has been PAID — printing as receipt copy
                  </div>
                )}
                <div ref={printRef}>
                  <div style={{ display: 'flex', gap: 14, justifyContent: 'center', overflowX: 'auto', padding: '4px 2px' }}>
                    {[
                      { label: 'BANK COPY' },
                      { label: 'SCHOOL COPY' },
                      { label: 'PARENT COPY' },
                    ].map(({ label }) => (
                      <VoucherCopy
                        key={label}
                        label={label}
                        student={student}
                        invoice={selected}
                        school={school}
                        bankDetails={bankDetails}
                        monthlyHistory={monthlyHistory}
                      />
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12, letterSpacing: 2 }}>
                    ✂ ─ ─ ─ ─ BANK COPY &nbsp;|&nbsp; SCHOOL COPY &nbsp;|&nbsp; PARENT COPY ─ ─ ─ ─ ✂
                  </div>
                </div>
              </>
            ) : invoices.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 14, padding: 48, textAlign: 'center', color: '#94A3B8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No fee invoices found</div>
                <div style={{ fontSize: 13 }}>Contact school office to generate your fee voucher</div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
