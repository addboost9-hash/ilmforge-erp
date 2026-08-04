/**
 * IlmForge — Quiz Management System
 * Create quizzes, assign to classes, track student results
 * From App Store "What's New": Quiz Management System
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Eye, Trash2, BookOpen, CheckCircle, Users, BarChart2, Clock } from 'lucide-react';

const STORAGE_KEY = 'ilmforge_quizzes';

const SEED_QUIZZES = [
  {
    id: 1, title: 'Math Chapter 3 Quiz', subject: 'Mathematics', class: 'Class 5',
    duration: 20, totalMarks: 50, dueDate: '2025-07-10', status: 'active',
    questions: [
      { q: 'What is 12 × 8?', options: ['96', '84', '104', '108'], answer: 0 },
      { q: 'What is the square root of 144?', options: ['12', '14', '11', '13'], answer: 0 },
      { q: 'Solve: 5x = 45, x = ?', options: ['9', '8', '7', '10'], answer: 0 },
    ],
    attempts: 18, avgScore: 76,
  },
  {
    id: 2, title: 'English Grammar Quiz', subject: 'English', class: 'Class 4',
    duration: 15, totalMarks: 30, dueDate: '2025-07-05', status: 'active',
    questions: [
      { q: 'Which is a noun?', options: ['Run', 'School', 'Happy', 'Quickly'], answer: 1 },
      { q: 'Past tense of "go" is?', options: ['gone', 'goed', 'went', 'go'], answer: 2 },
    ],
    attempts: 22, avgScore: 82,
  },
];

export default function QuizPage() {
  const qc = useQueryClient();
  const [view,       setView]       = useState('list');   // list | create | detail
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState({ title:'', subject:'', class:'', duration:20, totalMarks:50, dueDate:'', status:'active' });
  const [questions,  setQuestions]  = useState([{ q:'', options:['','','',''], answer:0 }]);

  const { data: quizzes = SEED_QUIZZES } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : SEED_QUIZZES;
    },
    staleTime: 0,
  });

  const saveToStorage = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    qc.invalidateQueries(['quizzes']);
  };

  const addQuiz = useMutation({
    mutationFn: async () => {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(SEED_QUIZZES));
      const quiz = { ...form, id: Date.now(), questions, attempts: 0, avgScore: 0 };
      saveToStorage([...existing, quiz]);
      return quiz;
    },
    onSuccess: () => {
      toast.success('Quiz created!');
      setView('list');
      setForm({ title:'', subject:'', class:'', duration:20, totalMarks:50, dueDate:'', status:'active' });
      setQuestions([{ q:'', options:['','','',''], answer:0 }]);
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id) => {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(SEED_QUIZZES));
      saveToStorage(existing.filter(q => q.id !== id));
    },
    onSuccess: () => toast.success('Quiz deleted'),
  });

  const addQuestion = () => setQuestions(prev => [...prev, { q:'', options:['','','',''], answer:0 }]);
  const removeQuestion = (i) => setQuestions(prev => prev.filter((_,idx) => idx !== i));
  const updateQuestion = (i, key, val) => setQuestions(prev => prev.map((q, idx) => idx===i ? {...q, [key]:val} : q));
  const updateOption   = (qi, oi, val) => setQuestions(prev => prev.map((q,idx) => idx===qi ? {...q, options: q.options.map((o,k)=>k===oi?val:o)} : q));

  /* List view */
  if (view === 'list') return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Quiz Management</h1>
          <p className="page-subtitle">Create quizzes, assign to classes, track student performance</p>
        </div>
        <button className="btn btn-teal" onClick={() => setView('create')}>
          <Plus size={13}/> Create Quiz
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:16 }}>
        {[
          { label:'Total Quizzes', val: (quizzes||[]).length,   color:'#1D4ED8', icon:'📝' },
          { label:'Active',        val: (quizzes||[]).filter(q=>q.status==='active').length, color:'#15803D', icon:'✅' },
          { label:'Avg Score',     val: `${Math.round((quizzes||[]).reduce((s,q)=>s+(q.avgScore||0),0)/Math.max((quizzes||[]).length,1))}%`, color:'#D97706', icon:'📊' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:12.5, color:'#6B7280', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr><th>Quiz Title</th><th>Subject</th><th>Class</th><th>Questions</th><th>Duration</th><th>Due Date</th><th>Attempts</th><th>Avg Score</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(quizzes||[]).map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight:700, fontSize:13, color:'#1E3A5F' }}>{q.title}</td>
                <td><span className="badge badge-blue">{q.subject}</span></td>
                <td style={{ fontSize:12.5, color:'#6B7280' }}>{q.class}</td>
                <td><span style={{ fontWeight:700, color:'#0D9488' }}>{(q.questions||[]).length}</span></td>
                <td style={{ fontSize:12 }}><Clock size={11} style={{ marginRight:3, verticalAlign:'middle' }}/>{q.duration} min</td>
                <td style={{ fontSize:12, color:'#6B7280' }}>{q.dueDate ? new Date(q.dueDate).toLocaleDateString('en-PK',{day:'2-digit',month:'short'}) : '—'}</td>
                <td><span style={{ fontWeight:700 }}>{q.attempts||0}</span> <span style={{ fontSize:11, color:'#94A3B8' }}>students</span></td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div className="progress-bar" style={{ width:50 }}>
                      <div className="progress-fill" style={{ width:`${q.avgScore||0}%`, background: (q.avgScore||0)>=60?'#0D9488':'#DC2626' }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:(q.avgScore||0)>=60?'#15803D':'#B91C1C' }}>{q.avgScore||0}%</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${q.status==='active'?'badge-green':'badge-gray'}`}>
                    {q.status === 'active' ? '● Active' : '○ Draft'}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap:5 }}>
                    <button className="btn btn-sm btn-icon" style={{ background:'#F0FDF9', border:'1px solid #CCFBF1', color:'#0F766E' }}
                      onClick={() => { setSelected(q); setView('detail'); }}><Eye size={12}/></button>
                    <button className="btn btn-sm btn-icon" style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C' }}
                      onClick={() => { if (confirm('Delete quiz?')) deleteQuiz.mutate(q.id); }}><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {!(quizzes||[]).length && (
              <tr><td colSpan={10}><div className="empty-state" style={{padding:28}}><div className="empty-state-icon">📝</div><div className="empty-state-text">No quizzes yet</div><div className="empty-state-sub">Click "Create Quiz" to add your first quiz</div></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* Quiz detail */
  if (view === 'detail' && selected) return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="btn btn-outline btn-sm btn-icon" onClick={() => setView('list')}>←</button>
        <div style={{ flex:1 }}>
          <h1 className="page-title">{selected.title}</h1>
          <p className="page-subtitle">{selected.subject} · {selected.class} · {(selected.questions||[]).length} questions · {selected.duration} min</p>
        </div>
        <span className={`badge ${selected.status==='active'?'badge-green':'badge-gray'}`}>{selected.status}</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
        {[
          { label:'Total Questions', val:(selected.questions||[]).length, color:'#1D4ED8' },
          { label:'Total Marks',     val:selected.totalMarks||50,          color:'#0F766E' },
          { label:'Attempts',        val:selected.attempts||0,             color:'#D97706' },
          { label:'Avg Score',       val:`${selected.avgScore||0}%`,        color: (selected.avgScore||0)>=60?'#15803D':'#B91C1C' },
        ].map(s=>(
          <div key={s.label} className="card" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.val}</div>
            <div style={{fontSize:13,color:'#6B7280'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:14 }}>Questions</h3>
        {(selected.questions||[]).map((q, i) => (
          <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom:'1px solid #F3F4F6' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#1E3A5F', marginBottom:8 }}>
              Q{i+1}. {q.q}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {(q.options||[]).map((opt, j) => (
                <div key={j} style={{
                  padding:'6px 12px', borderRadius:7, fontSize:12.5,
                  background: j===q.answer ? '#DCFCE7' : '#F8FAFC',
                  border: `1px solid ${j===q.answer ? '#BBF7D0' : '#E8EDF3'}`,
                  color: j===q.answer ? '#15803D' : '#374151',
                  fontWeight: j===q.answer ? 700 : 400,
                }}>
                  {j===q.answer && '✓ '}{String.fromCharCode(65+j)}. {opt}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* Create quiz */
  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="btn btn-outline btn-sm btn-icon" onClick={() => setView('list')}>←</button>
        <div><h1 className="page-title">Create New Quiz</h1></div>
      </div>

      {/* Quiz meta */}
      <div className="card" style={{ marginBottom:14 }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', marginBottom:14 }}>Quiz Details</h3>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:12 }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Quiz Title *</label>
            <input className="form-input" placeholder="e.g. Math Chapter 3 Quiz" value={form.title}
              onChange={e=>setForm({...form,title:e.target.value})}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Subject</label>
            <input className="form-input" placeholder="e.g. Mathematics" value={form.subject}
              onChange={e=>setForm({...form,subject:e.target.value})}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Class</label>
            <input className="form-input" placeholder="e.g. Class 5" value={form.class}
              onChange={e=>setForm({...form,class:e.target.value})}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Duration (min)</label>
            <input className="form-input" type="number" value={form.duration}
              onChange={e=>setForm({...form,duration:parseInt(e.target.value)||20})}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate}
              onChange={e=>setForm({...form,dueDate:e.target.value})}/>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#1E3A5F', margin:0 }}>Questions ({questions.length})</h3>
          <button className="btn btn-sm btn-outline" onClick={addQuestion}><Plus size={12}/> Add Question</button>
        </div>

        {questions.map((q, i) => (
          <div key={i} style={{ marginBottom:16, padding:14, background:'#F8FAFC', borderRadius:10, border:'1px solid #E8EDF3' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontWeight:700, color:'#0D9488', fontSize:13 }}>Q{i+1}</span>
              <input className="form-input" style={{ flex:1 }} placeholder={`Question ${i+1}`}
                value={q.q} onChange={e=>updateQuestion(i,'q',e.target.value)}/>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(i)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', padding:4 }}>
                  <X size={14}/>
                </button>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              {q.options.map((opt, j) => (
                <div key={j} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <input type="radio" name={`correct-${i}`} checked={q.answer===j}
                    onChange={() => updateQuestion(i,'answer',j)}
                    style={{ width:14, height:14, accentColor:'#0D9488' }}
                    title="Mark as correct answer"/>
                  <input className="form-input" style={{ flex:1, fontSize:12 }}
                    placeholder={`Option ${String.fromCharCode(65+j)}`}
                    value={opt} onChange={e=>updateOption(i,j,e.target.value)}/>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11.5, color:'#0D9488' }}>
              ✓ Correct answer: Option {String.fromCharCode(65+q.answer)} — click radio button to change
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button className="btn btn-outline" onClick={() => setView('list')}>Cancel</button>
        <button className="btn btn-teal" style={{ padding:'10px 28px' }}
          disabled={!form.title || questions.some(q=>!q.q) || addQuiz.isPending}
          onClick={() => addQuiz.mutate()}>
          <CheckCircle size={14}/> {addQuiz.isPending ? 'Saving…' : 'Create Quiz'}
        </button>
      </div>
    </div>
  );
}
