/**
 * IlmForge — Daily Homework Diary (Calendar-based)
 * Matches competitor: subject cards (Pending/Done), date strip,
 * "Send Diary Via SMS" button per class
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Send, Plus, BookOpen, Check, Clock, Trash2 } from 'lucide-react';

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const COLORS = ['#ef4444','#3b82f6','#f59e0b','#8b5cf6','#10b981','#f97316','#06b6d4'];
const fmtDate = d => new Date(d).toISOString().split('T')[0];

/* ── Date strip (5 days around selected) ─────────────────── */
function DateStrip({ selected, onChange }) {
  const days = useMemo(() => {
    const arr = [];
    const base = new Date(selected);
    for (let i = -2; i <= 2; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [selected]);

  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', padding:'12px 0' }}>
      <button onClick={() => { const d=new Date(selected); d.setDate(d.getDate()-1); onChange(fmtDate(d)); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b' }}>
        <ChevronLeft size={18}/>
      </button>
      {days.map(d => {
        const ds = fmtDate(d);
        const isSelected = ds === selected;
        const isToday = ds === fmtDate(new Date());
        return (
          <div key={ds} onClick={() => onChange(ds)}
            style={{ flex:1, textAlign:'center', padding:'8px 4px', borderRadius:10, cursor:'pointer',
              background: isSelected ? '#1B2F6E' : isToday ? '#eff6ff' : 'white',
              border: isSelected ? 'none' : '1px solid #e2e8f0',
              transition:'all .15s' }}>
            <div style={{ fontSize:10, fontWeight:700, color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8', textTransform:'uppercase' }}>
              {DAYS[d.getDay()]}
            </div>
            <div style={{ fontSize:17, fontWeight:800, color: isSelected ? 'white' : '#1e3a5f', marginTop:2 }}>
              {d.getDate()}
            </div>
            {isToday && !isSelected && <div style={{ width:5, height:5, borderRadius:'50%', background:'#0073b7', margin:'3px auto 0' }}/>}
          </div>
        );
      })}
      <button onClick={() => { const d=new Date(selected); d.setDate(d.getDate()+1); onChange(fmtDate(d)); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b' }}>
        <ChevronRight size={18}/>
      </button>
    </div>
  );
}

/* ── Subject Card ────────────────────────────────────────── */
function SubjectCard({ subject, entry, color, onAdd, onDelete }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  const pending = !entry;
  const done    = !!entry;

  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:`2px solid ${color}30`, background: pending ? color + '10' : '#f0fdf4' }}>
      {/* Subject header */}
      <div style={{ background: color, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ color:'white', fontWeight:700, fontSize:14 }}>{subject.name}</div>
        {pending && (
          <div style={{ background:'rgba(255,255,255,0.25)', color:'white', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, writingMode:'horizontal-tb' }}>
            Pending
          </div>
        )}
        {done && <Check size={16} color="white" />}
      </div>

      {/* Content */}
      <div style={{ padding:'10px 14px' }}>
        {done ? (
          <>
            <div style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{entry.description || entry.content || 'Homework assigned'}</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Added By: {entry.teacher?.name || entry.addedBy || 'Teacher'}</div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <span style={{ fontSize:10, background:'#dcfce7', color:'#15803d', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>✓ Assigned</span>
              <button onClick={() => onDelete(entry.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', marginLeft:'auto' }}>
                <Trash2 size={13}/>
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:12, color: color, fontWeight:600, marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
              <Clock size={12}/> Homework Not Yet Assigned By Teacher!
            </div>
            {adding ? (
              <>
                <textarea style={{ width:'100%', padding:'6px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, resize:'none', fontFamily:'inherit', outline:'none' }}
                  rows={3} placeholder="Enter homework details…" value={text} onChange={e => setText(e.target.value)} autoFocus />
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  <button onClick={() => { onAdd(subject.id, text); setText(''); setAdding(false); }}
                    disabled={!text.trim()}
                    style={{ flex:1, padding:'6px', background: color, color:'white', border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    Save
                  </button>
                  <button onClick={() => { setAdding(false); setText(''); }}
                    style={{ padding:'6px 10px', background:'#f1f5f9', border:'none', borderRadius:6, fontSize:12, cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setAdding(true)}
                style={{ width:'100%', padding:'6px', background: color + '15', border:`1px dashed ${color}`, borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', color, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                <Plus size={12}/> Assign Homework
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function HomeworkDiaryPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(fmtDate(new Date()));
  const [classId, setClassId] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []).catch(() => []),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['diary-subjects', classId],
    queryFn: () => api.get('/subjects', { params: { classId } }).then(r => r.data.data || []).catch(() => []),
    enabled: !!classId,
  });

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['diary-homework', classId, date],
    queryFn: () => api.get('/homework', { params: { classId, date, limit: 50 } }).then(r => r.data.data || []).catch(() => []),
    enabled: !!classId,
  });

  const addMut = useMutation({
    mutationFn: ({ subjectId, description }) => api.post('/homework', {
      classId: parseInt(classId), subjectId, description, date, dueDate: date, title: 'Daily Homework',
    }),
    onSuccess: () => { qc.invalidateQueries(['diary-homework']); toast.success('Homework assigned!'); },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const delMut = useMutation({
    mutationFn: id => api.delete(`/homework/${id}`),
    onSuccess: () => { qc.invalidateQueries(['diary-homework']); toast.success('Removed'); },
  });

  const sendDiarySMS = async () => {
    setSendingSMS(true);
    try {
      const cls = classes.find(c => c.id === parseInt(classId));
      const diaryText = subjects.map(s => {
        const hw = homework.find(h => h.subjectId === s.id || h.subject?.id === s.id);
        return `${s.name}: ${hw?.description || 'Not assigned'}`;
      }).join(', ');
      const msg = `Daily Homework Diary For Class ${cls?.name}: ${date}\n${diaryText}\n— IlmForge`;
      // Get student phones for this class
      const studRes = await api.get('/students', { params: { classId, limit: 200, status: 'active' } });
      const phones = (studRes.data.data || []).map(s => s.emergencyPhone || s.parent?.phone).filter(Boolean);
      if (!phones.length) { toast.error('No parent phone numbers found'); return; }
      await api.post('/notifications/sms', { phones, message: msg });
      toast.success(`Diary sent to ${phones.length} parents via SMS!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'SMS send failed');
    } finally { setSendingSMS(false); }
  };

  const cls = classes.find(c => c.id === parseInt(classId));
  const displayDate = new Date(date);
  const isToday = fmtDate(displayDate) === fmtDate(new Date());

  // Build a map subjectId → homework entry
  const hwMap = {};
  homework.forEach(h => { hwMap[h.subjectId || h.subject?.id] = h; });

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1B2F6E,#0073b7)', borderRadius:12, padding:'16px 20px', marginBottom:20, color:'white' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>📚 Daily Homework Diary</h1>
            <p style={{ margin:'4px 0 0', fontSize:13, opacity:0.8 }}>Assign homework per subject • Send diary to parents via SMS</p>
          </div>
          {classId && (
            <button onClick={sendDiarySMS} disabled={sendingSMS}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:'#f59e0b', border:'none', color:'white', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              <Send size={14}/> {sendingSMS ? 'Sending…' : 'Send Diary via SMS'}
            </button>
          )}
        </div>
      </div>

      {/* Date + Class selectors */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body">
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <div>
              <label className="form-label">Select Class</label>
              <select className="form-select" style={{ minWidth:160 }} value={classId} onChange={e => setClassId(e.target.value)}>
                <option value="">— Select Class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label className="form-label">Date</label>
              <DateStrip selected={date} onChange={setDate} />
            </div>
          </div>
        </div>
      </div>

      {!classId ? (
        <div className="card">
          <div className="empty-state" style={{ padding:60 }}>
            <div style={{ fontSize:48 }}>📚</div>
            <div className="empty-state-text">Select a class to view the homework diary</div>
            <div className="empty-state-sub">Assign daily homework per subject and send to parents</div>
          </div>
        </div>
      ) : (
        <>
          {/* Date display */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:'#1e3a5f' }}>
                {displayDate.toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </div>
              <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>
                Class: <strong>{cls?.name}</strong> &nbsp;·&nbsp; {subjects.length} subjects &nbsp;·&nbsp;
                {homework.length} assigned &nbsp;·&nbsp; {subjects.length - homework.length} pending
              </div>
            </div>
            {isToday && <span style={{ background:'#dcfce7', color:'#15803d', fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:99 }}>● Today</span>}
          </div>

          {isLoading ? (
            <div className="loading-center"><div className="spinner"/></div>
          ) : subjects.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-text">No subjects configured for this class</div>
                <div className="empty-state-sub">Add subjects in Settings → Subjects</div>
              </div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {subjects.map((s, i) => (
                <SubjectCard
                  key={s.id}
                  subject={s}
                  entry={hwMap[s.id]}
                  color={COLORS[i % COLORS.length]}
                  onAdd={(subjectId, description) => addMut.mutate({ subjectId, description })}
                  onDelete={id => delMut.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
