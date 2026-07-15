/**
 * IlmForge — Quick MCQ Generator
 * AI-powered MCQ generation with print and save capabilities
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Brain, Sparkles, Printer, Plus, Trash2, Save, Key } from 'lucide-react';
import api from '../../api/client';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const NUM_OPTIONS = [10, 20, 30, 50];

const emptyMCQ = () => ({
  id: Math.random().toString(36).slice(2),
  question: '',
  options: { A: '', B: '', C: '', D: '' },
  answer: 'A',
});

const parseMCQs = (raw) => {
  if (!raw) return [];
  const text = typeof raw === 'string' ? raw : (raw?.content || raw?.text || JSON.stringify(raw));

  // Try to parse structured JSON first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((q, i) => ({
        id: String(i),
        question: q.question || q.q || '',
        options: {
          A: q.options?.A || q.A || q.a || '',
          B: q.options?.B || q.B || q.b || '',
          C: q.options?.C || q.C || q.c || '',
          D: q.options?.D || q.D || q.d || '',
        },
        answer: (q.answer || q.correct || 'A').toString().toUpperCase().charAt(0),
      }));
    }
  } catch { /* not JSON */ }

  // Parse text format: numbered questions with A) B) C) D) options
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const mcqs = [];
  let current = null;

  for (const line of lines) {
    // Detect question line: starts with number
    const qMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (qMatch) {
      if (current) mcqs.push(current);
      current = { id: String(mcqs.length), question: qMatch[2], options: { A: '', B: '', C: '', D: '' }, answer: 'A' };
      continue;
    }
    // Detect option lines
    const optMatch = line.match(/^([A-Da-d])[.)]\s+(.+)/);
    if (optMatch && current) {
      current.options[optMatch[1].toUpperCase()] = optMatch[2];
      continue;
    }
    // Detect answer line
    const ansMatch = line.match(/[Aa]nswer[:\s]+([A-Da-d])/);
    if (ansMatch && current) {
      current.answer = ansMatch[1].toUpperCase();
    }
  }
  if (current) mcqs.push(current);

  return mcqs.length > 0 ? mcqs : [{ id: '0', question: text.substring(0, 200), options: { A: '', B: '', C: '', D: '' }, answer: 'A' }];
};

