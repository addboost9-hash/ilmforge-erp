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
const taStyle = { ...inputStyle, minHeight: 80, resize: 'vertical' };

function printPlan(plan, planData, schoolName) {
  const rows = [
    { label: 'Topic', val: planData.topic || '-' },
    { label: 'Duration', val: planData.duration || '-' },
    { label: 'Objectives', val: planData.objectives || '-' },
    { label: 'Warm Up', val: planData.warmUp || '-' },
    { label: 'Main Activity', val: planData.mainActivity || '-' },
    { label: 'Practice', val: planData.practice || '-' },
    { label: 'Assessment', val: planData.assessment || '-' },
    { label: 'Homework', val: planData.homework || '-' },
    { label: 'Resources', val: planData.resources || '-' },
  ];

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${plan.title}</title>
  <style>body{font-family:Arial,sans-serif;margin:30px;color:#1a1a1a}h1{color:#1B2F6E;text-align:center}
  table{width:100%;border-collapse:collapse}td{border:1px solid #d1d5db;padding:10px 14px;vertical-align:top}
  td:first-child{width:160px;font-weight:700;background:#f0f4ff;color:#1B2F6E}
  @media print{button{display:none}}</style></head>
  <body>
    <h1>${schoolName || 'School'}</h1>
    <h2 style="text-align:center;color:#374151">${plan.title}</h2>
    <p style="text-align:center;color:#6b7280">Class: ${plan.className || '-'} | Subject: ${plan.subjectName || '-'}</p>
    <table>${rows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}</table>
    <button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#1B2F6E;color:#fff;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600">Print</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

const emptyForm = { classId: '', subjectId: '', title: '', topic: '', duration: '45 minutes', objectives: '', warmUp: '', mainActivity: '', practice: '', assessment: '', homework: '', resources: '' };

export default function LessonPlanPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState(emptyForm);
  const [aiForm, setAiForm] = useState({ subject: '', className: '', topic: '', duration: '45 minutes', objectives: '' });
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects-all'], queryFn: () => api.get('/classes/subjects').then(r => r.data.data || []).catch(() => []) });
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['lesson-plans', filterClass, filterSubject],
    queryFn: () => api.get('/lesson-plans', { params: { classId: filterClass || undefined, subjectId: filterSubject || undefined } }).then(r => r.data.data || []),
  });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/lesson-plans', data),
    onSuccess: () => {
      qc.invalidateQueries(['lesson-plans']);
      toast.success('Lesson plan saved!');
      setTab('list');
      setForm(emptyForm);
      setAiResult(null);
    },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/lesson-plans/${id}`),
    onSuccess: () => { qc.invalidateQueries(['lesson-plans']); toast.success('Deleted!'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleAIGenerate = async () => {
    if (!aiForm.subject || !aiForm.className || !aiForm.topic) return toast.error('Fill subject, class, topic');
    setAiLoading(true);
    try {
      const res = await api.post('/lesson-plans/generate-ai', aiForm);
      setAiResult(res.data.data);
      toast.success('Lesson plan generated!');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAI = () => {
    if (!aiResult) return;
    createMutation.mutate({
      title: `${aiForm.subject} - ${aiForm.topic} (AI)`,
      ...aiResult,
    });
  };

  const tabStyle = (id) => ({
    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    borderBottom: tab === id ? `3px solid ${NAVY}` : '3px solid transparent',
    color: tab === id ? NAVY : '#6b7280', background: 'none', border: 'none',
  });

  const planFields = [
    { key: 'objectives', label: 'Learning Objectives' },
    { key: 'warmUp', label: 'Warm-Up / Starter Activity' },
    { key: 'mainActivity', label: 'Main Activity / Instruction' },
    { key: 'practice', label: 'Practice / Student Work' },
    { key: 'assessment', label: 'Assessment / Check for Understanding' },
    { key: 'homework', label: 'Homework / Extension' },
    { key: 'resources', label: 'Resources / Materials' },
  ];

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>Lesson Plans</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Create and manage lesson plans with AI assistance</p>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          {[{ id: 'list', label: 'Lesson Plans' }, { id: 'create', label: 'Create Plan' }, { id: 'ai', label: 'AI Generate' }].map(t => (
            <button key={t.id} style={tabStyle(t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <select style={{ ...inputStyle, width: 160 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select style={{ ...inputStyle, width: 160 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button style={btnStyle()} onClick={() => setTab('create')}>+ New Plan</button>
            </div>
            <div style={cardStyle}>
              {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : plans.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No lesson plans yet. Create one!</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {plans.map(p => (
                    <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{p.title}</div>
                        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                          {p.className ? `Class: ${p.className}` : ''}{p.subjectName ? ` | Subject: ${p.subjectName}` : ''}
                          {p.planData?.topic ? ` | Topic: ${p.planData.topic}` : ''}
                          {p.planData?.duration ? ` | ${p.planData.duration}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={btnStyle('#059669')} onClick={() => printPlan(p, p.planData || {}, school?.name)}>Print</button>
                        <button style={btnStyle('#ef4444')} onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(p.id); }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'create' && (
          <div style={cardStyle}>
            <h3 style={{ color: NAVY, marginTop: 0 }}>Create Lesson Plan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Lesson plan title" />
              </div>
              <div>
                <label style={labelStyle}>Topic</label>
                <input style={inputStyle} value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Photosynthesis" />
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
                <label style={labelStyle}>Duration</label>
                <input style={inputStyle} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 45 minutes" />
              </div>
            </div>
            {planFields.map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{label}</label>
                <textarea style={taStyle} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={`Enter ${label.toLowerCase()}...`} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={btnStyle('#6b7280')} onClick={() => setTab('list')}>Cancel</button>
              <button style={btnStyle()} onClick={() => { if (!form.title) return toast.error('Title required'); createMutation.mutate(form); }} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ color: NAVY, marginTop: 0 }}>AI Lesson Plan Generator</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Subject *</label>
                  <input style={inputStyle} value={aiForm.subject} onChange={e => setAiForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Biology" />
                </div>
                <div>
                  <label style={labelStyle}>Class *</label>
                  <input style={inputStyle} value={aiForm.className} onChange={e => setAiForm(f => ({ ...f, className: e.target.value }))} placeholder="e.g. Class 9" />
                </div>
                <div>
                  <label style={labelStyle}>Topic *</label>
                  <input style={inputStyle} value={aiForm.topic} onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Cell Division" />
                </div>
                <div>
                  <label style={labelStyle}>Duration</label>
                  <input style={inputStyle} value={aiForm.duration} onChange={e => setAiForm(f => ({ ...f, duration: e.target.value }))} placeholder="45 minutes" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Learning Objectives (optional)</label>
                  <input style={inputStyle} value={aiForm.objectives} onChange={e => setAiForm(f => ({ ...f, objectives: e.target.value }))} placeholder="e.g. Students will understand..." />
                </div>
              </div>
              <button style={btnStyle()} onClick={handleAIGenerate} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : 'Generate Lesson Plan'}
              </button>
            </div>

            {aiResult && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, color: NAVY }}>Generated Lesson Plan</h3>
                  <button style={btnStyle('#059669')} onClick={handleSaveAI} disabled={createMutation.isPending}>Save Plan</button>
                </div>
                {Object.entries(aiResult).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, color: NAVY, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{key}</div>
                    <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#374151' }}>{String(val)}</div>
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
