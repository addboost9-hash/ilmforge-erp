/**
 * The Visitor Desk (/visitor-desk; reception accounts: /gatekeeper-portal/visitors).
 *
 * Everyone who comes to the school is written down here, or fills the kiosk
 * and is confirmed here:
 *   - the CNIC finds a visitor who came before (and the mobile, without one);
 *   - a parent's children are found by the FATHER's CNIC (whoever comes), or
 *     by name; a child whose record lacks the father's details can have them
 *     saved, after the admin approves;
 *   - why they came, what they said, the office's own notes;
 *   - a slip with a QR code; at the gate the QR or the number checks them out,
 *     with the result (resolved, follow-up…);
 *   - nothing stops when a device does: no camera → no photo; no scanner →
 *     type the number; no internet → the paper register, written in later.
 * The admin also has the live feed, the approvals and the kiosk tablets.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, UserCheck, LogOut, QrCode, Printer, Search, X, CheckCircle2, AlertTriangle, Clock, Tablet,
  ClipboardList, Radio, ShieldCheck, FileText, Copy, Trash2, Users, Plus,
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { printHTML } from '../../utils/print';
import {
  typeCnic, isRealCnic, cnicDigits, typePhone, rs, timeOf, dayOf, pkToday, pkDateTime, waited,
  reasonStyle, qrPicture, slipDocument, paperRegisterDocument,
} from '../../utils/visitorDesk';
import CameraCapture from '../../components/visitors/CameraCapture';
import QrScanner from '../../components/visitors/QrScanner';
import VisitorFeed, { FEED_KEY } from '../../components/visitors/VisitorFeed';

const NAVY = '#1B2F6E';
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };
const hint = { fontWeight: 400, color: '#64748B', fontSize: 11.5 };
const panel = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 };
const Err = ({ msg }) => (msg ? <span role="alert" style={{ color: '#B91C1C', fontSize: 12, fontWeight: 500 }}>{msg}</span> : null);
const OPTIONS_KEY = ['visitor-desk-options'];
const LISTS = ['visitor-desk-visits'];

function useOptions() {
  return useQuery({ queryKey: OPTIONS_KEY, queryFn: () => api.get('/visitor-desk/options').then((r) => r.data.data), staleTime: 5 * 60_000 });
}
const refreshLists = (qc) => { qc.invalidateQueries({ queryKey: LISTS }); qc.invalidateQueries({ queryKey: FEED_KEY }); };

/* Prints a visit's slip (its QR code made first). */
async function printSlip({ visit, qr, gatePasses = [] }, school) {
  const pic = qr ? (qr.startsWith('data:') ? qr : await qrPicture(qr)) : '';
  printHTML(slipDocument({ visit, qr: pic, school: school || {}, gatePasses }), { title: `Visitor slip ${visit.slipNo}` });
}

/* ═══ Children: by the father's CNIC, or by name ═══════════════════════ */

