import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  ArrowLeft, Printer, Search, Users, User, ChevronDown, Award, BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const gradeColor = g => {
  if (!g || g === 'ABS') return { c: '#94a3b8', bg: '#F1F5F9' };
  if (g === 'A+' || g === 'A') return { c: '#15803D', bg: '#DCFCE7' };
  if (g === 'B' || g === 'C') return { c: '#1D4ED8', bg: '#DBEAFE' };
  if (g === 'D' || g === 'E') return { c: '#B45309', bg: '#FEF3C7' };
  return { c: '#B91C1C', bg: '#FEE2E2' };
};

const calcGrade = pct => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
};

const calcDivision = pct => {
  if (pct >= 60) return '1st Division';
  if (pct >= 45) return '2nd Division';
  if (pct >= 33) return '3rd Division';
  return 'Fail';
};

function IndividualReportCard({ student, examColumns, schoolInfo, showAttendance }) {
  const totalObtained = student.subjects?.reduce((sum, s) => sum + (s.totalObtained || 0), 0) || 0;
  const totalMarks = student.subjects?.reduce((sum, s) => sum + (s.totalMarks || 0), 0) || 0;
  const annualPct = totalMarks > 0 ? Math.round((totalObtained / totalMarks) * 100) : 0;
  const annualGrade = calcGrade(annualPct);
  const division = calcDivision(annualPct);
  const gc = gradeColor(annualGrade);

  return (
    <div className="report-card-print" style={{
      background: '#fff',
      border: '2px solid #1E3A5F',
      borderRadius: 8,
      padding: 24,
      maxWidth: 900,
      margin: '0 auto 24px',
      fontFamily: 'serif',
      pageBreakAfter: 'always'
    }}>
      {/* School Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1E3A5F', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {schoolInfo?.logo && (
            <img src={schoolInfo.logo} alt="School Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1E3A5F', letterSpacing: 1 }}>
              {schoolInfo?.name || 'School Name'}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{schoolInfo?.address || ''}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{schoolInfo?.phone || ''}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: '#0D9488', letterSpacing: 2, textTransform: 'uppercase' }}>
          Annual Report Card
        </div>
      </div>

      {/* Student Info */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                ['Student Name', student.name],
                ['Roll No', student.rollNo],
                ['Class / Section', `${student.className || ''} ${student.section || ''}`],
                ['Father Name', student.fatherName],
                ['Date of Birth', student.dob],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '3px 8px', fontWeight: 600, color: '#374151', width: 130 }}>{label}:</td>
                  <td style={{ padding: '3px 8px', color: '#1E3A5F', fontWeight: 500 }}>{value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{
          width: 80, height: 90, border: '2px solid #CBD5E1', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', background: '#F8FAFC', flexShrink: 0
        }}>
          {student.photo
            ? <img src={student.photo} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <User size={32} color="#CBD5E1" />
          }
        </div>
      </div>

      {/* Marks Table + Summary Side by Side */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1E3A5F', color: '#fff' }}>
                <th style={{ padding: '7px 10px', textAlign: 'left', border: '1px solid #1E3A5F' }}>Subject</th>
                {examColumns.map(col => (
                  <th key={col.id} style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F', minWidth: 80 }}>
                    <div>{col.title}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>{col.totalMarks} marks</div>
                  </th>
                ))}
                <th style={{ padding: '7px 8px', textAlign: 'center', border: '1px solid #1E3A5F', background: '#0D9488' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(student.subjects || []).map((subj, si) => (
                <tr key={si} style={{ background: si % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1E3A5F', border: '1px solid #E2E8F0' }}>
                    {subj.subjectName}
                  </td>
                  {examColumns.map(col => {
                    const mark = subj.examMarks?.[col.id];
                    const isAbsent = mark?.isAbsent;
                    const obtained = mark?.obtained ?? '—';
                    const total = col.totalMarks;
                    return (
                      <td key={col.id} style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                        {isAbsent
                          ? <span style={{ color: '#94a3b8', fontSize: 11 }}>ABS</span>
                          : <span>
                            <span style={{ fontWeight: 700, color: (mark?.obtained / total) >= 0.4 ? '#15803D' : '#B91C1C' }}>
                              {obtained}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: 10 }}>/{total}</span>
                          </span>
                        }
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #E2E8F0', fontWeight: 700, color: '#0D9488' }}>
                    {subj.totalObtained}/{subj.totalMarks}
                  </td>
                </tr>
              ))}
              {showAttendance && (
                <tr style={{ background: '#FEF9C3' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#92400E', border: '1px solid #E2E8F0' }}>
                    Attendance
                  </td>
                  {examColumns.map(col => (
                    <td key={col.id} style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #E2E8F0', color: '#64748B', fontSize: 11 }}>
                      —
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #E2E8F0', fontWeight: 600, color: '#92400E' }}>
                    {student.attendance ? `${student.attendance.present}/${student.attendance.total}` : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Summary Panel */}
        <div style={{
          width: 160, flexShrink: 0, border: '2px solid #1E3A5F', borderRadius: 6,
          padding: 12, display: 'flex', flexDirection: 'column', gap: 8
        }}>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 12, color: '#1E3A5F', borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 4 }}>
            Annual Summary
          </div>
          {[
            ['Total Marks', totalMarks],
            ['Total Obtained', totalObtained],
            ['Annual %', `${annualPct}%`],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1E3A5F' }}>{val}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Annual Grade</div>
            <div style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 4,
              fontWeight: 800, fontSize: 16, color: gc.c, background: gc.bg, marginTop: 2
            }}>{annualGrade}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Division</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>{division}</div>
          </div>
          {student.position && (
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Position in Class</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0D9488' }}>{student.position}</div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 140, borderTop: '1px solid #374151', paddingTop: 4, fontSize: 12, color: '#374151', fontWeight: 600 }}>
            Class Teacher
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Result declared on: {new Date().toLocaleDateString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 140, borderTop: '1px solid #374151', paddingTop: 4, fontSize: 12, color: '#374151', fontWeight: 600 }}>
            Principal
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnualReportCardPage() {
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('class'); // 'class' | 'individual'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const printRef = useRef();

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/settings/sessions').then(r => r.data.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const selectedClass = classes.find(c => c.id === parseInt(classId));
  const sections = selectedClass?.sections || [];

  const { data: cumulativeData, isLoading } = useQuery({
    queryKey: ['cumulative', sessionId, classId],
    queryFn: () => api.get(`/exams/cumulative?sessionId=${sessionId}&classId=${classId}`).then(r => r.data.data),
    enabled: !!(sessionId && classId),
  });

  const students = cumulativeData?.students || [];
  const examColumns = cumulativeData?.exams || [];
  const schoolInfo = cumulativeData?.schoolInfo || {};

  const filtered = students.filter(s => {
    const matchSection = !sectionId || s.sectionId === parseInt(sectionId);
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || String(s.rollNo).includes(search);
    return matchSection && matchSearch;
  });

  const handlePrintIndividual = (student) => {
    setSelectedStudent(student);
    setView('individual');
    setTimeout(() => window.print(), 300);
  };

  const handleBulkPrint = () => {
    window.print();
  };

  return (
    <div className="page-content fade-in">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .report-card-print { page-break-after: always; border: 2px solid #1E3A5F !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/exams" className="btn btn-outline btn-sm btn-icon"><ArrowLeft size={15} /></Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Annual Report Card</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Cumulative performance across all exams</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showAttendance} onChange={e => setShowAttendance(e.target.checked)} />
            Show Attendance
          </label>
          {students.length > 0 && (
            <button className="btn btn-teal btn-sm" onClick={handleBulkPrint}>
              <Printer size={14} /> Bulk Print All
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="no-print card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Session</label>
            <div style={{ position: 'relative' }}>
              <select
                className="form-select"
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
                style={{ paddingRight: 28 }}
              >
                <option value="">Select Session</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Class</label>
            <div style={{ position: 'relative' }}>
              <select className="form-select" value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); }}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
            </div>
          </div>
          {sections.length > 0 && (
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Section</label>
              <div style={{ position: 'relative' }}>
                <select className="form-select" value={sectionId} onChange={e => setSectionId(e.target.value)}>
                  <option value="">All Sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
              </div>
            </div>
          )}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Search Student</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="form-input"
                placeholder="Name or Roll No..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>
        </div>

        {students.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className={`btn btn-sm ${view === 'class' ? 'btn-teal' : 'btn-outline'}`}
              onClick={() => setView('class')}
            >
              <Users size={13} /> Class View
            </button>
            <button
              className={`btn btn-sm ${view === 'individual' ? 'btn-teal' : 'btn-outline'}`}
              onClick={() => { setView('individual'); setSelectedStudent(filtered[0] || null); }}
            >
              <User size={13} /> Individual View
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="loading-center no-print"><div className="spinner" /></div>
      )}

      {/* Empty state */}
      {!sessionId || !classId ? (
        <div className="card no-print" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, color: '#1E3A5F', fontSize: 16, marginBottom: 6 }}>Select Session & Class</div>
          <div style={{ color: '#64748B', fontSize: 13 }}>Choose a session and class to generate annual report cards.</div>
        </div>
      ) : null}

      {/* Class View */}
      {!isLoading && students.length > 0 && view === 'class' && (
        <div className="no-print card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} color="#0D9488" />
            <span style={{ fontWeight: 700, color: '#1E3A5F' }}>Class Results — {filtered.length} Students</span>
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Total Obtained</th>
                  <th>Total Marks</th>
                  <th>Annual %</th>
                  <th>Grade</th>
                  <th>Division</th>
                  <th>Position</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const totalObtained = s.subjects?.reduce((sum, sub) => sum + (sub.totalObtained || 0), 0) || 0;
                  const totalMarks = s.subjects?.reduce((sum, sub) => sum + (sub.totalMarks || 0), 0) || 0;
                  const pct = totalMarks > 0 ? Math.round((totalObtained / totalMarks) * 100) : 0;
                  const grade = calcGrade(pct);
                  const division = calcDivision(pct);
                  const gc = gradeColor(grade);
                  return (
                    <tr key={s.id}>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: '#64748B' }}>{s.rollNo}</td>
                      <td style={{ fontWeight: 700, color: '#1E3A5F' }}>{s.name}</td>
                      <td style={{ fontSize: 12, color: '#64748B' }}>{s.section || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#0D9488' }}>{totalObtained}</td>
                      <td>{totalMarks}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar" style={{ width: 60, display: 'inline-block' }}>
                            <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 40 ? '#0D9488' : '#DC2626' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 13, color: gc.c, background: gc.bg, padding: '3px 8px', borderRadius: 4 }}>
                          {grade}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#374151' }}>{division}</td>
                      <td style={{ fontWeight: 700, color: '#0D9488', fontSize: 15 }}>{s.position || idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setSelectedStudent(s); setView('individual'); }}
                          >
                            <User size={12} /> View
                          </button>
                          <button
                            className="btn btn-teal btn-sm"
                            onClick={() => handlePrintIndividual(s)}
                          >
                            <Printer size={12} /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual View */}
      {view === 'individual' && (
        <div>
          {/* Student Selector (no-print) */}
          {filtered.length > 1 && (
            <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {filtered.map(s => (
                <button
                  key={s.id}
                  className={`btn btn-sm ${selectedStudent?.id === s.id ? 'btn-teal' : 'btn-outline'}`}
                  onClick={() => setSelectedStudent(s)}
                >
                  {s.rollNo}. {s.name}
                </button>
              ))}
            </div>
          )}

          {/* Print controls */}
          <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-teal btn-sm" onClick={() => window.print()}>
              <Printer size={14} /> Print This Card
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setView('class')}>
              <Users size={14} /> Back to Class View
            </button>
          </div>

          <div className="print-area" ref={printRef}>
            {selectedStudent ? (
              <IndividualReportCard
                student={selectedStudent}
                examColumns={examColumns}
                schoolInfo={schoolInfo}
                showAttendance={showAttendance}
              />
            ) : (
              <div className="no-print card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
                <div style={{ fontWeight: 700, color: '#1E3A5F' }}>No student selected</div>
                <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Select a student from the list above.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk print area */}
      {view === 'class' && students.length > 0 && (
        <div className="print-area" style={{ display: 'none' }} ref={printRef}>
          {filtered.map(s => (
            <IndividualReportCard
              key={s.id}
              student={s}
              examColumns={examColumns}
              schoolInfo={schoolInfo}
              showAttendance={showAttendance}
            />
          ))}
        </div>
      )}
    </div>
  );
}
