/**
 * IlmForge — Account Suspended Page
 * Shown when platform owner suspends a school
 */
import { Link, useSearchParams } from 'react-router-dom';

export default function SuspendedPage() {
  const [params] = useSearchParams();
  const reason  = params.get('reason') || 'Aapka school account suspend kar diya gaya hai.';
  const contact = params.get('contact') || 'WhatsApp: 0348-5321483';

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1B2F6E,#0073b7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:20, padding:'44px 36px', maxWidth:480, width:'100%', textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🔒</div>
        <h1 style={{ fontSize:24, fontWeight:900, color:'#dc2626', marginBottom:8 }}>Account Suspended</h1>
        <div style={{ fontSize:15, color:'#374151', marginBottom:16, lineHeight:1.7, padding:'12px 16px', background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca' }}>
          {reason}
        </div>
        <div style={{ fontSize:13, color:'#64748b', marginBottom:24, lineHeight:1.6 }}>
          Apnا account wapas activate karne ke liye IlmForge se rabta karein:
        </div>
        <div style={{ padding:'14px 18px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, marginBottom:20, fontSize:14, fontWeight:700, color:'#15803d' }}>
          📞 {contact}
        </div>
        <Link to="/login" style={{ display:'block', padding:'12px', background:'#f1f5f9', borderRadius:10, textDecoration:'none', color:'#374151', fontWeight:600, fontSize:13 }}>
          ← Wapas Login Pe Jayen
        </Link>
        <div style={{ marginTop:16, fontSize:11, color:'#94a3b8' }}>
          IlmForge — Pakistan ka #1 School ERP 🇵🇰
        </div>
      </div>
    </div>
  );
}
