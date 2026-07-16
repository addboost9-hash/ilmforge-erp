import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  ArrowLeft, FileText, Printer, User, CreditCard,
  ClipboardList, Award, GraduationCap, Camera, Tag
} from 'lucide-react';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();
const NAVY = '#1B2F6E';

const TABS = [
  { id:'info',        label:'📋 Personal Info',  icon:User          },
  { id:'fees',        label:'💰 Fee History',    icon:CreditCard    },
  { id:'feedetails',  label:'🏷️ Fee Details',    icon:Tag           },
  { id:'attendance',  label:'📅 Attendance',     icon:ClipboardList },
  { id:'exams',       label:'🏆 Exam Results',   icon:GraduationCap },
];

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

  const handleDiscountChange = (idx, val) => {
    setHeads(prev => prev.map((h, i) => {
      if (i !== idx) return h;
      const disc = parseInt(val) || 0;
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
                <td style={tdStyle}>{(h.amount || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, width: 140 }}>
                  <input
                    type="number"
                    min="0"
                    max={h.amount}
                    style={inpStyle}
                    value={h.discount || 0}
                    onChange={e => handleDiscountChange(i, e.target.value)}
                  />
                </td>
                <td style={{ ...tdStyle, fontWeight: 700, color: h.netAmount < h.amount ? '#059669' : '#1F2937' }}>
                  {(h.netAmount || 0).toLocaleString()}
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
                <td style={{ ...tdStyle, color: NAVY }}>{totalFee.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: '#DC2626' }}>−{discountTotal.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: '#059669', fontSize: 14 }}>{netTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 600, fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Comments</label>
        <textarea
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
    alert('Please allow pop-ups for this site to print certificates.\n\nGo to: Browser Settings → Pop-ups → Allow ilmforge-erp.vercel.app');
    return;
  }
  win.document.write(html);
  win.document.close();
}

/* ════════════════════════════════════════════════════ */
export default function StudentProfilePage() {
  const { id } = useParams();
  const [tab, setTab] = useState('info');

  const { data:s, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get('/students/'+id).then(r => r.data.data),
  });
  const { data:school } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data),
  });

  /* Load photo from localStorage (saved during admission) */
  const savedPhoto = typeof window !== 'undefined'
    ? localStorage.getItem(`photo_student_${id}`)
    : null;

  if (isLoading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!s) return <div className="page-content"><div className="card" style={{textAlign:'center',padding:40}}>Student not found.</div></div>;

  const attCount   = (s.attendance||[]).length;
  const present    = (s.attendance||[]).filter(a=>a.status==='present').length;
  const attPct     = attCount ? ((present/attCount)*100).toFixed(0) : 0;
  const totalDue   = (s.feeInvoices||[]).reduce((sum,inv)=>sum+(inv.dueAmount||0),0);

  const certTypes = [
    { type:'slc',       label:'School Leaving Certificate', color:'#0F766E', bg:'#F0FDFA' },
    { type:'character', label:'Character Certificate',      color:'#7C3AED', bg:'#F5F3FF' },
    { type:'dob',       label:'Date of Birth Certificate',  color:'#2563EB', bg:'#EFF6FF' },
  ];

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <Link to="/students" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15}/></Link>
        <h1 className="page-title">{s.name}</h1>
        <span className={`badge ${s.status==='active'?'badge-teal':s.status==='passout'?'badge-gray':'badge-red'}`}>{s.status}</span>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <Link to="/fees/collect" className="btn btn-teal btn-sm"><CreditCard size={14}/> Collect Fee</Link>
          <Link to="/id-cards" className="btn btn-outline btn-sm"><Award size={14}/> ID Card</Link>
        </div>
      </div>

      {/* Profile hero card */}
      <div className="card" style={{marginBottom:16, background:'linear-gradient(135deg,#0F4C45,#0F766E)', color:'#fff'}}>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          {/* Photo area */}
          <div style={{
            width:80, height:80, borderRadius:14, overflow:'hidden', flexShrink:0,
            border:'3px solid rgba(255,255,255,0.3)',
            background: savedPhoto ? 'transparent' : (s.gender==='female'?'rgba(244,114,182,0.3)':'rgba(96,165,250,0.3)'),
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {savedPhoto
              ? <img src={savedPhoto} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontSize:30,fontWeight:900,color:'#fff'}}>{s.name?.charAt(0)}</span>
            }
          </div>

          <div style={{flex:1}}>
            <div style={{fontSize:20, fontWeight:800, marginBottom:4}}>{s.name}</div>
            <div style={{fontSize:13, opacity:0.8}}>
              Roll: <strong style={{fontFamily:'monospace',fontSize:14}}>{s.rollNo||'—'}</strong>
              {s.class?.name   && <> &nbsp;·&nbsp; <strong>{s.class.name}</strong></>}
              {s.section?.name && <> – <strong>{s.section.name}</strong></>}
              {s.fatherName    && <> &nbsp;·&nbsp; Father: <strong>{s.fatherName}</strong></>}
            </div>
            {!savedPhoto && (
              <div style={{marginTop:6,fontSize:11.5,color:'rgba(255,255,255,0.55)',display:'flex',alignItems:'center',gap:5}}>
                <Camera size={12}/>
                <span>No photo — <Link to="/admissions" style={{color:'rgba(255,255,255,0.75)'}}>upload when admitting</Link> or via ID Cards page</span>
              </div>
            )}
          </div>

          <div style={{display:'flex', gap:12}}>
            {[
              {label:'Attendance', val:attPct+'%',    color:attPct>=75?'#DCFCE7':'#FEE2E2', tc:attPct>=75?'#15803D':'#B91C1C'},
              {label:'Total Due',  val:money(totalDue), color:totalDue>0?'#FEF3C7':'#DCFCE7', tc:totalDue>0?'#B45309':'#15803D'},
            ].map(m => (
              <div key={m.label} style={{background:'rgba(255,255,255,0.12)',borderRadius:10,padding:'10px 16px',textAlign:'center'}}>
                <div style={{fontSize:16,fontWeight:800}}>{m.val}</div>
                <div style={{fontSize:11,opacity:0.7}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{padding:0}}>
        <div className="tab-list">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{padding:20}}>

          {/* ── Personal Info ── */}
          {tab==='info' && (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
              <div>
                <h3 style={{fontSize:12,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Student Details</h3>
                {[
                  ['Full Name',       s.name],
                  ['Roll Number',     s.rollNo||'—'],
                  ['Gender',          s.gender||'—'],
                  ['Date of Birth',   s.dob ? new Date(s.dob).toLocaleDateString('en-PK') : '—'],
                  ['Class',           s.class?.name||'—'],
                  ['Section',         s.section?.name||'—'],
                  ['Admission Date',  new Date(s.admissionDate||Date.now()).toLocaleDateString('en-PK')],
                  ['B-Form / CNIC',   s.bFormNo||'—'],
                  ['Status',          s.status],
                ].map(([l,v]) => (
                  <div key={l} className="info-row">
                    <span className="info-label">{l}</span>
                    <span className="info-value">{v}</span>
                  </div>
                ))}
              </div>

              <div>
                <h3 style={{fontSize:12,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Family Details</h3>
                {[
                  ['Father Name',     s.fatherName||'—'],
                  ['Mother Name',     s.motherName||'—'],
                  ['Emergency Phone', s.emergencyPhone||'—'],
                  ['Address',         s.address||'—'],
                ].map(([l,v]) => (
                  <div key={l} className="info-row">
                    <span className="info-label">{l}</span>
                    <span className="info-value">{v}</span>
                  </div>
                ))}

                {/* ── Certificates — now work with in-browser print ── */}
                <h3 style={{fontSize:12,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:1,margin:'20px 0 10px'}}>
                  Certificates
                </h3>
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {certTypes.map(({type, label, color, bg}) => (
                    <button
                      key={type}
                      onClick={() => printCert(type, s, school)}
                      className="btn btn-outline btn-sm"
                      style={{justifyContent:'flex-start', gap:8, background:bg, borderColor:color+'30', color:color, fontWeight:600}}
                    >
                      <FileText size={13} color={color}/> {label}
                    </button>
                  ))}
                </div>
                <p style={{fontSize:11,color:'#9CA3AF',marginTop:8,lineHeight:1.5}}>
                  💡 Allow pop-ups for certificates to open. Or go to <Link to="/certificates" style={{color:'#0F766E'}}>Certificates page →</Link>
                </p>
              </div>
            </div>
          )}

          {/* ── Fee History ── */}
          {tab==='fees' && (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontSize:13,color:'#6B7280'}}>
                  Total Due: <strong style={{color:'#DC2626'}}>{money(totalDue)}</strong>
                </div>
                <Link to="/fees/collect" className="btn btn-teal btn-sm"><CreditCard size={13}/> Collect Fee</Link>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr>
                    {['Fee Title','Month','Total','Discount','Paid','Due','Status','Voucher'].map(h=><th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(s.feeInvoices||[]).map(inv => (
                      <tr key={inv.id}>
                        <td style={{fontWeight:600}}>{inv.feeTitle}</td>
                        <td style={{color:'#6B7280'}}>{inv.month} {inv.year}</td>
                        <td>{money(inv.totalAmount)}</td>
                        <td style={{color:'#0D9488'}}>{money(inv.discount)}</td>
                        <td style={{color:'#059669',fontWeight:600}}>{money(inv.paidAmount)}</td>
                        <td style={{color:inv.dueAmount>0?'#DC2626':'#059669',fontWeight:700}}>{money(inv.dueAmount)}</td>
                        <td><span className={`badge ${inv.status==='paid'?'badge-green':inv.status==='partial'?'badge-amber':'badge-red'}`}>{inv.status}</span></td>
                        <td>
                          <a href={`/api/v1/pdf/voucher/${inv.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline btn-icon">
                            <Printer size={12}/>
                          </a>
                        </td>
                      </tr>
                    ))}
                    {(!s.feeInvoices||s.feeInvoices.length===0) && <tr><td colSpan={8} style={{textAlign:'center',padding:24,color:'#9CA3AF'}}>No fee records</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Fee Details ── */}
          {tab==='feedetails' && (
            <FeeDetailsPanel studentId={id} />
          )}

          {/* ── Attendance ── */}
          {tab==='attendance' && (
            <>
              <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
                {[
                  {l:'Total Days', v:attCount,  c:'#1E3A5F'},
                  {l:'Present',    v:present,   c:'#15803D'},
                  {l:'Absent',     v:(s.attendance||[]).filter(a=>a.status==='absent').length, c:'#DC2626'},
                  {l:'Leave',      v:(s.attendance||[]).filter(a=>a.status==='leave').length,  c:'#D97706'},
                  {l:'Percentage', v:attPct+'%',c:attPct>=75?'#15803D':'#DC2626'},
                ].map(m => (
                  <div key={m.l} style={{background:'#F8FAFC',borderRadius:8,padding:'10px 14px',textAlign:'center',minWidth:80}}>
                    <div style={{fontSize:18,fontWeight:800,color:m.c}}>{m.v}</div>
                    <div style={{fontSize:11,color:'#6B7280'}}>{m.l}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {(s.attendance||[]).map(a => (
                  <div key={a.id} title={`${new Date(a.date).toLocaleDateString('en-PK')} — ${a.status}`}
                    style={{
                      width:30, height:30, borderRadius:6,
                      background:a.status==='present'?'#DCFCE7':a.status==='absent'?'#FEE2E2':'#FEF3C7',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, fontWeight:700,
                      color:a.status==='present'?'#15803D':a.status==='absent'?'#B91C1C':'#B45309',
                      border:`1px solid ${a.status==='present'?'#BBF7D0':a.status==='absent'?'#FECACA':'#FDE68A'}`,
                    }}>
                    {a.status==='present'?'P':a.status==='absent'?'A':'L'}
                  </div>
                ))}
                {(!s.attendance||s.attendance.length===0) && <p style={{color:'#9CA3AF',fontSize:13}}>No attendance records</p>}
              </div>
            </>
          )}

          {/* ── Exams ── */}
          {tab==='exams' && (
            <div style={{textAlign:'center',padding:32,color:'#9CA3AF'}}>
              <div style={{fontSize:40,marginBottom:8}}>🏆</div>
              <div style={{fontSize:14,fontWeight:600,color:'#374151'}}>Exam results will appear here once marks are entered</div>
              <Link to="/exams" className="btn btn-teal btn-sm" style={{marginTop:14}}>Go to Exams →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
