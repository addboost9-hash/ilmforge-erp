/**
 * IlmForge — BISE / Competitor-style Result Card
 * Yellow header, school logo, subject columns (1st/2nd/3rd),
 * bar chart, class teacher remarks, attendance, PASS/FAIL
 * Matches Pakistani board result card format exactly
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../api/client';
import { Search, Printer, ChevronRight } from 'lucide-react';

const Rs = v => Number(v || 0).toLocaleString('en-PK');
const pct = (o, t) => t > 0 ? ((o / t) * 100).toFixed(2) : '0.00';
const grade = (p) => {
  const n = parseFloat(p);
  if (n >= 90) return 'A+';
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  if (n >= 50) return 'D';
  if (n >= 40) return 'E';
  return 'F';
};
const REMARKS = { A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Satisfactory', E: 'Need Improvement', F: 'Fail' };

/* ── Print handler ──────────────────────────────────────────── */
function printResultCard(el, studentName) {
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head>
    <title>Result Card — ${studentName}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; background: white; -webkit-print-color-adjust: exact; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      .no-print { display: none !important; }
    </style>
  </head><body>${el.innerHTML}</body></html>`);
  w.document.close(); w.print();
}

/* ── Result Card Component ─────────────────────────────────── */
function ResultCard({ student, exam, subjectMarks, attendanceSummary, teacherRemark, school }) {
  const logo   = school?.logoUrl || localStorage.getItem('schoolLogoPreview');
  const sName  = school?.name    || localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const sAddr  = school?.address || '';
  const sPhone = school?.phone   || '';
  const headerColor = '#F5C518'; // Yellow like competitor
  const headerText  = '#1a1a1a';

  const totalObt   = subjectMarks.reduce((s, m) => s + Number(m.obtained || 0), 0);
  const totalMarks = subjectMarks.reduce((s, m) => s + Number(m.total || 0), 0);
  const passMarks  = Math.round(totalMarks * 0.4);
  const overallPct = pct(totalObt, totalMarks);
  const overallGrade = grade(overallPct);
  const isPassed   = totalObt >= passMarks && !subjectMarks.some(m => !m.isAbsent && Number(m.obtained) < Number(m.total) * 0.33);
  const position   = 1; // placeholder — can be calculated from class results

  const chartData = subjectMarks.map(m => ({
    subject: (m.subject?.name || m.subjectName || '').substring(0, 8),
    Obtained: Number(m.obtained || 0),
    Total:    Number(m.total || 0),
  }));

  // Calculate attendance percentage
  const attPct = attendanceSummary
    ? `${attendanceSummary.presentDays || 0} / ${attendanceSummary.totalDays || 0}`
    : '— / —';

  return (
    <div style={{ width: '100%', maxWidth: 820, margin: '0 auto', background: 'white', fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
      {/* Yellow Header */}
      <div style={{ background: headerColor, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', flexShrink: 0, overflow: 'hidden' }}>
          {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 28, fontWeight: 800 }}>🎓</span>}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: headerText, letterSpacing: 1 }}>{sName.toUpperCase()}</div>
          {sAddr && <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>Address: {sAddr}{sPhone ? ` | Phone: ${sPhone}` : ''}</div>}
        </div>
      </div>

      {/* Result Card Title */}
      <div style={{ background: '#e8e8e8', padding: '8px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Result Card — {exam?.title || exam?.name || 'Final Exam'}</div>
      </div>

      {/* Student Info + Photo */}
      <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #ddd', gap: 12 }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {[
            ['Student / Roll', `${student?.name || '—'}\n${student?.rollNo || '—'}`],
            ['Parent / Campus', `${student?.fatherName || '—'}\n${student?.campus?.name || '—'}`],
            ['Class / Section', `${student?.class?.name || '—'}\n${student?.section?.name || 'A'}`],
            ['Campus / Session', `${student?.campus?.name || 'Main Campus'}\n${new Date().getFullYear()}-${new Date().getFullYear() + 1}`],
          ].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center', background: '#f9f9f9', padding: '8px 4px', border: '1px solid #ddd', borderRadius: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#555', marginBottom: 4 }}>{label}</div>
              {val.split('\n').map((v, i) => <div key={i} style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 400, color: '#1a1a1a' }}>{v}</div>)}
            </div>
          ))}
        </div>
        {/* Photo */}
        <div style={{ width: 70, height: 80, border: '2px solid #ddd', borderRadius: 4, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          {student?.photoUrl
            ? <img src={student.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 32 }}>👤</span>
          }
        </div>
      </div>

      {/* Subject Marks Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ background: '#1e3a5f', color: 'white', padding: '6px 8px', textAlign: 'left', border: '1px solid #555', fontSize: 11, width: 100 }}>Subjects</th>
            <th colSpan={3} style={{ background: '#2563eb', color: 'white', padding: '6px 8px', textAlign: 'center', border: '1px solid #555', fontSize: 11 }}>Exams</th>
            <th colSpan={5} style={{ background: '#0f766e', color: 'white', padding: '6px 8px', textAlign: 'center', border: '1px solid #555', fontSize: 11 }}>Result Overview</th>
          </tr>
          <tr>
            {['1st', '2nd', '3rd'].map(e => (
              <th key={e} style={{ background: '#3b82f6', color: 'white', padding: '5px 6px', textAlign: 'center', border: '1px solid #555', fontSize: 11, width: 55 }}>{e}</th>
            ))}
            {['Obtained', 'Total', 'Minimum', 'Percentage', 'Remarks'].map(h => (
              <th key={h} style={{ background: '#14b8a6', color: 'white', padding: '5px 6px', textAlign: 'center', border: '1px solid #555', fontSize: 11, width: h === 'Remarks' ? 90 : 60 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjectMarks.map((m, i) => {
            const obt  = m.isAbsent ? 'ABS' : Number(m.obtained || 0);
            const tot  = Number(m.total || 100);
            const min  = Math.round(tot * 0.33);
            const p    = m.isAbsent ? '—' : pct(obt, tot) + '%';
            const rmk  = m.isAbsent ? 'Absent' : (REMARKS[grade(pct(obt, tot))] || '—');
            const fail = !m.isAbsent && Number(obt) < min;
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', fontWeight: 600, color: '#1e3a5f' }}>{m.subject?.name || m.subjectName || `Subject ${i + 1}`}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd', background: '#eff6ff' }}>{m.isAbsent ? 'ABS' : (m.exam1 || m.obtained || '—')}/{tot}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd', background: '#eff6ff' }}>{m.exam2 || '—'}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd', background: '#eff6ff' }}>{m.exam3 || '—'}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd', fontWeight: 700, color: fail ? '#dc2626' : '#15803d' }}>{obt}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd' }}>{tot}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd', color: '#64748b' }}>{min}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd', color: fail ? '#dc2626' : '#0073b7', fontWeight: 600 }}>{p}</td>
                <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #ddd', color: fail ? '#dc2626' : '#374151', fontSize: 10 }}>{rmk}</td>
              </tr>
            );
          })}
        </tbody>
        {/* Summary Footer */}
        <tfoot>
          <tr style={{ background: '#f0f4ff', fontWeight: 700 }}>
            {['Total Obtained', 'Passing Marks', 'Percentage', 'Position in Class', 'Grade', 'Status', 'Attendance', 'Final Result'].map((h, i) => (
              <td key={h} colSpan={i === 0 ? 2 : 1} style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #999', fontSize: 10, fontWeight: 700, background: '#1e3a5f', color: 'white' }}>{h}</td>
            ))}
          </tr>
          <tr style={{ fontWeight: 800 }}>
            <td colSpan={2} style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd', fontSize: 13 }}>{Rs(totalObt)} / {Rs(totalMarks)}</td>
            <td style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd' }}>{Rs(passMarks)}</td>
            <td style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd', color: '#0073b7' }}>{overallPct}%</td>
            <td style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd' }}>{position}</td>
            <td style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd', fontSize: 13, fontWeight: 800 }}>{overallGrade}</td>
            <td style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd', color: isPassed ? '#15803d' : '#dc2626' }}>{isPassed ? 'Good' : 'Need Imp.'}</td>
            <td style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd', fontSize: 11 }}>{attPct}</td>
            <td style={{ padding: '7px', textAlign: 'center', border: '1px solid #ddd', background: isPassed ? '#dcfce7' : '#fee2e2', color: isPassed ? '#15803d' : '#dc2626', fontSize: 14, fontWeight: 900 }}>
              {isPassed ? 'PASS' : 'FAIL'}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Progress Overview — Bar Chart */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
        <div style={{ background: '#e8e8e8', padding: '5px 8px', fontWeight: 700, marginBottom: 10, fontSize: 12, textAlign: 'center' }}>Progress Overview</div>
        <div style={{ height: 160 }} className="no-print-chart">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Obtained" fill="#93c5fd" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Total"    fill="#f9a8d4" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Teacher Remarks */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ background: '#e8e8e8', padding: '6px 10px', textAlign: 'center', border: '1px solid #ddd', fontSize: 12, fontWeight: 700 }}>Class Teacher Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px 14px', border: '1px solid #ddd', minHeight: 40, fontSize: 12 }}>
              {teacherRemark || (isPassed ? 'Student has performed well. Keep up the good work!' : 'Student needs to work harder to improve performance.')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px 12px', borderTop: '1px solid #ddd', marginTop: 8 }}>
        <div style={{ fontSize: 10, color: '#374151' }}>School Stamp / Authorized Signature.</div>
        <div style={{ fontSize: 10, color: '#374151' }}>Print Date: {new Date().toLocaleString('en-PK')}</div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function BISEResultCardPage() {
  const [search,    setSearch]    = useState('');
  const [studentId, setStudentId] = useState(null);
  const [student,   setStudent]   = useState(null);
  const [examId,    setExamId]    = useState('');
  const [remark,    setRemark]    = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['bise-search', search],
    queryFn: () => api.get('/students', { params: { search, limit: 8 } }).then(r => r.data.data || []).catch(() => []),
    enabled: search.length >= 2,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams-bise'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []).catch(() => []),
  });

  const { data: school } = useQuery({
    queryKey: ['school-settings-bise'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => null),
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['bise-results', examId, studentId],
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}/results`);
      const all = res.data.data || [];
      return studentId ? all.filter(r => r.studentId === studentId) : all;
    },
    enabled: !!examId,
  });

  const { data: attSummary } = useQuery({
    queryKey: ['att-summary-bise', studentId],
    queryFn: () => api.get('/attendance/summary', { params: { studentId } }).then(r => r.data.data).catch(() => null),
    enabled: !!studentId,
  });

  const exam = exams.find(e => e.id === parseInt(examId));
  const cardRef = { current: null };

  // Build subject marks from results
  const subjectMarks = results.map(r => ({
    subject:     r.subject || { name: r.subjectName || 'Subject' },
    subjectName: r.subjectName || r.subject?.name,
    obtained:    r.obtainedMarks || 0,
    total:       r.totalMarks || 100,
    isAbsent:    r.isAbsent || false,
    exam1:       r.obtainedMarks,
    grade:       r.grade,
  }));

  const handlePrint = () => {
    const el = document.getElementById('bise-card-print');
    if (el) printResultCard(el, student?.name || 'Student');
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title">BISE Result Card</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Pakistani board-format result card with bar chart and teacher remarks</p>
        </div>
        {student && examId && (
          <button className="btn btn-outline btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Print Result Card
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <label className="form-label">Search Student</label>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 34, color: '#94a3b8' }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Name or roll number…"
              value={search} onChange={e => { setSearch(e.target.value); setStudentId(null); setStudent(null); }} />
            {students.length > 0 && !studentId && search.length >= 2 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100 }}>
                {students.map(s => (
                  <div key={s.id} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}
                    onClick={() => { setStudentId(s.id); setStudent(s); setSearch(s.name); }}>
                    <ChevronRight size={11} style={{ marginRight: 4, color: '#94a3b8' }} />
                    <strong>{s.name}</strong> — {s.class?.name} | {s.rollNo}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: '0 0 220px' }}>
            <label className="form-label">Select Exam</label>
            <select className="form-select" value={examId} onChange={e => setExamId(e.target.value)}>
              <option value="">— Select Exam —</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.title || e.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Teacher Remarks</label>
            <input className="form-input" value={remark} onChange={e => setRemark(e.target.value)} placeholder="Class teacher remarks (optional)" />
          </div>
        </div>
      </div>

      {/* Result Card Preview */}
      {!studentId || !examId ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div style={{ fontSize: 48 }}>📊</div>
            <div className="empty-state-text">Select student and exam to generate result card</div>
            <div className="empty-state-sub">BISE-format with yellow header, subject marks, bar chart</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : subjectMarks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-text">No marks found for this student in this exam</div>
          </div>
        </div>
      ) : (
        <div id="bise-card-print" ref={r => cardRef.current = r}>
          <ResultCard
            student={student}
            exam={exam}
            subjectMarks={subjectMarks}
            attendanceSummary={attSummary}
            teacherRemark={remark}
            school={school}
          />
        </div>
      )}
    </div>
  );
}
