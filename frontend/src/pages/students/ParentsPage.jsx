import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Home, Wallet, Users } from 'lucide-react';

const money = v => 'Rs. ' + ((v||0)/100).toLocaleString();

export default function ParentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['parents'],
    queryFn: () => api.get('/parents').then(r => r.data),
  });
  const { data:stats } = useQuery({
    queryKey: ['parent-stats'],
    queryFn: () => api.get('/parents/stats').then(r => r.data.data),
  });

  return (
    <div className="page-content fade-in">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <div>
          <h1 className="page-title">Parent Accounts</h1>
          <p style={{color:'#64748B', fontSize:13, marginTop:2}}>
            Parent portal access and wallet management
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-3" style={{marginBottom:16}}>
        {[
          {l:'Total Parents', v:stats?.total||data?.total||0, c:'#1E3A5F', bg:'#EFF6FF', icon:Users},
          {l:'Active', v:data?.data?.filter(p=>p.isActive).length||0, c:'#15803D', bg:'#DCFCE7', icon:Home},
          {l:'Wallet Balance', v:money((data?.data||[]).reduce((s,p)=>s+(p.walletBalance||0),0)), c:'#0D9488', bg:'#CCFBF1', icon:Wallet},
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.l} className="card" style={{background:item.bg, border:'none', padding:16, display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:40,height:40,borderRadius:10,background:item.c+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Icon size={18} color={item.c}/>
              </div>
              <div>
                <div style={{fontSize:20, fontWeight:800, color:item.c}}>{item.v}</div>
                <div style={{fontSize:11.5, color:'#64748B', fontWeight:600}}>{item.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="alert alert-info" style={{marginBottom:14}}>
        <span>📱</span>
        <span style={{fontSize:12.5}}>
          Parents are created automatically when you admit students. They can login via the mobile app using their email and password set during admission. Default password: <strong>parent</strong>
        </span>
      </div>

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        {isLoading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div className="table-wrap" style={{borderRadius:0, border:'none'}}>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Parent Name</th><th>CNIC</th><th>Phone</th><th>Wallet Balance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {(data?.data||[]).map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{color:'#94a3b8', fontSize:12}}>{idx+1}</td>
                    <td style={{fontWeight:600, color:'#1E3A5F'}}>Parent #{p.id}</td>
                    <td style={{fontFamily:'monospace', fontSize:12}}>{p.cnic||'—'}</td>
                    <td style={{fontSize:12.5}}>{p.phone2||'—'}</td>
                    <td style={{fontWeight:700, color: p.walletBalance>0?'#15803D':'#94a3b8'}}>{money(p.walletBalance)}</td>
                    <td><span className={`badge ${p.isActive?'badge-green':'badge-red'}`}>{p.isActive?'Active':'Inactive'}</span></td>
                  </tr>
                ))}
                {(!data?.data||data.data.length===0) && (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon">👨‍👩‍👦</div>
                      <div className="empty-state-text">No parent accounts yet</div>
                      <div className="empty-state-sub">Parent accounts are created automatically when admitting students</div>
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
