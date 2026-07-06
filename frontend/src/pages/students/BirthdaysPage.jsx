/**
 * IlmForge — Birthdays Today (Fixed + Enhanced)
 * Student + Staff birthdays — no undefined CSS classes, safe rendering
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Cake, MessageSquare, Users, Briefcase, Phone } from 'lucide-react';

const COLORS = ['#F472B6','#818CF8','#34D399','#60A5FA','#FBBF24','#F87171','#A78BFA'];

const fmtDob = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long' }); }
  catch { return '—'; }
};

function BirthdayCard({ person, index, type }) {
  const color   = COLORS[index % COLORS.length];
  const initial = (person?.name || '?').charAt(0).toUpperCase();
  const label   = type === 'student'
    ? (person?.class?.name || person?.className || '—')
    : (person?.designation || 'Staff');
  const sub = type === 'student'
    ? `Roll: ${person?.rollNo || '—'}`
    : (person?.empCode || `EMP-${person?.id}`);
  const phone = person?.emergencyPhone || person?.parent?.phone || person?.phone || '';

  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderBottom:'1px solid #f1f5f9' }}>
      <div style={{ width:42, height:42, borderRadius:'50%', flexShrink:0, background:color+'22', border:`2px solid ${color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color }}>
        {initial}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14, color:'#1e3a5f' }}>{person?.name || '—'}</div>
        <div style={{ fontSize:12, color:'#64748b', marginTop:2, display:'flex', gap:6 }}>
          <span>{label}</span>
          <span style={{ color:'#cbd5e1' }}>·</span>
          <span style={{ fontFamily:'monospace' }}>{sub}</span>
        </div>
      </div>
      <div style={{ textAlign:'center', flexShrink:0 }}>
        <div style={{ fontSize:20 }}>🎂</div>
        <div style={{ fontSize:11, color:'#94a3b8' }}>{fmtDob(person?.dob)}</div>
      </div>
      {phone && (
        <a href={`https://wa.me/92${String(phone).replace(/^0/,'').replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Happy Birthday ${person?.name}! 🎂 Wishing you a wonderful day from IlmForge!`)}`}
          target="_blank" rel="noreferrer"
          style={{ flexShrink:0, width:34, height:34, borderRadius:8, background:'#f0fdf4', border:'1px solid #86efac', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}>
          <Phone size={14} color="#15803d" />
        </a>
      )}
    </div>
  );
}

export default function BirthdaysPage() {
  const { data: students = [], isLoading: sLoad } = useQuery({
    queryKey: ['birthdays-today'],
    queryFn:  () => api.get('/students/birthdays/today').then(r => r.data.data || []).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const { data: staff = [], isLoading: stLoad } = useQuery({
    queryKey: ['staff-birthdays-today'],
    queryFn: async () => {
      try {
        const res  = await api.get('/staff?limit=200');
        const all  = res.data.data || [];
        const today = new Date();
        return all.filter(s => {
          if (!s.dob) return false;
          try { const d = new Date(s.dob); return d.getMonth() === today.getMonth() && d.getDate() === today.getDate(); }
          catch { return false; }
        });
      } catch { return []; }
    },
    staleTime: 5 * 60_000,
  });

  const wishAll = useMutation({
    mutationFn: () => {
      const phones = [...students, ...staff].map(p => p.emergencyPhone || p.parent?.phone || p.phone).filter(Boolean);
      return api.post('/notifications/sms', { phones, message: `Happy Birthday! 🎂 Wishing you a wonderful day from the IlmForge family!` });
    },
    onSuccess: r => toast.success(r.data.message || 'Birthday wishes sent!'),
    onError:   () => toast.error('Check SMS settings'),
  });

  const total     = students.length + staff.length;
  const isLoading = sLoad || stLoad;

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Cake size={20} color="#f472b6" /> Birthdays Today 🎉
          </h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:3 }}>
            {isLoading ? 'Loading…' : total > 0 ? `${total} birthday${total!==1?'s':''} today` : 'No birthdays today'}
          </p>
        </div>
        {total > 0 && (
          <button className="btn btn-teal btn-sm" onClick={() => wishAll.mutate()} disabled={wishAll.isPending}>
            <MessageSquare size={13}/> {wishAll.isPending ? 'Sending…' : `Wish All via SMS`}
          </button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && total > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {[
            { label:'Student Birthdays', v:students.length, icon:Users,    color:'#0073b7', bg:'#eff6ff' },
            { label:'Staff Birthdays',   v:staff.length,    icon:Briefcase, color:'#7c3aed', bg:'#f5f3ff' },
          ].map(s => { const Icon = s.icon; return (
            <div key={s.label} className="card" style={{ padding:16, background:s.bg, border:`1px solid ${s.color}22` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:s.color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={17} color={s.color}/>
                </div>
                <div>
                  <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{s.label}</div>
                </div>
              </div>
            </div>
          );})}
        </div>
      )}

      {isLoading ? (
        <div className="loading-center"><div className="spinner"/></div>
      ) : total === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding:60 }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎂</div>
            <div className="empty-state-text">No birthdays today</div>
            <div className="empty-state-sub">Check back tomorrow!</div>
          </div>
        </div>
      ) : (
        <>
          {/* Students */}
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header" style={{ background:'linear-gradient(90deg,#1E3A5F,#253d63)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Users size={14} color="#5EEAD4"/>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#fff' }}>Student Birthdays</span>
              </div>
              {students.length > 0 && <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>{students.length}</span>}
            </div>
            {students.length === 0
              ? <div className="empty-state" style={{ padding:32 }}><div style={{ fontSize:32 }}>🎂</div><div className="empty-state-sub">No student birthdays today</div></div>
              : students.map((s, i) => <BirthdayCard key={s.id || i} person={s} index={i} type="student"/>)
            }
          </div>

          {/* Staff */}
          <div className="card">
            <div className="card-header" style={{ background:'linear-gradient(90deg,#4c1d95,#6d28d9)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Briefcase size={14} color="#c4b5fd"/>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#fff' }}>Staff Birthdays</span>
              </div>
              {staff.length > 0 && <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>{staff.length}</span>}
            </div>
            {staff.length === 0
              ? <div className="empty-state" style={{ padding:32 }}><div style={{ fontSize:32 }}>🎂</div><div className="empty-state-sub">No staff birthdays today</div></div>
              : staff.map((s, i) => <BirthdayCard key={s.id || i} person={s} index={i} type="staff"/>)
            }
          </div>
        </>
      )}
    </div>
  );
}
