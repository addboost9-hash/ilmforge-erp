/**
 * IlmForge — Family Fee Voucher
 * Shows all children of same parent on one voucher
 * Thermal printer + Standard A4 support
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Search, Printer, Users, DollarSign, FileText, Thermometer } from 'lucide-react';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

/* ── Generate family voucher HTML ─────────────── */
const printFamilyVoucher = (students, allInvoices, school, thermal = false) => {
  const sName  = school?.name    || 'IlmForge School';
  const addr   = school?.address || 'Islamabad, Pakistan';
  const phone  = school?.phone   || '';
  const date   = new Date().toLocaleDateString('en-PK');
  const logo   = localStorage.getItem('schoolLogoPreview') || '';
  const thermalWatermarkCss = buildWatermarkCss({ mode: 'compact', color: '#0F4C45', logoSize: '58mm' });
  const thermalWatermarkHtml = buildWatermarkMarkup({ logo, text: sName });
  const a4WatermarkCss = buildWatermarkCss({ mode: 'a4', color: '#0F4C45' });
  const a4WatermarkHtml = buildWatermarkMarkup({ logo, text: sName });

  const totalDue = allInvoices.reduce((s,inv) => s + (inv.dueAmount||0), 0);
  const totalAmt = allInvoices.reduce((s,inv) => s + (inv.totalAmount||0), 0);

  if (thermal) {
    // 80mm thermal format
    const lines = allInvoices.map(inv => {
      const st = students.find(s=>s.id===inv.studentId);
      return `<tr>
        <td style="padding:2px 0;font-size:11px;">${st?.name||'—'}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${money(inv.totalAmount)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{width:80mm;margin:0 auto;font-family:'Courier New',monospace;font-size:12px;padding:4px;position:relative;overflow:hidden;}
      ${thermalWatermarkCss}
      table, hr, button, div{position:relative;z-index:1;}
      @media print{body{width:80mm;}}
      hr{border:none;border-top:1px dashed #aaa;margin:6px 0;}
    </style></head><body>
      ${thermalWatermarkHtml}
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:14px;font-weight:bold;">${sName}</div>
        <div style="font-size:10px;">${addr}</div>
        <div style="font-size:10px;">${phone}</div>
        <hr/>
        <div style="font-weight:bold;font-size:11px;">FAMILY FEE VOUCHER</div>
        <div style="font-size:10px;">${date}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <thead><tr><th style="text-align:left;font-size:11px;border-bottom:1px solid #aaa;">Student</th><th style="text-align:right;font-size:11px;border-bottom:1px solid #aaa;">Amount</th></tr></thead>
        <tbody>${lines}</tbody>
      </table>
      <hr/>
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;margin-bottom:4px;">
        <span>TOTAL DUE:</span><span>${money(totalDue)}</span>
      </div>
      <hr/>
      <div style="text-align:center;font-size:10px;margin-top:6px;">
        Thank you for timely payment!<br/>${sName}
      </div>
      <button onclick="window.print()" style="display:block;width:100%;margin-top:12px;padding:8px;background:#0F766E;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">🖨 Print</button>
    </body></html>`;

    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(html);
    win.document.close();
    return;
  }

  // A4 format
  const rows = allInvoices.map(inv => {
    const st = students.find(s => s.id === inv.studentId);
    return `<tr style="border-bottom:1px solid #E5E7EB;">
      <td style="padding:8px 10px;font-weight:600;color:#111827;">${st?.name||'—'}</td>
      <td style="padding:8px 10px;color:#6B7280;">${st?.class?.name||'—'}</td>
      <td style="padding:8px 10px;color:#374151;">${inv.feeTitle}</td>
      <td style="padding:8px 10px;color:#374151;">${inv.month} ${inv.year}</td>
      <td style="padding:8px 10px;text-align:right;">${money(inv.totalAmount)}</td>
      <td style="padding:8px 10px;text-align:right;color:#059669;font-weight:600;">${money(inv.paidAmount)}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:700;color:${inv.dueAmount>0?'#DC2626':'#059669'};">${money(inv.dueAmount)}</td>
    </tr>`;
  }).join('');

  const fatherName = students[0]?.fatherName || 'Valued Parent';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Family Fee Voucher</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Arial',sans-serif;background:#F8FAFC;padding:24px;color:#1F2937;position:relative;overflow:hidden;}
    ${a4WatermarkCss}
    .no-print, .voucher-card{position:relative;z-index:1;}
    @media print{body{background:#fff;padding:12px;} .no-print{display:none!important;}}
  </style></head><body>
    ${a4WatermarkHtml}
    <div class="no-print" style="text-align:right;margin-bottom:16px;">
      <button onclick="window.print()" style="background:#0F766E;color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">🖨 Print Voucher</button>
    </div>

    <div class="voucher-card" style="max-width:800px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0F4C45,#0F766E);padding:24px 32px;display:flex;align-items:center;gap:16px;">
        <div style="width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:26px;border:2px solid rgba(255,255,255,0.2);">🎓</div>
        <div>
          <h1 style="color:#fff;font-size:20px;font-weight:900;margin:0 0 3px;">${sName}</h1>
          <p style="color:rgba(255,255,255,0.65);font-size:12px;margin:0;">${addr}${phone?' · '+phone:''}</p>
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div style="color:#D97706;font-weight:800;font-size:15px;">FAMILY FEE VOUCHER</div>
          <div style="color:rgba(255,255,255,0.6);font-size:11px;margin-top:3px;">Date: ${date}</div>
        </div>
      </div>

      <!-- Parent info -->
      <div style="padding:16px 32px;background:#F0FDFA;border-bottom:1px solid #CCFBF1;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:12px;color:#6B7280;">Parent / Guardian:</span>
          <strong style="font-size:14px;color:#0F4C45;margin-left:8px;">${fatherName}</strong>
        </div>
        <div>
          <span style="font-size:12px;color:#6B7280;">Children:</span>
          <strong style="font-size:14px;color:#0F4C45;margin-left:8px;">${students.length}</strong>
        </div>
        <div style="background:#0F766E;color:#fff;padding:6px 18px;border-radius:99px;font-weight:700;font-size:12px;">
          Total Due: ${money(totalDue)}
        </div>
      </div>

      <!-- Fee table -->
      <div style="padding:20px 32px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background:linear-gradient(90deg,#0F4C45,#0F766E);">
              <th style="padding:10px;text-align:left;color:#fff;font-size:11.5px;">Student</th>
              <th style="padding:10px;text-align:left;color:#fff;font-size:11.5px;">Class</th>
              <th style="padding:10px;text-align:left;color:#fff;font-size:11.5px;">Fee Type</th>
              <th style="padding:10px;text-align:left;color:#fff;font-size:11.5px;">Month</th>
              <th style="padding:10px;text-align:right;color:#fff;font-size:11.5px;">Total</th>
              <th style="padding:10px;text-align:right;color:#fff;font-size:11.5px;">Paid</th>
              <th style="padding:10px;text-align:right;color:#fff;font-size:11.5px;">Due</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#F0FDFA;">
              <td colspan="4" style="padding:10px;font-weight:800;color:#0F4C45;font-size:13px;">GRAND TOTAL</td>
              <td style="padding:10px;text-align:right;font-weight:700;">${money(totalAmt)}</td>
              <td style="padding:10px;text-align:right;font-weight:700;color:#059669;">-</td>
              <td style="padding:10px;text-align:right;font-weight:800;font-size:14px;color:${totalDue>0?'#DC2626':'#059669'};">${money(totalDue)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display:flex;justify-content:space-between;padding-top:14px;border-top:1px dashed #CBD5E1;">
          <p style="font-size:10.5px;color:#9CA3AF;margin:0;">Computer generated voucher · ${sName} · ${date}</p>
          <div style="text-align:center;">
            <div style="border-bottom:1px solid #374151;width:140px;margin-bottom:4px;padding-top:28px;"></div>
            <p style="font-size:11px;color:#374151;margin:0;">Accountant</p>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
};

export default function FamilyVoucherPage() {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const { data:school } = useQuery({ queryKey:['school-settings'], queryFn:()=>api.get('/settings/school').then(r=>r.data.data) });

  const { data:searchResults, isFetching } = useQuery({
    queryKey: ['family-search', search],
    queryFn: () => search.length < 2 ? Promise.resolve([]) :
      api.get('/students', { params:{ search, limit:10 } }).then(r=>r.data.data||[]),
    enabled: search.length >= 2,
  });

  const { data:feeData } = useQuery({
    queryKey: ['family-fees', selected?.fatherName],
    queryFn: async () => {
      if (!selected) return null;
      // Get all students with same father name
      const siblings = await api.get('/students', { params:{ search:selected.fatherName, limit:20 } }).then(r=>r.data.data||[]);
      const sameFamily = siblings.filter(s=>s.fatherName===selected.fatherName && s.status==='active');
      // Get fees for each
      const allInvoices = [];
      for (const s of sameFamily) {
        const feeRes = await api.get('/fees/student/'+s.id).catch(()=>({ data:{ data:{ invoices:[] } } }));
        const invoices = (feeRes.data.data?.invoices||[])
          .filter(inv => inv.status !== 'paid')
          .map(inv => ({ ...inv, studentId:s.id }));
        allInvoices.push(...invoices);
      }
      return { students:sameFamily, invoices:allInvoices };
    },
    enabled: !!selected?.fatherName,
  });

  const totalDue = (feeData?.invoices||[]).reduce((s,inv)=>s+(inv.dueAmount||0),0);

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Family Fee Voucher</h1>
        <p className="page-subtitle">Generate one combined voucher for all children of the same parent</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
        <div>
          {/* Search */}
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-title" style={{ marginBottom:14 }}>Search by Student or Parent Name</div>
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF' }}/>
              <input className="form-input" style={{ paddingLeft:34,fontSize:14 }}
                placeholder="Type student name or father's name..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
              />
            </div>
            {isFetching && <div style={{ fontSize:12,color:'#9CA3AF',marginTop:6 }}>Searching…</div>}
            {(searchResults||[]).length > 0 && !selected && (
              <div style={{ marginTop:8,border:'1px solid #E5E7EB',borderRadius:9,overflow:'hidden',boxShadow:'0 4px 12px rgba(0,0,0,0.07)' }}>
                {searchResults.map(s => (
                  <div key={s.id}
                    onClick={() => { setSelected(s); setSearch(s.fatherName || s.name); }}
                    style={{ padding:'11px 14px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13 }}
                    onMouseEnter={e=>e.currentTarget.style.background='#F0FDFA'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                  >
                    <div>
                      <span style={{ fontWeight:600 }}>{s.name}</span>
                      {s.fatherName && <span style={{ color:'#6B7280',marginLeft:8,fontSize:12 }}>— Father: {s.fatherName}</span>}
                    </div>
                    <div style={{ display:'flex',gap:6 }}>
                      {s.rollNo && <span className="badge badge-teal">{s.rollNo}</span>}
                      {s.class?.name && <span className="badge badge-blue">{s.class.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Family data */}
          {feeData && (
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 18px',background:'linear-gradient(90deg,#F0FDFA,#F8FAFC)',borderBottom:'1px solid #CCFBF1',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700,fontSize:14,color:'#0F4C45' }}>
                    👨‍👩‍👦 {selected?.fatherName || 'Family'} — {feeData.students?.length} Children
                  </div>
                  <div style={{ fontSize:12,color:'#6B7280',marginTop:2 }}>
                    Total Due: <strong style={{ color:'#DC2626' }}>{money(totalDue)}</strong>
                  </div>
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  <button className="btn btn-outline btn-sm" onClick={()=>printFamilyVoucher(feeData.students||[], feeData.invoices||[], school, true)}>
                    <Thermometer size={13}/> Thermal
                  </button>
                  <button className="btn btn-teal btn-sm" onClick={()=>printFamilyVoucher(feeData.students||[], feeData.invoices||[], school, false)}>
                    <Printer size={13}/> A4 Print
                  </button>
                </div>
              </div>

              {/* Children list */}
              {(feeData.students||[]).map(st => (
                <div key={st.id} style={{ padding:'12px 18px',borderBottom:'1px solid #F3F4F6' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                    <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#0F766E,#D97706)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:12,flexShrink:0 }}>
                      {st.name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight:700,fontSize:13 }}>{st.name}</div>
                      <div style={{ fontSize:11.5,color:'#6B7280' }}>Roll: {st.rollNo} · {st.class?.name} {st.section?.name?'- '+st.section.name:''}</div>
                    </div>
                  </div>
                  {(feeData.invoices||[]).filter(inv=>inv.studentId===st.id).map(inv => (
                    <div key={inv.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 10px',background:'#F9FAFB',borderRadius:7,marginBottom:4,fontSize:12.5 }}>
                      <span>{inv.feeTitle} — {inv.month} {inv.year}</span>
                      <span style={{ fontWeight:700,color:'#DC2626' }}>{money(inv.dueAmount)}</span>
                    </div>
                  ))}
                  {(feeData.invoices||[]).filter(inv=>inv.studentId===st.id).length===0 && (
                    <div style={{ fontSize:12,color:'#9CA3AF',padding:'4px 10px' }}>✅ No pending fees</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!selected && (
            <div className="card" style={{ textAlign:'center',padding:48 }}>
              <div style={{ fontSize:48,marginBottom:12,opacity:.2 }}>👨‍👩‍👧‍👦</div>
              <div style={{ fontSize:15,fontWeight:600,color:'#374151',marginBottom:6 }}>Search a Student or Parent</div>
              <div style={{ fontSize:13,color:'#9CA3AF' }}>The system will automatically find all siblings and generate a combined family voucher</div>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom:12 }}>How Family Voucher Works</div>
            <div style={{ display:'flex',flexDirection:'column',gap:10,fontSize:13,color:'#374151' }}>
              {[
                ['1', 'Search any student\'s name'],
                ['2', 'System finds all siblings (same father name)'],
                ['3', 'All pending fees are combined'],
                ['4', 'Print as A4 or Thermal receipt'],
              ].map(([n,t]) => (
                <div key={n} style={{ display:'flex',alignItems:'center',gap:9 }}>
                  <div style={{ width:22,height:22,borderRadius:'50%',background:'#0F766E',color:'#fff',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{n}</div>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="alert alert-teal">
            <span>💡</span>
            <span style={{ fontSize:12.5 }}>
              <strong>Thermal Printer:</strong> Prints 80mm compact receipt. <strong>A4:</strong> Full page professional voucher with school header and table.
            </span>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom:10 }}>Quick Actions</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              <a href="/fees/collect" className="btn btn-outline btn-sm" style={{ justifyContent:'flex-start',textDecoration:'none' }}>
                <DollarSign size={13}/> Collect Fee
              </a>
              <a href="/fees/defaulters" className="btn btn-outline btn-sm" style={{ justifyContent:'flex-start',textDecoration:'none' }}>
                <Users size={13}/> Fee Defaulters
              </a>
              <a href="/fees/generate" className="btn btn-outline btn-sm" style={{ justifyContent:'flex-start',textDecoration:'none' }}>
                <FileText size={13}/> Generate Monthly Fee
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
