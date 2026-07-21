import { useMemo, useState } from 'react';
import { Sparkles, MessageCircle, FileText, BookOpenCheck, Palette } from 'lucide-react';

/* ── IlmForge AI Copilot — unique tool cards ── */
const AI_TOOLS = [
  {
    title: 'Lesson Plan Generator',
    desc: "Create complete lesson plans using Bloom's Taxonomy in seconds",
    icon: '📖', color: '#1B2F6E',
    link: '/academics/lesson-plans',
    badge: 'POPULAR',
  },
  {
    title: 'Smart Exam Builder',
    desc: 'Generate exam questions: MCQ, Short, Long, Essay, Applications',
    icon: '📝', color: '#7c3aed',
    link: '/exams/question-papers',
    badge: 'AI',
  },
  {
    title: 'Worksheet Creator',
    desc: 'Create practice worksheets for any subject and topic instantly',
    icon: '📋', color: '#059669',
    link: '/academics/worksheets',
    badge: 'NEW',
  },
  {
    title: 'Quick MCQ Bank',
    desc: 'Generate topic-wise multiple choice questions with answer keys',
    icon: '❓', color: '#D97706',
    link: '/exams/mcq-generator',
    badge: 'FAST',
  },
  {
    title: 'RoboBuddy Assistant',
    desc: 'Setup WhatsApp bot to answer parent queries automatically',
    icon: '🤖', color: '#DC2626',
    link: '/robobuddy',
    badge: 'BOT',
  },
  {
    title: 'School Insights',
    desc: 'AI-powered analysis of attendance, fees, and exam performance',
    icon: '📊', color: '#0073b7',
    link: '/analytics/students',
    badge: 'SMART',
  },
];

const TOOL_CONFIG = {
  chat: {
    title: 'AI Chat',
    icon: MessageCircle,
    description: 'School-focused prompt helper for teachers and admins.',
  },
  lesson: {
    title: 'AI Lesson Plans',
    icon: BookOpenCheck,
    description: 'Generate period-wise lesson plans with outcomes and assessments.',
  },
  worksheet: {
    title: 'AI Worksheets',
    icon: FileText,
    description: 'Generate worksheet packs by class, topic and difficulty.',
  },
  design: {
    title: 'Design Studio',
    icon: Palette,
    description: 'Create content and design briefs for notices, posters and campaigns.',
  },
};

function generateOutput({ tool, subject, grade, topic, tone, objective }) {
  if (tool === 'lesson') {
    return `Lesson Plan\n\nSubject: ${subject}\nClass: ${grade}\nTopic: ${topic}\nObjective: ${objective}\nTone: ${tone}\n\n1) Starter (5 min)\n- Quick recap questions\n- Prior knowledge check\n\n2) Main Teaching (20 min)\n- Explain concept with local examples\n- Guided board work and questioning\n\n3) Practice (12 min)\n- Pair activity and worksheet questions\n- Teacher circulates and supports\n\n4) Assessment (5 min)\n- Exit ticket: 3 concept checks\n\n5) Homework\n- Short practice task aligned with classwork\n`;
  }

  if (tool === 'worksheet') {
    return `Worksheet Pack\n\nSubject: ${subject}\nClass: ${grade}\nTopic: ${topic}\nDifficulty Tone: ${tone}\n\nA) MCQs\n1. Concept-based question\n2. Application question\n3. Scenario question\n\nB) Short Questions\n1. Define the core concept.\n2. Write one real-life example.\n\nC) Long Question\n- Explain the topic with diagram/steps and conclusion.\n\nTeacher Key\n- Add answer key before printing for staff version.`;
  }

  if (tool === 'design') {
    return `Design Brief\n\nCampaign Type: ${topic}\nAudience: ${grade}\nTone: ${tone}\nPrimary Objective: ${objective}\n\nCopy Blocks:\n- Headline: Strong and action-oriented\n- Sub-headline: Practical value for parents/students\n- CTA: Contact school office / portal announcement\n\nVisual Direction:\n- Use school colors and logo lockup\n- Include one hero visual and two support icons\n- Keep Urdu/English bilingual space if required`;
  }

  return `AI Chat Draft\n\nContext\n- Subject: ${subject}\n- Class: ${grade}\n- Topic: ${topic}\n- Objective: ${objective}\n\nSuggested Prompt\n"Act as an experienced school mentor. Provide a concise, classroom-ready plan with examples suitable for ${grade}. Keep language ${tone}."`;
}

export default function MentorAIToolsPage() {
  const [tool, setTool] = useState('chat');
  const [subject, setSubject] = useState('Science');
  const [grade, setGrade] = useState('Class 7');
  const [topic, setTopic] = useState('Human Digestive System');
  const [tone, setTone] = useState('Practical and student-friendly');
  const [objective, setObjective] = useState('Students can explain the process step by step');

  const output = useMemo(
    () => generateOutput({ tool, subject, grade, topic, tone, objective }),
    [tool, subject, grade, topic, tone, objective]
  );

  return (
    <div className="page-content fade-in" style={{ paddingBottom: 24 }}>
      {/* ── IlmForge AI Copilot Header ── */}
      <div className="ilm-page-header ilm-animate" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="ilm-page-title">🤖 AI Copilot</h1>
          <p className="ilm-page-subtitle">Powered by Gemini AI — Your intelligent school management assistant</p>
        </div>
      </div>

      {/* ── AI Tool Cards Grid (unique IlmForge feature) ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1B2F6E', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} /> Quick Access Tools
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {AI_TOOLS.map((tool, i) => (
            <a key={tool.title} href={tool.link} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)',
                  borderRadius: 16, overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.45)',
                  boxShadow: '0 4px 20px rgba(27,47,110,0.08)',
                  animation: `ilm-fade-in 0.4s ease-out ${i * 80}ms both`,
                  transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(27,47,110,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(27,47,110,0.08)'; }}
              >
                <div style={{ background: `linear-gradient(135deg,${tool.color},${tool.color}bb)`, padding: '20px 22px', color: 'white', position: 'relative' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{tool.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{tool.title}</div>
                  {tool.badge && (
                    <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 999, letterSpacing: 1 }}>
                      {tool.badge}
                    </span>
                  )}
                </div>
                <div style={{ padding: '14px 22px' }}>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{tool.desc}</p>
                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: tool.color }}>
                    Use Tool →
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ fontWeight: 700, fontSize: 13, color: '#1B2F6E', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={15} /> AI Workspace — Generate Content
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>Tools</div>
          {Object.entries(TOOL_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = tool === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTool(key)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                  background: active ? '#EFF6FF' : '#fff',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={15} color={active ? '#1D4ED8' : '#475569'} />
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>{cfg.title}</div>
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#64748B' }}>{cfg.description}</div>
              </button>
            );
          })}

          <div style={{ borderTop: '1px solid #F1F5F9', margin: '10px 0' }} />

          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 5 }}>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }} />

          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 5 }}>Class</label>
          <input value={grade} onChange={(e) => setGrade(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }} />

          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 5 }}>Topic or Campaign</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }} />

          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 5 }}>Tone</label>
          <input value={tone} onChange={(e) => setTone(e.target.value)} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }} />

          <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 5 }}>Objective</label>
          <textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', resize: 'vertical' }} />
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', fontWeight: 800, fontSize: 13, color: '#334155' }}>
            Generated Draft
          </div>
          <div style={{ padding: 12 }}>
            <textarea
              value={output}
              readOnly
              rows={28}
              style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 10, padding: 12, fontSize: 12.5, lineHeight: 1.45, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
