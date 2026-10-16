import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { feePeriod } from '../../utils/feeMonth';
import { MessageSquare, DollarSign, AlertTriangle, RefreshCw, Printer } from 'lucide-react';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rs = (paisa) => (Number(paisa || 0) / 100).toLocaleString('en-PK');

function printDefaultersReport(invoices, schoolName) {
  // One family per father's name and phone: by name alone, two families
  // with a father called Muhammad Ali were printed as one.
  const byParent = {};
  invoices.forEach(inv => {
    const parentId = `${(inv.student?.fatherName || '').trim().toLowerCase()}|${inv.student?.emergencyPhone || inv.studentId}`;
    if (!byParent[parentId]) {
      byParent[parentId] = {
        parentName: inv.student?.fatherName || '—',
        phone:      inv.student?.emergencyPhone || '—',
        whatsapp:   inv.student?.motherPhone || inv.student?.emergencyPhone || '',
        cnic:       inv.student?.fatherCnic || '',
        children:   [],
      };
    }
    byParent[parentId].children.push(inv);
  });

  const rows = Object.entries(byParent).map(([, p], idx) => {
    // Amounts are kept in paisa: they printed a hundred times too large.
    const kids = {};
    p.children.forEach(c => { (kids[c.studentId] = kids[c.studentId] || []).push(c); });
    const childRows = Object.values(kids).map((bills, ci) => {
      const s = bills[0].student || {};
      return `
      <tr>
        <td>Child : ${ci + 1}</td>
        <td>Roll : ${esc(s.rollNo || '—')}</td>
        <td colspan="2">Name: ${esc(s.name || '—')}</td>
        <td>Class/Section : ${esc([s.class?.name, s.section?.name].filter(Boolean).join(' / ') || '—')}</td>
        <td>Unpaid Invoices : ${bills.length}</td>
        <td>Total Amount: Rs. ${rs(bills.reduce((t, c) => t + Number(c.dueAmount || 0), 0))}</td>
      </tr>`;
    }).join('');
    const total = p.children.reduce((s, c) => s + Number(c.dueAmount || 0), 0);
    return `
      <tr style="background:#e5e7eb">
        <td><strong>PARENT# ${idx + 1}</strong></td>
        <td>P. NAME : ${esc(p.parentName)}</td>
        <td>PHONE : ${esc(p.phone)}</td>
        <td>WHATSAPP : ${esc(p.whatsapp)}</td>
        <td colspan="3">CNIC : ${esc(p.cnic)}</td>
      </tr>
      ${childRows}
      <tr>
        <td colspan="5" style="padding-left:12px">Total Invoices : ${p.children.length} - Amount Due : Rs. ${rs(total)}</td>
        <td colspan="2">Remarks (if any) : ___________________________</td>
      </tr>`;
  }).join('');

  schoolName = esc(schoolName);
  const html = `<!DOCTYPE html><html><head><title>Defaulters Report — ${schoolName}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; }
      h2,h3 { text-align: center; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      td, th { border: 1px solid #333; padding: 5px 7px; font-size: 10px; }
      .no-print { display: none; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style>
  </head><body>
    <h2>${schoolName}</h2>
    <h3>Defaulter Parents Report</h3>
    <div style="text-align:right;margin-bottom:8px">
      <button class="no-print" onclick="window.print()" style="background:#dc2626;color:#fff;border:none;padding:7px 18px;border-radius:6px;cursor:pointer;font-size:12px">
        🖨️ Print Report
      </button>
    </div>
    <table><tbody>${rows}</tbody></table>
    <div style="text-align:center;margin-top:16px;font-size:9px;color:#666">
      Print date & time : ${new Date().toLocaleString('en-PK')} | Powered by IlmForge School Management System
    </div>
  </body></html>`;
  const w = window.open('', '_blank', 'width=1000,height=700');
  if (!w) { toast.error('Allow pop-ups for this site to print.'); return; }
  w.document.write(html); w.document.close();
}

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function FeeDefaultersPage() {
  const [filter, setFilter] = useState('');
  // SMS or WhatsApp, through the school's own account (Settings → Channels).
  const [channel, setChannel] = useState('sms');
  const schoolName = useAuthStore(s => s.school?.name || s.branding?.schoolName || 'School');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['defaulters'],
    queryFn: () => api.get('/fees/defaulters?limit=500').then(r => r.data),
  });

  // Derive invoices early so mutations can close over the ref
  const invoices = data?.data || [];

  // The server writes each parent's reminder with the amount due and the
  // months, in the school's words, and counts only what went. This sent one
  // generic text signed "IlmForge School" and counted every number as sent.
  const sendSMS = useMutation({
    mutationFn: () => api.post('/fees/defaulters/sms', { channel }).then(r => r.data),
    onSuccess: (d) => (d.data?.sent > 0 ? toast.success(d.message, { duration: 7000 }) : toast.error(d.message, { duration: 7000 })),
    onError: err => toast.error(err.response?.data?.message || 'Failed to send reminders'),
  });

  // Per-student reminder
  const sendSingleSMS = useMutation({
    mutationFn: (inv) => api.post('/fees/defaulters/sms', { channel, studentIds: [inv.studentId] }).then(r => r.data),
    onSuccess: (d) => (d.data?.sent > 0 ? toast.success(d.message) : toast.error(d.message, { duration: 6000 })),
    onError: err => toast.error(err.response?.data?.message || 'Failed to send reminder'),
  });
  const filtered = filter ? invoices.filter(i => i.student?.name?.toLowerCase().includes(filter.toLowerCase())) : invoices;
  const totalDue = data?.summary?.totalDue ?? invoices.reduce((s, i) => s + (i.dueAmount||0), 0);
  const uniqueStudents = data?.summary?.students ?? new Set(invoices.map(i => i.studentId)).size;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
        <div>
          <h1 className="page-title">Fee Defaulters</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            Students with unpaid or partial fee invoices
          </p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button aria-label="Refresh" className="btn btn-outline btn-sm" onClick={() => refetch()}><RefreshCw size={13}/></button>
          <button className="btn btn-outline btn-sm" onClick={() => printDefaultersReport(invoices, schoolName)}>
            <Printer size={13}/> Print Report
          </button>
          <select aria-label="Send by" className="form-select" style={{width:'auto', height:34, fontSize:13}} value={channel} onChange={e => setChannel(e.target.value)}>
            <option value="sms">By SMS</option>
            <option value="whatsapp">By WhatsApp</option>
          </select>
          <button className="btn btn-primary" onClick={() => { if (window.confirm(`Send a fee reminder by ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to the parents of all ${uniqueStudents} defaulter(s)?`)) sendSMS.mutate(); }} disabled={sendSMS.isPending || invoices.length===0}>
            <MessageSquare size={15}/>
            {sendSMS.isPending ? 'Sending…' : 'Send Reminders to All Defaulters'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-3" style={{marginBottom:16}}>
        <div className="card" style={{background:'linear-gradient(135deg,#FEF3C7,#FDE68A)', border:'1px solid #FDE68A', padding:16}}>
          <div style={{fontSize:24,fontWeight:800,color:'#B45309'}}>{data?.total || 0}</div>
          <div style={{fontSize:12,color:'#B45309',fontWeight:600}}>Total Unpaid Invoices</div>
        </div>
        <div className="card" style={{background:'linear-gradient(135deg,#FEE2E2,#FECACA)', border:'1px solid #FECACA', padding:16}}>
          <div style={{fontSize:24,fontWeight:800,color:'#B91C1C'}}>{money(totalDue)}</div>
          <div style={{fontSize:12,color:'#B91C1C',fontWeight:600}}>Total Due Amount</div>
        </div>
        <div className="card" style={{background:'linear-gradient(135deg,#DBEAFE,#BFDBFE)', border:'1px solid #BFDBFE', padding:16}}>
          <div style={{fontSize:24,fontWeight:800,color:'#1D4ED8'}}>{uniqueStudents}</div>
          <div style={{fontSize:12,color:'#1D4ED8',fontWeight:600}}>Unique Defaulters</div>
        </div>
      </div>

      {/* Search filter */}
      <div style={{marginBottom:12}}>
        <input className="form-input" style={{maxWidth:300}} placeholder="Filter by student name..."
          value={filter} onChange={e => setFilter(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner"/></div>
        ) : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Fee Title</th>
                  <th>Month</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td style={{fontWeight:600, color:'#1E3A5F'}}>{inv.student?.name || '—'}</td>
                    <td><span style={{fontFamily:'monospace',fontSize:12,color:'#0D9488'}}>{inv.student?.rollNo||'—'}</span></td>
                    <td><span className="badge badge-blue">{inv.student?.class?.name||'—'}</span></td>
                    <td style={{fontSize:12}}>{inv.feeTitle}</td>
                    <td style={{fontSize:12,color:'#64748B'}}>{feePeriod(inv) || '—'}</td>
                    <td>{money(inv.totalAmount)}</td>
                    <td style={{color:'#15803d'}}>{money(inv.paidAmount)}</td>
                    <td><span style={{color:'#DC2626',fontWeight:800}}>{money(inv.dueAmount)}</span></td>
                    <td><span className={`badge ${inv.status==='partial'?'badge-amber':'badge-red'}`}>{inv.status}</span></td>
                    <td>
                      <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                        <Link to={`/fees/collect?student=${inv.studentId}`} className="btn btn-sm btn-teal"><DollarSign size={12}/> Collect</Link>
                        <button
                          className="btn btn-sm btn-amber"
                          title="Send SMS reminder to parent"
                          disabled={sendSingleSMS.isPending}
                          onClick={() => sendSingleSMS.mutate(inv)}
                        >
                          <MessageSquare size={12}/> Remind
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <div style={{fontSize:36}}>🎉</div>
                      <div className="empty-state-text">{invoices.length===0 ? 'No defaulters! All fees are paid.' : 'No results match your filter.'}</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
