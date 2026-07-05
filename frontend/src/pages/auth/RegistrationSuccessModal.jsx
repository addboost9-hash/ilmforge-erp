/**
 * IlmForge — Onboarding Success Popup
 * Shows after school registration completes:
 *   ✓ Unique school login link (slug-based)
 *   ✓ Admin credentials (email + password) — shown once
 *   ✓ Email confirmation status
 *   ✓ Copy + Print options
 * Professional onboarding style — user verifies unique link on the spot.
 */
import { useState } from 'react';
import { CheckCircle2, Copy, Printer, Link2, Mail, KeyRound, ShieldCheck, X, ExternalLink } from 'lucide-react';

export default function RegistrationSuccessModal({ onboarding, onClose, onGoToLogin }) {
  const [copied, setCopied] = useState('');
  if (!onboarding) return null;
  const delivery = onboarding.emailDelivery || {};
  const deliveryOk = delivery.otpEmailSent || delivery.welcomeEmailSent;
  const schoolLogo = onboarding.schoolLogoUrl || (typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : '');

  const copy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const printCreds = () => {
    const w = window.open('', '_blank', 'width=520,height=640');
    w.document.write(`<!DOCTYPE html><html><head><title>School Credentials — ${onboarding.schoolName}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:30px;color:#0F172A;font-size:13px}
      .hd{text-align:center;border-bottom:3px solid #0D9488;padding-bottom:16px;margin-bottom:20px}
      .hd h1{font-size:20px;color:#0D9488}.hd p{font-size:12px;color:#64748B;margin-top:4px}
      .lnk{background:#F0FDFA;border:1.5px solid #5EEAD4;border-radius:12px;padding:14px;text-align:center;margin-bottom:16px;word-break:break-all}
      .lnk .l{font-size:10px;font-weight:700;color:#0F766E;text-transform:uppercase;letter-spacing:.05em}
      .lnk .v{font-family:'Consolas',monospace;font-size:13px;margin-top:4px;font-weight:600}
      .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px dashed #E2E8F0}
      .row .k{color:#64748B;font-size:12px}.row .v{font-family:'Consolas',monospace;background:#F8FAFC;padding:4px 10px;border-radius:8px;font-weight:700}
      .warn{background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:12px;font-size:11px;color:#92400E;margin-top:16px;line-height:1.6}
      .ft{text-align:center;margin-top:18px;font-size:10px;color:#94A3B8}
    </style></head><body>
      <div class="hd">
        ${schoolLogo ? `<img src="${schoolLogo}" alt="logo" style="width:62px;height:62px;object-fit:cover;border-radius:12px;border:2px solid #99F6E4;margin:0 auto 8px;"/>` : ''}
        <h1>🏫 ${onboarding.schoolName}</h1><p>School Registration Credentials — IlmForge ERP</p>
      </div>
      <div class="lnk"><div class="l">Your Unique School Login Link</div><div class="v">${onboarding.schoolLink}</div></div>
      <div class="row"><span class="k">Admin Email</span><span class="v">${onboarding.adminEmail}</span></div>
      <div class="row"><span class="k">Admin Password</span><span class="v">${onboarding.adminPassword}</span></div>
      <div class="row"><span class="k">School ID (slug)</span><span class="v">${onboarding.schoolSlug}</span></div>
      <div class="warn">⚠️ IMPORTANT: Yeh password sirf ek dafa dikhaya gaya hai. Isse safe jagah save karein. Email verification ke baad isi link se login karein. Yeh link sirf aapke school ke liye unique hai — bookmark kar lein.</div>
      <div class="ft">Printed: ${new Date().toLocaleString('en-PK')} · Ek copy email par bhi bheji gayi hai: ${onboarding.emailSentTo}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-teal-600 to-teal-700 rounded-t-3xl px-6 pt-8 pb-6 text-center">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition"><X className="w-4 h-4" /></button>
          {schoolLogo ? (
            <img src={schoolLogo} alt={onboarding.schoolName} className="w-16 h-16 object-cover rounded-2xl mx-auto mb-3 ring-4 ring-white/10 border-2 border-white/35" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 ring-4 ring-white/10">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
          )}
          <h2 className="text-xl font-bold text-white">School Registered! 🎉</h2>
          <p className="text-teal-100 text-sm mt-1">{onboarding.schoolName}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Email confirmation */}
          <div className={`flex items-center gap-3 rounded-xl p-3 border ${deliveryOk ? 'bg-teal-50 border-teal-100' : 'bg-amber-50 border-amber-200'}`}>
            <Mail className="w-4.5 h-4.5 text-teal-600 shrink-0" style={{width:18,height:18}} />
            <p className="text-xs text-slate-600">
              {deliveryOk
                ? <>Credentials + verification OTP email bheja gaya: <strong className="text-slate-800">{onboarding.emailSentTo}</strong></>
                : <>Email delivery failed for now. Continue with OTP screen and ask admin to verify SMTP settings.</>}
            </p>
          </div>

          {/* Unique school link — THE verification moment */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Aapka Unique School Link</span>
              <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">Sirf aapke school ka</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-teal-200 rounded-xl p-3">
              <code className="flex-1 text-xs font-mono text-slate-700 break-all">{onboarding.schoolLink}</code>
              <button onClick={() => copy('link', onboarding.schoolLink)}
                className="shrink-0 p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-500 hover:text-teal-600 transition" title="Copy link">
                {copied === 'link' ? <CheckCircle2 className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <a href={onboarding.schoolLink} target="_blank" rel="noreferrer"
                className="shrink-0 p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-500 hover:text-teal-600 transition" title="Open & verify">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">↗ Open karke verify karein — yahan aapke school ka branded login page dikhega</p>
          </div>

          {/* Credentials */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Admin Login Credentials</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Email</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-semibold text-slate-800">{onboarding.adminEmail}</code>
                  <button onClick={() => copy('email', onboarding.adminEmail)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                    {copied === 'email' ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Password</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">{onboarding.adminPassword}</code>
                  <button onClick={() => copy('pwd', onboarding.adminPassword)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                    {copied === 'pwd' ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <strong>Password sirf ek dafa dikhaya ja raha hai.</strong> Print ya copy kar lein. Email mein bhi bheja gaya hai. Login ke baad settings se change kar sakte hain.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={printCreds}
              className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-700 font-semibold py-3 rounded-xl text-sm transition">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onGoToLogin}
              className="flex-[2] flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-teal-600/25 transition">
              Verify OTP & Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
