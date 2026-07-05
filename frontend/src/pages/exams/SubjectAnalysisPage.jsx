import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  ArrowLeft, BarChart2, ChevronDown, Download, LayoutGrid, LayoutList,
  TrendingUp, TrendingDown, Award, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';

const barColor = pct => {
  if (pct >= 75) return '#0D9488';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: '#1E3A5F', color: '#fff', padding: '10px 14px',
        borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div>Pass %: <strong>{d.passPercent}%</strong></div>
        <div>Appeared: {d.appeared}</div>
        <div>Passed: <span style={{ color: '#6EE7B7' }}>{d.passed}</span></div>
        <div>Failed: <span style={{ color: '#FCA5A5' }}>{d.failed}</span></div>
        <div>Avg: {d.avgMarks}</div>
      </div>
    );
  }
  return null;
};

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="card" style={{ padding: 16, background: bg || '#F8FAFC', border: 'none', flex: '1 1 160px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{label}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: color || '#1E3A5F' }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ background: '#E2E8F0', borderRadius: 999, height: 8, overflow: 'hidden', marginTop: 4 }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: '100%',
        background: color, borderRadius: 999, transition: 'width 0.6s ease'
      }} />
    </div>
  );
}

export default function SubjectAnalysisPage() {
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [examId, setExamId] = useState('');
  const [displayMode, setDisplayMode] = useState('cards'); // 'cards' | 'table'

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/settings/sessions').then(r => r.data.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data),
  });

  const filteredExams = exams.filter(e => {
    if (sessionId && String(e.sessionId) !== String(sessionId)) return false;
    if (classId && String(e.classId) !== String(classId)) return false;
    return true;
  });

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['subject-analysis', examId],
    queryFn: () => api.get(`/exams/${examId}/subject-analysis`).then(r => r.data.data),
    enabled: !!examId,
  });

  const subjects = analysis?.subjects || [];

  const totalSubjects = subjects.length;
  const overallPassPct = subjects.length
    ? Math.round(subjects.reduce((s, x) => s + x.passPercent, 0) / subjects.length)
    : 0;
  const hardest = subjects.reduce((a, b) => (a.passPercent < b.passPercent ? a : b), subjects[0]);
  const easiest = subjects.reduce((a, b) => (a.passPercent > b.passPercent ? a : b), subjects[0]);

  const chartData = subjects.map(s => ({
    name: s.subjectName?.length > 12 ? s.subjectName.slice(0, 12) + '…' : s.subjectName,
    fullName: s.subjectName,
    passPercent: s.passPercent,
    appeared: s.appeared,
    passed: s.passed,
    failed: s.failed,
    avgMarks: s.avgMarks,
  }));

  const handleExportExcel = () => {
    if (!subjects.length) return;
    const headers = ['Subject', 'Appeared', 'Passed', 'Failed', 'Pass %', 'Avg Marks', 'Highest', 'Lowest'];
    const rows = subjects.map(s => [
      s.subjectName, s.appeared, s.passed, s.failed,
      s.passPercent + '%', s.avgMarks, s.highestMarks, s.lowestMarks
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subject-analysis-exam-${examId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/exams" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15} /></Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Subject-wise Analysis</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Performance breakdown by subject for selected exam</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${displayMode === 'cards' ? 'btn-teal' : 'btn-outline'}`}
            onClick={() => setDisplayMode('cards')}
            title="Cards View"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            className={`btn btn-sm ${displayMode === 'table' ? 'btn-teal' : 'btn-outline'}`}
            onClick={() => setDisplayMode('table')}
            title="Table View"
          >
            <LayoutList size={14} />
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleExportExcel} disabled={!subjects.length}>
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Session</label>
            <div style={{ position: 'relative' }}>
              <select className="form-select" value={sessionId} onChange={e => { setSessionId(e.target.value); setExamId(''); }}>
                <option value="">All Sessions</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Class</label>
            <div style={{ position: 'relative' }}>
              <select className="form-select" value={classId} onChange={e => { setClassId(e.target.value); setExamId(''); }}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>
          </div>
          <div style={{ flex: '2 1 220px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Exam</label>
            <div style={{ position: 'relative' }}>
              <select className="form-select" value={examId} onChange={e => setExamId(e.target.value)}>
                <option value="">Select Exam</option>
                {filteredExams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} {e.className ? `— ${e.className}` : ''} {e.type ? `(${e.type})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>
          </div>
        </div>
      </div>

      {/* No exam selected */}
      {!examId && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 16, marginBottom: 6 }}>Select an Exam</div>
          <div style={{ color: '#64748B', fontSize: 13 }}>Choose an exam to view subject-wise analysis and statistics.</div>
        </div>
      )}

      {isLoading && examId && (
        <div className="loading-center"><div className="spinner" /></div>
      )}

      {!isLoading && examId && subjects.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 16, marginBottom: 6 }}>No Analysis Data</div>
          <div style={{ color: '#64748B', fontSize: 13 }}>No subject analysis data found for the selected exam.</div>
        </div>
      )}

      {!isLoading && subjects.length > 0 && (
        <>
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatCard
              icon={<BarChart2 size={18} color="#1E3A5F" />}
              label="Total Subjects"
              value={totalSubjects}
              color="#1E3A5F"
              bg="#EFF6FF"
            />
            <StatCard
              icon={<Award size={18} color="#0D9488" />}
              label="Overall Pass %"
              value={`${overallPassPct}%`}
              color="#0D9488"
              bg="#ECFDF5"
            />
            <StatCard
              icon={<TrendingDown size={18} color="#EF4444" />}
              label="Hardest Subject"
              value={hardest?.subjectName || '—'}
              color="#EF4444"
              bg="#FEF2F2"
            />
            <StatCard
              icon={<TrendingUp size={18} color="#10B981" />}
              label="Easiest Subject"
              value={easiest?.subjectName || '—'}
              color="#10B981"
              bg="#ECFDF5"
            />
          </div>

          {/* Bar Chart */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BarChart2 size={16} color="#0D9488" />
              <span style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 14 }}>Pass Percentage by Subject</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#0D9488', borderRadius: 2, display: 'inline-block' }} />
                  Good (&gt;75%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#F59E0B', borderRadius: 2, display: 'inline-block' }} />
                  Average (50-75%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2, display: 'inline-block' }} />
                  Poor (&lt;50%)
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="passPercent" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColor(entry.passPercent)} />
                  ))}
                  <LabelList dataKey="passPercent" position="top" formatter={v => `${v}%`} style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards / Table Toggle */}
          {displayMode === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {subjects.map((subj, i) => {
                const pc = barColor(subj.passPercent);
                return (
                  <div key={i} className="card" style={{ padding: 18, borderTop: `4px solid ${pc}` }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1E3A5F', marginBottom: 12 }}>{subj.subjectName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A5F' }}>{subj.appeared}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Appeared</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0D9488' }}>{subj.passed}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Passed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444' }}>{subj.failed}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Failed</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                        <span style={{ color: '#64748B' }}>Pass %</span>
                        <span style={{ fontWeight: 700, color: pc }}>{subj.passPercent}%</span>
                      </div>
                      <ProgressBar value={subj.passPercent} color={pc} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                      <span>Avg: <strong style={{ color: '#374151' }}>{subj.avgMarks}</strong></span>
                      <span>High: <strong style={{ color: '#0D9488' }}>{subj.highestMarks}</strong></span>
                      <span>Low: <strong style={{ color: '#EF4444' }}>{subj.lowestMarks}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Subject</th>
                      <th>Appeared</th>
                      <th>Passed</th>
                      <th>Failed</th>
                      <th>Pass %</th>
                      <th>Avg Marks</th>
                      <th>Highest</th>
                      <th>Lowest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subj, i) => {
                      const pc = barColor(subj.passPercent);
                      return (
                        <tr key={i}>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{subj.subjectName}</td>
                          <td>{subj.appeared}</td>
                          <td style={{ color: '#0D9488', fontWeight: 600 }}>{subj.passed}</td>
                          <td style={{ color: '#EF4444', fontWeight: 600 }}>{subj.failed}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="progress-bar" style={{ width: 60, display: 'inline-block' }}>
                                <div className="progress-fill" style={{ width: `${subj.passPercent}%`, background: pc }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: pc }}>{subj.passPercent}%</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{subj.avgMarks}</td>
                          <td style={{ color: '#0D9488', fontWeight: 600 }}>{subj.highestMarks}</td>
                          <td style={{ color: '#EF4444', fontWeight: 600 }}>{subj.lowestMarks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legend note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <AlertCircle size={14} color="#F59E0B" />
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Pass threshold is set at 40%. Colors indicate: green (good, &gt;75% pass rate), yellow (average, 50-75%), red (needs attention, &lt;50%).
            </span>
          </div>
        </>
      )}
    </div>
  );
}
