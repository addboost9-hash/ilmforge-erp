/**
 * IlmForge — Platform Owner Control Panel
 * PRIVATE PAGE — Only for Ghulam Mujtaba (Platform Owner)
 *
 * Access: ilmforge-erp.vercel.app/platform-control
 * Requires: PLATFORM_OWNER_KEY
 *
 * Features:
 * - View all registered schools
 * - Activate / Suspend any school
 * - Generate offline license keys
 * - Change plans
 * - Platform-wide stats
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Shield, School, Users, DollarSign, Power, PowerOff,
  Key, RefreshCw, Search, CheckCircle, XCircle, Clock,
  Building2, BarChart2, Eye, Lock, Unlock, AlertTriangle,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const PLAN_COLORS = {
  free:      { bg: '#f1f5f9', color: '#64748b', label: 'Free' },
  starter:   { bg: '#dbeafe', color: '#1d4ed8', label: 'Starter' },
  standard:  { bg: '#dcfce7', color: '#15803d', label: 'Standard' },
  premium:   { bg: '#fef3c7', color: '#92400e', label: 'Premium' },
};

const STATUS_COLORS = {
  active:    { bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  inactive:  { bg: '#f1f5f9', color: '#64748b', icon: Clock },
  suspended: { bg: '#fee2e2', color: '#dc2626', icon: XCircle },
  trial:     { bg: '#fef3c7', color: '#92400e', icon: Clock },
  expired:   { bg: '#fee2e2', color: '#b91c1c', icon: XCircle },
};

export default function PlatformControlPage() {
  const qc = useQueryClient();
  const [platformKey, setPlatformKey] = useState(() => localStorage.getItem('platform_key') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [licenseModal, setLicenseModal] = useState(null);
  const [generatedLicense, setGeneratedLicense] = useState(null);

  /* ── API helper with platform key ── */
  const platformApi = axios.create({
    baseURL: API,
    headers: { 'x-platform-key': platformKey, 'Content-Type': 'application/json' },
  });

  /* ── Auth check ── */
  const handleAuth = async () => {
    try {
      await platformApi.get('/platform/stats');
      setAuthenticated(true);
      localStorage.setItem('platform_key', platformKey);
      toast.success('Platform Control Access Granted ✅');
    } catch {
      toast.error('Invalid platform key! Access denied.');
    }
  };

  /* ── Queries ── */
  const { data: statsData } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => platformApi.get('/platform/stats').then(r => r.data.data),
    enabled: authenticated,
    staleTime: 30_000,
  });

  const { data: schoolsData, isLoading } = useQuery({
    queryKey: ['platform-schools', search, statusFilter],
    queryFn: () => platformApi.get('/platform/schools', { params: { search: search || undefined, status: statusFilter || undefined, limit: 50 } }).then(r => r.data),
    enabled: authenticated,
    staleTime: 30_000,
  });

  const schools = schoolsData?.data || [];

  /* ── Mutations ── */
  const activateMut = useMutation({
    mutationFn: ({ id, plan }) => platformApi.post(`/platform/schools/${id}/activate`, { plan }),
    onSuccess: (_, { id }) => { qc.invalidateQueries(['platform-schools']); toast.success('School activated!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }) => platformApi.post(`/platform/schools/${id}/suspend`, { reason }),
    onSuccess: () => { qc.invalidateQueries(['platform-schools']); toast.success('School suspended!'); setSelectedSchool(null); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const licenseMut = useMutation({
    mutationFn: ({ id, days, plan }) => platformApi.post(`/platform/schools/${id}/license`, { days, plan }),
    onSuccess: (data) => {
      qc.invalidateQueries(['platform-schools']);
      setGeneratedLicense(data.data.data);
      toast.success('License generated!');
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const revokeLicenseMut = useMutation({
    mutationFn: (id) => platformApi.delete(`/platform/schools/${id}/license`),
    onSuccess: () => { qc.invalidateQueries(['platform-schools']); toast.success('License revoked!'); setLicenseModal(null); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => platformApi.delete(`/platform/schools/${id}`),
    onSuccess: () => { qc.invalidateQueries(['platform-schools']); qc.invalidateQueries(['platform-stats']); toast.success('School permanently deleted!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  /* ══ LOGIN SCREEN ══════════════════════════════════════════════ */
  if (!authenticated) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1B2F6E,#0073b7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ background:'white', borderRadius:20, padding:'40px 36px', maxWidth:420, width:'100%', textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#1B2F6E,#0073b7)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:32 }}>
            🛡️
          </div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#1e3a5f', marginBottom:6 }}>Platform Control</h1>
          <p style={{ fontSize:13.5, color:'#64748b', marginBottom:24 }}>
            IlmForge Master Admin Panel<br/>
            <strong>Sirf Platform Owner ke liye</strong>
          </p>
          <div style={{ marginBottom:16 }}>
            <input
              type="password"
              placeholder="Platform Owner Key enter karein..."
              value={platformKey}
              onChange={e => setPlatformKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{ width:'100%', padding:'13px 16px', border:'2px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}
            />
          </div>
          <button onClick={handleAuth} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#1B2F6E,#0073b7)', border:'none', borderRadius:10, color:'white', fontSize:15, fontWeight:800, cursor:'pointer' }}>
            🔐 Access Platform Control
          </button>
          <p style={{ marginTop:16, fontSize:12, color:'#94a3b8' }}>
            This page is not linked anywhere. URL: /platform-control
          </p>
        </div>
      </div>
    );
  }

  /* ══ MAIN DASHBOARD ════════════════════════════════════════════ */
  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1B2F6E,#0073b7)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Shield size={28} color="white"/>
          <div>
            <div style={{ color:'white', fontWeight:900, fontSize:18 }}>IlmForge Platform Control</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:12 }}>Master Admin — All Schools Under Your Control</div>
          </div>
        </div>
        <button onClick={() => { setAuthenticated(false); localStorage.removeItem('platform_key'); }} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'white', padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
          🔒 Lock
        </button>
      </div>

      <div style={{ padding:'20px 24px', maxWidth:1400, margin:'0 auto' }}>
        {/* Stats */}
        {statsData && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
            {[
              { label:'Total Schools',   v:statsData.totalSchools,   color:'#1B2F6E', bg:'#eff6ff', icon:Building2 },
              { label:'Active',         v:statsData.activeSchools,  color:'#15803d', bg:'#f0fdf4', icon:CheckCircle },
              { label:'Suspended',      v:statsData.suspendedSchools,color:'#dc2626',bg:'#fef2f2', icon:XCircle },
              { label:'Free Plan',      v:statsData.freeSchools,    color:'#64748b', bg:'#f8f9fa', icon:Shield },
              { label:'Paid Plans',     v:statsData.paidSchools,    color:'#d97706', bg:'#fffbeb', icon:DollarSign },
              { label:'Total Students', v:statsData.totalStudents,  color:'#7c3aed', bg:'#f5f3ff', icon:Users },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.color}22`, borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
                  <Icon size={18} color={s.color}/>
                  <div>
                    <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.v?.toLocaleString()}</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Search + Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:'1 1 240px' }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
            <input style={{ width:'100%', padding:'9px 9px 9px 32px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
              placeholder="School name, email, city..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={{ padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active ✅</option>
            <option value="suspended">Suspended ❌</option>
            <option value="inactive">Inactive ⏸️</option>
          </select>
          {/* Activate ALL suspended schools at once */}
          <button onClick={async () => {
            if (!window.confirm(`Activate ALL ${schools.filter(s=>s.status!=='active').length} suspended schools?`)) return;
            for (const s of schools.filter(s => s.status !== 'active')) {
              await platformApi.post(`/platform/schools/${s.id}/activate`, { plan: s.plan || 'free' }).catch(() => {});
            }
            qc.invalidateQueries(['platform-schools']);
            qc.invalidateQueries(['platform-stats']);
            toast.success('All schools activated!');
          }}
            style={{ padding:'9px 16px', background:'#dcfce7', border:'1px solid #86efac', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#15803d' }}>
            ✅ Activate All
          </button>
          <button onClick={() => qc.invalidateQueries(['platform-schools'])}
            style={{ padding:'9px 14px', background:'white', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600 }}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>

        {/* Schools Table */}
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#1e3a5f' }}>All Registered Schools ({schools.length})</h3>
            <span style={{ fontSize:12, color:'#94a3b8' }}>Aap kisi bhi school ko control kar sakte hain</span>
          </div>

          {isLoading ? (
            <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Loading...</div>
          ) : schools.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No schools found</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f8f9fa' }}>
                    {['#','School','Email/City','Plan','Status','Students','License','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#374151', borderBottom:'2px solid #e2e8f0', fontSize:11, textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school, i) => {
                    const sc = STATUS_COLORS[school.status] || STATUS_COLORS.inactive;
                    const pc = PLAN_COLORS[school.plan] || PLAN_COLORS.free;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={school.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'10px 14px', color:'#94a3b8', fontSize:12 }}>{i+1}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ fontWeight:700, color:'#1e3a5f' }}>{school.name}</div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>ID: {school.id} · /{school.slug}</div>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ fontSize:12 }}>{school.email}</div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>{school.city || '—'}</div>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ background:pc.bg, color:pc.color, padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{pc.label}</span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ background:sc.bg, color:sc.color, padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, width:'fit-content' }}>
                            <StatusIcon size={11}/> {school.status}
                          </span>
                          {school.suspendReason && <div style={{ fontSize:10, color:'#dc2626', marginTop:2 }}>📌 {school.suspendReason.slice(0,30)}</div>}
                        </td>
                        <td style={{ padding:'10px 14px', textAlign:'center' }}>
                          <span style={{ fontWeight:700, color:'#374151' }}>{school._count?.users || 0}</span>
                          <div style={{ fontSize:10, color:'#94a3b8' }}>/{school.maxStudents}</div>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {school.licenseKey ? (
                            <div>
                              <div style={{ fontFamily:'monospace', fontSize:10, background:'#f1f5f9', padding:'2px 6px', borderRadius:4, color:'#374151' }}>{school.licenseKey}</div>
                              {school.licenseExpiry && <div style={{ fontSize:10, color:'#94a3b8' }}>Exp: {new Date(school.licenseExpiry).toLocaleDateString('en-PK')}</div>}
                            </div>
                          ) : <span style={{ fontSize:11, color:'#94a3b8' }}>No license</span>}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                            {/* Activate */}
                            {school.status !== 'active' && (
                              <button onClick={() => activateMut.mutate({ id: school.id, plan: school.plan })}
                                title="Activate School"
                                style={{ padding:'5px 10px', background:'#dcfce7', border:'1px solid #86efac', color:'#15803d', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                                <CheckCircle size={11}/> Activate
                              </button>
                            )}
                            {/* Suspend */}
                            {school.status === 'active' && (
                              <button onClick={() => {
                                const reason = prompt(`Suspend "${school.name}" — Reason:`);
                                if (reason !== null) suspendMut.mutate({ id: school.id, reason: reason || 'Suspended by admin' });
                              }}
                                title="Suspend School"
                                style={{ padding:'5px 10px', background:'#fff7ed', border:'1px solid #fed7aa', color:'#c2410c', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                                <PowerOff size={11}/> Suspend
                              </button>
                            )}
                            {/* License */}
                            <button onClick={() => { setLicenseModal(school); setGeneratedLicense(null); }}
                              title="License Management"
                              style={{ padding:'5px 10px', background:'#fef3c7', border:'1px solid #fde68a', color:'#92400e', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                              <Key size={11}/> License
                            </button>
                            {/* DELETE — Permanent */}
                            <button
                              onClick={() => {
                                if (window.confirm(`⚠️ PERMANENTLY DELETE "${school.name}"?\n\nThis will delete ALL data:\n• All students (${school._count?.users || 0} users)\n• All fees, attendance, exams\n• Cannot be undone!\n\nType the school name to confirm: ${school.name}`)) {
                                  const typed = window.prompt(`Type school name to confirm deletion:\n"${school.name}"`);
                                  if (typed === school.name) {
                                    deleteMut.mutate(school.id);
                                  } else if (typed !== null) {
                                    toast.error('School name did not match. Deletion cancelled.');
                                  }
                                }
                              }}
                              disabled={deleteMut.isPending}
                              title="Permanently Delete School"
                              style={{ padding:'5px 10px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* License Modal */}
      {licenseModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setLicenseModal(null)}>
          <div style={{ background:'white', borderRadius:16, padding:28, maxWidth:500, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:'0 0 16px', fontSize:17, fontWeight:800, color:'#1e3a5f', display:'flex', alignItems:'center', gap:8 }}>
              <Key size={18}/> License — {licenseModal.name}
            </h3>

            {generatedLicense ? (
              <div style={{ padding:16, background:'#f0fdf4', border:'2px solid #86efac', borderRadius:10, marginBottom:16 }}>
                <div style={{ fontWeight:800, color:'#15803d', marginBottom:8 }}>✅ License Generated!</div>
                <div style={{ fontFamily:'monospace', fontSize:16, fontWeight:800, color:'#1e3a5f', letterSpacing:2, marginBottom:8 }}>{generatedLicense.licenseKey}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>
                  Valid until: <strong>{generatedLicense.expiryDate}</strong> ({generatedLicense.daysValid} days)<br/>
                  Plan: <strong>{generatedLicense.plan}</strong>
                </div>
                <div style={{ marginTop:10, padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:7, fontSize:12, color:'#92400e' }}>
                  📋 Yeh key school admin ko dain — App → Settings → License mein enter karein
                </div>
                <button onClick={() => { navigator.clipboard?.writeText(generatedLicense.licenseKey); toast.success('Key copied!'); }}
                  style={{ marginTop:10, padding:'7px 14px', background:'#1B2F6E', color:'white', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  📋 Copy License Key
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>License Duration</label>
                  <select id="lic-days" style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }}>
                    <option value="30">30 Din (1 Mahina)</option>
                    <option value="90">90 Din (3 Mahine)</option>
                    <option value="180">180 Din (6 Mahine)</option>
                    <option value="365" selected>365 Din (1 Saal)</option>
                    <option value="730">730 Din (2 Saal)</option>
                    <option value="3650">3650 Din (10 Saal — Permanent)</option>
                  </select>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Plan</label>
                  <select id="lic-plan" style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13 }}>
                    <option value="free">Free (100 students)</option>
                    <option value="starter">Starter (300 students)</option>
                    <option value="standard" selected>Standard (800 students)</option>
                    <option value="premium">Premium (Unlimited)</option>
                  </select>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => {
                    const days = document.getElementById('lic-days').value;
                    const plan = document.getElementById('lic-plan').value;
                    licenseMut.mutate({ id: licenseModal.id, days: parseInt(days), plan });
                  }} disabled={licenseMut.isPending}
                    style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#1B2F6E,#0073b7)', border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                    {licenseMut.isPending ? 'Generating...' : '🔑 Generate License Key'}
                  </button>
                  {licenseModal.licenseKey && (
                    <button onClick={() => { if(window.confirm('License revoke karein? School offline nahi chalegi.')) revokeLicenseMut.mutate(licenseModal.id); }}
                      style={{ padding:'10px 16px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:9, color:'#dc2626', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      ❌ Revoke
                    </button>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => setLicenseModal(null)} style={{ marginTop:12, width:'100%', padding:'9px', background:'#f1f5f9', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, color:'#374151', fontWeight:600 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
