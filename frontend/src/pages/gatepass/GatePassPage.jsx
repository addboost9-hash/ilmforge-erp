/** Gate Pass — QR pass issue + gatekeeper verify. 🔗 Student release control */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { QrCode, Search, ShieldCheck, Printer, CheckCircle2, XCircle } from 'lucide-react';

function QRImg({ text, size = 132 }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && text) QRCode.toCanvas(ref.current, text, { width: size, margin: 1, color: { dark: '#0F172A' } }); }, [text, size]);
  return <canvas ref={ref} className="rounded-lg" />;
}

export default function GatePassPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [parentName, setParentName] = useState('');
  const [reason, setReason] = useState('');
  const [issued, setIssued] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const { data: students = [] } = useQuery({
    queryKey: ['gp-students', search],
    queryFn: () => api.get('/students', { params: { search, limit: 10, status: 'active' } }).then(r => r.data.data || []),
    enabled: search.length >= 2,
  });
  const { data: passes = [] } = useQuery({
    queryKey: ['gatepasses'],
    queryFn: () => api.get('/gatepasses').then(r => r.data.data || []),
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['gatepass-audit'],
    queryFn: () => api.get('/gatepasses/audit').then(r => r.data.data || []),
  });

  const issue = useMutation({
    mutationFn: () => api.post('/gatepasses', { studentId: sel.id, parentName, reason }),
    onSuccess: (r) => { setIssued({ ...r.data.data, student: sel }); setSel(null); setSearch(''); setParentName(''); setReason(''); qc.invalidateQueries({ queryKey: ['gatepasses'] }); },
  });
  const verify = useMutation({
    mutationFn: () => api.post('/gatepasses/verify', { passCode: verifyCode.trim() }),
    onSuccess: (r) => setVerifyResult({ ok: true, ...r.data }),
    onError: (e) => setVerifyResult({ ok: false, message: e.response?.data?.message || 'Invalid' }),
  });
  const revoke = useMutation({
    mutationFn: ({ id }) => api.post(`/gatepasses/${id}/revoke`, { reason: 'manual revoke from gate pass page' }),
    onSuccess: () => {
      toast.success('Gate pass revoked');
      qc.invalidateQueries({ queryKey: ['gatepasses'] });
      qc.invalidateQueries({ queryKey: ['gatepass-audit'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to revoke pass'),
  });

  const printPass = (p) => {
    const w = window.open('', '_blank', 'width=420,height=560');
    w.document.write(`<!DOCTYPE html><html><head><title>Gate Pass</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:24px;display:flex;justify-content:center}
    .pass{width:300px;border:2.5px solid #0D9488;border-radius:18px;overflow:hidden;text-align:center}
    .hd{background:linear-gradient(135deg,#0F766E,#0D9488);color:#fff;padding:14px}.hd h2{font-size:15px}.hd p{font-size:10px;opacity:.8}
    .body{padding:16px}.code{font-family:monospace;font-weight:800;font-size:13px;background:#F0FDFA;border:1px dashed #5EEAD4;border-radius:8px;padding:6px;margin:10px 0}
    .row{display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px dashed #F1F5F9}.k{color:#94A3B8}.v{font-weight:700}
    .qr{margin:8px auto}</style></head><body><div class="pass">
    <div class="hd"><h2>🎫 STUDENT GATE PASS</h2><p>Sirf is pass ke saath release hoga</p></div>
    <div class="body"><img class="qr" src="${document.getElementById('gp-qr-' + p.id)?.toDataURL?.() || ''}" width="140"/>
    <div class="code">${p.passCode}</div>
    <div class="row"><span class="k">Student</span><span class="v">${p.student?.name || ''}</span></div>
    <div class="row"><span class="k">Roll No</span><span class="v">${p.student?.rollNo || ''}</span></div>
    <div class="row"><span class="k">Pick-up By</span><span class="v">${p.parentName}</span></div>
    <div class="row"><span class="k">Date</span><span class="v">${new Date(p.validDate).toLocaleDateString('en-PK')}</span></div>
    </div></div><script>setTimeout(()=>print(),400)</script></body></html>`);
    w.document.close();
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none';

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Issue pass */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><QrCode className="w-4 h-4 text-teal-600" /> Issue Gate Pass</h3>
        {!issued ? (<>
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input className={input + ' pl-9'} placeholder="Student search…" value={search} onChange={e => { setSearch(e.target.value); setSel(null); }} />
          </div>
          {students.length > 0 && !sel && (
            <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
              {students.map(s => (
                <button key={s.id} onClick={() => setSel(s)} className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-teal-300 text-sm">
                  <b>{s.name}</b> <span className="text-slate-400 text-xs">· {s.rollNo} · {s.class?.name}</span>
                </button>
              ))}
            </div>
          )}
          {sel && <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm font-bold text-teal-800">{sel.name} · {sel.rollNo}</div>}
          <input className={input + ' mb-2'} placeholder="Pick-up person name *" value={parentName} onChange={e => setParentName(e.target.value)} />
          <input className={input + ' mb-3'} placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <button onClick={() => issue.mutate()} disabled={!sel || !parentName || issue.isPending}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition">
            {issue.isPending ? 'Issuing…' : '🎫 Issue QR Pass'}
          </button>
        </>) : (
          <div className="text-center">
            <div className="inline-block p-4 bg-white border-2 border-teal-200 rounded-2xl mb-3">
              <QRImg text={issued.passCode} />
            </div>
            <div className="font-mono font-bold text-sm bg-teal-50 rounded-xl py-2 mb-1">{issued.passCode}</div>
            <p className="text-xs text-slate-500 mb-4">{issued.student?.name} — pick-up by <b>{issued.parentName}</b></p>
            <div className="flex gap-2">
              <button onClick={() => printPass(issued)} className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 text-white font-bold py-2.5 rounded-xl text-sm"><Printer className="w-4 h-4" /> Print Pass</button>
              <button onClick={() => setIssued(null)} className="flex-1 border border-slate-200 font-bold py-2.5 rounded-xl text-sm text-slate-600">+ New Pass</button>
            </div>
          </div>
        )}
      </div>

      {/* Verify (gatekeeper) */}
      <div className="space-y-4">
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal-400" /> Gatekeeper Verify</h3>
          <div className="flex gap-2">
            <input value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="Scan/enter pass code…"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm placeholder:text-slate-400 outline-none font-mono"
              onKeyDown={e => e.key === 'Enter' && verifyCode && verify.mutate()} />
            <button onClick={() => verify.mutate()} disabled={!verifyCode} className="px-5 bg-teal-500 rounded-xl font-bold text-sm disabled:opacity-40">Verify</button>
          </div>
          {verifyResult && (
            <div className={`mt-3 rounded-xl p-3 text-sm font-bold flex items-center gap-2 ${verifyResult.ok ? 'bg-teal-500/20 text-teal-300' : 'bg-red-500/20 text-red-300'}`}>
              {verifyResult.ok ? <><CheckCircle2 className="w-4 h-4" /> {verifyResult.data?.student?.name} — RELEASE AUTHORIZED ✓</> : <><XCircle className="w-4 h-4" /> {verifyResult.message}</>}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 max-h-72 overflow-y-auto">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Recent Passes</h3>
          {passes.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-50 text-sm">
              <span className="font-mono text-[11px] text-slate-400">{p.passCode.slice(-8)}</span>
              <span className="flex-1 font-semibold text-slate-700 truncate">{p.student?.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'used' ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700'}`}>{p.status.toUpperCase()}</span>
              {p.status === 'active' && (
                <button
                  onClick={() => revoke.mutate({ id: p.id })}
                  disabled={revoke.isPending}
                  className="text-[10px] font-bold border border-red-200 text-red-600 rounded px-2 py-0.5 hover:bg-red-50 disabled:opacity-50"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
          {!passes.length && <p className="text-xs text-slate-400 text-center py-4">Koi pass issue nahi hua</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 max-h-72 overflow-y-auto">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Gate Pass Audit</h3>
          {auditLogs.slice(0, 20).map(log => (
            <div key={log.id} className="py-2 border-b border-slate-50">
              <div className="text-xs font-semibold text-slate-700">{log.action}</div>
              <div className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString('en-PK')}</div>
            </div>
          ))}
          {!auditLogs.length && <p className="text-xs text-slate-400 text-center py-4">No gate pass audit entries yet</p>}
        </div>
      </div>
    </div>
  );
}
