import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import { Save, CreditCard, Building2, FileText, Globe, CheckCircle } from 'lucide-react';

const BANK_FIELDS = [
  { label:'Bank Name', key:'bankName', placeholder:'e.g. Meezan Bank, HBL, UBL' },
  { label:'Branch', key:'branch', placeholder:'e.g. Main Branch, Rawalpindi' },
  { label:'Branch Code (optional)', key:'branchCode', placeholder:'e.g. 0123' },
  { label:'Account Title', key:'accountTitle', placeholder:'School Account Title' },
  { label:'Account Number / IBAN', key:'accountNumber', placeholder:'PK12ABCD0000000000000000' },
];
const EMPTY_BANK = { bankName:'', branch:'', branchCode:'', accountTitle:'', accountNumber:'' };

export default function PaymentSettingsPage() {
  const [activeTab, setActiveTab] = useState('bank');
  const [bankForm, setBankForm] = useState(EMPTY_BANK);
  // A campus's own account (else the school's): { [campusId]: {...} }
  const [campusBanks, setCampusBanks] = useState({});
  const [challan, setChallan] = useState({ dueDay: 10, lateFee: '', note: '' });
  const [voucherForm, setVoucherForm] = useState({
    headerText: 'School Fee Voucher',
    footerText: 'Thank you for timely payment. Keep this voucher as your receipt.',
    showLogo: true,
    showBarcode: true,
    copies: '2',
    thermalPrinter: false,
  });
  const [saved, setSaved] = useState(false);

  const { data: paymentSettings } = useQuery({
    queryKey: ['settings-payment'],
    queryFn: () => api.get('/settings/payment').then(r => r.data.data),
  });

  const { data: campuses = [] } = useQuery({
    queryKey: ['settings-school-campuses'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data?.campuses || []),
  });

  useEffect(() => {
    if (!paymentSettings) return;
    if (paymentSettings.bank) setBankForm(prev => ({ ...prev, ...paymentSettings.bank }));
    if (paymentSettings.voucher) setVoucherForm(prev => ({ ...prev, ...paymentSettings.voucher }));
    if (paymentSettings.campusBanks) setCampusBanks(paymentSettings.campusBanks);
    if (paymentSettings.challan) {
      const c = paymentSettings.challan;
      setChallan({ dueDay: c.dueDay || 10, lateFee: c.lateFee ? String(Math.round(c.lateFee / 100)) : '', note: c.note || '' });
    }
  }, [paymentSettings]);

  const dueDayOk = Number(challan.dueDay) >= 1 && Number(challan.dueDay) <= 28;
  const save = useMutation({
    mutationFn: () => {
      if (!dueDayOk) throw new Error('The challan due day must be from 1 to 28.');
      return api.put('/settings/payment', {
        bank: bankForm, voucher: voucherForm, campusBanks,
        challan: { dueDay: Number(challan.dueDay), lateFee: Math.round((Number(challan.lateFee) || 0) * 100), note: challan.note },
      });
    },
    onSuccess: () => {
      setSaved(true);
      toast.success('Payment settings saved!');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: err => toast.error(err.response?.data?.message || err.message || 'Failed to save payment settings'),
  });

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Payment Settings</h1>
          <p className="page-subtitle">Configure bank details, voucher design and payment gateways</p>
        </div>
        <button className="btn btn-teal" onClick={() => save.mutate()} disabled={save.isPending}>
          {saved ? <><CheckCircle size={14}/> Saved!</> : <><Save size={15}/> {save.isPending ? 'Saving...' : 'Save Settings'}</>}
        </button>
      </div>

      <div className="tab-list" style={{ marginBottom:16 }}>
        {[
          { id:'bank',    label:'🏦 Bank Settings',    icon:Building2 },
          { id:'voucher', label:'🧾 Voucher Settings',  icon:FileText },
          { id:'gateway', label:'💳 Payment Gateway',   icon:CreditCard },
        ].map(t => (
          <button key={t.id} className={`tab-btn${activeTab===t.id?' active':''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'bank' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <Building2 size={15} color="#0D9488"/>
              <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Bank Account Details</h3>
            </div>
            <p style={{ fontSize:12.5, color:'#64748B', marginBottom:16, lineHeight:1.6 }}>
              Printed on every bank challan, so parents deposit the fee straight into this account. Leave it empty
              if the school does not take fees through a bank: the challan then prints as a slip paid at the school office.
            </p>
            {BANK_FIELDS.map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input className="form-input" aria-label={`School ${f.label}`} placeholder={f.placeholder} value={bankForm[f.key] || ''} onChange={e=>setBankForm({...bankForm,[f.key]:e.target.value})}/>
              </div>
            ))}
          </div>
          <div className="card" style={{ gridColumn:'1 / -1' }} aria-label="Campus accounts">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <Building2 size={15} color="#0D9488"/>
              <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Campus Accounts</h3>
            </div>
            <p style={{ fontSize:12.5, color:'#64748B', marginBottom:12, lineHeight:1.6 }}>
              A campus with its own account gets it on its students' challans; the others use the school account above.
            </p>
            {campuses.length === 0 && <div style={{ fontSize:12.5, color:'#64748B' }}>No campus yet.</div>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12 }}>
              {campuses.map(c => {
                const own = campusBanks[c.id];
                return (
                  <div key={c.id} style={{ border:'1px solid #E2E8F0', borderRadius:9, padding:12, background: own ? '#F8FAFF' : '#FAFAFA' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:13, color:'#1E3A5F', cursor:'pointer' }}>
                      <input type="checkbox" checked={!!own} aria-label={`${c.name} has its own account`}
                        onChange={e => setCampusBanks(b => { const n = { ...b }; if (e.target.checked) n[c.id] = { ...EMPTY_BANK }; else delete n[c.id]; return n; })}/>
                      {c.name}{c.isMain ? ' (main)' : ''}: its own account
                    </label>
                    {!own && <div style={{ fontSize:12, color:'#64748B', marginTop:6 }}>Uses the school account{bankForm.bankName ? `: ${bankForm.bankName} ${bankForm.accountNumber}` : ''}.</div>}
                    {own && BANK_FIELDS.map(f => (
                      <div key={f.key} className="form-group" style={{ marginTop:8, marginBottom:0 }}>
                        <label className="form-label">{f.label}</label>
                        <input className="form-input" aria-label={`${c.name} ${f.label}`} placeholder={f.placeholder} value={own[f.key] || ''}
                          onChange={e => setCampusBanks(b => ({ ...b, [c.id]: { ...b[c.id], [f.key]: e.target.value } }))}/>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:12 }}>Preview on Voucher</h3>
            <div style={{ background:'#F8FAFC', borderRadius:9, padding:16, border:'1px solid #E8EDF3', fontFamily:'monospace', fontSize:12.5 }}>
              <div style={{ textAlign:'center', fontWeight:700, marginBottom:8 }}>BANK DEPOSIT SLIP</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <div><span style={{ color:'#64748B' }}>Bank: </span>{bankForm.bankName||'—'}</div>
                <div><span style={{ color:'#64748B' }}>Branch: </span>{bankForm.branch||'—'}{bankForm.branchCode ? ` (${bankForm.branchCode})` : ''}</div>
                <div><span style={{ color:'#64748B' }}>A/C Title: </span>{bankForm.accountTitle||'—'}</div>
                <div><span style={{ color:'#64748B' }}>A/C No: </span>{bankForm.accountNumber||'—'}</div>
              </div>
            </div>
            <div className="alert alert-info" style={{ marginTop:14 }}>
              <span>ℹ️ Printed on bank challans: Fees › Bank Challans, and "Print bank challan" on Collect Fee.</span>
            </div>
          </div>
          <div className="card" style={{ gridColumn:'1 / -1' }} aria-label="Challan settings">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <FileText size={15} color="#0D9488"/>
              <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Bank Challan</h3>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Due day of the month</label>
                <input className="form-input" type="number" min="1" max="28" aria-label="Challan due day" value={challan.dueDay}
                  onChange={e => setChallan(c => ({ ...c, dueDay: e.target.value }))} style={!dueDayOk ? { borderColor:'#DC2626' } : undefined}/>
                <div style={{ fontSize:11.5, color:'#64748B', marginTop:4 }}>The due date a new challan starts with (it can be changed when printing).</div>
              </div>
              <div className="form-group">
                <label className="form-label">Late fee after the due date (Rs)</label>
                <input className="form-input" type="number" min="0" aria-label="Late fee" placeholder="0 = no late fee" value={challan.lateFee}
                  onChange={e => setChallan(c => ({ ...c, lateFee: e.target.value }))}/>
                <div style={{ fontSize:11.5, color:'#64748B', marginTop:4 }}>One fixed amount, printed as "payable after the due date".</div>
              </div>
              <div className="form-group" style={{ gridColumn:'span 2' }}>
                <label className="form-label">Note on the challan (optional)</label>
                <textarea className="form-input form-textarea" maxLength={300} aria-label="Challan note" value={challan.note}
                  placeholder="e.g. Deposit at any Meezan Bank branch. Online: write the challan number as the reference."
                  onChange={e => setChallan(c => ({ ...c, note: e.target.value }))}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'voucher' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <FileText size={15} color="#0D9488"/>
              <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Voucher Design</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Voucher Header Text</label>
              <input aria-label="Voucher Header Text" className="form-input" value={voucherForm.headerText} onChange={e=>setVoucherForm({...voucherForm,headerText:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Footer / Note Text</label>
              <textarea aria-label="Footer / Note Text" className="form-input form-textarea" value={voucherForm.footerText} onChange={e=>setVoucherForm({...voucherForm,footerText:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Number of Copies</label>
              <select aria-label="Number of Copies" className="form-select" value={voucherForm.copies} onChange={e=>setVoucherForm({...voucherForm,copies:e.target.value})}>
                <option value="1">1 Copy</option>
                <option value="2">2 Copies (Bank + School)</option>
                <option value="3">3 Copies (Bank + School + Parent)</option>
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { key:'showLogo',       label:'Show School Logo on Voucher' },
                { key:'showBarcode',    label:'Show Barcode for Quick Scan' },
                { key:'thermalPrinter', label:'Thermal Printer Mode (58mm/80mm)' },
              ].map(opt => (
                <label key={opt.key} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#374151' }}>
                  <input type="checkbox" checked={voucherForm[opt.key]} onChange={e=>setVoucherForm({...voucherForm,[opt.key]:e.target.checked})} style={{ width:15,height:15 }}/>
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:12 }}>Voucher Preview</h3>
            <div style={{ border:'2px dashed #E8EDF3', borderRadius:9, padding:16, fontFamily:'monospace', fontSize:11, background:'#FAFAFA' }}>
              <div style={{ textAlign:'center', marginBottom:8 }}>
                {voucherForm.showLogo && <div style={{ fontSize:24, marginBottom:4 }}>🎓</div>}
                <div style={{ fontWeight:800, fontSize:13 }}>DEMO SCHOOL</div>
                <div style={{ color:'#64748B' }}>{voucherForm.headerText}</div>
              </div>
              <div style={{ borderTop:'1px solid #E8EDF3', paddingTop:8, marginTop:8 }}>
                <div>Student: Ali Hassan</div>
                <div>Class: Class 5 - A</div>
                <div>Month: July 2025</div>
                <div>Amount: Rs. 3,500</div>
                <div>Due Date: 10-Jul-2025</div>
              </div>
              {voucherForm.showBarcode && <div style={{ textAlign:'center', marginTop:8, fontSize:18, letterSpacing:3 }}>▐▌▌▐▐▌▐▌▌▐▌▐▌</div>}
              <div style={{ borderTop:'1px solid #E8EDF3', paddingTop:6, marginTop:8, fontSize:10, color:'#94A3B8' }}>{voucherForm.footerText}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gateway' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <CreditCard size={15} color="#0D9488"/>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Online Payment Gateway</h3>
          </div>
          <p style={{ fontSize:13, color:'#64748B', marginBottom:20, lineHeight:1.6 }}>
            Enable online payments for parents to pay fees from their mobile app using EasyPaisa, JazzCash or bank transfer.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {[
              { name:'EasyPaisa', emoji:'📱', color:'#00B894', desc:'Pakistan\'s most popular mobile wallet' },
              { name:'JazzCash',  emoji:'💚', color:'#E84393', desc:'Jazz mobile payment service' },
              { name:'Bank Transfer', emoji:'🏦', color:'#2563EB', desc:'Direct bank account deposit' },
            ].map(gw => (
              <div key={gw.name} className="card" style={{ border:`1px solid ${gw.color}30`, textAlign:'center', background:'#FAFAFA' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>{gw.emoji}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#1E3A5F' }}>{gw.name}</div>
                <div style={{ fontSize:12, color:'#64748B', marginTop:4, marginBottom:12, lineHeight:1.4 }}>{gw.desc}</div>
                <span className="badge badge-gray">Coming Soon</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
