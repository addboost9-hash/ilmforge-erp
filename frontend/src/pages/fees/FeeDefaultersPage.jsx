import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { MessageSquare, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';

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
