/**
 * IlmForge — AI Worksheet Generator
 * Generate professional worksheets using AI for any subject, class, and topic
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Brain, Sparkles, Printer, RefreshCw, BookOpen, CheckSquare } from 'lucide-react';
import api from '../../api/client';

const WORKSHEET_TYPES = ['Practice', 'Assessment', 'Quiz', 'Homework'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const defaultForm = {
  subject: '',
  className: '',
  topic: '',
  type: 'Practice',
  difficulty: 'Medium',
  numQuestions: 10,
  includeTypes: { mcq: true, fillBlanks: true, shortAnswers: true, diagrams: false },
};

export default function WorksheetGeneratorPage() {
  const [form, setForm] = useState(defaultForm);
  const [worksheet, setWorksheet] = useState(null);

  const generateMutation = useMutation({
    mutationFn: (payload) => api.post('/lesson-plans/generate-ai', payload).then(r => r.data),
    onSuccess: (data) => {
      setWorksheet(data.data || data.content || data.result || data);
      toast.success('Worksheet generated!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'AI generation failed. Please try again.');
    },
  });

  const handleGenerate = () => {
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    if (!form.className.trim()) { toast.error('Class/Grade is required'); return; }
    if (!form.topic.trim()) { toast.error('Topic is required'); return; }

    const includeTypesArr = Object.entries(form.includeTypes)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const prompt = `Generate a ${form.type} worksheet for ${form.className} students.
Subject: ${form.subject}
Topic: ${form.topic}
Difficulty: ${form.difficulty}
Number of questions: ${form.numQuestions}
Question types to include: ${includeTypesArr.join(', ')}

Please generate a complete worksheet with:
${form.includeTypes.mcq ? `- Multiple Choice Questions (4 options each)` : ''}
${form.includeTypes.fillBlanks ? `- Fill in the Blanks` : ''}
${form.includeTypes.shortAnswers ? `- Short Answer Questions` : ''}
${form.includeTypes.diagrams ? `- Diagram/Drawing Activities` : ''}

Format each section clearly with numbered questions. Include an answer key at the end.`;

    generateMutation.mutate({
      subject:      form.subject,
      className:    form.className,
      topic:        form.topic,
      type:         'worksheet',
      difficulty:   form.difficulty,
      numQuestions: form.numQuestions,
      includeTypes: includeTypesArr,
      prompt,
    });
  };

  const printWorksheet = () => {
    const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';
    const logo = localStorage.getItem('schoolLogoPreview') || '';
    const content = typeof worksheet === 'string'
      ? worksheet
      : (worksheet?.content || worksheet?.text || JSON.stringify(worksheet, null, 2));

    const formatted = content
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/#{1,3}\s(.+)/g, '<h3 style="color:#1B2F6E;margin:14px 0 6px">$1</h3>');

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Worksheet — ${form.subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; background: #fff; }
    .watermark {
      position: fixed; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      pointer-events: none; z-index: 0;
    }
    .watermark img { width: 180px; height: 180px; object-fit: cover; opacity: 0.06; border-radius: 16px; }
    .watermark .wm-text { font-size: 36px; font-weight: 900; color: #1B2F6E; opacity: 0.05; margin-top: 8px; text-transform: uppercase; letter-spacing: 4px; }
    .content { position: relative; z-index: 1; }
    .header { text-align: center; border-bottom: 3px solid #1B2F6E; padding-bottom: 16px; margin-bottom: 20px; }
    .school-name { font-size: 22px; font-weight: 900; color: #1B2F6E; }
    .ws-badge { display: inline-block; background: #1B2F6E; color: #fff; padding: 4px 16px; border-radius: 4px; font-size: 13px; font-weight: 700; margin: 6px 0; letter-spacing: 2px; text-transform: uppercase; }
    .info-row { display: flex; gap: 24px; justify-content: center; margin-top: 10px; font-size: 13px; }
    .info-field { display: flex; align-items: center; gap: 6px; }
    .info-field .label { font-weight: 600; color: #1B2F6E; }
    .info-field .blank { border-bottom: 1px solid #333; min-width: 100px; display: inline-block; }
    .subject-bar { background: #f0f4ff; border: 1px solid #d0daf8; border-radius: 6px; padding: 8px 16px; margin: 14px 0; display: flex; justify-content: space-between; align-items: center; }
    .subject-bar .subject { font-size: 16px; font-weight: 800; color: #1B2F6E; }
    .subject-bar .meta { font-size: 12px; color: #555; }
    .body { font-size: 14px; line-height: 1.8; }
    h3 { color: #1B2F6E; margin: 16px 0 8px; font-size: 15px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="watermark">
    ${logo ? `<img src="${logo}" alt="watermark"/>` : ''}
    <div class="wm-text">WORKSHEET</div>
  </div>
  <div class="content">
    <div class="header">
      <div class="school-name">${schoolName}</div>
      <div class="ws-badge">${form.type} Worksheet</div>
      <div class="info-row">
        <div class="info-field"><span class="label">Student Name:</span><span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
        <div class="info-field"><span class="label">Class:</span><span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
        <div class="info-field"><span class="label">Date:</span><span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
      </div>
    </div>
    <div class="subject-bar">
      <div class="subject">${form.subject} — ${form.topic}</div>
      <div class="meta">Grade: ${form.className} &nbsp;|&nbsp; Difficulty: ${form.difficulty} &nbsp;|&nbsp; Questions: ${form.numQuestions}</div>
    </div>
    <div class="body">${formatted}</div>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    w.document.close();
  };

  const setInclude = (key) => {
    setForm(f => ({
      ...f,
      includeTypes: { ...f.includeTypes, [key]: !f.includeTypes[key] },
    }));
  };

  const worksheetText = worksheet
    ? (typeof worksheet === 'string'
        ? worksheet
        : (worksheet?.content || worksheet?.text || JSON.stringify(worksheet, null, 2)))
    : null;

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1B2F6E,#0073b7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(27,47,110,0.35)' }}>
            <Brain size={24} color="#fff" />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>AI Worksheet Generator</h1>
            <p className="page-subtitle">Generate professional worksheets for any subject and topic instantly</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {worksheet && (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setWorksheet(null); setForm(defaultForm); }}
              >
                <RefreshCw size={13} /> Reset
              </button>
              <button className="btn btn-outline btn-sm" onClick={printWorksheet}>
                <Printer size={13} /> Print Worksheet
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: worksheet ? '400px 1fr' : '1fr', gap: 20 }}>
        {/* Form */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <BookOpen size={16} color="#1B2F6E" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1B2F6E', margin: 0 }}>Worksheet Settings</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Subject <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                className="form-input"
                placeholder="e.g. Mathematics, Science, English"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Class / Grade <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                className="form-input"
                placeholder="e.g. Grade 5, Class 8, Year 3"
                value={form.className}
                onChange={e => setForm(f => ({ ...f, className: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Topic <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                className="form-input"
                placeholder="e.g. Fractions, Photosynthesis, Tenses"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Worksheet Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {WORKSHEET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Difficulty</label>
                <select className="form-select" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Number of Questions: <span style={{ color: '#1B2F6E', fontWeight: 800 }}>{form.numQuestions}</span>
              </label>
              <input
                type="range"
                min={5} max={30} step={5}
                value={form.numQuestions}
                onChange={e => setForm(f => ({ ...f, numQuestions: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: '#1B2F6E' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Include Question Types</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key: 'mcq', label: 'Multiple Choice (MCQ)' },
                  { key: 'fillBlanks', label: 'Fill in the Blanks' },
                  { key: 'shortAnswers', label: 'Short Answers' },
                  { key: 'diagrams', label: 'Diagram / Draw' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, padding: '6px 10px', borderRadius: 6, background: form.includeTypes[key] ? '#eff6ff' : '#f9fafb', border: `1px solid ${form.includeTypes[key] ? '#bfdbfe' : '#e5e7eb'}`, transition: 'all .12s' }}
                  >
                    <input type="checkbox" checked={form.includeTypes[key]} onChange={() => setInclude(key)} style={{ accentColor: '#1B2F6E' }} />
                    <span style={{ color: form.includeTypes[key] ? '#1B2F6E' : '#6B7280', fontWeight: form.includeTypes[key] ? 600 : 400 }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              style={{
                padding: '12px 20px',
                background: generateMutation.isPending ? '#9CA3AF' : 'linear-gradient(135deg,#1B2F6E,#0073b7)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: generateMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: generateMutation.isPending ? 'none' : '0 4px 14px rgba(27,47,110,0.35)',
                transition: 'all .18s',
                marginTop: 4,
              }}
            >
              {generateMutation.isPending ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  Generating Worksheet...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Worksheet
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated worksheet */}
        {worksheet && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={16} color="#059669" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#059669', margin: 0 }}>Generated Worksheet</h3>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={printWorksheet}>
                  <Printer size={13} /> Print
                </button>
              </div>
            </div>

            {/* Worksheet header preview */}
            <div style={{ background: '#f0f4ff', border: '1px solid #d0daf8', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: '#1B2F6E', fontSize: 15, marginBottom: 2 }}>
                {form.subject} — {form.topic}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, background: '#1B2F6E', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{form.type}</span>
                <span style={{ fontSize: 12, color: '#555' }}>Grade: {form.className}</span>
                <span style={{ fontSize: 12, color: '#555' }}>Difficulty: {form.difficulty}</span>
                <span style={{ fontSize: 12, color: '#555' }}>{form.numQuestions} Questions</span>
              </div>
            </div>

            {/* Content */}
            <div style={{
              fontSize: 13.5,
              lineHeight: 1.85,
              color: '#1F2937',
              whiteSpace: 'pre-wrap',
              maxHeight: 600,
              overflowY: 'auto',
              padding: '4px 0',
            }}>
              {worksheetText}
            </div>
          </div>
        )}

        {/* Placeholder when no worksheet yet */}
        {!worksheet && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, background: '#fafbff', border: '2px dashed #d0daf8' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Brain size={36} color="#1B2F6E" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1B2F6E', marginBottom: 8 }}>Your Worksheet Will Appear Here</h3>
              <p style={{ fontSize: 13.5, color: '#6B7280', maxWidth: 340, lineHeight: 1.6 }}>
                Fill in the settings on the left and click "Generate Worksheet" to create a professional AI-powered worksheet instantly.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                {['MCQ Questions', 'Fill in Blanks', 'Short Answers', 'Auto Answer Key'].map(f => (
                  <span key={f} style={{ fontSize: 11.5, background: '#eff6ff', color: '#1B2F6E', padding: '3px 10px', borderRadius: 99, fontWeight: 600, border: '1px solid #bfdbfe' }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
