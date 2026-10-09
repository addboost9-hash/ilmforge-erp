import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { money } from '../../utils/currency';
import { printSalarySlip } from '../staff/PayrollPage';
import { Zap, CheckCircle, Printer } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Pakistan is UTC+5 all year: today and this month are Pakistan's, whatever
// zone this computer's clock is set to.
const PK_OFFSET_MS = 5 * 3600e3;
const pkToday = () => new Date(Date.now() + PK_OFFSET_MS).toISOString().slice(0, 10);
const pkDate = (d) => (d ? new Date(new Date(d).getTime() + PK_OFFSET_MS).toISOString().slice(0, 10).split('-').reverse().join('/') : '');
const ymdToDmy = (s) => (s ? s.split('-').reverse().join('/') : '');

// Screens whose figures an issued salary changes. They keep data for five
// minutes and do not reload on opening, so they are refreshed now. The
// expenses-today / bs-expenses lists are the Accountant Portal's.
const PAY_KEYS = ['salary', 'payroll', 'payroll-summary', 'expenses', 'expenses-today', 'expenses-all-today', 'bs-expenses', 'accounting-ledger', 'accounting-stats', 'dashboard', 'dash-admin-overview'];

export default function SalaryPage() {
  const qc = useQueryClient();
  const school = useAuthStore((s) => s.school);
  const pkNow = new Date(Date.now() + PK_OFFSET_MS);
  const thisYear = pkNow.getUTCFullYear();
  const [period, setPeriod] = useState({ month: pkNow.getUTCMonth() + 1, year: thisYear });
  const [issuing, setIssuing] = useState(null); // the record being issued
  const [paidOn, setPaidOn] = useState(pkToday);

  const { data, isLoading } = useQuery({
    queryKey: ['salary', period],
    queryFn: () => api.get('/salary', {params:period}).then(r => r.data.data),
  });

  const generate = useMutation({
    mutationFn: () => api.post('/salary/generate', period),
    onSuccess: r => {
      toast.success(r.data.message || 'Salary generated!', { duration: 7000 });
      qc.invalidateQueries({ queryKey: ['salary'] });
      qc.invalidateQueries({ queryKey: ['payroll'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['payroll-summary'], refetchType: 'all' });
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const refreshAfterPay = () => PAY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k], refetchType: 'all' }));

  const issue = useMutation({
    mutationFn: ({ id, paidOn: day }) => api.post('/salary/'+id+'/issue', { paidOn: day || undefined }),
    onSuccess: (_, { paidOn: day }) => {
      toast.success(`Salary issued, paid on ${ymdToDmy(day || pkToday())}.`);
      refreshAfterPay();
      setIssuing(null);
    },
    onError: err => {
      // 409: someone else paid it meanwhile. Close the form and show it as paid.
      if (err.response?.status === 409) { refreshAfterPay(); setIssuing(null); }
      toast.error(err.response?.data?.message || 'Failed');
    },
  });

  const confirmIssue = () => {
    if (paidOn && paidOn > pkToday()) { toast.error('Paid on cannot be in the future.'); return; }
    issue.mutate({ id: issuing.id, paidOn });
  };

  const records = data || [];
  const totalNet = records.reduce((s,r) => s+(r.netSalary||0), 0);
  const issued = records.filter(r => r.status==='issued').length;
  const years = Array.from({ length: 7 }, (_, i) => thisYear - 5 + i);

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
          <select aria-label="Month" className="form-select" style={{width:100}} value={period.month} onChange={e=>setPeriod({...period,month:parseInt(e.target.value)})}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select aria-label="Year" className="form-select" style={{width:100}} value={period.year} onChange={e=>setPeriod({...period,year:parseInt(e.target.value)})}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
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
                        <button className="btn btn-sm btn-green" onClick={() => setIssuing(r)} disabled={issue.isPending}>
                          <CheckCircle size={12}/> Issue
                        </button>
                      ) : (
                        <div style={{display:'flex', gap:5, alignItems:'center'}}>
                          <span style={{fontSize:11, color:'#15803D', fontWeight:600}} title="Paid on">✓ {pkDate(r.issueDate)}</span>
                          <button className="btn btn-sm btn-outline btn-icon" title="Print Slip" aria-label="Print Slip"
                            onClick={() => printSalarySlip(r, school)}>
                            <Printer size={12}/>
                          </button>
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
                      <div className="empty-state-sub">Click "Generate" to create salary records for staff who had joined by then</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue: asks for the day it was really paid, so past salaries land on their own day */}
      {issuing && (
        <div className="modal-overlay" onClick={() => !issue.isPending && setIssuing(null)}>
          <div className="modal modal-sm" role="dialog" aria-label="Issue salary" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Issue salary</h3>
            </div>
            <div className="modal-body">
              <p style={{margin:'0 0 14px', fontSize:13, color:'#475569'}}>
                <strong>{issuing.staff?.name || '—'}</strong> · {MONTHS[issuing.month-1]} {issuing.year} · <strong style={{color:'#1E3A5F'}}>{money(issuing.netSalary)}</strong>
              </p>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label" htmlFor="salary-paid-on">Paid on</label>
                <input id="salary-paid-on" className="form-input" type="date" value={paidOn} max={pkToday()} onChange={e=>setPaidOn(e.target.value)}/>
                <div style={{fontSize:12, color:'#64748B', marginTop:6}}>The day the salary was actually paid. It is added to Expenses on that day.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIssuing(null)} disabled={issue.isPending}>Cancel</button>
              <button className="btn btn-green" onClick={confirmIssue} disabled={issue.isPending}>
                <CheckCircle size={14}/> {issue.isPending ? 'Issuing...' : 'Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