function ChildCard({ c, chosen, onToggle, showDues, isAdmin }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, borderRadius: 10, border: `1.5px solid ${chosen ? NAVY : '#E2E8F0'}`, background: chosen ? '#EEF2FF' : '#fff', cursor: 'pointer' }}>
      <input type="checkbox" checked={chosen} onChange={onToggle} aria-label={`Choose ${c.name}`} />
      {c.photoUrl ? <img src={c.photoUrl} alt="" style={{ width: 38, height: 46, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ width: 38, height: 46, borderRadius: 6, background: '#F1F5F9', display: 'grid', placeItems: 'center', color: '#94A3B8' }}><Users size={16} /></div>}
      <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 13.5 }} dir="auto">{c.name}</strong>
        <span style={{ fontSize: 12, color: '#475569' }}>{c.className}{c.rollNo ? ` · Roll ${c.rollNo}` : ''}</span>
        <span style={{ fontSize: 11.5, color: '#64748B' }} dir="auto">{c.fatherName ? `Father: ${c.fatherName}` : 'Father\'s name not on the record'}</span>
        {showDues && c.dues !== undefined && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: c.dues > 0 ? '#B45309' : '#15803D' }}>
            {c.dues > 0 ? `Fee due: ${rs(c.dues)}` : 'No fee due'}
            {isAdmin && c.dues > 0 && <> · <Link to={`/fees/collect?student=${c.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Fee counter</Link></>}
          </span>
        )}
      </span>
    </label>
  );
}

function ChildPicker({ reason, ownKids, fatherCnic, setFatherCnic, chosen, setChosen, error, isAdmin }) {
  const [cnicKids, setCnicKids] = useState(null);
  const [cnicMsg, setCnicMsg] = useState('');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const toggle = (c) => setChosen((list) => (list.some((x) => x.id === c.id) ? list.filter((x) => x.id !== c.id) : [...list, c]));
  const has = (c) => chosen.some((x) => x.id === c.id);

  const findByCnic = async () => {
    setCnicMsg('');
    try {
      const r = await api.get('/visitor-desk/children', { params: { cnic: fatherCnic } });
      setCnicKids(r.data.data);
      if (r.data.filler) setCnicMsg(r.data.message);
      else if (!r.data.data.length) setCnicMsg('No child of the school has this CNIC on the record. Find the child by name below.');
    } catch (e) { setCnicMsg(e.response?.data?.message || 'Could not search.'); }
  };
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setHits([]); return; }
      try { setHits((await api.get('/visitor-desk/students', { params: { q }, silent: true })).data.data); } catch { setHits([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const showDues = reason === 'fee';
  const list = (kids) => (
    <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
      {kids.map((c) => <ChildCard key={c.id} c={c} chosen={has(c)} onToggle={() => toggle(c)} showDues={showDues} isAdmin={isAdmin} />)}
    </div>
  );
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {ownKids?.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#15803D' }}>Children with this CNIC on their record</span>
          {list(ownKids)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ ...label, flex: '1 1 200px' }}>Child's father's CNIC <span style={hint}>Whoever has come (mother, uncle…), the father's CNIC finds the children.</span>
          <input className="form-input" inputMode="numeric" value={fatherCnic} placeholder="35202-1234567-1" onChange={(e) => setFatherCnic(typeCnic(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findByCnic(); } }} />
        </label>
        <button type="button" className="btn btn-outline" disabled={cnicDigits(fatherCnic).length !== 13} onClick={findByCnic}><Search size={14} /> Find children</button>
      </div>
      {cnicMsg && <span style={{ fontSize: 12.5, color: '#92400E' }}>{cnicMsg}</span>}
      {cnicKids?.length > 0 && list(cnicKids)}
      <label style={label}>Or find the child by name, roll number or B-Form
        <input className="form-input" value={q} placeholder="e.g. Zaria Khan, or 9-014" onChange={(e) => setQ(e.target.value)} />
      </label>
      {hits.length > 0 && list(hits)}
      {chosen.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Chosen:</span>
          {chosen.map((c) => (
            <span key={c.id} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12.5, background: '#EEF2FF', color: NAVY, borderRadius: 999, padding: '3px 6px 3px 10px', fontWeight: 600 }}>
              {c.name} ({c.className})
              <button type="button" onClick={() => toggle(c)} aria-label={`Remove ${c.name}`} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: NAVY, display: 'grid' }}><X size={13} /></button>
            </span>
          ))}
        </div>
      )}
      <Err msg={error} />
    </div>
  );
}

/* The father's details for a child whose record lacks them (photo
   registrations: father "." and CNIC 11111-1111111-1). */
function RecordUpdates({ chosen, updates, setUpdates }) {
  const lacking = chosen.filter((c) => !c.fatherName || !c.fatherCnicKnown || !c.phoneKnown);
  if (!lacking.length) return null;
  const set = (id, patch) => setUpdates((u) => ({ ...u, [id]: { ...(u[id] || {}), ...patch } }));
  return (
    <div style={{ display: 'grid', gap: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
        <AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {lacking.length === 1 ? 'This child\'s record lacks' : 'These children\'s records lack'} the father's details. Ask and write them here: they are saved to the record once the admin approves.
      </div>
      {lacking.map((c) => {
        const u = updates[c.id] || {};
        return (
          <div key={c.id} style={{ display: 'grid', gap: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 700 }}>
              <input type="checkbox" checked={u.save !== false} onChange={(e) => set(c.id, { save: e.target.checked })} /> {c.name} ({c.className})
            </label>
            {u.save !== false && (
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {!c.fatherName && <label style={label}>Father's name<input className="form-input" value={u.fatherName || ''} maxLength={100} onChange={(e) => set(c.id, { fatherName: e.target.value })} /></label>}
                {!c.fatherCnicKnown && <label style={label}>Father's CNIC<input className="form-input" inputMode="numeric" value={u.fatherCnic || ''} placeholder="35202-1234567-1" onChange={(e) => set(c.id, { fatherCnic: typeCnic(e.target.value) })} /></label>}
                {!c.phoneKnown && <label style={label}>Parent's mobile<input className="form-input" inputMode="tel" value={u.phone || ''} placeholder="0300 1234567" onChange={(e) => set(c.id, { phone: typePhone(e.target.value) })} /></label>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══ A new visit ══════════════════════════════════════════════════════ */

const EMPTY = {
  cnic: '', noCnic: false, name: '', phone: '', address: '', city: '', photoUrl: null, cnicPhotoUrl: null,
  reason: '', detail: '', childName: '', hostName: '', vehicleNo: '', relation: '', fatherCnic: '', remarks: '', staffNotes: '',
};

function NewVisit({ options, onSaved }) {
  const qc = useQueryClient();
  const [f, setF] = useState(EMPTY);
  const [found, setFound] = useState(null); // { visitor, children, filler }
  const [method, setMethod] = useState('manual');
  const [chosen, setChosen] = useState([]);
  const [updates, setUpdates] = useState({});
  const [errors, setErrors] = useState({});
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const o = options || {};
  const childReason = (o.childReasons || []).includes(f.reason);

  // A CNIC (or, without one, a mobile) finds a visitor who came before.
  useEffect(() => {
    const byCnic = !f.noCnic && cnicDigits(f.cnic).length === 13;
    const byPhone = f.noCnic && f.phone.replace(/\D/g, '').length >= 11;
    if (!byCnic && !byPhone) { setFound(null); return undefined; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/visitor-desk/lookup', { params: byCnic ? { cnic: f.cnic } : { phone: f.phone }, silent: true });
        const d = r.data.data;
        setFound(d);
        if (d.visitor) {
          setMethod(byCnic ? 'cnic' : 'phone');
          setF((x) => ({ ...x, name: x.name || d.visitor.name, phone: x.phone || typePhone(d.visitor.phone.replace(/^\+92/, '0')), city: x.city || d.visitor.city }));
        }
      } catch { setFound(null); }
    }, 350);
    return () => clearTimeout(t);
  }, [f.cnic, f.noCnic, f.phone]);

  // The father's details offered for the records: the visitor's own when he
  // is the father (the mobile also when the mother came). Only empty boxes
  // are filled, so what the desk typed stays, whichever was chosen first.
  useEffect(() => {
    setUpdates((u) => {
      const next = { ...u };
      const def = f.relation === 'father'
        ? { fatherName: f.name, fatherCnic: isRealCnic(f.cnic) ? f.cnic : '', phone: f.phone }
        : f.relation === 'mother' ? { phone: f.phone } : {};
      for (const c of chosen) {
        const merged = { ...(next[c.id] || {}) };
        for (const [k, v] of Object.entries(def)) if (!merged[k] && v) merged[k] = v;
        next[c.id] = merged;
      }
      return next;
    });
  }, [chosen, f.relation]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => api.post('/visitor-desk/visits', {
      visitor: { name: f.name, cnic: f.noCnic ? '' : f.cnic, phone: f.phone, address: f.address, city: f.city, photoUrl: f.photoUrl, cnicPhotoUrl: f.cnicPhotoUrl },
      noCnic: f.noCnic, reason: f.reason, detail: f.detail, childName: f.childName, hostName: f.hostName, vehicleNo: f.vehicleNo,
      relation: f.relation, fatherCnic: f.fatherCnic || f.cnic, studentIds: chosen.map((c) => c.id),
      remarks: f.remarks, staffNotes: f.staffNotes, method,
      recordUpdates: chosen.map((c) => ({ studentId: c.id, ...(updates[c.id] || {}) })).filter((u) => u.save !== false),
    }).then((r) => r.data),
    onSuccess: async (r) => {
      refreshLists(qc);
      const qr = await qrPicture(r.data.qr).catch(() => '');
      onSaved({ ...r.data, qr, message: r.message });
      setF(EMPTY); setFound(null); setChosen([]); setUpdates({}); setErrors({}); setMethod('manual');
    },
    onError: (e) => {
      setErrors(e.response?.data?.errors || {});
      toast.error(e.response?.data?.message || 'Could not save the visit.');
    },
  });

  const v = found?.visitor;
  const isNew = !v;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} style={{ display: 'grid', gap: 14 }} aria-label="New visitor">
      {/* Who */}
      <section style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>1. The visitor</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div style={label}>
            <label htmlFor="vd-cnic">CNIC</label>
            <input id="vd-cnic" className="form-input" inputMode="numeric" autoFocus value={f.cnic} disabled={f.noCnic} placeholder="35202-1234567-1" onChange={(e) => set({ cnic: typeCnic(e.target.value) })} aria-invalid={!!errors.cnic} />
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 400 }}>
              <input type="checkbox" id="vd-nocnic" checked={f.noCnic} onChange={(e) => set({ noCnic: e.target.checked, cnic: '' })} />
              <label htmlFor="vd-nocnic" style={{ fontSize: 12 }}>No CNIC (the mobile number finds them instead)</label>
            </span>
            <Err msg={errors.cnic} />
            {found?.filler && <span style={{ fontSize: 12, color: '#B45309' }}>This is a stand-in CNIC, not a real one.</span>}
          </div>
          <label style={label}>Mobile
            <input className="form-input" inputMode="tel" value={f.phone} placeholder="0300 1234567" onChange={(e) => set({ phone: typePhone(e.target.value) })} />
            <Err msg={errors.phone} />
          </label>
          <label style={label}>Name
            <input className="form-input" value={f.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
            <Err msg={errors.name} />
          </label>
        </div>
        {v && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '8px 12px' }}>
            {v.photoUrl ? <img src={v.photoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 999 }} /> : <UserCheck size={22} color="#15803D" />}
            <span style={{ fontSize: 13, color: '#14532D' }}>
              <strong>Came before:</strong> {v.name}, {v.visitCount} visit{v.visitCount === 1 ? '' : 's'}{v.lastVisitAt ? `, last on ${dayOf(v.lastVisitAt)}` : ''}
              {v.recent?.[0] && ` (${v.recent[0].reasonLabel}${v.recent[0].outcomeLabel ? `, ${v.recent[0].outcomeLabel.toLowerCase()}` : ''})`}.
              {v.address && <> Address: {v.address}{v.city ? `, ${v.city}` : ''}.</>}
            </span>
          </div>
        )}
        {isNew && (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(200px, 2fr) minmax(140px, 1fr)' }}>
            <label style={label}>Address <span style={hint}>First visit: needed (not for a delivery).</span>
              <input className="form-input" value={f.address} maxLength={200} onChange={(e) => set({ address: e.target.value })} />
              <Err msg={errors.address} />
            </label>
            <label style={label}>City<input className="form-input" value={f.city} maxLength={60} onChange={(e) => set({ city: e.target.value })} /></label>
          </div>
        )}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <CameraCapture label="Visitor's photo" value={f.photoUrl} onChange={(p) => set({ photoUrl: p })} />
          <CameraCapture label="CNIC card photo" facing="environment" value={f.cnicPhotoUrl} onChange={(p) => set({ cnicPhotoUrl: p })} />
        </div>
      </section>

      {/* Why */}
      <section style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>2. Why they came</h3>
        <div role="radiogroup" aria-label="Why they came" style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {Object.entries(o.reasons || {}).map(([k, t]) => {
            const st = reasonStyle(k);
            const on = f.reason === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => set({ reason: k, detail: '' })}
                style={{ textAlign: 'left', padding: '9px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1.5px solid ${on ? st.color : '#E2E8F0'}`, background: on ? `${st.color}14` : '#fff', color: on ? st.color : '#334155' }}>
                {st.icon} {t}
              </button>
            );
          })}
        </div>
        <Err msg={errors.reason} />
        {f.reason === 'complaint' && (
          <label style={{ ...label, maxWidth: 320 }}>What is the complaint about?
            <select className="form-select" value={f.detail} onChange={(e) => set({ detail: e.target.value })}>
              <option value="">Choose…</option>
              {Object.entries(o.complaintTypes || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
            <Err msg={errors.detail} />
          </label>
        )}
        {f.reason === 'admission' && (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label style={label}>Child to be admitted<input className="form-input" value={f.childName} maxLength={80} onChange={(e) => set({ childName: e.target.value })} /></label>
            <label style={label}>Class
              <select className="form-select" value={f.detail} onChange={(e) => set({ detail: e.target.value })}>
                <option value="">Not decided</option>
                {(o.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        )}
        {f.reason && f.reason !== 'admission' && (
          <label style={{ ...label, maxWidth: 360 }}>{f.reason === 'meet_teacher' ? 'Which teacher' : 'To meet (optional)'}
            <input className="form-input" list="vd-staff" value={f.hostName} maxLength={80} onChange={(e) => set({ hostName: e.target.value })} />
            <datalist id="vd-staff">{(o.staff || []).map((s) => <option key={s} value={s} />)}</datalist>
          </label>
        )}
      </section>

      {/* Which child */}
      {childReason && (
        <section style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>3. The child {(o.needsChild || []).includes(f.reason) ? '' : <span style={hint}>(if it is about a child)</span>}</h3>
          <ChildPicker reason={f.reason} ownKids={found?.children} fatherCnic={f.fatherCnic} setFatherCnic={(c) => set({ fatherCnic: c })} chosen={chosen} setChosen={setChosen} error={errors.studentIds} isAdmin={o.isAdmin} />
          {chosen.length > 0 && (
            <label style={{ ...label, maxWidth: 260 }}>The visitor is the child's
              <select className="form-select" value={f.relation} onChange={(e) => set({ relation: e.target.value })}>
                <option value="">Choose…</option>
                {Object.entries(o.relations || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
              <Err msg={errors.relation} />
            </label>
          )}
          {f.reason === 'early_pickup' && chosen.length > 0 && <span style={{ fontSize: 12.5, color: '#9A3412' }}>A gate pass is made for each child whose record has this CNIC (the visitor's, or the father's typed above). Others: check with the office first.</span>}
          <RecordUpdates chosen={chosen} updates={updates} setUpdates={setUpdates} />
        </section>
      )}

      {/* What they said */}
      <section style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: NAVY }}>{childReason ? '4' : '3'}. Remarks</h3>
        <label style={label}>What the visitor said <span style={hint}>Shown on the admin's live feed{f.reason === 'complaint' ? ' and in the complaint' : ''}.</span>
          <textarea className="form-input" rows={3} maxLength={1000} dir="auto" value={f.remarks} placeholder={f.reason === 'complaint' ? 'e.g. Van roz late aati hai, 7:50 ke baad pohanchti hai' : ''} onChange={(e) => set({ remarks: e.target.value })} />
        </label>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(200px, 3fr) minmax(120px, 1fr)' }}>
          <label style={label}>Office notes <span style={hint}>Only the office sees these, never the visitor.</span>
            <textarea className="form-input" rows={2} maxLength={1000} value={f.staffNotes} onChange={(e) => set({ staffNotes: e.target.value })} />
          </label>
          <label style={label}>Vehicle no. <span style={hint}>Optional</span><input className="form-input" value={f.vehicleNo} maxLength={20} onChange={(e) => set({ vehicleNo: e.target.value.toUpperCase() })} /></label>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={() => { setF(EMPTY); setFound(null); setChosen([]); setUpdates({}); setErrors({}); }}>Clear</button>
        <button type="submit" className="btn btn-primary" disabled={save.isPending}><UserCheck size={15} /> {save.isPending ? 'Saving…' : 'Check in'}</button>
      </div>
    </form>
  );
}

/* What was just saved: the slip to print, and what the visit started. */
function Saved({ result, onNext }) {
  const school = useAuthStore((s) => s.school);
  const printRef = useRef(null);
  useEffect(() => { printRef.current?.focus(); }, []);
  const v = result.visit;
  return (
    <div style={{ display: 'grid', gap: 12 }} aria-live="polite">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <CheckCircle2 size={30} color="#15803D" />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: NAVY, fontFamily: 'Consolas, monospace' }}>{v.slipNo}</div>
          <div style={{ fontSize: 14 }}><strong>{v.visitorName}</strong> checked in · {v.reasonLabel}{v.students.length ? ` · ${v.students.map((s) => s.name).join(', ')}` : ''}</div>
        </div>
      </div>
      {result.message && <div style={{ fontSize: 13, color: '#334155', background: '#F8FAFC', borderRadius: 10, padding: '8px 12px' }}>{result.message}</div>}
      {result.unverified?.length > 0 && <div role="alert" style={{ fontSize: 13, color: '#9A3412', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '8px 12px' }}><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> Do not release {result.unverified.map((u) => u.name).join(', ')} until the office has checked.</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button ref={printRef} type="button" className="btn btn-primary" onClick={() => printSlip(result, school)}><Printer size={15} /> Print the slip</button>
        <button type="button" className="btn btn-outline" onClick={onNext}><Plus size={15} /> Next visitor</button>
      </div>
      <span style={{ fontSize: 12, color: '#64748B' }}>No printer? Tell the visitor the number <strong>{v.slipNo}</strong>: at the gate, the number checks them out.</span>
    </div>
  );
}

/* ═══ Leaving ══════════════════════════════════════════════════════════ */

function CheckoutBox({ outcomes }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [outcome, setOutcome] = useState('');
  const [scan, setScan] = useState(false);
  const go = useMutation({
    mutationFn: (c) => api.post('/visitor-desk/checkout', { code: c, ...(outcome && { outcome }) }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setCode(''); setOutcome(''); refreshLists(qc); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not check out.'),
  });
  // Stable, so the camera is not restarted at every render.
  const goRef = useRef(go.mutate);
  goRef.current = go.mutate;
  const onCode = useCallback((c) => { setScan(false); goRef.current(c); }, []);
  return (
    <div style={{ ...panel, display: 'grid', gap: 8 }}>
      <strong style={{ fontSize: 14, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}><LogOut size={16} /> Leaving</strong>
      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) go.mutate(code.trim()); }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: '1 1 140px' }} value={code} placeholder="Slip no. (V-1042) or scan" aria-label="Slip number or QR code" onChange={(e) => setCode(e.target.value)} />
        <select className="form-select" style={{ flex: '0 1 150px' }} value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Result of the visit">
          <option value="">Result…</option>
          {Object.entries(outcomes || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!code.trim() || go.isPending}>Check out</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setScan((s) => !s)}><QrCode size={14} /> Camera</button>
      </form>
      {scan && <QrScanner onCode={onCode} onClose={() => setScan(false)} />}
      <span style={{ fontSize: 11.5, color: '#64748B' }}>A USB scanner types the code here by itself. No slip? Use Check out in the list below.</span>
    </div>
  );
}

