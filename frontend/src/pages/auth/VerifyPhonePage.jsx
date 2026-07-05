/**
 * IlmForge — Email OTP Verification Page
 * OTP is sent via Office365 email (smtp.office365.com:587)
 * Dev mode: OTP auto-filled from API response
 */
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { Mail, CheckCircle, Copy, Zap, RefreshCw } from 'lucide-react';

export default function VerifyEmailOTPPage() {
  const loc    = useLocation();
  const nav    = useNavigate();
  const userId     = loc.state?.userId;
  const devOtp     = loc.state?.devOtp;
  const email      = loc.state?.email      || loc.state?.phone || 'your email';
  const schoolName = loc.state?.schoolName || '';

  const [otp,         setOtp]      = useState(['','','','','','']);
  const [timeLeft,    setTimeLeft]  = useState(600);
  const [loading,     setLoading]   = useState(false);
  const [canResend,   setCanResend] = useState(!devOtp);
  const [resending,   setResending] = useState(false);
  const refs   = useRef([]);
  const { login } = useAuthStore();

  /* Countdown timer */
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); setCanResend(true); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* Auto-fill dev OTP */
  useEffect(() => {
    if (devOtp && devOtp.length === 6) {
      setOtp(devOtp.split(''));
    }
  }, [devOtp]);

  // In local development, if we arrived from login without an OTP in state,
  // fetch a fresh code once so user doesn't get stuck waiting for email.
  useEffect(() => {
    if (!import.meta.env.DEV || !userId || devOtp) return;
    let alive = true;

    (async () => {
      try {
        const res = await api.post('/auth/resend-otp', { userId });
        const fetchedDevOtp = res.data?.data?.devOtp;
        if (alive && fetchedDevOtp && fetchedDevOtp.length === 6) {
          setOtp(fetchedDevOtp.split(''));
          toast.success('Dev OTP fetched automatically.');
        }
      } catch {
        // Non-blocking: manual resend remains available.
      }
    })();

    return () => { alive = false; };
  }, [userId, devOtp]);

  /* Auto-focus first box */
  useEffect(() => {
    setTimeout(() => refs.current[0]?.focus(), 300);
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val;
    setOtp(next);
    if (val && i < 5) refs.current[i+1]?.focus();
    if (next.every(d => d) && val) submitOtp(next.join(''));
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i-1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (text.length === 6) { setOtp(text.split('')); submitOtp(text); }
  };

  const submitOtp = async (code) => {
    if (!userId) return toast.error('Session expired. Please register again.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-phone', { userId, otp: code });
      localStorage.setItem('accessToken',  data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user',         JSON.stringify(data.data.user));
      localStorage.setItem('school',       JSON.stringify(data.data.school));
      if (data.data.school?.campuses?.[0]?.id) {
        localStorage.setItem('campusId', data.data.school.campuses[0].id);
      }
      toast.success('Email verified! Welcome to IlmForge 🎉');
      nav('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['','','','','','']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const res = await api.post('/auth/resend-otp', { userId });
      toast.success('New verification code sent to your email!');
      setTimeLeft(600); setCanResend(false); setOtp(['','','','','','']);
      refs.current[0]?.focus();
      // If dev OTP returned, auto-fill it
      if (res.data?.data?.devOtp) setOtp(res.data.data.devOtp.split(''));
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false); }
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2,'0');
  const secs = String(timeLeft % 60).padStart(2,'0');

  /* Mask email: g***@gmail.com */
  const maskEmail = (e) => {
    if (!e || !e.includes('@')) return e;
    const [local, domain] = e.split('@');
    return local.charAt(0) + '***' + '@' + domain;
  };

  return (
    <div style={{
      minHeight:'100vh', background:'#F0FDFA',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20, fontFamily:"'Inter','Poppins',system-ui,sans-serif"
    }}>
      <div style={{
        width:'100%', maxWidth:460,
        background:'#fff', borderRadius:20, padding:'40px 40px 36px',
        boxShadow:'0 8px 40px rgba(15,118,110,0.12)',
        textAlign:'center',
        border:'1px solid #CCFBF1',
      }}>

        {/* Icon */}
        <div style={{
          width:80, height:80, borderRadius:'50%',
          background:'linear-gradient(135deg,#0F766E,#0D9488)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 20px',
          boxShadow:'0 4px 20px rgba(15,118,110,0.3)',
        }}>
          <Mail size={36} color="#fff"/>
        </div>

        <h2 style={{ fontSize:24, fontWeight:900, color:'#0F4C45', margin:'0 0 8px', letterSpacing:'-0.3px' }}>
          Verify Your Email
        </h2>
        <p style={{ color:'#6B7280', fontSize:14, marginBottom:28, lineHeight:1.6 }}>
          We sent a 6-digit code to{' '}
          <strong style={{ color:'#0F766E' }}>{maskEmail(email)}</strong>
          <br/>
          <span style={{ fontSize:12.5 }}>Check your inbox and spam folder.</span>
        </p>

        {/* ── Dev mode banner ── */}
        {devOtp && (
          <div style={{
            background:'#F0FDFA', border:'2px solid #0D9488',
            borderRadius:12, padding:'14px 16px', marginBottom:24, textAlign:'left',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
              <Zap size={14} color="#0D9488"/>
              <span style={{ fontSize:11, fontWeight:700, color:'#0F766E', textTransform:'uppercase', letterSpacing:0.5 }}>
                Dev Mode — OTP Auto-Filled
              </span>
            </div>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'rgba(13,148,136,0.08)', borderRadius:8, padding:'8px 14px',
            }}>
              <span style={{ fontFamily:'monospace', fontSize:26, fontWeight:900, color:'#0D9488', letterSpacing:10 }}>
                {devOtp}
              </span>
              <button onClick={() => { navigator.clipboard.writeText(devOtp); toast.success('Copied!'); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#0D9488' }}>
                <Copy size={16}/>
              </button>
            </div>
            <p style={{ fontSize:11.5, color:'#6B7280', marginTop:8, lineHeight:1.5 }}>
              This OTP is shown only in development mode. In production, it is sent via email.
            </p>
          </div>
        )}

        {/* OTP input boxes */}
        <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:26 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              onPaste={handlePaste}
              maxLength={1}
              inputMode="numeric"
              style={{
                width:54, height:62,
                textAlign:'center', fontFamily:'monospace',
                fontSize:26, fontWeight:900,
                border: `2px solid ${digit ? '#0D9488' : '#E5E7EB'}`,
                borderRadius:12,
                outline:'none', color:'#0F4C45',
                background: digit ? '#F0FDFA' : '#FAFAFA',
                transition:'border-color .12s, background .12s',
                boxShadow: digit ? '0 0 0 3px rgba(13,148,136,0.1)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Timer */}
        <div style={{
          fontSize:22, fontWeight:800,
          color: timeLeft < 60 ? '#DC2626' : '#0F4C45',
          marginBottom:20,
          fontFamily:'monospace',
        }}>
          {mins}:{secs}
        </div>

        {/* Submit button */}
        <button
          onClick={() => submitOtp(otp.join(''))}
          disabled={loading || otp.some(d => !d)}
          style={{
            width:'100%', padding:'13px',
            borderRadius:11, border:'none',
            background: otp.every(d=>d)
              ? 'linear-gradient(90deg,#0F766E,#0D9488)'
              : '#E5E7EB',
            color: otp.every(d=>d) ? '#fff' : '#9CA3AF',
            fontSize:15, fontWeight:700,
            cursor: otp.every(d=>d) && !loading ? 'pointer' : 'not-allowed',
            fontFamily:'inherit',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all .15s',
            boxShadow: otp.every(d=>d) ? '0 4px 16px rgba(15,118,110,0.3)' : 'none',
          }}
        >
          {loading
            ? <><span style={{ fontSize:16 }}>⏳</span> Verifying…</>
            : <><CheckCircle size={18}/> Verify &amp; Continue</>
          }
        </button>

        {/* Resend */}
        <div style={{ marginTop:18 }}>
          {canResend ? (
            <button
              onClick={resend}
              disabled={resending}
              style={{ display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'1.5px solid #0F766E', color:'#0F766E', padding:'8px 20px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all .12s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#F0FDFA'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; }}
            >
              <RefreshCw size={14} style={{ animation:resending?'spin .8s linear infinite':undefined }}/>
              {resending ? 'Sending…' : 'Resend Code to Email'}
            </button>
          ) : (
            <p style={{ color:'#9CA3AF', fontSize:13 }}>
              Resend available after timer ends
            </p>
          )}
        </div>

        <p style={{ marginTop:16, fontSize:13, color:'#9CA3AF' }}>
          Wrong email?{' '}
          <Link to="/register" style={{ color:'#0F766E', fontWeight:700, textDecoration:'none' }}>
            Go back to Register
          </Link>
        </p>
      </div>
    </div>
  );
}
