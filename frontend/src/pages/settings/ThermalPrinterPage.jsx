import { Download, Printer, CheckCircle, AlertTriangle, Plug, Monitor } from 'lucide-react';

const hostUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1','').replace('/api/v1/','');

const STEPS = [
  {
    num:1, icon:Plug, title:'Connect Your Printer',
    desc:'Plug your printer into your computer using a USB cable. Turn it on and make sure it has paper and ink/ribbon.',
    tip:'If your printer came with a CD, use it to install the driver, or download it from the manufacturer\'s website.',
  },
  {
    num:2, icon:Monitor, title:'Set Your Printer as Default in Windows',
    desc:'Make sure your printer is set as the default printer so Thermal Printer Software can find it easily.',
    steps:['Open Windows Settings → Devices → Printers & Scanners','Find your printer in the list, click it → Select "Manage"','Click "Set as default"'],
    tip:'If you don\'t see your printer, ensure it\'s powered on and connected. Restart your computer if needed.',
  },
  {
    num:3, icon:Download, title:'Install Thermal Printer Software',
    desc:'Thermal Printer Software lets your computer talk to the printer for printing receipts and vouchers.',
    steps:[
      'Click the Download button below to download the software as a zip file',
      'Unzip and install it, then run as administrator (right-click → Run as administrator)',
      `Enter server address: ${hostUrl} — then click Connect`,
      'After connecting, click Refresh Printers and select your printer',
    ],
    tip:'System will auto-start software when you turn on your computer.',
  },
];

const PRINTERS = [
  'Zebra GK420t or GK420d (great for labels and receipts)',
  'Epson TM-T88V (popular for retail receipts)',
  'Citizen CT-S310II (fast and reliable)',
  'Brother QL-820NWB (good for labels)',
  'Dymo LabelWriter 450 (for small labels)',
  'HP LaserJet or Deskjet (for regular paper printing)',
];

const TROUBLESHOOT = [
  { issue:'Printer not found?', fix:'Ensure it\'s powered on, connected, and set as the default printer in Windows Settings.' },
  { issue:'Software icon missing?', fix:'Restart Thermal Printer Software by double-clicking its desktop shortcut or reinstall it.' },
  { issue:'Security warning?', fix:'When using Thermal Printer Software, you may see a security prompt. Click "Allow" to connect.' },
];

export default function ThermalPrinterPage() {
  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Thermal Printer Setup Guide</h1>
        <p className="page-subtitle">Easy steps to set up your printer and Thermal Printer Software on Windows for printing receipts and vouchers</p>
      </div>

      {/* Download button */}
      <div className="card" style={{ marginBottom:20, background:'linear-gradient(135deg,#1E3A5F,#253d63)', color:'#fff', textAlign:'center', padding:'24px' }}>
        <Printer size={36} color="#5EEAD4" style={{ marginBottom:12 }}/>
        <h2 style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>Download Thermal Printer Software</h2>
        <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, marginBottom:20 }}>Works with all thermal receipt printers on Windows 7, 8, 10, 11</p>
        <a href="https://github.com/addboost9-hash/ilmforge-thermal/releases/latest"
          target="_blank" rel="noopener noreferrer"
          className="btn btn-teal btn-lg" style={{ justifyContent:'center', textDecoration:'none' }}>
          <Download size={17}/> Download Thermal Printer Software
        </a>
        <div style={{ marginTop:10, fontSize:12, color:'rgba(255,255,255,0.55)' }}>
          After install → enter your server URL: <strong style={{color:'rgba(255,255,255,0.85)'}}>{hostUrl}</strong>
        </div>
      </div>

      {/* Getting Started */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:17, fontWeight:800, color:'#1E3A5F', marginBottom:16, borderBottom:'2px solid #0D9488', paddingBottom:8 }}>
          Getting Started
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {STEPS.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="card" style={{ borderLeft:`4px solid #0D9488` }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                  <div style={{ width:36,height:36,borderRadius:'50%',background:'#0D9488',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:15,flexShrink:0 }}>
                    {step.num}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <Icon size={15} color="#0D9488"/>
                      <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>{step.title}</h3>
                    </div>
                    <p style={{ fontSize:13, color:'#374151', lineHeight:1.6, marginBottom: step.steps?10:0 }}>{step.desc}</p>
                    {step.steps && (
                      <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
                        {step.steps.map((s,i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12.5, color:'#475569' }}>
                            <CheckCircle size={13} color="#0D9488" style={{ marginTop:2, flexShrink:0 }}/>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {step.tip && (
                      <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:7, padding:'8px 12px', fontSize:12, color:'#92400E' }}>
                        <strong>💡 Tip:</strong> {step.tip}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supported printers */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:17, fontWeight:800, color:'#1E3A5F', marginBottom:14, borderBottom:'2px solid #2563EB', paddingBottom:8 }}>
          Supported Printers
        </h2>
        <div className="card">
          <p style={{ fontSize:13, color:'#475569', marginBottom:12 }}>
            Thermal Printer Software works with many printers, especially thermal printers used for receipts:
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
            {PRINTERS.map(p=>(
              <div key={p} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#F8FAFC', borderRadius:8, border:'1px solid #E8EDF3', fontSize:12.5, color:'#374151' }}>
                <Printer size={13} color="#6B7280"/>
                {p}
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:'8px 12px', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:7, fontSize:12, color:'#92400E' }}>
            <strong>💡 Tip:</strong> If your printer isn't listed, check with your IT team or the printer's manual to confirm it supports thermal receipt printing.
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div>
        <h2 style={{ fontSize:17, fontWeight:800, color:'#1E3A5F', marginBottom:14, borderBottom:'2px solid #0891B2', paddingBottom:8 }}>
          Troubleshooting Tips
        </h2>
        <div className="card">
          {TROUBLESHOOT.map((t,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:i<TROUBLESHOOT.length-1?'1px solid #F1F5F9':'none' }}>
              <AlertTriangle size={14} color="#D97706" style={{ flexShrink:0, marginTop:2 }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:3 }}>{t.issue}</div>
                <div style={{ fontSize:12.5, color:'#64748B' }}>{t.fix}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:12, padding:'10px 14px', background:'#EFF6FF', borderRadius:8, fontSize:12.5, color:'#1D4ED8' }}>
            Need more help? WhatsApp Support at <strong>+92 300 1234567</strong> or email <strong>support@eduforge.com</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