function VisitRow({ v, outcomes, children }) {
  const st = reasonStyle(v.reason);
  return (
    <div style={{ display: 'grid', gap: 4, padding: '9px 10px', borderRadius: 10, border: '1px solid #E2E8F0', borderLeft: `4px solid ${v.urgent && v.inside ? '#DC2626' : st.color}`, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5 }}>
          <strong dir="auto">{v.visitorName}</strong> <span style={{ color: '#94A3B8', fontFamily: 'Consolas, monospace', fontSize: 12 }}>{v.slipNo}</span>
          {v.urgent && v.inside && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 800, color: '#fff', background: '#DC2626', borderRadius: 6, padding: '1px 6px' }}>URGENT</span>}
        </span>
        <span style={{ fontSize: 12, color: '#64748B', display: 'flex', gap: 4, alignItems: 'center' }}><Clock size={12} /> {timeOf(v.checkinAt)} · {waited(v.minutes)}</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#475569' }}>
        <span style={{ color: st.color, fontWeight: 700 }}>{st.icon} {v.reasonLabel}</span>{v.detailLabel ? ` › ${v.detailLabel}` : ''}
        {v.students.length > 0 && ` · ${v.students.map((s) => `${s.name} (${s.className})`).join(', ')}`}
        {v.hostName && ` · to meet ${v.hostName}`}
      </div>
      {v.remarks && <div dir="auto" style={{ fontSize: 12.5, fontStyle: 'italic', color: '#334155' }}>"{v.remarks}"</div>}
      {children}
    </div>
  );
}

