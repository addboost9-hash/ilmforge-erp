/**
 * IlmForge — Quiz Management System
 * Real API-backed: no localStorage, full attempt tracking
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Plus, X, Eye, Trash2, CheckCircle, Clock, ToggleLeft, ToggleRight } from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getRoleFromToken = () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
};

const getUserFromToken = () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return {};
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return {};
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   STUDENT QUIZ VIEW
═══════════════════════════════════════════════════════════════════════════ */
function StudentQuizView() {
  const [activeQuiz, setActiveQuiz] = useState(null); // quiz object being taken
  const [answers, setAnswers] = useState({});          // { questionIndex: optionIndex }
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const qc = useQueryClient();

  // Load active quizzes for this student
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['student-quizzes'],
    queryFn: async () => {
      const res = await api.get('/quizzes', { params: { status: 'active' } });
      return res.data?.data || res.data || [];
    },
  });

  // Start quiz
  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setTimeLeft((quiz.duration || 20) * 60);
  };

  // Timer
  useEffect(() => {
    if (!activeQuiz || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeQuiz, submitted]);

  const submitMutation = useMutation({
    mutationFn: async ({ quizId, payload }) => {
      const res = await api.post(`/quizzes/${quizId}/attempt`, payload);
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      clearInterval(timerRef.current);
      setSubmitted(true);
      setResult(data);
      qc.invalidateQueries(['student-quizzes']);
      toast.success('Quiz submitted!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Submission failed';
      if (msg.toLowerCase().includes('already')) {
        toast.error('You have already submitted this quiz.');
      } else {
        toast.error(msg);
      }
    },
  });

  const handleSubmit = (auto = false) => {
    if (!activeQuiz) return;
    const questions = activeQuiz.questions || [];
    const payload = {
      answers: questions.map((_, i) => ({ questionIndex: i, selectedOption: answers[i] ?? null })),
    };
    submitMutation.mutate({ quizId: activeQuiz._id || activeQuiz.id, payload });
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const timerWarning = timeLeft < 60;

  /* ── Taking a quiz ── */
  if (activeQuiz && !submitted) {
    const questions = activeQuiz.questions || [];
    const answered = Object.keys(answers).length;
    return (
      <div className="page-content fade-up">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 className="page-title">{activeQuiz.title}</h1>
            <p className="page-subtitle">{activeQuiz.subject} · {activeQuiz.class} · {questions.length} questions</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
            borderRadius: 10, background: timerWarning ? '#FEF2F2' : '#F0FDF9',
            border: `1px solid ${timerWarning ? '#FECACA' : '#CCFBF1'}`,
            fontSize: 22, fontWeight: 800, color: timerWarning ? '#B91C1C' : '#0F766E',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <Clock size={18} /> {mm}:{ss}
          </div>
        </div>

        {/* Progress */}
        <div className="card" style={{ marginBottom: 14, padding: '10px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6B7280', marginBottom: 6 }}>
            <span>Progress</span>
            <span>{answered} / {questions.length} answered</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(answered / Math.max(questions.length, 1)) * 100}%`, background: '#0D9488' }} />
          </div>
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <div key={i} className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E3A5F', marginBottom: 12 }}>
              Q{i + 1}. {q.q || q.text || q.question}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(q.options || []).map((opt, j) => {
                const selected = answers[i] === j;
                return (
                  <button
                    key={j}
                    onClick={() => setAnswers((prev) => ({ ...prev, [i]: j }))}
                    style={{
                      padding: '8px 14px', borderRadius: 8, fontSize: 13, textAlign: 'left', cursor: 'pointer',
                      background: selected ? '#CCFBF1' : '#F8FAFC',
                      border: `1.5px solid ${selected ? '#0D9488' : '#E8EDF3'}`,
                      color: selected ? '#0F766E' : '#374151',
                      fontWeight: selected ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {String.fromCharCode(65 + j)}. {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Submit */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => { clearInterval(timerRef.current); setActiveQuiz(null); }}>
            Exit Quiz
          </button>
          <button
            className="btn btn-teal"
            style={{ padding: '10px 28px' }}
            disabled={submitMutation.isPending}
            onClick={() => handleSubmit(false)}
          >
            <CheckCircle size={14} /> {submitMutation.isPending ? 'Submitting…' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    );
  }

  /* ── Result screen ── */
  if (submitted && result) {
    const score = result.score ?? 0;
    const total = result.totalMarks ?? result.total ?? (activeQuiz?.questions?.length || 1);
    const pct = Math.round((score / total) * 100);
    const passed = pct >= 50;
    return (
      <div className="page-content fade-up" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 30px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{passed ? '🎉' : '📚'}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F', marginBottom: 6 }}>
            {passed ? 'Great job!' : 'Keep practising!'}
          </h2>
          <p style={{ color: '#6B7280', marginBottom: 24 }}>{activeQuiz?.title}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: passed ? '#15803D' : '#B91C1C' }}>{score}/{total}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Score</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: passed ? '#15803D' : '#B91C1C' }}>{pct}%</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Percentage</div>
            </div>
          </div>
          <button className="btn btn-teal" onClick={() => { setActiveQuiz(null); setSubmitted(false); setResult(null); }}>
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  /* ── Quiz list for student ── */
  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">My Quizzes</h1>
        <p className="page-subtitle">Active quizzes available for your class</p>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Loading quizzes…</div>}

      {!isLoading && quizzes.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">No active quizzes</div>
            <div className="empty-state-sub">Your teacher hasn't published any quizzes yet</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {quizzes.map((q) => {
          const alreadyAttempted = q.attempted || false;
          const myScore = q.myScore;
          const total = q.totalMarks || (q.questions?.length) || 0;
          return (
            <div key={q._id || q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>{q.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{q.subject} · {q.class}</div>
                </div>
                <span className="badge badge-green">Active</span>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6B7280' }}>
                <span><Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{q.duration || 20} min</span>
                <span>📋 {(q.questions || []).length} questions</span>
                {q.dueDate && <span>📅 Due {fmtDate(q.dueDate)}</span>}
              </div>
              {alreadyAttempted ? (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, background: '#F0FDF9',
                  border: '1px solid #CCFBF1', fontSize: 12.5, color: '#0F766E', fontWeight: 600,
                }}>
                  Already submitted — Score: {myScore}/{total}
                </div>
              ) : (
                <button className="btn btn-teal" style={{ width: '100%' }} onClick={() => startQuiz(q)}>
                  Start Quiz
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN / TEACHER VIEWS
═══════════════════════════════════════════════════════════════════════════ */
export default function QuizPage() {
  const role = getRoleFromToken();
  const isStudent = role === 'student';

  // Render student view directly
  if (isStudent) return <StudentQuizView />;

  return <AdminQuizPage />;
}

function AdminQuizPage() {
  const qc = useQueryClient();
  const [view, setView] = useState('list');       // list | create | detail
  const [selectedId, setSelectedId] = useState(null);

  /* ── form state ── */
  const [form, setForm] = useState({
    title: '', subject: '', class: '', duration: 20, dueDate: '',
  });
  const [questions, setQuestions] = useState([{ q: '', options: ['', '', '', ''], answer: 0 }]);

  /* ── API: quiz list ── */
  const { data: quizzes = [], isLoading: listLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const res = await api.get('/quizzes');
      return res.data?.data || res.data || [];
    },
    enabled: view === 'list',
  });

  /* ── API: classes dropdown ── */
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || res.data || [];
    },
    enabled: view === 'create',
    staleTime: 5 * 60 * 1000,
  });

  /* ── API: quiz detail + attempts ── */
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['quiz-detail', selectedId],
    queryFn: async () => {
      const [quizRes, attemptsRes] = await Promise.all([
        api.get(`/quizzes/${selectedId}`),
        api.get(`/quizzes/${selectedId}/attempts`),
      ]);
      const quiz = quizRes.data?.data || quizRes.data;
      const attempts = attemptsRes.data?.data || attemptsRes.data || [];
      return { quiz, attempts };
    },
    enabled: view === 'detail' && !!selectedId,
  });

  /* ── Mutations ── */
  const createQuiz = useMutation({
    mutationFn: async () => {
      const payload = { ...form, questions };
      const res = await api.post('/quizzes', payload);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      toast.success('Quiz created!');
      qc.invalidateQueries(['quizzes']);
      setView('list');
      setForm({ title: '', subject: '', class: '', duration: 20, dueDate: '' });
      setQuestions([{ q: '', options: ['', '', '', ''], answer: 0 }]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create quiz'),
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/quizzes/${id}`);
    },
    onSuccess: () => {
      toast.success('Quiz deleted');
      qc.invalidateQueries(['quizzes']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }) => {
      const newStatus = currentStatus === 'active' ? 'closed' : 'active';
      const res = await api.patch(`/quizzes/${id}/status`, { status: newStatus });
      return res.data?.data || res.data;
    },
    onSuccess: (_, vars) => {
      const next = vars.currentStatus === 'active' ? 'closed' : 'active';
      toast.success(`Quiz ${next === 'active' ? 'activated' : 'closed'}`);
      qc.invalidateQueries(['quizzes']);
      qc.invalidateQueries(['quiz-detail', vars.id]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Status update failed'),
  });

  /* ── Question helpers ── */
  const addQuestion = () => setQuestions((prev) => [...prev, { q: '', options: ['', '', '', ''], answer: 0 }]);
  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  const updateQuestion = (i, key, val) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, [key]: val } : q)));
  const updateOption = (qi, oi, val) =>
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, k) => (k === oi ? val : o)) } : q
      )
    );

  /* ── Stats ── */
  const totalAttempts = (quizzes || []).reduce((s, q) => s + (q.attempts || q.attemptCount || 0), 0);

  /* ════════════════════════════════════════════════════════════════════════
     LIST VIEW
  ════════════════════════════════════════════════════════════════════════ */
  if (view === 'list') return (
    <div className="page-content fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Quiz Management</h1>
          <p className="page-subtitle">Create quizzes, assign to classes, track student performance</p>
        </div>
        <button className="btn btn-teal" onClick={() => setView('create')}>
          <Plus size={13} /> Create Quiz
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Quizzes', val: (quizzes || []).length, color: '#1D4ED8', icon: '📝' },
          { label: 'Active', val: (quizzes || []).filter((q) => q.status === 'active').length, color: '#15803D', icon: '✅' },
          { label: 'Total Attempts', val: totalAttempts, color: '#D97706', icon: '📊' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {listLoading && <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Loading quizzes…</div>}

      {!listLoading && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(quizzes || []).map((q) => {
                const qId = q._id || q.id;
                const attempts = q.attempts ?? q.attemptCount ?? 0;
                return (
                  <tr key={qId}>
                    <td style={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F' }}>{q.title}</td>
                    <td><span className="badge badge-blue">{q.subject || '—'}</span></td>
                    <td style={{ fontSize: 12.5, color: '#6B7280' }}>{q.class || '—'}</td>
                    <td><span style={{ fontWeight: 700, color: '#0D9488' }}>{(q.questions || []).length}</span></td>
                    <td style={{ fontSize: 12 }}>
                      <Clock size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      {q.duration || 20} min
                    </td>
                    <td style={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(q.dueDate)}</td>
                    <td>
                      <span className={`badge ${q.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                        {q.status === 'active' ? '● Active' : '○ Closed'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{attempts}</span>{' '}
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>students</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {/* View Details */}
                        <button
                          className="btn btn-sm btn-icon"
                          style={{ background: '#F0FDF9', border: '1px solid #CCFBF1', color: '#0F766E' }}
                          title="View Details"
                          onClick={() => { setSelectedId(qId); setView('detail'); }}
                        >
                          <Eye size={12} />
                        </button>
                        {/* Activate / Close */}
                        <button
                          className="btn btn-sm btn-icon"
                          style={{
                            background: q.status === 'active' ? '#FFF7ED' : '#F0FDF9',
                            border: `1px solid ${q.status === 'active' ? '#FED7AA' : '#CCFBF1'}`,
                            color: q.status === 'active' ? '#C2410C' : '#0F766E',
                          }}
                          title={q.status === 'active' ? 'Close Quiz' : 'Activate Quiz'}
                          disabled={toggleStatus.isPending}
                          onClick={() => toggleStatus.mutate({ id: qId, currentStatus: q.status })}
                        >
                          {q.status === 'active' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        </button>
                        {/* Delete */}
                        <button
                          className="btn btn-sm btn-icon"
                          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}
                          title="Delete Quiz"
                          onClick={() => { if (window.confirm('Delete this quiz?')) deleteQuiz.mutate(qId); }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!(quizzes || []).length && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state" style={{ padding: 28 }}>
                      <div className="empty-state-icon">📝</div>
                      <div className="empty-state-text">No quizzes yet</div>
                      <div className="empty-state-sub">Click "Create Quiz" to add your first quiz</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════════
     DETAIL VIEW
  ════════════════════════════════════════════════════════════════════════ */
  if (view === 'detail') {
    const quiz = detailData?.quiz;
    const attempts = detailData?.attempts || [];

    return (
      <div className="page-content fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-outline btn-sm btn-icon" onClick={() => setView('list')}>←</button>
          <div style={{ flex: 1 }}>
            <h1 className="page-title">{quiz?.title || 'Quiz Details'}</h1>
            <p className="page-subtitle">
              {quiz?.subject} · {quiz?.class} · {(quiz?.questions || []).length} questions · {quiz?.duration || 20} min
            </p>
          </div>
          {quiz && (
            <button
              className={`btn ${quiz.status === 'active' ? 'btn-outline' : 'btn-teal'}`}
              disabled={toggleStatus.isPending}
              onClick={() => toggleStatus.mutate({ id: quiz._id || quiz.id, currentStatus: quiz.status })}
            >
              {quiz.status === 'active' ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              {quiz.status === 'active' ? ' Close Quiz' : ' Activate Quiz'}
            </button>
          )}
        </div>

        {detailLoading && <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Loading…</div>}

        {!detailLoading && quiz && (
          <>
            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Questions', val: (quiz.questions || []).length, color: '#1D4ED8' },
                { label: 'Duration', val: `${quiz.duration || 20} min`, color: '#0F766E' },
                { label: 'Attempts', val: attempts.length, color: '#D97706' },
                { label: 'Status', val: quiz.status || 'draft', color: quiz.status === 'active' ? '#15803D' : '#6B7280' },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, textTransform: 'capitalize' }}>{s.val}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Questions */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', marginBottom: 14 }}>Questions</h3>
              {(quiz.questions || []).map((q, i) => {
                const qText = q.q || q.text || q.question || '';
                return (
                  <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F', marginBottom: 8 }}>
                      Q{i + 1}. {qText}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {(q.options || []).map((opt, j) => {
                        const correct = j === (q.answer ?? q.correctOption ?? q.correct);
                        return (
                          <div
                            key={j}
                            style={{
                              padding: '6px 12px', borderRadius: 7, fontSize: 12.5,
                              background: correct ? '#DCFCE7' : '#F8FAFC',
                              border: `1px solid ${correct ? '#BBF7D0' : '#E8EDF3'}`,
                              color: correct ? '#15803D' : '#374151',
                              fontWeight: correct ? 700 : 400,
                            }}
                          >
                            {correct && '✓ '}{String.fromCharCode(65 + j)}. {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attempts table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
                  Student Attempts ({attempts.length})
                </h3>
              </div>
              {attempts.length === 0 ? (
                <div className="empty-state" style={{ padding: 28 }}>
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-text">No attempts yet</div>
                  <div className="empty-state-sub">Students haven't submitted this quiz yet</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a, idx) => {
                      const total = a.totalMarks || quiz.totalMarks || (quiz.questions || []).length || 1;
                      const score = a.score ?? 0;
                      const pct = Math.round((score / total) * 100);
                      const passed = pct >= 50;
                      return (
                        <tr key={a._id || a.id || idx}>
                          <td style={{ color: '#94A3B8', fontSize: 12 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>
                            {a.studentName || a.student?.name || a.student?.fullName || '—'}
                          </td>
                          <td style={{ fontSize: 12.5, color: '#6B7280' }}>
                            {a.studentClass || a.student?.class || '—'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: passed ? '#15803D' : '#B91C1C' }}>
                              {score}/{total}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="progress-bar" style={{ width: 50 }}>
                                <div
                                  className="progress-fill"
                                  style={{ width: `${pct}%`, background: passed ? '#0D9488' : '#DC2626' }}
                                />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: passed ? '#15803D' : '#B91C1C' }}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#6B7280' }}>
                            {a.submittedAt || a.createdAt ? fmtDate(a.submittedAt || a.createdAt) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     CREATE VIEW
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="page-content fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm btn-icon" onClick={() => setView('list')}>←</button>
        <div>
          <h1 className="page-title">Create New Quiz</h1>
          <p className="page-subtitle">Fill in details and add questions</p>
        </div>
      </div>

      {/* Quiz meta */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', marginBottom: 14 }}>Quiz Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Quiz Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Math Chapter 3 Quiz"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Subject</label>
            <input
              className="form-input"
              placeholder="e.g. Mathematics"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class</label>
            {classes.length > 0 ? (
              <select
                className="form-input"
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
              >
                <option value="">Select class</option>
                {classes.map((c) => {
                  const cId = c._id || c.id;
                  const cName = c.name || c.className || c.title || cId;
                  return <option key={cId} value={cName}>{cName}</option>;
                })}
              </select>
            ) : (
              <input
                className="form-input"
                placeholder="e.g. Class 5"
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
              />
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Duration (min)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 20 })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Due Date</label>
            <input
              className="form-input"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Questions builder */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
            Questions ({questions.length})
          </h3>
          <button className="btn btn-sm btn-outline" onClick={addQuestion}>
            <Plus size={12} /> Add Question
          </button>
        </div>

        {questions.map((q, i) => (
          <div
            key={i}
            style={{ marginBottom: 16, padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF3' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: '#0D9488', fontSize: 13, flexShrink: 0 }}>Q{i + 1}</span>
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder={`Question ${i + 1}`}
                value={q.q}
                onChange={(e) => updateQuestion(i, 'q', e.target.value)}
              />
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4, flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {q.options.map((opt, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.answer === j}
                    onChange={() => updateQuestion(i, 'answer', j)}
                    style={{ width: 14, height: 14, accentColor: '#0D9488', flexShrink: 0 }}
                    title="Mark as correct answer"
                  />
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: 12 }}
                    placeholder={`Option ${String.fromCharCode(65 + j)}`}
                    value={opt}
                    onChange={(e) => updateOption(i, j, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: '#0D9488' }}>
              Correct answer: Option {String.fromCharCode(65 + q.answer)} — click radio button to change
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={() => setView('list')}>Cancel</button>
        <button
          className="btn btn-teal"
          style={{ padding: '10px 28px' }}
          disabled={!form.title || questions.some((q) => !q.q) || createQuiz.isPending}
          onClick={() => createQuiz.mutate()}
        >
          <CheckCircle size={14} /> {createQuiz.isPending ? 'Saving…' : 'Create Quiz'}
        </button>
      </div>
    </div>
  );
}