export default function MCQGeneratorPage() {
  const [mode, setMode] = useState('generate'); // 'generate' | 'print'
  const [form, setForm] = useState({ subject: '', className: '', topic: '', numQuestions: 10, difficulty: 'Medium' });
  const [mcqs, setMcqs] = useState([]);

  const generateMutation = useMutation({
    mutationFn: (payload) => api.post('/question-papers/generate-ai', payload).then(r => r.data),
    onSuccess: (data) => {
      const parsed = parseMCQs(data.data || data.content || data.result || data);
      if (parsed.length > 0) {
        setMcqs(parsed);
        setMode('print');
        toast.success(`${parsed.length} MCQs generated!`);
      } else {
        toast.error('Could not parse MCQs. Please try again.');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'AI generation failed. Please try again.');
    },
  });

  const handleGenerate = () => {
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    if (!form.className.trim()) { toast.error('Class is required'); return; }
    if (!form.topic.trim()) { toast.error('Topic is required'); return; }

    generateMutation.mutate({
      subject:       form.subject,
      className:     form.className,
      topic:         form.topic,
      numQuestions:  form.numQuestions,
      difficulty:    form.difficulty,
      questionTypes: ['mcq'],
    });
  };

  const updateMCQ = (id, field, value) => {
    setMcqs(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (id, opt, value) => {
    setMcqs(prev => prev.map(q => q.id === id ? { ...q, options: { ...q.options, [opt]: value } } : q));
  };

  const deleteMCQ = (id) => setMcqs(prev => prev.filter(q => q.id !== id));

  const addMCQ = () => setMcqs(prev => [...prev, emptyMCQ()]);

  const printMCQPaper = () => {
    const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
    const logo = localStorage.getItem('schoolLogoPreview') || '';

    // Build 2-column layout
    const half = Math.ceil(mcqs.length / 2);
    const col1 = mcqs.slice(0, half);
    const col2 = mcqs.slice(half);

    const renderQ = (q, i) => `
      <div style="break-inside:avoid;margin-bottom:14px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${i + 1}. ${q.question || '(Question)'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;font-size:12px;padding-left:12px;">
          <div><span style="font-weight:700;color:#1B2F6E;">A)</span> ${q.options.A || '—'}</div>
          <div><span style="font-weight:700;color:#1B2F6E;">B)</span> ${q.options.B || '—'}</div>
          <div><span style="font-weight:700;color:#1B2F6E;">C)</span> ${q.options.C || '—'}</div>
          <div><span style="font-weight:700;color:#1B2F6E;">D)</span> ${q.options.D || '—'}</div>
        </div>
      </div>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>MCQ Test — ${form.subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
    .watermark { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 0; }
    .watermark img { width: 160px; height: 160px; object-fit: cover; opacity: 0.05; border-radius: 16px; }
    .wm-text { font-size: 32px; font-weight: 900; color: #1B2F6E; opacity: 0.05; margin-top: 6px; text-transform: uppercase; letter-spacing: 4px; }
    .content { position: relative; z-index: 1; }
    .header { text-align: center; border-bottom: 3px double #1B2F6E; padding-bottom: 12px; margin-bottom: 16px; }
    .school { font-size: 20px; font-weight: 900; color: #1B2F6E; }
    .test-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; background: #1B2F6E; color: #fff; display: inline-block; padding: 3px 16px; border-radius: 4px; margin: 6px 0; }
    .info-row { display: flex; justify-content: center; gap: 24px; font-size: 12px; margin-top: 8px; }
    .info-item { display: flex; gap: 5px; align-items: center; }
    .info-item .lbl { font-weight: 700; color: #1B2F6E; }
    .info-item .blank { border-bottom: 1px solid #333; min-width: 90px; display: inline-block; }
    .instructions { font-size: 12px; font-style: italic; color: #444; margin-bottom: 14px; padding: 6px 12px; background: #f8f9fa; border-left: 3px solid #1B2F6E; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="watermark">
    ${logo ? `<img src="${logo}" alt="watermark"/>` : ''}
    <div class="wm-text">MCQ TEST</div>
  </div>
  <div class="content">
    <div class="header">
      <div class="school">${schoolName}</div>
      <div class="test-title">Multiple Choice Questions</div>
      <div class="info-row">
        <div class="info-item"><span class="lbl">Class:</span><span class="blank"></span></div>
        <div class="info-item"><span class="lbl">Subject:</span><span class="blank">${form.subject}</span></div>
        <div class="info-item"><span class="lbl">Date:</span><span class="blank"></span></div>
        <div class="info-item"><span class="lbl">Time:</span><span class="blank"></span></div>
      </div>
    </div>
    <div class="instructions">Instructions: Circle the correct answer. Each question carries equal marks. Attempt all questions.</div>
    <div class="cols">
      <div>${col1.map((q, i) => renderQ(q, i)).join('')}</div>
      <div>${col2.map((q, i) => renderQ(q, i + half)).join('')}</div>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    w.document.close();
  };

  const printAnswerKey = () => {
    const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';

    const rows = mcqs.map((q, i) =>
      `<tr><td style="text-align:center;font-weight:700">${i + 1}</td><td>${q.question?.substring(0, 60) || '(Question)'}${(q.question?.length || 0) > 60 ? '...' : ''}</td><td style="text-align:center;font-weight:800;color:#1B2F6E">${q.answer}</td></tr>`
    ).join('');

    const w = window.open('', '_blank', 'width=700,height=500');
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Answer Key — ${form.subject}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 28px; }
    h2 { color: #1B2F6E; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #1B2F6E; color: #fff; padding: 8px 10px; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f8f9fa; }
  </style>
</head>
<body>
  <h2>${schoolName} — Answer Key</h2>
  <p style="font-size:13px;color:#555;margin-bottom:12px;">Subject: <strong>${form.subject}</strong> &nbsp;|&nbsp; Topic: <strong>${form.topic}</strong> &nbsp;|&nbsp; Class: <strong>${form.className}</strong></p>
  <table>
    <thead><tr><th style="width:50px">#</th><th>Question</th><th style="width:80px">Answer</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    w.document.close();
  };

  const savePaper = async () => {
    if (mcqs.length === 0) { toast.error('No MCQs to save'); return; }
    try {
      await api.post('/question-papers', {
        title: `${form.subject} — ${form.topic} MCQ (${form.numQuestions}Q)`,
        subject: form.subject,
        className: form.className,
        totalMarks: mcqs.length,
        questions: mcqs.map((q, i) => ({
          questionText: q.question,
          type: 'mcq',
          marks: 1,
          options: [q.options.A, q.options.B, q.options.C, q.options.D].filter(Boolean),
          correctAnswer: q.answer,
          order: i + 1,
        })),
      });
      toast.success('Saved as Question Paper!');
    } catch {
      toast.error('Could not save. Check question paper route.');
    }
  };

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1B2F6E,#0073b7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(27,47,110,0.35)' }}>
            <Brain size={24} color="#fff" />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Quick MCQ Generator</h1>
            <p className="page-subtitle">AI-powered MCQ creation with instant print and save</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 4, gap: 2 }}>
          {['generate', 'print'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '7px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: mode === m ? '#1B2F6E' : 'transparent',
                color: mode === m ? '#fff' : '#6B7280',
                fontWeight: mode === m ? 700 : 500,
                fontSize: 13, transition: 'all .15s',
                textTransform: 'capitalize',
              }}
            >
              {m === 'generate' ? 'Generate' : `Edit / Print ${mcqs.length > 0 ? `(${mcqs.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {mode === 'generate' ? (
        /* ── GENERATE FORM ── */
        <div style={{ maxWidth: 700 }}>
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Sparkles size={16} color="#1B2F6E" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1B2F6E', margin: 0 }}>Generate MCQs with AI</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Subject *</label>
                <input className="form-input" placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Grade / Class *</label>
                <input className="form-input" placeholder="e.g. Grade 8" value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Topic *</label>
              <input className="form-input" placeholder="e.g. Algebra, World War II, Photosynthesis" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Number of MCQs</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {NUM_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => setForm(f => ({ ...f, numQuestions: n }))}
                      style={{
                        padding: '6px 16px', borderRadius: 6, border: `1.5px solid ${form.numQuestions === n ? '#1B2F6E' : '#e5e7eb'}`,
                        background: form.numQuestions === n ? '#1B2F6E' : '#fff',
                        color: form.numQuestions === n ? '#fff' : '#374151',
                        fontWeight: form.numQuestions === n ? 700 : 500,
                        fontSize: 13, cursor: 'pointer', transition: 'all .12s',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Difficulty</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: `1.5px solid ${form.difficulty === d ? '#1B2F6E' : '#e5e7eb'}`,
                        background: form.difficulty === d ? '#1B2F6E' : '#fff',
                        color: form.difficulty === d ? '#fff' : '#374151',
                        fontWeight: form.difficulty === d ? 700 : 500,
                        fontSize: 13, cursor: 'pointer', transition: 'all .12s',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              style={{
                padding: '13px 24px',
                background: generateMutation.isPending ? '#9CA3AF' : 'linear-gradient(135deg,#1B2F6E,#0073b7)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: generateMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: generateMutation.isPending ? 'none' : '0 4px 14px rgba(27,47,110,0.35)',
              }}
            >
              {generateMutation.isPending ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  Generating {form.numQuestions} MCQs...
                </>
              ) : (
                <><Sparkles size={16} /> Generate MCQs</>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ── EDIT / PRINT MODE ── */
        <div>
          {/* Actions bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={addMCQ}>
              <Plus size={13} /> Add Question
            </button>
            <button className="btn btn-sm" style={{ background: '#1B2F6E', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }} onClick={printMCQPaper}>
              <Printer size={13} /> Print MCQ Paper
            </button>
            <button className="btn btn-sm" style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }} onClick={printAnswerKey}>
              <Key size={13} /> Print Answer Key
            </button>
            <button className="btn btn-sm" style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }} onClick={savePaper}>
              <Save size={13} /> Save as Paper
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' }}>{mcqs.length} question(s)</span>
          </div>

          {mcqs.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <Brain size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#6B7280' }}>No MCQs yet</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Switch to "Generate" tab to create MCQs, or click "Add Question" above.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 40 }} />
                    <col style={{ width: '35%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 60 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Option A</th>
                      <th>Option B</th>
                      <th>Option C</th>
                      <th>Option D</th>
                      <th>Answer</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mcqs.map((q, i) => (
                      <tr key={q.id}>
                        <td style={{ textAlign: 'center', color: '#9CA3AF', fontWeight: 700, fontSize: 12 }}>{i + 1}</td>
                        <td>
                          <textarea
                            value={q.question}
                            onChange={e => updateMCQ(q.id, 'question', e.target.value)}
                            style={{ width: '100%', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 6px', resize: 'vertical', minHeight: 48, fontFamily: 'inherit' }}
                            placeholder="Enter question..."
                          />
                        </td>
                        {['A', 'B', 'C', 'D'].map(opt => (
                          <td key={opt}>
                            <input
                              value={q.options[opt]}
                              onChange={e => updateOption(q.id, opt, e.target.value)}
                              style={{ width: '100%', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 6px', fontFamily: 'inherit' }}
                              placeholder={`Option ${opt}`}
                            />
                          </td>
                        ))}
                        <td>
                          <select
                            value={q.answer}
                            onChange={e => updateMCQ(q.id, 'answer', e.target.value)}
                            style={{ width: '100%', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 6px', fontWeight: 700, color: '#1B2F6E', background: '#eff6ff' }}
                          >
                            {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => deleteMCQ(q.id)}
                            style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#DC2626' }}
                            title="Delete question"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
