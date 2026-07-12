/**
 * IlmForge — Academic Calendar
 * Full school year calendar with events, exams, holidays, PTM
 * Competitor parity feature
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Plus, Calendar, Trash2, Filter } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const EVENT_TYPES = [
  { id:'exam',       label:'Exam',         color:'#dc2626', bg:'#fee2e2', icon:'📝' },
  { id:'holiday',    label:'Holiday',      color:'#15803d', bg:'#dcfce7', icon:'🎉' },
  { id:'ptm',        label:'PTM',          color:'#7c3aed', bg:'#ede9fe', icon:'👨‍👩‍👧' },
  { id:'event',      label:'School Event', color:'#0073b7', bg:'#dbeafe', icon:'🏫' },
  { id:'sports',     label:'Sports Day',   color:'#d97706', bg:'#fef3c7', icon:'⚽' },
  { id:'result',     label:'Result Day',   color:'#db2777', bg:'#fdf4ff', icon:'🏆' },
  { id:'meeting',    label:'Staff Meeting',color:'#64748b', bg:'#f1f5f9', icon:'👥' },
  { id:'custom',     label:'Custom',       color:'#374151', bg:'#f9fafb', icon:'📌' },
];

const typeInfo = id => EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[EVENT_TYPES.length - 1];

function EventDot({ type }) {
  const ti = typeInfo(type);
  return <div style={{ width:6, height:6, borderRadius:'50%', background:ti.color, flexShrink:0 }} />;
}

export default function AcademicCalendarPage() {
  const qc  = useQueryClient();
  const now  = new Date();
  const [year,  setYear]       = useState(now.getFullYear());
  const [month, setMonth]      = useState(now.getMonth());
  const [selected, setSelected]= useState(null);
  const [showAdd, setShowAdd]  = useState(false);
  const [filterType, setFilter]= useState('');
  const [form, setForm]        = useState({ title:'', type:'event', date:'', endDate:'', description:'', isHoliday:false });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['academic-events', year],
    queryFn: () => api.get('/events', { params: { year, limit: 200 } }).then(r => r.data.data || []).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const addEvent = useMutation({
    mutationFn: () => api.post('/events', { ...form }),
    onSuccess: () => { qc.invalidateQueries(['academic-events']); setShowAdd(false); setForm({ title:'', type:'event', date:'', endDate:'', description:'', isHoliday:false }); toast.success('Event added!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const delEvent = useMutation({
    mutationFn: id => api.delete(`/events/${id}`),
    onSuccess: () => { qc.invalidateQueries(['academic-events']); setSelected(null); toast.success('Event deleted'); },
  });

  // Group events by date
  const byDate = {};
  const filtered = filterType ? events.filter(e => (e.type || e.eventType) === filterType) : events;
  filtered.forEach(e => {
    const d = (e.date || e.startDate || '').split('T')[0];
    if (d) { if (!byDate[d]) byDate[d] = []; byDate[d].push(e); }
  });

  // Calendar grid for current month
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const todayStr = now.toISOString().split('T')[0];
  const monthEvents = filtered.filter(e => { const d = (e.date||e.startDate||'').substring(0,7); return d === `${year}-${String(month+1).padStart(2,'0')}`; });

  const selectedEvents = selected ? (byDate[selected] || []) : [];

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1B2F6E,#0073b7)', borderRadius:12, padding:'18px 22px', marginBottom:20, color:'white' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>📅 Academic Calendar</h1>
            <p style={{ margin:'4px 0 0', fontSize:13, opacity:0.8 }}>Exams, holidays, events, PTM — full school year at a glance</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => window.print()} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'white', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 }}>
              🖨️ Print
            </button>
            <button onClick={() => setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'white', border:'none', color:'#1B2F6E', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>
              <Plus size={13}/> Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
          <div style={{ background:'white', borderRadius:14, padding:24, maxWidth:500, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight:800, fontSize:16, color:'#1e3a5f', marginBottom:16 }}>Add Calendar Event</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Event Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="e.g. Mid-Term Exam, Eid Holiday" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
                    {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form,date:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date (optional)</label>
                  <input type="date" className="form-input" value={form.endDate} onChange={e => setForm({...form,endDate:e.target.value})} />
                </div>
                <div className="form-group" style={{ display:'flex', alignItems:'center', gap:8, paddingTop:24 }}>
                  <input type="checkbox" id="holiday" checked={form.isHoliday} onChange={e => setForm({...form,isHoliday:e.target.checked})} />
                  <label htmlFor="holiday" style={{ fontSize:13, fontWeight:600, cursor:'pointer' }}>Mark as School Holiday</label>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Optional details…" />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => addEvent.mutate()} disabled={!form.title||!form.date||addEvent.isPending}>
                  {addEvent.isPending ? 'Saving…' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
        {/* Calendar */}
        <div>
          {/* Month navigation */}
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
              <button onClick={prevMonth} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'#374151' }}><ChevronLeft size={20}/></button>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:800, color:'#1e3a5f' }}>{MONTHS[month]} {year}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>{monthEvents.length} event{monthEvents.length!==1?'s':''} this month</div>
              </div>
              <button onClick={nextMonth} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'#374151' }}><ChevronRight size={20}/></button>
            </div>

            {/* Day labels */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, padding:'0 12px', marginBottom:4 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'#94a3b8', padding:'4px 0' }}>{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, padding:'0 12px 12px' }}>
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayEvents = byDate[dateStr] || [];
                const isToday   = dateStr === todayStr;
                const isSel     = dateStr === selected;
                const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 5 || new Date(dateStr).getDay() === 6;
                const hasHoliday = dayEvents.some(e => e.isHoliday || e.type === 'holiday');
                return (
                  <div key={day} onClick={() => setSelected(isSel ? null : dateStr)}
                    style={{ minHeight:52, padding:4, borderRadius:8, cursor:'pointer', transition:'all .12s',
                      background: isSel ? '#1B2F6E' : hasHoliday ? '#dcfce7' : isToday ? '#eff6ff' : isWeekend ? '#fafafa' : 'white',
                      border: isSel ? '2px solid #1B2F6E' : isToday ? '2px solid #0073b7' : '1px solid #f1f5f9',
                    }}
                    onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='#f8faff'; }}
                    onMouseLeave={e => { if(!isSel) e.currentTarget.style.background = hasHoliday ? '#dcfce7' : isToday ? '#eff6ff' : isWeekend ? '#fafafa' : 'white'; }}>
                    <div style={{ fontSize:12, fontWeight: isToday||isSel ? 800 : 500, color: isSel ? 'white' : isToday ? '#0073b7' : '#374151', marginBottom:3 }}>{day}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                      {dayEvents.slice(0,3).map((e,ei) => <EventDot key={ei} type={e.type||e.eventType||'custom'} />)}
                      {dayEvents.length > 3 && <span style={{ fontSize:8, color:'#64748b' }}>+{dayEvents.length-3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day events */}
          {selected && (
            <div className="card">
              <div style={{ fontWeight:700, fontSize:14, color:'#1e3a5f', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span>📅 {new Date(selected).toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
                <button onClick={() => { setForm({...form, date:selected}); setShowAdd(true); }} style={{ fontSize:11, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#0073b7', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontWeight:600 }}>
                  <Plus size={11}/> Add
                </button>
              </div>
              {selectedEvents.length === 0
                ? <div style={{ fontSize:13, color:'#94a3b8', textAlign:'center', padding:16 }}>No events on this day</div>
                : selectedEvents.map(e => {
                  const ti = typeInfo(e.type||e.eventType||'custom');
                  return (
                    <div key={e.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:8, background:ti.bg, marginBottom:8 }}>
                      <span style={{ fontSize:20 }}>{ti.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:ti.color }}>{e.title||e.name}</div>
                        {e.description && <div style={{ fontSize:12, color:'#374151', marginTop:2 }}>{e.description}</div>}
                        <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{ti.label}{e.isHoliday ? ' · Holiday' : ''}</div>
                      </div>
                      <button onClick={() => { if(window.confirm('Delete this event?')) delEvent.mutate(e.id); }}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', padding:4 }}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          {/* Year navigation */}
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <button onClick={() => setYear(y=>y-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#374151' }}><ChevronLeft size={16}/></button>
              <span style={{ fontWeight:700, color:'#1e3a5f', fontSize:16 }}>{year}</span>
              <button onClick={() => setYear(y=>y+1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#374151' }}><ChevronRight size={16}/></button>
            </div>
          </div>

          {/* Event type legend + filter */}
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <Filter size={12}/> Filter by Type
            </div>
            <button onClick={() => setFilter('')}
              style={{ width:'100%', padding:'5px 10px', borderRadius:6, border:'1px solid #e2e8f0', background: !filterType ? '#1B2F6E' : 'white', color: !filterType ? 'white' : '#374151', fontSize:11.5, fontWeight:600, cursor:'pointer', marginBottom:5, textAlign:'left' }}>
              All Events ({events.length})
            </button>
            {EVENT_TYPES.map(t => {
              const count = events.filter(e => (e.type||e.eventType)===t.id).length;
              return (
                <button key={t.id} onClick={() => setFilter(filterType===t.id ? '' : t.id)}
                  style={{ width:'100%', padding:'5px 10px', borderRadius:6, border:'1px solid #e2e8f0', background: filterType===t.id ? t.color : 'white', color: filterType===t.id ? 'white' : '#374151', fontSize:11.5, fontWeight:600, cursor:'pointer', marginBottom:4, textAlign:'left', display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background: filterType===t.id ? 'white' : t.color, flexShrink:0 }} />
                  {t.icon} {t.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Upcoming events */}
          <div className="card">
            <div style={{ fontSize:13, fontWeight:700, color:'#1e3a5f', marginBottom:10 }}>📋 Upcoming Events</div>
            {isLoading ? <div style={{ textAlign:'center', color:'#94a3b8', fontSize:12 }}>Loading…</div>
            : filtered.filter(e => { const d=new Date(e.date||e.startDate||''); return d >= now; })
              .sort((a,b) => new Date(a.date||a.startDate) - new Date(b.date||b.startDate))
              .slice(0,8)
              .map(e => {
                const ti = typeInfo(e.type||e.eventType||'custom');
                const d  = new Date(e.date||e.startDate);
                const daysLeft = Math.ceil((d-now)/(1000*60*60*24));
                return (
                  <div key={e.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 0', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
                    onClick={() => { setMonth(d.getMonth()); setYear(d.getFullYear()); setSelected((e.date||e.startDate||'').split('T')[0]); }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{ti.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, color:'#1e3a5f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title||e.name}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{d.toLocaleDateString('en-PK', { day:'2-digit', month:'short' })}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color: daysLeft<=3 ? '#dc2626' : daysLeft<=7 ? '#d97706' : '#64748b', flexShrink:0 }}>
                      {daysLeft===0?'Today':daysLeft===1?'Tomorrow':`${daysLeft}d`}
                    </span>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