function InsideList({ outcomes }) {
  const qc = useQueryClient();
  const school = useAuthStore((s) => s.school);
  const [open, setOpen] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const { data } = useQuery({
    queryKey: [...LISTS, 'inside'],
    queryFn: () => api.get('/visitor-desk/visits', { params: { scope: 'inside' }, silent: true }).then((r) => r.data),
    refetchInterval: 20_000,
  });
  const out = useMutation({
    mutationFn: (id) => api.post(`/visitor-desk/visits/${id}/checkout`, { ...(outcome && { outcome }), ...(note.trim() && { staffNotes: note.trim() }) }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setOpen(null); setOutcome(''); setNote(''); refreshLists(qc); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not check out.'),
  });
  const reprint = async (v) => {
    try {
      const d = (await api.get(`/visitor-desk/visits/${v.id}`)).data.data;
      await printSlip({ visit: d, qr: d.qr }, school);
    } catch { toast.error('Could not print the slip.'); }
  };
  const list = data?.data || [];
  return (
    <div style={{ ...panel, display: 'grid', gap: 8 }}>
      <strong style={{ fontSize: 14, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Inside now ({list.length})</strong>
      {!list.length && <span style={{ fontSize: 12.5, color: '#64748B' }}>No visitor is inside.</span>}
      <div style={{ display: 'grid', gap: 6, maxHeight: 560, overflowY: 'auto' }}>
        {list.map((v) => (
          <VisitRow key={v.id} v={v} outcomes={outcomes}>
            {open === v.id ? (
              <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                <div role="radiogroup" aria-label="Result" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(outcomes || {}).map(([k, t]) => (
                    <button key={k} type="button" role="radio" aria-checked={outcome === k} onClick={() => setOutcome(k)} className="btn btn-sm" style={{ border: `1.5px solid ${outcome === k ? NAVY : '#CBD5E1'}`, background: outcome === k ? '#EEF2FF' : '#fff', color: NAVY }}>{t}</button>
                  ))}
                </div>
                <input className="form-input" value={note} placeholder="Office note (optional)" onChange={(e) => setNote(e.target.value)} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-primary btn-sm" disabled={out.isPending} onClick={() => out.mutate(v.id)}>Check out</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { setOpen(v.id); setOutcome(''); setNote(''); }}><LogOut size={13} /> Check out</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => reprint(v)}><Printer size={13} /> Slip</button>
              </div>
            )}
          </VisitRow>
        ))}
      </div>
    </div>
  );
}

/* Kiosk entries waiting for reception. */
function KioskQueue({ onSaved }) {
  const qc = useQueryClient();
  const [host, setHost] = useState({});
  const { data } = useQuery({
    queryKey: [...LISTS, 'pending'],
    queryFn: () => api.get('/visitor-desk/visits', { params: { scope: 'pending' }, silent: true }).then((r) => r.data),
    refetchInterval: 10_000,
  });
  const confirm = useMutation({
    mutationFn: (id) => api.post(`/visitor-desk/visits/${id}/confirm`, { hostName: host[id] || '' }).then((r) => r.data),
    onSuccess: async (r) => { refreshLists(qc); onSaved({ ...r.data, qr: await qrPicture(r.data.qr).catch(() => ''), message: r.message }); },
    onError: (e) => { toast.error(e.response?.data?.message || 'Could not confirm.'); refreshLists(qc); },
  });
  const cancel = useMutation({
    mutationFn: (id) => api.post(`/visitor-desk/visits/${id}/cancel`).then((r) => r.data),
    onSuccess: () => { toast.success('Kiosk entry removed.'); refreshLists(qc); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not remove it.'),
  });
  const list = data?.data || [];
  if (!list.length) return null;
  return (
    <div style={{ ...panel, display: 'grid', gap: 8, borderColor: '#FCD34D', background: '#FFFBEB' }}>
      <strong style={{ fontSize: 14, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}><Tablet size={16} /> From the kiosk ({list.length})</strong>
      {list.map((v) => (
        <VisitRow key={v.id} v={v}>
          <div style={{ fontSize: 12, color: '#64748B' }}>CNIC {v.cnic || '—'} · {v.phone || 'no mobile'} · waiting {waited(v.minutes)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <input className="form-input" style={{ flex: '1 1 140px', padding: '5px 8px', fontSize: 12.5 }} placeholder="To meet (optional)" value={host[v.id] || ''} onChange={(e) => setHost((h) => ({ ...h, [v.id]: e.target.value }))} />
            <button type="button" className="btn btn-primary btn-sm" disabled={confirm.isPending} onClick={() => confirm.mutate(v.id)}><CheckCircle2 size={13} /> Confirm</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => cancel.mutate(v.id)} aria-label={`Remove the kiosk entry of ${v.visitorName}`}><X size={13} /></button>
          </div>
        </VisitRow>
      ))}
    </div>
  );
}

/* ═══ The day's list ═══════════════════════════════════════════════════ */

function DayList({ options }) {
  const qc = useQueryClient();
  const school = useAuthStore((s) => s.school);
  const [date, setDate] = useState(pkToday());
  const [q, setQ] = useState('');
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(null);
  const [edit, setEdit] = useState({ staffNotes: '', outcome: '' });
  const { data, isLoading } = useQuery({
    queryKey: [...LISTS, 'day', date, q],
    queryFn: () => api.get('/visitor-desk/visits', { params: { scope: 'date', date, ...(q.trim() && { q: q.trim() }) } }).then((r) => r.data),
  });
  const { data: detail } = useQuery({
    queryKey: [...LISTS, 'one', open],
    queryFn: () => api.get(`/visitor-desk/visits/${open}`).then((r) => r.data.data),
    enabled: !!open,
  });
  useEffect(() => { if (detail) setEdit({ staffNotes: detail.staffNotes || '', outcome: detail.outcome || '' }); }, [detail]);
  const saveNotes = useMutation({
    mutationFn: () => api.put(`/visitor-desk/visits/${open}/notes`, edit).then((r) => r.data),
    onSuccess: () => { toast.success('Saved.'); refreshLists(qc); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save.'),
  });
  const rows = (data?.data || []).filter((v) => !reason || v.reason === reason);
  return (
    <div style={{ ...panel, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={label}>Date<input type="date" className="form-input" value={date} max={pkToday()} onChange={(e) => setDate(e.target.value)} /></label>
        <label style={{ ...label, flex: '1 1 200px' }}>Search<input className="form-input" value={q} placeholder="Name, mobile or CNIC" onChange={(e) => setQ(e.target.value)} /></label>
        <label style={label}>Came for
          <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">All</option>
            {Object.entries(options?.reasons || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
      </div>
      {isLoading ? <span style={{ fontSize: 13, color: '#64748B' }}>Loading…</span> : !rows.length ? <span style={{ fontSize: 13, color: '#64748B' }}>No visitors on {dayOf(`${date}T12:00:00+05:00`)}.</span> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }} aria-label="Visitors of the day">
            <thead><tr style={{ textAlign: 'left', color: '#64748B' }}>{['In', 'Slip', 'Visitor', 'CNIC', 'Came for', 'Child', 'Remarks', 'Out', 'Result'].map((h) => <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} onClick={() => setOpen(open === v.id ? null : v.id)} style={{ cursor: 'pointer', background: open === v.id ? '#EEF2FF' : v.status === 'cancelled' ? '#F8FAFC' : undefined, color: v.status === 'cancelled' ? '#94A3B8' : undefined }}>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{timeOf(v.checkinAt)}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'Consolas, monospace' }}>{v.slipNo}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }} dir="auto">{v.visitorName}{v.source === 'kiosk' ? ' 📱' : v.source === 'late' ? ' 📝' : ''}</td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{v.cnic || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{v.reasonLabel}{v.detailLabel ? ` › ${v.detailLabel}` : ''}</td>
                  <td style={{ padding: '6px 8px' }}>{v.students.map((s) => s.name).join(', ') || v.childName || '—'}</td>
                  <td style={{ padding: '6px 8px', maxWidth: 260 }} dir="auto">{v.remarks || '—'}</td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{v.status === 'cancelled' ? 'Cancelled' : v.inside ? 'Inside' : timeOf(v.checkoutAt)}</td>
                  <td style={{ padding: '6px 8px' }}>{v.outcomeLabel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && detail && (
        <div style={{ display: 'grid', gap: 10, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {detail.photoUrl && <img src={detail.photoUrl} alt="Visitor" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 10 }} />}
            {detail.cnicPhotoUrl && <img src={detail.cnicPhotoUrl} alt="CNIC card" style={{ height: 70, borderRadius: 8 }} />}
            <div style={{ fontSize: 13, display: 'grid', gap: 2 }}>
              <strong>{detail.visitorName} <span style={{ fontFamily: 'Consolas, monospace', color: '#64748B' }}>{detail.slipNo}</span></strong>
              <span>{[detail.phone, detail.address, detail.city].filter(Boolean).join(' · ') || '—'}</span>
              <span>{detail.visitCount ? `${detail.visitCount} visit${detail.visitCount === 1 ? '' : 's'} in all` : ''}{detail.recordedByName ? ` · written by ${detail.recordedByName}` : ''}</span>
              {detail.link?.type === 'complaint' && <Link to="/complaints">Open the complaint</Link>}
              {detail.link?.type === 'lead' && <Link to="/admissions/crm">Open the admission lead</Link>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(220px, 3fr) minmax(160px, 1fr)' }}>
            <label style={label}>Office notes<textarea className="form-input" rows={2} value={edit.staffNotes} onChange={(e) => setEdit((x) => ({ ...x, staffNotes: e.target.value }))} /></label>
            <label style={label}>Result
              <select className="form-select" value={edit.outcome} onChange={(e) => setEdit((x) => ({ ...x, outcome: e.target.value }))}>
                <option value="">—</option>
                {Object.entries(options?.outcomes || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={saveNotes.isPending} onClick={() => saveNotes.mutate()}>Save</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => printSlip({ visit: detail, qr: detail.qr }, school)}><Printer size={13} /> Slip</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Written in later, from the paper register ════════════════════════ */

function LaterEntry({ options }) {
  const qc = useQueryClient();
  const school = useAuthStore((s) => s.school);
  const blank = { date: pkToday(), in: '', out: '', name: '', cnic: '', phone: '', reason: '', detail: '', relation: '', remarks: '', staffNotes: '' };
  const [f, setF] = useState(blank);
  const [chosen, setChosen] = useState([]);
  const [fatherCnic, setFatherCnic] = useState('');
  const [errors, setErrors] = useState({});
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const childReason = (options?.childReasons || []).includes(f.reason);
  const save = useMutation({
    mutationFn: () => api.post('/visitor-desk/visits/late', {
      visitor: { name: f.name, cnic: f.cnic, phone: f.phone }, reason: f.reason, detail: f.detail, relation: f.relation,
      studentIds: chosen.map((c) => c.id), remarks: f.remarks, staffNotes: f.staffNotes, fatherCnic,
      checkinAt: pkDateTime(f.date, f.in), checkoutAt: f.out ? pkDateTime(f.date, f.out) : undefined,
    }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setF({ ...blank, date: f.date }); setChosen([]); setErrors({}); refreshLists(qc); },
    onError: (e) => { setErrors(e.response?.data?.errors || {}); toast.error(e.response?.data?.message || 'Could not save.'); },
  });
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...panel, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#334155', maxWidth: 620 }}><FileText size={15} style={{ verticalAlign: -3 }} /> <strong>When the internet or the computer is down</strong>, write visitors on the paper register at the desk. When it is back, write each line in here with the times on the paper.</span>
        <button type="button" className="btn btn-outline" onClick={() => printHTML(paperRegisterDocument({ school: school || {} }), { title: 'Visitor register' })}><Printer size={15} /> Print the paper register</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} style={{ ...panel, display: 'grid', gap: 12 }} aria-label="Write in later">
        <strong style={{ fontSize: 14, color: NAVY }}>Write in a visit from the paper register</strong>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <label style={label}>Date<input type="date" className="form-input" value={f.date} max={pkToday()} onChange={(e) => set({ date: e.target.value })} /></label>
          <label style={label}>Time in<input type="time" className="form-input" value={f.in} onChange={(e) => set({ in: e.target.value })} /><Err msg={errors.checkinAt} /></label>
          <label style={label}>Time out <span style={hint}>Empty: still inside</span><input type="time" className="form-input" value={f.out} onChange={(e) => set({ out: e.target.value })} /><Err msg={errors.checkoutAt} /></label>
        </div>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={label}>Name<input className="form-input" value={f.name} onChange={(e) => set({ name: e.target.value })} /><Err msg={errors.name} /></label>
          <label style={label}>CNIC <span style={hint}>If written</span><input className="form-input" inputMode="numeric" value={f.cnic} onChange={(e) => set({ cnic: typeCnic(e.target.value) })} /><Err msg={errors.cnic} /></label>
          <label style={label}>Mobile<input className="form-input" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: typePhone(e.target.value) })} /><Err msg={errors.phone} /></label>
          <label style={label}>Came for
            <select className="form-select" value={f.reason} onChange={(e) => set({ reason: e.target.value, detail: '' })}>
              <option value="">Choose…</option>
              {Object.entries(options?.reasons || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
            <Err msg={errors.reason} />
          </label>
          {f.reason === 'complaint' && (
            <label style={label}>Complaint about
              <select className="form-select" value={f.detail} onChange={(e) => set({ detail: e.target.value })}>
                <option value="">Choose…</option>
                {Object.entries(options?.complaintTypes || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
              <Err msg={errors.detail} />
            </label>
          )}
        </div>
        {childReason && (
          <>
            <ChildPicker reason={f.reason} ownKids={[]} fatherCnic={fatherCnic} setFatherCnic={setFatherCnic} chosen={chosen} setChosen={setChosen} error={errors.studentIds} isAdmin={false} />
            {chosen.length > 0 && (
              <label style={{ ...label, maxWidth: 260 }}>The visitor is the child's
                <select className="form-select" value={f.relation} onChange={(e) => set({ relation: e.target.value })}>
                  <option value="">Choose…</option>
                  {Object.entries(options?.relations || {}).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                </select>
                <Err msg={errors.relation} />
              </label>
            )}
          </>
        )}
        <label style={label}>What they said<textarea className="form-input" rows={2} dir="auto" value={f.remarks} onChange={(e) => set({ remarks: e.target.value })} /></label>
        <label style={label}>Office notes<textarea className="form-input" rows={2} value={f.staffNotes} onChange={(e) => set({ staffNotes: e.target.value })} /></label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={save.isPending || !f.in}>{save.isPending ? 'Saving…' : 'Save the visit'}</button>
        </div>
      </form>
    </div>
  );
}

/* ═══ Admin: approvals and kiosk tablets ═══════════════════════════════ */

function Approvals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [...LISTS, 'updates'], queryFn: () => api.get('/visitor-desk/record-updates').then((r) => r.data.data) });
  const decide = useMutation({
    mutationFn: ({ id, d }) => api.post(`/visitor-desk/record-updates/${id}/${d}`).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: LISTS }); qc.invalidateQueries({ queryKey: FEED_KEY }); qc.invalidateQueries({ queryKey: ['dashboard-alerts'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not save.'),
  });
  const rows = data || [];
  const cell = (now, next) => (next ? <span><span style={{ color: '#94A3B8', textDecoration: 'line-through' }}>{now || '—'}</span> → <strong>{next}</strong></span> : <span style={{ color: '#94A3B8' }}>{now || '—'}</span>);
  return (
    <div style={{ ...panel, display: 'grid', gap: 10 }}>
      <strong style={{ fontSize: 14, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={16} /> Parents' details for children's records</strong>
      <span style={{ fontSize: 12.5, color: '#64748B' }}>Given at the desk for children whose records lacked them (e.g. registered from photos). Approve to write them to the record; the parent's sign-in follows the mobile.</span>
      {isLoading ? <span>Loading…</span> : !rows.length ? <span style={{ fontSize: 13, color: '#64748B' }}>Nothing waits for approval.</span> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }} aria-label="Details to approve">
            <thead><tr style={{ textAlign: 'left', color: '#64748B' }}>{['Child', "Father's name", "Father's CNIC", 'Mobile', 'Given by', ''].map((h) => <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid #E2E8F0' }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: '6px 8px' }}><strong>{r.student?.name}</strong><div style={{ color: '#64748B' }}>{r.student?.className}</div></td>
                  <td style={{ padding: '6px 8px' }}>{cell(r.now?.fatherName, r.proposed.fatherName)}</td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{cell(r.now?.fatherCnic, r.proposed.fatherCnic)}</td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{cell(r.now?.phone, r.proposed.phone)}</td>
                  <td style={{ padding: '6px 8px' }}>{r.by ? `${r.by.name}${r.by.relation ? ` (${r.by.relation.toLowerCase()})` : ''}, ${dayOf(r.by.at)}` : '—'}</td>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-primary btn-sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, d: 'approve' })}>Approve</button>{' '}
                    <button type="button" className="btn btn-outline btn-sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, d: 'reject' })}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kiosks() {
  const qc = useQueryClient();
  const [name, setName] = useState('Reception kiosk');
  const [made, setMade] = useState(null);
  const [qr, setQr] = useState('');
  const { data } = useQuery({ queryKey: [...LISTS, 'kiosks'], queryFn: () => api.get('/visitor-desk/kiosks').then((r) => r.data.data) });
  const add = useMutation({
    mutationFn: () => api.post('/visitor-desk/kiosks', { name }).then((r) => r.data),
    onSuccess: async (r) => {
      const link = `${window.location.origin}/kiosk#k=${r.data.token}`;
      setMade({ ...r.data, link });
      setQr(await qrPicture(link).catch(() => ''));
      qc.invalidateQueries({ queryKey: [...LISTS, 'kiosks'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not add it.'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/visitor-desk/kiosks/${id}`).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: [...LISTS, 'kiosks'] }); },
  });
  const copy = async () => {
    try { await navigator.clipboard.writeText(made.link); toast.success('Link copied.'); } catch { toast.error('Select the link and copy it.'); }
  };
  return (
    <div style={{ ...panel, display: 'grid', gap: 12 }}>
      <strong style={{ fontSize: 14, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}><Tablet size={16} /> Kiosk tablets</strong>
      <span style={{ fontSize: 12.5, color: '#64748B', maxWidth: 680 }}>A tablet at reception where visitors fill the form themselves, in Urdu or English. It has its own key, not anyone's login: it can only add visits, which wait here for reception to confirm. It never shows a child's photo and cannot search children by name: a parent sees their own children only with the father's CNIC and the last 4 digits of the mobile number the school has.</span>
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ ...label, flex: '1 1 220px' }}>Name of the tablet<input className="form-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
        <button type="submit" className="btn btn-primary" disabled={add.isPending}><Plus size={15} /> Add a kiosk tablet</button>
      </form>
      {made && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 12 }}>
          {qr && <img src={qr} alt="Kiosk link QR code" style={{ width: 130, height: 130 }} />}
          <div style={{ display: 'grid', gap: 6, minWidth: 0, flex: '1 1 260px' }}>
            <strong style={{ fontSize: 13.5 }}>{made.name} is ready. Open this link on the tablet once (scan the QR with its camera):</strong>
            <code style={{ fontSize: 11.5, wordBreak: 'break-all', background: '#fff', padding: 6, borderRadius: 6 }}>{made.link}</code>
            <div style={{ display: 'flex', gap: 6 }}><button type="button" className="btn btn-outline btn-sm" onClick={copy}><Copy size={13} /> Copy</button></div>
            <span style={{ fontSize: 12, color: '#166534' }}>The link is shown only now. The tablet remembers it; if it is lost, remove the tablet and add it again.</span>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 6 }}>
        {(data || []).map((k) => (
          <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 10 }}>
            <span style={{ fontSize: 13 }}><strong>{k.name}</strong> <span style={{ color: '#64748B' }}>· added {dayOf(k.createdAt)}{k.lastSeenAt ? ` · last used ${dayOf(k.lastSeenAt)} ${timeOf(k.lastSeenAt)}` : ' · not used yet'}</span></span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => remove.mutate(k.id)} aria-label={`Remove ${k.name}`}><Trash2 size={13} /> Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ The page ═════════════════════════════════════════════════════════ */

export default function VisitorDeskPage({ standalone = false }) {
  const [params, setParams] = useSearchParams();
  const { data: options } = useOptions();
  const isAdmin = !!options?.isAdmin;
  const [saved, setSaved] = useState(null);
  const TABS = useMemo(() => [
    ['desk', 'Desk', UserCheck],
    ['today', 'Visitors by day', ClipboardList],
    ['later', 'Write in later', FileText],
    ...(isAdmin ? [['live', 'Live feed', Radio], ['approvals', 'Approvals', ShieldCheck], ['kiosks', 'Kiosk tablets', Tablet]] : []),
  ], [isAdmin]);
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'desk';
  const go = (k) => setParams(k === 'desk' ? {} : { tab: k }, { replace: true });

  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        {standalone && <Link to="/gatekeeper-portal" className="btn btn-outline btn-sm btn-icon" aria-label="Back to the gate"><ArrowLeft size={15} /></Link>}
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserCheck size={21} color={NAVY} /> Visitor Desk</h1>
          <p className="page-subtitle">Everyone who comes to the school: why they came, for which child, what they said, and when they left.</p>
        </div>
      </div>
      <div role="tablist" aria-label="Visitor Desk" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {TABS.map(([k, t, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => go(k)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1.5px solid ${tab === k ? NAVY : '#E2E8F0'}`, background: tab === k ? NAVY : '#fff', color: tab === k ? '#fff' : '#334155' }}>
            <Icon size={14} /> {t}
          </button>
        ))}
      </div>

      {tab === 'desk' && (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
          <div style={{ ...panel, gridColumn: 'span 2', minWidth: 0 }} className="vd-main">
            {saved ? <Saved result={saved} onNext={() => setSaved(null)} /> : <NewVisit options={options} onSaved={setSaved} />}
          </div>
          <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
            <KioskQueue onSaved={setSaved} />
            <CheckoutBox outcomes={options?.outcomes} />
            <InsideList outcomes={options?.outcomes} />
          </div>
        </div>
      )}
      {tab === 'today' && <DayList options={options} />}
      {tab === 'later' && <LaterEntry options={options} />}
      {tab === 'live' && isAdmin && <div style={panel}><VisitorFeed /></div>}
      {tab === 'approvals' && isAdmin && <Approvals />}
      {tab === 'kiosks' && isAdmin && <Kiosks />}
      <style>{'@media (max-width: 760px) { .vd-main { grid-column: auto !important; } }'}</style>
    </>
  );
  if (standalone) return <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: 16 }}><div style={{ maxWidth: 1400, margin: '0 auto' }}>{content}</div></div>;
  return <div className="page-content fade-in">{content}</div>;
}
