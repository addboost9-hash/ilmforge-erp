import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

const NAVY = '#1B2F6E';
const LIGHT_BG = '#f0f4ff';
const cardStyle = { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(27,47,110,0.08)', marginBottom: 20 };
const btnStyle = (color = NAVY) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
const labelStyle = { fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4, display: 'block' };

function printPaper(paper, questions, schoolName) {
  const questionsHtml = questions.map((q, i) => {
    const opts = q.options && q.options.length > 0
      ? `<div style="margin-top:4px">${q.options.map((o, oi) => `<span style="margin-right:18px">${String.fromCharCode(65+oi)}) ${o}</span>`).join('')}</div>`
      : '';
    return `<div style="margin-bottom:14px"><strong>Q${i+1}.</strong> (${q.marks || 2} marks) ${q.text}${opts}</div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${paper.title}</title>
  <style>body{font-family:Arial,sans-serif;margin:30px;color:#1a1a1a}h1{color:#1B2F6E;text-align:center}h2{text-align:center;color:#374151}
  .header{border-bottom:2px solid #1B2F6E;padding-bottom:12px;margin-bottom:20px;text-align:center}
  .info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px}
  @media print{button{display:none}}</style></head>
  <body>
    <div class="header"><h1>${schoolName || 'School Name'}</h1><h2>${paper.title}</h2></div>
    <div class="info">
      <span>Class: ${paper.className || '-'}</span>
      <span>Subject: ${paper.subjectName || '-'}</span>
      <span>Total Marks: ${paper.totalMarks || 100}</span>
      <span>Time: ${paper.duration || 60} min</span>
    </div>
    <hr/>
    <div style="margin-top:16px">${questionsHtml}</div>
    <button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#1B2F6E;color:#fff;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600">Print</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

const defaultCriteria = [
  { text: '', type: 'short', marks: 5, options: [], answer: '' },
];

export default function QuestionPaperPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ classId: '', subjectId: '', title: '', totalMarks: 100, duration: 60, type: 'Written' });
  const [questions, setQuestions] = useState([...defaultCriteria]);
  const [aiForm, setAiForm] = useState({ subject: '', className: '', topic: '', numQuestions: 5 });
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [filterClass, setFilterClass] = useState('');

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/classes/subjects').then(r => r.data.data || []).catch(() => []) });
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['question-papers', filterClass],
    queryFn: () => api.get('/question-papers', { params: { classId: filterClass || undefined } }).then(r => r.data.data || []),
  });

  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/question-papers', data),
    onSuccess: () => {
      qc.invalidateQueries(['question-papers']);
      toast.success('Question paper saved!');
      setTab('list');
      setForm({ classId: '', subjectId: '', title: '', totalMarks: 100, duration: 60, type: 'Written' });
      setQuestions([{ text: '', type: 'short', marks: 5, options: [], answer: '' }]);
    },
    onError: () => toast.error('Failed to save paper'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/question-papers/${id}`),
    onSuccess: () => { qc.invalidateQueries(['question-papers']); toast.success('Deleted!'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleAddQuestion = () => setQuestions(prev => [...prev, { text: '', type: 'short', marks: 5, options: ['', '', '', ''], answer: '' }]);
  const handleRemoveQuestion = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));
  const handleQChange = (i, field, val) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  };
  const handleOptChange = (qi, oi, val) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...(q.options || ['', '', '', ''])];
      opts[oi] = val;
      return { ...q, options: opts };
    }));
  };

  const handleSubmit = () => {
    if (!form.title) return toast.error('Title required');
    createMutation.mutate({ ...form, questions });
  };

  const handleAIGenerate = async () => {
    if (!aiForm.subject || !aiForm.className || !aiForm.topic) return toast.error('Fill all AI fields');
    setAiLoading(true);
    try {
      const res = await api.post('/question-papers/generate-ai', aiForm);
      setAiResults(res.data.data || []);
      toast.success('Questions generated!');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAI = () => {
    if (!aiForm.subject || !aiForm.className) return toast.error('Fill subject and class');
    const title = `${aiForm.subject} - ${aiForm.topic} (AI Generated)`;
    createMutation.mutate({ title, questions: aiResults, type: 'AI Generated', totalMarks: aiResults.reduce((s, q) => s + (parseInt(q.marks) || 2), 0) });
  };

  const tabs = [
    { id: 'list', label: 'Question Papers' },
    { id: 'create', label: 'Create Manual' },
    { id: 'ai', label: 'AI Generate' },
  ];

  const tabStyle = (id) => ({
    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    borderBottom: tab === id ? `3px solid ${NAVY}` : '3px solid transparent',
    color: tab === id ? NAVY : '#6b7280', background: 'none', border: 'none',
  });

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>Question Papers</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Create, manage, and AI-generate question papers</p>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          {tabs.map(t => <button key={t.id} style={tabStyle(t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        {tab === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
              <select style={{ ...inputStyle, width: 200 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button style={btnStyle()} onClick={() => setTab('create')}>+ New Paper</button>
            </div>
            <div style={cardStyle}>
              {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : (
                papers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No question papers found. Create one!</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: NAVY, color: '#fff' }}>
                        {['Title', 'Class', 'Subject', 'Total Marks', 'Type', 'Created', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {papers.map((p, i) => {
                        let qs = [];
                        if (p.testType && p.testType.startsWith('[')) { try { qs = JSON.parse(p.testType); } catch { qs = []; } }
                        return (
                          <tr key={p.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.title}</td>
                            <td style={{ padding: '10px 12px' }}>{p.className || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{p.subjectName || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{p.totalMarks}</td>
                            <td style={{ padding: '10px 12px' }}>{p.paperType || p.testType || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                              <button style={btnStyle('#059669')} onClick={() => printPaper(p, qs, school?.name)}>Print</button>
                              <button style={btnStyle('#ef4444')} onClick={() => { if (confirm('Delete this paper?')) deleteMutation.mutate(p.id); }}>Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        )}

        {tab === 'create' && (
          <div style={cardStyle}>
            <h3 style={{ color: NAVY, marginTop: 0 }}>Create Question Paper</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Paper title" />
              </div>
              <div>
                <label style={labelStyle}>Class</label>
                <select style={inputStyle} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subject</label>
                <select style={inputStyle} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Total Marks</label>
                <input style={inputStyle} type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: parseInt(e.target.value) || 100 }))} />
              </div>
              <div>
                <label style={labelStyle}>Duration (minutes)</label>
                <input style={inputStyle} type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))} />
              </div>
              <div>
                <label style={labelStyle}>Paper Type</label>
                <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['Written', 'MCQ', 'Mixed', 'Oral', 'Practical'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: NAVY }}>Questions ({questions.length})</h4>
                <button style={btnStyle('#059669')} onClick={handleAddQuestion}>+ Add Question</button>
              </div>
              {questions.map((q, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 10, background: '#fafafa' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: NAVY, minWidth: 28 }}>Q{i + 1}</span>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Question text..." value={q.text} onChange={e => handleQChange(i, 'text', e.target.value)} />
                    <select style={{ ...inputStyle, width: 100 }} value={q.type} onChange={e => handleQChange(i, 'type', e.target.value)}>
                      <option value="short">Short</option>
                      <option value="long">Long</option>
                      <option value="mcq">MCQ</option>
                      <option value="true_false">T/F</option>
                    </select>
                    <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="Marks" value={q.marks} onChange={e => handleQChange(i, 'marks', parseInt(e.target.value) || 2)} />
                    <button style={{ ...btnStyle('#ef4444'), padding: '4px 10px' }} onClick={() => handleRemoveQuestion(i)}>✕</button>
                  </div>
                  {q.type === 'mcq' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingLeft: 36 }}>
                      {['A', 'B', 'C', 'D'].map((ltr, oi) => (
                        <input key={ltr} style={inputStyle} placeholder={`Option ${ltr}`} value={(q.options || [])[oi] || ''} onChange={e => handleOptChange(i, oi, e.target.value)} />
                      ))}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Correct Answer</label>
                        <input style={inputStyle} placeholder="Correct answer" value={q.answer || ''} onChange={e => handleQChange(i, 'answer', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={{ ...btnStyle('#6b7280') }} onClick={() => setTab('list')}>Cancel</button>
              <button style={btnStyle()} onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Paper'}
              </button>
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ color: NAVY, marginTop: 0 }}>AI Question Generator</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Subject *</label>
                  <input style={inputStyle} value={aiForm.subject} onChange={e => setAiForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <label style={labelStyle}>Class *</label>
                  <input style={inputStyle} value={aiForm.className} onChange={e => setAiForm(f => ({ ...f, className: e.target.value }))} placeholder="e.g. Class 8" />
                </div>
                <div>
                  <label style={labelStyle}>Topic *</label>
                  <input style={inputStyle} value={aiForm.topic} onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Fractions and Decimals" />
                </div>
                <div>
                  <label style={labelStyle}>Number of Questions</label>
                  <input style={inputStyle} type="number" min={1} max={30} value={aiForm.numQuestions} onChange={e => setAiForm(f => ({ ...f, numQuestions: parseInt(e.target.value) || 5 }))} />
                </div>
              </div>
              <button style={btnStyle()} onClick={handleAIGenerate} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>

            {aiResults.length > 0 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, color: NAVY }}>Generated Questions ({aiResults.length})</h3>
                  <button style={btnStyle('#059669')} onClick={handleSaveAI} disabled={createMutation.isPending}>Save as Paper</button>
                </div>
                {aiResults.map((q, i) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 10, background: '#fafafa' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ background: NAVY, color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{q.text}</p>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{q.type || 'short'}</span>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{q.marks || 2} marks</span>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {q.options.map((o, oi) => (
                              <span key={oi} style={{ fontSize: 13, color: '#374151' }}>{String.fromCharCode(65 + oi)}) {o}</span>
                            ))}
                          </div>
                        )}
                        {q.answer && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#059669', fontWeight: 600 }}>Answer: {q.answer}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
