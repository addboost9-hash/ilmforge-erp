/**
 * A student's complete record, in the order an office works through it:
 *
 *   Profile      every detail from the admission form; each block can be
 *                corrected (the full admission form, or a quick edit)
 *   Fees         the whole fee statement: every bill and every payment
 *                with its receipt, totals, and fee collection one click away
 *   Fee setup    this student's fee heads and discounts
 *   Attendance   the session month by month
 *   Results      each exam as its result card shows it, with class position
 *   Documents    certificates, the printed record, ID card
 *
 * Opened from the class list, it steps to the previous or next student of
 * that list and goes back to the same class.
 */
import { useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import EditStudentModal from '../../components/EditStudentModal';
import useAuthStore from '../../store/auth.store';
import { openServerDocument } from '../../utils/print';
import { compressPhoto } from '../../utils/photo';
import { feePeriod } from '../../utils/feeMonth';
import { printStudentRecord } from '../../utils/studentPrint';
// Fee amounts (invoices, fee heads, discounts) are stored in paisa: a Rs 2,500
// invoice is 250000. This page used to print the stored figure as rupees,
// a hundred times too large; money()/amount() divide by 100.
import { money, amount, fromPaisa, toPaisa, rupeesInput } from '../../utils/currency';
import toast from 'react-hot-toast';
import { useWeeklyOff, offWords } from '../../utils/weeklyOff';
import {
  ArrowLeft, FileText, Printer, User, CreditCard, ClipboardList, Award, GraduationCap, Camera, Tag,
  Edit2, ChevronLeft, ChevronRight, ChevronDown, Receipt, CalendarDays, FolderOpen,
} from 'lucide-react';

const NAVY = '#1B2F6E';
const FEE_ROLES = ['admin', 'super_admin', 'principal', 'accountant'];
const EDIT_ROLES = ['admin', 'super_admin', 'principal'];

/* ── Fee Details Panel ── */
function FeeDetailsPanel({ studentId }) {
  const qc = useQueryClient();

  const { data: feeData, isLoading } = useQuery({
    queryKey: ['student-fee-details', studentId],
    queryFn: () => api.get(`/fees/student-fee-details/${studentId}`).then(r => r.data.data),
    staleTime: 30000,
  });

  const [heads, setHeads] = useState(null);
  const [comments, setComments] = useState('');
  const [initiated, setInitiated] = useState(false);

  // Sync local state when data loads
  if (feeData && !initiated) {
    setHeads((feeData.feeStructure?.heads || []).map(h => ({ ...h })));
    setComments(feeData.comments || '');
    setInitiated(true);
  }

  const mutation = useMutation({
    mutationFn: (payload) => api.put(`/fees/student-discount/${studentId}`, payload),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Discounts applied!');
      qc.invalidateQueries(['student-fee-details', studentId]);
      qc.invalidateQueries(['student', studentId]);
    },
    onError: () => toast.error('Failed to apply discounts'),
  });

  // The office types rupees; the heads and the saved discount are paisa.
  const handleDiscountChange = (idx, val) => {
    setHeads(prev => prev.map((h, i) => {
      if (i !== idx) return h;
      const disc = Math.max(0, toPaisa(val));
      return { ...h, discount: disc, netAmount: Math.max(0, h.amount - disc) };
    }));
  };

  const handleApply = () => {
    if (!heads) return;
    mutation.mutate({ heads: heads.map(h => ({ name: h.name, discount: h.discount })), comments });
  };

  const totalFee      = (heads || []).reduce((s, h) => s + h.amount, 0);
  const discountTotal = (heads || []).reduce((s, h) => s + (h.discount || 0), 0);
  const netTotal      = (heads || []).reduce((s, h) => s + h.netAmount, 0);

  const inpStyle = { width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13, boxSizing: 'border-box' };
  const thStyle  = { padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 12, background: NAVY, color: '#fff' };
  const tdStyle  = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0' };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading fee details…</div>;

  return (
    <div>
      <h3 style={{ color: NAVY, marginBottom: 16, fontWeight: 700, fontSize: 15 }}>Fee Structure &amp; Discounts</h3>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Fee Head', 'Amount (Rs.)', 'Discount (Rs.)', 'Net Amount (Rs.)'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(heads || []).map((h, i) => (
              <tr key={h.name} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{h.name}</td>
                <td style={tdStyle}>{amount(h.amount)}</td>
                <td style={{ ...tdStyle, width: 140 }}>
                  <input
                    type="number"
                    min="0"
                    max={fromPaisa(h.amount)}
                    style={inpStyle}
                    value={rupeesInput(h.discount)}
                    onChange={e => handleDiscountChange(i, e.target.value)}
                  />
                </td>
                <td style={{ ...tdStyle, fontWeight: 700, color: h.netAmount < h.amount ? '#059669' : '#1F2937' }}>
                  {amount(h.netAmount)}
                </td>
              </tr>
            ))}
            {(!heads || heads.length === 0) && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: '#9CA3AF' }}>No fee structure found for this student's class.</td></tr>
            )}
          </tbody>
          {heads && heads.length > 0 && (
            <tfoot>
              <tr style={{ background: '#EEF2FF', fontWeight: 700 }}>
                <td style={{ ...tdStyle, color: NAVY }}>TOTAL</td>
                <td style={{ ...tdStyle, color: NAVY }}>{amount(totalFee)}</td>
                <td style={{ ...tdStyle, color: '#DC2626' }}>−{amount(discountTotal)}</td>
                <td style={{ ...tdStyle, color: '#059669', fontSize: 14 }}>{amount(netTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="fee-discount-comments" style={{ fontWeight: 600, fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Comments</label>
        <textarea
          id="fee-discount-comments"
          rows={3}
          style={{ ...inpStyle, resize: 'vertical' }}
          placeholder="Reason for discount or additional notes…"
          value={comments}
          onChange={e => setComments(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleApply}
          disabled={mutation.isPending || !heads || heads.length === 0}
          style={{
            background: NAVY, color: '#fff', border: 'none', borderRadius: 6,
            padding: '9px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending ? 'Applying…' : 'Apply Discounts'}
        </button>
      </div>
    </div>
  );
}

/* The edit form is shared with the student list and the import results:
   components/EditStudentModal.jsx */

/* A titled list of label/value rows. A row marked `always` shows "—" when
   empty; the others only show once filled in, and an empty block is hidden. */
function InfoBlock({ title, rows, onEdit }) {
  const shown = rows.filter(([, v, always]) => always || (v !== null && v !== undefined && v !== '' && v !== false));
  if (!shown.length) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
        {onEdit && <button type="button" onClick={onEdit} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>Correct details</button>}
      </h3>
      {shown.map(([l, v]) => (
        <div key={l} className="info-row">
          <span className="info-label">{l}</span>
          <span className="info-value">{v || '—'}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Generate & print certificate HTML ──────────────────── */
function printCert(type, s, school) {
  const sName = school?.name || 'IlmForge School';
  const addr  = school?.address || 'Islamabad, Pakistan';
  const phone = school?.phone || '';
  const date  = new Date().toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' });
  const dob   = s.dob ? new Date(s.dob).toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' }) : '_______________';
  const logo  = typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : null;
  const cls   = s.class?.name || '___';

  const logoHtml = logo
    ? `<img src="${logo}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" />`
    : `<div style="width:60px;height:60px;background:#0F766E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:26px;">🎓</div>`;
  const watermarkHtml = `
    <div class="doc-watermark">
      ${logo ? `<img src="${logo}" alt="Watermark"/>` : ''}
      <span>${sName}</span>
    </div>`;

  const header = `
    <div style="display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid #0F766E;margin-bottom:18px;">
      ${logoHtml}
      <div>
        <h1 style="font-size:20px;font-weight:900;color:#0F4C45;margin:0 0 3px;">${sName}</h1>
        <p style="margin:0;color:#6B7280;font-size:11px;">${addr}${phone?' · '+phone:''}</p>
      </div>
    </div>`;

  const sig = `
    <div style="display:flex;justify-content:space-between;margin-top:52px;padding-top:14px;border-top:1px dashed #CBD5E1;">
      <div style="text-align:center;"><div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div><p style="font-size:11px;color:#374151;margin:0;">Class Teacher</p></div>
      <div style="text-align:center;"><p style="font-size:11px;color:#9CA3AF;margin-bottom:5px;">Date: ${date}</p></div>
      <div style="text-align:center;"><div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div><p style="font-size:11px;color:#374151;margin:0;">Principal</p></div>
    </div>
    <p style="font-size:10px;color:#9CA3AF;text-align:center;margin-top:14px;">Computer generated · ${sName} · ${new Date().getFullYear()}</p>`;

  const bodies = {
    slc: `
      <h2 style="text-align:center;font-size:17px;font-weight:800;color:#0F766E;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid #0F766E;background:#F0FDFA;">
        SCHOOL LEAVING CERTIFICATE
      </h2>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:12px;">
        This is to certify that <strong style="color:#0F4C45;">${s.name}</strong>,
        Son/Daughter of <strong>${s.fatherName||'_______________'}</strong>,
        bearing Roll No. <strong style="color:#0F766E;">${s.rollNo||'___'}</strong>,
        was a student of <strong>Class ${cls}</strong>
        at this institution. He/She has successfully completed studies and is leaving on <strong>${date}</strong>.
      </p>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;">
        His/Her conduct during the stay was <strong>Good &amp; Satisfactory</strong>. We wish the best in future endeavors.
      </p>`,
    character: `
      <h2 style="text-align:center;font-size:17px;font-weight:800;color:#7C3AED;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid #7C3AED;background:#F5F3FF;">
        CHARACTER CERTIFICATE
      </h2>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:12px;">
        This is to certify that <strong style="color:#4C1D95;">${s.name}</strong>,
        Son/Daughter of <strong>${s.fatherName||'_______________'}</strong>,
        Roll No. <strong>${s.rollNo||'___'}</strong>, Class <strong>${cls}</strong>,
        has been a student of this institution.
      </p>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;">
        His/Her character and conduct were found to be <strong>Good / Excellent</strong>. He/She is an honest and hardworking individual who always followed school rules. This certificate is issued on request for bonafide purposes.
      </p>`,
    dob: `
      <h2 style="text-align:center;font-size:17px;font-weight:800;color:#2563EB;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid #2563EB;background:#EFF6FF;">
        DATE OF BIRTH CERTIFICATE
      </h2>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:16px;">
        This is to certify that according to school records, the Date of Birth of
        <strong style="color:#1E3A8A;">${s.name}</strong>,
        Son/Daughter of <strong>${s.fatherName||'_______________'}</strong>,
        Roll No. <strong>${s.rollNo||'___'}</strong>, Class <strong>${cls}</strong>, is:
      </p>
      <div style="text-align:center;margin:18px 0;padding:14px;border:2px solid #2563EB;border-radius:8px;background:#EFF6FF;">
        <span style="font-size:20px;font-weight:900;color:#1D4ED8;letter-spacing:1px;">${dob}</span>
      </div>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;">This certificate is issued for official and academic purposes only.</p>`,
  };

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${type} — ${s.name}</title>
  <style>
    body{background:#F8FAFC;padding:32px;font-family:Georgia,serif;position:relative;}
    .doc-watermark{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:0}
    .doc-watermark img{width:170px;height:170px;object-fit:cover;border-radius:20px;filter:grayscale(.1);opacity:.07}
    .doc-watermark span{margin-top:10px;font-size:30px;letter-spacing:1px;font-weight:900;color:#0F172A;text-transform:uppercase;opacity:.055}
    .doc-content{position:relative;z-index:1}
    @media print{body{background:#fff;padding:12px;}.no-print{display:none!important;}}
  </style>
  </head><body>
    ${watermarkHtml}
    <div class="doc-content">
    <div class="no-print" style="text-align:right;margin-bottom:14px;">
      <button onclick="window.print()" style="background:#0F766E;color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">🖨 Print Certificate</button>
    </div>
    <div style="max-width:720px;margin:0 auto;padding:40px;border:3px double #0F766E;border-radius:4px;font-family:Georgia,serif;background:#fff;">
      ${header}
      ${bodies[type] || '<p>Template not found</p>'}
      ${sig}
    </div>
    </div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    // A message on the page, not a browser alert; and no fixed web address,
    // which was wrong for schools running IlmForge on their own computer.
    toast.error('Pop-up blocked. Allow pop-ups for this site to print certificates.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

const day = (d) => (d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/* ── Fee statement: every bill, every payment ── */
function FeeStatement({ studentId, fees, isLoading }) {
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const invoices = fees?.invoices || [];
  const shown = invoices.filter((i) => filter === 'all' || (filter === 'unpaid' ? i.dueAmount > 0 : i.dueAmount <= 0));
  const sum = (k) => invoices.reduce((a, i) => a + (i[k] || 0), 0);
  const statusBadge = (st) => (st === 'paid' ? 'badge-green' : st === 'partial' ? 'badge-amber' : st === 'cancelled' || st === 'void' ? 'badge-gray' : 'badge-red');
  const openDoc = (path, title) => openServerDocument(path, { title }).catch(() => toast.error('It could not be opened. Try again.'));

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading the fee statement…</div>;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Billed', money(sum('totalAmount')), '#1E3A5F'],
          ['Discount', money(sum('discount')), '#0D9488'],
          ['Paid', money(sum('paidAmount')), '#15803D'],
          ['Outstanding', money(sum('dueAmount')), sum('dueAmount') > 0 ? '#DC2626' : '#15803D'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {[['all', `All bills (${invoices.length})`], ['unpaid', `Unpaid (${invoices.filter((i) => i.dueAmount > 0).length})`], ['paid', 'Paid']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`btn btn-sm ${filter === k ? 'btn-teal' : 'btn-outline'}`}>{l}</button>
        ))}
        <Link to={`/fees/collect?student=${studentId}`} className="btn btn-teal btn-sm" style={{ marginLeft: 'auto' }}><CreditCard size={13} /> Collect fee</Link>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>{['Month', 'Fee', 'Amount', 'Discount', 'Paid', 'Due', 'Status', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((inv) => {
              const pays = inv.payments || [];
              const isOpen = openId === inv.id;
              return [
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{feePeriod(inv) || '—'}</td>
                  <td>{inv.feeTitle || 'Fee'}</td>
                  <td>{money(inv.totalAmount)}</td>
                  <td style={{ color: '#0D9488' }}>{inv.discount ? money(inv.discount) : '—'}</td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>{money(inv.paidAmount)}</td>
                  <td style={{ color: inv.dueAmount > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>{money(inv.dueAmount)}</td>
                  <td><span className={`badge ${statusBadge(inv.status)}`}>{inv.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className="btn btn-sm btn-outline btn-icon" title="Print the fee voucher" aria-label={`Print voucher for ${feePeriod(inv) || inv.feeTitle}`} onClick={() => openDoc(`/pdf/voucher/${inv.id}`, 'Fee voucher')}><Printer size={12} /></button>
                    {pays.length > 0 && (
                      <button type="button" className="btn btn-sm btn-outline" style={{ marginLeft: 6 }} aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : inv.id)}>
                        <Receipt size={12} /> {pays.length} payment{pays.length === 1 ? '' : 's'} <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                      </button>
                    )}
                  </td>
                </tr>,
                isOpen && (
                  <tr key={`${inv.id}-p`}>
                    <td colSpan={8} style={{ background: '#F8FAFC', padding: '6px 14px 12px' }}>
                      <table style={{ width: '100%', fontSize: 12.5 }}>
                        <thead><tr style={{ color: '#64748B', textAlign: 'left' }}><th style={{ padding: 6 }}>Paid on</th><th style={{ padding: 6 }}>Receipt</th><th style={{ padding: 6 }}>Method</th><th style={{ padding: 6 }}>Amount</th><th style={{ padding: 6 }}>Note</th><th /></tr></thead>
                        <tbody>
                          {pays.map((p) => (
                            <tr key={p.id} style={{ borderTop: '1px solid #E2E8F0', opacity: p.voidedAt ? 0.55 : 1 }}>
                              <td style={{ padding: 6 }}>{day(p.paymentDate)}</td>
                              <td style={{ padding: 6, fontFamily: 'monospace' }}>{p.receiptNo || `#${p.id}`}</td>
                              <td style={{ padding: 6, textTransform: 'capitalize' }}>{p.method}</td>
                              <td style={{ padding: 6, fontWeight: 700, textDecoration: p.voidedAt ? 'line-through' : 'none' }}>{money(p.amountPaid)}</td>
                              <td style={{ padding: 6, color: '#64748B' }}>{p.voidedAt ? `Cancelled: ${p.voidReason || ''}` : p.remarks || ''}</td>
                              <td style={{ padding: 6, textAlign: 'right' }}>
                                {!p.voidedAt && <button type="button" className="btn btn-sm btn-outline" onClick={() => openDoc(`/pdf/receipt/${p.id}`, 'Fee receipt')}><Printer size={11} /> Receipt</button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ),
              ];
            })}
            {!shown.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#9CA3AF' }}>{invoices.length ? 'No bills in this list.' : 'No fee bills yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Attendance, month by month ── */
const ATT = {
  present: { l: 'P', bg: '#DCFCE7', fg: '#15803D', name: 'Present' },
  late:    { l: 'T', bg: '#FEF9C3', fg: '#A16207', name: 'Late' },
  absent:  { l: 'A', bg: '#FEE2E2', fg: '#B91C1C', name: 'Absent' },
  leave:   { l: 'L', bg: '#DBEAFE', fg: '#1D4ED8', name: 'Leave' },
};
function AttendancePanel({ data, isLoading, sessionId, onSession, error }) {
  const weeklyOff = useWeeklyOff();
  // Each month: the student's marks, and its school days (the days the class
  // was marked since the student joined; a school day with no mark is "–").
  const months = useMemo(() => {
    const m = new Map();
    const month = (y, mo) => {
      const key = `${y}-${String(mo + 1).padStart(2, '0')}`;
      if (!m.has(key)) m.set(key, { key, year: y, month: mo, days: {}, school: new Set() });
      return m.get(key);
    };
    for (const r of data?.records || []) {
      const d = new Date(r.date);
      const x = month(d.getFullYear(), d.getMonth());
      x.days[d.getDate()] = r;
      x.school.add(d.getDate());
    }
    for (const k of data?.schoolDays || []) month(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1).school.add(Number(k.slice(8, 10)));
    return [...m.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [data]);

  if (error) return <p style={{ padding: 24, color: '#9CA3AF', textAlign: 'center' }}>{error}</p>;
  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading attendance…</div>;
  const s = data?.summary || {};
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#475569' }}>
          {data?.range?.sessionName ? <>Session <b>{data.range.sessionName}</b></> : 'This academic year'} · {day(data?.range?.from)} to {day(data?.range?.to)}
        </div>
        {(data?.sessions || []).length > 1 && (
          <select aria-label="Session" value={sessionId || ''} onChange={(e) => onSession(e.target.value)} style={{ marginLeft: 'auto', padding: '5px 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 12.5 }}>
            <option value="">Current session</option>
            {data.sessions.map((x) => <option key={x.id} value={x.id}>{x.name}{x.isActive ? ' (current)' : ''}</option>)}
          </select>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          ['Attended', `${s.percentage ?? 0}%`, (s.percentage ?? 0) >= 75 ? '#15803D' : '#DC2626'],
          ['Present', s.present ?? 0, '#15803D'], ['Late', s.late ?? 0, '#A16207'],
          ['Absent', s.absent ?? 0, '#B91C1C'], ['Leave', s.leave ?? 0, '#1D4ED8'],
          ...(s.notMarked ? [['Not marked', s.notMarked, '#B45309']] : []), ['School days', s.total ?? 0, '#1E3A5F'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{l}</div>
          </div>
        ))}
      </div>
      {!months.length && <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 16 }}>No attendance marked in this period yet.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {months.map((m) => {
          const recs = Object.values(m.days);
          const att = recs.filter((r) => r.status === 'present' || r.status === 'late').length;
          const n = new Date(m.year, m.month + 1, 0).getDate();
          return (
            <div key={m.key} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <b style={{ color: NAVY, fontSize: 13.5 }}>{new Date(m.year, m.month, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</b>
                <span style={{ fontSize: 12, color: '#64748B' }}>{att}/{m.school.size} school days attended · {m.school.size ? Math.round((att / m.school.size) * 100) : 0}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(26px,1fr))', gap: 4 }}>
                {Array.from({ length: n }, (_, i) => i + 1).map((d) => {
                  const r = m.days[d];
                  const st = r && ATT[r.status];
                  const weekday = new Date(m.year, m.month, d).getDay();
                  const missing = !r && m.school.has(d);
                  return (
                    <div key={d} title={r ? `${d} ${new Date(m.year, m.month, d).toLocaleDateString('en-PK', { month: 'short' })}: ${st?.name || r.status}${r.remarks ? ` — ${r.remarks}` : ''}` : missing ? `${d}: not marked (the class was marked)` : `${d}: not marked`}
                      style={{ height: 30, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, lineHeight: 1.1,
                        background: st ? st.bg : missing ? '#FFFBEB' : weeklyOff.includes(weekday) ? '#F1F5F9' : '#fff', color: st ? st.fg : missing ? '#B45309' : '#CBD5E1', border: `1px solid ${st ? st.bg : missing ? '#FDE68A' : '#EEF2F6'}` }}>
                      <span>{d}<br />{st ? st.l : missing ? '–' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 11.5, color: '#64748B' }}>
        {Object.values(ATT).map((a) => <span key={a.l}><b style={{ background: a.bg, color: a.fg, padding: '1px 6px', borderRadius: 4 }}>{a.l}</b> {a.name}</span>)}
        <span><b style={{ background: '#FFFBEB', color: '#B45309', padding: '1px 6px', borderRadius: 4 }}>–</b> not marked (the class was marked)</span>
        <span>Grey: weekly off ({offWords(weeklyOff)})</span>
      </div>
    </div>
  );
}

/* ── Results: each exam as its result card shows it ── */
function ResultsPanel({ results, isLoading }) {
  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>Loading results…</div>;
  const exams = results?.exams || [];
  if (!exams.length) {
    return (
      <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
        <GraduationCap size={40} style={{ margin: '0 auto', color: '#CBD5E1' }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 8 }}>No exam results yet</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>Results appear here once marks are entered in the Exam Vault.</div>
        <Link to="/examination" className="btn btn-teal btn-sm" style={{ marginTop: 14 }}>Open the Exam Vault</Link>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {exams.map((e) => {
        const c = e.passed ? '#15803D' : '#DC2626';
        return (
          <div key={e.examId} style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ marginRight: 'auto' }}>
                <div style={{ fontWeight: 800, color: NAVY, fontSize: 14.5 }}>{e.title}</div>
                <div style={{ fontSize: 11.5, color: '#64748B' }}>{e.dateStart ? day(e.dateStart) : ''}{!e.published && ' · not published to parents yet'}</div>
              </div>
              {[
                ['Marks', `${e.totalObtained}/${e.totalMarks}`], ['Percentage', `${e.percentage}%`], ['Grade', e.grade],
                ['Division', e.division], ['Position', `${e.position} of ${e.classSize}`],
              ].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center', minWidth: 64 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</div>
                </div>
              ))}
              <span style={{ background: `${c}15`, color: c, fontWeight: 800, fontSize: 12, padding: '4px 12px', borderRadius: 99 }}>{e.passed ? 'PASS' : 'FAIL'}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ color: '#64748B', fontSize: 11.5, textAlign: 'left' }}><th style={{ padding: '7px 16px' }}>Subject</th><th style={{ padding: 7 }}>Marks</th><th style={{ padding: 7 }}>%</th><th style={{ padding: 7 }}>Grade</th></tr></thead>
              <tbody>
                {e.subjects.map((x) => (
                  <tr key={x.name} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '7px 16px', fontWeight: 600 }}>{x.name}</td>
                    <td style={{ padding: 7, fontVariantNumeric: 'tabular-nums' }}>{x.absent ? <span style={{ color: '#DC2626', fontWeight: 700 }}>Absent</span> : `${x.obtained}/${x.total}`}</td>
                    <td style={{ padding: 7 }}>{x.absent || !x.total ? '—' : `${Math.round((x.obtained / x.total) * 100)}%`}</td>
                    <td style={{ padding: 7 }}><b style={{ color: x.grade === 'F' ? '#DC2626' : '#15803D' }}>{x.grade}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((st) => st.user?.role);
  const school = useAuthStore((st) => st.school);
  const showFees = FEE_ROLES.includes(role);
  const canEdit = EDIT_ROLES.includes(role);
  const [tab, setTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [sessionId, setSessionId] = useState('');

  // Where the user came from (a class list) and the students in it.
  const from = location.state?.from || '/students';
  const list = location.state?.list || null;
  const idx = list ? list.indexOf(parseInt(id, 10)) : -1;
  const go = (sid) => navigate(`/students/${sid}`, { state: location.state });

  const { data: s, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get('/students/' + id).then((r) => r.data.data),
  });
  const { data: fees, isLoading: feesLoading } = useQuery({
    queryKey: ['student-fee', Number(id)],
    queryFn: () => api.get('/fees/student/' + id).then((r) => r.data.data),
    enabled: showFees,
  });
  const att = useQuery({
    queryKey: ['student-attendance-history', id, sessionId],
    queryFn: () => api.get(`/attendance/student/${id}/history`, { params: { sessionId: sessionId || undefined } }).then((r) => r.data),
    retry: false,
  });
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['student-exam-results', id],
    queryFn: () => api.get(`/students/${id}/exam-results`).then((r) => r.data).catch(() => ({ data: [], exams: [] })),
    staleTime: 60_000,
  });

  /* The photo lives on the student record. Older versions kept it only in
     the browser that did the admission, so check there too and offer to
     move it onto the record. */
  const savedPhoto = (() => {
    try { return localStorage.getItem(`photo_student_${id}`); } catch { return null; }
  })();
  const qcProfile = useQueryClient();
  const photoInput = useRef(null);
  const savePhoto = useMutation({
    mutationFn: async (src) => api.put('/students/' + id, { photoUrl: src ? await compressPhoto(src) : null }),
    onSuccess: (_r, src) => {
      try { localStorage.removeItem(`photo_student_${id}`); } catch { /* storage blocked */ }
      qcProfile.invalidateQueries({ queryKey: ['student', id] });
      toast.success(src ? 'Photo saved. It now appears on ID cards and certificates.' : 'Photo removed');
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'The photo could not be saved.'),
  });

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!s) return <div className="page-content"><div className="card" style={{ textAlign: 'center', padding: 40 }}>Student not found. <Link to={from}>Back to the list</Link></div></div>;

  const invoices = fees?.invoices || [];
  const totalPaid = invoices.reduce((a, i) => a + (i.paidAmount || 0), 0);
  const totalDue = invoices.reduce((a, i) => a + (i.dueAmount || 0), 0);
  const lastPay = invoices.flatMap((i) => i.payments || []).filter((p) => !p.voidedAt)
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
  const attSum = att.data?.summary;
  const latest = results?.exams?.[0];

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    ...(showFees ? [{ id: 'fees', label: 'Fees', icon: CreditCard, badge: totalDue > 0 ? money(totalDue) : null }, { id: 'feesetup', label: 'Fee setup', icon: Tag }] : []),
    { id: 'attendance', label: 'Attendance', icon: CalendarDays },
    { id: 'results', label: 'Results', icon: GraduationCap },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
  ];
  const certTypes = [
    { type: 'slc', label: 'School Leaving Certificate', color: '#0F766E', bg: '#F0FDFA' },
    { type: 'character', label: 'Character Certificate', color: '#7C3AED', bg: '#F5F3FF' },
    { type: 'dob', label: 'Date of Birth Certificate', color: '#2563EB', bg: '#EFF6FF' },
  ];
  const printRecord = () => {
    if (!printStudentRecord({ school, student: s, fees: showFees ? fees : null, attendance: att.data, exams: results?.exams })) {
      toast.error('Printing was blocked. Allow pop-ups for IlmForge and try again.');
    }
  };
  const editFull = () => navigate(`/students/${s.id}/edit`);

  return (
    <div className="page-content fade-up">
      {/* Header: back to the list, step through it, the main actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => navigate(from)} className="btn btn-outline btn-sm"><ArrowLeft size={14} /> {location.state?.listTitle || 'Students'}</button>
        {list && idx >= 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" className="btn btn-outline btn-sm btn-icon" disabled={idx <= 0} onClick={() => go(list[idx - 1])} aria-label="Previous student"><ChevronLeft size={15} /></button>
            <span style={{ fontSize: 12, color: '#64748B', minWidth: 54, textAlign: 'center' }}>{idx + 1} of {list.length}</span>
            <button type="button" className="btn btn-outline btn-sm btn-icon" disabled={idx >= list.length - 1} onClick={() => go(list[idx + 1])} aria-label="Next student"><ChevronRight size={15} /></button>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canEdit && <button type="button" onClick={editFull} className="btn btn-teal btn-sm"><Edit2 size={14} /> Edit record</button>}
          {canEdit && <button type="button" onClick={() => setEditing(true)} className="btn btn-outline btn-sm" title="Correct a few details in a pop-up">Quick edit</button>}
          {showFees && <Link to={`/fees/collect?student=${s.id}`} className="btn btn-outline btn-sm"><CreditCard size={14} /> Collect fee</Link>}
          <button type="button" onClick={printRecord} className="btn btn-outline btn-sm"><Printer size={14} /> Print record</button>
        </div>
      </div>

      {/* Profile hero card */}
      <div style={{
        background: 'linear-gradient(135deg,#1B2F6E,#0073b7)', borderRadius: 20, padding: '22px 26px', marginBottom: 18,
        color: 'white', display: 'flex', gap: 20, alignItems: 'center', boxShadow: '0 8px 32px rgba(27,47,110,0.25)', flexWrap: 'wrap',
      }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {(s.photoUrl || savedPhoto)
            ? <img src={s.photoUrl || savedPhoto} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <User size={38} color="rgba(255,255,255,0.8)" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 800 }}>{[s.name, s.lastName].filter(Boolean).join(' ')}</h1>
          <div style={{ opacity: 0.88, fontSize: 13 }}>
            Roll no <b>{s.rollNo || '—'}</b>{s.fatherName && <> · {s.gender === 'Female' || s.gender === 'female' ? 'D/o' : 'S/o'} {s.fatherName}</>}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
              {s.class?.name || 'No class'}{s.section?.name ? ` – ${s.section.name}` : ''}
            </span>
            <span style={{ background: s.status === 'active' ? 'rgba(134,239,172,0.3)' : 'rgba(254,202,202,0.3)', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }}>
              {s.status === 'active' ? 'Studying' : s.status}
            </span>
            {s.admissionDate && <span style={{ background: 'rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: 999, fontSize: 11.5 }}>Admitted {day(s.admissionDate)}</span>}
          </div>
          {canEdit && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input ref={photoInput} type="file" accept="image/*" aria-label="Student photo" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) savePhoto.mutate(f); e.target.value = ''; }} />
              <button type="button" onClick={() => photoInput.current?.click()} disabled={savePhoto.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}>
                <Camera size={12} /> {savePhoto.isPending ? 'Saving…' : s.photoUrl ? 'Change photo' : 'Add photo'}
              </button>
              {s.photoUrl && (
                <button type="button" onClick={() => savePhoto.mutate(null)} disabled={savePhoto.isPending}
                  style={{ fontSize: 11.5, padding: '4px 8px', borderRadius: 999, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Remove</button>
              )}
              {!s.photoUrl && savedPhoto && (
                <button type="button" onClick={() => savePhoto.mutate(savedPhoto)} disabled={savePhoto.isPending}
                  style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: 'none', background: '#F2A33A', color: '#16211E', cursor: 'pointer' }}>
                  This photo is only on this computer: save it to the record
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Attendance', val: attSum?.total ? `${attSum.percentage}%` : '—', sub: attSum?.total ? `${attSum.attended ?? attSum.present}/${attSum.total} days` : 'not marked yet', tab: 'attendance' },
            ...(showFees ? [
              { label: 'Fee paid', val: money(totalPaid), sub: lastPay ? `last ${day(lastPay.paymentDate)}` : totalPaid > 0 ? 'as on the bills' : 'no payment yet', tab: 'fees' },
              { label: 'Outstanding', val: money(totalDue), sub: totalDue > 0 ? 'to collect' : 'all clear', tab: 'fees' },
            ] : []),
            { label: 'Latest result', val: latest ? `${latest.percentage}%` : '—', sub: latest ? `${latest.grade} · ${latest.title}` : 'no results yet', tab: 'results' },
          ].map((m) => (
            <button key={m.label} type="button" onClick={() => setTab(m.tab)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 12, padding: '9px 14px', textAlign: 'center', minWidth: 104, cursor: 'pointer' }}>
              <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{m.val}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>{m.label}</div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0 }}>
        <div className="tab-list" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon size={14} /> {t.label}
                {t.badge && <span style={{ background: '#FEE2E2', color: '#B91C1C', fontSize: 10.5, fontWeight: 800, borderRadius: 99, padding: '1px 7px' }}>{t.badge}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 20 }}>
          {tab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
              {/* Everything from the admission form. Optional details show
                  once filled in; each block opens the form to correct it. */}
              <div>
                <InfoBlock title="Student Details" onEdit={canEdit ? editFull : null} rows={[
                  ['Full Name',       [s.name, s.lastName].filter(Boolean).join(' '), true],
                  ['Name (Urdu)',     [s.firstNameUrdu, s.lastNameUrdu].filter(Boolean).join(' ')],
                  ['Roll Number',     s.rollNo, true],
                  ['Gender',          s.gender, true],
                  ['Date of Birth',   s.dob && new Date(s.dob).toLocaleDateString('en-PK'), true],
                  ['Class',           s.class?.name, true],
                  ['Section',         s.section?.name, true],
                  ['Session',         s.session?.name],
                  ['Admission Date',  s.admissionDate && new Date(s.admissionDate).toLocaleDateString('en-PK'), true],
                  ['Family No.',      s.familyNo],
                  ['B-Form / CNIC',   s.bFormNo, true],
                  ['Religion',        s.religion],
                  ['Caste',           s.caste],
                  ['Nationality',     s.nationality],
                  ['Admission Test',  s.admissionTestMarks != null && String(s.admissionTestMarks)],
                  ['Free Student',    s.isFreeStudent && 'Yes (no fee)'],
                  ['Status',          s.status, true],
                ]} />
                <InfoBlock title="Previous School" onEdit={canEdit ? editFull : null} rows={[
                  ['School',          s.prevSchoolName],
                  ['Contact Person',  s.prevSchoolFocalPerson],
                  ['Phone',           s.prevSchoolPhone],
                  ['Admission No.',   s.prevAdmissionNo],
                  ['Last Class',      s.prevGrade],
                  ['Grade / Result',  s.prevTestGrade],
                  ['Address',         s.prevSchoolAddress],
                ]} />
                <InfoBlock title="Health" onEdit={canEdit ? editFull : null} rows={[
                  ['Blood Group',     s.bloodGroup],
                  ['Allergies',       s.allergies],
                  ['Food / Diet',     s.foodDietaryReq],
                  ['Condition',       s.childCondition],
                ]} />
              </div>
              <div>
                <InfoBlock title="Family Details" onEdit={canEdit ? editFull : null} rows={[
                  ['Father Name',     s.fatherName, true],
                  ['Father (Urdu)',   s.fatherNameUrdu],
                  ['Father CNIC',     s.fatherCnic],
                  ['Father Qualification', s.fatherQualification],
                  ['Father Occupation', s.fatherOccupation],
                  ['Mother Name',     s.motherName, true],
                  ['Mother CNIC',     s.motherCnic],
                  ['Mother Qualification', s.motherQualification],
                  ['Mother Occupation', s.motherOccupation],
                  ['Mother Mobile',   s.motherPhone],
                ]} />
                <InfoBlock title="Contact & Address" onEdit={canEdit ? editFull : null} rows={[
                  ['Parent Phone',    s.emergencyPhone, true],
                  ['Parent Email',    s.parentInfo?.email],
                  ['Student Email',   s.email],
                  ['City',            [s.city, s.province].filter(Boolean).join(', ')],
                  ['Postal Address',  s.postalAddress],
                  ['Address',         s.address, true],
                ]} />
              </div>
            </div>
          )}

          {tab === 'fees' && showFees && <FeeStatement studentId={s.id} fees={fees} isLoading={feesLoading} />}
          {tab === 'feesetup' && showFees && <FeeDetailsPanel studentId={id} />}
          {tab === 'attendance' && (
            <AttendancePanel data={att.data} isLoading={att.isLoading} sessionId={sessionId} onSession={setSessionId}
              error={att.error ? (att.error.response?.data?.message || 'Attendance could not be loaded.') : null} />
          )}
          {tab === 'results' && <ResultsPanel results={results} isLoading={resultsLoading} />}

          {tab === 'documents' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>The student's record</h3>
                <button type="button" onClick={printRecord} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <Printer size={13} /> Print the complete record (details, fees, attendance, results)
                </button>
                <Link to="/id-cards" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 8, marginBottom: 8 }}><Award size={13} /> ID card</Link>
                <Link to="/admissions/form-print" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}><ClipboardList size={13} /> Admission form</Link>
              </div>
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Certificates</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {certTypes.map(({ type, label, color, bg }) => (
                    <button key={type} type="button" onClick={() => printCert(type, s, school)} className="btn btn-outline btn-sm"
                      style={{ justifyContent: 'flex-start', gap: 8, background: bg, borderColor: color + '30', color, fontWeight: 600 }}>
                      <FileText size={13} color={color} /> {label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8, lineHeight: 1.5 }}>
                  More certificates and their register: <Link to="/certificates" style={{ color: '#0F766E' }}>Certificates</Link>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && <EditStudentModal student={s} onClose={() => setEditing(false)} />}
    </div>
  );
}
