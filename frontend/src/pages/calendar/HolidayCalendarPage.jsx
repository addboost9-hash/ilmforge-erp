/**
 * IlmForge — Holiday Calendar
 * Manage school holidays, events, term breaks
 * Visible to Parents, Students & Staff via their portals
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, Trash2, Printer, Calendar, X, Save, CheckCircle } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TYPES  = [
  { value:'holiday',  label:'Public Holiday',   color:'#DC2626', bg:'#FEE2E2' },
  { value:'event',    label:'School Event',      color:'#D97706', bg:'#FEF3C7' },
  { value:'exam',     label:'Exam Period',        color:'#7C3AED', bg:'#EDE9FE' },
  { value:'break',    label:'Term Break',         color:'#2563EB', bg:'#DBEAFE' },
  { value:'meeting',  label:'Parent Meeting',     color:'#0F766E', bg:'#CCFBF1' },
];
const typeInfo = t => TYPES.find(x => x.value === t) || TYPES[0];

const SEED_HOLIDAYS = [
  { id:1, title:'Independence Day',      date:'2025-08-14', type:'holiday', desc:'Pakistan Independence Day — National Holiday' },
  { id:2, title:'Eid ul Adha',           date:'2025-06-07', type:'holiday', desc:'Eid ul Adha — 3 Days Holiday'                  },
  { id:3, title:'Mid-Term Break',        date:'2025-10-13', endDate:'2025-10-17', type:'break',   desc:'One week mid-term break'  },
  { id:4, title:'Annual Sports Day',     date:'2025-11-05', type:'event',   desc:'Annual Sports Day & Prize Distribution'        },
  { id:5, title:'Final Exams Begin',     date:'2025-11-20', endDate:'2025-12-05', type:'exam',    desc:'Annual Examination'       },
  { id:6, title:'Winter Break',          date:'2025-12-20', endDate:'2026-01-03', type:'break',   desc:'Winter Vacation'          },
  { id:7, title:'Parent-Teacher Meeting',date:'2025-09-15', type:'meeting', desc:'Progress report sharing with parents'          },
];

export default function HolidayCalendarPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list | month
  const [filterType, setFilterType] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear,  setCurrentYear]  = useState(new Date().getFullYear());
  const [form, setForm] = useState({ title:'', date:'', endDate:'', type:'holiday', desc:'' });

  /* Use localStorage for holidays (no backend schema yet) */
  const storageKey = 'ilmforge_holidays';

  const { data: holidays = SEED_HOLIDAYS, refetch } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : SEED_HOLIDAYS;
    },
    staleTime: 0,
  });

  const saveToStorage = (list) => {
    localStorage.setItem(storageKey, JSON.stringify(list));
    qc.invalidateQueries(['holidays']);
  };

  const addHoliday = useMutation({
    mutationFn: async (data) => {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!existing.length) existing.push(...SEED_HOLIDAYS);
      const newItem = { ...data, id: Date.now() };
      saveToStorage([...existing, newItem]);
      return newItem;
    },
    onSuccess: () => {
      toast.success('Holiday / event added!');
      setShowForm(false);
      setForm({ title:'', date:'', endDate:'', type:'holiday', desc:'' });
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id) => {
      const existing = JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(SEED_HOLIDAYS));
      saveToStorage(existing.filter(h => h.id !== id));
    },
    onSuccess: () => toast.success('Removed'),
  });

  const filtered = (holidays || [])
    .filter(h => !filterType || h.type === filterType)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const upcomingCount = (holidays || []).filter(h => new Date(h.date) >= new Date()).length;

  /* Month view helpers */
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const monthHolidays = (holidays || []).filter(h => {
    const d = new Date(h.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const printCalendar = () => {
    const lines = filtered.map(h => {
      const ti = typeInfo(h.type);
      return `<tr><td>${new Date(h.date).toLocaleDateString('en-PK')}</td><td>${h.endDate ? new Date(h.endDate).toLocaleDateString('en-PK') : '—'}</td><td>${h.title}</td><td style="color:${ti.color}">${ti.label}</td><td>${h.desc||'—'}</td></tr>`;
    }).join('');
    const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
    const logo = localStorage.getItem('schoolLogoPreview') || '';
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Holiday Calendar</title><style>
      body{font-family:Arial;padding:20px;position:relative}
      table{width:100%;border-collapse:collapse;position:relative;z-index:1;background:#fff}
      th,td{border:1px solid #ddd;padding:8px;font-size:12px}
      th{background:#0F4C45;color:#fff}
      h2{color:#0F4C45;position:relative;z-index:1}
      .wm{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:0}
      .wm img{width:170px;height:170px;object-fit:cover;border-radius:20px;opacity:.07}
      .wm span{margin-top:10px;font-size:30px;letter-spacing:1px;font-weight:900;color:#111827;text-transform:uppercase;opacity:.055}
    </style></head><body>
      <div class="wm">${logo ? `<img src="${logo}" alt="watermark"/>` : ''}<span>${schoolName}</span></div>
      <h2>${schoolName} — Holiday Calendar ${currentYear}</h2>
      <table><tr><th>Start</th><th>End</th><th>Event</th><th>Type</th><th>Details</th></tr>${lines}</table><script>window.print()<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Holiday Calendar</h1>
          <p className="page-subtitle">School holidays, events and term dates — visible to parents, students & staff</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline btn-sm" onClick={printCalendar}><Printer size={13}/> Print</button>
          <button className="btn btn-teal" onClick={() => setShowForm(s => !s)}>
            {showForm ? <><X size={13}/> Cancel</> : <><Plus size={13}/> Add Holiday</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:16 }}>
        {[
          { label:'Total Events', val: (holidays||[]).length, color:'#1D4ED8' },
          { label:'Upcoming',     val: upcomingCount,          color:'#15803D' },
          { label:'This Month',   val: monthHolidays.length,   color:'#D97706' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:12.5, color:'#6B7280', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16, background:'#F0FDF9', border:'1px solid #CCFBF1' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#0F766E', marginBottom:14 }}>Add Holiday / Event</h3>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:12, alignItems:'end' }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Eid ul Fitr" value={form.title}
                onChange={e => setForm({ ...form, title:e.target.value })}/>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Start Date *</label>
              <input className="form-input" type="date" value={form.date}
                onChange={e => setForm({ ...form, date:e.target.value })}/>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={form.endDate}
                onChange={e => setForm({ ...form, endDate:e.target.value })}/>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type}
                onChange={e => setForm({ ...form, type:e.target.value })}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop:10, marginBottom:0 }}>
            <label className="form-label">Description / Details</label>
            <input className="form-input" placeholder="Optional details..." value={form.desc}
              onChange={e => setForm({ ...form, desc:e.target.value })}/>
          </div>
          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            <button className="btn btn-teal" disabled={!form.title || !form.date || addHoliday.isPending}
              onClick={() => addHoliday.mutate(form)}>
              <Save size={13}/> {addHoliday.isPending ? 'Saving…' : 'Add to Calendar'}
            </button>
          </div>
        </div>
      )}

      {/* View toggle + filter */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div className="tab-list" style={{ marginBottom:0, flex:'none' }}>
          {[{id:'list',label:'📋 List'},{id:'month',label:'📅 Month'}].map(v => (
            <button key={v.id} className={`tab-btn${viewMode===v.id?' active':''}`} onClick={()=>setViewMode(v.id)}>{v.label}</button>
          ))}
        </div>
        <select className="form-select" style={{ width:180 }} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {viewMode==='month' && (
          <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
            <button className="btn btn-outline btn-sm" onClick={()=>{ if(currentMonth===0){setCurrentMonth(11);setCurrentYear(y=>y-1);}else setCurrentMonth(m=>m-1); }}>←</button>
            <span style={{ fontWeight:700, fontSize:13, color:'#1E3A5F', minWidth:120, textAlign:'center' }}>{MONTHS[currentMonth]} {currentYear}</span>
            <button className="btn btn-outline btn-sm" onClick={()=>{ if(currentMonth===11){setCurrentMonth(0);setCurrentYear(y=>y+1);}else setCurrentMonth(m=>m+1); }}>→</button>
          </div>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>End Date</th><th>Event / Holiday</th><th>Type</th><th>Details</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(h => {
                const ti    = typeInfo(h.type);
                const isPast = new Date(h.date) < new Date();
                return (
                  <tr key={h.id} style={{ opacity: isPast ? 0.65 : 1 }}>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0F766E' }}>
                        {new Date(h.date).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}
                      </div>
                      {isPast && <div style={{ fontSize:10.5, color:'#94A3B8' }}>Past</div>}
                    </td>
                    <td style={{ fontSize:12, color:'#6B7280' }}>
                      {h.endDate ? new Date(h.endDate).toLocaleDateString('en-PK', { day:'2-digit', month:'short' }) : '—'}
                    </td>
                    <td style={{ fontWeight:700, fontSize:13 }}>{h.title}</td>
                    <td>
                      <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 9px', borderRadius:99, background:ti.bg, color:ti.color }}>
                        {ti.label}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'#6B7280', maxWidth:200 }}>{h.desc || '—'}</td>
                    <td>
                      <button className="btn btn-sm btn-icon" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C' }}
                        onClick={() => { if (confirm('Remove this holiday?')) deleteHoliday.mutate(h.id); }}>
                        <Trash2 size={12}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={6}><div className="empty-state" style={{ padding:28 }}><div className="empty-state-icon">📅</div><div className="empty-state-text">No holidays added yet</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <div className="card" style={{ padding:16 }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:6 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:11.5, fontWeight:700, color:'#6B7280', padding:'4px 0' }}>{d}</div>
            ))}
          </div>
          {/* Calendar cells */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {Array.from({ length: firstDay }, (_,i) => <div key={'e'+i}/>)}
            {Array.from({ length: daysInMonth }, (_,i) => {
              const day  = i + 1;
              const date = new Date(currentYear, currentMonth, day);
              const isToday = date.toDateString() === new Date().toDateString();
              const dayHols = monthHolidays.filter(h => new Date(h.date).getDate() === day);
              return (
                <div key={day} style={{
                  minHeight: 56, border: '1px solid',
                  borderColor: isToday ? '#0D9488' : '#F1F5F9',
                  borderRadius: 7, padding: '4px 6px',
                  background: isToday ? '#F0FDF9' : '#fff',
                }}>
                  <div style={{ fontSize:12, fontWeight: isToday ? 800 : 600, color: isToday ? '#0D9488' : '#374151', marginBottom:3 }}>{day}</div>
                  {dayHols.map(h => {
                    const ti = typeInfo(h.type);
                    return (
                      <div key={h.id} title={h.title}
                        style={{ fontSize:9.5, fontWeight:700, color:ti.color, background:ti.bg, borderRadius:3, padding:'1px 4px', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {h.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap' }}>
            {TYPES.map(t => (
              <div key={t.value} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:t.bg, border:`1.5px solid ${t.color}` }}/>
                <span style={{ fontSize:11.5, color:'#6B7280' }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
