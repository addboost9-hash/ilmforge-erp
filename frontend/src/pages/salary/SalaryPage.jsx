import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Zap, CheckCircle, Printer } from 'lucide-react';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SalaryPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState({ month:new Date().getMonth()+1, year:new Date().getFullYear() });

  const { data, isLoading } = useQuery({
    queryKey: ['salary', period],
    queryFn: () => api.get('/salary', {params:period}).then(r => r.data.data),
  });

  const generate = useMutation({
    mutationFn: () => api.post('/salary/generate', period),
    onSuccess: r => { toast.success(r.data.message || 'Salary generated!'); qc.invalidateQueries(['salary']); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const issue = useMutation({
    mutationFn: id => api.post('/salary/'+id+'/issue'),
    onSuccess: () => { toast.success('Salary issued!'); qc.invalidateQueries(['salary']); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const records = data || [];
  const totalNet = records.reduce((s,r) => s+(r.netSalary||0), 0);
  const issued = records.filter(r => r.status==='issued').length;

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Salary & HR Management</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            {MONTHS[period.month-1]} {period.year} — Total: <strong style={{color:'#1E3A5F'}}>{money(totalNet)}</strong> | Issued: <strong style={{color:'#15803D'}}>{issued}/{records.length}</strong>
          </p>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <select className="form-select" style={{width:100}} value={period.month} onChange={e=>setPeriod({...period,month:parseInt(e.target.value)})}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <input className="form-input" type="number" style={{width:90}} value={period.year} onChange={e=>setPeriod({...period,year:parseInt(e.target.value)})}/>
          <button className="btn btn-teal" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Zap size={15}/> {generate.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {records.length > 0 && (
        <div className="stats-grid-3" style={{marginBottom:16}}>
          {[
            {l:'Total Salary Bill', v:money(totalNet), c:'#1E3A5F', bg:'#EFF6FF'},
            {l:'Issued', v:money(records.filter(r=>r.status==='issued').reduce((s,r)=>s+r.netSalary,0)), c:'#15803D', bg:'#DCFCE7'},
            {l:'Pending', v:money(records.filter(r=>r.status!=='issued').reduce((s,r)=>s+r.netSalary,0)), c:'#B45309', bg:'#FEF3C7'},
          ].map(item => (
            <div key={item.l} className="card" style={{background:item.bg, border:'none', padding:16}}>
              <div style={{fontSize:20, fontWeight:800, color:item.c}}>{item.v}</div>
              <div style={{fontSize:12, color:'#64748B', fontWeight:600, marginTop:2}}>{item.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Staff Name</th>
                  <th>Basic Salary</th>
                  <th>Deductions</th>
                  <th>Loan</th>
                  <th>Bonus</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{color:'#94a3b8', fontSize:12}}>{idx+1}</td>
                    <td style={{fontWeight:600}}>{r.staff?.name || '—'}</td>
                    <td>{money(r.basic)}</td>
                    <td style={{color:'#DC2626'}}>-{money(r.deductionsAbsent+r.deductionsLate)}</td>
                    <td style={{color:'#B91C1C'}}>-{money(r.loanDeduction)}</td>
                    <td style={{color:'#15803D'}}>+{money(r.bonus)}</td>
                    <td style={{fontWeight:800, color:'#1E3A5F', fontSize:14}}>{money(r.netSalary)}</td>
                    <td><span className={`badge ${r.status==='issued'?'badge-green':'badge-amber'}`}>{r.status}</span></td>
                    <td>
                      {r.status==='pending' ? (
                        <button className="btn btn-sm btn-green" onClick={() => issue.mutate(r.id)} disabled={issue.isPending}>
                          <CheckCircle size={12}/> Issue
                        </button>
                      ) : (
                        <div style={{display:'flex', gap:5}}>
                          <span style={{fontSize:11, color:'#15803D', fontWeight:600}}>✓ {r.issueDate?new Date(r.issueDate).toLocaleDateString('en-PK'):''}</span>
                          <button className="btn btn-sm btn-outline btn-icon" title="Print Slip"><Printer size={12}/></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {records.length===0 && (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-state-icon">💼</div>
                      <div className="empty-state-text">No salary records for {MONTHS[period.month-1]} {period.year}</div>
                      <div className="empty-state-sub">Click "Generate" to create salary records for all active staff</div>
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
