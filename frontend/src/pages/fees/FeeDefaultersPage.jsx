import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { MessageSquare, DollarSign, AlertTriangle, RefreshCw, Printer } from 'lucide-react';

function printDefaultersReport(invoices, schoolName) {
  // Group by parent
  const byParent = {};
  invoices.forEach(inv => {
    const parentId = inv.student?.parent?.id || inv.student?.fatherName || 'unknown';
    if (!byParent[parentId]) {
      byParent[parentId] = {
        parentName: inv.student?.fatherName || inv.student?.parent?.name || '—',
        phone:      inv.student?.emergencyPhone || inv.student?.parent?.phone || '00',
        whatsapp:   inv.student?.parent?.phone || '',
        cnic:       inv.student?.parent?.cnic  || '',
        children:   [],
      };
    }
    byParent[parentId].children.push(inv);
  });

  const rows = Object.entries(byParent).map(([, p], idx) => {
    const childRows = p.children.map((c, ci) => `
      <tr>
        <td>Child : ${ci + 1}</td>
        <td>Roll : ${c.student?.rollNo || '—'}</td>
        <td colspan="2">Name: ${c.student?.name || '—'}</td>
        <td>Class/Section : ${c.student?.class?.name || '—'}</td>
        <td>Unpaid Invoices : ${1}</td>
        <td>Total Amount: ${Number(c.dueAmount || 0).toLocaleString('en-PK')}</td>
      </tr>`).join('');
    const total = p.children.reduce((s, c) => s + Number(c.dueAmount || 0), 0);
    return `
      <tr style="background:#e5e7eb">
        <td><strong>PARENT# ${idx + 1}</strong></td>
        <td>P. NAME : ${p.parentName}</td>
        <td>PHONE : ${p.phone}</td>
        <td>WHATSAPP : ${p.whatsapp}</td>
        <td colspan="3">CNIC : ${p.cnic}</td>
      </tr>
      ${childRows}
      <tr>
        <td colspan="5" style="padding-left:12px">Total Invoices : ${p.children.length} - Amount Due : ${total.toLocaleString('en-PK')}</td>
        <td colspan="2">Remarks (if any) : ___________________________</td>
      </tr>`;
  }).join('');

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
    <h3>Defaulter Parents Report | Main Campus</h3>
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
  w.document.write(html); w.document.close();
}

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function FeeDefaultersPage() {
  const [filter, setFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['defaulters'],
    queryFn: () => api.get('/fees/defaulters').then(r => r.data),
  });

  const sendSMS = useMutation({
    mutationFn: () => api.post('/fees/defaulters/sms'),
    onSuccess: r => toast.success(r.data.message || 'SMS sent to all defaulters!'),
    onError: err => toast.error(err.response?.data?.message || 'Failed to send SMS'),
  });

  const invoices = data?.data || [];
  const filtered = filter ? invoices.filter(i => i.student?.name?.toLowerCase().includes(filter.toLowerCase())) : invoices;
  const totalDue = invoices.reduce((s, i) => s + (i.dueAmount||0), 0);
  const uniqueStudents = new Set(invoices.map(i => i.studentId)).size;

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
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}><RefreshCw size={13}/></button>
          <button className="btn btn-outline btn-sm" onClick={() => printDefaultersReport(invoices, localStorage.getItem('registeredSchoolName') || 'IlmForge School')}>
            <Printer size={13}/> Print Report
          </button>
          <button className="btn btn-amber" onClick={() => sendSMS.mutate()} disabled={sendSMS.isPending || invoices.length===0}>
            <MessageSquare size={15}/>
            {sendSMS.isPending ? 'Sending...' : 'Send SMS Reminder'}
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
                    <td style={{fontSize:12,color:'#64748B'}}>{inv.month} {inv.year}</td>
                    <td>{money(inv.totalAmount)}</td>
                    <td style={{color:'#15803d'}}>{money(inv.paidAmount)}</td>
                    <td><span style={{color:'#DC2626',fontWeight:800}}>{money(inv.dueAmount)}</span></td>
                    <td><span className={`badge ${inv.status==='partial'?'badge-amber':'badge-red'}`}>{inv.status}</span></td>
                    <td>
                      <Link to="/fees/collect" className="btn btn-sm btn-teal"><DollarSign size={12}/> Collect</Link>
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
