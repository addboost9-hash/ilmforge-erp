/**
 * IlmForge — Test Management Page
 * Manages smaller assessments (Weekly, Monthly, Quiz, Chapter tests)
 * Tabs: Test List | Marks Entry | Tabulation Sheet | Position Holders
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList, BookOpen, BarChart2, Trophy,
  Printer, Save, Plus, GraduationCap, Trash2,
  Edit3, Eye, CheckSquare, Square, ChevronDown,
} from 'lucide-react';
import api from '../../api/client';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

/* ─── Constants ──────────────────────────────────────── */
const TABS = [
  { id: 'list',      label: 'Test List',        Icon: ClipboardList },
  { id: 'marks',     label: 'Marks Entry',       Icon: BookOpen      },
  { id: 'tabulation',label: 'Tabulation Sheet',  Icon: BarChart2     },
  { id: 'positions', label: 'Position Holders',  Icon: Trophy        },
];

const TEST_TYPES = ['Weekly', 'Monthly', 'Quiz', 'Chapter'];

const LS_KEY = 'ilmforge_tests';

/* ─── Grade calculator ───────────────────────────────── */
const calcGrade = (obtained, total) => {
  if (!total || obtained === '' || obtained === null || obtained === undefined) return '—';
  const pct = (parseFloat(obtained) / parseFloat(total)) * 100;
  if (isNaN(pct)) return '—';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const gradeColor = (grade) => {
  if (!grade || grade === '—') return '#6B7280';
  if (grade === 'A+') return '#059669';
  if (grade === 'A')  return '#10B981';
  if (grade === 'B+') return '#3B82F6';
  if (grade === 'B')  return '#6366F1';
  if (grade === 'C')  return '#F59E0B';
  if (grade === 'D')  return '#F97316';
  return '#EF4444';
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const printDateTime = () =>
  new Date().toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ─── Blank test form ────────────────────────────────── */
const blankForm = () => ({
  title: '', subject: '', classId: '', sectionId: '', date: '', totalMarks: '', testType: 'Weekly',
});

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function TestManagementPage() {
  const [activeTab, setActiveTab] = useState('list');

  /* ── localStorage subjects ── */
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ilmforge_subjects') || localStorage.getItem('subjects');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) { setSubjects(parsed); return; }
        if (parsed?.data && Array.isArray(parsed.data)) { setSubjects(parsed.data); return; }
      }
    } catch {}
    setSubjects([
      { id: 1, name: 'Mathematics' }, { id: 2, name: 'English' }, { id: 3, name: 'Science' },
      { id: 4, name: 'Social Studies' }, { id: 5, name: 'Urdu' }, { id: 6, name: 'Islamiyat' },
      { id: 7, name: 'Computer' }, { id: 8, name: 'Physics' }, { id: 9, name: 'Chemistry' },
    ]);
  }, []);

  /* ── Tests localStorage ── */
  const [tests, setTests] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setTests(JSON.parse(raw));
    } catch {}
  }, []);
  const saveTests = useCallback((updated) => {
    setTests(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  }, []);

  /* ── Classes API ── */
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });

  return (
    <div className="page-content fade-up">

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <ClipboardList size={22} color="#0F766E" />
          Test Management
        </h1>
        <p className="page-subtitle">Manage class tests, enter marks, view tabulation and position holders</p>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: 22 }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`tab-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} style={{ marginRight: 6 }} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Panels ── */}
      {activeTab === 'list'       && <TestListTab       tests={tests} saveTests={saveTests} subjects={subjects} classes={classes} />}
      {activeTab === 'marks'      && <MarksEntryTab     tests={tests} saveTests={saveTests} classes={classes} />}
      {activeTab === 'tabulation' && <TabulationTab     tests={tests} classes={classes} />}
      {activeTab === 'positions'  && <PositionHoldersTab tests={tests} classes={classes} />}

    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 1 — TEST LIST
════════════════════════════════════════════════════ */
function TestListTab({ tests, saveTests, subjects, classes }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const selectedClass = classes.find(c => c.id === parseInt(form.classId));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim() || !form.classId || !form.totalMarks || !form.date) {
      setError('Title, Class, Date and Total Marks are required.'); return;
    }
    setError('');
    if (editId) {
      saveTests(tests.map(t => t.id === editId ? { ...t, ...form, id: editId } : t));
    } else {
      const newTest = { ...form, id: Date.now(), marks: {} };
      saveTests([...tests, newTest]);
    }
    setForm(blankForm());
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (t) => {
    setForm({ title: t.title, subject: t.subject, classId: t.classId, sectionId: t.sectionId, date: t.date, totalMarks: t.totalMarks, testType: t.testType });
    setEditId(t.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this test and all its marks?')) return;
    saveTests(tests.filter(t => t.id !== id));
  };

  const getClassName = (classId) => classes.find(c => c.id === parseInt(classId))?.name || classId;

  return (
    <div>
      {/* Add / Edit Form */}
      {showForm ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F4C45', margin: 0 }}>
              {editId ? 'Edit Test' : 'Add New Test'}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setEditId(null); setForm(blankForm()); setError(''); }}>
              Cancel
            </button>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {/* Title */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Test Title *</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Weekly Test 1" />
            </div>

            {/* Subject */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject</label>
              <select className="form-select" value={form.subject} onChange={e => set('subject', e.target.value)}>
                <option value="">Select Subject</option>
                {subjects.map((s, i) => (
                  <option key={s.id || i} value={s.name || s}>{s.name || s}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class *</label>
              <select className="form-select" value={form.classId} onChange={e => { set('classId', e.target.value); set('sectionId', ''); }}>
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Section</label>
              <select className="form-select" value={form.sectionId} onChange={e => set('sectionId', e.target.value)} disabled={!selectedClass?.sections?.length}>
                <option value="">All Sections</option>
                {(selectedClass?.sections || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Test Date *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>

            {/* Total Marks */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Total Marks *</label>
              <input className="form-input" type="number" min="1" value={form.totalMarks} onChange={e => set('totalMarks', e.target.value)} placeholder="e.g. 50" />
            </div>

            {/* Test Type */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Test Type</label>
              <select className="form-select" value={form.testType} onChange={e => set('testType', e.target.value)}>
                {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn btn-teal" onClick={handleSubmit}>
              <Save size={14} /> {editId ? 'Update Test' : 'Add Test'}
            </button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditId(null); setForm(blankForm()); setError(''); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-teal" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Test
          </button>
        </div>
      )}

      {/* Tests Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {tests.length === 0 ? (
          <div className="empty-state" style={{ padding: 56 }}>
            <div className="empty-state-icon"><ClipboardList size={48} style={{ opacity: 0.18 }} /></div>
            <div className="empty-state-text">No tests added yet</div>
            <div className="empty-state-sub">Click "Add Test" to create your first test</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Class</th>
                  <th>Date</th>
                  <th>Total Marks</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t, i) => (
                  <tr key={t.id}>
                    <td style={{ color: '#9CA3AF', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{t.title}</td>
                    <td style={{ color: '#374151' }}>{t.subject || '—'}</td>
                    <td style={{ color: '#374151' }}>
                      {getClassName(t.classId)}
                      {t.sectionId ? <span style={{ color: '#9CA3AF', marginLeft: 4 }}>
                        {(classes.find(c => c.id === parseInt(t.classId))?.sections || []).find(s => s.id === parseInt(t.sectionId))?.name || ''}
                      </span> : ''}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#374151' }}>{fmtDate(t.date)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0F766E' }}>{t.totalMarks}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 9px', borderRadius: 99,
                        fontSize: 11.5, fontWeight: 700,
                        background: t.testType === 'Quiz' ? '#EFF6FF' : t.testType === 'Monthly' ? '#F0FDF4' : t.testType === 'Chapter' ? '#FFF7ED' : '#F5F3FF',
                        color: t.testType === 'Quiz' ? '#3B82F6' : t.testType === 'Monthly' ? '#059669' : t.testType === 'Chapter' ? '#F97316' : '#7C3AED',
                      }}>
                        {t.testType}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          title="Enter Marks"
                          onClick={() => { window.dispatchEvent(new CustomEvent('ilmforge-test-marks', { detail: t.id })); }}
                          style={{ padding: '3px 8px' }}
                        >
                          <BookOpen size={12} /> Marks
                        </button>
                        <button className="btn btn-outline btn-sm" title="Edit" onClick={() => handleEdit(t)} style={{ padding: '3px 7px' }}>
                          <Edit3 size={12} />
                        </button>
                        <button className="btn btn-sm" title="Delete" onClick={() => handleDelete(t.id)}
                          style={{ padding: '3px 7px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 2 — MARKS ENTRY
════════════════════════════════════════════════════ */
function MarksEntryTab({ tests, saveTests, classes }) {
  const [selectedTestId, setSelectedTestId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [localMarks, setLocalMarks] = useState({});
  const [saved, setSaved] = useState(false);

  const selectedTest = tests.find(t => t.id === parseInt(selectedTestId) || t.id === selectedTestId);
  const filterClass  = classes.find(c => c.id === parseInt(filterClassId));

  /* Pre-fill marks from test when test changes */
  useEffect(() => {
    if (selectedTest) {
      setLocalMarks(selectedTest.marks || {});
      setSaved(false);
      if (!filterClassId && selectedTest.classId) setFilterClassId(String(selectedTest.classId));
    }
  }, [selectedTestId]); // eslint-disable-line

  /* Students query */
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-marks', filterClassId, filterSectionId],
    queryFn: () => api.get('/students', {
      params: { classId: filterClassId || undefined, sectionId: filterSectionId || undefined, status: 'active', limit: 500 },
    }).then(r => r.data.data || []),
    enabled: !!filterClassId,
  });

  const setMark = (studentId, field, value) => {
    setSaved(false);
    setLocalMarks(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [field]: value } }));
  };

  const handleSaveAll = () => {
    if (!selectedTest) return;
    const updated = tests.map(t => t.id === selectedTest.id ? { ...t, marks: { ...t.marks, ...localMarks } } : t);
    saveTests(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      {/* Selectors */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Test *</label>
            <select className="form-select" value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)}>
              <option value="">-- Select Test --</option>
              {tests.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.testType}) — {t.totalMarks} Marks</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={filterClassId} onChange={e => { setFilterClassId(e.target.value); setFilterSectionId(''); }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={filterSectionId} onChange={e => setFilterSectionId(e.target.value)} disabled={!filterClass?.sections?.length}>
              <option value="">All Sections</option>
              {(filterClass?.sections || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {selectedTest && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#F0FDF4', borderRadius: 6, border: '1px solid #BBF7D0', fontSize: 13, color: '#0F766E', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span><strong>Test:</strong> {selectedTest.title}</span>
            <span><strong>Type:</strong> {selectedTest.testType}</span>
            <span><strong>Date:</strong> {fmtDate(selectedTest.date)}</span>
            <span><strong>Total Marks:</strong> {selectedTest.totalMarks}</span>
            <span><strong>Subject:</strong> {selectedTest.subject || '—'}</span>
          </div>
        )}
      </div>

      {/* Marks Table */}
      {!selectedTest || !filterClassId ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 52 }}>
            <div className="empty-state-icon"><BookOpen size={48} style={{ opacity: 0.18 }} /></div>
            <div className="empty-state-text">Select a test and class to enter marks</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon"><GraduationCap size={40} style={{ opacity: 0.18 }} /></div>
            <div className="empty-state-text">No students found</div>
            <div className="empty-state-sub">Try a different class or section</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F4C45' }}>
              {students.length} Students
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {saved && (
                <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
                  Marks saved successfully!
                </span>
              )}
              <button className="btn btn-teal" onClick={handleSaveAll}>
                <Save size={14} /> Save All Marks
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No.</th>
                  <th>Student Name</th>
                  <th style={{ textAlign: 'center' }}>Absent</th>
                  <th style={{ textAlign: 'center' }}>Obtained Marks<br /><span style={{ fontWeight: 400, opacity: 0.7 }}>/ {selectedTest.totalMarks}</span></th>
                  <th style={{ textAlign: 'center' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const mData   = localMarks[s.id] || {};
                  const absent  = mData.absent  || false;
                  const obtained = mData.obtained !== undefined ? mData.obtained : '';
                  const grade   = absent ? 'ABS' : calcGrade(obtained, selectedTest.totalMarks);
                  return (
                    <tr key={s.id}>
                      <td style={{ color: '#9CA3AF', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700 }}>
                        {s.rollNo || s.admissionNo || `ST-${String(s.id).padStart(4, '0')}`}
                      </td>
                      <td style={{ fontWeight: 600, color: '#111827' }}>{s.name}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setMark(s.id, 'absent', !absent)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: absent ? '#EF4444' : '#D1D5DB', display: 'inline-flex' }}
                        >
                          {absent ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {absent ? (
                          <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 13 }}>Absent</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max={selectedTest.totalMarks}
                            value={obtained}
                            onChange={e => {
                              const v = e.target.value;
                              if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= parseFloat(selectedTest.totalMarks))) {
                                setMark(s.id, 'obtained', v);
                              }
                            }}
                            placeholder="0"
                            style={{
                              width: 80, textAlign: 'center', padding: '5px 8px',
                              border: '1.5px solid #D1D5DB', borderRadius: 6,
                              fontSize: 13, fontWeight: 600, outline: 'none',
                              background: '#FAFAFA',
                            }}
                            onFocus={e => e.target.style.borderColor = '#0F766E'}
                            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                          />
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                          fontSize: 12, fontWeight: 800,
                          background: absent ? '#FEF2F2' : '#F0FDF4',
                          color: absent ? '#EF4444' : gradeColor(grade),
                        }}>
                          {grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', textAlign: 'right' }}>
            <button className="btn btn-teal" onClick={handleSaveAll}>
              <Save size={14} /> Save All Marks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 3 — TABULATION SHEET
════════════════════════════════════════════════════ */
function TabulationTab({ tests, classes }) {
  const [classId, setClassId]     = useState('');
  const [sectionId, setSectionId] = useState('');
  const [testId, setTestId]       = useState('');

  const selectedClass   = classes.find(c => c.id === parseInt(classId));
  const selectedSection = selectedClass?.sections?.find(s => s.id === parseInt(sectionId));
  const selectedTest    = tests.find(t => t.id === parseInt(testId) || t.id === testId);

  /* Students for the selected class/section */
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-tab', classId, sectionId],
    queryFn: () => api.get('/students', {
      params: { classId: classId || undefined, sectionId: sectionId || undefined, status: 'active', limit: 500 },
    }).then(r => r.data.data || []),
    enabled: !!classId,
  });

  /* Filter tests for selected class */
  const classTests = tests.filter(t =>
    (!classId || String(t.classId) === String(classId)) &&
    (!sectionId || !t.sectionId || String(t.sectionId) === String(sectionId))
  );

  /* Build tabulation rows */
  const rows = students.map(s => {
    const marks   = selectedTest?.marks?.[s.id] || {};
    const absent  = marks.absent;
    const obtained = absent ? 0 : (parseFloat(marks.obtained) || 0);
    const total    = parseFloat(selectedTest?.totalMarks) || 0;
    const pct      = total > 0 ? ((obtained / total) * 100).toFixed(1) : '0.0';
    const grade    = absent ? 'ABS' : calcGrade(obtained, total);
    return { ...s, obtained, absent, pct, grade };
  });

  /* Position ranking (sort by obtained desc) */
  const ranked = [...rows]
    .filter(r => !r.absent && r.obtained > 0)
    .sort((a, b) => b.obtained - a.obtained);

  const getPosition = (studentId) => {
    const idx = ranked.findIndex(r => r.id === studentId);
    return idx >= 0 ? idx + 1 : '—';
  };

  /* Print handler */
  const handlePrint = () => {
    if (!students.length || !selectedTest) return;
    const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';
    const schoolLogo = localStorage.getItem('schoolLogoPreview') || '';
    const className  = selectedClass?.name || `Class ${classId}`;
    const secName    = selectedSection?.name || '';
    const watermarkCss = buildWatermarkCss({ mode: 'a4', color: '#0F4C45' });
    const watermarkHtml = buildWatermarkMarkup({ logo: schoolLogo, text: schoolName, imgAlt: 'School watermark' });

    const headerRow = `<tr style="background:#0F766E;color:#fff;">
      <th style="padding:6px 8px;border:1px solid #0F766E;font-size:10pt;">Roll No</th>
      <th style="padding:6px 8px;border:1px solid #0F766E;font-size:10pt;">Student Name</th>
      <th style="padding:6px 8px;border:1px solid #0F766E;font-size:10pt;">Obtained / ${selectedTest.totalMarks}</th>
      <th style="padding:6px 8px;border:1px solid #0F766E;font-size:10pt;">Percentage</th>
      <th style="padding:6px 8px;border:1px solid #0F766E;font-size:10pt;">Grade</th>
      <th style="padding:6px 8px;border:1px solid #0F766E;font-size:10pt;">Position</th>
    </tr>`;

    const bodyRows = rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#F9FAFB'};">
        <td style="padding:5px 8px;border:1px solid #E5E7EB;text-align:center;font-family:monospace;">${r.rollNo || r.admissionNo || `ST-${String(r.id).padStart(4,'0')}`}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;font-weight:600;">${r.name}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;text-align:center;font-weight:700;color:#0F766E;">${r.absent ? 'Absent' : r.obtained}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;text-align:center;">${r.absent ? '—' : r.pct + '%'}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;text-align:center;font-weight:700;">${r.grade}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;text-align:center;font-weight:700;color:#7C3AED;">${r.absent ? '—' : getPosition(r.id)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Tabulation Sheet</title>
      <style>* { box-sizing:border-box; margin:0; padding:0; } body { font-family:Arial,sans-serif; padding:12mm; position:relative; overflow:hidden; }
      ${watermarkCss}
      button, div, table { position:relative; z-index:1; }
      @media print { @page { size:A4 landscape; margin:8mm; } button { display:none!important; } }
      </style></head><body>
      ${watermarkHtml}
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:17pt;font-weight:900;color:#0F4C45;">${schoolName}</div>
        <div style="font-size:12pt;font-weight:700;margin-top:4px;">Tabulation Sheet — ${selectedTest.title}</div>
        <div style="font-size:10.5pt;color:#6B7280;margin-top:2px;">Class: ${className}${secName ? ' — ' + secName : ''} &nbsp;|&nbsp; Date: ${fmtDate(selectedTest.date)} &nbsp;|&nbsp; Printed: ${printDateTime()}</div>
      </div>
      <button onclick="window.print()" style="margin-bottom:12px;background:#0F766E;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:12px;">Print</button>
      <table style="width:100%;border-collapse:collapse;"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>
      </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setTestId(''); }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!selectedClass?.sections?.length}>
              <option value="">All Sections</option>
              {(selectedClass?.sections || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Test *</label>
            <select className="form-select" value={testId} onChange={e => setTestId(e.target.value)}>
              <option value="">-- Select Test --</option>
              {classTests.map(t => <option key={t.id} value={t.id}>{t.title} ({t.testType})</option>)}
            </select>
          </div>

          {selectedTest && students.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-teal" onClick={handlePrint} style={{ height: 38 }}>
                <Printer size={14} /> Print Sheet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {!classId || !testId ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 52 }}>
            <div className="empty-state-icon"><BarChart2 size={48} style={{ opacity: 0.18 }} /></div>
            <div className="empty-state-text">Select class and test to view tabulation</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F4C45' }}>
                {selectedTest?.title} — Tabulation Sheet
              </span>
              <span style={{ fontSize: 12.5, color: '#6B7280', marginLeft: 12 }}>
                {selectedClass?.name}{selectedSection ? ` — ${selectedSection.name}` : ''} &nbsp;|&nbsp; {students.length} students
              </span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>
              <Printer size={13} /> Print
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th style={{ textAlign: 'center' }}>Obtained / {selectedTest?.totalMarks}</th>
                  <th style={{ textAlign: 'center' }}>Percentage</th>
                  <th style={{ textAlign: 'center' }}>Grade</th>
                  <th style={{ textAlign: 'center' }}>Position</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 700 }}>
                      {r.rollNo || r.admissionNo || `ST-${String(r.id).padStart(4, '0')}`}
                    </td>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{r.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: r.absent ? '#EF4444' : '#0F766E' }}>
                      {r.absent ? 'Absent' : r.obtained}
                    </td>
                    <td style={{ textAlign: 'center', color: '#374151' }}>{r.absent ? '—' : `${r.pct}%`}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 99, fontSize: 12, fontWeight: 800, background: '#F0FDF4', color: gradeColor(r.grade) }}>
                        {r.grade}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#7C3AED' }}>
                      {r.absent ? '—' : getPosition(r.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
            {(() => {
              const present  = rows.filter(r => !r.absent && r.obtained > 0);
              const avgPct   = present.length > 0 ? (present.reduce((s, r) => s + parseFloat(r.pct), 0) / present.length).toFixed(1) : '0.0';
              const highest  = present.length > 0 ? Math.max(...present.map(r => r.obtained)) : 0;
              const passed   = present.filter(r => parseFloat(r.pct) >= 40).length;
              return (
                <>
                  <span><strong style={{ color: '#0F766E' }}>Present:</strong> {present.length}</span>
                  <span><strong style={{ color: '#EF4444' }}>Absent:</strong> {rows.filter(r => r.absent).length}</span>
                  <span><strong style={{ color: '#3B82F6' }}>Average:</strong> {avgPct}%</span>
                  <span><strong style={{ color: '#F59E0B' }}>Highest:</strong> {highest}</span>
                  <span><strong style={{ color: '#059669' }}>Passed:</strong> {passed}</span>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB 4 — POSITION HOLDERS
════════════════════════════════════════════════════ */
function PositionHoldersTab({ tests, classes }) {
  const [classId,   setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [testId,    setTestId]    = useState('');

  const selectedClass   = classes.find(c => c.id === parseInt(classId));
  const selectedSection = selectedClass?.sections?.find(s => s.id === parseInt(sectionId));
  const selectedTest    = tests.find(t => t.id === parseInt(testId) || t.id === testId);

  const classTests = tests.filter(t =>
    (!classId   || String(t.classId)   === String(classId)) &&
    (!sectionId || !t.sectionId || String(t.sectionId) === String(sectionId))
  );

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-pos', classId, sectionId],
    queryFn: () => api.get('/students', {
      params: { classId: classId || undefined, sectionId: sectionId || undefined, status: 'active', limit: 500 },
    }).then(r => r.data.data || []),
    enabled: !!classId,
  });

  /* Build ranked list */
  const topStudents = (() => {
    if (!selectedTest || !students.length) return [];
    const total = parseFloat(selectedTest.totalMarks) || 0;
    return students
      .map(s => {
        const mData   = selectedTest.marks?.[s.id] || {};
        const absent  = mData.absent;
        const obtained = absent ? 0 : (parseFloat(mData.obtained) || 0);
        const pct      = total > 0 ? ((obtained / total) * 100).toFixed(1) : '0.0';
        const grade    = absent ? 'ABS' : calcGrade(obtained, total);
        return { ...s, obtained, absent, pct, grade, total };
      })
      .filter(s => !s.absent && s.obtained > 0)
      .sort((a, b) => b.obtained - a.obtained)
      .slice(0, 10);
  })();

  const rankColors = ['#F59E0B', '#94A3B8', '#CD7F32', '#0F766E', '#0F766E'];

  const handlePrint = () => {
    if (!topStudents.length) return;
    const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';
    const schoolLogo = localStorage.getItem('schoolLogoPreview') || '';
    const className  = selectedClass?.name || `Class ${classId}`;
    const watermarkCss = buildWatermarkCss({ mode: 'a4', color: '#0F4C45' });
    const watermarkHtml = buildWatermarkMarkup({ logo: schoolLogo, text: schoolName, imgAlt: 'School watermark' });

    const rows = topStudents.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#F9FAFB'};">
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:center;font-weight:900;font-size:14pt;color:${rankColors[Math.min(i,4)]};">${i + 1}</td>
        <td style="padding:8px;border:1px solid #E5E7EB;font-weight:700;font-size:11pt;">${s.name}</td>
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:center;font-family:monospace;font-size:10pt;">${s.rollNo || s.admissionNo || ''}</td>
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:center;font-size:11pt;">${className}</td>
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:center;font-weight:700;font-size:12pt;color:#0F766E;">${s.obtained} / ${s.total}</td>
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:center;font-size:11pt;">${s.pct}%</td>
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:center;font-weight:800;font-size:11pt;">${s.grade}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Position Holders</title>
      <style>* { box-sizing:border-box; margin:0; padding:0; } body { font-family:Arial,sans-serif; padding:12mm; position:relative; overflow:hidden; }
      ${watermarkCss}
      button, div, table { position:relative; z-index:1; }
      @media print { @page { size:A4 portrait; margin:8mm; } button { display:none!important; } }
      </style></head><body>
      ${watermarkHtml}
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:20pt;font-weight:900;color:#0F4C45;">${schoolName}</div>
        <div style="font-size:14pt;font-weight:800;margin-top:5px;">Position Holders — ${selectedTest?.title}</div>
        <div style="font-size:10.5pt;color:#6B7280;margin-top:3px;">Class: ${className} &nbsp;|&nbsp; Date: ${fmtDate(selectedTest?.date)} &nbsp;|&nbsp; Printed: ${printDateTime()}</div>
      </div>
      <button onclick="window.print()" style="margin-bottom:12px;background:#0F766E;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:12px;">Print Certificates</button>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0F766E;color:#fff;">
          <th style="padding:8px;border:1px solid #0F766E;font-size:11pt;">Rank</th>
          <th style="padding:8px;border:1px solid #0F766E;font-size:11pt;">Student Name</th>
          <th style="padding:8px;border:1px solid #0F766E;font-size:11pt;">Roll No</th>
          <th style="padding:8px;border:1px solid #0F766E;font-size:11pt;">Class</th>
          <th style="padding:8px;border:1px solid #0F766E;font-size:11pt;">Marks</th>
          <th style="padding:8px;border:1px solid #0F766E;font-size:11pt;">Percentage</th>
          <th style="padding:8px;border:1px solid #0F766E;font-size:11pt;">Grade</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class *</label>
            <select className="form-select" value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setTestId(''); }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Section</label>
            <select className="form-select" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!selectedClass?.sections?.length}>
              <option value="">All Sections</option>
              {(selectedClass?.sections || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Test *</label>
            <select className="form-select" value={testId} onChange={e => setTestId(e.target.value)}>
              <option value="">-- Select Test --</option>
              {classTests.map(t => <option key={t.id} value={t.id}>{t.title} ({t.testType})</option>)}
            </select>
          </div>

          {topStudents.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-teal" onClick={handlePrint} style={{ height: 38 }}>
                <Printer size={14} /> Print Certificates
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Position Holders */}
      {!classId || !testId ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 52 }}>
            <div className="empty-state-icon"><Trophy size={48} style={{ opacity: 0.18 }} /></div>
            <div className="empty-state-text">Select class and test to view position holders</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : topStudents.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon"><Trophy size={40} style={{ opacity: 0.2 }} /></div>
            <div className="empty-state-text">No marks entered yet for this test</div>
            <div className="empty-state-sub">Enter marks in the Marks Entry tab first</div>
          </div>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {topStudents.length >= 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {[1, 0, 2].map((idx) => {
                const s = topStudents[idx];
                if (!s) return null;
                const rank   = idx + 1;
                const medal  = rank === 1 ? '#F59E0B' : rank === 2 ? '#94A3B8' : '#CD7F32';
                const height = rank === 1 ? 120 : rank === 2 ? 100 : 88;
                return (
                  <div key={s.id} style={{
                    textAlign: 'center', width: 160,
                    background: '#fff', borderRadius: 12, padding: '16px 12px',
                    border: `2px solid ${medal}40`,
                    boxShadow: `0 4px 20px ${medal}25`,
                    order: rank === 1 ? 2 : rank === 2 ? 1 : 3,
                    paddingTop: height / 4,
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3, lineHeight: 1.3 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                      {s.rollNo || s.admissionNo || ''}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: medal }}>{s.obtained}/{s.total}</div>
                    <div style={{ fontSize: 12, color: '#374151' }}>{s.pct}%</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 99, fontSize: 12, fontWeight: 800, background: '#F0FDF4', color: gradeColor(s.grade) }}>
                        {s.grade}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F4C45' }}>
                Top {topStudents.length} Position Holders
              </span>
              <button className="btn btn-outline btn-sm" onClick={handlePrint}>
                <Printer size={13} /> Print Certificates
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Rank</th>
                    <th>Student Name</th>
                    <th>Roll No</th>
                    <th>Class</th>
                    <th style={{ textAlign: 'center' }}>Marks</th>
                    <th style={{ textAlign: 'center' }}>Percentage</th>
                    <th style={{ textAlign: 'center' }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {topStudents.map((s, i) => {
                    const rank  = i + 1;
                    const medal = rank === 1 ? '#F59E0B' : rank === 2 ? '#94A3B8' : rank === 3 ? '#CD7F32' : '#0F766E';
                    return (
                      <tr key={s.id}>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: medal, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            {rank <= 3 && (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉')}
                            <span style={{ fontSize: 13, color: medal }}>{rank > 3 ? `#${rank}` : ''}</span>
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#111827' }}>{s.name}</td>
                        <td style={{ fontFamily: 'monospace', color: '#0F766E', fontWeight: 600 }}>
                          {s.rollNo || s.admissionNo || `ST-${String(s.id).padStart(4, '0')}`}
                        </td>
                        <td style={{ color: '#374151' }}>
                          {selectedClass?.name}
                          {selectedSection ? ` — ${selectedSection.name}` : ''}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: medal, fontSize: 14 }}>
                          {s.obtained} <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11 }}>/ {s.total}</span>
                        </td>
                        <td style={{ textAlign: 'center', color: '#374151', fontWeight: 600 }}>{s.pct}%</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 800, background: '#F0FDF4', color: gradeColor(s.grade) }}>
                            {s.grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
