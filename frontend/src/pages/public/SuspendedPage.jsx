/**
 * IlmForge — Account Suspended / Inactive Page
 * Clean, professional English — no Urdu
 */
import { Link, useSearchParams } from 'react-router-dom';

export default function SuspendedPage() {
  const [params] = useSearchParams();
  const reason  = params.get('reason') || 'Your school account has been suspended.';
  const contact = params.get('contact') || '';

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1B2F6E 0%,#0073b7 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:20, padding:'44px 36px', maxWidth:480, width:'100%', textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>

        {/* Icon */}
        <div style={{ fontSize:64, marginBottom:16 }}>🔒</div>

        {/* Title */}
        <h1 style={{ fontSize:26, fontWeight:900, color:'#dc2626', marginBottom:8, fontFamily:"'Poppins','Inter',sans-serif" }}>
          Account Suspended
        </h1>

        {/* Reason box */}
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'14px 16px', marginBottom:20, fontSize:14, color:'#7f1d1d', lineHeight:1.6 }}>
          {reason}
        </div>

        <p style={{ fontSize:14, color:'#64748b', marginBottom:20, lineHeight:1.6 }}>
          To reactivate your account, please contact<br/>
          <strong style={{ color:'#1e3a5f' }}>IlmForge Support</strong>
        </p>

        {/* WhatsApp Contact */}
        <a href="https://wa.me/923465146609"
          target="_blank" rel="noreferrer"
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'14px 20px', background:'#15803d', border:'none', borderRadius:12, textDecoration:'none', color:'white', fontWeight:800, fontSize:15, marginBottom:12, boxShadow:'0 4px 12px rgba(21,128,61,0.3)' }}>
          <span style={{ fontSize:20 }}>💬</span>
          WhatsApp: 0346-5146609
        </a>

        <a href="tel:+923465146609"
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, textDecoration:'none', color:'#1d4ed8', fontWeight:600, fontSize:14, marginBottom:20 }}>
          📞 Call: 0346-5146609
        </a>

        <Link to="/login"
          style={{ display:'block', padding:'11px', background:'#f1f5f9', borderRadius:10, textDecoration:'none', color:'#374151', fontWeight:600, fontSize:13 }}>
          ← Back to Login
        </Link>

        <div style={{ marginTop:20, fontSize:12, color:'#94a3b8' }}>
          IlmForge — School Management System
        </div>
      </div>
    </div>
  );
}
