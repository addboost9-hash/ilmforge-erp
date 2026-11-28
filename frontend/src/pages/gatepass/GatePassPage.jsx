/**
 * Gate Pass: a student leaves school early only with a pass, to the person
 * named on it.
 *
 * Issuing: choose the student; the people on their record (father, mother,
 * parent accounts) and those who collected them before appear as choices, or
 * "Someone else" with their relation, phone and CNIC. Someone not on the
 * record needs the parent's agreement by phone, ticked by the office. A reason
 * is picked or written. The pass prints with its QR code.
 *
 * The gate (here, or the gatekeeper's portal) scans or types the code and is
 * told whom to release the student to.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { QrCode, Search, ShieldCheck, Printer, CheckCircle2, XCircle, UserRound, Phone, CreditCard, AlertTriangle, X, History } from 'lucide-react';

function QRImg({ text, size = 132, id }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && text) QRCode.toCanvas(ref.current, text, { width: size, margin: 1, color: { dark: '#0F172A' } }); }, [text, size]);
  return <canvas ref={ref} id={id} className="rounded-lg" />;
}

const REASONS = ['Unwell', "Doctor's appointment", 'Family emergency', 'Family event', 'Early leave (permission)'];
const RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Guardian', 'Driver / van', 'Neighbour', 'Other'];
const pkToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const pkPlus = (n) => new Date(Date.now() + 5 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
// Names compared as the server does: case, spaces and Muhammad's spellings aside.
const norm = (s) => String(s || '').toLowerCase().replace(/\b(mohammad|mohammed|muhammed|mohamed|muhamad|mohd|md)\b/g, 'muhammad').replace(/[^a-z؀-ۿ\s]/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dayText = (d) => new Date(d).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
const timeText = (d) => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
const STATUS = { active: ['Active', 'bg-teal-50 text-teal-700'], used: ['Released', 'bg-slate-100 text-slate-600'], expired: ['Cancelled', 'bg-red-50 text-red-600'] };

const EMPTY = { name: '', relation: '', phone: '', cnic: '' };

export default function GatePassPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [who, setWho] = useState(null); // the chosen chip: index, 'other', or null
  const [person, setPerson] = useState(EMPTY);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [validDate, setValidDate] = useState(pkToday());
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const { data: students = [], isFetching: searching } = useQuery({
    queryKey: ['gp-students', search],
    queryFn: () => api.get('/students', { params: { search, limit: 10, status: 'active' } }).then((r) => r.data.data || []),
    enabled: search.trim().length >= 2 && !sel,
  });
  const { data: pickup } = useQuery({
    queryKey: ['gp-pickup', sel?.id],
    queryFn: () => api.get(`/gatepasses/pickup/${sel.id}`).then((r) => r.data.data),
    enabled: !!sel,
  });
  const { data: passes = [] } = useQuery({ queryKey: ['gatepasses'], queryFn: () => api.get('/gatepasses').then((r) => r.data.data || []) });
  const { data: auditLogs = [] } = useQuery({ queryKey: ['gatepass-audit'], queryFn: () => api.get('/gatepasses/audit').then((r) => r.data.data || []) });

  const choices = useMemo(() => [...(pickup?.people || []), ...(pickup?.before || [])], [pickup]);
  const onRecord = !!person.name.trim() && (pickup?.people || []).some((p) => norm(p.name) === norm(person.name));
  const needsConfirm = !!person.name.trim() && !onRecord;
  const reasonText = reason === 'Other' ? reasonOther.trim() : reason;
  const ready = sel && person.name.trim().length >= 2 && (!needsConfirm || confirmed);

  const resetForm = () => { setSel(null); setSearch(''); setWho(null); setPerson(EMPTY); setConfirmed(false); setReason(''); setReasonOther(''); setValidDate(pkToday()); setError(''); };
  const choose = (i) => {
    setWho(i);
    setConfirmed(false);
    setError('');
    if (i === 'other') setPerson(EMPTY);
    else { const p = choices[i]; setPerson({ name: p.name, relation: p.relation || '', phone: p.phone || '', cnic: p.cnic || '' }); }
  };

  const issue = useMutation({
    mutationFn: () => api.post('/gatepasses', {
      studentId: sel.id, parentName: person.name.trim(), relation: person.relation || undefined, phone: person.phone || undefined, cnic: person.cnic || undefined,
      reason: reasonText || undefined, validDate, parentConfirmed: needsConfirm ? confirmed : false,
    }),
    onSuccess: (r) => {
      setIssued(r.data.data);
      toast.success(r.data.message);
      resetForm();
      qc.invalidateQueries({ queryKey: ['gatepasses'] });
      qc.invalidateQueries({ queryKey: ['gatepass-audit'] });
    },
    onError: (e) => setError(e.response?.data?.message || 'The pass could not be issued.'),
  });
  const verify = useMutation({
    mutationFn: () => api.post('/gatepasses/verify', { passCode: verifyCode.trim() }),
    onSuccess: (r) => { setVerifyResult({ ok: true, ...r.data }); setVerifyCode(''); qc.invalidateQueries({ queryKey: ['gatepasses'] }); qc.invalidateQueries({ queryKey: ['gatepass-audit'] }); },
    onError: (e) => setVerifyResult({ ok: false, message: e.response?.data?.message || 'Invalid pass.', data: e.response?.data?.data }),
  });
  const revoke = useMutation({
    mutationFn: ({ id }) => api.post(`/gatepasses/${id}/revoke`, { reason: 'cancelled on the gate pass page' }),
    onSuccess: () => { toast.success('Gate pass cancelled'); setRevoking(null); qc.invalidateQueries({ queryKey: ['gatepasses'] }); qc.invalidateQueries({ queryKey: ['gatepass-audit'] }); },
    onError: (e) => toast.error(e?.response?.data?.message || 'It could not be cancelled.'),
  });

  const printPass = (p) => {
    const w = window.open('', '_blank', 'width=440,height=640');
    if (!w) { toast.error('Allow pop-ups for this site to print.'); return; }
    const qr = document.getElementById(`gp-qr-${p.id}`)?.toDataURL?.() || '';
    const row = (k, v) => (v ? `<div class="row"><span class="k">${esc(k)}</span><span class="v" dir="auto">${esc(v)}</span></div>` : '');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gate Pass</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;display:flex;justify-content:center}
    .pass{width:310px;border:2.5px solid #0D9488;border-radius:16px;overflow:hidden;text-align:center}
    .hd{background:#0F766E;color:#fff;padding:12px}.hd h2{font-size:15px;letter-spacing:.5px}.hd p{font-size:10px;opacity:.85;margin-top:2px}
    .body{padding:14px}.code{font-family:monospace;font-weight:800;font-size:13px;background:#F0FDFA;border:1px dashed #5EEAD4;border-radius:8px;padding:5px;margin:8px 0}
    .to{background:#F0FDFA;border:1px solid #99F6E4;border-radius:10px;padding:8px;margin:6px 0 8px}.to .l{font-size:9.5px;color:#0F766E;text-transform:uppercase;letter-spacing:.6px;font-weight:700}.to .n{font-size:16px;font-weight:800;color:#0F172A}.to .s{font-size:11px;color:#334155}
    .row{display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:4px 0;border-bottom:1px dashed #E2E8F0;text-align:left}.k{color:#64748B;white-space:nowrap}.v{font-weight:700;text-align:right}
    .note{font-size:9.5px;color:#64748B;margin-top:8px}</style></head><body><div class="pass">
    <div class="hd"><h2>STUDENT GATE PASS</h2><p>Release only to the person named below</p></div>
    <div class="body">${qr ? `<img src="${qr}" width="130" alt=""/>` : ''}<div class="code">${esc(p.passCode)}</div>
    <div class="to"><div class="l">Release to</div><div class="n" dir="auto">${esc(p.parentName)}</div><div class="s">${esc([p.relation, p.pickupPhone, p.pickupCnic && `CNIC ${p.pickupCnic}`].filter(Boolean).join(' · '))}</div></div>
    ${row('Student', p.student?.name)}${row('Class', [p.student?.className, p.student?.sectionName].filter(Boolean).join(' — '))}${row('Roll No', p.student?.rollNo)}
    ${row('Reason', p.reason)}${row('Valid on', dayText(p.validDate))}${row('Issued', `${timeText(p.createdAt)}${p.issuedByName ? `, by ${p.issuedByName}` : ''}`)}
    ${row('Checked', p.onRecord ? "On the student's record" : p.parentConfirmed ? 'Parent agreed by phone' : '')}
    <div class="note">Valid once, on the day shown. The gate checks the person's CNIC.</div>
    </div></div><script>setTimeout(()=>print(),400)</script></body></html>`);
    w.document.close();
  };

  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none';
  const label = 'block text-xs font-bold text-slate-500 mb-1';
  const chip = (on) => `text-left px-3 py-2 rounded-xl border text-sm transition ${on ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:border-teal-300'}`;
  const v = verifyResult?.data;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Issue a pass */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5" aria-label="Issue a gate pass">
        <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><QrCode className="w-4 h-4 text-teal-600" /> Issue a gate pass</h3>
        {!issued ? (
          <div className="space-y-4">
            {/* 1. The student */}
            <div>
              <div className={label}>1. Student</div>
              {!sel ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input className={`${input} pl-9`} placeholder="Student name or roll number" aria-label="Find the student" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
                  </div>
                  {search.trim().length >= 2 && (
                    <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                      {students.map((s) => (
                        <button key={s.id} type="button" onClick={() => { setSel(s); setWho(null); setPerson(EMPTY); setError(''); }} className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-teal-300 text-sm">
                          <b>{s.name}</b> <span className="text-slate-500 text-xs">· {s.rollNo || 'no roll no.'}{s.class?.name ? ` · ${s.class.name}` : ''}{s.section?.name ? ` ${s.section.name}` : ''}{s.fatherName ? ` · father ${s.fatherName}` : ''}</span>
                        </button>
                      ))}
                      {!searching && !students.length && <p className="text-xs text-slate-400 p-2">No active student matches "{search.trim()}".</p>}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  {pickup?.student?.photoUrl ? <img src={pickup.student.photoUrl} alt="" className="w-11 h-11 rounded-lg object-cover" /> : <div className="w-11 h-11 rounded-lg bg-teal-100 grid place-items-center"><UserRound className="w-5 h-5 text-teal-700" /></div>}
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-bold text-teal-900 truncate">{sel.name}</div>
                    <div className="text-xs text-teal-800/80 truncate">{[pickup?.student?.className, pickup?.student?.sectionName].filter(Boolean).join(' — ')}{sel.rollNo ? ` · Roll ${sel.rollNo}` : ''}</div>
                  </div>
                  <button type="button" onClick={resetForm} className="text-xs font-bold text-teal-700 border border-teal-300 rounded-lg px-2 py-1 bg-white">Change</button>
                </div>
              )}
              {pickup?.activeToday?.length > 0 && (
                <div className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-2 flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {sel?.name} already has a pass today ({pickup.activeToday.map((p) => `${p.parentName}, ${p.passCode.slice(-6)}`).join('; ')}). Cancel it below if this one replaces it.
                </div>
              )}
            </div>

            {/* 2. Who collects */}
            {sel && (
              <div>
                <div className={label}>2. Who is collecting {sel.name}?</div>
                {!pickup ? <p className="text-xs text-slate-400">Loading the student's record…</p> : (
                  <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Who is collecting">
                    {choices.map((p, i) => (
                      <button key={`${p.source}-${p.name}`} type="button" role="radio" aria-checked={who === i} onClick={() => choose(i)} className={chip(who === i)}>
                        <div className="font-bold text-slate-800 truncate" dir="auto">{p.name}</div>
                        <div className="text-xs text-slate-500 truncate">{p.relation || 'Relation not saved'}{p.phone ? ` · ${p.phone}` : ''}</div>
                        <div className={`text-[11px] font-semibold ${p.source === 'before' ? 'text-amber-700' : 'text-teal-700'}`}>{p.source === 'record' ? "On the student's record" : p.source === 'parent account' ? 'Parent account' : `Collected before, ${new Date(p.lastAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`}</div>
                      </button>
                    ))}
                    <button type="button" role="radio" aria-checked={who === 'other'} onClick={() => choose('other')} className={chip(who === 'other')}>
                      <div className="font-bold text-slate-800">Someone else</div>
                      <div className="text-xs text-slate-500">An uncle, a driver, a neighbour…</div>
                    </button>
                  </div>
                )}
                {pickup && !pickup.people.length && <p className="text-xs text-amber-700 mt-1.5">No father, mother or parent account is saved on {sel.name}'s record: add them in Student Hub so they appear here.</p>}

                {who !== null && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    <label className="sm:col-span-2"><span className={label}>Name of the person collecting *</span>
                      <input className={input} value={person.name} onChange={(e) => { setPerson({ ...person, name: e.target.value }); setConfirmed(false); }} placeholder="Full name, as on their CNIC" dir="auto" /></label>
                    <label><span className={label}>Relation to the student</span>
                      <select className={input} value={person.relation} onChange={(e) => setPerson({ ...person, relation: e.target.value })}>
                        <option value="">Choose…</option>
                        {(pickup?.relations || RELATIONS).map((r) => <option key={r} value={r}>{r}</option>)}
                      </select></label>
                    <label><span className={label}><Phone className="w-3 h-3 inline -mt-0.5" /> Phone</span>
                      <input className={input} inputMode="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} placeholder="0300 1234567" /></label>
                    <label className="sm:col-span-2"><span className={label}><CreditCard className="w-3 h-3 inline -mt-0.5" /> CNIC (the gate checks it)</span>
                      <input className={input} inputMode="numeric" value={person.cnic} onChange={(e) => setPerson({ ...person, cnic: e.target.value })} placeholder="35202-1234567-1" /></label>
                  </div>
                )}
                {who !== null && needsConfirm && (
                  <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span><b>{person.name.trim()}</b> is not on {sel.name}'s record. Call the parent first{pickup?.people?.find((p) => p.phone) ? <> ({pickup.people.find((p) => p.phone).relation} <b>{pickup.people.find((p) => p.phone).phone}</b>)</> : null} and check that they agree.</span>
                    </div>
                    <label className="mt-2 flex items-center gap-2 font-semibold"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> The parent agreed by phone</label>
                  </div>
                )}
              </div>
            )}

            {/* 3. Why, and the day */}
            {sel && who !== null && (
              <div>
                <div className={label}>3. Reason</div>
                <div className="flex flex-wrap gap-1.5">
                  {[...REASONS, 'Other'].map((r) => (
                    <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(reason === r ? '' : r)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${reason === r ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:border-teal-300'}`}>{r}</button>
                  ))}
                </div>
                {reason === 'Other' && <input className={`${input} mt-2`} value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} placeholder="The reason" aria-label="The reason" />}
                <label className="flex items-center gap-2 mt-3 text-sm text-slate-600">Valid on
                  <input type="date" className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm" value={validDate} min={pkToday()} max={pkPlus(7)} onChange={(e) => setValidDate(e.target.value || pkToday())} />
                  {validDate === pkToday() && <span className="text-xs text-slate-400">today</span>}
                </label>
              </div>
            )}

            {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}
            <button type="button" onClick={() => { setError(''); issue.mutate(); }} disabled={!ready || issue.isPending}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition">
              {issue.isPending ? 'Issuing…' : sel && person.name.trim() ? `Issue gate pass: ${sel.name} with ${person.name.trim()}` : 'Issue gate pass'}
            </button>
            {sel && who !== null && !ready && <p className="text-xs text-slate-400 -mt-2">{person.name.trim().length < 2 ? 'Write the name of the person collecting.' : needsConfirm && !confirmed ? 'Tick that the parent agreed by phone.' : ''}</p>}
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-block p-4 bg-white border-2 border-teal-200 rounded-2xl mb-3"><QRImg text={issued.passCode} id={`gp-qr-${issued.id}`} /></div>
            <div className="font-mono font-bold text-sm bg-teal-50 rounded-xl py-2 mb-2">{issued.passCode}</div>
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 mb-3 text-sm">
              <div className="text-xs font-bold text-teal-700 uppercase tracking-wide">Release {issued.student?.name} to</div>
              <div className="text-lg font-extrabold text-slate-900" dir="auto">{issued.parentName}{issued.relation ? <span className="text-sm font-semibold text-teal-700"> · {issued.relation}</span> : null}</div>
              <div className="text-xs text-slate-600">{[issued.pickupPhone, issued.pickupCnic && `CNIC ${issued.pickupCnic}`, issued.reason, dayText(issued.validDate)].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => printPass(issued)} className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 text-white font-bold py-2.5 rounded-xl text-sm"><Printer className="w-4 h-4" /> Print pass</button>
              <button type="button" onClick={() => setIssued(null)} className="flex-1 border border-slate-200 font-bold py-2.5 rounded-xl text-sm text-slate-600">+ New pass</button>
            </div>
          </div>
        )}
      </section>

      {/* The gate */}
      <div className="space-y-4">
        <section className="bg-slate-900 rounded-2xl p-5 text-white" aria-label="Gatekeeper verify">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal-400" /> At the gate: scan the pass</h3>
          <div className="flex gap-2">
            <input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="Scan the QR, or type the code (GP-…)" aria-label="Pass code"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm placeholder:text-slate-400 outline-none font-mono"
              onKeyDown={(e) => e.key === 'Enter' && verifyCode.trim() && verify.mutate()} />
            <button type="button" onClick={() => verify.mutate()} disabled={!verifyCode.trim() || verify.isPending} className="px-5 bg-teal-500 rounded-xl font-bold text-sm disabled:opacity-40">Verify</button>
          </div>
          {verifyResult && (
            <div className={`mt-3 rounded-xl p-3 text-sm ${verifyResult.ok ? 'bg-teal-500/20' : 'bg-red-500/20'}`} role="status">
              <div className={`font-bold flex items-center gap-2 ${verifyResult.ok ? 'text-teal-300' : 'text-red-300'}`}>
                {verifyResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {verifyResult.ok ? 'RELEASE AUTHORISED' : verifyResult.message}
              </div>
              {v?.student && (
                <div className="mt-2 flex gap-3 items-center">
                  {v.student.photoUrl ? <img src={v.student.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-white/10 grid place-items-center"><UserRound className="w-5 h-5" /></div>}
                  <div className="min-w-0">
                    <div className="font-bold truncate">{v.student.name}</div>
                    <div className="text-xs text-slate-300 truncate">{[v.student.className, v.student.sectionName].filter(Boolean).join(' — ')}{v.student.rollNo ? ` · Roll ${v.student.rollNo}` : ''}</div>
                  </div>
                </div>
              )}
              {v?.pickup?.name && (
                <div className="mt-2 rounded-lg bg-white/10 p-2.5">
                  <div className="text-[11px] uppercase tracking-wide text-slate-300 font-semibold">{verifyResult.ok ? 'Release only to' : 'The pass was for'}</div>
                  <div className="text-base font-extrabold" dir="auto">{v.pickup.name}{v.pickup.relation ? <span className="text-teal-300 text-sm font-semibold"> · {v.pickup.relation}</span> : null}</div>
                  <div className="text-xs text-slate-300">{[v.pickup.phone && `Phone ${v.pickup.phone}`, v.pickup.cnic && `CNIC ${v.pickup.cnic}`].filter(Boolean).join(' · ') || 'Ask for their CNIC'}</div>
                  <div className={`text-xs font-semibold mt-1 ${v.pickup.onRecord ? 'text-emerald-300' : 'text-amber-300'}`}>{v.pickup.onRecord ? "On the student's record" : v.pickup.parentConfirmed ? 'Not on the record: the parent agreed by phone' : 'Not on the record'}</div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 max-h-96 overflow-y-auto" aria-label="Recent passes">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Recent passes</h3>
          {passes.map((p) => {
            const [word, tone] = STATUS[p.status] || [p.status, 'bg-slate-100 text-slate-600'];
            return (
              <div key={p.id} className="py-2 border-b border-slate-50 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 font-semibold text-slate-700 truncate">{p.student?.name || 'Student'} <span className="font-normal text-slate-500">→ {p.parentName}{p.relation ? ` (${p.relation})` : ''}</span></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone}`}>{word.toUpperCase()}</span>
                  {p.status === 'active' && (revoking === p.id ? (
                    <span className="flex gap-1">
                      <button type="button" onClick={() => revoke.mutate({ id: p.id })} disabled={revoke.isPending} className="text-[10px] font-bold bg-red-600 text-white rounded px-2 py-0.5">Yes, cancel</button>
                      <button type="button" onClick={() => setRevoking(null)} aria-label="Keep the pass" className="text-slate-400"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setRevoking(p.id)} className="text-[10px] font-bold border border-red-200 text-red-600 rounded px-2 py-0.5 hover:bg-red-50">Cancel</button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400">{dayText(p.validDate)}{p.reason ? ` · ${p.reason}` : ''}{p.status === 'used' && p.usedAt ? ` · released ${timeText(p.usedAt)}` : ''} · <span className="font-mono">{p.passCode.slice(-8)}</span></div>
              </div>
            );
          })}
          {!passes.length && <p className="text-xs text-slate-400 text-center py-4">No passes have been issued yet.</p>}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 max-h-72 overflow-y-auto" aria-label="Gate pass history">
          <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><History className="w-4 h-4 text-slate-500" /> History</h3>
          {auditLogs.slice(0, 30).map((log) => (
            <div key={log.id} className="py-2 border-b border-slate-50">
              <div className="text-xs font-semibold text-slate-700">{log.label}{log.studentName ? `: ${log.studentName}` : ''}{log.pickup ? ` → ${log.pickup}` : ''}</div>
              <div className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}{log.byName ? ` · ${log.byName}` : ''}{log.passCode ? ` · ${log.passCode.slice(-8)}` : ''}</div>
            </div>
          ))}
          {!auditLogs.length && <p className="text-xs text-slate-400 text-center py-4">Nothing yet.</p>}
        </section>
      </div>
    </div>
  );
}
