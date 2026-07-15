import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

const NAVY = '#1B2F6E';
const LIGHT_BG = '#f0f4ff';
const cardStyle = { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(27,47,110,0.08)', marginBottom: 20 };
const btnStyle = (color = NAVY) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
const labelStyle = { fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4, display: 'block' };

const GRADE_COLORS = { A: '#059669', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };
const GRADE_LABELS = { A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Needs Improvement' };

function calcGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function calcScore(criteria) {
  if (!criteria || criteria.length === 0) return 0;
  const total = criteria.reduce((s, c) => s + (parseInt(c.maxScore) || 0), 0);
  const obtained = criteria.reduce((s, c) => s + (parseInt(c.score) || 0), 0);
  return total > 0 ? Math.round((obtained / total) * 100) : 0;
}

const DEFAULT_CRITERIA = [
  { name: 'Subject Knowledge', score: 0, maxScore: 10 },
  { name: 'Teaching Methodology', score: 0, maxScore: 10 },
  { name: 'Classroom Management', score: 0, maxScore: 10 },
  { name: 'Student Engagement', score: 0, maxScore: 10 },
  { name: 'Punctuality & Attendance', score: 0, maxScore: 10 },
  { name: 'Teamwork & Collaboration', score: 0, maxScore: 10 },
];

export default function AppraisalPage() {
  const qc = useQueryClient();
  const [view, setView] = useState('list');
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    staffId: '', year: new Date().getFullYear(), term: 'Annual', criteria: JSON.parse(JSON.stringify(DEFAULT_CRITERIA)),
    strengths: '', improvements: '', incrementPercent: 0,
  });
  const [filterYear, setFilterYear] = useState('');

  const { data: staff = [] } = useQuery({ queryKey: ['staff-list'], queryFn: () => api.get('/staff').then(r => r.data.data || []) });
  const { data: appraisals = [], isLoading } = useQuery({
    queryKey: ['appraisals', filterYear],
    queryFn: () => api.get('/appraisals', { params: { year: filterYear || undefined } }).then(r => r.data.data || []),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/appraisals', data),
    onSuccess: () => {
      qc.invalidateQueries(['appraisals']);
      toast.success('Appraisal saved!');
      setView('list');
      setForm({ staffId: '', year: new Date().getFullYear(), term: 'Annual', criteria: JSON.parse(JSON.stringify(DEFAULT_CRITERIA)), strengths: '', improvements: '', incrementPercent: 0 });
    },
    onError: () => toast.error('Failed to save'),
  });

  const incrementMutation = useMutation({
    mutationFn: ({ id, incrementPercent }) => api.post(`/appraisals/${id}/payroll/propose`, { incrementPercent }),
    onSuccess: () => {
      qc.invalidateQueries(['appraisals']);
      toast.success('Increment proposed! Awaiting approval.');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to propose increment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/appraisals/${id}`),
    onSuccess: () => { qc.invalidateQueries(['appraisals']); toast.success('Deleted!'); },
    onError: () => toast.error('Failed to delete'),
  });

  const score = calcScore(form.criteria);
  const grade = calcGrade(score);

  const updateCriteria = (i, field, val) => {
    setForm(f => ({ ...f, criteria: f.criteria.map((c, idx) => idx === i ? { ...c, [field]: val } : c) }));
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>Staff Appraisals</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Performance evaluation and increment management</p>
        </div>

        {view === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <select style={{ ...inputStyle, width: 140 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button style={btnStyle()} onClick={() => setView('create')}>+ New Appraisal</button>
            </div>
            <div style={cardStyle}>
              {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : appraisals.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No appraisals found. Create one!</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: NAVY, color: '#fff' }}>
                      {['Staff', 'Designation', 'Period', 'Score', 'Grade', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appraisals.map((a, i) => {
                      const g = calcGrade(a.score);
                      return (
                        <tr key={a.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.staff?.name || a.staff?.user?.name || '-'}</td>
                          <td style={{ padding: '10px 12px', color: '#6b7280' }}>{a.staff?.designation || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{a.term} {a.year}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>{a.score}%</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: GRADE_COLORS[g], color: '#fff', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{g} - {GRADE_LABELS[g]}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: a.status === 'finalized' ? '#dcfce7' : '#fef9c3', color: a.status === 'finalized' ? '#166534' : '#92400e', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{a.status}</span>
                          </td>
                          <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                            <button style={btnStyle('#6366f1')} onClick={() => { setDetail(a); setView('detail'); }}>View</button>
                            <button style={{ ...btnStyle('#ef4444'), padding: '5px 10px', fontSize: 12 }} onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(a.id); }}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div style={cardStyle}>
            <h3 style={{ color: NAVY, marginTop: 0 }}>Create Appraisal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Staff Member *</label>
                <select style={inputStyle} value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}>
                  <option value="">Select Staff</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name || s.user?.name} {s.designation ? `(${s.designation})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year *</label>
                <select style={inputStyle} value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Term</label>
                <select style={inputStyle} value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
                  {['Annual', 'Mid-Year', 'Q1', 'Q2', 'Q3', 'Q4'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Score summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ background: LIGHT_BG, borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: GRADE_COLORS[grade] }}>{score}%</div>
                <div style={{ fontSize: 13, color: '#374151' }}>Total Score</div>
              </div>
              <div style={{ background: LIGHT_BG, borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: GRADE_COLORS[grade] }}>{grade}</div>
                <div style={{ fontSize: 13, color: '#374151' }}>{GRADE_LABELS[grade]}</div>
              </div>
            </div>

            <h4 style={{ color: NAVY, marginBottom: 12 }}>Evaluation Criteria</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
              <thead>
                <tr style={{ background: NAVY, color: '#fff' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Criteria</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: 80 }}>Max</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: 120 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {form.criteria.map((c, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{c.maxScore}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min={0} max={c.maxScore} value={c.score} onChange={e => updateCriteria(i, 'score', parseInt(e.target.value) || 0)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Strengths</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} placeholder="Staff strengths..." />
              </div>
              <div>
                <label style={labelStyle}>Areas for Improvement</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.improvements} onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))} placeholder="Improvement areas..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={btnStyle('#6b7280')} onClick={() => setView('list')}>Cancel</button>
              <button style={btnStyle()} onClick={() => { if (!form.staffId) return toast.error('Select staff'); createMutation.mutate({ ...form, score }); }} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Appraisal'}
              </button>
            </div>
          </div>
        )}

        {view === 'detail' && detail && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ color: NAVY, margin: 0 }}>{detail.staff?.name || '-'} — {detail.term} {detail.year}</h2>
                <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>{detail.staff?.designation || ''}</p>
              </div>
              <button style={btnStyle('#6b7280')} onClick={() => setView('list')}>Back</button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Score', val: `${detail.score}%`, color: GRADE_COLORS[calcGrade(detail.score)] },
                { label: 'Grade', val: calcGrade(detail.score), color: GRADE_COLORS[calcGrade(detail.score)] },
                { label: 'Rating', val: detail.rating, color: NAVY },
                { label: 'Status', val: detail.status, color: '#6366f1' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: LIGHT_BG, borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Score bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                <span>Overall Score</span><span>{detail.score}%</span>
              </div>
              <div style={{ height: 12, background: '#e5e7eb', borderRadius: 99 }}>
                <div style={{ height: '100%', background: GRADE_COLORS[calcGrade(detail.score)], borderRadius: 99, width: `${detail.score}%`, transition: 'width 0.4s' }} />
              </div>
            </div>

            {detail.criteria && detail.criteria.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: NAVY, marginBottom: 12 }}>Criteria Breakdown</h4>
                {detail.criteria.map((c, i) => {
                  const pct = c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0;
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: '#6b7280' }}>{c.score}/{c.maxScore}</span>
                      </div>
                      <div style={{ height: 8, background: '#e5e7eb', borderRadius: 99 }}>
                        <div style={{ height: '100%', background: pct >= 80 ? '#059669' : pct >= 60 ? '#3b82f6' : '#f59e0b', borderRadius: 99, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {detail.strengths && (
                <div>
                  <h5 style={{ color: '#059669', margin: '0 0 8px' }}>Strengths</h5>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{detail.strengths}</p>
                </div>
              )}
              {detail.improvements && (
                <div>
                  <h5 style={{ color: '#f59e0b', margin: '0 0 8px' }}>Areas for Improvement</h5>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{detail.improvements}</p>
                </div>
              )}
            </div>

            {detail.status !== 'finalized' && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                <h4 style={{ color: NAVY, margin: '0 0 12px' }}>Apply Salary Increment</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Increment Percentage (%)</label>
                    <input style={inputStyle} type="number" min={0} max={50}
                      defaultValue={detail.score >= 90 ? 15 : detail.score >= 80 ? 10 : detail.score >= 70 ? 6 : 3}
                      id={`incr-${detail.id}`}
                    />
                  </div>
                  <button style={btnStyle('#059669')} onClick={() => {
                    const pct = parseFloat(document.getElementById(`incr-${detail.id}`)?.value) || 0;
                    if (confirm(`Apply ${pct}% increment?`)) incrementMutation.mutate({ id: detail.id, incrementPercent: pct });
                  }} disabled={incrementMutation.isPending}>
                    {incrementMutation.isPending ? 'Applying...' : 'Apply Increment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
