/** Fees & Accounts Hub — collect, generate, defaulters, vouchers */
import { lazy, Suspense, useState } from 'react';
import { DollarSign, Wallet, AlertCircle, Receipt, FileText, Settings, Tag, Percent, TrendingUp, BookOpen, ScanLine, CreditCard, Globe, Heart } from 'lucide-react';

const FeeDashboard   = lazy(() => import('../fees/FeeDashboardPage'));
const FeeCollection  = lazy(() => import('../fees/FeeCollectionPage'));
const FeeGenerate    = lazy(() => import('../fees/FeeGeneratePage'));
const FeeDefaulters  = lazy(() => import('../fees/FeeDefaultersPage'));
const FeeStructure   = lazy(() => import('../fees/FeeStructurePage'));
const FamilyVoucher  = lazy(() => import('../fees/FamilyVoucherPage'));
const FeeTypes       = lazy(() => import('../fees/FeeTypesPage'));
const Discounted     = lazy(() => import('../fees/DiscountedStudentsPage'));
const FeeIncrement   = lazy(() => import('../fees/FeeIncrementPage'));
const AccountingPage  = lazy(() => import('../accounting/AccountingPage'));
const ParentWallet    = lazy(() => import('../fees/ParentWalletPage'));
const InvoicesManage = lazy(() => import('../fees/FeeInvoicesManagePage'));
const FeeBarcodeCollectionPage = lazy(() => import('../fees/FeeBarcodeCollectionPage'));
const EmiPlansPage   = lazy(() => import('../fees/EmiPlansPage').catch(() => ({
  default: () => (
    <div className="card">
      <div className="card-body" style={{ padding: 32, textAlign: 'center', color: '#999', fontSize: 14 }}>
        Page coming soon
      </div>
    </div>
  ),
})));
const OnlinePaymentPage = lazy(() => import('../fees/OnlinePaymentPage').catch(() => ({
  default: () => (
    <div className="card">
      <div className="card-body" style={{ padding: 32, textAlign: 'center', color: '#999', fontSize: 14 }}>
        Page coming soon
      </div>
    </div>
  ),
})));

const ACCENT = '#f39c12';

const L = (C) => () => (
  <Suspense fallback={<div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>Loading…</div>}>
    <C />
  </Suspense>
);

const TABS = [
  { id: 'dashboard',       label: 'Fee Dashboard',    icon: TrendingUp,  render: L(FeeDashboard) },
  { id: 'manage',          label: 'Manage Invoices',  icon: FileText,    render: L(InvoicesManage) },
  { id: 'collect',         label: 'Collect Fee',      icon: Wallet,      render: L(FeeCollection) },
  { id: 'generate',        label: 'Generate Fee',     icon: Receipt,     render: L(FeeGenerate) },
  { id: 'defaulters',      label: 'Defaulters',       icon: AlertCircle, render: L(FeeDefaulters) },
  { id: 'structure',       label: 'Fee Structure',    icon: Settings,    render: L(FeeStructure) },
  { id: 'types',           label: 'Fee Types',        icon: Tag,         render: L(FeeTypes) },
  { id: 'voucher',         label: 'Family Voucher',   icon: Receipt,     render: L(FamilyVoucher) },
  { id: 'discounted',      label: 'Discounts',        icon: Percent,     render: L(Discounted) },
  { id: 'increment',       label: 'Fee Inc/Dec',      icon: TrendingUp,  render: L(FeeIncrement) },
  { id: 'accounting',      label: 'Accounting',       icon: BookOpen,    render: L(AccountingPage) },
  { id: 'barcode-collect', label: 'Barcode Collect',  icon: ScanLine,    render: L(FeeBarcodeCollectionPage) },
  { id: 'wallet',          label: '💳 Parent Wallet',  icon: Heart,       render: L(ParentWallet) },
  { id: 'emi',             label: 'EMI Plans',        icon: CreditCard,  render: L(EmiPlansPage) },
  { id: 'online-payment',  label: 'Online Payment',   icon: Globe,       render: L(OnlinePaymentPage) },
];

export default function FeesHub() {
  const [activeId, setActiveId] = useState('dashboard');
  const active = TABS.find(t => t.id === activeId) || TABS[0];

  return (
    <div className="hub-shell">
      {/* Hub Header */}
      <div style={{background:'white', padding:'20px', borderBottom:'1px solid #dee2e6', borderLeft:`4px solid ${ACCENT}`, display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:0}}>
        <div>
          <div style={{fontSize:22, fontWeight:700, color:'#333', display:'flex', alignItems:'center', gap:10}}>
            <DollarSign size={24} style={{color:ACCENT}}/> Fees &amp; Accounts Hub
          </div>
          <div style={{fontSize:13, color:'#999', marginTop:3}}>
            Collect, generate, defaulters, vouchers — poora fee cycle ek page pe
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-success" onClick={() => setActiveId('collect')}>
            <Wallet size={15} />
            Collect Fee
          </button>
          <button className="btn btn-primary" onClick={() => setActiveId('generate')}>
            <Receipt size={15} />
            Generate Invoices
          </button>
        </div>
      </div>

      {/* Tab Strip */}
      <div style={{display:'flex', borderBottom:'2px solid #dee2e6', overflowX:'auto', padding:'0 20px', background:'white', gap:0}}>
        {TABS.map(t => (
          <button key={t.id}
            style={{padding:'12px 18px', fontSize:'13.5px', fontWeight: activeId===t.id ? 600 : 500,
                    color: activeId===t.id ? '#0073b7' : '#666', border:'none', background:'none',
                    cursor:'pointer', borderBottom: activeId===t.id ? '2px solid #0073b7' : '2px solid transparent',
                    marginBottom:-2, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6}}
            onClick={() => setActiveId(t.id)}>
            <t.icon size={15}/> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="hub-content" style={{padding:16}}>
        {active.render()}
      </div>
    </div>
  );
}
