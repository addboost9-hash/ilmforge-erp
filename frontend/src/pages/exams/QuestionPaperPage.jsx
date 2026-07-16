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

const QUESTION_TYPES = [
  'Match Columns', 'True/False', 'MCQ', 'Fill in Blanks', 'Comprehension',
  'Word Sentences', 'Word Opposite', 'Singular/Plural', 'Word Synonyms',
  'Q&A', 'Stories', 'Essays', 'Letters', 'Applications',
];

function printPaper(paper, questions, schoolName) {
  const questionsHtml = questions.map((q, i) => {
    const opts = q.options && q.options.length > 0
      ? `<div style="margin-top:4px">${q.options.map((o, oi) => `<span style="margin-right:18px">${String.fromCharCode(65+oi)}) ${o}</span>`).join('')}</div>`
      : '';
    return `<div style="margin-bottom:14px"><strong>Q${i+1}.</strong> (${q.marks || 2} marks) ${q.text}${opts}</div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${paper.title}</title>
  <style>body{font-family:Arial,sans-serif;margin:30px;color:#1a1a1a}h1{color:#1B2F6E;text-align:center}h2{text-align:center;color:#374151}
  .header{border-bottom:2px solid #1B2F6E;padding-bottom:12px;margin-bottom:20px;text-align:center}
  .info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px}
  @media print{button{display:none}}</style></head>
  <body>
    <div class="header"><h1>${schoolName || 'School Name'}</h1><h2>${paper.title}</h2></div>
    <div class="info">
      <span>Class: ${paper.className || '-'}</span>
      <span>Subject: ${paper.subjectName || '-'}</span>
      <span>Total Marks: ${paper.totalMarks || 100}</span>
      <span>Time: ${paper.duration || 60} min</span>
    </div>
    <hr/>
    <div style="margin-top:16px">${questionsHtml}</div>
    <button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#1B2F6E;color:#fff;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600">Print</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

function printBankPaper(paper, customize, schoolName) {
  const meta = paper.meta || {};
  const qTypes = meta.questionTypes || [];
  let objHtml = '', subjHtml = '';

  qTypes.forEach((qt, i) => {
    const row = `<div style="margin-bottom:18px">
      <strong>Q${i+1}. ${qt.type}</strong>
      ${qt.instruction ? `<em style="margin-left:10px;color:#555">(${qt.instruction})</em>` : ''}
      <div style="margin-top:8px;padding:12px;border:1px dashed #ccc;border-radius:6px;background:#fafafa;min-height:40px;color:#888;font-size:12px">Answer space</div>
    </div>`;
    if (['MCQ','True/False','Fill in Blanks','Match Columns'].includes(qt.type)) {
      objHtml += row;
    } else {
      subjHtml += row;
    }
  });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${paper.displayTitle || paper.title}</title>
  <style>body{font-family:Arial,sans-serif;margin:30px;color:#1a1a1a}
  h1,h2{color:#1B2F6E;text-align:center}
  .section-head{background:#1B2F6E;color:#fff;padding:8px 16px;border-radius:6px;margin:20px 0 12px;font-weight:700}
  .info-bar{display:flex;justify-content:space-between;border:1px solid #ddd;padding:8px 14px;border-radius:6px;font-size:13px;margin-bottom:16px}
  @media print{button{display:none}}</style></head>
  <body>
    <h1>${schoolName || 'School Name'}</h1>
    <h2>${paper.displayTitle || paper.title}</h2>
    ${customize?.instructions ? `<p style="text-align:center;color:#555;font-style:italic">${customize.instructions}</p>` : ''}
    <div class="info-bar">
      <span>Class: ${paper.className || '-'}</span>
      <span>Subject: ${meta.subject || '-'}</span>
      <span>Type: ${meta.paperType || '-'}</span>
    </div>
    ${objHtml ? `<div class="section-head">${customize?.objectiveHeading || 'OBJECTIVE PART'} — ${meta.objectiveMarks || 0} Marks | Time: ${meta.objectiveTime || 0} min</div>${objHtml}` : ''}
    ${subjHtml ? `<div class="section-head">${customize?.subjectiveHeading || 'SUBJECTIVE PART'} — ${meta.subjectiveMarks || 0} Marks | Time: ${meta.subjectiveTime || 0} min</div>${subjHtml}` : ''}
    <button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#1B2F6E;color:#fff;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600">Print</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=1000,height=800');
  win.document.write(html);
  win.document.close();
}

/* ── Make Paper Modal ── */
function MakePaperModal({ classItem, sectionItem, allSubjects, onClose, onGenerate }) {
  // Filter subjects for this class, or show all if no class-specific subjects
  const subjects = allSubjects.filter(s => !s.classId || String(s.classId) === String(classItem?.id));
  const displaySubjects = subjects.length > 0 ? subjects : allSubjects;
  const [form, setForm] = useState({
    subjectId: '', units: '', paperType: 'Both', paperFormat: 'Only Question Paper',
    objectiveTime: 30, objectiveMarks: 20, subjectiveTime: 90, subjectiveMarks: 80,
    title: `${classItem?.name || 'Class'} Question Paper`,
  });
  const [fetched, setFetched] = useState(false);
  const [qTypes, setQTypes] = useState(
    QUESTION_TYPES.map(t => ({ type: t, noOfItems: 0, marksPerItem: 1, noOfChoices: 0, instruction: '', enabled: false }))
  );
  const [generating, setGenerating] = useState(false);

  const handleFetch = () => {
    if (!form.subjectId) return toast.error('Select a subject first');
    setFetched(true);
    toast.success('Question types loaded');
  };

  const handleQTypeChange = (idx, field, val) => {
    setQTypes(prev => prev.map((qt, i) => i === idx ? { ...qt, [field]: val } : qt));
  };

  const handleGenerate = async () => {
    if (!form.title) return toast.error('Title required');
    setGenerating(true);
    try {
      const payload = {
        classId: classItem?.id,
        sectionId: sectionItem?.id,
        subjectId: form.subjectId,
        subject: displaySubjects.find(s => String(s.id) === String(form.subjectId))?.name || '',
        units: form.units.split(',').map(u => u.trim()).filter(Boolean),
        paperType: form.paperType,
        paperFormat: form.paperFormat,
        objectiveTime: form.objectiveTime,
        objectiveMarks: form.objectiveMarks,
        subjectiveTime: form.subjectiveTime,
        subjectiveMarks: form.subjectiveMarks,
        title: form.title,
        questionTypes: qTypes.filter(qt => qt.enabled && qt.noOfItems > 0),
      };
      await onGenerate(payload);
      onClose();
    } catch {
      toast.error('Failed to generate paper');
    } finally {
      setGenerating(false);
    }
  };

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 0' };
  const modal  = { background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 760, margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
  const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 };
  const inpSm = { ...inputStyle, padding: '6px 10px' };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Make Paper — {classItem?.name}{sectionItem ? ` / ${sectionItem.name}` : ''}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Select Subject *</label>
            <select style={inputStyle} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
              <option value="">-- Select Subject --</option>
              {displaySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Select Units (comma-separated)</label>
            <input style={inputStyle} value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} placeholder="Unit 1, Unit 2, Unit 3" />
          </div>
          <div>
            <label style={labelStyle}>Question Paper Type</label>
            <select style={inputStyle} value={form.paperType} onChange={e => setForm(f => ({ ...f, paperType: e.target.value }))}>
              {['Objective', 'Subjective', 'Both'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Question Paper Format</label>
            <select style={inputStyle} value={form.paperFormat} onChange={e => setForm(f => ({ ...f, paperFormat: e.target.value }))}>
              {['Only Question Paper', 'With Answer Sheet'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {(form.paperType === 'Objective' || form.paperType === 'Both') && (
          <div style={{ background: '#EEF2FF', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: NAVY, marginBottom: 10, fontSize: 13 }}>Objective Part</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Total Time (minutes)</label>
                <input type="number" style={inpSm} value={form.objectiveTime} onChange={e => setForm(f => ({ ...f, objectiveTime: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Total Marks</label>
                <input type="number" style={inpSm} value={form.objectiveMarks} onChange={e => setForm(f => ({ ...f, objectiveMarks: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {(form.paperType === 'Subjective' || form.paperType === 'Both') && (
          <div style={{ background: '#F0FDF4', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 10, fontSize: 13 }}>Subjective Part</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Total Time (minutes)</label>
                <input type="number" style={inpSm} value={form.subjectiveTime} onChange={e => setForm(f => ({ ...f, subjectiveTime: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Total Marks</label>
                <input type="number" style={inpSm} value={form.subjectiveMarks} onChange={e => setForm(f => ({ ...f, subjectiveMarks: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Question Paper Title *</label>
          <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. First Term Examination 2024" />
        </div>

        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <button style={btnStyle('#059669')} onClick={handleFetch}>Fetch Question Types</button>
        </div>

        {fetched && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: NAVY, marginBottom: 10, fontSize: 13 }}>Question Types</div>
            {qTypes.map((qt, idx) => (
              <div key={qt.type} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 6, background: qt.enabled ? '#EEF2FF' : '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={qt.enabled} onChange={e => handleQTypeChange(idx, 'enabled', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: qt.enabled ? NAVY : '#6b7280', minWidth: 150 }}>{qt.type}</span>
                  {qt.enabled && (
                    <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>No. of Items</label>
                        <input type="number" min="0" style={{ ...inpSm }} value={qt.noOfItems} onChange={e => handleQTypeChange(idx, 'noOfItems', parseInt(e.target.value) || 0)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>Marks/Item</label>
                        <input type="number" min="0" style={{ ...inpSm }} value={qt.marksPerItem} onChange={e => handleQTypeChange(idx, 'marksPerItem', parseInt(e.target.value) || 1)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>No. of Choices</label>
                        <input type="number" min="0" style={{ ...inpSm }} value={qt.noOfChoices} onChange={e => handleQTypeChange(idx, 'noOfChoices', parseInt(e.target.value) || 0)} />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={{ ...labelStyle, marginBottom: 2 }}>Instruction (e.g. "Attempt any FIVE")</label>
                        <input style={{ ...inpSm }} value={qt.instruction} onChange={e => handleQTypeChange(idx, 'instruction', e.target.value)} placeholder="Optional instruction" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          <button style={btnStyle('#6b7280')} onClick={onClose}>Cancel</button>
          <button style={btnStyle()} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Paper'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bank Generator Tab ── */
function BankGeneratorTab({ classes, subjects }) {
  const qc = useQueryClient();
  const [bankSubTab, setBankSubTab] = useState('generator');
  const [selectedClass, setSelectedClass]   = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [bankPapers, setBankPapers] = useState([]);
  const [customize, setCustomize] = useState({
    instructions: '', objectiveHeading: 'OBJECTIVE PART', subjectiveHeading: 'SUBJECTIVE PART',
    objectiveReplacement: '', subjectiveReplacement: '',
  });
  const [customClassId, setCustomClassId] = useState('');
  const [savingCustomize, setSavingCustomize] = useState(false);

  // Fetch bank papers on demand
  const fetchBankPapers = async (classId, sectionId = 'all') => {
    try {
      const res = await api.get(`/question-papers/bank/${classId}/${sectionId}`);
      setBankPapers(res.data.data?.papers || []);
      const cust = res.data.data?.paperCustomization;
      if (cust) setCustomize(c => ({ ...c, ...cust }));
    } catch { /* ignore */ }
  };

  const handleOpenModal = (cls, sec = null) => {
    setSelectedClass(cls);
    setSelectedSection(sec);
    setShowModal(true);
    fetchBankPapers(cls.id, sec?.id || 'all');
  };

  const handleGenerate = async (payload) => {
    const res = await api.post('/question-papers/generate-bank', payload);
    toast.success('Paper generated!');
    qc.invalidateQueries(['question-papers']);
    setBankPapers(prev => [res.data.data, ...prev]);
  };

  const handleSaveCustomize = async () => {
    if (!customClassId) return toast.error('Select a class first');
    setSavingCustomize(true);
    try {
      await api.post('/question-papers/bank-customize', { classId: customClassId, ...customize });
      toast.success('Customization saved!');
    } catch {
      toast.error('Failed to save customization');
    } finally {
      setSavingCustomize(false);
    }
  };

  const subTabStyle = (id) => ({
    padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    background: bankSubTab === id ? NAVY : '#f0f4ff',
    color: bankSubTab === id ? '#fff' : NAVY,
    border: 'none', borderRadius: 6, transition: 'all .15s',
  });

  const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 12, background: NAVY, color: '#fff' };
  const tdStyle = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0' };

  // Classes already include sections from the API response
  const classesWithSections = classes.map(cls => ({
    ...cls,
    sections: Array.isArray(cls.sections) ? cls.sections : [],
  }));

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={subTabStyle('generator')} onClick={() => setBankSubTab('generator')}>Paper Generator</button>
        <button style={subTabStyle('customize')} onClick={() => setBankSubTab('customize')}>Paper Customization</button>
      </div>

      {bankSubTab === 'customize' && (
        <div style={cardStyle}>
          <h3 style={{ color: NAVY, marginTop: 0 }}>Paper Customization Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Apply to Class</label>
              <select style={inputStyle} value={customClassId} onChange={e => setCustomClassId(e.target.value)}>
                <option value="">-- Select Class --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Paper Instructions</label>
              <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={customize.instructions}
                onChange={e => setCustomize(c => ({ ...c, instructions: e.target.value }))}
                placeholder="e.g. All questions are compulsory. Use blue or black ink only." />
            </div>
            <div>
              <label style={labelStyle}>Main Heading — Objective Part</label>
              <input style={inputStyle} value={customize.objectiveHeading}
                onChange={e => setCustomize(c => ({ ...c, objectiveHeading: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Main Heading — Subjective Part</label>
              <input style={inputStyle} value={customize.subjectiveHeading}
                onChange={e => setCustomize(c => ({ ...c, subjectiveHeading: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Objective Part Replacement Text</label>
              <input style={inputStyle} value={customize.objectiveReplacement}
                onChange={e => setCustomize(c => ({ ...c, objectiveReplacement: e.target.value }))}
                placeholder="e.g. Section A" />
            </div>
            <div>
              <label style={labelStyle}>Subjective Part Replacement Text</label>
              <input style={inputStyle} value={customize.subjectiveReplacement}
                onChange={e => setCustomize(c => ({ ...c, subjectiveReplacement: e.target.value }))}
                placeholder="e.g. Section B" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={btnStyle()} onClick={handleSaveCustomize} disabled={savingCustomize}>
              {savingCustomize ? 'Saving…' : 'Save Customization'}
            </button>
          </div>
        </div>
      )}

      {bankSubTab === 'generator' && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ color: NAVY, marginTop: 0, marginBottom: 16 }}>Classes &amp; Sections</h3>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: -10, marginBottom: 16 }}>
              Click "Make Paper" for any class/section to generate a question bank paper.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Class', 'Sections', 'Action'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classesWithSections.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 28, color: '#9CA3AF' }}>No classes found.</td></tr>
                  )}
                  {classesWithSections.map((cls, i) => (
                    <tr key={cls.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: NAVY }}>{cls.name}</td>
                      <td style={tdStyle}>
                        {cls.sections.length > 0
                          ? cls.sections.map(sec => (
                            <span key={sec.id} style={{ display: 'inline-block', background: '#EEF2FF', color: NAVY, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, margin: '2px 3px' }}>
                              {sec.name}
                            </span>
                          ))
                          : <span style={{ color: '#9CA3AF', fontSize: 12 }}>No sections</span>
                        }
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button style={{ ...btnStyle(), fontSize: 12, padding: '6px 14px' }} onClick={() => handleOpenModal(cls, null)}>
                            Make Paper (All)
                          </button>
                          {cls.sections.map(sec => (
                            <button key={sec.id} style={{ ...btnStyle('#059669'), fontSize: 12, padding: '6px 14px' }} onClick={() => handleOpenModal(cls, sec)}>
                              {sec.name}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {bankPapers.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ color: NAVY, marginTop: 0 }}>Generated Bank Papers</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Title', 'Class', 'Subject', 'Type', 'Total Marks', 'Generated', 'Action'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bankPapers.map((p, i) => {
                    const meta = p.meta || {};
                    return (
                      <tr key={p.id || i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{p.displayTitle || (p.title || '').replace('[BANK] ', '')}</td>
                        <td style={tdStyle}>{p.className || '-'}</td>
                        <td style={tdStyle}>{meta.subject || p.subjectName || '-'}</td>
                        <td style={tdStyle}>{meta.paperType || '-'}</td>
                        <td style={tdStyle}>{p.totalMarks || '-'}</td>
                        <td style={tdStyle}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Just now'}</td>
                        <td style={tdStyle}>
                          <button style={{ ...btnStyle('#059669'), fontSize: 12, padding: '5px 12px' }}
                            onClick={() => printBankPaper(p, customize, '')}>
                            Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && selectedClass && (
        <MakePaperModal
          classItem={selectedClass}
          sectionItem={selectedSection}
          allSubjects={subjects}
          onClose={() => setShowModal(false)}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}

const defaultCriteria = [
  { text: '', type: 'short', marks: 5, options: [], answer: '' },
];

export default function QuestionPaperPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ classId: '', subjectId: '', title: '', totalMarks: 100, duration: 60, type: 'Written' });
  const [questions, setQuestions] = useState([...defaultCriteria]);
  const [aiForm, setAiForm] = useState({ subject: '', className: '', topic: '', numQuestions: 5 });
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [filterClass, setFilterClass] = useState('');

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/classes/subjects').then(r => r.data.data || []).catch(() => []) });
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['question-papers', filterClass],
    queryFn: () => api.get('/question-papers', { params: { classId: filterClass || undefined } }).then(r => r.data.data || []),
  });

  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/question-papers', data),
    onSuccess: () => {
      qc.invalidateQueries(['question-papers']);
      toast.success('Question paper saved!');
      setTab('list');
      setForm({ classId: '', subjectId: '', title: '', totalMarks: 100, duration: 60, type: 'Written' });
      setQuestions([{ text: '', type: 'short', marks: 5, options: [], answer: '' }]);
    },
    onError: () => toast.error('Failed to save paper'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/question-papers/${id}`),
    onSuccess: () => { qc.invalidateQueries(['question-papers']); toast.success('Deleted!'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleAddQuestion = () => setQuestions(prev => [...prev, { text: '', type: 'short', marks: 5, options: ['', '', '', ''], answer: '' }]);
  const handleRemoveQuestion = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));
  const handleQChange = (i, field, val) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  };
  const handleOptChange = (qi, oi, val) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...(q.options || ['', '', '', ''])];
      opts[oi] = val;
      return { ...q, options: opts };
    }));
  };

  const handleSubmit = () => {
    if (!form.title) return toast.error('Title required');
    createMutation.mutate({ ...form, questions });
  };

  const handleAIGenerate = async () => {
    if (!aiForm.subject || !aiForm.className || !aiForm.topic) return toast.error('Fill all AI fields');
    setAiLoading(true);
    try {
      const res = await api.post('/question-papers/generate-ai', aiForm);
      setAiResults(res.data.data || []);
      toast.success('Questions generated!');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAI = () => {
    if (!aiForm.subject || !aiForm.className) return toast.error('Fill subject and class');
    const title = `${aiForm.subject} - ${aiForm.topic} (AI Generated)`;
    createMutation.mutate({ title, questions: aiResults, type: 'AI Generated', totalMarks: aiResults.reduce((s, q) => s + (parseInt(q.marks) || 2), 0) });
  };

  const tabs = [
    { id: 'list',   label: 'Question Papers' },
    { id: 'create', label: 'Create Manual'   },
    { id: 'ai',     label: 'AI Generate'     },
    { id: 'bank',   label: 'Bank Generator'  },
  ];

  const tabStyle = (id) => ({
    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    borderBottom: tab === id ? `3px solid ${NAVY}` : '3px solid transparent',
    color: tab === id ? NAVY : '#6b7280', background: 'none', border: 'none',
  });

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>Question Papers</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Create, manage, and AI-generate question papers</p>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          {tabs.map(t => <button key={t.id} style={tabStyle(t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        {tab === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
              <select style={{ ...inputStyle, width: 200 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button style={btnStyle()} onClick={() => setTab('create')}>+ New Paper</button>
            </div>
            <div style={cardStyle}>
              {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : (
                papers.filter(p => !p.title?.includes('__BANK_CUSTOMIZE__')).length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No question papers found. Create one!</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: NAVY, color: '#fff' }}>
                        {['Title', 'Class', 'Subject', 'Total Marks', 'Type', 'Created', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {papers.filter(p => !p.title?.includes('__BANK_CUSTOMIZE__')).map((p, i) => (
                          <tr key={p.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{(p.title || '').replace('[BANK] ', '')}</td>
                            <td style={{ padding: '10px 12px' }}>{p.className || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{p.subjectName || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{p.totalMarks}</td>
                            <td style={{ padding: '10px 12px' }}>{p.title?.includes('[BANK]') ? 'Bank Paper' : (p.paperType || '-')}</td>
                            <td style={{ padding: '10px 12px' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                              <button style={btnStyle('#059669')} onClick={() => printPaper(p, p.questions || [], school?.name)}>Print</button>
                              <button style={btnStyle('#ef4444')} onClick={() => { if (confirm('Delete this paper?')) deleteMutation.mutate(p.id); }}>Delete</button>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        )}

        {tab === 'create' && (
          <div style={cardStyle}>
            <h3 style={{ color: NAVY, marginTop: 0 }}>Create Question Paper</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Paper title" />
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
                <label style={labelStyle}>Total Marks</label>
                <input style={inputStyle} type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: parseInt(e.target.value) || 100 }))} />
              </div>
              <div>
                <label style={labelStyle}>Duration (minutes)</label>
                <input style={inputStyle} type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))} />
              </div>
              <div>
                <label style={labelStyle}>Paper Type</label>
                <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['Written', 'MCQ', 'Mixed', 'Oral', 'Practical'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: NAVY }}>Questions ({questions.length})</h4>
                <button style={btnStyle('#059669')} onClick={handleAddQuestion}>+ Add Question</button>
              </div>
              {questions.map((q, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 10, background: '#fafafa' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: NAVY, minWidth: 28 }}>Q{i + 1}</span>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Question text..." value={q.text} onChange={e => handleQChange(i, 'text', e.target.value)} />
                    <select style={{ ...inputStyle, width: 100 }} value={q.type} onChange={e => handleQChange(i, 'type', e.target.value)}>
                      <option value="short">Short</option>
                      <option value="long">Long</option>
                      <option value="mcq">MCQ</option>
                      <option value="true_false">T/F</option>
                    </select>
                    <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="Marks" value={q.marks} onChange={e => handleQChange(i, 'marks', parseInt(e.target.value) || 2)} />
                    <button style={{ ...btnStyle('#ef4444'), padding: '4px 10px' }} onClick={() => handleRemoveQuestion(i)}>✕</button>
                  </div>
                  {q.type === 'mcq' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingLeft: 36 }}>
                      {['A', 'B', 'C', 'D'].map((ltr, oi) => (
                        <input key={ltr} style={inputStyle} placeholder={`Option ${ltr}`} value={(q.options || [])[oi] || ''} onChange={e => handleOptChange(i, oi, e.target.value)} />
                      ))}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Correct Answer</label>
                        <input style={inputStyle} placeholder="Correct answer" value={q.answer || ''} onChange={e => handleQChange(i, 'answer', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={{ ...btnStyle('#6b7280') }} onClick={() => setTab('list')}>Cancel</button>
              <button style={btnStyle()} onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Paper'}
              </button>
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ color: NAVY, marginTop: 0 }}>AI Question Generator</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Subject *</label>
                  <input style={inputStyle} value={aiForm.subject} onChange={e => setAiForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <label style={labelStyle}>Class *</label>
                  <input style={inputStyle} value={aiForm.className} onChange={e => setAiForm(f => ({ ...f, className: e.target.value }))} placeholder="e.g. Class 8" />
                </div>
                <div>
                  <label style={labelStyle}>Topic *</label>
                  <input style={inputStyle} value={aiForm.topic} onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Fractions and Decimals" />
                </div>
                <div>
                  <label style={labelStyle}>Number of Questions</label>
                  <input style={inputStyle} type="number" min={1} max={30} value={aiForm.numQuestions} onChange={e => setAiForm(f => ({ ...f, numQuestions: parseInt(e.target.value) || 5 }))} />
                </div>
              </div>
              <button style={btnStyle()} onClick={handleAIGenerate} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>

            {aiResults.length > 0 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, color: NAVY }}>Generated Questions ({aiResults.length})</h3>
                  <button style={btnStyle('#059669')} onClick={handleSaveAI} disabled={createMutation.isPending}>Save as Paper</button>
                </div>
                {aiResults.map((q, i) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 10, background: '#fafafa' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ background: NAVY, color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{q.text}</p>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{q.type || 'short'}</span>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{q.marks || 2} marks</span>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {q.options.map((o, oi) => (
                              <span key={oi} style={{ fontSize: 13, color: '#374151' }}>{String.fromCharCode(65 + oi)}) {o}</span>
                            ))}
                          </div>
                        )}
                        {q.answer && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#059669', fontWeight: 600 }}>Answer: {q.answer}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'bank' && (
          <BankGeneratorTab classes={classes} subjects={subjects} />
        )}
      </div>
    </div>
  );
}
