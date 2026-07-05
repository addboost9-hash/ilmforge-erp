/**
 * Fee Invoices — FULL CRUD + Voucher Printing Center
 * ═══════════════════════════════════════════════════
 * INSERT: custom invoice with multiple heads (Admission, Annual, Stationary, Uniform…)
 * UPDATE: amount / due date / status  |  DELETE: unpaid only (audit-logged)
 * PRINT:  Monthly voucher (3-copy) · Admission voucher (heads breakdown) · Receipt
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { Plus, Pencil, Trash2, Printer, Search, X, Receipt } from 'lucide-react';

/* ── Voucher printers ── */
const esc = (s) => String(s ?? '—').replace(/</g, '&lt;');
export function printHeadsVoucher({ student, school, heads, month, year, dueDate, voucherNo, title = 'FEE VOUCHER' }) {
  const color = school?.themeColor || '#0D9488';
  const total = heads.reduce((a, h) => a + (parseInt(h.amount) || 0), 0);
  const copies = ['BANK COPY', 'SCHOOL COPY', 'PARENT COPY'];
  const block = (label) => `
    <div class="v">
      <div class="tag">${label}</div>
      <div class="hd"><div class="logo">${esc((school?.name || 'IF')[0])}</div>
        <div><div class="sn">${esc(school?.name || 'IlmForge School')}</div><div class="sa">${esc(school?.address || '')}</div></div></div>
      <div class="ttl">${title}</div>
      <div class="meta"><div><span>Voucher</span><b>${voucherNo}</b></div><div><span>Month</span><b>${esc(month)} ${esc(year)}</b></div><div><span>Due</span><b class="d">${dueDate ? new Date(dueDate).toLocaleDateString('en-PK') : '—'}</b></div></div>
      <div class="st"><div><span>Student</span><b>${esc(student?.name)}</b></div><div><span>Roll</span><b>${esc(student?.rollNo)}</b></div>
        <div><span>Class</span><b>${esc(student?.class?.name || student?.className)}</b></div><div><span>Father</span><b>${esc(student?.fatherName)}</b></div></div>
      <table><thead><tr><th>Fee Head</th><th style="text-align:right">Rs</th></tr></thead>
        <tbody>${heads.map(h => `<tr><td>${esc(h.name)}</td><td style="text-align:right">${Number(h.amount).toLocaleString()}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>TOTAL PAYABLE</td><td style="text-align:right">Rs ${total.toLocaleString()}</td></tr></tfoot></table>
      <div class="sig"><div>Depositor</div><div>Cashier / Bank</div></div>
    </div>`;
  const w = window.open('', '_blank', 'width=1000,height=720');
  w.document.write(`<!DOCTYPE html><html><head><title>${title} — ${esc(student?.name)}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#F1F5F9;padding:14px;font-size:11px;color:#0F172A}
    .sheet{display:flex;gap:9px;max-width:1080px;margin:0 auto}
    .v{flex:1;background:#fff;border:1.5px solid #CBD5E1;border-radius:12px;padding:13px;position:relative;overflow:hidden}
    .v::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:${color}}
    .tag{position:absolute;top:10px;right:-26px;background:${color};color:#fff;font-size:8px;font-weight:800;letter-spacing:.1em;padding:3px 30px;transform:rotate(38deg)}
    .hd{display:flex;gap:8px;align-items:center;margin-bottom:6px}
    .logo{width:32px;height:32px;border-radius:9px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}
    .sn{font-weight:800;font-size:12px}.sa{font-size:8px;color:#64748B}
    .ttl{text-align:center;font-size:10px;font-weight:800;letter-spacing:.14em;color:${color};margin:4px 0 8px}
    .meta,.st{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 10px;background:#F8FAFC;border-radius:8px;padding:7px 9px;margin-bottom:7px}
    .meta{grid-template-columns:repeat(3,1fr)}
    .meta span,.st span{display:block;font-size:7px;color:#94A3B8;text-transform:uppercase;font-weight:700;letter-spacing:.05em}
    .meta b,.st b{font-size:9.5px}.d{color:#DC2626}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    th{background:${color}0f;color:${color};font-size:8px;text-transform:uppercase;padding:5px 7px;text-align:left;letter-spacing:.05em}
    td{padding:5px 7px;border-bottom:1px solid #F1F5F9;font-size:10px}
    tfoot td{background:#0F172A;color:#fff;font-weight:800;font-size:10.5px;border:none}
    tfoot td:first-child{border-radius:7px 0 0 7px}tfoot td:last-child{border-radius:0 7px 7px 0}
    .sig{display:flex;gap:12px;margin-top:18px}
    .sig div{flex:1;border-top:1px solid #94A3B8;padding-top:3px;font-size:7.5px;color:#64748B;text-align:center}
    @media print{body{background:#fff;padding:4px}}
  </style></head><body><div class="sheet">${copies.map(block).join('')}</div><script>setTimeout(()=>print(),450)</script></body></html>`);
  w.document.close();
}

const ADMISSION_HEADS = [
  { name: 'Admission Fee', amount: 5000 },
  { name: 'Annual Charges', amount: 3000 },
  { name: 'Monthly Tuition Fee', amount: 3500 },
  { name: 'Stationary & Books', amount: 2500 },
  { name: 'Uniform (2 sets)', amount: 3200 },
  { name: 'Security (refundable)', amount: 2000 },
  { name: 'ID Card + Diary', amount: 500 },
];

export default function FeeInvoicesManagePage() {
  const qc = useQueryClient();
  const { school } = useAuthStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // {mode:'insert'|'edit', inv?, student?}
  const [studentQ, setStudentQ] = useState('');
  const [selStudent, setSelStudent] = useState(null);
  const [heads, setHeads] = useState([{ name: 'Monthly Tuition Fee', amount: '' }]);
  const [editVals, setEditVals] = useState({});

  const { data: invRes } = useQuery({
    queryKey: ['fee-invoices-manage', search],
    queryFn: () => api.get('/fees/invoices', { params: { search, limit: 50 } }).then(r => r.data),
  });
  const invoices = invRes?.data || [];
  const { data: students = [] } = useQuery({
    queryKey: ['inv-students', studentQ],
    queryFn: () => api.get('/students', { params: { search: studentQ, limit: 8, status: 'active' } }).then(r => r.data.data || []),
    enabled: studentQ.length >= 2,
  });

  const insertInv = useMutation({
    mutationFn: () => api.post('/fees/invoices', { studentId: selStudent.id, heads: heads.filter(h => h.name && h.amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-invoices-manage'] }); setModal(null); setSelStudent(null); setHeads([{ name: 'Monthly Tuition Fee', amount: '' }]); },
  });
  const updateInv = useMutation({
    mutationFn: () => api.put(`/fees/invoices/${modal.inv.id}`, editVals),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-invoices-manage'] }); setModal(null); },
  });
  const deleteInv = useMutation({
    mutationFn: (id) => api.delete(`/fees/invoices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fee-invoices-manage'] }),
    onError: (e) => alert(e.response?.data?.message || 'Delete failed'),
  });

  const printInvoice = (inv) => {
    let parsedHeads = [{ name: `Tuition Fee — ${inv.month} ${inv.year}`, amount: inv.totalAmount }];
    try { const h = JSON.parse(inv.remarks); if (Array.isArray(h) && h[0]?.name) parsedHeads = h; } catch {}
    printHeadsVoucher({
      student: inv.student || { name: inv.studentName, rollNo: inv.rollNo, fatherName: inv.fatherName, className: inv.className },
      school, heads: parsedHeads, month: inv.month, year: inv.year, dueDate: inv.dueDate,
      voucherNo: `V-${inv.id}`, title: parsedHeads.length > 1 ? 'ADMISSION / CUSTOM VOUCHER' : 'MONTHLY FEE VOUCHER',
    });
  };

  const input = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500';
  const sc = { paid: 'bg-teal-50 text-teal-700', partial: 'bg-amber-50 text-amber-700', pending: 'bg-slate-100 text-slate-500', overdue: 'bg-red-50 text-red-600' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input className={input + ' pl-9'} placeholder="Student/invoice search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setModal({ mode: 'insert' }); setHeads([{ name: 'Monthly Tuition Fee', amount: '' }]); }}
          className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl"><Plus className="w-4 h-4" /> New Invoice</button>
        <button onClick={() => { setModal({ mode: 'insert' }); setHeads(ADMISSION_HEADS.map(h => ({ ...h }))); }}
          className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl"><Receipt className="w-4 h-4" /> Admission Voucher (all heads)</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] text-slate-400 uppercase border-b">
            {['Student', 'Month', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-extrabold">{h}</th>)}
          </tr></thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} className="border-b border-slate-50">
                <td className="px-4 py-2.5"><div className="font-bold text-slate-800">{inv.student?.name || inv.studentName}</div><div className="text-[10px] text-slate-400">{inv.student?.rollNo || inv.rollNo}</div></td>
                <td className="px-4 py-2.5 text-slate-600">{inv.month} {inv.year}</td>
                <td className="px-4 py-2.5 font-bold">Rs {Number(inv.totalAmount).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-teal-700">Rs {Number(inv.paidAmount).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-red-600 font-bold">Rs {Number(inv.balance).toLocaleString()}</td>
                <td className="px-4 py-2.5"><span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${sc[inv.status] || sc.pending}`}>{inv.status?.toUpperCase()}</span></td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <button title="Print voucher" onClick={() => printInvoice(inv)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-300"><Printer className="w-3.5 h-3.5" /></button>
                    <button title="Edit" onClick={() => { setModal({ mode: 'edit', inv }); setEditVals({ totalAmount: inv.totalAmount, status: inv.status, dueDate: inv.dueDate?.slice(0, 10) }); }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300"><Pencil className="w-3.5 h-3.5" /></button>
                    <button title="Delete (unpaid only)" onClick={() => confirm('Invoice delete karein?') && deleteInv.mutate(inv.id)}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!invoices.length && <p className="text-center text-xs text-slate-400 py-10">Koi invoice nahi mili</p>}
      </div>

      {/* ═══ Insert / Edit modal ═══ */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm">{modal.mode === 'insert' ? '➕ New Invoice (custom heads)' : `✏️ Edit Invoice #${modal.inv.id}`}</h3>
              <button onClick={() => setModal(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            {modal.mode === 'insert' ? (<>
              {!selStudent ? (<>
                <input className={input + ' mb-2'} placeholder="Student search karein…" value={studentQ} onChange={e => setStudentQ(e.target.value)} />
                <div className="space-y-1 mb-3 max-h-36 overflow-y-auto">
                  {students.map(s => (
                    <button key={s.id} onClick={() => setSelStudent(s)} className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-teal-300 text-sm">
                      <b>{s.name}</b> <span className="text-xs text-slate-400">· {s.rollNo} · {s.class?.name}</span>
                    </button>))}
                </div>
              </>) : (
                <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-xl mb-3">
                  <span className="text-sm font-bold text-teal-800">{selStudent.name} · {selStudent.rollNo}</span>
                  <button onClick={() => setSelStudent(null)} className="text-xs text-teal-600 font-bold">Change</button>
                </div>
              )}
              <div className="text-[10px] font-extrabold text-slate-400 uppercase mb-2">Fee Heads</div>
              {heads.map((h, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className={input} placeholder="Head name" value={h.name} onChange={e => setHeads(hs => hs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input className={input + ' w-32'} type="number" placeholder="Rs" value={h.amount} onChange={e => setHeads(hs => hs.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                  <button onClick={() => setHeads(hs => hs.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setHeads(hs => [...hs, { name: '', amount: '' }])} className="text-xs font-bold text-teal-600 mb-3">+ Add head</button>
              <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-3 mb-3">
                <span className="text-xs font-bold">TOTAL</span>
                <span className="font-extrabold">Rs {heads.reduce((a, h) => a + (parseInt(h.amount) || 0), 0).toLocaleString()}</span>
              </div>
              <button onClick={() => insertInv.mutate()} disabled={!selStudent || !heads.some(h => h.name && h.amount) || insertInv.isPending}
                className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40">
                {insertInv.isPending ? 'Creating…' : 'Create Invoice → phir Print karein'}
              </button>
            </>) : (<>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Total Amount</label>
              <input className={input + ' mb-2'} type="number" value={editVals.totalAmount} onChange={e => setEditVals(v => ({ ...v, totalAmount: e.target.value }))} />
              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Due Date</label>
              <input className={input + ' mb-2'} type="date" value={editVals.dueDate || ''} onChange={e => setEditVals(v => ({ ...v, dueDate: e.target.value }))} />
              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Status</label>
              <select className={input + ' mb-3'} value={editVals.status} onChange={e => setEditVals(v => ({ ...v, status: e.target.value }))}>
                {['pending', 'partial', 'paid', 'overdue', 'cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={() => updateInv.mutate()} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">Save Changes</button>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
