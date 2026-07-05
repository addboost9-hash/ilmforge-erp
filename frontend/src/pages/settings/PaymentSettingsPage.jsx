import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import { Save, CreditCard, Building2, FileText, Globe, CheckCircle } from 'lucide-react';

export default function PaymentSettingsPage() {
  const [activeTab, setActiveTab] = useState('bank');
  const [bankForm, setBankForm] = useState({ bankName:'', branch:'', accountTitle:'', accountNumber:'' });
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

  useEffect(() => {
    if (!paymentSettings) return;
    if (paymentSettings.bank) setBankForm(prev => ({ ...prev, ...paymentSettings.bank }));
    if (paymentSettings.voucher) setVoucherForm(prev => ({ ...prev, ...paymentSettings.voucher }));
  }, [paymentSettings]);

  const save = useMutation({
    mutationFn: () => api.put('/settings/payment', { bank: bankForm, voucher: voucherForm }),
    onSuccess: () => {
      setSaved(true);
      toast.success('Payment settings saved!');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to save payment settings'),
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
              These details will be printed on fee vouchers so parents can deposit fees at the bank.
            </p>
            {[
              { label:'Bank Name', key:'bankName', placeholder:'e.g. Meezan Bank, HBL, UBL' },
              { label:'Branch', key:'branch', placeholder:'e.g. Main Branch, Rawalpindi' },
              { label:'Account Title', key:'accountTitle', placeholder:'School Account Title' },
              { label:'Account Number / IBAN', key:'accountNumber', placeholder:'PK12ABCD0000000000000000' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input className="form-input" placeholder={f.placeholder} value={bankForm[f.key]} onChange={e=>setBankForm({...bankForm,[f.key]:e.target.value})}/>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:12 }}>Preview on Voucher</h3>
            <div style={{ background:'#F8FAFC', borderRadius:9, padding:16, border:'1px solid #E8EDF3', fontFamily:'monospace', fontSize:12.5 }}>
              <div style={{ textAlign:'center', fontWeight:700, marginBottom:8 }}>BANK DEPOSIT SLIP</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <div><span style={{ color:'#64748B' }}>Bank: </span>{bankForm.bankName||'—'}</div>
                <div><span style={{ color:'#64748B' }}>Branch: </span>{bankForm.branch||'—'}</div>
                <div><span style={{ color:'#64748B' }}>A/C Title: </span>{bankForm.accountTitle||'—'}</div>
                <div><span style={{ color:'#64748B' }}>A/C No: </span>{bankForm.accountNumber||'—'}</div>
              </div>
            </div>
            <div className="alert alert-info" style={{ marginTop:14 }}>
              <span>ℹ️ Bank details appear at the bottom of every fee voucher automatically.</span>
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
              <input className="form-input" value={voucherForm.headerText} onChange={e=>setVoucherForm({...voucherForm,headerText:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Footer / Note Text</label>
              <textarea className="form-input form-textarea" value={voucherForm.footerText} onChange={e=>setVoucherForm({...voucherForm,footerText:e.target.value})}/>
            </div>
            <div className="form-group">
              <label className="form-label">Number of Copies</label>
              <select className="form-select" value={voucherForm.copies} onChange={e=>setVoucherForm({...voucherForm,copies:e.target.value})}>
                <option value="1">1 Copy</option>
                <option value="2">2 Copies (Bank + School)</option>
                <option value="3">3 Copies</option>
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
